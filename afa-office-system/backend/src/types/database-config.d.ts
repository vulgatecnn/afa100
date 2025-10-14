/**
 * 数据库配置类型定义
 * 为数据库配置和迁移脚本提供完整的类型支持
 */

// 数据库类型枚举
export enum DatabaseType {
  MYSQL = 'mysql',
  SQLITE = 'sqlite'
}

// 基础数据库配置接口
export interface BaseDatabaseConfig {
  type: DatabaseType;
  debug?: boolean;
  logging?: boolean;
}

// MySQL数据库配置接口
export interface MySQLDatabaseConfig extends BaseDatabaseConfig {
  type: DatabaseType.MYSQL;
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
  charset?: string;
  timezone?: string;
  ssl?: boolean | MySQLSSLConfig;
  
  // 连接配置
  connectionLimit?: number;
  acquireTimeout?: number;
  timeout?: number;
  queueLimit?: number;
  idleTimeout?: number;
  reconnect?: boolean;
  multipleStatements?: boolean;
  
  // MySQL特定配置
  supportBigNumbers?: boolean;
  bigNumberStrings?: boolean;
  dateStrings?: boolean;
  trace?: boolean;
  connectTimeout?: number;
  localAddress?: string;
  socketPath?: string;
  stringifyObjects?: boolean;
  insecureAuth?: boolean;
  typeCast?: boolean | ((field: any, next: () => void) => any);
  queryFormat?: (query: string, values: any) => string;
  flags?: string[];
  rowsAsArray?: boolean;
  
  // 连接池配置
  waitForConnections?: boolean;
  maxIdle?: number;
  enableKeepAlive?: boolean;
  keepAliveInitialDelay?: number;
  compress?: boolean;
  
  // 高级配置
  authSwitchHandler?: (data: any, callback: () => void) => any;
  connectAttributes?: Record<string, any>;
  maxPreparedStatements?: number;
  namedPlaceholders?: boolean;
  nestTables?: boolean | string;
  passwordSha1?: string;
  jsonStrings?: boolean;
  
  // 性能配置
  performance?: DatabasePerformanceConfig;
  
  // 连接池高级配置
  pool?: DatabasePoolConfig;
  
  // 重试配置
  retry?: DatabaseRetryConfig;
}

// SQLite数据库配置接口
export interface SQLiteDatabaseConfig extends BaseDatabaseConfig {
  type: DatabaseType.SQLITE;
  path: string;
  memory?: boolean;
  readonly?: boolean;
  fileMustExist?: boolean;
  timeout?: number;
  verbose?: boolean;
  
  // SQLite特定配置
  pragma?: Record<string, string | number | boolean>;
  
  // 性能配置
  performance?: {
    cacheSize?: number;
    journalMode?: 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'WAL' | 'OFF';
    synchronous?: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';
    tempStore?: 'DEFAULT' | 'FILE' | 'MEMORY';
    mmapSize?: number;
  };
}

// MySQL SSL配置接口
export interface MySQLSSLConfig {
  ca?: string | Buffer;
  cert?: string | Buffer;
  key?: string | Buffer;
  passphrase?: string;
  rejectUnauthorized?: boolean;
  ciphers?: string;
  minVersion?: string;
  maxVersion?: string;
}

// 数据库性能配置接口
export interface DatabasePerformanceConfig {
  slowQueryThreshold?: number;
  enableQueryLogging?: boolean;
  enablePerformanceMetrics?: boolean;
  maxQueryTime?: number;
  queryTimeout?: number;
  statementTimeout?: number;
  lockTimeout?: number;
  
  // 缓存配置
  queryCache?: {
    enabled: boolean;
    size: number;
    ttl: number;
  };
  
  // 监控配置
  monitoring?: {
    enabled: boolean;
    interval: number;
    metrics: string[];
  };
}

// 数据库连接池配置接口
export interface DatabasePoolConfig {
  min?: number;
  max?: number;
  acquireTimeoutMillis?: number;
  createTimeoutMillis?: number;
  destroyTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  reapIntervalMillis?: number;
  createRetryIntervalMillis?: number;
  
  // 连接验证
  testOnBorrow?: boolean;
  testOnReturn?: boolean;
  testWhileIdle?: boolean;
  validationQuery?: string;
  validationInterval?: number;
  
  // 连接生命周期
  maxLifetime?: number;
  leakDetectionThreshold?: number;
  
  // 事件处理
  onConnect?: (connection: any) => Promise<void>;
  onDisconnect?: (connection: any) => Promise<void>;
  onError?: (error: Error, connection?: any) => void;
}

// 数据库重试配置接口
export interface DatabaseRetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  
  // 重试策略
  strategy?: 'exponential' | 'linear' | 'fixed';
  jitter?: boolean;
  
  // 重试条件
  retryCondition?: (error: Error) => boolean;
  
  // 回调函数
  onRetry?: (attempt: number, error: Error) => void;
  onMaxRetriesExceeded?: (error: Error) => void;
}

// 数据库配置联合类型
export type DatabaseConfig = MySQLDatabaseConfig | SQLiteDatabaseConfig;

// 环境特定的数据库配置
export interface EnvironmentDatabaseConfig {
  development: DatabaseConfig;
  test: DatabaseConfig;
  production: DatabaseConfig;
  [key: string]: DatabaseConfig;
}

// 数据库连接选项
export interface DatabaseConnectionOptions {
  autoConnect?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  healthCheckInterval?: number;
  
  // 事件监听器
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onReconnect?: () => void;
}

// 数据库迁移配置
export interface DatabaseMigrationConfig {
  directory?: string;
  tableName?: string;
  schemaName?: string;
  extension?: string;
  loadExtensions?: string[];
  
  // 迁移策略
  strategy?: 'sequential' | 'parallel';
  batchSize?: number;
  timeout?: number;
  
  // 回滚配置
  enableRollback?: boolean;
  rollbackTimeout?: number;
  
  // 验证配置
  validateChecksums?: boolean;
  validateOnMigrate?: boolean;
  
  // 日志配置
  logging?: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    destination?: string;
  };
}

// 数据库种子配置
export interface DatabaseSeedConfig {
  directory?: string;
  extension?: string;
  
  // 种子策略
  strategy?: 'truncate' | 'delete' | 'upsert';
  batchSize?: number;
  timeout?: number;
  
  // 依赖管理
  dependencies?: string[];
  
  // 环境过滤
  environments?: string[];
  
  // 数据验证
  validate?: boolean;
  schema?: any;
}

// 数据库配置验证器
export interface DatabaseConfigValidator {
  validate(config: DatabaseConfig): DatabaseConfigValidationResult;
  validateConnection(config: DatabaseConfig): Promise<DatabaseConnectionValidationResult>;
  validatePerformance(config: DatabaseConfig): DatabasePerformanceValidationResult;
  validateSecurity(config: DatabaseConfig): DatabaseSecurityValidationResult;
}

// 数据库配置验证结果
export interface DatabaseConfigValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  recommendations: ValidationRecommendation[];
}

// 数据库连接验证结果
export interface DatabaseConnectionValidationResult {
  canConnect: boolean;
  connectionTime: number;
  error?: Error;
  serverInfo?: {
    version: string;
    charset: string;
    timezone: string;
  };
}

// 数据库性能验证结果
export interface DatabasePerformanceValidationResult {
  score: number;
  issues: PerformanceIssue[];
  recommendations: PerformanceRecommendation[];
}

// 数据库安全验证结果
export interface DatabaseSecurityValidationResult {
  score: number;
  vulnerabilities: SecurityVulnerability[];
  recommendations: SecurityRecommendation[];
}

// 验证错误接口
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'critical';
}

// 验证警告接口
export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  impact: 'low' | 'medium' | 'high';
}

// 验证建议接口
export interface ValidationRecommendation {
  category: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  action?: string;
}

// 性能问题接口
export interface PerformanceIssue {
  type: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  metric?: {
    name: string;
    value: number;
    threshold: number;
  };
}

// 性能建议接口
export interface PerformanceRecommendation {
  type: string;
  description: string;
  expectedImprovement: string;
  implementation: string;
}

// 安全漏洞接口
export interface SecurityVulnerability {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cve?: string;
  mitigation: string;
}

// 安全建议接口
export interface SecurityRecommendation {
  type: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  implementation: string;
}

// 数据库配置管理器接口
export interface DatabaseConfigManager {
  // 配置获取
  getConfig(environment?: string): DatabaseConfig;
  getAllConfigs(): EnvironmentDatabaseConfig;
  
  // 配置验证
  validateConfig(config: DatabaseConfig): DatabaseConfigValidationResult;
  validateAllConfigs(): Record<string, DatabaseConfigValidationResult>;
  
  // 配置更新
  updateConfig(environment: string, config: Partial<DatabaseConfig>): void;
  resetConfig(environment?: string): void;
  
  // 配置导入导出
  exportConfig(environment?: string): string;
  importConfig(configJson: string, environment?: string): void;
  
  // 配置优化
  optimizeConfig(config: DatabaseConfig, metrics?: any): DatabaseConfig;
  getOptimizedConfig(environment?: string): DatabaseConfig;
  
  // 配置监控
  watchConfig(callback: (config: DatabaseConfig) => void): void;
  unwatchConfig(): void;
}

// 数据库配置工厂接口
export interface DatabaseConfigFactory {
  createMySQLConfig(options: Partial<MySQLDatabaseConfig>): MySQLDatabaseConfig;
  createSQLiteConfig(options: Partial<SQLiteDatabaseConfig>): SQLiteDatabaseConfig;
  createFromEnvironment(type: DatabaseType): DatabaseConfig;
  createForTesting(type: DatabaseType): DatabaseConfig;
  createForProduction(type: DatabaseType): DatabaseConfig;
}

// 数据库配置模板
export interface DatabaseConfigTemplate {
  name: string;
  description: string;
  type: DatabaseType;
  environment: string;
  config: Partial<DatabaseConfig>;
  tags: string[];
}

// 数据库配置预设
export interface DatabaseConfigPreset {
  development: DatabaseConfigTemplate[];
  test: DatabaseConfigTemplate[];
  production: DatabaseConfigTemplate[];
}

// 导出所有类型
export {
  DatabaseType,
  BaseDatabaseConfig,
  MySQLDatabaseConfig,
  SQLiteDatabaseConfig,
  MySQLSSLConfig,
  DatabasePerformanceConfig,
  DatabasePoolConfig,
  DatabaseRetryConfig,
  DatabaseConfig,
  EnvironmentDatabaseConfig,
  DatabaseConnectionOptions,
  DatabaseMigrationConfig,
  DatabaseSeedConfig,
  DatabaseConfigValidator,
  DatabaseConfigValidationResult,
  DatabaseConnectionValidationResult,
  DatabasePerformanceValidationResult,
  DatabaseSecurityValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationRecommendation,
  PerformanceIssue,
  PerformanceRecommendation,
  SecurityVulnerability,
  SecurityRecommendation,
  DatabaseConfigManager,
  DatabaseConfigFactory,
  DatabaseConfigTemplate,
  DatabaseConfigPreset
};