import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { RetryManager, type RetryStats, type RetryEvent } from '../retry-manager.js';
import type { RetryOptions } from '../database.js';

describe('RetryManager 单元测试', () => {
  let retryManager: RetryManager;

  beforeAll(() => {
    // 设置测试环境
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    // 恢复环境变量
    delete process.env.NODE_ENV;
  });

  beforeEach(() => {
    retryManager = new RetryManager();
  });

  describe('基本重试功能', () => {
    it('应该在第一次尝试成功时不重试', async () => {
      let attemptCount = 0;
      const operation = vi.fn(async () => {
        attemptCount++;
        return 'success';
      });

      const options: RetryOptions = {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100,
        retryableErrors: ['SQLITE_BUSY'],
      };

      const result = await retryManager.executeWithRetry(operation, options);

      expect(result).toBe('success');
      expect(attemptCount).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('应该在可重试错误时进行重试', async () => {
      let attemptCount = 0;
      const operation = vi.fn(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error('数据库繁忙');
          (error as any).code = 'SQLITE_BUSY';
          throw error;
        }
        return 'success';
      });

      const options: RetryOptions = {
        maxRetries: 5,
        baseDelay: 10,
        maxDelay: 100,
        retryableErrors: ['SQLITE_BUSY'],
      };

      const result = await retryManager.executeWithRetry(operation, options);

      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('应该在不可重试错误时立即失败', async () => {
      let attemptCount = 0;
      const operation = vi.fn(async () => {
        attemptCount++;
        const error = new Error('语法错误');
        (error as any).code = 'SQLITE_ERROR';
        throw error;
      });

      const options: RetryOptions = {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100,
        retryableErrors: ['SQLITE_BUSY'],
      };

      await expect(retryManager.executeWithRetry(operation, options)).rejects.toThrow('语法错误');
      expect(attemptCount).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('应该在达到最大重试次数后失败', async () => {
      let attemptCount = 0;
      const operation = vi.fn(async () => {
        attemptCount++;
        const error = new Error('数据库繁忙');
        (error as any).code = 'SQLITE_BUSY';
        throw error;
      });

      const options: RetryOptions = {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100,
        retryableErrors: ['SQLITE_BUSY'],
      };

      await expect(retryManager.executeWithRetry(operation, options)).rejects.toThrow('数据库繁忙');
      expect(attemptCount).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('重试延迟计算', () => {
    it('应该使用指数退避策略', async () => {
      const delays: number[] = [];
      let attemptCount = 0;

      const operation = vi.fn(async () => {
        attemptCount++;
        if (attemptCount <= 3) {
          const error = new Error('数据库繁忙');
          (error as any).code = 'SQLITE_BUSY';
          throw error;
        }
        return 'success';
      });

      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((callback, delay) => {
        if (typeof delay === 'number' && delay > 0) {
          delays.push(delay);
        }
        return originalSetTimeout(callback as any, 0);
      }) as any;

      const options: RetryOptions = {
        maxRetries: 4,
        baseDelay: 100,
        maxDelay: 1000,
        retryableErrors: ['SQLITE_BUSY'],
      };

      try {
        await retryManager.executeWithRetry(operation, options);
        
        // 验证延迟是递增的（指数退避）
        expect(delays.length).toBe(3); // 3次重试
        expect(delays[1]).toBeGreaterThan(delays[0]);
        expect(delays[2]).toBeGreaterThan(delays[1]);
        
        // 验证延迟不超过最大值
        delays.forEach(delay => {
          expect(delay).toBeLessThanOrEqual(options.maxDelay);
        });
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });

    it('应该限制最大延迟时间', async () => {
      const delays: number[] = [];
      let attemptCount = 0;

      const operation = vi.fn(async () => {
        attemptCount++;
        const error = new Error('数据库繁忙');
        (error as any).code = 'SQLITE_BUSY';
        throw error;
      });

      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((callback, delay) => {
        if (typeof delay === 'number' && delay > 0) {
          delays.push(delay);
        }
        return originalSetTimeout(callback as any, 0);
      }) as any;

      const options: RetryOptions = {
        maxRetries: 10,
        baseDelay: 100,
        maxDelay: 500, // 较小的最大延迟
        retryableErrors: ['SQLITE_BUSY'],
      };

      try {
        await expect(retryManager.executeWithRetry(operation, options)).rejects.toThrow();
        
        // 所有延迟都应该不超过最大值
        delays.forEach(delay => {
          expect(delay).toBeLessThanOrEqual(options.maxDelay);
        });
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });
  });

  describe('错误类型识别', () => {
    it('应该识别SQLite错误码', async () => {
      const testCases = [
        { code: 'SQLITE_BUSY', shouldRetry: true },
        { code: 'SQLITE_LOCKED', shouldRetry: true },
        { code: 'SQLITE_PROTOCOL', shouldRetry: true },
        { code: 'SQLITE_ERROR', shouldRetry: false },
        { code: 'UNKNOWN', shouldRetry: false },
      ];

      const options: RetryOptions = {
        maxRetries: 2,
        baseDelay: 10,
        maxDelay: 100,
        retryableErrors: ['SQLITE_BUSY', 'SQLITE_LOCKED', 'SQLITE_PROTOCOL'],
      };

      for (const testCase of testCases) {
        let attemptCount = 0;
        const operation = vi.fn(async () => {
          attemptCount++;
          const error = new Error('测试错误');
          (error as any).code = testCase.code;
          throw error;
        });

        try {
          await retryManager.executeWithRetry(operation, options);
        } catch (error) {
          // 预期的错误
        }

        if (testCase.shouldRetry) {
          expect(attemptCount).toBe(options.maxRetries);
        } else {
          expect(attemptCount).toBe(1);
        }
      }
    });

    it('应该识别SQLite错误消息模式', async () => {
      const testMessages = [
        { message: 'database is locked', shouldRetry: true },
        { message: 'database is busy', shouldRetry: true },
        { message: 'SQLITE_BUSY: database is locked', shouldRetry: true },
        { message: 'cannot start a transaction within a transaction', shouldRetry: true },
        { message: 'syntax error', shouldRetry: false },
        { message: 'no such table', shouldRetry: false },
      ];

      const options: RetryOptions = {
        maxRetries: 2,
        baseDelay: 10,
        maxDelay: 100,
        retryableErrors: [], // 空的错误码列表，依赖消息模式匹配
      };

      for (const testCase of testMessages) {
        let attemptCount = 0;
        const operation = vi.fn(async () => {
          attemptCount++;
          throw new Error(testCase.message);
        });

        try {
          await retryManager.executeWithRetry(operation, options);
        } catch (error) {
          // 预期的错误
        }

        if (testCase.shouldRetry) {
          expect(attemptCount).toBe(options.maxRetries);
        } else {
          expect(attemptCount).toBe(1);
        }
      }
    });
  });

  describe('批量操作重试', () => {
    it('应该成功执行所有批量操作', async () => {
      const operations = [
        vi.fn(async () => 'result1'),
        vi.fn(async () => 'result2'),
        vi.fn(async () => 'result3'),
      ];

      const options: RetryOptions = {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100,
        retryableErrors: ['SQLITE_BUSY'],
      };

      const results = await retryManager.executeMultipleWithRetry(operations, options);

      expect(results).toEqual(['result1', 'result2', 'result3']);
      operations.forEach(op => expect(op).toHaveBeenCalledTimes(1));
    });

    it('应该在部分操作失败时抛出错误', async () => {
      const operations = [
        vi.fn(async () => 'result1'),
        vi.fn(async () => {
          throw new Error('操作失败');
        }),
        vi.fn(async () => 'result3'),
      ];

      const options: RetryOptions = {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100,
        retryableErrors: ['SQLITE_BUSY'],
      };

      await expect(retryManager.executeMultipleWithRetry(operations, options))
        .rejects.toThrow('批量操作部分失败');
    });

    it('应该重试失败的批量操作', async () => {
      let attempt1Count = 0;
      let attempt2Count = 0;

      const operations = [
        vi.fn(async () => {
          attempt1Count++;
          if (attempt1Count < 2) {
            const error = new Error('数据库繁忙');
            (error as any).code = 'SQLITE_BUSY';
            throw error;
          }
          return 'result1';
        }),
        vi.fn(async () => {
          attempt2Count++;
          if (attempt2Count < 3) {
            const error = new Error('数据库繁忙');
            (error as any).code = 'SQLITE_BUSY';
            throw error;
          }
          return 'result2';
        }),
      ];

      const options: RetryOptions = {
        maxRetries: 5,
        baseDelay: 10,
        maxDelay: 100,
        retryableErrors: ['SQLITE_BUSY'],
      };

      const results = await retryManager.executeMultipleWithRetry(operations, options);

      expect(results).toEqual(['result1', 'result2']);
      expect(attempt1Count).toBe(2);
      expect(attempt2Count).toBe(3);
    });
  });

  describe('条件重试', () => {
    it('应该根据自定义条件决定是否重试', async () => {
      let attemptCount = 0;
      const operation = vi.fn(async () => {
        attemptCount++;
        const error = new Error('自定义错误');
        (error as any).customCode = attemptCount;
        throw error;
      });

      const retryCondition = (error: Error, attempt: number) => {
        return (error as any).customCode <= 2 && attempt <= 3;
      };

      const options: RetryOptions = {
        maxRetries: 5,
        baseDelay: 10,
        maxDelay: 100,
        retryableErrors: ['SQLITE_BUSY'], // 这个不会匹配，依赖自定义条件
      };

      await expect(retryManager.executeWithConditionalRetry(
        operation,
        options,
        retryCondition
      )).rejects.toThrow('自定义错误');

      expect(attemptCount).toBe(3); // 应该重试到第3次
    });

    it('应该在自定义条件不满足时立即停止', async () => {
      let attemptCount = 0;
      const operation = vi.fn(async () => {
        attemptCount++;
        throw new Error('立即停止的错误');
      });

      const retryCondition = () => false; // 永远不重试

      const options: RetryOptions = {
        maxRetries: 5,
        baseDelay: 10,
        maxDelay: 100,
        retryableErrors: ['SQLITE_BUSY'],
      };

      await expect(retryManager.executeWithConditionalRetry(
        operation,
        options,
        retryCondition
      )).rejects.toThrow('立即停止的错误');

      expect(attemptCount).toBe(1);
    });
  });

  describe('SQLite专用重试方法', () => {
    it('应该使用SQLite特定的重试逻辑', async () => {
      let attemptCount = 0;
      const operation = vi.fn(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error('database is locked');
          (error as any).code = 'SQLITE_LOCKED';
          throw error;
        }
        return 'success';
      });

      const result = await retryManager.executeSQLiteOperation(operation);

      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });

    it('应该根据环境使用不同的重试配置', async () => {
      // 测试环境配置
      process.env.NODE_ENV = 'test';
      
      let testAttemptCount = 0;
      const testOperation = vi.fn(async () => {
        testAttemptCount++;
        const error = new Error('database is busy');
        (error as any).code = 'SQLITE_BUSY';
        throw error;
      });

      try {
        await retryManager.executeSQLiteOperation(testOperation);
      } catch (error) {
        // 预期的错误
      }

      // 测试环境应该有更多重试次数
      expect(testAttemptCount).toBeGreaterThan(3);

      // 生产环境配置
      process.env.NODE_ENV = 'production';
      
      let prodAttemptCount = 0;
      const prodOperation = vi.fn(async () => {
        prodAttemptCount++;
        const error = new Error('database is busy');
        (error as any).code = 'SQLITE_BUSY';
        throw error;
      });

      try {
        await retryManager.executeSQLiteOperation(prodOperation);
      } catch (error) {
        // 预期的错误
      }

      // 生产环境应该有较少的重试次数
      expect(prodAttemptCount).toBeLessThan(testAttemptCount);

      // 恢复测试环境
      process.env.NODE_ENV = 'test';
    });

    it('应该处理事务冲突错误', async () => {
      let attemptCount = 0;
      const operation = vi.fn(async () => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error('cannot start a transaction within a transaction');
        }
        return 'success';
      });

      const result = await retryManager.executeSQLiteOperation(operation);

      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });
  });

  describe('批量SQLite操作', () => {
    it('应该串行执行批量SQLite操作', async () => {
      const executionOrder: number[] = [];
      const operations = [
        vi.fn(async () => {
          executionOrder.push(1);
          return 'result1';
        }),
        vi.fn(async () => {
          executionOrder.push(2);
          return 'result2';
        }),
        vi.fn(async () => {
          executionOrder.push(3);
          return 'result3';
        }),
      ];

      const results = await retryManager.executeBatchSQLiteOperations(operations);

      expect(results).toEqual(['result1', 'result2', 'result3']);
      expect(executionOrder).toEqual([1, 2, 3]);
    });

    it('应该处理批量操作中的部分失败', async () => {
      const operations = [
        vi.fn(async () => 'result1'),
        vi.fn(async () => {
          throw new Error('不可重试的错误');
        }),
        vi.fn(async () => 'result3'),
      ];

      const results = await retryManager.executeBatchSQLiteOperations(operations);

      // 应该返回成功的结果，跳过失败的操作
      expect(results).toEqual(['result1', 'result3']);
    });

    it('应该在所有操作都失败时抛出错误', async () => {
      const operations = [
        vi.fn(async () => {
          throw new Error('错误1');
        }),
        vi.fn(async () => {
          throw new Error('错误2');
        }),
      ];

      await expect(retryManager.executeBatchSQLiteOperations(operations))
        .rejects.toThrow('所有批量SQLite操作都失败了');
    });
  });

  describe('统计信息和事件', () => {
    it('应该正确记录统计信息', async () => {
      const initialStats = retryManager.getStats();
      expect(initialStats.totalAttempts).toBe(0);
      expect(initialStats.successfulRetries).toBe(0);
      expect(initialStats.failedRetries).toBe(0);

      // 执行成功的重试操作
      let attemptCount = 0;
      await retryManager.executeWithRetry(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error('数据库繁忙');
          (error as any).code = 'SQLITE_BUSY';
          throw error;
        }
        return 'success';
      }, {
        maxRetries: 5,
        baseDelay: 10,
        maxDelay: 100,
        retryableErrors: ['SQLITE_BUSY'],
      });

      const afterSuccessStats = retryManager.getStats();
      expect(afterSuccessStats.totalAttempts).toBe(3);
      expect(afterSuccessStats.successfulRetries).toBe(1);
      expect(afterSuccessStats.failedRetries).toBe(0);

      // 执行失败的重试操作
      try {
        await retryManager.executeWithRetry(async () => {
          const error = new Error('数据库繁忙');
          (error as any).code = 'SQLITE_BUSY';
          throw error;
        }, {
          maxRetries: 2,
          baseDelay: 10,
          maxDelay: 100,
          retryableErrors: ['SQLITE_BUSY'],
        });
      } catch (error) {
        // 预期的错误
      }

      const finalStats = retryManager.getStats();
      expect(finalStats.totalAttempts).toBe(5); // 3 + 2
      expect(finalStats.successfulRetries).toBe(1);
      expect(finalStats.failedRetries).toBe(1);
    });

    it('应该记录重试原因统计', async () => {
      const options: RetryOptions = {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100,
        retryableErrors: ['SQLITE_BUSY', 'SQLITE_LOCKED'],
      };

      // 执行不同类型的错误
      try {
        await retryManager.executeWithRetry(async () => {
          const error = new Error('数据库繁忙');
          (error as any).code = 'SQLITE_BUSY';
          throw error;
        }, options);
      } catch (error) {
        // 预期的错误
      }

      try {
        await retryManager.executeWithRetry(async () => {
          const error = new Error('数据库锁定');
          (error as any).code = 'SQLITE_LOCKED';
          throw error;
        }, options);
      } catch (error) {
        // 预期的错误
      }

      const stats = retryManager.getStats();
      expect(stats.retryReasons['SQLITE_BUSY']).toBe(3);
      expect(stats.retryReasons['SQLITE_LOCKED']).toBe(3);
    });

    it('应该计算平均重试延迟', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((callback, delay) => {
        if (typeof delay === 'number' && delay > 0) {
          delays.push(delay);
        }
        return originalSetTimeout(callback as any, 0);
      }) as any;

      try {
        await retryManager.executeWithRetry(async () => {
          const error = new Error('数据库繁忙');
          (error as any).code = 'SQLITE_BUSY';
          throw error;
        }, {
          maxRetries: 3,
          baseDelay: 100,
          maxDelay: 1000,
          retryableErrors: ['SQLITE_BUSY'],
        });
      } catch (error) {
        // 预期的错误
      }

      const stats = retryManager.getStats();
      expect(stats.averageRetryDelay).toBeGreaterThan(0);
      
      global.setTimeout = originalSetTimeout;
    });

    it('应该支持重试事件监听', async () => {
      const retryEvents: RetryEvent[] = [];
      
      retryManager.onRetry((event) => {
        retryEvents.push(event);
      });

      try {
        await retryManager.executeWithRetry(async () => {
          const error = new Error('数据库繁忙');
          (error as any).code = 'SQLITE_BUSY';
          throw error;
        }, {
          maxRetries: 3,
          baseDelay: 10,
          maxDelay: 100,
          retryableErrors: ['SQLITE_BUSY'],
        });
      } catch (error) {
        // 预期的错误
      }

      expect(retryEvents).toHaveLength(3);
      
      retryEvents.forEach((event, index) => {
        expect(event.operation).toBeDefined();
        expect(event.attempt).toBe(index + 1);
        expect(event.maxAttempts).toBe(3);
        expect(event.error).toBeInstanceOf(Error);
        expect(event.delay).toBeGreaterThan(0);
        expect(event.timestamp).toBeInstanceOf(Date);
      });
    });

    it('应该支持移除重试事件监听器', async () => {
      const retryEvents: RetryEvent[] = [];
      
      const listener = (event: RetryEvent) => {
        retryEvents.push(event);
      };

      retryManager.onRetry(listener);
      retryManager.removeRetryListener(listener);

      try {
        await retryManager.executeWithRetry(async () => {
          const error = new Error('数据库繁忙');
          (error as any).code = 'SQLITE_BUSY';
          throw error;
        }, {
          maxRetries: 2,
          baseDelay: 10,
          maxDelay: 100,
          retryableErrors: ['SQLITE_BUSY'],
        });
      } catch (error) {
        // 预期的错误
      }

      expect(retryEvents).toHaveLength(0);
    });

    it('应该能够重置统计信息', async () => {
      // 执行一些操作生成统计数据
      try {
        await retryManager.executeWithRetry(async () => {
          const error = new Error('数据库繁忙');
          (error as any).code = 'SQLITE_BUSY';
          throw error;
        }, {
          maxRetries: 2,
          baseDelay: 10,
          maxDelay: 100,
          retryableErrors: ['SQLITE_BUSY'],
        });
      } catch (error) {
        // 预期的错误
      }

      const beforeReset = retryManager.getStats();
      expect(beforeReset.totalAttempts).toBeGreaterThan(0);

      retryManager.resetStats();

      const afterReset = retryManager.getStats();
      expect(afterReset.totalAttempts).toBe(0);
      expect(afterReset.successfulRetries).toBe(0);
      expect(afterReset.failedRetries).toBe(0);
      expect(afterReset.averageRetryDelay).toBe(0);
      expect(Object.keys(afterReset.retryReasons)).toHaveLength(0);
    });
  });

  describe('预定义重试选项', () => {
    it('应该提供SQLite重试选项', () => {
      const options = RetryManager.createSQLiteRetryOptions();
      
      expect(options.maxRetries).toBe(5);
      expect(options.baseDelay).toBe(100);
      expect(options.maxDelay).toBe(5000);
      expect(options.retryableErrors).toContain('SQLITE_BUSY');
      expect(options.retryableErrors).toContain('SQLITE_LOCKED');
    });

    it('应该提供测试环境重试选项', () => {
      const options = RetryManager.createTestRetryOptions();
      
      expect(options.maxRetries).toBe(10);
      expect(options.baseDelay).toBe(50);
      expect(options.maxDelay).toBe(2000);
      expect(options.retryableErrors).toContain('SQLITE_BUSY');
    });

    it('应该提供生产环境重试选项', () => {
      const options = RetryManager.createProductionRetryOptions();
      
      expect(options.maxRetries).toBe(3);
      expect(options.baseDelay).toBe(200);
      expect(options.maxDelay).toBe(10000);
      expect(options.retryableErrors).toContain('SQLITE_BUSY');
    });

    it('应该支持重写预定义选项', () => {
      const customOptions = RetryManager.createSQLiteRetryOptions({
        maxRetries: 10,
        baseDelay: 200,
      });
      
      expect(customOptions.maxRetries).toBe(10);
      expect(customOptions.baseDelay).toBe(200);
      expect(customOptions.maxDelay).toBe(5000); // 保持默认值
    });
  });

  describe('错误处理边界情况', () => {
    it('应该处理没有错误码的错误', async () => {
      let attemptCount = 0;
      const operation = vi.fn(async () => {
        attemptCount++;
        throw new Error('没有错误码的错误');
      });

      const options: RetryOptions = {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100,
        retryableErrors: ['SQLITE_BUSY'],
      };

      await expect(retryManager.executeWithRetry(operation, options)).rejects.toThrow();
      expect(attemptCount).toBe(1); // 不应该重试
    });

    it('应该处理空的错误消息', async () => {
      let attemptCount = 0;
      const operation = vi.fn(async () => {
        attemptCount++;
        const error = new Error('');
        (error as any).code = 'SQLITE_BUSY';
        throw error;
      });

      const options: RetryOptions = {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100,
        retryableErrors: ['SQLITE_BUSY'],
      };

      await expect(retryManager.executeWithRetry(operation, options)).rejects.toThrow();
      expect(attemptCount).toBe(3); // 应该重试
    });

    it('应该处理重试事件回调中的错误', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      retryManager.onRetry(() => {
        throw new Error('回调错误');
      });

      try {
        await retryManager.executeWithRetry(async () => {
          const error = new Error('数据库繁忙');
          (error as any).code = 'SQLITE_BUSY';
          throw error;
        }, {
          maxRetries: 2,
          baseDelay: 10,
          maxDelay: 100,
          retryableErrors: ['SQLITE_BUSY'],
        });
      } catch (error) {
        // 预期的错误
      }

      expect(consoleSpy).toHaveBeenCalledWith('重试事件回调执行失败:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});