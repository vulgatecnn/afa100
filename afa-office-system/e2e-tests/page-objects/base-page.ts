import { Page, Locator, expect } from '@playwright/test';

/**
 * 基础页面类 - 所有页面对象的基类
 * 提供通用的页面操作和验证方法
 */
export abstract class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * 导航到页面
   */
  abstract goto(): Promise<void>;

  /**
   * 检查页面是否已加载
   */
  abstract isLoaded(): Promise<boolean>;

  /**
   * 等待页面加载完成
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * 等待元素可见
   */
  async waitForElement(locator: Locator, timeout = 10000): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * 截图
   */
  async takeScreenshot(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({ 
      path: `screenshots/${name}_${timestamp}.png`,
      fullPage: true 
    });
  }

  /**
   * 等待API响应
   */
  async waitForApiResponse(urlPattern: string, timeout = 10000): Promise<any> {
    const response = await this.page.waitForResponse(
      response => response.url().includes(urlPattern) && response.status() === 200,
      { timeout }
    );
    return await response.json();
  }

  /**
   * 检查页面标题
   */
  async expectPageTitle(title: string): Promise<void> {
    await expect(this.page).toHaveTitle(new RegExp(title, 'i'));
  }

  /**
   * 检查URL
   */
  async expectUrl(urlPattern: string | RegExp): Promise<void> {
    if (typeof urlPattern === 'string') {
      await expect(this.page).toHaveURL(new RegExp(urlPattern));
    } else {
      await expect(this.page).toHaveURL(urlPattern);
    }
  }

  /**
   * 等待加载状态
   */
  async waitForLoadingComplete(): Promise<void> {
    // 等待加载指示器消失
    const loadingIndicator = this.page.locator('[data-testid="loading"], .ant-spin-spinning');
    try {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      // 如果没有加载指示器，忽略错误
    }
  }

  /**
   * 检查通知消息
   */
  async expectNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success'): Promise<void> {
    const notification = this.page.locator(`[data-testid="notification-${type}"], .ant-notification-notice-${type}`);
    await expect(notification).toContainText(message);
  }

  /**
   * 检查表单错误
   */
  async expectFormError(field: string, message: string): Promise<void> {
    const errorElement = this.page.locator(`[data-testid="error-${field}"], .ant-form-item-explain-error`);
    await expect(errorElement).toContainText(message);
  }

  /**
   * 填写表单
   */
  async fillForm(data: Record<string, string>): Promise<void> {
    for (const [field, value] of Object.entries(data)) {
      const input = this.page.locator(`[data-testid="${field}"], [name="${field}"]`);
      await input.fill(value);
    }
  }

  /**
   * 点击按钮并等待响应
   */
  async clickAndWaitForResponse(buttonSelector: string, apiPattern: string): Promise<any> {
    const responsePromise = this.waitForApiResponse(apiPattern);
    await this.page.locator(buttonSelector).click();
    return await responsePromise;
  }

  /**
   * 检查元素是否存在
   */
  async isElementVisible(selector: string): Promise<boolean> {
    try {
      await this.page.locator(selector).waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 滚动到元素
   */
  async scrollToElement(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * 等待并点击元素
   */
  async waitAndClick(locator: Locator): Promise<void> {
    await this.waitForElement(locator);
    await locator.click();
  }
}