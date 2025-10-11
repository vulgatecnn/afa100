import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PermissionModal from '../PermissionModal'
import type { Employee } from '../../services/employeeService'

// Mock the employee service
vi.mock('../../services/employeeService', () => ({
  employeeService: {
    assignPermissions: vi.fn()
  }
}))

describe('PermissionModal', () => {
  const mockEmployee: Employee = {
    id: 1,
    name: '张三',
    phone: '13800138000',
    email: 'zhangsan@example.com',
    department: '技术部',
    position: '高级工程师',
    status: 'active',
    permissions: ['project_1_access', 'visitor_approve'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }

  const defaultProps = {
    visible: true,
    employee: mockEmployee,
    onCancel: vi.fn(),
    onSuccess: vi.fn()
  }

  it('should render permission modal with employee info', () => {
    render(<PermissionModal {...defaultProps} />)
    
    expect(screen.getByText('权限设置')).toBeInTheDocument()
    expect(screen.getByText('张三')).toBeInTheDocument()
    // 部门和职位信息在同一行文本中
    expect(screen.getByText(/部门：技术部/)).toBeInTheDocument()
    expect(screen.getByText(/职位：高级工程师/)).toBeInTheDocument()
  })

  it('should display permission groups', () => {
    render(<PermissionModal {...defaultProps} />)
    
    expect(screen.getByText('空间访问权限')).toBeInTheDocument()
    expect(screen.getByText('管理权限')).toBeInTheDocument()
    expect(screen.getByText('系统权限')).toBeInTheDocument()
  })

  it('should show selected permissions count', () => {
    render(<PermissionModal {...defaultProps} />)
    
    // Should show some permissions are selected
    expect(screen.getByText(/已选择.*项权限/)).toBeInTheDocument()
  })

  it('should not render when visible is false', () => {
    render(<PermissionModal {...defaultProps} visible={false} />)
    
    expect(screen.queryByText('权限设置')).not.toBeInTheDocument()
  })

  it('should not render when employee is null', () => {
    render(<PermissionModal {...defaultProps} employee={null} />)
    
    expect(screen.queryByText('张三')).not.toBeInTheDocument()
  })
})