/**
 * 跨平台测试数据工厂系统 - MySQL适配版本
 * 为后端、前端、小程序提供统一的测试数据生成
 * 适配MySQL数据类型和约束
 */

import { faker } from '@faker-js/faker'

// 设置中文语言环境
// faker.locale = 'zh_CN' // Commented out due to API changes

/**
 * 通用数据工厂接口
 */
export interface TestDataFactory<T> {
  create(overrides?: Partial<T>): T
  createMany(count: number, overrides?: Partial<T>): T[]
  build(overrides?: Partial<T>): T
}

/**
 * 用户数据类型 - MySQL适配版本
 */
export interface User {
  id: number
  openId?: string
  unionId?: string
  phone?: string
  name: string
  avatar?: string
  userType: 'tenant_admin' | 'merchant_admin' | 'employee' | 'visitor'
  status: 'active' | 'inactive' | 'pending'
  merchantId?: number
  password?: string
  createdAt: string
  updatedAt: string
}

/**
 * 商户数据类型 - MySQL适配版本
 */
export interface Merchant {
  id: number
  name: string
  code: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  status: 'active' | 'inactive'
  settings?: Record<string, any>
  createdAt: string
  updatedAt: string
}

/**
 * 访客申请数据类型 - MySQL适配版本
 */
export interface VisitorApplication {
  id: number
  applicantId: number
  merchantId: number
  visiteeId?: number
  visitorName: string
  visitorPhone: string
  visitorCompany?: string
  visitPurpose: string
  visitType?: 'business' | 'personal' | 'interview' | 'meeting'
  scheduledTime: string
  duration: number
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'completed'
  approvedBy?: number
  approvedAt?: string
  rejectionReason?: string
  passcode?: string
  passcodeExpiry?: string
  usageLimit: number
  usageCount: number
  createdAt: string
  updatedAt: string
}

/**
 * 项目数据类型 - MySQL适配版本
 */
export interface Project {
  id: number
  code: string
  name: string
  description?: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

/**
 * 场地数据类型 - MySQL适配版本
 */
export interface Venue {
  id: number
  projectId: number
  code: string
  name: string
  description?: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

/**
 * 楼层数据类型 - MySQL适配版本
 */
export interface Floor {
  id: number
  venueId: number
  code: string
  name: string
  description?: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

/**
 * 通行码数据类型 - MySQL适配版本
 */
export interface Passcode {
  id: number
  userId: number
  code: string
  type: 'employee' | 'visitor'
  status: 'active' | 'expired' | 'revoked'
  expiryTime?: string
  usageLimit?: number
  usageCount: number
  permissions?: Record<string, any>
  applicationId?: number
  createdAt: string
  updatedAt: string
}

/**
 * 通行记录数据类型 - MySQL适配版本
 */
export interface AccessRecord {
  id: number
  userId: number
  passcodeId?: number
  deviceId: string
  deviceType?: string
  direction: 'in' | 'out'
  result: 'success' | 'failed'
  failReason?: string
  projectId?: number
  venueId?: number
  floorId?: number
  timestamp: string
}

/**
 * 用户数据工厂 - MySQL适配版本
 */
export const userFactory: TestDataFactory<User> = {
  create: (overrides = {}) => ({
    id: faker.number.int({ min: 1, max: 10000 }),
    openId: faker.string.alphanumeric(28),
    unionId: faker.string.alphanumeric(28),
    phone: faker.phone.number(),
    name: faker.person.fullName(),
    avatar: faker.helpers.maybe(() => faker.image.avatar(), { probability: 0.7 }),
    userType: faker.helpers.arrayElement(['tenant_admin', 'merchant_admin', 'employee', 'visitor']),
    status: faker.helpers.arrayElement(['active', 'inactive', 'pending']),
    merchantId: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 100 }), { probability: 0.8 }) || undefined,
    password: faker.helpers.maybe(() => `$2b$10$${faker.string.alphanumeric(53)}`, { probability: 0.9 }),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides
  }),
  
  createMany: (count, overrides = {}) => 
    Array.from({ length: count }, () => userFactory.create(overrides)),
    
  build: (overrides = {}) => userFactory.create(overrides)
}

/**
 * 商户数据工厂 - MySQL适配版本
 */
export const merchantFactory: TestDataFactory<Merchant> = {
  create: (overrides = {}) => ({
    id: faker.number.int({ min: 1, max: 1000 }),
    name: faker.company.name(),
    code: `MCH${faker.string.numeric(3).padStart(3, '0')}`,
    contact: faker.person.fullName(),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    address: faker.location.streetAddress({ useFullAddress: true }),
    status: faker.helpers.arrayElement(['active', 'inactive']),
    settings: {
      maxEmployees: faker.number.int({ min: 10, max: 100 }),
      maxVisitors: faker.number.int({ min: 5, max: 50 }),
      workingHours: {
        start: '09:00',
        end: '18:00'
      },
      allowWeekendAccess: faker.datatype.boolean(),
      allowVisitorSelfApply: faker.datatype.boolean(),
      maxVisitorDuration: faker.number.int({ min: 1, max: 24 }),
      requireApproval: faker.datatype.boolean()
    },
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides
  }),
  
  createMany: (count, overrides = {}) =>
    Array.from({ length: count }, () => merchantFactory.create(overrides)),
    
  build: (overrides = {}) => merchantFactory.create(overrides)
}

/**
 * 访客申请数据工厂 - MySQL适配版本
 */
export const visitorApplicationFactory: TestDataFactory<VisitorApplication> = {
  create: (overrides = {}) => {
    const scheduledTime = faker.date.future()
    const duration = faker.number.int({ min: 30, max: 480 }) // 30分钟到8小时
    
    return {
      id: faker.number.int({ min: 1, max: 10000 }),
      applicantId: faker.number.int({ min: 1, max: 1000 }),
      merchantId: faker.number.int({ min: 1, max: 100 }),
      visiteeId: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 1000 }), { probability: 0.8 }),
      visitorName: faker.person.fullName(),
      visitorPhone: faker.phone.number(),
      visitorCompany: faker.helpers.maybe(() => faker.company.name(), { probability: 0.8 }),
      visitPurpose: faker.helpers.arrayElement(['商务洽谈', '技术交流', '参观访问', '会议讨论', '项目合作', '面试', '培训']),
      visitType: faker.helpers.arrayElement(['business', 'personal', 'interview', 'meeting']),
      scheduledTime: scheduledTime.toISOString(),
      duration,
      status: faker.helpers.arrayElement(['pending', 'approved', 'rejected', 'expired', 'completed']),
      approvedBy: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 100 }), { probability: 0.6 }),
      approvedAt: faker.helpers.maybe(() => faker.date.recent().toISOString(), { probability: 0.6 }),
      rejectionReason: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.2 }),
      passcode: faker.helpers.maybe(() => `PASS${faker.string.numeric(3)}`, { probability: 0.7 }),
      passcodeExpiry: faker.helpers.maybe(() => faker.date.future().toISOString(), { probability: 0.7 }),
      usageLimit: faker.number.int({ min: 1, max: 10 }),
      usageCount: faker.number.int({ min: 0, max: 5 }),
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      ...overrides
    }
  },
  
  createMany: (count, overrides = {}) =>
    Array.from({ length: count }, () => visitorApplicationFactory.create(overrides)),
    
  build: (overrides = {}) => visitorApplicationFactory.create(overrides)
}

/**
 * 项目数据工厂 - MySQL适配版本
 */
export const projectFactory: TestDataFactory<Project> = {
  create: (overrides = {}) => ({
    id: faker.number.int({ min: 1, max: 1000 }),
    code: `PRJ${faker.string.numeric(3).padStart(3, '0')}`,
    name: `${faker.company.name()}项目`,
    description: faker.lorem.sentence(),
    status: faker.helpers.arrayElement(['active', 'inactive']),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides
  }),
  
  createMany: (count, overrides = {}) =>
    Array.from({ length: count }, () => projectFactory.create(overrides)),
    
  build: (overrides = {}) => projectFactory.create(overrides)
}

/**
 * 场地数据工厂 - MySQL适配版本
 */
export const venueFactory: TestDataFactory<Venue> = {
  create: (overrides = {}) => ({
    id: faker.number.int({ min: 1, max: 1000 }),
    projectId: faker.number.int({ min: 1, max: 100 }),
    code: `VEN${faker.string.numeric(3).padStart(3, '0')}`,
    name: `${faker.helpers.arrayElement(['A座', 'B座', 'C座', 'D座'])}大楼`,
    description: faker.lorem.sentence(),
    status: faker.helpers.arrayElement(['active', 'inactive']),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides
  }),
  
  createMany: (count, overrides = {}) =>
    Array.from({ length: count }, () => venueFactory.create(overrides)),
    
  build: (overrides = {}) => venueFactory.create(overrides)
}

/**
 * 楼层数据工厂 - MySQL适配版本
 */
export const floorFactory: TestDataFactory<Floor> = {
  create: (overrides = {}) => ({
    id: faker.number.int({ min: 1, max: 1000 }),
    venueId: faker.number.int({ min: 1, max: 100 }),
    code: `FL${faker.string.numeric(3).padStart(3, '0')}`,
    name: `${faker.number.int({ min: 1, max: 30 })}楼`,
    description: faker.lorem.sentence(),
    status: faker.helpers.arrayElement(['active', 'inactive']),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides
  }),
  
  createMany: (count, overrides = {}) =>
    Array.from({ length: count }, () => floorFactory.create(overrides)),
    
  build: (overrides = {}) => floorFactory.create(overrides)
}

/**
 * 通行码数据工厂 - MySQL适配版本
 */
export const passcodeFactory: TestDataFactory<Passcode> = {
  create: (overrides = {}) => {
    const type = faker.helpers.arrayElement(['employee', 'visitor'])
    const expiryTime = type === 'visitor' 
      ? faker.date.future() 
      : faker.date.future()
    
    return {
      id: faker.number.int({ min: 1, max: 10000 }),
      userId: faker.number.int({ min: 1, max: 1000 }),
      code: type === 'employee' 
        ? `EMP${faker.string.numeric(3).padStart(3, '0')}`
        : `VIS${faker.string.numeric(3).padStart(3, '0')}`,
      type,
      status: faker.helpers.arrayElement(['active', 'expired', 'revoked']),
      expiryTime: faker.helpers.maybe(() => expiryTime.toISOString(), { probability: 0.9 }),
      usageLimit: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 100 }), { probability: 0.8 }),
      usageCount: faker.number.int({ min: 0, max: 10 }),
      permissions: {
        projects: faker.helpers.arrayElements([1, 2, 3], faker.number.int({ min: 1, max: 3 })),
        venues: faker.helpers.arrayElements([1, 2, 3, 4], faker.number.int({ min: 1, max: 2 })),
        floors: faker.helpers.arrayElements([1, 2, 3, 4, 5], faker.number.int({ min: 1, max: 3 }))
      },
      applicationId: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 1000 }), { probability: 0.6 }),
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      ...overrides
    }
  },
  
  createMany: (count, overrides = {}) =>
    Array.from({ length: count }, () => passcodeFactory.create(overrides)),
    
  build: (overrides = {}) => passcodeFactory.create(overrides)
}

/**
 * 通行记录数据工厂 - MySQL适配版本
 */
export const accessRecordFactory: TestDataFactory<AccessRecord> = {
  create: (overrides = {}) => ({
    id: faker.number.int({ min: 1, max: 100000 }),
    userId: faker.number.int({ min: 1, max: 1000 }),
    passcodeId: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 10000 }), { probability: 0.9 }),
    deviceId: `DEVICE${faker.string.numeric(3).padStart(3, '0')}`,
    deviceType: faker.helpers.arrayElement(['card_reader', 'qr_scanner', 'face_recognition', 'fingerprint']),
    direction: faker.helpers.arrayElement(['in', 'out']),
    result: faker.helpers.arrayElement(['success', 'failed']),
    failReason: faker.helpers.maybe(() => 
      faker.helpers.arrayElement(['通行码已过期', '权限不足', '设备故障', '网络异常', '人脸识别失败', '指纹不匹配']), 
      { probability: 0.2 }
    ),
    projectId: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 10 }), { probability: 0.8 }),
    venueId: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 20 }), { probability: 0.8 }),
    floorId: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 50 }), { probability: 0.6 }),
    timestamp: faker.date.recent().toISOString(),
    ...overrides
  }),
  
  createMany: (count, overrides = {}) =>
    Array.from({ length: count }, () => accessRecordFactory.create(overrides)),
    
  build: (overrides = {}) => accessRecordFactory.create(overrides)
}

/**
 * 创建测试场景数据 - MySQL适配版本
 */
export class TestScenarioFactory {
  /**
   * 创建完整的商户场景数据
   */
  static createMerchantScenario() {
    const merchant = merchantFactory.create()
    const admin = userFactory.create({
      userType: 'merchant_admin',
      merchantId: merchant.id,
      status: 'active'
    })
    const employees = userFactory.createMany(3, {
      userType: 'employee',
      merchantId: merchant.id,
      status: 'active'
    })
    
    // 创建项目、场地、楼层的层级结构
    const project = projectFactory.create({ status: 'active' })
    const venues = venueFactory.createMany(2, { 
      projectId: project.id,
      status: 'active' 
    })
    const floors = floorFactory.createMany(3, {
      venueId: venues[0].id,
      status: 'active'
    })
    
    return {
      merchant,
      admin,
      employees,
      project,
      venues,
      floors
    }
  }
  
  /**
   * 创建访客申请场景数据
   */
  static createVisitorScenario() {
    const merchantScenario = this.createMerchantScenario()
    
    // 创建访客用户
    const visitor = userFactory.create({
      userType: 'visitor',
      merchantId: undefined,
      status: 'active'
    })
    
    const visitorApplications = visitorApplicationFactory.createMany(5, {
      merchantId: merchantScenario.merchant.id,
      applicantId: visitor.id,
      visiteeId: merchantScenario.employees[0].id,
      status: 'approved'
    })
    
    const passcodes = passcodeFactory.createMany(3, {
      userId: visitor.id,
      type: 'visitor',
      status: 'active',
      applicationId: visitorApplications[0].id
    })
    
    return {
      ...merchantScenario,
      visitor,
      visitorApplications,
      passcodes
    }
  }
  
  /**
   * 创建通行记录场景数据
   */
  static createAccessRecordScenario() {
    const visitorScenario = this.createVisitorScenario()
    
    const accessRecords = accessRecordFactory.createMany(10, {
      userId: visitorScenario.visitor.id,
      passcodeId: visitorScenario.passcodes[0].id,
      projectId: visitorScenario.project.id,
      venueId: visitorScenario.venues[0].id,
      floorId: visitorScenario.floors[0].id,
      result: 'success'
    })
    
    return {
      ...visitorScenario,
      accessRecords
    }
  }
  
  /**
   * 创建员工通行场景数据
   */
  static createEmployeeAccessScenario() {
    const merchantScenario = this.createMerchantScenario()
    
    const employeePasscodes = passcodeFactory.createMany(3, {
      userId: merchantScenario.employees[0].id,
      type: 'employee',
      status: 'active',
      usageLimit: 100
    })
    
    const employeeAccessRecords = accessRecordFactory.createMany(20, {
      userId: merchantScenario.employees[0].id,
      passcodeId: employeePasscodes[0].id,
      projectId: merchantScenario.project.id,
      venueId: merchantScenario.venues[0].id,
      floorId: merchantScenario.floors[0].id,
      result: 'success'
    })
    
    return {
      ...merchantScenario,
      employeePasscodes,
      employeeAccessRecords
    }
  }
  
  /**
   * 创建完整的系统测试场景
   */
  static createCompleteSystemScenario() {
    // 创建租务管理员
    const tenantAdmin = userFactory.create({
      userType: 'tenant_admin',
      merchantId: undefined,
      status: 'active'
    })
    
    // 创建多个商户场景
    const merchantScenarios = Array.from({ length: 3 }, () => this.createMerchantScenario())
    
    // 创建访客场景
    const visitorScenario = this.createVisitorScenario()
    
    // 创建员工通行场景
    const employeeScenario = this.createEmployeeAccessScenario()
    
    return {
      tenantAdmin,
      merchantScenarios,
      visitorScenario,
      employeeScenario
    }
  }
}

/**
 * 测试数据重置工具 - MySQL适配版本
 */
export class TestDataReset {
  /**
   * 重置faker种子，确保测试数据的可重现性
   */
  static resetSeed(seed = 12345) {
    faker.seed(seed)
  }
  
  /**
   * 生成固定的测试数据集 - MySQL版本
   */
  static generateFixedDataSet() {
    this.resetSeed()
    
    return {
      users: userFactory.createMany(10),
      merchants: merchantFactory.createMany(5),
      projects: projectFactory.createMany(3),
      venues: venueFactory.createMany(6),
      floors: floorFactory.createMany(12),
      visitorApplications: visitorApplicationFactory.createMany(15),
      passcodes: passcodeFactory.createMany(20),
      accessRecords: accessRecordFactory.createMany(50)
    }
  }
  
  /**
   * 生成MySQL兼容的测试数据集
   */
  static generateMySQLCompatibleDataSet() {
    this.resetSeed()
    
    // 确保数据的关联性和MySQL约束兼容性
    const projects = projectFactory.createMany(3, { status: 'active' })
    const venues = projects.flatMap(project => 
      venueFactory.createMany(2, { 
        projectId: project.id, 
        status: 'active' 
      })
    )
    const floors = venues.flatMap(venue => 
      floorFactory.createMany(2, { 
        venueId: venue.id, 
        status: 'active' 
      })
    )
    
    const merchants = merchantFactory.createMany(5, { status: 'active' })
    
    const users = [
      // 租务管理员
      userFactory.create({
        userType: 'tenant_admin',
        merchantId: undefined,
        status: 'active'
      }),
      // 商户管理员
      ...merchants.map(merchant => 
        userFactory.create({
          userType: 'merchant_admin',
          merchantId: merchant.id,
          status: 'active'
        })
      ),
      // 员工
      ...merchants.flatMap(merchant => 
        userFactory.createMany(2, {
          userType: 'employee',
          merchantId: merchant.id,
          status: 'active'
        })
      ),
      // 访客
      ...userFactory.createMany(3, {
        userType: 'visitor',
        merchantId: undefined,
        status: 'active'
      })
    ]
    
    const visitorApplications = visitorApplicationFactory.createMany(15, {
      merchantId: merchants[0].id,
      applicantId: users.find(u => u.userType === 'visitor')?.id || 1,
      visiteeId: users.find(u => u.userType === 'employee')?.id || 1
    })
    
    const passcodes = [
      // 员工通行码
      ...users
        .filter(u => u.userType === 'employee')
        .map(user => passcodeFactory.create({
          userId: user.id,
          type: 'employee',
          status: 'active',
          usageLimit: 100
        })),
      // 访客通行码
      ...visitorApplications
        .filter(app => app.status === 'approved')
        .slice(0, 5)
        .map(app => passcodeFactory.create({
          userId: app.applicantId,
          type: 'visitor',
          status: 'active',
          applicationId: app.id,
          usageLimit: 10
        }))
    ]
    
    const accessRecords = accessRecordFactory.createMany(50, {
      userId: users[0].id,
      passcodeId: passcodes[0]?.id || 1,
      projectId: projects[0].id,
      venueId: venues[0].id,
      floorId: floors[0].id
    })
    
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
}

// 导出所有工厂和工具
export {
  faker
}