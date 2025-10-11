/**
 * 访客服务单元测试
 * 测试 VisitorService 的所有业务逻辑方法
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VisitorService } from '../../../src/services/visitor.service.js'
import { VisitorApplicationModel } from '../../../src/models/visitor-application.model.js'
import { UserModel } from '../../../src/models/user.model.js'
import { MerchantModel } from '../../../src/models/merchant.model.js'
// Simple test data creation helpers
const createTestUser = (overrides = {}) => ({
  id: 1,
  name: '测试用户',
  email: 'test@user.com',
  user_type: 'merchant_admin',
  merchant_id: 1,
  status: 'active',
  ...overrides
})

const createTestMerchant = (overrides = {}) => ({
  id: 1,
  name: '测试商户',
  status: 'active',
  code: 'TEST_MERCHANT',
  contact_person: '张三',
  phone: '13800138000',
  email: 'test@merchant.com',
  ...overrides
})

const createTestApplication = (overrides = {}) => ({
  id: 1,
  visitor_name: '张三',
  visitor_phone: '13800138000',
  merchant_id: 1,
  applicant_id: 1,
  status: 'pending',
  visit_purpose: '商务洽谈',
  scheduled_time: new Date(Date.now() + 3600000).toISOString(),
  duration: 4,
  usage_count: 0,
  usage_limit: 1,
  ...overrides
})

// Mock 依赖的模型
vi.mock('../../../src/models/visitor-application.model.js')
vi.mock('../../../src/models/user.model.js')
vi.mock('../../../src/models/merchant.model.js')

describe('VisitorService', () => {
  let visitorService: VisitorService
  let mockVisitorApplicationModel: any
  let mockUserModel: any
  let mockMerchantModel: any
  let testMerchant: any
  let testUser: any
  let testApplication: any

  beforeEach(() => {
    // 重置所有mock
    vi.clearAllMocks()
    
    // 创建service实例
    visitorService = new VisitorService()
    
    // 获取mock实例
    mockVisitorApplicationModel = vi.mocked(VisitorApplicationModel)
    mockUserModel = vi.mocked(UserModel)
    mockMerchantModel = vi.mocked(MerchantModel)
    
    // 创建测试数据
    testMerchant = createTestMerchant()
    testUser = createTestUser()
    testApplication = createTestApplication()
  })

  describe('getVisitorApplications', () => {
    it('应该成功获取访客申请列表', async () => {
      const mockApplications = [testApplication]
      const mockTotal = 1
      
      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockVisitorApplicationModel.findAll.mockResolvedValue(mockApplications)
      mockVisitorApplicationModel.count.mockResolvedValue(mockTotal)
      mockUserModel.findById.mockResolvedValue(testUser)

      const result = await visitorService.getVisitorApplications(testMerchant.id, {
        page: 1,
        limit: 20
      })

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            ...testApplication,
            applicant: testUser
          })
        ]),
        pagination: {
          page: 1,
          limit: 20,
          total: mockTotal,
          totalPages: 1
        }
      })
      
      expect(mockMerchantModel.findById).toHaveBeenCalledWith(testMerchant.id)
      expect(mockVisitorApplicationModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
          merchantId: testMerchant.id
        })
      )
    })

    it('应该处理商户不存在的情况', async () => {
      mockMerchantModel.findById.mockResolvedValue(null)

      await expect(
        visitorService.getVisitorApplications(999)
      ).rejects.toThrow('商户不存在')
    })

    it('应该支持筛选参数', async () => {
      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockVisitorApplicationModel.findAll.mockResolvedValue([])
      mockVisitorApplicationModel.count.mockResolvedValue(0)

      const options = {
        status: 'pending' as const,
        search: '张三',
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
        visiteeId: 123
      }

      await visitorService.getVisitorApplications(testMerchant.id, options)

      expect(mockVisitorApplicationModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantId: testMerchant.id,
          ...options
        })
      )
    })

    it('应该正确处理关联用户信息', async () => {
      const applicationWithVisitee = {
        ...testApplication,
        visitee_id: 2,
        approved_by: 3
      }
      
      const visitee = createTestUser({ id: 2, name: '被访人' })
      const approver = createTestUser({ id: 3, name: '审批人' })

      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockVisitorApplicationModel.findAll.mockResolvedValue([applicationWithVisitee])
      mockVisitorApplicationModel.count.mockResolvedValue(1)
      
      // Mock用户查询
      mockUserModel.findById
        .mockResolvedValueOnce(testUser) // applicant
        .mockResolvedValueOnce(visitee)  // visitee
        .mockResolvedValueOnce(approver) // approver

      const result = await visitorService.getVisitorApplications(testMerchant.id)

      expect(result.data[0]).toEqual(
        expect.objectContaining({
          applicant: testUser,
          visitee: visitee,
          approver: approver
        })
      )
    })
  })

  describe('getVisitorApplicationById', () => {
    it('应该成功获取访客申请详情', async () => {
      const mockFullInfo = {
        application: testApplication,
        applicant: testUser,
        merchant: testMerchant,
        visitee: null,
        approver: null
      }

      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockVisitorApplicationModel.getFullInfo.mockResolvedValue(mockFullInfo)

      const result = await visitorService.getVisitorApplicationById(
        testMerchant.id,
        testApplication.id
      )

      expect(result).toEqual(mockFullInfo)
      expect(mockVisitorApplicationModel.getFullInfo).toHaveBeenCalledWith(
        testApplication.id
      )
    })

    it('应该验证申请是否属于该商户', async () => {
      const otherMerchantApplication = {
        ...testApplication,
        merchant_id: 999
      }
      
      const mockFullInfo = {
        application: otherMerchantApplication,
        applicant: testUser,
        merchant: testMerchant
      }

      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockVisitorApplicationModel.getFullInfo.mockResolvedValue(mockFullInfo)

      await expect(
        visitorService.getVisitorApplicationById(testMerchant.id, testApplication.id)
      ).rejects.toThrow('访客申请不属于该商户')
    })

    it('应该处理申请不存在的情况', async () => {
      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockVisitorApplicationModel.getFullInfo.mockResolvedValue(null)

      await expect(
        visitorService.getVisitorApplicationById(testMerchant.id, 999)
      ).rejects.toThrow('访客申请不存在')
    })
  })

  describe('approveVisitorApplication', () => {
    it('应该成功审批访客申请', async () => {
      const approvedApplication = {
        ...testApplication,
        status: 'approved',
        approved_by: testUser.id,
        passcode: 'ABC123DEF456'
      }

      // 设置未来的预约时间
      const futureTime = new Date()
      futureTime.setHours(futureTime.getHours() + 2)
      testApplication.scheduled_time = futureTime.toISOString()

      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockUserModel.findById.mockResolvedValue(testUser)
      mockVisitorApplicationModel.findById.mockResolvedValue(testApplication)
      mockVisitorApplicationModel.approve.mockResolvedValue(approvedApplication)

      const result = await visitorService.approveVisitorApplication(
        testMerchant.id,
        testApplication.id,
        testUser.id,
        { duration: 4, note: '审批通过' }
      )

      expect(result).toEqual(approvedApplication)
      expect(mockVisitorApplicationModel.approve).toHaveBeenCalledWith(
        testApplication.id,
        testUser.id,
        expect.any(String), // passcode
        expect.any(String)  // passcode expiry
      )
    })

    it('应该验证商户存在', async () => {
      mockMerchantModel.findById.mockResolvedValue(null)

      await expect(
        visitorService.approveVisitorApplication(999, testApplication.id, testUser.id)
      ).rejects.toThrow('商户不存在')
    })

    it('应该验证审批人存在且属于该商户', async () => {
      const otherMerchantUser = {
        ...testUser,
        merchant_id: 999
      }

      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockUserModel.findById.mockResolvedValue(otherMerchantUser)

      await expect(
        visitorService.approveVisitorApplication(
          testMerchant.id,
          testApplication.id,
          testUser.id
        )
      ).rejects.toThrow('审批人不属于该商户')
    })

    it('应该验证申请状态为待审核', async () => {
      const approvedApplication = {
        ...testApplication,
        status: 'approved'
      }

      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockUserModel.findById.mockResolvedValue(testUser)
      mockVisitorApplicationModel.findById.mockResolvedValue(approvedApplication)

      await expect(
        visitorService.approveVisitorApplication(
          testMerchant.id,
          testApplication.id,
          testUser.id
        )
      ).rejects.toThrow('只能审批待审核状态的申请')
    })

    it('应该验证预约时间未过期', async () => {
      const expiredApplication = {
        ...testApplication,
        scheduled_time: new Date(Date.now() - 60000).toISOString() // 1分钟前
      }

      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockUserModel.findById.mockResolvedValue(testUser)
      mockVisitorApplicationModel.findById.mockResolvedValue(expiredApplication)

      await expect(
        visitorService.approveVisitorApplication(
          testMerchant.id,
          testApplication.id,
          testUser.id
        )
      ).rejects.toThrow('预约时间已过期，无法审批')
    })

    it('应该生成通行码和过期时间', async () => {
      const futureTime = new Date()
      futureTime.setHours(futureTime.getHours() + 2)
      testApplication.scheduled_time = futureTime.toISOString()

      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockUserModel.findById.mockResolvedValue(testUser)
      mockVisitorApplicationModel.findById.mockResolvedValue(testApplication)
      mockVisitorApplicationModel.approve.mockResolvedValue(testApplication)

      await visitorService.approveVisitorApplication(
        testMerchant.id,
        testApplication.id,
        testUser.id,
        { duration: 6 }
      )

      expect(mockVisitorApplicationModel.approve).toHaveBeenCalledWith(
        testApplication.id,
        testUser.id,
        expect.any(String), // 通行码
        expect.any(String)  // 过期时间
      )
    })
  })

  describe('rejectVisitorApplication', () => {
    it('应该成功拒绝访客申请', async () => {
      const rejectedApplication = {
        ...testApplication,
        status: 'rejected',
        approved_by: testUser.id,
        rejected_reason: '不符合访问要求'
      }

      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockUserModel.findById.mockResolvedValue(testUser)
      mockVisitorApplicationModel.findById.mockResolvedValue(testApplication)
      mockVisitorApplicationModel.reject.mockResolvedValue(rejectedApplication)

      const result = await visitorService.rejectVisitorApplication(
        testMerchant.id,
        testApplication.id,
        testUser.id,
        '不符合访问要求'
      )

      expect(result).toEqual(rejectedApplication)
      expect(mockVisitorApplicationModel.reject).toHaveBeenCalledWith(
        testApplication.id,
        testUser.id,
        '不符合访问要求'
      )
    })

    it('应该验证拒绝原因不能为空', async () => {
      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockUserModel.findById.mockResolvedValue(testUser)
      mockVisitorApplicationModel.findById.mockResolvedValue(testApplication)

      await expect(
        visitorService.rejectVisitorApplication(
          testMerchant.id,
          testApplication.id,
          testUser.id,
          ''
        )
      ).rejects.toThrow('拒绝原因不能为空')

      await expect(
        visitorService.rejectVisitorApplication(
          testMerchant.id,
          testApplication.id,
          testUser.id,
          '   '
        )
      ).rejects.toThrow('拒绝原因不能为空')
    })

    it('应该验证申请状态为待审核', async () => {
      const rejectedApplication = {
        ...testApplication,
        status: 'rejected'
      }

      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockUserModel.findById.mockResolvedValue(testUser)
      mockVisitorApplicationModel.findById.mockResolvedValue(rejectedApplication)

      await expect(
        visitorService.rejectVisitorApplication(
          testMerchant.id,
          testApplication.id,
          testUser.id,
          '拒绝原因'
        )
      ).rejects.toThrow('只能拒绝待审核状态的申请')
    })
  })

  describe('batchApproveApplications', () => {
    it('应该成功批量审批访客申请', async () => {
      const applicationIds = [1, 2, 3]
      const approvedApp1 = { ...testApplication, id: 1, status: 'approved' }
      const approvedApp2 = { ...testApplication, id: 2, status: 'approved' }

      // Mock第一个和第二个申请成功，第三个失败
      vi.spyOn(visitorService, 'approveVisitorApplication')
        .mockResolvedValueOnce(approvedApp1)
        .mockResolvedValueOnce(approvedApp2)
        .mockRejectedValueOnce(new Error('申请已过期'))

      const result = await visitorService.batchApproveApplications(
        testMerchant.id,
        applicationIds,
        testUser.id,
        { duration: 4 }
      )

      expect(result.success).toHaveLength(2)
      expect(result.failed).toHaveLength(1)
      expect(result.success).toEqual([approvedApp1, approvedApp2])
      expect(result.failed[0]).toEqual({
        id: 3,
        error: '申请已过期'
      })
    })

    it('应该处理所有申请都失败的情况', async () => {
      const applicationIds = [1, 2]

      vi.spyOn(visitorService, 'approveVisitorApplication')
        .mockRejectedValue(new Error('商户不存在'))

      const result = await visitorService.batchApproveApplications(
        testMerchant.id,
        applicationIds,
        testUser.id
      )

      expect(result.success).toHaveLength(0)
      expect(result.failed).toHaveLength(2)
    })
  })

  describe('batchRejectApplications', () => {
    it('应该成功批量拒绝访客申请', async () => {
      const applicationIds = [1, 2]
      const rejectedApp1 = { ...testApplication, id: 1, status: 'rejected' }
      const rejectedApp2 = { ...testApplication, id: 2, status: 'rejected' }

      vi.spyOn(visitorService, 'rejectVisitorApplication')
        .mockResolvedValueOnce(rejectedApp1)
        .mockResolvedValueOnce(rejectedApp2)

      const result = await visitorService.batchRejectApplications(
        testMerchant.id,
        applicationIds,
        testUser.id,
        '批量拒绝'
      )

      expect(result.success).toHaveLength(2)
      expect(result.failed).toHaveLength(0)
      expect(result.success).toEqual([rejectedApp1, rejectedApp2])
    })
  })

  describe('getVisitorStats', () => {
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

      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      
      // Mock各种统计查询
      mockVisitorApplicationModel.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(10)  // pending
        .mockResolvedValueOnce(80)  // approved
        .mockResolvedValueOnce(5)   // rejected
        .mockResolvedValueOnce(3)   // expired
        .mockResolvedValueOnce(2)   // completed
      
      mockVisitorApplicationModel.getTodayCount.mockResolvedValue(5)
      mockVisitorApplicationModel.getPendingCount.mockResolvedValue(2)

      const result = await visitorService.getVisitorStats(testMerchant.id, {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31'
      })

      expect(result).toEqual(mockStats)
      expect(mockVisitorApplicationModel.count).toHaveBeenCalledTimes(6)
    })
  })

  describe('submitApplication', () => {
    it('应该成功提交访客申请', async () => {
      const applicationData = {
        merchantId: testMerchant.id,
        visitorName: '张三',
        visitorPhone: '13800138000',
        visitorCompany: '测试公司',
        visitPurpose: '商务洽谈',
        visitType: 'business',
        scheduledTime: new Date(Date.now() + 3600000), // 1小时后
        duration: 4
      }

      const createdApplication = {
        ...testApplication,
        visitor_name: applicationData.visitorName,
        phone: applicationData.visitorPhone
      }

      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockVisitorApplicationModel.findDuplicateApplication.mockResolvedValue(null)
      mockVisitorApplicationModel.create.mockResolvedValue(createdApplication)

      const result = await visitorService.submitApplication(applicationData)

      expect(result).toEqual(createdApplication)
      expect(mockVisitorApplicationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          merchant_id: applicationData.merchantId,
          visitor_name: applicationData.visitorName,
          visitor_phone: applicationData.visitorPhone,
          status: 'pending'
        })
      )
    })

    it('应该验证商户状态为活跃', async () => {
      const inactiveMerchant = {
        ...testMerchant,
        status: 'inactive'
      }

      mockMerchantModel.findById.mockResolvedValue(inactiveMerchant)

      await expect(
        visitorService.submitApplication({
          merchantId: testMerchant.id,
          visitorName: '张三',
          visitorPhone: '13800138000',
          visitPurpose: '商务洽谈',
          visitType: 'business',
          scheduledTime: new Date(Date.now() + 3600000),
          duration: 4
        })
      ).rejects.toThrow('商户已停用，无法提交申请')
    })

    it('应该验证预约时间不能早于当前时间', async () => {
      mockMerchantModel.findById.mockResolvedValue(testMerchant)

      await expect(
        visitorService.submitApplication({
          merchantId: testMerchant.id,
          visitorName: '张三',
          visitorPhone: '13800138000',
          visitPurpose: '商务洽谈',
          visitType: 'business',
          scheduledTime: new Date(Date.now() - 3600000), // 1小时前
          duration: 4
        })
      ).rejects.toThrow('预约时间不能早于当前时间')
    })

    it('应该检查重复申请', async () => {
      const existingApplication = createTestApplication()

      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockVisitorApplicationModel.findDuplicateApplication.mockResolvedValue(
        existingApplication
      )

      await expect(
        visitorService.submitApplication({
          merchantId: testMerchant.id,
          visitorName: '张三',
          visitorPhone: '13800138000',
          visitPurpose: '商务洽谈',
          visitType: 'business',
          scheduledTime: new Date(Date.now() + 3600000),
          duration: 4
        })
      ).rejects.toThrow('您已在该时间段提交过申请，请勿重复提交')
    })
  })

  describe('getVisitorPasscode', () => {
    it('应该成功获取访客通行码信息', async () => {
      const approvedApplication = {
        ...testApplication,
        status: 'approved',
        passcode: 'ABC123DEF456',
        passcode_expiry: new Date(Date.now() + 3600000).toISOString(),
        usage_count: 0,
        usage_limit: 1
      }

      mockVisitorApplicationModel.findById.mockResolvedValue(approvedApplication)
      mockVisitorApplicationModel.isPasscodeValid.mockResolvedValue(true)

      const result = await visitorService.getVisitorPasscode(
        testApplication.id,
        testUser.id
      )

      expect(result).toEqual({
        application: approvedApplication,
        passcode: 'ABC123DEF456',
        isValid: true,
        expiryTime: approvedApplication.passcode_expiry,
        usageCount: 0,
        usageLimit: 1
      })
    })

    it('应该验证申请人身份', async () => {
      mockVisitorApplicationModel.findById.mockResolvedValue(testApplication)

      await expect(
        visitorService.getVisitorPasscode(testApplication.id, 999)
      ).rejects.toThrow('只能查看自己的通行码')
    })

    it('应该验证申请状态为已审批', async () => {
      const pendingApplication = {
        ...testApplication,
        status: 'pending'
      }

      mockVisitorApplicationModel.findById.mockResolvedValue(pendingApplication)

      await expect(
        visitorService.getVisitorPasscode(testApplication.id, testUser.id)
      ).rejects.toThrow('申请未通过审批，无法获取通行码')
    })
  })

  describe('refreshPasscode', () => {
    it('应该成功刷新通行码', async () => {
      const approvedApplication = {
        ...testApplication,
        status: 'approved',
        scheduled_time: new Date(Date.now() + 1800000).toISOString(), // 30分钟后
        duration: 4
      }

      mockVisitorApplicationModel.findById.mockResolvedValue(approvedApplication)
      mockVisitorApplicationModel.updatePasscode.mockResolvedValue(true)

      const result = await visitorService.refreshPasscode(
        testApplication.id,
        testUser.id
      )

      expect(result).toEqual({
        code: expect.any(String),
        type: 'visitor',
        status: 'active',
        expiryTime: expect.any(String),
        usageLimit: approvedApplication.usage_limit,
        usageCount: 0
      })

      expect(mockVisitorApplicationModel.updatePasscode).toHaveBeenCalledWith(
        testApplication.id,
        expect.any(String),
        expect.any(String)
      )
    })

    it('应该验证访问时间未过期', async () => {
      const expiredApplication = {
        ...testApplication,
        status: 'approved',
        scheduled_time: new Date(Date.now() - 7200000).toISOString(), // 2小时前
        duration: 1 // 1小时时长，已过期
      }

      mockVisitorApplicationModel.findById.mockResolvedValue(expiredApplication)

      await expect(
        visitorService.refreshPasscode(testApplication.id, testUser.id)
      ).rejects.toThrow('访问时间已过期，无法刷新通行码')
    })
  })

  describe('边界条件和错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      mockMerchantModel.findById.mockRejectedValue(new Error('数据库连接失败'))

      await expect(
        visitorService.getVisitorApplications(testMerchant.id)
      ).rejects.toThrow('数据库连接失败')
    })

    it('应该处理空数据情况', async () => {
      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockVisitorApplicationModel.findAll.mockResolvedValue([])
      mockVisitorApplicationModel.count.mockResolvedValue(0)

      const result = await visitorService.getVisitorApplications(testMerchant.id)

      expect(result.data).toEqual([])
      expect(result.pagination.total).toBe(0)
    })

    it('应该处理用户信息查询失败', async () => {
      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockVisitorApplicationModel.findAll.mockResolvedValue([testApplication])
      mockVisitorApplicationModel.count.mockResolvedValue(1)
      mockUserModel.findById.mockResolvedValue(null) // 用户不存在

      const result = await visitorService.getVisitorApplications(testMerchant.id)

      expect(result.data[0].applicant).toBeUndefined()
    })
  })

  describe('通行码生成', () => {
    it('应该生成唯一的通行码', async () => {
      const service = new VisitorService()
      
      // 使用反射访问私有方法进行测试
      const generatePasscode = (service as any).generateSimplePasscode.bind(service)
      
      const passcode1 = generatePasscode()
      const passcode2 = generatePasscode()
      
      expect(passcode1).toMatch(/^[A-Z0-9]{14}$/) // 实际生成的是14位
      expect(passcode2).toMatch(/^[A-Z0-9]{14}$/)
      expect(passcode1).not.toBe(passcode2)
    })
  })

  describe('数据验证', () => {
    it('应该验证分页参数', async () => {
      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockVisitorApplicationModel.findAll.mockResolvedValue([])
      mockVisitorApplicationModel.count.mockResolvedValue(0)

      // 测试默认分页参数
      await visitorService.getVisitorApplications(testMerchant.id)

      expect(mockVisitorApplicationModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20
        })
      )
    })

    it('应该处理无效的分页参数', async () => {
      mockMerchantModel.findById.mockResolvedValue(testMerchant)
      mockVisitorApplicationModel.findAll.mockResolvedValue([])
      mockVisitorApplicationModel.count.mockResolvedValue(0)

      await visitorService.getVisitorApplications(testMerchant.id, {
        page: -1,
        limit: 0
      })

      // 服务使用默认值处理无效参数
      expect(mockVisitorApplicationModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: -1, // 传递原始值
          limit: 20, // 使用默认值
          merchantId: testMerchant.id
        })
      )
    })
  })
})