import express from 'express';
import { TenantController } from '../../controllers/tenant.controller.js';
import { authenticate, requireTenantAdmin } from '../../middleware/auth.middleware.js';
import { permissions } from '../../middleware/permission.middleware.js';

const router: express.Router = express.Router();
const tenantController = new TenantController();

// 所有租务管理路由都需要租务管理员权限
router.use(authenticate);
router.use(requireTenantAdmin);

// 商户管理路由
router.get('/merchants', permissions.merchant.read, tenantController.getMerchants);
router.get('/merchants/:id', permissions.merchant.read, tenantController.getMerchantById);
router.post('/merchants', permissions.merchant.write, tenantController.createMerchant);
router.put('/merchants/:id', permissions.merchant.write, tenantController.updateMerchant);
router.delete('/merchants/:id', permissions.merchant.delete, tenantController.deleteMerchant);
router.patch('/merchants/:id/status', permissions.merchant.manage, tenantController.updateMerchantStatus);
router.post('/merchants/:id/permissions', permissions.merchant.manage, tenantController.assignPermissions);
router.get('/merchants/:id/stats', permissions.merchant.read, tenantController.getMerchantStats);

// 空间管理路由
router.get('/spaces/hierarchy', permissions.system.read, tenantController.getSpaceHierarchy);
router.get('/projects', permissions.system.read, tenantController.getProjects);
router.post('/projects', permissions.system.write, tenantController.createProject);
router.put('/projects/:id', permissions.system.write, tenantController.updateProject);

export default router;