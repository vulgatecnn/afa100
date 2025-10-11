#!/usr/bin/env node

/**
 * AFA办公小程序数据库初始化脚本
 * 使用方法：
 * - pnpm db:init - 初始化数据库和表结构
 * - pnpm db:reset - 重置数据库（删除并重新创建）
 * - pnpm db:seed - 插入种子数据
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
  host: process.env.MYSQL_ADMIN_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_ADMIN_PORT || '3306'),
  user: process.env.MYSQL_ADMIN_USER || 'root',
  password: process.env.MYSQL_ADMIN_PASSWORD || '111111',
  multipleStatements: true
};

const appConfig = {
  host: process.env.APP_DB_HOST || '127.0.0.1',
  port: parseInt(process.env.APP_DB_PORT || '3306'),
  user: process.env.APP_DB_USER || 'afa_app_user',
  password: process.env.APP_DB_PASSWORD || 'afa_app_2024',
  database: process.env.APP_DB_NAME || 'afa_office'
};

const testConfig = {
  host: process.env.TEST_DB_HOST || '127.0.0.1',
  port: parseInt(process.env.TEST_DB_PORT || '3306'),
  user: process.env.TEST_DB_USER || 'afa_test_user',
  password: process.env.TEST_DB_PASSWORD || 'afa_test_2024',
  database: process.env.TEST_DB_NAME || 'afa_office_test'
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
 * 创建数据库和用户
 */
async function createDatabaseAndUsers() {
  console.log('🚀 开始创建数据库和用户...');
  
  const connection = await mysql.createConnection(adminConfig);
  
  try {
    const sql = await readSQLFile('create-database-and-users.sql');
    await executeSQL(connection, sql, '创建数据库和用户');
    
    console.log('✅ 数据库和用户创建完成');
  } finally {
    await connection.end();
  }
}

/**
 * 创建表结构
 */
async function createTables(config, dbName) {
  console.log(`🔄 开始创建 ${dbName} 数据库表结构...`);
  
  const connection = await mysql.createConnection(config);
  
  try {
    const sql = await readSQLFile('create-tables.sql');
    await executeSQL(connection, sql, `创建 ${dbName} 表结构`);
    
    console.log(`✅ ${dbName} 表结构创建完成`);
  } finally {
    await connection.end();
  }
}

/**
 * 插入初始数据
 */
async function insertInitialData(config, dbName) {
  console.log(`🔄 开始插入 ${dbName} 初始数据...`);
  
  const connection = await mysql.createConnection(config);
  
  try {
    // 插入默认权限
    const permissions = [
      ['user.create', '创建用户', 'user', 'create'],
      ['user.read', '查看用户', 'user', 'read'],
      ['user.update', '更新用户', 'user', 'update'],
      ['user.delete', '删除用户', 'user', 'delete'],
      ['merchant.create', '创建商户', 'merchant', 'create'],
      ['merchant.read', '查看商户', 'merchant', 'read'],
      ['merchant.update', '更新商户', 'merchant', 'update'],
      ['merchant.delete', '删除商户', 'merchant', 'delete'],
      ['space.create', '创建空间', 'space', 'create'],
      ['space.read', '查看空间', 'space', 'read'],
      ['space.update', '更新空间', 'space', 'update'],
      ['space.delete', '删除空间', 'space', 'delete'],
      ['visitor.create', '创建访客申请', 'visitor', 'create'],
      ['visitor.read', '查看访客申请', 'visitor', 'read'],
      ['visitor.update', '更新访客申请', 'visitor', 'update'],
      ['visitor.approve', '审批访客申请', 'visitor', 'approve'],
      ['access.read', '查看通行记录', 'access', 'read']
    ];
    
    for (const [name, description, resource, action] of permissions) {
      await connection.execute(
        'INSERT IGNORE INTO permissions (name, description, resource, action) VALUES (?, ?, ?, ?)',
        [name, description, resource, action]
      );
    }
    
    // 如果是应用数据库，插入默认管理员用户
    if (dbName === 'afa_office') {
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash('admin123456', 10);
      
      await connection.execute(`
        INSERT IGNORE INTO users (name, email, password_hash, user_type, status) 
        VALUES ('系统管理员', 'admin@afa-office.com', ?, 'tenant_admin', 'active')
      `, [passwordHash]);
      
      console.log('✅ 默认管理员用户已创建');
      console.log('   邮箱: admin@afa-office.com');
      console.log('   密码: admin123456');
    }
    
    console.log(`✅ ${dbName} 初始数据插入完成`);
  } finally {
    await connection.end();
  }
}

/**
 * 删除数据库
 */
async function dropDatabases() {
  console.log('🗑️  开始删除数据库...');
  
  const connection = await mysql.createConnection(adminConfig);
  
  try {
    await executeSQL(connection, 'DROP DATABASE IF EXISTS afa_office', '删除应用数据库');
    await executeSQL(connection, 'DROP DATABASE IF EXISTS afa_office_test', '删除测试数据库');
    
    console.log('✅ 数据库删除完成');
  } finally {
    await connection.end();
  }
}

/**
 * 测试数据库连接
 */
async function testConnections() {
  console.log('🔍 测试数据库连接...');
  
  try {
    // 测试应用数据库连接
    const appConnection = await mysql.createConnection(appConfig);
    await appConnection.execute('SELECT 1');
    await appConnection.end();
    console.log('✅ 应用数据库连接正常');
    
    // 测试测试数据库连接
    const testConnection = await mysql.createConnection(testConfig);
    await testConnection.execute('SELECT 1');
    await testConnection.end();
    console.log('✅ 测试数据库连接正常');
    
  } catch (error) {
    console.error('❌ 数据库连接测试失败:', error.message);
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
        console.log('🚀 开始初始化数据库...');
        await createDatabaseAndUsers();
        await createTables(appConfig, 'afa_office');
        await createTables(testConfig, 'afa_office_test');
        await insertInitialData(appConfig, 'afa_office');
        await insertInitialData(testConfig, 'afa_office_test');
        await testConnections();
        console.log('🎉 数据库初始化完成！');
        break;
        
      case 'reset':
        console.log('🔄 开始重置数据库...');
        await dropDatabases();
        await createDatabaseAndUsers();
        await createTables(appConfig, 'afa_office');
        await createTables(testConfig, 'afa_office_test');
        await insertInitialData(appConfig, 'afa_office');
        await insertInitialData(testConfig, 'afa_office_test');
        await testConnections();
        console.log('🎉 数据库重置完成！');
        break;
        
      case 'seed':
        console.log('🌱 开始插入种子数据...');
        await insertInitialData(appConfig, 'afa_office');
        await insertInitialData(testConfig, 'afa_office_test');
        console.log('🎉 种子数据插入完成！');
        break;
        
      case 'test':
        await testConnections();
        break;
        
      default:
        console.log('❌ 未知命令:', command);
        console.log('可用命令: init, reset, seed, test');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main();