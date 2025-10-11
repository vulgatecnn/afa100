/**
 * MySQL用户和权限管理器
 * 负责创建和管理MySQL测试用户账号及其权限
 */

import mysql from 'mysql2/promise';
import { MySQLConfig } from '../config/database-config-manager';
import { mySQLConfigManager } from '../config/mysql-config-manager';

/**
 * MySQL用户配置
 */
export interface MySQLUserConfig {
  username: string;
  password: string;
  host: string;
  description?: string;
  maxConnections?: number;
  maxQueriesPerHour?: number;
  maxUpdatesPerHour?: number;
  maxConnectionsPerHour?: number;
}

/**
 * MySQL权限配置
 */
export interface MySQLPrivilegeConfig {
  database: string;
  table?: string;
  privileges: MySQLPrivilege[];
  grantOption?: boolean;
}

/**
 * MySQL权限类型
 */
export enum MySQLPrivilege {
  // 数据权限
  SELECT = 'SELECT',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  
  // 结构权限
  CREATE = 'CREATE',
  DROP = 'DROP',
  ALTER = 'ALTER',
  INDEX = 'INDEX',
  
  // 管理权限
  CREATE_USER = 'CREATE USER',
  RELOAD = 'RELOAD',
  PROCESS = 'PROCESS',
  SHOW_DATABASES = 'SHOW DATABASES',
  
  // 特殊权限
  ALL_PRIVILEGES = 'ALL PRIVILEGES',
  USAGE = 'USAGE'
}

/**
 * 用户权限模板
 */
export interface UserPrivilegeTemplate {
  name: string;
  description: string;
  privileges: MySQLPrivilegeConfig[];
}

/**
 * 用户管理结果
 */
export interface UserManagementResult {
  success: boolean;
  username: string;
  operations: string[];
  errors: string[];
  warnings: string[];
  timestamp: Date;
}

/**
 * 用户状态信息
 */
export interface UserStatus {
  exists: boolean;
  username: string;
  host: string;
  accountLocked: boolean;
  passwordExpired: boolean;
  maxConnections: number;
  maxQueriesPerHour: number;
  maxUpdatesPerHour: number;
  maxConnectionsPerHour: number;
  privileges: string[];
  lastLogin: Date | null;
  created: Date | null;
}

/**
 * MySQL用户管理器
 */
export class MySQLUserManager {
  private config: MySQLConfig;
  private connection: mysql.Connection | null = null;
  private enableLogging: boolean;
  private logLevel: 'error' | 'warn' | 'info' | 'debug';

  constructor(
    config: MySQLConfig,
    options: {
      enableLogging?: boolean;
      logLevel?: 'error' | 'warn' | 'info' | 'debug';
    } = {}
  ) {
    this.config = config;
    this.enableLogging = options.enableLogging !== false;
    this.logLevel = options.logLevel || 'info';
  }

  /**
   * 连接到MySQL服务器
   */
  private async connect(): Promise<void> {
    if (this.connection) {
      return;
    }

    const connectionConfig = {
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      charset: 'utf8mb4',
      timezone: '+00:00'
    };

    this.connection = await mysql.createConnection(connectionConfig);
    this.log('debug', '🔗 MySQL管理员连接已建立');
  }

  /**
   * 断开连接
   */
  private async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      this.log('debug', '🔌 MySQL连接已断开');
    }
  }

  /**
   * 创建测试用户
   */
  async createTestUser(userConfig: MySQLUserConfig): Promise<UserManagementResult> {
    const result: UserManagementResult = {
      success: false,
      username: userConfig.username,
      operations: [],
      errors: [],
      warnings: [],
      timestamp: new Date()
    };

    try {
      await this.connect();
      
      this.log('info', `🚀 开始创建测试用户: ${userConfig.username}@${userConfig.host}`);

      // 检查用户是否已存在
      const userExists = await this.checkUserExists(userConfig.username, userConfig.host);
      if (userExists) {
        result.warnings.push('用户已存在');
        this.log('warn', `⚠️ 用户已存在: ${userConfig.username}@${userConfig.host}`);
      } else {
        // 创建用户
        await this.createUser(userConfig);
        result.operations.push('创建用户');
        this.log('info', `✅ 用户创建成功: ${userConfig.username}@${userConfig.host}`);
      }

      // 设置用户资源限制
      if (userConfig.maxConnections || userConfig.maxQueriesPerHour || 
          userConfig.maxUpdatesPerHour || userConfig.maxConnectionsPerHour) {
        await this.setUserResourceLimits(userConfig);
        result.operations.push('设置资源限制');
        this.log('info', '✅ 用户资源限制设置完成');
      }

      result.success = true;

    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      this.log('error', `❌ 创建用户失败: ${errorMessage}`);
      throw error;
    } finally {
      await this.disconnect();
    }

    return result;
  }

  /**
   * 删除测试用户
   */
  async dropTestUser(username: string, host: string = '%'): Promise<UserManagementResult> {
    const result: UserManagementResult = {
      success: false,
      username,
      operations: [],
      errors: [],
      warnings: [],
      timestamp: new Date()
    };

    try {
      await this.connect();
      
      this.log('info', `🗑️ 开始删除测试用户: ${username}@${host}`);

      // 检查用户是否存在
      const userExists = await this.checkUserExists(username, host);
      if (!userExists) {
        result.warnings.push('用户不存在');
        this.log('warn', `⚠️ 用户不存在: ${username}@${host}`);
      } else {
        // 删除用户
        await this.dropUser(username, host);
        result.operations.push('删除用户');
        this.log('info', `✅ 用户删除成功: ${username}@${host}`);
      }

      result.success = true;

    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      this.log('error', `❌ 删除用户失败: ${errorMessage}`);
      throw error;
    } finally {
      await this.disconnect();
    }

    return result;
  }

  /**
   * 授予用户权限
   */
  async grantPrivileges(
    username: string,
    host: string,
    privilegeConfigs: MySQLPrivilegeConfig[]
  ): Promise<UserManagementResult> {
    const result: UserManagementResult = {
      success: false,
      username,
      operations: [],
      errors: [],
      warnings: [],
      timestamp: new Date()
    };

    try {
      await this.connect();
      
      this.log('info', `🔑 开始授予权限: ${username}@${host}`);

      // 检查用户是否存在
      const userExists = await this.checkUserExists(username, host);
      if (!userExists) {
        throw new Error(`用户不存在: ${username}@${host}`);
      }

      // 授予权限
      for (const privilegeConfig of privilegeConfigs) {
        await this.grantPrivilege(username, host, privilegeConfig);
        result.operations.push(`授予权限: ${privilegeConfig.database}.${privilegeConfig.table || '*'}`);
      }

      // 刷新权限
      await this.flushPrivileges();
      result.operations.push('刷新权限');

      result.success = true;
      this.log('info', `✅ 权限授予完成: ${username}@${host}`);

    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      this.log('error', `❌ 授予权限失败: ${errorMessage}`);
      throw error;
    } finally {
      await this.disconnect();
    }

    return result;
  }

  /**
   * 撤销用户权限
   */
  async revokePrivileges(
    username: string,
    host: string,
    privilegeConfigs: MySQLPrivilegeConfig[]
  ): Promise<UserManagementResult> {
    const result: UserManagementResult = {
      success: false,
      username,
      operations: [],
      errors: [],
      warnings: [],
      timestamp: new Date()
    };

    try {
      await this.connect();
      
      this.log('info', `🔒 开始撤销权限: ${username}@${host}`);

      // 检查用户是否存在
      const userExists = await this.checkUserExists(username, host);
      if (!userExists) {
        result.warnings.push('用户不存在');
        this.log('warn', `⚠️ 用户不存在: ${username}@${host}`);
        result.success = true;
        return result;
      }

      // 撤销权限
      for (const privilegeConfig of privilegeConfigs) {
        await this.revokePrivilege(username, host, privilegeConfig);
        result.operations.push(`撤销权限: ${privilegeConfig.database}.${privilegeConfig.table || '*'}`);
      }

      // 刷新权限
      await this.flushPrivileges();
      result.operations.push('刷新权限');

      result.success = true;
      this.log('info', `✅ 权限撤销完成: ${username}@${host}`);

    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      this.log('error', `❌ 撤销权限失败: ${errorMessage}`);
      throw error;
    } finally {
      await this.disconnect();
    }

    return result;
  }

  /**
   * 获取用户状态
   */
  async getUserStatus(username: string, host: string = '%'): Promise<UserStatus> {
    try {
      await this.connect();

      // 检查用户是否存在
      const userExists = await this.checkUserExists(username, host);
      if (!userExists) {
        return {
          exists: false,
          username,
          host,
          accountLocked: false,
          passwordExpired: false,
          maxConnections: 0,
          maxQueriesPerHour: 0,
          maxUpdatesPerHour: 0,
          maxConnectionsPerHour: 0,
          privileges: [],
          lastLogin: null,
          created: null
        };
      }

      // 获取用户详细信息
      const [userInfo] = await this.connection!.execute(`
        SELECT 
          User, Host, account_locked, password_expired,
          max_connections, max_questions, max_updates, max_user_connections
        FROM mysql.user 
        WHERE User = ? AND Host = ?
      `, [username, host]);

      const userRow = Array.isArray(userInfo) && userInfo.length > 0 ? userInfo[0] as any : null;

      // 获取用户权限
      const privileges = await this.getUserPrivileges(username, host);

      return {
        exists: true,
        username,
        host,
        accountLocked: userRow?.account_locked === 'Y',
        passwordExpired: userRow?.password_expired === 'Y',
        maxConnections: parseInt(userRow?.max_connections) || 0,
        maxQueriesPerHour: parseInt(userRow?.max_questions) || 0,
        maxUpdatesPerHour: parseInt(userRow?.max_updates) || 0,
        maxConnectionsPerHour: parseInt(userRow?.max_user_connections) || 0,
        privileges,
        lastLogin: null, // MySQL没有直接的最后登录时间
        created: null    // MySQL没有直接的用户创建时间
      };

    } catch (error) {
      this.log('error', '获取用户状态失败:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  /**
   * 创建测试用户模板
   */
  async createTestUserFromTemplate(
    templateName: string,
    username: string,
    password: string,
    host: string = 'localhost',
    databaseName?: string
  ): Promise<UserManagementResult> {
    const template = this.getPrivilegeTemplate(templateName);
    if (!template) {
      throw new Error(`未找到权限模板: ${templateName}`);
    }

    // 创建用户配置
    const userConfig: MySQLUserConfig = {
      username,
      password,
      host,
      description: `${template.description} - 测试用户`,
      maxConnections: templateName === 'admin' ? 100 : 10,
      maxQueriesPerHour: templateName === 'admin' ? 0 : 1000,
      maxUpdatesPerHour: templateName === 'admin' ? 0 : 100,
      maxConnectionsPerHour: templateName === 'admin' ? 0 : 20
    };

    // 创建用户
    const createResult = await this.createTestUser(userConfig);
    if (!createResult.success) {
      return createResult;
    }

    // 准备权限配置
    const privilegeConfigs = template.privileges.map(privilege => ({
      ...privilege,
      database: databaseName || privilege.database
    }));

    // 授予权限
    const grantResult = await this.grantPrivileges(username, host, privilegeConfigs);
    
    // 合并结果
    return {
      success: createResult.success && grantResult.success,
      username,
      operations: [...createResult.operations, ...grantResult.operations],
      errors: [...createResult.errors, ...grantResult.errors],
      warnings: [...createResult.warnings, ...grantResult.warnings],
      timestamp: new Date()
    };
  }

  /**
   * 检查用户是否存在
   */
  private async checkUserExists(username: string, host: string): Promise<boolean> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    const [users] = await this.connection.execute(
      'SELECT User FROM mysql.user WHERE User = ? AND Host = ?',
      [username, host]
    );

    return Array.isArray(users) && users.length > 0;
  }

  /**
   * 创建用户
   */
  private async createUser(userConfig: MySQLUserConfig): Promise<void> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    const createSQL = `CREATE USER '${userConfig.username}'@'${userConfig.host}' IDENTIFIED BY '${userConfig.password}'`;
    await this.connection.execute(createSQL);
    
    this.log('debug', `用户创建SQL: CREATE USER '${userConfig.username}'@'${userConfig.host}' IDENTIFIED BY '[HIDDEN]'`);
  }

  /**
   * 删除用户
   */
  private async dropUser(username: string, host: string): Promise<void> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    await this.connection.execute(`DROP USER '${username}'@'${host}'`);
    this.log('debug', `用户删除SQL: DROP USER '${username}'@'${host}'`);
  }

  /**
   * 设置用户资源限制
   */
  private async setUserResourceLimits(userConfig: MySQLUserConfig): Promise<void> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    const limits: string[] = [];
    
    if (userConfig.maxConnections !== undefined) {
      limits.push(`MAX_CONNECTIONS_PER_HOUR ${userConfig.maxConnectionsPerHour || 0}`);
    }
    if (userConfig.maxQueriesPerHour !== undefined) {
      limits.push(`MAX_QUERIES_PER_HOUR ${userConfig.maxQueriesPerHour}`);
    }
    if (userConfig.maxUpdatesPerHour !== undefined) {
      limits.push(`MAX_UPDATES_PER_HOUR ${userConfig.maxUpdatesPerHour}`);
    }
    if (userConfig.maxConnections !== undefined) {
      limits.push(`MAX_USER_CONNECTIONS ${userConfig.maxConnections}`);
    }

    if (limits.length > 0) {
      const alterSQL = `ALTER USER '${userConfig.username}'@'${userConfig.host}' WITH ${limits.join(' ')}`;
      await this.connection.execute(alterSQL);
      this.log('debug', `用户限制设置SQL: ${alterSQL}`);
    }
  }

  /**
   * 授予权限
   */
  private async grantPrivilege(
    username: string,
    host: string,
    privilegeConfig: MySQLPrivilegeConfig
  ): Promise<void> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    const privileges = privilegeConfig.privileges.join(', ');
    const target = privilegeConfig.table 
      ? `\`${privilegeConfig.database}\`.\`${privilegeConfig.table}\``
      : `\`${privilegeConfig.database}\`.*`;
    
    const grantOption = privilegeConfig.grantOption ? ' WITH GRANT OPTION' : '';
    
    const grantSQL = `GRANT ${privileges} ON ${target} TO '${username}'@'${host}'${grantOption}`;
    await this.connection.execute(grantSQL);
    
    this.log('debug', `权限授予SQL: ${grantSQL}`);
  }

  /**
   * 撤销权限
   */
  private async revokePrivilege(
    username: string,
    host: string,
    privilegeConfig: MySQLPrivilegeConfig
  ): Promise<void> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    const privileges = privilegeConfig.privileges.join(', ');
    const target = privilegeConfig.table 
      ? `\`${privilegeConfig.database}\`.\`${privilegeConfig.table}\``
      : `\`${privilegeConfig.database}\`.*`;
    
    const revokeSQL = `REVOKE ${privileges} ON ${target} FROM '${username}'@'${host}'`;
    await this.connection.execute(revokeSQL);
    
    this.log('debug', `权限撤销SQL: ${revokeSQL}`);
  }

  /**
   * 获取用户权限
   */
  private async getUserPrivileges(username: string, host: string): Promise<string[]> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    try {
      const [grants] = await this.connection.execute(`SHOW GRANTS FOR '${username}'@'${host}'`);
      return Array.isArray(grants) ? grants.map((row: any) => Object.values(row)[0] as string) : [];
    } catch (error) {
      this.log('warn', `获取用户权限失败: ${error}`);
      return [];
    }
  }

  /**
   * 刷新权限
   */
  private async flushPrivileges(): Promise<void> {
    if (!this.connection) {
      throw new Error('数据库连接未建立');
    }

    await this.connection.execute('FLUSH PRIVILEGES');
    this.log('debug', '权限已刷新');
  }

  /**
   * 获取权限模板
   */
  private getPrivilegeTemplate(templateName: string): UserPrivilegeTemplate | null {
    const templates: Record<string, UserPrivilegeTemplate> = {
      'test_admin': {
        name: 'test_admin',
        description: '测试管理员 - 拥有测试数据库的完全权限',
        privileges: [{
          database: '*',
          privileges: [MySQLPrivilege.ALL_PRIVILEGES],
          grantOption: true
        }]
      },
      'test_user': {
        name: 'test_user',
        description: '测试用户 - 拥有测试数据库的基本读写权限',
        privileges: [{
          database: 'afa_office_test',
          privileges: [
            MySQLPrivilege.SELECT,
            MySQLPrivilege.INSERT,
            MySQLPrivilege.UPDATE,
            MySQLPrivilege.DELETE
          ]
        }]
      },
      'test_readonly': {
        name: 'test_readonly',
        description: '测试只读用户 - 只能读取测试数据库',
        privileges: [{
          database: 'afa_office_test',
          privileges: [MySQLPrivilege.SELECT]
        }]
      },
      'test_developer': {
        name: 'test_developer',
        description: '测试开发者 - 拥有测试数据库的开发权限',
        privileges: [{
          database: 'afa_office_test',
          privileges: [
            MySQLPrivilege.SELECT,
            MySQLPrivilege.INSERT,
            MySQLPrivilege.UPDATE,
            MySQLPrivilege.DELETE,
            MySQLPrivilege.CREATE,
            MySQLPrivilege.DROP,
            MySQLPrivilege.ALTER,
            MySQLPrivilege.INDEX
          ]
        }]
      }
    };

    return templates[templateName] || null;
  }

  /**
   * 获取所有可用的权限模板
   */
  getAvailableTemplates(): UserPrivilegeTemplate[] {
    return [
      this.getPrivilegeTemplate('test_admin')!,
      this.getPrivilegeTemplate('test_user')!,
      this.getPrivilegeTemplate('test_readonly')!,
      this.getPrivilegeTemplate('test_developer')!
    ];
  }

  /**
   * 批量创建测试用户
   */
  async createMultipleTestUsers(
    users: Array<{
      username: string;
      password: string;
      template: string;
      host?: string;
      databaseName?: string;
    }>
  ): Promise<UserManagementResult[]> {
    const results: UserManagementResult[] = [];

    for (const user of users) {
      try {
        const result = await this.createTestUserFromTemplate(
          user.template,
          user.username,
          user.password,
          user.host || 'localhost',
          user.databaseName
        );
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          username: user.username,
          operations: [],
          errors: [error instanceof Error ? error.message : String(error)],
          warnings: [],
          timestamp: new Date()
        });
      }
    }

    return results;
  }

  /**
   * 清理所有测试用户
   */
  async cleanupTestUsers(usernamePattern: string = 'test_%'): Promise<UserManagementResult[]> {
    try {
      await this.connect();

      // 查找匹配的测试用户
      const [users] = await this.connection!.execute(
        'SELECT User, Host FROM mysql.user WHERE User LIKE ?',
        [usernamePattern]
      );

      const userList = Array.isArray(users) ? users as Array<{User: string, Host: string}> : [];
      const results: UserManagementResult[] = [];

      // 删除每个匹配的用户
      for (const user of userList) {
        try {
          const result = await this.dropTestUser(user.User, user.Host);
          results.push(result);
        } catch (error) {
          results.push({
            success: false,
            username: user.User,
            operations: [],
            errors: [error instanceof Error ? error.message : String(error)],
            warnings: [],
            timestamp: new Date()
          });
        }
      }

      this.log('info', `✅ 清理了 ${results.length} 个测试用户`);
      return results;

    } catch (error) {
      this.log('error', '清理测试用户失败:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  /**
   * 日志记录
   */
  private log(level: 'error' | 'warn' | 'info' | 'debug', message: string, ...args: any[]): void {
    if (!this.enableLogging) {
      return;
    }

    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex <= currentLevelIndex) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [MySQL-UserManager] [${level.toUpperCase()}]`;
      
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
}

/**
 * 创建MySQL用户管理器
 */
export function createMySQLUserManager(
  config: MySQLConfig,
  options?: {
    enableLogging?: boolean;
    logLevel?: 'error' | 'warn' | 'info' | 'debug';
  }
): MySQLUserManager {
  return new MySQLUserManager(config, options);
}

/**
 * 快速创建测试用户
 */
export async function quickCreateTestUser(
  username: string,
  password: string,
  template: string = 'test_user',
  databaseName?: string,
  options: {
    host?: string;
    port?: number;
    adminUser?: string;
    adminPassword?: string;
  } = {}
): Promise<UserManagementResult> {
  // 获取MySQL配置
  const config = mySQLConfigManager.getMySQLConfigTemplate('development');
  
  // 应用选项
  const mysqlConfig: MySQLConfig = {
    ...config,
    host: options.host || config.host,
    port: options.port || config.port,
    user: options.adminUser || config.user,
    password: options.adminPassword || config.password
  };

  const userManager = createMySQLUserManager(mysqlConfig);
  return await userManager.createTestUserFromTemplate(
    template,
    username,
    password,
    'localhost',
    databaseName
  );
}

/**
 * MySQL用户管理器工厂
 */
export class MySQLUserManagerFactory {
  private static managers = new Map<string, MySQLUserManager>();

  /**
   * 获取或创建用户管理器
   */
  static getOrCreateManager(
    key: string,
    config: MySQLConfig,
    options?: {
      enableLogging?: boolean;
      logLevel?: 'error' | 'warn' | 'info' | 'debug';
    }
  ): MySQLUserManager {
    if (!this.managers.has(key)) {
      const manager = new MySQLUserManager(config, options);
      this.managers.set(key, manager);
    }
    return this.managers.get(key)!;
  }

  /**
   * 移除用户管理器
   */
  static removeManager(key: string): void {
    this.managers.delete(key);
  }

  /**
   * 清理所有用户管理器
   */
  static clearAll(): void {
    this.managers.clear();
  }

  /**
   * 获取所有管理器键
   */
  static getManagerKeys(): string[] {
    return Array.from(this.managers.keys());
  }
}