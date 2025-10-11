import * as dotenv from 'dotenv';

dotenv.config();

// MySQL数据库配置接口
export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
  multipleStatements: boolean;
  charset: string;
  timezone: string;
  performance: {
    slowQueryThreshold: number;
    enableQueryLogging: boolean;
    enablePerformanceMetrics: boolean;
    maxQueryTime: number;
  };
  pool: {
    min: number;
    max: number;
    acquireTimeoutMillis: number;
    idleTimeoutMillis: number;
    createTimeoutMillis: number;
    reapIntervalMillis: number;
  };
  retry: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    retryableErrors: string[];
  };
}

// 环境特定的MySQL数据库配置
export const dbConfig: Record<string, DatabaseConfig> = {
  development: {
    host: process.env.APP_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.APP_DB_PORT || '3306'),
    user: process.env.APP_DB_USER || 'afa_app_user',
    password: process.env.APP_DB_PASSWORD || 'afa_app_2024',
    database: process.env.APP_DB_NAME || 'afa_office',
    connectionLimit: parseInt(process.env.APP_DB_CONNECTION_LIMIT || '10'),
    acquireTimeout: parseInt(process.env.APP_DB_ACQUIRE_TIMEOUT || '60000'),
    timeout: parseInt(process.env.APP_DB_TIMEOUT || '60000'),
    multipleStatements: true,
    charset: 'utf8mb4',
    timezone: '+00:00',
    performance: {
      slowQueryThreshold: 1000,
      enableQueryLogging: true,
      enablePerformanceMetrics: true,
      maxQueryTime: 30000,
    },
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 300000,
      createTimeoutMillis: 10000,
      reapIntervalMillis: 30000,
    },
    retry: {
      maxRetries: 5,
      baseDelay: 100,
      maxDelay: 5000,
      retryableErrors: ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ER_LOCK_WAIT_TIMEOUT'],
    },
  },
  test: {
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.TEST_DB_PORT || '3306'),
    user: process.env.TEST_DB_USER || 'afa_test_user',
    password: process.env.TEST_DB_PASSWORD || 'afa_test_2024',
    database: process.env.TEST_DB_NAME || 'afa_office_test',
    connectionLimit: parseInt(process.env.TEST_DB_CONNECTION_LIMIT || '5'),
    acquireTimeout: parseInt(process.env.TEST_DB_ACQUIRE_TIMEOUT || '30000'),
    timeout: parseInt(process.env.TEST_DB_TIMEOUT || '30000'),
    multipleStatements: true,
    charset: 'utf8mb4',
    timezone: '+00:00',
    performance: {
      slowQueryThreshold: 500,
      enableQueryLogging: false,
      enablePerformanceMetrics: true,
      maxQueryTime: 10000,
    },
    pool: {
      min: 1,
      max: 5,
      acquireTimeoutMillis: 10000,
      idleTimeoutMillis: 60000,
      createTimeoutMillis: 5000,
      reapIntervalMillis: 10000,
    },
    retry: {
      maxRetries: 10,
      baseDelay: 50,
      maxDelay: 2000,
      retryableErrors: ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ER_LOCK_WAIT_TIMEOUT', 'ER_LOCK_DEADLOCK'],
    },
  },
  production: {
    host: process.env.APP_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.APP_DB_PORT || '3306'),
    user: process.env.APP_DB_USER || 'afa_app_user',
    password: process.env.APP_DB_PASSWORD || 'afa_app_2024',
    database: process.env.APP_DB_NAME || 'afa_office',
    connectionLimit: parseInt(process.env.APP_DB_CONNECTION_LIMIT || '20'),
    acquireTimeout: parseInt(process.env.APP_DB_ACQUIRE_TIMEOUT || '60000'),
    timeout: parseInt(process.env.APP_DB_TIMEOUT || '60000'),
    multipleStatements: true,
    charset: 'utf8mb4',
    timezone: '+00:00',
    performance: {
      slowQueryThreshold: 2000,
      enableQueryLogging: false,
      enablePerformanceMetrics: true,
      maxQueryTime: 60000,
    },
    pool: {
      min: 5,
      max: 20,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 600000,
      createTimeoutMillis: 15000,
      reapIntervalMillis: 60000,
    },
    retry: {
      maxRetries: 3,
      baseDelay: 200,
      maxDelay: 10000,
      retryableErrors: ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ER_LOCK_WAIT_TIMEOUT'],
    },
  },
};

// 获取当前环境配置
export const getCurrentDbConfig = (): DatabaseConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  // 获取基础配置
  const baseConfig = dbConfig[env] || dbConfig.development!;
  
  // 动态覆盖配置（优先使用环境变量）
  const dynamicConfig: DatabaseConfig = {
    ...baseConfig,
    host: env === 'test' 
      ? (process.env.TEST_DB_HOST || baseConfig.host)
      : (process.env.APP_DB_HOST || baseConfig.host),
    port: env === 'test'
      ? parseInt(process.env.TEST_DB_PORT || baseConfig.port.toString())
      : parseInt(process.env.APP_DB_PORT || baseConfig.port.toString()),
    user: env === 'test'
      ? (process.env.TEST_DB_USER || baseConfig.user)
      : (process.env.APP_DB_USER || baseConfig.user),
    password: env === 'test'
      ? (process.env.TEST_DB_PASSWORD || baseConfig.password)
      : (process.env.APP_DB_PASSWORD || baseConfig.password),
    database: env === 'test'
      ? (process.env.TEST_DB_NAME || baseConfig.database)
      : (process.env.APP_DB_NAME || baseConfig.database),
  };
  
  return dynamicConfig;
};

// 获取环境特定的性能配置
export const getPerformanceConfig = (env?: string) => {
  const environment = env || process.env.NODE_ENV || 'development';
  return dbConfig[environment]?.performance || dbConfig.development!.performance;
};

// 获取环境特定的连接池配置
export const getPoolConfig = (env?: string) => {
  const environment = env || process.env.NODE_ENV || 'development';
  return dbConfig[environment]?.pool || dbConfig.development!.pool;
};

// 获取环境特定的重试配置
export const getRetryConfig = (env?: string) => {
  const environment = env || process.env.NODE_ENV || 'development';
  return dbConfig[environment]?.retry || dbConfig.development!.retry;
};

// 验证MySQL数据库配置
export const validateDatabaseConfig = (config: DatabaseConfig): string[] => {
  const errors: string[] = [];
  
  if (!config.host) {
    errors.push('MySQL主机地址不能为空');
  }
  
  if (!config.port || config.port <= 0 || config.port > 65535) {
    errors.push('MySQL端口必须在1-65535之间');
  }
  
  if (!config.user) {
    errors.push('MySQL用户名不能为空');
  }
  
  if (!config.password) {
    errors.push('MySQL密码不能为空');
  }
  
  if (!config.database) {
    errors.push('MySQL数据库名不能为空');
  }
  
  if (config.connectionLimit <= 0 || config.connectionLimit > 100) {
    errors.push('MySQL连接池大小必须在1-100之间');
  }
  
  if (config.acquireTimeout <= 0) {
    errors.push('MySQL获取连接超时时间必须大于0');
  }
  
  if (config.timeout <= 0) {
    errors.push('MySQL查询超时时间必须大于0');
  }
  
  if (config.pool.min < 0) {
    errors.push('最小连接数不能小于0');
  }
  
  if (config.pool.max <= config.pool.min) {
    errors.push('最大连接数必须大于最小连接数');
  }
  
  if (config.pool.max > 50) {
    errors.push('最大连接数不应超过50');
  }
  
  if (config.pool.acquireTimeoutMillis <= 0) {
    errors.push('获取连接超时时间必须大于0');
  }
  
  if (config.pool.acquireTimeoutMillis > 300000) {
    errors.push('获取连接超时时间不应超过5分钟');
  }
  
  if (config.retry.maxRetries < 0) {
    errors.push('最大重试次数不能小于0');
  }
  
  if (config.retry.maxRetries > 20) {
    errors.push('最大重试次数不应超过20');
  }
  
  if (config.retry.baseDelay <= 0) {
    errors.push('基础延迟时间必须大于0');
  }
  
  if (config.retry.maxDelay < config.retry.baseDelay) {
    errors.push('最大延迟时间不能小于基础延迟时间');
  }
  
  if (config.performance.slowQueryThreshold <= 0) {
    errors.push('慢查询阈值必须大于0');
  }
  
  if (config.performance.maxQueryTime <= config.performance.slowQueryThreshold) {
    errors.push('最大查询时间必须大于慢查询阈值');
  }
  
  return errors;
};

/**
 * 获取优化的MySQL数据库配置
 * 根据系统资源和环境自动调整配置参数
 */
export const getOptimizedDatabaseConfig = (env?: string): DatabaseConfig => {
  const environment = env || process.env.NODE_ENV || 'development';
  const baseConfig = getCurrentDbConfig();
  
  // 根据环境和系统资源优化配置
  const optimizations: Partial<DatabaseConfig> = {};
  
  if (environment === 'test') {
    // 测试环境优化：更快的超时，更多重试
    optimizations.acquireTimeout = Math.min(baseConfig.acquireTimeout, 10000);
    optimizations.timeout = Math.min(baseConfig.timeout, 10000);
    optimizations.connectionLimit = Math.min(baseConfig.connectionLimit, 5);
    
    optimizations.pool = {
      ...baseConfig.pool,
      acquireTimeoutMillis: Math.min(baseConfig.pool.acquireTimeoutMillis, 5000),
      idleTimeoutMillis: Math.min(baseConfig.pool.idleTimeoutMillis, 30000),
    };
    
    optimizations.retry = {
      ...baseConfig.retry,
      maxRetries: Math.max(baseConfig.retry.maxRetries, 5),
      baseDelay: Math.min(baseConfig.retry.baseDelay, 50),
    };
  } else if (environment === 'production') {
    // 生产环境优化：更保守的设置
    optimizations.connectionLimit = Math.min(baseConfig.connectionLimit, 20);
    
    optimizations.pool = {
      ...baseConfig.pool,
      max: Math.min(baseConfig.pool.max, 20), // 限制最大连接数
    };
    
    optimizations.performance = {
      ...baseConfig.performance,
      enableQueryLogging: false, // 生产环境关闭查询日志
    };
  }
  
  return { ...baseConfig, ...optimizations };
};

/**
 * 动态调整MySQL数据库配置
 * 根据当前系统负载和性能指标调整配置
 */
export const adjustDatabaseConfig = (
  currentConfig: DatabaseConfig,
  performanceMetrics: {
    averageQueryTime: number;
    connectionUtilization: number;
    errorRate: number;
  }
): Partial<DatabaseConfig> => {
  const adjustments: Partial<DatabaseConfig> = {};
  
  // 根据查询性能调整慢查询阈值
  if (performanceMetrics.averageQueryTime > currentConfig.performance.slowQueryThreshold) {
    adjustments.performance = {
      ...currentConfig.performance,
      slowQueryThreshold: Math.min(
        performanceMetrics.averageQueryTime * 1.5,
        currentConfig.performance.maxQueryTime * 0.5
      ),
    };
  }
  
  // 根据连接使用率调整连接池大小
  if (performanceMetrics.connectionUtilization > 0.8) {
    adjustments.connectionLimit = Math.min(currentConfig.connectionLimit + 2, 50);
    adjustments.pool = {
      ...currentConfig.pool,
      max: Math.min(currentConfig.pool.max + 2, 50),
    };
  } else if (performanceMetrics.connectionUtilization < 0.3) {
    adjustments.connectionLimit = Math.max(currentConfig.connectionLimit - 1, currentConfig.pool.min + 1);
    adjustments.pool = {
      ...currentConfig.pool,
      max: Math.max(currentConfig.pool.max - 1, currentConfig.pool.min + 1),
    };
  }
  
  // 根据错误率调整重试配置和超时时间
  if (performanceMetrics.errorRate > 0.05) { // 5%错误率
    adjustments.acquireTimeout = Math.min(currentConfig.acquireTimeout * 1.2, 120000);
    adjustments.timeout = Math.min(currentConfig.timeout * 1.2, 120000);
    adjustments.retry = {
      ...currentConfig.retry,
      maxRetries: Math.min(currentConfig.retry.maxRetries + 1, 10),
      baseDelay: Math.min(currentConfig.retry.baseDelay * 1.2, 1000),
    };
  }
  
  return adjustments;
};

// MySQL连接选项
export const connectionOptions = {
  verbose: process.env.NODE_ENV === 'development',
  supportBigNumbers: true,
  bigNumberStrings: true,
  dateStrings: false,
  debug: process.env.NODE_ENV === 'development',
  trace: false,
  ssl: false,
};