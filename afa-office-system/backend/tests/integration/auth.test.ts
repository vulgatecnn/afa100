import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../../src/routes/v1/auth.routes.js';
import { errorHandler } from '../../src/middleware/error.middleware.js';
import database from '../../src/utils/database.js';

// Mock database
vi.mock('../../src/utils/database.js');

// Mock config
vi.mock('../../src/config/app.config.js', () => ({
  appConfig: {
    jwt: {
      secret: 'test-secret-key-for-integration-testing',
      expiresIn: '1h',
      refreshExpiresIn: '7d',
    },
    security: {
      bcryptRounds: 10,
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000,
    },
    wechat: {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
    },
  },
}));

// Mock WeChat API
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    isAxiosError: vi.fn(),
  },
}));

describe('Auth Integration Tests', () => {
  let app: express.Application;
  let mockDatabase: any;

  const mockUser = {
    id: 1,
    name: '测试用户',
    phone: '13800138000',
    user_type: 'employee',
    status: 'active',
    merchant_id: 1,
    open_id: 'test-openid',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
    app.use(errorHandler);

    // Mock database methods
    mockDatabase = {
      get: vi.fn(),
      run: vi.fn(),
      all: vi.fn(),
    };

    vi.mocked(database).get = mockDatabase.get;
    vi.mocked(database).run = mockDatabase.run;
    vi.mocked(database).all = mockDatabase.all;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    it('应该成功登录有效用户', async () => {
      mockDatabase.get.mockResolvedValue(mockUser);
      mockDatabase.run.mockResolvedValue({ changes: 1 });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138000',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('应该拒绝无效的请求数据', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: 'invalid-phone',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('验证失败');
    });

    it('应该拒绝不存在的用户', async () => {
      mockDatabase.get.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138000',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('应该拒绝缺少必填字段的请求', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/wechat-login', () => {
    beforeEach(() => {
      // Mock WeChat API response
      const axios = require('axios');
      axios.default.get.mockResolvedValue({
        data: {
          openid: 'test-openid',
          session_key: 'test-session-key',
          unionid: 'test-unionid',
        },
      });
    });

    it('应该成功处理微信登录', async () => {
      mockDatabase.get.mockResolvedValue(mockUser);
      mockDatabase.run.mockResolvedValue({ changes: 1 });

      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'test-wechat-code',
          userType: 'employee',
          userInfo: {
            nickName: '微信用户',
            avatarUrl: 'https://example.com/avatar.jpg',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('应该拒绝无效的用户类型', async () => {
      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'test-wechat-code',
          userType: 'invalid-type',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('应该拒绝缺少微信授权码的请求', async () => {
      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          userType: 'employee',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('微信授权码');
    });

    it('应该处理微信API错误', async () => {
      const axios = require('axios');
      axios.default.get.mockRejectedValue(new Error('微信API错误'));

      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: 'invalid-code',
          userType: 'employee',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('应该刷新有效的token', async () => {
      // 首先登录获取token
      mockDatabase.get.mockResolvedValue(mockUser);
      mockDatabase.run.mockResolvedValue({ changes: 1 });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138000',
          password: 'password123',
        });

      const refreshToken = loginResponse.body.data.refreshToken;

      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('应该拒绝无效的刷新token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: 'invalid-token',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('应该拒绝缺少刷新token的请求', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/verify-token', () => {
    it('应该验证有效的token', async () => {
      // 首先登录获取token
      mockDatabase.get.mockResolvedValue(mockUser);
      mockDatabase.run.mockResolvedValue({ changes: 1 });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138000',
          password: 'password123',
        });

      const accessToken = loginResponse.body.data.accessToken;

      const response = await request(app)
        .post('/api/v1/auth/verify-token')
        .send({
          token: accessToken,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
    });

    it('应该拒绝无效的token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-token')
        .send({
          token: 'invalid-token',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.data.valid).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('应该返回当前用户信息', async () => {
      // 首先登录获取token
      mockDatabase.get.mockResolvedValue(mockUser);
      mockDatabase.run.mockResolvedValue({ changes: 1 });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138000',
          password: 'password123',
        });

      const accessToken = loginResponse.body.data.accessToken;

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.id).toBe(mockUser.id);
    });

    it('应该拒绝未认证的请求', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('应该拒绝无效token的请求', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('应该成功登出用户', async () => {
      // 首先登录获取token
      mockDatabase.get.mockResolvedValue(mockUser);
      mockDatabase.run.mockResolvedValue({ changes: 1 });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138000',
          password: 'password123',
        });

      const accessToken = loginResponse.body.data.accessToken;

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('登出成功');
    });

    it('应该拒绝未认证的登出请求', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/send-code', () => {
    it('应该发送验证码', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-code')
        .send({
          phone: '13800138000',
          type: 'login',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.phone).toBe('13800138000');
    });

    it('应该拒绝无效的手机号', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-code')
        .send({
          phone: 'invalid-phone',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('应该拒绝缺少手机号的请求', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-code')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/health', () => {
    it('应该返回认证服务健康状态', async () => {
      const response = await request(app)
        .get('/api/v1/auth/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe('auth');
      expect(response.body.data.status).toBe('healthy');
    });
  });

  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      mockDatabase.get.mockRejectedValue(new Error('数据库连接失败'));

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138000',
          password: 'password123',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('应该处理JSON格式错误', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid-json');

      expect(response.status).toBe(400);
    });

    it('应该处理超大请求体', async () => {
      const largeData = 'x'.repeat(10 * 1024 * 1024); // 10MB

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138000',
          password: largeData,
        });

      expect(response.status).toBe(413);
    });
  });

  describe('安全性测试', () => {
    it('应该防止SQL注入攻击', async () => {
      mockDatabase.get.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: "'; DROP TABLE users; --",
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('应该防止XSS攻击', async () => {
      const response = await request(app)
        .post('/api/v1/auth/wechat-login')
        .send({
          code: '<script>alert("xss")</script>',
          userType: 'employee',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('应该限制请求频率', async () => {
      // 模拟大量请求
      const requests = Array(20).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            phone: '13800138000',
            password: 'wrong-password',
          })
      );

      const responses = await Promise.all(requests);
      
      // 检查是否有请求被限制
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});