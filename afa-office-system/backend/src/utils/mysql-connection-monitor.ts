/**
 * MySQL连接管理和监控工具
 * 提供连接状态监控、健康检查和详细错误报告功能
 */

import * as mysql from 'mysql2/promise';
import { EventEmitter } from 'events';
import { MySQLConfig } from '../config/database-config-manager';

/**
 * 连接状态枚举
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  RECONNECTING = 'reconnecting'
}

/**
 * 连接健康状态
 */
export interface ConnectionHealth {
  status: ConnectionStatus;
  lastCheck: Date;
  responseTime: number;
  errorCount: number;
  lastError?: Error;
  uptime: number;
  connectionCount: number;
  activeConnections: number;
  queuedConnections: number;
}

/**
 * 连接池统计信息
 */
export interface PoolStatistics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  queuedRequests: number;
  acquiredConnections: number;
  releasedConnections: number;
  createdConnections: number;
  destroyedConnections: number;
  timeouts: number;
  errors: number;
}

/**
 * 连接错误详情
 */
export interface ConnectionError {
  code: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
  message: string;
  timestamp: Date;
  fatal: boolean;
  retryable: boolean;
  suggestion?: string;
}

/**
 * 监控配置
 */
export interface MonitorConfig {
  healthCheckInterval: number;    // 健康检查间隔(ms)
  maxErrorCount: number;          // 最大错误计数
  reconnectDelay: number;         // 重连延迟(ms)
  maxReconnectAttempts: number;   // 最大重连尝试次数
  slowQueryThreshold: number;     // 慢查询阈值(ms)
  enableDetailedLogging: boolean; // 是否启用详细日志
}

/**
 * MySQL连接监控器
 */
export class MySQLConnectionMonitor extends EventEmitter {
  private pool: mysql.Pool | null = null;
  private config: MySQLConfig;
  private monitorConfig: MonitorConfig;
  private health: ConnectionHealth;
  private statistics: PoolStatistics;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private startTime = new Date();
  private errorHistory: ConnectionError[] = [];

  constructor(config: MySQLConfig, monitorConfig?: Partial<MonitorConfig>) {
    super();

    this.config = config;
    this.monitorConfig = {
      healthCheckInterval: 30000,      // 30秒
      maxErrorCount: 10,
      reconnectDelay: 5000,            // 5秒
      maxReconnectAttempts: 5,
      slowQueryThreshold: 1000,        // 1秒
      enableDetailedLogging: true,
      ...monitorConfig
    };

    this.health = {
      status: ConnectionStatus.DISCONNECTED,
      lastCheck: new Date(),
      responseTime: 0,
      errorCount: 0,
      uptime: 0,
      connectionCount: 0,
      activeConnections: 0,
      queuedConnections: 0
    };

    this.statistics = {
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
  }

  /**
   * 初始化连接池并开始监控
   */
  async initialize(pool: mysql.Pool): Promise<void> {
    this.pool = pool;
    this.health.status = ConnectionStatus.CONNECTING;

    try {
      // 设置连接池事件监听
      this.setupPoolEventListeners();

      // 执行初始健康检查
      await this.performHealthCheck();

      // 启动定期健康检查
      this.startHealthCheck();

      this.health.status = ConnectionStatus.CONNECTED;
      this.emit('connected', this.health);

      if (this.monitorConfig.enableDetailedLogging) {
        console.log('✅ MySQL连接监控器已启动');
      }
    } catch (error) {
      this.health.status = ConnectionStatus.ERROR;
      this.health.lastError = error as Error;
      this.recordError(error as Error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 设置连接池事件监听器
   */
  private setupPoolEventListeners(): void {
    if (!this.pool) return;

    // 监听连接获取事件
    this.pool.on('acquire', (connection) => {
      this.statistics.acquiredConnections++;
      this.statistics.activeConnections++;
      this.emit('connection:acquired', { connectionId: (connection as any).threadId });
    });

    // 监听连接释放事件
    this.pool.on('release', (connection) => {
      this.statistics.releasedConnections++;
      this.statistics.activeConnections = Math.max(0, this.statistics.activeConnections - 1);
      this.emit('connection:released', { connectionId: (connection as any).threadId });
    });

    // 监听连接创建事件
    this.pool.on('connection', (connection) => {
      this.statistics.createdConnections++;
      this.statistics.totalConnections++;
      this.emit('connection:created', { connectionId: (connection as any).threadId });
    });

    // 注意：mysql2 Pool 没有 'destroy' 事件，这里移除该监听器

    // 监听入队事件
    this.pool.on('enqueue', () => {
      this.statistics.queuedRequests++;
      this.emit('connection:queued');
    });
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(): Promise<ConnectionHealth> {
    if (!this.pool) {
      throw new Error('连接池未初始化');
    }

    const startTime = Date.now();

    try {
      // 执行简单的ping查询
      const connection = await this.pool.getConnection();
      try {
        await connection.ping();
        const responseTime = Date.now() - startTime;

        // 更新健康状态
        this.health.lastCheck = new Date();
        this.health.responseTime = responseTime;
        this.health.uptime = Date.now() - this.startTime.getTime();
        this.health.status = ConnectionStatus.CONNECTED;

        // 获取连接池状态
        await this.updatePoolStatistics();

        // 检查慢查询
        if (responseTime > this.monitorConfig.slowQueryThreshold) {
          this.emit('slow:query', { responseTime, threshold: this.monitorConfig.slowQueryThreshold });
        }

        // 重置错误计数
        if (this.health.errorCount > 0) {
          this.health.errorCount = 0;
          this.emit('health:recovered', this.health);
        }

        return this.health;
      } finally {
        connection.release();
      }
    } catch (error) {
      this.health.errorCount++;
      this.health.lastError = error as Error;
      this.health.status = ConnectionStatus.ERROR;
      this.recordError(error as Error);

      // 检查是否需要重连
      if (this.health.errorCount >= this.monitorConfig.maxErrorCount) {
        this.emit('health:critical', this.health);
        await this.attemptReconnect();
      }

      throw error;
    }
  }

  /**
   * 更新连接池统计信息
   */
  private async updatePoolStatistics(): Promise<void> {
    if (!this.pool) return;

    try {
      // 获取连接池状态（mysql2没有直接的API，需要通过查询获取）
      const connection = await this.pool.getConnection();
      try {
        const [rows] = await connection.execute('SHOW STATUS LIKE "Threads_%"');
        const statusRows = rows as any[];

        for (const row of statusRows) {
          switch (row.Variable_name) {
            case 'Threads_connected':
              this.statistics.activeConnections = parseInt(row.Value);
              break;
            case 'Threads_running':
              this.health.activeConnections = parseInt(row.Value);
              break;
          }
        }

        // 更新健康状态中的连接信息
        this.health.connectionCount = this.statistics.totalConnections;
      } finally {
        connection.release();
      }
    } catch (error) {
      if (this.monitorConfig.enableDetailedLogging) {
        console.warn('获取连接池统计信息失败:', error);
      }
    }
  }

  /**
   * 尝试重连
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.monitorConfig.maxReconnectAttempts) {
      this.emit('reconnect:failed', {
        attempts: this.reconnectAttempts,
        maxAttempts: this.monitorConfig.maxReconnectAttempts
      });
      return;
    }

    this.health.status = ConnectionStatus.RECONNECTING;
    this.reconnectAttempts++;

    this.emit('reconnect:attempt', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.monitorConfig.maxReconnectAttempts
    });

    try {
      // 等待重连延迟
      await new Promise(resolve => setTimeout(resolve, this.monitorConfig.reconnectDelay));

      // 尝试健康检查
      await this.performHealthCheck();

      // 重连成功
      this.reconnectAttempts = 0;
      this.health.status = ConnectionStatus.CONNECTED;
      this.emit('reconnect:success', this.health);

    } catch (error) {
      this.emit('reconnect:error', { error, attempt: this.reconnectAttempts });
      // 递归尝试重连
      setTimeout(() => this.attemptReconnect(), this.monitorConfig.reconnectDelay);
    }
  }

  /**
   * 记录错误信息
   */
  private recordError(error: Error): void {
    const mysqlError = error as any;
    const connectionError = {
      code: mysqlError.code || 'UNKNOWN',
      errno: mysqlError.errno,
      sqlState: mysqlError.sqlState,
      sqlMessage: mysqlError.sqlMessage,
      message: error.message,
      timestamp: new Date(),
      fatal: this.isFatalError(mysqlError.code),
      retryable: this.isRetryableError(mysqlError.code),
      suggestion: this.getErrorSuggestion(mysqlError.code)
    } as ConnectionError;

    this.errorHistory.push(connectionError);
    this.statistics.errors++;

    // 保持错误历史记录在合理范围内
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-50);
    }

    this.emit('error:recorded', connectionError);
  }

  /**
   * 判断是否为致命错误
   */
  private isFatalError(code: string): boolean {
    const fatalCodes = [
      'ER_ACCESS_DENIED_ERROR',
      'ER_BAD_DB_ERROR',
      'ER_DBACCESS_DENIED_ERROR',
      'ER_HOST_NOT_PRIVILEGED'
    ];
    return fatalCodes.includes(code);
  }

  /**
   * 判断是否为可重试错误
   */
  private isRetryableError(code: string): boolean {
    const retryableCodes = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
      'ER_LOCK_WAIT_TIMEOUT',
      'ER_LOCK_DEADLOCK'
    ];
    return retryableCodes.includes(code);
  }

  /**
   * 获取错误建议
   */
  private getErrorSuggestion(code: string): string | undefined {
    const suggestions: Record<string, string> = {
      'ECONNREFUSED': '检查MySQL服务是否正在运行，确认主机和端口配置正确',
      'ER_ACCESS_DENIED_ERROR': '检查用户名和密码是否正确，确认用户具有相应权限',
      'ER_BAD_DB_ERROR': '检查数据库名称是否正确，确认数据库是否存在',
      'ETIMEDOUT': '检查网络连接，考虑增加连接超时时间',
      'ER_LOCK_WAIT_TIMEOUT': '检查是否存在长时间运行的事务，考虑优化查询',
      'ER_LOCK_DEADLOCK': '检查事务逻辑，避免死锁情况'
    };
    return suggestions[code];
  }

  /**
   * 启动健康检查定时器
   */
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        // 错误已在performHealthCheck中处理
      }
    }, this.monitorConfig.healthCheckInterval);
  }

  /**
   * 停止健康检查
   */
  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * 获取当前健康状态
   */
  getHealth(): ConnectionHealth {
    return { ...this.health };
  }

  /**
   * 获取连接池统计信息
   */
  getStatistics(): PoolStatistics {
    return { ...this.statistics };
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(): ConnectionError[] {
    return [...this.errorHistory];
  }

  /**
   * 获取详细的连接报告
   */
  getDetailedReport(): {
    health: ConnectionHealth;
    statistics: PoolStatistics;
    errors: ConnectionError[];
    config: MonitorConfig;
  } {
    return {
      health: this.getHealth(),
      statistics: this.getStatistics(),
      errors: this.getErrorHistory(),
      config: { ...this.monitorConfig }
    };
  }

  /**
   * 重置统计信息
   */
  resetStatistics(): void {
    this.statistics = {
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
    this.errorHistory = [];
    this.emit('statistics:reset');
  }

  /**
   * 更新监控配置
   */
  updateConfig(newConfig: Partial<MonitorConfig>): void {
    this.monitorConfig = { ...this.monitorConfig, ...newConfig };

    // 重启健康检查以应用新的间隔
    if (newConfig.healthCheckInterval) {
      this.startHealthCheck();
    }

    this.emit('config:updated', this.monitorConfig);
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    this.stopHealthCheck();
    this.removeAllListeners();
    this.pool = null;
    this.health.status = ConnectionStatus.DISCONNECTED;

    if (this.monitorConfig.enableDetailedLogging) {
      console.log('🔌 MySQL连接监控器已销毁');
    }
  }
}

/**
 * 创建MySQL连接监控器
 */
export function createMySQLConnectionMonitor(
  config: MySQLConfig,
  monitorConfig?: Partial<MonitorConfig>
): MySQLConnectionMonitor {
  return new MySQLConnectionMonitor(config, monitorConfig);
}

/**
 * 连接监控器工厂
 */
export class MySQLConnectionMonitorFactory {
  private static monitors = new Map<string, MySQLConnectionMonitor>();

  /**
   * 创建或获取监控器实例
   */
  static getOrCreateMonitor(
    key: string,
    config: MySQLConfig,
    monitorConfig?: Partial<MonitorConfig>
  ): MySQLConnectionMonitor {
    if (!this.monitors.has(key)) {
      const monitor = new MySQLConnectionMonitor(config, monitorConfig);
      this.monitors.set(key, monitor);
    }
    return this.monitors.get(key)!;
  }

  /**
   * 销毁监控器实例
   */
  static destroyMonitor(key: string): void {
    const monitor = this.monitors.get(key);
    if (monitor) {
      monitor.destroy();
      this.monitors.delete(key);
    }
  }

  /**
   * 销毁所有监控器实例
   */
  static destroyAllMonitors(): void {
    Array.from(this.monitors.entries()).forEach(([key, monitor]) => {
      monitor.destroy();
    });
    this.monitors.clear();
  }

  /**
   * 获取所有监控器的状态
   */
  static getAllMonitorStatus(): Record<string, ConnectionHealth> {
    const status: Record<string, ConnectionHealth> = {};
    Array.from(this.monitors.entries()).forEach(([key, monitor]) => {
      status[key] = monitor.getHealth();
    });
    return status;
  }
}