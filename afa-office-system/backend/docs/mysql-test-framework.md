# MySQL测试框架使用指南

## 概述

MySQL测试框架为AFA办公小程序项目提供了完整的MySQL数据库测试支持，包括：

- MySQL数据库适配器
- 测试环境管理器
- 自动化环境隔离
- 异常处理和恢复
- 性能监控和优化

## 快速开始

### 1. 环境配置

**重要：请务必使用环境变量配置数据库连接信息，不要在代码中硬编码密码！**

#### 方法1：使用 .env 文件（推荐）

在项目根目录创建或更新 `.env` 文件：

```bash
# MySQL测试数据库配置
TEST_DB_TYPE=mysql
TEST_DB_HOST=127.0.0.1
TEST_DB_PORT=3306
TEST_DB_USER=root
TEST_DB_PASSWORD=your-secure-password
TEST_DB_NAME=
TEST_DB_CONNECTION_LIMIT=10
TEST_DB_ACQUIRE_TIMEOUT=60000
TEST_DB_TIMEOUT=60000
```

#### 方法2：直接设置环境变量

```bash
# MySQL连接配置
export TEST_DB_TYPE=mysql
export TEST_DB_HOST=127.0.0.1
export TEST_DB_PORT=3306
export TEST_DB_USER=root
export TEST_DB_PASSWORD=your-secure-password

# 可选配置
export TEST_DB_CONNECTION_LIMIT=10
export TEST_DB_ACQUIRE_TIMEOUT=60000
export TEST_DB_TIMEOUT=60000
```

#### 安全建议

1. **创建专用测试用户**：
```sql
-- 创建测试专用用户
CREATE USER 'test_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT CREATE, DROP, SELECT, INSERT, UPDATE, DELETE ON test_*.* TO 'test_user'@'localhost';
FLUSH PRIVILEGES;
```

2. **使用强密码**：避免使用简单密码如 "111111"
3. **限制权限**：测试用户只需要对 `test_*` 数据库的权限
4. **定期更换密码**：定期更新测试数据库密码

### 2. 基本使用

```typescript
import { createMySQLTestEnvironmentManager } from '../src/utils/mysql-test-environment-manager.js';

// 创建测试环境管理器（自动从环境变量读取配置）
const manager = createMySQLTestEnvironmentManager();

// 创建隔离的测试环境
const testEnv = await manager.createIsolatedEnvironment({
  databasePrefix: 'my_test',
  isolationLevel: 'test'
});

// 使用测试环境
await testEnv.adapter.run('INSERT INTO users (name, email) VALUES (?, ?)', ['测试用户', 'test@example.com']);
const user = await testEnv.adapter.get('SELECT * FROM users WHERE email = ?', ['test@example.com']);

// 清理环境
await testEnv.cleanup();
await manager.shutdown();
```

## 核心组件

### MySQLAdapter

MySQL数据库适配器，提供统一的数据库操作接口：

```typescript
import { MySQLAdapter } from '../src/utils/mysql-adapter.js';
import { DatabaseConfigManager } from '../src/utils/database-adapter.js';

const adapter = new MySQLAdapter();
// 使用配置管理器从环境变量获取配置
const config = DatabaseConfigManager.getTestConfig();
await adapter.connect(config);

// 基本操作
await adapter.run('INSERT INTO users (name) VALUES (?)', ['张三']);
const user = await adapter.get('SELECT * FROM users WHERE name = ?', ['张三']);
const users = await adapter.all('SELECT * FROM users');

// 事务操作
await adapter.beginTransaction();
try {
  await adapter.run('INSERT INTO users (name) VALUES (?)', ['李四']);
  await adapter.run('INSERT INTO users (name) VALUES (?)', ['王五']);
  await adapter.commit();
} catch (error) {
  await adapter.rollback();
  throw error;
}

// 测试数据库管理
const dbName = await adapter.createTestDatabase('test_db_123');
await adapter.initializeSchema(dbName);
await adapter.dropTestDatabase(dbName);
```

### MySQLTestEnvironmentManager

测试环境管理器，负责创建和管理隔离的测试环境：

```typescript
import { createMySQLTestEnvironmentManager } from '../src/utils/mysql-test-environment-manager.js';

// 推荐：使用工厂函数，自动从环境变量读取配置
const manager = createMySQLTestEnvironmentManager();

// 或者手动指定配置（不推荐硬编码密码）
const manager2 = createMySQLTestEnvironmentManager({
  host: process.env.TEST_DB_HOST || '127.0.0.1',
  port: parseInt(process.env.TEST_DB_PORT || '3306'),
  user: process.env.TEST_DB_USER || 'root',
  password: process.env.TEST_DB_PASSWORD || 'fallback-password'
});

// 创建多个隔离环境
const environments = await manager.createMultipleEnvironments(3, {
  databasePrefix: 'parallel_test',
  isolationLevel: 'test'
});

// 验证环境隔离
const isIsolated = await manager.validateEnvironmentIsolation(environments[0], environments[1]);

// 获取环境统计
const stats = await manager.getEnvironmentStats(environments[0]);

// 生成详细报告
const report = await manager.generateEnvironmentReport();

// 清理所有环境
await manager.cleanupAllEnvironments();
```

## 高级功能

### 自动错误恢复

测试环境管理器具有自动错误恢复功能：

- 自动检测不健康的环境
- 尝试重新连接数据库
- 重建丢失的测试数据库
- 清理无法恢复的环境

### 性能监控

```typescript
// 获取数据库统计信息
const stats = await adapter.getDatabaseStats('test_db');
console.log('表数量:', stats.tables);
console.log('总大小:', stats.totalSize);
console.log('索引大小:', stats.indexSize);

// 获取服务器状态
const serverStatus = await adapter.getServerStatus();
console.log('MySQL版本:', serverStatus.version);
console.log('运行时间:', serverStatus.uptime);
console.log('连接数:', serverStatus.connections);

// 优化表性能
await adapter.optimizeTables('test_db');
```

### 批量环境管理

```typescript
// 批量创建环境（带错误处理）
const environments = await manager.createMultipleEnvironments(10, {
  databasePrefix: 'batch_test',
  isolationLevel: 'test'
});

// 清理过期环境（超过1小时）
const cleanedDatabases = await manager.cleanupExpiredEnvironments(3600000);

// 清理孤立数据库
const orphanedDatabases = await adapter.cleanupTestDatabases();
```

## 测试用例示例

### 单元测试

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMySQLTestEnvironmentManager } from '../src/utils/mysql-test-environment-manager.js';

describe('用户服务测试', () => {
  let manager;
  let testEnv;

  beforeEach(async () => {
    manager = createMySQLTestEnvironmentManager();
    testEnv = await manager.createIsolatedEnvironment({
      databasePrefix: 'user_service_test'
    });
  });

  afterEach(async () => {
    await testEnv.cleanup();
    await manager.shutdown();
  });

  it('应该能够创建用户', async () => {
    const result = await testEnv.adapter.run(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      ['测试用户', 'test@example.com']
    );
    
    expect(result.insertId).toBeDefined();
    expect(result.affectedRows).toBe(1);
  });

  it('应该能够查询用户', async () => {
    await testEnv.adapter.run(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      ['测试用户', 'test@example.com']
    );

    const user = await testEnv.adapter.get(
      'SELECT * FROM users WHERE email = ?',
      ['test@example.com']
    );

    expect(user).toBeDefined();
    expect(user.name).toBe('测试用户');
    expect(user.email).toBe('test@example.com');
  });
});
```

### 集成测试

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMySQLTestEnvironmentManager } from '../src/utils/mysql-test-environment-manager.js';

describe('用户管理集成测试', () => {
  let manager;
  let testEnv;

  beforeAll(async () => {
    manager = createMySQLTestEnvironmentManager();
    testEnv = await manager.createIsolatedEnvironment({
      databasePrefix: 'integration_test'
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
    await manager.shutdown();
  });

  it('应该支持完整的用户生命周期', async () => {
    // 创建商户
    const merchantResult = await testEnv.adapter.run(
      'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
      ['测试商户', 'TEST001', 'active']
    );

    // 创建用户
    const userResult = await testEnv.adapter.run(
      'INSERT INTO users (name, email, user_type, merchant_id, status) VALUES (?, ?, ?, ?, ?)',
      ['测试用户', 'test@example.com', 'employee', merchantResult.insertId, 'active']
    );

    // 验证关联查询
    const userWithMerchant = await testEnv.adapter.get(`
      SELECT u.*, m.name as merchant_name 
      FROM users u 
      JOIN merchants m ON u.merchant_id = m.id 
      WHERE u.id = ?
    `, [userResult.insertId]);

    expect(userWithMerchant.merchant_name).toBe('测试商户');
  });
});
```

## 最佳实践

### 1. 环境隔离

- 每个测试用例使用独立的数据库
- 避免测试之间的数据污染
- 使用有意义的数据库前缀

### 2. 资源管理

- 始终在测试结束后清理环境
- 使用`beforeEach`和`afterEach`确保清理
- 监控测试环境的资源使用

### 3. 错误处理

- 捕获和处理数据库连接错误
- 实现重试机制
- 记录详细的错误信息

### 4. 性能优化

- 定期清理过期的测试数据库
- 使用连接池管理数据库连接
- 监控查询性能

## 故障排除

### 常见问题

1. **连接失败**
   ```
   错误: MySQL服务器连接失败: 127.0.0.1:3306
   解决: 确保MySQL服务正在运行，检查连接参数
   ```

2. **权限不足**
   ```
   错误: MySQL认证失败: 用户名或密码错误
   解决: 检查用户名和密码，确保用户有创建数据库的权限
   ```

3. **数据库已存在**
   ```
   警告: 测试数据库已存在: test_123456
   解决: 这是正常情况，系统会自动处理
   ```

### 调试技巧

1. 启用详细日志：
   ```typescript
   process.env.DEBUG = 'mysql:*';
   ```

2. 检查环境状态：
   ```typescript
   const status = manager.getManagerStatus();
   console.log('环境状态:', status);
   ```

3. 生成诊断报告：
   ```typescript
   const report = await manager.generateEnvironmentReport();
   console.log('诊断报告:', report);
   ```

## 配置参考

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `TEST_DB_HOST` | `127.0.0.1` | MySQL服务器地址 |
| `TEST_DB_PORT` | `3306` | MySQL服务器端口 |
| `TEST_DB_USER` | `root` | MySQL用户名 |
| `TEST_DB_PASSWORD` | `111111` | MySQL密码 |
| `TEST_DB_CONNECTION_LIMIT` | `10` | 连接池大小 |
| `TEST_DB_ACQUIRE_TIMEOUT` | `60000` | 获取连接超时时间(ms) |
| `TEST_DB_TIMEOUT` | `60000` | 查询超时时间(ms) |

### MySQL配置建议

```sql
-- 创建测试用户
CREATE USER 'test_user'@'localhost' IDENTIFIED BY 'test_password';
GRANT ALL PRIVILEGES ON test_*.* TO 'test_user'@'localhost';
FLUSH PRIVILEGES;

-- 优化配置
SET GLOBAL max_connections = 200;
SET GLOBAL innodb_buffer_pool_size = 128M;
SET GLOBAL query_cache_size = 32M;
```

## 更新日志

### v1.0.0
- 初始版本发布
- 支持MySQL数据库适配器
- 实现测试环境管理器
- 添加自动错误恢复功能
- 支持性能监控和优化