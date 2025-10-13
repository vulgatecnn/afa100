/**
 * 统一错误处理器
 * 提供错误捕获、分类、转换和报告功能
 */

import {
  ErrorDetails,
  ErrorCategory,
  ErrorLevel,
  SystemErrorCode,
  ERROR_MESSAGES,
  ERROR_CATEGORY_MAP,
  ERROR_LEVEL_MAP
} from './error-types'

export interface ErrorHandlerConfig {
  enableLogging?: boolean
  enableReporting?: boolean
  reportingEndpoint?: string
  logLevel?: ErrorLevel
  maxRetries?: number
  retryDelay?: number
}

export interface ErrorContext {
  userId?: string
  sessionId?: string
  requestId?: string
  userAgent?: string
  url?: string
  timestamp?: number
  additionalData?: Record<string, any>
}

export class ErrorHandler {
  private config: ErrorHandlerConfig
  private errorListeners: Array<(error: ErrorDetails) => void> = []

  constructor(config: ErrorHandlerConfig = {}) {
    this.config = {
      enableLogging: true,
      enableReporting: false,
      logLevel: ErrorLevel.WARNING,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    }

    // 设置全局错误处理
    this.setupGlobalErrorHandling()
  }

  /**
   * 处理错误
   */
  handleError(error: any, context?: ErrorContext): ErrorDetails {
    const errorDetails = this.normalizeError(error, context)

    // 记录错误
    if (this.config.enableLogging) {
      this.logError(errorDetails)
    }

    // 报告错误
    if (this.config.enableReporting && errorDetails.reportable) {
      this.reportError(errorDetails)
    }

    // 通知监听器
    this.notifyListeners(errorDetails)

    return errorDetails
  }

  /**
   * 标准化错误对象
   */
  private normalizeError(error: any, context?: ErrorContext): ErrorDetails {
    let code: SystemErrorCode
    let message: string
    let category: ErrorCategory
    let level: ErrorLevel
    let userMessage: string
    let suggestions: string[] = []
    let retryable = false
    let reportable = true

    // 处理不同类型的错误
    if (error instanceof Error) {
      // JavaScript 原生错误
      if (error.name === 'TypeError') {
        code = SystemErrorCode.INVALID_INPUT
      } else if (error.name === 'ReferenceError') {
        code = SystemErrorCode.CONFIGURATION_ERROR
      } else if (error.message.includes('timeout')) {
        code = SystemErrorCode.TIMEOUT_ERROR
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        code = SystemErrorCode.NETWORK_ERROR
      } else {
        code = SystemErrorCode.UNKNOWN_ERROR
      }
      message = error.message
    } else if (typeof error === 'object' && error !== null) {
      // API 错误响应
      if (error.response) {
        const status = error.response.status
        const data = error.response.data

        switch (status) {
          case 400:
            code = SystemErrorCode.INVALID_INPUT
            break
          case 401:
            code = SystemErrorCode.TOKEN_EXPIRED
            break
          case 403:
            code = SystemErrorCode.PERMISSION_DENIED
            break
          case 404:
            code = SystemErrorCode.RESOURCE_NOT_FOUND
            break
          case 409:
            code = SystemErrorCode.RESOURCE_ALREADY_EXISTS
            break
          case 429:
            code = SystemErrorCode.QUOTA_EXCEEDED
            break
          case 500:
            code = SystemErrorCode.INTERNAL_SERVER_ERROR
            break
          case 502:
          case 503:
            code = SystemErrorCode.SERVICE_UNAVAILABLE
            break
          default:
            code = SystemErrorCode.UNKNOWN_ERROR
        }

        message = data?.message || error.message || `HTTP ${status} Error`
      } else if (error.code) {
        // 已经是标准化的错误
        code = error.code
        message = error.message || 'Unknown error'
      } else {
        code = SystemErrorCode.UNKNOWN_ERROR
        message = error.message || JSON.stringify(error)
      }
    } else {
      // 其他类型的错误
      code = SystemErrorCode.UNKNOWN_ERROR
      message = String(error)
    }

    // 获取错误分类和级别
    category = ERROR_CATEGORY_MAP[code] || ErrorCategory.UNKNOWN
    level = ERROR_LEVEL_MAP[code] || ErrorLevel.ERROR

    // 获取用户友好的消息和建议
    const errorMessage = ERROR_MESSAGES[code]
    if (errorMessage) {
      userMessage = errorMessage.user
      suggestions = errorMessage.suggestions || []
    } else {
      userMessage = '发生了一个错误，请稍后重试'
    }

    // 判断是否可重试
    retryable = this.isRetryableError(code, category)

    // 判断是否需要报告
    reportable = level === ErrorLevel.ERROR || level === ErrorLevel.CRITICAL

    return {
      code,
      message,
      category,
      level,
      timestamp: Date.now(),
      context: context ? { ...context } : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      userMessage,
      suggestions,
      retryable,
      reportable
    }
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(code: SystemErrorCode, category: ErrorCategory): boolean {
    // 网络错误通常可以重试
    if (category === ErrorCategory.NETWORK) {
      return true
    }

    // 系统错误中的服务不可用可以重试
    if (code === SystemErrorCode.SERVICE_UNAVAILABLE || 
        code === SystemErrorCode.TIMEOUT_ERROR ||
        code === SystemErrorCode.INTERNAL_SERVER_ERROR) {
      return true
    }

    return false
  }

  /**
   * 记录错误
   */
  private logError(error: ErrorDetails): void {
    const shouldLog = this.shouldLogError(error.level)
    if (!shouldLog) return

    const logData = {
      code: error.code,
      message: error.message,
      category: error.category,
      level: error.level,
      timestamp: new Date(error.timestamp).toISOString(),
      context: error.context,
      stack: error.stack
    }

    switch (error.level) {
      case ErrorLevel.INFO:
        console.info('🔵 [INFO]', logData)
        break
      case ErrorLevel.WARNING:
        console.warn('🟡 [WARNING]', logData)
        break
      case ErrorLevel.ERROR:
        console.error('🔴 [ERROR]', logData)
        break
      case ErrorLevel.CRITICAL:
        console.error('💥 [CRITICAL]', logData)
        break
    }
  }

  /**
   * 判断是否应该记录错误
   */
  private shouldLogError(level: ErrorLevel): boolean {
    const levels = [ErrorLevel.INFO, ErrorLevel.WARNING, ErrorLevel.ERROR, ErrorLevel.CRITICAL]
    const configLevelIndex = levels.indexOf(this.config.logLevel!)
    const errorLevelIndex = levels.indexOf(level)
    
    return errorLevelIndex >= configLevelIndex
  }

  /**
   * 报告错误到服务器
   */
  private async reportError(error: ErrorDetails): Promise<void> {
    if (!this.config.reportingEndpoint) return

    try {
      const reportData = {
        code: error.code,
        message: error.message,
        category: error.category,
        level: error.level,
        timestamp: error.timestamp,
        context: error.context,
        stack: error.stack,
        userAgent: navigator?.userAgent,
        url: window?.location?.href
      }

      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
      })
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  /**
   * 通知错误监听器
   */
  private notifyListeners(error: ErrorDetails): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error)
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError)
      }
    })
  }

  /**
   * 添加错误监听器
   */
  addErrorListener(listener: (error: ErrorDetails) => void): () => void {
    this.errorListeners.push(listener)
    
    // 返回移除监听器的函数
    return () => {
      const index = this.errorListeners.indexOf(listener)
      if (index > -1) {
        this.errorListeners.splice(index, 1)
      }
    }
  }

  /**
   * 设置全局错误处理
   */
  private setupGlobalErrorHandling(): void {
    if (typeof window !== 'undefined') {
      // 处理未捕获的 JavaScript 错误
      window.addEventListener('error', (event) => {
        this.handleError(event.error, {
          url: event.filename,
          additionalData: {
            lineno: event.lineno,
            colno: event.colno
          }
        })
      })

      // 处理未捕获的 Promise 拒绝
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, {
          additionalData: {
            type: 'unhandledrejection'
          }
        })
      })
    }
  }

  /**
   * 创建错误重试器
   */
  createRetryHandler<T>(
    operation: () => Promise<T>,
    maxRetries?: number,
    retryDelay?: number
  ): Promise<T> {
    const retries = maxRetries ?? this.config.maxRetries!
    const delay = retryDelay ?? this.config.retryDelay!

    return new Promise(async (resolve, reject) => {
      let lastError: any

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const result = await operation()
          resolve(result)
          return
        } catch (error) {
          lastError = error
          const errorDetails = this.normalizeError(error)

          // 如果错误不可重试，直接失败
          if (!errorDetails.retryable) {
            reject(this.handleError(error))
            return
          }

          // 如果是最后一次尝试，失败
          if (attempt === retries) {
            reject(this.handleError(error))
            return
          }

          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)))
        }
      }
    })
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(error: any): string {
    const errorDetails = this.normalizeError(error)
    return errorDetails.userMessage
  }

  /**
   * 获取错误建议
   */
  getErrorSuggestions(error: any): string[] {
    const errorDetails = this.normalizeError(error)
    return errorDetails.suggestions || []
  }

  /**
   * 检查错误是否可重试
   */
  isRetryable(error: any): boolean {
    const errorDetails = this.normalizeError(error)
    return errorDetails.retryable || false
  }
}