import database from '../../src/utils/database.js';

/**
 * 数据库测试辅助工具
 * 提供直接插入测试数据到数据库的方法
 */
export class DatabaseHelper {
  /**
   * 创建测试商户并插入数据库
   */
  static async createMerchant(overrides: any = {}) {
    const timestamp = Date.now();
    const defaultData = {
      name: `测试商户${timestamp}`,
      code: `TEST_MERCHANT_${timestamp}`,
      contact: '张三',
      phone: `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      email: `test${timestamp}@example.com`,
      address: '测试地址',
      status: 'active',
      settings: null
    };

    const merchantData = { ...defaultData, ...overrides };
    
    const sql = `
      INSERT INTO merchants (name, code, contact, phone, email, address, status, settings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      merchantData.name,
      merchantData.code,
      merchantData.contact,
      merchantData.phone,
      merchantData.email,
      merchantData.address,
      merchantData.status,
      merchantData.settings
    ];

    const result = await database.run(sql, params);
    return { id: result.lastID, ...merchantData };
  }

  /**
   * 创建测试用户并插入数据库
   */
  static async createUser(overrides: any = {}) {
    const timestamp = Date.now();
    const defaultData = {
      open_id: `test_open_id_${timestamp}`,
      union_id: `test_union_id_${timestamp}`,
      phone: `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      name: `测试用户${timestamp}`,
      avatar: 'https://example.com/avatar.jpg',
      user_type: 'employee',
      status: 'active',
      merchant_id: null
    };

    const userData = { ...defaultData, ...overrides };
    
    const sql = `
      INSERT INTO users (open_id, union_id, phone, name, avatar, user_type, status, merchant_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      userData.open_id,
      userData.union_id,
      userData.phone,
      userData.name,
      userData.avatar,
      userData.user_type,
      userData.status,
      userData.merchant_id
    ];

    const result = await database.run(sql, params);
    return { id: result.lastID, ...userData };
  }

  /**
   * 创建测试项目并插入数据库
   */
  static async createProject(overrides: any = {}) {
    const timestamp = Date.now();
    const defaultData = {
      code: `TEST_PROJECT_${timestamp}`,
      name: `测试项目${timestamp}`,
      description: '测试项目描述',
      status: 'active'
    };

    const projectData = { ...defaultData, ...overrides };
    
    const sql = `
      INSERT INTO projects (code, name, description, status)
      VALUES (?, ?, ?, ?)
    `;
    
    const params = [
      projectData.code,
      projectData.name,
      projectData.description,
      projectData.status
    ];

    const result = await database.run(sql, params);
    return { id: result.lastID, ...projectData };
  }

  /**
   * 创建测试场地并插入数据库
   */
  static async createVenue(projectId: number, overrides: any = {}) {
    const timestamp = Date.now();
    const defaultData = {
      project_id: projectId,
      code: `TEST_VENUE_${timestamp}`,
      name: `测试场地${timestamp}`,
      description: '测试场地描述',
      status: 'active'
    };

    const venueData = { ...defaultData, ...overrides };
    
    const sql = `
      INSERT INTO venues (project_id, code, name, description, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const params = [
      venueData.project_id,
      venueData.code,
      venueData.name,
      venueData.description,
      venueData.status
    ];

    const result = await database.run(sql, params);
    return { id: result.lastID, ...venueData };
  }

  /**
   * 创建测试楼层并插入数据库
   */
  static async createFloor(venueId: number, overrides: any = {}) {
    const timestamp = Date.now();
    const defaultData = {
      venue_id: venueId,
      code: `TEST_FLOOR_${timestamp}`,
      name: `测试楼层${timestamp}`,
      description: '测试楼层描述',
      status: 'active'
    };

    const floorData = { ...defaultData, ...overrides };
    
    const sql = `
      INSERT INTO floors (venue_id, code, name, description, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const params = [
      floorData.venue_id,
      floorData.code,
      floorData.name,
      floorData.description,
      floorData.status
    ];

    const result = await database.run(sql, params);
    return { id: result.lastID, ...floorData };
  }

  /**
   * 创建测试权限并插入数据库
   */
  static async createPermission(overrides: any = {}) {
    const timestamp = Date.now();
    const defaultData = {
      code: `TEST_PERMISSION_${timestamp}`,
      name: `测试权限${timestamp}`,
      description: '测试权限描述',
      resource_type: 'project',
      resource_id: 1,
      actions: JSON.stringify(['read', 'write'])
    };

    const permissionData = { ...defaultData, ...overrides };
    
    const sql = `
      INSERT INTO permissions (code, name, description, resource_type, resource_id, actions)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      permissionData.code,
      permissionData.name,
      permissionData.description,
      permissionData.resource_type,
      permissionData.resource_id,
      permissionData.actions
    ];

    const result = await database.run(sql, params);
    return { id: result.lastID, ...permissionData };
  }

  /**
   * 创建测试访客申请并插入数据库
   */
  static async createVisitorApplication(applicantId: number, merchantId: number, overrides: any = {}) {
    const timestamp = Date.now();
    const defaultData = {
      applicant_id: applicantId,
      merchant_id: merchantId,
      visitee_id: null,
      visitor_name: `访客${timestamp}`,
      visitor_phone: `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      visitor_company: '访客公司',
      visit_purpose: '商务洽谈',
      visit_type: '商务访问',
      scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 明天
      duration: 4,
      status: 'pending',
      usage_limit: 10,
      usage_count: 0
    };

    const applicationData = { ...defaultData, ...overrides };
    
    const sql = `
      INSERT INTO visitor_applications (
        applicant_id, merchant_id, visitee_id, visitor_name, visitor_phone, 
        visitor_company, visit_purpose, visit_type, scheduled_time, duration, 
        status, usage_limit, usage_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      applicationData.applicant_id,
      applicationData.merchant_id,
      applicationData.visitee_id,
      applicationData.visitor_name,
      applicationData.visitor_phone,
      applicationData.visitor_company,
      applicationData.visit_purpose,
      applicationData.visit_type,
      applicationData.scheduled_time,
      applicationData.duration,
      applicationData.status,
      applicationData.usage_limit,
      applicationData.usage_count
    ];

    const result = await database.run(sql, params);
    return { id: result.lastID, ...applicationData };
  }

  /**
   * 创建测试通行码并插入数据库
   */
  static async createPasscode(userId: number, overrides: any = {}) {
    const timestamp = Date.now();
    const defaultData = {
      user_id: userId,
      code: `TEST_CODE_${timestamp}`,
      type: 'employee',
      status: 'active',
      expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 明天过期
      usage_limit: 100,
      usage_count: 0,
      permissions: JSON.stringify(['PROJECT_ACCESS']),
      application_id: null
    };

    const passcodeData = { ...defaultData, ...overrides };
    
    const sql = `
      INSERT INTO passcodes (
        user_id, code, type, status, expiry_time, usage_limit, 
        usage_count, permissions, application_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      passcodeData.user_id,
      passcodeData.code,
      passcodeData.type,
      passcodeData.status,
      passcodeData.expiry_time,
      passcodeData.usage_limit,
      passcodeData.usage_count,
      passcodeData.permissions,
      passcodeData.application_id
    ];

    const result = await database.run(sql, params);
    return { id: result.lastID, ...passcodeData };
  }

  /**
   * 创建测试通行记录并插入数据库
   */
  static async createAccessRecord(userId: number, overrides: any = {}) {
    const timestamp = Date.now();
    const defaultData = {
      user_id: userId,
      passcode_id: null,
      device_id: `TEST_DEVICE_${timestamp}`,
      device_type: 'door_scanner',
      direction: 'in',
      result: 'success',
      fail_reason: null,
      project_id: null,
      venue_id: null,
      floor_id: null,
      timestamp: new Date().toISOString()
    };

    const recordData = { ...defaultData, ...overrides };
    
    const sql = `
      INSERT INTO access_records (
        user_id, passcode_id, device_id, device_type, direction, 
        result, fail_reason, project_id, venue_id, floor_id, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      recordData.user_id,
      recordData.passcode_id,
      recordData.device_id,
      recordData.device_type,
      recordData.direction,
      recordData.result,
      recordData.fail_reason,
      recordData.project_id,
      recordData.venue_id,
      recordData.floor_id,
      recordData.timestamp
    ];

    const result = await database.run(sql, params);
    return { id: result.lastID, ...recordData };
  }

  /**
   * 等待一小段时间，确保数据库操作完成
   */
  static async waitForDatabase(ms: number = 10): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 验证记录是否存在
   */
  static async recordExists(table: string, id: number): Promise<boolean> {
    const result = await database.get(`SELECT 1 FROM ${table} WHERE id = ?`, [id]);
    return !!result;
  }
}