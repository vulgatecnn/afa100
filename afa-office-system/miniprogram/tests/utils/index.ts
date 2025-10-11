/**
 * 小程序测试工具统一导出 - MySQL后端兼容版本
 */

// API测试工具
export { MiniprogramApiTestHelper } from './api-test-helper'
export type { MySQLApiResponse, WxApiResponse } from './api-test-helper'

// 页面测试工具
export { PageTestHelper, withPageTestEnvironment } from './page-test-helper'

// 组件测试工具
export { ComponentTestHelper, withComponentTestEnvironment } from './component-test-helper'

// 错误场景测试工具
export { 
  MiniprogramErrorScenarioHelper, 
  MiniprogramErrorScenarioType, 
  withMiniprogramErrorScenarioTesting 
} from './error-scenario-helper'

// 错误处理工具
export {
  TestErrorHandler,
  TestError,
  TestErrorType,
  createTestContext,
  withErrorHandling,
  catchTestError,
  catchTestErrorSync
} from '../../../shared/test-helpers/error-handler'

/**
 * 小程序测试工具类
 */
export class MiniprogramTestUtils {
  /**
   * 设置全局小程序环境
   */
  static setupGlobalEnvironment() {
    // 设置微信API Mock
    MiniprogramApiTestHelper.setupWxApiMocks()
    
    // 设置全局App和Page构造函数
    global.App = vi.fn((options: any) => {
      console.log('App created with options:', options)
      return options
    })
    
    global.Page = vi.fn((options: any) => {
      console.log('Page created with options:', options)
      return options
    })
    
    global.Component = vi.fn((options: any) => {
      console.log('Component created with options:', options)
      return options
    })
    
    global.getApp = vi.fn(() => ({
      globalData: {
        userInfo: null,
        token: null
      }
    }))
    
    global.getCurrentPages = vi.fn(() => [])
  }

  /**
   * 清理全局环境
   */
  static cleanupGlobalEnvironment() {
    MiniprogramApiTestHelper.resetMocks()
    
    delete global.wx
    delete global.App
    delete global.Page
    delete global.Component
    delete global.getApp
    delete global.getCurrentPages
  }

  /**
   * 模拟页面生命周期
   */
  static async simulatePageLifecycle(
    pageContext: any,
    lifecycle: 'onLoad' | 'onShow' | 'onHide' | 'onUnload',
    options?: any
  ) {
    if (typeof pageContext[lifecycle] === 'function') {
      await pageContext[lifecycle](options)
    }
  }

  /**
   * 模拟组件生命周期
   */
  static async simulateComponentLifecycle(
    componentContext: any,
    lifecycle: 'created' | 'attached' | 'ready' | 'detached'
  ) {
    if (typeof componentContext[lifecycle] === 'function') {
      await componentContext[lifecycle]()
    }
  }

  /**
   * 验证页面数据
   */
  static expectPageData(pageContext: any, expectedData: any) {
    Object.entries(expectedData).forEach(([key, value]) => {
      expect(pageContext.data[key]).toEqual(value)
    })
  }

  /**
   * 验证组件属性
   */
  static expectComponentProperties(componentContext: any, expectedProperties: any) {
    Object.entries(expectedProperties).forEach(([key, value]) => {
      expect(componentContext.properties[key]).toEqual(value)
    })
  }

  /**
   * 模拟用户交互
   */
  static async simulateUserInteraction(
    context: any,
    eventName: string,
    eventData?: any
  ) {
    const eventHandler = context[eventName]
    if (typeof eventHandler === 'function') {
      const mockEvent = {
        type: eventName,
        target: { dataset: {} },
        currentTarget: { dataset: {} },
        detail: eventData || {},
        ...eventData
      }
      await eventHandler(mockEvent)
    }
  }

  /**
   * 验证微信API调用
   */
  static expectWxApiCall(apiName: string, expectedOptions?: any) {
    expect(wx[apiName]).toHaveBeenCalled()
    
    if (expectedOptions) {
      expect(wx[apiName]).toHaveBeenCalledWith(
        expect.objectContaining(expectedOptions)
      )
    }
  }

  /**
   * 验证页面跳转
   */
  static expectPageNavigation(url: string, navigationType: 'navigateTo' | 'redirectTo' | 'switchTab' = 'navigateTo') {
    expect(wx[navigationType]).toHaveBeenCalledWith(
      expect.objectContaining({ url })
    )
  }

  /**
   * 验证存储操作
   */
  static expectStorageOperation(operation: 'set' | 'get' | 'remove' | 'clear', key?: string, value?: any) {
    switch (operation) {
      case 'set':
        expect(wx.setStorageSync).toHaveBeenCalledWith(key, value)
        break
      case 'get':
        expect(wx.getStorageSync).toHaveBeenCalledWith(key)
        break
      case 'remove':
        expect(wx.removeStorageSync).toHaveBeenCalledWith(key)
        break
      case 'clear':
        expect(wx.clearStorageSync).toHaveBeenCalled()
        break
    }
  }

  /**
   * 验证UI反馈
   */
  static expectUIFeedback(type: 'toast' | 'modal' | 'loading', options?: any) {
    switch (type) {
      case 'toast':
        expect(wx.showToast).toHaveBeenCalled()
        if (options) {
          expect(wx.showToast).toHaveBeenCalledWith(
            expect.objectContaining(options)
          )
        }
        break
      case 'modal':
        expect(wx.showModal).toHaveBeenCalled()
        if (options) {
          expect(wx.showModal).toHaveBeenCalledWith(
            expect.objectContaining(options)
          )
        }
        break
      case 'loading':
        expect(wx.showLoading).toHaveBeenCalled()
        if (options) {
          expect(wx.showLoading).toHaveBeenCalledWith(
            expect.objectContaining(options)
          )
        }
        break
    }
  }

  /**
   * 等待异步操作完成
   */
  static async waitFor(condition: () => boolean | Promise<boolean>, timeout = 5000) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      const result = await condition()
      if (result) {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    throw new Error(`等待条件超时 (${timeout}ms)`)
  }

  /**
   * 模拟网络延迟
   */
  static async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 创建测试场景
   */
  static createTestScenario(name: string, setup: () => void | Promise<void>, cleanup?: () => void | Promise<void>) {
    return {
      name,
      async run(testFn: () => void | Promise<void>) {
        try {
          await setup()
          await testFn()
        } finally {
          if (cleanup) {
            await cleanup()
          }
        }
      }
    }
  }

  /**
   * 批量验证数据
   */
  static expectBatchData(actual: any[], expected: any[], compareFn?: (a: any, b: any) => boolean) {
    expect(actual).toHaveLength(expected.length)
    
    if (compareFn) {
      expected.forEach((expectedItem, index) => {
        expect(compareFn(actual[index], expectedItem)).toBe(true)
      })
    } else {
      expected.forEach((expectedItem, index) => {
        expect(actual[index]).toEqual(expectedItem)
      })
    }
  }
}

/**
 * 小程序测试装饰器
 */
export function withMiniprogramEnvironment(testFn: () => void | Promise<void>) {
  return async () => {
    MiniprogramTestUtils.setupGlobalEnvironment()
    try {
      await testFn()
    } finally {
      MiniprogramTestUtils.cleanupGlobalEnvironment()
    }
  }
}

/**
 * 默认导出
 */
export default {
  api: MiniprogramApiTestHelper,
  utils: MiniprogramTestUtils,
  page: PageTestHelper,
  component: ComponentTestHelper,
  errorScenario: MiniprogramErrorScenarioHelper,
  withEnvironment: withMiniprogramEnvironment,
  error: TestErrorHandler
}