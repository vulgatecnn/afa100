/**
 * 数据库适配器接口
 * 提供统一的数据库操作接口，支持MySQL和SQLite
 */

export interface RunResult {
  lastID?: number;
  changes?: number;
  insertId?: number;
  affectedRows?: number;
}

export interface DatabaseConfig {
  type: 'mysql' | 'sqlite';
}

export interface MySQLConfig extends DatabaseConfig {
  type: 'mysql';
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
  connectionLimit?: number;
  acquireTimeout?: number;
  timeout?: number;
  charset?: string;
  timezone?: string;
}

export interface SQLiteConfig extends DatabaseConfig {
  type: 'sqlite';
  path: string;
}

export type DatabaseConnectionConfig = MySQLConfig | SQLiteConfig;

/**
 * 数据库适配器统一接口
 */
export interface DatabaseAdapter {
  /**
   * 连接数据库
   */
  connect(config: DatabaseConnectionConfig): Promise<void>;
  
  /**
   * 断开数据库连接
   */
  disconnect(): Promise<void>;
  
  /**
   * 检查连接是否就绪
   */
  isReady(): boolean;
  
  /**
   * 执行SQL语句（INSERT, UPDATE, DELETE等）
   */
  run(sql: string, params?: any[]): Promise<RunResult>;
  
  /**
   * 查询单条记录
   */
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  
  /**
   * 查询多条记录
   */
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  
  /**
   * 开始事务
   */
  beginTransaction(): Promise<void>;
  
  /**
   * 提交事务
   */
  commit(): Promise<void>;
  
  /**
   * 回滚事务
   */
  rollback(): Promise<void>;
  
  /**
   * 创建测试数据库（仅MySQL）
   * @param dbName 可选的数据库名称，如果不提供则自动生成
   * @returns 创建的数据库名称
   */
  createTestDatabase?(dbName?: string): Promise<string>;
  
  /**
   * 删除测试数据库（仅MySQL）
   */
  dropTestDatabase?(dbName: string): Promise<void>;
  
  /**
   * 检查数据库是否存在（仅MySQL）
   */
  databaseExists?(dbName: string): Promise<boolean>;
  
  /**
   * 清理过期的测试数据库（仅MySQL）
   * @param maxAge 最大年龄（毫秒），默认1小时
   * @returns 清理的数据库名称列表
   */
  cleanupTestDatabases?(maxAge?: number): Promise<string[]>;
  
  /**
   * 初始化数据库结构
   */
  initializeSchema(dbName?: string): Promise<void>;
  
  /**
   * 获取数据库类型
   */
  getType(): 'mysql' | 'sqlite';
  
  /**
   * 获取连接信息（用于调试）
   */
  getConnectionInfo(): string;

  /**
   * 获取数据库统计信息（仅MySQL）
   */
  getDatabaseStats?(dbName?: string): Promise<{
    tables: number;
    totalSize: number;
    indexSize: number;
    dataSize: number;
  }>;

  /**
   * 获取服务器状态（仅MySQL）
   */
  getServerStatus?(): Promise<{
    version: string;
    uptime: number;
    connections: number;
    queries: number;
  }>;

  /**
   * 优化表性能（仅MySQL）
   */
  optimizeTables?(dbName?: string): Promise<void>;
}

/**
 * 数据库错误类型
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(message, 'CONNECTION_ERROR', originalError);
    this.name = 'ConnectionError';
  }
}

export class QueryError extends DatabaseError {
  constructor(message: string, public sql?: string, originalError?: Error) {
    super(message, 'QUERY_ERROR', originalError);
    this.name = 'QueryError';
  }
}

export class TransactionError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(message, 'TRANSACTION_ERROR', originalError);
    this.name = 'TransactionError';
  }
}

/**
 * 数据库配置管理器
 */
export class DatabaseConfigManager {
  /**
   * 获取测试环境数据库配置
   */
  static getTestConfig(): DatabaseConnectionConfig {
    const dbType = process.env.TEST_DB_TYPE || 'sqlite';
    
    if (dbType === 'mysql') {
      return {
        type: 'mysql',
        host: process.env['TEST_DB_HOST'] || '127.0.0.1',
        port: parseInt(process.env['TEST_DB_PORT'] || '3306'),
        user: process.env['TEST_DB_USER'] || 'root',
        password: process.env['TEST_DB_PASSWORD'] || '111111',
        database: process.env['TEST_DB_NAME'], // 测试时动态创建
        connectionLimit: parseInt(process.env['TEST_DB_CONNECTION_LIMIT'] || '10'),
        acquireTimeout: parseInt(process.env['TEST_DB_ACQUIRE_TIMEOUT'] || '60000'),
        timeout: parseInt(process.env['TEST_DB_TIMEOUT'] || '60000'),
        charset: 'utf8mb4',
        timezone: '+00:00'
      };
    }
    
    // 默认SQLite配置
    return {
      type: 'sqlite',
      path: process.env.DB_TEST_PATH || ':memory:'
    };
  }
  
  /**
   * 验证数据库配置
   */
  static validateConfig(config: DatabaseConnectionConfig): void {
    if (config.type === 'mysql') {
      if (!config.host || !config.user) {
        throw new Error('MySQL配置缺少必要参数: host, user');
      }
      if (config.port < 1 || config.port > 65535) {
        throw new Error('MySQL端口号无效');
      }
    } else if (config.type === 'sqlite') {
      if (!config.path) {
        throw new Error('SQLite配置缺少path参数');
      }
    } else {
      throw new Error(`不支持的数据库类型: ${(config as any).type}`);
    }
  }
  
  /**
   * 获取连接字符串（用于日志）
   */
  static getConnectionString(config: DatabaseConnectionConfig): string {
    if (config.type === 'mysql') {
      return `mysql://${config.user}@${config.host}:${config.port}/${config.database || 'default'}`;
    } else {
      return `sqlite://${config.path}`;
    }
  }
}