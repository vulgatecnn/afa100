/**
 * API 客户端类型定义
 */

import { AxiosRequestConfig, AxiosResponse } from 'axios'

// API 响应标准格式
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message: string
  timestamp: string
  code?: number
}

// 分页响应格式
export interface PaginatedResponse<T = any> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages?: number
  }
}

// 重试配置
export interface RetryConfig {
  retries: number
  retryDelay: number
  retryCondition?: (error: any) => boolean
}

// 拦截器配置
export interface InterceptorConfig {
  onRequest?: (config: AxiosRequestConfig) => AxiosRequestConfig | Promise<AxiosRequestConfig>
  onRequestError?: (error: any) => any
  onResponse?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>
  onResponseError?: (error: any) => any
}

// API 客户端配置
export interface ApiClientConfig {
  baseURL: string
  timeout?: number
  headers?: Record<string, string>
  retry?: RetryConfig
  interceptors?: InterceptorConfig
  enableTokenRefresh?: boolean
  tokenRefreshEndpoint?: string
  onTokenExpired?: () => void
  onNetworkError?: (error: any) => void
}

// 请求选项
export interface RequestOptions extends Omit<AxiosRequestConfig, 'url' | 'method'> {
  skipAuth?: boolean
  skipRetry?: boolean
  skipErrorHandling?: boolean
}

// 网络状态
export interface NetworkStatus {
  isOnline: boolean
  isSlowConnection: boolean
  connectionType?: string
}

// 错误类型
export enum ApiErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// API 错误详情
export interface ApiErrorDetails {
  type: ApiErrorType
  status?: number
  code?: string | number
  message: string
  originalError?: any
  retryable?: boolean
}