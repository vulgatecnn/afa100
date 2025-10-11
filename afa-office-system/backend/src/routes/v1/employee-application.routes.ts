import { Router } from 'express';
import { EmployeeApplicationController } from '../../controllers/employee-application.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { validate, validateQuery } from '../../middleware/validation.middleware.js';
import Joi from 'joi';

const router: Router = Router();
const employeeAppController = new EmployeeApplicationController();

// 所有员工申请路由都需要认证
router.use(authenticate);

/**
 * 员工申请相关路由
 */

// 获取商户列表（供申请时选择）
router.get(
  '/merchants',
  employeeAppController.getMerchants.bind(employeeAppController)
);

// 提交员工申请
router.post(
  '/apply',
  employeeAppController.submitApplication.bind(employeeAppController)
);

// 获取我的申请记录
router.get(
  '/application',
  employeeAppController.getMyApplication.bind(employeeAppController)
);

// 撤销我的申请
router.delete(
  '/application/:applicationId',
  employeeAppController.withdrawApplication.bind(employeeAppController)
);

// 身份验证
router.post(
  '/verify-identity',
  employeeAppController.verifyIdentity.bind(employeeAppController)
);

/**
 * 商户管理员相关路由
 * 基础路径: /api/v1/merchants/:merchantId/employee-applications
 */

// 获取商户的员工申请列表
router.get(
  '/:merchantId/employee-applications',
  requirePermission('employee_application', 'read'),
  validateQuery(Joi.object({
    status: Joi.string().valid('pending', 'approved', 'rejected').optional(),
  })),
  employeeAppController.getMerchantApplications.bind(employeeAppController)
);

// 获取申请详情
router.get(
  '/:merchantId/employee-applications/:applicationId',
  requirePermission('employee_application', 'read'),
  employeeAppController.getApplicationById.bind(employeeAppController)
);

// 审批员工申请
router.post(
  '/:merchantId/employee-applications/:applicationId/approve',
  requirePermission('employee_application', 'write'),
  employeeAppController.approveApplication.bind(employeeAppController)
);

// 获取申请统计信息
router.get(
  '/:merchantId/employee-applications/stats',
  requirePermission('employee_application', 'read'),
  employeeAppController.getApplicationStats.bind(employeeAppController)
);

export default router;