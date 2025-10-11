import React, { createContext, useContext } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'

// 模拟的用户类型
interface MockUser {
  id: number
  name: string
  email: string
  userType: string
  status: string
}

// 模拟的AuthContext类型
interface MockAuthContextType {
  user: MockUser | null
  login: (credentials: any) => Promise<void>
  logout: () => void
  loading: boolean
}

// 创建模拟的AuthContext
const MockAuthContext = createContext<MockAuthContextType | undefined>(undefined)

// 模拟的AuthProvider
const MockAuthProvider: React.FC<{ 
  children: React.ReactNode
  user?: MockUser | null
}> = ({ children, user = null }) => {
  const mockAuthValue: MockAuthContextType = {
    user,
    login: async () => {},
    logout: () => {},
    loading: false
  }

  return (
    <MockAuthContext.Provider value={mockAuthValue}>
      {children}
    </MockAuthContext.Provider>
  )
}

// 自定义渲染选项
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  user?: MockUser | null
}

// 创建测试用的Context Provider
const TestProviders: React.FC<{ 
  children: React.ReactNode
  initialEntries?: string[]
  user?: MockUser | null
}> = ({ children, initialEntries = ['/'], user = null }) => {
  return (
    <BrowserRouter>
      <ConfigProvider locale={zhCN}>
        <MockAuthProvider user={user}>
          {children}
        </MockAuthProvider>
      </ConfigProvider>
    </BrowserRouter>
  )
}

// 自定义渲染函数
export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialEntries = ['/'], user = null, ...renderOptions } = options

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestProviders initialEntries={initialEntries} user={user}>
      {children}
    </TestProviders>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// 重新导出所有testing-library工具
export * from '@testing-library/react'
export { renderWithProviders as render }

// 导出userEvent相关工具
export { createUserEvent } from './user-event'
export { default as userEvent } from '@testing-library/user-event'

// 提供一个稳定的userEvent setup函数
import userEventLib from '@testing-library/user-event'
export const setupUserEvent = () => userEventLib.setup()