# 完整系统端到端测试设计

## 测试架构设计

### 服务启动管理
```typescript
// 测试环境管理器
class TestEnvironmentManager {
  async startServices() {
    // 1. 启动后端API (端口5100)
    // 2. 启动租务管理端 (端口5000)
    // 3. 启动商户管理端 (端口5050)
    // 4. 等待所有服务就绪
  }
  
  async stopServices() {
    // 优雅关闭所有服务
  }
}
```

### 测试数据管理
```typescript
// 测试数据工厂
class E2ETestDataFactory {
  createTenantAdmin() // 创建租务管理员
  createMerchantAdmin() // 创建商户管理员
  createEmployee() // 创建员工
  createVisitor() // 创建访客
  
  async seedDatabase() // 初始化测试数据
  async cleanDatabase() // 清理测试数据
}
```

## 核心测试用例

### 1. 租务管理员完整流程测试
```typescript
test('租务管理员完整业务流程', async ({ page }) => {
  // 登录租务管理端
  await page.goto('http://localhost:5000')
  await loginAsTenantAdmin(page)
  
  // 创建商户
  const merchant = await createMerchant(page)
  
  // 分配空间
  await assignSpace(page, merchant.id)
  
  // 设置权限
  await setPermissions(page, merchant.id)
  
  // 验证数据同步
  await verifyBackendData(merchant.id)
})
```

### 2. 商户管理员完整流程测试
```typescript
test('商户管理员完整业务流程', async ({ page }) => {
  // 登录商户管理端
  await page.goto('http://localhost:5050')
  await loginAsMerchantAdmin(page)
  
  // 管理员工
  const employee = await addEmployee(page)
  
  // 审批访客
  const visitor = await approveVisitor(page)
  
  // 验证权限设置
  await verifyPermissions(page, employee.id)
})
```

### 3. 前后端数据同步测试
```typescript
test('前后端数据实时同步', async ({ page, context }) => {
  // 打开两个页面模拟多用户
  const page1 = await context.newPage()
  const page2 = await context.newPage()
  
  // 用户1操作
  await page1.goto('http://localhost:5000')
  await createMerchant(page1)
  
  // 用户2验证数据更新
  await page2.goto('http://localhost:5000')
  await verifyMerchantExists(page2)
})
```

## 性能测试设计

### 响应时间监控
```typescript
test('系统响应时间测试', async ({ page }) => {
  // 监控页面加载时间
  const startTime = Date.now()
  await page.goto('http://localhost:5000')
  const loadTime = Date.now() - startTime
  expect(loadTime).toBeLessThan(2000)
  
  // 监控API响应时间
  const apiResponse = await page.request.get('/api/v1/merchants')
  expect(apiResponse.timing().responseEnd).toBeLessThan(500)
})
```

### 并发用户测试
```typescript
test('并发用户操作测试', async ({ browser }) => {
  const contexts = await Promise.all(
    Array(10).fill(0).map(() => browser.newContext())
  )
  
  const pages = await Promise.all(
    contexts.map(context => context.newPage())
  )
  
  // 同时执行操作
  await Promise.all(
    pages.map(page => performUserOperations(page))
  )
})
```

## 跨浏览器测试配置

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 12'] } }
  ],
  
  webServer: [
    {
      command: 'pnpm --filter backend dev',
      url: 'http://localhost:5100',
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'pnpm --filter tenant-admin dev', 
      url: 'http://localhost:5000',
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'pnpm --filter merchant-admin dev',
      url: 'http://localhost:5050', 
      reuseExistingServer: !process.env.CI
    }
  ]
})
```

## 测试报告和监控

### 自定义报告器
```typescript
class E2ETestReporter {
  generatePerformanceReport() // 性能测试报告
  generateCompatibilityReport() // 兼容性测试报告
  generateBusinessFlowReport() // 业务流程测试报告
}
```

### 实时监控
```typescript
// 测试执行监控
test.beforeEach(async ({ page }) => {
  // 监控控制台错误
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Console Error:', msg.text())
    }
  })
  
  // 监控网络请求
  page.on('response', response => {
    if (response.status() >= 400) {
      console.error('HTTP Error:', response.url(), response.status())
    }
  })
})
```