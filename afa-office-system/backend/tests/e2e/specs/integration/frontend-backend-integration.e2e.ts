import { test, expect } from '@playwright/test';
import { testEnvironmentConfig } from '../../config/test-environment.js';

/**
 * 前后端集成端到端测试
 * 测试前端和后端之间的完整数据流和交互
 */

test.describe('前后端集成测试', () => {

  test.describe('数据流完整性测试', () => {
    test.use({ 
      storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json' 
    });

    test('用户管理完整数据流', async ({ page }) => {
      // 1. 前端请求用户列表
      await page.goto('http://localhost:3001/users');
      await page.waitForLoadState('networkidle');
      
      // 验证用户列表正确显示
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
      const userRows = page.locator('[data-testid="user-row"]');
      const userCount = await userRows.count();
      expect(userCount).toBeGreaterThan(0);
      
      // 2. 创建新用户 - 前端到后端数据流
      await page.click('[data-testid="add-user-button"]');
      
      const newUserData = {
        username: 'integration_test_user',
        email: 'integration@test.com',
        password: 'password123',
        role: 'merchant_employee',
        phone: '13800138001',
        department: '集成测试部'
      };
      
      await page.fill('[data-testid="user-username"]', newUserData.username);
      await page.fill('[data-testid="user-email"]', newUserData.email);
      await page.fill('[data-testid="user-password"]', newUserData.password);
      await page.fill('[data-testid="user-confirm-password"]', newUserData.password);
      await page.selectOption('[data-testid="user-role-select"]', newUserData.role);
      await page.fill('[data-testid="user-phone"]', newUserData.phone);
      await page.fill('[data-testid="user-department"]', newUserData.department);
      
      await page.click('[data-testid="submit-user-button"]');
      
      // 验证创建成功反馈
      await expect(page.locator('[data-testid="success-message"]')).toContainText('用户创建成功');
      
      // 3. 验证后端数据持久化 - 刷新页面检查数据
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const newUserRow = page.locator('[data-testid="user-row"]').filter({ hasText: newUserData.username });
      await expect(newUserRow).toBeVisible();
      await expect(newUserRow.locator('[data-testid="user-email"]')).toContainText(newUserData.email);
      await expect(newUserRow.locator('[data-testid="user-role"]')).toContainText('商户员工');
      
      // 4. 编辑用户 - 双向数据流测试
      await newUserRow.locator('[data-testid="edit-user-button"]').click();
      
      // 验证编辑表单预填充了正确数据
      await expect(page.locator('[data-testid="user-username"]')).toHaveValue(newUserData.username);
      await expect(page.locator('[data-testid="user-email"]')).toHaveValue(newUserData.email);
      await expect(page.locator('[data-testid="user-phone"]')).toHaveValue(newUserData.phone);
      
      // 修改数据
      const updatedEmail = 'updated_integration@test.com';
      await page.fill('[data-testid="user-email"]', updatedEmail);
      await page.fill('[data-testid="user-department"]', '更新后的部门');
      
      await page.click('[data-testid="update-user-button"]');
      
      // 验证更新成功
      await expect(page.locator('[data-testid="success-message"]')).toContainText('用户信息更新成功');
      
      // 验证数据更新反映在界面上
      await expect(newUserRow.locator('[data-testid="user-email"]')).toContainText(updatedEmail);
      
      // 5. 删除用户 - 验证数据删除
      await newUserRow.locator('[data-testid="delete-user-button"]').click();
      await page.fill('[data-testid="delete-confirmation-input"]', '确认删除');
      await page.click('[data-testid="confirm-delete-button"]');
      
      // 验证删除成功
      await expect(page.locator('[data-testid="success-message"]')).toContainText('用户删除成功');
      
      // 验证用户从列表中消失
      await expect(page.locator('[data-testid="user-row"]').filter({ hasText: newUserData.username })).not.toBeVisible();
    });

    test('商户空间关联数据流', async ({ page }) => {
      await page.goto('http://localhost:3001/merchants');
      
      // 选择商户进行空间管理
      const merchantRow = page.locator('[data-testid="merchant-row"]').first();
      const merchantName = await merchantRow.locator('[data-testid="merchant-name"]').textContent();
      
      await merchantRow.locator('[data-testid="manage-spaces-button"]').click();
      
      // 验证当前空间数据正确加载
      await expect(page.locator('[data-testid="spaces-management-modal"]')).toBeVisible();
      
      const currentSpaces = page.locator('[data-testid="current-space-item"]');
      const initialSpaceCount = await currentSpaces.count();
      
      // 添加新空间
      await page.click('[data-testid="add-space-button"]');
      
      const availableSpaces = page.locator('[data-testid="available-space-item"]');
      const availableCount = await availableSpaces.count();
      
      if (availableCount > 0) {
        await availableSpaces.first().click();
        
        await page.fill('[data-testid="space-start-date"]', '2024-01-01');
        await page.fill('[data-testid="space-end-date"]', '2024-12-31');
        await page.fill('[data-testid="space-capacity"]', '25');
        
        await page.click('[data-testid="confirm-space-allocation"]');
        
        // 验证空间添加到当前列表
        const updatedSpaces = page.locator('[data-testid="current-space-item"]');
        const updatedCount = await updatedSpaces.count();
        expect(updatedCount).toBe(initialSpaceCount + 1);
        
        // 保存更改
        await page.click('[data-testid="save-spaces-button"]');
        
        // 验证保存成功
        await expect(page.locator('[data-testid="success-message"]')).toContainText('空间分配已更新');
        
        // 重新打开验证数据持久化
        await merchantRow.locator('[data-testid="manage-spaces-button"]').click();
        
        const persistedSpaces = page.locator('[data-testid="current-space-item"]');
        const persistedCount = await persistedSpaces.count();
        expect(persistedCount).toBe(updatedCount);
      }
    });
  });

  test.describe('状态同步测试', () => {
    test('多页面状态同步', async ({ context }) => {
      // 创建两个页面模拟多标签页
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      // 在两个页面都登录
      for (const page of [page1, page2]) {
        await page.goto('http://localhost:3001/login');
        await page.fill('[data-testid="username"]', 'tenant_admin');
        await page.fill('[data-testid="password"]', 'password123');
        await page.click('[data-testid="login-button"]');
        await expect(page).toHaveURL(/.*\/dashboard/);
      }
      
      // 页面1访问用户管理
      await page1.goto('http://localhost:3001/users');
      
      // 页面2也访问用户管理
      await page2.goto('http://localhost:3001/users');
      
      // 在页面1创建用户
      await page1.click('[data-testid="add-user-button"]');
      await page1.fill('[data-testid="user-username"]', 'sync_test_user');
      await page1.fill('[data-testid="user-email"]', 'sync@test.com');
      await page1.fill('[data-testid="user-password"]', 'password123');
      await page1.fill('[data-testid="user-confirm-password"]', 'password123');
      await page1.click('[data-testid="submit-user-button"]');
      
      await expect(page1.locator('[data-testid="success-message"]')).toContainText('用户创建成功');
      
      // 刷新页面2验证数据同步
      await page2.reload();
      await page2.waitForLoadState('networkidle');
      
      // 验证新用户在页面2也能看到
      await expect(page2.locator('[data-testid="user-row"]').filter({ hasText: 'sync_test_user' })).toBeVisible();
      
      await page1.close();
      await page2.close();
    });

    test('实时通知同步', async ({ browser }) => {
      // 创建商户管理员和租务管理员两个上下文
      const tenantContext = await browser.newContext({
        storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json'
      });
      const merchantContext = await browser.newContext({
        storageState: 'tests/e2e/fixtures/auth-states/merchant-admin.json'
      });
      
      const tenantPage = await tenantContext.newPage();
      const merchantPage = await merchantContext.newPage();
      
      // 租务管理员查看通知
      await tenantPage.goto('http://localhost:3001/dashboard');
      
      // 商户管理员审批访客申请
      await merchantPage.goto('http://localhost:3002/visitors');
      
      const applicationRow = merchantPage.locator('[data-testid="application-row"]').first();
      if (await applicationRow.count() > 0) {
        await applicationRow.locator('[data-testid="approve-application-button"]').click();
        await merchantPage.fill('[data-testid="approval-notes"]', '实时通知测试');
        await merchantPage.click('[data-testid="confirm-approval-button"]');
        
        // 验证审批成功
        await expect(merchantPage.locator('[data-testid="success-message"]')).toContainText('访客申请已批准');
        
        // 检查租务管理员是否收到通知
        await tenantPage.waitForTimeout(2000); // 等待通知传播
        
        // 检查通知铃铛或通知列表
        const notificationBadge = tenantPage.locator('[data-testid="notification-badge"]');
        if (await notificationBadge.count() > 0) {
          await expect(notificationBadge).toBeVisible();
        }
      }
      
      await tenantContext.close();
      await merchantContext.close();
    });
  });

  test.describe('错误处理和恢复测试', () => {
    test.use({ 
      storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json' 
    });

    test('网络中断恢复测试', async ({ page }) => {
      await page.goto('http://localhost:3001/users');
      
      // 模拟网络中断
      await page.route('**/api/v1/**', route => {
        route.abort('failed');
      });
      
      // 尝试创建用户
      await page.click('[data-testid="add-user-button"]');
      await page.fill('[data-testid="user-username"]', 'network_test_user');
      await page.fill('[data-testid="user-email"]', 'network@test.com');
      await page.fill('[data-testid="user-password"]', 'password123');
      await page.fill('[data-testid="user-confirm-password"]', 'password123');
      
      await page.click('[data-testid="submit-user-button"]');
      
      // 验证网络错误提示
      await expect(page.locator('[data-testid="network-error-message"]')).toContainText('网络连接失败');
      
      // 恢复网络连接
      await page.unroute('**/api/v1/**');
      
      // 重试操作
      await page.click('[data-testid="retry-button"]');
      
      // 验证操作成功
      await expect(page.locator('[data-testid="success-message"]')).toContainText('用户创建成功');
    });

    test('服务器错误处理测试', async ({ page }) => {
      await page.goto('http://localhost:3001/users');
      
      // 模拟服务器500错误
      await page.route('**/api/v1/users', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: '服务器内部错误',
            code: 500
          })
        });
      });
      
      // 尝试创建用户
      await page.click('[data-testid="add-user-button"]');
      await page.fill('[data-testid="user-username"]', 'server_error_test');
      await page.fill('[data-testid="user-email"]', 'error@test.com');
      await page.fill('[data-testid="user-password"]', 'password123');
      await page.fill('[data-testid="user-confirm-password"]', 'password123');
      
      await page.click('[data-testid="submit-user-button"]');
      
      // 验证服务器错误提示
      await expect(page.locator('[data-testid="server-error-message"]')).toContainText('服务器内部错误');
      
      // 验证错误详情显示
      await page.click('[data-testid="show-error-details"]');
      await expect(page.locator('[data-testid="error-details-modal"]')).toBeVisible();
    });

    test('数据验证错误处理', async ({ page }) => {
      await page.goto('http://localhost:3001/users');
      
      // 模拟后端验证错误
      await page.route('**/api/v1/users', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: '数据验证失败',
              errors: {
                username: '用户名已存在',
                email: '邮箱格式不正确'
              }
            })
          });
        } else {
          route.continue();
        }
      });
      
      await page.click('[data-testid="add-user-button"]');
      await page.fill('[data-testid="user-username"]', 'duplicate_user');
      await page.fill('[data-testid="user-email"]', 'invalid-email');
      await page.fill('[data-testid="user-password"]', 'password123');
      await page.fill('[data-testid="user-confirm-password"]', 'password123');
      
      await page.click('[data-testid="submit-user-button"]');
      
      // 验证字段级错误显示
      await expect(page.locator('[data-testid="username-error"]')).toContainText('用户名已存在');
      await expect(page.locator('[data-testid="email-error"]')).toContainText('邮箱格式不正确');
    });
  });

  test.describe('性能和用户体验测试', () => {
    test.use({ 
      storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json' 
    });

    test('页面加载性能测试', async ({ page }) => {
      // 测试用户管理页面加载性能
      const startTime = Date.now();
      
      await page.goto('http://localhost:3001/users');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // 5秒内加载完成
      
      // 验证关键元素可见
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
      await expect(page.locator('[data-testid="add-user-button"]')).toBeVisible();
      
      // 测试搜索响应性能
      const searchStartTime = Date.now();
      
      await page.fill('[data-testid="user-search-input"]', 'admin');
      await page.click('[data-testid="search-button"]');
      await page.waitForLoadState('networkidle');
      
      const searchTime = Date.now() - searchStartTime;
      expect(searchTime).toBeLessThan(3000); // 3秒内搜索完成
    });

    test('大数据量处理测试', async ({ page }) => {
      await page.goto('http://localhost:3001/users');
      
      // 测试分页加载
      const pagination = page.locator('[data-testid="pagination"]');
      if (await pagination.count() > 0) {
        // 跳转到最后一页
        await page.click('[data-testid="last-page-button"]');
        await page.waitForLoadState('networkidle');
        
        // 验证数据正确加载
        await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
        
        // 测试页面切换性能
        const pageChangeStart = Date.now();
        
        await page.click('[data-testid="first-page-button"]');
        await page.waitForLoadState('networkidle');
        
        const pageChangeTime = Date.now() - pageChangeStart;
        expect(pageChangeTime).toBeLessThan(2000); // 2秒内切换完成
      }
    });

    test('并发操作用户体验', async ({ page }) => {
      await page.goto('http://localhost:3001/users');
      
      // 同时触发多个操作
      const operations = [];
      
      // 搜索操作
      operations.push(async () => {
        await page.fill('[data-testid="user-search-input"]', 'test');
        await page.click('[data-testid="search-button"]');
      });
      
      // 筛选操作
      operations.push(async () => {
        await page.click('[data-testid="role-filter-select"]');
        await page.click('[data-testid="filter-merchant-admin"]');
      });
      
      // 刷新操作
      operations.push(async () => {
        await page.click('[data-testid="refresh-button"]');
      });
      
      // 并发执行操作
      await Promise.all(operations.map(op => op()));
      
      // 验证界面仍然响应
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
      
      // 验证没有出现错误提示
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    });
  });

  test.describe('移动端适配测试', () => {
    test('移动端响应式布局', async ({ browser }) => {
      // 创建移动端视口
      const mobileContext = await browser.newContext({
        viewport: { width: 375, height: 667 }, // iPhone SE尺寸
        storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json'
      });
      
      const mobilePage = await mobileContext.newPage();
      
      await mobilePage.goto('http://localhost:3001/dashboard');
      
      // 验证移动端导航
      await expect(mobilePage.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      // 打开移动端菜单
      await mobilePage.click('[data-testid="mobile-menu-button"]');
      await expect(mobilePage.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
      
      // 测试移动端用户管理
      await mobilePage.click('[data-testid="nav-users"]');
      await expect(mobilePage).toHaveURL(/.*\/users/);
      
      // 验证移动端表格适配
      await expect(mobilePage.locator('[data-testid="mobile-user-cards"]')).toBeVisible();
      
      // 测试移动端操作
      const userCard = mobilePage.locator('[data-testid="mobile-user-card"]').first();
      await userCard.click();
      
      // 验证移动端详情页
      await expect(mobilePage.locator('[data-testid="user-details-mobile"]')).toBeVisible();
      
      await mobileContext.close();
    });

    test('触摸操作测试', async ({ browser }) => {
      const touchContext = await browser.newContext({
        viewport: { width: 768, height: 1024 }, // iPad尺寸
        hasTouch: true,
        storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json'
      });
      
      const touchPage = await touchContext.newPage();
      
      await touchPage.goto('http://localhost:3001/users');
      
      // 测试滑动操作
      const userRow = touchPage.locator('[data-testid="user-row"]').first();
      
      // 模拟左滑显示操作按钮
      await userRow.hover();
      await touchPage.mouse.down();
      await touchPage.mouse.move(-100, 0);
      await touchPage.mouse.up();
      
      // 验证滑动操作按钮显示
      await expect(touchPage.locator('[data-testid="swipe-actions"]')).toBeVisible();
      
      await touchContext.close();
    });
  });
});