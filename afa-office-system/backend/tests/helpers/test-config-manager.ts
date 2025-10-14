/**
 * 测试配置管理器
 * 提供统一的测试环境配置管理，支持不同环境的配置切换
 */

import { config } from 'dotenv';
import path from 'path';

export interface TestConfig {
  // 数据库配置
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    connectionLimit: number;
    acquireTimeout: number;
    timeout: number;
  };
  
  // API配置
  api: {
    baseUrl: string;
    port: number;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  
  // JWT配置
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  
  // 测试环境配置
  test: {
    timeout: number;
    parallel: boolean;
    maxWorkers: number;
    setupTimeout: number;
    teardownTimeout: number;
  };
  
  // 文件上传配置
  upload: {
    maxFileSize: number;
    allowedTypes: string[];
    uploadDir: string;
  };
  
  // WebSocket配置
  websocket: {
    port: number;
    pingInterval: number;
    pongTimeout: number;
  };
}

export type TestEnvironment = 'unit' | 'integration' | 'e2e';

/**
 * 测试配置管理器类
 */
export class TestConfigManager {
  private static instance: TestConfigManager;
  private configs: Map<TestEnvironment, TestConfig> = new Map();
  private currentEnv: TestEnvironment = 'unit';

  private constructor() {
    this.loadConfigurations();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): TestConfigManager {
    if (!TestConfigManager.instance) {
      TestConfigManager.instance = new TestConfigManager();
    }
    return TestConfigManager.instance;
  }

  /**
   * 获取指定环境的配置
   */
  static getConfig(env: TestEnvironment = 'unit'): TestConfig {
    const manager = TestConfigManager.getInstance();
    return manager.getEnvironmentConfig(env);
  }

  /**
   * 设置当前测试环境
   */
  static setEnvironment(env: TestEnvironment): void {
    const manager = TestConfigManager.getInstance();
    manager.currentEnv = env;
  }

  /**
   * 获取当前环境配置
   */
  static getCurrentConfig(): TestConfig {
    const manager = TestConfigManager.getInstance();
    return manager.getEnvironmentConfig(manager.currentEnv);
  }

  /**
   * 设置环境并初始化
   */
  static async setupEnvironment(env: TestEnvironment): Promise<void> {
    const manager = TestConfigManager.getInstance();
    manager.currentEnv = env;
    
    // 加载对应环境的环境变量
    const envFile = manager.getEnvFilePath(env);
    config({ path: envFile });
    
    // 验证配置
    const testConfig = manager.getEnvironmentConfig(env);
    await manager.validateConfig(testConfig);
    
    console.log(`测试环境已设置为: ${env}`);
  }

  /**
   * 清理测试环境
   */
  static async teardownEnvironment(): Promise<void> {
    const manager = TestConfigManager.getInstance();
    console.log(`清理测试环境: ${manager.currentEnv}`);
    
    // 这里可以添加环境清理逻辑
    // 例如：关闭数据库连接、清理临时文件等
  }

  /**
   * 重新加载配置
   */
  static reloadConfigurations(): void {
    const manager = TestConfigManager.getInstance();
    manager.loadConfigurations();
  }

  /**
   * 获取环境配置
   */
  private getEnvironmentConfig(env: TestEnvironment): TestConfig {
    const config = this.configs.get(env);
    if (!config) {
      throw new Error(`未找到环境 ${env} 的配置`);
    }
    return config;
  }

  /**
   * 加载所有环境配置
   */
  private loadConfigurations(): void {
    // 单元测试配置
    this.configs.set('unit', this.createUnitTestConfig());
    
    // 集成测试配置
    this.configs.set('integration', this.createIntegrationTestConfig());
    
    // 端到端测试配置
    this.configs.set('e2e', this.createE2ETestConfig());
  }

  /**
   * 创建单元测试配置
   */
  private createUnitTestConfig(): TestConfig {
    return {
      database: {
        host: 'localhost',
        port: 3306,
        user: process.env['TEST_DB_USER'] || 'afa_test_user',
        password: process.env['TEST_DB_PASSWORD'] || 'test_password_123',
        database: process.env['TEST_DB_NAME'] || 'afa_office_test',
        connectionLimit: 5,
        acquireTimeout: 10000,
        timeout: 5000,
      },
      api: {
        baseUrl: 'http://localhost:3001',
        port: 3001,
        timeout: 5000,
        retryAttempts: 2,
        retryDelay: 500,
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'test-jwt-secret-key-for-unit-tests',
        expiresIn: '1h',
        refreshExpiresIn: '7d',
      },
      test: {
        timeout: 10000,
        parallel: true,
        maxWorkers: 2,
        setupTimeout: 30000,
        teardownTimeout: 10000,
      },
      upload: {
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        uploadDir: './tests/fixtures/uploads',
      },
      websocket: {
        port: 3002,
        pingInterval: 25000,
        pongTimeout: 5000,
      },
    };
  }

  /**
   * 创建集成测试配置
   */
  private createIntegrationTestConfig(): TestConfig {
    const baseConfig = this.createUnitTestConfig();
    
    return {
      ...baseConfig,
      database: {
        ...baseConfig.database,
        host: process.env.INTEGRATION_DB_HOST || process.env['TEST_DB_HOST'] || 'localhost',
        user: process.env.INTEGRATION_DB_USER || process.env['TEST_DB_USER'] || 'afa_test_user',
        password: process.env.INTEGRATION_DB_PASSWORD || process.env['TEST_DB_PASSWORD'] || 'afa_test_2024',
        database: process.env.INTEGRATION_DB_NAME || process.env['TEST_DB_NAME'] || 'afa_office_test',
        connectionLimit: 10,
        timeout: 10000,
      },
      api: {
        ...baseConfig.api,
        port: 3003,
        baseUrl: 'http://localhost:3003',
        timeout: 15000,
        retryAttempts: 3,
        retryDelay: 1000,
      },
      test: {
        ...baseConfig['test'],
        timeout: 30000,
        parallel: false, // 集成测试通常需要串行执行
        maxWorkers: 1,
        setupTimeout: 60000,
        teardownTimeout: 30000,
      },
      websocket: {
        ...baseConfig.websocket,
        port: 3004,
      },
    };
  }

  /**
   * 创建端到端测试配置
   */
  private createE2ETestConfig(): TestConfig {
    const baseConfig = this.createIntegrationTestConfig();
    
    return {
      ...baseConfig,
      database: {
        ...baseConfig.database,
        database: process.env.E2E_DB_NAME || 'afa_office_e2e_test',
        connectionLimit: 15,
        timeout: 15000,
      },
      api: {
        ...baseConfig.api,
        port: 3005,
        baseUrl: 'http://localhost:3005',
        timeout: 30000,
        retryAttempts: 5,
        retryDelay: 2000,
      },
      test: {
        ...baseConfig['test'],
        timeout: 60000,
        parallel: false,
        maxWorkers: 1,
        setupTimeout: 120000,
        teardownTimeout: 60000,
      },
      upload: {
        ...baseConfig.upload,
        maxFileSize: 10 * 1024 * 1024, // 10MB for E2E tests
        uploadDir: './tests/fixtures/e2e-uploads',
      },
      websocket: {
        ...baseConfig.websocket,
        port: 3006,
      },
    };
  }

  /**
   * 获取环境变量文件路径
   */
  private getEnvFilePath(env: TestEnvironment): string {
    const envFiles = {
      unit: '.env.test',
      integration: '.env.integration',
      e2e: '.env.e2e',
    };
    
    return path.resolve(process.cwd(), envFiles[env]);
  }

  /**
   * 验证配置有效性
   */
  private async validateConfig(config: TestConfig): Promise<void> {
    // 验证必需的配置项
    if (!config.database.host) {
      throw new Error('数据库主机地址不能为空');
    }
    
    if (!config.database.user) {
      throw new Error('数据库用户名不能为空');
    }
    
    if (!config.database.database) {
      throw new Error('数据库名称不能为空');
    }
    
    if (!config.jwt.secret) {
      throw new Error('JWT密钥不能为空');
    }
    
    if (config.api.port <= 0 || config.api.port > 65535) {
      throw new Error('API端口号必须在1-65535范围内');
    }
    
    if (config['test'].timeout <= 0) {
      throw new Error('测试超时时间必须大于0');
    }
    
    // 验证上传目录是否存在，不存在则创建
    const fs = await import('fs');
    const uploadDir = config.upload.uploadDir;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  /**
   * 获取数据库连接字符串
   */
  static getDatabaseUrl(env: TestEnvironment = 'unit'): string {
    const config = TestConfigManager.getConfig(env);
    const { host, port, user, password, database } = config.database;
    return `mysql://${user}:${password}@${host}:${port}/${database}`;
  }

  /**
   * 获取API基础URL
   */
  static getApiBaseUrl(env: TestEnvironment = 'unit'): string {
    const config = TestConfigManager.getConfig(env);
    return config.api.baseUrl;
  }

  /**
   * 检查配置是否为开发环境
   */
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * 检查配置是否为测试环境
   */
  static isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  /**
   * 获取当前环境名称
   */
  static getCurrentEnvironment(): TestEnvironment {
    const manager = TestConfigManager.getInstance();
    return manager.currentEnv;
  }

  /**
   * 合并配置
   */
  static mergeConfig(baseConfig: TestConfig, overrides: Partial<TestConfig>): TestConfig {
    return {
      database: { ...baseConfig.database, ...overrides.database },
      api: { ...baseConfig.api, ...overrides.api },
      jwt: { ...baseConfig.jwt, ...overrides.jwt },
      test: { ...baseConfig['test'], ...overrides['test'] },
      upload: { ...baseConfig.upload, ...overrides.upload },
      websocket: { ...baseConfig.websocket, ...overrides.websocket },
    };
  }

  /**
   * 导出配置为JSON
   */
  static exportConfig(env: TestEnvironment): string {
    const config = TestConfigManager.getConfig(env);
    return JSON.stringify(config, null, 2);
  }

  /**
   * 从JSON导入配置
   */
  static importConfig(env: TestEnvironment, configJson: string): void {
    const manager = TestConfigManager.getInstance();
    const config = JSON.parse(configJson) as TestConfig;
    manager.configs.set(env, config);
  }
}

// 导出便捷方法
export const getTestConfig = TestConfigManager.getConfig;
export const setupTestEnvironment = TestConfigManager.setupEnvironment;
export const teardownTestEnvironment = TestConfigManager.teardownEnvironment;
export const getCurrentTestConfig = TestConfigManager.getCurrentConfig;