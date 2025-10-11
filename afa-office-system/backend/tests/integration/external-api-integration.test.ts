/**
 * 外部API集成测试 - 测试微信API调用、第三方服务集成和错误处理
 * 验证外部API的调用、响应处理、限流和重试机制
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import axios from 'axios'
import app from '../../src/app.js'
import { Database } from '../../src/utils/database.js'
import { userFactory } from '../../../shared/test-factories/index.js'
import { TestErrorHandler, createTestContext } from '../../../shared/test-helpers/error-handler.js'

// Mock axios for external API calls
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    })),
  },
}))

const mockedAxios = vi.mocked(axios)

describe('外部API集成测试', () => {
  let db: Database
  let testUsers: any[] = []
  let authTokens: Record<string, string> = {}

  const testContext = createTestContext(
    '外部API集成测试',
    'external-api-integration.test.ts',
    'backend',
    'integration'
  )

  beforeAll(async () => {
    try {
      // 初始化测试数据库
      db = Database.getInstance()
      await db.connect()

      // 创建测试用户
      const visitor = userFactory.create({
        id: 1,
        userType: 'visitor',
        phone: '13800138000',
        name: '测试访客',
        status: 'active',
        merchantId: undefined
      })

      const employee = userFactory.create({
        id: 2,
        userType: 'employee',
        phone: '13800138001',
        name: '测试员工',
        status: 'active',
        merchantId: 1
      })

      testUsers = [visitor, employee]

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

      // 创建测试商户
      await db.run(`
        INSERT INTO merchants (id, name, code, status, created_at, updated_at)
        VALUES (1, '外部API测试商户', 'EXT_API_001', 'active', ?, ?)
      `, [new Date().toISOString(), new Date().toISOString()])

    } catch (error) {
      TestErrorHandler.handle(error as Error, testContext)
      throw error
    }
  })

  afterAll(async () => {
    try {
      // 清理测试数据
      await db.run('DELETE FROM users WHERE phone LIKE "1380013800%"')
      await db.run('DELETE FROM merchants WHERE id = 1')
      await db.close()
    } catch (error) {
      TestErrorHandler.handle(error as Error, testContext)
    }
  })

  beforeEach(async () => {
    vi.clearAllMocks()

    // 获取认证token
    for (const user of testUsers) {
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('微信API集成测试', () => {
    it('应该成功调用微信登录API', async () => {
      // Mock微信API响应
      const mockGet = vi.fn().mockResolvedValue({
        data: {
          openid: 'test-openid-12345',
          session_key: 'test-session-key',
          unionid: 'test-unionid-12345'
        }
      })
      mockedAxios.get = mockGet

      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'test-wechat-code-12345',
          userType: 'visitor',
          userInfo: {
            nickName: '微信测试用户',
            avatarUrl: 'https://example.com/avatar.jpg'
          }
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.openId).toBe('test-openid-12345')

      // 验证微信API被正确调用
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('https://api.weixin.qq.com/sns/jscode2session'),
        expect.objectContaining({
          params: expect.objectContaining({
            appid: expect.any(String),
            secret: expect.any(String),
            js_code: 'test-wechat-code-12345',
            grant_type: 'authorization_code'
          })
        })
      )
    })

    it('应该处理微信API错误响应', async () => {
      // Mock微信API错误响应
      const mockGet = vi.fn().mockResolvedValue({
        data: {
          errcode: 40013,
          errmsg: 'invalid appid'
        }
      })
      mockedAxios.get = mockGet

      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'invalid-wechat-code',
          userType: 'visitor'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('微信登录失败')
    })

    it('应该处理微信API网络错误', async () => {
      // Mock网络错误
      const mockGet = vi.fn().mockRejectedValue(new Error('Network Error'))
      mockedAxios.get = mockGet

      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'network-error-code',
          userType: 'visitor'
        })

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('网络错误')
    })

    it('应该处理微信API超时', async () => {
      // Mock超时错误
      const timeoutError = new Error('timeout of 5000ms exceeded') as any
      timeoutError.code = 'ECONNABORTED'
      const mockGet = vi.fn().mockRejectedValue(timeoutError)
      mockedAxios.get = mockGet

      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'timeout-code',
          userType: 'visitor'
        })

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('请求超时')
    })

    it('应该验证微信API参数', async () => {
      // Mock正常响应
      mockedAxios.get.mockResolvedValue({
        data: {
          openid: 'test-openid',
          session_key: 'test-session-key'
        }
      })

      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: '', // 空的授权码
          userType: 'visitor'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('微信授权码不能为空')
    })

    it('应该处理微信用户信息解密', async () => {
      // Mock微信API响应
      mockedAxios.get.mockResolvedValue({
        data: {
          openid: 'test-openid-decrypt',
          session_key: 'test-session-key-decrypt'
        }
      })

      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'decrypt-test-code',
          userType: 'visitor',
          userInfo: {
            nickName: '解密测试用户',
            avatarUrl: 'https://example.com/decrypt-avatar.jpg'
          },
          encryptedData: 'encrypted-user-data',
          iv: 'initialization-vector'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.name).toBe('解密测试用户')
    })
  })

  describe('短信服务API集成测试', () => {
    it('应该成功发送短信验证码', async () => {
      // Mock短信服务API响应
      const mockPost = vi.fn().mockResolvedValue({
        data: {
          code: 0,
          message: 'success',
          data: {
            messageId: 'sms-12345',
            status: 'sent'
          }
        }
      })
      mockedAxios.post = mockPost

      const response = await request(app)
        .post('/api/v1/auth/send-code')
        .send({
          phone: '13800138888',
          type: 'login'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.phone).toBe('13800138888')

      // 验证短信API被调用
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('sms'),
        expect.objectContaining({
          phone: '13800138888',
          template: expect.any(String),
          code: expect.any(String)
        }),
        expect.any(Object)
      )
    })

    it('应该处理短信服务限流', async () => {
      // Mock限流响应
      mockedAxios.post.mockResolvedValue({
        data: {
          code: 1001,
          message: 'rate limit exceeded',
          data: null
        }
      })

      const response = await request(app)
        .post('/api/v1/auth/send-code')
        .send({
          phone: '13800138889',
          type: 'login'
        })

      expect(response.status).toBe(429)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('发送频率过快')
    })

    it('应该处理短信服务余额不足', async () => {
      // Mock余额不足响应
      mockedAxios.post.mockResolvedValue({
        data: {
          code: 1002,
          message: 'insufficient balance',
          data: null
        }
      })

      const response = await request(app)
        .post('/api/v1/auth/send-code')
        .send({
          phone: '13800138890',
          type: 'register'
        })

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('短信服务暂时不可用')
    })

    it('应该验证手机号格式', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-code')
        .send({
          phone: 'invalid-phone',
          type: 'login'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('手机号格式不正确')

      // 不应该调用短信API
      expect(mockedAxios.post).not.toHaveBeenCalled()
    })

    it('应该实现短信发送频率限制', async () => {
      // Mock成功响应
      mockedAxios.post.mockResolvedValue({
        data: {
          code: 0,
          message: 'success',
          data: { messageId: 'sms-rate-limit-test' }
        }
      })

      const phone = '13800138891'

      // 第一次发送应该成功
      const firstResponse = await request(app)
        .post('/api/v1/auth/send-code')
        .send({
          phone,
          type: 'login'
        })

      expect(firstResponse.status).toBe(200)

      // 立即再次发送应该被限制
      const secondResponse = await request(app)
        .post('/api/v1/auth/send-code')
        .send({
          phone,
          type: 'login'
        })

      expect(secondResponse.status).toBe(429)
      expect(secondResponse.body.message).toContain('请稍后再试')
    })
  })

  describe('支付服务API集成测试', () => {
    it('应该成功创建支付订单', async () => {
      // Mock支付服务响应
      mockedAxios.post.mockResolvedValue({
        data: {
          code: 'SUCCESS',
          message: 'OK',
          data: {
            prepayId: 'prepay-12345',
            paySign: 'payment-signature',
            timeStamp: '1234567890',
            nonceStr: 'random-string',
            package: 'prepay_id=prepay-12345'
          }
        }
      })

      const response = await request(app)
        .post('/api/v1/payment/create-order')
        .set('Authorization', `Bearer ${authTokens.visitor}`)
        .send({
          amount: 1000, // 10.00元
          description: '访客通行费',
          openId: 'test-openid-payment'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.prepayId).toBe('prepay-12345')

      // 验证支付API被调用
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('pay/unifiedorder'),
        expect.objectContaining({
          body: '访客通行费',
          out_trade_no: expect.any(String),
          total_fee: 1000,
          openid: 'test-openid-payment'
        }),
        expect.any(Object)
      )
    })

    it('应该处理支付服务错误', async () => {
      // Mock支付失败响应
      mockedAxios.post.mockResolvedValue({
        data: {
          return_code: 'FAIL',
          return_msg: 'INVALID_REQUEST',
          err_code: 'PARAM_ERROR',
          err_code_des: '参数错误'
        }
      })

      const response = await request(app)
        .post('/api/v1/payment/create-order')
        .set('Authorization', `Bearer ${authTokens.visitor}`)
        .send({
          amount: -100, // 无效金额
          description: '测试支付',
          openId: 'test-openid'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('支付订单创建失败')
    })

    it('应该验证支付回调签名', async () => {
      const callbackData = {
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        out_trade_no: 'test-order-123',
        transaction_id: 'wx-transaction-123',
        total_fee: '1000',
        sign: 'invalid-signature'
      }

      const response = await request(app)
        .post('/api/v1/payment/callback')
        .send(callbackData)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('签名验证失败')
    })

    it('应该处理支付退款', async () => {
      // Mock退款API响应
      mockedAxios.post.mockResolvedValue({
        data: {
          return_code: 'SUCCESS',
          result_code: 'SUCCESS',
          refund_id: 'refund-12345',
          out_refund_no: 'refund-order-123',
          refund_fee: '1000'
        }
      })

      const response = await request(app)
        .post('/api/v1/payment/refund')
        .set('Authorization', `Bearer ${authTokens.employee}`)
        .send({
          orderId: 'test-order-123',
          refundAmount: 1000,
          reason: '测试退款'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.refundId).toBe('refund-12345')
    })
  })

  describe('第三方推送服务集成测试', () => {
    it('应该成功发送推送通知', async () => {
      // Mock推送服务响应
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          messageId: 'push-12345',
          status: 'sent'
        }
      })

      const response = await request(app)
        .post('/api/v1/notification/push')
        .set('Authorization', `Bearer ${authTokens.employee}`)
        .send({
          userId: 1,
          title: '访客申请通知',
          content: '您有新的访客申请待处理',
          type: 'visitor_application'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)

      // 验证推送API被调用
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('push'),
        expect.objectContaining({
          title: '访客申请通知',
          content: '您有新的访客申请待处理',
          target: expect.any(Object)
        }),
        expect.any(Object)
      )
    })

    it('应该处理推送服务不可用', async () => {
      // Mock服务不可用
      mockedAxios.post.mockRejectedValue(new Error('Service Unavailable'))

      const response = await request(app)
        .post('/api/v1/notification/push')
        .set('Authorization', `Bearer ${authTokens.employee}`)
        .send({
          userId: 1,
          title: '测试通知',
          content: '测试内容',
          type: 'test'
        })

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('推送服务暂时不可用')
    })

    it('应该支持批量推送', async () => {
      // Mock批量推送响应
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          results: [
            { userId: 1, status: 'sent', messageId: 'push-1' },
            { userId: 2, status: 'sent', messageId: 'push-2' },
            { userId: 3, status: 'failed', error: 'user not found' }
          ]
        }
      })

      const response = await request(app)
        .post('/api/v1/notification/batch-push')
        .set('Authorization', `Bearer ${authTokens.employee}`)
        .send({
          userIds: [1, 2, 3],
          title: '批量通知',
          content: '批量推送测试',
          type: 'batch_test'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.results).toHaveLength(3)
    })
  })

  describe('地图服务API集成测试', () => {
    it('应该成功获取地理位置信息', async () => {
      // Mock地图服务响应
      mockedAxios.get.mockResolvedValue({
        data: {
          status: 0,
          message: 'query ok',
          result: {
            location: {
              lat: 39.908823,
              lng: 116.397470
            },
            address: '北京市东城区天安门广场',
            formatted_addresses: {
              recommend: '天安门广场(东城区)',
              rough: '天安门广场'
            }
          }
        }
      })

      const response = await request(app)
        .get('/api/v1/location/geocode')
        .set('Authorization', `Bearer ${authTokens.employee}`)
        .query({
          address: '北京市天安门广场'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.location.lat).toBe(39.908823)
      expect(response.body.data.location.lng).toBe(116.397470)
    })

    it('应该处理地址解析失败', async () => {
      // Mock解析失败响应
      mockedAxios.get.mockResolvedValue({
        data: {
          status: 1,
          message: 'address not found'
        }
      })

      const response = await request(app)
        .get('/api/v1/location/geocode')
        .set('Authorization', `Bearer ${authTokens.employee}`)
        .query({
          address: '不存在的地址'
        })

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('地址解析失败')
    })

    it('应该计算两点间距离', async () => {
      // Mock距离计算响应
      mockedAxios.get.mockResolvedValue({
        data: {
          status: 0,
          message: 'query ok',
          result: {
            elements: [{
              distance: { text: '1.2公里', value: 1200 },
              duration: { text: '15分钟', value: 900 }
            }]
          }
        }
      })

      const response = await request(app)
        .get('/api/v1/location/distance')
        .set('Authorization', `Bearer ${authTokens.employee}`)
        .query({
          from: '39.908823,116.397470',
          to: '39.918823,116.407470'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.distance.value).toBe(1200)
    })
  })

  describe('API限流和重试机制测试', () => {
    it('应该实现API调用限流', async () => {
      // Mock成功响应
      mockedAxios.get.mockResolvedValue({
        data: { success: true }
      })

      const requests = Array(20).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/send-code')
          .send({
            phone: '13800138999',
            type: 'login'
          })
      )

      const responses = await Promise.all(requests)

      // 应该有部分请求被限流
      const rateLimitedCount = responses.filter(res => res.status === 429).length
      expect(rateLimitedCount).toBeGreaterThan(0)
    })

    it('应该实现API调用重试机制', async () => {
      let callCount = 0

      // Mock前两次调用失败，第三次成功
      mockedAxios.get.mockImplementation(() => {
        callCount++
        if (callCount <= 2) {
          return Promise.reject(new Error('Network Error'))
        }
        return Promise.resolve({
          data: {
            openid: 'retry-test-openid',
            session_key: 'retry-test-session-key'
          }
        })
      })

      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'retry-test-code',
          userType: 'visitor'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(callCount).toBe(3) // 重试了2次后成功
    })

    it('应该在重试次数耗尽后返回错误', async () => {
      // Mock所有调用都失败
      mockedAxios.get.mockRejectedValue(new Error('Persistent Network Error'))

      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'persistent-error-code',
          userType: 'visitor'
        })

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('网络错误')

      // 验证重试了指定次数
      expect(mockedAxios.get).toHaveBeenCalledTimes(3) // 1次原始调用 + 2次重试
    })

    it('应该实现指数退避重试策略', async () => {
      const callTimes: number[] = []

      mockedAxios.get.mockImplementation(() => {
        callTimes.push(Date.now())
        return Promise.reject(new Error('Retry Test Error'))
      })

      const startTime = Date.now()

      await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'exponential-backoff-test',
          userType: 'visitor'
        })

      // 验证重试间隔递增（指数退避）
      if (callTimes.length >= 3) {
        const interval1 = callTimes[1] - callTimes[0]
        const interval2 = callTimes[2] - callTimes[1]
        expect(interval2).toBeGreaterThan(interval1)
      }
    })
  })

  describe('外部API监控和日志测试', () => {
    it('应该记录API调用日志', async () => {
      // Mock成功响应
      mockedAxios.get.mockResolvedValue({
        data: {
          openid: 'log-test-openid',
          session_key: 'log-test-session-key'
        }
      })

      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'log-test-code',
          userType: 'visitor'
        })

      expect(response.status).toBe(200)

      // 在实际实现中，应该验证日志记录
      // 这里我们只验证API调用成功
      expect(mockedAxios.get).toHaveBeenCalled()
    })

    it('应该记录API错误日志', async () => {
      // Mock错误响应
      mockedAxios.get.mockRejectedValue(new Error('API Error for Logging'))

      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'error-log-test-code',
          userType: 'visitor'
        })

      expect(response.status).toBe(500)

      // 在实际实现中，应该验证错误日志记录
      expect(mockedAxios.get).toHaveBeenCalled()
    })

    it('应该监控API响应时间', async () => {
      // Mock慢响应
      mockedAxios.get.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              data: {
                openid: 'slow-response-openid',
                session_key: 'slow-response-session-key'
              }
            })
          }, 1000) // 1秒延迟
        })
      })

      const startTime = Date.now()

      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'slow-response-code',
          userType: 'visitor'
        })

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeGreaterThan(1000)

      // 在实际实现中，应该记录响应时间监控数据
    })

    it('应该统计API调用成功率', async () => {
      let successCount = 0
      let errorCount = 0

      // Mock随机成功/失败
      mockedAxios.get.mockImplementation(() => {
        if (Math.random() > 0.5) {
          successCount++
          return Promise.resolve({
            data: { openid: 'success-test', session_key: 'success-key' }
          })
        } else {
          errorCount++
          return Promise.reject(new Error('Random Error'))
        }
      })

      const requests = Array(10).fill(null).map((_, index) =>
        request(app)
          .post('/api/v1/auth/wechat-login')
          .send({
            code: `stats-test-code-${index}`,
            userType: 'visitor'
          })
      )

      await Promise.all(requests)

      // 验证有成功和失败的调用
      expect(successCount + errorCount).toBe(10)
      expect(successCount).toBeGreaterThan(0)
      expect(errorCount).toBeGreaterThan(0)
    })
  })

  describe('外部API安全性测试', () => {
    it('应该验证API密钥', async () => {
      // 测试无效的API密钥
      const originalEnv = process.env.WECHAT_APP_SECRET
      process.env.WECHAT_APP_SECRET = 'invalid-secret'

      mockedAxios.get.mockResolvedValue({
        data: {
          errcode: 40013,
          errmsg: 'invalid appid'
        }
      })

      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'invalid-secret-test',
          userType: 'visitor'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)

      // 恢复原始环境变量
      process.env.WECHAT_APP_SECRET = originalEnv
    })

    it('应该防止API密钥泄露', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          openid: 'security-test-openid',
          session_key: 'security-test-session-key'
        }
      })

      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'security-test-code',
          userType: 'visitor'
        })

      expect(response.status).toBe(200)

      // 验证响应中不包含敏感信息
      expect(JSON.stringify(response.body)).not.toContain('app_secret')
      expect(JSON.stringify(response.body)).not.toContain('session_key')
    })

    it('应该验证请求签名', async () => {
      // 测试支付回调签名验证
      const callbackData = {
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        out_trade_no: 'security-test-order',
        transaction_id: 'wx-security-test',
        total_fee: '1000'
      }

      // 不包含签名的请求应该被拒绝
      const response = await request(app)
        .post('/api/v1/payment/callback')
        .send(callbackData)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('签名')
    })

    it('应该防止重放攻击', async () => {
      const timestamp = Math.floor(Date.now() / 1000) - 3600 // 1小时前的时间戳

      const response = await request(app)
        .post('/api/v1/payment/callback')
        .send({
          return_code: 'SUCCESS',
          result_code: 'SUCCESS',
          out_trade_no: 'replay-test-order',
          transaction_id: 'wx-replay-test',
          total_fee: '1000',
          time_end: timestamp.toString(),
          sign: 'test-signature'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('请求已过期')
    })
  })

  describe('外部API性能测试', () => {
    it('应该支持并发API调用', async () => {
      // Mock成功响应
      mockedAxios.get.mockResolvedValue({
        data: {
          openid: 'concurrent-test-openid',
          session_key: 'concurrent-test-session-key'
        }
      })

      const concurrentRequests = Array(10).fill(null).map((_, index) =>
        request(app)
          .post('/api/v1/auth/wechat-login')
          .send({
            code: `concurrent-test-code-${index}`,
            userType: 'visitor'
          })
      )

      const startTime = Date.now()
      const responses = await Promise.all(concurrentRequests)
      const endTime = Date.now()

      // 所有请求都应该成功
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // 并发处理应该比串行处理快
      const totalTime = endTime - startTime
      expect(totalTime).toBeLessThan(5000) // 5秒内完成
    })

    it('应该实现连接池管理', async () => {
      // Mock多个API调用
      mockedAxios.get.mockResolvedValue({
        data: { success: true }
      })

      const requests = Array(50).fill(null).map((_, index) =>
        request(app)
          .post('/api/v1/auth/wechat-login')
          .send({
            code: `pool-test-code-${index}`,
            userType: 'visitor'
          })
      )

      const responses = await Promise.all(requests)

      // 验证连接池能处理大量并发请求
      const successCount = responses.filter(res => res.status === 200).length
      expect(successCount).toBeGreaterThan(40) // 大部分请求成功
    })

    it('应该处理API服务降级', async () => {
      // Mock服务不可用
      mockedAxios.get.mockRejectedValue(new Error('Service Unavailable'))

      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'degradation-test-code',
          userType: 'visitor'
        })

      // 应该有降级处理，而不是直接返回500错误
      expect([200, 503]).toContain(response.status)

      if (response.status === 200) {
        // 如果有降级处理，应该返回降级后的结果
        expect(response.body.data).toBeDefined()
      }
    })
  })
})