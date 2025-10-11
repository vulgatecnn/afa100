/**
 * MySQL数据库初始化器
 * 负责MySQL数据库的自动创建、配置和初始化
 */

import mysql from 'mysql2/promise';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { MySQLConfig, DatabaseType } from '../config/database-config-manager';
import { mySQLConfigManager } from '../config/mysql-config-manager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 数据库初始化配置
 */
export interface DatabaseInitializationConfig {
  // 数据库配置
  databaseName: string;
  charset: string;
  collation: string;
  
  // 初始化选项
  dropIfExists: boolean;
  createIfNotExists: boolean;
  initializeSchema: boolean;
  insertSeedData: boolean;
  
  // 文件路径
  schemaFilePath?: string;
  seedDataFilePath?: string;
  
  // 日志配置
  enableLogging: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * 初始化结果
 */
export interface InitializationResult {
  success: boolean;
  databaseName: string;
  operations: string[];
  errors: string[];
  warnings: string[];
  duration: number;
  timestamp: Date;
}

/**
 * 数据库状态信息
 */
export interface DatabaseStatus {
  exists: boolean;
  name: string;
  charset: string;
  collation: string;
  tableCount: number;
  size: number; // 字节
  created: Date | null;
  lastModified: Date | null;
}

/**
 * MySQL数据库初始化器
 */
export class MySQLDatabaseInitializer {
  private config: MySQLConfig;
  private initConfig: DatabaseInitializationConfig;
  private connection: mysql.Connection | null = null;

  constructor(
    config: MySQLConfig,
    initConfig: Partial<DatabaseInitializationConfig> = {}
  ) {
    this.config = config;
    this.initConfig = {
      databaseName: config.database || 'afa_office_test',
      charset: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
      dropIfExists: false,
      createIfNotExists: true,
      initializeSchema: true,
      insertSeedData: false,
      schemaFilePath: join(__dirname, '../../database/mysql-test-schema.sql'),
      seedDataFilePath: join(__dirname, '../../database/mysql-seed-data.sql'),
      enableLogging: true,
      logLevel: 'info',
      ...initConfig
    };
  }

  /**
   * 初始化数据库
   */
  async initialize(): Promise<InitializationResult> {
    const startTime = Date.now();
    const result: InitializationResult = {
      success: false,
      databaseName: this.initConfig.databaseName,
      operations: [],
      errors: [],
      warnings: [],
      duration: 0,
      timestamp: new Date()
    };

    try {
      this.log('info', `🚀 开始初始化MySQL数据库: ${this.initConfig.databaseName}`);

      // 建立管理员连接（不指定数据库）
      await this.connectAsAdmin();
      result.operations.push('建立管理员连接');

      // 检查数据库状态
      const dbStatus = await this.getDatabaseStatus();
      result.operations.push('检查数据库状态');

      // 处理现有数据库
      if (dbStatus.exists) {
        if (this.initConfig.dropIfExists) {
          await this.dropDatabase();
          result.operations.push('删除现有数据库');
          this.log('info', `🗑️ 已删除现有数据库: ${this.initConfig.databaseName}`);
        } else {
          this.log('warn', `⚠️ 数据库已存在: ${this.initConfig.databaseName}`);
          result.warnings.push('数据库已存在，跳过创建');
        }
      }

      // 创建数据库
      if (!dbStatus.exists || this.initConfig.dropIfExists) {
        if (this.initConfig.createIfNotExists) {
          await this.createDatabase();
          result.operations.push('创建数据库');
          this.log('info', `✅ 已创建数据库: ${this.initConfig.databaseName}`);
        }
      }

      // 切换到目标数据库
      await this.useDatabase();
      result.operations.push('切换到目标数据库');

      // 初始化数据库结构
      if (this.initConfig.initializeSchema) {
        await this.initializeSchema();
        result.operations.push('初始化数据库结构');
        this.log('info', '🏗️ 数据库结构初始化完成');
      }

      // 插入种子数据
      if (this.initConfig.insertSeedData) {
        await this.insertSeedData();
        result.operations.push('插入种子数据');
        this.log('info', '🌱 种子数据插入完成');
      }

      // 验证初始化结果
      const finalStatus = await this.getDatabaseStatus();
      result.operations.push('验证初始化结果');

      result.success = true;
      result.duration = Date.now() - startTime;

      this.log('info', `✅ 数据库初始化成功，耗时: ${result.duration}ms`);
      this.log('info', `📊 数据库状态: ${finalStatus.tableCount} 个表，大小: ${this.formatBytes(finalStatus.size)}`);

    } catch (error) {
      result.success = false;
      result.duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      
      this.log('error', `❌ 数据库初始化失败: ${errorMessage}`);
      throw error;
    } finally {
      await this.disconnect();
    }

    return result;
  }

  /**
   * 建立管理员连接
   */
  private async connectAsAdmin(): Promise<void> {
    const adminConfig = {
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      // 不指定数据库，以便可以创建数据库
      charset: this.initConfig.charset,
      timezone: '+00:00',
      supportBigNumbers: true,
      bigNumberStrings: true
    };

    this.connection = await mysql.createConnection(adminConfig);
    this.log('debug', '🔗 管理员连接已建立');
  }

  /**
   * 获取数据库状态
   */
  async getDatabaseStatus(): Promise<DatabaseStatus> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    try {
      // 检查数据库是否存在
      const [databases] = await this.connection.execute(
        'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
        [this.initConfig.databaseName]
      );

      const dbExists = Array.isArray(databases) && databases.length > 0;

      if (!dbExists) {
        return {
          exists: false,
          name: this.initConfig.databaseName,
          charset: '',
          collation: '',
          tableCount: 0,
          size: 0,
          created: null,
          lastModified: null
        };
      }

      // 获取数据库详细信息
      const [dbInfo] = await this.connection.execute(`
        SELECT 
          DEFAULT_CHARACTER_SET_NAME as charset,
          DEFAULT_COLLATION_NAME as collation
        FROM INFORMATION_SCHEMA.SCHEMATA 
        WHERE SCHEMA_NAME = ?
      `, [this.initConfig.databaseName]);

      const dbInfoRow = Array.isArray(dbInfo) && dbInfo.length > 0 ? dbInfo[0] as any : null;

      // 获取表数量
      const [tables] = await this.connection.execute(
        'SELECT COUNT(*) as table_count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
        [this.initConfig.databaseName]
      );

      const tableCount = Array.isArray(tables) && tables.length > 0 ? (tables[0] as any).table_count : 0;

      // 获取数据库大小
      const [sizeInfo] = await this.connection.execute(`
        SELECT 
          COALESCE(SUM(data_length + index_length), 0) as size_bytes
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ?
      `, [this.initConfig.databaseName]);

      const sizeBytes = Array.isArray(sizeInfo) && sizeInfo.length > 0 ? (sizeInfo[0] as any).size_bytes : 0;

      return {
        exists: true,
        name: this.initConfig.databaseName,
        charset: dbInfoRow?.charset || '',
        collation: dbInfoRow?.collation || '',
        tableCount: parseInt(tableCount) || 0,
        size: parseInt(sizeBytes) || 0,
        created: null, // MySQL没有直接的数据库创建时间
        lastModified: null
      };

    } catch (error) {
      this.log('error', '获取数据库状态失败:', error);
      throw error;
    }
  }

  /**
   * 创建数据库
   */
  private async createDatabase(): Promise<void> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    const createSQL = `
      CREATE DATABASE \`${this.initConfig.databaseName}\`
      CHARACTER SET ${this.initConfig.charset}
      COLLATE ${this.initConfig.collation}
    `;

    await this.connection.execute(createSQL);
    this.log('debug', `数据库创建SQL: ${createSQL}`);
  }

  /**
   * 删除数据库
   */
  private async dropDatabase(): Promise<void> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    await this.connection.execute(`DROP DATABASE IF EXISTS \`${this.initConfig.databaseName}\``);
    this.log('debug', `已删除数据库: ${this.initConfig.databaseName}`);
  }

  /**
   * 切换到目标数据库
   */
  private async useDatabase(): Promise<void> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    await this.connection.execute(`USE \`${this.initConfig.databaseName}\``);
    this.log('debug', `已切换到数据库: ${this.initConfig.databaseName}`);
  }

  /**
   * 初始化数据库结构
   */
  private async initializeSchema(): Promise<void> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    if (!this.initConfig.schemaFilePath) {
      this.log('warn', '未指定schema文件路径，跳过结构初始化');
      return;
    }

    try {
      const schemaSQL = await readFile(this.initConfig.schemaFilePath, 'utf-8');
      
      // 分割SQL语句并执行
      const statements = this.splitSQLStatements(schemaSQL);
      
      for (const statement of statements) {
        if (statement.trim()) {
          await this.connection.execute(statement);
          this.log('debug', `执行SQL: ${statement.substring(0, 100)}...`);
        }
      }

      this.log('info', `✅ 执行了 ${statements.length} 个SQL语句`);

    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        this.log('warn', `Schema文件不存在: ${this.initConfig.schemaFilePath}`);
        return;
      }
      throw error;
    }
  }

  /**
   * 插入种子数据
   */
  private async insertSeedData(): Promise<void> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    if (!this.initConfig.seedDataFilePath) {
      this.log('warn', '未指定种子数据文件路径，跳过数据插入');
      return;
    }

    try {
      const seedSQL = await readFile(this.initConfig.seedDataFilePath, 'utf-8');
      
      // 分割SQL语句并执行
      const statements = this.splitSQLStatements(seedSQL);
      
      for (const statement of statements) {
        if (statement.trim()) {
          await this.connection.execute(statement);
          this.log('debug', `执行种子数据SQL: ${statement.substring(0, 100)}...`);
        }
      }

      this.log('info', `✅ 执行了 ${statements.length} 个种子数据语句`);

    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        this.log('warn', `种子数据文件不存在: ${this.initConfig.seedDataFilePath}`);
        return;
      }
      throw error;
    }
  }

  /**
   * 分割SQL语句
   */
  private splitSQLStatements(sql: string): string[] {
    // 移除注释和空行
    const cleanSQL = sql
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('--') && !line.startsWith('#'))
      .join('\n');

    // 按分号分割，但要考虑字符串中的分号
    const statements: string[] = [];
    let currentStatement = '';
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < cleanSQL.length; i++) {
      const char = cleanSQL[i];
      const prevChar = i > 0 ? cleanSQL[i - 1] : '';

      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
        stringChar = '';
      } else if (!inString && char === ';') {
        if (currentStatement.trim()) {
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
        continue;
      }

      currentStatement += char;
    }

    // 添加最后一个语句
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    return statements.filter(stmt => stmt.length > 0);
  }

  /**
   * 断开连接
   */
  private async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      this.log('debug', '🔌 数据库连接已断开');
    }
  }

  /**
   * 验证数据库初始化
   */
  async validateInitialization(): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      await this.connectAsAdmin();
      await this.useDatabase();

      // 检查基本表是否存在
      const [tables] = await this.connection!.execute(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ?
      `, [this.initConfig.databaseName]);

      const tableList = Array.isArray(tables) ? tables.map((row: any) => row.TABLE_NAME) : [];

      if (tableList.length === 0) {
        issues.push('数据库中没有任何表');
      }

      // 检查字符集
      const status = await this.getDatabaseStatus();
      if (status.charset !== this.initConfig.charset) {
        issues.push(`数据库字符集不匹配: 期望 ${this.initConfig.charset}, 实际 ${status.charset}`);
      }

      if (status.collation !== this.initConfig.collation) {
        issues.push(`数据库排序规则不匹配: 期望 ${this.initConfig.collation}, 实际 ${status.collation}`);
      }

      // 性能建议
      if (status.tableCount > 50) {
        recommendations.push('表数量较多，建议定期优化数据库性能');
      }

      if (status.size > 100 * 1024 * 1024) { // 100MB
        recommendations.push('数据库大小较大，建议监控磁盘空间使用');
      }

    } catch (error) {
      issues.push(`验证过程中出错: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await this.disconnect();
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * 重建数据库
   */
  async rebuild(): Promise<InitializationResult> {
    this.log('info', '🔄 开始重建数据库...');
    
    // 强制删除并重新创建
    const rebuildConfig = {
      ...this.initConfig,
      dropIfExists: true,
      createIfNotExists: true,
      initializeSchema: true
    };

    const originalConfig = this.initConfig;
    this.initConfig = rebuildConfig;

    try {
      const result = await this.initialize();
      this.log('info', '✅ 数据库重建完成');
      return result;
    } finally {
      this.initConfig = originalConfig;
    }
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 日志记录
   */
  private log(level: 'error' | 'warn' | 'info' | 'debug', message: string, ...args: any[]): void {
    if (!this.initConfig.enableLogging) {
      return;
    }

    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.initConfig.logLevel);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex <= currentLevelIndex) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [MySQL-Initializer] [${level.toUpperCase()}]`;
      
      switch (level) {
        case 'error':
          console.error(prefix, message, ...args);
          break;
        case 'warn':
          console.warn(prefix, message, ...args);
          break;
        case 'info':
          console.info(prefix, message, ...args);
          break;
        case 'debug':
          console.debug(prefix, message, ...args);
          break;
      }
    }
  }

  /**
   * 获取初始化配置
   */
  getInitializationConfig(): DatabaseInitializationConfig {
    return { ...this.initConfig };
  }

  /**
   * 更新初始化配置
   */
  updateInitializationConfig(newConfig: Partial<DatabaseInitializationConfig>): void {
    this.initConfig = { ...this.initConfig, ...newConfig };
  }
}

/**
 * 创建MySQL数据库初始化器
 */
export function createMySQLDatabaseInitializer(
  config: MySQLConfig,
  initConfig?: Partial<DatabaseInitializationConfig>
): MySQLDatabaseInitializer {
  return new MySQLDatabaseInitializer(config, initConfig);
}

/**
 * 快速初始化数据库
 */
export async function quickInitializeDatabase(
  databaseName: string,
  options: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    dropIfExists?: boolean;
    initializeSchema?: boolean;
    insertSeedData?: boolean;
  } = {}
): Promise<InitializationResult> {
  // 获取MySQL配置
  const config = mySQLConfigManager.getMySQLConfigTemplate('development');
  
  // 应用选项
  const mysqlConfig: MySQLConfig = {
    ...config,
    host: options.host || config.host,
    port: options.port || config.port,
    user: options.user || config.user,
    password: options.password || config.password,
    database: databaseName
  };

  const initConfig: Partial<DatabaseInitializationConfig> = {
    databaseName,
    dropIfExists: options.dropIfExists || false,
    initializeSchema: options.initializeSchema !== false,
    insertSeedData: options.insertSeedData || false
  };

  const initializer = createMySQLDatabaseInitializer(mysqlConfig, initConfig);
  return await initializer.initialize();
}

/**
 * MySQL数据库初始化器工厂
 */
export class MySQLDatabaseInitializerFactory {
  private static initializers = new Map<string, MySQLDatabaseInitializer>();

  /**
   * 获取或创建初始化器
   */
  static getOrCreateInitializer(
    key: string,
    config: MySQLConfig,
    initConfig?: Partial<DatabaseInitializationConfig>
  ): MySQLDatabaseInitializer {
    if (!this.initializers.has(key)) {
      const initializer = new MySQLDatabaseInitializer(config, initConfig);
      this.initializers.set(key, initializer);
    }
    return this.initializers.get(key)!;
  }

  /**
   * 移除初始化器
   */
  static removeInitializer(key: string): void {
    this.initializers.delete(key);
  }

  /**
   * 清理所有初始化器
   */
  static clearAll(): void {
    this.initializers.clear();
  }

  /**
   * 获取所有初始化器键
   */
  static getInitializerKeys(): string[] {
    return Array.from(this.initializers.keys());
  }
}