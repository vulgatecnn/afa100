/**
 * 集成示例
 * 展示如何将 API 客户端、认证、错误处理和用户反馈系统集成使用
 */

import { createApiClient, ApiClient } from './api-client'
import { AuthService, UserRole, Permission } from './auth'
import { ErrorHandler, UserFeedbackManager, NetworkMonitor, SystemErrorCode } from './error-handling'
import { runApiTests } from './api-validation'

/**
 * 应用程序配置
 */
interface AppConfig {
  apiBaseURL: string
  enableErrorReporting?: boolean
  enableUserFeedback?: boolean
  feedbackEndpoint?: string
  errorReportingEndpoint?: string
}

/**
 * 集成的应用程序类
 */
export class IntegratedApp {
  private apiClient: ApiClient
  private authService: AuthService
  private errorHandler: ErrorHandler
  private feedbackManager: UserFeedbackManager
  private networkMonitor: NetworkMonitor
  private config: AppConfig

  constructor(config: AppConfig) {
    this.config = config

    // 初始化网络监控
    this.networkMonitor = new NetworkMonitor()

    // 初始化错误处理器
    this.errorHandler = new ErrorHandler({
      enableLogging: true,
      enableReporting: config.enableErrorReporting,
      reportingEndpoint: config.errorReportingEndpoint,
      logLevel: 'warning'
    })

    // 初始化用户反馈管理器
    this.feedbackManager = new UserFeedbackManager({
      enableErrorReporting: config.enableErrorReporting,
      enableUserFeedback: config.enableUserFeedback,
      feedbackEndpoint: config.feedbackEndpoint,
      showSuggestions: true,
      autoRetry: true
    })

    // 初始化 API 客户端
    this.apiClient = createApiClient({
      baseURL: config.apiBaseURL,
      timeout: 10000,
      retry: {
        retries: 3,
        retryDelay: 1000
      },
      interceptors: {
        onResponseError: (error) => {
          // 统一错误处理
          const errorDetails = this.errorHandler.handleError(error)
          this.feedbackManager.handleError(errorDetails)
          throw error
        }
      },
      onTokenExpired: () => {
        this.handleTokenExpired()
      },
      onNetworkError: (error) => {
        this.handleNetworkError(error)
      }
    })

    // 初始化认证服务
    this.authService = new AuthService(this.apiClient)

    // 设置事件监听
    this.setupEventListeners()
  }

  /**
   * 初始化应用程序
   */
  async initialize(): Promise<void> {
    try {
      this.feedbackManager.showInfo('正在初始化应用程序...')

      // 开始网络监控
      this.networkMonitor.startMonitoring()

      // 检查网络连接
      const isOnline = await this.networkMonitor.checkConnection()
      if (!isOnline) {
        this.feedbackManager.showWarning('网络连接异常，部分功能可能无法使用')
      }

      // 尝试恢复用户会话
      if (this.authService.isAuthenticated()) {
        try {
          await this.authService.getCurrentUserInfo()
          this.feedbackManager.showSuccess('欢迎回来！')
        } catch (error) {
          console.warn('Failed to restore user session:', error)
        }
      }

      this.feedbackManager.showSuccess('应用程序初始化完成')
    } catch (error) {
      this.errorHandler.handleError(error, {
        additionalData: { phase: 'initialization' }
      })
      throw error
    }
  }

  /**
   * 用户登录
   */
  async login(credentials: { phone: string; password: string }): Promise<void> {
    try {
      this.feedbackManager.showInfo('正在登录...')

      const response = await this.authService.login(credentials)
      
      this.feedbackManager.showSuccess(`欢迎，${response.user.name}！`)
    } catch (error) {
      // 错误已经在拦截器中处理
      throw error
    }
  }

  /**
   * 微信登录
   */
  async wechatLogin(code: string, userType: 'visitor' | 'employee'): Promise<void> {
    try {
      this.feedbackManager.showInfo('正在通过微信登录...')

      const response = await this.authService.wechatLogin({ code, userType })
      
      this.feedbackManager.showSuccess(`欢迎，${response.user.name}！`)
    } catch (error) {
      throw error
    }
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    try {
      await this.authService.logout()
      this.feedbackManager.showInfo('已安全退出')
    } catch (error) {
      // 即使登出失败也要清除本地状态
      console.error('Logout error:', error)
    }
  }

  /**
   * 检查权限
   */
  checkPermission(permission: Permission): boolean {
    return this.authService.hasPermission(permission)
  }

  /**
   * 检查角色
   */
  checkRole(role: UserRole): boolean {
    return this.authService.hasRole(role)
  }

  /**
   * 执行需要权限的操作
   */
  async executeWithPermission<T>(
    permission: Permission,
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<T> {
    if (!this.checkPermission(permission)) {
      const error = new Error(`权限不足：需要 ${permission} 权限`)
      this.errorHandler.handleError(error, {
        additionalData: { 
          permission, 
          operation: operationName,
          currentUser: this.authService.getCurrentUser()
        }
      })
      throw error
    }

    try {
      return await operation()
    } catch (error) {
      this.errorHandler.handleError(error, {
        additionalData: { 
          permission, 
          operation: operationName 
        }
      })
      throw error
    }
  }

  /**
   * 运行 API 连通性测试
   */
  async runConnectivityTest(): Promise<void> {
    try {
      this.feedbackManager.showInfo('正在测试 API 连通性...')

      const result = await runApiTests({
        baseURL: this.config.apiBaseURL,
        credentials: {
          phone: '13800138000',
          password: 'test123456'
        },
        skipAuthTests: !this.authService.isAuthenticated(),
        maxConcurrent: 3,
        retryCount: 1
      })

      const successRate = (result.summary.successfulTests / result.summary.totalTests * 100).toFixed(1)
      
      if (result.summary.successfulTests === result.summary.totalTests) {
        this.feedbackManager.showSuccess(`API 连通性测试通过 (${successRate}%)`)
      } else {
        this.feedbackManager.showWarning(
          `API 连通性测试部分失败 (${successRate}% 成功)`,
          {
            actions: [
              {
                label: '查看详情',
                action: () => console.log('Test results:', result)
              }
            ]
          }
        )
      }
    } catch (error) {
      this.feedbackManager.showError('API 连通性测试失败')
      throw error
    }
  }

  /**
   * 提交用户反馈
   */
  async submitFeedback(feedback: {
    type: 'bug' | 'suggestion' | 'complaint' | 'praise'
    message: string
    email?: string
  }): Promise<void> {
    try {
      await this.feedbackManager.submitFeedback({
        ...feedback,
        timestamp: Date.now(),
        context: {
          user: this.authService.getCurrentUser(),
          networkQuality: this.networkMonitor.getNetworkQuality(),
          userAgent: navigator.userAgent,
          url: window.location.href
        }
      })
    } catch (error) {
      throw error
    }
  }

  /**
   * 获取应用状态
   */
  getAppStatus() {
    return {
      isAuthenticated: this.authService.isAuthenticated(),
      currentUser: this.authService.getCurrentUser(),
      networkInfo: this.networkMonitor.getNetworkInfo(),
      networkQuality: this.networkMonitor.getNetworkQuality(),
      authState: this.authService.getAuthState()
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 网络状态变化监听
    this.networkMonitor.addEventListener((event) => {
      switch (event.type) {
        case 'online':
          this.feedbackManager.handleNetworkStatus(true)
          break
        case 'offline':
          this.feedbackManager.handleNetworkStatus(false)
          break
        case 'slow':
          this.feedbackManager.showWarning('网络速度较慢，可能影响使用体验')
          break
        case 'unstable':
          this.feedbackManager.showWarning('网络连接不稳定')
          break
      }
    })

    // 认证事件监听
    this.authService.addEventListener('token_expired', () => {
      this.handleTokenExpired()
    })

    this.authService.addEventListener('login_success', (event) => {
      console.log('User logged in:', event.payload.user)
    })

    this.authService.addEventListener('logout', () => {
      console.log('User logged out')
    })

    // 错误监听
    this.errorHandler.addErrorListener((error) => {
      // 记录关键错误到分析系统
      if (error.level === 'critical' || error.level === 'error') {
        console.error('Critical error occurred:', error)
      }
    })
  }

  /**
   * 处理 Token 过期
   */
  private handleTokenExpired(): void {
    this.feedbackManager.showWarning('登录已过期，请重新登录', {
      actions: [
        {
          label: '重新登录',
          action: () => {
            // 跳转到登录页面
            window.location.href = '/login'
          },
          type: 'primary'
        }
      ]
    })
  }

  /**
   * 处理网络错误
   */
  private handleNetworkError(error: any): void {
    const networkSuggestions = this.networkMonitor.getNetworkSuggestions()
    
    this.feedbackManager.showError('网络连接失败', {
      actions: [
        {
          label: '重试',
          action: () => {
            this.networkMonitor.checkConnection()
          },
          type: 'primary'
        },
        {
          label: '网络诊断',
          action: () => {
            console.log('Network suggestions:', networkSuggestions)
          }
        }
      ]
    })
  }

  /**
   * 销毁应用程序
   */
  destroy(): void {
    this.networkMonitor.destroy()
  }
}

/**
 * 创建应用程序实例
 */
export function createApp(config: AppConfig): IntegratedApp {
  return new IntegratedApp(config)
}

/**
 * 使用示例
 */
export async function exampleUsage() {
  // 创建应用程序
  const app = createApp({
    apiBaseURL: 'http://localhost:3000/api/v1',
    enableErrorReporting: true,
    enableUserFeedback: true,
    feedbackEndpoint: '/api/v1/feedback',
    errorReportingEndpoint: '/api/v1/errors'
  })

  try {
    // 初始化应用程序
    await app.initialize()

    // 用户登录
    await app.login({
      phone: '13800138000',
      password: 'password123'
    })

    // 检查权限并执行操作
    await app.executeWithPermission(
      Permission.MANAGE_MERCHANTS,
      async () => {
        // 执行需要权限的操作
        console.log('Creating merchant...')
      },
      '创建商户'
    )

    // 运行连通性测试
    await app.runConnectivityTest()

    // 获取应用状态
    const status = app.getAppStatus()
    console.log('App status:', status)

  } catch (error) {
    console.error('Application error:', error)
  }
}