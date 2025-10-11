/**
 * 小程序测试数据工厂适配器 - MySQL适配版本
 * 为小程序测试提供微信API格式的数据
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
 * 微信API响应格式
 */
export interface WxApiResponse<T> {
  statusCode: number
  data: {
    success: boolean
    data: T
    message: string
    timestamp: string
    code?: number
  }
  header?: Record<string, string>
}

/**
 * 微信登录响应格式
 */
export interface WxLoginResponse {
  code: string
  errMsg?: string
}

/**
 * 微信用户信息响应格式
 */
export interface WxUserInfoResponse {
  userInfo: {
    nickName: string
    avatarUrl: string
    gender: number
    city: string
    province: string
    country: string
  }
  rawData: string
  signature: string
  encryptedData: string
  iv: string
  errMsg?: string
}

/**
 * 微信系统信息响应格式
 */
export interface WxSystemInfoResponse {
  brand: string
  model: string
  pixelRatio: number
  screenWidth: number
  screenHeight: number
  windowWidth: number
  windowHeight: number
  statusBarHeight: number
  language: string
  version: string
  system: string
  platform: string
  fontSizeSetting: number
  SDKVersion: string
  benchmarkLevel: number
  albumAuthorized: boolean
  cameraAuthorized: boolean
  locationAuthorized: boolean
  microphoneAuthorized: boolean
  notificationAuthorized: boolean
  notificationAlertAuthorized: boolean
  notificationBadgeAuthorized: boolean
  notificationSoundAuthorized: boolean
  bluetoothEnabled: boolean
  locationEnabled: boolean
  wifiEnabled: boolean
  safeArea: {
    left: number
    right: number
    top: number
    bottom: number
    width: number
    height: number
  }
}

/**
 * 小程序API响应适配器
 */
export class MiniprogramApiAdapter {
  /**
   * 创建成功的微信API响应
   */
  static createWxSuccessResponse<T>(data: T, message = '操作成功'): WxApiResponse<T> {
    return {
      statusCode: 200,
      data: {
        success: true,
        data,
        message,
        timestamp: new Date().toISOString()
      },
      header: {
        'Content-Type': 'application/json'
      }
    }
  }
  
  /**
   * 创建错误的微信API响应
   */
  static createWxErrorResponse(message: string, code = 500): WxApiResponse<null> {
    return {
      statusCode: code >= 400 ? code : 400,
      data: {
        success: false,
        data: null,
        message,
        code,
        timestamp: new Date().toISOString()
      },
      header: {
        'Content-Type': 'application/json'
      }
    }
  }
  
  /**
   * 创建微信登录响应
   */
  static createWxLoginResponse(): WxLoginResponse {
    return {
      code: 'mock-wx-code-' + Date.now(),
      errMsg: 'login:ok'
    }
  }
  
  /**
   * 创建微信用户信息响应
   */
  static createWxUserInfoResponse(): WxUserInfoResponse {
    const user = userFactory.create()
    return {
      userInfo: {
        nickName: user.name,
        avatarUrl: 'https://wx.qlogo.cn/mmopen/mock-avatar.png',
        gender: 1,
        city: '深圳',
        province: '广东',
        country: '中国'
      },
      rawData: JSON.stringify({
        nickName: user.name,
        gender: 1,
        city: '深圳',
        province: '广东',
        country: '中国'
      }),
      signature: 'mock-signature',
      encryptedData: 'mock-encrypted-data',
      iv: 'mock-iv',
      errMsg: 'getUserInfo:ok'
    }
  }
  
  /**
   * 创建微信系统信息响应
   */
  static createWxSystemInfoResponse(): WxSystemInfoResponse {
    return {
      brand: 'iPhone',
      model: 'iPhone 12',
      pixelRatio: 3,
      screenWidth: 390,
      screenHeight: 844,
      windowWidth: 390,
      windowHeight: 844,
      statusBarHeight: 44,
      language: 'zh_CN',
      version: '8.0.5',
      system: 'iOS 15.0',
      platform: 'ios',
      fontSizeSetting: 16,
      SDKVersion: '2.19.4',
      benchmarkLevel: 1,
      albumAuthorized: true,
      cameraAuthorized: true,
      locationAuthorized: true,
      microphoneAuthorized: true,
      notificationAuthorized: true,
      notificationAlertAuthorized: true,
      notificationBadgeAuthorized: true,
      notificationSoundAuthorized: true,
      bluetoothEnabled: true,
      locationEnabled: true,
      wifiEnabled: true,
      safeArea: {
        left: 0,
        right: 390,
        top: 44,
        bottom: 810,
        width: 390,
        height: 766
      }
    }
  }
  
  /**
   * 创建小程序页面数据格式
   */
  static createPageData<T>(data: T) {
    return {
      ...data,
      loading: false,
      error: null,
      refreshing: false
    }
  }
}

/**
 * 小程序测试数据工厂
 */
export class MiniprogramTestFactory {
  /**
   * 创建商户列表API响应
   */
  static createMerchantsResponse(count = 5, overrides = {}) {
    const merchants = merchantFactory.createMany(count, overrides)
    return MiniprogramApiAdapter.createWxSuccessResponse(merchants, '获取商户列表成功')
  }
  
  /**
   * 创建访客申请提交响应
   */
  static createSubmitApplicationResponse(overrides = {}) {
    const application = visitorApplicationFactory.create({
      status: 'pending',
      ...overrides
    })
    return MiniprogramApiAdapter.createWxSuccessResponse(application, '申请提交成功')
  }
  
  /**
   * 创建我的申请列表响应
   */
  static createMyApplicationsResponse(count = 3, overrides = {}) {
    const applications = visitorApplicationFactory.createMany(count, overrides)
    return MiniprogramApiAdapter.createWxSuccessResponse(applications, '获取申请列表成功')
  }
  
  /**
   * 创建通行码响应 - MySQL适配版本
   */
  static createPasscodeResponse(overrides = {}) {
    const passcode = passcodeFactory.create({
      status: 'active',
      type: 'visitor',
      ...overrides
    })
    const expiryTime = passcode.expiryTime ? new Date(passcode.expiryTime) : new Date(Date.now() + 24 * 60 * 60 * 1000)
    
    return MiniprogramApiAdapter.createWxSuccessResponse({
      passcode,
      qrCodeUrl: `data:image/png;base64,mock-qr-code-${passcode.id}`,
      expiresIn: Math.floor((expiryTime.getTime() - Date.now()) / 1000),
      usageRemaining: (passcode.usageLimit || 10) - passcode.usageCount,
      permissions: passcode.permissions
    }, '获取通行码成功')
  }
  
  /**
   * 创建员工通行码响应 - MySQL适配版本
   */
  static createEmployeePasscodeResponse(overrides = {}) {
    const passcode = passcodeFactory.create({
      status: 'active',
      type: 'employee',
      usageLimit: 100,
      ...overrides
    })
    
    return MiniprogramApiAdapter.createWxSuccessResponse({
      passcode,
      qrCodeUrl: `data:image/png;base64,mock-employee-qr-code-${passcode.id}`,
      refreshInterval: 300, // 5分钟刷新一次
      autoRefresh: true,
      usageRemaining: (passcode.usageLimit || 100) - passcode.usageCount,
      permissions: passcode.permissions
    }, '获取员工通行码成功')
  }
  
  /**
   * 创建待审批申请列表响应
   */
  static createPendingApplicationsResponse(count = 5, overrides = {}) {
    const applications = visitorApplicationFactory.createMany(count, {
      status: 'pending',
      ...overrides
    })
    return MiniprogramApiAdapter.createWxSuccessResponse(applications, '获取待审批申请成功')
  }
  
  /**
   * 创建审批操作响应
   */
  static createApprovalResponse(approved = true) {
    const message = approved ? '审批通过' : '审批拒绝'
    return MiniprogramApiAdapter.createWxSuccessResponse({ approved }, message)
  }
  
  /**
   * 创建员工申请响应
   */
  static createEmployeeApplicationResponse(overrides = {}) {
    const application = {
      id: Date.now(),
      employeeName: userFactory.create().name,
      idCard: '440300199001011234',
      phone: '13800138000',
      department: '技术部',
      position: '软件工程师',
      status: 'pending',
      merchantId: merchantFactory.create().id,
      createdAt: new Date().toISOString(),
      ...overrides
    }
    return MiniprogramApiAdapter.createWxSuccessResponse(application, '员工申请提交成功')
  }
  
  /**
   * 创建小程序页面初始数据
   */
  static createPageInitialData() {
    return MiniprogramApiAdapter.createPageData({
      userInfo: null,
      isLoggedIn: false,
      merchants: [],
      applications: [],
      passcode: null,
      systemInfo: MiniprogramApiAdapter.createWxSystemInfoResponse()
    })
  }
  
  /**
   * 创建访客申请页面数据
   */
  static createVisitorApplyPageData() {
    const merchants = merchantFactory.createMany(3, { status: 'active' })
    return MiniprogramApiAdapter.createPageData({
      merchants,
      selectedMerchant: null,
      formData: {
        visitorName: '',
        phone: '',
        company: '',
        purpose: '',
        visitDate: '',
        duration: 2
      },
      submitting: false
    })
  }
  
  /**
   * 创建员工申请页面数据
   */
  static createEmployeeApplyPageData() {
    const merchants = merchantFactory.createMany(3, { status: 'active' })
    return MiniprogramApiAdapter.createPageData({
      merchants,
      selectedMerchant: null,
      formData: {
        employeeName: '',
        idCard: '',
        phone: '',
        department: '',
        position: ''
      },
      submitting: false
    })
  }
  
  /**
   * 创建通行码展示页面数据 - MySQL适配版本
   */
  static createPasscodeDisplayPageData(type: 'visitor' | 'employee' = 'visitor') {
    const passcode = passcodeFactory.create({ 
      type, 
      status: 'active',
      usageLimit: type === 'employee' ? 100 : 10
    })
    const usageRemaining = (passcode.usageLimit || 10) - passcode.usageCount
    const isExpired = passcode.expiryTime ? new Date(passcode.expiryTime) < new Date() : false
    
    return MiniprogramApiAdapter.createPageData({
      passcode,
      qrCodeUrl: `data:image/png;base64,mock-qr-code-${passcode.id}`,
      statusText: type === 'employee' ? '员工通行码' : `剩余 ${usageRemaining} 次使用`,
      isExpired,
      refreshing: false,
      autoRefresh: type === 'employee',
      permissions: passcode.permissions,
      usageRemaining
    })
  }
  
  /**
   * 创建我的申请页面数据
   */
  static createMyApplicationsPageData() {
    const applications = visitorApplicationFactory.createMany(5)
    return MiniprogramApiAdapter.createPageData({
      applications,
      activeTab: 'all',
      refreshing: false
    })
  }
  
  /**
   * 创建错误响应
   */
  static createErrorResponse(message: string, code = 500) {
    return MiniprogramApiAdapter.createWxErrorResponse(message, code)
  }
  
  /**
   * 创建网络错误响应
   */
  static createNetworkErrorResponse() {
    return this.createErrorResponse('网络连接失败，请检查网络设置', 0)
  }
  
  /**
   * 创建权限错误响应
   */
  static createPermissionErrorResponse() {
    return this.createErrorResponse('权限不足，请联系管理员', 403)
  }
  
  /**
   * 创建验证错误响应
   */
  static createValidationErrorResponse(message = '数据验证失败') {
    return this.createErrorResponse(message, 422)
  }
  
  /**
   * 创建项目列表响应
   */
  static createProjectsResponse(count = 3, overrides = {}) {
    const projects = projectFactory.createMany(count, overrides)
    return MiniprogramApiAdapter.createWxSuccessResponse(projects, '获取项目列表成功')
  }
  
  /**
   * 创建场地列表响应
   */
  static createVenuesResponse(count = 5, overrides = {}) {
    const venues = venueFactory.createMany(count, overrides)
    return MiniprogramApiAdapter.createWxSuccessResponse(venues, '获取场地列表成功')
  }
  
  /**
   * 创建楼层列表响应
   */
  static createFloorsResponse(count = 8, overrides = {}) {
    const floors = floorFactory.createMany(count, overrides)
    return MiniprogramApiAdapter.createWxSuccessResponse(floors, '获取楼层列表成功')
  }
  
  /**
   * 创建空间层级结构响应
   */
  static createSpaceHierarchyResponse() {
    const projects = projectFactory.createMany(2, { status: 'active' })
    const venues = projects.flatMap(project => 
      venueFactory.createMany(2, { projectId: project.id, status: 'active' })
    )
    const floors = venues.flatMap(venue => 
      floorFactory.createMany(2, { venueId: venue.id, status: 'active' })
    )
    
    const hierarchy = projects.map(project => ({
      ...project,
      venues: venues
        .filter(venue => venue.projectId === project.id)
        .map(venue => ({
          ...venue,
          floors: floors.filter(floor => floor.venueId === venue.id)
        }))
    }))
    
    return MiniprogramApiAdapter.createWxSuccessResponse(hierarchy, '获取空间层级结构成功')
  }
  
  /**
   * 创建访客申请详情页面数据
   */
  static createVisitorApplicationDetailPageData(applicationId: number) {
    const application = visitorApplicationFactory.create({ id: applicationId })
    const merchant = merchantFactory.create({ id: application.merchantId })
    
    return MiniprogramApiAdapter.createPageData({
      application,
      merchant,
      canCancel: application.status === 'pending',
      canReapply: ['rejected', 'expired'].includes(application.status),
      statusText: {
        pending: '待审批',
        approved: '已通过',
        rejected: '已拒绝',
        expired: '已过期',
        completed: '已完成'
      }[application.status] || '未知状态'
    })
  }
  
  /**
   * 创建通行记录页面数据
   */
  static createAccessRecordsPageData(userId: number) {
    const records = accessRecordFactory.createMany(10, { userId })
    
    return MiniprogramApiAdapter.createPageData({
      records,
      stats: {
        todayCount: records.filter(r => {
          const today = new Date().toDateString()
          return new Date(r.timestamp).toDateString() === today
        }).length,
        successRate: Math.round((records.filter(r => r.result === 'success').length / records.length) * 100)
      },
      refreshing: false
    })
  }
}

// 导出适配器和工厂
export { MiniprogramApiAdapter }