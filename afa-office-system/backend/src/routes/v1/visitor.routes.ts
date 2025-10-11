import { Router } from 'express';
import { VisitorController } from '../../controllers/visitor.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireUserType } from '../../middleware/auth.middleware.js';
import { requireMerchantResource } from '../../middleware/permission.middleware.js';

const router: Router = Router();
const visitorController = new VisitorController();

// 所有访客管理路由都需要认证
router.use(authenticate);

/**
 * 访客管理路由
 * 基础路径: /api/v1/merchants/:merchantId/visitors
 */

// 获取访客申请列表
router.get(
  '/:merchantId/visitors/applications',
  requireUserType('merchant_admin', 'employee'),
  requireMerchantResource(),
  visitorController.getVisitorApplications.bind(visitorController)
);

// 获取访客申请详情
router.get(
  '/:merchantId/visitors/applications/:applicationId',
  requireUserType('merchant_admin', 'employee'),
  requireMerchantResource(),
  visitorController.getVisitorApplicationById.bind(visitorController)
);

// 审批访客申请
router.post(
  '/:merchantId/visitors/applications/:applicationId/approve',
  requireUserType('merchant_admin', 'employee'),
  requireMerchantResource(),
  visitorController.approveVisitorApplication.bind(visitorController)
);

// 拒绝访客申请
router.post(
  '/:merchantId/visitors/applications/:applicationId/reject',
  requireUserType('merchant_admin', 'employee'),
  requireMerchantResource(),
  visitorController.rejectVisitorApplication.bind(visitorController)
);

// 批量审批访客申请
router.post(
  '/:merchantId/visitors/applications/batch-approve',
  requireUserType('merchant_admin'),
  requireMerchantResource(),
  visitorController.batchApproveApplications.bind(visitorController)
);

// 批量拒绝访客申请
router.post(
  '/:merchantId/visitors/applications/batch-reject',
  requireUserType('merchant_admin'),
  requireMerchantResource(),
  visitorController.batchRejectApplications.bind(visitorController)
);

// 获取访客申请统计信息
router.get(
  '/:merchantId/visitors/stats',
  requireUserType('merchant_admin'),
  requireMerchantResource(),
  visitorController.getVisitorStats.bind(visitorController)
);

// 获取待审批申请数量
router.get(
  '/:merchantId/visitors/pending-count',
  requireUserType('merchant_admin', 'employee'),
  requireMerchantResource(),
  visitorController.getPendingApplicationsCount.bind(visitorController)
);

// 获取即将过期的申请
router.get(
  '/:merchantId/visitors/expiring',
  requireUserType('merchant_admin'),
  requireMerchantResource(),
  visitorController.getExpiringApplications.bind(visitorController)
);

/**
 * 访客小程序相关路由
 * 基础路径: /api/v1/visitor
 */

// 获取商户列表（供访客选择）
router.get(
  '/merchants',
  visitorController.getMerchants.bind(visitorController)
);

// 提交访客申请
router.post(
  '/apply',
  visitorController.submitApplication.bind(visitorController)
);

// 获取我的申请列表
router.get(
  '/applications',
  requireUserType('visitor'),
  visitorController.getMyApplications.bind(visitorController)
);

// 获取申请详情
router.get(
  '/applications/:applicationId',
  requireUserType('visitor'),
  visitorController.getApplicationDetail.bind(visitorController)
);

// 获取通行码
router.get(
  '/passcode/:applicationId',
  requireUserType('visitor'),
  visitorController.getPasscode.bind(visitorController)
);

// 刷新通行码
router.post(
  '/passcode/:applicationId/refresh',
  requireUserType('visitor'),
  visitorController.refreshPasscode.bind(visitorController)
);

// 获取访客通行码信息（供访客小程序使用）
router.get(
  '/applications/:applicationId/passcode/:applicantId',
  requireUserType('visitor'),
  visitorController.getVisitorPasscode.bind(visitorController)
);

export default router;