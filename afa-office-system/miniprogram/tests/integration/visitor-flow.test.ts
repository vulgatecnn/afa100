// 访客完整流程集成测试
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VisitorService from '../../services/visitor';
import type { VisitorApplication, PasscodeInfo, AccessRecord } from '../../types/api';

// Mock wx API
const mockWx = {
  request: vi.fn(),
  getStorageSync: vi.fn(),
  showToast: vi.fn(),
  navigateTo: vi.fn(),
  redirectTo: vi.fn(),
};

(global as any).wx = mockWx;

// Mock getApp
const mockApp = {
  globalData: {
    apiBase: 'http://localhost:3000'
  }
};

(global as any).getApp = vi.fn(() => mockApp);

describe('Visitor Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWx.getStorageSync.mockReturnValue('mock-visitor-token');
  });

  describe('Complete Visitor Application Flow', () => {
    it('should complete full visitor application process', async () => {
      // 1. 获取商户列表
      const mockMerchants = [
        { id: 1, name: '科技公司A', code: 'TECH001' },
        { id: 2, name: '咨询公司B', code: 'CONS002' }
      ];

      mockWx.request.mockImplementationOnce(({ success }) => {
        success({
          statusCode: 200,
          data: { success: true, data: mockMerchants }
        });
      });

      const merchants = await VisitorService.getMerchants();
      expect(merchants).toEqual(mockMerchants);

      // 2. 提交访客申请
      const applicationData = {
        merchantId: 1,
        visitorName: '张三',
        visitorPhone: '13800138000',
        visitorCompany: '外部公司',
        visitPurpose: '商务洽谈',
        visitType: '商务访问',
        scheduledTime: '2024-01-01T10:00:00Z',
        duration: 2
      };

      const mockApplication = {
        id: 1,
        ...applicationData,
        status: 'pending',
        createdAt: '2024-01-01T08:00:00Z'
      };

      mockWx.request.mockImplementationOnce(({ success }) => {
        success({
          statusCode: 200,
          data: { success: true, data: mockApplication }
        });
      });

      const application = await VisitorService.submitApplication(applicationData);
      expect(application.status).toBe('pending');
      expect(application.id).toBe(1);

      // 3. 查询申请状态
      mockWx.request.mockImplementationOnce(({ success }) => {
        success({
          statusCode: 200,
          data: { 
            success: true, 
            data: [{ ...mockApplication, status: 'approved' }] 
          }
        });
      });

      const applications = await VisitorService.getMyApplications();
      expect(applications[0].status).toBe('approved');

      // 4. 获取通行码
      const mockPasscode = {
        id: 1,
        userId: 1,
        code: 'VIS123456',
        type: 'visitor',
        status: 'active',
        expiryTime: '2024-01-01T12:00:00Z',
        usageLimit: 3,
        usageCount: 0,
        permissions: ['floor_1', 'floor_2']
      };

      mockWx.request.mockImplementationOnce(({ success }) => {
        success({
          statusCode: 200,
          data: { success: true, data: mockPasscode }
        });
      });

      const passcode = await VisitorService.getPasscode(1);
      expect(passcode.code).toBe('VIS123456');
      expect(passcode.status).toBe('active');
      expect(passcode.usageCount).toBe(0);
    });

    it('should handle application rejection flow', async () => {
      // 提交申请
      const applicationData = {
        merchantId: 1,
        visitorName: '李四',
        visitorPhone: '13800138001',
        visitPurpose: '参观访问',
        visitType: '参观',
        scheduledTime: '2024-01-01T14:00:00Z',
        duration: 1
      };

      mockWx.request.mockImplementationOnce(({ success }) => {
        success({
          statusCode: 200,
          data: { 
            success: true, 
            data: { 
              id: 2, 
              ...applicationData, 
              status: 'pending' 
            } 
          }
        });
      });

      const application = await VisitorService.submitApplication(applicationData);
      expect(application.status).toBe('pending');

      // 查询被拒绝的申请
      mockWx.request.mockImplementationOnce(({ success }) => {
        success({
          statusCode: 200,
          data: { 
            success: true, 
            data: [{ 
              ...application, 
              status: 'rejected',
              rejectedAt: '2024-01-01T09:00:00Z',
              rejectReason: '时间冲突'
            }] 
          }
        });
      });

      const rejectedApplications = await VisitorService.getMyApplications('rejected');
      expect(rejectedApplications[0].status).toBe('rejected');
      expect(rejectedApplications[0].rejectReason).toBe('时间冲突');
    });

    it('should handle passcode expiration and refresh', async () => {
      // 获取过期的通行码
      const expiredPasscode = {
        id: 1,
        code: 'EXP123',
        status: 'expired',
        expiryTime: '2024-01-01T09:00:00Z',
        usageLimit: 3,
        usageCount: 1
      };

      mockWx.request.mockImplementationOnce(({ success }) => {
        success({
          statusCode: 200,
          data: { success: true, data: expiredPasscode }
        });
      });

      const passcode = await VisitorService.getPasscode(1);
      expect(passcode.status).toBe('expired');

      // 尝试刷新通行码
      const refreshedPasscode = {
        ...expiredPasscode,
        code: 'REF456',
        status: 'active',
        expiryTime: '2024-01-01T12:00:00Z',
        usageCount: 0
      };

      mockWx.request.mockImplementationOnce(({ success }) => {
        success({
          statusCode: 200,
          data: { success: true, data: refreshedPasscode }
        });
      });

      const newPasscode = await VisitorService.refreshPasscode(1);
      expect(newPasscode.status).toBe('active');
      expect(newPasscode.code).toBe('REF456');
      expect(newPasscode.usageCount).toBe(0);
    });

    it('should handle usage limit exceeded', async () => {
      // 获取使用次数已达上限的通行码
      const exhaustedPasscode = {
        id: 1,
        code: 'EXH789',
        status: 'active',
        expiryTime: '2024-01-01T12:00:00Z',
        usageLimit: 3,
        usageCount: 3
      };

      mockWx.request.mockImplementationOnce(({ success }) => {
        success({
          statusCode: 200,
          data: { success: true, data: exhaustedPasscode }
        });
      });

      const passcode = await VisitorService.getPasscode(1);
      expect(passcode.usageCount).toBe(passcode.usageLimit);

      // 尝试刷新应该失败
      mockWx.request.mockImplementationOnce(({ success }) => {
        success({
          statusCode: 400,
          data: { 
            success: false, 
            message: '通行码使用次数已达上限，无法刷新' 
          }
        });
      });

      await expect(VisitorService.refreshPasscode(1))
        .rejects.toThrow('通行码使用次数已达上限，无法刷新');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockWx.request.mockImplementation(({ fail }) => {
        fail(new Error('网络连接失败'));
      });

      await expect(VisitorService.getMerchants())
        .rejects.toThrow('网络连接失败');
    });

    it('should handle server errors', async () => {
      mockWx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 500,
          data: { error: '服务器内部错误' }
        });
      });

      await expect(VisitorService.getMerchants())
        .rejects.toThrow();
    });

    it('should handle invalid application data', async () => {
      const invalidData = {
        merchantId: 0, // 无效的商户ID
        visitorName: '',
        visitorPhone: 'invalid-phone',
        visitPurpose: '',
        visitType: '',
        scheduledTime: 'invalid-date',
        duration: -1
      };

      mockWx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 400,
          data: { 
            success: false, 
            message: '申请数据无效' 
          }
        });
      });

      await expect(VisitorService.submitApplication(invalidData))
        .rejects.toThrow('申请数据无效');
    });
  });

  describe('Data Validation', () => {
    it('should validate phone number format', () => {
      const validPhones = ['13800138000', '15912345678', '18888888888'];
      const invalidPhones = ['1380013800', '12345678901', 'abc123'];

      validPhones.forEach(phone => {
        const phoneRegex = /^1[3-9]\d{9}$/;
        expect(phoneRegex.test(phone)).toBe(true);
      });

      invalidPhones.forEach(phone => {
        const phoneRegex = /^1[3-9]\d{9}$/;
        expect(phoneRegex.test(phone)).toBe(false);
      });
    });

    it('should validate scheduled time format', () => {
      const validTimes = [
        '2024-01-01T10:00:00Z',
        '2024-12-31T23:59:59Z'
      ];

      const invalidTimes = [
        '2024-13-01T10:00:00Z', // 无效月份
        '2024-01-32T10:00:00Z', // 无效日期
        '2024-01-01T25:00:00Z', // 无效小时
        'invalid-date'
      ];

      validTimes.forEach(time => {
        expect(() => new Date(time)).not.toThrow();
        const date = new Date(time);
        expect(date.toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });

      invalidTimes.forEach(time => {
        const date = new Date(time);
        expect(isNaN(date.getTime())).toBe(true);
      });
    });
  });
});