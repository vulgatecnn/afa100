/**
 * MySQL测试框架功能验证
 * 使用MySQL环境运行完整的测试套件、验证所有MySQL测试工具的功能、确保MySQL测试框架的稳定性
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { MySQLAdapter } from '../../src/adapters/mysql-adapter';
import { DatabaseConfigManager, DatabaseType, MySQLConfig } from '../../src/config/database-config-manager';
import { createMySQLTestToolkit, MySQLTestToolkit } from '../../tests/helpers/mysql-test-tools';

describe('MySQL测试框架功能验证', () => {
  let isMySQL: boolean = false;
  let config: MySQLConfig;

  beforeAll(async () => {
    // 检查是否配置为使用MySQL
    process.env.TEST_DB_TYPE = 'mysql';
    const configManager = DatabaseConfigManager.getInstance();
    configManager.resetConfig();
    const testConfig = configManager.getConfig();
    
    if (testConfig.type !== DatabaseType.MYSQL) {
      console.log('⚠️ 未配置MySQL，跳过框架验证测试');
      return;
    }

    config = testConfig as MySQLConfig;
    
    try {
      // 测试MySQL连接
      const testAdapter = new MySQLAdapter();
      await testAdapter.connect(config);
      await testAdapter.disconnect();
      isMySQL = true;
      console.log('✅ MySQL服务可用，开始框架验证测试');
    } catch (error) {
      console.log('⚠️ MySQL服务不可用，跳过框架验证测试:', (error as Error).message);
      isMySQL = false;
    }
  });

  describe('1. 使用MySQL环境运行完整的测试套件', () => {
    let adapter: MySQLAdapter;
    let toolkit: MySQLTestToolkit;
    let testDbName: string;

    beforeEach(async () => {
      if (!isMySQL) return;
      
      testDbName = `test_framework_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      adapter = new MySQLAdapter();
      await adapter.connect(config);
      toolkit = createMySQLTestToolkit(adapter);
      
      // 初始化测试环境
      await adapter.createTestDatabase(testDbName);
      await adapter.initializeSchema(testDbName);
    });

    afterEach(async () => {
      if (!isMySQL || !adapter) return;
      
      try {
        await adapter.dropTestDatabase(testDbName);
        await adapter.disconnect();
      } catch (error) {
        console.warn('清理框架验证测试环境时出现警告:', error);
      }
    });

    it('应该能够运行基础CRUD操作测试套件', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过CRUD测试套件 - MySQL不可用');
        return;
      }

      // 测试CREATE操作
      const createResults = [];
      for (let i = 0; i < 5; i++) {
        const result = await adapter.run(
          'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
          [`测试商户${i}`, `TEST_MERCHANT_${i}`, 'active']
        );
        createResults.push(result);
        expect(result.lastID).toBeDefined();
        expect(result.changes).toBe(1);
      }

      // 测试READ操作
      const merchants = await adapter.all('SELECT * FROM merchants ORDER BY id');
      expect(merchants.length).toBe(5);
      
      for (let i = 0; i < 5; i++) {
        expect(merchants[i].name).toBe(`测试商户${i}`);
        expect(merchants[i].code).toBe(`TEST_MERCHANT_${i}`);
        expect(merchants[i].status).toBe('active');
      }

      // 测试UPDATE操作
      const updateResults = [];
      for (let i = 0; i < 3; i++) {
        const result = await adapter.run(
          'UPDATE merchants SET status = ? WHERE code = ?',
          ['inactive', `TEST_MERCHANT_${i}`]
        );
        updateResults.push(result);
        expect(result.changes).toBe(1);
      }

      // 验证UPDATE结果
      const updatedMerchants = await adapter.all(
        'SELECT * FROM merchants WHERE status = ? ORDER BY id',
        ['inactive']
      );
      expect(updatedMerchants.length).toBe(3);

      // 测试DELETE操作
      const deleteResults = [];
      for (let i = 0; i < 2; i++) {
        const result = await adapter.run(
          'DELETE FROM merchants WHERE code = ?',
          [`TEST_MERCHANT_${i}`]
        );
        deleteResults.push(result);
        expect(result.changes).toBe(1);
      }

      // 验证DELETE结果
      const remainingMerchants = await adapter.all('SELECT * FROM merchants ORDER BY id');
      expect(remainingMerchants.length).toBe(3);
    });

    it('应该能够运行事务处理测试套件', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过事务测试套件 - MySQL不可用');
        return;
      }

      // 测试事务提交
      const transaction1 = await adapter.beginTransaction();
      
      await adapter.run(
        'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
        ['事务商户1', 'TX_MERCHANT_1', 'active']
      );
      
      await adapter.run(
        'INSERT INTO users (name, user_type, status) VALUES (?, ?, ?)',
        ['事务用户1', 'employee', 'active']
      );

      await transaction1.commit();

      // 验证事务提交成功
      const merchant = await adapter.get(
        'SELECT * FROM merchants WHERE code = ?',
        ['TX_MERCHANT_1']
      );
      expect(merchant).toBeDefined();

      const user = await adapter.get(
        'SELECT * FROM users WHERE name = ?',
        ['事务用户1']
      );
      expect(user).toBeDefined();

      // 测试事务回滚
      const transaction2 = await adapter.beginTransaction();
      
      await adapter.run(
        'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
        ['事务商户2', 'TX_MERCHANT_2', 'active']
      );
      
      await adapter.run(
        'INSERT INTO users (name, user_type, status) VALUES (?, ?, ?)',
        ['事务用户2', 'employee', 'active']
      );

      await transaction2.rollback();

      // 验证事务回滚成功
      const rolledBackMerchant = await adapter.get(
        'SELECT * FROM merchants WHERE code = ?',
        ['TX_MERCHANT_2']
      );
      expect(rolledBackMerchant).toBeUndefined();

      const rolledBackUser = await adapter.get(
        'SELECT * FROM users WHERE name = ?',
        ['事务用户2']
      );
      expect(rolledBackUser).toBeUndefined();
    });

    it('应该能够运行复杂查询测试套件', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过复杂查询测试套件 - MySQL不可用');
        return;
      }

      // 准备测试数据
      const merchantResult = await adapter.run(
        'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
        ['复杂查询商户', 'COMPLEX_MERCHANT', 'active']
      );

      const merchantId = merchantResult.lastID;

      // 插入关联用户
      for (let i = 0; i < 3; i++) {
        await adapter.run(
          'INSERT INTO users (name, user_type, status, merchant_id) VALUES (?, ?, ?, ?)',
          [`复杂查询用户${i}`, 'employee', 'active', merchantId]
        );
      }

      // 测试JOIN查询
      const joinResults = await adapter.all(`
        SELECT u.name as user_name, u.user_type, m.name as merchant_name, m.code as merchant_code
        FROM users u
        JOIN merchants m ON u.merchant_id = m.id
        WHERE m.code = ?
        ORDER BY u.name
      `, ['COMPLEX_MERCHANT']);

      expect(joinResults.length).toBe(3);
      joinResults.forEach((result, index) => {
        expect(result.user_name).toBe(`复杂查询用户${index}`);
        expect(result.user_type).toBe('employee');
        expect(result.merchant_name).toBe('复杂查询商户');
        expect(result.merchant_code).toBe('COMPLEX_MERCHANT');
      });

      // 测试聚合查询
      const aggregateResult = await adapter.get(`
        SELECT 
          COUNT(*) as user_count,
          m.name as merchant_name
        FROM users u
        JOIN merchants m ON u.merchant_id = m.id
        WHERE m.code = ?
        GROUP BY m.id, m.name
      `, ['COMPLEX_MERCHANT']);

      expect(aggregateResult).toBeDefined();
      expect(aggregateResult.user_count).toBe(3);
      expect(aggregateResult.merchant_name).toBe('复杂查询商户');

      // 测试子查询
      const subqueryResults = await adapter.all(`
        SELECT * FROM users 
        WHERE merchant_id IN (
          SELECT id FROM merchants WHERE code = ?
        )
        ORDER BY name
      `, ['COMPLEX_MERCHANT']);

      expect(subqueryResults.length).toBe(3);
    });

    it('应该能够运行批量操作测试套件', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过批量操作测试套件 - MySQL不可用');
        return;
      }

      // 测试批量插入
      const batchInsertSQL = `
        INSERT INTO merchants (name, code, status) VALUES 
        ('批量商户1', 'BATCH_1', 'active'),
        ('批量商户2', 'BATCH_2', 'active'),
        ('批量商户3', 'BATCH_3', 'inactive'),
        ('批量商户4', 'BATCH_4', 'active'),
        ('批量商户5', 'BATCH_5', 'inactive')
      `;

      const batchResult = await adapter.executeRaw(batchInsertSQL);
      expect(batchResult).toBeDefined();

      // 验证批量插入结果
      const batchMerchants = await adapter.all(
        'SELECT * FROM merchants WHERE code LIKE ? ORDER BY code',
        ['BATCH_%']
      );
      expect(batchMerchants.length).toBe(5);

      // 测试批量更新
      const batchUpdateResult = await adapter.run(
        'UPDATE merchants SET status = ? WHERE code LIKE ?',
        ['updated', 'BATCH_%']
      );
      expect(batchUpdateResult.changes).toBe(5);

      // 验证批量更新结果
      const updatedBatchMerchants = await adapter.all(
        'SELECT * FROM merchants WHERE code LIKE ? AND status = ?',
        ['BATCH_%', 'updated']
      );
      expect(updatedBatchMerchants.length).toBe(5);

      // 测试批量删除
      const batchDeleteResult = await adapter.run(
        'DELETE FROM merchants WHERE code LIKE ?',
        ['BATCH_%']
      );
      expect(batchDeleteResult.changes).toBe(5);

      // 验证批量删除结果
      const remainingBatchMerchants = await adapter.all(
        'SELECT * FROM merchants WHERE code LIKE ?',
        ['BATCH_%']
      );
      expect(remainingBatchMerchants.length).toBe(0);
    });
  });

  describe('2. 验证所有MySQL测试工具的功能', () => {
    let adapter: MySQLAdapter;
    let toolkit: MySQLTestToolkit;
    let testDbName: string;

    beforeEach(async () => {
      if (!isMySQL) return;
      
      testDbName = `test_tools_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      adapter = new MySQLAdapter();
      await adapter.connect(config);
      toolkit = createMySQLTestToolkit(adapter);
      
      // 初始化测试环境
      await toolkit.initializeTestEnvironment(testDbName);
    });

    afterEach(async () => {
      if (!isMySQL || !adapter) return;
      
      try {
        await toolkit.cleanupTestEnvironment(testDbName);
      } catch (error) {
        console.warn('清理工具验证测试环境时出现警告:', error);
      }
    });

    it('应该能够验证MySQL测试数据工厂功能', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过数据工厂验证 - MySQL不可用');
        return;
      }

      // 测试快速创建测试场景
      const scenario = await toolkit.createQuickTestScenario();
      expect(scenario).toBeDefined();

      // 验证创建的数据
      const merchants = await adapter.all('SELECT * FROM merchants');
      expect(merchants.length).toBeGreaterThan(0);

      const users = await adapter.all('SELECT * FROM users');
      expect(users.length).toBeGreaterThan(0);

      // 验证数据关联性
      const usersWithMerchants = await adapter.all(`
        SELECT u.*, m.name as merchant_name 
        FROM users u 
        LEFT JOIN merchants m ON u.merchant_id = m.id
        WHERE u.merchant_id IS NOT NULL
      `);
      expect(usersWithMerchants.length).toBeGreaterThan(0);
    });

    it('应该能够验证MySQL数据库测试辅助工具功能', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过辅助工具验证 - MySQL不可用');
        return;
      }

      // 测试健康检查功能
      const healthCheck = await toolkit.performCompleteHealthCheck();
      expect(healthCheck.overall).toBe(true);
      expect(healthCheck.connection).toBe(true);
      expect(healthCheck.performance).toBeDefined();
      expect(healthCheck.timeout).toBeDefined();

      // 测试工具套件状态
      const status = toolkit.getToolkitStatus();
      expect(status.adapterReady).toBe(true);
      expect(status.activeOperations).toBeDefined();
      expect(status.performanceHistory).toBeDefined();
      expect(status.lastHealthCheck).toBeDefined();

      // 测试综合报告生成
      const report = await toolkit.generateComprehensiveReport();
      expect(report).toBeDefined();
      
      const reportData = JSON.parse(report);
      expect(reportData.title).toBe('MySQL测试工具综合报告');
      expect(reportData.serverInfo).toBeDefined();
      expect(reportData.healthCheck).toBeDefined();
      expect(reportData.summary).toBeDefined();
    });

    it('应该能够验证MySQL超时管理器功能', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过超时管理器验证 - MySQL不可用');
        return;
      }

      // 测试正常操作（不应该超时）
      const normalOperation = async () => {
        return await adapter.get('SELECT 1 as test');
      };

      const result = await normalOperation();
      expect(result).toBeDefined();
      expect(result.test == 1).toBe(true);

      // 测试超时管理器状态
      const healthCheck = await toolkit.performCompleteHealthCheck();
      expect(healthCheck.timeout).toBeDefined();
      expect(healthCheck.timeout.healthy).toBe(true);

      // 验证超时管理器没有活跃的超时操作
      const status = toolkit.getToolkitStatus();
      expect(status.activeOperations).toBe(0);
    });

    it('应该能够验证MySQL性能基准测试功能', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过性能基准测试验证 - MySQL不可用');
        return;
      }

      // 运行性能基准测试
      const performanceResults = await toolkit.runPerformanceBenchmark({
        insertCount: 10,
        selectCount: 20,
        updateCount: 5,
        deleteCount: 3
      });

      expect(performanceResults).toBeDefined();
      expect(performanceResults.insertOperations).toBeDefined();
      expect(performanceResults.selectOperations).toBeDefined();
      expect(performanceResults.updateOperations).toBeDefined();
      expect(performanceResults.deleteOperations).toBeDefined();

      // 验证性能指标
      expect(performanceResults.insertOperations.count).toBe(10);
      expect(performanceResults.selectOperations.count).toBe(20);
      expect(performanceResults.updateOperations.count).toBe(5);
      expect(performanceResults.deleteOperations.count).toBe(3);

      // 验证时间指标存在
      expect(performanceResults.insertOperations.totalTime).toBeGreaterThan(0);
      expect(performanceResults.selectOperations.totalTime).toBeGreaterThan(0);
      expect(performanceResults.updateOperations.totalTime).toBeGreaterThan(0);
      expect(performanceResults.deleteOperations.totalTime).toBeGreaterThan(0);
    });
  });

  describe('3. 确保MySQL测试框架的稳定性', () => {
    let adapters: MySQLAdapter[] = [];
    let toolkits: MySQLTestToolkit[] = [];
    let testDbNames: string[] = [];
    const testCount = 3;

    beforeEach(async () => {
      if (!isMySQL) return;
      
      adapters = [];
      toolkits = [];
      testDbNames = [];
      
      // 创建多个并发测试环境
      for (let i = 0; i < testCount; i++) {
        const adapter = new MySQLAdapter();
        await adapter.connect(config);
        const toolkit = createMySQLTestToolkit(adapter);
        const testDbName = `test_stability_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        adapters.push(adapter);
        toolkits.push(toolkit);
        testDbNames.push(testDbName);
        
        await toolkit.initializeTestEnvironment(testDbName);
      }
    });

    afterEach(async () => {
      if (!isMySQL) return;
      
      // 清理所有测试环境
      for (let i = 0; i < adapters.length; i++) {
        try {
          await toolkits[i].cleanupTestEnvironment(testDbNames[i]);
        } catch (error) {
          console.warn(`清理稳定性测试环境${i}时出现警告:`, error);
        }
      }
    });

    it('应该能够在高负载下保持稳定性', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过高负载稳定性测试 - MySQL不可用');
        return;
      }

      // 并发执行大量操作
      const operations = [];
      
      for (let i = 0; i < adapters.length; i++) {
        const adapter = adapters[i];
        
        // 每个适配器执行多个并发操作
        for (let j = 0; j < 10; j++) {
          operations.push(
            adapter.run(
              'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
              [`高负载商户${i}_${j}`, `LOAD_${i}_${j}`, 'active']
            )
          );
        }
      }

      // 等待所有操作完成
      const results = await Promise.all(operations);
      
      // 验证所有操作都成功
      results.forEach(result => {
        expect(result.lastID).toBeDefined();
        expect(result.changes).toBe(1);
      });

      // 验证数据完整性
      for (let i = 0; i < adapters.length; i++) {
        const merchants = await adapters[i].all(
          'SELECT * FROM merchants WHERE code LIKE ?',
          [`LOAD_${i}_%`]
        );
        expect(merchants.length).toBe(10);
      }
    });

    it('应该能够处理长时间运行的操作', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过长时间运行测试 - MySQL不可用');
        return;
      }

      // 执行一系列长时间操作
      const longRunningOperations = [];
      
      for (let i = 0; i < adapters.length; i++) {
        const adapter = adapters[i];
        
        // 创建大量数据
        longRunningOperations.push(
          (async () => {
            for (let j = 0; j < 50; j++) {
              await adapter.run(
                'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
                [`长时间商户${i}_${j}`, `LONG_${i}_${j}`, 'active']
              );
            }
            return i;
          })()
        );
      }

      // 等待所有长时间操作完成
      const completedOperations = await Promise.all(longRunningOperations);
      expect(completedOperations.length).toBe(testCount);

      // 验证数据完整性
      for (let i = 0; i < adapters.length; i++) {
        const merchants = await adapters[i].all(
          'SELECT COUNT(*) as count FROM merchants WHERE code LIKE ?',
          [`LONG_${i}_%`]
        );
        expect(merchants[0].count).toBe(50);
      }
    });

    it('应该能够从错误中恢复', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过错误恢复测试 - MySQL不可用');
        return;
      }

      // 故意制造一些错误，然后验证系统能够恢复
      const mixedOperations = [];
      
      for (let i = 0; i < adapters.length; i++) {
        const adapter = adapters[i];
        
        // 正常操作
        mixedOperations.push(
          adapter.run(
            'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
            [`恢复测试商户${i}`, `RECOVERY_${i}`, 'active']
          ).catch(error => ({ error, index: i, type: 'normal' }))
        );
        
        // 错误操作（违反约束）
        mixedOperations.push(
          adapter.run(
            'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
            [null, `RECOVERY_ERROR_${i}`, 'active'] // name不能为null
          ).catch(error => ({ error, index: i, type: 'error' }))
        );
      }

      const results = await Promise.all(mixedOperations);
      
      // 验证正常操作成功，错误操作失败
      const normalResults = results.filter((_, index) => index % 2 === 0);
      const errorResults = results.filter((_, index) => index % 2 === 1);
      
      normalResults.forEach(result => {
        if (!result.error) {
          expect(result.lastID).toBeDefined();
          expect(result.changes).toBe(1);
        }
      });
      
      errorResults.forEach(result => {
        expect(result).toHaveProperty('error');
      });

      // 验证系统仍然可以正常工作
      for (let i = 0; i < adapters.length; i++) {
        const healthCheck = await toolkits[i].performCompleteHealthCheck();
        expect(healthCheck.connection).toBe(true);
        
        // 验证可以继续执行正常操作
        const result = await adapters[i].run(
          'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
          [`恢复后商户${i}`, `POST_RECOVERY_${i}`, 'active']
        );
        expect(result.lastID).toBeDefined();
        expect(result.changes).toBe(1);
      }
    });

    it('应该能够维持一致的性能表现', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过性能一致性测试 - MySQL不可用');
        return;
      }

      // 多轮性能测试
      const performanceRounds = [];
      
      for (let round = 0; round < 3; round++) {
        const roundPromises = toolkits.map(async (toolkit, index) => {
          const startTime = Date.now();
          
          // 执行标准化的操作集
          await toolkit.runPerformanceBenchmark({
            insertCount: 5,
            selectCount: 10,
            updateCount: 3,
            deleteCount: 2
          });
          
          const endTime = Date.now();
          return {
            round,
            toolkitIndex: index,
            duration: endTime - startTime
          };
        });
        
        const roundResults = await Promise.all(roundPromises);
        performanceRounds.push(roundResults);
      }

      // 分析性能一致性
      const allDurations = performanceRounds.flat().map(r => r.duration);
      const avgDuration = allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length;
      const maxDuration = Math.max(...allDurations);
      const minDuration = Math.min(...allDurations);
      
      // 验证性能变化在合理范围内（不超过平均值的50%）
      const variationThreshold = avgDuration * 0.5;
      expect(maxDuration - minDuration).toBeLessThan(variationThreshold);
      
      console.log(`性能一致性测试结果: 平均${avgDuration}ms, 最大${maxDuration}ms, 最小${minDuration}ms`);
    });
  });
});