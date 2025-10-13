import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base-page';

/**
 * 员工数据接口
 */
export interface EmployeeData {
  name: string;
  phone: string;
  email: string;
  department: string;
  position: string;
  employeeId?: string;
  status?: 'active' | 'inactive' | 'pending';
  permissions?: string[];
  startDate?: string;
}

/**
 * 商户管理端员工管理页面对象（扩展版本）
 * 提供员工的增删改查、权限管理和批量操作功能
 */
export class MerchantEmployeeManagementPage extends BasePage {
  // 页面主要元素
  readonly pageTitle: Locator;
  readonly addEmployeeButton: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly employeeTable: Locator;
  readonly pagination: Locator;

  // 筛选器
  readonly departmentFilter: Locator;
  readonly statusFilter: Locator;
  readonly positionFilter: Locator;
  readonly permissionFilter: Locator;

  // 批量操作
  readonly selectAllCheckbox: Locator;
  readonly batchActionButton: Locator;
  readonly batchImportButton: Locator;
  readonly batchExportButton: Locator;
  readonly batchActivateButton: Locator;
  readonly batchDeactivateButton: Locator;
  readonly batchDeleteButton: Locator;
  readonly batchPermissionButton: Locator;

  // 员工表单模态框
  readonly employeeModal: Locator;
  readonly modalTitle: Locator;
  readonly nameInput: Locator;
  readonly phoneInput: Locator;
  readonly emailInput: Locator;
  readonly departmentInput: Locator;
  readonly positionInput: Locator;
  readonly employeeIdInput: Locator;
  readonly statusSelect: Locator;
  readonly startDateInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  // 权限设置区域
  readonly permissionPanel: Locator;
  readonly visitorApprovalPermission: Locator;
  readonly accessRecordPermission: Locator;
  readonly deviceControlPermission: Locator;
  readonly reportViewPermission: Locator;

  // 批量导入模态框
  readonly importModal: Locator;
  readonly fileUploadArea: Locator;
  readonly downloadTemplateButton: Locator;
  readonly importPreviewTable: Locator;
  readonly confirmImportButton: Locator;

  // 员工详情模态框
  readonly employeeDetailModal: Locator;
  readonly employeeInfo: Locator;
  readonly employeePermissions: Locator;
  readonly employeeAccessHistory: Locator;

  constructor(page: Page) {
    super(page);

    // 页面主要元素
    this.pageTitle = page.locator('[data-testid="page-title"], h1');
    this.addEmployeeButton = page.locator('[data-testid="add-employee-button"]');
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.searchButton = page.locator('[data-testid="search-button"]');
    this.resetButton = page.locator('[data-testid="reset-button"]');
    this.employeeTable = page.locator('[data-testid="employee-table"]');
    this.pagination = page.locator('[data-testid="pagination"], .ant-pagination');

    // 筛选器
    this.departmentFilter = page.locator('[data-testid="department-filter"]');
    this.statusFilter = page.locator('[data-testid="status-filter"]');
    this.positionFilter = page.locator('[data-testid="position-filter"]');
    this.permissionFilter = page.locator('[data-testid="permission-filter"]');

    // 批量操作
    this.selectAllCheckbox = page.locator('[data-testid="select-all-checkbox"]');
    this.batchActionButton = page.locator('[data-testid="batch-action-button"]');
    this.batchImportButton = page.locator('[data-testid="batch-import-button"]');
    this.batchExportButton = page.locator('[data-testid="batch-export-button"]');
    this.batchActivateButton = page.locator('[data-testid="batch-activate-button"]');
    this.batchDeactivateButton = page.locator('[data-testid="batch-deactivate-button"]');
    this.batchDeleteButton = page.locator('[data-testid="batch-delete-button"]');
    this.batchPermissionButton = page.locator('[data-testid="batch-permission-button"]');

    // 员工表单模态框
    this.employeeModal = page.locator('[data-testid="employee-modal"], .ant-modal');
    this.modalTitle = page.locator('[data-testid="modal-title"], .ant-modal-title');
    this.nameInput = page.locator('[data-testid="employee-name"]');
    this.phoneInput = page.locator('[data-testid="employee-phone"]');
    this.emailInput = page.locator('[data-testid="employee-email"]');
    this.departmentInput = page.locator('[data-testid="department"]');
    this.positionInput = page.locator('[data-testid="position"]');
    this.employeeIdInput = page.locator('[data-testid="employee-id"]');
    this.statusSelect = page.locator('[data-testid="status-select"]');
    this.startDateInput = page.locator('[data-testid="start-date"]');
    this.submitButton = page.locator('[data-testid="submit-button"]');
    this.cancelButton = page.locator('[data-testid="cancel-button"]');

    // 权限设置区域
    this.permissionPanel = page.locator('[data-testid="permission-panel"]');
    this.visitorApprovalPermission = page.locator('[data-testid="visitor-approval-permission"]');
    this.accessRecordPermission = page.locator('[data-testid="access-record-permission"]');
    this.deviceControlPermission = page.locator('[data-testid="device-control-permission"]');
    this.reportViewPermission = page.locator('[data-testid="report-view-permission"]');

    // 批量导入模态框
    this.importModal = page.locator('[data-testid="import-modal"]');
    this.fileUploadArea = page.locator('[data-testid="file-upload-area"]');
    this.downloadTemplateButton = page.locator('[data-testid="download-template-button"]');
    this.importPreviewTable = page.locator('[data-testid="import-preview-table"]');
    this.confirmImportButton = page.locator('[data-testid="confirm-import-button"]');

    // 员工详情模态框
    this.employeeDetailModal = page.locator('[data-testid="employee-detail-modal"]');
    this.employeeInfo = page.locator('[data-testid="employee-info"]');
    this.employeePermissions = page.locator('[data-testid="employee-permissions"]');
    this.employeeAccessHistory = page.locator('[data-testid="employee-access-history"]');
  }

  /**
   * 导航到员工管理页面
   */
  async goto(): Promise<void> {
    await this.page.goto('/merchant/employees');
    await this.waitForLoad();
  }

  /**
   * 检查页面是否已加载
   */
  async isLoaded(): Promise<boolean> {
    try {
      await this.pageTitle.waitFor({ state: 'visible', timeout: 5000 });
      await this.employeeTable.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证页面已加载
   */
  async expectPageLoaded(): Promise<void> {
    await expect(this.pageTitle).toContainText('员工管理');
    await expect(this.employeeTable).toBeVisible();
    await expect(this.addEmployeeButton).toBeVisible();
  }

  /**
   * 添加新员工
   */
  async addEmployee(employeeData: EmployeeData): Promise<void> {
    await this.waitAndClick(this.addEmployeeButton);
    await this.waitForElement(this.employeeModal);
    
    await this.fillEmployeeForm(employeeData);
    
    // 设置权限
    if (employeeData.permissions) {
      await this.setEmployeePermissions(employeeData.permissions);
    }
    
    await this.waitAndClick(this.submitButton);
    await this.waitForLoadingComplete();
    await this.expectNotification('员工添加成功');
  }

  /**
   * 编辑员工信息
   */
  async editEmployee(employeeName: string, updatedData: Partial<EmployeeData>): Promise<void> {
    const editButton = this.getEmployeeActionButton(employeeName, 'edit');
    await this.waitAndClick(editButton);
    await this.waitForElement(this.employeeModal);
    
    await this.fillEmployeeForm(updatedData);
    
    if (updatedData.permissions) {
      await this.setEmployeePermissions(updatedData.permissions);
    }
    
    await this.waitAndClick(this.submitButton);
    await this.waitForLoadingComplete();
    await this.expectNotification('员工信息更新成功');
  }

  /**
   * 删除员工
   */
  async deleteEmployee(employeeName: string): Promise<void> {
    const deleteButton = this.getEmployeeActionButton(employeeName, 'delete');
    await this.waitAndClick(deleteButton);
    
    const confirmModal = this.page.locator('[data-testid="confirm-modal"]');
    await this.waitForElement(confirmModal);
    
    const confirmButton = confirmModal.locator('[data-testid="confirm-button"]');
    await this.waitAndClick(confirmButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('员工删除成功');
  }

  /**
   * 激活员工
   */
  async activateEmployee(employeeName: string): Promise<void> {
    const activateButton = this.getEmployeeActionButton(employeeName, 'activate');
    await this.waitAndClick(activateButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('员工激活成功');
  }

  /**
   * 停用员工
   */
  async deactivateEmployee(employeeName: string): Promise<void> {
    const deactivateButton = this.getEmployeeActionButton(employeeName, 'deactivate');
    await this.waitAndClick(deactivateButton);
    
    const confirmModal = this.page.locator('[data-testid="confirm-modal"]');
    await this.waitForElement(confirmModal);
    
    const confirmButton = confirmModal.locator('[data-testid="confirm-button"]');
    await this.waitAndClick(confirmButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('员工已停用');
  }

  /**
   * 设置员工权限
   */
  async setEmployeePermissions(permissions: string[]): Promise<void> {
    await this.waitForElement(this.permissionPanel);
    
    // 先清除所有权限
    const allPermissions = [
      this.visitorApprovalPermission,
      this.accessRecordPermission,
      this.deviceControlPermission,
      this.reportViewPermission
    ];
    
    for (const permission of allPermissions) {
      if (await permission.isChecked()) {
        await permission.uncheck();
      }
    }
    
    // 设置指定权限
    const permissionMap: Record<string, Locator> = {
      'visitor_approval': this.visitorApprovalPermission,
      'access_record': this.accessRecordPermission,
      'device_control': this.deviceControlPermission,
      'report_view': this.reportViewPermission
    };
    
    for (const permission of permissions) {
      const checkbox = permissionMap[permission];
      if (checkbox) {
        await checkbox.check();
      }
    }
  }

  /**
   * 查看员工详情
   */
  async viewEmployeeDetails(employeeName: string): Promise<void> {
    const detailButton = this.getEmployeeActionButton(employeeName, 'detail');
    await this.waitAndClick(detailButton);
    await this.waitForElement(this.employeeDetailModal);
  }

  /**
   * 搜索员工
   */
  async searchEmployee(searchTerm: string): Promise<void> {
    await this.searchInput.fill(searchTerm);
    await this.waitAndClick(this.searchButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 按部门筛选员工
   */
  async filterByDepartment(department: string): Promise<void> {
    await this.departmentFilter.selectOption(department);
    await this.waitForLoadingComplete();
  }

  /**
   * 按状态筛选员工
   */
  async filterByStatus(status: string): Promise<void> {
    await this.statusFilter.selectOption(status);
    await this.waitForLoadingComplete();
  }

  /**
   * 按职位筛选员工
   */
  async filterByPosition(position: string): Promise<void> {
    await this.positionFilter.selectOption(position);
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
   * 验证员工在表格中显示
   */
  async expectEmployeeInTable(employeeName: string): Promise<void> {
    const employeeRow = this.getEmployeeRow(employeeName);
    await expect(employeeRow).toBeVisible();
  }

  /**
   * 验证员工状态
   */
  async expectEmployeeStatus(employeeName: string, expectedStatus: string): Promise<void> {
    const employeeRow = this.getEmployeeRow(employeeName);
    const statusBadge = employeeRow.locator('[data-testid="status-badge"]');
    await expect(statusBadge).toContainText(expectedStatus);
  }

  /**
   * 批量选择员工
   */
  async selectEmployees(employeeNames: string[]): Promise<void> {
    for (const name of employeeNames) {
      const checkbox = this.getEmployeeCheckbox(name);
      await checkbox.check();
    }
  }

  /**
   * 全选员工
   */
  async selectAllEmployees(): Promise<void> {
    await this.selectAllCheckbox.check();
  }

  /**
   * 批量导入员工
   */
  async batchImportEmployees(filePath: string): Promise<void> {
    await this.waitAndClick(this.batchImportButton);
    await this.waitForElement(this.importModal);
    
    // 上传文件
    const fileInput = this.fileUploadArea.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    // 等待预览表格加载
    await this.waitForElement(this.importPreviewTable);
    
    // 确认导入
    await this.waitAndClick(this.confirmImportButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('员工批量导入成功');
  }

  /**
   * 下载导入模板
   */
  async downloadImportTemplate(): Promise<void> {
    await this.waitAndClick(this.batchImportButton);
    await this.waitForElement(this.importModal);
    
    const downloadPromise = this.page.waitForEvent('download');
    await this.waitAndClick(this.downloadTemplateButton);
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('员工导入模板');
  }

  /**
   * 批量导出员工数据
   */
  async batchExportEmployees(): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.waitAndClick(this.batchExportButton);
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('员工数据');
  }

  /**
   * 批量激活员工
   */
  async batchActivateEmployees(employeeNames: string[]): Promise<void> {
    await this.selectEmployees(employeeNames);
    await this.waitAndClick(this.batchActionButton);
    await this.waitAndClick(this.batchActivateButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('批量激活成功');
  }

  /**
   * 批量停用员工
   */
  async batchDeactivateEmployees(employeeNames: string[]): Promise<void> {
    await this.selectEmployees(employeeNames);
    await this.waitAndClick(this.batchActionButton);
    await this.waitAndClick(this.batchDeactivateButton);
    
    const confirmModal = this.page.locator('[data-testid="confirm-modal"]');
    await this.waitForElement(confirmModal);
    
    const confirmButton = confirmModal.locator('[data-testid="confirm-button"]');
    await this.waitAndClick(confirmButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('批量停用成功');
  }

  /**
   * 批量设置权限
   */
  async batchSetPermissions(employeeNames: string[], permissions: string[]): Promise<void> {
    await this.selectEmployees(employeeNames);
    await this.waitAndClick(this.batchActionButton);
    await this.waitAndClick(this.batchPermissionButton);
    
    const permissionModal = this.page.locator('[data-testid="batch-permission-modal"]');
    await this.waitForElement(permissionModal);
    
    // 设置权限
    for (const permission of permissions) {
      const checkbox = permissionModal.locator(`[data-testid="${permission}-permission"]`);
      await checkbox.check();
    }
    
    const saveButton = permissionModal.locator('[data-testid="save-permissions-button"]');
    await this.waitAndClick(saveButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('批量权限设置成功');
  }

  /**
   * 获取员工列表
   */
  async getEmployeeList(): Promise<string[]> {
    await this.waitForLoadingComplete();
    
    const nameElements = this.employeeTable.locator('[data-testid="employee-name"]');
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
   * 验证员工权限显示
   */
  async expectEmployeePermissions(employeeName: string, expectedPermissions: string[]): Promise<void> {
    await this.viewEmployeeDetails(employeeName);
    
    for (const permission of expectedPermissions) {
      const permissionBadge = this.employeePermissions.locator(`[data-testid="${permission}-badge"]`);
      await expect(permissionBadge).toBeVisible();
    }
    
    // 关闭详情模态框
    const closeButton = this.employeeDetailModal.locator('[data-testid="close-button"]');
    await this.waitAndClick(closeButton);
  }

  /**
   * 验证员工通行历史
   */
  async expectEmployeeAccessHistory(employeeName: string): Promise<void> {
    await this.viewEmployeeDetails(employeeName);
    
    await expect(this.employeeAccessHistory).toBeVisible();
    
    // 检查是否有通行记录
    const accessRecords = this.employeeAccessHistory.locator('[data-testid="access-record"]');
    const recordCount = await accessRecords.count();
    expect(recordCount).toBeGreaterThanOrEqual(0);
    
    // 关闭详情模态框
    const closeButton = this.employeeDetailModal.locator('[data-testid="close-button"]');
    await this.waitAndClick(closeButton);
  }

  /**
   * 填写员工表单
   */
  private async fillEmployeeForm(data: Partial<EmployeeData>): Promise<void> {
    if (data.name) {
      await this.nameInput.fill(data.name);
    }
    if (data.phone) {
      await this.phoneInput.fill(data.phone);
    }
    if (data.email) {
      await this.emailInput.fill(data.email);
    }
    if (data.department) {
      await this.departmentInput.fill(data.department);
    }
    if (data.position) {
      await this.positionInput.fill(data.position);
    }
    if (data.employeeId) {
      await this.employeeIdInput.fill(data.employeeId);
    }
    if (data.status) {
      await this.statusSelect.selectOption(data.status);
    }
    if (data.startDate) {
      await this.startDateInput.fill(data.startDate);
    }
  }

  /**
   * 获取员工行元素
   */
  private getEmployeeRow(employeeName: string): Locator {
    return this.employeeTable.locator(`tr:has-text("${employeeName}")`);
  }

  /**
   * 获取员工操作按钮
   */
  private getEmployeeActionButton(employeeName: string, action: string): Locator {
    const row = this.getEmployeeRow(employeeName);
    return row.locator(`[data-testid="${action}-button"]`);
  }

  /**
   * 获取员工复选框
   */
  private getEmployeeCheckbox(employeeName: string): Locator {
    const row = this.getEmployeeRow(employeeName);
    return row.locator('[data-testid="employee-checkbox"], input[type="checkbox"]');
  }

  /**
   * 验证表单验证错误
   */
  async expectFormValidationError(field: string, message: string): Promise<void> {
    const errorElement = this.employeeModal.locator(`[data-testid="error-${field}"]`);
    await expect(errorElement).toContainText(message);
  }

  /**
   * 取消表单操作
   */
  async cancelForm(): Promise<void> {
    await this.waitAndClick(this.cancelButton);
    await expect(this.employeeModal).not.toBeVisible();
  }

  /**
   * 验证模态框标题
   */
  async expectModalTitle(expectedTitle: string): Promise<void> {
    await expect(this.modalTitle).toContainText(expectedTitle);
  }
}