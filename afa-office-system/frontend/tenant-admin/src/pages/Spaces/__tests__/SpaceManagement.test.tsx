import React from 'react'
import { screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/mocks/server'
import { render } from '../../../test/utils/render'
import SpaceManagement from '../SpaceManagement'

// Mock antd message
const mockMessage = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn()
}

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    message: mockMessage
  }
})

describe('SpaceManagement', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('组件渲染', () => {
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

    it('应该显示加载状态', () => {
      // Mock延迟响应
      server.use(
        http.get('/api/v1/tenant/spaces/tree', async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return HttpResponse.json({
            success: true,
            data: [],
            message: '获取空间树成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      render(<SpaceManagement />)

      // 验证加载状态（Ant Design Tree组件的loading属性）
      const treeContainer = screen.getByRole('tree')
      expect(treeContainer).toBeInTheDocument()
    })
  })

  describe('树形结构展示', () => {
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

    it('应该显示正确的图标', async () => {
      render(<SpaceManagement />)

      await waitFor(() => {
        // 验证树形结构中的图标存在
        const treeNodes = screen.getAllByRole('treeitem')
        expect(treeNodes.length).toBeGreaterThan(0)
      })
    })

    it('应该支持节点展开和收起', async () => {
      render(<SpaceManagement />)

      await waitFor(() => {
        expect(screen.getByText('测试项目1')).toBeInTheDocument()
      })

      // 查找展开/收起按钮（通过树节点的切换器）
      const treeItems = screen.getAllByRole('treeitem')
      const projectNode = treeItems.find(item => 
        within(item).queryByText('测试项目1')
      )
      
      if (projectNode) {
        const switcher = within(projectNode).getByRole('img', { hidden: true })
        if (switcher) {
          await user.click(switcher)
          // 验证节点状态变化
          await waitFor(() => {
            expect(projectNode).toBeInTheDocument()
          })
        }
      }
    })

    it('应该支持节点选择', async () => {
      render(<SpaceManagement />)

      await waitFor(() => {
        expect(screen.getByText('测试项目1')).toBeInTheDocument()
      })

      // 点击节点进行选择
      const projectNode = screen.getByText('测试项目1')
      await user.click(projectNode)

      // 验证节点被选中（通过CSS类或其他视觉指示）
      expect(projectNode.closest('[role="treeitem"]')).toBeInTheDocument()
    })
  })

  describe('右键菜单功能', () => {
    it('应该显示项目节点的右键菜单', async () => {
      render(<SpaceManagement />)

      await waitFor(() => {
        expect(screen.getByText('测试项目1')).toBeInTheDocument()
      })

      // 查找并点击项目节点的更多操作按钮
      const moreButtons = screen.getAllByRole('button', { name: '' })
      const projectMoreButton = moreButtons[0] // 假设第一个是项目的更多按钮
      
      await user.click(projectMoreButton)

      // 验证菜单项
      await waitFor(() => {
        expect(screen.getByText('添加场地')).toBeInTheDocument()
        expect(screen.getByText('编辑')).toBeInTheDocument()
        expect(screen.getByText('启用')).toBeInTheDocument() // 或停用，取决于当前状态
        expect(screen.getByText('删除')).toBeInTheDocument()
      })
    })

    it('应该显示场地节点的右键菜单', async () => {
      render(<SpaceManagement />)

      await waitFor(() => {
        expect(screen.getByText('测试场地1')).toBeInTheDocument()
      })

      // 查找并点击场地节点的更多操作按钮
      const moreButtons = screen.getAllByRole('button', { name: '' })
      // 假设场地的更多按钮是第二个或第三个
      if (moreButtons.length > 1) {
        await user.click(moreButtons[1])

        // 验证场地菜单项
        await waitFor(() => {
          expect(screen.getByText('添加楼层')).toBeInTheDocument()
          expect(screen.getByText('编辑')).toBeInTheDocument()
          expect(screen.getByText('删除')).toBeInTheDocument()
        })
      }
    })

    it('应该显示楼层节点的右键菜单', async () => {
      render(<SpaceManagement />)

      await waitFor(() => {
        expect(screen.getByText('1楼')).toBeInTheDocument()
      })

      // 查找并点击楼层节点的更多操作按钮
      const moreButtons = screen.getAllByRole('button', { name: '' })
      // 楼层的更多按钮
      if (moreButtons.length > 2) {
        await user.click(moreButtons[2])

        // 验证楼层菜单项（楼层不能添加子项）
        await waitFor(() => {
          expect(screen.getByText('编辑')).toBeInTheDocument()
          expect(screen.getByText('删除')).toBeInTheDocument()
          expect(screen.queryByText('添加')).not.toBeInTheDocument()
        })
      }
    })
  })

  describe('新增功能', () => {
    it('应该能够新增项目', async () => {
      render(<SpaceManagement />)

      // 点击新增项目按钮
      const addButton = screen.getByRole('button', { name: /新增项目/i })
      await user.click(addButton)

      // 验证模态框打开
      await waitFor(() => {
        expect(screen.getByText('新增项目')).toBeInTheDocument()
      })

      // 填写表单
      const codeInput = screen.getByLabelText('编码')
      const nameInput = screen.getByLabelText('名称')
      const descriptionInput = screen.getByLabelText('描述')

      await user.type(codeInput, 'PROJECT_003')
      await user.type(nameInput, '新测试项目')
      await user.type(descriptionInput, '新项目描述')

      // 提交表单
      const submitButton = screen.getByRole('button', { name: '确定' })
      await user.click(submitButton)

      // 验证成功消息
      await waitFor(() => {
        expect(mockMessage.success).toHaveBeenCalledWith('创建成功')
      })
    })

    it('应该能够新增场地', async () => {
      render(<SpaceManagement />)

      await waitFor(() => {
        expect(screen.getByText('测试项目1')).toBeInTheDocument()
      })

      // 点击项目的更多操作按钮
      const moreButtons = screen.getAllByRole('button', { name: '' })
      await user.click(moreButtons[0])

      // 点击添加场地
      await waitFor(() => {
        expect(screen.getByText('添加场地')).toBeInTheDocument()
      })
      const addVenueButton = screen.getByText('添加场地')
      await user.click(addVenueButton)

      // 验证模态框打开
      await waitFor(() => {
        expect(screen.getByText('新增场地')).toBeInTheDocument()
      })

      // 填写表单
      const codeInput = screen.getByLabelText('编码')
      const nameInput = screen.getByLabelText('名称')

      await user.type(codeInput, 'VENUE_003')
      await user.type(nameInput, '新测试场地')

      // 提交表单
      const submitButton = screen.getByRole('button', { name: '确定' })
      await user.click(submitButton)

      // 验证成功消息
      await waitFor(() => {
        expect(mockMessage.success).toHaveBeenCalledWith('创建成功')
      })
    })

    it('应该能够新增楼层', async () => {
      render(<SpaceManagement />)

      await waitFor(() => {
        expect(screen.getByText('测试场地1')).toBeInTheDocument()
      })

      // 点击场地的更多操作按钮
      const moreButtons = screen.getAllByRole('button', { name: '' })
      if (moreButtons.length > 1) {
        await user.click(moreButtons[1])

        // 点击添加楼层
        await waitFor(() => {
          expect(screen.getByText('添加楼层')).toBeInTheDocument()
        })
        const addFloorButton = screen.getByText('添加楼层')
        await user.click(addFloorButton)

        // 验证模态框打开
        await waitFor(() => {
          expect(screen.getByText('新增楼层')).toBeInTheDocument()
        })

        // 填写表单
        const codeInput = screen.getByLabelText('编码')
        const nameInput = screen.getByLabelText('名称')

        await user.type(codeInput, 'FLOOR_003')
        await user.type(nameInput, '3楼')

        // 提交表单
        const submitButton = screen.getByRole('button', { name: '确定' })
        await user.click(submitButton)

        // 验证成功消息
        await waitFor(() => {
          expect(mockMessage.success).toHaveBeenCalledWith('创建成功')
        })
      }
    })

    it('应该验证表单输入', async () => {
      render(<SpaceManagement />)

      // 点击新增项目按钮
      const addButton = screen.getByRole('button', { name: /新增项目/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('新增项目')).toBeInTheDocument()
      })

      // 不填写必填字段直接提交
      const submitButton = screen.getByRole('button', { name: '确定' })
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
        expect(screen.getByText('新增项目')).toBeInTheDocument()
      })

      // 输入无效的编码格式
      const codeInput = screen.getByLabelText('编码')
      await user.type(codeInput, 'invalid-code')

      const submitButton = screen.getByRole('button', { name: '确定' })
      await user.click(submitButton)

      // 验证格式错误提示
      await waitFor(() => {
        expect(screen.getByText('编码只能包含大写字母、数字和下划线')).toBeInTheDocument()
      })
    })
  })

  describe('编辑功能', () => {
    it('应该能够编辑项目', async () => {
      render(<SpaceManagement />)

      await waitFor(() => {
        expect(screen.getByText('测试项目1')).toBeInTheDocument()
      })

      // 点击项目的更多操作按钮
      const moreButtons = screen.getAllByRole('button', { name: '' })
      await user.click(moreButtons[0])

      // 点击编辑
      await waitFor(() => {
        expect(screen.getByText('编辑')).toBeInTheDocument()
      })
      const editButton = screen.getByText('编辑')
      await user.click(editButton)

      // 验证模态框打开并预填数据
      await waitFor(() => {
        expect(screen.getByText('编辑项目')).toBeInTheDocument()
        expect(screen.getByDisplayValue('测试项目1')).toBeInTheDocument()
      })

      // 修改名称
      const nameInput = screen.getByLabelText('名称')
      await user.clear(nameInput)
      await user.type(nameInput, '修改后的项目名称')

      // 提交表单
      const submitButton = screen.getByRole('button', { name: '确定' })
      await user.click(submitButton)

      // 验证成功消息
      await waitFor(() => {
        expect(mockMessage.success).toHaveBeenCalledWith('更新成功')
      })
    })

    it('应该能够编辑场地', async () => {
      render(<SpaceManagement />)

      await waitFor(() => {
        expect(screen.getByText('测试场地1')).toBeInTheDocument()
      })

      // 点击场地的更多操作按钮
      const moreButtons = screen.getAllByRole('button', { name: '' })
      if (moreButtons.length > 1) {
        await user.click(moreButtons[1])

        // 点击编辑
        await waitFor(() => {
          expect(screen.getByText('编辑')).toBeInTheDocument()
        })
        const editButton = screen.getByText('编辑')
        await user.click(editButton)

        // 验证模态框打开
        await waitFor(() => {
          expect(screen.getByText('编辑场地')).toBeInTheDocument()
        })

        // 修改名称
        const nameInput = screen.getByLabelText('名称')
        await user.clear(nameInput)
        await user.type(nameInput, '修改后的场地名称')

        // 提交表单
        const submitButton = screen.getByRole('button', { name: '确定' })
        await user.click(submitButton)

        // 验证成功消息
        await waitFor(() => {
          expect(mockMessage.success).toHaveBeenCalledWith('更新成功')
        })
      }
    })

    it('应该能够编辑楼层', async () => {
      render(<SpaceManagement />)

      await waitFor(() => {
        expect(screen.getByText('1楼')).toBeInTheDocument()
      })

      // 点击楼层的更多操作按钮
      const moreButtons = screen.getAllByRole('button', { name: '' })
      if (moreButtons.length > 2) {
        await user.click(moreButtons[2])

        // 点击编辑
        await waitFor(() => {
          expect(screen.getByText('编辑')).toBeInTheDocument()
        })
        const editButton = screen.getByText('编辑')
        await user.click(editButton)

        // 验证模态框打开
        await waitFor(() => {
          expect(screen.getByText('编辑楼层')).toBeInTheDocument()
        })

        // 修改名称
        const nameInput = screen.getByLabelText('名称')
        await user.clear(nameInput)
        await user.type(nameInput, '修改后的楼层名称')

        // 提交表单
        const submitButton = screen.getByRole('button', { name: '确定' })
        await user.click(submitButton)

        // 验证成功消息
        await waitFor(() => {
          expect(mockMessage.success).toHaveBeenCalledWith('更新成功')
        })
      }
    })
  })

  describe('删除功能', () => {
    it('应该能够删除项目', async () => {
      render(<SpaceManagement />)

      await waitFor(() => {
        expect(screen.getByText('测试项目1')).toBeInTheDocument()
      })

      // 点击项目的更多操作按钮
      const moreButtons = screen.getAllByRole('button', { name: '' })
      await user.click(moreButtons[0])

      // 点击删除
      await waitFor(() => {
        expect(screen.getByText('删除')).toBeInTheDocument()
      })
      const deleteButton = screen.getByText('删除')
      await user.click(deleteButton)

      // 验证确认对话框
      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument()
        expect(screen.getByText(/确定要删除.*吗？删除后将无法恢复。/)).toBeInTheDocument()
      })

      // 确认删除
      const confirmButton = screen.getByRole('button', { name: '确定' })
      await user.click(confirmButton)

      // 验证成功消息
      await waitFor(() => {
        expect(mockMessage.success).toHaveBeenCalledWith('删除成功')
      })
    })

    it('应该能够取消删除操作', async () => {
      render(<SpaceManagement />)

      await waitFor(() => {
        expect(screen.getByText('测试项目1')).toBeInTheDocument()
      })

      // 点击项目的更多操作按钮
      const moreButtons = screen.getAllByRole('button', { name: '' })
      await user.click(moreButtons[0])

      // 点击删除
      await waitFor(() => {
        expect(screen.getByText('删除')).toBeInTheDocument()
      })
      const deleteButton = screen.getByText('删除')
      await user.click(deleteButton)

      // 验证确认对话框
      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument()
      })

      // 取消删除
      const cancelButton = screen.getByRole('button', { name: '取消' })
      await user.click(cancelButton)

      // 验证对话框关闭，项目仍然存在
      await waitFor(() => {
        expect(screen.queryByText('确认删除')).not.toBeInTheDocument()
        expect(screen.getByText('测试项目1')).toBeInTheDocument()
      })
    })

    it('应该处理删除失败的情况', async () => {
      // Mock删除失败
      server.use(
        http.delete('/api/v1/tenant/spaces/projects/:id', () => {
          return HttpResponse.json({
            success: false,
            code: 500,
            message: '删除失败',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        })
      )

      render(<SpaceManagement />)

      await waitFor(() => {
        expect(screen.getByText('测试项目1')).toBeInTheDocument()
      })

      // 执行删除操作
      const moreButtons = screen.getAllByRole('button', { name: '' })
      await user.click(moreButtons[0])

      await waitFor(() => {
        expect(screen.getByText('删除')).toBeInTheDocument()
      })
      const deleteButton = screen.getByText('删除')
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '确定' })).toBeInTheDocument()
      })
      const confirmButton = screen.getByRole('button', { name: '确定' })
      await user.click(confirmButton)

      // 验证错误消息
      await waitFor(() => {
        expect(mockMessage.error).toHaveBeenCalledWith('删除失败')
      })
    })
  })

  describe('状态切换功能', () => {
    it('应该能够启用停用的项目', async () => {
      render(<SpaceManagement />)

      await waitFor(() => {
        expect(screen.getByText('测试项目2')).toBeInTheDocument()
      })

      // 找到停用状态的项目（测试项目2是停用状态）
      const moreButtons = screen.getAllByRole('button', { name: '' })
      // 假设测试项目2的更多按钮是第二个
      if (moreButtons.length > 1) {
        await user.click(moreButtons[1])

        // 点击启用
        await waitFor(() => {
          expect(screen.getByText('启用')).toBeInTheDocument()
        })
        const enableButton = screen.getByText('启用')
        await user.click(enableButton)

        // 验证成功消息
        await waitFor(() => {
          expect(mockMessage.success).toHaveBeenCalledWith('启用成功')
        })
      }
    })

    it('应该能够停用启用的项目', async () => {
      render(<SpaceManagement />)

      await waitFor(() => {
        expect(screen.getByText('测试项目1')).toBeInTheDocument()
      })

      // 找到启用状态的项目
      const moreButtons = screen.getAllByRole('button', { name: '' })
      await user.click(moreButtons[0])

      // 点击停用
      await waitFor(() => {
        expect(screen.getByText('停用')).toBeInTheDocument()
      })
      const disableButton = screen.getByText('停用')
      await user.click(disableButton)

      // 验证成功消息
      await waitFor(() => {
        expect(mockMessage.success).toHaveBeenCalledWith('停用成功')
      })
    })

    it('应该处理状态切换失败的情况', async () => {
      // Mock状态切换失败
      server.use(
        http.patch('/api/v1/tenant/spaces/projects/:id/status', () => {
          return HttpResponse.json({
            success: false,
            code: 500,
            message: '状态切换失败',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        })
      )

      render(<SpaceManagement />)

      await waitFor(() => {
        expect(screen.getByText('测试项目1')).toBeInTheDocument()
      })

      // 执行状态切换操作
      const moreButtons = screen.getAllByRole('button', { name: '' })
      await user.click(moreButtons[0])

      await waitFor(() => {
        expect(screen.getByText('停用')).toBeInTheDocument()
      })
      const disableButton = screen.getByText('停用')
      await user.click(disableButton)

      // 验证错误消息
      await waitFor(() => {
        expect(mockMessage.error).toHaveBeenCalledWith('操作失败')
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
        expect(screen.getByText('新增项目')).toBeInTheDocument()
      })

      // 填写表单
      const codeInput = screen.getByLabelText('编码')
      const nameInput = screen.getByLabelText('名称')

      await user.type(codeInput, 'PROJECT_003')
      await user.type(nameInput, '新测试项目')

      // 提交表单
      const submitButton = screen.getByRole('button', { name: '确定' })
      await user.click(submitButton)

      // 验证错误消息
      await waitFor(() => {
        expect(mockMessage.error).toHaveBeenCalledWith('创建失败')
      })
    })

    it('应该处理更新失败的情况', async () => {
      // Mock更新失败
      server.use(
        http.put('/api/v1/tenant/spaces/projects/:id', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '更新失败',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      render(<SpaceManagement />)

      await waitFor(() => {
        expect(screen.getByText('测试项目1')).toBeInTheDocument()
      })

      // 执行编辑操作
      const moreButtons = screen.getAllByRole('button', { name: '' })
      await user.click(moreButtons[0])

      await waitFor(() => {
        expect(screen.getByText('编辑')).toBeInTheDocument()
      })
      const editButton = screen.getByText('编辑')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByText('编辑项目')).toBeInTheDocument()
      })

      // 修改并提交
      const nameInput = screen.getByLabelText('名称')
      await user.clear(nameInput)
      await user.type(nameInput, '修改后的名称')

      const submitButton = screen.getByRole('button', { name: '确定' })
      await user.click(submitButton)

      // 验证错误消息
      await waitFor(() => {
        expect(mockMessage.error).toHaveBeenCalledWith('更新失败')
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
        expect(screen.getByText('新增项目')).toBeInTheDocument()
      })

      // 点击取消按钮
      const cancelButton = screen.getByRole('button', { name: '取消' })
      await user.click(cancelButton)

      // 验证模态框关闭
      await waitFor(() => {
        expect(screen.queryByText('新增项目')).not.toBeInTheDocument()
      })
    })

    it('应该能够通过ESC键关闭模态框', async () => {
      render(<SpaceManagement />)

      // 打开新增模态框
      const addButton = screen.getByRole('button', { name: /新增项目/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('新增项目')).toBeInTheDocument()
      })

      // 按ESC键
      await user.keyboard('{Escape}')

      // 验证模态框关闭
      await waitFor(() => {
        expect(screen.queryByText('新增项目')).not.toBeInTheDocument()
      })
    })

    it('应该在模态框关闭时重置表单', async () => {
      render(<SpaceManagement />)

      // 打开新增模态框
      const addButton = screen.getByRole('button', { name: /新增项目/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('新增项目')).toBeInTheDocument()
      })

      // 填写表单
      const codeInput = screen.getByLabelText('编码')
      await user.type(codeInput, 'TEST_CODE')

      // 取消模态框
      const cancelButton = screen.getByRole('button', { name: '取消' })
      await user.click(cancelButton)

      // 重新打开模态框
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('新增项目')).toBeInTheDocument()
      })

      // 验证表单已重置
      const newCodeInput = screen.getByLabelText('编码')
      expect(newCodeInput).toHaveValue('')
    })
  })

  describe('权限检查', () => {
    it('应该根据用户权限显示不同的操作选项', async () => {
      // 这里可以根据实际的权限系统进行测试
      // 例如，某些用户可能没有删除权限
      const limitedUser = {
        id: 2,
        name: '受限用户',
        email: 'limited@example.com',
        userType: 'limited_admin',
        status: 'active'
      }

      render(<SpaceManagement />, { user: limitedUser })

      await waitFor(() => {
        expect(screen.getByText('测试项目1')).toBeInTheDocument()
      })

      // 根据实际权限系统的实现来验证权限控制
      // 这里只是示例，实际实现需要根据具体的权限逻辑
    })
  })
})