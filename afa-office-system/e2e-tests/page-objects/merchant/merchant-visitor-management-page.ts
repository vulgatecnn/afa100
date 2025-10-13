import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base-page';

/**
 * 访客数据接口
 */
export interface VisitorData {
  name: string;
  phone: string;
  company: string;
  purpose: string;
  visitDate: string;
  visitTime?: string;
  contactEmployee?: string;
  idNumber?: string;
  vehiclePlate?: string;
  expectedDuration?: number;
}

/**
 * 通行码配置接口
 */
export interface AccessCodeConfig {
  usageLimit: number;
  validHours: number;
  accessDevices?: string[];
  timeRestrictions?: {
    startTime: string;
    endTime: string;
  };
}

/**
 * 商户管理端访客管理页面对象（扩展版本）
 * 提供访客申请审批、通行码管理和访客记录查询功能
 */
export class MerchantVisitorManagementPage extends BasePage {
  // 页面主要元素
  readonly pageTitle: Locator;
  readonly visitorTable: Locator;
  readonly pagination: Locator;
  readonly totalVisitorsCount: Locator;

  // 状态标签页
  readonly allVisitorsTab: Locator;
  readonly pendingTab: Locator;
  readonly approvedTab: Locator;
  readonly rejectedTab: Locator;
  readonly expiredTab: Locator;

  // 筛选器
  readonly filterPanel: Locator;
  readonly dateRangeFilter: Locator;
  readonly statusFilter: Locator;
  readonly companyFilter: Locator;
  readonly employeeFilter: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;

  // 批量操作
  readonly selectAllCheckbox: Locator;
  readonly batchActionButton: Locator;
  readonly batchApproveButton: Locator;
  readonly batchRejectButton: Locator;
  readonly batchExportButton: Locator;

  // 快速操作按钮
  readonly quickApproveAllButton: Locator;
  readonly exportTodayButton: Locator;
  readonly refreshButton: Locator;

  // 访客审批模态框
  readonly approvalModal: Locator;
  readonly visitorInfo: Locator;
  readonly accessCodeConfig: Locator;
  readonly usageLimitInput: Locator;
  readonly validHoursInput: Locator;
  readonly deviceSelectionList: Locator;
  readonly timeRestrictionPanel: Locator;
  readonly startTimeInput: Locator;
  readonly endTimeInput: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;

  // 拒绝原因模态框
  readonly rejectModal: Locator;
  readonly rejectReasonSelect: Locator;
  readonly customReasonInput: Locator;
  readonly confirmRejectButton: Locator;

  // 访客详情模态框
  readonly visitorDetailModal: Locator;
  readonly visitorDetailInfo: Locator;
  readonly accessCodeInfo: Locator;
  readonly qrCodeDisplay: Locator;
  readonly accessHistory: Locator;

  // 通行码管理
  readonly accessCodeModal: Locator;
  readonly regenerateCodeButton: Locator;
  readonly extendValidityButton: Locator;
  readonly revokeCodeButton: Locator;
  readonly sendCodeButton: Locator;

  // 统计卡片
  readonly todayVisitorsCard: Locator;
  readonly pendingApprovalsCard: Locator;
  readonly activeCodesCard: Locator;
  readonly expiredCodesCard: Locator;

  constructor(page: Page) {
    super(page);

    // 页面主要元素
    this.pageTitle = page.locator('[data-testid="page-title"], h1');
    this.visitorTable = page.locator('[data-testid="visitor-table"]');
    this.pagination = page.locator('[data-testid="pagination"], .ant-pagination');
    this.totalVisitorsCount = page.locator('[data-testid="total-visitors-count"]');

    // 状态标签页
    this.allVisitorsTab = page.locator('[data-testid="all-visitors-tab"]');
    this.pendingTab = page.locator('[data-testid="pending-tab"]');
    this.approvedTab = page.locator('[data-testid="approved-tab"]');
    this.rejectedTab = page.locator('[data-testid="rejected-tab"]');
    this.expiredTab = page.locator('[data-testid="expired-tab"]');

    // 筛选器
    this.filterPanel = page.locator('[data-testid="filter-panel"]');
    this.dateRangeFilter = page.locator('[data-testid="date-range-filter"]');
    this.statusFilter = page.locator('[data-testid="status-filter"]');
    this.companyFilter = page.locator('[data-testid="company-filter"]');
    this.employeeFilter = page.locator('[data-testid="employee-filter"]');
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.searchButton = page.locator('[data-testid="search-button"]');
    this.resetButton = page.locator('[data-testid="reset-button"]');

    // 批量操作
    this.selectAllCheckbox = page.locator('[data-testid="select-all-checkbox"]');
    this.batchActionButton = page.locator('[data-testid="batch-action-button"]');
    this.batchApproveButton = page.locator('[data-testid="batch-approve-button"]');
    this.batchRejectButton = page.locator('[data-testid="batch-reject-button"]');
    this.batchExportButton = page.locator('[data-testid="batch-export-button"]');

    // 快速操作按钮
    this.quickApproveAllButton = page.locator('[data-testid="quick-approve-all-button"]');
    this.exportTodayButton = page.locator('[data-testid="export-today-button"]');
    this.refreshButton = page.locator('[data-testid="refresh-button"]');

    // 访客审批模态框
    this.approvalModal = page.locator('[data-testid="approval-modal"]');
    this.visitorInfo = page.locator('[data-testid="visitor-info"]');
    this.accessCodeConfig = page.locator('[data-testid="access-code-config"]');
    this.usageLimitInput = page.locator('[data-testid="usage-limit"]');
    this.validHoursInput = page.locator('[data-testid="valid-hours"]');
    this.deviceSelectionList = page.locator('[data-testid="device-selection-list"]');
    this.timeRestrictionPanel = page.locator('[data-testid="time-restriction-panel"]');
    this.startTimeInput = page.locator('[data-testid="start-time"]');
    this.endTimeInput = page.locator('[data-testid="end-time"]');
    this.approveButton = page.locator('[data-testid="approve-button"]');
    this.rejectButton = page.locator('[data-testid="reject-button"]');

    // 拒绝原因模态框
    this.rejectModal = page.locator('[data-testid="reject-modal"]');
    this.rejectReasonSelect = page.locator('[data-testid="reject-reason-select"]');
    this.customReasonInput = page.locator('[data-testid="custom-reason-input"]');
    this.confirmRejectButton = page.locator('[data-testid="confirm-reject-button"]');

    // 访客详情模态框
    this.visitorDetailModal = page.locator('[data-testid="visitor-detail-modal"]');
    this.visitorDetailInfo = page.locator('[data-testid="visitor-detail-info"]');
    this.accessCodeInfo = page.locator('[data-testid="access-code-info"]');
    this.qrCodeDisplay = page.locator('[data-testid="qr-code-display"]');
    this.accessHistory = page.locator('[data-testid="access-history"]');

    // 通行码管理
    this.accessCodeModal = page.locator('[data-testid="access-code-modal"]');
    this.regenerateCodeButton = page.locator('[data-testid="regenerate-code-button"]');
    this.extendValidityButton = page.locator('[data-testid="extend-validity-button"]');
    this.revokeCodeButton = page.locator('[data-testid="revoke-code-button"]');
    this.sendCodeButton = page.locator('[data-testid="send-code-button"]');

    // 统计卡片
    this.todayVisitorsCard = page.locator('[data-testid="today-visitors-card"]');
    this.pendingApprovalsCard = page.locator('[data-testid="pending-approvals-card"]');
    this.activeCodesCard = page.locator('[data-testid="active-codes-card"]');
    this.expiredCodesCard = page.locator('[data-testid="expired-codes-card"]');
  }

  /**
   * 导航到访客管理页面
   */
  async goto(): Promise<void> {
    await this.page.goto('/merchant/visitors');
    await this.waitForLoad();
  }

  /**
   * 检查页面是否已加载
   */
  async isLoaded(): Promise<boolean> {
    try {
      await this.pageTitle.waitFor({ state: 'visible', timeout: 5000 });
      await this.visitorTable.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证页面已加载
   */
  async expectPageLoaded(): Promise<void> {
    await expect(this.pageTitle).toContainText('访客管理');
    await expect(this.visitorTable).toBeVisible();
    await expect(this.filterPanel).toBeVisible();
  }

  /**
   * 切换到指定状态标签页
   */
  async switchToTab(tabName: string): Promise<void> {
    const tabMap: Record<string, Locator> = {
      '全部': this.allVisitorsTab,
      '待审批': this.pendingTab,
      '已批准': this.approvedTab,
      '已拒绝': this.rejectedTab,
      '已过期': this.expiredTab
    };

    const tab = tabMap[tabName];
    if (!tab) {
      throw new Error(`未知的标签页: ${tabName}`);
    }

    await this.waitAndClick(tab);
    await this.waitForLoadingComplete();
  }

  /**
   * 审批访客申请
   */
  async approveVisitorApplication(visitorName: string, config?: AccessCodeConfig): Promise<void> {
    const approveButton = this.getVisitorActionButton(visitorName, 'approve');
    await this.waitAndClick(approveButton);
    await this.waitForElement(this.approvalModal);

    // 配置通行码参数
    if (config) {
      await this.configureAccessCode(config);
    } else {
      // 使用默认配置
      await this.usageLimitInput.fill('3');
      await this.validHoursInput.fill('8');
    }

    await this.waitAndClick(this.approveButton);
    await this.waitForLoadingComplete();
    await this.expectNotification('访客申请已批准');
  }

  /**
   * 拒绝访客申请
   */
  async rejectVisitorApplication(visitorName: string, reason: string, customReason?: string): Promise<void> {
    const rejectButton = this.getVisitorActionButton(visitorName, 'reject');
    await this.waitAndClick(rejectButton);
    await this.waitForElement(this.rejectModal);

    await this.rejectReasonSelect.selectOption(reason);

    if (customReason) {
      await this.customReasonInput.fill(customReason);
    }

    await this.waitAndClick(this.confirmRejectButton);
    await this.waitForLoadingComplete();
    await this.expectNotification('访客申请已拒绝');
  }

  /**
   * 查看访客详情
   */
  async viewVisitorDetails(visitorName: string): Promise<void> {
    const detailButton = this.getVisitorActionButton(visitorName, 'detail');
    await this.waitAndClick(detailButton);
    await this.waitForElement(this.visitorDetailModal);
  }

  /**
   * 管理访客通行码
   */
  async manageAccessCode(visitorName: string): Promise<void> {
    const codeButton = this.getVisitorActionButton(visitorName, 'code');
    await this.waitAndClick(codeButton);
    await this.waitForElement(this.accessCodeModal);
  }

  /**
   * 重新生成通行码
   */
  async regenerateAccessCode(visitorName: string): Promise<void> {
    await this.manageAccessCode(visitorName);
    await this.waitAndClick(this.regenerateCodeButton);
    
    const confirmModal = this.page.locator('[data-testid="confirm-modal"]');
    await this.waitForElement(confirmModal);
    
    const confirmButton = confirmModal.locator('[data-testid="confirm-button"]');
    await this.waitAndClick(confirmButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('通行码已重新生成');
  }

  /**
   * 延长通行码有效期
   */
  async extendAccessCodeValidity(visitorName: string, additionalHours: number): Promise<void> {
    await this.manageAccessCode(visitorName);
    await this.waitAndClick(this.extendValidityButton);
    
    const extendModal = this.page.locator('[data-testid="extend-modal"]');
    await this.waitForElement(extendModal);
    
    const hoursInput = extendModal.locator('[data-testid="additional-hours"]');
    await hoursInput.fill(additionalHours.toString());
    
    const confirmButton = extendModal.locator('[data-testid="confirm-extend"]');
    await this.waitAndClick(confirmButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('通行码有效期已延长');
  }

  /**
   * 撤销通行码
   */
  async revokeAccessCode(visitorName: string): Promise<void> {
    await this.manageAccessCode(visitorName);
    await this.waitAndClick(this.revokeCodeButton);
    
    const confirmModal = this.page.locator('[data-testid="confirm-modal"]');
    await this.waitForElement(confirmModal);
    
    const confirmButton = confirmModal.locator('[data-testid="confirm-button"]');
    await this.waitAndClick(confirmButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('通行码已撤销');
  }

  /**
   * 发送通行码给访客
   */
  async sendAccessCodeToVisitor(visitorName: string, method: 'sms' | 'email' | 'wechat'): Promise<void> {
    await this.manageAccessCode(visitorName);
    await this.waitAndClick(this.sendCodeButton);
    
    const sendModal = this.page.locator('[data-testid="send-code-modal"]');
    await this.waitForElement(sendModal);
    
    const methodSelect = sendModal.locator('[data-testid="send-method"]');
    await methodSelect.selectOption(method);
    
    const sendButton = sendModal.locator('[data-testid="confirm-send"]');
    await this.waitAndClick(sendButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('通行码已发送');
  }

  /**
   * 搜索访客
   */
  async searchVisitor(searchTerm: string): Promise<void> {
    await this.searchInput.fill(searchTerm);
    await this.waitAndClick(this.searchButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 按日期范围筛选
   */
  async filterByDateRange(startDate: string, endDate: string): Promise<void> {
    await this.dateRangeFilter.click();
    
    const startDateInput = this.page.locator('[data-testid="start-date"]');
    const endDateInput = this.page.locator('[data-testid="end-date"]');
    
    await startDateInput.fill(startDate);
    await endDateInput.fill(endDate);
    
    const applyButton = this.page.locator('[data-testid="apply-date-filter"]');
    await this.waitAndClick(applyButton);
    
    await this.waitForLoadingComplete();
  }

  /**
   * 按公司筛选
   */
  async filterByCompany(company: string): Promise<void> {
    await this.companyFilter.selectOption(company);
    await this.waitForLoadingComplete();
  }

  /**
   * 按接待员工筛选
   */
  async filterByEmployee(employee: string): Promise<void> {
    await this.employeeFilter.selectOption(employee);
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
   * 验证访客状态
   */
  async expectVisitorStatus(visitorName: string, expectedStatus: string): Promise<void> {
    const visitorRow = this.getVisitorRow(visitorName);
    const statusBadge = visitorRow.locator('[data-testid="status-badge"]');
    await expect(statusBadge).toContainText(expectedStatus);
  }

  /**
   * 验证访客在表格中显示
   */
  async expectVisitorInTable(visitorName: string): Promise<void> {
    const visitorRow = this.getVisitorRow(visitorName);
    await expect(visitorRow).toBeVisible();
  }

  /**
   * 批量选择访客
   */
  async selectVisitors(visitorNames: string[]): Promise<void> {
    for (const name of visitorNames) {
      const checkbox = this.getVisitorCheckbox(name);
      await checkbox.check();
    }
  }

  /**
   * 批量审批访客
   */
  async batchApproveVisitors(visitorNames: string[], config?: AccessCodeConfig): Promise<void> {
    await this.selectVisitors(visitorNames);
    await this.waitAndClick(this.batchActionButton);
    await this.waitAndClick(this.batchApproveButton);
    
    const batchApprovalModal = this.page.locator('[data-testid="batch-approval-modal"]');
    await this.waitForElement(batchApprovalModal);
    
    if (config) {
      await this.configureAccessCode(config);
    } else {
      // 使用默认配置
      const usageLimit = batchApprovalModal.locator('[data-testid="usage-limit"]');
      const validHours = batchApprovalModal.locator('[data-testid="valid-hours"]');
      await usageLimit.fill('3');
      await validHours.fill('8');
    }
    
    const confirmButton = batchApprovalModal.locator('[data-testid="confirm-batch-approve"]');
    await this.waitAndClick(confirmButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('批量审批成功');
  }

  /**
   * 批量拒绝访客
   */
  async batchRejectVisitors(visitorNames: string[], reason: string): Promise<void> {
    await this.selectVisitors(visitorNames);
    await this.waitAndClick(this.batchActionButton);
    await this.waitAndClick(this.batchRejectButton);
    
    const batchRejectModal = this.page.locator('[data-testid="batch-reject-modal"]');
    await this.waitForElement(batchRejectModal);
    
    const reasonSelect = batchRejectModal.locator('[data-testid="reject-reason-select"]');
    await reasonSelect.selectOption(reason);
    
    const confirmButton = batchRejectModal.locator('[data-testid="confirm-batch-reject"]');
    await this.waitAndClick(confirmButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('批量拒绝成功');
  }

  /**
   * 快速批准所有待审批访客
   */
  async quickApproveAllPending(): Promise<void> {
    await this.waitAndClick(this.quickApproveAllButton);
    
    const confirmModal = this.page.locator('[data-testid="confirm-modal"]');
    await this.waitForElement(confirmModal);
    
    const confirmButton = confirmModal.locator('[data-testid="confirm-button"]');
    await this.waitAndClick(confirmButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('所有待审批访客已批准');
  }

  /**
   * 导出今日访客数据
   */
  async exportTodayVisitors(): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.waitAndClick(this.exportTodayButton);
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('今日访客');
  }

  /**
   * 获取统计数据
   */
  async getVisitorStatistics(): Promise<{
    todayVisitors: number;
    pendingApprovals: number;
    activeCodes: number;
    expiredCodes: number;
  }> {
    await this.waitForLoadingComplete();
    
    const todayVisitors = await this.getCardValue(this.todayVisitorsCard);
    const pendingApprovals = await this.getCardValue(this.pendingApprovalsCard);
    const activeCodes = await this.getCardValue(this.activeCodesCard);
    const expiredCodes = await this.getCardValue(this.expiredCodesCard);
    
    return {
      todayVisitors,
      pendingApprovals,
      activeCodes,
      expiredCodes
    };
  }

  /**
   * 验证统计卡片显示
   */
  async expectStatisticsCardsVisible(): Promise<void> {
    await expect(this.todayVisitorsCard).toBeVisible();
    await expect(this.pendingApprovalsCard).toBeVisible();
    await expect(this.activeCodesCard).toBeVisible();
    await expect(this.expiredCodesCard).toBeVisible();
  }

  /**
   * 验证访客通行历史
   */
  async expectVisitorAccessHistory(visitorName: string): Promise<void> {
    await this.viewVisitorDetails(visitorName);
    
    await expect(this.accessHistory).toBeVisible();
    
    // 检查是否有通行记录
    const accessRecords = this.accessHistory.locator('[data-testid="access-record"]');
    const recordCount = await accessRecords.count();
    expect(recordCount).toBeGreaterThanOrEqual(0);
    
    // 关闭详情模态框
    const closeButton = this.visitorDetailModal.locator('[data-testid="close-button"]');
    await this.waitAndClick(closeButton);
  }

  /**
   * 验证二维码显示
   */
  async expectQRCodeVisible(visitorName: string): Promise<void> {
    await this.viewVisitorDetails(visitorName);
    
    await expect(this.qrCodeDisplay).toBeVisible();
    
    // 验证二维码图片存在
    const qrImage = this.qrCodeDisplay.locator('img, canvas, svg');
    await expect(qrImage).toBeVisible();
    
    // 关闭详情模态框
    const closeButton = this.visitorDetailModal.locator('[data-testid="close-button"]');
    await this.waitAndClick(closeButton);
  }

  /**
   * 配置通行码参数
   */
  private async configureAccessCode(config: AccessCodeConfig): Promise<void> {
    await this.usageLimitInput.fill(config.usageLimit.toString());
    await this.validHoursInput.fill(config.validHours.toString());
    
    if (config.accessDevices && config.accessDevices.length > 0) {
      for (const device of config.accessDevices) {
        const deviceCheckbox = this.deviceSelectionList.locator(`input[value="${device}"]`);
        await deviceCheckbox.check();
      }
    }
    
    if (config.timeRestrictions) {
      await this.startTimeInput.fill(config.timeRestrictions.startTime);
      await this.endTimeInput.fill(config.timeRestrictions.endTime);
    }
  }

  /**
   * 获取访客行元素
   */
  private getVisitorRow(visitorName: string): Locator {
    return this.visitorTable.locator(`tr:has-text("${visitorName}")`);
  }

  /**
   * 获取访客操作按钮
   */
  private getVisitorActionButton(visitorName: string, action: string): Locator {
    const row = this.getVisitorRow(visitorName);
    return row.locator(`[data-testid="${action}-button"]`);
  }

  /**
   * 获取访客复选框
   */
  private getVisitorCheckbox(visitorName: string): Locator {
    const row = this.getVisitorRow(visitorName);
    return row.locator('[data-testid="visitor-checkbox"], input[type="checkbox"]');
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
   * 刷新访客数据
   */
  async refreshVisitors(): Promise<void> {
    await this.waitAndClick(this.refreshButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 验证表格为空
   */
  async expectEmptyTable(): Promise<void> {
    const emptyText = this.visitorTable.locator('[data-testid="empty-text"], .ant-empty-description');
    await expect(emptyText).toBeVisible();
  }
}