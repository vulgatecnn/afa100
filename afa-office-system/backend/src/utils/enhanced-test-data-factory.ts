/**
 * 增强的测试数据工厂
 * 提供更灵活的数据生成、自动清理和一致性检查功能
 */

import { randomUUID } from 'crypto';
import database from './database.js';
import type { User, Merchant, Project, Venue, Floor, VisitorApplication, AccessRecord } from '../types/index.js';

export interface DataGenerationOptions {
  count?: number;
  overrides?: Record<string, any>;
  relationships?: Record<string, any>;
  constraints?: Record<string, any>;
  isolation?: boolean;
  cleanup?: boolean;
}

export interface DataConsistencyCheck {
  tableName: string;
  field: string;
  expectedValue: any;
  actualValue: any;
  isValid: boolean;
}

export interface TestDataSnapshot {
  id: string;
  timestamp: Date;
  tables: Record<string, any[]>;
  relationships: Record<string, any>;
  checksum: string;
}

/**
 * 增强的测试数据工厂类
 */
export class EnhancedTestDataFactory {
  private static instance: EnhancedTestDataFactory;
  private dataSnapshots = new Map<string, TestDataSnapshot>();
  private generatedData = new Map<string, Set<number>>();
  private relationshipMap = new Map<string, Map<string, any>>();
  private cleanupQueue: Array<{ table: string; id: number }> = [];

  private constructor() {
    this.setupCleanupHandlers();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): EnhancedTestDataFactory {
    if (!EnhancedTestDataFactory.instance) {
      EnhancedTestDataFactory.instance = new EnhancedTestDataFactory();
    }
    return EnhancedTestDataFactory.instance;
  }

  /**
   * 创建测试商户数据
   */
  async createMerchants(options: DataGenerationOptions = {}): Promise<Merchant[]> {
    const {
      count = 1,
      overrides = {},
      relationships = {},
      isolation = true,
      cleanup = true
    } = options;

    const merchants: Merchant[] = [];
    const isolationPrefix = isolation ? `test_${randomUUID().slice(0, 8)}_` : '';

    for (let i = 0; i < count; i++) {
      const merchantData: Partial<Merchant> = {
        name: `${isolationPrefix}测试商户${i + 1}`,
        code: `${isolationPrefix}MERCHANT_${i + 1}`,
        contact: `联系人${i + 1}`,
        phone: `1380013800${(i + 1).toString().padStart(2, '0')}`,
        email: `${isolationPrefix}merchant${i + 1}@test.com`,
        address: `测试地址${i + 1}`,
        status: 'active',
        settings: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides
      };

      // 插入数据库
      const result = await database.run(
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

      const merchant: Merchant = { ...merchantData, id: result.lastID } as Merchant;
      merchants.push(merchant);

      // 记录生成的数据
      this.trackGeneratedData('merchants', result.lastID);
      
      // 添加到清理队列
      if (cleanup) {
        this.cleanupQueue.push({ table: 'merchants', id: result.lastID });
      }

      // 建立关系映射
      if (relationships.projects) {
        this.setRelationship('merchant_projects', merchant.id!, relationships.projects);
      }
    }

    console.log(`✅ 创建测试商户数据: ${count} 条`);
    return merchants;
  }

  /**
   * 创建测试用户数据
   */
  async createUsers(options: DataGenerationOptions = {}): Promise<User[]> {
    const {
      count = 1,
      overrides = {},
      relationships = {},
      isolation = true,
      cleanup = true
    } = options;

    const users: User[] = [];
    const isolationPrefix = isolation ? `test_${randomUUID().slice(0, 8)}_` : '';

    for (let i = 0; i < count; i++) {
      const userData: Partial<User> = {
        name: `${isolationPrefix}测试用户${i + 1}`,
        phone: `1380013800${(i + 1).toString().padStart(2, '0')}`,
        user_type: 'employee',
        status: 'active',
        merchant_id: relationships.merchant_id || null,
        open_id: `${isolationPrefix}openid_${i + 1}`,
        union_id: `${isolationPrefix}unionid_${i + 1}`,
        avatar: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides
      };

      // 插入数据库
      const result = await database.run(
        `INSERT INTO users (name, phone, user_type, status, merchant_id, open_id, union_id, avatar, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.name,
          userData.phone,
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

      const user: User = { ...userData, id: result.lastID } as User;
      users.push(user);

      // 记录生成的数据
      this.trackGeneratedData('users', result.lastID);
      
      // 添加到清理队列
      if (cleanup) {
        this.cleanupQueue.push({ table: 'users', id: result.lastID });
      }

      // 建立关系映射
      if (relationships.roles) {
        this.setRelationship('user_roles', user.id!, relationships.roles);
      }
    }

    console.log(`✅ 创建测试用户数据: ${count} 条`);
    return users;
  }

  /**
   * 创建测试项目数据
   */
  async createProjects(options: DataGenerationOptions = {}): Promise<Project[]> {
    const {
      count = 1,
      overrides = {},
      isolation = true,
      cleanup = true
    } = options;

    const projects: Project[] = [];
    const isolationPrefix = isolation ? `test_${randomUUID().slice(0, 8)}_` : '';

    for (let i = 0; i < count; i++) {
      const projectData: Partial<Project> = {
        code: `${isolationPrefix}PROJECT_${i + 1}`,
        name: `${isolationPrefix}测试项目${i + 1}`,
        description: `项目描述${i + 1}`,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides
      };

      // 插入数据库
      const result = await database.run(
        `INSERT INTO projects (code, name, description, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          projectData.code,
          projectData.name,
          projectData.description,
          projectData.status,
          projectData.created_at,
          projectData.updated_at
        ]
      );

      const project: Project = { ...projectData, id: result.lastID } as Project;
      projects.push(project);

      // 记录生成的数据
      this.trackGeneratedData('projects', result.lastID);
      
      // 添加到清理队列
      if (cleanup) {
        this.cleanupQueue.push({ table: 'projects', id: result.lastID });
      }
    }

    console.log(`✅ 创建测试项目数据: ${count} 条`);
    return projects;
  }

  /**
   * 创建测试访客申请数据
   */
  async createVisitorApplications(options: DataGenerationOptions = {}): Promise<VisitorApplication[]> {
    const {
      count = 1,
      overrides = {},
      relationships = {},
      isolation = true,
      cleanup = true
    } = options;

    const applications: VisitorApplication[] = [];
    const isolationPrefix = isolation ? `test_${randomUUID().slice(0, 8)}_` : '';

    for (let i = 0; i < count; i++) {
      const now = new Date();
      const scheduledTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 明天

      const applicationData: Partial<VisitorApplication> = {
        applicant_id: relationships.applicant_id || 1,
        merchant_id: relationships.merchant_id || 1,
        visitee_id: relationships.visitee_id || 2,
        visitor_name: `${isolationPrefix}访客${i + 1}`,
        visitor_phone: `1380013800${(i + 1).toString().padStart(2, '0')}`,
        visitor_company: `${isolationPrefix}访客公司${i + 1}`,
        visit_purpose: `访问目的${i + 1}`,
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
        ...overrides
      };

      // 插入数据库
      const result = await database.run(
        `INSERT INTO visitor_applications (applicant_id, merchant_id, visitee_id, visitor_name, visitor_phone, visitor_company, visit_purpose, visit_type, scheduled_time, duration, status, approved_by, approved_at, passcode, passcode_expiry, usage_limit, usage_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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
          applicationData.approved_by,
          applicationData.approved_at,
          applicationData.passcode,
          applicationData.passcode_expiry,
          applicationData.usage_limit,
          applicationData.usage_count,
          applicationData.created_at,
          applicationData.updated_at
        ]
      );

      const application: VisitorApplication = { ...applicationData, id: result.lastID } as VisitorApplication;
      applications.push(application);

      // 记录生成的数据
      this.trackGeneratedData('visitor_applications', result.lastID);
      
      // 添加到清理队列
      if (cleanup) {
        this.cleanupQueue.push({ table: 'visitor_applications', id: result.lastID });
      }
    }

    console.log(`✅ 创建测试访客申请数据: ${count} 条`);
    return applications;
  }

  /**
   * 创建完整的测试场景
   */
  async createCompleteScenario(options: DataGenerationOptions = {}): Promise<{
    projects: Project[];
    merchants: Merchant[];
    users: User[];
    applications: VisitorApplication[];
  }> {
    const { isolation = true, cleanup = true } = options;

    // 创建项目
    const projects = await this.createProjects({ count: 1, isolation, cleanup });

    // 创建商户
    const merchants = await this.createMerchants({ 
      count: 2, 
      isolation, 
      cleanup,
      relationships: { projects: projects[0].id }
    });

    // 创建用户
    const adminUsers = await this.createUsers({
      count: 1,
      isolation,
      cleanup,
      overrides: { user_type: 'tenant_admin' }
    });

    const employeeUsers = await this.createUsers({
      count: 3,
      isolation,
      cleanup,
      overrides: { user_type: 'merchant_employee' },
      relationships: { merchant_id: merchants[0].id }
    });

    const users = [...adminUsers, ...employeeUsers];

    // 创建访客申请
    const applications = await this.createVisitorApplications({
      count: 5,
      isolation,
      cleanup,
      relationships: {
        merchant_id: merchants[0].id,
        applicant_id: employeeUsers[0].id,
        visitee_id: employeeUsers[1].id
      }
    });

    console.log('✅ 创建完整测试场景完成');

    return {
      projects,
      merchants,
      users,
      applications
    };
  }

  /**
   * 创建数据快照
   */
  async createDataSnapshot(snapshotId?: string): Promise<TestDataSnapshot> {
    const id = snapshotId || randomUUID();
    const timestamp = new Date();
    
    // 获取所有表的数据
    const tables: Record<string, any[]> = {};
    const tableNames = [
      'projects', 'merchants', 'users', 'visitor_applications',
      'access_records', 'passcodes', 'venues', 'floors'
    ];

    for (const tableName of tableNames) {
      try {
        const data = await database.all(`SELECT * FROM ${tableName}`);
        tables[tableName] = data;
      } catch (error) {
        // 表可能不存在，忽略错误
        tables[tableName] = [];
      }
    }

    // 获取关系映射
    const relationships = Object.fromEntries(this.relationshipMap);

    // 计算校验和
    const checksum = this.calculateChecksum(tables, relationships);

    const snapshot: TestDataSnapshot = {
      id,
      timestamp,
      tables,
      relationships,
      checksum
    };

    this.dataSnapshots.set(id, snapshot);
    console.log(`📸 创建数据快照: ${id}`);

    return snapshot;
  }

  /**
   * 恢复数据快照
   */
  async restoreDataSnapshot(snapshotId: string): Promise<void> {
    const snapshot = this.dataSnapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`数据快照不存在: ${snapshotId}`);
    }

    // 清理当前数据
    await this.cleanupAllData();

    // 恢复数据
    for (const [tableName, data] of Object.entries(snapshot.tables)) {
      if (data.length > 0) {
        await this.restoreTableData(tableName, data);
      }
    }

    // 恢复关系映射
    this.relationshipMap.clear();
    for (const [key, value] of Object.entries(snapshot.relationships)) {
      this.relationshipMap.set(key, new Map(Object.entries(value)));
    }

    console.log(`🔄 恢复数据快照: ${snapshotId}`);
  }

  /**
   * 执行数据一致性检查
   */
  async performConsistencyCheck(): Promise<DataConsistencyCheck[]> {
    const checks: DataConsistencyCheck[] = [];

    // 检查外键约束
    const foreignKeyChecks = [
      { table: 'users', field: 'merchant_id', refTable: 'merchants', refField: 'id' },
      { table: 'visitor_applications', field: 'merchant_id', refTable: 'merchants', refField: 'id' },
      { table: 'visitor_applications', field: 'applicant_id', refTable: 'users', refField: 'id' },
      { table: 'venues', field: 'project_id', refTable: 'projects', refField: 'id' },
      { table: 'floors', field: 'venue_id', refTable: 'venues', refField: 'id' }
    ];

    for (const check of foreignKeyChecks) {
      const inconsistencies = await this.checkForeignKeyConsistency(
        check.table,
        check.field,
        check.refTable,
        check.refField
      );
      checks.push(...inconsistencies);
    }

    // 检查唯一约束
    const uniqueChecks = [
      { table: 'merchants', field: 'code' },
      { table: 'projects', field: 'code' },
      { table: 'users', field: 'phone' }
    ];

    for (const check of uniqueChecks) {
      const inconsistencies = await this.checkUniqueConstraint(check.table, check.field);
      checks.push(...inconsistencies);
    }

    console.log(`🔍 数据一致性检查完成: ${checks.length} 个问题`);
    return checks;
  }

  /**
   * 自动清理测试数据
   */
  async cleanupTestData(): Promise<void> {
    // 按依赖关系倒序清理
    const cleanupOrder = [
      'access_records',
      'passcodes',
      'visitor_applications',
      'user_roles',
      'users',
      'floors',
      'venues',
      'merchants',
      'projects'
    ];

    // 禁用外键约束
    await database.run('PRAGMA foreign_keys = OFF');

    try {
      for (const item of this.cleanupQueue.reverse()) {
        try {
          await database.run(`DELETE FROM ${item.table} WHERE id = ?`, [item.id]);
        } catch (error) {
          console.warn(`清理数据失败: ${item.table}#${item.id}`, error);
        }
      }

      // 清理队列
      this.cleanupQueue.length = 0;

      // 清理生成数据记录
      this.generatedData.clear();

      console.log('🧹 自动清理测试数据完成');
    } finally {
      // 重新启用外键约束
      await database.run('PRAGMA foreign_keys = ON');
    }
  }

  /**
   * 清理所有数据
   */
  async cleanupAllData(): Promise<void> {
    const tables = [
      'access_records',
      'passcodes',
      'visitor_applications',
      'user_roles',
      'users',
      'floors',
      'venues',
      'merchants',
      'projects'
    ];

    // 禁用外键约束
    await database.run('PRAGMA foreign_keys = OFF');

    try {
      for (const table of tables) {
        try {
          await database.run(`DELETE FROM ${table}`);
          await database.run(`DELETE FROM sqlite_sequence WHERE name = ?`, [table]);
        } catch (error) {
          // 忽略表不存在的错误
          if (!(error as Error).message.includes('no such table')) {
            console.warn(`清理表失败: ${table}`, error);
          }
        }
      }

      // 清理所有记录
      this.cleanupQueue.length = 0;
      this.generatedData.clear();
      this.relationshipMap.clear();

      console.log('🧹 清理所有数据完成');
    } finally {
      // 重新启用外键约束
      await database.run('PRAGMA foreign_keys = ON');
    }
  }

  /**
   * 记录生成的数据
   */
  private trackGeneratedData(table: string, id: number): void {
    if (!this.generatedData.has(table)) {
      this.generatedData.set(table, new Set());
    }
    this.generatedData.get(table)!.add(id);
  }

  /**
   * 设置关系映射
   */
  private setRelationship(relationshipType: string, fromId: number, toId: any): void {
    if (!this.relationshipMap.has(relationshipType)) {
      this.relationshipMap.set(relationshipType, new Map());
    }
    this.relationshipMap.get(relationshipType)!.set(fromId.toString(), toId);
  }

  /**
   * 计算校验和
   */
  private calculateChecksum(tables: Record<string, any[]>, relationships: Record<string, any>): string {
    const data = JSON.stringify({ tables, relationships });
    // 简单的校验和计算
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(16);
  }

  /**
   * 检查外键一致性
   */
  private async checkForeignKeyConsistency(
    table: string,
    field: string,
    refTable: string,
    refField: string
  ): Promise<DataConsistencyCheck[]> {
    const checks: DataConsistencyCheck[] = [];

    try {
      const query = `
        SELECT t.${field} as value, COUNT(*) as count
        FROM ${table} t
        LEFT JOIN ${refTable} r ON t.${field} = r.${refField}
        WHERE t.${field} IS NOT NULL AND r.${refField} IS NULL
        GROUP BY t.${field}
      `;

      const results = await database.all(query);

      for (const result of results) {
        checks.push({
          tableName: table,
          field,
          expectedValue: `存在于${refTable}.${refField}`,
          actualValue: result.value,
          isValid: false
        });
      }
    } catch (error) {
      console.warn(`外键一致性检查失败: ${table}.${field}`, error);
    }

    return checks;
  }

  /**
   * 检查唯一约束
   */
  private async checkUniqueConstraint(table: string, field: string): Promise<DataConsistencyCheck[]> {
    const checks: DataConsistencyCheck[] = [];

    try {
      const query = `
        SELECT ${field} as value, COUNT(*) as count
        FROM ${table}
        WHERE ${field} IS NOT NULL
        GROUP BY ${field}
        HAVING COUNT(*) > 1
      `;

      const results = await database.all(query);

      for (const result of results) {
        checks.push({
          tableName: table,
          field,
          expectedValue: '唯一值',
          actualValue: `重复${result.count}次: ${result.value}`,
          isValid: false
        });
      }
    } catch (error) {
      console.warn(`唯一约束检查失败: ${table}.${field}`, error);
    }

    return checks;
  }

  /**
   * 恢复表数据
   */
  private async restoreTableData(tableName: string, data: any[]): Promise<void> {
    if (data.length === 0) return;

    // 获取表结构
    const columns = Object.keys(data[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const columnNames = columns.join(', ');

    const insertSql = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;

    for (const row of data) {
      const values = columns.map(col => row[col]);
      try {
        await database.run(insertSql, values);
      } catch (error) {
        console.warn(`恢复数据失败: ${tableName}`, error);
      }
    }
  }

  /**
   * 设置清理处理器
   */
  private setupCleanupHandlers(): void {
    // 进程退出时清理
    process.on('exit', () => {
      // 同步清理无法使用异步操作
      console.log('进程退出，清理测试数据...');
    });

    // 异常退出时清理
    process.on('SIGINT', async () => {
      await this.cleanupTestData();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.cleanupTestData();
      process.exit(0);
    });
  }
}

// 导出单例实例
export const enhancedTestDataFactory = EnhancedTestDataFactory.getInstance();

export default enhancedTestDataFactory;