// 访客预约完整流程端到端测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { VisitorApplication, PasscodeInfo, MerchantInfo, AccessRecord } from '../../types/api';

// Mock 微信小程序 API
const mockWx = {
  showToast: vi.fn(),
  showModal: vi.fn(),
  navigateTo: vi.fn(),
  redirectTo: vi.fn(),
  request: vi.fn(),
  getStorageSync: vi.fn(),
  setStorageSync: vi.fn(),
  removeStorageSync: vi.fn(),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),
  stopPullDownRefresh: vi.fn(),
  startPullDownRefresh: vi.fn(),
  createCanvasContext: vi.fn(() => ({
    clearRect: vi.fn(),
    setFillStyle: vi.fn(),
    fillRect: vi.fn(),
    setFontSize: vi.fn(),
    setTextAlign: vi.fn(),
    fillText: vi.fn(),
    draw: vi.fn()
  }))
};

(global as any).wx = mockWx;
(global as any).getApp = vi.fn(() => ({
  globalData: {
    apiBase: 'http://localhost:3000',
    userInfo: null
  }
}));

// Mock API Service
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  }
}));

describe('访客预约完整流程端到端测试', () => {
  let ApiService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    ApiService = (await import('../../services/api')).default;
    mockWx.getStorageSync.mockReturnValue('mock-visitor-token');
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('访客预约完整流程', () => {
    it('应该完成从申请到获得通行码的完整流程', async () => {
      const VisitorService = (await import('../../services/visitor')).default;

      // 1. 模拟获取商户列表
      const mockMerchants: MerchantInfo[] = [
        {
          id: 1,
          name: '科技创新公司',
          code: 'TECH001',
          contact: '张经理',
          phone: '13800138001',
          email: 'tech@example.com',
          address: '北京市朝阳区科技园',
          status: 'active'
        },
        {
          id: 2,
          name: '商务咨询公司',
          code: 'CONS002',
          contact: '李经理',
          phone: '13800138002',
          email: 'cons@example.com',
          address: '北京市海淀区商务区',
          status: 'active'
        }
      ];

      ApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockMerchants,
        message: '获取商户列表成功'
      });

      const merchants = await VisitorService.getMerchants();
      expect(merchants).toEqual(mockMerchants);
      expect(merchants).toHaveLength(2);
      expect(merchants[0].status).toBe('active');

      // 2. 提交访客申请
      const applicationData = {
        merchantId: 1,
        visitorName: '张三',
        visitorPhone: '13800138000',
        visitorCompany: '合作伙伴公司',
        visitPurpose: '商务洽谈',
        visitType: '商务访问',
        scheduledTime: '2024-01-02T10:00:00Z',
        duration: 2
      };

      const mockApplication: VisitorApplication = {
        id: 1,
        applicantId: 1,
        merchantId: 1,
        visitorName: '张三',
        visitorPhone: '13800138000',
        visitorCompany: '合作伙伴公司',
        visitPurpose: '商务洽谈',
        visitType: '商务访问',
        scheduledTime: '2024-01-02T10:00:00Z',
        duration: 2,
        status: 'pending',
        usageLimit: 3,
        usageCount: 0,
        createdAt: '2024-01-01T18:00:00Z',
        updatedAt: '2024-01-01T18:00:00Z'
      };

      ApiService.post.mockResolvedValueOnce({
        success: true,
        data: mockApplication,
        message: '访客申请提交成功'
      });

      const submittedApplication = await VisitorService.submitApplication(applicationData);
      expect(submittedApplication).toEqual(mockApplication);
      expect(submittedApplication.status).toBe('pending');
      expect(ApiService.post).toHaveBeenCalledWith('/api/v1/visitor/apply', applicationData);

      // 3. 模拟申请状态变更为已批准
      const approvedApplication: VisitorApplication = {
        ...mockApplication,
        status: 'approved',
        approvedBy: 2,
        approvedAt: '2024-01-02T08:00:00Z',
        passcode: 'VIS123456',
        passcodeExpiry: '2024-01-02T12:00:00Z',
        updatedAt: '2024-01-02T08:00:00Z'
      };

      ApiService.get.mockResolvedValueOnce({
        success: true,
        data: [approvedApplication],
        message: '获取申请列表成功'
      });

      const applications = await VisitorService.getMyApplications();
      expect(applications[0].status).toBe('approved');
      expect(applications[0].approvedBy).toBe(2);
      expect(applications[0].passcode).toBe('VIS123456');

      // 4. 获取通行码详细信息
      const mockPasscode: PasscodeInfo = {
        id: 1,
        userId: 1,
        code: 'VIS123456',
        type: 'visitor',
        status: 'active',
        expiryTime: '2024-01-02T12:00:00Z',
        usageLimit: 3,
        usageCount: 0,
        permissions: ['building_access', 'floor_1', 'floor_2'],
        createdAt: '2024-01-02T08:00:00Z',
        updatedAt: '2024-01-02T08:00:00Z'
      };

      ApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockPasscode,
        message: '获取通行码成功'
      });

      const passcode = await VisitorService.getPasscode(1);
      expect(passcode).toEqual(mockPasscode);
      expect(passcode.type).toBe('visitor');
      expect(passcode.status).toBe('active');
      expect(passcode.usageLimit).toBe(3);
      expect(passcode.permissions).toContain('building_access');

      // 5. 模拟通行码使用
      const usedPasscode: PasscodeInfo = {
        ...mockPasscode,
        usageCount: 1,
        updatedAt: '2024-01-02T10:30:00Z'
      };

      ApiService.get.mockResolvedValueOnce({
        success: true,
        data: usedPasscode,
        message: '获取通行码成功'
      });

      const updatedPasscode = await VisitorService.getPasscode(1);
      expect(updatedPasscode.usageCount).toBe(1);
      expect(updatedPasscode.usageLimit - updatedPasscode.usageCount).toBe(2);
    });

    it('应该正确处理申请被拒绝的情况', async () => {
      const VisitorService = (await import('../../services/visitor')).default;

      // 模拟申请被拒绝
      const rejectedApplication: VisitorApplication = {
        id: 2,
        applicantId: 1,
        merchantId: 1,
        visitorName: '李四',
        visitorPhone: '13800138002',
        visitorCompany: '外部公司',
        visitPurpose: '参观访问',
        visitType: '参观',
        scheduledTime: '2024-01-02T14:00:00Z',
        duration: 1,
        status: 'rejected',
        approvedBy: 2,
        approvedAt: '2024-01-02T09:00:00Z',
        usageLimit: 0,
        usageCount: 0,
        createdAt: '2024-01-01T20:00:00Z',
        updatedAt: '2024-01-02T09:00:00Z'
      };

      ApiService.get.mockResolvedValue({
        success: true,
        data: [rejectedApplication],
        message: '获取申请列表成功'
      });

      const applications = await VisitorService.getMyApplications('rejected');
      expect(applications[0].status).toBe('rejected');
      expect(applications[0].approvedBy).toBe(2);

      // 被拒绝的申请不应该能获取通行码
      ApiService.get.mockResolvedValueOnce({
        success: false,
        message: '申请未通过，无法获取通行码',
        code: 4003
      });

      await expect(VisitorService.getPasscode(2))
        .rejects.toThrow('申请未通过，无法获取通行码');
    });

    it('应该处理通行码过期和刷新', async () => {
      const VisitorService = (await import('../../services/visitor')).default;

      // 模拟过期的通行码
      const expiredPasscode: PasscodeInfo = {
        id: 1,
        userId: 1,
        code: 'EXP123456',
        type: 'visitor',
        status: 'expired',
        expiryTime: '2024-01-02T09:00:00Z',
        usageLimit: 3,
        usageCount: 2,
        permissions: ['building_access'],
        createdAt: '2024-01-02T08:00:00Z',
        updatedAt: '2024-01-02T09:00:00Z'
      };

      ApiService.get.mockResolvedValueOnce({
        success: true,
        data: expiredPasscode,
        message: '获取通行码成功'
      });

      const passcode = await VisitorService.getPasscode(1);
      expect(passcode.status).toBe('expired');

      // 尝试刷新通行码
      const refreshedPasscode: PasscodeInfo = {
        ...expiredPasscode,
        code: 'REF789012',
        status: 'active',
        expiryTime: '2024-01-02T14:00:00Z',
        usageCount: 0,
        updatedAt: '2024-01-02T10:00:00Z'
      };

      ApiService.post.mockResolvedValueOnce({
        success: true,
        data: refreshedPasscode,
        message: '通行码刷新成功'
      });

      const newPasscode = await VisitorService.refreshPasscode(1);
      expect(newPasscode.status).toBe('active');
      expect(newPasscode.code).toBe('REF789012');
      expect(newPasscode.usageCount).toBe(0);
    });

    it('应该处理使用次数达到上限的情况', async () => {
      const VisitorService = (await import('../../services/visitor')).default;

      // 模拟使用次数已达上限的通行码
      const exhaustedPasscode: PasscodeInfo = {
        id: 1,
        userId: 1,
        code: 'EXH123456',
        type: 'visitor',
        status: 'active',
        expiryTime: '2024-01-02T12:00:00Z',
        usageLimit: 3,
        usageCount: 3,
        permissions: ['building_access'],
        createdAt: '2024-01-02T08:00:00Z',
        updatedAt: '2024-01-02T11:00:00Z'
      };

      ApiService.get.mockResolvedValueOnce({
        success: true,
        data: exhaustedPasscode,
        message: '获取通行码成功'
      });

      const passcode = await VisitorService.getPasscode(1);
      expect(passcode.usageCount).toBe(passcode.usageLimit);

      // 尝试刷新应该失败
      ApiService.post.mockResolvedValueOnce({
        success: false,
        message: '通行码使用次数已达上限，无法刷新',
        code: 4004
      });

      await expect(VisitorService.refreshPasscode(1))
        .rejects.toThrow('通行码使用次数已达上限，无法刷新');
    });
  });

  describe('通行记录查询功能', () => {
    it('应该能够查询和统计通行记录', async () => {
      const VisitorService = (await import('../../services/visitor')).default;

      // 模拟通行记录数据
      const mockRecords: AccessRecord[] = [
        {
          id: 1,
          userId: 1,
          passcodeId: 1,
          deviceId: 'DEVICE001',
          deviceType: '门禁',
          direction: 'in',
          result: 'success',
          location: { projectId: 1, venueId: 1, floorId: 1 },
          timestamp: '2024-01-02T10:00:00Z'
        },
        {
          id: 2,
          userId: 1,
          passcodeId: 1,
          deviceId: 'DEVICE001',
          deviceType: '门禁',
          direction: 'out',
          result: 'success',
          location: { projectId: 1, venueId: 1, floorId: 1 },
          timestamp: '2024-01-02T12:00:00Z'
        },
        {
          id: 3,
          userId: 1,
          passcodeId: 1,
          deviceId: 'DEVICE002',
          deviceType: '门禁',
          direction: 'in',
          result: 'failed',
          failReason: '通行码已过期',
          location: { projectId: 1, venueId: 1, floorId: 2 },
          timestamp: '2024-01-02T13:00:00Z'
        }
      ];

      ApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockRecords,
        message: '获取通行记录成功'
      });

      const records = await VisitorService.getAccessHistory(1, '2024-01-02', '2024-01-02');
      expect(records).toHaveLength(3);

      // 验证记录内容
      expect(records[0].result).toBe('success');
      expect(records[0].direction).toBe('in');
      expect(records[2].result).toBe('failed');
      expect(records[2].failReason).toBe('通行码已过期');

      // 统计成功和失败次数
      const successCount = records.filter(r => r.result === 'success').length;
      const failedCount = records.filter(r => r.result === 'failed').length;
      
      expect(successCount).toBe(2);
      expect(failedCount).toBe(1);
    });
  });

  describe('数据验证测试', () => {
    it('应该验证访客申请数据格式', () => {
      // 验证手机号格式
      const phoneRegex = /^1[3-9]\d{9}$/;
      
      const validPhones = ['13800138000', '15912345678', '18888888888'];
      const invalidPhones = ['1380013800', '12345678901', 'abc123'];

      validPhones.forEach(phone => {
        expect(phoneRegex.test(phone)).toBe(true);
      });

      invalidPhones.forEach(phone => {
        expect(phoneRegex.test(phone)).toBe(false);
      });

      // 验证预约时间格式
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
        const date = new Date(time);
        expect(isNaN(date.getTime())).toBe(false);
        expect(date.toISOString()).toBe(time);
      });

      invalidTimes.forEach(time => {
        const date = new Date(time);
        expect(isNaN(date.getTime())).toBe(true);
      });
    });

    it('应该验证申请数据完整性', () => {
      const requiredFields = ['merchantId', 'visitorName', 'visitorPhone', 'visitPurpose', 'visitType', 'scheduledTime', 'duration'];
      
      const validApplication = {
        merchantId: 1,
        visitorName: '张三',
        visitorPhone: '13800138000',
        visitPurpose: '商务洽谈',
        visitType: '商务访问',
        scheduledTime: '2024-01-02T10:00:00Z',
        duration: 2
      };

      const invalidApplications = [
        { merchantId: 0, visitorName: '', visitorPhone: '', visitPurpose: '', visitType: '', scheduledTime: '', duration: 0 }, // 所有必填字段都无效
        { merchantId: 1, visitorName: '张三', visitorPhone: '1380013800', visitPurpose: '商务洽谈', visitType: '商务访问', scheduledTime: '2024-01-02T10:00:00Z', duration: 2 }, // 手机号无效
        { visitorName: '张三', visitorPhone: '13800138000', visitPurpose: '商务洽谈', visitType: '商务访问', scheduledTime: '2024-01-02T10:00:00Z', duration: 2 } // 缺少merchantId
      ];

      // 验证有效申请
      requiredFields.forEach(field => {
        expect(validApplication[field as keyof typeof validApplication]).toBeTruthy();
      });

      // 验证无效申请
      invalidApplications.forEach(app => {
        const hasInvalidField = requiredFields.some(field => {
          const value = app[field as keyof typeof app];
          return !value || (field === 'merchantId' && value <= 0) || (field === 'duration' && value <= 0);
        });
        expect(hasInvalidField).toBe(true);
      });
    });
  });

  describe('错误处理测试', () => {
    it('应该处理网络连接错误', async () => {
      const VisitorService = (await import('../../services/visitor')).default;

      // 模拟网络错误
      ApiService.get.mockRejectedValue(new Error('网络连接失败'));

      await expect(VisitorService.getMerchants())
        .rejects.toThrow('网络连接失败');
    });

    it('应该处理服务器错误响应', async () => {
      const VisitorService = (await import('../../services/visitor')).default;

      // 模拟服务器内部错误
      ApiService.post.mockResolvedValue({
        success: false,
        message: '服务器内部错误',
        code: 5000
      });

      const applicationData = {
        merchantId: 1,
        visitorName: '张三',
        visitorPhone: '13800138000',
        visitPurpose: '商务洽谈',
        visitType: '商务访问',
        scheduledTime: '2024-01-02T10:00:00Z',
        duration: 2
      };

      await expect(VisitorService.submitApplication(applicationData))
        .rejects.toThrow('服务器内部错误');
    });

    it('应该处理认证失效的情况', async () => {
      const VisitorService = (await import('../../services/visitor')).default;

      // 模拟认证失效
      ApiService.get.mockResolvedValue({
        success: false,
        message: '登录已过期，请重新登录',
        code: 4001
      });

      await expect(VisitorService.getPasscode(1))
        .rejects.toThrow('登录已过期，请重新登录');
    });
  });

  describe('用户体验测试', () => {
    it('应该正确格式化时间显示', () => {
      const formatDateTime = (dateTimeStr: string): string => {
        const date = new Date(dateTimeStr);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hour = date.getHours();
        const minute = date.getMinutes();
        
        return `${year}年${month}月${day}日 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      };

      const testCases = [
        {
          input: '2024-01-02T10:00:00Z',
          expected: /2024年1月2日 \d{2}:\d{2}/
        },
        {
          input: '2024-12-25T15:45:00Z',
          expected: /2024年12月25日 \d{2}:\d{2}/
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = formatDateTime(input);
        expect(result).toMatch(expected);
      });
    });

    it('应该正确显示申请状态文本', () => {
      const getStatusText = (status: string): string => {
        const statusMap: Record<string, string> = {
          pending: '待审批',
          approved: '已通过',
          rejected: '已拒绝',
          expired: '已过期'
        };
        return statusMap[status] || '未知状态';
      };

      expect(getStatusText('pending')).toBe('待审批');
      expect(getStatusText('approved')).toBe('已通过');
      expect(getStatusText('rejected')).toBe('已拒绝');
      expect(getStatusText('expired')).toBe('已过期');
      expect(getStatusText('unknown')).toBe('未知状态');
    });

    it('应该正确计算剩余使用次数', () => {
      const calculateRemainingUsage = (usageLimit: number, usageCount: number): number => {
        return Math.max(0, usageLimit - usageCount);
      };

      expect(calculateRemainingUsage(3, 1)).toBe(2);
      expect(calculateRemainingUsage(3, 3)).toBe(0);
      expect(calculateRemainingUsage(3, 5)).toBe(0); // 不能为负数
    });

    it('应该正确判断通行码状态', () => {
      const getPasscodeStatus = (passcode: PasscodeInfo): string => {
        const now = new Date();
        const expiryTime = new Date(passcode.expiryTime);
        
        if (passcode.status === 'expired' || now > expiryTime) {
          return '已过期';
        }
        
        if (passcode.usageCount >= passcode.usageLimit) {
          return '使用次数已用完';
        }
        
        if (passcode.status === 'active') {
          return '可使用';
        }
        
        return '不可用';
      };

      const activePasscode: PasscodeInfo = {
        id: 1,
        userId: 1,
        code: 'TEST123',
        type: 'visitor',
        status: 'active',
        expiryTime: '2025-12-31T23:59:59Z', // 未来时间
        usageLimit: 3,
        usageCount: 1,
        permissions: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const expiredPasscode: PasscodeInfo = {
        ...activePasscode,
        status: 'expired'
      };

      const exhaustedPasscode: PasscodeInfo = {
        ...activePasscode,
        usageCount: 3
      };

      expect(getPasscodeStatus(activePasscode)).toBe('可使用');
      expect(getPasscodeStatus(expiredPasscode)).toBe('已过期');
      expect(getPasscodeStatus(exhaustedPasscode)).toBe('使用次数已用完');
    });
  });

  describe('通行码展示实时性测试', () => {
    it('应该实时更新通行码状态', async () => {
      const VisitorService = (await import('../../services/visitor')).default;

      // 模拟页面数据
      const pageData = {
        passcodeInfo: null as PasscodeInfo | null,
        refreshing: false,
        autoRefreshTimer: null as any
      };

      // 初始获取通行码
      const initialPasscode: PasscodeInfo = {
        id: 1,
        userId: 1,
        code: 'REAL001',
        type: 'visitor',
        status: 'active',
        expiryTime: '2024-01-02T12:00:00Z',
        usageLimit: 3,
        usageCount: 0,
        permissions: ['building_access'],
        createdAt: '2024-01-02T08:00:00Z',
        updatedAt: '2024-01-02T08:00:00Z'
      };

      ApiService.get.mockResolvedValueOnce({
        success: true,
        data: initialPasscode,
        message: '获取通行码成功'
      });

      pageData.passcodeInfo = await VisitorService.getPasscode(1);
      expect(pageData.passcodeInfo.usageCount).toBe(0);

      // 模拟状态检查 - 使用次数增加
      const updatedPasscode: PasscodeInfo = {
        ...initialPasscode,
        usageCount: 1,
        updatedAt: '2024-01-02T10:30:00Z'
      };

      ApiService.get.mockResolvedValueOnce({
        success: true,
        data: updatedPasscode,
        message: '获取通行码成功'
      });

      // 模拟自动检查状态的函数
      const checkPasscodeStatus = async () => {
        const latestPasscode = await VisitorService.getPasscode(1);
        
        // 如果状态发生变化，更新页面数据
        if (latestPasscode.usageCount !== pageData.passcodeInfo?.usageCount) {
          pageData.passcodeInfo = latestPasscode;
        }
      };

      await checkPasscodeStatus();
      expect(pageData.passcodeInfo.usageCount).toBe(1);

      // 模拟通行码过期
      const expiredPasscode: PasscodeInfo = {
        ...updatedPasscode,
        status: 'expired',
        updatedAt: '2024-01-02T12:01:00Z'
      };

      ApiService.get.mockResolvedValueOnce({
        success: true,
        data: expiredPasscode,
        message: '获取通行码成功'
      });

      await checkPasscodeStatus();
      expect(pageData.passcodeInfo.status).toBe('expired');
    });

    it('应该正确处理通行码刷新的实时更新', async () => {
      const VisitorService = (await import('../../services/visitor')).default;

      // 模拟刷新前的通行码
      const oldPasscode: PasscodeInfo = {
        id: 1,
        userId: 1,
        code: 'OLD123',
        type: 'visitor',
        status: 'active',
        expiryTime: '2024-01-02T11:00:00Z',
        usageLimit: 3,
        usageCount: 2,
        permissions: ['building_access'],
        createdAt: '2024-01-02T08:00:00Z',
        updatedAt: '2024-01-02T10:00:00Z'
      };

      // 模拟刷新后的通行码
      const newPasscode: PasscodeInfo = {
        ...oldPasscode,
        code: 'NEW456',
        expiryTime: '2024-01-02T15:00:00Z',
        usageCount: 0,
        updatedAt: '2024-01-02T11:00:00Z'
      };

      ApiService.post.mockResolvedValueOnce({
        success: true,
        data: newPasscode,
        message: '通行码刷新成功'
      });

      const refreshedPasscode = await VisitorService.refreshPasscode(1);
      
      expect(refreshedPasscode.code).toBe('NEW456');
      expect(refreshedPasscode.usageCount).toBe(0);
      expect(new Date(refreshedPasscode.updatedAt).getTime())
        .toBeGreaterThan(new Date(oldPasscode.updatedAt).getTime());
    });
  });
});