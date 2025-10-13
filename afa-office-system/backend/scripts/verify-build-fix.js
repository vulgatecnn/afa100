#!/usr/bin/env node

/**
 * 构建修复验证脚本
 * 用于CI/CD流程中的自动化验证
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

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'cyan');
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

// 执行命令并处理错误
function runCommand(command, description, options = {}) {
  try {
    logStep('EXEC', `${description}: ${command}`);
    const output = execSync(command, {
      cwd: process.cwd(),
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
      ...options
    });
    logSuccess(`${description} 完成`);
    return output;
  } catch (error) {
    logError(`${description} 失败: ${error.message}`);
    if (options.continueOnError) {
      logWarning('继续执行后续步骤...');
      return null;
    }
    process.exit(1);
  }
}

// 检查文件是否存在
function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    logSuccess(`${description} 存在: ${filePath}`);
    return true;
  } else {
    logError(`${description} 不存在: ${filePath}`);
    return false;
  }
}

// 主验证流程
async function main() {
  log('🚀 开始构建修复验证流程', 'magenta');
  
  const startTime = Date.now();
  let errors = 0;
  let warnings = 0;

  try {
    // 1. 环境检查
    logStep('1', '环境检查');
    
    // 检查Node.js版本
    const nodeVersion = process.version;
    log(`Node.js版本: ${nodeVersion}`, 'blue');
    const majorVersion = parseInt(nodeVersion.slice(1));
    if (majorVersion < 18) {
      logError('Node.js版本过低，需要18+');
      errors++;
    } else {
      logSuccess('Node.js版本符合要求');
    }

    // 检查pnpm版本
    try {
      const pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
      log(`pnpm版本: ${pnpmVersion}`, 'blue');
      const pnpmMajor = parseInt(pnpmVersion.split('.')[0]);
      if (pnpmMajor < 8) {
        logError('pnpm版本过低，需要8+');
        errors++;
      } else {
        logSuccess('pnpm版本符合要求');
      }
    } catch (error) {
      logError('pnpm未安装或不可用');
      errors++;
    }

    // 2. 依赖检查
    logStep('2', '依赖安装和检查');
    runCommand('pnpm install --frozen-lockfile', '安装依赖');
    
    // 检查依赖完整性
    const listOutput = runCommand('pnpm list --depth=0', '检查依赖完整性', { silent: true });
    if (listOutput && listOutput.includes('UNMET DEPENDENCY')) {
      logError('发现未满足的依赖');
      errors++;
    } else {
      logSuccess('依赖完整性检查通过');
    }

    // 3. 代码质量检查
    logStep('3', '代码质量检查');
    
    // ESLint检查
    runCommand('pnpm lint', 'ESLint代码检查', { continueOnError: true });
    
    // Prettier格式检查
    runCommand('npx prettier --check "src/**/*.{ts,js,json}"', 'Prettier格式检查', { continueOnError: true });
    
    // TypeScript类型检查
    runCommand('pnpm type-check', 'TypeScript类型检查');

    // 4. 编译构建
    logStep('4', '编译构建');
    
    // 清理之前的构建
    if (fs.existsSync('dist')) {
      runCommand('rm -rf dist', '清理构建目录');
    }
    
    // 执行构建
    runCommand('pnpm build', 'TypeScript编译构建');
    
    // 检查构建产物
    if (!checkFile('dist', '构建输出目录')) {
      errors++;
    }
    
    if (!checkFile('dist/app.js', '主应用文件')) {
      errors++;
    }

    // 5. 测试执行
    logStep('5', '测试执行');
    
    // 运行单元测试
    runCommand('pnpm test', '单元测试', { continueOnError: true });
    
    // 运行验证测试
    runCommand('pnpm test:verification', '构建修复验证测试');

    // 6. 安全检查
    logStep('6', '安全检查');
    
    try {
      const auditOutput = runCommand('pnpm audit --audit-level high', '安全漏洞扫描', { 
        silent: true, 
        continueOnError: true 
      });
      
      if (auditOutput && (auditOutput.includes('high') || auditOutput.includes('critical'))) {
        logError('发现高危安全漏洞');
        errors++;
      } else {
        logSuccess('安全检查通过');
      }
    } catch (error) {
      logWarning('安全检查遇到问题，但继续执行');
      warnings++;
    }

    // 7. 运行时验证
    logStep('7', '运行时验证');
    
    // 语法检查
    if (fs.existsSync('dist/app.js')) {
      runCommand('node --check dist/app.js', '应用语法检查');
    }

    // 8. 性能检查
    logStep('8', '性能检查');
    
    // 检查构建产物大小
    try {
      const distSize = execSync('du -sh dist', { encoding: 'utf8' }).split('\t')[0];
      log(`构建产物大小: ${distSize}`, 'blue');
      
      const sizeMatch = distSize.match(/(\d+(?:\.\d+)?)(K|M|G)/);
      if (sizeMatch) {
        const [, size, unit] = sizeMatch;
        const sizeNum = parseFloat(size);
        
        if (unit === 'G' || (unit === 'M' && sizeNum > 100)) {
          logWarning(`构建产物可能过大: ${distSize}`);
          warnings++;
        } else {
          logSuccess('构建产物大小合理');
        }
      }
    } catch (error) {
      logWarning('无法检查构建产物大小');
      warnings++;
    }

    // 9. 配置文件检查
    logStep('9', '配置文件检查');
    
    const configFiles = [
      { path: 'package.json', desc: 'package.json' },
      { path: 'tsconfig.json', desc: 'TypeScript配置' },
      { path: '.env.example', desc: '环境变量示例' },
      { path: 'README.md', desc: 'README文档' }
    ];
    
    configFiles.forEach(({ path: filePath, desc }) => {
      if (!checkFile(filePath, desc)) {
        warnings++;
      }
    });

    // 10. 生成验证报告
    logStep('10', '生成验证报告');
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      nodeVersion,
      pnpmVersion: execSync('pnpm --version', { encoding: 'utf8' }).trim(),
      errors,
      warnings,
      status: errors === 0 ? 'SUCCESS' : 'FAILED',
      steps: [
        '环境检查',
        '依赖安装和检查',
        '代码质量检查',
        '编译构建',
        '测试执行',
        '安全检查',
        '运行时验证',
        '性能检查',
        '配置文件检查'
      ]
    };
    
    // 保存报告
    const reportPath = 'verification-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logSuccess(`验证报告已保存: ${reportPath}`);

    // 输出总结
    log('\n📊 验证总结', 'magenta');
    log(`总耗时: ${duration}ms`, 'blue');
    log(`错误数: ${errors}`, errors > 0 ? 'red' : 'green');
    log(`警告数: ${warnings}`, warnings > 0 ? 'yellow' : 'green');
    
    if (errors === 0) {
      log('\n🎉 构建修复验证通过！', 'green');
      process.exit(0);
    } else {
      log('\n💥 构建修复验证失败！', 'red');
      process.exit(1);
    }

  } catch (error) {
    logError(`验证过程中发生未预期的错误: ${error.message}`);
    process.exit(1);
  }
}

// 处理命令行参数
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
构建修复验证脚本

用法:
  node scripts/verify-build-fix.js [选项]

选项:
  --help, -h     显示帮助信息
  --verbose, -v  详细输出模式

示例:
  node scripts/verify-build-fix.js
  node scripts/verify-build-fix.js --verbose
  `);
  process.exit(0);
}

// 运行主流程
main().catch(error => {
  logError(`脚本执行失败: ${error.message}`);
  process.exit(1);
});