/**
 * 测试配置管理器
 * 负责管理不同测试环境的配置
 */

export interface TestConfig {
  apiBaseUrl: string;
  databaseUrl: string;
  jwtSecret: string;
  testTimeout: number;
  retryAttempts: number;
  environment: 'unit' | 'integration' | 'e2e';
}

export interface DatabaseConfig {
  type: 'mysql';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

/**
 * 测试配置管理器类
 */
export class TestConfigManager {
  private static configs: Map<string, TestConfig> = new Map();
  private static defaultConfig: Partial<TestConfig> = {
    apiBaseUrl: 'http://localhost:3000',
    jwtSecret: 'test-jwt-secret-key',
    testTimeout: 30000,
    retryAttempts: 3,
  };

  /**
   * 获取指定环境的测试配置
   */
  static getConfig(env: 'unit' | 'integration' | 'e2e'): TestConfig {
    const configKey = env;
    
    if (this.configs.has(configKey)) {
      return this.configs.get(configKey)!;
    }

    // 根据环境生成默认配置
    const config = this.generateDefaultConfig(env);
    this.configs.set(configKey, config);
    
    return config;
  }

  /**
   * 设置指定环境的配置
   */
  static setConfig(env: 'unit' | 'integration' | 'e2e', config: Partial<TestConfig>): void {
    const existingConfig = this.getConfig(env);
    const mergedConfig = { ...existingConfig, ...config };
    this.configs.set(env, mergedConfig);
  }

  /**
   * 合并配置
   */
  static mergeConfig(env: 'unit' | 'integration' | 'e2e', overrides: Partial<TestConfig>): TestConfig {
    const baseConfig = this.getConfig(env);
    return { ...baseConfig, ...overrides };
  }

  /**
   * 验证配置的有效性
   */
  static validateConfig(config: TestConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证必需字段
    if (!config.apiBaseUrl) {
      errors.push('apiBaseUrl 不能为空');
    }

    if (!config.databaseUrl) {
      errors.push('databaseUrl 不能为空');
    }

    if (!config.jwtSecret) {
      errors.push('jwtSecret 不能为空');
    }

    // 验证URL格式
    if (config.apiBaseUrl && !this.isValidUrl(config.apiBaseUrl)) {
      errors.push('apiBaseUrl 格式无效');
    }

    // 验证超时时间
    if (config.testTimeout && config.testTimeout <= 0) {
      errors.push('testTimeout 必须大于0');
    }

    // 验证重试次数
    if (config.retryAttempts && config.retryAttempts < 0) {
      errors.push('retryAttempts 不能为负数');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 设置测试环境
   */
  static async setupEnvironment(config: TestConfig): Promise<void> {
    // 验证配置
    const validation = this.validateConfig(config);
    if (!validation.isValid) {
      throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
    }

    // 设置环境变量
    process.env.NODE_ENV = 'test';
    process.env.API_BASE_URL = config.apiBaseUrl;
    process.env.DATABASE_URL = config.databaseUrl;
    process.env.JWT_SECRET = config.jwtSecret;
    process.env.TEST_TIMEOUT = config.testTimeout.toString();
    process.env.RETRY_ATTEMPTS = config.retryAttempts.toString();

    // 初始化数据库连接（如果需要）
    if (config.environment === 'integration' || config.environment === 'e2e') {
      await this.initializeDatabase(config);
    }
  }

  /**
   * 清理测试环境
   */
  static async teardownEnvironment(): Promise<void> {
    // 清理环境变量
    delete process.env.API_BASE_URL;
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    delete process.env.TEST_TIMEOUT;
    delete process.env.RETRY_ATTEMPTS;

    // 清理配置缓存
    this.configs.clear();
  }

  /**
   * 重置配置到默认状态
   */
  static reset(): void {
    this.configs.clear();
  }

  /**
   * 获取数据库配置
   */
  static getDatabaseConfig(env: 'unit' | 'integration' | 'e2e'): DatabaseConfig {
    const baseConfig = {
      type: 'mysql' as const,
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '3306'),
      username: process.env.TEST_DB_USER || 'test_user',
      password: process.env.TEST_DB_PASSWORD || 'test_password',
    };

    switch (env) {
      case 'unit':
        return {
          ...baseConfig,
          database: 'afa_office_test_unit'
        };
      case 'integration':
        return {
          ...baseConfig,
          database: 'afa_office_test_integration'
        };
      case 'e2e':
        return {
          ...baseConfig,
          database: 'afa_office_test_e2e'
        };
      default:
        throw new Error(`不支持的环境: ${env}`);
    }
  }

  /**
   * 生成默认配置
   */
  private static generateDefaultConfig(env: 'unit' | 'integration' | 'e2e'): TestConfig {
    const dbConfig = this.getDatabaseConfig(env);
    
    return {
      ...this.defaultConfig,
      environment: env,
      databaseUrl: this.buildDatabaseUrl(dbConfig),
      testTimeout: env === 'e2e' ? 60000 : 30000, // E2E测试需要更长时间
      retryAttempts: env === 'unit' ? 1 : 3, // 单元测试通常不需要重试
    } as TestConfig;
  }

  /**
   * 构建数据库URL
   */
  private static buildDatabaseUrl(config: DatabaseConfig): string {
    return `mysql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
  }

  /**
   * 验证URL格式
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 初始化数据库连接
   */
  private static async initializeDatabase(config: TestConfig): Promise<void> {
    // 这里可以添加数据库初始化逻辑
    // 例如创建表、运行迁移等
    console.log(`初始化 ${config.environment} 环境数据库: ${config.databaseUrl}`);
  }
}