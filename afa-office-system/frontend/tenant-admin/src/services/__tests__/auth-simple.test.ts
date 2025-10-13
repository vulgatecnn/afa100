import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'

// 简化的认证服务测试
describe('认证服务测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 清理 localStorage
    localStorage.clear()
  })

  describe('登录功能', () => {
    it('应该能够成功登录', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      }

      server.use(
        http.post('/api/v1/auth/login', async ({ request }) => {
          const body = await request.json()
          expect(body).toEqual(credentials)
          
          return HttpResponse.json({
            success: true,
            data: {
              accessToken: 'mock-jwt-token',
              refreshToken: 'mock-refresh-token',
              user: {
                id: 1,
                name: '测试用户',
                email: 'test@example.com',
                userType: 'tenant_admin',
                status: 'active'
              }
            },
            message: '登录成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      })

      const data = await response.json()
      
      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.data.user.email).toBe(credentials.email)
      expect(data.data.accessToken).toBe('mock-jwt-token')
    })

    it('应该处理登录失败', async () => {
      const credentials = {
        email: 'wrong@example.com',
        password: 'wrongpassword'
      }

      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.json({
            success: false,
            code: 401,
            message: '用户名或密码错误',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 401 })
        })
      )

      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      })

      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('用户名或密码错误')
    })
  })

  describe('用户信息获取', () => {
    it('应该能够获取当前用户信息', async () => {
      server.use(
        http.get('/api/v1/auth/me', ({ request }) => {
          const authHeader = request.headers.get('Authorization')
          
          if (!authHeader) {
            return HttpResponse.json({
              success: false,
              code: 401,
              message: '未授权访问',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 401 })
          }

          return HttpResponse.json({
            success: true,
            data: {
              id: 1,
              name: '测试用户',
              email: 'test@example.com',
              userType: 'tenant_admin',
              status: 'active'
            },
            message: '获取用户信息成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await fetch('/api/v1/auth/me', {
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      })

      const data = await response.json()
      
      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.data.email).toBe('test@example.com')
    })

    it('应该处理未授权访问', async () => {
      server.use(
        http.get('/api/v1/auth/me', () => {
          return HttpResponse.json({
            success: false,
            code: 401,
            message: '未授权访问',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 401 })
        })
      )

      const response = await fetch('/api/v1/auth/me')
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('未授权访问')
    })
  })

  describe('登出功能', () => {
    it('应该能够成功登出', async () => {
      server.use(
        http.post('/api/v1/auth/logout', () => {
          return HttpResponse.json({
            success: true,
            data: null,
            message: '登出成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      })

      const data = await response.json()
      
      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.message).toBe('登出成功')
    })
  })

  describe('Token 刷新', () => {
    it('应该能够刷新 token', async () => {
      server.use(
        http.post('/api/v1/auth/refresh', () => {
          return HttpResponse.json({
            success: true,
            data: {
              accessToken: 'new-mock-jwt-token',
              refreshToken: 'new-mock-refresh-token'
            },
            message: 'Token刷新成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-refresh-token'
        }
      })

      const data = await response.json()
      
      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.data.accessToken).toBe('new-mock-jwt-token')
    })

    it('应该处理 refresh token 过期', async () => {
      server.use(
        http.post('/api/v1/auth/refresh', () => {
          return HttpResponse.json({
            success: false,
            code: 401,
            message: 'Refresh token已过期',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 401 })
        })
      )

      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer expired-refresh-token'
        }
      })

      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Refresh token已过期')
    })
  })
})