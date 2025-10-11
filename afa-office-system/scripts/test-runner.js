#!/usr/bin/env node

/**
 * AFA办公系统统一测试运行器
 * 管理后端、前端和小程序的测试执行，提供统一的日志管理和错误聚合
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseBackendTestOutput, generateBackendErrorSummary, generateBackendCoverageSummary } from './parsers/backend-parser.js';
import { parseFrontendTestOutput, generateFrontendErrorSummary, generateFrontendCoverageSummary } from './parsers/frontend-parser.js';
import { parseMiniprogramTestOutput, generateMiniprogramErrorSummary, generateMiniprogramCoverageSummary } from './parsers/miniprogram-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 项目模块配置
const PROJECT_MODULES = {
  backend: {
    name: '后端API服务',
    path: path.resolve(__dirname, '../backend'),
    testCommand: ['pnpm', 'test'],
    coverageCommand: ['pnpm', 'test:coverage'],
    hasTests: true,
    framework: 'vitest'
  },
  'frontend-tenant': {
    name: '租务管理端',
    path: path.resolve(__dirname, '../frontend/tenant-admin'),
    testCommand: ['pnpm', 'test'],
    coverageCommand: ['pnpm', 'test:coverage'],
    hasTests: true,
    framework: 'vitest'
  },
  'frontend-merchant': {
    name: '商户管理端',
    path: path.resolve(__dirname, '../frontend/merchant-admin'),
    testCommand: ['pnpm', 'test'],
    coverageCommand: ['pnpm', 'test:coverage'],
    hasTests: true,
    framework: 'vitest'
  },
  miniprogram: {
    name: '微信小程序',
    path: path.resolve(__dirname, '../miniprogram'),
    testCommand: ['pnpm', 'test'],
    coverageCommand: ['pnpm', 'test:coverage'],
    hasTests: true,
    framework: 'vitest'
  }
};

// 生成带时间戳和进程号的文件名
function generateLogFileName(baseName, extension = 'log') {
  const now = new Date();
  const dateStr = now.getFullYear() + '-' + 
    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
    String(now.getDate()).padStart(2, '0');
  const processId = process.pid;
  return `${dateStr}-${processId}-${baseName}.${extension}`;
}

// 配置选项
const config = {
  // 日志目录配置
  logDir: path.resolve(__dirname, '../logs'),
  
  // 输出文件配置 - 使用动态生成的文件名
  files: {
    execution: generateLogFileName('test-execution'),
    errors: generateLogFileName('test-errors'),
    errorsSummary: generateLogFileName('errors-summary', 'txt'),
    coverage: generateLogFileName('coverage-detailed', 'txt')
  },
  
  // 项目级别摘要文件 - 使用动态生成的文件名
  summaryFiles: {
    overall: generateLogFileName('overall-summary', 'txt'),
    errors: generateLogFileName('all-errors-summary', 'txt'),
    coverage: generateLogFileName('coverage-summary', 'txt')
  },
  
  // 默认选项
  verbose: false,
  silent: false,
  debug: false,
  coverage: false,
  module: null, // 指定模块，null表示运行所有模块
  parallel: false // 是否并行运行测试
};

/**
 * 解析命令行参数
 */
function parseArguments() {
  const args = process.argv.slice(2);
  
  // 查找模块参数
  let module = null;
  const moduleArg = args.find(arg => arg.startsWith('--module='));
  if (moduleArg) {
    module = moduleArg.split('=')[1];
    if (!PROJECT_MODULES[module]) {
      console.error(`❌ 未知的项目模块: ${module}`);
      console.error(`可用模块: ${Object.keys(PROJECT_MODULES).join(', ')}`);
      process.exit(1);
    }
  }
  
  return {
    verbose: args.includes('--verbose'),
    silent: args.includes('--silent'),
    debug: args.includes('--debug'),
    coverage: args.includes('--coverage'),
    parallel: args.includes('--parallel'),
    help: args.includes('--help') || args.includes('-h'),
    module
  };
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
AFA办公系统统一测试运行器

用法:
  node scripts/test-runner.js [选项]

选项:
  --verbose              显示详细的测试输出
  --silent               只显示最终结果
  --debug                显示调试信息
  --coverage             运行覆盖率测试
  --parallel             并行运行所有模块测试
  --module=<模块名>       只运行指定模块的测试
  --help, -h             显示此帮助信息

可用模块:
  backend               后端API服务
  frontend-tenant       租务管理端
  frontend-merchant     商户管理端
  miniprogram          微信小程序

示例:
  node scripts/test-runner.js                           # 运行所有模块测试
  node scripts/test-runner.js --verbose                 # 详细模式
  node scripts/test-runner.js --module=backend          # 只运行后端测试
  node scripts/test-runner.js --coverage                # 覆盖率测试
  node scripts/test-runner.js --parallel                # 并行运行所有测试
  node scripts/test-runner.js --silent                  # 静默模式
`);
}

/**
 * 确保日志目录存在
 */
async function ensureLogDirectory() {
  try {
    // 创建主日志目录
    await fs.mkdir(config.logDir, { recursive: true });
    
    // 为每个模块创建子目录
    for (const moduleKey of Object.keys(PROJECT_MODULES)) {
      const moduleLogDir = path.join(config.logDir, moduleKey);
      await fs.mkdir(moduleLogDir, { recursive: true });
    }
    
    // 创建摘要目录
    const summaryDir = path.join(config.logDir, 'summary');
    await fs.mkdir(summaryDir, { recursive: true });
    
    console.log(`📁 统一日志目录已创建: ${config.logDir}`);
  } catch (error) {
    console.error(`❌ 创建日志目录失败: ${error.message}`);
    throw error;
  }
}

/**
 * 清理旧的日志文件（保留最近5个文件）
 */
async function cleanupOldLogs(moduleKey = null) {
  try {
    const modulesToClean = moduleKey ? [moduleKey] : Object.keys(PROJECT_MODULES);
    const maxFilesToKeep = 5; // 保留最近5个日志文件
    
    // 清理模块日志
    for (const module of modulesToClean) {
      const moduleLogDir = path.join(config.logDir, module);
      
      try {
        // 确保目录存在
        await fs.mkdir(moduleLogDir, { recursive: true });
        
        // 读取目录中的所有文件
        const files = await fs.readdir(moduleLogDir);
        
        // 按文件类型分组
        const fileGroups = {
          'test-execution': [],
          'test-errors': [],
          'errors-summary': [],
          'coverage-detailed': []
        };
        
        // 将文件按类型分组
        files.forEach(file => {
          for (const [type, _] of Object.entries(fileGroups)) {
            if (file.includes(type)) {
              fileGroups[type].push(file);
              break;
            }
          }
        });
        
        // 清理每种类型的旧文件
        for (const [type, typeFiles] of Object.entries(fileGroups)) {
          if (typeFiles.length > maxFilesToKeep) {
            // 按文件名排序（包含日期，所以字典序就是时间序）
            typeFiles.sort();
            
            // 删除最旧的文件
            const filesToDelete = typeFiles.slice(0, typeFiles.length - maxFilesToKeep);
            for (const file of filesToDelete) {
              const filePath = path.join(moduleLogDir, file);
              try {
                await fs.unlink(filePath);
                console.log(`🗑️  删除旧日志文件: ${module}/${file}`);
              } catch (error) {
                if (error.code !== 'ENOENT') {
                  console.warn(`⚠️  删除旧日志文件失败: ${module}/${file}`);
                }
              }
            }
          }
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.warn(`⚠️  清理模块日志目录失败: ${module}`);
        }
      }
    }
    
    // 清理摘要文件
    if (!moduleKey) {
      const summaryDir = path.join(config.logDir, 'summary');
      
      try {
        // 确保目录存在
        await fs.mkdir(summaryDir, { recursive: true });
        
        // 读取摘要目录中的所有文件
        const files = await fs.readdir(summaryDir);
        
        // 按文件类型分组
        const summaryGroups = {
          'overall-summary': [],
          'all-errors-summary': [],
          'coverage-summary': []
        };
        
        // 将文件按类型分组
        files.forEach(file => {
          for (const [type, _] of Object.entries(summaryGroups)) {
            if (file.includes(type)) {
              summaryGroups[type].push(file);
              break;
            }
          }
        });
        
        // 清理每种类型的旧文件
        for (const [type, typeFiles] of Object.entries(summaryGroups)) {
          if (typeFiles.length > maxFilesToKeep) {
            // 按文件名排序
            typeFiles.sort();
            
            // 删除最旧的文件
            const filesToDelete = typeFiles.slice(0, typeFiles.length - maxFilesToKeep);
            for (const file of filesToDelete) {
              const filePath = path.join(summaryDir, file);
              try {
                await fs.unlink(filePath);
                console.log(`🗑️  删除旧摘要文件: ${file}`);
              } catch (error) {
                if (error.code !== 'ENOENT') {
                  console.warn(`⚠️  删除旧摘要文件失败: ${file}`);
                }
              }
            }
          }
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.warn(`⚠️  清理摘要目录失败`);
        }
      }
    }
    
    console.log('🧹 旧日志文件清理完成');
  } catch (error) {
    console.warn(`⚠️  清理日志时出现问题: ${error.message}`);
  }
}

/**
 * 检查模块是否有package.json和测试脚本
 */
async function checkModuleTestSetup(modulePath) {
  try {
    const packageJsonPath = path.join(modulePath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    return {
      hasPackageJson: true,
      hasTestScript: !!packageJson.scripts?.test,
      hasCoverageScript: !!packageJson.scripts?.['test:coverage'],
      packageJson
    };
  } catch (error) {
    return {
      hasPackageJson: false,
      hasTestScript: false,
      hasCoverageScript: false,
      packageJson: null
    };
  }
}

/**
 * 运行单个模块的测试
 */
async function runModuleTests(moduleKey, moduleConfig, options) {
  const moduleLogDir = path.join(config.logDir, moduleKey);
  const executionLogPath = path.join(moduleLogDir, config.files.execution);
  
  console.log(`🧪 开始运行 ${moduleConfig.name} 测试...`);
  
  // 检查模块测试设置
  const testSetup = await checkModuleTestSetup(moduleConfig.path);
  if (!testSetup.hasTestScript) {
    console.log(`⚠️  ${moduleConfig.name} 没有配置测试脚本，跳过`);
    return {
      moduleKey,
      skipped: true,
      reason: '没有测试脚本'
    };
  }
  
  return new Promise((resolve, reject) => {
    // 选择命令
    const command = options.coverage && testSetup.hasCoverageScript 
      ? moduleConfig.coverageCommand 
      : moduleConfig.testCommand;
    
    // 启动测试进程
    const testProcess = spawn(command[0], command.slice(1), {
      cwd: moduleConfig.path,
      stdio: options.verbose ? 'inherit' : 'pipe'
    });
    
    let stdout = '';
    let stderr = '';
    
    // 如果不是verbose模式，收集输出用于日志记录
    if (!options.verbose) {
      testProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      testProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
    }
    
    testProcess.on('close', async (code) => {
      try {
        // 保存完整输出到日志文件
        if (!options.verbose) {
          const fullOutput = stdout + stderr;
          await fs.writeFile(executionLogPath, fullOutput, 'utf8');
          
          if (!options.silent) {
            console.log(`📄 ${moduleConfig.name} 完整测试日志: ${executionLogPath}`);
          }
        }
        
        resolve({
          moduleKey,
          code,
          stdout,
          stderr,
          fullOutput: stdout + stderr,
          skipped: false
        });
      } catch (error) {
        reject(error);
      }
    });
    
    testProcess.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 解析测试结果
 */
function parseTestResults(output, moduleKey) {
  console.log(`🔍 开始解析 ${moduleKey} 的测试输出`);
  
  // 根据模块类型选择合适的解析器
  if (moduleKey === 'backend') {
    return parseBackendTestOutput(output, moduleKey);
  } else if (moduleKey.startsWith('frontend-')) {
    return parseFrontendTestOutput(output, moduleKey);
  } else if (moduleKey === 'miniprogram') {
    return parseMiniprogramTestOutput(output, moduleKey);
  }
  
  // 对于其他模块，暂时使用通用解析逻辑
  return parseGenericTestOutput(output, moduleKey);
}

/**
 * 通用测试结果解析（用于前端和小程序模块）
 */
function parseGenericTestOutput(output, moduleKey) {
  const lines = output.split('\n');
  
  // 提取测试统计信息
  let totalTests = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let duration = '0s';
  
  console.log(`🔍 开始通用解析 ${moduleKey} 的测试输出，共 ${lines.length} 行`);
  
  // 查找测试结果行
  for (const line of lines) {
    // 检查是否包含关键词
    if (line.includes('Test Files') || line.includes('Tests') || line.includes('Duration')) {
      console.log(`🔍 检查关键行: "${line}"`);
    }
    
    // 匹配新的Vitest格式: " Test Files  19 failed | 18 passed (37)"
    const testFilesMatch = line.match(/\s*Test Files\s+(?:(\d+)\s+failed\s*\|\s*)?(\d+)\s+passed\s*\((\d+)\)/);
    if (testFilesMatch) {
      console.log('✅ 匹配到Test Files:', testFilesMatch);
      failed = parseInt(testFilesMatch[1]) || 0;
      passed = parseInt(testFilesMatch[2]) || 0;
      // 总文件数在括号中
    }
    
    // 匹配新的测试格式: "      Tests  125 failed | 456 passed (596)"
    const testsMatch = line.match(/\s*Tests\s+(?:(\d+)\s+failed\s*\|\s*)?(\d+)\s+passed\s*\((\d+)\)/);
    if (testsMatch) {
      console.log('✅ 匹配到Tests:', testsMatch);
      failed = parseInt(testsMatch[1]) || 0;
      passed = parseInt(testsMatch[2]) || 0;
      totalTests = parseInt(testsMatch[3]) || 0;
    }
    
    // 匹配执行时间 "   Duration  67.84s"
    const timeMatch = line.match(/\s*Duration\s+(\d+(?:\.\d+)?s)/);
    if (timeMatch) {
      console.log('✅ 匹配到Duration:', timeMatch);
      duration = timeMatch[1];
    }
  }
  
  console.log(`📊 通用解析结果: passed=${passed}, failed=${failed}, total=${totalTests}, duration=${duration}`);
  
  return {
    moduleKey,
    totalTests,
    passed,
    failed,
    skipped,
    duration,
    hasErrors: failed > 0,
    framework: 'generic'
  };
}

/**
 * 提取并保存错误信息
 */
async function extractAndSaveErrors(output, results) {
  if (!results.hasErrors) {
    return;
  }
  
  const moduleLogDir = path.join(config.logDir, results.moduleKey);
  
  // 生成错误摘要文件
  let errorSummary = '';
  
  // 根据模块类型使用不同的错误摘要生成器
  if (results.moduleKey === 'backend' && results.errors) {
    errorSummary = generateBackendErrorSummary(results.errors, results);
  } else if (results.moduleKey.startsWith('frontend-') && results.errors) {
    errorSummary = generateFrontendErrorSummary(results.errors, results);
  } else if (results.moduleKey === 'miniprogram' && results.errors) {
    errorSummary = generateMiniprogramErrorSummary(results.errors, results);
  }
  
  // 如果专用生成器没有生成摘要，使用通用生成器
  if (!errorSummary) {
    errorSummary = generateGenericErrorSummary(output, results);
  }
  
  if (errorSummary) {
    try {
      const errorSummaryPath = path.join(moduleLogDir, config.files.errorsSummary);
      await fs.writeFile(errorSummaryPath, errorSummary, 'utf8');
      
      // 同时保存详细错误到单独文件
      const errorDetailsPath = path.join(moduleLogDir, config.files.errors);
      await fs.writeFile(errorDetailsPath, output, 'utf8');
      
      console.log(`✅ ${PROJECT_MODULES[results.moduleKey].name} 错误摘要已保存: ${errorSummaryPath}`);
      console.log(`✅ ${PROJECT_MODULES[results.moduleKey].name} 详细错误日志已保存: ${errorDetailsPath}`);
    } catch (error) {
      console.error(`❌ 保存错误文件失败: ${error.message}`);
    }
  }
  
  // 如果有覆盖率信息，也保存覆盖率摘要
  if (results.coverage) {
    let coverageSummary = '';
    if (results.moduleKey === 'backend') {
      coverageSummary = generateBackendCoverageSummary(results.coverage);
    } else if (results.moduleKey.startsWith('frontend-')) {
      coverageSummary = generateFrontendCoverageSummary(results.coverage, results.moduleKey);
    } else if (results.moduleKey === 'miniprogram') {
      coverageSummary = generateMiniprogramCoverageSummary(results.coverage);
    }
    
    if (coverageSummary) {
      const coveragePath = path.join(moduleLogDir, config.files.coverage);
      await fs.writeFile(coveragePath, coverageSummary, 'utf8');
      console.log(`📊 ${PROJECT_MODULES[results.moduleKey].name} 覆盖率报告已保存到: ${coveragePath}`);
    }
  }
}

/**
 * 清理ANSI颜色代码
 */
function stripAnsiCodes(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * 通用错误摘要生成器 - 改进版本，支持Vitest输出格式
 */
function generateGenericErrorSummary(output, results) {
  const lines = output.split('\n');
  const errors = [];
  let currentError = null;
  
  // 改进的错误提取逻辑，支持Vitest格式
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cleanLine = stripAnsiCodes(line);
    const trimmedLine = cleanLine.trim();
    
    // 检测Vitest格式的失败测试: "❯ test-file.test.js > describe block > test name"
    const vitestFailureMatch = cleanLine.match(/❯\s+(.+?\.test\.[jt]sx?)\s+>\s+(.+?)(?:\s+>\s+(.+))?$/);
    if (vitestFailureMatch) {
      // 保存之前的错误
      if (currentError) {
        errors.push(currentError);
      }
      
      currentError = {
        testFile: vitestFailureMatch[1],
        testSuite: vitestFailureMatch[2],
        testName: vitestFailureMatch[3] || vitestFailureMatch[2],
        errorMessage: '',
        errorType: 'test_failure',
        line: i + 1
      };
      continue;
    }
    
    // 检测FAIL标记的详细错误信息: "FAIL tests/unit/components/error-test.test.tsx > 前端租务管理端错误测试 > 应该故意失败 - 组件渲染错误"
    const failDetailMatch = cleanLine.match(/FAIL\s+(.+?\.test\.[jt]sx?)\s+>\s+(.+?)(?:\s+>\s+(.+))?$/);
    if (failDetailMatch) {
      if (currentError) {
        errors.push(currentError);
      }
      
      currentError = {
        testFile: failDetailMatch[1],
        testSuite: failDetailMatch[2],
        testName: failDetailMatch[3] || failDetailMatch[2],
        errorMessage: '',
        errorType: 'test_failure',
        line: i + 1
      };
      continue;
    }
    
    // 收集错误详情 - 各种错误类型
    if (currentError) {
      // AssertionError
      if (trimmedLine.includes('AssertionError:')) {
        currentError.errorMessage = trimmedLine;
        currentError.errorType = 'assertion';
      }
      // TestingLibraryElementError
      else if (trimmedLine.includes('TestingLibraryElementError:')) {
        currentError.errorMessage = trimmedLine;
        currentError.errorType = 'element_not_found';
      }
      // 其他Error类型
      else if (trimmedLine.includes('Error:')) {
        currentError.errorMessage = trimmedLine;
        currentError.errorType = 'error';
      }
      // 简单的错误描述 (→ expected ... to be ...)
      else if (trimmedLine.startsWith('→ ')) {
        if (!currentError.errorMessage) {
          currentError.errorMessage = trimmedLine.substring(2).trim();
        }
      }
      // 期望值和实际值
      else if (trimmedLine.includes('Expected:') || trimmedLine.includes('Received:')) {
        if (currentError.errorMessage && !currentError.errorMessage.includes('Expected:')) {
          currentError.errorMessage += ' | ' + trimmedLine;
        }
      }
    }
  }
  
  // 添加最后一个错误
  if (currentError) {
    errors.push(currentError);
  }
  
  // 生成错误摘要
  if (errors.length > 0 || results.failed > 0) {
    const timestamp = new Date().toLocaleString('zh-CN');
    const moduleName = PROJECT_MODULES[results.moduleKey].name;
    
    let errorSummary = `${moduleName} 测试失败摘要 (${timestamp})\n`;
    errorSummary += '='.repeat(60) + '\n\n';
    errorSummary += `失败测试数量: ${results.failed}\n`;
    errorSummary += `提取到的错误详情: ${errors.length} 个\n\n`;
    
    if (errors.length > 0) {
      errors.forEach((error, index) => {
        errorSummary += `${index + 1}. ${error.testFile}\n`;
        errorSummary += `   测试套件: ${error.testSuite}\n`;
        errorSummary += `   测试名称: ${error.testName}\n`;
        if (error.errorMessage) {
          errorSummary += `   错误信息: ${error.errorMessage}\n`;
        }
        errorSummary += `   错误类型: ${error.errorType}\n`;
        errorSummary += '\n';
      });
    } else {
      errorSummary += `⚠️  无法提取详细错误信息，请查看完整日志文件\n\n`;
    }
    
    errorSummary += '-'.repeat(60) + '\n';
    errorSummary += `📄 完整测试日志: ${config.files.execution}\n`;
    errorSummary += `📄 详细错误日志: ${config.files.errors}\n`;
    errorSummary += '='.repeat(60) + '\n';
    
    return errorSummary;
  }
  
  return '';
}

/**
 * 生成项目级别摘要
 */
async function generateProjectSummary(allResults, options) {
  const timestamp = new Date().toLocaleString('zh-CN');
  const summaryDir = path.join(config.logDir, 'summary');
  
  let totalPassed = 0;
  let totalFailed = 0;
  let totalTests = 0;
  let totalSkipped = 0;
  let hasAnyErrors = false;
  
  // 生成总体摘要
  let overallSummary = `AFA办公系统测试总体摘要 (${timestamp})\n`;
  overallSummary += '='.repeat(70) + '\n\n';
  
  allResults.forEach(result => {
    if (result.skipped) {
      overallSummary += `⚠️  ${PROJECT_MODULES[result.moduleKey].name}: 已跳过 (${result.reason})\n`;
      return;
    }
    
    const moduleName = PROJECT_MODULES[result.moduleKey].name;
    
    if (result.hasErrors) {
      overallSummary += `❌ ${moduleName}: ${result.failed} 个测试失败\n`;
      hasAnyErrors = true;
    } else {
      overallSummary += `✅ ${moduleName}: 所有测试通过\n`;
    }
    
    overallSummary += `   📈 ${result.passed} 通过, ${result.failed} 失败, ${result.totalTests} 总计 (${result.duration})\n\n`;
    
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalTests += result.totalTests;
    totalSkipped += result.skipped || 0;
  });
  
  overallSummary += '-'.repeat(70) + '\n';
  overallSummary += `📊 项目总计: ${totalPassed} 通过, ${totalFailed} 失败, ${totalTests} 总计\n`;
  overallSummary += `📁 详细日志目录: ${config.logDir}\n`;
  
  if (hasAnyErrors) {
    overallSummary += `❌ 存在测试失败，请查看各模块的错误摘要文件\n`;
  } else {
    overallSummary += `✅ 所有模块测试通过\n`;
  }
  
  overallSummary += '='.repeat(70) + '\n';
  
  // 保存总体摘要
  const overallSummaryPath = path.join(summaryDir, config.summaryFiles.overall);
  await fs.writeFile(overallSummaryPath, overallSummary, 'utf8');
  
  // 生成聚合错误摘要
  let allErrorsSummaryPath = null;
  if (hasAnyErrors) {
    let allErrorsSummary = `AFA办公系统聚合错误摘要 (${timestamp})\n`;
    allErrorsSummary += '='.repeat(70) + '\n\n';
    allErrorsSummary += `项目总体状态: 存在 ${totalFailed} 个测试失败\n`;
    allErrorsSummary += `影响模块数量: ${allResults.filter(r => !r.skipped && r.hasErrors).length} 个\n\n`;
    
    // 为每个有错误的模块添加错误摘要链接
    for (const result of allResults) {
      if (result.skipped || !result.hasErrors) continue;
      
      const moduleName = PROJECT_MODULES[result.moduleKey].name;
      allErrorsSummary += `📋 ${moduleName} (${result.failed} 个失败测试)\n`;
      allErrorsSummary += '-'.repeat(50) + '\n';
      
      // 尝试读取模块的错误摘要文件
      try {
        const moduleErrorSummaryPath = path.join(config.logDir, result.moduleKey, config.files.errorsSummary);
        const moduleErrorSummary = await fs.readFile(moduleErrorSummaryPath, 'utf8');
        
        // 提取错误摘要的关键部分（跳过标题）
        const lines = moduleErrorSummary.split('\n');
        const startIndex = lines.findIndex(line => line.includes('提取到的错误详情:'));
        if (startIndex >= 0) {
          const relevantLines = lines.slice(startIndex, lines.findIndex((line, idx) => idx > startIndex && line.includes('----')));
          allErrorsSummary += relevantLines.join('\n') + '\n';
        }
        
        allErrorsSummary += `📄 详细错误摘要: ${moduleErrorSummaryPath}\n`;
        allErrorsSummary += `📄 完整测试日志: ${path.join(config.logDir, result.moduleKey, config.files.execution)}\n\n`;
      } catch (error) {
        allErrorsSummary += `⚠️  无法读取模块错误摘要: ${error.message}\n\n`;
      }
    }
    
    allErrorsSummary += '='.repeat(70) + '\n';
    allErrorsSummary += `📊 使用说明:\n`;
    allErrorsSummary += `- 此文件聚合了所有模块的错误信息，便于AI助手快速了解项目测试状态\n`;
    allErrorsSummary += `- 每个模块的详细错误信息请查看对应的错误摘要文件\n`;
    allErrorsSummary += `- 完整的测试输出请查看各模块的测试执行日志\n`;
    allErrorsSummary += '='.repeat(70) + '\n';
    
    // 保存聚合错误摘要
    allErrorsSummaryPath = path.join(summaryDir, config.summaryFiles.errors);
    await fs.writeFile(allErrorsSummaryPath, allErrorsSummary, 'utf8');
    
    console.log(`📄 项目聚合错误摘要已保存: ${allErrorsSummaryPath}`);
  }
  
  return {
    totalPassed,
    totalFailed,
    totalTests,
    totalSkipped,
    hasAnyErrors,
    summaryPath: overallSummaryPath,
    allErrorsSummaryPath
  };
}

/**
 * 生成控制台摘要
 */
function generateConsoleSummary(projectSummary, options, allResults) {
  if (options.silent && !projectSummary.hasAnyErrors) {
    return; // 静默模式下成功时不输出
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 AFA办公系统测试结果摘要');
  console.log('='.repeat(70));
  
  if (projectSummary.hasAnyErrors) {
    console.log(`❌ 项目测试失败: ${projectSummary.totalFailed} 个测试未通过`);
  } else {
    console.log('✅ 所有项目测试通过');
  }
  
  console.log(`📈 总体统计: ${projectSummary.totalPassed} 通过, ${projectSummary.totalFailed} 失败, ${projectSummary.totalTests} 总计`);
  
  if (projectSummary.hasAnyErrors) {
    console.log(`📄 项目总体摘要: ${projectSummary.summaryPath}`);
    if (projectSummary.allErrorsSummaryPath) {
      console.log(`📋 项目聚合错误摘要: ${projectSummary.allErrorsSummaryPath}`);
    }
    console.log(`📁 主日志目录: ${config.logDir}`);
    
    console.log('\n📋 各模块日志文件:');
    allResults.forEach(result => {
      if (!result.skipped) {
        const moduleLogDir = path.join(config.logDir, result.moduleKey);
        const executionLogPath = path.join(moduleLogDir, config.files.execution);
        
        console.log(`   ${PROJECT_MODULES[result.moduleKey].name}:`);
        console.log(`     📄 完整测试日志: ${executionLogPath}`);
        
        if (result.hasErrors) {
          const errorSummaryPath = path.join(moduleLogDir, config.files.errorsSummary);
          const errorDetailsPath = path.join(moduleLogDir, config.files.errors);
          console.log(`     📄 错误摘要: ${errorSummaryPath} (如果生成)`);
          console.log(`     📄 详细错误日志: ${errorDetailsPath} (如果生成)`);
        }
      }
    });
  }
  
  console.log('='.repeat(70));
}

/**
 * 主函数
 */
async function main() {
  try {
    const options = parseArguments();
    
    if (options.help) {
      showHelp();
      return;
    }
    
    // 合并配置
    Object.assign(config, options);
    
    // 准备日志环境
    await ensureLogDirectory();
    await cleanupOldLogs(options.module);
    
    // 确定要运行的模块
    const modulesToRun = options.module 
      ? [options.module] 
      : Object.keys(PROJECT_MODULES);
    
    console.log(`🚀 开始运行AFA办公系统测试 (模块: ${modulesToRun.map(m => PROJECT_MODULES[m].name).join(', ')})\n`);
    
    // 运行测试
    const allResults = [];
    let hasErrors = false;
    
    if (options.parallel && modulesToRun.length > 1) {
      // 并行运行
      console.log('🔄 并行运行所有模块测试...\n');
      
      const promises = modulesToRun.map(moduleKey => {
        const moduleConfig = PROJECT_MODULES[moduleKey];
        return runModuleTests(moduleKey, moduleConfig, options);
      });
      
      const results = await Promise.allSettled(promises);
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const moduleKey = modulesToRun[i];
        
        if (result.status === 'fulfilled') {
          const testResult = result.value;
          
          if (!testResult.skipped) {
            const parsedResults = parseTestResults(testResult.fullOutput, moduleKey);
            await extractAndSaveErrors(testResult.fullOutput, parsedResults);
            allResults.push(parsedResults);
            
            if (testResult.code !== 0) {
              hasErrors = true;
            }
          } else {
            allResults.push(testResult);
          }
        } else {
          console.error(`❌ ${PROJECT_MODULES[moduleKey].name} 测试执行失败: ${result.reason.message}`);
          hasErrors = true;
          
          allResults.push({
            moduleKey,
            hasErrors: true,
            error: result.reason.message,
            skipped: false
          });
        }
      }
    } else {
      // 串行运行
      for (const moduleKey of modulesToRun) {
        const moduleConfig = PROJECT_MODULES[moduleKey];
        
        try {
          const testResult = await runModuleTests(moduleKey, moduleConfig, options);
          
          if (!testResult.skipped) {
            console.log(`🔍 解析 ${moduleConfig.name} 测试结果...`);
            const results = parseTestResults(testResult.fullOutput, moduleKey);
            console.log(`📊 解析结果: 通过=${results.passed}, 失败=${results.failed}, 总计=${results.totalTests}`);
            await extractAndSaveErrors(testResult.fullOutput, results);
            allResults.push(results);
            
            if (testResult.code !== 0) {
              hasErrors = true;
            }
          } else {
            allResults.push(testResult);
          }
          
        } catch (error) {
          console.error(`❌ ${moduleConfig.name} 测试执行失败: ${error.message}`);
          hasErrors = true;
          
          allResults.push({
            moduleKey,
            hasErrors: true,
            error: error.message,
            skipped: false
          });
        }
      }
    }
    
    // 生成项目级别摘要
    const projectSummary = await generateProjectSummary(allResults, options);
    
    // 显示控制台摘要
    generateConsoleSummary(projectSummary, options, allResults);
    
    // 退出码
    process.exit(hasErrors ? 1 : 0);
    
  } catch (error) {
    console.error(`❌ 统一测试运行器执行失败: ${error.message}`);
    
    if (config.debug) {
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// 运行主函数
main();