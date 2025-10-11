import api from './api'

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    id: number
    name: string
    email: string
    userType: string
  }
}

export interface User {
  id: number
  name: string
  email: string
  userType: string
}

class AuthService {
  /**
   * 用户登录
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post('/auth/login', credentials)
    return response
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<User> {
    const response = await api.get('/auth/me')
    return response
  }

  /**
   * 刷新token
   */
  async refreshToken(): Promise<{ token: string }> {
    const response = await api.post('/auth/refresh')
    return response
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    await api.post('/auth/logout')
  }
}

export const authService = new AuthService()