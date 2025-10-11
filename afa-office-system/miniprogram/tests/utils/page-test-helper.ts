/**
 * 小程序页面测试工具 - 专门用于测试小程序页面
 */

import { MiniprogramApiTestHelper } from './api-test-helper'

/**
 * 页面测试上下文
 */
interface PageTestContext {
  data: Record<string, any>
  setData: (newData: Record<string, any>, callback?: () => void) => void
  route: string
  options: Record<string, any>
  [key: string]: any
}

/**
 * 页面生命周期类型
 */
type PageLifecycle = 'onLoad' | 'onShow' | 'onReady' | 'onHide' | 'onUnload' | 'onPullDownRefresh' | 'onReachBottom'

/**
 * 页面事件类型
 */
interface PageEvent {
  type: string
  target: {
    id?: string
    dataset: Record<string, any>
  }
  currentTarget: {
    id?: string
    dataset: Record<string, any>
  }
  detail: Record<string, any>
  timeStamp: number
}

/**
 * 小程序页面测试辅助类
 */
export class PageTestHelper {
  /**
   * 创建页面测试上下文
   */
  static createPageContext(
    initialData: Record<string, any> = {},
    methods: Record<string, Function> = {},
    route = '/pages/test/test',
    options: Record<string, any> = {}
  ): PageTestContext {
    const data = { ...initialData }
    
    const context: PageTestContext = {
      data,
      route,
      options,
      setData: vi.fn((newData: Record<string, any>, callback?: () => void) => {
        Object.assign(data, newData)
        if (callback) {
          setTimeout(callback, 0)
        }
      }),
      ...methods
    }

    return context
  }

  /**
   * 模拟页面生命周期
   */
  static async simulatePageLifecycle(
    pageContext: PageTestContext,
    lifecycle: PageLifecycle,
    params?: any
  ): Promise<void> {
    const lifecycleMethod = pageContext[lifecycle]
    
    if (typeof lifecycleMethod === 'function') {
      await lifecycleMethod.call(pageContext, params)
    }
  }

  /**
   * 模拟页面事件
   */
  static async simulatePageEvent(
    pageContext: PageTestContext,
    eventName: string,
    eventData: Partial<PageEvent> = {}
  ): Promise<void> {
    const eventHandler = pageContext[eventName]
    
    if (typeof eventHandler === 'function') {
      const mockEvent: PageEvent = {
        type: eventName,
        target: { dataset: {}, ...eventData.target },
        currentTarget: { dataset: {}, ...eventData.currentTarget },
        detail: {},
        timeStamp: Date.now(),
        ...eventData
      }
      
      await eventHandler.call(pageContext, mockEvent)
    }
  }

  /**
   * 验证页面数据
   */
  static expectPageData(
    pageContext: PageTestContext,
    expectedData: Record<string, any>
  ): void {
    Object.entries(expectedData).forEach(([key, expectedValue]) => {
      expect(pageContext.data[key]).toEqual(expectedValue)
    })
  }

  /**
   * 验证setData调用
   */
  static expectSetDataCall(
    pageContext: PageTestContext,
    expectedData: Record<string, any>,
    callIndex = 0
  ): void {
    const setDataMock = pageContext.setData as any
    expect(setDataMock).toHaveBeenCalled()
    
    if (callIndex < setDataMock.mock.calls.length) {
      const actualCall = setDataMock.mock.calls[callIndex][0]
      expect(actualCall).toMatchObject(expectedData)
    }
  }

  /**
   * 验证页面跳转
   */
  static expectPageNavigation(
    url: string,
    navigationType: 'navigateTo' | 'redirectTo' | 'switchTab' | 'reLaunch' = 'navigateTo'
  ): void {
    expect(wx[navigationType]).toHaveBeenCalledWith(
      expect.objectContaining({ url })
    )
  }

  /**
   * 验证页面标题设置
   */
  static expectPageTitle(title: string): void {
    expect(wx.setNavigationBarTitle).toHaveBeenCalledWith(
      expect.objectContaining({ title })
    )
  }

  /**
   * 模拟页面下拉刷新
   */
  static async simulatePullDownRefresh(pageContext: PageTestContext): Promise<void> {
    await this.simulatePageLifecycle(pageContext, 'onPullDownRefresh')
    
    // 验证停止下拉刷新
    expect(wx.stopPullDownRefresh).toHaveBeenCalled()
  }

  /**
   * 模拟页面上拉加载
   */
  static async simulateReachBottom(pageContext: PageTestContext): Promise<void> {
    await this.simulatePageLifecycle(pageContext, 'onReachBottom')
  }

  /**
   * 模拟页面分享
   */
  static async simulatePageShare(
    pageContext: PageTestContext,
    shareOptions: { from: 'button' | 'menu'; target?: any } = { from: 'menu' }
  ): Promise<any> {
    const onShareAppMessage = pageContext.onShareAppMessage
    
    if (typeof onShareAppMessage === 'function') {
      return await onShareAppMessage.call(pageContext, shareOptions)
    }
    
    return null
  }

  /**
   * 测试页面完整生命周期
   */
  static async testPageLifecycle(
    pageContext: PageTestContext,
    options: Record<string, any> = {}
  ): Promise<void> {
    // onLoad
    await this.simulatePageLifecycle(pageContext, 'onLoad', options)
    
    // onShow
    await this.simulatePageLifecycle(pageContext, 'onShow')
    
    // onReady
    await this.simulatePageLifecycle(pageContext, 'onReady')
    
    // onHide
    await this.simulatePageLifecycle(pageContext, 'onHide')
    
    // onUnload
    await this.simulatePageLifecycle(pageContext, 'onUnload')
  }

  /**
   * 创建页面测试套件
   */
  static createPageTestSuite(
    pageName: string,
    pageFactory: () => PageTestContext,
    testCases: Array<{
      name: string
      test: (pageContext: PageTestContext) => Promise<void>
    }>
  ): void {
    describe(`页面: ${pageName}`, () => {
      let pageContext: PageTestContext

      beforeEach(() => {
        // 设置微信API Mock
        MiniprogramApiTestHelper.setupWxApiMocks()
        pageContext = pageFactory()
      })

      afterEach(() => {
        // 重置Mock
        MiniprogramApiTestHelper.resetMocks()
        vi.clearAllMocks()
      })

      testCases.forEach(({ name, test }) => {
        it(name, async () => {
          await test(pageContext)
        })
      })
    })
  }

  /**
   * 验证页面错误处理
   */
  static expectPageError(
    pageContext: PageTestContext,
    errorMessage: string,
    errorType: 'toast' | 'modal' = 'toast'
  ): void {
    if (errorType === 'toast') {
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining(errorMessage),
          icon: 'none'
        })
      )
    } else {
      expect(wx.showModal).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '错误',
          content: expect.stringContaining(errorMessage)
        })
      )
    }
  }

  /**
   * 验证页面成功反馈
   */
  static expectPageSuccess(
    pageContext: PageTestContext,
    successMessage: string,
    feedbackType: 'toast' | 'modal' = 'toast'
  ): void {
    if (feedbackType === 'toast') {
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining(successMessage),
          icon: 'success'
        })
      )
    } else {
      expect(wx.showModal).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '成功',
          content: expect.stringContaining(successMessage)
        })
      )
    }
  }

  /**
   * 验证页面加载状态
   */
  static expectPageLoading(
    pageContext: PageTestContext,
    isLoading: boolean,
    loadingText = '加载中...'
  ): void {
    if (isLoading) {
      expect(wx.showLoading).toHaveBeenCalledWith(
        expect.objectContaining({
          title: loadingText
        })
      )
    } else {
      expect(wx.hideLoading).toHaveBeenCalled()
    }
  }

  /**
   * 模拟表单输入
   */
  static async simulateFormInput(
    pageContext: PageTestContext,
    inputName: string,
    value: string
  ): Promise<void> {
    await this.simulatePageEvent(pageContext, `on${inputName}Input`, {
      detail: { value }
    })
  }

  /**
   * 模拟表单提交
   */
  static async simulateFormSubmit(
    pageContext: PageTestContext,
    formData: Record<string, any>
  ): Promise<void> {
    await this.simulatePageEvent(pageContext, 'onFormSubmit', {
      detail: { value: formData }
    })
  }

  /**
   * 验证表单验证
   */
  static expectFormValidation(
    pageContext: PageTestContext,
    fieldName: string,
    isValid: boolean,
    errorMessage?: string
  ): void {
    const validationKey = `${fieldName}Error`
    
    if (isValid) {
      expect(pageContext.data[validationKey]).toBeFalsy()
    } else {
      expect(pageContext.data[validationKey]).toBeTruthy()
      
      if (errorMessage) {
        expect(pageContext.data[validationKey]).toContain(errorMessage)
      }
    }
  }

  /**
   * 模拟网络请求场景
   */
  static async simulateNetworkScenario(
    pageContext: PageTestContext,
    scenario: 'success' | 'error' | 'timeout',
    action: () => Promise<void>
  ): Promise<void> {
    switch (scenario) {
      case 'success':
        MiniprogramApiTestHelper.mockWxRequest({
          statusCode: 200,
          data: { success: true, data: {} }
        })
        break
      case 'error':
        MiniprogramApiTestHelper.mockWxRequest({
          statusCode: 500,
          data: { success: false, message: '服务器错误' }
        })
        break
      case 'timeout':
        MiniprogramApiTestHelper.mockWxRequestTimeout()
        break
    }

    await action()
  }

  /**
   * 等待页面状态变化
   */
  static async waitForPageState(
    pageContext: PageTestContext,
    condition: (data: Record<string, any>) => boolean,
    timeout = 5000
  ): Promise<void> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      if (condition(pageContext.data)) {
        return
      }
      
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    throw new Error(`页面状态在 ${timeout}ms 内未满足条件`)
  }

  /**
   * 批量测试页面方法
   */
  static async testPageMethods(
    pageContext: PageTestContext,
    methodTests: Array<{
      methodName: string
      params?: any[]
      expectedResult?: any
      expectedSideEffects?: () => void
      description: string
    }>
  ): Promise<void> {
    for (const { methodName, params = [], expectedResult, expectedSideEffects, description } of methodTests) {
      const method = pageContext[methodName]
      
      if (typeof method === 'function') {
        const result = await method.apply(pageContext, params)
        
        if (expectedResult !== undefined) {
          expect(result).toEqual(expectedResult)
        }
        
        if (expectedSideEffects) {
          expectedSideEffects()
        }
        
        console.log(`✓ ${description}`)
      }
    }
  }
}

/**
 * 页面测试装饰器
 */
export function withPageTestEnvironment(
  testFn: (helper: typeof PageTestHelper) => Promise<void>
) {
  return async () => {
    // 设置小程序环境
    MiniprogramApiTestHelper.setupWxApiMocks()
    
    try {
      await testFn(PageTestHelper)
    } finally {
      // 清理环境
      MiniprogramApiTestHelper.resetMocks()
      vi.clearAllMocks()
    }
  }
}

export default PageTestHelper