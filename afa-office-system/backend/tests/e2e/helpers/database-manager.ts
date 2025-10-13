import { testEnvironmentConfig } from '../config/test-environment.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * 端到端测试数据库管理器
 * 负责测试数据库的初始化、重置和清理
 */
export class DatabaseManager {
  private config = testEnvironmentConfig.database;
  private testDbPath: string;

  constructor() {
    this.testDbPath = this.config.path || './tests/e2e/fixtures/test.db';
  }

  /**
   * 初始化测试数据库
   */
  async initialize(): Promise<void> {
    console.log('初始化端到端测试数据库...');

    // 确保测试数据库目录存在
    const dbDir = path.dirname(this.testDbPath);
    await fs.mkdir(dbDir, { recursive: true });

    // 如果是SQLite，创建数据库文件
    if (this.config.type === 'sqlite') {
      await this.initializeSQLite();
    } else if (this.config.type === 'mysql') {
      await this.initializeMySQL();
    }
  }

  /**
   * 重置测试数据库
   * 清空所有数据并重新创建表结构
   */
  async resetDatabase(): Promise<void> {
    console.log('重置端到端测试数据库...');

    if (this.config.type === 'sqlite') {
      await this.resetSQLite();
    } else if (this.config.type === 'mysql') {
      await this.resetMySQL();
    }
  }

  /**
   * 清理测试数据库
   */
  async cleanup(): Promise<void> {
    console.log('清理端到端测试数据库...');

    if (this.config.type === 'sqlite') {
      await this.cleanupSQLite();
    } else if (this.config.type === 'mysql') {
      await this.cleanupMySQL();
    }
  }

  /**
   * 初始化SQLite数据库
   */
  private async initializeSQLite(): Promise<void> {
    // 删除现有的测试数据库文件
    try {
      await fs.unlink(this.testDbPath);
    } catch (error) {
      // 文件不存在，忽略错误
    }

    // 创建数据库表结构
    await this.createTables();
  }

  /**
   * 初始化MySQL数据库
   */
  private async initializeMySQL(): Promise<void> {
    // MySQL数据库初始化逻辑
    // 这里可以连接到MySQL并创建测试数据库
    console.log('MySQL数据库初始化 - 待实现');
  }

  /**
   * 重置SQLite数据库
   */
  private async resetSQLite(): Promise<void> {
    // 清空所有表数据
    await this.truncateAllTables();
  }

  /**
   * 重置MySQL数据库
   */
  private async resetMySQL(): Promise<void> {
    // MySQL数据库重置逻辑
    console.log('MySQL数据库重置 - 待实现');
  }

  /**
   * 清理SQLite数据库
   */
  private async cleanupSQLite(): Promise<void> {
    try {
      await fs.unlink(this.testDbPath);
    } catch (error) {
      // 文件不存在，忽略错误
    }
  }

  /**
   * 清理MySQL数据库
   */
  private async cleanupMySQL(): Promise<void> {
    // MySQL数据库清理逻辑
    console.log('MySQL数据库清理 - 待实现');
  }

  /**
   * 创建数据库表结构
   */
  private async createTables(): Promise<void> {
    // 这里应该执行数据库迁移脚本
    // 为了简化，我们直接定义表结构
    const createTablesSQL = `
      -- 用户表
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'visitor',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 商户表
      CREATE TABLE IF NOT EXISTS merchants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        contact_person VARCHAR(50),
        contact_phone VARCHAR(20),
        contact_email VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 空间表
      CREATE TABLE IF NOT EXISTS spaces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        floor VARCHAR(10),
        capacity INTEGER,
        merchant_id INTEGER,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (merchant_id) REFERENCES merchants(id)
      );

      -- 访客申请表
      CREATE TABLE IF NOT EXISTS visitor_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visitor_name VARCHAR(50) NOT NULL,
        visitor_phone VARCHAR(20) NOT NULL,
        visitor_company VARCHAR(100),
        visit_purpose TEXT,
        visit_date DATE NOT NULL,
        visit_time_start TIME NOT NULL,
        visit_time_end TIME NOT NULL,
        merchant_id INTEGER NOT NULL,
        space_id INTEGER,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        qr_code VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (merchant_id) REFERENCES merchants(id),
        FOREIGN KEY (space_id) REFERENCES spaces(id)
      );

      -- 通行记录表
      CREATE TABLE IF NOT EXISTS access_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        visitor_application_id INTEGER,
        access_type VARCHAR(20) NOT NULL,
        access_method VARCHAR(20) NOT NULL,
        space_id INTEGER,
        access_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'success',
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (visitor_application_id) REFERENCES visitor_applications(id),
        FOREIGN KEY (space_id) REFERENCES spaces(id)
      );

      -- 创建索引
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_merchants_status ON merchants(status);
      CREATE INDEX IF NOT EXISTS idx_spaces_merchant_id ON spaces(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_visitor_applications_merchant_id ON visitor_applications(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_visitor_applications_status ON visitor_applications(status);
      CREATE INDEX IF NOT EXISTS idx_access_records_user_id ON access_records(user_id);
      CREATE INDEX IF NOT EXISTS idx_access_records_space_id ON access_records(space_id);
    `;

    // 这里需要实际执行SQL，暂时用注释表示
    console.log('创建数据库表结构 - SQL已准备，需要实际执行');
  }

  /**
   * 清空所有表数据
   */
  private async truncateAllTables(): Promise<void> {
    const truncateSQL = `
      DELETE FROM access_records;
      DELETE FROM visitor_applications;
      DELETE FROM spaces;
      DELETE FROM merchants;
      DELETE FROM users;
      
      -- 重置自增ID
      DELETE FROM sqlite_sequence WHERE name IN (
        'users', 'merchants', 'spaces', 'visitor_applications', 'access_records'
      );
    `;

    // 这里需要实际执行SQL，暂时用注释表示
    console.log('清空所有表数据 - SQL已准备，需要实际执行');
  }

  /**
   * 获取数据库连接信息
   */
  getDatabaseInfo(): { type: string; path?: string; config?: any } {
    return {
      type: this.config.type,
      path: this.testDbPath,
      config: this.config.config
    };
  }
}