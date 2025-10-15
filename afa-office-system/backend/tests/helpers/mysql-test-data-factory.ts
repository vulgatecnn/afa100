/**
 * MySQL测试数据工厂
 * 专门为MySQL数据库优化的测试数据生成工具
 */

import { faker } from '@faker-js/faker';
import { MySQLAdapter } from '../../src/adapters/mysql-adapter';
// Note: Using faker with default locale

// 定义本地数据类型（避免跨目录导入问题）
interface User {
  id?: number;
  name: string;
  email: string;
  phone: string;
  password?: string;
  user_type: 'tenant_admin' | 'merchant_admin' | 'merchant_employee';
  status: 'active' | 'inactive' | 'pending';
  merchant_id?: number;
  open_id?: string;
  union_id?: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

interface Merchant {
  id?: number;
  name: string;
  code: string;
  contact: string;
  phone: string;
  email: string;
  address?: string;
  status: 'active' | 'inactive' | 'pending';
  settings?: any;
  created_at: string;
  updated_at: string;
}

interface VisitorApplication {
  id?: number;
  visitor_name: string;
  phone: string;
  company: string;
  purpose: string;
  visit_date: string;
  duration: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  qr_code?: string;
  passcode_id?: number;
  merchant_id: number;
  applicant_id: number;
  approved_by?: number;
  rejected_reason?: string;
  usage_count: number;
  max_usage: number;
  created_at: string;
  updated_at: string;
}

interface Passcode {
  id?: number;
  code: string;
  user_id: number;
  type: 'employee' | 'visitor';
  status: 'active' | 'expired' | 'used';
  valid_from: string;
  valid_until: string;
  usage_count: number;
  max_usage: number;
  qr_code_data?: string;
  created_at: string;
  updated_at: string;
}

interface AccessRecord {
  id?: number;
  user_id: number;
  passcode_id: number;
  device_id: string;
  location: string;
  result: 'success' | 'failed' | 'denied';
  failure_reason?: string | undefined;
  access_time: string;
  created_at: string;
}

/**
 * MySQL特有的数据类型和约束
 */
interface MySQLDataConstraints {
  maxStringLength: number;
  maxTextLength: number;
  dateFormat: string;
  timestampFormat: string;
  booleanFormat: 'TINYINT' | 'BOOLEAN';
  autoIncrementStart: number;
}

/**
 * MySQL数据库配置
 */
const MYSQL_CONSTRAINTS: MySQLDataConstraints = {
  maxStringLength: 255,
  maxTextLength: 65535,
  dateFormat: 'YYYY-MM-DD HH:mm:ss',
  timestampFormat: 'YYYY-MM-DD HH:mm:ss',
  booleanFormat: 'TINYINT',
  autoIncrementStart: 1
};

/**
 * MySQL测试数据工厂类
 */
export class MySQLTestDataFactory {
  private adapter: MySQLAdapter;
  private batchSize: number;
  private useTransactions: boolean;

  constructor(adapter: MySQLAdapter, options: { batchSize?: number; useTransactions?: boolean } = {}) {
    this.adapter = adapter;
    this.batchSize = options.batchSize || 100;
    this.useTransactions = options.useTransactions !== false;
  }

  /**
   * 格式化MySQL日期时间
   */
  private formatMySQLDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().slice(0, 19).replace('T', ' ');
  }

  /**
   * 验证字符串长度（MySQL约束）
   */
  private validateStringLength(value: string, maxLength: number = MYSQL_CONSTRAINTS.maxStringLength): string {
    return value.length > maxLength ? value.substring(0, maxLength) : value;
  }

  /**
   * 生成MySQL兼容的用户数据
   */
  createMySQLUser(overrides: Partial<User> = {}): any {
    const baseUser: User = {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      password: faker.internet.password(),
      user_type: faker.helpers.arrayElement(['tenant_admin', 'merchant_admin', 'merchant_employee']),
      status: faker.helpers.arrayElement(['active', 'inactive', 'pending']),
      merchant_id: faker.number.int({ min: 1, max: 100 }),
      open_id: faker.string.uuid(),
      union_id: faker.string.uuid(),
      avatar: faker.image.avatar(),
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString(),
      ...overrides
    };
    
    return {
      ...baseUser,
      name: this.validateStringLength(baseUser.name, 100),
      email: this.validateStringLength(baseUser.email, 100),
      phone: this.validateStringLength(baseUser.phone, 20),
      password: baseUser.password ? this.validateStringLength(baseUser.password, 255) : null,
      open_id: baseUser.open_id ? this.validateStringLength(baseUser.open_id, 255) : null,
      union_id: baseUser.union_id ? this.validateStringLength(baseUser.union_id, 255) : null,
      avatar: baseUser.avatar ? this.validateStringLength(baseUser.avatar, 500) : null,
      created_at: this.formatMySQLDateTime(baseUser.created_at),
      updated_at: this.formatMySQLDateTime(baseUser.updated_at)
    };
  }

  /**
   * 生成MySQL兼容的商户数据
   */
  createMySQLMerchant(overrides: Partial<Merchant> = {}): any {
    const baseMerchant: Merchant = {
      name: faker.company.name(),
      code: `MERCHANT_${faker.number.int({ min: 1000, max: 9999 })}`,
      contact: faker.person.fullName(),
      phone: faker.phone.number(),
      email: faker.internet.email(),
      address: faker.location.streetAddress(),
      status: faker.helpers.arrayElement(['active', 'inactive', 'pending']),
      settings: {
        allowVisitorSelfApply: faker.datatype.boolean(),
        maxVisitorDuration: faker.number.int({ min: 1, max: 24 }),
        requireApproval: faker.datatype.boolean()
      },
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString(),
      ...overrides
    };
    
    return {
      ...baseMerchant,
      name: this.validateStringLength(baseMerchant.name, 200),
      code: this.validateStringLength(baseMerchant.code, 50),
      contact: this.validateStringLength(baseMerchant.contact, 100),
      phone: this.validateStringLength(baseMerchant.phone, 20),
      email: this.validateStringLength(baseMerchant.email, 100),
      address: baseMerchant.address ? this.validateStringLength(baseMerchant.address, 500) : null,
      settings: baseMerchant.settings ? JSON.stringify(baseMerchant.settings) : null,
      created_at: this.formatMySQLDateTime(baseMerchant.created_at),
      updated_at: this.formatMySQLDateTime(baseMerchant.updated_at)
    };
  }

  /**
   * 生成MySQL兼容的访客申请数据
   */
  createMySQLVisitorApplication(overrides: Partial<VisitorApplication> = {}): any {
    const baseApplication: VisitorApplication = {
      visitor_name: faker.person.fullName(),
      phone: faker.phone.number(),
      company: faker.company.name(),
      purpose: faker.helpers.arrayElement(['商务洽谈', '技术交流', '参观访问', '会议讨论', '项目合作']),
      visit_date: faker.date.future().toISOString(),
      duration: faker.number.int({ min: 1, max: 8 }),
      status: faker.helpers.arrayElement(['pending', 'approved', 'rejected', 'expired']),
      qr_code: faker.string.uuid(),
      passcode_id: faker.number.int({ min: 1, max: 1000 }),
      merchant_id: faker.number.int({ min: 1, max: 100 }),
      applicant_id: faker.number.int({ min: 1, max: 1000 }),
      approved_by: faker.number.int({ min: 1, max: 100 }),
      rejected_reason: faker.lorem.sentence(),
      usage_count: faker.number.int({ min: 0, max: 5 }),
      max_usage: faker.number.int({ min: 1, max: 10 }),
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString(),
      ...overrides
    };
    
    return {
      ...baseApplication,
      visitor_name: this.validateStringLength(baseApplication.visitor_name, 100),
      phone: this.validateStringLength(baseApplication.phone, 20),
      company: this.validateStringLength(baseApplication.company, 200),
      purpose: this.validateStringLength(baseApplication.purpose, 500),
      visit_date: this.formatMySQLDateTime(baseApplication.visit_date),
      qr_code: baseApplication.qr_code ? this.validateStringLength(baseApplication.qr_code, 255) : null,
      rejected_reason: baseApplication.rejected_reason ? this.validateStringLength(baseApplication.rejected_reason, 500) : null,
      created_at: this.formatMySQLDateTime(baseApplication.created_at),
      updated_at: this.formatMySQLDateTime(baseApplication.updated_at)
    };
  }

  /**
   * 生成MySQL兼容的通行码数据
   */
  createMySQLPasscode(overrides: Partial<Passcode> = {}): any {
    const validFrom = faker.date.recent();
    const validUntil = faker.date.future();
    
    const basePasscode: Passcode = {
      code: faker.string.uuid().replace(/-/g, '').substring(0, 16).toUpperCase(),
      user_id: faker.number.int({ min: 1, max: 1000 }),
      type: faker.helpers.arrayElement(['employee', 'visitor']),
      status: faker.helpers.arrayElement(['active', 'expired', 'used']),
      valid_from: validFrom.toISOString(),
      valid_until: validUntil.toISOString(),
      usage_count: faker.number.int({ min: 0, max: 5 }),
      max_usage: faker.number.int({ min: 1, max: 10 }),
      qr_code_data: faker.string.alphanumeric(32),
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString(),
      ...overrides
    };
    
    return {
      ...basePasscode,
      code: this.validateStringLength(basePasscode.code, 255),
      valid_from: this.formatMySQLDateTime(basePasscode.valid_from),
      valid_until: this.formatMySQLDateTime(basePasscode.valid_until),
      qr_code_data: basePasscode.qr_code_data ? this.validateStringLength(basePasscode.qr_code_data, 1000) : null,
      created_at: this.formatMySQLDateTime(basePasscode.created_at),
      updated_at: this.formatMySQLDateTime(basePasscode.updated_at)
    };
  }

  /**
   * 生成MySQL兼容的通行记录数据
   */
  createMySQLAccessRecord(overrides: Partial<AccessRecord> = {}): any {
    const baseRecord: AccessRecord = {
      user_id: faker.number.int({ min: 1, max: 1000 }),
      passcode_id: faker.number.int({ min: 1, max: 10000 }),
      device_id: `DEVICE_${faker.number.int({ min: 1000, max: 9999 })}`,
      location: faker.helpers.arrayElement(['A座大门', 'B座大门', 'C座大门', '1楼电梯口', '2楼会议室']),
      result: faker.helpers.arrayElement(['success', 'failed', 'denied']),
      failure_reason: faker.helpers.maybe(() => 
        faker.helpers.arrayElement(['通行码已过期', '权限不足', '设备故障', '网络异常']), 
        { probability: 0.3 }
      ),
      access_time: faker.date.recent().toISOString(),
      created_at: faker.date.recent().toISOString(),
      ...overrides
    };
    
    return {
      ...baseRecord,
      device_id: this.validateStringLength(baseRecord.device_id, 100),
      location: this.validateStringLength(baseRecord.location, 200),
      failure_reason: baseRecord.failure_reason ? this.validateStringLength(baseRecord.failure_reason, 500) : null,
      access_time: this.formatMySQLDateTime(baseRecord.access_time),
      created_at: this.formatMySQLDateTime(baseRecord.created_at)
    };
  }

  /**
   * 批量插入用户数据（MySQL优化）
   */
  async seedMySQLUsers(count: number, overrides: Partial<User> = {}): Promise<any[]> {
    const users = Array.from({ length: count }, () => this.createMySQLUser(overrides));
    
    if (count === 0) return [];

    const transaction = this.useTransactions ? await this.adapter.beginTransaction() : null;
    
    try {
      const insertedUsers = [];
      
      // 使用批量插入优化性能
      for (let i = 0; i < users.length; i += this.batchSize) {
        const batch = users.slice(i, i + this.batchSize);
        
        for (const userData of batch) {
          const result = await this.adapter.run(
            `INSERT INTO users (name, email, phone, password, user_type, status, merchant_id, open_id, union_id, avatar, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userData.name,
              userData.email,
              userData.phone,
              userData.password,
              userData.user_type,
              userData.status,
              userData.merchant_id,
              userData.open_id,
              userData.union_id,
              userData.avatar,
              userData.created_at,
              userData.updated_at
            ]
          );
          
          insertedUsers.push({ ...userData, id: result.lastID });
        }
      }
      
      if (transaction) {
        await transaction.commit();
      }
      
      console.log(`✅ 成功插入 ${insertedUsers.length} 条用户数据到MySQL`);
      return insertedUsers;
      
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('MySQL用户数据插入失败:', error);
      throw error;
    }
  }

  /**
   * 批量插入商户数据（MySQL优化）
   */
  async seedMySQLMerchants(count: number, overrides: Partial<Merchant> = {}): Promise<any[]> {
    const merchants = Array.from({ length: count }, () => this.createMySQLMerchant(overrides));
    
    if (count === 0) return [];

    const transaction = this.useTransactions ? await this.adapter.beginTransaction() : null;
    
    try {
      const insertedMerchants = [];
      
      for (let i = 0; i < merchants.length; i += this.batchSize) {
        const batch = merchants.slice(i, i + this.batchSize);
        
        for (const merchantData of batch) {
          const result = await this.adapter.run(
            `INSERT INTO merchants (name, code, contact, phone, email, address, status, settings, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              merchantData.name,
              merchantData.code,
              merchantData.contact,
              merchantData.phone,
              merchantData.email,
              merchantData.address,
              merchantData.status,
              merchantData.settings,
              merchantData.created_at,
              merchantData.updated_at
            ]
          );
          
          insertedMerchants.push({ ...merchantData, id: result.lastID });
        }
      }
      
      if (transaction) {
        await transaction.commit();
      }
      
      console.log(`✅ 成功插入 ${insertedMerchants.length} 条商户数据到MySQL`);
      return insertedMerchants;
      
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('MySQL商户数据插入失败:', error);
      throw error;
    }
  }

  /**
   * 批量插入访客申请数据（MySQL优化）
   */
  async seedMySQLVisitorApplications(count: number, overrides: Partial<VisitorApplication> = {}): Promise<any[]> {
    const applications = Array.from({ length: count }, () => this.createMySQLVisitorApplication(overrides));
    
    if (count === 0) return [];

    const transaction = this.useTransactions ? await this.adapter.beginTransaction() : null;
    
    try {
      const insertedApplications = [];
      
      for (let i = 0; i < applications.length; i += this.batchSize) {
        const batch = applications.slice(i, i + this.batchSize);
        
        for (const appData of batch) {
          const result = await this.adapter.run(
            `INSERT INTO visitor_applications (visitor_name, phone, company, purpose, visit_date, duration, status, qr_code, passcode_id, merchant_id, applicant_id, approved_by, rejected_reason, usage_count, max_usage, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              appData.visitor_name,
              appData.phone,
              appData.company,
              appData.purpose,
              appData.visit_date,
              appData.duration,
              appData.status,
              appData.qr_code,
              appData.passcode_id,
              appData.merchant_id,
              appData.applicant_id,
              appData.approved_by,
              appData.rejected_reason,
              appData.usage_count,
              appData.max_usage,
              appData.created_at,
              appData.updated_at
            ]
          );
          
          insertedApplications.push({ ...appData, id: result.lastID });
        }
      }
      
      if (transaction) {
        await transaction.commit();
      }
      
      console.log(`✅ 成功插入 ${insertedApplications.length} 条访客申请数据到MySQL`);
      return insertedApplications;
      
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('MySQL访客申请数据插入失败:', error);
      throw error;
    }
  }

  /**
   * 批量插入通行码数据（MySQL优化）
   */
  async seedMySQLPasscodes(count: number, overrides: Partial<Passcode> = {}): Promise<any[]> {
    const passcodes = Array.from({ length: count }, () => this.createMySQLPasscode(overrides));
    
    if (count === 0) return [];

    const transaction = this.useTransactions ? await this.adapter.beginTransaction() : null;
    
    try {
      const insertedPasscodes = [];
      
      for (let i = 0; i < passcodes.length; i += this.batchSize) {
        const batch = passcodes.slice(i, i + this.batchSize);
        
        for (const passcodeData of batch) {
          const result = await this.adapter.run(
            `INSERT INTO passcodes (code, user_id, type, status, valid_from, valid_until, usage_count, max_usage, qr_code_data, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              passcodeData.code,
              passcodeData.user_id,
              passcodeData.type,
              passcodeData.status,
              passcodeData.valid_from,
              passcodeData.valid_until,
              passcodeData.usage_count,
              passcodeData.max_usage,
              passcodeData.qr_code_data,
              passcodeData.created_at,
              passcodeData.updated_at
            ]
          );
          
          insertedPasscodes.push({ ...passcodeData, id: result.lastID });
        }
      }
      
      if (transaction) {
        await transaction.commit();
      }
      
      console.log(`✅ 成功插入 ${insertedPasscodes.length} 条通行码数据到MySQL`);
      return insertedPasscodes;
      
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('MySQL通行码数据插入失败:', error);
      throw error;
    }
  }

  /**
   * 批量插入通行记录数据（MySQL优化）
   */
  async seedMySQLAccessRecords(count: number, overrides: Partial<AccessRecord> = {}): Promise<any[]> {
    const records = Array.from({ length: count }, () => this.createMySQLAccessRecord(overrides));
    
    if (count === 0) return [];

    const transaction = this.useTransactions ? await this.adapter.beginTransaction() : null;
    
    try {
      const insertedRecords = [];
      
      for (let i = 0; i < records.length; i += this.batchSize) {
        const batch = records.slice(i, i + this.batchSize);
        
        for (const recordData of batch) {
          const result = await this.adapter.run(
            `INSERT INTO access_records (user_id, passcode_id, device_id, location, result, failure_reason, access_time, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              recordData.user_id,
              recordData.passcode_id,
              recordData.device_id,
              recordData.location,
              recordData.result,
              recordData.failure_reason,
              recordData.access_time,
              recordData.created_at
            ]
          );
          
          insertedRecords.push({ ...recordData, id: result.lastID });
        }
      }
      
      if (transaction) {
        await transaction.commit();
      }
      
      console.log(`✅ 成功插入 ${insertedRecords.length} 条通行记录数据到MySQL`);
      return insertedRecords;
      
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('MySQL通行记录数据插入失败:', error);
      throw error;
    }
  }

  /**
   * 创建完整的MySQL测试场景数据
   */
  async seedMySQLCompleteScenario(): Promise<any> {
    console.log('🏗️ 开始创建MySQL完整测试场景数据...');
    
    const transaction = this.useTransactions ? await this.adapter.beginTransaction() : null;
    
    try {
      // 创建商户
      const merchants = await this.seedMySQLMerchants(2, { status: 'active' });
      
      // 创建管理员用户
      const admin = await this.seedMySQLUsers(1, {
        user_type: 'tenant_admin',
        status: 'active'
      });
      
      // 创建员工用户
      const employees = await this.seedMySQLUsers(3, {
        user_type: 'merchant_employee',
        merchant_id: merchants[0].id,
        status: 'active'
      });
      
      // 创建访客申请
      const applications = await this.seedMySQLVisitorApplications(5, {
        merchant_id: merchants[0].id,
        applicant_id: employees[0].id
      });
      
      // 创建通行码
      const passcodes = await this.seedMySQLPasscodes(5, {
        user_id: employees[0].id,
        status: 'active'
      });
      
      // 创建通行记录
      const accessRecords = await this.seedMySQLAccessRecords(10, {
        user_id: employees[0].id,
        passcode_id: passcodes[0].id
      });
      
      if (transaction) {
        await transaction.commit();
      }
      
      const scenario = {
        merchants,
        admin: admin[0],
        employees,
        applications,
        passcodes,
        accessRecords
      };
      
      console.log('✅ MySQL完整测试场景数据创建成功');
      return scenario;
      
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('MySQL完整测试场景数据创建失败:', error);
      throw error;
    }
  }

  /**
   * 使用MySQL特有的BULK INSERT优化大量数据插入
   */
  async bulkInsertUsers(users: any[]): Promise<void> {
    if (users.length === 0) return;

    // 构建批量插入SQL
    const values = users.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const sql = `INSERT INTO users (name, email, phone, password, user_type, status, merchant_id, open_id, union_id, avatar, created_at, updated_at) VALUES ${values}`;
    
    // 展开所有参数
    const params = users.flatMap(user => [
      user.name,
      user.email,
      user.phone,
      user.password,
      user.user_type,
      user.status,
      user.merchant_id,
      user.open_id,
      user.union_id,
      user.avatar,
      user.created_at,
      user.updated_at
    ]);

    try {
      await this.adapter.run(sql, params);
      console.log(`✅ 批量插入 ${users.length} 条用户数据成功`);
    } catch (error) {
      console.error('MySQL批量插入用户数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取MySQL数据库性能统计信息
   */
  async getMySQLPerformanceStats(): Promise<any> {
    try {
      const stats = await this.adapter.all(`
        SELECT 
          table_name,
          table_rows,
          data_length,
          index_length,
          (data_length + index_length) as total_size
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        ORDER BY total_size DESC
      `);
      
      return {
        tables: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('获取MySQL性能统计失败:', error);
      return null;
    }
  }

  /**
   * 清理MySQL测试数据
   */
  async cleanupMySQLTestData(): Promise<void> {
    const tables = [
      'access_records',
      'passcodes', 
      'visitor_applications',
      'users',
      'merchants'
    ];

    const transaction = this.useTransactions ? await this.adapter.beginTransaction() : null;
    
    try {
      // 禁用外键检查
      await this.adapter.run('SET FOREIGN_KEY_CHECKS = 0');
      
      for (const table of tables) {
        try {
          await this.adapter.run(`DELETE FROM ${table}`);
          await this.adapter.run(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
          console.log(`🧹 清理表 ${table} 完成`);
        } catch (error) {
          console.warn(`清理表 ${table} 时出错:`, error);
        }
      }
      
      // 重新启用外键检查
      await this.adapter.run('SET FOREIGN_KEY_CHECKS = 1');
      
      if (transaction) {
        await transaction.commit();
      }
      
      console.log('✅ MySQL测试数据清理完成');
      
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('MySQL测试数据清理失败:', error);
      throw error;
    }
  }
}

/**
 * 便捷的工厂函数
 */
export function createMySQLTestDataFactory(adapter: MySQLAdapter, options?: { batchSize?: number; useTransactions?: boolean }): MySQLTestDataFactory {
  return new MySQLTestDataFactory(adapter, options);
}

export default MySQLTestDataFactory;