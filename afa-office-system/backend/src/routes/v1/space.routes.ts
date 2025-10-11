import { Router, Request, Response, NextFunction } from 'express';
import { SpaceController } from '../../controllers/space.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { validate, validateQuery } from '../../middleware/validation.middleware.js';
import Joi from 'joi';

const router: Router = Router();
const spaceController = new SpaceController();

/**
 * 验证规则
 */
const createProjectSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'any.required': '项目名称不能为空',
    'string.min': '项目名称至少2个字符',
    'string.max': '项目名称不能超过100个字符',
  }),
  code: Joi.string().min(2).max(50).pattern(/^[A-Za-z0-9_-]+$/).required().messages({
    'any.required': '项目编码不能为空',
    'string.min': '项目编码至少2个字符',
    'string.max': '项目编码不能超过50个字符',
    'string.pattern.base': '项目编码只能包含字母、数字、下划线和横线',
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': '项目描述不能超过500个字符',
  }),
  status: Joi.string().valid('active', 'inactive').optional().default('active'),
});

const updateProjectSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().messages({
    'string.min': '项目名称至少2个字符',
    'string.max': '项目名称不能超过100个字符',
  }),
  code: Joi.string().min(2).max(50).pattern(/^[A-Za-z0-9_-]+$/).optional().messages({
    'string.min': '项目编码至少2个字符',
    'string.max': '项目编码不能超过50个字符',
    'string.pattern.base': '项目编码只能包含字母、数字、下划线和横线',
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': '项目描述不能超过500个字符',
  }),
  status: Joi.string().valid('active', 'inactive').optional(),
});

const createVenueSchema = Joi.object({
  project_id: Joi.number().integer().positive().required().messages({
    'any.required': '项目ID不能为空',
    'number.base': '项目ID必须是数字',
    'number.integer': '项目ID必须是整数',
    'number.positive': '项目ID必须是正数',
  }),
  name: Joi.string().min(2).max(100).required().messages({
    'any.required': '场地名称不能为空',
    'string.min': '场地名称至少2个字符',
    'string.max': '场地名称不能超过100个字符',
  }),
  code: Joi.string().min(1).max(50).pattern(/^[A-Za-z0-9_-]+$/).required().messages({
    'any.required': '场地编码不能为空',
    'string.min': '场地编码至少1个字符',
    'string.max': '场地编码不能超过50个字符',
    'string.pattern.base': '场地编码只能包含字母、数字、下划线和横线',
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': '场地描述不能超过500个字符',
  }),
  status: Joi.string().valid('active', 'inactive').optional().default('active'),
});

const updateVenueSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().messages({
    'string.min': '场地名称至少2个字符',
    'string.max': '场地名称不能超过100个字符',
  }),
  code: Joi.string().min(1).max(50).pattern(/^[A-Za-z0-9_-]+$/).optional().messages({
    'string.min': '场地编码至少1个字符',
    'string.max': '场地编码不能超过50个字符',
    'string.pattern.base': '场地编码只能包含字母、数字、下划线和横线',
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': '场地描述不能超过500个字符',
  }),
  status: Joi.string().valid('active', 'inactive').optional(),
});

const createFloorSchema = Joi.object({
  venue_id: Joi.number().integer().positive().required().messages({
    'any.required': '场地ID不能为空',
    'number.base': '场地ID必须是数字',
    'number.integer': '场地ID必须是整数',
    'number.positive': '场地ID必须是正数',
  }),
  name: Joi.string().min(1).max(100).required().messages({
    'any.required': '楼层名称不能为空',
    'string.min': '楼层名称至少1个字符',
    'string.max': '楼层名称不能超过100个字符',
  }),
  code: Joi.string().min(1).max(50).pattern(/^[A-Za-z0-9_-]+$/).required().messages({
    'any.required': '楼层编码不能为空',
    'string.min': '楼层编码至少1个字符',
    'string.max': '楼层编码不能超过50个字符',
    'string.pattern.base': '楼层编码只能包含字母、数字、下划线和横线',
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': '楼层描述不能超过500个字符',
  }),
  status: Joi.string().valid('active', 'inactive').optional().default('active'),
});

const updateFloorSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional().messages({
    'string.min': '楼层名称至少1个字符',
    'string.max': '楼层名称不能超过100个字符',
  }),
  code: Joi.string().min(1).max(50).pattern(/^[A-Za-z0-9_-]+$/).optional().messages({
    'string.min': '楼层编码至少1个字符',
    'string.max': '楼层编码不能超过50个字符',
    'string.pattern.base': '楼层编码只能包含字母、数字、下划线和横线',
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': '楼层描述不能超过500个字符',
  }),
  status: Joi.string().valid('active', 'inactive').optional(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  status: Joi.string().valid('active', 'inactive').optional(),
  search: Joi.string().max(100).optional(),
  projectId: Joi.number().integer().positive().optional(),
  venueId: Joi.number().integer().positive().optional(),
});

/**
 * 空间管理路由
 * 所有路由都需要认证，部分需要特定权限
 */

// ==================== 项目管理路由 ====================

// 获取项目列表
router.get(
  '/projects',
  authenticate,
  requirePermission('space', 'read'),
  validateQuery(querySchema),
  spaceController.getProjects
);

// 获取项目详情
router.get(
  '/projects/:id',
  authenticate,
  requirePermission('space', 'read'),
  spaceController.getProjectById
);

// 创建项目
router.post(
  '/projects',
  authenticate,
  requirePermission('space', 'write'),
  validate(createProjectSchema),
  spaceController.createProject
);

// 更新项目信息
router.put(
  '/projects/:id',
  authenticate,
  requirePermission('space', 'write'),
  validate(updateProjectSchema),
  spaceController.updateProject
);

// 删除项目
router.delete(
  '/projects/:id',
  authenticate,
  requirePermission('space', 'delete'),
  spaceController.deleteProject
);

// ==================== 场地管理路由 ====================

// 获取场地列表
router.get(
  '/venues',
  authenticate,
  requirePermission('space', 'read'),
  validateQuery(querySchema),
  spaceController.getVenues
);

// 获取场地详情
router.get(
  '/venues/:id',
  authenticate,
  requirePermission('space', 'read'),
  spaceController.getVenueById
);

// 创建场地
router.post(
  '/venues',
  authenticate,
  requirePermission('space', 'write'),
  validate(createVenueSchema),
  spaceController.createVenue
);

// 更新场地信息
router.put(
  '/venues/:id',
  authenticate,
  requirePermission('space', 'write'),
  validate(updateVenueSchema),
  spaceController.updateVenue
);

// 删除场地
router.delete(
  '/venues/:id',
  authenticate,
  requirePermission('space', 'delete'),
  spaceController.deleteVenue
);

// ==================== 楼层管理路由 ====================

// 获取楼层列表
router.get(
  '/floors',
  authenticate,
  requirePermission('space', 'read'),
  validateQuery(querySchema),
  spaceController.getFloors
);

// 获取楼层详情
router.get(
  '/floors/:id',
  authenticate,
  requirePermission('space', 'read'),
  spaceController.getFloorById
);

// 创建楼层
router.post(
  '/floors',
  authenticate,
  requirePermission('space', 'write'),
  validate(createFloorSchema),
  spaceController.createFloor
);

// 更新楼层信息
router.put(
  '/floors/:id',
  authenticate,
  requirePermission('space', 'write'),
  validate(updateFloorSchema),
  spaceController.updateFloor
);

// 删除楼层
router.delete(
  '/floors/:id',
  authenticate,
  requirePermission('space', 'delete'),
  spaceController.deleteFloor
);

// ==================== 层级结构查询路由 ====================

// 获取完整的空间层级结构
router.get(
  '/hierarchy',
  authenticate,
  requirePermission('space', 'read'),
  validateQuery(querySchema),
  spaceController.getSpaceHierarchy
);

// 获取商户权限关联的空间
router.get(
  '/merchants/:merchantId/spaces',
  authenticate,
  requirePermission('space', 'read'),
  spaceController.getMerchantSpaces
);

export default router;