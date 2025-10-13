/**
 * 统一的 API 客户端实现
 * 支持 RESTful API 调用、请求拦截器、响应拦截器、错误处理和重试机制
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { ApiError } from './api-error'
import { 
  ApiClientConfig, 
  RequestOptions, 
  ApiResponse, 
  PaginatedResponse,
  NetworkStatus,
  ApiErrorType 
} from './types'

export class ApiClient {
  private axiosInstance: AxiosInstance
  private config: ApiClientConfig
  private networkStatus: NetworkStatus = { isOnline: true, isSlowConnection: false }

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 10000,
      enableTokenRefresh: true,
      ...config
    }

    // 创建 axios 实例
    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers
      }
    })

    // 设置拦截器
    this.setupInterceptors()

    // 监听网络状态
    this.setupNetworkMonitoring()
  }

  /**
   * 设置请求和响应拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // 添加认证 token
        const token = this.getAuthToken()
        if (token && !config.headers?.skipAuth) {
          config.headers = config.headers || {}
          config.headers.Authorization = `Bearer ${token}`
        }

        // 添加请求时间戳
        config.metadata = { startTime: Date.now() }

        // 执行自定义请求拦截器
        if (this.config.interceptors?.onRequest) {
          return this.config.interceptors.onRequest(config)
        }

        return config
      },
      (error) => {
        if (this.config.interceptors?.onRequestError) {
          return this.config.interceptors.onRequestError(error)
        }
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // 记录响应时间
        const startTime = response.config.metadata?.startTime
        if (startTime) {
          const responseTime = Date.now() - startTime
          console.debug(`API 请求耗时: ${responseTime}ms - ${response.config.url}`)
        }

        // 处理标准 API 响应格式
        if (response.data && typeof response.data.success === 'boolean') {
          if (!response.data.success) {
            const errorMessage = response.data.message || '操作失败'
            throw ApiError.serverError(errorMessage, response.status, response)
          }
          // 返回实际数据
          return response.data.data !== undefined ? response.data.data : response.data
        }

        // 执行自定义响应拦截器
        if (this.config.interceptors?.onResponse) {
          return this.config.interceptors.onResponse(response)
        }

        return response.data
      },
      async (error) => {
        // 处理响应错误
        return this.handleResponseError(error)
      }
    )
  }

  /**
   * 处理响应错误
   */
  private async handleResponseError(error: any): Promise<never> {
    // 如果是取消的请求，直接抛出
    if (axios.isCancel(error)) {
      throw error
    }

    let apiError: ApiError

    if (error.response) {
      // HTTP 错误响应
      apiError = ApiError.fromResponse(error.response)
      
      // 处理 401 错误 - token 过期
      if (error.response.status === 401 && this.config.enableTokenRefresh) {
        try {
          await this.refreshToken()
          // 重试原始请求
          return this.axiosInstance.request(error.config)
        } catch (refreshError) {
          // token 刷新失败，执行登出逻辑
          this.handleTokenExpired()
          throw ApiError.authError()
        }
      }
    } else if (error.request) {
      // 网络错误
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        apiError = ApiError.timeoutError(error)
      } else {
        apiError = ApiError.networkError(error)
        this.handleNetworkError(apiError)
      }
    } else {
      // 其他错误
      apiError = new ApiError({
        type: ApiErrorType.UNKNOWN_ERROR,
        message: error.message || '未知错误',
        originalError: error
      })
    }

    // 执行自定义错误拦截器
    if (this.config.interceptors?.onResponseError) {
      return this.config.interceptors.onResponseError(apiError)
    }

    throw apiError
  }

  /**
   * 设置网络状态监听
   */
  private setupNetworkMonitoring(): void {
    if (typeof window !== 'undefined') {
      // 监听在线状态
      window.addEventListener('online', () => {
        this.networkStatus.isOnline = true
      })

      window.addEventListener('offline', () => {
        this.networkStatus.isOnline = false
      })

      // 检测连接类型（如果支持）
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        if (connection) {
          this.networkStatus.connectionType = connection.effectiveType
          this.networkStatus.isSlowConnection = connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g'
        }
      }
    }
  }

  /**
   * 获取认证 token
   */
  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token')
    }
    return null
  }

  /**
   * 刷新 token
   */
  private async refreshToken(): Promise<void> {
    if (!this.config.tokenRefreshEndpoint) {
      throw new Error('Token refresh endpoint not configured')
    }

    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await this.axiosInstance.post(this.config.tokenRefreshEndpoint, {
      refreshToken
    })

    const { token, refreshToken: newRefreshToken } = response.data
    localStorage.setItem('token', token)
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken)
    }
  }

  /**
   * 处理 token 过期
   */
  private handleTokenExpired(): void {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    
    if (this.config.onTokenExpired) {
      this.config.onTokenExpired()
    } else if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  /**
   * 处理网络错误
   */
  private handleNetworkError(error: ApiError): void {
    if (this.config.onNetworkError) {
      this.config.onNetworkError(error)
    }
  }

  /**
   * 重试请求
   */
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    options: RequestOptions = {}
  ): Promise<T> {
    const retryConfig = this.config.retry || { retries: 3, retryDelay: 1000 }
    
    if (options.skipRetry) {
      return requestFn()
    }

    let lastError: any
    
    for (let attempt = 0; attempt <= retryConfig.retries; attempt++) {
      try {
        return await requestFn()
      } catch (error) {
        lastError = error
        
        // 检查是否应该重试
        if (attempt === retryConfig.retries || 
            (error instanceof ApiError && !error.isRetryable()) ||
            (retryConfig.retryCondition && !retryConfig.retryCondition(error))) {
          break
        }

        // 等待后重试
        if (attempt < retryConfig.retries) {
          await new Promise(resolve => setTimeout(resolve, retryConfig.retryDelay * (attempt + 1)))
        }
      }
    }

    throw lastError
  }

  /**
   * GET 请求
   */
  async get<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.retryRequest(async () => {
      const response = await this.axiosInstance.get(endpoint, options)
      return response
    }, options)
  }

  /**
   * POST 请求
   */
  async post<T = any>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.retryRequest(async () => {
      const response = await this.axiosInstance.post(endpoint, data, options)
      return response
    }, options)
  }

  /**
   * PUT 请求
   */
  async put<T = any>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.retryRequest(async () => {
      const response = await this.axiosInstance.put(endpoint, data, options)
      return response
    }, options)
  }

  /**
   * PATCH 请求
   */
  async patch<T = any>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.retryRequest(async () => {
      const response = await this.axiosInstance.patch(endpoint, data, options)
      return response
    }, options)
  }

  /**
   * DELETE 请求
   */
  async delete<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.retryRequest(async () => {
      const response = await this.axiosInstance.delete(endpoint, options)
      return response
    }, options)
  }

  /**
   * 上传文件
   */
  async upload<T = any>(
    endpoint: string, 
    file: File | FormData, 
    options: RequestOptions = {}
  ): Promise<T> {
    const formData = file instanceof FormData ? file : new FormData()
    if (file instanceof File) {
      formData.append('file', file)
    }

    return this.post(endpoint, formData, {
      ...options,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...options.headers
      }
    })
  }

  /**
   * 获取网络状态
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus }
  }

  /**
   * 检查是否在线
   */
  isOnline(): boolean {
    return this.networkStatus.isOnline
  }

  /**
   * 取消所有请求
   */
  cancelAllRequests(): void {
    // 这里可以实现取消所有进行中的请求
    // 需要维护一个请求列表
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // 更新 axios 实例配置
    if (newConfig.baseURL) {
      this.axiosInstance.defaults.baseURL = newConfig.baseURL
    }
    if (newConfig.timeout) {
      this.axiosInstance.defaults.timeout = newConfig.timeout
    }
    if (newConfig.headers) {
      this.axiosInstance.defaults.headers = {
        ...this.axiosInstance.defaults.headers,
        ...newConfig.headers
      }
    }
  }
}