import database from '../src/utils/database.js';
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 事务查询接口
interface TransactionQuery {
  sql: string;
  params?: (string | number | null | undefined)[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 数据库架构变更的迁移系统
 */
class MigrationManager {
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = join(__dirname, 'migrations');
  }

  /**
   * 如果不存在则创建迁移表
   */
  async createMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await database.run(sql);
  }

  /**
   * 获取已执行的迁移列表
   */
  async getExecutedMigrations(): Promise<string[]> {
    const sql = 'SELECT filename FROM migrations ORDER BY id';
    const rows = await database.all<{ filename: string }>(sql);
    return rows.map(row => row.filename);
  }

  /**
   * 获取待执行的迁移列表
   */
  async getPendingMigrations(): Promise<string[]> {
    try {
      const allMigrations = readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      const executedMigrations = await this.getExecutedMigrations();
      
      return allMigrations.filter(migration => 
        !executedMigrations.includes(migration)
      );
    } catch (error) {
      // 迁移目录不存在
      return [];
    }
  }

  /**
   * 执行单个迁移
   */
  async executeMigration(filename: string): Promise<void> {
    const migrationPath = join(this.migrationsPath, filename);
    const sql = readFileSync(migrationPath, 'utf8');
    
    // 分割为单独的语句
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // 在事务中执行
    const queries: TransactionQuery[] = statements.map(statement => ({ sql: statement }));
    queries.push({
      sql: 'INSERT INTO migrations (filename) VALUES (?)',
      params: [filename]
    });
    
    await database.transaction(queries);
    console.log(`✅ 执行迁移: ${filename}`);
  }

  /**
   * 运行所有待执行的迁移
   */
  async runMigrations(): Promise<void> {
    try {
      console.log('🔄 开始数据库迁移...');
      
      await database.connect();
      await this.createMigrationsTable();
      
      const pendingMigrations = await this.getPendingMigrations();
      
      if (pendingMigrations.length === 0) {
        console.log('✅ 没有待执行的迁移');
        return;
      }
      
      console.log(`📋 发现 ${pendingMigrations.length} 个待执行的迁移`);
      
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }
      
      console.log('✅ 所有迁移执行完成');
      
    } catch (error) {
      console.error('❌ 迁移执行失败:', (error as Error).message);
      throw error;
    } finally {
      await database.close();
    }
  }

  /**
   * 创建新的迁移文件
   */
  createMigration(name: string): void {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const filename = `${timestamp}_${name}.sql`;
    const filepath = join(this.migrationsPath, filename);
    
    const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- 在此添加您的SQL语句
-- 示例:
-- ALTER TABLE users ADD COLUMN new_field TEXT;

-- 如果需要，记得添加适当的索引
-- CREATE INDEX IF NOT EXISTS idx_users_new_field ON users(new_field);
`;
    
    try {
      writeFileSync(filepath, template);
      console.log(`✅ 创建迁移文件: ${filename}`);
    } catch (error) {
      console.error('❌ 创建迁移文件失败:', (error as Error).message);
    }
  }
}

const migrationManager = new MigrationManager();

// 如果直接调用则运行迁移
const currentFile = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === currentFile;

if (isMainModule) {
  const command = process.argv[2];
  const name = process.argv[3];
  
  if (command === 'create' && name) {
    migrationManager.createMigration(name);
  } else {
    migrationManager.runMigrations().catch(console.error);
  }
}

export { migrationManager };