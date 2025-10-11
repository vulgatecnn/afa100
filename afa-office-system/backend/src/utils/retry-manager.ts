import { RetryOptions } from './database.js';

// 重试统计信息
export interface RetryStats {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  averageRetryDelay: number;
  retryReasons: Record<string, number>;
}

// 重试事件接口
export interface RetryEvent {
  operation: string;
  attempt: number;
  maxAttempts: number;
  error: Error;
  delay: number;
  timestamp: Date;
}

/**
 * 数据库重试管理器
 * 实现指数退避重试策略，支持可配置的重试条件和统计
 */
export class RetryManager {
  private stats: RetryStats = {
    totalAttempts: 0,
    successfulRetries: 0,
    failedRetries: 0,
    averageRetryDelay: 0,
    retryReasons: {},
  };

  private retryDelays: number[] = [];
  private onRetryCallbacks: Array<(event: RetryEvent) => void> = [];

  /**
   * 执行带重试的操作
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
    operationName = 'database-operation'
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
      this.stats.totalAttempts++;

      try {
        const result = await operation();
        
        // 如果不是第一次尝试，记录成功重试
        if (attempt > 1) {
          this.stats.successfulRetries++;
          console.log(`✅ 重试成功: ${operationName} (第${attempt}次尝试)`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // 记录错误原因统计
        const errorCode = (error as any).code || 'UNKNOWN';
        this.stats.retryReasons[errorCode] = (this.stats.retryReasons[errorCode] || 0) + 1;

        // 检查是否为可重试的错误
        if (!this.isRetryableError(error, options.retryableErrors)) {
          console.warn(`❌ 不可重试的错误: ${lastError.message} (${errorCode})`);
          throw error;
        }

        // 如果已达到最大重试次数
        if (attempt >= options.maxRetries) {
          this.stats.failedRetries++;
          console.error(`❌ 重试失败: ${operationName} (已达到最大重试次数 ${options.maxRetries})`);
          throw lastError;
        }

        // 计算延迟时间（指数退避）
        const delay = this.calculateDelay(attempt, options);
        this.recordDelay(delay);

        // 触发重试事件
        const retryEvent: RetryEvent = {
          operation: operationName,
          attempt,
          maxAttempts: options.maxRetries,
          error: lastError,
          delay,
          timestamp: new Date(),
        };

        this.notifyRetryCallbacks(retryEvent);

        console.warn(
          `⚠️ 操作失败，准备重试: ${operationName} ` +
          `(第${attempt}次尝试，${delay}ms后重试) - ${lastError.message}`
        );

        // 等待指定时间后重试
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * 批量重试操作
   */
  async executeMultipleWithRetry<T>(
    operations: Array<() => Promise<T>>,
    options: RetryOptions,
    operationName = 'batch-operation'
  ): Promise<T[]> {
    const results: T[] = [];
    const errors: Error[] = [];

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      if (operation) {
        try {
          const result = await this.executeWithRetry(
            operation,
            options,
            `${operationName}-${i + 1}`
          );
          results.push(result);
        } catch (error) {
          errors.push(error as Error);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `批量操作部分失败: ${errors.length}/${operations.length} 个操作失败。` +
        `错误: ${errors.map(e => e.message).join(', ')}`
      );
    }

    return results;
  }

  /**
   * 条件重试 - 根据条件决定是否重试
   */
  async executeWithConditionalRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
    retryCondition: (error: Error, attempt: number) => boolean,
    operationName = 'conditional-operation'
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
      this.stats.totalAttempts++;

      try {
        const result = await operation();
        
        if (attempt > 1) {
          this.stats.successfulRetries++;
          console.log(`✅ 条件重试成功: ${operationName} (第${attempt}次尝试)`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // 检查自定义重试条件
        if (!retryCondition(lastError, attempt)) {
          console.warn(`❌ 不满足重试条件: ${operationName} - ${lastError.message}`);
          throw error;
        }

        // 检查是否为可重试的错误
        if (!this.isRetryableError(error, options.retryableErrors)) {
          console.warn(`❌ 不可重试的错误类型: ${operationName} - ${lastError.message}`);
          throw error;
        }

        if (attempt >= options.maxRetries) {
          this.stats.failedRetries++;
          throw lastError;
        }

        const delay = this.calculateDelay(attempt, options);
        this.recordDelay(delay);

        console.warn(
          `⚠️ 条件重试: ${operationName} ` +
          `(第${attempt}次尝试，${delay}ms后重试) - ${lastError.message}`
        );

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * 获取重试统计信息
   */
  getStats(): RetryStats {
    return {
      ...this.stats,
      averageRetryDelay: this.retryDelays.length > 0 
        ? this.retryDelays.reduce((a, b) => a + b, 0) / this.retryDelays.length 
        : 0,
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageRetryDelay: 0,
      retryReasons: {},
    };
    this.retryDelays = [];
  }

  /**
   * 添加重试事件监听器
   */
  onRetry(callback: (event: RetryEvent) => void): void {
    this.onRetryCallbacks.push(callback);
  }

  /**
   * 移除重试事件监听器
   */
  removeRetryListener(callback: (event: RetryEvent) => void): void {
    const index = this.onRetryCallbacks.indexOf(callback);
    if (index > -1) {
      this.onRetryCallbacks.splice(index, 1);
    }
  }

  /**
   * 判断是否为可重试的错误
   */
  private isRetryableError(error: any, retryableErrors: string[]): boolean {
    const errorCode = error.code || 'UNKNOWN';
    const errorMessage = error.message || '';
    
    // 检查错误码
    if (retryableErrors.includes(errorCode)) {
      return true;
    }
    
    // 检查SQLite特定的错误消息模式
    const sqliteRetryablePatterns = [
      /database is locked/i,
      /database is busy/i,
      /sqlite_busy/i,
      /sqlite_locked/i,
      /database table is locked/i,
      /cannot start a transaction within a transaction/i,
    ];
    
    return sqliteRetryablePatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * 计算重试延迟时间（指数退避）
   */
  private calculateDelay(attempt: number, options: RetryOptions): number {
    // 指数退避: baseDelay * 2^(attempt-1)
    const exponentialDelay = options.baseDelay * Math.pow(2, attempt - 1);
    
    // 添加随机抖动，避免雷群效应 (10-20%的随机变化)
    const jitterRange = 0.1 + Math.random() * 0.1; // 10-20%
    const jitter = exponentialDelay * jitterRange * (Math.random() - 0.5);
    
    // 确保不超过最大延迟
    const finalDelay = Math.min(exponentialDelay + jitter, options.maxDelay);
    
    // 确保最小延迟不小于基础延迟的一半
    return Math.max(finalDelay, options.baseDelay * 0.5);
  }

  /**
   * 记录延迟时间
   */
  private recordDelay(delay: number): void {
    this.retryDelays.push(delay);
    
    // 保持最近1000次重试的延迟记录
    if (this.retryDelays.length > 1000) {
      this.retryDelays.shift();
    }
  }

  /**
   * 通知重试事件监听器
   */
  private notifyRetryCallbacks(event: RetryEvent): void {
    this.onRetryCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('重试事件回调执行失败:', error);
      }
    });
  }

  /**
   * 延时函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 创建针对SQLite的重试选项
   */
  static createSQLiteRetryOptions(overrides?: Partial<RetryOptions>): RetryOptions {
    return {
      maxRetries: 5,
      baseDelay: 100,
      maxDelay: 5000,
      retryableErrors: [
        'SQLITE_BUSY',
        'SQLITE_LOCKED',
        'SQLITE_PROTOCOL',
        'SQLITE_IOERR',
        'SQLITE_FULL',
        'SQLITE_CANTOPEN',
      ],
      ...overrides,
    };
  }

  /**
   * 创建针对测试环境的重试选项
   */
  static createTestRetryOptions(overrides?: Partial<RetryOptions>): RetryOptions {
    return {
      maxRetries: 10,
      baseDelay: 50,
      maxDelay: 2000,
      retryableErrors: [
        'SQLITE_BUSY',
        'SQLITE_LOCKED',
        'SQLITE_PROTOCOL',
        'SQLITE_IOERR',
        'SQLITE_FULL',
        'SQLITE_CANTOPEN',
      ],
      ...overrides,
    };
  }

  /**
   * 创建针对生产环境的重试选项
   */
  static createProductionRetryOptions(overrides?: Partial<RetryOptions>): RetryOptions {
    return {
      maxRetries: 3,
      baseDelay: 200,
      maxDelay: 10000,
      retryableErrors: [
        'SQLITE_BUSY',
        'SQLITE_LOCKED',
        'SQLITE_PROTOCOL',
      ],
      ...overrides,
    };
  }

  /**
   * 专门针对SQLite数据库操作的重试执行
   * 包含特殊的SQLite错误处理逻辑
   */
  async executeSQLiteOperation<T>(
    operation: () => Promise<T>,
    operationName = 'sqlite-operation',
    customOptions?: Partial<RetryOptions>
  ): Promise<T> {
    const env = process.env.NODE_ENV || 'development';
    let baseOptions: RetryOptions;
    
    switch (env) {
      case 'test':
        baseOptions = RetryManager.createTestRetryOptions();
        break;
      case 'production':
        baseOptions = RetryManager.createProductionRetryOptions();
        break;
      default:
        baseOptions = RetryManager.createSQLiteRetryOptions();
    }
    
    const options = { ...baseOptions, ...customOptions };
    
    return this.executeWithConditionalRetry(
      operation,
      options,
      (error: Error, attempt: number) => {
        // SQLite特定的重试条件
        const errorCode = (error as any).code || '';
        const errorMessage = error.message || '';
        
        // 对于SQLITE_BUSY和SQLITE_LOCKED错误，总是重试
        if (errorCode === 'SQLITE_BUSY' || errorCode === 'SQLITE_LOCKED') {
          return true;
        }
        
        // 对于数据库锁定相关的错误消息，也进行重试
        if (errorMessage.includes('database is locked') || 
            errorMessage.includes('database is busy')) {
          return true;
        }
        
        // 对于事务冲突，在前几次尝试时重试
        if (errorMessage.includes('cannot start a transaction') && attempt <= 3) {
          return true;
        }
        
        // 其他情况按照标准重试逻辑
        return this.isRetryableError(error, options.retryableErrors);
      },
      operationName
    );
  }

  /**
   * 批量SQLite操作重试
   */
  async executeBatchSQLiteOperations<T>(
    operations: Array<() => Promise<T>>,
    operationName = 'batch-sqlite-operation',
    customOptions?: Partial<RetryOptions>
  ): Promise<T[]> {
    const results: T[] = [];
    const errors: Error[] = [];
    
    // 串行执行以避免SQLite锁定冲突
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      if (operation) {
        try {
          const result = await this.executeSQLiteOperation(
            operation,
            `${operationName}-${i + 1}`,
            customOptions
          );
          results.push(result);
        } catch (error) {
          errors.push(error as Error);
          console.error(`批量SQLite操作失败 [${i + 1}/${operations.length}]:`, (error as Error).message);
        }
      }
    }
    
    if (errors.length > 0) {
      const successCount = results.length;
      const totalCount = operations.length;
      
      if (successCount === 0) {
        throw new Error(
          `所有批量SQLite操作都失败了。错误: ${errors.map(e => e.message).join(', ')}`
        );
      } else if (errors.length > 0) {
        console.warn(
          `批量SQLite操作部分失败: ${successCount}/${totalCount} 成功。` +
          `失败的操作: ${errors.length}`
        );
      }
    }
    
    return results;
  }
}

// 创建全局重试管理器实例
export const globalRetryManager = new RetryManager();