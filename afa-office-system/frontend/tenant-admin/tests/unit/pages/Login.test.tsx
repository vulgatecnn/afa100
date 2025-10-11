import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import LoginPage from '../../../src/pages/Login'
import { AuthContext } from '../../../src/contexts/AuthContext'

// Mock CSS import
vi.mock('../../../src/pages/Login/Login.css', () => ({}))

// 创建测试用的AuthContext Provider
const createMockAuthContext = (overrides = {}) => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  ...overrides
})

const renderLoginPage = (authContextValue = {}) => {
  const mockAuthContext = createMockAuthContext(authContextValue)
  
  return {
    ...render(
      <BrowserRouter>
        <ConfigProvider locale={zhCN}>
          <AuthContext.Provider value={mockAuthContext}>
            <LoginPage />
          </AuthContext.Provider>
        </ConfigProvider>
      </BrowserRouter>
    ),
    mockAuthContext
  }
}

// 辅助函数：获取登录按钮
const getLoginButton = () => screen.getByRole('button', { name: /登.*录/ })

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('页面渲染', () => {
    it('应该正确渲染登录页面', () => {
      renderLoginPage()

      // 检查页面标题
      expect(screen.getByText('AFA租务管理系统')).toBeInTheDocument()
      expect(screen.getByText('请使用您的账号登录系统')).toBeInTheDocument()

      // 检查表单元素
      expect(screen.getByPlaceholderText('邮箱地址')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('密码')).toBeInTheDocument()
      expect(getLoginButton()).toBeInTheDocument()

      // 检查版权信息
      expect(screen.getByText('© 2024 AFA办公小程序. 保留所有权利.')).toBeInTheDocument()
    })

    it('应该正确设置表单字段属性', () => {
      renderLoginPage()

      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')

      // 检查input类型和属性
      expect(emailInput).toHaveAttribute('type', 'text')
      expect(emailInput).toHaveAttribute('autocomplete', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    })

    it('应该显示正确的图标', () => {
      renderLoginPage()

      // 检查用户图标和锁图标是否存在
      const userIcon = document.querySelector('.anticon-user')
      const lockIcon = document.querySelector('.anticon-lock')

      expect(userIcon).toBeInTheDocument()
      expect(lockIcon).toBeInTheDocument()
    })
  })

  describe('表单验证', () => {
    it('应该在邮箱为空时显示错误信息', async () => {
      renderLoginPage()

      const submitButton = getLoginButton()
      
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('请输入邮箱地址')).toBeInTheDocument()
      })
    })

    it('应该在邮箱格式无效时显示错误信息', async () => {
      renderLoginPage()

      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const submitButton = getLoginButton()

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('请输入有效的邮箱地址')).toBeInTheDocument()
      })
    })

    it('应该在密码为空时显示错误信息', async () => {
      renderLoginPage()

      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const submitButton = getLoginButton()

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('请输入密码')).toBeInTheDocument()
      })
    })

    it('应该在密码长度不足时显示错误信息', async () => {
      renderLoginPage()

      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const submitButton = getLoginButton()

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: '123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('密码至少6位字符')).toBeInTheDocument()
      })
    })

    it('应该在所有字段有效时不显示验证错误', async () => {
      const { mockAuthContext } = renderLoginPage()

      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const submitButton = getLoginButton()

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      // 验证没有错误信息
      expect(screen.queryByText('请输入邮箱地址')).not.toBeInTheDocument()
      expect(screen.queryByText('请输入有效的邮箱地址')).not.toBeInTheDocument()
      expect(screen.queryByText('请输入密码')).not.toBeInTheDocument()
      expect(screen.queryByText('密码至少6位字符')).not.toBeInTheDocument()

      // 验证调用了登录函数
      expect(mockAuthContext.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })
  })

  describe('表单提交', () => {
    it('应该在成功登录时调用login函数', async () => {
      const mockLogin = vi.fn().mockResolvedValue(undefined)
      const { mockAuthContext } = renderLoginPage({ login: mockLogin })

      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const submitButton = getLoginButton()

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    it('应该在登录失败时正确处理错误', async () => {
      const mockLogin = vi.fn().mockRejectedValue(new Error('登录失败'))
      renderLoginPage({ login: mockLogin })

      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const submitButton = getLoginButton()

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
      fireEvent.click(submitButton)

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'wrongpassword'
      })

      // 验证错误被正确处理（不会导致页面崩溃）
      await waitFor(() => {
        expect(getLoginButton()).not.toHaveAttribute('disabled')
      })
    })

    it('应该支持键盘提交（Enter键）', async () => {
      const mockLogin = vi.fn().mockResolvedValue(undefined)
      renderLoginPage({ login: mockLogin })

      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const form = screen.getByRole('form')

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.submit(form)

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })
  })

  describe('加载状态', () => {
    it('应该在登录过程中显示加载状态', async () => {
      let resolveLogin: () => void
      const loginPromise = new Promise<void>(resolve => {
        resolveLogin = resolve
      })
      const mockLogin = vi.fn().mockReturnValue(loginPromise)
      
      renderLoginPage({ login: mockLogin })

      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const submitButton = getLoginButton()

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      // 检查加载状态
      expect(submitButton).toHaveClass('ant-btn-loading')
      expect(submitButton).toHaveAttribute('disabled')

      // 完成登录
      resolveLogin!()
      await waitFor(() => {
        expect(submitButton).not.toHaveClass('ant-btn-loading')
        expect(submitButton).not.toHaveAttribute('disabled')
      })
    })

    it('应该在登录失败后恢复正常状态', async () => {
      const mockLogin = vi.fn().mockRejectedValue(new Error('登录失败'))
      renderLoginPage({ login: mockLogin })

      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const submitButton = getLoginButton()

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
      fireEvent.click(submitButton)

      // 等待登录完成
      await waitFor(() => {
        expect(submitButton).not.toHaveClass('ant-btn-loading')
        expect(submitButton).not.toHaveAttribute('disabled')
      })
    })

    it('应该在AuthContext loading时不影响本地loading状态', () => {
      renderLoginPage({ loading: true })

      const submitButton = getLoginButton()
      
      // AuthContext的loading不应该影响登录按钮的状态
      expect(submitButton).not.toHaveClass('ant-btn-loading')
      expect(submitButton).not.toHaveAttribute('disabled')
    })
  })

  describe('用户交互', () => {
    it('应该支持表单字段的基本交互', () => {
      renderLoginPage()

      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('password123')
    })

    it('应该支持密码字段的显示/隐藏切换', () => {
      renderLoginPage()

      const passwordInput = screen.getByPlaceholderText('密码')
      
      // 初始状态应该是password类型
      expect(passwordInput).toHaveAttribute('type', 'password')

      // 查找密码显示/隐藏按钮
      const toggleButton = document.querySelector('.ant-input-password-icon')
      expect(toggleButton).toBeInTheDocument()

      if (toggleButton) {
        fireEvent.click(toggleButton)
        // 点击后应该变为text类型
        expect(passwordInput).toHaveAttribute('type', 'text')

        fireEvent.click(toggleButton)
        // 再次点击应该变回password类型
        expect(passwordInput).toHaveAttribute('type', 'password')
      }
    })

    it('应该正确处理表单重置', () => {
      renderLoginPage()

      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')

      // 填写表单
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('password123')

      // 清空表单
      fireEvent.change(emailInput, { target: { value: '' } })
      fireEvent.change(passwordInput, { target: { value: '' } })

      expect(emailInput).toHaveValue('')
      expect(passwordInput).toHaveValue('')
    })
  })

  describe('无障碍访问', () => {
    it('应该具有正确的ARIA标签', () => {
      renderLoginPage()

      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const submitButton = getLoginButton()

      expect(emailInput).toHaveAttribute('aria-required', 'true')
      expect(passwordInput).toHaveAttribute('aria-required', 'true')
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('应该在验证失败时正确设置ARIA属性', async () => {
      renderLoginPage()

      const submitButton = getLoginButton()
      fireEvent.click(submitButton)

      await waitFor(() => {
        const emailInput = screen.getByPlaceholderText('邮箱地址')
        expect(emailInput).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('应该支持屏幕阅读器', () => {
      renderLoginPage()

      // 检查重要元素是否有适当的标签
      expect(screen.getByRole('heading')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('邮箱地址')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('密码')).toBeInTheDocument()
    })
  })

  describe('边界情况', () => {
    it('应该处理极长的输入', () => {
      renderLoginPage()

      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const longEmail = 'a'.repeat(50) + '@example.com'

      fireEvent.change(emailInput, { target: { value: longEmail } })
      expect(emailInput).toHaveValue(longEmail)
    })

    it('应该处理特殊字符输入', () => {
      renderLoginPage()

      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')

      const specialEmail = 'test+tag@example.com'
      const specialPassword = 'p@ssw0rd!#$'

      fireEvent.change(emailInput, { target: { value: specialEmail } })
      fireEvent.change(passwordInput, { target: { value: specialPassword } })

      expect(emailInput).toHaveValue(specialEmail)
      expect(passwordInput).toHaveValue(specialPassword)
    })

    it('应该处理快速连续点击', async () => {
      const mockLogin = vi.fn().mockResolvedValue(undefined)
      renderLoginPage({ login: mockLogin })

      const emailInput = screen.getByPlaceholderText('邮箱地址')
      const passwordInput = screen.getByPlaceholderText('密码')
      const submitButton = getLoginButton()

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      // 快速连续点击
      fireEvent.click(submitButton)
      fireEvent.click(submitButton)
      fireEvent.click(submitButton)

      // 应该只调用一次登录（防止重复提交）
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(1)
      })
    })
  })
})