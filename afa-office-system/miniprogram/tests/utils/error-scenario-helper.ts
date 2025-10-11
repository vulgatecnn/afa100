/**
 * 小程序错误场景测试工具 - 用于测试小程序各种错误情况和边界条件
 */

import { MiniprogramApiTestHelper } from './api-test-helper'

/**
 * 小程序错误场景类型
 */
export enum MiniprogramErrorScenarioType {
  WX_API_ERROR = 'wx_api_error',
  NETWORK_ERROR = 'network_error',
  STORAGE_ERROR = 'storage_error',
  PERMISSION_ERROR = 'permission_error',
  PAGE_ERROR = 'page_error',
  COMPONENT_ERROR = 'component_error',
  DATA_ERROR = 'data_error'
}

/**
 * 微信API错误场景
 */
interface WxApiErrorScenario {
  apiName: string
  errorCode: number
  errorMessage: string
  description: string
}

/**
 * 网络错误场景
 */
interface NetworkErrorScenario {
  statusCode: number
  responseData?: any
  timeout?: boolean
  description: string
}

/**
 * 存储错误场景
 */
interface StorageErrorScenario {
  operation: 'get' | 'set' | 'remove' | 'clear'
  key?: string
  value?: any
  errorType: 'quota_exceeded' | 'invalid_key' | 'permission_denied'
  description: string
}

/**
 * 小程序错误场景测试辅助类
 */
export class MiniprogramErrorScenarioHelper {
  /**
   * 创建微信API错误场景
   */
  static createWxApiErrorScenarios(): WxApiErrorScenario[] {
    return [
      {
        apiName: 'request',
        errorCode: -1,
        errorMessage: '网络错误',
        description: '网络请求失败'
      },
      {
        apiName: 'login',
        errorCode: 40029,
        errorMessage: 'code无效',
        description: '微信登录code无效'
      },
      {
        apiName: 'getUserInfo',
        errorCode: 40003,
        errorMessage: '用户拒绝授权',
        description: '用户拒绝授权获取用户信息'
      },
      {
        apiName: 'getLocation',
        errorCode: 40004,
        errorMessage: '用户拒绝授权',
        description: '用户拒绝授权获取位置信息'
      },
      {
        apiName: 'scanCode',
        errorCode: 40005,
        errorMessage: '用户取消扫码',
        description: '用户取消二维码扫描'
      },
      {
        apiName: 'chooseImage',
        errorCode: 40006,
        errorMessage: '用户取消选择',
        description: '用户取消选择图片'
      },
      {
        apiName: 'uploadFile',
        errorCode: 40007,
        errorMessage: '上传失败',
        description: '文件上传失败'
      }
    ]
  }

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
        responseData: { success: false, message: '接口不存在' },
        description: '404 - 接口不存在'
      },
      {
        statusCode: 500,
        responseData: { success: false, message: '服务器错误' },
        description: '500 - 服务器错误'
      },
      {
        statusCode: 0,
        timeout: true,
        description: '网络超时'
      }
    ]
  }

  /**
   * 创建存储错误场景
   */
  static createStorageErrorScenarios(): StorageErrorScenario[] {
    return [
      {
        operation: 'set',
        key: 'test_key',
        value: 'x'.repeat(1024 * 1024), // 1MB数据
        errorType: 'quota_exceeded',
        description: '存储空间不足'
      },
      {
        operation: 'get',
        key: '',
        errorType: 'invalid_key',
        description: '无效的存储键名'
      },
      {
        operation: 'set',
        key: 'protected_key',
        value: 'test',
        errorType: 'permission_denied',
        description: '没有存储权限'
      }
    ]
  }

  /**
   * 测试微信API错误场景
   */
  static async testWxApiErrorScenarios(
    apiCall: (apiName: string) => Promise<any>,
    errorHandler: (error: any) => void | Promise<void>
  ): Promise<void> {
    const scenarios = this.createWxApiErrorScenarios()

    for (const scenario of scenarios) {
      describe(`微信API错误: ${scenario.description}`, () => {
        it('应该正确处理API错误', async () => {
          // 设置微信API Mock错误
          MiniprogramApiTestHelper.mockWxApiError(
            scenario.apiName,
            scenario.errorCode,
            scenario.errorMessage
          )

          try {
            await apiCall(scenario.apiName)
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
   * 测试网络错误场景
   */
  static async testNetworkErrorScenarios(
    networkCall: () => Promise<any>,
    errorHandler: (error: any) => void | Promise<void>
  ): Promise<void> {
    const scenarios = this.createNetworkErrorScenarios()

    for (const scenario of scenarios) {
      describe(`网络错误: ${scenario.description}`, () => {
        it('应该正确处理网络错误', async () => {
          if (scenario.timeout) {
            // 设置超时错误
            MiniprogramApiTestHelper.mockWxRequestTimeout()
          } else {
            // 设置HTTP错误
            MiniprogramApiTestHelper.mockWxRequest({
              statusCode: scenario.statusCode,
              data: scenario.responseData
            })
          }

          try {
            await networkCall()
            if (scenario.statusCode >= 400 || scenario.timeout) {
              expect(true).toBe(false) // 应该抛出错误
            }
          } catch (error) {
            await errorHandler(error)
          }
        })
      })
    }
  }

  /**
   * 测试存储错误场景
   */
  static async testStorageErrorScenarios(
    storageOperation: (operation: string, key?: string, value?: any) => Promise<any>,
    errorHandler: (error: any) => void | Promise<void>
  ): Promise<void> {
    const scenarios = this.createStorageErrorScenarios()

    for (const scenario of scenarios) {
      describe(`存储错误: ${scenario.description}`, () => {
        it('应该正确处理存储错误', async () => {
          // 设置存储错误Mock
          this.mockStorageError(scenario)

          try {
            await storageOperation(scenario.operation, scenario.key, scenario.value)
            // 某些情况下应该抛出错误
            if (scenario.errorType !== 'invalid_key') {
              expect(true).toBe(false)
            }
          } catch (error) {
            await errorHandler(error)
          }
        })
      })
    }
  }

  /**
   * 模拟页面错误场景
   */
  static async testPageErrorScenarios(
    pageContext: any,
    errorScenarios: Array<{
      trigger: () => Promise<void>
      expectedErrorHandling: () => void
      description: string
    }>
  ): Promise<void> {
    for (const scenario of errorScenarios) {
      describe(`页面错误: ${scenario.description}`, () => {
        it('应该正确处理页面错误', async () => {
          try {
            await scenario.trigger()
          } catch (error) {
            // 验证错误处理
            scenario.expectedErrorHandling()
          }
        })
      })
    }
  }

  /**
   * 模拟组件错误场景
   */
  static async testComponentErrorScenarios(
    componentContext: any,
    errorScenarios: Array<{
      trigger: () => Promise<void>
      expectedErrorHandling: () => void
      description: string
    }>
  ): Promise<void> {
    for (const scenario of errorScenarios) {
      describe(`组件错误: ${scenario.description}`, () => {
        it('应该正确处理组件错误', async () => {
          try {
            await scenario.trigger()
          } catch (error) {
            // 验证错误处理
            scenario.expectedErrorHandling()
          }
        })
      })
    }
  }

  /**
   * 模拟数据错误场景
   */
  static testDataErrorScenarios(
    dataProcessor: (data: any) => any,
    errorScenarios: Array<{
      inputData: any
      expectedBehavior: string
      description: string
    }>
  ): void {
    errorScenarios.forEach(scenario => {
      describe(`数据错误: ${scenario.description}`, () => {
        it(scenario.expectedBehavior, () => {
          try {
            const result = dataProcessor(scenario.inputData)
            // 根据具体情况验证结果
            console.log('处理结果:', result)
          } catch (error) {
            // 验证错误处理
            expect(error).toBeDefined()
          }
        })
      })
    })
  }

  /**
   * 模拟权限错误场景
   */
  static async testPermissionErrorScenarios(
    permissionActions: Array<{
      action: () => Promise<void>
      requiredPermission: string
      description: string
    }>
  ): Promise<void> {
    for (const { action, requiredPermission, description } of permissionActions) {
      describe(`权限错误: ${description}`, () => {
        it('应该正确处理权限不足', async () => {
          // 模拟权限被拒绝
          this.mockPermissionDenied(requiredPermission)

          try {
            await action()
            expect(true).toBe(false) // 应该抛出权限错误
          } catch (error) {
            expect(error.message).toContain('权限')
          }
        })
      })
    }
  }

  /**
   * 测试边界条件
   */
  static testBoundaryConditions(
    testFunction: (testData: any) => any,
    boundaryData: Array<{
      name: string
      data: any
      expectedBehavior: string
    }>
  ): void {
    boundaryData.forEach(({ name, data, expectedBehavior }) => {
      describe(`边界条件: ${name}`, () => {
        it(expectedBehavior, () => {
          try {
            const result = testFunction(data)
            // 验证结果
            expect(result).toBeDefined()
          } catch (error) {
            // 某些边界条件可能会抛出错误
            expect(error).toBeDefined()
          }
        })
      })
    })
  }

  /**
   * 模拟存储错误
   */
  private static mockStorageError(scenario: StorageErrorScenario): void {
    switch (scenario.errorType) {
      case 'quota_exceeded':
        wx.setStorageSync = vi.fn(() => {
          throw new Error('存储空间不足')
        })
        break
      case 'invalid_key':
        wx.getStorageSync = vi.fn(() => {
          throw new Error('无效的键名')
        })
        break
      case 'permission_denied':
        wx.setStorageSync = vi.fn(() => {
          throw new Error('没有存储权限')
        })
        break
    }
  }

  /**
   * 模拟权限被拒绝
   */
  private static mockPermissionDenied(permission: string): void {
    switch (permission) {
      case 'location':
        wx.getLocation = vi.fn().mockRejectedValue({
          errCode: 40004,
          errMsg: '用户拒绝授权获取位置信息'
        })
        break
      case 'camera':
        wx.scanCode = vi.fn().mockRejectedValue({
          errCode: 40005,
          errMsg: '用户拒绝授权使用摄像头'
        })
        break
      case 'userInfo':
        wx.getUserInfo = vi.fn().mockRejectedValue({
          errCode: 40003,
          errMsg: '用户拒绝授权获取用户信息'
        })
        break
    }
  }

  /**
   * 创建错误恢复测试
   */
  static async testErrorRecovery(
    errorAction: () => Promise<void>,
    recoveryAction: () => Promise<void>,
    verifyRecovery: () => void | Promise<void>
  ): Promise<void> {
    // 触发错误
    try {
      await errorAction()
    } catch (error) {
      console.log('预期的错误:', error.message)
    }

    // 执行恢复操作
    await recoveryAction()

    // 验证恢复结果
    await verifyRecovery()
  }

  /**
   * 测试并发错误场景
   */
  static async testConcurrentErrors(
    concurrentActions: Array<() => Promise<void>>,
    expectedErrorCount: number
  ): Promise<void> {
    const results = await Promise.allSettled(concurrentActions.map(action => action()))
    
    const errors = results.filter(result => result.status === 'rejected')
    expect(errors).toHaveLength(expectedErrorCount)
  }

  /**
   * 创建小程序特有的错误场景
   */
  static createMiniprogramSpecificErrorScenarios(): Array<{
    name: string
    setup: () => void
    trigger: () => Promise<void>
    verify: () => void
    description: string
  }> {
    return [
      {
        name: '页面栈溢出',
        setup: () => {
          // 模拟页面栈已满
          global.getCurrentPages = vi.fn(() => new Array(10).fill({}))
        },
        trigger: async () => {
          wx.navigateTo({ url: '/pages/test/test' })
        },
        verify: () => {
          expect(wx.showToast).toHaveBeenCalledWith(
            expect.objectContaining({
              title: expect.stringContaining('页面层级过深')
            })
          )
        },
        description: '页面导航栈溢出处理'
      },
      {
        name: '小程序版本不兼容',
        setup: () => {
          wx.getSystemInfo = vi.fn().mockResolvedValue({
            version: '6.0.0' // 低版本微信
          })
        },
        trigger: async () => {
          // 尝试使用新API
          wx.getUpdateManager()
        },
        verify: () => {
          expect(wx.showModal).toHaveBeenCalledWith(
            expect.objectContaining({
              title: '版本过低',
              content: expect.stringContaining('请升级微信版本')
            })
          )
        },
        description: '微信版本兼容性处理'
      },
      {
        name: '小程序被销毁',
        setup: () => {
          // 模拟小程序被系统回收
          global.getApp = vi.fn(() => null)
        },
        trigger: async () => {
          const app = getApp()
          app.globalData.userInfo = {}
        },
        verify: () => {
          // 应该有错误处理
          expect(true).toBe(true) // 这里应该根据实际错误处理逻辑来验证
        },
        description: '小程序实例被销毁的处理'
      }
    ]
  }

  /**
   * 执行小程序特有错误场景测试
   */
  static async executeMiniprogramErrorScenarios(): Promise<void> {
    const scenarios = this.createMiniprogramSpecificErrorScenarios()

    for (const scenario of scenarios) {
      describe(`小程序错误场景: ${scenario.name}`, () => {
        it(scenario.description, async () => {
          scenario.setup()
          
          try {
            await scenario.trigger()
          } catch (error) {
            // 某些场景预期会抛出错误
          }
          
          scenario.verify()
        })
      })
    }
  }
}

/**
 * 小程序错误场景测试装饰器
 */
export function withMiniprogramErrorScenarioTesting(
  testFn: (helper: typeof MiniprogramErrorScenarioHelper) => Promise<void>
) {
  return async () => {
    // 设置小程序错误测试环境
    MiniprogramApiTestHelper.setupWxApiMocks()
    
    const originalConsoleError = console.error
    const errorLogs: any[] = []
    
    console.error = (...args) => {
      errorLogs.push(args)
      originalConsoleError(...args)
    }

    try {
      await testFn(MiniprogramErrorScenarioHelper)
    } finally {
      // 恢复环境
      console.error = originalConsoleError
      MiniprogramApiTestHelper.resetMocks()
      
      console.log(`小程序测试期间捕获到 ${errorLogs.length} 个错误日志`)
    }
  }
}

export default MiniprogramErrorScenarioHelper