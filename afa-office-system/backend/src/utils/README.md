# 数据库工具模块

本模块包含了AFA办公小程序后端的数据库连接管理、重试机制和事务管理功能。

## 主要组件

### 1. 连接池管理 (connection-pool.ts)

**功能特性：**
- 连接池管理，支持最小/最大连接数配置
- 连接获取、释放和监控
- 连接健康检查和自动清理
- 连接池统计信息收集
- 事件驱动的连接生命周期管理

**配置选项：**
- `min`: 最小连接数
- `max`: 最大连接数  
- `acquireTimeoutMillis`: 获取连接超时时间
- `idleTimeoutMillis`: 空闲连接超时时间
- `createTimeoutMillis`: 创建连接超时时间
- `reapIntervalMillis`: 清理空闲连接的间隔时间

### 2. 重试机制 (retry-manager.ts)

**功能特性：**
- 指数退避重试策略
- SQLite特定错误识别和处理
- 可配置的重试条件和次数
- 重试统计信息收集
- 批量操作重试支持

**支持的错误类型：**
- `SQLITE_BUSY`: 数据库繁忙
- `SQLITE_LOCKED`: 数据库锁定
- `SQLITE_PROTOCOL`: 协议错误
- `SQLITE_IOERR`: I/O错误
- 以及其他SQLite相关错误

**重试策略：**
- 基础延迟时间 + 指数退避
- 随机抖动避免雷群效应
- 最大延迟时间限制
- 环境特定的重试配置

### 3. 事务管理 (transaction-manager.ts)

**功能特性：**
- 支持嵌套事务和保存点
- 事务超时控制
- 事务统计和监控
- 自动回滚和错误处理
- 事务生命周期事件

**事务选项：**
- `timeout`: 事务超时时间
- `isolationLevel`: 隔离级别 (DEFERRED/IMMEDIATE/EXCLUSIVE)
- `retryOnDeadlock`: 死锁时是否重试
- `maxRetries`: 最大重试次数
- `savepoints`: 是否支持保存点

### 4. 数据库主类 (database.ts)

**功能特性：**
- 统一的数据库操作接口
- 自动重试和错误处理
- 性能监控和慢查询检测
- 连接池集成
- 事务支持
- 健康检查和维护操作

**主要方法：**
- `connect()`: 初始化连接池
- `all()`: 查询多行数据
- `get()`: 查询单行数据
- `run()`: 执行修改操作
- `withTransaction()`: 事务执行
- `healthCheck()`: 健康检查
- `getPerformanceMetrics()`: 性能指标

### 5. 数据库配置 (database.config.ts)

**功能特性：**
- 环境特定的数据库配置
- 配置验证和优化
- 动态配置调整
- PRAGMA设置管理

**环境配置：**
- `development`: 开发环境配置
- `test`: 测试环境配置  
- `production`: 生产环境配置

## 使用示例

### 基本数据库操作

```typescript
import database from './database.js';

// 初始化连接池
await database.connect();

// 查询数据
const users = await database.all('SELECT * FROM users WHERE active = ?', [1]);
const user = await database.get('SELECT * FROM users WHERE id = ?', [userId]);

// 修改数据
const result = await database.run('INSERT INTO users (name, email) VALUES (?, ?)', [name, email]);

// 事务操作
await database.withTransaction(async (tx) => {
  await tx.run('INSERT INTO users (name) VALUES (?)', ['用户1']);
  await tx.run('INSERT INTO logs (action) VALUES (?)', ['创建用户']);
});
```

### 性能监控

```typescript
// 获取性能指标
const metrics = await database.getPerformanceMetrics();
console.log('查询总数:', metrics.database.queryCount);
console.log('平均查询时间:', metrics.database.averageQueryTime);
console.log('慢查询数量:', metrics.database.slowQueries.length);

// 获取连接池状态
const poolStats = database.getPoolStats();
console.log('活跃连接:', poolStats.activeConnections);
console.log('总连接数:', poolStats.totalConnections);

// 健康检查
const health = await database.healthCheck();
console.log('数据库状态:', health.status);
```

### 重试机制

```typescript
// 自定义重试操作
const result = await database.executeWithRetry(async () => {
  // 可能失败的数据库操作
  return await someRiskyDatabaseOperation();
}, {
  maxRetries: 5,
  baseDelay: 100,
  maxDelay: 2000,
  retryableErrors: ['SQLITE_BUSY', 'SQLITE_LOCKED']
});
```

## 配置说明

### 环境变量

- `NODE_ENV`: 运行环境 (development/test/production)
- `DB_PATH`: 数据库文件路径
- `DB_TEST_PATH`: 测试数据库路径

### 性能调优

1. **连接池大小**: 根据并发需求调整min/max连接数
2. **重试配置**: 根据网络环境调整重试次数和延迟
3. **超时设置**: 根据查询复杂度调整超时时间
4. **PRAGMA设置**: 根据使用场景优化SQLite配置

## 错误处理

模块提供了完善的错误处理机制：

1. **SQLite特定错误**: 自动识别和转换SQLite错误码
2. **重试逻辑**: 对可重试错误自动重试
3. **连接管理**: 自动处理连接获取和释放
4. **事务回滚**: 异常时自动回滚事务
5. **资源清理**: 确保资源正确释放

## 监控和调试

1. **性能指标**: 查询时间、连接使用率、错误率等
2. **慢查询检测**: 自动识别和记录慢查询
3. **连接池监控**: 连接创建、销毁、使用情况
4. **重试统计**: 重试次数、成功率、错误分布
5. **事务跟踪**: 事务执行时间、状态变化

## 最佳实践

1. **连接管理**: 始终使用连接池，避免直接创建连接
2. **错误处理**: 使用模块提供的错误处理机制
3. **事务使用**: 对于多步操作使用事务确保一致性
4. **性能监控**: 定期检查性能指标和慢查询
5. **配置优化**: 根据实际使用情况调整配置参数

## 测试

运行集成测试：

```bash
pnpm vitest src/utils/__tests__/database-integration.test.ts --run
```

测试覆盖了：
- 连接池管理
- 重试机制
- 数据库操作
- 事务管理
- 并发处理
- 性能监控