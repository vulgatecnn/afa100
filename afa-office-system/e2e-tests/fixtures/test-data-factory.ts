/**
 * 测试数据工厂
 * 提供动态测试数据生成和管理功能
 */

import { testUsers, testMerchants, testDevices, testVendors, testVisitorApplications, testAccessRecords } from './test-data';

export interface TestUser {
  id?: number;
  username: string;
  password: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  merchantId?: number;
  position?: string;
  permissions: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface TestMerchant {
  id?: number;
  name: string;
  contactPerson: string;
  contactPhone: string;
  email: string;
  address: string;
  businessLicense: string;
  industry: string;
  employeeCount: number;
  status: 'active' | 'inactive' | 'pending';
  contractStartDate: string;
  contractEndDate: string;
  monthlyFee: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestDevice {
  id?: number;
  name: string;
  deviceType: 'turnstile' | 'door_access' | 'face_recognition' | 'camera';
  location: string;
  ipAddress: string;
  macAddress: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  status: 'online' | 'offline' | 'fault';
  lastHeartbeat: string;
  installDate: string;
  warrantyExpiry: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestVisitorApplication {
  id?: number;
  visitorName: string;
  visitorPhone: string;
  visitorIdCard: string;
  visitorCompany: string;
  visitPurpose: string;
  scheduledTime: string;
  expectedDuration: number;
  visiteeId: number;
  visiteeName: string;
  merchantId: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'used';
  applicantId: number;
  applicantName: string;
  applicationTime: string;
  approvalTime?: string;
  approverId?: number;
  approverName?: string;
  rejectionTime?: string;
  rejectorId?: number;
  rejectorName?: string;
  rejectionReason?: string;
  passcode?: string;
  qrCode?: string;
  usageLimit?: number;
  usageCount?: number;
  validFrom?: string;
  validUntil?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestAccessRecord {
  id?: number;
  userId?: number;
  userName: string;
  userType: 'employee' | 'visitor';
  visitorApplicationId?: number;
  visitorName?: string;
  visitorPhone?: string;
  deviceId: number;
  deviceName: string;
  accessTime: string;
  accessType: 'entry' | 'exit';
  accessMethod: 'qr_code' | 'passcode' | 'face_recognition' | 'card';
  status: 'success' | 'failed';
  failureReason?: string;
  merchantId: number;
  visiteeId?: number;
  visiteeName?: string;
  createdAt: string;
}

export class TestDataFactory {
  private static idCounters: Record<string, number> = {
    user: 100,
    merchant: 100,
    device: 100,
    visitor: 100,
    accessRecord: 100,
  };

  /**
   * 获取下一个ID
   */
  private static getNextId(type: string): number {
    return ++this.idCounters[type];
  }

  /**
   * 生成随机字符串
   */
  private static randomString(length: number, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * 生成随机数字
   */
  private static randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 生成随机日期
   */
  private static randomDate(start: Date, end: Date): string {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString();
  }

  /**
   * 生成随机手机号
   */
  private static randomPhone(): string {
    const prefixes = ['138', '139', '150', '151', '152', '158', '159', '188', '189'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = this.randomString(8, '0123456789');
    return prefix + suffix;
  }

  /**
   * 生成随机邮箱
   */
  private static randomEmail(name?: string): string {
    const username = name ? name.toLowerCase().replace(/\s+/g, '') : this.randomString(8);
    const domains = ['test.com', 'example.com', 'demo.org', 'sample.net'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${username}@${domain}`;
  }

  /**
   * 生成随机IP地址
   */
  private static randomIP(): string {
    return `192.168.${this.randomNumber(1, 255)}.${this.randomNumber(1, 255)}`;
  }

  /**
   * 生成随机MAC地址
   */
  private static randomMAC(): string {
    const hex = '0123456789ABCDEF';
    let mac = '';
    for (let i = 0; i < 6; i++) {
      if (i > 0) mac += ':';
      mac += hex.charAt(Math.floor(Math.random() * 16));
      mac += hex.charAt(Math.floor(Math.random() * 16));
    }
    return mac;
  }

  /**
   * 创建测试用户
   */
  static createUser(overrides: Partial<TestUser> = {}): TestUser {
    const id = this.getNextId('user');
    const name = overrides.name || `测试用户${id}`;
    
    return {
      id,
      username: `test_user_${id}`,
      password: 'Test123456',
      name,
      role: 'merchant_employee',
      email: this.randomEmail(name),
      phone: this.randomPhone(),
      status: 'active',
      permissions: ['visitor_approval'],
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * 创建租务管理员
   */
  static createTenantAdmin(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      role: 'tenant_admin',
      permissions: ['all'],
      ...overrides,
    });
  }

  /**
   * 创建商户管理员
   */
  static createMerchantAdmin(merchantId: number, overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      role: 'merchant_admin',
      merchantId,
      permissions: ['merchant_management', 'employee_management', 'visitor_management'],
      ...overrides,
    });
  }

  /**
   * 创建商户员工
   */
  static createEmployee(merchantId: number, overrides: Partial<TestUser> = {}): TestUser {
    const positions = ['技术员', '销售员', '客服', '财务', '行政', '经理'];
    
    return this.createUser({
      role: 'merchant_employee',
      merchantId,
      position: positions[Math.floor(Math.random() * positions.length)],
      permissions: ['visitor_approval', 'access_records_view'],
      ...overrides,
    });
  }

  /**
   * 创建测试商户
   */
  static createMerchant(overrides: Partial<TestMerchant> = {}): TestMerchant {
    const id = this.getNextId('merchant');
    const industries = ['软件开发', '设计服务', '咨询服务', '贸易', '制造业', '金融服务'];
    const name = overrides.name || `测试商户${id}`;
    
    return {
      id,
      name,
      contactPerson: `联系人${id}`,
      contactPhone: this.randomPhone(),
      email: this.randomEmail(name),
      address: `北京市朝阳区测试大厦${this.randomNumber(1, 30)}层`,
      businessLicense: `91110000${this.randomString(10, '0123456789')}X`,
      industry: industries[Math.floor(Math.random() * industries.length)],
      employeeCount: this.randomNumber(5, 100),
      status: 'active',
      contractStartDate: '2024-01-01',
      contractEndDate: '2024-12-31',
      monthlyFee: this.randomNumber(1000, 10000),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * 创建测试设备
   */
  static createDevice(overrides: Partial<TestDevice> = {}): TestDevice {
    const id = this.getNextId('device');
    const deviceTypes: TestDevice['deviceType'][] = ['turnstile', 'door_access', 'face_recognition', 'camera'];
    const deviceType = overrides.deviceType || deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
    const manufacturers = ['智能设备科技', '安防系统集成商', '通行设备厂商'];
    
    const deviceNames = {
      turnstile: ['大厅闸机', '停车场闸机', '员工通道闸机'],
      door_access: ['电梯口门禁', '办公室门禁', '会议室门禁'],
      face_recognition: ['人脸识别终端', '智能识别设备'],
      camera: ['监控摄像头', '安防摄像机'],
    };
    
    const models = {
      turnstile: ['ST-2000', 'ST-1800', 'TG-3000'],
      door_access: ['DA-1500', 'AC-2000', 'DR-1200'],
      face_recognition: ['FR-500', 'AI-800', 'FC-600'],
      camera: ['CM-1080', 'SC-4K', 'IP-2000'],
    };
    
    const nameOptions = deviceNames[deviceType];
    const modelOptions = models[deviceType];
    
    return {
      id,
      name: `${nameOptions[Math.floor(Math.random() * nameOptions.length)]}${id}`,
      deviceType,
      location: `${this.randomNumber(1, 30)}层${['入口', '出口', '电梯口', '走廊'][Math.floor(Math.random() * 4)]}`,
      ipAddress: this.randomIP(),
      macAddress: this.randomMAC(),
      serialNumber: `${deviceType.toUpperCase()}${this.randomString(12, '0123456789')}`,
      manufacturer: manufacturers[Math.floor(Math.random() * manufacturers.length)],
      model: modelOptions[Math.floor(Math.random() * modelOptions.length)],
      firmwareVersion: `${this.randomNumber(1, 3)}.${this.randomNumber(0, 9)}.${this.randomNumber(0, 9)}`,
      status: 'online',
      lastHeartbeat: new Date().toISOString(),
      installDate: this.randomDate(new Date('2024-01-01'), new Date()),
      warrantyExpiry: '2025-12-31',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * 创建访客申请
   */
  static createVisitorApplication(
    visiteeId: number,
    visiteeName: string,
    merchantId: number,
    overrides: Partial<TestVisitorApplication> = {}
  ): TestVisitorApplication {
    const id = this.getNextId('visitor');
    const companies = ['客户公司A', '合作伙伴B', '供应商C', '投资机构D', '咨询公司E'];
    const purposes = ['商务洽谈', '技术交流', '项目讨论', '合作会议', '产品演示', '培训交流'];
    
    const scheduledTime = overrides.scheduledTime || 
      this.randomDate(new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    
    return {
      id,
      visitorName: `访客${id}`,
      visitorPhone: this.randomPhone(),
      visitorIdCard: `11010119900101${this.randomString(4, '0123456789')}`,
      visitorCompany: companies[Math.floor(Math.random() * companies.length)],
      visitPurpose: purposes[Math.floor(Math.random() * purposes.length)],
      scheduledTime,
      expectedDuration: this.randomNumber(60, 240), // 1-4小时
      visiteeId,
      visiteeName,
      merchantId,
      status: 'pending',
      applicantId: visiteeId,
      applicantName: visiteeName,
      applicationTime: new Date().toISOString(),
      notes: `访客申请备注${id}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * 创建已批准的访客申请
   */
  static createApprovedVisitorApplication(
    visiteeId: number,
    visiteeName: string,
    merchantId: number,
    approverId: number,
    approverName: string,
    overrides: Partial<TestVisitorApplication> = {}
  ): TestVisitorApplication {
    const application = this.createVisitorApplication(visiteeId, visiteeName, merchantId, overrides);
    const approvalTime = new Date().toISOString();
    const scheduledDate = new Date(application.scheduledTime);
    
    return {
      ...application,
      status: 'approved',
      approvalTime,
      approverId,
      approverName,
      passcode: `PASS${this.randomString(6, '0123456789')}`,
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      usageLimit: this.randomNumber(1, 5),
      usageCount: 0,
      validFrom: new Date(scheduledDate.getTime() - 60 * 60 * 1000).toISOString(), // 提前1小时
      validUntil: new Date(scheduledDate.getTime() + application.expectedDuration * 60 * 1000).toISOString(),
      updatedAt: approvalTime,
      ...overrides,
    };
  }

  /**
   * 创建通行记录
   */
  static createAccessRecord(
    userId: number,
    userName: string,
    deviceId: number,
    deviceName: string,
    merchantId: number,
    overrides: Partial<TestAccessRecord> = {}
  ): TestAccessRecord {
    const id = this.getNextId('accessRecord');
    const accessMethods: TestAccessRecord['accessMethod'][] = ['qr_code', 'passcode', 'face_recognition', 'card'];
    
    return {
      id,
      userId,
      userName,
      userType: 'employee',
      deviceId,
      deviceName,
      accessTime: new Date().toISOString(),
      accessType: 'entry',
      accessMethod: accessMethods[Math.floor(Math.random() * accessMethods.length)],
      status: 'success',
      merchantId,
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * 创建访客通行记录
   */
  static createVisitorAccessRecord(
    visitorApplicationId: number,
    visitorName: string,
    visitorPhone: string,
    deviceId: number,
    deviceName: string,
    merchantId: number,
    visiteeId: number,
    visiteeName: string,
    overrides: Partial<TestAccessRecord> = {}
  ): TestAccessRecord {
    const id = this.getNextId('accessRecord');
    
    return {
      id,
      visitorApplicationId,
      visitorName,
      visitorPhone,
      userName: visitorName,
      userType: 'visitor',
      deviceId,
      deviceName,
      accessTime: new Date().toISOString(),
      accessType: 'entry',
      accessMethod: 'passcode',
      status: 'success',
      merchantId,
      visiteeId,
      visiteeName,
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * 批量创建用户
   */
  static createUsers(count: number, overrides: Partial<TestUser> = {}): TestUser[] {
    return Array.from({ length: count }, () => this.createUser(overrides));
  }

  /**
   * 批量创建商户
   */
  static createMerchants(count: number, overrides: Partial<TestMerchant> = {}): TestMerchant[] {
    return Array.from({ length: count }, () => this.createMerchant(overrides));
  }

  /**
   * 批量创建设备
   */
  static createDevices(count: number, overrides: Partial<TestDevice> = {}): TestDevice[] {
    return Array.from({ length: count }, () => this.createDevice(overrides));
  }

  /**
   * 批量创建访客申请
   */
  static createVisitorApplications(
    count: number,
    visiteeId: number,
    visiteeName: string,
    merchantId: number,
    overrides: Partial<TestVisitorApplication> = {}
  ): TestVisitorApplication[] {
    return Array.from({ length: count }, () => 
      this.createVisitorApplication(visiteeId, visiteeName, merchantId, overrides)
    );
  }

  /**
   * 获取预定义的测试数据
   */
  static getPredefinedUsers() {
    return testUsers;
  }

  static getPredefinedMerchants() {
    return testMerchants;
  }

  static getPredefinedDevices() {
    return testDevices;
  }

  static getPredefinedVendors() {
    return testVendors;
  }

  static getPredefinedVisitorApplications() {
    return testVisitorApplications;
  }

  static getPredefinedAccessRecords() {
    return testAccessRecords;
  }

  /**
   * 重置ID计数器
   */
  static resetIdCounters(): void {
    this.idCounters = {
      user: 100,
      merchant: 100,
      device: 100,
      visitor: 100,
      accessRecord: 100,
    };
  }

  /**
   * 创建完整的测试场景数据
   */
  static createTestScenario(scenarioName: string): {
    users: TestUser[];
    merchants: TestMerchant[];
    devices: TestDevice[];
    visitorApplications: TestVisitorApplication[];
    accessRecords: TestAccessRecord[];
  } {
    switch (scenarioName) {
      case 'basic':
        return this.createBasicScenario();
      case 'multi-merchant':
        return this.createMultiMerchantScenario();
      case 'high-traffic':
        return this.createHighTrafficScenario();
      default:
        throw new Error(`Unknown scenario: ${scenarioName}`);
    }
  }

  /**
   * 创建基础测试场景
   */
  private static createBasicScenario() {
    const merchant = this.createMerchant({ name: '基础测试商户' });
    const merchantAdmin = this.createMerchantAdmin(merchant.id!, { name: '基础商户管理员' });
    const employees = this.createUsers(3, { 
      merchantId: merchant.id,
      role: 'merchant_employee',
    });
    const devices = this.createDevices(2);
    const visitorApplications = this.createVisitorApplications(
      2, 
      employees[0].id!, 
      employees[0].name, 
      merchant.id!
    );
    const accessRecords = [
      this.createAccessRecord(
        employees[0].id!,
        employees[0].name,
        devices[0].id!,
        devices[0].name,
        merchant.id!
      ),
    ];

    return {
      users: [merchantAdmin, ...employees],
      merchants: [merchant],
      devices,
      visitorApplications,
      accessRecords,
    };
  }

  /**
   * 创建多商户测试场景
   */
  private static createMultiMerchantScenario() {
    const merchants = this.createMerchants(3);
    const users: TestUser[] = [];
    const visitorApplications: TestVisitorApplication[] = [];
    const accessRecords: TestAccessRecord[] = [];

    merchants.forEach(merchant => {
      const admin = this.createMerchantAdmin(merchant.id!, { name: `${merchant.name}管理员` });
      const employees = this.createUsers(2, { 
        merchantId: merchant.id,
        role: 'merchant_employee',
      });
      users.push(admin, ...employees);

      const applications = this.createVisitorApplications(
        1,
        employees[0].id!,
        employees[0].name,
        merchant.id!
      );
      visitorApplications.push(...applications);
    });

    const devices = this.createDevices(4);

    return {
      users,
      merchants,
      devices,
      visitorApplications,
      accessRecords,
    };
  }

  /**
   * 创建高流量测试场景
   */
  private static createHighTrafficScenario() {
    const merchants = this.createMerchants(2);
    const users: TestUser[] = [];
    const visitorApplications: TestVisitorApplication[] = [];
    const accessRecords: TestAccessRecord[] = [];

    merchants.forEach(merchant => {
      const admin = this.createMerchantAdmin(merchant.id!, { name: `${merchant.name}管理员` });
      const employees = this.createUsers(10, { 
        merchantId: merchant.id,
        role: 'merchant_employee',
      });
      users.push(admin, ...employees);

      // 为每个员工创建多个访客申请
      employees.forEach(employee => {
        const applications = this.createVisitorApplications(
          3,
          employee.id!,
          employee.name,
          merchant.id!
        );
        visitorApplications.push(...applications);

        // 为每个员工创建多条通行记录
        const records = Array.from({ length: 5 }, (_, i) => 
          this.createAccessRecord(
            employee.id!,
            employee.name,
            1,
            '大厅闸机A',
            merchant.id!,
            { accessTime: new Date(Date.now() - i * 60 * 60 * 1000).toISOString() }
          )
        );
        accessRecords.push(...records);
      });
    });

    const devices = this.createDevices(6);

    return {
      users,
      merchants,
      devices,
      visitorApplications,
      accessRecords,
    };
  }
}