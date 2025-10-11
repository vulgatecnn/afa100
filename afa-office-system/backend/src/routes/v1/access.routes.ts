import { Router } from 'express';
import { AccessController } from '../../controllers/access.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { validateQuery } from '../../middleware/validation.middleware.js';
import Joi from 'joi';

const router: Router = Router();
const accessController = new AccessController();

// 通行码验证接口（供硬件设备调用，不需要认证）
router.post('/validate', accessController.validatePasscode);
router.post('/validate/qr', accessController.validateQRPasscode);
router.post('/validate/time-based', accessController.validateTimeBasedPasscode);
router.get('/passcode/:code/info', accessController.getPasscodeInfo);

// 实时状态接口（可选认证）
router.get('/status/realtime', authenticate, accessController.getRealtimeStatus);

// 需要认证的接口
router.use(authenticate);

// 用户通行码管理
router.get('/passcode/current', requirePermission('passcode', 'read'), accessController.getCurrentPasscode);
router.post('/passcode/refresh', requirePermission('passcode', 'write'), accessController.refreshPasscode);

// 通行记录查询（需要相应权限）
router.get('/records', requirePermission('access', 'read'), accessController.getAccessRecords);
router.get('/records/user/:userId', requirePermission('access', 'read'), accessController.getUserAccessRecords);
router.get('/records/device/:deviceId', requirePermission('access', 'read'), accessController.getDeviceAccessRecords);

// 统计信息（需要管理员权限）
router.get('/stats', requirePermission('access', 'read'), accessController.getAccessStats);

export default router;