/**
 * 简化的认证控制器测试
 * 专注于核心功能和错误处理，确保80%覆盖率
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
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

describe('AuthController - 简化测试', () => {
  let authController: AuthController;

  const mockUser = createTestUser({
    phone: '13800138000',
    user_type: 'employee',
    open_id: 'test-openid',
    union_id: 'test-unionid',
  });

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

  describe('登录功能', () => {
    it('应该成功处理手机号密码登录', async () => {
      mockAuthService.login.mockResolvedValue(mockLoginResult);

      const { response } = await expectControllerSuccess(
        authController.login,
        {
          body: {
            phone: '13800138000',
            password: 'password123',
          }
        }
      );

      expect(mockAuthService.login).toHaveBeenCalledWith({
        phone: '13800138000',
        password: 'password123',
      });

      expectValidApiResponse(response, {
        user: expect.objectContaining({
          id: mockUser.id,
          name: mockUser.name,
          phone: mockUser.phone,
        }),
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
    });

    it('应该拒绝缺少必填字段的请求', async () => {
      const error = await expectControllerError(
        authController.login,
        { body: {} },
        '请提供手机号或微信OpenId',
        400
      );
      expect(error.message).toContain('请提供手机号或微信OpenId');
    });

    it('应该处理登录服务错误', async () => {
      mockAuthService.login.mockRejectedValue(new Error('用户不存在'));

      const error = await expectControllerError(
        authController.login,
        {
          body: {
            phone: '13800138000',
            password: 'wrong-password',
          }
        }
      );

      expect(error.message).toContain('用户不存在');
    });
  });

  describe('微信登录功能', () => {
    it('应该成功处理微信小程序登录', async () => {
      mockWechatUtils.getSessionByCode.mockResolvedValue({
        openid: 'test-openid',
        unionid: 'test-unionid',
        session_key: 'test-session-key',
      });

      mockAuthService.wechatLogin.mockResolvedValue(mockLoginResult);

      const { response } = await expectControllerSuccess(
        authController.wechatLogin,
        {
          body: {
            code: 'wx-auth-code',
            userType: 'employee',
          }
        }
      );

      expect(mockWechatUtils.getSessionByCode).toHaveBeenCalledWith('wx-auth-code');
      expect(mockAuthService.wechatLogin).toHaveBeenCalled();

      expectValidApiResponse(response, {
        user: expect.objectContaining({
          id: mockUser.id,
          name: mockUser.name,
        }),
        accessToken: 'mock-access-token',
      });
    });

    it('应该拒绝缺少授权码的请求', async () => {
      const error = await expectControllerError(
        authController.wechatLogin,
        {
          body: {
            userType: 'employee',
          }
        },
        '缺少微信授权码',
        400
      );
      expect(error.message).toContain('缺少微信授权码');
    });

    it('应该拒绝缺少用户类型的请求', async () => {
      const error = await expectControllerError(
        authController.wechatLogin,
        {
          body: {
            code: 'wx-auth-code',
          }
        },
        '缺少用户类型',
        400
      );
      expect(error.message).toContain('缺少用户类型');
    });
  });

  describe('令牌管理', () => {
    it('应该成功刷新token', async () => {
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      });

      const { response } = await expectControllerSuccess(
        authController.refreshToken,
        {
          body: {
            refreshToken: 'valid-refresh-token',
          }
        }
      );

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expectValidApiResponse(response, {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('应该拒绝缺少刷新令牌的请求', async () => {
      const error = await expectControllerError(
        authController.refreshToken,
        { body: {} },
        '缺少刷新令牌',
        400
      );
      expect(error.message).toContain('缺少刷新令牌');
    });

    it('应该验证有效的token', async () => {
      mockAuthService.verifyAccessToken.mockResolvedValue({
        valid: true,
        user: mockUser,
        expiresIn: 1800,
      });

      const { response } = await expectControllerSuccess(
        authController.verifyToken,
        {
          body: {
            token: 'valid-token',
          }
        }
      );

      expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expectValidApiResponse(response, {
        valid: true,
        user: expect.objectContaining({
          id: mockUser.id,
          name: mockUser.name,
        }),
      });
    });

    it('应该拒绝缺少令牌的请求', async () => {
      const error = await expectControllerError(
        authController.verifyToken,
        { body: {} },
        '缺少令牌',
        400
      );
      expect(error.message).toContain('缺少令牌');
    });
  });

  describe('用户管理', () => {
    it('应该返回当前用户信息', async () => {
      const { response } = await expectControllerSuccess(
        authController.getCurrentUser,
        {
          userDetails: mockUser,
        }
      );

      expectValidApiResponse(response, {
        id: mockUser.id,
        name: mockUser.name,
        phone: mockUser.phone,
        user_type: mockUser.user_type,
      });
    });

    it('应该拒绝没有用户信息的请求', async () => {
      const error = await expectControllerError(
        authController.getCurrentUser,
        { userDetails: undefined },
        '用户信息不存在',
        401
      );
      expect(error.message).toContain('用户信息不存在');
    });

    it('应该成功登出用户', async () => {
      mockAuthService.logout.mockResolvedValue(true);

      const { response } = await expectControllerSuccess(
        authController.logout,
        {
          user: {
            userId: 1,
            userType: 'employee',
          }
        }
      );

      expect(mockAuthService.logout).toHaveBeenCalledWith(1);
      expectValidApiResponse(response);
    });
  });

  describe('密码管理', () => {
    it('应该成功修改密码', async () => {
      mockAuthService.validatePasswordStrength.mockReturnValue({ isValid: true });

      const { response } = await expectControllerSuccess(
        authController.changePassword,
        {
          user: {
            userId: 1,
            userType: 'employee',
          },
          body: {
            currentPassword: 'current-password',
            newPassword: 'NewPassword123!',
          }
        }
      );

      expect(mockAuthService.validatePasswordStrength).toHaveBeenCalledWith('NewPassword123!');
      expectValidApiResponse(response);
    });

    it('应该拒绝弱密码', async () => {
      mockAuthService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['密码长度不足'],
      });

      const error = await expectControllerError(
        authController.changePassword,
        {
          user: {
            userId: 1,
            userType: 'employee',
          },
          body: {
            currentPassword: 'current-password',
            newPassword: '123',
          }
        },
        '密码强度不足',
        400
      );
      expect(error.message).toContain('密码强度不足');
    });

    it('应该成功重置密码', async () => {
      const { response } = await expectControllerSuccess(
        authController.resetPassword,
        {
          body: {
            phone: '13800138000',
            code: '123456',
            newPassword: 'NewPassword123!',
          }
        }
      );

      expectValidApiResponse(response);
    });
  });

  describe('验证码功能', () => {
    it('应该成功发送验证码', async () => {
      const { response } = await expectControllerSuccess(
        authController.sendVerificationCode,
        {
          body: {
            phone: '13800138000',
            type: 'login',
          }
        }
      );

      expectValidApiResponse(response, {
        phone: '13800138000',
        type: 'login',
        expiresIn: 300,
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
        expiresIn: 300,
      });
    });
  });

  describe('健康检查', () => {
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

      const { response } = await expectControllerSuccess(
        authController.healthCheck,
        {}
      );

      expectValidApiResponse(response, {
        service: 'auth',
        status: 'healthy',
        wechatConfig: 'invalid',
        wechatErrors: ['缺少AppID', '缺少AppSecret'],
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
        const { response } = await expectControllerSuccess(
          authController.sendVerificationCode,
          { body: { phone } }
        );

        expectValidApiResponse(response, {
          phone,
          type: 'login',
          expiresIn: 300,
        });
      }
    });
  });
});