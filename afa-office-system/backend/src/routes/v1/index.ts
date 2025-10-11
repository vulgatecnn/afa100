import express from 'express';

const router: express.Router = express.Router();

// V1 API信息
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'AFA办公小程序 API v1',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      merchant: '/api/v1/merchant',
      space: '/api/v1/space',
      tenant: '/api/v1/tenant',
      visitor: '/api/v1/visitor',
      employee: '/api/v1/employee',
      access: '/api/v1/access',
    },
    timestamp: new Date().toISOString(),
  });
});

// 导入路由模块
import authRoutes from './auth.routes.js';
import merchantRoutes from './merchant.routes.js';
import spaceRoutes from './space.routes.js';
import employeeRoutes from './employee.routes.js';
import employeeApplicationRoutes from './employee-application.routes.js';
import visitorRoutes from './visitor.routes.js';
import tenantRoutes from './tenant.routes.js';
import accessRoutes from './access.routes.js';

router.use('/auth', authRoutes);
router.use('/merchants', merchantRoutes);
router.use('/merchants', employeeRoutes);
router.use('/employee', employeeApplicationRoutes);
router.use('/merchants', employeeApplicationRoutes);
router.use('/merchants', visitorRoutes);
router.use('/visitor', visitorRoutes);
router.use('/space', spaceRoutes);
router.use('/tenant', tenantRoutes);
router.use('/access', accessRoutes);

export default router;