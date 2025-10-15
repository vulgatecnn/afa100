/**
 * MySQL专用配置管理器
 * 专门处理MySQL数据库的配置管理、验证和优化
 */

import * as dotenv from 'dotenv';
import { MySQLConfig, DatabaseType } from './database-config-manager';

dotenv.config();

/**
 * MySQL连接配置选项
 */
export interface MySQLConnectionOptions {
  // 基础连接配置
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
  
  // 连接池配置
  connectionLimit?: number;
  acquireTimeout?: number;
  timeout?: number;
  queueLimit?: number;
  idleTimeout?: number;
  
  // MySQL特定配置
  charset?: string;
  timezone?: string;
  multipleStatements?: boolean;
  supportBigNumbers?: boolean;
  bigNumberStrings?: boolean;
  dateStrings?: boolean;
  reconnect?: boolean;
  
  // SSL配置
  ssl?: boolean | object;
  
  // 调试配置
  debug?: boolean;
  trace?: boolean;
}

/**
 * MySQL环境配置模板
 */
export interface MySQLEnvironmentConfig {
  development: MySQLConnectionOptions;
  test: MySQLConnectionOptions;
  production: MySQLConnectionOptions;
}

/**
 * MySQL配置验证结果
 */
export interface MySQLConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * MySQL配置管理器类
 */
export class MySQLConfigManager {
  private static instance: MySQLConfigManager;
  private configCache: Map<string, MySQLConfig> = new Map();
  private validationCache: Map<string, MySQLConfigValidationResult> = new Map();

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): MySQLConfigManager {
    if (!MySQLConfigManager.instance) {
      MySQLConfigManager.instance = new MySQLConfigManager();
    }
    return MySQLConfigManager.instance;
  }

  /**
   * 获取MySQL配置模板
   */
  getMySQLConfigTemplate(environment: string = 'development'): MySQLConfig {
    const cacheKey = `template_${environment}`;
    
    if (this.configCache.has(cacheKey)) {
      return this.configCache.get(cacheKey)!;
    }

    const config = this.createMySQLConfigForEnvironment(environment);
    this.configCache.set(cacheKey, config);
    
    return config;
  }

  /**
   * 根据环境创建MySQL配置
   */
  private createMySQLConfigForEnvironment(environment: string): MySQLConfig {
    const isTest = environment === 'test';
    const isProduction = environment === 'production';

    return {
      type: DatabaseType.MYSQL,
      host: this.getEnvValue('HOST', '127.0.0.1'),
      port: this.getEnvNumberValue('PORT', 3306),
      user: this.getEnvValue('USER', 'root'),
      password: this.getEnvValue('PASSWORD', '111111'),
      database: this.getOptionalEnvValue('NAME', 'afa_office'),
      
      // 连接池配置 - 根据环境调整
      connectionLimit: isTest ? 5 : (isProduction ? 20 : 10),
      acquireTimeout: isTest ? 30000 : 60000,
      timeout: isTest ? 30000 : 60000,
      queueLimit: 0,
      idleTimeout: isTest ? 60000 : 300000,
      
      // MySQL特定配置
      multipleStatements: true,
      reconnect: true,
      
      // 性能优化配置
      charset: 'utf8mb4',
      timezone: '+00:00',
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: false,
      
      // 安全配置
      ssl: isProduction ? this.getSSLConfig() : false,
      
      // 调试配置
      debug: !isProduction && this.getEnvBooleanValue('DEBUG', false),
      trace: false
    };
  }

  /**
   * 获取环境变量值
   */
  private getEnvValue(suffix: string, defaultValue: string): string {
    // 优先使用测试环境变量，然后是生产环境变量，最后是默认值
    const testKey = `TEST_DB_${suffix}`;
    const prodKey = `DB_${suffix}`;
    const mysqlKey = `MYSQL_${suffix}`;
    
    return process.env[testKey] || process.env[prodKey] || process.env[mysqlKey] || defaultValue;
  }

  /**
   * 获取可选环境变量值
   */
  private getOptionalEnvValue(suffix: string, defaultValue?: string): string | undefined {
    const testKey = `TEST_DB_${suffix}`;
    const prodKey = `DB_${suffix}`;
    const mysqlKey = `MYSQL_${suffix}`;
    
    return process.env[testKey] || process.env[prodKey] || process.env[mysqlKey] || defaultValue;
  }

  /**
   * 获取环境变量数字值
   */
  private getEnvNumberValue(suffix: string, defaultValue: number): number {
    const value = this.getOptionalEnvValue(suffix, defaultValue.toString());
    return value ? parseInt(value, 10) : defaultValue;
  }

  /**
   * 获取环境变量布尔值
   */
  private getEnvBooleanValue(suffix: string, defaultValue: boolean): boolean {
    const value = this.getOptionalEnvValue(suffix, defaultValue.toString());
    return value ? value.toLowerCase() === 'true' : defaultValue;
  }

  /**
   * 获取SSL配置
   */
  private getSSLConfig(): object | boolean {
    const sslEnabled = this.getEnvBooleanValue('SSL_ENABLED', false);
    if (!sslEnabled) {
      return false;
    }

    return {
      ca: this.getOptionalEnvValue('SSL_CA'),
      cert: this.getOptionalEnvValue('SSL_CERT'),
      key: this.getOptionalEnvValue('SSL_KEY'),
      rejectUnauthorized: this.getEnvBooleanValue('SSL_REJECT_UNAUTHORIZED', true)
    };
  }

  /**
   * 验证MySQL配置
   */
  validateMySQLConfig(config: MySQLConfig): MySQLConfigValidationResult {
    const configKey = JSON.stringify(config);
    
    if (this.validationCache.has(configKey)) {
      return this.validationCache.get(configKey)!;
    }

    const result = this.performMySQLConfigValidation(config);
    this.validationCache.set(configKey, result);
    
    return result;
  }

  /**
   * 执行MySQL配置验证
   */
  private performMySQLConfigValidation(config: MySQLConfig): MySQLConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // 基础配置验证
    if (!config.host || config.host.trim() === '') {
      errors.push('MySQL主机地址不能为空');
    }

    if (!config.port || config.port <= 0 || config.port > 65535) {
      errors.push('MySQL端口必须在1-65535之间');
    }

    if (!config.user || config.user.trim() === '') {
      errors.push('MySQL用户名不能为空');
    }

    if (!config.password || config.password.trim() === '') {
      errors.push('MySQL密码不能为空');
    }

    // 连接池配置验证
    if (config.connectionLimit) {
      if (config.connectionLimit <= 0) {
        errors.push('连接池大小必须大于0');
      } else if (config.connectionLimit > 100) {
        warnings.push('连接池大小超过100可能会消耗过多资源');
        recommendations.push('建议将连接池大小控制在10-50之间');
      }
    }

    if (config.acquireTimeout && config.acquireTimeout <= 0) {
      errors.push('获取连接超时时间必须大于0');
    }

    if (config.timeout && config.timeout <= 0) {
      errors.push('查询超时时间必须大于0');
    }

    // 性能配置建议
    if (!config.charset || config.charset !== 'utf8mb4') {
      recommendations.push('建议使用utf8mb4字符集以支持完整的Unicode字符');
    }

    if (!config.timezone || config.timezone !== '+00:00') {
      recommendations.push('建议设置timezone为+00:00以确保时间一致性');
    }

    if (!config.supportBigNumbers) {
      recommendations.push('建议启用supportBigNumbers以正确处理大数字');
    }

    if (!config.bigNumberStrings) {
      recommendations.push('建议启用bigNumberStrings以避免精度丢失');
    }

    // 安全配置建议
    if (config.host !== 'localhost' && config.host !== '127.0.0.1' && !config.ssl) {
      warnings.push('连接到远程MySQL服务器时建议启用SSL');
    }

    if (config.user === 'root') {
      warnings.push('生产环境中不建议使用root用户连接数据库');
    }

    if (config.password && config.password.length < 8) {
      warnings.push('密码长度过短，建议使用更强的密码');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * 获取优化的MySQL配置
   */
  getOptimizedMySQLConfig(baseConfig: MySQLConfig, environment: string = 'development'): MySQLConfig {
    const optimizedConfig = { ...baseConfig };

    // 根据环境优化配置
    switch (environment) {
      case 'test':
        optimizedConfig.connectionLimit = Math.min(optimizedConfig.connectionLimit || 10, 5);
        optimizedConfig.acquireTimeout = Math.min(optimizedConfig.acquireTimeout || 60000, 30000);
        optimizedConfig.timeout = Math.min(optimizedConfig.timeout || 60000, 30000);
        optimizedConfig.idleTimeout = Math.min(optimizedConfig.idleTimeout || 300000, 60000);
        optimizedConfig.debug = false; // 测试环境关闭调试
        break;

      case 'production':
        optimizedConfig.connectionLimit = Math.max(optimizedConfig.connectionLimit || 10, 10);
        optimizedConfig.acquireTimeout = Math.max(optimizedConfig.acquireTimeout || 60000, 60000);
        optimizedConfig.timeout = Math.max(optimizedConfig.timeout || 60000, 60000);
        optimizedConfig.debug = false; // 生产环境关闭调试
        optimizedConfig.trace = false; // 生产环境关闭跟踪
        break;

      case 'development':
      default:
        // 开发环境保持默认配置
        break;
    }

    // 应用性能优化
    optimizedConfig.charset = 'utf8mb4';
    optimizedConfig.timezone = '+00:00';
    optimizedConfig.supportBigNumbers = true;
    optimizedConfig.bigNumberStrings = true;
    optimizedConfig.dateStrings = false;
    optimizedConfig.multipleStatements = true;
    optimizedConfig.reconnect = true;

    return optimizedConfig;
  }

  /**
   * 生成MySQL配置摘要
   */
  getMySQLConfigSummary(config: MySQLConfig): string {
    const summary = [
      `MySQL服务器: ${config.host}:${config.port}`,
      `用户: ${config.user}`,
      `数据库: ${config.database || '(未指定)'}`,
      `连接池: ${config.connectionLimit || 10}`,
      `字符集: ${config.charset || 'default'}`,
      `SSL: ${config.ssl ? '启用' : '禁用'}`
    ];

    return summary.join(' | ');
  }

  /**
   * 检查MySQL配置兼容性
   */
  checkMySQLCompatibility(config: MySQLConfig): { compatible: boolean; issues: string[] } {
    const issues: string[] = [];

    // 检查MySQL版本兼容性（基于配置推断）
    if (config.charset === 'utf8mb4' && !config.supportBigNumbers) {
      issues.push('使用utf8mb4字符集时建议启用supportBigNumbers');
    }

    // 检查连接池配置合理性
    if (config.connectionLimit && config.acquireTimeout) {
      const timeoutPerConnection = config.acquireTimeout / config.connectionLimit;
      if (timeoutPerConnection < 1000) {
        issues.push('连接池配置可能导致频繁超时，建议增加acquireTimeout或减少connectionLimit');
      }
    }

    // 检查SSL配置一致性
    if (config.ssl && typeof config.ssl === 'object') {
      const sslConfig = config.ssl as any;
      if (!sslConfig.ca && !sslConfig.cert && !sslConfig.key) {
        issues.push('SSL配置不完整，可能导致连接失败');
      }
    }

    return {
      compatible: issues.length === 0,
      issues
    };
  }

  /**
   * 清理配置缓存
   */
  clearCache(): void {
    this.configCache.clear();
    this.validationCache.clear();
  }

  /**
   * 获取MySQL环境变量配置指南
   */
  getMySQLEnvironmentGuide(): string {
    return `
MySQL配置环境变量指南:

基础连接配置:
  TEST_DB_HOST=127.0.0.1              # MySQL主机地址
  TEST_DB_PORT=3306                   # MySQL端口
  TEST_DB_USER=root                   # MySQL用户名
  TEST_DB_PASSWORD=111111             # MySQL密码
  TEST_DB_NAME=test_database          # MySQL数据库名（可选）

连接池配置:
  TEST_DB_CONNECTION_LIMIT=10         # 连接池大小
  TEST_DB_ACQUIRE_TIMEOUT=60000       # 获取连接超时时间(ms)
  TEST_DB_TIMEOUT=60000               # 查询超时时间(ms)
  TEST_DB_IDLE_TIMEOUT=300000         # 空闲连接超时时间(ms)

SSL配置:
  TEST_DB_SSL_ENABLED=false           # 是否启用SSL
  TEST_DB_SSL_CA=/path/to/ca.pem      # CA证书路径
  TEST_DB_SSL_CERT=/path/to/cert.pem  # 客户端证书路径
  TEST_DB_SSL_KEY=/path/to/key.pem    # 客户端私钥路径
  TEST_DB_SSL_REJECT_UNAUTHORIZED=true # 是否拒绝未授权连接

调试配置:
  TEST_DB_DEBUG=false                 # 是否启用调试模式

示例 .env 文件:
# MySQL测试环境配置
TEST_DB_TYPE=mysql
TEST_DB_HOST=127.0.0.1
TEST_DB_PORT=3306
TEST_DB_USER=root
TEST_DB_PASSWORD=111111
TEST_DB_CONNECTION_LIMIT=5
TEST_DB_ACQUIRE_TIMEOUT=30000
TEST_DB_TIMEOUT=30000
    `.trim();
  }

  /**
   * 创建MySQL配置模板文件内容
   */
  generateMySQLConfigTemplate(): string {
    return `# MySQL数据库配置模板

# 基础连接配置
TEST_DB_TYPE=mysql
TEST_DB_HOST=127.0.0.1
TEST_DB_PORT=3306
TEST_DB_USER=root
TEST_DB_PASSWORD=111111
TEST_DB_NAME=

# 连接池配置
TEST_DB_CONNECTION_LIMIT=10
TEST_DB_ACQUIRE_TIMEOUT=60000
TEST_DB_TIMEOUT=60000
TEST_DB_IDLE_TIMEOUT=300000

# SSL配置（生产环境建议启用）
TEST_DB_SSL_ENABLED=false
# TEST_DB_SSL_CA=/path/to/ca.pem
# TEST_DB_SSL_CERT=/path/to/cert.pem
# TEST_DB_SSL_KEY=/path/to/key.pem
# TEST_DB_SSL_REJECT_UNAUTHORIZED=true

# 调试配置（开发环境可启用）
TEST_DB_DEBUG=false

# 生产环境配置示例
# DB_TYPE=mysql
# DB_HOST=your-mysql-server.com
# DB_PORT=3306
# DB_USER=app_user
# DB_PASSWORD=secure_password
# DB_NAME=production_db
# DB_CONNECTION_LIMIT=20
# DB_SSL_ENABLED=true
`;
  }
}

// 导出单例实例
export const mySQLConfigManager = MySQLConfigManager.getInstance();

// 导出便捷函数
export const getMySQLConfigTemplate = (environment?: string) => 
  mySQLConfigManager.getMySQLConfigTemplate(environment);

export const validateMySQLConfig = (config: MySQLConfig) => 
  mySQLConfigManager.validateMySQLConfig(config);

export const getOptimizedMySQLConfig = (config: MySQLConfig, environment?: string) => 
  mySQLConfigManager.getOptimizedMySQLConfig(config, environment);

export const getMySQLConfigSummary = (config: MySQLConfig) => 
  mySQLConfigManager.getMySQLConfigSummary(config);

export const checkMySQLCompatibility = (config: MySQLConfig) => 
  mySQLConfigManager.checkMySQLCompatibility(config);

export const getMySQLEnvironmentGuide = () => 
  mySQLConfigManager.getMySQLEnvironmentGuide();