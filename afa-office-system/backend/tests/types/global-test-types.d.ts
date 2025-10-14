/**
 * 全局测试类型声明
 * 为测试环境提供完整的类型支持
 */

/// <reference types="vitest/globals" />
/// <reference types="@types/supertest" />
/// <reference types="@types/node" />

import type { MockedFunction, MockedObject } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { SuperTest, Test } from 'supertest';

// 扩展 Vitest 全局类型
declare global {
  // Vitest 全局函数
  const describe: typeof import('vitest').describe;
  const it: typeof import('vitest').it;
  const test: typeof import('vitest').test;
  const expect: typeof import('vitest').expect;
  const beforeAll: typeof import('vitest').beforeAll;
  const afterAll: typeof import('vitest').afterAll;
  const beforeEach: typeof import('vitest').beforeEach;
  const afterEach: typeof import('vitest').afterEach;
  const vi: typeof import('vitest').vi;

  // 测试环境变量
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'test' | 'development' | 'production';
      DB_TEST_PATH?: string;
      TEST_DATABASE_URL?: string;
      JWT_SECRET?: string;
      WECHAT_APP_ID?: string;
      WECHAT_APP_SECRET?: string;
    }
  }

  // 全局测试工具
  interface TestUtils {
    createMockRequest(overrides?: Partial<Request>): Partial<Request>;
    createMockResponse(): Partial<Response>;
    createMockNext(): NextFunction;
    expectControllerSuccess(
      controllerMethod: Function,
      req: Partial<Request>,
      expectedStatus?: number
    ): Promise<{ response: any; res: Partial<Response> }>;
    expectControllerError(
      controllerMethod: Function,
      req: Partial<Request>,
      expectedErrorMessage?: string,
      expectedStatusCode?: number
    ): Promise<Error>;
  }

  // 全局 mock 对象
  var mockReq: Partial<Request>;
  var mockRes: Partial<Response>;
  var mockNext: NextFunction;
  var testUtils: TestUtils;
}

// Express Mock 类型增强
declare module 'express' {
  interface Request {
    user?: import('../../src/types/index.js').UserContext;
    userDetails?: import('../../src/types/index.js').User;
  }
}

// Supertest 类型增强
export interface ApiTestClient extends SuperTest<Test> {
  authenticatedGet(url: string, token: string): Test;
  authenticatedPost(url: string, token: string): Test;
  authenticatedPut(url: string, token: string): Test;
  authenticatedDelete(url: string, token: string): Test;
}

// Mock 工厂类型
export type MockFactory<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? MockedFunction<T[K]>
    : T[K] extends object
    ? MockFactory<T[K]>
    : T[K];
};

// 数据库测试类型
export interface DatabaseTestContext {
  setup(): Promise<void>;
  teardown(): Promise<void>;
  clearData(): Promise<void>;
  seedData(data: any): Promise<void>;
}

// API 测试响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  code?: number;
  timestamp: string;
}

// 测试数据工厂类型
export interface TestDataFactory {
  createUser(overrides?: Partial<import('../../src/types/index.js').User>): import('../../src/types/index.js').User;
  createMerchant(overrides?: Partial<import('../../src/types/index.js').Merchant>): import('../../src/types/index.js').Merchant;
  createProject(overrides?: Partial<import('../../src/types/index.js').Project>): import('../../src/types/index.js').Project;
  createVenue(overrides?: Partial<import('../../src/types/index.js').Venue>): import('../../src/types/index.js').Venue;
  createFloor(overrides?: Partial<import('../../src/types/index.js').Floor>): import('../../src/types/index.js').Floor;
  createVisitorApplication(overrides?: Partial<import('../../src/types/index.js').VisitorApplication>): import('../../src/types/index.js').VisitorApplication;
  createAccessRecord(overrides?: Partial<import('../../src/types/index.js').AccessRecord>): import('../../src/types/index.js').AccessRecord;
}

// 测试断言辅助类型
export interface TestAssertions {
  expectValidApiResponse(response: any, expectedData?: any): void;
  expectErrorResponse(response: any, expectedCode?: number, expectedMessage?: string): void;
  expectDatabaseRecord(table: string, id: number, expectedData: any): Promise<void>;
  expectNoErrors(errors: any[]): void;
}

export {};