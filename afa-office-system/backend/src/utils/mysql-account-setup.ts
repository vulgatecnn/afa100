/**
 * MySQL专用数据库访问账号设置工具
 * 创建专门用于应用程序访问的MySQL账号，并生成相应的环境变量配置
 */

import mysql from 'mysql2/promise';
import { randomBytes } from 'crypto';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { MySQLConfig } from '../config/database-config-manager';
import { mySQLConfigManager } from '../config/mysql-config-manager';

/**
 * 数据库访问账号配置
 */
export interface DatabaseAccountConfig {
  // 账号信息
  username: string;
  password: string;
  host: string;
  description: string;
  
  // 数据库信息
  databaseName: string;
  
  // 权限配置
  permissions: {
    select: boolean;
    insert: boolean;
    update: boolean;
    delete: boolean;
    create: boolean;
    drop: boolean;
    alter: boolean;
    index: boolean;
  };
  
  // 连接限制
  maxConnections: number;
  maxQueriesPerHour: number;
  maxUpdatesPerHour: number;
  maxConnectionsPerHour: number;
}

/**
 * 环境变量配置
 */
export interface EnvironmentConfig {
  // 应用数据库配置
  APP_DB_TYPE: string;
  APP_DB_HOST: string;
  APP_DB_PORT: number;
  APP_DB_USER: string;
  APP_DB_PASSWORD: string;
  APP_DB_NAME: string;
  APP_DB_CONNECTION_LIMIT: number;
  APP_DB_ACQUIRE_TIMEOUT: number;
  APP_DB_TIMEOUT: number;
  
  // 测试数据库配置
  TEST_DB_TYPE: string;
  TEST_DB_HOST: string;
  TEST_DB_PORT: number;
  TEST_DB_USER: string;
  TEST_DB_PASSWORD: string;
  TEST_DB_NAME: string;
  TEST_DB_CONNECTION_LIMIT: number;
  TEST_DB_ACQUIRE_TIMEOUT: number;
  TEST_DB_TIMEOUT: number;
}

/**
 * 账号创建结果
 */
export interface AccountSetupResult {
  success: boolean;
  accountConfig: DatabaseAccountConfig;
  environmentConfig: EnvironmentConfig;
  operations: string[];
  errors: string[];
  warnings: string[];
  envFilePath: string;
  timestamp: Date;
}

/**
 * MySQL账号设置管理器
 */
export class MySQLAccountSetup {
  private adminConfig: MySQLConfig;
  private connection: mysql.Connection | null = null;

  constructor(adminConfig: MySQLConfig) {
    this.adminConfig = adminConfig;
  }

  /**
   * 创建应用程序数据库访问账号
   */
  async createApplicationAccount(
    databaseName: string,
    options: {
      username?: string;
      password?: string;
      host?: string;
      environment?: 'development' | 'test' | 'production';
      permissions?: Partial<DatabaseAccountConfig['permissions']>;
    } = {}
  ): Promise<AccountSetupResult> {
    const result: AccountSetupResult = {
      success: false,
      accountConfig: {} as DatabaseAccountConfig,
      environmentConfig: {} as EnvironmentConfig,
      operations: [],
      errors: [],
      warnings: [],
      envFilePath: '',
      timestamp: new Date()
    };

    try {
      console.log('🚀 开始创建MySQL应用程序访问账号...');

      // 生成账号配置
      const accountConfig = this.generateAccountConfig(databaseName, options);
      result.accountConfig = accountConfig;

      // 连接到MySQL
      await this.connect();
      result.operations.push('连接MySQL服务器');

      // 检查数据库是否存在
      const dbExists = await this.checkDatabaseExists(databaseName);
      if (!dbExists) {
        result.warnings.push(`数据库 ${databaseName} 不存在，将创建该数据库`);
        await this.createDatabase(databaseName);
        result.operations.push('创建数据库');
      }

      // 创建用户账号
      await this.createUser(accountConfig);
      result.operations.push('创建用户账号');

      // 授予权限
      await this.grantPermissions(accountConfig);
      result.operations.push('授予数据库权限');

      // 设置资源限制
      await this.setResourceLimits(accountConfig);
      result.operations.push('设置资源限制');

      // 刷新权限
      await this.flushPrivileges();
      result.operations.push('刷新权限表');

      // 生成环境变量配置
      const envConfig = this.generateEnvironmentConfig(accountConfig, options.environment || 'development');
      result.environmentConfig = envConfig;

      // 写入环境变量文件
      const envFilePath = await this.writeEnvironmentFile(envConfig, options.environment || 'development');
      result.envFilePath = envFilePath;
      result.operations.push('写入环境变量文件');

      // 验证账号
      await this.validateAccount(accountConfig);
      result.operations.push('验证账号配置');

      result.success = true;
      console.log('✅ MySQL应用程序访问账号创建成功');
      this.logAccountInfo(accountConfig);

    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      console.error('❌ 创建MySQL访问账号失败:', errorMessage);
      throw error;
    } finally {
      await this.disconnect();
    }

    return result;
  }

  /**
   * 连接到MySQL
   */
  private async connect(): Promise<void> {
    if (this.connection) {
      return;
    }

    const connectionConfig = {
      host: this.adminConfig.host,
      port: this.adminConfig.port,
      user: this.adminConfig.user,
      password: this.adminConfig.password,
      charset: 'utf8mb4',
      timezone: '+00:00'
    };

    this.connection = await mysql.createConnection(connectionConfig);
    console.log('🔗 MySQL管理员连接已建立');
  }

  /**
   * 断开连接
   */
  private async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      console.log('🔌 MySQL连接已断开');
    }
  }

  /**
   * 生成账号配置
   */
  private generateAccountConfig(
    databaseName: string,
    options: {
      username?: string;
      password?: string;
      host?: string;
      environment?: string;
      permissions?: Partial<DatabaseAccountConfig['permissions']>;
    }
  ): DatabaseAccountConfig {
    const environment = options.environment || 'development';
    const defaultUsername = `afa_${environment}_user`;
    const defaultPassword = this.generateSecurePassword();

    return {
      username: options.username || defaultUsername,
      password: options.password || defaultPassword,
      host: options.host || 'localhost',
      description: `AFA办公小程序${environment}环境数据库访问账号`,
      databaseName,
      permissions: {
        select: true,
        insert: true,
        update: true,
        delete: true,
        create: environment === 'development',
        drop: environment === 'development',
        alter: environment === 'development',
        index: environment === 'development',
        ...options.permissions
      },
      maxConnections: environment === 'production' ? 50 : 20,
      maxQueriesPerHour: environment === 'production' ? 10000 : 5000,
      maxUpdatesPerHour: environment === 'production' ? 1000 : 500,
      maxConnectionsPerHour: environment === 'production' ? 100 : 50
    };
  }

  /**
   * 生成安全密码
   */
  private generateSecurePassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * 检查数据库是否存在
   */
  private async checkDatabaseExists(databaseName: string): Promise<boolean> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    const [databases] = await this.connection.execute(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [databaseName]
    );

    return Array.isArray(databases) && databases.length > 0;
  }

  /**
   * 创建数据库
   */
  private async createDatabase(databaseName: string): Promise<void> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    const createSQL = `
      CREATE DATABASE \`${databaseName}\`
      CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci
    `;

    await this.connection.execute(createSQL);
    console.log(`📦 数据库已创建: ${databaseName}`);
  }

  /**
   * 创建用户
   */
  private async createUser(config: DatabaseAccountConfig): Promise<void> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    // 检查用户是否已存在
    const [users] = await this.connection.execute(
      'SELECT User FROM mysql.user WHERE User = ? AND Host = ?',
      [config.username, config.host]
    );

    if (Array.isArray(users) && users.length > 0) {
      console.log(`⚠️ 用户已存在，将删除后重新创建: ${config.username}@${config.host}`);
      await this.connection.execute(`DROP USER '${config.username}'@'${config.host}'`);
    }

    // 创建用户
    const createUserSQL = `CREATE USER '${config.username}'@'${config.host}' IDENTIFIED BY '${config.password}'`;
    await this.connection.execute(createUserSQL);
    
    console.log(`👤 用户已创建: ${config.username}@${config.host}`);
  }

  /**
   * 授予权限
   */
  private async grantPermissions(config: DatabaseAccountConfig): Promise<void> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    const permissions: string[] = [];
    
    if (config.permissions.select) permissions.push('SELECT');
    if (config.permissions.insert) permissions.push('INSERT');
    if (config.permissions.update) permissions.push('UPDATE');
    if (config.permissions.delete) permissions.push('DELETE');
    if (config.permissions.create) permissions.push('CREATE');
    if (config.permissions.drop) permissions.push('DROP');
    if (config.permissions.alter) permissions.push('ALTER');
    if (config.permissions.index) permissions.push('INDEX');

    const grantSQL = `GRANT ${permissions.join(', ')} ON \`${config.databaseName}\`.* TO '${config.username}'@'${config.host}'`;
    await this.connection.execute(grantSQL);
    
    console.log(`🔑 权限已授予: ${permissions.join(', ')}`);
  }

  /**
   * 设置资源限制
   */
  private async setResourceLimits(config: DatabaseAccountConfig): Promise<void> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    const alterSQL = `
      ALTER USER '${config.username}'@'${config.host}' WITH
      MAX_CONNECTIONS_PER_HOUR ${config.maxConnectionsPerHour}
      MAX_QUERIES_PER_HOUR ${config.maxQueriesPerHour}
      MAX_UPDATES_PER_HOUR ${config.maxUpdatesPerHour}
      MAX_USER_CONNECTIONS ${config.maxConnections}
    `;

    await this.connection.execute(alterSQL);
    console.log('📊 资源限制已设置');
  }

  /**
   * 刷新权限
   */
  private async flushPrivileges(): Promise<void> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    await this.connection.execute('FLUSH PRIVILEGES');
    console.log('🔄 权限表已刷新');
  }

  /**
   * 生成环境变量配置
   */
  private generateEnvironmentConfig(
    accountConfig: DatabaseAccountConfig,
    environment: string
  ): EnvironmentConfig {
    const baseConfig = {
      TYPE: 'mysql',
      HOST: this.adminConfig.host,
      PORT: this.adminConfig.port,
      USER: accountConfig.username,
      PASSWORD: accountConfig.password,
      NAME: accountConfig.databaseName,
      CONNECTION_LIMIT: 10,
      ACQUIRE_TIMEOUT: 60000,
      TIMEOUT: 60000
    };

    return {
      // 应用数据库配置
      APP_DB_TYPE: baseConfig.TYPE,
      APP_DB_HOST: baseConfig.HOST,
      APP_DB_PORT: baseConfig.PORT,
      APP_DB_USER: baseConfig.USER,
      APP_DB_PASSWORD: baseConfig.PASSWORD,
      APP_DB_NAME: baseConfig.NAME,
      APP_DB_CONNECTION_LIMIT: baseConfig.CONNECTION_LIMIT,
      APP_DB_ACQUIRE_TIMEOUT: baseConfig.ACQUIRE_TIMEOUT,
      APP_DB_TIMEOUT: baseConfig.TIMEOUT,
      
      // 测试数据库配置（使用相同账号但不同数据库名）
      TEST_DB_TYPE: baseConfig.TYPE,
      TEST_DB_HOST: baseConfig.HOST,
      TEST_DB_PORT: baseConfig.PORT,
      TEST_DB_USER: baseConfig.USER,
      TEST_DB_PASSWORD: baseConfig.PASSWORD,
      TEST_DB_NAME: `${baseConfig.NAME}_test`,
      TEST_DB_CONNECTION_LIMIT: 5,
      TEST_DB_ACQUIRE_TIMEOUT: 30000,
      TEST_DB_TIMEOUT: 30000
    };
  }

  /**
   * 写入环境变量文件
   */
  private async writeEnvironmentFile(
    envConfig: EnvironmentConfig,
    environment: string
  ): Promise<string> {
    const envFilePath = join(process.cwd(), `.env.${environment}`);
    
    try {
      // 尝试读取现有文件
      let existingContent = '';
      try {
        existingContent = await readFile(envFilePath, 'utf-8');
      } catch (error) {
        // 文件不存在，使用空内容
      }

      // 生成新的数据库配置部分
      const dbConfigSection = this.generateEnvConfigSection(envConfig);
      
      // 如果文件已存在，更新数据库配置部分
      let newContent: string;
      if (existingContent) {
        // 移除现有的数据库配置
        const lines = existingContent.split('\n');
        const filteredLines = lines.filter(line => 
          !line.startsWith('APP_DB_') && 
          !line.startsWith('TEST_DB_') &&
          !line.includes('# MySQL应用数据库配置') &&
          !line.includes('# MySQL测试数据库配置')
        );
        
        newContent = filteredLines.join('\n').trim() + '\n\n' + dbConfigSection;
      } else {
        // 创建新文件
        newContent = this.generateCompleteEnvFile(envConfig, environment);
      }

      await writeFile(envFilePath, newContent, 'utf-8');
      console.log(`📝 环境变量文件已更新: ${envFilePath}`);
      
      return envFilePath;
    } catch (error) {
      console.error('写入环境变量文件失败:', error);
      throw error;
    }
  }

  /**
   * 生成环境变量配置部分
   */
  private generateEnvConfigSection(envConfig: EnvironmentConfig): string {
    return `# MySQL应用数据库配置
APP_DB_TYPE=${envConfig.APP_DB_TYPE}
APP_DB_HOST=${envConfig.APP_DB_HOST}
APP_DB_PORT=${envConfig.APP_DB_PORT}
APP_DB_USER=${envConfig.APP_DB_USER}
APP_DB_PASSWORD=${envConfig.APP_DB_PASSWORD}
APP_DB_NAME=${envConfig.APP_DB_NAME}
APP_DB_CONNECTION_LIMIT=${envConfig.APP_DB_CONNECTION_LIMIT}
APP_DB_ACQUIRE_TIMEOUT=${envConfig.APP_DB_ACQUIRE_TIMEOUT}
APP_DB_TIMEOUT=${envConfig.APP_DB_TIMEOUT}

# MySQL测试数据库配置
TEST_DB_TYPE=${envConfig.TEST_DB_TYPE}
TEST_DB_HOST=${envConfig.TEST_DB_HOST}
TEST_DB_PORT=${envConfig.TEST_DB_PORT}
TEST_DB_USER=${envConfig.TEST_DB_USER}
TEST_DB_PASSWORD=${envConfig.TEST_DB_PASSWORD}
TEST_DB_NAME=${envConfig.TEST_DB_NAME}
TEST_DB_CONNECTION_LIMIT=${envConfig.TEST_DB_CONNECTION_LIMIT}
TEST_DB_ACQUIRE_TIMEOUT=${envConfig.TEST_DB_ACQUIRE_TIMEOUT}
TEST_DB_TIMEOUT=${envConfig.TEST_DB_TIMEOUT}`;
  }

  /**
   * 生成完整的环境变量文件
   */
  private generateCompleteEnvFile(envConfig: EnvironmentConfig, environment: string): string {
    return `# AFA办公小程序 - ${environment.toUpperCase()}环境配置
# 生成时间: ${new Date().toISOString()}

# 服务器配置
PORT=3000
NODE_ENV=${environment}

${this.generateEnvConfigSection(envConfig)}

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# 微信小程序配置
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret

# 日志配置
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# CORS配置
CORS_ORIGIN=http://localhost:3001,http://localhost:3002

# 通行码配置
PASSCODE_DEFAULT_DURATION=24
PASSCODE_DEFAULT_USAGE_LIMIT=10
PASSCODE_REFRESH_INTERVAL=5`;
  }

  /**
   * 验证账号
   */
  private async validateAccount(config: DatabaseAccountConfig): Promise<void> {
    // 使用新创建的账号进行连接测试
    const testConnection = await mysql.createConnection({
      host: this.adminConfig.host,
      port: this.adminConfig.port,
      user: config.username,
      password: config.password,
      database: config.databaseName,
      charset: 'utf8mb4'
    });

    try {
      // 测试基本查询
      await testConnection.execute('SELECT 1 as test');
      console.log('✅ 账号验证成功');
    } finally {
      await testConnection.end();
    }
  }

  /**
   * 记录账号信息
   */
  private logAccountInfo(config: DatabaseAccountConfig): void {
    console.log('\n📋 MySQL访问账号信息:');
    console.log(`用户名: ${config.username}`);
    console.log(`主机: ${config.host}`);
    console.log(`数据库: ${config.databaseName}`);
    console.log(`描述: ${config.description}`);
    console.log(`权限: ${Object.entries(config.permissions)
      .filter(([_, enabled]) => enabled)
      .map(([perm, _]) => perm.toUpperCase())
      .join(', ')}`);
    console.log(`最大连接数: ${config.maxConnections}`);
    console.log(`每小时最大查询数: ${config.maxQueriesPerHour}`);
    console.log(`每小时最大更新数: ${config.maxUpdatesPerHour}`);
    console.log(`每小时最大连接数: ${config.maxConnectionsPerHour}`);
  }

  /**
   * 删除应用程序账号
   */
  async deleteApplicationAccount(username: string, host: string = 'localhost'): Promise<void> {
    try {
      await this.connect();
      
      // 检查用户是否存在
      const [users] = await this.connection!.execute(
        'SELECT User FROM mysql.user WHERE User = ? AND Host = ?',
        [username, host]
      );

      if (Array.isArray(users) && users.length > 0) {
        await this.connection!.execute(`DROP USER '${username}'@'${host}'`);
        await this.flushPrivileges();
        console.log(`✅ 用户已删除: ${username}@${host}`);
      } else {
        console.log(`⚠️ 用户不存在: ${username}@${host}`);
      }
    } finally {
      await this.disconnect();
    }
  }
}

/**
 * 创建MySQL账号设置管理器
 */
export function createMySQLAccountSetup(adminConfig?: MySQLConfig): MySQLAccountSetup {
  const config = adminConfig || mySQLConfigManager.getMySQLConfigTemplate('development');
  return new MySQLAccountSetup(config);
}

/**
 * 快速创建应用程序数据库访问账号
 */
export async function quickCreateApplicationAccount(
  databaseName: string,
  environment: 'development' | 'test' | 'production' = 'development',
  options: {
    adminHost?: string;
    adminPort?: number;
    adminUser?: string;
    adminPassword?: string;
    username?: string;
    password?: string;
  } = {}
): Promise<AccountSetupResult> {
  // 获取管理员配置
  const adminConfig = mySQLConfigManager.getMySQLConfigTemplate('development');
  
  // 应用选项
  const config: MySQLConfig = {
    ...adminConfig,
    host: options.adminHost || adminConfig.host,
    port: options.adminPort || adminConfig.port,
    user: options.adminUser || adminConfig.user,
    password: options.adminPassword || adminConfig.password
  };

  const accountSetup = new MySQLAccountSetup(config);
  return await accountSetup.createApplicationAccount(databaseName, {
    environment,
    ...(options.username !== undefined && { username: options.username }),
    ...(options.password !== undefined && { password: options.password })
  });
}


