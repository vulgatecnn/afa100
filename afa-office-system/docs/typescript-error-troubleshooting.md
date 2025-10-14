# TypeScript 类型错误排查手册

## 概述

本手册提供了 AFA 办公小程序项目中常见 TypeScript 类型错误的诊断和解决方案，帮助开发者快速定位和修复类型问题。

## 错误分类和解决方案

### 1. 导入和模块错误 (TS2307, TS2305)

#### TS2307: Cannot find module 'xxx' or its corresponding type declarations

**常见原因:**
- 模块路径错误
- 缺少类型声明文件
- 路径映射配置问题

**解决方案:**

```typescript
// ❌ 错误示例
import { User } from './user'; // 文件不存在或路径错误

// ✅ 解决方案 1: 检查文件路径
import { User } from './types/user';
import { User } from '../types/user';

// ✅ 解决方案 2: 使用路径映射
import { User } from '@/types/user';

// ✅ 解决方案 3: 添加类型声明文件
// 创建 src/types/third-party.d.ts
declare module 'some-library' {
  export interface SomeInterface {
    property: string;
  }
}
```

**检查清单:**
- [ ] 确认文件路径正确
- [ ] 检查 `tsconfig.json` 中的 `paths` 配置
- [ ] 确认 `baseUrl` 设置正确
- [ ] 检查文件扩展名 (`.ts`, `.tsx`, `.d.ts`)

#### TS2305: Module 'xxx' has no exported member 'yyy'

**常见原因:**
- 导出名称错误
- 导出方式不匹配
- 版本不兼容

**解决方案:**

```typescript
// ❌ 错误示例
import { NonExistentExport } from './user';

// ✅ 解决方案 1: 检查导出名称
// user.ts
export interface User { }
export type UserType = string;

// 正确导入
import { User, UserType } from './user';

// ✅ 解决方案 2: 使用默认导出
// user.ts
export default interface User { }

// 正确导入
import User from './user';

// ✅ 解决方案 3: 使用命名空间导出
// user.ts
export namespace UserTypes {
  export interface User { }
}

// 正确导入
import { UserTypes } from './user';
```

### 2. 类型冲突错误 (TS2339, TS2322)

#### TS2339: Property 'xxx' does not exist on type 'yyy'

**常见原因:**
- 属性名拼写错误
- 类型定义不完整
- 可选属性处理不当

**解决方案:**

```typescript
// ❌ 错误示例
interface User {
  id: number;
  name: string;
}

const user: User = { id: 1, name: 'John' };
console.log(user.email); // TS2339: Property 'email' does not exist

// ✅ 解决方案 1: 添加缺失属性
interface User {
  id: number;
  name: string;
  email?: string; // 可选属性
}

// ✅ 解决方案 2: 使用类型断言 (谨慎使用)
console.log((user as any).email);

// ✅ 解决方案 3: 使用类型守卫
function hasEmail(user: User): user is User & { email: string } {
  return 'email' in user;
}

if (hasEmail(user)) {
  console.log(user.email); // 现在是安全的
}

// ✅ 解决方案 4: 扩展接口
interface UserWithEmail extends User {
  email: string;
}
```

#### TS2322: Type 'xxx' is not assignable to type 'yyy'

**常见原因:**
- 类型不匹配
- 严格空值检查
- 联合类型处理不当

**解决方案:**

```typescript
// ❌ 错误示例
interface User {
  id: number;
  name: string;
  status: 'active' | 'inactive';
}

const user: User = {
  id: 1,
  name: 'John',
  status: 'pending' // TS2322: Type '"pending"' is not assignable
};

// ✅ 解决方案 1: 修正值
const user: User = {
  id: 1,
  name: 'John',
  status: 'active' // 使用正确的联合类型值
};

// ✅ 解决方案 2: 扩展联合类型
interface User {
  id: number;
  name: string;
  status: 'active' | 'inactive' | 'pending';
}

// ✅ 解决方案 3: 使用 const assertion
const statuses = ['active', 'inactive', 'pending'] as const;
type Status = typeof statuses[number];

interface User {
  id: number;
  name: string;
  status: Status;
}
```

### 3. 严格模式错误 (TS2345, TS2554)

#### TS2345: Argument of type 'xxx' is not assignable to parameter of type 'yyy'

**常见原因:**
- 参数类型不匹配
- 可选参数处理
- 泛型约束问题

**解决方案:**

```typescript
// ❌ 错误示例
function processUser(user: User): void {
  // 处理用户
}

const userData = { id: 1, name: 'John', extra: 'data' };
processUser(userData); // TS2345: 额外属性 'extra'

// ✅ 解决方案 1: 使用类型断言
processUser(userData as User);

// ✅ 解决方案 2: 使用对象解构
const { id, name } = userData;
processUser({ id, name });

// ✅ 解决方案 3: 修改函数签名接受额外属性
function processUser(user: User & Record<string, any>): void {
  // 处理用户
}

// ✅ 解决方案 4: 使用 Pick 工具类型
function processUser(user: Pick<typeof userData, 'id' | 'name'>): void {
  // 处理用户
}
```

#### TS2554: Expected X arguments, but got Y

**常见原因:**
- 参数数量不匹配
- 可选参数配置错误
- 函数重载问题

**解决方案:**

```typescript
// ❌ 错误示例
function createUser(name: string, email: string, age: number): User {
  // 创建用户
}

createUser('John', 'john@example.com'); // TS2554: Expected 3 arguments

// ✅ 解决方案 1: 提供所有必需参数
createUser('John', 'john@example.com', 25);

// ✅ 解决方案 2: 使用可选参数
function createUser(name: string, email: string, age?: number): User {
  // 创建用户
}

// ✅ 解决方案 3: 使用默认参数
function createUser(name: string, email: string, age: number = 0): User {
  // 创建用户
}

// ✅ 解决方案 4: 使用对象参数
interface CreateUserParams {
  name: string;
  email: string;
  age?: number;
}

function createUser(params: CreateUserParams): User {
  // 创建用户
}

createUser({ name: 'John', email: 'john@example.com' });
```

### 4. 泛型和约束错误 (TS2344, TS2315)

#### TS2344: Type 'xxx' does not satisfy the constraint 'yyy'

**常见原因:**
- 泛型约束不满足
- 类型参数错误
- 条件类型问题

**解决方案:**

```typescript
// ❌ 错误示例
interface Repository<T extends { id: number }> {
  save(entity: T): Promise<T>;
}

interface User {
  name: string; // 缺少 id 属性
}

const userRepo: Repository<User> = {}; // TS2344: User 不满足约束

// ✅ 解决方案 1: 修改类型满足约束
interface User {
  id: number;
  name: string;
}

// ✅ 解决方案 2: 修改约束条件
interface Repository<T extends Record<string, any>> {
  save(entity: T): Promise<T>;
}

// ✅ 解决方案 3: 使用交叉类型
type EntityWithId<T> = T & { id: number };

interface Repository<T> {
  save(entity: EntityWithId<T>): Promise<EntityWithId<T>>;
}
```

### 5. 空值检查错误 (TS2531, TS2532)

#### TS2531: Object is possibly 'null'

**常见原因:**
- 启用了 `strictNullChecks`
- 未处理可能的 null 值
- 类型定义包含 null

**解决方案:**

```typescript
// ❌ 错误示例
function getUser(id: number): User | null {
  // 可能返回 null
}

const user = getUser(1);
console.log(user.name); // TS2531: Object is possibly 'null'

// ✅ 解决方案 1: 使用可选链
console.log(user?.name);

// ✅ 解决方案 2: 使用类型守卫
if (user !== null) {
  console.log(user.name);
}

// ✅ 解决方案 3: 使用非空断言 (确定不为 null 时)
console.log(user!.name);

// ✅ 解决方案 4: 使用空值合并
const userName = user?.name ?? 'Unknown';

// ✅ 解决方案 5: 提前返回
if (!user) {
  return;
}
console.log(user.name); // 现在是安全的
```

#### TS2532: Object is possibly 'undefined'

**解决方案类似 TS2531:**

```typescript
// ✅ 处理 undefined 的方法
function processUser(user?: User): void {
  // 方法 1: 可选链
  console.log(user?.name);
  
  // 方法 2: 默认值
  const name = user?.name || 'Default Name';
  
  // 方法 3: 类型守卫
  if (user) {
    console.log(user.name);
  }
  
  // 方法 4: 断言 (确定存在时)
  console.log(user!.name);
}
```

### 6. 函数类型错误 (TS2571, TS7006)

#### TS7006: Parameter 'xxx' implicitly has an 'any' type

**常见原因:**
- 未启用 `noImplicitAny`
- 回调函数参数类型推导失败
- 事件处理器类型缺失

**解决方案:**

```typescript
// ❌ 错误示例
const users = [{ id: 1, name: 'John' }];
users.forEach(user => { // TS7006: Parameter 'user' implicitly has an 'any' type
  console.log(user.name);
});

// ✅ 解决方案 1: 显式类型注解
users.forEach((user: User) => {
  console.log(user.name);
});

// ✅ 解决方案 2: 使用类型断言
const users: User[] = [{ id: 1, name: 'John' }];
users.forEach(user => { // 现在可以推导出类型
  console.log(user.name);
});

// ✅ 解决方案 3: 定义回调函数类型
type UserCallback = (user: User) => void;
const processUser: UserCallback = (user) => {
  console.log(user.name);
};
users.forEach(processUser);
```

### 7. 第三方库类型错误 (TS7016, TS2688)

#### TS7016: Could not find a declaration file for module 'xxx'

**常见原因:**
- 第三方库没有类型声明
- 类型声明包未安装
- 模块解析配置问题

**解决方案:**

```typescript
// ✅ 解决方案 1: 安装类型声明包
// npm install --save-dev @types/library-name

// ✅ 解决方案 2: 创建自定义声明文件
// src/types/library-name.d.ts
declare module 'library-name' {
  export interface SomeInterface {
    property: string;
  }
  
  export function someFunction(param: string): void;
}

// ✅ 解决方案 3: 使用模块声明
// src/types/global.d.ts
declare module '*.json' {
  const value: any;
  export default value;
}

declare module '*.css' {
  const classes: { [key: string]: string };
  export default classes;
}

// ✅ 解决方案 4: 临时忽略类型检查
// @ts-ignore
import someLibrary from 'untyped-library';
```

### 8. 配置相关错误

#### 路径映射问题

**解决方案:**

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/types/*": ["src/types/*"],
      "@/utils/*": ["src/utils/*"]
    }
  }
}
```

#### 模块解析问题

```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true
  }
}
```

## 调试工具和技巧

### 1. TypeScript 编译器选项

#### 启用详细输出
```bash
# 显示详细的类型检查信息
tsc --noEmit --listFiles

# 显示类型解析过程
tsc --noEmit --traceResolution

# 显示配置信息
tsc --showConfig
```

#### 生成声明文件
```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true
  }
}
```

### 2. 编辑器调试技巧

#### VSCode 调试
- 使用 `Ctrl+Shift+P` 打开命令面板
- 运行 "TypeScript: Restart TS Server"
- 使用 "TypeScript: Go to Type Definition"
- 启用 "TypeScript: Show Type Information"

#### 类型信息查看
```typescript
// 使用 TypeScript 内置工具查看类型
type UserKeys = keyof User; // 查看 User 的所有键
type UserName = User['name']; // 查看特定属性的类型

// 使用条件类型调试
type IsString<T> = T extends string ? 'yes' : 'no';
type Test = IsString<string>; // 'yes'
```

### 3. 常用调试命令

```bash
# 检查特定文件的类型
npx tsc --noEmit path/to/file.ts

# 生成类型覆盖率报告
npx type-coverage --detail

# 检查未使用的导出
npx ts-unused-exports tsconfig.json

# 查找循环依赖
npx madge --circular --extensions ts src/
```

## 错误预防策略

### 1. 开发时预防

#### 编辑器配置
```json
// .vscode/settings.json
{
  "typescript.preferences.quoteStyle": "single",
  "typescript.suggest.autoImports": true,
  "typescript.updateImportsOnFileMove.enabled": "always",
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

#### ESLint 规则
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-non-null-assertion": "warn"
  }
}
```

### 2. 代码审查检查清单

#### 类型安全检查
- [ ] 没有使用 `any` 类型
- [ ] 所有函数都有返回类型
- [ ] 正确处理可能的 null/undefined 值
- [ ] 泛型约束合理
- [ ] 类型导入使用 `import type`

#### 代码质量检查
- [ ] 接口命名清晰
- [ ] 避免类型重复定义
- [ ] 合理使用工具类型
- [ ] 错误处理类型安全

### 3. 自动化检查

#### Git Hooks
```bash
#!/bin/sh
# .git/hooks/pre-commit

echo "Running TypeScript type check..."
npm run type-check

if [ $? -ne 0 ]; then
  echo "TypeScript type check failed. Commit aborted."
  exit 1
fi
```

#### CI/CD 集成
```yaml
# .github/workflows/type-check.yml
- name: TypeScript Type Check
  run: |
    npm run type-check
    npm run type-coverage
```

## 性能优化

### 1. 编译性能优化

#### 增量编译
```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

#### 跳过库检查
```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

### 2. 类型检查优化

#### 合理使用 include/exclude
```json
{
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts"
  ]
}
```

#### 项目引用
```json
{
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/client" }
  ]
}
```

## 常见问题 FAQ

### Q1: 如何处理第三方库没有类型声明的情况？

**A1:** 
1. 首先检查是否有 `@types/library-name` 包
2. 创建自定义声明文件 `src/types/library-name.d.ts`
3. 使用 `declare module` 声明模块
4. 临时使用 `// @ts-ignore` 忽略

### Q2: 为什么我的路径映射不工作？

**A2:**
1. 检查 `tsconfig.json` 中的 `baseUrl` 和 `paths` 配置
2. 确认构建工具 (Webpack, Vite) 也配置了相同的路径映射
3. 重启 TypeScript 服务器
4. 检查文件扩展名是否正确

### Q3: 如何处理复杂的联合类型？

**A3:**
1. 使用类型守卫函数
2. 使用 `in` 操作符检查属性
3. 使用 `instanceof` 检查类实例
4. 使用判别联合类型 (discriminated unions)

### Q4: 什么时候应该使用 `any` 类型？

**A4:**
1. 迁移 JavaScript 代码的临时阶段
2. 处理动态内容 (但优先考虑 `unknown`)
3. 第三方库类型定义不完整的临时解决方案
4. 绝大多数情况下应该避免使用

### Q5: 如何优化 TypeScript 编译性能？

**A5:**
1. 启用增量编译 (`incremental: true`)
2. 使用项目引用 (project references)
3. 启用 `skipLibCheck`
4. 合理配置 `include` 和 `exclude`
5. 使用 TypeScript 4.0+ 的性能优化特性

## 总结

TypeScript 错误排查的关键原则：

1. **理解错误信息** - 仔细阅读错误代码和描述
2. **检查类型定义** - 确认接口和类型定义正确
3. **验证配置** - 检查 `tsconfig.json` 配置
4. **使用工具** - 利用编辑器和命令行工具
5. **渐进修复** - 从简单错误开始，逐步解决复杂问题
6. **预防为主** - 建立良好的开发习惯和自动化检查

通过系统性的错误排查方法和预防策略，可以显著提升 TypeScript 开发效率和代码质量。