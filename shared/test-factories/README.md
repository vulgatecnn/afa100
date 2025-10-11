# 跨平台测试数据工厂系统 - MySQL适配版本

这个测试数据工厂系统为AFA办公小程序的后端、前端和小程序提供统一的测试数据生成功能，完全适配MySQL数据库结构和约束，确保跨平台测试数据的一致性。

## 特性

- 🔄 **跨平台一致性**: 为后端、前端、小程序提供统一的数据结构
- 🎯 **类型安全**: 完整的TypeScript类型定义
- 🏭 **工厂模式**: 灵活的数据生成和自定义
- 📊 **场景数据**: 预定义的业务场景测试数据
- 🔧 **平台适配**: 针对不同平台的数据格式适配器

## 目录结构

```
shared/test-factories/
├── index.ts                 # 核心数据工厂和类型定义
├── backend-adapter.ts       # 后端数据库格式适配器
├── frontend-adapter.ts      # 前端API响应格式适配器
├── miniprogram-adapter.ts   # 小程序微信API格式适配器
└── README.md               # 使用文档
```

## 核心数据工厂

### 基础工厂

- `userFactory` - 用户数据工厂（适配MySQL用户表结构）
- `merchantFactory` - 商户数据工厂（适配MySQL商户表结构）
- `visitorApplicationFactory` - 访客申请数据工厂（适配MySQL访客申请表结构）
- `projectFactory` - 项目数据工厂（MySQL项目表）
- `venueFactory` - 场地数据工厂（MySQL场地表）
- `floorFactory` - 楼层数据工厂（MySQL楼层表）
- `passcodeFactory` - 通行码数据工厂（适配MySQL通行码表结构）
- `accessRecordFactory` - 通行记录数据工厂（适配MySQL通行记录表结构）

### 场景工厂

- `TestScenarioFactory.createMerchantScenario()` - 创建完整商户场景（包含项目、场地、楼层层级）
- `TestScenarioFactory.createVisitorScenario()` - 创建访客申请场景
- `TestScenarioFactory.createAccessRecordScenario()` - 创建通行记录场景
- `TestScenarioFactory.createEmployeeAccessScenario()` - 创建员工通行场景
- `TestScenarioFactory.createCompleteSystemScenario()` - 创建完整系统测试场景

### MySQL专用场景工厂

- `MySQLTestScenarioFactory.createConstraintCompliantDataSet()` - 创建符合MySQL外键约束的数据集
- `MySQLTestScenarioFactory.createPerformanceTestDataSet()` - 创建MySQL性能测试数据集
- `MySQLTestScenarioFactory.createBoundaryTestDataSet()` - 创建MySQL边界条件测试数据
- `MySQLTestScenarioFactory.createTransactionTestScenario()` - 创建MySQL事务测试场景

## 平台适配器

### 后端适配器 (BackendTestFactory)

为后端测试提供数据库兼容的数据格式：

```typescript
import { BackendTestFactory } from '../shared/test-factories/backend-adapter'

// 创建数据库格式的用户数据
const user = BackendTestFactory.createUser({
  user_type: 'merchant_admin',
  status: 'active'
})

// 创建多个商户数据
const merchants = BackendTestFactory.createMerchants(5)

// 创建完整测试场景
const scenario = BackendTestFactory.createCompleteScenario()
```

### 前端适配器 (FrontendTestFactory)

为前端测试提供API响应格式的数据：

```typescript
import { FrontendTestFactory } from '../shared/test-factories/frontend-adapter'

// 创建用户列表API响应
const usersResponse = FrontendTestFactory.createUsersResponse(10)

// 创建分页商户列表响应
const merchantsResponse = FrontendTestFactory.createPaginatedMerchantsResponse(20, 1, 10)

// 创建登录响应
const loginResponse = FrontendTestFactory.createLoginResponse({
  userType: 'tenant_admin'
})

// 创建仪表板数据响应
const dashboardResponse = FrontendTestFactory.createDashboardDataResponse()
```

### 小程序适配器 (MiniprogramTestFactory)

为小程序测试提供微信API格式的数据：

```typescript
import { MiniprogramTestFactory } from '../shared/test-factories/miniprogram-adapter'

// 创建商户列表响应
const merchantsResponse = MiniprogramTestFactory.createMerchantsResponse(5)

// 创建访客申请提交响应
const submitResponse = MiniprogramTestFactory.createSubmitApplicationResponse()

// 创建通行码响应
const passcodeResponse = MiniprogramTestFactory.createPasscodeResponse()

// 创建页面初始数据
const pageData = MiniprogramTestFactory.createVisitorApplyPageData()
```

## 使用示例

### 在后端测试中使用

```typescript
// tests/unit/models/user.test.ts
import { BackendTestFactory } from '../../../shared/test-factories/backend-adapter'

describe('UserModel', () => {
  it('should create user successfully', async () => {
    const userData = BackendTestFactory.createUser({
      user_type: 'merchant_admin',
      status: 'active'
    })
    
    const user = await UserModel.create(userData)
    expect(user.id).toBeDefined()
    expect(user.user_type).toBe('merchant_admin')
  })
})
```

### 在前端测试中使用

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw'
import { FrontendTestFactory } from '../../../shared/test-factories/frontend-adapter'

export const handlers = [
  http.get('/api/v1/merchants', () => {
    const response = FrontendTestFactory.createMerchantsResponse(5, {
      status: 'active'
    })
    return HttpResponse.json(response)
  }),
  
  http.post('/api/v1/auth/login', () => {
    const response = FrontendTestFactory.createLoginResponse({
      userType: 'tenant_admin'
    })
    return HttpResponse.json(response)
  })
]
```

### 在小程序测试中使用

```typescript
// tests/unit/pages/visitor-apply.test.ts
import { MiniprogramTestFactory } from '../../../shared/test-factories/miniprogram-adapter'
import { mockWx } from '../setup'

describe('访客申请页面', () => {
  it('should load merchants on page load', async () => {
    const merchantsResponse = MiniprogramTestFactory.createMerchantsResponse(3)
    
    mockWx.request.mockImplementationOnce(({ success }) => {
      success(merchantsResponse)
    })
    
    const page = createMockPage({
      data: MiniprogramTestFactory.createVisitorApplyPageData()
    })
    
    await page.loadMerchants()
    expect(page.data.merchants).toHaveLength(3)
  })
})
```

## 数据一致性

所有平台适配器都基于相同的核心数据工厂，确保：

1. **结构一致性**: 相同的业务实体在不同平台具有一致的数据结构
2. **关系一致性**: 实体间的关联关系在所有平台保持一致
3. **业务规则一致性**: 业务逻辑和验证规则在各平台统一

## 扩展指南

### 添加新的数据类型

1. 在 `index.ts` 中定义新的接口和工厂
2. 在各平台适配器中添加相应的适配方法
3. 更新 `TestScenarioFactory` 以包含新的数据类型

### 自定义数据生成

```typescript
// 自定义用户数据
const customUser = userFactory.create({
  name: '张三',
  userType: 'merchant_admin',
  status: 'active'
})

// 批量生成特定类型的数据
const activeEmployees = userFactory.createMany(10, {
  userType: 'merchant_employee',
  status: 'active'
})
```

### 固定测试数据

```typescript
import { TestDataReset } from '../shared/test-factories'

// 重置随机种子以获得可重现的测试数据
TestDataReset.resetSeed(12345)

// 生成固定的测试数据集
const fixedData = TestDataReset.generateFixedDataSet()
```

## 最佳实践

1. **使用场景工厂**: 优先使用 `TestScenarioFactory` 创建完整的业务场景数据
2. **平台特定适配**: 在各平台测试中使用对应的适配器
3. **数据隔离**: 在测试间重置数据状态，避免测试间相互影响
4. **合理覆盖**: 使用 `overrides` 参数自定义特定测试需要的数据
5. **类型安全**: 充分利用TypeScript类型检查确保数据正确性

## 依赖

- `@faker-js/faker`: 用于生成随机测试数据
- `typescript`: 提供类型支持

## 注意事项

- 确保在所有平台项目中都能访问到 `shared/test-factories` 目录
- 在CI/CD环境中确保faker.js的随机种子一致性
- 定期更新测试数据以反映业务模型的变化