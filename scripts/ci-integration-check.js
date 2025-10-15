#!/usr/bin/env node

/**
 * CI/CD 集成检查脚本
 * 综合检查 GitHub Actions CI/CD 配置的完整性和有效性
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ANSI 颜色
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader(title) {
  log('\n' + '='.repeat(70), 'cyan');
  log(`  ${title}`, 'bright');
  log('='.repeat(70), 'cyan');
}

function printSection(title) {
  log(`\n${title}`, 'blue');
  log('-'.repeat(50), 'blue');
}

/**
 * 检查 Git 仓库状态
 */
function checkGitRepository() {
  printSection('1. Git 仓库检查');
  
  try {
    // 检查是否是 Git 仓库
    execSync('git rev-parse --git-dir', { cwd: rootDir, stdio: 'pipe' });
    log('  ✅ Git 仓库已初始化', 'green');
    
    // 获取远程仓库信息
    try {
      const remoteUrl = execSync('git remote get-url origin', { cwd: rootDir, encoding: 'utf-8' }).trim();
      log(`  ✅ 远程仓库: ${remoteUrl}`, 'green');
      
      // 检查是否是 GitHub 仓库
      if (remoteUrl.includes('github.com')) {
        log('  ✅ GitHub 仓库已配置', 'green');
        return { status: 'success', remote: remoteUrl, isGitHub: true };
      } else {
        log('  ⚠️  不是 GitHub 仓库，GitHub Actions 可能无法使用', 'yellow');
        return { status: 'warning', remote: remoteUrl, isGitHub: false };
      }
    } catch (error) {
      log('  ⚠️  未配置远程仓库', 'yellow');
      return { status: 'warning', remote: null, isGitHub: false };
    }
  } catch (error) {
    log('  ❌ 不是 Git 仓库', 'red');
    return { status: 'error', remote: null, isGitHub: false };
  }
}

/**
 * 检查 GitHub Actions 配置
 */
function checkGitHubActions() {
  printSection('2. GitHub Actions 配置检查');
  
  const workflowDir = path.join(rootDir, '.github', 'workflows');
  
  if (!fs.existsSync(workflowDir)) {
    log('  ❌ .github/workflows 目录不存在', 'red');
    return { status: 'error', workflows: [] };
  }
  
  log('  ✅ .github/workflows 目录存在', 'green');
  
  const files = fs.readdirSync(workflowDir);
  const workflowFiles = files.filter(f => (f.endsWith('.yml') || f.endsWith('.yaml')) && !f.includes('.tmp'));
  
  if (workflowFiles.length === 0) {
    log('  ❌ 未找到工作流文件', 'red');
    return { status: 'error', workflows: [] };
  }
  
  log(`  ✅ 找到 ${workflowFiles.length} 个工作流文件`, 'green');
  
  const workflows = [];
  workflowFiles.forEach(file => {
    const filePath = path.join(workflowDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 提取工作流名称
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const name = nameMatch ? nameMatch[1].trim() : file;
    
    // 检查触发条件
    const triggers = [];
    if (content.includes('push:')) triggers.push('push');
    if (content.includes('pull_request:')) triggers.push('pull_request');
    if (content.includes('schedule:')) triggers.push('schedule');
    if (content.includes('workflow_dispatch:')) triggers.push('manual');
    
    // 检查作业
    const jobMatches = content.match(/^  \w+:/gm) || [];
    const jobCount = jobMatches.length;
    
    workflows.push({ file, name, triggers, jobCount });
    
    log(`  📄 ${name}`, 'cyan');
    log(`     文件: ${file}`);
    log(`     作业数: ${jobCount}`);
    log(`     触发器: ${triggers.join(', ')}`);
  });
  
  return { status: 'success', workflows };
}

/**
 * 检查依赖配置
 */
function checkDependencies() {
  printSection('3. 依赖配置检查');
  
  const packageJsonPath = path.join(rootDir, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    log('  ❌ package.json 不存在', 'red');
    return { status: 'error' };
  }
  
  log('  ✅ package.json 存在', 'green');
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  // 检查 Node.js 版本要求
  if (packageJson.engines && packageJson.engines.node) {
    log(`  ✅ Node.js 版本要求: ${packageJson.engines.node}`, 'green');
  } else {
    log('  ⚠️  未指定 Node.js 版本要求', 'yellow');
  }
  
  // 检查包管理器
  if (packageJson.packageManager) {
    log(`  ✅ 包管理器: ${packageJson.packageManager}`, 'green');
  } else if (fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml'))) {
    log('  ✅ 使用 pnpm (检测到 pnpm-lock.yaml)', 'green');
  } else if (fs.existsSync(path.join(rootDir, 'yarn.lock'))) {
    log('  ✅ 使用 yarn (检测到 yarn.lock)', 'green');
  } else if (fs.existsSync(path.join(rootDir, 'package-lock.json'))) {
    log('  ✅ 使用 npm (检测到 package-lock.json)', 'green');
  } else {
    log('  ⚠️  未检测到锁文件', 'yellow');
  }
  
  // 检查测试脚本
  const scripts = packageJson.scripts || {};
  const testScripts = Object.keys(scripts).filter(key => 
    key.includes('test') || key.includes('ci')
  );
  
  if (testScripts.length > 0) {
    log(`  ✅ 找到 ${testScripts.length} 个测试/CI 脚本`, 'green');
    testScripts.slice(0, 5).forEach(script => {
      log(`     • ${script}`);
    });
    if (testScripts.length > 5) {
      log(`     ... 还有 ${testScripts.length - 5} 个脚本`);
    }
  } else {
    log('  ⚠️  未找到测试相关脚本', 'yellow');
  }
  
  return { status: 'success', testScripts };
}

/**
 * 检查项目结构
 */
function checkProjectStructure() {
  printSection('4. 项目结构检查');
  
  const requiredPaths = [
    { path: 'afa-office-system', type: 'dir', description: '主项目目录' },
    { path: 'afa-office-system/backend', type: 'dir', description: '后端项目' },
    { path: 'afa-office-system/frontend', type: 'dir', description: '前端项目' },
    { path: '.github/workflows', type: 'dir', description: 'GitHub Actions 工作流' },
  ];
  
  let allExist = true;
  
  requiredPaths.forEach(item => {
    const fullPath = path.join(rootDir, item.path);
    const exists = fs.existsSync(fullPath);
    
    if (exists) {
      log(`  ✅ ${item.description} (${item.path})`, 'green');
    } else {
      log(`  ❌ ${item.description} (${item.path})`, 'red');
      allExist = false;
    }
  });
  
  return { status: allExist ? 'success' : 'error' };
}

/**
 * 检查环境配置
 */
function checkEnvironmentConfig() {
  printSection('5. 环境配置检查');
  
  const envFiles = [
    '.env.example',
    '.env.test',
    '.env.e2e',
    'afa-office-system/backend/.env.example',
    'afa-office-system/backend/.env.test',
  ];
  
  let foundCount = 0;
  
  envFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      log(`  ✅ ${file}`, 'green');
      foundCount++;
    }
  });
  
  if (foundCount === 0) {
    log('  ⚠️  未找到环境配置示例文件', 'yellow');
  } else {
    log(`  ✅ 找到 ${foundCount} 个环境配置文件`, 'green');
  }
  
  return { status: foundCount > 0 ? 'success' : 'warning' };
}

/**
 * 检查 CI/CD 最佳实践
 */
function checkBestPractices() {
  printSection('6. CI/CD 最佳实践检查');
  
  const checks = [];
  
  // 检查是否有 README
  if (fs.existsSync(path.join(rootDir, 'README.md'))) {
    log('  ✅ README.md 存在', 'green');
    checks.push({ name: 'README', status: 'pass' });
  } else {
    log('  ⚠️  README.md 不存在', 'yellow');
    checks.push({ name: 'README', status: 'warning' });
  }
  
  // 检查是否有 .gitignore
  if (fs.existsSync(path.join(rootDir, '.gitignore'))) {
    log('  ✅ .gitignore 存在', 'green');
    checks.push({ name: 'gitignore', status: 'pass' });
  } else {
    log('  ⚠️  .gitignore 不存在', 'yellow');
    checks.push({ name: 'gitignore', status: 'warning' });
  }
  
  // 检查是否有 LICENSE
  const licenseFiles = ['LICENSE', 'LICENSE.md', 'LICENSE.txt'];
  const hasLicense = licenseFiles.some(f => fs.existsSync(path.join(rootDir, f)));
  if (hasLicense) {
    log('  ✅ LICENSE 文件存在', 'green');
    checks.push({ name: 'LICENSE', status: 'pass' });
  } else {
    log('  ⚠️  LICENSE 文件不存在', 'yellow');
    checks.push({ name: 'LICENSE', status: 'warning' });
  }
  
  // 检查是否有 CONTRIBUTING 指南
  if (fs.existsSync(path.join(rootDir, 'CONTRIBUTING.md'))) {
    log('  ✅ CONTRIBUTING.md 存在', 'green');
    checks.push({ name: 'CONTRIBUTING', status: 'pass' });
  } else {
    log('  💡 建议添加 CONTRIBUTING.md', 'cyan');
    checks.push({ name: 'CONTRIBUTING', status: 'info' });
  }
  
  // 检查是否有 CHANGELOG
  if (fs.existsSync(path.join(rootDir, 'CHANGELOG.md'))) {
    log('  ✅ CHANGELOG.md 存在', 'green');
    checks.push({ name: 'CHANGELOG', status: 'pass' });
  } else {
    log('  💡 建议添加 CHANGELOG.md', 'cyan');
    checks.push({ name: 'CHANGELOG', status: 'info' });
  }
  
  return { status: 'success', checks };
}

/**
 * 生成综合报告
 */
function generateComprehensiveReport(results) {
  printSection('7. 生成综合报告');
  
  let report = '# CI/CD 集成检查综合报告\n\n';
  report += `生成时间: ${new Date().toISOString()}\n\n`;
  
  // 执行摘要
  report += '## 执行摘要\n\n';
  
  const statusEmoji = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };
  
  report += '| 检查项 | 状态 | 说明 |\n';
  report += '|--------|------|------|\n';
  report += `| Git 仓库 | ${statusEmoji[results.git.status]} | ${results.git.isGitHub ? 'GitHub 仓库' : '非 GitHub 仓库'} |\n`;
  report += `| GitHub Actions | ${statusEmoji[results.actions.status]} | ${results.actions.workflows.length} 个工作流 |\n`;
  report += `| 依赖配置 | ${statusEmoji[results.dependencies.status]} | ${results.dependencies.testScripts?.length || 0} 个测试脚本 |\n`;
  report += `| 项目结构 | ${statusEmoji[results.structure.status]} | 项目目录结构 |\n`;
  report += `| 环境配置 | ${statusEmoji[results.environment.status]} | 环境配置文件 |\n`;
  report += `| 最佳实践 | ${statusEmoji[results.bestPractices.status]} | 文档和配置 |\n\n`;
  
  // 计算总体评分
  const scores = {
    success: 100,
    warning: 60,
    error: 0,
  };
  
  const totalScore = [
    results.git.status,
    results.actions.status,
    results.dependencies.status,
    results.structure.status,
    results.environment.status,
    results.bestPractices.status,
  ].reduce((sum, status) => sum + scores[status], 0) / 6;
  
  report += `## 总体评分: ${Math.round(totalScore)}%\n\n`;
  
  if (totalScore >= 90) {
    report += '🎉 **优秀**：CI/CD 配置完善，符合最佳实践。\n\n';
  } else if (totalScore >= 70) {
    report += '✅ **良好**：CI/CD 配置基本完善，有少量改进空间。\n\n';
  } else if (totalScore >= 50) {
    report += '⚠️ **一般**：CI/CD 配置存在一些问题，建议优化。\n\n';
  } else {
    report += '❌ **需要改进**：CI/CD 配置存在较多问题，需要重点关注。\n\n';
  }
  
  // 详细结果
  report += '## 详细检查结果\n\n';
  
  // Git 仓库
  report += '### 1. Git 仓库\n\n';
  if (results.git.remote) {
    report += `- 远程仓库: ${results.git.remote}\n`;
    report += `- GitHub 仓库: ${results.git.isGitHub ? '是' : '否'}\n\n`;
  } else {
    report += '- 未配置远程仓库\n\n';
  }
  
  // GitHub Actions
  report += '### 2. GitHub Actions 工作流\n\n';
  if (results.actions.workflows.length > 0) {
    report += '| 工作流名称 | 文件 | 作业数 | 触发器 |\n';
    report += '|-----------|------|--------|--------|\n';
    results.actions.workflows.forEach(wf => {
      report += `| ${wf.name} | ${wf.file} | ${wf.jobCount} | ${wf.triggers.join(', ')} |\n`;
    });
    report += '\n';
  } else {
    report += '未找到工作流文件\n\n';
  }
  
  // 依赖配置
  report += '### 3. 依赖配置\n\n';
  if (results.dependencies.testScripts && results.dependencies.testScripts.length > 0) {
    report += '测试和 CI 相关脚本:\n\n';
    results.dependencies.testScripts.forEach(script => {
      report += `- \`${script}\`\n`;
    });
    report += '\n';
  }
  
  // 最佳实践
  report += '### 4. 最佳实践\n\n';
  if (results.bestPractices.checks) {
    results.bestPractices.checks.forEach(check => {
      const emoji = check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '💡';
      report += `${emoji} ${check.name}\n`;
    });
    report += '\n';
  }
  
  // 改进建议
  report += '## 改进建议\n\n';
  
  const suggestions = [];
  
  if (results.git.status === 'error') {
    suggestions.push('初始化 Git 仓库并配置远程仓库');
  }
  
  if (!results.git.isGitHub) {
    suggestions.push('将仓库托管到 GitHub 以使用 GitHub Actions');
  }
  
  if (results.actions.status === 'error') {
    suggestions.push('创建 .github/workflows 目录并添加工作流文件');
  }
  
  if (results.dependencies.testScripts?.length === 0) {
    suggestions.push('在 package.json 中添加测试脚本');
  }
  
  if (results.structure.status === 'error') {
    suggestions.push('检查并完善项目目录结构');
  }
  
  if (results.environment.status === 'warning') {
    suggestions.push('添加环境配置示例文件（.env.example）');
  }
  
  if (suggestions.length > 0) {
    suggestions.forEach((suggestion, index) => {
      report += `${index + 1}. ${suggestion}\n`;
    });
  } else {
    report += '暂无改进建议，配置良好。\n';
  }
  
  report += '\n';
  
  // 下一步行动
  report += '## 下一步行动\n\n';
  report += '1. 查看并修复所有错误级别的问题\n';
  report += '2. 优化警告级别的配置\n';
  report += '3. 运行 `node scripts/ci-health-check.js` 进行健康检查\n';
  report += '4. 运行 `node scripts/ci-workflow-validator.js` 验证工作流配置\n';
  report += '5. 定期监控 CI/CD 运行状态\n\n';
  
  // 参考资源
  report += '## 参考资源\n\n';
  report += '- [GitHub Actions 文档](https://docs.github.com/en/actions)\n';
  report += '- [工作流语法参考](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)\n';
  report += '- [CI/CD 最佳实践](https://docs.github.com/en/actions/guides)\n';
  report += '- [项目 CI/CD 状态](https://github.com/vulgatecnn/afa100/actions)\n';
  
  const reportPath = path.join(rootDir, 'ci-integration-check-report.md');
  fs.writeFileSync(reportPath, report, 'utf-8');
  
  log(`  ✅ 综合报告已生成: ${reportPath}`, 'green');
  
  return { reportPath, totalScore };
}

/**
 * 主函数
 */
async function main() {
  printHeader('CI/CD 集成检查');
  
  log('\n开始执行 CI/CD 集成检查...\n', 'cyan');
  
  const results = {
    git: checkGitRepository(),
    actions: checkGitHubActions(),
    dependencies: checkDependencies(),
    structure: checkProjectStructure(),
    environment: checkEnvironmentConfig(),
    bestPractices: checkBestPractices(),
  };
  
  const { reportPath, totalScore } = generateComprehensiveReport(results);
  
  printHeader('检查完成');
  
  log(`\n总体评分: ${Math.round(totalScore)}%`, totalScore >= 70 ? 'green' : totalScore >= 50 ? 'yellow' : 'red');
  log(`详细报告: ${reportPath}`, 'bright');
  
  // 打印快速摘要
  log('\n快速摘要:', 'cyan');
  log(`  • Git 仓库: ${results.git.status === 'success' ? '✅' : results.git.status === 'warning' ? '⚠️' : '❌'}`);
  log(`  • GitHub Actions: ${results.actions.workflows.length} 个工作流`);
  log(`  • 测试脚本: ${results.dependencies.testScripts?.length || 0} 个`);
  
  // 返回退出码
  const hasErrors = Object.values(results).some(r => r.status === 'error');
  if (hasErrors) {
    log('\n❌ 发现错误，请查看报告了解详情', 'red');
    process.exit(1);
  } else {
    log('\n✅ 所有检查通过', 'green');
    process.exit(0);
  }
}

// 运行主函数
main().catch(error => {
  log(`\n❌ 错误: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
