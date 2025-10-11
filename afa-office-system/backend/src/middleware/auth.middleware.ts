import { Request, Response, NextFunction } from 'express';
import { JwtUtils } from '../utils/jwt.js';
import { AuthService } from '../services/auth.service.js';
import { AppError, ErrorCodes } from './error.middleware.js';
import type { JwtPayload, UserType, User, UserContext } from '../types/index.js';

// 扩展Request接口以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
      userDetails?: User;
    }
  }
}

const authService = new AuthService();

/**
 * JWT认证中间件
 */
export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader === undefined || authHeader === null) {
      throw new AppError('缺少认证令牌', 401, ErrorCodes.TOKEN_INVALID);
    }

    if (authHeader === '' || !authHeader.trim()) {
      throw new AppError('认证令牌格式错误', 401, ErrorCodes.TOKEN_INVALID);
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token || !token.trim()) {
      throw new AppError('认证令牌格式错误', 401, ErrorCodes.TOKEN_INVALID);
    }

    // 使用JWT工具验证token并获取用户信息
    const decoded = JwtUtils.verifyAccessToken(token);
    const user = await authService.verifyAccessToken(token);
    
    // 创建用户上下文，包含id和userId以保持兼容性
    req.user = {
      ...decoded,
      id: decoded.userId // 添加id字段以保持向后兼容
    };
    req.userDetails = user;
    next();
  } catch (error) {
    // If it's already an AppError, pass it through
    if (error instanceof AppError) {
      return next(error);
    }
    
    const errorMessage = (error as Error).message;
    
    if (errorMessage.includes('过期')) {
      next(new AppError('认证令牌已过期', 401, ErrorCodes.TOKEN_EXPIRED));
    } else if (errorMessage.includes('无效') || errorMessage.includes('验证失败')) {
      next(new AppError('认证令牌无效', 401, ErrorCodes.TOKEN_INVALID));
    } else if (errorMessage.includes('用户不存在')) {
      next(new AppError('用户不存在', 401, ErrorCodes.USER_NOT_FOUND));
    } else if (errorMessage.includes('账户已被禁用')) {
      next(new AppError('账户已被禁用', 403, ErrorCodes.ACCOUNT_DISABLED));
    } else {
      next(new AppError('认证失败', 401, ErrorCodes.TOKEN_INVALID));
    }
  }
};

/**
 * 可选认证中间件 - 如果有token则验证，没有则跳过
 */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return next();
  }

  try {
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (token) {
      const decoded = JwtUtils.verifyAccessToken(token);
      const user = await authService.verifyAccessToken(token);
      
      // 创建用户上下文，包含id和userId以保持兼容性
      req.user = {
        ...decoded,
        id: decoded.userId // 添加id字段以保持向后兼容
      };
      req.userDetails = user;
    }
  } catch (error) {
    // 可选认证失败时不抛出错误，只是不设置用户信息
    console.warn('可选认证失败:', (error as Error).message);
  }

  next();
};

/**
 * 用户类型权限检查中间件工厂
 */
export const requireUserType = (...allowedTypes: UserType[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError('需要认证', 401, ErrorCodes.TOKEN_INVALID);
      }

      if (!allowedTypes.includes(req.user.userType)) {
        throw new AppError('权限不足', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 商户权限检查中间件 - 确保用户只能访问自己商户的数据
 */
export const requireMerchantAccess = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      throw new AppError('需要认证', 401, ErrorCodes.TOKEN_INVALID);
    }

    // 租务管理员可以访问所有商户数据
    if (req.user.userType === 'tenant_admin') {
      return next();
    }

    // 其他用户只能访问自己商户的数据
    const merchantId = req.params?.merchantId || req.body?.merchantId || req.query?.merchantId;
    
    if (merchantId && req.user.merchantId && parseInt(merchantId) !== req.user.merchantId) {
      throw new AppError('无权访问其他商户数据', 403, ErrorCodes.INSUFFICIENT_PERMISSIONS);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * 管理员权限检查中间件
 */
export const requireAdmin = requireUserType('tenant_admin', 'merchant_admin');

/**
 * 租务管理员权限检查中间件
 */
export const requireTenantAdmin = requireUserType('tenant_admin');

/**
 * 商户管理员权限检查中间件
 */
export const requireMerchantAdmin = requireUserType('merchant_admin');

/**
 * 员工权限检查中间件
 */
export const requireEmployee = requireUserType('employee', 'merchant_admin', 'tenant_admin');

/**
 * 访客权限检查中间件
 */
export const requireVisitor = requireUserType('visitor');