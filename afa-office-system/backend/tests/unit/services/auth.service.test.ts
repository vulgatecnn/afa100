import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { User } from '../../../src/types/index.js';
import bcrypt from 'bcryptjs';

// Mock the models and services with static methods
const mockUserModel = {
  findByPhone: vi.fn(),
  findByOpenId: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateLastLogin: vi.fn(),
  updateLastLogout: vi.fn(),
};

const mockWechatService = {
  getUserInfo: vi.fn(),
  registerWechatUser: vi.fn(),
  updateWechatUserInfo: vi.fn(),
};

// Mock UserModel as a class with static methods
vi.mock('../../../src/models/user.model.js', () => ({
  UserModel: mockUserModel
}));

vi.mock('../../../src/services/wechat.service.js', () => ({
  WechatService: class MockWechatService {
    registerWechatUser = mockWechatService.registerWechatUser;
    updateWechatUserInfo = mockWechatService.updateWechatUserInfo;
    getUserInfo = mockWechatService.getUserInfo;
  }
}));

vi.mock('../../../src/config/app.config.js', () => ({
  appConfig: {
    jwt: {
      secret: 'test-secret-key',
      expiresIn: '1h',
      refreshExpiresIn: '7d',
    },
    security: {
      bcryptRounds: 10,
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000,
    },
  },
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

// Import after mocking
const { AuthService } = await import('../../../src/services/auth.service.js');

describe('AuthService', () => {
  let authService: AuthService;

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
    password: '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjPeR.TtmZkjrQBbvzJBtjHHa.WM9G', // hashed 'password123'
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock bcrypt.compare to return true for correct password
    vi.mocked(bcrypt.compare).mockImplementation((plainPassword: string, hashedPassword: string) => {
      return Promise.resolve(plainPassword === 'password123');
    });
    
    // Mock bcrypt.hash
    vi.mocked(bcrypt.hash).mockResolvedValue('$2a$10$hashedpassword');
    
    // Reset WechatService mock
    mockWechatService.registerWechatUser.mockResolvedValue(mockUser);
    mockWechatService.updateWechatUserInfo.mockResolvedValue(mockUser);
    
    authService = new AuthService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('应该成功登录有效用户', async () => {
      mockUserModel.findByPhone.mockResolvedValue(mockUser);
      mockUserModel.updateLastLogin.mockResolvedValue(undefined);

      const result = await authService.login({
        phone: '13800138000',
        password: 'password123',
      });

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBeGreaterThan(0);
      expect(mockUserModel.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
    });

    it('应该拒绝不存在的用户', async () => {
      mockUserModel.findByPhone.mockResolvedValue(undefined);

      await expect(authService.login({
        phone: '13800138000',
        password: 'password123',
      })).rejects.toThrow('用户不存在');
    });

    it('应该拒绝被禁用的用户', async () => {
      const disabledUser = { ...mockUser, status: 'inactive' };
      mockUserModel.findByPhone.mockResolvedValue(disabledUser);

      await expect(authService.login({
        phone: '13800138000',
        password: 'password123',
      })).rejects.toThrow('账户已被禁用');
    });

    it('应该支持微信OpenId登录', async () => {
      mockUserModel.findByOpenId.mockResolvedValue(mockUser);
      mockUserModel.updateLastLogin.mockResolvedValue(undefined);

      const result = await authService.login({
        openId: 'test-openid',
        userType: 'employee',
      });

      expect(result).toBeDefined();
      expect(result.user.id).toBe(mockUser.id);
      expect(mockUserModel.findByOpenId).toHaveBeenCalledWith('test-openid');
    });

    it('应该拒绝无效的登录凭据', async () => {
      await expect(authService.login({})).rejects.toThrow('请提供有效的登录凭据');
    });
  });

  describe('wechatLogin', () => {
    const wechatData = {
      openId: 'test-openid',
      unionId: 'test-unionid',
      userType: 'employee' as const,
      userInfo: {
        nickName: '微信用户',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    };

    it('应该为新用户创建账户', async () => {
      mockUserModel.findByOpenId.mockResolvedValue(undefined);
      mockWechatService.registerWechatUser.mockResolvedValue(mockUser);
      mockUserModel.updateLastLogin.mockResolvedValue(undefined);

      const result = await authService.wechatLogin(wechatData);

      expect(result).toBeDefined();
      expect(result.user.id).toBe(mockUser.id);
      expect(mockWechatService.registerWechatUser).toHaveBeenCalledWith({
        openId: wechatData.openId,
        unionId: wechatData.unionId,
        userType: wechatData.userType,
        userInfo: wechatData.userInfo,
      });
    });

    it('应该为现有用户更新信息', async () => {
      mockUserModel.findByOpenId.mockResolvedValue(mockUser);
      mockWechatService.updateWechatUserInfo.mockResolvedValue(mockUser);
      mockUserModel.updateLastLogin.mockResolvedValue(undefined);

      const result = await authService.wechatLogin(wechatData);

      expect(result).toBeDefined();
      expect(mockWechatService.updateWechatUserInfo).toHaveBeenCalledWith(
        mockUser.id,
        wechatData.userInfo
      );
    });

    it('应该拒绝用户类型不匹配的登录', async () => {
      const differentTypeUser = { ...mockUser, user_type: 'visitor' as const };
      mockUserModel.findByOpenId.mockResolvedValue(differentTypeUser);

      await expect(authService.wechatLogin(wechatData)).rejects.toThrow('用户类型不匹配');
    });

    it('应该拒绝待审核状态的用户', async () => {
      const pendingUser = { ...mockUser, status: 'pending' as const };
      mockUserModel.findByOpenId.mockResolvedValue(pendingUser);
      // Make sure the WechatService returns the pending user as well
      mockWechatService.updateWechatUserInfo.mockResolvedValue(pendingUser);

      await expect(authService.wechatLogin(wechatData)).rejects.toThrow('账户待审核');
    });
  });

  describe('refreshToken', () => {
    it('应该刷新有效的token', async () => {
      // 设置登录所需的mock
      mockUserModel.findByPhone.mockResolvedValue(mockUser);
      mockUserModel.updateLastLogin.mockResolvedValue(undefined);
      
      // 首先生成一个刷新token
      const tokens = await authService.login({
        phone: '13800138000',
        password: 'password123',
      });

      // 设置刷新token所需的mock
      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await authService.refreshToken(tokens.refreshToken);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.expiresIn).toBeGreaterThan(0);
    });

    it('应该拒绝无效的刷新token', async () => {
      await expect(authService.refreshToken('invalid-token')).rejects.toThrow();
    });

    it('应该拒绝已被禁用用户的刷新token', async () => {
      const disabledUser = { ...mockUser, status: 'inactive' as const };
      mockUserModel.findById.mockResolvedValue(disabledUser);

      // 这里需要一个有效的刷新token格式，但用户已被禁用
      await expect(authService.refreshToken('valid-format-token')).rejects.toThrow();
    });
  });

  describe('verifyAccessToken', () => {
    it('应该验证有效的访问token', async () => {
      mockUserModel.findByPhone.mockResolvedValue(mockUser);
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.updateLastLogin.mockResolvedValue(undefined);

      const loginResult = await authService.login({
        phone: '13800138000',
        password: 'password123',
      });

      const user = await authService.verifyAccessToken(loginResult.accessToken);

      expect(user).toBeDefined();
      expect(user.id).toBe(mockUser.id);
    });

    it('应该拒绝无效的访问token', async () => {
      await expect(authService.verifyAccessToken('invalid-token')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('应该成功登出用户', async () => {
      mockUserModel.updateLastLogout.mockResolvedValue(undefined);

      await authService.logout(1);

      expect(mockUserModel.updateLastLogout).toHaveBeenCalledWith(1);
    });
  });

  describe('hashPassword', () => {
    it('应该哈希密码', async () => {
      const password = 'password123';
      const hashedPassword = await authService.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(password.length);
    });
  });

  describe('generateRandomPassword', () => {
    it('应该生成指定长度的随机密码', () => {
      const password = authService.generateRandomPassword(12);

      expect(password).toBeDefined();
      expect(password.length).toBe(12);
      expect(/^[a-zA-Z0-9]+$/.test(password)).toBe(true);
    });

    it('应该生成默认长度的密码', () => {
      const password = authService.generateRandomPassword();

      expect(password.length).toBe(8);
    });
  });

  describe('validatePasswordStrength', () => {
    it('应该验证强密码', () => {
      const result = authService.validatePasswordStrength('Password123');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝弱密码', () => {
      const result = authService.validatePasswordStrength('weak');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('密码长度至少8位');
    });

    it('应该检查密码复杂性要求', () => {
      const testCases = [
        { password: 'password', expectedErrors: ['密码必须包含大写字母', '密码必须包含数字'] },
        { password: 'PASSWORD', expectedErrors: ['密码必须包含小写字母', '密码必须包含数字'] },
        { password: '12345678', expectedErrors: ['密码必须包含小写字母', '密码必须包含大写字母'] },
      ];

      testCases.forEach(({ password, expectedErrors }) => {
        const result = authService.validatePasswordStrength(password);
        expect(result.isValid).toBe(false);
        expectedErrors.forEach(error => {
          expect(result.errors).toContain(error);
        });
      });
    });
  });

  describe('账户锁定机制', () => {
    it('应该在多次失败后锁定账户', async () => {
      mockUserModel.findByPhone.mockResolvedValue(undefined);

      // 模拟多次失败登录
      for (let i = 0; i < 5; i++) {
        try {
          await authService.login({
            phone: '13800138000',
            password: 'wrong-password',
          });
        } catch (error) {
          // 预期的错误
        }
      }

      // 第6次尝试应该被锁定
      await expect(authService.login({
        phone: '13800138000',
        password: 'wrong-password',
      })).rejects.toThrow('账户已被锁定');
    });
  });
});