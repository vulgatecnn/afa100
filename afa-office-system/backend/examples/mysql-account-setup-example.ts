/**
 * MySQL数据库访问账号设置示例
 * 演示如何创建专门的应用程序数据库访问账号
 */

import {
  createMySQLAccountSetup,
  quickCreateApplicationAccount,
  DatabaseAccountConfig,
  EnvironmentConfig,
  AccountSetupResult
} from '../src/utils/mysql-account-setup';

import { getMySQLConfigTemplate } from '../src/config/mysql-config-manager';

/**
 * 示例1: 基础账号创建
 */
async function basicAccountCreationExample() {
  console.log('\n=== 基础账号创建示例 ===');

  try {
    // 获取管理员配置
    const adminConfig = getMySQLConfigTemplate('development');
    console.log('管理员配置:');
    console.log(`- 主机: ${adminConfig.host}:${adminConfig.port}`);
    console.log(`- 用户: ${adminConfig.user}`);

    // 创建账号设置管理器
    const accountSetup = createMySQLAccountSetup(adminConfig);
    console.log('账号设置管理器已创建');

    // 模拟账号创建配置
    const accountConfig: Partial<DatabaseAccountConfig> = {
      username: 'afa_dev_user',
      password: 'dev_secure_pass_123',
      host: 'localhost',
      databaseName: 'afa_office_dev',
      description: 'AFA办公小程序开发环境数据库访问账号',
      permissions: {
        select: true,
        insert: true,
        update: true,
        delete: true,
        create: true,
        drop: true,
        alter: true,
        index: true
      },
      maxConnections: 20,
      maxQueriesPerHour: 5000,
      maxUpdatesPerHour: 500,
      maxConnectionsPerHour: 50
    };

    console.log('\n账号配置:');
    console.log(`- 用户名: ${accountConfig.username}`);
    console.log(`- 主机: ${accountConfig.host}`);
    console.log(`- 数据库: ${accountConfig.databaseName}`);
    console.log(`- 描述: ${accountConfig.description}`);
    console.log(`- 最大连接数: ${accountConfig.maxConnections}`);

    console.log('基础账号创建配置已准备完成');

  } catch (error) {
    console.log('基础账号创建示例失败:', error.message);
  }
}

/**
 * 示例2: 快速账号创建
 */
async function quickAccountCreationExample() {
  console.log('\n=== 快速账号创建示例 ===');

  try {
    console.log('快速创建方法演示:');
    
    // 开发环境账号
    console.log('\n1. 开发环境账号创建:');
    console.log('quickCreateApplicationAccount("afa_office_dev", "development", {');
    console.log('  adminHost: "127.0.0.1",');
    console.log('  adminPort: 3306,');
    console.log('  adminUser: "root",');
    console.log('  adminPassword: "your_password",');
    console.log('  username: "afa_dev_user",');
    console.log('  password: "dev_secure_pass"');
    console.log('})');

    // 测试环境账号
    console.log('\n2. 测试环境账号创建:');
    console.log('quickCreateApplicationAccount("afa_office_test", "test", {');
    console.log('  username: "afa_test_user",');
    console.log('  password: "test_secure_pass"');
    console.log('})');

    // 生产环境账号
    console.log('\n3. 生产环境账号创建:');
    console.log('quickCreateApplicationAccount("afa_office_prod", "production", {');
    console.log('  username: "afa_prod_user",');
    console.log('  password: "prod_very_secure_pass"');
    console.log('})');

    // 模拟结果
    const mockResult: AccountSetupResult = {
      success: true,
      accountConfig: {
        username: 'afa_dev_user',
        password: 'dev_secure_pass_123',
        host: 'localhost',
        description: 'AFA办公小程序development环境数据库访问账号',
        databaseName: 'afa_office_dev',
        permissions: {
          select: true,
          insert: true,
          update: true,
          delete: true,
          create: true,
          drop: true,
          alter: true,
          index: true
        },
        maxConnections: 20,
        maxQueriesPerHour: 5000,
        maxUpdatesPerHour: 500,
        maxConnectionsPerHour: 50
      },
      environmentConfig: {
        APP_DB_TYPE: 'mysql',
        APP_DB_HOST: '127.0.0.1',
        APP_DB_PORT: 3306,
        APP_DB_USER: 'afa_dev_user',
        APP_DB_PASSWORD: 'dev_secure_pass_123',
        APP_DB_NAME: 'afa_office_dev',
        APP_DB_CONNECTION_LIMIT: 10,
        APP_DB_ACQUIRE_TIMEOUT: 60000,
        APP_DB_TIMEOUT: 60000,
        TEST_DB_TYPE: 'mysql',
        TEST_DB_HOST: '127.0.0.1',
        TEST_DB_PORT: 3306,
        TEST_DB_USER: 'afa_dev_user',
        TEST_DB_PASSWORD: 'dev_secure_pass_123',
        TEST_DB_NAME: 'afa_office_dev_test',
        TEST_DB_CONNECTION_LIMIT: 5,
        TEST_DB_ACQUIRE_TIMEOUT: 30000,
        TEST_DB_TIMEOUT: 30000
      },
      operations: [
        '连接MySQL服务器',
        '创建用户账号',
        '授予数据库权限',
        '设置资源限制',
        '刷新权限表',
        '写入环境变量文件',
        '验证账号配置'
      ],
      errors: [],
      warnings: [],
      envFilePath: '.env.development',
      timestamp: new Date()
    };

    console.log('\n模拟创建结果:');
    console.log(`- 成功: ${mockResult.success}`);
    console.log(`- 用户名: ${mockResult.accountConfig.username}`);
    console.log(`- 数据库: ${mockResult.accountConfig.databaseName}`);
    console.log(`- 环境变量文件: ${mockResult.envFilePath}`);
    console.log(`- 执行操作: ${mockResult.operations.length} 个`);

    console.log('快速账号创建示例完成');

  } catch (error) {
    console.log('快速账号创建示例失败:', error.message);
  }
}

/**
 * 示例3: 环境变量配置
 */
async function environmentConfigExample() {
  console.log('\n=== 环境变量配置示例 ===');

  try {
    console.log('生成的环境变量配置示例:');

    // 开发环境配置
    console.log('\n1. 开发环境 (.env.development):');
    console.log('# MySQL应用数据库配置');
    console.log('APP_DB_TYPE=mysql');
    console.log('APP_DB_HOST=127.0.0.1');
    console.log('APP_DB_PORT=3306');
    console.log('APP_DB_USER=afa_dev_user');
    console.log('APP_DB_PASSWORD=dev_secure_pass_123');
    console.log('APP_DB_NAME=afa_office_dev');
    console.log('APP_DB_CONNECTION_LIMIT=10');
    console.log('APP_DB_ACQUIRE_TIMEOUT=60000');
    console.log('APP_DB_TIMEOUT=60000');
    console.log('');
    console.log('# MySQL测试数据库配置');
    console.log('TEST_DB_TYPE=mysql');
    console.log('TEST_DB_HOST=127.0.0.1');
    console.log('TEST_DB_PORT=3306');
    console.log('TEST_DB_USER=afa_dev_user');
    console.log('TEST_DB_PASSWORD=dev_secure_pass_123');
    console.log('TEST_DB_NAME=afa_office_dev_test');
    console.log('TEST_DB_CONNECTION_LIMIT=5');
    console.log('TEST_DB_ACQUIRE_TIMEOUT=30000');
    console.log('TEST_DB_TIMEOUT=30000');

    // 生产环境配置
    console.log('\n2. 生产环境 (.env.production):');
    console.log('# MySQL应用数据库配置');
    console.log('APP_DB_TYPE=mysql');
    console.log('APP_DB_HOST=your-mysql-server.com');
    console.log('APP_DB_PORT=3306');
    console.log('APP_DB_USER=afa_prod_user');
    console.log('APP_DB_PASSWORD=prod_very_secure_pass_456');
    console.log('APP_DB_NAME=afa_office_prod');
    console.log('APP_DB_CONNECTION_LIMIT=20');
    console.log('APP_DB_ACQUIRE_TIMEOUT=60000');
    console.log('APP_DB_TIMEOUT=60000');

    console.log('\n3. 在应用程序中使用:');
    console.log('import { config } from "dotenv";');
    console.log('config();');
    console.log('');
    console.log('const dbConfig = {');
    console.log('  type: process.env.APP_DB_TYPE,');
    console.log('  host: process.env.APP_DB_HOST,');
    console.log('  port: parseInt(process.env.APP_DB_PORT),');
    console.log('  user: process.env.APP_DB_USER,');
    console.log('  password: process.env.APP_DB_PASSWORD,');
    console.log('  database: process.env.APP_DB_NAME');
    console.log('};');

    console.log('环境变量配置示例完成');

  } catch (error) {
    console.log('环境变量配置示例失败:', error.message);
  }
}

/**
 * 示例4: 权限配置
 */
async function permissionConfigExample() {
  console.log('\n=== 权限配置示例 ===');

  try {
    console.log('不同环境的权限配置:');

    // 开发环境权限
    console.log('\n1. 开发环境权限:');
    const devPermissions = {
      select: true,
      insert: true,
      update: true,
      delete: true,
      create: true,
      drop: true,
      alter: true,
      index: true
    };
    
    console.log('权限列表:');
    Object.entries(devPermissions).forEach(([perm, enabled]) => {
      console.log(`- ${perm.toUpperCase()}: ${enabled ? '✅' : '❌'}`);
    });
    console.log('说明: 开发环境拥有完整的数据库操作权限');

    // 测试环境权限
    console.log('\n2. 测试环境权限:');
    const testPermissions = {
      select: true,
      insert: true,
      update: true,
      delete: true,
      create: false,
      drop: false,
      alter: false,
      index: false
    };
    
    console.log('权限列表:');
    Object.entries(testPermissions).forEach(([perm, enabled]) => {
      console.log(`- ${perm.toUpperCase()}: ${enabled ? '✅' : '❌'}`);
    });
    console.log('说明: 测试环境只有数据操作权限，无结构修改权限');

    // 生产环境权限
    console.log('\n3. 生产环境权限:');
    const prodPermissions = {
      select: true,
      insert: true,
      update: true,
      delete: true,
      create: false,
      drop: false,
      alter: false,
      index: false
    };
    
    console.log('权限列表:');
    Object.entries(prodPermissions).forEach(([perm, enabled]) => {
      console.log(`- ${perm.toUpperCase()}: ${enabled ? '✅' : '❌'}`);
    });
    console.log('说明: 生产环境遵循最小权限原则，只有必要的数据操作权限');

    // 资源限制
    console.log('\n4. 资源限制配置:');
    const resourceLimits = {
      development: {
        maxConnections: 20,
        maxQueriesPerHour: 5000,
        maxUpdatesPerHour: 500,
        maxConnectionsPerHour: 50
      },
      test: {
        maxConnections: 10,
        maxQueriesPerHour: 3000,
        maxUpdatesPerHour: 300,
        maxConnectionsPerHour: 30
      },
      production: {
        maxConnections: 50,
        maxQueriesPerHour: 10000,
        maxUpdatesPerHour: 1000,
        maxConnectionsPerHour: 100
      }
    };

    Object.entries(resourceLimits).forEach(([env, limits]) => {
      console.log(`\n${env.toUpperCase()}环境资源限制:`);
      console.log(`- 最大连接数: ${limits.maxConnections}`);
      console.log(`- 每小时最大查询数: ${limits.maxQueriesPerHour}`);
      console.log(`- 每小时最大更新数: ${limits.maxUpdatesPerHour}`);
      console.log(`- 每小时最大连接数: ${limits.maxConnectionsPerHour}`);
    });

    console.log('权限配置示例完成');

  } catch (error) {
    console.log('权限配置示例失败:', error.message);
  }
}

/**
 * 示例5: 命令行工具使用
 */
async function commandLineToolExample() {
  console.log('\n=== 命令行工具使用示例 ===');

  try {
    console.log('MySQL账号设置命令行工具使用方法:');

    console.log('\n1. 查看帮助信息:');
    console.log('npm run setup:mysql-account -- --help');
    console.log('npm run setup:mysql-account -- guide');

    console.log('\n2. 创建开发环境账号:');
    console.log('npm run setup:mysql-account -- create \\');
    console.log('  --database afa_office_dev \\');
    console.log('  --environment development \\');
    console.log('  --admin-password your_mysql_password');

    console.log('\n3. 创建测试环境账号:');
    console.log('npm run setup:mysql-account -- create \\');
    console.log('  --database afa_office_test \\');
    console.log('  --environment test \\');
    console.log('  --username afa_test_user \\');
    console.log('  --password test_secure_pass');

    console.log('\n4. 创建生产环境账号:');
    console.log('npm run setup:mysql-account -- create \\');
    console.log('  --database afa_office_prod \\');
    console.log('  --environment production \\');
    console.log('  --admin-host your-mysql-server.com \\');
    console.log('  --admin-password your_mysql_password \\');
    console.log('  --username afa_prod_user \\');
    console.log('  --password very_secure_production_password');

    console.log('\n5. 删除账号:');
    console.log('npm run setup:mysql-account -- delete \\');
    console.log('  --username afa_dev_user \\');
    console.log('  --admin-password your_mysql_password');

    console.log('\n6. 快捷命令:');
    console.log('npm run setup:mysql-dev    # 创建开发环境账号');
    console.log('npm run setup:mysql-test   # 创建测试环境账号');
    console.log('npm run setup:mysql-prod   # 创建生产环境账号');

    console.log('\n7. 命令执行流程:');
    console.log('a) 连接MySQL服务器（使用管理员账号）');
    console.log('b) 检查目标数据库是否存在（不存在则创建）');
    console.log('c) 创建应用程序用户账号');
    console.log('d) 授予相应的数据库权限');
    console.log('e) 设置资源使用限制');
    console.log('f) 生成环境变量配置');
    console.log('g) 写入环境变量文件');
    console.log('h) 验证账号配置');

    console.log('命令行工具使用示例完成');

  } catch (error) {
    console.log('命令行工具示例失败:', error.message);
  }
}

/**
 * 示例6: 安全最佳实践
 */
async function securityBestPracticesExample() {
  console.log('\n=== 安全最佳实践示例 ===');

  try {
    console.log('MySQL数据库访问账号安全最佳实践:');

    console.log('\n1. 密码安全:');
    console.log('✅ 使用强密码（至少16位，包含大小写字母、数字、特殊字符）');
    console.log('✅ 定期更换密码（建议每3-6个月）');
    console.log('✅ 不要在代码中硬编码密码');
    console.log('✅ 使用环境变量存储敏感信息');
    console.log('❌ 避免使用简单密码如 "123456", "password"');

    console.log('\n2. 权限管理:');
    console.log('✅ 遵循最小权限原则');
    console.log('✅ 生产环境只授予必要的数据操作权限');
    console.log('✅ 开发环境可以有更多权限便于开发');
    console.log('✅ 定期审查和清理不必要的权限');
    console.log('❌ 避免使用root账号进行应用程序连接');

    console.log('\n3. 网络安全:');
    console.log('✅ 使用SSL/TLS加密连接');
    console.log('✅ 限制连接来源IP地址');
    console.log('✅ 使用防火墙保护数据库服务器');
    console.log('✅ 定期更新MySQL版本');
    console.log('❌ 避免在公网直接暴露数据库端口');

    console.log('\n4. 资源限制:');
    console.log('✅ 设置合理的连接数限制');
    console.log('✅ 限制每小时查询和更新次数');
    console.log('✅ 监控数据库资源使用情况');
    console.log('✅ 设置连接超时时间');

    console.log('\n5. 监控和审计:');
    console.log('✅ 启用数据库访问日志');
    console.log('✅ 监控异常登录和操作');
    console.log('✅ 定期检查用户权限');
    console.log('✅ 设置安全告警机制');

    console.log('\n6. 环境隔离:');
    console.log('✅ 不同环境使用不同的数据库和账号');
    console.log('✅ 测试环境不要使用生产数据');
    console.log('✅ 开发环境与生产环境完全隔离');
    console.log('✅ 使用不同的密码和权限配置');

    console.log('安全最佳实践示例完成');

  } catch (error) {
    console.log('安全最佳实践示例失败:', error.message);
  }
}

/**
 * 运行所有示例
 */
async function runAllExamples() {
  console.log('🚀 MySQL数据库访问账号设置示例演示');
  console.log('==========================================');

  try {
    await basicAccountCreationExample();
    await quickAccountCreationExample();
    await environmentConfigExample();
    await permissionConfigExample();
    await commandLineToolExample();
    await securityBestPracticesExample();
    
    console.log('\n✅ 所有示例演示完成');
    
    console.log('\n📝 总结:');
    console.log('1. 使用专门的应用程序数据库访问账号提高安全性');
    console.log('2. 不同环境使用不同的权限配置');
    console.log('3. 通过环境变量管理数据库连接信息');
    console.log('4. 遵循最小权限原则和安全最佳实践');
    console.log('5. 使用命令行工具简化账号创建和管理');
    
    console.log('\n🚀 开始使用:');
    console.log('1. 确保MySQL服务正在运行');
    console.log('2. 准备MySQL管理员账号信息');
    console.log('3. 运行账号设置命令创建应用程序账号');
    console.log('4. 检查生成的环境变量文件');
    console.log('5. 在应用程序中使用新的数据库配置');

  } catch (error) {
    console.error('❌ 示例演示失败:', error);
  }
}

// 直接运行所有示例
runAllExamples().catch(console.error);

export {
  basicAccountCreationExample,
  quickAccountCreationExample,
  environmentConfigExample,
  permissionConfigExample,
  commandLineToolExample,
  securityBestPracticesExample,
  runAllExamples
};