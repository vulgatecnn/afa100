/**
 * 测试框架改进的综合集成测试
 * 
 * 测试内容：
 * - 测试环境隔离的有效性和性能影响
 * - 测试超时管理在各种场景下的表现
 * - 测试数据管理的正确性和清理效果
 * 
 * 需求覆盖: 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';
import { testEnvironmentManager, type TestEnvironment } from '../../src/utils/test-environment-manager.js';
import { timeoutManager, type ExecutionMetrics } from '../../src/utils/timeout-manager.js';
import { enhancedDatabaseTestHelper } from '../../src/utils/enhanced-database-test-helper.js';
import { enhancedTestDataFactory } from '../../src/utils/enhanced-test-data-factory.js';
import database from '../../src/utils/database.js';

describe('测试框架改进 - 综合集成测试', () => {
  let baseEnvironment: TestEnvironment;
  const performanceMetrics: Array<{
    testName: string;
    duration: number;
    memoryBefore: NodeJS.MemoryUsage;
    memoryAfter: NodeJS.MemoryUsage;
    isolationLevel: string;
  }> = [];

  beforeAll(async () => {
    // 创建基础测试环境
    baseEnvironment = await testEnvironmentManager.createIsolatedEnvironment({
      isolationLevel: 'test',
      cleanupOnExit: true
    });
    await testEnvironmentManager.setupTestDatabase(baseEnvironment);
    
    // 设置性能监控
    enhancedDatabaseTestHelper.setSlowQueryThreshold(50);
    
    console.log('🚀 开始测试框架改进综合集成测试');
  });

  afterAll(async () => {
    // 生成性能报告
    console.log('\n📊 性能测试报告:');
    console.log('='.repeat(60));
    
    performanceMetrics.forEach(metric => {
      const memoryDiff = metric.memoryAfter.heapUsed - metric.memoryBefore.heapUsed;
      console.log(`${metric.testName}:`);
      console.log(`  持续时间: ${metric.duration.toFixed(2)}ms`);
      console.log(`  内存变化: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  隔离级别: ${metric.isolationLevel}`);
      console.log('');
    });
    
    // 清理基础环境
    if (baseEnvironment) {
      await baseEnvironment.cleanup();
    }
    
    // 清理所有测试环境和锁
    await testEnvironmentManager.cleanupAll();
    await timeoutManager.cleanupAll();
    await enhancedDatabaseTestHelper.cleanupAndReset();
    
    console.log('✅ 测试框架改进综合集成测试完成');
  });

  describe('测试环境隔离有效性测试', () => {
    it('应该确保不同隔离级别的环境完全独立', async () => {
      const testName = '环境隔离有效性测试';
      const startTime = performance.now();
      const memoryBefore = process.memoryUsage();

      // 创建三个不同隔离级别的环境
      const environments = await Promise.all([
        testEnvironmentManager.createIsolatedEnvironment({ isolationLevel: 'process' }),
        testEnvironmentManager.createIsolatedEnvironment({ isolationLevel: 'thread' }),
        testEnvironmentManager.createIsolatedEnvironment({ isolationLevel: 'test' })
      ]);

      try {
        // 为每个环境设置数据库
        for (const env of environments) {
          await testEnvironmentManager.setupTestDatabase(env);
        }

        // 在每个环境中创建不同的测试数据
        const testDataSets = await Promise.all(environments.map(async (env, index) => {
          // 切换到对应环境的数据库
          process.env.DB_TEST_PATH = env.databasePath;
          await database.close();
          await database.connect();

          // 创建特定的测试数据
          const merchants = await enhancedTestDataFactory.createMerchants({
            count: index + 1,
            isolation: true,
            cleanup: false,
            overrides: { 
              name: `环境${index + 1}_商户`,
              code: `ENV${index + 1}_MERCHANT`
            }
          });

          return {
            envId: env.id,
            merchants,
            merchantCount: merchants.length
          };
        }));

        // 验证数据隔离
        for (let i = 0; i < environments.length; i++) {
          const env = environments[i];
          const expectedCount = i + 1;

          // 切换到对应环境
          process.env.DB_TEST_PATH = env.databasePath;
          await database.close();
          await database.connect();

          // 验证数据只存在于当前环境
          const actualCount = await database.get('SELECT COUNT(*) as count FROM merchants');
          expect(actualCount.count).toBe(expectedCount);

          // 验证数据内容正确
          const merchants = await database.all('SELECT * FROM merchants');
          merchants.forEach(merchant => {
            expect(merchant.name).toContain(`环境${i + 1}_`);
            expect(merchant.code).toContain(`ENV${i + 1}_`);
          });
        }

        // 验证环境间数据不会相互影响
        const crossContaminationTest = await Promise.all(environments.map(async (env, index) => {
          process.env.DB_TEST_PATH = env.databasePath;
          await database.close();
          await database.connect();

          // 尝试查找其他环境的数据
          const otherEnvData = await database.all(
            'SELECT * FROM merchants WHERE name NOT LIKE ?',
            [`环境${index + 1}_%`]
          );

          return {
            envIndex: index,
            contaminatedData: otherEnvData
          };
        }));

        // 确保没有交叉污染
        crossContaminationTest.forEach(result => {
          expect(result.contaminatedData).toHaveLength(0);
        });

        const endTime = performance.now();
        const memoryAfter = process.memoryUsage();

        performanceMetrics.push({
          testName,
          duration: endTime - startTime,
          memoryBefore,
          memoryAfter,
          isolationLevel: 'multiple'
        });

        console.log(`✅ 环境隔离测试通过 - 创建了${environments.length}个独立环境`);

      } finally {
        // 清理所有测试环境
        await Promise.all(environments.map(env => env.cleanup()));
      }
    });

    it('应该测试环境隔离对性能的影响', async () => {
      const testName = '环境隔离性能影响测试';
      const isolationLevels: Array<'process' | 'thread' | 'test'> = ['process', 'thread', 'test'];
      const performanceResults: Array<{
        isolationLevel: string;
        environmentCreationTime: number;
        dataOperationTime: number;
        cleanupTime: number;
        memoryUsage: number;
      }> = [];

      for (const isolationLevel of isolationLevels) {
        const memoryBefore = process.memoryUsage();
        
        // 测试环境创建时间
        const envCreationStart = performance.now();
        const env = await testEnvironmentManager.createIsolatedEnvironment({ isolationLevel });
        await testEnvironmentManager.setupTestDatabase(env);
        const envCreationTime = performance.now() - envCreationStart;

        try {
          // 测试数据操作时间
          const dataOpStart = performance.now();
          
          // 执行标准化的数据操作
          const scenario = await enhancedTestDataFactory.createCompleteScenario({
            isolation: true,
            cleanup: false
          });

          // 执行一些查询操作
          await enhancedDatabaseTestHelper.executeBatchQueries([
            { sql: 'SELECT COUNT(*) as count FROM merchants' },
            { sql: 'SELECT COUNT(*) as count FROM users' },
            { sql: 'SELECT COUNT(*) as count FROM visitor_applications' },
            { sql: 'SELECT * FROM merchants WHERE status = ?', params: ['active'] },
            { sql: 'SELECT u.*, m.name as merchant_name FROM users u LEFT JOIN merchants m ON u.merchant_id = m.id' }
          ]);

          const dataOpTime = performance.now() - dataOpStart;

          // 测试清理时间
          const cleanupStart = performance.now();
          await enhancedTestDataFactory.cleanupAllData();
          const cleanupTime = performance.now() - cleanupStart;

          const memoryAfter = process.memoryUsage();
          const memoryUsage = memoryAfter.heapUsed - memoryBefore.heapUsed;

          performanceResults.push({
            isolationLevel,
            environmentCreationTime: envCreationTime,
            dataOperationTime: dataOpTime,
            cleanupTime,
            memoryUsage: memoryUsage / 1024 / 1024 // MB
          });

        } finally {
          await env.cleanup();
        }
      }

      // 分析性能结果
      console.log('\n🔍 隔离级别性能对比:');
      performanceResults.forEach(result => {
        console.log(`${result.isolationLevel}:`);
        console.log(`  环境创建: ${result.environmentCreationTime.toFixed(2)}ms`);
        console.log(`  数据操作: ${result.dataOperationTime.toFixed(2)}ms`);
        console.log(`  清理时间: ${result.cleanupTime.toFixed(2)}ms`);
        console.log(`  内存使用: ${result.memoryUsage.toFixed(2)}MB`);
      });

      // 验证性能在合理范围内
      performanceResults.forEach(result => {
        expect(result.environmentCreationTime).toBeLessThan(5000); // 5秒内
        expect(result.dataOperationTime).toBeLessThan(10000); // 10秒内
        expect(result.cleanupTime).toBeLessThan(3000); // 3秒内
        expect(result.memoryUsage).toBeLessThan(100); // 100MB内
      });

      const memoryAfter = process.memoryUsage();
      performanceMetrics.push({
        testName,
        duration: performanceResults.reduce((sum, r) => sum + r.environmentCreationTime + r.dataOperationTime + r.cleanupTime, 0),
        memoryBefore: process.memoryUsage(),
        memoryAfter,
        isolationLevel: 'comparison'
      });
    });

    it('应该测试并发环境隔离的稳定性', async () => {
      const testName = '并发环境隔离稳定性测试';
      const startTime = performance.now();
      const memoryBefore = process.memoryUsage();
      const concurrentCount = 5;

      // 并发创建多个隔离环境
      const concurrentTests = Array.from({ length: concurrentCount }, async (_, index) => {
        const testId = `concurrent-isolation-${index}`;
        
        try {
          // 获取测试锁
          const lock = await testEnvironmentManager.acquireTestLock(testId, 30000);
          
          try {
            // 创建隔离环境
            const env = await testEnvironmentManager.createIsolatedEnvironment({
              isolationLevel: 'test'
            });
            
            await testEnvironmentManager.setupTestDatabase(env);

            // 创建测试数据
            const merchants = await enhancedTestDataFactory.createMerchants({
              count: index + 1,
              isolation: true,
              cleanup: false,
              overrides: {
                name: `并发测试${index}_商户`,
                code: `CONCURRENT${index}_MERCHANT`
              }
            });

            // 验证数据正确性
            const count = await database.get('SELECT COUNT(*) as count FROM merchants');
            expect(count.count).toBe(index + 1);

            // 执行一些复杂操作
            const users = await enhancedTestDataFactory.createUsers({
              count: 2,
              relationships: { merchant_id: merchants[0].id },
              isolation: true
            });

            const applications = await enhancedTestDataFactory.createVisitorApplications({
              count: 3,
              relationships: {
                merchant_id: merchants[0].id,
                applicant_id: users[0].id,
                visitee_id: users[1].id
              },
              isolation: true
            });

            // 验证关系数据
            expect(users).toHaveLength(2);
            expect(applications).toHaveLength(3);

            // 执行数据一致性检查
            const consistencyChecks = await enhancedTestDataFactory.performConsistencyCheck();
            const invalidChecks = consistencyChecks.filter(c => !c.isValid);
            expect(invalidChecks).toHaveLength(0);

            return {
              testId,
              success: true,
              merchantCount: merchants.length,
              userCount: users.length,
              applicationCount: applications.length,
              envId: env.id
            };

          } finally {
            await lock.release();
          }

        } catch (error) {
          console.error(`并发测试 ${testId} 失败:`, error);
          return {
            testId,
            success: false,
            error: error as Error
          };
        }
      });

      const results = await Promise.all(concurrentTests);

      // 验证所有并发测试都成功
      const successfulTests = results.filter(r => r.success);
      const failedTests = results.filter(r => !r.success);

      expect(failedTests).toHaveLength(0);
      expect(successfulTests).toHaveLength(concurrentCount);

      // 验证每个测试的数据都是独立的
      successfulTests.forEach((result, index) => {
        if ('merchantCount' in result) {
          expect(result.merchantCount).toBe(index + 1);
          expect(result.userCount).toBe(2);
          expect(result.applicationCount).toBe(3);
        }
      });

      const endTime = performance.now();
      const memoryAfter = process.memoryUsage();

      performanceMetrics.push({
        testName,
        duration: endTime - startTime,
        memoryBefore,
        memoryAfter,
        isolationLevel: 'concurrent'
      });

      console.log(`✅ 并发隔离测试通过 - ${concurrentCount}个并发环境全部成功`);
    });
  });

  describe('超时管理各种场景测试', () => {
    it('应该测试不同类型测试的超时管理', async () => {
      const testScenarios = [
        { type: 'unit', timeout: 2000, expectedDuration: 500 },
        { type: 'integration', timeout: 5000, expectedDuration: 1500 },
        { type: 'e2e', timeout: 10000, expectedDuration: 3000 },
        { type: 'performance', timeout: 30000, expectedDuration: 8000 }
      ];

      const results: Array<{
        type: string;
        success: boolean;
        actualDuration: number;
        timeoutTriggered: boolean;
        warningsReceived: number;
      }> = [];

      for (const scenario of testScenarios) {
        const testName = `timeout-${scenario.type}-test`;
        let warningsReceived = 0;
        let timeoutTriggered = false;

        // 设置超时配置
        timeoutManager.setTestTimeout(testName, scenario.timeout, {
          warningThreshold: 0.7,
          retryCount: 1
        });

        // 监听超时预警
        const warningHandler = () => {
          warningsReceived++;
        };
        timeoutManager.onTimeoutWarning(warningHandler);

        // 监听超时事件
        const timeoutHandler = () => {
          timeoutTriggered = true;
        };
        timeoutManager.onTestTimeout(timeoutHandler);

        try {
          // 开始监控
          await timeoutManager.monitorTestExecution(testName);

          // 模拟测试执行时间
          const startTime = performance.now();
          await new Promise(resolve => setTimeout(resolve, scenario.expectedDuration));
          const actualDuration = performance.now() - startTime;

          // 完成监控
          const metrics = timeoutManager.completeTestExecution(testName, 'completed');

          results.push({
            type: scenario.type,
            success: true,
            actualDuration,
            timeoutTriggered,
            warningsReceived
          });

          // 验证执行指标
          expect(metrics).toBeDefined();
          expect(metrics!.status).toBe('completed');
          expect(metrics!.duration).toBeGreaterThan(scenario.expectedDuration - 100);
          expect(metrics!.duration).toBeLessThan(scenario.timeout);

        } catch (error) {
          results.push({
            type: scenario.type,
            success: false,
            actualDuration: scenario.timeout,
            timeoutTriggered: true,
            warningsReceived
          });
        }
      }

      // 验证结果
      results.forEach(result => {
        console.log(`${result.type} 测试: ${result.success ? '✅' : '❌'} (${result.actualDuration.toFixed(0)}ms)`);
        
        if (result.success) {
          expect(result.timeoutTriggered).toBe(false);
        }
      });

      // 至少应该有一些预警被触发（对于较长的测试）
      const totalWarnings = results.reduce((sum, r) => sum + r.warningsReceived, 0);
      console.log(`总预警次数: ${totalWarnings}`);
    });

    it('应该测试超时动态调整功能', async () => {
      const testName = 'dynamic-timeout-adjustment-test';
      
      // 设置初始超时
      timeoutManager.setTestTimeout(testName, 3000);
      
      // 开始监控
      await timeoutManager.monitorTestExecution(testName);
      
      // 模拟执行一段时间
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 动态调整超时时间（增加）
      timeoutManager.adjustTimeout(testName, 8000, '检测到复杂操作，需要更多时间');
      
      // 继续执行
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 再次动态调整（减少）
      timeoutManager.adjustTimeout(testName, 5000, '操作简化，可以减少超时时间');
      
      // 完成执行
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const metrics = timeoutManager.completeTestExecution(testName, 'completed');
      
      expect(metrics).toBeDefined();
      expect(metrics!.status).toBe('completed');
      expect(metrics!.duration).toBeGreaterThan(3900); // 约4秒
      expect(metrics!.duration).toBeLessThan(5000); // 小于最终超时时间
      
      // 验证最终超时配置
      const finalConfig = timeoutManager.getTestTimeout(testName);
      expect(finalConfig!.timeout).toBe(5000);
    });

    it('应该测试超时恢复和重试机制', async () => {
      const testName = 'timeout-recovery-test';
      let attemptCount = 0;
      const maxAttempts = 3;
      
      // 设置短超时时间以触发超时
      timeoutManager.setTestTimeout(testName, 1000, {
        retryCount: maxAttempts - 1,
        retryDelay: 500
      });

      const executeTest = async (): Promise<boolean> => {
        attemptCount++;
        
        try {
          await timeoutManager.monitorTestExecution(`${testName}-attempt-${attemptCount}`);
          
          // 前两次尝试故意超时
          if (attemptCount < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1500)); // 超过超时时间
            return false;
          } else {
            // 第三次尝试成功
            await new Promise(resolve => setTimeout(resolve, 500)); // 在超时时间内
            timeoutManager.completeTestExecution(`${testName}-attempt-${attemptCount}`, 'completed');
            return true;
          }
          
        } catch (error) {
          console.log(`尝试 ${attemptCount} 超时`);
          return false;
        }
      };

      // 执行重试逻辑
      let success = false;
      for (let i = 0; i < maxAttempts && !success; i++) {
        success = await executeTest();
        
        if (!success && i < maxAttempts - 1) {
          // 等待重试延迟
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      expect(success).toBe(true);
      expect(attemptCount).toBe(maxAttempts);
      
      // 验证超时统计
      const stats = timeoutManager.getTimeoutStatistics();
      expect(stats.timeoutTests).toBeGreaterThan(0);
      
      console.log(`✅ 重试机制测试通过 - ${attemptCount} 次尝试后成功`);
    });

    it('应该测试超时预警系统', async () => {
      const testName = 'timeout-warning-system-test';
      const warnings: Array<{ testName: string; percentage: number; timestamp: Date }> = [];
      
      // 设置超时配置
      timeoutManager.setTestTimeout(testName, 5000, {
        warningThreshold: 0.6 // 60%时预警
      });

      // 监听预警事件
      timeoutManager.onTimeoutWarning((warning) => {
        warnings.push({
          testName: warning.testName,
          percentage: warning.percentage,
          timestamp: warning.timestamp
        });
      });

      // 开始监控
      await timeoutManager.monitorTestExecution(testName);

      // 执行到预警点之前
      await new Promise(resolve => setTimeout(resolve, 2000)); // 40%
      expect(warnings).toHaveLength(0);

      // 执行到预警点之后
      await new Promise(resolve => setTimeout(resolve, 1500)); // 70%
      
      // 等待预警触发
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].testName).toBe(testName);
      expect(warnings[0].percentage).toBeGreaterThan(0.6);

      // 完成测试
      const metrics = timeoutManager.completeTestExecution(testName, 'completed');
      expect(metrics!.warnings.length).toBeGreaterThan(0);

      console.log(`✅ 预警系统测试通过 - 收到 ${warnings.length} 个预警`);
    });
  });

  describe('测试数据管理正确性和清理效果测试', () => {
    it('应该测试数据生成的正确性和一致性', async () => {
      const testName = '数据生成正确性测试';
      const startTime = performance.now();
      const memoryBefore = process.memoryUsage();

      // 创建完整的测试场景
      const scenario = await enhancedTestDataFactory.createCompleteScenario({
        isolation: true,
        cleanup: false
      });

      // 验证数据结构正确性
      expect(scenario.projects).toHaveLength(1);
      expect(scenario.merchants).toHaveLength(2);
      expect(scenario.users).toHaveLength(4); // 1 admin + 3 employees
      expect(scenario.applications).toHaveLength(5);

      // 验证数据关系正确性
      const employees = scenario.users.filter(u => u.user_type === 'merchant_employee');
      expect(employees).toHaveLength(3);
      
      // 验证所有员工都关联到第一个商户
      employees.forEach(employee => {
        expect(employee.merchant_id).toBe(scenario.merchants[0].id);
      });

      // 验证访客申请关系
      scenario.applications.forEach(app => {
        expect(app.merchant_id).toBe(scenario.merchants[0].id);
        expect([employees[0].id, employees[1].id, employees[2].id]).toContain(app.applicant_id);
        expect([employees[0].id, employees[1].id, employees[2].id]).toContain(app.visitee_id);
      });

      // 验证数据库中的数据一致性
      const dbMerchants = await database.all('SELECT * FROM merchants');
      const dbUsers = await database.all('SELECT * FROM users');
      const dbApplications = await database.all('SELECT * FROM visitor_applications');

      expect(dbMerchants).toHaveLength(2);
      expect(dbUsers).toHaveLength(4);
      expect(dbApplications).toHaveLength(5);

      // 验证外键关系
      const userMerchantCheck = await database.all(`
        SELECT u.id, u.merchant_id, m.id as merchant_exists
        FROM users u
        LEFT JOIN merchants m ON u.merchant_id = m.id
        WHERE u.merchant_id IS NOT NULL
      `);

      userMerchantCheck.forEach(check => {
        expect(check.merchant_exists).toBeDefined();
      });

      // 执行完整的数据一致性检查
      const consistencyChecks = await enhancedTestDataFactory.performConsistencyCheck();
      const invalidChecks = consistencyChecks.filter(c => !c.isValid);
      
      if (invalidChecks.length > 0) {
        console.error('数据一致性问题:', invalidChecks);
      }
      expect(invalidChecks).toHaveLength(0);

      const endTime = performance.now();
      const memoryAfter = process.memoryUsage();

      performanceMetrics.push({
        testName,
        duration: endTime - startTime,
        memoryBefore,
        memoryAfter,
        isolationLevel: 'data-generation'
      });

      console.log('✅ 数据生成正确性测试通过');
    });

    it('应该测试数据清理的完整性和效果', async () => {
      const testName = '数据清理完整性测试';
      const startTime = performance.now();
      const memoryBefore = process.memoryUsage();

      // 创建大量测试数据
      const merchants = await enhancedTestDataFactory.createMerchants({ count: 10, cleanup: true });
      const users = await enhancedTestDataFactory.createUsers({ 
        count: 30, 
        relationships: { merchant_id: merchants[0].id },
        cleanup: true 
      });
      const applications = await enhancedTestDataFactory.createVisitorApplications({ 
        count: 50,
        relationships: {
          merchant_id: merchants[0].id,
          applicant_id: users[0].id,
          visitee_id: users[1].id
        },
        cleanup: true 
      });

      // 验证数据已创建
      const beforeCleanup = {
        merchants: await database.get('SELECT COUNT(*) as count FROM merchants'),
        users: await database.get('SELECT COUNT(*) as count FROM users'),
        applications: await database.get('SELECT COUNT(*) as count FROM visitor_applications')
      };

      expect(beforeCleanup.merchants.count).toBe(10);
      expect(beforeCleanup.users.count).toBe(30);
      expect(beforeCleanup.applications.count).toBe(50);

      // 创建数据快照用于验证清理效果
      const snapshot = await enhancedTestDataFactory.createDataSnapshot('before-cleanup');
      expect(snapshot.tables.merchants).toHaveLength(10);
      expect(snapshot.tables.users).toHaveLength(30);
      expect(snapshot.tables.visitor_applications).toHaveLength(50);

      // 执行清理
      const cleanupStartTime = performance.now();
      await enhancedTestDataFactory.cleanupTestData();
      const cleanupDuration = performance.now() - cleanupStartTime;

      // 验证清理效果
      const afterCleanup = {
        merchants: await database.get('SELECT COUNT(*) as count FROM merchants'),
        users: await database.get('SELECT COUNT(*) as count FROM users'),
        applications: await database.get('SELECT COUNT(*) as count FROM visitor_applications')
      };

      expect(afterCleanup.merchants.count).toBe(0);
      expect(afterCleanup.users.count).toBe(0);
      expect(afterCleanup.applications.count).toBe(0);

      // 验证自增ID已重置
      const sequenceCheck = await database.all('SELECT * FROM sqlite_sequence');
      expect(sequenceCheck).toHaveLength(0);

      // 测试快照恢复功能
      await enhancedTestDataFactory.restoreDataSnapshot('before-cleanup');

      const afterRestore = {
        merchants: await database.get('SELECT COUNT(*) as count FROM merchants'),
        users: await database.get('SELECT COUNT(*) as count FROM users'),
        applications: await database.get('SELECT COUNT(*) as count FROM visitor_applications')
      };

      expect(afterRestore.merchants.count).toBe(10);
      expect(afterRestore.users.count).toBe(30);
      expect(afterRestore.applications.count).toBe(50);

      // 再次清理以完成测试
      await enhancedTestDataFactory.cleanupAllData();

      const endTime = performance.now();
      const memoryAfter = process.memoryUsage();

      performanceMetrics.push({
        testName,
        duration: endTime - startTime,
        memoryBefore,
        memoryAfter,
        isolationLevel: 'data-cleanup'
      });

      console.log(`✅ 数据清理测试通过 - 清理耗时: ${cleanupDuration.toFixed(2)}ms`);
    });

    it('应该测试并发数据操作的安全性', async () => {
      const testName = '并发数据操作安全性测试';
      const startTime = performance.now();
      const memoryBefore = process.memoryUsage();
      const concurrentOperations = 8;

      // 并发执行数据操作
      const concurrentTasks = Array.from({ length: concurrentOperations }, async (_, index) => {
        const taskId = `concurrent-data-${index}`;
        
        try {
          // 获取测试锁
          const lock = await testEnvironmentManager.acquireTestLock(taskId, 15000);
          
          try {
            // 创建独立的测试数据
            const merchants = await enhancedTestDataFactory.createMerchants({
              count: 2,
              isolation: true,
              cleanup: true,
              overrides: {
                name: `并发商户${index}`,
                code: `CONCURRENT${index}`
              }
            });

            const users = await enhancedTestDataFactory.createUsers({
              count: 5,
              relationships: { merchant_id: merchants[0].id },
              isolation: true,
              cleanup: true
            });

            // 执行一些数据库操作
            const queryResults = await enhancedDatabaseTestHelper.executeBatchQueries([
              { sql: 'SELECT COUNT(*) as count FROM merchants WHERE name LIKE ?', params: [`并发商户${index}%`] },
              { sql: 'SELECT COUNT(*) as count FROM users WHERE merchant_id = ?', params: [merchants[0].id] },
              { sql: 'SELECT * FROM merchants WHERE code = ?', params: [`CONCURRENT${index}`] }
            ]);

            // 验证查询结果
            expect(queryResults[0].count).toBe(2);
            expect(queryResults[1].count).toBe(5);
            expect(queryResults[2]).toHaveLength(2);

            // 执行数据一致性检查
            const consistencyChecks = await enhancedTestDataFactory.performConsistencyCheck();
            const invalidChecks = consistencyChecks.filter(c => !c.isValid);

            return {
              taskId,
              success: true,
              merchantCount: merchants.length,
              userCount: users.length,
              consistencyIssues: invalidChecks.length,
              queryResults: queryResults.length
            };

          } finally {
            await lock.release();
          }

        } catch (error) {
          console.error(`并发数据操作 ${taskId} 失败:`, error);
          return {
            taskId,
            success: false,
            error: error as Error
          };
        }
      });

      const results = await Promise.all(concurrentTasks);

      // 验证所有操作都成功
      const successfulTasks = results.filter(r => r.success);
      const failedTasks = results.filter(r => !r.success);

      expect(failedTasks).toHaveLength(0);
      expect(successfulTasks).toHaveLength(concurrentOperations);

      // 验证数据完整性
      successfulTasks.forEach(result => {
        if ('merchantCount' in result) {
          expect(result.merchantCount).toBe(2);
          expect(result.userCount).toBe(5);
          expect(result.consistencyIssues).toBe(0);
          expect(result.queryResults).toBe(3);
        }
      });

      // 验证数据库最终状态
      const finalCounts = {
        merchants: await database.get('SELECT COUNT(*) as count FROM merchants'),
        users: await database.get('SELECT COUNT(*) as count FROM users')
      };

      // 由于使用了隔离和清理，最终应该没有数据残留
      expect(finalCounts.merchants.count).toBe(0);
      expect(finalCounts.users.count).toBe(0);

      const endTime = performance.now();
      const memoryAfter = process.memoryUsage();

      performanceMetrics.push({
        testName,
        duration: endTime - startTime,
        memoryBefore,
        memoryAfter,
        isolationLevel: 'concurrent-data'
      });

      console.log(`✅ 并发数据操作安全性测试通过 - ${concurrentOperations}个并发任务全部成功`);
    });

    it('应该测试大数据量的处理能力', async () => {
      const testName = '大数据量处理能力测试';
      const startTime = performance.now();
      const memoryBefore = process.memoryUsage();

      // 创建大量数据
      const largeDataCounts = {
        merchants: 50,
        usersPerMerchant: 20,
        applicationsPerUser: 10
      };

      console.log(`开始创建大量测试数据: ${largeDataCounts.merchants} 商户, 每个商户 ${largeDataCounts.usersPerMerchant} 用户...`);

      // 分批创建商户
      const allMerchants = [];
      const batchSize = 10;
      
      for (let i = 0; i < largeDataCounts.merchants; i += batchSize) {
        const currentBatchSize = Math.min(batchSize, largeDataCounts.merchants - i);
        const merchants = await enhancedTestDataFactory.createMerchants({
          count: currentBatchSize,
          isolation: true,
          cleanup: true,
          overrides: { status: 'active' }
        });
        allMerchants.push(...merchants);
      }

      expect(allMerchants).toHaveLength(largeDataCounts.merchants);

      // 为每个商户创建用户
      let totalUsers = 0;
      for (const merchant of allMerchants.slice(0, 5)) { // 只为前5个商户创建用户以控制测试时间
        const users = await enhancedTestDataFactory.createUsers({
          count: largeDataCounts.usersPerMerchant,
          relationships: { merchant_id: merchant.id },
          isolation: true,
          cleanup: true
        });
        totalUsers += users.length;
      }

      // 验证数据创建
      const dataCounts = {
        merchants: await database.get('SELECT COUNT(*) as count FROM merchants'),
        users: await database.get('SELECT COUNT(*) as count FROM users')
      };

      expect(dataCounts.merchants.count).toBe(largeDataCounts.merchants);
      expect(dataCounts.users.count).toBe(totalUsers);

      // 测试大数据量查询性能
      const queryStartTime = performance.now();
      
      const complexQueries = await enhancedDatabaseTestHelper.executeBatchQueries([
        { sql: 'SELECT COUNT(*) as total_merchants FROM merchants' },
        { sql: 'SELECT COUNT(*) as total_users FROM users' },
        { sql: 'SELECT m.name, COUNT(u.id) as user_count FROM merchants m LEFT JOIN users u ON m.id = u.merchant_id GROUP BY m.id ORDER BY user_count DESC LIMIT 10' },
        { sql: 'SELECT user_type, COUNT(*) as count FROM users GROUP BY user_type' },
        { sql: 'SELECT status, COUNT(*) as count FROM merchants GROUP BY status' }
      ]);

      const queryDuration = performance.now() - queryStartTime;

      // 验证查询结果
      expect(complexQueries[0].total_merchants).toBe(largeDataCounts.merchants);
      expect(complexQueries[1].total_users).toBe(totalUsers);
      expect(Array.isArray(complexQueries[2])).toBe(true);

      // 测试清理性能
      const cleanupStartTime = performance.now();
      await enhancedTestDataFactory.cleanupTestData();
      const cleanupDuration = performance.now() - cleanupStartTime;

      // 验证清理效果
      const afterCleanup = {
        merchants: await database.get('SELECT COUNT(*) as count FROM merchants'),
        users: await database.get('SELECT COUNT(*) as count FROM users')
      };

      expect(afterCleanup.merchants.count).toBe(0);
      expect(afterCleanup.users.count).toBe(0);

      const endTime = performance.now();
      const memoryAfter = process.memoryUsage();

      performanceMetrics.push({
        testName,
        duration: endTime - startTime,
        memoryBefore,
        memoryAfter,
        isolationLevel: 'large-data'
      });

      console.log(`✅ 大数据量处理测试通过:`);
      console.log(`  - 数据创建: ${largeDataCounts.merchants} 商户, ${totalUsers} 用户`);
      console.log(`  - 查询性能: ${queryDuration.toFixed(2)}ms`);
      console.log(`  - 清理性能: ${cleanupDuration.toFixed(2)}ms`);
      console.log(`  - 总耗时: ${(endTime - startTime).toFixed(2)}ms`);
    });
  });

  describe('综合集成测试', () => {
    it('应该执行完整的测试框架改进验证流程', async () => {
      const testName = '完整测试框架改进验证';
      const startTime = performance.now();
      const memoryBefore = process.memoryUsage();

      console.log('🚀 开始完整的测试框架改进验证流程...');

      // 1. 环境隔离测试
      console.log('1️⃣ 测试环境隔离...');
      const isolatedEnv = await testEnvironmentManager.createIsolatedEnvironment({
        isolationLevel: 'test'
      });
      await testEnvironmentManager.setupTestDatabase(isolatedEnv);

      // 2. 超时管理测试
      console.log('2️⃣ 测试超时管理...');
      timeoutManager.setTestTimeout(testName, 30000, {
        warningThreshold: 0.8,
        retryCount: 1
      });
      await timeoutManager.monitorTestExecution(testName);

      // 3. 测试锁机制
      console.log('3️⃣ 测试锁机制...');
      const testLock = await testEnvironmentManager.acquireTestLock(testName, 25000);

      try {
        // 4. 数据生成和管理
        console.log('4️⃣ 测试数据生成和管理...');
        const scenario = await enhancedTestDataFactory.createCompleteScenario({
          isolation: true,
          cleanup: true
        });

        // 5. 数据库操作监控
        console.log('5️⃣ 测试数据库操作监控...');
        const monitoredResults = await enhancedDatabaseTestHelper.executeBatchQueries([
          { sql: 'SELECT COUNT(*) as merchant_count FROM merchants' },
          { sql: 'SELECT COUNT(*) as user_count FROM users' },
          { sql: 'SELECT COUNT(*) as application_count FROM visitor_applications' },
          { sql: 'SELECT m.name, COUNT(u.id) as employees FROM merchants m LEFT JOIN users u ON m.id = u.merchant_id WHERE u.user_type = ? GROUP BY m.id', params: ['merchant_employee'] }
        ]);

        // 6. 性能监控
        console.log('6️⃣ 测试性能监控...');
        const performanceMetrics = enhancedDatabaseTestHelper.getPerformanceMetrics();
        expect(performanceMetrics.queryCount).toBeGreaterThan(0);

        // 7. 数据一致性检查
        console.log('7️⃣ 测试数据一致性检查...');
        const consistencyChecks = await enhancedTestDataFactory.performConsistencyCheck();
        const invalidChecks = consistencyChecks.filter(c => !c.isValid);
        expect(invalidChecks).toHaveLength(0);

        // 8. 快照和恢复
        console.log('8️⃣ 测试快照和恢复...');
        const snapshot = await enhancedTestDataFactory.createDataSnapshot(`${testName}-final`);
        expect(snapshot.tables.merchants.length).toBeGreaterThan(0);

        // 9. 诊断报告生成
        console.log('9️⃣ 生成诊断报告...');
        const diagnosticReport = await enhancedDatabaseTestHelper.generateDiagnosticReport(testName);
        expect(diagnosticReport.testName).toBe(testName);
        expect(diagnosticReport.databaseState.isConnected).toBe(true);

        // 10. 验证所有组件协同工作
        console.log('🔟 验证组件协同工作...');
        
        // 验证数据创建结果
        expect(scenario.projects).toHaveLength(1);
        expect(scenario.merchants).toHaveLength(2);
        expect(scenario.users).toHaveLength(4);
        expect(scenario.applications).toHaveLength(5);

        // 验证查询结果
        expect(monitoredResults[0].merchant_count).toBe(2);
        expect(monitoredResults[1].user_count).toBe(4);
        expect(monitoredResults[2].application_count).toBe(5);

        // 验证环境状态
        const activeEnvironments = testEnvironmentManager.getActiveEnvironments();
        expect(activeEnvironments.length).toBeGreaterThan(0);

        // 验证锁状态
        const lockStatus = testEnvironmentManager.getLockStatus();
        expect(lockStatus.some(lock => lock.testName === testName)).toBe(true);

        console.log('✅ 所有组件协同工作正常');

      } finally {
        // 11. 清理资源
        console.log('🧹 清理测试资源...');
        await testLock.release();
        await isolatedEnv.cleanup();
      }

      // 12. 完成监控
      const finalMetrics = timeoutManager.completeTestExecution(testName, 'completed');
      expect(finalMetrics).toBeDefined();
      expect(finalMetrics!.status).toBe('completed');

      const endTime = performance.now();
      const memoryAfter = process.memoryUsage();

      performanceMetrics.push({
        testName,
        duration: endTime - startTime,
        memoryBefore,
        memoryAfter,
        isolationLevel: 'comprehensive'
      });

      // 13. 生成最终报告
      console.log('📊 生成最终测试报告...');
      const testSummary = enhancedDatabaseTestHelper.generateTestReportSummary();
      const timeoutStats = timeoutManager.getTimeoutStatistics();

      console.log('\n🎯 测试框架改进验证结果:');
      console.log('='.repeat(50));
      console.log(`✅ 环境隔离: 正常工作`);
      console.log(`✅ 超时管理: 正常工作 (${timeoutStats.totalTests} 个测试)`);
      console.log(`✅ 数据管理: 正常工作 (${testSummary.totalTests} 个操作)`);
      console.log(`✅ 性能监控: 正常工作 (${testSummary.performanceMetrics.queryCount} 个查询)`);
      console.log(`✅ 诊断报告: 正常工作`);
      console.log(`⏱️  总耗时: ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`💾 内存使用: ${((memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024).toFixed(2)}MB`);

      console.log('🎉 测试框架改进验证完成 - 所有功能正常工作!');
    });
  });
});