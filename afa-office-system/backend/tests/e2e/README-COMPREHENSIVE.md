# AFA办公系统端到端测试框架

## 概述

本端到端测试框架为AFA办公小程序系统提供完整的自动化测试解决方案，涵盖用户认证、业务流程、系统集成和稳定性测试。

## 🏗️ 框架架构

```
tests/e2e/
├── config/                     # 测试配置
│   ├── test-environment.ts     # 环境配置
│   └── playwright.config.ts    # Playwright配置
├── fixtures/                   # 测试数据
│   ├── data/                   # JSON测试数据
│   └── auth-states/            # 认证状态文件
├── helpers/                    # 测试辅助工具
│   ├── global-setup.ts         # 全局设置
│   ├── global-teardown.ts      # 全局清理
│   ├── database-manager.ts     # 数据库管理
│   └── test-data-manager.ts    # 测试数据管理
├── specs/                      # 测试用例
│   ├── auth/                   # 认证流程测试
│   ├── business/               # 业务流程测试
│   └── integration/            # 系统集成测试
├── utils/                      # 工具函数
│   └── test-helpers.ts         # 测试辅助函数
├── scripts/                    # 部署脚本
│   ├── setup-test-environment.sh    # Linux/Mac部署脚本
│   └── setup-test-environment.ps1   # Windows部署脚本
└── reports/                    # 测试报告
```

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm 8+
- 所有服务正常运行（后端、前端）

### 安装依赖

```bash
# 安装项目依赖
pnpm install

# 安装Playwright浏览器
pnpm --filter backend exec playwright install
```

### 运行测试

```bash
# 运行所有端到端测试
pnpm --filter backend test:e2e

# 运行特定测试套件
pnpm --filter backend test:e2e --grep "用户认证"

# 运行测试并显示浏览器
pnpm --filter backend test:e2e:headed

# 运行测试UI模式
pnpm --filter backend test:e2e:ui
```

### 自动化环境设置

```bash
# Linux/Mac
bash tests/e2e/scripts/setup-test-environment.sh

# Windows
powershell -ExecutionPolicy Bypass -File tests/e2e/scripts/setup-test-environment.ps1
```

## 📋 测试覆盖范围

### 1. 用户认证流程测试 (`specs/auth/`)

- **登录流程测试** (`login-flow.e2e.ts`)
  - 不同用户角色登录
  - 登录失败处理
  - 表单验证

- **JWT认证测试** (`jwt-authentication.e2e.ts`)
  - 令牌生成和验证
  - 令牌过期处理
  - 令牌刷新机制

- **权限控制测试** (`permission-control.e2e.ts`)
  - 角色权限验证
  - 资源访问控制
  - 跨角色访问限制

- **会话管理测试** (`session-management.e2e.ts`)
  - 会话创建和维护
  - 会话超时处理
  - 多设备会话管理

### 2. 核心业务流程测试 (`specs/business/`)

- **用户管理测试** (`user-management.e2e.ts`)
  - 用户CRUD操作
  - 批量用户操作
  - 用户权限管理
  - 数据导入导出

- **商户管理测试** (`merchant-management.e2e.ts`)
  - 商户信息管理
  - 空间分配管理
  - 员工管理
  - 财务管理

- **访客管理测试** (`visitor-management.e2e.ts`)
  - 访客申请流程
  - 审批工作流
  - 通行码生成
  - 黑名单管理

- **数据验证测试** (`data-validation.e2e.ts`)
  - 表单数据验证
  - 业务规则验证
  - 数据完整性检查
  - 并发操作验证

### 3. 系统集成测试 (`specs/integration/`)

- **API集成测试** (`api-integration.e2e.ts`)
  - RESTful API测试
  - 错误处理测试
  - 性能测试
  - 安全性测试

- **前后端集成测试** (`frontend-backend-integration.e2e.ts`)
  - 数据流完整性
  - 状态同步测试
  - 错误恢复测试
  - 用户体验测试

- **系统稳定性测试** (`system-stability.e2e.ts`)
  - 长时间运行测试
  - 高负载压力测试
  - 异常恢复测试
  - 资源管理测试

## 🔧 配置说明

### 环境配置 (`config/test-environment.ts`)

```typescript
export const testEnvironmentConfig = {
  backend: {
    baseUrl: 'http://localhost:3000',
    port: 3000
  },
  frontend: {
    tenantAdmin: {
      baseUrl: 'http://localhost:3001',
      port: 3001
    },
    merchantAdmin: {
      baseUrl: 'http://localhost:3002', 
      port: 3002
    }
  },
  database: {
    type: 'sqlite',
    path: './tests/e2e/fixtures/test.db'
  },
  timeouts: {
    default: 30000,
    navigation: 10000,
    api: 5000
  }
};
```

### Playwright配置 (`config/playwright.config.ts`)

- 支持多浏览器测试（Chrome、Firefox、Safari）
- 自动截图和录制
- 并行测试执行
- 测试报告生成

## 📊 测试数据管理

### 测试数据结构 (`fixtures/data/`)

- `users.json` - 用户测试数据
- `merchants.json` - 商户测试数据
- `spaces.json` - 空间测试数据
- `visitor-applications.json` - 访客申请数据
- `access-records.json` - 通行记录数据

### 数据管理器 (`helpers/test-data-manager.ts`)

```typescript
const dataManager = new TestDataManager();
await dataManager.loadFixtures();
await dataManager.seedDatabase();

// 获取测试数据
const testUser = dataManager.getUserByRole('tenant_admin');
const testMerchant = dataManager.getTestMerchant();
```

## 🛠️ 辅助工具

### 测试辅助函数 (`utils/test-helpers.ts`)

```typescript
// 等待元素出现
await waitForElement(page, '[data-testid="users-table"]');

// 填写表单
await fillForm(page, {
  '[data-testid="username"]': 'test_user',
  '[data-testid="email"]': 'test@example.com'
});

// 验证通知消息
await verifyNotification(page, '操作成功', 'success');

// 生成测试数据
const userData = generateTestData('user', { role: 'admin' });
```

### 数据库管理器 (`helpers/database-manager.ts`)

```typescript
const dbManager = new DatabaseManager();
await dbManager.initialize();
await dbManager.resetDatabase();
await dbManager.cleanup();
```

## 📈 测试报告

### 报告类型

- **HTML报告**: 详细的测试结果和截图
- **JSON报告**: 机器可读的测试数据
- **JUnit报告**: CI/CD集成支持

### 查看报告

```bash
# 查看HTML报告
pnpm --filter backend test:e2e:report

# 报告位置
tests/e2e/reports/playwright-report/index.html
```

## 🔄 CI/CD集成

### GitHub Actions示例

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Setup test environment
        run: bash tests/e2e/scripts/setup-test-environment.sh
      
      - name: Run E2E tests
        run: pnpm --filter backend test:e2e
      
      - name: Upload test reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-reports
          path: tests/e2e/reports/
```

## 🐛 调试指南

### 调试模式运行

```bash
# 显示浏览器窗口
pnpm --filter backend test:e2e:headed

# 使用调试器
pnpm --filter backend test:e2e --debug

# 运行单个测试文件
pnpm --filter backend test:e2e specs/auth/login-flow.e2e.ts
```

### 常见问题

1. **测试超时**
   - 检查服务是否正常启动
   - 增加超时时间配置
   - 检查网络连接

2. **元素找不到**
   - 验证data-testid属性
   - 检查页面加载状态
   - 使用waitForElement辅助函数

3. **数据库问题**
   - 检查测试数据库配置
   - 重置测试数据
   - 验证数据库连接

## 📝 最佳实践

### 测试编写规范

1. **使用data-testid属性**
   ```html
   <button data-testid="submit-button">提交</button>
   ```

2. **等待异步操作完成**
   ```typescript
   await page.click('[data-testid="submit-button"]');
   await page.waitForLoadState('networkidle');
   ```

3. **使用页面对象模式**
   ```typescript
   class LoginPage {
     async login(username: string, password: string) {
       await this.page.fill('[data-testid="username"]', username);
       await this.page.fill('[data-testid="password"]', password);
       await this.page.click('[data-testid="login-button"]');
     }
   }
   ```

### 测试数据管理

1. **使用独立的测试数据库**
2. **每次测试前重置数据**
3. **使用工厂模式生成测试数据**
4. **避免硬编码测试数据**

### 错误处理

1. **验证错误消息显示**
2. **测试网络错误恢复**
3. **验证表单验证逻辑**
4. **测试权限控制**

## 🔮 扩展功能

### 性能测试

```typescript
// 测试页面加载性能
const startTime = Date.now();
await page.goto('/users');
const loadTime = Date.now() - startTime;
expect(loadTime).toBeLessThan(3000);
```

### 可访问性测试

```typescript
// 验证无障碍性
await verifyAccessibility(page);
```

### 移动端测试

```typescript
// 移动端视口测试
const mobileContext = await browser.newContext({
  viewport: { width: 375, height: 667 }
});
```

## 📞 支持和维护

### 联系方式

- 技术支持: tech-support@afa.com
- 文档更新: docs@afa.com

### 版本更新

定期更新测试框架以支持新功能和修复问题：

1. 更新Playwright版本
2. 添加新的测试用例
3. 优化测试性能
4. 改进错误处理

---

**注意**: 本测试框架需要与AFA办公系统的开发保持同步，确保测试用例覆盖所有新功能和变更。