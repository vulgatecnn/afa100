/**
 * 访客管理API集成测试 - 完整申请审批流程测试
 * 测试访客管理API的完整功能，包括申请、审批、拒绝等流程
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import { app } from '../../src/app.js'
import { Database } from '../../src/utils/database.js'
import { visitorApplicationFactory, userFactory, merchantFactory } from '../../../shared/test-factories/index.js'
import { TestErrorHandler, createTestContext } from '../../../shared/test-helpers/error-handler.js'

describe('访客管理API集成测试', () => {
  let db: Database
  let tenantAdminToken: string
  let merchantAdminToken: string
  let employeeToken: string
  let visitorToken: string
  let testMerchantId: number
  let testUsers: any[] = []

  const testContext = createTestContext(
    '访客管理API集成测试',
    'api-visitor-integration.test.ts',
    'backend',
    'integration'
  )

  beforeAll(async () => {
    try {
      // 初始化测试数据库
      db = Database.getInstance()
      await db.init()

      // 创建测试商户
      const testMerchant = merchantFactory.create({
        id: 1,
        name: '测试商户',
        code: 'TEST001',
        status: 'active'
      })

      await db.run(`
        INSERT INTO merchants (
          id, name, code, contact, phone, email, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testMerchant.id,
        testMerchant.name,
        testMerchant.code,
        testMerchant.contact,
        testMerchant.phone,
        testMerchant.email,
        testMerchant.status,
        testMerchant.createdAt,
        testMerchant.updatedAt
      ])

      testMerchantId = testMerchant.id

      // 创建测试用户
      const tenantAdmin = userFactory.create({
        id: 1,
        userType: 'tenant_admin',
        phone: '13800138000',
        name: '租务管理员',
        status: 'active',
        merchantId: undefined
      })

      const merchantAdmin = userFactory.create({
        id: 2,
        userType: 'merchant_admin',
        phone: '13800138001',
        name: '商户管理员',
        status: 'active',
        merchantId: testMerchantId
      })

      const employee = userFactory.create({
        id: 3,
        userType: 'employee',
        phone: '13800138002',
        name: '员工用户',
        status: 'active',
        merchantId: testMerchantId
      })

      const visitor = userFactory.create({
        id: 4,
        userType: 'visitor',
        phone: '13800138003',
        name: '访客用户',
        status: 'active',
        merchantId: undefined
      })

      testUsers = [tenantAdmin, merchantAdmin, employee, visitor]

      // 插入测试用户
      for (const user of testUsers) {
        await db.run(`
          INSERT INTO users (
            id, open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user.id,
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

      const visitorLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138003',
          password: 'password123',
          userType: 'visitor'
        })
      visitorToken = visitorLoginResponse.body.data.accessToken

    } catch (error) {
      TestErrorHandler.handle(error as Error, testContext)
      throw error
    }
  })

  afterAll(async () => {
    try {
      // 清理测试数据
      await db.run('DELETE FROM visitor_applications WHERE merchant_id = ?', [testMerchantId])
      await db.run('DELETE FROM users WHERE phone LIKE "1380013800%"')
      await db.run('DELETE FROM merchants WHERE id = ?', [testMerchantId])
      await db.close()
    } catch (error) {
      TestErrorHandler.handle(error as Error, testContext)
    }
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    // 清理之前测试创建的访客申请数据
    await db.run('DELETE FROM visitor_applications WHERE visitor_phone LIKE "139%"')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/v1/visitor/apply - 访客申请', () => {
    it('访客应该能成功提交访问申请', async () => {
      const applicationData = {
        merchantId: testMerchantId,
        visiteeId: 3, // 员工用户ID
        visitorName: '张三',
        visitorPhone: '13900139001',
        visitorCompany: '测试公司',
        visitPurpose: '商务洽谈',
        visitType: 'business',
        scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 明天
        duration: 120 // 2小时
      }

      const response = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send(applicationData)

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.application).toMatchObject({
        merchantId: applicationData.merchantId,
        visiteeId: applicationData.visiteeId,
        visitorName: applicationData.visitorName,
        visitorPhone: applicationData.visitorPhone,
        visitPurpose: applicationData.visitPurpose,
        status: 'pending'
      })

      // 验证数据库中的数据
      const dbApplication = await db.get(
        'SELECT * FROM visitor_applications WHERE visitor_phone = ?',
        [applicationData.visitorPhone]
      )
      expect(dbApplication).toBeTruthy()
      expect(dbApplication.status).toBe('pending')
    })

    it('应该验证必填字段', async () => {
      const response = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send({
          merchantId: testMerchantId,
          visitorName: '李四'
          // 缺少必填字段
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('验证失败')
    })

    it('应该验证访问时间不能是过去时间', async () => {
      const response = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send({
          merchantId: testMerchantId,
          visiteeId: 3,
          visitorName: '王五',
          visitorPhone: '13900139002',
          visitPurpose: '技术交流',
          scheduledTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 昨天
          duration: 60
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('访问时间不能是过去时间')
    })

    it('应该验证商户存在性', async () => {
      const response = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send({
          merchantId: 99999, // 不存在的商户ID
          visiteeId: 3,
          visitorName: '赵六',
          visitorPhone: '13900139003',
          visitPurpose: '参观访问',
          scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 60
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('商户不存在')
    })

    it('应该验证被访问员工存在性', async () => {
      const response = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send({
          merchantId: testMerchantId,
          visiteeId: 99999, // 不存在的员工ID
          visitorName: '孙七',
          visitorPhone: '13900139004',
          visitPurpose: '会议讨论',
          scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 60
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('被访问员工不存在')
    })

    it('非访客用户不应该能提交申请', async () => {
      const response = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          merchantId: testMerchantId,
          visiteeId: 3,
          visitorName: '员工申请',
          visitorPhone: '13900139005',
          visitPurpose: '测试申请',
          scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 60
        })

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('只有访客可以提交申请')
    })
  })

  describe('GET /api/v1/visitor/applications - 获取访客申请列表', () => {
    beforeEach(async () => {
      // 创建测试访客申请数据
      const applications = visitorApplicationFactory.createMany(5, {
        merchantId: testMerchantId,
        applicantId: 4, // 访客用户ID
        visiteeId: 3 // 员工用户ID
      })

      for (let i = 0; i < applications.length; i++) {
        const app = applications[i]
        await db.run(`
          INSERT INTO visitor_applications (
            applicant_id, merchant_id, visitee_id, visitor_name, visitor_phone,
            visitor_company, visit_purpose, visit_type, scheduled_time, duration,
            status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          app.applicantId,
          app.merchantId,
          app.visiteeId,
          `测试访客${i + 1}`,
          `1390013900${i + 1}`,
          app.visitorCompany,
          app.visitPurpose,
          app.visitType,
          app.scheduledTime,
          app.duration,
          app.status,
          app.createdAt,
          app.updatedAt
        ])
      }
    })

    afterEach(async () => {
      await db.run('DELETE FROM visitor_applications WHERE visitor_phone LIKE "139001390%"')
    })

    it('租务管理员应该能获取所有访客申请', async () => {
      const response = await request(app)
        .get('/api/v1/visitor/applications')
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

    it('商户管理员只能获取自己商户的访客申请', async () => {
      const response = await request(app)
        .get('/api/v1/visitor/applications')
        .set('Authorization', `Bearer ${merchantAdminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      response.body.data.data.forEach((application: any) => {
        expect(application.merchantId).toBe(testMerchantId)
      })
    })

    it('员工只能获取访问自己的申请', async () => {
      const response = await request(app)
        .get('/api/v1/visitor/applications')
        .set('Authorization', `Bearer ${employeeToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      response.body.data.data.forEach((application: any) => {
        expect(application.visiteeId).toBe(3) // 员工用户ID
      })
    })

    it('访客只能获取自己提交的申请', async () => {
      const response = await request(app)
        .get('/api/v1/visitor/applications')
        .set('Authorization', `Bearer ${visitorToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      response.body.data.data.forEach((application: any) => {
        expect(application.applicantId).toBe(4) // 访客用户ID
      })
    })

    it('应该支持状态筛选', async () => {
      const response = await request(app)
        .get('/api/v1/visitor/applications?status=pending')
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(response.status).toBe(200)
      response.body.data.data.forEach((application: any) => {
        expect(application.status).toBe('pending')
      })
    })

    it('应该支持分页查询', async () => {
      const response = await request(app)
        .get('/api/v1/visitor/applications?page=1&limit=3')
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.data.length).toBeLessThanOrEqual(3)
      expect(response.body.data.pagination.limit).toBe(3)
    })

    it('应该支持时间范围筛选', async () => {
      const startDate = new Date().toISOString().split('T')[0]
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const response = await request(app)
        .get(`/api/v1/visitor/applications?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe('GET /api/v1/visitor/applications/:id - 获取访客申请详情', () => {
    let testApplicationId: number

    beforeEach(async () => {
      // 创建测试申请
      const application = visitorApplicationFactory.create({
        applicantId: 4,
        merchantId: testMerchantId,
        visiteeId: 3,
        visitorName: '详情测试访客',
        visitorPhone: '13900139999'
      })

      const result = await db.run(`
        INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitee_id, visitor_name, visitor_phone,
          visit_purpose, scheduled_time, duration, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        application.applicantId,
        application.merchantId,
        application.visiteeId,
        application.visitorName,
        application.visitorPhone,
        application.visitPurpose,
        application.scheduledTime,
        application.duration,
        application.status,
        application.createdAt,
        application.updatedAt
      ])

      testApplicationId = result.lastID!
    })

    afterEach(async () => {
      await db.run('DELETE FROM visitor_applications WHERE id = ?', [testApplicationId])
    })

    it('应该返回访客申请详情', async () => {
      const response = await request(app)
        .get(`/api/v1/visitor/applications/${testApplicationId}`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.application).toMatchObject({
        id: testApplicationId,
        visitorName: '详情测试访客',
        visitorPhone: '13900139999',
        merchantId: testMerchantId
      })
    })

    it('应该处理不存在的申请ID', async () => {
      const response = await request(app)
        .get('/api/v1/visitor/applications/99999')
        .set('Authorization', `Bearer ${tenantAdminToken}`)

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('申请不存在')
    })

    it('商户管理员不能查看其他商户的申请详情', async () => {
      // 创建其他商户的申请
      await db.run(`
        INSERT INTO merchants (id, name, code, status, created_at, updated_at)
        VALUES (999, '其他商户', 'OTHER999', 'active', datetime('now'), datetime('now'))
      `)

      const result = await db.run(`
        INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitor_name, visitor_phone, visit_purpose,
          scheduled_time, duration, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        4, 999, '其他商户访客', '13900199999', '测试访问',
        new Date().toISOString(), 60, 'pending',
        new Date().toISOString(), new Date().toISOString()
      ])

      const otherApplicationId = result.lastID!

      const response = await request(app)
        .get(`/api/v1/visitor/applications/${otherApplicationId}`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)

      // 清理测试数据
      await db.run('DELETE FROM visitor_applications WHERE id = ?', [otherApplicationId])
      await db.run('DELETE FROM merchants WHERE id = 999')
    })
  })

  describe('POST /api/v1/visitor/applications/:id/approve - 审批通过申请', () => {
    let testApplicationId: number

    beforeEach(async () => {
      // 创建待审批的申请
      const result = await db.run(`
        INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitee_id, visitor_name, visitor_phone,
          visit_purpose, scheduled_time, duration, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        4, testMerchantId, 3, '待审批访客', '13900188888',
        '商务洽谈', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        120, 'pending', new Date().toISOString(), new Date().toISOString()
      ])

      testApplicationId = result.lastID!
    })

    afterEach(async () => {
      await db.run('DELETE FROM visitor_applications WHERE id = ?', [testApplicationId])
      await db.run('DELETE FROM passcodes WHERE application_id = ?', [testApplicationId])
    })

    it('商户管理员应该能审批通过申请', async () => {
      const approvalData = {
        usageLimit: 5,
        validHours: 24,
        notes: '审批通过，请按时到访'
      }

      const response = await request(app)
        .post(`/api/v1/visitor/applications/${testApplicationId}/approve`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send(approvalData)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.application.status).toBe('approved')
      expect(response.body.data.application.approvedBy).toBe(2) // 商户管理员ID
      expect(response.body.data.passcode).toBeDefined()

      // 验证数据库中的状态已更新
      const dbApplication = await db.get(
        'SELECT * FROM visitor_applications WHERE id = ?',
        [testApplicationId]
      )
      expect(dbApplication.status).toBe('approved')
      expect(dbApplication.approved_by).toBe(2)

      // 验证通行码已生成
      const passcode = await db.get(
        'SELECT * FROM passcodes WHERE application_id = ?',
        [testApplicationId]
      )
      expect(passcode).toBeTruthy()
      expect(passcode.type).toBe('visitor')
      expect(passcode.status).toBe('active')
    })

    it('员工应该能审批访问自己的申请', async () => {
      const response = await request(app)
        .post(`/api/v1/visitor/applications/${testApplicationId}/approve`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          usageLimit: 3,
          validHours: 12
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.application.approvedBy).toBe(3) // 员工用户ID
    })

    it('应该拒绝审批已处理的申请', async () => {
      // 先审批一次
      await request(app)
        .post(`/api/v1/visitor/applications/${testApplicationId}/approve`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send({ usageLimit: 5 })

      // 再次尝试审批
      const response = await request(app)
        .post(`/api/v1/visitor/applications/${testApplicationId}/approve`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send({ usageLimit: 3 })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('申请已处理')
    })

    it('访客不应该能审批申请', async () => {
      const response = await request(app)
        .post(`/api/v1/visitor/applications/${testApplicationId}/approve`)
        .set('Authorization', `Bearer ${visitorToken}`)
        .send({ usageLimit: 5 })

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })

    it('应该验证审批参数', async () => {
      const response = await request(app)
        .post(`/api/v1/visitor/applications/${testApplicationId}/approve`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send({
          usageLimit: -1, // 无效的使用次数
          validHours: 0 // 无效的有效时间
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/v1/visitor/applications/:id/reject - 拒绝申请', () => {
    let testApplicationId: number

    beforeEach(async () => {
      // 创建待审批的申请
      const result = await db.run(`
        INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitee_id, visitor_name, visitor_phone,
          visit_purpose, scheduled_time, duration, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        4, testMerchantId, 3, '待拒绝访客', '13900177777',
        '技术交流', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        90, 'pending', new Date().toISOString(), new Date().toISOString()
      ])

      testApplicationId = result.lastID!
    })

    afterEach(async () => {
      await db.run('DELETE FROM visitor_applications WHERE id = ?', [testApplicationId])
    })

    it('商户管理员应该能拒绝申请', async () => {
      const rejectionData = {
        reason: '时间冲突，无法安排接待'
      }

      const response = await request(app)
        .post(`/api/v1/visitor/applications/${testApplicationId}/reject`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send(rejectionData)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.application.status).toBe('rejected')
      expect(response.body.data.application.rejectionReason).toBe(rejectionData.reason)

      // 验证数据库中的状态已更新
      const dbApplication = await db.get(
        'SELECT * FROM visitor_applications WHERE id = ?',
        [testApplicationId]
      )
      expect(dbApplication.status).toBe('rejected')
      expect(dbApplication.rejection_reason).toBe(rejectionData.reason)
    })

    it('员工应该能拒绝访问自己的申请', async () => {
      const response = await request(app)
        .post(`/api/v1/visitor/applications/${testApplicationId}/reject`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          reason: '个人原因，无法接待'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('应该要求提供拒绝原因', async () => {
      const response = await request(app)
        .post(`/api/v1/visitor/applications/${testApplicationId}/reject`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send({})

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('拒绝原因')
    })

    it('访客不应该能拒绝申请', async () => {
      const response = await request(app)
        .post(`/api/v1/visitor/applications/${testApplicationId}/reject`)
        .set('Authorization', `Bearer ${visitorToken}`)
        .send({
          reason: '测试拒绝'
        })

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/v1/visitor/applications/:id/cancel - 取消申请', () => {
    let testApplicationId: number

    beforeEach(async () => {
      // 创建待取消的申请
      const result = await db.run(`
        INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitee_id, visitor_name, visitor_phone,
          visit_purpose, scheduled_time, duration, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        4, testMerchantId, 3, '待取消访客', '13900166666',
        '会议讨论', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        60, 'pending', new Date().toISOString(), new Date().toISOString()
      ])

      testApplicationId = result.lastID!
    })

    afterEach(async () => {
      await db.run('DELETE FROM visitor_applications WHERE id = ?', [testApplicationId])
    })

    it('访客应该能取消自己的申请', async () => {
      const response = await request(app)
        .post(`/api/v1/visitor/applications/${testApplicationId}/cancel`)
        .set('Authorization', `Bearer ${visitorToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.application.status).toBe('cancelled')

      // 验证数据库中的状态已更新
      const dbApplication = await db.get(
        'SELECT * FROM visitor_applications WHERE id = ?',
        [testApplicationId]
      )
      expect(dbApplication.status).toBe('cancelled')
    })

    it('应该拒绝取消已审批的申请', async () => {
      // 先审批申请
      await db.run(
        'UPDATE visitor_applications SET status = "approved" WHERE id = ?',
        [testApplicationId]
      )

      const response = await request(app)
        .post(`/api/v1/visitor/applications/${testApplicationId}/cancel`)
        .set('Authorization', `Bearer ${visitorToken}`)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('无法取消已处理的申请')
    })

    it('其他用户不应该能取消别人的申请', async () => {
      const response = await request(app)
        .post(`/api/v1/visitor/applications/${testApplicationId}/cancel`)
        .set('Authorization', `Bearer ${employeeToken}`)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })
  })

  describe('GET /api/v1/visitor/passcodes - 获取访客通行码', () => {
    let testApplicationId: number
    let testPasscodeId: number

    beforeEach(async () => {
      // 创建已审批的申请和通行码
      const appResult = await db.run(`
        INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitee_id, visitor_name, visitor_phone,
          visit_purpose, scheduled_time, duration, status, approved_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        4, testMerchantId, 3, '通行码测试访客', '13900155555',
        '参观访问', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        90, 'approved', 2, new Date().toISOString(), new Date().toISOString()
      ])

      testApplicationId = appResult.lastID!

      const passcodeResult = await db.run(`
        INSERT INTO passcodes (
          user_id, code, type, status, expiry_time, usage_limit, usage_count,
          application_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        4, 'VIS001', 'visitor', 'active',
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        5, 0, testApplicationId, new Date().toISOString(), new Date().toISOString()
      ])

      testPasscodeId = passcodeResult.lastID!
    })

    afterEach(async () => {
      await db.run('DELETE FROM passcodes WHERE id = ?', [testPasscodeId])
      await db.run('DELETE FROM visitor_applications WHERE id = ?', [testApplicationId])
    })

    it('访客应该能获取自己的通行码', async () => {
      const response = await request(app)
        .get('/api/v1/visitor/passcodes')
        .set('Authorization', `Bearer ${visitorToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.passcodes).toBeInstanceOf(Array)
      expect(response.body.data.passcodes.length).toBeGreaterThan(0)

      const passcode = response.body.data.passcodes[0]
      expect(passcode.userId).toBe(4) // 访客用户ID
      expect(passcode.type).toBe('visitor')
    })

    it('应该只返回有效的通行码', async () => {
      const response = await request(app)
        .get('/api/v1/visitor/passcodes?status=active')
        .set('Authorization', `Bearer ${visitorToken}`)

      expect(response.status).toBe(200)
      response.body.data.passcodes.forEach((passcode: any) => {
        expect(passcode.status).toBe('active')
      })
    })

    it('其他用户不应该能获取访客的通行码', async () => {
      const response = await request(app)
        .get('/api/v1/visitor/passcodes')
        .set('Authorization', `Bearer ${employeeToken}`)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })
  })

  describe('访客管理完整流程集成测试', () => {
    it('应该完成完整的访客申请审批流程', async () => {
      // 1. 访客提交申请
      const applicationData = {
        merchantId: testMerchantId,
        visiteeId: 3,
        visitorName: '完整流程测试访客',
        visitorPhone: '13900199999',
        visitorCompany: '测试公司',
        visitPurpose: '业务洽谈',
        visitType: 'business',
        scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration: 120
      }

      const applyResponse = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send(applicationData)

      expect(applyResponse.status).toBe(201)
      const applicationId = applyResponse.body.data.application.id

      // 2. 获取申请列表，验证申请已提交
      const listResponse = await request(app)
        .get('/api/v1/visitor/applications')
        .set('Authorization', `Bearer ${merchantAdminToken}`)

      expect(listResponse.status).toBe(200)
      const application = listResponse.body.data.data.find(
        (app: any) => app.id === applicationId
      )
      expect(application).toBeTruthy()
      expect(application.status).toBe('pending')

      // 3. 获取申请详情
      const detailResponse = await request(app)
        .get(`/api/v1/visitor/applications/${applicationId}`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)

      expect(detailResponse.status).toBe(200)
      expect(detailResponse.body.data.application.visitorName).toBe('完整流程测试访客')

      // 4. 商户管理员审批通过
      const approveResponse = await request(app)
        .post(`/api/v1/visitor/applications/${applicationId}/approve`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send({
          usageLimit: 5,
          validHours: 24,
          notes: '审批通过'
        })

      expect(approveResponse.status).toBe(200)
      expect(approveResponse.body.data.application.status).toBe('approved')
      expect(approveResponse.body.data.passcode).toBeDefined()

      // 5. 访客获取通行码
      const passcodeResponse = await request(app)
        .get('/api/v1/visitor/passcodes')
        .set('Authorization', `Bearer ${visitorToken}`)

      expect(passcodeResponse.status).toBe(200)
      const passcodes = passcodeResponse.body.data.passcodes
      const newPasscode = passcodes.find(
        (pc: any) => pc.applicationId === applicationId
      )
      expect(newPasscode).toBeTruthy()
      expect(newPasscode.status).toBe('active')

      // 6. 验证申请状态已更新
      const finalDetailResponse = await request(app)
        .get(`/api/v1/visitor/applications/${applicationId}`)
        .set('Authorization', `Bearer ${visitorToken}`)

      expect(finalDetailResponse.status).toBe(200)
      expect(finalDetailResponse.body.data.application.status).toBe('approved')

      // 清理测试数据
      await db.run('DELETE FROM passcodes WHERE application_id = ?', [applicationId])
      await db.run('DELETE FROM visitor_applications WHERE id = ?', [applicationId])
    })

    it('应该完成访客申请拒绝流程', async () => {
      // 1. 访客提交申请
      const applyResponse = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send({
          merchantId: testMerchantId,
          visiteeId: 3,
          visitorName: '拒绝流程测试访客',
          visitorPhone: '13900188888',
          visitPurpose: '测试访问',
          scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 60
        })

      expect(applyResponse.status).toBe(201)
      const applicationId = applyResponse.body.data.application.id

      // 2. 员工拒绝申请
      const rejectResponse = await request(app)
        .post(`/api/v1/visitor/applications/${applicationId}/reject`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          reason: '时间冲突，无法接待'
        })

      expect(rejectResponse.status).toBe(200)
      expect(rejectResponse.body.data.application.status).toBe('rejected')

      // 3. 验证申请状态
      const detailResponse = await request(app)
        .get(`/api/v1/visitor/applications/${applicationId}`)
        .set('Authorization', `Bearer ${visitorToken}`)

      expect(detailResponse.status).toBe(200)
      expect(detailResponse.body.data.application.status).toBe('rejected')
      expect(detailResponse.body.data.application.rejectionReason).toBe('时间冲突，无法接待')

      // 清理测试数据
      await db.run('DELETE FROM visitor_applications WHERE id = ?', [applicationId])
    })
  })

  describe('访客管理安全性测试', () => {
    it('应该防止SQL注入攻击', async () => {
      const response = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send({
          merchantId: testMerchantId,
          visiteeId: 3,
          visitorName: "'; DROP TABLE visitor_applications; --",
          visitorPhone: '13900199999',
          visitPurpose: '测试注入',
          scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 60
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('应该防止XSS攻击', async () => {
      const response = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send({
          merchantId: testMerchantId,
          visiteeId: 3,
          visitorName: '<script>alert("xss")</script>',
          visitorPhone: '13900199999',
          visitPurpose: '测试XSS',
          scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 60
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('应该验证访问时间的合理性', async () => {
      // 测试过于久远的未来时间
      const response = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send({
          merchantId: testMerchantId,
          visiteeId: 3,
          visitorName: '远期访客',
          visitorPhone: '13900199999',
          visitPurpose: '远期访问',
          scheduledTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 一年后
          duration: 60
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('访问时间不能超过')
    })
  })

  describe('访客管理性能测试', () => {
    it('访客申请响应时间应该在合理范围内', async () => {
      const startTime = Date.now()

      const response = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send({
          merchantId: testMerchantId,
          visiteeId: 3,
          visitorName: '性能测试访客',
          visitorPhone: '13900199999',
          visitPurpose: '性能测试',
          scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 60
        })

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(201)
      expect(responseTime).toBeLessThan(2000) // 2秒内响应

      // 清理测试数据
      if (response.body.data?.application?.id) {
        await db.run('DELETE FROM visitor_applications WHERE id = ?', [response.body.data.application.id])
      }
    })

    it('应该支持并发访客申请', async () => {
      const concurrentRequests = Array(5).fill(null).map((_, index) =>
        request(app)
          .post('/api/v1/visitor/apply')
          .set('Authorization', `Bearer ${visitorToken}`)
          .send({
            merchantId: testMerchantId,
            visiteeId: 3,
            visitorName: `并发访客${index}`,
            visitorPhone: `1390019${index.toString().padStart(4, '0')}`,
            visitPurpose: '并发测试',
            scheduledTime: new Date(Date.now() + (24 + index) * 60 * 60 * 1000).toISOString(),
            duration: 60
          })
      )

      const responses = await Promise.all(concurrentRequests)
      
      // 检查所有请求都得到了响应
      responses.forEach(response => {
        expect([200, 201, 400, 403]).toContain(response.status)
      })

      // 清理测试数据
      await db.run('DELETE FROM visitor_applications WHERE visitor_phone LIKE "1390019%"')
    })
  })
})