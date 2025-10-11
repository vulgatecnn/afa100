import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import LoginPage from './index'
import { AuthProvider } from '../../contexts/AuthContext'
import { authService } from '../../services/authService'

// Mock the auth service
vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    getCurrentUser: vi.fn()
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

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ConfigProvider>
        <AuthProvider>
          {component}
        </AuthProvider>
      </ConfigProvider>
    </BrowserRouter>
  )
}

describe('LoginPage', () => {
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
    localStorage.clear()
    // 默认getCurrentUser返回错误，表示未登录状态
    vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('No token'))
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('渲染测试', () => {
    it('应该渲染登录表单', () => {
      renderWithProviders(<LoginPage />)
      
      expect(screen.getByText('AFA租务管理系统')).toBeInTheDocument()
      expect(screen.getByText('请使用您的账号登录系统')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('邮箱地址')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('密码')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '登 录' })).toBeInTheDocument()
      expect(screen.getByText('© 2024 AFA办公小程序. 保留所有权利.')).toBeInTheDocument()
    })

    it('应该渲染正确的表单元素', () => {
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const loginButton = screen.getByRole('button', { name: '登录' })
      
      expect(emailInput).toHaveAttribute('type', 'text')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(loginButton).toHaveAttribute('type', 'submit')
    })

    it('应该有正确的样式类名', () => {
      const { container } = renderWithProviders(<LoginPage />)
      
      expect(container.querySelector('.login-container')).toBeInTheDocument()
      expect(container.querySelector('.login-content')).toBeInTheDocument()
      expect(container.querySelector('.login-card')).toBeInTheDocument()
      expect(container.querySelector('.login-header')).toBeInTheDocument()
      expect(container.querySelector('.login-footer')).toBeInTheDocument()
    })
  })

  describe('表单验证测试', () => {
    it('应该验证必填字段', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)
      
      const loginButton = screen.getByRole('button', { name: '登 录' })
      await user.click(loginButton)
      
      await waitFor(() => {
        expect(screen.getByText('请输入邮箱地址')).toBeInTheDocument()
        expect(screen.getByText('请输入密码')).toBeInTheDocument()
      })
    })

    it('应该验证邮箱格式', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const loginButton = screen.getByRole('button', { name: '登 录' })
      
      await user.type(emailInput, 'invalid-email')
      await user.type(passwordInput, '123456')
      await user.click(loginButton)
      
      await waitFor(() => {
        expect(screen.getByText('请输入有效的邮箱地址')).toBeInTheDocument()
      })
    })

    it('应该验证密码长度', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const loginButton = screen.getByRole('button', { name: '登 录' })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, '123')
      await user.click(loginButton)
      
      await waitFor(() => {
        expect(screen.getByText('密码至少6位字符')).toBeInTheDocument()
      })
    })

    it('应该允许有效的表单数据', async () => {
      const user = userEvent.setup()
      vi.mocked(authService.login).mockResolvedValue(mockLoginResponse)
      
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const loginButton = screen.getByRole('button', { name: '登 录' })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, '123456')
      await user.click(loginButton)
      
      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: '123456'
        })
      })
    })

    it('应该处理多种邮箱格式验证', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const loginButton = screen.getByRole('button', { name: '登录' })
      
      // 测试各种无效邮箱格式
      const invalidEmails = ['test', 'test@', '@example.com', 'test.example.com']
      
      for (const email of invalidEmails) {
        await user.clear(emailInput)
        await user.type(emailInput, email)
        await user.type(passwordInput, '123456')
        await user.click(loginButton)
        
        await waitFor(() => {
          expect(screen.getByText('请输入有效的邮箱地址')).toBeInTheDocument()
        })
      }
    })
  })

  describe('登录功能测试', () => {
    it('应该成功处理登录', async () => {
      const user = userEvent.setup()
      vi.mocked(authService.login).mockResolvedValue(mockLoginResponse)
      
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const loginButton = screen.getByRole('button', { name: '登录' })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(loginButton)
      
      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        })
      })
    })

    it('应该处理登录失败', async () => {
      const user = userEvent.setup()
      const errorMessage = '用户名或密码错误'
      vi.mocked(authService.login).mockRejectedValue(new Error(errorMessage))
      
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const loginButton = screen.getByRole('button', { name: '登录' })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(loginButton)
      
      await waitFor(() => {
        expect(authService.login).toHaveBeenCalled()
      })
    })

    it('应该在登录过程中显示loading状态', async () => {
      const user = userEvent.setup()
      
      // 创建一个可控制的Promise
      let resolveLogin: (value: any) => void
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve
      })
      vi.mocked(authService.login).mockReturnValue(loginPromise)
      
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const loginButton = screen.getByRole('button', { name: '登录' })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(loginButton)
      
      // 验证loading状态
      await waitFor(() => {
        expect(loginButton).toHaveClass('ant-btn-loading')
      })
      
      // 完成登录
      act(() => {
        resolveLogin!(mockLoginResponse)
      })
      
      // 验证loading状态消失
      await waitFor(() => {
        expect(loginButton).not.toHaveClass('ant-btn-loading')
      })
    })

    it('应该在登录失败后恢复按钮状态', async () => {
      const user = userEvent.setup()
      vi.mocked(authService.login).mockRejectedValue(new Error('登录失败'))
      
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const loginButton = screen.getByRole('button', { name: '登录' })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(loginButton)
      
      // 等待登录完成
      await waitFor(() => {
        expect(authService.login).toHaveBeenCalled()
      })
      
      // 验证按钮状态恢复
      await waitFor(() => {
        expect(loginButton).not.toHaveClass('ant-btn-loading')
      })
    })
  })

  describe('用户交互测试', () => {
    it('应该支持键盘导航', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      
      // Tab键导航
      await user.tab()
      expect(emailInput).toHaveFocus()
      
      await user.tab()
      expect(passwordInput).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: '登 录' })).toHaveFocus()
    })

    it('应该支持Enter键提交表单', async () => {
      const user = userEvent.setup()
      vi.mocked(authService.login).mockResolvedValue(mockLoginResponse)
      
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        })
      })
    })

    it('应该清除表单验证错误当用户重新输入时', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const loginButton = screen.getByRole('button', { name: '登 录' })
      
      // 触发验证错误
      await user.click(loginButton)
      
      await waitFor(() => {
        expect(screen.getByText('请输入邮箱地址')).toBeInTheDocument()
      })
      
      // 输入有效邮箱
      await user.type(emailInput, 'test@example.com')
      
      // 验证错误应该消失
      await waitFor(() => {
        expect(screen.queryByText('请输入邮箱地址')).not.toBeInTheDocument()
      })
    })
  })

  describe('无障碍访问测试', () => {
    it('应该有正确的ARIA标签', () => {
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const loginButton = screen.getByRole('button', { name: '登 录' })
      
      expect(emailInput).toHaveAttribute('autocomplete', 'email')
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
      expect(loginButton).toHaveAttribute('type', 'submit')
    })

    it('应该有合适的表单结构', () => {
      renderWithProviders(<LoginPage />)
      
      const form = document.querySelector('form')
      expect(form).toBeInTheDocument()
      expect(form).toHaveAttribute('id', 'login')
    })
  })

  describe('边界情况测试', () => {
    it('应该处理空白字符输入', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const loginButton = screen.getByRole('button', { name: '登 录' })
      
      await user.type(emailInput, '   ')
      await user.type(passwordInput, '   ')
      await user.click(loginButton)
      
      await waitFor(() => {
        expect(screen.getByText('请输入邮箱地址')).toBeInTheDocument()
        expect(screen.getByText('请输入密码')).toBeInTheDocument()
      })
    })

    it('应该处理超长输入', async () => {
      const user = userEvent.setup()
      vi.mocked(authService.login).mockResolvedValue(mockLoginResponse)
      
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      
      const longEmail = 'a'.repeat(100) + '@example.com'
      const longPassword = 'a'.repeat(200)
      
      await user.type(emailInput, longEmail)
      await user.type(passwordInput, longPassword)
      
      expect(emailInput).toHaveValue(longEmail)
      expect(passwordInput).toHaveValue(longPassword)
    })

    it('应该处理特殊字符输入', async () => {
      const user = userEvent.setup()
      vi.mocked(authService.login).mockResolvedValue(mockLoginResponse)
      
      renderWithProviders(<LoginPage />)
      
      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const loginButton = screen.getByRole('button', { name: '登 录' })
      
      await user.type(emailInput, 'test+tag@example.com')
      await user.type(passwordInput, 'p@ssw0rd!@#$%')
      await user.click(loginButton)
      
      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'test+tag@example.com',
          password: 'p@ssw0rd!@#$%'
        })
      })
    })
  })
})