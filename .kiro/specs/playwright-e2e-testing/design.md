# Playwright 端到端测试设计文档

## 概述

本设计文档描述了使用 Playwright 实现 AFA 办公系统端到端测试的技术架构和实现方案。重点关注真实浏览器环境下的用户交互自动化，确保系统功能的可靠性和用户体验的一致性。

## 架构设计

### 测试架构层次

```
┌─────────────────────────────────────────┐
│           测试执行层                      │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ Test Runner │  │ Test Reporter   │   │
│  │ (Playwright)│  │ (HTML/JSON)     │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│           测试用例层                      │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ 业务流程测试  │  │ 功能模块测试     │   │
│  │ (Workflows) │  │ (Components)    │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│           页面对象层                      │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ Page Objects│  │ Component       │   │
│  │ (POM)       │  │ Objects         │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│           工具支持层                      │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ Test Helpers│  │ Data Factory    │   │
│  │ (Utils)     │  │ (Fixtures)      │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│           应用系统层                      │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ 前端应用     │  │ 后端API         │   │
│  │ (React)     │  │ (Express)       │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┘
```

### 核心组件设计

#### 1. 测试环境管理器 (TestEnvironmentManager)

```typescript
class TestEnvironmentManager {
  private services: Map<string, ServiceInstance> = new Map();
  
  async startAllServices(): Promise<void> {
    // 启动后端API服务 (端口5100)
    await this.startService('backend', {
      command: 'pnpm --filter backend dev',
      port: 5100,
      healthCheck: '/api/v1/health'
    });
    
    // 启动租务管理端 (端口5000)
    await this.startService('tenant-admin', {
      command: 'pnpm --filter tenant-admin dev',
      port: 5000,
      healthCheck: '/'
    });
    
    // 启动商户管理端 (端口5050)
    await this.startService('merchant-admin', {
      command: 'pnpm --filter merchant-admin dev',
      port: 5050,
      healthCheck: '/'
    });
  }
  
  async stopAllServices(): Promise<void> {
    // 优雅关闭所有服务
  }
  
  async waitForServicesReady(): Promise<void> {
    // 等待所有服务启动完成
  }
}
```

#### 2. 页面对象模型 (Page Object Model)

```typescript
// 基础页面类
abstract class BasePage {
  constructor(protected page: Page) {}
  
  abstract goto(): Promise<void>;
  abstract isLoaded(): Promise<boolean>;
  
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }
  
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }
}

// 登录页面对象
class LoginPage extends BasePage {
  private readonly usernameInput = this.page.locator('[data-testid="username"]');
  private readonly passwordInput = this.page.locator('[data-testid="password"]');
  private readonly loginButton = this.page.locator('[data-testid="login-button"]');
  private readonly errorMessage = this.page.locator('[data-testid="error-message"]');
  
  async goto(): Promise<void> {
    await this.page.goto('/login');
  }
  
  async isLoaded(): Promise<boolean> {
    return await this.loginButton.isVisible();
  }
  
  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
  
  async expectLoginSuccess(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard/);
  }
  
  async expectLoginError(message: string): Promise<void> {
    await expect(this.errorMessage).toContainText(message);
  }
}

// 商户管理页面对象
class MerchantManagementPage extends BasePage {
  private readonly addButton = this.page.locator('[data-testid="add-merchant"]');
  private readonly searchInput = this.page.locator('[data-testid="search-merchant"]');
  private readonly merchantTable = this.page.locator('[data-testid="merchant-table"]');
  
  async goto(): Promise<void> {
    await this.page.goto('/merchants');
  }
  
  async isLoaded(): Promise<boolean> {
    return await this.merchantTable.isVisible();
  }
  
  async addMerchant(merchantData: MerchantData): Promise<void> {
    await this.addButton.click();
    // 填写表单逻辑
  }
  
  async searchMerchant(name: string): Promise<void> {
    await this.searchInput.fill(name);
    await this.page.keyboard.press('Enter');
  }
}
```

#### 3. 测试数据工厂 (TestDataFactory)

```typescript
interface TestUser {
  username: string;
  password: string;
  role: string;
  permissions: string[];
}

interface MerchantData {
  name: string;
  contactPerson: string;
  contactPhone: string;
  email: string;
  address: string;
}

class TestDataFactory {
  static createTenantAdmin(): TestUser {
    return {
      username: 'tenant_admin',
      password: 'Test123456',
      role: '租务管理员',
      permissions: ['all']
    };
  }
  
  static createMerchantAdmin(): TestUser {
    return {
      username: 'merchant_admin',
      password: 'Test123456',
      role: '商户管理员',
      permissions: ['merchant_management']
    };
  }
  
  static createEmployee(): TestUser {
    return {
      username: 'employee_001',
      password: 'Test123456',
      role: '商户员工',
      permissions: ['visitor_approval']
    };
  }
  
  static createMerchantData(): MerchantData {
    return {
      name: `测试商户_${Date.now()}`,
      contactPerson: '张三',
      contactPhone: '13800138000',
      email: 'test@example.com',
      address: '测试地址123号'
    };
  }
  
  static createVisitorData() {
    return {
      name: `访客_${Date.now()}`,
      phone: '13900139000',
      company: '测试公司',
      purpose: '商务洽谈',
      visitDate: new Date().toISOString().split('T')[0]
    };
  }
}
```

#### 4. 测试工具类 (TestHelpers)

```typescript
class PlaywrightTestHelpers {
  static async loginAs(page: Page, userType: string): Promise<void> {
    const user = TestDataFactory[`create${userType}`]();
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login(user.username, user.password);
    await loginPage.expectLoginSuccess();
  }
  
  static async waitForApiResponse(page: Page, url: string): Promise<Response> {
    return await page.waitForResponse(response => 
      response.url().includes(url) && response.status() === 200
    );
  }
  
  static async mockApiResponse(page: Page, url: string, data: any): Promise<void> {
    await page.route(url, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data,
          message: 'Success'
        })
      });
    });
  }
  
  static async expectNotification(page: Page, message: string, type = 'success'): Promise<void> {
    const notification = page.locator(`[data-testid="notification-${type}"]`);
    await expect(notification).toContainText(message);
  }
  
  static async fillForm(page: Page, formData: Record<string, string>): Promise<void> {
    for (const [field, value] of Object.entries(formData)) {
      await page.locator(`[data-testid="${field}"]`).fill(value);
    }
  }
}
```

## 组件和接口设计

### 测试配置接口

```typescript
interface PlaywrightConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  workers: number;
  browsers: BrowserConfig[];
  webServer: WebServerConfig[];
}

interface BrowserConfig {
  name: string;
  use: {
    viewport: { width: number; height: number };
    userAgent?: string;
    deviceScaleFactor?: number;
  };
}

interface WebServerConfig {
  command: string;
  url: string;
  port: number;
  reuseExistingServer: boolean;
  timeout: number;
}
```

### 测试用例接口

```typescript
interface TestCase {
  name: string;
  description: string;
  tags: string[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  execute: (page: Page) => Promise<void>;
}

interface TestSuite {
  name: string;
  description: string;
  beforeAll?: () => Promise<void>;
  afterAll?: () => Promise<void>;
  testCases: TestCase[];
}
```

## 数据模型

### 测试执行结果模型

```typescript
interface TestResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  screenshots: string[];
  videos: string[];
  traces: string[];
}

interface TestReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  results: TestResult[];
  environment: {
    browser: string;
    viewport: string;
    os: string;
  };
}
```

### 性能监控模型

```typescript
interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  apiResponseTimes: Record<string, number>;
}

interface PerformanceReport {
  testName: string;
  metrics: PerformanceMetrics;
  thresholds: Record<string, number>;
  passed: boolean;
}
```

## 错误处理策略

### 错误分类和处理

```typescript
enum TestErrorType {
  ELEMENT_NOT_FOUND = 'element_not_found',
  TIMEOUT = 'timeout',
  ASSERTION_FAILED = 'assertion_failed',
  NETWORK_ERROR = 'network_error',
  BROWSER_ERROR = 'browser_error'
}

class TestErrorHandler {
  static async handleError(error: Error, page: Page, testName: string): Promise<void> {
    // 截图保存
    await page.screenshot({ 
      path: `screenshots/error_${testName}_${Date.now()}.png`,
      fullPage: true 
    });
    
    // 保存页面HTML
    const html = await page.content();
    await fs.writeFile(`logs/error_${testName}_${Date.now()}.html`, html);
    
    // 记录控制台日志
    const logs = await page.evaluate(() => {
      return window.console.logs || [];
    });
    
    // 重新抛出错误
    throw new TestError(error.message, TestErrorType.ASSERTION_FAILED, {
      screenshot: `screenshots/error_${testName}_${Date.now()}.png`,
      html: `logs/error_${testName}_${Date.now()}.html`,
      logs
    });
  }
}
```

### 重试机制

```typescript
class RetryStrategy {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (i < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }
}
```

## 测试策略

### 测试分层策略

1. **冒烟测试 (Smoke Tests)**
   - 核心功能快速验证
   - 登录、主要页面加载
   - 关键API接口可用性

2. **功能测试 (Functional Tests)**
   - 完整业务流程测试
   - 表单操作和数据验证
   - 用户交互和导航

3. **集成测试 (Integration Tests)**
   - 前后端数据同步
   - 多用户并发操作
   - 跨模块功能验证

4. **回归测试 (Regression Tests)**
   - 核心功能稳定性验证
   - 历史bug修复验证
   - 性能基准对比

### 测试执行策略

```typescript
// 测试执行配置
const testExecutionConfig = {
  // 并行执行配置
  parallel: {
    workers: process.env.CI ? 1 : 2,
    shards: process.env.CI ? 4 : 1
  },
  
  // 浏览器配置
  browsers: [
    { name: 'chromium', headless: !process.env.DEBUG },
    { name: 'firefox', headless: true },
    { name: 'webkit', headless: true }
  ],
  
  // 重试配置
  retries: {
    ci: 2,
    local: 1
  },
  
  // 超时配置
  timeout: {
    test: 30000,
    expect: 5000,
    navigation: 10000
  }
};
```

### 数据管理策略

```typescript
class TestDataManager {
  async setupTestData(): Promise<void> {
    // 创建测试用户
    await this.createTestUsers();
    
    // 创建测试商户
    await this.createTestMerchants();
    
    // 创建测试设备
    await this.createTestDevices();
  }
  
  async cleanupTestData(): Promise<void> {
    // 清理测试产生的数据
    await this.cleanupTestRecords();
    
    // 重置数据库状态
    await this.resetDatabase();
  }
  
  async isolateTestData(testName: string): Promise<void> {
    // 为每个测试创建独立的数据环境
    await this.createTestNamespace(testName);
  }
}
```

## 性能监控和优化

### 性能指标收集

```typescript
class PerformanceMonitor {
  async collectMetrics(page: Page): Promise<PerformanceMetrics> {
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
      };
    });
    
    return metrics;
  }
  
  async monitorApiPerformance(page: Page): Promise<Record<string, number>> {
    const apiTimes: Record<string, number> = {};
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const timing = response.timing();
        apiTimes[response.url()] = timing.responseEnd;
      }
    });
    
    return apiTimes;
  }
}
```

### 资源优化

```typescript
class ResourceOptimizer {
  async optimizeForTesting(page: Page): Promise<void> {
    // 阻止不必要的资源加载
    await page.route('**/*.{png,jpg,jpeg,gif,svg}', route => {
      if (route.request().url().includes('analytics')) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    // 禁用动画以提高测试速度
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style');
        style.textContent = `
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-delay: 0.01ms !important;
            transition-duration: 0.01ms !important;
            transition-delay: 0.01ms !important;
          }
        `;
        document.head.appendChild(style);
      });
    });
  }
}
```

这个设计文档提供了完整的 Playwright 端到端测试架构，包括核心组件、数据模型、错误处理和性能优化策略。接下来我们可以基于这个设计创建具体的实施任务列表。