import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base-page';

/**
 * 设备数据接口
 */
export interface DeviceData {
  name: string;
  deviceType: 'card_reader' | 'face_recognition' | 'qr_scanner' | 'turnstile';
  location: string;
  ipAddress: string;
  port?: number;
  vendorId: number;
  model?: string;
  serialNumber?: string;
  status?: 'online' | 'offline' | 'maintenance' | 'error';
}

/**
 * 租务管理端设备管理页面对象
 * 提供设备的增删改查、状态监控和权限配置功能
 */
export class TenantDeviceManagementPage extends BasePage {
  // 页面主要元素
  readonly pageTitle: Locator;
  readonly addDeviceButton: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly deviceTable: Locator;
  readonly pagination: Locator;

  // 筛选器
  readonly statusFilter: Locator;
  readonly typeFilter: Locator;
  readonly locationFilter: Locator;
  readonly vendorFilter: Locator;

  // 批量操作
  readonly selectAllCheckbox: Locator;
  readonly batchActionButton: Locator;
  readonly batchTestButton: Locator;
  readonly batchRebootButton: Locator;
  readonly batchMaintenanceButton: Locator;

  // 设备状态监控
  readonly onlineDevicesCount: Locator;
  readonly offlineDevicesCount: Locator;
  readonly errorDevicesCount: Locator;
  readonly maintenanceDevicesCount: Locator;
  readonly refreshStatusButton: Locator;

  // 设备表单模态框
  readonly deviceModal: Locator;
  readonly modalTitle: Locator;
  readonly nameInput: Locator;
  readonly typeSelect: Locator;
  readonly locationInput: Locator;
  readonly ipAddressInput: Locator;
  readonly portInput: Locator;
  readonly vendorSelect: Locator;
  readonly modelInput: Locator;
  readonly serialNumberInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly testConnectionButton: Locator;

  // 设备详情模态框
  readonly deviceDetailModal: Locator;
  readonly deviceStatusBadge: Locator;
  readonly lastOnlineTime: Locator;
  readonly connectionInfo: Locator;
  readonly deviceLogs: Locator;

  // 权限配置模态框
  readonly permissionModal: Locator;
  readonly merchantPermissionList: Locator;
  readonly timeRangeSettings: Locator;
  readonly accessRuleSettings: Locator;

  constructor(page: Page) {
    super(page);

    // 页面主要元素
    this.pageTitle = page.locator('[data-testid="page-title"], h1');
    this.addDeviceButton = page.locator('[data-testid="add-device-button"]');
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.searchButton = page.locator('[data-testid="search-button"]');
    this.resetButton = page.locator('[data-testid="reset-button"]');
    this.deviceTable = page.locator('[data-testid="device-table"]');
    this.pagination = page.locator('[data-testid="pagination"], .ant-pagination');

    // 筛选器
    this.statusFilter = page.locator('[data-testid="status-filter"]');
    this.typeFilter = page.locator('[data-testid="type-filter"]');
    this.locationFilter = page.locator('[data-testid="location-filter"]');
    this.vendorFilter = page.locator('[data-testid="vendor-filter"]');

    // 批量操作
    this.selectAllCheckbox = page.locator('[data-testid="select-all-checkbox"]');
    this.batchActionButton = page.locator('[data-testid="batch-action-button"]');
    this.batchTestButton = page.locator('[data-testid="batch-test-button"]');
    this.batchRebootButton = page.locator('[data-testid="batch-reboot-button"]');
    this.batchMaintenanceButton = page.locator('[data-testid="batch-maintenance-button"]');

    // 设备状态监控
    this.onlineDevicesCount = page.locator('[data-testid="online-devices-count"]');
    this.offlineDevicesCount = page.locator('[data-testid="offline-devices-count"]');
    this.errorDevicesCount = page.locator('[data-testid="error-devices-count"]');
    this.maintenanceDevicesCount = page.locator('[data-testid="maintenance-devices-count"]');
    this.refreshStatusButton = page.locator('[data-testid="refresh-status-button"]');

    // 设备表单模态框
    this.deviceModal = page.locator('[data-testid="device-modal"], .ant-modal');
    this.modalTitle = page.locator('[data-testid="modal-title"], .ant-modal-title');
    this.nameInput = page.locator('[data-testid="device-name"]');
    this.typeSelect = page.locator('[data-testid="device-type"]');
    this.locationInput = page.locator('[data-testid="location"]');
    this.ipAddressInput = page.locator('[data-testid="ip-address"]');
    this.portInput = page.locator('[data-testid="port"]');
    this.vendorSelect = page.locator('[data-testid="vendor"]');
    this.modelInput = page.locator('[data-testid="model"]');
    this.serialNumberInput = page.locator('[data-testid="serial-number"]');
    this.submitButton = page.locator('[data-testid="submit-button"]');
    this.cancelButton = page.locator('[data-testid="cancel-button"]');
    this.testConnectionButton = page.locator('[data-testid="test-connection-button"]');

    // 设备详情模态框
    this.deviceDetailModal = page.locator('[data-testid="device-detail-modal"]');
    this.deviceStatusBadge = page.locator('[data-testid="device-status-badge"]');
    this.lastOnlineTime = page.locator('[data-testid="last-online-time"]');
    this.connectionInfo = page.locator('[data-testid="connection-info"]');
    this.deviceLogs = page.locator('[data-testid="device-logs"]');

    // 权限配置模态框
    this.permissionModal = page.locator('[data-testid="permission-modal"]');
    this.merchantPermissionList = page.locator('[data-testid="merchant-permission-list"]');
    this.timeRangeSettings = page.locator('[data-testid="time-range-settings"]');
    this.accessRuleSettings = page.locator('[data-testid="access-rule-settings"]');
  }

  /**
   * 导航到设备管理页面
   */
  async goto(): Promise<void> {
    await this.page.goto('/tenant/devices');
    await this.waitForLoad();
  }

  /**
   * 检查页面是否已加载
   */
  async isLoaded(): Promise<boolean> {
    try {
      await this.pageTitle.waitFor({ state: 'visible', timeout: 5000 });
      await this.deviceTable.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证页面已加载
   */
  async expectPageLoaded(): Promise<void> {
    await expect(this.pageTitle).toContainText('设备管理');
    await expect(this.deviceTable).toBeVisible();
    await expect(this.addDeviceButton).toBeVisible();
  }

  /**
   * 添加新设备
   */
  async addDevice(deviceData: DeviceData): Promise<void> {
    await this.waitAndClick(this.addDeviceButton);
    await this.waitForElement(this.deviceModal);
    
    await this.fillDeviceForm(deviceData);
    
    // 测试连接
    await this.waitAndClick(this.testConnectionButton);
    await this.expectNotification('设备连接测试成功');
    
    await this.waitAndClick(this.submitButton);
    await this.waitForLoadingComplete();
    await this.expectNotification('设备添加成功');
  }

  /**
   * 编辑设备信息
   */
  async editDevice(deviceName: string, updatedData: Partial<DeviceData>): Promise<void> {
    const editButton = this.getDeviceActionButton(deviceName, 'edit');
    await this.waitAndClick(editButton);
    await this.waitForElement(this.deviceModal);
    
    await this.fillDeviceForm(updatedData);
    await this.waitAndClick(this.submitButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('设备信息更新成功');
  }

  /**
   * 删除设备
   */
  async deleteDevice(deviceName: string): Promise<void> {
    const deleteButton = this.getDeviceActionButton(deviceName, 'delete');
    await this.waitAndClick(deleteButton);
    
    const confirmModal = this.page.locator('[data-testid="confirm-modal"]');
    await this.waitForElement(confirmModal);
    
    const confirmButton = confirmModal.locator('[data-testid="confirm-button"]');
    await this.waitAndClick(confirmButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('设备删除成功');
  }

  /**
   * 测试设备连接
   */
  async testDeviceConnection(deviceName: string): Promise<void> {
    const testButton = this.getDeviceActionButton(deviceName, 'test');
    await this.waitAndClick(testButton);
    
    await this.waitForLoadingComplete();
    // 根据测试结果显示不同的通知
    const successNotification = this.page.locator('[data-testid="notification-success"]');
    const errorNotification = this.page.locator('[data-testid="notification-error"]');
    
    const isSuccess = await successNotification.isVisible().catch(() => false);
    const isError = await errorNotification.isVisible().catch(() => false);
    
    expect(isSuccess || isError).toBeTruthy();
  }

  /**
   * 重启设备
   */
  async rebootDevice(deviceName: string): Promise<void> {
    const rebootButton = this.getDeviceActionButton(deviceName, 'reboot');
    await this.waitAndClick(rebootButton);
    
    const confirmModal = this.page.locator('[data-testid="confirm-modal"]');
    await this.waitForElement(confirmModal);
    
    const confirmButton = confirmModal.locator('[data-testid="confirm-button"]');
    await this.waitAndClick(confirmButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('设备重启指令已发送');
  }

  /**
   * 设置设备维护模式
   */
  async setDeviceMaintenance(deviceName: string, enable: boolean): Promise<void> {
    const maintenanceButton = this.getDeviceActionButton(deviceName, 'maintenance');
    await this.waitAndClick(maintenanceButton);
    
    if (!enable) {
      const confirmModal = this.page.locator('[data-testid="confirm-modal"]');
      await this.waitForElement(confirmModal);
      
      const confirmButton = confirmModal.locator('[data-testid="confirm-button"]');
      await this.waitAndClick(confirmButton);
    }
    
    await this.waitForLoadingComplete();
    const message = enable ? '设备已进入维护模式' : '设备已退出维护模式';
    await this.expectNotification(message);
  }

  /**
   * 查看设备详情
   */
  async viewDeviceDetails(deviceName: string): Promise<void> {
    const detailButton = this.getDeviceActionButton(deviceName, 'detail');
    await this.waitAndClick(detailButton);
    await this.waitForElement(this.deviceDetailModal);
  }

  /**
   * 配置设备权限
   */
  async configureDevicePermissions(deviceName: string, merchantNames: string[]): Promise<void> {
    const permissionButton = this.getDeviceActionButton(deviceName, 'permission');
    await this.waitAndClick(permissionButton);
    await this.waitForElement(this.permissionModal);
    
    // 选择商户权限
    for (const merchantName of merchantNames) {
      const merchantCheckbox = this.merchantPermissionList.locator(`input[value="${merchantName}"]`);
      await merchantCheckbox.check();
    }
    
    const saveButton = this.permissionModal.locator('[data-testid="save-button"]');
    await this.waitAndClick(saveButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('设备权限配置成功');
  }

  /**
   * 搜索设备
   */
  async searchDevice(searchTerm: string): Promise<void> {
    await this.searchInput.fill(searchTerm);
    await this.waitAndClick(this.searchButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 按状态筛选设备
   */
  async filterByStatus(status: string): Promise<void> {
    await this.statusFilter.selectOption(status);
    await this.waitForLoadingComplete();
  }

  /**
   * 按设备类型筛选
   */
  async filterByType(deviceType: string): Promise<void> {
    await this.typeFilter.selectOption(deviceType);
    await this.waitForLoadingComplete();
  }

  /**
   * 按位置筛选
   */
  async filterByLocation(location: string): Promise<void> {
    await this.locationFilter.selectOption(location);
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
   * 验证设备在表格中显示
   */
  async expectDeviceInTable(deviceName: string): Promise<void> {
    const deviceRow = this.getDeviceRow(deviceName);
    await expect(deviceRow).toBeVisible();
  }

  /**
   * 验证设备状态
   */
  async expectDeviceStatus(deviceName: string, expectedStatus: string): Promise<void> {
    const deviceRow = this.getDeviceRow(deviceName);
    const statusBadge = deviceRow.locator('[data-testid="device-status"]');
    await expect(statusBadge).toContainText(expectedStatus);
  }

  /**
   * 验证设备连接状态
   */
  async expectDeviceConnectionStatus(deviceName: string, isOnline: boolean): Promise<void> {
    const deviceRow = this.getDeviceRow(deviceName);
    const connectionStatus = deviceRow.locator('[data-testid="connection-status"]');
    
    if (isOnline) {
      await expect(connectionStatus).toContainText('在线');
    } else {
      await expect(connectionStatus).toContainText('离线');
    }
  }

  /**
   * 批量选择设备
   */
  async selectDevices(deviceNames: string[]): Promise<void> {
    for (const name of deviceNames) {
      const checkbox = this.getDeviceCheckbox(name);
      await checkbox.check();
    }
  }

  /**
   * 批量测试设备连接
   */
  async batchTestDevices(deviceNames: string[]): Promise<void> {
    await this.selectDevices(deviceNames);
    await this.waitAndClick(this.batchActionButton);
    await this.waitAndClick(this.batchTestButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('批量连接测试已启动');
  }

  /**
   * 批量重启设备
   */
  async batchRebootDevices(deviceNames: string[]): Promise<void> {
    await this.selectDevices(deviceNames);
    await this.waitAndClick(this.batchActionButton);
    await this.waitAndClick(this.batchRebootButton);
    
    const confirmModal = this.page.locator('[data-testid="confirm-modal"]');
    await this.waitForElement(confirmModal);
    
    const confirmButton = confirmModal.locator('[data-testid="confirm-button"]');
    await this.waitAndClick(confirmButton);
    
    await this.waitForLoadingComplete();
    await this.expectNotification('批量重启指令已发送');
  }

  /**
   * 刷新设备状态
   */
  async refreshDeviceStatus(): Promise<void> {
    await this.waitAndClick(this.refreshStatusButton);
    await this.waitForLoadingComplete();
  }

  /**
   * 验证设备状态统计
   */
  async expectDeviceStatusCounts(): Promise<{
    online: number;
    offline: number;
    error: number;
    maintenance: number;
  }> {
    await this.waitForLoadingComplete();
    
    const onlineCount = await this.getCountFromElement(this.onlineDevicesCount);
    const offlineCount = await this.getCountFromElement(this.offlineDevicesCount);
    const errorCount = await this.getCountFromElement(this.errorDevicesCount);
    const maintenanceCount = await this.getCountFromElement(this.maintenanceDevicesCount);
    
    return {
      online: onlineCount,
      offline: offlineCount,
      error: errorCount,
      maintenance: maintenanceCount
    };
  }

  /**
   * 填写设备表单
   */
  private async fillDeviceForm(data: Partial<DeviceData>): Promise<void> {
    if (data.name) {
      await this.nameInput.fill(data.name);
    }
    if (data.deviceType) {
      await this.typeSelect.selectOption(data.deviceType);
    }
    if (data.location) {
      await this.locationInput.fill(data.location);
    }
    if (data.ipAddress) {
      await this.ipAddressInput.fill(data.ipAddress);
    }
    if (data.port) {
      await this.portInput.fill(data.port.toString());
    }
    if (data.vendorId) {
      await this.vendorSelect.selectOption(data.vendorId.toString());
    }
    if (data.model) {
      await this.modelInput.fill(data.model);
    }
    if (data.serialNumber) {
      await this.serialNumberInput.fill(data.serialNumber);
    }
  }

  /**
   * 获取设备行元素
   */
  private getDeviceRow(deviceName: string): Locator {
    return this.deviceTable.locator(`tr:has-text("${deviceName}")`);
  }

  /**
   * 获取设备操作按钮
   */
  private getDeviceActionButton(deviceName: string, action: string): Locator {
    const row = this.getDeviceRow(deviceName);
    return row.locator(`[data-testid="${action}-button"]`);
  }

  /**
   * 获取设备复选框
   */
  private getDeviceCheckbox(deviceName: string): Locator {
    const row = this.getDeviceRow(deviceName);
    return row.locator('[data-testid="device-checkbox"], input[type="checkbox"]');
  }

  /**
   * 从元素获取数值
   */
  private async getCountFromElement(element: Locator): Promise<number> {
    const text = await element.textContent();
    return parseInt(text?.replace(/[^\d]/g, '') || '0');
  }
}