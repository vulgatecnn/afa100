import * as mysql from 'mysql2/promise';
import { getCurrentDbConfig, getPoolConfig, getPerformanceConfig, validateDatabaseConfig } from '../config/database.config.js';
import type { DatabaseResult } from '../types/index.js';
import { MySQLConnectionPool, type PoolConfig, type PooledConnection, type PoolStats, type HealthStatus } from './mysql-connection-pool.js';
import { RetryManager, type RetryStats } from './retry-manager.js';
import { TransactionManagerFactory, type TransactionOptions, type TransactionStats } from './transaction-manager.js';

// 查询参数类型
type QueryParams = (string | number | null | undefined)[];

// 事务查询接口
interface TransactionQuery {
  sql: string;
  params?: QueryParams;
}

// 数据库事务执行器接口
export interface DatabaseTransactionExecutor {
  run(sql: string, params?: QueryParams): Promise<DatabaseResult>;
  get<T = any>(sql: string, params?: QueryParams): Promise<T | undefined>;
  all<T = any>(sql: string, params?: QueryParams): Promise<T[]>;
}

// 重试配置接口
export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

// 性能指标接口
export interface PerformanceMetrics {
  database: {
    connectionCount: number;
    activeConnections: number;
    queryCount: number;
    slowQueries: Array<{
      sql: string;
      duration: number;
      timestamp: string;
    }>;
    averageQueryTime: number;
  };
  pool: PoolStats;
}

class Database {
  private static instance: Database | null = null;
  private connectionPool: MySQLConnectionPool | null = null;
  private isInitialized = false;
  private queryCount = 0;
  private slowQueries: Array<{ sql: string; duration: number; timestamp: string }> = [];
  private queryTimes: number[] = [];
  private retryManager: RetryManager;
  
  // 默认重试配置
  private defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    retryableErrors: ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ER_LOCK_WAIT_TIMEOUT'],
  };

  constructor() {
    this.retryManager = new RetryManager();
    this.setupRetryEventListeners();
  }

  /**
   * 获取数据库单例实例
   */
  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * 初始化数据库连接池
   */
  async connect(poolConfig?: Partial<PoolConfig>): Promise<void> {
    if (this.isInitialized) {
      console.log('数据库连接池已初始化');
      return;
    }

    console.log('🔄 初始化数据库连接池...');
    
    // 获取配置
    const dbConfig = getCurrentDbConfig();
    const defaultPoolConfig = getPoolConfig();
    const finalPoolConfig = { ...defaultPoolConfig, ...poolConfig };
    
    // 验证配置
    const configErrors = validateDatabaseConfig(dbConfig);
    if (configErrors.length > 0) {
      throw new Error(`数据库配置错误: ${configErrors.join(', ')}`);
    }
    
    // 创建MySQL连接池
    this.connectionPool = new MySQLConnectionPool(finalPoolConfig);
    
    // 监听连接池事件
    this.setupPoolEventListeners();
    
    // 初始化连接池
    await this.connectionPool.initialize();
    
    this.isInitialized = true;
    console.log('✅ 数据库连接池初始化完成');
    console.log(`📊 连接池配置: 最小${finalPoolConfig.min}个, 最大${finalPoolConfig.max}个连接`);
  }

  /**
   * 设置连接池事件监听器
   */
  private setupPoolEventListeners(): void {
    if (!this.connectionPool) return;

    this.connectionPool.on('error', (error) => {
      console.error('连接池错误:', error.message);
    });

    this.connectionPool.on('pool-full', () => {
      console.warn('⚠️ 连接池已满，请求进入等待队列');
    });

    this.connectionPool.on('connection-created', (connection) => {
      console.log(`➕ 新连接已创建: ${connection.id}`);
    });

    this.connectionPool.on('connection-destroyed', (connectionId) => {
      console.log(`➖ 连接已销毁: ${connectionId}`);
    });
  }

  /**
   * 设置重试事件监听器
   */
  private setupRetryEventListeners(): void {
    this.retryManager.onRetry((event) => {
      console.warn(
        `🔄 数据库重试事件: ${event.operation} ` +
        `(第${event.attempt}/${event.maxAttempts}次尝试) - ${event.error.message}`
      );
    });
  }



  /**
   * 关闭数据库连接池
   */
  async close(): Promise<void> {
    if (this.connectionPool) {
      await this.connectionPool.destroy();
      this.connectionPool = null;
    }
    this.isInitialized = false;
    console.log('📴 数据库连接池已关闭');
  }

  /**
   * 执行返回多行的查询
   */
  async all<T = any>(sql: string, params: QueryParams = []): Promise<T[]> {
    return this.retryManager.executeSQLiteOperation(
      () => this.executeWithConnection(async (connection) => {
        const startTime = Date.now();
        
        try {
          const [rows] = await connection.connection.execute(sql, params);
          const duration = Date.now() - startTime;
          this.recordQueryMetrics(sql, duration);

          if (process.env.NODE_ENV === 'development' && duration > 1000) {
            console.warn('慢查询检测:', {
              sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
              duration: `${duration}ms`,
              rowCount: (rows as any[]).length,
              connectionId: connection.id,
            });
          }
          
          return rows as T[];
        } catch (err) {
          const duration = Date.now() - startTime;
          this.recordQueryMetrics(sql, duration);
          
          console.error('MySQL查询执行失败:', {
            sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
            params,
            error: (err as Error).message,
            errorCode: (err as any).code,
            duration: `${duration}ms`,
            connectionId: connection.id,
          });
          throw this.handleDatabaseError(err);
        }
      }),
      `all-query-${sql.substring(0, 50).replace(/\s+/g, '-')}`
    );
  }

  /**
   * 执行返回单行的查询
   */
  async get<T = any>(sql: string, params: QueryParams = []): Promise<T | undefined> {
    return this.retryManager.executeSQLiteOperation(
      () => this.executeWithConnection(async (connection) => {
        const startTime = Date.now();
        
        try {
          const [rows] = await connection.connection.execute(sql, params);
          const duration = Date.now() - startTime;
          this.recordQueryMetrics(sql, duration);

          if (process.env.NODE_ENV === 'development' && duration > 1000) {
            console.warn('慢查询检测:', {
              sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
              duration: `${duration}ms`,
              connectionId: connection.id,
            });
          }
          
          const results = rows as T[];
          return results.length > 0 ? results[0] : undefined;
        } catch (err) {
          const duration = Date.now() - startTime;
          this.recordQueryMetrics(sql, duration);
          
          console.error('MySQL查询执行失败:', {
            sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
            params,
            error: (err as Error).message,
            errorCode: (err as any).code,
            duration: `${duration}ms`,
            connectionId: connection.id,
          });
          throw this.handleDatabaseError(err);
        }
      }),
      `get-query-${sql.substring(0, 50).replace(/\s+/g, '-')}`
    );
  }

  /**
   * 执行修改数据的查询 (INSERT, UPDATE, DELETE)
   */
  async run(sql: string, params: QueryParams = []): Promise<DatabaseResult> {
    return this.retryManager.executeSQLiteOperation(
      () => this.executeWithConnection(async (connection) => {
        const startTime = Date.now();
        
        try {
          const [result] = await connection.connection.execute(sql, params);
          const duration = Date.now() - startTime;
          this.recordQueryMetrics(sql, duration);

          if (process.env.NODE_ENV === 'development' && duration > 1000) {
            console.warn('慢查询检测:', {
              sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
              duration: `${duration}ms`,
              changes: (result as any).affectedRows,
              connectionId: connection.id,
            });
          }
          
          const mysqlResult = result as mysql.ResultSetHeader;
          return {
            lastID: mysqlResult.insertId || 0,
            changes: mysqlResult.affectedRows || 0,
          };
        } catch (err) {
          const duration = Date.now() - startTime;
          this.recordQueryMetrics(sql, duration);
          
          console.error('MySQL执行失败:', {
            sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
            params,
            error: (err as Error).message,
            errorCode: (err as any).code,
            duration: `${duration}ms`,
            connectionId: connection.id,
          });
          throw this.handleDatabaseError(err);
        }
      }),
      `run-query-${sql.substring(0, 50).replace(/\s+/g, '-')}`
    );
  }

  /**
   * 在事务中执行多个查询
   */
  async transaction(queries: TransactionQuery[]): Promise<DatabaseResult[]> {
    return this.executeWithConnection(async (connection) => {
      const mysqlConnection = connection.connection;
      
      try {
        await mysqlConnection.beginTransaction();
        
        const results: DatabaseResult[] = [];
        
        for (let i = 0; i < queries.length; i++) {
          const { sql, params = [] } = queries[i];
          
          try {
            const [result] = await mysqlConnection.execute(sql, params);
            const mysqlResult = result as mysql.ResultSetHeader;
            
            results[i] = {
              lastID: mysqlResult.insertId || 0,
              changes: mysqlResult.affectedRows || 0,
            };
          } catch (error) {
            await mysqlConnection.rollback();
            throw this.handleDatabaseError(error);
          }
        }
        
        await mysqlConnection.commit();
        return results;
      } catch (error) {
        try {
          await mysqlConnection.rollback();
        } catch (rollbackError) {
          console.error('MySQL事务回滚失败:', rollbackError);
        }
        throw error;
      }
    });
  }

  /**
   * 在事务中执行回调函数
   */
  async withTransaction<T>(
    callback: (executor: DatabaseTransactionExecutor) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    return this.executeWithConnection(async (connection) => {
      const transactionManager = TransactionManagerFactory.create(connection, options);
      
      try {
        await transactionManager.begin();
        const executor = transactionManager.createExecutor();
        const result = await callback(executor);
        await transactionManager.commit();
        return result;
      } catch (error) {
        await transactionManager.rollback((error as Error).message);
        throw error;
      }
    });
  }

  /**
   * 创建嵌套事务
   */
  async withNestedTransaction<T>(
    _parentExecutor: DatabaseTransactionExecutor,
    _callback: (executor: DatabaseTransactionExecutor) => Promise<T>,
    _options?: TransactionOptions
  ): Promise<T> {
    // 这里需要从parentExecutor中获取连接，简化实现
    // 实际实现中需要更复杂的连接管理
    throw new Error('嵌套事务功能需要进一步实现');
  }

  /**
   * 获取活跃事务统计
   */
  getActiveTransactions(): TransactionStats[] {
    return TransactionManagerFactory.getActiveTransactions();
  }

  /**
   * 获取事务统计信息
   */
  getTransactionStats() {
    return TransactionManagerFactory.getTransactionStats();
  }

  /**
   * 使用连接池执行数据库操作
   */
  private async executeWithConnection<T>(operation: (connection: PooledConnection) => Promise<T>): Promise<T> {
    if (!this.isReady()) {
      throw new Error('数据库连接池未初始化');
    }

    const connection = await this.connectionPool!.acquire();
    try {
      return await operation(connection);
    } finally {
      await this.connectionPool!.release(connection);
    }
  }

  /**
   * 检查数据库连接池是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized && this.connectionPool !== null;
  }

  /**
   * 处理MySQL数据库错误
   */
  private handleDatabaseError(err: any): Error {
    const errorCode = err.code || 'UNKNOWN';
    const errorMessage = err.message || '';
    const sqlState = err.sqlState || '';
    
    // MySQL特定错误处理
    switch (errorCode) {
      case 'ER_DUP_ENTRY':
        return new Error('数据已存在，违反唯一性约束');
      case 'ER_NO_REFERENCED_ROW_2':
      case 'ER_ROW_IS_REFERENCED_2':
        return new Error('外键约束违反');
      case 'ER_BAD_NULL_ERROR':
        return new Error('必填字段不能为空');
      case 'ER_CHECK_CONSTRAINT_VIOLATED':
        return new Error('数据不符合检查约束');
      case 'ER_LOCK_WAIT_TIMEOUT':
        return new Error(`MySQL锁等待超时，请稍后重试 (${errorCode})`);
      case 'ER_LOCK_DEADLOCK':
        return new Error(`MySQL死锁检测，事务已回滚 (${errorCode})`);
      case 'ECONNRESET':
        return new Error('MySQL连接被重置');
      case 'ECONNREFUSED':
        return new Error('MySQL连接被拒绝，请检查服务器状态');
      case 'ETIMEDOUT':
        return new Error('MySQL连接超时');
      case 'ER_ACCESS_DENIED_ERROR':
        return new Error('MySQL访问被拒绝，请检查用户名和密码');
      case 'ER_BAD_DB_ERROR':
        return new Error('MySQL数据库不存在');
      case 'ER_NO_SUCH_TABLE':
        return new Error('MySQL表不存在');
      case 'ER_BAD_FIELD_ERROR':
        return new Error('MySQL列不存在');
      case 'ER_PARSE_ERROR':
        return new Error('MySQL SQL语法错误');
      case 'ER_TOO_MANY_CONNECTIONS':
        return new Error('MySQL连接数过多');
      case 'ER_OUT_OF_RESOURCES':
        return new Error('MySQL资源不足');
      case 'ER_DISK_FULL':
        return new Error('MySQL磁盘空间不足');
      case 'ER_TABLE_EXISTS_ERROR':
        return new Error('MySQL表已存在');
      case 'ER_UNKNOWN_TABLE':
        return new Error('MySQL未知表');
      default:
        // 检查SQL状态码
        if (sqlState.startsWith('23')) {
          return new Error(`MySQL完整性约束违反: ${errorMessage}`);
        }
        if (sqlState.startsWith('42')) {
          return new Error(`MySQL语法错误或访问违规: ${errorMessage}`);
        }
        if (sqlState.startsWith('08')) {
          return new Error(`MySQL连接异常: ${errorMessage}`);
        }
        
        // 检查错误消息中的特定模式
        if (errorMessage.includes('Connection lost')) {
          return new Error(`MySQL连接丢失: ${errorMessage}`);
        }
        if (errorMessage.includes('Too many connections')) {
          return new Error(`MySQL连接数过多: ${errorMessage}`);
        }
        if (errorMessage.includes('Deadlock found')) {
          return new Error(`MySQL死锁: ${errorMessage}`);
        }
        if (errorMessage.includes('Lock wait timeout')) {
          return new Error(`MySQL锁等待超时: ${errorMessage}`);
        }
        
        // 保留原始错误信息，但添加错误码
        const enhancedError = new Error(`${errorMessage} (${errorCode})`);
        (enhancedError as any).code = errorCode;
        (enhancedError as any).sqlState = sqlState;
        (enhancedError as any).originalError = err;
        return enhancedError;
    }
  }

  /**
   * 执行带重试的查询（向后兼容方法）
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options?: Partial<RetryOptions>
  ): Promise<T> {
    const retryOptions = { ...this.defaultRetryOptions, ...options };
    return this.retryManager.executeWithRetry(operation, retryOptions, 'legacy-operation');
  }

  /**
   * 批量执行带重试的操作
   */
  async executeMultipleWithRetry<T>(
    operations: Array<() => Promise<T>>,
    options?: Partial<RetryOptions>
  ): Promise<T[]> {
    return this.retryManager.executeBatchSQLiteOperations(operations, 'batch-database-operation', options);
  }

  /**
   * 批量执行SQL语句
   */
  async executeBatch(queries: Array<{ sql: string; params?: QueryParams }>): Promise<DatabaseResult[]> {
    const operations = queries.map(query => () => this.run(query.sql, query.params));
    const results = await this.executeMultipleWithRetry(operations);
    return results;
  }

  /**
   * 条件重试执行
   */
  async executeWithConditionalRetry<T>(
    operation: () => Promise<T>,
    retryCondition: (error: Error, attempt: number) => boolean,
    options?: Partial<RetryOptions>
  ): Promise<T> {
    const retryOptions = { ...this.defaultRetryOptions, ...options };
    return this.retryManager.executeWithConditionalRetry(
      operation,
      retryOptions,
      retryCondition,
      'conditional-database-operation'
    );
  }

  /**
   * 获取环境特定的重试选项
   */
  private getEnvironmentRetryOptions(): RetryOptions {
    const env = process.env.NODE_ENV || 'development';
    
    switch (env) {
      case 'test':
        return RetryManager.createTestRetryOptions();
      case 'production':
        return RetryManager.createProductionRetryOptions();
      default:
        return RetryManager.createSQLiteRetryOptions();
    }
  }



  /**
   * 延时函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 确保读写一致性的查询方法
   * 在测试环境中，确保写入操作后能立即读取到数据
   */
  async getWithConsistency<T = any>(sql: string, params: QueryParams = [], maxRetries: number = 3): Promise<T | undefined> {
    const isTestEnv = process.env.NODE_ENV === 'test';
    
    if (!isTestEnv) {
      return this.get<T>(sql, params);
    }

    // 测试环境中使用重试机制确保一致性
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.get<T>(sql, params);
      
      // 如果获取到了结果（包括null）或者已经尝试了最大次数，则返回结果
      // 只有当result === undefined时才继续重试
      if (result !== undefined || attempt === maxRetries) {
        return result;
      }
      
      // 短暂等待后重试
      await this.sleep(5 * attempt);
    }
    
    return undefined;
  }

  /**
   * 获取连接池统计信息
   */
  getPoolStats(): PoolStats | null {
    return this.connectionPool?.getStats() || null;
  }

  /**
   * 获取重试统计信息
   */
  getRetryStats(): RetryStats {
    return this.retryManager.getStats();
  }

  /**
   * 重置重试统计信息
   */
  resetRetryStats(): void {
    this.retryManager.resetStats();
  }

  /**
   * 获取性能指标
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics & { retry: RetryStats }> {
    if (!this.isReady()) {
      throw new Error('数据库连接池未初始化');
    }

    const poolStats = this.connectionPool!.getStats();
    const retryStats = this.retryManager.getStats();
    const averageQueryTime = this.queryTimes.length > 0 
      ? this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length 
      : 0;

    return {
      database: {
        connectionCount: poolStats.totalConnections,
        activeConnections: poolStats.activeConnections,
        queryCount: this.queryCount,
        slowQueries: [...this.slowQueries],
        averageQueryTime,
      },
      pool: poolStats,
      retry: retryStats,
    };
  }

  /**
   * 记录查询指标
   */
  private recordQueryMetrics(sql: string, duration: number): void {
    this.queryCount++;
    this.queryTimes.push(duration);
    
    // 保持最近1000次查询的记录
    if (this.queryTimes.length > 1000) {
      this.queryTimes.shift();
    }

    // 获取性能配置
    const perfConfig = getPerformanceConfig();
    
    // 记录慢查询
    if (duration > perfConfig.slowQueryThreshold) {
      this.slowQueries.push({
        sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
        duration,
        timestamp: new Date().toISOString(),
      });
      
      // 保持最近100个慢查询记录
      if (this.slowQueries.length > 100) {
        this.slowQueries.shift();
      }

      // 在开发环境中输出慢查询警告
      if (perfConfig.enableQueryLogging) {
        console.warn(`🐌 慢查询检测: ${duration}ms > ${perfConfig.slowQueryThreshold}ms`, {
          sql: sql.substring(0, 100),
          duration,
        });
      }
    }
    
    // 检查是否需要触发性能告警
    this.checkPerformanceThresholds(duration);
  }

  /**
   * 检查性能阈值并触发告警
   */
  private checkPerformanceThresholds(queryDuration: number): void {
    const perfConfig = getPerformanceConfig();
    const isTestEnv = process.env.NODE_ENV === 'test';
    
    // 检查单个查询是否超过最大时间
    if (queryDuration > perfConfig.maxQueryTime) {
      console.error(`⚠️ 查询超时告警: ${queryDuration}ms > ${perfConfig.maxQueryTime}ms`);
      // 这里可以添加告警通知逻辑
    }
    
    // 检查平均查询时间是否过高
    if (this.queryTimes.length >= 10) {
      const recentAverage = this.queryTimes.slice(-10).reduce((a, b) => a + b, 0) / 10;
      if (recentAverage > perfConfig.slowQueryThreshold * 2) {
        console.warn(`⚠️ 平均查询时间过高: ${recentAverage.toFixed(2)}ms`);
      }
    }
    
    // 检查连接池使用率（测试环境中放宽阈值）
    const poolStats = this.getPoolStats();
    if (poolStats) {
      const utilization = poolStats.activeConnections / poolStats.totalConnections;
      const threshold = isTestEnv ? 0.95 : 0.9; // 测试环境使用更高的阈值
      
      if (utilization > threshold && !isTestEnv) {
        console.warn(`⚠️ 连接池使用率过高: ${(utilization * 100).toFixed(1)}%`);
      }
    }
  }

  /**
   * 检测查询是否超时
   */
  private checkQueryTimeout(duration: number): void {
    const perfConfig = getPerformanceConfig();
    
    if (duration > perfConfig.maxQueryTime) {
      console.error(`⏰ 查询超时: ${duration}ms > ${perfConfig.maxQueryTime}ms`);
      // 可以在这里添加告警逻辑
    }
  }

  /**
   * 获取慢查询报告
   */
  getSlowQueryReport(): Array<{ sql: string; duration: number; timestamp: string; count: number }> {
    const queryMap = new Map<string, { duration: number; timestamp: string; count: number }>();
    
    this.slowQueries.forEach(query => {
      const key = query.sql;
      if (queryMap.has(key)) {
        const existing = queryMap.get(key)!;
        existing.count++;
        existing.duration = Math.max(existing.duration, query.duration);
      } else {
        queryMap.set(key, {
          duration: query.duration,
          timestamp: query.timestamp,
          count: 1,
        });
      }
    });

    return Array.from(queryMap.entries()).map(([sql, data]) => ({
      sql,
      ...data,
    })).sort((a, b) => b.duration - a.duration);
  }

  /**
   * 清理性能指标
   */
  clearPerformanceMetrics(): void {
    this.queryCount = 0;
    this.queryTimes = [];
    this.slowQueries = [];
    console.log('🧹 性能指标已清理');
  }

  /**
   * 获取MySQL数据库统计信息
   */
  async getDatabaseStats(): Promise<any> {
    if (!this.isReady()) {
      throw new Error('数据库连接池未初始化');
    }

    try {
      const stats = await Promise.all([
        this.get('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = DATABASE()'),
        this.get('SELECT SUM(data_length + index_length) as total_size FROM information_schema.tables WHERE table_schema = DATABASE()'),
        this.get('SELECT SUM(data_length) as data_size FROM information_schema.tables WHERE table_schema = DATABASE()'),
        this.get('SELECT SUM(index_length) as index_size FROM information_schema.tables WHERE table_schema = DATABASE()'),
        this.get('SHOW STATUS LIKE "Threads_connected"'),
        this.get('SHOW STATUS LIKE "Uptime"'),
      ]);

      return {
        tableCount: stats[0]?.table_count || 0,
        totalSize: stats[1]?.total_size || 0,
        dataSize: stats[2]?.data_size || 0,
        indexSize: stats[3]?.index_size || 0,
        threadsConnected: stats[4]?.Value || 0,
        uptime: stats[5]?.Value || 0,
        estimatedSize: stats[1]?.total_size || 0,
      };
    } catch (error) {
      console.error('获取MySQL数据库统计信息失败:', error);
      return {
        tableCount: 0,
        totalSize: 0,
        dataSize: 0,
        indexSize: 0,
        threadsConnected: 0,
        uptime: 0,
        estimatedSize: 0,
      };
    }
  }

  /**
   * 数据库健康检查
   */
  async healthCheck(): Promise<HealthStatus> {
    try {
      if (!this.isReady()) {
        return {
          status: 'unhealthy',
          details: {
            poolStats: {
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
            },
            connectionTests: [],
            timestamp: new Date().toISOString(),
          },
        };
      }

      // 使用连接池的健康检查
      const poolHealth = await this.connectionPool!.healthCheck();
      
      // 执行简单查询测试
      try {
        const startTime = Date.now();
        await this.get('SELECT 1 as test');
        const queryTime = Date.now() - startTime;
        
        return {
          ...poolHealth,
          details: {
            ...poolHealth.details,
            queryTest: {
              success: true,
              responseTime: queryTime,
            },
          },
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          details: {
            ...poolHealth.details,
            queryTest: {
              success: false,
              error: (error as Error).message,
            },
          },
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          poolStats: this.getPoolStats() || {
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
          },
          connectionTests: [],
          timestamp: new Date().toISOString(),
          error: (error as Error).message,
        },
      };
    }
  }

  /**
   * 获取详细的性能分析报告
   */
  async getPerformanceAnalysis(): Promise<{
    summary: {
      totalQueries: number;
      averageQueryTime: number;
      slowQueryCount: number;
      errorRate: number;
      connectionUtilization: number;
    };
    recommendations: string[];
    trends: {
      queryTimesTrend: 'improving' | 'stable' | 'degrading';
      connectionUsageTrend: 'low' | 'normal' | 'high';
    };
  }> {
    const poolStats = this.getPoolStats();
    const retryStats = this.getRetryStats();
    const averageQueryTime = this.queryTimes.length > 0 
      ? this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length 
      : 0;
    
    const errorRate = this.queryCount > 0 ? retryStats.failedRetries / this.queryCount : 0;
    const connectionUtilization = poolStats 
      ? poolStats.activeConnections / poolStats.totalConnections 
      : 0;
    
    const recommendations: string[] = [];
    
    // 生成性能建议
    if (averageQueryTime > 1000) {
      recommendations.push('平均查询时间过长，建议优化查询语句或添加索引');
    }
    
    if (this.slowQueries.length > 10) {
      recommendations.push('慢查询较多，建议检查数据库设计和查询优化');
    }
    
    if (connectionUtilization > 0.8) {
      recommendations.push('连接池使用率过高，建议增加连接池大小');
    } else if (connectionUtilization < 0.2) {
      recommendations.push('连接池使用率过低，可以考虑减少连接池大小');
    }
    
    if (errorRate > 0.05) {
      recommendations.push('错误率较高，建议检查数据库稳定性和重试配置');
    }
    
    if (retryStats.successfulRetries > retryStats.totalAttempts * 0.1) {
      recommendations.push('重试次数较多，建议检查数据库锁定和并发问题');
    }
    
    // 分析趋势
    const recentQueryTimes = this.queryTimes.slice(-100);
    const olderQueryTimes = this.queryTimes.slice(-200, -100);
    
    let queryTimesTrend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (recentQueryTimes.length > 0 && olderQueryTimes.length > 0) {
      const recentAvg = recentQueryTimes.reduce((a, b) => a + b, 0) / recentQueryTimes.length;
      const olderAvg = olderQueryTimes.reduce((a, b) => a + b, 0) / olderQueryTimes.length;
      
      if (recentAvg < olderAvg * 0.9) {
        queryTimesTrend = 'improving';
      } else if (recentAvg > olderAvg * 1.1) {
        queryTimesTrend = 'degrading';
      }
    }
    
    const connectionUsageTrend = connectionUtilization > 0.7 ? 'high' : 
                                connectionUtilization < 0.3 ? 'low' : 'normal';
    
    return {
      summary: {
        totalQueries: this.queryCount,
        averageQueryTime,
        slowQueryCount: this.slowQueries.length,
        errorRate,
        connectionUtilization,
      },
      recommendations,
      trends: {
        queryTimesTrend,
        connectionUsageTrend,
      },
    };
  }

  /**
   * 执行MySQL数据库维护操作
   */
  async performMaintenance(): Promise<{
    operations: string[];
    results: Array<{ operation: string; success: boolean; message: string }>;
  }> {
    const operations = [
      'ANALYZE TABLE users, merchants, spaces, visitor_applications, passcodes, access_records',
      'OPTIMIZE TABLE users, merchants, spaces, visitor_applications, passcodes, access_records',
      'FLUSH TABLES',
    ];
    const results: Array<{ operation: string; success: boolean; message: string }> = [];
    
    for (const operation of operations) {
      try {
        const startTime = Date.now();
        await this.run(operation);
        const duration = Date.now() - startTime;
        
        results.push({
          operation,
          success: true,
          message: `完成，耗时: ${duration}ms`,
        });
        
        console.log(`✅ MySQL维护操作完成: ${operation} (${duration}ms)`);
      } catch (error) {
        results.push({
          operation,
          success: false,
          message: (error as Error).message,
        });
        
        console.error(`❌ MySQL维护操作失败: ${operation}`, (error as Error).message);
      }
    }
    
    return { operations, results };
  }
}

// 创建单例实例
const database = Database.getInstance();

export default database;
export { Database, type QueryParams, type TransactionQuery };