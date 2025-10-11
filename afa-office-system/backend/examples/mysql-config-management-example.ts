/**
 * MySQL配置管理系统使用示例
 * 演示如何使用MySQL配置管理器、连接监控和连接管理器
 */

import { 
  MySQLConfigManager,
  mySQLConfigManager,
  getMySQLConfigTemplate,
  validateMySQLConfig,
  getOptimizedMySQLConfig,
  getMySQLConfigSummary,
  checkMySQLCompatibility,
  getMySQLEnvironmentGuide
} from '../src/config/mysql-config-manager';

import {
  MySQLConnectionManager,
  createMySQLConnectionManager,
  MySQLConnectionManagerFactory
} from '../src/utils/mysql-connection-manager';

import {
  MySQLConnectionMonitor,
  createMySQLConnectionMonitor,
  MySQLConnectionMonitorFactory,
  ConnectionStatus
} from '../src/utils/mysql-connection-monitor';

import { DatabaseType } from '../src/config/database-config-manager';

/**
 * 示例1: 基础MySQL配置管理
 */
async function basicConfigManagementExample() {
  console.log('\n=== 基础MySQL配置管理示例 ===');

  // 1. 获取MySQL配置模板
  const testConfig = getMySQLConfigTemplate('test');
  console.log('测试环境配置:', getMySQLConfigSummary(testConfig));

  const prodConfig = getMySQLConfigTemplate('production');
  console.log('生产环境配置:', getMySQLConfigSummary(prodConfig));

  // 2. 验证配置
  const validationResult = validateMySQLConfig(testConfig);
  console.log('配置验证结果:', {
    isValid: validationResult.isValid,
    errors: validationResult.errors,
    warnings: validationResult.warnings,
    recommendations: validationResult.recommendations
  });

  // 3. 优化配置
  const optimizedConfig = getOptimizedMySQLConfig(testConfig, 'test');
  console.log('优化后配置:', getMySQLConfigSummary(optimizedConfig));

  // 4. 检查兼容性
  const compatibility = checkMySQLCompatibility(optimizedConfig);
  console.log('兼容性检查:', compatibility);

  // 5. 生成环境变量指南
  console.log('\n环境变量配置指南:');
  console.log(getMySQLEnvironmentGuide());
}

/**
 * 示例2: MySQL连接监控
 */
async function connectionMonitoringExample() {
  console.log('\n=== MySQL连接监控示例 ===');

  // 获取配置
  const config = getMySQLConfigTemplate('test');
  
  try {
    // 创建连接监控器
    const monitor = createMySQLConnectionMonitor(config, {
      healthCheckInterval: 10000,  // 10秒检查一次
      maxErrorCount: 3,
      reconnectDelay: 2000,
      maxReconnectAttempts: 3,
      slowQueryThreshold: 500,     // 500ms慢查询阈值
      enableDetailedLogging: true
    });

    // 设置事件监听器
    monitor.on('connected', (health) => {
      console.log('✅ 连接已建立:', health.status);
    });

    monitor.on('error', (error) => {
      console.log('❌ 连接错误:', error.message);
    });

    monitor.on('health:critical', (health) => {
      console.log('⚠️ 健康状态严重:', health.errorCount, '个错误');
    });

    monitor.on('slow:query', ({ responseTime, threshold }) => {
      console.log(`🐌 慢查询检测: ${responseTime}ms (阈值: ${threshold}ms)`);
    });

    // 注意：这里只是示例，实际使用时需要真实的MySQL连接池
    console.log('监控器已创建，等待连接池初始化...');
    
    // 获取监控状态
    setTimeout(() => {
      const health = monitor.getHealth();
      const statistics = monitor.getStatistics();
      const errors = monitor.getErrorHistory();
      
      console.log('健康状态:', health);
      console.log('统计信息:', statistics);
      console.log('错误历史:', errors.length, '个错误');
      
      // 清理
      monitor.destroy();
    }, 1000);

  } catch (error) {
    console.log('监控器创建失败:', error.message);
  }
}

/**
 * 示例3: 完整的连接管理
 */
async function connectionManagementExample() {
  console.log('\n=== MySQL连接管理示例 ===');

  // 获取配置
  const config = getMySQLConfigTemplate('test');
  
  try {
    // 创建连接管理器
    const manager = createMySQLConnectionManager(config, {
      monitor: {
        healthCheckInterval: 15000,
        maxErrorCount: 5,
        slowQueryThreshold: 1000,
        enableDetailedLogging: true
      },
      autoReconnect: true,
      maxReconnectAttempts: 3,
      reconnectDelay: 3000,
      healthCheckEnabled: true,
      enableLogging: true,
      logLevel: 'info'
    });

    // 初始化连接管理器
    console.log('正在初始化连接管理器...');
    // await manager.initialize(); // 注释掉，因为没有真实的MySQL服务器

    // 获取状态
    const status = manager.getStatus();
    console.log('连接管理器状态:', {
      isConnected: status.isConnected,
      uptime: status.uptime,
      reconnectAttempts: status.reconnectAttempts,
      healthStatus: status.health.status,
      errorCount: status.health.errorCount
    });

    // 获取详细报告
    const report = manager.getDetailedReport();
    console.log('详细报告已生成，包含以下部分:');
    console.log('- 管理器状态和配置');
    console.log('- 监控器详细信息');
    console.log('- 连接池配置');

    // 清理
    await manager.destroy();
    console.log('连接管理器已销毁');

  } catch (error) {
    console.log('连接管理器操作失败:', error.message);
  }
}

/**
 * 示例4: 工厂模式使用
 */
async function factoryPatternExample() {
  console.log('\n=== 工厂模式使用示例 ===');

  const config = getMySQLConfigTemplate('test');

  try {
    // 使用连接管理器工厂
    console.log('创建测试环境连接管理器...');
    // const testManager = await MySQLConnectionManagerFactory.getOrCreateManager('test', config);
    
    console.log('创建开发环境连接管理器...');
    const devConfig = getMySQLConfigTemplate('development');
    // const devManager = await MySQLConnectionManagerFactory.getOrCreateManager('dev', devConfig);

    // 获取所有管理器状态
    const allStatus = MySQLConnectionManagerFactory.getAllManagerStatus();
    console.log('所有管理器状态:', Object.keys(allStatus));

    // 获取管理器列表
    const managerKeys = MySQLConnectionManagerFactory.getManagerKeys();
    console.log('管理器列表:', managerKeys);

    // 清理所有管理器
    await MySQLConnectionManagerFactory.destroyAllManagers();
    console.log('所有管理器已销毁');

  } catch (error) {
    console.log('工厂模式操作失败:', error.message);
  }
}

/**
 * 示例5: 配置验证和错误处理
 */
async function configValidationExample() {
  console.log('\n=== 配置验证和错误处理示例 ===');

  // 创建一个有问题的配置
  const invalidConfig = {
    type: DatabaseType.MYSQL,
    host: '',  // 空主机名
    port: 99999,  // 无效端口
    user: '',  // 空用户名
    password: '123',  // 弱密码
    connectionLimit: -1,  // 无效连接数
    acquireTimeout: 0  // 无效超时时间
  };

  // 验证配置
  const validation = validateMySQLConfig(invalidConfig);
  console.log('无效配置验证结果:');
  console.log('- 是否有效:', validation.isValid);
  console.log('- 错误列表:', validation.errors);
  console.log('- 警告列表:', validation.warnings);
  console.log('- 建议列表:', validation.recommendations);

  // 创建一个更好的配置
  const betterConfig = {
    type: DatabaseType.MYSQL,
    host: '127.0.0.1',
    port: 3306,
    user: 'app_user',
    password: 'secure_password_123',
    database: 'test_db',
    connectionLimit: 10,
    acquireTimeout: 30000,
    timeout: 30000,
    charset: 'utf8mb4',
    timezone: '+00:00',
    supportBigNumbers: true,
    bigNumberStrings: true,
    ssl: false
  };

  const betterValidation = validateMySQLConfig(betterConfig);
  console.log('\n改进配置验证结果:');
  console.log('- 是否有效:', betterValidation.isValid);
  console.log('- 错误数量:', betterValidation.errors.length);
  console.log('- 警告数量:', betterValidation.warnings.length);
  console.log('- 建议数量:', betterValidation.recommendations.length);

  // 检查兼容性
  const compatibility = checkMySQLCompatibility(betterConfig);
  console.log('- 兼容性:', compatibility.compatible);
  if (!compatibility.compatible) {
    console.log('- 兼容性问题:', compatibility.issues);
  }
}

/**
 * 示例6: 环境特定配置
 */
async function environmentSpecificConfigExample() {
  console.log('\n=== 环境特定配置示例 ===');

  const environments = ['development', 'test', 'production'];

  for (const env of environments) {
    console.log(`\n--- ${env.toUpperCase()} 环境配置 ---`);
    
    const config = getMySQLConfigTemplate(env);
    const optimized = getOptimizedMySQLConfig(config, env);
    
    console.log('基础配置:', getMySQLConfigSummary(config));
    console.log('优化配置:', getMySQLConfigSummary(optimized));
    
    const validation = validateMySQLConfig(optimized);
    console.log('验证结果:', validation.isValid ? '✅ 有效' : '❌ 无效');
    
    if (validation.warnings.length > 0) {
      console.log('警告:', validation.warnings.slice(0, 2).join(', '));
    }
    
    if (validation.recommendations.length > 0) {
      console.log('建议:', validation.recommendations.slice(0, 2).join(', '));
    }
  }
}

/**
 * 运行所有示例
 */
async function runAllExamples() {
  console.log('🚀 MySQL配置管理系统示例演示');
  console.log('=====================================');

  try {
    await basicConfigManagementExample();
    await connectionMonitoringExample();
    await connectionManagementExample();
    await factoryPatternExample();
    await configValidationExample();
    await environmentSpecificConfigExample();
    
    console.log('\n✅ 所有示例执行完成');
  } catch (error) {
    console.error('❌ 示例执行失败:', error);
  }
}

// 直接运行所有示例
runAllExamples().catch(console.error);

export {
  basicConfigManagementExample,
  connectionMonitoringExample,
  connectionManagementExample,
  factoryPatternExample,
  configValidationExample,
  environmentSpecificConfigExample,
  runAllExamples
};