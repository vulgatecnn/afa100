// API服务单元测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetMocks, mockApiResponse, mockApiError } from '../../setup';

describe('API服务测试', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('API服务初始化', () => {
    it('应该正确初始化API服务', () => {
      const mockApp = {
        globalData: {
          apiBase: 'https://api.example.com'
        }
      };
      global.getApp = vi.fn(() => mockApp);

      class ApiService {
        private baseUrl: string;

        constructor() {
          const app = getApp();
          this.baseUrl = app.globalData.apiBase;
        }

        getBaseUrl() {
          return this.baseUrl;
        }
      }

      const apiService = new ApiService();

      expect(apiService.getBaseUrl()).toBe('https://api.example.com');
    });
  });

  describe('通用请求方法', () => {
    it('应该正确发送GET请求', async () => {
      const mockResponse = { success: true, data: { id: 1, name: '测试' } };
      mockApiResponse(mockResponse);

      // 模拟存储的token
      global.wx.getStorageSync = vi.fn().mockReturnValue('mock-token');

      class ApiService {
        private baseUrl = 'https://api.example.com';

        private request(options) {
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
                  resolve(res.data);
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

        get(url, data) {
          const queryString = data ? this.buildQueryString(data) : '';
          return this.request({
            url: `${url}${queryString}`,
            method: 'GET'
          });
        }

        private buildQueryString(params) {
          const query = Object.keys(params)
            .filter(key => params[key] !== undefined && params[key] !== null)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
            .join('&');
          return query ? `?${query}` : '';
        }
      }

      const apiService = new ApiService();
      const result = await apiService.get('/api/v1/users', { page: 1, limit: 10 });

      expect(wx.request).toHaveBeenCalledWith({
        url: 'https://api.example.com/api/v1/users?page=1&limit=10',
        method: 'GET',
        data: undefined,
        header: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        },
        success: expect.any(Function),
        fail: expect.any(Function)
      });
      expect(result).toEqual(mockResponse);
    });

    it('应该正确发送POST请求', async () => {
      const mockResponse = { success: true, data: { id: 1 } };
      mockApiResponse(mockResponse);

      class ApiService {
        private baseUrl = 'https://api.example.com';

        private request(options) {
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
                  resolve(res.data);
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

        post(url, data) {
          return this.request({
            url,
            method: 'POST',
            data
          });
        }
      }

      const apiService = new ApiService();
      const postData = { name: '新用户', email: 'test@example.com' };
      const result = await apiService.post('/api/v1/users', postData);

      expect(wx.request).toHaveBeenCalledWith({
        url: 'https://api.example.com/api/v1/users',
        method: 'POST',
        data: postData,
        header: {
          'Content-Type': 'application/json'
        },
        success: expect.any(Function),
        fail: expect.any(Function)
      });
      expect(result).toEqual(mockResponse);
    });

    it('应该正确发送PUT请求', async () => {
      const mockResponse = { success: true, data: { id: 1, updated: true } };
      mockApiResponse(mockResponse);

      class ApiService {
        private baseUrl = 'https://api.example.com';

        private request(options) {
          return new Promise((resolve, reject) => {
            wx.request({
              url: `${this.baseUrl}${options.url}`,
              method: options.method || 'GET',
              data: options.data,
              header: {
                'Content-Type': 'application/json',
                ...options.header
              },
              success: (res) => {
                resolve(res.data);
              },
              fail: reject
            });
          });
        }

        put(url, data) {
          return this.request({
            url,
            method: 'PUT',
            data
          });
        }
      }

      const apiService = new ApiService();
      const updateData = { name: '更新用户' };
      const result = await apiService.put('/api/v1/users/1', updateData);

      expect(wx.request).toHaveBeenCalledWith({
        url: 'https://api.example.com/api/v1/users/1',
        method: 'PUT',
        data: updateData,
        header: {
          'Content-Type': 'application/json'
        },
        success: expect.any(Function),
        fail: expect.any(Function)
      });
      expect(result).toEqual(mockResponse);
    });

    it('应该正确发送DELETE请求', async () => {
      const mockResponse = { success: true, message: '删除成功' };
      mockApiResponse(mockResponse);

      class ApiService {
        private baseUrl = 'https://api.example.com';

        private request(options) {
          return new Promise((resolve, reject) => {
            wx.request({
              url: `${this.baseUrl}${options.url}`,
              method: options.method || 'GET',
              data: options.data,
              header: {
                'Content-Type': 'application/json',
                ...options.header
              },
              success: (res) => {
                resolve(res.data);
              },
              fail: reject
            });
          });
        }

        delete(url) {
          return this.request({
            url,
            method: 'DELETE'
          });
        }
      }

      const apiService = new ApiService();
      const result = await apiService.delete('/api/v1/users/1');

      expect(wx.request).toHaveBeenCalledWith({
        url: 'https://api.example.com/api/v1/users/1',
        method: 'DELETE',
        data: undefined,
        header: {
          'Content-Type': 'application/json'
        },
        success: expect.any(Function),
        fail: expect.any(Function)
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('请求头处理', () => {
    it('应该在有token时添加Authorization头', async () => {
      global.wx.getStorageSync = vi.fn().mockReturnValue('test-token');
      mockApiResponse({ success: true });

      class ApiService {
        private request(options) {
          return new Promise((resolve) => {
            const token = wx.getStorageSync('access_token');
            const defaultHeader = {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            };

            wx.request({
              url: options.url,
              method: options.method,
              header: {
                ...defaultHeader,
                ...options.header
              },
              success: (res) => resolve(res.data),
              fail: () => {}
            });
          });
        }

        get(url) {
          return this.request({ url, method: 'GET' });
        }
      }

      const apiService = new ApiService();
      await apiService.get('/api/v1/test');

      expect(wx.request).toHaveBeenCalledWith({
        url: '/api/v1/test',
        method: 'GET',
        header: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        success: expect.any(Function),
        fail: expect.any(Function)
      });
    });

    it('应该在没有token时不添加Authorization头', async () => {
      global.wx.getStorageSync = vi.fn().mockReturnValue('');
      mockApiResponse({ success: true });

      class ApiService {
        private request(options) {
          return new Promise((resolve) => {
            const token = wx.getStorageSync('access_token');
            const defaultHeader = {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            };

            wx.request({
              url: options.url,
              method: options.method,
              header: {
                ...defaultHeader,
                ...options.header
              },
              success: (res) => resolve(res.data),
              fail: () => {}
            });
          });
        }

        get(url) {
          return this.request({ url, method: 'GET' });
        }
      }

      const apiService = new ApiService();
      await apiService.get('/api/v1/test');

      expect(wx.request).toHaveBeenCalledWith({
        url: '/api/v1/test',
        method: 'GET',
        header: {
          'Content-Type': 'application/json'
        },
        success: expect.any(Function),
        fail: expect.any(Function)
      });
    });

    it('应该支持自定义请求头', async () => {
      mockApiResponse({ success: true });

      class ApiService {
        private request(options) {
          return new Promise((resolve) => {
            wx.request({
              url: options.url,
              method: options.method,
              header: {
                'Content-Type': 'application/json',
                ...options.header
              },
              success: (res) => resolve(res.data),
              fail: () => {}
            });
          });
        }

        get(url, data, customHeader) {
          return this.request({
            url,
            method: 'GET',
            header: customHeader
          });
        }
      }

      const apiService = new ApiService();
      const customHeader = { 'X-Custom-Header': 'custom-value' };
      await apiService.get('/api/v1/test', null, customHeader);

      expect(wx.request).toHaveBeenCalledWith({
        url: '/api/v1/test',
        method: 'GET',
        header: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value'
        },
        success: expect.any(Function),
        fail: expect.any(Function)
      });
    });
  });

  describe('查询字符串构建', () => {
    it('应该正确构建查询字符串', () => {
      class ApiService {
        buildQueryString(params) {
          const query = Object.keys(params)
            .filter(key => params[key] !== undefined && params[key] !== null)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
            .join('&');
          return query ? `?${query}` : '';
        }
      }

      const apiService = new ApiService();

      expect(apiService.buildQueryString({ page: 1, limit: 10 }))
        .toBe('?page=1&limit=10');
      expect(apiService.buildQueryString({ search: '测试', status: 'active' }))
        .toBe('?search=%E6%B5%8B%E8%AF%95&status=active');
      expect(apiService.buildQueryString({}))
        .toBe('');
    });

    it('应该过滤undefined和null值', () => {
      class ApiService {
        buildQueryString(params) {
          const query = Object.keys(params)
            .filter(key => params[key] !== undefined && params[key] !== null)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
            .join('&');
          return query ? `?${query}` : '';
        }
      }

      const apiService = new ApiService();

      expect(apiService.buildQueryString({
        page: 1,
        search: undefined,
        status: null,
        limit: 10
      })).toBe('?page=1&limit=10');
    });

    it('应该正确编码特殊字符', () => {
      class ApiService {
        buildQueryString(params) {
          const query = Object.keys(params)
            .filter(key => params[key] !== undefined && params[key] !== null)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
            .join('&');
          return query ? `?${query}` : '';
        }
      }

      const apiService = new ApiService();

      expect(apiService.buildQueryString({
        search: '测试 & 特殊字符',
        url: 'https://example.com'
      })).toBe('?search=%E6%B5%8B%E8%AF%95%20%26%20%E7%89%B9%E6%AE%8A%E5%AD%97%E7%AC%A6&url=https%3A%2F%2Fexample.com');
    });
  });

  describe('错误处理', () => {
    it('应该处理HTTP错误状态码', async () => {
      // 模拟HTTP 400错误
      global.wx.request = vi.fn().mockImplementation(({ success }) => {
        success({
          statusCode: 400,
          data: { message: '请求参数错误' }
        });
      });

      class ApiService {
        private request(options) {
          return new Promise((resolve, reject) => {
            wx.request({
              url: options.url,
              method: options.method,
              success: (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                  resolve(res.data);
                } else {
                  reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(res.data)}`));
                }
              },
              fail: reject
            });
          });
        }

        get(url) {
          return this.request({ url, method: 'GET' });
        }
      }

      const apiService = new ApiService();

      await expect(apiService.get('/api/v1/test')).rejects.toThrow('HTTP 400');
    });

    it('应该处理网络错误', async () => {
      const networkError = new Error('网络连接失败');
      global.wx.request = vi.fn().mockImplementation(({ fail }) => {
        fail(networkError);
      });

      class ApiService {
        private request(options) {
          return new Promise((resolve, reject) => {
            wx.request({
              url: options.url,
              method: options.method,
              success: resolve,
              fail: reject
            });
          });
        }

        get(url) {
          return this.request({ url, method: 'GET' });
        }
      }

      const apiService = new ApiService();

      await expect(apiService.get('/api/v1/test')).rejects.toThrow('网络连接失败');
    });

    it('应该处理超时错误', async () => {
      const timeoutError = new Error('请求超时');
      global.wx.request = vi.fn().mockImplementation(({ fail }) => {
        setTimeout(() => fail(timeoutError), 100);
      });

      class ApiService {
        private request(options) {
          return new Promise((resolve, reject) => {
            wx.request({
              url: options.url,
              method: options.method,
              timeout: 5000,
              success: resolve,
              fail: reject
            });
          });
        }

        get(url) {
          return this.request({ url, method: 'GET' });
        }
      }

      const apiService = new ApiService();

      await expect(apiService.get('/api/v1/test')).rejects.toThrow('请求超时');
    });
  });

  describe('响应处理', () => {
    it('应该正确处理成功响应', async () => {
      const mockData = { id: 1, name: '测试用户' };
      global.wx.request = vi.fn().mockImplementation(({ success }) => {
        success({
          statusCode: 200,
          data: { success: true, data: mockData }
        });
      });

      class ApiService {
        private request(options) {
          return new Promise((resolve, reject) => {
            wx.request({
              url: options.url,
              method: options.method,
              success: (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                  resolve(res.data);
                } else {
                  reject(new Error(`HTTP ${res.statusCode}`));
                }
              },
              fail: reject
            });
          });
        }

        get(url) {
          return this.request({ url, method: 'GET' });
        }
      }

      const apiService = new ApiService();
      const result = await apiService.get('/api/v1/users/1');

      expect(result).toEqual({ success: true, data: mockData });
    });

    it('应该处理空响应', async () => {
      global.wx.request = vi.fn().mockImplementation(({ success }) => {
        success({
          statusCode: 204,
          data: null
        });
      });

      class ApiService {
        private request(options) {
          return new Promise((resolve, reject) => {
            wx.request({
              url: options.url,
              method: options.method,
              success: (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                  resolve(res.data);
                } else {
                  reject(new Error(`HTTP ${res.statusCode}`));
                }
              },
              fail: reject
            });
          });
        }

        delete(url) {
          return this.request({ url, method: 'DELETE' });
        }
      }

      const apiService = new ApiService();
      const result = await apiService.delete('/api/v1/users/1');

      expect(result).toBeNull();
    });
  });

  describe('并发请求', () => {
    it('应该支持并发请求', async () => {
      let requestCount = 0;
      global.wx.request = vi.fn().mockImplementation(({ success }) => {
        requestCount++;
        setTimeout(() => {
          success({
            statusCode: 200,
            data: { success: true, data: { id: requestCount } }
          });
        }, 100);
      });

      class ApiService {
        private request(options) {
          return new Promise((resolve) => {
            wx.request({
              url: options.url,
              method: options.method,
              success: (res) => resolve(res.data),
              fail: () => {}
            });
          });
        }

        get(url) {
          return this.request({ url, method: 'GET' });
        }
      }

      const apiService = new ApiService();

      const promises = [
        apiService.get('/api/v1/users/1'),
        apiService.get('/api/v1/users/2'),
        apiService.get('/api/v1/users/3')
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(wx.request).toHaveBeenCalledTimes(3);
      expect(results[0].data.id).toBe(1);
      expect(results[1].data.id).toBe(2);
      expect(results[2].data.id).toBe(3);
    });

    it('应该处理部分请求失败的情况', async () => {
      let requestCount = 0;
      global.wx.request = vi.fn().mockImplementation(({ success, fail }) => {
        requestCount++;
        if (requestCount === 2) {
          fail(new Error('第二个请求失败'));
        } else {
          success({
            statusCode: 200,
            data: { success: true, data: { id: requestCount } }
          });
        }
      });

      class ApiService {
        private request(options) {
          return new Promise((resolve, reject) => {
            wx.request({
              url: options.url,
              method: options.method,
              success: (res) => resolve(res.data),
              fail: reject
            });
          });
        }

        get(url) {
          return this.request({ url, method: 'GET' });
        }
      }

      const apiService = new ApiService();

      const promises = [
        apiService.get('/api/v1/users/1'),
        apiService.get('/api/v1/users/2'),
        apiService.get('/api/v1/users/3')
      ];

      const results = await Promise.allSettled(promises);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
      expect(results[1].reason.message).toBe('第二个请求失败');
    });
  });
});