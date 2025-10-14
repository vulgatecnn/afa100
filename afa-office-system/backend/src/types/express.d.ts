/**
 * Express 类型扩展定义
 * 解决 Express 相关的类型问题
 */

import type { Request, Response, NextFunction, Application, Router } from 'express';
import type { UserContext, User } from './index.js';

// 扩展 Express Request 接口以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
      userDetails?: User;
      // 添加其他可能的扩展字段
      requestId?: string;
      startTime?: number;
      clientIp?: string;
      userAgent?: string;
      // 文件上传相关
      file?: Express.Multer.File;
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
      // 会话相关
      session?: any;
      // 自定义验证数据
      validatedData?: any;
      // 分页参数
      pagination?: {
        page: number;
        limit: number;
        offset: number;
      };
    }

    interface Response {
      // 添加自定义响应方法
      success<T = any>(data: T, message?: string): Response;
      error(message: string, code?: number, details?: any): Response;
      paginated<T = any>(data: T[], total: number, page: number, limit: number): Response;
    }

    // Multer 文件类型扩展
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
  }
}

// 中间件类型定义
export type ExpressMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

export type AuthenticatedMiddleware = (
  req: Request & { user: UserContext; userDetails: User },
  res: Response,
  next: NextFunction
) => void | Promise<void>;

export type ErrorMiddleware = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

// 控制器类型定义
export type ControllerHandler<
  TReq extends Request = Request,
  TRes extends Response = Response
> = (req: TReq, res: TRes, next: NextFunction) => void | Promise<void>;

export type AuthenticatedController = ControllerHandler<
  Request & { user: UserContext; userDetails: User },
  Response
>;

// 路由处理器类型
export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  path: string;
  handler: ControllerHandler;
  middleware?: ExpressMiddleware[];
  auth?: boolean;
  permissions?: string[];
}

// Express 应用扩展类型
export interface ExtendedApplication extends Application {
  // 添加自定义方法
  setupMiddleware(): void;
  setupRoutes(): void;
  setupErrorHandling(): void;
  // 健康检查
  healthCheck(): Promise<{ status: string; timestamp: string }>;
}

// Express 路由扩展类型
export interface ExtendedRouter extends Router {
  // 添加认证路由方法
  authenticatedGet(path: string, ...handlers: AuthenticatedController[]): Router;
  authenticatedPost(path: string, ...handlers: AuthenticatedController[]): Router;
  authenticatedPut(path: string, ...handlers: AuthenticatedController[]): Router;
  authenticatedDelete(path: string, ...handlers: AuthenticatedController[]): Router;
  authenticatedPatch(path: string, ...handlers: AuthenticatedController[]): Router;
}

// 请求验证类型
export interface ValidatedRequest<T = any> extends Request {
  validatedData: T;
}

// 分页请求类型
export interface PaginatedRequest extends Request {
  pagination: {
    page: number;
    limit: number;
    offset: number;
  };
}

// 文件上传请求类型
export interface FileUploadRequest extends Request {
  file: Express.Multer.File;
}

export interface MultiFileUploadRequest extends Request {
  files: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

// 响应辅助类型
export interface ApiResponseData<T = any> {
  success: boolean;
  data?: T;
  message: string;
  code?: number;
  timestamp: string;
  path?: string;
  method?: string;
}

export interface PaginatedResponseData<T = any> extends ApiResponseData<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Express 配置类型
export interface ExpressConfig {
  port: number;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  bodyParser: {
    limit: string;
  };
  static: {
    path: string;
    options?: any;
  };
  security: {
    helmet: boolean;
    rateLimit?: {
      windowMs: number;
      max: number;
    };
  };
}

// 中间件配置类型
export interface MiddlewareConfig {
  auth: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  validation: {
    abortEarly: boolean;
    stripUnknown: boolean;
  };
  logging: {
    level: string;
    format: string;
  };
  upload: {
    destination: string;
    maxFileSize: number;
    allowedMimeTypes: string[];
  };
}

export {};