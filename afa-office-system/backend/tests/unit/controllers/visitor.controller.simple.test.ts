/**
 * 访客控制器单元测试 - 简化版本
 * 测试 VisitorController 的核心业务逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VisitorController } from '../../../src/controllers/visitor.controller.js'
import { VisitorService } from '../../../src/services/visitor.service.js'

// Mock VisitorService
vi.mock('../../../src/services/visitor.service.js')

describe('VisitorController', () => {
  let visitorController: VisitorController
  let mockVisitorService: any
  let mockRequest: any
  let mockResponse: any

  beforeEach(() => {
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
    
    // 创建controller实例
    visitorController = new VisitorController()
    
    // 创建mock request和response
    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: { id: 1 }
    }
    
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    }
  })

  describe('getVisitorApplications', () => {
    it('应该成功获取访客申请列表', async () => {
      const merchantId = 1
      const mockApplications = {
        data: [
          {
            id: 1,
            visitor_name: '张三',
            visitor_phone: '13800138000',
            status: 'pending'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      }

      mockRequest.params.merchantId = merchantId.toString()
      mockRequest.query = { page: '1', limit: '20' }
      mockVisitorService.getVisitorApplications.mockResolvedValue(mockApplications)

      await visitorController.getVisitorApplications(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockApplications,
          message: '获取访客申请列表成功'
        })
      )
      expect(mockVisitorService.getVisitorApplications).toHaveBeenCalledWith(
        merchantId,
        expect.objectContaining({
          page: 1,
          limit: 20
        })
      )
    })

    it('应该处理无效的商户ID', async () => {
      mockRequest.params.merchantId = 'invalid'

      await visitorController.getVisitorApplications(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '商户ID无效'
        })
      )
    })

    it('应该处理服务层错误', async () => {
      mockRequest.params.merchantId = '1'
      mockVisitorService.getVisitorApplications.mockRejectedValue(
        new Error('商户不存在')
      )

      await visitorController.getVisitorApplications(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '商户不存在'
        })
      )
    })

    it('应该支持查询参数过滤', async () => {
      mockRequest.params.merchantId = '1'
      mockRequest.query = {
        status: 'pending',
        search: '张三',
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
        visiteeId: '123'
      }
      mockVisitorService.getVisitorApplications.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      })

      await visitorController.getVisitorApplications(mockRequest, mockResponse)

      expect(mockVisitorService.getVisitorApplications).toHaveBeenCalledWith(
        1,
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

  describe('getVisitorApplicationById', () => {
    it('应该成功获取访客申请详情', async () => {
      const merchantId = 1
      const applicationId = 1
      const mockApplicationDetail = {
        application: {
          id: applicationId,
          visitor_name: '张三',
          merchant_id: merchantId
        },
        applicant: { id: 1, name: '申请人' },
        merchant: { id: merchantId, name: '测试商户' }
      }

      mockRequest.params = {
        merchantId: merchantId.toString(),
        applicationId: applicationId.toString()
      }
      mockVisitorService.getVisitorApplicationById.mockResolvedValue(mockApplicationDetail)

      await visitorController.getVisitorApplicationById(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockApplicationDetail
        })
      )
    })

    it('应该处理无效的申请ID', async () => {
      mockRequest.params = {
        merchantId: '1',
        applicationId: 'invalid'
      }

      await visitorController.getVisitorApplicationById(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '申请ID无效'
        })
      )
    })

    it('应该处理申请不存在的情况', async () => {
      mockRequest.params = {
        merchantId: '1',
        applicationId: '999'
      }
      mockVisitorService.getVisitorApplicationById.mockRejectedValue(
        new Error('访客申请不存在')
      )

      await visitorController.getVisitorApplicationById(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(404)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '访客申请不存在'
        })
      )
    })
  })

  describe('approveVisitorApplication', () => {
    it('应该成功审批访客申请', async () => {
      const merchantId = 1
      const applicationId = 1
      const approvedBy = 1
      const approvedApplication = {
        id: applicationId,
        status: 'approved',
        approved_by: approvedBy,
        passcode: 'ABC123DEF456'
      }

      mockRequest.params = {
        merchantId: merchantId.toString(),
        applicationId: applicationId.toString()
      }
      mockRequest.body = {
        approvedBy: approvedBy.toString(),
        duration: 4,
        usageLimit: 1,
        note: '审批通过'
      }
      mockVisitorService.approveVisitorApplication.mockResolvedValue(approvedApplication)

      await visitorController.approveVisitorApplication(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: approvedApplication,
          message: '访客申请审批成功'
        })
      )
      expect(mockVisitorService.approveVisitorApplication).toHaveBeenCalledWith(
        merchantId,
        applicationId,
        approvedBy,
        expect.objectContaining({
          duration: 4,
          usageLimit: 1,
          note: '审批通过'
        })
      )
    })

    it('应该验证必填参数', async () => {
      mockRequest.params = {
        merchantId: '1',
        applicationId: '1'
      }
      mockRequest.body = {} // 缺少审批人ID

      await visitorController.approveVisitorApplication(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '审批人ID无效'
        })
      )
    })

    it('应该处理审批失败的情况', async () => {
      mockRequest.params = {
        merchantId: '1',
        applicationId: '1'
      }
      mockRequest.body = { approvedBy: '1' }
      mockVisitorService.approveVisitorApplication.mockRejectedValue(
        new Error('只能审批待审核状态的申请')
      )

      await visitorController.approveVisitorApplication(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '只能审批待审核状态的申请'
        })
      )
    })
  })

  describe('rejectVisitorApplication', () => {
    it('应该成功拒绝访客申请', async () => {
      const merchantId = 1
      const applicationId = 1
      const approvedBy = 1
      const rejectionReason = '不符合访问要求'
      const rejectedApplication = {
        id: applicationId,
        status: 'rejected',
        approved_by: approvedBy,
        rejected_reason: rejectionReason
      }

      mockRequest.params = {
        merchantId: merchantId.toString(),
        applicationId: applicationId.toString()
      }
      mockRequest.body = {
        approvedBy: approvedBy.toString(),
        rejectionReason
      }
      mockVisitorService.rejectVisitorApplication.mockResolvedValue(rejectedApplication)

      await visitorController.rejectVisitorApplication(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: rejectedApplication,
          message: '访客申请已拒绝'
        })
      )
    })

    it('应该验证拒绝原因不能为空', async () => {
      mockRequest.params = {
        merchantId: '1',
        applicationId: '1'
      }
      mockRequest.body = {
        approvedBy: '1',
        rejectionReason: ''
      }

      await visitorController.rejectVisitorApplication(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '拒绝原因不能为空'
        })
      )
    })
  })

  describe('batchApproveApplications', () => {
    it('应该成功批量审批访客申请', async () => {
      const merchantId = 1
      const applicationIds = [1, 2, 3]
      const approvedBy = 1
      const batchResult = {
        success: [
          { id: 1, status: 'approved' },
          { id: 2, status: 'approved' }
        ],
        failed: [
          { id: 3, error: '申请已过期' }
        ]
      }

      mockRequest.params.merchantId = merchantId.toString()
      mockRequest.body = {
        applicationIds,
        approvedBy: approvedBy.toString(),
        duration: 4
      }
      mockVisitorService.batchApproveApplications.mockResolvedValue(batchResult)

      await visitorController.batchApproveApplications(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: batchResult,
          message: expect.stringContaining('成功：2个，失败：1个')
        })
      )
    })

    it('应该验证申请ID列表不能为空', async () => {
      mockRequest.params.merchantId = '1'
      mockRequest.body = {
        applicationIds: [],
        approvedBy: '1'
      }

      await visitorController.batchApproveApplications(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '申请ID列表不能为空'
        })
      )
    })
  })

  describe('getVisitorStats', () => {
    it('应该成功获取访客统计信息', async () => {
      const merchantId = 1
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

      mockRequest.params.merchantId = merchantId.toString()
      mockRequest.query = {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31'
      }
      mockVisitorService.getVisitorStats.mockResolvedValue(mockStats)

      await visitorController.getVisitorStats(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockStats
        })
      )
    })
  })

  describe('submitApplication', () => {
    it('应该成功提交访客申请', async () => {
      const applicationData = {
        merchantId: 1,
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
        status: 'pending'
      }

      mockRequest.body = applicationData
      mockVisitorService.submitApplication.mockResolvedValue(createdApplication)

      await visitorController.submitApplication(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: createdApplication,
          message: '访客申请提交成功'
        })
      )
    })

    it('应该验证必填字段', async () => {
      mockRequest.body = {
        merchantId: 1
        // 缺少其他必填字段
      }

      await visitorController.submitApplication(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('不能为空')
        })
      )
    })

    it('应该验证手机号格式', async () => {
      mockRequest.body = {
        merchantId: 1,
        visitorName: '张三',
        visitorPhone: '123', // 无效手机号
        visitPurpose: '商务洽谈',
        visitType: 'business',
        scheduledTime: new Date().toISOString(),
        duration: 4
      }

      await visitorController.submitApplication(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '请输入正确的手机号'
        })
      )
    })
  })

  describe('getVisitorPasscode', () => {
    it('应该成功获取访客通行码', async () => {
      const applicationId = 1
      const applicantId = 1
      const mockPasscodeInfo = {
        application: {
          id: applicationId,
          visitor_name: '张三'
        },
        passcode: 'ABC123DEF456',
        isValid: true,
        expiryTime: new Date().toISOString(),
        usageCount: 0,
        usageLimit: 1
      }

      mockRequest.params = {
        applicationId: applicationId.toString(),
        applicantId: applicantId.toString()
      }
      mockVisitorService.getVisitorPasscode.mockResolvedValue(mockPasscodeInfo)

      await visitorController.getVisitorPasscode(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockPasscodeInfo
        })
      )
    })

    it('应该处理无效的参数', async () => {
      mockRequest.params = {
        applicationId: 'invalid',
        applicantId: 'invalid'
      }

      await visitorController.getVisitorPasscode(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('ID无效')
        })
      )
    })
  })

  describe('错误处理', () => {
    it('应该处理服务层抛出的各种错误', async () => {
      const errorCases = [
        { error: new Error('商户不存在'), expectedStatus: 500 },
        { error: new Error('访客申请不存在'), expectedStatus: 500 },
        { error: new Error('权限不足'), expectedStatus: 500 },
        { error: new Error('数据库连接失败'), expectedStatus: 500 }
      ]

      for (const { error, expectedStatus } of errorCases) {
        mockRequest.params.merchantId = '1'
        mockVisitorService.getVisitorApplications.mockRejectedValue(error)

        await visitorController.getVisitorApplications(mockRequest, mockResponse)

        expect(mockResponse.status).toHaveBeenCalledWith(expectedStatus)
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: error.message
          })
        )
      }
    })

    it('应该处理未知错误', async () => {
      mockRequest.params.merchantId = '1'
      mockVisitorService.getVisitorApplications.mockRejectedValue(
        new Error('未知错误')
      )

      await visitorController.getVisitorApplications(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          timestamp: expect.any(String)
        })
      )
    })
  })

  describe('响应格式验证', () => {
    it('所有成功响应应该包含标准字段', async () => {
      mockRequest.params.merchantId = '1'
      mockVisitorService.getVisitorApplications.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      })

      await visitorController.getVisitorApplications(mockRequest, mockResponse)

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
          message: expect.any(String),
          timestamp: expect.any(String)
        })
      )
    })

    it('所有错误响应应该包含标准字段', async () => {
      mockRequest.params.merchantId = 'invalid'

      await visitorController.getVisitorApplications(mockRequest, mockResponse)

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.any(String),
          timestamp: expect.any(String)
        })
      )
    })
  })
})