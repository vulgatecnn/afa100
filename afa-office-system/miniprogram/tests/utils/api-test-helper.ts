/**
 * 小程序API测试辅助工具 - MySQL后端兼容版本
 */

import { vi } from 'vitest'

/**
 * MySQL后端API响应格式
 */
export interface MySQLApiResponse<T = any> {
  success: boolean
  data: T
  message: string
  timestamp: string
  code?: number
}

/**
 * 微信API响应格式
 */
export interface WxApiResponse<T = any> {
  statusCode: number
  data: MySQLApiResponse<T>
  header: Record<string, string>
}

/**
 * 小程序API测试辅助类
 */
export class MiniprogramApiTestHelper {
  /**
   * 创建MySQL后端成功响应
   */
  static mockMySQLSuccessResponse<T>(data: T, message = '操作成功'): MySQLApiResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * 创建MySQL后端错误响应
   */
  static mockMySQLErrorResponse(message: string, code = 500): MySQLApiResponse<null> {
    return {
      success: false,
      data: null,
      message,
      timestamp: new Date().toISOString(),
      code
    }
  }

  /**
   * 创建微信API成功响应
   */
  static mockWxSuccessResponse<T>(data: MySQLApiResponse<T>): WxApiResponse<T> {
    return {
      statusCode: 200,
      data,
      header: {
        'content-type': 'application/json'
      }
    }
  }

  /**
   * 创建微信API错误响应
   */
  static mockWxErrorResponse(statusCode = 500, message = '服务器错误'): WxApiResponse<null> {
    return {
      statusCode,
      data: this.mockMySQLErrorResponse(message, statusCode),
      header: {
        'content-type': 'application/json'
      }
    }
  }

  /**
   * 模拟微信request API
   */
  static mockWxRequest() {
    const mockRequest = vi.fn()
    
    // 设置默认成功响应
    mockRequest.mockImplementation((options: any) => {
      const { url, method = 'GET', data, success, fail } = options
      
      setTimeout(() => {
        try {
          let response: WxApiResponse<any>
          
          // 根据URL和方法返回不同的模拟响应
          if (url.includes('/auth/login') && method === 'POST') {
            response = this.mockWxSuccessResponse(
              this.mockMySQLSuccessResponse({
                token: 'mock-jwt-token',
                user: this.createMockUser()
              }, '登录成功')
            )
          } else if (url.includes('/visitor-applications') && method === 'GET') {
            response = this.mockWxSuccessResponse(
              this.mockMySQLSuccessResponse([
                this.createMockVisitorApplication()
              ], '查询成功')
            )
          } else if (url.includes('/visitor-applications') && method === 'POST') {
            response = this.mockWxSuccessResponse(
              this.mockMySQLSuccessResponse(
                { ...this.createMockVisitorApplication(), ...data },
                '申请提交成功'
              )
            )
          } else {
            // 默认成功响应
            response = this.mockWxSuccessResponse(
              this.mockMySQLSuccessResponse({}, '操作成功')
            )
          }
          
          if (success) {
            success(response)
          }
        } catch (error) {
          if (fail) {
            fail({
              errMsg: 'request:fail',
              errno: 500
            })
          }
        }
      }, 100) // 模拟网络延迟
    })
    
    return mockRequest
  }

  /**
   * 模拟微信存储API
   */
  static mockWxStorage() {
    const storage = new Map<string, any>()
    
    return {
      setStorageSync: vi.fn((key: string, value: any) => {
        storage.set(key, value)
      }),
      getStorageSync: vi.fn((key: string) => {
        return storage.get(key)
      }),
      removeStorageSync: vi.fn((key: string) => {
        storage.delete(key)
      }),
      clearStorageSync: vi.fn(() => {
        storage.clear()
      })
    }
  }

  /**
   * 模拟微信UI API
   */
  static mockWxUI() {
    return {
      showToast: vi.fn((options: any) => {
        console.log('showToast:', options)
      }),
      showModal: vi.fn((options: any) => {
        console.log('showModal:', options)
        // 模拟用户点击确认
        setTimeout(() => {
          if (options.success) {
            options.success({ confirm: true, cancel: false })
          }
        }, 100)
      }),
      showLoading: vi.fn((options: any) => {
        console.log('showLoading:', options)
      }),
      hideLoading: vi.fn()
    }
  }

  /**
   * 模拟微信导航API
   */
  static mockWxNavigation() {
    return {
      navigateTo: vi.fn((options: any) => {
        console.log('navigateTo:', options.url)
        if (options.success) {
          options.success()
        }
      }),
      redirectTo: vi.fn((options: any) => {
        console.log('redirectTo:', options.url)
        if (options.success) {
          options.success()
        }
      }),
      switchTab: vi.fn((options: any) => {
        console.log('switchTab:', options.url)
        if (options.success) {
          options.success()
        }
      }),
      navigateBack: vi.fn((options: any = {}) => {
        console.log('navigateBack:', options.delta || 1)
        if (options.success) {
          options.success()
        }
      })
    }
  }

  /**
   * 设置完整的微信API Mock
   */
  static setupWxApiMocks() {
    const storage = this.mockWxStorage()
    const ui = this.mockWxUI()
    const navigation = this.mockWxNavigation()
    
    global.wx = {
      request: this.mockWxRequest(),
      ...storage,
      ...ui,
      ...navigation,
      // 其他常用API
      getSystemInfoSync: vi.fn(() => ({
        platform: 'devtools',
        version: '8.0.5',
        SDKVersion: '2.19.4'
      })),
      login: vi.fn((options: any) => {
        setTimeout(() => {
          if (options.success) {
            options.success({
              code: 'mock-wx-code'
            })
          }
        }, 100)
      }),
      getUserProfile: vi.fn((options: any) => {
        setTimeout(() => {
          if (options.success) {
            options.success({
              userInfo: {
                nickName: '测试用户',
                avatarUrl: 'https://example.com/avatar.jpg'
              }
            })
          }
        }, 100)
      })
    }
    
    return global.wx
  }

  /**
   * 模拟小程序页面上下文
   */
  static mockPageContext(initialData = {}, methods = {}) {
    const data = { ...initialData }
    
    return {
      data,
      setData: vi.fn((newData: any, callback?: () => void) => {
        Object.assign(data, newData)
        if (callback) {
          setTimeout(callback, 0)
        }
      }),
      onLoad: vi.fn(),
      onShow: vi.fn(),
      onHide: vi.fn(),
      onUnload: vi.fn(),
      ...methods
    }
  }

  /**
   * 模拟小程序组件上下文
   */
  static mockComponentContext(properties = {}, initialData = {}, methods = {}) {
    const data = { ...initialData }
    
    return {
      properties,
      data,
      setData: vi.fn((newData: any, callback?: () => void) => {
        Object.assign(data, newData)
        if (callback) {
          setTimeout(callback, 0)
        }
      }),
      triggerEvent: vi.fn(),
      ...methods
    }
  }

  /**
   * 创建模拟用户数据
   */
  static createMockUser(overrides = {}) {
    return {
      id: 1,
      name: '测试用户',
      email: 'test@example.com',
      phone: '13800138000',
      user_type: 'merchant_employee',
      status: 'active',
      merchant_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    }
  }

  /**
   * 创建模拟访客申请数据
   */
  static createMockVisitorApplication(overrides = {}) {
    return {
      id: 1,
      visitor_name: '访客姓名',
      phone: '13800138002',
      company: '访客公司',
      purpose: '商务洽谈',
      visit_date: new Date().toISOString(),
      duration: 120,
      status: 'pending',
      merchant_id: 1,
      applicant_id: 1,
      qr_code: 'mock-qr-code',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    }
  }

  /**
   * 创建模拟通行码数据
   */
  static createMockPasscode(overrides = {}) {
    return {
      id: 1,
      code: 'PASS123456',
      user_id: 1,
      type: 'employee',
      status: 'active',
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      usage_count: 0,
      max_usage: 10,
      qr_code_data: 'mock-qr-data',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    }
  }

  /**
   * 验证微信API调用
   */
  static expectWxApiCall(mockFn: any, expectedOptions?: any) {
    expect(mockFn).toHaveBeenCalled()
    
    if (expectedOptions) {
      expect(mockFn).toHaveBeenCalledWith(
        expect.objectContaining(expectedOptions)
      )
    }
  }

  /**
   * 验证页面数据更新
   */
  static expectPageDataUpdate(pageContext: any, expectedData: any) {
    expect(pageContext.setData).toHaveBeenCalledWith(
      expect.objectContaining(expectedData)
    )
  }

  /**
   * 验证组件事件触发
   */
  static expectComponentEvent(componentContext: any, eventName: string, eventDetail?: any) {
    expect(componentContext.triggerEvent).toHaveBeenCalledWith(
      eventName,
      eventDetail
    )
  }

  /**
   * 重置所有Mock
   */
  static resetMocks() {
    vi.clearAllMocks()
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
}

export default MiniprogramApiTestHelper