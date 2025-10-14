// 中间件统一导出文件
// 导出所有中间件函数和相关类型

// 认证中间件
export {
  authenticate,
  optionalAuth,
  requireUserType,
  requireMerchantAccess,
  requireAdmin,
  requireTenantAdmin,
  requireMerchantAdmin,
  requireEmployee,
  requireVisitor
} from './auth.middleware.js';

// 错误处理中间件
export {
  AppError,
  ErrorCodes,
  errorHandler,
  asyncHandler
} from './error.middleware.js';

// 日志中间件
export {
  requestLogger,
  logApiResponse
} from './logger.middleware.js';

// 验证中间件
export {
  validate,
  validateQuery,
  validateParams,
  commonValidations
} from './validation.middleware.js';

// 权限中间件
export {
  requirePermission,
  requireMerchantResource,
  permissions
} from './permission.middleware.js';

// 维护模式中间件
export {
  maintenanceCheck,
  degradationCheck
} from './maintenance.middleware.js';

// 404处理中间件
export {
  notFound
} from './not-found.middleware.js';

// 限流中间件
export {
  rateLimits
} from './rate-limit.middleware.js';

// 安全头中间件
export {
  securityHeaders
} from './security.middleware.js';

// 导出中间件相关的类型
export type {
  AuthenticatedRequest,
  UserContext,
  JwtPayload
} from '../types/index.js';