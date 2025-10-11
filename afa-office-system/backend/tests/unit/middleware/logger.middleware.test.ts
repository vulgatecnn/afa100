import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requestLogger } from '../../../src/middleware/logger.middleware.js';

describe('Logger Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      method: 'GET',
      originalUrl: '/api/v1/test',
      ip: '127.0.0.1',
      body: { test: 'data' },
    };
    
    res = {
      json: vi.fn(),
    };
    
    next = vi.fn() as unknown as NextFunction;
    
    // 模拟console.log以捕获日志
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('requestLogger', () => {
    it('应该记录传入的请求', () => {
      requestLogger(req as Request, res as Response, next);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('📥 GET /api/v1/test - 127.0.0.1')
      );
      expect(next).toHaveBeenCalled();
    });

    it('应该在开发模式下记录请求体', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      requestLogger(req as Request, res as Response, next);
      
      expect(console.log).toHaveBeenCalledWith(
        '📄 Request Body:',
        expect.any(String)
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('应该从请求体中删除敏感字段', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      req.body = {
        username: 'test',
        password: 'secret123',
        token: 'jwt-token',
        normalField: 'value',
      };
      
      requestLogger(req as Request, res as Response, next);
      
      // 应该记录请求但删除敏感字段
      expect(console.log).toHaveBeenCalledWith(
        '📄 Request Body:',
        expect.stringContaining('[REDACTED]')
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('应该重写res.json以记录响应', () => {
      const originalJson = res.json;
      const testData = { success: true, data: 'test' };
      
      requestLogger(req as Request, res as Response, next);
      
      // 验证res.json已被重写
      expect(res.json).not.toBe(originalJson);
      
      // 调用重写的json方法
      (res.json as any)(testData);
      
      // 应该记录响应
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('📤 GET /api/v1/test')
      );
    });

    it('应该从响应中删除敏感字段', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const testData = {
        success: true,
        data: {
          user: 'test',
          token: 'jwt-token',
        },
      };
      
      requestLogger(req as Request, res as Response, next);
      (res.json as any)(testData);
      
      // 应该记录删除令牌的响应
      expect(console.log).toHaveBeenCalledWith(
        '📄 Response Body:',
        expect.stringContaining('[REDACTED]')
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('应该在非开发模式下不记录请求体', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      requestLogger(req as Request, res as Response, next);
      
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('📄 Request Body:')
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('应该处理没有请求体的请求', () => {
      req.body = undefined;
      
      expect(() => {
        requestLogger(req as Request, res as Response, next);
      }).not.toThrow();
      
      expect(next).toHaveBeenCalled();
    });

    it('应该测量响应时间', async () => {
      req.startTime = Date.now();
      res.statusCode = 200; // 设置状态码
      
      requestLogger(req as Request, res as Response, next);
      
      // 模拟一些处理时间
      await new Promise(resolve => setTimeout(resolve, 10));
      (res.json as any)({ success: true });
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/📤 GET \/api\/v1\/test - 200 - \d+ms/)
      );
    });

    it('应该设置请求开始时间', () => {
      requestLogger(req as Request, res as Response, next);
      
      expect(req.startTime).toBeDefined();
      expect(typeof req.startTime).toBe('number');
    });
  });
});