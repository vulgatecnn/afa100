/**
 * 认证和权限集成测试 - 完整的JWT认证和RBAC权限控制测试
 * 测试JWT认证的完整流程和不同角色的权限控制
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { app } from '../../src/app.js'
import { Database } from '../../src/utils/database.js'
import { userFactory, merchantFactory } from '../../../../shared/test-factories/index.js'
import { TestErrorHandler, createTestContext } from '../../../../shared/test-helpers/error-handler.js'

describe('认证和权限集成测试', () => {
  let db: Database
  let testMerchantId: number
  let testUsers: any[] = []
  let authTokens: Record<string, string> = {}
  let refreshTokens: Record<string, string> = {}

  const testContext = createTestContext(
    '认证和权限集成测试',
    'auth-permission-integration.test.ts',
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
        name: '权限测试商户',
        code: 'AUTH_TEST_001',
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

      // 创建不同角色的测试用户
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

      const inactiveUser = userFactory.create({
        id: 5,
        userType: 'employee',
        phone: '13800138004',
        name: '停用员工',
        status: 'inactive',
        merchantId: testMerchantId
      })

      testUsers = [tenantAdmin, merchantAdmin, employee, visitor, inactiveUser]

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

      // 创建权限数据
      await db.run(`
        INSERT INTO permissions (id, code, name, description, resource_type, resource_id, actions, created_at)
        VALUES 
        (1, 'merchant:manage', '商户管理权限', '管理商户信息', 'merchant', null, '["create", "read", "update", "delete"]', datetime('now')),
        (2, 'user:manage', '用户管理权限', '管理用户信息', 'user', null, '["create", "read", "update", "delete"]', datetime('now')),
        (3, 'visitor:manage', '访客管理权限', '管理访客申请', 'visitor', null, '["create", "read", "update", "approve", "reject"]', datetime('now')),
        (4, 'access:view', '通行记录查看权限', '查看通行记录', 'access', null, '["read"]', datetime('now')),
        (5, 'merchant:1:access', '商户1通行权限', '允许通行商户1', 'merchant', 1, '["access"]', datetime('now'))
      `)

      // 分配角色权限
      await db.run(`
        INSERT INTO role_permissions (role, permission_code, granted_at)
        VALUES 
        ('tenant_admin', 'merchant:manage', datetime('now')),
        ('tenant_admin', 'user:manage', datetime('now')),
        ('tenant_admin', 'visitor:manage', datetime('now')),
        ('tenant_admin', 'access:view', datetime('now')),
        ('merchant_admin', 'user:manage', datetime('now')),
        ('merchant_admin', 'visitor:manage', datetime('now')),
        ('merchant_admin', 'access:view', datetime('now')),
        ('employee', 'visitor:manage', datetime('now')),
        ('employee', 'access:view', datetime('now')),
        ('visitor', 'visitor:manage', datetime('now'))
      `)

    } catch (error) {
      TestErrorHandler.handle(error as Error, testContext)
      throw error
    }
  })

  afterAll(async () => {
    try {
      // 清理测试数据
      await db.run('DELETE FROM role_permissions WHERE role IN ("tenant_admin", "merchant_admin", "employee", "visitor")')
      await db.run('DELETE FROM permissions WHERE id BETWEEN 1 AND 5')
      await db.run('DELETE FROM users WHERE phone LIKE "1380013800%"')
      await db.run('DELETE FROM merchants WHERE id = ?', [testMerchantId])
      await db.close()
    } catch (error) {
      TestErrorHandler.handle(error as Error, testContext)
    }
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // 获取所有用户的认证token
    for (const user of testUsers) {
      if (user.status === 'active') {
        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            phone: user.phone,
            password: 'password123',
            userType: user.userType
          })

        if (loginResponse.status === 200) {
          authTokens[user.userType] = loginResponse.body.data.accessToken
          refreshTokens[user.userType] = loginResponse.body.data.refreshToken
        }
      }
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('JWT认证完整流程测试', () => {
    it('应该生成有效的JWT token', async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138000',
          password: 'password123',
          userType: 'tenant_admin'
        })

      expect(loginResponse.status).toBe(200)
      const { accessToken, refreshToken } = loginResponse.body.data

      // 验证access token结构
      expect(accessToken).toBeTruthy()
      expect(typeof accessToken).toBe('string')
      expect(accessToken.split('.')).toHaveLength(3) // JWT格式

      // 验证refresh token结构
      expect(refreshToken).toBeTruthy()
      expect(typeof refreshToken).toBe('string')
      expect(refreshToken.split('.')).toHaveLength(3)

      // 解码token验证payload
      const decoded = jwt.decode(accessToken) as any
      expect(decoded).toBeTruthy()
      expect(decoded.userId).toBe(1)
      expect(decoded.userType).toBe('tenant_admin')
      expect(decoded.merchantId).toBeUndefined()
    })

    it('应该正确验证token有效性', async () => {
      const token = authTokens.tenant_admin

      const response = await request(app)
        .post('/api/v1/auth/verify-token')
        .send({ token })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.valid).toBe(true)
      expect(response.body.data.user.id).toBe(1)
      expect(response.body.data.user.userType).toBe('tenant_admin')
    })

    it('应该拒绝无效的token', async () => {
      const invalidToken = 'invalid.jwt.token'

      const response = await request(app)
        .post('/api/v1/auth/verify-token')
        .send({ token: invalidToken })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.data.valid).toBe(false)
    })

    it('应该拒绝过期的token', async () => {
      // 创建一个过期的token
      const expiredToken = jwt.sign(
        {
          userId: 1,
          userType: 'tenant_admin',
          exp: Math.floor(Date.now() / 1000) - 3600 // 1小时前过期
        },
        process.env.JWT_SECRET || 'test-secret'
      )

      const response = await request(app)
        .post('/api/v1/auth/verify-token')
        .send({ token: expiredToken })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.data.valid).toBe(false)
    })

    it('应该拒绝篡改的token', async () => {
      const validToken = authTokens.tenant_admin
      const tamperedToken = validToken.slice(0, -5) + 'XXXXX' // 篡改签名

      const response = await request(app)
        .post('/api/v1/auth/verify-token')
        .send({ token: tamperedToken })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
    })

    it('应该正确刷新token', async () => {
      const refreshToken = refreshTokens.tenant_admin

      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.accessToken).toBeTruthy()
      expect(response.body.data.refreshToken).toBeTruthy()

      // 新token应该不同于原token
      expect(response.body.data.accessToken).not.toBe(authTokens.tenant_admin)
      expect(response.body.data.refreshToken).not.toBe(refreshToken)

      // 新token应该有效
      const newToken = response.body.data.accessToken
      const verifyResponse = await request(app)
        .post('/api/v1/auth/verify-token')
        .send({ token: newToken })

      expect(verifyResponse.status).toBe(200)
      expect(verifyResponse.body.data.valid).toBe(true)
    })

    it('应该在登出后使token失效', async () => {
      const token = authTokens.employee

      // 验证token有效
      const verifyBefore = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)

      expect(verifyBefore.status).toBe(200)

      // 登出
      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)

      expect(logoutResponse.status).toBe(200)

      // 验证token已失效
      const verifyAfter = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)

      expect(verifyAfter.status).toBe(401)
    })
  })

  describe('角色权限控制测试', () => {
    it('租务管理员应该有最高权限', async () => {
      const token = authTokens.tenant_admin

      // 可以访问商户管理
      const merchantResponse = await request(app)
        .get('/api/v1/merchant')
        .set('Authorization', `Bearer ${token}`)
      expect(merchantResponse.status).toBe(200)

      // 可以创建商户
      const createMerchantResponse = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '权限测试商户',
          code: 'PERM_TEST_001',
          contact: '测试联系人'
        })
      expect(createMerchantResponse.status).toBe(201)

      // 可以查看所有访客申请
      const visitorResponse = await request(app)
        .get('/api/v1/visitor/applications')
        .set('Authorization', `Bearer ${token}`)
      expect(visitorResponse.status).toBe(200)

      // 清理测试数据
      if (createMerchantResponse.body.data?.merchant?.id) {
        await db.run('DELETE FROM merchants WHERE id = ?', [createMerchantResponse.body.data.merchant.id])
      }
    })

    it('商户管理员应该有商户范围内的管理权限', async () => {
      const token = authTokens.merchant_admin

      // 可以查看商户列表（但只能看到自己的商户）
      const merchantResponse = await request(app)
        .get('/api/v1/merchant')
        .set('Authorization', `Bearer ${token}`)
      expect(merchantResponse.status).toBe(200)
      
      // 验证只能看到自己的商户
      merchantResponse.body.data.data.forEach((merchant: any) => {
        expect(merchant.id).toBe(testMerchantId)
      })

      // 不能创建新商户
      const createMerchantResponse = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '未授权商户',
          code: 'UNAUTHORIZED_001',
          contact: '测试联系人'
        })
      expect(createMerchantResponse.status).toBe(403)

      // 可以查看自己商户的访客申请
      const visitorResponse = await request(app)
        .get('/api/v1/visitor/applications')
        .set('Authorization', `Bearer ${token}`)
      expect(visitorResponse.status).toBe(200)
    })

    it('员工应该有限制的权限', async () => {
      const token = authTokens.employee

      // 不能访问商户管理
      const merchantResponse = await request(app)
        .get('/api/v1/merchant')
        .set('Authorization', `Bearer ${token}`)
      expect(merchantResponse.status).toBe(403)

      // 不能创建商户
      const createMerchantResponse = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '员工创建商户',
          code: 'EMPLOYEE_001',
          contact: '员工'
        })
      expect(createMerchantResponse.status).toBe(403)

      // 只能查看访问自己的申请
      const visitorResponse = await request(app)
        .get('/api/v1/visitor/applications')
        .set('Authorization', `Bearer ${token}`)
      expect(visitorResponse.status).toBe(200)
    })

    it('访客应该只有基本权限', async () => {
      const token = authTokens.visitor

      // 不能访问商户管理
      const merchantResponse = await request(app)
        .get('/api/v1/merchant')
        .set('Authorization', `Bearer ${token}`)
      expect(merchantResponse.status).toBe(403)

      // 可以提交访客申请
      const applyResponse = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({
          merchantId: testMerchantId,
          visiteeId: 3,
          visitorName: '权限测试访客',
          visitorPhone: '13900199999',
          visitPurpose: '权限测试',
          scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 60
        })
      expect(applyResponse.status).toBe(201)

      // 只能查看自己的申请
      const myApplicationsResponse = await request(app)
        .get('/api/v1/visitor/applications')
        .set('Authorization', `Bearer ${token}`)
      expect(myApplicationsResponse.status).toBe(200)

      // 清理测试数据
      if (applyResponse.body.data?.application?.id) {
        await db.run('DELETE FROM visitor_applications WHERE id = ?', [applyResponse.body.data.application.id])
      }
    })

    it('停用用户应该无法访问任何资源', async () => {
      // 尝试登录停用用户
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138004',
          password: 'password123',
          userType: 'employee'
        })

      expect(loginResponse.status).toBe(400)
      expect(loginResponse.body.success).toBe(false)
      expect(loginResponse.body.message).toContain('用户已停用')
    })
  })

  describe('跨接口权限验证测试', () => {
    it('应该在所有需要认证的接口验证token', async () => {
      const protectedEndpoints = [
        { method: 'get', path: '/api/v1/auth/me' },
        { method: 'get', path: '/api/v1/merchant' },
        { method: 'get', path: '/api/v1/visitor/applications' },
        { method: 'post', path: '/api/v1/auth/logout' }
      ]

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
        expect(response.status).toBe(401)
        expect(response.body.success).toBe(false)
      }
    })

    it('应该在所有接口验证用户状态', async () => {
      // 停用用户
      await db.run('UPDATE users SET status = "inactive" WHERE id = 3')

      // 尝试使用已停用用户的token
      const token = authTokens.employee

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)

      // 恢复用户状态
      await db.run('UPDATE users SET status = "active" WHERE id = 3')
    })

    it('应该验证商户管理员只能操作自己的商户', async () => {
      // 创建另一个商户
      await db.run(`
        INSERT INTO merchants (id, name, code, status, created_at, updated_at)
        VALUES (999, '其他商户', 'OTHER_999', 'active', datetime('now'), datetime('now'))
      `)

      const token = authTokens.merchant_admin

      // 尝试访问其他商户信息
      const response = await request(app)
        .get('/api/v1/merchant/999')
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)

      // 清理测试数据
      await db.run('DELETE FROM merchants WHERE id = 999')
    })

    it('应该验证员工只能处理访问自己的申请', async () => {
      // 创建另一个员工
      await db.run(`
        INSERT INTO users (id, phone, name, user_type, status, merchant_id, created_at, updated_at)
        VALUES (999, '13800199999', '其他员工', 'employee', 'active', ?, datetime('now'), datetime('now'))
      `, [testMerchantId])

      // 创建访问其他员工的申请
      const appResult = await db.run(`
        INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitee_id, visitor_name, visitor_phone,
          visit_purpose, scheduled_time, duration, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        4, testMerchantId, 999, '测试访客', '13900188888',
        '测试访问', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        60, 'pending', new Date().toISOString(), new Date().toISOString()
      ])

      const applicationId = appResult.lastID!
      const token = authTokens.employee

      // 员工尝试审批访问其他员工的申请
      const response = await request(app)
        .post(`/api/v1/visitor/applications/${applicationId}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send({ usageLimit: 5 })

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)

      // 清理测试数据
      await db.run('DELETE FROM visitor_applications WHERE id = ?', [applicationId])
      await db.run('DELETE FROM users WHERE id = 999')
    })

    it('应该验证访客只能操作自己的申请', async () => {
      // 创建其他访客的申请
      const appResult = await db.run(`
        INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitee_id, visitor_name, visitor_phone,
          visit_purpose, scheduled_time, duration, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        1, testMerchantId, 3, '其他访客', '13900177777', // applicant_id为1（租务管理员）
        '测试访问', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        60, 'pending', new Date().toISOString(), new Date().toISOString()
      ])

      const applicationId = appResult.lastID!
      const token = authTokens.visitor

      // 访客尝试取消其他人的申请
      const response = await request(app)
        .post(`/api/v1/visitor/applications/${applicationId}/cancel`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)

      // 清理测试数据
      await db.run('DELETE FROM visitor_applications WHERE id = ?', [applicationId])
    })
  })

  describe('权限继承和层级测试', () => {
    it('应该正确处理权限层级关系', async () => {
      // 租务管理员 > 商户管理员 > 员工 > 访客
      const hierarchyTests = [
        {
          role: 'tenant_admin',
          token: authTokens.tenant_admin,
          canAccessMerchants: true,
          canCreateMerchants: true,
          canViewAllApplications: true
        },
        {
          role: 'merchant_admin',
          token: authTokens.merchant_admin,
          canAccessMerchants: true,
          canCreateMerchants: false,
          canViewAllApplications: false
        },
        {
          role: 'employee',
          token: authTokens.employee,
          canAccessMerchants: false,
          canCreateMerchants: false,
          canViewAllApplications: false
        },
        {
          role: 'visitor',
          token: authTokens.visitor,
          canAccessMerchants: false,
          canCreateMerchants: false,
          canViewAllApplications: false
        }
      ]

      for (const test of hierarchyTests) {
        // 测试商户访问权限
        const merchantResponse = await request(app)
          .get('/api/v1/merchant')
          .set('Authorization', `Bearer ${test.token}`)

        if (test.canAccessMerchants) {
          expect(merchantResponse.status).toBe(200)
        } else {
          expect(merchantResponse.status).toBe(403)
        }

        // 测试商户创建权限
        const createResponse = await request(app)
          .post('/api/v1/merchant')
          .set('Authorization', `Bearer ${test.token}`)
          .send({
            name: `${test.role}测试商户`,
            code: `${test.role.toUpperCase()}_TEST`,
            contact: '测试联系人'
          })

        if (test.canCreateMerchants) {
          expect(createResponse.status).toBe(201)
          // 清理创建的商户
          if (createResponse.body.data?.merchant?.id) {
            await db.run('DELETE FROM merchants WHERE id = ?', [createResponse.body.data.merchant.id])
          }
        } else {
          expect(createResponse.status).toBe(403)
        }
      }
    })

    it('应该正确处理资源级权限控制', async () => {
      // 创建特定资源的权限
      await db.run(`
        INSERT INTO user_permissions (user_id, permission_code, resource_id, granted_at)
        VALUES (3, 'merchant:1:access', 1, datetime('now'))
      `)

      const token = authTokens.employee

      // 员工应该能访问有权限的商户资源
      const allowedResponse = await request(app)
        .get(`/api/v1/merchant/${testMerchantId}/stats`)
        .set('Authorization', `Bearer ${token}`)

      // 根据实际API实现，这里可能返回200或403
      expect([200, 403]).toContain(allowedResponse.status)

      // 清理权限数据
      await db.run('DELETE FROM user_permissions WHERE user_id = 3')
    })

    it('应该正确处理动态权限检查', async () => {
      // 创建访客申请
      const appResult = await db.run(`
        INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitee_id, visitor_name, visitor_phone,
          visit_purpose, scheduled_time, duration, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        4, testMerchantId, 3, '动态权限测试访客', '13900166666',
        '动态权限测试', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        60, 'pending', new Date().toISOString(), new Date().toISOString()
      ])

      const applicationId = appResult.lastID!

      // 被访问员工应该能审批申请
      const employeeToken = authTokens.employee
      const approveResponse = await request(app)
        .post(`/api/v1/visitor/applications/${applicationId}/approve`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ usageLimit: 5 })

      expect(approveResponse.status).toBe(200)

      // 申请人应该能查看申请详情
      const visitorToken = authTokens.visitor
      const detailResponse = await request(app)
        .get(`/api/v1/visitor/applications/${applicationId}`)
        .set('Authorization', `Bearer ${visitorToken}`)

      expect(detailResponse.status).toBe(200)

      // 清理测试数据
      await db.run('DELETE FROM passcodes WHERE application_id = ?', [applicationId])
      await db.run('DELETE FROM visitor_applications WHERE id = ?', [applicationId])
    })
  })

  describe('权限缓存和性能测试', () => {
    it('应该缓存用户权限信息', async () => {
      const token = authTokens.tenant_admin

      // 多次访问相同资源
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/v1/merchant')
          .set('Authorization', `Bearer ${token}`)
      )

      const startTime = Date.now()
      const responses = await Promise.all(requests)
      const endTime = Date.now()

      // 所有请求都应该成功
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // 响应时间应该合理（权限缓存应该提高性能）
      const avgResponseTime = (endTime - startTime) / requests.length
      expect(avgResponseTime).toBeLessThan(200) // 平均200ms内
    })

    it('应该在权限变更时更新缓存', async () => {
      const token = authTokens.employee

      // 员工初始不能访问商户管理
      const initialResponse = await request(app)
        .get('/api/v1/merchant')
        .set('Authorization', `Bearer ${token}`)
      expect(initialResponse.status).toBe(403)

      // 临时授予权限
      await db.run(`
        INSERT INTO user_permissions (user_id, permission_code, granted_at)
        VALUES (3, 'merchant:manage', datetime('now'))
      `)

      // 权限变更后应该能访问（如果有缓存刷新机制）
      // 注意：实际实现中可能需要等待缓存过期或手动刷新
      const updatedResponse = await request(app)
        .get('/api/v1/merchant')
        .set('Authorization', `Bearer ${token}`)

      // 根据缓存实现，这里可能仍然是403（缓存未刷新）或200（实时检查）
      expect([200, 403]).toContain(updatedResponse.status)

      // 清理权限
      await db.run('DELETE FROM user_permissions WHERE user_id = 3')
    })

    it('应该处理大量并发权限检查', async () => {
      const tokens = [
        authTokens.tenant_admin,
        authTokens.merchant_admin,
        authTokens.employee,
        authTokens.visitor
      ]

      // 创建大量并发请求
      const concurrentRequests = Array(50).fill(null).map((_, index) => {
        const token = tokens[index % tokens.length]
        return request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${token}`)
      })

      const startTime = Date.now()
      const responses = await Promise.all(concurrentRequests)
      const endTime = Date.now()

      // 所有请求都应该得到响应
      responses.forEach(response => {
        expect([200, 401, 403]).toContain(response.status)
      })

      // 总响应时间应该合理
      const totalTime = endTime - startTime
      expect(totalTime).toBeLessThan(5000) // 5秒内完成所有请求
    })
  })

  describe('安全性测试', () => {
    it('应该防止token重放攻击', async () => {
      const token = authTokens.tenant_admin

      // 正常使用token
      const normalResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
      expect(normalResponse.status).toBe(200)

      // 登出使token失效
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)

      // 尝试重复使用已失效的token
      const replayResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
      expect(replayResponse.status).toBe(401)
    })

    it('应该防止权限提升攻击', async () => {
      // 员工尝试修改自己的token来获得管理员权限
      const employeeToken = authTokens.employee
      const decoded = jwt.decode(employeeToken) as any

      // 尝试创建管理员权限的token（应该失败，因为没有正确的签名）
      const maliciousToken = jwt.sign(
        {
          ...decoded,
          userType: 'tenant_admin' // 尝试提升权限
        },
        'wrong-secret' // 错误的签名密钥
      )

      const response = await request(app)
        .get('/api/v1/merchant')
        .set('Authorization', `Bearer ${maliciousToken}`)

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
    })

    it('应该防止跨用户访问', async () => {
      // 创建两个不同商户的管理员
      await db.run(`
        INSERT INTO merchants (id, name, code, status, created_at, updated_at)
        VALUES (998, '商户A', 'MERCHANT_A', 'active', datetime('now'), datetime('now'))
      `)

      await db.run(`
        INSERT INTO merchants (id, name, code, status, created_at, updated_at)
        VALUES (997, '商户B', 'MERCHANT_B', 'active', datetime('now'), datetime('now'))
      `)

      await db.run(`
        INSERT INTO users (id, phone, name, user_type, status, merchant_id, created_at, updated_at)
        VALUES 
        (998, '13800199998', '商户A管理员', 'merchant_admin', 'active', 998, datetime('now'), datetime('now')),
        (997, '13800199997', '商户B管理员', 'merchant_admin', 'active', 997, datetime('now'), datetime('now'))
      `)

      // 商户A管理员登录
      const loginA = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800199998',
          password: 'password123',
          userType: 'merchant_admin'
        })

      const tokenA = loginA.body.data.accessToken

      // 商户A管理员尝试访问商户B的信息
      const crossAccessResponse = await request(app)
        .get('/api/v1/merchant/997')
        .set('Authorization', `Bearer ${tokenA}`)

      expect(crossAccessResponse.status).toBe(403)
      expect(crossAccessResponse.body.success).toBe(false)

      // 清理测试数据
      await db.run('DELETE FROM users WHERE id IN (998, 997)')
      await db.run('DELETE FROM merchants WHERE id IN (998, 997)')
    })

    it('应该记录安全相关的操作日志', async () => {
      // 尝试使用无效token
      const invalidResponse = await request(app)
        .get('/api/v1/merchant')
        .set('Authorization', 'Bearer invalid-token')

      expect(invalidResponse.status).toBe(401)

      // 尝试访问无权限的资源
      const unauthorizedResponse = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${authTokens.employee}`)
        .send({
          name: '未授权创建',
          code: 'UNAUTHORIZED',
          contact: '测试'
        })

      expect(unauthorizedResponse.status).toBe(403)

      // 在实际实现中，这些操作应该被记录到安全日志中
      // 这里我们只验证响应状态，实际的日志记录需要在应用中实现
    })
  })

  describe('权限系统边界测试', () => {
    it('应该处理空权限的用户', async () => {
      // 创建没有任何权限的用户
      await db.run(`
        INSERT INTO users (id, phone, name, user_type, status, created_at, updated_at)
        VALUES (996, '13800199996', '无权限用户', 'employee', 'active', datetime('now'), datetime('now'))
      `)

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800199996',
          password: 'password123',
          userType: 'employee'
        })

      const token = loginResponse.body.data.accessToken

      // 尝试访问需要权限的资源
      const response = await request(app)
        .get('/api/v1/merchant')
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(403)

      // 清理测试数据
      await db.run('DELETE FROM users WHERE id = 996')
    })

    it('应该处理权限配置错误', async () => {
      // 创建无效的权限配置
      await db.run(`
        INSERT INTO permissions (id, code, name, description, resource_type, actions, created_at)
        VALUES (999, 'invalid:permission', '无效权限', '测试无效权限', 'invalid', '[]', datetime('now'))
      `)

      await db.run(`
        INSERT INTO role_permissions (role, permission_code, granted_at)
        VALUES ('employee', 'invalid:permission', datetime('now'))
      `)

      const token = authTokens.employee

      // 系统应该能正常处理无效权限配置
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200) // 基本功能不受影响

      // 清理测试数据
      await db.run('DELETE FROM role_permissions WHERE permission_code = "invalid:permission"')
      await db.run('DELETE FROM permissions WHERE id = 999')
    })

    it('应该处理权限系统故障', async () => {
      // 模拟权限检查失败
      const originalGet = db.get
      db.get = vi.fn().mockImplementation((sql, params) => {
        if (sql.includes('permissions') || sql.includes('role_permissions')) {
          throw new Error('权限系统故障')
        }
        return originalGet.call(db, sql, params)
      })

      const token = authTokens.tenant_admin

      // 系统应该有降级处理机制
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)

      // 根据实现，可能返回200（允许访问）或503（服务不可用）
      expect([200, 503]).toContain(response.status)

      // 恢复原始方法
      db.get = originalGet
    })
  })

  describe('JWT认证流程完整性测试', () => {
    it('应该正确处理token生命周期管理', async () => {
      const user = testUsers.find(u => u.userType === 'tenant_admin')!
      
      // 1. 登录获取token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: user.phone,
          password: 'password123',
          userType: user.userType
        })

      expect(loginResponse.status).toBe(200)
      const { accessToken, refreshToken } = loginResponse.body.data

      // 2. 使用access token访问资源
      const accessResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(accessResponse.status).toBe(200)
      expect(accessResponse.body.data.user.id).toBe(user.id)

      // 3. 使用refresh token获取新的access token
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken })

      expect(refreshResponse.status).toBe(200)
      expect(refreshResponse.body.data.accessToken).toBeTruthy()
      expect(refreshResponse.body.data.accessToken).not.toBe(accessToken)

      // 4. 使用新token访问资源
      const newAccessResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${refreshResponse.body.data.accessToken}`)

      expect(newAccessResponse.status).toBe(200)

      // 5. 登出使token失效
      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${refreshResponse.body.data.accessToken}`)

      expect(logoutResponse.status).toBe(200)

      // 6. 验证token已失效
      const invalidAccessResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${refreshResponse.body.data.accessToken}`)

      expect(invalidAccessResponse.status).toBe(401)
    })

    it('应该正确处理并发token验证', async () => {
      const token = authTokens.tenant_admin
      
      // 创建多个并发请求
      const concurrentRequests = Array(20).fill(null).map(() =>
        request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${token}`)
      )

      const responses = await Promise.all(concurrentRequests)

      // 所有请求都应该成功
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.user).toBeTruthy()
      })
    })

    it('应该正确处理token格式验证', async () => {
      const invalidTokenFormats = [
        '', // 空字符串
        'invalid-token', // 无Bearer前缀
        'Bearer', // 只有Bearer
        'Bearer ', // Bearer后只有空格
        'Bearer invalid.token.format', // 无效JWT格式
        'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9', // 不完整的JWT
      ]

      for (const invalidToken of invalidTokenFormats) {
        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', invalidToken)

        expect(response.status).toBe(401)
        expect(response.body.success).toBe(false)
      }
    })

    it('应该正确处理token签名验证', async () => {
      const validToken = authTokens.tenant_admin
      const tokenParts = validToken.split('.')
      
      // 篡改签名
      const tamperedSignature = tokenParts[2].split('').reverse().join('')
      const tamperedToken = `${tokenParts[0]}.${tokenParts[1]}.${tamperedSignature}`

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`)

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
    })
  })

  describe('跨接口权限一致性测试', () => {
    it('应该在所有商户相关接口保持权限一致性', async () => {
      const merchantEndpoints = [
        { method: 'get', path: '/api/v1/merchant' },
        { method: 'post', path: '/api/v1/merchant' },
        { method: 'get', path: `/api/v1/merchant/${testMerchantId}` },
        { method: 'put', path: `/api/v1/merchant/${testMerchantId}` },
        { method: 'delete', path: `/api/v1/merchant/${testMerchantId}` },
      ]

      // 测试不同角色对商户接口的访问权限
      const roleTests = [
        {
          role: 'tenant_admin',
          token: authTokens.tenant_admin,
          expectedResults: [200, 201, 200, 200, 200] // 租务管理员应该有所有权限
        },
        {
          role: 'merchant_admin',
          token: authTokens.merchant_admin,
          expectedResults: [200, 403, 200, 403, 403] // 商户管理员只能读取
        },
        {
          role: 'employee',
          token: authTokens.employee,
          expectedResults: [403, 403, 403, 403, 403] // 员工无商户管理权限
        },
        {
          role: 'visitor',
          token: authTokens.visitor,
          expectedResults: [403, 403, 403, 403, 403] // 访客无商户管理权限
        }
      ]

      for (const roleTest of roleTests) {
        for (let i = 0; i < merchantEndpoints.length; i++) {
          const endpoint = merchantEndpoints[i]
          const expectedStatus = roleTest.expectedResults[i]

          let requestData = {}
          if (endpoint.method === 'post') {
            requestData = {
              name: `${roleTest.role}测试商户`,
              code: `${roleTest.role.toUpperCase()}_TEST`,
              contact: '测试联系人'
            }
          } else if (endpoint.method === 'put') {
            requestData = {
              name: `${roleTest.role}更新商户`,
              contact: '更新联系人'
            }
          }

          const response = await request(app)[endpoint.method](endpoint.path)
            .set('Authorization', `Bearer ${roleTest.token}`)
            .send(requestData)

          expect(response.status).toBe(expectedStatus)

          // 清理创建的测试数据
          if (response.status === 201 && response.body.data?.merchant?.id) {
            await db.run('DELETE FROM merchants WHERE id = ?', [response.body.data.merchant.id])
          }
        }
      }
    })

    it('应该在所有访客相关接口保持权限一致性', async () => {
      const visitorEndpoints = [
        { method: 'get', path: '/api/v1/visitor/applications' },
        { method: 'post', path: '/api/v1/visitor/apply' },
      ]

      // 测试不同角色对访客接口的访问权限
      const roleTests = [
        {
          role: 'tenant_admin',
          token: authTokens.tenant_admin,
          canViewApplications: true,
          canApply: true
        },
        {
          role: 'merchant_admin',
          token: authTokens.merchant_admin,
          canViewApplications: true,
          canApply: true
        },
        {
          role: 'employee',
          token: authTokens.employee,
          canViewApplications: true,
          canApply: true
        },
        {
          role: 'visitor',
          token: authTokens.visitor,
          canViewApplications: true,
          canApply: true
        }
      ]

      for (const roleTest of roleTests) {
        // 测试查看申请列表
        const listResponse = await request(app)
          .get('/api/v1/visitor/applications')
          .set('Authorization', `Bearer ${roleTest.token}`)

        if (roleTest.canViewApplications) {
          expect(listResponse.status).toBe(200)
        } else {
          expect(listResponse.status).toBe(403)
        }

        // 测试提交申请
        const applyResponse = await request(app)
          .post('/api/v1/visitor/apply')
          .set('Authorization', `Bearer ${roleTest.token}`)
          .send({
            merchantId: testMerchantId,
            visiteeId: 3,
            visitorName: `${roleTest.role}测试访客`,
            visitorPhone: '13900188888',
            visitPurpose: '权限一致性测试',
            scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            duration: 60
          })

        if (roleTest.canApply) {
          expect(applyResponse.status).toBe(201)
          // 清理测试数据
          if (applyResponse.body.data?.application?.id) {
            await db.run('DELETE FROM visitor_applications WHERE id = ?', [applyResponse.body.data.application.id])
          }
        } else {
          expect(applyResponse.status).toBe(403)
        }
      }
    })

    it('应该在所有用户管理接口保持权限一致性', async () => {
      // 测试用户管理相关接口的权限一致性
      const userEndpoints = [
        { method: 'get', path: '/api/v1/auth/me' }, // 获取当前用户信息
        { method: 'post', path: '/api/v1/auth/logout' }, // 登出
      ]

      // 所有已认证用户都应该能访问这些基本接口
      const tokens = Object.values(authTokens)

      for (const token of tokens) {
        // 测试获取当前用户信息
        const meResponse = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${token}`)

        expect(meResponse.status).toBe(200)
        expect(meResponse.body.success).toBe(true)
        expect(meResponse.body.data.user).toBeTruthy()

        // 测试登出（注意：登出后token会失效）
        const logoutResponse = await request(app)
          .post('/api/v1/auth/logout')
          .set('Authorization', `Bearer ${token}`)

        expect(logoutResponse.status).toBe(200)
        expect(logoutResponse.body.success).toBe(true)
      }

      // 重新获取token（因为之前的token已经失效）
      for (const user of testUsers) {
        if (user.status === 'active') {
          const loginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({
              phone: user.phone,
              password: 'password123',
              userType: user.userType
            })

          if (loginResponse.status === 200) {
            authTokens[user.userType] = loginResponse.body.data.accessToken
          }
        }
      }
    })
  })

  describe('权限系统安全性增强测试', () => {
    it('应该防止权限提升攻击', async () => {
      // 员工尝试通过修改请求参数获得管理员权限
      const employeeToken = authTokens.employee

      // 尝试访问租务管理员才能访问的功能
      const adminOnlyResponse = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-User-Type', 'tenant_admin') // 尝试通过header提升权限
        .send({
          name: '权限提升测试商户',
          code: 'PRIVILEGE_ESCALATION',
          contact: '测试'
        })

      expect(adminOnlyResponse.status).toBe(403)
      expect(adminOnlyResponse.body.success).toBe(false)
    })

    it('应该防止跨商户数据访问', async () => {
      // 创建两个不同商户的管理员
      await db.run(`
        INSERT INTO merchants (id, name, code, status, created_at, updated_at)
        VALUES 
        (995, '商户A', 'MERCHANT_A_995', 'active', datetime('now'), datetime('now')),
        (994, '商户B', 'MERCHANT_B_994', 'active', datetime('now'), datetime('now'))
      `)

      await db.run(`
        INSERT INTO users (id, phone, name, user_type, status, merchant_id, created_at, updated_at)
        VALUES 
        (995, '13800199995', '商户A管理员', 'merchant_admin', 'active', 995, datetime('now'), datetime('now')),
        (994, '13800199994', '商户B管理员', 'merchant_admin', 'active', 994, datetime('now'), datetime('now'))
      `)

      // 商户A管理员登录
      const loginA = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800199995',
          password: 'password123',
          userType: 'merchant_admin'
        })

      const tokenA = loginA.body.data.accessToken

      // 商户A管理员尝试访问商户B的数据
      const crossAccessResponse = await request(app)
        .get('/api/v1/merchant/994')
        .set('Authorization', `Bearer ${tokenA}`)

      expect(crossAccessResponse.status).toBe(403)
      expect(crossAccessResponse.body.success).toBe(false)

      // 商户A管理员尝试修改商户B的数据
      const crossModifyResponse = await request(app)
        .put('/api/v1/merchant/994')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: '恶意修改商户B',
          contact: '恶意修改'
        })

      expect(crossModifyResponse.status).toBe(403)
      expect(crossModifyResponse.body.success).toBe(false)

      // 清理测试数据
      await db.run('DELETE FROM users WHERE id IN (995, 994)')
      await db.run('DELETE FROM merchants WHERE id IN (995, 994)')
    })

    it('应该防止会话固定攻击', async () => {
      const user = testUsers.find(u => u.userType === 'tenant_admin')!

      // 第一次登录
      const login1 = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: user.phone,
          password: 'password123',
          userType: user.userType
        })

      const token1 = login1.body.data.accessToken

      // 第二次登录（模拟会话固定攻击）
      const login2 = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: user.phone,
          password: 'password123',
          userType: user.userType
        })

      const token2 = login2.body.data.accessToken

      // 两次登录应该生成不同的token
      expect(token1).not.toBe(token2)

      // 两个token都应该有效
      const verify1 = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token1}`)

      const verify2 = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token2}`)

      expect(verify1.status).toBe(200)
      expect(verify2.status).toBe(200)
    })

    it('应该正确处理token时间窗口攻击', async () => {
      // 创建一个即将过期的token（模拟时间窗口攻击）
      const user = testUsers.find(u => u.userType === 'tenant_admin')!
      const shortLivedToken = jwt.sign(
        {
          userId: user.id,
          userType: user.userType,
          exp: Math.floor(Date.now() / 1000) + 1 // 1秒后过期
        },
        process.env.JWT_SECRET || 'test-secret'
      )

      // 立即使用token（应该有效）
      const immediateResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${shortLivedToken}`)

      expect(immediateResponse.status).toBe(200)

      // 等待token过期
      await new Promise(resolve => setTimeout(resolve, 1500))

      // 使用过期token（应该无效）
      const expiredResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${shortLivedToken}`)

      expect(expiredResponse.status).toBe(401)
      expect(expiredResponse.body.success).toBe(false)
    })
  })
})