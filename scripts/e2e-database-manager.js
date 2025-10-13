#!/usr/bin/env node

/**
 * E2E 测试数据库管理器
 * 专门用于E2E测试环境的数据库管理，包括创建、初始化、清理和数据隔离
 */

import mysql from 'mysql2/promise';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * E2E 数据库管理器
 */
class E2EDatabaseManager {
  constructor(options = {}) {
    this.config = {
      // 管理员数据库配置
      admin: {
        host: process.env.MYSQL_ADMIN_HOST || '127.0.0.1',
        port: parseInt(process.env.MYSQL_ADMIN_PORT || '3306'),
        user: process.env.MYSQL_ADMIN_USER || 'root',
        password: process.env.MYSQL_ADMIN_PASSWORD || '111111',
        multipleStatements: true
      },
      
      // E2E测试数据库配置
      e2eTest: {
        host: process.env.E2E_TEST_DB_HOST || '127.0.0.1',
        port: parseInt(process.env.E2E_TEST_DB_PORT || '3306'),
        user: process.env.E2E_TEST_DB_USER || 'afa_e2e_user',
        password: process.env.E2E_TEST_DB_PASSWORD || 'afa_e2e_2024',
        database: process.env.E2E_TEST_DB_NAME || 'afa_office_e2e_test'
      },
      
      // 数据隔离配置
      isolation: {
        useTransactions: options.useTransactions !== false,
        snapshotEnabled: options.snapshotEnabled !== false,
        autoCleanup: options.autoCleanup !== false,
      },
      
      // 日志配置
      logging: {
        enabled: options.verbose !== false,
        logFile: join(rootDir, 'logs', 'e2e-database.log'),
      },
      
      ...options,
    };
    
    this.connections = new Map();
    this.snapshots = new Map();
    this.testSessions = new Map();
    
    // 确保日志目录存在
    this.ensureLogDirectory();
  }  /**
 
  * 创建E2E测试数据库
   */
  async createE2EDatabase() {
    this.log('🚀 开始创建E2E测试数据库...');
    
    const connection = await mysql.createConnection(this.config.admin);
    
    try {
      const dbName = this.config.e2eTest.database;
      const userName = this.config.e2eTest.user;
      const password = this.config.e2eTest.password;
      const host = this.config.e2eTest.host;
      
      // 创建数据库
      await this.executeSQL(
        connection, 
        `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
        `创建E2E测试数据库: ${dbName}`
      );
      
      // 创建用户（如果不存在）
      await this.executeSQL(
        connection,
        `CREATE USER IF NOT EXISTS '${userName}'@'${host}' IDENTIFIED BY '${password}'`,
        `创建E2E测试用户: ${userName}`
      );
      
      // 授予权限
      await this.executeSQL(
        connection,
        `GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${userName}'@'${host}'`,
        `授予数据库权限给用户: ${userName}`
      );
      
      // 刷新权限
      await this.executeSQL(connection, 'FLUSH PRIVILEGES', '刷新权限');
      
      this.log('✅ E2E测试数据库创建完成');
      
    } finally {
      await connection.end();
    }
  }

  /**
   * 初始化E2E测试数据
   */
  async initializeTestData() {
    this.log('🔄 开始初始化E2E测试数据...');
    
    const connection = await this.getConnection();
    
    try {
      // 创建表结构（如果不存在）
      await this.createTablesIfNotExists(connection);
      
      // 清理现有数据
      await this.cleanupTestData(connection);
      
      // 插入基础测试数据
      await this.insertBaseTestData(connection);
      
      this.log('✅ E2E测试数据初始化完成');
      
    } finally {
      await this.releaseConnection(connection);
    }
  }

  /**
   * 创建数据快照
   */
  async createSnapshot(snapshotId, description = '') {
    this.log(`📸 创建数据快照: ${snapshotId}`);
    
    const connection = await this.getConnection();
    
    try {
      const snapshot = {
        id: snapshotId,
        description,
        timestamp: new Date().toISOString(),
        data: {},
      };
      
      // 获取所有表的数据
      const tables = await this.getAllTables(connection);
      
      for (const tableName of tables) {
        const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);
        snapshot.data[tableName] = rows;
      }
      
      // 保存快照
      this.snapshots.set(snapshotId, snapshot);
      
      // 可选：保存到文件
      if (this.config.isolation.snapshotEnabled) {
        await this.saveSnapshotToFile(snapshot);
      }
      
      this.log(`✅ 数据快照创建完成: ${snapshotId}`);
      return snapshotId;
      
    } finally {
      await this.releaseConnection(connection);
    }
  }

  /**
   * 恢复数据快照
   */
  async restoreSnapshot(snapshotId) {
    this.log(`🔄 恢复数据快照: ${snapshotId}`);
    
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      // 尝试从文件加载
      const fileSnapshot = await this.loadSnapshotFromFile(snapshotId);
      if (!fileSnapshot) {
        throw new Error(`快照不存在: ${snapshotId}`);
      }
      this.snapshots.set(snapshotId, fileSnapshot);
    }
    
    const connection = await this.getConnection();
    
    try {
      // 禁用外键检查
      await this.executeSQL(connection, 'SET FOREIGN_KEY_CHECKS = 0', '禁用外键检查');
      
      // 清空所有表
      const tables = await this.getAllTables(connection);
      for (const tableName of tables) {
        await this.executeSQL(connection, `TRUNCATE TABLE \`${tableName}\``, `清空表: ${tableName}`);
      }
      
      // 恢复数据
      const snapshotData = this.snapshots.get(snapshotId);
      for (const [tableName, rows] of Object.entries(snapshotData.data)) {
        if (rows.length > 0) {
          await this.insertTableData(connection, tableName, rows);
        }
      }
      
      // 启用外键检查
      await this.executeSQL(connection, 'SET FOREIGN_KEY_CHECKS = 1', '启用外键检查');
      
      this.log(`✅ 数据快照恢复完成: ${snapshotId}`);
      
    } finally {
      await this.releaseConnection(connection);
    }
  }  /**
  
 * 开始测试会话
   */
  async startTestSession(sessionId, options = {}) {
    this.log(`🎬 开始测试会话: ${sessionId}`);
    
    const session = {
      id: sessionId,
      startTime: Date.now(),
      options,
      snapshots: [],
      transactions: [],
      status: 'active',
    };
    
    // 创建会话前快照
    if (this.config.isolation.snapshotEnabled) {
      const snapshotId = `${sessionId}-before`;
      await this.createSnapshot(snapshotId, `测试会话开始前快照: ${sessionId}`);
      session.snapshots.push(snapshotId);
    }
    
    this.testSessions.set(sessionId, session);
    
    this.log(`✅ 测试会话已开始: ${sessionId}`);
    return session;
  }

  /**
   * 结束测试会话
   */
  async endTestSession(sessionId, cleanup = true) {
    this.log(`🎬 结束测试会话: ${sessionId}`);
    
    const session = this.testSessions.get(sessionId);
    if (!session) {
      this.log(`⚠️ 测试会话不存在: ${sessionId}`);
      return;
    }
    
    try {
      // 自动清理（如果启用）
      if (cleanup && this.config.isolation.autoCleanup) {
        await this.cleanupTestSession(sessionId);
      }
      
      session.status = 'completed';
      session.endTime = Date.now();
      session.duration = session.endTime - session.startTime;
      
      this.log(`✅ 测试会话已结束: ${sessionId} (耗时: ${session.duration}ms)`);
      
    } finally {
      this.testSessions.delete(sessionId);
    }
  }

  /**
   * 清理测试会话
   */
  async cleanupTestSession(sessionId) {
    this.log(`🧹 清理测试会话: ${sessionId}`);
    
    const session = this.testSessions.get(sessionId);
    if (!session) {
      return;
    }
    
    // 恢复到会话开始前的状态
    if (session.snapshots.length > 0) {
      const beforeSnapshot = session.snapshots[0];
      await this.restoreSnapshot(beforeSnapshot);
    }
    
    this.log(`✅ 测试会话清理完成: ${sessionId}`);
  }

  /**
   * 清理所有测试数据
   */
  async cleanupTestData(connection = null) {
    this.log('🧹 开始清理测试数据...');
    
    const conn = connection || await this.getConnection();
    const shouldRelease = !connection;
    
    try {
      // 获取所有表名
      const tables = await this.getAllTables(conn);
      
      if (tables.length > 0) {
        // 禁用外键检查
        await this.executeSQL(conn, 'SET FOREIGN_KEY_CHECKS = 0', '禁用外键检查');
        
        // 清空所有表
        for (const tableName of tables) {
          await this.executeSQL(conn, `TRUNCATE TABLE \`${tableName}\``, `清空表: ${tableName}`);
        }
        
        // 重新启用外键检查
        await this.executeSQL(conn, 'SET FOREIGN_KEY_CHECKS = 1', '启用外键检查');
      }
      
      this.log('✅ 测试数据清理完成');
      
    } finally {
      if (shouldRelease) {
        await this.releaseConnection(conn);
      }
    }
  }

  /**
   * 插入基础测试数据
   */
  async insertBaseTestData(connection) {
    this.log('📝 插入基础测试数据...');
    
    // 插入项目数据
    await this.executeSQL(connection, `
      INSERT INTO projects (code, name, description, status) VALUES 
      ('AFA-OFFICE', 'AFA办公大厦', 'AFA办公大厦项目', 'active')
    `, '插入项目数据');
    
    // 插入场地数据
    await this.executeSQL(connection, `
      INSERT INTO venues (project_id, code, name, description, status) VALUES 
      (1, 'BUILDING-A', 'A座大厦', 'AFA办公大厦A座', 'active')
    `, '插入场地数据');
    
    // 插入楼层数据
    await this.executeSQL(connection, `
      INSERT INTO floors (venue_id, code, name, description, status) VALUES 
      (1, 'FLOOR-1', '1楼', 'A座1楼', 'active'),
      (1, 'FLOOR-2', '2楼', 'A座2楼', 'active'),
      (1, 'FLOOR-3', '3楼', 'A座3楼', 'active')
    `, '插入楼层数据');
    
    // 插入权限数据
    const permissions = [
      ['user.create', '创建用户', 'project', 1, '["create"]'],
      ['user.read', '查看用户', 'project', 1, '["read"]'],
      ['user.update', '更新用户', 'project', 1, '["update"]'],
      ['user.delete', '删除用户', 'project', 1, '["delete"]'],
      ['merchant.create', '创建商户', 'project', 1, '["create"]'],
      ['merchant.read', '查看商户', 'project', 1, '["read"]'],
      ['merchant.update', '更新商户', 'project', 1, '["update"]'],
      ['merchant.delete', '删除商户', 'project', 1, '["delete"]'],
      ['merchant.manage', '管理商户', 'project', 1, '["manage"]'],
      ['visitor.create', '创建访客申请', 'project', 1, '["create"]'],
      ['visitor.read', '查看访客申请', 'project', 1, '["read"]'],
      ['visitor.update', '更新访客申请', 'project', 1, '["update"]'],
      ['visitor.approve', '审批访客申请', 'project', 1, '["approve"]'],
      ['access.read', '查看通行记录', 'project', 1, '["read"]']
    ];
    
    for (const [code, name, resource_type, resource_id, actions] of permissions) {
      await connection.execute(
        'INSERT IGNORE INTO permissions (code, name, description, resource_type, resource_id, actions) VALUES (?, ?, ?, ?, ?, ?)',
        [code, name, name, resource_type, resource_id, actions]
      );
    }
    
    // 插入测试用户数据
    await this.insertTestUsers(connection);
    
    this.log('✅ 基础测试数据插入完成');
  }  /**

   * 插入测试用户数据
   */
  async insertTestUsers(connection) {
    // 插入商户数据
    await this.executeSQL(connection, `
      INSERT INTO merchants (name, code, contact, phone, email, status) VALUES 
      ('测试科技公司', 'TEST-TECH', '张经理', '13800138001', 'test@tech.com', 'active'),
      ('示例贸易公司', 'DEMO-TRADE', '李经理', '13800138002', 'demo@trade.com', 'active')
    `, '插入商户数据');
    
    // 插入用户数据
    const users = [
      // 租务管理员
      ['租务管理员', '13900000001', 'tenant_admin_openid_001', null, null, 'tenant_admin', 'active', null, '$2b$10$hash1'],
      // 商户管理员
      ['商户管理员A', '13900000002', 'merchant_admin_openid_001', null, null, 'merchant_admin', 'active', 1, '$2b$10$hash2'],
      ['商户管理员B', '13900000003', 'merchant_admin_openid_002', null, null, 'merchant_admin', 'active', 2, '$2b$10$hash3'],
      // 员工
      ['员工A1', '13900000004', 'employee_openid_001', null, null, 'employee', 'active', 1, null],
      ['员工A2', '13900000005', 'employee_openid_002', null, null, 'employee', 'active', 1, null],
      ['员工B1', '13900000006', 'employee_openid_003', null, null, 'employee', 'active', 2, null],
      // 访客
      ['访客1', '13900000007', 'visitor_openid_001', null, null, 'visitor', 'active', null, null],
      ['访客2', '13900000008', 'visitor_openid_002', null, null, 'visitor', 'active', null, null]
    ];
    
    for (const [name, phone, open_id, union_id, avatar, user_type, status, merchant_id, password] of users) {
      await connection.execute(
        'INSERT INTO users (name, phone, open_id, union_id, avatar, user_type, status, merchant_id, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, phone, open_id, union_id, avatar, user_type, status, merchant_id, password]
      );
    }
  }

  /**
   * 创建表结构（如果不存在）
   */
  async createTablesIfNotExists(connection) {
    // 这里复用集成测试的表结构创建逻辑
    // 为了简化，我们调用现有的集成测试数据库初始化脚本
    const { execSync } = await import('child_process');
    const backendDir = join(rootDir, 'afa-office-system/backend');
    
    try {
      // 设置环境变量指向E2E测试数据库
      const env = {
        ...process.env,
        INTEGRATION_TEST_DB_HOST: this.config.e2eTest.host,
        INTEGRATION_TEST_DB_PORT: this.config.e2eTest.port.toString(),
        INTEGRATION_TEST_DB_USER: this.config.e2eTest.user,
        INTEGRATION_TEST_DB_PASSWORD: this.config.e2eTest.password,
        INTEGRATION_TEST_DB_NAME: this.config.e2eTest.database,
      };
      
      // 只创建表结构，不插入数据
      execSync('node scripts/init-integration-test-db.js init', {
        cwd: backendDir,
        env,
        stdio: 'pipe'
      });
      
      this.log('✅ 表结构创建完成');
    } catch (error) {
      this.log(`⚠️ 表结构创建失败，尝试手动创建: ${error.message}`);
      // 如果调用外部脚本失败，可以在这里手动创建表结构
      await this.createTablesManually(connection);
    }
  }

  /**
   * 手动创建表结构
   */
  async createTablesManually(connection) {
    // 这里可以添加手动创建表的SQL语句
    // 为了简化，暂时跳过详细实现
    this.log('⚠️ 手动创建表结构功能待实现');
  }

  /**
   * 获取数据库连接
   */
  async getConnection() {
    const connectionId = `e2e-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const connection = await mysql.createConnection({
      ...this.config.e2eTest,
      multipleStatements: true
    });
    
    this.connections.set(connectionId, connection);
    return connection;
  }

  /**
   * 释放数据库连接
   */
  async releaseConnection(connection) {
    try {
      await connection.end();
    } catch (error) {
      this.log(`⚠️ 释放数据库连接失败: ${error.message}`);
    }
    
    // 从连接池中移除
    for (const [id, conn] of this.connections) {
      if (conn === connection) {
        this.connections.delete(id);
        break;
      }
    }
  }

  /**
   * 获取所有表名
   */
  async getAllTables(connection) {
    const [tables] = await connection.execute(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
      [this.config.e2eTest.database]
    );
    
    return tables.map(t => t.TABLE_NAME);
  }

  /**
   * 插入表数据
   */
  async insertTableData(connection, tableName, rows) {
    if (rows.length === 0) return;
    
    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES (${placeholders})`;
    
    for (const row of rows) {
      const values = columns.map(col => row[col]);
      await connection.execute(sql, values);
    }
  }  /**
 
  * 保存快照到文件
   */
  async saveSnapshotToFile(snapshot) {
    const snapshotDir = join(rootDir, 'logs', 'snapshots');
    if (!existsSync(snapshotDir)) {
      mkdirSync(snapshotDir, { recursive: true });
    }
    
    const filePath = join(snapshotDir, `${snapshot.id}.json`);
    writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
  }

  /**
   * 从文件加载快照
   */
  async loadSnapshotFromFile(snapshotId) {
    const filePath = join(rootDir, 'logs', 'snapshots', `${snapshotId}.json`);
    
    if (!existsSync(filePath)) {
      return null;
    }
    
    try {
      const content = readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      this.log(`⚠️ 加载快照文件失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 执行SQL语句
   */
  async executeSQL(connection, sql, description) {
    try {
      this.log(`🔄 执行: ${description}`);
      const [results] = await connection.execute(sql);
      this.log(`✅ 完成: ${description}`);
      return results;
    } catch (error) {
      this.log(`❌ 失败: ${description} - ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 日志记录
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (this.config.logging.enabled) {
      console.log(logMessage);
    }
    
    // 写入日志文件
    try {
      const logEntry = `${logMessage}\n`;
      writeFileSync(this.config.logging.logFile, logEntry, { flag: 'a' });
    } catch (error) {
      // 忽略日志写入错误
    }
  }

  /**
   * 确保日志目录存在
   */
  ensureLogDirectory() {
    const logDir = dirname(this.config.logging.logFile);
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * 验证数据库环境
   */
  async verifyEnvironment() {
    this.log('🔍 验证E2E数据库环境...');
    
    try {
      // 测试数据库连接
      const connection = await this.getConnection();
      
      // 检查数据库连接
      await connection.execute('SELECT 1 as test');
      this.log('✅ 数据库连接正常');
      
      // 检查表结构
      const tables = await this.getAllTables(connection);
      
      const expectedTables = [
        'users', 'merchants', 'projects', 'venues', 'floors',
        'visitor_applications', 'passcodes', 'access_records',
        'permissions', 'user_permissions', 'merchant_permissions'
      ];
      
      const missingTables = expectedTables.filter(table => !tables.includes(table));
      
      if (missingTables.length > 0) {
        this.log(`⚠️ 缺少以下表: ${missingTables.join(', ')}`);
      } else {
        this.log('✅ 所有必需的表都存在');
      }
      
      await this.releaseConnection(connection);
      
      this.log('✅ E2E数据库环境验证完成');
      
      // 输出配置信息
      console.log('\n📋 E2E测试数据库配置:');
      console.log(`   主机: ${this.config.e2eTest.host}:${this.config.e2eTest.port}`);
      console.log(`   数据库: ${this.config.e2eTest.database}`);
      console.log(`   用户: ${this.config.e2eTest.user}`);
      console.log(`   表数量: ${tables.length}`);
      
      return true;
      
    } catch (error) {
      this.log(`❌ E2E数据库环境验证失败: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 销毁E2E数据库
   */
  async destroyE2EDatabase() {
    this.log('🗑️ 开始销毁E2E测试数据库...');
    
    const connection = await mysql.createConnection(this.config.admin);
    
    try {
      const dbName = this.config.e2eTest.database;
      const userName = this.config.e2eTest.user;
      const host = this.config.e2eTest.host;
      
      // 删除数据库
      await this.executeSQL(
        connection,
        `DROP DATABASE IF EXISTS \`${dbName}\``,
        `删除E2E测试数据库: ${dbName}`
      );
      
      // 删除用户（可选）
      try {
        await this.executeSQL(
          connection,
          `DROP USER IF EXISTS '${userName}'@'${host}'`,
          `删除E2E测试用户: ${userName}`
        );
      } catch (error) {
        this.log(`⚠️ 删除用户失败（可能不存在或被其他数据库使用）: ${error.message}`);
      }
      
      this.log('✅ E2E测试数据库销毁完成');
      
    } finally {
      await connection.end();
    }
  }
}/**
 * 
主函数
 */
async function main() {
  const command = process.argv[2] || 'init';
  const options = {
    verbose: !process.argv.includes('--quiet'),
    snapshotEnabled: !process.argv.includes('--no-snapshot'),
    autoCleanup: !process.argv.includes('--no-cleanup'),
  };
  
  const manager = new E2EDatabaseManager(options);
  
  try {
    switch (command) {
      case 'init':
        console.log('🚀 开始初始化E2E测试数据库环境...');
        await manager.createE2EDatabase();
        await manager.initializeTestData();
        await manager.verifyEnvironment();
        console.log('🎉 E2E测试数据库环境初始化完成！');
        break;
        
      case 'reset':
        console.log('🔄 开始重置E2E测试数据库环境...');
        await manager.destroyE2EDatabase();
        await manager.createE2EDatabase();
        await manager.initializeTestData();
        await manager.verifyEnvironment();
        console.log('🎉 E2E测试数据库环境重置完成！');
        break;
        
      case 'clean':
        await manager.cleanupTestData();
        console.log('🎉 E2E测试数据库清理完成！');
        break;
        
      case 'destroy':
        await manager.destroyE2EDatabase();
        console.log('🎉 E2E测试数据库销毁完成！');
        break;
        
      case 'verify':
        await manager.verifyEnvironment();
        break;
        
      case 'snapshot':
        const snapshotId = process.argv[3] || `snapshot-${Date.now()}`;
        const description = process.argv[4] || '手动创建的快照';
        await manager.createSnapshot(snapshotId, description);
        console.log(`🎉 快照创建完成: ${snapshotId}`);
        break;
        
      case 'restore':
        const restoreId = process.argv[3];
        if (!restoreId) {
          console.error('❌ 请指定要恢复的快照ID');
          process.exit(1);
        }
        await manager.restoreSnapshot(restoreId);
        console.log(`🎉 快照恢复完成: ${restoreId}`);
        break;
        
      case 'session-start':
        const sessionId = process.argv[3] || `session-${Date.now()}`;
        await manager.startTestSession(sessionId);
        console.log(`🎉 测试会话开始: ${sessionId}`);
        break;
        
      case 'session-end':
        const endSessionId = process.argv[3];
        if (!endSessionId) {
          console.error('❌ 请指定要结束的会话ID');
          process.exit(1);
        }
        const cleanup = !process.argv.includes('--no-cleanup');
        await manager.endTestSession(endSessionId, cleanup);
        console.log(`🎉 测试会话结束: ${endSessionId}`);
        break;
        
      default:
        console.log('❌ 未知命令:', command);
        console.log('可用命令:');
        console.log('  init              - 初始化E2E测试数据库环境');
        console.log('  reset             - 重置E2E测试数据库环境');
        console.log('  clean             - 清理E2E测试数据库数据');
        console.log('  destroy           - 销毁E2E测试数据库');
        console.log('  verify            - 验证E2E测试数据库环境');
        console.log('  snapshot <id>     - 创建数据快照');
        console.log('  restore <id>      - 恢复数据快照');
        console.log('  session-start <id> - 开始测试会话');
        console.log('  session-end <id>   - 结束测试会话');
        console.log('');
        console.log('选项:');
        console.log('  --quiet           - 静默模式');
        console.log('  --no-snapshot     - 禁用快照功能');
        console.log('  --no-cleanup      - 禁用自动清理');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    console.error('💡 请检查:');
    console.error('   1. MySQL服务是否运行');
    console.error('   2. 数据库配置是否正确');
    console.error('   3. 网络连接是否正常');
    console.error('   4. 环境变量是否正确设置');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { E2EDatabaseManager };