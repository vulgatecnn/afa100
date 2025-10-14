#!/usr/bin/env node

/**
 * 修复MySQL数据库连接问题的脚本
 * 用于解决GitHub Actions中MySQL连接被拒绝的问题
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config({ path: './.env.test' });

async function fixMySQLConnection() {
  console.log('🔧 开始修复MySQL连接问题...');
  
  // GitHub Actions环境变量
  const mysqlConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.MYSQL_ADMIN_USER || process.env.DB_USER || 'root',
    password: process.env.MYSQL_ADMIN_PASSWORD || process.env.DB_PASSWORD || 'test_password',
    database: process.env.DB_NAME || 'afa_office_test'
  };
  
  const testUserConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.TEST_DB_USER || 'afa_test',
    password: process.env.TEST_DB_PASSWORD || 'test_password',
    database: process.env.TEST_DB_NAME || 'afa_office_test'
  };
  
  console.log('📋 管理员配置:', {
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    user: mysqlConfig.user,
    database: mysqlConfig.database
  });
  
  console.log('📋 测试用户配置:', {
    host: testUserConfig.host,
    port: testUserConfig.port,
    user: testUserConfig.user,
    database: testUserConfig.database
  });
  
  let adminConnection;
  let testConnection;
  
  try {
    // 1. 使用管理员账户连接
    console.log('🔗 尝试使用管理员账户连接...');
    adminConnection = await mysql.createConnection(mysqlConfig);
    console.log('✅ 管理员连接成功');
    
    // 2. 检查数据库是否存在
    console.log('🔍 检查测试数据库是否存在...');
    const [dbRows] = await adminConnection.execute(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [testUserConfig.database]
    );
    
    if (dbRows.length === 0) {
      console.log('📁 创建测试数据库...');
      await adminConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${testUserConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log('✅ 测试数据库创建成功');
    } else {
      console.log('✅ 测试数据库已存在');
    }
    
    // 3. 检查测试用户是否存在
    console.log('🔍 检查测试用户是否存在...');
    const [userRows] = await adminConnection.execute(
      'SELECT User FROM mysql.user WHERE User = ? AND Host = ?',
      [testUserConfig.user, '%']
    );
    
    if (userRows.length === 0) {
      console.log('👤 创建测试用户...');
      await adminConnection.execute(
        `CREATE USER IF NOT EXISTS '${testUserConfig.user}'@'%' IDENTIFIED BY '${testUserConfig.password}'`
      );
      console.log('✅ 测试用户创建成功');
    } else {
      console.log('✅ 测试用户已存在');
      // 更新密码
      console.log('🔑 更新测试用户密码...');
      await adminConnection.execute(
        `ALTER USER '${testUserConfig.user}'@'%' IDENTIFIED BY '${testUserConfig.password}'`
      );
      console.log('✅ 测试用户密码更新成功');
    }
    
    // 4. 授予测试用户权限
    console.log('🔓 授予测试用户权限...');
    await adminConnection.execute(
      `GRANT ALL PRIVILEGES ON \`${testUserConfig.database}\`.* TO '${testUserConfig.user}'@'%'`
    );
    await adminConnection.execute('FLUSH PRIVILEGES');
    console.log('✅ 测试用户权限授予成功');
    
    // 5. 验证测试用户连接
    console.log('🔗 验证测试用户连接...');
    testConnection = await mysql.createConnection(testUserConfig);
    await testConnection.ping();
    console.log('✅ 测试用户连接验证成功');
    
    // 6. 创建基础表结构
    console.log('🔧 创建基础表结构...');
    const schema = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      
      CREATE TABLE IF NOT EXISTS merchants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await testConnection.execute(schema);
    console.log('✅ 基础表结构创建成功');
    
    // 7. 插入测试数据
    console.log('📝 插入测试数据...');
    await testConnection.execute(
      "INSERT IGNORE INTO users (name, email) VALUES ('测试用户', 'test@example.com')"
    );
    await testConnection.execute(
      "INSERT IGNORE INTO merchants (name, code) VALUES ('测试商户', 'TEST001')"
    );
    console.log('✅ 测试数据插入成功');
    
    console.log('\n🎉 MySQL连接问题修复完成!');
    console.log('\n📋 修复摘要:');
    console.log('  - 管理员连接: ✅ 成功');
    console.log('  - 测试数据库: ✅ 已创建/验证');
    console.log('  - 测试用户: ✅ 已创建/更新');
    console.log('  - 用户权限: ✅ 已授予');
    console.log('  - 连接验证: ✅ 成功');
    console.log('  - 表结构: ✅ 已创建');
    console.log('  - 测试数据: ✅ 已插入');
    
  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error.message);
    console.error('错误代码:', error.code);
    console.error('错误编号:', error.errno);
    
    // 提供具体的解决建议
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 解决建议:');
      console.log('  1. 检查MySQL管理员账户和密码是否正确');
      console.log('  2. 确保管理员账户有CREATE USER权限');
      console.log('  3. 验证MySQL服务是否正在运行');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 解决建议:');
      console.log('  1. 检查MySQL服务是否正在运行');
      console.log('  2. 验证MySQL主机地址和端口是否正确');
      console.log('  3. 确保防火墙没有阻止连接');
    } else {
      console.log('\n💡 通用解决建议:');
      console.log('  1. 检查环境变量配置');
      console.log('  2. 验证MySQL服务状态');
      console.log('  3. 确认网络连接');
    }
    
    process.exit(1);
  } finally {
    // 关闭连接
    if (testConnection) {
      await testConnection.end();
    }
    if (adminConnection) {
      await adminConnection.end();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  fixMySQLConnection().catch(console.error);
}

module.exports = { fixMySQLConnection };