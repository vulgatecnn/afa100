import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base-page';

/**
 * 租务管理端仪表板页面对象
 * 提供租务管理员的主要功能入口和概览信息
 */
export class TenantDashboardPage extends BasePage {
  // 页面主要区域
  readonly pageHeader: Locator;
  readonly navigationMenu: Locator;
  readonly userProfile: Locator;
  readonly logoutButton: Locator;
  readonly breadcrumb: Locator;

  // 统计卡片
  readonly totalMerchantsCard: Locator;
  readonly activeMerchantsCard: Locator;
  readonly totalDevicesCard: Locator;
  readonly onlineDevicesCard: Locator;
  readonly todayAccessCard: Locator;
  readonly monthlyAccessCard: Locator;

  // 快速操作按钮
  readonly addMerchantButton: Locator;
  readonly addDeviceButton: Locator;
  readonly viewReportsButton: Locator;
  readonly systemSettingsButton: Locator;

  // 数据表格和图表
  readonly recentAccessTable: Locator;
  readonly accessTrendChart: Locator;
  readonly deviceStatusChart: Locator;
  readonly merchantStatusChart: Locator;

  // 导航菜单项
  readonly merchantManagementMenu: Locator;
  readonly deviceManagementMenu: Locator;
  readonly accessRecordsMenu: Locator;
  readonly systemSettingsMenu: Locator;
  readonly reportsMenu: Locator;

  constructor(page: Page) {
    super(page);

    // 页面主要区域
    this.pageHeader = page.locator('[data-testid="page-header"], .page-header');
    this.navigationMenu = page.locator('[data-testid="navigation-menu"], .ant-menu');
    this.userProfile = page.locator('[data-testid="user-profile"], .user-profile');
    this.logoutButton = page.locator('[data-testid="logout-button"], .logout-btn');
    this.breadcrumb = page.locator('[data-testid="breadcrumb"], .ant-breadcrumb');

    // 统计卡片
    this.totalMerchantsCard = page.locator('[data-testid="total-merchants-card"]');
    this.activeMerchantsCard = page.locator('[data-testid="active-merchants-card"]');
    this.totalDevicesCard = page.locator('[data-testid="total-devices-card"]');
    this.onlineDevicesCard = page.locator('[data-testid="online-devices-card"]');
    this.todayAccessCard = page.locator('[data-testid="today-access-card"]');
    this.monthlyAccessCard = page.locator('[data-testid="monthly-access-card"]');

    // 快速操作按钮
    this.addMerchantButton = page.locator('[data-testid="add-merchant-button"]');
    this.addDeviceButton = page.locator('[data-testid="add-device-button"]');
    this.viewReportsButton = page.locator('[data-testid="view-reports-button"]');
    this.systemSettingsButton = page.locator('[data-testid="system-settings-button"]');

    // 数据表格和图表
    this.recentAccessTable = page.locator('[data-testid="recent-access-table"]');
    this.accessTrendChart = page.locator('[data-testid="access-trend-chart"]');
    this.deviceStatusChart = page.locator('[data-testid="device-status-chart"]');
    this.merchantStatusChart = page.locator('[data-testid="merchant-status-chart"]');

    // 导航菜单项
    this.merchantManagementMenu = page.locator('[data-testid="merchant-management-menu"], a:has-text("商户管理")');
    this.deviceManagementMenu = page.locator('[data-testid="device-management-menu"], a:has-text("设备管理")');
    this.accessRecordsMenu = page.locator('[data-testid="access-records-menu"], a:has-text("通行记录")');
    this.systemSettingsMenu = page.locator('[data-testid="system-settings-menu"], a:has-text("系统设置")');
    this.reportsMenu = page.locator('[data-testid="reports-menu"], a:has-text("报表统计")');
  }

  /**
   * 导航到租务管理端仪表板
   */
  async goto(): Promise<void> {
    await this.page.goto('/tenant/dashboard');
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
    await this.expectPageTitle('租务管理');
  }

  /**
   * 导航到指定菜单项
   */
  async navigateToMenu(menuItem: string): Promise<void> {
    const menuMap: Record<string, Locator> = {
      '商户管理': this.merchantManagementMenu,
      '设备管理': this.deviceManagementMenu,
      '通行记录': this.accessRecordsMenu,
      '系统设置': this.systemSettingsMenu,
      '报表统计': this.reportsMenu
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
    totalMerchants: number;
    activeMerchants: number;
    totalDevices: number;
    onlineDevices: number;
    todayAccess: number;
    monthlyAccess: number;
  }> {
    await this.waitForLoadingComplete();

    const totalMerchants = await this.getCardValue(this.totalMerchantsCard);
    const activeMerchants = await this.getCardValue(this.activeMerchantsCard);
    const totalDevices = await this.getCardValue(this.totalDevicesCard);
    const onlineDevices = await this.getCardValue(this.onlineDevicesCard);
    const todayAccess = await this.getCardValue(this.todayAccessCard);
    const monthlyAccess = await this.getCardValue(this.monthlyAccessCard);

    return {
      totalMerchants,
      activeMerchants,
      totalDevices,
      onlineDevices,
      todayAccess,
      monthlyAccess
    };
  }

  /**
   * 验证统计卡片显示
   */
  async expectStatisticsCardsVisible(): Promise<void> {
    await expect(this.totalMerchantsCard).toBeVisible();
    await expect(this.activeMerchantsCard).toBeVisible();
    await expect(this.totalDevicesCard).toBeVisible();
    await expect(this.onlineDevicesCard).toBeVisible();
    await expect(this.todayAccessCard).toBeVisible();
    await expect(this.monthlyAccessCard).toBeVisible();
  }

  /**
   * 验证快速操作按钮
   */
  async expectQuickActionsVisible(): Promise<void> {
    await expect(this.addMerchantButton).toBeVisible();
    await expect(this.addDeviceButton).toBeVisible();
    await expect(this.viewReportsButton).toBeVisible();
    await expect(this.systemSettingsButton).toBeVisible();
  }

  /**
   * 点击添加商户按钮
   */
  async clickAddMerchant(): Promise<void> {
    await this.waitAndClick(this.addMerchantButton);
    await this.waitForLoad();
  }

  /**
   * 点击添加设备按钮
   */
  async clickAddDevice(): Promise<void> {
    await this.waitAndClick(this.addDeviceButton);
    await this.waitForLoad();
  }

  /**
   * 查看报表
   */
  async viewReports(): Promise<void> {
    await this.waitAndClick(this.viewReportsButton);
    await this.waitForLoad();
  }

  /**
   * 打开系统设置
   */
  async openSystemSettings(): Promise<void> {
    await this.waitAndClick(this.systemSettingsButton);
    await this.waitForLoad();
  }

  /**
   * 验证最近通行记录表格
   */
  async expectRecentAccessTableVisible(): Promise<void> {
    await expect(this.recentAccessTable).toBeVisible();
    
    // 检查表格是否有数据
    const rows = this.recentAccessTable.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  }

  /**
   * 验证图表显示
   */
  async expectChartsVisible(): Promise<void> {
    await expect(this.accessTrendChart).toBeVisible();
    await expect(this.deviceStatusChart).toBeVisible();
    await expect(this.merchantStatusChart).toBeVisible();
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
    await expect(userName).toContainText('租务管理员');
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
      this.waitForElement(this.totalMerchantsCard),
      this.waitForElement(this.activeMerchantsCard),
      this.waitForElement(this.totalDevicesCard),
      this.waitForElement(this.onlineDevicesCard),
      this.waitForElement(this.todayAccessCard),
      this.waitForElement(this.monthlyAccessCard)
    ]);

    await this.waitForLoadingComplete();
  }

  /**
   * 验证权限访问
   */
  async expectTenantAdminAccess(): Promise<void> {
    // 验证租务管理员特有的功能可见
    await expect(this.addMerchantButton).toBeVisible();
    await expect(this.systemSettingsButton).toBeVisible();
    
    // 验证所有菜单项都可访问
    await expect(this.merchantManagementMenu).toBeVisible();
    await expect(this.deviceManagementMenu).toBeVisible();
    await expect(this.accessRecordsMenu).toBeVisible();
    await expect(this.systemSettingsMenu).toBeVisible();
    await expect(this.reportsMenu).toBeVisible();
  }
}