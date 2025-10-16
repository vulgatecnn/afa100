#!/usr/bin/env node

/**
 * 修复MySQL连接问题的脚本
 * 用于CI/CD环境中解决数据库用户权限和表结构问题
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 从环境变量获取数据库配置
const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: 'root',
  password: process.env.MYSQL_ROOT_PASSWORD || 'test_password',
  database: process.env.MYSQL_DATABASE || 'afa_office_test',
  testUser: process.env.MYSQL_USER || 'afa_test',
  testPassword: process.env.MYSQL_PASSWORD || 'test_password'
};

console.log('🔧 开始修复MySQL连接问题...');
console.log('配置信息:', {
  host: config.host,
  port: config.port,
  database: config.database,
  testUser: config.testUser
});

async function fixMySQLConnection() {
  let connection;
  
  try {
    // 1. 连接到MySQL服务器（不指定数据库）
    console.log('📡 连接到MySQL服务器...');
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: 'root',
      password: config.password
    });
    
    console.log('✅ 成功连接到MySQL服务器');
    
    // 2. 创建数据库（如果不存在）
    console.log('🗄️ 创建测试数据库...');
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ 数据库 ${config.database} 已创建或已存在`);
    
    // 3. 创建测试用户并授权
    console.log('👤 创建测试用户并授权...');
    
    // 删除可能存在的用户（避免冲突）
    try {
      await connection.execute(`DROP USER IF EXISTS '${config.testUser}'@'%'`);
      await connection.execute(`DROP USER IF EXISTS '${config.testUser}'@'localhost'`);
    } catch (err) {
      console.log('ℹ️ 清理旧用户时出现预期错误（可忽略）');
    }
    
    // 创建新用户
    await connection.execute(`CREATE USER '${config.testUser}'@'%' IDENTIFIED BY '${config.testPassword}'`);
    await connection.execute(`CREATE USER '${config.testUser}'@'localhost' IDENTIFIED BY '${config.testPassword}'`);
    
    // 授予权限
    await connection.execute(`GRANT ALL PRIVILEGES ON \`${config.database}\`.* TO '${config.testUser}'@'%'`);
    await connection.execute(`GRANT ALL PRIVILEGES ON \`${config.database}\`.* TO '${config.testUser}'@'localhost'`);
    
    // 刷新权限
    await connection.execute('FLUSH PRIVILEGES');
    
    console.log(`✅ 用户 ${config.testUser} 已创建并授权`);
    
    // 4. 切换到测试数据库
    await connection.execute(`USE \`${config.database}\``);
    
    // 5. 执行数据库表结构
    console.log('📋 创建数据库表结构...');
    
    const schemaPath = path.join(__dirname, '../afa-office-system/backend/database/mysql-test-schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // 分割SQL语句并执行
      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        try {
          await connection.execute(statement);
        } catch (err) {
          console.log(`⚠️ 执行SQL语句时出现错误（可能是重复创建）: ${err.message}`);
        }
      }
      
      console.log('✅ 数据库表结构创建完成');
    } else {
      console.log('⚠️ 未找到数据库表结构文件，跳过表创建');
    }
    
    // 6. 验证连接
    console.log('🔍 验证数据库连接...');
    
    // 关闭root连接
    await connection.end();
    
    // 使用测试用户连接
    const testConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.testUser,
      password: config.testPassword,
      database: config.database
    });
    
    // 测试查询
    const [rows] = await testConnection.execute('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = ?', [config.database]);
    console.log(`✅ 测试用户连接成功，数据库中有 ${rows[0].table_count} 个表`);
    
    // 列出所有表
    const [tables] = await testConnection.execute('SHOW TABLES');
    console.log('📋 数据库表列表:');
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${Object.values(table)[0]}`);
    });
    
    await testConnection.end();
    
    console.log('🎉 MySQL连接问题修复完成！');
    
  } catch (error) {
    console.error('❌ 修复MySQL连接时出错:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        // 忽略关闭连接时的错误
      }
    }
  }
}

// 运行修复脚本
fixMySQLConnection().catch(console.error);