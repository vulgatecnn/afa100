#!/usr/bin/env node

/**
 * E2E 环境验证脚本
 * 验证所有配置是否正确，服务是否可以正常启动
 */

import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载 E2E 测试环境配置
config({ path: join(__dirname, '../.env.e2e') });

/**
 * 环境验证器
 */
class EnvironmentVerifier {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * 运行所有验证
   */
  async verify() {
    console.log('🔍 开始验证 E2E 测试环境配置...\n');

    // 验证环境变量
    this.verifyEnvironmentVariables();
    
    // 验证端口配置
    this.verifyPortConfiguration();
    
    // 验证数据库配置
    await this.verifyDatabaseConfiguration();
    
    // 验证服务可用性
    await this.verifyServiceAvailability();
    
    // 输出结果
    this.outputResults();
    
    return this.errors.length === 0;
  }

  /**
   * 验证环境变量
   */
  verifyEnvironmentVariables() {
    console.log('📋 验证环境变量配置...');
    
    const requiredVars = [
      'E2E_DB_TYPE',
      'E2E_TEST_DB_HOST',
      'E2E_TEST_DB_PORT',
      'E2E_TEST_DB_NAME',
      'E2E_TEST_DB_USER',
      'E2E_TEST_DB_PASSWORD',
      'E2E_BACKEND_URL',
      'E2E_TENANT_ADMIN_URL',
      'E2E_MERCHANT_ADMIN_URL'
    ];
    
    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (!value) {
        this.errors.push(`缺少必需的环境变量: ${varName}`);
      } else {
        console.log(`  ✅ ${varName}: ${value}`);
      }
    }
    
    // 验证数据库类型
    if (process.env.E2E_DB_TYPE !== 'mysql') {
      this.errors.push(`E2E_DB_TYPE 应该是 'mysql'，当前是: ${process.env.E2E_DB_TYPE}`);
    }
    
    console.log('');
  }

  /**
   * 验证端口配置
   */
  verifyPortConfiguration() {
    console.log('🔌 验证端口配置...');
    
    const expectedPorts = {
      'E2E_BACKEND_PORT': '5100',
      'E2E_TENANT_ADMIN_PORT': '5000',
      'E2E_MERCHANT_ADMIN_PORT': '5050'
    };
    
    for (const [varName, expectedPort] of Object.entries(expectedPorts)) {
      const actualPort = process.env[varName];
      if (actualPort !== expectedPort) {
        this.errors.push(`${varName} 应该是 ${expectedPort}，当前是: ${actualPort}`);
      } else {
        console.log(`  ✅ ${varName}: ${actualPort}`);
      }
    }
    
    // 验证 URL 中的端口
    const urls = {
      'E2E_BACKEND_URL': '5100',
      'E2E_TENANT_ADMIN_URL': '5000',
      'E2E_MERCHANT_ADMIN_URL': '5050'
    };
    
    for (const [varName, expectedPort] of Object.entries(urls)) {
      const url = process.env[varName];
      if (url && !url.includes(`:${expectedPort}`)) {
        this.errors.push(`${varName} 应该包含端口 ${expectedPort}，当前是: ${url}`);
      } else {
        console.log(`  ✅ ${varName}: ${url}`);
      }
    }
    
    console.log('');
  }

  /**
   * 验证数据库配置
   */
  async verifyDatabaseConfiguration() {
    console.log('🗄️ 验证数据库配置...');
    
    try {
      const { E2EDatabaseManager } = await import('../../../../scripts/e2e-database-manager.js');
      const dbManager = new E2EDatabaseManager({ verbose: false });
      
      // 尝试验证数据库环境
      await dbManager.verifyEnvironment();
      console.log('  ✅ 数据库连接正常');
      console.log('  ✅ 数据库配置有效');
      
    } catch (error) {
      this.warnings.push(`数据库验证失败: ${error.message}`);
      console.log(`  ⚠️ 数据库验证失败: ${error.message}`);
      console.log('  💡 这可能是因为数据库尚未初始化，运行测试时会自动创建');
    }
    
    console.log('');
  }

  /**
   * 验证服务可用性
   */
  async verifyServiceAvailability() {
    console.log('🚀 验证服务管理器...');
    
    try {
      const { E2EServiceManager } = await import('../../../../scripts/e2e-service-manager.js');
      const serviceManager = new E2EServiceManager({ verbose: false });
      
      console.log('  ✅ 服务管理器加载成功');
      
      // 检查端口是否被占用
      const ports = [5100, 5000, 5050];
      for (const port of ports) {
        const isOccupied = await this.checkPortOccupied(port);
        if (isOccupied) {
          this.warnings.push(`端口 ${port} 当前被占用，测试时会自动清理`);
          console.log(`  ⚠️ 端口 ${port} 被占用`);
        } else {
          console.log(`  ✅ 端口 ${port} 可用`);
        }
      }
      
    } catch (error) {
      this.errors.push(`服务管理器验证失败: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * 检查端口是否被占用
   */
  async checkPortOccupied(port) {
    const net = await import('net');
    
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => resolve(false));
        server.close();
      });
      
      server.on('error', () => resolve(true));
    });
  }

  /**
   * 输出验证结果
   */
  outputResults() {
    console.log('📊 验证结果:');
    console.log('='.repeat(50));
    
    if (this.errors.length === 0) {
      console.log('✅ 所有必需配置验证通过');
    } else {
      console.log('❌ 发现配置错误:');
      for (const error of this.errors) {
        console.log(`   • ${error}`);
      }
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️ 警告信息:');
      for (const warning of this.warnings) {
        console.log(`   • ${warning}`);
      }
    }
    
    console.log('\n💡 下一步:');
    if (this.errors.length === 0) {
      console.log('   1. 运行 "pnpm test:e2e:db:init" 初始化测试数据库');
      console.log('   2. 运行 "pnpm test:e2e" 开始端到端测试');
      console.log('   3. 或运行 "pnpm test:e2e:env:start" 手动启动测试环境');
    } else {
      console.log('   1. 修复上述配置错误');
      console.log('   2. 重新运行此验证脚本');
    }
    
    console.log('\n📚 相关命令:');
    console.log('   pnpm test:e2e:env:status  - 查看环境状态');
    console.log('   pnpm test:e2e:db:verify   - 验证数据库');
    console.log('   pnpm test:e2e:headed      - 运行可视化测试');
    console.log('   pnpm test:e2e:report      - 查看测试报告');
  }
}

/**
 * 主函数
 */
async function main() {
  const verifier = new EnvironmentVerifier();
  const success = await verifier.verify();
  
  process.exit(success ? 0 : 1);
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ 验证失败:', error);
    process.exit(1);
  });
}

export { EnvironmentVerifier };