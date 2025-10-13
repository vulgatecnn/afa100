/**
 * API 连通性测试器
 * 用于测试 API 端点的连通性和响应格式
 */

import { ApiClient } from '../api-client'
import { ApiEndpoint, ApiEndpointGroup } from './api-endpoints'

export interface ConnectivityTestResult {
  endpoint: ApiEndpoint
  success: boolean
  status?: number
  responseTime: number
  error?: string
  response?: any
  timestamp: number
}

export interface ConnectivityTestSummary {
  totalTests: number
  successfulTests: number
  failedTests: number
  averageResponseTime: number
  results: ConnectivityTestResult[]
  startTime: number
  endTime: number
  duration: number
}

export interface ConnectivityTestOptions {
  timeout?: number
  skipAuth?: boolean
  skipAuthEndpoints?: boolean
  includeResponseData?: boolean
  maxConcurrent?: number
  retryCount?: number
  retryDelay?: number
}

export class ConnectivityTester {
  private apiClient: ApiClient
  private authToken?: string

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient
  }

  /**
   * 设置认证令牌
   */
  setAuthToken(token: string): void {
    this.authToken = token
  }

  /**
   * 测试单个端点
   */
  async testEndpoint(
    endpoint: ApiEndpoint,
    options: ConnectivityTestOptions = {}
  ): Promise<ConnectivityTestResult> {
    const startTime = Date.now()
    const result: ConnectivityTestResult = {
      endpoint,
      success: false,
      responseTime: 0,
      timestamp: startTime
    }

    try {
      // 检查是否需要跳过认证端点
      if (options.skipAuthEndpoints && endpoint.requiresAuth) {
        result.error = 'Skipped: Authentication required'
        result.responseTime = Date.now() - startTime
        return result
      }

      // 准备请求选项
      const requestOptions: any = {
        timeout: options.timeout || endpoint.timeout || 10000
      }

      // 如果端点需要认证但没有提供 token，跳过测试
      if (endpoint.requiresAuth && !this.authToken && !options.skipAuth) {
        result.error = 'Skipped: No authentication token provided'
        result.responseTime = Date.now() - startTime
        return result
      }

      // 如果跳过认证，添加 skipAuth 标志
      if (options.skipAuth) {
        requestOptions.skipAuth = true
      }

      // 执行请求
      let response: any
      const method = endpoint.method.toLowerCase()
      const path = endpoint.path

      switch (method) {
        case 'get':
          response = await this.apiClient.get(path, requestOptions)
          break
        case 'post':
          response = await this.apiClient.post(path, endpoint.testData, requestOptions)
          break
        case 'put':
          response = await this.apiClient.put(path, endpoint.testData, requestOptions)
          break
        case 'patch':
          response = await this.apiClient.patch(path, endpoint.testData, requestOptions)
          break
        case 'delete':
          response = await this.apiClient.delete(path, requestOptions)
          break
        default:
          throw new Error(`Unsupported HTTP method: ${endpoint.method}`)
      }

      // 记录成功结果
      result.success = true
      result.status = 200 // ApiClient 已经处理了状态码
      result.responseTime = Date.now() - startTime

      if (options.includeResponseData) {
        result.response = response
      }

      // 验证预期状态码
      if (endpoint.expectedStatus && result.status !== endpoint.expectedStatus) {
        result.success = false
        result.error = `Expected status ${endpoint.expectedStatus}, got ${result.status}`
      }

    } catch (error: any) {
      result.success = false
      result.responseTime = Date.now() - startTime
      result.error = error.message || 'Unknown error'
      result.status = error.status || error.response?.status
    }

    return result
  }

  /**
   * 测试端点组
   */
  async testEndpointGroup(
    group: ApiEndpointGroup,
    options: ConnectivityTestOptions = {}
  ): Promise<ConnectivityTestSummary> {
    const startTime = Date.now()
    const results: ConnectivityTestResult[] = []

    // 限制并发数
    const maxConcurrent = options.maxConcurrent || 5
    const chunks = this.chunkArray(group.endpoints, maxConcurrent)

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(endpoint => 
        this.testEndpointWithRetry(endpoint, options)
      )
      
      const chunkResults = await Promise.all(chunkPromises)
      results.push(...chunkResults)
    }

    const endTime = Date.now()
    const successfulTests = results.filter(r => r.success).length
    const failedTests = results.length - successfulTests
    const totalResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0)
    const averageResponseTime = results.length > 0 ? totalResponseTime / results.length : 0

    return {
      totalTests: results.length,
      successfulTests,
      failedTests,
      averageResponseTime,
      results,
      startTime,
      endTime,
      duration: endTime - startTime
    }
  }

  /**
   * 测试多个端点组
   */
  async testMultipleGroups(
    groups: ApiEndpointGroup[],
    options: ConnectivityTestOptions = {}
  ): Promise<ConnectivityTestSummary> {
    const startTime = Date.now()
    const allResults: ConnectivityTestResult[] = []

    for (const group of groups) {
      console.log(`Testing group: ${group.name}`)
      const groupSummary = await this.testEndpointGroup(group, options)
      allResults.push(...groupSummary.results)
    }

    const endTime = Date.now()
    const successfulTests = allResults.filter(r => r.success).length
    const failedTests = allResults.length - successfulTests
    const totalResponseTime = allResults.reduce((sum, r) => sum + r.responseTime, 0)
    const averageResponseTime = allResults.length > 0 ? totalResponseTime / allResults.length : 0

    return {
      totalTests: allResults.length,
      successfulTests,
      failedTests,
      averageResponseTime,
      results: allResults,
      startTime,
      endTime,
      duration: endTime - startTime
    }
  }

  /**
   * 带重试的端点测试
   */
  private async testEndpointWithRetry(
    endpoint: ApiEndpoint,
    options: ConnectivityTestOptions
  ): Promise<ConnectivityTestResult> {
    const retryCount = options.retryCount || 0
    const retryDelay = options.retryDelay || 1000

    let lastResult: ConnectivityTestResult | null = null

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      if (attempt > 0) {
        console.log(`Retrying ${endpoint.name} (attempt ${attempt + 1}/${retryCount + 1})`)
        await this.delay(retryDelay)
      }

      const result = await this.testEndpoint(endpoint, options)
      
      if (result.success) {
        return result
      }

      lastResult = result
    }

    return lastResult!
  }

  /**
   * 健康检查测试
   */
  async healthCheck(): Promise<ConnectivityTestResult> {
    const healthEndpoint: ApiEndpoint = {
      name: 'Health Check',
      method: 'GET',
      path: '/api/v1/auth/health',
      requiresAuth: false,
      description: 'API health check',
      expectedStatus: 200
    }

    return this.testEndpoint(healthEndpoint)
  }

  /**
   * 基础连通性测试
   */
  async basicConnectivityTest(): Promise<ConnectivityTestResult> {
    const basicEndpoint: ApiEndpoint = {
      name: 'Basic Connectivity',
      method: 'GET',
      path: '/api/v1',
      requiresAuth: false,
      description: 'Basic API connectivity test',
      expectedStatus: 200
    }

    return this.testEndpoint(basicEndpoint)
  }

  /**
   * 认证流程测试
   */
  async testAuthenticationFlow(credentials: any): Promise<{
    login: ConnectivityTestResult
    getCurrentUser: ConnectivityTestResult
    logout: ConnectivityTestResult
  }> {
    // 登录测试
    const loginEndpoint: ApiEndpoint = {
      name: 'Login Test',
      method: 'POST',
      path: '/auth/login',
      requiresAuth: false,
      description: 'Test user login',
      testData: credentials,
      expectedStatus: 200
    }

    const loginResult = await this.testEndpoint(loginEndpoint)
    
    // 如果登录成功，提取 token
    if (loginResult.success && loginResult.response?.token) {
      this.setAuthToken(loginResult.response.token)
    }

    // 获取用户信息测试
    const getUserEndpoint: ApiEndpoint = {
      name: 'Get Current User',
      method: 'GET',
      path: '/auth/me',
      requiresAuth: true,
      description: 'Get current user info',
      expectedStatus: 200
    }

    const getUserResult = await this.testEndpoint(getUserEndpoint)

    // 登出测试
    const logoutEndpoint: ApiEndpoint = {
      name: 'Logout Test',
      method: 'POST',
      path: '/auth/logout',
      requiresAuth: true,
      description: 'Test user logout',
      expectedStatus: 200
    }

    const logoutResult = await this.testEndpoint(logoutEndpoint)

    return {
      login: loginResult,
      getCurrentUser: getUserResult,
      logout: logoutResult
    }
  }

  /**
   * 生成测试报告
   */
  generateReport(summary: ConnectivityTestSummary): string {
    const successRate = (summary.successfulTests / summary.totalTests * 100).toFixed(2)
    
    let report = `
API 连通性测试报告
==================

测试概要:
- 总测试数: ${summary.totalTests}
- 成功测试: ${summary.successfulTests}
- 失败测试: ${summary.failedTests}
- 成功率: ${successRate}%
- 平均响应时间: ${summary.averageResponseTime.toFixed(2)}ms
- 测试持续时间: ${summary.duration}ms

详细结果:
`

    summary.results.forEach((result, index) => {
      const status = result.success ? '✅ 成功' : '❌ 失败'
      const responseTime = `${result.responseTime}ms`
      const error = result.error ? ` (${result.error})` : ''
      
      report += `${index + 1}. ${result.endpoint.name} - ${status} - ${responseTime}${error}\n`
    })

    if (summary.failedTests > 0) {
      report += `\n失败的测试详情:\n`
      summary.results
        .filter(r => !r.success)
        .forEach((result, index) => {
          report += `${index + 1}. ${result.endpoint.name}:\n`
          report += `   路径: ${result.endpoint.method} ${result.endpoint.path}\n`
          report += `   错误: ${result.error}\n`
          if (result.status) {
            report += `   状态码: ${result.status}\n`
          }
          report += `\n`
        })
    }

    return report
  }

  /**
   * 数组分块工具
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  /**
   * 延迟工具
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}