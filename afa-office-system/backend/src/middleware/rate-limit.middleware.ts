import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from './error.middleware.js';

// 速率限制存储接口
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// 内存存储（生产环境建议使用Redis）
const store: RateLimitStore = {};

// 清理过期记录的定时器
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key] && store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 60000); // 每分钟清理一次

/**
 * 速率限制中间件配置
 */
interface RateLimitOptions {
  windowMs: number; // 时间窗口（毫秒）
  max: number; // 最大请求次数
  message?: string; // 自定义错误消息
  keyGenerator?: (req: Request) => string; // 自定义键生成器
  skipSuccessfulRequests?: boolean; // 是否跳过成功请求
  skipFailedRequests?: boolean; // 是否跳过失败请求
}

/**
 * 创建速率限制中间件
 */
export const createRateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = '请求过于频繁，请稍后再试',
    keyGenerator = (req: Request) => req.ip || 'unknown',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    const resetTime = now + windowMs;

    // 获取或创建记录
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime,
      };
    }

    const record = store[key];

    // 检查是否超过限制
    if (record.count >= max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      
      res.set({
        'X-RateLimit-Limit': max.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
        'Retry-After': retryAfter.toString(),
      });

      throw new AppError(message, 429, ErrorCodes.SERVICE_UNAVAILABLE);
    }

    // 增加计数
    record.count++;

    // 设置响应头
    res.set({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Remaining': (max - record.count).toString(),
      'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
    });

    // 监听响应完成事件
    if (skipSuccessfulRequests || skipFailedRequests) {
      res.on('finish', () => {
        const shouldSkip = 
          (skipSuccessfulRequests && res.statusCode < 400) ||
          (skipFailedRequests && res.statusCode >= 400);

        if (shouldSkip && record.count > 0) {
          record.count--;
        }
      });
    }

    next();
  };
};

// 预定义的速率限制配置
export const rateLimits = {
  // 通用API限制：每分钟100次请求
  general: createRateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 100,
    message: '请求过于频繁，请稍后再试',
  }),

  // 登录限制：每15分钟5次尝试
  login: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 5,
    message: '登录尝试过于频繁，请15分钟后再试',
    keyGenerator: (req: Request) => `login:${req.ip}:${req.body.phone || req.body.openId || 'unknown'}`,
    skipSuccessfulRequests: true,
  }),

  // 短信验证码限制：每分钟1次
  sms: createRateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 1,
    message: '验证码发送过于频繁，请1分钟后再试',
    keyGenerator: (req: Request) => `sms:${req.body.phone || req.ip}`,
  }),

  // 文件上传限制：每分钟10次
  upload: createRateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 10,
    message: '文件上传过于频繁，请稍后再试',
  }),

  // 通行码验证限制：每秒10次
  passcodeValidation: createRateLimit({
    windowMs: 1000, // 1秒
    max: 10,
    message: '通行码验证请求过于频繁',
    keyGenerator: (req: Request) => `passcode:${req.ip}`,
  }),

  // 访客申请限制：每小时5次
  visitorApplication: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1小时
    max: 5,
    message: '访客申请过于频繁，请1小时后再试',
    keyGenerator: (req: Request) => `visitor:${req.user?.userId || req.ip}`,
  }),
};