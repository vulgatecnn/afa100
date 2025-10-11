import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PermissionService } from '../../../src/services/permission.service.js';
import { PermissionModel } from '../../../src/models/permission.model.js';
import { UserModel } from '../../../src/models/user.model.js';
import type { User, UserType } from '../../../src/types/index.js';

// Mock dependencies
vi.mock('../../../src/models/permission.model.js');
vi.mock('../../../src/models/user.model.js');

describe('PermissionService', () => {
  let permissionService: PermissionService;
  let mockPermissionModel: any;
  let mockUserModel: any;

  const mockUsers: Record<UserType, User> = {
    tenant_admin: {
      id: 1,
      name: '租务管理员',
      user_type: 'tenant_admin',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    merchant_admin: {
      id: 2,
      name: '商户管理员',
      user_type: 'merchant_admin',
      status: 'active',
      merchant_id: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    employee: {
      id: 3,
      name: '员工',
      user_type: 'employee',
      status: 'active',
      merchant_id: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    visitor: {
      id: 4,
      name: '访客',
      user_type: 'visitor',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockPermissionModel = {};
    mockUserModel = {
      findById: vi.fn(),
    };

    // Mock constructors
    vi.mocked(PermissionModel).mockImplementation(() => mockPermissionModel);
    vi.mocked(UserModel).mockImplementation(() => mockUserModel);

    permissionService = new PermissionService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkPermission', () => {
    it('租务管理员应该拥有所有权限', async () => {
      mockUserModel.findById.mockResolvedValue(mockUsers.tenant_admin);

      const result = await permissionService.checkPermission(1, 'merchant', 'read');

      expect(result.granted).toBe(true);
    });

    it('商户管理员应该拥有员工管理权限', async () => {
      mockUserModel.findById.mockResolvedValue(mockUsers.merchant_admin);

      const result = await permissionService.checkPermission(2, 'employee', 'read');

      expect(result.granted).toBe(true);
    });

    it('商户管理员应该拥有访客管理权限', async () => {
      mockUserModel.findById.mockResolvedValue(mockUsers.merchant_admin);

      const result = await permissionService.checkPermission(2, 'visitor', 'write');

      expect(result.granted).toBe(true);
    });

    it('员工应该只能读取自己的通行码', async () => {
      mockUserModel.findById.mockResolvedValue(mockUsers.employee);

      const result = await permissionService.checkPermission(3, 'passcode', 'read');

      expect(result.granted).toBe(true);
    });

    it('访客应该只能管理自己的申请', async () => {
      mockUserModel.findById.mockResolvedValue(mockUsers.visitor);

      const result = await permissionService.checkPermission(4, 'application', 'read');

      expect(result.granted).toBe(true);
    });

    it('应该拒绝不存在的用户', async () => {
      mockUserModel.findById.mockResolvedValue(undefined);

      const result = await permissionService.checkPermission(999, 'merchant', 'read');

      expect(result.granted).toBe(false);
      expect(result.reason).toBe('用户不存在');
    });

    it('应该拒绝被禁用的用户', async () => {
      const disabledUser = { ...mockUsers.employee, status: 'inactive' as const };
      mockUserModel.findById.mockResolvedValue(disabledUser);

      const result = await permissionService.checkPermission(3, 'employee', 'read');

      expect(result.granted).toBe(false);
      expect(result.reason).toBe('用户账户已被禁用');
    });

    it('应该拒绝超出权限范围的操作', async () => {
      mockUserModel.findById.mockResolvedValue(mockUsers.visitor);

      const result = await permissionService.checkPermission(4, 'merchant', 'write');

      expect(result.granted).toBe(false);
      expect(result.reason).toBe('权限不足');
    });

    it('应该处理权限检查异常', async () => {
      mockUserModel.findById.mockRejectedValue(new Error('数据库错误'));

      const result = await permissionService.checkPermission(1, 'merchant', 'read');

      expect(result.granted).toBe(false);
      expect(result.reason).toBe('权限检查失败');
    });
  });

  describe('checkAnyPermission', () => {
    it('应该通过任意一个有效权限', async () => {
      mockUserModel.findById.mockResolvedValue(mockUsers.merchant_admin);

      const permissions = [
        { resource: 'invalid', action: 'read' as const },
        { resource: 'employee', action: 'read' as const },
      ];

      const result = await permissionService.checkAnyPermission(2, permissions);

      expect(result.granted).toBe(true);
    });

    it('应该拒绝所有权限都无效的情况', async () => {
      mockUserModel.findById.mockResolvedValue(mockUsers.visitor);

      const permissions = [
        { resource: 'merchant', action: 'write' as const },
        { resource: 'employee', action: 'delete' as const },
      ];

      const result = await permissionService.checkAnyPermission(4, permissions);

      expect(result.granted).toBe(false);
      expect(result.requiredPermissions).toBeDefined();
    });
  });

  describe('checkAllPermissions', () => {
    it('应该通过所有权限都有效的情况', async () => {
      mockUserModel.findById.mockResolvedValue(mockUsers.merchant_admin);

      const permissions = [
        { resource: 'employee', action: 'read' as const },
        { resource: 'visitor', action: 'write' as const },
      ];

      const result = await permissionService.checkAllPermissions(2, permissions);

      expect(result.granted).toBe(true);
    });

    it('应该拒绝部分权限无效的情况', async () => {
      mockUserModel.findById.mockResolvedValue(mockUsers.employee);

      const permissions = [
        { resource: 'passcode', action: 'read' as const },
        { resource: 'merchant', action: 'write' as const }, // 员工没有此权限
      ];

      const result = await permissionService.checkAllPermissions(3, permissions);

      expect(result.granted).toBe(false);
      expect(result.reason).toBe('部分权限不足');
      expect(result.requiredPermissions).toContain('merchant:write');
    });
  });

  describe('getUserPermissions', () => {
    it('应该返回租务管理员的所有权限', () => {
      const permissions = permissionService.getUserPermissions('tenant_admin');

      expect(permissions).toContain('merchant:*');
      expect(permissions).toContain('user:*');
      expect(permissions).toContain('system:*');
    });

    it('应该返回商户管理员的权限', () => {
      const permissions = permissionService.getUserPermissions('merchant_admin');

      expect(permissions).toContain('employee:read');
      expect(permissions).toContain('employee:write');
      expect(permissions).toContain('visitor:approve');
    });

    it('应该返回员工的权限', () => {
      const permissions = permissionService.getUserPermissions('employee');

      expect(permissions).toContain('visitor:read:own');
      expect(permissions).toContain('passcode:read:own');
      expect(permissions).not.toContain('merchant:*');
    });

    it('应该返回访客的权限', () => {
      const permissions = permissionService.getUserPermissions('visitor');

      expect(permissions).toContain('application:read:own');
      expect(permissions).toContain('application:write:own');
      expect(permissions).not.toContain('employee:read');
    });
  });

  describe('getRoleDescription', () => {
    it('应该返回正确的角色描述', () => {
      expect(permissionService.getRoleDescription('tenant_admin')).toContain('租务管理员');
      expect(permissionService.getRoleDescription('merchant_admin')).toContain('商户管理员');
      expect(permissionService.getRoleDescription('employee')).toContain('员工');
      expect(permissionService.getRoleDescription('visitor')).toContain('访客');
    });

    it('应该处理未知角色', () => {
      const description = permissionService.getRoleDescription('unknown' as UserType);
      expect(description).toBe('未知角色');
    });
  });

  describe('validateUserTypeHierarchy', () => {
    it('租务管理员应该能管理所有类型用户', () => {
      expect(permissionService.validateUserTypeHierarchy('tenant_admin', 'merchant_admin')).toBe(true);
      expect(permissionService.validateUserTypeHierarchy('tenant_admin', 'employee')).toBe(true);
      expect(permissionService.validateUserTypeHierarchy('tenant_admin', 'visitor')).toBe(true);
    });

    it('商户管理员应该能管理员工和访客', () => {
      expect(permissionService.validateUserTypeHierarchy('merchant_admin', 'employee')).toBe(true);
      expect(permissionService.validateUserTypeHierarchy('merchant_admin', 'visitor')).toBe(true);
      expect(permissionService.validateUserTypeHierarchy('merchant_admin', 'tenant_admin')).toBe(false);
    });

    it('员工应该只能管理访客', () => {
      expect(permissionService.validateUserTypeHierarchy('employee', 'visitor')).toBe(true);
      expect(permissionService.validateUserTypeHierarchy('employee', 'employee')).toBe(false);
      expect(permissionService.validateUserTypeHierarchy('employee', 'merchant_admin')).toBe(false);
    });

    it('访客不能管理其他用户', () => {
      expect(permissionService.validateUserTypeHierarchy('visitor', 'visitor')).toBe(false);
      expect(permissionService.validateUserTypeHierarchy('visitor', 'employee')).toBe(false);
    });
  });

  describe('createPermissionMiddleware', () => {
    it('应该创建权限检查中间件', () => {
      const middleware = permissionService.createPermissionMiddleware('merchant', 'read');

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('中间件应该拒绝未认证的请求', async () => {
      const middleware = permissionService.createPermissionMiddleware('merchant', 'read');
      const req = { user: null };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '需要认证',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('中间件应该拒绝权限不足的请求', async () => {
      mockUserModel.findById.mockResolvedValue(mockUsers.visitor);

      const middleware = permissionService.createPermissionMiddleware('merchant', 'write');
      const req = { user: { userId: 4, userType: 'visitor' } };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('权限'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('中间件应该允许有权限的请求通过', async () => {
      mockUserModel.findById.mockResolvedValue(mockUsers.tenant_admin);

      const middleware = permissionService.createPermissionMiddleware('merchant', 'read');
      const req = { user: { userId: 1, userType: 'tenant_admin' } };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('getPermissionSystemStatus', () => {
    it('应该返回权限系统状态', () => {
      const status = permissionService.getPermissionSystemStatus();

      expect(status).toBeDefined();
      expect(status.status).toBe('healthy');
      expect(status.rolesCount).toBeGreaterThan(0);
      expect(status.permissionsCount).toBeGreaterThan(0);
      expect(status.timestamp).toBeDefined();
    });
  });
});