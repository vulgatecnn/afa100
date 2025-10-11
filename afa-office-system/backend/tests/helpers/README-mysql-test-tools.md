# MySQL测试工具集合

这个目录包含了专门为MySQL数据库优化的测试工具和辅助类，用于支持AFA办公小程序的MySQL测试框架。

## 概述

MySQL测试工具集合提供了以下核心功能：

- **MySQL测试数据工厂**: 生成MySQL兼容的测试数据
- **MySQL数据库测试辅助工具**: 提供性能监控和诊断功能
- **MySQL超时管理器**: 管理MySQL操作的超时和重试机制
- **MySQL测试工具套件**: 统一管理所有MySQL测试工具

## 文件结构

```
tests/helpers/
├── mysql-test-data-factory.ts      # MySQL测试数据工厂
├── mysql-database-test-helper.ts   # MySQL数据库测试辅助工具
├── mysql-timeout-manager.ts        # MySQL超时管理器
├── mysql-test-tools.ts             # 统一导出和工具套件
└── README-mysql-test-tools.md      # 本文档
```

## 核心组件

### 1. MySQLTestDataFactory

专门为MySQL数据库优化的测试数据生成工厂。

**特性:**
- MySQL数据类型兼容性
- 字符串长度验证
- 日期时间格式化
- 批量数据插入优化
- 事务支持

**使用示例:**
```typescript
import { MySQLTestDataFactory } from './mysql-test-data-factory';
import { MySQLAdapter } from '../../src/adapters/mysql-adapter';

const adapter = new MySQLAdapter();
const factory = new MySQLTestDataFactory(adapter);

// 创建单个用户数据
const user = factory.createMySQLUser({
  name: '测试用户',
  user_type: 'merchant_admin'
});

// 批量插入用户数据
const users = await factory.seedMySQLUsers(100, {
  status: 'active'
});

// 创建完整测试场景
const scenario = await factory.seedMySQLCompleteScenario();
```

### 2. MySQLDatabaseTestHelper

提供MySQL特有的性能监控、诊断和测试辅助功能。

**特性:**
- 连接状态验证
- 性能指标收集
- 慢查询监控
- 表统计信息
- 健康检查
- 诊断报告生成

**使用示例:**
```typescript
import { MySQLDatabaseTestHelper } from './mysql-database-test-helper';

const helper = new MySQLDatabaseTestHelper(adapter);

// 验证连接
const isConnected = await helper.verifyMySQLConnection();

// 收集性能指标
const metrics = await helper.collectMySQLPerformanceMetrics();

// 生成诊断报告
const report = await helper.generateMySQLDiagnosticReport();

// 执行性能测试
const perfResults = await helper.runMySQLPerformanceTest({
  insertCount: 1000,
  selectCount: 1000
});
```

### 3. MySQLTimeoutManager

针对MySQL连接池优化的超时处理管理器。

**特性:**
- 多种操作类型的超时配置
- 自动重试机制
- 超时统计和监控
- 活跃操作跟踪
- 健康检查

**使用示例:**
```typescript
import { MySQLTimeoutManager } from './mysql-timeout-manager';

const timeoutManager = new MySQLTimeoutManager(adapter, {
  queryTimeout: 30000,
  transactionTimeout: 120000,
  maxRetries: 3
});

// 执行带超时的查询
const result = await timeoutManager.executeQuery(
  'SELECT * FROM users WHERE status = ?',
  ['active']
);

// 执行带超时的事务
const txResult = await timeoutManager.executeTransaction(async () => {
  // 事务操作
  await adapter.run('INSERT INTO users ...');
  await adapter.run('UPDATE merchants ...');
});

// 获取超时统计
const stats = timeoutManager.getTimeoutStats();
```

### 4. MySQLTestToolkit

统一管理所有MySQL测试工具的套件类。

**特性:**
- 一站式工具初始化
- 完整的健康检查
- 综合报告生成
- 测试环境管理

**使用示例:**
```typescript
import { MySQLTestToolkit } from './mysql-test-tools';

const toolkit = new MySQLTestToolkit(adapter, {
  dataFactoryOptions: { batchSize: 100 },
  timeoutConfig: { queryTimeout: 30000 }
});

// 初始化测试环境
await toolkit.initializeTestEnvironment('test_db_123');

// 执行完整健康检查
const healthCheck = await toolkit.performCompleteHealthCheck();

// 生成综合报告
const report = await toolkit.generateComprehensiveReport();

// 清理测试环境
await toolkit.cleanupTestEnvironment('test_db_123');
```

## 配置选项

### MySQL超时配置

```typescript
interface MySQLTimeoutConfig {
  // 连接超时配置
  connectionTimeout: number;        // 连接超时时间 (ms)
  acquireTimeout: number;          // 获取连接超时时间 (ms)
  idleTimeout: number;             // 空闲连接超时时间 (ms)
  
  // 查询超时配置
  queryTimeout: number;            // 单个查询超时时间 (ms)
  transactionTimeout: number;      // 事务超时时间 (ms)
  longQueryTimeout: number;        // 长查询超时时间 (ms)
  
  // 测试特定超时配置
  testSetupTimeout: number;        // 测试环境设置超时时间 (ms)
  testCleanupTimeout: number;      // 测试清理超时时间 (ms)
  bulkOperationTimeout: number;    // 批量操作超时时间 (ms)
  
  // 重试配置
  maxRetries: number;              // 最大重试次数
  retryDelay: number;              // 重试延迟时间 (ms)
  backoffMultiplier: number;       // 退避乘数
  
  // 监控配置
  enableTimeoutLogging: boolean;   // 启用超时日志
  timeoutWarningThreshold: number; // 超时警告阈值 (ms)
}
```

### 数据工厂配置

```typescript
interface DataFactoryOptions {
  batchSize?: number;              // 批量操作大小 (默认: 100)
  useTransactions?: boolean;       // 是否使用事务 (默认: true)
}
```

## 最佳实践

### 1. 测试环境隔离

```typescript
// 为每个测试创建独立的数据库
const testDbName = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
await toolkit.initializeTestEnvironment(testDbName);

try {
  // 执行测试
  const scenario = await toolkit.createQuickTestScenario();
  // ... 测试逻辑
} finally {
  // 清理测试环境
  await toolkit.cleanupTestEnvironment(testDbName);
}
```

### 2. 性能监控

```typescript
// 在测试开始前收集基线指标
const baselineMetrics = await helper.collectMySQLPerformanceMetrics();

// 执行测试操作
await performTestOperations();

// 收集测试后指标并比较
const afterMetrics = await helper.collectMySQLPerformanceMetrics();
const performanceDelta = calculateDelta(baselineMetrics, afterMetrics);
```

### 3. 超时处理

```typescript
// 为不同类型的操作设置合适的超时时间
const timeoutManager = new MySQLTimeoutManager(adapter, {
  queryTimeout: 30000,      // 普通查询30秒
  transactionTimeout: 120000, // 事务2分钟
  bulkOperationTimeout: 600000 // 批量操作10分钟
});

// 使用超时管理器执行操作
const result = await timeoutManager.executeWithTimeout(
  () => performComplexOperation(),
  TimeoutOperationType.BULK_OPERATION
);
```

### 4. 错误处理

```typescript
try {
  const result = await timeoutManager.executeQuery(sql, params);
  
  if (!result.success) {
    if (result.timedOut) {
      console.error('查询超时:', result.error);
      // 处理超时情况
    } else {
      console.error('查询失败:', result.error);
      // 处理其他错误
    }
  }
} catch (error) {
  console.error('执行异常:', error);
}
```

## 测试运行

运行MySQL测试工具的单元测试：

```bash
# 使用专用配置运行测试
pnpm vitest --config vitest.mysql-tools.config.js --run

# 或者运行特定测试文件
pnpm vitest tests/unit/helpers/mysql-test-tools.test.ts --run
```

## 依赖要求

- Node.js 18+
- MySQL 8.0+
- TypeScript 4.5+
- Vitest 1.0+
- @faker-js/faker 8.0+

## 环境变量

```bash
# MySQL连接配置
TEST_DB_TYPE=mysql
TEST_DB_HOST=127.0.0.1
TEST_DB_PORT=3306
TEST_DB_USER=root
TEST_DB_PASSWORD=111111

# 超时配置
MYSQL_QUERY_TIMEOUT=30000
MYSQL_TRANSACTION_TIMEOUT=120000
MYSQL_CONNECTION_TIMEOUT=60000
```

## 故障排除

### 常见问题

1. **连接超时**
   - 检查MySQL服务状态
   - 验证连接参数
   - 增加连接超时时间

2. **查询超时**
   - 检查查询复杂度
   - 优化索引
   - 增加查询超时时间

3. **内存使用过高**
   - 减少批量操作大小
   - 启用事务管理
   - 及时清理测试数据

### 调试技巧

```typescript
// 启用详细日志
const timeoutManager = new MySQLTimeoutManager(adapter, {
  enableTimeoutLogging: true,
  timeoutWarningThreshold: 5000
});

// 监控活跃操作
const activeOps = timeoutManager.getActiveOperations();
console.log('活跃操作:', activeOps);

// 生成诊断报告
const diagnostics = await helper.generateMySQLDiagnosticReport();
console.log('诊断报告:', JSON.stringify(diagnostics, null, 2));
```

## 贡献指南

1. 遵循现有的代码风格和命名约定
2. 为新功能添加相应的单元测试
3. 更新文档和类型定义
4. 确保所有测试通过
5. 提交前运行代码检查

## 许可证

本项目采用 MIT 许可证。