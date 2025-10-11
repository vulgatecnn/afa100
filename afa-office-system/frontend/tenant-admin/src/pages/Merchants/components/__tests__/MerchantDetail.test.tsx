import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import MerchantDetail from '../MerchantDetail'
import type { Merchant } from '../../../../services/merchantService'

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ConfigProvider locale={zhCN}>
      {component}
    </ConfigProvider>
  )
}

describe('MerchantDetail', () => {
  const mockMerchant: Merchant = {
    id: 1,
    name: '测试商户',
    code: 'TEST001',
    contact: '张三',
    phone: '13800138001',
    email: 'test@example.com',
    address: '测试地址',
    status: 'active',
    permissions: ['project_1', 'venue_1', 'floor_1'],
    createdAt: '2024-01-01T10:30:00Z',
    updatedAt: '2024-01-02T15:45:00Z'
  }

  const mockInactiveMerchant: Merchant = {
    ...mockMerchant,
    id: 2,
    name: '停用商户',
    status: 'inactive',
    permissions: []
  }

  describe('基本信息展示', () => {
    it('应该正确显示商户基本信息', () => {
      renderWithProviders(<MerchantDetail merchant={mockMerchant} />)
      
      expect(screen.getByText('测试商户')).toBeInTheDocument()
      expect(screen.getByText('TEST001')).toBeInTheDocument()
      expect(screen.getByText('张三')).toBeInTheDocument()
      expect(screen.getByText('13800138001')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByText('测试地址')).toBeInTheDocument()
    })

    it('应该显示正确的状态标签 - 启用状态', () => {
      renderWithProviders(<MerchantDetail merchant={mockMerchant} />)
      
      const statusTag = screen.getByText('启用')
      expect(statusTag).toBeInTheDocument()
      expect(statusTag.closest('.ant-tag')).toHaveClass('ant-tag-green')
    })

    it('应该显示正确的状态标签 - 停用状态', () => {
      renderWithProviders(<MerchantDetail merchant={mockInactiveMerchant} />)
      
      const statusTag = screen.getByText('停用')
      expect(statusTag).toBeInTheDocument()
      expect(statusTag.closest('.ant-tag')).toHaveClass('ant-tag-red')
    })

    it('应该显示商户编码为代码格式', () => {
      renderWithProviders(<MerchantDetail merchant={mockMerchant} />)
      
      const codeElement = screen.getByText('TEST001')
      expect(codeElement).toBeInTheDocument()
      // 检查是否有代码样式的父元素
      expect(codeElement.closest('code')).toBeInTheDocument()
    })
  })

  describe('权限信息展示', () => {
    it('应该显示正确的权限数量', () => {
      renderWithProviders(<MerchantDetail merchant={mockMerchant} />)
      
      expect(screen.getByText('3 个权限')).toBeInTheDocument()
      expect(screen.getByText('(点击权限设置查看详情)')).toBeInTheDocument()
    })

    it('应该显示权限列表', () => {
      renderWithProviders(<MerchantDetail merchant={mockMerchant} />)
      
      expect(screen.getByText('权限列表')).toBeInTheDocument()
      expect(screen.getByText('project_1')).toBeInTheDocument()
      expect(screen.getByText('venue_1')).toBeInTheDocument()
      expect(screen.getByText('floor_1')).toBeInTheDocument()
      
      // 检查权限标签样式
      const permissionTags = screen.getAllByText(/project_1|venue_1|floor_1/)
      permissionTags.forEach(tag => {
        expect(tag.closest('.ant-tag')).toHaveClass('ant-tag-blue')
      })
    })

    it('应该处理无权限的情况', () => {
      renderWithProviders(<MerchantDetail merchant={mockInactiveMerchant} />)
      
      expect(screen.getByText('0 个权限')).toBeInTheDocument()
      expect(screen.queryByText('(点击权限设置查看详情)')).not.toBeInTheDocument()
      expect(screen.queryByText('权限列表')).not.toBeInTheDocument()
    })

    it('应该处理权限数组为undefined的情况', () => {
      const merchantWithoutPermissions = {
        ...mockMerchant,
        permissions: undefined as any
      }
      
      renderWithProviders(<MerchantDetail merchant={merchantWithoutPermissions} />)
      
      expect(screen.getByText('0 个权限')).toBeInTheDocument()
      expect(screen.queryByText('权限列表')).not.toBeInTheDocument()
    })
  })

  describe('时间信息展示', () => {
    it('应该正确格式化并显示创建时间', () => {
      renderWithProviders(<MerchantDetail merchant={mockMerchant} />)
      
      // 检查时间是否被正确格式化显示
      const createTime = new Date('2024-01-01T10:30:00Z').toLocaleString()
      expect(screen.getByText(createTime)).toBeInTheDocument()
    })

    it('应该正确格式化并显示更新时间', () => {
      renderWithProviders(<MerchantDetail merchant={mockMerchant} />)
      
      // 检查时间是否被正确格式化显示
      const updateTime = new Date('2024-01-02T15:45:00Z').toLocaleString()
      expect(screen.getByText(updateTime)).toBeInTheDocument()
    })
  })

  describe('布局和样式', () => {
    it('应该使用正确的Descriptions布局', () => {
      renderWithProviders(<MerchantDetail merchant={mockMerchant} />)
      
      const descriptions = document.querySelector('.ant-descriptions')
      expect(descriptions).toBeInTheDocument()
      expect(descriptions).toHaveClass('ant-descriptions-bordered')
    })

    it('应该为权限列表设置正确的样式', () => {
      renderWithProviders(<MerchantDetail merchant={mockMerchant} />)
      
      const permissionSection = screen.getByText('权限列表').closest('div')
      expect(permissionSection).toBeInTheDocument()
      expect(permissionSection).toHaveStyle('margin-top: 24px')
    })

    it('应该正确设置权限区域的边距', () => {
      renderWithProviders(<MerchantDetail merchant={mockMerchant} />)
      
      const permissionSection = screen.getByText('权限列表').closest('div')
      expect(permissionSection).toHaveStyle('margin-top: 24px')
    })
  })

  describe('边界情况', () => {
    it('应该处理空字符串字段', () => {
      const merchantWithEmptyFields = {
        ...mockMerchant,
        contact: '',
        phone: '',
        email: '',
        address: ''
      }
      
      renderWithProviders(<MerchantDetail merchant={merchantWithEmptyFields} />)
      
      // 组件应该正常渲染，即使某些字段为空
      expect(screen.getByText('测试商户')).toBeInTheDocument()
      expect(screen.getByText('TEST001')).toBeInTheDocument()
    })

    it('应该处理null字段', () => {
      const merchantWithNullFields = {
        ...mockMerchant,
        contact: null as any,
        phone: null as any,
        email: null as any,
        address: null as any
      }
      
      renderWithProviders(<MerchantDetail merchant={merchantWithNullFields} />)
      
      // 组件应该正常渲染
      expect(screen.getByText('测试商户')).toBeInTheDocument()
    })

    it('应该处理大量权限的情况', () => {
      const merchantWithManyPermissions = {
        ...mockMerchant,
        permissions: Array.from({ length: 20 }, (_, i) => `permission_${i + 1}`)
      }
      
      renderWithProviders(<MerchantDetail merchant={merchantWithManyPermissions} />)
      
      expect(screen.getByText('20 个权限')).toBeInTheDocument()
      expect(screen.getByText('权限列表')).toBeInTheDocument()
      
      // 检查权限列表是否存在
      const permissionSection = screen.getByText('权限列表')
      expect(permissionSection).toBeInTheDocument()
    })

    it('应该处理无效的时间格式', () => {
      const merchantWithInvalidTime = {
        ...mockMerchant,
        createdAt: 'invalid-date',
        updatedAt: 'invalid-date'
      }
      
      renderWithProviders(<MerchantDetail merchant={merchantWithInvalidTime} />)
      
      // 组件应该正常渲染，即使时间格式无效
      expect(screen.getByText('测试商户')).toBeInTheDocument()
    })
  })

  describe('可访问性', () => {
    it('应该为描述列表提供正确的语义结构', () => {
      renderWithProviders(<MerchantDetail merchant={mockMerchant} />)
      
      const descriptions = document.querySelector('.ant-descriptions')
      expect(descriptions).toBeInTheDocument()
      
      // 检查是否有正确的描述项结构
      const descriptionsElement = document.querySelector('.ant-descriptions')
      expect(descriptionsElement).toBeInTheDocument()
      
      // 检查描述项
      const descriptionItems = document.querySelectorAll('.ant-descriptions-item, .ant-descriptions-row')
      expect(descriptionItems.length).toBeGreaterThan(0)
    })

    it('应该为状态标签提供正确的颜色对比', () => {
      renderWithProviders(<MerchantDetail merchant={mockMerchant} />)
      
      const statusTag = screen.getByText('启用')
      expect(statusTag.closest('.ant-tag-green')).toBeInTheDocument()
    })
  })
})