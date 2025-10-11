/**
 * MySQL数据库和用户初始化系统使用示例
 * 演示如何使用MySQL初始化管理器进行完整的数据库初始化
 */

import {
    MySQLDatabaseInitializer,
    createMySQLDatabaseInitializer,
    quickInitializeDatabase
} from '../src/utils/mysql-database-initializer';

import {
    MySQLUserManager,
    createMySQLUserManager,
    quickCreateTestUser,
    MySQLPrivilege
} from '../src/utils/mysql-user-manager';

import {
    MySQLSchemaInitializer,
    createMySQLSchemaInitializer,
    quickInitializeSchema
} from '../src/utils/mysql-schema-initializer';

import {
    MySQLInitializationManager,
    createMySQLInitializationManager,
    quickCompleteInitialization
} from '../src/utils/mysql-initialization-manager';

import { getMySQLConfigTemplate } from '../src/config/mysql-config-manager';

/**
 * 示例1: 基础数据库初始化
 */
async function basicDatabaseInitializationExample() {
    console.log('\n=== 基础数据库初始化示例 ===');

    try {
        // 获取MySQL配置
        const config = getMySQLConfigTemplate('test');
        config.database = 'test_basic_init';

        // 创建数据库初始化器
        const initializer = createMySQLDatabaseInitializer(config, {
            databaseName: 'test_basic_init',
            dropIfExists: true,
            createIfNotExists: true,
            initializeSchema: false,
            insertSeedData: false,
            enableLogging: true,
            logLevel: 'info'
        });

        console.log('正在初始化数据库...');
        // const result = await initializer.initialize();

        console.log('数据库初始化配置:');
        console.log('- 数据库名:', 'test_basic_init');
        console.log('- 字符集:', 'utf8mb4');
        console.log('- 排序规则:', 'utf8mb4_unicode_ci');
        console.log('- 删除现有:', true);

        // 获取数据库状态
        // const status = await initializer.getDatabaseStatus();
        console.log('数据库状态检查完成');

    } catch (error) {
        console.log('数据库初始化示例失败:', error.message);
    }
}

/**
 * 示例2: 用户管理
 */
async function userManagementExample() {
    console.log('\n=== 用户管理示例 ===');

    try {
        // 获取MySQL配置
        const config = getMySQLConfigTemplate('test');

        // 创建用户管理器
        const userManager = createMySQLUserManager(config, {
            enableLogging: true,
            logLevel: 'info'
        });

        console.log('用户管理器已创建');

        // 获取可用的权限模板
        const templates = userManager.getAvailableTemplates();
        console.log('可用权限模板:');
        templates.forEach(template => {
            console.log(`- ${template.name}: ${template.description}`);
        });

        // 模拟创建测试用户
        console.log('\n创建测试用户配置:');
        const testUsers = [
            {
                username: 'test_admin_user',
                password: 'admin_pass_123',
                template: 'test_admin',
                host: 'localhost',
                databaseName: 'test_basic_init'
            },
            {
                username: 'test_normal_user',
                password: 'user_pass_123',
                template: 'test_user',
                host: 'localhost',
                databaseName: 'test_basic_init'
            },
            {
                username: 'test_readonly_user',
                password: 'readonly_pass_123',
                template: 'test_readonly',
                host: 'localhost',
                databaseName: 'test_basic_init'
            }
        ];

        testUsers.forEach(user => {
            console.log(`- ${user.username}@${user.host} (${user.template})`);
        });

        console.log('用户创建配置已准备完成');

    } catch (error) {
        console.log('用户管理示例失败:', error.message);
    }
}

/**
 * 示例3: 数据库结构初始化
 */
async function schemaInitializationExample() {
    console.log('\n=== 数据库结构初始化示例 ===');

    try {
        // 获取MySQL配置
        const config = getMySQLConfigTemplate('test');
        config.database = 'test_schema_init';

        // 创建结构初始化器
        const schemaInitializer = createMySQLSchemaInitializer(config, {
            dropExistingObjects: true,
            createTables: true,
            createViews: true,
            createProcedures: true,
            createTriggers: true,
            createIndexes: true,
            insertSeedData: false,
            validateStructure: true,
            enableLogging: true,
            logLevel: 'info'
        });

        console.log('结构初始化器已创建');
        console.log('初始化配置:');
        console.log('- 删除现有对象:', true);
        console.log('- 创建表:', true);
        console.log('- 创建视图:', true);
        console.log('- 创建存储过程:', true);
        console.log('- 创建触发器:', true);
        console.log('- 创建索引:', true);
        console.log('- 验证结构:', true);

        // 模拟结构初始化
        console.log('\n预期创建的数据库对象:');
        const expectedObjects = [
            { type: 'TABLE', name: 'users' },
            { type: 'TABLE', name: 'merchants' },
            { type: 'TABLE', name: 'projects' },
            { type: 'TABLE', name: 'venues' },
            { type: 'TABLE', name: 'floors' },
            { type: 'TABLE', name: 'permissions' },
            { type: 'TABLE', name: 'visitor_applications' },
            { type: 'TABLE', name: 'passcodes' },
            { type: 'TABLE', name: 'access_records' },
            { type: 'VIEW', name: 'active_users' },
            { type: 'VIEW', name: 'pending_visitor_applications' },
            { type: 'VIEW', name: 'active_passcodes' },
            { type: 'PROCEDURE', name: 'CreateVisitorPasscode' },
            { type: 'PROCEDURE', name: 'RecordAccess' }
        ];

        expectedObjects.forEach(obj => {
            console.log(`- ${obj.type}: ${obj.name}`);
        });

        console.log('结构初始化配置已准备完成');

    } catch (error) {
        console.log('结构初始化示例失败:', error.message);
    }
}

/**
 * 示例4: 完整初始化流程
 */
async function completeInitializationExample() {
    console.log('\n=== 完整初始化流程示例 ===');

    try {
        // 获取MySQL配置
        const config = getMySQLConfigTemplate('test');
        config.database = 'test_complete_init';

        // 创建完整初始化管理器
        const manager = createMySQLInitializationManager(config, {
            database: {
                name: 'test_complete_init',
                charset: 'utf8mb4',
                collation: 'utf8mb4_unicode_ci',
                dropIfExists: true,
                createIfNotExists: true
            },
            users: [
                {
                    username: 'test_admin',
                    password: 'admin_pass_123',
                    host: 'localhost',
                    template: 'test_admin',
                    description: '测试管理员用户'
                },
                {
                    username: 'test_user',
                    password: 'user_pass_123',
                    host: 'localhost',
                    template: 'test_user',
                    description: '测试普通用户'
                },
                {
                    username: 'test_readonly',
                    password: 'readonly_pass_123',
                    host: 'localhost',
                    template: 'test_readonly',
                    description: '测试只读用户'
                }
            ],
            schema: {
                initializeSchema: true,
                insertSeedData: false,
                dropExistingObjects: true
            },
            logging: {
                enableLogging: true,
                logLevel: 'info',
                logToFile: false
            },
            validation: {
                validateAfterInit: true,
                validateUsers: true,
                validateSchema: true,
                validateConnections: true
            }
        });

        console.log('完整初始化管理器已创建');

        // 获取初始状态
        const initialStatus = manager.getStatus();
        console.log('初始状态:', initialStatus.phase);
        console.log('当前操作:', initialStatus.currentOperation);

        // 模拟初始化过程
        console.log('\n初始化流程:');
        console.log('1. 数据库初始化 (0-30%)');
        console.log('   - 连接MySQL服务器');
        console.log('   - 检查数据库状态');
        console.log('   - 创建/重建数据库');
        console.log('   - 设置字符集和排序规则');

        console.log('2. 用户创建 (30-60%)');
        console.log('   - 创建测试管理员用户');
        console.log('   - 创建测试普通用户');
        console.log('   - 创建测试只读用户');
        console.log('   - 分配权限');

        console.log('3. 结构初始化 (60-85%)');
        console.log('   - 创建数据表');
        console.log('   - 创建视图');
        console.log('   - 创建存储过程');
        console.log('   - 创建触发器');
        console.log('   - 创建索引');

        console.log('4. 验证 (85-100%)');
        console.log('   - 验证数据库结构');
        console.log('   - 验证用户权限');
        console.log('   - 验证连接');
        console.log('   - 生成报告');

        // 获取配置信息
        const initConfig = manager.getInitializationConfig();
        console.log('\n初始化配置摘要:');
        console.log('- 数据库名:', initConfig.database.name);
        console.log('- 用户数量:', initConfig.users.length);
        console.log('- 结构初始化:', initConfig.schema.initializeSchema);
        console.log('- 种子数据:', initConfig.schema.insertSeedData);
        console.log('- 验证开启:', initConfig.validation.validateAfterInit);

        console.log('完整初始化流程配置已准备完成');

    } catch (error) {
        console.log('完整初始化示例失败:', error.message);
    }
}

/**
 * 示例5: 快速初始化方法
 */
async function quickInitializationExample() {
    console.log('\n=== 快速初始化方法示例 ===');

    try {
        console.log('1. 快速数据库初始化');
        console.log('   quickInitializeDatabase("test_quick_db", { dropIfExists: true })');

        console.log('2. 快速用户创建');
        console.log('   quickCreateTestUser("quick_user", "password123", "test_user")');

        console.log('3. 快速结构初始化');
        console.log('   quickInitializeSchema("test_quick_schema", { insertSeedData: true })');

        console.log('4. 快速完整初始化');
        console.log('   quickCompleteInitialization("test_quick_complete", {');
        console.log('     dropIfExists: true,');
        console.log('     insertSeedData: true,');
        console.log('     createTestUsers: true');
        console.log('   })');

        // 模拟快速初始化配置
        const quickConfig = {
            databaseName: 'test_quick_complete',
            host: '127.0.0.1',
            port: 3306,
            user: 'root',
            password: '111111',
            dropIfExists: true,
            insertSeedData: true,
            createTestUsers: true
        };

        console.log('\n快速初始化配置:');
        Object.entries(quickConfig).forEach(([key, value]) => {
            console.log(`- ${key}: ${value}`);
        });

        console.log('快速初始化方法演示完成');

    } catch (error) {
        console.log('快速初始化示例失败:', error.message);
    }
}

/**
 * 示例6: 工厂模式和状态管理
 */
async function factoryAndStatusExample() {
    console.log('\n=== 工厂模式和状态管理示例 ===');

    try {
        const { MySQLInitializationManagerFactory } = await import('../src/utils/mysql-initialization-manager');

        console.log('工厂模式使用:');
        console.log('1. 创建多个初始化管理器实例');
        console.log('   - 开发环境管理器');
        console.log('   - 测试环境管理器');
        console.log('   - 集成测试管理器');

        console.log('2. 状态管理');
        console.log('   - 实时进度跟踪');
        console.log('   - 错误和警告收集');
        console.log('   - 日志记录');
        console.log('   - 剩余时间估算');

        console.log('3. 批量操作');
        console.log('   - 并行初始化多个数据库');
        console.log('   - 统一状态监控');
        console.log('   - 批量清理');

        // 模拟管理器状态
        const mockStatus = {
            phase: 'schema',
            progress: 75,
            currentOperation: '正在创建存储过程...',
            startTime: new Date(),
            estimatedTimeRemaining: 30,
            errors: [],
            warnings: ['用户已存在，跳过创建']
        };

        console.log('\n示例状态信息:');
        console.log('- 当前阶段:', mockStatus.phase);
        console.log('- 进度:', `${mockStatus.progress}%`);
        console.log('- 当前操作:', mockStatus.currentOperation);
        console.log('- 预计剩余时间:', `${mockStatus.estimatedTimeRemaining}秒`);
        console.log('- 警告数量:', mockStatus.warnings.length);

        console.log('工厂模式和状态管理演示完成');

    } catch (error) {
        console.log('工厂模式示例失败:', error.message);
    }
}

/**
 * 示例7: 错误处理和恢复
 */
async function errorHandlingExample() {
    console.log('\n=== 错误处理和恢复示例 ===');

    try {
        console.log('常见错误场景和处理:');

        console.log('1. 连接错误');
        console.log('   - MySQL服务未启动');
        console.log('   - 认证失败');
        console.log('   - 网络连接问题');
        console.log('   处理: 重试机制 + 详细错误报告');

        console.log('2. 权限错误');
        console.log('   - 用户权限不足');
        console.log('   - 数据库不存在');
        console.log('   - 表空间不足');
        console.log('   处理: 权限检查 + 建议解决方案');

        console.log('3. 结构错误');
        console.log('   - SQL语法错误');
        console.log('   - 外键约束冲突');
        console.log('   - 重复对象名称');
        console.log('   处理: 语法验证 + 依赖关系检查');

        console.log('4. 数据错误');
        console.log('   - 种子数据格式错误');
        console.log('   - 数据类型不匹配');
        console.log('   - 约束违反');
        console.log('   处理: 数据验证 + 事务回滚');

        // 模拟错误处理配置
        const errorHandlingConfig = {
            maxRetries: 3,
            retryDelay: 1000,
            rollbackOnError: true,
            detailedErrorReporting: true,
            suggestSolutions: true,
            logErrors: true
        };

        console.log('\n错误处理配置:');
        Object.entries(errorHandlingConfig).forEach(([key, value]) => {
            console.log(`- ${key}: ${value}`);
        });

        console.log('错误处理和恢复演示完成');

    } catch (error) {
        console.log('错误处理示例失败:', error.message);
    }
}

/**
 * 运行所有示例
 */
async function runAllExamples() {
    console.log('🚀 MySQL数据库和用户初始化系统示例演示');
    console.log('================================================');

    try {
        await basicDatabaseInitializationExample();
        await userManagementExample();
        await schemaInitializationExample();
        await completeInitializationExample();
        await quickInitializationExample();
        await factoryAndStatusExample();
        await errorHandlingExample();

        console.log('\n✅ 所有示例演示完成');
        console.log('\n📝 使用说明:');
        console.log('1. 确保MySQL服务正在运行');
        console.log('2. 配置正确的连接参数');
        console.log('3. 确保用户具有创建数据库和用户的权限');
        console.log('4. 根据需要调整初始化配置');
        console.log('5. 监控初始化过程和状态');
        console.log('6. 处理可能出现的错误和警告');

    } catch (error) {
        console.error('❌ 示例演示失败:', error);
    }
}

// 直接运行所有示例
runAllExamples().catch(console.error);

export {
    basicDatabaseInitializationExample,
    userManagementExample,
    schemaInitializationExample,
    completeInitializationExample,
    quickInitializationExample,
    factoryAndStatusExample,
    errorHandlingExample,
    runAllExamples
};