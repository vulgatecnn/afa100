#!/usr/bin/env node

/**
 * 响应式设计集成测试运行器
 * 专门用于运行和验证响应式设计相关的测试
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 配置选项
const config = {
  testFile: 'tests/e2e/specs/cross-browser/responsive-design.e2e.ts',
  configFile: 'tests/e2e/config/cross-browser.config.ts',
  reportDir: 'tests/e2e/reports/responsive-design',
  timeout: 120000, // 2分钟超时
  retries: 2,
  browsers: ['chrome-desktop', 'chrome-mobile'], // 简化测试，只用Chrome
  headed: process.argv.includes('--headed'),
  debug: process.argv.includes('--debug')
};

/**
 * 创建报告目录
 */
function ensureReportDirectory() {
  const reportPath = path.join(process.cwd(), config.reportDir);
  if (!fs.existsSync(reportPath)) {
    fs.mkdirSync(reportPath, { recursive: true });
    console.log(`✓ 创建报告目录: ${reportPath}`);
  }
}

/**
 * 运行响应式设计测试
 */
async function runResponsiveTests() {
  console.log('🚀 开始运行响应式设计集成测试...\n');

  ensureReportDirectory();

  const args = [
    'test',
    '--config', config.configFile,
    config.testFile,
    '--reporter=html',
    `--reporter-options=outputFolder=${config.reportDir}`,
    '--reporter=line',
    `--timeout=${config.timeout}`,
    `--retries=${config.retries}`
  ];

  // 添加浏览器项目过滤
  if (config.browsers.length > 0) {
    for (const browser of config.browsers) {
      args.push('--project', browser);
    }
  }

  // 调试模式
  if (config.debug) {
    args.push('--debug');
  }

  // 有头模式
  if (config.headed) {
    args.push('--headed');
  }

  console.log('执行命令:', 'playwright', args.join(' '));
  console.log('测试配置:');
  console.log(`  - 测试文件: ${config.testFile}`);
  console.log(`  - 配置文件: ${config.configFile}`);
  console.log(`  - 报告目录: ${config.reportDir}`);
  console.log(`  - 超时时间: ${config.timeout}ms`);
  console.log(`  - 重试次数: ${config.retries}`);
  console.log(`  - 测试浏览器: ${config.browsers.join(', ')}`);
  console.log(`  - 调试模式: ${config.debug ? '开启' : '关闭'}`);
  console.log(`  - 有头模式: ${config.headed ? '开启' : '关闭'}\n`);

  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['playwright', ...args], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ 响应式设计测试完成！');
        console.log(`📊 查看详细报告: ${path.join(config.reportDir, 'index.html')}`);
        resolve(code);
      } else {
        console.log(`\n❌ 测试失败，退出代码: ${code}`);
        reject(new Error(`测试进程退出，代码: ${code}`));
      }
    });

    child.on('error', (error) => {
      console.error('❌ 启动测试进程失败:', error.message);
      reject(error);
    });
  });
}

/**
 * 验证测试环境
 */
function validateEnvironment() {
  console.log('🔍 验证测试环境...');

  // 检查测试文件是否存在
  const testFilePath = path.join(process.cwd(), config.testFile);
  if (!fs.existsSync(testFilePath)) {
    throw new Error(`测试文件不存在: ${testFilePath}`);
  }

  // 检查配置文件是否存在
  const configFilePath = path.join(process.cwd(), config.configFile);
  if (!fs.existsSync(configFilePath)) {
    throw new Error(`配置文件不存在: ${configFilePath}`);
  }

  console.log('✓ 测试环境验证通过\n');
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
响应式设计集成测试运行器

用法:
  node run-responsive-tests.js [选项]

选项:
  --headed    在有头模式下运行测试（显示浏览器窗口）
  --debug     启用调试模式
  --help      显示此帮助信息

示例:
  node run-responsive-tests.js                    # 运行所有响应式测试
  node run-responsive-tests.js --headed           # 有头模式运行
  node run-responsive-tests.js --debug            # 调试模式运行
  node run-responsive-tests.js --headed --debug   # 有头调试模式

测试覆盖范围:
  ✓ 不同屏幕尺寸的前后端数据交互
  ✓ 移动端和桌面端的功能一致性
  ✓ 触摸和鼠标交互的兼容性
  ✓ 响应式UI元素的显示和隐藏
  ✓ 跨设备的表单和文件操作功能
  ✓ 网络状态变化处理
  ✓ 跨设备数据同步

报告位置: ${config.reportDir}/index.html
  `);
}

/**
 * 主函数
 */
async function main() {
  try {
    // 显示帮助
    if (process.argv.includes('--help')) {
      showHelp();
      return;
    }

    // 验证环境
    validateEnvironment();

    // 运行测试
    await runResponsiveTests();

  } catch (error) {
    console.error('❌ 测试运行失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  runResponsiveTests,
  config
};