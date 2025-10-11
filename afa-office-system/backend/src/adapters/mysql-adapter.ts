/**
 * MySQL数据库适配器实现
 */

import mysql from 'mysql2/promise';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DatabaseAdapter, RunResult, Transaction } from '../interfaces/database-adapter';
import { DatabaseConfig, MySQLConfig, DatabaseType } from '../config/database-config-manager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * MySQL事务实现
 */
class MySQLTransaction implements Transaction {
  constructor(private connection: mysql.PoolConnection) {}

  async commit(): Promise<void> {
    await this.connection.commit();
    this.connection.release();
  }

  async rollback(): Promise<void> {
    await this.connection.rollback();
    this.connection.release();
  }
}

/**
 * MySQL适配器实现
 */
export class MySQLAdapter implements DatabaseAdapter {
  private pool: mysql.Pool | null = null;
  private config: MySQLConfig | null = null;
  private ready = false;
  private currentDatabase: string | null = null;

  /**
   * 连接到MySQL数据库
   */
  async connect(config: DatabaseConfig): Promise<void> {
    if (config.type !== DatabaseType.MYSQL) {
      throw new Error('MySQLAdapter只能用于MySQL配置');
    }

    this.config = config as MySQLConfig;
    
    try {
      // 创建连接池
      const poolConfig: any = {
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        connectionLimit: this.config.connectionLimit || 10,
        acquireTimeout: this.config.acquireTimeout || 60000,
        timeout: this.config.timeout || 60000,
        multipleStatements: this.config.multipleStatements !== false,
        // 连接配置优化
        charset: 'utf8mb4',
        timezone: '+00:00',
        supportBigNumbers: true,
        bigNumberStrings: true,
        dateStrings: false,
        debug: false,
        trace: false,
        // 连接池配置
        queueLimit: 0,
        idleTimeout: 300000, // 5分钟空闲超时
        // SSL配置（如果需要）
        ssl: false
      };
      
      this.pool = mysql.createPool(poolConfig);

      // 测试连接
      const pingResult = await this.ping();
      if (!pingResult) {
        throw new Error('MySQL连接测试失败');
      }
      
      this.ready = true;
      console.log(`✅ MySQL连接成功: ${this.config.host}:${this.config.port}`);
    } catch (error) {
      this.ready = false;
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
      
      // 提供更详细的错误信息
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED') || error.code === 'ECONNREFUSED') {
          throw new Error(`MySQL服务器连接失败: ${this.config.host}:${this.config.port}。请确保MySQL服务正在运行。`);
        } else if (error.message.includes('ER_ACCESS_DENIED_ERROR') || (error as any).code === 'ER_ACCESS_DENIED_ERROR') {
          throw new Error(`MySQL认证失败: 用户名或密码错误 (${this.config.user})`);
        } else if (error.message.includes('ER_BAD_DB_ERROR') || (error as any).code === 'ER_BAD_DB_ERROR') {
          throw new Error(`MySQL数据库不存在: ${this.config.database}`);
        } else if (error.message.includes('ERR_SOCKET_BAD_PORT') || (error as any).code === 'ERR_SOCKET_BAD_PORT') {
          throw new Error(`MySQL端口无效: ${this.config.port}`);
        } else if (error.message.includes('ENOTFOUND') || (error as any).code === 'ENOTFOUND') {
          throw new Error(`MySQL主机无法解析: ${this.config.host}`);
        } else {
          throw new Error(`MySQL连接错误: ${error.message}`);
        }
      }
      throw error;
    }
  }

  /**
   * 断开数据库连接
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.ready = false;
    console.log('🔌 MySQL连接已断开');
  }

  /**
   * 检查连接是否就绪
   */
  isReady(): boolean {
    return this.ready && this.pool !== null;
  }

  /**
   * 确保选择了正确的数据库
   */
  private async ensureDatabase(connection?: mysql.PoolConnection): Promise<void> {
    if (this.currentDatabase) {
      if (connection) {
        await connection.query(`USE \`${this.currentDatabase}\``);
      } else if (this.pool) {
        // USE命令不支持prepared statements，需要使用query
        const tempConnection = await this.pool.getConnection();
        try {
          await tempConnection.query(`USE \`${this.currentDatabase}\``);
        } finally {
          tempConnection.release();
        }
      }
    }
  }

  /**
   * 执行SQL语句（INSERT, UPDATE, DELETE等）
   */
  async run(sql: string, params: any[] = []): Promise<RunResult> {
    if (!this.pool) {
      throw new Error('MySQL连接未初始化');
    }

    try {
      // 确保选择了正确的数据库
      await this.ensureDatabase();
      
      const [result] = await this.pool.execute(sql, params);
      
      // 处理不同类型的结果
      if (Array.isArray(result)) {
        return { changes: result.length };
      } else if (typeof result === 'object' && result !== null) {
        const mysqlResult = result as mysql.ResultSetHeader;
        return {
          lastID: mysqlResult.insertId,
          changes: mysqlResult.affectedRows
        };
      }
      
      return { changes: 0 };
    } catch (error) {
      console.error('MySQL执行错误:', error);
      throw error;
    }
  }

  /**
   * 查询单条记录
   */
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (!this.pool) {
      throw new Error('MySQL连接未初始化');
    }

    try {
      // 确保选择了正确的数据库
      await this.ensureDatabase();
      
      const [rows] = await this.pool.execute(sql, params);
      const results = rows as T[];
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error('MySQL查询错误:', error);
      throw error;
    }
  }

  /**
   * 查询多条记录
   */
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.pool) {
      throw new Error('MySQL连接未初始化');
    }

    try {
      // 确保选择了正确的数据库
      await this.ensureDatabase();
      
      const [rows] = await this.pool.execute(sql, params);
      return rows as T[];
    } catch (error) {
      console.error('MySQL查询错误:', error);
      throw error;
    }
  }

  /**
   * 开始事务
   */
  async beginTransaction(): Promise<Transaction> {
    if (!this.pool) {
      throw new Error('MySQL连接未初始化');
    }

    const connection = await this.pool.getConnection();
    // 确保选择了正确的数据库
    await this.ensureDatabase(connection);
    await connection.beginTransaction();
    return new MySQLTransaction(connection);
  }

  /**
   * 创建测试数据库
   */
  async createTestDatabase(dbName: string): Promise<void> {
    if (!this.pool) {
      throw new Error('MySQL连接未初始化');
    }

    // 验证数据库名称（防止SQL注入）
    if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
      throw new Error(`无效的数据库名称: ${dbName}`);
    }

    try {
      // 创建数据库 - 使用query而不是execute，因为DDL命令不支持prepared statements
      const connection = await this.pool.getConnection();
      try {
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await connection.query(`USE \`${dbName}\``);
        // 记录当前数据库
        this.currentDatabase = dbName;
      } finally {
        connection.release();
      }
      
      console.log(`📦 MySQL测试数据库已创建: ${dbName}`);
    } catch (error) {
      console.error(`创建MySQL测试数据库失败: ${dbName}`, error);
      throw error;
    }
  }

  /**
   * 删除测试数据库
   */
  async dropTestDatabase(dbName: string): Promise<void> {
    if (!this.pool) {
      throw new Error('MySQL连接未初始化');
    }

    // 验证数据库名称（防止SQL注入）
    if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
      throw new Error(`无效的数据库名称: ${dbName}`);
    }

    try {
      // 使用query而不是execute，因为DDL命令不支持prepared statements
      const connection = await this.pool.getConnection();
      try {
        await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
      } finally {
        connection.release();
      }
      console.log(`🗑️ MySQL测试数据库已删除: ${dbName}`);
    } catch (error) {
      console.error(`删除MySQL测试数据库失败: ${dbName}`, error);
      throw error;
    }
  }

  /**
   * 初始化数据库结构
   */
  async initializeSchema(dbName: string): Promise<void> {
    if (!this.pool) {
      throw new Error('MySQL连接未初始化');
    }

    try {
      const connection = await this.pool.getConnection();
      try {
        // 确保使用正确的数据库
        await connection.query(`USE \`${dbName}\``);
        
        // 读取MySQL schema文件
        const schemaPath = join(__dirname, '../../database/mysql-test-schema.sql');
        const schemaSQL = await readFile(schemaPath, 'utf-8');
        
        // 分割SQL语句并执行
        const statements = schemaSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);
        
        for (const statement of statements) {
          if (statement.trim()) {
            await connection.query(statement);
          }
        }
      } finally {
        connection.release();
      }
      
      console.log(`🏗️ MySQL数据库结构初始化完成: ${dbName}`);
    } catch (error) {
      console.error(`初始化MySQL数据库结构失败: ${dbName}`, error);
      throw error;
    }
  }

  /**
   * 检查数据库连接
   */
  async ping(): Promise<boolean> {
    if (!this.pool) {
      return false;
    }

    try {
      const result = await this.get('SELECT 1 as ping');
      // MySQL可能返回数字或字符串，都需要处理
      return result?.ping == 1; // 使用==而不是===来处理类型转换
    } catch (error) {
      console.error('MySQL ping失败:', error);
      return false;
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    await this.disconnect();
  }

  /**
   * 获取连接池状态信息
   */
  getPoolStatus(): any {
    if (!this.pool) {
      return null;
    }

    // 注意：mysql2的连接池没有直接暴露状态信息
    // 这里返回基本配置信息
    return {
      config: this.config,
      ready: this.ready
    };
  }

  /**
   * 执行原始SQL（支持多语句）
   */
  async executeRaw(sql: string): Promise<any> {
    if (!this.pool) {
      throw new Error('MySQL连接未初始化');
    }

    try {
      const connection = await this.pool.getConnection();
      try {
        // 确保选择了正确的数据库
        await this.ensureDatabase(connection);
        const [results] = await connection.query(sql);
        return results;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('MySQL原始SQL执行错误:', error);
      throw error;
    }
  }
}