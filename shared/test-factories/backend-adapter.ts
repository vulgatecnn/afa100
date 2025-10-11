/**
 * 后端测试数据工厂适配器 - MySQL适配版本
 * 为后端测试提供MySQL数据库兼容的数据格式
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
 * 后端数据库模型适配器 - MySQL适配版本
 */
export class BackendDataAdapter {
  /**
   * 转换用户数据为MySQL数据库格式
   */
  static adaptUserForDatabase(user: User) {
    return {
      id: user.id,
      open_id: user.openId,
      union_id: user.unionId,
      phone: user.phone,
      name: user.name,
      avatar: user.avatar,
      user_type: user.userType,
      status: user.status,
      merchant_id: user.merchantId,
      password: user.password,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    }
  }
  
  /**
   * 转换商户数据为MySQL数据库格式
   */
  static adaptMerchantForDatabase(merchant: Merchant) {
    return {
      id: merchant.id,
      name: merchant.name,
      code: merchant.code,
      contact: merchant.contact,
      phone: merchant.phone,
      email: merchant.email,
      address: merchant.address,
      status: merchant.status,
      settings: merchant.settings ? JSON.stringify(merchant.settings) : null,
      created_at: merchant.createdAt,
      updated_at: merchant.updatedAt
    }
  }
  
  /**
   * 转换访客申请数据为MySQL数据库格式
   */
  static adaptVisitorApplicationForDatabase(application: VisitorApplication) {
    return {
      id: application.id,
      applicant_id: application.applicantId,
      merchant_id: application.merchantId,
      visitee_id: application.visiteeId,
      visitor_name: application.visitorName,
      visitor_phone: application.visitorPhone,
      visitor_company: application.visitorCompany,
      visit_purpose: application.visitPurpose,
      visit_type: application.visitType,
      scheduled_time: application.scheduledTime,
      duration: application.duration,
      status: application.status,
      approved_by: application.approvedBy,
      approved_at: application.approvedAt,
      rejection_reason: application.rejectionReason,
      passcode: application.passcode,
      passcode_expiry: application.passcodeExpiry,
      usage_limit: application.usageLimit,
      usage_count: application.usageCount,
      created_at: application.createdAt,
      updated_at: application.updatedAt
    }
  }
  
  /**
   * 转换项目数据为MySQL数据库格式
   */
  static adaptProjectForDatabase(project: Project) {
    return {
      id: project.id,
      code: project.code,
      name: project.name,
      description: project.description,
      status: project.status,
      created_at: project.createdAt,
      updated_at: project.updatedAt
    }
  }
  
  /**
   * 转换场地数据为MySQL数据库格式
   */
  static adaptVenueForDatabase(venue: Venue) {
    return {
      id: venue.id,
      project_id: venue.projectId,
      code: venue.code,
      name: venue.name,
      description: venue.description,
      status: venue.status,
      created_at: venue.createdAt,
      updated_at: venue.updatedAt
    }
  }
  
  /**
   * 转换楼层数据为MySQL数据库格式
   */
  static adaptFloorForDatabase(floor: Floor) {
    return {
      id: floor.id,
      venue_id: floor.venueId,
      code: floor.code,
      name: floor.name,
      description: floor.description,
      status: floor.status,
      created_at: floor.createdAt,
      updated_at: floor.updatedAt
    }
  }
  
  /**
   * 转换通行码数据为MySQL数据库格式
   */
  static adaptPasscodeForDatabase(passcode: Passcode) {
    return {
      id: passcode.id,
      user_id: passcode.userId,
      code: passcode.code,
      type: passcode.type,
      status: passcode.status,
      expiry_time: passcode.expiryTime,
      usage_limit: passcode.usageLimit,
      usage_count: passcode.usageCount,
      permissions: passcode.permissions ? JSON.stringify(passcode.permissions) : null,
      application_id: passcode.applicationId,
      created_at: passcode.createdAt,
      updated_at: passcode.updatedAt
    }
  }
  
  /**
   * 转换通行记录数据为MySQL数据库格式
   */
  static adaptAccessRecordForDatabase(record: AccessRecord) {
    return {
      id: record.id,
      user_id: record.userId,
      passcode_id: record.passcodeId,
      device_id: record.deviceId,
      device_type: record.deviceType,
      direction: record.direction,
      result: record.result,
      fail_reason: record.failReason,
      project_id: record.projectId,
      venue_id: record.venueId,
      floor_id: record.floorId,
      timestamp: record.timestamp
    }
  }
}

/**
 * 后端测试数据工厂 - MySQL适配版本
 */
export class BackendTestFactory {
  /**
   * 创建MySQL兼容的用户数据
   */
  static createUser(overrides = {}) {
    const user = userFactory.create(overrides)
    return BackendDataAdapter.adaptUserForDatabase(user)
  }
  
  /**
   * 创建多个MySQL兼容的用户数据
   */
  static createUsers(count: number, overrides = {}) {
    return userFactory.createMany(count, overrides)
      .map(user => BackendDataAdapter.adaptUserForDatabase(user))
  }
  
  /**
   * 创建MySQL兼容的商户数据
   */
  static createMerchant(overrides = {}) {
    const merchant = merchantFactory.create(overrides)
    return BackendDataAdapter.adaptMerchantForDatabase(merchant)
  }
  
  /**
   * 创建多个MySQL兼容的商户数据
   */
  static createMerchants(count: number, overrides = {}) {
    return merchantFactory.createMany(count, overrides)
      .map(merchant => BackendDataAdapter.adaptMerchantForDatabase(merchant))
  }
  
  /**
   * 创建MySQL兼容的访客申请数据
   */
  static createVisitorApplication(overrides = {}) {
    const application = visitorApplicationFactory.create(overrides)
    return BackendDataAdapter.adaptVisitorApplicationForDatabase(application)
  }
  
  /**
   * 创建多个MySQL兼容的访客申请数据
   */
  static createVisitorApplications(count: number, overrides = {}) {
    return visitorApplicationFactory.createMany(count, overrides)
      .map(app => BackendDataAdapter.adaptVisitorApplicationForDatabase(app))
  }
  
  /**
   * 创建MySQL兼容的项目数据
   */
  static createProject(overrides = {}) {
    const project = projectFactory.create(overrides)
    return BackendDataAdapter.adaptProjectForDatabase(project)
  }
  
  /**
   * 创建多个MySQL兼容的项目数据
   */
  static createProjects(count: number, overrides = {}) {
    return projectFactory.createMany(count, overrides)
      .map(project => BackendDataAdapter.adaptProjectForDatabase(project))
  }
  
  /**
   * 创建MySQL兼容的场地数据
   */
  static createVenue(overrides = {}) {
    const venue = venueFactory.create(overrides)
    return BackendDataAdapter.adaptVenueForDatabase(venue)
  }
  
  /**
   * 创建多个MySQL兼容的场地数据
   */
  static createVenues(count: number, overrides = {}) {
    return venueFactory.createMany(count, overrides)
      .map(venue => BackendDataAdapter.adaptVenueForDatabase(venue))
  }
  
  /**
   * 创建MySQL兼容的楼层数据
   */
  static createFloor(overrides = {}) {
    const floor = floorFactory.create(overrides)
    return BackendDataAdapter.adaptFloorForDatabase(floor)
  }
  
  /**
   * 创建多个MySQL兼容的楼层数据
   */
  static createFloors(count: number, overrides = {}) {
    return floorFactory.createMany(count, overrides)
      .map(floor => BackendDataAdapter.adaptFloorForDatabase(floor))
  }
  
  /**
   * 创建MySQL兼容的通行码数据
   */
  static createPasscode(overrides = {}) {
    const passcode = passcodeFactory.create(overrides)
    return BackendDataAdapter.adaptPasscodeForDatabase(passcode)
  }
  
  /**
   * 创建多个MySQL兼容的通行码数据
   */
  static createPasscodes(count: number, overrides = {}) {
    return passcodeFactory.createMany(count, overrides)
      .map(passcode => BackendDataAdapter.adaptPasscodeForDatabase(passcode))
  }
  
  /**
   * 创建MySQL兼容的通行记录数据
   */
  static createAccessRecord(overrides = {}) {
    const record = accessRecordFactory.create(overrides)
    return BackendDataAdapter.adaptAccessRecordForDatabase(record)
  }
  
  /**
   * 创建多个MySQL兼容的通行记录数据
   */
  static createAccessRecords(count: number, overrides = {}) {
    return accessRecordFactory.createMany(count, overrides)
      .map(record => BackendDataAdapter.adaptAccessRecordForDatabase(record))
  }
  
  /**
   * 创建完整的MySQL测试场景数据
   */
  static createCompleteScenario() {
    const scenario = TestScenarioFactory.createMerchantScenario()
    
    return {
      merchant: BackendDataAdapter.adaptMerchantForDatabase(scenario.merchant),
      admin: BackendDataAdapter.adaptUserForDatabase(scenario.admin),
      employees: scenario.employees.map(emp => BackendDataAdapter.adaptUserForDatabase(emp)),
      project: BackendDataAdapter.adaptProjectForDatabase(scenario.project),
      venues: scenario.venues.map(venue => BackendDataAdapter.adaptVenueForDatabase(venue)),
      floors: scenario.floors.map(floor => BackendDataAdapter.adaptFloorForDatabase(floor))
    }
  }
  
  /**
   * 创建MySQL兼容的访客场景数据
   */
  static createVisitorScenario() {
    const scenario = TestScenarioFactory.createVisitorScenario()
    
    return {
      merchant: BackendDataAdapter.adaptMerchantForDatabase(scenario.merchant),
      admin: BackendDataAdapter.adaptUserForDatabase(scenario.admin),
      employees: scenario.employees.map(emp => BackendDataAdapter.adaptUserForDatabase(emp)),
      visitor: BackendDataAdapter.adaptUserForDatabase(scenario.visitor),
      project: BackendDataAdapter.adaptProjectForDatabase(scenario.project),
      venues: scenario.venues.map(venue => BackendDataAdapter.adaptVenueForDatabase(venue)),
      floors: scenario.floors.map(floor => BackendDataAdapter.adaptFloorForDatabase(floor)),
      visitorApplications: scenario.visitorApplications.map(app => 
        BackendDataAdapter.adaptVisitorApplicationForDatabase(app)
      ),
      passcodes: scenario.passcodes.map(passcode => 
        BackendDataAdapter.adaptPasscodeForDatabase(passcode)
      )
    }
  }
  
  /**
   * 创建MySQL兼容的通行记录场景数据
   */
  static createAccessRecordScenario() {
    const scenario = TestScenarioFactory.createAccessRecordScenario()
    
    return {
      ...this.createVisitorScenario(),
      accessRecords: scenario.accessRecords.map(record => 
        BackendDataAdapter.adaptAccessRecordForDatabase(record)
      )
    }
  }
}

// BackendDataAdapter is already exported as a class above