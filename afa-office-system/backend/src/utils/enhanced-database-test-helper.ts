/**
 * 增强的数据库测试辅助工具
 * 提供更多便捷方法、性能监控和详细诊断信息
 */

import database from './database.js';
import { enhancedTestDataFactory } from './enhanced-test-data-factory.js';
import { timeoutManager } from './timeout-manager.js';
import { testEnvironmentManager } from './test-environment-manager.js';

export interface DatabasePerformanceMetrics {
  queryCount: number;
  totalQueryTime: number;
  averageQueryTime: number;
  slowQueries: SlowQuery[];
  connectionCount: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: Date;
}

export interface SlowQuery {
  sql: string;
  params: any[];
  duration: number;
  timestamp: Date;
  stackTrace?: string;
}

export interface TestDiagnosticInfo {
  testName: string;
  timestamp: Date;
  databaseState: {
    isConnected: boolean;
    tableCount: Record<string, number>;
    foreignKeysEnabled: boolean;
    journalMode: string;
    synchronous: string;
  };
  performanceMetrics: DatabasePerformanceMetrics;
  memoryUsage: NodeJS.MemoryUsage;
  errorDetails?: {
    error: Error;
    context: Record<string, any>;
    suggestions: string[];
  };
}

export interface TestReportSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalDuration: number;
  averageDuration: number;
  performanceMetrics: DatabasePerformanceMetrics;
  slowestTests: Array<{ testName: string; duration: number }>;
  failureReasons: Record<string, number>;
}

/**
 * 增强的数据库测试辅助类
 */
export class EnhancedDatabaseTestHelper {
  private static instance: EnhancedDatabaseTestHelper;
  private performanceMetrics: DatabasePerformanceMetrics;
  private slowQueries: SlowQuery[] = [];
  private queryStartTimes = new Map<string, number>();
  private testReports = new Map<string, TestDiagnosticInfo>();
  private slowQueryThreshold = 100; // 100ms

  private constructor() {
    this.performanceMetrics = this.initializeMetrics();
    this.setupQueryMonitoring();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): EnhancedDatabaseTestHelper {
    if (!EnhancedDatabaseTestHelper.instance) {
      EnhancedDatabaseTestHelper.instance = new EnhancedDatabaseTestHelper();
    }
    return EnhancedDatabaseTestHelper.instance;
  }

  /**
   * 设置慢查询阈值
   */
  setSlowQueryThreshold(threshold: number): void {
    this.slowQueryThreshold = threshold;
    console.log(`🐌 设置慢查询阈值: ${threshold}ms`);
  }

  /**
   * 验证数据库连接和状态
   */
  async verifyDatabaseConnection(): Promise<boolean> {
    try {
      const startTime = Date.now();
      
      // 基本连接测试
      const result = await database.get('SELECT 1 as test');
      const connectionTime = Date.now() - startTime;
      
      if (result?.test !== 1) {
        console.error('❌ 数据库连接验证失败: 查询结果异常');
        return false;
      }

      // 检查外键约束
      const fkCheck = await database.get('PRAGMA foreign_keys');
      if (!fkCheck || fkCheck.foreign_keys !== 1) {
        console.warn('⚠️ 外键约束未启用');
      }

      // 检查日志模式
      const journalMode = await database.get('PRAGMA journal_mode');
      console.log(`📝 数据库日志模式: ${journalMode?.journal_mode}`);

      console.log(`✅ 数据库连接验证成功 (耗时: ${connectionTime}ms)`);
      return true;
    } catch (error) {
      console.error('❌ 数据库连接验证失败:', error);
      return false;
    }
  }

  /**
   * 获取详细的数据库状态
   */
  async getDatabaseState(): Promise<TestDiagnosticInfo['databaseState']> {
    const tableCount: Record<string, number> = {};
    const tables = [
      'projects', 'merchants', 'users', 'visitor_applications',
      'access_records', 'passcodes', 'venues', 'floors'
    ];

    // 获取表记录数量
    for (const table of tables) {
      try {
        const result = await database.get(`SELECT COUNT(*) as count FROM ${table}`);
        tableCount[table] = result?.count || 0;
      } catch (error) {
        tableCount[table] = -1; // 表不存在或查询失败
      }
    }

    // 获取数据库配置
    const foreignKeysResult = await database.get('PRAGMA foreign_keys');
    const journalModeResult = await database.get('PRAGMA journal_mode');
    const synchronousResult = await database.get('PRAGMA synchronous');

    return {
      isConnected: database.isReady(),
      tableCount,
      foreignKeysEnabled: foreignKeysResult?.foreign_keys === 1,
      journalMode: journalModeResult?.journal_mode || 'unknown',
      synchronous: synchronousResult?.synchronous?.toString() || 'unknown'
    };
  }

  /**
   * 执行性能监控的查询
   */
  async executeMonitoredQuery<T = any>(
    sql: string,
    params: any[] = [],
    testName?: string
  ): Promise<T> {
    const queryId = `${Date.now()}-${Math.random()}`;
    const startTime = Date.now();
    
    this.queryStartTimes.set(queryId, startTime);
    this.performanceMetrics.queryCount++;

    try {
      let result: T;
      
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        result = await database.get(sql, params) as T;
      } else {
        result = await database.run(sql, params) as T;
      }

      const duration = Date.now() - startTime;
      this.performanceMetrics.totalQueryTime += duration;
      this.performanceMetrics.averageQueryTime = 
        this.performanceMetrics.totalQueryTime / this.performanceMetrics.queryCount;

      // 记录慢查询
      if (duration > this.slowQueryThreshold) {
        const slowQuery: SlowQuery = {
          sql,
          params,
          duration,
          timestamp: new Date(),
          stackTrace: testName ? new Error().stack : undefined
        };
        
        this.slowQueries.push(slowQuery);
        this.performanceMetrics.slowQueries = this.slowQueries.slice(-10); // 保留最近10个
        
        console.warn(`🐌 慢查询检测: ${duration}ms - ${sql.substring(0, 50)}...`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ 查询执行失败 (耗时: ${duration}ms):`, sql, error);
      throw error;
    } finally {
      this.queryStartTimes.delete(queryId);
    }
  }

  /**
   * 批量执行查询
   */
  async executeBatchQueries(queries: Array<{ sql: string; params?: any[] }>): Promise<any[]> {
    const results: any[] = [];
    const startTime = Date.now();

    console.log(`🔄 开始批量执行查询: ${queries.length} 条`);

    for (let i = 0; i < queries.length; i++) {
      const { sql, params = [] } = queries[i];
      try {
        const result = await this.executeMonitoredQuery(sql, params, `batch-${i}`);
        results.push(result);
      } catch (error) {
        console.error(`批量查询第${i + 1}条失败:`, sql, error);
        results.push({ error: error as Error });
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`✅ 批量查询完成: ${totalDuration}ms`);

    return results;
  }

  /**
   * 创建测试数据快照
   */
  async createTestSnapshot(snapshotName: string): Promise<void> {
    console.log(`📸 创建测试数据快照: ${snapshotName}`);
    await enhancedTestDataFactory.createDataSnapshot(snapshotName);
  }

  /**
   * 恢复测试数据快照
   */
  async restoreTestSnapshot(snapshotName: string): Promise<void> {
    console.log(`🔄 恢复测试数据快照: ${snapshotName}`);
    await enhancedTestDataFactory.restoreDataSnapshot(snapshotName);
  }

  /**
   * 执行数据一致性检查
   */
  async performDataConsistencyCheck(): Promise<void> {
    console.log('🔍 执行数据一致性检查...');
    const checks = await enhancedTestDataFactory.performConsistencyCheck();
    
    if (checks.length > 0) {
      console.warn(`⚠️ 发现 ${checks.length} 个数据一致性问题:`);
      checks.forEach(check => {
        console.warn(`  - ${check.tableName}.${check.field}: 期望 ${check.expectedValue}, 实际 ${check.actualValue}`);
      });
    } else {
      console.log('✅ 数据一致性检查通过');
    }
  }

  /**
   * 生成测试诊断报告
   */
  async generateDiagnosticReport(testName: string, error?: Error): Promise<TestDiagnosticInfo> {
    const timestamp = new Date();
    const databaseState = await this.getDatabaseState();
    const memoryUsage = process.memoryUsage();

    // 更新性能指标
    this.performanceMetrics.memoryUsage = memoryUsage;
    this.performanceMetrics.timestamp = timestamp;

    const diagnosticInfo: TestDiagnosticInfo = {
      testName,
      timestamp,
      databaseState,
      performanceMetrics: { ...this.performanceMetrics },
      memoryUsage
    };

    // 如果有错误，添加错误详情和建议
    if (error) {
      const suggestions = this.generateErrorSuggestions(error, databaseState);
      diagnosticInfo.errorDetails = {
        error,
        context: {
          databaseState,
          performanceMetrics: this.performanceMetrics,
          recentSlowQueries: this.slowQueries.slice(-3)
        },
        suggestions
      };
    }

    // 保存报告
    this.testReports.set(testName, diagnosticInfo);

    return diagnosticInfo;
  }

  /**
   * 打印诊断报告
   */
  printDiagnosticReport(report: TestDiagnosticInfo): void {
    console.log('\n📊 测试诊断报告');
    console.log('='.repeat(50));
    console.log(`测试名称: ${report.testName}`);
    console.log(`时间戳: ${report.timestamp.toISOString()}`);
    
    console.log('\n🗄️ 数据库状态:');
    console.log(`  连接状态: ${report.databaseState.isConnected ? '✅' : '❌'}`);
    console.log(`  外键约束: ${report.databaseState.foreignKeysEnabled ? '✅' : '❌'}`);
    console.log(`  日志模式: ${report.databaseState.journalMode}`);
    console.log(`  同步模式: ${report.databaseState.synchronous}`);
    
    console.log('\n📊 表记录数量:');
    Object.entries(report.databaseState.tableCount).forEach(([table, count]) => {
      const status = count === -1 ? '❌' : count === 0 ? '⚪' : '✅';
      console.log(`  ${table}: ${status} ${count === -1 ? '不存在' : count}`);
    });

    console.log('\n⚡ 性能指标:');
    console.log(`  查询总数: ${report.performanceMetrics.queryCount}`);
    console.log(`  平均查询时间: ${report.performanceMetrics.averageQueryTime.toFixed(2)}ms`);
    console.log(`  慢查询数量: ${report.performanceMetrics.slowQueries.length}`);

    console.log('\n💾 内存使用:');
    console.log(`  堆内存: ${(report.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  RSS: ${(report.memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`);

    if (report.errorDetails) {
      console.log('\n❌ 错误详情:');
      console.log(`  错误类型: ${report.errorDetails.error.constructor.name}`);
      console.log(`  错误消息: ${report.errorDetails.error.message}`);
      
      if (report.errorDetails.suggestions.length > 0) {
        console.log('\n💡 建议解决方案:');
        report.errorDetails.suggestions.forEach((suggestion, index) => {
          console.log(`  ${index + 1}. ${suggestion}`);
        });
      }
    }

    console.log('='.repeat(50));
  }

  /**
   * 生成测试报告摘要
   */
  generateTestReportSummary(): TestReportSummary {
    const reports = Array.from(this.testReports.values());
    const totalTests = reports.length;
    const failedTests = reports.filter(r => r.errorDetails).length;
    const passedTests = totalTests - failedTests;

    // 计算持续时间（这里简化处理，实际应该从测试框架获取）
    const totalDuration = this.performanceMetrics.totalQueryTime;
    const averageDuration = totalTests > 0 ? totalDuration / totalTests : 0;

    // 获取最慢的测试
    const slowestTests = reports
      .map(r => ({
        testName: r.testName,
        duration: r.performanceMetrics.totalQueryTime
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);

    // 统计失败原因
    const failureReasons: Record<string, number> = {};
    reports.forEach(r => {
      if (r.errorDetails) {
        const errorType = r.errorDetails.error.constructor.name;
        failureReasons[errorType] = (failureReasons[errorType] || 0) + 1;
      }
    });

    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests: 0, // 简化处理
      totalDuration,
      averageDuration,
      performanceMetrics: { ...this.performanceMetrics },
      slowestTests,
      failureReasons
    };
  }

  /**
   * 清理测试数据和重置状态
   */
  async cleanupAndReset(): Promise<void> {
    console.log('🧹 清理测试数据和重置状态...');

    // 清理测试数据
    await enhancedTestDataFactory.cleanupTestData();

    // 重置性能指标
    this.performanceMetrics = this.initializeMetrics();
    this.slowQueries.length = 0;
    this.queryStartTimes.clear();
    this.testReports.clear();

    console.log('✅ 清理和重置完成');
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): DatabasePerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * 获取慢查询列表
   */
  getSlowQueries(): SlowQuery[] {
    return [...this.slowQueries];
  }

  /**
   * 初始化性能指标
   */
  private initializeMetrics(): DatabasePerformanceMetrics {
    return {
      queryCount: 0,
      totalQueryTime: 0,
      averageQueryTime: 0,
      slowQueries: [],
      connectionCount: 1,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date()
    };
  }

  /**
   * 设置查询监控
   */
  private setupQueryMonitoring(): void {
    // 这里可以扩展为更复杂的查询监控逻辑
    console.log('🔍 查询监控已启用');
  }

  /**
   * 生成错误建议
   */
  private generateErrorSuggestions(error: Error, databaseState: any): string[] {
    const suggestions: string[] = [];
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('sqlite_busy') || errorMessage.includes('sqlite_locked')) {
      suggestions.push('数据库被锁定，建议检查是否有未关闭的事务或连接');
      suggestions.push('考虑增加数据库连接超时时间');
      suggestions.push('检查是否有长时间运行的查询阻塞了数据库');
    }

    if (errorMessage.includes('foreign key constraint')) {
      suggestions.push('外键约束违反，检查相关表的数据完整性');
      suggestions.push('确保在插入数据前相关的父记录已存在');
    }

    if (errorMessage.includes('unique constraint')) {
      suggestions.push('唯一约束违反，检查是否有重复的数据');
      suggestions.push('考虑在测试前清理相关数据');
    }

    if (errorMessage.includes('no such table')) {
      suggestions.push('表不存在，检查数据库初始化是否正确执行');
      suggestions.push('确保测试数据库结构已正确创建');
    }

    if (!databaseState.isConnected) {
      suggestions.push('数据库连接已断开，尝试重新连接');
      suggestions.push('检查数据库文件是否存在且可访问');
    }

    if (this.slowQueries.length > 5) {
      suggestions.push('检测到多个慢查询，考虑优化查询性能');
      suggestions.push('检查是否需要添加数据库索引');
    }

    if (suggestions.length === 0) {
      suggestions.push('检查错误堆栈信息以获取更多详情');
      suggestions.push('尝试重新运行测试以确认问题是否持续存在');
    }

    return suggestions;
  }
}

// 导出单例实例
export const enhancedDatabaseTestHelper = EnhancedDatabaseTestHelper.getInstance();

export default enhancedDatabaseTestHelper;