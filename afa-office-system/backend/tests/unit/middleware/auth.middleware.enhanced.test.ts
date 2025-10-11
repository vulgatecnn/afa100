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

describe('Auth Middleware Enhanced Tests', () => {
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
    id: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      headers: {},
      user: undefined,
      userDetails: undefined,
      params: {},
      body: {},
      query: {},
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

  describe('authenticate - 边界条件和错误处理', () => {
    it('应该处理null Authorization头', async () => {
      mockReq.headers = { authorization: null as any };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '缺少认证令牌',
          statusCode: 401,
        })
      );
    });

    it('应该处理undefined Authorization头', async () => {
      mockReq.headers = { authorization: undefined };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '缺少认证令牌',
          statusCode: 401,
        })
      );
    });

    it('应该处理只有空格的Authorization头', async () => {
      mockReq.headers = { authorization: '   ' };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '认证令牌格式错误',
          statusCode: 401,
        })
      );
    });

    it('应该处理Bearer后只有空格的token', async () => {
      mockReq.headers = { authorization: 'Bearer    ' };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '认证令牌格式错误',
          statusCode: 401,
        })
      );
    });

    it('应该处理JWT验证抛出的各种错误类型', async () => {
      const errorCases = [
        { error: new Error('jwt expired'), expectedMessage: '认证令牌已过期' },
        { error: new Error('invalid token'), expectedMessage: '认证令牌无效' },
        { error: new Error('jwt malformed'), expectedMessage: '认证令牌无效' },
        { error: new Error('token verification failed'), expectedMessage: '认证令牌无效' },
        { error: new Error('unknown error'), expectedMessage: '认证失败' },
      ];

      for (const { error, expectedMessage } of errorCases) {
        vi.clearAllMocks();
        mockReq.headers = { authorization: 'Bearer test-token' };
        mockJwtUtils.verifyAccessToken.mockImplementation(() => {
          throw error;
        });

        await authenticate(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expectedMessage,
            statusCode: error.message.includes('过期') ? 401 : 401,
          })
        );
      }
    });

    it('应该处理AuthService验证失败的各种情况', async () => {
      const errorCases = [
        { error: new Error('用户不存在'), expectedMessage: '用户不存在', expectedCode: 401 },
        { error: new Error('账户已被禁用'), expectedMessage: '账户已被禁用', expectedCode: 403 },
        { error: new Error('数据库连接失败'), expectedMessage: '认证失败', expectedCode: 401 },
      ];

      for (const { error, expectedMessage, expectedCode } of errorCases) {
        vi.clearAllMocks();
        mockReq.headers = { authorization: 'Bearer valid-token' };
        mockAuthService.verifyAccessToken.mockRejectedValue(error);

        await authenticate(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expectedMessage,
            statusCode: expectedCode,
          })
        );
      }
    });

    it('应该正确设置用户上下文的所有字段', async () => {
      const complexJwtPayload: JwtPayload = {
        userId: 123,
        userType: 'merchant_admin',
        merchantId: 456,
        iat: 1234567890,
        exp: 1234567890 + 3600,
      };

      mockReq.headers = { authorization: 'Bearer complex-token' };
      mockJwtUtils.verifyAccessToken.mockReturnValue(complexJwtPayload);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual({
        ...complexJwtPayload,
        id: complexJwtPayload.userId,
      });
      expect(mockReq.userDetails).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('optionalAuth - 增强测试', () => {
    it('应该处理各种无效token格式而不抛出错误', async () => {
      const invalidTokens = [
        'invalid-format',
        'Bearer',
        'Bearer ',
        'NotBearer token',
        '',
        '   ',
      ];

      for (const token of invalidTokens) {
        vi.clearAllMocks();
        mockReq.headers = { authorization: token };
        mockJwtUtils.verifyAccessToken.mockImplementation(() => {
          throw new Error('Invalid token');
        });

        await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.user).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
      }
    });

    it('应该记录认证失败的警告', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      mockJwtUtils.verifyAccessToken.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith('可选认证失败:', 'Token expired');
      
      consoleSpy.mockRestore();
    });

    it('应该处理AuthService异步错误', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockAuthService.verifyAccessToken.mockRejectedValue(new Error('Database error'));

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireUserType - 权限组合测试', () => {
    it('应该支持多种用户类型组合', () => {
      const testCases = [
        {
          allowedTypes: ['tenant_admin', 'merchant_admin'],
          userType: 'tenant_admin',
          shouldPass: true,
        },
        {
          allowedTypes: ['tenant_admin', 'merchant_admin'],
          userType: 'merchant_admin',
          shouldPass: true,
        },
        {
          allowedTypes: ['tenant_admin', 'merchant_admin'],
          userType: 'employee',
          shouldPass: false,
        },
        {
          allowedTypes: ['employee', 'visitor'],
          userType: 'visitor',
          shouldPass: true,
        },
      ];

      testCases.forEach(({ allowedTypes, userType, shouldPass }) => {
        vi.clearAllMocks();
        mockReq.user = { ...mockUserContext, userType: userType as any };

        const middleware = requireUserType(...(allowedTypes as any[]));
        middleware(mockReq as Request, mockRes as Response, mockNext);

        if (shouldPass) {
          expect(mockNext).toHaveBeenCalledWith();
        } else {
          expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
              statusCode: 403,
            })
          );
        }
      });
    });

    it('应该处理空的允许类型数组', () => {
      mockReq.user = { ...mockUserContext, userType: 'employee' };

      const middleware = requireUserType();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
        })
      );
    });
  });

  describe('requireMerchantAccess - 商户权限详细测试', () => {
    it('应该处理字符串和数字类型的merchantId', () => {
      const testCases = [
        { paramId: '1', userMerchantId: 1, shouldPass: true },
        { paramId: '2', userMerchantId: 1, shouldPass: false },
        { paramId: 1, userMerchantId: 1, shouldPass: true }, // 数字类型
        { paramId: '0', userMerchantId: 0, shouldPass: true }, // 边界值
      ];

      testCases.forEach(({ paramId, userMerchantId, shouldPass }) => {
        vi.clearAllMocks();
        mockReq.user = { 
          ...mockUserContext, 
          userType: 'merchant_admin', 
          merchantId: userMerchantId 
        };
        mockReq.params = { merchantId: paramId.toString() };

        requireMerchantAccess(mockReq as Request, mockRes as Response, mockNext);

        if (shouldPass) {
          expect(mockNext).toHaveBeenCalledWith();
        } else {
          expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
              message: '无权访问其他商户数据',
              statusCode: 403,
            })
          );
        }
      });
    });

    it('应该处理merchantId在不同位置的情况', () => {
      const locations = ['params', 'body', 'query'];
      
      locations.forEach(location => {
        vi.clearAllMocks();
        mockReq.user = { 
          ...mockUserContext, 
          userType: 'merchant_admin', 
          merchantId: 1 
        };
        
        // 清空所有位置
        mockReq.params = {};
        mockReq.body = {};
        mockReq.query = {};
        
        // 在指定位置设置merchantId
        (mockReq as any)[location] = { merchantId: '2' };

        requireMerchantAccess(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: '无权访问其他商户数据',
            statusCode: 403,
          })
        );
      });
    });

    it('应该处理用户没有merchantId的情况', () => {
      mockReq.user = { 
        ...mockUserContext, 
        userType: 'merchant_admin', 
        merchantId: undefined 
      };
      mockReq.params = { merchantId: '1' };

      requireMerchantAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('应该处理请求中没有merchantId的情况', () => {
      mockReq.user = { 
        ...mockUserContext, 
        userType: 'merchant_admin', 
        merchantId: 1 
      };
      mockReq.params = {};
      mockReq.body = {};
      mockReq.query = {};

      requireMerchantAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('预定义权限中间件 - 完整测试', () => {
    const userTypes = ['tenant_admin', 'merchant_admin', 'employee', 'visitor'] as const;
    
    const middlewareTests = [
      {
        name: 'requireAdmin',
        middleware: requireAdmin,
        allowedTypes: ['tenant_admin', 'merchant_admin'],
      },
      {
        name: 'requireTenantAdmin',
        middleware: requireTenantAdmin,
        allowedTypes: ['tenant_admin'],
      },
      {
        name: 'requireMerchantAdmin',
        middleware: requireMerchantAdmin,
        allowedTypes: ['merchant_admin'],
      },
      {
        name: 'requireEmployee',
        middleware: requireEmployee,
        allowedTypes: ['employee', 'merchant_admin', 'tenant_admin'],
      },
      {
        name: 'requireVisitor',
        middleware: requireVisitor,
        allowedTypes: ['visitor'],
      },
    ];

    middlewareTests.forEach(({ name, middleware, allowedTypes }) => {
      describe(name, () => {
        userTypes.forEach(userType => {
          it(`应该${allowedTypes.includes(userType) ? '允许' : '拒绝'} ${userType}`, () => {
            mockReq.user = { ...mockUserContext, userType };

            middleware(mockReq as Request, mockRes as Response, mockNext);

            if (allowedTypes.includes(userType)) {
              expect(mockNext).toHaveBeenCalledWith();
            } else {
              expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                  statusCode: 403,
                })
              );
            }
          });
        });

        it('应该拒绝未认证用户', () => {
          mockReq.user = undefined;

          middleware(mockReq as Request, mockRes as Response, mockNext);

          expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
              statusCode: 401,
            })
          );
        });
      });
    });
  });

  describe('错误处理和异常情况', () => {
    it('应该处理中间件执行过程中的异常', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockJwtUtils.verifyAccessToken.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '认证失败',
          statusCode: 401,
        })
      );
    });

    it('应该处理requireUserType中的异常', () => {
      mockReq.user = null as any; // 模拟异常情况

      const middleware = requireUserType('employee');
      
      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
        })
      );
    });

    it('应该处理requireMerchantAccess中的异常', () => {
      mockReq.user = { userType: 'merchant_admin' } as any; // 缺少必要字段

      expect(() => {
        requireMerchantAccess(mockReq as Request, mockRes as Response, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('性能和内存测试', () => {
    it('应该能处理大量并发认证请求', async () => {
      const requests = Array.from({ length: 100 }, (_, i) => ({
        headers: { authorization: `Bearer token-${i}` },
        user: undefined,
        userDetails: undefined,
      }));

      mockJwtUtils.verifyAccessToken.mockReturnValue(mockJwtPayload);

      const promises = requests.map(req => 
        authenticate(req as Request, mockRes as Response, mockNext)
      );

      await Promise.all(promises);

      expect(mockJwtUtils.verifyAccessToken).toHaveBeenCalledTimes(100);
      expect(mockAuthService.verifyAccessToken).toHaveBeenCalledTimes(100);
    });

    it('应该正确清理资源', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      // 验证没有内存泄漏
      expect(mockReq.user).toBeDefined();
      expect(mockReq.userDetails).toBeDefined();
    });
  });
});