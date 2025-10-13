import jwt from 'jsonwebtoken';
import { appConfig } from '../config/app.config.js';
import type { JwtPayload, User } from '../types/index.js';

/**
 * JWT工具类
 * 提供JWT token的生成、验证和刷新功能
 */
export class JwtUtils {
  /**
   * 生成访问token
   */
  static generateAccessToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      userType: user.user_type,
      ...(user.merchant_id !== null && user.merchant_id !== undefined && { merchantId: user.merchant_id }),
    };

    return jwt.sign(payload, appConfig.jwt.secret, {
      expiresIn: appConfig.jwt.expiresIn,
      issuer: 'afa-office-system',
      audience: 'afa-office-client',
    } as any);
  }

  /**
   * 生成刷新token
   */
  static generateRefreshToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      userType: user.user_type,
      ...(user.merchant_id !== null && user.merchant_id !== undefined && { merchantId: user.merchant_id }),
    };

    return jwt.sign(payload, appConfig.jwt.secret, {
      expiresIn: appConfig.jwt.refreshExpiresIn,
      issuer: 'afa-office-system',
      audience: 'afa-office-refresh',
    } as any);
  }

  /**
   * 验证访问token
   */
  static verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret, {
        issuer: 'afa-office-system',
        audience: 'afa-office-client',
      }) as JwtPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('访问令牌已过期');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('访问令牌无效');
      }
      throw new Error('令牌验证失败');
    }
  }

  /**
   * 验证刷新token
   */
  static verifyRefreshToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret, {
        issuer: 'afa-office-system',
        audience: 'afa-office-refresh',
      }) as JwtPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('刷新令牌已过期');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('刷新令牌无效');
      }
      throw new Error('令牌验证失败');
    }
  }

  /**
   * 解码token（不验证签名）
   */
  static decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * 检查token是否即将过期（30分钟内）
   */
  static isTokenExpiringSoon(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;
    
    // 如果30分钟内过期，返回true
    return timeUntilExpiry < 30 * 60;
  }

  /**
   * 获取token剩余有效时间（秒）
   */
  static getTokenRemainingTime(token: string): number {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, decoded.exp - now);
  }

  /**
   * 生成token对
   */
  static generateTokenPair(user: User): { accessToken: string; refreshToken: string } {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }
}