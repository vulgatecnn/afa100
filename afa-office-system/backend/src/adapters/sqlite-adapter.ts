/**
 * SQLite数据库适配器实现
 */

import sqlite3 from 'sqlite3';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DatabaseAdapter, RunResult, Transaction } from '../interfaces/database-adapter';
import { DatabaseConfig, SQLiteConfig, DatabaseType } from '../config/database-config-manager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * SQLite事务实现
 */
class SQLiteTransaction implements Transaction {
  constructor(private db: sqlite3.Database) {}

  async commit(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async rollback(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('ROLLBACK', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

/**
 * SQLite适配器实现
 */
export class SQLiteAdapter implements DatabaseAdapter {
  private db: sqlite3.Database | null = null;
  private config: SQLiteConfig | null = null;
  private ready = false;

  /**
   * 连接到SQLite数据库
   */
  async connect(config: DatabaseConfig): Promise<void> {
    if (config.type !== DatabaseType.SQLITE) {
      throw new Error('SQLiteAdapter只能用于SQLite配置');
    }

    this.config = config as SQLiteConfig;
    
    return new Promise((resolve, reject) => {
      const mode = this.config!.mode || (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
      
      this.db = new sqlite3.Database(this.config!.path, mode, async (err) => {
        if (err) {
          this.ready = false;
          this.db = null;
          reject(new Error(`SQLite连接错误: ${err.message}`));
          return;
        }

        try {
          // 应用pragma设置
          if (this.config!.pragmas) {
            for (const [key, value] of Object.entries(this.config!.pragmas)) {
              await this.run(`PRAGMA ${key} = ${value}`);
            }
          }

          this.ready = true;
          console.log(`✅ SQLite连接成功: ${this.config!.path}`);
          resolve();
        } catch (pragmaError) {
          this.ready = false;
          reject(pragmaError);
        }
      });
    });
  }

  /**
   * 断开数据库连接
   */
  async disconnect(): Promise<void> {
    if (this.db) {
      return new Promise((resolve) => {
        this.db!.close((err) => {
          if (err) {
            console.error('SQLite关闭错误:', err);
          }
          this.db = null;
          this.ready = false;
          console.log('🔌 SQLite连接已断开');
          resolve();
        });
      });
    }
    this.ready = false;
  }

  /**
   * 检查连接是否就绪
   */
  isReady(): boolean {
    return this.ready && this.db !== null;
  }

  /**
   * 执行SQL语句（INSERT, UPDATE, DELETE等）
   */
  async run(sql: string, params: any[] = []): Promise<RunResult> {
    if (!this.db) {
      throw new Error('SQLite连接未初始化');
    }

    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  /**
   * 查询单条记录
   */
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (!this.db) {
      throw new Error('SQLite连接未初始化');
    }

    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  /**
   * 查询多条记录
   */
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) {
      throw new Error('SQLite连接未初始化');
    }

    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  /**
   * 开始事务
   */
  async beginTransaction(): Promise<Transaction> {
    if (!this.db) {
      throw new Error('SQLite连接未初始化');
    }

    await this.run('BEGIN TRANSACTION');
    return new SQLiteTransaction(this.db);
  }

  /**
   * 创建测试数据库（SQLite中不需要，因为每个文件就是一个数据库）
   */
  async createTestDatabase(dbName: string): Promise<void> {
    // SQLite中每个文件就是一个数据库，这里不需要特殊操作
    console.log(`📦 SQLite测试数据库准备就绪: ${dbName} (${this.config?.path})`);
  }

  /**
   * 删除测试数据库（SQLite中清空所有表）
   */
  async dropTestDatabase(dbName: string): Promise<void> {
    if (!this.db) {
      throw new Error('SQLite连接未初始化');
    }

    try {
      // 获取所有表名
      const tables = await this.all<{name: string}>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );

      // 禁用外键约束
      await this.run('PRAGMA foreign_keys = OFF');

      // 删除所有表
      for (const table of tables) {
        await this.run(`DROP TABLE IF EXISTS "${table.name}"`);
      }

      // 重新启用外键约束
      await this.run('PRAGMA foreign_keys = ON');

      console.log(`🗑️ SQLite测试数据库已清空: ${dbName}`);
    } catch (error) {
      console.error(`清空SQLite测试数据库失败: ${dbName}`, error);
      throw error;
    }
  }

  /**
   * 初始化数据库结构
   */
  async initializeSchema(dbName: string): Promise<void> {
    if (!this.db) {
      throw new Error('SQLite连接未初始化');
    }

    try {
      // 读取SQLite schema文件
      const schemaPath = join(__dirname, '../../database/test-schema.sql');
      const schemaSQL = await readFile(schemaPath, 'utf-8');
      
      // 分割SQL语句并执行
      const statements = schemaSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      for (const statement of statements) {
        if (statement.trim()) {
          await this.run(statement);
        }
      }
      
      console.log(`🏗️ SQLite数据库结构初始化完成: ${dbName}`);
    } catch (error) {
      console.error(`初始化SQLite数据库结构失败: ${dbName}`, error);
      throw error;
    }
  }

  /**
   * 检查数据库连接
   */
  async ping(): Promise<boolean> {
    if (!this.db) {
      return false;
    }

    try {
      const result = await this.get('SELECT 1 as ping');
      return result?.ping === 1;
    } catch (error) {
      console.error('SQLite ping失败:', error);
      return false;
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    await this.disconnect();
  }

  /**
   * 执行原始SQL（支持多语句）
   */
  async executeRaw(sql: string): Promise<any> {
    if (!this.db) {
      throw new Error('SQLite连接未初始化');
    }

    return new Promise((resolve, reject) => {
      this.db!.exec(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }
}