/**
 * 数据验证工具类
 * 提供通用的数据验证功能
 */

import Joi from 'joi';

export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code?: string;
}

export interface ValidatorConfig {
  abortEarly: boolean;
  stripUnknown: boolean;
  allowUnknown: boolean;
  convert: boolean;
}

/**
 * 验证器类
 */
export class Validator {
  private config: ValidatorConfig;

  constructor(config: Partial<ValidatorConfig> = {}) {
    this.config = {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
      convert: true,
      ...config
    };
  }

  /**
   * 验证数据
   */
  validate<T = any>(data: any, schema: Joi.ObjectSchema): ValidationResult<T> {
    const { error, value } = schema.validate(data, this.config);

    if (error) {
      const errors: ValidationError[] = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
        code: detail.type
      }));

      return {
        isValid: false,
        errors
      };
    }

    return {
      isValid: true,
      data: value
    };
  }

  /**
   * 验证并抛出错误
   */
  validateOrThrow<T = any>(data: any, schema: Joi.ObjectSchema): T {
    const result = this.validate<T>(data, schema);
    
    if (!result.isValid) {
      const errorMessage = result.errors?.map(err => err.message).join(', ') || '验证失败';
      throw new Error(errorMessage);
    }

    return result.data!;
  }

  /**
   * 批量验证
   */
  validateBatch(items: Array<{ data: any; schema: Joi.ObjectSchema; name?: string }>): ValidationResult[] {
    return items.map((item, index) => {
      const result = this.validate(item.data, item.schema);
      return {
        ...result,
        name: item.name || `item_${index}`
      } as ValidationResult & { name: string };
    });
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<ValidatorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  getConfig(): ValidatorConfig {
    return { ...this.config };
  }
}

// 常用验证规则
export const ValidationRules = {
  // 基础类型
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID必须是数字',
    'number.integer': 'ID必须是整数',
    'number.positive': 'ID必须是正数',
    'any.required': 'ID是必填项'
  }),

  optionalId: Joi.number().integer().positive().optional().messages({
    'number.base': 'ID必须是数字',
    'number.integer': 'ID必须是整数',
    'number.positive': 'ID必须是正数'
  }),

  // 字符串
  name: Joi.string().min(1).max(50).trim().required().messages({
    'string.min': '名称不能为空',
    'string.max': '名称长度不能超过50个字符',
    'any.required': '名称是必填项'
  }),

  optionalName: Joi.string().min(1).max(50).trim().optional().messages({
    'string.min': '名称不能为空',
    'string.max': '名称长度不能超过50个字符'
  }),

  code: Joi.string().pattern(/^[A-Z0-9_]+$/).min(2).max(20).required().messages({
    'string.pattern.base': '编码只能包含大写字母、数字和下划线',
    'string.min': '编码长度至少2个字符',
    'string.max': '编码长度不能超过20个字符',
    'any.required': '编码是必填项'
  }),

  // 联系方式
  phone: Joi.string().pattern(/^1[3-9]\d{9}$/).messages({
    'string.pattern.base': '请输入有效的手机号码'
  }),

  email: Joi.string().email().messages({
    'string.email': '请输入有效的邮箱地址'
  }),

  // 状态
  status: Joi.string().valid('active', 'inactive').messages({
    'any.only': '状态只能是 active 或 inactive'
  }),

  userType: Joi.string().valid('tenant_admin', 'merchant_admin', 'employee', 'visitor').messages({
    'any.only': '用户类型无效'
  }),

  // 分页
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.min': '页码必须大于0'
    }),
    limit: Joi.number().integer().min(1).max(100).default(20).messages({
      'number.min': '每页数量必须大于0',
      'number.max': '每页数量不能超过100'
    }),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
      'any.only': '排序方向只能是 asc 或 desc'
    })
  }),

  // 时间
  datetime: Joi.date().iso().messages({
    'date.format': '时间格式必须是ISO 8601格式'
  }),

  // 文件
  file: Joi.object({
    fieldname: Joi.string().required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string().required(),
    size: Joi.number().positive().required(),
    destination: Joi.string().required(),
    filename: Joi.string().required(),
    path: Joi.string().required()
  })
};

// 创建默认验证器实例
const defaultValidator = new Validator();

// 导出便捷方法
export const validator = {
  validate: <T = any>(data: any, schema: Joi.ObjectSchema): ValidationResult<T> => 
    defaultValidator.validate<T>(data, schema),
  
  validateOrThrow: <T = any>(data: any, schema: Joi.ObjectSchema): T => 
    defaultValidator.validateOrThrow<T>(data, schema),
  
  validateBatch: (items: Array<{ data: any; schema: Joi.ObjectSchema; name?: string }>) => 
    defaultValidator.validateBatch(items),
  
  setConfig: (config: Partial<ValidatorConfig>) => 
    defaultValidator.setConfig(config),
  
  getConfig: () => 
    defaultValidator.getConfig()
};

// 导出类型
export type ValidatorInstance = typeof validator;