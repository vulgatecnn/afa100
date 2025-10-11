import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import ProtectedRoute from '../ProtectedRoute'
import { AuthProvider } from '../../contexts/AuthContext'
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

// 测试用的受保护内容组件
const ProtectedContent: React.FC = () => (
  <div data-testid="protected-content">受保护的内容</div>
)

// 登录页面组件
const LoginPage: React.FC = () => (
  <div data-testid="login-page">登录页面</div>
)

// 测试用的路由包装器
const TestRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ConfigProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/protected" element={children} />
          <Route path="/" element={children} />
        </Routes>
      </AuthProvider>
    </ConfigProvider>
  </BrowserRouter>
)

describe('ProtectedRoute', () => {
  const mockUser = {
    id: 1,
    name: '测试用户',
    email: 'test@example.com',
    userType: 'tenant_admin'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    // 重置location
    window.history.pushState({}, '', '/')
  })

  describe('认证状态测试', () => {
    it('应该在用户已认证时渲染受保护的内容', async () => {
      // Mock已认证状态
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)
      localStorage.setItem('token', 'valid-token')

      render(
        <TestRouter>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
    })

    it('应该在用户未认证时重定向到登录页', async () => {
      // Mock未认证状态
      vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('No token'))

      render(
        <TestRouter>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    it('应该在loading状态时显示加载指示器', async () => {
      // 创建一个永不resolve的Promise来模拟loading状态
      const neverResolvePromise = new Promise(() => {})
      vi.mocked(authService.getCurrentUser).mockReturnValue(neverResolvePromise)

      render(
        <TestRouter>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestRouter>
      )

      // 验证loading状态
      expect(screen.getByText('加载中...')).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'loading' })).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
    })

    it('应该在token无效时重定向到登录页', async () => {
      // Mock token验证失败
      localStorage.setItem('token', 'invalid-token')
      vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('Invalid token'))

      render(
        <TestRouter>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      // 验证token被清除
      expect(localStorage.getItem('token')).toBeNull()
    })
  })

  describe('路由行为测试', () => {
    it('应该使用replace导航避免回退到受保护页面', async () => {
      vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('No token'))

      // 模拟用户直接访问受保护页面
      window.history.pushState({}, '', '/protected')

      render(
        <TestRouter>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument()
      })

      // 验证URL已更改为登录页
      expect(window.location.pathname).toBe('/login')
    })

    it('应该在认证状态变化时正确更新', async () => {
      // 初始状态：未认证
      vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('No token'))

      const { rerender } = render(
        <TestRouter>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument()
      })

      // 模拟用户登录成功
      localStorage.setItem('token', 'valid-token')
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)

      // 重新渲染组件
      rerender(
        <TestRouter>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })
  })

  describe('子组件渲染测试', () => {
    it('应该正确渲染单个子组件', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)
      localStorage.setItem('token', 'valid-token')

      render(
        <TestRouter>
          <ProtectedRoute>
            <div data-testid="single-child">单个子组件</div>
          </ProtectedRoute>
        </TestRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('single-child')).toBeInTheDocument()
      })
    })

    it('应该正确渲染多个子组件', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)
      localStorage.setItem('token', 'valid-token')

      render(
        <TestRouter>
          <ProtectedRoute>
            <div data-testid="child-1">子组件1</div>
            <div data-testid="child-2">子组件2</div>
            <div data-testid="child-3">子组件3</div>
          </ProtectedRoute>
        </TestRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('child-1')).toBeInTheDocument()
        expect(screen.getByTestId('child-2')).toBeInTheDocument()
        expect(screen.getByTestId('child-3')).toBeInTheDocument()
      })
    })

    it('应该正确渲染复杂的子组件结构', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)
      localStorage.setItem('token', 'valid-token')

      const ComplexChild: React.FC = () => (
        <div data-testid="complex-child">
          <h1>标题</h1>
          <p>段落内容</p>
          <button>按钮</button>
        </div>
      )

      render(
        <TestRouter>
          <ProtectedRoute>
            <ComplexChild />
          </ProtectedRoute>
        </TestRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('complex-child')).toBeInTheDocument()
        expect(screen.getByText('标题')).toBeInTheDocument()
        expect(screen.getByText('段落内容')).toBeInTheDocument()
        expect(screen.getByText('按钮')).toBeInTheDocument()
      })
    })
  })

  describe('加载状态测试', () => {
    it('应该显示正确的加载样式', async () => {
      const neverResolvePromise = new Promise(() => {})
      vi.mocked(authService.getCurrentUser).mockReturnValue(neverResolvePromise)

      const { container } = render(
        <TestRouter>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestRouter>
      )

      const loadingContainer = container.querySelector('div[style*="display: flex"]')
      expect(loadingContainer).toBeInTheDocument()
      expect(loadingContainer).toHaveStyle({
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      })
    })

    it('应该在加载完成后移除加载指示器', async () => {
      // 创建可控制的Promise
      let resolveAuth: (value: any) => void
      const authPromise = new Promise((resolve) => {
        resolveAuth = resolve
      })
      vi.mocked(authService.getCurrentUser).mockReturnValue(authPromise)

      render(
        <TestRouter>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestRouter>
      )

      // 验证loading状态
      expect(screen.getByText('加载中...')).toBeInTheDocument()

      // 完成认证
      resolveAuth!(mockUser)

      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument()
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })
  })

  describe('错误处理测试', () => {
    it('应该处理认证服务抛出的错误', async () => {
      vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('Network error'))

      render(
        <TestRouter>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    it('应该处理空的子组件', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)
      localStorage.setItem('token', 'valid-token')

      render(
        <TestRouter>
          <ProtectedRoute>
            {null}
          </ProtectedRoute>
        </TestRouter>
      )

      await waitFor(() => {
        expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
      })
    })

    it('应该处理undefined子组件', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)
      localStorage.setItem('token', 'valid-token')

      render(
        <TestRouter>
          <ProtectedRoute>
            {undefined}
          </ProtectedRoute>
        </TestRouter>
      )

      await waitFor(() => {
        expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
      })
    })
  })

  describe('性能测试', () => {
    it('应该不会导致不必要的重新渲染', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)
      localStorage.setItem('token', 'valid-token')

      let renderCount = 0
      const CountingChild: React.FC = () => {
        renderCount++
        return <div data-testid="counting-child">渲染次数: {renderCount}</div>
      }

      const { rerender } = render(
        <TestRouter>
          <ProtectedRoute>
            <CountingChild />
          </ProtectedRoute>
        </TestRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('counting-child')).toBeInTheDocument()
      })

      const initialRenderCount = renderCount

      // 重新渲染相同的组件
      rerender(
        <TestRouter>
          <ProtectedRoute>
            <CountingChild />
          </ProtectedRoute>
        </TestRouter>
      )

      // 验证渲染次数没有不必要的增加
      expect(renderCount).toBe(initialRenderCount + 1)
    })
  })
})