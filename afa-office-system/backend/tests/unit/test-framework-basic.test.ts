/**
 * 测试框架基础功能测试
 * 验证核心组件的基本功能
 */

import { describe, it, expect } from 'vitest';
import { timeoutManager } from '../../src/utils/timeout-manager.js';
import { testEnvironmentManager } from '../../src/utils/test-environment-manager.js';

describe('测试框架基础功能', () => {
  describe('超时管理器', () => {
    it('应该能够设置和获取测试超时配置', () => {
      const testName = 'basic-timeout-test';
      const timeout = 5000;

      timeoutManager.setTestTimeout(testName, timeout, {
        warningThreshold: 0.8,
        retryCount: 1
      });

      const config = timeoutManager.getTestTimeout(testName);
      expect(config).toBeDefined();
      expect(config!.timeout).toBe(timeout);
      expect(config!.warningThreshold).toBe(0.8);
      expect(config!.retryCount).toBe(1);
    });

    it('应该能够生成超时统计信息', () => {
      const stats = timeoutManager.getTimeoutStatistics();
      
      expect(stats).toHaveProperty('totalTests');
      expect(stats).toHaveProperty('completedTests');
      expect(stats).toHaveProperty('timeoutTests');
      expect(stats).toHaveProperty('failedTests');
      expect(stats).toHaveProperty('averageDuration');
      expect(stats).toHaveProperty('timeoutRate');
      
      expect(typeof stats.totalTests).toBe('number');
      expect(typeof stats.averageDuration).toBe('number');
      expect(typeof stats.timeoutRate).toBe('number');
    });

    it('应该能够动态调整超时时间', () => {
      const testName = 'dynamic-timeout-test';
      
      // 设置初始超时
      timeoutManager.setTestTimeout(testName, 3000);
      
      let config = timeoutManager.getTestTimeout(testName);
      expect(config!.timeout).toBe(3000);

      // 动态调整
      timeoutManager.adjustTimeout(testName, 8000, '需要更长时间');
      
      config = timeoutManager.getTestTimeout(testName);
      expect(config!.timeout).toBe(8000);
    });
  });

  describe('测试环境管理器', () => {
    it('应该能够获取活跃环境列表', () => {
      const environments = testEnvironmentManager.getActiveEnvironments();
      expect(Array.isArray(environments)).toBe(true);
    });

    it('应该能够获取锁状态', () => {
      const lockStatus = testEnvironmentManager.getLockStatus();
      expect(Array.isArray(lockStatus)).toBe(true);
    });

    it('应该能够创建隔离的测试环境', async () => {
      const env = await testEnvironmentManager.createIsolatedEnvironment({
        isolationLevel: 'test'
      });

      expect(env.id).toBeDefined();
      expect(env.databasePath).toBeDefined();
      expect(env.isolationLevel).toBe('test');
      expect(env.isActive).toBe(true);
      expect(env.createdAt).toBeInstanceOf(Date);
      expect(typeof env.cleanup).toBe('function');

      // 清理
      await env.cleanup();
    });

    it('应该能够获取和释放测试锁', async () => {
      const testName = 'basic-lock-test';
      
      // 获取锁
      const lock = await testEnvironmentManager.acquireTestLock(testName, 3000);
      
      expect(lock.testName).toBe(testName);
      expect(lock.acquiredAt).toBeInstanceOf(Date);
      expect(lock.timeout).toBe(3000);
      expect(typeof lock.release).toBe('function');

      // 验证锁状态
      const lockStatus = testEnvironmentManager.getLockStatus();
      expect(lockStatus.some(l => l.testName === testName)).toBe(true);

      // 释放锁
      await lock.release();

      // 验证锁已释放
      const lockStatusAfter = testEnvironmentManager.getLockStatus();
      expect(lockStatusAfter.some(l => l.testName === testName)).toBe(false);
    });

    it('应该防止重复获取同一测试的锁', async () => {
      const testName = 'duplicate-lock-basic-test';
      
      // 获取第一个锁
      const lock1 = await testEnvironmentManager.acquireTestLock(testName, 3000);
      
      // 尝试获取第二个锁应该失败
      await expect(
        testEnvironmentManager.acquireTestLock(testName, 1000)
      ).rejects.toThrow('已被锁定');

      // 释放锁
      await lock1.release();
    });
  });
});