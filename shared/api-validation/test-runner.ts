/**
 * API 测试运行器
 * 提供完整的 API 连通性和集成测试执行
 */

import { ApiClient, createApiClient } from '../api-client'
import { ConnectivityTester } from './connectivity-tester'
import { IntegrationTester } from './integration-tester'
import { apiEndpointGroups } from './api-endpoints'

export interface TestRunnerConfig {
  baseURL: string
  timeout?: number
  credentials?: {
    phone: string
    password: string
  }
  skipAuthTests?: boolean
  skipIntegrationTests?: boolean
  includeResponseData?: boolean
  maxConcurrent?: number
  retryCount?: number
}

export interface TestRunnerResult {
  connectivity: any
  integration?: any
  summary: {
    totalTests: number
    successfulTests: number
    failedTests: number
    duration: number
    timestamp: number
  }
}

export class TestRunner {
  private apiClient: ApiClient
  private connectivityTester: ConnectivityTester
  private integrationTester: IntegrationTester
  private config: TestRunnerConfig

  constructor(config: TestRunnerConfig) {
    this.config = config
    this.apiClient = createApiClient({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000
    })
    this.connectivityTester = new ConnectivityTester(this.apiClient)
    this.integrationTester = new IntegrationTester(this.apiClient)
  }

  /**
   * 运行完整的 API 测试套件
   */
  async runFullTestSuite(): Promise<TestRunnerResult> {
    const startTime = Date.now()
    console.log('🚀 开始 API 测试套件...')

    const result: TestRunnerResult = {
      connectivity: null,
      integration: null,
      summary: {
        totalTests: 0,
        successfulTests: 0,
        failedTests: 0,
        duration: 0,
        timestamp: startTime
      }
    }

    try {
      // 1. 基础连通性测试
      console.log('\n📡 执行基础连通性测试...')
      const basicConnectivity = await this.connectivityTester.basicConnectivityTest()
      
      if (!basicConnectivity.success) {
        throw new Error(`基础连通性测试失败: ${basicConnectivity.error}`)
      }
      console.log('✅ 基础连通性测试通过')

      // 2. 健康检查
      console.log('\n🏥 执行健康检查...')
      const healthCheck = await this.connectivityTester.healthCheck()
      
      if (!healthCheck.success) {
        console.warn(`⚠️ 健康检查失败: ${healthCheck.error}`)
      } else {
        console.log('✅ 健康检查通过')
      }

      // 3. 认证流程测试
      let authToken: string | undefined
      if (!this.config.skipAuthTests && this.config.credentials) {
        console.log('\n🔐 执行认证流程测试...')
        const authFlow = await this.connectivityTester.testAuthenticationFlow(this.config.credentials)
        
        if (authFlow.login.success && authFlow.login.response?.token) {
          authToken = authFlow.login.response.token
          this.connectivityTester.setAuthToken(authToken)
          this.integrationTester.setAuthToken(authToken)
          console.log('✅ 认证流程测试通过')
        } else {
          console.warn('⚠️ 认证流程测试失败，将跳过需要认证的测试')
        }
      }

      // 4. 端点连通性测试
      console.log('\n🔗 执行端点连通性测试...')
      const connectivityOptions = {
        skipAuthEndpoints: !authToken,
        includeResponseData: this.config.includeResponseData,
        maxConcurrent: this.config.maxConcurrent,
        retryCount: this.config.retryCount
      }

      result.connectivity = await this.connectivityTester.testMultipleGroups(
        apiEndpointGroups,
        connectivityOptions
      )

      console.log(`📊 连通性测试完成: ${result.connectivity.successfulTests}/${result.connectivity.totalTests} 成功`)

      // 5. 集成测试
      if (!this.config.skipIntegrationTests && authToken) {
        console.log('\n🔄 执行集成测试...')
        
        const integrationTests = [
          this.integrationTester.createAuthenticationFlowTest(this.config.credentials!),
          this.integrationTester.createVisitorApplicationFlowTest(),
          this.integrationTester.createMerchantManagementFlowTest()
        ]

        result.integration = await this.integrationTester.runTestSuite(integrationTests)
        
        const successfulIntegrationTests = result.integration.filter((r: any) => r.success).length
        console.log(`📊 集成测试完成: ${successfulIntegrationTests}/${result.integration.length} 成功`)
      }

      // 6. 汇总结果
      result.summary = this.calculateSummary(result, startTime)

    } catch (error: any) {
      console.error('❌ 测试套件执行失败:', error.message)
      result.summary.duration = Date.now() - startTime
    }

    return result
  }

  /**
   * 运行快速连通性测试
   */
  async runQuickConnectivityTest(): Promise<any> {
    console.log('⚡ 执行快速连通性测试...')

    // 只测试关键端点
    const criticalEndpoints = [
      { name: 'API信息', method: 'GET' as const, path: '/api/v1', requiresAuth: false, description: 'API基本信息' },
      { name: '健康检查', method: 'GET' as const, path: '/api/v1/auth/health', requiresAuth: false, description: '健康检查' }
    ]

    const results = []
    for (const endpoint of criticalEndpoints) {
      const result = await this.connectivityTester.testEndpoint(endpoint)
      results.push(result)
    }

    const successCount = results.filter(r => r.success).length
    console.log(`📊 快速测试完成: ${successCount}/${results.length} 成功`)

    return {
      totalTests: results.length,
      successfulTests: successCount,
      failedTests: results.length - successCount,
      results
    }
  }

  /**
   * 生成测试报告
   */
  generateReport(result: TestRunnerResult): string {
    let report = `
AFA 办公系统 API 测试报告
========================

测试时间: ${new Date(result.summary.timestamp).toLocaleString()}
测试持续时间: ${result.summary.duration}ms
测试服务器: ${this.config.baseURL}

总体概要:
- 总测试数: ${result.summary.totalTests}
- 成功测试: ${result.summary.successfulTests}
- 失败测试: ${result.summary.failedTests}
- 成功率: ${((result.summary.successfulTests / result.summary.totalTests) * 100).toFixed(2)}%

`

    // 连通性测试报告
    if (result.connectivity) {
      report += this.connectivityTester.generateReport(result.connectivity)
    }

    // 集成测试报告
    if (result.integration) {
      report += '\n' + this.integrationTester.generateReport(result.integration)
    }

    return report
  }

  /**
   * 计算测试汇总
   */
  private calculateSummary(result: TestRunnerResult, startTime: number) {
    let totalTests = 0
    let successfulTests = 0

    if (result.connectivity) {
      totalTests += result.connectivity.totalTests
      successfulTests += result.connectivity.successfulTests
    }

    if (result.integration) {
      totalTests += result.integration.length
      successfulTests += result.integration.filter((r: any) => r.success).length
    }

    return {
      totalTests,
      successfulTests,
      failedTests: totalTests - successfulTests,
      duration: Date.now() - startTime,
      timestamp: startTime
    }
  }
}

/**
 * 创建并运行测试
 */
export async function runApiTests(config: TestRunnerConfig): Promise<TestRunnerResult> {
  const runner = new TestRunner(config)
  return runner.runFullTestSuite()
}

/**
 * 快速连通性测试
 */
export async function runQuickTest(baseURL: string): Promise<any> {
  const runner = new TestRunner({ baseURL })
  return runner.runQuickConnectivityTest()
}