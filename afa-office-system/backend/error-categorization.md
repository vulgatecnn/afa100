# TypeScript错误详细分类

## 错误类型分类

### 1. 数据模型类型错误 (约180个)

#### 1.1 字段命名不一致错误 (约80个)
**问题**: camelCase vs snake_case不一致
**示例错误**:
```
Property 'userId' does not exist on type 'CreateAccessRecordData'. Did you mean 'user_id'?
Property 'deviceId' does not exist on type 'CreateAccessRecordData'. Did you mean 'device_id'?
Property 'failReason' does not exist on type 'CreateAccessRecordData'. Did you mean 'fail_reason'?
```

**影响文件**:
- `tests/unit/services/access-record.service.enhanced.test.ts`
- `tests/unit/services/access-record.service.test.ts`

#### 1.2 缺失属性错误 (约60个)
**问题**: 对象缺少必需属性
**示例错误**:
```
Type 'CreateAccessRecordData' is missing the following properties from type 'CreateAccessRecordData': userId, deviceId, timestamp
Type '{ id: number; name: string; status: string; }' is missing the following properties from type 'Merchant': code, created_at, updated_at
```

**影响文件**:
- `tests/unit/models/merchant.model.test.ts`
- `tests/unit/models/user.model.test.ts`
- `tests/unit/services/employee.service.test.ts`

#### 1.3 类型不匹配错误 (约40个)
**问题**: 属性类型不匹配
**示例错误**:
```
Property 'status' does not exist on type 'RealtimeStatus'
Types of property 'status' are incompatible. Type '"suspended"' is not assignable to type 'UserStatus'
```

### 2. Mock对象类型错误 (约120个)

#### 2.1 Axios Mock错误 (约80个)
**问题**: Axios mock方法类型定义错误
**示例错误**:
```
Property 'mockResolvedValue' does not exist on type '<T = any, R = AxiosResponse<T, any, {}>, D = any>(url: string, config?: AxiosRequestConfig<D>) => Promise<R>'
Property 'mockReturnValue' does not exist on type '<T = any, D = any>(payload: any) => payload is AxiosError<T, D>'
```

**影响文件**:
- `tests/unit/utils/wechat.enhanced.test.ts` (35个错误)
- `tests/unit/utils/api-test-client.test.ts`

#### 2.2 其他Mock错误 (约40个)
**问题**: 其他第三方库mock类型错误
**示例错误**:
```
Argument of type 'string' is not assignable to parameter of type 'void' (bcrypt.hash mock)
Property '__promisify__' is missing in type 'Mock<[callback: any, delay: any], Timeout>' but required in type 'typeof setTimeout'
```

### 3. API接口类型错误 (约100个)

#### 3.1 响应数据结构错误 (约60个)
**问题**: API响应数据结构与期望类型不匹配
**示例错误**:
```
Object literal may only specify known properties, and 'data' does not exist in type 'AccessRecord[]'
Argument of type '{ data: AccessRecord[]; pagination: {...} }' is not assignable to parameter of type 'AccessRecord[]'
```

#### 3.2 请求参数类型错误 (约40个)
**问题**: API请求参数类型定义不正确

### 4. 测试工具类型错误 (约80个)

#### 4.1 数据库测试工具错误 (约40个)
**示例错误**:
```
Expected 0 type arguments, but got 1
const user = await database.get<{ id: number; name: string; email: string }>
```

#### 4.2 测试框架类型错误 (约40个)
**示例错误**:
```
Type 'Mock<[deferToNext: "route"], void>' is not assignable to type 'NextFunction'
Argument of type 'Function' is not assignable to parameter of type '(...args: any[]) => void'
```

### 5. 第三方库集成错误 (约60个)

#### 5.1 JWT类型错误 (约20个)
**示例错误**:
```
Property 'specialChars' does not exist on type 'JwtPayload'
No overload matches this call (jwt.sign)
```

#### 5.2 其他库类型错误 (约40个)
**示例错误**:
```
'AuthService' refers to a value, but is being used as a type here. Did you mean 'typeof AuthService'?
has no exported member named 'testEnvironmentManager'. Did you mean 'TestEnvironmentManager'?
```

### 6. 配置和工具类型错误 (约80个)

#### 6.1 数据库配置错误 (约40个)
**影响文件**:
- `tests/unit/config/database-config-manager.test.ts` (13个)
- `tests/unit/config/database-config-manager.simple.test.ts` (8个)

#### 6.2 工具函数类型错误 (约40个)
**影响文件**:
- `tests/unit/utils/database.test.ts`
- `tests/unit/utils/jwt.enhanced.test.ts`

## 按严重程度分类

### 严重错误 (阻塞编译) - 约400个
- 类型不匹配导致编译失败
- 缺失必需属性
- 泛型参数错误

### 警告错误 (影响开发体验) - 约150个
- Mock对象类型不完整
- 导入导出类型问题
- 工具函数类型缺失

### 优化错误 (代码质量) - 约70个
- 类型定义可以更精确
- 泛型使用可以优化
- 类型导入可以清理

## 修复复杂度评估

### 简单修复 (1-2小时) - 约200个错误
- 字段命名统一
- 添加缺失属性
- 简单类型注解

### 中等修复 (半天) - 约300个错误
- Mock对象类型定义
- API接口类型统一
- 数据库操作类型

### 复杂修复 (1-2天) - 约120个错误
- 核心业务逻辑类型重构
- 第三方库类型集成
- 测试框架类型适配

## 依赖关系分析

### 基础类型依赖
1. **核心实体类型** → 影响所有业务逻辑
2. **数据库类型** → 影响所有数据操作
3. **API类型** → 影响前后端交互

### 测试类型依赖
1. **Mock类型** → 影响所有单元测试
2. **测试工具类型** → 影响集成测试
3. **测试数据类型** → 影响测试数据生成

## 修复建议

### 立即修复 (P0)
1. 核心实体类型定义统一
2. 数据库字段命名规范化
3. 基础API类型定义

### 优先修复 (P1)
1. Mock对象类型完善
2. 测试工具类型修复
3. 第三方库类型集成

### 后续修复 (P2-P3)
1. 工具函数类型优化
2. 配置类型完善
3. 类型导入清理