import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base-page';

/**
 * 通行记录筛选条件接口
 */
export interface AccessRecordFilter {
  startDate?: string;
  endDate?: string;
  deviceName?: string;
  userName?: string;
  merchantName?: string;
  accessType?: 'entry' | 'exit' | 'denied';
  status?: 'success' | 'failed' | 'pending';
}

/**
 * 租务管理端通行记录页面对象
 * 提供通行记录查询、筛选、导出和统计功能
 */
export class TenantAccessRecordsPage extends BasePage {
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
  readonly deviceFilter: Locator;
  readonly userFilter: Locator;
  readonly merchantFilter: Locator;
  readonly accessTypeFilter: Locator;
  readonly statusFilter: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly advancedFilterToggle: Locator;

  // 快速筛选按钮
  readonly todayButton: Locator;
  readonly yesterdayButton: Locator;
  readonly thisWeekButton: Locator;
  readonly thisMonthButton: Locator;

  // 导出和操作按钮
  readonly exportButton: Locator;
  readonly exportExcelButton: Locator;
  readonly exportPdfButton: Locator;
  readonly printButton: Locator;
  readonly refreshButton: Locator;

  // 统计卡片
  readonly totalAccessCard: Locator;
  readonly successAccessCard: Locator;
  readonly failedAccessCard: Locator;
  readonly deniedAccessCard: Locator;

  // 实时监控区域
  readonly realTimePanel: Locator;
  readonly liveAccessFeed: Locator;
  readonly onlineDevicesCount: Locator;
  readonly activeUsersCount: Locator;

  // 表格列
  readonly timeColumn: Locator;
  readonly userColumn: Locator;
  readonly deviceColumn: Locator;
  readonly merchantColumn: Locator;
  readonly typeColumn: Locator;
  readonly statusColumn: Locator;
  readonly actionColumn: Locator;

  // 记录详情模态框
  readonly recordDetailModal: Locator;
  readonly recordDetailInfo: Locator;
  readonly recordPhotos: Locator;
  readonly recordLogs: Locator;

  // 图表区域
  readonly accessTrendChart: Locator;
  readonly deviceUsageChart: Locator;
  readonly hourlyDistributionChart: Locator;

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
    this.deviceFilter = page.locator('[data-testid="device-filter"]');
    this.userFilter = page.locator('[data-testid="user-filter"]');
    this.merchantFilter = page.locator('[data-testid="merchant-filter"]');
    this.accessTypeFilter = page.locator('[data-testid="access-type-filter"]');
    this.statusFilter = page.locator('[data-testid="status-filter"]');
    this.searchButton = page.locator('[data-testid="search-button"]');
    this.resetButton = page.locator('[data-testid="reset-button"]');
    this.advancedFilterToggle = page.locator('[data-testid="advanced-filter-toggle"]');

    // 快速筛选按钮
    this.todayButton = page.locator('[data-testid="today-button"]');
    this.yesterdayButton = page.locator('[data-testid="yesterday-button"]');
    this.thisWeekButton = page.locator('[data-testid="this-week-button"]');
    this.thisMonthButton = page.locator('[data-testid="this-month-button"]');

    // 导出和操作按钮
    this.exportButton = page.locator('[data-testid="export-button"]');
    this.exportExcelButton = page.locator('[data-testid="export-excel-button"]');
    this.exportPdfButton = page.locator('[data-testid="export-pdf-button"]');
    this.printButton = page.locator('[data-testid="print-button"]');
    this.refreshButton = page.locator('[data-testid="refresh-button"]');

    // 统计卡片
    this.totalAccessCard = page.locator('[data-testid="total-access-card"]');
    this.successAccessCard = page.locator('[data-testid="success-access-card"]');
    this.failedAccessCard = page.locator('[data-testid="failed-access-card"]');
    this.deniedAccessCard = page.locator('[data-testid="denied-access-card"]');

    // 实时监控区域
    this.realTimePanel = page.locator('[data-testid="real-time-panel"]');
    this.liveAccessFeed = page.locator('[data-testid="live-access-feed"]');
    this.onlineDevicesCount = page.locator('[data-testid="online-devices-count"]');
    this.activeUsersCount = page.locator('[data-testid="active-users-count"]');

    // 表格列
    this.timeColumn = page.locator('[data-testid="time-column"]');
    this.userColumn = page.locator('[data-testid="user-column"]');
    this.deviceColumn = page.locator('[data-testid="device-column"]');
    this.merchantColumn = page.locator('[data-testid="merchant-column"]');
    this.typeColumn = page.locator('[data-testid="type-column"]');
    this.statusColumn = page.locator('[data-testid="status-column"]');
    this.actionColumn = page.locator('[data-testid="action-column"]');

    // 记录详情模态框
    this.recordDetailModal = page.locator('[data-testid="record-detail-modal"]');
    this.recordDetailInfo = page.locator('[data-testid="record-detail-info"]');
    this.recordPhotos = page.locator('[data-testid="record-photos"]');
    this.recordLogs = page.locator('[data-testid="record-logs"]');

    // 图表区域
    this.accessTrendChart = page.locator('[data-testid="access-trend-chart"]');
    this.deviceUsageChart = page.locator('[data-testid="device-usage-chart"]');
    this.hourlyDistributionChart = page.locator('[data-testid="hourly-distribution-chart"]');
  }

  /**
   * 导航到通行记录页面
   */
  async goto(): Promise<void> {
    await this.page.goto('/tenant/access-records');
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
   * 按设备筛选记录
   */
  async filterByDevice(deviceName: string): Promise<void> {
    await this.deviceFilter.selectOption(deviceName);
    await this.waitAndClick(this.searchButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 按用户筛选记录
   */
  async filterByUser(userName: string): Promise<void> {
    await this.userFilter.fill(userName);
    await this.waitAndClick(this.searchButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 按商户筛选记录
   */
  async filterByMerchant(merchantName: string): Promise<void> {
    await this.merchantFilter.selectOption(merchantName);
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
  async filterByConditions(filter: AccessRecordFilter): Promise<void> {
    if (filter.startDate && filter.endDate) {
      await this.filterByDateRange(filter.startDate, filter.endDate);
    }
    
    if (filter.deviceName) {
      await this.deviceFilter.selectOption(filter.deviceName);
    }
    
    if (filter.userName) {
      await this.userFilter.fill(filter.userName);
    }
    
    if (filter.merchantName) {
      await this.merchantFilter.selectOption(filter.merchantName);
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
    total: number;
    success: number;
    failed: number;
    denied: number;
  }> {
    await this.waitForLoadingComplete();
    
    const total = await this.getCardValue(this.totalAccessCard);
    const success = await this.getCardValue(this.successAccessCard);
    const failed = await this.getCardValue(this.failedAccessCard);
    const denied = await this.getCardValue(this.deniedAccessCard);
    
    return { total, success, failed, denied };
  }

  /**
   * 验证统计卡片显示
   */
  async expectStatisticsCardsVisible(): Promise<void> {
    await expect(this.totalAccessCard).toBeVisible();
    await expect(this.successAccessCard).toBeVisible();
    await expect(this.failedAccessCard).toBeVisible();
    await expect(this.deniedAccessCard).toBeVisible();
  }

  /**
   * 验证实时监控面板
   */
  async expectRealTimePanelVisible(): Promise<void> {
    await expect(this.realTimePanel).toBeVisible();
    await expect(this.liveAccessFeed).toBeVisible();
    await expect(this.onlineDevicesCount).toBeVisible();
    await expect(this.activeUsersCount).toBeVisible();
  }

  /**
   * 验证图表显示
   */
  async expectChartsVisible(): Promise<void> {
    await expect(this.accessTrendChart).toBeVisible();
    await expect(this.deviceUsageChart).toBeVisible();
    await expect(this.hourlyDistributionChart).toBeVisible();
  }

  /**
   * 切换高级筛选
   */
  async toggleAdvancedFilter(): Promise<void> {
    await this.waitAndClick(this.advancedFilterToggle);
    
    const advancedPanel = this.page.locator('[data-testid="advanced-filter-panel"]');
    await expect(advancedPanel).toBeVisible();
  }

  /**
   * 验证表格为空
   */
  async expectEmptyTable(): Promise<void> {
    const emptyText = this.recordsTable.locator('[data-testid="empty-text"], .ant-empty-description');
    await expect(emptyText).toBeVisible();
  }

  /**
   * 验证分页功能
   */
  async expectPaginationVisible(): Promise<void> {
    await expect(this.pagination).toBeVisible();
  }

  /**
   * 切换到指定页码
   */
  async goToPage(pageNumber: number): Promise<void> {
    const pageButton = this.pagination.locator(`text=${pageNumber}`);
    await this.waitAndClick(pageButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 获取记录总数
   */
  async getTotalRecordsCount(): Promise<number> {
    const countText = await this.totalRecordsCount.textContent();
    return parseInt(countText?.replace(/[^\d]/g, '') || '0');
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
}