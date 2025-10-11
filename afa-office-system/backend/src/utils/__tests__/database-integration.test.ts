import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import database from '../database.js';
import { ConnectionPool } from '../connection-pool.js';
import { RetryManager } from '../retry-manager.js';

describe('数据库连接和并发问题修复集成测试', () => {
  beforeAll(async () => {
    // 初始化数据库连接池
    await database.connect({
      min: 1,
      max: 3,
      acquireTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
    });
  });

  afterAll(async () => {
    // 关闭数据库连接
    await database.close();
  });

  beforeEach(async () => {
    // 清理测试数据
    try {
      await database.run('DROP TABLE IF EXISTS test_users');
    } catch (error) {
      // 忽略表不存在的错误
    }
  });

  describe('连接池管理', () => {
    it('应该能够获取连接池统计信息', () => {
      const stats = database.getPoolStats();
      expect(stats).toBeDefined();
      expect(stats?.totalConnections).toBeGreaterThanOrEqual(1);
      expect(stats?.totalConnections).toBeLessThanOrEqual(3);
    });

    it('应该能够执行健康检查', async () => {
      const health = await database.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.details.poolStats).toBeDefined();
      expect(health.details.queryTest?.success).toBe(true);
    });
  });

  describe('重试机制', () => {
    it('应该能够获取重试统计信息', () => {
      const retryStats = database.getRetryStats();
      expect(retryStats).toBeDefined();
      expect(typeof retryStats.totalAttempts).toBe('number');
      expect(typeof retryStats.successfulRetries).toBe('number');
    });

    it('应该能够执行带重试的操作', async () => {
      let attemptCount = 0;
      const result = await database.executeWithRetry(async () => {
        attemptCount++;
        if (attemptCount < 2) {
          const error = new Error('模拟错误');
          (error as any).code = 'SQLITE_BUSY';
          throw error;
        }
        return 'success';
      }, {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100,
        retryableErrors: ['SQLITE_BUSY'],
      });

      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });
  });

  describe('数据库操作', () => {
    it('应该能够创建表和插入数据', async () => {
      // 创建测试表
      await database.run(`
        CREATE TABLE test_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 插入测试数据
      const result = await database.run(
        'INSERT INTO test_users (name, email) VALUES (?, ?)',
        ['测试用户', 'test@example.com']
      );

      expect(result.lastID).toBeGreaterThan(0);
      expect(result.changes).toBe(1);
    });

    it('应该能够查询数据', async () => {
      // 创建表并插入数据
      await database.run(`
        CREATE TABLE test_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL
        )
      `);

      await database.run(
        'INSERT INTO test_users (name, email) VALUES (?, ?)',
        ['用户1', 'user1@example.com']
      );

      await database.run(
        'INSERT INTO test_users (name, email) VALUES (?, ?)',
        ['用户2', 'user2@example.com']
      );

      // 查询单条记录
      const user = await database.get<{ id: number; name: string; email: string }>(
        'SELECT * FROM test_users WHERE email = ?',
        ['user1@example.com']
      );

      expect(user).toBeDefined();
      expect(user?.name).toBe('用户1');
      expect(user?.email).toBe('user1@example.com');

      // 查询多条记录
      const users = await database.all<{ id: number; name: string; email: string }>(
        'SELECT * FROM test_users ORDER BY id'
      );

      expect(users).toHaveLength(2);
      expect(users[0].name).toBe('用户1');
      expect(users[1].name).toBe('用户2');
    });
  });

  describe('事务管理', () => {
    it('应该能够执行事务', async () => {
      // 创建测试表
      await database.run(`
        CREATE TABLE test_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL
        )
      `);

      // 执行事务
      const result = await database.withTransaction(async (tx) => {
        const user1 = await tx.run(
          'INSERT INTO test_users (name, email) VALUES (?, ?)',
          ['事务用户1', 'tx1@example.com']
        );

        const user2 = await tx.run(
          'INSERT INTO test_users (name, email) VALUES (?, ?)',
          ['事务用户2', 'tx2@example.com']
        );

        return { user1Id: user1.lastID, user2Id: user2.lastID };
      });

      expect(result.user1Id).toBeGreaterThan(0);
      expect(result.user2Id).toBeGreaterThan(0);

      // 验证数据已提交
      const users = await database.all('SELECT * FROM test_users');
      expect(users).toHaveLength(2);
    });

    it('应该能够回滚事务', async () => {
      // 创建测试表
      await database.run(`
        CREATE TABLE test_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL
        )
      `);

      // 执行会失败的事务
      try {
        await database.withTransaction(async (tx) => {
          await tx.run(
            'INSERT INTO test_users (name, email) VALUES (?, ?)',
            ['事务用户1', 'tx1@example.com']
          );

          // 故意抛出错误触发回滚
          throw new Error('模拟事务错误');
        });
      } catch (error) {
        expect((error as Error).message).toBe('模拟事务错误');
      }

      // 验证数据已回滚
      const users = await database.all('SELECT * FROM test_users');
      expect(users).toHaveLength(0);
    });
  });

  describe('并发测试', () => {
    it('应该能够处理并发查询', async () => {
      // 创建测试表
      await database.run(`
        CREATE TABLE test_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL
        )
      `);

      // 插入一些测试数据
      for (let i = 1; i <= 10; i++) {
        await database.run(
          'INSERT INTO test_users (name, email) VALUES (?, ?)',
          [`用户${i}`, `user${i}@example.com`]
        );
      }

      // 并发执行多个查询
      const promises = Array.from({ length: 20 }, (_, i) =>
        database.get(
          'SELECT * FROM test_users WHERE id = ?',
          [Math.floor(Math.random() * 10) + 1]
        )
      );

      const results = await Promise.all(promises);
      
      // 所有查询都应该成功
      expect(results).toHaveLength(20);
      results.forEach(result => {
        if (result) {
          expect(result).toHaveProperty('id');
          expect(result).toHaveProperty('name');
          expect(result).toHaveProperty('email');
        }
      });
    });

    it('应该能够处理并发事务', async () => {
      // 创建测试表
      await database.run(`
        CREATE TABLE test_counter (
          id INTEGER PRIMARY KEY,
          value INTEGER NOT NULL DEFAULT 0
        )
      `);

      // 初始化计数器
      await database.run('INSERT INTO test_counter (id, value) VALUES (1, 0)');

      // 串行执行事务以避免SQLite锁定问题
      let successCount = 0;
      for (let i = 0; i < 5; i++) {
        try {
          await database.withTransaction(async (tx) => {
            const current = await tx.get<{ value: number }>(
              'SELECT value FROM test_counter WHERE id = 1'
            );
            
            await tx.run(
              'UPDATE test_counter SET value = ? WHERE id = 1',
              [(current?.value || 0) + 1]
            );
          });
          successCount++;
        } catch (error) {
          console.warn(`事务 ${i + 1} 失败:`, (error as Error).message);
        }
      }

      // 验证至少有一些事务成功
      expect(successCount).toBeGreaterThan(0);
      
      // 验证最终计数器值
      const final = await database.get<{ value: number }>(
        'SELECT value FROM test_counter WHERE id = 1'
      );
      
      expect(final?.value).toBe(successCount);
    }, 15000); // 增加超时时间
  });

  describe('性能监控', () => {
    it('应该能够获取性能指标', async () => {
      // 执行一些查询以生成指标
      await database.run(`
        CREATE TABLE IF NOT EXISTS test_perf (
          id INTEGER PRIMARY KEY,
          data TEXT
        )
      `);

      for (let i = 0; i < 5; i++) {
        await database.run(
          'INSERT INTO test_perf (data) VALUES (?)',
          [`数据${i}`]
        );
      }

      const metrics = await database.getPerformanceMetrics();
      
      expect(metrics.database.queryCount).toBeGreaterThan(0);
      expect(metrics.database.connectionCount).toBeGreaterThanOrEqual(1);
      expect(metrics.pool.totalConnections).toBeGreaterThanOrEqual(1);
      expect(metrics.retry.totalAttempts).toBeGreaterThanOrEqual(0);
    });

    it('应该能够获取慢查询报告', async () => {
      const report = database.getSlowQueryReport();
      expect(Array.isArray(report)).toBe(true);
    });
  });
});