/**
 * 统一认证服务
 * 提供登录、登出、token 管理和用户信息管理
 */

import { ApiClient } from '../api-client'
import { TokenManager } from './token-manager'
import { PermissionManager } from './permission-manager'
import {
  User,
  LoginCredentials,
  WechatLoginCredentials,
  LoginResponse,
  TokenRefreshResponse,
  AuthState,
  AuthEvent,
  AuthEventType,
  Permission,
  UserRole
} from './types'

export class AuthService {
  private apiClient: ApiClient
  private tokenManager: TokenManager
  private authState: AuthState
  private eventListeners: Map<AuthEventType, Array<(event: AuthEvent) => void>> = new Map()

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient
    this.tokenManager = new TokenManager(() => this.performTokenRefresh())
    
    // 初始化认证状态
    this.authState = {
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
      permissions: [],
      loading: false,
      error: null
    }

    // 从本地存储恢复认证状态
    this.restoreAuthState()
  }

  /**
   * 获取当前认证状态
   */
  getAuthState(): AuthState {
    return { ...this.authState }
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated && !!this.authState.user
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): User | null {
    return this.authState.user
  }

  /**
   * 获取当前用户权限
   */
  getCurrentPermissions(): Permission[] {
    return this.authState.permissions
  }

  /**
   * 用户登录
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      this.setLoading(true)
      this.clearError()

      const response = await this.apiClient.post<LoginResponse>('/auth/login', credentials)
      
      await this.handleLoginSuccess(response)
      this.emitEvent(AuthEventType.LOGIN_SUCCESS, { user: response.user })
      
      return response
    } catch (error) {
      this.handleLoginFailure(error)
      this.emitEvent(AuthEventType.LOGIN_FAILURE, { error })
      throw error
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * 微信登录
   */
  async wechatLogin(credentials: WechatLoginCredentials): Promise<LoginResponse> {
    try {
      this.setLoading(true)
      this.clearError()

      const response = await this.apiClient.post<LoginResponse>('/auth/wechat-login', credentials)
      
      await this.handleLoginSuccess(response)
      this.emitEvent(AuthEventType.LOGIN_SUCCESS, { user: response.user })
      
      return response
    } catch (error) {
      this.handleLoginFailure(error)
      this.emitEvent(AuthEventType.LOGIN_FAILURE, { error })
      throw error
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    try {
      // 调用后端登出接口
      await this.apiClient.post('/auth/logout')
    } catch (error) {
      console.error('Logout API call failed:', error)
      // 即使后端调用失败，也要清除本地状态
    } finally {
      this.handleLogout()
      this.emitEvent(AuthEventType.LOGOUT, {})
    }
  }

  /**
   * 刷新 token
   */
  async refreshToken(): Promise<string> {
    try {
      const newToken = await this.tokenManager.refreshToken()
      this.emitEvent(AuthEventType.TOKEN_REFRESH, { token: newToken })
      return newToken
    } catch (error) {
      this.handleTokenExpired()
      throw error
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUserInfo(): Promise<User> {
    const response = await this.apiClient.get<User>('/auth/me')
    
    // 更新本地用户信息
    this.updateUser(response)
    
    return response
  }

  /**
   * 更新用户信息
   */
  async updateUserInfo(userData: Partial<User>): Promise<User> {
    const response = await this.apiClient.put<User>('/auth/profile', userData)
    
    // 更新本地用户信息
    this.updateUser(response)
    
    return response
  }

  /**
   * 修改密码
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await this.apiClient.post('/auth/change-password', {
      oldPassword,
      newPassword
    })
  }

  /**
   * 检查权限
   */
  hasPermission(permission: Permission): boolean {
    return PermissionManager.hasPermission(this.authState.user, permission)
  }

  /**
   * 检查角色
   */
  hasRole(role: UserRole): boolean {
    return PermissionManager.hasRole(this.authState.user, role)
  }

  /**
   * 检查是否可以访问商户资源
   */
  canAccessMerchant(merchantId: number): boolean {
    return PermissionManager.canAccessMerchant(this.authState.user, merchantId)
  }

  /**
   * 添加认证事件监听器
   */
  addEventListener(type: AuthEventType, listener: (event: AuthEvent) => void): () => void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, [])
    }
    
    this.eventListeners.get(type)!.push(listener)
    
    // 返回移除监听器的函数
    return () => {
      const listeners = this.eventListeners.get(type)
      if (listeners) {
        const index = listeners.indexOf(listener)
        if (index > -1) {
          listeners.splice(index, 1)
        }
      }
    }
  }

  /**
   * 从本地存储恢复认证状态
   */
  private restoreAuthState(): void {
    const token = this.tokenManager.getToken()
    const refreshToken = this.tokenManager.getRefreshToken()
    
    if (token && !this.tokenManager.isTokenExpired()) {
      const payload = this.tokenManager.parseToken(token)
      if (payload) {
        // 这里需要从 token 中恢复用户信息
        // 实际项目中可能需要调用 API 获取完整用户信息
        this.authState = {
          ...this.authState,
          isAuthenticated: true,
          token,
          refreshToken,
          permissions: payload.permissions || []
        }
        
        // 异步获取完整用户信息
        this.getCurrentUserInfo().catch(error => {
          console.error('Failed to restore user info:', error)
          this.handleTokenExpired()
        })
      }
    }
  }

  /**
   * 处理登录成功
   */
  private async handleLoginSuccess(response: LoginResponse): Promise<void> {
    // 存储 token
    this.tokenManager.setToken(
      response.token,
      response.refreshToken,
      response.expiresIn
    )

    // 更新认证状态
    this.authState = {
      ...this.authState,
      isAuthenticated: true,
      user: response.user,
      token: response.token,
      refreshToken: response.refreshToken,
      permissions: response.permissions,
      error: null
    }
  }

  /**
   * 处理登录失败
   */
  private handleLoginFailure(error: any): void {
    this.authState = {
      ...this.authState,
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
      permissions: [],
      error: error.message || '登录失败'
    }
  }

  /**
   * 处理登出
   */
  private handleLogout(): void {
    this.tokenManager.clearTokens()
    
    this.authState = {
      ...this.authState,
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
      permissions: [],
      error: null
    }
  }

  /**
   * 处理 token 过期
   */
  private handleTokenExpired(): void {
    this.handleLogout()
    this.emitEvent(AuthEventType.TOKEN_EXPIRED, {})
  }

  /**
   * 执行 token 刷新
   */
  private async performTokenRefresh(): Promise<TokenRefreshResponse> {
    const refreshToken = this.tokenManager.getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await this.apiClient.post<TokenRefreshResponse>('/auth/refresh', {
      refreshToken
    })

    // 更新本地 token
    this.authState.token = response.token
    if (response.refreshToken) {
      this.authState.refreshToken = response.refreshToken
    }

    return response
  }

  /**
   * 更新用户信息
   */
  private updateUser(user: User): void {
    this.authState = {
      ...this.authState,
      user,
      permissions: PermissionManager.getUserPermissions(user)
    }
  }

  /**
   * 设置加载状态
   */
  private setLoading(loading: boolean): void {
    this.authState = {
      ...this.authState,
      loading
    }
  }

  /**
   * 清除错误
   */
  private clearError(): void {
    this.authState = {
      ...this.authState,
      error: null
    }
  }

  /**
   * 发出认证事件
   */
  private emitEvent(type: AuthEventType, payload?: any): void {
    const event: AuthEvent = {
      type,
      payload,
      timestamp: Date.now()
    }

    const listeners = this.eventListeners.get(type)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          console.error('Auth event listener error:', error)
        }
      })
    }
  }
}