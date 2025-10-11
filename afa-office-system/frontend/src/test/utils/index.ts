/**
 * 前端测试工具统一导出 - MySQL后端兼容版本
 */

// API测试工具
export { FrontendApiTestHelper } from './api-test-helper'
export type { MySQLApiResponse, MySQLPaginatedResponse } from './api-test-helper'

// Hook测试工具
export { 
  HookTestHelper, 
  withHookTestEnvironment, 
  HookTestPatterns 
} from './hook-test-helper'

// 错误场景测试工具
export { 
  ErrorScenarioHelper, 
  ErrorScenarioType, 
  withErrorScenarioTesting 
} from './error-scenario-helper'

// 错误处理工具
export {
  TestErrorHandler,
  TestError,
  TestErrorType,
  createTestContext,
  withErrorHandling,
  catchTestError,
  catchTestErrorSync
} from '../../../../shared/test-helpers/error-handler'

// React测试工具
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import React from 'react'

/**
 * 自定义渲染选项
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  user?: any | null
  theme?: any
}

/**
 * 带Provider的渲染工具
 */
export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { 
    initialEntries = ['/'], 
    user = null, 
    theme,
    ...renderOptions 
  } = options

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BrowserRouter>
      <ConfigProvider locale={zhCN} theme={theme}>
        {/* 这里可以添加AuthProvider等其他Provider */}
        {children}
      </ConfigProvider>
    </BrowserRouter>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

/**
 * 前端测试工具类
 */
export class FrontendTestUtils {
  /**
   * 等待元素出现
   */
  static async waitForElement(selector: string, timeout = 5000): Promise<Element> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      
      const checkElement = () => {
        const element = document.querySelector(selector)
        if (element) {
          resolve(element)
          return
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error(`元素 ${selector} 在 ${timeout}ms 内未出现`))
          return
        }
        
        setTimeout(checkElement, 100)
      }
      
      checkElement()
    })
  }

  /**
   * 模拟用户输入
   */
  static async simulateUserInput(element: HTMLInputElement, value: string) {
    element.focus()
    element.value = value
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }

  /**
   * 模拟用户点击
   */
  static async simulateUserClick(element: HTMLElement) {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }

  /**
   * 等待异步操作完成
   */
  static async waitFor(condition: () => boolean | Promise<boolean>, timeout = 5000) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      const result = await condition()
      if (result) {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    throw new Error(`等待条件超时 (${timeout}ms)`)
  }

  /**
   * 模拟网络延迟
   */
  static async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 创建模拟的表单数据
   */
  static createMockFormData(data: Record<string, any>): FormData {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (value instanceof File) {
        formData.append(key, value)
      } else {
        formData.append(key, String(value))
      }
    })
    return formData
  }

  /**
   * 验证表单验证错误
   */
  static expectFormValidationError(container: HTMLElement, fieldName: string, errorMessage?: string) {
    const errorElement = container.querySelector(`[data-testid="${fieldName}-error"]`) ||
                        container.querySelector(`.ant-form-item-explain-error`)
    
    expect(errorElement).toBeInTheDocument()
    
    if (errorMessage) {
      expect(errorElement).toHaveTextContent(errorMessage)
    }
  }

  /**
   * 验证加载状态
   */
  static expectLoadingState(container: HTMLElement, isLoading = true) {
    const loadingElement = container.querySelector('.ant-spin') ||
                          container.querySelector('[data-testid="loading"]')
    
    if (isLoading) {
      expect(loadingElement).toBeInTheDocument()
    } else {
      expect(loadingElement).not.toBeInTheDocument()
    }
  }

  /**
   * 验证空状态
   */
  static expectEmptyState(container: HTMLElement, message?: string) {
    const emptyElement = container.querySelector('.ant-empty') ||
                        container.querySelector('[data-testid="empty-state"]')
    
    expect(emptyElement).toBeInTheDocument()
    
    if (message) {
      expect(emptyElement).toHaveTextContent(message)
    }
  }

  /**
   * 验证成功消息
   */
  static expectSuccessMessage(message: string) {
    // 这里可以根据实际的消息显示方式进行调整
    const messageElement = document.querySelector('.ant-message-success') ||
                          document.querySelector('[data-testid="success-message"]')
    
    expect(messageElement).toBeInTheDocument()
    expect(messageElement).toHaveTextContent(message)
  }

  /**
   * 验证错误消息
   */
  static expectErrorMessage(message: string) {
    const messageElement = document.querySelector('.ant-message-error') ||
                          document.querySelector('[data-testid="error-message"]')
    
    expect(messageElement).toBeInTheDocument()
    expect(messageElement).toHaveTextContent(message)
  }
}

/**
 * 重新导出testing-library工具
 */
export * from '@testing-library/react'
export { renderWithProviders as render }

/**
 * 默认导出
 */
export default {
  api: FrontendApiTestHelper,
  utils: FrontendTestUtils,
  render: renderWithProviders,
  hook: HookTestHelper,
  errorScenario: ErrorScenarioHelper,
  error: TestErrorHandler
}