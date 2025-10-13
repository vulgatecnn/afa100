/**
 * 用户反馈系统
 * 提供统一的用户通知、消息提示和反馈收集功能
 */

import { ErrorDetails, ErrorLevel } from './error-types'

// 通知类型
export enum NotificationType {
  SUCCESS = 'success',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

// 通知配置
export interface NotificationConfig {
  type: NotificationType
  title?: string
  message: string
  duration?: number
  closable?: boolean
  showIcon?: boolean
  actions?: NotificationAction[]
}

// 通知操作
export interface NotificationAction {
  label: string
  action: () => void
  type?: 'primary' | 'secondary' | 'danger'
}

// 反馈配置
export interface FeedbackConfig {
  enableErrorReporting?: boolean
  enableUserFeedback?: boolean
  feedbackEndpoint?: string
  showSuggestions?: boolean
  autoRetry?: boolean
  maxAutoRetries?: number
}

// 用户反馈数据
export interface UserFeedback {
  type: 'bug' | 'suggestion' | 'complaint' | 'praise'
  message: string
  email?: string
  screenshot?: string
  context?: Record<string, any>
  timestamp: number
}

// 网络状态
export interface NetworkStatus {
  isOnline: boolean
  isSlowConnection: boolean
  lastOnlineTime?: number
}

export class UserFeedbackManager {
  private config: FeedbackConfig
  private networkStatus: NetworkStatus = { isOnline: true, isSlowConnection: false }
  private notificationQueue: NotificationConfig[] = []
  private retryQueue: Array<{ operation: () => Promise<any>, retries: number }> = []

  constructor(config: FeedbackConfig = {}) {
    this.config = {
      enableErrorReporting: true,
      enableUserFeedback: true,
      showSuggestions: true,
      autoRetry: true,
      maxAutoRetries: 3,
      ...config
    }

    this.setupNetworkMonitoring()
    this.setupOfflineSupport()
  }

  /**
   * 显示成功消息
   */
  showSuccess(message: string, options: Partial<NotificationConfig> = {}): void {
    this.showNotification({
      type: NotificationType.SUCCESS,
      message,
      duration: 3000,
      showIcon: true,
      ...options
    })
  }

  /**
   * 显示信息消息
   */
  showInfo(message: string, options: Partial<NotificationConfig> = {}): void {
    this.showNotification({
      type: NotificationType.INFO,
      message,
      duration: 4000,
      showIcon: true,
      ...options
    })
  }

  /**
   * 显示警告消息
   */
  showWarning(message: string, options: Partial<NotificationConfig> = {}): void {
    this.showNotification({
      type: NotificationType.WARNING,
      message,
      duration: 5000,
      showIcon: true,
      closable: true,
      ...options
    })
  }

  /**
   * 显示错误消息
   */
  showError(message: string, options: Partial<NotificationConfig> = {}): void {
    this.showNotification({
      type: NotificationType.ERROR,
      message,
      duration: 0, // 错误消息不自动关闭
      showIcon: true,
      closable: true,
      ...options
    })
  }

  /**
   * 处理错误并显示用户友好的消息
   */
  handleError(error: ErrorDetails): void {
    const actions: NotificationAction[] = []

    // 添加重试操作（如果错误可重试）
    if (error.retryable && this.config.autoRetry) {
      actions.push({
        label: '重试',
        action: () => this.retryLastOperation(),
        type: 'primary'
      })
    }

    // 添加反馈操作
    if (this.config.enableUserFeedback) {
      actions.push({
        label: '反馈问题',
        action: () => this.showFeedbackDialog(error),
        type: 'secondary'
      })
    }

    // 根据错误级别选择通知类型
    let notificationType: NotificationType
    switch (error.level) {
      case ErrorLevel.INFO:
        notificationType = NotificationType.INFO
        break
      case ErrorLevel.WARNING:
        notificationType = NotificationType.WARNING
        break
      case ErrorLevel.ERROR:
      case ErrorLevel.CRITICAL:
        notificationType = NotificationType.ERROR
        break
      default:
        notificationType = NotificationType.ERROR
    }

    // 构建消息内容
    let message = error.userMessage || error.message

    // 添加建议（如果启用）
    if (this.config.showSuggestions && error.suggestions && error.suggestions.length > 0) {
      message += '\n\n建议：\n' + error.suggestions.map(s => `• ${s}`).join('\n')
    }

    this.showNotification({
      type: notificationType,
      title: this.getErrorTitle(error),
      message,
      actions,
      closable: true,
      duration: notificationType === NotificationType.ERROR ? 0 : 5000
    })
  }

  /**
   * 显示网络状态消息
   */
  handleNetworkStatus(isOnline: boolean): void {
    if (!isOnline) {
      this.showWarning('网络连接已断开，部分功能可能无法使用', {
        title: '网络状态',
        duration: 0,
        actions: [
          {
            label: '重新连接',
            action: () => this.checkNetworkConnection(),
            type: 'primary'
          }
        ]
      })
    } else if (this.networkStatus.lastOnlineTime) {
      this.showSuccess('网络连接已恢复', {
        title: '网络状态',
        duration: 3000
      })
      
      // 重试队列中的操作
      this.processRetryQueue()
    }

    this.networkStatus.isOnline = isOnline
    if (isOnline) {
      this.networkStatus.lastOnlineTime = Date.now()
    }
  }

  /**
   * 显示加载状态
   */
  showLoading(message: string = '加载中...'): () => void {
    const notification = this.showNotification({
      type: NotificationType.INFO,
      message,
      duration: 0,
      closable: false,
      showIcon: true
    })

    // 返回关闭函数
    return () => {
      this.hideNotification(notification)
    }
  }

  /**
   * 收集用户反馈
   */
  async submitFeedback(feedback: UserFeedback): Promise<void> {
    if (!this.config.enableUserFeedback || !this.config.feedbackEndpoint) {
      throw new Error('User feedback is not enabled or endpoint not configured')
    }

    try {
      const response = await fetch(this.config.feedbackEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...feedback,
          timestamp: Date.now(),
          userAgent: navigator?.userAgent,
          url: window?.location?.href
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to submit feedback: ${response.statusText}`)
      }

      this.showSuccess('感谢您的反馈！我们会认真处理您的建议。')
    } catch (error) {
      this.showError('反馈提交失败，请稍后重试')
      throw error
    }
  }

  /**
   * 显示通知
   */
  private showNotification(config: NotificationConfig): string {
    const id = this.generateNotificationId()
    
    // 如果是离线状态，将通知加入队列
    if (!this.networkStatus.isOnline && config.type === NotificationType.ERROR) {
      this.notificationQueue.push(config)
      return id
    }

    // 这里应该调用实际的 UI 通知组件
    // 例如 Ant Design 的 notification 或自定义通知组件
    this.displayNotification(id, config)
    
    return id
  }

  /**
   * 隐藏通知
   */
  private hideNotification(id: string): void {
    // 这里应该调用实际的 UI 组件来隐藏通知
    console.log(`Hide notification: ${id}`)
  }

  /**
   * 显示实际的通知 UI
   */
  private displayNotification(id: string, config: NotificationConfig): void {
    // 这里应该集成实际的 UI 框架
    // 例如：
    // import { notification } from 'antd'
    // notification[config.type]({
    //   message: config.title,
    //   description: config.message,
    //   duration: config.duration,
    //   closable: config.closable
    // })

    console.log(`Display notification [${config.type}]:`, config.message)
  }

  /**
   * 生成通知 ID
   */
  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取错误标题
   */
  private getErrorTitle(error: ErrorDetails): string {
    switch (error.category) {
      case 'network':
        return '网络错误'
      case 'authentication':
        return '认证错误'
      case 'authorization':
        return '权限错误'
      case 'validation':
        return '输入错误'
      case 'business':
        return '操作失败'
      case 'system':
        return '系统错误'
      default:
        return '错误'
    }
  }

  /**
   * 显示反馈对话框
   */
  private showFeedbackDialog(error?: ErrorDetails): void {
    // 这里应该显示反馈对话框 UI
    console.log('Show feedback dialog for error:', error)
  }

  /**
   * 重试最后一次操作
   */
  private retryLastOperation(): void {
    // 这里应该重试最后一次失败的操作
    console.log('Retry last operation')
  }

  /**
   * 检查网络连接
   */
  private async checkNetworkConnection(): Promise<void> {
    try {
      const response = await fetch('/api/v1/auth/health', {
        method: 'GET',
        cache: 'no-cache'
      })
      
      this.handleNetworkStatus(response.ok)
    } catch (error) {
      this.handleNetworkStatus(false)
    }
  }

  /**
   * 设置网络监听
   */
  private setupNetworkMonitoring(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.handleNetworkStatus(true)
      })

      window.addEventListener('offline', () => {
        this.handleNetworkStatus(false)
      })

      // 检测慢速连接
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        if (connection) {
          const updateConnectionStatus = () => {
            this.networkStatus.isSlowConnection = 
              connection.effectiveType === 'slow-2g' || 
              connection.effectiveType === '2g'
          }

          connection.addEventListener('change', updateConnectionStatus)
          updateConnectionStatus()
        }
      }
    }
  }

  /**
   * 设置离线支持
   */
  private setupOfflineSupport(): void {
    // 处理离线时的通知队列
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.processNotificationQueue()
      })
    }
  }

  /**
   * 处理通知队列
   */
  private processNotificationQueue(): void {
    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift()!
      this.showNotification(notification)
    }
  }

  /**
   * 处理重试队列
   */
  private async processRetryQueue(): Promise<void> {
    const queue = [...this.retryQueue]
    this.retryQueue = []

    for (const item of queue) {
      try {
        await item.operation()
      } catch (error) {
        if (item.retries < this.config.maxAutoRetries!) {
          this.retryQueue.push({
            operation: item.operation,
            retries: item.retries + 1
          })
        }
      }
    }
  }

  /**
   * 添加操作到重试队列
   */
  addToRetryQueue(operation: () => Promise<any>): void {
    this.retryQueue.push({
      operation,
      retries: 0
    })
  }

  /**
   * 获取网络状态
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus }
  }
}