/**
 * 数据库配置管理器
 * 支持MySQL和SQLite数据库的配置管理
 */

import dotenv from 'dotenv';

dotenv.config();

// 数据库类型枚举
export enum DatabaseType {
  MYSQL = 'mysql',
  SQLITE = 'sqlite'
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
  multipleStatements?: boolean;
  reconnect?: boolean;
}

// SQLite配置接口
export interface SQLiteConfig extends BaseDatabaseConfig {
  type: DatabaseType.SQLITE;
  path: string;
  mode?: number;
  pragmas?: Record<string, string | number>;
}

// 联合数据库配置类型
export type DatabaseConfig = MySQLConfig | SQLiteConfig;

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
    const dbType = process.env.TEST_DB_TYPE || process.env.DB_TYPE || 'sqlite';
    return dbType.toLowerCase() === 'mysql' ? DatabaseType.MYSQL : DatabaseType.SQLITE;
  }

  /**
   * 获取MySQL配置模板
   */
  private getMySQLConfigTemplate(): MySQLConfig {
    return {
      type: DatabaseType.MYSQL,
      host: process.env.TEST_DB_HOST || process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.TEST_DB_PORT || process.env.DB_PORT || '3306'),
      user: process.env.TEST_DB_USER || process.env.DB_USER || 'root',
      password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || '111111',
      database: process.env.TEST_DB_NAME || process.env.DB_NAME,
      connectionLimit: parseInt(process.env.TEST_DB_CONNECTION_LIMIT || '10'),
      acquireTimeout: parseInt(process.env.TEST_DB_ACQUIRE_TIMEOUT || '60000'),
      timeout: parseInt(process.env.TEST_DB_TIMEOUT || '60000'),
      multipleStatements: true,
      reconnect: true
    };
  }

  /**
   * 获取SQLite配置模板
   */
  private getSQLiteConfigTemplate(): SQLiteConfig {
    const isTest = process.env.NODE_ENV === 'test';
    return {
      type: DatabaseType.SQLITE,
      path: isTest 
        ? (process.env.DB_TEST_PATH || ':memory:')
        : (process.env.DB_PATH || './database/afa_office.db'),
      pragmas: {
        foreign_keys: 'ON',
        journal_mode: isTest ? 'DELETE' : 'WAL',
        synchronous: isTest ? 'FULL' : 'NORMAL',
        cache_size: isTest ? 5000 : 10000,
        temp_store: 'MEMORY',
        busy_timeout: isTest ? 10000 : 30000
      }
    };
  }

  /**
   * 获取当前数据库配置
   */
  getConfig(): DatabaseConfig {
    if (this.config) {
      return this.config;
    }

    const dbType = this.getDatabaseType();
    
    if (dbType === DatabaseType.MYSQL) {
      this.config = this.getMySQLConfigTemplate();
    } else {
      this.config = this.getSQLiteConfigTemplate();
    }

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

    return errors;
  }

  /**
   * 验证SQLite配置
   */
  private validateSQLiteConfig(config: SQLiteConfig): string[] {
    const errors: string[] = [];

    if (!config.path) {
      errors.push('SQLite数据库路径不能为空');
    }

    return errors;
  }

  /**
   * 验证数据库配置
   */
  validateConfig(config?: DatabaseConfig): string[] {
    const configToValidate = config || this.getConfig();

    if (configToValidate.type === DatabaseType.MYSQL) {
      return this.validateMySQLConfig(configToValidate as MySQLConfig);
    } else {
      return this.validateSQLiteConfig(configToValidate as SQLiteConfig);
    }
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

    if (configToSummarize.type === DatabaseType.MYSQL) {
      const mysqlConfig = configToSummarize as MySQLConfig;
      return `MySQL数据库 ${mysqlConfig.host}:${mysqlConfig.port}/${mysqlConfig.database || '(未指定)'} 用户: ${mysqlConfig.user}`;
    } else {
      const sqliteConfig = configToSummarize as SQLiteConfig;
      return `SQLite数据库 ${sqliteConfig.path}`;
    }
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

通用配置:
  TEST_DB_TYPE=mysql|sqlite          # 测试环境数据库类型
  DB_TYPE=mysql|sqlite               # 生产环境数据库类型

MySQL配置:
  TEST_DB_HOST=127.0.0.1            # MySQL主机地址
  TEST_DB_PORT=3306                 # MySQL端口
  TEST_DB_USER=root                 # MySQL用户名
  TEST_DB_PASSWORD=111111           # MySQL密码
  TEST_DB_NAME=test_database        # MySQL数据库名（可选）
  TEST_DB_CONNECTION_LIMIT=10       # 连接池大小
  TEST_DB_ACQUIRE_TIMEOUT=60000     # 获取连接超时时间(ms)
  TEST_DB_TIMEOUT=60000             # 查询超时时间(ms)

SQLite配置:
  DB_TEST_PATH=:memory:             # 测试环境SQLite路径
  DB_PATH=./database/afa_office.db  # 生产环境SQLite路径

示例 .env 文件:
# 使用MySQL作为测试数据库
TEST_DB_TYPE=mysql
TEST_DB_HOST=127.0.0.1
TEST_DB_PORT=3306
TEST_DB_USER=root
TEST_DB_PASSWORD=111111

# 使用SQLite作为测试数据库
# TEST_DB_TYPE=sqlite
# DB_TEST_PATH=:memory:
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