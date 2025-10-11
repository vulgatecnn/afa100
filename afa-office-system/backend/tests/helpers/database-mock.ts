import { vi } from 'vitest';
import type { DatabaseResult } from '../../src/types/index.js';

/**
 * 数据库模拟工具
 * 提供统一的数据库模拟配置
 */
export class DatabaseMock {
  public get = vi.fn();
  public all = vi.fn();
  public run = vi.fn();
  public transaction = vi.fn();
  public isReady = vi.fn().mockReturnValue(true);
  public connect = vi.fn();
  public close = vi.fn();
  public executeWithRetry = vi.fn();
  public getStats = vi.fn();
  public healthCheck = vi.fn();

  /**
   * 重置所有模拟
   */
  reset(): void {
    vi.clearAllMocks();
    this.isReady.mockReturnValue(true);
  }

  /**
   * 模拟成功的查询结果
   */
  mockSuccessfulQuery<T>(method: 'get' | 'all', result: T): void {
    this[method].mockResolvedValue(result);
  }

  /**
   * 模拟成功的运行结果
   */
  mockSuccessfulRun(result: DatabaseResult): void {
    this.run.mockResolvedValue(result);
  }

  /**
   * 模拟数据库错误
   */
  mockDatabaseError(method: 'get' | 'all' | 'run', error: Error): void {
    this[method].mockRejectedValue(error);
  }

  /**
   * 模拟事务成功
   */
  mockSuccessfulTransaction(results: DatabaseResult[]): void {
    this.transaction.mockResolvedValue(results);
  }

  /**
   * 模拟事务失败
   */
  mockFailedTransaction(error: Error): void {
    this.transaction.mockRejectedValue(error);
  }

  /**
   * 获取默认的数据库实例模拟
   */
  static createMock(): DatabaseMock {
    return new DatabaseMock();
  }
}

/**
 * 创建数据库模拟实例
 */
export function createDatabaseMock(): DatabaseMock {
  return DatabaseMock.createMock();
}

/**
 * 模拟数据库模块
 */
export function mockDatabaseModule(): DatabaseMock {
  const mockDb = createDatabaseMock();
  
  // 模拟默认导出
  vi.doMock('../../src/utils/database.js', () => ({
    default: mockDb
  }));

  return mockDb;
}