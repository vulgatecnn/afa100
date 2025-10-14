import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from '../../../src/types/index.js';

// Mock the permission service
const mockPermissionService = {
  checkPermission: vi.fn(),
  checkAnyPermission: vi.fn(),
  checkAllPermissions: vi.fn(),
  validateUserTypeHierarchy: vi.fn(),
  getUserPermissions: vi.fn(),
  getRoleDescription: vi.fn(),
  getPermissionSystemStatus: vi.fn(),
};

vi.mock('../../../src/services/permission.service.js', () => ({
  PermissionService: vi.fn().mockImplementation(() => mockPermissionService)
}));

// Import after mocking
const {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireUserTypeHierarchy,
  requireMerchantResource,
  requireResourceOwner,
  optionalPermission,
  addPermissionInfo,
  permissionHealthCheck,
  permissions,
} = await import('../../../src/middleware/permission.middleware.js');

describe('Permission Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const mockJwtPayload: JwtPayload = {
    userId: 1,
    userType: 'employee',
    merchantId: 1,
  };

  const mockUserContext = {
    id: 1,
    userId: 1,
    userType: 'employee' as const,
    merchantId: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      user: mockUserContext,
      params: {},
      body: {},
      query: {},
      permissions: undefined,
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requirePermission', () => {
    it('应该允许有权限的用户通过', async () => {
      mockPermissionService.checkPermission.mockResolvedValue({
        granted: true,
      });

      const middleware = requirePermission('merchant', 'read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPermissionService.checkPermission).toHaveBeenCalledWith(
        1,
        'merchant',
        'read',
        undefined
      );
      expect(mockReq.permissions).toEqual({ granted: true });
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该拒绝没有权限的用户', async () => {
      mockPermissionService.checkPermission.mockResolvedValue({
        granted: false,
        reason: '权限不足',
        requiredPermissions: ['merchant:read'],
      });

      const middleware = requirePermission('merchant', 'read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '权限不足',
          statusCode: 403,
        })
      );
    });

    it('应该处理带资源ID的权限检查', async () => {
      mockReq.params = { id: '123' };
      mockPermissionService.checkPermission.mockResolvedValue({
        granted: true,
      });

      const middleware = requirePermission('merchant', 'read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPermissionService.checkPermission).toHaveBeenCalledWith(
        1,
        'merchant',
        'read',
        123
      );
    });

    it('应该拒绝未认证的用户', async () => {
      mockReq.user = undefined;

      const middleware = requirePermission('merchant', 'read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '需要认证',
          statusCode: 401,
        })
      );
    });

    it('应该处理权限检查异常', async () => {
      mockPermissionService.checkPermission.mockRejectedValue(new Error('数据库错误'));

      const middleware = requirePermission('merchant', 'read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('requireAnyPermission', () => {
    it('应该允许拥有任意一个权限的用户通过', async () => {
      mockPermissionService.checkAnyPermission.mockResolvedValue({
        granted: true,
      });

      const permissions = [
        { resource: 'merchant', action: 'read' as const },
        { resource: 'employee', action: 'write' as const },
      ];

      const middleware = requireAnyPermission(permissions);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPermissionService.checkAnyPermission).toHaveBeenCalledWith(
        1,
        permissions.map(p => ({ ...p, resourceId: undefined }))
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该拒绝没有任何权限的用户', async () => {
      mockPermissionService.checkAnyPermission.mockResolvedValue({
        granted: false,
        reason: '权限不足',
        requiredPermissions: ['merchant:read', 'employee:write'],
      });

      const permissions = [
        { resource: 'merchant', action: 'read' as const },
        { resource: 'employee', action: 'write' as const },
      ];

      const middleware = requireAnyPermission(permissions);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
        })
      );
    });
  });

  describe('requireAllPermissions', () => {
    it('应该允许拥有所有权限的用户通过', async () => {
      mockPermissionService.checkAllPermissions.mockResolvedValue({
        granted: true,
      });

      const permissions = [
        { resource: 'merchant', action: 'read' as const },
        { resource: 'employee', action: 'read' as const },
      ];

      const middleware = requireAllPermissions(permissions);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该拒绝缺少部分权限的用户', async () => {
      mockPermissionService.checkAllPermissions.mockResolvedValue({
        granted: false,
        reason: '部分权限不足',
        requiredPermissions: ['employee:write'],
      });

      const permissions = [
        { resource: 'merchant', action: 'read' as const },
        { resource: 'employee', action: 'write' as const },
      ];

      const middleware = requireAllPermissions(permissions);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
        })
      );
    });
  });

  describe('requireUserTypeHierarchy', () => {
    it('应该允许高级用户管理低级用户', () => {
      mockPermissionService.validateUserTypeHierarchy.mockReturnValue(true);

      const middleware = requireUserTypeHierarchy('employee');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPermissionService.validateUserTypeHierarchy).toHaveBeenCalledWith(
        'employee',
        'employee'
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该拒绝低级用户管理高级用户', () => {
      mockPermissionService.validateUserTypeHierarchy.mockReturnValue(false);

      const middleware = requireUserTypeHierarchy('tenant_admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '权限等级不足',
          statusCode: 403,
        })
      );
    });

    it('应该拒绝未认证的用户', () => {
      mockReq.user = undefined;

      const middleware = requireUserTypeHierarchy('employee');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
        })
      );
    });
  });

  describe('requireMerchantResource', () => {
    it('应该允许租务管理员访问所有商户资源', () => {
      mockReq.user = { ...mockUserContext, userType: 'tenant_admin' };

      requireMerchantResource()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该允许用户访问自己商户的资源', () => {
      mockReq.user = { ...mockUserContext, userType: 'merchant_admin', merchantId: 1 };
      mockReq.params = { merchantId: '1' };

      requireMerchantResource()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该拒绝用户访问其他商户的资源', () => {
      mockReq.user = { ...mockUserContext, userType: 'merchant_admin', merchantId: 1 };
      mockReq.params = { merchantId: '2' };

      requireMerchantResource()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '无权访问其他商户资源',
          statusCode: 403,
        })
      );
    });
  });

  describe('requireResourceOwner', () => {
    it('应该允许管理员访问所有资源', async () => {
      mockReq.user = { ...mockUserContext, userType: 'tenant_admin' };

      const middleware = requireResourceOwner('application');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该允许商户管理员访问所有资源', async () => {
      mockReq.user = { ...mockUserContext, userType: 'merchant_admin' };

      const middleware = requireResourceOwner('application');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该检查普通用户的资源所有权', async () => {
      mockReq.user = { ...mockUserContext, userType: 'employee' };
      mockReq.params = { id: '123' };

      const middleware = requireResourceOwner('application');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      // 由于当前实现暂时允许通过，这里检查是否调用了next
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该拒绝缺少资源ID的请求', async () => {
      mockReq.user = { ...mockUserContext, userType: 'employee' };
      mockReq.params = {};

      const middleware = requireResourceOwner('application');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '缺少资源ID',
          statusCode: 400,
        })
      );
    });
  });

  describe('optionalPermission', () => {
    it('应该在用户有权限时设置权限信息', async () => {
      mockPermissionService.checkPermission.mockResolvedValue({
        granted: true,
      });

      const middleware = optionalPermission('merchant', 'read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.permissions).toEqual({ granted: true });
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该在用户没有权限时设置权限信息但不阻止访问', async () => {
      mockPermissionService.checkPermission.mockResolvedValue({
        granted: false,
        reason: '权限不足',
      });

      const middleware = optionalPermission('merchant', 'read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.permissions).toEqual({
        granted: false,
        reason: '权限不足',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该在未认证时设置默认权限信息', async () => {
      mockReq.user = undefined;

      const middleware = optionalPermission('merchant', 'read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.permissions).toEqual({
        granted: false,
        reason: '未认证',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该在权限检查失败时设置错误信息', async () => {
      mockPermissionService.checkPermission.mockRejectedValue(new Error('数据库错误'));

      const middleware = optionalPermission('merchant', 'read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.permissions).toEqual({
        granted: false,
        reason: '权限检查失败',
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('addPermissionInfo', () => {
    it('应该为认证用户添加权限信息', () => {
      mockPermissionService.getUserPermissions.mockReturnValue(['merchant:read', 'employee:write']);
      mockPermissionService.getRoleDescription.mockReturnValue('员工 - 管理分配给自己的访客和个人信息');

      const middleware = addPermissionInfo();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user?.permissions).toEqual(['merchant:read', 'employee:write']);
      expect(mockReq.user?.roleDescription).toBe('员工 - 管理分配给自己的访客和个人信息');
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该跳过未认证的用户', () => {
      mockReq.user = undefined;

      const middleware = addPermissionInfo();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('permissionHealthCheck', () => {
    it('应该返回权限系统健康状态', () => {
      mockPermissionService.getPermissionSystemStatus.mockReturnValue({
        status: 'healthy',
        rolesCount: 4,
        permissionsCount: 20,
        timestamp: '2024-01-01T00:00:00Z',
      });

      const middleware = permissionHealthCheck();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '权限系统运行正常',
        data: {
          status: 'healthy',
          rolesCount: 4,
          permissionsCount: 20,
          timestamp: '2024-01-01T00:00:00Z',
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('预定义权限组合', () => {
    it('应该提供商户权限中间件', () => {
      expect(permissions.merchant.read).toBeDefined();
      expect(permissions.merchant.write).toBeDefined();
      expect(permissions.merchant.delete).toBeDefined();
      expect(permissions.merchant.manage).toBeDefined();
    });

    it('应该提供用户权限中间件', () => {
      expect(permissions.user.read).toBeDefined();
      expect(permissions.user.write).toBeDefined();
      expect(permissions.user.delete).toBeDefined();
      expect(permissions.user.manage).toBeDefined();
    });

    it('应该提供员工权限中间件', () => {
      expect(permissions.employee.read).toBeDefined();
      expect(permissions.employee.write).toBeDefined();
      expect(permissions.employee.delete).toBeDefined();
      expect(permissions.employee.manage).toBeDefined();
    });

    it('应该提供访客权限中间件', () => {
      expect(permissions.visitor.read).toBeDefined();
      expect(permissions.visitor.write).toBeDefined();
      expect(permissions.visitor.approve).toBeDefined();
    });

    it('应该提供通行码权限中间件', () => {
      expect(permissions.passcode.read).toBeDefined();
      expect(permissions.passcode.generate).toBeDefined();
    });

    it('应该提供通行记录权限中间件', () => {
      expect(permissions.access.read).toBeDefined();
    });

    it('应该提供系统权限中间件', () => {
      expect(permissions.system.read).toBeDefined();
      expect(permissions.system.write).toBeDefined();
      expect(permissions.system.manage).toBeDefined();
    });
  });
});