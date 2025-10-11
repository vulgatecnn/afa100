// API服务基础类
import { ApiResponse } from '../types/api';

class ApiService {
  private baseUrl: string;

  constructor() {
    // 从全局数据获取API基础地址
    const app = getApp<IAppOption>();
    this.baseUrl = app.globalData.apiBase;
  }

  // 通用请求方法
  private request<T>(options: {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    header?: Record<string, string>;
  }): Promise<ApiResponse<T>> {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('access_token');
      const defaultHeader = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      wx.request({
        url: `${this.baseUrl}${options.url}`,
        method: options.method || 'GET',
        data: options.data,
        header: {
          ...defaultHeader,
          ...options.header
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data as ApiResponse<T>);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.data}`));
          }
        },
        fail: (error) => {
          reject(error);
        }
      });
    });
  }

  // GET请求
  get<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const queryString = data ? this.buildQueryString(data) : '';
    return this.request<T>({
      url: `${url}${queryString}`,
      method: 'GET'
    });
  }

  // POST请求
  post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'POST',
      data
    });
  }

  // PUT请求
  put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'PUT',
      data
    });
  }

  // DELETE请求
  delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'DELETE'
    });
  }

  // 构建查询字符串
  private buildQueryString(params: Record<string, any>): string {
    const query = Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== null)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    return query ? `?${query}` : '';
  }
}

export default new ApiService();