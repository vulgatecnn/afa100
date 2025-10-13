import { Page, expect } from '@playwright/test';

export class TestHelpers {
  static async loginAs(page: Page, userType: string, baseUrl = 'http://localhost:5000') {
    const users = {
      tenantAdmin: {
        username: 'tenant_admin',
        password: 'Test123456'
      },
      merchantAdmin: {
        username: 'merchant_admin', 
        password: 'Test123456'
      },
      employee: {
        username: 'employee_001',
        password: 'Test123456'
      }
    };

    const user = users[userType as keyof typeof users];
    if (!user) {
      throw new Error(`Unknown user type: ${userType}`);
    }

    await page.goto(`${baseUrl}/login`);
    await page.locator('[data-testid="username"]').fill(user.username);
    await page.locator('[data-testid="password"]').fill(user.password);
    await page.locator('[data-testid="login-button"]').click();
    
    // 等待登录成功
    await expect(page).toHaveURL(/\/dashboard/);
  }

  static async expectNotification(page: Page, message: string, type = 'success') {
    const notification = page.locator(`[data-testid="notification-${type}"]`);
    await expect(notification).toContainText(message);
  }

  static async expectFormError(page: Page, field: string, message: string) {
    const errorElement = page.locator(`[data-testid="error-${field}"]`);
    await expect(errorElement).toContainText(message);
  }

  static async fillForm(page: Page, data: Record<string, string>) {
    for (const [field, value] of Object.entries(data)) {
      await page.locator(`[data-testid="${field}"]`).fill(value);
    }
  }

  static async waitForPageLoad(page: Page) {
    await page.waitForLoadState('networkidle');
  }

  static async cleanupTestData(page: Page) {
    // 这里可以添加清理测试数据的逻辑
    console.log('Cleaning up test data...');
  }

  static async mockApiResponse(page: Page, url: string, response: any) {
    await page.route(url, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: response,
          message: 'Success'
        })
      });
    });
  }

  static async mockApiError(page: Page, url: string, status: number, message: string) {
    await page.route(url, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message,
          code: status
        })
      });
    });
  }

  static async mockDeviceApi(page: Page) {
    // 模拟设备API响应
    await page.route('**/api/v1/device/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { result: 'success' }
        })
      });
    });
  }

  static async waitForDownload(page: Page, selector: string) {
    const downloadPromise = page.waitForEvent('download');
    await page.locator(selector).click();
    return await downloadPromise;
  }
}