// 工具类型统一导出文件
// 导出所有工具函数和相关类型

// 数据库相关工具
export { Database } from './database.js';
export type { DatabaseAdapter } from './database-adapter.js';
export { DatabaseAdapterFactory } from './database-adapter-factory.js';
export { MySQLAdapter } from './mysql-adapter.js';
export { MySQLConnectionManager } from './mysql-connection-manager.js';
export { MySQLConnectionPool } from './mysql-connection-pool.js';
export { MySQLConnectionMonitor } from './mysql-connection-monitor.js';
export { MySQLDatabaseInitializer } from './mysql-database-initializer.js';
export { MySQLInitializationManager } from './mysql-initialization-manager.js';
export { MySQLSchemaInitializer } from './mysql-schema-initializer.js';
export { MySQLUserManager } from './mysql-user-manager.js';
export { MySQLAccountSetup } from './mysql-account-setup.js';

// JWT工具
export { JwtUtils } from './jwt.js';

// 微信相关工具
export { WechatUtils } from './wechat.js';

// 二维码工具
export { QRCodeUtils } from './qrcode.js';

// 管理工具
export { RetryManager } from './retry-manager.js';
export { TransactionManager } from './transaction-manager.js';

// 核心工具
export { Logger, LogLevel, logger } from './logger.js';
export { Validator, ValidationRules, validator } from './validator.js';
export { AuthUtils, authUtils } from './auth.js';

// 导出工具相关的类型
export type {
  DatabaseType,
  DatabaseResult,
  EnvConfig,
  JwtPayload,
  UserContext,
  WechatUserInfo,
  WechatLoginCode,
  UploadedFile,
  PaginationQuery,
  PaginatedResponse,
  ApiResponse,
  ErrorResponse
} from '../types/index.js';

// 导出中间件工具类型
export type {
  AuthenticatedRequest
} from '../middleware/index.js';

// 导出工具类型
export type {
  LogEntry,
  LoggerConfig,
  LoggerInstance
} from './logger.js';
export type { 
  ValidationResult, 
  ValidationError, 
  ValidatorConfig, 
  ValidatorInstance 
} from './validator.js';
export type { 
  PasswordHashOptions, 
  TokenGenerationOptions, 
  PermissionCheckOptions, 
  AuthUtilsInstance 
} from './auth.js';

// 导出扩展的工具函数类型
export type {
  JwtUtilsInstance,
  WechatUtilsInstance,
  QRCodeUtilsInstance,
  DatabaseUtilsInstance,
  FileUtilsInstance,
  CacheUtilsInstance,
  EmailUtilsInstance,
  SmsUtilsInstance,
  CryptoUtilsInstance,
  DateUtilsInstance,
  StringUtilsInstance,
  ArrayUtilsInstance,
  ObjectUtilsInstance,
  NetworkUtilsInstance,
  SystemUtilsInstance,
  PerformanceUtilsInstance,
  ConfigUtilsInstance,
  ErrorUtilsInstance,
  TestUtilsInstance,
  UtilityFunctions,
  UtilityConfig,
  UtilityInitOptions
} from '../types/utility-functions.js';