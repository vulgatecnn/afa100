# CI/CD 健康检查报告

生成时间: 2025-10-15T01:08:47.864Z

## 工作流文件

| 文件名 | 工作流名称 | 作业数 | 触发器 |
|--------|-----------|--------|--------|
| integration-tests-fixed.yml | 前后端集成测试流水线(修复版) | 21 | push, PR, schedule, manual |
| integration-tests.yml | 前后端集成测试流水线 | 15 | push, PR, schedule, manual |
| simple-ci.yml | 简化CI测试 | 8 | push, PR |
| typescript-type-check.yml | TypeScript 类型检查 | 8 | push, PR, manual |

## 配置质量检查

发现 6 个配置建议:

- **前后端集成测试流水线(修复版)** (warning): 未设置超时时间，可能导致工作流挂起
- **前后端集成测试流水线** (warning): 未设置超时时间，可能导致工作流挂起
- **简化CI测试** (optimization): 未使用依赖缓存，可能导致构建时间过长
- **简化CI测试** (warning): 未设置超时时间，可能导致工作流挂起
- **简化CI测试** (info): 未上传构建产物，无法保存测试报告或构建结果
- **TypeScript 类型检查** (warning): 未设置超时时间，可能导致工作流挂起

## 必需文件检查

| 文件路径 | 描述 | 状态 |
|----------|------|------|
| package.json | 项目配置文件 | ✅ 存在 |
| pnpm-workspace.yaml | pnpm workspace 配置 | ✅ 存在 |
| .github/workflows | GitHub Actions 工作流目录 | ✅ 存在 |
| afa-office-system/backend/package.json | 后端项目配置 | ✅ 存在 |
| afa-office-system/frontend/tenant-admin/package.json | 租务管理端配置 | ✅ 存在 |
| afa-office-system/frontend/merchant-admin/package.json | 商户管理端配置 | ✅ 存在 |

## 测试脚本配置

找到以下测试相关脚本:

- `test`
- `test:verbose`
- `test:silent`
- `test:coverage`
- `test:parallel`
- `test:backend`
- `test:frontend`
- `test:miniprogram`
- `test:legacy`
- `test:coverage:legacy`
- `backend:test`
- `ci:test`
- `ci:test:unit`
- `ci:test:integration`
- `ci:test:e2e`
- `ci:env:create`
- `ci:env:destroy`
- `ci:env:recreate`
- `ci:report`
- `ci:report:html`
- `ci:report:json`
- `ci:report:markdown`

## 总结

⚠️ 发现 6 个需要关注的问题，建议及时处理。

## 建议

1. 定期检查工作流运行状态，及时修复失败的构建
2. 保持工作流文件的简洁和可维护性
3. 使用缓存和并行执行来优化构建时间
4. 为关键步骤添加超时和错误处理
5. 定期更新 GitHub Actions 版本
