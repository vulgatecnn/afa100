/**
 * Playwright 全局设置
 * 在所有测试开始前执行的初始化操作
 */

import { FullConfig } from '@playwright/test';
import { getCurrentEnvironment, validateEnvironmentConfig } from '../config/environments';

async function globalSetup(config: FullConfig) {
  console.log('🚀 开始全局测试环境设置...');
  
  try {
    // 验证环境配置
    const envConfig = getCurrentEnvironment();
    validateEnvironmentConfig(envConfig);
    console.log(`✅ 环境配置验证通过: ${envConfig.name}`);
    
    // 设置环境变量
    process.env.TEST_BASE_URL = envConfig.tenantAdminUrl;
    process.env.TEST_MERCHANT_URL = envConfig.merchantAdminUrl;
    process.env.TEST_API_URL = envConfig.apiUrl;
    
    // 创建测试结果目录
    const fs = await import('fs');
    const path = await import('path');
    
    const testResultsDir = path.join(process.cwd(), 'test-results');
    const screenshotsDir = path.join(testResultsDir, 'screenshots');
    const videosDir = path.join(testResultsDir, 'videos');
    const tracesDir = path.join(testResultsDir, 'traces');
    
    for (const dir of [testResultsDir, screenshotsDir, videosDir, tracesDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 创建目录: ${dir}`);
      }
    }
    
    // 清理旧的测试结果（可选）
    if (process.env.CLEAN_TEST_RESULTS === 'true') {
      console.log('🧹 清理旧的测试结果...');
      const { execSync } = await import('child_process');
      try {
        if (process.platform === 'win32') {
          execSync(`if exist "${testResultsDir}" rmdir /s /q "${testResultsDir}"`);
        } else {
          execSync(`rm -rf "${testResultsDir}"`);
        }
        fs.mkdirSync(testResultsDir, { recursive: true });
      } catch (error) {
        console.warn('⚠️ 清理测试结果目录时出现警告:', error);
      }
    }
    
    // 等待服务启动（仅在本地环境）
    if (envConfig.name === 'Local Development') {
      console.log('⏳ 等待本地服务启动...');
      await waitForServices(envConfig);
    }
    
    // 初始化测试数据（如果需要）
    if (process.env.INIT_TEST_DATA === 'true') {
      console.log('📊 初始化测试数据...');
      await initializeTestData(envConfig);
    }
    
    console.log('✅ 全局测试环境设置完成');
    
  } catch (error) {
    console.error('❌ 全局设置失败:', error);
    process.exit(1);
  }
}

/**
 * 等待服务启动
 */
async function waitForServices(envConfig: any) {
  const services = [
    { name: '后端API', url: `${envConfig.apiUrl}/api/v1/health` },
    { name: '租务管理端', url: envConfig.tenantAdminUrl },
    { name: '商户管理端', url: envConfig.merchantAdminUrl },
  ];
  
  for (const service of services) {
    await waitForService(service.name, service.url);
  }
}

/**
 * 等待单个服务启动
 */
async function waitForService(name: string, url: string, maxRetries = 30) {
  console.log(`⏳ 等待 ${name} 启动: ${url}`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5秒超时
      });
      
      if (response.ok || response.status === 404) {
        console.log(`✅ ${name} 已启动`);
        return;
      }
    } catch (error) {
      // 继续重试
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
  }
  
  throw new Error(`${name} 启动超时: ${url}`);
}

/**
 * 初始化测试数据
 */
async function initializeTestData(envConfig: any) {
  try {
    // 这里可以调用API初始化测试数据
    const response = await fetch(`${envConfig.apiUrl}/api/v1/test/init`, {
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
      console.log('✅ 测试数据初始化完成');
    } else {
      console.warn('⚠️ 测试数据初始化失败，将使用默认数据');
    }
  } catch (error) {
    console.warn('⚠️ 测试数据初始化出现错误:', error);
  }
}

export default globalSetup;