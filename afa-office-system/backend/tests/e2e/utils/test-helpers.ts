/**
 * 端到端测试辅助工具函数
 */

import { Page, Locator, expect } from '@playwright/test';

/**
 * 等待元素出现并可见
 */
export async function waitForElement(page: Page, selector: string, timeout = 10000): Promise<Locator> {
  const element = page.locator(selector);
  await expect(element).toBeVisible({ timeout });
  return element;
}

/**
 * 等待元素消失
 */
export async function waitForElementToDisappear(page: Page, selector: string, timeout = 10000): Promise<void> {
  const element = page.locator(selector);
  await expect(element).not.toBeVisible({ timeout });
}

/**
 * 填写表单字段
 */
export async function fillForm(page: Page, fields: Record<string, string>): Promise<void> {
  for (const [selector, value] of Object.entries(fields)) {
    await page.fill(selector, value);
  }
}

/**
 * 等待API请求完成
 */
export async function waitForApiRequest(page: Page, urlPattern: string, timeout = 10000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`API request timeout: ${urlPattern}`));
    }, timeout);

    page.on('response', (response) => {
      if (response.url().includes(urlPattern)) {
        clearTimeout(timeoutId);
        resolve(response);
      }
    });
  });
}

/**
 * 模拟文件上传
 */
export async function uploadFile(page: Page, selector: string, fileName: string, content: string, mimeType = 'text/plain'): Promise<void> {
  await page.evaluate(({ selector, fileName, content, mimeType }) => {
    const input = document.querySelector(selector) as HTMLInputElement;
    if (input) {
      const blob = new Blob([content], { type: mimeType });
      const file = new File([blob], fileName, { type: mimeType });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { selector, fileName, content, mimeType });
}

/**
 * 获取表格数据
 */
export async function getTableData(page: Page, tableSelector: string): Promise<string[][]> {
  return await page.evaluate((selector) => {
    const table = document.querySelector(selector) as HTMLTableElement;
    if (!table) return [];
    
    const rows = Array.from(table.querySelectorAll('tr'));
    return rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td, th'));
      return cells.map(cell => cell.textContent?.trim() || '');
    });
  }, tableSelector);
}

/**
 * 等待加载完成
 */
export async function waitForLoading(page: Page, timeout = 30000): Promise<void> {
  // 等待网络空闲
  await page.waitForLoadState('networkidle', { timeout });
  
  // 等待加载指示器消失
  const loadingIndicators = [
    '[data-testid="loading"]',
    '[data-testid="spinner"]',
    '.loading',
    '.spinner'
  ];
  
  for (const selector of loadingIndicators) {
    const element = page.locator(selector);
    if (await element.count() > 0) {
      await expect(element).not.toBeVisible({ timeout: 5000 });
    }
  }
}

/**
 * 截图并保存
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${name}-${timestamp}.png`;
  await page.screenshot({ 
    path: `tests/e2e/reports/screenshots/${fileName}`,
    fullPage: true 
  });
}

/**
 * 验证通知消息
 */
export async function verifyNotification(page: Page, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success'): Promise<void> {
  const notificationSelector = `[data-testid="${type}-message"], [data-testid="notification"][data-type="${type}"]`;
  const notification = page.locator(notificationSelector);
  
  await expect(notification).toBeVisible();
  await expect(notification).toContainText(message);
  
  // 等待通知自动消失或手动关闭
  await page.waitForTimeout(1000);
}

/**
 * 模拟网络延迟
 */
export async function simulateNetworkDelay(page: Page, delay: number): Promise<void> {
  await page.route('**/*', async (route) => {
    await new Promise(resolve => setTimeout(resolve, delay));
    await route.continue();
  });
}

/**
 * 清除所有路由拦截
 */
export async function clearAllRoutes(page: Page): Promise<void> {
  await page.unrouteAll();
}

/**
 * 验证分页功能
 */
export async function verifyPagination(page: Page, totalItems: number, pageSize: number): Promise<void> {
  const totalPages = Math.ceil(totalItems / pageSize);
  
  // 验证分页信息
  await expect(page.locator('[data-testid="pagination-info"]')).toContainText(`共 ${totalItems} 条`);
  
  if (totalPages > 1) {
    // 验证分页按钮
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
    
    // 测试下一页
    if (totalPages > 1) {
      await page.click('[data-testid="next-page-button"]');
      await waitForLoading(page);
      
      // 验证页码变化
      await expect(page.locator('[data-testid="current-page"]')).toContainText('2');
      
      // 返回第一页
      await page.click('[data-testid="prev-page-button"]');
      await waitForLoading(page);
    }
  }
}

/**
 * 验证搜索功能
 */
export async function verifySearch(page: Page, searchTerm: string, expectedResults: number): Promise<void> {
  await page.fill('[data-testid="search-input"]', searchTerm);
  await page.click('[data-testid="search-button"]');
  await waitForLoading(page);
  
  const resultRows = page.locator('[data-testid*="row"]');
  const actualResults = await resultRows.count();
  
  expect(actualResults).toBe(expectedResults);
  
  // 清除搜索
  await page.click('[data-testid="clear-search-button"]');
  await waitForLoading(page);
}

/**
 * 验证排序功能
 */
export async function verifySorting(page: Page, columnSelector: string, expectedOrder: 'asc' | 'desc'): Promise<void> {
  await page.click(columnSelector);
  await waitForLoading(page);
  
  // 获取排序后的数据
  const columnData = await page.locator(`${columnSelector} + td`).allTextContents();
  
  // 验证排序顺序
  const sortedData = [...columnData].sort();
  if (expectedOrder === 'desc') {
    sortedData.reverse();
  }
  
  expect(columnData).toEqual(sortedData);
}

/**
 * 验证表单验证
 */
export async function verifyFormValidation(page: Page, field: string, invalidValue: string, expectedError: string): Promise<void> {
  await page.fill(`[data-testid="${field}"]`, invalidValue);
  await page.click('[data-testid="submit-button"]');
  
  const errorElement = page.locator(`[data-testid="${field}-error"]`);
  await expect(errorElement).toBeVisible();
  await expect(errorElement).toContainText(expectedError);
}

/**
 * 模拟键盘操作
 */
export async function simulateKeyboardShortcut(page: Page, shortcut: string): Promise<void> {
  await page.keyboard.press(shortcut);
}

/**
 * 验证响应式设计
 */
export async function verifyResponsiveDesign(page: Page, breakpoints: { width: number; height: number }[]): Promise<void> {
  for (const breakpoint of breakpoints) {
    await page.setViewportSize(breakpoint);
    await page.waitForTimeout(500); // 等待布局调整
    
    // 验证关键元素仍然可见和可用
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="navigation"]')).toBeVisible();
  }
}

/**
 * 验证无障碍性
 */
export async function verifyAccessibility(page: Page): Promise<void> {
  // 检查页面标题
  const title = await page.title();
  expect(title).toBeTruthy();
  
  // 检查主要地标元素
  await expect(page.locator('main, [role="main"]')).toBeVisible();
  
  // 检查表单标签
  const inputs = page.locator('input, select, textarea');
  const inputCount = await inputs.count();
  
  for (let i = 0; i < inputCount; i++) {
    const input = inputs.nth(i);
    const id = await input.getAttribute('id');
    const ariaLabel = await input.getAttribute('aria-label');
    const ariaLabelledBy = await input.getAttribute('aria-labelledby');
    
    // 每个输入元素都应该有标签
    if (id) {
      const label = page.locator(`label[for="${id}"]`);
      const hasLabel = await label.count() > 0;
      const hasAriaLabel = !!ariaLabel || !!ariaLabelledBy;
      
      expect(hasLabel || hasAriaLabel).toBe(true);
    }
  }
}

/**
 * 生成测试数据
 */
export function generateTestData(type: 'user' | 'merchant' | 'visitor', overrides: Record<string, any> = {}): Record<string, any> {
  const timestamp = Date.now();
  
  const baseData = {
    user: {
      username: `test_user_${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: 'password123',
      role: 'merchant_employee',
      phone: '13800138000',
      department: '测试部门'
    },
    merchant: {
      name: `测试商户_${timestamp}`,
      code: `TEST_${timestamp}`,
      contactPerson: '测试联系人',
      contactPhone: '13800138001',
      contactEmail: `merchant${timestamp}@example.com`,
      address: '测试地址',
      businessLicense: `LICENSE_${timestamp}`
    },
    visitor: {
      name: `访客_${timestamp}`,
      phone: '13700137000',
      company: '访客公司',
      purpose: '商务洽谈',
      visitDate: new Date().toISOString().split('T')[0],
      visitTimeStart: '09:00',
      visitTimeEnd: '17:00'
    }
  };
  
  return { ...baseData[type], ...overrides };
}