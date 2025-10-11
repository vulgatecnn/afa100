/**
 * MySQL数据库适配器
 * 实现DatabaseAdapter接口，提供MySQL数据库操作功能
 */

import mysql from 'mysql2/promise';
import { readFile } from 'fs/promises';
import { join } from 'path';
import {
  DatabaseAdapter,
  MySQLConfig,
  DatabaseConnectionConfig,
  RunResult,
  ConnectionError,
  QueryError,
  TransactionError
} from './database-adapter.js';

export class MySQLAdapter implements DatabaseAdapter {
  private pool: mysql.Pool | null = null;
  private connection: mysql.PoolConnection | null = null;
  private config?: MySQLConfig;
  private inTransaction = false;
  private ready = false;

  /**
   * 连接MySQL数据库
   */
  async connect(config: DatabaseConnectionConfig): Promise<void> {
    if (config.type !== 'mysql') {
      throw new Error('MySQLAdapter只支持MySQL配置');
    }

    this.config = config;

    try {
      // 创建连接池
      const poolConfig: mysql.PoolOptions = {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        connectionLimit: config.connectionLimit || 10,
        // acquireTimeout在mysql2中不存在，使用idleTimeout替代
        idleTimeout: config.acquireTimeout || 60000,
        charset: config.charset || 'utf8mb4',
        timezone: config.timezone || '+00:00',
        multipleStatements: true
      };

      // 只有当数据库名存在时才设置database属性
      if (config.database) {
        poolConfig.database = config.database;
      }

      this.pool = mysql.createPool(poolConfig);

      // 测试连接
      const testConnection = await this.pool.getConnection();
      await testConnection.ping();
      testConnection.release();

      this.ready = true;
      console.log(`✅ MySQL连接成功: ${this.getConnectionInfo()}`);
    } catch (error) {
      this.ready = false;
      const err = error as any;
      
      if (err.code === 'ECONNREFUSED') {
        throw new ConnectionError(
          `MySQL服务器连接失败: ${config.host}:${config.port}。请确保MySQL服务正在运行。`,
          err
        );
      } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        throw new ConnectionError(
          `MySQL认证失败: 用户名或密码错误 (${config.user})`,
          err
        );
      } else if (err.code === 'ER_BAD_DB_ERROR') {
        throw new ConnectionError(
          `MySQL数据库不存在: ${config.database}`,
          err
        );
      } else {
        throw new ConnectionError(`MySQL连接错误: ${err.message}`, err);
      }
    }
  }

  /**
   * 断开数据库连接
   */
  async disconnect(): Promise<void> {
    try {
      if (this.connection) {
        this.connection.release();
        this.connection = null;
      }

      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }

      this.ready = false;
      this.inTransaction = false;
      console.log('📴 MySQL连接已断开');
    } catch (error) {
      console.warn('MySQL断开连接时出现警告:', error);
    }
  }

  /**
   * 检查连接是否就绪
   */
  isReady(): boolean {
    return this.ready && !!this.pool;
  }

  /**
   * 获取数据库连接
   */
  private async getConnection(): Promise<mysql.PoolConnection> {
    if (!this.pool) {
      throw new ConnectionError('MySQL连接池未初始化');
    }

    if (this.inTransaction && this.connection) {
      return this.connection;
    }

    if (!this.inTransaction) {
      return await this.pool.getConnection();
    }

    throw new TransactionError('事务状态异常');
  }

  /**
   * 释放数据库连接
   */
  private releaseConnection(connection: mysql.PoolConnection): void {
    if (!this.inTransaction) {
      connection.release();
    }
  }

  /**
   * 执行SQL语句
   */
  async run(sql: string, params: any[] = []): Promise<RunResult> {
    const connection = await this.getConnection();
    
    try {
      const [result] = await connection.execute(sql, params);
      
      // 处理不同类型的结果
      if (Array.isArray(result)) {
        // SELECT查询结果
        return { affectedRows: result.length };
      } else {
        // INSERT/UPDATE/DELETE结果
        const mysqlResult = result as mysql.ResultSetHeader;
        return {
          lastID: mysqlResult.insertId,
          insertId: mysqlResult.insertId,
          changes: mysqlResult.affectedRows,
          affectedRows: mysqlResult.affectedRows
        };
      }
    } catch (error) {
      const err = error as any;
      throw new QueryError(`SQL执行失败: ${err.message}`, sql, err);
    } finally {
      this.releaseConnection(connection);
    }
  }

  /**
   * 查询单条记录
   */
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const connection = await this.getConnection();
    
    try {
      const [rows] = await connection.execute(sql, params);
      const results = rows as T[];
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      const err = error as any;
      throw new QueryError(`查询失败: ${err.message}`, sql, err);
    } finally {
      this.releaseConnection(connection);
    }
  }

  /**
   * 查询多条记录
   */
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const connection = await this.getConnection();
    
    try {
      const [rows] = await connection.execute(sql, params);
      return rows as T[];
    } catch (error) {
      const err = error as any;
      throw new QueryError(`查询失败: ${err.message}`, sql, err);
    } finally {
      this.releaseConnection(connection);
    }
  }

  /**
   * 开始事务
   */
  async beginTransaction(): Promise<void> {
    if (this.inTransaction) {
      throw new TransactionError('事务已经开始');
    }

    try {
      this.connection = await this.getConnection();
      await this.connection.beginTransaction();
      this.inTransaction = true;
    } catch (error) {
      const err = error as any;
      throw new TransactionError(`开始事务失败: ${err.message}`, err);
    }
  }

  /**
   * 提交事务
   */
  async commit(): Promise<void> {
    if (!this.inTransaction || !this.connection) {
      throw new TransactionError('没有活跃的事务');
    }

    try {
      await this.connection.commit();
      this.connection.release();
      this.connection = null;
      this.inTransaction = false;
    } catch (error) {
      const err = error as any;
      throw new TransactionError(`提交事务失败: ${err.message}`, err);
    }
  }

  /**
   * 回滚事务
   */
  async rollback(): Promise<void> {
    if (!this.inTransaction || !this.connection) {
      throw new TransactionError('没有活跃的事务');
    }

    try {
      await this.connection.rollback();
      this.connection.release();
      this.connection = null;
      this.inTransaction = false;
    } catch (error) {
      const err = error as any;
      throw new TransactionError(`回滚事务失败: ${err.message}`, err);
    }
  }

  /**
   * 生成测试数据库名称
   */
  static generateTestDatabaseName(prefix: string = 'test'): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    // 确保在timestamp前加上字母前缀，避免以数字开头
    const dbName = `${prefix}_db_${timestamp}_${randomSuffix}`;
    
    // 确保数据库名称符合MySQL命名规范
    return dbName.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 64);
  }

  /**
   * 验证数据库名称
   */
  static validateDatabaseName(dbName: string): boolean {
    // MySQL数据库名称规则：
    // 1. 只能包含字母、数字、下划线
    // 2. 长度不超过64个字符
    // 3. 不能以数字开头
    // 4. 测试数据库必须以test_开头
    return /^test_[a-zA-Z0-9_]{1,59}$/.test(dbName) && 
           dbName.length <= 64 && 
           !/^[0-9]/.test(dbName.substring(5)); // 去掉test_前缀后不能以数字开头
  }

  /**
   * 检查数据库是否存在
   */
  async databaseExists(dbName: string): Promise<boolean> {
    if (!this.pool) {
      throw new ConnectionError('MySQL连接池未初始化');
    }

    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
        [dbName]
      );
      return Array.isArray(rows) && rows.length > 0;
    } catch (error) {
      const err = error as any;
      throw new QueryError(`检查数据库存在性失败: ${err.message}`, 'CHECK_DATABASE_EXISTS', err);
    } finally {
      connection.release();
    }
  }

  /**
   * 创建测试数据库
   */
  async createTestDatabase(dbName?: string): Promise<string> {
    if (!this.pool) {
      throw new ConnectionError('MySQL连接池未初始化');
    }

    // 如果没有提供数据库名称，自动生成一个
    const finalDbName = dbName || MySQLAdapter.generateTestDatabaseName();

    // 验证数据库名称安全性
    if (!MySQLAdapter.validateDatabaseName(finalDbName)) {
      throw new Error(`无效的测试数据库名称: ${finalDbName}`);
    }

    // 检查数据库是否已存在
    if (await this.databaseExists(finalDbName)) {
      console.warn(`⚠️ 测试数据库已存在: ${finalDbName}`);
      return finalDbName;
    }

    const connection = await this.pool.getConnection();
    
    try {
      // 创建数据库
      await connection.execute(`CREATE DATABASE \`${finalDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`📁 创建MySQL测试数据库: ${finalDbName}`);
      return finalDbName;
    } catch (error) {
      const err = error as any;
      throw new QueryError(`创建数据库失败: ${err.message}`, `CREATE DATABASE ${finalDbName}`, err);
    } finally {
      connection.release();
    }
  }

  /**
   * 删除测试数据库
   */
  async dropTestDatabase(dbName: string): Promise<void> {
    if (!this.pool) {
      throw new ConnectionError('MySQL连接池未初始化');
    }

    // 验证数据库名称安全性
    if (!MySQLAdapter.validateDatabaseName(dbName)) {
      throw new Error(`无效的测试数据库名称: ${dbName}`);
    }

    // 检查数据库是否存在
    if (!(await this.databaseExists(dbName))) {
      console.warn(`⚠️ 测试数据库不存在: ${dbName}`);
      return;
    }

    const connection = await this.pool.getConnection();
    
    try {
      // 强制断开所有连接到该数据库的连接
      await connection.execute(`DROP DATABASE \`${dbName}\``);
      console.log(`🗑️ 删除MySQL测试数据库: ${dbName}`);
    } catch (error) {
      const err = error as any;
      // 如果数据库正在被使用，尝试强制删除
      if (err.code === 'ER_DB_DROP_EXISTS') {
        try {
          // 终止所有连接到该数据库的进程
          await connection.execute(`
            SELECT CONCAT('KILL ', id, ';') as kill_query 
            FROM INFORMATION_SCHEMA.PROCESSLIST 
            WHERE db = ? AND id != CONNECTION_ID()
          `, [dbName]);
          
          // 再次尝试删除
          await connection.execute(`DROP DATABASE \`${dbName}\``);
          console.log(`🗑️ 强制删除MySQL测试数据库: ${dbName}`);
        } catch (forceError) {
          throw new QueryError(`强制删除数据库失败: ${(forceError as any).message}`, `DROP DATABASE ${dbName}`, forceError as Error | undefined);
        }
      } else {
        throw new QueryError(`删除数据库失败: ${err.message}`, `DROP DATABASE ${dbName}`, err);
      }
    } finally {
      connection.release();
    }
  }

  /**
   * 清理所有测试数据库
   * 用于清理残留的测试数据库
   */
  async cleanupTestDatabases(maxAge: number = 3600000): Promise<string[]> {
    if (!this.pool) {
      throw new ConnectionError('MySQL连接池未初始化');
    }

    const connection = await this.pool.getConnection();
    const cleanedDatabases: string[] = [];
    
    try {
      // 查找所有测试数据库
      const [rows] = await connection.execute(`
        SELECT SCHEMA_NAME 
        FROM INFORMATION_SCHEMA.SCHEMATA 
        WHERE SCHEMA_NAME LIKE 'test_%'
      `);

      const databases = rows as { SCHEMA_NAME: string }[];
      const currentTime = Date.now();

      for (const db of databases) {
        const dbName = db.SCHEMA_NAME;
        
        // 从数据库名称中提取时间戳
        const timestampMatch = dbName.match(/test_(\d+)_/);
        if (timestampMatch && timestampMatch[1]) {
          const timestamp = parseInt(timestampMatch[1]);
          const age = currentTime - timestamp;
          
          // 如果数据库超过指定年龄，删除它
          if (age > maxAge) {
            try {
              await this.dropTestDatabase(dbName);
              cleanedDatabases.push(dbName);
            } catch (error) {
              console.warn(`清理测试数据库失败: ${dbName}`, error);
            }
          }
        }
      }

      if (cleanedDatabases.length > 0) {
        console.log(`🧹 清理了 ${cleanedDatabases.length} 个过期的测试数据库`);
      }

      return cleanedDatabases;
    } catch (error) {
      const err = error as any;
      throw new QueryError(`清理测试数据库失败: ${err.message}`, 'CLEANUP_TEST_DATABASES', err);
    } finally {
      connection.release();
    }
  }

  /**
   * 初始化数据库结构
   */
  async initializeSchema(dbName?: string): Promise<void> {
    if (!this.pool) {
      throw new ConnectionError('MySQL连接池未初始化');
    }

    const connection = await this.pool.getConnection();
    
    try {
      // 如果指定了数据库名，先切换到该数据库
      if (dbName) {
        await connection.query(`USE \`${dbName}\``);
      }

      // 读取MySQL专用schema文件
      const schemaPath = join(process.cwd(), 'afa-office-system', 'backend', 'database', 'mysql-test-schema.sql');
      let schema: string;
      
      try {
        schema = await readFile(schemaPath, 'utf-8');
        console.log(`📖 读取MySQL schema文件: ${schemaPath}`);
      } catch (error) {
        console.warn(`⚠️ 无法读取MySQL schema文件: ${schemaPath}`);
        // 如果MySQL schema不存在，使用转换后的SQLite schema
        schema = await this.convertSQLiteSchemaToMySQL();
        console.log(`🔄 使用转换后的SQLite schema`);
      }

      // 暂时禁用外键检查
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');

      // 解析并执行SQL语句
      const statements = this.parseSqlStatements(schema);
      let executedCount = 0;
      let skippedCount = 0;

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await connection.query(statement);
            executedCount++;
          } catch (error) {
            const err = error as any;
            // 忽略已存在的对象错误
            if (err.message.includes('already exists') || 
                err.message.includes('Table') && err.message.includes('exists') ||
                err.message.includes('Duplicate') ||
                err.code === 'ER_TABLE_EXISTS_ERROR' ||
                err.code === 'ER_DUP_KEYNAME') {
              skippedCount++;
              console.log(`⏭️ 跳过已存在的对象: ${statement.substring(0, 50)}...`);
            } else {
              console.error(`❌ SQL执行失败:`, statement.substring(0, 100) + '...', err.message);
              throw error;
            }
          }
        }
      }

      // 重新启用外键检查
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');

      console.log(`🔧 MySQL数据库结构初始化完成${dbName ? ` (数据库: ${dbName})` : ''}`);
      console.log(`📊 执行了 ${executedCount} 个语句，跳过了 ${skippedCount} 个已存在的对象`);
    } catch (error) {
      const err = error as any;
      throw new QueryError(`初始化数据库结构失败: ${err.message}`, 'INITIALIZE_SCHEMA', err);
    } finally {
      connection.release();
    }
  }

  /**
   * 将SQLite schema转换为MySQL兼容的schema
   */
  private async convertSQLiteSchemaToMySQL(): Promise<string> {
    try {
      const sqliteSchemaPath = join(process.cwd(), 'database', 'test-schema.sql');
      const sqliteSchema = await readFile(sqliteSchemaPath, 'utf-8');
      
      // 基本的SQLite到MySQL转换
      let mysqlSchema = sqliteSchema
        // 替换数据类型
        .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'INT AUTO_INCREMENT PRIMARY KEY')
        .replace(/INTEGER/g, 'INT')
        .replace(/TEXT UNIQUE NOT NULL/g, 'VARCHAR(255) UNIQUE NOT NULL')
        .replace(/TEXT UNIQUE/g, 'VARCHAR(255) UNIQUE')
        .replace(/TEXT/g, 'TEXT')
        .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        .replace(/DATETIME/g, 'TIMESTAMP')
        // 替换TEXT + CHECK约束为ENUM
        .replace(/TEXT NOT NULL CHECK\(status IN \('active', 'inactive', 'pending'\)\)/g, "ENUM('active', 'inactive', 'pending') NOT NULL")
        .replace(/TEXT NOT NULL CHECK\(status IN \('active', 'inactive'\)\)/g, "ENUM('active', 'inactive') NOT NULL")
        .replace(/TEXT NOT NULL CHECK\(user_type IN \('tenant_admin', 'merchant_admin', 'employee', 'visitor'\)\)/g, "ENUM('tenant_admin', 'merchant_admin', 'employee', 'visitor') NOT NULL")
        .replace(/TEXT NOT NULL CHECK\(visit_type IN \('business', 'personal', 'interview', 'meeting'\)\)/g, "ENUM('business', 'personal', 'interview', 'meeting') NOT NULL")
        .replace(/TEXT NOT NULL CHECK\(status IN \('pending', 'approved', 'rejected', 'expired', 'completed'\)\)/g, "ENUM('pending', 'approved', 'rejected', 'expired', 'completed') NOT NULL")
        .replace(/TEXT NOT NULL CHECK\(type IN \('employee', 'visitor'\)\)/g, "ENUM('employee', 'visitor') NOT NULL")
        .replace(/TEXT NOT NULL CHECK\(status IN \('active', 'expired', 'revoked'\)\)/g, "ENUM('active', 'expired', 'revoked') NOT NULL")
        .replace(/TEXT NOT NULL CHECK\(direction IN \('in', 'out'\)\)/g, "ENUM('in', 'out') NOT NULL")
        .replace(/TEXT NOT NULL CHECK\(result IN \('success', 'failed'\)\)/g, "ENUM('success', 'failed') NOT NULL")
        .replace(/TEXT NOT NULL CHECK\(resource_type IN \('project', 'venue', 'floor'\)\)/g, "ENUM('project', 'venue', 'floor') NOT NULL")
        // 处理带DEFAULT的情况
        .replace(/TEXT NOT NULL DEFAULT '([^']+)' CHECK\(status IN \('active', 'inactive', 'pending'\)\)/g, "ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT '$1'")
        .replace(/TEXT NOT NULL DEFAULT '([^']+)' CHECK\(status IN \('active', 'inactive'\)\)/g, "ENUM('active', 'inactive') NOT NULL DEFAULT '$1'")
        .replace(/TEXT NOT NULL DEFAULT '([^']+)' CHECK\(status IN \('pending', 'approved', 'rejected', 'expired', 'completed'\)\)/g, "ENUM('pending', 'approved', 'rejected', 'expired', 'completed') NOT NULL DEFAULT '$1'")
        .replace(/TEXT NOT NULL DEFAULT '([^']+)' CHECK\(status IN \('active', 'expired', 'revoked'\)\)/g, "ENUM('active', 'expired', 'revoked') NOT NULL DEFAULT '$1'")
        .replace(/TEXT NOT NULL DEFAULT '([^']+)' CHECK\(direction IN \('in', 'out'\)\)/g, "ENUM('in', 'out') NOT NULL DEFAULT '$1'")
        .replace(/TEXT NOT NULL DEFAULT '([^']+)' CHECK\(result IN \('success', 'failed'\)\)/g, "ENUM('success', 'failed') NOT NULL DEFAULT '$1'")
        // 添加字符集和引擎
        .replace(/CREATE TABLE IF NOT EXISTS (\w+) \(/g, 'CREATE TABLE IF NOT EXISTS `$1` (')
        .replace(/\);/g, ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;')
        // 处理外键约束
        .replace(/FOREIGN KEY \((\w+)\) REFERENCES (\w+)\((\w+)\)/g, 'FOREIGN KEY (`$1`) REFERENCES `$2`(`$3`)')
        // 处理UNIQUE约束 - 先处理包含TEXT字段的复合约束
        .replace(/code TEXT NOT NULL,[\s\S]*?UNIQUE\(([^)]*code[^)]*)\)/g, (match, uniqueColumns) => {
          // 将code字段改为VARCHAR(255)
          const modifiedMatch = match.replace(/code TEXT NOT NULL/g, 'code VARCHAR(255) NOT NULL');
          return modifiedMatch;
        })
        .replace(/UNIQUE\(([^)]+)\)/g, (_, columns) => {
          const cols = columns.split(',').map((col: string) => `\`${col.trim()}\``).join(', ');
          return `UNIQUE(${cols})`;
        });

      return mysqlSchema;
    } catch (error) {
      throw new Error(`转换SQLite schema失败: ${(error as Error).message}`);
    }
  }

  /**
   * 解析SQL语句
   * 支持MySQL的复杂语句，包括存储过程、触发器等
   */
  private parseSqlStatements(schema: string): string[] {
    const statements: string[] = [];
    let currentStatement = '';
    let inDelimiter = false;
    let customDelimiter = ';';
    
    const lines = schema.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ? lines[i].trim() : '';
      
      // 跳过空行和注释
      if (!line || line.startsWith('--') || line.startsWith('PRAGMA')) {
        continue;
      }
      
      // 处理DELIMITER语句
      if (line.startsWith('DELIMITER')) {
        const parts = line.split(/\s+/);
        if (parts.length > 1 && parts[1]) {
          customDelimiter = parts[1];
          inDelimiter = customDelimiter !== ';';
        }
        continue;
      }
      
      currentStatement += line + '\n';
      
      // 检查是否到达语句结束
      if (line.endsWith(customDelimiter)) {
        // 移除结尾的分隔符
        currentStatement = currentStatement.substring(0, currentStatement.lastIndexOf(customDelimiter)).trim();
        
        if (currentStatement) {
          statements.push(currentStatement);
        }
        
        currentStatement = '';
        
        // 如果是自定义分隔符结束，重置为默认分隔符
        if (inDelimiter && customDelimiter !== ';') {
          customDelimiter = ';';
          inDelimiter = false;
        }
      }
    }
    
    // 处理最后一个语句（如果没有分隔符结尾）
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    return statements.filter(stmt => stmt.length > 0);
  }

  /**
   * 获取数据库类型
   */
  getType(): 'mysql' {
    return 'mysql';
  }

  /**
   * 获取连接信息
   */
  getConnectionInfo(): string {
    if (!this.config) {
      return 'MySQL (未连接)';
    }
    return `mysql://${this.config.user}@${this.config.host}:${this.config.port}/${this.config.database || 'default'}`;
  }

  /**
   * 优化MySQL表性能
   */
  async optimizeTables(dbName?: string): Promise<void> {
    if (!this.pool) {
      throw new ConnectionError('MySQL连接池未初始化');
    }

    const connection = await this.pool.getConnection();
    
    try {
      if (dbName) {
        await connection.execute(`USE \`${dbName}\``);
      }

      // 获取所有表名
      const [tables] = await connection.execute('SHOW TABLES');
      const tableList = tables as { [key: string]: string }[];
      
      for (const tableRow of tableList) {
        const tableName = Object.values(tableRow)[0];
        
        try {
          // 分析表
          await connection.execute(`ANALYZE TABLE \`${tableName}\``);
          
          // 优化表
          await connection.execute(`OPTIMIZE TABLE \`${tableName}\``);
          
          console.log(`✨ 优化表: ${tableName}`);
        } catch (error) {
          console.warn(`⚠️ 优化表失败: ${tableName}`, error);
        }
      }

      console.log(`🚀 MySQL表优化完成${dbName ? ` (数据库: ${dbName})` : ''}`);
    } catch (error) {
      const err = error as any;
      throw new QueryError(`优化表失败: ${err.message}`, 'OPTIMIZE_TABLES', err);
    } finally {
      connection.release();
    }
  }

  /**
   * 获取数据库统计信息
   */
  async getDatabaseStats(dbName?: string): Promise<{
    tables: number;
    totalSize: number;
    indexSize: number;
    dataSize: number;
  }> {
    if (!this.pool) {
      throw new ConnectionError('MySQL连接池未初始化');
    }

    const connection = await this.pool.getConnection();
    
    try {
      const targetDb = dbName || this.config?.database || 'information_schema';
      if (!targetDb) {
        throw new Error('未指定数据库名称');
      }

      const [rows] = await connection.execute(`
        SELECT 
          COUNT(*) as table_count,
          SUM(data_length + index_length) as total_size,
          SUM(index_length) as index_size,
          SUM(data_length) as data_size
        FROM information_schema.tables 
        WHERE table_schema = ?
      `, [targetDb]);

      const stats = (rows as any[])[0];
      
      return {
        tables: parseInt(stats.table_count) || 0,
        totalSize: parseInt(stats.total_size) || 0,
        indexSize: parseInt(stats.index_size) || 0,
        dataSize: parseInt(stats.data_size) || 0
      };
    } catch (error) {
      const err = error as any;
      throw new QueryError(`获取数据库统计信息失败: ${err.message}`, 'GET_DATABASE_STATS', err);
    } finally {
      connection.release();
    }
  }

  /**
   * 检查MySQL服务器状态
   */
  async getServerStatus(): Promise<{
    version: string;
    uptime: number;
    connections: number;
    queries: number;
  }> {
    if (!this.pool) {
      throw new ConnectionError('MySQL连接池未初始化');
    }

    const connection = await this.pool.getConnection();
    
    try {
      const [versionRows] = await connection.execute('SELECT VERSION() as version');
      const [statusRows] = await connection.execute('SHOW STATUS WHERE Variable_name IN ("Uptime", "Threads_connected", "Queries")');
      
      const version = (versionRows as any[])[0].version;
      const statusMap = new Map();
      
      (statusRows as any[]).forEach(row => {
        statusMap.set(row.Variable_name, row.Value);
      });

      return {
        version,
        uptime: parseInt(statusMap.get('Uptime')) || 0,
        connections: parseInt(statusMap.get('Threads_connected')) || 0,
        queries: parseInt(statusMap.get('Queries')) || 0
      };
    } catch (error) {
      const err = error as any;
      throw new QueryError(`获取服务器状态失败: ${err.message}`, 'GET_SERVER_STATUS', err);
    } finally {
      connection.release();
    }
  }
}