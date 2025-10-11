/**
 * MySQL数据库结构初始化管理器
 * 负责MySQL数据库表结构、索引、约束、视图、存储过程和触发器的创建和管理
 */

import mysql from 'mysql2/promise';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { MySQLConfig } from '../config/database-config-manager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 数据库对象类型
 */
export enum DatabaseObjectType {
  TABLE = 'TABLE',
  VIEW = 'VIEW',
  PROCEDURE = 'PROCEDURE',
  FUNCTION = 'FUNCTION',
  TRIGGER = 'TRIGGER',
  INDEX = 'INDEX'
}

/**
 * 数据库对象信息
 */
export interface DatabaseObjectInfo {
  name: string;
  type: DatabaseObjectType;
  schema: string;
  created: Date | null;
  modified: Date | null;
  size?: number;
  rowCount?: number;
  comment?: string;
}

/**
 * 结构初始化配置
 */
export interface SchemaInitializationConfig {
  // 文件路径
  schemaFilePath: string;
  seedDataFilePath?: string;
  
  // 初始化选项
  dropExistingObjects: boolean;
  createTables: boolean;
  createViews: boolean;
  createProcedures: boolean;
  createTriggers: boolean;
  createIndexes: boolean;
  insertSeedData: boolean;
  
  // 验证选项
  validateStructure: boolean;
  validateConstraints: boolean;
  validateIndexes: boolean;
  
  // 日志配置
  enableLogging: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * 初始化结果
 */
export interface SchemaInitializationResult {
  success: boolean;
  databaseName: string;
  operations: string[];
  errors: string[];
  warnings: string[];
  statistics: {
    tablesCreated: number;
    viewsCreated: number;
    proceduresCreated: number;
    triggersCreated: number;
    indexesCreated: number;
    seedRecordsInserted: number;
  };
  duration: number;
  timestamp: Date;
}

/**
 * 结构验证结果
 */
export interface SchemaValidationResult {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
  statistics: {
    totalTables: number;
    totalViews: number;
    totalProcedures: number;
    totalTriggers: number;
    totalIndexes: number;
    totalRecords: number;
  };
}

/**
 * MySQL数据库结构初始化器
 */
export class MySQLSchemaInitializer {
  private config: MySQLConfig;
  private initConfig: SchemaInitializationConfig;
  private connection: mysql.Connection | null = null;

  constructor(
    config: MySQLConfig,
    initConfig: Partial<SchemaInitializationConfig> = {}
  ) {
    this.config = config;
    this.initConfig = {
      schemaFilePath: join(__dirname, '../../database/mysql-test-schema.sql'),
      seedDataFilePath: join(__dirname, '../../database/mysql-seed-data.sql'),
      dropExistingObjects: false,
      createTables: true,
      createViews: true,
      createProcedures: true,
      createTriggers: true,
      createIndexes: true,
      insertSeedData: false,
      validateStructure: true,
      validateConstraints: true,
      validateIndexes: true,
      enableLogging: true,
      logLevel: 'info',
      ...initConfig
    };
  }

  /**
   * 初始化数据库结构
   */
  async initializeSchema(): Promise<SchemaInitializationResult> {
    const startTime = Date.now();
    const result: SchemaInitializationResult = {
      success: false,
      databaseName: this.config.database || 'unknown',
      operations: [],
      errors: [],
      warnings: [],
      statistics: {
        tablesCreated: 0,
        viewsCreated: 0,
        proceduresCreated: 0,
        triggersCreated: 0,
        indexesCreated: 0,
        seedRecordsInserted: 0
      },
      duration: 0,
      timestamp: new Date()
    };

    try {
      this.log('info', `🚀 开始初始化数据库结构: ${this.config.database}`);

      // 连接到数据库
      await this.connect();
      result.operations.push('建立数据库连接');

      // 读取schema文件
      const schemaSQL = await this.readSchemaFile();
      result.operations.push('读取schema文件');

      // 解析SQL语句
      const sqlStatements = this.parseSQLStatements(schemaSQL);
      result.operations.push('解析SQL语句');

      // 删除现有对象（如果需要）
      if (this.initConfig.dropExistingObjects) {
        await this.dropExistingObjects();
        result.operations.push('删除现有对象');
      }

      // 执行结构创建
      const executionResult = await this.executeSchemaStatements(sqlStatements);
      result.statistics = { ...result.statistics, ...executionResult };
      result.operations.push('执行结构创建');

      // 插入种子数据
      if (this.initConfig.insertSeedData && this.initConfig.seedDataFilePath) {
        const seedResult = await this.insertSeedData();
        result.statistics.seedRecordsInserted = seedResult;
        result.operations.push('插入种子数据');
      }

      // 验证结构
      if (this.initConfig.validateStructure) {
        const validationResult = await this.validateSchema();
        if (!validationResult.isValid) {
          result.warnings.push(...validationResult.issues);
        }
        result.operations.push('验证数据库结构');
      }

      result.success = true;
      result.duration = Date.now() - startTime;

      this.log('info', `✅ 数据库结构初始化成功，耗时: ${result.duration}ms`);
      this.logStatistics(result.statistics);

    } catch (error) {
      result.success = false;
      result.duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      
      this.log('error', `❌ 数据库结构初始化失败: ${errorMessage}`);
      throw error;
    } finally {
      await this.disconnect();
    }

    return result;
  }

  /**
   * 连接到数据库
   */
  private async connect(): Promise<void> {
    if (this.connection) {
      return;
    }

    const connectionConfig: mysql.ConnectionOptions = {
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      charset: 'utf8mb4',
      timezone: '+00:00',
      multipleStatements: true // 允许执行多个语句
    };

    // 只有当数据库名存在时才设置
    if (this.config.database) {
      connectionConfig.database = this.config.database;
    }

    this.connection = await mysql.createConnection(connectionConfig);
    this.log('info', `🔗 连接到MySQL服务器: ${this.config.host}:${this.config.port}`);
  }

  /**
   * 断开连接
   */
  private async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      this.log('info', '🔌 断开与MySQL服务器的连接');
    }
  }

  /**
   * 读取schema文件
   */
  private async readSchemaFile(): Promise<string> {
    try {
      const schemaSQL = await readFile(this.initConfig.schemaFilePath, 'utf-8');
      this.log('info', `📖 读取schema文件: ${this.initConfig.schemaFilePath}`);
      return schemaSQL;
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error(`Schema文件不存在: ${this.initConfig.schemaFilePath}`);
      }
      throw error;
    }
  }

  /**
   * 解析SQL语句
   */
  private parseSQLStatements(sql: string): Array<{ type: string; statement: string; objectName?: string }> {
    const statements: Array<{ type: string; statement: string; objectName?: string }> = [];
    let currentStatement = '';
    let inString = false;
    let stringChar = '';
    let escaped = false;

    const sqlStatements = sql.split(';');
    for (const stmt of sqlStatements) {
      const trimmedStmt = stmt.trim();
      if (!trimmedStmt) continue;

      // 解析语句类型和对象名
      let type = 'unknown';
      let objectName: string | undefined;

      const createTableMatch = trimmedStmt.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i);
      const createViewMatch = trimmedStmt.match(/^CREATE\s+VIEW\s+`?(\w+)`?/i);
      const createProcedureMatch = trimmedStmt.match(/^CREATE\s+(?:DEFINER=`?\w+`?@`?\w+`?\s+)?PROCEDURE\s+`?(\w+)`?/i);
      const createTriggerMatch = trimmedStmt.match(/^CREATE\s+(?:DEFINER=`?\w+`?@`?\w+`?\s+)?TRIGGER\s+`?(\w+)`?/i);
      const createIndexMatch = trimmedStmt.match(/^CREATE\s+(?:UNIQUE\s+)?INDEX\s+`?(\w+)`?/i);
      const dropTableMatch = trimmedStmt.match(/^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?`?(\w+)`?/i);
      const dropViewMatch = trimmedStmt.match(/^DROP\s+VIEW\s+(?:IF\s+EXISTS\s+)?`?(\w+)`?/i);
      const dropProcedureMatch = trimmedStmt.match(/^DROP\s+PROCEDURE\s+(?:IF\s+EXISTS\s+)?`?(\w+)`?/i);
      const dropTriggerMatch = trimmedStmt.match(/^DROP\s+TRIGGER\s+(?:IF\s+EXISTS\s+)?`?(\w+)`?/i);
      const dropIndexMatch = trimmedStmt.match(/^DROP\s+INDEX\s+`?(\w+)`?\s+ON\s+`?(\w+)`?/i);

      if (createTableMatch) {
        type = 'create_table';
        objectName = createTableMatch[1];
      } else if (createViewMatch) {
        type = 'create_view';
        objectName = createViewMatch[1];
      } else if (createProcedureMatch) {
        type = 'create_procedure';
        objectName = createProcedureMatch[1];
      } else if (createTriggerMatch) {
        type = 'create_trigger';
        objectName = createTriggerMatch[1];
      } else if (createIndexMatch) {
        type = 'create_index';
        objectName = createIndexMatch[1];
      } else if (dropTableMatch) {
        type = 'drop_table';
        objectName = dropTableMatch[1];
      } else if (dropViewMatch) {
        type = 'drop_view';
        objectName = dropViewMatch[1];
      } else if (dropProcedureMatch) {
        type = 'drop_procedure';
        objectName = dropProcedureMatch[1];
      } else if (dropTriggerMatch) {
        type = 'drop_trigger';
        objectName = dropTriggerMatch[1];
      } else if (dropIndexMatch) {
        type = 'drop_index';
        objectName = dropIndexMatch[1];
      }

      // 修复类型错误，使用条件赋值确保符合exactOptionalPropertyTypes规则
      const statementEntry: { type: string; statement: string; objectName?: string } = {
        type,
        statement: trimmedStmt
      };
      
      // 只有当objectName存在时才添加到对象中
      if (objectName) {
        statementEntry.objectName = objectName;
      }
      
      statements.push(statementEntry);
    }

    return statements;
  }

  /**
   * 删除现有对象
   */
  private async dropExistingObjects(): Promise<void> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    this.log('info', '🗑️ 开始删除现有数据库对象...');

    try {
      // 删除触发器
      const [triggers] = await this.connection.execute(`
        SELECT TRIGGER_NAME 
        FROM INFORMATION_SCHEMA.TRIGGERS 
        WHERE TRIGGER_SCHEMA = ?
      `, [this.config.database]);

      for (const trigger of triggers as any[]) {
        await this.connection.execute(`DROP TRIGGER IF EXISTS \`${trigger.TRIGGER_NAME}\``);
        this.log('info', `删除触发器: ${trigger.TRIGGER_NAME}`);
      }

      // 删除视图
      const [views] = await this.connection.execute(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.VIEWS 
        WHERE TABLE_SCHEMA = ?
      `, [this.config.database]);

      for (const view of views as any[]) {
        await this.connection.execute(`DROP VIEW IF EXISTS \`${view.TABLE_NAME}\``);
        this.log('info', `删除视图: ${view.TABLE_NAME}`);
      }

      // 删除存储过程
      const [procedures] = await this.connection.execute(`
        SELECT ROUTINE_NAME 
        FROM INFORMATION_SCHEMA.ROUTINES 
        WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'
      `, [this.config.database]);

      for (const procedure of procedures as any[]) {
        await this.connection.execute(`DROP PROCEDURE IF EXISTS \`${procedure.ROUTINE_NAME}\``);
        this.log('info', `删除存储过程: ${procedure.ROUTINE_NAME}`);
      }

      // 删除函数
      const [functions] = await this.connection.execute(`
        SELECT ROUTINE_NAME 
        FROM INFORMATION_SCHEMA.ROUTINES 
        WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'FUNCTION'
      `, [this.config.database]);

      for (const func of functions as any[]) {
        await this.connection.execute(`DROP FUNCTION IF EXISTS \`${func.ROUTINE_NAME}\``);
        this.log('info', `删除函数: ${func.ROUTINE_NAME}`);
      }

      // 删除表（按依赖关系排序）
      await this.connection.execute('SET FOREIGN_KEY_CHECKS = 0');
      
      const [tables] = await this.connection.execute(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
      `, [this.config.database]);

      for (const table of tables as any[]) {
        await this.connection.execute(`DROP TABLE IF EXISTS \`${table.TABLE_NAME}\``);
        this.log('info', `删除表: ${table.TABLE_NAME}`);
      }

      await this.connection.execute('SET FOREIGN_KEY_CHECKS = 1');

      this.log('info', '✅ 现有数据库对象删除完成');

    } catch (error) {
      this.log('error', '删除现有对象失败:', error);
      throw error;
    }
  }

  /**
   * 执行结构创建语句
   */
  private async executeSchemaStatements(statements: Array<{
    type: string;
    statement: string;
    objectName?: string;
  }>): Promise<{
    tablesCreated: number;
    viewsCreated: number;
    proceduresCreated: number;
    triggersCreated: number;
    indexesCreated: number;
  }> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    const stats = {
      tablesCreated: 0,
      viewsCreated: 0,
      proceduresCreated: 0,
      triggersCreated: 0,
      indexesCreated: 0
    };

    // 按类型排序执行（表 -> 视图 -> 存储过程 -> 触发器）
    const executionOrder = [
      'create_table',
      'create_view',
      'create_procedure',
      'create_trigger',
      'create_index'
    ];

    for (const type of executionOrder) {
      const statementsOfType = statements.filter(stmt => stmt.type === type);
      
      for (const stmt of statementsOfType) {
        try {
          await this.connection.execute(stmt.statement);
          
          // 更新统计
          switch (stmt.type) {
            case 'create_table':
              stats.tablesCreated++;
              this.log('info', `✅ 创建表: ${stmt.objectName}`);
              break;
            case 'create_view':
              stats.viewsCreated++;
              this.log('info', `✅ 创建视图: ${stmt.objectName}`);
              break;
            case 'create_procedure':
              stats.proceduresCreated++;
              this.log('info', `✅ 创建存储过程: ${stmt.objectName}`);
              break;
            case 'create_trigger':
              stats.triggersCreated++;
              this.log('info', `✅ 创建触发器: ${stmt.objectName}`);
              break;
            case 'create_index':
              stats.indexesCreated++;
              this.log('info', `✅ 创建索引: ${stmt.objectName}`);
              break;
          }
        } catch (error) {
          this.log('error', `执行语句失败: ${stmt.statement.substring(0, 100)}...`);
          throw error;
        }
      }
    }

    return stats;
  }

  /**
   * 插入种子数据
   */
  private async insertSeedData(): Promise<number> {
    if (!this.connection || !this.initConfig.seedDataFilePath) {
      return 0;
    }

    try {
      const seedSQL = await readFile(this.initConfig.seedDataFilePath, 'utf-8');
      const statements = this.parseSQLStatements(seedSQL);
      
      let recordsInserted = 0;
      
      for (const statementObj of statements) {
        if (statementObj.statement.trim().toUpperCase().startsWith('INSERT')) {
          const [result] = await this.connection.execute(statementObj.statement);
          if (result && typeof result === 'object' && 'affectedRows' in result) {
            recordsInserted += (result as any).affectedRows;
          }
          this.log('info', `插入数据: ${statementObj.statement.substring(0, 100)}...`);
        }
      }

      this.log('info', `✅ 插入了 ${recordsInserted} 条种子数据记录`);
      return recordsInserted;

    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        this.log('warn', `种子数据文件不存在: ${this.initConfig.seedDataFilePath}`);
        return 0;
      }
      throw error;
    }
  }

  /**
   * 验证数据库结构
   */
  async validateSchema(): Promise<SchemaValidationResult> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // 获取统计信息
      const [tables] = await this.connection.execute(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
      `, [this.config.database]);

      const [views] = await this.connection.execute(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.VIEWS 
        WHERE TABLE_SCHEMA = ?
      `, [this.config.database]);

      const [procedures] = await this.connection.execute(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.ROUTINES 
        WHERE ROUTINE_SCHEMA = ?
      `, [this.config.database]);

      const [triggers] = await this.connection.execute(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.TRIGGERS 
        WHERE TRIGGER_SCHEMA = ?
      `, [this.config.database]);

      const [indexes] = await this.connection.execute(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = ?
      `, [this.config.database]);

      const statistics = {
        totalTables: (tables as any[])[0]?.count || 0,
        totalViews: (views as any[])[0]?.count || 0,
        totalProcedures: (procedures as any[])[0]?.count || 0,
        totalTriggers: (triggers as any[])[0]?.count || 0,
        totalIndexes: (indexes as any[])[0]?.count || 0,
        totalRecords: 0
      };

      // 验证必要的表是否存在
      const requiredTables = [
        'users', 'merchants', 'projects', 'venues', 'floors',
        'permissions', 'visitor_applications', 'passcodes', 'access_records'
      ];

      for (const tableName of requiredTables) {
        const [tableExists] = await this.connection.execute(`
          SELECT COUNT(*) as count 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        `, [this.config.database, tableName]);

        if ((tableExists as any[])[0]?.count === 0) {
          issues.push(`必要的表不存在: ${tableName}`);
        }
      }

      // 验证外键约束
      const [foreignKeys] = await this.connection.execute(`
        SELECT 
          TABLE_NAME,
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = ? 
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `, [this.config.database]);

      if ((foreignKeys as any[]).length === 0) {
        issues.push('没有找到外键约束');
      }

      // 性能建议
      if (statistics.totalIndexes < statistics.totalTables * 2) {
        recommendations.push('考虑为常用查询字段添加更多索引');
      }

      if (statistics.totalTables > 20 && statistics.totalViews === 0) {
        recommendations.push('考虑创建视图来简化复杂查询');
      }

      return {
        isValid: issues.length === 0,
        issues,
        recommendations,
        statistics
      };

    } catch (error) {
      issues.push(`验证过程中出错: ${error instanceof Error ? error.message : String(error)}`);
      return {
        isValid: false,
        issues,
        recommendations,
        statistics: {
          totalTables: 0,
          totalViews: 0,
          totalProcedures: 0,
          totalTriggers: 0,
          totalIndexes: 0,
          totalRecords: 0
        }
      };
    }
  }

  /**
   * 获取数据库对象列表
   */
  async getDatabaseObjects(): Promise<DatabaseObjectInfo[]> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    const objects: DatabaseObjectInfo[] = [];

    try {
      // 获取表信息
      const [tables] = await this.connection.execute(`
        SELECT 
          TABLE_NAME as name,
          'TABLE' as type,
          TABLE_SCHEMA as schema_name,
          CREATE_TIME as created,
          UPDATE_TIME as modified,
          DATA_LENGTH + INDEX_LENGTH as size,
          TABLE_ROWS as row_count,
          TABLE_COMMENT as comment
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
      `, [this.config.database]);

      objects.push(...(tables as any[]).map(table => ({
        name: table.name,
        type: DatabaseObjectType.TABLE,
        schema: table.schema_name,
        created: table.created,
        modified: table.modified,
        size: table.size,
        rowCount: table.row_count,
        comment: table.comment
      })));

      // 获取视图信息
      const [views] = await this.connection.execute(`
        SELECT 
          TABLE_NAME as name,
          'VIEW' as type,
          TABLE_SCHEMA as schema_name
        FROM INFORMATION_SCHEMA.VIEWS 
        WHERE TABLE_SCHEMA = ?
      `, [this.config.database]);

      objects.push(...(views as any[]).map(view => ({
        name: view.name,
        type: DatabaseObjectType.VIEW,
        schema: view.schema_name,
        created: null,
        modified: null
      })));

      // 获取存储过程和函数信息
      const [routines] = await this.connection.execute(`
        SELECT 
          ROUTINE_NAME as name,
          ROUTINE_TYPE as type,
          ROUTINE_SCHEMA as schema_name,
          CREATED as created,
          LAST_ALTERED as modified
        FROM INFORMATION_SCHEMA.ROUTINES 
        WHERE ROUTINE_SCHEMA = ?
      `, [this.config.database]);

      objects.push(...(routines as any[]).map(routine => ({
        name: routine.name,
        type: routine.type === 'PROCEDURE' ? DatabaseObjectType.PROCEDURE : DatabaseObjectType.FUNCTION,
        schema: routine.schema_name,
        created: routine.created,
        modified: routine.modified
      })));

      // 获取触发器信息
      const [triggers] = await this.connection.execute(`
        SELECT 
          TRIGGER_NAME as name,
          'TRIGGER' as type,
          TRIGGER_SCHEMA as schema_name
        FROM INFORMATION_SCHEMA.TRIGGERS 
        WHERE TRIGGER_SCHEMA = ?
      `, [this.config.database]);

      objects.push(...(triggers as any[]).map(trigger => ({
        name: trigger.name,
        type: DatabaseObjectType.TRIGGER,
        schema: trigger.schema_name,
        created: null,
        modified: null
      })));

      return objects;

    } catch (error) {
      this.log('error', '获取数据库对象列表失败:', error);
      throw error;
    }
  }

  /**
   * 记录统计信息
   */
  private logStatistics(stats: SchemaInitializationResult['statistics']): void {
    this.log('info', '📊 数据库结构初始化统计:');
    this.log('info', `  - 表: ${stats.tablesCreated} 个`);
    this.log('info', `  - 视图: ${stats.viewsCreated} 个`);
    this.log('info', `  - 存储过程/函数: ${stats.proceduresCreated} 个`);
    this.log('info', `  - 触发器: ${stats.triggersCreated} 个`);
    this.log('info', `  - 索引: ${stats.indexesCreated} 个`);
    if (stats.seedRecordsInserted > 0) {
      this.log('info', `  - 种子数据: ${stats.seedRecordsInserted} 条记录`);
    }
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
      const prefix = `[${timestamp}] [MySQL-SchemaInitializer] [${level.toUpperCase()}]`;
      
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
  getInitializationConfig(): SchemaInitializationConfig {
    return { ...this.initConfig };
  }

  /**
   * 更新初始化配置
   */
  updateInitializationConfig(newConfig: Partial<SchemaInitializationConfig>): void {
    this.initConfig = { ...this.initConfig, ...newConfig };
  }
}

/**
 * 创建MySQL结构初始化器
 */
export function createMySQLSchemaInitializer(
  config: MySQLConfig,
  initConfig?: Partial<SchemaInitializationConfig>
): MySQLSchemaInitializer {
  return new MySQLSchemaInitializer(config, initConfig);
}

/**
 * 快速初始化数据库结构
 */
export async function quickInitializeSchema(
  databaseName: string,
  options: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    dropExisting?: boolean;
    insertSeedData?: boolean;
    schemaFilePath?: string;
    seedDataFilePath?: string;
  } = {}
): Promise<SchemaInitializationResult> {
  const config: MySQLConfig = {
    type: 'mysql' as any,
    host: options.host || '127.0.0.1',
    port: options.port || 3306,
    user: options.user || 'root',
    password: options.password || '111111',
    database: databaseName
  };

  const initConfig: Partial<SchemaInitializationConfig> = {
    dropExistingObjects: options.dropExisting || false,
    insertSeedData: options.insertSeedData || false,
    schemaFilePath: options.schemaFilePath || join(__dirname, '../../database/mysql-test-schema.sql')
  };
  
  // 只有当seedDataFilePath存在且不为undefined时才添加到配置中
  if (options.seedDataFilePath !== undefined) {
    (initConfig as any).seedDataFilePath = options.seedDataFilePath;
  }

  const initializer = createMySQLSchemaInitializer(config, initConfig);
  return await initializer.initializeSchema();
}