/**
 * 数据库适配器工厂
 * 根据配置创建相应的数据库适配器实例
 */

import { DatabaseAdapter, DatabaseAdapterFactory } from '../interfaces/database-adapter';
import { DatabaseConfig, DatabaseType } from '../config/database-config-manager';
import { MySQLAdapter } from '../adapters/mysql-adapter';
import { SQLiteAdapter } from '../adapters/sqlite-adapter';

/**
 * 数据库适配器工厂实现
 */
export class DatabaseAdapterFactoryImpl implements DatabaseAdapterFactory {
  private static instance: DatabaseAdapterFactoryImpl;

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): DatabaseAdapterFactoryImpl {
    if (!DatabaseAdapterFactoryImpl.instance) {
      DatabaseAdapterFactoryImpl.instance = new DatabaseAdapterFactoryImpl();
    }
    return DatabaseAdapterFactoryImpl.instance;
  }

  /**
   * 创建数据库适配器
   */
  async createAdapter(config: DatabaseConfig): Promise<DatabaseAdapter> {
    // 验证配置
    const isValid = await this.validateConfig(config);
    if (!isValid) {
      throw new Error('数据库配置无效');
    }

    let adapter: DatabaseAdapter;

    // 根据数据库类型创建相应的适配器
    switch (config.type) {
      case DatabaseType.MYSQL:
        adapter = new MySQLAdapter();
        break;
      case DatabaseType.SQLITE:
        adapter = new SQLiteAdapter();
        break;
      default:
        throw new Error(`不支持的数据库类型: ${(config as any).type}`);
    }

    // 初始化连接
    try {
      await adapter.connect(config);
      return adapter;
    } catch (error) {
      // 清理资源
      await adapter.cleanup();
      throw error;
    }
  }

  /**
   * 验证数据库配置
   */
  async validateConfig(config: DatabaseConfig): Promise<boolean> {
    try {
      if (!config || !config.type) {
        return false;
      }

      switch (config.type) {
        case DatabaseType.MYSQL:
          return this.validateMySQLConfig(config as any);
        case DatabaseType.SQLITE:
          return this.validateSQLiteConfig(config as any);
        default:
          return false;
      }
    } catch (error) {
      console.error('配置验证错误:', error);
      return false;
    }
  }

  /**
   * 验证MySQL配置
   */
  private validateMySQLConfig(config: any): boolean {
    return !!(
      config.host &&
      config.port &&
      config.user &&
      config.password &&
      typeof config.port === 'number' &&
      config.port > 0 &&
      config.port <= 65535
    );
  }

  /**
   * 验证SQLite配置
   */
  private validateSQLiteConfig(config: any): boolean {
    return !!(config.path && typeof config.path === 'string');
  }

  /**
   * 创建适配器并测试连接
   */
  async createAndTestAdapter(config: DatabaseConfig): Promise<DatabaseAdapter> {
    const adapter = await this.createAdapter(config);
    
    // 测试连接
    const isConnected = await adapter.ping();
    if (!isConnected) {
      await adapter.cleanup();
      throw new Error('数据库连接测试失败');
    }

    return adapter;
  }

  /**
   * 批量创建适配器（用于连接池等场景）
   */
  async createMultipleAdapters(config: DatabaseConfig, count: number): Promise<DatabaseAdapter[]> {
    const adapters: DatabaseAdapter[] = [];
    const errors: Error[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const adapter = await this.createAdapter(config);
        adapters.push(adapter);
      } catch (error) {
        errors.push(error as Error);
      }
    }

    if (errors.length > 0) {
      // 清理已创建的适配器
      await Promise.all(adapters.map(adapter => adapter.cleanup()));
      throw new Error(`创建适配器失败: ${errors.map(e => e.message).join(', ')}`);
    }

    return adapters;
  }

  /**
   * 获取支持的数据库类型列表
   */
  getSupportedDatabaseTypes(): DatabaseType[] {
    return [DatabaseType.MYSQL, DatabaseType.SQLITE];
  }

  /**
   * 检查数据库类型是否支持
   */
  isDatabaseTypeSupported(type: string): boolean {
    return this.getSupportedDatabaseTypes().includes(type as DatabaseType);
  }
}

// 导出单例实例
export const databaseAdapterFactory = DatabaseAdapterFactoryImpl.getInstance();

// 导出便捷函数
export const createDatabaseAdapter = (config: DatabaseConfig) => 
  databaseAdapterFactory.createAdapter(config);

export const createAndTestDatabaseAdapter = (config: DatabaseConfig) => 
  databaseAdapterFactory.createAndTestAdapter(config);

export const validateDatabaseConfig = (config: DatabaseConfig) => 
  databaseAdapterFactory.validateConfig(config);

export const getSupportedDatabaseTypes = () => 
  databaseAdapterFactory.getSupportedDatabaseTypes();