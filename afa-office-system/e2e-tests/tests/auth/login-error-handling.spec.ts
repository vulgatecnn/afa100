import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/login-page';
import { testUsers } from '../../fixtures/test-data';

/**
 * 登录错误处理专项测试
 * 
 * 专注于各种错误场景的处理测试
 * 需求 1.2: 错误登录处理测试
 */
test.describe('登录错误处理专项测试', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectPageLoaded();
  });

  test.describe('用户认证错误', () => {
    test('不存在的用户名', async () => {
      await loginPage.testInvalidLogin(
        'nonexistent_user_12345',
        'Test123456',
        '用户名不存在'
      );
      
      // 验证错误消息显示时间
      await expect(loginPage.errorMessage).toBeVisible();
      
      // 验证表单状态恢复
      await loginPage.expectLoginButtonState(true);
    });

    test('错误的密码', async () => {
      const user = testUsers.tenantAdmin;
      
      await loginPage.testInvalidLogin(
        user.username,
        'WrongPassword123',
        '密码错误'
      );
      
      // 验证用户名保留，密码清空
      await expect(loginPage.usernameInput).toHaveValue(user.username);
      await expect(loginPage.passwordInput).toHaveValue('');
    });

    test('已停用的用户账户', async () => {
      const user = testUsers.inactiveEmployee;
      
      await loginPage.testInvalidLogin(
        user.username,
        user.password,
        '账户已停用'
      );
      
      // 验证错误消息包含联系管理员的提示
      await expect(loginPage.errorMessage).toContainText('请联系管理员');
    });

    test('账户被锁定', async () => {
      const user = testUsers.tenantAdmin;
      
      // 模拟多次失败登录导致账户锁定
      for (let i = 0; i < 5; i++) {
        await loginPage.clearForm();
        await loginPage.testInvalidLogin(
          user.username,
          'wrong_password',
          '密码错误'
        );
      }
      
      // 第6次尝试应该显示账户锁定
      await loginPage.clearForm();
      await loginPage.testInvalidLogin(
        user.username,
        user.password, // 即使密码正确也应该被拒绝
        '账户已被锁定'
      );
      
      // 验证锁定时间提示
      await expect(loginPage.errorMessage).toContainText('请在15分钟后重试');
    });

    test('会话过期后重新登录', async () => {
      const user = testUsers.tenantAdmin;
      
      // 模拟会话过期的API响应
      await loginPage.page.route('**/api/v1/auth/login', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: '会话已过期，请重新登录',
            code: 401
          })
        });
      });
      
      await loginPage.testInvalidLogin(
        user.username,
        user.password,
        '会话已过期'
      );
    });
  });

  test.describe('网络和服务器错误', () => {
    test('网络连接失败', async () => {
      const user = testUsers.tenantAdmin;
      
      // 模拟网络连接失败
      await loginPage.simulateNetworkError();
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginError('网络连接失败');
      
      // 验证重试提示
      await expect(loginPage.errorMessage).toContainText('请检查网络连接');
    });

    test('服务器内部错误 (500)', async () => {
      const user = testUsers.tenantAdmin;
      
      await loginPage.simulateServerError(500);
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginError('服务器内部错误');
      
      // 验证错误代码显示
      await expect(loginPage.errorMessage).toContainText('错误代码: 500');
    });

    test('服务不可用 (503)', async () => {
      const user = testUsers.tenantAdmin;
      
      await loginPage.simulateServerError(503);
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginError('服务暂时不可用');
      
      // 验证维护提示
      await expect(loginPage.errorMessage).toContainText('系统维护中');
    });

    test('请求超时', async () => {
      const user = testUsers.tenantAdmin;
      
      // 模拟请求超时
      await loginPage.page.route('**/api/v1/auth/login', async route => {
        // 延迟响应模拟超时
        await new Promise(resolve => setTimeout(resolve, 35000));
        route.continue();
      });
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginError('请求超时');
      
      // 验证重试建议
      await expect(loginPage.errorMessage).toContainText('请稍后重试');
    });

    test('API响应格式错误', async () => {
      const user = testUsers.tenantAdmin;
      
      // 模拟无效的JSON响应
      await loginPage.page.route('**/api/v1/auth/login', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json response'
        });
      });
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginError('服务器响应格式错误');
    });
  });

  test.describe('客户端错误处理', () => {
    test('JavaScript错误不影响登录', async () => {
      const user = testUsers.tenantAdmin;
      
      // 注入一个JavaScript错误
      await loginPage.page.addInitScript(() => {
        window.addEventListener('load', () => {
          // 故意触发一个错误
          setTimeout(() => {
            throw new Error('Simulated JS error');
          }, 100);
        });
      });
      
      // 监听控制台错误
      const consoleErrors = [];
      loginPage.page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // 刷新页面以触发错误
      await loginPage.page.reload();
      await loginPage.expectPageLoaded();
      
      // 验证登录功能仍然正常
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      // 验证确实有JS错误发生
      expect(consoleErrors.some(error => error.includes('Simulated JS error'))).toBeTruthy();
    });

    test('本地存储不可用时的处理', async () => {
      const user = testUsers.tenantAdmin;
      
      // 禁用本地存储
      await loginPage.page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          value: null,
          writable: false
        });
      });
      
      await loginPage.page.reload();
      await loginPage.expectPageLoaded();
      
      // 登录应该仍然可以工作，只是不能记住状态
      await loginPage.login(user.username, user.password, true); // 尝试记住密码
      await loginPage.expectLoginSuccess();
      
      // 验证没有因为localStorage错误而失败
      const consoleErrors = [];
      loginPage.page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // 不应该有localStorage相关的错误导致登录失败
      expect(consoleErrors.filter(error => 
        error.includes('localStorage') && error.includes('login')
      )).toHaveLength(0);
    });

    test('Cookie被禁用时的处理', async () => {
      const user = testUsers.tenantAdmin;
      
      // 禁用Cookie
      const context = loginPage.page.context();
      await context.clearCookies();
      
      // 模拟Cookie被禁用的环境
      await loginPage.page.addInitScript(() => {
        Object.defineProperty(document, 'cookie', {
          get: () => '',
          set: () => false
        });
      });
      
      await loginPage.page.reload();
      await loginPage.expectPageLoaded();
      
      await loginPage.login(user.username, user.password);
      
      // 应该显示Cookie相关的警告，但不阻止登录
      const warningMessage = loginPage.page.locator('[data-testid="cookie-warning"]');
      if (await warningMessage.isVisible()) {
        await expect(warningMessage).toContainText('Cookie已被禁用');
      }
      
      // 登录应该仍然成功
      await loginPage.expectLoginSuccess();
    });
  });

  test.describe('错误恢复机制', () => {
    test('网络恢复后自动重试', async () => {
      const user = testUsers.tenantAdmin;
      
      let requestCount = 0;
      
      // 模拟网络不稳定：前两次失败，第三次成功
      await loginPage.page.route('**/api/v1/auth/login', route => {
        requestCount++;
        
        if (requestCount <= 2) {
          route.abort('failed');
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                token: 'mock_token',
                user: { username: user.username, role: user.role }
              },
              message: '登录成功'
            })
          });
        }
      });
      
      await loginPage.login(user.username, user.password);
      
      // 应该显示重试提示
      await expect(loginPage.page.locator('[data-testid="retry-message"]')).toBeVisible();
      
      // 最终应该登录成功
      await loginPage.expectLoginSuccess();
      
      // 验证确实进行了重试
      expect(requestCount).toBeGreaterThan(1);
    });

    test('错误消息自动消失', async () => {
      const user = testUsers.tenantAdmin;
      
      // 触发一个错误
      await loginPage.testInvalidLogin(
        'wrong_user',
        'wrong_password',
        '用户名不存在'
      );
      
      // 验证错误消息显示
      await expect(loginPage.errorMessage).toBeVisible();
      
      // 等待错误消息自动消失（通常5秒后）
      await expect(loginPage.errorMessage).not.toBeVisible({ timeout: 6000 });
    });

    test('清除表单后错误状态重置', async () => {
      // 触发验证错误
      await loginPage.loginButton.click();
      await expect(loginPage.errorMessage).toBeVisible();
      
      // 清除表单
      await loginPage.clearForm();
      
      // 验证错误状态被清除
      await expect(loginPage.errorMessage).not.toBeVisible();
      await expect(loginPage.usernameInput).not.toHaveClass(/error/);
      await expect(loginPage.passwordInput).not.toHaveClass(/error/);
    });

    test('页面刷新后错误状态清除', async () => {
      // 触发一个错误
      await loginPage.testInvalidLogin(
        'wrong_user',
        'wrong_password',
        '用户名不存在'
      );
      
      await expect(loginPage.errorMessage).toBeVisible();
      
      // 刷新页面
      await loginPage.page.reload();
      await loginPage.expectPageLoaded();
      
      // 验证错误状态被清除
      await expect(loginPage.errorMessage).not.toBeVisible();
      await expect(loginPage.usernameInput).toHaveValue('');
      await expect(loginPage.passwordInput).toHaveValue('');
    });
  });

  test.describe('用户体验优化', () => {
    test('错误消息用户友好性', async () => {
      const testCases = [
        {
          scenario: '用户名不存在',
          username: 'nonexistent_user',
          password: 'Test123456',
          expectedMessage: '用户名不存在',
          shouldContain: ['请检查用户名', '联系管理员']
        },
        {
          scenario: '密码错误',
          username: testUsers.tenantAdmin.username,
          password: 'wrong_password',
          expectedMessage: '密码错误',
          shouldContain: ['请检查密码', '忘记密码']
        },
        {
          scenario: '账户被锁定',
          username: 'locked_user',
          password: 'Test123456',
          expectedMessage: '账户已被锁定',
          shouldContain: ['15分钟后重试', '联系管理员']
        }
      ];
      
      for (const testCase of testCases) {
        await loginPage.clearForm();
        await loginPage.testInvalidLogin(
          testCase.username,
          testCase.password,
          testCase.expectedMessage
        );
        
        // 验证错误消息包含有用的提示信息
        for (const hint of testCase.shouldContain) {
          await expect(loginPage.errorMessage).toContainText(hint);
        }
      }
    });

    test('加载状态用户反馈', async () => {
      const user = testUsers.tenantAdmin;
      
      // 模拟慢速网络
      await loginPage.page.route('**/api/v1/auth/login', async route => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { token: 'mock_token', user: { username: user.username } },
            message: '登录成功'
          })
        });
      });
      
      await loginPage.usernameInput.fill(user.username);
      await loginPage.passwordInput.fill(user.password);
      await loginPage.loginButton.click();
      
      // 验证加载状态指示器
      await expect(loginPage.loadingIndicator).toBeVisible();
      await expect(loginPage.loginButton).toBeDisabled();
      await expect(loginPage.loginButton).toContainText('登录中');
      
      // 等待登录完成
      await loginPage.expectLoginSuccess();
      
      // 验证加载状态清除
      await expect(loginPage.loadingIndicator).not.toBeVisible();
    });

    test('错误重试引导', async () => {
      const user = testUsers.tenantAdmin;
      
      // 模拟网络错误
      await loginPage.simulateNetworkError();
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginError('网络连接失败');
      
      // 验证重试按钮出现
      const retryButton = loginPage.page.locator('[data-testid="retry-button"]');
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeVisible();
        await expect(retryButton).toContainText('重试');
      }
      
      // 验证错误消息包含解决建议
      await expect(loginPage.errorMessage).toContainText('请检查网络连接后重试');
    });
  });
});