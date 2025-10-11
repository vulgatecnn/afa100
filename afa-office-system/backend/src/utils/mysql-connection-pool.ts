import * as mysql from 'mysql2/promise';
import { EventEmitter } from 'events';
import { getCurrentDbConfig } from '../config/database.config.js';

// 连接池配置接口
export interface PoolConfig {
  min: number;                    // 最小连接数
  max: number;                    // 最大连接数
  acquireTimeoutMillis: number;   // 获取连接超时时间
  idleTimeoutMillis: number;      // 空闲连接超时时间
  createTimeoutMillis: number;    // 创建连接超时时间
  reapIntervalMillis: number;     // 清理空闲连接的间隔时间
  createRetryIntervalMillis?: number; // 创建连接失败后的重试间隔
}

// MySQL连接包装器接口
export interface PooledConnection {
  id: string;
  connection: mysql.PoolConnection;
  createdAt: Date;
  lastUsedAt: Date;
  inUse: boolean;
  isValid: boolean;
}

// 连接池统计信息
export interface PoolStats {
  totalConnections: number;       // 总连接数
  activeConnections: number;      // 活跃连接数
  idleConnections: number;        // 空闲连接数
  pendingRequests: number;        // 等待连接的请求数
  totalCreated: number;           // 总创建连接数
  totalDestroyed: number;         // 总销毁连接数
  totalAcquired: number;          // 总获取连接数
  totalReleased: number;          // 总释放连接数
  totalErrors: number;            // 总错误数
  averageAcquireTime: number;     // 平均获取连接时间
}

// 健康检查状态
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: {
    poolStats: PoolStats;
    connectionTests: Array<{
      connectionId: string;
      success: boolean;
      responseTime: number;
      error?: string;
    }>;
    timestamp: string;
    queryTest?: {
      success: boolean;
      responseTime?: number;
      error?: string;
    };
    error?: string;
  };
}

// 连接池事件类型
export interface PoolEvents {
  'connection-created': (connection: PooledConnection) => void;
  'connection-destroyed': (connectionId: string) => void;
  'connection-acquired': (connectionId: string) => void;
  'connection-released': (connectionId: string) => void;
  'pool-full': () => void;
  'pool-empty': () => void;
  'error': (error: Error) => void;
}

/**
 * MySQL数据库连接池实现
 * 提供连接复用、自动清理、健康检查等功能
 */
export class MySQLConnectionPool extends EventEmitter {
  private config: PoolConfig;
  private pool: mysql.Pool | null = null;
  private connections: Map<string, PooledConnection> = new Map();
  private waitingQueue: Array<{
    resolve: (connection: PooledConnection) => void;
    reject: (error: Error) => void;
    requestedAt: Date;
  }> = [];
  
  private stats: PoolStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    pendingRequests: 0,
    totalCreated: 0,
    totalDestroyed: 0,
    totalAcquired: 0,
    totalReleased: 0,
    totalErrors: 0,
    averageAcquireTime: 0,
  };

  private reapTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;
  private acquireTimes: number[] = [];

  constructor(config: PoolConfig) {
    super();
    this.config = { ...config };
    
    // 设置默认值
    if (!this.config.createRetryIntervalMillis) {
      this.config.createRetryIntervalMillis = 1000;
    }
  }

  /**
   * 初始化连接池
   */
  async initialize(): Promise<void> {
    if (this.pool) {
      console.log('MySQL连接池已初始化');
      return;
    }

    console.log('🔄 初始化MySQL连接池...');
    
    const dbConfig = getCurrentDbConfig();
    
    // 创建MySQL连接池
    const poolConfig: mysql.PoolOptions = {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      connectionLimit: this.config.max,
      multipleStatements: dbConfig.multipleStatements,
      charset: dbConfig.charset,
      timezone: dbConfig.timezone,
      // 连接池配置优化
      queueLimit: 0,
      // 连接配置
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: false,
      debug: false,
      trace: false,
    };
    
    this.pool = mysql.createPool(poolConfig);

    // 测试连接
    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      console.log('✅ MySQL连接池初始化成功');
    } catch (error) {
      await this.destroy();
      throw new Error(`MySQL连接池初始化失败: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 启动清理定时器
    this.startReaper();
    
    console.log(`📊 MySQL连接池配置: 最小${this.config.min}个, 最大${this.config.max}个连接`);
  }

  /**
   * 获取连接
   */
  async acquire(): Promise<PooledConnection> {
    if (this.isDestroyed) {
      throw new Error('连接池已销毁');
    }

    if (!this.pool) {
      throw new Error('连接池未初始化');
    }

    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      // 设置超时
      const timeoutId = setTimeout(() => {
        // 从等待队列中移除
        const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
          this.stats.pendingRequests--;
        }
        
        this.stats.totalErrors++;
        reject(new Error(`获取MySQL连接超时 (${this.config.acquireTimeoutMillis}ms)`));
      }, this.config.acquireTimeoutMillis);

      // 尝试获取连接
      this.tryAcquireConnection()
        .then((connection) => {
          clearTimeout(timeoutId);
          
          // 记录获取时间
          const acquireTime = Date.now() - startTime;
          this.acquireTimes.push(acquireTime);
          if (this.acquireTimes.length > 100) {
            this.acquireTimes.shift();
          }
          this.stats.averageAcquireTime = this.acquireTimes.reduce((a, b) => a + b, 0) / this.acquireTimes.length;
          
          this.stats.totalAcquired++;
          this.emit('connection-acquired', connection.id);
          resolve(connection);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          this.stats.totalErrors++;
          reject(error);
        });
    });
  }

  /**
   * 尝试获取连接
   */
  private async tryAcquireConnection(): Promise<PooledConnection> {
    if (!this.pool) {
      throw new Error('连接池未初始化');
    }

    try {
      const mysqlConnection = await this.pool.getConnection();
      
      // 创建连接包装器
      const connectionId = this.generateConnectionId();
      const pooledConnection: PooledConnection = {
        id: connectionId,
        connection: mysqlConnection,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        inUse: true,
        isValid: true,
      };

      this.connections.set(connectionId, pooledConnection);
      this.updateStats();
      this.stats.totalCreated++;
      
      this.emit('connection-created', pooledConnection);
      
      return pooledConnection;
    } catch (error) {
      throw new Error(`创建MySQL连接失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 释放连接
   */
  async release(connection: PooledConnection): Promise<void> {
    if (this.isDestroyed) {
      return;
    }

    const pooledConnection = this.connections.get(connection.id);
    if (!pooledConnection) {
      console.warn(`尝试释放不存在的连接: ${connection.id}`);
      return;
    }

    try {
      // 更新连接状态
      pooledConnection.inUse = false;
      pooledConnection.lastUsedAt = new Date();
      
      // 释放MySQL连接回连接池
      pooledConnection.connection.release();
      
      // 从我们的连接映射中移除
      this.connections.delete(connection.id);
      
      this.updateStats();
      this.stats.totalReleased++;
      
      this.emit('connection-released', connection.id);
      
      // 处理等待队列
      await this.processWaitingQueue();
    } catch (error) {
      console.error(`释放MySQL连接失败: ${connection.id}`, error);
      this.stats.totalErrors++;
      
      // 强制销毁连接
      await this.destroyConnection(connection.id);
    }
  }

  /**
   * 处理等待队列
   */
  private async processWaitingQueue(): Promise<void> {
    while (this.waitingQueue.length > 0 && this.stats.activeConnections < this.config.max) {
      const waiter = this.waitingQueue.shift();
      if (waiter) {
        this.stats.pendingRequests--;
        
        try {
          const connection = await this.tryAcquireConnection();
          waiter.resolve(connection);
        } catch (error) {
          waiter.reject(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }
  }

  /**
   * 销毁连接
   */
  private async destroyConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    try {
      // 销毁MySQL连接
      connection.connection.destroy();
      connection.isValid = false;
    } catch (error) {
      console.error(`销毁MySQL连接失败: ${connectionId}`, error);
    } finally {
      this.connections.delete(connectionId);
      this.updateStats();
      this.stats.totalDestroyed++;
      this.emit('connection-destroyed', connectionId);
    }
  }

  /**
   * 启动清理定时器
   */
  private startReaper(): void {
    if (this.reapTimer) {
      return;
    }

    this.reapTimer = setInterval(async () => {
      await this.reapIdleConnections();
    }, this.config.reapIntervalMillis);
  }

  /**
   * 清理空闲连接
   */
  private async reapIdleConnections(): Promise<void> {
    if (this.isDestroyed) {
      return;
    }

    const now = new Date();
    const connectionsToDestroy: string[] = [];

    for (const [id, connection] of Array.from(this.connections.entries())) {
      if (!connection.inUse) {
        const idleTime = now.getTime() - connection.lastUsedAt.getTime();
        if (idleTime > this.config.idleTimeoutMillis) {
          connectionsToDestroy.push(id);
        }
      }
    }

    // 确保保持最小连接数
    const minConnections = Math.max(this.config.min, 0);
    const currentConnections = this.connections.size;
    const maxToDestroy = Math.max(0, currentConnections - minConnections);
    
    const toDestroy = connectionsToDestroy.slice(0, maxToDestroy);
    
    for (const connectionId of toDestroy) {
      await this.destroyConnection(connectionId);
    }

    if (toDestroy.length > 0) {
      console.log(`🧹 清理了 ${toDestroy.length} 个空闲MySQL连接`);
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.totalConnections = this.connections.size;
    this.stats.activeConnections = Array.from(this.connections.values()).filter(c => c.inUse).length;
    this.stats.idleConnections = this.stats.totalConnections - this.stats.activeConnections;
    this.stats.pendingRequests = this.waitingQueue.length;
  }

  /**
   * 生成连接ID
   */
  private generateConnectionId(): string {
    return `mysql_conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取连接池统计信息
   */
  getStats(): PoolStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    const stats = this.getStats();
    
    try {
      if (!this.pool) {
        return {
          status: 'unhealthy',
          details: {
            poolStats: stats,
            connectionTests: [],
            timestamp: new Date().toISOString(),
            error: 'MySQL连接池未初始化'
          }
        };
      }

      // 测试连接
      const connection = await this.pool.getConnection();
      const testStartTime = Date.now();
      
      try {
        await connection.ping();
        const responseTime = Date.now() - testStartTime;
        connection.release();

        // 判断健康状态
        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        
        if (responseTime > 1000 || stats.totalErrors > stats.totalAcquired * 0.1) {
          status = 'degraded';
        }
        
        if (responseTime > 5000 || stats.totalErrors > stats.totalAcquired * 0.2) {
          status = 'unhealthy';
        }

        return {
          status,
          details: {
            poolStats: stats,
            connectionTests: [{
              connectionId: 'health_check',
              success: true,
              responseTime,
            }],
            timestamp: new Date().toISOString(),
            queryTest: {
              success: true
            }
          }
        };
      } catch (error) {
        connection.release();
        throw error;
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          poolStats: stats,
          connectionTests: [{
            connectionId: 'health_check',
            success: false,
            responseTime: Date.now() - startTime,
            error: error instanceof Error ? error.message : String(error)
          }],
          timestamp: new Date().toISOString(),
          queryTest: {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }
        }
      };
    }
  }

  /**
   * 销毁连接池
   */
  async destroy(): Promise<void> {
    if (this.isDestroyed) {
      return;
    }

    console.log('🔄 销毁MySQL连接池...');
    this.isDestroyed = true;

    // 停止清理定时器
    if (this.reapTimer) {
      clearInterval(this.reapTimer);
      this.reapTimer = null;
    }

    // 拒绝所有等待的请求
    while (this.waitingQueue.length > 0) {
      const waiter = this.waitingQueue.shift();
      if (waiter) {
        waiter.reject(new Error('连接池已销毁'));
      }
    }

    // 销毁所有连接
    const connectionIds = Array.from(this.connections.keys());
    for (const connectionId of connectionIds) {
      await this.destroyConnection(connectionId);
    }

    // 关闭MySQL连接池
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }

    console.log('✅ MySQL连接池已销毁');
  }

  /**
   * 检查连接池是否已初始化
   */
  isInitialized(): boolean {
    return this.pool !== null && !this.isDestroyed;
  }
}

// 导出类型和类
export { MySQLConnectionPool as ConnectionPool };