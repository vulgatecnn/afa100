import sqlite3 from 'sqlite3';
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
  createRetryIntervalMillis: number; // 创建连接失败后的重试间隔
}

// 连接包装器接口
export interface PooledConnection {
  id: string;
  connection: sqlite3.Database;
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
 * SQLite数据库连接池实现
 * 提供连接复用、自动清理、健康检查等功能
 */
export class ConnectionPool extends EventEmitter {
  private config: PoolConfig;
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

  constructor(config: Partial<PoolConfig> = {}) {
    super();
    
    // 默认配置
    this.config = {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 300000,
      createTimeoutMillis: 10000,
      reapIntervalMillis: 30000,
      createRetryIntervalMillis: 1000,
      ...config,
    };

    // 启动空闲连接清理定时器
    this.startReaper();
  }

  /**
   * 初始化连接池
   * 创建最小数量的连接
   */
  async initialize(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('连接池已销毁');
    }

    console.log(`🔄 初始化连接池，最小连接数: ${this.config.min}`);
    
    const promises: Promise<void>[] = [];
    for (let i = 0; i < this.config.min; i++) {
      promises.push(this.createConnection().then(() => {}).catch(err => {
        console.warn(`初始化连接失败:`, err.message);
        this.stats.totalErrors++;
      }));
    }

    await Promise.allSettled(promises);
    console.log(`✅ 连接池初始化完成，当前连接数: ${this.connections.size}`);
  }

  /**
   * 获取数据库连接
   */
  async acquire(): Promise<PooledConnection> {
    if (this.isDestroyed) {
      throw new Error('连接池已销毁');
    }

    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      // 设置获取连接超时
      const timeoutId = setTimeout(() => {
        // 从等待队列中移除
        const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
          this.stats.pendingRequests = this.waitingQueue.length;
        }
        
        this.stats.totalErrors++;
        reject(new Error(`获取连接超时 (${this.config.acquireTimeoutMillis}ms)`));
      }, this.config.acquireTimeoutMillis);

      const handleAcquire = (connection: PooledConnection) => {
        clearTimeout(timeoutId);
        
        // 记录获取时间
        const acquireTime = Date.now() - startTime;
        this.acquireTimes.push(acquireTime);
        if (this.acquireTimes.length > 100) {
          this.acquireTimes.shift(); // 保持最近100次的记录
        }
        this.stats.averageAcquireTime = this.acquireTimes.reduce((a, b) => a + b, 0) / this.acquireTimes.length;
        
        this.stats.totalAcquired++;
        resolve(connection);
      };

      const handleReject = (error: Error) => {
        clearTimeout(timeoutId);
        this.stats.totalErrors++;
        reject(error);
      };

      // 尝试获取空闲连接
      const idleConnection = this.findIdleConnection();
      if (idleConnection) {
        idleConnection.inUse = true;
        idleConnection.lastUsedAt = new Date();
        this.updateStats();
        this.emit('connection-acquired', idleConnection.id);
        handleAcquire(idleConnection);
        return;
      }

      // 如果没有空闲连接且未达到最大连接数，创建新连接
      if (this.connections.size < this.config.max) {
        this.createConnection()
          .then(connection => {
            connection.inUse = true;
            connection.lastUsedAt = new Date();
            this.updateStats();
            this.emit('connection-acquired', connection.id);
            handleAcquire(connection);
          })
          .catch(handleReject);
        return;
      }

      // 连接池已满，加入等待队列
      this.waitingQueue.push({
        resolve: handleAcquire,
        reject: handleReject,
        requestedAt: new Date(),
      });
      this.stats.pendingRequests = this.waitingQueue.length;
      this.emit('pool-full');
    });
  }

  /**
   * 释放数据库连接
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

    // 标记为未使用
    pooledConnection.inUse = false;
    pooledConnection.lastUsedAt = new Date();
    this.stats.totalReleased++;
    this.updateStats();
    this.emit('connection-released', connection.id);

    // 处理等待队列
    if (this.waitingQueue.length > 0) {
      const waiter = this.waitingQueue.shift()!;
      pooledConnection.inUse = true;
      pooledConnection.lastUsedAt = new Date();
      this.updateStats();
      this.emit('connection-acquired', pooledConnection.id);
      waiter.resolve(pooledConnection);
      this.stats.pendingRequests = this.waitingQueue.length;
    }
  }

  /**
   * 销毁连接池
   */
  async destroy(): Promise<void> {
    if (this.isDestroyed) {
      return;
    }

    console.log('🔄 销毁连接池...');
    this.isDestroyed = true;

    // 停止清理定时器
    if (this.reapTimer) {
      clearInterval(this.reapTimer);
      this.reapTimer = null;
    }

    // 拒绝所有等待中的请求
    while (this.waitingQueue.length > 0) {
      const waiter = this.waitingQueue.shift()!;
      waiter.reject(new Error('连接池已销毁'));
    }

    // 关闭所有连接
    const closePromises: Promise<void>[] = [];
    for (const [id, connection] of this.connections) {
      closePromises.push(this.destroyConnection(id));
    }

    await Promise.allSettled(closePromises);
    this.connections.clear();
    this.updateStats();
    
    console.log('✅ 连接池已销毁');
  }

  /**
   * 获取连接池统计信息
   */
  getStats(): PoolStats {
    return { ...this.stats };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthStatus> {
    const connectionTests: Array<{
      connectionId: string;
      success: boolean;
      responseTime: number;
      error?: string;
    }> = [];

    // 测试所有连接
    for (const [id, connection] of this.connections) {
      const startTime = Date.now();
      try {
        await new Promise<void>((resolve, reject) => {
          connection.connection.get('SELECT 1 as test', (err, _row) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        connectionTests.push({
          connectionId: id,
          success: true,
          responseTime: Date.now() - startTime,
        });
      } catch (error) {
        connectionTests.push({
          connectionId: id,
          success: false,
          responseTime: Date.now() - startTime,
          error: (error as Error).message,
        });
      }
    }

    // 判断健康状态
    const successfulTests = connectionTests.filter(test => test.success).length;
    const totalTests = connectionTests.length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (totalTests === 0) {
      status = 'unhealthy';
    } else if (successfulTests === totalTests) {
      status = 'healthy';
    } else if (successfulTests > totalTests / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      details: {
        poolStats: this.getStats(),
        connectionTests,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * 创建新的数据库连接
   */
  private async createConnection(): Promise<PooledConnection> {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const config = getCurrentDbConfig();

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`创建连接超时 (${this.config.createTimeoutMillis}ms)`));
      }, this.config.createTimeoutMillis);

      const db = new sqlite3.Database(config.path, config.mode, (err) => {
        clearTimeout(timeoutId);
        
        if (err) {
          console.error(`创建连接失败 [${connectionId}]:`, err.message);
          reject(err);
          return;
        }

        const connection: PooledConnection = {
          id: connectionId,
          connection: db,
          createdAt: new Date(),
          lastUsedAt: new Date(),
          inUse: false,
          isValid: true,
        };

        // 优化新连接
        this.optimizeConnection(db)
          .then(() => {
            this.connections.set(connectionId, connection);
            this.stats.totalCreated++;
            this.updateStats();
            this.emit('connection-created', connection);
            
            console.log(`✅ 创建新连接 [${connectionId}]`);
            resolve(connection);
          })
          .catch(reject);
      });
    });
  }

  /**
   * 优化数据库连接
   */
  private async optimizeConnection(db: sqlite3.Database): Promise<void> {
    // 动态导入配置以避免循环依赖
    const { getCurrentDbConfig } = await import('../config/database.config.js');
    const config = getCurrentDbConfig();
    
    // 应用PRAGMA设置
    for (const [pragma, value] of Object.entries(config.pragmas)) {
      const pragmaStatement = `PRAGMA ${pragma} = ${value}`;
      
      await new Promise<void>((resolve) => {
        db.run(pragmaStatement, (err) => {
          if (err) {
            console.warn(`连接优化警告 (${pragmaStatement}):`, err.message);
          }
          resolve();
        });
      });
    }
    
    console.log(`⚙️ 连接优化完成，应用了 ${Object.keys(config.pragmas).length} 个PRAGMA设置`);
  }

  /**
   * 销毁指定连接
   */
  private async destroyConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    return new Promise<void>((resolve) => {
      connection.connection.close((err) => {
        if (err) {
          console.warn(`关闭连接失败 [${connectionId}]:`, err.message);
        } else {
          console.log(`🗑️ 销毁连接 [${connectionId}]`);
        }
        
        this.connections.delete(connectionId);
        this.stats.totalDestroyed++;
        this.updateStats();
        this.emit('connection-destroyed', connectionId);
        resolve();
      });
    });
  }

  /**
   * 查找空闲连接
   */
  private findIdleConnection(): PooledConnection | null {
    for (const connection of this.connections.values()) {
      if (!connection.inUse && connection.isValid) {
        return connection;
      }
    }
    return null;
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.totalConnections = this.connections.size;
    this.stats.activeConnections = Array.from(this.connections.values()).filter(c => c.inUse).length;
    this.stats.idleConnections = this.stats.totalConnections - this.stats.activeConnections;
  }

  /**
   * 启动空闲连接清理器
   */
  private startReaper(): void {
    this.reapTimer = setInterval(() => {
      this.reapIdleConnections();
    }, this.config.reapIntervalMillis);
  }

  /**
   * 清理空闲连接
   */
  private reapIdleConnections(): void {
    if (this.isDestroyed) {
      return;
    }

    const now = new Date();
    const connectionsToDestroy: string[] = [];

    for (const [id, connection] of this.connections) {
      // 跳过正在使用的连接
      if (connection.inUse) {
        continue;
      }

      // 检查是否超过空闲时间
      const idleTime = now.getTime() - connection.lastUsedAt.getTime();
      if (idleTime > this.config.idleTimeoutMillis) {
        // 确保不会低于最小连接数
        const idleCount = this.stats.totalConnections - this.stats.activeConnections;
        if (idleCount > this.config.min) {
          connectionsToDestroy.push(id);
        }
      }
    }

    // 销毁空闲连接
    connectionsToDestroy.forEach(id => {
      this.destroyConnection(id).catch(err => {
        console.error(`清理空闲连接失败 [${id}]:`, err.message);
      });
    });

    if (connectionsToDestroy.length > 0) {
      console.log(`🧹 清理了 ${connectionsToDestroy.length} 个空闲连接`);
    }
  }
}