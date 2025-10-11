/**
 * 测试框架改进核心功能集成测试
 * 
 * 专注于核心功能验证：
 * - 测试环境隔离的有效性和性能影响
 * - 测试超时管理在各种场景下的表现
 * - 测试数据管理的正确性和清理效果
 * 
 * 需求覆盖: 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { performance } from 'perf_hooks';
import { testEnvironmentManager, type TestEnvironment } from '../../src/utils/test-environment-manager.js';
import { timeoutManager } from '../../src/utils/timeout-manager.js';
import { enhancedDatabaseTestHelper } from '../../src/utils/enhanced-database-test-helper.js';
import { enhancedTestDataFactory } from '../../src/utils/enhanced-test-data-factory.js';
import database from '../../src/utils/database.js';

describe('测试框架改进核心功能集成测试', () => {
  let testEnvironment: TestEnvironment;

  beforeAll(async () => {
    // 创建基础测试环境
    testEnvironment = await testEnvironmentManager.createIsolatedEnvironment({
      isolationLevel: 'test',
      cleanupOnExit: true
    });
    await testEnvironmentManager.setupTestDatabase(testEnvironment);
    
    console.log('🚀 开始测试框架改进核心功能集成测试');
  });

  afterAll(async () => {
    // 清理基础环境
    if (testEnvironment) {
      await testEnvironment.cleanup();
    }
    
    // 清理所有测试环境和锁
    await testEnvironmentManager.cleanupAll();
    await timeoutManager.cleanupAll();
    await enhancedDatabaseTestHelper.cleanupAndReset();
    
    console.log('✅ 测试框架改进核心功能集成测试完成');
  });

  describe('环境隔离有效性验证', () => {
    it('应该能够创建和管理独立的测试环境', async () => {
      const env1 = await testEnvironmentManager.createIsolatedEnvironment({
        isolationLevel: 'test'
      });
      
      const env2 = await testEnvironmentManager.createIsolatedEnvironment({
        isolationLevel: 'test'
      });

      try {
        // 验证环境独立性
        expect(env1.id).not.toBe(env2.id);
        expect(env1.databasePath).not.toBe(env2.databasePath);
        expect(env1.isActive).toBe(true);
        expect(env2.isActive).toBe(true);

        // 验证环境管理器状态
        const activeEnvironments = testEnvironmentManager.getActiveEnvironments();
        expect(activeEnvironments.length).toBeGreaterThanOrEqual(2);

        console.log('✅ 环境隔离验证通过');

      } finally {
        await env1.cleanup();
        await env2.cleanup();
      }
    });

    it('应该能够正确管理测试锁机制', async () => {
      const testName = 'lock-mechanism-test';
      
      // 获取锁
      const lock = await testEnvironmentManager.acquireTestLock(testName, 5000);
      
      expect(lock.testName).toBe(testName);
      expect(lock.acquiredAt).toBeInstanceOf(Date);

      // 验证锁状态
      const lockStatus = testEnvironmentManager.getLockStatus();
      const currentLock = lockStatus.find(l => l.testName === testName);
      expect(currentLock).toBeDefined();

      // 释放锁
      await lock.release();

      // 验证锁已释放
      const lockStatusAfter = testEnvironmentManager.getLockStatus();
      const releasedLock = lockStatusAfter.find(l => l.testName === testName);
      expect(releasedLock).toBeUndefined();

      console.log('✅ 测试锁机制验证通过');
    });

    it('应该能够测量环境隔离的性能影响', async () => {
      const startTime = performance.now();
      
      // 创建多个环境并测量性能
      const environments = await Promise.all([
        testEnvironmentManager.createIsolatedEnvironment({ isolationLevel: 'test' }),
        testEnvironmentManager.createIsolatedEnvironment({ isolationLevel: 'test' }),
        testEnvironmentManager.createIsolatedEnvironment({ isolationLevel: 'test' })
      ]);

      const creationTime = performance.now() - startTime;

      try {
        // 验证所有环境都创建成功
        expect(environments).toHaveLength(3);
        environments.forEach(env => {
          expect(env.isActive).toBe(true);
          expect(env.id).toBeDefined();
        });

        // 验证性能在合理范围内（3个环境应该在2秒内创建完成）
        expect(creationTime).toBeLessThan(2000);

        console.log(`✅ 环境隔离性能测试通过 - 创建3个环境耗时: ${creationTime.toFixed(2)}ms`);

      } finally {
        await Promise.all(environments.map(env => env.cleanup()));
      }
    });
  });

  describe('超时管理功能验证', () => {
    it('应该能够设置和监控测试超时', async () => {
      const testName = 'timeout-monitoring-test';
      
      // 设置超时配置
      timeoutManager.setTestTimeout(testName, 3000, {
        warningThreshold: 0.8
      });

      // 验证配置
      const config = timeoutManager.getTestTimeout(testName);
      expect(config).toBeDefined();
      expect(config!.timeout).toBe(3000);
      expect(config!.warningThreshold).toBe(0.8);

      // 开始监控
      const metrics = await timeoutManager.monitorTestExecution(testName);
      expect(metrics.testName).toBe(testName);
      expect(metrics.status).toBe('running');

      // 模拟执行时间
      await new Promise(resolve => setTimeout(resolve, 500));

      // 完成监控
      const finalMetrics = timeoutManager.completeTestExecution(testName, 'completed');
      expect(finalMetrics).toBeDefined();
      expect(finalMetrics!.status).toBe('completed');
      expect(finalMetrics!.duration).toBeGreaterThan(400);

      console.log('✅ 超时管理功能验证通过');
    });

    it('应该能够动态调整超时时间', async () => {
      const testName = 'dynamic-timeout-test';
      
      // 设置初始超时
      timeoutManager.setTestTimeout(testName, 2000);
      
      let config = timeoutManager.getTestTimeout(testName);
      expect(config!.timeout).toBe(2000);

      // 动态调整
      timeoutManager.adjustTimeout(testName, 5000, '需要更多时间');
      
      config = timeoutManager.getTestTimeout(testName);
      expect(config!.timeout).toBe(5000);

      console.log('✅ 动态超时调整验证通过');
    });

    it('应该能够生成超时统计信息', () => {
      const stats = timeoutManager.getTimeoutStatistics();
      
      expect(stats).toHaveProperty('totalTests');
      expect(stats).toHaveProperty('completedTests');
      expect(stats).toHaveProperty('timeoutTests');
      expect(stats).toHaveProperty('averageDuration');
      expect(typeof stats.totalTests).toBe('number');
      expect(typeof stats.averageDuration).toBe('number');

      console.log('✅ 超时统计信息验证通过');
    });
  });

  describe('数据管理功能验证', () => {
    it('应该能够创建和管理测试数据', async () => {
      // 创建测试商户
      const merchants = await enhancedTestDataFactory.createMerchants({
        count: 2,
        isolation: true,
        cleanup: true
      });

      expect(merchants).toHaveLength(2);
      expect(merchants[0].id).toBeDefined();
      expect(merchants[0].name).toContain('test_');

      // 验证数据已插入数据库
      const count = await database.get('SELECT COUNT(*) as count FROM merchants');
      expect(count.count).toBe(2);

      // 创建关联的用户数据
      const users = await enhancedTestDataFactory.createUsers({
        count: 3,
        relationships: { merchant_id: merchants[0].id },
        isolation: true,
        cleanup: true
      });

      expect(users).toHaveLength(3);
      users.forEach(user => {
        expect(user.merchant_id).toBe(merchants[0].id);
      });

      console.log('✅ 测试数据创建和管理验证通过');
    });

    it('应该能够执行数据一致性检查', async () => {
      // 创建一些测试数据
      const merchants = await enhancedTestDataFactory.createMerchants({ count: 1 });
      await enhancedTestDataFactory.createUsers({
        count: 2,
        relationships: { merchant_id: merchants[0].id }
      });

      // 执行一致性检查
      const checks = await enhancedTestDataFactory.performConsistencyCheck();
      
      // 应该没有一致性问题
      const invalidChecks = checks.filter(c => !c.isValid);
      expect(invalidChecks).toHaveLength(0);

      console.log('✅ 数据一致性检查验证通过');
    });

    it('应该能够创建和恢复数据快照', async () => {
      // 创建测试数据
      await enhancedTestDataFactory.createMerchants({ count: 1 });
      
      // 创建快照
      const snapshot = await enhancedTestDataFactory.createDataSnapshot('test-snapshot');
      expect(snapshot.id).toBe('test-snapshot');
      expect(snapshot.tables.merchants).toHaveLength(1);

      // 清理数据
      await enhancedTestDataFactory.cleanupAllData();
      
      // 验证数据已清理
      const countAfterCleanup = await database.get('SELECT COUNT(*) as count FROM merchants');
      expect(countAfterCleanup.count).toBe(0);

      // 恢复快照
      await enhancedTestDataFactory.restoreDataSnapshot('test-snapshot');
      
      // 验证数据已恢复
      const countAfterRestore = await database.get('SELECT COUNT(*) as count FROM merchants');
      expect(countAfterRestore.count).toBe(1);

      console.log('✅ 数据快照和恢复验证通过');
    });

    it('应该能够正确清理测试数据', async () => {
      // 创建测试数据
      const merchants = await enhancedTestDataFactory.createMerchants({ 
        count: 3, 
        cleanup: true 
      });
      const users = await enhancedTestDataFactory.createUsers({ 
        count: 5, 
        relationships: { merchant_id: merchants[0].id },
        cleanup: true 
      });

      // 验证数据已创建
      const beforeCleanup = {
        merchants: await database.get('SELECT COUNT(*) as count FROM merchants'),
        users: await database.get('SELECT COUNT(*) as count FROM users')
      };

      expect(beforeCleanup.merchants.count).toBe(3);
      expect(beforeCleanup.users.count).toBe(5);

      // 执行清理
      await enhancedTestDataFactory.cleanupTestData();

      // 验证清理效果
      const afterCleanup = {
        merchants: await database.get('SELECT COUNT(*) as count FROM merchants'),
        users: await database.get('SELECT COUNT(*) as count FROM users')
      };

      expect(afterCleanup.merchants.count).toBe(0);
      expect(afterCleanup.users.count).toBe(0);

      console.log('✅ 数据清理功能验证通过');
    });
  });

  describe('数据库测试辅助工具验证', () => {
    it('应该能够验证数据库连接和状态', async () => {
      const isConnected = await enhancedDatabaseTestHelper.verifyDatabaseConnection();
      expect(isConnected).toBe(true);

      const state = await enhancedDatabaseTestHelper.getDatabaseState();
      expect(state.isConnected).toBe(true);
      expect(state.foreignKeysEnabled).toBe(true);
      expect(state.tableCount).toBeDefined();

      console.log('✅ 数据库连接和状态验证通过');
    });

    it('应该能够执行监控查询和性能分析', async () => {
      // 执行监控查询
      const result = await enhancedDatabaseTestHelper.executeMonitoredQuery(
        'SELECT COUNT(*) as count FROM merchants',
        [],
        'performance-test'
      );

      expect(result).toBeDefined();
      expect(typeof result.count).toBe('number');

      // 检查性能指标
      const metrics = enhancedDatabaseTestHelper.getPerformanceMetrics();
      expect(metrics.queryCount).toBeGreaterThan(0);
      expect(metrics.timestamp).toBeInstanceOf(Date);

      console.log('✅ 监控查询和性能分析验证通过');
    });

    it('应该能够生成诊断报告', async () => {
      const testName = 'diagnostic-test';
      
      const report = await enhancedDatabaseTestHelper.generateDiagnosticReport(testName);
      
      expect(report.testName).toBe(testName);
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.databaseState).toBeDefined();
      expect(report.performanceMetrics).toBeDefined();
      expect(report.memoryUsage).toBeDefined();

      // 测试带错误的诊断报告
      const testError = new Error('测试错误');
      const errorReport = await enhancedDatabaseTestHelper.generateDiagnosticReport(
        'error-test', 
        testError
      );
      
      expect(errorReport.errorDetails).toBeDefined();
      expect(errorReport.errorDetails!.error).toBe(testError);
      expect(Array.isArray(errorReport.errorDetails!.suggestions)).toBe(true);

      console.log('✅ 诊断报告生成验证通过');
    });

    it('应该能够生成测试报告摘要', () => {
      const summary = enhancedDatabaseTestHelper.generateTestReportSummary();
      
      expect(summary).toHaveProperty('totalTests');
      expect(summary).toHaveProperty('passedTests');
      expect(summary).toHaveProperty('failedTests');
      expect(summary).toHaveProperty('performanceMetrics');
      expect(summary).toHaveProperty('slowestTests');
      expect(Array.isArray(summary.slowestTests)).toBe(true);

      console.log('✅ 测试报告摘要生成验证通过');
    });
  });

  describe('综合功能集成验证', () => {
    it('应该能够执行完整的测试框架工作流程', async () => {
      const testName = 'complete-workflow-test';
      const startTime = performance.now();

      console.log('🔄 开始完整工作流程测试...');

      // 1. 环境隔离
      const isolatedEnv = await testEnvironmentManager.createIsolatedEnvironment({
        isolationLevel: 'test'
      });
      await testEnvironmentManager.setupTestDatabase(isolatedEnv);

      // 2. 超时管理
      timeoutManager.setTestTimeout(testName, 10000);
      await timeoutManager.monitorTestExecution(testName);

      // 3. 测试锁
      const testLock = await testEnvironmentManager.acquireTestLock(testName, 8000);

      try {
        // 4. 数据生成
        const merchants = await enhancedTestDataFactory.createMerchants({
          count: 2,
          isolation: true,
          cleanup: true
        });

        const users = await enhancedTestDataFactory.createUsers({
          count: 3,
          relationships: { merchant_id: merchants[0].id },
          isolation: true,
          cleanup: true
        });

        // 5. 数据库操作监控
        const queryResults = await enhancedDatabaseTestHelper.executeBatchQueries([
          { sql: 'SELECT COUNT(*) as merchant_count FROM merchants' },
          { sql: 'SELECT COUNT(*) as user_count FROM users' }
        ]);

        // 6. 数据一致性检查
        const consistencyChecks = await enhancedTestDataFactory.performConsistencyCheck();
        const invalidChecks = consistencyChecks.filter(c => !c.isValid);

        // 7. 性能监控
        const performanceMetrics = enhancedDatabaseTestHelper.getPerformanceMetrics();

        // 8. 诊断报告
        const diagnosticReport = await enhancedDatabaseTestHelper.generateDiagnosticReport(testName);

        // 验证所有步骤都成功
        expect(merchants).toHaveLength(2);
        expect(users).toHaveLength(3);
        expect(queryResults[0].merchant_count).toBe(2);
        expect(queryResults[1].user_count).toBe(3);
        expect(invalidChecks).toHaveLength(0);
        expect(performanceMetrics.queryCount).toBeGreaterThan(0);
        expect(diagnosticReport.testName).toBe(testName);

        const endTime = performance.now();
        const duration = endTime - startTime;

        console.log(`✅ 完整工作流程测试通过 - 耗时: ${duration.toFixed(2)}ms`);

      } finally {
        // 9. 清理资源
        await testLock.release();
        await isolatedEnv.cleanup();
      }

      // 10. 完成监控
      const finalMetrics = timeoutManager.completeTestExecution(testName, 'completed');
      expect(finalMetrics).toBeDefined();
      expect(finalMetrics!.status).toBe('completed');
    });

    it('应该能够处理并发测试场景', async () => {
      const concurrentCount = 3;
      const testNames = Array.from({ length: concurrentCount }, (_, i) => `concurrent-test-${i}`);

      console.log(`🔄 开始并发测试 - ${concurrentCount}个并发任务...`);

      const concurrentTasks = testNames.map(async (testName) => {
        const lock = await testEnvironmentManager.acquireTestLock(testName, 5000);
        
        try {
          await timeoutManager.monitorTestExecution(testName);
          
          // 创建独立的测试数据
          const merchants = await enhancedTestDataFactory.createMerchants({
            count: 1,
            isolation: true,
            cleanup: true
          });

          expect(merchants).toHaveLength(1);
          
          const metrics = timeoutManager.completeTestExecution(testName, 'completed');
          return { testName, success: true, metrics };
          
        } catch (error) {
          return { testName, success: false, error };
        } finally {
          await lock.release();
        }
      });

      const results = await Promise.all(concurrentTasks);

      // 验证所有并发任务都成功
      const successfulTasks = results.filter(r => r.success);
      const failedTasks = results.filter(r => !r.success);

      expect(failedTasks).toHaveLength(0);
      expect(successfulTasks).toHaveLength(concurrentCount);

      console.log(`✅ 并发测试通过 - ${concurrentCount}个任务全部成功`);
    });
  });
});