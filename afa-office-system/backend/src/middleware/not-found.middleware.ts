import { Request, Response } from 'express';

/**
 * 404 Not Found 中间件
 */
export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `路由 ${req.originalUrl} 不存在`,
    code: 404,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  });
};