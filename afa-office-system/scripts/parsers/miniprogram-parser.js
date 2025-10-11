/**
 * 小程序测试输出解析器
 * 专门解析微信小程序测试环境的输出，适配小程序测试框架
 */

/**
 * 解析小程序测试输出，提取关键统计信息
 * @param {string} output - 测试输出内容
 * @param {string} moduleKey - 模块标识符 (miniprogram)
 * @returns {Object} 解析后的测试结果
 */
export function parseMiniprogramTestOutput(output, moduleKey = 'miniprogram') {
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
  
  console.log(`🔍 开始解析小程序测试输出，共 ${lines.length} 行`);
  
  // 清理ANSI颜色代码的函数
  function stripAnsiCodes(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }
  
  // 检测测试框架
  const frameworkDetected = detectMiniprogramTestFramework(output);
  result.framework = frameworkDetected;
  console.log(`🔍 检测到小程序测试框架: ${frameworkDetected}`);
  
  // 根据框架选择解析策略
  if (frameworkDetected === 'jest') {
    parseJestOutput(lines, result, stripAnsiCodes);
  } else if (frameworkDetected === 'miniprogram-test') {
    parseMiniprogramSpecificOutput(lines, result, stripAnsiCodes);
  } else {
    // 默认使用Vitest解析
    parseVitestOutput(lines, result, stripAnsiCodes);
  }
  
  // 提取错误信息
  if (result.hasErrors) {
    result.errors = extractMiniprogramErrors(output, frameworkDetected);
    console.log(`🔍 提取到 ${result.errors.length} 个错误信息`);
  }
  
  // 提取覆盖率信息
  result.coverage = extractMiniprogramCoverage(output, frameworkDetected);
  if (result.coverage) {
    console.log(`📊 提取到覆盖率信息: ${result.coverage.statements}% 语句覆盖率`);
  }
  
  console.log(`📊 小程序测试解析完成: passed=${result.passed}, failed=${result.failed}, total=${result.totalTests}, duration=${result.duration}`);
  
  return result;
}

/**
 * 检测小程序测试框架类型
 * @param {string} output - 测试输出内容
 * @returns {string} 框架名称
 */
function detectMiniprogramTestFramework(output) {
  // 小程序专用测试框架特征
  const miniprogramTestIndicators = [
    'miniprogram-test',
    'wx.test',
    'Component test',
    'Page test'
  ];
  
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
  
  const miniprogramScore = miniprogramTestIndicators.reduce((score, indicator) => {
    return score + (output.includes(indicator) ? 1 : 0);
  }, 0);
  
  const jestScore = jestIndicators.reduce((score, indicator) => {
    return score + (output.includes(indicator) ? 1 : 0);
  }, 0);
  
  const vitestScore = vitestIndicators.reduce((score, indicator) => {
    return score + (output.includes(indicator) ? 1 : 0);
  }, 0);
  
  if (miniprogramScore > 0) {
    return 'miniprogram-test';
  } else if (jestScore > vitestScore) {
    return 'jest';
  } else {
    return 'vitest';
  }
}

/**
 * 解析Vitest输出格式（小程序使用Vitest的情况）
 * @param {Array} lines - 输出行数组
 * @param {Object} result - 结果对象
 * @param {Function} stripAnsiCodes - 清理ANSI代码的函数
 */
function parseVitestOutput(lines, result, stripAnsiCodes) {
  for (let i = 0; i < lines.length; i++) {
    const line = stripAnsiCodes(lines[i]).trim();
    
    // 匹配Test Files行 - 支持多种格式
    const testFilesMatch = line.match(/Test Files\s+(?:(\d+)\s+failed\s*\|\s*)?(\d+)\s+passed\s*\((\d+)\)/);
    if (testFilesMatch) {
      result.testFiles.failed = parseInt(testFilesMatch[1]) || 0;
      result.testFiles.passed = parseInt(testFilesMatch[2]) || 0;
      result.testFiles.total = parseInt(testFilesMatch[3]) || 0;
      console.log(`✅ 解析到测试文件统计: ${result.testFiles.failed} 失败, ${result.testFiles.passed} 通过, ${result.testFiles.total} 总计`);
    }
    
    // 只有失败的情况
    const testFilesFailedOnlyMatch = line.match(/Test Files\s+(\d+)\s+failed\s*\((\d+)\)/);
    if (testFilesFailedOnlyMatch && !testFilesMatch) {
      result.testFiles.failed = parseInt(testFilesFailedOnlyMatch[1]) || 0;
      result.testFiles.passed = 0;
      result.testFiles.total = parseInt(testFilesFailedOnlyMatch[2]) || 0;
      console.log(`✅ 解析到测试文件统计(仅失败): ${result.testFiles.failed} 失败, ${result.testFiles.passed} 通过, ${result.testFiles.total} 总计`);
    }
    
    // 匹配Tests行
    const testsMatch = line.match(/Tests\s+(?:(\d+)\s+failed\s*\|\s*)?(\d+)\s+passed\s*\((\d+)\)/);
    if (testsMatch) {
      result.failed = parseInt(testsMatch[1]) || 0;
      result.passed = parseInt(testsMatch[2]) || 0;
      result.totalTests = parseInt(testsMatch[3]) || 0;
      result.hasErrors = result.failed > 0;
      console.log(`✅ 解析到测试统计: ${result.failed} 失败, ${result.passed} 通过, ${result.totalTests} 总计`);
    }
    
    // 只有失败的情况
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
 * 解析Jest输出格式（小程序使用Jest的情况）
 * @param {Array} lines - 输出行数组
 * @param {Object} result - 结果对象
 * @param {Function} stripAnsiCodes - 清理ANSI代码的函数
 */
function parseJestOutput(lines, result, stripAnsiCodes) {
  for (let i = 0; i < lines.length; i++) {
    const line = stripAnsiCodes(lines[i]).trim();
    
    // 匹配Jest的Test Suites行
    const testSuitesMatch = line.match(/Test Suites:\s*(?:(\d+)\s+failed,\s*)?(\d+)\s+passed,\s*(\d+)\s+total/);
    if (testSuitesMatch) {
      result.testFiles.failed = parseInt(testSuitesMatch[1]) || 0;
      result.testFiles.passed = parseInt(testSuitesMatch[2]) || 0;
      result.testFiles.total = parseInt(testSuitesMatch[3]) || 0;
      console.log(`✅ 解析到测试套件统计: ${result.testFiles.failed} 失败, ${result.testFiles.passed} 通过, ${result.testFiles.total} 总计`);
    }
    
    // 匹配Jest的Tests行
    const testsMatch = line.match(/Tests:\s*(?:(\d+)\s+failed,\s*)?(\d+)\s+passed,\s*(\d+)\s+total/);
    if (testsMatch) {
      result.failed = parseInt(testsMatch[1]) || 0;
      result.passed = parseInt(testsMatch[2]) || 0;
      result.totalTests = parseInt(testsMatch[3]) || 0;
      result.hasErrors = result.failed > 0;
      console.log(`✅ 解析到测试统计: ${result.failed} 失败, ${result.passed} 通过, ${result.totalTests} 总计`);
    }
    
    // 匹配Jest的Time行
    const timeMatch = line.match(/Time:\s*(\d+(?:\.\d+)?)\s*s/);
    if (timeMatch) {
      result.duration = timeMatch[1] + 's';
      console.log(`✅ 解析到执行时间: ${result.duration}`);
    }
  }
}

/**
 * 解析小程序专用测试框架输出
 * @param {Array} lines - 输出行数组
 * @param {Object} result - 结果对象
 * @param {Function} stripAnsiCodes - 清理ANSI代码的函数
 */
function parseMiniprogramSpecificOutput(lines, result, stripAnsiCodes) {
  for (let i = 0; i < lines.length; i++) {
    const line = stripAnsiCodes(lines[i]).trim();
    
    // 小程序测试框架的特殊格式解析
    // 这里可以根据实际使用的小程序测试框架进行调整
    
    // 匹配组件测试结果
    const componentTestMatch = line.match(/Component tests:\s*(\d+)\s+passed,\s*(\d+)\s+failed/);
    if (componentTestMatch) {
      result.passed += parseInt(componentTestMatch[1]) || 0;
      result.failed += parseInt(componentTestMatch[2]) || 0;
      result.totalTests = result.passed + result.failed;
      result.hasErrors = result.failed > 0;
      console.log(`✅ 解析到组件测试统计: ${result.failed} 失败, ${result.passed} 通过`);
    }
    
    // 匹配页面测试结果
    const pageTestMatch = line.match(/Page tests:\s*(\d+)\s+passed,\s*(\d+)\s+failed/);
    if (pageTestMatch) {
      result.passed += parseInt(pageTestMatch[1]) || 0;
      result.failed += parseInt(pageTestMatch[2]) || 0;
      result.totalTests = result.passed + result.failed;
      result.hasErrors = result.failed > 0;
      console.log(`✅ 解析到页面测试统计: ${result.failed} 失败, ${result.passed} 通过`);
    }
  }
}

/**
 * 从小程序测试输出中提取错误信息
 * @param {string} output - 测试输出内容
 * @param {string} framework - 测试框架类型
 * @returns {Array} 错误信息数组
 */
export function extractMiniprogramErrors(output, framework = 'vitest') {
  const lines = output.split('\n');
  const errors = [];
  let currentError = null;
  let inErrorSection = false;
  
  if (framework === 'jest') {
    return extractJestErrors(lines);
  } else if (framework === 'miniprogram-test') {
    return extractMiniprogramTestErrors(lines);
  } else {
    return extractVitestErrors(lines);
  }
}

/**
 * 提取Vitest错误信息（小程序使用Vitest）
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
    
    // 检测失败的测试开始 - 小程序测试文件格式
    const failureMatch = line.match(/❯\s+(.+?\.test\.[jt]s)\s+>\s+(.+?)(?:\s+>\s+(.+))?$/);
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
        pageOrComponent: extractPageOrComponent(failureMatch[1])
      };
      inErrorSection = true;
      continue;
    }
    
    // 在错误区域内收集错误信息
    if (inErrorSection && currentError) {
      // 检测小程序特有的错误类型
      if (trimmedLine.includes('wx is not defined') || trimmedLine.includes('getApp is not defined')) {
        currentError.errorType = 'miniprogram_api_error';
        currentError.errorMessage = trimmedLine;
      }
      
      // 检测组件或页面相关错误
      if (trimmedLine.includes('Component') || trimmedLine.includes('Page')) {
        currentError.errorType = 'component_page_error';
        currentError.errorMessage = trimmedLine;
      }
      
      // 检测通用错误
      if (trimmedLine.includes('AssertionError') || trimmedLine.includes('Error:')) {
        currentError.errorMessage = trimmedLine;
        currentError.errorType = trimmedLine.includes('AssertionError') ? 'assertion' : 'error';
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
    
    // 检测新的测试文件开始
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
 * 提取Jest错误信息（小程序使用Jest）
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
      const fileMatch = trimmedLine.match(/FAIL\s+(.+?\.test\.[jt]s)/);
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
          pageOrComponent: extractPageOrComponent(fileMatch[1])
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
      
      // 检测小程序特有错误
      if (trimmedLine.includes('wx is not defined') || trimmedLine.includes('getApp is not defined')) {
        currentError.errorType = 'miniprogram_api_error';
        currentError.errorMessage = trimmedLine;
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
 * 提取小程序专用测试框架错误信息
 * @param {Array} lines - 输出行数组
 * @returns {Array} 错误信息数组
 */
function extractMiniprogramTestErrors(lines) {
  const errors = [];
  // 这里可以根据实际使用的小程序测试框架进行实现
  // 目前返回空数组作为占位符
  return errors;
}

/**
 * 从文件名中提取页面或组件名称
 * @param {string} filename - 测试文件名
 * @returns {string} 页面或组件名称
 */
function extractPageOrComponent(filename) {
  // 提取小程序页面或组件名称
  const match = filename.match(/([^/\\]+)\.test\.[jt]s$/);
  if (match) {
    const name = match[1];
    // 判断是页面还是组件
    if (filename.includes('/pages/') || filename.includes('\\pages\\')) {
      return `页面: ${name}`;
    } else if (filename.includes('/components/') || filename.includes('\\components\\')) {
      return `组件: ${name}`;
    } else {
      return name;
    }
  }
  return filename;
}

/**
 * 从小程序测试输出中提取覆盖率信息
 * @param {string} output - 测试输出内容
 * @param {string} framework - 测试框架类型
 * @returns {Object|null} 覆盖率信息对象
 */
export function extractMiniprogramCoverage(output, framework = 'vitest') {
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
        
        // 匹配单个文件覆盖率（小程序文件）
        const fileMatch = coverageLine.match(/(.+?\.[jt]s)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)/);
        if (fileMatch) {
          coverage.files.push({
            file: fileMatch[1].trim(),
            statements: parseFloat(fileMatch[2]),
            branches: parseFloat(fileMatch[3]),
            functions: parseFloat(fileMatch[4]),
            lines: parseFloat(fileMatch[5]),
            pageOrComponent: extractPageOrComponent(fileMatch[1])
          });
        }
      }
      break;
    }
  }
  
  return coverage;
}

/**
 * 生成小程序测试错误摘要
 * @param {Array} errors - 错误信息数组
 * @param {Object} results - 测试结果对象
 * @returns {string} 格式化的错误摘要
 */
export function generateMiniprogramErrorSummary(errors, results) {
  if (!errors || errors.length === 0) {
    return '';
  }
  
  const timestamp = new Date().toLocaleString('zh-CN');
  
  let summary = `微信小程序测试失败摘要 (${timestamp})\n`;
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
  
  // 按页面/组件分组显示错误
  const errorsByType = {};
  errors.forEach(error => {
    const type = error.pageOrComponent || '其他';
    if (!errorsByType[type]) {
      errorsByType[type] = [];
    }
    errorsByType[type].push(error);
  });
  
  Object.keys(errorsByType).forEach(type => {
    summary += `\n📱 ${type}:\n`;
    errorsByType[type].forEach((error, index) => {
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
 * 生成小程序覆盖率摘要
 * @param {Object} coverage - 覆盖率信息对象
 * @returns {string} 格式化的覆盖率摘要
 */
export function generateMiniprogramCoverageSummary(coverage) {
  if (!coverage) {
    return '';
  }
  
  const timestamp = new Date().toLocaleString('zh-CN');
  
  let summary = `微信小程序覆盖率报告 (${timestamp})\n`;
  summary += '='.repeat(50) + '\n\n';
  
  summary += `📊 总体覆盖率:\n`;
  summary += `   语句覆盖率: ${coverage.statements}%\n`;
  summary += `   分支覆盖率: ${coverage.branches}%\n`;
  summary += `   函数覆盖率: ${coverage.functions}%\n`;
  summary += `   行覆盖率: ${coverage.lines}%\n\n`;
  
  if (coverage.files && coverage.files.length > 0) {
    summary += `📁 页面/组件覆盖率详情:\n`;
    summary += '-'.repeat(30) + '\n';
    
    // 按覆盖率排序，显示覆盖率较低的文件
    const sortedFiles = coverage.files
      .filter(file => file.statements < 80) // 只显示覆盖率低于80%的文件
      .sort((a, b) => a.statements - b.statements);
    
    if (sortedFiles.length > 0) {
      summary += `⚠️  需要关注的页面/组件 (覆盖率 < 80%):\n`;
      sortedFiles.slice(0, 10).forEach(file => { // 只显示前10个
        summary += `   ${file.pageOrComponent}: ${file.statements}%\n`;
      });
    } else {
      summary += `✅ 所有页面/组件覆盖率都达到80%以上\n`;
    }
  }
  
  summary += '\n' + '='.repeat(50) + '\n';
  
  return summary;
}

/**
 * 验证小程序测试输出格式
 * @param {string} output - 测试输出内容
 * @returns {boolean} 是否为有效的小程序测试输出
 */
export function validateMiniprogramTestOutput(output) {
  if (!output || typeof output !== 'string') {
    return false;
  }
  
  // 检查是否包含小程序测试特征标识
  const miniprogramIndicators = [
    'Test Files',
    'Tests',
    'Duration',
    'Test Suites:',
    'PASS ',
    'FAIL ',
    'miniprogram',
    'wx.',
    'getApp',
    'Component',
    'Page'
  ];
  
  return miniprogramIndicators.some(indicator => output.includes(indicator));
}