import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { message } from 'antd'
import { AuthProvider, useAuth } from '../../../src/contexts/AuthContext'
import { authService } from '../../../src/services/authService'

// Mock authService
vi.mock('../../../src/services/authService', () => ({
  authService: {
    login: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn()
  }
}))

// Mock antd message
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn()
    }
  }
})

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('AuthContext', () => {
  const mockUser = {
    id: 1,
    name: '测试用户',
    email: 'test@example.com',
    userType: 'tenant_admin'
  }

  const mockLoginResponse = {
    token: 'mock-jwt-token',
    user: mockUser
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // 重置localStorage mock
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  )

  describe('初始化状态', () => {
    it('应该正确初始化默认状态', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      // 初始状态检查
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      
      // 等待初始化完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('应该在有有效token时自动登录', async () => {
      mockLocalStorage.getItem.mockReturnValue('valid-token')
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.user).toEqual(mockUser)
        expect(result.current.isAuthenticated).toBe(true)
      })

      expect(authService.getCurrentUser).toHaveBeenCalledTimes(1)
    })

    it('应该在token无效时清除本地存储', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-token')
      vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('Token无效'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.user).toBeNull()
        expect(result.current.isAuthenticated).toBe(false)
      })

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
    })
  })

  describe('登录功能', () => {
    it('应该成功处理登录', async () => {
      vi.mocked(authService.login).mockResolvedValue(mockLoginResponse)

      const { result } = renderHook(() => useAuth(), { wrapper })

      // 等待初始化完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const credentials = { email: 'test@example.com', password: 'password123' }

      await act(async () => {
        await result.current.login(credentials)
      })

      expect(authService.login).toHaveBeenCalledWith(credentials)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'mock-jwt-token')
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(message.success).toHaveBeenCalledWith('登录成功')
    })

    it('应该正确处理登录失败', async () => {
      const errorMessage = '用户名或密码错误'
      vi.mocked(authService.login).mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() => useAuth(), { wrapper })

      // 等待初始化完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const credentials = { email: 'test@example.com', password: 'wrong-password' }

      try {
        await act(async () => {
          await result.current.login(credentials)
        })
      } catch (error) {
        // 预期会抛出错误
      }

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(message.error).toHaveBeenCalledWith(errorMessage)
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
    })

    it('应该在登录过程中显示加载状态', async () => {
      let resolveLogin: (value: any) => void
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve
      })
      vi.mocked(authService.login).mockReturnValue(loginPromise)

      const { result } = renderHook(() => useAuth(), { wrapper })

      // 等待初始化完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const credentials = { email: 'test@example.com', password: 'password123' }

      // 开始登录
      act(() => {
        result.current.login(credentials)
      })

      // 检查加载状态
      expect(result.current.loading).toBe(true)

      // 完成登录
      act(() => {
        resolveLogin!(mockLoginResponse)
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('应该处理没有错误消息的登录失败', async () => {
      vi.mocked(authService.login).mockRejectedValue(new Error())

      const { result } = renderHook(() => useAuth(), { wrapper })

      // 等待初始化完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const credentials = { email: 'test@example.com', password: 'wrong-password' }

      try {
        await act(async () => {
          await result.current.login(credentials)
        })
      } catch (error) {
        // 预期会抛出错误
      }

      expect(message.error).toHaveBeenCalledWith('登录失败')
    })
  })

  describe('登出功能', () => {
    it('应该成功处理登出', async () => {
      // 先设置已登录状态
      mockLocalStorage.getItem.mockReturnValue('valid-token')
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)

      const { result } = renderHook(() => useAuth(), { wrapper })

      // 等待初始化完成
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
        expect(result.current.isAuthenticated).toBe(true)
      })

      // 执行登出
      act(() => {
        result.current.logout()
      })

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(message.success).toHaveBeenCalledWith('已退出登录')
    })

    it('应该在未登录状态下也能正常执行登出', () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      act(() => {
        result.current.logout()
      })

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(message.success).toHaveBeenCalledWith('已退出登录')
    })
  })

  describe('状态变化', () => {
    it('应该正确计算isAuthenticated状态', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      // 初始状态
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
      })

      // 模拟登录
      vi.mocked(authService.login).mockResolvedValue(mockLoginResponse)

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'password123' })
      })

      expect(result.current.isAuthenticated).toBe(true)

      // 模拟登出
      act(() => {
        result.current.logout()
      })

      expect(result.current.isAuthenticated).toBe(false)
    })

    it('应该在用户状态变化时保持引用稳定性', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      const initialLogin = result.current.login
      const initialLogout = result.current.logout

      // 等待初始化完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // 函数引用应该保持稳定
      expect(result.current.login).toBe(initialLogin)
      expect(result.current.logout).toBe(initialLogout)
    })
  })

  describe('错误边界情况', () => {
    it('应该处理网络错误', async () => {
      vi.mocked(authService.login).mockRejectedValue(new Error('Network Error'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const credentials = { email: 'test@example.com', password: 'password123' }

      try {
        await act(async () => {
          await result.current.login(credentials)
        })
      } catch (error) {
        // 预期会抛出错误
      }

      expect(message.error).toHaveBeenCalledWith('Network Error')
    })

    it('应该处理getCurrentUser的异步错误', async () => {
      mockLocalStorage.getItem.mockReturnValue('token')
      vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('Unauthorized'))

      // 监听console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.user).toBeNull()
        expect(result.current.isAuthenticated).toBe(false)
      })

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
      expect(consoleSpy).toHaveBeenCalledWith('Token验证失败:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('useAuth hook错误处理', () => {
    it('应该在AuthProvider外部使用时抛出错误', () => {
      // 不使用wrapper，直接渲染hook
      expect(() => {
        renderHook(() => useAuth())
      }).toThrow('useAuth必须在AuthProvider内部使用')
    })
  })
})