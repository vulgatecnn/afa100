/**
 * 权限管理器
 * 负责权限检查、角色验证和权限控制
 */

import { User, UserRole, Permission, PermissionCheckOptions } from './types'

export class PermissionManager {
  private static rolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.TENANT_ADMIN]: [
      Permission.MANAGE_TENANTS,
      Permission.MANAGE_MERCHANTS,
      Permission.MANAGE_SPACES,
      Permission.VIEW_ALL_ACCESS_RECORDS,
      Permission.MANAGE_EMPLOYEES,
      Permission.MANAGE_VISITORS,
      Permission.VIEW_MERCHANT_ACCESS_RECORDS,
      Permission.APPROVE_VISITOR_APPLICATIONS,
      Permission.VIEW_OWN_ACCESS_RECORDS,
      Permission.APPLY_FOR_VISITOR,
      Permission.VIEW_OWN_APPLICATIONS,
      Permission.SUBMIT_VISITOR_APPLICATION
    ],
    [UserRole.MERCHANT_ADMIN]: [
      Permission.MANAGE_EMPLOYEES,
      Permission.MANAGE_VISITORS,
      Permission.VIEW_MERCHANT_ACCESS_RECORDS,
      Permission.APPROVE_VISITOR_APPLICATIONS,
      Permission.VIEW_OWN_ACCESS_RECORDS,
      Permission.APPLY_FOR_VISITOR,
      Permission.VIEW_OWN_APPLICATIONS,
      Permission.SUBMIT_VISITOR_APPLICATION
    ],
    [UserRole.MERCHANT_EMPLOYEE]: [
      Permission.VIEW_OWN_ACCESS_RECORDS,
      Permission.APPLY_FOR_VISITOR,
      Permission.VIEW_OWN_APPLICATIONS,
      Permission.SUBMIT_VISITOR_APPLICATION
    ],
    [UserRole.VISITOR]: [
      Permission.VIEW_OWN_APPLICATIONS,
      Permission.SUBMIT_VISITOR_APPLICATION
    ]
  }

  /**
   * 获取角色的所有权限
   */
  static getRolePermissions(role: UserRole): Permission[] {
    return this.rolePermissions[role] || []
  }

  /**
   * 获取用户的所有权限
   */
  static getUserPermissions(user: User): Permission[] {
    return this.getRolePermissions(user.userType)
  }

  /**
   * 检查用户是否有指定权限
   */
  static hasPermission(
    user: User | null,
    permission: Permission,
    options: PermissionCheckOptions = {}
  ): boolean {
    if (!user) return false

    const { allowSuperUser = true } = options

    // 租务管理员是超级用户，拥有所有权限
    if (allowSuperUser && user.userType === UserRole.TENANT_ADMIN) {
      return true
    }

    const userPermissions = this.getUserPermissions(user)
    return userPermissions.includes(permission)
  }

  /**
   * 检查用户是否有指定权限列表中的任一权限
   */
  static hasAnyPermission(
    user: User | null,
    permissions: Permission[],
    options: PermissionCheckOptions = {}
  ): boolean {
    if (!user || permissions.length === 0) return false

    return permissions.some(permission => 
      this.hasPermission(user, permission, options)
    )
  }

  /**
   * 检查用户是否有指定权限列表中的所有权限
   */
  static hasAllPermissions(
    user: User | null,
    permissions: Permission[],
    options: PermissionCheckOptions = {}
  ): boolean {
    if (!user || permissions.length === 0) return false

    return permissions.every(permission => 
      this.hasPermission(user, permission, options)
    )
  }

  /**
   * 检查用户是否有指定角色
   */
  static hasRole(user: User | null, role: UserRole): boolean {
    if (!user) return false
    return user.userType === role
  }

  /**
   * 检查用户是否有指定角色列表中的任一角色
   */
  static hasAnyRole(user: User | null, roles: UserRole[]): boolean {
    if (!user || roles.length === 0) return false
    return roles.includes(user.userType)
  }

  /**
   * 检查用户是否可以访问指定商户的资源
   */
  static canAccessMerchant(user: User | null, merchantId: number): boolean {
    if (!user) return false

    // 租务管理员可以访问所有商户
    if (user.userType === UserRole.TENANT_ADMIN) {
      return true
    }

    // 商户管理员和员工只能访问自己的商户
    if ('merchantId' in user) {
      return user.merchantId === merchantId
    }

    return false
  }

  /**
   * 检查用户是否可以访问指定租户的资源
   */
  static canAccessTenant(user: User | null, tenantId: number): boolean {
    if (!user) return false

    // 检查用户是否属于指定租户
    if ('tenantId' in user) {
      return user.tenantId === tenantId
    }

    return false
  }

  /**
   * 检查用户是否可以管理指定用户
   */
  static canManageUser(manager: User | null, targetUser: User): boolean {
    if (!manager) return false

    // 租务管理员可以管理所有用户
    if (manager.userType === UserRole.TENANT_ADMIN) {
      return true
    }

    // 商户管理员可以管理同商户的员工
    if (manager.userType === UserRole.MERCHANT_ADMIN && 
        'merchantId' in manager && 'merchantId' in targetUser) {
      return manager.merchantId === targetUser.merchantId &&
             targetUser.userType === UserRole.MERCHANT_EMPLOYEE
    }

    return false
  }

  /**
   * 获取用户可以访问的商户ID列表
   */
  static getAccessibleMerchantIds(user: User | null): number[] {
    if (!user) return []

    // 租务管理员可以访问所有商户（这里返回空数组表示无限制）
    if (user.userType === UserRole.TENANT_ADMIN) {
      return []
    }

    // 商户管理员和员工只能访问自己的商户
    if ('merchantId' in user) {
      return [user.merchantId]
    }

    return []
  }

  /**
   * 检查权限并抛出错误（如果没有权限）
   */
  static requirePermission(
    user: User | null,
    permission: Permission,
    options: PermissionCheckOptions = {}
  ): void {
    if (!this.hasPermission(user, permission, options)) {
      throw new Error(`权限不足：需要 ${permission} 权限`)
    }
  }

  /**
   * 检查角色并抛出错误（如果没有角色）
   */
  static requireRole(user: User | null, role: UserRole): void {
    if (!this.hasRole(user, role)) {
      throw new Error(`权限不足：需要 ${role} 角色`)
    }
  }

  /**
   * 检查商户访问权限并抛出错误
   */
  static requireMerchantAccess(user: User | null, merchantId: number): void {
    if (!this.canAccessMerchant(user, merchantId)) {
      throw new Error(`权限不足：无法访问商户 ${merchantId}`)
    }
  }

  /**
   * 过滤用户可以访问的资源
   */
  static filterAccessibleResources<T extends { merchantId?: number; tenantId?: number }>(
    user: User | null,
    resources: T[]
  ): T[] {
    if (!user) return []

    // 租务管理员可以访问所有资源
    if (user.userType === UserRole.TENANT_ADMIN) {
      return resources
    }

    return resources.filter(resource => {
      // 检查商户权限
      if (resource.merchantId !== undefined) {
        return this.canAccessMerchant(user, resource.merchantId)
      }

      // 检查租户权限
      if (resource.tenantId !== undefined) {
        return this.canAccessTenant(user, resource.tenantId)
      }

      return true
    })
  }

  /**
   * 创建权限检查装饰器
   */
  static createPermissionDecorator(permission: Permission) {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value

      descriptor.value = function(this: any, ...args: any[]) {
        const user = this.getCurrentUser?.() || this.user
        PermissionManager.requirePermission(user, permission)
        return originalMethod.apply(this, args)
      }

      return descriptor
    }
  }

  /**
   * 创建角色检查装饰器
   */
  static createRoleDecorator(role: UserRole) {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value

      descriptor.value = function(this: any, ...args: any[]) {
        const user = this.getCurrentUser?.() || this.user
        PermissionManager.requireRole(user, role)
        return originalMethod.apply(this, args)
      }

      return descriptor
    }
  }
}