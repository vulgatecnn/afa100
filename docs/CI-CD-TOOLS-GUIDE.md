# CI/CD 工具使用指南

本指南介绍项目中可用的 CI/CD 检查和监控工具。

---

## 🛠️ 可用工具

### 1. CI/CD 集成检查 (综合检查)

**脚本**: `scripts/ci-integration-check.js`

**用途**: 对整个 CI/CD 配置进行全面检查，包括 Git 仓库、GitHub Actions、依赖配置、项目结构、环境配置和最佳实践。

**运行命令**:
```bash
node scripts/ci-integration-check.js
```

**检查内容**:
- ✅ Git 仓库状态和远程配置
- ✅ GitHub Actions 工作流文件
- ✅ 依赖和测试脚本配置
- ✅ 项目目录结构
- ✅ 环境配置文件
- ✅ 最佳实践遵循情况

**输出**:
- 控制台彩色输出
- 生成 `ci-integration-check-report.md` 报告

**适用场景**:
- 项目初始化后的首次检查
- 定期全面评估（建议每周一次）
- 重大配置变更后的验证

---

### 2. CI/CD 健康检查

**脚本**: `scripts/ci-health-check.js`

**用途**: 检查工作流文件的存在性、配置质量和必需文件。

**运行命令**:
```bash
node scripts/ci-health-check.js
```

**检查内容**:
- ✅ 工作流文件数量和基本信息
- ✅ 配置质量（缓存、超时、错误处理等）
- ✅ 必需文件检查
- ✅ 测试脚本配置

**输出**:
- 控制台彩色输出
- 生成 `ci-health-check-report.md` 报告
- 健康评分（0-100%）

**适用场景**:
- 日常快速健康检查
- 工作流文件修改后的验证
- CI/CD 性能优化前的基准测试

---

### 3. 工作流配置验证

**脚本**: `scripts/ci-workflow-validator.js`

**用途**: 深度验证工作流配置的正确性、安全性和最佳实践。

**运行命令**:
```bash
node scripts/ci-workflow-validator.js
```

**检查内容**:
- ✅ 必需配置项（name, on, jobs）
- ✅ 推荐配置（缓存、超时、artifacts）
- ✅ 最佳实践（版本固定、错误处理、并发控制）
- ✅ 安全检查（硬编码密钥、Secrets 使用）

**输出**:
- 控制台详细输出（错误、警告、建议）
- 生成 `ci-workflow-validation-report.md` 报告
- 健康评分（0-100%）

**适用场景**:
- 创建或修改工作流文件后
- 安全审计
- 配置优化

---

## 📊 使用建议

### 日常使用流程

```bash
# 1. 快速健康检查（每天）
node scripts/ci-health-check.js

# 2. 工作流验证（修改工作流后）
node scripts/ci-workflow-validator.js

# 3. 综合检查（每周）
node scripts/ci-integration-check.js
```

### 在 package.json 中添加快捷命令

```json
{
  "scripts": {
    "ci:check": "node scripts/ci-integration-check.js",
    "ci:health": "node scripts/ci-health-check.js",
    "ci:validate": "node scripts/ci-workflow-validator.js",
    "ci:check:all": "npm run ci:health && npm run ci:validate && npm run ci:check"
  }
}
```

然后可以使用：
```bash
pnpm ci:check
pnpm ci:health
pnpm ci:validate
pnpm ci:check:all  # 运行所有检查
```

---

## 📈 报告文件说明

| 报告文件 | 生成工具 | 内容 |
|---------|---------|------|
| `ci-integration-check-report.md` | ci-integration-check.js | 综合集成检查结果 |
| `ci-health-check-report.md` | ci-health-check.js | 健康状态详细报告 |
| `ci-workflow-validation-report.md` | ci-workflow-validator.js | 工作流验证详细结果 |
| `CI-CD-INTEGRATION-SUMMARY.md` | 手动汇总 | 总结报告和改进建议 |

---

## 🎯 常见问题解决

### Q1: 检查脚本报错怎么办？

**A**: 检查以下几点：
1. 确保在项目根目录运行
2. 确保 Node.js 版本 >= 18.0.0
3. 确保已安装依赖：`pnpm install`
4. 检查文件权限

### Q2: 如何修复"硬编码密钥"错误？

**A**: 
1. 在 GitHub 仓库设置中添加 Secrets
2. 将工作流中的硬编码值替换为 `${{ secrets.SECRET_NAME }}`
3. 参考 `CI-CD-INTEGRATION-SUMMARY.md` 中的快速修复指南

### Q3: 健康评分低怎么办？

**A**:
1. 查看生成的报告文件，了解具体问题
2. 按优先级修复问题（错误 > 警告 > 建议）
3. 修复后重新运行检查验证

### Q4: 如何添加新的验证规则？

**A**:
编辑 `scripts/ci-workflow-validator.js`，在 `validationRules` 对象中添加新规则：

```javascript
{
  name: 'my-custom-rule',
  check: (content) => {
    // 返回 true 表示通过，false 表示失败
    return content.includes('my-pattern');
  },
  message: '规则描述',
  severity: 'error' | 'warning' | 'info',
}
```

---

## 🔄 CI/CD 工作流

### 推荐的检查频率

| 检查类型 | 频率 | 时机 |
|---------|------|------|
| 健康检查 | 每天 | 开始工作前 |
| 工作流验证 | 按需 | 修改工作流后 |
| 综合检查 | 每周 | 周一或周五 |
| 完整审计 | 每月 | 月初或月末 |

### 集成到 Git Hooks

可以将检查集成到 Git hooks 中：

**`.husky/pre-commit`**:
```bash
#!/bin/sh
# 在提交前运行健康检查
node scripts/ci-health-check.js
```

**`.husky/pre-push`**:
```bash
#!/bin/sh
# 在推送前运行工作流验证
node scripts/ci-workflow-validator.js
```

---

## 📚 相关文档

- [CI/CD 状态徽章配置](./CI-CD-BADGES.md)
- [CI/CD 集成检查总结](../CI-CD-INTEGRATION-SUMMARY.md)
- [GitHub Actions 文档](https://docs.github.com/en/actions)

---

## 🆘 获取帮助

如果遇到问题：
1. 查看生成的报告文件获取详细信息
2. 参考 `CI-CD-INTEGRATION-SUMMARY.md` 中的快速修复指南
3. 查阅 GitHub Actions 官方文档
4. 在项目中创建 Issue

---

**最后更新**: 2025-10-15  
**工具版本**: 1.0.0
