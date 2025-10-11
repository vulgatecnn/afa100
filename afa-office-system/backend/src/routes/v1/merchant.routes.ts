import { Router } from 'express';
import { MerchantController } from '../../controllers/merchant.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import Joi from 'joi';

const router: Router = Router();
const merchantController = new MerchantController();

/**
 * 验证规则
 */
const createMerchantSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'any.required': '商户名称不能为空',
    'string.min': '商户名称至少2个字符',
    'string.max': '商户名称不能超过100个字符',
  }),
  code: Joi.string().min(2).max(50).pattern(/^[A-Za-z0-9_-]+$/).required().messages({
    'any.required': '商户编码不能为空',
    'string.min': '商户编码至少2个字符',
    'string.max': '商户编码不能超过50个字符',
    'string.pattern.base': '商户编码只能包含字母、数字、下划线和横线',
  }),
  contact: Joi.string().max(50).optional().messages({
    'string.max': '联系人姓名不能超过50个字符',
  }),
  phone: Joi.string().pattern(/^1[3-9]\d{9}$/).optional().messages({
    'string.pattern.base': '手机号格式无效',
  }),
  email: Joi.string().email().optional().messages({
    'string.email': '邮箱格式无效',
  }),
  address: Joi.string().max(200).optional().messages({
    'string.max': '地址不能超过200个字符',
  }),
  status: Joi.string().valid('active', 'inactive').optional().default('active'),
});

const updateMerchantSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().messages({
    'string.min': '商户名称至少2个字符',
    'string.max': '商户名称不能超过100个字符',
  }),
  code: Joi.string().min(2).max(50).pattern(/^[A-Za-z0-9_-]+$/).optional().messages({
    'string.min': '商户编码至少2个字符',
    'string.max': '商户编码不能超过50个字符',
    'string.pattern.base': '商户编码只能包含字母、数字、下划线和横线',
  }),
  contact: Joi.string().max(50).optional().messages({
    'string.max': '联系人姓名不能超过50个字符',
  }),
  phone: Joi.string().pattern(/^1[3-9]\d{9}$/).optional().messages({
    'string.pattern.base': '手机号格式无效',
  }),
  email: Joi.string().email().optional().messages({
    'string.email': '邮箱格式无效',
  }),
  address: Joi.string().max(200).optional().messages({
    'string.max': '地址不能超过200个字符',
  }),
  status: Joi.string().valid('active', 'inactive').optional(),
});

const assignPermissionsSchema = Joi.object({
  permissionIds: Joi.array().items(Joi.number().integer().positive()).required().messages({
    'any.required': '权限ID列表不能为空',
    'array.base': '权限ID列表格式无效',
    'number.base': '权限ID必须是数字',
    'number.integer': '权限ID必须是整数',
    'number.positive': '权限ID必须是正数',
  }),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  status: Joi.string().valid('active', 'inactive').optional(),
  search: Joi.string().max(100).optional(),
});

/**
 * 商户管理路由
 * 所有路由都需要认证，部分需要特定权限
 */

// 获取商户列表
router.get(
  '/',
  authenticate,
  requirePermission('merchant:read'),
  validate(querySchema, 'query'),
  merchantController.getMerchants
);

// 获取商户详情
router.get(
  '/:id',
  authenticate,
  requirePermission('merchant:read'),
  merchantController.getMerchantById
);

// 创建商户
router.post(
  '/',
  authenticate,
  requirePermission('merchant:create'),
  validate(createMerchantSchema),
  merchantController.createMerchant
);

// 更新商户信息
router.put(
  '/:id',
  authenticate,
  requirePermission('merchant:update'),
  validate(updateMerchantSchema),
  merchantController.updateMerchant
);

// 删除商户
router.delete(
  '/:id',
  authenticate,
  requirePermission('merchant:delete'),
  merchantController.deleteMerchant
);

// 启用商户
router.post(
  '/:id/enable',
  authenticate,
  requirePermission('merchant:update'),
  merchantController.enableMerchant
);

// 停用商户
router.post(
  '/:id/disable',
  authenticate,
  requirePermission('merchant:update'),
  merchantController.disableMerchant
);

// 获取商户权限
router.get(
  '/:id/permissions',
  authenticate,
  requirePermission('merchant:read'),
  merchantController.getMerchantPermissions
);

// 分配商户权限
router.post(
  '/:id/permissions',
  authenticate,
  requirePermission('merchant:permission:assign'),
  validate(assignPermissionsSchema),
  merchantController.assignMerchantPermissions
);

// 移除商户权限
router.delete(
  '/:id/permissions',
  authenticate,
  requirePermission('merchant:permission:remove'),
  validate(assignPermissionsSchema),
  merchantController.removeMerchantPermissions
);

// 获取商户统计信息
router.get(
  '/:id/stats',
  authenticate,
  requirePermission('merchant:read'),
  merchantController.getMerchantStats
);

export default router;