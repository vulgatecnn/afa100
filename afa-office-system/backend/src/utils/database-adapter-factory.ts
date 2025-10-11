/**
 * 数据库适配器工厂
 * 负责创建和管理数据库适配器，包含错误处理和自动回退机制
 */

import { DatabaseAdapter, DatabaseConfigManager, DatabaseConnectionConfig, ConnectionError } from './database-adapter.js';
import { MySQLAdapter } from './mysql-adapter.js';

// 动态导入SQLite适配器以避免循环依赖
let SQLiteAdapter: any;

/**
 * 数据库适配器工厂类
 */
export class DatabaseAdapterFactory {
  private static instance: DatabaseAdapter | null = null;
  private static retryCount = 0;
  private static maxRetries = 3;
  private static retryDelay = 1000; // 1秒

  /**
   * 创建数据库适配器
   */
  static async createAdapter(config?: DatabaseConnectionConfig): Promise<DatabaseAdapter> {
    const dbConfig = config || DatabaseConfigManager.getTestConfig();
    
    console.log(`🔧 尝试创建${dbConfig.type.toUpperCase()}数据库适配器...`);

    if (dbConfig.type === 'mysql') {
      return await this.createMySQLAdapter(dbConfig);
    } else {
      return await this.createSQLiteAdapter(dbConfig);
    }
  }

  /**
   * 创建MySQL适配器（带重试和回退机制）
   */
  private static async createMySQLAdapter(config: DatabaseConnectionConfig): Promise<DatabaseAdapter> {
    const adapter = new MySQLAdapter();
    
    try {
      await this.connectWithRetry(adapter, config);
      console.log('✅ MySQL数据库适配器创建成功');
      this.retryCount = 0; // 重置重试计数
      return adapter;
    } catch (error) {
      console.warn('⚠️ MySQL连接失败，尝试回退到SQLite:', (error as Error).message);
      
      // 自动回退到SQLite
      const sqliteConfig = { type: 'sqlite' as const, path: ':memory:' };
      return await this.createSQLiteAdapter(sqliteConfig);
    }
  }

  /**
   * 创建SQLite适配器
   */
  private static async createSQLiteAdapter(config: DatabaseConnectionConfig): Promise<DatabaseAdapter> {
    // 动态导入SQLite适配器
    if (!SQLiteAdapter) {
      try {
        const module = await import('./sqlite-adapter.js');
        SQLiteAdapter = module.SQLiteAdapter;
      } catch (error) {
        // 如果SQLite适配器不存在，使用现有的database.js
        const module = await import('./database.js');
        SQLiteAdapter = module.default;
      }
    }

    const adapter = new SQLiteAdapter();
    await adapter.connect(config);
    console.log('✅ SQLite数据库适配器创建成功');
    return adapter;
  }

  /**
   * 带重试机制的连接
   */
  private static async connectWithRetry(
    adapter: DatabaseAdapter, 
    config: DatabaseConnectionConfig
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await adapter.connect(config);
        return; // 连接成功
      } catch (error) {
        lastError = error as Error;
        
        console.warn(`🔄 MySQL连接尝试 ${attempt}/${this.maxRetries} 失败:`, lastError.message);

        // 如果是认证错误或配置错误，不进行重试
        if (this.isNonRetryableError(lastError)) {
          break;
        }

        // 如果不是最后一次尝试，等待后重试
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    // 所有重试都失败了
    throw new ConnectionError(
      `MySQL连接失败，已重试${this.maxRetries}次: ${lastError?.message}`,
      lastError || undefined
    );
  }

  /**
   * 判断是否为不可重试的错误
   */
  private static isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const nonRetryablePatterns = [
      'access denied',           // 认证失败
      'unknown database',        // 数据库不存在
      'host is not allowed',     // 主机不被允许
      'too many connections',    // 连接数过多
      'authentication failed'    // 认证失败
    ];

    return nonRetryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * 延迟函数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取单例适配器
   */
  static async getInstance(config?: DatabaseConnectionConfig): Promise<DatabaseAdapter> {
    if (!this.instance) {
      this.instance = await this.createAdapter(config);
    }
    return this.instance;
  }

  /**
   * 重置单例实例
   */
  static async resetInstance(): Promise<void> {
    if (this.instance) {
      try {
        await this.instance.disconnect();
      } catch (error) {
        console.warn('断开数据库连接时出现警告:', error);
      }
      this.instance = null;
    }
  }

  /**
   * 测试数据库连接
   */
  static async testConnection(config?: DatabaseConnectionConfig): Promise<{
    success: boolean;
    type: 'mysql' | 'sqlite';
    connectionInfo: string;
    error?: string;
  }> {
    const dbConfig = config || DatabaseConfigManager.getTestConfig();
    
    try {
      const adapter = await this.createAdapter(dbConfig);
      const result = {
        success: true,
        type: adapter.getType(),
        connectionInfo: adapter.getConnectionInfo()
      };
      
      // 清理测试连接
      await adapter.disconnect();
      
      return result;
    } catch (error) {
      return {
        success: false,
        type: dbConfig.type,
        connectionInfo: DatabaseConfigManager.getConnectionString(dbConfig),
        error: (error as Error).message
      };
    }
  }

  /**
   * 获取推荐的数据库配置
   */
  static getRecommendedConfig(): DatabaseConnectionConfig {
    // 检查环境变量，优先使用MySQL
    if (process.env.TEST_DB_TYPE === 'mysql' || process.env.NODE_ENV === 'development') {
      return DatabaseConfigManager.getTestConfig();
    }
    
    // 默认使用SQLite
    return { type: 'sqlite', path: ':memory:' };
  }

  /**
   * 验证MySQL服务可用性
   */
  static async validateMySQLAvailability(config: DatabaseConnectionConfig): Promise<boolean> {
    if (config.type !== 'mysql') {
      return false;
    }

    try {
      const adapter = new MySQLAdapter();
      await adapter.connect(config);
      await adapter.disconnect();
      return true;
    } catch (error) {
      console.debug('MySQL可用性检查失败:', (error as Error).message);
      return false;
    }
  }
}

/**
 * 连接管理器
 * 提供连接状态监控和管理功能
 */
export class ConnectionManager {
  private static healthCheckInterval: NodeJS.Timeout | null = null;
  private static adapter: DatabaseAdapter | null = null;

  /**
   * 启动连接健康检查
   */
  static startHealthCheck(adapter: DatabaseAdapter, intervalMs = 30000): void {
    this.adapter = adapter;
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        if (!adapter.isReady()) {
          console.warn('⚠️ 数据库连接不可用，尝试重新连接...');
          // 这里可以添加重连逻辑
        }
      } catch (error) {
        console.error('数据库健康检查失败:', error);
      }
    }, intervalMs);

    console.log(`🔍 数据库连接健康检查已启动 (间隔: ${intervalMs}ms)`);
  }

  /**
   * 停止连接健康检查
   */
  static stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🛑 数据库连接健康检查已停止');
    }
  }

  /**
   * 获取连接状态
   */
  static getConnectionStatus(): {
    isReady: boolean;
    type?: string;
    connectionInfo?: string;
  } {
    if (!this.adapter) {
      return { isReady: false };
    }

    return {
      isReady: this.adapter.isReady(),
      type: this.adapter.getType(),
      connectionInfo: this.adapter.getConnectionInfo()
    };
  }
}

/**
 * 错误恢复管理器
 */
export class ErrorRecoveryManager {
  private static errorCount = 0;
  private static lastErrorTime = 0;
  private static maxErrorsPerMinute = 10;

  /**
   * 记录数据库错误
   */
  static recordError(error: Error): void {
    const now = Date.now();
    
    // 如果距离上次错误超过1分钟，重置错误计数
    if (now - this.lastErrorTime > 60000) {
      this.errorCount = 0;
    }

    this.errorCount++;
    this.lastErrorTime = now;

    console.error(`📊 数据库错误统计: ${this.errorCount}/${this.maxErrorsPerMinute} (最近1分钟)`);

    // 如果错误频率过高，触发恢复机制
    if (this.errorCount >= this.maxErrorsPerMinute) {
      this.triggerRecovery(error);
    }
  }

  /**
   * 触发恢复机制
   */
  private static async triggerRecovery(error: Error): Promise<void> {
    console.warn('🚨 数据库错误频率过高，触发恢复机制...');

    try {
      // 重置数据库适配器
      await DatabaseAdapterFactory.resetInstance();
      
      // 重新创建适配器
      const newAdapter = await DatabaseAdapterFactory.getInstance();
      
      console.log('✅ 数据库连接已恢复');
      
      // 重置错误计数
      this.errorCount = 0;
    } catch (recoveryError) {
      console.error('❌ 数据库恢复失败:', recoveryError);
    }
  }

  /**
   * 获取错误统计
   */
  static getErrorStats(): {
    errorCount: number;
    lastErrorTime: number;
    isHealthy: boolean;
  } {
    const now = Date.now();
    const isHealthy = this.errorCount < this.maxErrorsPerMinute && (now - this.lastErrorTime > 60000);

    return {
      errorCount: this.errorCount,
      lastErrorTime: this.lastErrorTime,
      isHealthy
    };
  }
}