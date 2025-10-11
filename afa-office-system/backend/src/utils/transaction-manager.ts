import { EventEmitter } from 'events';
import type { DatabaseResult } from '../types/index.js';
import type { PooledConnection } from './mysql-connection-pool.js';

// 查询参数类型
type QueryParams = (string | number | null | undefined)[];

// 事务状态枚举
export enum TransactionState {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMMITTED = 'committed',
  ROLLED_BACK = 'rolled_back',
  FAILED = 'failed',
}

// 事务选项
export interface TransactionOptions {
  timeout?: number;           // 事务超时时间（毫秒）
  isolationLevel?: 'DEFERRED' | 'IMMEDIATE' | 'EXCLUSIVE';
  retryOnDeadlock?: boolean;  // 死锁时是否重试
  maxRetries?: number;        // 最大重试次数
  savepoints?: boolean;       // 是否支持保存点
}

// 事务统计信息
export interface TransactionStats {
  id: string;
  state: TransactionState;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  operationCount: number;
  rollbackReason?: string | undefined;
  isNested: boolean;
  savepointCount: number;
}

// 保存点信息
export interface Savepoint {
  name: string;
  createdAt: Date;
  operationCount: number;
}

// 事务执行器接口
export interface TransactionExecutor {
  run(sql: string, params?: QueryParams): Promise<DatabaseResult>;
  get<T = any>(sql: string, params?: QueryParams): Promise<T | undefined>;
  all<T = any>(sql: string, params?: QueryParams): Promise<T[]>;
  createSavepoint(name?: string): Promise<string>;
  rollbackToSavepoint(name: string): Promise<void>;
  releaseSavepoint(name: string): Promise<void>;
  getStats(): TransactionStats;
}

/**
 * 事务管理器
 * 支持嵌套事务、保存点、超时控制和死锁检测
 */
export class TransactionManager extends EventEmitter {
  private connection: PooledConnection;
  private state: TransactionState = TransactionState.PENDING;
  private options: Required<TransactionOptions>;
  private stats: TransactionStats;
  private savepoints: Map<string, Savepoint> = new Map();
  private timeoutId: NodeJS.Timeout | null = null;
  private operationCount = 0;
  private isNested = false;
  private _parentTransaction: TransactionManager | undefined;

  constructor(
    connection: PooledConnection,
    options: TransactionOptions = {},
    parentTransaction?: TransactionManager
  ) {
    super();
    
    this.connection = connection;
    this._parentTransaction = parentTransaction;
    this.isNested = !!parentTransaction;
    
    // 设置默认选项
    this.options = {
      timeout: 30000,
      isolationLevel: 'DEFERRED',
      retryOnDeadlock: true,
      maxRetries: 3,
      savepoints: true,
      ...options,
    };

    // 初始化统计信息
    this.stats = {
      id: this.generateTransactionId(),
      state: TransactionState.PENDING,
      startTime: new Date(),
      operationCount: 0,
      isNested: this.isNested,
      savepointCount: 0,
    };
  }

  /**
   * 开始事务
   */
  async begin(): Promise<void> {
    if (this.state !== TransactionState.PENDING) {
      throw new Error(`事务已开始，当前状态: ${this.state}`);
    }

    try {
      // 设置超时
      if (this.options.timeout > 0) {
        this.timeoutId = setTimeout(() => {
          this.handleTimeout();
        }, this.options.timeout);
      }

      // 开始事务
      const beginSql = this.isNested 
        ? `SAVEPOINT sp_${this.stats.id}`
        : `BEGIN ${this.options.isolationLevel} TRANSACTION`;

      await this.executeStatement(beginSql);
      
      this.state = TransactionState.ACTIVE;
      this.stats.state = TransactionState.ACTIVE;
      
      console.log(`🔄 事务开始: ${this.stats.id} (${this.isNested ? '嵌套' : '主'}事务)`);
      this.emit('transaction-started', this.stats);
      
    } catch (error) {
      this.state = TransactionState.FAILED;
      this.stats.state = TransactionState.FAILED;
      this.clearTimeout();
      throw error;
    }
  }

  /**
   * 提交事务
   */
  async commit(): Promise<void> {
    if (this.state !== TransactionState.ACTIVE) {
      throw new Error(`无法提交事务，当前状态: ${this.state}`);
    }

    try {
      const commitSql = this.isNested 
        ? `RELEASE SAVEPOINT sp_${this.stats.id}`
        : 'COMMIT';

      await this.executeStatement(commitSql);
      
      this.state = TransactionState.COMMITTED;
      this.stats.state = TransactionState.COMMITTED;
      this.stats.endTime = new Date();
      this.stats.duration = this.stats.endTime.getTime() - this.stats.startTime.getTime();
      
      this.clearTimeout();
      
      console.log(`✅ 事务提交: ${this.stats.id} (耗时: ${this.stats.duration}ms)`);
      this.emit('transaction-committed', this.stats);
      
    } catch (error) {
      this.state = TransactionState.FAILED;
      this.stats.state = TransactionState.FAILED;
      this.clearTimeout();
      throw error;
    }
  }

  /**
   * 回滚事务
   */
  async rollback(reason?: string): Promise<void> {
    if (this.state !== TransactionState.ACTIVE) {
      console.warn(`尝试回滚非活跃事务: ${this.stats.id}, 状态: ${this.state}`);
      return;
    }

    try {
      const rollbackSql = this.isNested 
        ? `ROLLBACK TO SAVEPOINT sp_${this.stats.id}`
        : 'ROLLBACK';

      await this.executeStatement(rollbackSql);
      
      this.state = TransactionState.ROLLED_BACK;
      this.stats.state = TransactionState.ROLLED_BACK;
      this.stats.rollbackReason = reason;
      this.stats.endTime = new Date();
      this.stats.duration = this.stats.endTime.getTime() - this.stats.startTime.getTime();
      
      this.clearTimeout();
      
      console.log(`🔄 事务回滚: ${this.stats.id} ${reason ? `(原因: ${reason})` : ''}`);
      this.emit('transaction-rolled-back', this.stats);
      
    } catch (error) {
      this.state = TransactionState.FAILED;
      this.stats.state = TransactionState.FAILED;
      this.clearTimeout();
      throw error;
    }
  }

  /**
   * 创建事务执行器
   */
  createExecutor(): TransactionExecutor {
    return {
      run: async (sql: string, params: QueryParams = []) => {
        this.validateActiveState();
        return this.executeRun(sql, params);
      },
      
      get: async <T>(sql: string, params: QueryParams = []) => {
        this.validateActiveState();
        return this.executeGet<T>(sql, params);
      },
      
      all: async <T>(sql: string, params: QueryParams = []) => {
        this.validateActiveState();
        return this.executeAll<T>(sql, params);
      },
      
      createSavepoint: async (name?: string) => {
        this.validateActiveState();
        return this.createSavepoint(name);
      },
      
      rollbackToSavepoint: async (name: string) => {
        this.validateActiveState();
        return this.rollbackToSavepoint(name);
      },
      
      releaseSavepoint: async (name: string) => {
        this.validateActiveState();
        return this.releaseSavepoint(name);
      },
      
      getStats: () => ({ ...this.stats }),
    };
  }

  /**
   * 创建保存点
   */
  async createSavepoint(name?: string): Promise<string> {
    if (!this.options.savepoints) {
      throw new Error('当前事务不支持保存点');
    }

    const savepointName: string = name || `sp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    if (this.savepoints.has(savepointName)) {
      throw new Error(`保存点已存在: ${savepointName}`);
    }

    await this.executeStatement(`SAVEPOINT ${savepointName}`);
    
    const savepoint: Savepoint = {
      name: savepointName,
      createdAt: new Date(),
      operationCount: this.operationCount,
    };
    
    this.savepoints.set(savepointName, savepoint);
    this.stats.savepointCount++;
    
    console.log(`📍 创建保存点: ${savepointName} (事务: ${this.stats.id})`);
    this.emit('savepoint-created', { transactionId: this.stats.id, savepoint });
    
    return savepointName;
  }

  /**
   * 回滚到保存点
   */
  async rollbackToSavepoint(name: string): Promise<void> {
    const savepoint = this.savepoints.get(name);
    if (!savepoint) {
      throw new Error(`保存点不存在: ${name}`);
    }

    await this.executeStatement(`ROLLBACK TO SAVEPOINT ${name}`);
    
    // 移除在此保存点之后创建的保存点
    for (const [spName, sp] of this.savepoints) {
      if (sp.createdAt > savepoint.createdAt) {
        this.savepoints.delete(spName);
        this.stats.savepointCount--;
      }
    }
    
    console.log(`🔄 回滚到保存点: ${name} (事务: ${this.stats.id})`);
    this.emit('savepoint-rollback', { transactionId: this.stats.id, savepointName: name });
  }

  /**
   * 释放保存点
   */
  async releaseSavepoint(name: string): Promise<void> {
    const savepoint = this.savepoints.get(name);
    if (!savepoint) {
      throw new Error(`保存点不存在: ${name}`);
    }

    await this.executeStatement(`RELEASE SAVEPOINT ${name}`);
    
    this.savepoints.delete(name);
    this.stats.savepointCount--;
    
    console.log(`🗑️ 释放保存点: ${name} (事务: ${this.stats.id})`);
    this.emit('savepoint-released', { transactionId: this.stats.id, savepointName: name });
  }

  /**
   * 获取事务统计信息
   */
  getStats(): TransactionStats {
    return { ...this.stats };
  }

  /**
   * 执行 RUN 语句
   */
  private async executeRun(sql: string, params: QueryParams): Promise<DatabaseResult> {
    try {
      const [result] = await this.connection.connection.query(sql, params);
      return {
        lastID: (result as any).insertId,
        changes: (result as any).affectedRows,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 执行 GET 语句
   */
  private async executeGet<T>(sql: string, params: QueryParams): Promise<T | undefined> {
    try {
      const [rows] = await this.connection.connection.query(sql, params);
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0] as T;
      }
      return undefined;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 执行 ALL 语句
   */
  private async executeAll<T>(sql: string, params: QueryParams): Promise<T[]> {
    try {
      const [rows] = await this.connection.connection.query(sql, params);
      return Array.isArray(rows) ? rows as T[] : [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * 执行语句
   */
  private async executeStatement(sql: string): Promise<void> {
    try {
      await this.connection.connection.query(sql);
      this.operationCount++;
      this.stats.operationCount = this.operationCount;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 验证事务是否处于活跃状态
   */
  private validateActiveState(): void {
    if (this.state !== TransactionState.ACTIVE) {
      throw new Error(`事务不处于活跃状态: ${this.state}`);
    }
  }

  /**
   * 处理事务超时
   */
  private handleTimeout(): void {
    console.warn(`⏰ 事务超时: ${this.stats.id} (${this.options.timeout}ms)`);
    this.rollback('事务超时').catch(err => {
      console.error('超时回滚失败:', err.message);
    });
  }

  /**
   * 清除超时定时器
   */
  private clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * 生成事务ID
   */
  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 事务管理器工厂
 */
export class TransactionManagerFactory {
  private static activeTransactions = new Map<string, TransactionManager>();

  /**
   * 创建事务管理器
   */
  static create(
    connection: PooledConnection,
    options?: TransactionOptions,
    parentTransaction?: TransactionManager
  ): TransactionManager {
    const manager = new TransactionManager(connection, options, parentTransaction);
    
    // 监听事务完成事件，清理活跃事务记录
    manager.on('transaction-committed', (stats) => {
      this.activeTransactions.delete(stats.id);
    });
    
    manager.on('transaction-rolled-back', (stats) => {
      this.activeTransactions.delete(stats.id);
    });
    
    this.activeTransactions.set(manager.getStats().id, manager);
    return manager;
  }

  /**
   * 获取活跃事务列表
   */
  static getActiveTransactions(): TransactionStats[] {
    return Array.from(this.activeTransactions.values()).map(tx => tx.getStats());
  }

  /**
   * 获取事务统计信息
   */
  static getTransactionStats(): {
    activeCount: number;
    totalCreated: number;
    averageDuration: number;
  } {
    const active = this.activeTransactions.size;
    // 这里可以添加更多统计逻辑
    return {
      activeCount: active,
      totalCreated: 0, // 需要实现计数器
      averageDuration: 0, // 需要实现平均时间计算
    };
  }

  /**
   * 强制回滚所有活跃事务（用于紧急情况）
   */
  static async rollbackAllActiveTransactions(reason = '系统强制回滚'): Promise<void> {
    const rollbackPromises = Array.from(this.activeTransactions.values()).map(tx => 
      tx.rollback(reason).catch(err => 
        console.error(`强制回滚事务失败 ${tx.getStats().id}:`, err.message)
      )
    );
    
    await Promise.allSettled(rollbackPromises);
    this.activeTransactions.clear();
  }
}