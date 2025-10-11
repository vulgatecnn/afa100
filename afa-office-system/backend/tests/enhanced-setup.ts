/**
 * 增强的测试环境设置
 * 集成测试环境管理器、超时管理器和增强的测试工具
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createMySQLTestEnvironmentManager, type TestEnvironment } from '../src/utils/mysql-test-environment-manager.js';
import { timeoutManager } from '../src/utils/timeout-manager.js';
import { enhancedDatabaseTestHelper } from '../src/utils/enhanced-database-test-helper.js';
import { enhancedTestDataFactory } from '../src/utils/enhanced-test-data-factory.js';
import { Database } from '../src/utils/database.js';

/**
 * 全局测试环境变量
 */
let globalTestEnvironment: TestEnvironment | null = null;
let testStartTime: number = 0;
let testEnvironmentManager: any = null;

/**
 * 测试环境全局设置
 */
beforeAll(async () => {
  console.log('🚀 初始化增强测试环境...');
  testStartTime = Date.now();

  try {
    // 创建测试环境管理器
    testEnvironmentManager = createMySQLTestEnvironmentManager();
    
    // 创建隔离的测试环境
    globalTestEnvironment = await testEnvironmentManager.createIsolatedEnvironment({
      isolationLevel: 'process',
      cleanupOnExit: true
    });

    // 测试环境已经在createIsolatedEnvironment中设置了数据库
    // 不需要额外的setupTestDatabase调用

    // 验证数据库连接
    const isConnected = await enhancedDatabaseTestHelper.verifyDatabaseConnection();
    if (!isConnected) {
      throw new Error('数据库连接验证失败');
    }

    // 设置超时管理器的默认配置
    setupTimeoutConfiguration();

    // 设置性能监控
    setupPerformanceMonitoring();

    console.log(`✅ 增强测试环境初始化完成 (耗时: ${Date.now() - testStartTime}ms)`);
  } catch (error) {
    console.error('❌ 测试环境初始化失败:', error);
    throw error;
  }
});

/**
 * 每个测试前的设置
 */
beforeEach(async (context) => {
  if (!globalTestEnvironment) {
    throw new Error('全局测试环境未初始化');
  }

  const testName = context.task?.name || 'unknown-test';
  console.log(`🔧 准备测试: ${testName}`);

  try {
    // 获取测试锁，防止并发冲突
    const testLock = await testEnvironmentManager.acquireTestLock(testName, 30000);
    
    // 在测试上下文中保存锁引用，以便在测试后释放
    (context as any).testLock = testLock;

    // 开始监控测试执行
    const executionMetrics = await timeoutManager.monitorTestExecution(testName);
    (context as any).executionMetrics = executionMetrics;

    // 确保数据库连接正常
    const database = Database.getInstance();
    if (!database.isReady()) {
      // 如果数据库连接未就绪，尝试连接
      await database.connect();
    }

    // 重置测试数据库（如果需要的话）
    // 测试环境管理器会处理数据库的清理和重置

    // 创建测试数据快照（用于调试）
    await enhancedDatabaseTestHelper.createTestSnapshot(`before-${testName}`);

    // 执行数据一致性检查
    await enhancedDatabaseTestHelper.performDataConsistencyCheck();

    console.log(`✅ 测试准备完成: ${testName}`);
  } catch (error) {
    console.error(`❌ 测试准备失败: ${testName}`, error);
    
    // 生成诊断报告
    const diagnosticReport = await enhancedDatabaseTestHelper.generateDiagnosticReport(testName, error as Error);
    enhancedDatabaseTestHelper.printDiagnosticReport(diagnosticReport);
    
    throw error;
  }
});

/**
 * 每个测试后的清理
 */
afterEach(async (context) => {
  const testName = context.task?.name || 'unknown-test';
  const testLock = (context as any).testLock;
  const executionMetrics = (context as any).executionMetrics;

  console.log(`🧹 清理测试: ${testName}`);

  try {
    // 完成测试执行监控
    if (executionMetrics) {
      const finalMetrics = timeoutManager.completeTestExecution(
        testName, 
        context.task?.result?.state === 'pass' ? 'completed' : 'failed'
      );
      
      if (finalMetrics && finalMetrics.duration && finalMetrics.duration > 5000) {
        console.warn(`⚠️ 测试执行时间较长: ${testName} (${finalMetrics.duration}ms)`);
      }
    }

    // 生成测试诊断报告
    const hasError = context.task?.result?.state === 'fail';
    const error = hasError ? new Error(context.task?.result?.errors?.[0]?.message || '测试失败') : undefined;
    
    const diagnosticReport = await enhancedDatabaseTestHelper.generateDiagnosticReport(testName, error);
    
    // 如果测试失败，打印详细诊断信息
    if (hasError) {
      console.error(`❌ 测试失败: ${testName}`);
      enhancedDatabaseTestHelper.printDiagnosticReport(diagnosticReport);
      
      // 创建失败时的数据快照
      await enhancedDatabaseTestHelper.createTestSnapshot(`failed-${testName}`);
    }

    // 清理测试数据
    await enhancedTestDataFactory.cleanupTestData();

    // 释放测试锁
    if (testLock) {
      await testLock.release();
    }

    console.log(`✅ 测试清理完成: ${testName}`);
  } catch (error) {
    console.error(`❌ 测试清理失败: ${testName}`, error);
    
    // 强制释放锁
    if (testLock) {
      try {
        await testLock.release();
      } catch (lockError) {
        console.error('强制释放锁失败:', lockError);
      }
    }
  }
});

/**
 * 全局清理
 */
afterAll(async () => {
  console.log('🧹 清理增强测试环境...');

  try {
    // 生成测试报告摘要
    const reportSummary = enhancedDatabaseTestHelper.generateTestReportSummary();
    printTestReportSummary(reportSummary);

    // 清理测试数据和重置状态
    await enhancedDatabaseTestHelper.cleanupAndReset();

    // 清理超时管理器
    timeoutManager.cleanupAll();

    // 清理测试环境管理器
    await testEnvironmentManager.cleanupAll();

    const totalDuration = Date.now() - testStartTime;
    console.log(`✅ 增强测试环境清理完成 (总耗时: ${totalDuration}ms)`);
  } catch (error) {
    console.error('❌ 测试环境清理失败:', error);
  }
});

/**
 * 设置超时配置
 */
function setupTimeoutConfiguration(): void {
  // 根据测试类型设置不同的超时时间
  timeoutManager.setTestTimeout('unit-test', 5000, { warningThreshold: 0.8 });
  timeoutManager.setTestTimeout('integration-test', 10000, { warningThreshold: 0.8 });
  timeoutManager.setTestTimeout('database-test', 15000, { warningThreshold: 0.8 });
  timeoutManager.setTestTimeout('api-test', 10000, { warningThreshold: 0.8 });
  timeoutManager.setTestTimeout('performance-test', 60000, { warningThreshold: 0.9 });

  // 设置超时预警回调
  timeoutManager.onTimeoutWarning((warning) => {
    console.warn(`⚠️ 测试超时预警: ${warning.testName} (${warning.elapsed}ms / ${warning.timeout}ms)`);
  });

  // 设置超时处理回调
  timeoutManager.onTestTimeout((metrics) => {
    console.error(`⏰ 测试超时: ${metrics.testName} (${metrics.duration}ms)`);
    
    // 可以在这里添加超时时的特殊处理逻辑
    if (metrics.warnings.length > 0) {
      console.error('超时前的警告:', metrics.warnings);
    }
  });

  console.log('⏰ 超时管理器配置完成');
}

/**
 * 设置性能监控
 */
function setupPerformanceMonitoring(): void {
  // 设置慢查询阈值
  enhancedDatabaseTestHelper.setSlowQueryThreshold(100);

  // 定期输出性能指标
  const performanceInterval = setInterval(() => {
    const metrics = enhancedDatabaseTestHelper.getPerformanceMetrics();
    if (metrics.queryCount > 0) {
      console.log(`📊 性能指标 - 查询: ${metrics.queryCount}, 平均耗时: ${metrics.averageQueryTime.toFixed(2)}ms, 慢查询: ${metrics.slowQueries.length}`);
    }
  }, 30000); // 每30秒输出一次

  // 在测试结束时清理定时器
  process.on('exit', () => {
    clearInterval(performanceInterval);
  });

  console.log('📊 性能监控已启用');
}

/**
 * 打印测试报告摘要
 */
function printTestReportSummary(summary: any): void {
  console.log('\n📋 测试报告摘要');
  console.log('='.repeat(60));
  console.log(`总测试数: ${summary.totalTests}`);
  console.log(`通过: ${summary.passedTests} ✅`);
  console.log(`失败: ${summary.failedTests} ❌`);
  console.log(`跳过: ${summary.skippedTests} ⏭️`);
  console.log(`总耗时: ${summary.totalDuration.toFixed(2)}ms`);
  console.log(`平均耗时: ${summary.averageDuration.toFixed(2)}ms`);

  if (summary.slowestTests.length > 0) {
    console.log('\n🐌 最慢的测试:');
    summary.slowestTests.forEach((test: any, index: number) => {
      console.log(`  ${index + 1}. ${test.testName}: ${test.duration.toFixed(2)}ms`);
    });
  }

  if (Object.keys(summary.failureReasons).length > 0) {
    console.log('\n❌ 失败原因统计:');
    Object.entries(summary.failureReasons).forEach(([reason, count]) => {
      console.log(`  ${reason}: ${count}`);
    });
  }

  console.log('\n⚡ 性能指标:');
  console.log(`  数据库查询: ${summary.performanceMetrics.queryCount}`);
  console.log(`  平均查询时间: ${summary.performanceMetrics.averageQueryTime.toFixed(2)}ms`);
  console.log(`  慢查询数量: ${summary.performanceMetrics.slowQueries.length}`);
  console.log(`  内存使用: ${(summary.performanceMetrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);

  console.log('='.repeat(60));
}

/**
 * 导出测试工具，供测试文件使用
 */
export {
  testEnvironmentManager,
  timeoutManager,
  enhancedDatabaseTestHelper,
  enhancedTestDataFactory,
  globalTestEnvironment
};

/**
 * 便捷的测试工具函数
 */
export const testUtils = {
  /**
   * 创建测试数据
   */
  async createTestData(type: string, options: any = {}) {
    switch (type) {
      case 'merchants':
        return await enhancedTestDataFactory.createMerchants(options);
      case 'users':
        return await enhancedTestDataFactory.createUsers(options);
      case 'projects':
        return await enhancedTestDataFactory.createProjects(options);
      case 'applications':
        return await enhancedTestDataFactory.createVisitorApplications(options);
      case 'complete-scenario':
        return await enhancedTestDataFactory.createCompleteScenario(options);
      default:
        throw new Error(`不支持的测试数据类型: ${type}`);
    }
  },

  /**
   * 执行监控查询
   */
  async query(sql: string, params: any[] = []) {
    return await enhancedDatabaseTestHelper.executeMonitoredQuery(sql, params);
  },

  /**
   * 获取测试锁
   */
  async acquireLock(testName: string, timeout = 30000) {
    return await testEnvironmentManager.acquireTestLock(testName, timeout);
  },

  /**
   * 创建数据快照
   */
  async snapshot(name: string) {
    return await enhancedDatabaseTestHelper.createTestSnapshot(name);
  },

  /**
   * 恢复数据快照
   */
  async restore(name: string) {
    return await enhancedDatabaseTestHelper.restoreTestSnapshot(name);
  }
};