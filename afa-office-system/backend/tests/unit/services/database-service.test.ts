/**
 * 数据库服务测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseService, ConnectionStatus } from '../../../src/services/database-service';
import { DatabaseType } from '../../../src/config/database-config-manager';

// Mock the dependencies
vi.mock('../../../src/config/database-config-manager');
vi.mock('../../../src/factories/database-adapter-factory');

describe('DatabaseService', () => {
  let databaseService: DatabaseService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 保存原始环境变量
    originalEnv = { ...process.env };
    
    // 获取数据库服务实例
    databaseService = DatabaseService.getInstance();
    
    // 清理定时器
    vi.clearAllTimers();
  });

  afterEach(async () => {
    // 恢复原始环境变量
    process.env = originalEnv;
    
    // 断开数据库连接
    await databaseService.disconnect();
    
    // 清理所有mock
    vi.clearAllMocks();
  });

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const instance1 = DatabaseService.getInstance();
      const instance2 = DatabaseService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const status = databaseService.getStatus();
      const health = databaseService.getHealth();
      
      expect(status).toBe(ConnectionStatus.DISCONNECTED);
      expect(health.status).toBe(ConnectionStatus.DISCONNECTED);
      expect(health.databaseType).toBe(DatabaseType.MYSQL);
      expect(health.lastPing).toBeNull();
      expect(health.errorCount).toBe(0);
      expect(health.lastError).toBeNull();
      expect(health.uptime).toBe(0);
      expect(health.fallbackReason).toBeNull();
    });

    it('应该初始化时未连接', () => {
      expect(databaseService.isConnected()).toBe(false);
      expect(databaseService.isFallback()).toBe(false);
      expect(databaseService.getAdapter()).toBeNull();
      expect(databaseService.getConfig()).toBeNull();
    });
  });

  describe('配置管理', () => {
    it('应该能够更新服务配置', () => {
      const newConfig = {
        enableFallback: false,
        fallbackTimeout: 5000,
        healthCheckInterval: 15000,
        maxRetries: 5,
        retryDelay: 2000
      };
      
      databaseService.updateServiceConfig(newConfig);
      
      const stats = databaseService.getConnectionStats();
      expect(stats.serviceConfig.enableFallback).toBe(false);
      expect(stats.serviceConfig.fallbackTimeout).toBe(5000);
      expect(stats.serviceConfig.healthCheckInterval).toBe(15000);
      expect(stats.serviceConfig.maxRetries).toBe(5);
      expect(stats.serviceConfig.retryDelay).toBe(2000);
    });

    it('应该能够部分更新服务配置', () => {
      const partialConfig = {
        maxRetries: 10
      };
      
      databaseService.updateServiceConfig(partialConfig);
      
      const stats = databaseService.getConnectionStats();
      expect(stats.serviceConfig.maxRetries).toBe(10);
      // 其他配置应该保持默认值
      expect(stats.serviceConfig.enableFallback).toBe(true);
    });
  });

  describe('连接统计', () => {
    it('应该提供连接统计信息', () => {
      const stats = databaseService.getConnectionStats();
      
      expect(stats).toHaveProperty('status');
      expect(stats).toHaveProperty('health');
      expect(stats).toHaveProperty('config');
      expect(stats).toHaveProperty('serviceConfig');
      expect(stats).toHaveProperty('uptime');
      
      expect(stats.status).toBe(ConnectionStatus.DISCONNECTED);
      expect(stats.config).toBeNull();
      expect(stats.uptime).toBe(0);
    });
  });

  describe('健康状态', () => {
    it('应该返回健康状态的副本', () => {
      const health1 = databaseService.getHealth();
      const health2 = databaseService.getHealth();
      
      // 应该是不同的对象实例
      expect(health1).not.toBe(health2);
      // 但内容应该相同
      expect(health1).toEqual(health2);
    });
  });

  describe('环境变量配置', () => {
    it('应该使用环境变量配置服务参数', () => {
      // 设置环境变量
      process.env.DB_ENABLE_FALLBACK = 'false';
      process.env.DB_FALLBACK_TIMEOUT = '15000';
      process.env.DB_HEALTH_CHECK_INTERVAL = '45000';
      process.env.DB_MAX_RETRIES = '7';
      process.env.DB_RETRY_DELAY = '3000';
      
      // 创建新的服务实例来读取环境变量
      const newService = new (DatabaseService as any)();
      const stats = newService.getConnectionStats();
      
      expect(stats.serviceConfig.enableFallback).toBe(false);
      expect(stats.serviceConfig.fallbackTimeout).toBe(15000);
      expect(stats.serviceConfig.healthCheckInterval).toBe(45000);
      expect(stats.serviceConfig.maxRetries).toBe(7);
      expect(stats.serviceConfig.retryDelay).toBe(3000);
    });

    it('应该使用默认值当环境变量未设置', () => {
      // 清除相关环境变量
      delete process.env.DB_ENABLE_FALLBACK;
      delete process.env.DB_FALLBACK_TIMEOUT;
      delete process.env.DB_HEALTH_CHECK_INTERVAL;
      delete process.env.DB_MAX_RETRIES;
      delete process.env.DB_RETRY_DELAY;
      
      // 创建新的服务实例
      const newService = new (DatabaseService as any)();
      const stats = newService.getConnectionStats();
      
      expect(stats.serviceConfig.enableFallback).toBe(true);
      expect(stats.serviceConfig.fallbackTimeout).toBe(10000);
      expect(stats.serviceConfig.healthCheckInterval).toBe(30000);
      expect(stats.serviceConfig.maxRetries).toBe(3);
      expect(stats.serviceConfig.retryDelay).toBe(1000);
    });
  });

  describe('断开连接', () => {
    it('应该能够安全地断开未连接的服务', async () => {
      expect(databaseService.isConnected()).toBe(false);
      
      await expect(databaseService.disconnect()).resolves.not.toThrow();
      
      expect(databaseService.getStatus()).toBe(ConnectionStatus.DISCONNECTED);
      expect(databaseService.isConnected()).toBe(false);
    });
  });

  describe('错误处理', () => {
    it('应该正确处理无效的环境变量', () => {
      process.env.DB_FALLBACK_TIMEOUT = 'invalid';
      process.env.DB_MAX_RETRIES = 'not_a_number';
      
      // 创建新的服务实例
      const newService = new (DatabaseService as any)();
      const stats = newService.getConnectionStats();
      
      // 应该使用默认值
      expect(stats.serviceConfig.fallbackTimeout).toBe(10000);
      expect(stats.serviceConfig.maxRetries).toBe(3);
    });
  });
});