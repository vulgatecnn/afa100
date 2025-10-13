import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base-page';

/**
 * 商户管理端仪表板页面对象
 * 提供商户管理员的主要功能入口和概览信息
 */
export class MerchantDashboardPage extends BasePage {
  // 页面主要区域
  readonly pageHeader: Locator;
  readonly navigationMenu: Locator;
  readonly userProfile: Locator;
  readonly logoutButton: Locator;
  readonly breadcrumb: Locator;

  // 统计卡片
  readonly totalEmployeesCard: Locator;
  readonly activeEmployeesCard: Locator;
  readonly pendingVisitorsCard: Locator;
  readonly approvedVisitorsCard: Locator;
  readonly todayAccessCard: Locator;
  readonly monthlyAccessCard: Locator;

  // 快速操作按钮
  readonly addEmployeeButton: Locator;
  readonly approveVisitorsButton: Locator;
  readonly viewAccessRecordsButton: Locator;
  readonly managePermissionsButton: Locator;

  // 数据表格
  readonly recentVisitorsTable: Locator;
  readonly recentAccessTable: Locator;
  readonly pendingApprovalsTable: Locator;

  // 图表区域
  readonly visitorTrendChart: Locator;
  readonly accessPatternChart: Locator;
  readonly employeeActivityChart: Locator;

  // 导航菜单项
  readonly employeeManagementMenu: Locator;
  readonly visitorManagementMenu: Locator;
  readonly accessRecordsMenu: Locator;
  readonly permissionSettingsMenu: Locator;

  // 通知和提醒
  readonly notificationBell: Locator;
  readonly pendingApprovalsAlert: Locator;
  readonly systemAnnouncementAlert: Locator;

  constructor(page: Page) {
    super(page);

    // 页面主要区域
    this.pageHeader = page.locator('[data-testid="page-header"], .page-header');
    this.navigationMenu = page.locator('[data-testid="navigation-menu"], .ant-menu');
    this.userProfile = page.locator('[data-testid="user-profile"], .user-profile');
    this.logoutButton = page.locator('[data-testid="logout-button"], .logout-btn');
    this.breadcrumb = page.locator('[data-testid="breadcrumb"], .ant-breadcrumb');

    // 统计卡片
    this.totalEmployeesCard = page.locator('[data-testid="total-employees-card"]');
    this.activeEmployeesCard = page.locator('[data-testid="active-employees-card"]');
    this.pendingVisitorsCard = page.locator('[data-testid="pending-visitors-card"]');
    this.approvedVisitorsCard = page.locator('[data-testid="approved-visitors-card"]');
    this.todayAccessCard = page.locator('[data-testid="today-access-card"]');
    this.monthlyAccessCard = page.locator('[data-testid="monthly-access-card"]');

    // 快速操作按钮
    this.addEmployeeButton = page.locator('[data-testid="add-employee-button"]');
    this.approveVisitorsButton = page.locator('[data-testid="approve-visitors-button"]');
    this.viewAccessRecordsButton = page.locator('[data-testid="view-access-records-button"]');
    this.managePermissionsButton = page.locator('[data-testid="manage-permissions-button"]');

    // 数据表格
    this.recentVisitorsTable = page.locator('[data-testid="recent-visitors-table"]');
    this.recentAccessTable = page.locator('[data-testid="recent-access-table"]');
    this.pendingApprovalsTable = page.locator('[data-testid="pending-approvals-table"]');

    // 图表区域
    this.visitorTrendChart = page.locator('[data-testid="visitor-trend-chart"]');
    this.accessPatternChart = page.locator('[data-testid="access-pattern-chart"]');
    this.employeeActivityChart = page.locator('[data-testid="employee-activity-chart"]');

    // 导航菜单项
    this.employeeManagementMenu = page.locator('[data-testid="employee-management-menu"], a:has-text("员工管理")');
    this.visitorManagementMenu = page.locator('[data-testid="visitor-management-menu"], a:has-text("访客管理")');
    this.accessRecordsMenu = page.locator('[data-testid="access-records-menu"], a:has-text("通行记录")');
    this.permissionSettingsMenu = page.locator('[data-testid="permission-settings-menu"], a:has-text("权限设置")');

    // 通知和提醒
    this.notificationBell = page.locator('[data-testid="notification-bell"]');
    this.pendingApprovalsAlert = page.locator('[data-testid="pending-approvals-alert"]');
    this.systemAnnouncementAlert = page.locator('[data-testid="system-announcement-alert"]');
  }

  /**
   * 导航到商户管理端仪表板
   */
  async goto(): Promise<void> {
    await this.page.goto('/merchant/dashboard');
    await this.waitForLoad();
  }

  /**
   * 检查页面是否已加载
   */
  async isLoaded(): Promise<boolean> {
    try {
      await this.pageHeader.waitFor({ state: 'visible', timeout: 5000 });
      await this.navigationMenu.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证仪表板已加载
   */
  async expectDashboardLoaded(): Promise<void> {
    await expect(this.pageHeader).toBeVisible();
    await expect(this.navigationMenu).toBeVisible();
    await this.expectPageTitle('商户管理');
  }

  /**
   * 导航到指定菜单项
   */
  async navigateToMenu(menuItem: string): Promise<void> {
    const menuMap: Record<string, Locator> = {
      '员工管理': this.employeeManagementMenu,
      '访客管理': this.visitorManagementMenu,
      '通行记录': this.accessRecordsMenu,
      '权限设置': this.permissionSettingsMenu
    };

    const menu = menuMap[menuItem];
    if (!menu) {
      throw new Error(`未知的菜单项: ${menuItem}`);
    }

    await this.waitAndClick(menu);
    await this.waitForLoad();
  }

  /**
   * 获取统计数据
   */
  async getStatistics(): Promise<{
    totalEmployees: number;
    activeEmployees: number;
    pendingVisitors: number;
    approvedVisitors: number;
    todayAccess: number;
    monthlyAccess: number;
  }> {
    await this.waitForLoadingComplete();

    const totalEmployees = await this.getCardValue(this.totalEmployeesCard);
    const activeEmployees = await this.getCardValue(this.activeEmployeesCard);
    const pendingVisitors = await this.getCardValue(this.pendingVisitorsCard);
    const approvedVisitors = await this.getCardValue(this.approvedVisitorsCard);
    const todayAccess = await this.getCardValue(this.todayAccessCard);
    const monthlyAccess = await this.getCardValue(this.monthlyAccessCard);

    return {
      totalEmployees,
      activeEmployees,
      pendingVisitors,
      approvedVisitors,
      todayAccess,
      monthlyAccess
    };
  }

  /**
   * 验证统计卡片显示
   */
  async expectStatisticsCardsVisible(): Promise<void> {
    await expect(this.totalEmployeesCard).toBeVisible();
    await expect(this.activeEmployeesCard).toBeVisible();
    await expect(this.pendingVisitorsCard).toBeVisible();
    await expect(this.approvedVisitorsCard).toBeVisible();
    await expect(this.todayAccessCard).toBeVisible();
    await expect(this.monthlyAccessCard).toBeVisible();
  }

  /**
   * 验证快速操作按钮
   */
  async expectQuickActionsVisible(): Promise<void> {
    await expect(this.addEmployeeButton).toBeVisible();
    await expect(this.approveVisitorsButton).toBeVisible();
    await expect(this.viewAccessRecordsButton).toBeVisible();
    await expect(this.managePermissionsButton).toBeVisible();
  }

  /**
   * 点击添加员工按钮
   */
  async clickAddEmployee(): Promise<void> {
    await this.waitAndClick(this.addEmployeeButton);
    await this.waitForLoad();
  }

  /**
   * 点击审批访客按钮
   */
  async clickApproveVisitors(): Promise<void> {
    await this.waitAndClick(this.approveVisitorsButton);
    await this.waitForLoad();
  }

  /**
   * 查看通行记录
   */
  async viewAccessRecords(): Promise<void> {
    await this.waitAndClick(this.viewAccessRecordsButton);
    await this.waitForLoad();
  }

  /**
   * 管理权限设置
   */
  async managePermissions(): Promise<void> {
    await this.waitAndClick(this.managePermissionsButton);
    await this.waitForLoad();
  }

  /**
   * 验证最近访客表格
   */
  async expectRecentVisitorsTableVisible(): Promise<void> {
    await expect(this.recentVisitorsTable).toBeVisible();
    
    // 检查表格是否有数据
    const rows = this.recentVisitorsTable.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  }

  /**
   * 验证待审批表格
   */
  async expectPendingApprovalsTableVisible(): Promise<void> {
    await expect(this.pendingApprovalsTable).toBeVisible();
  }

  /**
   * 获取待审批数量
   */
  async getPendingApprovalsCount(): Promise<number> {
    const rows = this.pendingApprovalsTable.locator('tbody tr');
    return await rows.count();
  }

  /**
   * 快速审批访客申请
   */
  async quickApproveVisitor(visitorName: string): Promise<void> {
    const row = this.pendingApprovalsTable.locator(`tr:has-text("${visitorName}")`);
    const approveButton = row.locator('[data-testid="quick-approve-button"]');
    await this.waitAndClick(approveButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('访客申请已批准');
  }

  /**
   * 快速拒绝访客申请
   */
  async quickRejectVisitor(visitorName: string, reason: string): Promise<void> {
    const row = this.pendingApprovalsTable.locator(`tr:has-text("${visitorName}")`);
    const rejectButton = row.locator('[data-testid="quick-reject-button"]');
    await this.waitAndClick(rejectButton);
    
    // 填写拒绝原因
    const reasonInput = this.page.locator('[data-testid="reject-reason"]');
    await reasonInput.fill(reason);
    
    const confirmButton = this.page.locator('[data-testid="confirm-reject"]');
    await this.waitAndClick(confirmButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('访客申请已拒绝');
  }

  /**
   * 验证图表显示
   */
  async expectChartsVisible(): Promise<void> {
    await expect(this.visitorTrendChart).toBeVisible();
    await expect(this.accessPatternChart).toBeVisible();
    await expect(this.employeeActivityChart).toBeVisible();
  }

  /**
   * 检查通知提醒
   */
  async checkNotifications(): Promise<number> {
    const notificationBadge = this.notificationBell.locator('.ant-badge-count');
    
    if (await notificationBadge.isVisible()) {
      const countText = await notificationBadge.textContent();
      return parseInt(countText || '0');
    }
    
    return 0;
  }

  /**
   * 点击通知铃铛
   */
  async clickNotificationBell(): Promise<void> {
    await this.waitAndClick(this.notificationBell);
    
    const notificationDropdown = this.page.locator('[data-testid="notification-dropdown"]');
    await expect(notificationDropdown).toBeVisible();
  }

  /**
   * 验证待审批提醒
   */
  async expectPendingApprovalsAlert(): Promise<void> {
    const pendingCount = await this.getPendingApprovalsCount();
    
    if (pendingCount > 0) {
      await expect(this.pendingApprovalsAlert).toBeVisible();
      await expect(this.pendingApprovalsAlert).toContainText(`${pendingCount}`);
    }
  }

  /**
   * 验证系统公告
   */
  async expectSystemAnnouncementVisible(): Promise<void> {
    if (await this.isElementVisible('[data-testid="system-announcement-alert"]')) {
      await expect(this.systemAnnouncementAlert).toBeVisible();
    }
  }

  /**
   * 刷新仪表板数据
   */
  async refreshDashboard(): Promise<void> {
    const refreshButton = this.page.locator('[data-testid="refresh-button"], .refresh-btn');
    if (await this.isElementVisible('[data-testid="refresh-button"]')) {
      await this.waitAndClick(refreshButton);
      await this.waitForLoadingComplete();
    } else {
      // 如果没有刷新按钮，重新加载页面
      await this.page.reload();
      await this.waitForLoad();
    }
  }

  /**
   * 验证用户信息显示
   */
  async expectUserProfileVisible(): Promise<void> {
    await expect(this.userProfile).toBeVisible();
    
    // 检查用户名显示
    const userName = this.userProfile.locator('[data-testid="user-name"], .user-name');
    await expect(userName).toContainText('商户管理员');
  }

  /**
   * 退出登录
   */
  async logout(): Promise<void> {
    // 点击用户头像或用户菜单
    await this.waitAndClick(this.userProfile);
    
    // 点击退出登录按钮
    await this.waitAndClick(this.logoutButton);
    
    // 等待跳转到登录页面
    await this.expectUrl('/login');
  }

  /**
   * 验证面包屑导航
   */
  async expectBreadcrumb(expectedPath: string[]): Promise<void> {
    await expect(this.breadcrumb).toBeVisible();
    
    for (const pathItem of expectedPath) {
      await expect(this.breadcrumb).toContainText(pathItem);
    }
  }

  /**
   * 验证商户管理员权限
   */
  async expectMerchantAdminAccess(): Promise<void> {
    // 验证商户管理员特有的功能可见
    await expect(this.addEmployeeButton).toBeVisible();
    await expect(this.approveVisitorsButton).toBeVisible();
    
    // 验证菜单项都可访问
    await expect(this.employeeManagementMenu).toBeVisible();
    await expect(this.visitorManagementMenu).toBeVisible();
    await expect(this.accessRecordsMenu).toBeVisible();
    await expect(this.permissionSettingsMenu).toBeVisible();
  }

  /**
   * 验证最近通行记录表格
   */
  async expectRecentAccessTableVisible(): Promise<void> {
    await expect(this.recentAccessTable).toBeVisible();
    
    // 检查表格是否有数据
    const rows = this.recentAccessTable.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  }

  /**
   * 查看最近通行记录详情
   */
  async viewRecentAccessDetails(userName: string): Promise<void> {
    const row = this.recentAccessTable.locator(`tr:has-text("${userName}")`);
    const detailButton = row.locator('[data-testid="detail-button"]');
    await this.waitAndClick(detailButton);
    
    const detailModal = this.page.locator('[data-testid="access-detail-modal"]');
    await expect(detailModal).toBeVisible();
  }

  /**
   * 获取卡片数值
   */
  private async getCardValue(card: Locator): Promise<number> {
    const valueElement = card.locator('[data-testid="card-value"], .card-value, .statistic-value');
    const valueText = await valueElement.textContent();
    return parseInt(valueText?.replace(/[^\d]/g, '') || '0');
  }

  /**
   * 等待数据加载完成
   */
  async waitForDataLoad(): Promise<void> {
    // 等待所有统计卡片加载完成
    await Promise.all([
      this.waitForElement(this.totalEmployeesCard),
      this.waitForElement(this.activeEmployeesCard),
      this.waitForElement(this.pendingVisitorsCard),
      this.waitForElement(this.approvedVisitorsCard),
      this.waitForElement(this.todayAccessCard),
      this.waitForElement(this.monthlyAccessCard)
    ]);

    await this.waitForLoadingComplete();
  }

  /**
   * 验证今日活动摘要
   */
  async expectTodayActivitySummary(): Promise<void> {
    const activitySummary = this.page.locator('[data-testid="today-activity-summary"]');
    if (await this.isElementVisible('[data-testid="today-activity-summary"]')) {
      await expect(activitySummary).toBeVisible();
      
      // 验证包含关键信息
      await expect(activitySummary).toContainText('今日');
      await expect(activitySummary).toContainText('通行');
    }
  }

  /**
   * 验证权限提醒
   */
  async expectPermissionReminders(): Promise<void> {
    const permissionReminder = this.page.locator('[data-testid="permission-reminder"]');
    if (await this.isElementVisible('[data-testid="permission-reminder"]')) {
      await expect(permissionReminder).toBeVisible();
    }
  }
}