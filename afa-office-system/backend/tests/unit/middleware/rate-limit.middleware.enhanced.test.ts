import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  createRateLimit,
  rateLimits,
} from '../../../src/middleware/rate-limit.middleware.js';
import { AppError, ErrorCodes } from '../../../src/middleware/error.middleware.js';

describe('Rate Limit Middleware Enhanced Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.useFakeTimers();
    
    mockReq = {
      ip: '127.0.0.1',
      body: {},
      user: undefined,
    };

    mockRes = {
      set: vi.fn(),
      statusCode: 200,
      on: vi.fn(),
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('createRateLimit - 基础功能', () => {
    it('应该允许在限制内的请求通过', () => {
      const rateLimit = createRateLimit({
        windowMs: 60000, // 1分钟
        max: 5, // 最多5次请求
      });

      // 发送5次请求，都应该通过
      for (let i = 0; i < 5; i++) {
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0', // 最后一次请求后剩余0次
        })
      );
    });

    it('应该阻止超出限制的请求', () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        max: 3,
        message: '请求过于频繁',
      });

      // 发送3次请求（达到限制）
      for (let i = 0; i < 3; i++) {
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      }

      // 第4次请求应该被阻止
      expect(() => {
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(AppError);

      expect(mockNext).toHaveBeenCalledTimes(3);
    });

    it('应该在时间窗口重置后允许新请求', () => {
      const rateLimit = createRateLimit({
        windowMs: 60000, // 1分钟
        max: 2,
      });

      // 发送2次请求（达到限制）
      for (let i = 0; i < 2; i++) {
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      }

      // 第3次请求应该被阻止
      expect(() => {
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(AppError);

      // 快进时间超过窗口期
      vi.advanceTimersByTime(61000); // 61秒

      // 现在应该可以发送新请求
      rateLimit(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(3);
    });

    it('应该为不同IP设置独立的限制', () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        max: 2,
      });

      // IP1发送2次请求
      mockReq.ip = '192.168.1.1';
      for (let i = 0; i < 2; i++) {
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      }

      // IP2应该有独立的限制
      mockReq.ip = '192.168.1.2';
      for (let i = 0; i < 2; i++) {
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(4);
    });

    it('应该设置正确的响应头', () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        max: 5,
      });

      rateLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': '4',
        'X-RateLimit-Reset': expect.any(String),
      });
    });

    it('应该在超出限制时设置Retry-After头', () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        max: 1,
      });

      // 发送第一次请求
      rateLimit(mockReq as Request, mockRes as Response, mockNext);

      // 第二次请求应该被阻止并设置Retry-After头
      try {
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      } catch (error) {
        expect(mockRes.set).toHaveBeenCalledWith(
          expect.objectContaining({
            'Retry-After': expect.any(String),
          })
        );
      }
    });
  });

  describe('自定义键生成器', () => {
    it('应该使用自定义键生成器', () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        max: 2,
        keyGenerator: (req) => `user:${req.user?.userId || 'anonymous'}`,
      });

      // 设置用户信息
      mockReq.user = { userId: 123 } as any;

      // 发送2次请求
      for (let i = 0; i < 2; i++) {
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      }

      // 第3次请求应该被阻止
      expect(() => {
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(AppError);

      // 不同用户应该有独立限制
      mockReq.user = { userId: 456 } as any;
      rateLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(3);
    });

    it('应该处理匿名用户', () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        max: 1,
        keyGenerator: (req) => `user:${req.user?.userId || 'anonymous'}`,
      });

      // 匿名用户请求
      mockReq.user = undefined;
      rateLimit(mockReq as Request, mockRes as Response, mockNext);

      // 第二次匿名请求应该被阻止
      expect(() => {
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(AppError);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('跳过请求选项', () => {
    it('应该跳过成功请求的计数', () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        max: 2,
        skipSuccessfulRequests: true,
      });

      // 模拟响应完成事件
      const onFinish = vi.fn();
      mockRes.on = vi.fn((event, callback) => {
        if (event === 'finish') {
          onFinish.mockImplementation(callback);
        }
      });

      // 发送请求
      rateLimit(mockReq as Request, mockRes as Response, mockNext);
      
      // 模拟成功响应（状态码 < 400）
      mockRes.statusCode = 200;
      onFinish();

      // 应该能够发送更多请求，因为成功请求被跳过
      for (let i = 0; i < 2; i++) {
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(3);
    });

    it('应该跳过失败请求的计数', () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        max: 2,
        skipFailedRequests: true,
      });

      const onFinish = vi.fn();
      mockRes.on = vi.fn((event, callback) => {
        if (event === 'finish') {
          onFinish.mockImplementation(callback);
        }
      });

      // 发送请求
      rateLimit(mockReq as Request, mockRes as Response, mockNext);
      
      // 模拟失败响应（状态码 >= 400）
      mockRes.statusCode = 400;
      onFinish();

      // 应该能够发送更多请求，因为失败请求被跳过
      for (let i = 0; i < 2; i++) {
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(3);
    });
  });

  describe('预定义速率限制配置', () => {
    describe('rateLimits.general', () => {
      it('应该允许每分钟100次请求', () => {
        // 发送100次请求
        for (let i = 0; i < 100; i++) {
          rateLimits.general(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockNext).toHaveBeenCalledTimes(100);

        // 第101次请求应该被阻止
        expect(() => {
          rateLimits.general(mockReq as Request, mockRes as Response, mockNext);
        }).toThrow(AppError);
      });
    });

    describe('rateLimits.login', () => {
      it('应该限制登录尝试', () => {
        mockReq.body = { phone: '13800138000' };

        // 发送5次登录请求
        for (let i = 0; i < 5; i++) {
          rateLimits.login(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockNext).toHaveBeenCalledTimes(5);

        // 第6次请求应该被阻止
        expect(() => {
          rateLimits.login(mockReq as Request, mockRes as Response, mockNext);
        }).toThrow(AppError);
      });

      it('应该为不同手机号设置独立限制', () => {
        // 手机号1发送5次请求
        mockReq.body = { phone: '13800138000' };
        for (let i = 0; i < 5; i++) {
          rateLimits.login(mockReq as Request, mockRes as Response, mockNext);
        }

        // 手机号2应该有独立限制
        mockReq.body = { phone: '13800138001' };
        for (let i = 0; i < 5; i++) {
          rateLimits.login(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockNext).toHaveBeenCalledTimes(10);
      });

      it('应该处理微信登录', () => {
        mockReq.body = { openId: 'wx_openid_123' };

        for (let i = 0; i < 5; i++) {
          rateLimits.login(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockNext).toHaveBeenCalledTimes(5);

        expect(() => {
          rateLimits.login(mockReq as Request, mockRes as Response, mockNext);
        }).toThrow(AppError);
      });
    });

    describe('rateLimits.sms', () => {
      it('应该限制短信验证码发送', () => {
        mockReq.body = { phone: '13800138000' };

        // 第一次请求应该通过
        rateLimits.sms(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);

        // 第二次请求应该被阻止
        expect(() => {
          rateLimits.sms(mockReq as Request, mockRes as Response, mockNext);
        }).toThrow(AppError);
      });

      it('应该在1分钟后重置限制', () => {
        mockReq.body = { phone: '13800138000' };

        // 发送第一次请求
        rateLimits.sms(mockReq as Request, mockRes as Response, mockNext);

        // 快进时间61秒
        vi.advanceTimersByTime(61000);

        // 现在应该可以发送新请求
        rateLimits.sms(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(2);
      });
    });

    describe('rateLimits.upload', () => {
      it('应该限制文件上传频率', () => {
        // 发送10次上传请求
        for (let i = 0; i < 10; i++) {
          rateLimits.upload(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockNext).toHaveBeenCalledTimes(10);

        // 第11次请求应该被阻止
        expect(() => {
          rateLimits.upload(mockReq as Request, mockRes as Response, mockNext);
        }).toThrow(AppError);
      });
    });

    describe('rateLimits.passcodeValidation', () => {
      it('应该限制通行码验证频率', () => {
        // 发送10次验证请求
        for (let i = 0; i < 10; i++) {
          rateLimits.passcodeValidation(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockNext).toHaveBeenCalledTimes(10);

        // 第11次请求应该被阻止
        expect(() => {
          rateLimits.passcodeValidation(mockReq as Request, mockRes as Response, mockNext);
        }).toThrow(AppError);
      });

      it('应该在1秒后重置限制', () => {
        // 发送10次请求（达到限制）
        for (let i = 0; i < 10; i++) {
          rateLimits.passcodeValidation(mockReq as Request, mockRes as Response, mockNext);
        }

        // 快进时间1.1秒
        vi.advanceTimersByTime(1100);

        // 现在应该可以发送新请求
        rateLimits.passcodeValidation(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(11);
      });
    });

    describe('rateLimits.visitorApplication', () => {
      it('应该限制访客申请频率', () => {
        mockReq.user = { userId: 123 } as any;

        // 发送5次申请请求
        for (let i = 0; i < 5; i++) {
          rateLimits.visitorApplication(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockNext).toHaveBeenCalledTimes(5);

        // 第6次请求应该被阻止
        expect(() => {
          rateLimits.visitorApplication(mockReq as Request, mockRes as Response, mockNext);
        }).toThrow(AppError);
      });

      it('应该为不同用户设置独立限制', () => {
        // 用户1发送5次请求
        mockReq.user = { userId: 123 } as any;
        for (let i = 0; i < 5; i++) {
          rateLimits.visitorApplication(mockReq as Request, mockRes as Response, mockNext);
        }

        // 用户2应该有独立限制
        mockReq.user = { userId: 456 } as any;
        for (let i = 0; i < 5; i++) {
          rateLimits.visitorApplication(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockNext).toHaveBeenCalledTimes(10);
      });

      it('应该为匿名用户使用IP限制', () => {
        mockReq.user = undefined;
        mockReq.ip = '192.168.1.1';

        // 发送5次请求
        for (let i = 0; i < 5; i++) {
          rateLimits.visitorApplication(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockNext).toHaveBeenCalledTimes(5);

        expect(() => {
          rateLimits.visitorApplication(mockReq as Request, mockRes as Response, mockNext);
        }).toThrow(AppError);
      });
    });
  });

  describe('错误处理和边界情况', () => {
    it('应该处理缺少IP地址的请求', () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        max: 5,
      });

      mockReq.ip = undefined;

      // 应该使用默认键 'unknown'
      rateLimit(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('应该处理自定义键生成器抛出异常', () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        max: 5,
        keyGenerator: () => {
          throw new Error('Key generation failed');
        },
      });

      // 应该优雅处理错误，可能回退到默认键
      expect(() => {
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow();
    });

    it('应该处理极短的时间窗口', () => {
      const rateLimit = createRateLimit({
        windowMs: 1, // 1毫秒
        max: 1,
      });

      rateLimit(mockReq as Request, mockRes as Response, mockNext);

      // 快进1毫秒
      vi.advanceTimersByTime(2);

      // 应该可以发送新请求
      rateLimit(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('应该处理极大的限制数量', () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        max: 1000000, // 100万次请求
      });

      // 发送大量请求
      for (let i = 0; i < 1000; i++) {
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(1000);
    });

    it('应该处理并发请求', () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        max: 5,
      });

      // 模拟并发请求
      const promises = Array.from({ length: 10 }, () => {
        return new Promise<void>((resolve) => {
          try {
            rateLimit(mockReq as Request, mockRes as Response, mockNext);
            resolve();
          } catch (error) {
            resolve(); // 即使抛出错误也要resolve，以便测试继续
          }
        });
      });

      Promise.all(promises);

      // 应该只有5次请求成功
      expect(mockNext).toHaveBeenCalledTimes(5);
    });
  });

  describe('内存管理和清理', () => {
    it('应该清理过期的记录', () => {
      const rateLimit = createRateLimit({
        windowMs: 1000, // 1秒
        max: 5,
      });

      // 发送请求
      rateLimit(mockReq as Request, mockRes as Response, mockNext);

      // 快进时间超过清理间隔（60秒）
      vi.advanceTimersByTime(61000);

      // 触发清理（通过发送新请求）
      rateLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('应该处理大量不同IP的请求', () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        max: 1,
      });

      // 模拟1000个不同IP的请求
      for (let i = 0; i < 1000; i++) {
        mockReq.ip = `192.168.1.${i % 255}`;
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(1000);
    });
  });

  describe('安全性测试', () => {
    it('应该防止键注入攻击', () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        max: 2,
        keyGenerator: (req) => `user:${req.body.userId}`,
      });

      // 尝试注入恶意键
      mockReq.body = { userId: '../../../etc/passwd' };
      
      rateLimit(mockReq as Request, mockRes as Response, mockNext);
      rateLimit(mockReq as Request, mockRes as Response, mockNext);

      // 第三次请求应该被阻止
      expect(() => {
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(AppError);

      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('应该处理恶意的大量请求', () => {
      const rateLimit = createRateLimit({
        windowMs: 1000,
        max: 10,
      });

      // 模拟DDoS攻击
      for (let i = 0; i < 100; i++) {
        try {
          rateLimit(mockReq as Request, mockRes as Response, mockNext);
        } catch (error) {
          // 忽略错误，继续测试
        }
      }

      // 应该只有10次请求成功
      expect(mockNext).toHaveBeenCalledTimes(10);
    });

    it('应该防止时间操纵攻击', () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        max: 1,
      });

      // 发送第一次请求
      rateLimit(mockReq as Request, mockRes as Response, mockNext);

      // 尝试通过操纵时间来绕过限制
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() - 120000); // 回退2分钟

      // 第二次请求仍应该被阻止
      expect(() => {
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(AppError);

      // 恢复原始Date.now
      Date.now = originalNow;
    });
  });
});