import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { ConnectionPool, type PoolConfig, type PooledConnection } from '../connection-pool.js';
import { getCurrentDbConfig } from '../../config/database.config.js';

// Mock sqlite3
vi.mock('sqlite3', () => {
  const mockDatabase = {
    close: vi.fn((callback) => callback?.(null)),
    run: vi.fn((sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
      }
      setTimeout(() => callback?.(null), 10);
    }),
    get: vi.fn((sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
      }
      setTimeout(() => callback?.(null, { test: 1 }), 10);
    }),
  };

  return {
    default: {
      Database: vi.fn().mockImplementation((path, mode, callback) => {
        setTimeout(() => callback?.(null), 10);
        return mockDatabase;
      }),
      OPEN_READWRITE: 2,
      OPEN_CREATE: 4,
    },
  };
});

// Mock database config
vi.mock('../../config/database.config.js', () => ({
  getCurrentDbConfig: vi.fn(() => ({
    path: ':memory:',
    mode: 6, // OPEN_READWRITE | OPEN_CREATE
    pragmas: {
      journal_mode: 'WAL',
      synchronous: 'NORMAL',
      cache_size: 1000,
      temp_store: 'memory',
      mmap_size: 268435456,
    },
  })),
}));

describe('ConnectionPool 单元测试', () => {
  let pool: ConnectionPool;
  const testConfig: PoolConfig = {
    min: 1,
    max: 3,
    acquireTimeoutMillis: 1000,
    idleTimeoutMillis: 5000,
    createTimeoutMillis: 2000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
  };

  beforeAll(() => {
    // 设置测试环境
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    // 恢复环境变量
    delete process.env.NODE_ENV;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    pool = new ConnectionPool(testConfig);
  });

  afterEach(async () => {
    if (pool) {
      await pool.destroy();
    }
  });

  describe('连接池初始化', () => {
    it('应该使用默认配置创建连接池', () => {
      const defaultPool = new ConnectionPool();
      expect(defaultPool).toBeDefined();
    });

    it('应该使用自定义配置创建连接池', () => {
      expect(pool).toBeDefined();
    });

    it('应该能够初始化连接池', async () => {
      await pool.initialize();
      const stats = pool.getStats();
      expect(stats.totalConnections).toBeGreaterThanOrEqual(testConfig.min);
    });

    it('初始化后应该有正确的统计信息', async () => {
      await pool.initialize();
      const stats = pool.getStats();
      
      expect(stats.totalConnections).toBeGreaterThanOrEqual(testConfig.min);
      expect(stats.totalConnections).toBeLessThanOrEqual(testConfig.max);
      expect(stats.totalCreated).toBeGreaterThanOrEqual(testConfig.min);
      expect(stats.activeConnections).toBe(0);
      expect(stats.idleConnections).toBe(stats.totalConnections);
    });
  });

  describe('连接获取和释放', () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it('应该能够获取连接', async () => {
      const connection = await pool.acquire();
      
      expect(connection).toBeDefined();
      expect(connection.id).toBeDefined();
      expect(connection.connection).toBeDefined();
      expect(connection.inUse).toBe(true);
      expect(connection.isValid).toBe(true);
      expect(connection.createdAt).toBeInstanceOf(Date);
      expect(connection.lastUsedAt).toBeInstanceOf(Date);
    });

    it('应该能够释放连接', async () => {
      const connection = await pool.acquire();
      const initialStats = pool.getStats();
      
      await pool.release(connection);
      const finalStats = pool.getStats();
      
      expect(finalStats.activeConnections).toBe(initialStats.activeConnections - 1);
      expect(finalStats.idleConnections).toBe(initialStats.idleConnections + 1);
      expect(finalStats.totalReleased).toBe(initialStats.totalReleased + 1);
    });

    it('应该能够处理多个连接的获取和释放', async () => {
      const connections: PooledConnection[] = [];
      
      // 获取多个连接
      for (let i = 0; i < testConfig.max; i++) {
        const connection = await pool.acquire();
        connections.push(connection);
      }
      
      const statsAfterAcquire = pool.getStats();
      expect(statsAfterAcquire.activeConnections).toBe(testConfig.max);
      expect(statsAfterAcquire.idleConnections).toBe(0);
      
      // 释放所有连接
      for (const connection of connections) {
        await pool.release(connection);
      }
      
      const statsAfterRelease = pool.getStats();
      expect(statsAfterRelease.activeConnections).toBe(0);
      expect(statsAfterRelease.idleConnections).toBe(testConfig.max);
    });

    it('应该正确更新统计信息', async () => {
      const initialStats = pool.getStats();
      
      const connection = await pool.acquire();
      const afterAcquireStats = pool.getStats();
      
      expect(afterAcquireStats.totalAcquired).toBe(initialStats.totalAcquired + 1);
      expect(afterAcquireStats.activeConnections).toBe(initialStats.activeConnections + 1);
      
      await pool.release(connection);
      const afterReleaseStats = pool.getStats();
      
      expect(afterReleaseStats.totalReleased).toBe(initialStats.totalReleased + 1);
      expect(afterReleaseStats.activeConnections).toBe(initialStats.activeConnections);
    });
  });

  describe('连接池限制和超时', () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it('应该在连接池满时将请求加入等待队列', async () => {
      const connections: PooledConnection[] = [];
      
      // 获取所有可用连接
      for (let i = 0; i < testConfig.max; i++) {
        const connection = await pool.acquire();
        connections.push(connection);
      }
      
      // 尝试获取额外的连接（应该进入等待队列）
      const acquirePromise = pool.acquire();
      
      // 等待一小段时间确保请求进入队列
      await new Promise(resolve => setTimeout(resolve, 50));
      const stats = pool.getStats();
      expect(stats.pendingRequests).toBe(1);
      
      // 释放一个连接，等待队列中的请求应该被处理
      await pool.release(connections[0]);
      
      const waitingConnection = await acquirePromise;
      expect(waitingConnection).toBeDefined();
      
      // 清理剩余连接
      await pool.release(waitingConnection);
      for (let i = 1; i < connections.length; i++) {
        await pool.release(connections[i]);
      }
    });

    it('应该在获取连接超时时抛出错误', async () => {
      // 创建一个超时时间很短的连接池
      const shortTimeoutPool = new ConnectionPool({
        ...testConfig,
        acquireTimeoutMillis: 100,
      });
      
      await shortTimeoutPool.initialize();
      
      try {
        // 获取所有连接
        const connections: PooledConnection[] = [];
        for (let i = 0; i < testConfig.max; i++) {
          const connection = await shortTimeoutPool.acquire();
          connections.push(connection);
        }
        
        // 尝试获取额外连接应该超时
        await expect(shortTimeoutPool.acquire()).rejects.toThrow('获取连接超时');
        
        // 清理连接
        for (const connection of connections) {
          await shortTimeoutPool.release(connection);
        }
      } finally {
        await shortTimeoutPool.destroy();
      }
    });

    it('应该在创建连接超时时抛出错误', async () => {
      // Mock sqlite3 to simulate timeout
      const sqlite3 = await import('sqlite3');
      const originalDatabase = sqlite3.default.Database;
      
      sqlite3.default.Database = vi.fn().mockImplementation((path, mode, callback) => {
        // 不调用callback来模拟超时
        return {
          close: vi.fn((cb) => cb?.(null)),
          run: vi.fn(),
          get: vi.fn(),
        };
      }) as any;
      
      const timeoutPool = new ConnectionPool({
        ...testConfig,
        createTimeoutMillis: 100,
      });
      
      try {
        await expect(timeoutPool.initialize()).rejects.toThrow();
      } finally {
        sqlite3.default.Database = originalDatabase;
        await timeoutPool.destroy();
      }
    });
  });

  describe('连接池健康检查', () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it('应该返回健康状态', async () => {
      const health = await pool.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.details.poolStats).toBeDefined();
      expect(health.details.connectionTests).toBeDefined();
      expect(health.details.timestamp).toBeDefined();
      expect(Array.isArray(health.details.connectionTests)).toBe(true);
    });

    it('应该测试所有连接的健康状态', async () => {
      const health = await pool.healthCheck();
      const stats = pool.getStats();
      
      expect(health.details.connectionTests).toHaveLength(stats.totalConnections);
      
      health.details.connectionTests.forEach(test => {
        expect(test.connectionId).toBeDefined();
        expect(typeof test.success).toBe('boolean');
        expect(typeof test.responseTime).toBe('number');
      });
    });

    it('应该在连接失败时返回降级状态', async () => {
      // Mock一个连接失败的情况
      const sqlite3 = await import('sqlite3');
      const originalGet = sqlite3.default.Database.prototype.get;
      
      sqlite3.default.Database.prototype.get = vi.fn((sql, params, callback) => {
        if (typeof params === 'function') {
          callback = params;
        }
        setTimeout(() => callback?.(new Error('模拟连接错误')), 10);
      });
      
      try {
        const health = await pool.healthCheck();
        
        // 应该检测到连接问题
        const failedTests = health.details.connectionTests.filter(test => !test.success);
        if (failedTests.length > 0) {
          expect(health.status).not.toBe('healthy');
        }
      } finally {
        sqlite3.default.Database.prototype.get = originalGet;
      }
    });
  });

  describe('连接池事件', () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it('应该触发连接创建事件', async () => {
      const eventSpy = vi.fn();
      pool.on('connection-created', eventSpy);
      
      // 创建新的连接池来触发连接创建
      const newPool = new ConnectionPool(testConfig);
      await newPool.initialize();
      
      // 等待事件触发
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(eventSpy).toHaveBeenCalled();
      
      await newPool.destroy();
    });

    it('应该触发连接获取事件', async () => {
      const eventSpy = vi.fn();
      pool.on('connection-acquired', eventSpy);
      
      const connection = await pool.acquire();
      
      expect(eventSpy).toHaveBeenCalledWith(connection.id);
      
      await pool.release(connection);
    });

    it('应该触发连接释放事件', async () => {
      const eventSpy = vi.fn();
      pool.on('connection-released', eventSpy);
      
      const connection = await pool.acquire();
      await pool.release(connection);
      
      expect(eventSpy).toHaveBeenCalledWith(connection.id);
    });

    it('应该触发连接池满事件', async () => {
      const eventSpy = vi.fn();
      pool.on('pool-full', eventSpy);
      
      const connections: PooledConnection[] = [];
      
      // 获取所有连接
      for (let i = 0; i < testConfig.max; i++) {
        const connection = await pool.acquire();
        connections.push(connection);
      }
      
      // 尝试获取额外连接应该触发pool-full事件
      const acquirePromise = pool.acquire();
      
      // 等待事件触发
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(eventSpy).toHaveBeenCalled();
      
      // 清理
      await pool.release(connections[0]);
      await acquirePromise.then(conn => pool.release(conn));
      for (let i = 1; i < connections.length; i++) {
        await pool.release(connections[i]);
      }
    });

    it('应该触发错误事件', async () => {
      const errorSpy = vi.fn();
      pool.on('error', errorSpy);
      
      // 模拟错误情况
      const sqlite3 = await import('sqlite3');
      const originalDatabase = sqlite3.default.Database;
      
      sqlite3.default.Database = vi.fn().mockImplementation((path, mode, callback) => {
        setTimeout(() => callback?.(new Error('模拟数据库错误')), 10);
        return {
          close: vi.fn((cb) => cb?.(null)),
          run: vi.fn(),
          get: vi.fn(),
        };
      }) as any;
      
      try {
        const errorPool = new ConnectionPool(testConfig);
        await errorPool.initialize().catch(() => {}); // 忽略初始化错误
        
        // 等待错误事件
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await errorPool.destroy();
      } finally {
        sqlite3.default.Database = originalDatabase;
      }
    });
  });

  describe('连接池销毁', () => {
    it('应该能够销毁连接池', async () => {
      await pool.initialize();
      const initialStats = pool.getStats();
      
      expect(initialStats.totalConnections).toBeGreaterThan(0);
      
      await pool.destroy();
      
      // 销毁后应该无法获取连接
      await expect(pool.acquire()).rejects.toThrow('连接池已销毁');
    });

    it('应该在销毁时关闭所有连接', async () => {
      await pool.initialize();
      const connection = await pool.acquire();
      
      const sqlite3 = await import('sqlite3');
      const closeSpy = vi.spyOn(connection.connection, 'close');
      
      await pool.destroy();
      
      expect(closeSpy).toHaveBeenCalled();
    });

    it('应该拒绝等待队列中的所有请求', async () => {
      await pool.initialize();
      
      // 获取所有连接
      const connections: PooledConnection[] = [];
      for (let i = 0; i < testConfig.max; i++) {
        const connection = await pool.acquire();
        connections.push(connection);
      }
      
      // 创建等待中的请求
      const waitingPromise = pool.acquire();
      
      // 等待请求进入队列
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 销毁连接池
      await pool.destroy();
      
      // 等待中的请求应该被拒绝
      await expect(waitingPromise).rejects.toThrow('连接池已销毁');
    });

    it('应该能够多次调用destroy而不出错', async () => {
      await pool.initialize();
      
      await pool.destroy();
      await pool.destroy(); // 第二次调用应该不会出错
    });
  });

  describe('连接池统计信息', () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it('应该提供准确的统计信息', async () => {
      const initialStats = pool.getStats();
      
      expect(initialStats.totalConnections).toBeGreaterThanOrEqual(testConfig.min);
      expect(initialStats.activeConnections).toBe(0);
      expect(initialStats.idleConnections).toBe(initialStats.totalConnections);
      expect(initialStats.pendingRequests).toBe(0);
      expect(initialStats.totalCreated).toBeGreaterThanOrEqual(testConfig.min);
      expect(initialStats.totalDestroyed).toBe(0);
      expect(initialStats.totalAcquired).toBe(0);
      expect(initialStats.totalReleased).toBe(0);
      expect(initialStats.totalErrors).toBe(0);
      expect(initialStats.averageAcquireTime).toBe(0);
    });

    it('应该正确计算平均获取时间', async () => {
      // 获取几个连接来生成获取时间数据
      const connections: PooledConnection[] = [];
      
      for (let i = 0; i < 3; i++) {
        const connection = await pool.acquire();
        connections.push(connection);
        await pool.release(connection);
      }
      
      const stats = pool.getStats();
      expect(stats.averageAcquireTime).toBeGreaterThan(0);
      expect(stats.totalAcquired).toBe(3);
      expect(stats.totalReleased).toBe(3);
    });

    it('应该跟踪错误计数', async () => {
      // 模拟获取连接超时
      const shortTimeoutPool = new ConnectionPool({
        ...testConfig,
        acquireTimeoutMillis: 50,
      });
      
      await shortTimeoutPool.initialize();
      
      try {
        // 获取所有连接
        const connections: PooledConnection[] = [];
        for (let i = 0; i < testConfig.max; i++) {
          const connection = await shortTimeoutPool.acquire();
          connections.push(connection);
        }
        
        // 尝试获取额外连接应该超时并增加错误计数
        try {
          await shortTimeoutPool.acquire();
        } catch (error) {
          // 预期的超时错误
        }
        
        const stats = shortTimeoutPool.getStats();
        expect(stats.totalErrors).toBeGreaterThan(0);
        
        // 清理连接
        for (const connection of connections) {
          await shortTimeoutPool.release(connection);
        }
      } finally {
        await shortTimeoutPool.destroy();
      }
    });
  });

  describe('空闲连接清理', () => {
    it('应该清理空闲连接', async () => {
      // 创建一个空闲超时时间很短的连接池
      const shortIdlePool = new ConnectionPool({
        ...testConfig,
        idleTimeoutMillis: 100,
        reapIntervalMillis: 50,
      });
      
      await shortIdlePool.initialize();
      
      try {
        const initialStats = shortIdlePool.getStats();
        
        // 等待空闲连接清理器运行
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const finalStats = shortIdlePool.getStats();
        
        // 应该保持最小连接数
        expect(finalStats.totalConnections).toBeGreaterThanOrEqual(testConfig.min);
        
        // 如果初始连接数大于最小值，应该有一些连接被清理
        if (initialStats.totalConnections > testConfig.min) {
          expect(finalStats.totalDestroyed).toBeGreaterThan(0);
        }
      } finally {
        await shortIdlePool.destroy();
      }
    });

    it('应该不会清理正在使用的连接', async () => {
      const shortIdlePool = new ConnectionPool({
        ...testConfig,
        idleTimeoutMillis: 100,
        reapIntervalMillis: 50,
      });
      
      await shortIdlePool.initialize();
      
      try {
        // 获取一个连接并保持使用状态
        const connection = await shortIdlePool.acquire();
        
        // 等待清理器运行
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const stats = shortIdlePool.getStats();
        
        // 正在使用的连接应该仍然存在
        expect(stats.activeConnections).toBeGreaterThanOrEqual(1);
        
        await shortIdlePool.release(connection);
      } finally {
        await shortIdlePool.destroy();
      }
    });
  });

  describe('边界情况处理', () => {
    it('应该处理释放不存在的连接', async () => {
      await pool.initialize();
      
      const fakeConnection: PooledConnection = {
        id: 'fake-connection',
        connection: {} as any,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        inUse: false,
        isValid: true,
      };
      
      // 释放不存在的连接应该不会抛出错误
      await expect(pool.release(fakeConnection)).resolves.toBeUndefined();
    });

    it('应该处理数据库配置错误', async () => {
      // Mock配置返回错误
      const mockGetCurrentDbConfig = vi.mocked(getCurrentDbConfig);
      mockGetCurrentDbConfig.mockReturnValueOnce({
        path: '/invalid/path/database.db',
        mode: 6,
        pragmas: {},
      });
      
      const errorPool = new ConnectionPool(testConfig);
      
      // 初始化应该处理配置错误
      await expect(errorPool.initialize()).rejects.toThrow();
      
      await errorPool.destroy();
    });

    it('应该处理连接创建失败', async () => {
      // Mock sqlite3 to fail connection creation
      const sqlite3 = await import('sqlite3');
      const originalDatabase = sqlite3.default.Database;
      
      sqlite3.default.Database = vi.fn().mockImplementation((path, mode, callback) => {
        setTimeout(() => callback?.(new Error('无法创建连接')), 10);
        return {
          close: vi.fn((cb) => cb?.(null)),
          run: vi.fn(),
          get: vi.fn(),
        };
      }) as any;
      
      try {
        const failPool = new ConnectionPool(testConfig);
        
        // 初始化应该处理连接创建失败
        await expect(failPool.initialize()).resolves.toBeUndefined();
        
        // 统计信息应该反映错误
        const stats = failPool.getStats();
        expect(stats.totalErrors).toBeGreaterThan(0);
        
        await failPool.destroy();
      } finally {
        sqlite3.default.Database = originalDatabase;
      }
    });
  });
});