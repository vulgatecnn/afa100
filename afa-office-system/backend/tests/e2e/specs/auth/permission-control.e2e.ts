import { test, expect } from '@playwright/test';

/**
 * 权限控制端到端测试
 * 测试不同用户角色的权限控制和访问限制
 */

test.describe('权限控制测试', () => {

  test('租务管理员权限验证', async ({ page }) => {
    // 使用租务管理员身份登录
    await page.goto('http://localhost:5000/login');
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 验证租务管理员可以访问所有功能
    
    // 商户管理权限
    await page.click('[data-testid="nav-merchants"]');
    await expect(page).toHaveURL(/.*\/merchants/);
    await expect(page.locator('[data-testid="add-merchant-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="edit-merchant-button"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="delete-merchant-button"]').first()).toBeVisible();
    
    // 空间管理权限
    await page.click('[data-testid="nav-spaces"]');
    await expect(page).toHaveURL(/.*\/spaces/);
    await expect(page.locator('[data-testid="add-space-button"]')).toBeVisible();
    
    // 用户管理权限
    await page.click('[data-testid="nav-users"]');
    await expect(page).toHaveURL(/.*\/users/);
    await expect(page.locator('[data-testid="add-user-button"]')).toBeVisible();
    
    // 系统设置权限
    await page.click('[data-testid="nav-settings"]');
    await expect(page).toHaveURL(/.*\/settings/);
    await expect(page.locator('[data-testid="system-config"]')).toBeVisible();
  });

  test('商户管理员权限验证', async ({ page }) => {
    // 使用商户管理员身份登录
    await page.goto('http://localhost:5050/login');
    await page.fill('[data-testid="username"]', 'merchant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 验证商户管理员可以访问的功能
    
    // 员工管理权限
    await page.click('[data-testid="nav-employees"]');
    await expect(page).toHaveURL(/.*\/employees/);
    await expect(page.locator('[data-testid="add-employee-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="edit-employee-button"]').first()).toBeVisible();
    
    // 访客管理权限
    await page.click('[data-testid="nav-visitors"]');
    await expect(page).toHaveURL(/.*\/visitors/);
    await expect(page.locator('[data-testid="approve-visitor-button"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="reject-visitor-button"]').first()).toBeVisible();
    
    // 通行记录查看权限
    await page.click('[data-testid="nav-access-records"]');
    await expect(page).toHaveURL(/.*\/access-records/);
    await expect(page.locator('[data-testid="access-records-table"]')).toBeVisible();
    
    // 验证商户管理员不能访问的功能
    
    // 不应该看到商户管理菜单
    await expect(page.locator('[data-testid="nav-merchants"]')).not.toBeVisible();
    
    // 不应该看到系统用户管理
    await expect(page.locator('[data-testid="nav-users"]')).not.toBeVisible();
    
    // 尝试直接访问受限页面应该被拒绝
    await page.goto('http://localhost:5000/merchants');
    await expect(page).toHaveURL(/.*\/login/); // 应该跳转到登录页或显示权限错误
  });

  test('商户员工权限验证', async ({ page }) => {
    // 使用商户员工身份登录
    await page.goto('http://localhost:5050/login');
    await page.fill('[data-testid="username"]', 'employee_user');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 验证商户员工可以访问的功能
    
    // 访客申请审批权限（只读或有限操作）
    await page.click('[data-testid="nav-visitors"]');
    await expect(page).toHaveURL(/.*\/visitors/);
    await expect(page.locator('[data-testid="visitor-list"]')).toBeVisible();
    
    // 个人资料管理
    await page.click('[data-testid="nav-my-profile"]');
    await expect(page).toHaveURL(/.*\/profile/);
    await expect(page.locator('[data-testid="edit-profile-button"]')).toBeVisible();
    
    // 验证商户员工不能访问的功能
    
    // 不应该看到员工管理菜单
    await expect(page.locator('[data-testid="nav-employees"]')).not.toBeVisible();
    
    // 不应该有添加/删除员工的权限
    await page.goto('http://localhost:5050/employees');
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    
    // 不应该看到系统设置
    await expect(page.locator('[data-testid="nav-settings"]')).not.toBeVisible();
  });

  test('未认证用户访问控制', async ({ page }) => {
    // 尝试直接访问需要认证的页面
    
    // 访问租务管理端仪表板
    await page.goto('http://localhost:5000/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
    
    // 访问商户管理端仪表板
    await page.goto('http://localhost:5050/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
    
    // 访问具体功能页面
    await page.goto('http://localhost:5000/merchants');
    await expect(page).toHaveURL(/.*\/login/);
    
    await page.goto('http://localhost:5050/employees');
    await expect(page).toHaveURL(/.*\/login/);
    
    // 验证API访问也被拒绝
    const response = await page.request.get('http://localhost:5100/api/v1/merchants');
    expect(response.status()).toBe(401); // 未认证
  });

  test('跨角色访问控制', async ({ page }) => {
    // 商户管理员尝试访问租务管理功能
    await page.goto('http://localhost:5050/login');
    await page.fill('[data-testid="username"]', 'merchant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 获取商户管理员的JWT令牌
    const merchantToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    
    // 尝试用商户管理员令牌访问租务管理API
    const response = await page.request.get('http://localhost:5100/api/v1/merchants', {
      headers: {
        'Authorization': `Bearer ${merchantToken}`
      }
    });
    
    expect(response.status()).toBe(403); // 权限不足
    
    const responseBody = await response.json();
    expect(responseBody.message).toContain('权限不足');
  });

  test('资源级权限控制', async ({ page }) => {
    // 商户管理员只能管理自己商户的数据
    await page.goto('http://localhost:5050/login');
    await page.fill('[data-testid="username"]', 'merchant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 访问员工管理页面
    await page.click('[data-testid="nav-employees"]');
    await expect(page).toHaveURL(/.*\/employees/);
    
    // 验证只能看到自己商户的员工
    const employeeRows = page.locator('[data-testid="employee-row"]');
    const count = await employeeRows.count();
    
    // 检查每个员工是否属于当前商户
    for (let i = 0; i < count; i++) {
      const merchantInfo = await employeeRows.nth(i).locator('[data-testid="employee-merchant"]').textContent();
      expect(merchantInfo).toContain('测试科技有限公司'); // 当前商户名称
    }
    
    // 尝试访问其他商户的员工详情应该被拒绝
    await page.goto('http://localhost:5050/employees/999'); // 假设这是其他商户的员工ID
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
  });

  test('动态权限更新', async ({ page }) => {
    // 登录为商户员工
    await page.goto('http://localhost:5050/login');
    await page.fill('[data-testid="username"]', 'employee_user');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 验证当前权限
    await expect(page.locator('[data-testid="nav-employees"]')).not.toBeVisible();
    
    // 模拟权限升级（在实际应用中，这可能通过管理员操作完成）
    // 这里我们模拟权限变更后的状态
    
    // 刷新页面或重新登录以获取新权限
    await page.reload();
    
    // 验证权限是否正确更新
    // 注意：这个测试需要配合后端的权限管理系统
  });

  test('会话安全性验证', async ({ page }) => {
    // 登录获取会话
    await page.goto('http://localhost:5000/login');
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 获取当前JWT令牌
    const originalToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    
    // 模拟令牌被篡改
    const tamperedToken = originalToken.slice(0, -10) + 'tampered123';
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, tamperedToken);
    
    // 尝试访问需要认证的API
    const response = await page.request.get('http://localhost:5100/api/v1/merchants');
    expect(response.status()).toBe(401); // 令牌无效
    
    // 页面应该自动跳转到登录页
    await page.reload();
    await expect(page).toHaveURL(/.*\/login/);
  });
});
