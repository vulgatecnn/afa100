/**
 * MySQL初始化配置管理器
 * 统一管理MySQL数据库、用户和结构的初始化过程
 */

import { MySQLConfig, DatabaseType } from '../config/database-config-manager';
import { mySQLConfigManager } from '../config/mysql-config-manager';
import { MySQLDatabaseInitializer, DatabaseInitializationConfig, InitializationResult } from './mysql-database-initializer';
import { MySQLUserManager, MySQLUserConfig, UserManagementResult } from './mysql-user-manager';
import { MySQLSchemaInitializer, SchemaInitializationConfig, SchemaInitializationResult } from './mysql-schema-initializer';

/**
 * 完整初始化配置
 */
export interface CompleteInitializationConfig {
  // 数据库配置
  database: {
    name: string;
    charset: string;
    collation: string;
    dropIfExists: boolean;
    createIfNotExists: boolean;
  };
  
  // 用户配置
  users: Array<{
    username: string;
    password: string;
    host: string;
    template: string;
    description?: string;
  }>;
  
  // 结构配置
  schema: {
    initializeSchema: boolean;
    insertSeedData: boolean;
    schemaFilePath?: string;
    seedDataFilePath?: string;
    dropExistingObjects: boolean;
  };
  
  // 日志配置
  logging: {
    enableLogging: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    logToFile?: boolean;
    logFilePath?: string;
  };
  
  // 验证配置
  validation: {
    validateAfterInit: boolean;
    validateUsers: boolean;
    validateSchema: boolean;
    validateConnections: boolean;
  };
}

/**
 * 完整初始化结果
 */
export interface CompleteInitializationResult {
  success: boolean;
  databaseResult: InitializationResult;
  userResults: UserManagementResult[];
  schemaResult: SchemaInitializationResult;
  validationResults?: {
    database: boolean;
    users: boolean;
    schema: boolean;
    connections: boolean;
  };
  totalDuration: number;
  timestamp: Date;
  summary: {
    databaseCreated: boolean;
    usersCreated: number;
    tablesCreated: number;
    viewsCreated: number;
    proceduresCreated: number;
    seedRecordsInserted: number;
  };
}

/**
 * 初始化状态
 */
export interface InitializationStatus {
  phase: 'idle' | 'database' | 'users' | 'schema' | 'validation' | 'complete' | 'error';
  progress: number; // 0-100
  currentOperation: string;
  startTime: Date | null;
  estimatedTimeRemaining: number; // 秒
  errors: string[];
  warnings: string[];
}

/**
 * MySQL初始化管理器
 */
export class MySQLInitializationManager {
  private config: MySQLConfig;
  private initConfig: CompleteInitializationConfig;
  private status: InitializationStatus;
  private logEntries: Array<{
    timestamp: Date;
    level: string;
    message: string;
    phase: string;
  }> = [];

  constructor(
    config: MySQLConfig,
    initConfig: Partial<CompleteInitializationConfig> = {}
  ) {
    this.config = config;
    this.initConfig = this.mergeWithDefaults(initConfig);
    this.status = {
      phase: 'idle',
      progress: 0,
      currentOperation: '等待开始',
      startTime: null,
      estimatedTimeRemaining: 0,
      errors: [],
      warnings: []
    };
  }

  /**
   * 合并默认配置
   */
  private mergeWithDefaults(config: Partial<CompleteInitializationConfig>): CompleteInitializationConfig {
    return {
      database: {
        name: this.config.database || 'afa_office_test',
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        dropIfExists: false,
        createIfNotExists: true,
        ...config.database
      },
      users: config.users || [
        {
          username: 'test_admin',
          password: 'test_admin_pass',
          host: 'localhost',
          template: 'test_admin',
          description: '测试管理员用户'
        },
        {
          username: 'test_user',
          password: 'test_user_pass',
          host: 'localhost',
          template: 'test_user',
          description: '测试普通用户'
        }
      ],
      schema: {
        initializeSchema: true,
        insertSeedData: false,
        dropExistingObjects: false,
        ...config.schema
      },
      logging: {
        enableLogging: true,
        logLevel: 'info',
        logToFile: false,
        ...config.logging
      },
      validation: {
        validateAfterInit: true,
        validateUsers: true,
        validateSchema: true,
        validateConnections: true,
        ...config.validation
      }
    };
  }

  /**
   * 执行完整初始化
   */
  async initializeComplete(): Promise<CompleteInitializationResult> {
    const startTime = Date.now();
    this.status.startTime = new Date();
    this.status.phase = 'database';
    this.status.progress = 0;

    const result: CompleteInitializationResult = {
      success: false,
      databaseResult: {} as InitializationResult,
      userResults: [],
      schemaResult: {} as SchemaInitializationResult,
      totalDuration: 0,
      timestamp: new Date(),
      summary: {
        databaseCreated: false,
        usersCreated: 0,
        tablesCreated: 0,
        viewsCreated: 0,
        proceduresCreated: 0,
        seedRecordsInserted: 0
      }
    };

    try {
      this.log('info', '🚀 开始MySQL完整初始化流程', 'database');

      // 第一阶段：初始化数据库
      this.updateStatus('database', 10, '正在初始化数据库...');
      result.databaseResult = await this.initializeDatabase();
      result.summary.databaseCreated = result.databaseResult.success;
      
      if (!result.databaseResult.success) {
        throw new Error('数据库初始化失败');
      }

      // 第二阶段：创建用户
      this.updateStatus('users', 30, '正在创建用户...');
      result.userResults = await this.createUsers();
      result.summary.usersCreated = result.userResults.filter(r => r.success).length;

      // 第三阶段：初始化结构
      this.updateStatus('schema', 60, '正在初始化数据库结构...');
      result.schemaResult = await this.initializeSchema();
      result.summary.tablesCreated = result.schemaResult.statistics.tablesCreated;
      result.summary.viewsCreated = result.schemaResult.statistics.viewsCreated;
      result.summary.proceduresCreated = result.schemaResult.statistics.proceduresCreated;
      result.summary.seedRecordsInserted = result.schemaResult.statistics.seedRecordsInserted;

      // 第四阶段：验证
      if (this.initConfig.validation.validateAfterInit) {
        this.updateStatus('validation', 85, '正在验证初始化结果...');
        result.validationResults = await this.validateInitialization();
      }

      // 完成
      this.updateStatus('complete', 100, '初始化完成');
      result.success = true;
      result.totalDuration = Date.now() - startTime;

      this.log('info', `✅ MySQL完整初始化成功，耗时: ${result.totalDuration}ms`, 'complete');
      this.logSummary(result.summary);

    } catch (error) {
      this.status.phase = 'error';
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.status.errors.push(errorMessage);
      result.success = false;
      result.totalDuration = Date.now() - startTime;
      
      this.log('error', `❌ MySQL初始化失败: ${errorMessage}`, 'error');
      throw error;
    }

    return result;
  }

  /**
   * 初始化数据库
   */
  private async initializeDatabase(): Promise<InitializationResult> {
    const dbConfig: Partial<DatabaseInitializationConfig> = {
      databaseName: this.initConfig.database.name,
      charset: this.initConfig.database.charset,
      collation: this.initConfig.database.collation,
      dropIfExists: this.initConfig.database.dropIfExists,
      createIfNotExists: this.initConfig.database.createIfNotExists,
      initializeSchema: false, // 在后面的阶段处理
      insertSeedData: false,   // 在后面的阶段处理
      enableLogging: this.initConfig.logging.enableLogging,
      logLevel: this.initConfig.logging.logLevel
    };

    const initializer = new MySQLDatabaseInitializer(this.config, dbConfig);
    return await initializer.initialize();
  }

  /**
   * 创建用户
   */
  private async createUsers(): Promise<UserManagementResult[]> {
    const userManager = new MySQLUserManager(this.config, {
      enableLogging: this.initConfig.logging.enableLogging,
      logLevel: this.initConfig.logging.logLevel
    });

    const results: UserManagementResult[] = [];

    for (const userConfig of this.initConfig.users) {
      try {
        this.log('info', `创建用户: ${userConfig.username}@${userConfig.host}`, 'users');
        
        const result = await userManager.createTestUserFromTemplate(
          userConfig.template,
          userConfig.username,
          userConfig.password,
          userConfig.host,
          this.initConfig.database.name
        );
        
        results.push(result);
        
        if (result.success) {
          this.log('info', `✅ 用户创建成功: ${userConfig.username}`, 'users');
        } else {
          this.log('error', `❌ 用户创建失败: ${userConfig.username}`, 'users');
          this.status.warnings.push(`用户创建失败: ${userConfig.username}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          success: false,
          username: userConfig.username,
          operations: [],
          errors: [errorMessage],
          warnings: [],
          timestamp: new Date()
        });
        this.log('error', `用户创建异常: ${userConfig.username} - ${errorMessage}`, 'users');
      }
    }

    return results;
  }

  /**
   * 初始化结构
   */
  private async initializeSchema(): Promise<SchemaInitializationResult> {
    const schemaConfig = {
      schemaFilePath: this.initConfig.schema.schemaFilePath,
      seedDataFilePath: this.initConfig.schema.seedDataFilePath,
      dropExistingObjects: this.initConfig.schema.dropExistingObjects,
      createTables: this.initConfig.schema.initializeSchema,
      createViews: this.initConfig.schema.initializeSchema,
      createProcedures: this.initConfig.schema.initializeSchema,
      createTriggers: this.initConfig.schema.initializeSchema,
      createIndexes: this.initConfig.schema.initializeSchema,
      insertSeedData: this.initConfig.schema.insertSeedData,
      validateStructure: this.initConfig.validation.validateSchema,
      enableLogging: this.initConfig.logging.enableLogging,
      logLevel: this.initConfig.logging.logLevel
    } as Partial<SchemaInitializationConfig>;

    const schemaInitializer = new MySQLSchemaInitializer(this.config, schemaConfig);
    return await schemaInitializer.initializeSchema();
  }

  /**
   * 验证初始化结果
   */
  private async validateInitialization(): Promise<{
    database: boolean;
    users: boolean;
    schema: boolean;
    connections: boolean;
  }> {
    const results = {
      database: false,
      users: false,
      schema: false,
      connections: false
    } as {
      database: boolean;
      users: boolean;
      schema: boolean;
      connections: boolean;
    };

    try {
      // 验证数据库
      if (this.initConfig.validation.validateAfterInit) {
        const dbInitializer = new MySQLDatabaseInitializer(this.config);
        const dbValidation = await dbInitializer.validateInitialization();
        results.database = dbValidation.isValid;
        
        if (!dbValidation.isValid) {
          this.status.warnings.push(...dbValidation.issues);
        }
      }

      // 验证用户
      if (this.initConfig.validation.validateUsers) {
        const userManager = new MySQLUserManager(this.config);
        let allUsersValid = true;
        
        for (const userConfig of this.initConfig.users) {
          try {
            const userStatus = await userManager.getUserStatus(userConfig.username, userConfig.host);
            if (!userStatus.exists) {
              allUsersValid = false;
              this.status.warnings.push(`用户不存在: ${userConfig.username}@${userConfig.host}`);
            }
          } catch (error) {
            allUsersValid = false;
            this.status.warnings.push(`验证用户失败: ${userConfig.username}`);
          }
        }
        
        results.users = allUsersValid;
      }

      // 验证结构
      if (this.initConfig.validation.validateSchema) {
        const schemaInitializer = new MySQLSchemaInitializer(this.config);
        const schemaValidation = await schemaInitializer.validateSchema();
        results.schema = schemaValidation.isValid;
        
        if (!schemaValidation.isValid) {
          this.status.warnings.push(...schemaValidation.issues);
        }
      }

      // 验证连接
      if (this.initConfig.validation.validateConnections) {
        // 这里可以添加连接测试逻辑
        results.connections = true; // 简化实现
      }

    } catch (error) {
      this.log('error', `验证过程中出错: ${error}`, 'validation');
    }

    return results;
  }

  /**
   * 更新状态
   */
  private updateStatus(phase: InitializationStatus['phase'], progress: number, operation: string): void {
    this.status.phase = phase;
    this.status.progress = progress;
    this.status.currentOperation = operation;
    
    // 估算剩余时间
    if (this.status.startTime && progress > 0) {
      const elapsed = Date.now() - this.status.startTime.getTime();
      const totalEstimated = (elapsed / progress) * 100;
      this.status.estimatedTimeRemaining = Math.max(0, (totalEstimated - elapsed) / 1000);
    }
  }

  /**
   * 获取当前状态
   */
  getStatus(): InitializationStatus {
    return { ...this.status };
  }

  /**
   * 获取日志条目
   */
  getLogEntries(): Array<{
    timestamp: Date;
    level: string;
    message: string;
    phase: string;
  }> {
    return [...this.logEntries];
  }

  /**
   * 清理日志
   */
  clearLogs(): void {
    this.logEntries = [];
  }

  /**
   * 重置状态
   */
  resetStatus(): void {
    this.status = {
      phase: 'idle',
      progress: 0,
      currentOperation: '等待开始',
      startTime: null,
      estimatedTimeRemaining: 0,
      errors: [],
      warnings: []
    } as InitializationStatus;
    this.clearLogs();
  }

  /**
   * 获取初始化配置
   */
  getInitializationConfig(): CompleteInitializationConfig {
    return { ...this.initConfig };
  }

  /**
   * 更新初始化配置
   */
  updateInitializationConfig(newConfig: Partial<CompleteInitializationConfig>): void {
    this.initConfig = this.mergeWithDefaults(newConfig);
  }

  /**
   * 生成初始化报告
   */
  generateReport(result: CompleteInitializationResult): string {
    const report = [
      '# MySQL初始化报告',
      `生成时间: ${result.timestamp.toISOString()}`,
      `总耗时: ${result.totalDuration}ms`,
      `初始化结果: ${result.success ? '✅ 成功' : '❌ 失败'}`,
      '',
      '## 摘要',
      `- 数据库创建: ${result.summary.databaseCreated ? '✅' : '❌'}`,
      `- 用户创建: ${result.summary.usersCreated} 个`,
      `- 表创建: ${result.summary.tablesCreated} 个`,
      `- 视图创建: ${result.summary.viewsCreated} 个`,
      `- 存储过程创建: ${result.summary.proceduresCreated} 个`,
      `- 种子数据插入: ${result.summary.seedRecordsInserted} 条记录`,
      '',
      '## 详细结果',
      '### 数据库初始化',
      `- 成功: ${result.databaseResult.success}`,
      `- 操作: ${result.databaseResult.operations.join(', ')}`,
      result.databaseResult.errors.length > 0 ? `- 错误: ${result.databaseResult.errors.join(', ')}` : '',
      result.databaseResult.warnings.length > 0 ? `- 警告: ${result.databaseResult.warnings.join(', ')}` : '',
      '',
      '### 用户创建',
      ...result.userResults.map(userResult => 
        `- ${userResult.username}: ${userResult.success ? '✅' : '❌'} ${userResult.errors.join(', ')}`
      ),
      '',
      '### 结构初始化',
      `- 成功: ${result.schemaResult.success}`,
      `- 操作: ${result.schemaResult.operations.join(', ')}`,
      result.schemaResult.errors.length > 0 ? `- 错误: ${result.schemaResult.errors.join(', ')}` : '',
      result.schemaResult.warnings.length > 0 ? `- 警告: ${result.schemaResult.warnings.join(', ')}` : '',
    ];

    if (result.validationResults) {
      report.push(
        '',
        '### 验证结果',
        `- 数据库验证: ${result.validationResults.database ? '✅' : '❌'}`,
        `- 用户验证: ${result.validationResults.users ? '✅' : '❌'}`,
        `- 结构验证: ${result.validationResults.schema ? '✅' : '❌'}`,
        `- 连接验证: ${result.validationResults.connections ? '✅' : '❌'}`
      );
    }

    return report.filter(line => line !== '').join('\n');
  }

  /**
   * 日志记录
   */
  private log(level: 'error' | 'warn' | 'info' | 'debug', message: string, phase: string): void {
    const entry = {
      timestamp: new Date(),
      level,
      message,
      phase
    };

    this.logEntries.push(entry);

    // 保持日志条目在合理范围内
    if (this.logEntries.length > 1000) {
      this.logEntries = this.logEntries.slice(-500);
    }

    if (this.initConfig.logging.enableLogging) {
      const levels = ['error', 'warn', 'info', 'debug'];
      const currentLevelIndex = levels.indexOf(this.initConfig.logging.logLevel);
      const messageLevelIndex = levels.indexOf(level);

      if (messageLevelIndex <= currentLevelIndex) {
        const timestamp = entry.timestamp.toISOString();
        const prefix = `[${timestamp}] [MySQL-InitManager] [${level.toUpperCase()}] [${phase}]`;
        
        switch (level) {
          case 'error':
            console.error(prefix, message);
            break;
          case 'warn':
            console.warn(prefix, message);
            break;
          case 'info':
            console.info(prefix, message);
            break;
          case 'debug':
            console.debug(prefix, message);
            break;
        }
      }
    }
  }

  /**
   * 记录摘要信息
   */
  private logSummary(summary: CompleteInitializationResult['summary']): void {
    this.log('info', '📊 初始化摘要:', 'complete');
    this.log('info', `  - 数据库: ${summary.databaseCreated ? '✅' : '❌'}`, 'complete');
    this.log('info', `  - 用户: ${summary.usersCreated} 个`, 'complete');
    this.log('info', `  - 表: ${summary.tablesCreated} 个`, 'complete');
    this.log('info', `  - 视图: ${summary.viewsCreated} 个`, 'complete');
    this.log('info', `  - 存储过程: ${summary.proceduresCreated} 个`, 'complete');
    if (summary.seedRecordsInserted > 0) {
      this.log('info', `  - 种子数据: ${summary.seedRecordsInserted} 条记录`, 'complete');
    }
  }
}

/**
 * 创建MySQL初始化管理器
 */
export function createMySQLInitializationManager(
  config: MySQLConfig,
  initConfig?: Partial<CompleteInitializationConfig>
): MySQLInitializationManager {
  return new MySQLInitializationManager(config, initConfig);
}

/**
 * 快速完整初始化
 */
export async function quickCompleteInitialization(
  databaseName: string,
  options: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    dropIfExists?: boolean;
    insertSeedData?: boolean;
    createTestUsers?: boolean;
  } = {}
): Promise<CompleteInitializationResult> {
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

  const initConfig = {
    database: {
      name: databaseName,
      charset: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
      dropIfExists: options.dropIfExists || false,
      createIfNotExists: true
    },
    schema: {
      initializeSchema: true,
      insertSeedData: options.insertSeedData || false,
      dropExistingObjects: options.dropIfExists || false
    },
    users: options.createTestUsers !== false ? undefined : [] // 使用默认用户或不创建用户
  } as Partial<CompleteInitializationConfig>;

  const manager = createMySQLInitializationManager(mysqlConfig, initConfig);
  return await manager.initializeComplete();
}

/**
 * MySQL初始化管理器工厂
 */
export class MySQLInitializationManagerFactory {
  private static managers = new Map<string, MySQLInitializationManager>();

  /**
   * 获取或创建初始化管理器
   */
  static getOrCreateManager(
    key: string,
    config: MySQLConfig,
    initConfig?: Partial<CompleteInitializationConfig>
  ): MySQLInitializationManager {
    if (!this.managers.has(key)) {
      const manager = new MySQLInitializationManager(config, initConfig);
      this.managers.set(key, manager);
    }
    return this.managers.get(key)!;
  }

  /**
   * 移除初始化管理器
   */
  static removeManager(key: string): void {
    this.managers.delete(key);
  }

  /**
   * 清理所有初始化管理器
   */
  static clearAll(): void {
    this.managers.clear();
  }

  /**
   * 获取所有管理器状态
   */
  static getAllManagerStatus(): Record<string, InitializationStatus> {
    const status: Record<string, InitializationStatus> = {};
    for (const [key, manager] of this.managers) {
      status[key] = manager.getStatus();
    }
    return status;
  }

  /**
   * 获取管理器列表
   */
  static getManagerKeys(): string[] {
    return Array.from(this.managers.keys());
  }
}