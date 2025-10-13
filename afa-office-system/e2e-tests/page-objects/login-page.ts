import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * 用户类型枚举
 */
export enum UserRole {
  TENANT_ADMIN = 'tenant_admin',
  MERCHANT_ADMIN = 'merchant_admin',
  EMPLOYEE = 'employee'
}

/**
 * 用户信息接口
 */
export interface UserCredentials {
  username: string;
  password: string;
  role: UserRole;
  displayName?: string;
}

/**
 * 登录页面对象 - 扩展版本
 * 支持多角色登录、状态验证和错误处理
 */
export class LoginPage extends BasePage {
  // 页面元素定位器
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly loadingIndicator: Locator;
  readonly quickLoginButtons: Locator;
  readonly loginForm: Locator;
  readonly pageTitle: Locator;

  // 快速登录按钮
  readonly quickLoginTenantAdmin: Locator;
  readonly quickLoginMerchantAdmin: Locator;
  readonly quickLoginEmployee: Locator;

  constructor(page: Page) {
    super(page);
    
    // 基础表单元素
    this.usernameInput = page.locator('[data-testid="username"], [name="username"]');
    this.passwordInput = page.locator('[data-testid="password"], [name="password"]');
    this.loginButton = page.locator('[data-testid="login-button"], button[type="submit"]');
    this.rememberMeCheckbox = page.locator('[data-testid="remember-me"], input[name="remember"]');
    this.forgotPasswordLink = page.locator('[data-testid="forgot-password"], a:has-text("忘记密码")');
    
    // 状态和消息元素
    this.errorMessage = page.locator('[data-testid="error-message"], .ant-form-item-explain-error, .error-message');
    this.successMessage = page.locator('[data-testid="success-message"], .ant-message-success');
    this.loadingIndicator = page.locator('[data-testid="loading"], .ant-spin-spinning');
    this.loginForm = page.locator('[data-testid="login-form"], form');
    this.pageTitle = page.locator('[data-testid="page-title"], h1, .login-title');
    
    // 快速登录按钮
    this.quickLoginButtons = page.locator('[data-testid="quick-login-buttons"]');
    this.quickLoginTenantAdmin = page.locator('[data-testid="quick-login-tenant-admin"]');
    this.quickLoginMerchantAdmin = page.locator('[data-testid="quick-login-merchant-admin"]');
    this.quickLoginEmployee = page.locator('[data-testid="quick-login-employee"]');
  }

  /**
   * 导航到登录页面
   */
  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.waitForLoad();
  }

  /**
   * 检查页面是否已加载
   */
  async isLoaded(): Promise<boolean> {
    try {
      await this.loginButton.waitFor({ state: 'visible', timeout: 5000 });
      await this.usernameInput.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 基础登录方法
   */
  async login(username: string, password: string, rememberMe = false): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    
    if (rememberMe) {
      await this.rememberMeCheckbox.check();
    }
    
    await this.loginButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * 多角色登录统一接口
   */
  async loginAsRole(role: UserRole, rememberMe = false): Promise<void> {
    const credentials = this.getUserCredentials(role);
    await this.login(credentials.username, credentials.password, rememberMe);
  }

  /**
   * 快速登录 - 租务管理员
   */
  async quickLoginAsTenantAdmin(): Promise<void> {
    if (await this.isElementVisible('[data-testid="quick-login-tenant-admin"]')) {
      await this.quickLoginTenantAdmin.click();
      await this.waitForLoadingComplete();
    } else {
      await this.loginAsRole(UserRole.TENANT_ADMIN);
    }
  }

  /**
   * 快速登录 - 商户管理员
   */
  async quickLoginAsMerchantAdmin(): Promise<void> {
    if (await this.isElementVisible('[data-testid="quick-login-merchant-admin"]')) {
      await this.quickLoginMerchantAdmin.click();
      await this.waitForLoadingComplete();
    } else {
      await this.loginAsRole(UserRole.MERCHANT_ADMIN);
    }
  }

  /**
   * 快速登录 - 员工
   */
  async quickLoginAsEmployee(): Promise<void> {
    if (await this.isElementVisible('[data-testid="quick-login-employee"]')) {
      await this.quickLoginEmployee.click();
      await this.waitForLoadingComplete();
    } else {
      await this.loginAsRole(UserRole.EMPLOYEE);
    }
  }

  /**
   * 使用用户凭据对象登录
   */
  async loginWithCredentials(credentials: UserCredentials, rememberMe = false): Promise<void> {
    await this.login(credentials.username, credentials.password, rememberMe);
  }

  /**
   * 验证登录成功
   */
  async expectLoginSuccess(expectedUrl = '/dashboard'): Promise<void> {
    await this.expectUrl(expectedUrl);
    
    // 检查是否有成功消息或者已经跳转到仪表板
    const isDashboard = await this.page.locator('[data-testid="dashboard"], .dashboard').isVisible().catch(() => false);
    const hasSuccessMessage = await this.successMessage.isVisible().catch(() => false);
    
    expect(isDashboard || hasSuccessMessage || this.page.url().includes('dashboard')).toBeTruthy();
  }

  /**
   * 验证登录失败
   */
  async expectLoginError(expectedMessage?: string): Promise<void> {
    await this.waitForElement(this.errorMessage);
    
    if (expectedMessage) {
      await expect(this.errorMessage).toContainText(expectedMessage);
    } else {
      // 检查是否有任何错误消息
      await expect(this.errorMessage).toBeVisible();
    }
  }

  /**
   * 验证表单验证错误
   */
  async expectFormValidationError(field: 'username' | 'password', message: string): Promise<void> {
    const fieldError = this.page.locator(`[data-testid="error-${field}"], .ant-form-item-explain-error`);
    await expect(fieldError).toContainText(message);
  }

  /**
   * 验证登录状态
   */
  async expectLoginState(isLoggedIn: boolean): Promise<void> {
    if (isLoggedIn) {
      // 检查是否在受保护的页面
      const currentUrl = this.page.url();
      expect(currentUrl).not.toContain('/login');
      expect(currentUrl).toMatch(/\/(dashboard|admin|merchant)/);
    } else {
      // 检查是否在登录页面
      await this.expectUrl('/login');
      await expect(this.loginForm).toBeVisible();
    }
  }

  /**
   * 检查会话状态
   */
  async checkSessionStatus(): Promise<boolean> {
    try {
      // 尝试访问需要认证的API端点
      const response = await this.page.request.get('/api/v1/auth/me');
      return response.ok();
    } catch {
      return false;
    }
  }

  /**
   * 清除登录表单
   */
  async clearForm(): Promise<void> {
    await this.usernameInput.clear();
    await this.passwordInput.clear();
    
    if (await this.rememberMeCheckbox.isChecked()) {
      await this.rememberMeCheckbox.uncheck();
    }
  }

  /**
   * 测试无效登录场景
   */
  async testInvalidLogin(username: string, password: string, expectedError: string): Promise<void> {
    await this.clearForm();
    await this.login(username, password);
    await this.expectLoginError(expectedError);
  }

  /**
   * 测试空字段验证
   */
  async testEmptyFieldValidation(): Promise<void> {
    await this.clearForm();
    await this.loginButton.click();
    
    // 检查用户名和密码的必填验证
    await this.expectFormValidationError('username', '请输入用户名');
    await this.expectFormValidationError('password', '请输入密码');
  }

  /**
   * 测试记住密码功能
   */
  async testRememberMeFunction(): Promise<void> {
    const credentials = this.getUserCredentials(UserRole.TENANT_ADMIN);
    
    // 使用记住密码登录
    await this.login(credentials.username, credentials.password, true);
    await this.expectLoginSuccess();
    
    // 检查本地存储是否保存了记住密码的标记
    const rememberFlag = await this.page.evaluate(() => localStorage.getItem('rememberMe'));
    expect(rememberFlag).toBeTruthy();
  }

  /**
   * 验证页面加载状态
   */
  async expectPageLoaded(): Promise<void> {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.loginForm).toBeVisible();
    await expect(this.loginButton).toBeEnabled();
  }

  /**
   * 检查快速登录按钮是否可用
   */
  async expectQuickLoginAvailable(): Promise<void> {
    if (await this.isElementVisible('[data-testid="quick-login-buttons"]')) {
      await expect(this.quickLoginButtons).toBeVisible();
      await expect(this.quickLoginTenantAdmin).toBeVisible();
      await expect(this.quickLoginMerchantAdmin).toBeVisible();
      await expect(this.quickLoginEmployee).toBeVisible();
    }
  }

  /**
   * 获取用户凭据
   */
  private getUserCredentials(role: UserRole): UserCredentials {
    const credentialsMap: Record<UserRole, UserCredentials> = {
      [UserRole.TENANT_ADMIN]: {
        username: 'tenant_admin',
        password: 'Test123456',
        role: UserRole.TENANT_ADMIN,
        displayName: '租务管理员'
      },
      [UserRole.MERCHANT_ADMIN]: {
        username: 'merchant_admin',
        password: 'Test123456',
        role: UserRole.MERCHANT_ADMIN,
        displayName: '商户管理员'
      },
      [UserRole.EMPLOYEE]: {
        username: 'employee_001',
        password: 'Test123456',
        role: UserRole.EMPLOYEE,
        displayName: '商户员工'
      }
    };

    return credentialsMap[role];
  }

  /**
   * 等待登录处理完成
   */
  async waitForLoginProcessing(): Promise<void> {
    // 等待加载指示器出现和消失
    try {
      await this.loadingIndicator.waitFor({ state: 'visible', timeout: 2000 });
      await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 });
    } catch {
      // 如果没有加载指示器，等待网络空闲
      await this.waitForLoad();
    }
  }

  /**
   * 检查登录按钮状态
   */
  async expectLoginButtonState(enabled: boolean): Promise<void> {
    if (enabled) {
      await expect(this.loginButton).toBeEnabled();
    } else {
      await expect(this.loginButton).toBeDisabled();
    }
  }

  /**
   * 模拟网络错误场景
   */
  async simulateNetworkError(): Promise<void> {
    await this.page.route('**/api/v1/auth/login', route => {
      route.abort('failed');
    });
  }

  /**
   * 模拟服务器错误场景
   */
  async simulateServerError(statusCode = 500): Promise<void> {
    await this.page.route('**/api/v1/auth/login', route => {
      route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: '服务器内部错误',
          code: statusCode
        })
      });
    });
  }
}