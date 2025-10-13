/**
 * 认证和授权相关类型定义
 */

// 用户角色枚举
export enum UserRole {
  TENANT_ADMIN = 'tenant_admin',
  MERCHANT_ADMIN = 'merchant_admin', 
  MERCHANT_EMPLOYEE = 'merchant_employee',
  VISITOR = 'visitor'
}

// 权限枚举
export enum Permission {
  // 租务管理权限
  MANAGE_TENANTS = 'manage_tenants',
  MANAGE_MERCHANTS = 'manage_merchants',
  MANAGE_SPACES = 'manage_spaces',
  VIEW_ALL_ACCESS_RECORDS = 'view_all_access_records',
  
  // 商户管理权限
  MANAGE_EMPLOYEES = 'manage_employees',
  MANAGE_VISITORS = 'manage_visitors',
  VIEW_MERCHANT_ACCESS_RECORDS = 'view_merchant_access_records',
  APPROVE_VISITOR_APPLICATIONS = 'approve_visitor_applications',
  
  // 员工权限
  VIEW_OWN_ACCESS_RECORDS = 'view_own_access_records',
  APPLY_FOR_VISITOR = 'apply_for_visitor',
  
  // 访客权限
  VIEW_OWN_APPLICATIONS = 'view_own_applications',
  SUBMIT_VISITOR_APPLICATION = 'submit_visitor_application'
}

// 基础用户信息
export interface BaseUser {
  id: number
  name: string
  email: string
  phone?: string
  avatar?: string
  status: 'active' | 'inactive' | 'suspended'
  createdAt: string
  updatedAt: string
}

// 租务管理员
export interface TenantAdmin extends BaseUser {
  userType: UserRole.TENANT_ADMIN
  tenantId: number
  tenantName: string
}

// 商户管理员
export interface MerchantAdmin extends BaseUser {
  userType: UserRole.MERCHANT_ADMIN
  merchantId: number
  merchantName: string
  tenantId: number
}

// 商户员工
export interface MerchantEmployee extends BaseUser {
  userType: UserRole.MERCHANT_EMPLOYEE
  merchantId: number
  merchantName: string
  tenantId: number
  employeeId: string
  department?: string
  position?: string
}

// 访客
export interface Visitor extends BaseUser {
  userType: UserRole.VISITOR
  openId?: string
  unionId?: string
}

// 联合用户类型
export type User = TenantAdmin | MerchantAdmin | MerchantEmployee | Visitor

// 登录凭据
export interface LoginCredentials {
  email: string
  password: string
}

// 微信登录凭据
export interface WechatLoginCredentials {
  code: string
  userInfo?: {
    nickName: string
    avatarUrl: string
  }
}

// 登录响应
export interface LoginResponse {
  token: string
  refreshToken: string
  user: User
  permissions: Permission[]
  expiresIn: number
}

// JWT Token 载荷
export interface JwtPayload {
  userId: number
  userType: UserRole
  merchantId?: number
  tenantId?: number
  permissions: Permission[]
  iat: number
  exp: number
}

// 认证状态
export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  refreshToken: string | null
  permissions: Permission[]
  loading: boolean
  error: string | null
}

// Token 刷新响应
export interface TokenRefreshResponse {
  token: string
  refreshToken?: string
  expiresIn: number
}

// 权限检查选项
export interface PermissionCheckOptions {
  requireAll?: boolean // 是否需要所有权限都满足
  allowSuperUser?: boolean // 是否允许超级用户绕过权限检查
}

// 路由守卫配置
export interface RouteGuardConfig {
  requiredPermissions?: Permission[]
  requiredRoles?: UserRole[]
  redirectTo?: string
  onUnauthorized?: () => void
}

// 认证事件类型
export enum AuthEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token_refresh',
  TOKEN_EXPIRED = 'token_expired',
  PERMISSION_DENIED = 'permission_denied'
}

// 认证事件
export interface AuthEvent {
  type: AuthEventType
  payload?: any
  timestamp: number
}