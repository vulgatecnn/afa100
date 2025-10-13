#!/usr/bin/env node

/**
 * 集成测试数据库初始化脚本
 * 专门用于初始化集成测试环境的数据库
 * 
 * 使用方法：
 * - node scripts/init-integration-test-db.js init - 初始化集成测试数据库
 * - node scripts/init-integration-test-db.js reset - 重置集成测试数据库
 * - node scripts/init-integration-test-db.js clean - 清理集成测试数据库
 * - node scripts/init-integration-test-db.js verify - 验证数据库环境
 */

import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库配置
const adminConfig = {
  host: process.env.MYSQL_ADMIN_HOST || process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_ADMIN_PORT || process.env.DB_PORT || '3306'),
  user: process.env.MYSQL_ADMIN_USER || 'root',
  password: process.env.MYSQL_ADMIN_PASSWORD || process.env.DB_ROOT_PASSWORD || process.env.MYSQL_ROOT_PASSWORD || 'test_password',
  multipleStatements: true
};

const integrationTestConfig = {
  host: process.env.INTEGRATION_TEST_DB_HOST || process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.INTEGRATION_TEST_DB_PORT || process.env.DB_PORT || '3306'),
  user: process.env.INTEGRATION_TEST_DB_USER || process.env.DB_USER || process.env.MYSQL_USER || 'afa_test',
  password: process.env.INTEGRATION_TEST_DB_PASSWORD || process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || 'test_password',
  database: process.env.INTEGRATION_TEST_DB_NAME || process.env.DB_NAME || process.env.MYSQL_DATABASE || 'afa_office_test'
};

/**
 * 读取SQL文件
 */
async function readSQLFile(filename) {
  const filePath = path.join(__dirname, filename);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    console.error(`❌ 读取SQL文件失败: ${filename}`, error.message);
    throw error;
  }
}

/**
 * 执行SQL语句
 */
async function executeSQL(connection, sql, description) {
  try {
    console.log(`🔄 执行: ${description}`);
    const [results] = await connection.execute(sql);
    console.log(`✅ 完成: ${description}`);
    return results;
  } catch (error) {
    console.error(`❌ 失败: ${description}`, error.message);
    throw error;
  }
}

/**
 * 创建集成测试数据库和用户
 */
async function createIntegrationTestDatabase() {
  console.log('🚀 开始创建集成测试数据库和用户...');
  
  const connection = await mysql.createConnection(adminConfig);
  
  try {
    const dbName = integrationTestConfig.database;
    const userName = integrationTestConfig.user;
    const password = integrationTestConfig.password;
    const host = integrationTestConfig.host;
    
    // 创建数据库
    await executeSQL(
      connection, 
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      `创建集成测试数据库: ${dbName}`
    );
    
    // 创建用户（如果不存在）
    await executeSQL(
      connection,
      `CREATE USER IF NOT EXISTS '${userName}'@'${host}' IDENTIFIED BY '${password}'`,
      `创建集成测试用户: ${userName}`
    );
    
    // 授予权限
    await executeSQL(
      connection,
      `GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${userName}'@'${host}'`,
      `授予数据库权限给用户: ${userName}`
    );
    
    // 刷新权限
    await executeSQL(connection, 'FLUSH PRIVILEGES', '刷新权限');
    
    console.log('✅ 集成测试数据库和用户创建完成');
  } finally {
    await connection.end();
  }
}

/**
 * 创建集成测试表结构
 */
async function createIntegrationTestTables() {
  console.log('🔄 开始创建集成测试表结构...');
  
  const connection = await mysql.createConnection({
    ...integrationTestConfig,
    multipleStatements: true
  });
  
  try {
    // 先删除已存在的表（按依赖关系逆序）
    const dropTables = [
      'merchant_permissions',
      'user_permissions', 
      'access_records',
      'passcodes',
      'visitor_applications',
      'floors',
      'venues',
      'projects',
      'users',
      'merchants',
      'permissions'
    ];

    console.log('🗑️ 删除已存在的表...');
    await executeSQL(connection, 'SET FOREIGN_KEY_CHECKS = 0', '禁用外键检查');
    
    for (const table of dropTables) {
      try {
        await executeSQL(connection, `DROP TABLE IF EXISTS \`${table}\``, `删除表: ${table}`);
      } catch (error) {
        console.warn(`⚠️ 删除表 ${table} 失败（可能不存在）:`, error.message);
      }
    }
    
    await executeSQL(connection, 'SET FOREIGN_KEY_CHECKS = 1', '启用外键检查');

    // 创建表结构
    console.log('📋 创建表结构...');
    
    // 权限表
    await executeSQL(connection, `
      CREATE TABLE \`permissions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`code\` VARCHAR(100) UNIQUE NOT NULL COMMENT '权限代码',
        \`name\` VARCHAR(200) NOT NULL COMMENT '权限名称',
        \`description\` VARCHAR(500) COMMENT '权限描述',
        \`resource_type\` ENUM('project', 'venue', 'floor') NOT NULL COMMENT '资源类型',
        \`resource_id\` INT NOT NULL COMMENT '资源ID',
        \`actions\` JSON NOT NULL COMMENT '允许的操作',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        INDEX \`idx_code\` (\`code\`),
        INDEX \`idx_resource\` (\`resource_type\`, \`resource_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表'
    `, '创建权限表');

    // 商户表
    await executeSQL(connection, `
      CREATE TABLE \`merchants\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(200) NOT NULL COMMENT '商户名称',
        \`code\` VARCHAR(50) UNIQUE NOT NULL COMMENT '商户编码',
        \`contact\` VARCHAR(100) COMMENT '联系人',
        \`phone\` VARCHAR(20) COMMENT '联系电话',
        \`email\` VARCHAR(255) COMMENT '联系邮箱',
        \`address\` VARCHAR(500) COMMENT '地址',
        \`status\` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '商户状态',
        \`settings\` JSON COMMENT '商户配置信息',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX \`idx_code\` (\`code\`),
        INDEX \`idx_status\` (\`status\`),
        INDEX \`idx_name\` (\`name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商户表'
    `, '创建商户表');

    // 用户表
    await executeSQL(connection, `
      CREATE TABLE \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL COMMENT '用户姓名',
        \`phone\` VARCHAR(20) UNIQUE COMMENT '手机号码',
        \`open_id\` VARCHAR(100) UNIQUE COMMENT '微信OpenID',
        \`union_id\` VARCHAR(100) COMMENT '微信UnionID',
        \`avatar\` VARCHAR(500) COMMENT '头像URL',
        \`user_type\` ENUM('tenant_admin', 'merchant_admin', 'employee', 'visitor') NOT NULL COMMENT '用户类型',
        \`status\` ENUM('active', 'inactive', 'pending') DEFAULT 'active' COMMENT '用户状态',
        \`merchant_id\` INT NULL COMMENT '所属商户ID',
        \`password\` VARCHAR(255) COMMENT '密码（可选，主要用于管理员）',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX \`idx_phone\` (\`phone\`),
        INDEX \`idx_open_id\` (\`open_id\`),
        INDEX \`idx_user_type\` (\`user_type\`),
        INDEX \`idx_merchant_id\` (\`merchant_id\`),
        INDEX \`idx_status\` (\`status\`),
        FOREIGN KEY (\`merchant_id\`) REFERENCES \`merchants\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表'
    `, '创建用户表');

    // 项目表
    await executeSQL(connection, `
      CREATE TABLE \`projects\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`code\` VARCHAR(50) UNIQUE NOT NULL COMMENT '项目编码',
        \`name\` VARCHAR(200) NOT NULL COMMENT '项目名称',
        \`description\` TEXT COMMENT '项目描述',
        \`status\` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '项目状态',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX \`idx_code\` (\`code\`),
        INDEX \`idx_status\` (\`status\`),
        INDEX \`idx_name\` (\`name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目表'
    `, '创建项目表');

    // 场地表
    await executeSQL(connection, `
      CREATE TABLE \`venues\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`project_id\` INT NOT NULL COMMENT '所属项目ID',
        \`code\` VARCHAR(50) UNIQUE NOT NULL COMMENT '场地编码',
        \`name\` VARCHAR(200) NOT NULL COMMENT '场地名称',
        \`description\` TEXT COMMENT '场地描述',
        \`status\` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '场地状态',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX \`idx_project_id\` (\`project_id\`),
        INDEX \`idx_code\` (\`code\`),
        INDEX \`idx_status\` (\`status\`),
        INDEX \`idx_name\` (\`name\`),
        FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='场地表'
    `, '创建场地表');

    // 楼层表
    await executeSQL(connection, `
      CREATE TABLE \`floors\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`venue_id\` INT NOT NULL COMMENT '所属场地ID',
        \`code\` VARCHAR(50) UNIQUE NOT NULL COMMENT '楼层编码',
        \`name\` VARCHAR(200) NOT NULL COMMENT '楼层名称',
        \`description\` TEXT COMMENT '楼层描述',
        \`status\` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '楼层状态',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX \`idx_venue_id\` (\`venue_id\`),
        INDEX \`idx_code\` (\`code\`),
        INDEX \`idx_status\` (\`status\`),
        INDEX \`idx_name\` (\`name\`),
        FOREIGN KEY (\`venue_id\`) REFERENCES \`venues\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='楼层表'
    `, '创建楼层表');

    // 访客申请表
    await executeSQL(connection, `
      CREATE TABLE \`visitor_applications\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`applicant_id\` INT NOT NULL COMMENT '申请人ID',
        \`merchant_id\` INT NOT NULL COMMENT '被访问商户ID',
        \`visitee_id\` INT COMMENT '被访问人ID',
        \`visitor_name\` VARCHAR(100) NOT NULL COMMENT '访客姓名',
        \`visitor_phone\` VARCHAR(20) NOT NULL COMMENT '访客手机号',
        \`visitor_company\` VARCHAR(200) COMMENT '访客公司',
        \`visit_purpose\` VARCHAR(500) NOT NULL COMMENT '访问目的',
        \`visit_type\` VARCHAR(50) COMMENT '访问类型',
        \`scheduled_time\` DATETIME NOT NULL COMMENT '预约时间',
        \`duration\` INT NOT NULL DEFAULT 1 COMMENT '访问时长（小时）',
        \`status\` ENUM('pending', 'approved', 'rejected', 'expired', 'completed') DEFAULT 'pending' COMMENT '申请状态',
        \`approved_by\` INT NULL COMMENT '审批人ID',
        \`approved_at\` DATETIME NULL COMMENT '审批时间',
        \`rejection_reason\` VARCHAR(500) COMMENT '拒绝原因',
        \`passcode\` VARCHAR(100) COMMENT '通行码',
        \`passcode_expiry\` DATETIME COMMENT '通行码过期时间',
        \`usage_limit\` INT DEFAULT 1 COMMENT '使用次数限制',
        \`usage_count\` INT DEFAULT 0 COMMENT '已使用次数',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX \`idx_applicant_id\` (\`applicant_id\`),
        INDEX \`idx_merchant_id\` (\`merchant_id\`),
        INDEX \`idx_visitee_id\` (\`visitee_id\`),
        INDEX \`idx_status\` (\`status\`),
        INDEX \`idx_scheduled_time\` (\`scheduled_time\`),
        INDEX \`idx_visitor_phone\` (\`visitor_phone\`),
        INDEX \`idx_passcode\` (\`passcode\`),
        FOREIGN KEY (\`applicant_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`merchant_id\`) REFERENCES \`merchants\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`visitee_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL,
        FOREIGN KEY (\`approved_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='访客申请表'
    `, '创建访客申请表');

    // 通行码表
    await executeSQL(connection, `
      CREATE TABLE \`passcodes\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL COMMENT '用户ID',
        \`code\` VARCHAR(100) UNIQUE NOT NULL COMMENT '通行码',
        \`type\` ENUM('employee', 'visitor') NOT NULL COMMENT '通行码类型',
        \`status\` ENUM('active', 'expired', 'revoked') DEFAULT 'active' COMMENT '通行码状态',
        \`expiry_time\` DATETIME COMMENT '过期时间',
        \`usage_limit\` INT DEFAULT 1 COMMENT '使用次数限制',
        \`usage_count\` INT DEFAULT 0 COMMENT '已使用次数',
        \`permissions\` JSON COMMENT '权限配置',
        \`application_id\` INT COMMENT '关联的申请ID',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX \`idx_user_id\` (\`user_id\`),
        INDEX \`idx_code\` (\`code\`),
        INDEX \`idx_type\` (\`type\`),
        INDEX \`idx_status\` (\`status\`),
        INDEX \`idx_expiry_time\` (\`expiry_time\`),
        INDEX \`idx_application_id\` (\`application_id\`),
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`application_id\`) REFERENCES \`visitor_applications\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通行码表'
    `, '创建通行码表');

    // 通行记录表
    await executeSQL(connection, `
      CREATE TABLE \`access_records\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL COMMENT '用户ID',
        \`passcode_id\` INT COMMENT '通行码ID',
        \`device_id\` VARCHAR(100) NOT NULL COMMENT '设备ID',
        \`device_type\` VARCHAR(50) COMMENT '设备类型',
        \`direction\` ENUM('in', 'out') NOT NULL COMMENT '通行方向',
        \`result\` ENUM('success', 'failed') NOT NULL COMMENT '通行结果',
        \`fail_reason\` VARCHAR(500) COMMENT '失败原因',
        \`project_id\` INT COMMENT '项目ID',
        \`venue_id\` INT COMMENT '场地ID',
        \`floor_id\` INT COMMENT '楼层ID',
        \`timestamp\` DATETIME NOT NULL COMMENT '通行时间',
        INDEX \`idx_user_id\` (\`user_id\`),
        INDEX \`idx_passcode_id\` (\`passcode_id\`),
        INDEX \`idx_device_id\` (\`device_id\`),
        INDEX \`idx_result\` (\`result\`),
        INDEX \`idx_timestamp\` (\`timestamp\`),
        INDEX \`idx_project_id\` (\`project_id\`),
        INDEX \`idx_venue_id\` (\`venue_id\`),
        INDEX \`idx_floor_id\` (\`floor_id\`),
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`passcode_id\`) REFERENCES \`passcodes\`(\`id\`) ON DELETE SET NULL,
        FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE SET NULL,
        FOREIGN KEY (\`venue_id\`) REFERENCES \`venues\`(\`id\`) ON DELETE SET NULL,
        FOREIGN KEY (\`floor_id\`) REFERENCES \`floors\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通行记录表'
    `, '创建通行记录表');

    // 用户权限关联表
    await executeSQL(connection, `
      CREATE TABLE \`user_permissions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL COMMENT '用户ID',
        \`permission_id\` INT NOT NULL COMMENT '权限ID',
        \`granted_by\` INT NOT NULL COMMENT '授权人ID',
        \`granted_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',
        UNIQUE KEY \`uk_user_permission\` (\`user_id\`, \`permission_id\`),
        INDEX \`idx_user_id\` (\`user_id\`),
        INDEX \`idx_permission_id\` (\`permission_id\`),
        INDEX \`idx_granted_by\` (\`granted_by\`),
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`permission_id\`) REFERENCES \`permissions\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`granted_by\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户权限关联表'
    `, '创建用户权限关联表');

    // 商户权限关联表
    await executeSQL(connection, `
      CREATE TABLE \`merchant_permissions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`merchant_id\` INT NOT NULL COMMENT '商户ID',
        \`permission_id\` INT NOT NULL COMMENT '权限ID',
        \`granted_by\` INT NOT NULL COMMENT '授权人ID',
        \`granted_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',
        UNIQUE KEY \`uk_merchant_permission\` (\`merchant_id\`, \`permission_id\`),
        INDEX \`idx_merchant_id\` (\`merchant_id\`),
        INDEX \`idx_permission_id\` (\`permission_id\`),
        INDEX \`idx_granted_by\` (\`granted_by\`),
        FOREIGN KEY (\`merchant_id\`) REFERENCES \`merchants\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`permission_id\`) REFERENCES \`permissions\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`granted_by\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商户权限关联表'
    `, '创建商户权限关联表');
    
    console.log('✅ 集成测试表结构创建完成');
  } finally {
    await connection.end();
  }
}

/**
 * 插入集成测试基础数据
 */
async function insertIntegrationTestData() {
  console.log('🔄 开始插入集成测试基础数据...');
  
  const connection = await mysql.createConnection(integrationTestConfig);
  
  try {
    // 插入基础权限数据
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
    
    console.log('✅ 集成测试基础数据插入完成');
  } finally {
    await connection.end();
  }
}

/**
 * 清理集成测试数据库
 */
async function cleanIntegrationTestDatabase() {
  console.log('🧹 开始清理集成测试数据库...');
  
  const connection = await mysql.createConnection(integrationTestConfig);
  
  try {
    // 获取所有表名
    const [tables] = await connection.execute(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
      [integrationTestConfig.database]
    );
    
    if (tables.length > 0) {
      // 禁用外键检查
      await executeSQL(connection, 'SET FOREIGN_KEY_CHECKS = 0', '禁用外键检查');
      
      // 清空所有表
      for (const table of tables) {
        const tableName = table.TABLE_NAME;
        await executeSQL(connection, `TRUNCATE TABLE \`${tableName}\``, `清空表: ${tableName}`);
      }
      
      // 重新启用外键检查
      await executeSQL(connection, 'SET FOREIGN_KEY_CHECKS = 1', '启用外键检查');
    }
    
    console.log('✅ 集成测试数据库清理完成');
  } finally {
    await connection.end();
  }
}

/**
 * 删除集成测试数据库
 */
async function dropIntegrationTestDatabase() {
  console.log('🗑️ 开始删除集成测试数据库...');
  
  const connection = await mysql.createConnection(adminConfig);
  
  try {
    const dbName = integrationTestConfig.database;
    const userName = integrationTestConfig.user;
    const host = integrationTestConfig.host;
    
    // 删除数据库
    await executeSQL(
      connection,
      `DROP DATABASE IF EXISTS \`${dbName}\``,
      `删除集成测试数据库: ${dbName}`
    );
    
    // 删除用户（可选，因为可能被其他数据库使用）
    try {
      await executeSQL(
        connection,
        `DROP USER IF EXISTS '${userName}'@'${host}'`,
        `删除集成测试用户: ${userName}`
      );
    } catch (error) {
      console.warn(`⚠️ 删除用户失败（可能不存在或被其他数据库使用）: ${error.message}`);
    }
    
    console.log('✅ 集成测试数据库删除完成');
  } finally {
    await connection.end();
  }
}

/**
 * 验证集成测试数据库环境
 */
async function verifyIntegrationTestEnvironment() {
  console.log('🔍 验证集成测试数据库环境...');
  
  try {
    // 测试数据库连接
    const connection = await mysql.createConnection(integrationTestConfig);
    
    // 检查数据库连接
    await connection.execute('SELECT 1 as test');
    console.log('✅ 数据库连接正常');
    
    // 检查表结构
    const [tables] = await connection.execute(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
      [integrationTestConfig.database]
    );
    
    const expectedTables = [
      'users', 'merchants', 'projects', 'venues', 'floors',
      'visitor_applications', 'passcodes', 'access_records',
      'permissions', 'user_permissions', 'merchant_permissions'
    ];
    
    const existingTables = tables.map(t => t.TABLE_NAME);
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.warn('⚠️ 缺少以下表:', missingTables.join(', '));
    } else {
      console.log('✅ 所有必需的表都存在');
    }
    
    // 检查权限数据
    const [permissions] = await connection.execute('SELECT COUNT(*) as count FROM permissions');
    console.log(`✅ 权限数据: ${permissions[0].count} 条记录`);
    
    await connection.end();
    
    console.log('✅ 集成测试数据库环境验证完成');
    
    // 输出配置信息
    console.log('\n📋 集成测试数据库配置:');
    console.log(`   主机: ${integrationTestConfig.host}:${integrationTestConfig.port}`);
    console.log(`   数据库: ${integrationTestConfig.database}`);
    console.log(`   用户: ${integrationTestConfig.user}`);
    console.log(`   表数量: ${existingTables.length}`);
    
  } catch (error) {
    console.error('❌ 集成测试数据库环境验证失败:', error.message);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  const command = process.argv[2] || 'init';
  
  try {
    switch (command) {
      case 'init':
        console.log('🚀 开始初始化集成测试数据库环境...');
        await createIntegrationTestDatabase();
        await createIntegrationTestTables();
        await insertIntegrationTestData();
        await verifyIntegrationTestEnvironment();
        console.log('🎉 集成测试数据库环境初始化完成！');
        break;
        
      case 'reset':
        console.log('🔄 开始重置集成测试数据库环境...');
        await dropIntegrationTestDatabase();
        await createIntegrationTestDatabase();
        await createIntegrationTestTables();
        await insertIntegrationTestData();
        await verifyIntegrationTestEnvironment();
        console.log('🎉 集成测试数据库环境重置完成！');
        break;
        
      case 'clean':
        await cleanIntegrationTestDatabase();
        console.log('🎉 集成测试数据库清理完成！');
        break;
        
      case 'drop':
        await dropIntegrationTestDatabase();
        console.log('🎉 集成测试数据库删除完成！');
        break;
        
      case 'verify':
        await verifyIntegrationTestEnvironment();
        break;
        
      default:
        console.log('❌ 未知命令:', command);
        console.log('可用命令:');
        console.log('  init   - 初始化集成测试数据库环境');
        console.log('  reset  - 重置集成测试数据库环境');
        console.log('  clean  - 清理集成测试数据库数据');
        console.log('  drop   - 删除集成测试数据库');
        console.log('  verify - 验证集成测试数据库环境');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    console.error('💡 请检查:');
    console.error('   1. MySQL服务是否运行');
    console.error('   2. 管理员账户配置是否正确');
    console.error('   3. 网络连接是否正常');
    console.error('   4. 环境变量是否正确设置');
    process.exit(1);
  }
}

// 运行主函数
main();