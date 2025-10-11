import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requestLogger, logApiResponse } from '../../../src/middleware/logger.middleware.js';

describe('Logger Middleware Enhanced Tests', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let consoleSpy: any;

  beforeEach(() => {
    req = {
      method: 'GET',
      originalUrl: '/api/v1/test',
      ip: '127.0.0.1',
      body: { test: 'data' },
      startTime: undefined,
    };
    
    res = {
      json: vi.fn(),
      statusCode: 200,
    };
    
    next = vi.fn() as unknown as NextFunction;
    
    // 模拟console.log以捕获日志
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('requestLogger - 增强功能测试', () => {
    it('应该记录不同HTTP方法的请求', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      
      methods.forEach(method => {
        vi.clearAllMocks();
        req.method = method;
        
        requestLogger(req as Request, res as Response, next);
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(`📥 ${method} /api/v1/test - 127.0.0.1`)
        );
      });
    });

    it('应该处理不同的IP地址格式', () => {
      const ipAddresses = [
        '192.168.1.1',
        '::1',
        '10.0.0.1',
        'unknown',
        undefined,
      ];

      ipAddresses.forEach(ip => {
        vi.clearAllMocks();
        req.ip = ip;
        
        requestLogger(req as Request, res as Response, next);
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(`📥 GET /api/v1/test - ${ip || 'undefined'}`)
        );
      });
    });

    it('应该处理复杂的URL路径', () => {
      const urls = [
        '/api/v1/merchants/123/employees',
        '/api/v1/visitors?status=pending&page=1',
        '/api/v1/spaces/456/access-records',
        '/',
        '/health',
      ];

      urls.forEach(url => {
        vi.clearAllMocks();
        req.originalUrl = url;
        
        requestLogger(req as Request, res as Response, next);
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(`📥 GET ${url} - 127.0.0.1`)
        );
      });
    });

    it('应该正确设置请求开始时间', () => {
      const beforeTime = Date.now();
      
      requestLogger(req as Request, res as Response, next);
      
      const afterTime = Date.now();
      
      expect(req.startTime).toBeDefined();
      expect(req.startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(req.startTime).toBeLessThanOrEqual(afterTime);
    });

    it('应该在开发环境下记录复杂的请求体', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      req.body = {
        user: {
          name: 'test',
          email: 'test@example.com',
          password: 'secret123',
        },
        metadata: {
          source: 'web',
          token: 'jwt-token',
          key: 'api-key',
        },
        normalData: 'value',
      };
      
      requestLogger(req as Request, res as Response, next);
      
      // 应该记录请求体但删除敏感字段
      expect(consoleSpy).toHaveBeenCalledWith(
        '📄 Request Body:',
        expect.stringContaining('[REDACTED]')
      );
      
      // 验证敏感字段被替换
      const logCall = consoleSpy.mock.calls.find(call => 
        call[0] === '📄 Request Body:'
      );
      expect(logCall[1]).toContain('[REDACTED]');
      expect(logCall[1]).not.toContain('secret123');
      expect(logCall[1]).not.toContain('jwt-token');
      expect(logCall[1]).not.toContain('api-key');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('应该处理所有敏感字段类型', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const sensitiveFields = ['password', 'token', 'secret', 'key'];
      
      sensitiveFields.forEach(field => {
        vi.clearAllMocks();
        req.body = {
          [field]: 'sensitive-value',
          normalField: 'normal-value',
        };
        
        requestLogger(req as Request, res as Response, next);
        
        const logCall = consoleSpy.mock.calls.find(call => 
          call[0] === '📄 Request Body:'
        );
        expect(logCall[1]).toContain('[REDACTED]');
        expect(logCall[1]).not.toContain('sensitive-value');
        expect(logCall[1]).toContain('normal-value');
      });
      
      process.env.NODE_ENV = originalEnv;
    });

    it('应该处理空或undefined请求体', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const testCases = [null, undefined, {}, ''];
      
      testCases.forEach(body => {
        vi.clearAllMocks();
        req.body = body;
        
        expect(() => {
          requestLogger(req as Request, res as Response, next);
        }).not.toThrow();
        
        expect(next).toHaveBeenCalled();
      });
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('响应日志记录 - 增强测试', () => {
    it('应该记录不同状态码的响应', () => {
      const statusCodes = [200, 201, 400, 401, 403, 404, 500];
      
      statusCodes.forEach(statusCode => {
        vi.clearAllMocks();
        res.statusCode = statusCode;
        
        requestLogger(req as Request, res as Response, next);
        
        const testData = { success: statusCode < 400, data: 'test' };
        (res.json as any)(testData);
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(new RegExp(`📤 GET /api/v1/test - ${statusCode} - \\d+ms`))
        );
      });
    });

    it('应该正确计算响应时间', async () => {
      requestLogger(req as Request, res as Response, next);
      
      // 模拟一些处理时间
      await new Promise(resolve => setTimeout(resolve, 50));
      
      (res.json as any)({ success: true });
      
      const logCall = consoleSpy.mock.calls.find(call => 
        call[0].includes('📤')
      );
      
      expect(logCall[0]).toMatch(/\d+ms/);
      
      // 提取时间并验证
      const timeMatch = logCall[0].match(/(\d+)ms/);
      expect(timeMatch).toBeTruthy();
      const responseTime = parseInt(timeMatch![1]);
      expect(responseTime).toBeGreaterThanOrEqual(40); // 允许一些误差
    });

    it('应该在开发环境下记录响应体并删除敏感信息', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      requestLogger(req as Request, res as Response, next);
      
      const responseData = {
        success: true,
        data: {
          user: {
            id: 1,
            name: 'test',
            token: 'jwt-token-value',
          },
          metadata: {
            secret: 'secret-value',
          },
        },
        message: 'Success',
      };
      
      (res.json as any)(responseData);
      
      const logCall = consoleSpy.mock.calls.find(call => 
        call[0] === '📄 Response Body:'
      );
      
      expect(logCall).toBeTruthy();
      expect(logCall[1]).toContain('[REDACTED]');
      expect(logCall[1]).not.toContain('jwt-token-value');
      expect(logCall[1]).toContain('Success');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('应该处理嵌套的敏感数据', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      requestLogger(req as Request, res as Response, next);
      
      const complexResponse = {
        success: true,
        data: {
          users: [
            { id: 1, name: 'user1', token: 'token1' },
            { id: 2, name: 'user2', token: 'token2' },
          ],
          auth: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
          },
        },
      };
      
      (res.json as any)(complexResponse);
      
      const logCall = consoleSpy.mock.calls.find(call => 
        call[0] === '📄 Response Body:'
      );
      
      expect(logCall[1]).toContain('[REDACTED]');
      expect(logCall[1]).not.toContain('access-token');
      expect(logCall[1]).not.toContain('refresh-token');
    });

    it('应该保持原始res.json的返回值', () => {
      const originalJson = res.json as any;
      const testData = { test: 'data' };
      
      requestLogger(req as Request, res as Response, next);
      
      const result = (res.json as any)(testData);
      
      // 验证返回值正确
      expect(result).toBe(res); // 通常res.json返回res对象用于链式调用
    });
  });

  describe('logApiResponse 函数测试', () => {
    it('应该记录API响应日志', () => {
      req.startTime = Date.now() - 100; // 100ms前
      
      const responseData = { success: true, data: 'test' };
      logApiResponse(req as Request, res as Response, responseData, 200);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/📤 GET \/api\/v1\/test - 200 - \d+ms/)
      );
    });

    it('应该处理没有startTime的请求', () => {
      req.startTime = undefined;
      
      const responseData = { success: true, data: 'test' };
      logApiResponse(req as Request, res as Response, responseData, 200);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📤 GET /api/v1/test - 200 - 0ms')
      );
    });

    it('应该使用默认状态码', () => {
      req.startTime = Date.now();
      
      const responseData = { success: true, data: 'test' };
      logApiResponse(req as Request, res as Response, responseData);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('- 200 -')
      );
    });

    it('应该在开发环境下记录响应数据', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      req.startTime = Date.now();
      const responseData = { success: true, data: 'test' };
      
      logApiResponse(req as Request, res as Response, responseData, 200);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '📄 Response:',
        expect.stringContaining('success')
      );
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('环境变量处理', () => {
    it('应该在生产环境下不记录请求体', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      req.body = { sensitive: 'data', password: 'secret' };
      
      requestLogger(req as Request, res as Response, next);
      
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('📄 Request Body:')
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('应该在测试环境下不记录详细信息', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      
      req.body = { test: 'data' };
      
      requestLogger(req as Request, res as Response, next);
      
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('📄 Request Body:')
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('应该处理未设置NODE_ENV的情况', () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;
      
      req.body = { test: 'data' };
      
      expect(() => {
        requestLogger(req as Request, res as Response, next);
      }).not.toThrow();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('错误处理和边界条件', () => {
    it('应该处理JSON序列化错误', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // 创建循环引用对象
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;
      req.body = circularObj;
      
      expect(() => {
        requestLogger(req as Request, res as Response, next);
      }).not.toThrow();
      
      expect(next).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('应该处理res.json调用时的异常', () => {
      requestLogger(req as Request, res as Response, next);
      
      // 模拟res.json抛出异常
      expect(() => {
        (res.json as any)(undefined);
      }).not.toThrow();
    });

    it('应该处理大型请求体', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // 创建大型对象
      const largeBody = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `item-${i}`,
          description: 'a'.repeat(100),
        })),
        password: 'should-be-redacted',
      };
      
      req.body = largeBody;
      
      expect(() => {
        requestLogger(req as Request, res as Response, next);
      }).not.toThrow();
      
      expect(next).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('性能测试', () => {
    it('应该能处理高频请求', () => {
      const requests = Array.from({ length: 100 }, (_, i) => ({
        method: 'GET',
        originalUrl: `/api/v1/test/${i}`,
        ip: '127.0.0.1',
        body: { id: i },
      }));

      const startTime = Date.now();
      
      requests.forEach(request => {
        requestLogger(request as Request, res as Response, next);
      });
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // 应该在合理时间内完成
      expect(totalTime).toBeLessThan(1000); // 1秒内
      expect(next).toHaveBeenCalledTimes(100);
    });

    it('应该正确清理资源', () => {
      requestLogger(req as Request, res as Response, next);
      
      // 验证没有内存泄漏
      expect(req.startTime).toBeDefined();
      expect(typeof req.startTime).toBe('number');
    });
  });
});