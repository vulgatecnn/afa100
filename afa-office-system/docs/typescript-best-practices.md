# TypeScript 最佳实践指南

## 概述

本指南提供了在 AFA 办公小程序项目中使用 TypeScript 的最佳实践，涵盖代码组织、性能优化、团队协作和维护策略。

## 项目结构最佳实践

### 1. 类型文件组织

#### 推荐的目录结构
```
src/
├── types/
│   ├── index.ts          # 统一导出入口
│   ├── api.ts            # API 相关类型
│   ├── auth.ts           # 认证相关类型
│   ├── database.ts       # 数据库相关类型
│   ├── user.ts           # 用户相关类型
│   ├── merchant.ts       # 商户相关类型
│   ├── visitor.ts        # 访客相关类型
│   └── common.ts         # 通用类型
├── models/               # 数据模型
├── services/             # 业务服务
├── controllers/          # 控制器
└── utils/                # 工具函数
```

#### 类型文件命名规范
```typescript
// ✅ 推荐命名
user.types.ts       // 用户类型定义
api.types.ts        // API 类型定义
database.types.ts   // 数据库类型定义

// 或者使用简洁命名
user.ts             // 在 types/ 目录下
api.ts              // 在 types/ 目录下
database.ts         // 在 types/ 目录下
```

### 2. 模块化类型管理

#### 统一导出策略
```typescript
// src/types/index.ts
export * from './user';
export * from './merchant';
export * from './visitor';
export * from './api';
export * from './auth';
export * from './database';
export * from './common';

// 重新导出并重命名避免冲突
export { User as UserEntity } from './user';
export { User as DatabaseUser } from './database';
```

#### 类型命名空间
```typescript
// src/types/api.ts
export namespace API {
  export interface Request<T = unknown> {
    body: T;
    params: Record<string, string>;
    query: Record<string, string>;
  }

  export interface Response<T = unknown> {
    success: boolean;
    data: T;
    message: string;
    timestamp: Date;
  }

  export namespace Auth {
    export interface LoginRequest {
      username: string;
      password: string;
    }

    export interface LoginResponse {
      token: string;
      user: User;
      expiresIn: number;
    }
  }
}
```

## 类型设计最佳实践

### 1. 接口设计原则

#### 单一职责原则
```typescript
// ✅ 好的设计 - 职责单一
interface User {
  id: number;
  username: string;
  email: string;
}

interface UserProfile {
  userId: number;
  avatar?: string;
  bio?: string;
  preferences: UserPreferences;
}

interface UserPreferences {
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
  notifications: NotificationSettings;
}

// ❌ 不好的设计 - 职责混乱
interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  theme: string;
  language: string;
  lastLoginAt: Date;
  createdAt: Date;
  // ... 太多不相关的属性
}
```

#### 组合优于继承
```typescript
// ✅ 推荐 - 使用组合
interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

interface Identifiable {
  id: number;
}

interface User extends Identifiable, Timestamps {
  username: string;
  email: string;
}

// 或使用交叉类型
type User = Identifiable & Timestamps & {
  username: string;
  email: string;
};
```

### 2. 泛型设计模式

#### 约束泛型
```typescript
// ✅ 使用约束确保类型安全
interface Repository<T extends { id: number }> {
  findById(id: number): Promise<T | null>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T>;
  delete(id: number): Promise<void>;
}

// 使用映射类型创建灵活的 API
type ApiEndpoints<T extends Record<string, any>> = {
  [K in keyof T]: (data: T[K]) => Promise<ApiResponse<T[K]>>;
};
```

#### 条件类型应用
```typescript
// ✅ 实用的条件类型
type NonNullable<T> = T extends null | undefined ? never : T;

type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// 提取函数参数类型
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

// 提取 Promise 内部类型
type Awaited<T> = T extends Promise<infer U> ? U : T;
```

### 3. 工具类型应用

#### 常用工具类型组合
```typescript
// ✅ 实用的工具类型组合
type CreateUserData = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateUserData = Partial<Pick<User, 'username' | 'email' | 'avatar'>>;
type UserSummary = Pick<User, 'id' | 'username' | 'email'>;

// 创建可选字段的类型
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type UserWithOptionalEmail = Optional<User, 'email'>;

// 创建必需字段的类型
type Required<T, K extends keyof T> = T & Required<Pick<T, K>>;
type UserWithRequiredAvatar = Required<User, 'avatar'>;
```

## 函数和方法最佳实践

### 1. 函数重载
```typescript
// ✅ 合理使用函数重载
function processData(data: string): string;
function processData(data: number): number;
function processData(data: boolean): boolean;
function processData(data: string | number | boolean): string | number | boolean {
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
  if (typeof data === 'number') {
    return data * 2;
  }
  return !data;
}

// 更好的方式：使用泛型
function processData<T extends string | number | boolean>(data: T): T {
  // 实现
}
```

### 2. 类型守卫
```typescript
// ✅ 自定义类型守卫
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && 
         obj !== null && 
         'id' in obj && 
         'username' in obj && 
         'email' in obj;
}

function isError(obj: unknown): obj is Error {
  return obj instanceof Error || 
         (typeof obj === 'object' && obj !== null && 'message' in obj);
}

// 使用类型守卫
function handleUserData(data: unknown) {
  if (isUser(data)) {
    // data 现在是 User 类型
    console.log(data.username);
  }
}
```

### 3. 异步函数类型
```typescript
// ✅ 异步函数最佳实践
async function fetchUser(id: number): Promise<User | null> {
  try {
    const response = await api.get(`/users/${id}`);
    return response.data;
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

// 使用 Result 类型处理错误
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

async function safelyFetchUser(id: number): Promise<Result<User, ApiError>> {
  try {
    const user = await fetchUser(id);
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error as ApiError };
  }
}
```

## 错误处理最佳实践

### 1. 错误类型层次结构
```typescript
// ✅ 结构化错误类型
abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  
  constructor(message: string, public readonly context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
  }
}

class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown,
    context?: Record<string, any>
  ) {
    super(message, context);
  }
}

class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
  
  constructor(
    public readonly resource: string,
    public readonly id: string | number,
    context?: Record<string, any>
  ) {
    super(`${resource} with id ${id} not found`, context);
  }
}
```

### 2. 错误处理模式
```typescript
// ✅ 统一错误处理
type ErrorHandler<T> = (error: AppError) => T;

class ErrorHandlerRegistry {
  private handlers = new Map<string, ErrorHandler<any>>();
  
  register<T>(errorCode: string, handler: ErrorHandler<T>): void {
    this.handlers.set(errorCode, handler);
  }
  
  handle<T>(error: AppError): T {
    const handler = this.handlers.get(error.code);
    if (!handler) {
      throw new Error(`No handler registered for error code: ${error.code}`);
    }
    return handler(error);
  }
}

// 使用示例
const errorRegistry = new ErrorHandlerRegistry();
errorRegistry.register('VALIDATION_ERROR', (error: ValidationError) => ({
  field: error.field,
  message: error.message,
  value: error.value
}));
```

## 性能优化最佳实践

### 1. 编译时优化

#### 类型导入优化
```typescript
// ✅ 使用类型导入减少编译时间
import type { User, CreateUserData } from '@/types';
import { UserService } from '@/services';

// ❌ 避免不必要的运行时导入
import { User } from '@/types'; // 如果只用作类型
```

#### 条件类型优化
```typescript
// ✅ 简单高效的条件类型
type IsString<T> = T extends string ? true : false;

// ❌ 避免过度复杂的类型计算
type OverlyComplex<T> = T extends infer U 
  ? U extends string 
    ? U extends `${infer A}${infer B}` 
      ? A extends 'prefix' 
        ? B extends `${infer C}suffix` 
          ? C 
          : never 
        : never 
      : never 
    : never 
  : never;
```

### 2. 运行时优化

#### 类型断言优化
```typescript
// ✅ 安全的类型断言
function assertIsUser(obj: unknown): asserts obj is User {
  if (!isUser(obj)) {
    throw new Error('Object is not a valid User');
  }
}

// 使用断言函数
function processUser(data: unknown) {
  assertIsUser(data);
  // data 现在确定是 User 类型
  return data.username;
}

// ❌ 避免不安全的类型断言
const user = data as User; // 可能导致运行时错误
```

## 测试最佳实践

### 1. 测试类型定义
```typescript
// ✅ 测试专用类型
interface TestContext {
  user: User;
  token: string;
  cleanup: () => Promise<void>;
}

type MockFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): ReturnType<T>;
  mockReturnValue(value: ReturnType<T>): void;
  mockResolvedValue(value: Awaited<ReturnType<T>>): void;
  mockRejectedValue(error: any): void;
};

// 类型安全的 Mock 工厂
function createMockUserService(): {
  [K in keyof UserService]: MockFunction<UserService[K]>;
} {
  return {
    getUserById: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn()
  };
}
```

### 2. 测试数据工厂
```typescript
// ✅ 类型安全的测试数据工厂
interface TestDataFactory<T> {
  create(overrides?: Partial<T>): T;
  createMany(count: number, overrides?: Partial<T>): T[];
}

class UserFactory implements TestDataFactory<User> {
  create(overrides: Partial<User> = {}): User {
    return {
      id: Math.floor(Math.random() * 1000),
      username: `user_${Date.now()}`,
      email: `user_${Date.now()}@example.com`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }
  
  createMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

// 使用工厂
const userFactory = new UserFactory();
const testUser = userFactory.create({ username: 'testuser' });
const testUsers = userFactory.createMany(5);
```

## 团队协作最佳实践

### 1. 代码审查检查清单

#### 类型安全检查
- [ ] 没有使用 `any` 类型
- [ ] 所有函数都有明确的返回类型
- [ ] 接口定义完整且合理
- [ ] 泛型约束适当
- [ ] 错误处理类型安全

#### 代码质量检查
- [ ] 类型命名清晰且一致
- [ ] 避免类型重复定义
- [ ] 合理使用工具类型
- [ ] 类型导入导出规范
- [ ] 文档注释完整

### 2. 团队规范

#### 命名约定
```typescript
// ✅ 推荐的命名约定
interface User { }           // 接口使用 PascalCase
type UserType = string;      // 类型别名使用 PascalCase
enum UserStatus { }          // 枚举使用 PascalCase

const userName: string;      // 变量使用 camelCase
function getUserById() { }   // 函数使用 camelCase

namespace API { }            // 命名空间使用 PascalCase
```

#### 注释规范
```typescript
/**
 * 用户服务类
 * 
 * 提供用户相关的业务逻辑操作，包括用户的创建、查询、更新和删除。
 * 
 * @example
 * ```typescript
 * const userService = new UserService(userRepository);
 * const user = await userService.getUserById(1);
 * ```
 */
class UserService {
  /**
   * 根据 ID 获取用户信息
   * 
   * @param id - 用户 ID
   * @returns 用户信息，如果不存在则返回 null
   * @throws {NotFoundError} 当用户不存在时抛出
   * 
   * @example
   * ```typescript
   * const user = await userService.getUserById(123);
   * if (user) {
   *   console.log(user.username);
   * }
   * ```
   */
  async getUserById(id: number): Promise<User | null> {
    // 实现
  }
}
```

## 迁移和升级策略

### 1. 渐进式类型化

#### 从 JavaScript 迁移
```typescript
// 第一步：添加基本类型注解
function processUser(user: any): any {
  return {
    id: user.id,
    name: user.name
  };
}

// 第二步：定义具体类型
interface User {
  id: number;
  name: string;
}

function processUser(user: User): { id: number; name: string } {
  return {
    id: user.id,
    name: user.name
  };
}

// 第三步：使用工具类型优化
function processUser(user: User): Pick<User, 'id' | 'name'> {
  return {
    id: user.id,
    name: user.name
  };
}
```

### 2. 版本升级策略

#### TypeScript 版本升级
```json
{
  "compilerOptions": {
    // 逐步启用严格检查
    "strict": false,           // 先设为 false
    "noImplicitAny": true,     // 逐步启用
    "strictNullChecks": true,  // 逐步启用
    "strictFunctionTypes": true // 逐步启用
  }
}
```

## 工具和自动化

### 1. 开发工具配置

#### VSCode 配置
```json
{
  "typescript.preferences.quoteStyle": "single",
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "typescript.suggest.autoImports": true,
  "typescript.updateImportsOnFileMove.enabled": "always",
  "editor.codeActionsOnSave": {
    "source.organizeImports": true,
    "source.fixAll.eslint": true
  }
}
```

#### ESLint 配置
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/no-non-null-assertion": "warn"
  }
}
```

### 2. 自动化脚本

#### 类型检查脚本
```bash
#!/bin/bash
# scripts/type-check.sh

echo "Running TypeScript type check..."

# 检查主项目
echo "Checking main project..."
npx tsc --noEmit

# 检查测试文件
echo "Checking test files..."
npx tsc --noEmit --project tsconfig.test.json

# 生成类型覆盖率报告
echo "Generating type coverage report..."
npx type-coverage --detail

echo "Type check completed!"
```

## 监控和维护

### 1. 类型质量指标

#### 关键指标
- 类型覆盖率 (目标: >95%)
- `any` 类型使用率 (目标: <1%)
- 类型错误数量 (目标: 0)
- 编译时间 (监控趋势)

#### 监控脚本
```typescript
// scripts/type-metrics.ts
interface TypeMetrics {
  coverage: number;
  anyUsage: number;
  errorCount: number;
  compileTime: number;
}

async function collectTypeMetrics(): Promise<TypeMetrics> {
  // 实现指标收集逻辑
}

async function reportMetrics() {
  const metrics = await collectTypeMetrics();
  
  console.log('TypeScript Quality Metrics:');
  console.log(`Type Coverage: ${metrics.coverage}%`);
  console.log(`Any Usage: ${metrics.anyUsage}%`);
  console.log(`Error Count: ${metrics.errorCount}`);
  console.log(`Compile Time: ${metrics.compileTime}ms`);
  
  // 发送到监控系统
  await sendToMonitoring(metrics);
}
```

### 2. 定期维护任务

#### 每周任务
- 检查类型覆盖率报告
- 审查新增的 `any` 类型使用
- 更新过时的类型定义
- 清理未使用的类型

#### 每月任务
- 评估 TypeScript 版本升级
- 审查类型定义的合理性
- 优化编译性能
- 更新团队规范文档

## 学习和成长

### 1. 进阶主题
- 高级类型编程
- 类型级别的函数式编程
- 模板字面量类型
- 递归类型定义

### 2. 社区资源
- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Effective TypeScript](https://effectivetypescript.com/)
- [Type Challenges](https://github.com/type-challenges/type-challenges)

### 3. 实践项目
- 构建类型安全的 API 客户端
- 实现复杂的状态管理类型
- 创建类型安全的 ORM 包装器
- 开发编译时验证工具

## 总结

TypeScript 最佳实践的核心是：

1. **类型安全优先** - 始终追求类型安全，避免运行时错误
2. **渐进式改进** - 逐步提升类型质量，不要一次性改动太多
3. **团队协作** - 建立统一的规范和流程，确保团队一致性
4. **持续学习** - 跟上 TypeScript 的发展，学习新特性和最佳实践
5. **工具自动化** - 使用工具自动化类型检查和质量监控

通过遵循这些最佳实践，可以显著提升代码质量、开发效率和团队协作效果。