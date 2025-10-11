import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import {
  validate,
  validateQuery,
  validateParams,
  commonValidations,
} from '../../../src/middleware/validation.middleware.js';
import { AppError, ErrorCodes } from '../../../src/middleware/error.middleware.js';

describe('Validation Middleware Enhanced Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    mockNext = vi.fn();
  });

  describe('validate - 请求体验证', () => {
    const userSchema = Joi.object({
      name: commonValidations.name.required(),
      email: commonValidations.email.required(),
      phone: commonValidations.phone.optional(),
      userType: commonValidations.userType.required(),
    });

    it('应该通过有效数据验证', () => {
      mockReq.body = {
        name: '张三',
        email: 'zhangsan@example.com',
        phone: '13800138000',
        userType: 'employee',
      };

      const middleware = validate(userSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body).toEqual({
        name: '张三',
        email: 'zhangsan@example.com',
        phone: '13800138000',
        userType: 'employee',
      });
    });

    it('应该移除未知字段', () => {
      mockReq.body = {
        name: '张三',
        email: 'zhangsan@example.com',
        userType: 'employee',
        unknownField: 'should be removed',
        anotherUnknown: 123,
      };

      const middleware = validate(userSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body).not.toHaveProperty('unknownField');
      expect(mockReq.body).not.toHaveProperty('anotherUnknown');
    });

    it('应该拒绝缺少必填字段的数据', () => {
      mockReq.body = {
        name: '张三',
        // 缺少email和userType
      };

      const middleware = validate(userSchema);

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(AppError);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该拒绝格式错误的数据', () => {
      mockReq.body = {
        name: '', // 空名称
        email: 'invalid-email', // 无效邮箱
        phone: '123', // 无效手机号
        userType: 'invalid_type', // 无效用户类型
      };

      const middleware = validate(userSchema);

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(AppError);
    });

    it('应该返回所有验证错误（abortEarly: false）', () => {
      mockReq.body = {
        name: '',
        email: 'invalid-email',
        userType: 'invalid_type',
      };

      const middleware = validate(userSchema);

      try {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe(ErrorCodes.VALIDATION_ERROR);
        expect((error as AppError).details).toHaveLength(3); // 三个验证错误
      }
    });

    it('应该处理嵌套对象验证', () => {
      const nestedSchema = Joi.object({
        user: Joi.object({
          name: commonValidations.name.required(),
          email: commonValidations.email.required(),
        }).required(),
        settings: Joi.object({
          theme: Joi.string().valid('light', 'dark').default('light'),
          notifications: Joi.boolean().default(true),
        }).optional(),
      });

      mockReq.body = {
        user: {
          name: '李四',
          email: 'lisi@example.com',
        },
        settings: {
          theme: 'dark',
          notifications: false,
        },
      };

      const middleware = validate(nestedSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body.user.name).toBe('李四');
      expect(mockReq.body.settings.theme).toBe('dark');
    });

    it('应该处理数组验证', () => {
      const arraySchema = Joi.object({
        users: Joi.array().items(
          Joi.object({
            name: commonValidations.name.required(),
            email: commonValidations.email.required(),
          })
        ).min(1).max(10).required(),
      });

      mockReq.body = {
        users: [
          { name: '用户1', email: 'user1@example.com' },
          { name: '用户2', email: 'user2@example.com' },
        ],
      };

      const middleware = validate(arraySchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body.users).toHaveLength(2);
    });

    it('应该拒绝超出数组长度限制的数据', () => {
      const arraySchema = Joi.object({
        tags: Joi.array().items(Joi.string()).max(3).required(),
      });

      mockReq.body = {
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'], // 超过最大长度3
      };

      const middleware = validate(arraySchema);

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(AppError);
    });
  });

  describe('validateQuery - 查询参数验证', () => {
    const querySchema = Joi.object({
      page: commonValidations.pagination.page,
      limit: commonValidations.pagination.limit,
      sortBy: commonValidations.pagination.sortBy,
      sortOrder: commonValidations.pagination.sortOrder,
      search: Joi.string().optional().allow(''),
      status: commonValidations.status.optional(),
    });

    it('应该验证有效的查询参数', () => {
      mockReq.query = {
        page: '2',
        limit: '10',
        sortBy: 'name',
        sortOrder: 'asc',
        search: '测试',
        status: 'active',
      };

      const middleware = validateQuery(querySchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.query.page).toBe(2); // 应该转换为数字
      expect(mockReq.query.limit).toBe(10);
    });

    it('应该使用默认值', () => {
      mockReq.query = {}; // 空查询参数

      const middleware = validateQuery(querySchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.query.page).toBe(1); // 默认值
      expect(mockReq.query.limit).toBe(20); // 默认值
      expect(mockReq.query.sortOrder).toBe('desc'); // 默认值
    });

    it('应该拒绝无效的查询参数', () => {
      mockReq.query = {
        page: '0', // 页码必须大于0
        limit: '101', // 超过最大限制100
        sortOrder: 'invalid', // 无效的排序方向
      };

      const middleware = validateQuery(querySchema);

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(AppError);
    });

    it('应该处理空字符串查询参数', () => {
      mockReq.query = {
        search: '', // 空搜索字符串应该被允许
        status: '', // 空状态应该被移除或处理
      };

      const middleware = validateQuery(querySchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.query.search).toBe('');
    });
  });

  describe('validateParams - 路径参数验证', () => {
    const paramsSchema = Joi.object({
      id: commonValidations.id,
      merchantId: commonValidations.id.optional(),
      code: commonValidations.code.optional(),
    });

    it('应该验证有效的路径参数', () => {
      mockReq.params = {
        id: '123',
        merchantId: '456',
        code: 'MERCHANT_001',
      };

      const middleware = validateParams(paramsSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.params.id).toBe(123); // 转换为数字
      expect(mockReq.params.merchantId).toBe(456);
      expect(mockReq.params.code).toBe('MERCHANT_001');
    });

    it('应该拒绝无效的ID参数', () => {
      mockReq.params = {
        id: 'invalid-id', // 非数字ID
      };

      const middleware = validateParams(paramsSchema);

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(AppError);
    });

    it('应该拒绝负数ID', () => {
      mockReq.params = {
        id: '-1', // 负数ID
      };

      const middleware = validateParams(paramsSchema);

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(AppError);
    });

    it('应该拒绝无效的编码格式', () => {
      mockReq.params = {
        id: '1',
        code: 'invalid-code-format', // 包含小写字母和连字符
      };

      const middleware = validateParams(paramsSchema);

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(AppError);
    });
  });

  describe('commonValidations - 通用验证规则', () => {
    describe('手机号验证', () => {
      it('应该接受有效的手机号', () => {
        const validPhones = [
          '13800138000',
          '15912345678',
          '18888888888',
          '19999999999',
        ];

        validPhones.forEach(phone => {
          const { error } = commonValidations.phone.validate(phone);
          expect(error).toBeUndefined();
        });
      });

      it('应该拒绝无效的手机号', () => {
        const invalidPhones = [
          '12800138000', // 不是1开头的有效号段
          '1380013800', // 长度不够
          '138001380001', // 长度过长
          '1380013800a', // 包含字母
          '+8613800138000', // 包含国际区号
        ];

        invalidPhones.forEach(phone => {
          const { error } = commonValidations.phone.validate(phone);
          expect(error).toBeDefined();
        });
      });
    });

    describe('邮箱验证', () => {
      it('应该接受有效的邮箱', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'user+tag@example.org',
          'user123@test-domain.com',
        ];

        validEmails.forEach(email => {
          const { error } = commonValidations.email.validate(email);
          expect(error).toBeUndefined();
        });
      });

      it('应该拒绝无效的邮箱', () => {
        const invalidEmails = [
          'invalid-email',
          '@example.com',
          'user@',
          'user@.com',
          'user..name@example.com',
        ];

        invalidEmails.forEach(email => {
          const { error } = commonValidations.email.validate(email);
          expect(error).toBeDefined();
        });
      });
    });

    describe('编码验证', () => {
      it('应该接受有效的编码', () => {
        const validCodes = [
          'USER_001',
          'MERCHANT_ABC',
          'TEST123',
          'A1',
        ];

        validCodes.forEach(code => {
          const { error } = commonValidations.code.validate(code);
          expect(error).toBeUndefined();
        });
      });

      it('应该拒绝无效的编码', () => {
        const invalidCodes = [
          'user-001', // 包含小写字母和连字符
          'USER 001', // 包含空格
          'A', // 长度太短
          'A'.repeat(21), // 长度太长
          '123abc', // 包含小写字母
        ];

        invalidCodes.forEach(code => {
          const { error } = commonValidations.code.validate(code);
          expect(error).toBeDefined();
        });
      });
    });

    describe('用户类型验证', () => {
      it('应该接受有效的用户类型', () => {
        const validTypes = [
          'tenant_admin',
          'merchant_admin',
          'employee',
          'visitor',
        ];

        validTypes.forEach(type => {
          const { error } = commonValidations.userType.validate(type);
          expect(error).toBeUndefined();
        });
      });

      it('应该拒绝无效的用户类型', () => {
        const invalidTypes = [
          'admin',
          'user',
          'guest',
          'super_admin',
          '',
        ];

        invalidTypes.forEach(type => {
          const { error } = commonValidations.userType.validate(type);
          expect(error).toBeDefined();
        });
      });
    });

    describe('分页验证', () => {
      it('应该验证分页参数', () => {
        const paginationSchema = Joi.object(commonValidations.pagination);

        const validPagination = {
          page: 1,
          limit: 20,
          sortBy: 'created_at',
          sortOrder: 'desc',
        };

        const { error, value } = paginationSchema.validate(validPagination);
        expect(error).toBeUndefined();
        expect(value).toEqual(validPagination);
      });

      it('应该使用默认分页值', () => {
        const paginationSchema = Joi.object(commonValidations.pagination);

        const { error, value } = paginationSchema.validate({});
        expect(error).toBeUndefined();
        expect(value.page).toBe(1);
        expect(value.limit).toBe(20);
        expect(value.sortOrder).toBe('desc');
      });

      it('应该拒绝无效的分页参数', () => {
        const paginationSchema = Joi.object(commonValidations.pagination);

        const invalidPagination = {
          page: 0, // 页码必须大于0
          limit: 101, // 超过最大限制
          sortOrder: 'invalid', // 无效排序方向
        };

        const { error } = paginationSchema.validate(invalidPagination);
        expect(error).toBeDefined();
      });
    });
  });

  describe('错误处理和边界情况', () => {
    it('应该处理null和undefined值', () => {
      const schema = Joi.object({
        name: Joi.string().optional().allow(null),
        age: Joi.number().optional(),
      });

      mockReq.body = {
        name: null,
        age: undefined,
      };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body.name).toBeNull();
      expect(mockReq.body).not.toHaveProperty('age'); // undefined值被移除
    });

    it('应该处理空对象', () => {
      const schema = Joi.object({
        name: Joi.string().optional(),
        email: Joi.string().optional(),
      });

      mockReq.body = {};

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body).toEqual({});
    });

    it('应该处理复杂的验证错误信息', () => {
      const schema = Joi.object({
        password: Joi.string()
          .min(8)
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
          .required()
          .messages({
            'string.min': '密码长度至少8位',
            'string.pattern.base': '密码必须包含大小写字母、数字和特殊字符',
            'any.required': '密码是必填项',
          }),
      });

      mockReq.body = {
        password: '123', // 不符合复杂度要求
      };

      const middleware = validate(schema);

      try {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).details).toBeDefined();
        expect((error as AppError).details[0].message).toContain('密码');
      }
    });

    it('应该处理深层嵌套验证错误', () => {
      const schema = Joi.object({
        user: Joi.object({
          profile: Joi.object({
            address: Joi.object({
              street: Joi.string().required(),
              city: Joi.string().required(),
            }).required(),
          }).required(),
        }).required(),
      });

      mockReq.body = {
        user: {
          profile: {
            address: {
              street: '', // 空字符串
              // 缺少city
            },
          },
        },
      };

      const middleware = validate(schema);

      try {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).details).toHaveLength(2); // street和city两个错误
        expect((error as AppError).details[0].field).toContain('user.profile.address');
      }
    });
  });

  describe('性能和安全测试', () => {
    it('应该处理大量数据验证', () => {
      const schema = Joi.object({
        items: Joi.array().items(
          Joi.object({
            id: Joi.number().required(),
            name: Joi.string().required(),
          })
        ).max(1000),
      });

      // 创建大量测试数据
      const items = Array.from({ length: 500 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
      }));

      mockReq.body = { items };

      const middleware = validate(schema);
      const startTime = Date.now();
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('应该防止过深的嵌套对象', () => {
      // 创建深层嵌套的schema
      let nestedSchema = Joi.string();
      for (let i = 0; i < 10; i++) {
        nestedSchema = Joi.object({
          nested: nestedSchema,
        });
      }

      const schema = Joi.object({
        data: nestedSchema,
      });

      // 创建对应的深层嵌套数据
      let nestedData: any = 'deep value';
      for (let i = 0; i < 10; i++) {
        nestedData = { nested: nestedData };
      }

      mockReq.body = { data: nestedData };

      const middleware = validate(schema);
      
      // 应该能够处理深层嵌套而不崩溃
      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).not.toThrow();
    });

    it('应该处理特殊字符和Unicode', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        description: Joi.string().optional(),
      });

      mockReq.body = {
        name: '测试用户 🚀',
        description: 'Description with émojis 🌟 and spëcial chars',
      };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body.name).toBe('测试用户 🚀');
      expect(mockReq.body.description).toContain('émojis');
    });
  });
});