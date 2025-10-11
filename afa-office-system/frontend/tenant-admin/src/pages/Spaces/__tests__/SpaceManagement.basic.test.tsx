import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/mocks/server'
import { render } from '../../../test/utils/render'
import SpaceManagement from '../SpaceManagement'
import { message } from 'antd'

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

const mockMessage = vi.mocked(message)

describe('SpaceManagement', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本渲染', () => {
    it('应该正确渲染空间管理页面', async () => {
      render(<SpaceManagement />)

      // 验证页面标题
      expect(screen.getByText('空间管理')).toBeInTheDocument()
      
      // 验证新增项目按钮
      expect(screen.getByRole('button', { name: /新增项目/i })).toBeInTheDocument()

      // 等待树形数据加载
      await waitFor(() => {
        expect(screen.getByText('测试项目1')).toBeInTheDocument()
      })
    })

    it('应该正确展示树形结构数据', async () => {
      render(<SpaceManagement />)

      await waitFor(() => {
        // 验证项目节点
        expect(screen.getByText('测试项目1')).toBeInTheDocument()
        expect(screen.getByText('测试项目2')).toBeInTheDocument()
        
        // 验证场地节点
        expect(screen.getByText('测试场地1')).toBeInTheDocument()
        expect(screen.getByText('测试场地2')).toBeInTheDocument()
        
        // 验证楼层节点
        expect(screen.getByText('1楼')).toBeInTheDocument()
        expect(screen.getByText('2楼')).toBeInTheDocument()
      })
    })

    it('应该显示正确的状态标签', async () => {
      render(<SpaceManagement />)

      await waitFor(() => {
        // 验证启用状态标签
        const activeLabels = screen.getAllByText('启用')
        expect(activeLabels.length).toBeGreaterThan(0)
        
        // 验证停用状态标签
        const inactiveLabels = screen.getAllByText('停用')
        expect(inactiveLabels.length).toBeGreaterThan(0)
      })
    })
  })

  describe('新增功能', () => {
    it('应该能够打开新增项目模态框', async () => {
      render(<SpaceManagement />)

      // 点击新增项目按钮
      const addButton = screen.getByRole('button', { name: /新增项目/i })
      await user.click(addButton)

      // 验证模态框打开
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // 验证表单字段
      expect(screen.getByLabelText('编码')).toBeInTheDocument()
      expect(screen.getByLabelText('名称')).toBeInTheDocument()
      expect(screen.getByLabelText('描述')).toBeInTheDocument()
    })

    it('应该能够成功创建项目', async () => {
      render(<SpaceManagement />)

      // 点击新增项目按钮
      const addButton = screen.getByRole('button', { name: /新增项目/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // 填写表单
      const codeInput = screen.getByLabelText('编码')
      const nameInput = screen.getByLabelText('名称')
      const descriptionInput = screen.getByLabelText('描述')

      await user.type(codeInput, 'PROJECT_003')
      await user.type(nameInput, '新测试项目')
      await user.type(descriptionInput, '新项目描述')

      // 提交表单
      const submitButton = screen.getByRole('button', { name: '确 定' })
      await user.click(submitButton)

      // 验证成功消息
      await waitFor(() => {
        expect(mockMessage.success).toHaveBeenCalledWith('创建成功')
      })
    })

    it('应该验证表单输入', async () => {
      render(<SpaceManagement />)

      // 点击新增项目按钮
      const addButton = screen.getByRole('button', { name: /新增项目/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // 不填写必填字段直接提交
      const submitButton = screen.getByRole('button', { name: '确 定' })
      await user.click(submitButton)

      // 验证错误提示
      await waitFor(() => {
        expect(screen.getByText('请输入编码')).toBeInTheDocument()
        expect(screen.getByText('请输入名称')).toBeInTheDocument()
      })
    })

    it('应该验证编码格式', async () => {
      render(<SpaceManagement />)

      const addButton = screen.getByRole('button', { name: /新增项目/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // 输入无效的编码格式
      const codeInput = screen.getByLabelText('编码')
      await user.type(codeInput, 'invalid-code')

      const submitButton = screen.getByRole('button', { name: '确 定' })
      await user.click(submitButton)

      // 验证格式错误提示
      await waitFor(() => {
        expect(screen.getByText('编码只能包含大写字母、数字和下划线')).toBeInTheDocument()
      })
    })
  })

  describe('错误处理', () => {
    it('应该处理加载空间树失败的情况', async () => {
      // Mock API失败
      server.use(
        http.get('/api/v1/tenant/spaces/tree', () => {
          return HttpResponse.json({
            success: false,
            code: 500,
            message: '服务器错误',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        })
      )

      render(<SpaceManagement />)

      // 验证错误消息
      await waitFor(() => {
        expect(mockMessage.error).toHaveBeenCalledWith('加载空间数据失败')
      })
    })

    it('应该处理创建失败的情况', async () => {
      // Mock创建失败
      server.use(
        http.post('/api/v1/tenant/spaces/projects', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '创建失败',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      render(<SpaceManagement />)

      // 执行创建操作
      const addButton = screen.getByRole('button', { name: /新增项目/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // 填写表单
      const codeInput = screen.getByLabelText('编码')
      const nameInput = screen.getByLabelText('名称')

      await user.type(codeInput, 'PROJECT_003')
      await user.type(nameInput, '新测试项目')

      // 提交表单
      const submitButton = screen.getByRole('button', { name: '确 定' })
      await user.click(submitButton)

      // 验证错误消息
      await waitFor(() => {
        expect(mockMessage.error).toHaveBeenCalledWith('创建失败')
      })
    })
  })

  describe('模态框交互', () => {
    it('应该能够取消模态框', async () => {
      render(<SpaceManagement />)

      // 打开新增模态框
      const addButton = screen.getByRole('button', { name: /新增项目/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // 点击取消按钮
      const cancelButton = screen.getByRole('button', { name: '取 消' })
      await user.click(cancelButton)

      // 验证模态框关闭
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('应该在模态框关闭时重置表单', async () => {
      render(<SpaceManagement />)

      // 打开新增模态框
      const addButton = screen.getByRole('button', { name: /新增项目/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // 填写表单
      const codeInput = screen.getByLabelText('编码')
      await user.type(codeInput, 'TEST_CODE')

      // 取消模态框
      const cancelButton = screen.getByRole('button', { name: '取 消' })
      await user.click(cancelButton)

      // 重新打开模态框
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // 验证表单已重置
      const newCodeInput = screen.getByLabelText('编码')
      expect(newCodeInput).toHaveValue('')
    })
  })
})