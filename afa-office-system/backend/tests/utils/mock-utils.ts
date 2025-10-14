/**
 * Mock 工具函数
 * 提供创建和管理 Mock 对象的便捷方法
 */

import { vi, type MockedFunction, type MockedObject } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

/**
 * 创建 Mock 请求对象
 */
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    user: undefined,
    userDetails: undefined,
    ...overrides,
  };
}

/**
 * 创建 Mock 响应对象
 */
export function createMockResponse(): Partial<Response> {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    render: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  };
  return res;
}

/**
 * 创建 Mock next 函数
 */
export function createMockNext(): { next: NextFunction; getError: () => Error | null } {
  let capturedError: Error | null = null;
  
  const next: any = vi.fn((error?: Error) => {
    if (error) {
      capturedError = error;
    }
  });

  return {
    next,
    getError: () => capturedError,
  };
}

/**
 * 创建 Mock Axios 实例
 */
export function createMockAxios() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    create: vi.fn().mockReturnThis(),
    isAxiosError: vi.fn(),
  };
}

/**
 * 创建 Mock 数据库连接
 */
export function createMockDatabase() {
  return {
    connect: vi.fn(),
    close: vi.fn(),
    run: vi.fn(),
    get: vi.fn(),
    all: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
  };
}

/**
 * 创建 Mock 模型
 */
export function createMockModel<T>() {
  return {
    findById: vi.fn(),
    findAll: vi.fn(),
    findByPhone: vi.fn(),
    findByOpenId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    updateLastLogin: vi.fn(),
    updateLastLogout: vi.fn(),
  };
}

/**
 * 创建 Mock JWT 工具
 */
export function createMockJWT() {
  return {
    sign: vi.fn(),
    verify: vi.fn(),
    decode: vi.fn(),
  };
}

/**
 * 创建 Mock bcrypt 工具
 */
export function createMockBcrypt() {
  return {
    hash: vi.fn(),
    compare: vi.fn(),
    hashSync: vi.fn(),
    compareSync: vi.fn(),
    genSalt: vi.fn(),
    genSaltSync: vi.fn(),
  };
}

/**
 * 创建 Mock 服务
 */
export function createMockService(methods: string[]) {
  const service: Record<string, any> = {};
  methods.forEach(method => {
    service[method] = vi.fn();
  });
  return service;
}

/**
 * 重置所有 Mock
 */
export function resetAllMocks() {
  vi.clearAllMocks();
  vi.resetAllMocks();
}

/**
 * Mock 工厂函数
 */
export class MockFactory {
  /**
   * 创建认证服务 Mock
   */
  static createAuthService() {
    return createMockService([
      'login',
      'wechatLogin',
      'refreshToken',
      'logout',
      'verifyAccessToken',
      'validatePasswordStrength',
      'hashPassword',
      'generateRandomPassword',
    ]);
  }

  /**
   * 创建用户服务 Mock
   */
  static createUserService() {
    return createMockService([
      'createUser',
      'getUserById',
      'updateUser',
      'deleteUser',
      'getUsersByMerchant',
    ]);
  }

  /**
   * 创建商户服务 Mock
   */
  static createMerchantService() {
    return createMockService([
      'createMerchant',
      'getMerchantById',
      'updateMerchant',
      'deleteMerchant',
      'getAllMerchants',
    ]);
  }

  /**
   * 创建访客服务 Mock
   */
  static createVisitorService() {
    return createMockService([
      'createVisitorApplication',
      'getVisitorApplication',
      'approveVisitorApplication',
      'rejectVisitorApplication',
      'getVisitorApplications',
    ]);
  }

  /**
   * 创建通行记录服务 Mock
   */
  static createAccessRecordService() {
    return createMockService([
      'recordAccess',
      'getAccessRecords',
      'getAccessRecordById',
      'getAccessRecordsByUser',
      'getAccessRecordsByTimeRange',
    ]);
  }

  /**
   * 创建微信工具 Mock
   */
  static createWechatUtils() {
    return createMockService([
      'getSessionByCode',
      'formatUserInfo',
      'validateConfig',
      'sendTemplateMessage',
    ]);
  }
}

/**
 * 类型安全的 Mock 创建器
 */
export function createTypedMock<T>(): any {
  return {} as any;
}

/**
 * 类型安全的 Mock 函数创建器
 */
export function createTypedMockFunction<T extends (...args: any[]) => any>(): any {
  return vi.fn() as any;
}

/**
 * 全局 Mock 设置
 */
export function setupGlobalMocks() {
  // 设置全局 Mock 变量
  (global as any).mockReq = createMockRequest();
  (global as any).mockRes = createMockResponse();
  (global as any).mockNext = createMockNext().next;

  // 设置全局工具函数
  (global as any).createMockRequest = createMockRequest;
  (global as any).createMockResponse = createMockResponse;
  (global as any).createMockNext = createMockNext;
}

/**
 * 清理全局 Mock
 */
export function cleanupGlobalMocks() {
  delete (global as any).mockReq;
  delete (global as any).mockRes;
  delete (global as any).mockNext;
  delete (global as any).createMockRequest;
  delete (global as any).createMockResponse;
  delete (global as any).createMockNext;
}

export default {
  createMockRequest,
  createMockResponse,
  createMockNext,
  createMockAxios,
  createMockDatabase,
  createMockModel,
  createMockJWT,
  createMockBcrypt,
  createMockService,
  resetAllMocks,
  MockFactory,
  createTypedMock,
  createTypedMockFunction,
  setupGlobalMocks,
  cleanupGlobalMocks,
};