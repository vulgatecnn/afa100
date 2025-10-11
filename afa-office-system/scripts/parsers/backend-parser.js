/**
 * 后端测试输出解析器
 * 专门解析Vitest框架的测试输出，提取测试统计信息和错误详情
 */

/**
 * 解析Vitest测试输出，提取关键统计信息
 * @param {string} output - 测试输出内容
 * @param {string} moduleKey - 模块标识符
 * @returns {Object} 解析后的测试结果
 */
export function parseBackendTestOutput(output, moduleKey = 'backend') {
  const lines = output.split('\n');
  
  // 初始化结果对象
  const result = {
    moduleKey,
    framework: 'vitest',
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
  
  console.log(`🔍 开始解析后端测试输出，共 ${lines.length} 行`);
  
  // 清理ANSI颜色代码的函数
  function stripAnsiCodes(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }
  
  // 解析测试统计信息
  for (let i = 0; i < lines.length; i++) {
    const line = stripAnsiCodes(lines[i]).trim();
    
    // 匹配Vitest的Test Files行: " Test Files  20 failed | 17 passed (37)"
    const testFilesMatch = line.match(/Test Files\s+(\d+)\s+failed\s*\|\s*(\d+)\s+passed\s*\((\d+)\)/);
    if (testFilesMatch) {
      result.testFiles.failed = parseInt(testFilesMatch[1]) || 0;
      result.testFiles.passed = parseInt(testFilesMatch[2]) || 0;
      result.testFiles.total = parseInt(testFilesMatch[3]) || 0;
      console.log(`✅ 解析到测试文件统计: ${result.testFiles.failed} 失败, ${result.testFiles.passed} 通过, ${result.testFiles.total} 总计`);
    }
    
    // 也匹配只有通过的情况: " Test Files  17 passed (17)"
    const testFilesPassOnlyMatch = line.match(/Test Files\s+(\d+)\s+passed\s*\((\d+)\)/);
    if (testFilesPassOnlyMatch && !testFilesMatch) {
      result.testFiles.failed = 0;
      result.testFiles.passed = parseInt(testFilesPassOnlyMatch[1]) || 0;
      result.testFiles.total = parseInt(testFilesPassOnlyMatch[2]) || 0;
      console.log(`✅ 解析到测试文件统计(仅通过): ${result.testFiles.failed} 失败, ${result.testFiles.passed} 通过, ${result.testFiles.total} 总计`);
    }
    
    // 匹配Vitest的Tests行: "      Tests  137 failed | 444 passed (596)"
    const testsMatch = line.match(/Tests\s+(\d+)\s+failed\s*\|\s*(\d+)\s+passed\s*\((\d+)\)/);
    if (testsMatch) {
      result.failed = parseInt(testsMatch[1]) || 0;
      result.passed = parseInt(testsMatch[2]) || 0;
      result.totalTests = parseInt(testsMatch[3]) || 0;
      result.hasErrors = result.failed > 0;
      console.log(`✅ 解析到测试统计: ${result.failed} 失败, ${result.passed} 通过, ${result.totalTests} 总计`);
    }
    
    // 也匹配只有通过的情况: "      Tests  459 passed (459)"
    const testsPassOnlyMatch = line.match(/Tests\s+(\d+)\s+passed\s*\((\d+)\)/);
    if (testsPassOnlyMatch && !testsMatch) {
      result.failed = 0;
      result.passed = parseInt(testsPassOnlyMatch[1]) || 0;
      result.totalTests = parseInt(testsPassOnlyMatch[2]) || 0;
      result.hasErrors = false;
      console.log(`✅ 解析到测试统计(仅通过): ${result.failed} 失败, ${result.passed} 通过, ${result.totalTests} 总计`);
    }
    
    // 匹配执行时间: "   Duration  42.82s (transform 3.71s, setup 6.51s, collect 5.10s, tests 384.41s, environment 9ms, prepare 16.73s)"
    const durationMatch = line.match(/Duration\s+(\d+(?:\.\d+)?s)/);
    if (durationMatch) {
      result.duration = durationMatch[1];
      console.log(`✅ 解析到执行时间: ${result.duration}`);
    }
    
    // 匹配跳过的测试: "   Skipped  3 skipped"
    const skippedMatch = line.match(/Skipped\s+(\d+)\s+skipped/);
    if (skippedMatch) {
      result.skipped = parseInt(skippedMatch[1]) || 0;
      console.log(`✅ 解析到跳过测试: ${result.skipped}`);
    }
    
    // 匹配错误数量: "     Errors  1 error"
    const errorsMatch = line.match(/Errors\s+(\d+)\s+error/);
    if (errorsMatch) {
      result.errors = parseInt(errorsMatch[1]) || 0;
      console.log(`✅ 解析到错误数量: ${result.errors}`);
    }
  }
  
  // 提取错误信息
  if (result.hasErrors) {
    result.errors = extractBackendErrors(output);
    console.log(`🔍 提取到 ${result.errors.length} 个错误信息`);
  }
  
  // 提取覆盖率信息
  result.coverage = extractBackendCoverage(output);
  if (result.coverage) {
    console.log(`📊 提取到覆盖率信息: ${result.coverage.statements}% 语句覆盖率`);
  }
  
  console.log(`📊 后端测试解析完成: passed=${result.passed}, failed=${result.failed}, total=${result.totalTests}, duration=${result.duration}`);
  
  return result;
}

/**
 * 从Vitest输出中提取错误信息
 * @param {string} output - 测试输出内容
 * @returns {Array} 错误信息数组
 */
export function extractBackendErrors(output) {
  const lines = output.split('\n');
  const errors = [];
  let currentError = null;
  let inErrorSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // 检测失败的测试开始 - Vitest格式: "❯ test-file.test.js > describe block > test name"
    const failureMatch = line.match(/❯\s+(.+?\.test\.[jt]s)\s+>\s+(.+?)(?:\s+>\s+(.+))?$/);
    if (failureMatch) {
      // 保存之前的错误
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
        errorType: 'test_failure'
      };
      inErrorSection = true;
      continue;
    }
    
    // 检测FAIL标记的测试文件
    if (trimmedLine.startsWith('FAIL') && trimmedLine.includes('.test.')) {
      const fileMatch = trimmedLine.match(/FAIL\s+(.+?\.test\.[jt]s)/);
      if (fileMatch && currentError) {
        currentError.testFile = fileMatch[1];
      }
      continue;
    }
    
    // 在错误区域内收集错误信息
    if (inErrorSection && currentError) {
      // 检测错误类型
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
    
    // 检测新的测试文件开始，结束当前错误收集
    if (trimmedLine.startsWith('✓') || trimmedLine.startsWith('Test Files')) {
      if (currentError) {
        errors.push(currentError);
        currentError = null;
      }
      inErrorSection = false;
    }
  }
  
  // 添加最后一个错误
  if (currentError) {
    errors.push(currentError);
  }
  
  return errors;
}

/**
 * 从Vitest输出中提取覆盖率信息
 * @param {string} output - 测试输出内容
 * @returns {Object|null} 覆盖率信息对象
 */
export function extractBackendCoverage(output) {
  const lines = output.split('\n');
  let coverage = null;
  
  // 查找覆盖率表格
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 检测覆盖率表格开始
    if (line.includes('% Coverage report from') || line.includes('Coverage Summary')) {
      coverage = {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
        files: []
      };
      
      // 继续解析覆盖率数据
      for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
        const coverageLine = lines[j];
        
        // 匹配总体覆盖率行: "All files    |   85.5 |    78.2 |   92.1 |   85.5 |"
        const totalMatch = coverageLine.match(/All files\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)/);
        if (totalMatch) {
          coverage.statements = parseFloat(totalMatch[1]);
          coverage.branches = parseFloat(totalMatch[2]);
          coverage.functions = parseFloat(totalMatch[3]);
          coverage.lines = parseFloat(totalMatch[4]);
          break;
        }
        
        // 匹配单个文件覆盖率
        const fileMatch = coverageLine.match(/(.+?\.js)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)/);
        if (fileMatch) {
          coverage.files.push({
            file: fileMatch[1].trim(),
            statements: parseFloat(fileMatch[2]),
            branches: parseFloat(fileMatch[3]),
            functions: parseFloat(fileMatch[4]),
            lines: parseFloat(fileMatch[5])
          });
        }
      }
      break;
    }
  }
  
  return coverage;
}

/**
 * 生成后端测试错误摘要
 * @param {Array} errors - 错误信息数组
 * @param {Object} results - 测试结果对象
 * @returns {string} 格式化的错误摘要
 */
export function generateBackendErrorSummary(errors, results) {
  if (!errors || errors.length === 0) {
    return '';
  }
  
  const timestamp = new Date().toLocaleString('zh-CN');
  let summary = `后端API服务测试失败摘要 (${timestamp})\n`;
  summary += '='.repeat(60) + '\n\n';
  
  summary += `📊 测试统计:\n`;
  summary += `   总测试数: ${results.totalTests}\n`;
  summary += `   通过: ${results.passed}\n`;
  summary += `   失败: ${results.failed}\n`;
  summary += `   跳过: ${results.skipped}\n`;
  summary += `   执行时间: ${results.duration}\n\n`;
  
  summary += `❌ 失败的测试 (${errors.length} 个):\n`;
  summary += '-'.repeat(40) + '\n';
  
  errors.forEach((error, index) => {
    summary += `\n${index + 1}. ${error.testFile}\n`;
    summary += `   测试套件: ${error.testSuite}\n`;
    if (error.testName !== error.testSuite) {
      summary += `   测试名称: ${error.testName}\n`;
    }
    
    if (error.errorMessage) {
      summary += `   错误信息: ${error.errorMessage.split('\n')[0]}\n`;
    }
    
    if (error.stackTrace.length > 0) {
      summary += `   位置: ${error.stackTrace[0]}\n`;
    }
    
    summary += `   错误类型: ${error.errorType}\n`;
  });
  
  summary += '\n' + '='.repeat(60) + '\n';
  summary += `详细错误信息请查看完整的测试执行日志\n`;
  
  return summary;
}

/**
 * 生成后端覆盖率摘要
 * @param {Object} coverage - 覆盖率信息对象
 * @returns {string} 格式化的覆盖率摘要
 */
export function generateBackendCoverageSummary(coverage) {
  if (!coverage) {
    return '';
  }
  
  const timestamp = new Date().toLocaleString('zh-CN');
  let summary = `后端API服务覆盖率报告 (${timestamp})\n`;
  summary += '='.repeat(50) + '\n\n';
  
  summary += `📊 总体覆盖率:\n`;
  summary += `   语句覆盖率: ${coverage.statements}%\n`;
  summary += `   分支覆盖率: ${coverage.branches}%\n`;
  summary += `   函数覆盖率: ${coverage.functions}%\n`;
  summary += `   行覆盖率: ${coverage.lines}%\n\n`;
  
  if (coverage.files && coverage.files.length > 0) {
    summary += `📁 文件覆盖率详情:\n`;
    summary += '-'.repeat(30) + '\n';
    
    // 按覆盖率排序，显示覆盖率较低的文件
    const sortedFiles = coverage.files
      .filter(file => file.statements < 80) // 只显示覆盖率低于80%的文件
      .sort((a, b) => a.statements - b.statements);
    
    if (sortedFiles.length > 0) {
      summary += `⚠️  需要关注的文件 (覆盖率 < 80%):\n`;
      sortedFiles.slice(0, 10).forEach(file => { // 只显示前10个
        summary += `   ${file.file}: ${file.statements}%\n`;
      });
    } else {
      summary += `✅ 所有文件覆盖率都达到80%以上\n`;
    }
  }
  
  summary += '\n' + '='.repeat(50) + '\n';
  
  return summary;
}

/**
 * 验证后端测试输出格式
 * @param {string} output - 测试输出内容
 * @returns {boolean} 是否为有效的Vitest输出
 */
export function validateBackendTestOutput(output) {
  if (!output || typeof output !== 'string') {
    return false;
  }
  
  // 检查是否包含Vitest特征标识
  const vitestIndicators = [
    'Test Files',
    'Tests',
    'Duration',
    'RUN  v', // Vitest版本信息
    '✓', // 成功标记
    '❯', // 失败标记
    'FAIL',
    'PASS'
  ];
  
  return vitestIndicators.some(indicator => output.includes(indicator));
}