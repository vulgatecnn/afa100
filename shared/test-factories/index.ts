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
  open_id?: string | undefined
  union_id?: string | undefined
  phone?: string | undefined
  name: string
  avatar?: string | undefined
  user_type: 'tenant_admin' | 'merchant_admin' | 'employee' | 'visitor'
  status: 'active' | 'inactive' | 'pending'
  merchant_id?: number | undefined
  password?: string | undefined
  created_at: string
  updated_at: string
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
  settings?: string
  created_at: string
  updated_at: string
}

/**
 * 访客申请数据类型 - MySQL适配版本
 * 使用snake_case字段名以匹配后端数据库结构
 */
export interface VisitorApplication {
  id: number
  applicant_id: number
  merchant_id: number
  visitee_id?: number | undefined
  visitor_name: string
  visitor_phone: string
  visitor_company?: string | undefined
  visit_purpose: string
  visitPurpose?: 'business' | 'interview' | 'meeting' | 'delivery' | 'maintenance' | 'other' | null | undefined // 标准化的访问目的
  visit_type?: string | undefined
  scheduled_time: string
  duration: number
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'completed'
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'auto_approved' | null | undefined // 审批状态（更细粒度）
  approved_by?: number | undefined
  approved_at?: string | undefined
  rejection_reason?: string | undefined
  passcode?: string | undefined
  passcode_expiry?: string | undefined
  usage_limit: number
  usage_count: number
  verification?: {
    idCard?: string;
    idCardPhoto?: string;
    facePhoto?: string;
    temperature?: number;
    healthCode?: string;
    verificationStatus: 'pending' | 'verified' | 'failed';
    verifiedAt?: string;
    verifiedBy?: number;
  } | string | null // 访客验证信息，支持JSON字符串
  created_at: string
  updated_at: string
  // 添加camelCase版本以支持API层
  createdAt?: string
  updatedAt?: string
  scheduledTime?: string
  // 流程相关字段
  workflow?: {
    currentStep: string;
    steps: Array<{
      name: string;
      status: 'pending' | 'completed' | 'skipped';
      completedAt?: string | null;
      completedBy?: number | null;
    }>;
  } | string | null // 支持JSON字符串
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
  created_at: string
  updated_at: string
}

/**
 * 场地数据类型 - MySQL适配版本
 */
export interface Venue {
  id: number
  project_id: number
  code: string
  name: string
  description?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

/**
 * 楼层数据类型 - MySQL适配版本
 */
export interface Floor {
  id: number
  venue_id: number
  code: string
  name: string
  description?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

/**
 * 通行码数据类型 - MySQL适配版本
 */
export interface Passcode {
  id: number
  user_id: number
  code: string
  type: 'employee' | 'visitor'
  status: 'active' | 'expired' | 'revoked'
  expiry_time?: string | undefined
  usage_limit?: number | undefined
  usage_count: number
  permissions?: string | undefined
  application_id?: number | undefined
  created_at: string
  updated_at: string
}

/**
 * 通行记录数据类型 - MySQL适配版本
 */
export interface AccessRecord {
  id: number
  user_id: number
  passcode_id?: number | undefined
  device_id: string
  device_type?: string | undefined
  direction: 'in' | 'out'
  result: 'success' | 'failed'
  fail_reason?: string | undefined
  project_id?: number | undefined
  venue_id?: number | undefined
  floor_id?: number | undefined
  timestamp: string
}

/**
 * 用户数据工厂 - MySQL适配版本
 */
export const userFactory: TestDataFactory<User> = {
  create: (overrides = {}) => ({
    id: faker.number.int({ min: 1, max: 10000 }),
    open_id: faker.string.alphanumeric(28),
    union_id: faker.string.alphanumeric(28),
    phone: faker.phone.number(),
    name: faker.person.fullName(),
    avatar: faker.helpers.maybe(() => faker.image.avatar(), { probability: 0.7 }),
    user_type: faker.helpers.arrayElement(['tenant_admin', 'merchant_admin', 'employee', 'visitor']),
    status: faker.helpers.arrayElement(['active', 'inactive', 'pending']),
    merchant_id: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 100 }), { probability: 0.8 }) || undefined,
    password: faker.helpers.maybe(() => `$2b$10$${faker.string.alphanumeric(53)}`, { probability: 0.9 }),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
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
    settings: JSON.stringify({
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
    }),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
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
      applicant_id: faker.number.int({ min: 1, max: 1000 }),
      merchant_id: faker.number.int({ min: 1, max: 100 }),
      visitee_id: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 1000 }), { probability: 0.8 }),
      visitor_name: faker.person.fullName(),
      visitor_phone: faker.phone.number(),
      visitor_company: faker.helpers.maybe(() => faker.company.name(), { probability: 0.8 }),
      visit_purpose: faker.helpers.arrayElement(['商务洽谈', '技术交流', '参观访问', '会议讨论', '项目合作', '面试', '培训']),
      visitPurpose: faker.helpers.maybe(() => faker.helpers.arrayElement(['business', 'interview', 'meeting', 'delivery', 'maintenance', 'other']), { probability: 0.8 }),
      visit_type: faker.helpers.arrayElement(['business', 'personal', 'interview', 'meeting']),
      scheduled_time: scheduledTime.toISOString(),
      duration,
      status: faker.helpers.arrayElement(['pending', 'approved', 'rejected', 'expired', 'completed']),
      approvalStatus: faker.helpers.maybe(() => faker.helpers.arrayElement(['pending', 'approved', 'rejected', 'auto_approved']), { probability: 0.8 }),
      approved_by: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 100 }), { probability: 0.6 }),
      approved_at: faker.helpers.maybe(() => faker.date.recent().toISOString(), { probability: 0.6 }),
      rejection_reason: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.2 }),
      passcode: faker.helpers.maybe(() => `PASS${faker.string.numeric(3)}`, { probability: 0.7 }),
      passcode_expiry: faker.helpers.maybe(() => faker.date.future().toISOString(), { probability: 0.7 }),
      usage_limit: faker.number.int({ min: 1, max: 10 }),
      usage_count: faker.number.int({ min: 0, max: 5 }),
      verification: faker.helpers.maybe(() => ({
        idCard: faker.string.numeric(18),
        idCardPhoto: faker.image.url(),
        facePhoto: faker.image.url(),
        temperature: faker.number.float({ min: 36.0, max: 37.5, fractionDigits: 1 }),
        healthCode: faker.helpers.arrayElement(['green', 'yellow', 'red']),
        verificationStatus: faker.helpers.arrayElement(['pending', 'verified', 'failed']),
        verifiedAt: faker.date.recent().toISOString(),
        verifiedBy: faker.number.int({ min: 1, max: 100 })
      }), { probability: 0.7 }),
      workflow: faker.helpers.maybe(() => ({
        currentStep: faker.helpers.arrayElement(['submit', 'review', 'approve', 'verify', 'complete']),
        steps: [
          {
            name: 'submit',
            status: 'completed',
            completedAt: faker.date.past().toISOString(),
            completedBy: faker.number.int({ min: 1, max: 100 })
          },
          {
            name: 'review',
            status: faker.helpers.arrayElement(['pending', 'completed', 'skipped']),
            completedAt: faker.helpers.maybe(() => faker.date.recent().toISOString()),
            completedBy: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 100 }))
          }
        ]
      }), { probability: 0.6 }),
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString(),
      // 添加camelCase版本
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      scheduledTime: scheduledTime.toISOString(),
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
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
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
    project_id: faker.number.int({ min: 1, max: 100 }),
    code: `VEN${faker.string.numeric(3).padStart(3, '0')}`,
    name: `${faker.helpers.arrayElement(['A座', 'B座', 'C座', 'D座'])}大楼`,
    description: faker.lorem.sentence(),
    status: faker.helpers.arrayElement(['active', 'inactive']),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
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
    venue_id: faker.number.int({ min: 1, max: 100 }),
    code: `FL${faker.string.numeric(3).padStart(3, '0')}`,
    name: `${faker.number.int({ min: 1, max: 30 })}楼`,
    description: faker.lorem.sentence(),
    status: faker.helpers.arrayElement(['active', 'inactive']),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
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
      user_id: faker.number.int({ min: 1, max: 1000 }),
      code: type === 'employee' 
        ? `EMP${faker.string.numeric(3).padStart(3, '0')}`
        : `VIS${faker.string.numeric(3).padStart(3, '0')}`,
      type,
      status: faker.helpers.arrayElement(['active', 'expired', 'revoked']),
      expiry_time: faker.helpers.maybe(() => expiryTime.toISOString(), { probability: 0.9 }),
      usage_limit: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 100 }), { probability: 0.8 }),
      usage_count: faker.number.int({ min: 0, max: 10 }),
      permissions: JSON.stringify({
        projects: faker.helpers.arrayElements([1, 2, 3], faker.number.int({ min: 1, max: 3 })),
        venues: faker.helpers.arrayElements([1, 2, 3, 4], faker.number.int({ min: 1, max: 2 })),
        floors: faker.helpers.arrayElements([1, 2, 3, 4, 5], faker.number.int({ min: 1, max: 3 }))
      }),
      application_id: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 1000 }), { probability: 0.6 }),
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString(),
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
    user_id: faker.number.int({ min: 1, max: 1000 }),
    passcode_id: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 10000 }), { probability: 0.9 }),
    device_id: `DEVICE${faker.string.numeric(3).padStart(3, '0')}`,
    device_type: faker.helpers.arrayElement(['card_reader', 'qr_scanner', 'face_recognition', 'fingerprint']),
    direction: faker.helpers.arrayElement(['in', 'out']),
    result: faker.helpers.arrayElement(['success', 'failed']),
    fail_reason: faker.helpers.maybe(() => 
      faker.helpers.arrayElement(['通行码已过期', '权限不足', '设备故障', '网络异常', '人脸识别失败', '指纹不匹配']), 
      { probability: 0.2 }
    ),
    project_id: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 10 }), { probability: 0.8 }),
    venue_id: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 20 }), { probability: 0.8 }),
    floor_id: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 50 }), { probability: 0.6 }),
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
      user_type: 'merchant_admin',
      merchant_id: merchant.id,
      status: 'active'
    })
    const employees = userFactory.createMany(3, {
      user_type: 'employee',
      merchant_id: merchant.id,
      status: 'active'
    })
    
    // 创建项目、场地、楼层的层级结构
    const project = projectFactory.create({ status: 'active' })
    const venues = venueFactory.createMany(2, { 
      project_id: project.id,
      status: 'active' 
    })
    const floors = floorFactory.createMany(3, {
      venue_id: venues[0].id,
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
      user_type: 'visitor',
      merchant_id: undefined,
      status: 'active'
    })
    
    const visitorApplications = visitorApplicationFactory.createMany(5, {
      merchant_id: merchantScenario.merchant.id,
      applicant_id: visitor.id,
      visitee_id: merchantScenario.employees[0].id,
      status: 'approved'
    })
    
    const passcodes = passcodeFactory.createMany(3, {
      user_id: visitor.id,
      type: 'visitor',
      status: 'active',
      application_id: visitorApplications[0].id
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
      user_id: visitorScenario.visitor.id,
      passcode_id: visitorScenario.passcodes[0].id,
      project_id: visitorScenario.project.id,
      venue_id: visitorScenario.venues[0].id,
      floor_id: visitorScenario.floors[0].id,
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
      user_id: merchantScenario.employees[0].id,
      type: 'employee',
      status: 'active',
      usage_limit: 100
    })
    
    const employeeAccessRecords = accessRecordFactory.createMany(20, {
      user_id: merchantScenario.employees[0].id,
      passcode_id: employeePasscodes[0].id,
      project_id: merchantScenario.project.id,
      venue_id: merchantScenario.venues[0].id,
      floor_id: merchantScenario.floors[0].id,
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
      user_type: 'tenant_admin',
      merchant_id: undefined,
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
        project_id: project.id, 
        status: 'active' 
      })
    )
    const floors = venues.flatMap(venue => 
      floorFactory.createMany(2, { 
        venue_id: venue.id, 
        status: 'active' 
      })
    )
    
    const merchants = merchantFactory.createMany(5, { status: 'active' })
    
    const users = [
      // 租务管理员
      userFactory.create({
        user_type: 'tenant_admin',
        merchant_id: undefined,
        status: 'active'
      }),
      // 商户管理员
      ...merchants.map(merchant => 
        userFactory.create({
          user_type: 'merchant_admin',
          merchant_id: merchant.id,
          status: 'active'
        })
      ),
      // 员工
      ...merchants.flatMap(merchant => 
        userFactory.createMany(2, {
          user_type: 'employee',
          merchant_id: merchant.id,
          status: 'active'
        })
      ),
      // 访客
      ...userFactory.createMany(3, {
        user_type: 'visitor',
        merchant_id: undefined,
        status: 'active'
      })
    ]
    
    const visitorApplications = visitorApplicationFactory.createMany(15, {
      merchant_id: merchants[0].id,
      applicant_id: users.find(u => u.user_type === 'visitor')?.id || 1,
      visitee_id: users.find(u => u.user_type === 'employee')?.id || 1
    })
    
    const passcodes = [
      // 员工通行码
      ...users
        .filter(u => u.user_type === 'employee')
        .map(user => passcodeFactory.create({
          user_id: user.id,
          type: 'employee',
          status: 'active',
          usage_limit: 100
        })),
      // 访客通行码
      ...visitorApplications
        .filter(app => app.status === 'approved')
        .slice(0, 5)
        .map(app => passcodeFactory.create({
          user_id: app.applicant_id,
          type: 'visitor',
          status: 'active',
          application_id: app.id,
          usage_limit: 10
        }))
    ]
    
    const accessRecords = accessRecordFactory.createMany(50, {
      user_id: users[0].id,
      passcode_id: passcodes[0]?.id || 1,
      project_id: projects[0].id,
      venue_id: venues[0].id,
      floor_id: floors[0].id
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