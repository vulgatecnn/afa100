import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { authService } from '../authService'
import type { LoginCredentials } from '../authService'

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('应该成功登录并返回用户信息和token', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      }

      const mockResponse = {
        token: 'mock-jwt-token',
        user: {
          id: 1,
          name: '测试用户',
          email: 'test@example.com',
          userType: 'tenant_admin'
        }
      }

      server.use(
        http.post('/api/v1/auth/login', async ({ request }) => {
          const body = await request.json() as LoginCredentials
          expect(body).toEqual(credentials)
          
          return HttpResponse.json({
            success: true,
            data: mockResponse,
            message: '登录成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await authService.login(credentials)
      
      expect(result).toEqual(mockResponse)
      expect(result.token).toBe('mock-jwt-token')
      expect(result.user.id).toBe(1)
      expect(result.user.name).toBe('测试用户')
      expect(result.user.email).toBe('test@example.com')
      expect(result.user.userType).toBe('tenant_admin')
    })

    it('应该处理登录失败 - 用户名或密码错误', async () => {
      const credentials: LoginCredentials = {
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

      await expect(authService.login(credentials)).rejects.toThrow('用户名或密码错误')
    })

    it('应该处理登录失败 - 账户被锁定', async () => {
      const credentials: LoginCredentials = {
        email: 'locked@example.com',
        password: 'password123'
      }

      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.json({
            success: false,
            code: 423,
            message: '账户已被锁定，请联系管理员',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 423 })
        })
      )

      await expect(authService.login(credentials)).rejects.toThrow('账户已被锁定，请联系管理员')
    })

    it('应该处理登录失败 - 账户未激活', async () => {
      const credentials: LoginCredentials = {
        email: 'inactive@example.com',
        password: 'password123'
      }

      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.json({
            success: false,
            code: 403,
            message: '账户未激活，请先激活账户',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 403 })
        })
      )

      await expect(authService.login(credentials)).rejects.toThrow('账户未激活，请先激活账户')
    })

    it('应该处理网络错误', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      }

      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.error()
        })
      )

      await expect(authService.login(credentials)).rejects.toThrow()
    })

    it('应该验证必填字段', async () => {
      const incompleteCredentials = {
        email: '',
        password: ''
      } as LoginCredentials

      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '邮箱和密码不能为空',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(authService.login(incompleteCredentials)).rejects.toThrow('邮箱和密码不能为空')
    })

    it('应该验证邮箱格式', async () => {
      const invalidCredentials: LoginCredentials = {
        email: 'invalid-email',
        password: 'password123'
      }

      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '邮箱格式不正确',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(authService.login(invalidCredentials)).rejects.toThrow('邮箱格式不正确')
    })

    it('应该处理服务器内部错误', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      }

      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.json({
            success: false,
            code: 500,
            message: '服务器内部错误',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        })
      )

      await expect(authService.login(credentials)).rejects.toThrow('服务器内部错误')
    })
  })

  describe('getCurrentUser', () => {
    it('应该成功获取当前用户信息', async () => {
      const mockUser = {
        id: 1,
        name: '测试用户',
        email: 'test@example.com',
        userType: 'tenant_admin'
      }

      server.use(
        http.get('/api/v1/auth/me', () => {
          return HttpResponse.json({
            success: true,
            data: mockUser,
            message: '获取用户信息成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await authService.getCurrentUser()
      
      expect(result).toEqual(mockUser)
      expect(result.id).toBe(1)
      expect(result.name).toBe('测试用户')
      expect(result.email).toBe('test@example.com')
      expect(result.userType).toBe('tenant_admin')
    })

    it('应该处理未认证错误', async () => {
      server.use(
        http.get('/api/v1/auth/me', () => {
          return HttpResponse.json({
            success: false,
            code: 401,
            message: '未认证，请先登录',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 401 })
        })
      )

      await expect(authService.getCurrentUser()).rejects.toThrow('未认证，请先登录')
    })

    it('应该处理token过期错误', async () => {
      server.use(
        http.get('/api/v1/auth/me', () => {
          return HttpResponse.json({
            success: false,
            code: 401,
            message: 'Token已过期',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 401 })
        })
      )

      await expect(authService.getCurrentUser()).rejects.toThrow('Token已过期')
    })

    it('应该处理用户不存在错误', async () => {
      server.use(
        http.get('/api/v1/auth/me', () => {
          return HttpResponse.json({
            success: false,
            code: 404,
            message: '用户不存在',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 404 })
        })
      )

      await expect(authService.getCurrentUser()).rejects.toThrow('用户不存在')
    })

    it('应该处理网络错误', async () => {
      server.use(
        http.get('/api/v1/auth/me', () => {
          return HttpResponse.error()
        })
      )

      await expect(authService.getCurrentUser()).rejects.toThrow()
    })
  })

  describe('refreshToken', () => {
    it('应该成功刷新token', async () => {
      const mockTokenResponse = {
        token: 'new-jwt-token'
      }

      server.use(
        http.post('/api/v1/auth/refresh', () => {
          return HttpResponse.json({
            success: true,
            data: mockTokenResponse,
            message: 'Token刷新成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await authService.refreshToken()
      
      expect(result).toEqual(mockTokenResponse)
      expect(result.token).toBe('new-jwt-token')
    })

    it('应该处理refresh token过期', async () => {
      server.use(
        http.post('/api/v1/auth/refresh', () => {
          return HttpResponse.json({
            success: false,
            code: 401,
            message: 'Refresh token已过期，请重新登录',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 401 })
        })
      )

      await expect(authService.refreshToken()).rejects.toThrow('Refresh token已过期，请重新登录')
    })

    it('应该处理refresh token无效', async () => {
      server.use(
        http.post('/api/v1/auth/refresh', () => {
          return HttpResponse.json({
            success: false,
            code: 401,
            message: 'Refresh token无效',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 401 })
        })
      )

      await expect(authService.refreshToken()).rejects.toThrow('Refresh token无效')
    })

    it('应该处理服务器错误', async () => {
      server.use(
        http.post('/api/v1/auth/refresh', () => {
          return HttpResponse.json({
            success: false,
            code: 500,
            message: '服务器内部错误',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        })
      )

      await expect(authService.refreshToken()).rejects.toThrow('服务器内部错误')
    })

    it('应该处理网络错误', async () => {
      server.use(
        http.post('/api/v1/auth/refresh', () => {
          return HttpResponse.error()
        })
      )

      await expect(authService.refreshToken()).rejects.toThrow()
    })
  })

  describe('logout', () => {
    it('应该成功登出', async () => {
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

      await expect(authService.logout()).resolves.toBeUndefined()
    })

    it('应该处理登出时的认证错误', async () => {
      server.use(
        http.post('/api/v1/auth/logout', () => {
          return HttpResponse.json({
            success: false,
            code: 401,
            message: '未认证，无法登出',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 401 })
        })
      )

      await expect(authService.logout()).rejects.toThrow('未认证，无法登出')
    })

    it('应该处理服务器错误', async () => {
      server.use(
        http.post('/api/v1/auth/logout', () => {
          return HttpResponse.json({
            success: false,
            code: 500,
            message: '登出失败',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        })
      )

      await expect(authService.logout()).rejects.toThrow('登出失败')
    })

    it('应该处理网络错误', async () => {
      server.use(
        http.post('/api/v1/auth/logout', () => {
          return HttpResponse.error()
        })
      )

      await expect(authService.logout()).rejects.toThrow()
    })

    it('即使服务器返回错误也应该能够处理', async () => {
      // 在某些情况下，即使服务器返回错误，客户端也可能需要清理本地状态
      server.use(
        http.post('/api/v1/auth/logout', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '登出请求无效',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(authService.logout()).rejects.toThrow('登出请求无效')
    })
  })

  describe('边界条件和异常场景测试', () => {
    it('应该处理空的登录凭据', async () => {
      const emptyCredentials = {
        email: '',
        password: ''
      } as LoginCredentials

      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '邮箱和密码不能为空',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(authService.login(emptyCredentials)).rejects.toThrow('邮箱和密码不能为空')
    })

    it('应该处理特殊字符的登录凭据', async () => {
      const specialCredentials: LoginCredentials = {
        email: 'test+special@example.com',
        password: 'p@ssw0rd!@#$%^&*()'
      }

      const mockResponse = {
        token: 'special-token',
        user: {
          id: 1,
          name: '特殊用户',
          email: 'test+special@example.com',
          userType: 'tenant_admin'
        }
      }

      server.use(
        http.post('/api/v1/auth/login', async ({ request }) => {
          const body = await request.json() as LoginCredentials
          expect(body).toEqual(specialCredentials)
          
          return HttpResponse.json({
            success: true,
            data: mockResponse,
            message: '登录成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await authService.login(specialCredentials)
      expect(result).toEqual(mockResponse)
    })

    it('应该处理超长的登录凭据', async () => {
      const longCredentials: LoginCredentials = {
        email: 'a'.repeat(100) + '@example.com',
        password: 'p'.repeat(200)
      }

      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '邮箱或密码长度超出限制',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(authService.login(longCredentials)).rejects.toThrow('邮箱或密码长度超出限制')
    })

    it('应该处理包含Unicode字符的用户信息', async () => {
      const mockUser = {
        id: 1,
        name: '测试用户👤',
        email: 'test@测试.com',
        userType: 'tenant_admin'
      }

      server.use(
        http.get('/api/v1/auth/me', () => {
          return HttpResponse.json({
            success: true,
            data: mockUser,
            message: '获取用户信息成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await authService.getCurrentUser()
      expect(result).toEqual(mockUser)
      expect(result.name).toBe('测试用户👤')
    })

    it('应该处理响应数据格式异常', async () => {
      server.use(
        http.get('/api/v1/auth/me', () => {
          return HttpResponse.json({
            success: true,
            data: {
              // 缺少必要字段
              id: 1,
              name: '测试用户'
              // 缺少 email 和 userType
            },
            message: '获取用户信息成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await authService.getCurrentUser()
      expect(result.id).toBe(1)
      expect(result.name).toBe('测试用户')
      expect(result.email).toBeUndefined()
      expect(result.userType).toBeUndefined()
    })

    it('应该处理null响应数据', async () => {
      server.use(
        http.get('/api/v1/auth/me', () => {
          return HttpResponse.json({
            success: true,
            data: null,
            message: '用户信息为空',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await authService.getCurrentUser()
      expect(result).toBeNull()
    })
  })

  describe('并发请求测试', () => {
    it('应该能够处理并发登录请求', async () => {
      const credentials1: LoginCredentials = {
        email: 'user1@example.com',
        password: 'password1'
      }

      const credentials2: LoginCredentials = {
        email: 'user2@example.com',
        password: 'password2'
      }

      server.use(
        http.post('/api/v1/auth/login', async ({ request }) => {
          const body = await request.json() as LoginCredentials
          
          return HttpResponse.json({
            success: true,
            data: {
              token: `token-for-${body.email}`,
              user: {
                id: body.email === 'user1@example.com' ? 1 : 2,
                name: body.email === 'user1@example.com' ? '用户1' : '用户2',
                email: body.email,
                userType: 'tenant_admin'
              }
            },
            message: '登录成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const [result1, result2] = await Promise.all([
        authService.login(credentials1),
        authService.login(credentials2)
      ])

      expect(result1.user.email).toBe('user1@example.com')
      expect(result2.user.email).toBe('user2@example.com')
      expect(result1.token).toBe('token-for-user1@example.com')
      expect(result2.token).toBe('token-for-user2@example.com')
    })

    it('应该能够处理并发的用户信息获取请求', async () => {
      server.use(
        http.get('/api/v1/auth/me', () => {
          return HttpResponse.json({
            success: true,
            data: {
              id: 1,
              name: '测试用户',
              email: 'test@example.com',
              userType: 'tenant_admin'
            },
            message: '获取用户信息成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const promises = Array(5).fill(null).map(() => authService.getCurrentUser())
      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result.id).toBe(1)
        expect(result.name).toBe('测试用户')
        expect(result.email).toBe('test@example.com')
      })
    })
  })

  describe('性能和超时测试', () => {
    it('应该在合理时间内完成登录请求', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      }

      server.use(
        http.post('/api/v1/auth/login', async () => {
          // 模拟一定的延迟
          await new Promise(resolve => setTimeout(resolve, 100))
          
          return HttpResponse.json({
            success: true,
            data: {
              token: 'mock-token',
              user: {
                id: 1,
                name: '测试用户',
                email: 'test@example.com',
                userType: 'tenant_admin'
              }
            },
            message: '登录成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const startTime = Date.now()
      const result = await authService.login(credentials)
      const endTime = Date.now()

      expect(result.token).toBe('mock-token')
      expect(endTime - startTime).toBeLessThan(1000) // 应该在1秒内完成
    })
  })
})