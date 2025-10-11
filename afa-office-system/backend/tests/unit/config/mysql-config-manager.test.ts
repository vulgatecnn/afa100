/**
 * MySQL配置管理器单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock environment variables
vi.mock('dotenv', () => ({
  default: {
    config: vi.fn()
  }
}));
import {
  MySQLConfigManager,
  mySQLConfigManager,
  getMySQLConfigTemplate,
  validateMySQLConfig,
  getOptimizedMySQLConfig,
  getMySQLConfigSummary,
  checkMySQLCompatibility,
  getMySQLEnvironmentGuide
} from '../../../src/config/mysql-config-manager';
import { DatabaseType } from '../../../src/config/database-config-manager';

describe('MySQLConfigManager', () => {
  let configManager: MySQLConfigManager;

  beforeEach(() => {
    configManager = MySQLConfigManager.getInstance();
    configManager.clearCache();
  });

  afterEach(() => {
    configManager.clearCache();
  });

  describe('单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = MySQLConfigManager.getInstance();
      const instance2 = MySQLConfigManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('应该与导出的实例相同', () => {
      const instance = MySQLConfigManager.getInstance();
      expect(instance).toBe(mySQLConfigManager);
    });
  });

  describe('配置模板生成', () => {
    it('应该生成测试环境配置', () => {
      const config = configManager.getMySQLConfigTemplate('test');
      
      expect(config.type).toBe(DatabaseType.MYSQL);
      expect(config.host).toBe('127.0.0.1');
      expect(config.port).toBe(3306);
      expect(config.user).toBe('root');
      expect(config.password).toBe('111111');
      expect(config.connectionLimit).toBe(5); // 测试环境较小
      expect(config.charset).toBe('utf8mb4');
      expect(config.timezone).toBe('+00:00');
      expect(config.supportBigNumbers).toBe(true);
      expect(config.bigNumberStrings).toBe(true);
      expect(config.multipleStatements).toBe(true);
      expect(config.reconnect).toBe(true);
    });

    it('应该生成开发环境配置', () => {
      const config = configManager.getMySQLConfigTemplate('development');
      
      expect(config.type).toBe(DatabaseType.MYSQL);
      expect(config.connectionLimit).toBe(10); // 开发环境中等
    });

    it('应该生成生产环境配置', () => {
      const config = configManager.getMySQLConfigTemplate('production');
      
      expect(config.type).toBe(DatabaseType.MYSQL);
      expect(config.connectionLimit).toBe(20); // 生产环境较大
      expect(config.debug).toBe(false); // 生产环境关闭调试
    });

    it('应该缓存配置模板', () => {
      const config1 = configManager.getMySQLConfigTemplate('test');
      const config2 = configManager.getMySQLConfigTemplate('test');
      
      expect(config1).toBe(config2); // 应该是同一个对象引用
    });
  });

  describe('配置验证', () => {
    it('应该验证有效配置', () => {
      const validConfig = {
        type: DatabaseType.MYSQL,
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: 'password123',
        connectionLimit: 10,
        acquireTimeout: 30000,
        timeout: 30000
      };

      const result = configManager.validateMySQLConfig(validConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测无效的主机配置', () => {
      const invalidConfig = {
        type: DatabaseType.MYSQL,
        host: '',
        port: 3306,
        user: 'root',
        password: 'password123'
      };

      const result = configManager.validateMySQLConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MySQL主机地址不能为空');
    });

    it('应该检测无效的端口配置', () => {
      const invalidConfig = {
        type: DatabaseType.MYSQL,
        host: '127.0.0.1',
        port: 99999,
        user: 'root',
        password: 'password123'
      };

      const result = configManager.validateMySQLConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MySQL端口必须在1-65535之间');
    });

    it('应该检测空用户名', () => {
      const invalidConfig = {
        type: DatabaseType.MYSQL,
        host: '127.0.0.1',
        port: 3306,
        user: '',
        password: 'password123'
      };

      const result = configManager.validateMySQLConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MySQL用户名不能为空');
    });

    it('应该检测空密码', () => {
      const invalidConfig = {
        type: DatabaseType.MYSQL,
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: ''
      };

      const result = configManager.validateMySQLConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MySQL密码不能为空');
    });

    it('应该检测无效的连接池配置', () => {
      const invalidConfig = {
        type: DatabaseType.MYSQL,
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: 'password123',
        connectionLimit: -1
      };

      const result = configManager.validateMySQLConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('连接池大小必须大于0');
    });

    it('应该提供性能建议', () => {
      const config = {
        type: DatabaseType.MYSQL,
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: 'password123',
        charset: 'utf8' // 不是推荐的utf8mb4
      };

      const result = configManager.validateMySQLConfig(config);
      
      expect(result.recommendations).toContain('建议使用utf8mb4字符集以支持完整的Unicode字符');
    });

    it('应该提供安全警告', () => {
      const config = {
        type: DatabaseType.MYSQL,
        host: 'remote-server.com',
        port: 3306,
        user: 'root',
        password: '123',
        ssl: false
      };

      const result = configManager.validateMySQLConfig(config);
      
      expect(result.warnings).toContain('连接到远程MySQL服务器时建议启用SSL');
      expect(result.warnings).toContain('生产环境中不建议使用root用户连接数据库');
      expect(result.warnings).toContain('密码长度过短，建议使用更强的密码');
    });

    it('应该缓存验证结果', () => {
      const config = {
        type: DatabaseType.MYSQL,
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: 'password123'
      };

      const result1 = configManager.validateMySQLConfig(config);
      const result2 = configManager.validateMySQLConfig(config);
      
      expect(result1).toBe(result2); // 应该是同一个对象引用
    });
  });

  describe('配置优化', () => {
    it('应该优化测试环境配置', () => {
      const baseConfig = {
        type: DatabaseType.MYSQL,
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: 'password123',
        connectionLimit: 20,
        acquireTimeout: 120000
      };

      const optimized = configManager.getOptimizedMySQLConfig(baseConfig, 'test');
      
      expect(optimized.connectionLimit).toBe(5); // 测试环境限制连接数
      expect(optimized.acquireTimeout).toBe(30000); // 测试环境缩短超时
      expect(optimized.debug).toBe(false); // 测试环境关闭调试
      expect(optimized.charset).toBe('utf8mb4'); // 应用性能优化
      expect(optimized.supportBigNumbers).toBe(true);
    });

    it('应该优化生产环境配置', () => {
      const baseConfig = {
        type: DatabaseType.MYSQL,
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: 'password123',
        connectionLimit: 5
      };

      const optimized = configManager.getOptimizedMySQLConfig(baseConfig, 'production');
      
      expect(optimized.connectionLimit).toBe(10); // 生产环境增加连接数
      expect(optimized.debug).toBe(false); // 生产环境关闭调试
      expect(optimized.trace).toBe(false); // 生产环境关闭跟踪
    });
  });

  describe('配置摘要', () => {
    it('应该生成配置摘要', () => {
      const config = {
        type: DatabaseType.MYSQL,
        host: '127.0.0.1',
        port: 3306,
        user: 'testuser',
        password: 'password123',
        database: 'testdb',
        connectionLimit: 10,
        charset: 'utf8mb4',
        ssl: false
      };

      const summary = configManager.getMySQLConfigSummary(config);
      
      expect(summary).toContain('MySQL服务器: 127.0.0.1:3306');
      expect(summary).toContain('用户: testuser');
      expect(summary).toContain('数据库: testdb');
      expect(summary).toContain('连接池: 10');
      expect(summary).toContain('字符集: utf8mb4');
      expect(summary).toContain('SSL: 禁用');
    });

    it('应该处理未指定数据库的情况', () => {
      const config = {
        type: DatabaseType.MYSQL,
        host: '127.0.0.1',
        port: 3306,
        user: 'testuser',
        password: 'password123'
      };

      const summary = configManager.getMySQLConfigSummary(config);
      
      expect(summary).toContain('数据库: (未指定)');
    });
  });

  describe('兼容性检查', () => {
    it('应该检查配置兼容性', () => {
      const compatibleConfig = {
        type: DatabaseType.MYSQL,
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: 'password123',
        charset: 'utf8mb4',
        supportBigNumbers: true,
        connectionLimit: 10,
        acquireTimeout: 30000
      };

      const result = configManager.checkMySQLCompatibility(compatibleConfig);
      
      expect(result.compatible).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('应该检测兼容性问题', () => {
      const problematicConfig = {
        type: DatabaseType.MYSQL,
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: 'password123',
        charset: 'utf8mb4',
        supportBigNumbers: false, // 与utf8mb4不兼容
        connectionLimit: 100,
        acquireTimeout: 1000 // 超时时间太短
      };

      const result = configManager.checkMySQLCompatibility(problematicConfig);
      
      expect(result.compatible).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues).toContain('使用utf8mb4字符集时建议启用supportBigNumbers');
      expect(result.issues).toContain('连接池配置可能导致频繁超时，建议增加acquireTimeout或减少connectionLimit');
    });
  });

  describe('环境变量指南', () => {
    it('应该生成环境变量指南', () => {
      const guide = configManager.getMySQLEnvironmentGuide();
      
      expect(guide).toContain('TEST_DB_HOST');
      expect(guide).toContain('TEST_DB_PORT');
      expect(guide).toContain('TEST_DB_USER');
      expect(guide).toContain('TEST_DB_PASSWORD');
      expect(guide).toContain('TEST_DB_CONNECTION_LIMIT');
      expect(guide).toContain('示例 .env 文件');
    });

    it('应该生成配置模板', () => {
      const template = configManager.generateMySQLConfigTemplate();
      
      expect(template).toContain('TEST_DB_TYPE=mysql');
      expect(template).toContain('TEST_DB_HOST=127.0.0.1');
      expect(template).toContain('TEST_DB_PORT=3306');
      expect(template).toContain('# 生产环境配置示例');
    });
  });

  describe('缓存管理', () => {
    it('应该清理缓存', () => {
      // 先生成一些缓存
      configManager.getMySQLConfigTemplate('test');
      configManager.validateMySQLConfig({
        type: DatabaseType.MYSQL,
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: 'password123'
      });

      // 清理缓存
      configManager.clearCache();

      // 验证缓存已清理（通过重新生成配置来验证）
      const config1 = configManager.getMySQLConfigTemplate('test');
      const config2 = configManager.getMySQLConfigTemplate('test');
      
      expect(config1).toBe(config2); // 新的缓存应该工作正常
    });
  });
});

describe('便捷函数', () => {
  it('getMySQLConfigTemplate 应该工作', () => {
    const config = getMySQLConfigTemplate('test');
    expect(config.type).toBe(DatabaseType.MYSQL);
  });

  it('validateMySQLConfig 应该工作', () => {
    const config = {
      type: DatabaseType.MYSQL,
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: 'password123'
    };
    const result = validateMySQLConfig(config);
    expect(result.isValid).toBe(true);
  });

  it('getOptimizedMySQLConfig 应该工作', () => {
    const config = {
      type: DatabaseType.MYSQL,
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: 'password123'
    };
    const optimized = getOptimizedMySQLConfig(config, 'test');
    expect(optimized.charset).toBe('utf8mb4');
  });

  it('getMySQLConfigSummary 应该工作', () => {
    const config = {
      type: DatabaseType.MYSQL,
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: 'password123'
    };
    const summary = getMySQLConfigSummary(config);
    expect(summary).toContain('127.0.0.1:3306');
  });

  it('checkMySQLCompatibility 应该工作', () => {
    const config = {
      type: DatabaseType.MYSQL,
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: 'password123'
    };
    const result = checkMySQLCompatibility(config);
    expect(result).toHaveProperty('compatible');
    expect(result).toHaveProperty('issues');
  });

  it('getMySQLEnvironmentGuide 应该工作', () => {
    const guide = getMySQLEnvironmentGuide();
    expect(guide).toContain('TEST_DB_HOST');
  });
});