# 前后端集成测试 CI/CD 系统

## 概述

本文档描述了 AFA 办公小程序系统的前后端集成测试 CI/CD 流水线的设计、配置和使用方法。该系统提供了完整的自动化测试、环境管理、结果分析和通知功能。

## 系统架构

### 核心组件

1. **GitHub Actions 工作流** (`.github/workflows/integration-tests.yml`)
   - 自动化 CI/CD 流水线
   - 多环境并行测试
   - 跨浏览器兼容性测试

2. **测试环境管理器** (`scripts/ci-test-environment.js`)
   - 自动化环境创建和销毁
   - 服务启动和健康检查
   - 端口管理和冲突解决

3. **测试编排器** (`scripts/test-environment-orchestrator.js`)
   - 统一测试流程管理
   - 测试会话跟踪
   - 结果收集和分析

4. **数据管理系统** (`shared/test-helpers/test-data-manager.ts`)
   - 测试数据快照和版本控制
   - 数据回滚和恢复
   - 测试数据清理

5. **结果存储系统** (`shared/test-helpers/test-results-storage.ts`)
   - 历史测试结果存储
   - 趋势分析和报告
   - 性能监控

6. **通知系统** (`shared/test-helpers/ci-notification.ts`)
   - 多渠道通知支持
   - 自定义通知模板
   - 失败重试机制

## 快速开始

### 1. 环境准备

确保系统已安装以下依赖：

```bash
# 检查 Node.js 版本 (需要 18+)
node --version

# 检查 pnpm 版本 (需要 8+)
pnpm --version

# 安装项目依赖
pnpm install
```

### 2. 本地测试

```bash
# 运行所有集成测试
pnpm ci:test

# 运行特定类型的测试
pnpm ci:test:unit        # 单元测试
pnpm ci:test:integration # 集成测试
pnpm ci:test:e2e         # 端到端测试

# 手动管理测试环境
pnpm ci:env:create       # 创建测试环境
pnpm ci:env:destroy      # 销毁测试环境
pnpm ci:env:recreate     # 重新创建测试环境
```

### 3. 生成测试报告

```bash
# 生成所有格式的报告
pnpm ci:report

# 生成特定格式的报告
pnpm ci:report:html      # HTML 报告
pnpm ci:report:json      # JSON 报告
pnpm ci:report:markdown  # Markdown 报告
```

## CI/CD 工作流

### 触发条件

工作流在以下情况下自动触发：

1. **代码推送** - 推送到 `main` 或 `develop` 分支
2. **Pull Request** - 创建或更新 PR
3. **定时执行** - 每天凌晨 3 点自动运行
4. **手动触发** - 通过 GitHub Actions 界面手动执行

### 执行阶段

#### 1. 环境准备 (Setup)
- 检出代码
- 设置 Node.js 和 pnpm
- 缓存依赖
- 安装项目依赖

#### 2. 后端测试 (Backend Tests)
- 启动 MySQL 服务
- 初始化测试数据库
- 代码质量检查 (ESLint, TypeScript)
- 构建后端应用
- 运行单元测试和集成测试
- 生成覆盖率报告

#### 3. 前端测试 (Frontend Tests)
- 并行测试租务管理端和商户管理端
- 代码质量检查
- 构建前端应用
- 运行组件测试

#### 4. 端到端测试 (E2E Tests)
- 启动完整的测试环境
- 多浏览器并行测试 (Chrome, Firefox)
- 业务流程完整性验证
- 跨浏览器兼容性测试

#### 5. 结果汇总 (Test Summary)
- 收集所有测试结果
- 生成综合测试报告
- 上传测试产物
- 检查测试通过状态

#### 6. 通知 (Notification)
- 发送测试结果通知
- 更新 GitHub 状态检查

### 环境变量配置

在 GitHub 仓库的 Settings > Secrets 中配置以下环境变量：

#### 数据库配置
```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=afa_office_test
DB_USER=afa_test
DB_PASSWORD=test_password
```

#### 通知配置
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
DINGTALK_WEBHOOK_URL=https://oapi.dingtalk.com/...
NOTIFICATION_ENABLED=true
```

#### 测试配置
```
TEST_TIMEOUT=300000
COVERAGE_THRESHOLD=80
TEST_PARALLEL=true
TEST_MAX_WORKERS=4
```

## 测试数据管理

### 数据快照

系统支持测试数据的快照和版本控制：

```typescript
import { TestDataManager } from '../shared/test-helpers/test-data-manager.js';

const dataManager = new TestDataManager();

// 创建数据快照
const snapshotId = await dataManager.createSnapshot('baseline-data', '基线测试数据');

// 恢复数据快照
await dataManager.restoreSnapshot(snapshotId);

// 列出所有快照
const snapshots = await dataManager.listSnapshots();

// 比较快照差异
const diff = await dataManager.compareSnapshots(snapshot1, snapshot2);
```

### 数据清理

测试完成后自动清理测试数据：

```typescript
// 清理所有测试数据
await dataManager.cleanupTestData();

// 初始化基础测试数据
await dataManager.initializeTestData();
```

## 测试结果分析

### 结果存储

所有测试结果都会自动存储到本地文件系统：

```typescript
import { TestResultsStorage } from '../shared/test-helpers/test-results-storage.js';

const storage = new TestResultsStorage();

// 查询测试结果
const results = await storage.queryResults({
  environment: 'ci',
  branch: 'main',
  dateFrom: '2024-01-01',
  limit: 10
});

// 生成分析报告
const analytics = await storage.generateAnalytics('month');
```

### 趋势分析

系统提供以下分析功能：

1. **通过率趋势** - 测试通过率的历史变化
2. **性能分析** - 测试执行时间和性能指标
3. **覆盖率趋势** - 代码覆盖率的变化情况
4. **不稳定性分析** - 识别不稳定的测试用例
5. **失败模式分析** - 常见失败原因和模式

### 报告格式

支持多种报告格式：

- **HTML 报告** - 交互式 Web 报告，包含图表和详细信息
- **JSON 报告** - 机器可读格式，便于集成其他工具
- **Markdown 报告** - 文本格式，便于在文档中嵌入

## 通知系统

### 支持的通知渠道

1. **Slack** - 企业团队协作
2. **钉钉** - 国内团队协作
3. **GitHub** - 状态检查和评论
4. **Webhook** - 自定义集成
5. **邮件** - 传统邮件通知

### 通知配置

```typescript
import { CITestNotificationManager } from '../shared/test-helpers/ci-notification.js';

const notificationManager = new CITestNotificationManager({
  enabled: true,
  channels: [
    {
      type: 'slack',
      name: 'Slack',
      enabled: true,
      config: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL
      }
    }
  ]
});

// 发送测试结果通知
await notificationManager.sendTestNotification({
  status: 'success',
  summary: testResults.summary,
  environment: 'ci',
  branch: 'main',
  commit: 'abc123'
});
```

### 通知模板

支持自定义通知模板：

```typescript
const templates = {
  success: {
    title: '✅ 前后端集成测试通过',
    message: '{{emoji}} 测试{{status}}！{{passed}}/{{total}} 通过 ({{passRate}}%)',
    emoji: '✅'
  },
  failure: {
    title: '❌ 前后端集成测试失败',
    message: '{{emoji}} 测试{{status}}！{{failed}} 个测试失败',
    emoji: '❌'
  }
};
```

## 性能优化

### 并行执行

- 测试套件并行执行，提高执行效率
- 浏览器测试矩阵并行运行
- 前后端测试独立并行

### 缓存策略

- 依赖缓存：缓存 `node_modules` 和 pnpm store
- 构建缓存：缓存编译产物
- 测试缓存：缓存测试结果和覆盖率数据

### 资源管理

- 自动清理过期的测试结果
- 限制并发测试数量
- 智能重试机制

## 故障排除

### 常见问题

#### 1. 端口冲突

```bash
# 检查端口占用
netstat -ano | findstr :5100

# 终止占用进程
taskkill /PID <进程ID> /F

# 或使用自动化脚本
pnpm ci:env:recreate
```

#### 2. 数据库连接失败

```bash
# 检查 MySQL 服务状态
mysqladmin ping -h localhost -P 3306 -u root -p

# 重新初始化数据库
pnpm --filter backend db:integration:init
```

#### 3. 测试超时

调整超时配置：

```bash
# 设置更长的超时时间
export TEST_TIMEOUT=600000  # 10分钟
export API_TIMEOUT=60000    # 1分钟
```

#### 4. 内存不足

```bash
# 减少并行测试数量
export TEST_MAX_WORKERS=2
export TEST_PARALLEL=false
```

### 调试模式

启用详细日志输出：

```bash
# 启用调试模式
export DEBUG=true
export VERBOSE=true

# 运行测试
pnpm ci:test
```

### 日志分析

查看详细的测试日志：

```bash
# 查看 CI 日志
cat test-sessions/*/session.json

# 查看测试报告
open test-reports/test-report.html
```

## 最佳实践

### 1. 测试编写

- 保持测试的独立性和幂等性
- 使用有意义的测试名称和描述
- 避免测试间的依赖关系
- 及时清理测试产生的副作用

### 2. 数据管理

- 使用测试专用的数据库
- 每个测试用例使用独立的测试数据
- 定期清理过期的测试数据
- 使用数据快照进行快速恢复

### 3. 环境管理

- 保持测试环境与生产环境的一致性
- 使用容器化部署提高环境一致性
- 定期更新测试环境的依赖
- 监控测试环境的资源使用情况

### 4. 性能优化

- 合理设置并行度，避免资源竞争
- 使用缓存减少重复构建时间
- 优化测试用例的执行顺序
- 定期分析和优化慢测试

### 5. 监控和维护

- 定期检查测试结果趋势
- 及时修复不稳定的测试
- 监控测试执行时间变化
- 保持测试覆盖率在合理水平

## 扩展和定制

### 添加新的测试类型

1. 在 `test-environment-orchestrator.js` 中添加新的测试类型配置
2. 实现对应的测试执行逻辑
3. 更新 GitHub Actions 工作流
4. 添加相应的 npm 脚本

### 集成新的通知渠道

1. 在 `ci-notification.ts` 中实现新的通知渠道
2. 添加相应的配置选项
3. 更新环境变量文档
4. 测试通知功能

### 自定义报告格式

1. 在 `ci-test-reporter.js` 中添加新的报告生成器
2. 实现自定义的报告模板
3. 添加相应的命令行选项
4. 更新文档说明

## 参考资料

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Vitest 测试框架](https://vitest.dev/)
- [Playwright E2E 测试](https://playwright.dev/)
- [pnpm 包管理器](https://pnpm.io/)
- [MySQL 数据库](https://dev.mysql.com/doc/)

## 支持和反馈

如有问题或建议，请通过以下方式联系：

- 创建 GitHub Issue
- 发送邮件到开发团队
- 在团队 Slack 频道讨论

---

*最后更新时间: 2024年12月*