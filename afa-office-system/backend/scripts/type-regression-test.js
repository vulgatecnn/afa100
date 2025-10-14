#!/usr/bin/env node

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
  
  console.log('\n🔍 类型回归测试结果:');
  console.log('='.repeat(50));
  
  const errorDiff = currentReport.totalErrors - baseline.totalErrors;
  
  if (errorDiff === 0) {
    console.log('✅ 没有新的类型错误，回归测试通过！');
  } else if (errorDiff > 0) {
    console.log(`❌ 发现 ${errorDiff} 个新的类型错误！`);
    process.exit(1);
  } else {
    console.log(`🎉 修复了 ${Math.abs(errorDiff)} 个类型错误！`);
  }
  
} catch (error) {
  console.error('❌ 类型回归测试失败:', error.message);
  process.exit(1);
}
