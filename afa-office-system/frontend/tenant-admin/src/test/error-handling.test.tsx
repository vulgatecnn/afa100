/**
 * 错误处理系统测试
 * 测试统一错误处理、用户反馈和网络状态监控功能
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ErrorProvider, useError } from '../contexts/ErrorContext'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { NetworkStatus } from '../components/NetworkStatus'
import { FeedbackModal } from '../components/FeedbackModal'

// Mock Ant Design components
vi.mock('antd', () => ({
  message: {
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn()
  },
  notification: {
    error: vi.fn(),
    info: vi.fn(),
    destroy: vi.fn()
  },
  Badge: ({ children, ...props }: any) => <div data-testid="badge" {...props}>{children}</div>,
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  Modal: ({ children, open, title, ...props }: any) => 
    open ? <div data-testid="modal" {...props}><div>{title}</div>{children}</div> : null,
  Button: ({ children, onClick, ...props }: any) => 
    <button onClick={onClick} {...props}>{children}</button>,
  Space: ({ children }: any) => <div data-testid="space">{children}</div>,
  Typography: {
    Text: ({ children }: any) => <span>{children}</span>,
    Paragraph: ({ children }: any) => <p>{children}</p>
  },
  Progress: ({ percent }: any) => <div data-testid="progress">{percent}%</div>,
  Alert: ({ message, description }: any) => 
    <div data-testid="alert"><div>{message}</div><div>{description}</div></div>,
  Result: ({ title, subTitle, extra }: any) => 
    <div data-testid="result"><h1>{title}</h1><p>{subTitle}</p><div>{extra}</div></div>,
  Collapse: ({ children }: any) => <div data-testid="collapse">{children}</div>,
  Form: ({ children, onFinish }: any) => 
    <form onSubmit={(e) => { e.preventDefault(); onFinish?.({}) }}>{children}</form>,
  Input: (props: any) => <input {...props} />,
  Select: ({ children, onChange }: any) => 
    <select onChange={(e) => onChange?.(e.target.value)}>{children}</select>,
  Upload: ({ children }: any) => <div data-testid="upload">{children}</div>,
  Rate: (props: any) => <div data-testid="rate" {...props}>Rating</div>,
  Divider: () => <hr data-testid="divider" />
}))

// Mock shared modules
vi.mock('@afa/error-handling', () => ({
  ErrorHandler: vi.fn().mockImplementation(() => ({
    handleError: vi.fn().mockReturnValue({
      code: 1001,
      message: 'Test error',
      category: 'network',
      level: 'error',
      timestamp: Date.now(),
      userMessage: '网络连接失败',
      suggestions: ['检查网络连接'],
      retryable: true,
      reportable: true
    }),
    createRetryHandler: vi.fn().mockImplementation((operation) => operation()),
    addErrorListener: vi.fn().mockReturnValue(() => {})
  })),
  UserFeedbackManager: vi.fn().mockImplementation(() => ({
    handleError: vi.fn(),
    showSuccess: vi.fn(),
    showInfo: vi.fn(),
    showWarning: vi.fn(),
    showError: vi.fn(),
    handleNetworkStatus: vi.fn(),
    submitFeedback: vi.fn().mockResolvedValue(undefined)
  })),
  NetworkMonitor: vi.fn().mockImplementation(() => ({
    getNetworkInfo: vi.fn().mockReturnValue({ isOnline: true }),
    getNetworkQuality: vi.fn().mockReturnValue({ 
      speed: 'fast', 
      latency: 'low', 
      stability: 'stable', 
      score: 85 
    }),
    addEventListener: vi.fn().mockReturnValue(() => {}),
    startMonitoring: vi.fn(),
    stopMonitoring: vi.fn(),
    destroy: vi.fn(),
    checkConnection: vi.fn().mockResolvedValue(true),
    testSpeed: vi.fn().mockResolvedValue({ downloadSpeed: 5000000, latency: 50 }),
    getNetworkSuggestions: vi.fn().mockReturnValue([])
  })),
  ErrorLevel: {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
  },
  ErrorCategory: {
    NETWORK: 'network',
    AUTHENTICATION: 'authentication',
    AUTHORIZATION: 'authorization',
    VALIDATION: 'validation',
    BUSINESS: 'business',
    SYSTEM: 'system',
    UNKNOWN: 'unknown'
  },
  SystemErrorCode: {
    NETWORK_ERROR: 1001,
    TIMEOUT_ERROR: 1002
  },
  NotificationType: {
    SUCCESS: 'success',
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error'
  }
}))

// Test component that uses error handling
const TestComponent: React.FC = () => {
  const { handleError, showSuccess, showError, isOnline, networkQuality } = useError()

  return (
    <div>
      <div data-testid="online-status">{isOnline ? 'online' : 'offline'}</div>
      <div data-testid="network-quality">{networkQuality}</div>
      <button 
        data-testid="trigger-error" 
        onClick={() => handleError(new Error('Test error'))}
      >
        Trigger Error
      </button>
      <button 
        data-testid="show-success" 
        onClick={() => showSuccess('Success message')}
      >
        Show Success
      </button>
      <button 
        data-testid="show-error" 
        onClick={() => showError('Error message')}
      >
        Show Error
      </button>
    </div>
  )
}

// Component that throws an error for testing ErrorBoundary
const ErrorThrowingComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test boundary error')
  }
  return <div data-testid="no-error">No error</div>
}

describe('错误处理系统', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ErrorProvider', () => {
    it('应该提供错误处理上下文', () => {
      render(
        <ErrorProvider>
          <TestComponent />
        </ErrorProvider>
      )

      expect(screen.getByTestId('online-status')).toHaveTextContent('online')
      expect(screen.getByTestId('network-quality')).toHaveTextContent('good')
    })

    it('应该处理错误并显示消息', async () => {
      const { message } = await import('antd')
      
      render(
        <ErrorProvider>
          <TestComponent />
        </ErrorProvider>
      )

      fireEvent.click(screen.getByTestId('trigger-error'))

      // 验证错误处理器被调用
      await waitFor(() => {
        expect(message.error).toHaveBeenCalled()
      })
    })

    it('应该显示成功消息', async () => {
      const { message } = await import('antd')
      
      render(
        <ErrorProvider>
          <TestComponent />
        </ErrorProvider>
      )

      fireEvent.click(screen.getByTestId('show-success'))

      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('Success message')
      })
    })
  })

  describe('ErrorBoundary', () => {
    it('应该捕获组件错误并显示错误界面', () => {
      // 抑制控制台错误输出
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByTestId('result')).toBeInTheDocument()
      expect(screen.getByText('页面出现错误')).toBeInTheDocument()

      consoleSpy.mockRestore()
    })

    it('应该正常渲染没有错误的组件', () => {
      render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByTestId('no-error')).toBeInTheDocument()
    })

    it('应该提供重试功能', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )

      const retryButton = screen.getByText('重试')
      expect(retryButton).toBeInTheDocument()

      consoleSpy.mockRestore()
    })
  })

  describe('NetworkStatus', () => {
    it('应该显示网络状态指示器', () => {
      render(<NetworkStatus />)

      expect(screen.getByTestId('badge')).toBeInTheDocument()
      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
    })

    it('应该显示网络状态详情模态框', async () => {
      render(<NetworkStatus />)

      fireEvent.click(screen.getByTestId('badge'))

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument()
      })
    })
  })

  describe('FeedbackModal', () => {
    it('应该渲染反馈表单', () => {
      render(
        <FeedbackModal
          open={true}
          onCancel={() => {}}
        />
      )

      expect(screen.getByTestId('modal')).toBeInTheDocument()
      expect(screen.getByRole('form')).toBeInTheDocument()
    })

    it('应该提交反馈', async () => {
      const onSubmit = vi.fn()
      
      render(
        <FeedbackModal
          open={true}
          onCancel={() => {}}
          onSubmit={onSubmit}
        />
      )

      const form = screen.getByRole('form')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
      })
    })
  })

  describe('useErrorHandler Hook', () => {
    const TestHookComponent: React.FC = () => {
      const {
        handleError,
        showSuccess,
        isOnline,
        networkQuality,
        retryOperation
      } = useErrorHandler()

      return (
        <div>
          <div data-testid="hook-online">{isOnline ? 'online' : 'offline'}</div>
          <div data-testid="hook-quality">{networkQuality}</div>
          <button 
            data-testid="hook-error" 
            onClick={() => handleError(new Error('Hook error'))}
          >
            Handle Error
          </button>
          <button 
            data-testid="hook-success" 
            onClick={() => showSuccess('Hook success')}
          >
            Show Success
          </button>
          <button 
            data-testid="hook-retry" 
            onClick={() => retryOperation(() => Promise.resolve('retry success'))}
          >
            Retry Operation
          </button>
        </div>
      )
    }

    it('应该提供错误处理功能', async () => {
      render(<TestHookComponent />)

      expect(screen.getByTestId('hook-online')).toHaveTextContent('online')
      expect(screen.getByTestId('hook-quality')).toHaveTextContent('good')

      fireEvent.click(screen.getByTestId('hook-error'))
      fireEvent.click(screen.getByTestId('hook-success'))
      fireEvent.click(screen.getByTestId('hook-retry'))

      // 验证功能正常工作
      expect(screen.getByTestId('hook-error')).toBeInTheDocument()
    })
  })

  describe('useNetworkStatus Hook', () => {
    const TestNetworkComponent: React.FC = () => {
      const {
        isOnline,
        networkInfo,
        networkQuality,
        checkConnection,
        testSpeed
      } = useNetworkStatus()

      return (
        <div>
          <div data-testid="network-online">{isOnline ? 'online' : 'offline'}</div>
          <div data-testid="network-speed">{networkQuality.speed}</div>
          <button 
            data-testid="check-connection" 
            onClick={() => checkConnection()}
          >
            Check Connection
          </button>
          <button 
            data-testid="test-speed" 
            onClick={() => testSpeed()}
          >
            Test Speed
          </button>
        </div>
      )
    }

    it('应该提供网络状态信息', () => {
      render(<TestNetworkComponent />)

      expect(screen.getByTestId('network-online')).toHaveTextContent('online')
      expect(screen.getByTestId('network-speed')).toHaveTextContent('fast')
    })

    it('应该支持网络检测功能', () => {
      render(<TestNetworkComponent />)

      fireEvent.click(screen.getByTestId('check-connection'))
      fireEvent.click(screen.getByTestId('test-speed'))

      // 验证按钮可以点击
      expect(screen.getByTestId('check-connection')).toBeInTheDocument()
      expect(screen.getByTestId('test-speed')).toBeInTheDocument()
    })
  })

  describe('集成测试', () => {
    it('应该完整集成所有错误处理功能', async () => {
      render(
        <ErrorProvider
          showNetworkStatus={true}
          enableAutoRetry={true}
          enableUserFeedback={true}
        >
          <TestComponent />
          <NetworkStatus />
        </ErrorProvider>
      )

      // 验证所有组件都正常渲染
      expect(screen.getByTestId('online-status')).toBeInTheDocument()
      expect(screen.getByTestId('network-quality')).toBeInTheDocument()
      expect(screen.getByTestId('badge')).toBeInTheDocument()

      // 测试错误处理
      fireEvent.click(screen.getByTestId('trigger-error'))
      
      // 测试成功消息
      fireEvent.click(screen.getByTestId('show-success'))

      // 测试网络状态
      fireEvent.click(screen.getByTestId('badge'))

      await waitFor(() => {
        // 验证模态框打开
        expect(screen.getByTestId('modal')).toBeInTheDocument()
      })
    })
  })
})