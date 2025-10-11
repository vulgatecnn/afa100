/**
 * MySQL超时管理器
 * 针对MySQL连接池优化超时处理，提供MySQL特有的超时配置选项
 */

import { MySQLAdapter } from '../../src/adapters/mysql-adapter';

/**
 * MySQL超时配置选项
 */
interface MySQLTimeoutConfig {
  // 连接超时配置
  connectionTimeout: number;        // 连接超时时间 (ms)
  acquireTimeout: number;          // 获取连接超时时间 (ms)
  idleTimeout: number;             // 空闲连接超时时间 (ms)
  
  // 查询超时配置
  queryTimeout: number;            // 单个查询超时时间 (ms)
  transactionTimeout: number;      // 事务超时时间 (ms)
  longQueryTimeout: number;        // 长查询超时时间 (ms)
  
  // 测试特定超时配置
  testSetupTimeout: number;        // 测试环境设置超时时间 (ms)
  testCleanupTimeout: number;      // 测试清理超时时间 (ms)
  bulkOperationTimeout: number;    // 批量操作超时时间 (ms)
  
  // 重试配置
  maxRetries: number;              // 最大重试次数
  retryDelay: number;              // 重试延迟时间 (ms)
  backoffMultiplier: number;       // 退避乘数
  
  // 监控配置
  enableTimeoutLogging: boolean;   // 启用超时日志
  timeoutWarningThreshold: number; // 超时警告阈值 (ms)
}

/**
 * 超时操作类型
 */
enum TimeoutOperationType {
  CONNECTION = 'connection',
  QUERY = 'query',
  TRANSACTION = 'transaction',
  BULK_OPERATION = 'bulk_operation',
  TEST_SETUP = 'test_setup',
  TEST_CLEANUP = 'test_cleanup'
}

/**
 * 超时统计信息
 */
interface TimeoutStats {
  totalOperations: number;
  timeoutCount: number;
  averageExecutionTime: number;
  maxExecutionTime: number;
  minExecutionTime: number;
  timeoutsByType: Record<TimeoutOperationType, number>;
  lastResetTime: string;
}

/**
 * 操作执行结果
 */
interface OperationResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  executionTime: number;
  timedOut: boolean;
  retryCount: number;
}

/**
 * MySQL超时管理器类
 */
export class MySQLTimeoutManager {
  private adapter: MySQLAdapter;
  private config: MySQLTimeoutConfig;
  private stats: TimeoutStats;
  private activeOperations: Map<string, { startTime: number; type: TimeoutOperationType; timeoutId: NodeJS.Timeout }>;

  constructor(adapter: MySQLAdapter, config?: Partial<MySQLTimeoutConfig>) {
    this.adapter = adapter;
    this.config = this.mergeWithDefaults(config || {});
    this.stats = this.initializeStats();
    this.activeOperations = new Map();
  }

  /**
   * 合并默认配置
   */
  private mergeWithDefaults(userConfig: Partial<MySQLTimeoutConfig>): MySQLTimeoutConfig {
    const defaults: MySQLTimeoutConfig = {
      // 连接超时配置 (MySQL推荐值)
      connectionTimeout: 60000,      // 60秒
      acquireTimeout: 60000,         // 60秒
      idleTimeout: 300000,           // 5分钟
      
      // 查询超时配置
      queryTimeout: 30000,           // 30秒
      transactionTimeout: 120000,    // 2分钟
      longQueryTimeout: 300000,      // 5分钟
      
      // 测试特定超时配置
      testSetupTimeout: 180000,      // 3分钟
      testCleanupTimeout: 120000,    // 2分钟
      bulkOperationTimeout: 600000,  // 10分钟
      
      // 重试配置
      maxRetries: 3,
      retryDelay: 1000,              // 1秒
      backoffMultiplier: 2,
      
      // 监控配置
      enableTimeoutLogging: true,
      timeoutWarningThreshold: 5000  // 5秒
    };

    return { ...defaults, ...userConfig };
  }

  /**
   * 初始化统计信息
   */
  private initializeStats(): TimeoutStats {
    return {
      totalOperations: 0,
      timeoutCount: 0,
      averageExecutionTime: 0,
      maxExecutionTime: 0,
      minExecutionTime: Infinity,
      timeoutsByType: {
        [TimeoutOperationType.CONNECTION]: 0,
        [TimeoutOperationType.QUERY]: 0,
        [TimeoutOperationType.TRANSACTION]: 0,
        [TimeoutOperationType.BULK_OPERATION]: 0,
        [TimeoutOperationType.TEST_SETUP]: 0,
        [TimeoutOperationType.TEST_CLEANUP]: 0
      },
      lastResetTime: new Date().toISOString()
    };
  }

  /**
   * 执行带超时控制的操作
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    operationType: TimeoutOperationType,
    customTimeout?: number
  ): Promise<OperationResult<T>> {
    const operationId = this.generateOperationId();
    const timeout = customTimeout || this.getTimeoutForOperation(operationType);
    const startTime = Date.now();
    
    let retryCount = 0;
    let lastError: Error | undefined;

    while (retryCount <= this.config.maxRetries) {
      try {
        // 注册活跃操作
        this.registerActiveOperation(operationId, operationType, timeout);

        // 创建超时Promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error(`MySQL操作超时 (${timeout}ms): ${operationType}`));
          }, timeout);
          
          // 更新超时ID以便后续清理
          const activeOp = this.activeOperations.get(operationId);
          if (activeOp) {
            activeOp.timeoutId = timeoutId;
          }
        });

        // 执行操作
        const result = await Promise.race([
          operation(),
          timeoutPromise
        ]);

        // 操作成功
        const executionTime = Date.now() - startTime;
        this.unregisterActiveOperation(operationId);
        this.updateStats(operationType, executionTime, false);

        if (this.config.enableTimeoutLogging && executionTime > this.config.timeoutWarningThreshold) {
          console.warn(`⚠️ MySQL操作执行时间较长 (${executionTime}ms): ${operationType}`);
        }

        return {
          success: true,
          result,
          executionTime,
          timedOut: false,
          retryCount
        };

      } catch (error) {
        const executionTime = Date.now() - startTime;
        this.unregisterActiveOperation(operationId);
        lastError = error as Error;

        // 检查是否为超时错误
        const isTimeout = lastError.message.includes('超时') || lastError.message.includes('timeout');
        
        if (isTimeout) {
          this.updateStats(operationType, executionTime, true);
          
          if (this.config.enableTimeoutLogging) {
            console.error(`⏰ MySQL操作超时 (${executionTime}ms): ${operationType}, 重试次数: ${retryCount}`);
          }
        }

        // 如果不是超时错误或已达到最大重试次数，直接返回失败
        if (!isTimeout || retryCount >= this.config.maxRetries) {
          return {
            success: false,
            error: lastError,
            executionTime,
            timedOut: isTimeout,
            retryCount
          };
        }

        // 准备重试
        retryCount++;
        const delay = this.config.retryDelay * Math.pow(this.config.backoffMultiplier, retryCount - 1);
        
        if (this.config.enableTimeoutLogging) {
          console.log(`🔄 MySQL操作重试 ${retryCount}/${this.config.maxRetries}, 延迟 ${delay}ms`);
        }
        
        await this.sleep(delay);
      }
    }

    // 所有重试都失败了
    return {
      success: false,
      error: lastError || new Error('未知错误'),
      executionTime: Date.now() - startTime,
      timedOut: true,
      retryCount
    };
  }

  /**
   * 执行带超时的MySQL查询
   */
  async executeQuery<T>(sql: string, params: any[] = [], customTimeout?: number): Promise<OperationResult<T[]>> {
    return this.executeWithTimeout(
      () => this.adapter.all<T>(sql, params),
      TimeoutOperationType.QUERY,
      customTimeout
    );
  }

  /**
   * 执行带超时的MySQL单条查询
   */
  async executeGet<T>(sql: string, params: any[] = [], customTimeout?: number): Promise<OperationResult<T | undefined>> {
    return this.executeWithTimeout(
      () => this.adapter.get<T>(sql, params),
      TimeoutOperationType.QUERY,
      customTimeout
    );
  }

  /**
   * 执行带超时的MySQL更新操作
   */
  async executeRun(sql: string, params: any[] = [], customTimeout?: number): Promise<OperationResult<any>> {
    return this.executeWithTimeout(
      () => this.adapter.run(sql, params),
      TimeoutOperationType.QUERY,
      customTimeout
    );
  }

  /**
   * 执行带超时的事务
   */
  async executeTransaction<T>(
    transactionFn: () => Promise<T>,
    customTimeout?: number
  ): Promise<OperationResult<T>> {
    return this.executeWithTimeout(
      async () => {
        const transaction = await this.adapter.beginTransaction();
        try {
          const result = await transactionFn();
          await transaction.commit();
          return result;
        } catch (error) {
          await transaction.rollback();
          throw error;
        }
      },
      TimeoutOperationType.TRANSACTION,
      customTimeout
    );
  }

  /**
   * 执行带超时的批量操作
   */
  async executeBulkOperation<T>(
    bulkFn: () => Promise<T>,
    customTimeout?: number
  ): Promise<OperationResult<T>> {
    return this.executeWithTimeout(
      bulkFn,
      TimeoutOperationType.BULK_OPERATION,
      customTimeout
    );
  }

  /**
   * 执行带超时的测试环境设置
   */
  async executeTestSetup<T>(
    setupFn: () => Promise<T>,
    customTimeout?: number
  ): Promise<OperationResult<T>> {
    return this.executeWithTimeout(
      setupFn,
      TimeoutOperationType.TEST_SETUP,
      customTimeout
    );
  }

  /**
   * 执行带超时的测试清理
   */
  async executeTestCleanup<T>(
    cleanupFn: () => Promise<T>,
    customTimeout?: number
  ): Promise<OperationResult<T>> {
    return this.executeWithTimeout(
      cleanupFn,
      TimeoutOperationType.TEST_CLEANUP,
      customTimeout
    );
  }

  /**
   * 检查MySQL连接状态（带超时）
   */
  async checkConnectionWithTimeout(): Promise<OperationResult<boolean>> {
    return this.executeWithTimeout(
      () => this.adapter.ping(),
      TimeoutOperationType.CONNECTION,
      this.config.connectionTimeout
    );
  }

  /**
   * 获取操作类型对应的超时时间
   */
  private getTimeoutForOperation(operationType: TimeoutOperationType): number {
    switch (operationType) {
      case TimeoutOperationType.CONNECTION:
        return this.config.connectionTimeout;
      case TimeoutOperationType.QUERY:
        return this.config.queryTimeout;
      case TimeoutOperationType.TRANSACTION:
        return this.config.transactionTimeout;
      case TimeoutOperationType.BULK_OPERATION:
        return this.config.bulkOperationTimeout;
      case TimeoutOperationType.TEST_SETUP:
        return this.config.testSetupTimeout;
      case TimeoutOperationType.TEST_CLEANUP:
        return this.config.testCleanupTimeout;
      default:
        return this.config.queryTimeout;
    }
  }

  /**
   * 生成操作ID
   */
  private generateOperationId(): string {
    return `mysql_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 注册活跃操作
   */
  private registerActiveOperation(operationId: string, type: TimeoutOperationType, timeout: number): void {
    this.activeOperations.set(operationId, {
      startTime: Date.now(),
      type,
      timeoutId: setTimeout(() => {}, timeout) // 占位符，实际的会在executeWithTimeout中设置
    });
  }

  /**
   * 注销活跃操作
   */
  private unregisterActiveOperation(operationId: string): void {
    const operation = this.activeOperations.get(operationId);
    if (operation) {
      clearTimeout(operation.timeoutId);
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(operationType: TimeoutOperationType, executionTime: number, timedOut: boolean): void {
    this.stats.totalOperations++;
    
    if (timedOut) {
      this.stats.timeoutCount++;
      this.stats.timeoutsByType[operationType]++;
    }

    // 更新执行时间统计
    const totalTime = this.stats.averageExecutionTime * (this.stats.totalOperations - 1) + executionTime;
    this.stats.averageExecutionTime = totalTime / this.stats.totalOperations;
    
    if (executionTime > this.stats.maxExecutionTime) {
      this.stats.maxExecutionTime = executionTime;
    }
    
    if (executionTime < this.stats.minExecutionTime) {
      this.stats.minExecutionTime = executionTime;
    }
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取超时统计信息
   */
  getTimeoutStats(): TimeoutStats {
    return { ...this.stats };
  }

  /**
   * 获取活跃操作信息
   */
  getActiveOperations(): Array<{ id: string; type: TimeoutOperationType; duration: number }> {
    const now = Date.now();
    return Array.from(this.activeOperations.entries()).map(([id, operation]) => ({
      id,
      type: operation.type,
      duration: now - operation.startTime
    }));
  }

  /**
   * 取消所有活跃操作
   */
  cancelAllActiveOperations(): void {
    for (const [operationId, operation] of this.activeOperations.entries()) {
      clearTimeout(operation.timeoutId);
      console.warn(`⚠️ 取消活跃的MySQL操作: ${operationId} (${operation.type})`);
    }
    this.activeOperations.clear();
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = this.initializeStats();
    console.log('📊 MySQL超时管理器统计信息已重置');
  }

  /**
   * 更新超时配置
   */
  updateConfig(newConfig: Partial<MySQLTimeoutConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ MySQL超时管理器配置已更新');
  }

  /**
   * 获取当前配置
   */
  getConfig(): MySQLTimeoutConfig {
    return { ...this.config };
  }

  /**
   * 生成超时报告
   */
  generateTimeoutReport(): string {
    const stats = this.getTimeoutStats();
    const activeOps = this.getActiveOperations();
    
    const report = {
      summary: {
        totalOperations: stats.totalOperations,
        timeoutCount: stats.timeoutCount,
        timeoutRate: stats.totalOperations > 0 ? (stats.timeoutCount / stats.totalOperations * 100).toFixed(2) + '%' : '0%',
        averageExecutionTime: Math.round(stats.averageExecutionTime) + 'ms',
        maxExecutionTime: stats.maxExecutionTime + 'ms',
        minExecutionTime: stats.minExecutionTime === Infinity ? '0ms' : stats.minExecutionTime + 'ms'
      },
      timeoutsByType: stats.timeoutsByType,
      activeOperations: activeOps.length,
      activeOperationDetails: activeOps,
      config: this.config,
      generatedAt: new Date().toISOString()
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * 执行超时管理器健康检查
   */
  async performHealthCheck(): Promise<{ healthy: boolean; issues: string[]; recommendations: string[] }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const stats = this.getTimeoutStats();
    const activeOps = this.getActiveOperations();

    // 检查超时率
    const timeoutRate = stats.totalOperations > 0 ? (stats.timeoutCount / stats.totalOperations) : 0;
    if (timeoutRate > 0.1) { // 超过10%的超时率
      issues.push(`超时率过高: ${(timeoutRate * 100).toFixed(2)}%`);
      recommendations.push('检查MySQL服务器性能和网络连接');
      recommendations.push('考虑增加超时时间或优化查询');
    }

    // 检查活跃操作
    const longRunningOps = activeOps.filter(op => op.duration > this.config.timeoutWarningThreshold);
    if (longRunningOps.length > 0) {
      issues.push(`发现 ${longRunningOps.length} 个长时间运行的操作`);
      recommendations.push('检查是否存在慢查询或死锁');
    }

    // 检查平均执行时间
    if (stats.averageExecutionTime > this.config.timeoutWarningThreshold) {
      issues.push(`平均执行时间过长: ${Math.round(stats.averageExecutionTime)}ms`);
      recommendations.push('优化数据库查询和索引');
    }

    // 检查连接状态
    try {
      const connectionResult = await this.checkConnectionWithTimeout();
      if (!connectionResult.success) {
        issues.push('MySQL连接检查失败');
        recommendations.push('检查MySQL服务状态和连接配置');
      }
    } catch (error) {
      issues.push('无法执行连接健康检查');
      recommendations.push('检查MySQL超时管理器配置');
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.cancelAllActiveOperations();
    console.log('🧹 MySQL超时管理器资源清理完成');
  }
}

/**
 * 便捷的工厂函数
 */
export function createMySQLTimeoutManager(adapter: MySQLAdapter, config?: Partial<MySQLTimeoutConfig>): MySQLTimeoutManager {
  return new MySQLTimeoutManager(adapter, config);
}

export { TimeoutOperationType, type MySQLTimeoutConfig, type TimeoutStats, type OperationResult };
export default MySQLTimeoutManager;