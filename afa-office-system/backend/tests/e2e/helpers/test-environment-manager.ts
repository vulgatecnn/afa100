/**
 * 端到端测试环境管理器
 * 负责设置和清理E2E测试环境
 */

import { TestDatabaseManager } from '../../helpers/test-database-manager.js';
import { TestDataFactory } from '../../helpers/test-data-factory.js';

export interface TestEnvironmentConfig {
  database?: {
    reset?: boolean;
    seedData?: boolean;
  };
  services?: {
    startBackend?: boolean;
    startFrontend?: boolean;
  };
  cleanup?: {
    autoCleanup?: boolean;
    preserveData?: boolean;
  };
}

/**
 * 测试环境管理器
 */
export class TestEnvironmentManager {
  private dbManager: TestDatabaseManager;
  private dataFactory: TestDataFactory;
  private config: TestEnvironmentConfig;
  private isSetup: boolean = false;

  constructor(config: TestEnvironmentConfig = {}) {
    this.config = {
      database: {
        reset: true,
        seedData: true,
        ...config.database
      },
      services: {
        startBackend: false, // E2E测试假设服务已经运行
        startFrontend: false,
        ...config.services
      },
      cleanup: {
        autoCleanup: true,
        preserveData: false,
        ...config.cleanup
      }
    };

    this.dbManager = new TestDatabaseManager();
    this.dataFactory = new TestDataFactory();
  }

  /**
   * 设置测试环境
   */
  async setup(): Promise<void> {
    if (this.isSetup) {
      return;
    }

    try {
      // 设置数据库
      if (this.config.database?.reset) {
        await this.dbManager.resetDatabase();
      }

      // 初始化测试数据
      if (this.config.database?.seedData) {
        await this.seedTestData();
      }

      this.isSetup = true;
    } catch (error) {
      console.error('测试环境设置失败:', error);
      throw error;
    }
  }

  /**
   * 清理测试环境
   */
  async cleanup(): Promise<void> {
    if (!this.isSetup) {
      return;
    }

    try {
      if (this.config.cleanup?.autoCleanup && !this.config.cleanup?.preserveData) {
        await this.dbManager.cleanup();
      }

      this.isSetup = false;
    } catch (error) {
      console.error('测试环境清理失败:', error);
      throw error;
    }
  }

  /**
   * 重置数据库
   */
  async resetDatabase(): Promise<void> {
    await this.dbManager.resetDatabase();
    
    if (this.config.database?.seedData) {
      await this.seedTestData();
    }
  }

  /**
   * 播种测试数据
   */
  private async seedTestData(): Promise<void> {
    // 创建基础测试数据
    await this.dataFactory.createTestMerchants(2);
    await this.dataFactory.createTestUsers(5);
    await this.dataFactory.createTestVisitors(3);
  }

  /**
   * 获取测试配置
   */
  getConfig(): TestEnvironmentConfig {
    return { ...this.config };
  }

  /**
   * 检查环境是否已设置
   */
  isEnvironmentReady(): boolean {
    return this.isSetup;
  }

  /**
   * 创建快速设置的环境管理器
   */
  static async quickSetup(config?: TestEnvironmentConfig): Promise<TestEnvironmentManager> {
    const manager = new TestEnvironmentManager(config);
    await manager.setup();
    return manager;
  }
}

export default TestEnvironmentManager;