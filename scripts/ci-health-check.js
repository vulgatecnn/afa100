#!/usr/bin/env node

/**
 * CI/CD 健康检查脚本
 * 检查 GitHub Actions 工作流的配置和状态
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

/**
 * 打印带颜色的消息
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 打印标题
 */
function printHeader(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
}

/**
 * 打印子标题
 */
function printSubHeader(title) {
  log(`\n${title}`, 'blue');
  log('-'.repeat(40), 'blue');
}

/**
 * 检查文件是否存在
 */
function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * 读取 YAML 文件（简单解析）
 */
function readYamlFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content;
  } catch (error) {
    return null;
  }
}

/**
 * 检查工作流文件
 */
function checkWorkflowFiles() {
  printSubHeader('检查工作流文件');
  
  const workflowDir = path.join(rootDir, '.github', 'workflows');
  
  if (!checkFileExists(workflowDir)) {
    log('❌ .github/workflows 目录不存在', 'red');
    return { status: 'error', workflows: [] };
  }
  
  const files = fs.readdirSync(workflowDir);
  const ymlFiles = files.filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  
  log(`✅ 找到 ${ymlFiles.length} 个工作流文件`, 'green');
  
  const workflows = [];
  
  ymlFiles.forEach(file => {
    const filePath = path.join(workflowDir, file);
    const content = readYamlFile(filePath);
    
    if (content) {
      // 提取工作流名称
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const name = nameMatch ? nameMatch[1].trim() : file;
      
      // 检查触发条件
      const hasPush = content.includes('on:') && content.includes('push:');
      const hasPR = content.includes('pull_request:');
      const hasSchedule = content.includes('schedule:');
      const hasWorkflowDispatch = content.includes('workflow_dispatch:');
      
      // 检查作业数量
      const jobsMatch = content.match(/^jobs:/m);
      const jobCount = jobsMatch ? (content.match(/^\s{2}\w+:/gm) || []).length : 0;
      
      workflows.push({
        file,
        name,
        hasPush,
        hasPR,
        hasSchedule,
        hasWorkflowDispatch,
        jobCount,
        size: fs.statSync(filePath).size,
      });
      
      log(`  📄 ${file}`, 'cyan');
      log(`     名称: ${name}`);
      log(`     作业数: ${jobCount}`);
      log(`     触发器: ${[
        hasPush && 'push',
        hasPR && 'PR',
        hasSchedule && 'schedule',
        hasWorkflowDispatch && 'manual'
      ].filter(Boolean).join(', ')}`);
    }
  });
  
  return { status: 'success', workflows };
}

/**
 * 检查工作流配置质量
 */
function checkWorkflowQuality(workflows) {
  printSubHeader('工作流配置质量检查');
  
  const issues = [];
  
  workflows.forEach(workflow => {
    const workflowPath = path.join(rootDir, '.github', 'workflows', workflow.file);
    const content = readYamlFile(workflowPath);
    
    if (!content) return;
    
    // 检查是否有缓存配置
    const hasCache = content.includes('actions/cache@');
    if (!hasCache) {
      issues.push({
        workflow: workflow.name,
        type: 'optimization',
        message: '未使用依赖缓存，可能导致构建时间过长',
      });
    }
    
    // 检查是否有超时配置
    const hasTimeout = content.includes('timeout-minutes:');
    if (!hasTimeout) {
      issues.push({
        workflow: workflow.name,
        type: 'warning',
        message: '未设置超时时间，可能导致工作流挂起',
      });
    }
    
    // 检查是否有错误处理
    const hasContinueOnError = content.includes('continue-on-error:');
    if (!hasContinueOnError) {
      issues.push({
        workflow: workflow.name,
        type: 'info',
        message: '未使用 continue-on-error，某些步骤失败可能阻断整个流程',
      });
    }
    
    // 检查是否有 artifact 上传
    const hasArtifact = content.includes('actions/upload-artifact@');
    if (!hasArtifact) {
      issues.push({
        workflow: workflow.name,
        type: 'info',
        message: '未上传构建产物，无法保存测试报告或构建结果',
      });
    }
  });
  
  if (issues.length === 0) {
    log('✅ 所有工作流配置质量良好', 'green');
  } else {
    log(`⚠️  发现 ${issues.length} 个配置建议`, 'yellow');
    
    const grouped = {
      optimization: [],
      warning: [],
      info: [],
    };
    
    issues.forEach(issue => {
      grouped[issue.type].push(issue);
    });
    
    if (grouped.optimization.length > 0) {
      log('\n  优化建议:', 'yellow');
      grouped.optimization.forEach(issue => {
        log(`    • ${issue.workflow}: ${issue.message}`, 'yellow');
      });
    }
    
    if (grouped.warning.length > 0) {
      log('\n  警告:', 'yellow');
      grouped.warning.forEach(issue => {
        log(`    • ${issue.workflow}: ${issue.message}`, 'yellow');
      });
    }
    
    if (grouped.info.length > 0) {
      log('\n  信息:', 'cyan');
      grouped.info.forEach(issue => {
        log(`    • ${issue.workflow}: ${issue.message}`, 'cyan');
      });
    }
  }
  
  return issues;
}

/**
 * 检查必需的脚本和配置文件
 */
function checkRequiredFiles() {
  printSubHeader('检查必需的文件');
  
  const requiredFiles = [
    { path: 'package.json', description: '项目配置文件' },
    { path: 'pnpm-workspace.yaml', description: 'pnpm workspace 配置' },
    { path: '.github/workflows', description: 'GitHub Actions 工作流目录' },
    { path: 'afa-office-system/backend/package.json', description: '后端项目配置' },
    { path: 'afa-office-system/frontend/tenant-admin/package.json', description: '租务管理端配置' },
    { path: 'afa-office-system/frontend/merchant-admin/package.json', description: '商户管理端配置' },
  ];
  
  const results = [];
  
  requiredFiles.forEach(file => {
    const filePath = path.join(rootDir, file.path);
    const exists = checkFileExists(filePath);
    
    results.push({
      path: file.path,
      description: file.description,
      exists,
    });
    
    if (exists) {
      log(`  ✅ ${file.description} (${file.path})`, 'green');
    } else {
      log(`  ❌ ${file.description} (${file.path})`, 'red');
    }
  });
  
  return results;
}

/**
 * 检查测试脚本配置
 */
function checkTestScripts() {
  printSubHeader('检查测试脚本配置');
  
  const packageJsonPath = path.join(rootDir, 'package.json');
  
  if (!checkFileExists(packageJsonPath)) {
    log('❌ package.json 不存在', 'red');
    return { status: 'error', scripts: [] };
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const scripts = packageJson.scripts || {};
  
  const testScripts = Object.keys(scripts).filter(key => 
    key.includes('test') || key.includes('ci')
  );
  
  if (testScripts.length === 0) {
    log('⚠️  未找到测试相关脚本', 'yellow');
    return { status: 'warning', scripts: [] };
  }
  
  log(`✅ 找到 ${testScripts.length} 个测试相关脚本`, 'green');
  
  testScripts.forEach(script => {
    log(`  • ${script}: ${scripts[script]}`, 'cyan');
  });
  
  return { status: 'success', scripts: testScripts };
}

/**
 * 生成健康检查报告
 */
function generateReport(results) {
  printSubHeader('生成健康检查报告');
  
  const reportPath = path.join(rootDir, 'ci-health-check-report.md');
  
  let report = '# CI/CD 健康检查报告\n\n';
  report += `生成时间: ${new Date().toISOString()}\n\n`;
  
  // 工作流文件
  report += '## 工作流文件\n\n';
  if (results.workflows.workflows.length > 0) {
    report += '| 文件名 | 工作流名称 | 作业数 | 触发器 |\n';
    report += '|--------|-----------|--------|--------|\n';
    results.workflows.workflows.forEach(wf => {
      const triggers = [
        wf.hasPush && 'push',
        wf.hasPR && 'PR',
        wf.hasSchedule && 'schedule',
        wf.hasWorkflowDispatch && 'manual'
      ].filter(Boolean).join(', ');
      report += `| ${wf.file} | ${wf.name} | ${wf.jobCount} | ${triggers} |\n`;
    });
  } else {
    report += '未找到工作流文件\n';
  }
  
  // 配置质量
  report += '\n## 配置质量检查\n\n';
  if (results.quality.length === 0) {
    report += '✅ 所有工作流配置质量良好\n';
  } else {
    report += `发现 ${results.quality.length} 个配置建议:\n\n`;
    results.quality.forEach(issue => {
      report += `- **${issue.workflow}** (${issue.type}): ${issue.message}\n`;
    });
  }
  
  // 必需文件
  report += '\n## 必需文件检查\n\n';
  report += '| 文件路径 | 描述 | 状态 |\n';
  report += '|----------|------|------|\n';
  results.files.forEach(file => {
    const status = file.exists ? '✅ 存在' : '❌ 缺失';
    report += `| ${file.path} | ${file.description} | ${status} |\n`;
  });
  
  // 测试脚本
  report += '\n## 测试脚本配置\n\n';
  if (results.testScripts.scripts.length > 0) {
    report += '找到以下测试相关脚本:\n\n';
    results.testScripts.scripts.forEach(script => {
      report += `- \`${script}\`\n`;
    });
  } else {
    report += '⚠️ 未找到测试相关脚本\n';
  }
  
  // 总结
  report += '\n## 总结\n\n';
  const totalIssues = results.quality.length + results.files.filter(f => !f.exists).length;
  if (totalIssues === 0) {
    report += '🎉 CI/CD 配置健康，未发现严重问题。\n';
  } else {
    report += `⚠️ 发现 ${totalIssues} 个需要关注的问题，建议及时处理。\n`;
  }
  
  // 建议
  report += '\n## 建议\n\n';
  report += '1. 定期检查工作流运行状态，及时修复失败的构建\n';
  report += '2. 保持工作流文件的简洁和可维护性\n';
  report += '3. 使用缓存和并行执行来优化构建时间\n';
  report += '4. 为关键步骤添加超时和错误处理\n';
  report += '5. 定期更新 GitHub Actions 版本\n';
  
  fs.writeFileSync(reportPath, report, 'utf-8');
  
  log(`✅ 报告已生成: ${reportPath}`, 'green');
  
  return reportPath;
}

/**
 * 主函数
 */
async function main() {
  printHeader('CI/CD 健康检查');
  
  log('开始检查 GitHub Actions CI/CD 配置...\n', 'cyan');
  
  const results = {
    workflows: checkWorkflowFiles(),
    quality: [],
    files: checkRequiredFiles(),
    testScripts: checkTestScripts(),
  };
  
  if (results.workflows.status === 'success') {
    results.quality = checkWorkflowQuality(results.workflows.workflows);
  }
  
  const reportPath = generateReport(results);
  
  printHeader('检查完成');
  
  // 计算总体评分
  const totalChecks = results.files.length;
  const passedChecks = results.files.filter(f => f.exists).length;
  const score = Math.round((passedChecks / totalChecks) * 100);
  
  log(`\n总体评分: ${score}%`, score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red');
  log(`工作流数量: ${results.workflows.workflows.length}`, 'cyan');
  log(`配置建议: ${results.quality.length}`, results.quality.length === 0 ? 'green' : 'yellow');
  log(`测试脚本: ${results.testScripts.scripts.length}`, 'cyan');
  log(`\n详细报告: ${reportPath}`, 'bright');
  
  // 返回退出码
  const hasErrors = results.files.some(f => !f.exists && f.path.includes('package.json'));
  process.exit(hasErrors ? 1 : 0);
}

// 运行主函数
main().catch(error => {
  log(`\n❌ 错误: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
