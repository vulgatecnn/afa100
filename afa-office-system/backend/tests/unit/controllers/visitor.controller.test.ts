/**
 * 访客控制器单元测试
 * 测试 VisitorController 的所有接口方法
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import app from '../../../src/app.js'
import { VisitorService } from '../../../src/services/visitor.service.js'

// Mock VisitorService
vi.mock('../../../src/services/visitor.service.js')

// Mock all route dependencies to prevent initialization issues
vi.mock('../../../src/routes/v1/merchant.routes.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
}))
vi.mock('../../../src/routes/v1/auth.routes.js', () => ({
  default: { get: vi.fn(), post: vi.fn() }
}))
vi.mock('../../../src/routes/v1/space.routes.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
}))
vi.mock('../../../src/routes/v1/access.routes.js', () => ({
  default: { get: vi.fn(), post: vi.fn() }
}))
vi.mock('../../../src/routes/v1/visitor.routes.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() }
}))

// Mock database
vi.mock('../../../src/utils/database.js', () => ({
  default: {
    getInstance: vi.fn(() => ({
      get: vi.fn(),
      all: vi.fn(),
      run: vi.fn()
    })),
    isReady: vi.fn(() => true),
    connect: vi.fn(),
    close: vi.fn()
  }
}))

describe('VisitorController', () => {
  let mockVisitorService: any
  let testMerchant: any
  let testUser: any

  beforeEach(async () => {
    // 重置所有mock
    vi.clearAllMocks()
    
    // 创建mock service实例
    mockVisitorService = {
      getVisitorApplications: vi.fn(),
      getVisitorApplicationById: vi.fn(),
      approveVisitorApplication: vi.fn(),
      rejectVisitorApplication: vi.fn(),
      batchApproveApplications: vi.fn(),
      batchRejectApplications: vi.fn(),
      getVisitorStats: vi.fn(),
      getPendingApplicationsCount: vi.fn(),
      getExpiringApplications: vi.fn(),
      getMerchants: vi.fn(),
      submitApplication: vi.fn(),
      getMyApplications: vi.fn(),
      getApplicationDetail: vi.fn(),
      getPasscode: vi.fn(),
      refreshPasscode: vi.fn(),
      getVisitorPasscode: vi.fn()
    }
    
    // Mock VisitorService构造函数
    vi.mocked(VisitorService).mockImplementation(() => mockVisitorService)
    
    // 创建测试数据
    testMerchant = {
      id: 1,
      name: '测试商户',
      status: 'active',
      code: 'TEST_MERCHANT',
      contact_person: '张三',
      phone: '13800138000',
      email: 'test@merchant.com'
    }
    
    testUser = {
      id: 1,
      name: '测试用户',
      email: 'test@user.com',
      user_type: 'merchant_admin',
      merchant_id: testMerchant.id,
      status: 'active'
    }
  })

  describe('GET /api/v1/merchants/:merchantId/visitor-applications', () => {
    it('应该成功获取访客申请列表', async () => {
      const mockApplications = {
        data: [
          {
            id: 1,
            visitor_name: '张三',
            visitor_phone: '13800138000',
            merchant_id: testMerchant.id,
            status: 'pending',
            visit_purpose: '商务洽谈',
            scheduled_time: new Date().toISOString(),
            duration: 4
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      }

      mockVisitorService.getVisitorApplications.mockResolvedValue(mockApplications)

      const response = await request(app)
        .get(`/api/v1/merchants/${testMerchant.id}/visitor-applications`)
        .query({ page: 1, limit: 20 })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual(mockApplications)
      expect(mockVisitorService.getVisitorApplications).toHaveBeenCalledWith(
        testMerchant.id,
        expect.objectContaining({
          page: 1,
          limit: 20
        })
      )
    })

    it('应该处理无效的商户ID', async () => {
      const response = await request(app)
        .get('/api/v1/merchants/invalid/visitor-applications')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('商户ID无效')
    })

    it('应该处理服务层错误', async () => {
      mockVisitorService.getVisitorApplications.mockRejectedValue(
        new Error('商户不存在')
      )

      const response = await request(app)
        .get(`/api/v1/merchants/${testMerchant.id}/visitor-applications`)

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('商户不存在')
    })

    it('应该支持查询参数过滤', async () => {
      const mockApplications = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      }

      mockVisitorService.getVisitorApplications.mockResolvedValue(mockApplications)

      const response = await request(app)
        .get(`/api/v1/merchants/${testMerchant.id}/visitor-applications`)
        .query({
          status: 'pending',
          search: '张三',
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
          visiteeId: 123
        })

      expect(response.status).toBe(200)
      expect(mockVisitorService.getVisitorApplications).toHaveBeenCalledWith(
        testMerchant.id,
        expect.objectContaining({
          status: 'pending',
          search: '张三',
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
          visiteeId: 123
        })
      )
    })
  })

  describe('GET /api/v1/merchants/:merchantId/visitor-applications/:applicationId', () => {
    it('应该成功获取访客申请详情', async () => {
      const applicationId = 1
      const mockApplicationDetail = {
        application: {
          id: applicationId,
          visitor_name: '张三',
          visitor_phone: '13800138000',
          merchant_id: testMerchant.id,
          status: 'pending'
        },
        applicant: testUser,
        merchant: testMerchant
      }

      mockVisitorService.getVisitorApplicationById.mockResolvedValue(mockApplicationDetail)

      const response = await request(app)
        .get(`/api/v1/merchants/${testMerchant.id}/visitor-applications/${applicationId}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual(mockApplicationDetail)
      expect(mockVisitorService.getVisitorApplicationById).toHaveBeenCalledWith(
        testMerchant.id,
        applicationId
      )
    })

    it('应该处理无效的申请ID', async () => {
      const response = await request(app)
        .get(`/api/v1/merchants/${testMerchant.id}/visitor-applications/invalid`)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('申请ID无效')
    })

    it('应该处理申请不存在的情况', async () => {
      mockVisitorService.getVisitorApplicationById.mockRejectedValue(
        new Error('访客申请不存在')
      )

      const response = await request(app)
        .get(`/api/v1/merchants/${testMerchant.id}/visitor-applications/999`)

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('访客申请不存在')
    })
  })

  describe('POST /api/v1/merchants/:merchantId/visitor-applications/:applicationId/approve', () => {
    it('应该成功审批访客申请', async () => {
      const applicationId = 1
      const approvedApplication = {
        id: applicationId,
        visitor_name: '张三',
        status: 'approved',
        approved_by: testUser.id,
        passcode: 'ABC123DEF456'
      }

      mockVisitorService.approveVisitorApplication.mockResolvedValue(approvedApplication)

      const response = await request(app)
        .post(`/api/v1/merchants/${testMerchant.id}/visitor-applications/${applicationId}/approve`)
        .send({
          approvedBy: testUser.id,
          duration: 4,
          usageLimit: 1,
          note: '审批通过'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual(approvedApplication)
      expect(mockVisitorService.approveVisitorApplication).toHaveBeenCalledWith(
        testMerchant.id,
        applicationId,
        testUser.id,
        expect.objectContaining({
          duration: 4,
          usageLimit: 1,
          note: '审批通过'
        })
      )
    })

    it('应该验证必填参数', async () => {
      const applicationId = 1

      // 缺少审批人ID
      const response = await request(app)
        .post(`/api/v1/merchants/${testMerchant.id}/visitor-applications/${applicationId}/approve`)
        .send({})

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('审批人ID无效')
    })

    it('应该处理审批失败的情况', async () => {
      mockVisitorService.approveVisitorApplication.mockRejectedValue(
        new Error('只能审批待审核状态的申请')
      )

      const response = await request(app)
        .post(`/api/v1/merchants/${testMerchant.id}/visitor-applications/1/approve`)
        .send({ approvedBy: testUser.id })

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('只能审批待审核状态的申请')
    })
  })

  describe('POST /api/v1/merchants/:merchantId/visitor-applications/:applicationId/reject', () => {
    it('应该成功拒绝访客申请', async () => {
      const applicationId = 1
      const rejectedApplication = {
        id: applicationId,
        visitor_name: '张三',
        status: 'rejected',
        approved_by: testUser.id,
        rejected_reason: '不符合访问要求'
      }

      mockVisitorService.rejectVisitorApplication.mockResolvedValue(rejectedApplication)

      const response = await request(app)
        .post(`/api/v1/merchants/${testMerchant.id}/visitor-applications/${applicationId}/reject`)
        .send({
          approvedBy: testUser.id,
          rejectionReason: '不符合访问要求'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual(rejectedApplication)
      expect(mockVisitorService.rejectVisitorApplication).toHaveBeenCalledWith(
        testMerchant.id,
        applicationId,
        testUser.id,
        '不符合访问要求'
      )
    })

    it('应该验证拒绝原因不能为空', async () => {
      const response = await request(app)
        .post(`/api/v1/merchants/${testMerchant.id}/visitor-applications/1/reject`)
        .send({
          approvedBy: testUser.id,
          rejectionReason: ''
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('拒绝原因不能为空')
    })
  })

  describe('POST /api/v1/merchants/:merchantId/visitor-applications/batch-approve', () => {
    it('应该成功批量审批访客申请', async () => {
      const applicationIds = [1, 2, 3]
      const batchResult = {
        success: [
          { id: 1, status: 'approved', visitor_name: '张三' },
          { id: 2, status: 'approved', visitor_name: '李四' }
        ],
        failed: [
          { id: 3, error: '申请已过期' }
        ]
      }

      mockVisitorService.batchApproveApplications.mockResolvedValue(batchResult)

      const response = await request(app)
        .post(`/api/v1/merchants/${testMerchant.id}/visitor-applications/batch-approve`)
        .send({
          applicationIds,
          approvedBy: testUser.id,
          duration: 4
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual(batchResult)
      expect(response.body.message).toContain('成功：2个，失败：1个')
    })

    it('应该验证申请ID列表不能为空', async () => {
      const response = await request(app)
        .post(`/api/v1/merchants/${testMerchant.id}/visitor-applications/batch-approve`)
        .send({
          applicationIds: [],
          approvedBy: testUser.id
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('申请ID列表不能为空')
    })
  })

  describe('POST /api/v1/merchants/:merchantId/visitor-applications/batch-reject', () => {
    it('应该成功批量拒绝访客申请', async () => {
      const applicationIds = [1, 2]
      const batchResult = {
        success: [
          { id: 1, status: 'rejected', visitor_name: '张三' },
          { id: 2, status: 'rejected', visitor_name: '李四' }
        ],
        failed: []
      }

      mockVisitorService.batchRejectApplications.mockResolvedValue(batchResult)

      const response = await request(app)
        .post(`/api/v1/merchants/${testMerchant.id}/visitor-applications/batch-reject`)
        .send({
          applicationIds,
          approvedBy: testUser.id,
          rejectionReason: '批量拒绝'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual(batchResult)
    })
  })

  describe('GET /api/v1/merchants/:merchantId/visitor-stats', () => {
    it('应该成功获取访客统计信息', async () => {
      const mockStats = {
        total: 100,
        pending: 10,
        approved: 80,
        rejected: 5,
        expired: 3,
        completed: 2,
        todayTotal: 5,
        todayPending: 2
      }

      mockVisitorService.getVisitorStats.mockResolvedValue(mockStats)

      const response = await request(app)
        .get(`/api/v1/merchants/${testMerchant.id}/visitor-stats`)
        .query({
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual(mockStats)
      expect(mockVisitorService.getVisitorStats).toHaveBeenCalledWith(
        testMerchant.id,
        expect.objectContaining({
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31'
        })
      )
    })
  })

  describe('GET /api/v1/merchants/:merchantId/pending-count', () => {
    it('应该成功获取待审批申请数量', async () => {
      const mockCount = 5

      mockVisitorService.getPendingApplicationsCount.mockResolvedValue(mockCount)

      const response = await request(app)
        .get(`/api/v1/merchants/${testMerchant.id}/pending-count`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.count).toBe(mockCount)
    })
  })

  describe('GET /api/v1/merchants/:merchantId/expiring-applications', () => {
    it('应该成功获取即将过期的申请', async () => {
      const mockApplications = [
        {
          id: 1,
          visitor_name: '张三',
          merchant_id: testMerchant.id,
          status: 'approved',
          passcode_expiry: new Date(Date.now() + 3600000).toISOString()
        }
      ]

      mockVisitorService.getExpiringApplications.mockResolvedValue(mockApplications)

      const response = await request(app)
        .get(`/api/v1/merchants/${testMerchant.id}/expiring-applications`)
        .query({ hours: 12 })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual(mockApplications)
      expect(mockVisitorService.getExpiringApplications).toHaveBeenCalledWith(
        testMerchant.id,
        12
      )
    })
  })

  describe('GET /api/v1/merchants', () => {
    it('应该成功获取商户列表', async () => {
      const mockMerchants = [
        {
          id: 1,
          name: '商户A',
          code: 'MERCHANT_A',
          contact: '张三',
          phone: '13800138000'
        }
      ]

      mockVisitorService.getMerchants.mockResolvedValue(mockMerchants)

      const response = await request(app)
        .get('/api/v1/merchants')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual(mockMerchants)
    })
  })

  describe('POST /api/v1/visitor-applications', () => {
    it('应该成功提交访客申请', async () => {
      const applicationData = {
        merchantId: testMerchant.id,
        visitorName: '张三',
        visitorPhone: '13800138000',
        visitorCompany: '测试公司',
        visitPurpose: '商务洽谈',
        visitType: 'business',
        scheduledTime: new Date().toISOString(),
        duration: 4
      }

      const createdApplication = {
        id: 1,
        visitor_name: applicationData.visitorName,
        visitor_phone: applicationData.visitorPhone,
        merchant_id: applicationData.merchantId,
        status: 'pending',
        visit_purpose: applicationData.visitPurpose,
        scheduled_time: applicationData.scheduledTime,
        duration: applicationData.duration
      }

      mockVisitorService.submitApplication.mockResolvedValue(createdApplication)

      const response = await request(app)
        .post('/api/v1/visitor-applications')
        .send(applicationData)

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual(createdApplication)
    })

    it('应该验证必填字段', async () => {
      const response = await request(app)
        .post('/api/v1/visitor-applications')
        .send({
          merchantId: testMerchant.id
          // 缺少其他必填字段
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('不能为空')
    })

    it('应该验证手机号格式', async () => {
      const response = await request(app)
        .post('/api/v1/visitor-applications')
        .send({
          merchantId: testMerchant.id,
          visitorName: '张三',
          visitorPhone: '123', // 无效手机号
          visitPurpose: '商务洽谈',
          visitType: 'business',
          scheduledTime: new Date().toISOString(),
          duration: 4
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('请输入正确的手机号')
    })
  })

  describe('访客小程序相关接口', () => {
    describe('GET /api/v1/visitor-applications/:applicationId/passcode/:applicantId', () => {
      it('应该成功获取访客通行码', async () => {
        const applicationId = 1
        const applicantId = 1
        const mockPasscodeInfo = {
          application: {
            id: applicationId,
            visitor_name: '张三',
            status: 'approved'
          },
          passcode: 'ABC123DEF456',
          isValid: true,
          expiryTime: new Date().toISOString(),
          usageCount: 0,
          usageLimit: 1
        }

        mockVisitorService.getVisitorPasscode.mockResolvedValue(mockPasscodeInfo)

        const response = await request(app)
          .get(`/api/v1/visitor-applications/${applicationId}/passcode/${applicantId}`)

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data).toEqual(mockPasscodeInfo)
        expect(mockVisitorService.getVisitorPasscode).toHaveBeenCalledWith(
          applicationId,
          applicantId
        )
      })

      it('应该处理无效的参数', async () => {
        const response = await request(app)
          .get('/api/v1/visitor-applications/invalid/passcode/invalid')

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toContain('ID无效')
      })
    })
  })

  describe('错误处理', () => {
    it('应该处理服务层抛出的各种错误', async () => {
      // 测试不同类型的错误
      const errorCases = [
        { error: new Error('商户不存在'), expectedStatus: 500 },
        { error: new Error('访客申请不存在'), expectedStatus: 500 },
        { error: new Error('权限不足'), expectedStatus: 500 },
        { error: new Error('数据库连接失败'), expectedStatus: 500 }
      ]

      for (const { error, expectedStatus } of errorCases) {
        mockVisitorService.getVisitorApplications.mockRejectedValue(error)

        const response = await request(app)
          .get(`/api/v1/merchants/${testMerchant.id}/visitor-applications`)

        expect(response.status).toBe(expectedStatus)
        expect(response.body.success).toBe(false)
        expect(response.body.message).toContain(error.message)
      }
    })

    it('应该处理未知错误', async () => {
      mockVisitorService.getVisitorApplications.mockRejectedValue(
        new Error('未知错误')
      )

      const response = await request(app)
        .get(`/api/v1/merchants/${testMerchant.id}/visitor-applications`)

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.timestamp).toBeDefined()
    })
  })

  describe('响应格式验证', () => {
    it('所有成功响应应该包含标准字段', async () => {
      mockVisitorService.getVisitorApplications.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      })

      const response = await request(app)
        .get(`/api/v1/merchants/${testMerchant.id}/visitor-applications`)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('data')
      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('timestamp')
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date)
    })

    it('所有错误响应应该包含标准字段', async () => {
      const response = await request(app)
        .get('/api/v1/merchants/invalid/visitor-applications')

      expect(response.body).toHaveProperty('success', false)
      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('timestamp')
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date)
    })
  })
})