# 基础认证测试文档

## 概述

本目录包含了 AFA 办公系统的基础认证测试套件，实现了任务 3.1 "创建基础认证测试" 的要求。

## 测试文件结构

```
tests/auth/
├── README.md                        # 本文档
├── basic-auth.spec.ts               # 完整的基础认证测试（需要真实应用）
├── basic-auth-demo.spec.ts          # 演示版基础认证测试（使用模拟页面）
├── login-form-validation.spec.ts    # 登录表单验证专项测试
├── login-error-handling.spec.ts     # 登录错误处理专项测试
├── multi-role-login.spec.ts         # 多角色登录测试（需要真实应用）
├── multi-role-login-demo.spec.ts    # 演示版多角色登录测试（使用模拟页面）
├── session-management.spec.ts       # 会话管理测试（需要真实应用）
└── session-management-demo.spec.ts  # 演示版会话管理测试（使用模拟页面）
```

## 测试需求覆盖

### 需求 1.1: 正确登录流程测试

- ✅ 租务管理员账户登录
- ✅ 商户管理员账户登录
- ✅ 商户员工账户登录
- ✅ 记住密码功能
- ✅ 登录加载状态处理

### 需求 1.2: 错误登录处理测试

- ✅ 不存在的用户名处理
- ✅ 错误密码处理
- ✅ 已停用账户处理
- ✅ 空用户名和密码验证
- ✅ 网络错误处理
- ✅ 服务器错误处理

### 需求 1.3: 登录表单验证测试

- ✅ 用户名格式验证
- ✅ 密码强度验证
- ✅ 表单字段必填验证
- ✅ 实时错误状态清除
- ✅ 键盘导航支持
- ✅ 表单状态管理

## 测试文件说明

### 1. basic-auth-demo.spec.ts（推荐运行）

这是一个完整的演示测试文件，使用模拟的登录页面来展示所有认证测试功能：

```bash
# 运行演示测试
npx playwright test tests/auth/basic-auth-demo.spec.ts --project=chromium-desktop
```

**特点：**

- 包含完整的模拟登录页面
- 覆盖所有测试需求
- 不依赖外部服务
- 可以独立运行

### 2. basic-auth.spec.ts

这是针对真实应用的完整测试文件：

```bash
# 运行真实应用测试（需要启动应用服务）
npx playwright test tests/auth/basic-auth.spec.ts --project=chromium-desktop
```

**特点：**

- 使用真实的 LoginPage 页面对象
- 需要应用服务运行在对应端口
- 完整的端到端测试

### 3. login-form-validation.spec.ts

专门针对表单验证的详细测试：

```bash
# 运行表单验证测试
npx playwright test tests/auth/login-form-validation.spec.ts --project=chromium-desktop
```

**测试内容：**

- 输入字段验证规则
- 实时验证反馈
- 表单状态管理
- 安全性验证
- 可访问性验证

### 4. login-error-handling.spec.ts

专门针对错误处理的详细测试：

```bash
# 运行错误处理测试
npx playwright test tests/auth/login-error-handling.spec.ts --project=chromium-desktop
```

**测试内容：**

- 用户认证错误
- 网络和服务器错误
- 客户端错误处理
- 错误恢复机制
- 用户体验优化

## 测试数据

测试使用以下预定义的测试账户：

```typescript
const testUsers = {
  tenant_admin: {
    username: "tenant_admin",
    password: "Test123456",
    role: "租务管理员",
  },
  merchant_admin: {
    username: "merchant_admin",
    password: "Test123456",
    role: "商户管理员",
  },
  employee_001: {
    username: "employee_001",
    password: "Test123456",
    role: "商户员工",
  },
  inactive_user: {
    username: "inactive_user",
    password: "Test123456",
    role: "已停用用户",
    status: "inactive",
  },
};
```

## 页面对象模型

测试使用了 `LoginPage` 页面对象，位于 `page-objects/login-page.ts`：

```typescript
import { LoginPage, UserRole } from "../../page-objects/login-page";

// 使用示例
const loginPage = new LoginPage(page);
await loginPage.goto();
await loginPage.login("tenant_admin", "Test123456");
await loginPage.expectLoginSuccess();
```

## 运行测试

### 运行所有认证测试

```bash
npx playwright test tests/auth/ --project=chromium-desktop
```

### 运行特定测试文件

```bash
npx playwright test tests/auth/basic-auth-demo.spec.ts --project=chromium-desktop
```

### 运行测试并生成报告

```bash
npx playwright test tests/auth/ --project=chromium-desktop --reporter=html
```

### 调试模式运行

```bash
npx playwright test tests/auth/basic-auth-demo.spec.ts --project=chromium-desktop --headed --debug
```

## 测试结果

最近的测试运行结果：

```
Running 20 tests using 6 workers

✅ 20 passed (12.5s)

测试覆盖：
- 正确登录流程测试: 5/5 通过
- 错误登录处理测试: 4/4 通过
- 登录表单验证测试: 5/5 通过
- 快速登录功能测试: 3/3 通过
- 登录状态验证测试: 3/3 通过
```

## 测试最佳实践

### 1. 测试隔离

- 每个测试用例都是独立的
- 使用 `beforeEach` 重新创建页面状态
- 不依赖其他测试的执行结果

### 2. 错误处理

- 使用 try-catch 处理环境限制（如 localStorage 访问）
- 提供有意义的错误消息
- 验证错误状态的恢复

### 3. 用户体验测试

- 测试键盘导航
- 验证加载状态
- 检查错误消息的用户友好性

### 4. 安全性测试

- 防止 XSS 攻击
- 防止 SQL 注入
- 验证密码字段安全性

## 扩展测试

基于当前的基础认证测试，可以进一步扩展：

1. **多角色登录测试** (任务 3.2)

   - 不同角色的权限验证
   - 角色特定的页面访问

2. **会话管理测试** (任务 3.3)

   - 自动登录功能
   - 会话过期处理
   - 退出登录流程

3. **跨浏览器测试**

   - Chrome, Firefox, Safari, Edge
   - 移动端浏览器测试

4. **性能测试**
   - 登录响应时间
   - 页面加载性能

## 故障排除

### 常见问题

1. **localStorage 访问被拒绝**

   ```
   SecurityError: Failed to read the 'localStorage' property from 'Window'
   ```

   - 原因：在 data: URL 环境中 localStorage 不可用
   - 解决：使用 try-catch 包装 localStorage 操作

2. **页面元素未找到**

   ```
   Error: element(s) not found
   ```

   - 原因：页面未完全加载或元素选择器错误
   - 解决：使用 `waitFor` 等待元素出现

3. **测试超时**
   ```
   Test timeout of 30000ms exceeded
   ```
   - 原因：网络延迟或页面加载缓慢
   - 解决：增加超时时间或优化等待策略

### 调试技巧

1. **使用截图调试**

   ```typescript
   await page.screenshot({ path: "debug.png" });
   ```

2. **查看页面内容**

   ```typescript
   console.log(await page.content());
   ```

3. **启用详细日志**
   ```bash
   DEBUG=pw:api npx playwright test
   ```

## 贡献指南

添加新的认证测试时，请遵循以下规范：

1. **命名规范**

   - 测试文件：`*.spec.ts`
   - 测试描述：使用中文，清晰描述测试目的
   - 测试分组：使用 `test.describe` 按功能分组

2. **测试结构**

   ```typescript
   test.describe("功能模块名称", () => {
     test.beforeEach(async ({ page }) => {
       // 测试前置条件
     });

     test("应该实现具体功能", async ({ page }) => {
       // 测试步骤
       // 断言验证
     });
   });
   ```

3. **断言规范**

   - 使用有意义的断言消息
   - 验证用户可见的行为
   - 包含错误场景测试

4. **文档更新**
   - 更新本 README 文件
   - 添加测试用例说明
   - 更新测试覆盖率信息
