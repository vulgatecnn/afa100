import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { AccessController } from '../../../src/controllers/access.controller.js';
import { PasscodeService } from '../../../src/services/passcode.service.js';
import { AccessRecordService } from '../../../src/services/access-record.service.js';
import type { PasscodeValidationResult } from '../../../src/services/passcode.service.js';

// Mock 服务
vi.mock('../../../src/services/passcode.service.js');
vi.mock('../../../src/services/access-record.service.js');

// Mock the asyncHandler middleware
vi.mock('../../../src/middleware/error.middleware.js', () => ({
  asyncHandler: (fn: Function) => fn
}));

describe('AccessController', () => {
  let accessController: AccessController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    accessController = new AccessController();
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    mockNext = vi.fn();
    
    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: undefined
    };
    
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validatePasscode', () => {
    it('应该成功验证有效的通行码', async () => {
      const mockValidationResult: PasscodeValidationResult = {
        valid: true,
        userId: 1,
        userName: '测试用户',
        userType: 'employee',
        passcodeId: 1,
        permissions: ['basic_access']
      };

      mockRequest.body = {
        code: 'TEST123456',
        deviceId: 'device001',
        direction: 'in',
        deviceType: 'door_scanner',
        projectId: 1,
        venueId: 1,
        floorId: 1
      };

      vi.mocked(PasscodeService.validatePasscode).mockResolvedValue(mockValidationResult);
      vi.mocked(AccessRecordService.recordAccess).mockResolvedValue({} as any);

      await accessController.validatePasscode(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(PasscodeService.validatePasscode).toHaveBeenCalledWith('TEST123456', 'device001');
      expect(AccessRecordService.recordAccess).toHaveBeenCalledWith({
        userId: 1,
        passcodeId: 1,
        deviceId: 'device001',
        deviceType: 'door_scanner',
        direction: 'in',
        result: 'success',
        projectId: 1,
        venueId: 1,
        floorId: 1,
        timestamp: expect.any(String)
      });

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: '通行验证成功',
        data: {
          valid: true,
          userId: 1,
          userName: '测试用户',
          userType: 'employee',
          permissions: ['basic_access'],
          reason: undefined,
          timestamp: expect.any(String)
        },
        timestamp: expect.any(String)
      });
    });

    it('应该处理无效的通行码', async () => {
      const mockValidationResult: PasscodeValidationResult = {
        valid: false,
        reason: '通行码已过期'
      };

      mockRequest.body = {
        code: 'EXPIRED123',
        deviceId: 'device001',
        direction: 'in'
      };

      vi.mocked(PasscodeService.validatePasscode).mockResolvedValue(mockValidationResult);
      vi.mocked(AccessRecordService.recordAccess).mockResolvedValue({} as any);

      await accessController.validatePasscode(mockRequest as Request, mockResponse as Response, mockNext);

      expect(AccessRecordService.recordAccess).toHaveBeenCalledWith({
        userId: 0,
        passcodeId: undefined,
        deviceId: 'device001',
        deviceType: undefined,
        direction: 'in',
        result: 'failed',
        failReason: '通行码已过期',
        projectId: undefined,
        venueId: undefined,
        floorId: undefined,
        timestamp: expect.any(String)
      });

      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: '通行码已过期',
        data: {
          valid: false,
          userId: undefined,
          userName: undefined,
          userType: undefined,
          permissions: undefined,
          reason: '通行码已过期',
          timestamp: expect.any(String)
        },
        timestamp: expect.any(String)
      });
    });

    it('应该在缺少必需参数时返回400错误', async () => {
      mockRequest.body = {
        code: 'TEST123456'
        // 缺少 deviceId
      };

      await accessController.validatePasscode(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: '通行码和设备ID不能为空',
        data: null,
        timestamp: expect.any(String)
      });
    });
  });

  describe('validateQRPasscode', () => {
    it('应该成功验证二维码通行码', async () => {
      const mockValidationResult: PasscodeValidationResult = {
        valid: true,
        userId: 1,
        userName: '测试用户',
        userType: 'employee',
        permissions: ['basic_access']
      };

      mockRequest.body = {
        qrContent: 'encrypted_qr_content',
        deviceId: 'device001',
        direction: 'in'
      };

      vi.mocked(PasscodeService.validateQRPasscode).mockResolvedValue(mockValidationResult);
      vi.mocked(AccessRecordService.recordAccess).mockResolvedValue({} as any);

      await accessController.validateQRPasscode(mockRequest as Request, mockResponse as Response, mockNext);

      expect(PasscodeService.validateQRPasscode).toHaveBeenCalledWith('encrypted_qr_content', 'device001');
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '二维码验证成功'
        })
      );
    });

    it('应该在缺少二维码内容时返回400错误', async () => {
      mockRequest.body = {
        deviceId: 'device001'
        // 缺少 qrContent
      };

      await accessController.validateQRPasscode(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: '二维码内容和设备ID不能为空',
        data: null,
        timestamp: expect.any(String)
      });
    });
  });

  describe('validateTimeBasedPasscode', () => {
    it('应该成功验证时效性通行码', async () => {
      const mockValidationResult: PasscodeValidationResult = {
        valid: true,
        userId: 1,
        userName: '测试用户',
        userType: 'employee',
        permissions: ['basic_access']
      };

      mockRequest.body = {
        timeBasedCode: 'TIME123',
        baseCode: 'BASE123',
        deviceId: 'device001',
        direction: 'in'
      };

      vi.mocked(PasscodeService.validateTimeBasedPasscode).mockResolvedValue(mockValidationResult);
      vi.mocked(AccessRecordService.recordAccess).mockResolvedValue({} as any);

      await accessController.validateTimeBasedPasscode(mockRequest as Request, mockResponse as Response, mockNext);

      expect(PasscodeService.validateTimeBasedPasscode).toHaveBeenCalledWith('TIME123', 'BASE123', 'device001');
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '时效性通行码验证成功'
        })
      );
    });

    it('应该在缺少必需参数时返回400错误', async () => {
      mockRequest.body = {
        timeBasedCode: 'TIME123',
        deviceId: 'device001'
        // 缺少 baseCode
      };

      await accessController.validateTimeBasedPasscode(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: '时效性通行码、基础码和设备ID不能为空',
        data: null,
        timestamp: expect.any(String)
      });
    });
  });

  describe('getAccessRecords', () => {
    it('应该返回通行记录列表', async () => {
      const mockRecords = {
        data: [
          {
            id: 1,
            user_id: 1,
            device_id: 'device001',
            direction: 'in',
            result: 'success',
            timestamp: '2024-01-01T00:00:00Z'
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      mockRequest.query = {
        page: '1',
        limit: '10',
        userId: '1',
        deviceId: 'device001',
        result: 'success'
      };

      vi.mocked(AccessRecordService.getAccessRecords).mockResolvedValue(mockRecords);

      await accessController.getAccessRecords(mockRequest as Request, mockResponse as Response, mockNext);

      expect(AccessRecordService.getAccessRecords).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        userId: 1,
        deviceId: 'device001',
        result: 'success',
        startDate: undefined,
        endDate: undefined,
        sortBy: undefined,
        sortOrder: undefined
      });

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: '获取通行记录成功',
        data: mockRecords,
        timestamp: expect.any(String)
      });
    });
  });

  describe('getUserAccessRecords', () => {
    it('应该返回指定用户的通行记录', async () => {
      const mockRecords = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      };

      mockRequest.params = { userId: '1' };
      mockRequest.query = { page: '1', limit: '10' };

      vi.mocked(AccessRecordService.getUserAccessRecords).mockResolvedValue(mockRecords);

      await accessController.getUserAccessRecords(mockRequest as Request, mockResponse as Response, mockNext);

      expect(AccessRecordService.getUserAccessRecords).toHaveBeenCalledWith(1, {
        page: 1,
        limit: 10,
        startDate: undefined,
        endDate: undefined,
        sortBy: undefined,
        sortOrder: undefined
      });

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: '获取用户通行记录成功',
        data: mockRecords,
        timestamp: expect.any(String)
      });
    });

    it('应该在缺少用户ID时返回400错误', async () => {
      mockRequest.params = {}; // 缺少 userId

      await accessController.getUserAccessRecords(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: '用户ID不能为空',
        data: null,
        timestamp: expect.any(String)
      });
    });
  });

  describe('getDeviceAccessRecords', () => {
    it('应该返回指定设备的通行记录', async () => {
      const mockRecords = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      };

      mockRequest.params = { deviceId: 'device001' };
      mockRequest.query = { page: '1', limit: '10' };

      vi.mocked(AccessRecordService.getDeviceAccessRecords).mockResolvedValue(mockRecords);

      await accessController.getDeviceAccessRecords(mockRequest as Request, mockResponse as Response, mockNext);

      expect(AccessRecordService.getDeviceAccessRecords).toHaveBeenCalledWith('device001', {
        page: 1,
        limit: 10,
        startDate: undefined,
        endDate: undefined,
        sortBy: undefined,
        sortOrder: undefined
      });

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: '获取设备通行记录成功',
        data: mockRecords,
        timestamp: expect.any(String)
      });
    });

    it('应该在缺少设备ID时返回400错误', async () => {
      mockRequest.params = {}; // 缺少 deviceId

      await accessController.getDeviceAccessRecords(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: '设备ID不能为空',
        data: null,
        timestamp: expect.any(String)
      });
    });
  });

  describe('getAccessStats', () => {
    it('应该返回通行统计信息', async () => {
      const mockStats = {
        total: 100,
        success: 90,
        failed: 10,
        successRate: 90.0,
        byHour: [],
        byDevice: [],
        byUserType: [],
        recentActivity: []
      };

      mockRequest.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        merchantId: '1',
        deviceId: 'device001'
      };

      vi.mocked(AccessRecordService.getAccessStats).mockResolvedValue(mockStats);

      await accessController.getAccessStats(mockRequest as Request, mockResponse as Response, mockNext);

      expect(AccessRecordService.getAccessStats).toHaveBeenCalledWith({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        merchantId: 1,
        deviceId: 'device001'
      });

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: '获取通行统计信息成功',
        data: mockStats,
        timestamp: expect.any(String)
      });
    });
  });

  describe('getRealtimeStatus', () => {
    it('应该返回实时通行状态', async () => {
      const mockStatus = {
        deviceId: 'device001',
        isOnline: true,
        lastActivity: '2024-01-01T00:00:00Z',
        todayCount: 50,
        currentHourCount: 5
      };

      mockRequest.query = { deviceId: 'device001' };

      vi.mocked(AccessRecordService.getRealtimeStatus).mockResolvedValue(mockStatus);

      await accessController.getRealtimeStatus(mockRequest as Request, mockResponse as Response, mockNext);

      expect(AccessRecordService.getRealtimeStatus).toHaveBeenCalledWith('device001');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: '获取实时通行状态成功',
        data: mockStatus,
        timestamp: expect.any(String)
      });
    });
  });

  describe('getPasscodeInfo', () => {
    it('应该返回通行码信息', async () => {
      const mockInfo = {
        id: 1,
        type: 'employee',
        status: 'active',
        expiryTime: '2024-01-02T00:00:00Z',
        usageLimit: 10,
        usageCount: 5,
        permissions: ['basic_access'],
        user: {
          id: 1,
          name: '测试用户',
          userType: 'employee'
        }
      };

      mockRequest.params = { code: 'TEST123456' };

      vi.mocked(PasscodeService.getPasscodeInfo).mockResolvedValue(mockInfo);

      await accessController.getPasscodeInfo(mockRequest as Request, mockResponse as Response, mockNext);

      expect(PasscodeService.getPasscodeInfo).toHaveBeenCalledWith('TEST123456');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: '获取通行码信息成功',
        data: mockInfo,
        timestamp: expect.any(String)
      });
    });

    it('应该在缺少通行码时返回400错误', async () => {
      mockRequest.params = {}; // 缺少 code

      await accessController.getPasscodeInfo(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: '通行码不能为空',
        data: null,
        timestamp: expect.any(String)
      });
    });
  });

  describe('refreshPasscode', () => {
    it('应该成功刷新用户通行码', async () => {
      const mockPasscode = {
        id: 1,
        user_id: 1,
        code: 'NEW123456',
        type: 'employee',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockRequest.user = { userId: 1 };

      vi.mocked(PasscodeService.refreshPasscode).mockResolvedValue(mockPasscode as any);

      await accessController.refreshPasscode(mockRequest as Request, mockResponse as Response, mockNext);

      expect(PasscodeService.refreshPasscode).toHaveBeenCalledWith(1);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: '刷新通行码成功',
        data: mockPasscode,
        timestamp: expect.any(String)
      });
    });

    it('应该在用户未认证时返回401错误', async () => {
      mockRequest.user = undefined; // 未认证

      await accessController.refreshPasscode(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: '用户未认证',
        data: null,
        timestamp: expect.any(String)
      });
    });
  });

  describe('getCurrentPasscode', () => {
    it('应该返回用户当前通行码', async () => {
      const mockPasscode = {
        id: 1,
        user_id: 1,
        code: 'CURRENT123456',
        type: 'employee',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockRequest.user = { userId: 1 };

      vi.mocked(PasscodeService.getCurrentPasscode).mockResolvedValue(mockPasscode as any);

      await accessController.getCurrentPasscode(mockRequest as Request, mockResponse as Response, mockNext);

      expect(PasscodeService.getCurrentPasscode).toHaveBeenCalledWith(1);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: '获取当前通行码成功',
        data: mockPasscode,
        timestamp: expect.any(String)
      });
    });

    it('应该在用户未认证时返回401错误', async () => {
      mockRequest.user = undefined; // 未认证

      await accessController.getCurrentPasscode(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: '用户未认证',
        data: null,
        timestamp: expect.any(String)
      });
    });
  });
});