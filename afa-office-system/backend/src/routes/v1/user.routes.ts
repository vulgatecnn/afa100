/**
 * 用户管理路由
 */

import { Router } from 'express';
import { asyncHandler } from '../../middleware/error.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { degradationCheck } from '../../middleware/maintenance.middleware.js';
import { UserController } from '../../controllers/user.controller.js';

const router: Router = Router();
const userController = new UserController();

// 获取用户列表
router.get('/', 
  authenticate,
  requirePermission('user', 'read'),
  degradationCheck('user_management'),
  asyncHandler(userController.getUsers.bind(userController))
);

// 获取单个用户
router.get('/:id',
  authenticate,
  requirePermission('user', 'read'),
  degradationCheck('user_management'),
  asyncHandler(userController.getUser.bind(userController))
);

// 创建用户
router.post('/',
  authenticate,
  requirePermission('user', 'write'),
  degradationCheck('user_management'),
  asyncHandler(userController.createUser.bind(userController))
);

// 更新用户
router.put('/:id',
  authenticate,
  requirePermission('user', 'write'),
  degradationCheck('user_management'),
  asyncHandler(userController.updateUser.bind(userController))
);

// 删除用户
router.delete('/:id',
  authenticate,
  requirePermission('user', 'delete'),
  degradationCheck('user_management'),
  asyncHandler(userController.deleteUser.bind(userController))
);

export default router;