/**
 * 测试类型工具库
 * 提供通用的测试类型定义和工具函数
 */

import type { MockedFunction, MockedObject } from 'vitest';
import { vi } from 'vitest';

/**
 * 通用 Mock 类型生成器
 */
export class TypedMockGenerator {
  /**
   * 创建类型安全的 Mock 对象
   */
  static createMock<T extends Record<string, any>>(): MockedObject<T> {
    return {} as MockedObject<T>;
  }

  /**
   * 创建类型安全的 Mock 函数
   */
  static createMockFunction<T extends (...args: any[]) => any>(): MockedFunction<T> {
    return vi.fn() as MockedFunction<T>;
  }

  /**
   * 创建部分 Mock 对象
   */
  static createPartialMock<T extends Record<string, any>>(
    overrides: Partial<T> = {}
  ): Partial<MockedObject<T>> {
    return overrides as Partial<MockedObject<T>>;
  }

  /**
   * 创建深度 Mock 对象
   */
  static createDeepMock<T extends Record<string, any>>(): MockedObject<T> {
    const handler: ProxyHandler<any> = {
      get(target, prop) {
        if (!(prop in target)) {
          if (typeof prop === 'string' && prop.startsWith('mock')) {
            target[prop] = vi.fn();
          } else {
            target[prop] = new Proxy({}, handler);
          }
        }
        return target[prop];
      },
    };
    return new Proxy({}, handler) as MockedObject<T>;
  }

  /**
   * 创建 Mock 类实例
   */
  static createMockClass<T extends new (...args: any[]) => any>(
    constructor: T
  ): MockedObject<InstanceType<T>> {
    const mockInstance = {} as MockedObject<InstanceType<T>>;
    const prototype = constructor.prototype;
    
    // Mock 所有原型方法
    Object.getOwnPropertyNames(prototype).forEach(name => {
      if (name !== 'constructor' && typeof prototype[name] === 'function') {
        (mockInstance as any)[name] = vi.fn();
      }
    });

    return mockInstance;
  }
}

/**
 * 测试数据类型验证器
 */
export class TestDataValidator {
  /**
   * 验证对象是否符合指定接口
   */
  static validateInterface<T>(obj: any, requiredFields: (keyof T)[]): obj is T {
    return requiredFields.every(field => field in obj);
  }

  /**
   * 验证数组中的所有对象是否符合指定接口
   */
  static validateArrayInterface<T>(
    arr: any[],
    requiredFields: (keyof T)[]
  ): arr is T[] {
    return Array.isArray(arr) && arr.every(item => 
      this.validateInterface<T>(item, requiredFields)
    );
  }

  /**
   * 验证 API 响应格式
   */
  static validateApiResponse(response: any): boolean {
    return (
      typeof response === 'object' &&
      typeof response.success === 'boolean' &&
      typeof response.timestamp === 'string' &&
      (response.success ? 
        typeof response.message === 'string' :
        typeof response.code === 'number' && typeof response.message === 'string'
      )
    );
  }

  /**
   * 验证分页响应格式
   */
  static validatePaginatedResponse(response: any): boolean {
    return (
      this.validateApiResponse(response) &&
      Array.isArray(response.data) &&
      typeof response.pagination === 'object' &&
      typeof response.pagination.page === 'number' &&
      typeof response.pagination.limit === 'number' &&
      typeof response.pagination.total === 'number'
    );
  }
}

/**
 * 测试类型断言工具
 */
export class TestTypeAssertions {
  /**
   * 断言对象类型
   */
  static assertType<T>(obj: any, validator: (obj: any) => obj is T): asserts obj is T {
    if (!validator(obj)) {
      throw new Error(`Object does not match expected type`);
    }
  }

  /**
   * 断言数组类型
   */
  static assertArrayType<T>(
    arr: any,
    validator: (obj: any) => obj is T
  ): asserts arr is T[] {
    if (!Array.isArray(arr)) {
      throw new Error('Expected an array');
    }
    arr.forEach((item, index) => {
      if (!validator(item)) {
        throw new Error(`Array item at index ${index} does not match expected type`);
      }
    });
  }

  /**
   * 断言 Mock 函数被调用
   */
  static assertMockCalled<T extends (...args: any[]) => any>(
    mockFn: MockedFunction<T>,
    times?: number
  ): void {
    if (times !== undefined) {
      expect(mockFn).toHaveBeenCalledTimes(times);
    } else {
      expect(mockFn).toHaveBeenCalled();
    }
  }

  /**
   * 断言 Mock 函数被调用时的参数
   */
  static assertMockCalledWith<T extends (...args: any[]) => any>(
    mockFn: MockedFunction<T>,
    ...args: Parameters<T>
  ): void {
    expect(mockFn).toHaveBeenCalledWith(...args);
  }
}

/**
 * 测试环境类型工具
 */
export class TestEnvironmentUtils {
  /**
   * 创建测试环境变量
   */
  static createTestEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
    return {
      NODE_ENV: 'test',
      DB_TEST_PATH: ':memory:',
      JWT_SECRET: 'test-jwt-secret',
      WECHAT_APP_ID: 'test-app-id',
      WECHAT_APP_SECRET: 'test-app-secret',
      ...overrides,
    };
  }

  /**
   * 设置测试环境变量
   */
  static setupTestEnv(env: Partial<NodeJS.ProcessEnv> = {}): void {
    const testEnv = this.createTestEnv(env);
    Object.assign(process.env, testEnv);
  }

  /**
   * 清理测试环境变量
   */
  static cleanupTestEnv(keys: string[] = []): void {
    const defaultKeys = [
      'DB_TEST_PATH',
      'JWT_SECRET',
      'WECHAT_APP_ID',
      'WECHAT_APP_SECRET',
    ];
    
    [...defaultKeys, ...keys].forEach(key => {
      delete process.env[key];
    });
  }
}

/**
 * 测试时间工具
 */
export class TestTimeUtils {
  /**
   * 创建固定时间戳
   */
  static createFixedTimestamp(date?: string | Date): string {
    const fixedDate = date ? new Date(date) : new Date('2024-01-01T00:00:00.000Z');
    return fixedDate.toISOString();
  }

  /**
   * 创建相对时间戳
   */
  static createRelativeTimestamp(offset: number, unit: 'seconds' | 'minutes' | 'hours' | 'days' = 'hours'): string {
    const now = new Date();
    const multiplier = {
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
    }[unit];
    
    const targetTime = new Date(now.getTime() + (offset * multiplier));
    return targetTime.toISOString();
  }

  /**
   * Mock 系统时间
   */
  static mockSystemTime(date: string | Date): void {
    const fixedDate = new Date(date);
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);
  }

  /**
   * 恢复系统时间
   */
  static restoreSystemTime(): void {
    vi.useRealTimers();
  }
}

/**
 * 测试错误工具
 */
export class TestErrorUtils {
  /**
   * 创建测试错误
   */
  static createTestError(message: string, code?: string | number): Error {
    const error = new Error(message);
    if (code) {
      (error as any).code = code;
    }
    return error;
  }

  /**
   * 创建验证错误
   */
  static createValidationError(field: string, message: string): Error {
    const error = new Error(`Validation failed for field '${field}': ${message}`);
    (error as any).field = field;
    (error as any).type = 'validation';
    return error;
  }

  /**
   * 创建认证错误
   */
  static createAuthError(message: string = 'Authentication failed'): Error {
    const error = new Error(message);
    (error as any).code = 401;
    (error as any).type = 'authentication';
    return error;
  }

  /**
   * 创建授权错误
   */
  static createAuthorizationError(message: string = 'Authorization failed'): Error {
    const error = new Error(message);
    (error as any).code = 403;
    (error as any).type = 'authorization';
    return error;
  }

  /**
   * 断言错误类型
   */
  static assertErrorType(error: any, expectedType: string): void {
    expect(error).toBeInstanceOf(Error);
    expect((error as any).type).toBe(expectedType);
  }

  /**
   * 断言错误代码
   */
  static assertErrorCode(error: any, expectedCode: string | number): void {
    expect(error).toBeInstanceOf(Error);
    expect((error as any).code).toBe(expectedCode);
  }
}

/**
 * 异步测试工具
 */
export class AsyncTestUtils {
  /**
   * 等待指定时间
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 等待条件满足
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await this.wait(interval);
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * 重试异步操作
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries) {
          await this.wait(delay);
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * 测试 Promise 拒绝
   */
  static async expectRejection<T>(
    promise: Promise<T>,
    expectedError?: string | RegExp
  ): Promise<Error> {
    try {
      await promise;
      throw new Error('Expected promise to be rejected');
    } catch (error) {
      if (expectedError) {
        if (typeof expectedError === 'string') {
          expect((error as Error).message).toContain(expectedError);
        } else {
          expect((error as Error).message).toMatch(expectedError);
        }
      }
      return error as Error;
    }
  }
}

// 导出便捷函数
export const createTypedMock = TypedMockGenerator.createMock;
export const createMockFunction = TypedMockGenerator.createMockFunction;
export const validateInterface = TestDataValidator.validateInterface;
export const assertType = TestTypeAssertions.assertType;
export const createTestError = TestErrorUtils.createTestError;
export const waitFor = AsyncTestUtils.waitFor;