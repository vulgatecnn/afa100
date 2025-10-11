/**
 * 商户管理API集成测试 - 完整CRUD操作集成测试
 * 测试商户管理API的完整功能，包括创建、查询、更新、删除等
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import { app } from '../../src/app.js'
import { Database } from '../../src/utils/database.js'
import { merchantFactory, userFactory } from '../../../shared/test-factories/index.js'
import { TestErrorHandler, createTestContext } from '../../../shared/test-helpers/error-handler.js'

describe('商户管理API集成测试', () => {
  let db: Database
  let tenantAdminToken: string
  let merchantAdminToken: string
  let employeeToken: string
  let testMerchantId: number
  let testUsers: any[] = []

  const testContext = createTestContext(
    '商户管理API集成测试',
    'api-merchant-integration.test.ts',
    'backend',
    'integration'
  )

  beforeAll(async () => {
    try {
      // 初始化测试数据库
      db = Database.getInstance()
      await db.init()

      // 创建测试用户
      const tenantAdmin = userFactory.create({
        userType: 'tenant_admin',
        phone: '13800138000',
        name: '租务管理员',
        status: 'active',
        merchantId: undefined
      })

      const merchantAdmin = userFactory.create({
        userType: 'merchant_admin',
        phone: '13800138001',
        name: '商户管理员',
        status: 'active',
        merchantId: 1
      })

      const employee = userFactory.create({
        userType: 'employee',
        phone: '13800138002',
        name: '员工用户',
        status: 'active',
        merchantId: 1
      })

      testUsers = [tenantAdmin, merchantAdmin, employee]

      // 插入测试用户
      for (const user of testUsers) {
        await db.run(`
          INSERT INTO users (
            open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user.openId,
          user.phone,
          user.name,
          user.userType,
          user.status,
          user.merchantId,
          user.createdAt,
          user.updatedAt
        ])
      }

      // 创建测试商户
      const testMerchant = merchantFactory.create({
        id: 1,
        name: '测试商户',
        code: 'TEST001',
        status: 'active'
      })

      await db.run(`
        INSERT INTO merchants (
          id, name, code, contact, phone, email, address, status, settings, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testMerchant.id,
        testMerchant.name,
        testMerchant.code,
        testMerchant.contact,
        testMerchant.phone,
        testMerchant.email,
        testMerchant.address,
        testMerchant.status,
        JSON.stringify(testMerchant.settings),
        testMerchant.createdAt,
        testMerchant.updatedAt
      ])

      // 获取认证token
      const tenantLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138000',
          password: 'password123',
          userType: 'tenant_admin'
        })
      tenantAdminToken = tenantLoginResponse.body.data.accessToken

      const merchantLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138001',
          password: 'password123',
          userType: 'merchant_admin'
        })
      merchantAdminToken = merchantLoginResponse.body.data.accessToken

      const employeeLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138002',
          password: 'password123',
          userType: 'employee'
        })
      employeeToken = employeeLoginResponse.body.data.accessToken

    } catch (error) {
      TestErrorHandler.handle(error as Error, testContext)
      throw error
    }
  })

  afterAll(async () => {
    try {
      // 清理测试数据
      await db.run('DELETE FROM merchants WHERE code LIKE "TEST%"')
      await db.run('DELETE FROM users WHERE phone LIKE "1380013800%"')
      await db.close()
    } catch (error) {
      TestErrorHandler.handle(error as Error, testContext)
    }
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    // 清理之前测试创建的商户数据
    await db.run('DELETE FROM merchants WHERE code LIKE "TEST_NEW%"')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/v1/merchant - 创建商户', () => {
    it('租务管理员应该能成功创建商户', async () => {
      const merchantData = {
        name: '新测试商户',
        code: 'TEST_NEW_001',
        contact: '张三',
        phone: '13800138010',
        email: 'test@example.com',
        address: '测试地址123号'
      }

      const response = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .send(merchantData)

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.merchant).toMatchObject({
        name: merchantData.name,
        code: merchantData.code,
        contact: merchantData.contact,
        phone: merchantData.phone,
        email: merchantData.email,
        address: merchantData.address,
        status: 'active'
      })

      testMerchantId = response.body.data.merchant.id

      // 验证数据库中的数据
      const dbMerchant = await db.get('SELECT * FROM merchants WHERE id = ?', [testMerchantId])
      expect(dbMerchant).toBeTruthy()
      expect(dbMerchant.name).toBe(merchantData.name)
    })

    it('应该拒绝重复的商户编码', async () => {
      const merchantData = {
        name: '重复编码商户',
        code: 'TEST001', // 与已存在的商户编码重复
        contact: '李四'
      }

      const response = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .send(merchantData)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('商户编码已存在')
    })

    it('应该验证必填字段', async () => {
      const response = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .send({
          name: '缺少编码的商户'
          // 缺少必填的 code 字段
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('验证失败')
    })

    it('应该验证字段格式', async () => {
      const response = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .send({
          name: 'A', // 名称太短
          code: 'TEST_INVALID',
          phone: '123', // 手机号格式错误
          email: 'invalid-email' // 邮箱格式错误
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('商户管理员不应该能创建商户', async () => {
      const merchantData = {
        name: '未授权创建商户',
        code: 'TEST_UNAUTHORIZED',
        contact: '王五'
      }

      const response = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send(merchantData)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('权限不足')
    })

    it('员工不应该能创建商户', async () => {
      const merchantData = {
        name: '员工创建商户',
        code: 'TEST_EMPLOYEE',
        contact: '赵六'
      }

      const response = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(merchantData)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })
  })

  describe('GET /api/v1/merchant - 获取商户列表', () => {
    beforeEach(async () => {
      // 创建多个测试商户
      const merchants = merchantFactory.createMany(5, { status: 'active' })
      for (let i = 0; i < merchants.length; i++) {
        const merchant = merchants[i]
        await db.run(`
          INSERT INTO merchants (name, code, contact, phone, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          `测试商户${i + 2}`,
          `TEST_LIST_${i + 2}`,
          merchant.contact,
          merchant.phone,
          merchant.status,
          merchant.createdAt,
          merchant.updatedAt
        ])
      }
    })

    afterEach(async () => {
      await db.run('DELETE FROM merchants WHERE code LIKE "TEST_LIST_%"')
    })

    it('租务管理员应该能获取所有商户列表', async () => {
      const response = await request(app)
        .get('/api/v1/merchant')
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.data).toBeInstanceOf(Array)
      expect(response.body.data.data.length).toBeGreaterThan(0)
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number),
        totalPages: expect.any(Number)
      })
    })

    it('应该支持分页查询', async () => {
      const response = await request(app)
        .get('/api/v1/merchant?page=1&limit=3')
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.data.length).toBeLessThanOrEqual(3)
      expect(response.body.data.pagination.limit).toBe(3)
      expect(response.body.data.pagination.page).toBe(1)
    })

    it('应该支持状态筛选', async () => {
      // 创建一个inactive状态的商户
      await db.run(`
        INSERT INTO merchants (name, code, status, created_at, updated_at)
        VALUES ('停用商户', 'TEST_INACTIVE', 'inactive', datetime('now'), datetime('now'))
      `)

      const response = await request(app)
        .get('/api/v1/merchant?status=active')
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(response.status).toBe(200)
      response.body.data.data.forEach((merchant: any) => {
        expect(merchant.status).toBe('active')
      })

      // 清理测试数据
      await db.run('DELETE FROM merchants WHERE code = "TEST_INACTIVE"')
    })

    it('应该支持搜索功能', async () => {
      const response = await request(app)
        .get('/api/v1/merchant?search=测试商户2')
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.data.length).toBeGreaterThan(0)
      expect(response.body.data.data[0].name).toContain('测试商户2')
    })

    it('商户管理员只能看到自己的商户信息', async () => {
      const response = await request(app)
        .get('/api/v1/merchant')
        .set('Authorization', `Bearer ${merchantAdminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.data).toBeInstanceOf(Array)
      // 商户管理员只能看到自己的商户
      response.body.data.data.forEach((merchant: any) => {
        expect(merchant.id).toBe(1) // 测试商户的ID
      })
    })
  })

  describe('GET /api/v1/merchant/:id - 获取商户详情', () => {
    it('应该返回指定商户的详细信息', async () => {
      const response = await request(app)
        .get('/api/v1/merchant/1')
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.merchant).toMatchObject({
        id: 1,
        name: '测试商户',
        code: 'TEST001',
        status: 'active'
      })
    })

    it('应该处理不存在的商户ID', async () => {
      const response = await request(app)
        .get('/api/v1/merchant/99999')
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('商户不存在')
    })

    it('商户管理员只能查看自己的商户详情', async () => {
      // 创建另一个商户
      await db.run(`
        INSERT INTO merchants (id, name, code, status, created_at, updated_at)
        VALUES (999, '其他商户', 'OTHER001', 'active', datetime('now'), datetime('now'))
      `)

      const response = await request(app)
        .get('/api/v1/merchant/999')
        .set('Authorization', `Bearer ${merchantAdminToken}`)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)

      // 清理测试数据
      await db.run('DELETE FROM merchants WHERE id = 999')
    })

    it('员工不应该能查看商户详情', async () => {
      const response = await request(app)
        .get('/api/v1/merchant/1')
        .set('Authorization', `Bearer ${employeeToken}`)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })
  })

  describe('PUT /api/v1/merchant/:id - 更新商户信息', () => {
    it('租务管理员应该能更新商户信息', async () => {
      const updateData = {
        name: '更新后的商户名',
        contact: '李四',
        phone: '13800138020',
        email: 'updated@example.com',
        address: '更新后的地址'
      }

      const response = await request(app)
        .put('/api/v1/merchant/1')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .send(updateData)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.merchant).toMatchObject({
        id: 1,
        name: updateData.name,
        contact: updateData.contact,
        phone: updateData.phone,
        email: updateData.email,
        address: updateData.address
      })

      // 验证数据库中的数据已更新
      const dbMerchant = await db.get('SELECT * FROM merchants WHERE id = 1')
      expect(dbMerchant.name).toBe(updateData.name)
      expect(dbMerchant.contact).toBe(updateData.contact)
    })

    it('应该支持部分字段更新', async () => {
      const response = await request(app)
        .put('/api/v1/merchant/1')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .send({
          name: '仅更新名称'
        })

      expect(response.status).toBe(200)
      expect(response.body.data.merchant.name).toBe('仅更新名称')
      expect(response.body.data.merchant.code).toBe('TEST001') // 其他字段保持不变
    })

    it('商户管理员应该能更新自己的商户信息', async () => {
      const updateData = {
        name: '商户管理员更新',
        contact: '王五'
      }

      const response = await request(app)
        .put('/api/v1/merchant/1')
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send(updateData)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.merchant.name).toBe(updateData.name)
    })

    it('应该处理不存在的商户ID', async () => {
      const response = await request(app)
        .put('/api/v1/merchant/99999')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .send({
          name: '更新不存在的商户'
        })

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
    })

    it('员工不应该能更新商户信息', async () => {
      const response = await request(app)
        .put('/api/v1/merchant/1')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          name: '员工尝试更新'
        })

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/v1/merchant/:id/disable - 停用商户', () => {
    beforeEach(async () => {
      // 创建测试商户和员工
      await db.run(`
        INSERT INTO merchants (id, name, code, status, created_at, updated_at)
        VALUES (100, '待停用商户', 'TEST_DISABLE', 'active', datetime('now'), datetime('now'))
      `)

      await db.run(`
        INSERT INTO users (name, phone, user_type, status, merchant_id, created_at, updated_at)
        VALUES ('测试员工', '13800138100', 'employee', 'active', 100, datetime('now'), datetime('now'))
      `)
    })

    afterEach(async () => {
      await db.run('DELETE FROM users WHERE merchant_id = 100')
      await db.run('DELETE FROM merchants WHERE id = 100')
    })

    it('租务管理员应该能停用商户并自动停用员工', async () => {
      const response = await request(app)
        .post('/api/v1/merchant/100/disable')
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.merchant.status).toBe('inactive')

      // 验证员工也被停用
      const employee = await db.get(
        'SELECT status FROM users WHERE merchant_id = 100 AND user_type = "employee"'
      )
      expect(employee?.status).toBe('inactive')
    })

    it('商户管理员不应该能停用自己的商户', async () => {
      const response = await request(app)
        .post('/api/v1/merchant/1/disable')
        .set('Authorization', `Bearer ${merchantAdminToken}`)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/v1/merchant/:id/enable - 启用商户', () => {
    beforeEach(async () => {
      await db.run(`
        INSERT INTO merchants (id, name, code, status, created_at, updated_at)
        VALUES (101, '待启用商户', 'TEST_ENABLE', 'inactive', datetime('now'), datetime('now'))
      `)
    })

    afterEach(async () => {
      await db.run('DELETE FROM merchants WHERE id = 101')
    })

    it('租务管理员应该能启用商户', async () => {
      const response = await request(app)
        .post('/api/v1/merchant/101/enable')
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.merchant.status).toBe('active')
    })
  })

  describe('DELETE /api/v1/merchant/:id - 删除商户', () => {
    it('应该成功删除没有员工的商户', async () => {
      // 创建没有员工的商户
      const result = await db.run(`
        INSERT INTO merchants (name, code, status, created_at, updated_at)
        VALUES ('待删除商户', 'TEST_DELETE', 'active', datetime('now'), datetime('now'))
      `)
      const merchantId = result.lastID!

      const response = await request(app)
        .delete(`/api/v1/merchant/${merchantId}`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)

      // 验证商户已被删除
      const merchant = await db.get('SELECT * FROM merchants WHERE id = ?', [merchantId])
      expect(merchant).toBeUndefined()
    })

    it('应该拒绝删除有员工的商户', async () => {
      const response = await request(app)
        .delete('/api/v1/merchant/1')
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('商户下存在员工')
    })

    it('商户管理员不应该能删除商户', async () => {
      const response = await request(app)
        .delete('/api/v1/merchant/1')
        .set('Authorization', `Bearer ${merchantAdminToken}`)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })
  })

  describe('GET /api/v1/merchant/:id/stats - 获取商户统计信息', () => {
    beforeEach(async () => {
      // 创建测试数据
      await db.run(`
        INSERT INTO users (name, phone, user_type, status, merchant_id, created_at, updated_at)
        VALUES 
        ('统计员工1', '13800138201', 'employee', 'active', 1, datetime('now'), datetime('now')),
        ('统计员工2', '13800138202', 'employee', 'inactive', 1, datetime('now'), datetime('now'))
      `)

      await db.run(`
        INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitor_name, visitor_phone, visit_purpose, 
          scheduled_time, status, created_at, updated_at
        ) VALUES 
        (1, 1, '访客1', '13800138301', '商务洽谈', datetime('now', '+1 day'), 'pending', datetime('now'), datetime('now')),
        (1, 1, '访客2', '13800138302', '技术交流', datetime('now', '+2 day'), 'approved', datetime('now'), datetime('now'))
      `)
    })

    afterEach(async () => {
      await db.run('DELETE FROM users WHERE phone LIKE "138001382%"')
      await db.run('DELETE FROM visitor_applications WHERE visitor_phone LIKE "138001383%"')
    })

    it('应该返回商户统计信息', async () => {
      const response = await request(app)
        .get('/api/v1/merchant/1/stats')
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.stats).toMatchObject({
        employees: {
          total: expect.any(Number),
          active: expect.any(Number),
          inactive: expect.any(Number)
        },
        visitors: {
          total: expect.any(Number),
          pending: expect.any(Number),
          approved: expect.any(Number),
          rejected: expect.any(Number)
        },
        access: {
          total: expect.any(Number),
          success: expect.any(Number),
          failed: expect.any(Number)
        }
      })
    })

    it('商户管理员应该能查看自己商户的统计信息', async () => {
      const response = await request(app)
        .get('/api/v1/merchant/1/stats')
        .set('Authorization', `Bearer ${merchantAdminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe('商户权限管理测试', () => {
    beforeEach(async () => {
      // 创建测试权限
      await db.run(`
        INSERT INTO permissions (code, name, description, resource_type, resource_id, actions, created_at)
        VALUES 
        ('project:1:access', '项目1通行权限', '允许通行项目1', 'project', 1, '["read", "access"]', datetime('now')),
        ('venue:1:access', '场地1通行权限', '允许通行场地1', 'venue', 1, '["read", "access"]', datetime('now'))
      `)
    })

    afterEach(async () => {
      await db.run('DELETE FROM merchant_permissions WHERE merchant_id = 1')
      await db.run('DELETE FROM permissions WHERE code LIKE "%:1:access"')
    })

    it('应该成功分配权限给商户', async () => {
      const response = await request(app)
        .post('/api/v1/merchant/1/permissions')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .send({
          permissionIds: [1, 2]
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)

      // 验证权限已分配
      const permissions = await db.all(
        'SELECT * FROM merchant_permissions WHERE merchant_id = 1'
      )
      expect(permissions.length).toBe(2)
    })

    it('应该成功获取商户权限', async () => {
      // 先分配权限
      await db.run(`
        INSERT INTO merchant_permissions (merchant_id, permission_code, granted_at)
        VALUES (1, 'project:1:access', datetime('now'))
      `)

      const response = await request(app)
        .get('/api/v1/merchant/1/permissions')
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.permissions).toBeInstanceOf(Array)
      expect(response.body.data.permissions.length).toBeGreaterThan(0)
    })

    it('应该成功移除商户权限', async () => {
      // 先分配权限
      await db.run(`
        INSERT INTO merchant_permissions (merchant_id, permission_code, granted_at)
        VALUES 
        (1, 'project:1:access', datetime('now')),
        (1, 'venue:1:access', datetime('now'))
      `)

      const response = await request(app)
        .delete('/api/v1/merchant/1/permissions')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .send({
          permissionIds: [1]
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)

      // 验证权限已移除
      const permissions = await db.all(
        'SELECT * FROM merchant_permissions WHERE merchant_id = 1'
      )
      expect(permissions.length).toBe(1)
    })
  })

  describe('商户管理安全性测试', () => {
    it('应该防止SQL注入攻击', async () => {
      const response = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .send({
          name: "'; DROP TABLE merchants; --",
          code: 'TEST_SQL_INJECTION'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('应该防止XSS攻击', async () => {
      const response = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .send({
          name: '<script>alert("xss")</script>',
          code: 'TEST_XSS'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('应该验证商户编码格式', async () => {
      const response = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .send({
          name: '测试商户',
          code: 'invalid code with spaces'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })
  })

  describe('商户管理错误处理测试', () => {
    it('应该处理数据库连接错误', async () => {
      // 模拟数据库错误
      const originalGet = db.get
      db.get = vi.fn().mockRejectedValue(new Error('数据库连接失败'))

      const response = await request(app)
        .get('/api/v1/merchant/1')
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)

      // 恢复原始方法
      db.get = originalGet
    })

    it('应该处理无效的JSON数据', async () => {
      const response = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid-json')

      expect(response.status).toBe(400)
    })
  })

  describe('商户管理性能测试', () => {
    it('商户列表查询响应时间应该在合理范围内', async () => {
      const startTime = Date.now()

      const response = await request(app)
        .get('/api/v1/merchant')
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(2000) // 2秒内响应
    })

    it('应该支持并发商户操作', async () => {
      const concurrentRequests = Array(5).fill(null).map((_, index) =>
        request(app)
          .post('/api/v1/merchant')
          .set('Authorization', `Bearer ${tenantAdminToken}`)
          .send({
            name: `并发商户${index}`,
            code: `CONCURRENT_${index}`,
            contact: `联系人${index}`
          })
      )

      const responses = await Promise.all(concurrentRequests)
      
      // 检查所有请求都得到了响应
      responses.forEach(response => {
        expect([200, 201, 400, 403]).toContain(response.status)
      })

      // 清理测试数据
      await db.run('DELETE FROM merchants WHERE code LIKE "CONCURRENT_%"')
    })
  })

  describe('完整商户管理流程集成测试', () => {
    it('应该完成完整的商户生命周期管理', async () => {
      // 1. 创建商户
      const createResponse = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .send({
          name: '完整流程测试商户',
          code: 'FULL_LIFECYCLE',
          contact: '测试联系人',
          phone: '13800138999',
          email: 'lifecycle@test.com'
        })

      expect(createResponse.status).toBe(201)
      const merchantId = createResponse.body.data.merchant.id

      // 2. 获取商户详情
      const detailResponse = await request(app)
        .get(`/api/v1/merchant/${merchantId}`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(detailResponse.status).toBe(200)
      expect(detailResponse.body.data.merchant.name).toBe('完整流程测试商户')

      // 3. 更新商户信息
      const updateResponse = await request(app)
        .put(`/api/v1/merchant/${merchantId}`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .send({
          name: '更新后的商户名',
          contact: '更新后的联系人'
        })

      expect(updateResponse.status).toBe(200)
      expect(updateResponse.body.data.merchant.name).toBe('更新后的商户名')

      // 4. 获取商户统计信息
      const statsResponse = await request(app)
        .get(`/api/v1/merchant/${merchantId}/stats`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(statsResponse.status).toBe(200)
      expect(statsResponse.body.data.stats).toBeDefined()

      // 5. 停用商户
      const disableResponse = await request(app)
        .post(`/api/v1/merchant/${merchantId}/disable`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(disableResponse.status).toBe(200)
      expect(disableResponse.body.data.merchant.status).toBe('inactive')

      // 6. 启用商户
      const enableResponse = await request(app)
        .post(`/api/v1/merchant/${merchantId}/enable`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(enableResponse.status).toBe(200)
      expect(enableResponse.body.data.merchant.status).toBe('active')

      // 7. 删除商户
      const deleteResponse = await request(app)
        .delete(`/api/v1/merchant/${merchantId}`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(deleteResponse.status).toBe(200)

      // 8. 验证商户已被删除
      const finalDetailResponse = await request(app)
        .get(`/api/v1/merchant/${merchantId}`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(finalDetailResponse.status).toBe(404)
    })
  })
})