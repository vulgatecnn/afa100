import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('[data-testid="username"]');
    this.passwordInput = page.locator('[data-testid="password"]');
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

  constructor(page: Page) {
    this.page = page;
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.logoutButton = page.locator('[data-testid="logout-button"]');
  }

  async expectDashboardLoaded() {
    await expect(this.page.locator('[data-testid="dashboard"]')).toBeVisible();
  }

  async navigateTo(menuItem: string) {
    await this.page.locator(`[data-testid="nav-${menuItem}"]`).click();
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();
  }
}

export class MerchantManagementPage {
  readonly page: Page;
  readonly addButton: Locator;
  readonly searchInput: Locator;
  readonly merchantTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addButton = page.locator('[data-testid="add-merchant"]');
    this.searchInput = page.locator('[data-testid="search-merchant"]');
    this.merchantTable = page.locator('[data-testid="merchant-table"]');
  }

  async addMerchant(merchant: any) {
    await this.addButton.click();
    await this.page.locator('[data-testid="merchant-name"]').fill(merchant.name);
    await this.page.locator('[data-testid="contact-person"]').fill(merchant.contactPerson);
    await this.page.locator('[data-testid="contact-phone"]').fill(merchant.contactPhone);
    await this.page.locator('[data-testid="submit-button"]').click();
  }

  async searchMerchant(name: string) {
    await this.searchInput.fill(name);
    await this.page.keyboard.press('Enter');
  }

  async expectMerchantInTable(name: string) {
    await expect(this.merchantTable).toContainText(name);
  }

  async filterByStatus(status: string) {
    await this.page.locator('[data-testid="status-filter"]').selectOption(status);
  }
}

export class VisitorManagementPage {
  readonly page: Page;
  readonly visitorTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.visitorTable = page.locator('[data-testid="visitor-table"]');
  }

  async expectVisitorStatus(name: string, status: string) {
    const row = this.page.locator(`tr:has-text("${name}")`);
    await expect(row.locator('[data-testid="status-badge"]')).toContainText(status);
  }

  async approveVisitorApplication(name: string) {
    const row = this.page.locator(`tr:has-text("${name}")`);
    await row.locator('[data-testid="approve-button"]').click();
  }

  async rejectVisitorApplication(name: string, reason: string) {
    const row = this.page.locator(`tr:has-text("${name}")`);
    await row.locator('[data-testid="reject-button"]').click();
    await this.page.locator('[data-testid="reject-reason"]').fill(reason);
    await this.page.locator('[data-testid="confirm-reject"]').click();
  }
}

export class EmployeeManagementPage {
  readonly page: Page;
  readonly addButton: Locator;
  readonly employeeTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addButton = page.locator('[data-testid="add-employee"]');
    this.employeeTable = page.locator('[data-testid="employee-table"]');
  }

  async addEmployee(employee: any) {
    await this.addButton.click();
    await this.page.locator('[data-testid="employee-name"]').fill(employee.name);
    await this.page.locator('[data-testid="employee-phone"]').fill(employee.phone);
    await this.page.locator('[data-testid="employee-email"]').fill(employee.email);
    await this.page.locator('[data-testid="submit-button"]').click();
  }
}

export class DeviceManagementPage {
  readonly page: Page;
  readonly addButton: Locator;
  readonly deviceTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addButton = page.locator('[data-testid="add-device"]');
    this.deviceTable = page.locator('[data-testid="device-table"]');
  }

  async addDevice(device: any) {
    await this.addButton.click();
    await this.page.locator('[data-testid="device-name"]').fill(device.name);
    await this.page.locator('[data-testid="device-type"]').selectOption(device.deviceType);
    await this.page.locator('[data-testid="device-location"]').fill(device.location);
    await this.page.locator('[data-testid="submit-button"]').click();
  }
}

export class AccessRecordsPage {
  readonly page: Page;
  readonly recordsTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.recordsTable = page.locator('[data-testid="access-records-table"]');
  }

  async expectRecordInTable(userName: string, deviceName: string) {
    const row = this.page.locator(`tr:has-text("${userName}"):has-text("${deviceName}")`);
    await expect(row).toBeVisible();
  }
}