import { vi } from 'vitest'
import { vi } from 'vitest'
import { vi } from 'vitest'
import { vi } from 'vitest'
import { vi } from 'vitest'
import { vi } from 'vitest'
import { vi } from 'vitest'
import { vi } from 'vitest'
import { vi } from 'vitest'
import { vi } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { FrontendTestFactory, FrontendApiAdapter } from '../../../../../shared/test-factories/frontend-adapter'

// 前端API测试工具类
export class FrontendApiTestHelper {
  /**
   * 创建成功响应的Mock数据
   */
  static mockSuccessResponse<T>(data: T, message = '操作成功') {
    return FrontendApiAdapter.createSuccessResponse(data, message)
  }

  /**
   * 创建错误响应的Mock数据
   */
  static mockErrorResponse(message: string, code = 500) {
    return FrontendApiAdapter.createErrorResponse(message, code)
  }

  /**
   * 创建Axios响应格式的Mock数据
   */
  static createMockAxiosResponse<T>(data: T, status = 200) {
    return {
      data,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: {},
      config: {} as any
    }
  }

  /**
   * 创建分页响应的Mock数据
   */
  static mockPaginatedResponse<T>(
    items: T[], 
    page = 1, 
    pageSize = 10, 
    total?: number
  ) {
    return FrontendApiAdapter.createPaginatedResponse(items, page, pageSize, total)
  }

  /**
   * 模拟网络延迟
   */
  static async delay(ms = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 创建表单验证错误响应
   */
  static mockValidationErrorResponse(errors: Record<string, string[]>) {
    return FrontendTestFactory.createValidationErrorResponse(errors)
  }

  /**
   * 创建登录响应
   */
  static mockLoginResponse(userOverrides = {}) {
    return FrontendTestFactory.createLoginResponse(userOverrides)
  }

  /**
   * 创建用户信息响应
   */
  static mockUserInfoResponse(userOverrides = {}) {
    return FrontendTestFactory.createUserInfoResponse(userOverrides)
  }

  /**
   * 创建商户列表响应
   */
  static mockMerchantsResponse(count = 5, overrides = {}) {
    return FrontendTestFactory.createMerchantsResponse(count, overrides)
  }

  /**
   * 创建分页商户列表响应
   */
  static mockPaginatedMerchantsResponse(count = 20, page = 1, pageSize = 10, overrides = {}) {
    return FrontendTestFactory.createPaginatedMerchantsResponse(count, page, pageSize, overrides)
  }

  /**
   * 创建访客申请列表响应
   */
  static mockVisitorApplicationsResponse(count = 10, overrides = {}) {
    return FrontendTestFactory.createVisitorApplicationsResponse(count, overrides)
  }

  /**
   * 创建空间列表响应
   */
  static mockSpacesResponse(count = 8, overrides = {}) {
    return FrontendTestFactory.createSpacesResponse(count, overrides)
  }

  /**
   * 创建通行记录列表响应
   */
  static mockAccessRecordsResponse(count = 20, overrides = {}) {
    return FrontendTestFactory.createAccessRecordsResponse(count, overrides)
  }

  /**
   * 创建仪表板数据响应
   */
  static mockDashboardDataResponse() {
    return FrontendTestFactory.createDashboardDataResponse()
  }

  /**
   * 创建权限错误响应
   */
  static mockPermissionErrorResponse() {
    return FrontendTestFactory.createPermissionErrorResponse()
  }

  /**
   * 创建未找到错误响应
   */
  static mockNotFoundErrorResponse(resource = '资源') {
    return FrontendTestFactory.createNotFoundErrorResponse(resource)
  }

  /**
   * 创建服务器错误响应
   */
  static mockServerErrorResponse() {
    return FrontendTestFactory.createServerErrorResponse()
  }

  /**
   * 验证API响应格式
   */
  static expectApiResponse(response: any, shouldSucceed = true) {
    expect(response).toBeDefined()
    expect(response.success).toBe(shouldSucceed)
    expect(response.timestamp).toBeDefined()
    
    if (shouldSucceed) {
      expect(response.data).toBeDefined()
      expect(response.message).toBeDefined()
    } else {
      expect(response.message).toBeDefined()
      if (response.code) {
        expect(typeof response.code).toBe('number')
      }
    }
  }

  /**
   * 验证分页响应格式
   */
  static expectPaginatedResponse(response: any) {
    this.expectApiResponse(response, true)
    expect(response.data.items).toBeInstanceOf(Array)
    expect(response.data.pagination).toBeDefined()
    expect(response.data.pagination.current).toBeGreaterThan(0)
    expect(response.data.pagination.pageSize).toBeGreaterThan(0)
    expect(response.data.pagination.total).toBeGreaterThanOrEqual(0)
    expect(response.data.pagination.totalPages).toBeGreaterThan(0)
  }

  /**
   * 模拟网络错误
   */
  static mockNetworkError() {
    return Promise.reject(new Error('Network Error'))
  }

  /**
   * 模拟超时错误
   */
  static mockTimeoutError() {
    return Promise.reject(new Error('Request Timeout'))
  }

  /**
   * 创建测试用的Axios实例Mock
   */
  static createMockAxios() {
    return {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      request: vi.fn(),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() }
      }
    }
  }
}