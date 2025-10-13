/**
 * 简化的错误处理工具
 * 提供基本的错误处理和用户反馈功能
 */

import { message, notification } from 'antd'

// 错误级别
export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// 错误分类
export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  BUSINESS = 'business',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

// 错误详情接口
export interface ErrorDetails {
  code: number
  message: string
  category: ErrorCategory
  level: ErrorLevel
  timestamp: number
  userMessage: string
  suggestions?: string[]
  retryable?: boolean
}

// 网络状态接口
export interface NetworkStatus {
  isOnline: boolean
  isSlowConnection: boolean
  lastOnlineTime?: number
}

/**
 * 简化的错误处理器
 */
export class SimpleErrorHandler {
  private networkStatus: NetworkStatus = { isOnline: navigator.onLine, isSlowConnection: false }

  constructor() {
    this.setupNetworkMonitoring()
  }

  /**
   * 处理错误
   */
  handleError(error: any, context?: Record<string, any>): ErrorDetails {
    const errorDetails = this.normalizeError(error, context)
    
    // 显示用户友好的错误消息
    this.displayErrorMessage(errorDetails)
    
    // 记录错误
    console.error('Error handled:', errorDetails)
    
    return errorDetails
  }

  /**
   * 标准化错误对象
   */
  private normalizeError(error: any, context?: Record<string, any>): ErrorDetails {
    let code = 9001
    let message = 'Unknown error'
    let category = ErrorCategory.UNKNOWN
    let level = ErrorLevel.ERROR
    let userMessage = '发生了一个错误，请稍后重试'
    let suggestions: string[] = []
    let retryable = false

    if (error instanceof Error) {
      message = error.message
      
      if (error.message.includes('网络') || error.message.includes('network')) {
        category = ErrorCategory.NETWORK
        code = 1001
        userMessage = '网络连接失败，请检查网络设置'
        suggestions = ['检查网络连接', '稍后重试']
        retryable = true
      } else if (error.message.includes('认证') || error.message.includes('auth')) {
        category = ErrorCategory.AUTHENTICATION
        code = 2001
        userMessage = '认证失败，请重新登录'
        suggestions = ['重新登录']
      } else if (error.message.includes('权限') || error.message.includes('permission')) {
        category = ErrorCategory.AUTHORIZATION
        code = 3001
        userMessage = '权限不足，无法执行此操作'
        suggestions = ['联系管理员获取权限']
      }
    } else if (typeof error === 'object' && error !== null) {
      if (error.response) {
        const status = error.response.status
        message = error.response.data?.message || error.message || `HTTP ${status} Error`
        
        switch (status) {
          case 400:
            category = ErrorCategory.VALIDATION
            code = 4001
            userMessage = '输入数据格式不正确'
            suggestions = ['检查输入格式']
            break
          case 401:
            category = ErrorCategory.AUTHENTICATION
            code = 2002
            userMessage = '登录已过期，请重新登录'
            suggestions = ['重新登录']
            break
          case 403:
            category = ErrorCategory.AUTHORIZATION
            code = 3001
            userMessage = '权限不足，无法执行此操作'
            suggestions = ['联系管理员获取权限']
            break
          case 404:
            category = ErrorCategory.BUSINESS
            code = 5001
            userMessage = '请求的资源不存在'
            suggestions = ['检查资源是否存在', '刷新页面重试']
            break
          case 500:
            category = ErrorCategory.SYSTEM
            code = 6001
            userMessage = '服务器内部错误'
            suggestions = ['稍后重试', '联系技术支持']
            retryable = true
            break
          case 502:
          case 503:
            category = ErrorCategory.SYSTEM
            code = 6003
            userMessage = '服务暂时不可用'
            suggestions = ['稍后重试']
            retryable = true
            break
        }
      }
    }

    return {
      code,
      message,
      category,
      level,
      timestamp: Date.now(),
      userMessage,
      suggestions,
      retryable
    }
  }

  /**
   * 显示错误消息
   */
  private displayErrorMessage(errorDetails: ErrorDetails): void {
    const { level, userMessage, suggestions, retryable } = errorDetails

    switch (level) {
      case ErrorLevel.INFO:
        message.info(userMessage)
        break
      case ErrorLevel.WARNING:
        message.warning(userMessage)
        break
      case ErrorLevel.ERROR:
      case ErrorLevel.CRITICAL:
        notification.error({
          message: '操作失败',
          description: userMessage,
          duration: 0
        })

        // 显示建议
        if (suggestions && suggestions.length > 0) {
          setTimeout(() => {
            notification.info({
              message: '解决建议',
              description: suggestions.join('; '),
              duration: 8
            })
          }, 1000)
        }
        break
    }
  }

  /**
   * 显示成功消息
   */
  showSuccess(msg: string): void {
    message.success(msg)
  }

  /**
   * 显示信息消息
   */
  showInfo(msg: string): void {
    message.info(msg)
  }

  /**
   * 显示警告消息
   */
  showWarning(msg: string): void {
    message.warning(msg)
  }

  /**
   * 显示错误消息
   */
  showError(msg: string): void {
    message.error(msg)
  }

  /**
   * 设置网络监听
   */
  private setupNetworkMonitoring(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.networkStatus.isOnline = true
        this.showSuccess('网络连接已恢复')
      })

      window.addEventListener('offline', () => {
        this.networkStatus.isOnline = false
        this.showWarning('网络连接已断开')
      })
    }
  }

  /**
   * 获取网络状态
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus }
  }

  /**
   * 检查是否在线
   */
  isOnline(): boolean {
    return this.networkStatus.isOnline
  }

  /**
   * 重试操作
   */
  async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<T> {
    let lastError: any

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        const errorDetails = this.normalizeError(error)

        // 如果错误不可重试，直接失败
        if (!errorDetails.retryable) {
          throw this.handleError(error)
        }

        // 如果是最后一次尝试，失败
        if (attempt === maxRetries) {
          throw this.handleError(error)
        }

        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
      }
    }

    throw lastError
  }
}

// 创建全局错误处理器实例
export const errorHandler = new SimpleErrorHandler()