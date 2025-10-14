/**
 * Vitest Mock 类型定义
 * 解决 vi.mock() 函数和 MockedFunction 类型问题
 */

import type { MockedFunction, MockedObject } from 'vitest';

// Express Request/Response Mock 类型
export interface MockRequest extends Partial<import('express').Request> {
  body?: any;
  params?: any;
  query?: any;
  headers?: any;
  user?: any;
  userDetails?: any;
}

export interface MockResponse extends Partial<import('express').Response> {
  status: any;
  json: any;
  send: any;
  cookie: any;
  clearCookie: any;
}

export type MockNextFunction = import('express').NextFunction;

// Axios Mock 类型
export interface MockAxiosInstance {
  get: any;
  post: any;
  put: any;
  delete: any;
  patch: any;
  create: any;
  isAxiosError: any;
}

// 数据库 Mock 类型
export interface MockDatabase {
  connect: any;
  close: any;
  run: any;
  get: any;
  all: any;
  isReady: any;
}

// 模型 Mock 类型
export interface MockModel<T> {
  findById: any;
  findAll: any;
  create: any;
  update: any;
  delete: any;
}

// 服务 Mock 类型
export interface MockService {
  [key: string]: any;
}

// JWT Mock 类型
export interface MockJWT {
  sign: any;
  verify: any;
  decode: any;
}

// bcrypt Mock 类型
export interface MockBcrypt {
  hash: any;
  compare: any;
}

// 工具函数类型
export type MockFactory<T> = () => any;
export type MockFunctionFactory<T extends (...args: any[]) => any> = () => any;

// 测试环境全局类型声明
declare global {
  // 全局 mock 变量
  var mockReq: MockRequest;
  var mockRes: MockResponse;
  var mockNext: MockNextFunction;
  
  // 测试工具函数
  function createMockRequest(overrides?: Partial<MockRequest>): MockRequest;
  function createMockResponse(): MockResponse;
  function createMockNext(): MockNextFunction;
}

export {};