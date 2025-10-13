/**
 * 数据库种子数据管理器
 * 管理测试数据的生命周期，包括创建、清理和重置
 */

import mysql from 'mysql2/promise';
import { TestConfigManager, type TestEnvironment } from '../../src/utils/test-config-manager.js';
import { TestDataFactory } from './test-data-factory.js';
import type { User, Merchant, Project, Venue, Floor, VisitorApplication, AccessRecord } from '../../src/types/index.js';

export interface SeedData {
  merchants: Merchant[];
  users: User[];
  projects: Project[];
  venues: Venue[];
  floors: Floor[];
  visitorApplications: VisitorApplication[];
  accessRecords: AccessRecord[];
}

export interface SeedOptions {
  merchantCount?: number;
  usersPerMerchant?: number;
  projectCount?: number;
  venuesPerProject?: number;
  floorsPerVenue?: number;
  visitorApplicationCount?: number;
  accessRecordCount?: number;
  includeAdminUser?: boolean;
  // 兼容性选项
  includeUsers?: boolean;
  includeMerchants?: boolean;
  includeEmployees?: boolean;
  includeVisitors?: boolean;
  includeProjects?: boolean;
  includeVenues?: boolean;
  includeFloors?: boolean;
  includeAccessRecords?: boolean;
  // 数量选项
  users?: number;
  merchants?: number;
  visitors?: number;
  projects?: number;
}

/**
 * 数据库种子数据管理器类
 */
export class DatabaseSeeder {
  private connection: mysql.Connection | null = null;
  private currentEnv: TestEnvironment = 'unit';

  constructor(env: TestEnvironment = 'unit') {
    this.currentEnv = env;
  }

  /**
   * 初始化数据库连接
   */
  async initialize(): Promise<void> {
    const config = TestConfigManager.getConfig(this.currentEnv);
    
    this.connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      multipleStatements: true,
    });

    console.log(`数据库种子管理器已连接到: ${config.database.database}`);
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      console.log('数据库种子管理器连接已关闭');
    }
  }

  /**
   * 清理所有测试数据
   */
  async cleanDatabase(): Promise<void> {
    if (!this.connection) {
      throw new Error('数据库连接未初始化');
    }

    console.log('开始清理测试数据...');

    // 按照外键依赖关系的逆序删除数据
    const tables = [
      'access_records',
      'visitor_applications', 
      'users',
      'floors',
      'venues',
      'projects',
      'merchants'
    ];

    for (const table of tables) {
      try {
        await this.connection.execute(`DELETE FROM ${table} WHERE 1=1`);
        console.log(`已清理表: ${table}`);
      } catch (error) {
        console.warn(`清理表 ${table} 时出现警告:`, error);
      }
    }

    console.log('测试数据清理完成');
  }

  /**
   * 重置自增序列
   */
  async resetSequences(): Promise<void> {
    if (!this.connection) {
      throw new Error('数据库连接未初始化');
    }

    console.log('重置自增序列...');

    const tables = [
      'merchants',
      'projects', 
      'venues',
      'floors',
      'users',
      'visitor_applications',
      'access_records'
    ];

    for (const table of tables) {
      try {
        await this.connection.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
        console.log(`已重置表 ${table} 的自增序列`);
      } catch (error) {
        console.warn(`重置表 ${table} 自增序列时出现警告:`, error);
      }
    }

    // 重置测试数据工厂的计数器
    TestDataFactory.resetAllCounters();
    
    console.log('自增序列重置完成');
  }

  /**
   * 种植测试数据
   */
  async seedTestData(options: SeedOptions = {}): Promise<SeedData> {
    if (!this.connection) {
      throw new Error('数据库连接未初始化');
    }

    console.log('开始种植测试数据...');

    const {
      merchantCount = 3,
      usersPerMerchant = 5,
      projectCount = 2,
      venuesPerProject = 2,
      floorsPerVenue = 3,
      visitorApplicationCount = 10,
      accessRecordCount = 20,
      includeAdminUser = true,
    } = options;

    const seedData: SeedData = {
      merchants: [],
      users: [],
      projects: [],
      venues: [],
      floors: [],
      visitorApplications: [],
      accessRecords: [],
    };

    try {
      // 开始事务
      await this.connection.beginTransaction();

      // 1. 创建商户数据
      console.log('创建商户数据...');
      for (let i = 0; i < merchantCount; i++) {
        const merchant = TestDataFactory.createMerchant();
        const merchantId = await this.insertMerchant(merchant);
        merchant.id = merchantId;
        seedData.merchants.push(merchant);
      }

      // 2. 创建项目数据
      console.log('创建项目数据...');
      for (let i = 0; i < projectCount; i++) {
        const project = TestDataFactory.createProject();
        const projectId = await this.insertProject(project);
        project.id = projectId;
        seedData.projects.push(project);

        // 为每个项目创建场地
        for (let j = 0; j < venuesPerProject; j++) {
          const venue = TestDataFactory.createVenue({ project_id: projectId });
          const venueId = await this.insertVenue(venue);
          venue.id = venueId;
          seedData.venues.push(venue);

          // 为每个场地创建楼层
          for (let k = 0; k < floorsPerVenue; k++) {
            const floor = TestDataFactory.createFloor({ venue_id: venueId });
            const floorId = await this.insertFloor(floor);
            floor.id = floorId;
            seedData.floors.push(floor);
          }
        }
      }

      // 3. 创建系统管理员（如果需要）
      if (includeAdminUser) {
        console.log('创建系统管理员...');
        const admin = TestDataFactory.createAdminUser();
        const adminId = await this.insertUser(admin);
        admin.id = adminId;
        seedData.users.push(admin);
      }

      // 4. 创建用户数据
      console.log('创建用户数据...');
      for (const merchant of seedData.merchants) {
        // 为每个商户创建管理员
        const merchantAdmin = TestDataFactory.createMerchantAdmin(merchant.id);
        const adminId = await this.insertUser(merchantAdmin);
        merchantAdmin.id = adminId;
        seedData.users.push(merchantAdmin);

        // 为每个商户创建员工
        for (let i = 0; i < usersPerMerchant - 1; i++) {
          const employee = TestDataFactory.createEmployee(merchant.id);
          const employeeId = await this.insertUser(employee);
          employee.id = employeeId;
          seedData.users.push(employee);
        }
      }

      // 5. 创建访客申请数据
      console.log('创建访客申请数据...');
      for (let i = 0; i < visitorApplicationCount; i++) {
        const randomMerchant = seedData.merchants[Math.floor(Math.random() * seedData.merchants.length)];
        const merchantUsers = seedData.users.filter(u => u.merchant_id === randomMerchant.id);
        const randomVisitee = merchantUsers[Math.floor(Math.random() * merchantUsers.length)];
        
        const application = TestDataFactory.createVisitorApplication({
          merchant_id: randomMerchant.id,
          visitee_id: randomVisitee.id,
          applicant_id: randomVisitee.id, // 简化：员工为访客申请
        });
        
        // 随机设置一些申请为已批准状态
        if (Math.random() > 0.5) {
          application.status = 'approved';
          application.approved_by = randomVisitee.id;
          application.approved_at = new Date().toISOString();
          application.passcode = `PASS${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
          application.passcode_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        }
        
        const applicationId = await this.insertVisitorApplication(application);
        application.id = applicationId;
        seedData.visitorApplications.push(application);
      }

      // 6. 创建通行记录数据
      console.log('创建通行记录数据...');
      const approvedApplications = seedData.visitorApplications.filter(app => app.status === 'approved');
      
      for (let i = 0; i < accessRecordCount; i++) {
        let accessRecord: AccessRecord;
        
        if (approvedApplications.length > 0 && Math.random() > 0.3) {
          // 70%的概率使用已批准的访客申请
          const randomApplication = approvedApplications[Math.floor(Math.random() * approvedApplications.length)];
          const randomProject = seedData.projects[Math.floor(Math.random() * seedData.projects.length)];
          const randomVenue = seedData.venues.filter(v => v.project_id === randomProject.id)[0];
          const randomFloor = seedData.floors.filter(f => f.venue_id === randomVenue.id)[0];
          
          accessRecord = TestDataFactory.createAccessRecord({
            user_id: randomApplication.applicant_id,
            passcode_id: randomApplication.id,
            project_id: randomProject.id,
            venue_id: randomVenue.id,
            floor_id: randomFloor.id,
          });
        } else {
          // 30%的概率使用员工用户
          const employees = seedData.users.filter(u => u.user_type === 'employee');
          const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
          const randomProject = seedData.projects[Math.floor(Math.random() * seedData.projects.length)];
          const randomVenue = seedData.venues.filter(v => v.project_id === randomProject.id)[0];
          const randomFloor = seedData.floors.filter(f => f.venue_id === randomVenue.id)[0];
          
          accessRecord = TestDataFactory.createAccessRecord({
            user_id: randomEmployee.id,
            passcode_id: undefined, // 员工可能不需要通行码
            project_id: randomProject.id,
            venue_id: randomVenue.id,
            floor_id: randomFloor.id,
          });
        }
        
        const recordId = await this.insertAccessRecord(accessRecord);
        accessRecord.id = recordId;
        seedData.accessRecords.push(accessRecord);
      }

      // 提交事务
      await this.connection.commit();
      console.log('测试数据种植完成');

      return seedData;

    } catch (error) {
      // 回滚事务
      await this.connection.rollback();
      console.error('种植测试数据时发生错误:', error);
      throw error;
    }
  }

  /**
   * 完整的数据库重置和种植
   */
  async resetAndSeed(options: SeedOptions = {}): Promise<SeedData> {
    await this.cleanDatabase();
    await this.resetSequences();
    return await this.seedTestData(options);
  }

  // 私有方法：插入数据到各个表

  private async insertMerchant(merchant: Merchant): Promise<number> {
    const sql = `
      INSERT INTO merchants (name, code, contact, phone, email, address, status, settings, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      merchant.name, merchant.code, merchant.contact, merchant.phone,
      merchant.email, merchant.address, merchant.status, merchant.settings,
      merchant.created_at, merchant.updated_at
    ];
    
    const [result] = await this.connection!.execute(sql, values) as any;
    return result.insertId;
  }

  private async insertProject(project: Project): Promise<number> {
    const sql = `
      INSERT INTO projects (code, name, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [
      project.code, project.name, project.description, project.status,
      project.created_at, project.updated_at
    ];
    
    const [result] = await this.connection!.execute(sql, values) as any;
    return result.insertId;
  }

  private async insertVenue(venue: Venue): Promise<number> {
    const sql = `
      INSERT INTO venues (project_id, code, name, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      venue.project_id, venue.code, venue.name, venue.description,
      venue.status, venue.created_at, venue.updated_at
    ];
    
    const [result] = await this.connection!.execute(sql, values) as any;
    return result.insertId;
  }

  private async insertFloor(floor: Floor): Promise<number> {
    const sql = `
      INSERT INTO floors (venue_id, code, name, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      floor.venue_id, floor.code, floor.name, floor.description,
      floor.status, floor.created_at, floor.updated_at
    ];
    
    const [result] = await this.connection!.execute(sql, values) as any;
    return result.insertId;
  }

  private async insertUser(user: User): Promise<number> {
    const sql = `
      INSERT INTO users (name, phone, user_type, status, merchant_id, open_id, union_id, avatar, password, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      user.name, user.phone, user.user_type, user.status, user.merchant_id,
      user.open_id, user.union_id, user.avatar, user.password,
      user.created_at, user.updated_at
    ];
    
    const [result] = await this.connection!.execute(sql, values) as any;
    return result.insertId;
  }

  private async insertVisitorApplication(application: VisitorApplication): Promise<number> {
    const sql = `
      INSERT INTO visitor_applications (
        applicant_id, merchant_id, visitee_id, visitor_name, visitor_phone, visitor_company,
        visit_purpose, visit_type, scheduled_time, duration, status, approved_by, approved_at,
        passcode, passcode_expiry, usage_limit, usage_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      application.applicant_id, application.merchant_id, application.visitee_id,
      application.visitor_name, application.visitor_phone, application.visitor_company,
      application.visit_purpose, application.visit_type, application.scheduled_time,
      application.duration, application.status, application.approved_by, application.approved_at,
      application.passcode, application.passcode_expiry, application.usage_limit,
      application.usage_count, application.created_at, application.updated_at
    ];
    
    const [result] = await this.connection!.execute(sql, values) as any;
    return result.insertId;
  }

  private async insertAccessRecord(record: AccessRecord): Promise<number> {
    const sql = `
      INSERT INTO access_records (
        user_id, passcode_id, device_id, device_type, direction, result, fail_reason,
        project_id, venue_id, floor_id, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      record.user_id, record.passcode_id || null, record.device_id, record.device_type,
      record.direction, record.result, record.fail_reason, record.project_id,
      record.venue_id, record.floor_id, record.timestamp
    ];
    
    const [result] = await this.connection!.execute(sql, values) as any;
    return result.insertId;
  }

  /**
   * 静态方法：快速种植数据
   */
  static async quickSeed(env: TestEnvironment = 'unit', options: SeedOptions = {}): Promise<SeedData> {
    const seeder = new DatabaseSeeder(env);
    await seeder.initialize();
    
    try {
      return await seeder.resetAndSeed(options);
    } finally {
      await seeder.close();
    }
  }

  /**
   * 静态方法：快速清理数据
   */
  static async quickClean(env: TestEnvironment = 'unit'): Promise<void> {
    const seeder = new DatabaseSeeder(env);
    await seeder.initialize();
    
    try {
      await seeder.cleanDatabase();
      await seeder.resetSequences();
    } finally {
      await seeder.close();
    }
  }

  /**
   * 获取种植数据的统计信息
   */
  getDataStatistics(seedData: SeedData): Record<string, number> {
    return {
      merchants: seedData.merchants.length,
      users: seedData.users.length,
      projects: seedData.projects.length,
      venues: seedData.venues.length,
      floors: seedData.floors.length,
      visitorApplications: seedData.visitorApplications.length,
      accessRecords: seedData.accessRecords.length,
    };
  }
}

// 导出便捷方法
export const seedTestData = DatabaseSeeder.quickSeed;
export const cleanTestData = DatabaseSeeder.quickClean;