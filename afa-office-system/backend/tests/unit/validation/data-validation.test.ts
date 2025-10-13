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

describe('数据验证逻辑单元测试', () => {
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

  describe('用户输入验证规则', () => {
    describe('手机号验证', () => {
      it('应该接受有效的中国大陆手机号', () => {
        const validPhones = [
          '13800138000', // 移动
          '15912345678', // 移动
          '18888888888', // 移动
          '14700000000', // 移动
          '13000000000', // 联通
          '15500000000', // 联通
          '18600000000', // 联通
          '17700000000', // 联通
          '13300000000', // 电信
          '15300000000', // 电信
          '18900000000', // 电信
          '17300000000', // 电信
          '19900000000', // 虚拟运营商
        ];

        validPhones.forEach(phone => {
          const { error } = commonValidations.phone.validate(phone);
          expect(error, `手机号 ${phone} 应该有效`).toBeUndefined();
        });
      });

      it('应该拒绝无效的手机号格式', () => {
        const invalidPhones = [
          '12800138000', // 不是有效号段
          '10800138000', // 不是1开头的有效号段
          '1380013800',  // 长度不够11位
          '138001380001', // 长度超过11位
          '1380013800a', // 包含字母
          '+8613800138000', // 包含国际区号
          '138-0013-8000', // 包含连字符
          '138 0013 8000', // 包含空格
          '',             // 空字符串
          '00000000000',  // 全零
          '11111111111',  // 重复数字但不是有效号段
        ];

        invalidPhones.forEach(phone => {
          const { error } = commonValidations.phone.validate(phone);
          expect(error, `手机号 ${phone} 应该无效`).toBeDefined();
        });
      });

      it('应该处理手机号的边界情况', () => {
        // 测试最小有效号段
        const { error: error1 } = commonValidations.phone.validate('13000000000');
        expect(error1).toBeUndefined();

        // 测试最大有效号段
        const { error: error2 } = commonValidations.phone.validate('19999999999');
        expect(error2).toBeUndefined();

        // 测试null和undefined
        const { error: error3 } = commonValidations.phone.validate(null);
        expect(error3).toBeDefined();

        const { error: error4 } = commonValidations.phone.validate(undefined);
        expect(error4).toBeDefined();
      });
    });

    describe('邮箱验证', () => {
      it('应该接受有效的邮箱格式', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'user+tag@example.org',
          'user123@test-domain.com',
          'firstname.lastname@company.com.cn',
          'user_name@example-domain.com',
          'test.email.with+symbol@example.com',
          'x@example.com', // 单字符用户名
          'test@x.co', // 短域名
          'user@subdomain.example.com', // 子域名
          'chinese用户@example.com', // 包含中文字符
        ];

        validEmails.forEach(email => {
          const { error } = commonValidations.email.validate(email);
          expect(error, `邮箱 ${email} 应该有效`).toBeUndefined();
        });
      });

      it('应该拒绝无效的邮箱格式', () => {
        const invalidEmails = [
          'invalid-email',
          '@example.com',
          'user@',
          'user@.com',
          'user..name@example.com',
          'user@domain..com',
          'user name@example.com', // 包含空格
          'user@domain .com', // 域名包含空格
          'user@', // 缺少域名
          '@domain.com', // 缺少用户名
          'user@@domain.com', // 双@符号
          'user@domain@com', // 多个@符号
          '', // 空字符串
          'user@domain', // 缺少顶级域名
          'user@.domain.com', // 域名以点开头
          'user@domain.', // 域名以点结尾
        ];

        invalidEmails.forEach(email => {
          const { error } = commonValidations.email.validate(email);
          expect(error, `邮箱 ${email} 应该无效`).toBeDefined();
        });
      });

      it('应该处理邮箱的特殊字符', () => {
        // 测试允许的特殊字符
        const allowedSpecialChars = [
          'user+tag@example.com',
          'user.name@example.com',
          'user_name@example.com',
          'user-name@example.com',
        ];

        allowedSpecialChars.forEach(email => {
          const { error } = commonValidations.email.validate(email);
          expect(error, `邮箱 ${email} 应该有效`).toBeUndefined();
        });

        // 测试不允许的特殊字符
        const disallowedSpecialChars = [
          'user#name@example.com',
          'user$name@example.com',
          'user%name@example.com',
          'user&name@example.com',
        ];

        disallowedSpecialChars.forEach(email => {
          const { error } = commonValidations.email.validate(email);
          expect(error, `邮箱 ${email} 应该无效`).toBeDefined();
        });
      });
    });

    describe('姓名验证', () => {
      it('应该接受有效的姓名', () => {
        const validNames = [
          '张三',
          '李四',
          '王小明',
          'John Smith',
          'Mary Jane',
          '欧阳修',
          '司马懿',
          'Jean-Pierre',
          "O'Connor",
          '张三丰',
          'A', // 单字符姓名
          '很长的姓名但是在五十个字符以内的测试用例',
        ];

        validNames.forEach(name => {
          const { error } = commonValidations.name.validate(name);
          expect(error, `姓名 ${name} 应该有效`).toBeUndefined();
        });
      });

      it('应该拒绝无效的姓名', () => {
        const invalidNames = [
          '', // 空字符串
          '   ', // 只有空格
          'A'.repeat(51), // 超过50个字符
          '123', // 纯数字
          'user@domain', // 包含特殊字符
          'name with\ttab', // 包含制表符
          'name with\nnewline', // 包含换行符
        ];

        invalidNames.forEach(name => {
          const { error } = commonValidations.name.validate(name);
          expect(error, `姓名 ${name} 应该无效`).toBeDefined();
        });
      });

      it('应该自动去除姓名前后的空格', () => {
        const { error, value } = commonValidations.name.validate('  张三  ');
        expect(error).toBeUndefined();
        expect(value).toBe('张三');
      });
    });

    describe('编码验证', () => {
      it('应该接受有效的编码格式', () => {
        const validCodes = [
          'USER_001',
          'MERCHANT_ABC',
          'TEST123',
          'A1',
          'EMPLOYEE_2024_001',
          'VISITOR_TEMP_123',
          'CODE_WITH_NUMBERS_999',
          'AB', // 最短有效长度
          'A'.repeat(20), // 最长有效长度
        ];

        validCodes.forEach(code => {
          const { error } = commonValidations.code.validate(code);
          expect(error, `编码 ${code} 应该有效`).toBeUndefined();
        });
      });

      it('应该拒绝无效的编码格式', () => {
        const invalidCodes = [
          'user-001', // 包含小写字母和连字符
          'USER 001', // 包含空格
          'A', // 长度太短
          'A'.repeat(21), // 长度太长
          '123abc', // 包含小写字母
          'USER@001', // 包含特殊字符
          'USER.001', // 包含点号
          'user_001', // 包含小写字母
          '', // 空字符串
          'USER-001', // 包含连字符
          'USER#001', // 包含井号
        ];

        invalidCodes.forEach(code => {
          const { error } = commonValidations.code.validate(code);
          expect(error, `编码 ${code} 应该无效`).toBeDefined();
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
          expect(error, `用户类型 ${type} 应该有效`).toBeUndefined();
        });
      });

      it('应该拒绝无效的用户类型', () => {
        const invalidTypes = [
          'admin',
          'user',
          'guest',
          'super_admin',
          'TENANT_ADMIN', // 大写
          'merchant-admin', // 连字符
          'Employee', // 首字母大写
          '', // 空字符串
          'unknown_type',
          'visitor_temp',
        ];

        invalidTypes.forEach(type => {
          const { error } = commonValidations.userType.validate(type);
          expect(error, `用户类型 ${type} 应该无效`).toBeDefined();
        });
      });
    });

    describe('状态验证', () => {
      it('应该接受有效的状态值', () => {
        const validStatuses = ['active', 'inactive'];

        validStatuses.forEach(status => {
          const { error } = commonValidations.status.validate(status);
          expect(error, `状态 ${status} 应该有效`).toBeUndefined();
        });
      });

      it('应该拒绝无效的状态值', () => {
        const invalidStatuses = [
          'enabled',
          'disabled',
          'pending',
          'ACTIVE', // 大写
          'Active', // 首字母大写
          '', // 空字符串
          'deleted',
          'suspended',
        ];

        invalidStatuses.forEach(status => {
          const { error } = commonValidations.status.validate(status);
          expect(error, `状态 ${status} 应该无效`).toBeDefined();
        });
      });
    });

    describe('ID验证', () => {
      it('应该接受有效的ID', () => {
        const validIds = [1, 100, 999999, '1', '100', '999999'];

        validIds.forEach(id => {
          const { error } = commonValidations.id.validate(id);
          expect(error, `ID ${id} 应该有效`).toBeUndefined();
        });
      });

      it('应该拒绝无效的ID', () => {
        const invalidIds = [
          0, // 零
          -1, // 负数
          1.5, // 小数
          '0', // 字符串零
          '-1', // 字符串负数
          '1.5', // 字符串小数
          'abc', // 非数字字符串
          '', // 空字符串
          null,
          undefined,
        ];

        invalidIds.forEach(id => {
          const { error } = commonValidations.id.validate(id);
          expect(error, `ID ${id} 应该无效`).toBeDefined();
        });
      });

      it('应该将字符串ID转换为数字', () => {
        const { error, value } = commonValidations.id.validate('123');
        expect(error).toBeUndefined();
        expect(value).toBe(123);
        expect(typeof value).toBe('number');
      });
    });
  });

  describe('业务规则验证逻辑', () => {
    describe('复合验证规则', () => {
      it('应该验证用户注册数据的完整性', () => {
        const userRegistrationSchema = Joi.object({
          name: commonValidations.name.required(),
          phone: commonValidations.phone.required(),
          email: commonValidations.email.required(),
          userType: commonValidations.userType.required(),
          merchantId: commonValidations.id.when('userType', {
            is: 'employee',
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
        });

        // 员工注册必须提供商户ID
        const employeeData = {
          name: '张三',
          phone: '13800138000',
          email: 'zhangsan@example.com',
          userType: 'employee',
          merchantId: 1,
        };

        const { error: employeeError } = userRegistrationSchema.validate(employeeData);
        expect(employeeError).toBeUndefined();

        // 访客注册不需要商户ID
        const visitorData = {
          name: '李四',
          phone: '13900139000',
          email: 'lisi@example.com',
          userType: 'visitor',
        };

        const { error: visitorError } = userRegistrationSchema.validate(visitorData);
        expect(visitorError).toBeUndefined();

        // 员工注册缺少商户ID应该失败
        const invalidEmployeeData = {
          name: '王五',
          phone: '13700137000',
          email: 'wangwu@example.com',
          userType: 'employee',
          // 缺少merchantId
        };

        const { error: invalidError } = userRegistrationSchema.validate(invalidEmployeeData);
        expect(invalidError).toBeDefined();
      });

      it('应该验证访客申请数据的业务规则', () => {
        const visitorApplicationSchema = Joi.object({
          visitorName: commonValidations.name.required(),
          visitorPhone: commonValidations.phone.required(),
          merchantId: commonValidations.id.required(),
          purpose: Joi.string().min(5).max(200).required().messages({
            'string.min': '访问目的至少5个字符',
            'string.max': '访问目的不能超过200个字符',
          }),
          scheduledTime: Joi.date().greater('now').required().messages({
            'date.greater': '预约时间必须是未来时间',
          }),
          duration: Joi.number().integer().min(1).max(24).default(2).messages({
            'number.min': '访问时长至少1小时',
            'number.max': '访问时长不能超过24小时',
          }),
          emergencyContact: Joi.string().optional(),
          emergencyPhone: commonValidations.phone.when('emergencyContact', {
            is: Joi.exist(),
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
        });

        // 有效的访客申请
        const validApplication = {
          visitorName: '访客张三',
          visitorPhone: '13800138000',
          merchantId: 1,
          purpose: '商务洽谈会议',
          scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明天
          duration: 3,
        };

        const { error: validError } = visitorApplicationSchema.validate(validApplication);
        expect(validError).toBeUndefined();

        // 提供紧急联系人但缺少电话
        const invalidApplication = {
          visitorName: '访客李四',
          visitorPhone: '13900139000',
          merchantId: 1,
          purpose: '技术交流',
          scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          emergencyContact: '李四家属',
          // 缺少emergencyPhone
        };

        const { error: invalidError } = visitorApplicationSchema.validate(invalidApplication);
        expect(invalidError).toBeDefined();

        // 预约时间是过去时间
        const pastTimeApplication = {
          visitorName: '访客王五',
          visitorPhone: '13700137000',
          merchantId: 1,
          purpose: '参观访问',
          scheduledTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 昨天
        };

        const { error: pastTimeError } = visitorApplicationSchema.validate(pastTimeApplication);
        expect(pastTimeError).toBeDefined();
      });

      it('应该验证员工申请数据的完整性', () => {
        const employeeApplicationSchema = Joi.object({
          name: commonValidations.name.required(),
          phone: commonValidations.phone.required(),
          email: commonValidations.email.required(),
          merchantId: commonValidations.id.required(),
          position: Joi.string().min(2).max(50).required().messages({
            'string.min': '职位名称至少2个字符',
            'string.max': '职位名称不能超过50个字符',
          }),
          department: Joi.string().min(2).max(50).optional(),
          idCard: Joi.string().pattern(/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/).required().messages({
            'string.pattern.base': '身份证号格式不正确',
          }),
          emergencyContact: Joi.string().optional(),
          emergencyPhone: commonValidations.phone.when('emergencyContact', {
            is: Joi.exist(),
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
        });

        // 有效的员工申请
        const validApplication = {
          name: '员工张三',
          phone: '13800138000',
          email: 'employee@example.com',
          merchantId: 1,
          position: '软件工程师',
          department: '技术部',
          idCard: '110101199001011234',
        };

        const { error: validError } = employeeApplicationSchema.validate(validApplication);
        expect(validError).toBeUndefined();

        // 无效的身份证号
        const invalidIdCard = {
          ...validApplication,
          idCard: '123456789012345678', // 无效格式
        };

        const { error: idCardError } = employeeApplicationSchema.validate(invalidIdCard);
        expect(idCardError).toBeDefined();
      });
    });

    describe('数据关联性验证', () => {
      it('应该验证商户和用户的关联关系', () => {
        const merchantUserSchema = Joi.object({
          userId: commonValidations.id.required(),
          merchantId: commonValidations.id.required(),
          userType: commonValidations.userType.required(),
          permissions: Joi.array().items(Joi.string()).when('userType', {
            is: 'merchant_admin',
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
        });

        // 商户管理员必须有权限
        const adminData = {
          userId: 1,
          merchantId: 1,
          userType: 'merchant_admin',
          permissions: ['user_management', 'visitor_approval'],
        };

        const { error: adminError } = merchantUserSchema.validate(adminData);
        expect(adminError).toBeUndefined();

        // 普通员工不需要权限
        const employeeData = {
          userId: 2,
          merchantId: 1,
          userType: 'employee',
        };

        const { error: employeeError } = merchantUserSchema.validate(employeeData);
        expect(employeeError).toBeUndefined();
      });

      it('应该验证时间范围的逻辑关系', () => {
        const timeRangeSchema = Joi.object({
          startTime: Joi.date().required(),
          endTime: Joi.date().greater(Joi.ref('startTime')).required().messages({
            'date.greater': '结束时间必须晚于开始时间',
          }),
          duration: Joi.number().integer().min(1).optional(),
        });

        // 有效的时间范围
        const validRange = {
          startTime: new Date('2024-01-01T09:00:00Z'),
          endTime: new Date('2024-01-01T17:00:00Z'),
          duration: 8,
        };

        const { error: validError } = timeRangeSchema.validate(validRange);
        expect(validError).toBeUndefined();

        // 结束时间早于开始时间
        const invalidRange = {
          startTime: new Date('2024-01-01T17:00:00Z'),
          endTime: new Date('2024-01-01T09:00:00Z'),
        };

        const { error: invalidError } = timeRangeSchema.validate(invalidRange);
        expect(invalidError).toBeDefined();
      });
    });
  });

  describe('数据格式转换', () => {
    describe('字符串到数字转换', () => {
      it('应该正确转换字符串ID为数字', () => {
        const { error, value } = commonValidations.id.validate('123');
        expect(error).toBeUndefined();
        expect(value).toBe(123);
        expect(typeof value).toBe('number');
      });

      it('应该正确转换分页参数', () => {
        const paginationSchema = Joi.object(commonValidations.pagination);
        
        const { error, value } = paginationSchema.validate({
          page: '2',
          limit: '10',
        });

        expect(error).toBeUndefined();
        expect(value.page).toBe(2);
        expect(value.limit).toBe(10);
        expect(typeof value.page).toBe('number');
        expect(typeof value.limit).toBe('number');
      });
    });

    describe('字符串清理和格式化', () => {
      it('应该去除字符串前后空格', () => {
        const { error, value } = commonValidations.name.validate('  张三  ');
        expect(error).toBeUndefined();
        expect(value).toBe('张三');
      });

      it('应该处理空字符串和null值', () => {
        const optionalStringSchema = Joi.string().optional().allow('', null);

        const { error: emptyError, value: emptyValue } = optionalStringSchema.validate('');
        expect(emptyError).toBeUndefined();
        expect(emptyValue).toBe('');

        const { error: nullError, value: nullValue } = optionalStringSchema.validate(null);
        expect(nullError).toBeUndefined();
        expect(nullValue).toBeNull();
      });
    });

    describe('日期格式转换', () => {
      it('应该正确解析ISO日期字符串', () => {
        const dateSchema = Joi.date().iso();

        const { error, value } = dateSchema.validate('2024-01-01T09:00:00Z');
        expect(error).toBeUndefined();
        expect(value).toBeInstanceOf(Date);
        expect(value.getFullYear()).toBe(2024);
      });

      it('应该拒绝无效的日期格式', () => {
        const dateSchema = Joi.date().iso();

        const invalidDates = [
          'invalid-date',
          '2024-13-01', // 无效月份
          '2024-01-32', // 无效日期
          '2024/01/01', // 错误格式
        ];

        invalidDates.forEach(date => {
          const { error } = dateSchema.validate(date);
          expect(error, `日期 ${date} 应该无效`).toBeDefined();
        });
      });
    });

    describe('数组和对象转换', () => {
      it('应该正确处理数组验证和转换', () => {
        const arraySchema = Joi.array().items(commonValidations.id).min(1).max(10);

        const { error, value } = arraySchema.validate(['1', '2', '3']);
        expect(error).toBeUndefined();
        expect(value).toEqual([1, 2, 3]);
        expect(value.every((item: any) => typeof item === 'number')).toBe(true);
      });

      it('应该处理嵌套对象的验证和转换', () => {
        const nestedSchema = Joi.object({
          user: Joi.object({
            id: commonValidations.id.required(),
            name: commonValidations.name.required(),
          }).required(),
          metadata: Joi.object({
            tags: Joi.array().items(Joi.string()).optional(),
            priority: Joi.number().integer().min(1).max(5).default(3),
          }).optional(),
        });

        const { error, value } = nestedSchema.validate({
          user: {
            id: '123',
            name: '  张三  ',
          },
          metadata: {
            tags: ['tag1', 'tag2'],
          },
        });

        expect(error).toBeUndefined();
        expect(value.user.id).toBe(123);
        expect(value.user.name).toBe('张三');
        expect(value.metadata.priority).toBe(3); // 默认值
      });
    });
  });

  describe('错误处理和边界情况', () => {
    describe('验证错误信息', () => {
      it('应该提供详细的中文错误信息', () => {
        const schema = Joi.object({
          phone: commonValidations.phone.required(),
          email: commonValidations.email.required(),
        });

        try {
          const middleware = validate(schema);
          mockReq.body = {
            phone: 'invalid-phone',
            email: 'invalid-email',
          };

          middleware(mockReq as Request, mockRes as Response, mockNext);
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).message).toBe('请求数据验证失败');
          expect((error as AppError).code).toBe(ErrorCodes.VALIDATION_ERROR);
          expect((error as AppError).details).toHaveLength(2);
        }
      });

      it('应该处理深层嵌套的验证错误', () => {
        const schema = Joi.object({
          user: Joi.object({
            profile: Joi.object({
              contact: Joi.object({
                phone: commonValidations.phone.required(),
                email: commonValidations.email.required(),
              }).required(),
            }).required(),
          }).required(),
        });

        try {
          const middleware = validate(schema);
          mockReq.body = {
            user: {
              profile: {
                contact: {
                  phone: 'invalid',
                  email: 'invalid',
                },
              },
            },
          };

          middleware(mockReq as Request, mockRes as Response, mockNext);
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          const details = (error as AppError).details;
          expect(details.some((d: any) => d.field.includes('user.profile.contact.phone'))).toBe(true);
          expect(details.some((d: any) => d.field.includes('user.profile.contact.email'))).toBe(true);
        }
      });
    });

    describe('性能和安全边界', () => {
      it('应该处理大量数据而不崩溃', () => {
        const schema = Joi.object({
          items: Joi.array().items(
            Joi.object({
              id: commonValidations.id.required(),
              name: commonValidations.name.required(),
            })
          ).max(1000),
        });

        const items = Array.from({ length: 100 }, (_, i) => ({
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

      it('应该防止过长的字符串输入', () => {
        const schema = Joi.object({
          description: Joi.string().max(1000).required(),
        });

        mockReq.body = {
          description: 'A'.repeat(1001), // 超过最大长度
        };

        const middleware = validate(schema);

        expect(() => {
          middleware(mockReq as Request, mockRes as Response, mockNext);
        }).toThrow(AppError);
      });

      it('应该处理特殊字符和Unicode', () => {
        const schema = Joi.object({
          name: commonValidations.name.required(),
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
});