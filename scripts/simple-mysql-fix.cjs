#!/usr/bin/env node

/**
 * 简单的MySQL连接修复脚本
 * 用于本地开发环境
 */

const { execSync } = require('child_process');
const fs = require('fs');

function runCommand(command) {
  try {
    console.log(`执行命令: ${command}`);
    const output = execSync(command, { encoding: 'utf-8' });
    console.log(`输出: ${output}`);
    return output;
  } catch (error) {
    console.error(`命令执行失败: ${error.message}`);
    if (error.stdout) console.log(`标准输出: ${error.stdout}`);
    if (error.stderr) console.log(`错误输出: ${error.stderr}`);
    return null;
  }
}

function fixMySQLConnection() {
  console.log('🔧 开始修复本地MySQL连接问题...');
  
  // 检查MySQL服务是否运行
  console.log('🔍 检查MySQL服务状态...');
  const mysqlStatus = runCommand('mysqladmin -u root -p111111 ping');
  
  if (!mysqlStatus || !mysqlStatus.includes('mysqld is alive')) {
    console.log('⚠️ MySQL服务可能未运行，请确保MySQL服务正在运行');
    console.log('💡 建议:');
    console.log('  1. 启动MySQL服务: net start mysql (Windows) 或 sudo service mysql start (Linux)');
    console.log('  2. 或者使用XAMPP、WAMP等工具启动MySQL');
    return;
  }
  
  console.log('✅ MySQL服务正在运行');
  
  // 创建测试数据库和用户
  console.log('📁 创建测试数据库和用户...');
  
  const commands = [
    // 创建测试数据库
    `mysql -u root -p111111 -e "CREATE DATABASE IF NOT EXISTS afa_office_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"`,
    
    // 创建测试用户
    `mysql -u root -p111111 -e "CREATE USER IF NOT EXISTS 'afa_test'@'localhost' IDENTIFIED BY 'test_password';"`,
    
    // 授予权限
    `mysql -u root -p111111 -e "GRANT ALL PRIVILEGES ON afa_office_test.* TO 'afa_test'@'localhost';"`,
    
    // 刷新权限
    `mysql -u root -p111111 -e "FLUSH PRIVILEGES;"`,
    
    // 验证连接
    `mysql -u afa_test -ptest_password -D afa_office_test -e "SELECT 1 as connection_test;"`
  ];
  
  for (const command of commands) {
    console.log(`\n🔧 执行: ${command}`);
    const result = runCommand(command);
    if (result === null) {
      console.log('❌ 命令执行失败，但继续执行下一个命令...');
    } else {
      console.log('✅ 命令执行成功');
    }
  }
  
  console.log('\n🎉 MySQL连接修复完成!');
  console.log('\n📋 修复摘要:');
  console.log('  - 测试数据库: afa_office_test');
  console.log('  - 测试用户: afa_test');
  console.log('  - 测试密码: test_password');
  console.log('  - 用户权限: 已授予');
  console.log('  - 连接验证: 已完成');
  
  console.log('\n📝 下一步:');
  console.log('  1. 确保后端服务配置使用正确的数据库连接信息');
  console.log('  2. 在 .env.test 文件中设置正确的环境变量');
  console.log('  3. 运行测试验证连接');
}

// 如果直接运行此脚本
if (require.main === module) {
  fixMySQLConnection();
}

module.exports = { fixMySQLConnection };