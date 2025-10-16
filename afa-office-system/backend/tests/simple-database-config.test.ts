import { describe, it, expect, vi } from 'vitest';

// Mock environment variables for testing
vi.mock('dotenv', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    default: {
      config: vi.fn()
    },
    config: vi.fn()
  };
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_DB_HOST = '127.0.0.1';
process.env.TEST_DB_PORT = '3306';
process.env.TEST_DB_USER = 'afa_test';
process.env.TEST_DB_PASSWORD = 'test_password';
process.env.TEST_DB_NAME = 'afa_office_test';

import { 
  getCurrentDbConfig, 
  validateDatabaseConfig, 
  getOptimizedDatabaseConfig,
  adjustDatabaseConfig 
} from '../src/config/database.config.js';

describe('MySQL数据库配置测试 (简单版)', () => {
  it('应该返回有效的MySQL配置', () => {
    const config = getCurrentDbConfig();
    
    expect(config).toBeDefined();
    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(3306);
    expect(config.user).toBe('afa_test');
    expect(config.password).toBe('test_password');
    expect(config.database).toBe('afa_office_test');
    expect(config.connectionLimit).toBeGreaterThan(0);
    expect(config.charset).toBe('utf8mb4');
    expect(config.timezone).toBe('+00:00');
    expect(config.multipleStatements).toBe(true);
  });

  it('应该验证MySQL配置', () => {
    const config = getCurrentDbConfig();
    const errors = validateDatabaseConfig(config);
    
    expect(errors).toEqual([]);
  });

  it('应该返回优化的MySQL配置', () => {
    const config = getOptimizedDatabaseConfig('test');
    
    expect(config).toBeDefined();
    expect(config.connectionLimit).toBeLessThanOrEqual(5);
    expect(config.acquireTimeout).toBeLessThanOrEqual(10000);
    expect(config.timeout).toBeLessThanOrEqual(10000);
  });

  it('应该验证无效的MySQL配置', () => {
    const invalidConfig = {
      host: '',
      port: 0,
      user: '',
      password: '',
      database: '',
      connectionLimit: 0,
      acquireTimeout: 0,
      timeout: 0,
      multipleStatements: true,
      charset: 'utf8mb4',
      timezone: '+00:00',
      performance: {
        slowQueryThreshold: 1000,
        enableQueryLogging: false,
        enablePerformanceMetrics: true,
        maxQueryTime: 30000,
      },
      pool: {
        min: 1,
        max: 5,
        acquireTimeoutMillis: 10000,
        idleTimeoutMillis: 60000,
        createTimeoutMillis: 5000,
        reapIntervalMillis: 10000,
      },
      retry: {
        maxRetries: 10,
        baseDelay: 50,
        maxDelay: 2000,
        retryableErrors: ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT'],
      },
    };
    
    const errors = validateDatabaseConfig(invalidConfig);
    
    expect(errors.length).toBeGreaterThan(0);
    expect(errors).toContain('MySQL主机地址不能为空');
    expect(errors).toContain('MySQL端口必须在1-65535之间');
    expect(errors).toContain('MySQL用户名不能为空');
    expect(errors).toContain('MySQL密码不能为空');
    expect(errors).toContain('MySQL数据库名不能为空');
  });
});