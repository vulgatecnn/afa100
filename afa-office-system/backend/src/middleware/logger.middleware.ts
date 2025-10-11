import { Request, Response, NextFunction } from 'express';

// 扩展Request接口以包含startTime
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
    }
  }
}

/**
 * 请求日志中间件
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  req.startTime = start;
  
  // 记录请求日志
  console.log(`📥 ${req.method} ${req.originalUrl} - ${req.ip}`);
  
  // 开发环境记录请求体（排除敏感数据）
  if (process.env.NODE_ENV === 'development' && req.body) {
    const sanitizedBody = { ...req.body };
    
    // 移除敏感字段
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    sensitiveFields.forEach(field => {
      if (sanitizedBody[field]) {
        sanitizedBody[field] = '[REDACTED]';
      }
    });
    
    console.log('📄 Request Body:', JSON.stringify(sanitizedBody, null, 2));
  }

  // 重写res.json以记录响应
  const originalJson = res.json;
  res.json = function(data: any) {
    const duration = Date.now() - start;
    
    // 记录响应日志
    console.log(`📤 ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    
    // 开发环境记录响应体（排除敏感数据）
    if (process.env.NODE_ENV === 'development' && data) {
      const sanitizedData = { ...data };
      
      // 移除响应中的敏感字段
      if (sanitizedData.data && sanitizedData.data.token) {
        sanitizedData.data.token = '[REDACTED]';
      }
      
      console.log('📄 Response Body:', JSON.stringify(sanitizedData, null, 2));
    }
    
    return originalJson.call(this, data);
  };

  next();
};

/**
 * API响应日志记录器
 */
export const logApiResponse = (req: Request, _res: Response, data: any, statusCode = 200): void => {
  const duration = req.startTime ? Date.now() - req.startTime : 0;
  
  console.log(`📤 ${req.method} ${req.originalUrl} - ${statusCode} - ${duration}ms`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('📄 Response:', JSON.stringify(data, null, 2));
  }
};