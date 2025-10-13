/**
 * API 端点定义和配置
 * 用于 API 连通性测试和验证
 */

export interface ApiEndpoint {
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  requiresAuth: boolean
  requiredPermissions?: string[]
  requiredUserType?: string[]
  description: string
  testData?: any
  expectedStatus?: number
  timeout?: number
}

export interface ApiEndpointGroup {
  name: string
  baseUrl: string
  endpoints: ApiEndpoint[]
}

/**
 * 认证相关端点
 */
export const authEndpoints: ApiEndpoint[] = [
  {
    name: 'API信息',
    method: 'GET',
    path: '/',
    requiresAuth: false,
    description: '获取API基本信息和端点列表',
    expectedStatus: 200
  },
  {
    name: '健康检查',
    method: 'GET',
    path: '/auth/health',
    requiresAuth: false,
    description: '检查认证服务健康状态',
    expectedStatus: 200
  },
  {
    name: '用户登录',
    method: 'POST',
    path: '/auth/login',
    requiresAuth: false,
    description: '用户登录认证',
    testData: {
      phone: '13800138000',
      password: 'test123456'
    },
    expectedStatus: 200
  },
  {
    name: '微信登录',
    method: 'POST',
    path: '/auth/wechat-login',
    requiresAuth: false,
    description: '微信小程序登录',
    testData: {
      code: 'test_code',
      userType: 'visitor'
    },
    expectedStatus: 200
  },
  {
    name: '获取当前用户',
    method: 'GET',
    path: '/auth/me',
    requiresAuth: true,
    description: '获取当前登录用户信息',
    expectedStatus: 200
  },
  {
    name: '刷新Token',
    method: 'POST',
    path: '/auth/refresh-token',
    requiresAuth: false,
    description: '刷新访问令牌',
    testData: {
      refreshToken: 'test_refresh_token'
    },
    expectedStatus: 200
  },
  {
    name: '用户登出',
    method: 'POST',
    path: '/auth/logout',
    requiresAuth: true,
    description: '用户登出',
    expectedStatus: 200
  },
  {
    name: '验证Token',
    method: 'POST',
    path: '/auth/verify-token',
    requiresAuth: false,
    description: '验证令牌有效性',
    testData: {
      token: 'test_token'
    },
    expectedStatus: 200
  }
]

/**
 * 商户管理端点
 */
export const merchantEndpoints: ApiEndpoint[] = [
  {
    name: '获取商户列表',
    method: 'GET',
    path: '/merchants',
    requiresAuth: true,
    requiredPermissions: ['merchant:read'],
    description: '获取商户列表',
    expectedStatus: 200
  },
  {
    name: '获取商户详情',
    method: 'GET',
    path: '/merchants/1',
    requiresAuth: true,
    requiredPermissions: ['merchant:read'],
    description: '获取指定商户详情',
    expectedStatus: 200
  },
  {
    name: '创建商户',
    method: 'POST',
    path: '/merchants',
    requiresAuth: true,
    requiredPermissions: ['merchant:write'],
    description: '创建新商户',
    testData: {
      name: '测试商户',
      code: 'TEST_MERCHANT',
      contact: '张三',
      phone: '13800138000',
      email: 'test@example.com'
    },
    expectedStatus: 201
  },
  {
    name: '更新商户',
    method: 'PUT',
    path: '/merchants/1',
    requiresAuth: true,
    requiredPermissions: ['merchant:write'],
    description: '更新商户信息',
    testData: {
      name: '更新后的商户名称'
    },
    expectedStatus: 200
  },
  {
    name: '删除商户',
    method: 'DELETE',
    path: '/merchants/1',
    requiresAuth: true,
    requiredPermissions: ['merchant:delete'],
    description: '删除商户',
    expectedStatus: 200
  }
]

/**
 * 访客管理端点
 */
export const visitorEndpoints: ApiEndpoint[] = [
  {
    name: '获取商户列表',
    method: 'GET',
    path: '/visitor/merchants',
    requiresAuth: true,
    description: '访客获取可申请的商户列表',
    expectedStatus: 200
  },
  {
    name: '提交访客申请',
    method: 'POST',
    path: '/visitor/apply',
    requiresAuth: true,
    requiredUserType: ['visitor'],
    description: '提交访客申请',
    testData: {
      merchantId: 1,
      purpose: '商务洽谈',
      visitDate: '2024-01-01',
      contactPerson: '李四'
    },
    expectedStatus: 201
  },
  {
    name: '获取我的申请',
    method: 'GET',
    path: '/visitor/applications',
    requiresAuth: true,
    requiredUserType: ['visitor'],
    description: '获取当前访客的申请列表',
    expectedStatus: 200
  },
  {
    name: '获取申请详情',
    method: 'GET',
    path: '/visitor/applications/1',
    requiresAuth: true,
    requiredUserType: ['visitor'],
    description: '获取指定申请的详情',
    expectedStatus: 200
  },
  {
    name: '获取通行码',
    method: 'GET',
    path: '/visitor/passcode/1',
    requiresAuth: true,
    requiredUserType: ['visitor'],
    description: '获取访客通行码',
    expectedStatus: 200
  }
]

/**
 * 员工管理端点
 */
export const employeeEndpoints: ApiEndpoint[] = [
  {
    name: '获取员工列表',
    method: 'GET',
    path: '/merchants/1/employees',
    requiresAuth: true,
    requiredUserType: ['merchant_admin'],
    description: '获取商户员工列表',
    expectedStatus: 200
  },
  {
    name: '创建员工',
    method: 'POST',
    path: '/merchants/1/employees',
    requiresAuth: true,
    requiredUserType: ['merchant_admin'],
    description: '创建新员工',
    testData: {
      name: '王五',
      phone: '13800138001',
      email: 'wangwu@example.com',
      department: '技术部',
      position: '工程师'
    },
    expectedStatus: 201
  }
]

/**
 * 通行记录端点
 */
export const accessEndpoints: ApiEndpoint[] = [
  {
    name: '获取通行记录',
    method: 'GET',
    path: '/access/records',
    requiresAuth: true,
    description: '获取通行记录列表',
    expectedStatus: 200
  },
  {
    name: '创建通行记录',
    method: 'POST',
    path: '/access/records',
    requiresAuth: true,
    description: '创建通行记录',
    testData: {
      userId: 1,
      accessType: 'entry',
      location: '大厅',
      deviceId: 'device_001'
    },
    expectedStatus: 201
  }
]

/**
 * 所有端点分组
 */
export const apiEndpointGroups: ApiEndpointGroup[] = [
  {
    name: '认证服务',
    baseUrl: '/api/v1',
    endpoints: authEndpoints
  },
  {
    name: '商户管理',
    baseUrl: '/api/v1',
    endpoints: merchantEndpoints
  },
  {
    name: '访客管理',
    baseUrl: '/api/v1',
    endpoints: visitorEndpoints
  },
  {
    name: '员工管理',
    baseUrl: '/api/v1',
    endpoints: employeeEndpoints
  },
  {
    name: '通行记录',
    baseUrl: '/api/v1',
    endpoints: accessEndpoints
  }
]

/**
 * 获取所有端点
 */
export function getAllEndpoints(): ApiEndpoint[] {
  return apiEndpointGroups.flatMap(group => group.endpoints)
}

/**
 * 根据名称查找端点
 */
export function findEndpointByName(name: string): ApiEndpoint | undefined {
  return getAllEndpoints().find(endpoint => endpoint.name === name)
}

/**
 * 根据路径查找端点
 */
export function findEndpointByPath(path: string): ApiEndpoint | undefined {
  return getAllEndpoints().find(endpoint => endpoint.path === path)
}

/**
 * 获取需要认证的端点
 */
export function getAuthenticatedEndpoints(): ApiEndpoint[] {
  return getAllEndpoints().filter(endpoint => endpoint.requiresAuth)
}

/**
 * 获取公开端点
 */
export function getPublicEndpoints(): ApiEndpoint[] {
  return getAllEndpoints().filter(endpoint => !endpoint.requiresAuth)
}