/**
 * API 集成测试器
 * 用于测试完整的业务流程和数据交互
 */

import { ApiClient } from '../api-client'
import { ConnectivityTester, ConnectivityTestResult } from './connectivity-tester'
import { ResponseValidator, ValidationResult } from './response-validator'

export interface IntegrationTestCase {
  name: string
  description: string
  steps: IntegrationTestStep[]
  cleanup?: IntegrationTestStep[]
}

export interface IntegrationTestStep {
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  data?: any
  headers?: Record<string, string>
  expectedStatus?: number
  validation?: (response: any) => ValidationResult
  extractData?: (response: any) => Record<string, any>
  skipOnError?: boolean
}

export interface IntegrationTestResult {
  testCase: IntegrationTestCase
  success: boolean
  steps: IntegrationStepResult[]
  extractedData: Record<string, any>
  error?: string
  duration: number
  timestamp: number
}

export interface IntegrationStepResult {
  step: IntegrationTestStep
  success: boolean
  response?: any
  validation?: ValidationResult
  error?: string
  duration: number
}

export class IntegrationTester {
  private apiClient: ApiClient
  private connectivityTester: ConnectivityTester
  private responseValidator: ResponseValidator
  private authToken?: string

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient
    this.connectivityTester = new ConnectivityTester(apiClient)
    this.responseValidator = new ResponseValidator()
  }

  /**
   * 设置认证令牌
   */
  setAuthToken(token: string): void {
    this.authToken = token
    this.connectivityTester.setAuthToken(token)
  }

  /**
   * 执行集成测试用例
   */
  async runTestCase(testCase: IntegrationTestCase): Promise<IntegrationTestResult> {
    const startTime = Date.now()
    const result: IntegrationTestResult = {
      testCase,
      success: false,
      steps: [],
      extractedData: {},
      duration: 0,
      timestamp: startTime
    }

    try {
      console.log(`Running integration test: ${testCase.name}`)

      // 执行测试步骤
      for (const step of testCase.steps) {
        const stepResult = await this.executeStep(step, result.extractedData)
        result.steps.push(stepResult)

        // 如果步骤失败且不跳过错误，停止执行
        if (!stepResult.success && !step.skipOnError) {
          result.error = `Step "${step.name}" failed: ${stepResult.error}`
          break
        }

        // 提取数据供后续步骤使用
        if (stepResult.success && step.extractData && stepResult.response) {
          const extracted = step.extractData(stepResult.response)
          Object.assign(result.extractedData, extracted)
        }
      }

      // 检查所有步骤是否成功
      result.success = result.steps.every(step => step.success || step.step.skipOnError)

      // 执行清理步骤
      if (testCase.cleanup) {
        console.log('Running cleanup steps...')
        for (const cleanupStep of testCase.cleanup) {
          await this.executeStep(cleanupStep, result.extractedData)
        }
      }

    } catch (error: any) {
      result.error = error.message || 'Unknown error'
    } finally {
      result.duration = Date.now() - startTime
    }

    return result
  }

  /**
   * 执行多个测试用例
   */
  async runTestSuite(testCases: IntegrationTestCase[]): Promise<IntegrationTestResult[]> {
    const results: IntegrationTestResult[] = []

    for (const testCase of testCases) {
      const result = await this.runTestCase(testCase)
      results.push(result)

      // 如果测试失败，可以选择继续或停止
      if (!result.success) {
        console.warn(`Test case "${testCase.name}" failed: ${result.error}`)
      }
    }

    return results
  }

  /**
   * 执行单个测试步骤
   */
  private async executeStep(
    step: IntegrationTestStep,
    extractedData: Record<string, any>
  ): Promise<IntegrationStepResult> {
    const startTime = Date.now()
    const result: IntegrationStepResult = {
      step,
      success: false,
      duration: 0
    }

    try {
      console.log(`  Executing step: ${step.name}`)

      // 替换路径中的变量
      const path = this.replacePlaceholders(step.path, extractedData)
      
      // 替换数据中的变量
      const data = step.data ? this.replacePlaceholders(step.data, extractedData) : undefined

      // 准备请求选项
      const options: any = {
        headers: step.headers || {}
      }

      // 执行请求
      let response: any
      const method = step.method.toLowerCase()

      switch (method) {
        case 'get':
          response = await this.apiClient.get(path, options)
          break
        case 'post':
          response = await this.apiClient.post(path, data, options)
          break
        case 'put':
          response = await this.apiClient.put(path, data, options)
          break
        case 'patch':
          response = await this.apiClient.patch(path, data, options)
          break
        case 'delete':
          response = await this.apiClient.delete(path, options)
          break
        default:
          throw new Error(`Unsupported HTTP method: ${step.method}`)
      }

      result.response = response
      result.success = true

      // 执行响应验证
      if (step.validation) {
        result.validation = step.validation(response)
        if (!result.validation.valid) {
          result.success = false
          result.error = 'Response validation failed'
        }
      }

    } catch (error: any) {
      result.success = false
      result.error = error.message || 'Unknown error'
    } finally {
      result.duration = Date.now() - startTime
    }

    return result
  }

  /**
   * 替换字符串中的占位符
   */
  private replacePlaceholders(input: any, data: Record<string, any>): any {
    if (typeof input === 'string') {
      return input.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] !== undefined ? data[key] : match
      })
    }

    if (typeof input === 'object' && input !== null) {
      if (Array.isArray(input)) {
        return input.map(item => this.replacePlaceholders(item, data))
      } else {
        const result: any = {}
        for (const [key, value] of Object.entries(input)) {
          result[key] = this.replacePlaceholders(value, data)
        }
        return result
      }
    }

    return input
  }

  /**
   * 创建用户认证流程测试
   */
  createAuthenticationFlowTest(credentials: any): IntegrationTestCase {
    return {
      name: '用户认证流程测试',
      description: '测试完整的用户登录、获取信息、登出流程',
      steps: [
        {
          name: '用户登录',
          method: 'POST',
          path: '/auth/login',
          data: credentials,
          expectedStatus: 200,
          validation: (response) => this.responseValidator.validateLoginResponse(response),
          extractData: (response) => ({
            token: response.token,
            userId: response.user.id,
            userType: response.user.userType
          })
        },
        {
          name: '获取当前用户信息',
          method: 'GET',
          path: '/auth/me',
          expectedStatus: 200,
          validation: (response) => this.responseValidator.validateUserResponse(response)
        },
        {
          name: '用户登出',
          method: 'POST',
          path: '/auth/logout',
          expectedStatus: 200
        }
      ]
    }
  }

  /**
   * 创建访客申请流程测试
   */
  createVisitorApplicationFlowTest(): IntegrationTestCase {
    return {
      name: '访客申请流程测试',
      description: '测试访客申请、审批、获取通行码的完整流程',
      steps: [
        {
          name: '获取商户列表',
          method: 'GET',
          path: '/visitor/merchants',
          expectedStatus: 200,
          extractData: (response) => ({
            merchantId: response.data?.[0]?.id || 1
          })
        },
        {
          name: '提交访客申请',
          method: 'POST',
          path: '/visitor/apply',
          data: {
            merchantId: '{{merchantId}}',
            purpose: '业务洽谈',
            visitDate: new Date().toISOString().split('T')[0],
            contactPerson: '张三'
          },
          expectedStatus: 201,
          extractData: (response) => ({
            applicationId: response.id
          })
        },
        {
          name: '获取申请详情',
          method: 'GET',
          path: '/visitor/applications/{{applicationId}}',
          expectedStatus: 200
        },
        {
          name: '获取通行码',
          method: 'GET',
          path: '/visitor/passcode/{{applicationId}}',
          expectedStatus: 200,
          skipOnError: true // 可能需要先审批
        }
      ]
    }
  }

  /**
   * 创建商户管理流程测试
   */
  createMerchantManagementFlowTest(): IntegrationTestCase {
    return {
      name: '商户管理流程测试',
      description: '测试商户的创建、查询、更新、删除流程',
      steps: [
        {
          name: '创建商户',
          method: 'POST',
          path: '/merchants',
          data: {
            name: '测试商户',
            code: 'TEST_MERCHANT_' + Date.now(),
            contact: '张三',
            phone: '13800138000',
            email: 'test@example.com'
          },
          expectedStatus: 201,
          extractData: (response) => ({
            merchantId: response.id
          })
        },
        {
          name: '获取商户详情',
          method: 'GET',
          path: '/merchants/{{merchantId}}',
          expectedStatus: 200
        },
        {
          name: '更新商户信息',
          method: 'PUT',
          path: '/merchants/{{merchantId}}',
          data: {
            name: '更新后的商户名称'
          },
          expectedStatus: 200
        },
        {
          name: '获取商户列表',
          method: 'GET',
          path: '/merchants',
          expectedStatus: 200,
          validation: (response) => this.responseValidator.validatePaginatedResponse(response)
        }
      ],
      cleanup: [
        {
          name: '删除测试商户',
          method: 'DELETE',
          path: '/merchants/{{merchantId}}',
          expectedStatus: 200,
          skipOnError: true
        }
      ]
    }
  }

  /**
   * 生成集成测试报告
   */
  generateReport(results: IntegrationTestResult[]): string {
    const totalTests = results.length
    const successfulTests = results.filter(r => r.success).length
    const failedTests = totalTests - successfulTests
    const successRate = (successfulTests / totalTests * 100).toFixed(2)

    let report = `
API 集成测试报告
================

测试概要:
- 总测试用例: ${totalTests}
- 成功用例: ${successfulTests}
- 失败用例: ${failedTests}
- 成功率: ${successRate}%

详细结果:
`

    results.forEach((result, index) => {
      const status = result.success ? '✅ 成功' : '❌ 失败'
      const duration = `${result.duration}ms`
      
      report += `\n${index + 1}. ${result.testCase.name} - ${status} - ${duration}\n`
      
      if (result.error) {
        report += `   错误: ${result.error}\n`
      }

      // 显示步骤详情
      result.steps.forEach((step, stepIndex) => {
        const stepStatus = step.success ? '✅' : '❌'
        report += `   ${stepIndex + 1}. ${step.step.name} ${stepStatus} (${step.duration}ms)\n`
        
        if (step.error) {
          report += `      错误: ${step.error}\n`
        }
        
        if (step.validation && !step.validation.valid) {
          report += `      验证失败: ${step.validation.errors.length} 个错误\n`
        }
      })
    })

    return report
  }
}