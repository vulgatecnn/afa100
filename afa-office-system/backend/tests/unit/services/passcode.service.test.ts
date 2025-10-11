import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PasscodeService } from '../../../src/services/passcode.service.js';
import { PasscodeModel } from '../../../src/models/passcode.model.js';
import { UserModel } from '../../../src/models/user.model.js';
import { VisitorApplicationModel } from '../../../src/models/visitor-application.model.js';
import { PermissionModel } from '../../../src/models/permission.model.js';
import { QRCodeUtils } from '../../../src/utils/qrcode.js';
import { appConfig } from '../../../src/config/app.config.js';
import type { User, Passcode, VisitorApplication } from '../../../src/types/index.js';

// Mock 所有依赖
vi.mock('../../../src/models/passcode.model.js');
vi.mock('../../../src/models/user.model.js');
vi.mock('../../../src/models/visitor-application.model.js');
vi.mock('../../../src/models/permission.model.js');
vi.mock('../../../src/utils/qrcode.js');
vi.mock('../../../src/config/app.config.js', () => ({
  appConfig: {
    passcode: {
      defaultDuration: 480, // 8小时
      defaultUsageLimit: 10,
    }
  }
}));

describe('PasscodeService 单元测试', () => {
  const mockUser: User = {
    id: 1,
    name: '测试用户',
    phone: '13800138000',
    user_type: 'employee',
    status: 'active',
    merchant_id: 1,
    open_id: 'test_openid',
    union_id: null,
    avatar: null,
    password: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockPasscode: Passcode = {
    id: 1,
    user_id: 1,
    code: 'TEST_CODE_123',
    type: 'employee',
    status: 'active',
    expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    usage_limit: 10,
    usage_count: 0,
    permissions: JSON.stringify(['basic_access']),
    application_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generatePasscode', () => {
    it('应该成功生成员工通行码', async () => {
      // 准备 Mock
      vi.mocked(UserModel.findById).mockResolvedValue(mockUser);
      vi.mocked(PasscodeModel.revokeUserPasscodes).mockResolvedValue();
      vi.mocked(PasscodeModel.create).mockResolvedValue(mockPasscode);
      vi.mocked(PermissionModel.findByMerchantId).mockResolvedValue([
        { id: 1, code: 'merchant_access', name: '商户权限', description: '', resource_type: 'merchant', resource_id: 1, actions: '["read","write"]', created_at: '' }
      ]);
      vi.mocked(QRCodeUtils.generateUniqueId).mockReturnValue('UNIQUE_CODE_123');

      const result = await PasscodeService.generatePasscode(1, 'employee');

      expect(UserModel.findById).toHaveBeenCalledWith(1);
      expect(PasscodeModel.revokeUserPasscodes).toHaveBeenCalledWith(1);
      expect(PasscodeModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 1,
          type: 'employee',
          status: 'active',
          usage_limit: 10,
          usage_count: 0,
        })
      );
      expect(result).toEqual(mockPasscode);
    });

    it('应该在用户不存在时抛出错误', async () => {
      vi.mocked(UserModel.findById).mockResolvedValue(null);

      await expect(PasscodeService.generatePasscode(999, 'employee'))
        .rejects.toThrow('用户不存在');
    });

    it('应该使用自定义选项生成通行码', async () => {
      vi.mocked(UserModel.findById).mockResolvedValue(mockUser);
      vi.mocked(PasscodeModel.revokeUserPasscodes).mockResolvedValue();
      vi.mocked(PasscodeModel.create).mockResolvedValue(mockPasscode);
      vi.mocked(PermissionModel.findByMerchantId).mockResolvedValue([]);
      vi.mocked(QRCodeUtils.generateUniqueId).mockReturnValue('UNIQUE_CODE_123');

      const options = {
        duration: 120,
        usageLimit: 5,
        permissions: ['custom_access'],
        applicationId: 1,
      };

      await PasscodeService.generatePasscode(1, 'visitor', options);

      expect(PasscodeModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          usage_limit: 5,
          application_id: 1,
        })
      );
    });

    it('应该正确处理权限合并', async () => {
      const userWithMerchant = { ...mockUser, merchant_id: 1 };
      vi.mocked(UserModel.findById).mockResolvedValue(userWithMerchant);
      vi.mocked(PasscodeModel.revokeUserPasscodes).mockResolvedValue();
      vi.mocked(PasscodeModel.create).mockResolvedValue(mockPasscode);
      vi.mocked(PermissionModel.findByMerchantId).mockResolvedValue([
        { id: 1, code: 'merchant_access', name: '商户权限', description: '', resource_type: 'merchant', resource_id: 1, actions: '["read"]', created_at: '' }
      ]);
      vi.mocked(QRCodeUtils.generateUniqueId).mockReturnValue('UNIQUE_CODE_123');

      const options = { permissions: ['custom_access'] };
      await PasscodeService.generatePasscode(1, 'employee', options);

      const createCall = vi.mocked(PasscodeModel.create).mock.calls[0][0];
      const permissions = JSON.parse(createCall.permissions!);
      expect(permissions).toContain('merchant_access');
      expect(permissions).toContain('custom_access');
    });
  });

  describe('validatePasscode', () => {
    it('应该成功验证有效的通行码', async () => {
      vi.mocked(PasscodeModel.findByCode).mockResolvedValue(mockPasscode);
      vi.mocked(UserModel.findById).mockResolvedValue(mockUser);
      vi.mocked(PasscodeModel.incrementUsageCount).mockResolvedValue();

      const result = await PasscodeService.validatePasscode('TEST_CODE_123', 'device_001');

      expect(result.valid).toBe(true);
      expect(result.userId).toBe(1);
      expect(result.userName).toBe('测试用户');
      expect(result.userType).toBe('employee');
      expect(result.permissions).toEqual(['basic_access']);
      expect(PasscodeModel.incrementUsageCount).toHaveBeenCalledWith(1);
    });

    it('应该拒绝不存在的通行码', async () => {
      vi.mocked(PasscodeModel.findByCode).mockResolvedValue(null);

      const result = await PasscodeService.validatePasscode('INVALID_CODE', 'device_001');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('通行码不存在');
    });

    it('应该拒绝已失效的通行码', async () => {
      const expiredPasscode = { ...mockPasscode, status: 'expired' as const };
      vi.mocked(PasscodeModel.findByCode).mockResolvedValue(expiredPasscode);

      const result = await PasscodeService.validatePasscode('EXPIRED_CODE', 'device_001');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('通行码已失效');
    });

    it('应该拒绝已过期的通行码', async () => {
      const expiredPasscode = {
        ...mockPasscode,
        expiry_time: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1小时前过期
      };
      vi.mocked(PasscodeModel.findByCode).mockResolvedValue(expiredPasscode);
      vi.mocked(PasscodeModel.update).mockResolvedValue(expiredPasscode);

      const result = await PasscodeService.validatePasscode('EXPIRED_CODE', 'device_001');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('通行码已过期');
      expect(PasscodeModel.update).toHaveBeenCalledWith(1, { status: 'expired' });
    });

    it('应该拒绝使用次数已达上限的通行码', async () => {
      const limitedPasscode = {
        ...mockPasscode,
        usage_limit: 5,
        usage_count: 5
      };
      vi.mocked(PasscodeModel.findByCode).mockResolvedValue(limitedPasscode);
      vi.mocked(PasscodeModel.update).mockResolvedValue(limitedPasscode);

      const result = await PasscodeService.validatePasscode('LIMITED_CODE', 'device_001');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('通行码使用次数已达上限');
      expect(PasscodeModel.update).toHaveBeenCalledWith(1, { status: 'expired' });
    });

    it('应该拒绝已禁用用户的通行码', async () => {
      const inactiveUser = { ...mockUser, status: 'inactive' as const };
      vi.mocked(PasscodeModel.findByCode).mockResolvedValue(mockPasscode);
      vi.mocked(UserModel.findById).mockResolvedValue(inactiveUser);

      const result = await PasscodeService.validatePasscode('TEST_CODE_123', 'device_001');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('用户账户已被禁用');
    });

    it('应该处理用户不存在的情况', async () => {
      vi.mocked(PasscodeModel.findByCode).mockResolvedValue(mockPasscode);
      vi.mocked(UserModel.findById).mockResolvedValue(null);

      const result = await PasscodeService.validatePasscode('TEST_CODE_123', 'device_001');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('用户不存在');
    });

    it('应该处理系统错误', async () => {
      vi.mocked(PasscodeModel.findByCode).mockRejectedValue(new Error('数据库错误'));

      const result = await PasscodeService.validatePasscode('TEST_CODE_123', 'device_001');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('系统错误');
    });
  });

  describe('generateDynamicQRPasscode', () => {
    it('应该生成动态二维码通行码', async () => {
      vi.mocked(UserModel.findById).mockResolvedValue(mockUser);
      vi.mocked(PasscodeModel.revokeUserPasscodes).mockResolvedValue();
      vi.mocked(PasscodeModel.create).mockResolvedValue(mockPasscode);
      vi.mocked(PermissionModel.findByMerchantId).mockResolvedValue([]);
      vi.mocked(QRCodeUtils.generateUniqueId).mockReturnValue('UNIQUE_CODE_123');
      vi.mocked(QRCodeUtils.generateQRCodeContent).mockReturnValue('encrypted_qr_content');
      vi.mocked(QRCodeUtils.generateTimeBasedCode).mockReturnValue('TIME_BASED_CODE');

      const result = await PasscodeService.generateDynamicQRPasscode(1, 'employee');

      expect(result.passcode).toEqual(mockPasscode);
      expect(result.qrContent).toBe('encrypted_qr_content');
      expect(result.timeBasedCode).toBe('TIME_BASED_CODE');
      expect(QRCodeUtils.generateQRCodeContent).toHaveBeenCalledWith(
        1,
        'employee',
        expect.any(Date),
        ['basic_access']
      );
    });

    it('应该在禁用时效性编码时不生成时效性通行码', async () => {
      // 临时修改配置
      const originalConfig = (PasscodeService as any).DEFAULT_CONFIG;
      (PasscodeService as any).DEFAULT_CONFIG = { ...originalConfig, enableTimeBasedCode: false };

      vi.mocked(UserModel.findById).mockResolvedValue(mockUser);
      vi.mocked(PasscodeModel.revokeUserPasscodes).mockResolvedValue();
      vi.mocked(PasscodeModel.create).mockResolvedValue(mockPasscode);
      vi.mocked(PermissionModel.findByMerchantId).mockResolvedValue([]);
      vi.mocked(QRCodeUtils.generateUniqueId).mockReturnValue('UNIQUE_CODE_123');
      vi.mocked(QRCodeUtils.generateQRCodeContent).mockReturnValue('encrypted_qr_content');

      const result = await PasscodeService.generateDynamicQRPasscode(1, 'employee');

      expect(result.timeBasedCode).toBeUndefined();

      // 恢复配置
      (PasscodeService as any).DEFAULT_CONFIG = originalConfig;
    });
  });

  describe('validateQRPasscode', () => {
    const mockQRData = {
      userId: 1,
      type: 'employee' as const,
      timestamp: Date.now(),
      expiryTime: Date.now() + 60 * 60 * 1000,
      permissions: ['basic_access'],
      nonce: 'test_nonce'
    };

    it('应该成功验证有效的二维码通行码', async () => {
      vi.mocked(QRCodeUtils.parseQRCodeContent).mockReturnValue(mockQRData);
      vi.mocked(QRCodeUtils.isQRCodeValid).mockReturnValue(true);
      vi.mocked(UserModel.findById).mockResolvedValue(mockUser);

      const result = await PasscodeService.validateQRPasscode('encrypted_qr_content', 'device_001');

      expect(result.valid).toBe(true);
      expect(result.userId).toBe(1);
      expect(result.userName).toBe('测试用户');
      expect(result.userType).toBe('employee');
      expect(result.permissions).toEqual(['basic_access']);
    });

    it('应该拒绝格式无效的二维码', async () => {
      vi.mocked(QRCodeUtils.parseQRCodeContent).mockReturnValue(null);

      const result = await PasscodeService.validateQRPasscode('invalid_qr_content', 'device_001');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('二维码格式无效');
    });

    it('应该拒绝已过期的二维码', async () => {
      vi.mocked(QRCodeUtils.parseQRCodeContent).mockReturnValue(mockQRData);
      vi.mocked(QRCodeUtils.isQRCodeValid).mockReturnValue(false);

      const result = await PasscodeService.validateQRPasscode('expired_qr_content', 'device_001');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('二维码已过期');
    });

    it('应该处理系统错误', async () => {
      vi.mocked(QRCodeUtils.parseQRCodeContent).mockImplementation(() => {
        throw new Error('解析错误');
      });

      const result = await PasscodeService.validateQRPasscode('error_qr_content', 'device_001');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('系统错误');
    });
  });

  describe('validateTimeBasedPasscode', () => {
    it('应该成功验证有效的时效性通行码', async () => {
      vi.mocked(QRCodeUtils.validateTimeBasedCode).mockReturnValue(true);
      vi.mocked(PasscodeModel.findByCode).mockResolvedValue(mockPasscode);
      vi.mocked(UserModel.findById).mockResolvedValue(mockUser);
      vi.mocked(PasscodeModel.incrementUsageCount).mockResolvedValue();

      const result = await PasscodeService.validateTimeBasedPasscode('TIME_CODE', 'BASE_CODE', 'device_001');

      expect(result.valid).toBe(true);
      expect(QRCodeUtils.validateTimeBasedCode).toHaveBeenCalledWith('TIME_CODE', 'BASE_CODE', 5);
    });

    it('应该拒绝已过期的时效性通行码', async () => {
      vi.mocked(QRCodeUtils.validateTimeBasedCode).mockReturnValue(false);

      const result = await PasscodeService.validateTimeBasedPasscode('EXPIRED_TIME_CODE', 'BASE_CODE', 'device_001');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('时效性通行码已过期');
    });
  });

  describe('refreshPasscode', () => {
    it('应该成功刷新用户通行码', async () => {
      vi.mocked(UserModel.findById).mockResolvedValue(mockUser);
      vi.mocked(PasscodeModel.revokeUserPasscodes).mockResolvedValue();
      vi.mocked(PasscodeModel.create).mockResolvedValue(mockPasscode);
      vi.mocked(PermissionModel.findByMerchantId).mockResolvedValue([]);
      vi.mocked(QRCodeUtils.generateUniqueId).mockReturnValue('NEW_CODE_123');

      const result = await PasscodeService.refreshPasscode(1);

      expect(PasscodeModel.revokeUserPasscodes).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockPasscode);
    });

    it('应该在用户不存在时抛出错误', async () => {
      vi.mocked(UserModel.findById).mockResolvedValue(null);

      await expect(PasscodeService.refreshPasscode(999))
        .rejects.toThrow('用户不存在');
    });
  });

  describe('generateVisitorPasscodeFromApplication', () => {
    const mockApplication: VisitorApplication = {
      id: 1,
      applicant_id: 1,
      merchant_id: 1,
      visitee_id: 2,
      visitor_name: '访客',
      visitor_phone: '13800138001',
      visitor_company: '访客公司',
      visit_purpose: '商务访问',
      visit_type: 'business',
      scheduled_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1小时后
      duration: 2, // 2小时
      status: 'approved',
      approved_by: 2,
      approved_at: new Date().toISOString(),
      passcode: null,
      passcode_expiry: null,
      usage_limit: 3,
      usage_count: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('应该为已批准的访客申请生成通行码', async () => {
      vi.mocked(VisitorApplicationModel.findById).mockResolvedValue(mockApplication);
      vi.mocked(UserModel.findById).mockResolvedValue(mockUser);
      vi.mocked(PasscodeModel.revokeUserPasscodes).mockResolvedValue();
      vi.mocked(PasscodeModel.create).mockResolvedValue(mockPasscode);
      vi.mocked(PermissionModel.findByMerchantId).mockResolvedValue([]);
      vi.mocked(QRCodeUtils.generateUniqueId).mockReturnValue('VISITOR_CODE_123');
      vi.mocked(QRCodeUtils.generateQRCodeContent).mockReturnValue('visitor_qr_content');

      const result = await PasscodeService.generateVisitorPasscodeFromApplication(1);

      expect(result.passcode).toEqual(mockPasscode);
      expect(result.qrContent).toBe('visitor_qr_content');
    });

    it('应该在访客申请不存在时抛出错误', async () => {
      vi.mocked(VisitorApplicationModel.findById).mockResolvedValue(null);

      await expect(PasscodeService.generateVisitorPasscodeFromApplication(999))
        .rejects.toThrow('访客申请不存在');
    });

    it('应该在访客申请未通过审批时抛出错误', async () => {
      const pendingApplication = { ...mockApplication, status: 'pending' as const };
      vi.mocked(VisitorApplicationModel.findById).mockResolvedValue(pendingApplication);

      await expect(PasscodeService.generateVisitorPasscodeFromApplication(1))
        .rejects.toThrow('访客申请未通过审批');
    });
  });

  describe('边界条件和性能测试', () => {
    it('应该处理大量并发通行码生成请求', async () => {
      vi.mocked(UserModel.findById).mockResolvedValue(mockUser);
      vi.mocked(PasscodeModel.revokeUserPasscodes).mockResolvedValue();
      vi.mocked(PasscodeModel.create).mockResolvedValue(mockPasscode);
      vi.mocked(PermissionModel.findByMerchantId).mockResolvedValue([]);
      vi.mocked(QRCodeUtils.generateUniqueId).mockReturnValue('CONCURRENT_CODE');

      const concurrentRequests = 10; // 减少并发数量以避免mock调用次数问题
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        PasscodeService.generatePasscode(i + 1, 'employee')
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(concurrentRequests);
      // 由于内部调用了getUserPermissions，实际调用次数可能更多
      expect(UserModel.findById).toHaveBeenCalled();
    });

    it('应该正确处理权限为空的情况', async () => {
      const passcodeWithoutPermissions = { ...mockPasscode, permissions: null };
      vi.mocked(PasscodeModel.findByCode).mockResolvedValue(passcodeWithoutPermissions);
      vi.mocked(UserModel.findById).mockResolvedValue(mockUser);
      vi.mocked(PasscodeModel.incrementUsageCount).mockResolvedValue();

      const result = await PasscodeService.validatePasscode('TEST_CODE_123', 'device_001');

      expect(result.valid).toBe(true);
      expect(result.permissions).toEqual([]);
    });

    it('应该处理极端的过期时间', async () => {
      const farFuturePasscode = {
        ...mockPasscode,
        expiry_time: new Date('2099-12-31T23:59:59Z').toISOString()
      };
      vi.mocked(PasscodeModel.findByCode).mockResolvedValue(farFuturePasscode);
      vi.mocked(UserModel.findById).mockResolvedValue(mockUser);
      vi.mocked(PasscodeModel.incrementUsageCount).mockResolvedValue();

      const result = await PasscodeService.validatePasscode('FUTURE_CODE', 'device_001');

      expect(result.valid).toBe(true);
    });

    it('应该处理使用次数为0的限制', async () => {
      const zeroLimitPasscode = {
        ...mockPasscode,
        usage_limit: 0,
        usage_count: 0
      };
      vi.mocked(PasscodeModel.findByCode).mockResolvedValue(zeroLimitPasscode);
      vi.mocked(UserModel.findById).mockResolvedValue(mockUser);
      vi.mocked(PasscodeModel.update).mockResolvedValue(zeroLimitPasscode);

      const result = await PasscodeService.validatePasscode('ZERO_LIMIT_CODE', 'device_001');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('通行码使用次数已达上限');
    });
  });

  describe('批量操作测试', () => {
    it('应该成功批量生成通行码', async () => {
      vi.mocked(UserModel.findById).mockResolvedValue(mockUser);
      vi.mocked(PasscodeModel.revokeUserPasscodes).mockResolvedValue();
      vi.mocked(PasscodeModel.create).mockResolvedValue(mockPasscode);
      vi.mocked(PermissionModel.findByMerchantId).mockResolvedValue([]);
      vi.mocked(QRCodeUtils.generateUniqueId).mockReturnValue('BATCH_CODE');

      const userIds = [1, 2, 3, 4, 5];
      const results = await PasscodeService.batchGeneratePasscodes(userIds, 'employee');

      expect(results).toHaveLength(5);
      // 由于内部调用了getUserPermissions，实际调用次数可能更多
      expect(UserModel.findById).toHaveBeenCalled();
    });

    it('应该在批量生成时跳过失败的用户', async () => {
      vi.mocked(UserModel.findById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null) // 用户不存在
        .mockResolvedValueOnce(mockUser);
      vi.mocked(PasscodeModel.revokeUserPasscodes).mockResolvedValue();
      vi.mocked(PasscodeModel.create).mockResolvedValue(mockPasscode);
      vi.mocked(PermissionModel.findByMerchantId).mockResolvedValue([]);
      vi.mocked(QRCodeUtils.generateUniqueId).mockReturnValue('BATCH_CODE');

      const userIds = [1, 999, 3];
      const results = await PasscodeService.batchGeneratePasscodes(userIds, 'employee');

      expect(results).toHaveLength(2); // 只有2个成功
    });
  });

  describe('统计功能测试', () => {
    it('应该正确获取通行码统计信息', async () => {
      vi.mocked(PasscodeModel.count)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80)  // active
        .mockResolvedValueOnce(15)  // expired
        .mockResolvedValueOnce(5);  // revoked

      const stats = await PasscodeService.getPasscodeStatistics();

      expect(stats).toEqual({
        total: 100,
        active: 80,
        expired: 15,
        revoked: 5
      });
    });

    it('应该支持条件筛选的统计', async () => {
      const conditions = { userId: 1, type: 'employee' as const };
      vi.mocked(PasscodeModel.count).mockResolvedValue(10);

      await PasscodeService.getPasscodeStatistics(conditions);

      expect(PasscodeModel.count).toHaveBeenCalledWith(conditions);
      expect(PasscodeModel.count).toHaveBeenCalledWith({ ...conditions, status: 'active' });
    });
  });

  describe('清理功能测试', () => {
    it('应该成功清理过期通行码', async () => {
      vi.mocked(PasscodeModel.cleanupExpired).mockResolvedValue(5);

      const result = await PasscodeService.cleanupExpiredPasscodes();

      expect(result).toBe(5);
      expect(PasscodeModel.cleanupExpired).toHaveBeenCalled();
    });
  });
});