// 员工完整流程集成测试
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EmployeeService from '../../services/employee';

// Mock wx API
const mockWx = {
  request: vi.fn(),
  getStorageSync: vi.fn(),
  showToast: vi.fn(),
  navigateTo: vi.fn(),
};

// @ts-ignore
global.wx = mockWx;

// Mock getApp
const mockApp = {
  globalData: {
    apiBase: 'http://localhost:3000'
  }
};

// @ts-ignore
global.getApp = vi.fn(() => mockApp);

describe('Employee Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWx.getStorageSync.mockReturnValue('mock-employee-token');
  });

  describe('Employee Application and Approval Flow', () => {
    it('should complete employee application process', async () => {
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

      const merchants = await EmployeeService.getMerchants();
      expect(merchants).toEqual(mockMerchants);

      // 2. 提交员工申请
      const applicationData = {
        merchantId: 1,
        name: '张三',
        phone: '13800138000',
        department: '技术部',
        position: '软件工程师',
        idCard: '110101199001011234',
        emergencyContact: '李四',
        emergencyPhone: '13800138001'
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

      const application = await EmployeeService.submitApplication(applicationData);
      expect(application.status).toBe('pending');
      expect(application.name).toBe('张三');

      // 3. 查询申请状态 - 已通过
      const approvedApplication = {
        ...mockApplication,
        status: 'approved',
        approvedAt: '2024-01-01T10:00:00Z',
        approvedBy: 1
      };

      mockWx.request.mockImplementationOnce(({ success }) => {
        success({
          statusCode: 200,
          data: { success: true, data: approvedApplication }
        });
      });

      const currentApplication = await EmployeeService.getMyApplication();
      expect(currentApplication?.status).toBe('approved');

      // 4. 获取员工通行码
      const mockPasscode = {
        id: 1,
        userId: 1,
        code: 'EMP123456',
        type: 'employee',
        status: 'active',
        expiryTime: '2024-12-31T23:59:59Z',
        usageLimit: 999,
        usageCount: 5,
        permissions: ['all_floors', 'parking'],
        createdAt: '2024-01-01T10:30:00Z',
        updatedAt: '2024-01-01T10:30:00Z'
      };

      mockWx.request.mockImplementationOnce(({ success }) => {
        success({
          statusCode: 200,
          data: { success: true, data: mockPasscode }
        });
      });

      const passcode = await EmployeeService.getEmployeePasscode();
      expect(passcode.type).toBe('employee');
      expect(passcode.status).toBe('active');
      expect(passcode.usageLimit).toBe(999);
    });

    it('should handle application rejection', async () => {
      // 提交申请
      const applicationData = {
        merchantId: 1,
        name: '王五',
        phone: '13800138002',
        department: '销售部',
        position: '销售经理'
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

      const application = await EmployeeService.submitApplication(applicationData);
      expect(application.status).toBe('pending');

      // 查询被拒绝的申请
      const rejectedApplication = {
        ...application,
        status: 'rejected',
        rejectedAt: '2024-01-01T11:00:00Z',
        rejectReason: '不符合招聘要求'
      };

      mockWx.request.mockImplementationOnce(({ success }) => {
        success({
          statusCode: 200,
          data: { success: true, data: rejectedApplication }
        });
      });

      const currentApplication = await EmployeeService.getMyApplication();
      expect(currentApplication?.status).toBe('rejected');
      expect(currentApplication?.rejectReason).toBe('不符合招聘要求');
    });
  });

  describe('Visitor Approval Flow', () => {
    it('should handle visitor approval process', async () => {
      // 1. 获取待审批的访客申请
      const mockPendingApplications = [
        {
          id: 1,
          visitorName: '李四',
          visitorPhone: '13800138003',
          visitPurpose: '商务洽谈',
          visitType: '商务访问',
          scheduledTime: '2024-01-01T14:00:00Z',
          duration: 2,
          status: 'pending',
          createdAt: '2024-01-01T12:00:00Z'
        },
        {
          id: 2,
          visitorName: '赵六',
          visitorPhone: '13800138004',
          visitPurpose: '技术交流',
          visitType: '技术访问',
          scheduledTime: '2024-01-01T16:00:00Z',
          duration: 1,
          status: 'pending',
          createdAt: '2024-01-01T13:00:00Z'
        }
      ];

      mockWx.request.mockImplementationOnce(({ success }) => {
        success({
          statusCode: 200,
          data: { success: true, data: mockPendingApplications }
        });
      });

      const pendingApplications = await EmployeeService.getPendingVisitorApplications();
      expect(pendingApplications).toHaveLength(2);
      expect(pendingApplications[0].status).toBe('pending');

      // 2. 通过第一个申请
      mockWx.request.mockImplementationOnce(({ success }) => {
        success({
          statusCode: 200,
          data: { success: true, data: null }
        });
      });

      await expect(EmployeeService.approveVisitorApplication(1, true))
        .resolves.not.toThrow();

      // 3. 拒绝第二个申请
      mockWx.request.mockImplementationOnce(({ success }) => {
        success({
          statusCode: 200,
          data: { success: true, data: null }
        });
      });

      await expect(EmployeeService.approveVisitorApplication(2, false, '时间冲突'))
        .resolves.not.toThrow();

      // 验证请求参数
      expect(mockWx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3000/api/v1/employee/visitor-applications/1/approve',
          method: 'PUT',
          data: { approved: true, reason: undefined }
        })
      );

      expect(mockWx.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3000/api/v1/employee/visitor-applications/2/approve',
          method: 'PUT',
          data: { approved: false, reason: '时间冲突' }
        })
      );
    });

    it('should handle batch approval operations', async () => {
      const applications = [
        { id: 1, visitorName: '访客1', status: 'pending' },
        { id: 2, visitorName: '访客2', status: 'pending' },
        { id: 3, visitorName: '访客3', status: 'pending' }
      ];

      // 模拟批量审批
      const approvalResults = [];
      
      for (const app of applications) {
        mockWx.request.mockImplementationOnce(({ success }) => {
          success({
            statusCode: 200,
            data: { success: true, data: null }
          });
        });

        try {
          await EmployeeService.approveVisitorApplication(app.id, true);
          approvalResults.push({ id: app.id, success: true });
        } catch (error) {
          approvalResults.push({ id: app.id, success: false, error });
        }
      }

      expect(approvalResults).toHaveLength(3);
      expect(approvalResults.every(result => result.success)).toBe(true);
    });
  });

  describe('Passcode Management', () => {
    it('should handle passcode refresh cycle', async () => {
      // 获取当前通行码
      const currentPasscode = {
        id: 1,
        code: 'EMP001',
        status: 'active',
        updatedAt: '2024-01-01T10:00:00Z'
      };

      mockWx.request.mockImplementationOnce(({ success }) => {
        success({
          statusCode: 200,
          data: { success: true, data: currentPasscode }
        });
      });

      const passcode = await EmployeeService.getEmployeePasscode();
      expect(passcode.code).toBe('EMP001');

      // 刷新通行码
      const refreshedPasscode = {
        ...currentPasscode,
        code: 'EMP002',
        updatedAt: '2024-01-01T10:30:00Z'
      };

      mockWx.request.mockImplementationOnce(({ success }) => {
        success({
          statusCode: 200,
          data: { success: true, data: refreshedPasscode }
        });
      });

      const newPasscode = await EmployeeService.refreshEmployeePasscode();
      expect(newPasscode.code).toBe('EMP002');
      expect(new Date(newPasscode.updatedAt).getTime())
        .toBeGreaterThan(new Date(currentPasscode.updatedAt).getTime());
    });

    it('should handle passcode refresh failure', async () => {
      mockWx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 500,
          data: { 
            success: false, 
            message: '服务器错误，无法刷新通行码' 
          }
        });
      });

      await expect(EmployeeService.refreshEmployeePasscode())
        .rejects.toThrow('服务器错误，无法刷新通行码');
    });
  });

  describe('Permission and Access Control', () => {
    it('should handle unauthorized access', async () => {
      // 模拟未授权访问
      mockWx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 401,
          data: { 
            success: false, 
            message: '未授权访问' 
          }
        });
      });

      await expect(EmployeeService.getEmployeePasscode())
        .rejects.toThrow();
    });

    it('should handle insufficient permissions', async () => {
      // 模拟权限不足
      mockWx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 403,
          data: { 
            success: false, 
            message: '权限不足' 
          }
        });
      });

      await expect(EmployeeService.getPendingVisitorApplications())
        .rejects.toThrow();
    });
  });

  describe('Data Validation', () => {
    it('should validate employee application data', () => {
      const validApplications = [
        {
          merchantId: 1,
          name: '张三',
          phone: '13800138000',
          department: '技术部',
          position: '工程师'
        },
        {
          merchantId: 2,
          name: '李四',
          phone: '15912345678',
          department: '销售部',
          position: '销售经理'
        }
      ];

      const invalidApplications = [
        {
          merchantId: 0, // 无效商户ID
          name: '',
          phone: '1380013800', // 无效手机号
          department: '',
          position: ''
        }
      ];

      // 验证有效数据
      validApplications.forEach(app => {
        expect(app.merchantId).toBeGreaterThan(0);
        expect(app.name.trim()).toBeTruthy();
        expect(/^1[3-9]\d{9}$/.test(app.phone)).toBe(true);
      });

      // 验证无效数据
      invalidApplications.forEach(app => {
        expect(app.merchantId).toBeLessThanOrEqual(0);
        expect(app.name.trim()).toBeFalsy();
        expect(/^1[3-9]\d{9}$/.test(app.phone)).toBe(false);
      });
    });

    it('should validate ID card format', () => {
      const validIdCards = [
        '110101199001011234',
        '320102198812125678',
        '44030119851201567X'
      ];

      const invalidIdCards = [
        '12345678901234567', // 长度不对
        '110101199013011234', // 无效月份
        '110101199001321234', // 无效日期
        'abcd01199001011234'  // 包含字母
      ];

      const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;

      validIdCards.forEach(idCard => {
        expect(idCardRegex.test(idCard)).toBe(true);
      });

      invalidIdCards.forEach(idCard => {
        expect(idCardRegex.test(idCard)).toBe(false);
      });
    });
  });
});