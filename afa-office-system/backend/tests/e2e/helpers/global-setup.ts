import { chromium, FullConfig } from '@playwright/test';
import { validateTestEnvironment } from '../config/test-environment.js';
import { TestDataManager } from './test-data-manager.js';
import { DatabaseManager } from './database-manager.js';

/**
 * 全局测试设置
 * 在所有测试开始前执行
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 开始端到端测试环境设置...');

  try {
    // 1. 验证测试环境
    console.log('📋 验证测试环境...');
    const isEnvironmentReady = await validateTestEnvironment();
    if (!isEnvironmentReady) {
      throw new Error('测试环境验证失败');
    }
    console.log('✅ 测试环境验证通过');

    // 2. 初始化测试数据库
    console.log('🗄️ 初始化测试数据库...');
    const dbManager = new DatabaseManager();
    await dbManager.initialize();
    await dbManager.resetDatabase();
    console.log('✅ 测试数据库初始化完成');

    // 3. 准备测试数据
    console.log('📊 准备测试数据...');
    const dataManager = new TestDataManager();
    await dataManager.loadFixtures();
    await dataManager.seedDatabase();
    console.log('✅ 测试数据准备完成');

    // 4. 预热服务
    console.log('🔥 预热服务...');
    await warmupServices();
    console.log('✅ 服务预热完成');

    // 5. 创建认证状态
    console.log('🔐 创建认证状态...');
    await createAuthStates();
    console.log('✅ 认证状态创建完成');

    console.log('🎉 端到端测试环境设置完成');
  } catch (error) {
    console.error('❌ 测试环境设置失败:', error);
    throw error;
  }
}

/**
 * 预热服务 - 确保所有服务响应正常
 */
async function warmupServices() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 预热后端API
    const response = await page.request.get('/api/v1/health');
    if (!response.ok()) {
      throw new Error(`后端服务预热失败: ${response.status()}`);
    }

    // 预热前端页面（如果可用）
    try {
      await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
      await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    } catch (error) {
      console.warn('前端服务预热跳过:', error);
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

/**
 * 创建认证状态文件
 * 为不同用户角色预先创建登录状态
 */
async function createAuthStates() {
  const browser = await chromium.launch();
  
  // 创建租务管理员认证状态
  await createAuthState(browser, 'tenant-admin', {
    username: 'tenant_admin',
    password: 'password123'
  });

  // 创建商户管理员认证状态
  await createAuthState(browser, 'merchant-admin', {
    username: 'merchant_admin',
    password: 'password123'
  });

  // 创建商户员工认证状态
  await createAuthState(browser, 'merchant-employee', {
    username: 'employee_user',
    password: 'password123'
  });

  await browser.close();
}

/**
 * 为特定用户角色创建认证状态
 */
async function createAuthState(browser: any, role: string, credentials: { username: string; password: string }) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 根据角色选择登录URL
    const loginUrl = role.includes('tenant') 
      ? 'http://localhost:3001/login'
      : 'http://localhost:3002/login';

    await page.goto(loginUrl);
    
    // 执行登录
    await page.fill('[data-testid="username"]', credentials.username);
    await page.fill('[data-testid="password"]', credentials.password);
    await page.click('[data-testid="login-button"]');
    
    // 等待登录成功
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // 保存认证状态
    await context.storageState({ 
      path: `tests/e2e/fixtures/auth-states/${role}.json` 
    });
  } catch (error) {
    console.warn(`创建${role}认证状态失败:`, error);
  } finally {
    await context.close();
  }
}

export default globalSetup;