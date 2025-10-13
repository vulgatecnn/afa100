/**
 * ApiTestClient 单元测试
 * 测试API请求封装、认证令牌管理和请求重试机制
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { ApiTestClient, type LoginCredentials, type AuthResponse, type CreateUserRequest } from '../../../src/utils/api-test-client';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('ApiTestClient', () => {
  let apiClient: ApiTestClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // 创建mock axios实例
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      defaults: {
        timeout: 30000,
        headers: {}
      },
      interceptors: {
        request: {
          use: vi.fn()
        },
        response: {
          use: vi.fn()
        }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // 创建ApiTestClient实例
    apiClient = new ApiTestClient({
      baseUrl: 'http://localhost:3000',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('API请求封装和错误处理', () => {
    it('应该正确初始化axios实例', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3000',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });

    it('应该设置请求和响应拦截器', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });

    it('应该正确发送GET请求', async () => {
      const mockResponse = { data: { success: true }, status: 200 };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const response = await apiClient.get('/test');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined);
      expect(response).toEqual(mockResponse);
    });

    it('应该正确发送POST请求', async () => {
      const mockResponse = { data: { success: true }, status: 200 };
      const testData = { name: 'test' };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const response = await apiClient.post('/test', testData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', testData, undefined);
      expect(response).toEqual(mockResponse);
    });

    it('应该处理网络错误', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ECONNRESET';
      mockAxiosInstance.get.mockRejectedValue(networkError);

      await expect(apiClient.get('/test')).rejects.toThrow('Network Error');
    });
  });

  describe('认证令牌管理', () => {
    it('应该正确设置认证令牌', () => {
      const accessToken = 'test-access-token';
      const refreshToken = 'test-refresh-token';

      apiClient.setAuthToken(accessToken, refreshToken);

      expect(apiClient.getAuthToken()).toBe(accessToken);
    });

    it('应该正确清除认证信息', () => {
      apiClient.setAuthToken('test-token');
      apiClient.clearAuth();

      expect(apiClient.getAuthToken()).toBeNull();
    });

    it('应该正确处理用户登录', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockAuthResponse: AuthResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 1, email: 'test@example.com' },
        expiresIn: 3600
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: { data: mockAuthResponse }
      });

      const result = await apiClient.login(credentials);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/v1/auth/login', credentials);
      expect(result).toEqual(mockAuthResponse);
      expect(apiClient.getAuthToken()).toBe('access-token');
    });

    it('应该正确处理令牌刷新', async () => {
      const refreshToken = 'refresh-token';
      const newAuthResponse: AuthResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: { id: 1, email: 'test@example.com' },
        expiresIn: 3600
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: { data: newAuthResponse }
      });

      const result = await apiClient.refreshAuthToken(refreshToken);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/v1/auth/refresh', {
        refreshToken
      });
      expect(result).toEqual(newAuthResponse);
    });

    it('应该正确处理用户登出', async () => {
      apiClient.setAuthToken('test-token');
      mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });

      await apiClient.logout();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/v1/auth/logout');
      expect(apiClient.getAuthToken()).toBeNull();
    });
  });

  describe('请求重试机制', () => {
    it('应该在网络错误时重试请求', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ECONNRESET';

      // 前两次失败，第三次成功
      mockAxiosInstance.get
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue({ data: { success: true } });

      const response = await apiClient.get('/test');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
      expect(response.data).toEqual({ success: true });
    });

    it('应该在5xx服务器错误时重试请求', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { message: 'Internal Server Error' }
        }
      };

      // 前两次失败，第三次成功
      mockAxiosInstance.get
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue({ data: { success: true } });

      const response = await apiClient.get('/test');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
      expect(response.data).toEqual({ success: true });
    });

    it('应该在4xx客户端错误时不重试请求', async () => {
      const clientError = {
        response: {
          status: 400,
          data: { message: 'Bad Request' }
        }
      };

      mockAxiosInstance.get.mockRejectedValue(clientError);

      await expect(apiClient.get('/test')).rejects.toEqual(clientError);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    it('应该正确设置重试次数', () => {
      apiClient.setRetryAttempts(5);
      const config = apiClient.getConfig();
      
      expect(config.retryAttempts).toBe(5);
    });
  });

  describe('用户管理API', () => {
    it('应该正确获取用户列表', async () => {
      const mockUsers = [
        { id: 1, name: 'User 1', email: 'user1@example.com' },
        { id: 2, name: 'User 2', email: 'user2@example.com' }
      ];

      mockAxiosInstance.get.mockResolvedValue({
        data: { data: { items: mockUsers } }
      });

      const users = await apiClient.getUsers({ page: 1, pageSize: 10 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/users', {
        params: { page: 1, pageSize: 10 }
      });
      expect(users).toEqual(mockUsers);
    });

    it('应该正确创建用户', async () => {
      const userData: CreateUserRequest = {
        name: 'New User',
        email: 'newuser@example.com',
        phone: '1234567890',
        password: 'password123',
        user_type: 'employee'
      };

      const mockCreatedUser = { id: 3, ...userData };

      mockAxiosInstance.post.mockResolvedValue({
        data: { data: mockCreatedUser }
      });

      const user = await apiClient.createUser(userData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/v1/users', userData);
      expect(user).toEqual(mockCreatedUser);
    });
  });

  describe('工具方法', () => {
    it('应该正确检查API健康状态', async () => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200 });

      const isHealthy = await apiClient.healthCheck();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/health', undefined);
      expect(isHealthy).toBe(true);
    });

    it('应该在健康检查失败时返回false', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Service unavailable'));

      const isHealthy = await apiClient.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it('应该正确设置请求超时时间', () => {
      apiClient.setTimeout(60000);

      expect(mockAxiosInstance.defaults.timeout).toBe(60000);
      expect(apiClient.getConfig().timeout).toBe(60000);
    });

    it('应该正确获取当前配置', () => {
      const config = apiClient.getConfig();

      expect(config).toEqual({
        baseUrl: 'http://localhost:3000',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      });
    });
  });
});