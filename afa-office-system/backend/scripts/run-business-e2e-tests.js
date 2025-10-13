#!/usr/bin/env node

/**
 * 业务场景端到端测试运行脚本
 * 提供便捷的测试执行和报告生成功能
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置选项
const config = {
  testDir: 'tests/e2e/specs/business',
  configFile: 'tests/e2e/config/business-scenarios.config.ts',
  reportsDir: 'tests/e2e/reports',
  timeout: 10 * 60 * 1000, // 10分钟
  retries: 2,
  workers: process.env.CI ? 1 : 2,
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${message}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logStep(step, message) {
  log(`\n[步骤 ${step}] ${message}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// 检查环境
function checkEnvironment() {
  logStep(1, '检查测试环境');

  try {
    // 检查Node.js版本
    const nodeVersion = process.version;
    log(`Node.js版本: ${nodeVersion}`);

    // 检查pnpm
    try {
      execSync('pnpm --version', { stdio: 'pipe' });
      logSuccess('pnpm 已安装');
    } catch (error) {
      logError('pnpm 未安装，请先安装 pnpm');
      process.exit(1);
    }

    // 检查Playwright
    try {
      execSync('npx playwright --version', { stdio: 'pipe' });
      logSuccess('Playwright 已安装');
    } catch (error) {
      logWarning('Playwright 未安装，正在安装...');
      execSync('npx playwright install', { stdio: 'inherit' });
    }

    // 检查测试文件
    const testFiles = [
      'tests/e2e/specs/business/complete-user-workflows.e2e.ts',
      'tests/e2e/specs/business/complex-business-scenarios.e2e.ts',
    ];

    for (const file of testFiles) {
      if (fs.existsSync(file)) {
        logSuccess(`测试文件存在: ${file}`);
      } else {
        logError(`测试文件不存在: ${file}`);
        process.exit(1);
      }
    }
  } catch (error) {
    logError(`环境检查失败: ${error.message}`);
    process.exit(1);
  }
}

// 准备测试环境
function prepareTestEnvironment() {
  logStep(2, '准备测试环境');

  try {
    // 创建报告目录
    if (!fs.existsSync(config.reportsDir)) {
      fs.mkdirSync(config.reportsDir, { recursive: true });
      logSuccess('创建报告目录');
    }

    // 设置环境变量
    process.env.NODE_ENV = 'test';
    process.env.TEST_DATA_SEED = '12345';
    process.env.RESET_DB_BEFORE_TESTS = 'true';
    process.env.HEADLESS = process.env.HEADLESS || 'true';

    logSuccess('环境变量设置完成');

    // 清理旧的报告
    const reportFiles = [
      'tests/e2e/reports/business-scenarios-results.json',
      'tests/e2e/reports/business-scenarios-junit.xml',
    ];

    for (const file of reportFiles) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        log(`清理旧报告: ${file}`);
      }
    }
  } catch (error) {
    logError(`环境准备失败: ${error.message}`);
    process.exit(1);
  }
}

// 运行测试
function runTests(testPattern = '') {
  logStep(3, '运行业务场景测试');

  try {
    let command = `npx playwright test --config=${config.configFile}`;

    // 添加测试模式参数
    if (testPattern) {
      command += ` --grep "${testPattern}"`;
    }

    // 添加其他参数
    if (process.env.DEBUG === 'true') {
      command += ' --debug';
    }

    if (process.env.HEADED === 'true') {
      command += ' --headed';
    }

    log(`执行命令: ${command}`, 'cyan');

    execSync(command, {
      stdio: 'inherit',
      timeout: config.timeout,
    });

    logSuccess('测试执行完成');
  } catch (error) {
    if (error.status !== 0) {
      logError('部分测试失败，请查看详细报告');
      return false;
    } else {
      logError(`测试执行失败: ${error.message}`);
      return false;
    }
  }

  return true;
}

// 生成测试报告
function generateReport() {
  logStep(4, '生成测试报告');

  try {
    // 检查JSON报告是否存在
    const jsonReportPath = 'tests/e2e/reports/business-scenarios-results.json';
    if (fs.existsSync(jsonReportPath)) {
      const reportData = JSON.parse(fs.readFileSync(jsonReportPath, 'utf8'));

      log('\n📊 测试结果统计:', 'bright');
      log(`总测试数: ${reportData.stats?.total || 0}`);
      log(`通过: ${reportData.stats?.passed || 0}`, 'green');
      log(`失败: ${reportData.stats?.failed || 0}`, reportData.stats?.failed > 0 ? 'red' : 'reset');
      log(`跳过: ${reportData.stats?.skipped || 0}`, 'yellow');
      log(`执行时间: ${reportData.stats?.duration || 0}ms`);

      // 显示失败的测试
      if (reportData.stats?.failed > 0) {
        log('\n❌ 失败的测试:', 'red');
        reportData.suites?.forEach(suite => {
          suite.specs?.forEach(spec => {
            spec.tests?.forEach(test => {
              if (test.results?.some(result => result.status === 'failed')) {
                log(`  - ${test.title}`, 'red');
              }
            });
          });
        });
      }
    }

    // 打开HTML报告
    if (process.env.OPEN_REPORT !== 'false') {
      try {
        execSync('npx playwright show-report tests/e2e/reports/business-scenarios-report', {
          stdio: 'pipe',
        });
        logSuccess('HTML报告已打开');
      } catch (error) {
        logWarning('无法自动打开HTML报告，请手动查看');
      }
    }
  } catch (error) {
    logWarning(`报告生成失败: ${error.message}`);
  }
}

// 清理测试环境
function cleanup() {
  logStep(5, '清理测试环境');

  try {
    // 清理临时文件
    const tempFiles = ['tests/e2e/fixtures/temp', 'tests/e2e/reports/test-results'];

    for (const file of tempFiles) {
      if (fs.existsSync(file)) {
        fs.rmSync(file, { recursive: true, force: true });
        log(`清理临时文件: ${file}`);
      }
    }

    logSuccess('环境清理完成');
  } catch (error) {
    logWarning(`清理失败: ${error.message}`);
  }
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const testPattern = args.find(arg => arg.startsWith('--grep='))?.split('=')[1] || '';

  logHeader('AFA办公小程序 - 业务场景端到端测试');

  log('测试配置:', 'bright');
  log(`- 测试目录: ${config.testDir}`);
  log(`- 配置文件: ${config.configFile}`);
  log(`- 报告目录: ${config.reportsDir}`);
  log(`- 超时时间: ${config.timeout / 1000}秒`);
  log(`- 重试次数: ${config.retries}`);
  log(`- 并发数: ${config.workers}`);

  if (testPattern) {
    log(`- 测试模式: ${testPattern}`, 'yellow');
  }

  try {
    // 执行测试流程
    checkEnvironment();
    prepareTestEnvironment();

    const testSuccess = runTests(testPattern);

    generateReport();
    cleanup();

    // 输出最终结果
    if (testSuccess) {
      logHeader('🎉 测试执行成功！');
      log('所有业务场景测试都已通过，系统质量良好。', 'green');
    } else {
      logHeader('⚠️  测试执行完成，但有部分失败');
      log('请查看详细报告并修复失败的测试用例。', 'yellow');
      process.exit(1);
    }
  } catch (error) {
    logError(`测试执行异常: ${error.message}`);
    process.exit(1);
  }
}

// 处理命令行参数
if (import.meta.url === `file://${process.argv[1]}`) {
  // 显示帮助信息
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
AFA办公小程序业务场景端到端测试运行器

用法:
  node scripts/run-business-e2e-tests.js [选项]

选项:
  --grep=<pattern>     只运行匹配模式的测试
  --help, -h          显示帮助信息

环境变量:
  DEBUG=true          启用调试模式
  HEADED=true         显示浏览器界面
  OPEN_REPORT=false   不自动打开HTML报告
  CI=true             CI环境模式

示例:
  # 运行所有业务场景测试
  node scripts/run-business-e2e-tests.js

  # 只运行访客相关测试
  node scripts/run-business-e2e-tests.js --grep="访客"

  # 调试模式运行
  DEBUG=true HEADED=true node scripts/run-business-e2e-tests.js
    `);
    process.exit(0);
  }

  main();
}

export {
  checkEnvironment,
  prepareTestEnvironment,
  runTests,
  generateReport,
  cleanup,
};
