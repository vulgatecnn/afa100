#!/usr/bin/env node

/**
 * CI/CD 工作流验证器
 * 验证 GitHub Actions 工作流配置的正确性和最佳实践
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 验证规则
const validationRules = {
  // 必须有的配置
  required: [
    {
      name: 'workflow-name',
      check: (content) => /^name:\s*.+$/m.test(content),
      message: '工作流必须有 name 字段',
      severity: 'error',
    },
    {
      name: 'trigger-events',
      check: (content) => /^on:/m.test(content),
      message: '工作流必须定义触发事件 (on:)',
      severity: 'error',
    },
    {
      name: 'jobs-defined',
      check: (content) => /^jobs:/m.test(content),
      message: '工作流必须定义至少一个作业 (jobs:)',
      severity: 'error',
    },
  ],
  
  // 推荐的配置
  recommended: [
    {
      name: 'use-cache',
      check: (content) => content.includes('actions/cache@'),
      message: '建议使用依赖缓存以加快构建速度',
      severity: 'warning',
    },
    {
      name: 'set-timeout',
      check: (content) => content.includes('timeout-minutes:'),
      message: '建议为作业设置超时时间以防止挂起',
      severity: 'warning',
    },
    {
      name: 'upload-artifacts',
      check: (content) => content.includes('actions/upload-artifact@'),
      message: '建议上传构建产物和测试报告',
      severity: 'info',
    },
    {
      name: 'checkout-action',
      check: (content) => content.includes('actions/checkout@'),
      message: '工作流应该检出代码',
      severity: 'warning',
    },
  ],
  
  // 最佳实践
  bestPractices: [
    {
      name: 'pinned-versions',
      check: (content) => {
        const actionMatches = content.match(/uses:\s*[\w-]+\/[\w-]+@/g) || [];
        const pinnedCount = actionMatches.filter(m => /@v\d+/.test(m)).length;
        return pinnedCount >= actionMatches.length * 0.8; // 至少80%的action使用了版本
      },
      message: '建议为 GitHub Actions 指定版本号',
      severity: 'info',
    },
    {
      name: 'error-handling',
      check: (content) => content.includes('continue-on-error:') || content.includes('if: always()'),
      message: '建议添加错误处理逻辑',
      severity: 'info',
    },
    {
      name: 'concurrency-control',
      check: (content) => content.includes('concurrency:'),
      message: '建议配置并发控制以避免重复运行',
      severity: 'info',
    },
    {
      name: 'environment-variables',
      check: (content) => content.includes('env:'),
      message: '建议使用环境变量管理配置',
      severity: 'info',
    },
  ],
  
  // 安全检查
  security: [
    {
      name: 'no-hardcoded-secrets',
      check: (content) => {
        const suspiciousPatterns = [
          /password:\s*['"][^'"]+['"]/i,
          /api[_-]?key:\s*['"][^'"]+['"]/i,
          /token:\s*['"][^'"]+['"]/i,
          /secret:\s*['"][^'"]+['"]/i,
        ];
        return !suspiciousPatterns.some(pattern => pattern.test(content));
      },
      message: '检测到可能的硬编码密钥，应使用 GitHub Secrets',
      severity: 'error',
    },
    {
      name: 'use-secrets',
      check: (content) => content.includes('secrets.') || !content.includes('password:'),
      message: '建议使用 GitHub Secrets 管理敏感信息',
      severity: 'warning',
    },
  ],
};

/**
 * 验证单个工作流文件
 */
function validateWorkflow(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  
  const results = {
    file: fileName,
    path: filePath,
    passed: [],
    failed: [],
    warnings: [],
    info: [],
  };
  
  // 运行所有验证规则
  Object.entries(validationRules).forEach(([category, rules]) => {
    rules.forEach(rule => {
      const passed = rule.check(content);
      
      const result = {
        category,
        name: rule.name,
        message: rule.message,
        severity: rule.severity,
      };
      
      if (passed) {
        results.passed.push(result);
      } else {
        if (rule.severity === 'error') {
          results.failed.push(result);
        } else if (rule.severity === 'warning') {
          results.warnings.push(result);
        } else {
          results.info.push(result);
        }
      }
    });
  });
  
  return results;
}

/**
 * 验证所有工作流文件
 */
function validateAllWorkflows() {
  const workflowDir = path.join(rootDir, '.github', 'workflows');
  
  if (!fs.existsSync(workflowDir)) {
    console.error('❌ .github/workflows 目录不存在');
    return [];
  }
  
  const files = fs.readdirSync(workflowDir);
  const ymlFiles = files.filter(f => (f.endsWith('.yml') || f.endsWith('.yaml')) && !f.includes('.tmp'));
  
  return ymlFiles.map(file => {
    const filePath = path.join(workflowDir, file);
    return validateWorkflow(filePath);
  });
}

/**
 * 生成验证报告
 */
function generateValidationReport(results) {
  let report = '# CI/CD 工作流验证报告\n\n';
  report += `生成时间: ${new Date().toISOString()}\n\n`;
  
  // 总体统计
  const totalWorkflows = results.length;
  const totalErrors = results.reduce((sum, r) => sum + r.failed.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  const totalInfo = results.reduce((sum, r) => sum + r.info.length, 0);
  
  report += '## 总体统计\n\n';
  report += `- 工作流总数: ${totalWorkflows}\n`;
  report += `- 错误总数: ${totalErrors}\n`;
  report += `- 警告总数: ${totalWarnings}\n`;
  report += `- 建议总数: ${totalInfo}\n\n`;
  
  // 健康评分
  const totalChecks = results.reduce((sum, r) => 
    sum + r.passed.length + r.failed.length + r.warnings.length + r.info.length, 0
  );
  const passedChecks = results.reduce((sum, r) => sum + r.passed.length, 0);
  const healthScore = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
  
  report += `## 健康评分: ${healthScore}%\n\n`;
  
  if (healthScore >= 90) {
    report += '🎉 优秀！工作流配置质量很高。\n\n';
  } else if (healthScore >= 70) {
    report += '✅ 良好，但仍有改进空间。\n\n';
  } else if (healthScore >= 50) {
    report += '⚠️ 一般，建议优化工作流配置。\n\n';
  } else {
    report += '❌ 需要改进，存在多个配置问题。\n\n';
  }
  
  // 详细结果
  report += '## 详细验证结果\n\n';
  
  results.forEach(result => {
    report += `### ${result.file}\n\n`;
    
    // 错误
    if (result.failed.length > 0) {
      report += '#### ❌ 错误\n\n';
      result.failed.forEach(item => {
        report += `- **${item.name}**: ${item.message}\n`;
      });
      report += '\n';
    }
    
    // 警告
    if (result.warnings.length > 0) {
      report += '#### ⚠️ 警告\n\n';
      result.warnings.forEach(item => {
        report += `- **${item.name}**: ${item.message}\n`;
      });
      report += '\n';
    }
    
    // 建议
    if (result.info.length > 0) {
      report += '#### 💡 建议\n\n';
      result.info.forEach(item => {
        report += `- **${item.name}**: ${item.message}\n`;
      });
      report += '\n';
    }
    
    // 通过的检查
    if (result.passed.length > 0) {
      report += `#### ✅ 通过的检查 (${result.passed.length})\n\n`;
      report += '<details>\n<summary>点击查看详情</summary>\n\n';
      result.passed.forEach(item => {
        report += `- ${item.name}\n`;
      });
      report += '\n</details>\n\n';
    }
  });
  
  // 改进建议
  report += '## 改进建议\n\n';
  
  if (totalErrors > 0) {
    report += '### 优先级：高\n\n';
    report += '1. 修复所有错误级别的问题\n';
    report += '2. 确保工作流配置符合基本要求\n\n';
  }
  
  if (totalWarnings > 0) {
    report += '### 优先级：中\n\n';
    report += '1. 添加依赖缓存以提高构建速度\n';
    report += '2. 为作业设置合理的超时时间\n';
    report += '3. 使用 GitHub Secrets 管理敏感信息\n\n';
  }
  
  if (totalInfo > 0) {
    report += '### 优先级：低\n\n';
    report += '1. 遵循最佳实践优化工作流\n';
    report += '2. 添加错误处理和并发控制\n';
    report += '3. 为 GitHub Actions 指定版本号\n\n';
  }
  
  // 参考资源
  report += '## 参考资源\n\n';
  report += '- [GitHub Actions 文档](https://docs.github.com/en/actions)\n';
  report += '- [工作流语法](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)\n';
  report += '- [安全最佳实践](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)\n';
  
  return report;
}

/**
 * 打印控制台输出
 */
function printConsoleOutput(results) {
  console.log('\n' + '='.repeat(60));
  console.log('  CI/CD 工作流验证结果');
  console.log('='.repeat(60) + '\n');
  
  results.forEach(result => {
    console.log(`📄 ${result.file}`);
    
    if (result.failed.length > 0) {
      console.log(`  ❌ 错误: ${result.failed.length}`);
      result.failed.forEach(item => {
        console.log(`     • ${item.message}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.log(`  ⚠️  警告: ${result.warnings.length}`);
      result.warnings.forEach(item => {
        console.log(`     • ${item.message}`);
      });
    }
    
    if (result.info.length > 0) {
      console.log(`  💡 建议: ${result.info.length}`);
    }
    
    console.log(`  ✅ 通过: ${result.passed.length}`);
    console.log('');
  });
  
  // 总体统计
  const totalErrors = results.reduce((sum, r) => sum + r.failed.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  const totalInfo = results.reduce((sum, r) => sum + r.info.length, 0);
  
  console.log('总体统计:');
  console.log(`  错误: ${totalErrors}`);
  console.log(`  警告: ${totalWarnings}`);
  console.log(`  建议: ${totalInfo}`);
  console.log('');
}

/**
 * 主函数
 */
function main() {
  console.log('开始验证 CI/CD 工作流配置...\n');
  
  const results = validateAllWorkflows();
  
  if (results.length === 0) {
    console.error('❌ 未找到工作流文件');
    process.exit(1);
  }
  
  // 打印控制台输出
  printConsoleOutput(results);
  
  // 生成报告
  const report = generateValidationReport(results);
  const reportPath = path.join(rootDir, 'ci-workflow-validation-report.md');
  fs.writeFileSync(reportPath, report, 'utf-8');
  
  console.log(`✅ 验证报告已生成: ${reportPath}\n`);
  
  // 检查是否有错误
  const hasErrors = results.some(r => r.failed.length > 0);
  if (hasErrors) {
    console.error('❌ 发现配置错误，请查看报告了解详情');
    process.exit(1);
  } else {
    console.log('✅ 所有工作流配置验证通过');
    process.exit(0);
  }
}

// 运行主函数
main();
