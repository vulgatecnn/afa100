/**
 * 错误处理和用户反馈模块
 * 提供统一的错误处理、用户通知和网络监控功能
 */

export { ErrorHandler } from './error-handler'
export { UserFeedbackManager } from './user-feedback'
export { NetworkMonitor } from './network-monitor'

export type {
  ErrorDetails,
  ErrorHandlerConfig,
  ErrorContext
} from './error-handler'

export type {
  NotificationConfig,
  NotificationAction,
  FeedbackConfig,
  UserFeedback,
  NetworkStatus
} from './user-feedback'

export type {
  NetworkInfo,
  NetworkQuality,
  NetworkEvent
} from './network-monitor'

export {
  ErrorLevel,
  ErrorCategory,
  SystemErrorCode,
  NotificationType
} from './error-types'