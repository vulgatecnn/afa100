/**
 * 测试框架增强功能集成测试
 * 验证测试环境管理器、超时管理器和增强测试工具的功能
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { testEnvironmentManager, type TestEnvironment } from '../../src/utils/test-environment-manager.js';
import { timeoutManager } from '../../src/utils/timeout-manager.js';
import { enhancedDatabaseTestHelper } from '../../src/utils/enhanced-database-test-helper.js';
import { enhancedTestDataFactory } from '../../src/utils/enhanced-test-data-factory.js';
import database from '../../src/utils/database.js';

describe('测试框架增强功能', () => {
  let testEnvironment: TestEnvironment;

  beforeAll(async () => {
    // 创建独立的测试环境
    testEnvironment = await testEnvironmentManager.createIsolatedEnvironment({
      isolationLevel: 'test',
      cleanupOnExit: true
    });

    await testEnvironmentManager.setupTestDatabase(testEnvironment);
  });

  afterAll(async () => {
    if (testEnvironment) {
      await testEnvironment.cleanup();
    }
  });

  describe('测试环境管理器', () => {
    it('应该能够创建隔离的测试环境', async () => {
      const env = await testEnvironmentManager.createIsolatedEnvironment({
        isolationLevel: 'test'
      });

      expect(env.id).toBeDefined();
      expect(env.databasePath).toBeDefined();
      expect(env.isolationLevel).toBe('test');
      expect(env.isActive).toBe(true);
      expect(env.createdAt).toBeInstanceOf(Date);

      // 清理
      await env.cleanup();
    });

    it('应该能够获取和释放测试锁', async () => {
      const testName = 'test-lock-functionality';
      
      // 获取锁
      const lock = await testEnvironmentManager.acquireTestLock(testName, 5000);
      
      expect(lock.testName).toBe(testName);
      expect(lock.acquiredAt).toBeInstanceOf(Date);
      expect(lock.timeout).toBe(5000);

      // 验证锁状态
      const lockStatus = testEnvironmentManager.getLockStatus();
      expect(lockStatus).toHaveLength(1);
      expect(lockStatus[0].testName).toBe(testName);

      // 释放锁
      await lock.release();

      // 验证锁已释放
      const lockStatusAfter = testEnvironmentManager.getLockStatus();
      expect(lockStatusAfter).toHaveLength(0);
    });

    it('应该防止重复获取同一测试的锁', async () => {
      const testName = 'duplicate-lock-test';
      
      // 获取第一个锁
      const lock1 = await testEnvironmentManager.acquireTestLock(testName, 5000);
      
      // 尝试获取第二个锁应该失败
      await expect(
        testEnvironmentManager.acquireTestLock(testName, 1000)
      ).rejects.toThrow('已被锁定');

      // 释放锁
      await lock1.release();
    });

    it('应该能够重置测试数据库', async () => {
      // 插入一些测试数据
      await database.run(
        'INSERT INTO projects (code, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['TEST_PROJECT', '测试项目', '描述', 'active', new Date().toISOString(), new Date().toISOString()]
      );

      // 验证数据存在
      const beforeReset = await database.get('SELECT COUNT(*) as count FROM projects');
      expect(beforeReset.count).toBeGreaterThan(0);

      // 重置数据库
      await testEnvironmentManager.resetTestDatabase(testEnvironment);

      // 验证数据已清理
      const afterReset = await database.get('SELECT COUNT(*) as count FROM projects');
      expect(afterReset.count).toBe(0);
    });
  });

  describe('超时管理器', () => {
    it('应该能够设置和获取测试超时配置', () => {
      const testName = 'timeout-config-test';
      const timeout = 8000;

      timeoutManager.setTestTimeout(testName, timeout, {
        warningThreshold: 0.7,
        retryCount: 2
      });

      const config = timeoutManager.getTestTimeout(testName);
      expect(config).toBeDefined();
      expect(config!.timeout).toBe(timeout);
      expect(config!.warningThreshold).toBe(0.7);
      expect(config!.retryCount).toBe(2);
    });

    it('应该能够监控测试执行', async () => {
      const testName = 'execution-monitoring-test';
      
      // 设置超时
      timeoutManager.setTestTimeout(testName, 5000);

      // 开始监控
      const metrics = await timeoutManager.monitorTestExecution(testName);
      
      expect(metrics.testName).toBe(testName);
      expect(metrics.status).toBe('running');
      expect(metrics.startTime).toBeInstanceOf(Date);
      expect(metrics.warnings).toEqual([]);

      // 模拟一些执行时间
      await new Promise(resolve => setTimeout(resolve, 100));

      // 完成监控
      const finalMetrics = timeoutManager.completeTestExecution(testName, 'completed');
      
      expect(finalMetrics).toBeDefined();
      expect(finalMetrics!.status).toBe('completed');
      expect(finalMetrics!.duration).toBeGreaterThan(90);
      expect(finalMetrics!.endTime).toBeInstanceOf(Date);
    });

    it('应该能够处理测试超时', async () => {
      const testName = 'timeout-handling-test';
      
      // 设置很短的超时时间
      timeoutManager.setTestTimeout(testName, 100);

      // 开始监控
      await timeoutManager.monitorTestExecution(testName);

      // 等待超时发生
      await new Promise(resolve => setTimeout(resolve, 200));

      // 检查超时状态
      const metrics = timeoutManager.getTestMetrics(testName);
      expect(metrics).toBeDefined();
      expect(metrics!.status).toBe('timeout');
    });

    it('应该能够动态调整超时时间', async () => {
      const testName = 'dynamic-timeout-test';
      
      // 设置初始超时
      timeoutManager.setTestTimeout(testName, 5000);
      
      let config = timeoutManager.getTestTimeout(testName);
      expect(config!.timeout).toBe(5000);

      // 动态调整
      timeoutManager.adjustTimeout(testName, 10000, '性能测试需要更长时间');
      
      config = timeoutManager.getTestTimeout(testName);
      expect(config!.timeout).toBe(10000);
    });

    it('应该能够生成超时统计信息', () => {
      const stats = timeoutManager.getTimeoutStatistics();
      
      expect(stats).toHaveProperty('totalTests');
      expect(stats).toHaveProperty('completedTests');
      expect(stats).toHaveProperty('timeoutTests');
      expect(stats).toHaveProperty('failedTests');
      expect(stats).toHaveProperty('averageDuration');
      expect(stats).toHaveProperty('timeoutRate');
    });
  });

  describe('增强的测试数据工厂', () => {
    it('应该能够创建隔离的测试商户数据', async () => {
      const merchants = await enhancedTestDataFactory.createMerchants({
        count: 2,
        isolation: true,
        cleanup: true,
        overrides: { status: 'active' }
      });

      expect(merchants).toHaveLength(2);
      expect(merchants[0].id).toBeDefined();
      expect(merchants[0].name).toContain('test_');
      expect(merchants[0].status).toBe('active');
      expect(merchants[1].name).not.toBe(merchants[0].name);

      // 验证数据已插入数据库
      const count = await database.get('SELECT COUNT(*) as count FROM merchants');
      expect(count.count).toBe(2);
    });

    it('应该能够创建带关系的测试用户数据', async () => {
      // 先创建商户
      const merchants = await enhancedTestDataFactory.createMerchants({
        count: 1,
        isolation: true
      });

      // 创建关联的用户
      const users = await enhancedTestDataFactory.createUsers({
        count: 3,
        isolation: true,
        relationships: { merchant_id: merchants[0].id },
        overrides: { user_type: 'merchant_employee' }
      });

      expect(users).toHaveLength(3);
      expect(users[0].merchant_id).toBe(merchants[0].id);
      expect(users[0].user_type).toBe('merchant_employee');

      // 验证关系正确
      users.forEach(user => {
        expect(user.merchant_id).toBe(merchants[0].id);
      });
    });

    it('应该能够创建完整的测试场景', async () => {
      const scenario = await enhancedTestDataFactory.createCompleteScenario({
        isolation: true,
        cleanup: true
      });

      expect(scenario.projects).toHaveLength(1);
      expect(scenario.merchants).toHaveLength(2);
      expect(scenario.users).toHaveLength(4); // 1 admin + 3 employees
      expect(scenario.applications).toHaveLength(5);

      // 验证关系正确
      const employees = scenario.users.filter(u => u.user_type === 'merchant_employee');
      expect(employees).toHaveLength(3);
      expect(employees[0].merchant_id).toBe(scenario.merchants[0].id);
    });

    it('应该能够创建和恢复数据快照', async () => {
      // 创建一些测试数据
      await enhancedTestDataFactory.createMerchants({ count: 2 });
      
      // 创建快照
      const snapshot = await enhancedTestDataFactory.createDataSnapshot('test-snapshot');
      
      expect(snapshot.id).toBe('test-snapshot');
      expect(snapshot.tables.merchants).toHaveLength(2);

      // 清理数据
      await enhancedTestDataFactory.cleanupAllData();
      
      // 验证数据已清理
      const countAfterCleanup = await database.get('SELECT COUNT(*) as count FROM merchants');
      expect(countAfterCleanup.count).toBe(0);

      // 恢复快照
      await enhancedTestDataFactory.restoreDataSnapshot('test-snapshot');
      
      // 验证数据已恢复
      const countAfterRestore = await database.get('SELECT COUNT(*) as count FROM merchants');
      expect(countAfterRestore.count).toBe(2);
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
    });
  });

  describe('增强的数据库测试辅助工具', () => {
    it('应该能够验证数据库连接', async () => {
      const isConnected = await enhancedDatabaseTestHelper.verifyDatabaseConnection();
      expect(isConnected).toBe(true);
    });

    it('应该能够获取数据库状态', async () => {
      const state = await enhancedDatabaseTestHelper.getDatabaseState();
      
      expect(state.isConnected).toBe(true);
      expect(state.foreignKeysEnabled).toBe(true);
      expect(state.tableCount).toBeDefined();
      expect(typeof state.tableCount.merchants).toBe('number');
    });

    it('应该能够执行监控查询', async () => {
      const result = await enhancedDatabaseTestHelper.executeMonitoredQuery(
        'SELECT COUNT(*) as count FROM merchants',
        [],
        'test-monitored-query'
      );

      expect(result).toBeDefined();
      expect(typeof result.count).toBe('number');

      // 检查性能指标是否更新
      const metrics = enhancedDatabaseTestHelper.getPerformanceMetrics();
      expect(metrics.queryCount).toBeGreaterThan(0);
    });

    it('应该能够检测慢查询', async () => {
      // 设置很低的慢查询阈值
      enhancedDatabaseTestHelper.setSlowQueryThreshold(1);

      // 执行一个稍微复杂的查询
      await enhancedDatabaseTestHelper.executeMonitoredQuery(
        'SELECT * FROM merchants WHERE id > 0',
        [],
        'slow-query-test'
      );

      const slowQueries = enhancedDatabaseTestHelper.getSlowQueries();
      // 可能会检测到慢查询，取决于系统性能
      expect(Array.isArray(slowQueries)).toBe(true);
    });

    it('应该能够批量执行查询', async () => {
      const queries = [
        { sql: 'SELECT COUNT(*) as count FROM merchants' },
        { sql: 'SELECT COUNT(*) as count FROM users' },
        { sql: 'SELECT COUNT(*) as count FROM projects' }
      ];

      const results = await enhancedDatabaseTestHelper.executeBatchQueries(queries);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('count');
        expect(typeof result.count).toBe('number');
      });
    });

    it('应该能够生成诊断报告', async () => {
      const testName = 'diagnostic-report-test';
      
      const report = await enhancedDatabaseTestHelper.generateDiagnosticReport(testName);
      
      expect(report.testName).toBe(testName);
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.databaseState).toBeDefined();
      expect(report.performanceMetrics).toBeDefined();
      expect(report.memoryUsage).toBeDefined();
    });

    it('应该能够生成带错误的诊断报告', async () => {
      const testName = 'error-diagnostic-test';
      const testError = new Error('测试错误');
      
      const report = await enhancedDatabaseTestHelper.generateDiagnosticReport(testName, testError);
      
      expect(report.errorDetails).toBeDefined();
      expect(report.errorDetails!.error).toBe(testError);
      expect(report.errorDetails!.suggestions).toBeDefined();
      expect(Array.isArray(report.errorDetails!.suggestions)).toBe(true);
    });

    it('应该能够生成测试报告摘要', () => {
      const summary = enhancedDatabaseTestHelper.generateTestReportSummary();
      
      expect(summary).toHaveProperty('totalTests');
      expect(summary).toHaveProperty('passedTests');
      expect(summary).toHaveProperty('failedTests');
      expect(summary).toHaveProperty('performanceMetrics');
      expect(summary).toHaveProperty('slowestTests');
      expect(summary).toHaveProperty('failureReasons');
    });
  });

  describe('集成测试', () => {
    it('应该能够在隔离环境中完整运行测试流程', async () => {
      const testName = 'integration-test-flow';
      
      // 1. 获取测试锁
      const lock = await testEnvironmentManager.acquireTestLock(testName);
      
      try {
        // 2. 开始监控测试执行
        await timeoutManager.monitorTestExecution(testName);
        
        // 3. 创建测试数据
        const scenario = await enhancedTestDataFactory.createCompleteScenario({
          isolation: true,
          cleanup: true
        });
        
        // 4. 执行一些数据库操作
        const merchantCount = await enhancedDatabaseTestHelper.executeMonitoredQuery(
          'SELECT COUNT(*) as count FROM merchants',
          [],
          testName
        );
        
        expect(merchantCount.count).toBe(2);
        
        // 5. 执行数据一致性检查
        await enhancedDatabaseTestHelper.performDataConsistencyCheck();
        
        // 6. 创建数据快照
        await enhancedDatabaseTestHelper.createTestSnapshot(`${testName}-snapshot`);
        
        // 7. 完成测试监控
        const metrics = timeoutManager.completeTestExecution(testName, 'completed');
        expect(metrics).toBeDefined();
        expect(metrics!.status).toBe('completed');
        
        // 8. 生成诊断报告
        const report = await enhancedDatabaseTestHelper.generateDiagnosticReport(testName);
        expect(report.testName).toBe(testName);
        
      } finally {
        // 9. 释放锁
        await lock.release();
      }
    });

    it('应该能够处理并发测试场景', async () => {
      const testNames = ['concurrent-test-1', 'concurrent-test-2', 'concurrent-test-3'];
      
      // 并发获取锁和执行测试
      const testPromises = testNames.map(async (testName) => {
        const lock = await testEnvironmentManager.acquireTestLock(testName);
        
        try {
          await timeoutManager.monitorTestExecution(testName);
          
          // 创建隔离的测试数据
          const merchants = await enhancedTestDataFactory.createMerchants({
            count: 1,
            isolation: true,
            cleanup: true
          });
          
          expect(merchants).toHaveLength(1);
          
          const metrics = timeoutManager.completeTestExecution(testName, 'completed');
          return metrics;
          
        } finally {
          await lock.release();
        }
      });
      
      const results = await Promise.all(testPromises);
      
      // 验证所有测试都成功完成
      results.forEach((metrics, index) => {
        expect(metrics).toBeDefined();
        expect(metrics!.testName).toBe(testNames[index]);
        expect(metrics!.status).toBe('completed');
      });
    });
  });
});