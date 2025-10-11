/**
 * 数据库测试辅助工具 - MySQL适配版本
 */

import { MySQLAdapter } from '../../src/adapters/mysql-adapter'
import { DatabaseConfigManager, DatabaseType } from '../../src/config/database-config-manager'
import { BackendTestFactory } from '../../../shared/test-factories/backend-adapter'

/**
 * 数据库测试辅助类 - MySQL版本
 */
export class DatabaseTestHelper {
  /**
   * 获取MySQL适配器实例
   */
  private static async getMySQLAdapter(): Promise<MySQLAdapter> {
    const configManager = new DatabaseConfigManager()
    const config = configManager.getConfig(DatabaseType.MYSQL, 'test')
    
    const adapter = new MySQLAdapter()
    if (!adapter.isReady()) {
      await adapter.connect(config)
    }
    
    return adapter
  }

  /**
   * 批量插入用户数据 - MySQL版本
   */
  static async seedUsers(count = 5, overrides = {}) {
    const adapter = await this.getMySQLAdapter()
    const users = BackendTestFactory.createUsers(count, overrides)
    const insertedUsers = []
    
    for (const userData of users) {
      const result = await adapter.run(
        `INSERT INTO users (name, email, phone, password, user_type, status, merchant_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.name,
          userData.email,
          userData.phone,
          userData.password,
          userData.user_type,
          userData.status,
          userData.merchant_id,
          userData.created_at,
          userData.updated_at
        ]
      )
      
      insertedUsers.push({ ...userData, id: result.insertId })
    }
    
    return insertedUsers
  }
  
  /**
   * 批量插入商户数据 - MySQL版本
   */
  static async seedMerchants(count = 3, overrides = {}) {
    const adapter = await this.getMySQLAdapter()
    const merchants = BackendTestFactory.createMerchants(count, overrides)
    const insertedMerchants = []
    
    for (const merchantData of merchants) {
      const result = await adapter.run(
        `INSERT INTO merchants (name, code, contact_person, phone, email, status, space_ids, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          merchantData.name,
          merchantData.code,
          merchantData.contact_person,
          merchantData.phone,
          merchantData.email,
          merchantData.status,
          merchantData.space_ids,
          merchantData.created_at,
          merchantData.updated_at
        ]
      )
      
      insertedMerchants.push({ ...merchantData, id: result.insertId })
    }
    
    return insertedMerchants
  }
  
  /**
   * 批量插入访客申请数据 - MySQL版本
   */
  static async seedVisitorApplications(count = 10, overrides = {}) {
    const adapter = await this.getMySQLAdapter()
    const applications = BackendTestFactory.createVisitorApplications(count, overrides)
    const insertedApplications = []
    
    for (const appData of applications) {
      const result = await adapter.run(
        `INSERT INTO visitor_applications (visitor_name, phone, company, purpose, visit_date, duration, status, merchant_id, applicant_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          appData.visitor_name,
          appData.phone,
          appData.company,
          appData.purpose,
          appData.visit_date,
          appData.duration,
          appData.status,
          appData.merchant_id,
          appData.applicant_id,
          appData.created_at,
          appData.updated_at
        ]
      )
      
      insertedApplications.push({ ...appData, id: result.insertId })
    }
    
    return insertedApplications
  }
  
  /**
   * 批量插入空间数据 - MySQL版本
   */
  static async seedSpaces(count = 5, overrides = {}) {
    const adapter = await this.getMySQLAdapter()
    const spaces = BackendTestFactory.createSpaces(count, overrides)
    const insertedSpaces = []
    
    // 首先创建项目
    const projectResult = await adapter.run(
      `INSERT INTO projects (name, code, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['测试项目', 'TEST_PROJECT', '测试用项目', 'active', new Date().toISOString(), new Date().toISOString()]
    )
    
    const projectId = projectResult.insertId
    
    for (const spaceData of spaces) {
      let tableName = 'venues'
      let insertSql = `INSERT INTO venues (name, code, project_id, status, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
      let values = [spaceData.name, spaceData.code, projectId, spaceData.status, spaceData.description, spaceData.created_at, spaceData.updated_at]
      
      if (spaceData.type === 'floor') {
        tableName = 'floors'
        insertSql = `INSERT INTO floors (name, code, venue_id, status, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
        values = [spaceData.name, spaceData.code, spaceData.parent_id || 1, spaceData.status, spaceData.description, spaceData.created_at, spaceData.updated_at]
      }
      
      const result = await adapter.run(insertSql, values)
      insertedSpaces.push({ ...spaceData, id: result.insertId, tableName })
    }
    
    return insertedSpaces
  }
  
  /**
   * 批量插入通行码数据 - MySQL版本
   */
  static async seedPasscodes(count = 8, overrides = {}) {
    const adapter = await this.getMySQLAdapter()
    const passcodes = BackendTestFactory.createPasscodes(count, overrides)
    const insertedPasscodes = []
    
    for (const passcodeData of passcodes) {
      const result = await adapter.run(
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
      )
      
      insertedPasscodes.push({ ...passcodeData, id: result.insertId })
    }
    
    return insertedPasscodes
  }
  
  /**
   * 批量插入通行记录数据 - MySQL版本
   */
  static async seedAccessRecords(count = 20, overrides = {}) {
    const adapter = await this.getMySQLAdapter()
    const records = BackendTestFactory.createAccessRecords(count, overrides)
    const insertedRecords = []
    
    for (const recordData of records) {
      const result = await adapter.run(
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
      )
      
      insertedRecords.push({ ...recordData, id: result.insertId })
    }
    
    return insertedRecords
  }
  
  /**
   * 创建完整的测试场景数据
   */
  static async seedCompleteScenario() {
    // 创建商户
    const merchants = await this.seedMerchants(2, { status: 'active' })
    
    // 创建用户
    const admin = await this.seedUsers(1, {
      user_type: 'tenant_admin',
      status: 'active'
    })
    
    const employees = await this.seedUsers(3, {
      user_type: 'merchant_employee',
      merchant_id: merchants[0].id,
      status: 'active'
    })
    
    // 创建空间
    const spaces = await this.seedSpaces(3, { status: 'active' })
    
    // 创建访客申请
    const applications = await this.seedVisitorApplications(5, {
      merchant_id: merchants[0].id,
      applicant_id: employees[0].id
    })
    
    // 创建通行码
    const passcodes = await this.seedPasscodes(5, {
      user_id: employees[0].id,
      status: 'active'
    })
    
    // 创建通行记录
    const accessRecords = await this.seedAccessRecords(10, {
      user_id: employees[0].id,
      passcode_id: passcodes[0].id
    })
    
    return {
      merchants,
      admin: admin[0],
      employees,
      spaces,
      applications,
      passcodes,
      accessRecords
    }
  }
  
  /**
   * 验证MySQL数据库连接
   */
  static async verifyConnection() {
    try {
      const adapter = await this.getMySQLAdapter()
      const result = await adapter.get('SELECT 1 as test')
      return result?.test === 1
    } catch (error) {
      console.error('MySQL数据库连接验证失败:', error)
      return false
    }
  }
  
  /**
   * 获取表记录数量 - MySQL版本
   */
  static async getTableCount(tableName: string) {
    try {
      const adapter = await this.getMySQLAdapter()
      const result = await adapter.get(`SELECT COUNT(*) as count FROM ${tableName}`)
      return result?.count || 0
    } catch (error) {
      console.warn(`获取表 ${tableName} 记录数量失败:`, error)
      return 0
    }
  }
  
  /**
   * 检查表是否存在 - MySQL版本
   */
  static async tableExists(tableName: string) {
    try {
      const adapter = await this.getMySQLAdapter()
      const result = await adapter.get(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [tableName]
      )
      return !!result
    } catch (error) {
      return false
    }
  }
  
  /**
   * 执行原始SQL查询 - MySQL版本
   */
  static async executeQuery(sql: string, params: any[] = []) {
    try {
      const adapter = await this.getMySQLAdapter()
      return await adapter.all(sql, params)
    } catch (error) {
      console.error('MySQL SQL查询执行失败:', error)
      throw error
    }
  }
  
  /**
   * 清理所有测试数据 - MySQL版本
   */
  static async cleanup() {
    const adapter = await this.getMySQLAdapter()
    
    // MySQL表清理顺序（考虑外键约束）
    const tables = [
      'access_records',
      'passcodes',
      'visitor_applications',
      'user_roles',
      'merchant_permissions',
      'permissions',
      'users',
      'roles',
      'floors',
      'venues',
      'merchants',
      'projects'
    ]
    
    // 禁用外键检查
    await adapter.run('SET FOREIGN_KEY_CHECKS = 0')
    
    for (const table of tables) {
      try {
        await adapter.run(`DELETE FROM ${table}`)
        // MySQL使用AUTO_INCREMENT重置
        await adapter.run(`ALTER TABLE ${table} AUTO_INCREMENT = 1`)
      } catch (error) {
        // 忽略表不存在的错误
        if (!(error as Error).message.includes("doesn't exist")) {
          console.warn(`清理表 ${table} 时出错:`, error)
        }
      }
    }
    
    // 重新启用外键检查
    await adapter.run('SET FOREIGN_KEY_CHECKS = 1')
  }
  
  /**
   * 重置数据库到初始状态
   */
  static async reset() {
    await this.cleanup()
    
    // 可以在这里添加初始化数据的逻辑
    console.log('数据库已重置到初始状态')
  }
}

export default DatabaseTestHelper