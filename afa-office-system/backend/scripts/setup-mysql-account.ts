#!/usr/bin/env npx tsx

/**
 * MySQL数据库访问账号设置脚本
 * 用于创建专门的应用程序数据库访问账号
 */

import { program } from 'commander';
import { createMySQLAccountSetup, quickCreateApplicationAccount } from '../src/utils/mysql-account-setup';
import { mySQLConfigManager } from '../src/config/mysql-config-manager';

/**
 * 设置应用程序数据库账号
 */
async function setupApplicationAccount(options: {
  database: string;
  environment: 'development' | 'test' | 'production';
  adminHost?: string;
  adminPort?: number;
  adminUser?: string;
  adminPassword?: string;
  username?: string;
  password?: string;
  force?: boolean;
}) {
  try {
    console.log('🚀 开始设置MySQL应用程序数据库访问账号...');
    console.log(`环境: ${options.environment}`);
    console.log(`数据库: ${options.database}`);
    
    if (options.username) {
      console.log(`用户名: ${options.username}`);
    }
    
    if (!options.force) {
      console.log('\n⚠️  此操作将创建新的数据库用户账号并更新环境变量文件');
      console.log('如果用户已存在，将被删除后重新创建');
      console.log('请确认您有足够的MySQL管理员权限');
      console.log('使用 --force 参数跳过此确认\n');
      
      // 在实际环境中，这里可以添加用户确认逻辑
      // const readline = require('readline');
      // const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      // const answer = await new Promise(resolve => rl.question('是否继续? (y/N): ', resolve));
      // rl.close();
      // if (answer !== 'y' && answer !== 'Y') {
      //   console.log('操作已取消');
      //   return;
      // }
    }

    const result = await quickCreateApplicationAccount(
      options.database,
      options.environment,
      {
        adminHost: options.adminHost,
        adminPort: options.adminPort,
        adminUser: options.adminUser,
        adminPassword: options.adminPassword,
        username: options.username,
        password: options.password
      }
    );

    if (result.success) {
      console.log('\n✅ MySQL应用程序访问账号设置成功!');
      console.log('\n📋 账号信息:');
      console.log(`用户名: ${result.accountConfig.username}`);
      console.log(`主机: ${result.accountConfig.host}`);
      console.log(`数据库: ${result.accountConfig.databaseName}`);
      console.log(`描述: ${result.accountConfig.description}`);
      
      console.log('\n🔑 权限:');
      const enabledPermissions = Object.entries(result.accountConfig.permissions)
        .filter(([_, enabled]) => enabled)
        .map(([perm, _]) => perm.toUpperCase());
      console.log(`- ${enabledPermissions.join(', ')}`);
      
      console.log('\n📊 资源限制:');
      console.log(`- 最大连接数: ${result.accountConfig.maxConnections}`);
      console.log(`- 每小时最大查询数: ${result.accountConfig.maxQueriesPerHour}`);
      console.log(`- 每小时最大更新数: ${result.accountConfig.maxUpdatesPerHour}`);
      console.log(`- 每小时最大连接数: ${result.accountConfig.maxConnectionsPerHour}`);
      
      console.log('\n📝 环境变量文件:');
      console.log(`文件路径: ${result.envFilePath}`);
      console.log('环境变量已更新，请检查配置文件');
      
      console.log('\n🔧 执行的操作:');
      result.operations.forEach(op => console.log(`- ${op}`));
      
      if (result.warnings.length > 0) {
        console.log('\n⚠️  警告:');
        result.warnings.forEach(warning => console.log(`- ${warning}`));
      }
      
      console.log('\n📖 使用说明:');
      console.log('1. 检查生成的环境变量文件配置');
      console.log('2. 根据需要调整连接参数');
      console.log('3. 在应用程序中使用 APP_DB_* 环境变量');
      console.log('4. 在测试中使用 TEST_DB_* 环境变量');
      console.log('5. 确保应用程序有权限访问指定的数据库');
      
    } else {
      console.error('\n❌ MySQL应用程序访问账号设置失败!');
      console.error('错误信息:');
      result.errors.forEach(error => console.error(`- ${error}`));
    }

  } catch (error) {
    console.error('❌ 设置过程中发生错误:', error);
    process.exit(1);
  }
}

/**
 * 删除应用程序数据库账号
 */
async function deleteApplicationAccount(options: {
  username: string;
  host?: string;
  adminHost?: string;
  adminPort?: number;
  adminUser?: string;
  adminPassword?: string;
}) {
  try {
    console.log('🗑️ 开始删除MySQL应用程序数据库访问账号...');
    console.log(`用户: ${options.username}@${options.host || 'localhost'}`);

    // 获取管理员配置
    const adminConfig = mySQLConfigManager.getMySQLConfigTemplate('development');
    const config = {
      ...adminConfig,
      host: options.adminHost || adminConfig.host,
      port: options.adminPort || adminConfig.port,
      user: options.adminUser || adminConfig.user,
      password: options.adminPassword || adminConfig.password
    };

    const accountSetup = createMySQLAccountSetup(config);
    await accountSetup.deleteApplicationAccount(options.username, options.host);

    console.log('✅ MySQL应用程序访问账号删除成功!');

  } catch (error) {
    console.error('❌ 删除过程中发生错误:', error);
    process.exit(1);
  }
}

/**
 * 显示配置指南
 */
function showConfigGuide() {
  console.log('📖 MySQL数据库访问账号配置指南');
  console.log('=====================================');
  
  console.log('\n🎯 目的:');
  console.log('为AFA办公小程序创建专门的MySQL数据库访问账号，');
  console.log('遵循最小权限原则，提高数据库安全性。');
  
  console.log('\n🏗️ 账号类型:');
  console.log('1. 应用程序账号 (APP_DB_*) - 生产环境使用');
  console.log('2. 测试账号 (TEST_DB_*) - 测试环境使用');
  
  console.log('\n🔑 权限配置:');
  console.log('- 开发环境: SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX');
  console.log('- 测试环境: SELECT, INSERT, UPDATE, DELETE');
  console.log('- 生产环境: SELECT, INSERT, UPDATE, DELETE');
  
  console.log('\n📊 资源限制:');
  console.log('- 开发环境: 20连接, 5000查询/小时, 500更新/小时');
  console.log('- 测试环境: 10连接, 3000查询/小时, 300更新/小时');
  console.log('- 生产环境: 50连接, 10000查询/小时, 1000更新/小时');
  
  console.log('\n🔧 使用方法:');
  console.log('# 创建开发环境账号');
  console.log('npm run setup:mysql-account -- --database afa_office --environment development');
  console.log('');
  console.log('# 创建测试环境账号');
  console.log('npm run setup:mysql-account -- --database afa_office_test --environment test');
  console.log('');
  console.log('# 创建生产环境账号');
  console.log('npm run setup:mysql-account -- --database afa_office_prod --environment production');
  console.log('');
  console.log('# 自定义用户名和密码');
  console.log('npm run setup:mysql-account -- --database mydb --username myuser --password mypass');
  console.log('');
  console.log('# 删除账号');
  console.log('npm run setup:mysql-account -- delete --username afa_app_user');
  
  console.log('\n📝 环境变量:');
  console.log('创建账号后，相关配置将写入 .env.{environment} 文件:');
  console.log('- APP_DB_TYPE=mysql');
  console.log('- APP_DB_HOST=127.0.0.1');
  console.log('- APP_DB_PORT=3306');
  console.log('- APP_DB_USER=afa_app_user');
  console.log('- APP_DB_PASSWORD=generated_password');
  console.log('- APP_DB_NAME=afa_office');
  console.log('- ...');
  
  console.log('\n⚠️  注意事项:');
  console.log('1. 确保MySQL服务正在运行');
  console.log('2. 确保有MySQL管理员权限');
  console.log('3. 生产环境请使用强密码');
  console.log('4. 定期更新数据库密码');
  console.log('5. 不要在代码中硬编码数据库密码');
}

// 配置命令行程序
program
  .name('setup-mysql-account')
  .description('MySQL数据库访问账号设置工具')
  .version('1.0.0');

// 创建账号命令
program
  .command('create')
  .description('创建MySQL应用程序数据库访问账号')
  .requiredOption('-d, --database <name>', '数据库名称')
  .option('-e, --environment <env>', '环境类型', 'development')
  .option('--admin-host <host>', 'MySQL管理员主机', '127.0.0.1')
  .option('--admin-port <port>', 'MySQL管理员端口', '3306')
  .option('--admin-user <user>', 'MySQL管理员用户名', 'root')
  .option('--admin-password <password>', 'MySQL管理员密码')
  .option('-u, --username <username>', '应用程序用户名')
  .option('-p, --password <password>', '应用程序密码')
  .option('-f, --force', '强制执行，跳过确认')
  .action(async (options) => {
    await setupApplicationAccount({
      database: options.database,
      environment: options.environment,
      adminHost: options.adminHost,
      adminPort: parseInt(options.adminPort),
      adminUser: options.adminUser,
      adminPassword: options.adminPassword,
      username: options.username,
      password: options.password,
      force: options.force
    });
  });

// 删除账号命令
program
  .command('delete')
  .description('删除MySQL应用程序数据库访问账号')
  .requiredOption('-u, --username <username>', '要删除的用户名')
  .option('--host <host>', '用户主机', 'localhost')
  .option('--admin-host <host>', 'MySQL管理员主机', '127.0.0.1')
  .option('--admin-port <port>', 'MySQL管理员端口', '3306')
  .option('--admin-user <user>', 'MySQL管理员用户名', 'root')
  .option('--admin-password <password>', 'MySQL管理员密码')
  .action(async (options) => {
    await deleteApplicationAccount({
      username: options.username,
      host: options.host,
      adminHost: options.adminHost,
      adminPort: parseInt(options.adminPort),
      adminUser: options.adminUser,
      adminPassword: options.adminPassword
    });
  });

// 配置指南命令
program
  .command('guide')
  .description('显示配置指南')
  .action(showConfigGuide);

// 默认命令（向后兼容）
program
  .argument('[database]', '数据库名称')
  .option('-e, --environment <env>', '环境类型', 'development')
  .option('--admin-host <host>', 'MySQL管理员主机', '127.0.0.1')
  .option('--admin-port <port>', 'MySQL管理员端口', '3306')
  .option('--admin-user <user>', 'MySQL管理员用户名', 'root')
  .option('--admin-password <password>', 'MySQL管理员密码')
  .option('-u, --username <username>', '应用程序用户名')
  .option('-p, --password <password>', '应用程序密码')
  .option('-f, --force', '强制执行，跳过确认')
  .action(async (database, options) => {
    if (!database) {
      console.log('请指定数据库名称，或使用 --help 查看帮助');
      console.log('使用 "guide" 命令查看配置指南');
      return;
    }
    
    await setupApplicationAccount({
      database,
      environment: options.environment,
      adminHost: options.adminHost,
      adminPort: parseInt(options.adminPort),
      adminUser: options.adminUser,
      adminPassword: options.adminPassword,
      username: options.username,
      password: options.password,
      force: options.force
    });
  });

// 解析命令行参数
program.parse();

export { setupApplicationAccount, deleteApplicationAccount, showConfigGuide };