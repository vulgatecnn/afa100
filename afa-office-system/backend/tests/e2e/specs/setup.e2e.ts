import { test as setup } from '@playwright/test';
import { validateTestEnvironment } from '../config/test-environment.js';
import { DatabaseManager } from '../helpers/database-manager.js';
import { TestDataManager } from '../helpers/test-data-manager.js';

/**
 * 测试环境设置
 * 在所有测试开始前执行一次
 */
setup('测试环境准备', async ({ page }) => {
  console.log('🚀 开始准备端到端测试环境...');

  // 1. 验证测试环境
  console.log('📋 验证测试环境可用性...');
  const isReady = await validateTestEnvironment();
  if (!isReady) {
    throw new Error('测试环境不可用，请检查服务是否正常启动');
  }

  // 2. 初始化数据库
  console.log('🗄️ 初始化测试数据库...');
  const dbManager = new DatabaseManager();
  await dbManager.initialize();
  await dbManager.resetDatabase();

  // 3. 准备测试数据
  console.log('📊 加载测试数据...');
  const dataManager = new TestDataManager();
  await dataManager.loadFixtures();
  await dataManager.seedDatabase();

  // 4. 验证后端API可用性
  console.log('🔍 验证后端API...');
  const response = await page.request.get('/api/v1/health');
  if (!response.ok()) {
    throw new Error(`后端API不可用: ${response.status()}`);
  }

  console.log('✅ 测试环境准备完成');
});

/**
 * 创建认证状态 - 租务管理员
 */
setup('创建租务管理员认证状态', async ({ page }) => {
  console.log('🔐 创建租务管理员认证状态...');

  try {
    // 访问租务管理端登录页
    await page.goto('http://localhost:5000/login');
    
    // 填写登录信息
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    
    // 点击登录按钮
    await page.click('[data-testid="login-button"]');
    
    // 等待登录成功，跳转到仪表板
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // 保存认证状态
    await page.context().storageState({ 
      path: 'tests/e2e/fixtures/auth-states/tenant-admin.json' 
    });
    
    console.log('✅ 租务管理员认证状态创建成功');
  } catch (error) {
    console.warn('⚠️ 租务管理员认证状态创建失败:', error);
    // 不抛出错误，允许测试继续
  }
});

/**
 * 创建认证状态 - 商户管理员
 */
setup('创建商户管理员认证状态', async ({ page }) => {
  console.log('🔐 创建商户管理员认证状态...');

  try {
    // 访问商户管理端登录页
    await page.goto('http://localhost:5050/login');
    
    // 填写登录信息
    await page.fill('[data-testid="username"]', 'merchant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    
    // 点击登录按钮
    await page.click('[data-testid="login-button"]');
    
    // 等待登录成功
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // 保存认证状态
    await page.context().storageState({ 
      path: 'tests/e2e/fixtures/auth-states/merchant-admin.json' 
    });
    
    console.log('✅ 商户管理员认证状态创建成功');
  } catch (error) {
    console.warn('⚠️ 商户管理员认证状态创建失败:', error);
  }
});

/**
 * 创建认证状态 - 商户员工
 */
setup('创建商户员工认证状态', async ({ page }) => {
  console.log('🔐 创建商户员工认证状态...');

  try {
    // 访问商户管理端登录页
    await page.goto('http://localhost:5050/login');
    
    // 填写登录信息
    await page.fill('[data-testid="username"]', 'employee_user');
    await page.fill('[data-testid="password"]', 'password123');
    
    // 点击登录按钮
    await page.click('[data-testid="login-button"]');
    
    // 等待登录成功
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // 保存认证状态
    await page.context().storageState({ 
      path: 'tests/e2e/fixtures/auth-states/merchant-employee.json' 
    });
    
    console.log('✅ 商户员工认证状态创建成功');
  } catch (error) {
    console.warn('⚠️ 商户员工认证状态创建失败:', error);
  }
});