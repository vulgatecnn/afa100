import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/login-page';

/**
 * 登录表单验证专项测试
 * 
 * 专注于表单验证逻辑的详细测试
 * 需求 1.3: 登录表单验证测试
 */
test.describe('登录表单验证专项测试', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectPageLoaded();
  });

  test.describe('输入字段验证', () => {
    test('用户名字段验证规则', async () => {
      // 测试空用户名
      await loginPage.usernameInput.fill('');
      await loginPage.passwordInput.fill('Test123456');
      await loginPage.loginButton.click();
      await loginPage.expectFormValidationError('username', '请输入用户名');

      // 测试用户名长度限制
      await loginPage.clearForm();
      await loginPage.usernameInput.fill('ab'); // 少于3位
      await loginPage.passwordInput.fill('Test123456');
      await loginPage.loginButton.click();
      await loginPage.expectFormValidationError('username', '用户名长度至少3位');

      // 测试用户名过长
      await loginPage.clearForm();
      const longUsername = 'a'.repeat(51); // 超过50位
      await loginPage.usernameInput.fill(longUsername);
      await loginPage.passwordInput.fill('Test123456');
      await loginPage.loginButton.click();
      await loginPage.expectFormValidationError('username', '用户名长度不能超过50位');

      // 测试用户名特殊字符
      await loginPage.clearForm();
      await loginPage.usernameInput.fill('user@#$%');
      await loginPage.passwordInput.fill('Test123456');
      await loginPage.loginButton.click();
      await loginPage.expectFormValidationError('username', '用户名只能包含字母、数字和下划线');
    });

    test('密码字段验证规则', async () => {
      // 测试空密码
      await loginPage.usernameInput.fill('tenant_admin');
      await loginPage.passwordInput.fill('');
      await loginPage.loginButton.click();
      await loginPage.expectFormValidationError('password', '请输入密码');

      // 测试密码长度限制
      await loginPage.clearForm();
      await loginPage.usernameInput.fill('tenant_admin');
      await loginPage.passwordInput.fill('123'); // 少于6位
      await loginPage.loginButton.click();
      await loginPage.expectFormValidationError('password', '密码长度至少6位');

      // 测试密码过长
      await loginPage.clearForm();
      await loginPage.usernameInput.fill('tenant_admin');
      const longPassword = 'a'.repeat(129); // 超过128位
      await loginPage.passwordInput.fill(longPassword);
      await loginPage.loginButton.click();
      await loginPage.expectFormValidationError('password', '密码长度不能超过128位');

      // 测试密码强度
      await loginPage.clearForm();
      await loginPage.usernameInput.fill('tenant_admin');
      await loginPage.passwordInput.fill('123456'); // 纯数字
      await loginPage.loginButton.click();
      await loginPage.expectFormValidationError('password', '密码强度不足，需包含字母和数字');
    });
  });

  test.describe('实时验证反馈', () => {
    test('输入时实时清除错误状态', async () => {
      // 先触发验证错误
      await loginPage.loginButton.click();
      await expect(loginPage.page.locator('[data-testid="error-username"]')).toBeVisible();
      await expect(loginPage.page.locator('[data-testid="error-password"]')).toBeVisible();

      // 开始输入用户名，错误应该立即清除
      await loginPage.usernameInput.type('t');
      await expect(loginPage.page.locator('[data-testid="error-username"]')).not.toBeVisible();

      // 开始输入密码，错误应该立即清除
      await loginPage.passwordInput.type('T');
      await expect(loginPage.page.locator('[data-testid="error-password"]')).not.toBeVisible();
    });

    test('失焦时验证字段', async () => {
      // 用户名失焦验证
      await loginPage.usernameInput.focus();
      await loginPage.usernameInput.fill('ab'); // 无效长度
      await loginPage.passwordInput.focus(); // 触发用户名失焦
      await loginPage.expectFormValidationError('username', '用户名长度至少3位');

      // 密码失焦验证
      await loginPage.passwordInput.fill('123'); // 无效长度
      await loginPage.usernameInput.focus(); // 触发密码失焦
      await loginPage.expectFormValidationError('password', '密码长度至少6位');
    });

    test('有效输入时清除错误状态', async () => {
      // 先输入无效数据
      await loginPage.usernameInput.fill('ab');
      await loginPage.passwordInput.fill('123');
      await loginPage.loginButton.click();
      
      // 验证错误显示
      await expect(loginPage.page.locator('[data-testid="error-username"]')).toBeVisible();
      await expect(loginPage.page.locator('[data-testid="error-password"]')).toBeVisible();

      // 输入有效用户名
      await loginPage.usernameInput.clear();
      await loginPage.usernameInput.fill('tenant_admin');
      await loginPage.passwordInput.focus(); // 触发失焦验证
      await expect(loginPage.page.locator('[data-testid="error-username"]')).not.toBeVisible();

      // 输入有效密码
      await loginPage.passwordInput.clear();
      await loginPage.passwordInput.fill('Test123456');
      await loginPage.usernameInput.focus(); // 触发失焦验证
      await expect(loginPage.page.locator('[data-testid="error-password"]')).not.toBeVisible();
    });
  });

  test.describe('表单状态管理', () => {
    test('登录按钮状态变化', async () => {
      // 初始状态 - 按钮可用
      await loginPage.expectLoginButtonState(true);

      // 开始登录 - 按钮禁用
      await loginPage.usernameInput.fill('tenant_admin');
      await loginPage.passwordInput.fill('Test123456');
      await loginPage.loginButton.click();
      
      // 验证按钮在处理期间被禁用
      await loginPage.expectLoginButtonState(false);
      
      // 等待处理完成
      await loginPage.waitForLoginProcessing();
    });

    test('表单重置功能', async () => {
      // 填写表单
      await loginPage.usernameInput.fill('test_user');
      await loginPage.passwordInput.fill('test_password');
      await loginPage.rememberMeCheckbox.check();

      // 验证表单已填写
      await expect(loginPage.usernameInput).toHaveValue('test_user');
      await expect(loginPage.passwordInput).toHaveValue('test_password');
      await expect(loginPage.rememberMeCheckbox).toBeChecked();

      // 清除表单
      await loginPage.clearForm();

      // 验证表单已清空
      await expect(loginPage.usernameInput).toHaveValue('');
      await expect(loginPage.passwordInput).toHaveValue('');
      await expect(loginPage.rememberMeCheckbox).not.toBeChecked();
    });

    test('表单自动完成属性', async () => {
      // 验证用户名字段有正确的自动完成属性
      await expect(loginPage.usernameInput).toHaveAttribute('autocomplete', 'username');
      
      // 验证密码字段有正确的自动完成属性
      await expect(loginPage.passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });
  });

  test.describe('安全性验证', () => {
    test('防止XSS攻击', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      await loginPage.usernameInput.fill(xssPayload);
      await loginPage.passwordInput.fill('Test123456');
      await loginPage.loginButton.click();
      
      // 验证XSS payload被正确处理
      await loginPage.expectFormValidationError('username', '用户名包含非法字符');
      
      // 验证页面没有执行恶意脚本
      const alertDialogs = [];
      loginPage.page.on('dialog', dialog => {
        alertDialogs.push(dialog);
        dialog.dismiss();
      });
      
      expect(alertDialogs).toHaveLength(0);
    });

    test('防止SQL注入攻击', async () => {
      const sqlInjectionPayload = "admin'; DROP TABLE users; --";
      
      await loginPage.usernameInput.fill(sqlInjectionPayload);
      await loginPage.passwordInput.fill('Test123456');
      await loginPage.loginButton.click();
      
      // 验证SQL注入payload被正确处理
      await loginPage.expectFormValidationError('username', '用户名包含非法字符');
    });

    test('密码字段安全性', async () => {
      // 验证密码字段类型
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
      
      // 验证密码不会在页面源码中暴露
      const pageContent = await loginPage.page.content();
      expect(pageContent).not.toContain('Test123456');
    });

    test('表单数据不在URL中暴露', async () => {
      await loginPage.usernameInput.fill('tenant_admin');
      await loginPage.passwordInput.fill('Test123456');
      await loginPage.loginButton.click();
      
      // 验证敏感信息不在URL中
      const currentUrl = loginPage.page.url();
      expect(currentUrl).not.toContain('tenant_admin');
      expect(currentUrl).not.toContain('Test123456');
    });
  });

  test.describe('可访问性验证', () => {
    test('表单标签关联', async () => {
      // 验证用户名标签与输入框关联
      const usernameLabel = loginPage.page.locator('label[for="username"]');
      await expect(usernameLabel).toBeVisible();
      
      // 验证密码标签与输入框关联
      const passwordLabel = loginPage.page.locator('label[for="password"]');
      await expect(passwordLabel).toBeVisible();
    });

    test('键盘导航支持', async ({ page }) => {
      // Tab键导航测试
      await page.keyboard.press('Tab');
      await expect(loginPage.usernameInput).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(loginPage.passwordInput).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(loginPage.rememberMeCheckbox).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(loginPage.loginButton).toBeFocused();
      
      // Shift+Tab反向导航测试
      await page.keyboard.press('Shift+Tab');
      await expect(loginPage.rememberMeCheckbox).toBeFocused();
    });

    test('Enter键提交表单', async ({ page }) => {
      await loginPage.usernameInput.fill('tenant_admin');
      await loginPage.passwordInput.fill('Test123456');
      
      // 在密码字段按Enter键应该提交表单
      await loginPage.passwordInput.press('Enter');
      
      // 验证表单提交
      await loginPage.waitForLoginProcessing();
    });

    test('错误消息可访问性', async () => {
      // 触发验证错误
      await loginPage.loginButton.click();
      
      // 验证错误消息有适当的ARIA属性
      const usernameError = loginPage.page.locator('[data-testid="error-username"]');
      const passwordError = loginPage.page.locator('[data-testid="error-password"]');
      
      await expect(usernameError).toBeVisible();
      await expect(passwordError).toBeVisible();
      
      // 验证输入框与错误消息关联
      await expect(loginPage.usernameInput).toHaveAttribute('aria-describedby');
      await expect(loginPage.passwordInput).toHaveAttribute('aria-describedby');
    });
  });
});