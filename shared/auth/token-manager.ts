/**
 * JWT Token 管理器
 * 负责 token 的存储、获取、刷新和验证
 */

import { JwtPayload, TokenRefreshResponse } from './types'

export class TokenManager {
  private static readonly TOKEN_KEY = 'auth_token'
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token'
  private static readonly TOKEN_EXPIRY_KEY = 'token_expiry'
  
  private refreshPromise: Promise<string> | null = null
  private refreshCallback?: () => Promise<TokenRefreshResponse>

  constructor(refreshCallback?: () => Promise<TokenRefreshResponse>) {
    this.refreshCallback = refreshCallback
  }

  /**
   * 设置 token 刷新回调
   */
  setRefreshCallback(callback: () => Promise<TokenRefreshResponse>): void {
    this.refreshCallback = callback
  }

  /**
   * 存储 token
   */
  setToken(token: string, refreshToken?: string, expiresIn?: number): void {
    if (typeof window === 'undefined') return

    localStorage.setItem(TokenManager.TOKEN_KEY, token)
    
    if (refreshToken) {
      localStorage.setItem(TokenManager.REFRESH_TOKEN_KEY, refreshToken)
    }

    if (expiresIn) {
      const expiryTime = Date.now() + (expiresIn * 1000)
      localStorage.setItem(TokenManager.TOKEN_EXPIRY_KEY, expiryTime.toString())
    }
  }

  /**
   * 获取 token
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TokenManager.TOKEN_KEY)
  }

  /**
   * 获取刷新 token
   */
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TokenManager.REFRESH_TOKEN_KEY)
  }

  /**
   * 获取 token 过期时间
   */
  getTokenExpiry(): number | null {
    if (typeof window === 'undefined') return null
    const expiry = localStorage.getItem(TokenManager.TOKEN_EXPIRY_KEY)
    return expiry ? parseInt(expiry, 10) : null
  }

  /**
   * 检查 token 是否存在
   */
  hasToken(): boolean {
    return !!this.getToken()
  }

  /**
   * 检查 token 是否过期
   */
  isTokenExpired(): boolean {
    const expiry = this.getTokenExpiry()
    if (!expiry) return true
    
    // 提前 5 分钟判断为过期，给刷新留出时间
    return Date.now() > (expiry - 5 * 60 * 1000)
  }

  /**
   * 检查 token 是否即将过期（15分钟内）
   */
  isTokenExpiringSoon(): boolean {
    const expiry = this.getTokenExpiry()
    if (!expiry) return true
    
    // 15 分钟内过期
    return Date.now() > (expiry - 15 * 60 * 1000)
  }

  /**
   * 解析 JWT token
   */
  parseToken(token?: string): JwtPayload | null {
    const tokenToParse = token || this.getToken()
    if (!tokenToParse) return null

    try {
      const parts = tokenToParse.split('.')
      if (parts.length !== 3) return null

      const payload = parts[1]
      const decoded = JSON.parse(atob(payload))
      return decoded as JwtPayload
    } catch (error) {
      console.error('Failed to parse JWT token:', error)
      return null
    }
  }

  /**
   * 获取当前用户信息（从 token 中解析）
   */
  getCurrentUser(): JwtPayload | null {
    const token = this.getToken()
    if (!token || this.isTokenExpired()) return null
    
    return this.parseToken(token)
  }

  /**
   * 刷新 token
   */
  async refreshToken(): Promise<string> {
    // 如果已经有刷新请求在进行中，返回同一个 Promise
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    if (!this.refreshCallback) {
      throw new Error('Token refresh callback not set')
    }

    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    this.refreshPromise = this.performTokenRefresh()
    
    try {
      const newToken = await this.refreshPromise
      return newToken
    } finally {
      this.refreshPromise = null
    }
  }

  /**
   * 执行 token 刷新
   */
  private async performTokenRefresh(): Promise<string> {
    try {
      const response = await this.refreshCallback!()
      
      this.setToken(
        response.token,
        response.refreshToken,
        response.expiresIn
      )
      
      return response.token
    } catch (error) {
      // 刷新失败，清除所有 token
      this.clearTokens()
      throw error
    }
  }

  /**
   * 自动刷新 token（如果即将过期）
   */
  async autoRefreshToken(): Promise<string | null> {
    if (!this.hasToken()) return null
    
    if (this.isTokenExpired()) {
      try {
        return await this.refreshToken()
      } catch (error) {
        console.error('Auto refresh token failed:', error)
        return null
      }
    }
    
    if (this.isTokenExpiringSoon()) {
      // 异步刷新，不等待结果
      this.refreshToken().catch(error => {
        console.error('Background token refresh failed:', error)
      })
    }
    
    return this.getToken()
  }

  /**
   * 清除所有 token
   */
  clearTokens(): void {
    if (typeof window === 'undefined') return

    localStorage.removeItem(TokenManager.TOKEN_KEY)
    localStorage.removeItem(TokenManager.REFRESH_TOKEN_KEY)
    localStorage.removeItem(TokenManager.TOKEN_EXPIRY_KEY)
  }

  /**
   * 验证 token 格式
   */
  validateTokenFormat(token: string): boolean {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return false
      
      // 尝试解析 header 和 payload
      JSON.parse(atob(parts[0]))
      JSON.parse(atob(parts[1]))
      
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取 token 剩余有效时间（秒）
   */
  getTokenRemainingTime(): number {
    const expiry = this.getTokenExpiry()
    if (!expiry) return 0
    
    const remaining = Math.max(0, expiry - Date.now())
    return Math.floor(remaining / 1000)
  }

  /**
   * 设置 token 过期监听器
   */
  onTokenExpiry(callback: () => void): () => void {
    const checkExpiry = () => {
      if (this.hasToken() && this.isTokenExpired()) {
        callback()
      }
    }

    // 每分钟检查一次
    const interval = setInterval(checkExpiry, 60 * 1000)
    
    // 返回清理函数
    return () => clearInterval(interval)
  }
}