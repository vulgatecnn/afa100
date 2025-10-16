/**
 * 简化的MySQL测试环境设置
 * 专门用于后端单元测试，确保80%覆盖率
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import mysql from 'mysql2/promise';
import { Database } from '../src/utils/database.js';

/**
 * 全局测试环境变量
 */
let testConnection: mysql.Connection | null = null;
let testDatabase: Database | null = null;

/**
 * 测试环境全局设置
 */
beforeAll(async () => {
  console.log('🚀 初始化MySQL测试环境...');
  
  try {
    // 创建测试数据库连接
    testConnection = await mysql.createConnection({
      host: process.env.TEST_DB_HOST || '127.0.0.1',
      port: parseInt(process.env.TEST_DB_PORT || '3306'),
      user: process.env.TEST_DB_USER || process.env.MYSQL_USER || 'afa_test',
      password: process.env.TEST_DB_PASSWORD || process.env.MYSQL_PASSWORD || 'test_password',
      database: process.env.TEST_DB_NAME || 'afa_office_test',
      multipleStatements: true
    });

    // 验证连接
    await testConnection.ping();
    console.log('✅ MySQL测试数据库连接成功');

    // 创建必要的表结构
    await createTestTables();

    // 初始化Database实例
    testDatabase = Database.getInstance();
    
    // 设置测试环境
    process.env.NODE_ENV = 'test';
    process.env.DB_TYPE = 'mysql';

    console.log('✅ MySQL测试环境初始化完成');
  } catch (error) {
    console.error('❌ MySQL测试环境初始化失败:', error);
    throw error;
  }
});

/**
 * 每个测试前的设置
 */
beforeEach(async () => {
  if (!testConnection) {
    throw new Error('测试数据库连接未初始化');
  }

  try {
    // 清理测试数据
    await cleanupTestData();
    
    // 重置自增ID
    await resetAutoIncrement();
    
    console.log('🔧 测试数据准备完成');
  } catch (error) {
    console.error('❌ 测试数据准备失败:', error);
    throw error;
  }
});

/**
 * 每个测试后的清理
 */
afterEach(async () => {
  if (!testConnection) return;

  try {
    // 清理测试数据
    await cleanupTestData();
    console.log('🧹 测试数据清理完成');
  } catch (error) {
    console.error('❌ 测试数据清理失败:', error);
  }
});

/**
 * 全局清理
 */
afterAll(async () => {
  console.log('🧹 清理MySQL测试环境...');

  try {
    if (testConnection) {
      await testConnection.end();
      testConnection = null;
    }
    
    if (testDatabase) {
      await testDatabase.close();
      testDatabase = null;
    }

    console.log('✅ MySQL测试环境清理完成');
  } catch (error) {
    console.error('❌ 测试环境清理失败:', error);
  }
});

/**
 * 清理测试数据
 */
async function cleanupTestData(): Promise<void> {
  if (!testConnection) return;

  try {
    // 禁用外键检查
    await testConnection.execute('SET FOREIGN_KEY_CHECKS = 0');

    // 清理所有表数据（按依赖关系顺序）
    const tables = [
      'access_records',
      'passcodes', 
      'visitor_applications',
      'merchant_employees',
      'users',
      'spaces',
      'merchants',
      'permissions',
      'user_roles'
    ];

    for (const table of tables) {
      try {
        await testConnection.execute(`DELETE FROM ${table}`);
      } catch (error) {
        // 忽略表不存在的错误
        if (!(error as any).message.includes('doesn\'t exist')) {
          console.warn(`清理表 ${table} 时出错:`, error);
        }
      }
    }

    // 重新启用外键检查
    await testConnection.execute('SET FOREIGN_KEY_CHECKS = 1');
  } catch (error) {
    console.error('清理测试数据失败:', error);
    throw error;
  }
}

/**
 * 重置自增ID
 */
async function resetAutoIncrement(): Promise<void> {
  if (!testConnection) return;

  try {
    const tables = [
      'users', 'merchants', 'spaces', 'visitor_applications', 
      'passcodes', 'access_records', 'permissions', 'user_roles'
    ];

    for (const table of tables) {
      try {
        await testConnection.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
      } catch (error) {
        // 忽略表不存在的错误
        if (!(error as any).message.includes('doesn\'t exist')) {
          console.warn(`重置表 ${table} 自增ID时出错:`, error);
        }
      }
    }
  } catch (error) {
    console.error('重置自增ID失败:', error);
  }
}

/**
 * 获取测试数据库连接
 */
export function getTestConnection(): mysql.Connection {
  if (!testConnection) {
    throw new Error('测试数据库连接未初始化');
  }
  return testConnection;
}

/**
 * 获取测试数据库实例
 */
export function getTestDatabase(): Database {
  if (!testDatabase) {
    throw new Error('测试数据库实例未初始化');
  }
  return testDatabase;
}

/**
 * 执行测试SQL
 */
export async function executeTestSQL(sql: string, params: any[] = []): Promise<any> {
  const connection = getTestConnection();
  const [results] = await connection.execute(sql, params);
  return results;
}

/**
 * 插入测试数据
 */
export async function insertTestData(table: string, data: Record<string, any>): Promise<number> {
  const connection = getTestConnection();
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map(() => '?').join(', ');
  
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
  const [result] = await connection.execute(sql, values);
  
  return (result as any).insertId;
}

/**
 * 查询测试数据
 */
export async function queryTestData(sql: string, params: any[] = []): Promise<any[]> {
  const connection = getTestConnection();
  const [rows] = await connection.execute(sql, params);
  return rows as any[];
}

/**
 * 创建测试表结构
 */
async function createTestTables(): Promise<void> {
  if (!testConnection) return;

  try {
    console.log('🔧 创建测试表结构...');

    // 用户表
    await testConnection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        open_id VARCHAR(255) UNIQUE,
        union_id VARCHAR(255),
        phone VARCHAR(20),
        name VARCHAR(100) NOT NULL,
        avatar TEXT,
        user_type ENUM('tenant_admin', 'merchant_admin', 'employee', 'visitor') NOT NULL,
        role VARCHAR(50),
        status ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT 'active',
        permissions JSON,
        merchant_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_merchant_id (merchant_id),
        INDEX idx_user_type (user_type),
        INDEX idx_status (status),
        INDEX idx_open_id (open_id),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表'
    `);

    // 商户表
    await testConnection.execute(`
      CREATE TABLE IF NOT EXISTS merchants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        contact VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        settings JSON,
        subscription JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_code (code),
        INDEX idx_status (status),
        INDEX idx_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商户表'
    `);

    // 空间表
    await testConnection.execute(`
      CREATE TABLE IF NOT EXISTS spaces (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL COMMENT '空间名称',
        type ENUM('project', 'venue', 'floor', 'room') NOT NULL COMMENT '空间类型',
        code VARCHAR(50) UNIQUE NOT NULL COMMENT '空间编码',
        parent_id INT NULL COMMENT '父级空间ID',
        status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '空间状态',
        description TEXT COMMENT '空间描述',
        capacity INT COMMENT '容量',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_type (type),
        INDEX idx_parent_id (parent_id),
        INDEX idx_status (status),
        INDEX idx_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='空间表'
    `);

    // 访客申请表
    await testConnection.execute(`
      CREATE TABLE IF NOT EXISTS visitor_applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        visitor_name VARCHAR(100) NOT NULL COMMENT '访客姓名',
        phone VARCHAR(20) NOT NULL COMMENT '访客手机号',
        company VARCHAR(200) COMMENT '访客公司',
        purpose VARCHAR(500) NOT NULL COMMENT '访问目的',
        visit_date DATETIME NOT NULL COMMENT '访问日期',
        duration INT NOT NULL DEFAULT 1 COMMENT '访问时长（小时）',
        status ENUM('pending', 'approved', 'rejected', 'expired', 'used') DEFAULT 'pending' COMMENT '申请状态',
        qr_code VARCHAR(255) COMMENT '二维码数据',
        merchant_id INT NOT NULL COMMENT '被访问商户ID',
        applicant_id INT NOT NULL COMMENT '申请人ID（商户员工）',
        approved_by INT NULL COMMENT '审批人ID',
        rejected_reason VARCHAR(500) COMMENT '拒绝原因',
        usage_count INT DEFAULT 0 COMMENT '使用次数',
        max_usage INT DEFAULT 1 COMMENT '最大使用次数',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_status (status),
        INDEX idx_merchant_id (merchant_id),
        INDEX idx_applicant_id (applicant_id),
        INDEX idx_visit_date (visit_date),
        INDEX idx_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='访客申请表'
    `);

    // 通行码表
    await testConnection.execute(`
      CREATE TABLE IF NOT EXISTS passcodes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(64) UNIQUE NOT NULL COMMENT '通行码',
        user_id INT NOT NULL COMMENT '用户ID',
        type ENUM('employee', 'visitor') NOT NULL COMMENT '通行码类型',
        status ENUM('active', 'expired', 'used', 'disabled') DEFAULT 'active' COMMENT '通行码状态',
        valid_from DATETIME NOT NULL COMMENT '有效开始时间',
        valid_until DATETIME NOT NULL COMMENT '有效结束时间',
        usage_count INT DEFAULT 0 COMMENT '使用次数',
        max_usage INT DEFAULT 1 COMMENT '最大使用次数',
        qr_code_data TEXT COMMENT '二维码数据',
        visitor_application_id INT NULL COMMENT '关联的访客申请ID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_code (code),
        INDEX idx_user_id (user_id),
        INDEX idx_type (type),
        INDEX idx_status (status),
        INDEX idx_valid_period (valid_from, valid_until)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通行码表'
    `);

    // 通行记录表
    await testConnection.execute(`
      CREATE TABLE IF NOT EXISTS access_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        passcode_id INT NOT NULL COMMENT '通行码ID',
        device_id VARCHAR(100) NOT NULL COMMENT '设备ID',
        location VARCHAR(200) NOT NULL COMMENT '通行位置',
        result ENUM('success', 'failed', 'denied') NOT NULL COMMENT '通行结果',
        failure_reason VARCHAR(500) COMMENT '失败原因',
        access_time DATETIME NOT NULL COMMENT '通行时间',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
        INDEX idx_user_id (user_id),
        INDEX idx_passcode_id (passcode_id),
        INDEX idx_device_id (device_id),
        INDEX idx_result (result),
        INDEX idx_access_time (access_time),
        INDEX idx_location (location)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通行记录表'
    `);

    // 权限表
    await testConnection.execute(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL COMMENT '权限名称',
        description VARCHAR(500) COMMENT '权限描述',
        resource VARCHAR(100) NOT NULL COMMENT '资源名称',
        action VARCHAR(50) NOT NULL COMMENT '操作名称',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        INDEX idx_resource_action (resource, action)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表'
    `);

    // 用户权限关联表
    await testConnection.execute(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        permission_id INT NOT NULL COMMENT '权限ID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        UNIQUE KEY uk_user_permission (user_id, permission_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户权限关联表'
    `);

    console.log('✅ 测试表结构创建完成');
  } catch (error) {
    console.error('❌ 创建测试表结构失败:', error);
    throw error;
  }
}