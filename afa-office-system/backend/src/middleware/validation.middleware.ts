import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError, ErrorCodes } from './error.middleware.js';

/**
 * 验证中间件工厂函数
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // 返回所有验证错误
      stripUnknown: true, // 移除未知字段
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      throw new AppError(
        '请求数据验证失败',
        400,
        ErrorCodes.VALIDATION_ERROR,
        details
      );
    }

    // 将验证后的数据替换原始请求体
    req.body = value;
    next();
  };
};

/**
 * 查询参数验证中间件
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      throw new AppError(
        '查询参数验证失败',
        400,
        ErrorCodes.VALIDATION_ERROR,
        details
      );
    }

    req.query = value;
    next();
  };
};

/**
 * 路径参数验证中间件
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      throw new AppError(
        '路径参数验证失败',
        400,
        ErrorCodes.VALIDATION_ERROR,
        details
      );
    }

    req.params = value;
    next();
  };
};

// 常用验证规则
export const commonValidations = {
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID必须是数字',
    'number.integer': 'ID必须是整数',
    'number.positive': 'ID必须是正数',
    'any.required': 'ID是必填项',
  }),

  phone: Joi.string().pattern(/^1[3-9]\d{9}$/).messages({
    'string.pattern.base': '请输入有效的手机号码',
  }),

  email: Joi.string().email().messages({
    'string.email': '请输入有效的邮箱地址',
  }),

  name: Joi.string().min(1).max(50).trim().messages({
    'string.min': '姓名不能为空',
    'string.max': '姓名长度不能超过50个字符',
  }),

  code: Joi.string().pattern(/^[A-Z0-9_]+$/).min(2).max(20).messages({
    'string.pattern.base': '编码只能包含大写字母、数字和下划线',
    'string.min': '编码长度至少2个字符',
    'string.max': '编码长度不能超过20个字符',
  }),

  status: Joi.string().valid('active', 'inactive').messages({
    'any.only': '状态只能是 active 或 inactive',
  }),

  userType: Joi.string().valid('tenant_admin', 'merchant_admin', 'employee', 'visitor').messages({
    'any.only': '用户类型无效',
  }),

  pagination: {
    page: Joi.number().integer().min(1).default(1).messages({
      'number.min': '页码必须大于0',
    }),
    limit: Joi.number().integer().min(1).max(100).default(20).messages({
      'number.min': '每页数量必须大于0',
      'number.max': '每页数量不能超过100',
    }),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
      'any.only': '排序方向只能是 asc 或 desc',
    }),
  },
};