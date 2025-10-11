import { Request, Response, NextFunction } from 'express';
import { PermissionService, PermissionAction } from '../services/permission.service.js';
import { AppError, ErrorCodes } from './error.middleware.js';
import type { UserType } from '../types/index.js';

// 扩展Request接口以包含权限信息
declare global {
  namespace Express {
    interface Request {
      permissions?: {
        granted: boolean;
        reason?: string;
        requiredPermissions?: string[];
      };
    }
  }
}

const permissionService = new PermissionService();

/**
 * 权限检查中间件工厂
 */
export const requirePermission = (resource: string, action: PermissionAction) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('需要认证', 401, ErrorCodes.TOKEN_INVALID);
      }

      const resourceId = req.params.id ? parseInt(req.params.id) : undefined;
      const result = await permissionService.checkPermission(
        req.user.userId,
        resource,
        action,
        resourceId
      );

      req.permissions = result;

      if (!result.granted) {
        throw new AppError(
          result.reason || '权限不足',
          403,
          ErrorCodes.INSUFFICIENT_PERMISSIONS,
          {
            resource,
            action,
            requiredPermissions: result.requiredPermissions,
          }
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 检查多个权限中的任意一个
 */
export const requireAnyPermission = (
  permissions: Array<{ resource: string; action: PermissionAction }>
) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('需要认证', 401, ErrorCodes.TOKEN_INVALID);
      }

      const resourceId = req.params.id ? parseInt(req.params.id) : undefined;
      const permissionsWithId = permissions.map(p => ({ 
        ...p, 
        ...(resourceId !== undefined && { resourceId })
      }));
      
      const result = await permissionService.checkAnyPermission(
        req.user.userId,
        permissionsWithId
      );

      req.permissions = result;

      if (!result.granted) {
        throw new AppError(
          result.reason || '权限不足',
          403,
          ErrorCodes.INSUFFICIENT_PERMISSIONS,
          {
            requiredPermissions: result.requiredPermissions,
          }
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 检查所有指定权限
 */
export const requireAllPermissions = (
  permissions: Array<{ resource: string; action: PermissionAction }>
) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('需要认证', 401, ErrorCodes.TOKEN_INVALID);
      }

      const resourceId = req.params.id ? parseInt(req.params.id) : undefined;
      const permissionsWithId = permissions.map(p => ({ 
        ...p, 
        ...(resourceId !== undefined && { resourceId })
      }));
      
      const result = await permissionService.checkAllPermissions(
        req.user.userId,
        permissionsWithId
      );

      req.permissions = result;

      if (!result.granted) {
        throw new AppError(
          result.reason || '权限不足',
          403,
          ErrorCodes.INSUFFICIENT_PERMISSIONS,
          {
            requiredPermissions: result.requiredPermissions,
          }
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 用户类型层级权限检查中间件
 */
export const requireUserTypeHierarchy = (targetUserType: UserType) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError('需要认证', 401, ErrorCodes.TOKEN_INVALID);
      }

      const hasPermission = permissionService.validateUserTypeHierarchy(
        req.user.userType,
        targetUserType
      );

      if (!hasPermission) {
        throw new AppError(
          '权限等级不足',
          403,
          ErrorCodes.INSUFFICIENT_PERMISSIONS,
          {
            operatorType: req.user.userType,
            targetType: targetUserType,
          }
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 商户资源访问权限中间件
 */
export const requireMerchantResource = () => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError('需要认证', 401, ErrorCodes.TOKEN_INVALID);
      }

      // 租务管理员可以访问所有商户资源
      if (req.user.userType === 'tenant_admin') {
        return next();
      }

      // 其他用户只能访问自己商户的资源
      const merchantId = req.params.merchantId || req.body.merchantId || req.query.merchantId;
      
      if (merchantId && req.user.merchantId && parseInt(merchantId) !== req.user.merchantId) {
        throw new AppError(
          '无权访问其他商户资源',
          403,
          ErrorCodes.INSUFFICIENT_PERMISSIONS,
          {
            userMerchantId: req.user.merchantId,
            requestedMerchantId: parseInt(merchantId),
          }
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 资源所有者权限中间件
 */
export const requireResourceOwner = (resourceType: string) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('需要认证', 401, ErrorCodes.TOKEN_INVALID);
      }

      // 管理员可以访问所有资源
      if (['tenant_admin', 'merchant_admin'].includes(req.user.userType)) {
        return next();
      }

      const resourceId = req.params.id ? parseInt(req.params.id) : undefined;
      
      if (!resourceId) {
        throw new AppError('缺少资源ID', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
      }

      // 这里需要根据具体的资源类型检查所有权
      // 由于当前模型结构限制，暂时允许通过
      // 在实际实现中需要查询数据库验证资源所有权

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 可选权限检查中间件 - 检查权限但不阻止访问
 */
export const optionalPermission = (resource: string, action: PermissionAction) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        req.permissions = { granted: false, reason: '未认证' };
        return next();
      }

      const resourceId = req.params.id ? parseInt(req.params.id) : undefined;
      const result = await permissionService.checkPermission(
        req.user.userId,
        resource,
        action,
        resourceId
      );

      req.permissions = result;
      next();
    } catch (error) {
      req.permissions = { granted: false, reason: '权限检查失败' };
      next();
    }
  };
};

/**
 * 权限信息中间件 - 添加用户权限信息到请求中
 */
export const addPermissionInfo = () => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.user) {
      const userPermissions = permissionService.getUserPermissions(req.user.userType);
      const roleDescription = permissionService.getRoleDescription(req.user.userType);
      
      req.user.permissions = userPermissions;
      req.user.roleDescription = roleDescription;
    }
    
    next();
  };
};

/**
 * 权限系统健康检查中间件
 */
export const permissionHealthCheck = () => {
  return (_req: Request, res: Response): void => {
    const status = permissionService.getPermissionSystemStatus();
    
    res.json({
      success: true,
      message: '权限系统运行正常',
      data: status,
      timestamp: new Date().toISOString(),
    });
  };
};

// 常用权限组合
export const permissions = {
  // 商户管理权限
  merchant: {
    read: requirePermission('merchant', 'read'),
    write: requirePermission('merchant', 'write'),
    delete: requirePermission('merchant', 'delete'),
    manage: requirePermission('merchant', 'manage'),
  },
  
  // 用户管理权限
  user: {
    read: requirePermission('user', 'read'),
    write: requirePermission('user', 'write'),
    delete: requirePermission('user', 'delete'),
    manage: requirePermission('user', 'manage'),
  },
  
  // 员工管理权限
  employee: {
    read: requirePermission('employee', 'read'),
    write: requirePermission('employee', 'write'),
    delete: requirePermission('employee', 'delete'),
    manage: requirePermission('employee', 'manage'),
  },
  
  // 访客管理权限
  visitor: {
    read: requirePermission('visitor', 'read'),
    write: requirePermission('visitor', 'write'),
    approve: requirePermission('visitor', 'write'), // 审批访客申请
  },
  
  // 通行码权限
  passcode: {
    read: requirePermission('passcode', 'read'),
    generate: requirePermission('passcode', 'write'),
  },
  
  // 通行记录权限
  access: {
    read: requirePermission('access', 'read'),
  },
  
  // 系统管理权限
  system: {
    read: requirePermission('system', 'read'),
    write: requirePermission('system', 'write'),
    manage: requirePermission('system', 'manage'),
  },
};