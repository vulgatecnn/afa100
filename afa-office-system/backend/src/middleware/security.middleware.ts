import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from './error.middleware.js';

/**
 * 安全头中间件 - 添加额外的安全响应头
 */
export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  // 防止点击劫持
  res.setHeader('X-Frame-Options', 'DENY');
  
  // 防止MIME类型嗅探
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS保护
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // 引用者策略
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // 权限策略
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
};

/**
 * IP白名单中间件工厂
 */
export const createIPWhitelist = (allowedIPs: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    // 开发环境跳过IP检查
    if (process.env['NODE_ENV'] === 'development') {
      return next();
    }
    
    if (!allowedIPs.includes(clientIP)) {
      throw new AppError('IP地址不在白名单中', 403, ErrorCodes.PERMISSION_DENIED);
    }
    
    next();
  };
};

/**
 * 请求大小限制中间件
 */
export const requestSizeLimit = (maxSize: string = '10mb') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const contentLength = req.get('content-length');
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        throw new AppError('请求体过大', 413, ErrorCodes.FILE_TOO_LARGE);
      }
    }
    
    next();
  };
};

/**
 * 解析大小字符串为字节数
 */
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)?$/);
  if (!match || !match[1]) {
    throw new Error('无效的大小格式');
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  const multiplier = units[unit];
  
  if (multiplier === undefined) {
    throw new Error('无效的单位');
  }
  
  return Math.floor(value * multiplier);
}

/**
 * 用户代理验证中间件 - 防止恶意爬虫
 */
export const validateUserAgent = (req: Request, _res: Response, next: NextFunction): void => {
  const userAgent = req.get('User-Agent');
  
  if (!userAgent) {
    throw new AppError('缺少User-Agent头', 400, ErrorCodes.VALIDATION_ERROR);
  }
  
  // 检查是否为已知的恶意用户代理
  const maliciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
  ];
  
  // 白名单：允许的用户代理模式
  const allowedPatterns = [
    /Mozilla/i, // 浏览器
    /MicroMessenger/i, // 微信
    /PostmanRuntime/i, // Postman (开发环境)
  ];
  
  // 开发环境跳过检查
  if (process.env['NODE_ENV'] === 'development') {
    return next();
  }
  
  const isAllowed = allowedPatterns.some(pattern => pattern['test'](userAgent));
  const isMalicious = maliciousPatterns.some(pattern => pattern['test'](userAgent));
  
  if (isMalicious && !isAllowed) {
    throw new AppError('不允许的用户代理', 403, ErrorCodes.PERMISSION_DENIED);
  }
  
  next();
};

/**
 * API密钥验证中间件 - 用于硬件设备接入
 */
export const validateApiKey = (req: Request, _res: Response, next: NextFunction): void => {
  const apiKey = req.get('X-API-Key') || req.query['apiKey'] as string;
  
  if (!apiKey) {
    throw new AppError('缺少API密钥', 401, ErrorCodes.TOKEN_INVALID);
  }
  
  // 从环境变量或数据库验证API密钥
  const validApiKeys = process.env['VALID_API_KEYS']?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    throw new AppError('无效的API密钥', 401, ErrorCodes.TOKEN_INVALID);
  }
  
  next();
};

/**
 * 请求频率监控中间件 - 记录异常请求模式
 */
export const requestMonitor = (req: Request, _res: Response, next: NextFunction): void => {
  const clientIP = req.ip || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  const timestamp = new Date().toISOString();
  
  // 记录可疑请求
  const suspiciousPatterns = [
    /\.\./,  // 路径遍历
    /<script/i,  // XSS尝试
    /union.*select/i,  // SQL注入尝试
    /exec\(/i,  // 代码执行尝试
  ];
  
  const url = req.originalUrl;
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern['test'](url) || pattern['test'](JSON.stringify(req.body))
  );
  
  if (isSuspicious) {
    console.warn('🚨 检测到可疑请求:', {
      ip: clientIP,
      userAgent,
      url,
      method: req.method,
      body: req.body,
      timestamp,
    });
    
    // 在生产环境中，这里可以发送告警或记录到安全日志
  }
  
  next();
};

/**
 * CORS预检请求处理
 */
export const handlePreflight = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
};