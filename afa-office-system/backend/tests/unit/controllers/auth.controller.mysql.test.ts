/**
 * AuthController MySQL单元测试
 * 测试认证控制器的登录、登出、token验证接口
 * 确保覆盖所有分支和错误场景
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { AuthController } from '../../../src/controllers/auth.controller.js';
import { AuthService } from '../../../src/services/auth.service.js';
import { WechatUtils } from '../../../src/utils/wechat.js';
import { errorHandler } from '../../../src/middleware/error.middleware.js';
import { UserTestFactory } from '../../helpers/mysql-test-factory.js';

// Mock dependencies
vi.mock('../../../src/services/auth.service.js');
vi.mock('../../../src/utils/wechat.js');

describe('AuthController MySQL单元测试', () => {
  let app: express.Application;
  let authController: AuthController;
  let mockAuthService: any;
  let mockWechatUtils: any;

  beforeEach(async () => {
    // 重置所有mock
    vi.clearAllMocks();

    // 创建mock AuthService
    mockAuthService = {
      login: vi.fn(),
      wechatLogin: vi.fn(),
      logout: vi.fn(),
      verifyAccessToken: vi.fn(),
      refreshToken: vi.fn(),
      validatePasswordStrength: vi.fn()
    };

    // 创建mock WechatUtils
    mockWechatUtils = {
      getSessionByCode: vi.fn(),
      formatUserInfo: vi.fn(),
      validateConfig: vi.fn()
    };

    // 替换依赖的实现
    vi.mocked(AuthService).mockImplementation(() => mockAuthService);
    vi.mocked(WechatUtils, true).getSessionByCode = mockWechatUtils.getSessionByCode;
    vi.mocked(WechatUtils, true).formatUserInfo = mockWechatUtils.formatUserInfo;
    vi.mocked(WechatUtils, true).validateConfig = mockWechatUtils.validateConfig;

    // 创建Express应用和控制器
    app = express();
    app.use(express.json());
    
    // 添加用户信息到请求对象的中间件
    app.use((req: any, res, next) => {
      req.user = { userId: 1 };
      req.userDetails = { id: 1, name: '测试用户', phone: '13800138000' };
      next();
    });
    
    authController = new AuthController();

    // 设置路由
    app.post('/auth/login', authController.login);
    app.post('/auth/wechat-login', authController.wechatLogin);
    app.post('/auth/logout', authController.logout);
    app.post('/auth/verify', authController.verifyToken);
    app.post('/auth/refresh', authController.refreshToken);
    app.get('/auth/me', authController.getCurrentUser);
    app.post('/auth/change-password', authController.changePassword);
    app.post('/auth/reset-password', authController.resetPassword);
    app.post('/auth/send-code', authController.sendVerificationCode);
    app.get('/auth/health', authController.healthCheck);
    
    // 添加错误处理中间件
    app.use(errorHandler);
  });

  describe('POST /auth/login', () => {
    it('应该成功使用手机号密码登录', async () => {
      // 准备测试数据
      const loginData = {
        phone: '13800138000',
        password: 'password123',
        userType: 'employee'
      };

      const mockUser = await UserTestFactory.create({
        phone: loginData.phone,
        user_type: 'merchant_employee',
        status: 'active'
      });

      const mockResponse = {
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: mockUser.id,
          name: mockUser.name,
          phone: mockUser.phone,
          userType: mockUser.user_type
        }
      };

      // 设置mock返回值
      mockAuthService.login.mockResolvedValue(mockResponse);

      // 执行请求
      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      // 验证响应
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBe('mock-jwt-token');
      expect(response.body.data.user.phone).toBe(loginData.phone);
      expect(response.body.message).toBe('登录成功');

      // 验证服务调用
      expect(mockAuthService.login).toHaveBeenCalledWith({
        phone: loginData.phone,
        password: loginData.password,
        openId: undefined,
        userType: loginData.userType
      });
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
    });

    it('应该成功使用openId登录', async () => {
      const loginData = {
        openId: 'test-open-id',
        userType: 'visitor'
      };

      const mockResponse = {
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: 1,
          openId: loginData.openId,
          userType: loginData.userType
        }
      };

      mockAuthService.login.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBe('mock-jwt-token');
      expect(mockAuthService.login).toHaveBeenCalledWith({
        phone: undefined,
        password: undefined,
        openId: loginData.openId,
        userType: loginData.userType
      });
    });

    it('应该处理缺少必填字段的情况', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('请提供手机号和密码或微信授权码');
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('应该处理登录失败的情况', async () => {
      const loginData = {
        phone: '13800138000',
        password: 'wrongpassword'
      };

      mockAuthService.login.mockRejectedValue(new Error('密码错误'));

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(mockAuthService.login).toHaveBeenCalled();
    });
  });

  describe('POST /auth/wechat-login', () => {
    it('应该成功进行微信登录', async () => {
      const loginData = {
        code: 'wechat-auth-code',
        userType: 'visitor',
        userInfo: {
          nickName: '测试用户',
          avatarUrl: 'https://example.com/avatar.jpg'
        }
      };

      const mockWechatSession = {
        openid: 'test-openid',
        session_key: 'test-session-key'
      };

      const mockFormattedUserInfo = {
        nickname: '测试用户',
        avatar: 'https://example.com/avatar.jpg'
      };

      const mockLoginResult = {
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: 1,
          openId: mockWechatSession.openid,
          userType: loginData.userType
        }
      };

      mockWechatUtils.getSessionByCode.mockResolvedValue(mockWechatSession);
      mockWechatUtils.formatUserInfo.mockReturnValue(mockFormattedUserInfo);
      mockAuthService.wechatLogin.mockResolvedValue(mockLoginResult);

      const response = await request(app)
        .post('/auth/wechat-login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBe('mock-jwt-token');
      expect(response.body.message).toBe('微信登录成功');

      expect(mockWechatUtils.getSessionByCode).toHaveBeenCalledWith(loginData.code);
      expect(mockWechatUtils.formatUserInfo).toHaveBeenCalledWith(loginData.userInfo);
      expect(mockAuthService.wechatLogin).toHaveBeenCalledWith({
        openId: mockWechatSession.openid,
        userInfo: mockFormattedUserInfo,
        userType: loginData.userType
      });
    });

    it('应该处理缺少微信授权码的情况', async () => {
      const loginData = {
        userType: 'visitor'
      };

      const response = await request(app)
        .post('/auth/wechat-login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('缺少微信授权码');
      expect(mockWechatUtils.getSessionByCode).not.toHaveBeenCalled();
    });

    it('应该处理缺少用户类型的情况', async () => {
      const loginData = {
        code: 'wechat-auth-code'
      };

      const response = await request(app)
        .post('/auth/wechat-login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('请选择用户类型');
    });

    it('应该处理无效用户类型的情况', async () => {
      const loginData = {
        code: 'wechat-auth-code',
        userType: 'invalid-type'
      };

      const response = await request(app)
        .post('/auth/wechat-login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('用户类型无效');
    });

    it('应该处理微信API调用失败的情况', async () => {
      const loginData = {
        code: 'invalid-code',
        userType: 'visitor'
      };

      mockWechatUtils.getSessionByCode.mockRejectedValue(new Error('微信授权码无效'));

      const response = await request(app)
        .post('/auth/wechat-login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('微信授权码无效');
    });
  });

  describe('POST /auth/logout', () => {
    it('应该成功登出', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('登出成功');
      expect(mockAuthService.logout).toHaveBeenCalledWith(1);
    });

    it('应该处理登出失败的情况', async () => {
      mockAuthService.logout.mockRejectedValue(new Error('登出失败'));

      const response = await request(app)
        .post('/auth/logout')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/verify', () => {
    it('应该成功验证有效token', async () => {
      const verifyData = {
        token: 'valid-jwt-token'
      };

      const mockUser = await UserTestFactory.create();
      mockAuthService.verifyAccessToken.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/verify')
        .send(verifyData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.user.id).toBe(mockUser.id);
      expect(response.body.data.user.name).toBe(mockUser.name);
      expect(response.body.message).toBe('令牌有效');
      expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith(verifyData.token);
    });

    it('应该处理无效token', async () => {
      const verifyData = {
        token: 'invalid-token'
      };

      mockAuthService.verifyAccessToken.mockRejectedValue(new Error('token无效'));

      const response = await request(app)
        .post('/auth/verify')
        .send(verifyData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.data.valid).toBe(false);
      expect(response.body.message).toBe('令牌无效');
    });

    it('应该处理缺少token的情况', async () => {
      const response = await request(app)
        .post('/auth/verify')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('缺少令牌');
      expect(mockAuthService.verifyAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/refresh', () => {
    it('应该成功刷新token', async () => {
      const refreshData = {
        refreshToken: 'valid-refresh-token'
      };

      const mockRefreshResult = {
        token: 'new-jwt-token',
        refreshToken: 'new-refresh-token'
      };

      mockAuthService.refreshToken.mockResolvedValue(mockRefreshResult);

      const response = await request(app)
        .post('/auth/refresh')
        .send(refreshData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBe('new-jwt-token');
      expect(response.body.data.refreshToken).toBe('new-refresh-token');
      expect(response.body.message).toBe('Token刷新成功');
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(refreshData.refreshToken);
    });

    it('应该处理无效refresh token', async () => {
      const refreshData = {
        refreshToken: 'invalid-refresh-token'
      };

      mockAuthService.refreshToken.mockRejectedValue(new Error('refresh token无效'));

      const response = await request(app)
        .post('/auth/refresh')
        .send(refreshData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('应该处理缺少refresh token的情况', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('缺少刷新令牌');
      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
    });
  });

  describe('GET /auth/me', () => {
    it('应该成功获取当前用户信息', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual({
        id: 1,
        name: '测试用户',
        phone: '13800138000'
      });
      expect(response.body.message).toBe('获取用户信息成功');
    });
  });

  describe('POST /auth/change-password', () => {
    it('应该成功修改密码', async () => {
      const passwordData = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123'
      };

      mockAuthService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: []
      });

      const response = await request(app)
        .post('/auth/change-password')
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('密码修改成功');
    });

    it('应该处理缺少密码字段的情况', async () => {
      const passwordData = {
        currentPassword: 'oldpassword123'
        // 缺少newPassword
      };

      const response = await request(app)
        .post('/auth/change-password')
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('请提供当前密码和新密码');
    });

    it('应该处理密码强度不足的情况', async () => {
      const passwordData = {
        currentPassword: 'oldpassword123',
        newPassword: '123'
      };

      mockAuthService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['密码长度至少8位', '密码必须包含字母和数字']
      });

      const response = await request(app)
        .post('/auth/change-password')
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('密码强度不足');
    });
  });

  describe('POST /auth/reset-password', () => {
    it('应该成功重置密码', async () => {
      const resetData = {
        phone: '13800138000',
        code: '123456'
      };

      const response = await request(app)
        .post('/auth/reset-password')
        .send(resetData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('密码重置成功');
    });

    it('应该处理缺少必填字段的情况', async () => {
      const resetData = {
        phone: '13800138000'
        // 缺少code
      };

      const response = await request(app)
        .post('/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('请提供手机号和验证码');
    });
  });

  describe('POST /auth/send-code', () => {
    it('应该成功发送验证码', async () => {
      const codeData = {
        phone: '13800138000',
        type: 'login'
      };

      const response = await request(app)
        .post('/auth/send-code')
        .send(codeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('验证码发送成功');
      expect(response.body.data.phone).toBe(codeData.phone);
      expect(response.body.data.expiresIn).toBe(300);
    });

    it('应该处理缺少手机号的情况', async () => {
      const response = await request(app)
        .post('/auth/send-code')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('请提供手机号');
    });

    it('应该处理无效手机号格式', async () => {
      const codeData = {
        phone: '123456789'
      };

      const response = await request(app)
        .post('/auth/send-code')
        .send(codeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('手机号格式无效');
    });
  });

  describe('GET /auth/health', () => {
    it('应该返回健康检查信息', async () => {
      mockWechatUtils.validateConfig.mockReturnValue({
        isValid: true,
        errors: []
      });

      const response = await request(app)
        .get('/auth/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('认证服务运行正常');
      expect(response.body.data.service).toBe('auth');
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.wechatConfig).toBe('valid');
    });

    it('应该处理微信配置无效的情况', async () => {
      mockWechatUtils.validateConfig.mockReturnValue({
        isValid: false,
        errors: ['缺少APP_ID配置']
      });

      const response = await request(app)
        .get('/auth/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.wechatConfig).toBe('invalid');
      expect(response.body.data.wechatErrors).toEqual(['缺少APP_ID配置']);
    });
  });

  describe('错误处理和边界情况', () => {
    it('应该处理请求体为空的情况', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send()
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('应该处理超长手机号', async () => {
      const loginData = {
        phone: '1'.repeat(20),
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/send-code')
        .send({ phone: loginData.phone })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('手机号格式无效');
    });

    it('应该处理并发请求', async () => {
      const loginData = {
        phone: '13800138000',
        password: 'password123'
      };

      mockAuthService.login.mockResolvedValue({
        token: 'mock-jwt-token',
        user: { id: 1, phone: loginData.phone }
      });

      // 并发发送多个请求
      const promises = Array.from({ length: 3 }, () =>
        request(app)
          .post('/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(promises);

      // 验证所有请求都成功
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      expect(mockAuthService.login).toHaveBeenCalledTimes(3);
    });
  });
});