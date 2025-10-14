/**
 * 测试类型工具库使用示例
 * 展示如何使用新建立的测试类型工具库
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  // 测试设置工具
  setupTestEnvironment,
  TestSetupManager,
  DatabaseTestSetup,
  ApiTestSetup,
  
  // Mock 工具
  TypedMockGenerator,
  createTypedMock,
  createMockFunction,
  
  // 数据验证工具
  TestDataValidator,
  validateInterface,
  
  // 类型断言工具
  TestTypeAssertions,
  assertType,
  
  // 环境工具
  TestEnvironmentUtils,
  
  // 时间工具
  TestTimeUtils,
  
  // 错误工具
  TestErrorUtils,
  
  // 异步工具
  AsyncTestUtils,
  waitFor,
  
  // 自定义匹配器
  setupCustomMatchers,
  
  // 测试数据工厂
  TestDataFactory,
  createTestUser,
  createTestMerchant,
  
  // API 测试客户端
  createApiTestClient,
  
  // 配置类型
  type GlobalTestConfig,
  DEFAULT_TEST_CONFIG,
  DEFAULT_MOCK_CONFIG,
} from '../types/index.js';

import type { User, Merchant } from '../../src/types/index.js';

// 设置测试环境
const testConfig: Partial<GlobalTestConfig> = {
  test: DEFAULT_TEST_CONFIG,
  mocks: DEFAULT_MOCK_CONFIG,
  database: {
    migrations: { run: false, path: '' },
    seeds: { run: false, path: '' },
    cleanup: { strategy: 'truncate' },
  },
  api: {
    authentication: { enabled: true },
    validation: { strict: true, checkResponseFormat: true, checkStatusCodes: true },
    performance: { enabled: false, thresholds: { responseTime: 1000, throughput: 100 } },
  },
};

// 设置全局测试环境
setupTestEnvironment(testConfig);

// 设置自定义匹配器
setupCustomMatchers();

describe('测试类型工具库使用示例', () => {
  describe('Mock 工具使用示例', () => {
    it('应该能够创建类型安全的 Mock 对象', () => {
      // 创建用户服务 Mock
      interface UserService {
        getUserById(id: number): Promise<User | null>;
        createUser(userData: Partial<User>): Promise<User>;
        updateUser(id: number, userData: Partial<User>): Promise<User>;
        deleteUser(id: number): Promise<void>;
      }

      const mockUserService = createTypedMock<UserService>();
      
      // 验证 Mock 对象结构
      expect(mockUserService).toBeDefined();
      expect(typeof mockUserService).toBe('object');
    });

    it('应该能够创建类型安全的 Mock 函数', () => {
      // 创建 Mock 函数
      const mockGetUser = createMockFunction<(id: number) => Promise<User | null>>();
      
      // 设置 Mock 返回值
      const testUser = createTestUser();
      mockGetUser.mockResolvedValue(testUser);
      
      // 验证 Mock 函数
      expect(mockGetUser).toBeDefined();
      expect(typeof mockGetUser).toBe('function');
    });

    it('应该能够使用 TypedMockGenerator 创建复杂 Mock', () => {
      // 创建深度 Mock 对象
      interface ComplexService {
        database: {
          users: {
            findById(id: number): Promise<User | null>;
            create(data: Partial<User>): Promise<User>;
          };
          merchants: {
            findById(id: number): Promise<Merchant | null>;
            create(data: Partial<Merchant>): Promise<Merchant>;
          };
        };
        cache: {
          get(key: string): Promise<any>;
          set(key: string, value: any): Promise<void>;
        };
      }

      const mockComplexService = TypedMockGenerator.createDeepMock<ComplexService>();
      
      // 验证深度 Mock 结构
      expect(mockComplexService).toBeDefined();
      expect(mockComplexService.database).toBeDefined();
      expect(mockComplexService.database.users).toBeDefined();
      expect(mockComplexService.cache).toBeDefined();
    });
  });

  describe('数据验证工具使用示例', () => {
    it('应该能够验证对象接口', () => {
      const testUser = createTestUser();
      const requiredFields: (keyof User)[] = ['id', 'name', 'phone', 'user_type', 'status'];
      
      // 验证用户对象
      const isValidUser = TestDataValidator.validateInterface<User>(testUser, requiredFields);
      expect(isValidUser).toBe(true);
      
      // 使用便捷函数验证
      expect(validateInterface<User>(testUser, requiredFields)).toBe(true);
    });

    it('应该能够验证数组接口', () => {
      const testUsers = [createTestUser(), createTestUser(), createTestUser()];
      const requiredFields: (keyof User)[] = ['id', 'name', 'phone'];
      
      // 验证用户数组
      const isValidUserArray = TestDataValidator.validateArrayInterface<User>(testUsers, requiredFields);
      expect(isValidUserArray).toBe(true);
    });

    it('应该能够验证 API 响应格式', () => {
      const successResponse = {
        success: true,
        data: createTestUser(),
        message: '获取用户成功',
        timestamp: new Date().toISOString(),
      };

      const errorResponse = {
        success: false,
        code: 2001,
        message: '用户不存在',
        data: null,
        timestamp: new Date().toISOString(),
      };

      // 验证响应格式
      expect(TestDataValidator.validateApiResponse(successResponse)).toBe(true);
      expect(TestDataValidator.validateApiResponse(errorResponse)).toBe(true);
    });
  });

  describe('类型断言工具使用示例', () => {
    it('应该能够进行类型断言', () => {
      const testUser = createTestUser();
      
      // 类型断言
      TestTypeAssertions.assertType<User>(testUser, (obj): obj is User => {
        return typeof obj === 'object' && 
               typeof obj.id === 'number' && 
               typeof obj.name === 'string';
      });
      
      // 使用便捷函数
      const validator = (obj: any): obj is User => {
        return 'id' in obj && 'name' in obj;
      };
      assertType<User>(testUser, validator);
    });

    it('应该能够断言数组类型', () => {
      const testUsers = [createTestUser(), createTestUser()];
      
      // 数组类型断言
      const arrayValidator = (obj: any): obj is User => {
        return typeof obj === 'object' && 'id' in obj && 'name' in obj;
      };
      (TestTypeAssertions.assertArrayType as any)<User>(testUsers, arrayValidator);
    });
  });

  describe('环境工具使用示例', () => {
    it('应该能够设置测试环境变量', () => {
      // 设置测试环境
      TestEnvironmentUtils.setupTestEnv({
        TEST_CUSTOM_VAR: 'test-value',
        TEST_NUMBER_VAR: '123',
      });
      
      // 验证环境变量
      expect(process.env.TEST_CUSTOM_VAR).toBe('test-value');
      expect(process.env.TEST_NUMBER_VAR).toBe('123');
      
      // 清理环境变量
      TestEnvironmentUtils.cleanupTestEnv(['TEST_CUSTOM_VAR', 'TEST_NUMBER_VAR']);
      
      expect(process.env.TEST_CUSTOM_VAR).toBeUndefined();
      expect(process.env.TEST_NUMBER_VAR).toBeUndefined();
    });
  });

  describe('时间工具使用示例', () => {
    it('应该能够创建固定时间戳', () => {
      const fixedTimestamp = TestTimeUtils.createFixedTimestamp('2024-01-01T00:00:00.000Z');
      expect(fixedTimestamp).toBe('2024-01-01T00:00:00.000Z');
    });

    it('应该能够创建相对时间戳', () => {
      const futureTimestamp = TestTimeUtils.createRelativeTimestamp(1, 'hours');
      const pastTimestamp = TestTimeUtils.createRelativeTimestamp(-1, 'hours');
      
      expect(new Date(futureTimestamp).getTime()).toBeGreaterThan(Date.now());
      expect(new Date(pastTimestamp).getTime()).toBeLessThan(Date.now());
    });
  });

  describe('错误工具使用示例', () => {
    it('应该能够创建测试错误', () => {
      const testError = TestErrorUtils.createTestError('测试错误消息', 'TEST_ERROR');
      
      expect(testError).toBeInstanceOf(Error);
      expect(testError.message).toBe('测试错误消息');
      expect((testError as any).code).toBe('TEST_ERROR');
    });

    it('应该能够创建验证错误', () => {
      const validationError = TestErrorUtils.createValidationError('email', '邮箱格式不正确');
      
      expect(validationError).toBeInstanceOf(Error);
      expect(validationError.message).toContain('email');
      expect(validationError.message).toContain('邮箱格式不正确');
      expect((validationError as any).field).toBe('email');
      expect((validationError as any).type).toBe('validation');
    });

    it('应该能够断言错误类型', () => {
      const authError = TestErrorUtils.createAuthError('认证失败');
      
      TestErrorUtils.assertErrorType(authError, 'authentication');
      TestErrorUtils.assertErrorCode(authError, 401);
    });
  });

  describe('异步工具使用示例', () => {
    it('应该能够等待条件满足', async () => {
      let counter = 0;
      
      // 模拟异步操作
      const timer = setInterval(() => {
        counter++;
      }, 50);
      
      try {
        // 等待条件满足
        await waitFor(() => counter >= 3, 1000, 10);
        expect(counter).toBeGreaterThanOrEqual(3);
      } finally {
        clearInterval(timer);
      }
    });

    it('应该能够重试异步操作', async () => {
      let attempts = 0;
      
      const unreliableOperation = async (): Promise<string> => {
        attempts++;
        if (attempts < 3) {
          throw new Error('操作失败');
        }
        return '操作成功';
      };
      
      // 重试操作
      const result = await AsyncTestUtils.retry(unreliableOperation, 3, 10);
      
      expect(result).toBe('操作成功');
      expect(attempts).toBe(3);
    });

    it('应该能够测试 Promise 拒绝', async () => {
      const failingPromise = Promise.reject(new Error('预期的错误'));
      
      // 测试 Promise 拒绝
      const error = await AsyncTestUtils.expectRejection(failingPromise, '预期的错误');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('预期的错误');
    });
  });

  describe('自定义匹配器使用示例', () => {
    it('应该能够使用 API 响应匹配器', () => {
      const mockResponse = {
        status: 200,
        body: {
          success: true,
          data: createTestUser(),
          message: '获取用户成功',
          timestamp: new Date().toISOString(),
        },
      } as any;

      // 使用自定义匹配器
      expect(mockResponse).toBeSuccessfulApiResponse();
      expect(mockResponse.body).toHaveValidApiStructure();
      expect(mockResponse.body).toHaveValidTimestamp();
    });

    it('应该能够使用模型验证匹配器', () => {
      const testUser = createTestUser();
      const testMerchant = createTestMerchant();

      // 使用模型匹配器
      expect(testUser).toBeValidUser();
      expect(testMerchant).toBeValidMerchant();
      expect(testUser).toHaveValidId();
      expect(testUser).toHaveValidTimestamps();
    });
  });

  describe('测试数据工厂使用示例', () => {
    it('应该能够创建测试数据', () => {
      // 创建单个测试数据
      const user = TestDataFactory.createUser();
      const merchant = TestDataFactory.createMerchant();
      
      expect(user).toBeValidUser();
      expect(merchant).toBeValidMerchant();
    });

    it('应该能够创建批量测试数据', () => {
      // 创建批量数据
      const users = TestDataFactory.createBatch(() => TestDataFactory.createUser(), 5);
      const merchants = TestDataFactory.createBatch(() => TestDataFactory.createMerchant(), 3);
      
      expect(users).toHaveLength(5);
      expect(merchants).toHaveLength(3);
      
      users.forEach(user => expect(user).toBeValidUser());
      merchants.forEach(merchant => expect(merchant).toBeValidMerchant());
    });

    it('应该能够创建完整的业务数据集', () => {
      // 创建完整的商户数据集
      const merchantData = TestDataFactory.createMerchantWithUsers(3);
      
      expect(merchantData.merchant).toBeValidMerchant();
      expect(merchantData.admin).toBeValidUser();
      expect(merchantData.employees).toHaveLength(3);
      
      merchantData.employees.forEach(employee => {
        expect(employee).toBeValidUser();
        expect(employee.merchant_id).toBe(merchantData.merchant.id);
      });
    });
  });

  describe('测试设置管理使用示例', () => {
    it('应该能够管理测试配置', async () => {
      // 获取当前配置
      const currentConfig = TestSetupManager.getConfig();
      expect(currentConfig).toBeDefined();
      
      // 更新配置
      TestSetupManager.updateConfig({
        test: {
          ...DEFAULT_TEST_CONFIG,
          logging: { level: 'debug', enabled: true },
        },
      });
      
      const updatedConfig = TestSetupManager.getConfig();
      expect(updatedConfig.test?.logging?.level).toBe('debug');
      expect(updatedConfig.test?.logging?.enabled).toBe(true);
    });
  });
});

describe('集成测试示例', () => {
  let mockApp: any;
  let apiClient: any;

  beforeAll(async () => {
    // 设置模拟应用
    mockApp = {
      listen: () => {},
      use: () => {},
      get: () => {},
      post: () => {},
    };
    
    // 创建 API 测试客户端
    apiClient = createApiTestClient(mockApp);
  });

  it('应该能够进行完整的 API 测试流程', async () => {
    // 这里展示如何使用所有工具进行集成测试
    
    // 1. 创建测试数据
    const testUser = createTestUser({ user_type: 'tenant_admin' });
    const testMerchant = createTestMerchant();
    
    // 2. 验证测试数据
    expect(testUser).toBeValidUser();
    expect(testMerchant).toBeValidMerchant();
    
    // 3. 模拟 API 调用（这里使用 Mock）
    const mockResponse = {
      status: 200,
      body: {
        success: true,
        data: testUser,
        message: '用户创建成功',
        timestamp: new Date().toISOString(),
      },
    };
    
    // 4. 验证 API 响应
    expect(mockResponse).toBeSuccessfulApiResponse(testUser);
    expect(mockResponse.body).toHaveValidApiStructure();
    
    // 5. 验证业务逻辑
    expect(testUser.user_type).toBe('tenant_admin');
    expect(testUser.merchant_id).toBeNull();
  });
});