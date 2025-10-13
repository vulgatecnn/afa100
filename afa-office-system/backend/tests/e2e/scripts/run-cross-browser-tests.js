#!/usr/bin/env node

/**
 * 跨浏览器兼容性测试运行器
 * 支持不同浏览器和设备的集成测试
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 配置选项
const config = {
  browsers: ['chrome-desktop', 'firefox-desktop', 'safari-desktop', 'edge-desktop'],
  devices: ['desktop', 'tablet', 'mobile'],
  resolutions: ['1920x1080', '1366x768', '1024x768', '393x851'],
  testTypes: ['browser-compatibility', 'api-compatibility', 'responsive-design'],
  
  // 测试环境配置
  environment: {
    backend: process.env.E2E_BACKEND_URL || 'http://localhost:5100',
    frontend: {
      tenant: process.env.E2E_TENANT_ADMIN_URL || 'http://localhost:5000',
      merchant: process.env.E2E_MERCHANT_ADMIN_URL || 'http://localhost:5050'
    }
  },
  
  // 报告配置
  reports: {
    outputDir: path.join(__dirname, '../reports/cross-browser-report'),
    formats: ['html', 'json', 'junit']
  }
};

/**
 * 解析命令行参数
 */
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    browsers: config.browsers,
    devices: config.devices,
    testTypes: config.testTypes,
    headed: false,
    debug: false,
    parallel: true,
    retries: 1,
    timeout: 30000,
    grep: null,
    project: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--browsers':
        options.browsers = args[++i].split(',');
        break;
      case '--devices':
        options.devices = args[++i].split(',');
        break;
      case '--test-types':
        options.testTypes = args[++i].split(',');
        break;
      case '--headed':
        options.headed = true;
        break;
      case '--debug':
        options.debug = true;
        options.headed = true;
        break;
      case '--no-parallel':
        options.parallel = false;
        break;
      case '--retries':
        options.retries = parseInt(args[++i]);
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i]);
        break;
      case '--grep':
        options.grep = args[++i];
        break;
      case '--project':
        options.project = args[++i];
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
跨浏览器兼容性测试运行器

用法: node run-cross-browser-tests.js [选项]

选项:
  --browsers <list>     指定要测试的浏览器 (chrome-desktop,firefox-desktop,safari-desktop,edge-desktop)
  --devices <list>      指定要测试的设备类型 (desktop,tablet,mobile)
  --test-types <list>   指定要运行的测试类型 (browser-compatibility,api-compatibility,responsive-design)
  --headed              在有头模式下运行测试
  --debug               启用调试模式 (自动启用有头模式)
  --no-parallel         禁用并行执行
  --retries <number>    设置重试次数 (默认: 1)
  --timeout <ms>        设置测试超时时间 (默认: 30000)
  --grep <pattern>      只运行匹配模式的测试
  --project <name>      只运行指定项目的测试
  --help                显示此帮助信息

示例:
  # 运行所有浏览器的兼容性测试
  node run-cross-browser-tests.js

  # 只测试Chrome和Firefox
  node run-cross-browser-tests.js --browsers chrome-desktop,firefox-desktop

  # 运行响应式设计测试
  node run-cross-browser-tests.js --test-types responsive-design

  # 调试模式运行特定测试
  node run-cross-browser-tests.js --debug --grep "API兼容性"

  # 只测试桌面设备
  node run-cross-browser-tests.js --devices desktop
  `);
}

/**
 * 验证测试环境
 */
async function validateEnvironment() {
  console.log('🔍 验证测试环境...');
  
  const checks = [
    { name: '后端服务', url: config.environment.backend + '/api/v1/health' },
    { name: '租务管理端', url: config.environment.frontend.tenant },
    { name: '商户管理端', url: config.environment.frontend.merchant }
  ];

  for (const check of checks) {
    try {
      const response = await fetch(check.url);
      if (response.ok) {
        console.log(`✅ ${check.name}: 可用`);
      } else {
        console.log(`⚠️  ${check.name}: 响应状态 ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${check.name}: 不可用 (${error.message})`);
      if (check.name === '后端服务') {
        console.error('后端服务不可用，无法继续测试');
        process.exit(1);
      }
    }
  }
}

/**
 * 生成Playwright命令
 */
function generatePlaywrightCommand(options) {
  const configPath = path.join(__dirname, '../config/cross-browser.config.ts');
  const cmd = ['playwright', 'test', '--config', configPath];

  // 添加项目过滤
  if (options.project) {
    cmd.push('--project', options.project);
  } else if (options.browsers.length < config.browsers.length) {
    // 如果指定了特定浏览器，添加项目过滤
    options.browsers.forEach(browser => {
      cmd.push('--project', browser);
    });
  }

  // 添加测试文件过滤
  if (options.testTypes.length < config.testTypes.length) {
    const testFiles = options.testTypes.map(type => `**/${type}.e2e.ts`);
    cmd.push(...testFiles);
  }

  // 添加其他选项
  if (options.headed) {
    cmd.push('--headed');
  }

  if (options.debug) {
    cmd.push('--debug');
  }

  if (!options.parallel) {
    cmd.push('--workers', '1');
  }

  if (options.retries > 0) {
    cmd.push('--retries', options.retries.toString());
  }

  if (options.timeout !== 30000) {
    cmd.push('--timeout', options.timeout.toString());
  }

  if (options.grep) {
    cmd.push('--grep', options.grep);
  }

  // 添加报告器
  cmd.push('--reporter', 'html,json,junit');

  return cmd;
}

/**
 * 运行测试
 */
async function runTests(options) {
  console.log('🚀 开始跨浏览器兼容性测试...');
  console.log(`📋 测试配置:
  - 浏览器: ${options.browsers.join(', ')}
  - 设备类型: ${options.devices.join(', ')}
  - 测试类型: ${options.testTypes.join(', ')}
  - 并行执行: ${options.parallel ? '是' : '否'}
  - 有头模式: ${options.headed ? '是' : '否'}
  - 重试次数: ${options.retries}
  `);

  const cmd = generatePlaywrightCommand(options);
  console.log(`🔧 执行命令: ${cmd.join(' ')}`);

  return new Promise((resolve, reject) => {
    const process = spawn(cmd[0], cmd.slice(1), {
      stdio: 'inherit',
      cwd: path.join(__dirname, '../../..'),
      env: {
        ...process.env,
        E2E_BACKEND_URL: config.environment.backend,
        E2E_TENANT_ADMIN_URL: config.environment.frontend.tenant,
        E2E_MERCHANT_ADMIN_URL: config.environment.frontend.merchant,
        CROSS_BROWSER_TEST: 'true'
      }
    });

    process.on('close', (code) => {
      if (code === 0) {
        console.log('✅ 跨浏览器测试完成');
        resolve(code);
      } else {
        console.error(`❌ 测试失败，退出码: ${code}`);
        reject(new Error(`测试失败，退出码: ${code}`));
      }
    });

    process.on('error', (error) => {
      console.error('❌ 测试执行错误:', error);
      reject(error);
    });
  });
}

/**
 * 生成测试报告摘要
 */
async function generateReportSummary() {
  const reportPath = path.join(config.reports.outputDir, 'cross-browser-results.json');
  
  if (!fs.existsSync(reportPath)) {
    console.log('⚠️  未找到测试结果文件');
    return;
  }

  try {
    const results = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    
    console.log('\n📊 测试结果摘要:');
    console.log(`总测试数: ${results.stats?.total || 0}`);
    console.log(`通过: ${results.stats?.passed || 0}`);
    console.log(`失败: ${results.stats?.failed || 0}`);
    console.log(`跳过: ${results.stats?.skipped || 0}`);
    console.log(`执行时间: ${results.stats?.duration || 0}ms`);
    
    if (results.stats?.failed > 0) {
      console.log('\n❌ 失败的测试:');
      results.suites?.forEach(suite => {
        suite.specs?.forEach(spec => {
          if (spec.tests?.some(test => test.results?.some(result => result.status === 'failed'))) {
            console.log(`  - ${spec.title}`);
          }
        });
      });
    }
    
  } catch (error) {
    console.error('解析测试结果失败:', error);
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    const options = parseArguments();
    
    // 验证环境
    await validateEnvironment();
    
    // 运行测试
    await runTests(options);
    
    // 生成报告摘要
    await generateReportSummary();
    
    console.log(`\n📋 查看详细报告: ${config.reports.outputDir}/index.html`);
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  config,
  parseArguments,
  validateEnvironment,
  runTests,
  generateReportSummary
};