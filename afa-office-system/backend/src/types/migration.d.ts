/**
 * 数据库迁移脚本类型定义
 * 为数据库迁移和种子脚本提供完整的类型支持
 */

// 迁移脚本接口
export interface Migration {
  // 基本信息
  version: string;
  name: string;
  description?: string;
  author?: string;
  createdAt: Date;
  
  // 迁移方法
  up: (migrator: MigrationExecutor) => Promise<void>;
  down: (migrator: MigrationExecutor) => Promise<void>;
  
  // 元数据
  dependencies?: string[];
  tags?: string[];
  checksum?: string;
  
  // 验证方法
  validate?: (migrator: MigrationExecutor) => Promise<boolean>;
  
  // 回滚条件
  canRollback?: boolean;
  rollbackReason?: string;
}

// 迁移执行器接口
export interface MigrationExecutor {
  // SQL执行
  sql(query: string, params?: any[]): Promise<any>;
  raw(query: string): Promise<any>;
  
  // 表操作
  createTable(tableName: string, callback: (table: TableBuilder) => void): Promise<void>;
  dropTable(tableName: string): Promise<void>;
  alterTable(tableName: string, callback: (table: TableBuilder) => void): Promise<void>;
  renameTable(oldName: string, newName: string): Promise<void>;
  
  // 列操作
  addColumn(tableName: string, columnName: string, columnType: ColumnType): Promise<void>;
  dropColumn(tableName: string, columnName: string): Promise<void>;
  renameColumn(tableName: string, oldName: string, newName: string): Promise<void>;
  alterColumn(tableName: string, columnName: string, columnType: ColumnType): Promise<void>;
  
  // 索引操作
  createIndex(tableName: string, columns: string | string[], options?: IndexOptions): Promise<void>;
  dropIndex(tableName: string, indexName: string): Promise<void>;
  
  // 外键操作
  addForeignKey(tableName: string, columnName: string, referencedTable: string, referencedColumn: string, options?: ForeignKeyOptions): Promise<void>;
  dropForeignKey(tableName: string, constraintName: string): Promise<void>;
  
  // 约束操作
  addConstraint(tableName: string, constraintName: string, constraint: string): Promise<void>;
  dropConstraint(tableName: string, constraintName: string): Promise<void>;
  
  // 数据操作
  insert(tableName: string, data: Record<string, any> | Record<string, any>[]): Promise<void>;
  update(tableName: string, data: Record<string, any>, where?: string, params?: any[]): Promise<void>;
  delete(tableName: string, where?: string, params?: any[]): Promise<void>;
  
  // 工具方法
  hasTable(tableName: string): Promise<boolean>;
  hasColumn(tableName: string, columnName: string): Promise<boolean>;
  hasIndex(tableName: string, indexName: string): Promise<boolean>;
  
  // 事务支持
  transaction<T>(callback: (trx: MigrationExecutor) => Promise<T>): Promise<T>;
}

// 表构建器接口
export interface TableBuilder {
  // 主键
  id(columnName?: string): ColumnBuilder;
  increments(columnName?: string): ColumnBuilder;
  
  // 基本类型
  string(columnName: string, length?: number): ColumnBuilder;
  text(columnName: string, textType?: 'text' | 'mediumtext' | 'longtext'): ColumnBuilder;
  integer(columnName: string): ColumnBuilder;
  bigInteger(columnName: string): ColumnBuilder;
  float(columnName: string, precision?: number, scale?: number): ColumnBuilder;
  double(columnName: string, precision?: number, scale?: number): ColumnBuilder;
  decimal(columnName: string, precision?: number, scale?: number): ColumnBuilder;
  boolean(columnName: string): ColumnBuilder;
  date(columnName: string): ColumnBuilder;
  datetime(columnName: string, options?: { useTz?: boolean; precision?: number }): ColumnBuilder;
  time(columnName: string, precision?: number): ColumnBuilder;
  timestamp(columnName: string, options?: { useTz?: boolean; precision?: number }): ColumnBuilder;
  timestamps(useTimestamps?: boolean, defaultToNow?: boolean): void;
  
  // JSON类型
  json(columnName: string): ColumnBuilder;
  jsonb(columnName: string): ColumnBuilder;
  
  // 二进制类型
  binary(columnName: string, length?: number): ColumnBuilder;
  
  // 枚举类型
  enum(columnName: string, values: string[]): ColumnBuilder;
  enu(columnName: string, values: string[]): ColumnBuilder;
  
  // 几何类型
  geometry(columnName: string): ColumnBuilder;
  point(columnName: string): ColumnBuilder;
  
  // UUID类型
  uuid(columnName: string): ColumnBuilder;
  
  // 外键
  foreign(columnName: string, keyName?: string): ForeignKeyBuilder;
  
  // 索引
  index(columns: string | string[], indexName?: string, indexType?: string): TableBuilder;
  unique(columns: string | string[], indexName?: string): TableBuilder;
  primary(columns: string | string[], constraintName?: string): TableBuilder;
  
  // 约束
  check(checkPredicate: string, constraintName?: string): TableBuilder;
  
  // 引擎和字符集（MySQL特定）
  engine(engineName: string): TableBuilder;
  charset(charsetName: string): TableBuilder;
  collate(collationName: string): TableBuilder;
  
  // 注释
  comment(comment: string): TableBuilder;
}

// 列构建器接口
export interface ColumnBuilder {
  // 约束
  notNullable(): ColumnBuilder;
  nullable(): ColumnBuilder;
  primary(constraintName?: string): ColumnBuilder;
  unique(indexName?: string): ColumnBuilder;
  
  // 默认值
  defaultTo(value: any): ColumnBuilder;
  
  // 自增
  autoIncrement(): ColumnBuilder;
  
  // 无符号（MySQL特定）
  unsigned(): ColumnBuilder;
  
  // 注释
  comment(comment: string): ColumnBuilder;
  
  // 字符集和排序规则（MySQL特定）
  charset(charsetName: string): ColumnBuilder;
  collate(collationName: string): ColumnBuilder;
  
  // 外键引用
  references(columnName: string): ReferencesBuilder;
  
  // 索引
  index(indexName?: string): ColumnBuilder;
  
  // 检查约束
  checkPositive(): ColumnBuilder;
  checkIn(values: any[]): ColumnBuilder;
  checkRegex(pattern: string): ColumnBuilder;
  
  // 生成列（MySQL 5.7+）
  generatedAs(expression: string): ColumnBuilder;
  stored(): ColumnBuilder;
  virtual(): ColumnBuilder;
}

// 外键构建器接口
export interface ForeignKeyBuilder {
  references(columnName: string): ReferencesBuilder;
}

// 引用构建器接口
export interface ReferencesBuilder {
  inTable(tableName: string): ReferencesBuilder;
  onDelete(action: ForeignKeyAction): ReferencesBuilder;
  onUpdate(action: ForeignKeyAction): ReferencesBuilder;
  deferrable(type?: 'deferred' | 'immediate'): ReferencesBuilder;
}

// 外键动作类型
export type ForeignKeyAction = 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';

// 列类型定义
export interface ColumnType {
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
  values?: string[];
  nullable?: boolean;
  defaultValue?: any;
  autoIncrement?: boolean;
  primary?: boolean;
  unique?: boolean;
  index?: boolean;
  comment?: string;
  charset?: string;
  collation?: string;
  unsigned?: boolean;
  zerofill?: boolean;
}

// 索引选项
export interface IndexOptions {
  name?: string;
  type?: 'BTREE' | 'HASH' | 'FULLTEXT' | 'SPATIAL';
  unique?: boolean;
  length?: number | number[];
  algorithm?: 'DEFAULT' | 'INPLACE' | 'COPY';
  lock?: 'DEFAULT' | 'NONE' | 'SHARED' | 'EXCLUSIVE';
}

// 外键选项
export interface ForeignKeyOptions {
  name?: string;
  onDelete?: ForeignKeyAction;
  onUpdate?: ForeignKeyAction;
  deferrable?: boolean;
  deferred?: boolean;
}

// 迁移状态
export interface MigrationState {
  version: string;
  name: string;
  executedAt: Date;
  executionTime: number;
  checksum: string;
  success: boolean;
  error?: string;
  rollbackAvailable: boolean;
}

// 迁移历史
export interface MigrationHistory {
  migrations: MigrationState[];
  currentVersion: string;
  pendingMigrations: string[];
  lastMigration?: MigrationState;
}

// 迁移计划
export interface MigrationPlan {
  migrations: Migration[];
  totalSteps: number;
  estimatedTime: number;
  dependencies: Record<string, string[]>;
  conflicts: MigrationConflict[];
}

// 迁移冲突
export interface MigrationConflict {
  type: 'version' | 'dependency' | 'schema';
  migration1: string;
  migration2: string;
  description: string;
  resolution?: string;
}

// 迁移运行器接口
export interface MigrationRunner {
  // 迁移执行
  up(target?: string): Promise<MigrationResult>;
  down(target?: string): Promise<MigrationResult>;
  latest(): Promise<MigrationResult>;
  rollback(steps?: number): Promise<MigrationResult>;
  
  // 迁移状态
  currentVersion(): Promise<string>;
  pendingMigrations(): Promise<string[]>;
  history(): Promise<MigrationHistory>;
  
  // 迁移验证
  validate(): Promise<MigrationValidationResult>;
  checkIntegrity(): Promise<IntegrityCheckResult>;
  
  // 迁移计划
  plan(target?: string): Promise<MigrationPlan>;
  dryRun(target?: string): Promise<MigrationDryRunResult>;
  
  // 迁移管理
  reset(): Promise<void>;
  seed(): Promise<SeedResult>;
  
  // 事件监听
  on(event: MigrationEvent, callback: (...args: any[]) => void): void;
  off(event: MigrationEvent, callback: (...args: any[]) => void): void;
}

// 迁移结果
export interface MigrationResult {
  success: boolean;
  migrationsRun: string[];
  executionTime: number;
  errors: MigrationError[];
  warnings: string[];
}

// 迁移验证结果
export interface MigrationValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  missingMigrations: string[];
  orphanedMigrations: string[];
}

// 完整性检查结果
export interface IntegrityCheckResult {
  isIntact: boolean;
  checksumMismatches: Array<{
    version: string;
    expected: string;
    actual: string;
  }>;
  missingTables: string[];
  extraTables: string[];
  schemaChanges: SchemaChange[];
}

// 模式变更
export interface SchemaChange {
  type: 'table' | 'column' | 'index' | 'constraint';
  action: 'added' | 'removed' | 'modified';
  object: string;
  details: string;
}

// 迁移干运行结果
export interface MigrationDryRunResult {
  plan: MigrationPlan;
  sqlStatements: Array<{
    migration: string;
    sql: string;
    type: 'DDL' | 'DML';
  }>;
  estimatedTime: number;
  risks: MigrationRisk[];
}

// 迁移风险
export interface MigrationRisk {
  level: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  mitigation?: string;
}

// 迁移错误
export interface MigrationError extends Error {
  migration: string;
  step: string;
  sql?: string;
  code?: string;
  recoverable: boolean;
}

// 迁移事件
export type MigrationEvent = 
  | 'migration:start'
  | 'migration:complete'
  | 'migration:error'
  | 'migration:rollback'
  | 'batch:start'
  | 'batch:complete'
  | 'batch:error';

// 种子脚本接口
export interface Seed {
  name: string;
  description?: string;
  dependencies?: string[];
  run: (seeder: SeedExecutor) => Promise<void>;
  rollback?: (seeder: SeedExecutor) => Promise<void>;
}

// 种子执行器接口
export interface SeedExecutor {
  // 数据插入
  insert(tableName: string, data: Record<string, any> | Record<string, any>[]): Promise<void>;
  
  // 数据更新
  update(tableName: string, data: Record<string, any>, where?: string, params?: any[]): Promise<void>;
  
  // 数据删除
  delete(tableName: string, where?: string, params?: any[]): Promise<void>;
  truncate(tableName: string): Promise<void>;
  
  // 原始SQL
  raw(query: string, params?: any[]): Promise<any>;
  
  // 工具方法
  exists(tableName: string, where: string, params?: any[]): Promise<boolean>;
  count(tableName: string, where?: string, params?: any[]): Promise<number>;
  
  // 事务支持
  transaction<T>(callback: (trx: SeedExecutor) => Promise<T>): Promise<T>;
}

// 种子结果
export interface SeedResult {
  success: boolean;
  seedsRun: string[];
  executionTime: number;
  errors: SeedError[];
  recordsInserted: number;
  recordsUpdated: number;
  recordsDeleted: number;
}

// 种子错误
export interface SeedError extends Error {
  seed: string;
  table?: string;
  operation?: string;
  recoverable: boolean;
}

// 迁移配置
export interface MigrationConfig {
  // 目录配置
  directory: string;
  extension: string;
  
  // 表配置
  tableName: string;
  schemaName?: string;
  
  // 执行配置
  batchSize: number;
  timeout: number;
  
  // 验证配置
  validateChecksums: boolean;
  validateOnMigrate: boolean;
  
  // 回滚配置
  enableRollback: boolean;
  rollbackTimeout: number;
  
  // 并发配置
  maxConcurrency: number;
  
  // 日志配置
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    destination?: string;
  };
  
  // 钩子函数
  hooks?: {
    beforeMigration?: (migration: Migration) => Promise<void>;
    afterMigration?: (migration: Migration, result: MigrationResult) => Promise<void>;
    onError?: (error: MigrationError) => Promise<void>;
  };
}

// 种子配置
export interface SeedConfig {
  // 目录配置
  directory: string;
  extension: string;
  
  // 执行配置
  batchSize: number;
  timeout: number;
  
  // 策略配置
  strategy: 'truncate' | 'delete' | 'upsert';
  
  // 环境过滤
  environments: string[];
  
  // 依赖管理
  resolveDependencies: boolean;
  
  // 验证配置
  validate: boolean;
  schema?: any;
  
  // 钩子函数
  hooks?: {
    beforeSeed?: (seed: Seed) => Promise<void>;
    afterSeed?: (seed: Seed, result: SeedResult) => Promise<void>;
    onError?: (error: SeedError) => Promise<void>;
  };
}

// 导出所有类型
export {
  Migration,
  MigrationExecutor,
  TableBuilder,
  ColumnBuilder,
  ForeignKeyBuilder,
  ReferencesBuilder,
  ForeignKeyAction,
  ColumnType,
  IndexOptions,
  ForeignKeyOptions,
  MigrationState,
  MigrationHistory,
  MigrationPlan,
  MigrationConflict,
  MigrationRunner,
  MigrationResult,
  MigrationValidationResult,
  IntegrityCheckResult,
  SchemaChange,
  MigrationDryRunResult,
  MigrationRisk,
  MigrationError,
  MigrationEvent,
  Seed,
  SeedExecutor,
  SeedResult,
  SeedError,
  MigrationConfig,
  SeedConfig
};