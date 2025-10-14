# TypeScript 类型使用规范

## 概述

本文档定义了 AFA 办公小程序项目中 TypeScript 类型的使用规范、最佳实践和错误排查指南，旨在确保代码的类型安全性和可维护性。

## 基本原则

### 1. 严格类型约束
- 启用 `strict: true` 模式
- 禁止使用 `any` 类型，使用 `unknown` 替代
- 所有函数必须明确定义参数和返回值类型
- 使用 `exactOptionalPropertyTypes` 确保可选属性的精确性

### 2. 类型优先设计
- 先定义类型接口，再实现功能
- 使用 `interface` 定义对象结构
- 使用 `type` 定义联合类型和复杂类型
- 优先使用类型推导，避免冗余类型注解

### 3. 模块化类型管理
- 按功能模块组织类型定义
- 使用统一的类型导出路径
- 避免循环依赖和重复定义

## 类型定义规范

### 1. 接口定义

#### 基础接口
```typescript
// ✅ 正确示例
interface User {
  readonly id: number;
  userName: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  // 可选属性使用 ? 标记
  avatar?: string;
  // 联合类型明确枚举所有可能值
  status: 'active' | 'inactive' | 'pending';
}

// ❌ 错误示例
interface User {
  id: any; // 不要使用 any
  userName; // 缺少类型注解
  email: string | undefined; // 应该使用可选属性
  status: string; // 应该使用联合类型
}
```

#### 扩展接口
```typescript
// ✅ 正确示例
interface BaseEntity {
  readonly id: number;
  createdAt: Date;
  updatedAt: Date;
}

interface User extends BaseEntity {
  userName: string;
  email: string;
}

// 使用泛型增强复用性
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: Date;
}
```

### 2. 类型别名

#### 联合类型
```typescript
// ✅ 正确示例
type UserType = 'tenant_admin' | 'merchant_admin' | 'employee' | 'visitor';
type AccessDirection = 'in' | 'out';
type AccessResult = 'success' | 'failed';

// 复杂类型组合
type CreateUserData = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateUserData = Partial<Pick<User, 'userName' | 'email' | 'avatar'>>;
```

#### 条件类型
```typescript
// ✅ 高级类型示例
type NonNullable<T> = T extends null | undefined ? never : T;
type ApiEndpoint<T extends string> = `/api/v1/${T}`;

// 映射类型
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```

### 3. 枚举定义

#### 字符串枚举 (推荐)
```typescript
// ✅ 正确示例
enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended'
}

// 使用 const assertion 的替代方案
const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  SUSPENDED: 'suspended'
} as const;

type UserStatus = typeof UserStatus[keyof typeof UserStatus];
```

#### 数字枚举 (谨慎使用)
```typescript
// ✅ 仅在需要位运算或序列化时使用
enum Permission {
  READ = 1,
  WRITE = 2,
  DELETE = 4,
  ADMIN = 8
}
```

## 函数类型规范

### 1. 函数声明
```typescript
// ✅ 正确示例
async function getUserById(id: number): Promise<User | null> {
  // 实现
}

function validateEmail(email: string): boolean {
  // 实现
}

// 高阶函数
function createValidator<T>(
  schema: ValidationSchema<T>
): (data: unknown) => data is T {
  // 实现
}
```

### 2. 箭头函数
```typescript
// ✅ 正确示例
const processUsers = (users: User[]): ProcessedUser[] => {
  return users.map(user => ({
    id: user.id,
    displayName: user.userName,
    isActive: user.status === 'active'
  }));
};

// 异步箭头函数
const fetchUserData = async (id: number): Promise<ApiResponse<User>> => {
  // 实现
};
```

### 3. 回调函数类型
```typescript
// ✅ 正确示例
type EventHandler<T> = (event: T) => void;
type AsyncHandler<T, R> = (data: T) => Promise<R>;

interface EventEmitter {
  on<T>(event: string, handler: EventHandler<T>): void;
  emit<T>(event: string, data: T): void;
}
```

## 类和接口规范

### 1. 类定义
```typescript
// ✅ 正确示例
class UserService {
  private readonly repository: UserRepository;
  
  constructor(repository: UserRepository) {
    this.repository = repository;
  }
  
  async createUser(data: CreateUserData): Promise<User> {
    // 实现
  }
  
  async getUserById(id: number): Promise<User | null> {
    // 实现
  }
}
```

### 2. 抽象类和接口
```typescript
// ✅ 正确示例
abstract class BaseService<T, CreateData, UpdateData> {
  protected abstract repository: Repository<T>;
  
  abstract create(data: CreateData): Promise<T>;
  abstract update(id: number, data: UpdateData): Promise<T>;
  abstract delete(id: number): Promise<void>;
}

interface Repository<T> {
  findById(id: number): Promise<T | null>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T>;
  delete(id: number): Promise<void>;
}
```

## 泛型使用规范

### 1. 基础泛型
```typescript
// ✅ 正确示例
interface Container<T> {
  value: T;
  getValue(): T;
  setValue(value: T): void;
}

function identity<T>(arg: T): T {
  return arg;
}

// 约束泛型
interface Identifiable {
  id: number;
}

function updateEntity<T extends Identifiable>(
  entity: T, 
  updates: Partial<Omit<T, 'id'>>
): T {
  return { ...entity, ...updates };
}
```

### 2. 条件泛型
```typescript
// ✅ 高级泛型示例
type ApiResult<T> = T extends string 
  ? { message: T } 
  : T extends number 
  ? { count: T } 
  : { data: T };

// 工具类型
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

## 模块和导入规范

### 1. 类型导出
```typescript
// ✅ 正确示例 - src/types/user.ts
export interface User {
  id: number;
  userName: string;
  email: string;
}

export type CreateUserData = Omit<User, 'id'>;
export type UpdateUserData = Partial<Pick<User, 'userName' | 'email'>>;

// 统一导出 - src/types/index.ts
export * from './user';
export * from './merchant';
export * from './visitor';
```

### 2. 类型导入
```typescript
// ✅ 正确示例
import type { User, CreateUserData } from '@/types';
import { UserService } from '@/services';

// 混合导入
import { validateEmail, type ValidationResult } from '@/utils/validation';
```

### 3. 模块声明
```typescript
// ✅ 正确示例 - src/types/global.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        userType: string;
        merchantId?: number;
      };
    }
  }
}

// 第三方库类型扩展
declare module 'some-library' {
  interface SomeInterface {
    newProperty: string;
  }
}
```

## 错误处理类型

### 1. 错误类型定义
```typescript
// ✅ 正确示例
interface BaseError {
  code: string;
  message: string;
  timestamp: Date;
}

interface ValidationError extends BaseError {
  code: 'VALIDATION_ERROR';
  field: string;
  value: unknown;
}

interface NotFoundError extends BaseError {
  code: 'NOT_FOUND';
  resource: string;
  id: string | number;
}

type AppError = ValidationError | NotFoundError | AuthenticationError;
```

### 2. Result 类型模式
```typescript
// ✅ 正确示例
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

async function safeOperation<T>(
  operation: () => Promise<T>
): Promise<Result<T, AppError>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as AppError };
  }
}
```

## 测试类型规范

### 1. 测试数据类型
```typescript
// ✅ 正确示例
interface TestUser extends User {
  // 测试特有属性
  _testId?: string;
}

type MockUser = Partial<User> & {
  id: number;
  userName: string;
};

// 工厂函数类型
type UserFactory = {
  create(overrides?: Partial<User>): User;
  createMany(count: number, overrides?: Partial<User>): User[];
};
```

### 2. Mock 类型
```typescript
// ✅ 正确示例
import type { MockedFunction } from 'vitest';

interface MockUserService {
  getUserById: MockedFunction<UserService['getUserById']>;
  createUser: MockedFunction<UserService['createUser']>;
}

// 类型安全的 Mock 创建
function createMockUserService(): MockUserService {
  return {
    getUserById: vi.fn(),
    createUser: vi.fn()
  };
}
```

## 配置文件类型

### 1. 环境配置
```typescript
// ✅ 正确示例
interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

interface AppConfig {
  port: number;
  database: DatabaseConfig;
  jwt: {
    secret: string;
    expiresIn: string;
  };
}

// 环境变量类型
interface ProcessEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: string;
  DB_HOST: string;
  DB_PORT: string;
  // ... 其他环境变量
}
```

### 2. 构建配置
```typescript
// ✅ 正确示例
interface BuildConfig {
  entry: string;
  output: {
    path: string;
    filename: string;
  };
  mode: 'development' | 'production';
}
```

## 性能优化

### 1. 类型推导优化
```typescript
// ✅ 利用类型推导减少冗余
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
]; // TypeScript 自动推导为 { id: number; name: string; }[]

// ❌ 避免不必要的类型注解
const users: { id: number; name: string; }[] = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
];
```

### 2. 编译性能优化
```typescript
// ✅ 使用类型导入减少编译时间
import type { User } from './types';

// ✅ 避免深层嵌套的条件类型
type SimpleCheck<T> = T extends string ? true : false;

// ❌ 避免过于复杂的类型计算
type ComplexType<T> = T extends infer U 
  ? U extends string 
    ? U extends `${infer A}${infer B}` 
      ? A extends 'prefix' 
        ? B 
        : never 
      : never 
    : never 
  : never;
```

## 常见错误和解决方案

### 1. 类型断言错误
```typescript
// ❌ 错误示例
const user = data as User; // 不安全的类型断言

// ✅ 正确示例
function isUser(data: unknown): data is User {
  return typeof data === 'object' && 
         data !== null && 
         'id' in data && 
         'userName' in data;
}

const user = isUser(data) ? data : null;
```

### 2. 可选属性错误
```typescript
// ❌ 错误示例
interface User {
  id: number;
  name: string | undefined; // 应该使用可选属性
}

// ✅ 正确示例
interface User {
  id: number;
  name?: string; // 可选属性
}

// 处理可选属性
function getDisplayName(user: User): string {
  return user.name ?? 'Unknown User';
}
```

### 3. 数组类型错误
```typescript
// ❌ 错误示例
const users: User[] = [];
users.push(undefined); // 类型错误

// ✅ 正确示例
const users: User[] = [];
const newUser: User = { id: 1, userName: 'test', email: 'test@example.com' };
users.push(newUser);

// 处理可能为空的数组
function getFirstUser(users: User[]): User | undefined {
  return users[0];
}
```

## 代码审查检查清单

### 1. 类型定义检查
- [ ] 所有接口和类型都有明确的定义
- [ ] 没有使用 `any` 类型
- [ ] 可选属性正确使用 `?` 标记
- [ ] 联合类型明确列出所有可能值
- [ ] 泛型约束合理且必要

### 2. 函数类型检查
- [ ] 所有函数参数都有类型注解
- [ ] 所有函数都有明确的返回类型
- [ ] 异步函数返回 `Promise<T>` 类型
- [ ] 回调函数类型定义清晰

### 3. 导入导出检查
- [ ] 使用 `import type` 导入类型
- [ ] 类型定义统一从 `@/types` 导入
- [ ] 避免循环依赖
- [ ] 导出的类型有合理的命名

### 4. 错误处理检查
- [ ] 错误类型定义完整
- [ ] 使用类型安全的错误处理模式
- [ ] 避免抛出未定义类型的错误

## 工具和配置

### 1. TypeScript 配置
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 2. ESLint 规则
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error"
  }
}
```

### 3. 编辑器配置
- 启用 TypeScript 严格模式
- 配置自动导入类型
- 启用类型提示和错误检查
- 使用 TypeScript 格式化工具

## 学习资源

### 1. 官方文档
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### 2. 最佳实践
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)
- [Effective TypeScript](https://effectivetypescript.com/)

### 3. 工具链
- [ts-node](https://typestrong.org/ts-node/) - TypeScript 执行环境
- [tsc-watch](https://github.com/gilamran/tsc-watch) - TypeScript 监视模式
- [typescript-eslint](https://typescript-eslint.io/) - ESLint TypeScript 支持

## 版本更新

### 当前版本: 1.0.0
- 初始版本，包含基础类型规范
- 支持 TypeScript 5.0+ 特性
- 集成 CI/CD 类型检查

### 计划更新
- 添加更多高级类型模式
- 完善错误处理类型规范
- 增加性能优化指南
- 集成更多开发工具