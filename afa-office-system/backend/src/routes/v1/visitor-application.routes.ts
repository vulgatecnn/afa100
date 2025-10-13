/**
 * 访客申请路由
 */

import { Router } from 'express';
import { asyncHandler } from '../../middleware/error.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { degradationCheck } from '../../middleware/maintenance.middleware.js';
import { VisitorApplicationController } from '../../controllers/visitor-application.controller.js';

const router: Router = Router();
const visitorApplicationController = new VisitorApplicationController();

// 获取访客申请列表
router.get('/', 
  authenticate,
  requirePermission('visitor', 'read'),
  degradationCheck('visitor_applications'),
  asyncHandler(visitorApplicationController.getVisitorApplications.bind(visitorApplicationController))
);

// 获取单个访客申请
router.get('/:id',
  authenticate,
  requirePermission('visitor', 'read'),
  degradationCheck('visitor_applications'),
  asyncHandler(visitorApplicationController.getVisitorApplication.bind(visitorApplicationController))
);

// 创建访客申请
router.post('/',
  authenticate,
  requirePermission('visitor', 'write'),
  degradationCheck('visitor_applications'),
  asyncHandler(visitorApplicationController.createVisitorApplication.bind(visitorApplicationController))
);

// 审批访客申请
router.post('/:id/approve',
  authenticate,
  requirePermission('visitor', 'write'),
  degradationCheck('visitor_applications'),
  asyncHandler(visitorApplicationController.approveVisitorApplication.bind(visitorApplicationController))
);

// 拒绝访客申请
router.post('/:id/reject',
  authenticate,
  requirePermission('visitor', 'write'),
  degradationCheck('visitor_applications'),
  asyncHandler(visitorApplicationController.rejectVisitorApplication.bind(visitorApplicationController))
);

// 批量审批访客申请
router.post('/batch-approve',
  authenticate,
  requirePermission('visitor', 'write'),
  degradationCheck('visitor_applications'),
  asyncHandler(visitorApplicationController.batchApproveVisitorApplications.bind(visitorApplicationController))
);

export default router;