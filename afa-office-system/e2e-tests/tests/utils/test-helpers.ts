import { Page, expect } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';

/**
 * 测试辅助工具函数
 */

export class TestHelpers {
  /**
   * 登录指定角色的用户
   */
  static async loginAs(page: Page, userType: keyof typeof testUsers, baseUrl: string = 'http://localhost:5000') {
    const user = testUsers[userType];
    
    await page.goto(`${baseUrl}/login`);
    
    await page.locator('[data-testid="username-input"]').fill(user.username);
    await page.locator('[data-testid="password-input"]').fill(user.password);
    await page.locator('[data-testid="login-button"]').click();
    
    // 等待登录成功
    await expect(page).toHaveURL(/\/dashboard/);
    
    // 验证用户信息
    await expect(page.locator('[data-testid="user-name"]')).toContainText(user.name);
  }

  /**
   * 等待API请求完成
   */
  static async waitForApiResponse(page: Page, apiPath: string, timeout: number = 10000) {
    return page.waitForResponse(
      response => response.url().includes(apiPath) && response.status() === 200,
      { timeout }
    );
  }

  /**
   * 模拟API响应
   */
  static async mockApiResponse(page: Page, apiPath: string, responseData: any) {
    await page.route(`**${apiPath}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: responseData,
          message: '操作成功',
          timestamp: new Date().toISOString()
        })
      });
    });
  }

  /**
   * 模拟API错误响应
   */
  static async mockApiError(page: Page, apiPath: string, errorCode: number, errorMessage: string) {
    await page.route(`**${apiPath}`, route => {
      route.fulfill({
        status: errorCode,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          code: errorCode,
          message: errorMessage,
          data: null,
          timestamp: new Date().toISOString()
        })
      });
    });
  }

  /**
   * 等待页面加载完成
   */
  static async waitForPageLoad(page: Page) {
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');
  }

  /**
   * 截图并保存
   */
  static async takeScreenshot(page: Page, name: string) {
    await page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * 填写表单
   */
  static async fillForm(page: Page, formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      const input = page.locator(`[data-testid="${field}"]`);
      await input.fill(value);
    }
  }

  /**
   * 验证表单错误
   */
  static async expectFormError(page: Page, field: string, errorMessage: string) {
    const errorElement = page.locator(`[data-testid="${field}-error"]`);
    await expect(errorElement).toContainText(errorMessage);
  }

  /**
   * 等待通知消息
   */
  static async expectNotification(page: Page, message: string, type: 'success' | 'error' | 'warning' = 'success') {
    const notification = page.locator(`[data-testid="notification-${type}"]`);
    await expect(notification).toContainText(message);
    
    // 等待通知消失
    await expect(notification).toBeHidden({ timeout: 5000 });
  }

  /**
   * 模拟文件上传
   */
  static async uploadFile(page: Page, inputSelector: string, filePath: string) {
    const fileInput = page.locator(inputSelector);
    await fileInput.setInputFiles(filePath);
  }

  /**
   * 等待下载完成
   */
  static async waitForDownload(page: Page, triggerSelector: string) {
    const downloadPromise = page.waitForEvent('download');
    await page.locator(triggerSelector).click();
    const download = await downloadPromise;
    return download;
  }

  /**
   * 验证表格数据
   */
  static async expectTableData(page: Page, tableSelector: string, expectedData: string[][]) {
    const table = page.locator(tableSelector);
    
    for (let i = 0; i < expectedData.length; i++) {
      const row = table.locator(`tbody tr:nth-child(${i + 1})`);
      
      for (let j = 0; j < expectedData[i].length; j++) {
        const cell = row.locator(`td:nth-child(${j + 1})`);
        await expect(cell).toContainText(expectedData[i][j]);
      }
    }
  }

  /**
   * 模拟设备API调用
   */
  static async mockDeviceApi(page: Page) {
    // 模拟设备获取人脸数据
    await page.route('**/api/v1/device/face-data', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            faces: [
              {
                userId: 1,
                faceId: 'face_001',
                imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
                updatedAt: '2024-01-01T00:00:00Z'
              }
            ],
            total: 1
          }
        })
      });
    });

    // 模拟设备用户验证
    await page.route('**/api/v1/device/user-validation', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            valid: true,
            userId: 1,
            userName: '张三',
            accessLevel: 'employee',
            validUntil: '2024-12-31T23:59:59Z'
          }
        })
      });
    });

    // 模拟设备上报通行记录
    await page.route('**/api/v1/device/access-log', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: null,
          message: '通行记录已记录'
        })
      });
    });
  }

  /**
   * 清理测试数据
   */
  static async cleanupTestData(page: Page) {
    // 清理可能的测试数据
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * 等待元素可见并可交互
   */
  static async waitForElement(page: Page, selector: string, timeout: number = 10000) {
    const element = page.locator(selector);
    await expect(element).toBeVisible({ timeout });
    await expect(element).toBeEnabled({ timeout });
    return element;
  }

  /**
   * 验证权限控制
   */
  static async expectPermissionDenied(page: Page, action: () => Promise<void>) {
    try {
      await action();
      throw new Error('期望权限被拒绝，但操作成功了');
    } catch (error) {
      // 验证是否显示权限错误消息
      await expect(page.locator('[data-testid="permission-error"]')).toBeVisible();
    }
  }
}