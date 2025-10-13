#!/usr/bin/env node

/**
 * CI/CD 测试结果聚合和报告生成器
 * 用于收集、分析和报告测试结果
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * 测试结果聚合器
 */
class CITestResultsAggregator {
  constructor() {
    this.results = {
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        passRate: 0,
      },
      coverage: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
      suites: [],
      errors: [],
      artifacts: [],
    };
  }

  /**
   * 收集所有测试结果
   */
  async collectResults() {
    console.log('📊 收集测试结果...');
    
    // 收集后端测试结果
    await this.collectBackendResults();
    
    // 收集前端测试结果
    await this.collectFrontendResults();
    
    // 收集E2E测试结果
    await this.collectE2EResults();
    
    // 收集覆盖率报告
    await this.collectCoverageResults();
    
    // 计算汇总数据
    this.calculateSummary();
    
    console.log('✅ 测试结果收集完成');
    return this.results;
  }

  /**
   * 收集后端测试结果
   */
  async collectBackendResults() {
    const backendDir = join(rootDir, 'afa-office-system/backend');
    const resultsDir = join(backendDir, 'test-results');
    
    if (existsSync(resultsDir)) {
      console.log('📋 收集后端测试结果...');
      
      // 收集Vitest结果
      const vitestResults = this.findFiles(resultsDir, '.json');
      for (const file of vitestResults) {
        try {
          const result = JSON.parse(readFileSync(file, 'utf8'));
          this.processVitestResult(result, 'backend');
        } catch (error) {
          console.error(`解析后端测试结果失败: ${file}`, error.message);
          this.results.errors.push({
            type: 'parse_error',
            file,
            message: error.message,
          });
        }
      }
    }
  }

  /**
   * 收集前端测试结果
   */
  async collectFrontendResults() {
    const frontendDirs = [
      'afa-office-system/frontend/tenant-admin',
      'afa-office-system/frontend/merchant-admin'
    ];
    
    for (const dir of frontendDirs) {
      const frontendDir = join(rootDir, dir);
      const resultsDir = join(frontendDir, 'test-results');
      
      if (existsSync(resultsDir)) {
        console.log(`📋 收集前端测试结果: ${dir}...`);
        
        const testResults = this.findFiles(resultsDir, '.json');
        for (const file of testResults) {
          try {
            const result = JSON.parse(readFileSync(file, 'utf8'));
            this.processVitestResult(result, `frontend-${dir.split('/').pop()}`);
          } catch (error) {
            console.error(`解析前端测试结果失败: ${file}`, error.message);
            this.results.errors.push({
              type: 'parse_error',
              file,
              message: error.message,
            });
          }
        }
      }
    }
  }

  /**
   * 收集E2E测试结果
   */
  async collectE2EResults() {
    const backendDir = join(rootDir, 'afa-office-system/backend');
    const e2eResultsDir = join(backendDir, 'tests/e2e/reports');
    
    if (existsSync(e2eResultsDir)) {
      console.log('📋 收集E2E测试结果...');
      
      // 收集Playwright结果
      const playwrightResults = this.findFiles(e2eResultsDir, '.json');
      for (const file of playwrightResults) {
        try {
          const result = JSON.parse(readFileSync(file, 'utf8'));
          this.processPlaywrightResult(result);
        } catch (error) {
          console.error(`解析E2E测试结果失败: ${file}`, error.message);
          this.results.errors.push({
            type: 'parse_error',
            file,
            message: error.message,
          });
        }
      }
    }
  }

  /**
   * 收集覆盖率结果
   */
  async collectCoverageResults() {
    console.log('📊 收集覆盖率报告...');
    
    // 后端覆盖率
    const backendCoverageFile = join(rootDir, 'afa-office-system/backend/coverage/coverage-summary.json');
    if (existsSync(backendCoverageFile)) {
      try {
        const coverage = JSON.parse(readFileSync(backendCoverageFile, 'utf8'));
        this.processCoverageResult(coverage, 'backend');
      } catch (error) {
        console.error('解析后端覆盖率失败:', error.message);
      }
    }
    
    // 前端覆盖率
    const frontendDirs = [
      'afa-office-system/frontend/tenant-admin',
      'afa-office-system/frontend/merchant-admin'
    ];
    
    for (const dir of frontendDirs) {
      const coverageFile = join(rootDir, dir, 'coverage/coverage-summary.json');
      if (existsSync(coverageFile)) {
        try {
          const coverage = JSON.parse(readFileSync(coverageFile, 'utf8'));
          this.processCoverageResult(coverage, `frontend-${dir.split('/').pop()}`);
        } catch (error) {
          console.error(`解析前端覆盖率失败 (${dir}):`, error.message);
        }
      }
    }
  }

  /**
   * 处理Vitest测试结果
   */
  processVitestResult(result, suite) {
    const suiteResult = {
      name: suite,
      type: 'unit',
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      tests: [],
    };

    if (result.testResults) {
      for (const testFile of result.testResults) {
        for (const test of testFile.assertionResults || []) {
          suiteResult.total++;
          suiteResult.duration += test.duration || 0;
          
          const testResult = {
            name: test.fullName || test.title,
            status: test.status,
            duration: test.duration || 0,
            error: test.failureMessages ? test.failureMessages.join('\n') : null,
          };
          
          switch (test.status) {
            case 'passed':
              suiteResult.passed++;
              break;
            case 'failed':
              suiteResult.failed++;
              break;
            case 'skipped':
            case 'pending':
              suiteResult.skipped++;
              break;
          }
          
          suiteResult.tests.push(testResult);
        }
      }
    }

    this.results.suites.push(suiteResult);
  }

  /**
   * 处理Playwright测试结果
   */
  processPlaywrightResult(result) {
    const suiteResult = {
      name: 'e2e',
      type: 'e2e',
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      tests: [],
    };

    if (result.suites) {
      for (const suite of result.suites) {
        this.processPlaywrightSuite(suite, suiteResult);
      }
    }

    this.results.suites.push(suiteResult);
  }

  /**
   * 处理Playwright测试套件
   */
  processPlaywrightSuite(suite, suiteResult) {
    if (suite.specs) {
      for (const spec of suite.specs) {
        for (const test of spec.tests || []) {
          suiteResult.total++;
          
          const testResult = {
            name: test.title,
            status: test.outcome,
            duration: test.results?.[0]?.duration || 0,
            error: test.results?.[0]?.error?.message || null,
          };
          
          suiteResult.duration += testResult.duration;
          
          switch (test.outcome) {
            case 'expected':
              suiteResult.passed++;
              break;
            case 'unexpected':
              suiteResult.failed++;
              break;
            case 'skipped':
              suiteResult.skipped++;
              break;
          }
          
          suiteResult.tests.push(testResult);
        }
      }
    }

    if (suite.suites) {
      for (const subSuite of suite.suites) {
        this.processPlaywrightSuite(subSuite, suiteResult);
      }
    }
  }

  /**
   * 处理覆盖率结果
   */
  processCoverageResult(coverage, suite) {
    if (coverage.total) {
      const total = coverage.total;
      this.results.coverage = {
        lines: (this.results.coverage.lines + total.lines.pct) / 2,
        functions: (this.results.coverage.functions + total.functions.pct) / 2,
        branches: (this.results.coverage.branches + total.branches.pct) / 2,
        statements: (this.results.coverage.statements + total.statements.pct) / 2,
      };
    }
  }

  /**
   * 计算汇总数据
   */
  calculateSummary() {
    for (const suite of this.results.suites) {
      this.results.summary.total += suite.total;
      this.results.summary.passed += suite.passed;
      this.results.summary.failed += suite.failed;
      this.results.summary.skipped += suite.skipped;
      this.results.summary.duration += suite.duration;
    }

    if (this.results.summary.total > 0) {
      this.results.summary.passRate = (this.results.summary.passed / this.results.summary.total) * 100;
    }
  }

  /**
   * 查找指定扩展名的文件
   */
  findFiles(dir, extension) {
    const files = [];
    
    if (!existsSync(dir)) {
      return files;
    }
    
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.findFiles(fullPath, extension));
      } else if (extname(item) === extension) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
}

/**
 * 测试报告生成器
 */
class CITestReportGenerator {
  constructor(results) {
    this.results = results;
  }

  /**
   * 生成HTML报告
   */
  generateHTMLReport() {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>前后端集成测试报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header .subtitle { opacity: 0.9; margin-top: 10px; }
        .content { padding: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .metric.success { border-left-color: #28a745; }
        .metric.danger { border-left-color: #dc3545; }
        .metric.warning { border-left-color: #ffc107; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #6c757d; font-size: 0.9em; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .suite { background: #f8f9fa; margin-bottom: 15px; border-radius: 8px; overflow: hidden; }
        .suite-header { background: #e9ecef; padding: 15px; font-weight: bold; cursor: pointer; }
        .suite-content { padding: 15px; display: none; }
        .suite-content.active { display: block; }
        .test { padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
        .test:last-child { border-bottom: none; }
        .test-status { padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
        .test-status.passed { background: #d4edda; color: #155724; }
        .test-status.failed { background: #f8d7da; color: #721c24; }
        .test-status.skipped { background: #fff3cd; color: #856404; }
        .coverage-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
        .coverage-item { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        .coverage-value { font-size: 1.5em; font-weight: bold; margin-bottom: 5px; }
        .errors { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 15px; }
        .error { margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px; }
        .timestamp { text-align: center; color: #6c757d; margin-top: 30px; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>前后端集成测试报告</h1>
            <div class="subtitle">AFA办公小程序系统 - 自动化测试结果</div>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>测试概览</h2>
                <div class="summary">
                    <div class="metric ${this.results.summary.failed > 0 ? 'danger' : 'success'}">
                        <div class="metric-value">${this.results.summary.total}</div>
                        <div class="metric-label">总测试数</div>
                    </div>
                    <div class="metric success">
                        <div class="metric-value">${this.results.summary.passed}</div>
                        <div class="metric-label">通过</div>
                    </div>
                    <div class="metric ${this.results.summary.failed > 0 ? 'danger' : 'success'}">
                        <div class="metric-value">${this.results.summary.failed}</div>
                        <div class="metric-label">失败</div>
                    </div>
                    <div class="metric warning">
                        <div class="metric-value">${this.results.summary.skipped}</div>
                        <div class="metric-label">跳过</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${this.results.summary.passRate.toFixed(1)}%</div>
                        <div class="metric-label">通过率</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${(this.results.summary.duration / 1000).toFixed(1)}s</div>
                        <div class="metric-label">执行时间</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>覆盖率统计</h2>
                <div class="coverage-grid">
                    <div class="coverage-item">
                        <div class="coverage-value">${this.results.coverage.lines.toFixed(1)}%</div>
                        <div class="metric-label">行覆盖率</div>
                    </div>
                    <div class="coverage-item">
                        <div class="coverage-value">${this.results.coverage.functions.toFixed(1)}%</div>
                        <div class="metric-label">函数覆盖率</div>
                    </div>
                    <div class="coverage-item">
                        <div class="coverage-value">${this.results.coverage.branches.toFixed(1)}%</div>
                        <div class="metric-label">分支覆盖率</div>
                    </div>
                    <div class="coverage-item">
                        <div class="coverage-value">${this.results.coverage.statements.toFixed(1)}%</div>
                        <div class="metric-label">语句覆盖率</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>测试套件详情</h2>
                ${this.results.suites.map(suite => `
                    <div class="suite">
                        <div class="suite-header" onclick="toggleSuite(this)">
                            ${suite.name} (${suite.type}) - ${suite.passed}/${suite.total} 通过
                        </div>
                        <div class="suite-content">
                            ${suite.tests.map(test => `
                                <div class="test">
                                    <span>${test.name}</span>
                                    <span class="test-status ${test.status}">${this.getStatusText(test.status)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>

            ${this.results.errors.length > 0 ? `
            <div class="section">
                <h2>错误信息</h2>
                <div class="errors">
                    ${this.results.errors.map(error => `
                        <div class="error">
                            <strong>${error.type}:</strong> ${error.message}
                            ${error.file ? `<br><small>文件: ${error.file}</small>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>
        
        <div class="timestamp">
            报告生成时间: ${new Date().toLocaleString('zh-CN')}
        </div>
    </div>

    <script>
        function toggleSuite(header) {
            const content = header.nextElementSibling;
            content.classList.toggle('active');
        }
    </script>
</body>
</html>`;

    return html;
  }

  /**
   * 生成Markdown报告
   */
  generateMarkdownReport() {
    const md = `# 前后端集成测试报告

## 测试概览

| 指标 | 数值 |
|------|------|
| 总测试数 | ${this.results.summary.total} |
| 通过 | ${this.results.summary.passed} |
| 失败 | ${this.results.summary.failed} |
| 跳过 | ${this.results.summary.skipped} |
| 通过率 | ${this.results.summary.passRate.toFixed(1)}% |
| 执行时间 | ${(this.results.summary.duration / 1000).toFixed(1)}秒 |

## 覆盖率统计

| 类型 | 覆盖率 |
|------|--------|
| 行覆盖率 | ${this.results.coverage.lines.toFixed(1)}% |
| 函数覆盖率 | ${this.results.coverage.functions.toFixed(1)}% |
| 分支覆盖率 | ${this.results.coverage.branches.toFixed(1)}% |
| 语句覆盖率 | ${this.results.coverage.statements.toFixed(1)}% |

## 测试套件详情

${this.results.suites.map(suite => `
### ${suite.name} (${suite.type})

- 总计: ${suite.total}
- 通过: ${suite.passed}
- 失败: ${suite.failed}
- 跳过: ${suite.skipped}
- 执行时间: ${(suite.duration / 1000).toFixed(1)}秒

${suite.tests.filter(test => test.status === 'failed').length > 0 ? `
#### 失败的测试

${suite.tests.filter(test => test.status === 'failed').map(test => `
- ❌ ${test.name}
  ${test.error ? `\`\`\`\n${test.error}\n\`\`\`` : ''}
`).join('')}
` : ''}
`).join('')}

${this.results.errors.length > 0 ? `
## 错误信息

${this.results.errors.map(error => `
- **${error.type}**: ${error.message}
  ${error.file ? `文件: \`${error.file}\`` : ''}
`).join('')}
` : ''}

---
*报告生成时间: ${new Date().toLocaleString('zh-CN')}*`;

    return md;
  }

  /**
   * 生成JSON报告
   */
  generateJSONReport() {
    return JSON.stringify({
      ...this.results,
      timestamp: new Date().toISOString(),
      generator: 'ci-test-reporter',
      version: '1.0.0',
    }, null, 2);
  }

  /**
   * 获取状态文本
   */
  getStatusText(status) {
    const statusMap = {
      passed: '通过',
      failed: '失败',
      skipped: '跳过',
      pending: '跳过',
      expected: '通过',
      unexpected: '失败',
    };
    return statusMap[status] || status;
  }
}

/**
 * 主函数
 */
async function main() {
  const command = process.argv[2] || 'generate';
  const format = process.argv[3] || 'all';
  
  try {
    console.log('🚀 开始生成测试报告...');
    
    // 收集测试结果
    const aggregator = new CITestResultsAggregator();
    const results = await aggregator.collectResults();
    
    // 生成报告
    const generator = new CITestReportGenerator(results);
    
    // 确保输出目录存在
    const outputDir = join(rootDir, 'test-reports');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    // 生成不同格式的报告
    if (format === 'all' || format === 'html') {
      const htmlReport = generator.generateHTMLReport();
      writeFileSync(join(outputDir, 'test-report.html'), htmlReport);
      console.log('✅ HTML报告已生成: test-reports/test-report.html');
    }
    
    if (format === 'all' || format === 'markdown') {
      const mdReport = generator.generateMarkdownReport();
      writeFileSync(join(outputDir, 'test-report.md'), mdReport);
      console.log('✅ Markdown报告已生成: test-reports/test-report.md');
    }
    
    if (format === 'all' || format === 'json') {
      const jsonReport = generator.generateJSONReport();
      writeFileSync(join(outputDir, 'test-report.json'), jsonReport);
      console.log('✅ JSON报告已生成: test-reports/test-report.json');
    }
    
    // 输出摘要
    console.log('\n📊 测试结果摘要:');
    console.log(`总计: ${results.summary.total}, 通过: ${results.summary.passed}, 失败: ${results.summary.failed}, 跳过: ${results.summary.skipped}`);
    console.log(`通过率: ${results.summary.passRate.toFixed(1)}%, 执行时间: ${(results.summary.duration / 1000).toFixed(1)}秒`);
    
    if (results.summary.failed > 0) {
      console.log('\n❌ 存在失败的测试');
      process.exit(1);
    } else {
      console.log('\n✅ 所有测试通过');
    }
    
  } catch (error) {
    console.error('❌ 生成测试报告失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { CITestResultsAggregator, CITestReportGenerator };