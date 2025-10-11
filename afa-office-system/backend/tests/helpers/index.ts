/**
 * 测试辅助工具统一导出 - MySQL适配版本
 */

// 后端测试工具
export { ApiTestHelper } from './api-test-helper'
export { DatabaseTestHelper } from './database-test-helper'

// MySQL专用测试工具
export { 
  MySQLTestDataFactory,
  MySQLDatabaseTestHelper,
  MySQLTimeoutManager,
  MySQLTestToolkit,
  createMySQLTestToolkit
} from './mysql-test-tools'

// 错误处理工具
export {
  TestErrorHandler,
  TestError,
  TestErrorType,
  createTestContext,
  withErrorHandling,
  catchTestError,
  catchTestErrorSync
} from '../../../shared/test-helpers/error-handler'

// 类型定义
export interface MySQLTestConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  connectionLimit?: number
  acquireTimeout?: number
  timeout?: number
}

export interface TestEnvironmentConfig {
  database: MySQLTestConfig
  cleanup: {
    autoCleanup: boolean
    cleanupTimeout: number
    preserveTables?: string[]
  }
  performance: {
    enableMetrics: boolean
    slowQueryThreshold: number
    maxQueryTime: number
  }
}

/**
 * 测试环境管理器
 */
export class TestEnvironmentManager {
  private static instance: TestEnvironmentManager
  private config: TestEnvironmentConfig
  private isSetup = false

  private constructor(config: TestEnvironmentConfig) {
    this.config = config
  }

  static getInstance(config?: TestEnvironmentConfig): TestEnvironmentManager {
    if (!TestEnvironmentManager.instance) {
      if (!config) {
        throw new Error('首次创建TestEnvironmentManager实例时必须提供配置')
      }
      TestEnvironmentManager.instance = new TestEnvironmentManager(config)
    }
    return TestEnvironmentManager.instance
  }

  /**
   * 设置测试环境
   */
  async setup(): Promise<void> {
    if (this.isSetup) {
      return
    }

    try {
      // 验证MySQL连接
      const isConnected = await DatabaseTestHelper.verifyConnection()
      if (!isConnected) {
        throw new Error('MySQL数据库连接失败')
      }

      // 清理测试数据
      if (this.config.cleanup.autoCleanup) {
        await DatabaseTestHelper.cleanup()
      }

      this.isSetup = true
      console.log('✅ MySQL测试环境设置完成')
    } catch (error) {
      console.error('❌ MySQL测试环境设置失败:', error)
      throw error
    }
  }

  /**
   * 清理测试环境
   */
  async cleanup(): Promise<void> {
    if (!this.isSetup) {
      return
    }

    try {
      if (this.config.cleanup.autoCleanup) {
        await DatabaseTestHelper.cleanup()
      }

      this.isSetup = false
      console.log('✅ MySQL测试环境清理完成')
    } catch (error) {
      console.error('❌ MySQL测试环境清理失败:', error)
      throw error
    }
  }

  /**
   * 重置测试环境
   */
  async reset(): Promise<void> {
    await this.cleanup()
    await this.setup()
  }

  /**
   * 获取配置
   */
  getConfig(): TestEnvironmentConfig {
    return this.config
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<TestEnvironmentConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * 检查环境状态
   */
  isReady(): boolean {
    return this.isSetup
  }
}

/**
 * 创建默认的MySQL测试环境配置
 */
export function createDefaultTestConfig(): TestEnvironmentConfig {
  return {
    database: {
      host: process.env.TEST_DB_HOST || '127.0.0.1',
      port: parseInt(process.env.TEST_DB_PORT || '3306'),
      user: process.env.TEST_DB_USER || 'afa_test_user',
      password: process.env.TEST_DB_PASSWORD || 'afa_test_2024',
      database: process.env.TEST_DB_NAME || 'afa_office_test',
      connectionLimit: 5,
      acquireTimeout: 30000,
      timeout: 30000
    },
    cleanup: {
      autoCleanup: true,
      cleanupTimeout: 10000,
      preserveTables: []
    },
    performance: {
      enableMetrics: true,
      slowQueryThreshold: 500,
      maxQueryTime: 10000
    }
  }
}

/**
 * 全局测试设置函数
 */
export async function setupGlobalTestEnvironment(): Promise<void> {
  const config = createDefaultTestConfig()
  const manager = TestEnvironmentManager.getInstance(config)
  await manager.setup()
}

/**
 * 全局测试清理函数
 */
export async function cleanupGlobalTestEnvironment(): Promise<void> {
  const manager = TestEnvironmentManager.getInstance()
  await manager.cleanup()
}

/**
 * 测试工具快速访问
 */
export const testUtils = {
  api: ApiTestHelper,
  database: DatabaseTestHelper,
  environment: TestEnvironmentManager,
  error: TestErrorHandler
}

// 默认导出
export default testUtils