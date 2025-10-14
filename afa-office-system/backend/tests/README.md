# 测试类型工具库

本目录包含了完整的测试类型工具库，为 AFA 办公小程序后端提供全面的测试支持。

## 目录结构

```
tests/
├── types/                      # 类型定义文件
│   ├── index.d.ts             # 主要类型导出入口
│   ├── global-test-types.d.ts # 全局测试类型
│   ├── vitest-mocks.d.ts      # Vitest Mock 类型
│   ├── api-test-types.d.ts    # API 测试类型
│   ├── test-fixtures.d.ts     # 测试数据类型
│   ├── test-type-config.d.ts  # 测试配置类型
│   ├── third-party-mocks.d.ts # 第三方库 Mock 类型
│   └── supertest-extensions.d.ts # Supertest 扩展类型
├── utils/                      # 工具函数
│   ├── test-type-utils.ts     # 核心类型工具
│   ├── test-setup-utils.ts    # 测试设置工具
│   ├── test-matchers.ts       # 自定义匹配器
│   ├── mock-utils.ts          # Mock 工具
│   └── api-test-client.ts     # API 测试客户端
├── helpers/                    # 辅助工具
│   └── test-data-factory.ts   # 测试数据工厂
├── examples/                   # 使用示例
│   └── test-type-utils-example.test.ts
└── README.md                   # 本文档
```

## 核心功能

### 1. 类型安全的 Mock 工具

```typescript
import { createTypedMock, createMockFunction, TypedMockGenerator } from '../types/index.js';

// 创建类型安全的 Mock 对象
interface UserService {
  getUserById(id: number): Promise<User | null>;
  createUser(data: Partial<User>): Promise<User>;
}

const mockUserService = createTypedMock<UserService>();

// 创建类型安全的 Mock 函数
const mockGetUser = createMockFunction<(id: number) => Promise<User | null>>();

// 创建深度 Mock 对象
const deepMock = TypedMockGenerator.createDeepMock<ComplexService>();
```

### 2. 数据验证工具

```typescript
import { TestDataValidator, validateInterface } from '../types/index.js';

// 验证对象接口
const isValidUser = validateInterface<User>(testUser, ['id', 'name', 'phone']);

// 验证 API 响应格式
const isValidResponse = TestDataValidator.validateApiResponse(response);

// 验证分页响应
const isValidPaginated = TestDataValidator.validatePaginatedResponse(response);
```

### 3. 测试环境设置

```typescript
import { setupTestEnvironment, TestSetupManager } from '../types/index.js';

// 设置完整测试环境
setupTestEnvironment({
  test: DEFAULT_TEST_CONFIG,
  mocks: DEFAULT_MOCK_CONFIG,
  database: { cleanup: { strategy: 'truncate' } },
  api: { authentication: { enabled: true } },
});

// 手动管理测试设置
await TestSetupManager.initialize(config);
await TestSetupManager.cleanup();
```

### 4. 自定义匹配器

```typescript
import { setupCustomMatchers } from '../types/index.js';

// 设置自定义匹配器
setupCustomMatchers();

// 使用自定义匹配器
expect(response).toBeSuccessfulApiResponse();
expect(user).toBeValidUser();
expect(merchant).toBeValidMerchant();
expect(response.body).toHaveValidApiStructure();
```

### 5. 测试数据工厂

```typescript
import { TestDataFactory, createTestUser, createTestMerchant } from '../types/index.js';

// 创建单个测试数据
const user = createTestUser();
const merchant = createTestMerchant();

// 创建批量测试数据
const users = TestDataFactory.createBatch(() => TestDataFactory.createUser(), 10);

// 创建完整业务数据集
const merchantData = TestDataFactory.createMerchantWithUsers(5);
```

### 6. API 测试客户端

```typescript
import { createApiTestClient, ApiTestAssertions } from '../types/index.js';

// 创建 API 测试客户端
const apiClient = createApiTestClient(app);

// 执行认证请求
const response = await apiClient.authenticatedGet('/api/v1/users/1', token);

// 使用断言工具
ApiTestAssertions.expectSuccessResponse(response);
ApiTestAssertions.expectValidationError(response, 'email');
```

### 7. 异步测试工具

```typescript
import { AsyncTestUtils, waitFor } from '../types/index.js';

// 等待条件满足
await waitFor(() => condition, 5000, 100);

// 重试异步操作
const result = await AsyncTestUtils.retry(operation, 3, 1000);

// 测试 Promise 拒绝
const error = await AsyncTestUtils.expectRejection(promise, 'Expected error');
```

### 8. 时间和环境工具

```typescript
import { TestTimeUtils, TestEnvironmentUtils } from '../types/index.js';

// 时间工具
TestTimeUtils.mockSystemTime('2024-01-01T00:00:00.000Z');
const timestamp = TestTimeUtils.createRelativeTimestamp(1, 'hours');

// 环境工具
TestEnvironmentUtils.setupTestEnv({ TEST_VAR: 'value' });
TestEnvironmentUtils.cleanupTestEnv(['TEST_VAR']);
```

## 配置选项

### 全局测试配置

```typescript
import type { GlobalTestConfig } from '../types/index.js';

const config: GlobalTestConfig = {
  test: {
    database: { type: 'sqlite', path: ':memory:', resetBetweenTests: true },
    api: { baseUrl: 'http://localhost:5100', timeout: 5000, retries: 3 },
    auth: { jwtSecret: 'test-secret', tokenExpiry: 3600 },
    wechat: { appId: 'test-app-id', appSecret: 'test-secret' },
    logging: { level: 'error', enabled: false },
  },
  mocks: {
    resetBetweenTests: true,
    clearBetweenTests: true,
    restoreBetweenTests: true,
    globalMocks: {
      database: true,
      jwt: true,
      bcrypt: true,
      axios: true,
      wechat: true,
    },
  },
  database: {
    migrations: { run: false, path: '' },
    seeds: { run: false, path: '' },
    cleanup: { strategy: 'truncate' },
  },
  api: {
    authentication: { enabled: true },
    validation: { strict: true, checkResponseFormat: true, checkStatusCodes: true },
    performance: { enabled: false, thresholds: { responseTime: 1000, throughput: 100 } },
  },
};
```

## 使用指南

### 1. 基本设置

在测试文件开头添加以下设置：

```typescript
import { setupTestEnvironment, setupCustomMatchers } from '../types/index.js';

// 设置测试环境
setupTestEnvironment({
  test: DEFAULT_TEST_CONFIG,
  mocks: DEFAULT_MOCK_CONFIG,
});

// 设置自定义匹配器
setupCustomMatchers();
```

### 2. 单元测试示例

```typescript
import { describe, it, expect } from 'vitest';
import { createTestUser, createMockFunction } from '../types/index.js';

describe('用户服务测试', () => {
  it('应该能够获取用户', async () => {
    // 创建测试数据
    const testUser = createTestUser();
    
    // 创建 Mock 函数
    const mockGetUser = createMockFunction<(id: number) => Promise<User | null>>();
    mockGetUser.mockResolvedValue(testUser);
    
    // 执行测试
    const result = await mockGetUser(1);
    
    // 验证结果
    expect(result).toBeValidUser();
    expect(mockGetUser).toHaveBeenCalledWith(1);
  });
});
```

### 3. 集成测试示例

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  setupTestEnvironment, 
  createApiTestClient, 
  createTestUser,
  TestSetupManager 
} from '../types/index.js';

describe('用户 API 集成测试', () => {
  let apiClient: any;
  
  beforeAll(async () => {
    await TestSetupManager.initialize();
    apiClient = createApiTestClient(app);
  });
  
  afterAll(async () => {
    await TestSetupManager.cleanup();
  });
  
  it('应该能够创建用户', async () => {
    const userData = createTestUser();
    const response = await apiClient.createUser(userData, token);
    
    expect(response).toBeSuccessfulApiResponse();
    expect(response.body.data).toBeValidUser();
  });
});
```

### 4. 性能测试示例

```typescript
import { describe, it, expect } from 'vitest';
import { AsyncTestUtils } from '../types/index.js';

describe('性能测试', () => {
  it('应该在指定时间内响应', async () => {
    const startTime = Date.now();
    
    await AsyncTestUtils.retry(async () => {
      // 执行操作
      const result = await someOperation();
      return result;
    }, 3, 100);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(1000); // 应该在 1 秒内完成
  });
});
```

## 最佳实践

### 1. 测试组织

- 使用描述性的测试名称
- 按功能模块组织测试文件
- 使用 `describe` 块分组相关测试
- 在 `beforeEach` 中重置 Mock 状态

### 2. Mock 使用

- 优先使用类型安全的 Mock
- 在测试间重置 Mock 状态
- 使用具体的 Mock 返回值而不是通用值
- 验证 Mock 函数的调用次数和参数

### 3. 数据管理

- 使用测试数据工厂创建一致的测试数据
- 在测试间清理数据库状态
- 使用唯一的测试数据避免冲突
- 验证数据的完整性和一致性

### 4. 断言策略

- 使用自定义匹配器提高可读性
- 验证关键业务逻辑而不是实现细节
- 使用具体的断言而不是通用检查
- 提供清晰的错误消息

### 5. 异步测试

- 使用 `async/await` 而不是回调
- 设置合理的超时时间
- 处理异步操作的错误情况
- 使用重试机制处理不稳定的操作

## 故障排除

### 常见问题

1. **类型错误**: 确保导入了正确的类型定义
2. **Mock 不工作**: 检查 Mock 设置和重置逻辑
3. **测试超时**: 增加超时时间或优化异步操作
4. **数据冲突**: 使用唯一的测试数据或清理策略

### 调试技巧

1. 使用 `console.log` 输出中间状态
2. 检查 Mock 函数的调用历史
3. 验证测试环境配置
4. 使用断点调试复杂逻辑

## 扩展指南

### 添加新的匹配器

```typescript
// 在 test-matchers.ts 中添加
const customMatchers = {
  toBeValidCustomType(received: any): MatcherResult {
    const pass = /* 验证逻辑 */;
    return {
      pass,
      message: () => pass ? '...' : '...',
    };
  },
};

// 注册匹配器
expect.extend(customMatchers);
```

### 添加新的工具函数

```typescript
// 在 test-type-utils.ts 中添加
export class CustomTestUtils {
  static customMethod(): any {
    // 实现逻辑
  }
}
```

### 扩展配置选项

```typescript
// 在 test-type-config.d.ts 中添加
export interface CustomTestConfig {
  customOption: boolean;
  customSettings: {
    value: string;
  };
}
```

## 贡献指南

1. 遵循现有的代码风格和命名约定
2. 为新功能添加类型定义
3. 编写测试用例验证新功能
4. 更新文档说明新功能的使用方法
5. 确保所有测试通过

## 许可证

本项目遵循 MIT 许可证。