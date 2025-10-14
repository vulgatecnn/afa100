# TypeScript 配置和错误处理规范

## TypeScript 编译器配置

### 错误处理策略

**未使用变量处理:**
- 对于未使用的变量不视为错误
- 允许开发过程中保留暂时未使用的变量
- 使用 `@typescript-eslint/no-unused-vars: "off"` 或 `"warn"` 级别

### 推荐的 tsconfig.json 配置

```json
{
  "compilerOptions": {
    "noUnusedLocals": false,
    "noUnusedParameters": false
  }
}
```

### ESLint 配置建议

```json
{
  "rules": {
    "@typescript-eslint/no-unused-vars": "warn",
    "no-unused-vars": "off"
  }
}
```

## 类型检查命令

**日常开发使用:**
```bash
pnpm type-check
```

**完整验证:**
```bash
pnpm verify:all
```

## 开发原则

- 优先关注类型安全和业务逻辑正确性
- 未使用变量在开发阶段允许存在
- 代码审查时再处理未使用的变量
- 保持开发流程的流畅性，避免因小问题中断开发

## 错误优先级

1. **高优先级**: 类型错误、语法错误
2. **中优先级**: 业务逻辑错误、安全问题
3. **低优先级**: 代码风格、未使用变量

## 配置更新指导

当需要调整 TypeScript 严格性时：
- 修改 `tsconfig.json` 中的编译选项
- 更新 ESLint 规则配置
- 确保团队成员同步配置更改