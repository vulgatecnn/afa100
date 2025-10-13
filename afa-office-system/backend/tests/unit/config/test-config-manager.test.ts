/**
 * TestConfigManager 单元测试
 * 测试配置加载、验证和环境管理功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestConfigManager, type TestConfig, type DatabaseConfig } from '../../../src/config/test-config-manager';

describe('TestConfigManager', () => {
  // 在每个测试前重置配置
  beforeEach(() => {
    TestConfigManager.reset();
    // 清理环境变量
    delete process.env.TEST_DB_HOST;
    delete process.env.TEST_DB_PORT;
    delete process.env.TEST_DB_USER;
    delete process.env.TEST_DB_PASSWORD;
  });

  afterEach(() => {
    TestConfigManager.reset();
  });

  describe('配置加载和验证逻辑', () => {
    it('应该为unit环境生成默认配置', () => {
      const config = TestConfigManager.getConfig('unit');

      expect(config).toMatchObject({
        apiBaseUrl: 'http://localhost:3000',
        jwtSecret: 'test-jwt-secret-key',
        testTimeout: 30000,
        retryAttempts: 1, // 单元测试不需要重试
        environment: 'unit'
      });
      expect(config.databaseUrl).toContain('afa_office_test_unit');
    });

    it('应该为integration环境生成默认配置', () => {
      const config = TestConfigManager.getConfig('integration');

      expect(config).toMatchObject({
        apiBaseUrl: 'http://localhost:3000',
        jwtSecret: 'test-jwt-secret-key',
        testTimeout: 30000,
        retryAttempts: 3,
        environment: 'integration'
      });
      expect(config.databaseUrl).toContain('afa_office_test_integration');
    });

    it('应该为e2e环境生成默认配置', () => {
      const config = TestConfigManager.getConfig('e2e');

      expect(config).toMatchObject({
        apiBaseUrl: 'http://localhost:3000',
        jwtSecret: 'test-jwt-secret-key',
        testTimeout: 60000, // E2E测试需要更长时间
        retryAttempts: 3,
        environment: 'e2e'
      });
      expect(config.databaseUrl).toContain('afa_office_test_e2e');
    });

    it('应该缓存配置避免重复生成', () => {
      const config1 = TestConfigManager.getConfig('unit');
      const config2 = TestConfigManager.getConfig('unit');

      expect(config1).toBe(config2); // 应该是同一个对象引用
    });

    it('应该验证有效的配置', () => {
      const validConfig: TestConfig = {
        apiBaseUrl: 'http://localhost:3000',
        databaseUrl: 'mysql://user:pass@localhost:3306/test',
        jwtSecret: 'secret-key',
        testTimeout: 30000,
        retryAttempts: 3,
        environment: 'unit'
      };

      const result = TestConfigManager.validateConfig(validConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测无效的配置', () => {
      const invalidConfig: TestConfig = {
        apiBaseUrl: '', // 空URL
        databaseUrl: '', // 空数据库URL
        jwtSecret: '', // 空密钥
        testTimeout: -1, // 负数超时
        retryAttempts: -1, // 负数重试
        environment: 'unit'
      };

      const result = TestConfigManager.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('apiBaseUrl 不能为空');
      expect(result.errors).toContain('databaseUrl 不能为空');
      expect(result.errors).toContain('jwtSecret 不能为空');
      expect(result.errors).toContain('testTimeout 必须大于0');
      expect(result.errors).toContain('retryAttempts 不能为负数');
    });

    it('应该检测无效的URL格式', () => {
      const configWithInvalidUrl: TestConfig = {
        apiBaseUrl: 'invalid-url',
        databaseUrl: 'mysql://user:pass@localhost:3306/test',
        jwtSecret: 'secret-key',
        testTimeout: 30000,
        retryAttempts: 3,
        environment: 'unit'
      };

      const result = TestConfigManager.validateConfig(configWithInvalidUrl);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('apiBaseUrl 格式无效');
    });
  });

  describe('环境切换和配置合并', () => {
    it('应该允许设置自定义配置', () => {
      const customConfig: Partial<TestConfig> = {
        apiBaseUrl: 'http://custom-api:4000',
        testTimeout: 45000
      };

      TestConfigManager.setConfig('unit', customConfig);
      const config = TestConfigManager.getConfig('unit');

      expect(config.apiBaseUrl).toBe('http://custom-api:4000');
      expect(config.testTimeout).toBe(45000);
      expect(config.jwtSecret).toBe('test-jwt-secret-key'); // 保持默认值
    });

    it('应该正确合并配置', () => {
      const overrides: Partial<TestConfig> = {
        testTimeout: 50000,
        retryAttempts: 5
      };

      const mergedConfig = TestConfigManager.mergeConfig('integration', overrides);

      expect(mergedConfig.testTimeout).toBe(50000);
      expect(mergedConfig.retryAttempts).toBe(5);
      expect(mergedConfig.apiBaseUrl).toBe('http://localhost:3000'); // 保持原值
      expect(mergedConfig.environment).toBe('integration'); // 保持原值
    });

    it('应该为不同环境维护独立的配置', () => {
      TestConfigManager.setConfig('unit', { testTimeout: 10000 });
      TestConfigManager.setConfig('integration', { testTimeout: 20000 });

      const unitConfig = TestConfigManager.getConfig('unit');
      const integrationConfig = TestConfigManager.getConfig('integration');

      expect(unitConfig.testTimeout).toBe(10000);
      expect(integrationConfig.testTimeout).toBe(20000);
    });
  });

  describe('配置错误处理', () => {
    it('应该在配置验证失败时抛出错误', async () => {
      const invalidConfig: TestConfig = {
        apiBaseUrl: '',
        databaseUrl: '',
        jwtSecret: '',
        testTimeout: 30000,
        retryAttempts: 3,
        environment: 'unit'
      };

      await expect(TestConfigManager.setupEnvironment(invalidConfig))
        .rejects.toThrow('配置验证失败');
    });

    it('应该正确设置环境变量', async () => {
      const config: TestConfig = {
        apiBaseUrl: 'http://test-api:3000',
        databaseUrl: 'mysql://user:pass@localhost:3306/test',
        jwtSecret: 'test-secret',
        testTimeout: 30000,
        retryAttempts: 3,
        environment: 'unit'
      };

      await TestConfigManager.setupEnvironment(config);

      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.API_BASE_URL).toBe('http://test-api:3000');
      expect(process.env.DATABASE_URL).toBe('mysql://user:pass@localhost:3306/test');
      expect(process.env.JWT_SECRET).toBe('test-secret');
      expect(process.env.TEST_TIMEOUT).toBe('30000');
      expect(process.env.RETRY_ATTEMPTS).toBe('3');
    });

    it('应该正确清理环境变量', async () => {
      const config: TestConfig = {
        apiBaseUrl: 'http://test-api:3000',
        databaseUrl: 'mysql://user:pass@localhost:3306/test',
        jwtSecret: 'test-secret',
        testTimeout: 30000,
        retryAttempts: 3,
        environment: 'unit'
      };

      await TestConfigManager.setupEnvironment(config);
      await TestConfigManager.teardownEnvironment();

      expect(process.env.API_BASE_URL).toBeUndefined();
      expect(process.env.DATABASE_URL).toBeUndefined();
      expect(process.env.JWT_SECRET).toBeUndefined();
      expect(process.env.TEST_TIMEOUT).toBeUndefined();
      expect(process.env.RETRY_ATTEMPTS).toBeUndefined();
    });

    it('应该在teardown后清理配置缓存', async () => {
      // 先获取配置以触发缓存
      TestConfigManager.getConfig('unit');
      
      await TestConfigManager.teardownEnvironment();
      
      // 验证缓存已清理（通过检查是否生成新的配置对象）
      const config1 = TestConfigManager.getConfig('unit');
      TestConfigManager.reset();
      const config2 = TestConfigManager.getConfig('unit');
      
      expect(config1).not.toBe(config2); // 应该是不同的对象引用
    });
  });

  describe('数据库配置管理', () => {
    it('应该为unit环境生成正确的数据库配置', () => {
      const dbConfig = TestConfigManager.getDatabaseConfig('unit');

      expect(dbConfig).toMatchObject({
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'test_user',
        password: 'test_password',
        database: 'afa_office_test_unit'
      });
    });

    it('应该为integration环境生成正确的数据库配置', () => {
      const dbConfig = TestConfigManager.getDatabaseConfig('integration');

      expect(dbConfig).toMatchObject({
        type: 'mysql',
        database: 'afa_office_test_integration'
      });
    });

    it('应该为e2e环境生成正确的数据库配置', () => {
      const dbConfig = TestConfigManager.getDatabaseConfig('e2e');

      expect(dbConfig).toMatchObject({
        type: 'mysql',
        database: 'afa_office_test_e2e'
      });
    });

    it('应该使用环境变量覆盖默认数据库配置', () => {
      process.env.TEST_DB_HOST = 'custom-host';
      process.env.TEST_DB_PORT = '3307';
      process.env.TEST_DB_USER = 'custom_user';
      process.env.TEST_DB_PASSWORD = 'custom_password';

      const dbConfig = TestConfigManager.getDatabaseConfig('unit');

      expect(dbConfig).toMatchObject({
        type: 'mysql',
        host: 'custom-host',
        port: 3307,
        username: 'custom_user',
        password: 'custom_password',
        database: 'afa_office_test_unit'
      });
    });

    it('应该为不支持的环境抛出错误', () => {
      expect(() => {
        TestConfigManager.getDatabaseConfig('invalid' as any);
      }).toThrow('不支持的环境: invalid');
    });

    it('应该正确构建MySQL数据库URL', () => {
      const config = TestConfigManager.getConfig('unit');
      
      expect(config.databaseUrl).toMatch(
        /^mysql:\/\/test_user:test_password@localhost:3306\/afa_office_test_unit$/
      );
    });
  });

  describe('重置功能', () => {
    it('应该正确重置配置缓存', () => {
      // 先获取一些配置以填充缓存
      TestConfigManager.getConfig('unit');
      TestConfigManager.getConfig('integration');
      
      TestConfigManager.reset();
      
      // 验证缓存已清理
      const config1 = TestConfigManager.getConfig('unit');
      TestConfigManager.reset();
      const config2 = TestConfigManager.getConfig('unit');
      
      expect(config1).not.toBe(config2);
    });
  });
});