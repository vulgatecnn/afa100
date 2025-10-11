import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, AuthContext, useAuth } from '../AuthContext'
import { authService } from '../../services/authService'

// Mock authService
vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    getCurrentUser: vi.fn(),
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
    }
  }
})

// 测试组件，用于测试AuthContext的功能
const TestComponent: React.FC = () => {
  const { user, isAuthenticated, loading, login, logout } = useAuth()
  
  return (
    <div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <div data-testid="isAuthenticated">{isAuthenticated.toString()}</div>
      <div data-testid="loading">{loading.toString()}</div>
      <button 
        data-testid="login-btn" 
        onClick={() => login({ email: 'test@example.com', password: 'password123' })}
      >
        登录
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        退出
      </button>
    </div>
  )
}

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
    // 清理localStorage
    localStorage.clear()
    // 重置所有mock
    vi.mocked(authService.login).mockReset()
    vi.mocked(authService.getCurrentUser).mockReset()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('初始化状态', () => {
    it('应该初始化为未认证状态', async () => {
      vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('No token'))
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // 等待初始化完成
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      expect(screen.getByTestId('user')).toHaveTextContent('null')
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false')
    })

    it('应该从localStorage恢复用户状态', async () => {
      // 模拟localStorage中有token
      localStorage.setItem('token', 'existing-token')
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // 等待初始化完成
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser))
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
      expect(authService.getCurrentUser).toHaveBeenCalledTimes(1)
    })

    it('应该处理无效token的情况', async () => {
      localStorage.setItem('token', 'invalid-token')
      vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('Invalid token'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      expect(screen.getByTestId('user')).toHaveTextContent('null')
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false')
      expect(localStorage.getItem('token')).toBeNull()
    })
  })

  describe('登录功能', () => {
    it('应该成功登录并更新状态', async () => {
      vi.mocked(authService.login).mockResolvedValue(mockLoginResponse)
      vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('No token'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // 等待初始化完成
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      // 点击登录按钮
      const loginBtn = screen.getByTestId('login-btn')
      await act(async () => {
        loginBtn.click()
      })

      // 验证登录过程中的loading状态
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      // 验证登录成功后的状态
      expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser))
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
      expect(localStorage.getItem('token')).toBe('mock-jwt-token')
      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    it('应该处理登录失败的情况', async () => {
      const errorMessage = '用户名或密码错误'
      vi.mocked(authService.login).mockRejectedValue(new Error(errorMessage))
      vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('No token'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // 等待初始化完成
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      // 点击登录按钮
      const loginBtn = screen.getByTestId('login-btn')
      
      await act(async () => {
        try {
          loginBtn.click()
        } catch (error) {
          // 预期的错误，忽略
        }
      })

      // 验证状态没有改变
      expect(screen.getByTestId('user')).toHaveTextContent('null')
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false')
      expect(localStorage.getItem('token')).toBeNull()
    })

    it('应该在登录过程中显示loading状态', async () => {
      let resolveLogin: (value: any) => void
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve
      })
      vi.mocked(authService.login).mockReturnValue(loginPromise)
      vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('No token'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // 等待初始化完成
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      // 点击登录按钮
      const loginBtn = screen.getByTestId('login-btn')
      act(() => {
        loginBtn.click()
      })

      // 验证loading状态
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('true')
      })

      // 完成登录
      act(() => {
        resolveLogin!(mockLoginResponse)
      })

      // 验证loading状态恢复
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })
    })
  })

  describe('退出功能', () => {
    it('应该成功退出并清理状态', async () => {
      // 先设置已登录状态
      localStorage.setItem('token', 'existing-token')
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // 等待初始化完成
      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
      })

      // 点击退出按钮
      const logoutBtn = screen.getByTestId('logout-btn')
      act(() => {
        logoutBtn.click()
      })

      // 验证退出后的状态
      expect(screen.getByTestId('user')).toHaveTextContent('null')
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false')
      expect(localStorage.getItem('token')).toBeNull()
    })
  })

  describe('错误处理', () => {
    it('应该在useAuth在AuthProvider外使用时抛出错误', () => {
      // 使用console.error的mock来避免测试输出中的错误信息
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      expect(() => {
        render(<TestComponent />)
      }).toThrow('useAuth必须在AuthProvider内部使用')
      
      consoleSpy.mockRestore()
    })
  })

  describe('状态变化', () => {
    it('应该正确计算isAuthenticated状态', async () => {
      vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('No token'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // 初始状态：未认证
      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false')
      })

      // 登录后：已认证
      vi.mocked(authService.login).mockResolvedValue(mockLoginResponse)
      const loginBtn = screen.getByTestId('login-btn')
      
      await act(async () => {
        loginBtn.click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
      })

      // 退出后：未认证
      const logoutBtn = screen.getByTestId('logout-btn')
      act(() => {
        logoutBtn.click()
      })

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false')
    })
  })
})