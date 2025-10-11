/**
 * 数据库配置示例
 * 展示如何正确配置MySQL测试数据库连接
 */

import { DatabaseConfigManager } from '../src/utils/database-adapter.js';
import { createMySQLTestEnvironmentManager } from '../src/utils/mysql-test-environment-manager.js';

/**
 * 展示如何使用环境变量配置数据库连接
 */
function demonstrateDatabaseConfig() {
    console.log('🔧 数据库配置示例');

    // 1. 使用DatabaseConfigManager获取测试配置
    console.log('📋 当前测试数据库配置:');
    try {
        const testConfig = DatabaseConfigManager.getTestConfig();
        console.log('数据库类型:', testConfig.type);

        if (testConfig.type === 'mysql') {
            console.log('主机:', testConfig.host);
            console.log('端口:', testConfig.port);
            console.log('用户:', testConfig.user);
            console.log('密码:', testConfig.password ? '***已设置***' : '未设置');
            console.log('连接池大小:', testConfig.connectionLimit);
        }

        // 验证配置
        DatabaseConfigManager.validateConfig(testConfig);
        console.log('✅ 配置验证通过');

        // 获取连接字符串（用于日志）
        const connectionString = DatabaseConfigManager.getConnectionString(testConfig);
        console.log('连接字符串:', connectionString);

    } catch (error) {
        console.error('❌ 配置验证失败:', error);
        return;
    }

    // 2. 展示环境变量的使用
    console.log('\n🌍 环境变量配置:');
    const envVars = [
        'TEST_DB_TYPE',
        'TEST_DB_HOST',
        'TEST_DB_PORT',
        'TEST_DB_USER',
        'TEST_DB_PASSWORD',
        'TEST_DB_CONNECTION_LIMIT',
        'TEST_DB_ACQUIRE_TIMEOUT',
        'TEST_DB_TIMEOUT'
    ];

    envVars.forEach(varName => {
        const value = process.env[varName];
        if (varName === 'TEST_DB_PASSWORD') {
            console.log(`${varName}:`, value ? '***已设置***' : '未设置');
        } else {
            console.log(`${varName}:`, value || '未设置（使用默认值）');
        }
    });

    // 3. 创建测试环境管理器（使用环境变量）
    console.log('\n🏗️ 创建测试环境管理器:');
    try {
        const manager = createMySQLTestEnvironmentManager();
        console.log('✅ 测试环境管理器创建成功');

        // 获取管理器状态
        const status = manager.getManagerStatus();
        console.log('管理器状态:', status);

        // 安全关闭
        manager.shutdown();

    } catch (error) {
        console.error('❌ 创建测试环境管理器失败:', error);
    }
}

/**
 * 展示不同环境的配置示例
 */
function showConfigurationExamples() {
    console.log('\n📚 配置示例:');

    console.log('\n1. 开发环境配置 (.env):');
    console.log(`TEST_DB_TYPE=mysql
TEST_DB_HOST=127.0.0.1
TEST_DB_PORT=3306
TEST_DB_USER=root
TEST_DB_PASSWORD=your-password
TEST_DB_CONNECTION_LIMIT=10`);

    console.log('\n2. CI/CD环境配置:');
    console.log(`TEST_DB_TYPE=mysql
TEST_DB_HOST=mysql-service
TEST_DB_PORT=3306
TEST_DB_USER=test_user
TEST_DB_PASSWORD=test_password
TEST_DB_CONNECTION_LIMIT=5`);

    console.log('\n3. Docker环境配置:');
    console.log(`TEST_DB_TYPE=mysql
TEST_DB_HOST=mysql
TEST_DB_PORT=3306
TEST_DB_USER=root
TEST_DB_PASSWORD=rootpassword
TEST_DB_CONNECTION_LIMIT=20`);

    console.log('\n4. 使用SQLite作为后备:');
    console.log(`TEST_DB_TYPE=sqlite
DB_TEST_PATH=:memory:`);
}

/**
 * 展示安全最佳实践
 */
function showSecurityBestPractices() {
    console.log('\n🔒 安全最佳实践:');

    console.log('\n1. 密码管理:');
    console.log('   ✅ 使用环境变量存储密码');
    console.log('   ✅ 不要在代码中硬编码密码');
    console.log('   ✅ 使用强密码');
    console.log('   ✅ 定期更换密码');

    console.log('\n2. 权限控制:');
    console.log('   ✅ 为测试创建专用数据库用户');
    console.log('   ✅ 限制用户权限（只允许创建test_*数据库）');
    console.log('   ✅ 不要使用root用户进行测试');

    console.log('\n3. 网络安全:');
    console.log('   ✅ 限制数据库访问IP');
    console.log('   ✅ 使用SSL连接（生产环境）');
    console.log('   ✅ 配置防火墙规则');

    console.log('\n4. 示例MySQL用户创建:');
    console.log(`-- 创建测试专用用户
CREATE USER 'test_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT CREATE, DROP, SELECT, INSERT, UPDATE, DELETE ON test_*.* TO 'test_user'@'localhost';
FLUSH PRIVILEGES;`);
}

/**
 * 主函数
 */
async function main() {
    console.log('🚀 数据库配置完整示例\n');

    // 展示当前配置
    demonstrateDatabaseConfig();

    // 展示配置示例
    showConfigurationExamples();

    // 展示安全最佳实践
    showSecurityBestPractices();

    console.log('\n✅ 配置示例演示完成');
}

// 如果直接运行此文件，执行示例
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
    main().catch(console.error);
}

export {
    demonstrateDatabaseConfig,
    showConfigurationExamples,
    showSecurityBestPractices
};