import { test, expect } from '@playwright/test';
import { LoginPage, UserRole } from '../../page-objects/login-page';
import { TenantDashboardPage } from '../../page-objects/tenant/tenant-dashboard-page';
import { MerchantDashboardPage } from '../../page-objects/merchant/merchant-dashboard-page';
import { testUsers } from '../../fixtures/test-data';

/**
 * 多角色登录测试套件
 * 
 * 测试需求:
 * - 需求 1.1: 用户认证流程自动化测试
 * - 需求 1.4: 员工管理功能自动化测试
 * - 需求 1.5: 设备管理功能自动化测试
 * 
 * 测试内容:
 * - 测试租务管理员登录和权限验证
 * - 测试商户管理员登录和权限验证
 * - 测试商户员工登录和权限验证
 */
test.describe('多角色登录测试', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectPageLoaded();
  });

  test.describe('租务管理员登录和权限验证', () => {
    test('应该成功登录租务管理员并验证权限', async ({ page }) => {
      const user = testUsers.tenantAdmin;
      
      // 执行登录
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      // 验证跳转到租务管理端仪表板
      await expect(page).toHaveURL(/\/tenant\/dashboard|\/dashboard/);
      
      // 创建租务管理端页面对象并验证权限
      const tenantDashboard = new TenantDashboardPage(page);
      await tenantDashboard.expectDashboardLoaded();
      
      // 验证租务管理员特有权限
      await tenantDashboard.expectTenantAdminAccess();
      
      // 验证统计卡片显示
      await tenantDashboard.expectStatisticsCardsVisible();
      
      // 验证快速操作按钮
      await tenantDashboard.expectQuickActionsVisible();
      
      // 验证用户信息显示正确
      await tenantDashboard.expectUserProfileVisible();
    });

    test('应该能够访问租务管理员专属功能', async ({ page }) => {
      const user = testUsers.tenantAdmin;
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      const tenantDashboard = new TenantDashboardPage(page);
      await tenantDashboard.expectDashboardLoaded();
      
      // 测试商户管理功能访问
      await tenantDashboard.navigateToMenu('商户管理');
      await expect(page).toHaveURL(/\/tenant\/merchants|\/merchants/);
      
      // 返回仪表板
      await tenantDashboard.goto();
      
      // 测试设备管理功能访问
      await tenantDashboard.navigateToMenu('设备管理');
      await expect(page).toHaveURL(/\/tenant\/devices|\/devices/);
      
      // 返回仪表板
      await tenantDashboard.goto();
      
      // 测试系统设置功能访问
      await tenantDashboard.navigateToMenu('系统设置');
      await expect(page).toHaveURL(/\/tenant\/settings|\/settings/);
    });

    test('应该能够查看租务管理员统计数据', async ({ page }) => {
      const user = testUsers.tenantAdmin;
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      const tenantDashboard = new TenantDashboardPage(page);
      await tenantDashboard.expectDashboardLoaded();
      
      // 等待数据加载
      await tenantDashboard.waitForDataLoad();
      
      // 获取统计数据
      const statistics = await tenantDashboard.getStatistics();
      
      // 验证统计数据结构
      expect(statistics).toHaveProperty('totalMerchants');
      expect(statistics).toHaveProperty('activeMerchants');
      expect(statistics).toHaveProperty('totalDevices');
      expect(statistics).toHaveProperty('onlineDevices');
      expect(statistics).toHaveProperty('todayAccess');
      expect(statistics).toHaveProperty('monthlyAccess');
      
      // 验证数据类型
      expect(typeof statistics.totalMerchants).toBe('number');
      expect(typeof statistics.activeMerchants).toBe('number');
      expect(typeof statistics.totalDevices).toBe('number');
      expect(typeof statistics.onlineDevices).toBe('number');
      expect(typeof statistics.todayAccess).toBe('number');
      expect(typeof statistics.monthlyAccess).toBe('number');
    });

    test('应该能够执行租务管理员快速操作', async ({ page }) => {
      const user = testUsers.tenantAdmin;
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      const tenantDashboard = new TenantDashboardPage(page);
      await tenantDashboard.expectDashboardLoaded();
      
      // 测试添加商户功能
      await tenantDashboard.clickAddMerchant();
      await expect(page).toHaveURL(/\/tenant\/merchants\/add|\/merchants\/add/);
      
      // 返回仪表板
      await tenantDashboard.goto();
      
      // 测试添加设备功能
      await tenantDashboard.clickAddDevice();
      await expect(page).toHaveURL(/\/tenant\/devices\/add|\/devices\/add/);
    });
  });

  test.describe('商户管理员登录和权限验证', () => {
    test('应该成功登录商户管理员并验证权限', async ({ page }) => {
      const user = testUsers.merchantAdmin;
      
      // 执行登录
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      // 验证跳转到商户管理端仪表板
      await expect(page).toHaveURL(/\/merchant\/dashboard|\/dashboard/);
      
      // 创建商户管理端页面对象并验证权限
      const merchantDashboard = new MerchantDashboardPage(page);
      await merchantDashboard.expectDashboardLoaded();
      
      // 验证商户管理员特有权限
      await merchantDashboard.expectMerchantAdminAccess();
      
      // 验证统计卡片显示
      await merchantDashboard.expectStatisticsCardsVisible();
      
      // 验证快速操作按钮
      await merchantDashboard.expectQuickActionsVisible();
      
      // 验证用户信息显示正确
      await merchantDashboard.expectUserProfileVisible();
    });

    test('应该能够访问商户管理员专属功能', async ({ page }) => {
      const user = testUsers.merchantAdmin;
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      const merchantDashboard = new MerchantDashboardPage(page);
      await merchantDashboard.expectDashboardLoaded();
      
      // 测试员工管理功能访问
      await merchantDashboard.navigateToMenu('员工管理');
      await expect(page).toHaveURL(/\/merchant\/employees|\/employees/);
      
      // 返回仪表板
      await merchantDashboard.goto();
      
      // 测试访客管理功能访问
      await merchantDashboard.navigateToMenu('访客管理');
      await expect(page).toHaveURL(/\/merchant\/visitors|\/visitors/);
      
      // 返回仪表板
      await merchantDashboard.goto();
      
      // 测试权限设置功能访问
      await merchantDashboard.navigateToMenu('权限设置');
      await expect(page).toHaveURL(/\/merchant\/permissions|\/permissions/);
    });

    test('应该能够查看商户管理员统计数据', async ({ page }) => {
      const user = testUsers.merchantAdmin;
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      const merchantDashboard = new MerchantDashboardPage(page);
      await merchantDashboard.expectDashboardLoaded();
      
      // 等待数据加载
      await merchantDashboard.waitForDataLoad();
      
      // 获取统计数据
      const statistics = await merchantDashboard.getStatistics();
      
      // 验证统计数据结构
      expect(statistics).toHaveProperty('totalEmployees');
      expect(statistics).toHaveProperty('activeEmployees');
      expect(statistics).toHaveProperty('pendingVisitors');
      expect(statistics).toHaveProperty('approvedVisitors');
      expect(statistics).toHaveProperty('todayAccess');
      expect(statistics).toHaveProperty('monthlyAccess');
      
      // 验证数据类型
      expect(typeof statistics.totalEmployees).toBe('number');
      expect(typeof statistics.activeEmployees).toBe('number');
      expect(typeof statistics.pendingVisitors).toBe('number');
      expect(typeof statistics.approvedVisitors).toBe('number');
      expect(typeof statistics.todayAccess).toBe('number');
      expect(typeof statistics.monthlyAccess).toBe('number');
    });

    test('应该能够处理访客审批功能', async ({ page }) => {
      const user = testUsers.merchantAdmin;
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      const merchantDashboard = new MerchantDashboardPage(page);
      await merchantDashboard.expectDashboardLoaded();
      
      // 验证待审批表格显示
      await merchantDashboard.expectPendingApprovalsTableVisible();
      
      // 检查待审批数量
      const pendingCount = await merchantDashboard.getPendingApprovalsCount();
      expect(pendingCount).toBeGreaterThanOrEqual(0);
      
      // 验证待审批提醒
      await merchantDashboard.expectPendingApprovalsAlert();
      
      // 测试快速审批功能（如果有待审批项目）
      if (pendingCount > 0) {
        // 这里可以添加具体的审批测试逻辑
        // 由于测试环境可能没有实际的待审批数据，这里只验证界面元素
        await merchantDashboard.clickApproveVisitors();
        await expect(page).toHaveURL(/\/merchant\/visitors|\/visitors/);
      }
    });

    test('应该能够执行商户管理员快速操作', async ({ page }) => {
      const user = testUsers.merchantAdmin;
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      const merchantDashboard = new MerchantDashboardPage(page);
      await merchantDashboard.expectDashboardLoaded();
      
      // 测试添加员工功能
      await merchantDashboard.clickAddEmployee();
      await expect(page).toHaveURL(/\/merchant\/employees\/add|\/employees\/add/);
      
      // 返回仪表板
      await merchantDashboard.goto();
      
      // 测试查看通行记录功能
      await merchantDashboard.viewAccessRecords();
      await expect(page).toHaveURL(/\/merchant\/access-records|\/access-records/);
    });
  });

  test.describe('商户员工登录和权限验证', () => {
    test('应该成功登录商户员工并验证基础权限', async ({ page }) => {
      const user = testUsers.employee;
      
      // 执行登录
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      // 验证跳转到员工仪表板或商户管理端
      await expect(page).toHaveURL(/\/merchant\/dashboard|\/employee\/dashboard|\/dashboard/);
      
      // 验证会话状态
      const sessionValid = await loginPage.checkSessionStatus();
      expect(sessionValid).toBeTruthy();
    });

    test('应该验证商户员工的有限权限', async ({ page }) => {
      const user = testUsers.employee;
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      // 尝试访问商户管理端仪表板
      const merchantDashboard = new MerchantDashboardPage(page);
      await merchantDashboard.goto();
      
      // 验证员工只能看到有限的功能
      // 员工应该能看到访客管理和通行记录，但不能看到员工管理
      const hasEmployeeManagement = await merchantDashboard.isElementVisible('[data-testid="employee-management-menu"]');
      const hasVisitorManagement = await merchantDashboard.isElementVisible('[data-testid="visitor-management-menu"]');
      const hasAccessRecords = await merchantDashboard.isElementVisible('[data-testid="access-records-menu"]');
      
      // 员工通常不应该有员工管理权限
      expect(hasEmployeeManagement).toBeFalsy();
      
      // 员工应该有访客管理权限
      expect(hasVisitorManagement).toBeTruthy();
      
      // 员工应该能查看通行记录
      expect(hasAccessRecords).toBeTruthy();
    });

    test('应该能够访问员工允许的功能', async ({ page }) => {
      const user = testUsers.employee;
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      const merchantDashboard = new MerchantDashboardPage(page);
      await merchantDashboard.goto();
      
      // 测试访客管理功能访问
      if (await merchantDashboard.isElementVisible('[data-testid="visitor-management-menu"]')) {
        await merchantDashboard.navigateToMenu('访客管理');
        await expect(page).toHaveURL(/\/merchant\/visitors|\/visitors/);
        
        // 返回仪表板
        await merchantDashboard.goto();
      }
      
      // 测试通行记录功能访问
      if (await merchantDashboard.isElementVisible('[data-testid="access-records-menu"]')) {
        await merchantDashboard.navigateToMenu('通行记录');
        await expect(page).toHaveURL(/\/merchant\/access-records|\/access-records/);
      }
    });

    test('应该拒绝员工访问管理员功能', async ({ page }) => {
      const user = testUsers.employee;
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      // 尝试直接访问租务管理端
      await page.goto('/tenant/dashboard');
      
      // 应该被重定向或显示权限不足
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/tenant/dashboard');
      
      // 可能被重定向到登录页面或显示权限错误
      const isLoginPage = currentUrl.includes('/login');
      const isErrorPage = currentUrl.includes('/error') || currentUrl.includes('/403');
      const isEmployeeDashboard = currentUrl.includes('/merchant/dashboard') || currentUrl.includes('/employee/dashboard');
      
      expect(isLoginPage || isErrorPage || isEmployeeDashboard).toBeTruthy();
    });

    test('应该验证已停用员工无法登录', async ({ page }) => {
      const user = testUsers.inactiveEmployee;
      
      // 尝试登录已停用的员工账户
      await loginPage.login(user.username, user.password);
      
      // 应该显示账户已停用的错误信息
      await loginPage.expectLoginError('账户已停用');
      
      // 验证仍在登录页面
      await expect(page).toHaveURL(/\/login/);
      
      // 验证会话状态无效
      const sessionValid = await loginPage.checkSessionStatus();
      expect(sessionValid).toBeFalsy();
    });
  });

  test.describe('角色权限边界测试', () => {
    test('应该验证不同角色的URL访问权限', async ({ page }) => {
      // 测试租务管理员权限
      const tenantAdmin = testUsers.tenantAdmin;
      await loginPage.login(tenantAdmin.username, tenantAdmin.password);
      await loginPage.expectLoginSuccess();
      
      // 租务管理员应该能访问租务管理端
      await page.goto('/tenant/dashboard');
      await expect(page).toHaveURL(/\/tenant\/dashboard/);
      
      // 退出登录
      await page.goto('/login');
      await loginPage.clearForm();
      
      // 测试商户管理员权限
      const merchantAdmin = testUsers.merchantAdmin;
      await loginPage.login(merchantAdmin.username, merchantAdmin.password);
      await loginPage.expectLoginSuccess();
      
      // 商户管理员不应该能访问租务管理端
      await page.goto('/tenant/dashboard');
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/tenant/dashboard');
    });

    test('应该验证API权限控制', async ({ page }) => {
      const employee = testUsers.employee;
      
      await loginPage.login(employee.username, employee.password);
      await loginPage.expectLoginSuccess();
      
      // 尝试访问需要管理员权限的API
      const response = await page.request.get('/api/v1/merchants');
      
      // 员工应该没有权限访问商户管理API
      expect(response.status()).toBe(403);
    });

    test('应该验证会话权限一致性', async ({ page }) => {
      const merchantAdmin = testUsers.merchantAdmin;
      
      await loginPage.login(merchantAdmin.username, merchantAdmin.password);
      await loginPage.expectLoginSuccess();
      
      // 验证用户信息API返回正确的角色
      const userInfoResponse = await page.request.get('/api/v1/auth/me');
      expect(userInfoResponse.ok()).toBeTruthy();
      
      const userInfo = await userInfoResponse.json();
      expect(userInfo.data.role).toBe('merchant_admin');
      expect(userInfo.data.permissions).toContain('merchant_management');
    });
  });

  test.describe('角色切换和会话管理', () => {
    test('应该支持不同角色间的登录切换', async ({ page }) => {
      // 先登录租务管理员
      const tenantAdmin = testUsers.tenantAdmin;
      await loginPage.login(tenantAdmin.username, tenantAdmin.password);
      await loginPage.expectLoginSuccess();
      
      const tenantDashboard = new TenantDashboardPage(page);
      await tenantDashboard.expectDashboardLoaded();
      
      // 退出登录
      await tenantDashboard.logout();
      await expect(page).toHaveURL(/\/login/);
      
      // 登录商户管理员
      const merchantAdmin = testUsers.merchantAdmin;
      await loginPage.login(merchantAdmin.username, merchantAdmin.password);
      await loginPage.expectLoginSuccess();
      
      const merchantDashboard = new MerchantDashboardPage(page);
      await merchantDashboard.expectDashboardLoaded();
      
      // 验证角色已切换
      await merchantDashboard.expectUserProfileVisible();
    });

    test('应该清除前一个用户的会话数据', async ({ page }) => {
      // 登录第一个用户
      const tenantAdmin = testUsers.tenantAdmin;
      await loginPage.login(tenantAdmin.username, tenantAdmin.password);
      await loginPage.expectLoginSuccess();
      
      // 检查本地存储
      const firstUserToken = await page.evaluate(() => localStorage.getItem('authToken'));
      expect(firstUserToken).toBeTruthy();
      
      // 退出并登录第二个用户
      const tenantDashboard = new TenantDashboardPage(page);
      await tenantDashboard.logout();
      
      const merchantAdmin = testUsers.merchantAdmin;
      await loginPage.login(merchantAdmin.username, merchantAdmin.password);
      await loginPage.expectLoginSuccess();
      
      // 检查令牌已更换
      const secondUserToken = await page.evaluate(() => localStorage.getItem('authToken'));
      expect(secondUserToken).toBeTruthy();
      expect(secondUserToken).not.toBe(firstUserToken);
    });
  });

  test.describe('快速登录功能测试', () => {
    test('应该支持租务管理员快速登录', async ({ page }) => {
      // 检查快速登录按钮是否可用
      if (await loginPage.isElementVisible('[data-testid="quick-login-tenant-admin"]')) {
        await loginPage.quickLoginAsTenantAdmin();
        await loginPage.expectLoginSuccess();
        
        // 验证跳转到正确的仪表板
        await expect(page).toHaveURL(/\/tenant\/dashboard|\/dashboard/);
        
        const tenantDashboard = new TenantDashboardPage(page);
        await tenantDashboard.expectDashboardLoaded();
      }
    });

    test('应该支持商户管理员快速登录', async ({ page }) => {
      if (await loginPage.isElementVisible('[data-testid="quick-login-merchant-admin"]')) {
        await loginPage.quickLoginAsMerchantAdmin();
        await loginPage.expectLoginSuccess();
        
        // 验证跳转到正确的仪表板
        await expect(page).toHaveURL(/\/merchant\/dashboard|\/dashboard/);
        
        const merchantDashboard = new MerchantDashboardPage(page);
        await merchantDashboard.expectDashboardLoaded();
      }
    });

    test('应该支持员工快速登录', async ({ page }) => {
      if (await loginPage.isElementVisible('[data-testid="quick-login-employee"]')) {
        await loginPage.quickLoginAsEmployee();
        await loginPage.expectLoginSuccess();
        
        // 验证跳转到正确的页面
        await expect(page).toHaveURL(/\/merchant\/dashboard|\/employee\/dashboard|\/dashboard/);
      }
    });
  });
});