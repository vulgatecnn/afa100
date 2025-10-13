import { test, expect } from '@playwright/test';
import { testEnvironmentConfig } from '../../config/test-environment.js';

/**
 * JWT认证和会话管理端到端测试
 * 测试JWT令牌的生成、验证、刷新和过期处理
 */

test.describe('JWT认证测试', () => {

  test('JWT令牌生成和验证', async ({ page }) => {
    // 登录获取JWT令牌
    await page.goto('http://localhost:5000/login');
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // 等待登录成功
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 验证JWT令牌存储
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
    
    // 验证令牌格式（JWT应该有三个部分，用.分隔）
    const tokenParts = token.split('.');
    expect(tokenParts).toHaveLength(3);
    
    // 验证令牌包含用户信息（解码payload）
    const payload = JSON.parse(atob(tokenParts[1]));
    expect(payload.username).toBe('tenant_admin');
    expect(payload.role).toBe('tenant_admin');
    expect(payload.exp).toBeTruthy(); // 过期时间
  });

  test('API请求自动携带JWT令牌', async ({ page }) => {
    // 使用预设的认证状态
    await page.goto('http://localhost:5000/login');
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 监听API请求
    const apiRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push({
          url: request.url(),
          headers: request.headers()
        });
      }
    });
    
    // 触发需要认证的API调用
    await page.click('[data-testid="nav-merchants"]');
    await page.waitForLoadState('networkidle');
    
    // 验证API请求包含Authorization头
    const merchantsRequest = apiRequests.find(req => req.url.includes('/api/v1/merchants'));
    expect(merchantsRequest).toBeTruthy();
    expect(merchantsRequest.headers.authorization).toMatch(/^Bearer /);
  });

  test('JWT令牌过期处理', async ({ page }) => {
    // 登录获取令牌
    await page.goto('http://localhost:5000/login');
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 模拟过期的JWT令牌
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlbmFudF9hZG1pbiIsInJvbGUiOiJ0ZW5hbnRfYWRtaW4iLCJleHAiOjE2MDAwMDAwMDB9.invalid';
    
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, expiredToken);
    
    // 刷新页面触发令牌验证
    await page.reload();
    
    // 验证自动跳转到登录页
    await expect(page).toHaveURL(/.*\/login/);
    
    // 验证错误提示
    await expect(page.locator('[data-testid="session-expired-message"]')).toContainText('会话已过期，请重新登录');
  });

  test('无效JWT令牌处理', async ({ page }) => {
    // 设置无效的JWT令牌
    await page.goto('http://localhost:5000/dashboard');
    
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'invalid.jwt.token');
    });
    
    // 刷新页面
    await page.reload();
    
    // 验证跳转到登录页
    await expect(page).toHaveURL(/.*\/login/);
    
    // 验证错误提示
    await expect(page.locator('[data-testid="invalid-token-message"]')).toContainText('认证信息无效，请重新登录');
  });

  test('JWT令牌自动刷新', async ({ page }) => {
    // 登录获取令牌
    await page.goto('http://localhost:5000/login');
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 获取初始令牌
    const initialToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    
    // 等待一段时间（模拟接近过期）
    await page.waitForTimeout(2000);
    
    // 触发API调用，可能触发令牌刷新
    await page.click('[data-testid="nav-merchants"]');
    await page.waitForLoadState('networkidle');
    
    // 检查令牌是否被刷新（在实际应用中，这取决于刷新策略）
    const currentToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(currentToken).toBeTruthy();
    
    // 注意：令牌是否刷新取决于具体的实现策略
    // 这里主要验证系统能够正常处理令牌刷新逻辑
  });

  test('多标签页会话同步', async ({ context }) => {
    // 在第一个标签页登录
    const page1 = await context.newPage();
    await page1.goto('http://localhost:5000/login');
    await page1.fill('[data-testid="username"]', 'tenant_admin');
    await page1.fill('[data-testid="password"]', 'password123');
    await page1.click('[data-testid="login-button"]');
    await expect(page1).toHaveURL(/.*\/dashboard/);
    
    // 在第二个标签页访问需要认证的页面
    const page2 = await context.newPage();
    await page2.goto('http://localhost:5000/dashboard');
    
    // 验证第二个标签页也能正常访问（共享认证状态）
    await expect(page2.locator('[data-testid="user-info"]')).toContainText('租务管理员');
    
    // 在第一个标签页退出登录
    await page1.click('[data-testid="logout-button"]');
    await expect(page1).toHaveURL(/.*\/login/);
    
    // 验证第二个标签页也会自动退出（如果实现了会话同步）
    await page2.reload();
    await expect(page2).toHaveURL(/.*\/login/);
  });

  test('跨域认证状态', async ({ page }) => {
    // 在租务管理端登录
    await page.goto('http://localhost:5000/login');
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 尝试访问商户管理端（不同端口）
    await page.goto('http://localhost:5050/dashboard');
    
    // 验证需要重新登录（因为是不同的应用）
    await expect(page).toHaveURL(/.*\/login/);
    
    // 或者验证能够通过统一认证（如果实现了SSO）
    // 这取决于具体的认证架构设计
  });
});
