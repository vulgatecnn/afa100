# AFA办公系统 Playwright 端到端测试

## 概述

本项目实现了 AFA 办公系统的完整端到端测试框架，使用 Playwright 进行真实浏览器环境下的自动化测试。

## 项目结构

```
e2e-tests/
├── config/
│   └── environments.ts          # 多环境配置管理
├── fixtures/
│   ├── test-data.ts            # 预定义测试数据
│   └── test-data-factory.ts    # 动态测试数据生成工厂
├── utils/
│   ├── global-setup.ts         # 全局测试设置
│   ├── global-teardown.ts      # 全局测试清理
│   ├── test-environment-manager.ts  # 测试环境管理器
│   ├── health-checker.ts       # 服务健康检查器
│   ├── database-manager.ts     # 数据库管理器
│   ├── test-data-manager.ts    # 测试数据管理器
│   ├── test-helpers.ts         # 测试辅助工具
│   └── page-objects.ts         # 页面对象模型
├── tests/                      # 测试用例目录
├── playwright.config.ts        # Playwright 配置文件
├── .env.example               # 环境变量模板
└── README.md                  # 项目说明文档
```

## 核心功能

### 1. 多环境支持

- **本地开发环境** (local): 自动启动本地服务
- **预发布环境** (staging): 连接预发布服务器
- **生产环境** (production): 连接生产服务器
- **CI环境** (ci): 持续集成专用配置

### 2. 测试环境管理

- **服务生命周期管理**: 自动启动/停止后端API、前端服务
- **健康检查**: 实时监控服务状态，自动重启失败服务
- **端口管理**: 自动检测和清理端口冲突

### 3. 测试数据管理

- **预定义数据**: 基础测试用户、商户、设备等数据
- **动态数据生成**: 支持批量生成测试数据
- **数据快照**: 创建和恢复测试数据快照
- **自动清理**: 测试完成后自动清理测试数据

### 4. 浏览器兼容性测试

- **桌面浏览器**: Chrome, Firefox, Safari, Edge
- **移动端**: Chrome Mobile, Safari Mobile
- **平板设备**: iPad Pro
- **高分辨率**: 4K显示器支持

### 5. 测试报告

- **HTML报告**: 详细的测试执行报告
- **JSON报告**: 机器可读的测试结果
- **JUnit报告**: CI/CD集成支持
- **Allure报告**: 高级测试报告（可选）

## 快速开始

### 1. 安装依赖

```bash
cd afa-office-system/e2e-tests
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置测试环境
```

### 3. 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定浏览器测试
pnpm test --project=chromium-desktop

# 调试模式运行
DEBUG=true pnpm test

# 运行特定测试文件
pnpm test tests/login.test.ts
```

## 环境配置

### 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `TEST_ENV` | 测试环境 | `local` |
| `DEBUG` | 调试模式 | `false` |
| `CI` | CI环境标识 | `false` |
| `INIT_TEST_DATA` | 初始化测试数据 | `true` |
| `CLEANUP_TEST_DATA` | 清理测试数据 | `true` |

### 服务端口配置

- **后端API**: 5100端口
- **租务管理端**: 5000端口
- **商户管理端**: 5050端口

## 测试数据

### 预定义用户

- **租务管理员**: `tenant_admin` / `Test123456`
- **商户管理员**: `merchant_admin` / `Test123456`
- **商户员工**: `employee_001` / `Test123456`

### 动态数据生成

```typescript
import { TestDataFactory } from './fixtures/test-data-factory';

// 创建测试用户
const user = TestDataFactory.createUser({
  name: '测试用户',
  role: 'merchant_employee'
});

// 创建测试商户
const merchant = TestDataFactory.createMerchant({
  name: '测试公司'
});

// 批量创建数据
const users = TestDataFactory.createUsers(10);
```

## 页面对象模型

```typescript
import { LoginPage, DashboardPage } from './utils/page-objects';

test('用户登录测试', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);
  
  await loginPage.goto();
  await loginPage.login('tenant_admin', 'Test123456');
  await dashboardPage.expectDashboardLoaded();
});
```

## 测试辅助工具

```typescript
import { TestHelpers } from './utils/test-helpers';

test('快速登录测试', async ({ page }) => {
  // 快速登录为租务管理员
  await TestHelpers.loginAs(page, 'tenantAdmin');
  
  // 等待通知消息
  await TestHelpers.expectNotification(page, '登录成功');
  
  // 模拟API响应
  await TestHelpers.mockApiResponse(page, '/api/v1/merchants', mockData);
});
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: pnpm install
      - name: Run E2E tests
        run: pnpm test
        env:
          CI: true
          TEST_ENV: ci
```

## 性能监控

测试框架内置性能监控功能：

- **页面加载时间**: 监控页面加载性能
- **API响应时间**: 监控接口响应速度
- **内存使用**: 检测内存泄漏
- **资源加载**: 监控静态资源加载

## 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # Windows
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F
   
   # 或使用项目脚本
   .\scripts\kill-dev.cmd
   ```

2. **服务启动失败**
   - 检查端口是否被占用
   - 确认依赖服务是否正常运行
   - 查看服务日志输出

3. **测试数据问题**
   - 使用 `CLEAN_TEST_RESULTS=true` 清理旧数据
   - 重置测试数据: `pnpm test:reset-data`

### 调试技巧

1. **启用调试模式**
   ```bash
   DEBUG=true pnpm test
   ```

2. **查看浏览器界面**
   ```bash
   pnpm test --headed
   ```

3. **单步调试**
   ```bash
   pnpm test --debug
   ```

## 贡献指南

1. 遵循现有的代码风格和命名约定
2. 为新功能添加相应的测试用例
3. 更新相关文档
4. 确保所有测试通过

## 许可证

本项目采用 MIT 许可证。