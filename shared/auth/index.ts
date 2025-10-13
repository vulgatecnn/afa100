/**
 * 认证和授权模块
 * 提供统一的认证、授权、权限管理和路由保护功能
 */

export { AuthService } from './auth-service'
export { TokenManager } from './token-manager'
export { PermissionManager } from './permission-manager'
export { RouteGuard, useRouteGuard, withPermission, withRole } from './route-guard'

export type {
  User,
  TenantAdmin,
  MerchantAdmin,
  MerchantEmployee,
  Visitor,
  LoginCredentials,
  WechatLoginCredentials,
  LoginResponse,
  AuthState,
  TokenRefreshResponse,
  JwtPayload,
  PermissionCheckOptions,
  RouteGuardConfig,
  AuthEvent
} from './types'

export {
  UserRole,
  Permission,
  AuthEventType
} from './types'