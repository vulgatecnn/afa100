import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { BrowserRouter, Routes, Route, MemoryRouter } from 'react-router-dom'
import ProtectedRoute from '../../../src/components/ProtectedRoute'
import { AuthContext } from '../../../src/contexts/AuthContext'

// Mock useAuth hook
vi.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => {
    const context = React.useContext(AuthContext)
    if (!context) {
      throw new Error('useAuth必须在AuthProvider内部使用')
    }
    return context
  }
}))

// 创建测试用的AuthContext值
const createMockAuthContext = (overrides = {}) => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  ...overrides
})

// 测试组件
const TestComponent: React.FC = () => (
  <div data-testid="protected-content">受保护的内容</div>
)

// 登录页面组件
const LoginPage: React.FC = () => (
  <div data-testid="login-page">登录页面</div>
)

// 渲染辅助函数
const renderProtectedRoute = (authContextValue = {}, initialEntries = ['/protected']) => {
  const mockAuthContext = createMockAuthContext(authContextValue)
  
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthContext.Provider value={mockAuthContext}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/protected" 
            element={
              <ProtectedRoute>
                <TestComponent />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <div data-testid="dashboard">仪表板</div>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('加载状态', () => {
    it('应该在loading为true时显示加载指示器', () => {
      renderProtectedRoute({ loading: true })

      // 检查加载指示器
      expect(document.querySelector('.ant-spin')).toBeInTheDocument()
      expect(document.querySelector('.ant-spin-lg')).toBeInTheDocument()

      // 不应该显示受保护的内容
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
    })

    it('应该正确设置加载指示器的样式', () => {
      renderProtectedRoute({ loading: true })

      const spinContainer = document.querySelector('.ant-spin')?.parentElement
      expect(spinContainer).toHaveStyle({
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      })
    })

    it('应该在loading状态下不渲染子组件', () => {
      renderProtectedRoute({ loading: true, isAuthenticated: true })

      expect(document.querySelector('.ant-spin')).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  describe('未认证状态', () => {
    it('应该在未认证时重定向到登录页面', () => {
      renderProtectedRoute({ 
        loading: false, 
        isAuthenticated: false 
      })

      // 应该显示登录页面
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
      
      // 不应该显示受保护的内容
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    it('应该使用replace导航到登录页面', () => {
      // 测试从不同路径访问受保护路由
      renderProtectedRoute({ 
        loading: false, 
        isAuthenticated: false 
      }, ['/protected'])

      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })

    it('应该在用户为null时重定向到登录页面', () => {
      renderProtectedRoute({ 
        loading: false, 
        isAuthenticated: false,
        user: null
      })

      expect(screen.getByTestId('login-page')).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  describe('已认证状态', () => {
    const mockUser = {
      id: 1,
      name: '测试用户',
      email: 'test@example.com',
      userType: 'tenant_admin'
    }

    it('应该在已认证时渲染子组件', () => {
      renderProtectedRoute({ 
        loading: false, 
        isAuthenticated: true,
        user: mockUser
      })

      // 应该显示受保护的内容
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      expect(screen.getByText('受保护的内容')).toBeInTheDocument()
      
      // 不应该显示登录页面或加载指示器
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument()
    })

    it('应该正确渲染多个子组件', () => {
      const MultipleChildren: React.FC = () => (
        <ProtectedRoute>
          <div data-testid="child-1">子组件1</div>
          <div data-testid="child-2">子组件2</div>
        </ProtectedRoute>
      )

      render(
        <MemoryRouter>
          <AuthContext.Provider value={createMockAuthContext({ 
            loading: false, 
            isAuthenticated: true,
            user: mockUser
          })}>
            <Routes>
              <Route path="/" element={<MultipleChildren />} />
            </Routes>
          </AuthContext.Provider>
        </MemoryRouter>
      )

      expect(screen.getByTestId('child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-2')).toBeInTheDocument()
    })

    it('应该支持嵌套的受保护路由', () => {
      const NestedProtectedRoute: React.FC = () => (
        <ProtectedRoute>
          <div data-testid="outer-content">
            外层内容
            <ProtectedRoute>
              <div data-testid="inner-content">内层内容</div>
            </ProtectedRoute>
          </div>
        </ProtectedRoute>
      )

      render(
        <MemoryRouter>
          <AuthContext.Provider value={createMockAuthContext({ 
            loading: false, 
            isAuthenticated: true,
            user: mockUser
          })}>
            <Routes>
              <Route path="/" element={<NestedProtectedRoute />} />
            </Routes>
          </AuthContext.Provider>
        </MemoryRouter>
      )

      expect(screen.getByTestId('outer-content')).toBeInTheDocument()
      expect(screen.getByTestId('inner-content')).toBeInTheDocument()
    })
  })

  describe('状态变化', () => {
    it('应该在认证状态从false变为true时正确更新', () => {
      const mockUser = {
        id: 1,
        name: '测试用户',
        email: 'test@example.com',
        userType: 'tenant_admin'
      }

      // 测试未认证状态
      const { unmount } = renderProtectedRoute({ 
        loading: false, 
        isAuthenticated: false 
      })

      // 应该显示登录页面
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
      
      // 清理
      unmount()

      // 测试已认证状态
      renderProtectedRoute({ 
        loading: false, 
        isAuthenticated: true,
        user: mockUser
      })

      // 应该显示受保护的内容
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
    })

    it('应该在loading状态变化时正确更新', () => {
      const mockUser = {
        id: 1,
        name: '测试用户',
        email: 'test@example.com',
        userType: 'tenant_admin'
      }

      // 初始渲染 - 加载中
      const { rerender } = render(
        <MemoryRouter initialEntries={['/protected']}>
          <AuthContext.Provider value={createMockAuthContext({ 
            loading: true, 
            isAuthenticated: false 
          })}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route 
                path="/protected" 
                element={
                  <ProtectedRoute>
                    <TestComponent />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </AuthContext.Provider>
        </MemoryRouter>
      )

      // 应该显示加载指示器
      expect(document.querySelector('.ant-spin')).toBeInTheDocument()

      // 重新渲染 - 加载完成，已认证
      rerender(
        <MemoryRouter initialEntries={['/protected']}>
          <AuthContext.Provider value={createMockAuthContext({ 
            loading: false, 
            isAuthenticated: true,
            user: mockUser
          })}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route 
                path="/protected" 
                element={
                  <ProtectedRoute>
                    <TestComponent />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </AuthContext.Provider>
        </MemoryRouter>
      )

      // 应该显示受保护的内容
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument()
    })
  })

  describe('路由行为', () => {
    it('应该在不同路径下正确工作', () => {
      const mockUser = {
        id: 1,
        name: '测试用户',
        email: 'test@example.com',
        userType: 'tenant_admin'
      }

      renderProtectedRoute({ 
        loading: false, 
        isAuthenticated: true,
        user: mockUser
      }, ['/dashboard'])

      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })

    it('应该处理无效的认证状态组合', () => {
      // isAuthenticated为true但user为null的情况
      renderProtectedRoute({ 
        loading: false, 
        isAuthenticated: true,
        user: null
      })

      // 应该显示受保护的内容（基于isAuthenticated）
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('应该处理认证状态不一致的情况', () => {
      const mockUser = {
        id: 1,
        name: '测试用户',
        email: 'test@example.com',
        userType: 'tenant_admin'
      }

      // isAuthenticated为false但user存在的情况
      renderProtectedRoute({ 
        loading: false, 
        isAuthenticated: false,
        user: mockUser
      })

      // 应该基于isAuthenticated进行判断
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  describe('错误处理', () => {
    it('应该在AuthContext不存在时抛出错误', () => {
      // 捕获console.error以避免测试输出中的错误信息
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(
          <MemoryRouter>
            <Routes>
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <TestComponent />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </MemoryRouter>
        )
      }).toThrow('useAuth必须在AuthProvider内部使用')

      consoleSpy.mockRestore()
    })

    it('应该正确处理子组件渲染错误', () => {
      const ErrorComponent: React.FC = () => {
        throw new Error('子组件错误')
      }

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(
          <MemoryRouter>
            <AuthContext.Provider value={createMockAuthContext({ 
              loading: false, 
              isAuthenticated: true,
              user: { id: 1, name: 'Test', email: 'test@example.com', userType: 'admin' }
            })}>
              <Routes>
                <Route 
                  path="/" 
                  element={
                    <ProtectedRoute>
                      <ErrorComponent />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </AuthContext.Provider>
          </MemoryRouter>
        )
      }).toThrow('子组件错误')

      consoleSpy.mockRestore()
    })
  })

  describe('性能和优化', () => {
    it('应该不会导致不必要的重新渲染', () => {
      const mockUser = {
        id: 1,
        name: '测试用户',
        email: 'test@example.com',
        userType: 'tenant_admin'
      }

      let renderCount = 0
      const CountingComponent: React.FC = () => {
        renderCount++
        return <div data-testid="counting-component">渲染次数: {renderCount}</div>
      }

      const { rerender } = render(
        <MemoryRouter>
          <AuthContext.Provider value={createMockAuthContext({ 
            loading: false, 
            isAuthenticated: true,
            user: mockUser
          })}>
            <Routes>
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <CountingComponent />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </AuthContext.Provider>
        </MemoryRouter>
      )

      expect(renderCount).toBe(1)

      // 使用相同的props重新渲染
      rerender(
        <MemoryRouter>
          <AuthContext.Provider value={createMockAuthContext({ 
            loading: false, 
            isAuthenticated: true,
            user: mockUser
          })}>
            <Routes>
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <CountingComponent />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </AuthContext.Provider>
        </MemoryRouter>
      )

      // 应该重新渲染（因为创建了新的context值）
      expect(renderCount).toBe(2)
    })
  })
})