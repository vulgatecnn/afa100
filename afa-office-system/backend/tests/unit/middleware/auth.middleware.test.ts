import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import type { User, JwtPayload } from '../../../src/types/index.js';

// Mock the entire auth middleware module
const mockAuthService = {
  verifyAccessToken: vi.fn(),
};

const mockJwtUtils = {
  verifyAccessToken: vi.fn(),
};

vi.mock('../../../src/services/auth.service.js', () => ({
  AuthService: vi.fn().mockImplementation(() => mockAuthService)
}));

vi.mock('../../../src/utils/jwt.js', () => ({
  JwtUtils: mockJwtUtils
}));

// Import after mocking
const {
  authenticate,
  optionalAuth,
  requireUserType,
  requireMerchantAccess,
  requireAdmin,
  requireTenantAdmin,
  requireMerchantAdmin,
  requireEmployee,
  requireVisitor,
} = await import('../../../src/middleware/auth.middleware.js');

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const mockUser: User = {
    id: 1,
    name: '测试用户',
    user_type: 'employee',
    status: 'active',
    merchant_id: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockJwtPayload: JwtPayload = {
    userId: 1,
    userType: 'employee',
    merchantId: 1,
  };

  const mockUserContext = {
    ...mockJwtPayload,
    id: 1, // 添加id字段以匹配中间件的实际行为
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      headers: {},
      user: undefined,
      userDetails: undefined,
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    mockNext = vi.fn();

    mockJwtUtils.verifyAccessToken.mockReturnValue(mockJwtPayload);
    mockAuthService.verifyAccessToken.mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('authenticate', () => {
    it('应该成功认证有效的Bearer token', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid-token',
      };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJwtUtils.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(mockReq.user).toEqual(mockUserContext);
      expect(mockReq.userDetails).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该成功认证没有Bearer前缀的token', async () => {
      mockReq.headers = {
        authorization: 'valid-token',
      };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJwtUtils.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该拒绝缺少Authorization头的请求', async () => {
      mockReq.headers = {};

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '缺少认证令牌',
          statusCode: 401,
        })
      );
    });

    it('应该拒绝空的Authorization头', async () => {
      mockReq.headers = {
        authorization: '',
      };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '认证令牌格式错误',
          statusCode: 401,
        })
      );
    });

    it('应该拒绝空的Bearer token', async () => {
      mockReq.headers = {
        authorization: 'Bearer ',
      };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '认证令牌格式错误',
          statusCode: 401,
        })
      );
    });

    it('应该处理token过期错误', async () => {
      mockReq.headers = {
        authorization: 'Bearer expired-token',
      };

      mockJwtUtils.verifyAccessToken.mockImplementation(() => {
        throw new Error('访问令牌已过期');
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '认证令牌已过期',
          statusCode: 401,
        })
      );
    });

    it('应该处理token无效错误', async () => {
      mockReq.headers = {
        authorization: 'Bearer invalid-token',
      };

      mockJwtUtils.verifyAccessToken.mockImplementation(() => {
        throw new Error('访问令牌无效');
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '认证令牌无效',
          statusCode: 401,
        })
      );
    });

    it('应该处理用户不存在错误', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid-token',
      };

      mockAuthService.verifyAccessToken.mockRejectedValue(new Error('用户不存在'));

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '用户不存在',
          statusCode: 401,
        })
      );
    });

    it('应该处理账户被禁用错误', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid-token',
      };

      mockAuthService.verifyAccessToken.mockRejectedValue(new Error('账户已被禁用'));

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '账户已被禁用',
          statusCode: 403,
        })
      );
    });
  });

  describe('optionalAuth', () => {
    it('应该在没有Authorization头时跳过认证', async () => {
      mockReq.headers = {};

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockReq.userDetails).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该在有有效token时设置用户信息', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid-token',
      };

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockUserContext);
      expect(mockReq.userDetails).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该在token无效时跳过认证而不抛出错误', async () => {
      mockReq.headers = {
        authorization: 'Bearer invalid-token',
      };

      mockJwtUtils.verifyAccessToken.mockImplementation(() => {
        throw new Error('Token无效');
      });

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireUserType', () => {
    it('应该允许匹配的用户类型通过', () => {
      mockReq.user = { ...mockUserContext, userType: 'employee' };

      const middleware = requireUserType('employee', 'merchant_admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该拒绝不匹配的用户类型', () => {
      mockReq.user = { ...mockUserContext, userType: 'visitor' };

      const middleware = requireUserType('employee', 'merchant_admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '权限不足',
          statusCode: 403,
        })
      );
    });

    it('应该拒绝未认证的用户', () => {
      mockReq.user = undefined;

      const middleware = requireUserType('employee');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '需要认证',
          statusCode: 401,
        })
      );
    });
  });

  describe('requireMerchantAccess', () => {
    it('应该允许租务管理员访问所有商户数据', () => {
      mockReq.user = { ...mockUserContext, userType: 'tenant_admin' };
      mockReq.params = { merchantId: '2' };

      requireMerchantAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该允许用户访问自己商户的数据', () => {
      mockReq.user = { ...mockUserContext, userType: 'merchant_admin', merchantId: 1 };
      mockReq.params = { merchantId: '1' };

      requireMerchantAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该拒绝用户访问其他商户的数据', () => {
      mockReq.user = { ...mockUserContext, userType: 'merchant_admin', merchantId: 1 };
      mockReq.params = { merchantId: '2' };

      requireMerchantAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '无权访问其他商户数据',
          statusCode: 403,
        })
      );
    });

    it('应该处理body中的merchantId', () => {
      mockReq.user = { ...mockUserContext, userType: 'merchant_admin', merchantId: 1 };
      mockReq.body = { merchantId: 2 };

      requireMerchantAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '无权访问其他商户数据',
          statusCode: 403,
        })
      );
    });

    it('应该处理query中的merchantId', () => {
      mockReq.user = { ...mockUserContext, userType: 'merchant_admin', merchantId: 1 };
      mockReq.query = { merchantId: '2' };

      requireMerchantAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '无权访问其他商户数据',
          statusCode: 403,
        })
      );
    });
  });

  describe('预定义权限中间件', () => {
    it('requireAdmin应该允许管理员用户', () => {
      mockReq.user = { ...mockUserContext, userType: 'tenant_admin' };

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('requireAdmin应该拒绝非管理员用户', () => {
      mockReq.user = { ...mockUserContext, userType: 'employee' };

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
        })
      );
    });

    it('requireTenantAdmin应该只允许租务管理员', () => {
      mockReq.user = { ...mockUserContext, userType: 'tenant_admin' };

      requireTenantAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('requireMerchantAdmin应该只允许商户管理员', () => {
      mockReq.user = { ...mockUserContext, userType: 'merchant_admin' };

      requireMerchantAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('requireEmployee应该允许员工和管理员', () => {
      const testCases = ['employee', 'merchant_admin', 'tenant_admin'];

      testCases.forEach(userType => {
        mockReq.user = { ...mockUserContext, userType: userType as any };
        const nextSpy = vi.fn();

        requireEmployee(mockReq as Request, mockRes as Response, nextSpy);

        expect(nextSpy).toHaveBeenCalled();
      });
    });

    it('requireVisitor应该只允许访客', () => {
      mockReq.user = { ...mockUserContext, userType: 'visitor' };

      requireVisitor(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});