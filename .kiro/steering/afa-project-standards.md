---
inclusion: always
---

# AFA办公小程序开发规范

## 技术栈约束

**必须使用的技术栈:**
- 后端: Node.js + TypeScript + Express.js + MySQL + Vitest
- 前端: React 18+ + TypeScript + Ant Design + Vite
- 小程序: 微信原生小程序
- 包管理: pnpm (严格要求)
- 测试: Vitest + Supertest

## 架构模式

**分层架构 (严格遵循):**
```
Controller -> Service -> Model -> Database
```

**目录结构约定:**
- `backend/src/controllers/` - HTTP请求处理
- `backend/src/services/` - 业务逻辑
- `backend/src/models/` - 数据访问层
- `backend/src/middleware/` - 中间件
- `backend/src/routes/v1/` - API路由
- `backend/tests/` - 测试文件 (镜像src结构)

## 命名约定

**文件命名:**
- kebab-case: `user-service.ts`, `auth-controller.ts`
- 测试文件: `*.test.ts` 或 `*.spec.ts`
- React组件: PascalCase `UserProfile.tsx`

**变量命名:**
- camelCase: `userName`, `accessToken`
- 常量: UPPER_SNAKE_CASE: `MAX_LOGIN_ATTEMPTS`
- 数据库表: snake_case: `users`, `merchant_employees`
- 数据库字段: snake_case: `user_name`, `created_at`

## API设计模式

**URL结构:** `/api/v1/resource-name`
- 使用复数资源名
- kebab-case路径: `/api/v1/merchant-employees`

**标准响应格式:**
```typescript
// 成功响应
{
  success: true,
  data: T,
  message: string,
  timestamp: string
}

// 错误响应  
{
  success: false,
  code: number,
  message: string,
  data: null,
  timestamp: string
}
```

## TypeScript规范

**严格类型要求:**
- 启用 `strict: true`
- 禁止使用 `any` (使用 `unknown` 替代)
- 所有函数必须定义参数和返回值类型
- 使用 `interface` 定义对象结构
- 使用 `import type` 导入类型

**示例:**
```typescript
interface User {
  id: number;
  userName: string;
  email: string;
}

async function getUserById(id: number): Promise<User | null> {
  // 实现
}
```

## 测试要求

**测试组织:**
- 单元测试: `tests/unit/` (按模块组织)
- 集成测试: `tests/integration/` (按功能组织)
- 测试数据: `tests/fixtures/`

**测试命名:**
- 文件: `service-name.test.ts`
- 用例: `should return user when valid id provided`

**覆盖率要求:**
- 单元测试: 80%+
- 核心业务逻辑: 90%+

## 数据库约定

**表设计:**
- 主键: `id` (自增整数)
- 外键: `table_name_id`
- 时间戳: `created_at`, `updated_at`
- 关联表: `user_roles`, `merchant_employees`

**索引要求:**
- 所有外键必须建索引
- 查询频繁字段建索引

## 安全要求

**认证授权:**
- 所有API必须验证JWT token
- 实施RBAC权限模型
- 记录认证失败日志

**数据验证:**
- 所有用户输入必须验证
- 使用参数化查询防SQL注入
- 敏感数据加密存储

## 错误处理模式

**统一错误码系统:**
- 1xxx: 系统错误
- 2xxx: 业务错误  
- 3xxx: 权限错误
- 4xxx: 参数错误

**错误处理:**
```typescript
try {
  // 业务逻辑
} catch (error) {
  logger.error('操作失败', { error, context });
  throw new BusinessError(2001, '用户不存在');
}
```

## 代码质量要求

**函数设计:**
- 单一职责原则
- 函数名使用动词: `getUserById()`, `validateToken()`
- 异步操作使用 async/await
- 避免回调地狱

**注释要求:**
- 复杂业务逻辑必须注释 (中文)
- 公共函数使用JSDoc
- 配置文件必须有说明

## 环境配置

**数据库环境:**
- 开发: MySQL
- 测试: MySQL测试数据库
- 生产: MySQL

**配置管理:**
- 使用环境变量存储敏感信息
- 提供 `.env.example` 模板
- 不同环境使用不同配置文件

## Git工作流

**分支命名:**
- `feature/功能名称`
- `fix/问题描述`
- `release/版本号`

**提交格式:**
```
type(scope): description

类型: feat, fix, docs, style, refactor, test
示例: feat(auth): add JWT token validation
```

## 业务领域约定

**核心实体:**
- 租务管理员 (Tenant Admin)
- 商户管理员 (Merchant Admin)  
- 商户员工 (Merchant Employee)
- 访客 (Visitor)

**权限层级:**
- 租务管理员 > 商户管理员 > 商户员工 > 访客

**通行验证方式:**
- 二维码扫描
- 人脸识别
- 刷卡验证