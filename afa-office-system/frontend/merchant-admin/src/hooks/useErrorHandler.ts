/**
 * 错误处理 Hook
 * 提供统一的错误处理和用户反馈功能
 */

import { useCallback, useEffect, useRef } from 'react'
import { message, notification } from 'antd'

interface UseErrorHandlerOptions {
  enableAutoRetry?: boolean
  enableUserFeedback?: boolean
  showNetworkStatus?: boolean
  maxRetries?: number
}

interface ErrorHandlerHook {
  handleError: (error: any, context?: Record<string, any>) => void
  showSuccess: (message: string) => void
  showInfo: (message: string) => void
  showWarning: (message: string) => void
  showError: (message: string) => void
  isOnline: boolean
  networkQuality: 'good' | 'poor' | 'offline'
  retryOperation: (operation: () => Promise<any>) => Promise<any>
}

interface ErrorDetails {
  level: 'info' | 'warning' | 'error' | 'critical'
  userMessage: string
  suggestions?: string[]
  retryable?: boolean
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}): ErrorHandlerHook {
  const {
    enableAutoRetry = true,
    enableUserFeedback = true,
    showNetworkStatus = true,
    maxRetries = 3
  } = options

  // 处理错误
  const handleError = useCallback((error: any, context?: Record<string, any>) => {
    console.error('Error occurred:', error, context)
    
    // 简化的错误处理逻辑
    const errorMessage = error?.message || '操作失败，请稍后重试'
    message.error(errorMessage)
  }, [])

  // 显示成功消息
  const showSuccess = useCallback((msg: string) => {
    message.success(msg)
  }, [])

  // 显示信息消息
  const showInfo = useCallback((msg: string) => {
    message.info(msg)
  }, [])

  // 显示警告消息
  const showWarning = useCallback((msg: string) => {
    message.warning(msg)
  }, [])

  // 显示错误消息
  const showError = useCallback((msg: string) => {
    message.error(msg)
  }, [])

  // 重试操作
  const retryOperation = useCallback(async (operation: () => Promise<any>) => {
    let lastError: any
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        }
      }
    }
    
    throw lastError
  }, [maxRetries])

  return {
    handleError,
    showSuccess,
    showInfo,
    showWarning,
    showError,
    isOnline: true,
    networkQuality: 'good' as const,
    retryOperation
  }
}