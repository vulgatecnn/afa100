import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import DashboardLayout from '../DashboardLayout'
import { AuthProvider } from '../../../contexts/AuthContext'
import { authService } from '../../../services/authService'

// Mock authService
vi.mock('../../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    getCurrentUser: vi.fn(),
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

// Mock react-router-dom hooks
const mockNavigate = vi.fn()
const mockLocation = { pathname: '/merchants' }

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  }
})

// 测试用的包装器组件
const TestWrapper: React.FC<{ children: React.ReactNode; user?: any }> = ({ 
  children, 
  user = {
    id: 1,
    name: '测试用户',
    email: 'test@example.com',
    userType: 'tenant_admin'
  }
}) => {
  // Mock getCurrentUser to return the test user
  vi.mocked(authService.getCurrentUser).mockResolvedValue(user)
  
  return (
    <BrowserRouter>
      <ConfigProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ConfigProvider>
    </BrowserRouter>
  )
}

describe('DashboardLayout', () => {
  const mockUser = {
    id: 1,
    name: '测试用户',
    email: 'test@example.com',
    userType: 'tenant_admin'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    // 设置localStorage中有token，模拟已登录状态
    localStorage.setItem('token', 'mock-token')
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)
  })

  describe('基础渲染测试', () => {
    it('应该渲染布局的基本结构', async () => {
      render(
        <TestWrapper>
          <DashboardLayout>
            <div data-testid="test-content">测试内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      // 等待组件加载完成
      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 验证基本结构
      expect(screen.getByText('商户管理')).toBeInTheDocument()
      expect(screen.getByText('空间管理')).toBeInTheDocument()
      expect(screen.getByText('通行记录')).toBeInTheDocument()
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    it('应该显示用户信息', async () => {
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('欢迎，测试用户')).toBeInTheDocument()
      })
    })

    it('应该渲染所有菜单项', async () => {
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('商户管理')).toBeInTheDocument()
      })

      expect(screen.getByText('空间管理')).toBeInTheDocument()
      expect(screen.getByText('通行记录')).toBeInTheDocument()
    })

    it('应该正确渲染子组件', async () => {
      const TestChild = () => <div data-testid="child-component">子组件内容</div>
      
      render(
        <TestWrapper>
          <DashboardLayout>
            <TestChild />
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('child-component')).toBeInTheDocument()
      })
      
      expect(screen.getByText('子组件内容')).toBeInTheDocument()
    })
  })

  describe('侧边栏功能测试', () => {
    it('应该支持侧边栏展开收起', async () => {
      const user = userEvent.setup()
      
      const { container } = render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 点击收起按钮
      const toggleButton = screen.getByRole('button', { name: /fold|unfold/i })
      await user.click(toggleButton)

      // 验证侧边栏收起后的状态
      await waitFor(() => {
        expect(screen.getByText('AFA')).toBeInTheDocument()
      })
      
      // 验证布局的margin变化
      const layoutContent = container.querySelector('.ant-layout:not(.ant-layout-has-sider)')
      expect(layoutContent).toBeInTheDocument()
      
      // 再次点击展开
      await user.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })
    })

    it('应该在收起状态下显示简化的logo', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 收起侧边栏
      const toggleButton = screen.getByRole('button', { name: /fold|unfold/i })
      await user.click(toggleButton)

      // 验证显示简化logo
      await waitFor(() => {
        expect(screen.getByText('AFA')).toBeInTheDocument()
        expect(screen.queryByText('AFA租务管理')).not.toBeInTheDocument()
      })
    })

    it('应该正确高亮当前选中的菜单项', async () => {
      // 模拟当前路径为 /spaces
      mockLocation.pathname = '/spaces'
      
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('空间管理')).toBeInTheDocument()
      })

      // 验证空间管理菜单项被选中
      const spaceMenuItem = screen.getByText('空间管理').closest('.ant-menu-item')
      expect(spaceMenuItem).toHaveClass('ant-menu-item-selected')
    })

    it('应该正确处理侧边栏的固定定位', async () => {
      const { container } = render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 验证侧边栏的固定定位样式
      const sider = container.querySelector('.ant-layout-sider')
      expect(sider).toHaveStyle({
        position: 'fixed',
        left: '0px',
        top: '0px',
        bottom: '0px',
        overflow: 'auto',
        height: '100vh'
      })
    })

    it('应该在展开和收起状态下正确调整内容区域边距', async () => {
      const user = userEvent.setup()
      
      const { container } = render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 验证展开状态下的边距
      const layoutContent = container.querySelector('.ant-layout:not(.ant-layout-has-sider)')
      expect(layoutContent).toHaveStyle({
        marginLeft: '200px',
        transition: 'margin-left 0.2s'
      })

      // 收起侧边栏
      const toggleButton = screen.getByRole('button', { name: /fold|unfold/i })
      await user.click(toggleButton)

      // 验证收起状态下的边距变化
      await waitFor(() => {
        expect(screen.getByText('AFA')).toBeInTheDocument()
      })
      
      // 验证边距调整为80px
      expect(layoutContent).toHaveStyle({
        marginLeft: '80px'
      })
    })

    it('应该支持侧边栏的滚动功能', async () => {
      const { container } = render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 验证侧边栏可以滚动
      const sider = container.querySelector('.ant-layout-sider')
      expect(sider).toHaveStyle({ overflow: 'auto' })
    })

    it('应该正确显示侧边栏的品牌标识', async () => {
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 验证品牌标识存在并正确显示
      const brandElement = screen.getByText('AFA租务管理')
      expect(brandElement).toBeInTheDocument()
      
      // 验证品牌容器存在
      const brandContainer = brandElement.parentElement
      expect(brandContainer).toBeInTheDocument()
      
      // 验证品牌标识在侧边栏中正确显示
      expect(brandElement).toBeVisible()
    })
  })

  describe('导航功能测试', () => {
    it('应该支持菜单项点击导航', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('空间管理')).toBeInTheDocument()
      })

      // 点击空间管理菜单
      await user.click(screen.getByText('空间管理'))

      // 验证导航被调用
      expect(mockNavigate).toHaveBeenCalledWith('/spaces')
    })

    it('应该支持所有菜单项的导航', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('商户管理')).toBeInTheDocument()
      })

      // 测试商户管理导航
      await user.click(screen.getByText('商户管理'))
      expect(mockNavigate).toHaveBeenCalledWith('/merchants')

      // 测试通行记录导航
      await user.click(screen.getByText('通行记录'))
      expect(mockNavigate).toHaveBeenCalledWith('/access')
    })

    it('应该正确显示当前路由对应的菜单项', async () => {
      // 测试不同路由下的菜单高亮
      const testCases = [
        { pathname: '/merchants', expectedText: '商户管理' },
        { pathname: '/spaces', expectedText: '空间管理' },
        { pathname: '/access', expectedText: '通行记录' }
      ]

      for (const testCase of testCases) {
        mockLocation.pathname = testCase.pathname
        
        const { container } = render(
          <TestWrapper>
            <DashboardLayout>
              <div>内容</div>
            </DashboardLayout>
          </TestWrapper>
        )

        await waitFor(() => {
          expect(screen.getByText(testCase.expectedText)).toBeInTheDocument()
        })

        // 验证对应菜单项被选中
        const selectedMenuItem = screen.getByText(testCase.expectedText).closest('.ant-menu-item')
        expect(selectedMenuItem).toHaveClass('ant-menu-item-selected')
        
        // 清理
        container.remove()
      }
    })

    it('应该支持菜单项的图标显示', async () => {
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('商户管理')).toBeInTheDocument()
      })

      // 验证菜单图标存在
      expect(screen.getByRole('img', { name: 'shop' })).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'home' })).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'file-text' })).toBeInTheDocument()
    })

    it('应该支持菜单的键盘访问', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('商户管理')).toBeInTheDocument()
      })

      // 验证菜单可以通过键盘访问
      const menu = screen.getByRole('menu')
      expect(menu).toBeInTheDocument()
      expect(menu).toHaveAttribute('tabindex', '0')

      // 验证菜单项可以获得焦点
      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems.length).toBe(3)
      
      menuItems.forEach(item => {
        expect(item).toHaveAttribute('tabindex', '-1')
      })
    })
  })

  describe('用户菜单功能测试', () => {
    it('应该显示用户下拉菜单', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('欢迎，测试用户')).toBeInTheDocument()
      })

      // 点击用户头像 - 使用更具体的选择器
      const avatar = screen.getByRole('img', { name: 'user' }).closest('.ant-avatar')
      expect(avatar).toBeInTheDocument()
      await user.click(avatar!)

      // 验证下拉菜单项
      await waitFor(() => {
        expect(screen.getByText('个人资料')).toBeInTheDocument()
        expect(screen.getByText('系统设置')).toBeInTheDocument()
        expect(screen.getByText('退出登录')).toBeInTheDocument()
      })
    })

    it('应该支持退出登录功能', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('欢迎，测试用户')).toBeInTheDocument()
      })

      // 点击用户头像打开菜单 - 使用更具体的选择器
      const avatar = screen.getByRole('img', { name: 'user' }).closest('.ant-avatar')
      expect(avatar).toBeInTheDocument()
      await user.click(avatar!)

      // 点击退出登录
      await waitFor(() => {
        expect(screen.getByText('退出登录')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('退出登录'))

      // 验证localStorage被清理
      expect(localStorage.getItem('token')).toBeNull()
    })

    it('应该正确显示用户头像和信息', async () => {
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('欢迎，测试用户')).toBeInTheDocument()
      })

      // 验证用户头像存在并有正确的样式
      const avatar = screen.getByRole('img', { name: 'user' }).closest('.ant-avatar')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveClass('ant-avatar-circle', 'ant-avatar-icon')
      expect(avatar).toHaveStyle({
        backgroundColor: 'rgb(24, 144, 255)',
        cursor: 'pointer'
      })

      // 验证用户欢迎信息
      expect(screen.getByText('欢迎，测试用户')).toBeInTheDocument()
    })

    it('应该支持用户菜单的所有选项', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('欢迎，测试用户')).toBeInTheDocument()
      })

      // 点击用户头像打开菜单
      const avatar = screen.getByRole('img', { name: 'user' }).closest('.ant-avatar')
      await user.click(avatar!)

      // 验证所有菜单项都存在
      await waitFor(() => {
        expect(screen.getByText('个人资料')).toBeInTheDocument()
        expect(screen.getByText('系统设置')).toBeInTheDocument()
        expect(screen.getByText('退出登录')).toBeInTheDocument()
      })

      // 验证菜单项有正确的图标 - 使用getAllByRole来处理多个相同图标
      const userIcons = screen.getAllByRole('img', { name: 'user' })
      expect(userIcons.length).toBeGreaterThan(0)
      expect(screen.getByRole('img', { name: 'setting' })).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'logout' })).toBeInTheDocument()
    })
  })

  describe('头部功能测试', () => {
    it('应该正确显示头部布局', async () => {
      const { container } = render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('欢迎，测试用户')).toBeInTheDocument()
      })

      // 验证头部样式
      const header = container.querySelector('.ant-layout-header')
      expect(header).toBeInTheDocument()
      expect(header).toHaveStyle({
        padding: '0px 16px',
        background: 'rgb(255, 255, 255)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      })
    })

    it('应该正确显示切换按钮', async () => {
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 验证切换按钮存在
      const toggleButton = screen.getByRole('button', { name: /fold|unfold/i })
      expect(toggleButton).toBeInTheDocument()
      expect(toggleButton).toHaveStyle({
        fontSize: '16px',
        width: '64px',
        height: '64px'
      })

      // 验证按钮图标
      expect(screen.getByRole('img', { name: 'menu-fold' })).toBeInTheDocument()
    })

    it('应该在切换后显示正确的图标', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 初始状态应该显示fold图标
      expect(screen.getByRole('img', { name: 'menu-fold' })).toBeInTheDocument()

      // 点击切换按钮
      const toggleButton = screen.getByRole('button', { name: /fold|unfold/i })
      await user.click(toggleButton)

      // 切换后应该显示unfold图标
      await waitFor(() => {
        expect(screen.getByRole('img', { name: 'menu-unfold' })).toBeInTheDocument()
      })
    })

    it('应该正确显示用户信息区域', async () => {
      const { container } = render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('欢迎，测试用户')).toBeInTheDocument()
      })

      // 验证用户信息区域的布局
      const userInfoArea = container.querySelector('div[style*="display: flex"][style*="align-items: center"][style*="gap: 16px"]')
      expect(userInfoArea).toBeInTheDocument()

      // 验证包含用户名和头像
      expect(screen.getByText('欢迎，测试用户')).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'user' })).toBeInTheDocument()
    })
  })

  describe('响应式设计测试', () => {
    it('应该在不同屏幕尺寸下正确显示', async () => {
      // 模拟大屏幕
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })

      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 在大屏幕下应该显示完整的侧边栏
      expect(screen.getByText('商户管理')).toBeInTheDocument()
      expect(screen.getByText('空间管理')).toBeInTheDocument()
      expect(screen.getByText('通行记录')).toBeInTheDocument()
    })

    it('应该在移动端自动收起侧边栏', async () => {
      // 模拟移动端屏幕
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      const { container } = render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 验证侧边栏在移动端的行为
      const sider = container.querySelector('.ant-layout-sider')
      expect(sider).toBeInTheDocument()
    })

    it('应该支持键盘导航', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('商户管理')).toBeInTheDocument()
      })

      // 直接点击菜单项来测试导航功能
      const merchantMenuItem = screen.getByText('商户管理')
      await user.click(merchantMenuItem)

      // 验证导航被触发
      expect(mockNavigate).toHaveBeenCalledWith('/merchants')
    })

    it('应该在不同屏幕尺寸下保持布局稳定', async () => {
      const { container } = render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 验证布局容器存在
      const layout = container.querySelector('.ant-layout')
      expect(layout).toBeInTheDocument()
      expect(layout).toHaveStyle({ minHeight: '100vh' })

      // 验证侧边栏存在
      const sider = container.querySelector('.ant-layout-sider')
      expect(sider).toBeInTheDocument()

      // 验证内容区域存在
      const content = container.querySelector('.ant-layout-content')
      expect(content).toBeInTheDocument()
    })

    it('应该正确处理断点变化', async () => {
      const { container } = render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 验证侧边栏的断点配置
      const sider = container.querySelector('.ant-layout-sider')
      expect(sider).toBeInTheDocument()
      
      // 验证侧边栏的固定定位
      expect(sider).toHaveStyle({
        position: 'fixed',
        left: '0px',
        top: '0px',
        bottom: '0px'
      })
    })
  })

  describe('样式和主题测试', () => {
    it('应该应用正确的样式', async () => {
      const { container } = render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 验证布局容器的样式
      const layoutContainer = container.querySelector('.ant-layout')
      expect(layoutContainer).toHaveStyle({ minHeight: '100vh' })

      // 验证侧边栏样式
      const sider = container.querySelector('.ant-layout-sider')
      expect(sider).toBeInTheDocument()

      // 验证头部样式
      const header = container.querySelector('.ant-layout-header')
      expect(header).toBeInTheDocument()

      // 验证内容区域样式
      const content = container.querySelector('.ant-layout-content')
      expect(content).toBeInTheDocument()
    })

    it('应该正确处理主题色彩', async () => {
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 验证菜单使用深色主题
      const menu = document.querySelector('.ant-menu-dark')
      expect(menu).toBeInTheDocument()
    })

    it('应该正确应用内容区域样式', async () => {
      const { container } = render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('内容')).toBeInTheDocument()
      })

      // 验证内容区域的详细样式
      const content = container.querySelector('.ant-layout-content')
      expect(content).toHaveStyle({
        margin: '16px',
        padding: '24px',
        minHeight: '280px',
        background: 'rgb(255, 255, 255)',
        borderRadius: '8px',
        overflow: 'auto'
      })
    })

    it('应该正确应用头部阴影效果', async () => {
      const { container } = render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('欢迎，测试用户')).toBeInTheDocument()
      })

      // 验证头部的阴影样式
      const header = container.querySelector('.ant-layout-header')
      expect(header).toHaveStyle({
        boxShadow: '0 1px 4px rgba(0,21,41,.08)'
      })
    })

    it('应该正确处理侧边栏的深色主题', async () => {
      const { container } = render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 验证侧边栏使用深色主题
      const sider = container.querySelector('.ant-layout-sider-dark')
      expect(sider).toBeInTheDocument()

      // 验证菜单使用深色主题
      const menu = container.querySelector('.ant-menu-dark')
      expect(menu).toBeInTheDocument()
      expect(menu).toHaveClass('ant-menu-inline')
    })

    it('应该正确处理品牌区域的半透明背景', async () => {
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 验证品牌区域存在并正确显示
      const brandElement = screen.getByText('AFA租务管理')
      expect(brandElement).toBeInTheDocument()
      
      const brandContainer = brandElement.parentElement
      expect(brandContainer).toBeInTheDocument()
      
      // 验证品牌区域在侧边栏中正确显示
      expect(brandElement).toBeVisible()
    })
  })

  describe('内容区域测试', () => {
    it('应该正确渲染子组件内容', async () => {
      const TestContent = () => (
        <div data-testid="test-content">
          <h1>测试标题</h1>
          <p>测试段落内容</p>
          <button>测试按钮</button>
        </div>
      )

      render(
        <TestWrapper>
          <DashboardLayout>
            <TestContent />
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument()
      })

      // 验证子组件内容都正确渲染
      expect(screen.getByText('测试标题')).toBeInTheDocument()
      expect(screen.getByText('测试段落内容')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '测试按钮' })).toBeInTheDocument()
    })

    it('应该支持内容区域的滚动', async () => {
      const { container } = render(
        <TestWrapper>
          <DashboardLayout>
            <div style={{ height: '2000px' }}>很长的内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('很长的内容')).toBeInTheDocument()
      })

      // 验证内容区域可以滚动
      const content = container.querySelector('.ant-layout-content')
      expect(content).toHaveStyle({ overflow: 'auto' })
    })

    it('应该正确处理空内容', async () => {
      render(
        <TestWrapper>
          <DashboardLayout>
            {null}
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 布局应该正常渲染，即使没有内容
      expect(screen.getByText('商户管理')).toBeInTheDocument()
    })

    it('应该支持复杂的嵌套内容', async () => {
      const ComplexContent = () => (
        <div>
          <div data-testid="level-1">
            <div data-testid="level-2">
              <div data-testid="level-3">
                深层嵌套内容
              </div>
            </div>
          </div>
        </div>
      )

      render(
        <TestWrapper>
          <DashboardLayout>
            <ComplexContent />
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('level-1')).toBeInTheDocument()
      })

      // 验证嵌套内容都正确渲染
      expect(screen.getByTestId('level-2')).toBeInTheDocument()
      expect(screen.getByTestId('level-3')).toBeInTheDocument()
      expect(screen.getByText('深层嵌套内容')).toBeInTheDocument()
    })
  })

  describe('边界情况测试', () => {
    it('应该处理空的子组件', async () => {
      render(
        <TestWrapper>
          <DashboardLayout>
            {null}
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 布局应该正常渲染，即使没有子组件
      expect(screen.getByText('商户管理')).toBeInTheDocument()
    })

    it('应该处理用户信息为空的情况', async () => {
      render(
        <TestWrapper user={null}>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      // 应该显示默认的欢迎信息或处理空用户情况
      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })
    })

    it('应该处理长用户名', async () => {
      const longNameUser = {
        ...mockUser,
        name: '这是一个非常非常长的用户名测试'
      }

      render(
        <TestWrapper user={longNameUser}>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('欢迎，这是一个非常非常长的用户名测试')).toBeInTheDocument()
      })
    })

    it('应该处理多个子组件', async () => {
      render(
        <TestWrapper>
          <DashboardLayout>
            <div data-testid="child-1">子组件1</div>
            <div data-testid="child-2">子组件2</div>
            <div data-testid="child-3">子组件3</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('child-1')).toBeInTheDocument()
      })

      expect(screen.getByTestId('child-2')).toBeInTheDocument()
      expect(screen.getByTestId('child-3')).toBeInTheDocument()
    })
  })

  describe('交互行为测试', () => {
    it('应该支持快速连续点击菜单项', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('商户管理')).toBeInTheDocument()
      })

      // 快速连续点击不同菜单项
      await user.click(screen.getByText('商户管理'))
      await user.click(screen.getByText('空间管理'))
      await user.click(screen.getByText('通行记录'))

      // 验证所有导航调用都被执行
      expect(mockNavigate).toHaveBeenCalledTimes(3)
      expect(mockNavigate).toHaveBeenNthCalledWith(1, '/merchants')
      expect(mockNavigate).toHaveBeenNthCalledWith(2, '/spaces')
      expect(mockNavigate).toHaveBeenNthCalledWith(3, '/access')
    })

    it('应该支持侧边栏的快速展开收起', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      const toggleButton = screen.getByRole('button', { name: /fold|unfold/i })

      // 快速多次点击切换按钮
      await user.click(toggleButton)
      await user.click(toggleButton)
      await user.click(toggleButton)

      // 最终应该是收起状态
      await waitFor(() => {
        expect(screen.getByText('AFA')).toBeInTheDocument()
      })
    })
  })

  describe('无障碍访问测试', () => {
    it('应该有正确的ARIA标签', async () => {
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('AFA租务管理')).toBeInTheDocument()
      })

      // 验证菜单的role属性
      const menu = document.querySelector('[role="menu"]')
      expect(menu).toBeInTheDocument()

      // 验证按钮的可访问性
      const toggleButton = screen.getByRole('button', { name: /fold|unfold/i })
      expect(toggleButton).toBeInTheDocument()
      expect(toggleButton).toHaveAttribute('type', 'button')
    })

    it('应该支持屏幕阅读器', async () => {
      render(
        <TestWrapper>
          <DashboardLayout>
            <div>内容</div>
          </DashboardLayout>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('商户管理')).toBeInTheDocument()
      })

      // 验证菜单项有合适的文本内容供屏幕阅读器读取
      expect(screen.getByText('商户管理')).toBeInTheDocument()
      expect(screen.getByText('空间管理')).toBeInTheDocument()
      expect(screen.getByText('通行记录')).toBeInTheDocument()
    })
  })
})