/**
 * Playwright 全局清理
 * 在所有测试结束后执行的清理操作
 */

import { FullConfig } from '@playwright/test';
import { getCurrentEnvironment } from '../config/environments';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 开始全局测试环境清理...');
  
  try {
    const envConfig = getCurrentEnvironment();
    
    // 清理测试数据
    if (process.env.CLEANUP_TEST_DATA === 'true') {
      console.log('🗑️ 清理测试数据...');
      await cleanupTestData(envConfig);
    }
    
    // 生成测试报告摘要
    await generateTestSummary();
    
    // 压缩测试结果（如果需要）
    if (process.env.COMPRESS_TEST_RESULTS === 'true') {
      console.log('📦 压缩测试结果...');
      await compressTestResults();
    }
    
    // 上传测试结果到云存储（如果配置了）
    if (process.env.UPLOAD_TEST_RESULTS === 'true') {
      console.log('☁️ 上传测试结果...');
      await uploadTestResults();
    }
    
    console.log('✅ 全局测试环境清理完成');
    
  } catch (error) {
    console.error('❌ 全局清理失败:', error);
    // 不要因为清理失败而导致测试失败
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestData(envConfig: any) {
  try {
    const response = await fetch(`${envConfig.apiUrl}/api/v1/test/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        environment: envConfig.name,
        timestamp: new Date().toISOString(),
      }),
    });
    
    if (response.ok) {
      console.log('✅ 测试数据清理完成');
    } else {
      console.warn('⚠️ 测试数据清理失败');
    }
  } catch (error) {
    console.warn('⚠️ 测试数据清理出现错误:', error);
  }
}

/**
 * 生成测试报告摘要
 */
async function generateTestSummary() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const resultsPath = path.join(process.cwd(), 'test-results', 'results.json');
    
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
      
      const summary = {
        timestamp: new Date().toISOString(),
        environment: process.env.TEST_ENV || 'local',
        total: results.stats?.total || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
        success: (results.stats?.failed || 0) === 0,
      };
      
      const summaryPath = path.join(process.cwd(), 'test-results', 'summary.json');
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      
      console.log('📊 测试摘要:');
      console.log(`   总计: ${summary.total}`);
      console.log(`   通过: ${summary.passed}`);
      console.log(`   失败: ${summary.failed}`);
      console.log(`   跳过: ${summary.skipped}`);
      console.log(`   耗时: ${Math.round(summary.duration / 1000)}秒`);
      console.log(`   状态: ${summary.success ? '✅ 成功' : '❌ 失败'}`);
    }
  } catch (error) {
    console.warn('⚠️ 生成测试摘要失败:', error);
  }
}

/**
 * 压缩测试结果
 */
async function compressTestResults() {
  try {
    const { execSync } = await import('child_process');
    const path = await import('path');
    
    const testResultsDir = path.join(process.cwd(), 'test-results');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `test-results-${timestamp}.zip`;
    
    if (process.platform === 'win32') {
      // Windows 使用 PowerShell 压缩
      execSync(`powershell Compress-Archive -Path "${testResultsDir}\\*" -DestinationPath "${archiveName}"`);
    } else {
      // Unix 系统使用 zip
      execSync(`cd "${testResultsDir}" && zip -r "../${archiveName}" .`);
    }
    
    console.log(`✅ 测试结果已压缩: ${archiveName}`);
  } catch (error) {
    console.warn('⚠️ 压缩测试结果失败:', error);
  }
}

/**
 * 上传测试结果到云存储
 */
async function uploadTestResults() {
  try {
    // 这里可以实现上传到 AWS S3、阿里云 OSS 等云存储服务
    console.log('⚠️ 云存储上传功能尚未实现');
  } catch (error) {
    console.warn('⚠️ 上传测试结果失败:', error);
  }
}

export default globalTeardown;