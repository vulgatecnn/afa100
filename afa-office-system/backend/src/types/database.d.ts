/**
 * 数据库 ORM 类型定义
 * 解决数据库相关的类型问题
 */

import type { Pool, PoolConnection, Connection, ResultSetHeader, RowDataPacket, FieldPacket } from 'mysql2/promise';
import type { DatabaseResult } from './index.js';

// MySQL2 类型扩展
declare module 'mysql2/promise' {
  interface Pool {
    // 扩展连接池方法
    getConnection(): Promise<PoolConnection>;
    execute<T extends RowDataPacket[] | RowDataPacket[][] | ResultSetHeader>(
      sql: string,
      values?: any[]
    ): Promise<[T, FieldPacket[]]>;
    query<T extends RowDataPacket[] | RowDataPacket[][] | ResultSetHeader>(
      sql: string,
      values?: any[]
    ): Promise<[T, FieldPacket[]]>;
    end(): Promise<void>;
    // 健康检查方法
    ping(): Promise<void>;
  }

  interface PoolConnection extends Connection {
    // 扩展连接方法
    release(): void;
    destroy(): void;
  }

  interface Connection {
    // 扩展连接方法
    execute<T extends RowDataPacket[] | RowDataPacket[][] | ResultSetHeader>(
      sql: string,
      values?: any[]
    ): Promise<[T, FieldPacket[]]>;
    query<T extends RowDataPacket[] | RowDataPacket[][] | ResultSetHeader>(
      sql: string,
      values?: any[]
    ): Promise<[T, FieldPacket[]]>;
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    ping(): Promise<void>;
    end(): Promise<void>;
    destroy(): void;
  }

  interface ResultSetHeader {
    affectedRows: number;
    insertId: number;
    warningStatus: number;
    changedRows?: number;
    fieldCount?: number;
    info?: string;
    serverStatus?: number;
  }

  interface RowDataPacket {
    [column: string]: any;
  }

  interface FieldPacket {
    catalog: string;
    db: string;
    table: string;
    orgTable: string;
    name: string;
    orgName: string;
    charsetNr: number;
    length: number;
    type: number;
    flags: number;
    decimals: number;
    default?: string;
    zeroFill: boolean;
    protocol41: boolean;
  }
}

// 数据库配置类型
export interface DatabaseConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
  charset?: string;
  timezone?: string;
  connectTimeout?: number;
  acquireTimeout?: number;
  timeout?: number;
  reconnect?: boolean;
  multipleStatements?: boolean;
  supportBigNumbers?: boolean;
  bigNumberStrings?: boolean;
  dateStrings?: boolean;
  debug?: boolean;
  trace?: boolean;
  ssl?: boolean | object;
}

// 连接池配置类型
export interface DatabasePoolConfig extends DatabaseConnectionConfig {
  connectionLimit?: number;
  queueLimit?: number;
  idleTimeout?: number;
  acquireTimeout?: number;
  createRetryIntervalMillis?: number;
  createTimeoutMillis?: number;
  destroyTimeoutMillis?: number;
  reapIntervalMillis?: number;
  min?: number;
  max?: number;
}

// 查询参数类型
export type QueryParams = (string | number | boolean | null | undefined | Date | Buffer)[];

// 查询结果类型
export interface QueryResult<T = any> {
  rows: T[];
  fields: FieldPacket[];
  affectedRows?: number;
  insertId?: number;
  changedRows?: number;
}

// 事务查询接口
export interface TransactionQuery {
  sql: string;
  params?: QueryParams;
}

// 数据库操作接口
export interface DatabaseOperations {
  // 基础查询方法
  query<T = any>(sql: string, params?: QueryParams): Promise<T[]>;
  get<T = any>(sql: string, params?: QueryParams): Promise<T | undefined>;
  run(sql: string, params?: QueryParams): Promise<DatabaseResult>;
  
  // 事务方法
  transaction(queries: TransactionQuery[]): Promise<DatabaseResult[]>;
  withTransaction<T>(callback: (executor: TransactionExecutor) => Promise<T>): Promise<T>;
  
  // 批量操作
  batchInsert<T>(table: string, records: T[]): Promise<DatabaseResult[]>;
  batchUpdate<T>(table: string, records: Partial<T>[], whereClause: string): Promise<DatabaseResult[]>;
  batchDelete(table: string, ids: (string | number)[]): Promise<DatabaseResult>;
  
  // 工具方法
  exists(table: string, whereClause: string, params?: QueryParams): Promise<boolean>;
  count(table: string, whereClause?: string, params?: QueryParams): Promise<number>;
  
  // 连接管理
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // 健康检查
  healthCheck(): Promise<DatabaseHealthStatus>;
  
  // 性能监控
  getPerformanceMetrics(): Promise<DatabasePerformanceMetrics>;
}

// 事务执行器接口
export interface TransactionExecutor {
  query<T = any>(sql: string, params?: QueryParams): Promise<T[]>;
  get<T = any>(sql: string, params?: QueryParams): Promise<T | undefined>;
  run(sql: string, params?: QueryParams): Promise<DatabaseResult>;
}

// 数据库健康状态
export interface DatabaseHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  connectionPool: {
    total: number;
    active: number;
    idle: number;
    pending: number;
  };
  performance: {
    averageQueryTime: number;
    slowQueries: number;
    errorRate: number;
  };
  lastCheck: string;
  details?: {
    error?: string;
    warnings?: string[];
  };
}

// 数据库性能指标
export interface DatabasePerformanceMetrics {
  queries: {
    total: number;
    successful: number;
    failed: number;
    averageTime: number;
    slowQueries: Array<{
      sql: string;
      duration: number;
      timestamp: string;
    }>;
  };
  connections: {
    total: number;
    active: number;
    idle: number;
    created: number;
    destroyed: number;
    errors: number;
  };
  transactions: {
    total: number;
    committed: number;
    rolledBack: number;
    averageTime: number;
  };
  memory: {
    used: number;
    available: number;
    peak: number;
  };
}

// 数据库迁移接口
export interface DatabaseMigration {
  version: string;
  name: string;
  up: (db: DatabaseOperations) => Promise<void>;
  down: (db: DatabaseOperations) => Promise<void>;
}

// 数据库种子数据接口
export interface DatabaseSeeder {
  name: string;
  run: (db: DatabaseOperations) => Promise<void>;
  rollback?: (db: DatabaseOperations) => Promise<void>;
}

// 查询构建器接口
export interface QueryBuilder {
  select(columns?: string | string[]): QueryBuilder;
  from(table: string): QueryBuilder;
  where(condition: string, value?: any): QueryBuilder;
  whereIn(column: string, values: any[]): QueryBuilder;
  whereNotIn(column: string, values: any[]): QueryBuilder;
  whereBetween(column: string, min: any, max: any): QueryBuilder;
  whereNull(column: string): QueryBuilder;
  whereNotNull(column: string): QueryBuilder;
  join(table: string, condition: string): QueryBuilder;
  leftJoin(table: string, condition: string): QueryBuilder;
  rightJoin(table: string, condition: string): QueryBuilder;
  innerJoin(table: string, condition: string): QueryBuilder;
  groupBy(columns: string | string[]): QueryBuilder;
  having(condition: string, value?: any): QueryBuilder;
  orderBy(column: string, direction?: 'ASC' | 'DESC'): QueryBuilder;
  limit(count: number): QueryBuilder;
  offset(count: number): QueryBuilder;
  
  // 执行方法
  execute<T = any>(): Promise<T[]>;
  first<T = any>(): Promise<T | undefined>;
  count(): Promise<number>;
  exists(): Promise<boolean>;
  
  // 获取SQL
  toSQL(): { sql: string; params: QueryParams };
}

// 模型基类接口
export interface BaseModel<T = any> {
  // 静态方法
  create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;
  findById(id: number | string): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<T[]>;
  update(id: number | string, data: Partial<T>): Promise<T>;
  delete(id: number | string): Promise<boolean>;
  count(options?: QueryOptions): Promise<number>;
  exists(id: number | string): Promise<boolean>;
  
  // 批量操作
  batchCreate(data: Omit<T, 'id' | 'created_at' | 'updated_at'>[]): Promise<T[]>;
  batchUpdate(updates: Array<{ id: number | string; data: Partial<T> }>): Promise<T[]>;
  batchDelete(ids: (number | string)[]): Promise<number>;
  
  // 查询构建器
  query(): QueryBuilder;
  where(condition: string, value?: any): QueryBuilder;
  
  // 关联查询
  with(relations: string | string[]): QueryBuilder;
  
  // 验证
  validate(data: Partial<T>): { isValid: boolean; errors: string[] };
}

// 查询选项接口
export interface QueryOptions {
  where?: Record<string, any>;
  select?: string | string[];
  orderBy?: string | Array<{ column: string; direction: 'ASC' | 'DESC' }>;
  limit?: number;
  offset?: number;
  include?: string | string[];
}

// 分页查询选项
export interface PaginationOptions extends QueryOptions {
  page: number;
  limit: number;
}

// 分页结果接口
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 数据库事件接口
export interface DatabaseEvents {
  'connection:created': (connectionId: string) => void;
  'connection:destroyed': (connectionId: string) => void;
  'connection:error': (error: Error, connectionId?: string) => void;
  'query:start': (sql: string, params?: QueryParams) => void;
  'query:complete': (sql: string, duration: number, rowCount?: number) => void;
  'query:error': (sql: string, error: Error, duration: number) => void;
  'transaction:start': (transactionId: string) => void;
  'transaction:commit': (transactionId: string, duration: number) => void;
  'transaction:rollback': (transactionId: string, reason: string, duration: number) => void;
  'pool:full': () => void;
  'pool:empty': () => void;
  'slow:query': (sql: string, duration: number, threshold: number) => void;
}

// 数据库配置验证结果
export interface DatabaseConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

// 数据库连接状态
export type DatabaseConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

// 数据库错误类型
export interface DatabaseError extends Error {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
  sql?: string;
  params?: QueryParams;
  fatal?: boolean;
}

// 数据库统计信息
export interface DatabaseStats {
  uptime: number;
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageQueryTime: number;
  slowQueries: number;
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  connectionErrors: number;
  totalTransactions: number;
  committedTransactions: number;
  rolledBackTransactions: number;
  memoryUsage: {
    used: number;
    available: number;
    peak: number;
  };
  tableStats: Array<{
    name: string;
    rows: number;
    dataSize: number;
    indexSize: number;
  }>;
}

// 数据库备份接口
export interface DatabaseBackup {
  create(options?: BackupOptions): Promise<BackupResult>;
  restore(backupPath: string, options?: RestoreOptions): Promise<RestoreResult>;
  list(): Promise<BackupInfo[]>;
  delete(backupId: string): Promise<boolean>;
}

export interface BackupOptions {
  tables?: string[];
  includeData?: boolean;
  includeSchema?: boolean;
  compression?: boolean;
  destination?: string;
}

export interface BackupResult {
  id: string;
  path: string;
  size: number;
  duration: number;
  tables: string[];
  timestamp: string;
}

export interface RestoreOptions {
  dropExisting?: boolean;
  ignoreErrors?: boolean;
  dryRun?: boolean;
}

export interface RestoreResult {
  success: boolean;
  duration: number;
  tablesRestored: string[];
  errors?: string[];
}

export interface BackupInfo {
  id: string;
  path: string;
  size: number;
  tables: string[];
  created: string;
}

// 数据库索引管理
export interface DatabaseIndexManager {
  create(table: string, columns: string | string[], options?: IndexOptions): Promise<void>;
  drop(table: string, indexName: string): Promise<void>;
  list(table?: string): Promise<IndexInfo[]>;
  analyze(table?: string): Promise<IndexAnalysis[]>;
  optimize(table?: string): Promise<OptimizationResult[]>;
}

export interface IndexOptions {
  name?: string;
  unique?: boolean;
  type?: 'BTREE' | 'HASH' | 'FULLTEXT' | 'SPATIAL';
  length?: number | number[];
}

export interface IndexInfo {
  table: string;
  name: string;
  columns: string[];
  unique: boolean;
  type: string;
  cardinality: number;
}

export interface IndexAnalysis {
  table: string;
  index: string;
  usage: number;
  efficiency: number;
  recommendation: 'keep' | 'optimize' | 'drop';
  reason: string;
}

export interface OptimizationResult {
  table: string;
  operation: string;
  success: boolean;
  duration: number;
  message: string;
}

export {};