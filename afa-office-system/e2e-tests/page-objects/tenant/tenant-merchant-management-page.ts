import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base-page';

/**
 * 商户数据接口
 */
export interface MerchantData {
  name: string;
  contactPerson: string;
  contactPhone: string;
  email: string;
  address: string;
  businessLicense?: string;
  status?: 'active' | 'inactive' | 'pending';
}

/**
 * 租务管理端商户管理页面对象
 * 提供商户的增删改查和状态管理功能
 */
export class TenantMerchantManagementPage extends BasePage {
  // 页面主要元素
  readonly pageTitle: Locator;
  readonly addMerchantButton: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly merchantTable: Locator;
  readonly pagination: Locator;

  // 筛选器
  readonly statusFilter: Locator;
  readonly dateRangeFilter: Locator;
  readonly businessTypeFilter: Locator;

  // 批量操作
  readonly selectAllCheckbox: Locator;
  readonly batchActionButton: Locator;
  readonly batchActivateButton: Locator;
  readonly batchDeactivateButton: Locator;
  readonly batchDeleteButton: Locator;

  // 表格列
  readonly nameColumn: Locator;
  readonly contactColumn: Locator;
  readonly statusColumn: Locator;
  readonly actionColumn: Locator;

  // 商户表单模态框
  readonly merchantModal: Locator;
  readonly modalTitle: Locator;
  readonly nameInput: Locator;
  readonly contactPersonInput: Locator;
  readonly contactPhoneInput: Locator;
  readonly emailInput: Locator;
  readonly addressInput: Locator;
  readonly businessLicenseInput: Locator;
  readonly statusSelect: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  // 确认对话框
  readonly confirmModal: Locator;
  readonly confirmButton: Locator;
  readonly confirmCancelButton: Locator;

  constructor(page: Page) {
    super(page);

    // 页面主要元素
    this.pageTitle = page.locator('[data-testid="page-title"], h1');
    this.addMerchantButton = page.locator('[data-testid="add-merchant-button"]');
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.searchButton = page.locator('[data-testid="search-button"]');
    this.resetButton = page.locator('[data-testid="reset-button"]');
    this.merchantTable = page.locator('[data-testid="merchant-table"]');
    this.pagination = page.locator('[data-testid="pagination"], .ant-pagination');

    // 筛选器
    this.statusFilter = page.locator('[data-testid="status-filter"]');
    this.dateRangeFilter = page.locator('[data-testid="date-range-filter"]');
    this.businessTypeFilter = page.locator('[data-testid="business-type-filter"]');

    // 批量操作
    this.selectAllCheckbox = page.locator('[data-testid="select-all-checkbox"]');
    this.batchActionButton = page.locator('[data-testid="batch-action-button"]');
    this.batchActivateButton = page.locator('[data-testid="batch-activate-button"]');
    this.batchDeactivateButton = page.locator('[data-testid="batch-deactivate-button"]');
    this.batchDeleteButton = page.locator('[data-testid="batch-delete-button"]');

    // 表格列
    this.nameColumn = page.locator('[data-testid="name-column"]');
    this.contactColumn = page.locator('[data-testid="contact-column"]');
    this.statusColumn = page.locator('[data-testid="status-column"]');
    this.actionColumn = page.locator('[data-testid="action-column"]');

    // 商户表单模态框
    this.merchantModal = page.locator('[data-testid="merchant-modal"], .ant-modal');
    this.modalTitle = page.locator('[data-testid="modal-title"], .ant-modal-title');
    this.nameInput = page.locator('[data-testid="merchant-name"]');
    this.contactPersonInput = page.locator('[data-testid="contact-person"]');
    this.contactPhoneInput = page.locator('[data-testid="contact-phone"]');
    this.emailInput = page.locator('[data-testid="email"]');
    this.addressInput = page.locator('[data-testid="address"]');
    this.businessLicenseInput = page.locator('[data-testid="business-license"]');
    this.statusSelect = page.locator('[data-testid="status-select"]');
    this.submitButton = page.locator('[data-testid="submit-button"]');
    this.cancelButton = page.locator('[data-testid="cancel-button"]');

    // 确认对话框
    this.confirmModal = page.locator('[data-testid="confirm-modal"], .ant-modal-confirm');
    this.confirmButton = page.locator('[data-testid="confirm-button"], .ant-btn-primary');
    this.confirmCancelButton = page.locator('[data-testid="confirm-cancel-button"], .ant-btn-default');
  }

  /**
   * 导航到商户管理页面
   */
  async goto(): Promise<void> {
    await this.page.goto('/tenant/merchants');
    await this.waitForLoad();
  }

  /**
   * 检查页面是否已加载
   */
  async isLoaded(): Promise<boolean> {
    try {
      await this.pageTitle.waitFor({ state: 'visible', timeout: 5000 });
      await this.merchantTable.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证页面已加载
   */
  async expectPageLoaded(): Promise<void> {
    await expect(this.pageTitle).toContainText('商户管理');
    await expect(this.merchantTable).toBeVisible();
    await expect(this.addMerchantButton).toBeVisible();
  }

  /**
   * 添加新商户
   */
  async addMerchant(merchantData: MerchantData): Promise<void> {
    await this.waitAndClick(this.addMerchantButton);
    await this.waitForElement(this.merchantModal);
    
    await this.fillMerchantForm(merchantData);
    await this.waitAndClick(this.submitButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('商户添加成功');
  }

  /**
   * 编辑商户信息
   */
  async editMerchant(merchantName: string, updatedData: Partial<MerchantData>): Promise<void> {
    const editButton = this.getMerchantActionButton(merchantName, 'edit');
    await this.waitAndClick(editButton);
    await this.waitForElement(this.merchantModal);
    
    await this.fillMerchantForm(updatedData);
    await this.waitAndClick(this.submitButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('商户信息更新成功');
  }

  /**
   * 删除商户
   */
  async deleteMerchant(merchantName: string): Promise<void> {
    const deleteButton = this.getMerchantActionButton(merchantName, 'delete');
    await this.waitAndClick(deleteButton);
    
    await this.waitForElement(this.confirmModal);
    await this.waitAndClick(this.confirmButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('商户删除成功');
  }

  /**
   * 激活商户
   */
  async activateMerchant(merchantName: string): Promise<void> {
    const activateButton = this.getMerchantActionButton(merchantName, 'activate');
    await this.waitAndClick(activateButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('商户激活成功');
  }

  /**
   * 停用商户
   */
  async deactivateMerchant(merchantName: string): Promise<void> {
    const deactivateButton = this.getMerchantActionButton(merchantName, 'deactivate');
    await this.waitAndClick(deactivateButton);
    
    await this.waitForElement(this.confirmModal);
    await this.waitAndClick(this.confirmButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('商户已停用');
  }

  /**
   * 搜索商户
   */
  async searchMerchant(searchTerm: string): Promise<void> {
    await this.searchInput.fill(searchTerm);
    await this.waitAndClick(this.searchButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 按状态筛选商户
   */
  async filterByStatus(status: string): Promise<void> {
    await this.statusFilter.selectOption(status);
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
   * 重置筛选条件
   */
  async resetFilters(): Promise<void> {
    await this.waitAndClick(this.resetButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 验证商户在表格中显示
   */
  async expectMerchantInTable(merchantName: string): Promise<void> {
    const merchantRow = this.getMerchantRow(merchantName);
    await expect(merchantRow).toBeVisible();
  }

  /**
   * 验证商户状态
   */
  async expectMerchantStatus(merchantName: string, expectedStatus: string): Promise<void> {
    const merchantRow = this.getMerchantRow(merchantName);
    const statusBadge = merchantRow.locator('[data-testid="status-badge"]');
    await expect(statusBadge).toContainText(expectedStatus);
  }

  /**
   * 验证商户不在表格中
   */
  async expectMerchantNotInTable(merchantName: string): Promise<void> {
    const merchantRow = this.getMerchantRow(merchantName);
    await expect(merchantRow).not.toBeVisible();
  }

  /**
   * 批量选择商户
   */
  async selectMerchants(merchantNames: string[]): Promise<void> {
    for (const name of merchantNames) {
      const checkbox = this.getMerchantCheckbox(name);
      await checkbox.check();
    }
  }

  /**
   * 全选商户
   */
  async selectAllMerchants(): Promise<void> {
    await this.selectAllCheckbox.check();
  }

  /**
   * 批量激活商户
   */
  async batchActivateMerchants(merchantNames: string[]): Promise<void> {
    await this.selectMerchants(merchantNames);
    await this.waitAndClick(this.batchActionButton);
    await this.waitAndClick(this.batchActivateButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('批量激活成功');
  }

  /**
   * 批量停用商户
   */
  async batchDeactivateMerchants(merchantNames: string[]): Promise<void> {
    await this.selectMerchants(merchantNames);
    await this.waitAndClick(this.batchActionButton);
    await this.waitAndClick(this.batchDeactivateButton);
    
    await this.waitForElement(this.confirmModal);
    await this.waitAndClick(this.confirmButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('批量停用成功');
  }

  /**
   * 获取商户列表
   */
  async getMerchantList(): Promise<string[]> {
    await this.waitForLoadingComplete();
    
    const nameElements = this.merchantTable.locator('[data-testid="merchant-name"]');
    const count = await nameElements.count();
    const names: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const name = await nameElements.nth(i).textContent();
      if (name) {
        names.push(name.trim());
      }
    }
    
    return names;
  }

  /**
   * 验证表格为空
   */
  async expectEmptyTable(): Promise<void> {
    const emptyText = this.merchantTable.locator('[data-testid="empty-text"], .ant-empty-description');
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
   * 填写商户表单
   */
  private async fillMerchantForm(data: Partial<MerchantData>): Promise<void> {
    if (data.name) {
      await this.nameInput.fill(data.name);
    }
    if (data.contactPerson) {
      await this.contactPersonInput.fill(data.contactPerson);
    }
    if (data.contactPhone) {
      await this.contactPhoneInput.fill(data.contactPhone);
    }
    if (data.email) {
      await this.emailInput.fill(data.email);
    }
    if (data.address) {
      await this.addressInput.fill(data.address);
    }
    if (data.businessLicense) {
      await this.businessLicenseInput.fill(data.businessLicense);
    }
    if (data.status) {
      await this.statusSelect.selectOption(data.status);
    }
  }

  /**
   * 获取商户行元素
   */
  private getMerchantRow(merchantName: string): Locator {
    return this.merchantTable.locator(`tr:has-text("${merchantName}")`);
  }

  /**
   * 获取商户操作按钮
   */
  private getMerchantActionButton(merchantName: string, action: string): Locator {
    const row = this.getMerchantRow(merchantName);
    return row.locator(`[data-testid="${action}-button"]`);
  }

  /**
   * 获取商户复选框
   */
  private getMerchantCheckbox(merchantName: string): Locator {
    const row = this.getMerchantRow(merchantName);
    return row.locator('[data-testid="merchant-checkbox"], input[type="checkbox"]');
  }

  /**
   * 验证表单验证错误
   */
  async expectFormValidationError(field: string, message: string): Promise<void> {
    const errorElement = this.merchantModal.locator(`[data-testid="error-${field}"]`);
    await expect(errorElement).toContainText(message);
  }

  /**
   * 取消表单操作
   */
  async cancelForm(): Promise<void> {
    await this.waitAndClick(this.cancelButton);
    await expect(this.merchantModal).not.toBeVisible();
  }

  /**
   * 验证模态框标题
   */
  async expectModalTitle(expectedTitle: string): Promise<void> {
    await expect(this.modalTitle).toContainText(expectedTitle);
  }
}