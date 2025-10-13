#!/usr/bin/env node

/**
 * E2E 测试环境管理器
 * 统一管理E2E测试环境的服务启动和数据库管理
 */

import { E2EServiceManager } from './e2e-service-manager.js';
import { E2EDatabaseManager } from './e2e-database-manager.js';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * E2E 环境管理器
 */
class E2EEnvironmentManager {
  constructor(options = {}) {
    this.config = {
      // 环境配置
      environment: options.environment || 'test',
      
      // 启动顺序配置
      startupSequence: {
        database: true,
        services: true,
        verification: true,
      },
      
      // 清理配置
      cleanup: {
        onExit: options.cleanupOnExit !== false,
        onError: options.cleanupOnError !== false,
        database: options.cleanupDatabase !== false,
        services: options.cleanupServices !== false,
      },
      
      // 日志配置
      logging: {
        enabled: options.verbose !== false,
        logFile: join(rootDir, 'logs', 'e2e-environment.log'),
      },
      
      ...options,
    };
    
    // 初始化管理器
    this.serviceManager = new E2EServiceManager({
      environment: this.config.environment,
      verbose: this.config.logging.enabled,
    });
    
    this.databaseManager = new E2EDatabaseManager({
      environment: this.config.environment,
      verbose: this.config.logging.enabled,
      snapshotEnabled: true,
      autoCleanup: this.config.cleanup.database,
    });
    
    this.isRunning = false;
    this.currentSession = null;
    
    // 确保日志目录存在
    this.ensureLogDirectory();
    
    // 注册清理处理器
    this.registerCleanupHandlers();
  }

  /**
   * 启动完整的E2E测试环境
   */
  async startEnvironment() {
    this.log('🚀 开始启动E2E测试环境...');
    
    try {
      const sessionId = `e2e-session-${Date.now()}`;
      this.currentSession = sessionId;
      
      // 1. 初始化数据库环境
      if (this.config.startupSequence.database) {
        await this.setupDatabase();
      }
      
      // 2. 启动服务
      if (this.config.startupSequence.services) {
        await this.startServices();
      }
      
      // 3. 验证环境
      if (this.config.startupSequence.verification) {
        await this.verifyEnvironment();
      }
      
      // 4. 开始测试会话
      await this.databaseManager.startTestSession(sessionId);
      
      this.isRunning = true;
      this.log('✅ E2E测试环境启动完成');
      
      return {
        sessionId,
        services: this.serviceManager.getServiceStatus(),
        database: await this.getDatabaseStatus(),
      };
      
    } catch (error) {
      this.log(`❌ E2E测试环境启动失败: ${error.message}`, 'error');
      await this.stopEnvironment();
      throw error;
    }
  }

  /**
   * 停止E2E测试环境
   */
  async stopEnvironment() {
    if (!this.isRunning) {
      return;
    }
    
    this.log('🛑 开始停止E2E测试环境...');
    
    try {
      // 1. 结束测试会话
      if (this.currentSession) {
        await this.databaseManager.endTestSession(this.currentSession, this.config.cleanup.database);
        this.currentSession = null;
      }
      
      // 2. 停止服务
      if (this.config.cleanup.services) {
        await this.serviceManager.stopAllServices();
      }
      
      // 3. 清理数据库（可选）
      if (this.config.cleanup.database) {
        await this.databaseManager.cleanupTestData();
      }
      
      this.isRunning = false;
      this.log('✅ E2E测试环境停止完成');
      
    } catch (error) {
      this.log(`⚠️ 停止E2E测试环境时出错: ${error.message}`, 'error');
    }
  }

  /**
   * 设置数据库环境
   */
  async setupDatabase() {
    this.log('🗄️ 设置数据库环境...');
    
    try {
      // 验证数据库环境
      const isValid = await this.isDatabaseEnvironmentValid();
      
      if (!isValid) {
        this.log('📋 数据库环境无效，开始初始化...');
        await this.databaseManager.createE2EDatabase();
        await this.databaseManager.initializeTestData();
      } else {
        this.log('📋 数据库环境有效，清理现有数据...');
        await this.databaseManager.cleanupTestData();
        await this.databaseManager.initializeTestData();
      }
      
      await this.databaseManager.verifyEnvironment();
      this.log('✅ 数据库环境设置完成');
      
    } catch (error) {
      this.log(`❌ 数据库环境设置失败: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 启动服务
   */
  async startServices() {
    this.log('🚀 启动服务...');
    
    try {
      await this.serviceManager.startAllServices();
      this.log('✅ 服务启动完成');
      
    } catch (error) {
      this.log(`❌ 服务启动失败: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 验证环境
   */
  async verifyEnvironment() {
    this.log('🔍 验证环境状态...');
    
    try {
      // 验证服务状态
      await this.serviceManager.verifyAllServices();
      
      // 验证数据库状态
      await this.databaseManager.verifyEnvironment();
      
      this.log('✅ 环境验证通过');
      
    } catch (error) {
      this.log(`❌ 环境验证失败: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 检查数据库环境是否有效
   */
  async isDatabaseEnvironmentValid() {
    try {
      await this.databaseManager.verifyEnvironment();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取数据库状态
   */
  async getDatabaseStatus() {
    try {
      await this.databaseManager.verifyEnvironment();
      return {
        status: 'healthy',
        database: this.databaseManager.config.e2eTest.database,
        host: this.databaseManager.config.e2eTest.host,
        port: this.databaseManager.config.e2eTest.port,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * 获取环境状态
   */
  getEnvironmentStatus() {
    return {
      isRunning: this.isRunning,
      currentSession: this.currentSession,
      services: this.serviceManager.getServiceStatus(),
      // database status will be fetched async
    };
  }

  /**
   * 创建数据快照
   */
  async createSnapshot(snapshotId, description) {
    this.log(`📸 创建数据快照: ${snapshotId}`);
    return await this.databaseManager.createSnapshot(snapshotId, description);
  }

  /**
   * 恢复数据快照
   */
  async restoreSnapshot(snapshotId) {
    this.log(`🔄 恢复数据快照: ${snapshotId}`);
    return await this.databaseManager.restoreSnapshot(snapshotId);
  }

  /**
   * 重启环境
   */
  async restartEnvironment() {
    this.log('🔄 重启E2E测试环境...');
    
    await this.stopEnvironment();
    await this.sleep(2000); // 等待2秒确保完全停止
    return await this.startEnvironment();
  }

  /**
   * 重置环境
   */
  async resetEnvironment() {
    this.log('🔄 重置E2E测试环境...');
    
    try {
      // 停止当前环境
      await this.stopEnvironment();
      
      // 重置数据库
      await this.databaseManager.destroyE2EDatabase();
      await this.databaseManager.createE2EDatabase();
      await this.databaseManager.initializeTestData();
      
      // 重新启动环境
      return await this.startEnvironment();
      
    } catch (error) {
      this.log(`❌ 环境重置失败: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 等待指定时间
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 日志记录
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (this.config.logging.enabled) {
      console.log(logMessage);
    }
    
    // 写入日志文件
    try {
      const logEntry = `${logMessage}\n`;
      writeFileSync(this.config.logging.logFile, logEntry, { flag: 'a' });
    } catch (error) {
      // 忽略日志写入错误
    }
  }

  /**
   * 确保日志目录存在
   */
  ensureLogDirectory() {
    const logDir = dirname(this.config.logging.logFile);
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * 注册清理处理器
   */
  registerCleanupHandlers() {
    const cleanup = async () => {
      if (this.isRunning) {
        await this.stopEnvironment();
      }
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('beforeExit', cleanup);
    
    // 处理未捕获的异常
    process.on('uncaughtException', async (error) => {
      this.log(`未捕获的异常: ${error.message}`, 'error');
      if (this.config.cleanup.onError) {
        await this.stopEnvironment();
      }
      process.exit(1);
    });
    
    process.on('unhandledRejection', async (reason) => {
      this.log(`未处理的Promise拒绝: ${reason}`, 'error');
      if (this.config.cleanup.onError) {
        await this.stopEnvironment();
      }
      process.exit(1);
    });
  }
}

/**
 * 主函数
 */
async function main() {
  const command = process.argv[2] || 'start';
  const options = {
    verbose: !process.argv.includes('--quiet'),
    environment: process.env.NODE_ENV || 'test',
    cleanupOnExit: !process.argv.includes('--no-cleanup'),
    cleanupDatabase: !process.argv.includes('--no-db-cleanup'),
    cleanupServices: !process.argv.includes('--no-service-cleanup'),
  };
  
  const manager = new E2EEnvironmentManager(options);
  
  try {
    switch (command) {
      case 'start':
        const result = await manager.startEnvironment();
        
        console.log('\n🎉 E2E测试环境启动成功！');
        console.log('\n📊 环境状态:');
        console.log(`   会话ID: ${result.sessionId}`);
        console.log(`   数据库: ${result.database.status}`);
        console.log('   服务状态:');
        for (const [name, info] of Object.entries(result.services)) {
          console.log(`     ${name}: ${info.status} (端口 ${info.port})`);
        }
        
        console.log('\n💡 使用说明:');
        console.log('   - 后端API: http://localhost:5100');
        console.log('   - 租务管理端: http://localhost:5000');
        console.log('   - 商户管理端: http://localhost:5050');
        console.log('   - 按 Ctrl+C 停止环境');
        
        // 保持进程运行
        await new Promise(() => {}); // 永远等待
        break;
        
      case 'stop':
        await manager.stopEnvironment();
        console.log('✅ E2E测试环境已停止');
        break;
        
      case 'restart':
        await manager.restartEnvironment();
        console.log('✅ E2E测试环境已重启');
        break;
        
      case 'reset':
        await manager.resetEnvironment();
        console.log('✅ E2E测试环境已重置');
        break;
        
      case 'status':
        const status = manager.getEnvironmentStatus();
        const dbStatus = await manager.getDatabaseStatus();
        
        console.log('📊 E2E测试环境状态:');
        console.log(`   运行状态: ${status.isRunning ? '运行中' : '已停止'}`);
        console.log(`   当前会话: ${status.currentSession || '无'}`);
        console.log(`   数据库状态: ${dbStatus.status}`);
        console.log('   服务状态:');
        for (const [name, info] of Object.entries(status.services)) {
          const uptime = Math.floor(info.uptime / 1000);
          console.log(`     ${name}: ${info.status} (端口 ${info.port}, 运行时间 ${uptime}s)`);
        }
        break;
        
      case 'verify':
        await manager.verifyEnvironment();
        console.log('✅ E2E测试环境验证通过');
        break;
        
      case 'snapshot':
        const snapshotId = process.argv[3] || `snapshot-${Date.now()}`;
        const description = process.argv[4] || '手动创建的快照';
        await manager.createSnapshot(snapshotId, description);
        console.log(`✅ 快照创建完成: ${snapshotId}`);
        break;
        
      case 'restore':
        const restoreId = process.argv[3];
        if (!restoreId) {
          console.error('❌ 请指定要恢复的快照ID');
          process.exit(1);
        }
        await manager.restoreSnapshot(restoreId);
        console.log(`✅ 快照恢复完成: ${restoreId}`);
        break;
        
      default:
        console.log('❌ 未知命令:', command);
        console.log('');
        console.log('用法: node e2e-environment-manager.js <command> [options]');
        console.log('');
        console.log('命令:');
        console.log('  start             - 启动E2E测试环境');
        console.log('  stop              - 停止E2E测试环境');
        console.log('  restart           - 重启E2E测试环境');
        console.log('  reset             - 重置E2E测试环境');
        console.log('  status            - 查看环境状态');
        console.log('  verify            - 验证环境');
        console.log('  snapshot <id>     - 创建数据快照');
        console.log('  restore <id>      - 恢复数据快照');
        console.log('');
        console.log('选项:');
        console.log('  --quiet           - 静默模式');
        console.log('  --no-cleanup      - 禁用退出时清理');
        console.log('  --no-db-cleanup   - 禁用数据库清理');
        console.log('  --no-service-cleanup - 禁用服务清理');
        console.log('');
        console.log('环境变量:');
        console.log('  NODE_ENV          - 环境类型 (默认: test)');
        console.log('  E2E_TEST_DB_HOST  - 数据库主机');
        console.log('  E2E_TEST_DB_PORT  - 数据库端口');
        console.log('  E2E_TEST_DB_NAME  - 数据库名称');
        console.log('  E2E_TEST_DB_USER  - 数据库用户');
        console.log('  E2E_TEST_DB_PASSWORD - 数据库密码');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    console.error('💡 请检查:');
    console.error('   1. MySQL服务是否运行');
    console.error('   2. 端口是否被占用 (5000, 5050, 5100)');
    console.error('   3. 数据库配置是否正确');
    console.error('   4. pnpm依赖是否安装');
    console.error('   5. 环境变量是否正确设置');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { E2EEnvironmentManager };