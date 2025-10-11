/**
 * 统一的测试错误处理机制
 */

/**
 * 测试错误类型
 */
export enum TestErrorType {
  SETUP_FAILURE = 'setup_failure',
  ASSERTION_FAILURE = 'assertion_failure',
  TIMEOUT = 'timeout',
  MOCK_FAILURE = 'mock_failure',
  NETWORK_ERROR = 'network_error',
  DATABASE_ERROR = 'database_error',
  API_ERROR = 'api_error',
  VALIDATION_ERROR = 'validation_error',
  MYSQL_CONNECTION_ERROR = 'mysql_connection_error',
  MYSQL_QUERY_ERROR = 'mysql_query_error',
  MYSQL_TRANSACTION_ERROR = 'mysql_transaction_error',
  MYSQL_CONSTRAINT_ERROR = 'mysql_constraint_error'
}

/**
 * 测试上下文信息
 */
export interface TestContext {
  testName: string
  testFile: string
  platform: 'backend' | 'frontend' | 'miniprogram'
  category: 'unit' | 'integration' | 'e2e'
  timestamp: string
  metadata?: Record<string, any>
}

/**
 * 测试错误类
 */
export class TestError extends Error {
  public readonly type: TestErrorType
  public readonly context: TestContext
  public readonly originalError?: Error

  constructor(
    message: string,
    type: TestErrorType,
    context: TestContext,
    originalError?: Error
  ) {
    super(message)
    this.name = 'TestError'
    this.type = type
    this.context = context
    this.originalError = originalError
    
    // 保持错误堆栈
    if (originalError && originalError.stack) {
      this.stack = originalError.stack
    }
  }
}

/**
 * 测试错误处理器
 */
export class TestErrorHandler {
  private static errorLog: TestError[] = []
  private static maxLogSize = 100

  /**
   * 处理测试错误
   */
  static handle(error: Error, context: TestContext): void {
    let testError: TestError

    if (error instanceof TestError) {
      testError = error
    } else {
      // 根据错误信息推断错误类型
      const errorType = this.inferErrorType(error)
      testError = new TestError(error.message, errorType, context, error)
    }

    // 记录错误
    this.logError(testError)

    // 根据错误类型进行不同处理
    this.processError(testError)
  }

  /**
   * 推断错误类型 - 增加MySQL错误识别
   */
  private static inferErrorType(error: Error): TestErrorType {
    const message = error.message.toLowerCase()
    const errorCode = (error as any).code

    // MySQL特定错误识别
    if (errorCode === 'ECONNREFUSED' || errorCode === 'ER_ACCESS_DENIED_ERROR' || 
        message.includes('mysql') && (message.includes('connection') || message.includes('连接'))) {
      return TestErrorType.MYSQL_CONNECTION_ERROR
    }
    if (errorCode === 'ER_BAD_FIELD_ERROR' || errorCode === 'ER_NO_SUCH_TABLE' || 
        errorCode === 'ER_PARSE_ERROR' || message.includes('mysql') && message.includes('query')) {
      return TestErrorType.MYSQL_QUERY_ERROR
    }
    if (errorCode === 'ER_LOCK_DEADLOCK' || errorCode === 'ER_LOCK_WAIT_TIMEOUT' || 
        message.includes('transaction') || message.includes('事务')) {
      return TestErrorType.MYSQL_TRANSACTION_ERROR
    }
    if (errorCode === 'ER_DUP_ENTRY' || errorCode === 'ER_NO_REFERENCED_ROW' || 
        errorCode === 'ER_ROW_IS_REFERENCED' || message.includes('constraint') || message.includes('约束')) {
      return TestErrorType.MYSQL_CONSTRAINT_ERROR
    }

    // 通用错误识别
    if (message.includes('timeout') || message.includes('超时')) {
      return TestErrorType.TIMEOUT
    }
    if (message.includes('network') || message.includes('网络')) {
      return TestErrorType.NETWORK_ERROR
    }
    if (message.includes('database') || message.includes('数据库')) {
      return TestErrorType.DATABASE_ERROR
    }
    if (message.includes('mock') || message.includes('模拟')) {
      return TestErrorType.MOCK_FAILURE
    }
    if (message.includes('validation') || message.includes('验证')) {
      return TestErrorType.VALIDATION_ERROR
    }
    if (message.includes('api') || message.includes('接口')) {
      return TestErrorType.API_ERROR
    }
    if (message.includes('setup') || message.includes('初始化')) {
      return TestErrorType.SETUP_FAILURE
    }

    return TestErrorType.ASSERTION_FAILURE
  }

  /**
   * 记录错误
   */
  private static logError(error: TestError): void {
    // 添加到错误日志
    this.errorLog.push(error)

    // 保持日志大小限制
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift()
    }

    // 输出错误信息
    console.error(`[${error.context.platform}] 测试错误:`, {
      type: error.type,
      message: error.message,
      testName: error.context.testName,
      testFile: error.context.testFile,
      category: error.context.category,
      timestamp: error.context.timestamp,
      stack: error.stack
    })
  }

  /**
   * 处理特定类型的错误 - 增加MySQL错误处理
   */
  private static processError(error: TestError): void {
    switch (error.type) {
      case TestErrorType.SETUP_FAILURE:
        this.handleSetupFailure(error)
        break
      case TestErrorType.TIMEOUT:
        this.handleTimeout(error)
        break
      case TestErrorType.NETWORK_ERROR:
        this.handleNetworkError(error)
        break
      case TestErrorType.DATABASE_ERROR:
        this.handleDatabaseError(error)
        break
      case TestErrorType.MOCK_FAILURE:
        this.handleMockFailure(error)
        break
      case TestErrorType.MYSQL_CONNECTION_ERROR:
        this.handleMySQLConnectionError(error)
        break
      case TestErrorType.MYSQL_QUERY_ERROR:
        this.handleMySQLQueryError(error)
        break
      case TestErrorType.MYSQL_TRANSACTION_ERROR:
        this.handleMySQLTransactionError(error)
        break
      case TestErrorType.MYSQL_CONSTRAINT_ERROR:
        this.handleMySQLConstraintError(error)
        break
      default:
        this.handleGenericError(error)
    }
  }

  /**
   * 处理设置失败
   */
  private static handleSetupFailure(error: TestError): void {
    console.warn('测试环境设置失败，建议检查:', {
      message: '测试环境配置可能有问题',
      suggestions: [
        '检查测试数据库连接',
        '验证Mock配置',
        '确认测试依赖安装'
      ]
    })
  }

  /**
   * 处理超时错误
   */
  private static handleTimeout(error: TestError): void {
    console.warn('测试超时，建议:', {
      message: '测试执行时间过长',
      suggestions: [
        '增加测试超时时间',
        '优化测试逻辑',
        '检查异步操作'
      ]
    })
  }

  /**
   * 处理网络错误
   */
  private static handleNetworkError(error: TestError): void {
    console.warn('网络错误，建议:', {
      message: 'API调用或网络请求失败',
      suggestions: [
        '检查Mock服务配置',
        '验证API端点',
        '确认网络连接'
      ]
    })
  }

  /**
   * 处理数据库错误
   */
  private static handleDatabaseError(error: TestError): void {
    console.warn('数据库错误，建议:', {
      message: '数据库操作失败',
      suggestions: [
        '检查数据库连接',
        '验证SQL语句',
        '确认测试数据'
      ]
    })
  }

  /**
   * 处理Mock失败
   */
  private static handleMockFailure(error: TestError): void {
    console.warn('Mock失败，建议:', {
      message: 'Mock配置或调用失败',
      suggestions: [
        '检查Mock配置',
        '验证Mock数据',
        '确认Mock调用方式'
      ]
    })
  }

  /**
   * 处理MySQL连接错误
   */
  private static handleMySQLConnectionError(error: TestError): void {
    console.warn('MySQL连接错误，建议:', {
      message: 'MySQL数据库连接失败',
      suggestions: [
        '检查MySQL服务是否运行',
        '验证数据库连接配置',
        '确认用户名和密码正确',
        '检查网络连接和防火墙设置'
      ]
    })
  }

  /**
   * 处理MySQL查询错误
   */
  private static handleMySQLQueryError(error: TestError): void {
    console.warn('MySQL查询错误，建议:', {
      message: 'MySQL查询执行失败',
      suggestions: [
        '检查SQL语法是否正确',
        '验证表名和字段名',
        '确认数据库schema是否最新',
        '检查查询参数类型'
      ]
    })
  }

  /**
   * 处理MySQL事务错误
   */
  private static handleMySQLTransactionError(error: TestError): void {
    console.warn('MySQL事务错误，建议:', {
      message: 'MySQL事务处理失败',
      suggestions: [
        '检查是否存在死锁',
        '优化事务执行时间',
        '确认事务隔离级别',
        '检查锁等待超时设置'
      ]
    })
  }

  /**
   * 处理MySQL约束错误
   */
  private static handleMySQLConstraintError(error: TestError): void {
    console.warn('MySQL约束错误，建议:', {
      message: 'MySQL数据约束违反',
      suggestions: [
        '检查唯一键约束',
        '验证外键关系',
        '确认数据完整性',
        '检查测试数据是否冲突'
      ]
    })
  }

  /**
   * 处理通用错误
   */
  private static handleGenericError(error: TestError): void {
    console.warn('测试失败:', {
      message: error.message,
      type: error.type,
      context: error.context
    })
  }

  /**
   * 获取错误统计
   */
  static getErrorStats(): Record<TestErrorType, number> {
    const stats: Record<TestErrorType, number> = {} as any

    // 初始化统计
    Object.values(TestErrorType).forEach(type => {
      stats[type] = 0
    })

    // 统计错误
    this.errorLog.forEach(error => {
      stats[error.type]++
    })

    return stats
  }

  /**
   * 获取平台错误统计
   */
  static getPlatformErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {
      backend: 0,
      frontend: 0,
      miniprogram: 0
    }

    this.errorLog.forEach(error => {
      stats[error.context.platform]++
    })

    return stats
  }

  /**
   * 清理错误日志
   */
  static clearErrorLog(): void {
    this.errorLog = []
  }

  /**
   * 获取最近的错误
   */
  static getRecentErrors(count = 10): TestError[] {
    return this.errorLog.slice(-count)
  }

  /**
   * 生成错误报告
   */
  static generateErrorReport(): string {
    const errorStats = this.getErrorStats()
    const platformStats = this.getPlatformErrorStats()
    const recentErrors = this.getRecentErrors(5)

    let report = '# 测试错误报告\n\n'
    
    report += '## 错误类型统计\n'
    Object.entries(errorStats).forEach(([type, count]) => {
      if (count > 0) {
        report += `- ${type}: ${count}次\n`
      }
    })
    
    report += '\n## 平台错误统计\n'
    Object.entries(platformStats).forEach(([platform, count]) => {
      if (count > 0) {
        report += `- ${platform}: ${count}次\n`
      }
    })
    
    if (recentErrors.length > 0) {
      report += '\n## 最近错误\n'
      recentErrors.forEach((error, index) => {
        report += `${index + 1}. [${error.context.platform}] ${error.type}: ${error.message}\n`
        report += `   测试: ${error.context.testName}\n`
        report += `   时间: ${error.context.timestamp}\n\n`
      })
    }

    return report
  }
}

/**
 * 创建测试上下文
 */
export function createTestContext(
  testName: string,
  testFile: string,
  platform: 'backend' | 'frontend' | 'miniprogram',
  category: 'unit' | 'integration' | 'e2e',
  metadata?: Record<string, any>
): TestContext {
  return {
    testName,
    testFile,
    platform,
    category,
    timestamp: new Date().toISOString(),
    metadata
  }
}

/**
 * 测试错误装饰器
 */
export function withErrorHandling(
  context: TestContext
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args)
      } catch (error) {
        TestErrorHandler.handle(error as Error, context)
        throw error
      }
    }

    return descriptor
  }
}

/**
 * 异步错误捕获工具
 */
export async function catchTestError<T>(
  operation: () => Promise<T>,
  context: TestContext
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    TestErrorHandler.handle(error as Error, context)
    throw error
  }
}

/**
 * 同步错误捕获工具
 */
export function catchTestErrorSync<T>(
  operation: () => T,
  context: TestContext
): T {
  try {
    return operation()
  } catch (error) {
    TestErrorHandler.handle(error as Error, context)
    throw error
  }
}

// All classes and types are already exported inline above