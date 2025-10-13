/**
 * 路由守卫
 * 提供基于认证和权限的路由保护
 */

import { AuthService } from './auth-service'
import { PermissionManager } from './permission-manager'
import { RouteGuardConfig, Permission, UserRole, AuthEventType } from './types'

export class RouteGuard {
  private authService: AuthService
  private defaultRedirectTo: string
  private onUnauthorizedDefault?: () => void

  constructor(
    authService: AuthService,
    defaultRedirectTo = '/login',
    onUnauthorizedDefault?: () => void
  ) {
    this.authService = authService
    this.defaultRedirectTo = defaultRedirectTo
    this.onUnauthorizedDefault = onUnauthorizedDefault
  }

  /**
   * 检查路由访问权限
   */
  canActivate(config: RouteGuardConfig = {}): boolean {
    const {
      requiredPermissions = [],
      requiredRoles = [],
      redirectTo = this.defaultRedirectTo,
      onUnauthorized = this.onUnauthorizedDefault
    } = config

    // 检查是否已认证
    if (!this.authService.isAuthenticated()) {
      this.handleUnauthorized(redirectTo, onUnauthorized, '用户未登录')
      return false
    }

    const currentUser = this.authService.getCurrentUser()
    if (!currentUser) {
      this.handleUnauthorized(redirectTo, onUnauthorized, '用户信息不存在')
      return false
    }

    // 检查角色权限
    if (requiredRoles.length > 0) {
      const hasRequiredRole = PermissionManager.hasAnyRole(currentUser, requiredRoles)
      if (!hasRequiredRole) {
        this.handleUnauthorized(redirectTo, onUnauthorized, '用户角色权限不足')
        return false
      }
    }

    // 检查功能权限
    if (requiredPermissions.length > 0) {
      const hasRequiredPermissions = PermissionManager.hasAllPermissions(
        currentUser,
        requiredPermissions
      )
      if (!hasRequiredPermissions) {
        this.handleUnauthorized(redirectTo, onUnauthorized, '用户功能权限不足')
        return false
      }
    }

    return true
  }

  /**
   * 创建权限检查中间件（用于 React Router 等）
   */
  createPermissionGuard(config: RouteGuardConfig = {}) {
    return (Component: React.ComponentType<any>) => {
      return (props: any) => {
        if (this.canActivate(config)) {
          return React.createElement(Component, props)
        }
        return null // 或者返回一个加载/重定向组件
      }
    }
  }

  /**
   * 创建异步路由守卫
   */
  async canActivateAsync(config: RouteGuardConfig = {}): Promise<boolean> {
    // 如果用户未认证，尝试从 token 恢复
    if (!this.authService.isAuthenticated()) {
      try {
        await this.authService.getCurrentUserInfo()
      } catch (error) {
        this.handleUnauthorized(
          config.redirectTo || this.defaultRedirectTo,
          config.onUnauthorized || this.onUnauthorizedDefault,
          '认证失败'
        )
        return false
      }
    }

    return this.canActivate(config)
  }

  /**
   * 检查特定权限
   */
  requirePermission(permission: Permission): boolean {
    return this.canActivate({ requiredPermissions: [permission] })
  }

  /**
   * 检查特定角色
   */
  requireRole(role: UserRole): boolean {
    return this.canActivate({ requiredRoles: [role] })
  }

  /**
   * 检查商户访问权限
   */
  requireMerchantAccess(merchantId: number): boolean {
    if (!this.authService.isAuthenticated()) {
      return false
    }

    return this.authService.canAccessMerchant(merchantId)
  }

  /**
   * 创建商户访问守卫
   */
  createMerchantGuard(getMerchantId: () => number) {
    return (Component: React.ComponentType<any>) => {
      return (props: any) => {
        const merchantId = getMerchantId()
        if (this.requireMerchantAccess(merchantId)) {
          return React.createElement(Component, props)
        }
        return null
      }
    }
  }

  /**
   * 处理未授权访问
   */
  private handleUnauthorized(
    redirectTo?: string,
    onUnauthorized?: () => void,
    reason?: string
  ): void {
    // 发出权限拒绝事件
    this.authService.addEventListener(AuthEventType.PERMISSION_DENIED, () => {
      console.warn('Route access denied:', reason)
    })

    // 执行自定义处理函数
    if (onUnauthorized) {
      onUnauthorized()
      return
    }

    // 默认重定向到登录页
    if (redirectTo && typeof window !== 'undefined') {
      const currentPath = window.location.pathname
      const loginUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`
      window.location.href = loginUrl
    }
  }
}

/**
 * React Hook 形式的路由守卫
 */
export function useRouteGuard(authService: AuthService) {
  const routeGuard = new RouteGuard(authService)

  return {
    canActivate: (config?: RouteGuardConfig) => routeGuard.canActivate(config),
    requirePermission: (permission: Permission) => routeGuard.requirePermission(permission),
    requireRole: (role: UserRole) => routeGuard.requireRole(role),
    requireMerchantAccess: (merchantId: number) => routeGuard.requireMerchantAccess(merchantId),
    isAuthenticated: () => authService.isAuthenticated(),
    getCurrentUser: () => authService.getCurrentUser(),
    hasPermission: (permission: Permission) => authService.hasPermission(permission),
    hasRole: (role: UserRole) => authService.hasRole(role)
  }
}

/**
 * 高阶组件：权限保护
 */
export function withPermission(
  permission: Permission,
  authService: AuthService,
  fallbackComponent?: React.ComponentType
) {
  return function<P extends object>(Component: React.ComponentType<P>) {
    return function PermissionProtectedComponent(props: P) {
      const routeGuard = new RouteGuard(authService)
      
      if (routeGuard.requirePermission(permission)) {
        return React.createElement(Component, props)
      }
      
      if (fallbackComponent) {
        return React.createElement(fallbackComponent, props)
      }
      
      return React.createElement('div', {}, '权限不足')
    }
  }
}

/**
 * 高阶组件：角色保护
 */
export function withRole(
  role: UserRole,
  authService: AuthService,
  fallbackComponent?: React.ComponentType
) {
  return function<P extends object>(Component: React.ComponentType<P>) {
    return function RoleProtectedComponent(props: P) {
      const routeGuard = new RouteGuard(authService)
      
      if (routeGuard.requireRole(role)) {
        return React.createElement(Component, props)
      }
      
      if (fallbackComponent) {
        return React.createElement(fallbackComponent, props)
      }
      
      return React.createElement('div', {}, '角色权限不足')
    }
  }
}