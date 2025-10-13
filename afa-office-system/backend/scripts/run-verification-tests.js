#!/usr/bin/env node

/**
 * 验证测试运行器
 * 提供更好的错误处理和报告
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
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

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function main() {
  log('🔍 开始运行验证测试', 'magenta');
  
  const startTime = Date.now();
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;

  try {
    // 检查环境
    logInfo('检查测试环境...');
    
    // 确保dist目录存在（某些测试需要）
    if (!fs.existsSync('dist')) {
      logWarning('dist目录不存在，尝试构建...');
      try {
        execSync('pnpm build', { stdio: 'pipe' });
        logSuccess('构建完成');
      } catch (error) {
        logWarning('构建失败，某些测试可能会跳过');
      }
    }

    // 运行验证测试
    logInfo('运行验证测试...');
    
    const testOutput = execSync('pnpm test:verification', {
      stdio: 'pipe',
      encoding: 'utf8'
    });

    // 解析测试结果
    const lines = testOutput.split('\n');
    for (const line of lines) {
      if (line.includes('Test Files')) {
        const match = line.match(/(\d+)\s+failed.*?(\d+)\s+passed/);
        if (match) {
          failedTests = parseInt(match[1]);
          passedTests = parseInt(match[2]);
          totalTests = failedTests + passedTests;
        }
      }
    }

    // 输出结果
    log('\n📊 测试结果汇总', 'magenta');
    log(`总测试数: ${totalTests}`, 'blue');
    log(`通过: ${passedTests}`, passedTests > 0 ? 'green' : 'reset');
    log(`失败: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
    log(`跳过: ${skippedTests}`, skippedTests > 0 ? 'yellow' : 'reset');

    const endTime = Date.now();
    const duration = endTime - startTime;
    log(`耗时: ${duration}ms`, 'blue');

    // 生成简化报告
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      skipped: skippedTests,
      success: failedTests === 0,
      details: testOutput
    };

    fs.writeFileSync('verification-test-report.json', JSON.stringify(report, null, 2));
    logSuccess('测试报告已保存: verification-test-report.json');

    if (failedTests === 0) {
      log('\n🎉 所有验证测试通过！', 'green');
      process.exit(0);
    } else {
      log('\n💥 部分验证测试失败', 'red');
      
      // 显示失败的测试信息
      const failureLines = lines.filter(line => 
        line.includes('FAIL') || line.includes('AssertionError') || line.includes('Error:')
      );
      
      if (failureLines.length > 0) {
        log('\n失败详情:', 'red');
        failureLines.slice(0, 10).forEach(line => {
          log(`  ${line.trim()}`, 'red');
        });
      }
      
      process.exit(1);
    }

  } catch (error) {
    logError(`验证测试执行失败: ${error.message}`);
    
    // 尝试解析错误输出
    const errorOutput = error.stdout || error.stderr || '';
    if (errorOutput) {
      const lines = errorOutput.split('\n');
      const importantLines = lines.filter(line => 
        line.includes('FAIL') || 
        line.includes('Error:') || 
        line.includes('AssertionError') ||
        line.includes('Test Files')
      );
      
      if (importantLines.length > 0) {
        log('\n错误详情:', 'red');
        importantLines.slice(0, 5).forEach(line => {
          log(`  ${line.trim()}`, 'red');
        });
      }
    }
    
    process.exit(1);
  }
}

// 处理命令行参数
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
验证测试运行器

用法:
  node scripts/run-verification-tests.js [选项]

选项:
  --help, -h     显示帮助信息
  --verbose, -v  详细输出模式

示例:
  node scripts/run-verification-tests.js
  node scripts/run-verification-tests.js --verbose
  `);
  process.exit(0);
}

// 运行主流程
main().catch(error => {
  logError(`脚本执行失败: ${error.message}`);
  process.exit(1);
});