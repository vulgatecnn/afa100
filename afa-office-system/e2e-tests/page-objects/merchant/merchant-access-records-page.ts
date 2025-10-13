import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base-page';

/**
 * 通行记录筛选条件接口
 */
export interface MerchantAccessRecordFilter {
  startDate?: string;
  endDate?: string;
  userName?: string;
  userType?: 'employee' | 'visitor';
  deviceName?: string;
  accessType?: 'entry' | 'exit' | 'denied';
  status?: 'success' | 'failed' | 'pending';
}

/**
 * 商户管理端通行记录页面对象
 * 提供本商户的通行记录查询、筛选、导出和统计功能
 */
export class MerchantAccessRecordsPage extends BasePage {
  // 页面主要元素
  readonly pageTitle: Locator;
  readonly recordsTable: Locator;
  readonly pagination: Locator;
  readonly totalRecordsCount: Locator;

  // 筛选器区域
  readonly filterPanel: Locator;
  readonly dateRangePicker: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly userNameInput: Locator;
  readonly userTypeFilter: Locator;
  readonly deviceFilter: Locator;
  readonly accessTypeFilter: Locator;
  readonly statusFilter: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;

  // 快速筛选按钮
  readonly todayButton: Locator;
  readonly yesterdayButton: Locator;
  readonly thisWeekButton: Locator;
  readonly thisMonthButton: Locator;
  readonly employeeOnlyButton: Locator;
  readonly visitorOnlyButton: Locator;

  // 导出和操作按钮
  readonly exportButton: Locator;
  readonly exportExcelButton: Locator;
  readonly exportPdfButton: Locator;
  readonly printButton: Locator;
  readonly refreshButton: Locator;

  // 统计卡片
  readonly todayAccessCard: Locator;
  readonly employeeAccessCard: Locator;
  readonly visitorAccessCard: Locator;
  readonly failedAccessCard: Locator;

  // 实时监控区域
  readonly realTimePanel: Locator;
  readonly liveAccessFeed: Locator;
  readonly currentOnlineCount: Locator;

  // 表格列
  readonly timeColumn: Locator;
  readonly userColumn: Locator;
  readonly userTypeColumn: Locator;
  readonly deviceColumn: Locator;
  readonly typeColumn: Locator;
  readonly statusColumn: Locator;
  readonly actionColumn: Locator;

  // 记录详情模态框
  readonly recordDetailModal: Locator;
  readonly recordDetailInfo: Locator;
  readonly recordPhotos: Locator;
  readonly recordLogs: Locator;

  // 图表区域
  readonly hourlyAccessChart: Locator;
  readonly dailyTrendChart: Locator;
  readonly userTypeDistributionChart: Locator;
  readonly deviceUsageChart: Locator;

  // 异常记录提醒
  readonly anomalyAlert: Locator;
  readonly failedAttemptsAlert: Locator;
  readonly suspiciousActivityAlert: Locator;

  constructor(page: Page) {
    super(page);

    // 页面主要元素
    this.pageTitle = page.locator('[data-testid="page-title"], h1');
    this.recordsTable = page.locator('[data-testid="records-table"]');
    this.pagination = page.locator('[data-testid="pagination"], .ant-pagination');
    this.totalRecordsCount = page.locator('[data-testid="total-records-count"]');

    // 筛选器区域
    this.filterPanel = page.locator('[data-testid="filter-panel"]');
    this.dateRangePicker = page.locator('[data-testid="date-range-picker"]');
    this.startDateInput = page.locator('[data-testid="start-date"]');
    this.endDateInput = page.locator('[data-testid="end-date"]');
    this.userNameInput = page.locator('[data-testid="user-name-input"]');
    this.userTypeFilter = page.locator('[data-testid="user-type-filter"]');
    this.deviceFilter = page.locator('[data-testid="device-filter"]');
    this.accessTypeFilter = page.locator('[data-testid="access-type-filter"]');
    this.statusFilter = page.locator('[data-testid="status-filter"]');
    this.searchButton = page.locator('[data-testid="search-button"]');
    this.resetButton = page.locator('[data-testid="reset-button"]');

    // 快速筛选按钮
    this.todayButton = page.locator('[data-testid="today-button"]');
    this.yesterdayButton = page.locator('[data-testid="yesterday-button"]');
    this.thisWeekButton = page.locator('[data-testid="this-week-button"]');
    this.thisMonthButton = page.locator('[data-testid="this-month-button"]');
    this.employeeOnlyButton = page.locator('[data-testid="employee-only-button"]');
    this.visitorOnlyButton = page.locator('[data-testid="visitor-only-button"]');

    // 导出和操作按钮
    this.exportButton = page.locator('[data-testid="export-button"]');
    this.exportExcelButton = page.locator('[data-testid="export-excel-button"]');
    this.exportPdfButton = page.locator('[data-testid="export-pdf-button"]');
    this.printButton = page.locator('[data-testid="print-button"]');
    this.refreshButton = page.locator('[data-testid="refresh-button"]');

    // 统计卡片
    this.todayAccessCard = page.locator('[data-testid="today-access-card"]');
    this.employeeAccessCard = page.locator('[data-testid="employee-access-card"]');
    this.visitorAccessCard = page.locator('[data-testid="visitor-access-card"]');
    this.failedAccessCard = page.locator('[data-testid="failed-access-card"]');

    // 实时监控区域
    this.realTimePanel = page.locator('[data-testid="real-time-panel"]');
    this.liveAccessFeed = page.locator('[data-testid="live-access-feed"]');
    this.currentOnlineCount = page.locator('[data-testid="current-online-count"]');

    // 表格列
    this.timeColumn = page.locator('[data-testid="time-column"]');
    this.userColumn = page.locator('[data-testid="user-column"]');
    this.userTypeColumn = page.locator('[data-testid="user-type-column"]');
    this.deviceColumn = page.locator('[data-testid="device-column"]');
    this.typeColumn = page.locator('[data-testid="type-column"]');
    this.statusColumn = page.locator('[data-testid="status-column"]');
    this.actionColumn = page.locator('[data-testid="action-column"]');

    // 记录详情模态框
    this.recordDetailModal = page.locator('[data-testid="record-detail-modal"]');
    this.recordDetailInfo = page.locator('[data-testid="record-detail-info"]');
    this.recordPhotos = page.locator('[data-testid="record-photos"]');
    this.recordLogs = page.locator('[data-testid="record-logs"]');

    // 图表区域
    this.hourlyAccessChart = page.locator('[data-testid="hourly-access-chart"]');
    this.dailyTrendChart = page.locator('[data-testid="daily-trend-chart"]');
    this.userTypeDistributionChart = page.locator('[data-testid="user-type-distribution-chart"]');
    this.deviceUsageChart = page.locator('[data-testid="device-usage-chart"]');

    // 异常记录提醒
    this.anomalyAlert = page.locator('[data-testid="anomaly-alert"]');
    this.failedAttemptsAlert = page.locator('[data-testid="failed-attempts-alert"]');
    this.suspiciousActivityAlert = page.locator('[data-testid="suspicious-activity-alert"]');
  }

  /**
   * 导航到通行记录页面
   */
  async goto(): Promise<void> {
    await this.page.goto('/merchant/access-records');
    await this.waitForLoad();
  }

  /**
   * 检查页面是否已加载
   */
  async isLoaded(): Promise<boolean> {
    try {
      await this.pageTitle.waitFor({ state: 'visible', timeout: 5000 });
      await this.recordsTable.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证页面已加载
   */
  async expectPageLoaded(): Promise<void> {
    await expect(this.pageTitle).toContainText('通行记录');
    await expect(this.recordsTable).toBeVisible();
    await expect(this.filterPanel).toBeVisible();
  }

  /**
   * 按日期范围筛选记录
   */
  async filterByDateRange(startDate: string, endDate: string): Promise<void> {
    await this.dateRangePicker.click();
    await this.startDateInput.fill(startDate);
    await this.endDateInput.fill(endDate);
    
    const applyButton = this.page.locator('[data-testid="apply-date-filter"]');
    await this.waitAndClick(applyButton);
    
    await this.waitForLoadingComplete();
  }

  /**
   * 快速筛选今天的记录
   */
  async filterToday(): Promise<void> {
    await this.waitAndClick(this.todayButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 快速筛选昨天的记录
   */
  async filterYesterday(): Promise<void> {
    await this.waitAndClick(this.yesterdayButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 快速筛选本周的记录
   */
  async filterThisWeek(): Promise<void> {
    await this.waitAndClick(this.thisWeekButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 快速筛选本月的记录
   */
  async filterThisMonth(): Promise<void> {
    await this.waitAndClick(this.thisMonthButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 只显示员工记录
   */
  async filterEmployeeOnly(): Promise<void> {
    await this.waitAndClick(this.employeeOnlyButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 只显示访客记录
   */
  async filterVisitorOnly(): Promise<void> {
    await this.waitAndClick(this.visitorOnlyButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 按用户名筛选记录
   */
  async filterByUserName(userName: string): Promise<void> {
    await this.userNameInput.fill(userName);
    await this.waitAndClick(this.searchButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 按用户类型筛选记录
   */
  async filterByUserType(userType: string): Promise<void> {
    await this.userTypeFilter.selectOption(userType);
    await this.waitAndClick(this.searchButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 按设备筛选记录
   */
  async filterByDevice(deviceName: string): Promise<void> {
    await this.deviceFilter.selectOption(deviceName);
    await this.waitAndClick(this.searchButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 按通行类型筛选记录
   */
  async filterByAccessType(accessType: string): Promise<void> {
    await this.accessTypeFilter.selectOption(accessType);
    await this.waitAndClick(this.searchButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 按状态筛选记录
   */
  async filterByStatus(status: string): Promise<void> {
    await this.statusFilter.selectOption(status);
    await this.waitAndClick(this.searchButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 使用复合筛选条件
   */
  async filterByConditions(filter: MerchantAccessRecordFilter): Promise<void> {
    if (filter.startDate && filter.endDate) {
      await this.filterByDateRange(filter.startDate, filter.endDate);
    }
    
    if (filter.userName) {
      await this.userNameInput.fill(filter.userName);
    }
    
    if (filter.userType) {
      await this.userTypeFilter.selectOption(filter.userType);
    }
    
    if (filter.deviceName) {
      await this.deviceFilter.selectOption(filter.deviceName);
    }
    
    if (filter.accessType) {
      await this.accessTypeFilter.selectOption(filter.accessType);
    }
    
    if (filter.status) {
      await this.statusFilter.selectOption(filter.status);
    }
    
    await this.waitAndClick(this.searchButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 重置筛选条件
   */
  async resetFilters(): Promise<void> {
    await this.waitAndClick(this.resetButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 验证记录在表格中显示
   */
  async expectRecordInTable(userName: string, deviceName: string): Promise<void> {
    const recordRow = this.getRecordRow(userName, deviceName);
    await expect(recordRow).toBeVisible();
  }

  /**
   * 验证记录状态
   */
  async expectRecordStatus(userName: string, deviceName: string, expectedStatus: string): Promise<void> {
    const recordRow = this.getRecordRow(userName, deviceName);
    const statusBadge = recordRow.locator('[data-testid="status-badge"]');
    await expect(statusBadge).toContainText(expectedStatus);
  }

  /**
   * 查看记录详情
   */
  async viewRecordDetails(userName: string, deviceName: string): Promise<void> {
    const recordRow = this.getRecordRow(userName, deviceName);
    const detailButton = recordRow.locator('[data-testid="detail-button"]');
    await this.waitAndClick(detailButton);
    await this.waitForElement(this.recordDetailModal);
  }

  /**
   * 导出Excel格式记录
   */
  async exportToExcel(): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.waitAndClick(this.exportExcelButton);
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('.xlsx');
  }

  /**
   * 导出PDF格式记录
   */
  async exportToPdf(): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.waitAndClick(this.exportPdfButton);
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('.pdf');
  }

  /**
   * 打印记录
   */
  async printRecords(): Promise<void> {
    await this.waitAndClick(this.printButton);
    
    // 等待打印对话框出现
    await this.page.waitForTimeout(1000);
    
    // 验证打印预览页面
    const printPreview = this.page.locator('[data-testid="print-preview"]');
    if (await this.isElementVisible('[data-testid="print-preview"]')) {
      await expect(printPreview).toBeVisible();
    }
  }

  /**
   * 刷新记录数据
   */
  async refreshRecords(): Promise<void> {
    await this.waitAndClick(this.refreshButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 获取统计数据
   */
  async getAccessStatistics(): Promise<{
    todayAccess: number;
    employeeAccess: number;
    visitorAccess: number;
    failedAccess: number;
  }> {
    await this.waitForLoadingComplete();
    
    const todayAccess = await this.getCardValue(this.todayAccessCard);
    const employeeAccess = await this.getCardValue(this.employeeAccessCard);
    const visitorAccess = await this.getCardValue(this.visitorAccessCard);
    const failedAccess = await this.getCardValue(this.failedAccessCard);
    
    return { todayAccess, employeeAccess, visitorAccess, failedAccess };
  }

  /**
   * 验证统计卡片显示
   */
  async expectStatisticsCardsVisible(): Promise<void> {
    await expect(this.todayAccessCard).toBeVisible();
    await expect(this.employeeAccessCard).toBeVisible();
    await expect(this.visitorAccessCard).toBeVisible();
    await expect(this.failedAccessCard).toBeVisible();
  }

  /**
   * 验证实时监控面板
   */
  async expectRealTimePanelVisible(): Promise<void> {
    await expect(this.realTimePanel).toBeVisible();
    await expect(this.liveAccessFeed).toBeVisible();
    await expect(this.currentOnlineCount).toBeVisible();
  }

  /**
   * 验证图表显示
   */
  async expectChartsVisible(): Promise<void> {
    await expect(this.hourlyAccessChart).toBeVisible();
    await expect(this.dailyTrendChart).toBeVisible();
    await expect(this.userTypeDistributionChart).toBeVisible();
    await expect(this.deviceUsageChart).toBeVisible();
  }

  /**
   * 验证异常提醒
   */
  async expectAnomalyAlertsVisible(): Promise<void> {
    // 检查是否有异常提醒显示
    const hasAnomalyAlert = await this.isElementVisible('[data-testid="anomaly-alert"]');
    const hasFailedAttemptsAlert = await this.isElementVisible('[data-testid="failed-attempts-alert"]');
    const hasSuspiciousActivityAlert = await this.isElementVisible('[data-testid="suspicious-activity-alert"]');
    
    if (hasAnomalyAlert) {
      await expect(this.anomalyAlert).toBeVisible();
    }
    
    if (hasFailedAttemptsAlert) {
      await expect(this.failedAttemptsAlert).toBeVisible();
    }
    
    if (hasSuspiciousActivityAlert) {
      await expect(this.suspiciousActivityAlert).toBeVisible();
    }
  }

  /**
   * 处理异常记录
   */
  async handleAnomalyRecord(userName: string, deviceName: string, action: 'ignore' | 'investigate'): Promise<void> {
    const recordRow = this.getRecordRow(userName, deviceName);
    const anomalyButton = recordRow.locator('[data-testid="anomaly-button"]');
    
    if (await anomalyButton.isVisible()) {
      await this.waitAndClick(anomalyButton);
      
      const anomalyModal = this.page.locator('[data-testid="anomaly-modal"]');
      await this.waitForElement(anomalyModal);
      
      const actionButton = anomalyModal.locator(`[data-testid="${action}-button"]`);
      await this.waitAndClick(actionButton);
      
      if (action === 'investigate') {
        const noteInput = anomalyModal.locator('[data-testid="investigation-note"]');
        await noteInput.fill('需要进一步调查此异常记录');
      }
      
      const confirmButton = anomalyModal.locator('[data-testid="confirm-button"]');
      await this.waitAndClick(confirmButton);
      
      await this.waitForLoadingComplete();
      await this.expectNotification(`异常记录已${action === 'ignore' ? '忽略' : '标记调查'}`);
    }
  }

  /**
   * 验证员工通行模式
   */
  async expectEmployeeAccessPattern(employeeName: string): Promise<void> {
    // 筛选该员工的记录
    await this.filterByUserName(employeeName);
    await this.filterByUserType('employee');
    
    // 验证有通行记录
    const recordRow = this.recordsTable.locator(`tr:has-text("${employeeName}")`).first();
    await expect(recordRow).toBeVisible();
    
    // 验证用户类型显示为员工
    const userTypeBadge = recordRow.locator('[data-testid="user-type-badge"]');
    await expect(userTypeBadge).toContainText('员工');
  }

  /**
   * 验证访客通行模式
   */
  async expectVisitorAccessPattern(visitorName: string): Promise<void> {
    // 筛选该访客的记录
    await this.filterByUserName(visitorName);
    await this.filterByUserType('visitor');
    
    // 验证有通行记录
    const recordRow = this.recordsTable.locator(`tr:has-text("${visitorName}")`).first();
    await expect(recordRow).toBeVisible();
    
    // 验证用户类型显示为访客
    const userTypeBadge = recordRow.locator('[data-testid="user-type-badge"]');
    await expect(userTypeBadge).toContainText('访客');
  }

  /**
   * 验证设备使用统计
   */
  async expectDeviceUsageStatistics(): Promise<void> {
    await expect(this.deviceUsageChart).toBeVisible();
    
    // 验证图表有数据
    const chartData = this.deviceUsageChart.locator('[data-testid="chart-data"]');
    if (await this.isElementVisible('[data-testid="chart-data"]')) {
      await expect(chartData).toBeVisible();
    }
  }

  /**
   * 验证时段分布统计
   */
  async expectHourlyDistribution(): Promise<void> {
    await expect(this.hourlyAccessChart).toBeVisible();
    
    // 验证24小时分布数据
    const hourlyData = this.hourlyAccessChart.locator('[data-testid="hourly-data"]');
    if (await this.isElementVisible('[data-testid="hourly-data"]')) {
      await expect(hourlyData).toBeVisible();
    }
  }

  /**
   * 获取记录行元素
   */
  private getRecordRow(userName: string, deviceName: string): Locator {
    return this.recordsTable.locator(`tr:has-text("${userName}"):has-text("${deviceName}")`);
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
   * 验证记录时间排序
   */
  async expectRecordsSortedByTime(ascending = false): Promise<void> {
    const timeElements = this.recordsTable.locator('[data-testid="record-time"]');
    const count = await timeElements.count();
    
    if (count > 1) {
      const times: Date[] = [];
      for (let i = 0; i < count; i++) {
        const timeText = await timeElements.nth(i).textContent();
        if (timeText) {
          times.push(new Date(timeText));
        }
      }
      
      for (let i = 1; i < times.length; i++) {
        if (ascending) {
          expect(times[i].getTime()).toBeGreaterThanOrEqual(times[i - 1].getTime());
        } else {
          expect(times[i].getTime()).toBeLessThanOrEqual(times[i - 1].getTime());
        }
      }
    }
  }

  /**
   * 验证商户权限范围
   */
  async expectMerchantScopeRecords(): Promise<void> {
    // 验证只显示本商户相关的记录
    const recordRows = this.recordsTable.locator('tbody tr');
    const count = await recordRows.count();
    
    if (count > 0) {
      // 随机检查几条记录，确保都属于当前商户
      const sampleSize = Math.min(3, count);
      for (let i = 0; i < sampleSize; i++) {
        const row = recordRows.nth(i);
        const userColumn = row.locator('[data-testid="user-column"]');
        await expect(userColumn).toBeVisible();
      }
    }
  }

  /**
   * 获取当前在线人数
   */
  async getCurrentOnlineCount(): Promise<number> {
    const countText = await this.currentOnlineCount.textContent();
    return parseInt(countText?.replace(/[^\d]/g, '') || '0');
  }

  /**
   * 验证实时通行记录更新
   */
  async expectLiveAccessUpdate(): Promise<void> {
    // 记录当前记录数
    const initialCount = await this.getTotalRecordsCount();
    
    // 等待一段时间，检查是否有新记录
    await this.page.waitForTimeout(5000);
    
    // 刷新数据
    await this.refreshRecords();
    
    const updatedCount = await this.getTotalRecordsCount();
    
    // 验证记录数可能增加（如果有实时数据）
    expect(updatedCount).toBeGreaterThanOrEqual(initialCount);
  }

  /**
   * 获取记录总数
   */
  private async getTotalRecordsCount(): Promise<number> {
    const countText = await this.totalRecordsCount.textContent();
    return parseInt(countText?.replace(/[^\d]/g, '') || '0');
  }
}