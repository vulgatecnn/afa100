/**
 * API 客户端测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { ApiClient } from '../api-client'
import { ApiError } from '../api-error'
import { ApiErrorType } from '../types'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

describe('ApiClient', () => {
  let apiClient: ApiClient
  let mockAxiosInstance: any

  beforeEach(() => {
    // 创建 mock axios 实例
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      },
      defaults: {
        headers: {}
      }
    }

    mockedAxios.create.mockReturnValue(mockAxiosInstance)
    mockedAxios.isCancel.mockReturnValue(false)

    // 创建 API 客户端实例
    apiClient = new ApiClient({
      baseURL: 'http://localhost:3000/api/v1',
      timeout: 5000
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('构造函数', () => {
    it('应该创建 axios 实例并设置默认配置', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3000/api/v1',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    })

    it('应该设置请求和响应拦截器', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled()
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled()
    })
  })

  describe('HTTP 方法', () => {
    it('应该发送 GET 请求', async () => {
      const mockData = { id: 1, name: 'test' }
      mockAxiosInstance.get.mockResolvedValue(mockData)

      const result = await apiClient.get('/users/1')

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users/1', {})
      expect(result).toEqual(mockData)
    })

    it('应该发送 POST 请求', async () => {
      const mockData = { id: 1, name: 'test' }
      const postData = { name: 'test' }
      mockAxiosInstance.post.mockResolvedValue(mockData)

      const result = await apiClient.post('/users', postData)

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/users', postData, {})
      expect(result).toEqual(mockData)
    })

    it('应该发送 PUT 请求', async () => {
      const mockData = { id: 1, name: 'updated' }
      const putData = { name: 'updated' }
      mockAxiosInstance.put.mockResolvedValue(mockData)

      const result = await apiClient.put('/users/1', putData)

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/users/1', putData, {})
      expect(result).toEqual(mockData)
    })

    it('应该发送 DELETE 请求', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ success: true })

      const result = await apiClient.delete('/users/1')

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/users/1', {})
      expect(result).toEqual({ success: true })
    })
  })

  describe('错误处理', () => {
    it('应该处理网络错误', async () => {
      const networkError = new Error('Network Error')
      networkError.request = {}
      mockAxiosInstance.get.mockRejectedValue(networkError)

      await expect(apiClient.get('/users')).rejects.toThrow(ApiError)
    })

    it('应该处理 HTTP 错误响应', async () => {
      const httpError = {
        response: {
          status: 404,
          data: { message: '用户不存在' }
        }
      }
      mockAxiosInstance.get.mockRejectedValue(httpError)

      await expect(apiClient.get('/users/999')).rejects.toThrow(ApiError)
    })

    it('应该处理超时错误', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded')
      timeoutError.code = 'ECONNABORTED'
      mockAxiosInstance.get.mockRejectedValue(timeoutError)

      await expect(apiClient.get('/users')).rejects.toThrow(ApiError)
    })
  })

  describe('网络状态', () => {
    it('应该返回网络状态', () => {
      const status = apiClient.getNetworkStatus()
      expect(status).toHaveProperty('isOnline')
      expect(status).toHaveProperty('isSlowConnection')
    })

    it('应该检查在线状态', () => {
      const isOnline = apiClient.isOnline()
      expect(typeof isOnline).toBe('boolean')
    })
  })

  describe('配置更新', () => {
    it('应该更新客户端配置', () => {
      const newConfig = {
        baseURL: 'http://localhost:4000/api/v2',
        timeout: 8000
      }

      apiClient.updateConfig(newConfig)

      expect(mockAxiosInstance.defaults.baseURL).toBe('http://localhost:4000/api/v2')
      expect(mockAxiosInstance.defaults.timeout).toBe(8000)
    })
  })
})