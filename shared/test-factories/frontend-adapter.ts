/**
 * 前端测试数据工厂适配器 - MySQL适配版本
 * 为前端测试提供API响应格式的数据
 */

import {
  userFactory,
  merchantFactory,
  visitorApplicationFactory,
  projectFactory,
  venueFactory,
  floorFactory,
  passcodeFactory,
  accessRecordFactory,
  TestScenarioFactory,
  type User,
  type Merchant,
  type VisitorApplication,
  type Project,
  type Venue,
  type Floor,
  type Passcode,
  type AccessRecord
} from './index'

/**
 * API响应格式
 */
export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
  timestamp: string
  code?: number
}

/**
 * 分页响应格式
 */
export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    current: number
    pageSize: number
    total: number
    totalPages: number
  }
}

/**
 * 前端API响应适配器
 */
export class FrontendApiAdapter {
  /**
   * 创建成功的API响应
   */
  static createSuccessResponse<T>(data: T, message = '操作成功'): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    }
  }
  
  /**
   * 创建错误的API响应
   */
  static createErrorResponse(message: string, code = 500): ApiResponse<null> {
    return {
      success: false,
      data: null,
      message,
      code,
      timestamp: new Date().toISOString()
    }
  }
  
  /**
   * 创建分页响应
   */
  static createPaginatedResponse<T>(
    items: T[], 
    page = 1, 
    pageSize = 10, 
    total?: number
  ): ApiResponse<PaginatedResponse<T>> {
    const actualTotal = total ?? items.length
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedItems = items.slice(startIndex, endIndex)
    
    return this.createSuccessResponse({
      items: paginatedItems,
      pagination: {
        current: page,
        pageSize,
        total: actualTotal,
        totalPages: Math.ceil(actualTotal / pageSize)
      }
    })
  }
  
  /**
   * 创建登录响应 - MySQL适配版本
   */
  static createLoginResponse(user: User) {
    return this.createSuccessResponse({
      accessToken: 'mock-jwt-token-' + user.id,
      refreshToken: 'mock-refresh-token-' + user.id,
      user: {
        id: user.id,
        openId: user.openId,
        unionId: user.unionId,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
        userType: user.userType,
        status: user.status,
        merchantId: user.merchantId
      }
    }, '登录成功')
  }
  
  /**
   * 创建用户信息响应 - MySQL适配版本
   */
  static createUserInfoResponse(user: User) {
    return this.createSuccessResponse({
      id: user.id,
      openId: user.openId,
      unionId: user.unionId,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      userType: user.userType,
      status: user.status,
      merchantId: user.merchantId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }, '获取用户信息成功')
  }
}

/**
 * 前端测试数据工厂
 */
export class FrontendTestFactory {
  /**
   * 创建用户列表API响应
   */
  static createUsersResponse(count = 5, overrides = {}) {
    const users = userFactory.createMany(count, overrides)
    return FrontendApiAdapter.createSuccessResponse(users, '获取用户列表成功')
  }
  
  /**
   * 创建分页用户列表API响应
   */
  static createPaginatedUsersResponse(count = 20, page = 1, pageSize = 10, overrides = {}) {
    const users = userFactory.createMany(count, overrides)
    return FrontendApiAdapter.createPaginatedResponse(users, page, pageSize)
  }
  
  /**
   * 创建商户列表API响应
   */
  static createMerchantsResponse(count = 5, overrides = {}) {
    const merchants = merchantFactory.createMany(count, overrides)
    return FrontendApiAdapter.createSuccessResponse(merchants, '获取商户列表成功')
  }
  
  /**
   * 创建分页商户列表API响应
   */
  static createPaginatedMerchantsResponse(count = 20, page = 1, pageSize = 10, overrides = {}) {
    const merchants = merchantFactory.createMany(count, overrides)
    return FrontendApiAdapter.createPaginatedResponse(merchants, page, pageSize)
  }
  
  /**
   * 创建访客申请列表API响应
   */
  static createVisitorApplicationsResponse(count = 10, overrides = {}) {
    const applications = visitorApplicationFactory.createMany(count, overrides)
    return FrontendApiAdapter.createSuccessResponse(applications, '获取访客申请列表成功')
  }
  
  /**
   * 创建分页访客申请列表API响应
   */
  static createPaginatedVisitorApplicationsResponse(count = 30, page = 1, pageSize = 10, overrides = {}) {
    const applications = visitorApplicationFactory.createMany(count, overrides)
    return FrontendApiAdapter.createPaginatedResponse(applications, page, pageSize)
  }
  
  /**
   * 创建项目列表API响应
   */
  static createProjectsResponse(count = 5, overrides = {}) {
    const projects = projectFactory.createMany(count, overrides)
    return FrontendApiAdapter.createSuccessResponse(projects, '获取项目列表成功')
  }
  
  /**
   * 创建场地列表API响应
   */
  static createVenuesResponse(count = 8, overrides = {}) {
    const venues = venueFactory.createMany(count, overrides)
    return FrontendApiAdapter.createSuccessResponse(venues, '获取场地列表成功')
  }
  
  /**
   * 创建楼层列表API响应
   */
  static createFloorsResponse(count = 10, overrides = {}) {
    const floors = floorFactory.createMany(count, overrides)
    return FrontendApiAdapter.createSuccessResponse(floors, '获取楼层列表成功')
  }
  
  /**
   * 创建通行码列表API响应
   */
  static createPasscodesResponse(count = 5, overrides = {}) {
    const passcodes = passcodeFactory.createMany(count, overrides)
    return FrontendApiAdapter.createSuccessResponse(passcodes, '获取通行码列表成功')
  }
  
  /**
   * 创建通行记录列表API响应
   */
  static createAccessRecordsResponse(count = 20, overrides = {}) {
    const records = accessRecordFactory.createMany(count, overrides)
    return FrontendApiAdapter.createSuccessResponse(records, '获取通行记录成功')
  }
  
  /**
   * 创建分页通行记录列表API响应
   */
  static createPaginatedAccessRecordsResponse(count = 50, page = 1, pageSize = 10, overrides = {}) {
    const records = accessRecordFactory.createMany(count, overrides)
    return FrontendApiAdapter.createPaginatedResponse(records, page, pageSize)
  }
  
  /**
   * 创建登录API响应
   */
  static createLoginResponse(userOverrides = {}) {
    const user = userFactory.create(userOverrides)
    return FrontendApiAdapter.createLoginResponse(user)
  }
  
  /**
   * 创建用户信息API响应
   */
  static createUserInfoResponse(userOverrides = {}) {
    const user = userFactory.create(userOverrides)
    return FrontendApiAdapter.createUserInfoResponse(user)
  }
  
  /**
   * 创建创建操作API响应
   */
  static createCreateResponse<T>(data: T, resourceName = '资源') {
    return FrontendApiAdapter.createSuccessResponse(data, `创建${resourceName}成功`)
  }
  
  /**
   * 创建更新操作API响应
   */
  static createUpdateResponse<T>(data: T, resourceName = '资源') {
    return FrontendApiAdapter.createSuccessResponse(data, `更新${resourceName}成功`)
  }
  
  /**
   * 创建删除操作API响应
   */
  static createDeleteResponse(resourceName = '资源') {
    return FrontendApiAdapter.createSuccessResponse(null, `删除${resourceName}成功`)
  }
  
  /**
   * 创建验证错误响应
   */
  static createValidationErrorResponse(errors: Record<string, string[]>) {
    return {
      success: false,
      code: 422,
      message: '表单验证失败',
      data: { errors },
      timestamp: new Date().toISOString()
    }
  }
  
  /**
   * 创建权限错误响应
   */
  static createPermissionErrorResponse() {
    return FrontendApiAdapter.createErrorResponse('权限不足', 403)
  }
  
  /**
   * 创建未找到错误响应
   */
  static createNotFoundErrorResponse(resource = '资源') {
    return FrontendApiAdapter.createErrorResponse(`${resource}不存在`, 404)
  }
  
  /**
   * 创建服务器错误响应
   */
  static createServerErrorResponse() {
    return FrontendApiAdapter.createErrorResponse('服务器内部错误', 500)
  }
  
  /**
   * 创建完整的仪表板数据响应 - MySQL适配版本
   */
  static createDashboardDataResponse() {
    const scenario = TestScenarioFactory.createAccessRecordScenario()
    
    return FrontendApiAdapter.createSuccessResponse({
      stats: {
        totalMerchants: 25,
        activeMerchants: 20,
        totalProjects: 8,
        activeProjects: 6,
        totalVenues: 15,
        activeVenues: 12,
        totalEmployees: 150,
        activeEmployees: 140,
        todayVisitors: 45,
        todayAccessRecords: 320,
        pendingApplications: 12,
        activePasscodes: 85
      },
      recentAccessRecords: scenario.accessRecords.slice(0, 10),
      pendingApplications: scenario.visitorApplications.filter(app => app.status === 'pending'),
      activePasscodes: scenario.passcodes.filter(code => code.status === 'active'),
      projects: scenario.project ? [scenario.project] : [],
      venues: scenario.venues || [],
      floors: scenario.floors || []
    }, '获取仪表板数据成功')
  }
  
  /**
   * 创建空间层级结构响应
   */
  static createSpaceHierarchyResponse() {
    const projects = projectFactory.createMany(3, { status: 'active' })
    const venues = projects.flatMap(project => 
      venueFactory.createMany(2, { project_id: project.id, status: 'active' })
    )
    const floors = venues.flatMap(venue => 
      floorFactory.createMany(3, { venue_id: venue.id, status: 'active' })
    )
    
    const hierarchy = projects.map(project => ({
      ...project,
      venues: venues
        .filter(venue => venue.project_id === project.id)
        .map(venue => ({
          ...venue,
          floors: floors.filter(floor => floor.venue_id === venue.id)
        }))
    }))
    
    return FrontendApiAdapter.createSuccessResponse(hierarchy, '获取空间层级结构成功')
  }
}

// 导出适配器和工厂
export { FrontendApiAdapter }