/**
 * 增强的 API 测试客户端
 * 提供类型安全的 API 测试工具
 */

import request, { SuperTest, Test } from 'supertest';
import type { Response } from 'supertest';
import type { Application } from 'express';
import type {
  ApiTestClient,
  LoginCredentials,
  WechatLoginData,
  LoginResponse,
  TokenResponse,
  CreateUserData,
  UpdateUserData,
  CreateMerchantData,
  UpdateMerchantData,
  CreateVisitorApplicationData,
  RecordAccessData,
  AccessRecordQuery,
  ApiResponse,
  PaginatedResponse,
  ErrorResponse
} from '../types/api-test-types.js';

/**
 * 增强的 API 测试客户端实现
 */
export class EnhancedApiTestClient implements ApiTestClient {
  private supertest: SuperTest<Test>;
  private app: Application;

  constructor(app: Application) {
    this.app = app;
    this.supertest = request(app);
  }

  // 基础 HTTP 方法
  get(url: string): Test {
    return this.supertest.get(url);
  }

  post(url: string): Test {
    return this.supertest.post(url);
  }

  put(url: string): Test {
    return this.supertest.put(url);
  }

  delete(url: string): Test {
    return this.supertest.delete(url);
  }

  patch(url: string): Test {
    return this.supertest.patch(url);
  }

  // 认证相关方法
  authenticatedGet(url: string, token: string): Test {
    return this.get(url).set('Authorization', `Bearer ${token}`);
  }

  authenticatedPost(url: string, token: string): Test {
    return this.post(url).set('Authorization', `Bearer ${token}`);
  }

  authenticatedPut(url: string, token: string): Test {
    return this.put(url).set('Authorization', `Bearer ${token}`);
  }

  authenticatedDelete(url: string, token: string): Test {
    return this.delete(url).set('Authorization', `Bearer ${token}`);
  }

  authenticatedPatch(url: string, token: string): Test {
    return this.patch(url).set('Authorization', `Bearer ${token}`);
  }

  // 认证 API
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await this.post('/api/v1/auth/login').send(credentials);
    if (!response.body.success) {
      throw new Error(`Login failed: ${response.body.message}`);
    }
    return response.body.data;
  }

  async wechatLogin(wechatData: WechatLoginData): Promise<LoginResponse> {
    const response = await this.post('/api/v1/auth/wechat-login').send(wechatData);
    if (!response.body.success) {
      throw new Error(`WeChat login failed: ${response.body.message}`);
    }
    return response.body.data;
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await this.post('/api/v1/auth/refresh-token').send({ refreshToken });
    if (!response.body.success) {
      throw new Error(`Token refresh failed: ${response.body.message}`);
    }
    return response.body.data;
  }

  async logout(token: string): Promise<void> {
    const response = await this.authenticatedPost('/api/v1/auth/logout', token);
    if (!response.body.success) {
      throw new Error(`Logout failed: ${response.body.message}`);
    }
  }

  // 用户 API
  async createUser(userData: CreateUserData, token: string): Promise<Response> {
    return this.authenticatedPost('/api/v1/users', token).send(userData);
  }

  async getUser(userId: number, token: string): Promise<Response> {
    return this.authenticatedGet(`/api/v1/users/${userId}`, token);
  }

  async updateUser(userId: number, userData: UpdateUserData, token: string): Promise<Response> {
    return this.authenticatedPut(`/api/v1/users/${userId}`, token).send(userData);
  }

  async deleteUser(userId: number, token: string): Promise<Response> {
    return this.authenticatedDelete(`/api/v1/users/${userId}`, token);
  }

  // 商户 API
  async createMerchant(merchantData: CreateMerchantData, token: string): Promise<Response> {
    return this.authenticatedPost('/api/v1/merchants', token).send(merchantData);
  }

  async getMerchant(merchantId: number, token: string): Promise<Response> {
    return this.authenticatedGet(`/api/v1/merchants/${merchantId}`, token);
  }

  async updateMerchant(merchantId: number, merchantData: UpdateMerchantData, token: string): Promise<Response> {
    return this.authenticatedPut(`/api/v1/merchants/${merchantId}`, token).send(merchantData);
  }

  async deleteMerchant(merchantId: number, token: string): Promise<Response> {
    return this.authenticatedDelete(`/api/v1/merchants/${merchantId}`, token);
  }

  // 访客申请 API
  async createVisitorApplication(applicationData: CreateVisitorApplicationData, token: string): Promise<Response> {
    return this.authenticatedPost('/api/v1/visitor-applications', token).send(applicationData);
  }

  async getVisitorApplication(applicationId: number, token: string): Promise<Response> {
    return this.authenticatedGet(`/api/v1/visitor-applications/${applicationId}`, token);
  }

  async approveVisitorApplication(applicationId: number, token: string): Promise<Response> {
    return this.authenticatedPost(`/api/v1/visitor-applications/${applicationId}/approve`, token);
  }

  async rejectVisitorApplication(applicationId: number, reason: string, token: string): Promise<Response> {
    return this.authenticatedPost(`/api/v1/visitor-applications/${applicationId}/reject`, token).send({ reason });
  }

  // 通行记录 API
  async recordAccess(accessData: RecordAccessData, token: string): Promise<Response> {
    return this.authenticatedPost('/api/v1/access-records', token).send(accessData);
  }

  async getAccessRecords(query: AccessRecordQuery, token: string): Promise<Response> {
    return this.authenticatedGet('/api/v1/access-records', token).query(query);
  }
}

/**
 * API 测试断言工具
 */
export class ApiTestAssertions {
  /**
   * 验证成功响应
   */
  static expectSuccessResponse(response: Response, expectedData?: any): void {
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBeDefined();
    expect(response.body.timestamp).toBeDefined();
    
    if (expectedData) {
      expect(response.body.data).toMatchObject(expectedData);
    }
  }

  /**
   * 验证错误响应
   */
  static expectErrorResponse(response: Response, expectedCode?: number, expectedMessage?: string): void {
    expect(response.body.success).toBe(false);
    
    if (expectedCode) {
      expect(response.status).toBe(expectedCode);
    }
    
    if (expectedMessage) {
      expect(response.body.message).toContain(expectedMessage);
    }
  }

  /**
   * 验证分页响应
   */
  static expectPaginatedResponse(response: Response, expectedCount?: number): void {
    this.expectSuccessResponse(response);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.page).toBeGreaterThan(0);
    expect(response.body.pagination.limit).toBeGreaterThan(0);
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);
    
    if (expectedCount !== undefined) {
      expect(response.body.data).toHaveLength(expectedCount);
    }
  }

  /**
   * 验证创建响应
   */
  static expectCreateResponse(response: Response, expectedData?: any): void {
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();
    
    if (expectedData) {
      expect(response.body.data).toMatchObject(expectedData);
    }
  }

  /**
   * 验证更新响应
   */
  static expectUpdateResponse(response: Response, expectedData?: any): void {
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    if (expectedData) {
      expect(response.body.data).toMatchObject(expectedData);
    }
  }

  /**
   * 验证删除响应
   */
  static expectDeleteResponse(response: Response): void {
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  }

  /**
   * 验证验证错误响应
   */
  static expectValidationError(response: Response, field?: string): void {
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe(4001);
    
    if (field) {
      expect(response.body.message).toContain(field);
    }
  }

  /**
   * 验证认证错误响应
   */
  static expectAuthenticationError(response: Response): void {
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe(3001);
  }

  /**
   * 验证授权错误响应
   */
  static expectAuthorizationError(response: Response): void {
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe(3002);
  }

  /**
   * 验证未找到错误响应
   */
  static expectNotFoundError(response: Response): void {
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe(2001);
  }
}

/**
 * API 测试工具
 */
export class ApiTestUtils {
  /**
   * 创建测试客户端
   */
  static createTestClient(app: Application): EnhancedApiTestClient {
    return new EnhancedApiTestClient(app);
  }

  /**
   * 生成认证 token
   */
  static generateAuthToken(user: import('../../src/types/index.js').User): string {
    // 这里应该使用实际的 JWT 生成逻辑
    return `mock-token-${user.id}`;
  }

  /**
   * 解析认证 token
   */
  static parseAuthToken(token: string): any {
    // 这里应该使用实际的 JWT 解析逻辑
    return { userId: parseInt(token.replace('mock-token-', '')) };
  }

  /**
   * 创建测试请求头
   */
  static createTestHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * 验证有效的 API 响应格式
   */
  static expectValidApiResponse(response: Response): void {
    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('timestamp');
    expect(typeof response.body.success).toBe('boolean');
    expect(typeof response.body.timestamp).toBe('string');

    if (response.body.success) {
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
    } else {
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.code).toBe('number');
      expect(typeof response.body.message).toBe('string');
    }
  }

  /**
   * 验证错误 API 响应格式
   */
  static expectErrorApiResponse(response: Response, code?: number): void {
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty('code');
    expect(response.body).toHaveProperty('message');
    expect(response.body.data).toBeNull();

    if (code) {
      expect(response.body.code).toBe(code);
    }
  }
}

// 导出便捷函数
export function createApiTestClient(app: Application): EnhancedApiTestClient {
  return ApiTestUtils.createTestClient(app);
}

export {
  EnhancedApiTestClient as ApiTestClient,
  ApiTestAssertions,
  ApiTestUtils,
};