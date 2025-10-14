#!/usr/bin/env node

/**
 * TypeScript 类型检查验证脚本
 * 用于验证项目中的 TypeScript 类型错误状态
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TypeCheckValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.logFile = path.join(this.projectRoot, 'type-check-results.log');
    this.reportFile = path.join(this.projectRoot, 'type-check-report.json');
  }

  /**
   * 运行完整的类型检查验证
   */
  async runFullTypeCheck() {
    console.log('🔍 开始运行完整的 TypeScript 类型检查验证...\n');
    
    const startTime = Date.now();
    let result = {
      timestamp: new Date().toISOString(),
      totalErrors: 0,
      errorsByFile: {},
      errorsByCategory: {},
      summary: {},
      success: false
    };

    try {
      // 运行类型检查
      const output = execSync('pnpm type-check', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      result.success = true;
      result.totalErrors = 0;
      console.log('✅ TypeScript 类型检查通过！没有发现类型错误。');
      
    } catch (error) {
      result.success = false;
      const errorOutput = error.stdout || error.stderr || error.message;
      
      // 解析错误输出
      const parsedErrors = this.parseTypeScriptErrors(errorOutput);
      result.totalErrors = parsedErrors.totalErrors;
      result.errorsByFile = parsedErrors.errorsByFile;
      result.errorsByCategory = parsedErrors.errorsByCategory;
      
      console.log(`❌ 发现 ${result.totalErrors} 个 TypeScript 类型错误`);
      
      // 保存详细错误日志
      fs.writeFileSync(this.logFile, errorOutput);
      console.log(`📝 详细错误日志已保存到: ${this.logFile}`);
    }

    const endTime = Date.now();
    result.duration = endTime - startTime;
    
    // 生成摘要报告
    result.summary = this.generateSummary(result);
    
    // 保存结果报告
    fs.writeFileSync(this.reportFile, JSON.stringify(result, null, 2));
    console.log(`📊 类型检查报告已保存到: ${this.reportFile}`);
    
    // 显示摘要
    this.displaySummary(result);
    
    return result;
  }

  /**
   * 解析 TypeScript 错误输出
   */
  parseTypeScriptErrors(errorOutput) {
    const lines = errorOutput.split('\n');
    const errorsByFile = {};
    const errorsByCategory = {
      'missing_type': 0,
      'type_conflict': 0,
      'import_error': 0,
      'generic_error': 0,
      'test_type_error': 0,
      'library_type_error': 0
    };
    
    let totalErrors = 0;
    
    // 解析错误统计信息
    const errorStatsMatch = errorOutput.match(/Found (\d+) errors? in (\d+) files?/);
    if (errorStatsMatch) {
      totalErrors = parseInt(errorStatsMatch[1]);
    }
    
    // 解析单个错误行 (格式: src/file.ts(line,col): error TSxxxx: message)
    const errorLinePattern = /^([^(]+)\(\d+,\d+\):\s*error\s+(TS\d+):/gm;
    let match;
    while ((match = errorLinePattern.exec(errorOutput)) !== null) {
      const filePath = match[1].trim();
      const errorCode = match[2];
      
      if (filePath && !filePath.includes('node_modules')) {
        // 统计每个文件的错误数
        errorsByFile[filePath] = (errorsByFile[filePath] || 0) + 1;
        
        // 根据错误代码和文件路径分类错误
        if (filePath.includes('test') || filePath.includes('spec')) {
          errorsByCategory.test_type_error++;
        } else if (filePath.includes('node_modules')) {
          errorsByCategory.library_type_error++;
        } else if (errorCode === 'TS2307' || errorCode === 'TS2305') {
          errorsByCategory.import_error++;
        } else if (errorCode === 'TS2339' || errorCode === 'TS2322') {
          errorsByCategory.type_conflict++;
        } else if (errorCode === 'TS7016' || errorCode === 'TS2688') {
          errorsByCategory.missing_type++;
        } else {
          errorsByCategory.generic_error++;
        }
      }
    }
    
    // 如果没有通过正则解析到错误，但有总错误数，使用备用解析
    if (totalErrors > 0 && Object.keys(errorsByFile).length === 0) {
      // 解析文件错误统计部分 (在输出末尾)
      const fileStatsPattern = /^\s*(\d+)\s+(.+)$/gm;
      let fileMatch;
      while ((fileMatch = fileStatsPattern.exec(errorOutput)) !== null) {
        const errorCount = parseInt(fileMatch[1]);
        const filePath = fileMatch[2].trim();
        
        if (filePath && !filePath.includes('node_modules') && errorCount > 0) {
          errorsByFile[filePath] = errorCount;
          
          // 分类错误
          if (filePath.includes('test') || filePath.includes('spec')) {
            errorsByCategory.test_type_error += errorCount;
          } else if (filePath.includes('node_modules')) {
            errorsByCategory.library_type_error += errorCount;
          } else {
            errorsByCategory.generic_error += errorCount;
          }
        }
      }
    }
    
    return {
      totalErrors,
      errorsByFile,
      errorsByCategory
    };
  }

  /**
   * 生成摘要报告
   */
  generateSummary(result) {
    const summary = {
      status: result.success ? 'PASS' : 'FAIL',
      totalErrors: result.totalErrors,
      filesWithErrors: Object.keys(result.errorsByFile).length,
      duration: `${result.duration}ms`,
      categories: result.errorsByCategory
    };

    if (result.totalErrors > 0) {
      // 找出错误最多的文件
      const sortedFiles = Object.entries(result.errorsByFile)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
      
      summary.topErrorFiles = sortedFiles.map(([file, count]) => ({
        file,
        errors: count
      }));
    }

    return summary;
  }

  /**
   * 显示摘要信息
   */
  displaySummary(result) {
    console.log('\n📋 类型检查验证摘要:');
    console.log('='.repeat(50));
    console.log(`状态: ${result.summary.status}`);
    console.log(`总错误数: ${result.summary.totalErrors}`);
    console.log(`有错误的文件数: ${result.summary.filesWithErrors}`);
    console.log(`检查耗时: ${result.summary.duration}`);
    
    if (result.summary.topErrorFiles) {
      console.log('\n🔥 错误最多的文件 (前10个):');
      result.summary.topErrorFiles.forEach((item, index) => {
        console.log(`${index + 1}. ${item.file}: ${item.errors} 个错误`);
      });
    }
    
    console.log('\n📊 错误分类统计:');
    Object.entries(result.summary.categories).forEach(([category, count]) => {
      if (count > 0) {
        console.log(`- ${category}: ${count} 个错误`);
      }
    });
    
    console.log('\n' + '='.repeat(50));
  }

  /**
   * 建立类型回归测试机制
   */
  async setupRegressionTesting() {
    console.log('🔧 建立类型回归测试机制...\n');
    
    // 创建基准文件
    const baselineFile = path.join(this.projectRoot, 'type-check-baseline.json');
    const currentResult = await this.runFullTypeCheck();
    
    // 保存当前状态作为基准
    const baseline = {
      timestamp: currentResult.timestamp,
      totalErrors: currentResult.totalErrors,
      errorsByFile: currentResult.errorsByFile,
      version: '1.0.0'
    };
    
    fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2));
    console.log(`📋 类型检查基准已保存到: ${baselineFile}`);
    
    // 创建回归测试脚本
    const regressionScript = `#!/usr/bin/env node

/**
 * TypeScript 类型回归测试脚本
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const baselineFile = path.join(process.cwd(), 'type-check-baseline.json');

if (!fs.existsSync(baselineFile)) {
  console.error('❌ 未找到类型检查基准文件，请先运行 type-check-validation.js');
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));

try {
  execSync('node scripts/type-check-validation.js', { stdio: 'inherit' });
  
  const reportFile = path.join(process.cwd(), 'type-check-report.json');
  const currentReport = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  
  console.log('\\n🔍 类型回归测试结果:');
  console.log('='.repeat(50));
  
  const errorDiff = currentReport.totalErrors - baseline.totalErrors;
  
  if (errorDiff === 0) {
    console.log('✅ 没有新的类型错误，回归测试通过！');
  } else if (errorDiff > 0) {
    console.log(\`❌ 发现 \${errorDiff} 个新的类型错误！\`);
    process.exit(1);
  } else {
    console.log(\`🎉 修复了 \${Math.abs(errorDiff)} 个类型错误！\`);
  }
  
} catch (error) {
  console.error('❌ 类型回归测试失败:', error.message);
  process.exit(1);
}
`;

    const regressionScriptPath = path.join(this.projectRoot, 'scripts', 'type-regression-test.js');
    fs.writeFileSync(regressionScriptPath, regressionScript);
    console.log(`🧪 类型回归测试脚本已创建: ${regressionScriptPath}`);
    
    return {
      baselineFile,
      regressionScriptPath,
      baseline
    };
  }
}

// 主执行逻辑
async function main() {
  const validator = new TypeCheckValidator();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--setup-regression')) {
    await validator.setupRegressionTesting();
  } else {
    await validator.runFullTypeCheck();
  }
}

// 直接执行主函数
main().catch(console.error);

export { TypeCheckValidator };