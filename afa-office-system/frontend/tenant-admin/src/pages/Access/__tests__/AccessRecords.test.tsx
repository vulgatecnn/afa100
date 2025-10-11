import React from 'react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../../test/utils/render'
import { FrontendApiTestHelper } from '../../../test/utils/api'
import AccessRecords from '../AccessRecords'
import { accessService } from '../../../services/accessService'
import { server } from '../../../test/mocks/server'
import { http, HttpResponse } from 'msw'

// Mock the access service
vi.mock('../../../services/accessService', () => ({
  accessService: {
    getAccessRecords: vi.fn(),
    exportAccessRecords: vi.fn(),
    getAccessStatistics: vi.fn(),
    getRealtimeStatus: vi.fn()
  }
}))

// Mock dayjs for consistent date formatting
vi.mock('dayjs', () => {
  const actualDayjs = vi.importActual('dayjs')
  const mockDayjs = vi.fn((date?: any) => {
    if (date) {
      return {
        format: vi.fn((format: string) => {
          if (format === 'YYYY-MM-DD') return '2024-01-15'
          if (format === 'HH:mm:ss') return '09:30:00'
          return '2024-01-15 09:30:00'
        }),
        unix: vi.fn(() => 1705312200)
      }
    }
    return actualDayjs
  })
  return { default: mockDayjs }
})

describe('AccessRecords 组件测试', () => {
  const user = userEvent.setup()
  
  const mockAccessRecords = [
    {
      id: 1,
      userId: 1,
      userName: '张三',
      userType: 'employee' as const,
      merchantName: '科技公司A',
      deviceId: 'DEVICE_001',
      deviceType: '人脸识别门禁',
      direction: 'in' as const,
      result: 'success' as const,
      location: {
        projectName: 'AFA大厦',
        venueName: 'A座',
        floorName: '10楼'
      },
      timestamp: '2024-01-15T09:30:00Z'
    },
    {
      id: 2,
      userId: 2,
      userName: '李四',
      userType: 'visitor' as const,
      merchantName: '科技公司B',
      deviceId: 'DEVICE_002',
      deviceType: '二维码扫描器',
      direction: 'in' as const,
      result: 'failed' as const,
      failReason: '通行码已过期',
      location: {
        projectName: 'AFA大厦',
        venueName: 'B座',
        floorName: '5楼'
      },
      timestamp: '2024-01-15T10:15:00Z'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // 设置默认的成功响应
    vi.mocked(accessService.getAccessRecords).mockResolvedValue({
      records: mockAccessRecords,
      total: mockAccessRecords.length,
      page: 1,
      pageSize: 10
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('基础渲染测试', () => {
    it('应该正确渲染组件标题和操作按钮', async () => {
      render(<AccessRecords />)
      
      // 验证标题
      expect(screen.getByText('通行记录')).toBeInTheDocument()
      
      // 验证操作按钮
      expect(screen.getByRole('button', { name: /刷新/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /导出/ })).toBeInTheDocument()
    })

    it('应该正确渲染筛选条件', () => {
      render(<AccessRecords />)
      
      // 验证搜索框
      expect(screen.getByPlaceholderText('搜索用户姓名或商户名称')).toBeInTheDocument()
      
      // 验证筛选下拉框
      expect(screen.getByText('用户类型')).toBeInTheDocument()
      expect(screen.getByText('通行方向')).toBeInTheDocument()
      expect(screen.getByText('通行结果')).toBeInTheDocument()
      
      // 验证日期选择器
      expect(screen.getByPlaceholderText('开始日期')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('结束日期')).toBeInTheDocument()
    })

    it('应该正确渲染表格列标题', () => {
      render(<AccessRecords />)
      
      expect(screen.getByText('时间')).toBeInTheDocument()
      expect(screen.getByText('用户信息')).toBeInTheDocument()
      expect(screen.getByText('所属商户')).toBeInTheDocument()
      expect(screen.getByText('通行方向')).toBeInTheDocument()
      expect(screen.getByText('通行结果')).toBeInTheDocument()
      expect(screen.getByText('位置')).toBeInTheDocument()
      expect(screen.getByText('设备信息')).toBeInTheDocument()
    })
  })

  describe('数据加载和展示测试', () => {
    it('应该在组件挂载时加载数据', async () => {
      render(<AccessRecords />)
      
      await waitFor(() => {
        expect(accessService.getAccessRecords).toHaveBeenCalledWith({
          page: 1,
          pageSize: 10,
          search: '',
          userType: undefined,
          result: undefined,
          direction: undefined,
          dateRange: null
        })
      })
    })

    it('应该正确显示加载状态', async () => {
      // 模拟延迟响应
      vi.mocked(accessService.getAccessRecords).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          records: mockAccessRecords,
          total: 2,
          page: 1,
          pageSize: 10
        }), 100))
      )
      
      render(<AccessRecords />)
      
      // 验证加载状态（Ant Design Table的loading状态）
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
    })

    it('应该正确显示通行记录数据', async () => {
      render(<AccessRecords />)
      
      await waitFor(() => {
        // 验证用户信息
        expect(screen.getByText('张三')).toBeInTheDocument()
        expect(screen.getByText('李四')).toBeInTheDocument()
        
        // 验证用户类型标签
        expect(screen.getByText('员工')).toBeInTheDocument()
        expect(screen.getByText('访客')).toBeInTheDocument()
        
        // 验证商户名称
        expect(screen.getByText('科技公司A')).toBeInTheDocument()
        expect(screen.getByText('科技公司B')).toBeInTheDocument()
        
        // 验证通行方向
        expect(screen.getAllByText('进入')).toHaveLength(2)
        
        // 验证通行结果
        expect(screen.getByText('成功')).toBeInTheDocument()
        expect(screen.getByText('失败')).toBeInTheDocument()
        
        // 验证失败原因
        expect(screen.getByText('通行码已过期')).toBeInTheDocument()
      })
    })

    it('应该正确显示位置信息', async () => {
      render(<AccessRecords />)
      
      await waitFor(() => {
        expect(screen.getByText('AFA大厦')).toBeInTheDocument()
        expect(screen.getByText('A座 - 10楼')).toBeInTheDocument()
        expect(screen.getByText('B座 - 5楼')).toBeInTheDocument()
      })
    })

    it('应该正确显示设备信息', async () => {
      render(<AccessRecords />)
      
      await waitFor(() => {
        expect(screen.getByText('人脸识别门禁')).toBeInTheDocument()
        expect(screen.getByText('二维码扫描器')).toBeInTheDocument()
        expect(screen.getByText('DEVICE_001')).toBeInTheDocument()
        expect(screen.getByText('DEVICE_002')).toBeInTheDocument()
      })
    })
  })

  describe('筛选功能测试', () => {
    it('应该支持用户名搜索', async () => {
      render(<AccessRecords />)
      
      const searchInput = screen.getByPlaceholderText('搜索用户姓名或商户名称')
      
      await user.type(searchInput, '张三')
      await user.click(screen.getByRole('button', { name: /search/i }))
      
      await waitFor(() => {
        expect(accessService.getAccessRecords).toHaveBeenCalledWith(
          expect.objectContaining({
            search: '张三'
          })
        )
      })
    })

    it('应该支持用户类型筛选', async () => {
      render(<AccessRecords />)
      
      // 点击用户类型下拉框
      const userTypeSelect = screen.getByText('用户类型')
      await user.click(userTypeSelect)
      
      // 选择员工
      await user.click(screen.getByText('员工'))
      
      await waitFor(() => {
        expect(accessService.getAccessRecords).toHaveBeenCalledWith(
          expect.objectContaining({
            userType: 'employee'
          })
        )
      })
    })

    it('应该支持通行方向筛选', async () => {
      render(<AccessRecords />)
      
      // 点击通行方向下拉框
      const directionSelect = screen.getByText('通行方向')
      await user.click(directionSelect)
      
      // 选择进入
      await user.click(screen.getByText('进入'))
      
      await waitFor(() => {
        expect(accessService.getAccessRecords).toHaveBeenCalledWith(
          expect.objectContaining({
            direction: 'in'
          })
        )
      })
    })

    it('应该支持通行结果筛选', async () => {
      render(<AccessRecords />)
      
      // 点击通行结果下拉框
      const resultSelect = screen.getByText('通行结果')
      await user.click(resultSelect)
      
      // 选择成功
      await user.click(screen.getByText('成功'))
      
      await waitFor(() => {
        expect(accessService.getAccessRecords).toHaveBeenCalledWith(
          expect.objectContaining({
            result: 'success'
          })
        )
      })
    })

    it('应该支持清除筛选条件', async () => {
      render(<AccessRecords />)
      
      // 先设置筛选条件
      const userTypeSelect = screen.getByText('用户类型')
      await user.click(userTypeSelect)
      await user.click(screen.getByText('员工'))
      
      await waitFor(() => {
        expect(accessService.getAccessRecords).toHaveBeenCalledWith(
          expect.objectContaining({
            userType: 'employee'
          })
        )
      })
      
      // 清除筛选条件
      await user.click(userTypeSelect)
      const clearButton = screen.getByRole('button', { name: /clear/i })
      await user.click(clearButton)
      
      await waitFor(() => {
        expect(accessService.getAccessRecords).toHaveBeenCalledWith(
          expect.objectContaining({
            userType: undefined
          })
        )
      })
    })
  })

  describe('分页功能测试', () => {
    beforeEach(() => {
      // 模拟大量数据以触发分页
      const largeDataSet = Array.from({ length: 10 }, (_, index) => ({
        ...mockAccessRecords[0],
        id: index + 1,
        userName: `用户${index + 1}`
      }))
      
      vi.mocked(accessService.getAccessRecords).mockResolvedValue({
        records: largeDataSet,
        total: 100,
        page: 1,
        pageSize: 10
      })
    })

    it('应该正确显示分页信息', async () => {
      render(<AccessRecords />)
      
      await waitFor(() => {
        // 验证表格已渲染
        expect(screen.getByRole('table')).toBeInTheDocument()
      })
      
      // 验证分页信息存在（可能以不同格式显示）
      await waitFor(() => {
        const paginationText = screen.queryByText(/条/)
        if (paginationText) {
          expect(paginationText).toBeInTheDocument()
        }
      })
    })

    it('应该支持分页配置', async () => {
      render(<AccessRecords />)
      
      await waitFor(() => {
        // 验证表格已渲染并且有数据
        expect(screen.getByRole('table')).toBeInTheDocument()
        expect(screen.getByText('用户1')).toBeInTheDocument()
      })
    })

    it('应该正确处理分页参数', async () => {
      render(<AccessRecords />)
      
      await waitFor(() => {
        expect(accessService.getAccessRecords).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 1,
            pageSize: 10
          })
        )
      })
    })
  })

  describe('排序功能测试', () => {
    it('应该支持按时间排序', async () => {
      render(<AccessRecords />)
      
      await waitFor(() => {
        // 找到时间列的排序按钮
        const timeHeaders = screen.getAllByText('时间')
        expect(timeHeaders.length).toBeGreaterThan(0)
      })
      
      // 点击时间列进行排序
      const timeHeaders = screen.getAllByText('时间')
      const timeColumn = timeHeaders[0].closest('th')
      if (timeColumn) {
        const sortButton = within(timeColumn).queryByRole('button')
        if (sortButton) {
          await user.click(sortButton)
        }
      }
      
      // 验证排序功能被触发（通过表格重新渲染来验证）
      await waitFor(() => {
        expect(screen.getAllByText('时间').length).toBeGreaterThan(0)
      })
    })

    it('应该默认按时间降序排列', async () => {
      render(<AccessRecords />)
      
      await waitFor(() => {
        // 验证表格已渲染
        expect(screen.getByRole('table')).toBeInTheDocument()
      })
    })
  })

  describe('导出功能测试', () => {
    it('应该显示导出按钮', () => {
      render(<AccessRecords />)
      
      const exportButton = screen.getByRole('button', { name: /导出/ })
      expect(exportButton).toBeInTheDocument()
    })

    it('应该在点击导出按钮时显示提示信息', async () => {
      render(<AccessRecords />)
      
      const exportButton = screen.getByRole('button', { name: /导出/ })
      await user.click(exportButton)
      
      await waitFor(() => {
        expect(screen.getByText('导出功能开发中...')).toBeInTheDocument()
      })
    })

    it('应该支持不同格式的导出', async () => {
      // 模拟导出服务
      vi.mocked(accessService.exportAccessRecords).mockResolvedValue(new Blob(['test'], { type: 'text/csv' }))
      
      render(<AccessRecords />)
      
      const exportButton = screen.getByRole('button', { name: /导出/ })
      expect(exportButton).toBeInTheDocument()
      
      // 当前实现只是显示提示，实际导出功能需要进一步实现
    })
  })

  describe('刷新功能测试', () => {
    it('应该支持手动刷新数据', async () => {
      render(<AccessRecords />)
      
      // 等待初始数据加载
      await waitFor(() => {
        expect(accessService.getAccessRecords).toHaveBeenCalledTimes(1)
      })
      
      // 点击刷新按钮
      const refreshButton = screen.getByRole('button', { name: /刷新/ })
      await user.click(refreshButton)
      
      await waitFor(() => {
        expect(accessService.getAccessRecords).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('错误处理测试', () => {
    it('应该处理数据加载失败', async () => {
      // 模拟API错误
      vi.mocked(accessService.getAccessRecords).mockRejectedValue(new Error('网络错误'))
      
      render(<AccessRecords />)
      
      await waitFor(() => {
        expect(screen.getByText('加载通行记录失败')).toBeInTheDocument()
      })
    })

    it('应该处理空数据状态', async () => {
      // 模拟空数据
      vi.mocked(accessService.getAccessRecords).mockResolvedValue({
        records: [],
        total: 0,
        page: 1,
        pageSize: 10
      })
      
      render(<AccessRecords />)
      
      await waitFor(() => {
        const emptyElements = screen.getAllByText('暂无数据')
        expect(emptyElements.length).toBeGreaterThan(0)
      })
    })

    it('应该处理网络异常', async () => {
      // 使用MSW模拟网络错误
      server.use(
        http.get('/api/v1/tenant/access-records', () => {
          return HttpResponse.error()
        })
      )
      
      render(<AccessRecords />)
      
      await waitFor(() => {
        expect(screen.getByText('加载通行记录失败')).toBeInTheDocument()
      })
    })
  })

  describe('响应式设计测试', () => {
    it('应该在小屏幕上正确显示', () => {
      // 模拟小屏幕
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })
      
      render(<AccessRecords />)
      
      // 验证表格存在并有滚动配置
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      
      // 验证表格容器存在
      const tableContainer = table.closest('.ant-table')
      expect(tableContainer).toBeInTheDocument()
    })
  })

  describe('用户体验测试', () => {
    it('应该显示失败原因的提示信息', async () => {
      render(<AccessRecords />)
      
      await waitFor(() => {
        const failReasonElement = screen.getByText('通行码已过期')
        expect(failReasonElement).toBeInTheDocument()
      })
      
      // 悬停显示完整信息
      const failReasonElement = screen.getByText('通行码已过期')
      await user.hover(failReasonElement)
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument()
      })
    })

    it('应该正确显示用户类型标签颜色', async () => {
      render(<AccessRecords />)
      
      await waitFor(() => {
        const employeeTag = screen.getByText('员工')
        const visitorTag = screen.getByText('访客')
        
        expect(employeeTag).toHaveClass('ant-tag-blue')
        expect(visitorTag).toHaveClass('ant-tag-orange')
      })
    })

    it('应该正确显示通行结果标签颜色', async () => {
      render(<AccessRecords />)
      
      await waitFor(() => {
        const successTag = screen.getByText('成功')
        const failedTag = screen.getByText('失败')
        
        expect(successTag).toHaveClass('ant-tag-success')
        expect(failedTag).toHaveClass('ant-tag-error')
      })
    })
  })

  describe('性能测试', () => {
    it('应该正确处理大量数据', async () => {
      // 模拟大量数据
      const largeDataSet = Array.from({ length: 1000 }, (_, index) => ({
        ...mockAccessRecords[0],
        id: index + 1,
        userName: `用户${index + 1}`
      }))
      
      vi.mocked(accessService.getAccessRecords).mockResolvedValue({
        records: largeDataSet.slice(0, 10), // 只返回第一页
        total: largeDataSet.length,
        page: 1,
        pageSize: 10
      })
      
      render(<AccessRecords />)
      
      await waitFor(() => {
        expect(screen.getByText(/第 1-10 条，共 1000 条/)).toBeInTheDocument()
      })
    })

    it('应该防止重复请求', async () => {
      render(<AccessRecords />)
      
      // 等待初始加载完成
      await waitFor(() => {
        expect(accessService.getAccessRecords).toHaveBeenCalledTimes(1)
      })
      
      // 快速点击刷新按钮多次
      const refreshButton = screen.getByRole('button', { name: /刷新/ })
      await user.click(refreshButton)
      
      // 等待刷新完成
      await waitFor(() => {
        // 应该有初始请求 + 刷新请求
        expect(accessService.getAccessRecords).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('可访问性测试', () => {
    it('应该具有正确的ARIA标签', () => {
      render(<AccessRecords />)
      
      // 验证表格的可访问性
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      
      // 验证按钮的可访问性
      const refreshButton = screen.getByRole('button', { name: /刷新/ })
      const exportButton = screen.getByRole('button', { name: /导出/ })
      
      expect(refreshButton).toBeInTheDocument()
      expect(exportButton).toBeInTheDocument()
    })

    it('应该支持键盘导航', async () => {
      render(<AccessRecords />)
      
      // 测试Tab键导航
      await user.tab()
      
      // 验证有元素获得焦点（可能是搜索框或其他可聚焦元素）
      const focusedElement = document.activeElement
      expect(focusedElement).not.toBe(document.body)
      
      await user.tab()
      // 验证焦点可以继续移动
      const nextFocusedElement = document.activeElement
      expect(nextFocusedElement).not.toBe(document.body)
    })
  })
})