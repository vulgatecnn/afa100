# 跨浏览器兼容性集成测试

## 概述

本目录包含AFA办公小程序系统的跨浏览器兼容性集成测试，验证系统在不同浏览器、设备和屏幕尺寸下的功能一致性和前后端API兼容性。

## 测试覆盖范围

### 支持的浏览器
- **Chrome Desktop** - 最新版本
- **Firefox Desktop** - 最新版本  
- **Safari Desktop** - 最新版本
- **Edge Desktop** - 最新版本

### 支持的设备类型
- **桌面端** - 1920x1080, 1366x768
- **平板端** - 1024x768 (iPad Pro)
- **移动端** - 393x851 (Pixel 5), 390x844 (iPhone 12)

### 测试类型

#### 1. 浏览器兼容性测试 (`browser-compatibility.e2e.ts`)
- 浏览器基础特性检测
- JavaScript API兼容性验证
- CSS特性支持检测
- 表单和输入兼容性
- 事件处理兼容性
- 网络请求错误处理
- 浏览器存储兼容性

#### 2. API兼容性测试 (`api-compatibility.e2e.ts`)
- HTTP方法兼容性验证
- 请求头处理兼容性
- JSON数据传输兼容性
- 文件上传兼容性
- WebSocket连接兼容性
- Cookie和Session兼容性
- CORS预检请求兼容性
- 错误响应格式兼容性

#### 3. 响应式设计测试 (`responsive-design.e2e.ts`)
- 不同分辨率下的功能测试
- 桌面端/平板端/移动端数据交互
- 触摸和鼠标交互兼容性
- UI元素响应式显示
- 表单功能跨设备一致性
- 文件上传跨设备兼容性
- 网络状态变化处理
- 跨设备数据同步

## 运行测试

### 基础命令

```bash
# 运行所有跨浏览器测试
pnpm test:e2e:cross-browser

# 有头模式运行（调试用）
pnpm test:e2e:cross-browser:headed

# 查看测试报告
pnpm test:e2e:cross-browser:report
```

### 使用测试运行器脚本

```bash
# 运行所有浏览器的兼容性测试
node tests/e2e/scripts/run-cross-browser-tests.js

# 只测试Chrome和Firefox
node tests/e2e/scripts/run-cross-browser-tests.js --browsers chrome-desktop,firefox-desktop

# 运行响应式设计测试
node tests/e2e/scripts/run-cross-browser-tests.js --test-types responsive-design

# 调试模式运行特定测试
node tests/e2e/scripts/run-cross-browser-tests.js --debug --grep "API兼容性"

# 只测试桌面设备
node tests/e2e/scripts/run-cross-browser-tests.js --devices desktop
```

### 高级选项

```bash
# 指定特定项目运行
playwright test --config tests/e2e/config/cross-browser.config.ts --project chrome-desktop

# 运行特定测试文件
playwright test --config tests/e2e/config/cross-browser.config.ts browser-compatibility.e2e.ts

# 并行运行测试
playwright test --config tests/e2e/config/cross-browser.config.ts --workers 4

# 设置重试次数
playwright test --config tests/e2e/config/cross-browser.config.ts --retries 2
```

## 测试配置

### 环境变量

```bash
# 后端服务地址
E2E_BACKEND_URL=http://localhost:5100

# 前端服务地址
E2E_TENANT_ADMIN_URL=http://localhost:5000
E2E_MERCHANT_ADMIN_URL=http://localhost:5050

# 是否检查前端服务
E2E_CHECK_FRONTEND=true

# 跨浏览器测试标志
CROSS_BROWSER_TEST=true
```

### 浏览器配置

每个浏览器项目都有特定的配置：

- **Chrome Desktop**: 1920x1080 视口，完整功能支持
- **Firefox Desktop**: 1920x1080 视口，Firefox特定优化
- **Safari Desktop**: 1920x1080 视口，WebKit引擎特性
- **Edge Desktop**: 1920x1080 视口，Chromium内核

### 设备配置

不同设备类型的视口配置：

- **Desktop**: 1920x1080, 1366x768
- **Tablet**: 1024x768 (iPad Pro)
- **Mobile**: 393x851 (Pixel 5), 390x844 (iPhone 12)

## 测试结果

### 报告格式

测试完成后会生成以下格式的报告：

- **HTML报告**: `tests/e2e/reports/cross-browser-report/index.html`
- **JSON报告**: `tests/e2e/reports/cross-browser-results.json`
- **JUnit报告**: `tests/e2e/reports/cross-browser-junit.xml`

### 测试指标

- **浏览器特性支持率**: 各浏览器对现代Web特性的支持情况
- **API兼容性**: 前后端API在不同浏览器中的兼容性
- **响应式适配**: UI在不同屏幕尺寸下的适配情况
- **性能指标**: 不同浏览器的加载和响应时间

## 故障排除

### 常见问题

1. **浏览器启动失败**
   ```bash
   # 安装浏览器
   npx playwright install
   ```

2. **测试超时**
   ```bash
   # 增加超时时间
   playwright test --timeout 60000
   ```

3. **网络连接问题**
   ```bash
   # 检查服务状态
   curl http://localhost:5100/api/v1/health
   ```

4. **权限问题**
   ```bash
   # 在Windows上可能需要管理员权限
   # 在Linux上确保用户有访问浏览器的权限
   ```

### 调试技巧

1. **启用调试模式**
   ```bash
   node tests/e2e/scripts/run-cross-browser-tests.js --debug
   ```

2. **查看浏览器控制台**
   ```bash
   playwright test --headed --debug
   ```

3. **截图和录像**
   - 失败时自动截图保存在 `tests/e2e/reports/cross-browser-artifacts/`
   - 失败时自动录制视频

4. **网络日志**
   - 测试中会自动记录API请求和响应
   - 查看控制台输出获取详细信息

## 最佳实践

### 编写测试

1. **使用描述性的测试名称**
   ```typescript
   test('应该在Chrome浏览器中正确处理文件上传', async () => {
     // 测试实现
   });
   ```

2. **添加适当的等待**
   ```typescript
   await page.waitForLoadState('networkidle');
   await page.waitForSelector('.element');
   ```

3. **处理异步操作**
   ```typescript
   const response = await page.request.get('/api/v1/health');
   expect(response.ok()).toBe(true);
   ```

4. **清理测试数据**
   ```typescript
   test.afterEach(async () => {
     // 清理操作
   });
   ```

### 维护测试

1. **定期更新浏览器版本**
2. **监控测试稳定性**
3. **优化测试执行时间**
4. **保持测试数据最新**

## 集成CI/CD

### GitHub Actions示例

```yaml
name: Cross-Browser Tests
on: [push, pull_request]

jobs:
  cross-browser-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: pnpm install
      - name: Install Playwright browsers
        run: npx playwright install
      - name: Run cross-browser tests
        run: pnpm test:e2e:cross-browser
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: cross-browser-report
          path: tests/e2e/reports/cross-browser-report/
```

## 相关文档

- [Playwright文档](https://playwright.dev/)
- [跨浏览器测试最佳实践](https://web.dev/cross-browser-testing/)
- [响应式设计测试指南](https://web.dev/responsive-web-design-basics/)
- [Web兼容性检查清单](https://web.dev/compat2021/)