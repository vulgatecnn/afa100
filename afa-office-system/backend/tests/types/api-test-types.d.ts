/**
 * API 测试客户端类型定义
 * 解决 Supertest 和 API 测试相关的类型问题
 */

import type { SuperTest, Test } from 'supertest';
import type { Response as SupertestResponse } from 'supertest';
import type { Application } from 'express';
import type { MockedFunction } from 'vitest';

// 扩展 Supertest 类型
declare module 'supertest' {
  interface Test {
    authenticate(token: string): this;
    expectSuccess(expectedData?: any): this;
    expectError(expectedCode?: number, expectedMessage?: string): this;
    expectStatus(status: number): this;
    expectJson(expectedData: any): this;
  }

  interface Response {
    body: {
      success: boolean;
      data?: any;
      message: string;
      code?: number;
      timestamp: string;
    };
  }
}

// API 测试客户端接口
export interface ApiTestClient extends SuperTest<Test> {
  // 认证相关
  authenticatedGet(url: string, token: string): Test;
  authenticatedPost(url: string, token: string): Test;
  authenticatedPut(url: string, token: string): Test;
  authenticatedDelete(url: string, token: string): Test;
  authenticatedPatch(url: string, token: string): Test;

  // 便捷方法
  login(credentials: LoginCredentials): Promise<LoginResponse>;
  wechatLogin(wechatData: WechatLoginData): Promise<LoginResponse>;
  refreshToken(refreshToken: string): Promise<TokenResponse>;
  logout(token: string): Promise<void>;

  // 用户相关
  createUser(userData: CreateUserData, token: string): Promise<SupertestResponse>;
  getUser(userId: number, token: string): Promise<SupertestResponse>;
  updateUser(userId: number, userData: UpdateUserData, token: string): Promise<SupertestResponse>;
  deleteUser(userId: number, token: string): Promise<SupertestResponse>;

  // 商户相关
  createMerchant(merchantData: CreateMerchantData, token: string): Promise<SupertestResponse>;
  getMerchant(merchantId: number, token: string): Promise<SupertestResponse>;
  updateMerchant(merchantId: number, merchantData: UpdateMerchantData, token: string): Promise<SupertestResponse>;
  deleteMerchant(merchantId: number, token: string): Promise<SupertestResponse>;

  // 访客相关
  createVisitorApplication(applicationData: CreateVisitorApplicationData, token: string): Promise<SupertestResponse>;
  getVisitorApplication(applicationId: number, token: string): Promise<SupertestResponse>;
  approveVisitorApplication(applicationId: number, token: string): Promise<SupertestResponse>;
  rejectVisitorApplication(applicationId: number, reason: string, token: string): Promise<SupertestResponse>;

  // 通行记录相关
  recordAccess(accessData: RecordAccessData, token: string): Promise<SupertestResponse>;
  getAccessRecords(query: AccessRecordQuery, token: string): Promise<SupertestResponse>;
}

// 登录相关类型
export interface LoginCredentials {
  phone?: string;
  password?: string;
  openId?: string;
  userType?: string;
}

export interface WechatLoginData {
  code: string;
  userType: string;
  userInfo?: {
    nickName?: string;
    avatarUrl?: string;
  };
}

export interface LoginResponse {
  user: import('../../src/types/index.js').User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenResponse {
  accessToken: string;
  expiresIn: number;
}

// 用户相关类型
export interface CreateUserData {
  name: string;
  phone: string;
  user_type: string;
  merchant_id?: number;
  open_id?: string;
  union_id?: string;
  avatar?: string;
}

export interface UpdateUserData {
  name?: string;
  phone?: string;
  status?: string;
  avatar?: string;
}

// 商户相关类型
export interface CreateMerchantData {
  name: string;
  code: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  settings?: string;
}

export interface UpdateMerchantData {
  name?: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: string;
  settings?: string;
}

// 访客申请相关类型
export interface CreateVisitorApplicationData {
  merchant_id: number;
  visitee_id: number;
  visitor_name: string;
  visitor_phone: string;
  visitor_company: string;
  visit_purpose: string;
  visit_type: string;
  scheduled_time: string;
  duration: number;
}

// 通行记录相关类型
export interface RecordAccessData {
  user_id: number;
  device_id: string;
  device_type: string;
  direction: string;
  result: string;
  fail_reason?: string;
  project_id: number;
  venue_id: number;
  floor_id: number;
}

export interface AccessRecordQuery {
  user_id?: number;
  device_id?: string;
  start_time?: string;
  end_time?: string;
  result?: string;
  page?: number;
  limit?: number;
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  code?: number;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 错误响应类型
export interface ErrorResponse extends ApiResponse {
  success: false;
  code: number;
  message: string;
  data: null;
}

// 测试断言辅助类型
export interface ApiTestAssertions {
  expectSuccessResponse(response: SupertestResponse, expectedData?: any): void;
  expectErrorResponse(response: SupertestResponse, expectedCode?: number, expectedMessage?: string): void;
  expectPaginatedResponse(response: SupertestResponse, expectedCount?: number): void;
  expectValidationError(response: SupertestResponse, field?: string): void;
  expectAuthenticationError(response: SupertestResponse): void;
  expectAuthorizationError(response: SupertestResponse): void;
  expectNotFoundError(response: SupertestResponse): void;
}

// Mock API 客户端类型
export interface MockApiClient {
  get: MockedFunction<(url: string, config?: any) => Promise<any>>;
  post: MockedFunction<(url: string, data?: any, config?: any) => Promise<any>>;
  put: MockedFunction<(url: string, data?: any, config?: any) => Promise<any>>;
  delete: MockedFunction<(url: string, config?: any) => Promise<any>>;
  patch: MockedFunction<(url: string, data?: any, config?: any) => Promise<any>>;
}

// 测试环境配置类型
export interface TestEnvironmentConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  headers: Record<string, string>;
}

// API 测试工具类型
export interface ApiTestUtils {
  createTestClient(app: Application): ApiTestClient;
  createMockClient(): MockApiClient;
  generateAuthToken(user: import('../../src/types/index.js').User): string;
  parseAuthToken(token: string): any;
  createTestHeaders(token?: string): Record<string, string>;
  expectValidApiResponse(response: SupertestResponse): void;
  expectErrorApiResponse(response: SupertestResponse, code?: number): void;
}

// 测试数据生成器类型
export interface ApiTestDataGenerator {
  generateLoginCredentials(): LoginCredentials;
  generateWechatLoginData(): WechatLoginData;
  generateCreateUserData(): CreateUserData;
  generateCreateMerchantData(): CreateMerchantData;
  generateCreateVisitorApplicationData(): CreateVisitorApplicationData;
  generateRecordAccessData(): RecordAccessData;
}

// 测试场景类型
export interface ApiTestScenario {
  name: string;
  description: string;
  setup?: () => Promise<void>;
  execute: (client: ApiTestClient) => Promise<void>;
  teardown?: () => Promise<void>;
  expectedResults?: any;
}

// 性能测试类型
export interface PerformanceTestConfig {
  concurrency: number;
  duration: number;
  rampUp: number;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  headers?: Record<string, string>;
}

export interface PerformanceTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: Array<{
    message: string;
    count: number;
  }>;
}

// 集成测试类型
export interface IntegrationTestSuite {
  name: string;
  description: string;
  scenarios: ApiTestScenario[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export {};