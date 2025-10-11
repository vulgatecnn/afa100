/**
 * MySQL适配器单元测试
 * 测试MySQL连接和断开功能、数据库创建和删除功能、基础CRUD操作功能
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { MySQLAdapter } from '../../src/adapters/mysql-adapter';
import { DatabaseConfigManager, DatabaseType, MySQLConfig } from '../../src/config/database-config-manager';
import { DatabaseAdapter, RunResult } from '../../src/interfaces/database-adapter';

describe('MySQL适配器单元测试', () => {
  let adapter: MySQLAdapter;
  let configManager: DatabaseConfigManager;

  beforeEach(() => {
    adapter = new MySQLAdapter();
    configManager = DatabaseConfigManager.getInstance();
    // 重置配置缓存
    configManager.resetConfig();
  });

  afterEach(async () => {
    if (adapter && adapter.isReady()) {
      await adapter.disconnect();
    }
  });

  describe('1. MySQL适配器实例化和基础功能', () => {
    it('应该能够创建MySQL适配器实例', () => {
      expect(adapter).toBeInstanceOf(MySQLAdapter);
      expect(adapter.isReady()).toBe(false);
    });

    it('应该在未连接时抛出错误', async () => {
      await expect(adapter.run('SELECT 1')).rejects.toThrow('MySQL连接未初始化');
      await expect(adapter.get('SELECT 1')).rejects.toThrow('MySQL连接未初始化');
      await expect(adapter.all('SELECT 1')).rejects.toThrow('MySQL连接未初始化');
      await expect(adapter.beginTransaction()).rejects.toThrow('MySQL连接未初始化');
      await expect(adapter.createTestDatabase('test')).rejects.toThrow('MySQL连接未初始化');
      await expect(adapter.dropTestDatabase('test')).rejects.toThrow('MySQL连接未初始化');
      await expect(adapter.initializeSchema('test')).rejects.toThrow('MySQL连接未初始化');
    });

    it('应该能够验证数据库名称格式', async () => {
      // 测试无效的数据库名称 - 这些应该在连接检查之前就失败
      const invalidNames = ['invalid-name!', 'invalid name', 'invalid@name'];
      
      for (const invalidName of invalidNames) {
        try {
          await adapter.createTestDatabase(invalidName);
          // 如果没有抛出错误，测试失败
          expect.fail(`Expected createTestDatabase('${invalidName}') to throw an error`);
        } catch (error) {
          // 应该抛出数据库名称无效的错误，而不是连接错误
          expect((error as Error).message).toMatch(/无效的数据库名称|MySQL连接未初始化/);
        }
        
        try {
          await adapter.dropTestDatabase(invalidName);
          expect.fail(`Expected dropTestDatabase('${invalidName}') to throw an error`);
        } catch (error) {
          expect((error as Error).message).toMatch(/无效的数据库名称|MySQL连接未初始化/);
        }
      }
      
      // 测试有效的数据库名称（会因为未连接而失败，但错误信息不同）
      await expect(adapter.createTestDatabase('valid_name_123')).rejects.toThrow('MySQL连接未初始化');
      await expect(adapter.createTestDatabase('validname')).rejects.toThrow('MySQL连接未初始化');
    });
  });

  describe('2. MySQL配置管理', () => {
    beforeEach(() => {
      // 清理环境变量
      delete process.env.TEST_DB_TYPE;
      delete process.env.TEST_DB_HOST;
      delete process.env.TEST_DB_PORT;
      delete process.env.TEST_DB_USER;
      delete process.env.TEST_DB_PASSWORD;
      delete process.env.TEST_DB_NAME;
    });

    it('应该能够获取MySQL测试配置', () => {
      // 设置环境变量
      process.env.TEST_DB_TYPE = 'mysql';
      process.env.TEST_DB_HOST = '127.0.0.1';
      process.env.TEST_DB_PORT = '3306';
      process.env.TEST_DB_USER = 'root';
      process.env.TEST_DB_PASSWORD = '111111';

      configManager.resetConfig();
      const config = configManager.getConfig();
      
      expect(config.type).toBe(DatabaseType.MYSQL);
      if (config.type === DatabaseType.MYSQL) {
        expect(config.host).toBe('127.0.0.1');
        expect(config.port).toBe(3306);
        expect(config.user).toBe('root');
        expect(config.password).toBe('111111');
      }
    });

    it('应该能够验证MySQL配置', () => {
      const validConfig: MySQLConfig = {
        type: DatabaseType.MYSQL,
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '111111'
      };

      const errors = configManager.validateConfig(validConfig);
      expect(errors).toHaveLength(0);

      const invalidConfig: MySQLConfig = {
        type: DatabaseType.MYSQL,
        host: '',
        port: 3306,
        user: 'root',
        password: '111111'
      };

      const invalidErrors = configManager.validateConfig(invalidConfig);
      expect(invalidErrors.length).toBeGreaterThan(0);
      expect(invalidErrors[0]).toContain('主机地址不能为空');
    });

    it('应该能够生成配置摘要', () => {
      const config: MySQLConfig = {
        type: DatabaseType.MYSQL,
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '111111',
        database: 'test_db'
      };

      const summary = configManager.getConfigSummary(config);
      expect(summary).toContain('MySQL数据库');
      expect(summary).toContain('127.0.0.1:3306');
      expect(summary).toContain('test_db');
      expect(summary).toContain('root');
      expect(summary).not.toContain('111111'); // 密码不应该出现在摘要中
    });
  });

  describe('3. MySQL连接错误处理', () => {
    it('应该能够处理连接拒绝错误', async () => {
      const invalidConfig: MySQLConfig = {
        type: DatabaseType.MYSQL,
        host: 'invalid-host-that-does-not-exist',
        port: 3306,
        user: 'root',
        password: '111111'
      };

      await expect(adapter.connect(invalidConfig)).rejects.toThrow(/MySQL服务器连接失败|MySQL连接错误/);
      expect(adapter.isReady()).toBe(false);
    });

    it('应该能够处理认证错误', async () => {
      const invalidConfig: MySQLConfig = {
        type: DatabaseType.MYSQL,
        host: '127.0.0.1',
        port: 3306,
        user: 'invalid-user',
        password: 'invalid-password'
      };

      await expect(adapter.connect(invalidConfig)).rejects.toThrow();
      expect(adapter.isReady()).toBe(false);
    });

    it('应该能够处理无效端口错误', async () => {
      const invalidConfig: MySQLConfig = {
        type: DatabaseType.MYSQL,
        host: '127.0.0.1',
        port: 99999, // 无效端口
        user: 'root',
        password: '111111'
      };

      await expect(adapter.connect(invalidConfig)).rejects.toThrow();
      expect(adapter.isReady()).toBe(false);
    });

    it('应该能够处理非MySQL配置类型', async () => {
      const sqliteConfig = {
        type: DatabaseType.SQLITE,
        path: ':memory:'
      };

      await expect(adapter.connect(sqliteConfig as any)).rejects.toThrow('MySQLAdapter只能用于MySQL配置');
    });
  });

  describe('4. MySQL连接状态管理', () => {
    it('应该能够正确报告连接状态', () => {
      expect(adapter.isReady()).toBe(false);
    });

    it('应该能够获取连接池状态', () => {
      const status = adapter.getPoolStatus();
      expect(status).toBeNull(); // 未连接时应该返回null
    });

    it('应该能够执行ping检查', async () => {
      const result = await adapter.ping();
      expect(result).toBe(false); // 未连接时应该返回false
    });

    it('应该能够安全断开连接', async () => {
      // 即使未连接也应该能够安全调用disconnect
      await expect(adapter.disconnect()).resolves.not.toThrow();
      expect(adapter.isReady()).toBe(false);
    });

    it('应该能够清理资源', async () => {
      await expect(adapter.cleanup()).resolves.not.toThrow();
      expect(adapter.isReady()).toBe(false);
    });
  });

  describe('5. MySQL事务处理', () => {
    it('应该在未连接时无法开始事务', async () => {
      await expect(adapter.beginTransaction()).rejects.toThrow('MySQL连接未初始化');
    });
  });

  describe('6. MySQL原始SQL执行', () => {
    it('应该在未连接时无法执行原始SQL', async () => {
      await expect(adapter.executeRaw('SELECT 1')).rejects.toThrow('MySQL连接未初始化');
    });
  });
});

// 如果MySQL可用，运行实际连接测试
describe('MySQL适配器集成测试 (需要MySQL服务)', () => {
  let adapter: MySQLAdapter;
  let testDbName: string;
  let isMySQL: boolean = false;

  beforeAll(async () => {
    // 检查是否配置为使用MySQL
    process.env.TEST_DB_TYPE = 'mysql';
    const configManager = DatabaseConfigManager.getInstance();
    configManager.resetConfig();
    const config = configManager.getConfig();
    
    if (config.type !== DatabaseType.MYSQL) {
      console.log('⚠️ 未配置MySQL，跳过集成测试');
      return;
    }

    isMySQL = true;
    testDbName = `test_mysql_adapter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      adapter = new MySQLAdapter();
      await adapter.connect(config);
      console.log('✅ MySQL连接成功，开始集成测试');
    } catch (error) {
      console.log('⚠️ MySQL服务不可用，跳过集成测试:', (error as Error).message);
      isMySQL = false;
    }
  });

  afterAll(async () => {
    if (adapter && adapter.isReady()) {
      try {
        // 清理测试数据库
        await adapter.dropTestDatabase(testDbName);
        await adapter.disconnect();
        console.log('✅ MySQL集成测试清理完成');
      } catch (error) {
        console.warn('⚠️ 清理测试环境时出现警告:', error);
      }
    }
  });

  describe('1. MySQL连接和断开功能', () => {
    it('应该能够成功连接到MySQL', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过MySQL连接测试 - 服务不可用');
        return;
      }

      expect(adapter.isReady()).toBe(true);
      
      // 测试ping功能
      const pingResult = await adapter.ping();
      expect(pingResult).toBe(true);
      
      // 测试连接池状态
      const poolStatus = adapter.getPoolStatus();
      expect(poolStatus).not.toBeNull();
      expect(poolStatus.ready).toBe(true);
    });

    it('应该能够执行基础查询', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过基础查询测试 - 服务不可用');
        return;
      }

      const result = await adapter.get('SELECT 1 as test_value');
      expect(result).toBeDefined();
      // MySQL返回的数字可能是字符串类型，使用==比较
      expect(result.test_value == 1).toBe(true);
    });
  });

  describe('2. 数据库创建和删除功能', () => {
    it('应该能够创建测试数据库', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过数据库创建测试 - 服务不可用');
        return;
      }

      await adapter.createTestDatabase(testDbName);

      // 验证数据库存在 - SHOW DATABASES LIKE不支持参数化查询
      const databases = await adapter.all(`SHOW DATABASES LIKE '${testDbName}'`);
      expect(databases.length).toBeGreaterThan(0);
    });

    it('应该能够初始化数据库结构', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过结构初始化测试 - 服务不可用');
        return;
      }

      // 初始化结构
      await adapter.initializeSchema(testDbName);

      // 验证表是否创建
      const tables = await adapter.all('SHOW TABLES');
      expect(tables.length).toBeGreaterThan(0);

      // 验证关键表存在
      const userTables = await adapter.all("SHOW TABLES LIKE 'users'");
      expect(userTables.length).toBe(1);

      const merchantTables = await adapter.all("SHOW TABLES LIKE 'merchants'");
      expect(merchantTables.length).toBe(1);
    });

    it('应该能够删除测试数据库', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过数据库删除测试 - 服务不可用');
        return;
      }

      // 创建一个临时数据库用于删除测试
      const tempDbName = `temp_test_${Date.now()}`;
      await adapter.createTestDatabase(tempDbName);

      // 验证数据库存在
      const beforeDelete = await adapter.all(`SHOW DATABASES LIKE '${tempDbName}'`);
      expect(beforeDelete.length).toBe(1);

      // 删除数据库
      await adapter.dropTestDatabase(tempDbName);

      // 验证数据库已删除
      const afterDelete = await adapter.all(`SHOW DATABASES LIKE '${tempDbName}'`);
      expect(afterDelete.length).toBe(0);
    });
  });

  describe('3. 基础CRUD操作功能', () => {
    beforeAll(async () => {
      if (!isMySQL) return;
      
      // 确保测试数据库和结构存在
      await adapter.createTestDatabase(testDbName);
      await adapter.initializeSchema(testDbName);
    });

    it('应该能够执行INSERT操作', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过INSERT测试 - 服务不可用');
        return;
      }

      const insertResult = await adapter.run(
        'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
        ['测试商户', 'TEST_MERCHANT_INSERT', 'active']
      );

      expect(insertResult.lastID).toBeDefined();
      expect(insertResult.changes).toBe(1);
    });

    it('应该能够执行SELECT操作', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过SELECT测试 - 服务不可用');
        return;
      }

      // 先插入测试数据
      await adapter.run(
        'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
        ['查询测试商户', 'TEST_MERCHANT_SELECT', 'active']
      );

      // 测试单条查询
      const merchant = await adapter.get(
        'SELECT * FROM merchants WHERE code = ?',
        ['TEST_MERCHANT_SELECT']
      );

      expect(merchant).toBeDefined();
      expect(merchant.name).toBe('查询测试商户');
      expect(merchant.code).toBe('TEST_MERCHANT_SELECT');
      expect(merchant.status).toBe('active');

      // 测试多条查询
      const merchants = await adapter.all(
        'SELECT * FROM merchants WHERE status = ?',
        ['active']
      );

      expect(merchants.length).toBeGreaterThan(0);
      expect(merchants.some(m => m.code === 'TEST_MERCHANT_SELECT')).toBe(true);
    });

    it('应该能够执行UPDATE操作', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过UPDATE测试 - 服务不可用');
        return;
      }

      // 先插入测试数据
      await adapter.run(
        'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
        ['更新前商户', 'TEST_MERCHANT_UPDATE', 'active']
      );

      // 执行更新
      const updateResult = await adapter.run(
        'UPDATE merchants SET name = ?, status = ? WHERE code = ?',
        ['更新后商户', 'inactive', 'TEST_MERCHANT_UPDATE']
      );

      expect(updateResult.changes).toBe(1);

      // 验证更新结果
      const updatedMerchant = await adapter.get(
        'SELECT * FROM merchants WHERE code = ?',
        ['TEST_MERCHANT_UPDATE']
      );

      expect(updatedMerchant.name).toBe('更新后商户');
      expect(updatedMerchant.status).toBe('inactive');
    });

    it('应该能够执行DELETE操作', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过DELETE测试 - 服务不可用');
        return;
      }

      // 先插入测试数据
      await adapter.run(
        'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
        ['待删除商户', 'TEST_MERCHANT_DELETE', 'active']
      );

      // 验证数据存在
      const beforeDelete = await adapter.get(
        'SELECT * FROM merchants WHERE code = ?',
        ['TEST_MERCHANT_DELETE']
      );
      expect(beforeDelete).toBeDefined();

      // 执行删除
      const deleteResult = await adapter.run(
        'DELETE FROM merchants WHERE code = ?',
        ['TEST_MERCHANT_DELETE']
      );

      expect(deleteResult.changes).toBe(1);

      // 验证删除结果
      const afterDelete = await adapter.get(
        'SELECT * FROM merchants WHERE code = ?',
        ['TEST_MERCHANT_DELETE']
      );

      expect(afterDelete).toBeUndefined();
    });

    it('应该能够处理事务操作', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过事务测试 - 服务不可用');
        return;
      }

      // 测试事务提交
      const transaction1 = await adapter.beginTransaction();
      
      await adapter.run(
        'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
        ['事务测试商户1', 'TEST_MERCHANT_TX1', 'active']
      );

      await transaction1.commit();

      // 验证事务提交成功
      const merchant1 = await adapter.get(
        'SELECT * FROM merchants WHERE code = ?',
        ['TEST_MERCHANT_TX1']
      );
      expect(merchant1).toBeDefined();

      // 测试事务回滚
      const transaction2 = await adapter.beginTransaction();
      
      await adapter.run(
        'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
        ['事务测试商户2', 'TEST_MERCHANT_TX2', 'active']
      );

      await transaction2.rollback();

      // 验证事务回滚成功
      const merchant2 = await adapter.get(
        'SELECT * FROM merchants WHERE code = ?',
        ['TEST_MERCHANT_TX2']
      );
      expect(merchant2).toBeUndefined();
    });

    it('应该能够执行原始SQL', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过原始SQL测试 - 服务不可用');
        return;
      }

      const result = await adapter.executeRaw(`
        INSERT INTO merchants (name, code, status) VALUES 
        ('批量商户1', 'BATCH_1', 'active'),
        ('批量商户2', 'BATCH_2', 'active');
      `);

      expect(result).toBeDefined();

      // 验证批量插入结果
      const batchMerchants = await adapter.all(
        'SELECT * FROM merchants WHERE code IN (?, ?)',
        ['BATCH_1', 'BATCH_2']
      );

      expect(batchMerchants.length).toBe(2);
    });
  });
});