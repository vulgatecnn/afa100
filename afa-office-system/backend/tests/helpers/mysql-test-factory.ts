/**
 * MySQL测试数据工厂
 * 为单元测试提供标准化的测试数据
 */

import { insertTestData, queryTestData } from '../mysql-setup.js';

/**
 * 用户测试数据工厂
 */
export class UserTestFactory {
  static async create(overrides: Partial<any> = {}): Promise<any> {
    const userData = {
      name: '测试用户',
      email: `test${Date.now()}@example.com`,
      phone: '13800138000',
      password_hash: '$2a$10$test.hash.value',
      user_type: 'tenant_admin',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };

    const id = await insertTestData('users', userData);
    return { id, ...userData };
  }

  static async createMany(count: number, overrides: Partial<any> = {}): Promise<any[]> {
    const users = [];
    for (let i = 0; i < count; i++) {
      const user = await this.create({
        ...overrides,
        email: `test${Date.now()}_${i}@example.com`
      });
      users.push(user);
    }
    return users;
  }

  static async findById(id: number): Promise<any | null> {
    const results = await queryTestData('SELECT * FROM users WHERE id = ?', [id]);
    return results[0] || null;
  }
}

/**
 * 商户测试数据工厂
 */
export class MerchantTestFactory {
  static async create(overrides: Partial<any> = {}): Promise<any> {
    const merchantData = {
      name: '测试商户',
      code: `MERCHANT_${Date.now()}`,
      contact_person: '联系人',
      phone: '13800138001',
      email: `merchant${Date.now()}@example.com`,
      status: 'active',
      settings: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };

    const id = await insertTestData('merchants', merchantData);
    return { id, ...merchantData };
  }

  static async createMany(count: number, overrides: Partial<any> = {}): Promise<any[]> {
    const merchants = [];
    for (let i = 0; i < count; i++) {
      const merchant = await this.create({
        ...overrides,
        code: `MERCHANT_${Date.now()}_${i}`,
        email: `merchant${Date.now()}_${i}@example.com`
      });
      merchants.push(merchant);
    }
    return merchants;
  }

  static async findById(id: number): Promise<any | null> {
    const results = await queryTestData('SELECT * FROM merchants WHERE id = ?', [id]);
    return results[0] || null;
  }
}

/**
 * 空间测试数据工厂
 */
export class SpaceTestFactory {
  static async create(overrides: Partial<any> = {}): Promise<any> {
    const spaceData = {
      name: '测试空间',
      type: 'room',
      code: `SPACE_${Date.now()}`,
      parent_id: null,
      status: 'active',
      description: '测试空间描述',
      capacity: 10,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };

    const id = await insertTestData('spaces', spaceData);
    return { id, ...spaceData };
  }

  static async createMany(count: number, overrides: Partial<any> = {}): Promise<any[]> {
    const spaces = [];
    for (let i = 0; i < count; i++) {
      const space = await this.create({
        ...overrides,
        code: `SPACE_${Date.now()}_${i}`,
        name: `测试空间${i + 1}`
      });
      spaces.push(space);
    }
    return spaces;
  }

  static async findById(id: number): Promise<any | null> {
    const results = await queryTestData('SELECT * FROM spaces WHERE id = ?', [id]);
    return results[0] || null;
  }
}

/**
 * 访客申请测试数据工厂
 */
export class VisitorApplicationTestFactory {
  static async create(overrides: Partial<any> = {}): Promise<any> {
    const applicationData = {
      visitor_name: '测试访客',
      phone: '13800138002',
      company: '测试公司',
      purpose: '商务洽谈',
      visit_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明天
      duration: 2,
      status: 'pending',
      qr_code: `QR_${Date.now()}`,
      merchant_id: 1,
      applicant_id: 1,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };

    const id = await insertTestData('visitor_applications', applicationData);
    return { id, ...applicationData };
  }

  static async createMany(count: number, overrides: Partial<any> = {}): Promise<any[]> {
    const applications = [];
    for (let i = 0; i < count; i++) {
      const application = await this.create({
        ...overrides,
        qr_code: `QR_${Date.now()}_${i}`,
        visitor_name: `测试访客${i + 1}`
      });
      applications.push(application);
    }
    return applications;
  }

  static async findById(id: number): Promise<any | null> {
    const results = await queryTestData('SELECT * FROM visitor_applications WHERE id = ?', [id]);
    return results[0] || null;
  }
}

/**
 * 通行码测试数据工厂
 */
export class PasscodeTestFactory {
  static async create(overrides: Partial<any> = {}): Promise<any> {
    const passcodeData = {
      code: `PASS_${Date.now()}`,
      user_id: 1,
      type: 'temporary',
      status: 'active',
      valid_from: new Date(),
      valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
      usage_count: 0,
      max_usage: 10,
      qr_code_data: JSON.stringify({ code: `PASS_${Date.now()}` }),
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };

    const id = await insertTestData('passcodes', passcodeData);
    return { id, ...passcodeData };
  }

  static async createMany(count: number, overrides: Partial<any> = {}): Promise<any[]> {
    const passcodes = [];
    for (let i = 0; i < count; i++) {
      const passcode = await this.create({
        ...overrides,
        code: `PASS_${Date.now()}_${i}`
      });
      passcodes.push(passcode);
    }
    return passcodes;
  }

  static async findById(id: number): Promise<any | null> {
    const results = await queryTestData('SELECT * FROM passcodes WHERE id = ?', [id]);
    return results[0] || null;
  }
}

/**
 * 通行记录测试数据工厂
 */
export class AccessRecordTestFactory {
  static async create(overrides: Partial<any> = {}): Promise<any> {
    const recordData = {
      user_id: 1,
      passcode_id: 1,
      device_id: 'DEVICE_001',
      location: '大厅入口',
      result: 'success',
      failure_reason: null,
      access_time: new Date(),
      created_at: new Date(),
      ...overrides
    };

    const id = await insertTestData('access_records', recordData);
    return { id, ...recordData };
  }

  static async createMany(count: number, overrides: Partial<any> = {}): Promise<any[]> {
    const records = [];
    for (let i = 0; i < count; i++) {
      const record = await this.create({
        ...overrides,
        device_id: `DEVICE_${String(i + 1).padStart(3, '0')}`
      });
      records.push(record);
    }
    return records;
  }

  static async findById(id: number): Promise<any | null> {
    const results = await queryTestData('SELECT * FROM access_records WHERE id = ?', [id]);
    return results[0] || null;
  }
}

/**
 * 完整测试场景工厂
 */
export class TestScenarioFactory {
  /**
   * 创建完整的测试场景：用户 -> 商户 -> 空间 -> 访客申请 -> 通行码 -> 通行记录
   */
  static async createCompleteScenario(): Promise<{
    user: any;
    merchant: any;
    space: any;
    visitorApplication: any;
    passcode: any;
    accessRecord: any;
  }> {
    // 创建用户
    const user = await UserTestFactory.create({
      user_type: 'merchant_admin'
    });

    // 创建商户
    const merchant = await MerchantTestFactory.create();

    // 创建空间
    const space = await SpaceTestFactory.create();

    // 创建访客申请
    const visitorApplication = await VisitorApplicationTestFactory.create({
      merchant_id: merchant.id,
      applicant_id: user.id
    });

    // 创建通行码
    const passcode = await PasscodeTestFactory.create({
      user_id: user.id
    });

    // 创建通行记录
    const accessRecord = await AccessRecordTestFactory.create({
      user_id: user.id,
      passcode_id: passcode.id
    });

    return {
      user,
      merchant,
      space,
      visitorApplication,
      passcode,
      accessRecord
    };
  }
}

// 所有工厂类已经在上面定义时导出了，这里不需要重复导出