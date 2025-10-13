/**
 * API 客户端工具函数
 */

import { ApiClient } from './api-client'
import { ApiClientConfig } from './types'

/**
 * 创建默认的 API 客户端配置
 */
export function createDefaultConfig(baseURL: string): ApiClientConfig {
  return {
    baseURL,
    timeout: 10000,
    retry: {
      retries: 3,
      retryDelay: 1000,
      retryCondition: (error: any) => {
        // 只重试网络错误和 5xx 服务器错误
        return !error.response || (error.response.status >= 500)
      }
    },
    enableTokenRefresh: true,
    tokenRefreshEndpoint: '/auth/refresh',
    headers: {
      'Content-Type': 'application/json'
    }
  }
}

/**
 * 创建 API 客户端实例
 */
export function createApiClient(config: Partial<ApiClientConfig> = {}): ApiClient {
  const defaultConfig = createDefaultConfig(config.baseURL || '/api/v1')
  const finalConfig = { ...defaultConfig, ...config }
  
  return new ApiClient(finalConfig)
}

/**
 * 格式化查询参数
 */
export function formatQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)))
      } else {
        searchParams.append(key, String(value))
      }
    }
  })
  
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

/**
 * 构建分页查询参数
 */
export function buildPaginationParams(page: number, pageSize: number, additionalParams: Record<string, any> = {}) {
  return {
    page,
    pageSize,
    ...additionalParams
  }
}

/**
 * 检查是否为有效的 URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 合并 URL 路径
 */
export function joinUrlPaths(...paths: string[]): string {
  return paths
    .map(path => path.replace(/^\/+|\/+$/g, ''))
    .filter(path => path.length > 0)
    .join('/')
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 创建取消令牌
 */
export function createCancelToken() {
  const controller = new AbortController()
  return {
    token: controller.signal,
    cancel: (reason?: string) => controller.abort(reason)
  }
}

/**
 * 检查错误是否为网络错误
 */
export function isNetworkError(error: any): boolean {
  return !error.response && error.request
}

/**
 * 检查错误是否为超时错误
 */
export function isTimeoutError(error: any): boolean {
  return error.code === 'ECONNABORTED' || error.message?.includes('timeout')
}

/**
 * 获取错误状态码
 */
export function getErrorStatus(error: any): number | undefined {
  return error.response?.status
}

/**
 * 获取错误消息
 */
export function getErrorMessage(error: any): string {
  if (error.response?.data?.message) {
    return error.response.data.message
  }
  if (error.message) {
    return error.message
  }
  return '未知错误'
}