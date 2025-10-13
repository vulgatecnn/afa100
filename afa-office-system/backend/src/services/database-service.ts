/**
 * 数据库服务
 * 提供自动回退机制和连接管理功能
 */

import { DatabaseAdapter } from '../interfaces/database-adapter';
import { DatabaseConfig, DatabaseType, databaseConfigManager } from '../config/database-config-manager';
import { databaseAdapterFactory } from '../factories/database-adapter-factory';

/**
 * 数据库连接状态
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  FALLBACK = 'fallback'
}

/**
 * 连接健康状态
 */
export interface ConnectionHealth {
  status: ConnectionStatus;
  databaseType: DatabaseType;
  lastPing: Date | null;
  errorCount: number;
  lastError: string | null;
  uptime: number;
  fallbackReason: string | null;
}

/**
 * 数据库服务配置
 */
export interface DatabaseServiceConfig {
  enableFallback: boolean;
  fallbackTimeout: number;
  healthCheckInterval: number;
  maxRetries: number;
  retryDelay: number;
}

/**
 * 数据库服务类
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private adapter: DatabaseAdapter | null = null;
  private config: DatabaseConfig | null = null;
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private health: ConnectionHealth;
  private serviceConfig: DatabaseServiceConfig;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private connectionStartTime: Date | null = null;

  private constructor() {
    this.health = {
      status: ConnectionStatus.DISCONNECTED,
      databaseType: DatabaseType.MYSQL,
      lastPing: null,
      errorCount: 0,
      lastError: null,
      uptime: 0,
      fallbackReason: null
    };

    this.serviceConfig = {
      enableFallback: process.env.DB_ENABLE_FALLBACK !== 'false',
      fallbackTimeout: parseInt(process.env.DB_FALLBACK_TIMEOUT || '10000'),
      healthCheckInterval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000'),
      maxRetries: parseInt(process.env.DB_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000')
    };
  }

  /**
   * 获取单例实例
   */
  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * 初始化数据库连接（带自动回退）
   */
  async initialize(): Promise<DatabaseAdapter> {
    this.status = ConnectionStatus.CONNECTING;
    this.connectionStartTime = new Date();

    try {
      // 获取主要配置
      const primaryConfig = databaseConfigManager.getConfig();
      
      // 尝试连接主要数据库
      const adapter = await this.connectWithRetry(primaryConfig);
      
      this.adapter = adapter;
      this.config = primaryConfig;
      this.status = ConnectionStatus.CONNECTED;
      this.health.status = ConnectionStatus.CONNECTED;
      this.health.databaseType = primaryConfig.type;
      this.health.errorCount = 0;
      this.health.lastError = null;
      this.health.fallbackReason = null;

      // 启动健康检查
      this.startHealthCheck();

      console.log(`✅ 数据库连接成功: ${databaseConfigManager.getConfigSummary(primaryConfig)}`);
      return adapter;

    } catch (primaryError) {
      const error = primaryError as Error;
      console.error(`❌ MySQL数据库连接失败: ${error.message}`);
      
      this.status = ConnectionStatus.ERROR;
      this.health.status = ConnectionStatus.ERROR;
      this.health.lastError = error.message;
      throw error;
    }
  }

  /**
   * 带重试的连接方法
   */
  private async connectWithRetry(config: DatabaseConfig): Promise<DatabaseAdapter> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.serviceConfig.maxRetries; attempt++) {
      try {
        console.log(`🔄 尝试连接数据库 (${attempt}/${this.serviceConfig.maxRetries}): ${databaseConfigManager.getConfigSummary(config)}`);
        
        const adapter = await Promise.race([
          databaseAdapterFactory.createAndTestAdapter(config),
          this.createTimeoutPromise(this.serviceConfig.fallbackTimeout)
        ]);

        return adapter;
      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ 连接尝试 ${attempt} 失败: ${(error as Error).message}`);
        
        if (attempt < this.serviceConfig.maxRetries) {
          await this.delay(this.serviceConfig.retryDelay * attempt);
        }
      }
    }

    throw lastError || new Error('连接重试失败');
  }

  /**
   * 处理数据库连接失败（不再支持SQLite回退）
   */
  private async handleConnectionFailure(primaryErrorMessage: string): Promise<never> {
    console.error('❌ MySQL数据库连接失败，无可用的回退选项');
    console.error(`📝 失败原因: ${primaryErrorMessage}`);
    
    this.status = ConnectionStatus.ERROR;
    this.health.status = ConnectionStatus.ERROR;
    this.health.lastError = primaryErrorMessage;
    
    throw new Error(`数据库连接失败: ${primaryErrorMessage}`);
  }

  /**
   * 创建超时Promise
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`连接超时 (${timeout}ms)`));
      }, timeout);
    });
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.serviceConfig.healthCheckInterval);
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.adapter) {
      return;
    }

    try {
      const isHealthy = await this.adapter.ping();
      
      if (isHealthy) {
        this.health.lastPing = new Date();
        if (this.connectionStartTime) {
          this.health.uptime = Date.now() - this.connectionStartTime.getTime();
        }
      } else {
        this.health.errorCount++;
        this.health.lastError = '健康检查失败';
        console.warn('⚠️ 数据库健康检查失败');
      }
    } catch (error) {
      this.health.errorCount++;
      this.health.lastError = (error as Error).message;
      console.error('❌ 数据库健康检查错误:', error);
    }
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
   * 获取当前数据库适配器
   */
  getAdapter(): DatabaseAdapter | null {
    return this.adapter;
  }

  /**
   * 获取当前配置
   */
  getConfig(): DatabaseConfig | null {
    return this.config;
  }

  /**
   * 获取连接状态
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * 获取健康状态
   */
  getHealth(): ConnectionHealth {
    return { ...this.health };
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED || this.status === ConnectionStatus.FALLBACK;
  }

  /**
   * 检查是否使用了回退数据库
   */
  isFallback(): boolean {
    return this.status === ConnectionStatus.FALLBACK;
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    this.stopHealthCheck();
    
    if (this.adapter) {
      await this.adapter.cleanup();
      this.adapter = null;
    }
    
    this.config = null;
    this.status = ConnectionStatus.DISCONNECTED;
    this.health.status = ConnectionStatus.DISCONNECTED;
    this.connectionStartTime = null;
    
    console.log('🔌 数据库连接已断开');
  }

  /**
   * 重新连接
   */
  async reconnect(): Promise<DatabaseAdapter> {
    await this.disconnect();
    return await this.initialize();
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStats(): any {
    return {
      status: this.status,
      health: this.health,
      config: this.config ? databaseConfigManager.getConfigSummary(this.config) : null,
      serviceConfig: this.serviceConfig,
      uptime: this.connectionStartTime ? Date.now() - this.connectionStartTime.getTime() : 0
    };
  }

  /**
   * 更新服务配置
   */
  updateServiceConfig(newConfig: Partial<DatabaseServiceConfig>): void {
    this.serviceConfig = { ...this.serviceConfig, ...newConfig };
    
    // 如果健康检查间隔改变，重启健康检查
    if (newConfig.healthCheckInterval && this.isConnected()) {
      this.startHealthCheck();
    }
  }
}

// 导出单例实例
export const databaseService = DatabaseService.getInstance();

// 导出便捷函数
export const initializeDatabase = () => databaseService.initialize();
export const getDatabaseAdapter = () => databaseService.getAdapter();
export const getDatabaseStatus = () => databaseService.getStatus();
export const getDatabaseHealth = () => databaseService.getHealth();
export const isDatabaseConnected = () => databaseService.isConnected();
export const isDatabaseFallback = () => databaseService.isFallback();