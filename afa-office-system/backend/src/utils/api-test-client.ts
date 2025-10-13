/**
 * API测试客户端
 * 提供统一的API测试接口，支持认证、重试和错误处理
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: any;
  expiresIn: number;
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: any;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  user_type: string;
  merchant_id?: number;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  user_type?: string;
  status?: string;
}

export interface FileMetadata {
  originalName: string;
  mimeType: string;
  size: number;
  description?: string;
}

export interface FileResponse {
  id: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface ApiTestClientConfig {
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * API测试客户端类
 */
export class ApiTestClient {
  private axiosInstance: AxiosInstance;
  private authToken: string | null = null;
  private refreshToken: string | null = null;
  private config: Required<ApiTestClientConfig>;

  constructor(config: ApiTestClientConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * 设置请求和响应拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器 - 添加认证头
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器 - 处理认证过期
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          if (this.refreshToken) {
            try {
              const newAuth = await this.refreshAuthToken(this.refreshToken);
              this.setAuthToken(newAuth.accessToken, newAuth.refreshToken);
              originalRequest.headers.Authorization = `Bearer ${newAuth.accessToken}`;
              return this.axiosInstance(originalRequest);
            } catch (refreshError) {
              this.clearAuth();
              throw refreshError;
            }
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * 设置认证令牌
   */
  setAuthToken(accessToken: string, refreshToken?: string): void {
    this.authToken = accessToken;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }
  }

  /**
   * 清除认证信息
   */
  clearAuth(): void {
    this.authToken = null;
    this.refreshToken = null;
  }

  /**
   * 获取当前认证令牌
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * 带重试机制的请求方法
   */
  private async requestWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    attempts: number = this.config.retryAttempts
  ): Promise<AxiosResponse<T>> {
    try {
      return await requestFn();
    } catch (error: any) {
      if (attempts > 1 && this.shouldRetry(error)) {
        await this.delay(this.config.retryDelay);
        return this.requestWithRetry(requestFn, attempts - 1);
      }
      throw error;
    }
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: any): boolean {
    // 网络错误或5xx服务器错误可以重试
    return (
      !error.response ||
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      (error.response.status >= 500 && error.response.status < 600)
    );
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== 认证相关方法 ====================

  /**
   * 用户登录
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.post<{ data: AuthResponse }>('/api/v1/auth/login', credentials)
    );

    const authData = response.data.data;
    this.setAuthToken(authData.accessToken, authData.refreshToken);
    
    return authData;
  }

  /**
   * 刷新认证令牌
   */
  async refreshAuthToken(refreshToken: string): Promise<AuthResponse> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.post<{ data: AuthResponse }>('/api/v1/auth/refresh', {
        refreshToken
      })
    );

    return response.data.data;
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    await this.requestWithRetry(() =>
      this.axiosInstance.post('/api/v1/auth/logout')
    );

    this.clearAuth();
  }

  // ==================== 用户管理方法 ====================

  /**
   * 获取用户列表
   */
  async getUsers(params?: QueryParams): Promise<any[]> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.get<{ data: { items: any[] } }>('/api/v1/users', { params })
    );

    return response.data.data.items;
  }

  /**
   * 获取单个用户
   */
  async getUser(id: number): Promise<any> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.get<{ data: any }>(`/api/v1/users/${id}`)
    );

    return response.data.data;
  }

  /**
   * 创建用户
   */
  async createUser(userData: CreateUserRequest): Promise<any> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.post<{ data: any }>('/api/v1/users', userData)
    );

    return response.data.data;
  }

  /**
   * 更新用户
   */
  async updateUser(id: number, userData: UpdateUserRequest): Promise<any> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.put<{ data: any }>(`/api/v1/users/${id}`, userData)
    );

    return response.data.data;
  }

  /**
   * 删除用户
   */
  async deleteUser(id: number): Promise<void> {
    await this.requestWithRetry(() =>
      this.axiosInstance.delete(`/api/v1/users/${id}`)
    );
  }

  // ==================== 商户管理方法 ====================

  /**
   * 获取商户列表
   */
  async getMerchants(params?: QueryParams): Promise<any[]> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.get<{ data: { items: any[] } }>('/api/v1/merchants', { params })
    );

    return response.data.data.items;
  }

  /**
   * 获取单个商户
   */
  async getMerchant(id: number): Promise<any> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.get<{ data: any }>(`/api/v1/merchants/${id}`)
    );

    return response.data.data;
  }

  /**
   * 创建商户
   */
  async createMerchant(merchantData: any): Promise<any> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.post<{ data: any }>('/api/v1/merchants', merchantData)
    );

    return response.data.data;
  }

  /**
   * 更新商户
   */
  async updateMerchant(id: number, merchantData: any): Promise<any> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.put<{ data: any }>(`/api/v1/merchants/${id}`, merchantData)
    );

    return response.data.data;
  }

  /**
   * 删除商户
   */
  async deleteMerchant(id: number): Promise<void> {
    await this.requestWithRetry(() =>
      this.axiosInstance.delete(`/api/v1/merchants/${id}`)
    );
  }

  // ==================== 文件操作方法 ====================

  /**
   * 上传文件
   */
  async uploadFile(file: File | Buffer, metadata?: FileMetadata): Promise<FileResponse> {
    const formData = new FormData();
    
    if (file instanceof File) {
      formData.append('file', file);
    } else {
      // 处理Buffer类型的文件 - 转换为Uint8Array以兼容Blob
      const uint8Array = new Uint8Array(file);
      const blob = new Blob([uint8Array], { type: metadata?.mimeType || 'application/octet-stream' });
      formData.append('file', blob, metadata?.originalName || 'file');
    }

    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await this.requestWithRetry(() =>
      this.axiosInstance.post<{ data: FileResponse }>('/api/v1/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    );

    return response.data.data;
  }

  /**
   * 下载文件
   */
  async downloadFile(fileId: string): Promise<Blob> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.get(`/api/v1/files/${fileId}/download`, {
        responseType: 'blob',
      })
    );

    return response.data;
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(fileId: string): Promise<any> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.get<{ data: any }>(`/api/v1/files/${fileId}`)
    );

    return response.data.data;
  }

  /**
   * 删除文件
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.requestWithRetry(() =>
      this.axiosInstance.delete(`/api/v1/files/${fileId}`)
    );
  }

  // ==================== 通用请求方法 ====================

  /**
   * 通用请求方法
   */
  async request<T = any>(method: string, url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const normalizedMethod = method.toLowerCase();
    
    switch (normalizedMethod) {
      case 'get':
        return this.get<T>(url, config);
      case 'post':
        return this.post<T>(url, data, config);
      case 'put':
        return this.put<T>(url, data, config);
      case 'delete':
        return this.delete<T>(url, config);
      case 'patch':
        return this.requestWithRetry(() => this.axiosInstance.patch<T>(url, data, config));
      case 'head':
        return this.requestWithRetry(() => this.axiosInstance.head<T>(url, config));
      case 'options':
        return this.requestWithRetry(() => this.axiosInstance.options<T>(url, config));
      default:
        throw new Error(`不支持的HTTP方法: ${method}`);
    }
  }

  /**
   * 发送GET请求
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.requestWithRetry(() => this.axiosInstance.get<T>(url, config));
  }

  /**
   * 发送POST请求
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.requestWithRetry(() => this.axiosInstance.post<T>(url, data, config));
  }

  /**
   * 发送PUT请求
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.requestWithRetry(() => this.axiosInstance.put<T>(url, data, config));
  }

  /**
   * 发送DELETE请求
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.requestWithRetry(() => this.axiosInstance.delete<T>(url, config));
  }

  // ==================== 工具方法 ====================

  /**
   * 检查API健康状态
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/api/v1/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * 获取API版本信息
   */
  async getVersion(): Promise<string> {
    const response = await this.get<{ data: { version: string } }>('/api/v1/version');
    return response.data.data.version;
  }

  /**
   * 设置请求超时时间
   */
  setTimeout(timeout: number): void {
    this.config.timeout = timeout;
    this.axiosInstance.defaults.timeout = timeout;
  }

  /**
   * 设置重试次数
   */
  setRetryAttempts(attempts: number): void {
    this.config.retryAttempts = attempts;
  }

  /**
   * 获取当前配置
   */
  getConfig(): Required<ApiTestClientConfig> {
    return { ...this.config };
  }

  // ==================== 访客申请管理方法 ====================

  /**
   * 获取访客申请列表
   */
  async getVisitorApplications(params?: QueryParams): Promise<any[]> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.get<{ data: { items: any[] } }>('/api/v1/visitor-applications', { params })
    );

    return response.data.data.items;
  }

  /**
   * 获取单个访客申请
   */
  async getVisitorApplication(id: number): Promise<any> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.get<{ data: any }>(`/api/v1/visitor-applications/${id}`)
    );

    return response.data.data;
  }

  /**
   * 创建访客申请
   */
  async createVisitorApplication(applicationData: any): Promise<any> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.post<{ data: any }>('/api/v1/visitor-applications', applicationData)
    );

    return response.data.data;
  }

  /**
   * 审批访客申请
   */
  async approveVisitorApplication(id: number, approvalData: any): Promise<any> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.post<{ data: any }>(`/api/v1/visitor-applications/${id}/approve`, approvalData)
    );

    return response.data.data;
  }

  /**
   * 拒绝访客申请
   */
  async rejectVisitorApplication(id: number, rejectionData: any): Promise<any> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.post<{ data: any }>(`/api/v1/visitor-applications/${id}/reject`, rejectionData)
    );

    return response.data.data;
  }

  // ==================== 通行记录管理方法 ====================

  /**
   * 获取通行记录列表
   */
  async getAccessRecords(params?: QueryParams): Promise<any[]> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.get<{ data: { items: any[] } }>('/api/v1/access-records', { params })
    );

    return response.data.data.items;
  }

  /**
   * 创建通行记录
   */
  async createAccessRecord(recordData: any): Promise<any> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.post<{ data: any }>('/api/v1/access-records', recordData)
    );

    return response.data.data;
  }

  /**
   * 验证通行码
   */
  async verifyPasscode(passcode: string, deviceId: string): Promise<any> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.post<{ data: any }>('/api/v1/access/verify', {
        passcode,
        deviceId,
      })
    );

    return response.data.data;
  }

  // ==================== 项目和场地管理方法 ====================

  /**
   * 获取项目列表
   */
  async getProjects(params?: QueryParams): Promise<any[]> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.get<{ data: { items: any[] } }>('/api/v1/projects', { params })
    );

    return response.data.data.items;
  }

  /**
   * 创建项目
   */
  async createProject(projectData: any): Promise<any> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.post<{ data: any }>('/api/v1/projects', projectData)
    );

    return response.data.data;
  }

  /**
   * 获取场地列表
   */
  async getVenues(params?: QueryParams): Promise<any[]> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.get<{ data: { items: any[] } }>('/api/v1/venues', { params })
    );

    return response.data.data.items;
  }

  /**
   * 创建场地
   */
  async createVenue(venueData: any): Promise<any> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.post<{ data: any }>('/api/v1/venues', venueData)
    );

    return response.data.data;
  }

  // ==================== WebSocket 连接方法 ====================

  /**
   * 连接WebSocket
   */
  connectWebSocket(path: string = '/ws'): WebSocket | null {
    try {
      const wsUrl = this.config.baseUrl.replace(/^http/, 'ws') + path;
      const ws = new WebSocket(wsUrl);
      
      // 添加认证头（如果支持）
      if (this.authToken) {
        ws.addEventListener('open', () => {
          ws.send(JSON.stringify({
            type: 'auth',
            token: this.authToken,
          }));
        });
      }

      return ws;
    } catch (error) {
      console.error('WebSocket连接失败:', error);
      return null;
    }
  }

  /**
   * 订阅服务器发送事件
   */
  subscribeToUpdates(channel: string): EventSource | null {
    try {
      const sseUrl = `${this.config.baseUrl}/api/v1/events/${channel}`;
      const eventSource = new EventSource(sseUrl);
      
      return eventSource;
    } catch (error) {
      console.error('SSE连接失败:', error);
      return null;
    }
  }

  // ==================== 批量操作方法 ====================

  /**
   * 批量创建用户
   */
  async batchCreateUsers(usersData: any[]): Promise<any[]> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.post<{ data: any[] }>('/api/v1/users/batch', { users: usersData })
    );

    return response.data.data;
  }

  /**
   * 批量删除用户
   */
  async batchDeleteUsers(userIds: number[]): Promise<void> {
    await this.requestWithRetry(() =>
      this.axiosInstance.delete('/api/v1/users/batch', { data: { ids: userIds } })
    );
  }

  /**
   * 批量审批访客申请
   */
  async batchApproveVisitorApplications(applicationIds: number[], approvalData: any): Promise<any[]> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.post<{ data: any[] }>('/api/v1/visitor-applications/batch-approve', {
        ids: applicationIds,
        ...approvalData,
      })
    );

    return response.data.data;
  }

  // ==================== 统计和报表方法 ====================

  /**
   * 获取访客统计数据
   */
  async getVisitorStatistics(params?: { startDate?: string; endDate?: string; merchantId?: number }): Promise<any> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.get<{ data: any }>('/api/v1/statistics/visitors', { params })
    );

    return response.data.data;
  }

  /**
   * 获取通行统计数据
   */
  async getAccessStatistics(params?: { startDate?: string; endDate?: string; projectId?: number }): Promise<any> {
    const response = await this.requestWithRetry(() =>
      this.axiosInstance.get<{ data: any }>('/api/v1/statistics/access', { params })
    );

    return response.data.data;
  }

  // ==================== 测试辅助方法 ====================

  /**
   * 等待指定时间
   */
  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 轮询直到条件满足
   */
  async waitUntil(
    condition: () => Promise<boolean>,
    timeout: number = 10000,
    interval: number = 500
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await this.wait(interval);
    }
    
    throw new Error(`等待条件超时 (${timeout}ms)`);
  }

  /**
   * 验证响应数据结构
   */
  validateResponse(response: any, expectedFields: string[]): boolean {
    for (const field of expectedFields) {
      if (!(field in response)) {
        throw new Error(`响应缺少必需字段: ${field}`);
      }
    }
    return true;
  }

  /**
   * 生成测试用的随机数据
   */
  generateTestData(type: 'user' | 'merchant' | 'visitor'): any {
    const timestamp = Date.now();
    
    switch (type) {
      case 'user':
        return {
          name: `测试用户${timestamp}`,
          phone: `138${String(timestamp).slice(-8)}`,
          user_type: 'employee',
          merchant_id: 1,
        };
      
      case 'merchant':
        return {
          name: `测试商户${timestamp}`,
          code: `MERCHANT_${timestamp}`,
          contact: `联系人${timestamp}`,
          phone: `138${String(timestamp).slice(-8)}`,
          email: `merchant${timestamp}@test.com`,
          address: `测试地址${timestamp}`,
        };
      
      case 'visitor':
        return {
          visitor_name: `访客${timestamp}`,
          visitor_phone: `138${String(timestamp).slice(-8)}`,
          visitor_company: `访客公司${timestamp}`,
          visit_purpose: '商务洽谈',
          visit_type: 'business',
          scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 2,
        };
      
      default:
        return {};
    }
  }

  /**
   * 清理测试数据
   */
  async cleanupTestData(createdIds: { [key: string]: number[] }): Promise<void> {
    try {
      // 按依赖关系逆序清理
      if (createdIds.accessRecords) {
        for (const id of createdIds.accessRecords) {
          try {
            await this.delete(`/api/v1/access-records/${id}`);
          } catch (error) {
            console.warn(`清理通行记录 ${id} 失败:`, error);
          }
        }
      }

      if (createdIds.visitorApplications) {
        for (const id of createdIds.visitorApplications) {
          try {
            await this.delete(`/api/v1/visitor-applications/${id}`);
          } catch (error) {
            console.warn(`清理访客申请 ${id} 失败:`, error);
          }
        }
      }

      if (createdIds.users) {
        for (const id of createdIds.users) {
          try {
            await this.deleteUser(id);
          } catch (error) {
            console.warn(`清理用户 ${id} 失败:`, error);
          }
        }
      }

      if (createdIds.merchants) {
        for (const id of createdIds.merchants) {
          try {
            await this.deleteMerchant(id);
          } catch (error) {
            console.warn(`清理商户 ${id} 失败:`, error);
          }
        }
      }
    } catch (error) {
      console.error('清理测试数据时发生错误:', error);
    }
  }
}