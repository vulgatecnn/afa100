/**
 * 统计数据路由
 */

import { Router } from 'express';
import { asyncHandler } from '../../middleware/error.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { degradationCheck } from '../../middleware/maintenance.middleware.js';
import { StatisticsController } from '../../controllers/statistics.controller.js';

const router: Router = Router();
const statisticsController = new StatisticsController();

// 访客统计
router.get('/visitors', 
  authenticate,
  requirePermission('statistics', 'read'),
  degradationCheck('statistics'),
  asyncHandler(statisticsController.getVisitorStatistics.bind(statisticsController))
);

// 通行统计
router.get('/access', 
  authenticate,
  requirePermission('statistics', 'read'),
  degradationCheck('statistics'),
  asyncHandler(statisticsController.getAccessStatistics.bind(statisticsController))
);

export default router;