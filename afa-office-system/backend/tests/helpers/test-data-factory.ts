import type { User, Merchant, Project, Venue, Floor, VisitorApplication, AccessRecord } from '../../src/types/index.js';

/**
 * 测试数据工厂
 * 提供创建测试数据的便捷方法，支持完整的业务实体
 */
export class TestDataFactory {
  private static idCounter = 1;
  private static userCounter = 1;
  private static merchantCounter = 1;
  private static projectCounter = 1;
  private static venueCounter = 1;
  private static floorCounter = 1;
  private static visitorCounter = 1;
  private static accessRecordCounter = 1;

  /**
   * 获取下一个唯一ID
   */
  private static getNextId(): number {
    return this.idCounter++;
  }

  /**
   * 获取下一个用户ID
   */
  private static getNextUserId(): number {
    return this.userCounter++;
  }

  /**
   * 获取下一个商户ID
   */
  private static getNextMerchantId(): number {
    return this.merchantCounter++;
  }

  /**
   * 获取下一个项目ID
   */
  private static getNextProjectId(): number {
    return this.projectCounter++;
  }

  /**
   * 获取下一个场地ID
   */
  private static getNextVenueId(): number {
    return this.venueCounter++;
  }

  /**
   * 获取下一个楼层ID
   */
  private static getNextFloorId(): number {
    return this.floorCounter++;
  }

  /**
   * 获取下一个访客ID
   */
  private static getNextVisitorId(): number {
    return this.visitorCounter++;
  }

  /**
   * 获取下一个通行记录ID
   */
  private static getNextAccessRecordId(): number {
    return this.accessRecordCounter++;
  }

  /**
   * 重置所有计数器
   */
  static resetAllCounters(): void {
    this.idCounter = 1;
    this.userCounter = 1;
    this.merchantCounter = 1;
    this.projectCounter = 1;
    this.venueCounter = 1;
    this.floorCounter = 1;
    this.visitorCounter = 1;
    this.accessRecordCounter = 1;
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
    const id = this.getNextMerchantId();
    return {
      id,
      name: `测试商户${id}`,
      code: `MERCHANT_${String(id).padStart(3, '0')}`,
      contact: `联系人${id}`,
      phone: `1380013800${String(id).padStart(2, '0')}`,
      email: `merchant${id}@test.com`,
      address: `测试地址${id}号`,
      status: 'active',
      settings: JSON.stringify({
        allowVisitors: true,
        maxVisitorsPerDay: 50,
        workingHours: { start: '09:00', end: '18:00' },
        notifications: { email: true, sms: false }
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * 创建测试用户数据
   */
  static createUser(overrides: Partial<User> = {}): User {
    const id = this.getNextUserId();
    const userTypes = ['admin', 'merchant_admin', 'employee', 'visitor'];
    const randomType = userTypes[Math.floor(Math.random() * userTypes.length)];
    
    return {
      id,
      name: `测试用户${id}`,
      phone: `1380013800${String(id).padStart(2, '0')}`,
      user_type: randomType,
      status: 'active',
      merchant_id: overrides.merchant_id || 1,
      open_id: `openid_test_${id}_${Date.now()}`,
      union_id: `unionid_test_${id}_${Date.now()}`,
      avatar: `https://test-avatar.com/user${id}.jpg`,
      password: null, // 小程序用户通常不设置密码
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * 创建测试项目数据
   */
  static createProject(overrides: Partial<Project> = {}): Project {
    const id = this.getNextProjectId();
    return {
      id,
      code: `PRJ${String(id).padStart(4, '0')}`,
      name: `测试项目${id}`,
      description: `这是第${id}个测试项目，用于验证系统功能`,
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
    const id = this.getNextVenueId();
    const venueTypes = ['办公楼', '会议中心', '展厅', '停车场'];
    const randomType = venueTypes[Math.floor(Math.random() * venueTypes.length)];
    
    return {
      id,
      project_id: overrides.project_id || 1,
      code: `VEN${String(id).padStart(3, '0')}`,
      name: `${randomType}${id}`,
      description: `${randomType}${id}，总面积约${1000 + id * 100}平方米`,
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
    const id = this.getNextFloorId();
    const floorNames = ['地下一层', '一层', '二层', '三层', '四层', '五层'];
    const floorName = floorNames[Math.min(id - 1, floorNames.length - 1)] || `${id}层`;
    
    return {
      id,
      venue_id: overrides.venue_id || 1,
      code: `FL${String(id).padStart(2, '0')}`,
      name: floorName,
      description: `${floorName}，包含办公区域和公共设施`,
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
    const id = this.getNextVisitorId();
    const now = new Date();
    const scheduledTime = new Date(now.getTime() + (24 + Math.random() * 48) * 60 * 60 * 1000); // 1-3天后
    
    const visitTypes = ['business', 'interview', 'meeting', 'delivery', 'maintenance'];
    const visitPurposes = ['商务洽谈', '面试', '会议', '送货', '设备维护', '技术支持', '培训'];
    const companies = ['阿里巴巴', '腾讯科技', '百度', '字节跳动', '美团', '滴滴出行', '京东'];
    
    const randomType = visitTypes[Math.floor(Math.random() * visitTypes.length)];
    const randomPurpose = visitPurposes[Math.floor(Math.random() * visitPurposes.length)];
    const randomCompany = companies[Math.floor(Math.random() * companies.length)];

    return {
      id,
      applicant_id: overrides.applicant_id || 1,
      merchant_id: overrides.merchant_id || 1,
      visitee_id: overrides.visitee_id || 2,
      visitor_name: `访客${id}`,
      visitor_phone: `1380013800${String(id).padStart(2, '0')}`,
      visitor_company: randomCompany,
      visit_purpose: randomPurpose,
      visit_type: randomType,
      scheduled_time: scheduledTime.toISOString(),
      duration: Math.floor(Math.random() * 4) + 1, // 1-4小时
      status: 'pending',
      approved_by: null,
      approved_at: null,
      passcode: null,
      passcode_expiry: null,
      usage_limit: Math.floor(Math.random() * 3) + 1, // 1-3次
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
    const id = this.getNextAccessRecordId();
    const deviceTypes = ['qr_scanner', 'face_recognition', 'card_reader', 'mobile_app'];
    const directions = ['in', 'out'];
    const results = ['success', 'failed', 'denied'];
    const failReasons = ['expired_passcode', 'invalid_user', 'device_error', 'time_restriction'];
    
    const randomDeviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
    const randomDirection = directions[Math.floor(Math.random() * directions.length)];
    const randomResult = results[Math.floor(Math.random() * results.length)];
    const randomFailReason = randomResult === 'failed' ? 
      failReasons[Math.floor(Math.random() * failReasons.length)] : null;

    return {
      id,
      user_id: overrides.user_id || 1,
      passcode_id: overrides.passcode_id || 1,
      device_id: `DEV${String(id).padStart(3, '0')}`,
      device_type: randomDeviceType,
      direction: randomDirection,
      result: randomResult,
      fail_reason: randomFailReason,
      project_id: overrides.project_id || 1,
      venue_id: overrides.venue_id || 1,
      floor_id: overrides.floor_id || 1,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // 过去7天内随机时间
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

  /**
   * 创建管理员用户
   */
  static createAdminUser(overrides: Partial<User> = {}): User {
    return this.createUser({
      user_type: 'tenant_admin',
      name: '系统管理员',
      phone: '13800138000',
      ...overrides,
    });
  }

  /**
   * 创建商户管理员用户
   */
  static createMerchantAdmin(merchantId: number, overrides: Partial<User> = {}): User {
    return this.createUser({
      user_type: 'merchant_admin',
      merchant_id: merchantId,
      name: `商户${merchantId}管理员`,
      ...overrides,
    });
  }

  /**
   * 创建员工用户
   */
  static createEmployee(merchantId: number, overrides: Partial<User> = {}): User {
    return this.createUser({
      user_type: 'employee',
      merchant_id: merchantId,
      name: `员工${this.getNextUserId()}`,
      ...overrides,
    });
  }

  /**
   * 创建访客用户
   */
  static createVisitor(overrides: Partial<User> = {}): User {
    return this.createUser({
      user_type: 'visitor',
      merchant_id: null,
      name: `访客${this.getNextUserId()}`,
      ...overrides,
    });
  }

  /**
   * 创建已批准的访客申请
   */
  static createApprovedVisitorApplication(overrides: Partial<VisitorApplication> = {}): VisitorApplication {
    const now = new Date();
    const passcode = `PASS${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    
    return this.createVisitorApplication({
      status: 'approved',
      approved_by: 2, // 假设ID为2的用户是审批人
      approved_at: now.toISOString(),
      passcode,
      passcode_expiry: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24小时后过期
      ...overrides,
    });
  }

  /**
   * 创建已拒绝的访客申请
   */
  static createRejectedVisitorApplication(overrides: Partial<VisitorApplication> = {}): VisitorApplication {
    return this.createVisitorApplication({
      status: 'rejected',
      approved_by: 2,
      approved_at: new Date().toISOString(),
      ...overrides,
    });
  }

  /**
   * 创建成功的通行记录
   */
  static createSuccessAccessRecord(overrides: Partial<AccessRecord> = {}): AccessRecord {
    return this.createAccessRecord({
      result: 'success',
      fail_reason: null,
      ...overrides,
    });
  }

  /**
   * 创建失败的通行记录
   */
  static createFailedAccessRecord(overrides: Partial<AccessRecord> = {}): AccessRecord {
    const failReasons = ['expired_passcode', 'invalid_user', 'device_error', 'time_restriction'];
    const randomFailReason = failReasons[Math.floor(Math.random() * failReasons.length)];
    
    return this.createAccessRecord({
      result: 'failed',
      fail_reason: randomFailReason,
      ...overrides,
    });
  }

  /**
   * 创建完整的商户数据集（包含管理员和员工）
   */
  static createMerchantWithUsers(employeeCount: number = 3): {
    merchant: Merchant;
    admin: User;
    employees: User[];
  } {
    const merchant = this.createMerchant();
    const admin = this.createMerchantAdmin(merchant.id);
    const employees = Array.from({ length: employeeCount }, () => 
      this.createEmployee(merchant.id)
    );

    return { merchant, admin, employees };
  }

  /**
   * 创建完整的项目数据集（包含场地和楼层）
   */
  static createProjectWithVenuesAndFloors(venueCount: number = 2, floorsPerVenue: number = 3): {
    project: Project;
    venues: Venue[];
    floors: Floor[];
  } {
    const project = this.createProject();
    const venues = Array.from({ length: venueCount }, () => 
      this.createVenue({ project_id: project.id })
    );
    
    const floors: Floor[] = [];
    venues.forEach(venue => {
      const venueFloors = Array.from({ length: floorsPerVenue }, () => 
        this.createFloor({ venue_id: venue.id })
      );
      floors.push(...venueFloors);
    });

    return { project, venues, floors };
  }

  /**
   * 创建访客申请流程数据（申请->审批->通行记录）
   */
  static createVisitorFlow(): {
    application: VisitorApplication;
    accessRecords: AccessRecord[];
  } {
    const application = this.createApprovedVisitorApplication();
    const accessRecords = [
      this.createSuccessAccessRecord({
        user_id: application.applicant_id,
        passcode_id: application.id,
        direction: 'in',
      }),
      this.createSuccessAccessRecord({
        user_id: application.applicant_id,
        passcode_id: application.id,
        direction: 'out',
      }),
    ];

    return { application, accessRecords };
  }

  /**
   * 生成随机的中文姓名
   */
  static generateChineseName(): string {
    const surnames = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴'];
    const names = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '涛', '明'];
    
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    const name1 = names[Math.floor(Math.random() * names.length)];
    const name2 = Math.random() > 0.5 ? names[Math.floor(Math.random() * names.length)] : '';
    
    return surname + name1 + name2;
  }

  /**
   * 生成随机的公司名称
   */
  static generateCompanyName(): string {
    const prefixes = ['北京', '上海', '深圳', '广州', '杭州', '成都'];
    const types = ['科技', '信息技术', '网络科技', '软件', '数据'];
    const suffixes = ['有限公司', '股份有限公司', '科技有限公司'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix}${type}${suffix}`;
  }

  /**
   * 生成随机的手机号码
   */
  static generatePhoneNumber(): string {
    const prefixes = ['138', '139', '150', '151', '152', '158', '159', '188', '189'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
    return prefix + suffix;
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