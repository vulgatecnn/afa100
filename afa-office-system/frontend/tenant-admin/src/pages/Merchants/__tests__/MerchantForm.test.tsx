import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, Form, message } from 'antd'
import MerchantForm from '../MerchantForm'
import { merchantService } from '../../../services/merchantService'
import { renderWithProviders, setupUserEvent } from '../../../test/utils/render'

// Mock merchant service
vi.mock('../../../services/merchantService', () => ({
  merchantService: {
    getMerchant: vi.fn(),
    createMerchant: vi.fn(),
    updateMerchant: vi.fn()
  }
}))

// Mock useNavigate and useParams
const mockNavigate = vi.fn()
let mockParams = {}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams
  }
})

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

describe('MerchantForm', () => {
  const mockUser = {
    id: 1,
    name: '测试用户',
    email: 'test@example.com',
    userType: 'tenant_admin',
    status: 'active'
  }

  const mockMerchant = {
    id: 1,
    name: '测试商户',
    code: 'TEST001',
    contact: '张三',
    phone: '13800138001',
    email: 'test@example.com',
    address: '测试地址',
    status: 'active' as const,
    permissions: ['project_1'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockReset()
    mockParams = {}
  })

  describe('新增模式', () => {
    beforeEach(() => {
      mockParams = {}
    })

    it('应该渲染新增商户表单', async () => {
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getByText('新增商户')).toBeInTheDocument()
        expect(screen.getByLabelText('商户名称')).toBeInTheDocument()
        expect(screen.getByLabelText('商户编码')).toBeInTheDocument()
        expect(screen.getByLabelText('联系人')).toBeInTheDocument()
        expect(screen.getByLabelText('联系电话')).toBeInTheDocument()
        expect(screen.getByLabelText('邮箱地址')).toBeInTheDocument()
        expect(screen.getByLabelText('地址')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /创建/ })).toBeInTheDocument()
      })
    })

    it('应该验证必填字段', async () => {
      const user = setupUserEvent()
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      const submitButton = screen.getByRole('button', { name: /创建/ })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('请输入商户名�?)).toBeInTheDocument()
        expect(screen.getByText('请输入商户编�?)).toBeInTheDocument()
        expect(screen.getByText('请输入联系人姓名')).toBeInTheDocument()
        expect(screen.getByText('请输入联系电�?)).toBeInTheDocument()
        expect(screen.getByText('请输入邮箱地址')).toBeInTheDocument()
        expect(screen.getByText('请输入地址')).toBeInTheDocument()
      })
    })

    it('应该验证商户名称长度', async () => {
      const user = setupUserEvent()
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      const nameInput = screen.getByLabelText('商户名称')
      await user.type(nameInput, 'a'.repeat(101)) // 超过100个字�?
      
      const submitButton = screen.getByRole('button', { name: /创建/ })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('商户名称不能超过100个字�?)).toBeInTheDocument()
      })
    })

    it('应该验证商户编码格式', async () => {
      const user = setupUserEvent()
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      const codeInput = screen.getByLabelText('商户编码')
      await user.type(codeInput, 'invalid-code') // 包含小写字母和连字符
      
      const submitButton = screen.getByRole('button', { name: /创建/ })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('编码只能包含大写字母、数字和下划�?)).toBeInTheDocument()
      })
    })

    it('应该验证商户编码长度', async () => {
      const user = setupUserEvent()
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      const codeInput = screen.getByLabelText('商户编码')
      await user.type(codeInput, 'A'.repeat(21)) // 超过20个字�?
      
      const submitButton = screen.getByRole('button', { name: /创建/ })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('编码不能超过20个字�?)).toBeInTheDocument()
      })
    })

    it('应该验证联系人姓名长�?, async () => {
      const user = setupUserEvent()
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      const contactInput = screen.getByLabelText('联系�?)
      await user.type(contactInput, 'a'.repeat(51)) // 超过50个字�?
      
      const submitButton = screen.getByRole('button', { name: /创建/ })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('联系人姓名不能超�?0个字�?)).toBeInTheDocument()
      })
    })

    it('应该验证手机号格�?, async () => {
      const user = setupUserEvent()
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      const phoneInput = screen.getByLabelText('联系电话')
      await user.type(phoneInput, '123456789') // 无效手机�?
      
      const submitButton = screen.getByRole('button', { name: /创建/ })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('请输入有效的手机号码')).toBeInTheDocument()
      })
    })

    it('应该验证邮箱格式', async () => {
      const user = setupUserEvent()
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      const emailInput = screen.getByLabelText('邮箱地址')
      await user.type(emailInput, 'invalid-email')
      
      const submitButton = screen.getByRole('button', { name: /创建/ })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('请输入有效的邮箱地址')).toBeInTheDocument()
      })
    })

    it('应该验证地址长度', async () => {
      const user = setupUserEvent()
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      const addressInput = screen.getByLabelText('地址')
      await user.type(addressInput, 'a'.repeat(201)) // 超过200个字�?
      
      const submitButton = screen.getByRole('button', { name: /创建/ })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('地址不能超过200个字�?)).toBeInTheDocument()
      })
    })

    it('应该能够成功提交新增表单', async () => {
      const user = setupUserEvent()
      
      (merchantService.createMerchant as any).mockResolvedValue(mockMerchant)
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      // 填写表单
      await user.type(screen.getByLabelText('商户名称'), '测试商户')
      await user.type(screen.getByLabelText('商户编码'), 'TEST001')
      await user.type(screen.getByLabelText('联系�?), '张三')
      await user.type(screen.getByLabelText('联系电话'), '13800138001')
      await user.type(screen.getByLabelText('邮箱地址'), 'test@example.com')
      await user.type(screen.getByLabelText('地址'), '测试地址')
      
      const submitButton = screen.getByRole('button', { name: /创建/ })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(merchantService.createMerchant).toHaveBeenCalledWith({
          name: '测试商户',
          code: 'TEST001',
          contact: '张三',
          phone: '13800138001',
          email: 'test@example.com',
          address: '测试地址',
          permissions: []
        })
        expect(message.success).toHaveBeenCalledWith('创建成功')
        expect(mockNavigate).toHaveBeenCalledWith('/merchants')
      })
    })

    it('应该处理创建失败', async () => {
      const user = setupUserEvent()
      
      (merchantService.createMerchant as any).mockRejectedValue(new Error('创建失败'))
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      // 填写表单
      await user.type(screen.getByLabelText('商户名称'), '测试商户')
      await user.type(screen.getByLabelText('商户编码'), 'TEST001')
      await user.type(screen.getByLabelText('联系�?), '张三')
      await user.type(screen.getByLabelText('联系电话'), '13800138001')
      await user.type(screen.getByLabelText('邮箱地址'), 'test@example.com')
      await user.type(screen.getByLabelText('地址'), '测试地址')
      
      const submitButton = screen.getByRole('button', { name: /创建/ })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('创建失败')
      })
    })

    it('应该能够取消并返回列�?, async () => {
      const user = setupUserEvent()
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      const cancelButton = screen.getByRole('button', { name: /取消/ })
      await user.click(cancelButton)
      
      expect(mockNavigate).toHaveBeenCalledWith('/merchants')
    })

    it('应该能够点击返回按钮', async () => {
      const user = setupUserEvent()
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      const backButton = screen.getByRole('button', { name: /返回/ })
      await user.click(backButton)
      
      expect(mockNavigate).toHaveBeenCalledWith('/merchants')
    })
  })

  describe('编辑模式', () => {
    beforeEach(() => {
      mockParams = { id: '1' }
    })

    it('应该渲染编辑商户表单', async () => {
      (merchantService.getMerchant as any).mockResolvedValue(mockMerchant)
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getByText('编辑商户')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /更新/ })).toBeInTheDocument()
      })
    })

    it('应该加载并填充商户数�?, async () => {
      (merchantService.getMerchant as any).mockResolvedValue(mockMerchant)
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      await waitFor(() => {
        expect(merchantService.getMerchant).toHaveBeenCalledWith(1)
        expect(screen.getByDisplayValue('测试商户')).toBeInTheDocument()
        expect(screen.getByDisplayValue('TEST001')).toBeInTheDocument()
        expect(screen.getByDisplayValue('张三')).toBeInTheDocument()
        expect(screen.getByDisplayValue('13800138001')).toBeInTheDocument()
        expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
        expect(screen.getByDisplayValue('测试地址')).toBeInTheDocument()
      })
    })

    it('应该处理加载商户数据失败', async () => {
      (merchantService.getMerchant as any).mockRejectedValue(new Error('加载失败'))
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('加载商户信息失败')
        expect(mockNavigate).toHaveBeenCalledWith('/merchants')
      })
    })

    it('应该能够成功提交更新表单', async () => {
      const user = setupUserEvent()
      
      (merchantService.getMerchant as any).mockResolvedValue(mockMerchant)
      (merchantService.updateMerchant as any).mockResolvedValue({
        ...mockMerchant,
        name: '更新后的商户'
      })
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('测试商户')).toBeInTheDocument()
      })
      
      // 修改商户名称
      const nameInput = screen.getByLabelText('商户名称')
      await user.clear(nameInput)
      await user.type(nameInput, '更新后的商户')
      
      const submitButton = screen.getByRole('button', { name: /更新/ })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(merchantService.updateMerchant).toHaveBeenCalledWith(1, {
          name: '更新后的商户',
          code: 'TEST001',
          contact: '张三',
          phone: '13800138001',
          email: 'test@example.com',
          address: '测试地址',
          permissions: ['project_1']
        })
        expect(message.success).toHaveBeenCalledWith('更新成功')
        expect(mockNavigate).toHaveBeenCalledWith('/merchants')
      })
    })

    it('应该处理更新失败', async () => {
      const user = setupUserEvent()
      
      (merchantService.getMerchant as any).mockResolvedValue(mockMerchant)
      (merchantService.updateMerchant as any).mockRejectedValue(new Error('更新失败'))
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('测试商户')).toBeInTheDocument()
      })
      
      const submitButton = screen.getByRole('button', { name: /更新/ })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('更新失败')
      })
    })

    it('应该显示加载状�?, async () => {
      (merchantService.getMerchant as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockMerchant), 100))
      )
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      // 检查加载状�?
      expect(screen.getByRole('button', { name: /更新/ })).toBeDisabled()
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('测试商户')).toBeInTheDocument()
      })
    })
  })

  describe('表单交互', () => {
    beforeEach(() => {
      mockParams = {}
    })

    it('应该自动转换商户编码为大�?, async () => {
      const user = setupUserEvent()
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      const codeInput = screen.getByLabelText('商户编码')
      await user.type(codeInput, 'test001')
      
      // 检查输入框的样式是否设置为大写转换
      expect(codeInput).toHaveStyle('text-transform: uppercase')
    })

    it('应该显示地址字符计数', async () => {
      const user = setupUserEvent()
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      const addressInput = screen.getByLabelText('地址')
      await user.type(addressInput, '测试地址内容')
      
      // 检查字符计数显�?
      expect(screen.getByText(/6 \/ 200/)).toBeInTheDocument()
    })

    it('应该在提交时显示加载状�?, async () => {
      const user = setupUserEvent()
      
      (merchantService.createMerchant as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockMerchant), 100))
      )
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      // 填写表单
      await user.type(screen.getByLabelText('商户名称'), '测试商户')
      await user.type(screen.getByLabelText('商户编码'), 'TEST001')
      await user.type(screen.getByLabelText('联系�?), '张三')
      await user.type(screen.getByLabelText('联系电话'), '13800138001')
      await user.type(screen.getByLabelText('邮箱地址'), 'test@example.com')
      await user.type(screen.getByLabelText('地址'), '测试地址')
      
      const submitButton = screen.getByRole('button', { name: /创建/ })
      await user.click(submitButton)
      
      // 检查按钮加载状�?
      expect(submitButton).toBeDisabled()
      expect(document.querySelector('.ant-btn-loading')).toBeTruthy()
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/merchants')
      })
    })
  })

  describe('边界情况', () => {
    it('应该处理无效的商户ID', async () => {
      mockParams = { id: 'invalid' }
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      // 由于parseInt('invalid')会返回NaN，组件应该处理这种情�?
      expect(screen.getByText('新增商户')).toBeInTheDocument()
    })

    it('应该处理空的商户ID', async () => {
      mockParams = { id: '' }
      
      renderWithProviders(<MerchantForm />, { user: mockUser })
      
      expect(screen.getByText('新增商户')).toBeInTheDocument()
    })
  })
})
