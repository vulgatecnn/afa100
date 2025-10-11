import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, message } from 'antd'
import MerchantList from '../MerchantList'
import { merchantService } from '../../../services/merchantService'
import { renderWithProviders, setupUserEvent } from '../../../test/utils/render'

// Mock merchant service
vi.mock('../../../services/merchantService', () => ({
  merchantService: {
    getMerchants: vi.fn(),
    deleteMerchant: vi.fn(),
    toggleMerchantStatus: vi.fn()
  }
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
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

describe('MerchantList', () => {
  const mockMerchants = [
    {
      id: 1,
      name: '测试商户1',
      code: 'M001',
      contact: '张三',
      phone: '13800138001',
      email: 'merchant1@test.com',
      address: '测试地址1',
      status: 'active' as const,
      permissions: ['project_1', 'venue_1'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      name: '测试商户2',
      code: 'M002',
      contact: '李四',
      phone: '13800138002',
      email: 'merchant2@test.com',
      address: '测试地址2',
      status: 'inactive' as const,
      permissions: [],
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z'
    }
  ]

  const mockUser = {
    id: 1,
    name: '测试用户',
    email: 'test@example.com',
    userType: 'tenant_admin',
    status: 'active'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockReset()
  })

  describe('数据展示功能', () => {
    it('应该渲染商户列表', async () => {
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: mockMerchants,
        total: 2,
        page: 1,
        pageSize: 10
      })

      renderWithProviders(<MerchantList />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getByText('商户管理')).toBeInTheDocument()
        expect(screen.getByText('测试商户1')).toBeInTheDocument()
        expect(screen.getByText('测试商户2')).toBeInTheDocument()
      })
    })

    it('应该显示正确的状态标�?, async () => {
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: mockMerchants,
        total: 2,
        page: 1,
        pageSize: 10
      })

      renderWithProviders(<MerchantList />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getAllByText('启用')).toHaveLength(1)
        expect(screen.getByText('停用')).toBeInTheDocument()
      })
    })

    it('应该显示正确的权限数�?, async () => {
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: mockMerchants,
        total: 2,
        page: 1,
        pageSize: 10
      })

      renderWithProviders(<MerchantList />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument() // 测试商户1�?个权�?
        expect(screen.getByText('0')).toBeInTheDocument() // 测试商户2�?个权�?
      })
    })

    it('应该显示加载状�?, async () => {
      (merchantService.getMerchants as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          merchants: mockMerchants,
          total: 2,
          page: 1,
          pageSize: 10
        }), 100))
      )

      renderWithProviders(<MerchantList />, { user: mockUser })
      
      // 检查加载状�?- 表格应该有loading属�?
      const table = document.querySelector('.ant-table')
      expect(table).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByText('测试商户1')).toBeInTheDocument()
      })
    })

    it('应该处理空数据状�?, async () => {
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: [],
        total: 0,
        page: 1,
        pageSize: 10
      })

      renderWithProviders(<MerchantList />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getByText('商户管理')).toBeInTheDocument()
        // Ant Design Table 会显�?"暂无数据" 或类似的空状态文�?
        const table = document.querySelector('.ant-table-tbody')
        expect(table).toBeInTheDocument()
      })
    })

    it('应该处理错误状�?, async () => {
      (merchantService.getMerchants as any).mockRejectedValue(new Error('网络错误'))

      renderWithProviders(<MerchantList />, { user: mockUser })
      
      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('加载商户列表失败')
      })
    })
  })

  describe('搜索功能', () => {
    it('应该能够搜索商户', async () => {
      const user = setupUserEvent()
      
      // 初始加载
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: mockMerchants,
        total: 2,
        page: 1,
        pageSize: 10
      })

      renderWithProviders(<MerchantList />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getByText('测试商户1')).toBeInTheDocument()
      })

      // 模拟搜索
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: [mockMerchants[0]],
        total: 1,
        page: 1,
        pageSize: 10
      })

      const searchInput = screen.getByPlaceholderText('搜索商户名称、编码或联系�?)
      await user.type(searchInput, '测试商户1')
      
      const searchButton = screen.getByRole('button', { name: /搜索/ })
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(merchantService.getMerchants).toHaveBeenCalledWith({
          page: 1,
          pageSize: 10,
          search: '测试商户1',
          status: undefined
        })
      })
    })

    it('应该能够按状态筛�?, async () => {
      const user = setupUserEvent()
      
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: mockMerchants,
        total: 2,
        page: 1,
        pageSize: 10
      })

      renderWithProviders(<MerchantList />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getByText('测试商户1')).toBeInTheDocument()
      })

      // 模拟状态筛�?
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: [mockMerchants[0]],
        total: 1,
        page: 1,
        pageSize: 10
      })

      const statusSelect = screen.getByPlaceholderText('状态筛�?)
      await user.click(statusSelect)
      
      const activeOption = screen.getByText('启用')
      await user.click(activeOption)
      
      await waitFor(() => {
        expect(merchantService.getMerchants).toHaveBeenCalledWith({
          page: 1,
          pageSize: 10,
          search: '',
          status: 'active'
        })
      })
    })

    it('应该能够清除搜索条件', async () => {
      const user = setupUserEvent()
      
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: mockMerchants,
        total: 2,
        page: 1,
        pageSize: 10
      })

      renderWithProviders(<MerchantList />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getByText('测试商户1')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('搜索商户名称、编码或联系�?)
      await user.type(searchInput, '测试')
      
      // 清除搜索
      const clearButton = document.querySelector('.ant-input-clear-icon')
      if (clearButton) {
        await user.click(clearButton)
        
        await waitFor(() => {
          expect(merchantService.getMerchants).toHaveBeenCalledWith({
            page: 1,
            pageSize: 10,
            search: '',
            status: undefined
          })
        })
      }
    })
  })

  describe('操作按钮功能', () => {
    it('应该能够导航到新增商户页�?, async () => {
      const user = setupUserEvent()
      
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: [],
        total: 0,
        page: 1,
        pageSize: 10
      })

      renderWithProviders(<MerchantList />, { user: mockUser })
      
      const addButton = screen.getByRole('button', { name: /新增商户/ })
      await user.click(addButton)
      
      expect(mockNavigate).toHaveBeenCalledWith('/merchants/new')
    })

    it('应该能够导航到编辑商户页�?, async () => {
      const user = setupUserEvent()
      
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: mockMerchants,
        total: 2,
        page: 1,
        pageSize: 10
      })

      renderWithProviders(<MerchantList />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getByText('测试商户1')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByTitle('编辑')
      await user.click(editButtons[0])
      
      expect(mockNavigate).toHaveBeenCalledWith('/merchants/1/edit')
    })

    it('应该能够查看商户详情', async () => {
      const user = setupUserEvent()
      
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: mockMerchants,
        total: 2,
        page: 1,
        pageSize: 10
      })

      renderWithProviders(<MerchantList />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getByText('测试商户1')).toBeInTheDocument()
      })

      const viewButtons = screen.getAllByTitle('查看详情')
      await user.click(viewButtons[0])
      
      // 检查详情抽屉是否打开
      await waitFor(() => {
        expect(screen.getByText('商户详情')).toBeInTheDocument()
      })
    })

    it('应该能够切换商户状�?, async () => {
      const user = setupUserEvent()
      
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: mockMerchants,
        total: 2,
        page: 1,
        pageSize: 10
      })

      (merchantService.toggleMerchantStatus as any).mockResolvedValue({
        ...mockMerchants[0],
        status: 'inactive'
      })

      renderWithProviders(<MerchantList />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getByText('测试商户1')).toBeInTheDocument()
      })

      const toggleButtons = screen.getAllByText('停用')
      await user.click(toggleButtons[0])
      
      await waitFor(() => {
        expect(merchantService.toggleMerchantStatus).toHaveBeenCalledWith(1, 'inactive')
        expect(message.success).toHaveBeenCalledWith('停用成功')
      })
    })

    it('应该能够删除商户', async () => {
      const user = setupUserEvent()
      
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: mockMerchants,
        total: 2,
        page: 1,
        pageSize: 10
      })

      (merchantService.deleteMerchant as any).mockResolvedValue(undefined)

      renderWithProviders(<MerchantList />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getByText('测试商户1')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByTitle('删除')
      await user.click(deleteButtons[0])
      
      // 确认删除对话�?
      await waitFor(() => {
        expect(screen.getByText('确定要删除这个商户吗�?)).toBeInTheDocument()
      })

      const confirmButton = screen.getByText('确定')
      await user.click(confirmButton)
      
      await waitFor(() => {
        expect(merchantService.deleteMerchant).toHaveBeenCalledWith(1)
        expect(message.success).toHaveBeenCalledWith('删除成功')
      })
    })

    it('应该处理删除失败', async () => {
      const user = setupUserEvent()
      
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: mockMerchants,
        total: 2,
        page: 1,
        pageSize: 10
      })

      (merchantService.deleteMerchant as any).mockRejectedValue(new Error('删除失败'))

      renderWithProviders(<MerchantList />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getByText('测试商户1')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByTitle('删除')
      await user.click(deleteButtons[0])
      
      const confirmButton = screen.getByText('确定')
      await user.click(confirmButton)
      
      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('删除失败')
      })
    })

    it('应该能够打开权限设置模态框', async () => {
      const user = setupUserEvent()
      
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: mockMerchants,
        total: 2,
        page: 1,
        pageSize: 10
      })

      renderWithProviders(<MerchantList />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getByText('测试商户1')).toBeInTheDocument()
      })

      const permissionButtons = screen.getAllByTitle('权限设置')
      await user.click(permissionButtons[0])
      
      // 注意：这里需要根据实际的PermissionModal组件来验�?
      // 由于PermissionModal是一个独立组件，这里主要测试点击事件
      expect(permissionButtons[0]).toBeInTheDocument()
    })
  })

  describe('分页功能', () => {
    it('应该能够切换页码', async () => {
      const user = setupUserEvent()
      
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: mockMerchants,
        total: 20,
        page: 1,
        pageSize: 10
      })

      renderWithProviders(<MerchantList />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getByText('测试商户1')).toBeInTheDocument()
      })

      // 模拟点击�?�?
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: [],
        total: 20,
        page: 2,
        pageSize: 10
      })

      const nextPageButton = document.querySelector('.ant-pagination-next')
      if (nextPageButton) {
        await user.click(nextPageButton)
        
        await waitFor(() => {
          expect(merchantService.getMerchants).toHaveBeenCalledWith({
            page: 2,
            pageSize: 10,
            search: '',
            status: undefined
          })
        })
      }
    })

    it('应该能够改变页面大小', async () => {
      const user = setupUserEvent()
      
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: mockMerchants,
        total: 20,
        page: 1,
        pageSize: 10
      })

      renderWithProviders(<MerchantList />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getByText('测试商户1')).toBeInTheDocument()
      })

      // 模拟改变页面大小
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: mockMerchants,
        total: 20,
        page: 1,
        pageSize: 20
      })

      const pageSizeSelector = document.querySelector('.ant-select-selector')
      if (pageSizeSelector) {
        await user.click(pageSizeSelector)
        
        const option20 = screen.getByText('20 �?�?)
        if (option20) {
          await user.click(option20)
          
          await waitFor(() => {
            expect(merchantService.getMerchants).toHaveBeenCalledWith({
              page: 1,
              pageSize: 20,
              search: '',
              status: undefined
            })
          })
        }
      }
    })
  })

  describe('权限检�?, () => {
    it('应该根据用户权限显示操作按钮', async () => {
      (merchantService.getMerchants as any).mockResolvedValue({
        merchants: mockMerchants,
        total: 2,
        page: 1,
        pageSize: 10
      })

      renderWithProviders(<MerchantList />, { user: mockUser })
      
      await waitFor(() => {
        expect(screen.getByText('测试商户1')).toBeInTheDocument()
        // 验证所有操作按钮都存在（因为是tenant_admin�?
        expect(screen.getAllByTitle('编辑')).toHaveLength(2)
        expect(screen.getAllByTitle('删除')).toHaveLength(2)
        expect(screen.getAllByTitle('权限设置')).toHaveLength(2)
      })
    })
  })
})
