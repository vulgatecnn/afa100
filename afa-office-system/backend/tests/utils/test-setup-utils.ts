/**
 * 测试设置工具
 * 提供测试环境初始化和清理的便捷方法
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import type {
  TestConfig,
  MockConfig,
  DatabaseTestConfig,
  ApiTestConfig,
  TestDataConfig,
  GlobalTestConfig
} from '../types/test-type-config.js';
import {
  setupGlobalMocks,
  cleanupGlobalMocks,
  resetAllMocks
} from './mock-utils.js';
import {
  TestEnvironmentUtils,
  TestTimeUtils
} from './test-type-utils.js';

/**
 * 测试设置管理器
 */
export class TestSetupManager {
  private static config: Partial<GlobalTestConfig> = {};
  private static isSetup = false;

  /**
   * 初始化测试环境
   */
  static async initialize(config: Partial<GlobalTestConfig> = {}): Promise<void> {
    if (this.isSetup) {
      return;
    }

    this.config = config;
    
    // 设置环境变量
    if (config.test) {
      TestEnvironmentUtils.setupTestEnv({
        NODE_ENV: 'test',
        DB_TEST_PATH: config.test.database?.path || ':memory:',
        JWT_SECRET: config.test.auth?.jwtSecret || 'test-jwt-secret',
        WECHAT_APP_ID: config.test.wechat?.appId || 'test-app-id',
        WECHAT_APP_SECRET: config.test.wechat?.appSecret || 'test-app-secret',
      });
    }

    // 设置全局 Mock
    if (config.mocks?.globalMocks) {
      setupGlobalMocks();
    }

    // 设置时间 Mock（如果需要）
    if (config.test?.database?.resetBetweenTests) {
      TestTimeUtils.mockSystemTime('2024-01-01T00:00:00.000Z');
    }

    this.isSetup = true;
  }

  /**
   * 清理测试环境
   */
  static async cleanup(): Promise<void> {
    if (!this.isSetup) {
      return;
    }

    // 清理全局 Mock
    cleanupGlobalMocks();

    // 恢复时间
    TestTimeUtils.restoreSystemTime();

    // 清理环境变量
    TestEnvironmentUtils.cleanupTestEnv();

    this.isSetup = false;
  }

  /**
   * 获取当前配置
   */
  static getConfig(): Partial<GlobalTestConfig> {
    return this.config;
  }

  /**
   * 更新配置
   */
  static updateConfig(updates: Partial<GlobalTestConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

/**
 * 数据库测试设置
 */
export class DatabaseTestSetup {
  private static connections: Map<string, any> = new Map();

  /**
   * 设置数据库连接
   */
  static async setupDatabase(config: DatabaseTestConfig): Promise<void> {
    // 这里应该根据实际的数据库配置进行设置
    // 目前使用 Mock 实现
    const mockDb = {
      connect: vi.fn(),
      close: vi.fn(),
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
    };

    this.connections.set('default', mockDb);
  }

  /**
   * 清理数据库
   */
  static async cleanupDatabase(): Promise<void> {
    for (const [name, connection] of this.connections) {
      if (connection.close) {
        await connection.close();
      }
    }
    this.connections.clear();
  }

  /**
   * 重置数据库数据
   */
  static async resetDatabase(): Promise<void> {
    // 实现数据库重置逻辑
    for (const connection of this.connections.values()) {
      if (connection.run) {
        // 清空所有表
        await connection.run('DELETE FROM users');
        await connection.run('DELETE FROM merchants');
        await connection.run('DELETE FROM projects');
        await connection.run('DELETE FROM venues');
        await connection.run('DELETE FROM floors');
        await connection.run('DELETE FROM visitor_applications');
        await connection.run('DELETE FROM access_records');
      }
    }
  }

  /**
   * 获取数据库连接
   */
  static getConnection(name: string = 'default'): any {
    return this.connections.get(name);
  }
}

/**
 * API 测试设置
 */
export class ApiTestSetup {
  private static server: any = null;
  private static baseUrl: string = '';

  /**
   * 启动测试服务器
   */
  static async startServer(config: ApiTestConfig): Promise<void> {
    // 这里应该启动实际的测试服务器
    // 目前使用 Mock 实现
    this.server = {
      listen: vi.fn(),
      close: vi.fn(),
      address: vi.fn().mockReturnValue({ port: 5100 }),
    };

    this.baseUrl = 'http://localhost:5100';
  }

  /**
   * 停止测试服务器
   */
  static async stopServer(): Promise<void> {
    if (this.server && this.server.close) {
      await this.server.close();
      this.server = null;
    }
  }

  /**
   * 获取服务器基础 URL
   */
  static getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * 获取服务器实例
   */
  static getServer(): any {
    return this.server;
  }
}

/**
 * Mock 设置管理器
 */
export class MockSetupManager {
  private static activeMocks: Set<string> = new Set();

  /**
   * 设置全局 Mock
   */
  static setupGlobalMocks(config: MockConfig): void {
    if (config.globalMocks.database) {
      this.setupDatabaseMocks();
    }

    if (config.globalMocks.jwt) {
      this.setupJWTMocks();
    }

    if (config.globalMocks.bcrypt) {
      this.setupBcryptMocks();
    }

    if (config.globalMocks.axios) {
      this.setupAxiosMocks();
    }

    if (config.globalMocks.wechat) {
      this.setupWechatMocks();
    }
  }

  /**
   * 设置数据库 Mock
   */
  private static setupDatabaseMocks(): void {
    vi.mock('../../src/utils/database.js', () => ({
      database: {
        connect: vi.fn(),
        close: vi.fn(),
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn(),
      },
    }));
    this.activeMocks.add('database');
  }

  /**
   * 设置 JWT Mock
   */
  private static setupJWTMocks(): void {
    vi.mock('jsonwebtoken', () => ({
      sign: vi.fn().mockReturnValue('mock-jwt-token'),
      verify: vi.fn().mockReturnValue({ userId: 1, userType: 'tenant_admin' }),
      decode: vi.fn().mockReturnValue({ userId: 1, userType: 'tenant_admin' }),
    }));
    this.activeMocks.add('jwt');
  }

  /**
   * 设置 bcrypt Mock
   */
  private static setupBcryptMocks(): void {
    vi.mock('bcrypt', () => ({
      hash: vi.fn().mockResolvedValue('hashed-password'),
      compare: vi.fn().mockResolvedValue(true),
      hashSync: vi.fn().mockReturnValue('hashed-password'),
      compareSync: vi.fn().mockReturnValue(true),
    }));
    this.activeMocks.add('bcrypt');
  }

  /**
   * 设置 Axios Mock
   */
  private static setupAxiosMocks(): void {
    vi.mock('axios', () => ({
      default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        create: vi.fn().mockReturnThis(),
      },
      isAxiosError: vi.fn().mockReturnValue(false),
    }));
    this.activeMocks.add('axios');
  }

  /**
   * 设置微信 Mock
   */
  private static setupWechatMocks(): void {
    vi.mock('../../src/utils/wechat.js', () => ({
      getSessionByCode: vi.fn().mockResolvedValue({
        openid: 'mock-openid',
        session_key: 'mock-session-key',
      }),
      formatUserInfo: vi.fn().mockReturnValue({
        openId: 'mock-openid',
        nickName: 'Mock User',
        avatarUrl: 'https://mock-avatar.com/avatar.jpg',
      }),
    }));
    this.activeMocks.add('wechat');
  }

  /**
   * 清理所有 Mock
   */
  static cleanupAllMocks(): void {
    vi.clearAllMocks();
    vi.resetAllMocks();
    this.activeMocks.clear();
  }

  /**
   * 获取活跃的 Mock 列表
   */
  static getActiveMocks(): string[] {
    return Array.from(this.activeMocks);
  }
}

/**
 * 测试生命周期钩子
 */
export class TestLifecycleHooks {
  /**
   * 设置测试套件钩子
   */
  static setupSuite(config: Partial<GlobalTestConfig> = {}): void {
    beforeAll(async () => {
      await TestSetupManager.initialize(config);
      
      if (config.database) {
        await DatabaseTestSetup.setupDatabase(config.database);
      }
      
      if (config.api) {
        await ApiTestSetup.startServer(config.api);
      }
      
      if (config.mocks) {
        MockSetupManager.setupGlobalMocks(config.mocks);
      }
    });

    afterAll(async () => {
      await DatabaseTestSetup.cleanupDatabase();
      await ApiTestSetup.stopServer();
      MockSetupManager.cleanupAllMocks();
      await TestSetupManager.cleanup();
    });
  }

  /**
   * 设置测试用例钩子
   */
  static setupTest(config: Partial<GlobalTestConfig> = {}): void {
    beforeEach(async () => {
      if (config.mocks?.resetBetweenTests) {
        resetAllMocks();
      }
      
      if (config.database?.cleanup?.strategy === 'truncate') {
        await DatabaseTestSetup.resetDatabase();
      }
    });

    afterEach(async () => {
      if (config.mocks?.clearBetweenTests) {
        vi.clearAllMocks();
      }
    });
  }

  /**
   * 设置完整的测试环境
   */
  static setupFullEnvironment(config: Partial<GlobalTestConfig> = {}): void {
    this.setupSuite(config);
    this.setupTest(config);
  }
}

/**
 * 便捷的设置函数
 */
export function setupTestEnvironment(config: Partial<GlobalTestConfig> = {}): void {
  TestLifecycleHooks.setupFullEnvironment(config);
}

export function setupTestSuite(config: Partial<GlobalTestConfig> = {}): void {
  TestLifecycleHooks.setupSuite(config);
}

export function setupTestCase(config: Partial<GlobalTestConfig> = {}): void {
  TestLifecycleHooks.setupTest(config);
}

// 类已经在上面定义时导出了，这里不需要重复导出