import { test, expect } from '@playwright/test';
import { LoginPage, UserRole } from '../../page-objects/login-page';
import { testUsers } from '../../fixtures/test-data';

/**
 * 基础认证测试套件
 * 
 * 测试需求:
 * - 需求 1.1: 正确登录流程测试
 * - 需求 1.2: 错误登录处理测试  
 * - 需求 1.3: 登录表单验证测试
 */
test.describe('基础认证测试', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectPageLoaded();
  });

  test.describe('正确登录流程测试 - 需求 1.1', () => {
    test('应该成功登录租务管理员账户', async () => {
      // 使用测试数据中的租务管理员账户
      const user = testUsers.tenantAdmin;
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess('/dashboard');
      
      // 验证登录后的用户状态
      const sessionValid = await loginPage.checkSessionStatus();
      expect(sessionValid).toBeTruthy();
    });

    test('应该成功登录商户管理员账户', async () => {
      const user = testUsers.merchantAdmin;
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess('/dashboard');
      
      // 验证会话状态
      const sessionValid = await loginPage.checkSessionStatus();
      expect(sessionValid).toBeTruthy();
    });

    test('应该成功登录商户员工账户', async () => {
      const user = testUsers.employee;
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess('/dashboard');
      
      // 验证会话状态
      const sessionValid = await loginPage.checkSessionStatus();
      expect(sessionValid).toBeTruthy();
    });

    test('应该支持记住密码功能', async () => {
      const user = testUsers.tenantAdmin;
      
      // 使用记住密码选项登录
      await loginPage.login(user.username, user.password, true);
      await loginPage.expectLoginSuccess();
      
      // 验证记住密码标记已保存
      const rememberFlag = await loginPage.page.evaluate(() => 
        localStorage.getItem('rememberMe')
      );
      expect(rememberFlag).toBeTruthy();
    });

    test('应该正确处理登录加载状态', async () => {
      const user = testUsers.tenantAdmin;
      
      // 开始登录
      await loginPage.usernameInput.fill(user.username);
      await loginPage.passwordInput.fill(user.password);
      await loginPage.loginButton.click();
      
      // 验证加载状态
      await loginPage.waitForLoginProcessing();
      await loginPage.expectLoginSuccess();
    });
  });

  test.describe('错误登录处理测试 - 需求 1.2', () => {
    test('应该拒绝不存在的用户名', async () => {
      await loginPage.testInvalidLogin(
        'nonexistent_user',
        'Test123456',
        '用户名不存在'
      );
    });

    test('应该拒绝错误的密码', async () => {
      const user = testUsers.tenantAdmin;
      
      await loginPage.testInvalidLogin(
        user.username,
        'wrong_password',
        '密码错误'
      );
    });

    test('应该拒绝已停用的用户账户', async () => {
      const user = testUsers.inactiveEmployee;
      
      await loginPage.testInvalidLogin(
        user.username,
        user.password,
        '账户已停用'
      );
    });

    test('应该处理空用户名和密码', async () => {
      await loginPage.clearForm();
      await loginPage.loginButton.click();
      
      // 验证必填字段验证
      await loginPage.expectFormValidationError('username', '请输入用户名');
      await loginPage.expectFormValidationError('password', '请输入密码');
    });

    test('应该处理网络错误', async () => {
      const user = testUsers.tenantAdmin;
      
      // 模拟网络错误
      await loginPage.simulateNetworkError();
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginError('网络连接失败');
    });

    test('应该处理服务器错误', async () => {
      const user = testUsers.tenantAdmin;
      
      // 模拟服务器500错误
      await loginPage.simulateServerError(500);
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginError('服务器内部错误');
    });

    test('应该处理服务器不可用错误', async () => {
      const user = testUsers.tenantAdmin;
      
      // 模拟服务器503错误
      await loginPage.simulateServerError(503);
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginError('服务暂时不可用');
    });
  });

  test.describe('登录表单验证测试 - 需求 1.3', () => {
    test('应该验证用户名格式', async () => {
      // 测试用户名长度限制
      await loginPage.usernameInput.fill('ab'); // 太短
      await loginPage.passwordInput.fill('Test123456');
      await loginPage.loginButton.click();
      
      await loginPage.expectFormValidationError('username', '用户名长度至少3位');
    });

    test('应该验证密码强度', async () => {
      await loginPage.usernameInput.fill('tenant_admin');
      
      // 测试密码太短
      await loginPage.passwordInput.fill('123');
      await loginPage.loginButton.click();
      await loginPage.expectFormValidationError('password', '密码长度至少6位');
      
      // 清除错误状态
      await loginPage.clearForm();
      
      // 测试密码太简单
      await loginPage.usernameInput.fill('tenant_admin');
      await loginPage.passwordInput.fill('123456');
      await loginPage.loginButton.click();
      await loginPage.expectFormValidationError('password', '密码强度不足');
    });

    test('应该验证特殊字符输入', async () => {
      // 测试SQL注入尝试
      await loginPage.testInvalidLogin(
        "admin'; DROP TABLE users; --",
        'Test123456',
        '用户名包含非法字符'
      );
      
      // 测试XSS尝试
      await loginPage.testInvalidLogin(
        '<script>alert("xss")</script>',
        'Test123456',
        '用户名包含非法字符'
      );
    });

    test('应该限制登录尝试次数', async () => {
      const user = testUsers.tenantAdmin;
      
      // 连续5次错误登录
      for (let i = 0; i < 5; i++) {
        await loginPage.clearForm();
        await loginPage.testInvalidLogin(
          user.username,
          'wrong_password',
          '密码错误'
        );
      }
      
      // 第6次应该被锁定
      await loginPage.clearForm();
      await loginPage.testInvalidLogin(
        user.username,
        'wrong_password',
        '账户已被锁定，请稍后再试'
      );
    });

    test('应该验证表单字段必填', async () => {
      // 测试空表单提交
      await loginPage.testEmptyFieldValidation();
      
      // 测试只填用户名
      await loginPage.usernameInput.fill('tenant_admin');
      await loginPage.loginButton.click();
      await loginPage.expectFormValidationError('password', '请输入密码');
      
      // 清除并测试只填密码
      await loginPage.clearForm();
      await loginPage.passwordInput.fill('Test123456');
      await loginPage.loginButton.click();
      await loginPage.expectFormValidationError('username', '请输入用户名');
    });

    test('应该正确处理表单状态变化', async () => {
      // 初始状态 - 登录按钮应该可用
      await loginPage.expectLoginButtonState(true);
      
      // 填写表单时按钮状态
      await loginPage.usernameInput.fill('tenant_admin');
      await loginPage.expectLoginButtonState(true);
      
      await loginPage.passwordInput.fill('Test123456');
      await loginPage.expectLoginButtonState(true);
      
      // 提交时按钮应该被禁用
      await loginPage.loginButton.click();
      await loginPage.expectLoginButtonState(false);
    });

    test('应该支持键盘导航', async ({ page }) => {
      // 使用Tab键导航
      await page.keyboard.press('Tab'); // 聚焦到用户名输入框
      await expect(loginPage.usernameInput).toBeFocused();
      
      await page.keyboard.press('Tab'); // 聚焦到密码输入框
      await expect(loginPage.passwordInput).toBeFocused();
      
      await page.keyboard.press('Tab'); // 聚焦到记住密码复选框
      await expect(loginPage.rememberMeCheckbox).toBeFocused();
      
      await page.keyboard.press('Tab'); // 聚焦到登录按钮
      await expect(loginPage.loginButton).toBeFocused();
      
      // 使用Enter键提交表单
      await loginPage.usernameInput.focus();
      await page.keyboard.type('tenant_admin');
      await page.keyboard.press('Tab');
      await page.keyboard.type('Test123456');
      await page.keyboard.press('Enter');
      
      // 验证表单提交
      await loginPage.expectLoginSuccess();
    });

    test('应该清除错误状态当用户重新输入', async () => {
      // 触发验证错误
      await loginPage.testEmptyFieldValidation();
      
      // 开始输入用户名，错误应该清除
      await loginPage.usernameInput.type('t');
      await expect(loginPage.page.locator('[data-testid="error-username"]')).not.toBeVisible();
      
      // 开始输入密码，错误应该清除
      await loginPage.passwordInput.type('T');
      await expect(loginPage.page.locator('[data-testid="error-password"]')).not.toBeVisible();
    });
  });

  test.describe('快速登录功能测试', () => {
    test('应该支持租务管理员快速登录', async () => {
      // 检查快速登录按钮是否可用
      await loginPage.expectQuickLoginAvailable();
      
      // 执行快速登录
      await loginPage.quickLoginAsTenantAdmin();
      await loginPage.expectLoginSuccess();
    });

    test('应该支持商户管理员快速登录', async () => {
      await loginPage.expectQuickLoginAvailable();
      
      await loginPage.quickLoginAsMerchantAdmin();
      await loginPage.expectLoginSuccess();
    });

    test('应该支持员工快速登录', async () => {
      await loginPage.expectQuickLoginAvailable();
      
      await loginPage.quickLoginAsEmployee();
      await loginPage.expectLoginSuccess();
    });
  });

  test.describe('登录状态验证测试', () => {
    test('应该正确验证未登录状态', async () => {
      await loginPage.expectLoginState(false);
    });

    test('应该正确验证已登录状态', async () => {
      const user = testUsers.tenantAdmin;
      
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      await loginPage.expectLoginState(true);
    });

    test('应该检测会话过期', async () => {
      const user = testUsers.tenantAdmin;
      
      // 登录成功
      await loginPage.login(user.username, user.password);
      await loginPage.expectLoginSuccess();
      
      // 模拟会话过期
      await loginPage.page.evaluate(() => {
        localStorage.removeItem('authToken');
        sessionStorage.clear();
      });
      
      // 检查会话状态
      const sessionValid = await loginPage.checkSessionStatus();
      expect(sessionValid).toBeFalsy();
    });
  });
});