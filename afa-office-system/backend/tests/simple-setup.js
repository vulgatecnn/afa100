/**
 * 简化的测试环境设置
 * 修复数据库连接池初始化问题
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import mysql from 'mysql2/promise';

/**
 * 全局测试环境变量
 */
let testConnection = null;
let testDatabaseName = null;

/**
 * 生成唯一的测试数据库名称
 */
function generateTestDatabaseName() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test_db_${timestamp}_${random}`;
}

/**
 * 测试环境全局设置
 */
beforeAll(async () => {
  console.log('🚀 初始化简化测试环境...');
  
  try {
    // 设置测试环境变量
    process.env.NODE_ENV = 'test';
    process.env.DB_TYPE = 'mysql';

    // 创建管理员连接用于创建测试数据库
    const adminConnection = await mysql.createConnection({
      host: process.env.TEST_DB_HOST || '127.0.0.1',
      port: parseInt(process.env.TEST_DB_PORT || '3306'),
      user: process.env.MYSQL_ADMIN_USER || 'root',
      password: process.env.MYSQL_ADMIN_PASSWORD || '111111',
      multipleStatements: true
    });

    // 生成测试数据库名称
    testDatabaseName = generateTestDatabaseName();
    
    // 创建测试数据库
    await adminConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${testDatabaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`📁 创建测试数据库: ${testDatabaseName}`);
    
    await adminConnection.end();

    // 创建测试数据库连接 - 使用root用户确保有足够权限
    testConnection = await mysql.createConnection({
      host: process.env.TEST_DB_HOST || '127.0.0.1',
      port: parseInt(process.env.TEST_DB_PORT || '3306'),
      user: process.env.MYSQL_ADMIN_USER || 'root',
      password: process.env.MYSQL_ADMIN_PASSWORD || '111111',
      database: testDatabaseName,
      multipleStatements: true
    });

    // 验证连接
    await testConnection.ping();
    console.log('✅ MySQL测试数据库连接成功');

    // 创建基础表结构
    await createBasicTables();

    console.log('✅ 简化测试环境初始化完成');
  } catch (error) {
    console.error('❌ 简化测试环境初始化失败:', error);
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
  } catch (error) {
    console.error('❌ 测试数据清理失败:', error);
  }
});

/**
 * 全局清理
 */
afterAll(async () => {
  console.log('🧹 清理简化测试环境...');

  try {
    if (testConnection) {
      await testConnection.end();
      testConnection = null;
    }

    // 删除测试数据库
    if (testDatabaseName) {
      const adminConnection = await mysql.createConnection({
        host: process.env.TEST_DB_HOST || '127.0.0.1',
        port: parseInt(process.env.TEST_DB_PORT || '3306'),
        user: process.env.MYSQL_ADMIN_USER || 'root',
        password: process.env.MYSQL_ADMIN_PASSWORD || '111111'
      });

      await adminConnection.execute(`DROP DATABASE IF EXISTS \`${testDatabaseName}\``);
      console.log(`🗑️ 删除测试数据库: ${testDatabaseName}`);
      
      await adminConnection.end();
    }

    console.log('✅ 简化测试环境清理完成');
  } catch (error) {
    console.error('❌ 测试环境清理失败:', error);
  }
});

/**
 * 清理测试数据
 */
async function cleanupTestData() {
  if (!testConnection) return;

  try {
    // 禁用外键检查
    await testConnection.execute('SET FOREIGN_KEY_CHECKS = 0');

    // 清理所有表数据（按依赖关系顺序）
    const tables = [
      'access_records',
      'passcodes', 
      'visitor_applications',
      'users',
      'spaces',
      'merchants',
      'permissions'
    ];

    for (const table of tables) {
      try {
        await testConnection.execute(`DELETE FROM ${table}`);
        await testConnection.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
      } catch (error) {
        // 忽略表不存在的错误
        if (!error.message.includes('doesn\'t exist')) {
          console.warn(`清理表 ${table} 时出错:`, error.message);
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
 * 创建基础表结构
 */
async function createBasicTables() {
  if (!testConnection) return;

  try {
    console.log('🔧 创建基础表结构...');

    // 用户表
    await testConnection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL COMMENT '用户姓名',
        email VARCHAR(255) UNIQUE NOT NULL COMMENT '邮箱地址',
        phone VARCHAR(20) COMMENT '手机号码',
        password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
        user_type ENUM('tenant_admin', 'merchant_admin', 'merchant_employee') NOT NULL COMMENT '用户类型',
        status ENUM('active', 'inactive', 'pending') DEFAULT 'pending' COMMENT '用户状态',
        merchant_id INT NULL COMMENT '所属商户ID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_email (email),
        INDEX idx_user_type (user_type),
        INDEX idx_merchant_id (merchant_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表'
    `);

    // 商户表
    await testConnection.execute(`
      CREATE TABLE IF NOT EXISTS merchants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL COMMENT '商户名称',
        code VARCHAR(50) UNIQUE NOT NULL COMMENT '商户编码',
        contact VARCHAR(100) COMMENT '联系人',
        phone VARCHAR(20) COMMENT '联系电话',
        email VARCHAR(255) COMMENT '联系邮箱',
        address TEXT COMMENT '地址',
        status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '商户状态',
        settings JSON COMMENT '商户配置信息',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
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

    console.log('✅ 基础表结构创建完成');
  } catch (error) {
    console.error('❌ 创建基础表结构失败:', error);
    throw error;
  }
}

/**
 * 获取测试数据库连接
 */
export function getTestConnection() {
  if (!testConnection) {
    throw new Error('测试数据库连接未初始化');
  }
  return testConnection;
}

/**
 * 获取测试数据库名称
 */
export function getTestDatabaseName() {
  return testDatabaseName;
}

/**
 * 执行测试SQL
 */
export async function executeTestSQL(sql, params = []) {
  const connection = getTestConnection();
  const [results] = await connection.execute(sql, params);
  return results;
}

/**
 * 插入测试数据
 */
export async function insertTestData(table, data) {
  const connection = getTestConnection();
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map(() => '?').join(', ');
  
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
  const [result] = await connection.execute(sql, values);
  
  return result.insertId;
}

/**
 * 查询测试数据
 */
export async function queryTestData(sql, params = []) {
  const connection = getTestConnection();
  const [rows] = await connection.execute(sql, params);
  return rows;
}