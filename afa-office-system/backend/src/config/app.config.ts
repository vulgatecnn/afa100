import dotenv from 'dotenv';
import type { EnvConfig } from '../types/index.js';

// 加载环境变量
dotenv.config();

/**
 * 应用配置
 */
export const appConfig = {
  // 服务器配置
  port: parseInt(process.env.PORT || '3000'),
  env: process.env.NODE_ENV || 'development',
  
  // 数据库配置
  database: {
    path: process.env.DB_PATH || './database/afa_office.db',
    testPath: process.env.DB_TEST_PATH || ':memory:',
  },
  
  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // 微信配置
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
    apiUrl: 'https://api.weixin.qq.com',
  },
  
  // CORS配置
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3001',
      'http://localhost:3002',
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  },
  
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
    enableConsole: process.env.NODE_ENV !== 'production',
    enableFile: process.env.NODE_ENV === 'production',
  },
  
  // 通行码配置
  passcode: {
    defaultDuration: parseInt(process.env.PASSCODE_DEFAULT_DURATION || '1440'), // 分钟 (24小时)
    defaultUsageLimit: parseInt(process.env.PASSCODE_DEFAULT_USAGE_LIMIT || '10'),
    refreshInterval: parseInt(process.env.PASSCODE_REFRESH_INTERVAL || '5'), // 分钟
    qrCodeSize: 200, // 二维码尺寸
  },
  
  // 文件上传配置
  upload: {
    maxFileSize: '10mb',
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'text/csv',
    ],
    uploadDir: './uploads',
  },
  
  // 安全配置
  security: {
    bcryptRounds: 12,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15分钟
    sessionTimeout: 24 * 60 * 60 * 1000, // 24小时
  },
  
  // 速率限制配置
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 每个IP最多100次请求
    message: '请求过于频繁，请稍后再试',
  },
  
  // 分页配置
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
  
  // 缓存配置
  cache: {
    ttl: 5 * 60 * 1000, // 5分钟
    maxSize: 1000, // 最大缓存条目数
  },
  
  // 通知配置
  notification: {
    enableSms: process.env.ENABLE_SMS === 'true',
    enableEmail: process.env.ENABLE_EMAIL === 'true',
    enablePush: process.env.ENABLE_PUSH === 'true',
  },
  
  // 监控配置
  monitoring: {
    enableHealthCheck: true,
    enableMetrics: process.env.NODE_ENV === 'production',
    metricsInterval: 60000, // 1分钟
  },
};

/**
 * 验证必需的环境变量
 */
export function validateConfig(): void {
  // 在测试环境中跳过验证
  if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
    return;
  }
  
  const requiredEnvVars = [
    'JWT_SECRET',
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ 缺少必需的环境变量:', missingVars.join(', '));
    console.error('请检查 .env 文件或环境变量配置');
    process.exit(1);
  }
  
  // 验证JWT密钥强度
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  JWT_SECRET 长度过短，建议使用至少32个字符的强密钥');
  }
  
  // 生产环境额外检查
  if (process.env.NODE_ENV === 'production') {
    const productionRequiredVars = [
      'WECHAT_APP_ID',
      'WECHAT_APP_SECRET',
    ];
    
    const missingProdVars = productionRequiredVars.filter(varName => !process.env[varName]);
    
    if (missingProdVars.length > 0) {
      console.error('❌ 生产环境缺少必需的环境变量:', missingProdVars.join(', '));
      process.exit(1);
    }
  }
}

/**
 * 获取类型化的环境配置
 */
export function getEnvConfig(): Partial<EnvConfig> {
  return {
    PORT: appConfig.port,
    NODE_ENV: appConfig.env,
    DB_PATH: appConfig.database.path,
    DB_TEST_PATH: appConfig.database.testPath,
    JWT_SECRET: appConfig.jwt.secret,
    JWT_EXPIRES_IN: appConfig.jwt.expiresIn,
    JWT_REFRESH_EXPIRES_IN: appConfig.jwt.refreshExpiresIn,
    WECHAT_APP_ID: appConfig.wechat.appId,
    WECHAT_APP_SECRET: appConfig.wechat.appSecret,
    LOG_LEVEL: appConfig.logging.level,
    LOG_FILE: appConfig.logging.file,
    CORS_ORIGIN: appConfig.cors.origin.join(','),
    PASSCODE_DEFAULT_DURATION: appConfig.passcode.defaultDuration,
    PASSCODE_DEFAULT_USAGE_LIMIT: appConfig.passcode.defaultUsageLimit,
    PASSCODE_REFRESH_INTERVAL: appConfig.passcode.refreshInterval,
  };
}

// 在模块加载时验证配置
validateConfig();