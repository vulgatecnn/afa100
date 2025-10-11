/**
 * 小程序页面测试辅助工具
 */

import { MiniprogramTestFactory } from '../../../shared/test-factories/miniprogram-adapter'

/**
 * 小程序页面测试辅助类
 */
export class MiniprogramPageHelper {
  /**
   * 创建模拟的页面上下文
   */
  static mockPageContext(initialData = {}, methods = {}) {
    const data = { ...initialData }
    
    return {
      data,
      setData: vi.fn(function(this: any, newData: any, callback?: () => void) {
        Object.assign(this.data, newData)
        if (callback) {
          setTimeout(callback, 0) // 模拟异步行为
        }
      }),
      onLoad: vi.fn(),
      onShow: vi.fn(),
      onHide: vi.fn(),
      onUnload: vi.fn(),
      onReady: vi.fn(),
      onPullDownRefresh: vi.fn(),
      onReachBottom: vi.fn(),
      onShareAppMessage: vi.fn(),
      ...methods
    }
  }
  
  /**
   * 创建模拟的组件上下文
   */
  static mockComponentContext(properties = {}, initialData = {}, methods = {}) {
    const data = { ...initialData }
    
    return {
      properties: { ...properties },
      data,
      setData: vi.fn(function(this: any, newData: any, callback?: () => void) {
        Object.assign(this.data, newData)
        if (callback) {
          setTimeout(callback, 0)
        }
      }),
      triggerEvent: vi.fn(),
      selectComponent: vi.fn(),
      selectAllComponents: vi.fn(),
      getRelationNodes: vi.fn(),
      created: vi.fn(),
      attached: vi.fn(),
      ready: vi.fn(),
      moved: vi.fn(),
      detached: vi.fn(),
      ...methods
    }
  }
  
  /**
   * 模拟微信API
   */
  static mockWxApi() {
    return {
      // 网络请求
      request: vi.fn().mockImplementation(({ success, fail, complete }) => {
        const response = MiniprogramTestFactory.createMerchantsResponse(3)
        if (success) success(response)
        if (complete) complete(response)
      }),
      
      // 数据存储
      getStorageSync: vi.fn().mockReturnValue(''),
      setStorageSync: vi.fn(),
      removeStorageSync: vi.fn(),
      clearStorageSync: vi.fn(),
      getStorage: vi.fn().mockImplementation(({ success }) => {
        if (success) success({ data: '' })
      }),
      setStorage: vi.fn().mockImplementation(({ success }) => {
        if (success) success()
      }),
      
      // 界面交互
      showToast: vi.fn(),
      showModal: vi.fn().mockImplementation(({ success }) => {
        if (success) success({ confirm: true, cancel: false })
      }),
      showLoading: vi.fn(),
      hideLoading: vi.fn(),
      showActionSheet: vi.fn(),
      
      // 导航
      navigateTo: vi.fn(),
      redirectTo: vi.fn(),
      switchTab: vi.fn(),
      navigateBack: vi.fn(),
      reLaunch: vi.fn(),
      
      // 下拉刷新
      startPullDownRefresh: vi.fn(),
      stopPullDownRefresh: vi.fn(),
      
      // 登录授权
      login: vi.fn().mockImplementation(({ success }) => {
        if (success) success({ code: 'mock-wx-code' })
      }),
      getUserInfo: vi.fn().mockImplementation(({ success }) => {
        const userInfo = MiniprogramTestFactory.createPageInitialData()
        if (success) success(userInfo)
      }),
      getUserProfile: vi.fn().mockImplementation(({ success }) => {
        const userInfo = MiniprogramTestFactory.createPageInitialData()
        if (success) success(userInfo)
      }),
      
      // 系统信息
      getSystemInfo: vi.fn().mockImplementation(({ success }) => {
        const systemInfo = {
          platform: 'devtools',
          system: 'iOS 14.0',
          version: '8.0.5',
          screenWidth: 375,
          screenHeight: 812,
          windowWidth: 375,
          windowHeight: 812
        }
        if (success) success(systemInfo)
      }),
      
      // Canvas
      createCanvasContext: vi.fn().mockReturnValue({
        clearRect: vi.fn(),
        setFillStyle: vi.fn(),
        fillRect: vi.fn(),
        drawImage: vi.fn(),
        draw: vi.fn()
      }),
      
      // 其他
      setNavigationBarTitle: vi.fn(),
      setNavigationBarColor: vi.fn(),
      chooseImage: vi.fn(),
      previewImage: vi.fn(),
      makePhoneCall: vi.fn(),
      scanCode: vi.fn().mockImplementation(({ success }) => {
        if (success) success({ result: 'mock-qr-code-result' })
      })
    }
  }
  
  /**
   * 验证页面数据
   */
  static expectPageData(pageContext: any, expectedData: any) {
    expect(pageContext.data).toMatchObject(expectedData)
  }
  
  /**
   * 验证微信API调用
   */
  static expectWxApiCalled(apiName: string, expectedParams?: any) {
    expect(wx[apiName as keyof typeof wx]).toHaveBeenCalled()
    if (expectedParams) {
      expect(wx[apiName as keyof typeof wx]).toHaveBeenCalledWith(
        expect.objectContaining(expectedParams)
      )
    }
  }
  
  /**
   * 验证页面跳转
   */
  static expectNavigation(url: string, method = 'navigateTo') {
    expect(wx[method as keyof typeof wx]).toHaveBeenCalledWith(
      expect.objectContaining({ url })
    )
  }
  
  /**
   * 验证Toast显示
   */
  static expectToast(title: string, icon?: string) {
    const expectedParams: any = { title }
    if (icon) expectedParams.icon = icon
    
    expect(wx.showToast).toHaveBeenCalledWith(
      expect.objectContaining(expectedParams)
    )
  }
  
  /**
   * 验证Modal显示
   */
  static expectModal(title: string, content?: string) {
    const expectedParams: any = { title }
    if (content) expectedParams.content = content
    
    expect(wx.showModal).toHaveBeenCalledWith(
      expect.objectContaining(expectedParams)
    )
  }
  
  /**
   * 验证数据存储
   */
  static expectStorageSet(key: string, data?: any) {
    if (data !== undefined) {
      expect(wx.setStorageSync).toHaveBeenCalledWith(key, data)
    } else {
      expect(wx.setStorageSync).toHaveBeenCalledWith(
        expect.stringContaining(key),
        expect.anything()
      )
    }
  }
  
  /**
   * 验证数据获取
   */
  static expectStorageGet(key: string) {
    expect(wx.getStorageSync).toHaveBeenCalledWith(key)
  }
  
  /**
   * 模拟页面生命周期
   */
  static async simulatePageLifecycle(pageContext: any, options = {}) {
    // 模拟页面加载
    if (pageContext.onLoad) {
      await pageContext.onLoad(options)
    }
    
    // 模拟页面显示
    if (pageContext.onShow) {
      await pageContext.onShow()
    }
    
    // 模拟页面准备完毕
    if (pageContext.onReady) {
      await pageContext.onReady()
    }
  }
  
  /**
   * 模拟组件生命周期
   */
  static async simulateComponentLifecycle(componentContext: any) {
    // 模拟组件创建
    if (componentContext.created) {
      await componentContext.created()
    }
    
    // 模拟组件附加到页面
    if (componentContext.attached) {
      await componentContext.attached()
    }
    
    // 模拟组件准备完毕
    if (componentContext.ready) {
      await componentContext.ready()
    }
  }
  
  /**
   * 模拟用户交互
   */
  static async simulateUserInteraction(pageContext: any, eventName: string, eventData = {}) {
    const handler = pageContext[eventName]
    if (typeof handler === 'function') {
      const mockEvent = {
        type: eventName,
        target: { dataset: {} },
        currentTarget: { dataset: {} },
        detail: eventData,
        ...eventData
      }
      await handler.call(pageContext, mockEvent)
    }
  }
  
  /**
   * 模拟表单提交
   */
  static async simulateFormSubmit(pageContext: any, formData: any) {
    const mockEvent = {
      type: 'submit',
      target: { dataset: {} },
      currentTarget: { dataset: {} },
      detail: { value: formData }
    }
    
    if (pageContext.onSubmit) {
      await pageContext.onSubmit(mockEvent)
    } else if (pageContext.submitForm) {
      await pageContext.submitForm(mockEvent)
    }
  }
  
  /**
   * 等待异步操作完成
   */
  static async waitForAsync(condition: () => boolean, timeout = 5000) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      if (condition()) {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    throw new Error(`等待条件超时 (${timeout}ms)`)
  }
  
  /**
   * 模拟网络延迟
   */
  static async delay(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export default MiniprogramPageHelper