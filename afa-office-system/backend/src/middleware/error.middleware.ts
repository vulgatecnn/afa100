import { Request, Response, NextFunction } from 'express';
import type { ErrorResponse } from '../types/index.js';

/**
 * 自定义错误类
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: number | undefined;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(message: string, statusCode: number, code?: number, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 错误代码枚举
export const ErrorCodes = {
  // 认证错误 1000-1999
  INVALID_CREDENTIALS: 1001,
  TOKEN_EXPIRED: 1002,
  TOKEN_INVALID: 1003,
  INSUFFICIENT_PERMISSIONS: 1004,
  USER_NOT_FOUND: 1005,
  USER_ALREADY_EXISTS: 1006,
  ACCOUNT_DISABLED: 1007,

  // 业务逻辑错误 2000-2999
  MERCHANT_NOT_FOUND: 2001,
  MERCHANT_ALREADY_EXISTS: 2002,
  MERCHANT_CODE_EXISTS: 2003,
  MERCHANT_HAS_EMPLOYEES: 2004,
  EMPLOYEE_NOT_FOUND: 2005,
  EMPLOYEE_ALREADY_EXISTS: 2006,
  VISITOR_APPLICATION_NOT_FOUND: 2007,
  VISITOR_APPLICATION_EXPIRED: 2008,
  PASSCODE_INVALID: 2009,
  PASSCODE_EXPIRED: 2010,
  USAGE_LIMIT_EXCEEDED: 2011,
  PERMISSION_DENIED: 2012,
  PERMISSION_NOT_FOUND: 2013,
  PROJECT_NOT_FOUND: 2014,
  PROJECT_CODE_EXISTS: 2015,
  PROJECT_HAS_VENUES: 2016,
  VENUE_NOT_FOUND: 2017,
  VENUE_CODE_EXISTS: 2018,
  VENUE_HAS_FLOORS: 2019,
  FLOOR_NOT_FOUND: 2020,
  FLOOR_CODE_EXISTS: 2021,

  // 验证错误 3000-3999
  VALIDATION_ERROR: 3001,
  MISSING_REQUIRED_FIELD: 3002,
  INVALID_FORMAT: 3003,
  INVALID_FILE_TYPE: 3004,
  FILE_TOO_LARGE: 3005,

  // 系统错误 9000-9999
  DATABASE_ERROR: 9001,
  EXTERNAL_SERVICE_ERROR: 9002,
  INTERNAL_SERVER_ERROR: 9003,
  SERVICE_UNAVAILABLE: 9004,
} as const;

// 错误响应格式化
const formatErrorResponse = (err: AppError, req: Request): ErrorResponse => {
  const response: ErrorResponse = {
    success: false,
    message: err.message || '服务器内部错误',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  };

  // 添加错误代码
  if (err.code) {
    response.code = err.code;
  }

  // 添加验证详情
  if (err.details) {
    response.details = err.details;
  }

  // 开发环境添加堆栈跟踪
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  return response;
};

// 主要错误处理中间件
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error: AppError;
  
  // 如果已经是 AppError，直接使用
  if (err instanceof AppError) {
    error = err;
  } else {
    // 创建新的 AppError 并保留原始堆栈跟踪
    error = new AppError(err.message || '服务器内部错误', 500);
    error.stack = err.stack;
  }

  // 记录错误日志
  console.error('❌ Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // 处理特定类型的错误
  if (!(err instanceof AppError)) {
    // SQLite错误处理
    if (err.code === 'SQLITE_CONSTRAINT') {
      error = new AppError('数据约束违反', 400, ErrorCodes.VALIDATION_ERROR);
      error.stack = err.stack;
    }
    // JWT错误处理
    else if (err.name === 'JsonWebTokenError') {
      error = new AppError('无效的访问令牌', 401, ErrorCodes.TOKEN_INVALID);
      error.stack = err.stack;
    }
    else if (err.name === 'TokenExpiredError') {
      error = new AppError('访问令牌已过期', 401, ErrorCodes.TOKEN_EXPIRED);
      error.stack = err.stack;
    }
    // Joi验证错误
    else if (err.isJoi) {
      const message = err.details.map((detail: any) => detail.message).join(', ');
      error = new AppError(message, 400, ErrorCodes.VALIDATION_ERROR, err.details);
      error.stack = err.stack;
    }
    // Multer文件上传错误
    else if (err.code === 'LIMIT_FILE_SIZE') {
      error = new AppError('文件大小超出限制', 400, ErrorCodes.FILE_TOO_LARGE);
      error.stack = err.stack;
    }
    else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      error = new AppError('不支持的文件类型', 400, ErrorCodes.INVALID_FILE_TYPE);
      error.stack = err.stack;
    }
  }

  // 默认500服务器错误
  const statusCode = error.statusCode || 500;
  const response = formatErrorResponse(error, req);

  res.status(statusCode).json(response);
};

// 异步错误包装器
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};