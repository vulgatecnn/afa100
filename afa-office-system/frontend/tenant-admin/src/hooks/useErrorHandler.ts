/**
 * 错误处理 Hook
 * 提供统一的错误处理和用户反馈功能
 */

import { useCallback, useState, useEffect } from 'react'
import { errorHandler, ErrorDetails, NetworkStatus } from '../utils/errorHandler'

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

export function useErrorHandler(options: UseErrorHandlerOptions = {}): ErrorHandlerHook {
  const {
    enableAutoRetry = true,
    enableUserFeedback = true,
    showNetworkStatus = true,
    maxRetries = 3
  } = options

  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(errorHandler.getNetworkStatus())

  // 监听网络状态变化
  useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkStatus(errorHandler.getNetworkStatus())
    }

    if (showNetworkStatus) {
      window.addEventListener('online', updateNetworkStatus)
      window.addEventListener('offline', updateNetworkStatus)

      return () => {
        window.removeEventListener('online', updateNetworkStatus)
        window.removeEventListener('offline', updateNetworkStatus)
      }
    }
  }, [showNetworkStatus])

  // 处理错误
  const handleError = useCallback((error: any, context?: Record<string, any>) => {
    return errorHandler.handleError(error, context)
  }, [])

  // 显示成功消息
  const showSuccess = useCallback((msg: string) => {
    errorHandler.showSuccess(msg)
  }, [])

  // 显示信息消息
  const showInfo = useCallback((msg: string) => {
    errorHandler.showInfo(msg)
  }, [])

  // 显示警告消息
  const showWarning = useCallback((msg: string) => {
    errorHandler.showWarning(msg)
  }, [])

  // 显示错误消息
  const showError = useCallback((msg: string) => {
    errorHandler.showError(msg)
  }, [])

  // 重试操作
  const retryOperation = useCallback(async (operation: () => Promise<any>) => {
    return errorHandler.retryOperation(operation, maxRetries)
  }, [maxRetries])

  return {
    handleError,
    showSuccess,
    showInfo,
    showWarning,
    showError,
    isOnline: networkStatus.isOnline,
    networkQuality: networkStatus.isOnline ? 'good' : 'offline',
    retryOperation
  }
}

