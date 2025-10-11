/**
 * 后端API测试辅助工具 - MySQL适配版本
 */

import request from 'supertest'
import { app } from '../../src/app'
import { BackendTestFactory } from '../../../shared/test-factories/backend-adapter'
import { MySQLAdapter } from '../../src/adapters/mysql-adapter'
import { DatabaseConfigManager, DatabaseType } from '../../src/config/database-config-manager'

export interface AuthenticatedRequest {
  user: any
  token: string
  request: (method: string, url: string) => request.Test
}

/**
 * API测试辅助类
 */
export class ApiTestHelper {
  /**
   * 创建认证用户并返回请求工具 - MySQL版本
   */
  static async createAuthenticatedRequest(userOverrides = {}): Promise<AuthenticatedRequest> {
    // 获取MySQL适配器实例
    const adapter = await this.getMySQLAdapter()
    
    // 创建测试用户数据
    const userData = BackendTestFactory.createUser({
      user_type: 'tenant_admin',
      status: 'active',
      ...userOverrides
    })
    
    // 插入用户到MySQL数据库
    const insertResult = await adapter.run(
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
    
    const userId = insertResult.insertId
    
    // 模拟登录获取token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userData.email,
        password: 'password123' // 使用固定密码进行测试
      })
    
    const token = loginResponse.body.data?.accessToken || 'mock-token'
    
    return {
      user: { ...userData, id: userId },
      token,
      request: (method: string, url: string) => 
        request(app)[method.toLowerCase() as keyof typeof request](url)
          .set('Authorization', `Bearer ${token}`)
    }
  }

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
   * 验证成功响应格式
   */
  static expectSuccessResponse(response: any, expectedData?: any) {
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.message).toBeDefined()
    expect(response.body.timestamp).toBeDefined()
    
    if (expectedData) {
      expect(response.body.data).toMatchObject(expectedData)
    }
  }
  
  /**
   * 验证错误响应格式
   */
  static expectErrorResponse(response: any, expectedStatus: number, expectedMessage?: string) {
    expect(response.status).toBe(expectedStatus)
    expect(response.body.success).toBe(false)
    
    if (expectedMessage) {
      expect(response.body.message).toContain(expectedMessage)
    }
  }
  
  /**
   * 验证分页响应格式
   */
  static expectPaginatedResponse(response: any, expectedItemCount?: number) {
    this.expectSuccessResponse(response)
    expect(response.body.data.items).toBeInstanceOf(Array)
    expect(response.body.data.pagination).toBeDefined()
    expect(response.body.data.pagination.current).toBeGreaterThan(0)
    expect(response.body.data.pagination.pageSize).toBeGreaterThan(0)
    expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(0)
    
    if (expectedItemCount !== undefined) {
      expect(response.body.data.items).toHaveLength(expectedItemCount)
    }
  }
  
  /**
   * 验证创建响应格式
   */
  static expectCreateResponse(response: any, expectedData?: any) {
    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.id).toBeDefined()
    
    if (expectedData) {
      expect(response.body.data).toMatchObject(expectedData)
    }
  }
  
  /**
   * 验证更新响应格式
   */
  static expectUpdateResponse(response: any, expectedData?: any) {
    this.expectSuccessResponse(response, expectedData)
  }
  
  /**
   * 验证删除响应格式
   */
  static expectDeleteResponse(response: any) {
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
  }
  
  /**
   * 验证验证错误响应
   */
  static expectValidationError(response: any, expectedFields?: string[]) {
    expect(response.status).toBe(422)
    expect(response.body.success).toBe(false)
    expect(response.body.data?.errors).toBeDefined()
    
    if (expectedFields) {
      expectedFields.forEach(field => {
        expect(response.body.data.errors[field]).toBeDefined()
      })
    }
  }
  
  /**
   * 验证权限错误响应
   */
  static expectPermissionError(response: any) {
    this.expectErrorResponse(response, 403, '权限不足')
  }
  
  /**
   * 验证未找到错误响应
   */
  static expectNotFoundError(response: any) {
    this.expectErrorResponse(response, 404)
  }
  
  /**
   * 创建测试商户 - MySQL版本
   */
  static async createTestMerchant(overrides = {}) {
    const adapter = await this.getMySQLAdapter()
    const merchantData = BackendTestFactory.createMerchant(overrides)
    
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
    
    return { ...merchantData, id: result.insertId }
  }
  
  /**
   * 创建测试访客申请 - MySQL版本
   */
  static async createTestVisitorApplication(overrides = {}) {
    const adapter = await this.getMySQLAdapter()
    const applicationData = BackendTestFactory.createVisitorApplication(overrides)
    
    const result = await adapter.run(
      `INSERT INTO visitor_applications (visitor_name, phone, company, purpose, visit_date, duration, status, merchant_id, applicant_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        applicationData.visitor_name,
        applicationData.phone,
        applicationData.company,
        applicationData.purpose,
        applicationData.visit_date,
        applicationData.duration,
        applicationData.status,
        applicationData.merchant_id,
        applicationData.applicant_id,
        applicationData.created_at,
        applicationData.updated_at
      ]
    )
    
    return { ...applicationData, id: result.insertId }
  }
  
  /**
   * 清理测试数据 - MySQL版本
   */
  static async cleanupTestData() {
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
   * 等待异步操作完成
   */
  static async waitFor(condition: () => boolean | Promise<boolean>, timeout = 5000) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      const result = await condition()
      if (result) {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    throw new Error(`等待条件超时 (${timeout}ms)`)
  }
  
  /**
   * 模拟延迟
   */
  static async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export default ApiTestHelper