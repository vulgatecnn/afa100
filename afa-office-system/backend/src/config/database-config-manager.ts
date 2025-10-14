/**
 * 数据库配置管理器
 * 支持MySQL数据库的配置管理
 */

import * as dotenv from 'dotenv';

dotenv.config();

// 数据库类型枚举
export enum DatabaseType {
  MYSQL = 'mysql'
}

// 基础数据库配置接口
export interface BaseDatabaseConfig {
  type: DatabaseType;
}

// MySQL配置接口
export interface MySQLConfig extends BaseDatabaseConfig {
  type: DatabaseType.MYSQL;
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string | undefined;
  connectionLimit?: number;
  acquireTimeout?: number;
  timeout?: number;
  queueLimit?: number;
  idleTimeout?: number;
  multipleStatements?: boolean;
  reconnect?: boolean;
  // MySQL特定属性
  charset?: string;
  timezone?: string;
  ssl?: boolean | object;
  supportBigNumbers?: boolean;
  bigNumberStrings?: boolean;
  dateStrings?: boolean;
  debug?: boolean;
  trace?: boolean;
  // 连接池特定属性
  waitForConnections?: boolean;
  maxIdle?: number;
  // 连接属性
  connectTimeout?: number;
  localAddress?: string;
  socketPath?: string;
  stringifyObjects?: boolean;
  insecureAuth?: boolean;
  typeCast?: any;
  queryFormat?: (query: string, values: any) => void;
  flags?: Array<string>;
  rowsAsArray?: boolean;
  enableKeepAlive?: boolean;
  keepAliveInitialDelay?: number;
  compress?: boolean;
  authSwitchHandler?: (data: any, callback: () => void) => any;
  connectAttributes?: { [param: string]: any };
  maxPreparedStatements?: number;
  namedPlaceholders?: boolean;
  nestTables?: boolean | string;
  passwordSha1?: string;
  jsonStrings?: boolean;
}

// 数据库配置类型（仅支持MySQL）
export type DatabaseConfig = MySQLConfig;

/**
 * 数据库配置管理器类
 */
export class DatabaseConfigManager {
  private static instance: DatabaseConfigManager;
  private config: DatabaseConfig | null = null;

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): DatabaseConfigManager {
    if (!DatabaseConfigManager.instance) {
      DatabaseConfigManager.instance = new DatabaseConfigManager();
    }
    return DatabaseConfigManager.instance;
  }

  /**
   * 获取数据库类型
   */
  getDatabaseType(): DatabaseType {
    return DatabaseType.MYSQL;
  }

  /**
   * 获取MySQL配置模板
   */
  private getMySQLConfigTemplate(): MySQLConfig {
    return {
      type: DatabaseType.MYSQL,
      host: process.env['TEST_DB_HOST'] || process.env['DB_HOST'] || '127.0.0.1',
      port: parseInt(process.env['TEST_DB_PORT'] || process.env['DB_PORT'] || '3306'),
      user: process.env['TEST_DB_USER'] || process.env['DB_USER'] || 'root',
      password: process.env['TEST_DB_PASSWORD'] || process.env['DB_PASSWORD'] || '111111',
      database: process.env['TEST_DB_NAME'] || process.env['DB_NAME'],
      connectionLimit: parseInt(process.env['TEST_DB_CONNECTION_LIMIT'] || '10'),
      acquireTimeout: parseInt(process.env['TEST_DB_ACQUIRE_TIMEOUT'] || '60000'),
      timeout: parseInt(process.env['TEST_DB_TIMEOUT'] || '60000'),
      queueLimit: parseInt(process.env['TEST_DB_QUEUE_LIMIT'] || '0'),
      idleTimeout: parseInt(process.env['TEST_DB_IDLE_TIMEOUT'] || '300000'),
      multipleStatements: true,
      reconnect: true,
      // MySQL特定属性
      charset: process.env['TEST_DB_CHARSET'] || 'utf8mb4',
      timezone: process.env['TEST_DB_TIMEZONE'] || '+00:00',
      ssl: process.env['TEST_DB_SSL'] === 'true' ? true : false,
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: false,
      debug: process.env.NODE_ENV === 'development',
      trace: false
    };
  }



  /**
   * 获取当前数据库配置
   */
  getConfig(): DatabaseConfig {
    if (this.config) {
      return this.config;
    }

    this.config = this.getMySQLConfigTemplate();
    return this.config;
  }

  /**
   * 验证MySQL配置
   */
  private validateMySQLConfig(config: MySQLConfig): string[] {
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

    if (config.connectionLimit && (config.connectionLimit <= 0 || config.connectionLimit > 100)) {
      errors.push('MySQL连接池大小必须在1-100之间');
    }

    if (config.acquireTimeout && config.acquireTimeout <= 0) {
      errors.push('MySQL获取连接超时时间必须大于0');
    }

    if (config.timeout && config.timeout <= 0) {
      errors.push('MySQL查询超时时间必须大于0');
    }

    if (config.queueLimit && config.queueLimit < 0) {
      errors.push('MySQL队列限制不能小于0');
    }

    if (config.idleTimeout && config.idleTimeout <= 0) {
      errors.push('MySQL空闲超时时间必须大于0');
    }

    return errors;
  }



  /**
   * 验证数据库配置
   */
  validateConfig(config?: DatabaseConfig): string[] {
    const configToValidate = config || this.getConfig();
    return this.validateMySQLConfig(configToValidate);
  }

  /**
   * 检查配置是否有效
   */
  isConfigValid(config?: DatabaseConfig): boolean {
    const errors = this.validateConfig(config);
    return errors.length === 0;
  }

  /**
   * 获取配置摘要信息（用于日志记录，不包含敏感信息）
   */
  getConfigSummary(config?: DatabaseConfig): string {
    const configToSummarize = config || this.getConfig();
    return `MySQL数据库 ${configToSummarize.host}:${configToSummarize.port}/${configToSummarize.database || '(未指定)'} 用户: ${configToSummarize.user} 字符集: ${configToSummarize.charset || 'default'}`;
  }

  /**
   * 重置配置缓存
   */
  resetConfig(): void {
    this.config = null;
  }

  /**
   * 设置自定义配置
   */
  setConfig(config: DatabaseConfig): void {
    const errors = this.validateConfig(config);
    if (errors.length > 0) {
      throw new Error(`数据库配置无效: ${errors.join(', ')}`);
    }
    this.config = config;
  }

  /**
   * 获取环境变量配置指南
   */
  static getEnvironmentVariablesGuide(): string {
    return `
数据库配置环境变量指南:

MySQL配置:
  TEST_DB_HOST=127.0.0.1            # MySQL主机地址
  TEST_DB_PORT=3306                 # MySQL端口
  TEST_DB_USER=root                 # MySQL用户名
  TEST_DB_PASSWORD=111111           # MySQL密码
  TEST_DB_NAME=test_database        # MySQL数据库名（可选）
  TEST_DB_CONNECTION_LIMIT=10       # 连接池大小
  TEST_DB_ACQUIRE_TIMEOUT=60000     # 获取连接超时时间(ms)
  TEST_DB_TIMEOUT=60000             # 查询超时时间(ms)

示例 .env 文件:
# MySQL数据库配置
TEST_DB_HOST=127.0.0.1
TEST_DB_PORT=3306
TEST_DB_USER=root
TEST_DB_PASSWORD=111111
    `.trim();
  }
}

// 导出单例实例
export const databaseConfigManager = DatabaseConfigManager.getInstance();

// 导出便捷函数
export const getDatabaseConfig = () => databaseConfigManager.getConfig();
export const getDatabaseType = () => databaseConfigManager.getDatabaseType();
export const validateDatabaseConfig = (config?: DatabaseConfig) => databaseConfigManager.validateConfig(config);
export const isDatabaseConfigValid = (config?: DatabaseConfig) => databaseConfigManager.isConfigValid(config);
export const getDatabaseConfigSummary = (config?: DatabaseConfig) => databaseConfigManager.getConfigSummary(config);