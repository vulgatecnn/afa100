/**
 * 错误类型定义
 * 定义系统中各种错误类型和错误码
 */

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

// 系统错误码
export enum SystemErrorCode {
  // 网络错误 (1xxx)
  NETWORK_ERROR = 1001,
  TIMEOUT_ERROR = 1002,
  CONNECTION_REFUSED = 1003,
  DNS_ERROR = 1004,

  // 认证错误 (2xxx)
  INVALID_CREDENTIALS = 2001,
  TOKEN_EXPIRED = 2002,
  TOKEN_INVALID = 2003,
  LOGIN_REQUIRED = 2004,
  ACCOUNT_LOCKED = 2005,
  ACCOUNT_DISABLED = 2006,

  // 授权错误 (3xxx)
  PERMISSION_DENIED = 3001,
  INSUFFICIENT_PRIVILEGES = 3002,
  RESOURCE_ACCESS_DENIED = 3003,
  OPERATION_NOT_ALLOWED = 3004,

  // 验证错误 (4xxx)
  INVALID_INPUT = 4001,
  MISSING_REQUIRED_FIELD = 4002,
  INVALID_FORMAT = 4003,
  VALUE_OUT_OF_RANGE = 4004,
  DUPLICATE_VALUE = 4005,

  // 业务错误 (5xxx)
  RESOURCE_NOT_FOUND = 5001,
  RESOURCE_ALREADY_EXISTS = 5002,
  OPERATION_FAILED = 5003,
  BUSINESS_RULE_VIOLATION = 5004,
  QUOTA_EXCEEDED = 5005,

  // 系统错误 (6xxx)
  INTERNAL_SERVER_ERROR = 6001,
  DATABASE_ERROR = 6002,
  SERVICE_UNAVAILABLE = 6003,
  CONFIGURATION_ERROR = 6004,
  EXTERNAL_SERVICE_ERROR = 6005,

  // 未知错误 (9xxx)
  UNKNOWN_ERROR = 9001
}

// 错误详情接口
export interface ErrorDetails {
  code: SystemErrorCode
  message: string
  category: ErrorCategory
  level: ErrorLevel
  timestamp: number
  context?: Record<string, any>
  stack?: string
  userMessage?: string
  suggestions?: string[]
  retryable?: boolean
  reportable?: boolean
}

// 用户友好的错误消息映射
export const ERROR_MESSAGES: Record<SystemErrorCode, {
  technical: string
  user: string
  suggestions?: string[]
}> = {
  // 网络错误
  [SystemErrorCode.NETWORK_ERROR]: {
    technical: 'Network connection failed',
    user: '网络连接失败，请检查网络设置',
    suggestions: ['检查网络连接', '稍后重试', '联系网络管理员']
  },
  [SystemErrorCode.TIMEOUT_ERROR]: {
    technical: 'Request timeout',
    user: '请求超时，请稍后重试',
    suggestions: ['稍后重试', '检查网络速度']
  },
  [SystemErrorCode.CONNECTION_REFUSED]: {
    technical: 'Connection refused by server',
    user: '服务器连接被拒绝',
    suggestions: ['稍后重试', '联系技术支持']
  },
  [SystemErrorCode.DNS_ERROR]: {
    technical: 'DNS resolution failed',
    user: '域名解析失败',
    suggestions: ['检查网络设置', '联系网络管理员']
  },

  // 认证错误
  [SystemErrorCode.INVALID_CREDENTIALS]: {
    technical: 'Invalid username or password',
    user: '用户名或密码错误',
    suggestions: ['检查用户名和密码', '使用忘记密码功能']
  },
  [SystemErrorCode.TOKEN_EXPIRED]: {
    technical: 'Authentication token has expired',
    user: '登录已过期，请重新登录',
    suggestions: ['重新登录']
  },
  [SystemErrorCode.TOKEN_INVALID]: {
    technical: 'Invalid authentication token',
    user: '登录信息无效，请重新登录',
    suggestions: ['重新登录']
  },
  [SystemErrorCode.LOGIN_REQUIRED]: {
    technical: 'Authentication required',
    user: '请先登录',
    suggestions: ['前往登录页面']
  },
  [SystemErrorCode.ACCOUNT_LOCKED]: {
    technical: 'User account is locked',
    user: '账户已被锁定',
    suggestions: ['联系管理员解锁账户']
  },
  [SystemErrorCode.ACCOUNT_DISABLED]: {
    technical: 'User account is disabled',
    user: '账户已被禁用',
    suggestions: ['联系管理员启用账户']
  },

  // 授权错误
  [SystemErrorCode.PERMISSION_DENIED]: {
    technical: 'Permission denied',
    user: '权限不足，无法执行此操作',
    suggestions: ['联系管理员获取权限']
  },
  [SystemErrorCode.INSUFFICIENT_PRIVILEGES]: {
    technical: 'Insufficient privileges',
    user: '权限不足',
    suggestions: ['联系管理员提升权限']
  },
  [SystemErrorCode.RESOURCE_ACCESS_DENIED]: {
    technical: 'Access to resource denied',
    user: '无权访问此资源',
    suggestions: ['联系管理员获取访问权限']
  },
  [SystemErrorCode.OPERATION_NOT_ALLOWED]: {
    technical: 'Operation not allowed',
    user: '不允许执行此操作',
    suggestions: ['检查操作权限', '联系管理员']
  },

  // 验证错误
  [SystemErrorCode.INVALID_INPUT]: {
    technical: 'Invalid input data',
    user: '输入数据格式不正确',
    suggestions: ['检查输入格式', '参考输入示例']
  },
  [SystemErrorCode.MISSING_REQUIRED_FIELD]: {
    technical: 'Required field is missing',
    user: '缺少必填字段',
    suggestions: ['填写所有必填字段']
  },
  [SystemErrorCode.INVALID_FORMAT]: {
    technical: 'Invalid data format',
    user: '数据格式不正确',
    suggestions: ['检查数据格式', '参考格式要求']
  },
  [SystemErrorCode.VALUE_OUT_OF_RANGE]: {
    technical: 'Value is out of allowed range',
    user: '数值超出允许范围',
    suggestions: ['检查数值范围', '参考取值说明']
  },
  [SystemErrorCode.DUPLICATE_VALUE]: {
    technical: 'Duplicate value not allowed',
    user: '该值已存在，不允许重复',
    suggestions: ['使用不同的值', '检查是否已存在']
  },

  // 业务错误
  [SystemErrorCode.RESOURCE_NOT_FOUND]: {
    technical: 'Requested resource not found',
    user: '请求的资源不存在',
    suggestions: ['检查资源是否存在', '刷新页面重试']
  },
  [SystemErrorCode.RESOURCE_ALREADY_EXISTS]: {
    technical: 'Resource already exists',
    user: '资源已存在',
    suggestions: ['使用不同的名称', '检查是否重复创建']
  },
  [SystemErrorCode.OPERATION_FAILED]: {
    technical: 'Operation failed to complete',
    user: '操作执行失败',
    suggestions: ['稍后重试', '检查操作条件']
  },
  [SystemErrorCode.BUSINESS_RULE_VIOLATION]: {
    technical: 'Business rule violation',
    user: '违反业务规则',
    suggestions: ['检查业务规则', '联系管理员']
  },
  [SystemErrorCode.QUOTA_EXCEEDED]: {
    technical: 'Quota or limit exceeded',
    user: '超出配额或限制',
    suggestions: ['减少使用量', '联系管理员提升配额']
  },

  // 系统错误
  [SystemErrorCode.INTERNAL_SERVER_ERROR]: {
    technical: 'Internal server error',
    user: '服务器内部错误',
    suggestions: ['稍后重试', '联系技术支持']
  },
  [SystemErrorCode.DATABASE_ERROR]: {
    technical: 'Database operation failed',
    user: '数据库操作失败',
    suggestions: ['稍后重试', '联系技术支持']
  },
  [SystemErrorCode.SERVICE_UNAVAILABLE]: {
    technical: 'Service temporarily unavailable',
    user: '服务暂时不可用',
    suggestions: ['稍后重试', '查看服务状态']
  },
  [SystemErrorCode.CONFIGURATION_ERROR]: {
    technical: 'System configuration error',
    user: '系统配置错误',
    suggestions: ['联系技术支持']
  },
  [SystemErrorCode.EXTERNAL_SERVICE_ERROR]: {
    technical: 'External service error',
    user: '外部服务错误',
    suggestions: ['稍后重试', '联系技术支持']
  },

  // 未知错误
  [SystemErrorCode.UNKNOWN_ERROR]: {
    technical: 'Unknown error occurred',
    user: '发生未知错误',
    suggestions: ['稍后重试', '联系技术支持']
  }
}

// 错误分类映射
export const ERROR_CATEGORY_MAP: Record<SystemErrorCode, ErrorCategory> = {
  // 网络错误
  [SystemErrorCode.NETWORK_ERROR]: ErrorCategory.NETWORK,
  [SystemErrorCode.TIMEOUT_ERROR]: ErrorCategory.NETWORK,
  [SystemErrorCode.CONNECTION_REFUSED]: ErrorCategory.NETWORK,
  [SystemErrorCode.DNS_ERROR]: ErrorCategory.NETWORK,

  // 认证错误
  [SystemErrorCode.INVALID_CREDENTIALS]: ErrorCategory.AUTHENTICATION,
  [SystemErrorCode.TOKEN_EXPIRED]: ErrorCategory.AUTHENTICATION,
  [SystemErrorCode.TOKEN_INVALID]: ErrorCategory.AUTHENTICATION,
  [SystemErrorCode.LOGIN_REQUIRED]: ErrorCategory.AUTHENTICATION,
  [SystemErrorCode.ACCOUNT_LOCKED]: ErrorCategory.AUTHENTICATION,
  [SystemErrorCode.ACCOUNT_DISABLED]: ErrorCategory.AUTHENTICATION,

  // 授权错误
  [SystemErrorCode.PERMISSION_DENIED]: ErrorCategory.AUTHORIZATION,
  [SystemErrorCode.INSUFFICIENT_PRIVILEGES]: ErrorCategory.AUTHORIZATION,
  [SystemErrorCode.RESOURCE_ACCESS_DENIED]: ErrorCategory.AUTHORIZATION,
  [SystemErrorCode.OPERATION_NOT_ALLOWED]: ErrorCategory.AUTHORIZATION,

  // 验证错误
  [SystemErrorCode.INVALID_INPUT]: ErrorCategory.VALIDATION,
  [SystemErrorCode.MISSING_REQUIRED_FIELD]: ErrorCategory.VALIDATION,
  [SystemErrorCode.INVALID_FORMAT]: ErrorCategory.VALIDATION,
  [SystemErrorCode.VALUE_OUT_OF_RANGE]: ErrorCategory.VALIDATION,
  [SystemErrorCode.DUPLICATE_VALUE]: ErrorCategory.VALIDATION,

  // 业务错误
  [SystemErrorCode.RESOURCE_NOT_FOUND]: ErrorCategory.BUSINESS,
  [SystemErrorCode.RESOURCE_ALREADY_EXISTS]: ErrorCategory.BUSINESS,
  [SystemErrorCode.OPERATION_FAILED]: ErrorCategory.BUSINESS,
  [SystemErrorCode.BUSINESS_RULE_VIOLATION]: ErrorCategory.BUSINESS,
  [SystemErrorCode.QUOTA_EXCEEDED]: ErrorCategory.BUSINESS,

  // 系统错误
  [SystemErrorCode.INTERNAL_SERVER_ERROR]: ErrorCategory.SYSTEM,
  [SystemErrorCode.DATABASE_ERROR]: ErrorCategory.SYSTEM,
  [SystemErrorCode.SERVICE_UNAVAILABLE]: ErrorCategory.SYSTEM,
  [SystemErrorCode.CONFIGURATION_ERROR]: ErrorCategory.SYSTEM,
  [SystemErrorCode.EXTERNAL_SERVICE_ERROR]: ErrorCategory.SYSTEM,

  // 未知错误
  [SystemErrorCode.UNKNOWN_ERROR]: ErrorCategory.UNKNOWN
}

// 错误级别映射
export const ERROR_LEVEL_MAP: Record<SystemErrorCode, ErrorLevel> = {
  // 网络错误 - 警告级别
  [SystemErrorCode.NETWORK_ERROR]: ErrorLevel.WARNING,
  [SystemErrorCode.TIMEOUT_ERROR]: ErrorLevel.WARNING,
  [SystemErrorCode.CONNECTION_REFUSED]: ErrorLevel.ERROR,
  [SystemErrorCode.DNS_ERROR]: ErrorLevel.ERROR,

  // 认证错误 - 信息/警告级别
  [SystemErrorCode.INVALID_CREDENTIALS]: ErrorLevel.INFO,
  [SystemErrorCode.TOKEN_EXPIRED]: ErrorLevel.INFO,
  [SystemErrorCode.TOKEN_INVALID]: ErrorLevel.WARNING,
  [SystemErrorCode.LOGIN_REQUIRED]: ErrorLevel.INFO,
  [SystemErrorCode.ACCOUNT_LOCKED]: ErrorLevel.WARNING,
  [SystemErrorCode.ACCOUNT_DISABLED]: ErrorLevel.WARNING,

  // 授权错误 - 警告级别
  [SystemErrorCode.PERMISSION_DENIED]: ErrorLevel.WARNING,
  [SystemErrorCode.INSUFFICIENT_PRIVILEGES]: ErrorLevel.WARNING,
  [SystemErrorCode.RESOURCE_ACCESS_DENIED]: ErrorLevel.WARNING,
  [SystemErrorCode.OPERATION_NOT_ALLOWED]: ErrorLevel.WARNING,

  // 验证错误 - 信息级别
  [SystemErrorCode.INVALID_INPUT]: ErrorLevel.INFO,
  [SystemErrorCode.MISSING_REQUIRED_FIELD]: ErrorLevel.INFO,
  [SystemErrorCode.INVALID_FORMAT]: ErrorLevel.INFO,
  [SystemErrorCode.VALUE_OUT_OF_RANGE]: ErrorLevel.INFO,
  [SystemErrorCode.DUPLICATE_VALUE]: ErrorLevel.INFO,

  // 业务错误 - 警告级别
  [SystemErrorCode.RESOURCE_NOT_FOUND]: ErrorLevel.WARNING,
  [SystemErrorCode.RESOURCE_ALREADY_EXISTS]: ErrorLevel.WARNING,
  [SystemErrorCode.OPERATION_FAILED]: ErrorLevel.WARNING,
  [SystemErrorCode.BUSINESS_RULE_VIOLATION]: ErrorLevel.WARNING,
  [SystemErrorCode.QUOTA_EXCEEDED]: ErrorLevel.WARNING,

  // 系统错误 - 错误/严重级别
  [SystemErrorCode.INTERNAL_SERVER_ERROR]: ErrorLevel.ERROR,
  [SystemErrorCode.DATABASE_ERROR]: ErrorLevel.CRITICAL,
  [SystemErrorCode.SERVICE_UNAVAILABLE]: ErrorLevel.ERROR,
  [SystemErrorCode.CONFIGURATION_ERROR]: ErrorLevel.CRITICAL,
  [SystemErrorCode.EXTERNAL_SERVICE_ERROR]: ErrorLevel.ERROR,

  // 未知错误 - 错误级别
  [SystemErrorCode.UNKNOWN_ERROR]: ErrorLevel.ERROR
}