# TypeScript 错误修复实施计划

## 概述

基于当前代码分析，主要存在以下类型的 TypeScript 错误：

1. 类型导入错误 - API 类型未从 index.ts 正确导出
2. MockedFunction 测试代码混入生产代码
3. exactOptionalPropertyTypes 兼容性问题
4. 环境变量类型安全问题

## 实施任务

- [x] 1. 修复类型导入错误

  - 将 API 类型从 api.ts 正确导出到 index.ts
  - 确保所有控制器能正确导入 AsyncControllerMethod、LoginRequest 等类型
  - 验证类型导入不再出现 "Module has no exported member" 错误
  - _需求: 1.1, 1.2, 1.3_

- [x] 2. 清理测试代码混入问题

  - 识别并移除生产代码中的 MockedFunction 引用
  - 将测试相关代码移动到适当的测试文件或条件编译块
  - 确保生产代码不包含 vitest 测试框架的依赖
  - _需求: 2.1, 2.2, 2.3_

- [x] 3. 修复 exactOptionalPropertyTypes 兼容性

  - 修复 CreateAccessRecordApiData 中 passcodeId 等字段的类型定义
  - 更新接口定义以正确处理 undefined 与 null 的区别

  - 修复所有 "Type 'undefined' is not assignable to type 'number | null'" 错误
  - _需求: 3.1, 3.2, 3.3_

-

- [x] 4. 修复环境变量类型安全

  - 为 mysql-config-manager.ts 中的环境变量提供默认值或类型保护
  - 确保不会将 undefined 赋值给 string 类型
  - 更新配置管理器以安全处理未定义的环境变量
  - _需求: 4.1, 4.2, 4.3_

- [x] 5. 修复用户上下文类型问题

  - 修复 file.controller.ts 中 req.user.id 属性访问错误

  - 确保 UserContext 接口包含所需的 id 属性
  - 验证认证中间件正确设置用户上下文
  - _需求: 4.1, 4.2_

- [ ] 6. 阶段性验证和最终确认






  - 每完成一个任务后运行 `pnpm type-check` 验证修复效果
  - 确保修复不引入新的 TypeScript 错误
  - 最终验证所有错误都已解决，错误数量为零
  - _需求: 5.1, 5.2, 5.3, 5.4, 5.5_


## 验证命令

每个阶段完成后使用以下命令验证：

```bash
pnpm type-check
```

## 回退策略

如果任何修复导致更多问题：

1. 立即停止当前修复
2. 回退到上一个稳定状态
3. 重新分析问题并调整修复方案
4. 记录问题和解决方案以供参考

## 成功标准

- 所有 TypeScript 编译错误消除
- `pnpm type-check` 命令成功执行且无错误输出
- 生产代码不包含测试框架依赖
- 类型系统保持一致性和安全性
