/**
 * 错误处理上下文
 * 提供全局的错误处理和用户反馈功能
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { NetworkStatus } from '../components/NetworkStatus'
import { FeedbackModal } from '../components/FeedbackModal'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

// 用户反馈接口
interface UserFeedback {
  type: 'bug' | 'suggestion' | 'complaint' | 'praise'
  message: string
  email?: string
  screenshot?: string
  context?: Record<string, any>
  timestamp: number
}

interface ErrorContextValue {
  // 错误处理方法
  handleError: (error: any, context?: Record<string, any>) => void
  showSuccess: (message: string) => void
  showInfo: (message: string) => void
  showWarning: (message: string) => void
  showError: (message: string) => void
  
  // 网络状态
  isOnline: boolean
  networkQuality: 'good' | 'poor' | 'offline'
  
  // 反馈功能
  showFeedback: (type?: 'bug' | 'suggestion' | 'complaint' | 'praise', errorContext?: Record<string, any>) => void
  
  // 重试功能
  retryOperation: (operation: () => Promise<any>) => Promise<any>
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined)

interface ErrorProviderProps {
  children: ReactNode
  showNetworkStatus?: boolean
  enableAutoRetry?: boolean
  enableUserFeedback?: boolean
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({
  children,
  showNetworkStatus = true,
  enableAutoRetry = true,
  enableUserFeedback = true
}) => {
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'bug' | 'suggestion' | 'complaint' | 'praise'>('suggestion')
  const [feedbackContext, setFeedbackContext] = useState<Record<string, any> | undefined>()

  // 使用错误处理 Hook
  const {
    handleError,
    showSuccess,
    showInfo,
    showWarning,
    showError,
    isOnline,
    networkQuality,
    retryOperation
  } = useErrorHandler({
    enableAutoRetry,
    enableUserFeedback,
    showNetworkStatus
  })

  // 显示反馈模态框
  const showFeedback = useCallback((
    type: 'bug' | 'suggestion' | 'complaint' | 'praise' = 'suggestion',
    errorContext?: Record<string, any>
  ) => {
    setFeedbackType(type)
    setFeedbackContext(errorContext)
    setFeedbackModalOpen(true)
  }, [])

  // 处理反馈提交
  const handleFeedbackSubmit = useCallback((feedback: UserFeedback) => {
    console.log('Feedback submitted:', feedback)
    // 这里可以添加额外的反馈处理逻辑
  }, [])

  // 错误边界错误处理
  const handleBoundaryError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    handleError(error, {
      type: 'react-error-boundary',
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    })
  }, [handleError])

  const contextValue: ErrorContextValue = {
    handleError,
    showSuccess,
    showInfo,
    showWarning,
    showError,
    isOnline,
    networkQuality,
    showFeedback,
    retryOperation
  }

  return (
    <ErrorContext.Provider value={contextValue}>
      <ErrorBoundary onError={handleBoundaryError}>
        {children}
        
        {/* 网络状态指示器 */}
        {showNetworkStatus && <NetworkStatus />}
        
        {/* 反馈模态框 */}
        {enableUserFeedback && (
          <FeedbackModal
            open={feedbackModalOpen}
            onCancel={() => setFeedbackModalOpen(false)}
            onSubmit={handleFeedbackSubmit}
            initialType={feedbackType}
            errorContext={feedbackContext}
          />
        )}
      </ErrorBoundary>
    </ErrorContext.Provider>
  )
}

/**
 * 使用错误上下文的 Hook
 */
export const useError = (): ErrorContextValue => {
  const context = useContext(ErrorContext)
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider')
  }
  return context
}

/**
 * 高阶组件：为组件添加错误处理上下文
 */
export function withErrorProvider<P extends object>(
  Component: React.ComponentType<P>,
  providerProps?: Omit<ErrorProviderProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorProvider {...providerProps}>
      <Component {...props} />
    </ErrorProvider>
  )

  WrappedComponent.displayName = `withErrorProvider(${Component.displayName || Component.name})`
  
  return WrappedComponent
}