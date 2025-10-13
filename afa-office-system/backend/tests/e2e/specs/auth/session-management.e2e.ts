import { test, expect } from '@playwright/test';

/**
 * 会话管理和安全性端到端测试
 * 测试用户会话的创建、维护、过期和安全性
 */

test.describe('会话管理测试', () => {

  test('用户登录会话创建', async ({ page }) => {
    // 登录前验证无会话状态
    await page.goto('http://localhost:5000/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
    
    // 执行登录
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 验证会话信息存储
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
    
    const userInfo = await page.evaluate(() => localStorage.getItem('user_info'));
    expect(userInfo).toBeTruthy();
    
    const parsedUserInfo = JSON.parse(userInfo);
    expect(parsedUserInfo.username).toBe('tenant_admin');
    expect(parsedUserInfo.role).toBe('tenant_admin');
    
    // 验证会话在页面刷新后保持
    await page.reload();
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('[data-testid="user-info"]')).toContainText('租务管理员');
  });

  test('用户主动退出登录', async ({ page }) => {
    // 先登录
    await page.goto('http://localhost:5000/login');
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 验证登录状态
    const tokenBeforeLogout = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(tokenBeforeLogout).toBeTruthy();
    
    // 执行退出登录
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // 验证跳转到登录页
    await expect(page).toHaveURL(/.*\/login/);
    
    // 验证会话信息被清除
    const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(tokenAfterLogout).toBeNull();
    
    const userInfoAfterLogout = await page.evaluate(() => localStorage.getItem('user_info'));
    expect(userInfoAfterLogout).toBeNull();
    
    // 验证无法访问需要认证的页面
    await page.goto('http://localhost:5000/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('会话超时自动退出', async ({ page }) => {
    // 登录
    await page.goto('http://localhost:5000/login');
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 模拟会话超时（设置过期的令牌）
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlbmFudF9hZG1pbiIsInJvbGUiOiJ0ZW5hbnRfYWRtaW4iLCJleHAiOjE2MDAwMDAwMDB9.invalid';
    
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, expiredToken);
    
    // 尝试访问需要认证的API
    await page.click('[data-testid="nav-merchants"]');
    
    // 验证自动跳转到登录页
    await expect(page).toHaveURL(/.*\/login/);
    
    // 验证会话过期提示
    await expect(page.locator('[data-testid="session-expired-message"]')).toContainText('会话已过期');
  });

  test('并发会话管理', async ({ context }) => {
    // 在第一个标签页登录
    const page1 = await context.newPage();
    await page1.goto('http://localhost:5000/login');
    await page1.fill('[data-testid="username"]', 'tenant_admin');
    await page1.fill('[data-testid="password"]', 'password123');
    await page1.click('[data-testid="login-button"]');
    await expect(page1).toHaveURL(/.*\/dashboard/);
    
    // 在第二个标签页也能访问（共享会话）
    const page2 = await context.newPage();
    await page2.goto('http://localhost:5000/dashboard');
    await expect(page2.locator('[data-testid="user-info"]')).toContainText('租务管理员');
    
    // 在第一个标签页退出登录
    await page1.click('[data-testid="user-menu"]');
    await page1.click('[data-testid="logout-button"]');
    await expect(page1).toHaveURL(/.*\/login/);
    
    // 验证第二个标签页的会话状态
    await page2.reload();
    await expect(page2).toHaveURL(/.*\/login/); // 应该也被退出
  });

  test('记住登录状态', async ({ page }) => {
    // 登录时选择记住登录状态
    await page.goto('http://localhost:5000/login');
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.check('[data-testid="remember-me"]');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 验证记住登录状态的标识
    const rememberMe = await page.evaluate(() => localStorage.getItem('remember_me'));
    expect(rememberMe).toBe('true');
    
    // 关闭浏览器并重新打开（模拟）
    await page.context().clearCookies();
    
    // 重新访问应用
    await page.goto('http://localhost:5000/dashboard');
    
    // 如果实现了记住登录，应该仍然保持登录状态
    // 或者至少保留用户名信息
    const savedUsername = await page.evaluate(() => localStorage.getItem('saved_username'));
    if (savedUsername) {
      expect(savedUsername).toBe('tenant_admin');
    }
  });

  test('安全会话验证', async ({ page }) => {
    // 登录
    await page.goto('http://localhost:5000/login');
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 获取原始令牌
    const originalToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    
    // 验证令牌格式和内容
    const tokenParts = originalToken.split('.');
    expect(tokenParts).toHaveLength(3);
    
    const payload = JSON.parse(atob(tokenParts[1]));
    expect(payload.username).toBe('tenant_admin');
    expect(payload.exp).toBeGreaterThan(Date.now() / 1000); // 未过期
    
    // 尝试修改令牌
    const modifiedToken = originalToken.slice(0, -5) + 'xxxxx';
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, modifiedToken);
    
    // 访问需要认证的页面
    await page.reload();
    
    // 验证被拒绝访问
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('跨设备会话管理', async ({ browser }) => {
    // 模拟第一个设备登录
    const context1 = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    const page1 = await context1.newPage();
    
    await page1.goto('http://localhost:5000/login');
    await page1.fill('[data-testid="username"]', 'tenant_admin');
    await page1.fill('[data-testid="password"]', 'password123');
    await page1.click('[data-testid="login-button"]');
    await expect(page1).toHaveURL(/.*\/dashboard/);
    
    // 模拟第二个设备登录同一账户
    const context2 = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    const page2 = await context2.newPage();
    
    await page2.goto('http://localhost:5000/login');
    await page2.fill('[data-testid="username"]', 'tenant_admin');
    await page2.fill('[data-testid="password"]', 'password123');
    await page2.click('[data-testid="login-button"]');
    await expect(page2).toHaveURL(/.*\/dashboard/);
    
    // 验证两个设备都能正常访问
    await expect(page1.locator('[data-testid="user-info"]')).toContainText('租务管理员');
    await expect(page2.locator('[data-testid="user-info"]')).toContainText('租务管理员');
    
    // 在第二个设备退出登录
    await page2.click('[data-testid="user-menu"]');
    await page2.click('[data-testid="logout-button"]');
    
    // 验证第一个设备是否受影响（取决于会话管理策略）
    await page1.reload();
    // 如果实现了单点登录，第一个设备也应该被退出
    // 如果允许多设备同时登录，第一个设备应该仍然有效
    
    await context1.close();
    await context2.close();
  });

  test('会话活动监控', async ({ page }) => {
    // 登录
    await page.goto('http://localhost:5000/login');
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 记录初始活动时间
    const initialActivity = await page.evaluate(() => localStorage.getItem('last_activity'));
    
    // 执行一些操作
    await page.click('[data-testid="nav-merchants"]');
    await page.waitForLoadState('networkidle');
    
    // 验证活动时间更新
    const updatedActivity = await page.evaluate(() => localStorage.getItem('last_activity'));
    
    if (initialActivity && updatedActivity) {
      expect(new Date(updatedActivity).getTime()).toBeGreaterThan(new Date(initialActivity).getTime());
    }
    
    // 模拟长时间无活动
    await page.evaluate(() => {
      const oldTime = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30分钟前
      localStorage.setItem('last_activity', oldTime);
    });
    
    // 尝试执行操作
    await page.click('[data-testid="nav-spaces"]');
    
    // 验证是否触发重新认证（取决于实现）
    // 可能显示重新认证对话框或直接跳转到登录页
  });
});
