/**
 * MySQL环境集成测试
 * 测试完整的MySQL测试环境生命周期、验证环境隔离的有效性、测试并发环境的稳定性
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { MySQLAdapter } from '../../src/adapters/mysql-adapter';
import { DatabaseConfigManager, DatabaseType, MySQLConfig } from '../../src/config/database-config-manager';
import { createMySQLTestToolkit } from '../../tests/helpers/mysql-test-tools';

describe('MySQL环境集成测试', () => {
  let isMySQL: boolean = false;
  let config: MySQLConfig;

  beforeAll(async () => {
    // 检查是否配置为使用MySQL
    process.env.TEST_DB_TYPE = 'mysql';
    const configManager = DatabaseConfigManager.getInstance();
    configManager.resetConfig();
    const testConfig = configManager.getConfig();
    
    if (testConfig.type !== DatabaseType.MYSQL) {
      console.log('⚠️ 未配置MySQL，跳过环境集成测试');
      return;
    }

    config = testConfig as MySQLConfig;
    
    try {
      // 测试MySQL连接
      const testAdapter = new MySQLAdapter();
      await testAdapter.connect(config);
      await testAdapter.disconnect();
      isMySQL = true;
      console.log('✅ MySQL服务可用，开始环境集成测试');
    } catch (error) {
      console.log('⚠️ MySQL服务不可用，跳过环境集成测试:', (error as Error).message);
      isMySQL = false;
    }
  });

  describe('1. 完整的MySQL测试环境生命周期', () => {
    let adapter: MySQLAdapter;
    let toolkit: any;
    let testDbName: string;

    beforeEach(async () => {
      if (!isMySQL) return;
      
      testDbName = `test_env_lifecycle_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      adapter = new MySQLAdapter();
      await adapter.connect(config);
      toolkit = createMySQLTestToolkit(adapter);
    });

    afterEach(async () => {
      if (!isMySQL || !adapter) return;
      
      try {
        await adapter.dropTestDatabase(testDbName);
        await adapter.disconnect();
      } catch (error) {
        console.warn('清理测试环境时出现警告:', error);
      }
    });

    it('应该能够完整创建和初始化测试环境', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过环境生命周期测试 - MySQL不可用');
        return;
      }

      // 1. 创建测试数据库
      await adapter.createTestDatabase(testDbName);
      
      // 验证数据库存在
      const databases = await adapter.all(`SHOW DATABASES LIKE '${testDbName}'`);
      expect(databases.length).toBe(1);

      // 2. 初始化数据库结构
      await adapter.initializeSchema(testDbName);
      
      // 验证表结构
      const tables = await adapter.all('SHOW TABLES');
      expect(tables.length).toBeGreaterThan(0);
      
      // 验证关键表存在
      const merchantTables = await adapter.all("SHOW TABLES LIKE 'merchants'");
      expect(merchantTables.length).toBe(1);
      
      const userTables = await adapter.all("SHOW TABLES LIKE 'users'");
      expect(userTables.length).toBe(1);

      // 3. 测试基础数据操作
      const insertResult = await adapter.run(
        'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
        ['环境测试商户', 'ENV_TEST', 'active']
      );
      expect(insertResult.lastID).toBeDefined();

      const merchant = await adapter.get(
        'SELECT * FROM merchants WHERE code = ?',
        ['ENV_TEST']
      );
      expect(merchant).toBeDefined();
      expect(merchant.name).toBe('环境测试商户');
    });

    it('应该能够使用工具套件初始化环境', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过工具套件测试 - MySQL不可用');
        return;
      }

      // 使用工具套件初始化环境
      await toolkit.initializeTestEnvironment(testDbName);
      
      // 验证环境状态
      const status = toolkit.getToolkitStatus();
      expect(status.adapterReady).toBe(true);
      
      // 验证连接健康
      const healthCheck = await toolkit.performCompleteHealthCheck();
      expect(healthCheck.connection).toBe(true);
      expect(healthCheck.overall).toBe(true);
    });

    it('应该能够完整清理测试环境', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过环境清理测试 - MySQL不可用');
        return;
      }

      // 先创建和初始化环境
      await toolkit.initializeTestEnvironment(testDbName);
      
      // 添加一些测试数据
      await adapter.run(
        'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
        ['待清理商户', 'CLEANUP_TEST', 'active']
      );
      
      // 验证数据存在
      const beforeCleanup = await adapter.get(
        'SELECT * FROM merchants WHERE code = ?',
        ['CLEANUP_TEST']
      );
      expect(beforeCleanup).toBeDefined();
      
      // 清理环境
      await toolkit.cleanupTestEnvironment(testDbName);
      
      // 验证数据库已删除
      const databases = await adapter.all(`SHOW DATABASES LIKE '${testDbName}'`);
      expect(databases.length).toBe(0);
    });
  });

  describe('2. 环境隔离有效性验证', () => {
    let adapter1: MySQLAdapter;
    let adapter2: MySQLAdapter;
    let testDbName1: string;
    let testDbName2: string;

    beforeEach(async () => {
      if (!isMySQL) return;
      
      testDbName1 = `test_isolation_1_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      testDbName2 = `test_isolation_2_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      adapter1 = new MySQLAdapter();
      adapter2 = new MySQLAdapter();
      
      await adapter1.connect(config);
      await adapter2.connect(config);
    });

    afterEach(async () => {
      if (!isMySQL) return;
      
      try {
        if (adapter1) {
          await adapter1.dropTestDatabase(testDbName1);
          await adapter1.disconnect();
        }
        if (adapter2) {
          await adapter2.dropTestDatabase(testDbName2);
          await adapter2.disconnect();
        }
      } catch (error) {
        console.warn('清理隔离测试环境时出现警告:', error);
      }
    });

    it('应该能够创建完全隔离的测试环境', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过环境隔离测试 - MySQL不可用');
        return;
      }

      // 创建两个独立的测试环境
      await adapter1.createTestDatabase(testDbName1);
      await adapter1.initializeSchema(testDbName1);
      
      await adapter2.createTestDatabase(testDbName2);
      await adapter2.initializeSchema(testDbName2);
      
      // 在环境1中插入数据
      await adapter1.run(
        'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
        ['环境1商户', 'ENV1_MERCHANT', 'active']
      );
      
      // 在环境2中插入不同数据
      await adapter2.run(
        'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
        ['环境2商户', 'ENV2_MERCHANT', 'active']
      );
      
      // 验证环境1只能看到自己的数据
      const env1Merchants = await adapter1.all('SELECT * FROM merchants');
      expect(env1Merchants.length).toBe(1);
      expect(env1Merchants[0].code).toBe('ENV1_MERCHANT');
      
      // 验证环境2只能看到自己的数据
      const env2Merchants = await adapter2.all('SELECT * FROM merchants');
      expect(env2Merchants.length).toBe(1);
      expect(env2Merchants[0].code).toBe('ENV2_MERCHANT');
      
      // 验证环境1看不到环境2的数据
      const env1SearchEnv2 = await adapter1.get(
        'SELECT * FROM merchants WHERE code = ?',
        ['ENV2_MERCHANT']
      );
      expect(env1SearchEnv2).toBeUndefined();
      
      // 验证环境2看不到环境1的数据
      const env2SearchEnv1 = await adapter2.get(
        'SELECT * FROM merchants WHERE code = ?',
        ['ENV1_MERCHANT']
      );
      expect(env2SearchEnv1).toBeUndefined();
    });

    it('应该能够独立清理各个环境', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过独立清理测试 - MySQL不可用');
        return;
      }

      // 创建两个环境并添加数据
      await adapter1.createTestDatabase(testDbName1);
      await adapter1.initializeSchema(testDbName1);
      await adapter1.run(
        'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
        ['环境1商户', 'ENV1_CLEANUP', 'active']
      );
      
      await adapter2.createTestDatabase(testDbName2);
      await adapter2.initializeSchema(testDbName2);
      await adapter2.run(
        'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
        ['环境2商户', 'ENV2_CLEANUP', 'active']
      );
      
      // 清理环境1
      await adapter1.dropTestDatabase(testDbName1);
      
      // 验证环境1已清理
      const env1Databases = await adapter1.all(`SHOW DATABASES LIKE '${testDbName1}'`);
      expect(env1Databases.length).toBe(0);
      
      // 验证环境2仍然存在
      const env2Databases = await adapter2.all(`SHOW DATABASES LIKE '${testDbName2}'`);
      expect(env2Databases.length).toBe(1);
      
      // 验证环境2的数据仍然可访问
      const env2Merchant = await adapter2.get(
        'SELECT * FROM merchants WHERE code = ?',
        ['ENV2_CLEANUP']
      );
      expect(env2Merchant).toBeDefined();
      expect(env2Merchant.name).toBe('环境2商户');
    });
  });

  describe('3. 并发环境稳定性测试', () => {
    const concurrentEnvCount = 3;
    let adapters: MySQLAdapter[] = [];
    let testDbNames: string[] = [];

    beforeEach(async () => {
      if (!isMySQL) return;
      
      adapters = [];
      testDbNames = [];
      
      // 创建多个并发适配器
      for (let i = 0; i < concurrentEnvCount; i++) {
        const adapter = new MySQLAdapter();
        await adapter.connect(config);
        adapters.push(adapter);
        testDbNames.push(`test_concurrent_${i}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`);
      }
    });

    afterEach(async () => {
      if (!isMySQL) return;
      
      // 清理所有并发环境
      for (let i = 0; i < adapters.length; i++) {
        try {
          const adapter = adapters[i];
          const dbName = testDbNames[i];
          if (adapter && dbName) {
            await adapter.dropTestDatabase(dbName);
            await adapter.disconnect();
          }
        } catch (error) {
          console.warn(`清理并发环境${i}时出现警告:`, error);
        }
      }
    });

    it('应该能够并发创建多个测试环境', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过并发创建测试 - MySQL不可用');
        return;
      }

      // 并发创建所有测试环境
      const createPromises = adapters.map((adapter, index) => {
        const dbName = testDbNames[index];
        if (!dbName) throw new Error(`测试数据库名称未定义: index ${index}`);
        return adapter.createTestDatabase(dbName);
      });
      
      await Promise.all(createPromises);
      
      // 验证所有环境都创建成功
      for (let i = 0; i < adapters.length; i++) {
        const adapter = adapters[i];
        const dbName = testDbNames[i];
        if (adapter && dbName) {
          const databases = await adapter.all(`SHOW DATABASES LIKE '${dbName}'`);
          expect(databases.length).toBe(1);
        }
      }
    });

    it('应该能够并发初始化多个环境的结构', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过并发初始化测试 - MySQL不可用');
        return;
      }

      // 先创建所有数据库
      for (let i = 0; i < adapters.length; i++) {
        const adapter = adapters[i];
        const dbName = testDbNames[i];
        if (adapter && dbName) {
          await adapter.createTestDatabase(dbName);
        }
      }
      
      // 并发初始化结构
      const initPromises = adapters.map((adapter, index) => {
        const dbName = testDbNames[index];
        if (!dbName) throw new Error(`测试数据库名称未定义: index ${index}`);
        return adapter.initializeSchema(dbName);
      });
      
      await Promise.all(initPromises);
      
      // 验证所有环境的结构都初始化成功
      for (let i = 0; i < adapters.length; i++) {
        const adapter = adapters[i];
        if (adapter) {
          const tables = await adapter.all('SHOW TABLES');
          expect(tables.length).toBeGreaterThan(0);
          
          const merchantTables = await adapter.all("SHOW TABLES LIKE 'merchants'");
          expect(merchantTables.length).toBe(1);
        }
      }
    });

    it('应该能够并发执行数据操作而不互相干扰', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过并发数据操作测试 - MySQL不可用');
        return;
      }

      // 创建和初始化所有环境
      for (let i = 0; i < adapters.length; i++) {
        const adapter = adapters[i];
        const dbName = testDbNames[i];
        if (adapter && dbName) {
          await adapter.createTestDatabase(dbName);
          await adapter.initializeSchema(dbName);
        }
      }
      
      // 并发插入不同的数据
      const insertPromises = adapters.map((adapter, index) => 
        adapter.run(
          'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
          [`并发商户${index}`, `CONCURRENT_${index}`, 'active']
        )
      );
      
      const insertResults = await Promise.all(insertPromises);
      
      // 验证所有插入都成功
      insertResults.forEach(result => {
        expect(result.lastID).toBeDefined();
        expect(result.changes).toBe(1);
      });
      
      // 并发查询验证数据隔离
      const queryPromises = adapters.map((adapter, index) => 
        adapter.get('SELECT * FROM merchants WHERE code = ?', [`CONCURRENT_${index}`])
      );
      
      const queryResults = await Promise.all(queryPromises);
      
      // 验证每个环境只能看到自己的数据
      queryResults.forEach((merchant, index) => {
        expect(merchant).toBeDefined();
        expect(merchant.name).toBe(`并发商户${index}`);
        expect(merchant.code).toBe(`CONCURRENT_${index}`);
      });
      
      // 验证环境间数据隔离
      for (let i = 0; i < adapters.length; i++) {
        const adapter = adapters[i];
        if (adapter) {
          for (let j = 0; j < adapters.length; j++) {
            if (i !== j) {
              const crossQuery = await adapter.get(
                'SELECT * FROM merchants WHERE code = ?',
                [`CONCURRENT_${j}`]
              );
              expect(crossQuery).toBeUndefined();
            }
          }
        }
      }
    });

    it('应该能够处理并发环境的异常情况', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过并发异常处理测试 - MySQL不可用');
        return;
      }

      // 创建环境
      for (let i = 0; i < adapters.length; i++) {
        const adapter = adapters[i];
        const dbName = testDbNames[i];
        if (adapter && dbName) {
          await adapter.createTestDatabase(dbName);
          await adapter.initializeSchema(dbName);
        }
      }
      
      // 模拟部分环境出现异常（尝试插入无效数据）
      const mixedPromises = adapters.map((adapter, index) => {
        if (index === 1) {
          // 第二个环境插入无效数据（违反约束）
          return adapter.run(
            'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
            [null, `INVALID_${index}`, 'active'] // name不能为null
          ).catch(error => ({ error, index }));
        } else {
          // 其他环境插入正常数据
          return adapter.run(
            'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
            [`正常商户${index}`, `NORMAL_${index}`, 'active']
          );
        }
      });
      
      const results = await Promise.all(mixedPromises);
      
      // 验证异常环境失败，其他环境成功
      results.forEach((result, index) => {
        if (index === 1) {
          expect(result).toHaveProperty('error');
        } else {
          expect(result).toHaveProperty('lastID');
          expect((result as any).changes).toBe(1);
        }
      });
      
      // 验证正常环境的数据仍然可访问
      for (let i = 0; i < adapters.length; i++) {
        const adapter = adapters[i];
        if (i !== 1 && adapter) {
          const merchant = await adapter.get(
            'SELECT * FROM merchants WHERE code = ?',
            [`NORMAL_${i}`]
          );
          expect(merchant).toBeDefined();
          expect(merchant.name).toBe(`正常商户${i}`);
        }
      }
    });
  });
});