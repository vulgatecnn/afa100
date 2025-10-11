# Design Document

## Overview

本设计文档描述了如何将现有的SQLite测试框架改进为支持MySQL数据库的测试框架。设计目标是在保持现有API兼容性的前提下，提供更稳定、高性能的测试环境，特别是解决Windows环境下SQLite的文件锁定问题。

## Architecture

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    测试框架层                                │
├─────────────────────────────────────────────────────────────┤
│  TestEnvironmentManager  │  TimeoutManager  │  DataFactory  │
├─────────────────────────────────────────────────────────────┤
│                  数据库抽象层                                │
├─────────────────────────────────────────────────────────────┤
│  DatabaseAdapter (接口)                                     │
├─────────────────┬───────────────────────────────────────────┤
│  SQLiteAdapter  │           MySQLAdapter                     │
├─────────────────┼───────────────────────────────────────────┤
│     SQLite      │             MySQL                         │
└─────────────────┴───────────────────────────────────────────┘
```

### 核心组件设计

#### 1. 数据库适配器模式
- **DatabaseAdapter接口**: 定义统一的数据库操作接口
- **MySQLAdapter**: MySQL数据库的具体实现
- **SQLiteAdapter**: 保留现有SQLite实现作为备选

#### 2. 配置管理
- **环境变量驱动**: 通过TEST_DB_TYPE控制数据库类型
- **连接参数配置**: 支持MySQL连接参数配置
- **自动回退机制**: MySQL不可用时自动回退到SQLite

## Components and Interfaces

### 1. DatabaseAdapter接口

```typescript
interface DatabaseAdapter {
  // 连接管理
  connect(config: DatabaseConfig): Promise<void>;
  disconnect(): Promise<void>;
  isReady(): boolean;
  
  // 基础操作
  run(sql: string, params?: any[]): Promise<RunResult>;
  get<T = any>(sql: string, params?: any[]): Promise<T>;
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  
  // 事务支持
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  
  // 测试环境专用
  createTestDatabase(dbName: string): Promise<void>;
  dropTestDatabase(dbName: string): Promise<void>;
  initializeSchema(dbName: string): Promise<void>;
}
```

### 2. MySQLAdapter实现

```typescript
class MySQLAdapter implements DatabaseAdapter {
  private pool: mysql.Pool;
  private currentConnection?: mysql.PoolConnection;
  private config: MySQLConfig;
  
  async connect(config: MySQLConfig): Promise<void> {
    this.config = config;
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionLimit: config.connectionLimit || 10,
      acquireTimeout: config.acquireTimeout || 60000,
      timeout: config.timeout || 60000,
      reconnect: true,
      multipleStatements: true
    });
  }
  
  async createTestDatabase(dbName: string): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
      await connection.execute(`USE \`${dbName}\``);
    } finally {
      connection.release();
    }
  }
  
  async dropTestDatabase(dbName: string): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.execute(`DROP DATABASE IF EXISTS \`${dbName}\``);
    } finally {
      connection.release();
    }
  }
}
```

### 3. 测试环境管理器改进

```typescript
class MySQLTestEnvironmentManager extends TestEnvironmentManager {
  private adapter: MySQLAdapter;
  
  async createIsolatedEnvironment(options: TestEnvironmentOptions): Promise<TestEnvironment> {
    const envId = randomUUID();
    const testDbName = `test_${envId.replace(/-/g, '_')}`;
    
    // 创建独立的测试数据库
    await this.adapter.createTestDatabase(testDbName);
    await this.adapter.initializeSchema(testDbName);
    
    const environment: TestEnvironment = {
      id: envId,
      databaseName: testDbName,
      isolationLevel: options.isolationLevel || 'test',
      isActive: true,
      createdAt: new Date(),
      resources: new Set([`database:${testDbName}`]),
      cleanup: async () => {
        await this.cleanupEnvironment(environment);
      }
    };
    
    this.environments.set(envId, environment);
    return environment;
  }
  
  async cleanupEnvironment(env: TestEnvironment): Promise<void> {
    if (!env.isActive) return;
    
    try {
      env.isActive = false;
      
      // 删除测试数据库
      if (env.databaseName) {
        await this.adapter.dropTestDatabase(env.databaseName);
      }
      
      // 清理资源记录
      env.resources.clear();
      this.environments.delete(env.id);
      
      console.log(`🧹 清理MySQL测试环境: ${env.id} (数据库: ${env.databaseName})`);
    } catch (error) {
      console.error(`清理MySQL测试环境失败: ${env.id}`, error);
      throw error;
    }
  }
}
```

### 4. 配置管理

```typescript
interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
  connectionLimit?: number;
  acquireTimeout?: number;
  timeout?: number;
}

class DatabaseConfigManager {
  static getTestConfig(): DatabaseConfig {
    const dbType = process.env.TEST_DB_TYPE || 'sqlite';
    
    if (dbType === 'mysql') {
      return {
        type: 'mysql',
        host: process.env.TEST_DB_HOST || '127.0.0.1',
        port: parseInt(process.env.TEST_DB_PORT || '3306'),
        user: process.env.TEST_DB_USER || 'root',
        password: process.env.TEST_DB_PASSWORD || '111111',
        connectionLimit: 10,
        acquireTimeout: 60000,
        timeout: 60000
      };
    }
    
    // 默认SQLite配置
    return {
      type: 'sqlite',
      path: process.env.DB_TEST_PATH || ':memory:'
    };
  }
}
```

## Data Models

### 1. 数据库配置模型

```typescript
type DatabaseConfig = MySQLConfig | SQLiteConfig;

interface MySQLConfig {
  type: 'mysql';
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
  connectionLimit?: number;
  acquireTimeout?: number;
  timeout?: number;
}

interface SQLiteConfig {
  type: 'sqlite';
  path: string;
}
```

### 2. 测试环境模型扩展

```typescript
interface TestEnvironment {
  id: string;
  databaseName?: string;  // MySQL数据库名
  databasePath?: string;  // SQLite文件路径
  isolationLevel: 'process' | 'thread' | 'test';
  cleanup: () => Promise<void>;
  isActive: boolean;
  createdAt: Date;
  resources: Set<string>;
}
```

### 3. MySQL Schema定义

```sql
-- MySQL测试数据库结构
-- 与SQLite保持兼容，但使用MySQL特性优化

-- 用户表
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    open_id VARCHAR(255) UNIQUE,
    union_id VARCHAR(255),
    phone VARCHAR(20),
    name VARCHAR(100) NOT NULL,
    avatar TEXT,
    user_type ENUM('tenant_admin', 'merchant_admin', 'employee', 'visitor') NOT NULL,
    status ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT 'active',
    merchant_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_merchant_id (merchant_id),
    INDEX idx_user_type (user_type),
    INDEX idx_status (status)
);

-- 商户表
CREATE TABLE merchants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    contact VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_status (status)
);

-- 其他表结构...
```

## Error Handling

### 1. 连接错误处理

```typescript
class MySQLConnectionManager {
  async ensureConnection(): Promise<void> {
    try {
      await this.adapter.connect(this.config);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`MySQL服务器连接失败: ${this.config.host}:${this.config.port}。请确保MySQL服务正在运行。`);
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        throw new Error(`MySQL认证失败: 用户名或密码错误 (${this.config.user})`);
      } else if (error.code === 'ER_BAD_DB_ERROR') {
        throw new Error(`MySQL数据库不存在: ${this.config.database}`);
      } else {
        throw new Error(`MySQL连接错误: ${error.message}`);
      }
    }
  }
}
```

### 2. 测试环境错误处理

```typescript
class MySQLTestEnvironmentManager {
  async handleEnvironmentError(env: TestEnvironment, error: Error): Promise<void> {
    console.error(`MySQL测试环境错误 [${env.id}]:`, error);
    
    // 尝试清理损坏的环境
    try {
      await this.forceCleanupEnvironment(env);
    } catch (cleanupError) {
      console.error(`强制清理环境失败:`, cleanupError);
    }
    
    // 记录错误统计
    this.errorStats.environmentErrors++;
    
    // 根据错误类型决定是否重试
    if (this.isRetryableError(error)) {
      throw new RetryableTestError(error.message);
    } else {
      throw new FatalTestError(error.message);
    }
  }
}
```

### 3. 自动回退机制

```typescript
class DatabaseAdapterFactory {
  static async createAdapter(): Promise<DatabaseAdapter> {
    const config = DatabaseConfigManager.getTestConfig();
    
    if (config.type === 'mysql') {
      try {
        const adapter = new MySQLAdapter();
        await adapter.connect(config);
        console.log('✅ 使用MySQL测试环境');
        return adapter;
      } catch (error) {
        console.warn('⚠️ MySQL连接失败，回退到SQLite:', error.message);
        
        // 自动回退到SQLite
        const sqliteConfig = { type: 'sqlite', path: ':memory:' };
        const sqliteAdapter = new SQLiteAdapter();
        await sqliteAdapter.connect(sqliteConfig);
        console.log('✅ 回退到SQLite测试环境');
        return sqliteAdapter;
      }
    }
    
    // 默认使用SQLite
    const adapter = new SQLiteAdapter();
    await adapter.connect(config);
    return adapter;
  }
}
```

## Testing Strategy

### 1. 单元测试策略

```typescript
describe('MySQLAdapter', () => {
  let adapter: MySQLAdapter;
  
  beforeEach(async () => {
    adapter = new MySQLAdapter();
    await adapter.connect(testConfig);
  });
  
  afterEach(async () => {
    await adapter.disconnect();
  });
  
  it('应该能够创建和删除测试数据库', async () => {
    const dbName = 'test_unit_' + Date.now();
    
    await adapter.createTestDatabase(dbName);
    // 验证数据库存在
    
    await adapter.dropTestDatabase(dbName);
    // 验证数据库已删除
  });
});
```

### 2. 集成测试策略

```typescript
describe('MySQL测试框架集成', () => {
  it('应该能够运行完整的测试流程', async () => {
    // 设置MySQL环境
    process.env.TEST_DB_TYPE = 'mysql';
    
    // 运行现有的集成测试
    const testSuite = new TestFrameworkIntegrationSuite();
    const results = await testSuite.runAll();
    
    expect(results.passedTests).toBeGreaterThan(0);
    expect(results.failedTests).toBe(0);
  });
});
```

### 3. 性能对比测试

```typescript
describe('MySQL vs SQLite 性能对比', () => {
  it('应该测试并发性能', async () => {
    const mysqlResults = await runConcurrentTests('mysql', 10);
    const sqliteResults = await runConcurrentTests('sqlite', 10);
    
    expect(mysqlResults.averageTime).toBeLessThan(sqliteResults.averageTime);
    expect(mysqlResults.errorCount).toBeLessThan(sqliteResults.errorCount);
  });
});
```

## Implementation Plan

### Phase 1: 基础架构 (1-2天)
1. 创建DatabaseAdapter接口
2. 实现MySQLAdapter基础功能
3. 添加配置管理系统
4. 实现连接错误处理

### Phase 2: 测试环境管理 (2-3天)
1. 改进TestEnvironmentManager支持MySQL
2. 实现数据库级别的环境隔离
3. 添加自动清理机制
4. 实现错误处理和回退

### Phase 3: 数据管理工具 (1-2天)
1. 适配EnhancedTestDataFactory支持MySQL
2. 更新数据库结构定义
3. 实现MySQL特有的优化
4. 添加数据一致性检查

### Phase 4: 集成和测试 (2-3天)
1. 运行现有测试用例验证兼容性
2. 添加MySQL特定的测试用例
3. 性能对比测试
4. 文档更新和使用指南

### Phase 5: 优化和完善 (1天)
1. 性能调优
2. 错误处理完善
3. 日志和监控改进
4. 最终测试和验证