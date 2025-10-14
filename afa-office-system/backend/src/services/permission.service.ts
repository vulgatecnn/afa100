import { PermissionModel, UserModel } from '../models/index.js';
import type { User, Permission, ResourceType, UserType } from '../types/index.js';

/**
 * 权限操作类型
 */
export type PermissionAction = 'read' | 'write' | 'delete' | 'access' | 'manage';

/**
 * 权限检查结果接口
 */
export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  requiredPermissions?: string[];
}

/**
 * 角色权限映射接口
 */
export interface RolePermissions {
  userType: UserType;
  permissions: string[];
  description: string;
}

/**
 * 权限服务类
 * 实现基于角色的访问控制(RBAC)系统
 */
export class PermissionService {
  private permissionModel: PermissionModel;

  // 预定义的角色权限映射
  private readonly rolePermissions: Record<UserType, RolePermissions> = {
    tenant_admin: {
      userType: 'tenant_admin',
      permissions: [
        'merchant:*',
        'user:*',
        'space:*',
        'permission:*',
        'system:*',
        'report:*',
      ],
      description: '租务管理员 - 拥有系统所有权限',
    },
    merchant_admin: {
      userType: 'merchant_admin',
      permissions: [
        'employee:read',
        'employee:write',
        'employee:delete',
        'visitor:read',
        'visitor:write',
        'visitor:approve',
        'passcode:generate',
        'access:read',
        'merchant:read:own',
      ],
      description: '商户管理员 - 管理本商户员工和访客',
    },
    employee: {
      userType: 'employee',
      permissions: [
        'visitor:read:own',
        'visitor:approve:assigned',
        'passcode:read:own',
        'access:read:own',
        'profile:read:own',
        'profile:write:own',
      ],
      description: '员工 - 管理分配给自己的访客和个人信息',
    },
    visitor: {
      userType: 'visitor',
      permissions: [
        'application:read:own',
        'application:write:own',
        'passcode:read:own',
        'profile:read:own',
        'profile:write:own',
      ],
      description: '访客 - 管理自己的申请和个人信息',
    },
  };

  constructor() {
    this.permissionModel = new PermissionModel();
    // 不需要创建UserModel实例，直接使用静态方法
  }

  /**
   * 检查用户是否有指定权限
   */
  async checkPermission(
    userId: number,
    resource: string,
    action: PermissionAction,
    resourceId?: number
  ): Promise<PermissionCheckResult> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        return {
          granted: false,
          reason: '用户不存在',
        };
      }

      if (user.status !== 'active') {
        return {
          granted: false,
          reason: '用户账户已被禁用',
        };
      }

      // 构建权限字符串
      const permissionString = `${resource}:${action}`;
      const permissionStringWithOwn = `${resource}:${action}:own`;

      // 获取用户角色权限
      const rolePermissions = this.rolePermissions[user.user_type];
      if (!rolePermissions) {
        return {
          granted: false,
          reason: '未知的用户类型',
        };
      }

      // 检查是否有通配符权限
      const hasWildcardPermission = rolePermissions.permissions.some(permission => {
        if (permission.endsWith(':*')) {
          const resourcePrefix = permission.slice(0, -2);
          return resource === resourcePrefix || permissionString.startsWith(resourcePrefix);
        }
        return false;
      });

      if (hasWildcardPermission) {
        return { granted: true };
      }

      // 检查精确权限匹配
      const hasExactPermission = rolePermissions.permissions.includes(permissionString);
      if (hasExactPermission) {
        return { granted: true };
      }

      // 检查 :own 权限（用户只能操作自己的资源）
      const hasOwnPermission = rolePermissions.permissions.includes(permissionStringWithOwn);
      if (hasOwnPermission) {
        // 需要验证资源所有权
        const isOwner = await this.checkResourceOwnership(userId, resource, resourceId);
        if (isOwner) {
          return { granted: true };
        } else {
          return {
            granted: false,
            reason: '只能操作自己的资源',
          };
        }
      }

      // 检查商户级权限（商户管理员和员工只能操作本商户资源）
      if (user.user_type === 'merchant_admin' || user.user_type === 'employee') {
        const merchantPermission = `${resource}:${action}:merchant`;
        const hasMerchantPermission = rolePermissions.permissions.includes(merchantPermission);
        
        if (hasMerchantPermission) {
          const isSameMerchant = await this.checkMerchantAccess(userId, resource, resourceId);
          if (isSameMerchant) {
            return { granted: true };
          } else {
            return {
              granted: false,
              reason: '只能操作本商户的资源',
            };
          }
        }
      }

      return {
        granted: false,
        reason: '权限不足',
        requiredPermissions: [permissionString],
      };
    } catch (error) {
      console.error('权限检查失败:', error);
      return {
        granted: false,
        reason: '权限检查失败',
      };
    }
  }

  /**
   * 检查用户是否有多个权限中的任意一个
   */
  async checkAnyPermission(
    userId: number,
    permissions: Array<{ resource: string; action: PermissionAction; resourceId?: number }>
  ): Promise<PermissionCheckResult> {
    for (const permission of permissions) {
      const result = await this.checkPermission(
        userId,
        permission.resource,
        permission.action,
        permission.resourceId
      );
      
      if (result.granted) {
        return result;
      }
    }

    return {
      granted: false,
      reason: '权限不足',
      requiredPermissions: permissions.map(p => `${p.resource}:${p.action}`),
    };
  }

  /**
   * 检查用户是否有所有指定权限
   */
  async checkAllPermissions(
    userId: number,
    permissions: Array<{ resource: string; action: PermissionAction; resourceId?: number }>
  ): Promise<PermissionCheckResult> {
    const failedPermissions: string[] = [];

    for (const permission of permissions) {
      const result = await this.checkPermission(
        userId,
        permission.resource,
        permission.action,
        permission.resourceId
      );
      
      if (!result.granted) {
        failedPermissions.push(`${permission.resource}:${permission.action}`);
      }
    }

    if (failedPermissions.length > 0) {
      return {
        granted: false,
        reason: '部分权限不足',
        requiredPermissions: failedPermissions,
      };
    }

    return { granted: true };
  }

  /**
   * 获取用户的所有权限
   */
  getUserPermissions(userType: UserType): string[] {
    const rolePermissions = this.rolePermissions[userType];
    return rolePermissions ? rolePermissions.permissions : [];
  }

  /**
   * 获取角色描述
   */
  getRoleDescription(userType: UserType): string {
    const rolePermissions = this.rolePermissions[userType];
    return rolePermissions ? rolePermissions.description : '未知角色';
  }

  /**
   * 检查资源所有权
   */
  private async checkResourceOwnership(
    userId: number,
    resource: string,
    resourceId?: number
  ): Promise<boolean> {
    try {
      switch (resource) {
        case 'application':
          // 检查访客申请是否属于该用户
          // 如果没有指定resourceId，允许用户访问自己的申请
          if (!resourceId) {
            return true; // 允许用户读取自己的申请列表
          }
          // 这里需要根据实际的数据模型实现具体的所有权检查
          return true; // 临时返回true，需要实际实现

        case 'passcode':
          // 检查通行码是否属于该用户
          // 如果没有指定resourceId，允许用户访问自己的通行码
          if (!resourceId) {
            return true; // 允许用户读取自己的通行码
          }
          // 这里需要根据实际的数据模型实现具体的所有权检查
          return true; // 临时返回true，需要实际实现

        case 'profile':
          // 用户只能操作自己的个人资料
          return true;

        default:
          return false;
      }
    } catch (error) {
      console.error('检查资源所有权失败:', error);
      return false;
    }
  }

  /**
   * 检查商户访问权限
   */
  private async checkMerchantAccess(
    userId: number,
    resource: string,
    resourceId?: number
  ): Promise<boolean> {
    try {
      const user = await UserModel.findById(userId);
      if (!user || !user.merchant_id) {
        return false;
      }

      // 这里需要根据具体的资源类型检查是否属于同一商户
      // 临时实现，需要根据实际数据模型完善
      switch (resource) {
        case 'employee':
        case 'visitor':
        case 'application':
          return true; // 临时返回true，需要实际实现

        default:
          return false;
      }
    } catch (error) {
      console.error('检查商户访问权限失败:', error);
      return false;
    }
  }

  /**
   * 创建权限中间件
   */
  createPermissionMiddleware(resource: string, action: PermissionAction) {
    return async (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '需要认证',
          timestamp: new Date().toISOString(),
        });
      }

      const resourceId = req.params?.id ? parseInt(req.params.id) : undefined;
      const result = await this.checkPermission(req.user.userId, resource, action, resourceId);

      if (!result.granted) {
        return res.status(403).json({
          success: false,
          message: result.reason || '权限不足',
          data: {
            requiredPermissions: result.requiredPermissions,
          },
          timestamp: new Date().toISOString(),
        });
      }

      next();
    };
  }

  /**
   * 验证用户类型层级权限
   */
  validateUserTypeHierarchy(operatorType: UserType, targetType: UserType): boolean {
    const hierarchy: Record<UserType, number> = {
      tenant_admin: 4,
      merchant_admin: 3,
      employee: 2,
      visitor: 1,
    };

    return hierarchy[operatorType] > hierarchy[targetType];
  }

  /**
   * 获取权限系统状态
   */
  getPermissionSystemStatus(): {
    status: 'healthy' | 'error';
    rolesCount: number;
    permissionsCount: number;
    timestamp: string;
  } {
    const rolesCount = Object.keys(this.rolePermissions).length;
    const permissionsCount = Object.values(this.rolePermissions)
      .reduce((total, role) => total + role.permissions.length, 0);

    return {
      status: 'healthy',
      rolesCount,
      permissionsCount,
      timestamp: new Date().toISOString(),
    };
  }
}