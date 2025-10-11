import type { User, Merchant, Project, Venue, Floor, VisitorApplication, AccessRecord } from '../../src/types/index.js';

/**
 * 测试数据工厂
 * 提供创建测试数据的便捷方法
 */
export class TestDataFactory {
  private static idCounter = 1;

  /**
   * 获取下一个唯一ID
   */
  private static getNextId(): number {
    return this.idCounter++;
  }

  /**
   * 重置ID计数器
   */
  static resetIdCounter(): void {
    this.idCounter = 1;
  }

  /**
   * 创建测试商户数据
   */
  static createMerchant(overrides: Partial<Merchant> = {}): Merchant {
    const id = this.getNextId();
    return {
      id,
      name: `测试商户${id}`,
      code: `MERCHANT_${id}`,
      contact: `联系人${id}`,
      phone: `1380013800${id}`,
      email: `merchant${id}@test.com`,
      address: `测试地址${id}`,
      status: 'active',
      settings: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * 创建测试用户数据
   */
  static createUser(overrides: Partial<User> = {}): User {
    const id = this.getNextId();
    return {
      id,
      name: `测试用户${id}`,
      phone: `1380013800${id}`,
      user_type: 'employee',
      status: 'active',
      merchant_id: 1,
      open_id: `openid_${id}`,
      union_id: `unionid_${id}`,
      avatar: null,
      password: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * 创建测试项目数据
   */
  static createProject(overrides: Partial<Project> = {}): Project {
    const id = this.getNextId();
    return {
      id,
      code: `PROJECT_${id}`,
      name: `测试项目${id}`,
      description: `项目描述${id}`,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * 创建测试场地数据
   */
  static createVenue(overrides: Partial<Venue> = {}): Venue {
    const id = this.getNextId();
    return {
      id,
      project_id: 1,
      code: `VENUE_${id}`,
      name: `测试场地${id}`,
      description: `场地描述${id}`,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * 创建测试楼层数据
   */
  static createFloor(overrides: Partial<Floor> = {}): Floor {
    const id = this.getNextId();
    return {
      id,
      venue_id: 1,
      code: `FLOOR_${id}`,
      name: `测试楼层${id}`,
      description: `楼层描述${id}`,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * 创建测试访客申请数据
   */
  static createVisitorApplication(overrides: Partial<VisitorApplication> = {}): VisitorApplication {
    const id = this.getNextId();
    const now = new Date();
    const scheduledTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 明天

    return {
      id,
      applicant_id: 1,
      merchant_id: 1,
      visitee_id: 2,
      visitor_name: `访客${id}`,
      visitor_phone: `1380013800${id}`,
      visitor_company: `访客公司${id}`,
      visit_purpose: `访问目的${id}`,
      visit_type: 'business',
      scheduled_time: scheduledTime.toISOString(),
      duration: 2,
      status: 'pending',
      approved_by: null,
      approved_at: null,
      passcode: null,
      passcode_expiry: null,
      usage_limit: 2,
      usage_count: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      ...overrides,
    };
  }

  /**
   * 创建测试通行记录数据
   */
  static createAccessRecord(overrides: Partial<AccessRecord> = {}): AccessRecord {
    const id = this.getNextId();
    return {
      id,
      user_id: 1,
      passcode_id: 1,
      device_id: `device_${id}`,
      device_type: 'qr_scanner',
      direction: 'in',
      result: 'success',
      fail_reason: null,
      project_id: 1,
      venue_id: 1,
      floor_id: 1,
      timestamp: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * 创建批量测试数据
   */
  static createBatch<T>(factory: () => T, count: number): T[] {
    return Array.from({ length: count }, () => factory());
  }

  /**
   * 创建具有唯一约束的测试数据
   */
  static createUniqueData<T extends { id?: number }>(
    factory: (index: number) => T,
    count: number
  ): T[] {
    return Array.from({ length: count }, (_, index) => factory(index + 1));
  }
}

/**
 * 便捷的工厂方法
 */
export const createTestMerchant = (overrides?: Partial<Merchant>) => 
  TestDataFactory.createMerchant(overrides);

export const createTestUser = (overrides?: Partial<User>) => 
  TestDataFactory.createUser(overrides);

export const createTestProject = (overrides?: Partial<Project>) => 
  TestDataFactory.createProject(overrides);

export const createTestVenue = (overrides?: Partial<Venue>) => 
  TestDataFactory.createVenue(overrides);

export const createTestFloor = (overrides?: Partial<Floor>) => 
  TestDataFactory.createFloor(overrides);

export const createTestVisitorApplication = (overrides?: Partial<VisitorApplication>) => 
  TestDataFactory.createVisitorApplication(overrides);

export const createTestAccessRecord = (overrides?: Partial<AccessRecord>) => 
  TestDataFactory.createAccessRecord(overrides);