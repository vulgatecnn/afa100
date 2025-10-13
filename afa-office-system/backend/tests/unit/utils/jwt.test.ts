import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JwtUtils } from '../../../src/utils/jwt.js';
import type { User } from '../../../src/types/index.js';

// Mock配置
vi.mock('../../../src/config/app.config.js', () => ({
  appConfig: {
    jwt: {
      secret: 'test-secret-key-for-jwt-testing',
      expiresIn: '1h',
      refreshExpiresIn: '7d',
    },
  },
}));

describe('JwtUtils', () => {
  const mockUser: User = {
    id: 1,
    name: '测试用户',
    user_type: 'employee',
    status: 'active',
    merchant_id: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  describe('generateAccessToken', () => {
    it('应该生成有效的访问token', () => {
      const token = JwtUtils.generateAccessToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT格式检查
    });

    it('生成的token应该包含正确的用户信息', () => {
      const token = JwtUtils.generateAccessToken(mockUser);
      const decoded = JwtUtils.decodeToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUser.id);
      expect(decoded?.userType).toBe(mockUser.user_type);
      expect(decoded?.merchantId).toBe(mockUser.merchant_id);
    });

    it('应该设置正确的issuer和audience', () => {
      const token = JwtUtils.generateAccessToken(mockUser);
      const decoded = JwtUtils.decodeToken(token);
      
      expect(decoded?.iss).toBe('afa-office-system');
      expect(decoded?.aud).toBe('afa-office-client');
    });
  });

  describe('generateRefreshToken', () => {
    it('应该生成有效的刷新token', () => {
      const token = JwtUtils.generateRefreshToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('刷新token应该有不同的audience', () => {
      const token = JwtUtils.generateRefreshToken(mockUser);
      const decoded = JwtUtils.decodeToken(token);
      
      expect(decoded?.aud).toBe('afa-office-refresh');
    });
  });

  describe('verifyAccessToken', () => {
    it('应该验证有效的访问token', () => {
      const token = JwtUtils.generateAccessToken(mockUser);
      const decoded = JwtUtils.verifyAccessToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.userType).toBe(mockUser.user_type);
    });

    it('应该拒绝无效的token', () => {
      expect(() => {
        JwtUtils.verifyAccessToken('invalid-token');
      }).toThrow('访问令牌无效');
    });

    it('应该拒绝错误audience的token', () => {
      const refreshToken = JwtUtils.generateRefreshToken(mockUser);
      
      expect(() => {
        JwtUtils.verifyAccessToken(refreshToken);
      }).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('应该验证有效的刷新token', () => {
      const token = JwtUtils.generateRefreshToken(mockUser);
      const decoded = JwtUtils.verifyRefreshToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockUser.id);
    });

    it('应该拒绝访问token作为刷新token', () => {
      const accessToken = JwtUtils.generateAccessToken(mockUser);
      
      expect(() => {
        JwtUtils.verifyRefreshToken(accessToken);
      }).toThrow();
    });
  });

  describe('decodeToken', () => {
    it('应该解码有效token而不验证签名', () => {
      const token = JwtUtils.generateAccessToken(mockUser);
      const decoded = JwtUtils.decodeToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUser.id);
    });

    it('应该返回null对于无效token', () => {
      const decoded = JwtUtils.decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });
  });

  describe('isTokenExpiringSoon', () => {
    it('应该检测即将过期的token', async () => {
      // 创建一个即将过期的token（29分钟后过期）
      const jwt = require('jsonwebtoken');
      const configModule = await import('../../../src/config/app.config.js');
      
      const token = jwt.sign(
        { userId: mockUser.id, userType: mockUser.user_type },
        configModule.appConfig.jwt.secret,
        { expiresIn: '29m' } // 29分钟后过期，应该被认为是即将过期
      );
      
      const isExpiring = JwtUtils.isTokenExpiringSoon(token);
      expect(isExpiring).toBe(true);
    });

    it('应该返回false对于新token', () => {
      const token = JwtUtils.generateAccessToken(mockUser);
      const isExpiring = JwtUtils.isTokenExpiringSoon(token);
      
      expect(isExpiring).toBe(false);
    });
  });

  describe('getTokenRemainingTime', () => {
    it('应该返回token剩余时间', () => {
      const token = JwtUtils.generateAccessToken(mockUser);
      const remainingTime = JwtUtils.getTokenRemainingTime(token);
      
      expect(remainingTime).toBeGreaterThan(0);
      expect(remainingTime).toBeLessThanOrEqual(3600); // 1小时 = 3600秒
    });

    it('应该返回0对于无效token', () => {
      const remainingTime = JwtUtils.getTokenRemainingTime('invalid-token');
      expect(remainingTime).toBe(0);
    });
  });

  describe('generateTokenPair', () => {
    it('应该生成访问token和刷新token对', () => {
      const tokens = JwtUtils.generateTokenPair(mockUser);
      
      expect(tokens).toBeDefined();
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      
      // 验证两个token都有效
      const accessDecoded = JwtUtils.verifyAccessToken(tokens.accessToken);
      const refreshDecoded = JwtUtils.verifyRefreshToken(tokens.refreshToken);
      
      expect(accessDecoded.userId).toBe(mockUser.id);
      expect(refreshDecoded.userId).toBe(mockUser.id);
    });
  });
});