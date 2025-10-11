/**
 * 控制器测试辅助工具
 * 解决异步错误处理和响应模拟问题
 */

import { Request, Response, NextFunction } from 'express';
import { vi } from 'vitest';

/**
 * 创建模拟的请求对象
 */
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: undefined,
    ...overrides,
  };
}

/**
 * 创建模拟的响应对象
 */
export function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  };
  return res;
}

/**
 * 创建模拟的next函数，用于捕获错误
 */
export function createMockNext(): { next: NextFunction; getError: () => Error | null } {
  let capturedError: Error | null = null;
  
  const next: NextFunction = vi.fn((error?: Error) => {
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
 * 测试控制器方法，期望成功响应
 */
export async function expectControllerSuccess(
  controllerMethod: Function,
  req: Partial<Request>,
  expectedStatus = 200
): Promise<{ response: any; res: Partial<Response> }> {
  const mockReq = createMockRequest(req);
  const mockRes = createMockResponse();
  const { next } = createMockNext();

  await controllerMethod(mockReq, mockRes, next);

  // 验证没有错误
  expect(next).not.toHaveBeenCalled();
  
  // 验证响应状态
  if (expectedStatus !== 200) {
    expect(mockRes.status).toHaveBeenCalledWith(expectedStatus);
  }
  
  // 验证响应被调用
  expect(mockRes.json).toHaveBeenCalled();
  
  const response = (mockRes.json as any).mock.calls[0][0];
  expect(response.success).toBe(true);

  return { response, res: mockRes };
}

/**
 * 测试控制器方法，期望错误响应
 */
export async function expectControllerError(
  controllerMethod: Function,
  req: Partial<Request>,
  expectedErrorMessage?: string,
  expectedStatusCode?: number
): Promise<Error> {
  const mockReq = createMockRequest(req);
  const mockRes = createMockResponse();
  const { next, getError } = createMockNext();

  await controllerMethod(mockReq, mockRes, next);

  // 验证错误被传递给next
  expect(next).toHaveBeenCalled();
  
  const error = getError();
  expect(error).toBeTruthy();

  if (expectedErrorMessage) {
    expect(error!.message).toContain(expectedErrorMessage);
  }

  if (expectedStatusCode) {
    expect((error as any).statusCode).toBe(expectedStatusCode);
  }

  return error!;
}

/**
 * 验证API响应格式
 */
export function expectValidApiResponse(response: any, expectedData?: any): void {
  expect(response).toHaveProperty('success');
  expect(response).toHaveProperty('timestamp');
  
  if (response.success) {
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('message');
    
    if (expectedData) {
      expect(response.data).toMatchObject(expectedData);
    }
  } else {
    expect(response).toHaveProperty('code');
    expect(response).toHaveProperty('message');
  }
}

/**
 * 创建认证用户的模拟请求
 */
export function createAuthenticatedRequest(
  user: any,
  overrides: Partial<Request> = {}
): Partial<Request> {
  return createMockRequest({
    user,
    headers: {
      authorization: 'Bearer mock-token',
    },
    ...overrides,
  });
}

/**
 * 模拟数据库操作错误
 */
export function mockDatabaseError(message = '数据库连接失败'): Error {
  const error = new Error(message);
  (error as any).code = 'ER_CONNECTION_REFUSED';
  return error;
}

/**
 * 创建测试用户数据
 */
export function createTestUser(overrides: any = {}) {
  return {
    id: 1,
    name: '测试用户',
    email: 'test@example.com',
    userType: 'tenant_admin',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * 创建测试商户数据
 */
export function createTestMerchant(overrides: any = {}) {
  return {
    id: 1,
    name: '测试商户',
    code: 'TEST001',
    contactPerson: '张三',
    phone: '13800138000',
    email: 'merchant@example.com',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * 创建测试空间数据
 */
export function createTestSpace(overrides: any = {}) {
  return {
    id: 1,
    name: '测试空间',
    code: 'SPACE001',
    type: 'project',
    status: 'active',
    description: '测试空间描述',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}