import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import VisitorApprovalModal from '../VisitorApprovalModal'
import type { VisitorApplication } from '../../services/visitorService'

describe('VisitorApprovalModal', () => {
  const mockApplication: VisitorApplication = {
    id: 1,
    applicantId: 1,
    applicantName: '申请人',
    visitorName: '张三',
    visitorPhone: '13800138000',
    visitorCompany: '测试公司',
    visitPurpose: '商务洽谈',
    visitType: '商务访问',
    scheduledTime: '2024-01-15T10:00:00Z',
    duration: 2,
    status: 'pending',
    usageLimit: 2,
    usageCount: 0,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z'
  }

  const defaultProps = {
    visible: true,
    application: mockApplication,
    onCancel: vi.fn(),
    onSubmit: vi.fn(),
    loading: false
  }

  it('should render visitor approval modal with application info', () => {
    render(<VisitorApprovalModal {...defaultProps} />)
    
    expect(screen.getByText('访客申请审批')).toBeInTheDocument()
    // 使用更具体的选择器来区分访客姓名和其它"张三"
    expect(screen.getByText('张三', { selector: '.ant-tag' })).toBeInTheDocument()
    expect(screen.getByText('13800138000')).toBeInTheDocument()
    expect(screen.getByText('测试公司')).toBeInTheDocument()
    expect(screen.getByText('商务洽谈')).toBeInTheDocument()
  })

  it('should display approval decision options', () => {
    render(<VisitorApprovalModal {...defaultProps} />)
    
    expect(screen.getByText('通过申请')).toBeInTheDocument()
    expect(screen.getByText('拒绝申请')).toBeInTheDocument()
  })

  it('should show approval settings when approval type is approved', () => {
    render(<VisitorApprovalModal {...defaultProps} />)
    
    expect(screen.getByText('通行设置')).toBeInTheDocument()
    expect(screen.getByText('使用次数限制')).toBeInTheDocument()
    expect(screen.getByText('访问时长（小时）')).toBeInTheDocument()
    expect(screen.getByText('允许访问区域')).toBeInTheDocument()
  })

  it('should not render when visible is false', () => {
    render(<VisitorApprovalModal {...defaultProps} visible={false} />)
    
    expect(screen.queryByText('访客申请审批')).not.toBeInTheDocument()
  })

  it('should not render when application is null', () => {
    render(<VisitorApprovalModal {...defaultProps} application={null} />)
    
    expect(screen.queryByText('张三')).not.toBeInTheDocument()
  })
})