/**
 * 前端API测试辅助工具 - MySQL后端兼容版本
 */

import { vi } from 'vitest'
import type { MockedFunction } from 'vitest'

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
 * MySQL分页响应格式
 */
export interface MySQLPaginatedResponse<T = any> {
  success: boolean
  data: {
    items: T[]
    pagination: {
      current: number
      pageSize: number
      total: number
      totalPages: number
    }
  }
  message: string
  timestamp: string
}

/**
 * 前端API测试辅助类
 */
export class FrontendApiTestHelper {
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
   * 创建MySQL后端分页响应
   */
  static mockMySQLPaginatedResponse<T>(
    items: T[],
    pagination: {
      current: number
      pageSize: number
      total: number
    },
    message = '查询成功'
  ): MySQLPaginatedResponse<T> {
    return {
      success: true,
      data: {
        items,
        pagination: {
          ...pagination,
          totalPages: Math.ceil(pagination.total / pagination.pageSize)
        }
      },
      message,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * 创建MySQL后端验证错误响应
   */
  static mockMySQLValidationError(errors: Record<string, string[]>): MySQLApiResponse<{ errors: Record<string, string[]> }> {
    return {
      success: false,
      data: { errors },
      message: '数据验证失败',
      timestamp: new Date().toISOString(),
      code: 422
    }
  }

  /**
   * 模拟MySQL连接错误
   */
  static mockMySQLConnectionError(): MySQLApiResponse<null> {
    return {
      success: false,
      data: null,
      message: 'MySQL数据库连接失败',
      timestamp: new Date().toISOString(),
      code: 500
    }
  }

  /**
   * 模拟MySQL查询错误
   */
  static mockMySQLQueryError(): MySQLApiResponse<null> {
    return {
      success: false,
      data: null,
      message: 'MySQL查询执行失败',
      timestamp: new Date().toISOString(),
      code: 500
    }
  }

  /**
   * 模拟MySQL约束错误
   */
  static mockMySQLConstraintError(constraint: string): MySQLApiResponse<null> {
    return {
      success: false,
      data: null,
      message: `MySQL约束违反: ${constraint}`,
      timestamp: new Date().toISOString(),
      code: 409
    }
  }

  /**
   * 创建模拟的Axios响应
   */
  static createMockAxiosResponse<T>(data: MySQLApiResponse<T>, status = 200) {
    return {
      data,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: {
        'content-type': 'application/json'
      },
      config: {}
    }
  }

  /**
   * 验证MySQL API响应格式
   */
  static expectMySQLApiResponse<T>(response: any, expectedData?: T) {
    expect(response).toHaveProperty('success')
    expect(response).toHaveProperty('data')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('timestamp')
    
    if (expectedData !== undefined) {
      expect(response.data).toEqual(expectedData)
    }
  }

  /**
   * 验证MySQL分页响应格式
   */
  static expectMySQLPaginatedResponse<T>(response: any, expectedItemCount?: number) {
    this.expectMySQLApiResponse(response)
    expect(response.data).toHaveProperty('items')
    expect(response.data).toHaveProperty('pagination')
    expect(response.data.pagination).toHaveProperty('current')
    expect(response.data.pagination).toHaveProperty('pageSize')
    expect(response.data.pagination).toHaveProperty('total')
    expect(response.data.pagination).toHaveProperty('totalPages')
    
    if (expectedItemCount !== undefined) {
      expect(response.data.items).toHaveLength(expectedItemCount)
    }
  }

  /**
   * 验证MySQL错误响应格式
   */
  static expectMySQLErrorResponse(response: any, expectedCode?: number) {
    expect(response.success).toBe(false)
    expect(response.data).toBeNull()
    expect(response.message).toBeDefined()
    expect(response.timestamp).toBeDefined()
    
    if (expectedCode !== undefined) {
      expect(response.code).toBe(expectedCode)
    }
  }

  /**
   * 模拟MySQL后端用户数据
   */
  static createMockUser(overrides = {}) {
    return {
      id: 1,
      name: '测试用户',
      email: 'test@example.com',
      phone: '13800138000',
      user_type: 'tenant_admin',
      status: 'active',
      merchant_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    }
  }

  /**
   * 模拟MySQL后端商户数据
   */
  static createMockMerchant(overrides = {}) {
    return {
      id: 1,
      name: '测试商户',
      code: 'TEST_MERCHANT',
      contact_person: '联系人',
      phone: '13800138001',
      email: 'merchant@example.com',
      status: 'active',
      space_ids: '[]',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    }
  }

  /**
   * 模拟MySQL后端访客申请数据
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
   * 模拟MySQL后端空间数据
   */
  static createMockSpace(overrides = {}) {
    return {
      id: 1,
      name: '测试空间',
      type: 'building',
      code: 'TEST_SPACE',
      parent_id: null,
      status: 'active',
      description: '测试用空间',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    }
  }

  /**
   * 设置API Mock响应
   */
  static setupApiMocks(apiClient: any) {
    // 模拟认证相关API
    apiClient.post = vi.fn().mockImplementation((url: string, data: any) => {
      if (url.includes('/auth/login')) {
        return Promise.resolve(
          this.createMockAxiosResponse(
            this.mockMySQLSuccessResponse({
              token: 'mock-jwt-token',
              user: this.createMockUser()
            }, '登录成功')
          )
        )
      }
      return Promise.reject(new Error('未模拟的API调用'))
    })

    // 模拟GET请求
    apiClient.get = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/merchants')) {
        return Promise.resolve(
          this.createMockAxiosResponse(
            this.mockMySQLPaginatedResponse(
              [this.createMockMerchant()],
              { current: 1, pageSize: 10, total: 1 }
            )
          )
        )
      }
      return Promise.reject(new Error('未模拟的API调用'))
    })

    return apiClient
  }

  /**
   * 重置所有Mock
   */
  static resetMocks() {
    vi.clearAllMocks()
  }

  /**
   * 验证API调用
   */
  static expectApiCall(mockFn: MockedFunction<any>, expectedUrl: string, expectedData?: any) {
    expect(mockFn).toHaveBeenCalled()
    const calls = mockFn.mock.calls
    const matchingCall = calls.find(call => call[0].includes(expectedUrl))
    expect(matchingCall).toBeDefined()
    
    if (expectedData) {
      expect(matchingCall![1]).toEqual(expectedData)
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
}

export default FrontendApiTestHelper