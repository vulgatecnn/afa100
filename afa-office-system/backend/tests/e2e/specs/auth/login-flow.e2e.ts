import { test, expect } from '@playwright/test';
import { testEnvironmentConfig } from '../../config/test-environment.js';

/**
 * 用户登录流程端到端测试
 * 测试不同用户角色的登录流程和权限验证
 */

test.describe('用户登录流程测试', () => {
  
  test.beforeEach(async ({ page }) => {
    // 每个测试前清理存储状态
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test('租务管理员登录流程', async ({ page }) => {
    // 访问租务管理端登录页
    await page.goto('http://localhost:3001/login');
    
    // 验证登录页面元素
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="username"]')).toBeVisible();
    await expect(page.locator('[data-testid="password"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    
    // 填写登录信息
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    
    // 点击登录按钮
    await page.click('[data-testid="login-button"]');
    
    // 验证登录成功 - 跳转到仪表板
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 验证用户信息显示
    await expect(page.locator('[data-testid="user-info"]')).toContainText('租务管理员');
    
    // 验证导航菜单权限
    await expect(page.locator('[data-testid="nav-merchants"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-spaces"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-users"]')).toBeVisible();
    
    // 验证JWT令牌存储
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
  });

  test('商户管理员登录流程', async ({ page }) => {
    // 访问商户管理端登录页
    await page.goto('http://localhost:3002/login');
    
    // 验证登录页面
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    
    // 填写登录信息
    await page.fill('[data-testid="username"]', 'merchant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    
    // 登录
    await page.click('[data-testid="login-button"]');
    
    // 验证登录成功
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 验证用户角色
    await expect(page.locator('[data-testid="user-info"]')).toContainText('商户管理员');
    
    // 验证商户管理员权限菜单
    await expect(page.locator('[data-testid="nav-employees"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-visitors"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-access-records"]')).toBeVisible();
    
    // 验证不应该看到租务管理功能
    await expect(page.locator('[data-testid="nav-merchants"]')).not.toBeVisible();
  });

  test('商户员工登录流程', async ({ page }) => {
    // 访问商户管理端登录页
    await page.goto('http://localhost:3002/login');
    
    // 填写员工登录信息
    await page.fill('[data-testid="username"]', 'employee_user');
    await page.fill('[data-testid="password"]', 'password123');
    
    // 登录
    await page.click('[data-testid="login-button"]');
    
    // 验证登录成功
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 验证用户角色
    await expect(page.locator('[data-testid="user-info"]')).toContainText('商户员工');
    
    // 验证员工权限菜单（受限）
    await expect(page.locator('[data-testid="nav-visitors"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-my-profile"]')).toBeVisible();
    
    // 验证不应该看到管理功能
    await expect(page.locator('[data-testid="nav-employees"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="nav-merchants"]')).not.toBeVisible();
  });

  test('登录失败处理', async ({ page }) => {
    await page.goto('http://localhost:3001/login');
    
    // 测试错误的用户名
    await page.fill('[data-testid="username"]', 'wrong_user');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // 验证错误提示
    await expect(page.locator('[data-testid="error-message"]')).toContainText('用户名或密码错误');
    
    // 验证仍在登录页
    await expect(page).toHaveURL(/.*\/login/);
    
    // 测试错误的密码
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'wrong_password');
    await page.click('[data-testid="login-button"]');
    
    // 验证错误提示
    await expect(page.locator('[data-testid="error-message"]')).toContainText('用户名或密码错误');
  });

  test('空字段验证', async ({ page }) => {
    await page.goto('http://localhost:3001/login');
    
    // 尝试空用户名登录
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // 验证用户名必填提示
    await expect(page.locator('[data-testid="username-error"]')).toContainText('请输入用户名');
    
    // 尝试空密码登录
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', '');
    await page.click('[data-testid="login-button"]');
    
    // 验证密码必填提示
    await expect(page.locator('[data-testid="password-error"]')).toContainText('请输入密码');
  });
});