/**
 * 认证API集成测试 - 完整登录登出流程测试
 * 测试认证API的完整功能，包括登录、登出、token验证等
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import { app } from '../../src/app.js'
import { Database } from '../../src/utils/database.js'
import { userFactory } from '../../../shared/test-factories/index.js'
import { TestErrorHandler, createTestContext } from '../../../shared/test-helpers/error-handler.js'

describe('认证API集成测试', () => {
  let db: Database
  let testUsers: any[] = []
  let authTokens: Record<string, string> = {}

  const testContext = createTestContext(
    '认证API集成测试',
    'api-auth-integration.test.ts',
    'backend',
    'integration'
  )

  beforeAll(async () => {
    try {
      // 初始化测试数据库
      db = Database.getInstance()
      await db.init()

      // 创建测试用户数据
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

      const visitor = userFactory.create({
        userType: 'visitor',
        phone: '13800138003',
        name: '访客用户',
        status: 'active',
        merchantId: undefined
      })

      testUsers = [tenantAdmin, merchantAdmin, employee, visitor]

      // 插入测试用户到数据库
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
      await db.run(`
        INSERT INTO merchants (id, name, code, status, created_at, updated_at)
        VALUES (1, '测试商户', 'TEST001', 'active', datetime('now'), datetime('now'))
      `)

    } catch (error) {
      TestErrorHandler.handle(error as Error, testContext)
      throw error
    }
  })

  afterAll(async () => {
    try {
      // 清理测试数据
      await db.run('DELETE FROM users WHERE phone LIKE "1380013800%"')
      await db.run('DELETE FROM merchants WHERE code = "TEST001"')
      await db.close()
    } catch (error) {
      TestErrorHandler.handle(error as Error, testContext)
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/v1/auth/login - 用户登录流程', () => {
    it('应该成功登录租务管理员', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138000',
          password: 'password123',
          userType: 'tenant_admin'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('user')
      expect(response.body.data).toHaveProperty('accessToken')
      expect(response.body.data).toHaveProperty('refreshToken')
      expect(response.body.data.user.userType).toBe('tenant_admin')
      expect(response.body.data.user.phone).toBe('13800138000')

      // 保存token用于后续测试
      authTokens.tenantAdmin = response.body.data.accessToken
    })

    it('应该成功登录商户管理员', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138001',
          password: 'password123',
          userType: 'merchant_admin'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.userType).toBe('merchant_admin')
      expect(response.body.data.user.merchantId).toBe(1)

      authTokens.merchantAdmin = response.body.data.accessToken
    })

    it('应该成功登录员工用户', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138002',
          password: 'password123',
          userType: 'employee'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.userType).toBe('employee')

      authTokens.employee = response.body.data.accessToken
    })

    it('应该拒绝错误的用户类型', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138000',
          password: 'password123',
          userType: 'invalid_type'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('用户类型')
    })

    it('应该拒绝不存在的用户', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '99999999999',
          password: 'password123',
          userType: 'employee'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('用户不存在')
    })

    it('应该拒绝错误的密码', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138000',
          password: 'wrong_password',
          userType: 'tenant_admin'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('密码错误')
    })

    it('应该拒绝已停用的用户', async () => {
      // 创建已停用的用户
      const inactiveUser = userFactory.create({
        phone: '13800138099',
        status: 'inactive',
        userType: 'employee'
      })

      await db.run(`
        INSERT INTO users (phone, name, user_type, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        inactiveUser.phone,
        inactiveUser.name,
        inactiveUser.userType,
        inactiveUser.status,
        inactiveUser.createdAt,
        inactiveUser.updatedAt
      ])

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138099',
          password: 'password123',
          userType: 'employee'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('用户已停用')

      // 清理测试数据
      await db.run('DELETE FROM users WHERE phone = "13800138099"')
    })
  })

  describe('POST /api/v1/auth/wechat-login - 微信登录流程', () => {
    beforeEach(() => {
      // Mock微信API响应
      const axios = require('axios')
      vi.mocked(axios.default.get).mockResolvedValue({
        data: {
          openid: 'test-openid-123',
          session_key: 'test-session-key',
          unionid: 'test-unionid-123'
        }
      })
    })

    it('应该成功处理新用户微信登录', async () => {
      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'test-wechat-code',
          userType: 'visitor',
          userInfo: {
            nickName: '微信用户',
            avatarUrl: 'https://example.com/avatar.jpg'
          }
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.user).toHaveProperty('openId')
      expect(response.body.data.user.name).toBe('微信用户')
      expect(response.body.data.user.userType).toBe('visitor')
    })

    it('应该成功处理已存在用户的微信登录', async () => {
      // 先创建一个有openId的用户
      await db.run(`
        UPDATE users SET open_id = 'test-openid-123' WHERE phone = '13800138003'
      `)

      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'test-wechat-code',
          userType: 'visitor'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.phone).toBe('13800138003')
    })

    it('应该处理微信API错误', async () => {
      const axios = require('axios')
      vi.mocked(axios.default.get).mockRejectedValue(new Error('微信API错误'))

      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'invalid-code',
          userType: 'visitor'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('微信登录失败')
    })
  })

  describe('GET /api/v1/auth/me - 获取当前用户信息', () => {
    it('应该返回租务管理员信息', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authTokens.tenantAdmin}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.userType).toBe('tenant_admin')
      expect(response.body.data.user.phone).toBe('13800138000')
    })

    it('应该返回商户管理员信息', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authTokens.merchantAdmin}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.userType).toBe('merchant_admin')
      expect(response.body.data.user.merchantId).toBe(1)
    })

    it('应该拒绝无效的token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
    })

    it('应该拒绝缺少token的请求', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/v1/auth/refresh-token - Token刷新流程', () => {
    let refreshToken: string

    beforeEach(async () => {
      // 获取刷新token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138000',
          password: 'password123',
          userType: 'tenant_admin'
        })

      refreshToken = loginResponse.body.data.refreshToken
    })

    it('应该成功刷新token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('accessToken')
      expect(response.body.data).toHaveProperty('refreshToken')
    })

    it('应该拒绝无效的刷新token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: 'invalid-refresh-token'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('应该拒绝过期的刷新token', async () => {
      // 这里需要模拟过期的token，实际实现中可能需要修改JWT配置
      const expiredToken = 'expired.refresh.token'

      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: expiredToken
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/v1/auth/verify-token - Token验证流程', () => {
    it('应该验证有效的token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-token')
        .send({
          token: authTokens.tenantAdmin
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.valid).toBe(true)
      expect(response.body.data.user).toHaveProperty('id')
    })

    it('应该拒绝无效的token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-token')
        .send({
          token: 'invalid-token'
        })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.data.valid).toBe(false)
    })

    it('应该拒绝格式错误的token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-token')
        .send({
          token: 'malformed.token'
        })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/v1/auth/logout - 用户登出流程', () => {
    it('应该成功登出用户', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authTokens.tenantAdmin}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('登出成功')
    })

    it('应该拒绝未认证的登出请求', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
    })

    it('登出后token应该失效', async () => {
      // 先登录获取新token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138002',
          password: 'password123',
          userType: 'employee'
        })

      const token = loginResponse.body.data.accessToken

      // 登出
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)

      // 验证token已失效
      const verifyResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)

      expect(verifyResponse.status).toBe(401)
    })
  })

  describe('POST /api/v1/auth/send-code - 验证码发送流程', () => {
    it('应该成功发送登录验证码', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-code')
        .send({
          phone: '13800138000',
          type: 'login'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.phone).toBe('13800138000')
      expect(response.body.data.type).toBe('login')
    })

    it('应该成功发送注册验证码', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-code')
        .send({
          phone: '13900139000',
          type: 'register'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('应该拒绝无效的手机号', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-code')
        .send({
          phone: 'invalid-phone',
          type: 'login'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('应该拒绝无效的验证码类型', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-code')
        .send({
          phone: '13800138000',
          type: 'invalid-type'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('应该限制验证码发送频率', async () => {
      // 连续发送多个验证码请求
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/send-code')
          .send({
            phone: '13800138000',
            type: 'login'
          })
      )

      const responses = await Promise.all(requests)
      
      // 检查是否有请求被限制
      const rateLimitedResponses = responses.filter(res => res.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })

  describe('完整认证流程集成测试', () => {
    it('应该完成完整的用户认证生命周期', async () => {
      // 1. 发送验证码
      const codeResponse = await request(app)
        .post('/api/v1/auth/send-code')
        .send({
          phone: '13900139001',
          type: 'register'
        })

      expect(codeResponse.status).toBe(200)

      // 2. 用户登录
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138000',
          password: 'password123',
          userType: 'tenant_admin'
        })

      expect(loginResponse.status).toBe(200)
      const { accessToken, refreshToken } = loginResponse.body.data

      // 3. 验证token
      const verifyResponse = await request(app)
        .post('/api/v1/auth/verify-token')
        .send({ token: accessToken })

      expect(verifyResponse.status).toBe(200)
      expect(verifyResponse.body.data.valid).toBe(true)

      // 4. 获取用户信息
      const meResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(meResponse.status).toBe(200)
      expect(meResponse.body.data.user.phone).toBe('13800138000')

      // 5. 刷新token
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken })

      expect(refreshResponse.status).toBe(200)
      const newAccessToken = refreshResponse.body.data.accessToken

      // 6. 使用新token访问受保护资源
      const newMeResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)

      expect(newMeResponse.status).toBe(200)

      // 7. 登出
      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${newAccessToken}`)

      expect(logoutResponse.status).toBe(200)

      // 8. 验证登出后token失效
      const finalMeResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)

      expect(finalMeResponse.status).toBe(401)
    })
  })

  describe('认证安全性测试', () => {
    it('应该防止SQL注入攻击', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: "'; DROP TABLE users; --",
          password: 'password123',
          userType: 'employee'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('应该防止XSS攻击', async () => {
      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: '<script>alert("xss")</script>',
          userType: 'visitor'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('应该限制登录尝试次数', async () => {
      // 模拟多次失败登录
      const failedAttempts = Array(6).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            phone: '13800138000',
            password: 'wrong-password',
            userType: 'tenant_admin'
          })
      )

      const responses = await Promise.all(failedAttempts)
      
      // 检查是否有请求被锁定
      const lockedResponses = responses.filter(res => 
        res.status === 429 || res.body.message?.includes('锁定')
      )
      expect(lockedResponses.length).toBeGreaterThan(0)
    })

    it('应该验证token的完整性', async () => {
      // 尝试使用篡改的token
      const tamperedToken = authTokens.tenantAdmin.slice(0, -5) + 'XXXXX'

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`)

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
    })
  })

  describe('认证错误处理测试', () => {
    it('应该处理数据库连接错误', async () => {
      // 模拟数据库错误
      const originalGet = db.get
      db.get = vi.fn().mockRejectedValue(new Error('数据库连接失败'))

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138000',
          password: 'password123',
          userType: 'tenant_admin'
        })

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)

      // 恢复原始方法
      db.get = originalGet
    })

    it('应该处理JSON格式错误', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid-json')

      expect(response.status).toBe(400)
    })

    it('应该处理超大请求体', async () => {
      const largeData = 'x'.repeat(10 * 1024 * 1024) // 10MB

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138000',
          password: largeData,
          userType: 'tenant_admin'
        })

      expect(response.status).toBe(413)
    })
  })

  describe('认证性能测试', () => {
    it('登录响应时间应该在合理范围内', async () => {
      const startTime = Date.now()

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138000',
          password: 'password123',
          userType: 'tenant_admin'
        })

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(2000) // 2秒内响应
    })

    it('应该支持并发登录请求', async () => {
      const concurrentRequests = Array(10).fill(null).map((_, index) =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            phone: `1380013800${index}`,
            password: 'password123',
            userType: 'employee'
          })
      )

      const responses = await Promise.all(concurrentRequests)
      
      // 检查所有请求都得到了响应
      responses.forEach(response => {
        expect([200, 400, 401]).toContain(response.status)
      })
    })
  })
})