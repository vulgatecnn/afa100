import { FullConfig } from '@playwright/test';
import { DatabaseManager } from './database-manager.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * 全局测试清理
 * 在所有测试结束后执行
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 开始端到端测试环境清理...');

  try {
    // 1. 清理测试数据库
    console.log('🗄️ 清理测试数据库...');
    const dbManager = new DatabaseManager();
    await dbManager.cleanup();
    console.log('✅ 测试数据库清理完成');

    // 2. 清理认证状态文件
    console.log('🔐 清理认证状态文件...');
    await cleanupAuthStates();
    console.log('✅ 认证状态文件清理完成');

    // 3. 清理临时文件
    console.log('📁 清理临时文件...');
    await cleanupTempFiles();
    console.log('✅ 临时文件清理完成');

    // 4. 生成测试报告摘要
    console.log('📊 生成测试报告摘要...');
    await generateTestSummary();
    console.log('✅ 测试报告摘要生成完成');

    console.log('🎉 端到端测试环境清理完成');
  } catch (error) {
    console.error('❌ 测试环境清理失败:', error);
    // 不抛出错误，避免影响测试结果
  }
}

/**
 * 清理认证状态文件
 */
async function cleanupAuthStates() {
  const authStatesDir = 'tests/e2e/fixtures/auth-states';
  
  try {
    const files = await fs.readdir(authStatesDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        await fs.unlink(path.join(authStatesDir, file));
      }
    }
  } catch (error) {
    console.warn('清理认证状态文件时出错:', error);
  }
}

/**
 * 清理临时文件
 */
async function cleanupTempFiles() {
  const tempDirs = [
    'tests/e2e/reports/screenshots',
    'tests/e2e/reports/videos',
    'tests/e2e/reports/traces'
  ];

  for (const dir of tempDirs) {
    try {
      const stat = await fs.stat(dir);
      if (stat.isDirectory()) {
        const files = await fs.readdir(dir);
        for (const file of files) {
          await fs.unlink(path.join(dir, file));
        }
      }
    } catch (error) {
      // 目录不存在或其他错误，忽略
    }
  }
}

/**
 * 生成测试报告摘要
 */
async function generateTestSummary() {
  try {
    const resultsPath = 'tests/e2e/reports/test-results.json';
    const summaryPath = 'tests/e2e/reports/test-summary.md';
    
    // 检查测试结果文件是否存在
    try {
      await fs.access(resultsPath);
    } catch {
      console.log('测试结果文件不存在，跳过摘要生成');
      return;
    }

    const resultsContent = await fs.readFile(resultsPath, 'utf-8');
    const results = JSON.parse(resultsContent);

    const summary = generateSummaryMarkdown(results);
    await fs.writeFile(summaryPath, summary, 'utf-8');
  } catch (error) {
    console.warn('生成测试报告摘要时出错:', error);
  }
}

/**
 * 生成测试摘要Markdown内容
 */
function generateSummaryMarkdown(results: any): string {
  const timestamp = new Date().toISOString();
  const stats = results.stats || {};
  
  return `# 端到端测试报告摘要

## 测试概览

- **执行时间**: ${timestamp}
- **总测试数**: ${stats.total || 0}
- **通过测试**: ${stats.passed || 0}
- **失败测试**: ${stats.failed || 0}
- **跳过测试**: ${stats.skipped || 0}
- **执行时长**: ${stats.duration || 0}ms

## 测试结果

${stats.failed > 0 ? '❌ 存在失败的测试' : '✅ 所有测试通过'}

## 详细报告

完整的测试报告请查看:
- HTML报告: \`tests/e2e/reports/playwright-report/index.html\`
- JSON结果: \`tests/e2e/reports/test-results.json\`
- JUnit结果: \`tests/e2e/reports/junit-results.xml\`

## 测试覆盖范围

- 用户认证流程测试
- 核心业务流程测试  
- 系统集成测试
- API接口测试

---
*报告生成时间: ${timestamp}*
`;
}

export default globalTeardown;