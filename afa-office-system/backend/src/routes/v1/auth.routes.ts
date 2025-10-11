import { Router } from 'express';
import { AuthController } from '../../controllers/auth.controller.js';
import { validate } from '../../middleware/validation.middleware.js';
import { optionalAuth } from '../../middleware/auth.middleware.js';
import Joi from 'joi';

const router: Router = Router();
const authController = new AuthController();

/**
 * 验证规则
 */
const loginSchema = Joi.object({
  phone: Joi.string().pattern(/^1[3-9]\d{9}$/).optional().messages({
    'string.pattern.base': '手机号格式无效',
  }),
  password: Joi.string().min(6).optional().messages({
    'string.min': '密码至少6位',
  }),
  openId: Joi.string().optional(),
  userType: Joi.string().valid('tenant_admin', 'merchant_admin', 'employee', 'visitor').optional(),
}).or('phone', 'openId').messages({
  'object.missing': '请提供手机号密码或微信授权信息',
});

const wechatLoginSchema = Joi.object({
  code: Joi.string().required().messages({
    'any.required': '缺少微信授权码',
    'string.empty': '微信授权码不能为空',
  }),
  userType: Joi.string().valid('visitor', 'employee').required().messages({
    'any.required': '请选择用户类型',
    'any.only': '用户类型必须是访客或员工',
  }),
  userInfo: Joi.object({
    nickName: Joi.string().optional(),
    avatarUrl: Joi.string().uri().optional(),
    gender: Joi.number().integer().min(0).max(2).optional(),
    country: Joi.string().optional(),
    province: Joi.string().optional(),
    city: Joi.string().optional(),
    language: Joi.string().optional(),
  }).optional(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': '缺少刷新令牌',
    'string.empty': '刷新令牌不能为空',
  }),
});

const verifyTokenSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': '缺少令牌',
    'string.empty': '令牌不能为空',
  }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': '请提供当前密码',
    'string.empty': '当前密码不能为空',
  }),
  newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
    'any.required': '请提供新密码',
    'string.empty': '新密码不能为空',
    'string.min': '新密码至少8位',
    'string.pattern.base': '新密码必须包含大小写字母和数字',
  }),
});

const resetPasswordSchema = Joi.object({
  phone: Joi.string().pattern(/^1[3-9]\d{9}$/).required().messages({
    'any.required': '请提供手机号',
    'string.pattern.base': '手机号格式无效',
  }),
  code: Joi.string().length(6).pattern(/^\d{6}$/).required().messages({
    'any.required': '请提供验证码',
    'string.length': '验证码必须是6位数字',
    'string.pattern.base': '验证码格式无效',
  }),
});

const sendCodeSchema = Joi.object({
  phone: Joi.string().pattern(/^1[3-9]\d{9}$/).required().messages({
    'any.required': '请提供手机号',
    'string.pattern.base': '手机号格式无效',
  }),
  type: Joi.string().valid('login', 'register', 'reset').optional().default('login'),
});

/**
 * 认证路由
 */

// 用户登录
router.post('/login', validate(loginSchema), authController.login);

// 微信小程序登录
router.post('/wechat-login', validate(wechatLoginSchema), authController.wechatLogin);

// 刷新访问token
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);

// 用户登出（需要认证）
router.post('/logout', optionalAuth, authController.logout);

// 获取当前用户信息（需要认证）
router.get('/me', optionalAuth, authController.getCurrentUser);

// 验证token有效性
router.post('/verify-token', validate(verifyTokenSchema), authController.verifyToken);

// 修改密码（需要认证）
router.post('/change-password', optionalAuth, validate(changePasswordSchema), authController.changePassword);

// 重置密码
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// 发送验证码
router.post('/send-code', validate(sendCodeSchema), authController.sendVerificationCode);

// 健康检查
router.get('/health', authController.healthCheck);

export default router;