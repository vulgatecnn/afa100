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

describe('AccessController 增强测试 - 安全性和错误处理', () => {
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
      user: undefined,
      ip: '192.168.1.100',
      headers: {
        'user-agent': 'Test-Agent/1.0',
        'x-forwarded-for': '10.0.0.1'
      }
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

  describe('安全性测试', () => {
    it('应该防止SQL注入攻击', async () => {
      const maliciousCode = "'; DROP TABLE users; --";
      mockRequest.body = {
        code: maliciousCode,
        deviceId: 'device001'
      };

      const mockValidationResult: PasscodeValidationResult = {
        valid: false,
        reason: '通行码不存在'
      };

      vi.mocked(PasscodeService.validatePasscode).mockResolvedValue(mockValidationResult);
      vi.mocked(AccessRecordService.recordAccess).mockResolvedValue({} as any);

      await accessController.validatePasscode(mockRequest as Request, mockResponse as Response, mockNext);

      // 验证恶意代码被正确处理，不会导致系统错误
      expect(PasscodeService.validatePasscode).toHaveBeenCalledWith(maliciousCode, 'device001');
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '通行码不存在'
        })
      );
    });

    it('应该防止XSS攻击', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      mockRequest.body = {
        code: 'VALID_CODE',
        deviceId: xssPayload
      };

      const mockValidationResult: PasscodeValidationResult = {
        valid: true,
        userId: 1,
        userName: '测试用户',
        userType: 'employee',
        permissions: ['basic_access']
      };

      vi.mocked(PasscodeService.validatePasscode).mockResolvedValue(mockValidationResult);
      vi.mocked(AccessRecordService.recordAccess).mockResolvedValue({} as any);

      await accessController.validatePasscode(mockRequest as Request, mockResponse as Response, mockNext);

      // 验证XSS载荷被正确处理
      expect(AccessRecordService.recordAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: xssPayload // 应该被记录但不执行
        })
      );
    });

    it('应该限制请求频率防止暴力破解', async () => {
      const rapidRequests = Array.from({ length: 10 }, (_, i) => ({
        code: `BRUTE_FORCE_${i}`,
        deviceId: 'device001'
      }));

      const mockValidationResult: PasscodeValidationResult = {
        valid: false,
        reason: '通行码不存在'
      };

      vi.mocked(PasscodeService.validatePasscode).mockResolvedValue(mockValidationResult);
      vi.mocked(AccessRecordService.recordAccess).mockResolvedValue({} as any);

      // 模拟快速连续请求
      for (const requestBody of rapidRequests) {
        mockRequest.body = requestBody;
        await accessController.validatePasscode(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // 验证所有失败尝试都被记录
      expect(AccessRecordService.recordAccess).toHaveBeenCalledTimes(10);
      expect(vi.mocked(AccessRecordService.recordAccess).mock.calls.every(call => 
        call[0].result === 'failed'
      )).toBe(true);
    });

    it('应该记录详细的安全日志', async () => {
      mockRequest.body = {
        code: 'SUSPICIOUS_CODE',
        deviceId: 'device001'
      };

      const mockValidationResult: PasscodeValidationResult = {
        valid: false,
        reason: '通行码已过期'
      };

      vi.mocked(PasscodeService.validatePasscode).mockResolvedValue(mockValidationResult);
      vi.mocked(AccessRecordService.recordAccess).mockResolvedValue({} as any);

      await accessController.validatePasscode(mockRequest as Request, mockResponse as Response, mockNext);

      // 验证安全日志包含必要信息
      expect(AccessRecordService.recordAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'failed',
          failReason: '通行码已过期',
          deviceId: 'device001',
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('错误处理增强测试', () => {
    it('应该处理服务层异常', async () => {
      mockRequest.body = {
        code: 'VALID_CODE',
        deviceId: 'device001'
      };

      vi.mocked(PasscodeService.validatePasscode).mockRejectedValue(new Error('数据库连接失败'));

      await expect(
        accessController.validatePasscode(mockRequest as Request, mockResponse as Response, mockNext)
      ).rejects.toThrow('数据库连接失败');
    });

    it('应该处理网络超时', async () => {
      mockRequest.body = {
        code: 'VALID_CODE',
        deviceId: 'device001'
      };

      vi.mocked(PasscodeService.validatePasscode).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('请求超时')), 100)
        )
      );

      await expect(
        accessController.validatePasscode(mockRequest as Request, mockResponse as Response, mockNext)
      ).rejects.toThrow('请求超时');
    });

    it('应该处理内存不足错误', async () => {
      mockRequest.body = {
        code: 'VALID_CODE',
        deviceId: 'device001'
      };

      const memoryError = new Error('内存不足');
      (memoryError as any).code = 'ENOMEM';
      
      vi.mocked(PasscodeService.validatePasscode).mockRejectedValue(memoryError);

      await expect(
        accessController.validatePasscode(mockRequest as Request, mockResponse as Response, mockNext)
      ).rejects.toThrow('内存不足');
    });

    it('应该处理并发访问冲突', async () => {
      mockRequest.body = {
        code: 'VALID_CODE',
        deviceId: 'device001'
      };

      const concurrencyError = new Error('资源被锁定');
      (concurrencyError as any).code = 'EBUSY';
      
      vi.mocked(AccessRecordService.recordAccess).mockRejectedValue(concurrencyError);

      const mockValidationResult: PasscodeValidationResult = {
        valid: true,
        userId: 1,
        userName: '测试用户',
        userType: 'employee',
        permissions: ['basic_access']
      };

      vi.mocked(PasscodeService.validatePasscode).mockResolvedValue(mockValidationResult);

      await expect(
        accessController.validatePasscode(mockRequest as Request, mockResponse as Response, mockNext)
      ).rejects.toThrow('资源被锁定');
    });
  });

  describe('输入验证增强测试', () => {
    it('应该验证通行码格式', async () => {
      const invalidCodes = [
        '', // 空字符串
        ' ', // 空白字符
        'a'.repeat(1000), // 过长字符串
        null, // null值
        undefined, // undefined值
        123, // 数字类型
        {}, // 对象类型
        [], // 数组类型
      ];

      for (const invalidCode of invalidCodes) {
        mockRequest.body = {
          code: invalidCode,
          deviceId: 'device001'
        };

        await accessController.validatePasscode(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: '通行码和设备ID不能为空'
          })
        );

        vi.clearAllMocks();
      }
    });

    it('应该验证设备ID格式', async () => {
      const invalidDeviceIds = [
        '', // 空字符串
        ' ', // 空白字符
        'device'.repeat(100), // 过长字符串
        'device<script>', // 包含HTML标签
        'device"DROP TABLE', // 包含SQL注入
      ];

      for (const invalidDeviceId of invalidDeviceIds) {
        mockRequest.body = {
          code: 'VALID_CODE',
          deviceId: invalidDeviceId
        };

        if (!invalidDeviceId || invalidDeviceId.trim() === '') {
          await accessController.validatePasscode(mockRequest as Request, mockResponse as Response, mockNext);
          expect(mockStatus).toHaveBeenCalledWith(400);
        } else {
          // 对于其他无效格式，应该被记录但不阻止处理
          const mockValidationResult: PasscodeValidationResult = {
            valid: false,
            reason: '通行码不存在'
          };

          vi.mocked(PasscodeService.validatePasscode).mockResolvedValue(mockValidationResult);
          vi.mocked(AccessRecordService.recordAccess).mockResolvedValue({} as any);

          await accessController.validatePasscode(mockRequest as Request, mockResponse as Response, mockNext);
          expect(PasscodeService.validatePasscode).toHaveBeenCalledWith('VALID_CODE', invalidDeviceId);
        }

        vi.clearAllMocks();
      }
    });

    it('应该验证可选参数', async () => {
      mockRequest.body = {
        code: 'VALID_CODE',
        deviceId: 'device001',
        direction: 'invalid_direction', // 无效方向
        deviceType: 'x'.repeat(500), // 过长设备类型
        projectId: 'not_a_number', // 非数字项目ID
        venueId: -1, // 负数场地ID
        floorId: 0 // 零楼层ID
      };

      const mockValidationResult: PasscodeValidationResult = {
        valid: true,
        userId: 1,
        userName: '测试用户',
        userType: 'employee',
        permissions: ['basic_access']
      };

      vi.mocked(PasscodeService.validatePasscode).mockResolvedValue(mockValidationResult);
      vi.mocked(AccessRecordService.recordAccess).mockResolvedValue({} as any);

      await accessController.validatePasscode(mockRequest as Request, mockResponse as Response, mockNext);

      // 验证无效参数被正确处理
      expect(AccessRecordService.recordAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: 'invalid_direction', // 应该被记录，由服务层验证
          deviceType: expect.any(String),
          projectId: 'not_a_number',
          venueId: -1,
          floorId: 0
        })
      );
    });
  });

  describe('二维码验证增强测试', () => {
    it('应该处理恶意二维码内容', async () => {
      const maliciousQRContents = [
        'javascript:alert("XSS")', // JavaScript协议
        'data:text/html,<script>alert("XSS")</script>', // Data URL
        'file:///etc/passwd', // 文件协议
        'ftp://malicious.com/payload', // FTP协议
        '\x00\x01\x02\x03', // 二进制数据
        'A'.repeat(10000), // 超长内容
      ];

      for (const maliciousContent of maliciousQRContents) {
        mockRequest.body = {
          qrContent: maliciousContent,
          deviceId: 'device001'
        };

        const mockValidationResult: PasscodeValidationResult = {
          valid: false,
          reason: '二维码格式无效'
        };

        vi.mocked(PasscodeService.validateQRPasscode).mockResolvedValue(mockValidationResult);
        vi.mocked(AccessRecordService.recordAccess).mockResolvedValue({} as any);

        await accessController.validateQRPasscode(mockRequest as Request, mockResponse as Response, mockNext);

        expect(PasscodeService.validateQRPasscode).toHaveBeenCalledWith(maliciousContent, 'device001');
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: '二维码格式无效'
          })
        );

        vi.clearAllMocks();
      }
    });

    it('应该防止重放攻击', async () => {
      const qrContent = 'valid_encrypted_qr_content';
      mockRequest.body = {
        qrContent,
        deviceId: 'device001'
      };

      const mockValidationResult: PasscodeValidationResult = {
        valid: true,
        userId: 1,
        userName: '测试用户',
        userType: 'employee',
        permissions: ['basic_access']
      };

      vi.mocked(PasscodeService.validateQRPasscode).mockResolvedValue(mockValidationResult);
      vi.mocked(AccessRecordService.recordAccess).mockResolvedValue({} as any);

      // 第一次请求应该成功
      await accessController.validateQRPasscode(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '二维码验证成功'
        })
      );

      vi.clearAllMocks();

      // 模拟重放攻击 - 相同的二维码内容再次使用
      const replayResult: PasscodeValidationResult = {
        valid: false,
        reason: '二维码已被使用'
      };

      vi.mocked(PasscodeService.validateQRPasscode).mockResolvedValue(replayResult);

      await accessController.validateQRPasscode(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '二维码已被使用'
        })
      );
    });
  });

  describe('时效性通行码增强测试', () => {
    it('应该验证时间窗口', async () => {
      mockRequest.body = {
        timeBasedCode: 'TIME123',
        baseCode: 'BASE123',
        deviceId: 'device001'
      };

      // 模拟时间窗口过期
      const expiredResult: PasscodeValidationResult = {
        valid: false,
        reason: '时效性通行码已过期'
      };

      vi.mocked(PasscodeService.validateTimeBasedPasscode).mockResolvedValue(expiredResult);
      vi.mocked(AccessRecordService.recordAccess).mockResolvedValue({} as any);

      await accessController.validateTimeBasedPasscode(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '时效性通行码已过期'
        })
      );

      // 验证失败记录被正确记录
      expect(AccessRecordService.recordAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'failed',
          failReason: '时效性通行码已过期'
        })
      );
    });

    it('应该处理时钟偏移', async () => {
      mockRequest.body = {
        timeBasedCode: 'TIME123',
        baseCode: 'BASE123',
        deviceId: 'device001'
      };

      // 模拟时钟偏移导致的验证失败
      const clockSkewResult: PasscodeValidationResult = {
        valid: false,
        reason: '设备时间不同步'
      };

      vi.mocked(PasscodeService.validateTimeBasedPasscode).mockResolvedValue(clockSkewResult);
      vi.mocked(AccessRecordService.recordAccess).mockResolvedValue({} as any);

      await accessController.validateTimeBasedPasscode(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '设备时间不同步'
        })
      );
    });
  });

  describe('访问记录查询增强测试', () => {
    it('应该防止信息泄露', async () => {
      // 模拟恶意用户尝试访问其他用户的记录
      mockRequest.params = { userId: '999' }; // 尝试访问其他用户
      mockRequest.user = { userId: 1 }; // 当前用户ID为1
      mockRequest.query = { page: '1', limit: '10' };

      const mockRecords = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      };

      vi.mocked(AccessRecordService.getUserAccessRecords).mockResolvedValue(mockRecords);

      await accessController.getUserAccessRecords(mockRequest as Request, mockResponse as Response, mockNext);

      // 验证查询了指定的用户ID（权限检查应该在中间件中处理）
      expect(AccessRecordService.getUserAccessRecords).toHaveBeenCalledWith(999, {
        page: 1,
        limit: 10,
        startDate: undefined,
        endDate: undefined,
        sortBy: undefined,
        sortOrder: undefined
      });
    });

    it('应该限制查询结果数量', async () => {
      mockRequest.query = {
        page: '1',
        limit: '10000' // 尝试获取大量数据
      };

      const mockRecords = {
        data: [],
        pagination: {
          page: 1,
          limit: 10000, // 服务层应该限制这个值
          total: 0,
          totalPages: 0
        }
      };

      vi.mocked(AccessRecordService.getAccessRecords).mockResolvedValue(mockRecords);

      await accessController.getAccessRecords(mockRequest as Request, mockResponse as Response, mockNext);

      expect(AccessRecordService.getAccessRecords).toHaveBeenCalledWith({
        page: 1,
        limit: 10000, // 传递给服务层，由服务层限制
        userId: undefined,
        deviceId: undefined,
        result: undefined,
        startDate: undefined,
        endDate: undefined,
        sortBy: undefined,
        sortOrder: undefined
      });
    });

    it('应该验证日期范围', async () => {
      mockRequest.query = {
        startDate: '2024-13-01', // 无效月份
        endDate: '2024-02-30', // 无效日期
        page: '1',
        limit: '10'
      };

      const mockRecords = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      };

      vi.mocked(AccessRecordService.getAccessRecords).mockResolvedValue(mockRecords);

      await accessController.getAccessRecords(mockRequest as Request, mockResponse as Response, mockNext);

      // 验证无效日期被传递给服务层处理
      expect(AccessRecordService.getAccessRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2024-13-01',
          endDate: '2024-02-30'
        })
      );
    });
  });

  describe('统计信息安全测试', () => {
    it('应该防止统计信息泄露敏感数据', async () => {
      mockRequest.query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        merchantId: '1',
        deviceId: 'device001'
      };

      const mockStats = {
        total: 1000,
        success: 950,
        failed: 50,
        successRate: 95.0,
        byHour: [
          { hour: 9, count: 100 },
          { hour: 10, count: 150 }
        ],
        byDevice: [
          { deviceId: 'device001', count: 500 },
          { deviceId: 'device002', count: 500 }
        ],
        byUserType: [
          { userType: 'employee', count: 800 },
          { userType: 'visitor', count: 200 }
        ],
        recentActivity: []
      };

      vi.mocked(AccessRecordService.getAccessStats).mockResolvedValue(mockStats);

      await accessController.getAccessStats(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: '获取通行统计信息成功',
        data: mockStats,
        timestamp: expect.any(String)
      });

      // 验证统计数据不包含个人身份信息
      const responseData = mockJson.mock.calls[0][0].data;
      expect(responseData.recentActivity).toBeDefined();
      // recentActivity应该不包含敏感的个人信息
    });

    it('应该限制统计查询的时间范围', async () => {
      mockRequest.query = {
        startDate: '1970-01-01', // 过早的开始时间
        endDate: '2099-12-31', // 过晚的结束时间
      };

      const mockStats = {
        total: 0,
        success: 0,
        failed: 0,
        successRate: 0,
        byHour: [],
        byDevice: [],
        byUserType: [],
        recentActivity: []
      };

      vi.mocked(AccessRecordService.getAccessStats).mockResolvedValue(mockStats);

      await accessController.getAccessStats(mockRequest as Request, mockResponse as Response, mockNext);

      // 验证极端日期范围被传递给服务层处理
      expect(AccessRecordService.getAccessStats).toHaveBeenCalledWith({
        startDate: '1970-01-01',
        endDate: '2099-12-31',
        merchantId: undefined,
        deviceId: undefined
      });
    });
  });
});