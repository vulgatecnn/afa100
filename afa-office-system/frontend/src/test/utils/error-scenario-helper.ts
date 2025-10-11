/**
 * 错误场景测试工具 - 用于测试各种错误情况和边界条件
 */

import { FrontendApiTestHelper } from './api-test-helper'

/**
 * 错误场景类型
 */
export enum ErrorScenarioType {
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  VALIDATION_ERROR = 'validation_error',
  PERMISSION_ERROR = 'permission_error',
  SERVER_ERROR = 'server_error',
  CLIENT_ERROR = 'client_error',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * 错误场景定义
 */
interface ErrorScenario {
  type: ErrorScenarioType
  description: string
  setup: () => void | Promise<void>
  trigger: () => void | Promise<void>
  expectedBehavior: () => void | Promise<void>
  cleanup?: () => void | Promise<void>
}

/**
 * 网络错误场景
 */
interface NetworkErrorScenario {
  statusCode: number
  responseData?: any
  delay?: number
  description: string
}

/**
 * 表单验证错误场景
 */
interface ValidationErrorScenario {
  fieldName: string
  invalidValue: any
  expectedErrorMessage: string
  description: string
}

/**
 * 错误场景测试辅助类
 */
export class ErrorScenarioHelper {
  /**
   * 创建网络错误场景
   */
  static createNetworkErrorScenarios(): NetworkErrorScenario[] {
    return [
      {
        statusCode: 400,
        responseData: { success: false, message: '请求参数错误' },
        description: '400 - 请求参数错误'
      },
      {
        statusCode: 401,
        responseData: { success: false, message: '未授权访问' },
        description: '401 - 未授权访问'
      },
      {
        statusCode: 403,
        responseData: { success: false, message: '权限不足' },
        description: '403 - 权限不足'
      },
      {
        statusCode: 404,
        responseData: { success: false, message: '资源不存在' },
        description: '404 - 资源不存在'
      },
      {
        statusCode: 500,
        responseData: { success: false, message: '服务器内部错误' },
        description: '500 - 服务器内部错误'
      },
      {
        statusCode: 502,
        responseData: { success: false, message: '网关错误' },
        description: '502 - 网关错误'
      },
      {
        statusCode: 503,
        responseData: { success: false, message: '服务不可用' },
        description: '503 - 服务不可用'
      },
      {
        statusCode: 504,
        responseData: { success: false, message: '网关超时' },
        description: '504 - 网关超时'
      }
    ]
  }

  /**
   * 创建表单验证错误场景
   */
  static createValidationErrorScenarios(): ValidationErrorScenario[] {
    return [
      {
        fieldName: 'email',
        invalidValue: 'invalid-email',
        expectedErrorMessage: '请输入有效的邮箱地址',
        description: '邮箱格式验证'
      },
      {
        fieldName: 'phone',
        invalidValue: '123',
        expectedErrorMessage: '请输入有效的手机号码',
        description: '手机号格式验证'
      },
      {
        fieldName: 'password',
        invalidValue: '123',
        expectedErrorMessage: '密码长度至少6位',
        description: '密码长度验证'
      },
      {
        fieldName: 'name',
        invalidValue: '',
        expectedErrorMessage: '姓名不能为空',
        description: '必填字段验证'
      },
      {
        fieldName: 'age',
        invalidValue: -1,
        expectedErrorMessage: '年龄必须大于0',
        description: '数值范围验证'
      }
    ]
  }

  /**
   * 测试网络错误场景
   */
  static async testNetworkErrorScenarios(
    apiCall: () => Promise<any>,
    errorHandler: (error: any) => void | Promise<void>
  ): Promise<void> {
    const scenarios = this.createNetworkErrorScenarios()

    for (const scenario of scenarios) {
      describe(`网络错误场景: ${scenario.description}`, () => {
        it('应该正确处理错误', async () => {
          // 设置Mock响应
          FrontendApiTestHelper.mockErrorResponse(
            scenario.statusCode,
            scenario.responseData
          )

          try {
            await apiCall()
            // 如果没有抛出错误，测试失败
            expect(true).toBe(false)
          } catch (error) {
            await errorHandler(error)
          }
        })
      })
    }
  }

  /**
   * 测试表单验证错误场景
   */
  static async testValidationErrorScenarios(
    formComponent: any,
    validationScenarios: ValidationErrorScenario[]
  ): Promise<void> {
    for (const scenario of validationScenarios) {
      describe(`表单验证: ${scenario.description}`, () => {
        it('应该显示正确的错误信息', async () => {
          // 模拟用户输入无效值
          await this.simulateFormInput(
            formComponent,
            scenario.fieldName,
            scenario.invalidValue
          )

          // 验证错误信息
          this.expectValidationError(
            formComponent,
            scenario.fieldName,
            scenario.expectedErrorMessage
          )
        })
      })
    }
  }

  /**
   * 创建通用错误场景
   */
  static createErrorScenario(
    type: ErrorScenarioType,
    description: string,
    setup: () => void | Promise<void>,
    trigger: () => void | Promise<void>,
    expectedBehavior: () => void | Promise<void>,
    cleanup?: () => void | Promise<void>
  ): ErrorScenario {
    return {
      type,
      description,
      setup,
      trigger,
      expectedBehavior,
      cleanup
    }
  }

  /**
   * 执行错误场景测试
   */
  static async executeErrorScenario(scenario: ErrorScenario): Promise<void> {
    try {
      // 设置场景
      await scenario.setup()

      // 触发错误
      await scenario.trigger()

      // 验证预期行为
      await scenario.expectedBehavior()

      console.log(`✓ 错误场景测试通过: ${scenario.description}`)
    } catch (error) {
      console.error(`✗ 错误场景测试失败: ${scenario.description}`, error)
      throw error
    } finally {
      // 清理
      if (scenario.cleanup) {
        await scenario.cleanup()
      }
    }
  }

  /**
   * 批量执行错误场景测试
   */
  static async executeErrorScenarios(scenarios: ErrorScenario[]): Promise<void> {
    for (const scenario of scenarios) {
      await this.executeErrorScenario(scenario)
    }
  }

  /**
   * 模拟网络超时
   */
  static mockNetworkTimeout(timeoutMs = 5000): void {
    FrontendApiTestHelper.mockNetworkTimeout(timeoutMs)
  }

  /**
   * 模拟网络断开
   */
  static mockNetworkDisconnection(): void {
    FrontendApiTestHelper.mockNetworkError('Network Error')
  }

  /**
   * 模拟服务器错误
   */
  static mockServerError(statusCode = 500, message = '服务器内部错误'): void {
    FrontendApiTestHelper.mockErrorResponse(statusCode, {
      success: false,
      message,
      code: statusCode
    })
  }

  /**
   * 模拟权限错误
   */
  static mockPermissionError(): void {
    FrontendApiTestHelper.mockErrorResponse(403, {
      success: false,
      message: '权限不足',
      code: 403
    })
  }

  /**
   * 模拟认证错误
   */
  static mockAuthenticationError(): void {
    FrontendApiTestHelper.mockErrorResponse(401, {
      success: false,
      message: '未授权访问',
      code: 401
    })
  }

  /**
   * 模拟表单输入
   */
  private static async simulateFormInput(
    formComponent: any,
    fieldName: string,
    value: any
  ): Promise<void> {
    const input = formComponent.querySelector(`[name="${fieldName}"]`) ||
                  formComponent.querySelector(`[data-testid="${fieldName}"]`)

    if (input) {
      input.value = value
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      input.dispatchEvent(new Event('blur', { bubbles: true }))
    }
  }

  /**
   * 验证表单验证错误
   */
  private static expectValidationError(
    formComponent: any,
    fieldName: string,
    expectedMessage: string
  ): void {
    const errorElement = formComponent.querySelector(
      `[data-testid="${fieldName}-error"]`
    ) || formComponent.querySelector(
      `.ant-form-item-explain-error`
    )

    expect(errorElement).toBeInTheDocument()
    expect(errorElement.textContent).toContain(expectedMessage)
  }

  /**
   * 创建边界条件测试场景
   */
  static createBoundaryTestScenarios(): Array<{
    name: string
    testData: any
    expectedBehavior: string
  }> {
    return [
      {
        name: '空字符串输入',
        testData: '',
        expectedBehavior: '应该显示必填字段错误'
      },
      {
        name: '空对象输入',
        testData: {},
        expectedBehavior: '应该显示数据格式错误'
      },
      {
        name: '空数组输入',
        testData: [],
        expectedBehavior: '应该显示空列表状态'
      },
      {
        name: 'null值输入',
        testData: null,
        expectedBehavior: '应该显示默认值或错误提示'
      },
      {
        name: 'undefined值输入',
        testData: undefined,
        expectedBehavior: '应该显示默认值或错误提示'
      },
      {
        name: '超长字符串输入',
        testData: 'a'.repeat(1000),
        expectedBehavior: '应该显示字符长度限制错误'
      },
      {
        name: '负数输入',
        testData: -1,
        expectedBehavior: '应该显示数值范围错误'
      },
      {
        name: '超大数值输入',
        testData: Number.MAX_SAFE_INTEGER + 1,
        expectedBehavior: '应该显示数值范围错误'
      }
    ]
  }

  /**
   * 测试边界条件
   */
  static async testBoundaryConditions(
    testFunction: (testData: any) => Promise<void>,
    scenarios = this.createBoundaryTestScenarios()
  ): Promise<void> {
    for (const scenario of scenarios) {
      describe(`边界条件测试: ${scenario.name}`, () => {
        it(scenario.expectedBehavior, async () => {
          await testFunction(scenario.testData)
        })
      })
    }
  }

  /**
   * 创建并发错误场景
   */
  static async testConcurrentErrorScenarios(
    concurrentActions: Array<() => Promise<void>>,
    expectedErrorHandling: () => void | Promise<void>
  ): Promise<void> {
    try {
      // 并发执行所有操作
      await Promise.all(concurrentActions.map(action => action()))
    } catch (error) {
      // 验证错误处理
      await expectedErrorHandling()
    }
  }

  /**
   * 测试内存泄漏场景
   */
  static async testMemoryLeakScenarios(
    setupFunction: () => any,
    cleanupFunction: (resource: any) => void,
    iterations = 100
  ): Promise<void> {
    const resources: any[] = []

    try {
      // 创建大量资源
      for (let i = 0; i < iterations; i++) {
        resources.push(setupFunction())
      }

      // 验证内存使用情况
      const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0

      // 清理资源
      resources.forEach(resource => cleanupFunction(resource))
      resources.length = 0

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc()
      }

      // 验证内存是否释放
      const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0
      const memoryDiff = memoryAfter - memoryBefore

      // 内存增长不应该过大
      expect(memoryDiff).toBeLessThan(1024 * 1024) // 1MB
    } finally {
      // 确保清理所有资源
      resources.forEach(resource => {
        try {
          cleanupFunction(resource)
        } catch (error) {
          console.warn('清理资源时出错:', error)
        }
      })
    }
  }

  /**
   * 创建错误恢复测试场景
   */
  static async testErrorRecoveryScenarios(
    errorAction: () => Promise<void>,
    recoveryAction: () => Promise<void>,
    verifyRecovery: () => void | Promise<void>
  ): Promise<void> {
    // 触发错误
    try {
      await errorAction()
    } catch (error) {
      // 预期的错误，继续执行恢复操作
    }

    // 执行恢复操作
    await recoveryAction()

    // 验证恢复结果
    await verifyRecovery()
  }
}

/**
 * 错误场景测试装饰器
 */
export function withErrorScenarioTesting(
  testFn: (helper: typeof ErrorScenarioHelper) => Promise<void>
) {
  return async () => {
    // 设置错误测试环境
    const originalConsoleError = console.error
    const errorLogs: any[] = []
    
    console.error = (...args) => {
      errorLogs.push(args)
      originalConsoleError(...args)
    }

    try {
      await testFn(ErrorScenarioHelper)
    } finally {
      // 恢复环境
      console.error = originalConsoleError
      
      // 可以在这里验证错误日志
      console.log(`测试期间捕获到 ${errorLogs.length} 个错误日志`)
    }
  }
}

export default ErrorScenarioHelper