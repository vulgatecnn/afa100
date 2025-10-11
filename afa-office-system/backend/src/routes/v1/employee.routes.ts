import { Router } from 'express';
import { EmployeeController } from '../../controllers/employee.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { validate, validateQuery } from '../../middleware/validation.middleware.js';
import Joi from 'joi';

const router: Router = Router();
const employeeController = new EmployeeController();

// 所有员工管理路由都需要认证
router.use(authenticate);

/**
 * 员工管理路由
 * 基础路径: /api/v1/merchants/:merchantId/employees
 */

// 获取员工列表
router.get(
  '/:merchantId/employees',
  requirePermission('employee', 'read'),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().optional(),
  })),
  employeeController.getEmployees.bind(employeeController)
);

// 创建员工
router.post(
  '/:merchantId/employees',
  requirePermission('employee', 'write'),
  validate(Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().optional(),
    role: Joi.string().required(),
  })),
  employeeController.createEmployee.bind(employeeController)
);

// 批量创建员工
router.post(
  '/:merchantId/employees/batch',
  requirePermission('employee', 'write'),
  validate(Joi.object({
    employees: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        phone: Joi.string().optional(),
        role: Joi.string().required(),
      })
    ),
  })),
  employeeController.batchCreateEmployees.bind(employeeController)
);

// Excel批量导入员工
router.post(
  '/:merchantId/employees/import',
  requirePermission('employee', 'write'),
  employeeController.importEmployeesFromExcel.bind(employeeController)
);

// 获取员工统计信息
router.get(
  '/:merchantId/employees/stats',
  requirePermission('employee', 'read'),
  employeeController.getEmployeeStats.bind(employeeController)
);

// 获取员工详情
router.get(
  '/:merchantId/employees/:employeeId',
  requirePermission('employee', 'read'),
  employeeController.getEmployeeById.bind(employeeController)
);

// 更新员工信息
router.put(
  '/:merchantId/employees/:employeeId',
  requirePermission('employee', 'write'),
  validate(Joi.object({
    name: Joi.string().optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    role: Joi.string().optional(),
  })),
  employeeController.updateEmployee.bind(employeeController)
);

// 删除员工
router.delete(
  '/:merchantId/employees/:employeeId',
  requirePermission('employee', 'delete'),
  employeeController.deleteEmployee.bind(employeeController)
);

// 批量删除员工
router.delete(
  '/:merchantId/employees',
  requirePermission('employee', 'delete'),
  validate(Joi.object({
    employeeIds: Joi.array().items(Joi.string().required()).required(),
  })),
  employeeController.batchDeleteEmployees.bind(employeeController)
);

// 启用/禁用员工
router.patch(
  '/:merchantId/employees/:employeeId/status',
  requirePermission('employee', 'write'),
  validate(Joi.object({
    status: Joi.string().valid('active', 'inactive').required(),
  })),
  employeeController.toggleEmployeeStatus.bind(employeeController)
);

// 分配员工权限
router.post(
  '/:merchantId/employees/:employeeId/permissions',
  requirePermission('employee', 'write'),
  validate(Joi.object({
    permissions: Joi.array().items(Joi.string().required()).required(),
  })),
  employeeController.assignEmployeePermissions.bind(employeeController)
);

// 获取员工权限
router.get(
  '/:merchantId/employees/:employeeId/permissions',
  requirePermission('employee', 'read'),
  employeeController.getEmployeePermissions.bind(employeeController)
);

export default router;