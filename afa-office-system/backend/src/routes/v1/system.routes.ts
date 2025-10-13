/**
 * 系统管理路由
 * 处理系统维护、降级、健康检查等功能
 */

import { Router } from 'express';
import { asyncHandler } from '../../middleware/error.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { SystemController } from '../../controllers/system.controller.js';

const router: Router = Router();
const systemController = new SystemController();

// 系统维护管理
router.post('/maintenance', 
  authenticate, 
  requirePermission('system', 'manage'),
  asyncHandler(systemController.setMaintenanceMode.bind(systemController))
);

router.get('/maintenance/status',
  authenticate,
  asyncHandler(systemController.getMaintenanceStatus.bind(systemController))
);

router.get('/maintenance/logs',
  authenticate,
  requirePermission('system', 'read'),
  asyncHandler(systemController.getMaintenanceLogs.bind(systemController))
);

// 系统降级管理
router.get('/degradation/config',
  authenticate,
  asyncHandler(systemController.getDegradationConfig.bind(systemController))
);

router.post('/degradation/level',
  authenticate,
  requirePermission('system', 'manage'),
  asyncHandler(systemController.setDegradationLevel.bind(systemController))
);

router.get('/degradation/logs',
  authenticate,
  requirePermission('system', 'read'),
  asyncHandler(systemController.getDegradationLogs.bind(systemController))
);

// 系统健康检查
router.get('/health/detailed',
  authenticate,
  requirePermission('system', 'read'),
  asyncHandler(systemController.getDetailedHealth.bind(systemController))
);

router.get('/health/metrics',
  authenticate,
  requirePermission('system', 'read'),
  asyncHandler(systemController.getHealthMetrics.bind(systemController))
);

// 数据库管理
router.post('/database/recover',
  authenticate,
  requirePermission('system', 'manage'),
  asyncHandler(systemController.recoverDatabase.bind(systemController))
);

router.post('/database/maintenance',
  authenticate,
  requirePermission('system', 'manage'),
  asyncHandler(systemController.performDatabaseMaintenance.bind(systemController))
);

// 缓存管理
router.get('/cache/strategy',
  authenticate,
  asyncHandler(systemController.getCacheStrategy.bind(systemController))
);

router.post('/cache/clear',
  authenticate,
  requirePermission('system', 'manage'),
  asyncHandler(systemController.clearCache.bind(systemController))
);

// 系统日志
router.get('/logs/maintenance',
  authenticate,
  requirePermission('system', 'read'),
  asyncHandler(systemController.getMaintenanceLogs.bind(systemController))
);

router.get('/logs/degradation',
  authenticate,
  requirePermission('system', 'read'),
  asyncHandler(systemController.getDegradationLogs.bind(systemController))
);

// 测试端点（仅在非生产环境）
if (process.env.NODE_ENV !== 'production') {
  router.get('/test/uncaught-exception',
    authenticate,
    asyncHandler(systemController.testUncaughtException.bind(systemController))
  );

  router.post('/test/memory-exhaustion',
    authenticate,
    asyncHandler(systemController.testMemoryExhaustion.bind(systemController))
  );

  router.post('/test/circular-dependency',
    authenticate,
    asyncHandler(systemController.testCircularDependency.bind(systemController))
  );
}

export default router;