/**
 * 数据库适配器接口
 * 定义统一的数据库操作接口，支持MySQL和SQLite
 */

import { DatabaseConfig } from '../config/database-config-manager';

// 数据库操作结果接口
export interface RunResult {
  lastID?: number;
  changes?: number;
}

// 事务接口
export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/**
 * 数据库适配器接口
 */
export interface DatabaseAdapter {
  // 连接管理
  connect(config: DatabaseConfig): Promise<void>;
  disconnect(): Promise<void>;
  isReady(): boolean;
  
  // 基础操作
  run(sql: string, params?: any[]): Promise<RunResult>;
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  
  // 事务支持
  beginTransaction(): Promise<Transaction>;
  
  // 测试环境专用方法
  createTestDatabase(dbName: string): Promise<void>;
  dropTestDatabase(dbName: string): Promise<void>;
  initializeSchema(dbName: string): Promise<void>;
  
  // 连接状态检查
  ping(): Promise<boolean>;
  
  // 清理资源
  cleanup(): Promise<void>;
}

/**
 * 数据库适配器工厂接口
 */
export interface DatabaseAdapterFactory {
  createAdapter(config: DatabaseConfig): Promise<DatabaseAdapter>;
  validateConfig(config: DatabaseConfig): Promise<boolean>;
}