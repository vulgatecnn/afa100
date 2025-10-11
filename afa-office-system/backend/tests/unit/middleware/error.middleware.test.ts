import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler, AppError, ErrorCodes } from '../../../src/middleware/error.middleware.js';

describe('Error Middleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = {
            originalUrl: '/api/v1/test',
            method: 'GET',
            ip: '127.0.0.1',
            get: vi.fn((name: string) => {
                if (name === 'set-cookie') return ['test-cookie'] as string[];
                return 'test-user-agent' as string;
            }) as any,
        };

        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };

        next = vi.fn() as unknown as NextFunction;

        // 模拟console.error以避免测试中的噪音
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    describe('AppError', () => {
        it('应该创建具有正确属性的AppError', () => {
            const error = new AppError('测试错误', 400, ErrorCodes.VALIDATION_ERROR);

            expect(error.message).toBe('测试错误');
            expect(error.statusCode).toBe(400);
            expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
            expect(error.isOperational).toBe(true);
        });

        it('应该创建带有详情的AppError', () => {
            const details = { field: 'name', message: '必填字段' };
            const error = new AppError('验证错误', 400, ErrorCodes.VALIDATION_ERROR, details);

            expect(error.details).toEqual(details);
        });
    });

    describe('errorHandler', () => {
        it('应该正确处理AppError', () => {
            const error = new AppError('测试错误', 400, ErrorCodes.VALIDATION_ERROR);

            errorHandler(error, req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: '测试错误',
                    code: ErrorCodes.VALIDATION_ERROR,
                    timestamp: expect.any(String),
                    path: '/api/v1/test',
                    method: 'GET',
                })
            );
        });

        it('应该处理JWT错误', () => {
            const error = new Error('Invalid token');
            error.name = 'JsonWebTokenError';

            errorHandler(error, req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: '无效的访问令牌',
                    code: ErrorCodes.TOKEN_INVALID,
                })
            );
        });

        it('应该处理令牌过期错误', () => {
            const error = new Error('Token expired');
            error.name = 'TokenExpiredError';

            errorHandler(error, req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: '访问令牌已过期',
                    code: ErrorCodes.TOKEN_EXPIRED,
                })
            );
        });

        it('应该处理Joi验证错误', () => {
            const error = {
                isJoi: true,
                details: [
                    { message: '姓名是必填的' },
                    { message: '邮箱必须有效' },
                ],
            };

            errorHandler(error, req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: '姓名是必填的, 邮箱必须有效',
                    code: ErrorCodes.VALIDATION_ERROR,
                    details: error.details,
                })
            );
        });

        it('应该处理SQLite约束错误', () => {
            const error = new Error('UNIQUE constraint failed');
            (error as any).code = 'SQLITE_CONSTRAINT';

            errorHandler(error, req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: '数据约束违反',
                    code: ErrorCodes.VALIDATION_ERROR,
                })
            );
        });

        it('应该处理文件上传错误', () => {
            const error = new Error('File too large');
            (error as any).code = 'LIMIT_FILE_SIZE';

            errorHandler(error, req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: '文件大小超出限制',
                    code: ErrorCodes.FILE_TOO_LARGE,
                })
            );
        });

        it('应该处理未知错误并返回500状态', () => {
            const error = new Error('Unknown error');

            errorHandler(error, req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Unknown error',
                })
            );
        });

        it('应该在开发模式下包含堆栈跟踪', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const error = new AppError('测试错误', 400);

            errorHandler(error, req as Request, res as Response, next);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    stack: expect.any(String),
                })
            );

            process.env.NODE_ENV = originalEnv;
        });

        it('应该在生产模式下不包含堆栈跟踪', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            const error = new AppError('测试错误', 400);

            errorHandler(error, req as Request, res as Response, next);

            expect(res.json).toHaveBeenCalledWith(
                expect.not.objectContaining({
                    stack: expect.any(String),
                })
            );

            process.env.NODE_ENV = originalEnv;
        });
    });
});