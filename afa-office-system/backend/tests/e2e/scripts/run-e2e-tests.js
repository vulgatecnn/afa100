#!/usr/bin/env node

/**
 * E2E 测试运行器
 * 集成环境管理器和 Playwright 测试执行
 */

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../../..');

// 加载 E2E 测试环境配置
config({ path: join(__dirname, '../.env.e2e') });

/**
 * E2E 测试运行器
 */
class E2ETestRunner {
  constructor(options = {}) {
    this.options = {
      headless: options.headless !== false,
      workers: options.workers || (process.env.CI ? 1 : 2),
      retries: options.retries || (process.env.CI ? 2 : 0),
      timeout: options.timeout || 30000,
      project: options.project || null,
      grep: options.grep || null,
      reporter: options.reporter || 'html',
      verbose: options.verbose !== false,
      ...options
    };
    
    this.environmentManager = null;
    this.isEnvironmentStarted = false;
  }

  /**
   * 运行 E2E 测试
   */
  async run() {
    console.log('🚀 开始运行端到端测试...');
    
    try {
      // 1. 启动测试环境
      await this.startEnvironment();
      
      // 2. 运行 Playwright 测试
      const testResult = await this.runPlaywrightTests();
      
      // 3. 输出测试结果
      this.outputTestResults(testResult);
      
      return testResult.exitCode === 0;
      
    } catch (error) {
      console.error('❌ E2E 测试运行失败:', error.message);
      return false;
    } finally {
      // 4. 清理环境
      await this.stopEnvironment();
    }
  }

  /**
   * 启动测试环境
   */
  async startEnvironment() {
    console.log('🔧 启动测试环境...');
    
    // 使用环境管理器启动服务
    const { E2EEnvironmentManager } = await import('../../../../scripts/e2e-environment-manager.js');
    
    this.environmentManager = new E2EEnvironmentManager({
      verbose: this.options.verbose,
      environment: 'test',
      cleanupOnExit: true,
      cleanupDatabase: true,
      cleanupServices: true,
    });
    
    const result = await this.environmentManager.startEnvironment();
    this.isEnvironmentStarted = true;
    
    console.log('✅ 测试环境启动完成');
    console.log(`   会话ID: ${result.sessionId}`);
    console.log(`   数据库状态: ${result.database.status}`);
    console.log('   服务状态:');
    for (const [name, info] of Object.entries(result.services)) {
      console.log(`     ${name}: ${info.status} (端口 ${info.port})`);
    }
  }

  /**
   * 停止测试环境
   */
  async stopEnvironment() {
    if (this.environmentManager && this.isEnvironmentStarted) {
      console.log('🛑 停止测试环境...');
      await this.environmentManager.stopEnvironment();
      console.log('✅ 测试环境已停止');
    }
  }

  /**
   * 运行 Playwright 测试
   */
  async runPlaywrightTests() {
    console.log('🎭 运行 Playwright 测试...');
    
    const playwrightArgs = this.buildPlaywrightArgs();
    
    return new Promise((resolve) => {
      const playwrightProcess = spawn('npx', ['playwright', 'test', ...playwrightArgs], {
        cwd: join(__dirname, '..'),
        stdio: 'inherit',
        env: {
          ...process.env,
          // 确保 Playwright 不会启动自己的 webServer
          PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '0',
        }
      });
      
      playwrightProcess.on('close', (code) => {
        resolve({
          exitCode: code,
          success: code === 0
        });
      });
      
      playwrightProcess.on('error', (error) => {
        console.error('Playwright 进程错误:', error);
        resolve({
          exitCode: 1,
          success: false,
          error
        });
      });
    });
  }

  /**
   * 构建 Playwright 命令行参数
   */
  buildPlaywrightArgs() {
    const args = [];
    
    // 配置文件
    args.push('--config', 'config/playwright.config.ts');
    
    // 头部模式
    if (this.options.headless) {
      args.push('--headed');
    }
    
    // 工作进程数
    if (this.options.workers) {
      args.push('--workers', this.options.workers.toString());
    }
    
    // 重试次数
    if (this.options.retries) {
      args.push('--retries', this.options.retries.toString());
    }
    
    // 超时时间
    if (this.options.timeout) {
      args.push('--timeout', this.options.timeout.toString());
    }
    
    // 项目过滤
    if (this.options.project) {
      args.push('--project', this.options.project);
    }
    
    // 测试过滤
    if (this.options.grep) {
      args.push('--grep', this.options.grep);
    }
    
    // 报告器
    if (this.options.reporter) {
      args.push('--reporter', this.options.reporter);
    }
    
    return args;
  }

  /**
   * 输出测试结果
   */
  outputTestResults(result) {
    console.log('\n📊 测试结果:');
    
    if (result.success) {
      console.log('✅ 所有测试通过');
    } else {
      console.log('❌ 测试失败');
      console.log(`   退出代码: ${result.exitCode}`);
    }
    
    console.log('\n📋 测试报告:');
    console.log('   HTML 报告: playwright-report/index.html');
    console.log('   JSON 结果: reports/test-results.json');
    console.log('   JUnit 结果: reports/junit-results.xml');
  }
}

/**
 * 主函数
 */
async function main() {
  const options = {
    headless: !process.argv.includes('--headed'),
    workers: getArgValue('--workers'),
    retries: getArgValue('--retries'),
    timeout: getArgValue('--timeout'),
    project: getArgValue('--project'),
    grep: getArgValue('--grep'),
    reporter: getArgValue('--reporter') || 'html',
    verbose: !process.argv.includes('--quiet'),
  };
  
  const runner = new E2ETestRunner(options);
  const success = await runner.run();
  
  process.exit(success ? 0 : 1);
}

/**
 * 获取命令行参数值
 */
function getArgValue(argName) {
  const index = process.argv.indexOf(argName);
  if (index !== -1 && index + 1 < process.argv.length) {
    const value = process.argv[index + 1];
    // 尝试转换为数字
    const numValue = parseInt(value);
    return isNaN(numValue) ? value : numValue;
  }
  return null;
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ 运行失败:', error);
    process.exit(1);
  });
}

export { E2ETestRunner };