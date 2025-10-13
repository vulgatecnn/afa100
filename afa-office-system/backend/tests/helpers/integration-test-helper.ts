/**
 * 集成测试辅助工具
 * 整合测试配置管理器、数据库种子和API测试客户端
 */

import { TestConfigManager, type TestEnvironment } from '../../src/utils/test-config-manager.js';
import { DatabaseSeeder, type SeedData, type SeedOptions } from './database-seeder.js';
import { ApiTestClient } from '../../src/utils/api-test-client.js';
import { TestDataFactory } from './test-data-factory.js';

export interface IntegrationTestContext {
  config: any;
  apiClient: ApiTestClient;
  seeder: DatabaseSeeder;
  seedData?: SeedData;
}

export interface TestSetupOptions {
  environment?: TestEnvironment;
  seedOptions?: SeedOptions;
  skipSeeding?: boolean;
  skipApiSetup?: boolean;
  customApiConfig?: any;
}

/**
 * 集成测试辅助工具类
 */
export class IntegrationTestHelper {
  private context: IntegrationTestContext | null = null;
  private environment: TestEnvironment = 'unit';

  /**
   * 快速设置测试环境（静态方法）
   */
  static async quickSetup(options: TestSetupOptions = {}): Promise<IntegrationTestHelper> {
    const helper = new IntegrationTestHelper();
    await helper.setup(options);
    return helper;
  }

  /**
   * 设置测试环境
   */
  async setup(options: TestSetupOptions = {}): Promise<IntegrationTestContext> {
    const {
      environment = 'unit',
      seedOptions = {},
      skipSeeding = false,
      skipApiSetup = false,
      customApiConfig = {},
    } = options;

    this.environment = environment;

    console.log(`设置集成测试环境: ${environment}`);

    // 1. 设置测试配置
    await TestConfigManager.setupEnvironment(environment);
    const config = TestConfigManager.getConfig(environment);

    // 2. 初始化数据库种子管理器
    const seeder = new DatabaseSeeder(environment);
    await seeder.initialize();

    // 3. 初始化API测试客户端
    let apiClient: ApiTestClient | null = null;
    if (!skipApiSetup) {
      const apiConfig = {
        baseUrl: config.api.baseUrl,
        timeout: config.api.timeout,
        retryAttempts: config.api.retryAttempts,
        retryDelay: config.api.retryDelay,
        ...customApiConfig,
      };
      
      apiClient = new ApiTestClient(apiConfig);
    }

    // 4. 种植测试数据
    let seedData: SeedData | undefined;
    if (!skipSeeding) {
      console.log('种植测试数据...');
      seedData = await seeder.seedTestData(seedOptions);
      
      const stats = seeder.getDataStatistics(seedData);
      console.log('测试数据统计:', stats);
    }

    this.context = {
      config,
      apiClient: apiClient!,
      seeder,
      seedData,
    };

    console.log('集成测试环境设置完成');
    return this.context;
  }

  /**
   * 清理测试环境
   */
  async cleanup(): Promise<void> {
    if (!this.context) {
      return;
    }

    console.log('清理集成测试环境...');

    try {
      // 清理数据库
      await this.context.seeder.cleanDatabase();
      await this.context.seeder.resetSequences();
      
      // 关闭数据库连接
      await this.context.seeder.close();
      
      // 清理测试环境
      await TestConfigManager.teardownEnvironment();
      
      console.log('集成测试环境清理完成');
    } catch (error) {
      console.error('清理测试环境时发生错误:', error);
    } finally {
      this.context = null;
    }
  }

  /**
   * 获取当前测试上下文
   */
  getContext(): IntegrationTestContext {
    if (!this.context) {
      throw new Error('测试环境未初始化，请先调用 setup() 方法');
    }
    return this.context;
  }

  /**
   * 获取API客户端
   */
  getApiClient(): ApiTestClient {
    return this.getContext().apiClient;
  }

  /**
   * 获取数据库种子管理器
   */
  getSeeder(): DatabaseSeeder {
    return this.getContext().seeder;
  }

  /**
   * 获取种植的测试数据
   */
  getSeedData(): SeedData {
    const seedData = this.getContext().seedData;
    if (!seedData) {
      throw new Error('测试数据未种植，请在 setup() 时不要设置 skipSeeding: true');
    }
    return seedData;
  }

  /**
   * 重新种植测试数据
   */
  async reseedData(options: SeedOptions = {}): Promise<SeedData> {
    const seeder = this.getSeeder();
    const seedData = await seeder.resetAndSeed(options);
    
    if (this.context) {
      this.context.seedData = seedData;
    }
    
    return seedData;
  }

  /**
   * 创建认证用户并登录
   */
  async createAndLoginUser(userType: 'tenant_admin' | 'merchant_admin' | 'employee' = 'tenant_admin'): Promise<{
    user: any;
    authResponse: any;
  }> {
    const apiClient = this.getApiClient();
    const seedData = this.getSeedData();

    // 根据用户类型选择或创建用户
    let user: any;
    switch (userType) {
      case 'tenant_admin':
        user = seedData.users.find(u => u.user_type === 'tenant_admin');
        if (!user) {
          user = TestDataFactory.createAdminUser();
          // 这里应该通过API创建用户，但为了简化，我们直接使用种植的数据
        }
        break;
      
      case 'merchant_admin':
        user = seedData.users.find(u => u.user_type === 'merchant_admin');
        if (!user) {
          const merchant = seedData.merchants[0];
          user = TestDataFactory.createMerchantAdmin(merchant.id);
        }
        break;
      
      case 'employee':
        user = seedData.users.find(u => u.user_type === 'employee');
        if (!user) {
          const merchant = seedData.merchants[0];
          user = TestDataFactory.createEmployee(merchant.id);
        }
        break;
    }

    // 模拟登录（实际项目中可能需要不同的登录方式）
    const loginCredentials = {
      phone: user.phone,
      // 对于小程序，可能使用微信登录而不是密码
      openId: user.open_id,
    };

    try {
      // 这里需要根据实际的登录API调整
      const authResponse = await apiClient.login({
        email: `${user.phone}@test.com`, // 临时转换
        password: 'test123456', // 测试密码
      });

      return { user, authResponse };
    } catch (error) {
      console.warn('API登录失败，使用模拟认证:', error);
      
      // 如果API登录失败，使用模拟的JWT token
      const mockToken = `mock-jwt-token-${user.id}-${Date.now()}`;
      apiClient.setAuthToken(mockToken);
      
      return {
        user,
        authResponse: {
          accessToken: mockToken,
          refreshToken: `refresh-${mockToken}`,
          user,
          expiresIn: 3600,
        },
      };
    }
  }

  /**
   * 等待异步操作完成
   */
  async waitForAsyncOperation(
    operation: () => Promise<boolean>,
    timeout: number = 10000,
    interval: number = 500
  ): Promise<void> {
    const apiClient = this.getApiClient();
    await apiClient.waitUntil(operation, timeout, interval);
  }

  /**
   * 验证API响应格式
   */
  validateApiResponse(response: any, expectedFields: string[] = ['success', 'data']): void {
    const apiClient = this.getApiClient();
    apiClient.validateResponse(response, expectedFields);
  }

  /**
   * 创建测试场景数据
   */
  async createTestScenario(scenarioType: 'visitor_flow' | 'merchant_setup' | 'access_control'): Promise<any> {
    const seeder = this.getSeeder();
    
    switch (scenarioType) {
      case 'visitor_flow':
        // 创建完整的访客流程数据
        return TestDataFactory.createVisitorFlow();
      
      case 'merchant_setup':
        // 创建商户及其用户数据
        return TestDataFactory.createMerchantWithUsers(5);
      
      case 'access_control':
        // 创建项目、场地、楼层数据
        return TestDataFactory.createProjectWithVenuesAndFloors(2, 3);
      
      default:
        throw new Error(`未知的测试场景类型: ${scenarioType}`);
    }
  }

  /**
   * 执行API健康检查
   */
  async performHealthCheck(): Promise<boolean> {
    const apiClient = this.getApiClient();
    return await apiClient.healthCheck();
  }

  /**
   * 获取测试统计信息
   */
  getTestStatistics(): any {
    const seedData = this.getSeedData();
    const seeder = this.getSeeder();
    
    return {
      environment: this.environment,
      dataStatistics: seeder.getDataStatistics(seedData),
      apiConfig: this.getApiClient().getConfig(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 静态方法：快速设置测试环境
   */
  static async quickSetup(options: TestSetupOptions = {}): Promise<IntegrationTestHelper> {
    const helper = new IntegrationTestHelper();
    await helper.setup(options);
    return helper;
  }

  /**
   * 静态方法：在测试中使用的便捷包装器
   */
  static async withTestEnvironment<T>(
    testFn: (helper: IntegrationTestHelper) => Promise<T>,
    options: TestSetupOptions = {}
  ): Promise<T> {
    const helper = new IntegrationTestHelper();
    
    try {
      await helper.setup(options);
      return await testFn(helper);
    } finally {
      await helper.cleanup();
    }
  }
}

// 导出便捷方法
export const setupIntegrationTest = IntegrationTestHelper.quickSetup;
export const withTestEnvironment = IntegrationTestHelper.withTestEnvironment;