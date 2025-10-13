# 集成测试基础设施使用指南

本文档介绍如何使用AFA办公小程序系统的集成测试基础设施，包括测试配置管理、数据库种子、API测试客户端等组件。

## 概述

集成测试基础设施包含以下核心组件：

1. **TestConfigManager** - 统一的测试配置管理器
2. **DatabaseSeeder** - 数据库种子数据管理器
3. **ApiTestClient** - API测试客户端
4. **IntegrationTestHelper** - 集成测试辅助工具
5. **TestDataFactory** - 测试数据工厂

## 快速开始

### 1. 基本使用

```typescript
import { withTestEnvironment } from '../helpers/integration-test-helper.js';

describe('我的集成测试', () => {
  it('应该能够测试API功能', async () => {
    await withTestEnvironment(async helper => {
      // 获取API客户端
      const apiClient = helper.getApiClient();

      // 获取种植的测试数据
      const seedData = helper.getSeedData();

      // 执行测试逻辑
      const users = await apiClient.getUsers();
      expect(users.length).toBeGreaterThan(0);
    });
  });
});
```

### 2. 自定义测试环境

```typescript
await withTestEnvironment(
  async helper => {
    // 测试逻辑
  },
  {
    environment: 'integration', // 使用集成测试环境
    seedOptions: {
      merchantCount: 5,
      usersPerMerchant: 10,
      projectCount: 2,
    },
  }
);
```

## 组件详细说明

### TestConfigManager

测试配置管理器提供不同环境的配置管理。

```typescript
import { TestConfigManager } from '../../src/utils/test-config-manager.js';

// 获取配置
const config = TestConfigManager.getConfig('unit');
console.log(config.database.host); // localhost
console.log(config.api.baseUrl); // http://localhost:3001

// 设置环境
await TestConfigManager.setupEnvironment('integration');

// 合并配置
const customConfig = TestConfigManager.mergeConfig(baseConfig, {
  api: { timeout: 20000 },
});
```

#### 支持的环境

- `unit` - 单元测试环境 (端口: 3001)
- `integration` - 集成测试环境 (端口: 3003)
- `e2e` - 端到端测试环境 (端口: 3005)

#### 配置文件

- `.env.test` - 单元测试环境变量
- `.env.integration` - 集成测试环境变量
- `.env.e2e` - 端到端测试环境变量

### DatabaseSeeder

数据库种子数据管理器负责创建、清理和重置测试数据。

```typescript
import { DatabaseSeeder } from '../helpers/database-seeder.js';

// 快速种植数据
const seedData = await DatabaseSeeder.quickSeed('unit', {
  merchantCount: 3,
  usersPerMerchant: 5,
  projectCount: 2,
});

// 快速清理数据
await DatabaseSeeder.quickClean('unit');

// 手动管理
const seeder = new DatabaseSeeder('unit');
await seeder.initialize();
await seeder.resetAndSeed();
await seeder.close();
```

#### 种植选项

```typescript
interface SeedOptions {
  merchantCount?: number; // 商户数量 (默认: 3)
  usersPerMerchant?: number; // 每个商户的用户数量 (默认: 5)
  projectCount?: number; // 项目数量 (默认: 2)
  venuesPerProject?: number; // 每个项目的场地数量 (默认: 2)
  floorsPerVenue?: number; // 每个场地的楼层数量 (默认: 3)
  visitorApplicationCount?: number; // 访客申请数量 (默认: 10)
  accessRecordCount?: number; // 通行记录数量 (默认: 20)
  includeAdminUser?: boolean; // 是否包含管理员用户 (默认: true)
}
```

### ApiTestClient

API测试客户端提供统一的API调用接口，支持认证、重试和错误处理。

```typescript
import { ApiTestClient } from '../../src/utils/api-test-client.js';

const apiClient = new ApiTestClient({
  baseUrl: 'http://localhost:3001',
  timeout: 10000,
  retryAttempts: 3,
});

// 认证
const authResponse = await apiClient.login({
  email: 'test@example.com',
  password: 'password123',
});

// 用户管理
const users = await apiClient.getUsers();
const user = await apiClient.createUser({
  name: '测试用户',
  phone: '13800138000',
  user_type: 'employee',
});

// 商户管理
const merchants = await apiClient.getMerchants();
const merchant = await apiClient.createMerchant({
  name: '测试商户',
  code: 'TEST001',
});

// 文件操作
const fileResponse = await apiClient.uploadFile(file, {
  originalName: 'test.jpg',
  mimeType: 'image/jpeg',
});

// 访客申请
const applications = await apiClient.getVisitorApplications();
const application = await apiClient.createVisitorApplication({
  visitor_name: '访客姓名',
  visit_purpose: '商务洽谈',
});
```

#### 重试机制

API客户端自动处理以下情况的重试：

- 网络连接错误
- 5xx服务器错误
- 超时错误

#### 认证管理

```typescript
// 设置认证令牌
apiClient.setAuthToken('jwt-token', 'refresh-token');

// 获取当前令牌
const token = apiClient.getAuthToken();

// 清除认证
apiClient.clearAuth();
```

### TestDataFactory

测试数据工厂提供创建各种测试数据的便捷方法。

```typescript
import { TestDataFactory } from '../helpers/test-data-factory.js';

// 创建基础数据
const merchant = TestDataFactory.createMerchant();
const user = TestDataFactory.createUser();
const project = TestDataFactory.createProject();

// 创建特定类型的用户
const admin = TestDataFactory.createAdminUser();
const merchantAdmin = TestDataFactory.createMerchantAdmin(merchantId);
const employee = TestDataFactory.createEmployee(merchantId);

// 创建复杂场景数据
const merchantSetup = TestDataFactory.createMerchantWithUsers(5);
const projectSetup = TestDataFactory.createProjectWithVenuesAndFloors(2, 3);
const visitorFlow = TestDataFactory.createVisitorFlow();

// 批量创建
const users = TestDataFactory.createBatch(() => TestDataFactory.createUser(), 10);

// 生成随机数据
const name = TestDataFactory.generateChineseName();
const company = TestDataFactory.generateCompanyName();
const phone = TestDataFactory.generatePhoneNumber();
```

### IntegrationTestHelper

集成测试辅助工具整合了所有组件，提供统一的测试环境管理。

```typescript
import { IntegrationTestHelper } from '../helpers/integration-test-helper.js';

// 手动管理测试环境
const helper = await IntegrationTestHelper.quickSetup({
  environment: 'integration',
  seedOptions: { merchantCount: 2 },
});

try {
  const apiClient = helper.getApiClient();
  const seedData = helper.getSeedData();

  // 执行测试
} finally {
  await helper.cleanup();
}

// 使用便捷包装器
await withTestEnvironment(async helper => {
  // 测试逻辑
}, options);
```

#### 辅助方法

```typescript
// 创建并登录用户
const { user, authResponse } = await helper.createAndLoginUser('tenant_admin');

// 等待异步操作
await helper.waitForAsyncOperation(async () => {
  const result = await apiClient.getUsers();
  return result.length > 0;
});

// 验证API响应
helper.validateApiResponse(response, ['success', 'data']);

// 创建测试场景
const scenario = await helper.createTestScenario('visitor_flow');

// 执行健康检查
const isHealthy = await helper.performHealthCheck();

// 获取统计信息
const stats = helper.getTestStatistics();
```

## 测试环境配置

### 数据库配置

每个测试环境使用独立的数据库：

- 单元测试: `afa_office_test`
- 集成测试: `afa_office_integration_test`
- 端到端测试: `afa_office_e2e_test`

### 端口配置

- 单元测试 API: 3001
- 集成测试 API: 3003
- 端到端测试 API: 3005

### 环境变量

在对应的 `.env.*` 文件中配置：

```bash
# 数据库配置
TEST_DB_HOST=localhost
TEST_DB_PORT=3306
TEST_DB_USER=afa_test_user
TEST_DB_PASSWORD=test_password_123
TEST_DB_NAME=afa_office_test

# JWT配置
JWT_SECRET=test-jwt-secret-key
JWT_EXPIRES_IN=1h

# API配置
API_PORT=3001
API_TIMEOUT=5000
```

## 最佳实践

### 1. 测试隔离

每个测试用例应该使用独立的数据：

```typescript
describe('用户管理测试', () => {
  it('应该能够创建用户', async () => {
    await withTestEnvironment(async helper => {
      // 每个测试都有独立的数据环境
    });
  });
});
```

### 2. 数据清理

使用 `withTestEnvironment` 自动处理数据清理：

```typescript
// 推荐：自动清理
await withTestEnvironment(async helper => {
  // 测试逻辑
}); // 自动清理

// 手动管理时记得清理
const helper = await IntegrationTestHelper.quickSetup();
try {
  // 测试逻辑
} finally {
  await helper.cleanup(); // 手动清理
}
```

### 3. 配置管理

使用环境特定的配置：

```typescript
// 开发环境测试
await withTestEnvironment(
  async helper => {
    // 测试逻辑
  },
  { environment: 'unit' }
);

// 生产环境模拟测试
await withTestEnvironment(
  async helper => {
    // 测试逻辑
  },
  { environment: 'e2e' }
);
```

### 4. 错误处理

合理处理测试中的错误：

```typescript
await withTestEnvironment(async helper => {
  try {
    const result = await helper.getApiClient().getUsers();
    expect(result).toBeDefined();
  } catch (error) {
    console.error('API调用失败:', error);
    throw error;
  }
});
```

### 5. 性能考虑

- 使用合适的数据量进行测试
- 避免在单元测试中创建过多数据
- 使用并行测试时注意数据隔离

```typescript
// 单元测试：少量数据
await withTestEnvironment(
  async helper => {
    // 测试逻辑
  },
  {
    seedOptions: { merchantCount: 1, usersPerMerchant: 2 },
  }
);

// 集成测试：中等数据量
await withTestEnvironment(
  async helper => {
    // 测试逻辑
  },
  {
    environment: 'integration',
    seedOptions: { merchantCount: 3, usersPerMerchant: 5 },
  }
);
```

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查数据库服务是否启动
   - 验证环境变量配置
   - 确认数据库用户权限

2. **API调用超时**
   - 检查API服务是否启动
   - 调整超时配置
   - 验证网络连接

3. **数据种植失败**
   - 检查数据库表结构
   - 验证外键约束
   - 查看详细错误日志

### 调试技巧

```typescript
// 启用详细日志
process.env.LOG_LEVEL = 'debug';

// 获取详细统计信息
const stats = helper.getTestStatistics();
console.log('测试统计:', JSON.stringify(stats, null, 2));

// 检查种植的数据
const seedData = helper.getSeedData();
console.log('商户数量:', seedData.merchants.length);
console.log('用户数量:', seedData.users.length);
```

## 示例代码

完整的测试示例请参考：

- `tests/examples/integration-test-example.test.ts` - 基础设施使用示例
- `tests/integration/` - 实际集成测试用例

## 扩展指南

### 添加新的测试数据类型

1. 在 `TestDataFactory` 中添加新的工厂方法
2. 在 `DatabaseSeeder` 中添加对应的插入方法
3. 更新 `SeedData` 接口定义

### 添加新的API方法

1. 在 `ApiTestClient` 中添加新的API方法
2. 实现错误处理和重试逻辑
3. 添加相应的类型定义

### 自定义测试环境

1. 创建新的环境配置文件
2. 在 `TestConfigManager` 中添加环境配置
3. 更新 `TestEnvironment` 类型定义
