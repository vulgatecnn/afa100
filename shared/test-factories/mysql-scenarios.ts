/**
 * MySQL特定测试场景工厂
 * 专门为MySQL数据库约束和关系创建测试场景
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
 * MySQL测试场景工厂
 */
export class MySQLTestScenarioFactory {
  /**
   * 创建符合MySQL外键约束的完整数据集
   */
  static createConstraintCompliantDataSet() {
    // 1. 首先创建不依赖其他表的基础数据
    const projects = projectFactory.createMany(3, { status: 'active' })
    const merchants = merchantFactory.createMany(5, { status: 'active' })
    
    // 2. 创建依赖项目的场地数据
    const venues = projects.flatMap(project => 
      venueFactory.createMany(2, { 
        project_id: project.id, 
        status: 'active' 
      })
    )
    
    // 3. 创建依赖场地的楼层数据
    const floors = venues.flatMap(venue => 
      floorFactory.createMany(2, { 
        venue_id: venue.id, 
        status: 'active' 
      })
    )
    
    // 4. 创建用户数据（依赖商户）
    const users: User[] = [
      // 租务管理员（不依赖商户）
      userFactory.create({
        userType: 'tenant_admin',
        merchantId: undefined,
        status: 'active'
      }),
      // 商户管理员（每个商户一个）
      ...merchants.map(merchant => 
        userFactory.create({
          userType: 'merchant_admin',
          merchantId: merchant.id,
          status: 'active'
        })
      ),
      // 员工（每个商户2个）
      ...merchants.flatMap(merchant => 
        userFactory.createMany(2, {
          userType: 'employee',
          merchantId: merchant.id,
          status: 'active'
        })
      ),
      // 访客（不依赖商户）
      ...userFactory.createMany(5, {
        userType: 'visitor',
        merchantId: undefined,
        status: 'active'
      })
    ]
    
    // 5. 创建访客申请（依赖用户和商户）
    const visitors = users.filter(u => u.userType === 'visitor')
    const employees = users.filter(u => u.userType === 'employee')
    
    const visitorApplications = visitors.flatMap(visitor => 
      merchants.slice(0, 2).map(merchant => {
        const employee = employees.find(e => e.merchantId === merchant.id)
        return visitorApplicationFactory.create({
          applicant_id: visitor.id,
          merchant_id: merchant.id,
          visitee_id: employee?.id,
          status: 'approved'
        })
      })
    )
    
    // 6. 创建通行码（依赖用户和申请）
    const passcodes: Passcode[] = [
      // 员工通行码
      ...employees.map(employee => 
        passcodeFactory.create({
          user_id: employee.id,
          type: 'employee',
          status: 'active',
          usage_limit: 100,
          application_id: undefined
        })
      ),
      // 访客通行码（依赖申请）
      ...visitorApplications
        .filter(app => app.status === 'approved')
        .map(app => 
          passcodeFactory.create({
            userId: app.applicant_id,
            type: 'visitor',
            status: 'active',
            usage_limit: 10,
            application_id: app.id
          })
        )
    ]
    
    // 7. 创建通行记录（依赖用户、通行码、项目、场地、楼层）
    const accessRecords = passcodes.flatMap(passcode => 
      Array.from({ length: 3 }, () => 
        accessRecordFactory.create({
          user_id: passcode.user_id,
          passcode_id: passcode.id,
          project_id: projects[0].id,
          venue_id: venues[0].id,
          floor_id: floors[0].id,
          result: 'success'
        })
      )
    )
    
    return {
      projects,
      venues,
      floors,
      merchants,
      users,
      visitorApplications,
      passcodes,
      accessRecords
    }
  }
  
  /**
   * 创建MySQL性能测试数据集
   */
  static createPerformanceTestDataSet(scale: 'small' | 'medium' | 'large' = 'medium') {
    const scales = {
      small: { projects: 2, merchants: 5, usersPerMerchant: 3, applicationsPerUser: 2 },
      medium: { projects: 5, merchants: 20, usersPerMerchant: 10, applicationsPerUser: 5 },
      large: { projects: 10, merchants: 100, usersPerMerchant: 50, applicationsPerUser: 10 }
    }
    
    const config = scales[scale]
    
    // 创建基础数据
    const projects = projectFactory.createMany(config.projects, { status: 'active' })
    const merchants = merchantFactory.createMany(config.merchants, { status: 'active' })
    
    // 创建空间层级
    const venues = projects.flatMap(project => 
      venueFactory.createMany(3, { project_id: project.id, status: 'active' })
    )
    const floors = venues.flatMap(venue => 
      floorFactory.createMany(4, { venue_id: venue.id, status: 'active' })
    )
    
    // 创建用户
    const users = merchants.flatMap(merchant => [
      userFactory.create({
        userType: 'merchant_admin',
        merchantId: merchant.id,
        status: 'active'
      }),
      ...userFactory.createMany(config.usersPerMerchant, {
        userType: 'employee',
        merchantId: merchant.id,
        status: 'active'
      })
    ])
    
    // 创建访客
    const visitors = userFactory.createMany(config.merchants * 2, {
      userType: 'visitor',
      merchantId: undefined,
      status: 'active'
    })
    
    // 创建访客申请
    const visitorApplications = visitors.flatMap(visitor => 
      Array.from({ length: config.applicationsPerUser }, () => {
        const merchant = merchants[Math.floor(Math.random() * merchants.length)]
        const employee = users.find(u => u.merchantId === merchant.id && u.userType === 'employee')
        
        return visitorApplicationFactory.create({
          applicant_id: visitor.id,
          merchant_id: merchant.id,
          visitee_id: employee?.id,
          status: Math.random() > 0.3 ? 'approved' : 'pending'
        })
      })
    )
    
    // 创建通行码
    const passcodes = [
      ...users.map(user => 
        passcodeFactory.create({
          user_id: user.id,
          type: user.user_type === 'employee' ? 'employee' : 'visitor',
          status: 'active',
          usage_limit: user.user_type === 'employee' ? 100 : 10
        })
      ),
      ...visitorApplications
        .filter(app => app.status === 'approved')
        .map(app => 
          passcodeFactory.create({
            user_id: app.applicant_id,
            type: 'visitor',
            status: 'active',
            application_id: app.id
          })
        )
    ]
    
    // 创建通行记录
    const accessRecords = passcodes.flatMap(passcode => 
      Array.from({ length: Math.floor(Math.random() * 20) + 5 }, () => 
        accessRecordFactory.create({
          user_id: passcode.user_id,
          passcode_id: passcode.id,
          project_id: projects[Math.floor(Math.random() * projects.length)].id,
          venue_id: venues[Math.floor(Math.random() * venues.length)].id,
          floor_id: floors[Math.floor(Math.random() * floors.length)].id
        })
      )
    )
    
    return {
      projects,
      venues,
      floors,
      merchants,
      users: [...users, ...visitors],
      visitorApplications,
      passcodes,
      accessRecords,
      stats: {
        totalProjects: projects.length,
        totalVenues: venues.length,
        totalFloors: floors.length,
        totalMerchants: merchants.length,
        totalUsers: users.length + visitors.length,
        totalApplications: visitorApplications.length,
        totalPasscodes: passcodes.length,
        totalAccessRecords: accessRecords.length
      }
    }
  }
  
  /**
   * 创建MySQL边界条件测试数据
   */
  static createBoundaryTestDataSet() {
    // 测试各种边界条件和约束
    const projects = [
      projectFactory.create({ 
        code: 'A'.repeat(50), // 最大长度测试
        name: '测试项目',
        status: 'active' 
      }),
      projectFactory.create({ 
        code: 'MIN', // 最小长度测试
        name: '最小项目',
        status: 'inactive' 
      })
    ]
    
    const merchants = [
      merchantFactory.create({
        code: 'MCH001',
        name: '正常商户',
        status: 'active',
        settings: {
          maxEmployees: 1000,
          complexSettings: {
            nested: true,
            array: [1, 2, 3],
            nullValue: null
          }
        }
      }),
      merchantFactory.create({
        code: 'MCH002',
        name: '无设置商户',
        status: 'active',
        settings: undefined
      })
    ]
    
    const users = [
      // 测试各种用户类型
      userFactory.create({
        userType: 'tenant_admin',
        merchantId: undefined,
        openId: 'o'.repeat(28), // 最大长度
        unionId: 'u'.repeat(28),
        phone: '13800138000',
        status: 'active'
      }),
      userFactory.create({
        userType: 'visitor',
        merchantId: undefined,
        openId: 'short',
        unionId: undefined,
        phone: undefined,
        status: 'pending'
      })
    ]
    
    // 测试极端时间值
    const now = new Date()
    const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // 1年后
    const farPast = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) // 1年前
    
    const visitorApplications = [
      visitorApplicationFactory.create({
        applicant_id: users[1].id,
        merchant_id: merchants[0].id,
        scheduled_time: farFuture.toISOString(),
        duration: 1, // 最小时长
        status: 'pending'
      }),
      visitorApplicationFactory.create({
        applicant_id: users[1].id,
        merchant_id: merchants[0].id,
        scheduled_time: farPast.toISOString(),
        duration: 480, // 最大时长（8小时）
        status: 'expired'
      })
    ]
    
    return {
      projects,
      merchants,
      users,
      visitorApplications,
      testCases: [
        'Maximum string length fields',
        'Minimum string length fields',
        'NULL values in optional fields',
        'Complex JSON in settings',
        'Extreme date values',
        'All enum values',
        'Foreign key constraints'
      ]
    }
  }
  
  /**
   * 创建MySQL事务测试场景
   */
  static createTransactionTestScenario() {
    // 创建需要事务处理的复杂场景
    const merchant = merchantFactory.create({ status: 'active' })
    const admin = userFactory.create({
      userType: 'merchant_admin',
      merchantId: merchant.id,
      status: 'active'
    })
    const employee = userFactory.create({
      userType: 'employee',
      merchantId: merchant.id,
      status: 'active'
    })
    const visitor = userFactory.create({
      userType: 'visitor',
      merchantId: undefined,
      status: 'active'
    })
    
    // 创建需要同时更新多个表的申请
    const application = visitorApplicationFactory.create({
      applicant_id: visitor.id,
      merchant_id: merchant.id,
      visitee_id: employee.id,
      status: 'approved'
    })
    
    // 创建相关的通行码
    const passcode = passcodeFactory.create({
      user_id: visitor.id,
      type: 'visitor',
      status: 'active',
      application_id: application.id
    })
    
    return {
      merchant,
      admin,
      employee,
      visitor,
      application,
      passcode,
      transactionOperations: [
        'Create visitor application',
        'Approve application',
        'Generate passcode',
        'Update usage count',
        'Record access attempt',
        'Handle concurrent updates'
      ]
    }
  }
  
  /**
   * 验证数据集的MySQL约束兼容性
   */
  static validateMySQLConstraints(dataSet: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // 检查外键约束
    if (dataSet.venues) {
      dataSet.venues.forEach((venue: Venue) => {
        if (!dataSet.projects?.find((p: Project) => p.id === venue.project_id)) {
          errors.push(`Venue ${venue.id} references non-existent project ${venue.project_id}`)
        }
      })
    }
    
    if (dataSet.floors) {
      dataSet.floors.forEach((floor: Floor) => {
        if (!dataSet.venues?.find((v: Venue) => v.id === floor.venue_id)) {
          errors.push(`Floor ${floor.id} references non-existent venue ${floor.venue_id}`)
        }
      })
    }
    
    if (dataSet.users) {
      dataSet.users.forEach((user: User) => {
        if (user.merchantId && !dataSet.merchants?.find((m: Merchant) => m.id === user.merchantId)) {
          errors.push(`User ${user.id} references non-existent merchant ${user.merchantId}`)
        }
      })
    }
    
    // 检查唯一约束
    if (dataSet.merchants) {
      const codes = dataSet.merchants.map((m: Merchant) => m.code)
      const duplicateCodes = codes.filter((code, index) => codes.indexOf(code) !== index)
      if (duplicateCodes.length > 0) {
        errors.push(`Duplicate merchant codes: ${duplicateCodes.join(', ')}`)
      }
    }
    
    // 检查枚举值
    if (dataSet.users) {
      dataSet.users.forEach((user: User) => {
        const validUserTypes = ['tenant_admin', 'merchant_admin', 'employee', 'visitor']
        if (!validUserTypes.includes(user.userType)) {
          errors.push(`Invalid user type: ${user.userType}`)
        }
        
        const validStatuses = ['active', 'inactive', 'pending']
        if (!validStatuses.includes(user.status)) {
          errors.push(`Invalid user status: ${user.status}`)
        }
      })
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export default MySQLTestScenarioFactory