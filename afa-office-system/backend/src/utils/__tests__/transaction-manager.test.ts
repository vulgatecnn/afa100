import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { TransactionManager, TransactionManagerFactory, TransactionState, type TransactionOptions, type TransactionStats } from '../transaction-manager.js';
import type { PooledConnection } from '../connection-pool.js';
import type { DatabaseResult } from '../../types/index.js';

// Mock PooledConnection
const createMockConnection = (): PooledConnection => {
  const mockDb = {
    run: vi.fn((sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
      }
      setTimeout(() => {
        if (sql.includes('FAIL')) {
          callback?.(new Error('模拟SQL错误'));
        } else {
          callback?.call({ lastID: 1, changes: 1 }, null);
        }
      }, 10);
    }),
    get: vi.fn((sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
      }
      setTimeout(() => {
        if (sql.includes('FAIL')) {
          callback?.(new Error('模拟SQL错误'));
        } else {
          callback?.(null, { id: 1, value: 'test' });
        }
      }, 10);
    }),
    all: vi.fn((sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
      }
      setTimeout(() => {
        if (sql.includes('FAIL')) {
          callback?.(new Error('模拟SQL错误'));
        } else {
          callback?.(null, [{ id: 1, value: 'test' }]);
        }
      }, 10);
    }),
    query: vi.fn((sql, params) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (sql.includes('FAIL')) {
            reject(new Error('模拟SQL错误'));
          } else {
            resolve({ rows: [{ id: 1, value: 'test' }], rowCount: 1 });
          }
        }, 10);
      });
    }),
  };

  return {
    id: 'test-connection',
    connection: mockDb as any,
    createdAt: new Date(),
    lastUsedAt: new Date(),
    inUse: true,
    isValid: true,
  };
};

describe('TransactionManager 单元测试', () => {
  let mockConnection: PooledConnection;
  let transactionManager: TransactionManager;

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
    mockConnection = createMockConnection();
    transactionManager = new TransactionManager(mockConnection);
  });

  afterEach(async () => {
    // 确保事务被清理
    if (transactionManager.getStats().state === TransactionState.ACTIVE) {
      try {
        await transactionManager.rollback('测试清理');
      } catch (error) {
        // 忽略清理错误
      }
    }
  });

  describe('事务生命周期', () => {
    it('应该能够开始事务', async () => {
      const initialStats = transactionManager.getStats();
      expect(initialStats.state).toBe(TransactionState.PENDING);

      await transactionManager.begin();

      const afterBeginStats = transactionManager.getStats();
      expect(afterBeginStats.state).toBe(TransactionState.ACTIVE);
      expect(afterBeginStats.startTime).toBeInstanceOf(Date);
      expect(afterBeginStats.isNested).toBe(false);
    });

    it('应该能够提交事务', async () => {
      await transactionManager.begin();
      
      const beforeCommitStats = transactionManager.getStats();
      expect(beforeCommitStats.state).toBe(TransactionState.ACTIVE);

      await transactionManager.commit();

      const afterCommitStats = transactionManager.getStats();
      expect(afterCommitStats.state).toBe(TransactionState.COMMITTED);
      expect(afterCommitStats.endTime).toBeInstanceOf(Date);
      expect(afterCommitStats.duration).toBeGreaterThan(0);
    });

    it('应该能够回滚事务', async () => {
      await transactionManager.begin();
      
      const rollbackReason = '测试回滚';
      await transactionManager.rollback(rollbackReason);

      const stats = transactionManager.getStats();
      expect(stats.state).toBe(TransactionState.ROLLED_BACK);
      expect(stats.rollbackReason).toBe(rollbackReason);
      expect(stats.endTime).toBeInstanceOf(Date);
      expect(stats.duration).toBeGreaterThan(0);
    });

    it('应该在未开始的事务上抛出错误', async () => {
      await expect(transactionManager.commit()).rejects.toThrow('无法提交事务');
      await expect(transactionManager.rollback()).resolves.toBeUndefined(); // 回滚应该是安全的
    });

    it('应该在重复开始事务时抛出错误', async () => {
      await transactionManager.begin();
      await expect(transactionManager.begin()).rejects.toThrow('事务已开始');
    });
  });

  describe('事务执行器', () => {
    beforeEach(async () => {
      await transactionManager.begin();
    });

    it('应该能够执行RUN语句', async () => {
      const executor = transactionManager.createExecutor();
      
      const result = await executor.run('INSERT INTO test (value) VALUES (?)', ['test']);
      
      expect(result).toEqual({
        lastID: 1,
        changes: 1,
      });
      
      const stats = transactionManager.getStats();
      expect(stats.operationCount).toBe(1);
    });

    it('应该能够执行GET语句', async () => {
      const executor = transactionManager.createExecutor();
      
      const result = await executor.get('SELECT * FROM test WHERE id = ?', [1]);
      
      expect(result).toEqual({ id: 1, value: 'test' });
      
      const stats = transactionManager.getStats();
      expect(stats.operationCount).toBe(1);
    });

    it('应该能够执行ALL语句', async () => {
      const executor = transactionManager.createExecutor();
      
      const result = await executor.all('SELECT * FROM test');
      
      expect(result).toEqual([{ id: 1, value: 'test' }]);
      
      const stats = transactionManager.getStats();
      expect(stats.operationCount).toBe(1);
    });

    it('应该在非活跃事务上抛出错误', async () => {
      const executor = transactionManager.createExecutor();
      
      await transactionManager.commit();
      
      await expect(executor.run('INSERT INTO test (value) VALUES (?)', ['test']))
        .rejects.toThrow('事务不处于活跃状态');
      
      await expect(executor.get('SELECT * FROM test WHERE id = ?', [1]))
        .rejects.toThrow('事务不处于活跃状态');
      
      await expect(executor.all('SELECT * FROM test'))
        .rejects.toThrow('事务不处于活跃状态');
    });

    it('应该处理SQL执行错误', async () => {
      const executor = transactionManager.createExecutor();
      
      await expect(executor.run('FAIL SQL')).rejects.toThrow('模拟SQL错误');
      await expect(executor.get('FAIL SQL')).rejects.toThrow('模拟SQL错误');
      await expect(executor.all('FAIL SQL')).rejects.toThrow('模拟SQL错误');
    });
  });

  describe('保存点管理', () => {
    beforeEach(async () => {
      await transactionManager.begin();
    });

    it('应该能够创建保存点', async () => {
      const executor = transactionManager.createExecutor();
      
      const savepointName = await executor.createSavepoint();
      
      expect(savepointName).toBeDefined();
      expect(typeof savepointName).toBe('string');
      
      const stats = transactionManager.getStats();
      expect(stats.savepointCount).toBe(1);
    });

    it('应该能够创建命名保存点', async () => {
      const executor = transactionManager.createExecutor();
      
      const customName = 'custom_savepoint';
      const savepointName = await executor.createSavepoint(customName);
      
      expect(savepointName).toBe(customName);
      
      const stats = transactionManager.getStats();
      expect(stats.savepointCount).toBe(1);
    });

    it('应该在重复创建同名保存点时抛出错误', async () => {
      const executor = transactionManager.createExecutor();
      
      const savepointName = 'duplicate_savepoint';
      await executor.createSavepoint(savepointName);
      
      await expect(executor.createSavepoint(savepointName))
        .rejects.toThrow('保存点已存在');
    });

    it('应该能够回滚到保存点', async () => {
      const executor = transactionManager.createExecutor();
      
      const savepointName = await executor.createSavepoint();
      await executor.run('INSERT INTO test (value) VALUES (?)', ['before_savepoint']);
      
      const nestedSavepoint = await executor.createSavepoint();
      await executor.run('INSERT INTO test (value) VALUES (?)', ['after_savepoint']);
      
      await executor.rollbackToSavepoint(savepointName);
      
      const stats = transactionManager.getStats();
      // 嵌套保存点应该被移除
      expect(stats.savepointCount).toBe(1);
    });

    it('应该能够释放保存点', async () => {
      const executor = transactionManager.createExecutor();
      
      const savepointName = await executor.createSavepoint();
      
      let initialStats = transactionManager.getStats();
      expect(initialStats.savepointCount).toBe(1);
      
      await executor.releaseSavepoint(savepointName);
      
      const finalStats = transactionManager.getStats();
      expect(finalStats.savepointCount).toBe(0);
    });

    it('应该在操作不存在的保存点时抛出错误', async () => {
      const executor = transactionManager.createExecutor();
      
      await expect(executor.rollbackToSavepoint('nonexistent'))
        .rejects.toThrow('保存点不存在');
      
      await expect(executor.releaseSavepoint('nonexistent'))
        .rejects.toThrow('保存点不存在');
    });

    it('应该在不支持保存点的事务中抛出错误', async () => {
      // 创建不支持保存点的事务管理器
      const noSavepointManager = new TransactionManager(mockConnection, { savepoints: false });
      await noSavepointManager.begin();
      
      try {
        const executor = noSavepointManager.createExecutor();
        
        await expect(executor.createSavepoint())
          .rejects.toThrow('当前事务不支持保存点');
      } finally {
        await noSavepointManager.rollback();
      }
    });
  });

  describe('事务超时', () => {
    it('应该在超时时自动回滚事务', async () => {
      const shortTimeoutManager = new TransactionManager(mockConnection, { timeout: 100 });
      
      await shortTimeoutManager.begin();
      
      // 等待超时
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const stats = shortTimeoutManager.getStats();
      expect(stats.state).toBe(TransactionState.ROLLED_BACK);
      expect(stats.rollbackReason).toBe('事务超时');
    });

    it('应该在提交前清除超时定时器', async () => {
      const timeoutManager = new TransactionManager(mockConnection, { timeout: 1000 });
      
      await timeoutManager.begin();
      await timeoutManager.commit();
      
      // 等待超过超时时间
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const stats = timeoutManager.getStats();
      expect(stats.state).toBe(TransactionState.COMMITTED);
    });

    it('应该在回滚前清除超时定时器', async () => {
      const timeoutManager = new TransactionManager(mockConnection, { timeout: 1000 });
      
      await timeoutManager.begin();
      await timeoutManager.rollback('手动回滚');
      
      // 等待超过超时时间
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const stats = timeoutManager.getStats();
      expect(stats.state).toBe(TransactionState.ROLLED_BACK);
      expect(stats.rollbackReason).toBe('手动回滚');
    });

    it('应该支持禁用超时', async () => {
      const noTimeoutManager = new TransactionManager(mockConnection, { timeout: 0 });
      
      await noTimeoutManager.begin();
      
      // 等待一段时间
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stats = noTimeoutManager.getStats();
      expect(stats.state).toBe(TransactionState.ACTIVE);
      
      await noTimeoutManager.rollback();
    });
  });

  describe('嵌套事务', () => {
    it('应该能够创建嵌套事务', async () => {
      const parentManager = new TransactionManager(mockConnection);
      await parentManager.begin();
      
      try {
        const nestedManager = new TransactionManager(mockConnection, {}, parentManager);
        
        const nestedStats = nestedManager.getStats();
        expect(nestedStats.isNested).toBe(true);
        
        await nestedManager.begin();
        
        // 嵌套事务应该使用SAVEPOINT
        expect(mockConnection.connection.run).toHaveBeenCalledWith(
          expect.stringContaining('SAVEPOINT'),
          expect.any(Function)
        );
        
        await nestedManager.rollback();
      } finally {
        await parentManager.rollback();
      }
    });

    it('应该在嵌套事务提交时使用RELEASE SAVEPOINT', async () => {
      const parentManager = new TransactionManager(mockConnection);
      await parentManager.begin();
      
      try {
        const nestedManager = new TransactionManager(mockConnection, {}, parentManager);
        await nestedManager.begin();
        await nestedManager.commit();
        
        // 应该调用RELEASE SAVEPOINT
        expect(mockConnection.connection.run).toHaveBeenCalledWith(
          expect.stringContaining('RELEASE SAVEPOINT'),
          expect.any(Function)
        );
      } finally {
        await parentManager.rollback();
      }
    });

    it('应该在嵌套事务回滚时使用ROLLBACK TO SAVEPOINT', async () => {
      const parentManager = new TransactionManager(mockConnection);
      await parentManager.begin();
      
      try {
        const nestedManager = new TransactionManager(mockConnection, {}, parentManager);
        await nestedManager.begin();
        await nestedManager.rollback();
        
        // 应该调用ROLLBACK TO SAVEPOINT
        expect(mockConnection.connection.run).toHaveBeenCalledWith(
          expect.stringContaining('ROLLBACK TO SAVEPOINT'),
          expect.any(Function)
        );
      } finally {
        await parentManager.rollback();
      }
    });
  });

  describe('事务选项', () => {
    it('应该使用指定的隔离级别', async () => {
      const isolationManager = new TransactionManager(mockConnection, {
        isolationLevel: 'IMMEDIATE',
      });
      
      await isolationManager.begin();
      
      expect(mockConnection.connection.run).toHaveBeenCalledWith(
        'BEGIN IMMEDIATE TRANSACTION',
        expect.any(Function)
      );
      
      await isolationManager.rollback();
    });

    it('应该使用默认的隔离级别', async () => {
      await transactionManager.begin();
      
      expect(mockConnection.connection.run).toHaveBeenCalledWith(
        'BEGIN DEFERRED TRANSACTION',
        expect.any(Function)
      );
    });

    it('应该支持不同的事务选项组合', async () => {
      const customOptions: TransactionOptions = {
        timeout: 5000,
        isolationLevel: 'EXCLUSIVE',
        retryOnDeadlock: true,
        maxRetries: 5,
        savepoints: true,
      };
      
      const customManager = new TransactionManager(mockConnection, customOptions);
      await customManager.begin();
      
      expect(mockConnection.connection.run).toHaveBeenCalledWith(
        'BEGIN EXCLUSIVE TRANSACTION',
        expect.any(Function)
      );
      
      await customManager.rollback();
    });
  });

  describe('事务统计信息', () => {
    it('应该提供准确的统计信息', async () => {
      const initialStats = transactionManager.getStats();
      
      expect(initialStats.id).toBeDefined();
      expect(initialStats.state).toBe(TransactionState.PENDING);
      expect(initialStats.startTime).toBeInstanceOf(Date);
      expect(initialStats.operationCount).toBe(0);
      expect(initialStats.isNested).toBe(false);
      expect(initialStats.savepointCount).toBe(0);
      expect(initialStats.endTime).toBeUndefined();
      expect(initialStats.duration).toBeUndefined();
    });

    it('应该跟踪操作计数', async () => {
      await transactionManager.begin();
      const executor = transactionManager.createExecutor();
      
      await executor.run('INSERT INTO test (value) VALUES (?)', ['test1']);
      await executor.run('INSERT INTO test (value) VALUES (?)', ['test2']);
      await executor.get('SELECT * FROM test WHERE id = ?', [1]);
      
      const stats = transactionManager.getStats();
      expect(stats.operationCount).toBe(3);
    });

    it('应该跟踪保存点计数', async () => {
      await transactionManager.begin();
      const executor = transactionManager.createExecutor();
      
      await executor.createSavepoint();
      await executor.createSavepoint();
      
      let stats = transactionManager.getStats();
      expect(stats.savepointCount).toBe(2);
      
      await executor.releaseSavepoint(await executor.createSavepoint());
      
      stats = transactionManager.getStats();
      expect(stats.savepointCount).toBe(2); // 创建后立即释放
    });

    it('应该计算事务持续时间', async () => {
      await transactionManager.begin();
      
      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await transactionManager.commit();
      
      const stats = transactionManager.getStats();
      expect(stats.duration).toBeGreaterThan(40);
      expect(stats.endTime).toBeInstanceOf(Date);
    });
  });

  describe('事务事件', () => {
    it('应该触发事务开始事件', async () => {
      const eventSpy = vi.fn();
      transactionManager.on('transaction-started', eventSpy);
      
      await transactionManager.begin();
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          state: TransactionState.ACTIVE,
        })
      );
    });

    it('应该触发事务提交事件', async () => {
      const eventSpy = vi.fn();
      transactionManager.on('transaction-committed', eventSpy);
      
      await transactionManager.begin();
      await transactionManager.commit();
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          state: TransactionState.COMMITTED,
          duration: expect.any(Number),
        })
      );
    });

    it('应该触发事务回滚事件', async () => {
      const eventSpy = vi.fn();
      transactionManager.on('transaction-rolled-back', eventSpy);
      
      await transactionManager.begin();
      await transactionManager.rollback('测试回滚');
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          state: TransactionState.ROLLED_BACK,
          rollbackReason: '测试回滚',
        })
      );
    });

    it('应该触发保存点事件', async () => {
      const createSpy = vi.fn();
      const rollbackSpy = vi.fn();
      const releaseSpy = vi.fn();
      
      transactionManager.on('savepoint-created', createSpy);
      transactionManager.on('savepoint-rollback', rollbackSpy);
      transactionManager.on('savepoint-released', releaseSpy);
      
      await transactionManager.begin();
      const executor = transactionManager.createExecutor();
      
      const savepointName = await executor.createSavepoint();
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: transactionManager.getStats().id,
          savepoint: expect.objectContaining({
            name: savepointName,
          }),
        })
      );
      
      await executor.rollbackToSavepoint(savepointName);
      expect(rollbackSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: transactionManager.getStats().id,
          savepointName,
        })
      );
      
      const newSavepoint = await executor.createSavepoint();
      await executor.releaseSavepoint(newSavepoint);
      expect(releaseSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: transactionManager.getStats().id,
          savepointName: newSavepoint,
        })
      );
    });
  });

  describe('错误处理', () => {
    it('应该在开始事务失败时设置失败状态', async () => {
      // Mock连接失败
      mockConnection.connection.run = vi.fn((sql, callback) => {
        setTimeout(() => callback?.(new Error('开始事务失败')), 10);
      });
      
      await expect(transactionManager.begin()).rejects.toThrow('开始事务失败');
      
      const stats = transactionManager.getStats();
      expect(stats.state).toBe(TransactionState.FAILED);
    });

    it('应该在提交事务失败时设置失败状态', async () => {
      await transactionManager.begin();
      
      // Mock提交失败
      mockConnection.connection.run = vi.fn((sql, callback) => {
        if (sql.includes('COMMIT')) {
          setTimeout(() => callback?.(new Error('提交失败')), 10);
        } else {
          setTimeout(() => callback?.(null), 10);
        }
      });
      
      await expect(transactionManager.commit()).rejects.toThrow('提交失败');
      
      const stats = transactionManager.getStats();
      expect(stats.state).toBe(TransactionState.FAILED);
    });

    it('应该在回滚事务失败时设置失败状态', async () => {
      await transactionManager.begin();
      
      // Mock回滚失败
      mockConnection.connection.run = vi.fn((sql, callback) => {
        if (sql.includes('ROLLBACK')) {
          setTimeout(() => callback?.(new Error('回滚失败')), 10);
        } else {
          setTimeout(() => callback?.(null), 10);
        }
      });
      
      await expect(transactionManager.rollback()).rejects.toThrow('回滚失败');
      
      const stats = transactionManager.getStats();
      expect(stats.state).toBe(TransactionState.FAILED);
    });

    it('应该处理保存点操作失败', async () => {
      await transactionManager.begin();
      const executor = transactionManager.createExecutor();
      
      // Mock保存点创建失败
      mockConnection.connection.run = vi.fn((sql, callback) => {
        if (sql.includes('SAVEPOINT')) {
          setTimeout(() => callback?.(new Error('保存点创建失败')), 10);
        } else {
          setTimeout(() => callback?.(null), 10);
        }
      });
      
      await expect(executor.createSavepoint()).rejects.toThrow('保存点创建失败');
    });
  });
});

describe('TransactionManagerFactory 单元测试', () => {
  let mockConnection: PooledConnection;

  beforeEach(() => {
    mockConnection = createMockConnection();
  });

  afterEach(async () => {
    // 清理所有活跃事务
    await TransactionManagerFactory.rollbackAllActiveTransactions('测试清理');
  });

  describe('事务管理器创建', () => {
    it('应该能够创建事务管理器', () => {
      const manager = TransactionManagerFactory.create(mockConnection);
      
      expect(manager).toBeInstanceOf(TransactionManager);
      
      const stats = manager.getStats();
      expect(stats.id).toBeDefined();
      expect(stats.state).toBe(TransactionState.PENDING);
    });

    it('应该能够创建带选项的事务管理器', () => {
      const options: TransactionOptions = {
        timeout: 5000,
        isolationLevel: 'IMMEDIATE',
      };
      
      const manager = TransactionManagerFactory.create(mockConnection, options);
      
      expect(manager).toBeInstanceOf(TransactionManager);
    });

    it('应该能够创建嵌套事务管理器', () => {
      const parentManager = TransactionManagerFactory.create(mockConnection);
      const nestedManager = TransactionManagerFactory.create(mockConnection, {}, parentManager);
      
      const nestedStats = nestedManager.getStats();
      expect(nestedStats.isNested).toBe(true);
    });
  });

  describe('活跃事务跟踪', () => {
    it('应该跟踪活跃事务', async () => {
      const manager1 = TransactionManagerFactory.create(mockConnection);
      const manager2 = TransactionManagerFactory.create(mockConnection);
      
      await manager1.begin();
      await manager2.begin();
      
      const activeTransactions = TransactionManagerFactory.getActiveTransactions();
      expect(activeTransactions).toHaveLength(2);
      
      const activeIds = activeTransactions.map(tx => tx.id);
      expect(activeIds).toContain(manager1.getStats().id);
      expect(activeIds).toContain(manager2.getStats().id);
      
      await manager1.commit();
      await manager2.rollback();
    });

    it('应该在事务完成后移除跟踪', async () => {
      const manager = TransactionManagerFactory.create(mockConnection);
      
      await manager.begin();
      
      let activeTransactions = TransactionManagerFactory.getActiveTransactions();
      expect(activeTransactions).toHaveLength(1);
      
      await manager.commit();
      
      activeTransactions = TransactionManagerFactory.getActiveTransactions();
      expect(activeTransactions).toHaveLength(0);
    });

    it('应该在事务回滚后移除跟踪', async () => {
      const manager = TransactionManagerFactory.create(mockConnection);
      
      await manager.begin();
      
      let activeTransactions = TransactionManagerFactory.getActiveTransactions();
      expect(activeTransactions).toHaveLength(1);
      
      await manager.rollback();
      
      activeTransactions = TransactionManagerFactory.getActiveTransactions();
      expect(activeTransactions).toHaveLength(0);
    });
  });

  describe('事务统计', () => {
    it('应该提供事务统计信息', () => {
      const stats = TransactionManagerFactory.getTransactionStats();
      
      expect(stats).toHaveProperty('activeCount');
      expect(stats).toHaveProperty('totalCreated');
      expect(stats).toHaveProperty('averageDuration');
      expect(typeof stats.activeCount).toBe('number');
    });

    it('应该正确计算活跃事务数量', async () => {
      const manager1 = TransactionManagerFactory.create(mockConnection);
      const manager2 = TransactionManagerFactory.create(mockConnection);
      
      await manager1.begin();
      await manager2.begin();
      
      const stats = TransactionManagerFactory.getTransactionStats();
      expect(stats.activeCount).toBe(2);
      
      await manager1.commit();
      await manager2.rollback();
    });
  });

  describe('强制回滚', () => {
    it('应该能够强制回滚所有活跃事务', async () => {
      const manager1 = TransactionManagerFactory.create(mockConnection);
      const manager2 = TransactionManagerFactory.create(mockConnection);
      
      await manager1.begin();
      await manager2.begin();
      
      let activeTransactions = TransactionManagerFactory.getActiveTransactions();
      expect(activeTransactions).toHaveLength(2);
      
      await TransactionManagerFactory.rollbackAllActiveTransactions('强制清理');
      
      activeTransactions = TransactionManagerFactory.getActiveTransactions();
      expect(activeTransactions).toHaveLength(0);
      
      // 验证事务状态
      expect(manager1.getStats().state).toBe(TransactionState.ROLLED_BACK);
      expect(manager2.getStats().state).toBe(TransactionState.ROLLED_BACK);
      expect(manager1.getStats().rollbackReason).toBe('强制清理');
      expect(manager2.getStats().rollbackReason).toBe('强制清理');
    });

    it('应该处理回滚失败的情况', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const manager = TransactionManagerFactory.create(mockConnection);
      await manager.begin();
      
      // Mock回滚失败
      mockConnection.connection.run = vi.fn((sql, callback) => {
        if (sql.includes('ROLLBACK')) {
          setTimeout(() => callback?.(new Error('回滚失败')), 10);
        } else {
          setTimeout(() => callback?.(null), 10);
        }
      });
      
      await TransactionManagerFactory.rollbackAllActiveTransactions('强制清理');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('强制回滚事务失败'),
        expect.any(String)
      );
      
      consoleSpy.mockRestore();
    });

    it('应该使用默认回滚原因', async () => {
      const manager = TransactionManagerFactory.create(mockConnection);
      await manager.begin();
      
      await TransactionManagerFactory.rollbackAllActiveTransactions();
      
      expect(manager.getStats().rollbackReason).toBe('系统强制回滚');
    });
  });

  describe('边界情况', () => {
    it('应该处理空的活跃事务列表', async () => {
      const activeTransactions = TransactionManagerFactory.getActiveTransactions();
      expect(activeTransactions).toHaveLength(0);
      
      // 强制回滚空列表应该不会出错
      await expect(TransactionManagerFactory.rollbackAllActiveTransactions())
        .resolves.toBeUndefined();
    });

    it('应该处理重复的事务完成事件', async () => {
      const manager = TransactionManagerFactory.create(mockConnection);
      await manager.begin();
      
      let activeTransactions = TransactionManagerFactory.getActiveTransactions();
      expect(activeTransactions).toHaveLength(1);
      
      await manager.commit();
      
      // 手动触发事件（模拟重复事件）
      manager.emit('transaction-committed', manager.getStats());
      
      activeTransactions = TransactionManagerFactory.getActiveTransactions();
      expect(activeTransactions).toHaveLength(0); // 应该仍然为0
    });
  });
});