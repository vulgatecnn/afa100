import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import type { User, UserType } from '../../../src/types/index.js';
import { 
  expectControllerSuccess, 
  expectControllerError, 
  createTestUser,
  expectValidApiResponse 
} from '../../helpers/controller-test-helper.js';

// Mock dependencies
const mockAuthService = {
  login: vi.fn(),
  wechatLogin: vi.fn(),
  refreshToken: vi.fn(),
  logout: vi.fn(),
  verifyAccessToken: vi.fn(),
  validatePasswordStrength: vi.fn(),
};

const mockWechatUtils = {
  getSessionByCode: vi.fn(),
  formatUserInfo: vi.fn(),
  validateConfig: vi.fn(),
};

// Mock the services and utils
vi.mock('../../../src/services/auth.service.js', () => ({
  AuthService: class MockAuthService {
    login = mockAuthService.login;
    wechatLogin = mockAuthService.wechatLogin;
    refreshToken = mockAuthService.refreshToken;
    logout = mockAuthService.logout;
    verifyAccessToken = mockAuthService.verifyAccessToken;
    validatePasswordStrength = mockAuthService.validatePasswordStrength;
  }
}));

vi.mock('../../../src/utils/wechat.js', () => ({
  WechatUtils: mockWechatUtils
}));

// Import after mocking
const { AuthController } = await import('../../../src/controllers/auth.controller.js');

describe('AuthController', () => {
  let authController: AuthController;

  const mockUser: User = {
    id: 1,
    name: '测试用户',
    phone: '13800138000',
    user_type: 'employee',
    status: 'active',
    merchant_id: 1,
    open_id: 'test-openid',
    union_id: 'test-unionid',
    avatar: null,
    password: '$2a$10$hashedpassword',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockLoginResult = {
    user: mockUser,
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authController = new AuthController();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('应该成功处理手机号密码登录', async () => {
      mockReq.body = {
        phone: '13800138000',
        password: 'password123',
        userType: 'employee',
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      await authController.login(mockReq as Request, mockRes as Response);

      expect(mockAuthService.login).toHaveBeenCalledWith({
        phone: '13800138000',
        password: 'password123',
        openId: undefined,
        userType: 'employee',
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '登录成功',
        data: mockLoginResult,
        timestamp: expect.any(String),
      });
    });

    it('应该成功处理微信OpenId登录', async () => {
      mockReq.body = {
        openId: 'test-openid',
        userType: 'employee',
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      await authController.login(mockReq as Request, mockRes as Response);

      expect(mockAuthService.login).toHaveBeenCalledWith({
        phone: undefined,
        password: undefined,
        openId: 'test-openid',
        userType: 'employee',
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '登录成功',
        data: mockLoginResult,
        timestamp: expect.any(String),
      });
    });

    it('应该拒绝缺少必填字段的请求', async () => {
      mockReq.body = {};

      await expect(
        authController.login(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('请提供手机号和密码或微信授权码');
    });

    it('应该拒绝只有手机号没有密码的请求', async () => {
      mockReq.body = {
        phone: '13800138000',
      };

      await expect(
        authController.login(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('请提供手机号和密码或微信授权码');
    });

    it('应该处理登录服务抛出的错误', async () => {
      mockReq.body = {
        phone: '13800138000',
        password: 'wrong-password',
      };

      mockAuthService.login.mockRejectedValue(new Error('密码错误'));

      await expect(
        authController.login(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('密码错误');
    });
  });

  describe('wechatLogin', () => {
    const mockWechatUserInfo = {
      openid: 'test-openid',
      unionid: 'test-unionid',
    };

    const mockFormattedUserInfo = {
      nickName: '微信用户',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    beforeEach(() => {
      mockWechatUtils.getSessionByCode.mockResolvedValue(mockWechatUserInfo);
      mockWechatUtils.formatUserInfo.mockReturnValue(mockFormattedUserInfo);
      mockAuthService.wechatLogin.mockResolvedValue(mockLoginResult);
    });

    it('应该成功处理微信小程序登录', async () => {
      mockReq.body = {
        code: 'wx-auth-code',
        userType: 'employee',
        userInfo: {
          nickName: '微信用户',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      };

      await authController.wechatLogin(mockReq as Request, mockRes as Response);

      expect(mockWechatUtils.getSessionByCode).toHaveBeenCalledWith('wx-auth-code');
      expect(mockWechatUtils.formatUserInfo).toHaveBeenCalledWith(mockReq.body.userInfo);
      expect(mockAuthService.wechatLogin).toHaveBeenCalledWith({
        openId: 'test-openid',
        unionId: 'test-unionid',
        userInfo: mockFormattedUserInfo,
        userType: 'employee',
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '微信登录成功',
        data: mockLoginResult,
        timestamp: expect.any(String),
      });
    });

    it('应该处理没有unionid的情况', async () => {
      mockReq.body = {
        code: 'wx-auth-code',
        userType: 'visitor',
      };

      mockWechatUtils.getSessionByCode.mockResolvedValue({
        openid: 'test-openid',
        // 没有unionid
      });

      await authController.wechatLogin(mockReq as Request, mockRes as Response);

      expect(mockAuthService.wechatLogin).toHaveBeenCalledWith({
        openId: 'test-openid',
        userInfo: undefined,
        userType: 'visitor',
      });
    });

    it('应该拒绝缺少授权码的请求', async () => {
      mockReq.body = {
        userType: 'employee',
      };

      await expect(
        authController.wechatLogin(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('缺少微信授权码');
    });

    it('应该拒绝缺少用户类型的请求', async () => {
      mockReq.body = {
        code: 'wx-auth-code',
      };

      await expect(
        authController.wechatLogin(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('请选择用户类型');
    });

    it('应该拒绝无效的用户类型', async () => {
      mockReq.body = {
        code: 'wx-auth-code',
        userType: 'invalid-type',
      };

      await expect(
        authController.wechatLogin(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('用户类型无效');
    });

    it('应该处理微信API错误', async () => {
      mockReq.body = {
        code: 'invalid-code',
        userType: 'employee',
      };

      mockWechatUtils.getSessionByCode.mockRejectedValue(new Error('微信授权失败'));

      await expect(
        authController.wechatLogin(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('微信授权失败');
    });

    it('应该处理认证服务错误', async () => {
      mockReq.body = {
        code: 'wx-auth-code',
        userType: 'employee',
      };

      mockAuthService.wechatLogin.mockRejectedValue(new Error('用户不存在'));

      await expect(
        authController.wechatLogin(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('用户不存在');
    });
  });

  describe('refreshToken', () => {
    it('应该成功刷新token', async () => {
      mockReq.body = {
        refreshToken: 'valid-refresh-token',
      };

      const mockRefreshResult = {
        accessToken: 'new-access-token',
        expiresIn: 3600,
      };

      mockAuthService.refreshToken.mockResolvedValue(mockRefreshResult);

      await authController.refreshToken(mockReq as Request, mockRes as Response);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Token刷新成功',
        data: mockRefreshResult,
        timestamp: expect.any(String),
      });
    });

    it('应该拒绝缺少刷新令牌的请求', async () => {
      mockReq.body = {};

      await expect(
        authController.refreshToken(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('缺少刷新令牌');
    });

    it('应该处理无效的刷新令牌', async () => {
      mockReq.body = {
        refreshToken: 'invalid-refresh-token',
      };

      mockAuthService.refreshToken.mockRejectedValue(new Error('刷新令牌无效'));

      await expect(
        authController.refreshToken(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('刷新令牌无效');
    });
  });

  describe('logout', () => {
    it('应该成功登出用户', async () => {
      mockReq.user = {
        userId: 1,
        userType: 'employee',
        merchantId: 1,
      };

      mockAuthService.logout.mockResolvedValue(undefined);

      await authController.logout(mockReq as Request, mockRes as Response);

      expect(mockAuthService.logout).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '登出成功',
        timestamp: expect.any(String),
      });
    });

    it('应该拒绝未登录用户的登出请求', async () => {
      mockReq.user = undefined;

      await expect(
        authController.logout(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('用户未登录');
    });
  });

  describe('getCurrentUser', () => {
    it('应该返回当前用户信息', async () => {
      mockReq.userDetails = mockUser;

      await authController.getCurrentUser(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '获取用户信息成功',
        data: {
          user: mockUser,
        },
        timestamp: expect.any(String),
      });
    });

    it('应该拒绝没有用户信息的请求', async () => {
      mockReq.userDetails = undefined;

      await expect(
        authController.getCurrentUser(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('用户信息不存在');
    });
  });

  describe('verifyToken', () => {
    it('应该验证有效的token', async () => {
      mockReq.body = {
        token: 'valid-token',
      };

      mockAuthService.verifyAccessToken.mockResolvedValue(mockUser);

      await authController.verifyToken(mockReq as Request, mockRes as Response);

      expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '令牌有效',
        data: {
          valid: true,
          user: mockUser,
        },
        timestamp: expect.any(String),
      });
    });

    it('应该处理无效的token', async () => {
      mockReq.body = {
        token: 'invalid-token',
      };

      mockAuthService.verifyAccessToken.mockRejectedValue(new Error('令牌无效'));

      await authController.verifyToken(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '令牌无效',
        data: {
          valid: false,
        },
        timestamp: expect.any(String),
      });
    });

    it('应该拒绝缺少令牌的请求', async () => {
      mockReq.body = {};

      await expect(
        authController.verifyToken(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('缺少令牌');
    });
  });

  describe('changePassword', () => {
    it('应该成功修改密码', async () => {
      mockReq.user = {
        userId: 1,
        userType: 'employee',
        merchantId: 1,
      };

      mockReq.body = {
        currentPassword: 'current-password',
        newPassword: 'NewPassword123',
      };

      mockAuthService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });

      await authController.changePassword(mockReq as Request, mockRes as Response);

      expect(mockAuthService.validatePasswordStrength).toHaveBeenCalledWith('NewPassword123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '密码修改成功',
        timestamp: expect.any(String),
      });
    });

    it('应该拒绝未登录用户的密码修改请求', async () => {
      mockReq.user = undefined;
      mockReq.body = {
        currentPassword: 'current-password',
        newPassword: 'NewPassword123',
      };

      await expect(
        authController.changePassword(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('用户未登录');
    });

    it('应该拒绝缺少密码的请求', async () => {
      mockReq.user = {
        userId: 1,
        userType: 'employee',
        merchantId: 1,
      };

      mockReq.body = {
        currentPassword: 'current-password',
      };

      await expect(
        authController.changePassword(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('请提供当前密码和新密码');
    });

    it('应该拒绝弱密码', async () => {
      mockReq.user = {
        userId: 1,
        userType: 'employee',
        merchantId: 1,
      };

      mockReq.body = {
        currentPassword: 'current-password',
        newPassword: 'weak',
      };

      mockAuthService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['密码长度至少8位', '密码必须包含大写字母'],
      });

      await expect(
        authController.changePassword(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('密码强度不足');
    });
  });

  describe('resetPassword', () => {
    it('应该成功重置密码', async () => {
      mockReq.body = {
        phone: '13800138000',
        code: '123456',
      };

      await authController.resetPassword(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '密码重置成功',
        timestamp: expect.any(String),
      });
    });

    it('应该拒绝缺少手机号或验证码的请求', async () => {
      mockReq.body = {
        phone: '13800138000',
      };

      await expect(
        authController.resetPassword(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('请提供手机号和验证码');
    });
  });

  describe('sendVerificationCode', () => {
    it('应该成功发送验证码', async () => {
      mockReq.body = {
        phone: '13800138000',
        type: 'login',
      };

      await authController.sendVerificationCode(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '验证码发送成功',
        data: {
          phone: '13800138000',
          type: 'login',
          expiresIn: 300,
        },
        timestamp: expect.any(String),
      });
    });

    it('应该拒绝缺少手机号的请求', async () => {
      const error = await expectControllerError(
        authController.sendVerificationCode,
        { body: {} },
        '请提供手机号',
        400
      );
      expect(error.message).toContain('请提供手机号');
    });

    it('应该拒绝无效的手机号格式', async () => {
      const error = await expectControllerError(
        authController.sendVerificationCode,
        { body: { phone: '123456' } },
        '手机号格式无效',
        400
      );
      expect(error.message).toContain('手机号格式无效');
    });

    it('应该使用默认验证码类型', async () => {
      const { response } = await expectControllerSuccess(
        authController.sendVerificationCode,
        { body: { phone: '13800138000' } }
      );

      expectValidApiResponse(response, {
        phone: '13800138000',
        type: 'login',
        expiresIn: 300
      });
    });
  });

  describe('healthCheck', () => {
    it('应该返回健康状态', async () => {
      mockWechatUtils.validateConfig.mockReturnValue({
        isValid: true,
        errors: [],
      });

      const { response } = await expectControllerSuccess(
        authController.healthCheck,
        {}
      );

      expect(mockWechatUtils.validateConfig).toHaveBeenCalled();
      expectValidApiResponse(response, {
        service: 'auth',
        status: 'healthy',
        wechatConfig: 'valid',
        wechatErrors: [],
      });
    });

    it('应该报告微信配置错误', async () => {
      mockWechatUtils.validateConfig.mockReturnValue({
        isValid: false,
        errors: ['缺少AppID', '缺少AppSecret'],
      });

      await authController.healthCheck(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '认证服务运行正常',
        data: {
          service: 'auth',
          status: 'healthy',
          timestamp: expect.any(String),
          wechatConfig: 'invalid',
          wechatErrors: ['缺少AppID', '缺少AppSecret'],
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('边界条件和错误处理', () => {
    it('应该处理空字符串token', async () => {
      const error = await expectControllerError(
        authController.verifyToken,
        { body: { token: '' } },
        '缺少令牌',
        400
      );
      expect(error.message).toContain('缺少令牌');
    });

    it('应该处理空字符串刷新令牌', async () => {
      const error = await expectControllerError(
        authController.refreshToken,
        { body: { refreshToken: '' } },
        '缺少刷新令牌',
        400
      );
      expect(error.message).toContain('缺少刷新令牌');
    });

    it('应该处理空字符串微信授权码', async () => {
      const error = await expectControllerError(
        authController.wechatLogin,
        { body: { code: '', userType: 'employee' } },
        '缺少微信授权码',
        400
      );
      expect(error.message).toContain('缺少微信授权码');
    });

    it('应该处理各种手机号格式错误', async () => {
      const invalidPhones = [
        '12345678901', // 11位但不是1开头
        '1380013800', // 10位
        '138001380001', // 12位
        'abcdefghijk', // 非数字
        '12800138000', // 第二位不是3-9
      ];

      for (const phone of invalidPhones) {
        const error = await expectControllerError(
          authController.sendVerificationCode,
          { body: { phone } },
          '手机号格式无效',
          400
        );
        expect(error.message).toContain('手机号格式无效');
      }
    });

    it('应该处理有效的手机号格式', async () => {
      const validPhones = [
        '13800138000',
        '15912345678',
        '18612345678',
        '19912345678',
      ];

      for (const phone of validPhones) {
        mockReq.body = { phone };

        await authController.sendVerificationCode(mockReq as Request, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              phone,
            }),
          })
        );

        vi.clearAllMocks();
      }
    });
  });
});