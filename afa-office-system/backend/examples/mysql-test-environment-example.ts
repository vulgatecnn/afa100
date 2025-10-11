/**
 * MySQL测试环境管理器使用示例
 * 展示如何使用MySQL测试环境管理器创建和管理测试环境
 */

import { createMySQLTestEnvironmentManager } from '../src/utils/mysql-test-environment-manager.js';

async function demonstrateMySQLTestEnvironment() {
    console.log('🚀 MySQL测试环境管理器示例');

    // 创建MySQL测试环境管理器（使用环境变量配置）
    const manager = createMySQLTestEnvironmentManager({
        host: process.env.TEST_DB_HOST || '127.0.0.1',
        port: parseInt(process.env.TEST_DB_PORT || '3306'),
        user: process.env.TEST_DB_USER || 'root',
        password: process.env.TEST_DB_PASSWORD || '111111'
    });

    try {
        // 获取初始状态
        console.log('📊 初始状态:', manager.getManagerStatus());

        // 注意：以下代码需要实际的MySQL服务器才能运行
        // 在实际使用中，你可以取消注释这些代码

        /*
        // 创建测试环境
        console.log('🏗️ 创建测试环境...');
        const env1 = await manager.createIsolatedEnvironment({
          databasePrefix: 'demo',
          isolationLevel: 'test'
        });
        
        console.log('✅ 测试环境创建成功:', env1.id);
        console.log('📁 数据库名称:', env1.databaseName);
    
        // 创建第二个环境用于隔离测试
        const env2 = await manager.createIsolatedEnvironment({
          databasePrefix: 'demo2',
          isolationLevel: 'test'
        });
    
        // 验证环境隔离
        console.log('🔍 验证环境隔离...');
        const isIsolated = await manager.validateEnvironmentIsolation(env1, env2);
        console.log('🛡️ 环境隔离状态:', isIsolated ? '✅ 隔离成功' : '❌ 隔离失败');
    
        // 获取环境统计信息
        const stats = await manager.getEnvironmentStats(env1);
        console.log('📈 环境统计信息:', stats);
    
        // 生成环境报告
        const report = await manager.generateEnvironmentReport();
        console.log('📋 环境报告:', report);
    
        // 清理环境
        console.log('🧹 清理测试环境...');
        await env1.cleanup();
        await env2.cleanup();
        */

        console.log('📊 最终状态:', manager.getManagerStatus());

    } catch (error) {
        console.error('❌ 示例执行失败:', error);
    } finally {
        // 安全关闭管理器
        await manager.shutdown();
        console.log('✅ 示例执行完成');
    }
}

// 如果直接运行此文件，执行示例
if (import.meta.url === `file://${process.argv[1]}`) {
    demonstrateMySQLTestEnvironment().catch(console.error);
}

export { demonstrateMySQLTestEnvironment };