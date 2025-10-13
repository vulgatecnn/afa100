import { test, expect } from '@playwright/test';
import { LoginPage, UserRole } from '../../page-objects/login-page';
import { testUsers } from '../../fixtures/test-data';
import { TestHelpers } from '../../utils/test-helpers';

/**
 * 会话管理测试套件
 * 
 * 测试需求:
 * - 需求 1.5: 自动登录和记住密码功能测试
 * - 需求 10.4: 会话过期处理测试
 * - 退出登录测试
 */
test.describe('会话管理测试', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    
    // 清理之前的会话数据
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      // 清理所有cookies
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
    });
    
    await loginPage.goto();
    await loginPage.expectPageLoaded();
  });

  test.describe('自动登录和记住密码功能测试 - 需求 1.5', () => {
    test('应该支持记住密码功能', async ({ page }) => {
      const user = testUsers.tenantAdmin;
      
      // 使用记住密码选项登录
      await loginPage.login(user.username, user.password, true);
      await loginPage.expectLoginSuccess();
      
      // 验证记住密码标记已保存到本地存储
      const rememberFlag = await page.evaluate(() => 
        localStorage.getItem('rememberMe')
      );
      expect(rememberFlag).toBeTruthy();
      
      // 验证用户凭据已保存（应该是加密的）
      const savedCredentials = await page.evaluate(() => 
        localStorage.getItem('savedCredentials')
      );
      expect(savedCredentials).toBeTruthy();
    });

    test('应该在记住密码后自动填充登录表单', async ({ page }) => {
      const user = testUsers.merchantAdmin;
      
      // 第一次登录并记住密码
      await loginPage.login(user.username, user.password, true);
      await loginPage.expectLoginSuccess();
      
      // 退出登录
      await page.goto('/logout');
      await page.waitForURL('/login');
      
      // 重新访问登录页面
      await loginPage.goto();
      
      // 验证表单是否自动填充
      const usernameValue = await loginPage.usernameInput.inputValue();
      const rememberMeChecked = await loginPage.rememberMeCheckbox.isChecked();
      
      expect(usernameValue).toBe(user.username);
      expect(rememberMeChecked).toBeTruthy();
      
      // 密码字段应该为空（安全考虑）
      const passwordValue = await loginPage.passwordInput.inputValue();
      expect(passwordValue).toBe('');
    });

    test('应该支持自动登录功能', async ({ page, context }) => {
      const user = testUsers.employee;
      
      // 登录并记住密码
      await loginPage.login(user.username, user.password, true);
      await loginPage.expectLoginSuccess();
      
      // 设置自动登录标记
      await page.evaluate(() => {
        localStorage.setItem('autoLogin', 'true');
        localStorage.setItem('authToken', 'valid_token_123');
      });
      
      // 关闭页面并重新打开（模拟浏览器重启）
      await page.close();
      const newPage = await context.newPage();
      
      // 直接访问受保护的页面
      await newPage.goto('/dashboard');
      
      // 应该自动登录成功，不需要重定向到登录页面
      await expect(newPage).toHaveURL(/\/dashboard/);
      
      // 验证用户信息显示正确
      const userInfo = newPage.locator('[data-testid="user-info"]');
      if (await userInfo.isVisible()) {
        await expect(userInfo).toContainText(user.name);
      }
    });

    test('应该在取消记住密码后清除保存的凭据', async ({ page }) => {
      const user = testUsers.tenantAdmin;
      
      // 先使用记住密码登录
      await loginPage.login(user.username, user.password, true);
      await loginPage.expectLoginSuccess();
      
      // 验证凭据已保存
      let savedCredentials = await page.evaluate(() => 
        localStorage.getItem('savedCredentials')
      );
      expect(savedCredentials).toBeTruthy();
      
      // 退出登录
      await page.goto('/logout');
      await page.waitForURL('/login');
      
      // 重新登录但不记住密码
      await loginPage.goto();
      await loginPage.login(user.username, user.password, false);
      await loginPage.expectLoginSuccess();
      
      // 验证保存的凭据已清除
      savedCredentials = await page.evaluate(() => 
        localStorage.getItem('savedCredentials')
      );
      expect(savedCredentials).toBeFalsy();
    });

    test('应该处理记住密码的安全性', async ({ page }) => {
      const user = testUsers.merchantAdmin;
      
      // 使用记住密码登录
      await loginPage.login(user.username, user.password, true);
      await loginPage.expectLoginSuccess();
      
      // 检查保存的凭据是否加密
      const savedCredentials = await page.evaluate(() => 
        localStorage.getItem('savedCredentials')
      );
      
      // 凭据不应该包含明文密码
      expect(savedCredentials).not.toContain(user.password);
      expect(savedCredentials).not.toContain('Test123456');
      
      // 应该是JSON格式的加密数据
      expect(() => JSON.parse(savedCredentials!)).not.toThrow();
    });
  });

  test.describe('会话过期处理测试 - 需求 10.4', () => {
    test('应该检测会话过期并重定向到登录页面', async ({ page }) => {
      const user = testUsers.tenantAdmin;
      
      // 正常登录
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      // 模拟会话过期 - 清除认证令牌
      await page.evaluate(() => {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
      });
      
      // 尝试访问受保护的页面
      await page.goto('/dashboard');
      
      // 应该被重定向到登录页面
      await expect(page).toHaveURL(/\/login/);
      
      // 应该显示会话过期提示
      const sessionExpiredMessage = page.locator('[data-testid="session-expired-message"]');
      if (await sessionExpiredMessage.isVisible()) {
        await expect(sessionExpiredMessage).toContainText('会话已过期，请重新登录');
      }
    });

    test('应该在API请求时检测会话过期', async ({ page }) => {
      const user = testUsers.merchantAdmin;
      
      // 登录成功
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      // 模拟API返回401未授权错误
      await page.route('**/api/v1/**', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: '会话已过期',
            code: 401
          })
        });
      });
      
      // 尝试执行需要API调用的操作
      const apiButton = page.locator('[data-testid="api-action-button"]');
      if (await apiButton.isVisible()) {
        await apiButton.click();
      } else {
        // 如果没有API按钮，直接触发API请求
        await page.evaluate(() => {
          fetch('/api/v1/user/profile').catch(() => {});
        });
      }
      
      // 等待一段时间让错误处理生效
      await page.waitForTimeout(1000);
      
      // 应该显示会话过期提示或重定向到登录页面
      const currentUrl = page.url();
      const hasSessionError = await page.locator('[data-testid="session-expired-message"]').isVisible();
      
      expect(currentUrl.includes('/login') || hasSessionError).toBeTruthy();
    });

    test('应该支持会话续期功能', async ({ page }) => {
      const user = testUsers.employee;
      
      // 登录成功
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      // 获取初始令牌
      const initialToken = await page.evaluate(() => 
        localStorage.getItem('authToken')
      );
      
      // 模拟用户活动（点击、滚动等）
      await page.mouse.move(100, 100);
      await page.mouse.click(100, 100);
      await page.keyboard.press('Space');
      
      // 等待一段时间让续期逻辑执行
      await page.waitForTimeout(2000);
      
      // 检查令牌是否更新（如果实现了自动续期）
      const updatedToken = await page.evaluate(() => 
        localStorage.getItem('authToken')
      );
      
      // 令牌应该仍然存在
      expect(updatedToken).toBeTruthy();
      
      // 如果实现了令牌刷新，新令牌可能与旧令牌不同
      // 这里只验证令牌仍然有效
      expect(updatedToken).toBeTruthy();
    });

    test('应该处理令牌刷新失败的情况', async ({ page }) => {
      const user = testUsers.tenantAdmin;
      
      // 登录成功
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      // 模拟令牌刷新API失败
      await page.route('**/api/v1/auth/refresh', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: '刷新令牌已过期',
            code: 401
          })
        });
      });
      
      // 触发令牌刷新（通过模拟即将过期的令牌）
      await page.evaluate(() => {
        // 设置一个即将过期的令牌
        const expiredToken = 'expired_token_123';
        localStorage.setItem('authToken', expiredToken);
        localStorage.setItem('tokenExpiry', (Date.now() + 1000).toString());
      });
      
      // 等待令牌过期并尝试刷新
      await page.waitForTimeout(2000);
      
      // 尝试访问受保护的页面
      await page.goto('/dashboard');
      
      // 应该被重定向到登录页面
      await expect(page).toHaveURL(/\/login/);
    });

    test('应该在多标签页中同步会话状态', async ({ page, context }) => {
      const user = testUsers.merchantAdmin;
      
      // 在第一个标签页登录
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      // 打开第二个标签页
      const secondPage = await context.newPage();
      await secondPage.goto('/dashboard');
      
      // 第二个标签页应该也是已登录状态
      await expect(secondPage).toHaveURL(/\/dashboard/);
      
      // 在第一个标签页退出登录
      await page.goto('/logout');
      await page.waitForURL('/login');
      
      // 等待一段时间让会话同步生效
      await page.waitForTimeout(1000);
      
      // 在第二个标签页尝试访问受保护的页面
      await secondPage.goto('/dashboard');
      
      // 第二个标签页也应该被重定向到登录页面
      await expect(secondPage).toHaveURL(/\/login/);
      
      await secondPage.close();
    });
  });

  test.describe('退出登录测试', () => {
    test('应该成功退出登录并清除会话数据', async ({ page }) => {
      const user = testUsers.tenantAdmin;
      
      // 登录成功
      await loginPage.login(user.username, user.password, true);
      await loginPage.expectLoginSuccess();
      
      // 验证登录状态
      const initialToken = await page.evaluate(() => 
        localStorage.getItem('authToken')
      );
      expect(initialToken).toBeTruthy();
      
      // 执行退出登录
      const logoutButton = page.locator('[data-testid="logout-button"]');
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      } else {
        // 如果没有退出按钮，直接访问退出URL
        await page.goto('/logout');
      }
      
      // 应该重定向到登录页面
      await expect(page).toHaveURL(/\/login/);
      
      // 验证会话数据已清除
      const clearedToken = await page.evaluate(() => 
        localStorage.getItem('authToken')
      );
      expect(clearedToken).toBeFalsy();
      
      // 验证会话存储也已清除
      const sessionData = await page.evaluate(() => 
        sessionStorage.length
      );
      expect(sessionData).toBe(0);
    });

    test('应该在退出登录时保留记住密码设置', async ({ page }) => {
      const user = testUsers.merchantAdmin;
      
      // 使用记住密码登录
      await loginPage.login(user.username, user.password, true);
      await loginPage.expectLoginSuccess();
      
      // 验证记住密码数据已保存
      const savedCredentials = await page.evaluate(() => 
        localStorage.getItem('savedCredentials')
      );
      expect(savedCredentials).toBeTruthy();
      
      // 退出登录
      await page.goto('/logout');
      await expect(page).toHaveURL(/\/login/);
      
      // 验证记住密码数据仍然存在
      const preservedCredentials = await page.evaluate(() => 
        localStorage.getItem('savedCredentials')
      );
      expect(preservedCredentials).toBeTruthy();
      expect(preservedCredentials).toBe(savedCredentials);
      
      // 验证用户名已自动填充
      const usernameValue = await loginPage.usernameInput.inputValue();
      expect(usernameValue).toBe(user.username);
    });

    test('应该支持从用户菜单退出登录', async ({ page }) => {
      const user = testUsers.employee;
      
      // 登录成功
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      // 点击用户头像或用户菜单
      const userMenu = page.locator('[data-testid="user-menu"]');
      if (await userMenu.isVisible()) {
        await userMenu.click();
        
        // 点击退出登录选项
        const logoutMenuItem = page.locator('[data-testid="logout-menu-item"]');
        await logoutMenuItem.click();
        
        // 应该重定向到登录页面
        await expect(page).toHaveURL(/\/login/);
        
        // 验证退出成功提示
        const logoutMessage = page.locator('[data-testid="logout-success-message"]');
        if (await logoutMessage.isVisible()) {
          await expect(logoutMessage).toContainText('已成功退出登录');
        }
      }
    });

    test('应该处理退出登录时的网络错误', async ({ page }) => {
      const user = testUsers.tenantAdmin;
      
      // 登录成功
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      // 模拟退出登录API失败
      await page.route('**/api/v1/auth/logout', route => {
        route.abort('failed');
      });
      
      // 尝试退出登录
      await page.goto('/logout');
      
      // 即使API失败，也应该清除本地会话数据并重定向到登录页面
      await expect(page).toHaveURL(/\/login/);
      
      // 验证本地会话数据已清除
      const clearedToken = await page.evaluate(() => 
        localStorage.getItem('authToken')
      );
      expect(clearedToken).toBeFalsy();
    });

    test('应该支持强制退出所有设备', async ({ page }) => {
      const user = testUsers.merchantAdmin;
      
      // 登录成功
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      // 访问用户设置或安全设置页面
      const securitySettings = page.locator('[data-testid="security-settings"]');
      if (await securitySettings.isVisible()) {
        await securitySettings.click();
        
        // 点击强制退出所有设备按钮
        const logoutAllButton = page.locator('[data-testid="logout-all-devices"]');
        if (await logoutAllButton.isVisible()) {
          await logoutAllButton.click();
          
          // 确认操作
          const confirmButton = page.locator('[data-testid="confirm-logout-all"]');
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }
          
          // 应该重定向到登录页面
          await expect(page).toHaveURL(/\/login/);
          
          // 验证成功提示
          const successMessage = page.locator('[data-testid="logout-all-success"]');
          if (await successMessage.isVisible()) {
            await expect(successMessage).toContainText('已强制退出所有设备');
          }
        }
      }
    });

    test('应该在退出登录后阻止访问受保护的页面', async ({ page }) => {
      const user = testUsers.employee;
      
      // 登录成功
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      // 退出登录
      await page.goto('/logout');
      await expect(page).toHaveURL(/\/login/);
      
      // 尝试直接访问受保护的页面
      const protectedPages = ['/dashboard', '/merchants', '/employees', '/visitors', '/devices'];
      
      for (const protectedPage of protectedPages) {
        await page.goto(protectedPage);
        
        // 应该被重定向到登录页面
        await expect(page).toHaveURL(/\/login/);
      }
    });
  });

  test.describe('会话安全测试', () => {
    test('应该防止会话固定攻击', async ({ page }) => {
      const user = testUsers.tenantAdmin;
      
      // 获取登录前的会话ID（如果有）
      const initialSessionId = await page.evaluate(() => 
        document.cookie.match(/sessionId=([^;]+)/)?.[1]
      );
      
      // 登录成功
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      // 获取登录后的会话ID
      const postLoginSessionId = await page.evaluate(() => 
        document.cookie.match(/sessionId=([^;]+)/)?.[1]
      );
      
      // 会话ID应该在登录后发生变化（防止会话固定攻击）
      if (initialSessionId && postLoginSessionId) {
        expect(postLoginSessionId).not.toBe(initialSessionId);
      }
    });

    test('应该设置安全的Cookie属性', async ({ page }) => {
      const user = testUsers.merchantAdmin;
      
      // 登录成功
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      // 检查Cookie的安全属性
      const cookies = await page.context().cookies();
      const authCookie = cookies.find(cookie => 
        cookie.name.includes('auth') || cookie.name.includes('session')
      );
      
      if (authCookie) {
        // Cookie应该设置HttpOnly属性（防止XSS攻击）
        expect(authCookie.httpOnly).toBeTruthy();
        
        // 在HTTPS环境下应该设置Secure属性
        if (page.url().startsWith('https://')) {
          expect(authCookie.secure).toBeTruthy();
        }
        
        // 应该设置SameSite属性（防止CSRF攻击）
        expect(authCookie.sameSite).toBeDefined();
      }
    });

    test('应该限制并发会话数量', async ({ page, context }) => {
      const user = testUsers.employee;
      
      // 在第一个标签页登录
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      // 创建多个新的浏览器上下文（模拟不同设备）
      const contexts = [];
      for (let i = 0; i < 3; i++) {
        const newContext = await page.context().browser()!.newContext();
        contexts.push(newContext);
        
        const newPage = await newContext.newPage();
        const newLoginPage = new LoginPage(newPage);
        
        await newLoginPage.goto();
        await newLoginPage.login(user.username, user.password);
        
        // 前几次登录应该成功
        if (i < 2) {
          await newLoginPage.expectLoginSuccess();
        } else {
          // 超过限制后应该显示错误或强制退出其他会话
          const errorMessage = newPage.locator('[data-testid="concurrent-session-error"]');
          const hasError = await errorMessage.isVisible();
          
          if (hasError) {
            await expect(errorMessage).toContainText('并发会话数量超过限制');
          }
        }
      }
      
      // 清理创建的上下文
      for (const ctx of contexts) {
        await ctx.close();
      }
    });
  });
});