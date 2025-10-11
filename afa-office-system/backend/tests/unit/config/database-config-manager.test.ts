/**
 * 数据库配置管理器测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseConfigManager, DatabaseType } from '../../../src/config/database-config-manager';

describe('DatabaseConfigManager', () => {
  let configManager: DatabaseConfigManager;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 保存原始环境变量
    originalEnv = { ...process.env };
    
    // 重置配置管理器
    configManager = DatabaseConfigManager.getInstance();
    configManager.resetConfig();
  });

  afterEach(() => {
    // 恢复原始环境变量
    process.env = originalEnv;
  });

  describe('getDatabaseType', () => {
    it('应该默认返回SQLite类型', () => {
      delete process.env.TEST_DB_TYPE;
      delete process.env.DB_TYPE;
      
      const dbType = configManager.getDatabaseType();
      expect(dbType).toBe(DatabaseType.SQLITE);
    });

    it('应该根据TEST_DB_TYPE环境变量返回MySQL类型', () => {
      process.env.TEST_DB_TYPE = 'mysql';
      
      const dbType = configManager.getDatabaseType();
      expect(dbType).toBe(DatabaseType.MYSQL);
    });

    it('应该根据DB_TYPE环境变量返回MySQL类型', () => {
      process.env.DB_TYPE = 'mysql';
      
      const dbType = configManager.getDatabaseType();
      expect(dbType).toBe(DatabaseType.MYSQL);
    });

    it('TEST_DB_TYPE应该优先于DB_TYPE', () => {
      process.env.DB_TYPE = 'mysql';
      process.env.TEST_DB_TYPE = 'sqlite';
      
      const dbType = configManager.getDatabaseType();
      expect(dbType).toBe(DatabaseType.SQLITE);
    });
  });

  describe('getConfig', () => {
    it('应该返回默认的SQLite配置', () => {
      delete process.env.TEST_DB_TYPE;
      
      const config = configManager.getConfig();
      expect(config.type).toBe(DatabaseType.SQLITE);
      expect(config).toHaveProperty('path');
    });

    it('应该返回MySQL配置当设置了mysql类型', () => {
      process.env.TEST_DB_TYPE = 'mysql';
      
      const config = configManager.getConfig();
      expect(config.type).toBe(DatabaseType.MYSQL);
      expect(config).toHaveProperty('host');
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('user');
      expect(config).toHaveProperty('password');
    });

    it('应该使用环境变量中的MySQL配置', () => {
      process.env.TEST_DB_TYPE = 'mysql';
      process.env.TEST_DB_HOST = 'localhost';
      process.env.TEST_DB_PORT = '3307';
      process.env.TEST_DB_USER = 'testuser';
      process.env.TEST_DB_PASSWORD = 'testpass';
      
      const config = configManager.getConfig();
      expect(config.type).toBe(DatabaseType.MYSQL);
      
      const mysqlConfig = config as any;
      expect(mysqlConfig.host).toBe('localhost');
      expect(mysqlConfig.port).toBe(3307);
      expect(mysqlConfig.user).toBe('testuser');
      expect(mysqlConfig.password).toBe('testpass');
    });
  });

  describe('validateConfig', () => {
    it('应该验证有效的MySQL配置', () => {
      const validMySQLConfig = {
        type: DatabaseType.MYSQL,
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'password'
      };
      
      const errors = configManager.validateConfig(validMySQLConfig);
      expect(errors).toHaveLength(0);
    });

    it('应该检测无效的MySQL配置', () => {
      const invalidMySQLConfig = {
        type: DatabaseType.MYSQL,
        host: '',
        port: 0,
        user: '',
        password: ''
      };
      
      const errors = configManager.validateConfig(invalidMySQLConfig);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('主机地址'))).toBe(true);
      expect(errors.some(error => error.includes('端口'))).toBe(true);
      expect(errors.some(error => error.includes('用户名'))).toBe(true);
      expect(errors.some(error => error.includes('密码'))).toBe(true);
    });

    it('应该验证有效的SQLite配置', () => {
      const validSQLiteConfig = {
        type: DatabaseType.SQLITE,
        path: ':memory:'
      };
      
      const errors = configManager.validateConfig(validSQLiteConfig);
      expect(errors).toHaveLength(0);
    });

    it('应该检测无效的SQLite配置', () => {
      const invalidSQLiteConfig = {
        type: DatabaseType.SQLITE,
        path: ''
      };
      
      const errors = configManager.validateConfig(invalidSQLiteConfig);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('路径'))).toBe(true);
    });
  });

  describe('isConfigValid', () => {
    it('应该返回true对于有效配置', () => {
      const validConfig = {
        type: DatabaseType.SQLITE,
        path: ':memory:'
      };
      
      const isValid = configManager.isConfigValid(validConfig);
      expect(isValid).toBe(true);
    });

    it('应该返回false对于无效配置', () => {
      const invalidConfig = {
        type: DatabaseType.MYSQL,
        host: '',
        port: 0,
        user: '',
        password: ''
      };
      
      const isValid = configManager.isConfigValid(invalidConfig);
      expect(isValid).toBe(false);
    });
  });

  describe('getConfigSummary', () => {
    it('应该返回MySQL配置摘要', () => {
      const mysqlConfig = {
        type: DatabaseType.MYSQL,
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'secret',
        database: 'testdb'
      };
      
      const summary = configManager.getConfigSummary(mysqlConfig);
      expect(summary).toContain('MySQL数据库');
      expect(summary).toContain('localhost:3306');
      expect(summary).toContain('testdb');
      expect(summary).toContain('root');
      expect(summary).not.toContain('secret'); // 不应包含密码
    });

    it('应该返回SQLite配置摘要', () => {
      const sqliteConfig = {
        type: DatabaseType.SQLITE,
        path: '/path/to/database.db'
      };
      
      const summary = configManager.getConfigSummary(sqliteConfig);
      expect(summary).toContain('SQLite数据库');
      expect(summary).toContain('/path/to/database.db');
    });
  });

  describe('setConfig', () => {
    it('应该设置有效的自定义配置', () => {
      const customConfig = {
        type: DatabaseType.SQLITE,
        path: '/custom/path.db'
      };
      
      expect(() => {
        configManager.setConfig(customConfig);
      }).not.toThrow();
      
      const retrievedConfig = configManager.getConfig();
      expect(retrievedConfig).toEqual(customConfig);
    });

    it('应该拒绝无效的自定义配置', () => {
      const invalidConfig = {
        type: DatabaseType.MYSQL,
        host: '',
        port: 0,
        user: '',
        password: ''
      };
      
      expect(() => {
        configManager.setConfig(invalidConfig);
      }).toThrow('数据库配置无效');
    });
  });

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const instance1 = DatabaseConfigManager.getInstance();
      const instance2 = DatabaseConfigManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('环境变量指南', () => {
    it('应该提供环境变量配置指南', () => {
      const guide = DatabaseConfigManager.getEnvironmentVariablesGuide();
      
      expect(guide).toContain('TEST_DB_TYPE');
      expect(guide).toContain('TEST_DB_HOST');
      expect(guide).toContain('TEST_DB_PORT');
      expect(guide).toContain('TEST_DB_USER');
      expect(guide).toContain('TEST_DB_PASSWORD');
      expect(guide).toContain('DB_TEST_PATH');
    });
  });
});