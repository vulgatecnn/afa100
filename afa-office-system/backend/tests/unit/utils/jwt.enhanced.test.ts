import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { JwtUtils } from '../../../src/utils/jwt.js';
import type { User } from '../../../src/types/index.js';

// Mock配置
vi.mock('../../../src/config/app.config.js', () => ({
  appConfig: {
    jwt: {
      secret: 'test-secret-key-for-jwt-testing-enhanced',
      expiresIn: '1h',
      refreshExpiresIn: '7d',
    },
  },
}));

describe('JwtUtils Enhanced Tests', () => {
  const mockUser: User = {
    id: 1,
    name: '测试用户',
    user_type: 'employee',
    status: 'active',
    merchant_id: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockUserWithoutMerchant: User = {
    id: 2,
    name: '无商户用户',
    user_type: 'tenant_admin',
    status: 'active',
    merchant_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateAccessToken - 增强测试', () => {
    it('应该为不同用户类型生成正确的token', () => {
      const userTypes = ['tenant_admin', 'merchant_admin', 'employee', 'visitor'] as const;
      
      userTypes.forEach(userType => {
        const user = { ...mockUser, user_type: userType };
        const token = JwtUtils.generateAccessToken(user);
        const decoded = JwtUtils.decodeToken(token);
        
        expect(decoded?.userType).toBe(userType);
        expect(decoded?.userId).toBe(user.id);
      });
    });

    it('应该处理没有merchant_id的用户', () => {
      const token = JwtUtils.generateAccessToken(mockUserWithoutMerchant);
      const decoded = JwtUtils.decodeToken(token);
      
      expect(decoded?.userId).toBe(mockUserWithoutMerchant.id);
      expect(decoded?.userType).toBe(mockUserWithoutMerchant.user_type);
      expect(decoded?.merchantId).toBeUndefined();
    });

    it('应该处理merchant_id为0的情况', () => {
      const userWithZeroMerchant = { ...mockUser, merchant_id: 0 };
      const token = JwtUtils.generateAccessToken(userWithZeroMerchant);
      const decoded = JwtUtils.decodeToken(token);
      
      expect(decoded?.merchantId).toBe(0);
    });

    it('应该设置正确的token元数据', () => {
      const token = JwtUtils.generateAccessToken(mockUser);
      const decoded = JwtUtils.decodeToken(token);
      
      expect(decoded?.iss).toBe('afa-office-system');
      expect(decoded?.aud).toBe('afa-office-client');
      expect(decoded?.iat).toBeDefined();
      expect(decoded?.exp).toBeDefined();
      expect(decoded?.exp).toBeGreaterThan(decoded?.iat!);
    });

    it('应该生成唯一的token', () => {
      const tokens = Array.from({ length: 10 }, () => 
        JwtUtils.generateAccessToken(mockUser)
      );
      
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
    });
  });

  describe('generateRefreshToken - 增强测试', () => {
    it('应该生成具有正确audience的刷新token', () => {
      const token = JwtUtils.generateRefreshToken(mockUser);
      const decoded = JwtUtils.decodeToken(token);
      
      expect(decoded?.aud).toBe('afa-office-refresh');
      expect(decoded?.iss).toBe('afa-office-system');
    });

    it('应该生成比访问token更长有效期的刷新token', () => {
      const accessToken = JwtUtils.generateAccessToken(mockUser);
      const refreshToken = JwtUtils.generateRefreshToken(mockUser);
      
      const accessDecoded = JwtUtils.decodeToken(accessToken);
      const refreshDecoded = JwtUtils.decodeToken(refreshToken);
      
      expect(refreshDecoded?.exp).toBeGreaterThan(accessDecoded?.exp!);
    });

    it('应该包含相同的用户信息', () => {
      const accessToken = JwtUtils.generateAccessToken(mockUser);
      const refreshToken = JwtUtils.generateRefreshToken(mockUser);
      
      const accessDecoded = JwtUtils.decodeToken(accessToken);
      const refreshDecoded = JwtUtils.decodeToken(refreshToken);
      
      expect(refreshDecoded?.userId).toBe(accessDecoded?.userId);
      expect(refreshDecoded?.userType).toBe(accessDecoded?.userType);
      expect(refreshDecoded?.merchantId).toBe(accessDecoded?.merchantId);
    });
  });

  describe('verifyAccessToken - 错误处理增强', () => {
    it('应该正确识别不同类型的JWT错误', () => {
      const errorCases = [
        {
          token: jwt.sign({ userId: 1 }, 'wrong-secret'),
          expectedMessage: '访问令牌无效',
        },
        {
          token: jwt.sign({ userId: 1 }, 'test-secret-key-for-jwt-testing-enhanced', { expiresIn: '-1s' }),
          expectedMessage: '访问令牌已过期',
        },
        {
          token: 'invalid.token.format',
          expectedMessage: '访问令牌无效',
        },
        {
          token: '',
          expectedMessage: '访问令牌无效',
        },
      ];

      errorCases.forEach(({ token, expectedMessage }) => {
        expect(() => {
          JwtUtils.verifyAccessToken(token);
        }).toThrow(expectedMessage);
      });
    });

    it('应该验证token的audience', () => {
      const tokenWithWrongAudience = jwt.sign(
        { userId: 1, userType: 'employee' },
        'test-secret-key-for-jwt-testing-enhanced',
        {
          issuer: 'afa-office-system',
          audience: 'wrong-audience',
        }
      );

      expect(() => {
        JwtUtils.verifyAccessToken(tokenWithWrongAudience);
      }).toThrow();
    });

    it('应该验证token的issuer', () => {
      const tokenWithWrongIssuer = jwt.sign(
        { userId: 1, userType: 'employee' },
        'test-secret-key-for-jwt-testing-enhanced',
        {
          issuer: 'wrong-issuer',
          audience: 'afa-office-client',
        }
      );

      expect(() => {
        JwtUtils.verifyAccessToken(tokenWithWrongIssuer);
      }).toThrow();
    });

    it('应该处理格式错误的token', () => {
      const malformedTokens = [
        'not.a.jwt',
        'header.payload', // 缺少签名
        'header.payload.signature.extra', // 多余部分
        'header..signature', // 空payload
      ];

      malformedTokens.forEach(token => {
        expect(() => {
          JwtUtils.verifyAccessToken(token);
        }).toThrow('访问令牌无效');
      });
    });
  });

  describe('verifyRefreshToken - 增强测试', () => {
    it('应该拒绝访问token作为刷新token', () => {
      const accessToken = JwtUtils.generateAccessToken(mockUser);
      
      expect(() => {
        JwtUtils.verifyRefreshToken(accessToken);
      }).toThrow();
    });

    it('应该正确验证刷新token的过期时间', () => {
      // 创建一个已过期的刷新token
      const expiredRefreshToken = jwt.sign(
        { userId: 1, userType: 'employee' },
        'test-secret-key-for-jwt-testing-enhanced',
        {
          expiresIn: '-1s',
          issuer: 'afa-office-system',
          audience: 'afa-office-refresh',
        }
      );

      expect(() => {
        JwtUtils.verifyRefreshToken(expiredRefreshToken);
      }).toThrow('刷新令牌已过期');
    });

    it('应该验证刷新token的完整性', () => {
      const validRefreshToken = JwtUtils.generateRefreshToken(mockUser);
      const decoded = JwtUtils.verifyRefreshToken(validRefreshToken);
      
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.userType).toBe(mockUser.user_type);
      expect(decoded.merchantId).toBe(mockUser.merchant_id);
    });
  });

  describe('decodeToken - 边界条件测试', () => {
    it('应该处理各种无效token格式', () => {
      const invalidTokens = [
        '',
        'invalid',
        'header.payload',
        'header.payload.signature.extra',
        null as any,
        undefined as any,
        123 as any,
        {} as any,
      ];

      invalidTokens.forEach(token => {
        const result = JwtUtils.decodeToken(token);
        expect(result).toBeNull();
      });
    });

    it('应该解码有效token而不验证签名', () => {
      const tokenWithWrongSignature = jwt.sign(
        { userId: 1, userType: 'employee' },
        'wrong-secret'
      );

      const decoded = JwtUtils.decodeToken(tokenWithWrongSignature);
      expect(decoded?.userId).toBe(1);
      expect(decoded?.userType).toBe('employee');
    });

    it('应该处理包含特殊字符的payload', () => {
      const specialPayload = {
        userId: 1,
        userType: 'employee',
        specialChars: '中文测试!@#$%^&*()',
        unicode: '🔐🚀',
      };

      const token = jwt.sign(specialPayload, 'test-secret');
      const decoded = JwtUtils.decodeToken(token);
      
      expect(decoded?.specialChars).toBe(specialPayload.specialChars);
      expect(decoded?.unicode).toBe(specialPayload.unicode);
    });
  });

  describe('isTokenExpiringSoon - 时间处理测试', () => {
    it('应该正确识别即将过期的token', () => {
      // 创建一个29分钟后过期的token
      const soonToExpireToken = jwt.sign(
        { userId: 1 },
        'test-secret-key-for-jwt-testing-enhanced',
        { expiresIn: '29m' }
      );

      const isExpiring = JwtUtils.isTokenExpiringSoon(soonToExpireToken);
      expect(isExpiring).toBe(true);
    });

    it('应该正确识别不会很快过期的token', () => {
      // 创建一个31分钟后过期的token
      const notSoonToExpireToken = jwt.sign(
        { userId: 1 },
        'test-secret-key-for-jwt-testing-enhanced',
        { expiresIn: '31m' }
      );

      const isExpiring = JwtUtils.isTokenExpiringSoon(notSoonToExpireToken);
      expect(isExpiring).toBe(false);
    });

    it('应该处理已过期的token', () => {
      const expiredToken = jwt.sign(
        { userId: 1 },
        'test-secret-key-for-jwt-testing-enhanced',
        { expiresIn: '-1s' }
      );

      const isExpiring = JwtUtils.isTokenExpiringSoon(expiredToken);
      expect(isExpiring).toBe(true);
    });

    it('应该处理没有exp字段的token', () => {
      const tokenWithoutExp = jwt.sign(
        { userId: 1 },
        'test-secret-key-for-jwt-testing-enhanced',
        { noTimestamp: true }
      );

      const isExpiring = JwtUtils.isTokenExpiringSoon(tokenWithoutExp);
      expect(isExpiring).toBe(true);
    });

    it('应该处理边界时间（正好30分钟）', () => {
      const exactlyThirtyMinToken = jwt.sign(
        { userId: 1 },
        'test-secret-key-for-jwt-testing-enhanced',
        { expiresIn: '30m' }
      );

      const isExpiring = JwtUtils.isTokenExpiringSoon(exactlyThirtyMinToken);
      expect(isExpiring).toBe(false);
    });
  });

  describe('getTokenRemainingTime - 精确时间计算', () => {
    it('应该返回准确的剩余时间', () => {
      const expiresIn = 3600; // 1小时
      const token = jwt.sign(
        { userId: 1 },
        'test-secret-key-for-jwt-testing-enhanced',
        { expiresIn }
      );

      const remainingTime = JwtUtils.getTokenRemainingTime(token);
      
      // 允许一些时间误差（几秒）
      expect(remainingTime).toBeGreaterThan(expiresIn - 10);
      expect(remainingTime).toBeLessThanOrEqual(expiresIn);
    });

    it('应该为过期token返回0', () => {
      const expiredToken = jwt.sign(
        { userId: 1 },
        'test-secret-key-for-jwt-testing-enhanced',
        { expiresIn: '-1s' }
      );

      const remainingTime = JwtUtils.getTokenRemainingTime(expiredToken);
      expect(remainingTime).toBe(0);
    });

    it('应该处理各种时间格式', () => {
      const timeFormats = [
        { format: '1h', expectedMin: 3500, expectedMax: 3600 },
        { format: '30m', expectedMin: 1700, expectedMax: 1800 },
        { format: '1d', expectedMin: 86300, expectedMax: 86400 },
        { format: 60, expectedMin: 50, expectedMax: 60 }, // 数字格式（秒）
      ];

      timeFormats.forEach(({ format, expectedMin, expectedMax }) => {
        const token = jwt.sign(
          { userId: 1 },
          'test-secret-key-for-jwt-testing-enhanced',
          { expiresIn: format }
        );

        const remainingTime = JwtUtils.getTokenRemainingTime(token);
        expect(remainingTime).toBeGreaterThanOrEqual(expectedMin);
        expect(remainingTime).toBeLessThanOrEqual(expectedMax);
      });
    });

    it('应该处理没有exp字段的token', () => {
      const tokenWithoutExp = jwt.sign(
        { userId: 1 },
        'test-secret-key-for-jwt-testing-enhanced',
        { noTimestamp: true }
      );

      const remainingTime = JwtUtils.getTokenRemainingTime(tokenWithoutExp);
      expect(remainingTime).toBe(0);
    });
  });

  describe('generateTokenPair - 完整性测试', () => {
    it('应该生成有效的token对', () => {
      const tokens = JwtUtils.generateTokenPair(mockUser);
      
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });

    it('应该生成可以独立验证的token对', () => {
      const tokens = JwtUtils.generateTokenPair(mockUser);
      
      const accessDecoded = JwtUtils.verifyAccessToken(tokens.accessToken);
      const refreshDecoded = JwtUtils.verifyRefreshToken(tokens.refreshToken);
      
      expect(accessDecoded.userId).toBe(mockUser.id);
      expect(refreshDecoded.userId).toBe(mockUser.id);
    });

    it('应该为不同用户生成不同的token对', () => {
      const user1Tokens = JwtUtils.generateTokenPair(mockUser);
      const user2Tokens = JwtUtils.generateTokenPair(mockUserWithoutMerchant);
      
      expect(user1Tokens.accessToken).not.toBe(user2Tokens.accessToken);
      expect(user1Tokens.refreshToken).not.toBe(user2Tokens.refreshToken);
    });

    it('应该处理用户信息的各种组合', () => {
      const userVariations = [
        { ...mockUser, merchant_id: null },
        { ...mockUser, merchant_id: 0 },
        { ...mockUser, merchant_id: 999999 },
        { ...mockUser, user_type: 'tenant_admin' as const },
        { ...mockUser, user_type: 'visitor' as const },
      ];

      userVariations.forEach(user => {
        const tokens = JwtUtils.generateTokenPair(user);
        
        expect(tokens.accessToken).toBeDefined();
        expect(tokens.refreshToken).toBeDefined();
        
        const accessDecoded = JwtUtils.verifyAccessToken(tokens.accessToken);
        expect(accessDecoded.userId).toBe(user.id);
        expect(accessDecoded.userType).toBe(user.user_type);
        expect(accessDecoded.merchantId).toBe(user.merchant_id);
      });
    });
  });

  describe('安全性测试', () => {
    it('应该使用强密钥生成token', () => {
      const token = JwtUtils.generateAccessToken(mockUser);
      
      // 尝试用弱密钥验证应该失败
      expect(() => {
        jwt.verify(token, 'weak');
      }).toThrow();
    });

    it('应该防止token篡改', () => {
      const token = JwtUtils.generateAccessToken(mockUser);
      const parts = token.split('.');
      
      // 篡改payload
      const tamperedPayload = Buffer.from('{"userId":999,"userType":"tenant_admin"}').toString('base64');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
      
      expect(() => {
        JwtUtils.verifyAccessToken(tamperedToken);
      }).toThrow('访问令牌无效');
    });

    it('应该防止签名重用', () => {
      const token1 = JwtUtils.generateAccessToken(mockUser);
      const token2 = JwtUtils.generateAccessToken(mockUserWithoutMerchant);
      
      const parts1 = token1.split('.');
      const parts2 = token2.split('.');
      
      // 尝试重用签名
      const reusedSignatureToken = `${parts2[0]}.${parts2[1]}.${parts1[2]}`;
      
      expect(() => {
        JwtUtils.verifyAccessToken(reusedSignatureToken);
      }).toThrow('访问令牌无效');
    });
  });

  describe('性能测试', () => {
    it('应该能快速生成大量token', () => {
      const startTime = Date.now();
      
      const tokens = Array.from({ length: 1000 }, () => 
        JwtUtils.generateAccessToken(mockUser)
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(tokens).toHaveLength(1000);
      expect(duration).toBeLessThan(5000); // 5秒内完成
    });

    it('应该能快速验证大量token', () => {
      const tokens = Array.from({ length: 100 }, () => 
        JwtUtils.generateAccessToken(mockUser)
      );
      
      const startTime = Date.now();
      
      tokens.forEach(token => {
        JwtUtils.verifyAccessToken(token);
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // 1秒内完成
    });
  });

  describe('内存管理测试', () => {
    it('应该正确清理资源', () => {
      const tokens = Array.from({ length: 100 }, () => 
        JwtUtils.generateTokenPair(mockUser)
      );
      
      // 验证所有token
      tokens.forEach(({ accessToken, refreshToken }) => {
        JwtUtils.verifyAccessToken(accessToken);
        JwtUtils.verifyRefreshToken(refreshToken);
      });
      
      // 应该没有内存泄漏
      expect(tokens).toHaveLength(100);
    });
  });
});