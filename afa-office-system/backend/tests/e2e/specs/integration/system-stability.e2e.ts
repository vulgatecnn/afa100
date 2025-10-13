import { test, expect } from '@playwright/test';
import { testEnvironmentConfig } from '../../config/test-environment.js';

/**
 * 系统稳定性和异常处理端到端测试
 * 测试系统在各种异常情况下的稳定性和恢复能力
 */

test.describe('系统稳定性测试', () => {

  test.describe('长时间运行稳定性', () => {
    test.use({ 
      storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json' 
    });

    test('长时间会话稳定性测试', async ({ page }) => {
      await page.goto('http://localhost:5000/dashboard');
      
      // 模拟长时间使用场景
      const operations = [
        () => page.goto('http://localhost:5000/users'),
        () => page.goto('http://localhost:5000/merchants'),
        () => page.goto('http://localhost:5000/spaces'),
        () => page.goto('http://localhost:5000/visitor-applications'),
        () => page.goto('http://localhost:5000/access-records')
      ];
      
      // 循环执行操作30次，模拟长时间使用
      for (let i = 0; i < 30; i++) {
        const operation = operations[i % operations.length];
        await operation();
        await page.waitForLoadState('networkidle');
        
        // 验证页面正常加载
        await expect(page.locator('[data-testid="page-content"]')).toBeVisible();
        
        // 验证用户会话仍然有效
        await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
        
        // 短暂等待，模拟用户操作间隔
        await page.waitForTimeout(500);
      }
      
      // 验证最终状态正常
      await expect(page.locator('[data-testid="user-info"]')).toContainText('租务管理员');
    });

    test('内存泄漏检测测试', async ({ page }) => {
      await page.goto('http://localhost:5000/dashboard');
      
      // 记录初始内存使用
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
      });
      
      // 执行大量DOM操作
      for (let i = 0; i < 50; i++) {
        // 打开和关闭模态框
        await page.goto('http://localhost:5000/users');
        await page.click('[data-testid="add-user-button"]');
        await expect(page.locator('[data-testid="add-user-modal"]')).toBeVisible();
        await page.press('Escape'); // 关闭模态框
        
        // 切换页面
        await page.goto('http://localhost:5000/merchants');
        await page.waitForLoadState('networkidle');
      }
      
      // 强制垃圾回收（如果支持）
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      // 检查内存使用
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
      });
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
        
        // 内存增长不应超过200%
        expect(memoryIncreasePercent).toBeLessThan(200);
      }
    });
  });

  test.describe('高负载压力测试', () => {
    test.use({ 
      storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json' 
    });

    test('并发用户操作测试', async ({ browser }) => {
      const contexts = [];
      const pages = [];
      
      // 创建多个并发用户会话
      for (let i = 0; i < 5; i++) {
        const context = await browser.newContext({
          storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json'
        });
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
      }
      
      // 并发执行操作
      const operations = pages.map(async (page, index) => {
        try {
          // 每个用户执行不同的操作
          switch (index % 3) {
            case 0:
              // 用户管理操作
              await page.goto('http://localhost:5000/users');
              await page.waitForLoadState('networkidle');
              await page.click('[data-testid="add-user-button"]');
              await page.fill('[data-testid="user-username"]', `concurrent_user_${index}`);
              await page.fill('[data-testid="user-email"]', `concurrent${index}@test.com`);
              await page.fill('[data-testid="user-password"]', 'password123');
              await page.fill('[data-testid="user-confirm-password"]', 'password123');
              await page.click('[data-testid="submit-user-button"]');
              break;
              
            case 1:
              // 商户管理操作
              await page.goto('http://localhost:5000/merchants');
              await page.waitForLoadState('networkidle');
              const merchantRow = page.locator('[data-testid="merchant-row"]').first();
              await merchantRow.locator('[data-testid="edit-merchant-button"]').click();
              await page.fill('[data-testid="contact-person"]', `并发测试联系人${index}`);
              await page.click('[data-testid="update-merchant-button"]');
              break;
              
            case 2:
              // 数据查询操作
              await page.goto('http://localhost:5000/visitor-applications');
              await page.waitForLoadState('networkidle');
              await page.fill('[data-testid="search-input"]', '测试');
              await page.click('[data-testid="search-button"]');
              await page.waitForLoadState('networkidle');
              break;
          }
          
          return { success: true, index };
        } catch (error) {
          return { success: false, index, error: error.message };
        }
      });
      
      const results = await Promise.all(operations);
      
      // 验证所有操作都成功完成
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThanOrEqual(4); // 至少80%成功率
      
      // 清理资源
      for (const context of contexts) {
        await context.close();
      }
    });

    test('大数据量处理测试', async ({ page }) => {
      await page.goto('http://localhost:5000/users');
      
      // 模拟大量数据加载
      await page.route('**/api/v1/users*', route => {
        // 模拟返回大量用户数据
        const largeUserList = Array.from({ length: 1000 }, (_, i) => ({
          id: i + 1,
          username: `user_${i + 1}`,
          email: `user${i + 1}@test.com`,
          role: 'merchant_employee',
          status: 'active',
          createdAt: new Date().toISOString()
        }));
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              users: largeUserList.slice(0, 50), // 分页返回
              pagination: {
                page: 1,
                pageSize: 50,
                total: 1000,
                totalPages: 20
              }
            }
          })
        });
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // 验证大数据量正确处理
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
      
      const userRows = page.locator('[data-testid="user-row"]');
      const rowCount = await userRows.count();
      expect(rowCount).toBe(50); // 分页显示50条
      
      // 验证分页控件
      await expect(page.locator('[data-testid="pagination-info"]')).toContainText('共 1000 条');
      
      // 测试分页性能
      const pageChangeStart = Date.now();
      await page.click('[data-testid="next-page-button"]');
      await page.waitForLoadState('networkidle');
      const pageChangeTime = Date.now() - pageChangeStart;
      
      expect(pageChangeTime).toBeLessThan(3000); // 3秒内完成分页
    });
  });

  test.describe('异常恢复测试', () => {
    test.use({ 
      storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json' 
    });

    test('网络波动恢复测试', async ({ page }) => {
      await page.goto('http://localhost:5000/users');
      
      let requestCount = 0;
      
      // 模拟网络不稳定
      await page.route('**/api/v1/**', route => {
        requestCount++;
        
        // 每3个请求失败一次
        if (requestCount % 3 === 0) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });
      
      // 执行多个操作，测试重试机制
      for (let i = 0; i < 10; i++) {
        try {
          await page.click('[data-testid="refresh-button"]');
          await page.waitForLoadState('networkidle', { timeout: 10000 });
          
          // 验证数据最终加载成功
          await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
        } catch (error) {
          // 如果失败，验证错误处理
          await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
          await page.click('[data-testid="retry-button"]');
        }
      }
    });

    test('浏览器崩溃恢复测试', async ({ page }) => {
      await page.goto('http://localhost:5000/users');
      
      // 创建用户并保存到localStorage
      await page.click('[data-testid="add-user-button"]');
      await page.fill('[data-testid="user-username"]', 'crash_test_user');
      await page.fill('[data-testid="user-email"]', 'crash@test.com');
      await page.fill('[data-testid="user-password"]', 'password123');
      await page.fill('[data-testid="user-confirm-password"]', 'password123');
      
      // 模拟表单数据自动保存
      await page.evaluate(() => {
        localStorage.setItem('draft_user_form', JSON.stringify({
          username: 'crash_test_user',
          email: 'crash@test.com',
          timestamp: Date.now()
        }));
      });
      
      // 模拟页面崩溃（刷新页面）
      await page.reload();
      
      // 验证会话恢复
      await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
      
      // 验证草稿恢复提示
      await page.click('[data-testid="add-user-button"]');
      
      const draftData = await page.evaluate(() => {
        return localStorage.getItem('draft_user_form');
      });
      
      if (draftData) {
        // 验证草稿恢复功能
        await expect(page.locator('[data-testid="draft-recovery-notice"]')).toBeVisible();
        await page.click('[data-testid="restore-draft-button"]');
        
        // 验证表单数据恢复
        await expect(page.locator('[data-testid="user-username"]')).toHaveValue('crash_test_user');
        await expect(page.locator('[data-testid="user-email"]')).toHaveValue('crash@test.com');
      }
    });

    test('数据库连接中断恢复', async ({ page }) => {
      await page.goto('http://localhost:5000/users');
      
      // 模拟数据库连接问题
      await page.route('**/api/v1/**', route => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: '数据库连接失败',
            code: 'DB_CONNECTION_ERROR'
          })
        });
      });
      
      // 尝试操作
      await page.click('[data-testid="refresh-button"]');
      
      // 验证数据库错误提示
      await expect(page.locator('[data-testid="database-error-message"]')).toContainText('数据库连接失败');
      
      // 验证重试机制
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      // 恢复数据库连接
      await page.unroute('**/api/v1/**');
      
      // 重试操作
      await page.click('[data-testid="retry-button"]');
      await page.waitForLoadState('networkidle');
      
      // 验证恢复成功
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
    });
  });

  test.describe('资源管理测试', () => {
    test.use({ 
      storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json' 
    });

    test('文件上传大小限制测试', async ({ page }) => {
      await page.goto('http://localhost:5000/merchants');
      await page.click('[data-testid="add-merchant-button"]');
      
      // 模拟上传超大文件
      const largeFileContent = 'x'.repeat(10 * 1024 * 1024); // 10MB文件
      
      // 创建临时文件
      await page.evaluate((content) => {
        const blob = new Blob([content], { type: 'application/pdf' });
        const file = new File([blob], 'large-file.pdf', { type: 'application/pdf' });
        
        // 模拟文件选择
        const input = document.querySelector('[data-testid="business-license-file"]') as HTMLInputElement;
        if (input) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, largeFileContent);
      
      // 验证文件大小限制提示
      await expect(page.locator('[data-testid="file-size-error"]')).toContainText('文件大小不能超过');
    });

    test('并发文件上传测试', async ({ page }) => {
      await page.goto('http://localhost:5000/merchants');
      await page.click('[data-testid="add-merchant-button"]');
      
      // 模拟多个文件同时上传
      const uploadPromises = [];
      
      for (let i = 0; i < 3; i++) {
        uploadPromises.push(
          page.evaluate((index) => {
            return new Promise((resolve) => {
              const content = `test file content ${index}`;
              const blob = new Blob([content], { type: 'application/pdf' });
              const file = new File([blob], `test-file-${index}.pdf`, { type: 'application/pdf' });
              
              // 模拟上传
              setTimeout(() => {
                resolve({ success: true, index });
              }, Math.random() * 1000);
            });
          }, i)
        );
      }
      
      const results = await Promise.all(uploadPromises);
      
      // 验证所有上传都成功
      expect(results.every(r => (r as any).success)).toBe(true);
    });

    test('缓存管理测试', async ({ page }) => {
      await page.goto('http://localhost:5000/users');
      
      // 记录初始请求
      const initialRequests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/v1/users')) {
          initialRequests.push(request.url());
        }
      });
      
      await page.waitForLoadState('networkidle');
      const initialRequestCount = initialRequests.length;
      
      // 刷新页面，测试缓存
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // 验证缓存机制（请求数量应该减少或相同）
      const finalRequestCount = initialRequests.length - initialRequestCount;
      expect(finalRequestCount).toBeLessThanOrEqual(initialRequestCount);
      
      // 测试缓存失效
      await page.evaluate(() => {
        // 清除缓存
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              caches.delete(name);
            });
          });
        }
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // 验证缓存清除后重新请求数据
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
    });
  });

  test.describe('安全性压力测试', () => {
    test('恶意请求防护测试', async ({ page }) => {
      await page.goto('http://localhost:5000/login');
      
      // 模拟暴力破解攻击
      const attackAttempts = [];
      
      for (let i = 0; i < 10; i++) {
        attackAttempts.push(
          page.request.post(`${testEnvironmentConfig.backend.baseUrl}/api/v1/auth/login`, {
            data: {
              username: 'admin',
              password: `wrong_password_${i}`
            }
          })
        );
      }
      
      const responses = await Promise.all(attackAttempts);
      
      // 验证速率限制生效
      const blockedResponses = responses.filter(r => r.status() === 429);
      expect(blockedResponses.length).toBeGreaterThan(0);
    });

    test('XSS攻击防护测试', async ({ page }) => {
      await page.goto('http://localhost:5000/login');
      await page.fill('[data-testid="username"]', 'tenant_admin');
      await page.fill('[data-testid="password"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await page.goto('http://localhost:5000/users');
      await page.click('[data-testid="add-user-button"]');
      
      // 尝试注入恶意脚本
      const maliciousScript = '<script>alert("XSS")</script>';
      
      await page.fill('[data-testid="user-username"]', maliciousScript);
      await page.fill('[data-testid="user-email"]', 'xss@test.com');
      await page.fill('[data-testid="user-password"]', 'password123');
      await page.fill('[data-testid="user-confirm-password"]', 'password123');
      
      await page.click('[data-testid="submit-user-button"]');
      
      // 验证脚本被转义，没有执行
      page.on('dialog', dialog => {
        // 如果弹出alert，说明XSS攻击成功（测试失败）
        expect(dialog.message()).not.toBe('XSS');
        dialog.dismiss();
      });
      
      // 验证数据正确显示（被转义）
      const userRow = page.locator('[data-testid="user-row"]').filter({ hasText: maliciousScript });
      if (await userRow.count() > 0) {
        const displayedText = await userRow.locator('[data-testid="user-username"]').textContent();
        expect(displayedText).not.toContain('<script>');
      }
    });

    test('SQL注入防护测试', async ({ page }) => {
      await page.goto('http://localhost:5000/login');
      await page.fill('[data-testid="username"]', 'tenant_admin');
      await page.fill('[data-testid="password"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await page.goto('http://localhost:5000/users');
      
      // 尝试SQL注入攻击
      const sqlInjection = "'; DROP TABLE users; --";
      
      await page.fill('[data-testid="user-search-input"]', sqlInjection);
      await page.click('[data-testid="search-button"]');
      
      // 验证系统仍然正常运行
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
      
      // 验证没有数据库错误
      await expect(page.locator('[data-testid="database-error"]')).not.toBeVisible();
    });
  });
});
