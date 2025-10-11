/**
 * 前端测试输出解析器
 * 专门解析前端React测试环境的输出，支持Vitest和Jest框架
 */

/**
 * 解析前端测试输出，提取关键统计信息
 * @param {string} output - 测试输出内容
 * @param {string} moduleKey - 模块标识符 (frontend-tenant 或 frontend-merchant)
 * @returns {Object} 解析后的测试结果
 */
export function parseFrontendTestOutput(output, moduleKey = 'frontend') {
  const lines = output.split('\n');
  
  // 初始化结果对象
  const result = {
    moduleKey,
    framework: 'vitest', // 默认为vitest，会根据输出自动检测
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: '0s',
    hasErrors: false,
    testFiles: {
      total: 0,
      passed: 0,
      failed: 0
    },
    coverage: null,
    errors: []
  };
  
  console.log(`🔍 开始解析前端测试输出 (${moduleKey})，共 ${lines.length} 行`);
  
  // 清理ANSI颜色代码的函数
  function stripAnsiCodes(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }
  
  // 检测测试框架
  const frameworkDetected = detectTestFramework(output);
  result.framework = frameworkDetected;
  console.log(`🔍 检测到测试框架: ${frameworkDetected}`);
  
  // 根据框架选择解析策略
  if (frameworkDetected === 'jest') {
    parseJestOutput(lines, result, stripAnsiCodes);
  } else {
    parseVitestOutput(lines, result, stripAnsiCodes);
  }
  
  // 提取错误信息
  if (result.hasErrors) {
    result.errors = extractFrontendErrors(output, frameworkDetected);
    console.log(`🔍 提取到 ${result.errors.length} 个错误信息`);
  }
  
  // 提取覆盖率信息
  result.coverage = extractFrontendCoverage(output, frameworkDetected);
  if (result.coverage) {
    console.log(`📊 提取到覆盖率信息: ${result.coverage.statements}% 语句覆盖率`);
  }
  
  console.log(`📊 前端测试解析完成: passed=${result.passed}, failed=${result.failed}, total=${result.totalTests}, duration=${result.duration}`);
  
  return result;
}

/**
 * 检测测试框架类型
 * @param {string} output - 测试输出内容
 * @returns {string} 框架名称 ('jest' 或 'vitest')
 */
function detectTestFramework(output) {
  // Jest特征标识
  const jestIndicators = [
    'PASS ',
    'FAIL ',
    'Test Suites:',
    'Tests:',
    'Snapshots:',
    'Time:'
  ];
  
  // Vitest特征标识
  const vitestIndicators = [
    'Test Files',
    'Tests',
    'Duration',
    'RUN  v',
    '✓',
    '❯'
  ];
  
  const jestScore = jestIndicators.reduce((score, indicator) => {
    return score + (output.includes(indicator) ? 1 : 0);
  }, 0);
  
  const vitestScore = vitestIndicators.reduce((score, indicator) => {
    return score + (output.includes(indicator) ? 1 : 0);
  }, 0);
  
  return jestScore > vitestScore ? 'jest' : 'vitest';
}

/**
 * 解析Vitest输出格式
 * @param {Array} lines - 输出行数组
 * @param {Object} result - 结果对象
 * @param {Function} stripAnsiCodes - 清理ANSI代码的函数
 */
function parseVitestOutput(lines, result, stripAnsiCodes) {
  for (let i = 0; i < lines.length; i++) {
    const line = stripAnsiCodes(lines[i]).trim();
    
    // 匹配Test Files行 - 支持多种格式
    // 格式1: "Test Files  5 failed | 2 passed (7)"
    const testFilesMatch = line.match(/Test Files\s+(?:(\d+)\s+failed\s*\|\s*)?(\d+)\s+passed\s*\((\d+)\)/);
    if (testFilesMatch) {
      result.testFiles.failed = parseInt(testFilesMatch[1]) || 0;
      result.testFiles.passed = parseInt(testFilesMatch[2]) || 0;
      result.testFiles.total = parseInt(testFilesMatch[3]) || 0;
      console.log(`✅ 解析到测试文件统计: ${result.testFiles.failed} 失败, ${result.testFiles.passed} 通过, ${result.testFiles.total} 总计`);
    }
    
    // 格式2: "Test Files  5 failed (5)" - 只有失败的情况
    const testFilesFailedOnlyMatch = line.match(/Test Files\s+(\d+)\s+failed\s*\((\d+)\)/);
    if (testFilesFailedOnlyMatch && !testFilesMatch) {
      result.testFiles.failed = parseInt(testFilesFailedOnlyMatch[1]) || 0;
      result.testFiles.passed = 0;
      result.testFiles.total = parseInt(testFilesFailedOnlyMatch[2]) || 0;
      console.log(`✅ 解析到测试文件统计(仅失败): ${result.testFiles.failed} 失败, ${result.testFiles.passed} 通过, ${result.testFiles.total} 总计`);
    }
    
    // 匹配Tests行 - 支持多种格式
    // 格式1: "Tests  10 failed | 20 passed (30)"
    const testsMatch = line.match(/Tests\s+(?:(\d+)\s+failed\s*\|\s*)?(\d+)\s+passed\s*\((\d+)\)/);
    if (testsMatch) {
      result.failed = parseInt(testsMatch[1]) || 0;
      result.passed = parseInt(testsMatch[2]) || 0;
      result.totalTests = parseInt(testsMatch[3]) || 0;
      result.hasErrors = result.failed > 0;
      console.log(`✅ 解析到测试统计: ${result.failed} 失败, ${result.passed} 通过, ${result.totalTests} 总计`);
    }
    
    // 格式2: "Tests  4 failed (4)" - 只有失败的情况
    const testsFailedOnlyMatch = line.match(/Tests\s+(\d+)\s+failed\s*\((\d+)\)/);
    if (testsFailedOnlyMatch && !testsMatch) {
      result.failed = parseInt(testsFailedOnlyMatch[1]) || 0;
      result.passed = 0;
      result.totalTests = parseInt(testsFailedOnlyMatch[2]) || 0;
      result.hasErrors = result.failed > 0;
      console.log(`✅ 解析到测试统计(仅失败): ${result.failed} 失败, ${result.passed} 通过, ${result.totalTests} 总计`);
    }
    
    // 匹配执行时间
    const durationMatch = line.match(/Duration\s+(\d+(?:\.\d+)?s)/);
    if (durationMatch) {
      result.duration = durationMatch[1];
      console.log(`✅ 解析到执行时间: ${result.duration}`);
    }
    
    // 匹配跳过的测试
    const skippedMatch = line.match(/Skipped\s+(\d+)\s+skipped/);
    if (skippedMatch) {
      result.skipped = parseInt(skippedMatch[1]) || 0;
      console.log(`✅ 解析到跳过测试: ${result.skipped}`);
    }
  }
}

/**
 * 解析Jest输出格式
 * @param {Array} lines - 输出行数组
 * @param {Object} result - 结果对象
 * @param {Function} stripAnsiCodes - 清理ANSI代码的函数
 */
function parseJestOutput(lines, result, stripAnsiCodes) {
  for (let i = 0; i < lines.length; i++) {
    const line = stripAnsiCodes(lines[i]).trim();
    
    // 匹配Jest的Test Suites行: "Test Suites: 2 failed, 8 passed, 10 total"
    const testSuitesMatch = line.match(/Test Suites:\s*(?:(\d+)\s+failed,\s*)?(\d+)\s+passed,\s*(\d+)\s+total/);
    if (testSuitesMatch) {
      result.testFiles.failed = parseInt(testSuitesMatch[1]) || 0;
      result.testFiles.passed = parseInt(testSuitesMatch[2]) || 0;
      result.testFiles.total = parseInt(testSuitesMatch[3]) || 0;
      console.log(`✅ 解析到测试套件统计: ${result.testFiles.failed} 失败, ${result.testFiles.passed} 通过, ${result.testFiles.total} 总计`);
    }
    
    // 匹配Jest的Tests行: "Tests: 5 failed, 25 passed, 30 total"
    const testsMatch = line.match(/Tests:\s*(?:(\d+)\s+failed,\s*)?(\d+)\s+passed,\s*(\d+)\s+total/);
    if (testsMatch) {
      result.failed = parseInt(testsMatch[1]) || 0;
      result.passed = parseInt(testsMatch[2]) || 0;
      result.totalTests = parseInt(testsMatch[3]) || 0;
      result.hasErrors = result.failed > 0;
      console.log(`✅ 解析到测试统计: ${result.failed} 失败, ${result.passed} 通过, ${result.totalTests} 总计`);
    }
    
    // 匹配Jest的Snapshots行: "Snapshots: 2 failed, 8 passed, 10 total"
    const snapshotsMatch = line.match(/Snapshots:\s*(?:(\d+)\s+failed,\s*)?(\d+)\s+passed,\s*(\d+)\s+total/);
    if (snapshotsMatch) {
      // Jest快照信息可以记录但不影响主要统计
      console.log(`📸 快照统计: ${parseInt(snapshotsMatch[1]) || 0} 失败, ${parseInt(snapshotsMatch[2]) || 0} 通过`);
    }
    
    // 匹配Jest的Time行: "Time: 5.123 s"
    const timeMatch = line.match(/Time:\s*(\d+(?:\.\d+)?)\s*s/);
    if (timeMatch) {
      result.duration = timeMatch[1] + 's';
      console.log(`✅ 解析到执行时间: ${result.duration}`);
    }
  }
}

/**
 * 从前端测试输出中提取错误信息
 * @param {string} output - 测试输出内容
 * @param {string} framework - 测试框架类型
 * @returns {Array} 错误信息数组
 */
export function extractFrontendErrors(output, framework = 'vitest') {
  const lines = output.split('\n');
  const errors = [];
  let currentError = null;
  let inErrorSection = false;
  
  if (framework === 'jest') {
    return extractJestErrors(lines);
  } else {
    return extractVitestErrors(lines);
  }
}

/**
 * 提取Vitest错误信息
 * @param {Array} lines - 输出行数组
 * @returns {Array} 错误信息数组
 */
function extractVitestErrors(lines) {
  const errors = [];
  let currentError = null;
  let inErrorSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // 检测失败的测试开始 - Vitest格式: "❯ ComponentName.test.tsx > Component Tests > should render correctly"
    const failureMatch = line.match(/❯\s+(.+?\.test\.[jt]sx?)\s+>\s+(.+?)(?:\s+>\s+(.+))?$/);
    if (failureMatch) {
      if (currentError) {
        errors.push(currentError);
      }
      
      currentError = {
        testFile: failureMatch[1],
        testSuite: failureMatch[2],
        testName: failureMatch[3] || failureMatch[2],
        errorMessage: '',
        stackTrace: [],
        line: i + 1,
        errorType: 'test_failure',
        component: extractComponentName(failureMatch[1])
      };
      inErrorSection = true;
      continue;
    }
    
    // 在错误区域内收集错误信息
    if (inErrorSection && currentError) {
      // 检测React/前端特有的错误类型
      if (trimmedLine.includes('AssertionError') || trimmedLine.includes('Error:')) {
        currentError.errorMessage = trimmedLine;
        currentError.errorType = trimmedLine.includes('AssertionError') ? 'assertion' : 'error';
      }
      
      // 检测React组件渲染错误
      if (trimmedLine.includes('Cannot read properties') || trimmedLine.includes('TypeError')) {
        currentError.errorType = 'component_error';
        currentError.errorMessage = trimmedLine;
      }
      
      // 检测期望值和实际值
      if (trimmedLine.includes('Expected:') || trimmedLine.includes('Received:')) {
        currentError.errorMessage += (currentError.errorMessage ? '\n' : '') + trimmedLine;
      }
      
      // 收集堆栈跟踪信息
      if (trimmedLine.includes('at ') && (trimmedLine.includes('.test.') || trimmedLine.includes('.spec.'))) {
        currentError.stackTrace.push(trimmedLine);
      }
      
      // 检测错误区域结束
      if (trimmedLine === '' && i > 0 && lines[i-1].trim() === '') {
        inErrorSection = false;
      }
    }
    
    // 检测新的测试文件开始，结束当前错误收集
    if (trimmedLine.startsWith('✓') || trimmedLine.startsWith('Test Files')) {
      if (currentError) {
        errors.push(currentError);
        currentError = null;
      }
      inErrorSection = false;
    }
  }
  
  if (currentError) {
    errors.push(currentError);
  }
  
  return errors;
}

/**
 * 提取Jest错误信息
 * @param {Array} lines - 输出行数组
 * @returns {Array} 错误信息数组
 */
function extractJestErrors(lines) {
  const errors = [];
  let currentError = null;
  let inErrorSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // 检测Jest失败的测试开始
    if (trimmedLine.startsWith('FAIL ')) {
      const fileMatch = trimmedLine.match(/FAIL\s+(.+?\.test\.[jt]sx?)/);
      if (fileMatch) {
        if (currentError) {
          errors.push(currentError);
        }
        
        currentError = {
          testFile: fileMatch[1],
          testSuite: '',
          testName: '',
          errorMessage: '',
          stackTrace: [],
          line: i + 1,
          errorType: 'test_failure',
          component: extractComponentName(fileMatch[1])
        };
        inErrorSection = true;
      }
      continue;
    }
    
    // 在错误区域内收集错误信息
    if (inErrorSection && currentError) {
      // 检测测试名称
      if (trimmedLine.includes('●')) {
        const testNameMatch = trimmedLine.match(/●\s+(.+)/);
        if (testNameMatch) {
          currentError.testName = testNameMatch[1];
        }
      }
      
      // 检测错误信息
      if (trimmedLine.includes('expect(') || trimmedLine.includes('Error:')) {
        currentError.errorMessage = trimmedLine;
      }
      
      // 收集堆栈跟踪
      if (trimmedLine.includes('at ')) {
        currentError.stackTrace.push(trimmedLine);
      }
    }
    
    // 检测新的测试文件开始
    if (trimmedLine.startsWith('PASS ') || trimmedLine.startsWith('Test Suites:')) {
      if (currentError) {
        errors.push(currentError);
        currentError = null;
      }
      inErrorSection = false;
    }
  }
  
  if (currentError) {
    errors.push(currentError);
  }
  
  return errors;
}

/**
 * 从文件名中提取组件名称
 * @param {string} filename - 测试文件名
 * @returns {string} 组件名称
 */
function extractComponentName(filename) {
  const match = filename.match(/([^/\\]+)\.test\.[jt]sx?$/);
  return match ? match[1] : filename;
}

/**
 * 从前端测试输出中提取覆盖率信息
 * @param {string} output - 测试输出内容
 * @param {string} framework - 测试框架类型
 * @returns {Object|null} 覆盖率信息对象
 */
export function extractFrontendCoverage(output, framework = 'vitest') {
  const lines = output.split('\n');
  let coverage = null;
  
  // 查找覆盖率表格
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 检测覆盖率表格开始
    if (line.includes('% Coverage report') || line.includes('Coverage Summary') || line.includes('% Stmts')) {
      coverage = {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
        files: []
      };
      
      // 继续解析覆盖率数据
      for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
        const coverageLine = lines[j];
        
        // 匹配总体覆盖率行
        const totalMatch = coverageLine.match(/All files\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)/);
        if (totalMatch) {
          coverage.statements = parseFloat(totalMatch[1]);
          coverage.branches = parseFloat(totalMatch[2]);
          coverage.functions = parseFloat(totalMatch[3]);
          coverage.lines = parseFloat(totalMatch[4]);
          break;
        }
        
        // 匹配单个文件覆盖率（前端组件文件）
        const fileMatch = coverageLine.match(/(.+?\.[jt]sx?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)/);
        if (fileMatch) {
          coverage.files.push({
            file: fileMatch[1].trim(),
            statements: parseFloat(fileMatch[2]),
            branches: parseFloat(fileMatch[3]),
            functions: parseFloat(fileMatch[4]),
            lines: parseFloat(fileMatch[5]),
            component: extractComponentName(fileMatch[1])
          });
        }
      }
      break;
    }
  }
  
  return coverage;
}

/**
 * 生成前端测试错误摘要
 * @param {Array} errors - 错误信息数组
 * @param {Object} results - 测试结果对象
 * @returns {string} 格式化的错误摘要
 */
export function generateFrontendErrorSummary(errors, results) {
  if (!errors || errors.length === 0) {
    return '';
  }
  
  const timestamp = new Date().toLocaleString('zh-CN');
  const moduleName = getModuleName(results.moduleKey);
  
  let summary = `${moduleName}测试失败摘要 (${timestamp})\n`;
  summary += '='.repeat(60) + '\n\n';
  
  summary += `📊 测试统计:\n`;
  summary += `   总测试数: ${results.totalTests}\n`;
  summary += `   通过: ${results.passed}\n`;
  summary += `   失败: ${results.failed}\n`;
  summary += `   跳过: ${results.skipped}\n`;
  summary += `   执行时间: ${results.duration}\n`;
  summary += `   测试框架: ${results.framework}\n\n`;
  
  summary += `❌ 失败的测试 (${errors.length} 个):\n`;
  summary += '-'.repeat(40) + '\n';
  
  // 按组件分组显示错误
  const errorsByComponent = {};
  errors.forEach(error => {
    const component = error.component || '未知组件';
    if (!errorsByComponent[component]) {
      errorsByComponent[component] = [];
    }
    errorsByComponent[component].push(error);
  });
  
  Object.keys(errorsByComponent).forEach(component => {
    summary += `\n📦 ${component}:\n`;
    errorsByComponent[component].forEach((error, index) => {
      summary += `   ${index + 1}. ${error.testName || error.testSuite}\n`;
      if (error.errorMessage) {
        summary += `      错误: ${error.errorMessage.split('\n')[0]}\n`;
      }
      summary += `      类型: ${error.errorType}\n`;
      if (error.stackTrace.length > 0) {
        summary += `      位置: ${error.stackTrace[0]}\n`;
      }
    });
  });
  
  summary += '\n' + '='.repeat(60) + '\n';
  summary += `详细错误信息请查看完整的测试执行日志\n`;
  
  return summary;
}

/**
 * 生成前端覆盖率摘要
 * @param {Object} coverage - 覆盖率信息对象
 * @param {string} moduleKey - 模块标识符
 * @returns {string} 格式化的覆盖率摘要
 */
export function generateFrontendCoverageSummary(coverage, moduleKey) {
  if (!coverage) {
    return '';
  }
  
  const timestamp = new Date().toLocaleString('zh-CN');
  const moduleName = getModuleName(moduleKey);
  
  let summary = `${moduleName}覆盖率报告 (${timestamp})\n`;
  summary += '='.repeat(50) + '\n\n';
  
  summary += `📊 总体覆盖率:\n`;
  summary += `   语句覆盖率: ${coverage.statements}%\n`;
  summary += `   分支覆盖率: ${coverage.branches}%\n`;
  summary += `   函数覆盖率: ${coverage.functions}%\n`;
  summary += `   行覆盖率: ${coverage.lines}%\n\n`;
  
  if (coverage.files && coverage.files.length > 0) {
    summary += `📁 组件覆盖率详情:\n`;
    summary += '-'.repeat(30) + '\n';
    
    // 按覆盖率排序，显示覆盖率较低的组件
    const sortedFiles = coverage.files
      .filter(file => file.statements < 80) // 只显示覆盖率低于80%的文件
      .sort((a, b) => a.statements - b.statements);
    
    if (sortedFiles.length > 0) {
      summary += `⚠️  需要关注的组件 (覆盖率 < 80%):\n`;
      sortedFiles.slice(0, 10).forEach(file => { // 只显示前10个
        summary += `   ${file.component}: ${file.statements}%\n`;
      });
    } else {
      summary += `✅ 所有组件覆盖率都达到80%以上\n`;
    }
  }
  
  summary += '\n' + '='.repeat(50) + '\n';
  
  return summary;
}

/**
 * 获取模块显示名称
 * @param {string} moduleKey - 模块标识符
 * @returns {string} 模块显示名称
 */
function getModuleName(moduleKey) {
  const moduleNames = {
    'frontend-tenant': '租务管理端',
    'frontend-merchant': '商户管理端',
    'frontend': '前端'
  };
  
  return moduleNames[moduleKey] || '前端';
}

/**
 * 验证前端测试输出格式
 * @param {string} output - 测试输出内容
 * @returns {boolean} 是否为有效的前端测试输出
 */
export function validateFrontendTestOutput(output) {
  if (!output || typeof output !== 'string') {
    return false;
  }
  
  // 检查是否包含前端测试特征标识
  const frontendIndicators = [
    'Test Files',
    'Tests',
    'Duration',
    'Test Suites:',
    'PASS ',
    'FAIL ',
    '.test.jsx',
    '.test.tsx',
    '.spec.jsx',
    '.spec.tsx'
  ];
  
  return frontendIndicators.some(indicator => output.includes(indicator));
}