/**
 * 工具函数类型定义
 * 为工具函数提供完整的类型支持
 */

// 日志工具类型
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

export interface LoggerInstance {
  error: (message: string, error?: Error, context?: any) => void;
  warn: (message: string, context?: any) => void;
  info: (message: string, context?: any) => void;
  debug: (message: string, context?: any) => void;
  setLevel: (level: LogLevel) => void;
  getConfig: () => LoggerConfig;
}

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// 验证工具类型
export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors?: ValidationError[];
  name?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code?: string;
}

export interface ValidatorConfig {
  abortEarly: boolean;
  stripUnknown: boolean;
  allowUnknown: boolean;
  convert: boolean;
}

export interface ValidatorInstance {
  validate: <T = any>(data: any, schema: any) => ValidationResult<T>;
  validateOrThrow: <T = any>(data: any, schema: any) => T;
  validateBatch: (items: Array<{ data: any; schema: any; name?: string }>) => ValidationResult[];
  setConfig: (config: Partial<ValidatorConfig>) => void;
  getConfig: () => ValidatorConfig;
}

// 认证工具类型
export interface PasswordHashOptions {
  saltRounds: number;
}

export interface TokenGenerationOptions {
  length: number;
  includeNumbers: boolean;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeSymbols: boolean;
}

export interface PermissionCheckOptions {
  requireAll: boolean;
  caseSensitive: boolean;
}

export interface PasswordStrengthResult {
  score: number;
  level: 'weak' | 'medium' | 'strong' | 'very_strong';
  suggestions: string[];
}

export interface AuthUtilsInstance {
  hashPassword: (password: string, options?: Partial<PasswordHashOptions>) => Promise<string>;
  verifyPassword: (password: string, hashedPassword: string) => Promise<boolean>;
  generateToken: (options?: Partial<TokenGenerationOptions>) => string;
  generateSecureToken: (length?: number) => string;
  generateUUID: () => string;
  hasUserTypePermission: (userType: string, allowedTypes: string[]) => boolean;
  hasPermissions: (userPermissions: string[], requiredPermissions: string[], options?: Partial<PermissionCheckOptions>) => boolean;
  canAccessMerchantResource: (user: any, merchantId: number) => boolean;
  isAdmin: (userType: string) => boolean;
  isTenantAdmin: (userType: string) => boolean;
  isMerchantAdmin: (userType: string) => boolean;
  isEmployee: (userType: string) => boolean;
  isVisitor: (userType: string) => boolean;
  getUserPermissionLevel: (userType: string) => number;
  comparePermissionLevel: (userType1: string, userType2: string) => number;
  isValidJwtPayload: (payload: any) => boolean;
  sanitizeUserData: <T extends Record<string, any>>(data: T) => Omit<T, 'password' | 'token' | 'secret'>;
  generateVisitorPasscode: () => string;
  isValidPasscode: (passcode: string) => boolean;
  calculatePasswordStrength: (password: string) => PasswordStrengthResult;
}

// JWT工具类型
export interface JwtUtilsInstance {
  sign: (payload: any, options?: any) => string;
  verify: (token: string, options?: any) => any;
  decode: (token: string, options?: any) => any;
  refresh: (token: string, options?: any) => string;
}

// 微信工具类型
export interface WechatUtilsInstance {
  getAccessToken: (code: string) => Promise<any>;
  getUserInfo: (accessToken: string, openId: string) => Promise<any>;
  validateSignature: (signature: string, timestamp: string, nonce: string) => boolean;
  decryptData: (encryptedData: string, sessionKey: string, iv: string) => any;
}

// 二维码工具类型
export interface QRCodeUtilsInstance {
  generate: (data: string, options?: any) => Promise<string>;
  generateToFile: (data: string, filePath: string, options?: any) => Promise<void>;
  generateToBuffer: (data: string, options?: any) => Promise<Buffer>;
  validate: (qrCodeData: string) => boolean;
}

// 数据库工具类型
export interface DatabaseUtilsInstance {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  query: (sql: string, params?: any[]) => Promise<any>;
  transaction: <T>(callback: () => Promise<T>) => Promise<T>;
  migrate: () => Promise<void>;
  seed: () => Promise<void>;
  backup: () => Promise<string>;
  restore: (backupPath: string) => Promise<void>;
}

// 文件工具类型
export interface FileUtilsInstance {
  upload: (file: any, options?: any) => Promise<string>;
  download: (filePath: string) => Promise<Buffer>;
  delete: (filePath: string) => Promise<void>;
  exists: (filePath: string) => Promise<boolean>;
  getMetadata: (filePath: string) => Promise<any>;
  validateFile: (file: any, rules?: any) => ValidationResult;
}

// 缓存工具类型
export interface CacheUtilsInstance {
  get: <T = any>(key: string) => Promise<T | null>;
  set: (key: string, value: any, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  exists: (key: string) => Promise<boolean>;
  ttl: (key: string) => Promise<number>;
}

// 邮件工具类型
export interface EmailUtilsInstance {
  send: (to: string | string[], subject: string, content: string, options?: any) => Promise<void>;
  sendTemplate: (to: string | string[], templateId: string, data: any, options?: any) => Promise<void>;
  validateEmail: (email: string) => boolean;
  parseEmail: (email: string) => { local: string; domain: string };
}

// 短信工具类型
export interface SmsUtilsInstance {
  send: (phone: string, message: string, options?: any) => Promise<void>;
  sendTemplate: (phone: string, templateId: string, data: any, options?: any) => Promise<void>;
  validatePhone: (phone: string) => boolean;
  formatPhone: (phone: string, countryCode?: string) => string;
}

// 加密工具类型
export interface CryptoUtilsInstance {
  encrypt: (data: string, key?: string) => string;
  decrypt: (encryptedData: string, key?: string) => string;
  hash: (data: string, algorithm?: string) => string;
  hmac: (data: string, key: string, algorithm?: string) => string;
  generateKey: (length?: number) => string;
  generateKeyPair: () => { publicKey: string; privateKey: string };
}

// 时间工具类型
export interface DateUtilsInstance {
  format: (date: Date | string, format?: string) => string;
  parse: (dateString: string, format?: string) => Date;
  add: (date: Date | string, amount: number, unit: string) => Date;
  subtract: (date: Date | string, amount: number, unit: string) => Date;
  diff: (date1: Date | string, date2: Date | string, unit?: string) => number;
  isValid: (date: any) => boolean;
  isAfter: (date1: Date | string, date2: Date | string) => boolean;
  isBefore: (date1: Date | string, date2: Date | string) => boolean;
  isSame: (date1: Date | string, date2: Date | string, unit?: string) => boolean;
  startOf: (date: Date | string, unit: string) => Date;
  endOf: (date: Date | string, unit: string) => Date;
  timezone: (date: Date | string, timezone: string) => Date;
}

// 字符串工具类型
export interface StringUtilsInstance {
  slugify: (text: string, options?: any) => string;
  truncate: (text: string, length: number, suffix?: string) => string;
  capitalize: (text: string) => string;
  camelCase: (text: string) => string;
  kebabCase: (text: string) => string;
  snakeCase: (text: string) => string;
  pascalCase: (text: string) => string;
  randomString: (length: number, charset?: string) => string;
  mask: (text: string, start?: number, end?: number, maskChar?: string) => string;
  stripHtml: (html: string) => string;
  escapeHtml: (text: string) => string;
  unescapeHtml: (html: string) => string;
}

// 数组工具类型
export interface ArrayUtilsInstance {
  chunk: <T>(array: T[], size: number) => T[][];
  flatten: <T>(array: any[]) => T[];
  unique: <T>(array: T[], key?: string | ((item: T) => any)) => T[];
  groupBy: <T>(array: T[], key: string | ((item: T) => any)) => Record<string, T[]>;
  sortBy: <T>(array: T[], key: string | ((item: T) => any), order?: 'asc' | 'desc') => T[];
  shuffle: <T>(array: T[]) => T[];
  sample: <T>(array: T[], count?: number) => T | T[];
  difference: <T>(array1: T[], array2: T[]) => T[];
  intersection: <T>(array1: T[], array2: T[]) => T[];
  union: <T>(array1: T[], array2: T[]) => T[];
}

// 对象工具类型
export interface ObjectUtilsInstance {
  pick: <T, K extends keyof T>(obj: T, keys: K[]) => Pick<T, K>;
  omit: <T, K extends keyof T>(obj: T, keys: K[]) => Omit<T, K>;
  merge: <T, U>(obj1: T, obj2: U) => T & U;
  clone: <T>(obj: T) => T;
  deepClone: <T>(obj: T) => T;
  isEmpty: (obj: any) => boolean;
  isEqual: (obj1: any, obj2: any) => boolean;
  get: (obj: any, path: string, defaultValue?: any) => any;
  set: (obj: any, path: string, value: any) => void;
  has: (obj: any, path: string) => boolean;
  keys: (obj: any) => string[];
  values: (obj: any) => any[];
  entries: (obj: any) => [string, any][];
}

// 网络工具类型
export interface NetworkUtilsInstance {
  isValidUrl: (url: string) => boolean;
  isValidIp: (ip: string) => boolean;
  isValidDomain: (domain: string) => boolean;
  parseUrl: (url: string) => URL;
  buildUrl: (base: string, path?: string, params?: Record<string, any>) => string;
  downloadFile: (url: string, filePath: string) => Promise<void>;
  ping: (host: string, timeout?: number) => Promise<boolean>;
  getPublicIp: () => Promise<string>;
}

// 系统工具类型
export interface SystemUtilsInstance {
  getSystemInfo: () => {
    platform: string;
    arch: string;
    version: string;
    memory: { total: number; free: number; used: number };
    cpu: { model: string; cores: number; usage: number };
    uptime: number;
  };
  getProcessInfo: () => {
    pid: number;
    memory: { rss: number; heapTotal: number; heapUsed: number; external: number };
    cpu: { user: number; system: number };
    uptime: number;
  };
  executeCommand: (command: string, options?: any) => Promise<{ stdout: string; stderr: string; code: number }>;
  watchFile: (filePath: string, callback: (event: string, filename: string) => void) => void;
  unwatchFile: (filePath: string) => void;
}

// 性能工具类型
export interface PerformanceUtilsInstance {
  measure: <T>(name: string, fn: () => T) => T;
  measureAsync: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
  startTimer: (name: string) => void;
  endTimer: (name: string) => number;
  getMetrics: () => Record<string, { count: number; total: number; average: number; min: number; max: number }>;
  clearMetrics: () => void;
  benchmark: <T>(name: string, fn: () => T, iterations?: number) => { average: number; min: number; max: number; total: number };
}

// 配置工具类型
export interface ConfigUtilsInstance {
  get: <T = any>(key: string, defaultValue?: T) => T;
  set: (key: string, value: any) => void;
  has: (key: string) => boolean;
  delete: (key: string) => void;
  clear: () => void;
  load: (filePath: string) => void;
  save: (filePath: string) => void;
  merge: (config: Record<string, any>) => void;
  validate: (schema: any) => ValidationResult;
}

// 错误处理工具类型
export interface ErrorUtilsInstance {
  createError: (message: string, code?: string | number, statusCode?: number) => Error;
  isError: (value: any) => value is Error;
  formatError: (error: Error) => { message: string; stack?: string; code?: string | number };
  logError: (error: Error, context?: any) => void;
  handleError: (error: Error, req?: any, res?: any, next?: any) => void;
  wrapAsync: <T extends (...args: any[]) => Promise<any>>(fn: T) => T;
}

// 测试工具类型
export interface TestUtilsInstance {
  createMockUser: (overrides?: any) => any;
  createMockMerchant: (overrides?: any) => any;
  createMockVisitor: (overrides?: any) => any;
  createMockRequest: (overrides?: any) => any;
  createMockResponse: (overrides?: any) => any;
  setupTestDatabase: () => Promise<void>;
  cleanupTestDatabase: () => Promise<void>;
  seedTestData: () => Promise<void>;
  clearTestData: () => Promise<void>;
}

// 通用工具函数类型
export interface UtilityFunctions {
  logger: LoggerInstance;
  validator: ValidatorInstance;
  auth: AuthUtilsInstance;
  jwt: JwtUtilsInstance;
  wechat: WechatUtilsInstance;
  qrcode: QRCodeUtilsInstance;
  database: DatabaseUtilsInstance;
  file: FileUtilsInstance;
  cache: CacheUtilsInstance;
  email: EmailUtilsInstance;
  sms: SmsUtilsInstance;
  crypto: CryptoUtilsInstance;
  date: DateUtilsInstance;
  string: StringUtilsInstance;
  array: ArrayUtilsInstance;
  object: ObjectUtilsInstance;
  network: NetworkUtilsInstance;
  system: SystemUtilsInstance;
  performance: PerformanceUtilsInstance;
  config: ConfigUtilsInstance;
  error: ErrorUtilsInstance;
  test: TestUtilsInstance;
}

// 工具函数配置类型
export interface UtilityConfig {
  logger?: Partial<LoggerConfig>;
  validator?: Partial<ValidatorConfig>;
  auth?: {
    saltRounds?: number;
    tokenLength?: number;
  };
  jwt?: {
    secret?: string;
    expiresIn?: string;
    algorithm?: string;
  };
  cache?: {
    ttl?: number;
    maxSize?: number;
  };
  email?: {
    provider?: string;
    apiKey?: string;
    from?: string;
  };
  sms?: {
    provider?: string;
    apiKey?: string;
    from?: string;
  };
}

// 工具函数初始化选项
export interface UtilityInitOptions {
  config?: UtilityConfig;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableCaching?: boolean;
}

// 导出所有类型
export {
  LogEntry,
  LoggerConfig,
  LoggerInstance,
  LogLevel,
  ValidationResult,
  ValidationError,
  ValidatorConfig,
  ValidatorInstance,
  PasswordHashOptions,
  TokenGenerationOptions,
  PermissionCheckOptions,
  PasswordStrengthResult,
  AuthUtilsInstance,
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
};