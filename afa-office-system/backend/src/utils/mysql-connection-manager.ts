/**
 * MySQL连接管理器
 * 集成连接监控、健康检查和错误处理的综合连接管理解决方案
 */

import * as mysql from 'mysql2/promise';
import { MySQLConfig } from '../config/database-config-manager';
import { 
  MySQLConnectionMonitor, 
  ConnectionStatus, 
  ConnectionHealth,
  PoolStatistics,
  ConnectionError,
  MonitorConfig,
  createMySQLConnectionMonitor
} from './mysql-connection-monitor';

/**
 * 连接管理器配置
 */
export interface ConnectionManagerConfig {
  // 监控配置
  monitor: Partial<MonitorConfig>;
  
  // 重连配置
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  
  // 健康检查配置
  healthCheckEnabled: boolean;
  healthCheckInterval: number;
  
  // 日志配置
  enableLogging: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * 连接管理器状态
 */
export interface ConnectionManagerStatus {
  isConnected: boolean;
  health: ConnectionHealth;
  statistics: PoolStatistics;
  lastErrors: ConnectionError[];
  uptime: number;
  reconnectAttempts: number;
}

/**
 * MySQL连接管理器
 */
export class MySQLConnectionManager {
  private pool: mysql.Pool | null = null;
  private monitor: MySQLConnectionMonitor | null = null;
  private config: MySQLConfig;
  private managerConfig: ConnectionManagerConfig;
  private startTime = new Date();
  private reconnectAttempts = 0;
  private isDestroyed = false;

  constructor(config: MySQLConfig, managerConfig?: Partial<ConnectionManagerConfig>) {
    this.config = config;
    this.managerConfig = {
      monitor: {
        healthCheckInterval: 30000,
        maxErrorCount: 5,
        reconnectDelay: 5000,
        maxReconnectAttempts: 3,
        slowQueryThreshold: 1000,
        enableDetailedLogging: true
      },
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 5000,
      healthCheckEnabled: true,
      healthCheckInterval: 30000,
      enableLogging: true,
      logLevel: 'info',
      ...managerConfig
    };
  }

  /**
   * 初始化连接管理器
   */
  async initialize(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('连接管理器已被销毁');
    }

    try {
      this.log('info', '正在初始化MySQL连接管理器...');
      
      // 创建连接池
      await this.createConnectionPool();
      
      // 初始化监控器
      if (this.managerConfig.healthCheckEnabled) {
        await this.initializeMonitor();
      }
      
      this.log('info', '✅ MySQL连接管理器初始化成功');
    } catch (error) {
      this.log('error', '❌ MySQL连接管理器初始化失败:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * 创建连接池
   */
  private async createConnectionPool(): Promise<void> {
    const poolConfig: mysql.PoolOptions = {
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      connectionLimit: this.config.connectionLimit || 10,
      // acquireTimeout and timeout are not valid PoolOptions properties in mysql2
      // Using connectTimeout instead for connection timeout
      connectTimeout: this.config.acquireTimeout || this.config.connectTimeout || 60000,
      multipleStatements: this.config.multipleStatements !== false,
      
      // 优化配置
      charset: this.config.charset || 'utf8mb4',
      timezone: this.config.timezone || '+00:00',
      supportBigNumbers: this.config.supportBigNumbers !== false,
      bigNumberStrings: this.config.bigNumberStrings !== false,
      dateStrings: this.config.dateStrings || false,
      
      // 连接池优化
      queueLimit: this.config.queueLimit || 0,
      idleTimeout: this.config.idleTimeout || 300000,
      waitForConnections: this.config.waitForConnections !== false,
      maxIdle: this.config.maxIdle,
      
      // SSL配置
      ssl: this.config.ssl === true ? {} : (this.config.ssl || undefined),
      
      // 调试配置
      debug: this.config.debug || false,
      trace: this.config.trace || false
    };

    this.pool = mysql.createPool(poolConfig);
    
    // 测试连接
    const connection = await this.pool.getConnection();
    try {
      await connection.ping();
      this.log('info', `✅ MySQL连接池创建成功: ${this.config.host}:${this.config.port}`);
    } finally {
      connection.release();
    }
  }

  /**
   * 初始化监控器
   */
  private async initializeMonitor(): Promise<void> {
    if (!this.pool) {
      throw new Error('连接池未初始化');
    }

    this.monitor = createMySQLConnectionMonitor(this.config, this.managerConfig.monitor);
    
    // 设置监控事件监听
    this.setupMonitorEventListeners();
    
    // 初始化监控器
    await this.monitor.initialize(this.pool);
    
    this.log('info', '✅ MySQL连接监控器初始化成功');
  }

  /**
   * 设置监控事件监听器
   */
  private setupMonitorEventListeners(): void {
    if (!this.monitor) return;

    // 连接状态变化
    this.monitor.on('connected', (health) => {
      this.log('info', '✅ MySQL连接已建立');
      this.reconnectAttempts = 0;
    });

    this.monitor.on('error', (error) => {
      this.log('error', '❌ MySQL连接错误:', error);
    });

    // 健康状态变化
    this.monitor.on('health:critical', (health) => {
      this.log('warn', '⚠️ MySQL连接健康状态严重', health);
      if (this.managerConfig.autoReconnect) {
        this.handleCriticalHealth();
      }
    });

    this.monitor.on('health:recovered', (health) => {
      this.log('info', '✅ MySQL连接健康状态已恢复');
    });

    // 重连事件
    this.monitor.on('reconnect:attempt', ({ attempt, maxAttempts }) => {
      this.log('info', `🔄 尝试重连MySQL (${attempt}/${maxAttempts})`);
    });

    this.monitor.on('reconnect:success', (health) => {
      this.log('info', '✅ MySQL重连成功');
      this.reconnectAttempts = 0;
    });

    this.monitor.on('reconnect:failed', ({ attempts, maxAttempts }) => {
      this.log('error', `❌ MySQL重连失败，已尝试 ${attempts}/${maxAttempts} 次`);
    });

    // 性能监控
    this.monitor.on('slow:query', ({ responseTime, threshold }) => {
      this.log('warn', `🐌 检测到慢查询: ${responseTime}ms (阈值: ${threshold}ms)`);
    });

    // 连接池事件
    this.monitor.on('connection:acquired', ({ connectionId }) => {
      this.log('debug', `🔗 连接已获取: ${connectionId}`);
    });

    this.monitor.on('connection:released', ({ connectionId }) => {
      this.log('debug', `🔓 连接已释放: ${connectionId}`);
    });
  }

  /**
   * 处理严重健康状态
   */
  private async handleCriticalHealth(): Promise<void> {
    if (this.reconnectAttempts >= this.managerConfig.maxReconnectAttempts) {
      this.log('error', '❌ 已达到最大重连尝试次数，停止重连');
      return;
    }

    this.reconnectAttempts++;
    this.log('info', `🔄 开始第 ${this.reconnectAttempts} 次重连尝试`);

    try {
      // 等待重连延迟
      await new Promise(resolve => setTimeout(resolve, this.managerConfig.reconnectDelay));
      
      // 重新创建连接池
      await this.recreateConnectionPool();
      
      this.log('info', '✅ 连接池重建成功');
      this.reconnectAttempts = 0;
    } catch (error) {
      this.log('error', `❌ 重连尝试失败:`, error);
      
      // 如果还有重连机会，继续尝试
      if (this.reconnectAttempts < this.managerConfig.maxReconnectAttempts) {
        setTimeout(() => this.handleCriticalHealth(), this.managerConfig.reconnectDelay);
      }
    }
  }

  /**
   * 重新创建连接池
   */
  private async recreateConnectionPool(): Promise<void> {
    // 清理旧的连接池
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }

    // 创建新的连接池
    await this.createConnectionPool();
    
    // 重新初始化监控器
    if (this.monitor && this.pool) {
      await this.monitor.initialize(this.pool);
    }
  }

  /**
   * 获取连接池实例
   */
  getPool(): mysql.Pool {
    if (!this.pool) {
      throw new Error('连接池未初始化');
    }
    return this.pool;
  }

  /**
   * 获取数据库连接
   */
  async getConnection(): Promise<mysql.PoolConnection> {
    if (!this.pool) {
      throw new Error('连接池未初始化');
    }
    return await this.pool.getConnection();
  }

  /**
   * 执行查询
   */
  async query(sql: string, params?: any[]): Promise<any> {
    const connection = await this.getConnection();
    try {
      const [results] = await connection.execute(sql, params || []);
      return results;
    } finally {
      connection.release();
    }
  }

  /**
   * 执行事务
   */
  async transaction<T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 检查连接状态
   */
  async ping(): Promise<boolean> {
    try {
      const connection = await this.getConnection();
      try {
        await connection.ping();
        return true;
      } finally {
        connection.release();
      }
    } catch (error) {
      this.log('error', 'Ping失败:', error);
      return false;
    }
  }

  /**
   * 获取连接管理器状态
   */
  getStatus(): ConnectionManagerStatus {
    const health = this.monitor?.getHealth() || {
      status: ConnectionStatus.DISCONNECTED,
      lastCheck: new Date(),
      responseTime: 0,
      errorCount: 0,
      uptime: 0,
      connectionCount: 0,
      activeConnections: 0,
      queuedConnections: 0
    };

    const statistics = this.monitor?.getStatistics() || {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      queuedRequests: 0,
      acquiredConnections: 0,
      releasedConnections: 0,
      createdConnections: 0,
      destroyedConnections: 0,
      timeouts: 0,
      errors: 0
    };

    const lastErrors = this.monitor?.getErrorHistory().slice(-5) || [];

    return {
      isConnected: this.pool !== null && health.status === ConnectionStatus.CONNECTED,
      health,
      statistics,
      lastErrors,
      uptime: Date.now() - this.startTime.getTime(),
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * 获取详细报告
   */
  getDetailedReport(): any {
    const status = this.getStatus();
    const monitorReport = this.monitor?.getDetailedReport();
    
    return {
      manager: {
        config: this.managerConfig,
        status,
        startTime: this.startTime,
        uptime: status.uptime
      },
      monitor: monitorReport,
      pool: {
        config: this.config
      }
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ConnectionManagerConfig>): void {
    this.managerConfig = { ...this.managerConfig, ...newConfig };
    
    // 更新监控器配置
    if (this.monitor && newConfig.monitor) {
      this.monitor.updateConfig(newConfig.monitor);
    }
    
    this.log('info', '✅ 连接管理器配置已更新');
  }

  /**
   * 重置统计信息
   */
  resetStatistics(): void {
    if (this.monitor) {
      this.monitor.resetStatistics();
    }
    this.reconnectAttempts = 0;
    this.startTime = new Date();
    this.log('info', '✅ 统计信息已重置');
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    if (this.monitor) {
      this.monitor.destroy();
      this.monitor = null;
    }

    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * 销毁连接管理器
   */
  async destroy(): Promise<void> {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    this.log('info', '🔌 正在销毁MySQL连接管理器...');
    
    await this.cleanup();
    
    this.log('info', '✅ MySQL连接管理器已销毁');
  }

  /**
   * 日志记录
   */
  private log(level: 'error' | 'warn' | 'info' | 'debug', message: string, ...args: any[]): void {
    if (!this.managerConfig.enableLogging) {
      return;
    }

    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.managerConfig.logLevel);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex <= currentLevelIndex) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [MySQL-Manager] [${level.toUpperCase()}]`;
      
      switch (level) {
        case 'error':
          console.error(prefix, message, ...args);
          break;
        case 'warn':
          console.warn(prefix, message, ...args);
          break;
        case 'info':
          console.info(prefix, message, ...args);
          break;
        case 'debug':
          console.debug(prefix, message, ...args);
          break;
      }
    }
  }
}

/**
 * 创建MySQL连接管理器
 */
export function createMySQLConnectionManager(
  config: MySQLConfig,
  managerConfig?: Partial<ConnectionManagerConfig>
): MySQLConnectionManager {
  return new MySQLConnectionManager(config, managerConfig);
}

/**
 * MySQL连接管理器工厂
 */
export class MySQLConnectionManagerFactory {
  private static managers = new Map<string, MySQLConnectionManager>();

  /**
   * 创建或获取连接管理器
   */
  static async getOrCreateManager(
    key: string,
    config: MySQLConfig,
    managerConfig?: Partial<ConnectionManagerConfig>
  ): Promise<MySQLConnectionManager> {
    if (!this.managers.has(key)) {
      const manager = new MySQLConnectionManager(config, managerConfig);
      await manager.initialize();
      this.managers.set(key, manager);
    }
    return this.managers.get(key)!;
  }

  /**
   * 销毁连接管理器
   */
  static async destroyManager(key: string): Promise<void> {
    const manager = this.managers.get(key);
    if (manager) {
      await manager.destroy();
      this.managers.delete(key);
    }
  }

  /**
   * 销毁所有连接管理器
   */
  static async destroyAllManagers(): Promise<void> {
    const destroyPromises = Array.from(this.managers.entries()).map(
      async ([key, manager]) => {
        await manager.destroy();
      }
    );
    
    await Promise.all(destroyPromises);
    this.managers.clear();
  }

  /**
   * 获取所有管理器状态
   */
  static getAllManagerStatus(): Record<string, ConnectionManagerStatus> {
    const status: Record<string, ConnectionManagerStatus> = {};
    Array.from(this.managers.entries()).forEach(([key, manager]) => {
      status[key] = manager.getStatus();
    });
    return status;
  }

  /**
   * 获取管理器列表
   */
  static getManagerKeys(): string[] {
    return Array.from(this.managers.keys());
  }
}