/**
 * 测试环境管理器接口
 * 定义统一的测试环境管理接口
 */

import { DatabaseAdapter } from '../../src/utils/database-adapter.js';

export interface TestEnvironment {
  id: string;
  databaseName?: string;
  databasePath?: string;
  adapter: DatabaseAdapter;
  isolationLevel: 'process' | 'thread' | 'test';
  isActive: boolean;
  createdAt: Date;
  resources: Set<string>;
  cleanup: () => Promise<void>;
}

export interface TestEnvironmentOptions {
  isolationLevel?: 'process' | 'thread' | 'test';
  databasePrefix?: string;
  autoCleanup?: boolean;
  maxAge?: number;
}

export interface TestEnvironmentManager {
  /**
   * 创建隔离的测试环境
   */
  createIsolatedEnvironment(options?: TestEnvironmentOptions): Promise<TestEnvironment>;

  /**
   * 获取测试环境
   */
  getEnvironment(envId: string): TestEnvironment | undefined;

  /**
   * 获取所有活跃的测试环境
   */
  getActiveEnvironments(): TestEnvironment[];

  /**
   * 清理指定的测试环境
   */
  cleanupEnvironment(env: TestEnvironment): Promise<void>;

  /**
   * 清理所有测试环境
   */
  cleanupAllEnvironments(): Promise<void>;

  /**
   * 清理过期的测试环境
   */
  cleanupExpiredEnvironments(maxAge?: number): Promise<string[]>;

  /**
   * 验证环境隔离
   */
  validateEnvironmentIsolation(env1: TestEnvironment, env2: TestEnvironment): Promise<boolean>;

  /**
   * 获取管理器状态
   */
  getManagerStatus(): {
    totalEnvironments: number;
    activeEnvironments: number;
    oldestEnvironment?: Date;
    newestEnvironment?: Date;
  };
}

/**
 * 测试环境错误基类
 */
export class TestEnvironmentError extends Error {
  constructor(message: string, public environmentId?: string) {
    super(message);
    this.name = 'TestEnvironmentError';
  }
}

/**
 * 环境创建错误
 */
export class EnvironmentCreationError extends TestEnvironmentError {
  constructor(message: string, environmentId?: string) {
    super(message, environmentId);
    this.name = 'EnvironmentCreationError';
  }
}

/**
 * 环境清理错误
 */
export class EnvironmentCleanupError extends TestEnvironmentError {
  constructor(message: string, environmentId?: string) {
    super(message, environmentId);
    this.name = 'EnvironmentCleanupError';
  }
}

/**
 * 环境隔离验证错误
 */
export class EnvironmentIsolationError extends TestEnvironmentError {
  constructor(message: string, environmentId?: string) {
    super(message, environmentId);
    this.name = 'EnvironmentIsolationError';
  }
}