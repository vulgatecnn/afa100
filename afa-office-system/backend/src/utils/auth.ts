/**
 * 认证工具类
 * 提供认证相关的工具函数
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { UserType, JwtPayload, UserContext } from '../types/index.js';

export interface PasswordHashOptions {
  saltRounds: number;
}

export interface TokenGenerationOptions {
  length: number;
  includeNumbers: boolean;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeSymbols: boolean;
}

export interface PermissionCheckOptions {
  requireAll: boolean; // 是否需要所有权限
  caseSensitive: boolean; // 权限名称是否区分大小写
}

/**
 * 认证工具类
 */
export class AuthUtils {
  private static readonly DEFAULT_SALT_ROUNDS = 12;
  private static readonly DEFAULT_TOKEN_LENGTH = 32;

  /**
   * 哈希密码
   */
  static async hashPassword(password: string, options?: Partial<PasswordHashOptions>): Promise<string> {
    const saltRounds = options?.saltRounds || AuthUtils.DEFAULT_SALT_ROUNDS;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * 验证密码
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * 生成随机令牌
   */
  static generateToken(options?: Partial<TokenGenerationOptions>): string {
    const config = {
      length: AuthUtils.DEFAULT_TOKEN_LENGTH,
      includeNumbers: true,
      includeUppercase: true,
      includeLowercase: true,
      includeSymbols: false,
      ...options
    };

    let charset = '';
    if (config.includeNumbers) charset += '0123456789';
    if (config.includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (config.includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (config.includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (charset === '') {
      throw new Error('至少需要包含一种字符类型');
    }

    let result = '';
    for (let i = 0; i < config.length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return result;
  }

  /**
   * 生成加密安全的随机令牌
   */
  static generateSecureToken(length: number = AuthUtils.DEFAULT_TOKEN_LENGTH): string {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }

  /**
   * 生成UUID
   */
  static generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * 检查用户类型权限
   */
  static hasUserTypePermission(userType: UserType, allowedTypes: UserType[]): boolean {
    return allowedTypes.includes(userType);
  }

  /**
   * 检查用户是否有指定权限
   */
  static hasPermissions(
    userPermissions: string[], 
    requiredPermissions: string[], 
    options?: Partial<PermissionCheckOptions>
  ): boolean {
    const config = {
      requireAll: false,
      caseSensitive: true,
      ...options
    };

    const normalizePermission = (permission: string) => 
      config.caseSensitive ? permission : permission.toLowerCase();

    const normalizedUserPermissions = userPermissions.map(normalizePermission);
    const normalizedRequiredPermissions = requiredPermissions.map(normalizePermission);

    if (config.requireAll) {
      return normalizedRequiredPermissions.every(permission => 
        normalizedUserPermissions.includes(permission)
      );
    } else {
      return normalizedRequiredPermissions.some(permission => 
        normalizedUserPermissions.includes(permission)
      );
    }
  }

  /**
   * 检查用户是否可以访问商户资源
   */
  static canAccessMerchantResource(user: UserContext, merchantId: number): boolean {
    // 租务管理员可以访问所有商户资源
    if (user.userType === 'tenant_admin') {
      return true;
    }

    // 其他用户只能访问自己商户的资源
    return user.merchantId === merchantId;
  }

  /**
   * 检查用户是否是管理员
   */
  static isAdmin(userType: UserType): boolean {
    return ['tenant_admin', 'merchant_admin'].includes(userType);
  }

  /**
   * 检查用户是否是租务管理员
   */
  static isTenantAdmin(userType: UserType): boolean {
    return userType === 'tenant_admin';
  }

  /**
   * 检查用户是否是商户管理员
   */
  static isMerchantAdmin(userType: UserType): boolean {
    return userType === 'merchant_admin';
  }

  /**
   * 检查用户是否是员工
   */
  static isEmployee(userType: UserType): boolean {
    return userType === 'employee';
  }

  /**
   * 检查用户是否是访客
   */
  static isVisitor(userType: UserType): boolean {
    return userType === 'visitor';
  }

  /**
   * 获取用户权限级别
   */
  static getUserPermissionLevel(userType: UserType): number {
    const levels = {
      'tenant_admin': 4,
      'merchant_admin': 3,
      'employee': 2,
      'visitor': 1
    };
    return levels[userType] || 0;
  }

  /**
   * 比较用户权限级别
   */
  static comparePermissionLevel(userType1: UserType, userType2: UserType): number {
    const level1 = AuthUtils.getUserPermissionLevel(userType1);
    const level2 = AuthUtils.getUserPermissionLevel(userType2);
    return level1 - level2;
  }

  /**
   * 检查JWT载荷是否有效
   */
  static isValidJwtPayload(payload: any): payload is JwtPayload {
    return (
      payload &&
      typeof payload === 'object' &&
      typeof payload.userId === 'number' &&
      typeof payload.userType === 'string' &&
      ['tenant_admin', 'merchant_admin', 'employee', 'visitor'].includes(payload.userType)
    );
  }

  /**
   * 清理敏感信息
   */
  static sanitizeUserData<T extends Record<string, any>>(data: T): Omit<T, 'password' | 'token' | 'secret'> {
    const sensitiveFields = ['password', 'token', 'secret', 'privateKey', 'accessToken', 'refreshToken'];
    const sanitized = { ...data };
    
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        delete sanitized[field];
      }
    });
    
    return sanitized;
  }

  /**
   * 生成访客通行码
   */
  static generateVisitorPasscode(): string {
    // 生成6位数字通行码
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 验证通行码格式
   */
  static isValidPasscode(passcode: string): boolean {
    return /^\d{6}$/.test(passcode);
  }

  /**
   * 计算密码强度
   */
  static calculatePasswordStrength(password: string): {
    score: number;
    level: 'weak' | 'medium' | 'strong' | 'very_strong';
    suggestions: string[];
  } {
    let score = 0;
    const suggestions: string[] = [];

    // 长度检查
    if (password.length >= 8) score += 1;
    else suggestions.push('密码长度至少8位');

    if (password.length >= 12) score += 1;

    // 字符类型检查
    if (/[a-z]/.test(password)) score += 1;
    else suggestions.push('包含小写字母');

    if (/[A-Z]/.test(password)) score += 1;
    else suggestions.push('包含大写字母');

    if (/\d/.test(password)) score += 1;
    else suggestions.push('包含数字');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
    else suggestions.push('包含特殊字符');

    // 确定强度级别
    let level: 'weak' | 'medium' | 'strong' | 'very_strong';
    if (score <= 2) level = 'weak';
    else if (score <= 4) level = 'medium';
    else if (score <= 5) level = 'strong';
    else level = 'very_strong';

    return { score, level, suggestions };
  }
}

// 导出便捷方法
export const authUtils = {
  hashPassword: AuthUtils.hashPassword,
  verifyPassword: AuthUtils.verifyPassword,
  generateToken: AuthUtils.generateToken,
  generateSecureToken: AuthUtils.generateSecureToken,
  generateUUID: AuthUtils.generateUUID,
  hasUserTypePermission: AuthUtils.hasUserTypePermission,
  hasPermissions: AuthUtils.hasPermissions,
  canAccessMerchantResource: AuthUtils.canAccessMerchantResource,
  isAdmin: AuthUtils.isAdmin,
  isTenantAdmin: AuthUtils.isTenantAdmin,
  isMerchantAdmin: AuthUtils.isMerchantAdmin,
  isEmployee: AuthUtils.isEmployee,
  isVisitor: AuthUtils.isVisitor,
  getUserPermissionLevel: AuthUtils.getUserPermissionLevel,
  comparePermissionLevel: AuthUtils.comparePermissionLevel,
  isValidJwtPayload: AuthUtils.isValidJwtPayload,
  sanitizeUserData: AuthUtils.sanitizeUserData,
  generateVisitorPasscode: AuthUtils.generateVisitorPasscode,
  isValidPasscode: AuthUtils.isValidPasscode,
  calculatePasswordStrength: AuthUtils.calculatePasswordStrength
};

// 导出类型
export type AuthUtilsInstance = typeof authUtils;