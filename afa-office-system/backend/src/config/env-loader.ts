/**
 * 环境变量加载器
 * 提供类型安全的环境变量访问和验证
 */

import dotenv from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * 环境变量配置接口
 */
export interface EnvironmentConfig {
  // 服务器配置
  port: number;
  nodeEnv: string;
  
  // 数据库配置
  database: {
    type: 'mysql' | 'sqlite';
    path?: string;
    testPath?: string;
    mysql?: {
      app: DatabaseConnectionConfig;
      test: DatabaseConnectionConfig;
      admin: DatabaseAdminConfig;
    };
  };
  
  // JWT配置
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  
  // 微信配置
  wechat: {
    appId: string;
    appSecret: string;
  };
  
  // 日志配置
  logging: {
    level: string;
    file: string;
    enableConsole: boolean;
    enableFile: boolean;
  };
  
  // CORS配置
  cors: {
    origin: string[];
    credentials: boolean;
  };
  
  // 通行码配置
  passcode: {
    defaultDuration: number;
    defaultUsageLimit: number;
    refreshInterval: number;
  };
  
  // 安全配置
  security: {
    bcryptRounds: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    sessionTimeout: number;
  };
  
  // 速率限制配置
  rateLimit: {
    windowMs: number;
    max: number;
    message: string;
  };
  
  // 文件上传配置
  upload: {
    maxFileSize: string;
    uploadDir: string;
    allowedMimeTypes: string[];
  };
  
  // 通知配置
  notification: {
    enableSms: boolean;
    enableEmail: boolean;
    enablePush: boolean;
  };
  
  // 监控配置
  monitoring: {
    enableHealthCheck: boolean;
    enableMetrics: boolean;
    metricsInterval: number;
  };
  
  // 缓存配置
  cache: {
    ttl: number;
    maxSize: number;
  };
  
  // 分页配置
  pagination: {
    defaultLimit: number;
    maxLimit: number;
  };
}

/**
 * 数据库连接配置接口
 */
export interface DatabaseConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
}

/**
 * 数据库管理员配置接口
 */
export interface DatabaseAdminConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

/**
 * 环境变量验证规则
 */
interface ValidationRule {
  key: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean';
  defaultValue?: any;
  validator?: (value: any) => boolean;
  errorMessage?: string;
}

/**
 * 环境变量验证规则定义
 */
const validationRules: ValidationRule[] = [
  // 服务器配置
  { key: 'PORT', required: false, type: 'number', defaultValue: 5100 },
  { key: 'NODE_ENV', required: false, type: 'string', defaultValue: 'development' },
  
  // 数据库配置
  { key: 'DB_TYPE', required: false, type: 'string', defaultValue: 'mysql' },
  
  // JWT配置
  { 
    key: 'JWT_SECRET', 
    required: true, 
    type: 'string',
    validator: (value: string) => value.length >= 32,
    errorMessage: 'JWT_SECRET must be at least 32 characters long'
  },
  { key: 'JWT_EXPIRES_IN', required: false, type: 'string', defaultValue: '24h' },
  { key: 'JWT_REFRESH_EXPIRES_IN', required: false, type: 'string', defaultValue: '7d' },
  
  // 微信配置（生产环境必需）
  { key: 'WECHAT_APP_ID', required: false, type: 'string', defaultValue: '' },
  { key: 'WECHAT_APP_SECRET', required: false, type: 'string', defaultValue: '' },
  
  // 日志配置
  { key: 'LOG_LEVEL', required: false, type: 'string', defaultValue: 'info' },
  { key: 'LOG_FILE', required: false, type: 'string', defaultValue: './logs/app.log' },
  
  // CORS配置
  { key: 'CORS_ORIGIN', required: false, type: 'string', defaultValue: 'http://localhost:5000' },
  
  // 通行码配置
  { key: 'PASSCODE_DEFAULT_DURATION', required: false, type: 'number', defaultValue: 1440 },
  { key: 'PASSCODE_DEFAULT_USAGE_LIMIT', required: false, type: 'number', defaultValue: 10 },
  { key: 'PASSCODE_REFRESH_INTERVAL', required: false, type: 'number', defaultValue: 5 },
];

/**
 * 环境变量加载器类
 */
export class EnvironmentLoader {
  private static instance: EnvironmentLoader;
  private config: EnvironmentConfig | null = null;
  
  private constructor() {}
  
  /**
   * 获取单例实例
   */
  public static getInstance(): EnvironmentLoader {
    if (!EnvironmentLoader.instance) {
      EnvironmentLoader.instance = new EnvironmentLoader();
    }
    return EnvironmentLoader.instance;
  }
  
  /**
   * 加载环境变量配置
   */
  public loadConfig(envPath?: string): EnvironmentConfig {
    if (this.config) {
      return this.config;
    }
    
    // 加载环境变量文件
    this.loadEnvFiles(envPath);
    
    // 验证环境变量
    this.validateEnvironmentVariables();
    
    // 构建配置对象
    this.config = this.buildConfig();
    
    return this.config;
  }
  
  /**
   * 获取配置对象
   */
  public getConfig(): EnvironmentConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }
  
  /**
   * 加载环境变量文件
   */
  private loadEnvFiles(envPath?: string): void {
    const rootDir = process.cwd();
    const envFiles = [
      envPath,
      `.env.${process.env.NODE_ENV}`,
      '.env.local',
      '.env'
    ].filter(Boolean);
    
    for (const envFile of envFiles) {
      const fullPath = join(rootDir, envFile!);
      if (existsSync(fullPath)) {
        dotenv.config({ path: fullPath });
        console.log(`✅ Loaded environment file: ${envFile}`);
        break;
      }
    }
  }
  
  /**
   * 验证环境变量
   */
  private validateEnvironmentVariables(): void {
    const errors: string[] = [];
    
    for (const rule of validationRules) {
      const value = process.env[rule.key];
      
      // 检查必需字段
      if (rule.required && !value) {
        errors.push(`Missing required environment variable: ${rule.key}`);
        continue;
      }
      
      // 跳过测试环境的验证
      if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
        continue;
      }
      
      // 类型验证
      if (value && !this.validateType(value, rule.type)) {
        errors.push(`Invalid type for ${rule.key}: expected ${rule.type}`);
        continue;
      }
      
      // 自定义验证器
      if (value && rule.validator && !rule.validator(value)) {
        errors.push(rule.errorMessage || `Invalid value for ${rule.key}`);
      }
    }
    
    // 生产环境额外验证
    if (process.env.NODE_ENV === 'production') {
      this.validateProductionEnvironment(errors);
    }
    
    if (errors.length > 0) {
      console.error('❌ Environment validation errors:');
      errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
  }
  
  /**
   * 验证生产环境配置
   */
  private validateProductionEnvironment(errors: string[]): void {
    const productionRequired = ['WECHAT_APP_ID', 'WECHAT_APP_SECRET'];
    
    for (const key of productionRequired) {
      if (!process.env[key]) {
        errors.push(`Missing required production environment variable: ${key}`);
      }
    }
    
    // JWT密钥强度检查
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      console.warn('⚠️  JWT_SECRET is too short. Use at least 32 characters for production.');
    }
  }
  
  /**
   * 类型验证
   */
  private validateType(value: string, type: string): boolean {
    switch (type) {
      case 'number':
        return !isNaN(Number(value));
      case 'boolean':
        return ['true', 'false', '1', '0'].includes(value.toLowerCase());
      case 'string':
        return typeof value === 'string';
      default:
        return true;
    }
  }
  
  /**
   * 获取环境变量值（带默认值和类型转换）
   */
  private getEnvValue<T>(key: string, defaultValue: T, type: 'string' | 'number' | 'boolean' = 'string'): T {
    const value = process.env[key];
    
    if (!value) {
      return defaultValue;
    }
    
    switch (type) {
      case 'number':
        return (parseInt(value, 10) || defaultValue) as T;
      case 'boolean':
        return (['true', '1'].includes(value.toLowerCase())) as T;
      default:
        return value as T;
    }
  }
  
  /**
   * 构建配置对象
   */
  private buildConfig(): EnvironmentConfig {
    return {
      port: this.getEnvValue('PORT', 5100, 'number'),
      nodeEnv: this.getEnvValue('NODE_ENV', 'development'),
      
      database: {
        type: this.getEnvValue('DB_TYPE', 'mysql') as 'mysql' | 'sqlite',
        path: this.getEnvValue('DB_PATH', './database/afa_office.db'),
        testPath: this.getEnvValue('DB_TEST_PATH', ':memory:'),
        mysql: {
          app: {
            host: this.getEnvValue('APP_DB_HOST', '127.0.0.1'),
            port: this.getEnvValue('APP_DB_PORT', 3306, 'number'),
            user: this.getEnvValue('APP_DB_USER', 'afa_app_user'),
            password: this.getEnvValue('APP_DB_PASSWORD', ''),
            database: this.getEnvValue('APP_DB_NAME', 'afa_office'),
            connectionLimit: this.getEnvValue('APP_DB_CONNECTION_LIMIT', 10, 'number'),
            acquireTimeout: this.getEnvValue('APP_DB_ACQUIRE_TIMEOUT', 60000, 'number'),
            timeout: this.getEnvValue('APP_DB_TIMEOUT', 60000, 'number'),
          },
          test: {
            host: this.getEnvValue('TEST_DB_HOST', '127.0.0.1'),
            port: this.getEnvValue('TEST_DB_PORT', 3306, 'number'),
            user: this.getEnvValue('TEST_DB_USER', 'afa_test_user'),
            password: this.getEnvValue('TEST_DB_PASSWORD', ''),
            database: this.getEnvValue('TEST_DB_NAME', 'afa_office_test'),
            connectionLimit: this.getEnvValue('TEST_DB_CONNECTION_LIMIT', 5, 'number'),
            acquireTimeout: this.getEnvValue('TEST_DB_ACQUIRE_TIMEOUT', 30000, 'number'),
            timeout: this.getEnvValue('TEST_DB_TIMEOUT', 30000, 'number'),
          },
          admin: {
            host: this.getEnvValue('MYSQL_ADMIN_HOST', '127.0.0.1'),
            port: this.getEnvValue('MYSQL_ADMIN_PORT', 3306, 'number'),
            user: this.getEnvValue('MYSQL_ADMIN_USER', 'root'),
            password: this.getEnvValue('MYSQL_ADMIN_PASSWORD', ''),
          },
        },
      },
      
      jwt: {
        secret: this.getEnvValue('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production'),
        expiresIn: this.getEnvValue('JWT_EXPIRES_IN', '24h'),
        refreshExpiresIn: this.getEnvValue('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
      
      wechat: {
        appId: this.getEnvValue('WECHAT_APP_ID', ''),
        appSecret: this.getEnvValue('WECHAT_APP_SECRET', ''),
      },
      
      logging: {
        level: this.getEnvValue('LOG_LEVEL', 'info'),
        file: this.getEnvValue('LOG_FILE', './logs/app.log'),
        enableConsole: process.env.NODE_ENV !== 'production',
        enableFile: process.env.NODE_ENV === 'production',
      },
      
      cors: {
        origin: this.getEnvValue('CORS_ORIGIN', 'http://localhost:5000').split(','),
        credentials: true,
      },
      
      passcode: {
        defaultDuration: this.getEnvValue('PASSCODE_DEFAULT_DURATION', 1440, 'number'),
        defaultUsageLimit: this.getEnvValue('PASSCODE_DEFAULT_USAGE_LIMIT', 10, 'number'),
        refreshInterval: this.getEnvValue('PASSCODE_REFRESH_INTERVAL', 5, 'number'),
      },
      
      security: {
        bcryptRounds: this.getEnvValue('BCRYPT_ROUNDS', 12, 'number'),
        maxLoginAttempts: this.getEnvValue('MAX_LOGIN_ATTEMPTS', 5, 'number'),
        lockoutDuration: this.getEnvValue('LOCKOUT_DURATION', 15 * 60 * 1000, 'number'),
        sessionTimeout: this.getEnvValue('SESSION_TIMEOUT', 24 * 60 * 60 * 1000, 'number'),
      },
      
      rateLimit: {
        windowMs: this.getEnvValue('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000, 'number'),
        max: this.getEnvValue('RATE_LIMIT_MAX', 100, 'number'),
        message: '请求过于频繁，请稍后再试',
      },
      
      upload: {
        maxFileSize: this.getEnvValue('UPLOAD_MAX_FILE_SIZE', '10mb'),
        uploadDir: this.getEnvValue('UPLOAD_DIR', './uploads'),
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
      },
      
      notification: {
        enableSms: this.getEnvValue('ENABLE_SMS', false, 'boolean'),
        enableEmail: this.getEnvValue('ENABLE_EMAIL', false, 'boolean'),
        enablePush: this.getEnvValue('ENABLE_PUSH', false, 'boolean'),
      },
      
      monitoring: {
        enableHealthCheck: this.getEnvValue('ENABLE_HEALTH_CHECK', true, 'boolean'),
        enableMetrics: this.getEnvValue('ENABLE_METRICS', false, 'boolean'),
        metricsInterval: this.getEnvValue('METRICS_INTERVAL', 60000, 'number'),
      },
      
      cache: {
        ttl: this.getEnvValue('CACHE_TTL', 5 * 60 * 1000, 'number'),
        maxSize: this.getEnvValue('CACHE_MAX_SIZE', 1000, 'number'),
      },
      
      pagination: {
        defaultLimit: this.getEnvValue('DEFAULT_PAGE_LIMIT', 20, 'number'),
        maxLimit: this.getEnvValue('MAX_PAGE_LIMIT', 100, 'number'),
      },
    };
  }
  
  /**
   * 重置配置（主要用于测试）
   */
  public resetConfig(): void {
    this.config = null;
  }
}

/**
 * 获取环境配置的便捷函数
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return EnvironmentLoader.getInstance().getConfig();
}

/**
 * 加载环境配置的便捷函数
 */
export function loadEnvironmentConfig(envPath?: string): EnvironmentConfig {
  return EnvironmentLoader.getInstance().loadConfig(envPath);
}