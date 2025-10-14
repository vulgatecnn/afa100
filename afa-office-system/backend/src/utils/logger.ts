/**
 * 日志工具类
 * 提供统一的日志记录功能
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: any;
  error?: Error;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
  maxFileSize?: number;
  maxFiles?: number;
}

/**
 * 日志记录器类
 */
export class Logger {
  private config: LoggerConfig;
  private static instance: Logger;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      ...config
    };
  }

  /**
   * 获取单例实例
   */
  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * 记录错误日志
   */
  error(message: string, error?: Error, context?: any): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * 记录警告日志
   */
  warn(message: string, context?: any): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * 记录信息日志
   */
  info(message: string, context?: any): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * 记录调试日志
   */
  debug(message: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * 核心日志记录方法
   */
  private log(level: LogLevel, message: string, context?: any, error?: Error): void {
    if (level > this.config.level) {
      return;
    }

    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error
    } as LogEntry;

    if (this.config.enableConsole) {
      this.logToConsole(logEntry);
    }

    if (this.config.enableFile && this.config.filePath) {
      this.logToFile(logEntry);
    }
  }

  /**
   * 输出到控制台
   */
  private logToConsole(entry: LogEntry): void {
    const { level, message, timestamp, context, error } = entry;
    const levelName = LogLevel[level];
    const prefix = `[${timestamp}] [${levelName}]`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(`❌ ${prefix}`, message);
        if (error) {
          console.error('Error details:', error);
        }
        if (context) {
          console.error('Context:', context);
        }
        break;
      case LogLevel.WARN:
        console.warn(`⚠️ ${prefix}`, message);
        if (context) {
          console.warn('Context:', context);
        }
        break;
      case LogLevel.INFO:
        console.info(`ℹ️ ${prefix}`, message);
        if (context) {
          console.info('Context:', context);
        }
        break;
      case LogLevel.DEBUG:
        console.debug(`🐛 ${prefix}`, message);
        if (context) {
          console.debug('Context:', context);
        }
        break;
    }
  }

  /**
   * 输出到文件
   */
  private logToFile(entry: LogEntry): void {
    // 文件日志功能可以在需要时实现
    // 这里只是预留接口
    const logLine = JSON.stringify(entry) + '\n';
    // TODO: 实现文件写入逻辑
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * 获取当前配置
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// 创建默认日志实例
const defaultLogger = Logger.getInstance({
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
  enableFile: false
});

// 导出便捷方法
export const logger = {
  error: (message: string, error?: Error, context?: any) => defaultLogger.error(message, error, context),
  warn: (message: string, context?: any) => defaultLogger.warn(message, context),
  info: (message: string, context?: any) => defaultLogger.info(message, context),
  debug: (message: string, context?: any) => defaultLogger.debug(message, context),
  setLevel: (level: LogLevel) => defaultLogger.setLevel(level),
  getConfig: () => defaultLogger.getConfig()
};

// 导出类型
export type LoggerInstance = typeof logger;