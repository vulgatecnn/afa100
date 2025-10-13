import { Page, Locator, expect } from '@playwright/test';

/**
 * 页面对象模式 - 封装页面元素和操作
 */

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('[data-testid="username-input"]');
    this.passwordInput = page.locator('[data-testid="password-input"]');
    this.loginButton = page.locator('[data-testid="login-button"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectLoginSuccess() {
    await expect(this.page).toHaveURL(/\/dashboard/);
  }

  async expectLoginError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}

export class DashboardPage {
  readonly page: Page;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;
  readonly navigationMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.logoutButton = page.locator('[data-testid="logout-button"]');
    this.navigationMenu = page.locator('[data-testid="navigation-menu"]');
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();
  }

  async navigateTo(menuItem: string) {
    await this.navigationMenu.locator(`text=${menuItem}`).click();
  }

  async expectDashboardLoaded() {
    await expect(this.page.locator('h1')).toContainText('仪表板');
  }
}

export class MerchantManagementPage {
  readonly page: Page;
  readonly addMerchantButton: Locator;
  readonly merchantTable: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addMerchantButton = page.locator('[data-testid="add-merchant-button"]');
    this.merchantTable = page.locator('[data-testid="merchant-table"]');
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.statusFilter = page.locator('[data-testid="status-filter"]');
  }

  async addMerchant(merchantData: any) {
    await this.addMerchantButton.click();
    
    // 填写商户信息表单
    await this.page.locator('[data-testid="merchant-name"]').fill(merchantData.name);
    await this.page.locator('[data-testid="contact-person"]').fill(merchantData.contactPerson);
    await this.page.locator('[data-testid="contact-phone"]').fill(merchantData.contactPhone);
    await this.page.locator('[data-testid="email"]').fill(merchantData.email);
    await this.page.locator('[data-testid="address"]').fill(merchantData.address);
    
    await this.page.locator('[data-testid="submit-button"]').click();
  }

  async searchMerchant(searchTerm: string) {
    await this.searchInput.fill(searchTerm);
    await this.page.keyboard.press('Enter');
  }

  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
  }

  async expectMerchantInTable(merchantName: string) {
    await expect(this.merchantTable.locator(`text=${merchantName}`)).toBeVisible();
  }
}

export class EmployeeManagementPage {
  readonly page: Page;
  readonly addEmployeeButton: Locator;
  readonly employeeTable: Locator;
  readonly batchImportButton: Locator;
  readonly exportButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addEmployeeButton = page.locator('[data-testid="add-employee-button"]');
    this.employeeTable = page.locator('[data-testid="employee-table"]');
    this.batchImportButton = page.locator('[data-testid="batch-import-button"]');
    this.exportButton = page.locator('[data-testid="export-button"]');
  }

  async addEmployee(employeeData: any) {
    await this.addEmployeeButton.click();
    
    await this.page.locator('[data-testid="employee-name"]').fill(employeeData.name);
    await this.page.locator('[data-testid="employee-phone"]').fill(employeeData.phone);
    await this.page.locator('[data-testid="employee-email"]').fill(employeeData.email);
    await this.page.locator('[data-testid="department"]').fill(employeeData.department);
    await this.page.locator('[data-testid="position"]').fill(employeeData.position);
    
    await this.page.locator('[data-testid="submit-button"]').click();
  }

  async batchImportEmployees(filePath: string) {
    await this.batchImportButton.click();
    
    const fileInput = this.page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(filePath);
    
    await this.page.locator('[data-testid="import-button"]').click();
  }

  async expectEmployeeInTable(employeeName: string) {
    await expect(this.employeeTable.locator(`text=${employeeName}`)).toBeVisible();
  }
}

export class VisitorManagementPage {
  readonly page: Page;
  readonly visitorTable: Locator;
  readonly statusFilter: Locator;
  readonly dateRangePicker: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.visitorTable = page.locator('[data-testid="visitor-table"]');
    this.statusFilter = page.locator('[data-testid="status-filter"]');
    this.dateRangePicker = page.locator('[data-testid="date-range-picker"]');
    this.approveButton = page.locator('[data-testid="approve-button"]');
    this.rejectButton = page.locator('[data-testid="reject-button"]');
  }

  async approveVisitorApplication(visitorName: string) {
    const row = this.visitorTable.locator(`tr:has-text("${visitorName}")`);
    await row.locator('[data-testid="approve-button"]').click();
    
    // 设置通行码参数
    await this.page.locator('[data-testid="usage-limit"]').fill('3');
    await this.page.locator('[data-testid="valid-hours"]').fill('8');
    
    await this.page.locator('[data-testid="confirm-approve"]').click();
  }

  async rejectVisitorApplication(visitorName: string, reason: string) {
    const row = this.visitorTable.locator(`tr:has-text("${visitorName}")`);
    await row.locator('[data-testid="reject-button"]').click();
    
    await this.page.locator('[data-testid="reject-reason"]').fill(reason);
    await this.page.locator('[data-testid="confirm-reject"]').click();
  }

  async expectVisitorStatus(visitorName: string, status: string) {
    const row = this.visitorTable.locator(`tr:has-text("${visitorName}")`);
    await expect(row.locator('[data-testid="status-badge"]')).toContainText(status);
  }
}

export class DeviceManagementPage {
  readonly page: Page;
  readonly addDeviceButton: Locator;
  readonly deviceTable: Locator;
  readonly deviceStatusFilter: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addDeviceButton = page.locator('[data-testid="add-device-button"]');
    this.deviceTable = page.locator('[data-testid="device-table"]');
    this.deviceStatusFilter = page.locator('[data-testid="device-status-filter"]');
  }

  async addDevice(deviceData: any) {
    await this.addDeviceButton.click();
    
    await this.page.locator('[data-testid="device-name"]').fill(deviceData.name);
    await this.page.locator('[data-testid="device-type"]').selectOption(deviceData.deviceType);
    await this.page.locator('[data-testid="location"]').fill(deviceData.location);
    await this.page.locator('[data-testid="ip-address"]').fill(deviceData.ipAddress);
    await this.page.locator('[data-testid="vendor"]').selectOption(deviceData.vendorId.toString());
    
    await this.page.locator('[data-testid="submit-button"]').click();
  }

  async expectDeviceInTable(deviceName: string) {
    await expect(this.deviceTable.locator(`text=${deviceName}`)).toBeVisible();
  }

  async expectDeviceStatus(deviceName: string, status: string) {
    const row = this.deviceTable.locator(`tr:has-text("${deviceName}")`);
    await expect(row.locator('[data-testid="device-status"]')).toContainText(status);
  }
}

export class AccessRecordsPage {
  readonly page: Page;
  readonly recordsTable: Locator;
  readonly dateFilter: Locator;
  readonly deviceFilter: Locator;
  readonly userFilter: Locator;
  readonly exportButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.recordsTable = page.locator('[data-testid="records-table"]');
    this.dateFilter = page.locator('[data-testid="date-filter"]');
    this.deviceFilter = page.locator('[data-testid="device-filter"]');
    this.userFilter = page.locator('[data-testid="user-filter"]');
    this.exportButton = page.locator('[data-testid="export-button"]');
  }

  async filterByDate(startDate: string, endDate: string) {
    await this.dateFilter.click();
    await this.page.locator('[data-testid="start-date"]').fill(startDate);
    await this.page.locator('[data-testid="end-date"]').fill(endDate);
    await this.page.locator('[data-testid="apply-filter"]').click();
  }

  async filterByDevice(deviceName: string) {
    await this.deviceFilter.selectOption(deviceName);
  }

  async exportRecords() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportButton.click();
    const download = await downloadPromise;
    return download;
  }

  async expectRecordInTable(userName: string, deviceName: string) {
    const row = this.recordsTable.locator(`tr:has-text("${userName}"):has-text("${deviceName}")`);
    await expect(row).toBeVisible();
  }
}