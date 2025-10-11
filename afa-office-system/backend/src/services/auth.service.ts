import bcrypt from 'bcryptjs';
import { JwtUtils } from '../utils/jwt.js';
import { UserModel } from '../models/user.model.js';
import { WechatService } from './wechat.service.js';
import { appConfig } from '../config/app.config.js';
import type { User, UserType } from '../types/index.js';

/**
 * 登录凭据接口
 */
export interface LoginCredentials {
  phone?: string;
  password?: string;
  openId?: string;
  userType?: UserType;
}

/**
 * 登录结果接口
 */
export interface LoginResult {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * 微信登录数据接口
 */
export interface WechatLoginData {
  openId: string;
  unionId?: string;
  userInfo?: {
    nickName?: string;
    avatarUrl?: string;
  };
  userType: UserType;
}

/**
 * 认证服务类
 * 处理用户登录、token生成和验证等认证相关功能
 */
export class AuthService {
  private wechatService: WechatService;
  private failedAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();

  constructor() {
    this.wechatService = new WechatService();
  }

  /**
   * 用户登录
   */
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const { phone, password, openId } = credentials;

    // 检查登录尝试次数
    if (phone && this.isAccountLocked(phone)) {
      throw new Error('账户已被锁定，请稍后再试');
    }

    let user: User | undefined;

    try {
      if (openId) {
        // 微信登录
        user = await UserModel.findByOpenId(openId);
        if (!user) {
          throw new Error('用户不存在，请先注册');
        }
      } else if (phone && password) {
        // 手机号密码登录
        user = await UserModel.findByPhone(phone);
        if (!user) {
          this.recordFailedAttempt(phone);
          throw new Error('用户不存在');
        }

        // 检查用户状态（在密码验证前检查，避免泄露用户状态信息）
        if (user.status !== 'active') {
          throw new Error('账户已被禁用，请联系管理员');
        }

        // 验证密码
        if (!user.password) {
          this.recordFailedAttempt(phone);
          throw new Error('用户未设置密码');
        }
        
        const isPasswordValid = await this.verifyPassword(password, user.password);
        if (!isPasswordValid) {
          this.recordFailedAttempt(phone);
          throw new Error('密码错误');
        }
      } else {
        throw new Error('请提供有效的登录凭据');
      }

      // 对于微信登录，检查用户状态
      if (openId && user.status !== 'active') {
        throw new Error('账户已被禁用，请联系管理员');
      }

      // 清除失败尝试记录
      if (phone) {
        this.clearFailedAttempts(phone);
      }

      // 生成token
      const tokens = JwtUtils.generateTokenPair(user);

      // 更新最后登录时间
      await UserModel.updateLastLogin(user.id);

      return {
        user: this.sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: this.getTokenExpirationTime(),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 微信OAuth登录
   */
  async wechatLogin(wechatData: WechatLoginData): Promise<LoginResult> {
    const { openId, unionId, userInfo, userType } = wechatData;

    try {
      // 使用WechatService处理登录逻辑
      let user: User;
      let isNewUser = false;

      const existingUser = await UserModel.findByOpenId(openId);
      
      if (!existingUser) {
        // 新用户注册
        user = await this.wechatService.registerWechatUser({
          openId,
          unionId,
          userType,
          userInfo,
        });
        isNewUser = true;
      } else {
        user = existingUser;
        
        // 检查用户类型是否匹配
        if (user.user_type !== userType) {
          throw new Error(`用户类型不匹配，当前用户是${this.getUserTypeDisplayName(user.user_type)}`);
        }

        // 更新用户信息
        if (userInfo) {
          user = await this.wechatService.updateWechatUserInfo(user.id, userInfo);
        }
      }

      // 检查用户状态
      if (user.status !== 'active') {
        if (user.status === 'pending') {
          throw new Error('账户待审核，请联系管理员');
        }
        throw new Error('账户已被禁用，请联系管理员');
      }

      // 生成token
      const tokens = JwtUtils.generateTokenPair(user);

      // 更新最后登录时间
      await UserModel.updateLastLogin(user.id);

      return {
        user: this.sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: this.getTokenExpirationTime(),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 刷新访问token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      // 验证刷新token
      const payload = JwtUtils.verifyRefreshToken(refreshToken);

      // 获取用户信息
      const user = await UserModel.findById(payload.userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 检查用户状态
      if (user.status !== 'active') {
        throw new Error('账户已被禁用');
      }

      // 生成新的访问token
      const accessToken = JwtUtils.generateAccessToken(user);

      return {
        accessToken,
        expiresIn: this.getTokenExpirationTime(),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 验证访问token
   */
  async verifyAccessToken(token: string): Promise<User> {
    try {
      const payload = JwtUtils.verifyAccessToken(token);

      const user = await UserModel.findById(payload.userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      if (user.status !== 'active') {
        throw new Error('账户已被禁用');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 用户登出
   */
  async logout(userId: number): Promise<void> {
    // 这里可以实现token黑名单机制
    // 目前只是记录登出时间
    await UserModel.updateLastLogout(userId);
  }

  /**
   * 验证密码
   */
  private async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * 哈希密码
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, appConfig.security.bcryptRounds);
  }

  /**
   * 记录失败尝试
   */
  private recordFailedAttempt(identifier: string): void {
    const now = Date.now();
    const attempts = this.failedAttempts.get(identifier) || { count: 0, lastAttempt: now };
    
    attempts.count++;
    attempts.lastAttempt = now;
    
    this.failedAttempts.set(identifier, attempts);
  }

  /**
   * 清除失败尝试记录
   */
  private clearFailedAttempts(identifier: string): void {
    this.failedAttempts.delete(identifier);
  }

  /**
   * 检查账户是否被锁定
   */
  private isAccountLocked(identifier: string): boolean {
    const attempts = this.failedAttempts.get(identifier);
    if (!attempts) {
      return false;
    }

    const now = Date.now();
    const timeSinceLastAttempt = now - attempts.lastAttempt;

    // 如果锁定时间已过，清除记录
    if (timeSinceLastAttempt > appConfig.security.lockoutDuration) {
      this.clearFailedAttempts(identifier);
      return false;
    }

    return attempts.count >= appConfig.security.maxLoginAttempts;
  }

  /**
   * 清理用户敏感信息
   */
  private sanitizeUser(user: User): Omit<User, 'password'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * 获取token过期时间（秒）
   */
  private getTokenExpirationTime(): number {
    const expiresIn = appConfig.jwt.expiresIn;
    
    // 解析时间字符串（如 "24h", "7d", "3600"）
    if (typeof expiresIn === 'string') {
      const match = expiresIn.match(/^(\d+)([hdm]?)$/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        
        switch (unit) {
          case 'h':
            return value * 3600;
          case 'd':
            return value * 24 * 3600;
          case 'm':
            return value * 60;
          default:
            return value; // 默认为秒
        }
      }
    }
    
    return 24 * 3600; // 默认24小时
  }

  /**
   * 生成随机密码
   */
  generateRandomPassword(length: number = 8): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  /**
   * 验证密码强度
   */
  validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('密码长度至少8位');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('密码必须包含小写字母');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('密码必须包含大写字母');
    }
    
    if (!/\d/.test(password)) {
      errors.push('密码必须包含数字');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取用户类型显示名称
   */
  private getUserTypeDisplayName(userType: UserType): string {
    const displayNames: Record<UserType, string> = {
      tenant_admin: '租务管理员',
      merchant_admin: '商户管理员',
      employee: '员工',
      visitor: '访客',
    };

    return displayNames[userType] || userType;
  }
}