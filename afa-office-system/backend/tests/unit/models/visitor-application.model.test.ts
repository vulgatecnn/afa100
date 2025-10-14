/**
 * 访客申请模型单元测试
 * 测试 VisitorApplicationModel 的所有数据库操作方法
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VisitorApplicationModel } from '../../../src/models/visitor-application.model.js'
import database from '../../../src/utils/database.js'
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

// Mock database
vi.mock('../../../src/utils/database.js')

describe('VisitorApplicationModel', () => {
  let mockDatabase: any
  let testApplication: any
  let testMerchant: any
  let testUser: any

  beforeEach(() => {
    // 重置所有mock
    vi.clearAllMocks()
    
    // 获取mock database实例
    mockDatabase = vi.mocked(database)
    
    // 创建测试数据
    testMerchant = createTestMerchant()
    testUser = createTestUser()
    testApplication = createTestApplication()
  })

  describe('create', () => {
    it('应该成功创建访客申请', async () => {
      const applicationData = {
        applicant_id: testUser.id,
        merchant_id: testMerchant.id,
        visitor_name: '张三',
        visitor_phone: '13800138000',
        visitor_company: '测试公司',
        visit_purpose: '商务洽谈',
        visit_type: 'business',
        scheduled_time: new Date().toISOString(),
        duration: 4,
        status: 'pending' as const,
        usage_limit: 1,
        usage_count: 0
      }

      mockDatabase.run.mockResolvedValue({ lastID: 1 })
      mockDatabase.getWithConsistency.mockResolvedValue({
        ...applicationData,
        id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      const result = await VisitorApplicationModel.create(applicationData)

      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          visitor_name: '张三',
          visitor_phone: '13800138000',
          status: 'pending'
        })
      )

      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO visitor_applications'),
        expect.arrayContaining([
          testUser.id,
          testMerchant.id,
          '张三',
          '13800138000'
        ])
      )
    })

    it('应该处理创建失败的情况', async () => {
      mockDatabase.run.mockResolvedValue({ lastID: null })

      await expect(
        VisitorApplicationModel.create({
          applicant_id: testUser.id,
          merchant_id: testMerchant.id,
          visitor_name: '张三',
          visitor_phone: '13800138000',
          visit_purpose: '商务洽谈',
          scheduled_time: new Date().toISOString(),
          duration: 4,
          status: 'pending',
          usage_limit: 1,
          usage_count: 0
        })
      ).rejects.toThrow('创建访客申请失败')
    })

    it('应该处理创建后查询失败的情况', async () => {
      mockDatabase.run.mockResolvedValue({ lastID: 1 })
      mockDatabase.getWithConsistency.mockResolvedValue(null)

      await expect(
        VisitorApplicationModel.create({
          applicant_id: testUser.id,
          merchant_id: testMerchant.id,
          visitor_name: '张三',
          visitor_phone: '13800138000',
          visit_purpose: '商务洽谈',
          scheduled_time: new Date().toISOString(),
          duration: 4,
          status: 'pending',
          usage_limit: 1,
          usage_count: 0
        })
      ).rejects.toThrow('创建访客申请后查询失败')
    })

    it('应该正确处理可选字段', async () => {
      const applicationData = {
        applicant_id: testUser.id,
        merchant_id: testMerchant.id,
        visitor_name: '张三',
        visitor_phone: '13800138000',
        visit_purpose: '商务洽谈',
        scheduled_time: new Date().toISOString(),
        duration: 4,
        status: 'pending' as const,
        usage_limit: 1,
        usage_count: 0
        // 包含必需字段
      }

      mockDatabase.run.mockResolvedValue({ lastID: 1 })
      mockDatabase.getWithConsistency.mockResolvedValue({
        ...applicationData,
        id: 1
      })

      await VisitorApplicationModel.create(applicationData)

      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          testUser.id,
          testMerchant.id,
          null, // visitee_id
          '张三',
          '13800138000',
          null, // visitor_company
          '商务洽谈',
          null, // visit_type
          expect.any(String), // scheduled_time
          4,
          'pending',
          null, // approved_by
          null, // approved_at
          null, // rejection_reason
          null, // passcode
          null, // passcode_expiry
          10,   // usage_limit default
          0     // usage_count default
        ])
      )
    })
  })

  describe('findById', () => {
    it('应该成功根据ID查找访客申请', async () => {
      mockDatabase.get.mockResolvedValue(testApplication)

      const result = await VisitorApplicationModel.findById(1)

      expect(result).toEqual(testApplication)
      expect(mockDatabase.get).toHaveBeenCalledWith(
        'SELECT * FROM visitor_applications WHERE id = ?',
        [1]
      )
    })

    it('应该处理申请不存在的情况', async () => {
      mockDatabase.get.mockResolvedValue(undefined)

      const result = await VisitorApplicationModel.findById(999)

      expect(result).toBeNull()
    })
  })

  describe('findAll', () => {
    it('应该成功获取所有访客申请', async () => {
      const mockApplications = [testApplication]
      mockDatabase.all.mockResolvedValue(mockApplications)

      const result = await VisitorApplicationModel.findAll()

      expect(result).toEqual(mockApplications)
      expect(mockDatabase.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM visitor_applications WHERE 1=1'),
        []
      )
    })

    it('应该支持状态筛选', async () => {
      mockDatabase.all.mockResolvedValue([testApplication])

      await VisitorApplicationModel.findAll({ status: 'pending' })

      expect(mockDatabase.all).toHaveBeenCalledWith(
        expect.stringContaining('AND status = ?'),
        ['pending']
      )
    })

    it('应该支持商户ID筛选', async () => {
      mockDatabase.all.mockResolvedValue([testApplication])

      await VisitorApplicationModel.findAll({ merchantId: testMerchant.id })

      expect(mockDatabase.all).toHaveBeenCalledWith(
        expect.stringContaining('AND merchant_id = ?'),
        [testMerchant.id]
      )
    })

    it('应该支持搜索功能', async () => {
      mockDatabase.all.mockResolvedValue([testApplication])

      await VisitorApplicationModel.findAll({ search: '张三' })

      expect(mockDatabase.all).toHaveBeenCalledWith(
        expect.stringContaining('AND (visitor_name LIKE ? OR visitor_phone LIKE ?'),
        expect.arrayContaining(['%张三%', '%张三%', '%张三%', '%张三%'])
      )
    })

    it('应该支持日期范围筛选', async () => {
      mockDatabase.all.mockResolvedValue([testApplication])

      await VisitorApplicationModel.findAll({
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31'
      })

      expect(mockDatabase.all).toHaveBeenCalledWith(
        expect.stringContaining('AND scheduled_time >= ?'),
        expect.arrayContaining(['2024-01-01', '2024-01-31'])
      )
    })

    it('应该支持分页', async () => {
      mockDatabase.all.mockResolvedValue([testApplication])

      await VisitorApplicationModel.findAll({
        page: 2,
        limit: 10
      })

      expect(mockDatabase.all).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ? OFFSET ?'),
        expect.arrayContaining([10, 10]) // page 2, limit 10 -> offset 10
      )
    })

    it('应该支持多条件组合筛选', async () => {
      mockDatabase.all.mockResolvedValue([testApplication])

      await VisitorApplicationModel.findAll({
        status: 'pending',
        merchantId: testMerchant.id,
        search: '张三',
        dateFrom: '2024-01-01',
        page: 1,
        limit: 20
      })

      expect(mockDatabase.all).toHaveBeenCalledWith(
        expect.stringMatching(/AND status = \?.*AND merchant_id = \?.*AND \(visitor_name LIKE \?.*AND scheduled_time >= \?/),
        expect.arrayContaining(['pending', testMerchant.id, '%张三%', '2024-01-01'])
      )
    })
  })

  describe('update', () => {
    it('应该成功更新访客申请', async () => {
      const updateData = {
        status: 'approved' as const,
        approved_by: testUser.id,
        passcode: 'ABC123DEF456'
      }

      const updatedApplication = {
        ...testApplication,
        ...updateData
      }

      mockDatabase.run.mockResolvedValue({ changes: 1 })
      vi.spyOn(VisitorApplicationModel, 'findById').mockResolvedValue(updatedApplication)

      const result = await VisitorApplicationModel.update(1, updateData)

      expect(result).toEqual(updatedApplication)
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE visitor_applications SET'),
        expect.arrayContaining(['approved', testUser.id, 'ABC123DEF456', 1])
      )
    })

    it('应该处理没有需要更新的字段', async () => {
      await expect(
        VisitorApplicationModel.update(1, {})
      ).rejects.toThrow('没有需要更新的字段')
    })

    it('应该处理申请不存在的情况', async () => {
      mockDatabase.run.mockResolvedValue({ changes: 0 })

      await expect(
        VisitorApplicationModel.update(999, { status: 'approved' })
      ).rejects.toThrow('访客申请不存在或更新失败')
    })

    it('应该自动添加更新时间', async () => {
      mockDatabase.run.mockResolvedValue({ changes: 1 })
      vi.spyOn(VisitorApplicationModel, 'findById').mockResolvedValue(testApplication)

      await VisitorApplicationModel.update(1, { status: 'approved' })

      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = CURRENT_TIMESTAMP'),
        expect.any(Array)
      )
    })
  })

  describe('approve', () => {
    it('应该成功审批访客申请', async () => {
      const approvedApplication = {
        ...testApplication,
        status: 'approved',
        approved_by: testUser.id,
        passcode: 'ABC123DEF456'
      }

      vi.spyOn(VisitorApplicationModel, 'update').mockResolvedValue(approvedApplication)

      const result = await VisitorApplicationModel.approve(
        1,
        testUser.id,
        'ABC123DEF456',
        new Date().toISOString()
      )

      expect(result).toEqual(approvedApplication)
      expect(VisitorApplicationModel.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'approved',
          approved_by: testUser.id,
          passcode: 'ABC123DEF456'
        })
      )
    })

    it('应该支持不传通行码的情况', async () => {
      vi.spyOn(VisitorApplicationModel, 'update').mockResolvedValue(testApplication)

      await VisitorApplicationModel.approve(1, testUser.id)

      expect(VisitorApplicationModel.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'approved',
          approved_by: testUser.id,
          approved_at: expect.any(String)
        })
      )
    })
  })

  describe('reject', () => {
    it('应该成功拒绝访客申请', async () => {
      const rejectedApplication = {
        ...testApplication,
        status: 'rejected',
        approved_by: testUser.id,
        rejection_reason: '不符合访问要求'
      }

      vi.spyOn(VisitorApplicationModel, 'update').mockResolvedValue(rejectedApplication)

      const result = await VisitorApplicationModel.reject(
        1,
        testUser.id,
        '不符合访问要求'
      )

      expect(result).toEqual(rejectedApplication)
      expect(VisitorApplicationModel.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'rejected',
          approved_by: testUser.id,
          rejection_reason: '不符合访问要求'
        })
      )
    })
  })

  describe('delete', () => {
    it('应该成功删除访客申请', async () => {
      mockDatabase.run.mockResolvedValue({ changes: 1 })

      const result = await VisitorApplicationModel.delete(1)

      expect(result).toBe(true)
      expect(mockDatabase.run).toHaveBeenCalledWith(
        'DELETE FROM visitor_applications WHERE id = ?',
        [1]
      )
    })

    it('应该处理删除失败的情况', async () => {
      mockDatabase.run.mockResolvedValue({ changes: 0 })

      const result = await VisitorApplicationModel.delete(999)

      expect(result).toBe(false)
    })
  })

  describe('count', () => {
    it('应该成功统计访客申请数量', async () => {
      mockDatabase.get.mockResolvedValue({ count: 10 })

      const result = await VisitorApplicationModel.count()

      expect(result).toBe(10)
      expect(mockDatabase.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count FROM visitor_applications'),
        []
      )
    })

    it('应该支持条件统计', async () => {
      mockDatabase.get.mockResolvedValue({ count: 5 })

      const result = await VisitorApplicationModel.count({
        status: 'pending',
        merchantId: testMerchant.id
      })

      expect(result).toBe(5)
      expect(mockDatabase.get).toHaveBeenCalledWith(
        expect.stringContaining('AND status = ?'),
        expect.arrayContaining(['pending', testMerchant.id])
      )
    })

    it('应该处理查询结果为空的情况', async () => {
      mockDatabase.get.mockResolvedValue(null)

      const result = await VisitorApplicationModel.count()

      expect(result).toBe(0)
    })
  })

  describe('getPendingCount', () => {
    it('应该成功获取待审批申请数量', async () => {
      vi.spyOn(VisitorApplicationModel, 'count').mockResolvedValue(5)

      const result = await VisitorApplicationModel.getPendingCount(testMerchant.id)

      expect(result).toBe(5)
      expect(VisitorApplicationModel.count).toHaveBeenCalledWith({
        status: 'pending',
        merchantId: testMerchant.id
      })
    })

    it('应该支持不传商户ID的情况', async () => {
      vi.spyOn(VisitorApplicationModel, 'count').mockResolvedValue(10)

      const result = await VisitorApplicationModel.getPendingCount()

      expect(result).toBe(10)
      expect(VisitorApplicationModel.count).toHaveBeenCalledWith({
        status: 'pending'
      })
    })
  })

  describe('getTodayCount', () => {
    it('应该成功获取今日申请数量', async () => {
      vi.spyOn(VisitorApplicationModel, 'count').mockResolvedValue(3)

      const result = await VisitorApplicationModel.getTodayCount(testMerchant.id)

      expect(result).toBe(3)
      expect(VisitorApplicationModel.count).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantId: testMerchant.id,
          dateFrom: expect.stringMatching(/\d{4}-\d{2}-\d{2} 00:00:00/),
          dateTo: expect.stringMatching(/\d{4}-\d{2}-\d{2} 23:59:59/)
        })
      )
    })
  })

  describe('validateApplicationData', () => {
    it('应该验证有效的申请数据', () => {
      const validData = {
        applicant_id: 1,
        merchant_id: 1,
        visitor_name: '张三',
        visitor_phone: '13800138000',
        visit_purpose: '商务洽谈',
        scheduled_time: new Date(Date.now() + 3600000).toISOString(),
        duration: 4,
        status: 'pending' as const
      }

      const result = VisitorApplicationModel.validateApplicationData(validData)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该验证必填字段', () => {
      const invalidData = {
        applicant_id: 0,
        merchant_id: 0,
        visitor_name: '',
        visitor_phone: '',
        visit_purpose: '',
        scheduled_time: '',
        duration: 0
      }

      const result = VisitorApplicationModel.validateApplicationData(invalidData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('申请人ID无效')
      expect(result.errors).toContain('商户ID无效')
      expect(result.errors).toContain('访客姓名不能为空')
      expect(result.errors).toContain('访客电话不能为空')
      expect(result.errors).toContain('访问目的不能为空')
      expect(result.errors).toContain('预约时间不能为空')
    })

    it('应该验证手机号格式', () => {
      const invalidPhoneData = {
        applicant_id: 1,
        merchant_id: 1,
        visitor_name: '张三',
        visitor_phone: '123',
        visit_purpose: '商务洽谈',
        scheduled_time: new Date(Date.now() + 3600000).toISOString()
      }

      const result = VisitorApplicationModel.validateApplicationData(invalidPhoneData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('访客电话格式无效')
    })

    it('应该验证预约时间不能是过去时间', () => {
      const pastTimeData = {
        applicant_id: 1,
        merchant_id: 1,
        visitor_name: '张三',
        visitor_phone: '13800138000',
        visit_purpose: '商务洽谈',
        scheduled_time: new Date(Date.now() - 3600000).toISOString() // 1小时前
      }

      const result = VisitorApplicationModel.validateApplicationData(pastTimeData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('预约时间必须是未来时间')
    })

    it('应该验证访问时长范围', () => {
      const invalidDurationData = {
        applicant_id: 1,
        merchant_id: 1,
        visitor_name: '张三',
        visitor_phone: '13800138000',
        visit_purpose: '商务洽谈',
        scheduled_time: new Date(Date.now() + 3600000).toISOString(),
        duration: 25 // 超过24小时
      }

      const result = VisitorApplicationModel.validateApplicationData(invalidDurationData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('访问时长必须在1-24小时之间')
    })

    it('应该验证申请状态', () => {
      const invalidStatusData = {
        applicant_id: 1,
        merchant_id: 1,
        visitor_name: '张三',
        visitor_phone: '13800138000',
        visit_purpose: '商务洽谈',
        scheduled_time: new Date(Date.now() + 3600000).toISOString(),
        status: 'invalid_status' as any
      }

      const result = VisitorApplicationModel.validateApplicationData(invalidStatusData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('申请状态无效')
    })
  })

  describe('exists', () => {
    it('应该检查申请是否存在', async () => {
      mockDatabase.get.mockResolvedValue({ 1: 1 })

      const result = await VisitorApplicationModel.exists(1)

      expect(result).toBe(true)
      expect(mockDatabase.get).toHaveBeenCalledWith(
        'SELECT 1 FROM visitor_applications WHERE id = ?',
        [1]
      )
    })

    it('应该处理申请不存在的情况', async () => {
      mockDatabase.get.mockResolvedValue(null)

      const result = await VisitorApplicationModel.exists(999)

      expect(result).toBe(false)
    })
  })

  describe('isPasscodeValid', () => {
    it('应该验证有效的通行码', async () => {
      const validApplication = {
        ...testApplication,
        status: 'approved',
        passcode_expiry: new Date(Date.now() + 3600000).toISOString(),
        usage_count: 0,
        usage_limit: 1
      }

      vi.spyOn(VisitorApplicationModel, 'findById').mockResolvedValue(validApplication)

      const result = await VisitorApplicationModel.isPasscodeValid(1)

      expect(result).toBe(true)
    })

    it('应该验证申请状态必须是已审批', async () => {
      const pendingApplication = {
        ...testApplication,
        status: 'pending'
      }

      vi.spyOn(VisitorApplicationModel, 'findById').mockResolvedValue(pendingApplication)

      const result = await VisitorApplicationModel.isPasscodeValid(1)

      expect(result).toBe(false)
    })

    it('应该验证通行码未过期', async () => {
      const expiredApplication = {
        ...testApplication,
        status: 'approved',
        passcode_expiry: new Date(Date.now() - 3600000).toISOString(), // 1小时前过期
        usage_count: 0,
        usage_limit: 1
      }

      vi.spyOn(VisitorApplicationModel, 'findById').mockResolvedValue(expiredApplication)

      const result = await VisitorApplicationModel.isPasscodeValid(1)

      expect(result).toBe(false)
    })

    it('应该验证使用次数未超限', async () => {
      const overUsedApplication = {
        ...testApplication,
        status: 'approved',
        passcode_expiry: new Date(Date.now() + 3600000).toISOString(),
        usage_count: 1,
        usage_limit: 1
      }

      vi.spyOn(VisitorApplicationModel, 'findById').mockResolvedValue(overUsedApplication)

      const result = await VisitorApplicationModel.isPasscodeValid(1)

      expect(result).toBe(false)
    })
  })

  describe('getExpiringApplications', () => {
    it('应该获取即将过期的申请', async () => {
      const expiringApplications = [testApplication]
      mockDatabase.all.mockResolvedValue(expiringApplications)

      const result = await VisitorApplicationModel.getExpiringApplications(24)

      expect(result).toEqual(expiringApplications)
      expect(mockDatabase.all).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = \'approved\''),
        expect.arrayContaining([expect.any(String)])
      )
    })

    it('应该使用默认的24小时时间窗口', async () => {
      mockDatabase.all.mockResolvedValue([])

      await VisitorApplicationModel.getExpiringApplications()

      expect(mockDatabase.all).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.any(String)])
      )
    })
  })

  describe('markExpiredApplications', () => {
    it('应该标记过期的申请', async () => {
      mockDatabase.run.mockResolvedValue({ changes: 3 })

      const result = await VisitorApplicationModel.markExpiredApplications()

      expect(result).toBe(3)
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE visitor_applications SET status = \'expired\'')
      )
    })
  })

  describe('findDuplicateApplication', () => {
    it('应该查找重复申请', async () => {
      const duplicateApplication = testApplication
      mockDatabase.get.mockResolvedValue(duplicateApplication)

      const scheduledTime = new Date()
      const result = await VisitorApplicationModel.findDuplicateApplication(
        '13800138000',
        testMerchant.id,
        scheduledTime
      )

      expect(result).toEqual(duplicateApplication)
      expect(mockDatabase.get).toHaveBeenCalledWith(
        expect.stringContaining('WHERE visitor_phone = ?'),
        expect.arrayContaining([
          '13800138000',
          testMerchant.id,
          expect.any(String), // startTime
          expect.any(String)  // endTime
        ])
      )
    })

    it('应该处理没有重复申请的情况', async () => {
      mockDatabase.get.mockResolvedValue(null)

      const result = await VisitorApplicationModel.findDuplicateApplication(
        '13800138000',
        testMerchant.id,
        new Date()
      )

      expect(result).toBeNull()
    })
  })

  describe('updatePasscode', () => {
    it('应该成功更新通行码', async () => {
      mockDatabase.run.mockResolvedValue({ changes: 1 })

      const result = await VisitorApplicationModel.updatePasscode(
        1,
        'NEW123PASSCODE456',
        new Date().toISOString()
      )

      expect(result).toBe(true)
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE visitor_applications SET passcode = ?, passcode_expiry = ?, usage_count = 0'),
        expect.arrayContaining(['NEW123PASSCODE456', expect.any(String), 1])
      )
    })

    it('应该处理更新失败的情况', async () => {
      mockDatabase.run.mockResolvedValue({ changes: 0 })

      const result = await VisitorApplicationModel.updatePasscode(
        999,
        'NEW123PASSCODE456',
        new Date().toISOString()
      )

      expect(result).toBe(false)
    })
  })

  describe('incrementUsageCount', () => {
    it('应该成功增加使用次数', async () => {
      mockDatabase.run.mockResolvedValue({ changes: 1 })

      const result = await VisitorApplicationModel.incrementUsageCount(1)

      expect(result).toBe(true)
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE visitor_applications SET usage_count = usage_count + 1'),
        [1]
      )
    })

    it('应该处理更新失败的情况', async () => {
      mockDatabase.run.mockResolvedValue({ changes: 0 })

      const result = await VisitorApplicationModel.incrementUsageCount(999)

      expect(result).toBe(false)
    })
  })

  describe('getFullInfo', () => {
    it('应该获取完整的申请信息', async () => {
      const fullInfo = {
        application: testApplication,
        applicant: testUser,
        merchant: testMerchant,
        visitee: null,
        approver: null
      }

      vi.spyOn(VisitorApplicationModel, 'findById').mockResolvedValue(testApplication)
      mockDatabase.get
        .mockResolvedValueOnce(testUser)     // applicant
        .mockResolvedValueOnce(testMerchant) // merchant
        .mockResolvedValueOnce(null)         // visitee
        .mockResolvedValueOnce(null)         // approver

      const result = await VisitorApplicationModel.getFullInfo(1)

      expect(result).toEqual(fullInfo)
    })

    it('应该处理申请不存在的情况', async () => {
      vi.spyOn(VisitorApplicationModel, 'findById').mockResolvedValue(null)

      const result = await VisitorApplicationModel.getFullInfo(999)

      expect(result).toBeNull()
    })

    it('应该正确处理有被访人和审批人的情况', async () => {
      const applicationWithVisiteeAndApprover = {
        ...testApplication,
        visitee_id: 2,
        approved_by: 3
      }

      const visitee = createTestUser({ id: 2, name: '被访人' })
      const approver = createTestUser({ id: 3, name: '审批人' })

      vi.spyOn(VisitorApplicationModel, 'findById').mockResolvedValue(applicationWithVisiteeAndApprover)
      mockDatabase.get
        .mockResolvedValueOnce(testUser)     // applicant
        .mockResolvedValueOnce(testMerchant) // merchant
        .mockResolvedValueOnce(visitee)      // visitee
        .mockResolvedValueOnce(approver)     // approver

      const result = await VisitorApplicationModel.getFullInfo(1)

      expect(result?.visitee).toEqual(visitee)
      expect(result?.approver).toEqual(approver)
    })
  })

  describe('batchUpdateStatus', () => {
    it('应该成功批量更新状态', async () => {
      mockDatabase.run.mockResolvedValue({ changes: 3 })

      const result = await VisitorApplicationModel.batchUpdateStatus(
        [1, 2, 3],
        'approved'
      )

      expect(result).toBe(3)
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE visitor_applications SET status = ?'),
        ['approved', 1, 2, 3]
      )
    })

    it('应该处理空ID列表', async () => {
      const result = await VisitorApplicationModel.batchUpdateStatus([], 'approved')

      expect(result).toBe(0)
      expect(mockDatabase.run).not.toHaveBeenCalled()
    })
  })

  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      mockDatabase.get.mockRejectedValue(new Error('数据库连接失败'))

      await expect(
        VisitorApplicationModel.findById(1)
      ).rejects.toThrow('数据库连接失败')
    })

    it('应该处理SQL语法错误', async () => {
      mockDatabase.run.mockRejectedValue(new Error('SQL语法错误'))

      await expect(
        VisitorApplicationModel.create({
          applicant_id: 1,
          merchant_id: 1,
          visitor_name: '张三',
          visitor_phone: '13800138000',
          visit_purpose: '商务洽谈',
          scheduled_time: new Date().toISOString(),
          duration: 4,
          status: 'pending',
          usage_limit: 1,
          usage_count: 0
        })
      ).rejects.toThrow('SQL语法错误')
    })
  })

  describe('边界条件', () => {
    it('应该处理极大的分页参数', async () => {
      mockDatabase.all.mockResolvedValue([])

      await VisitorApplicationModel.findAll({
        page: 999999,
        limit: 1000
      })

      expect(mockDatabase.all).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ? OFFSET ?'),
        expect.arrayContaining([1000, 999998000])
      )
    })

    it('应该处理特殊字符搜索', async () => {
      mockDatabase.all.mockResolvedValue([])

      await VisitorApplicationModel.findAll({
        search: "'; DROP TABLE users; --"
      })

      expect(mockDatabase.all).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          "%'; DROP TABLE users; --%",
          "%'; DROP TABLE users; --%",
          "%'; DROP TABLE users; --%",
          "%'; DROP TABLE users; --%"
        ])
      )
    })
  })
})