# CI/CD 状态徽章配置

本文档包含项目的 CI/CD 状态徽章，可以添加到 README.md 中以显示构建状态。

## 工作流状态徽章

### 简化 CI 测试
[![简化CI测试](https://github.com/vulgatecnn/afa100/actions/workflows/simple-ci.yml/badge.svg)](https://github.com/vulgatecnn/afa100/actions/workflows/simple-ci.yml)

```markdown
[![简化CI测试](https://github.com/vulgatecnn/afa100/actions/workflows/simple-ci.yml/badge.svg)](https://github.com/vulgatecnn/afa100/actions/workflows/simple-ci.yml)
```

### TypeScript 类型检查
[![TypeScript 类型检查](https://github.com/vulgatecnn/afa100/actions/workflows/typescript-type-check.yml/badge.svg)](https://github.com/vulgatecnn/afa100/actions/workflows/typescript-type-check.yml)

```markdown
[![TypeScript 类型检查](https://github.com/vulgatecnn/afa100/actions/workflows/typescript-type-check.yml/badge.svg)](https://github.com/vulgatecnn/afa100/actions/workflows/typescript-type-check.yml)
```

### 前后端集成测试流水线
[![前后端集成测试](https://github.com/vulgatecnn/afa100/actions/workflows/integration-tests-fixed.yml/badge.svg)](https://github.com/vulgatecnn/afa100/actions/workflows/integration-tests-fixed.yml)

```markdown
[![前后端集成测试](https://github.com/vulgatecnn/afa100/actions/workflows/integration-tests-fixed.yml/badge.svg)](https://github.com/vulgatecnn/afa100/actions/workflows/integration-tests-fixed.yml)
```

## 自定义徽章样式

GitHub Actions 徽章支持多种样式参数：

### 扁平样式
```markdown
[![CI](https://github.com/vulgatecnn/afa100/actions/workflows/simple-ci.yml/badge.svg?style=flat)](https://github.com/vulgatecnn/afa100/actions/workflows/simple-ci.yml)
```

### 扁平方形样式
```markdown
[![CI](https://github.com/vulgatecnn/afa100/actions/workflows/simple-ci.yml/badge.svg?style=flat-square)](https://github.com/vulgatecnn/afa100/actions/workflows/simple-ci.yml)
```

### 针对特定分支
```markdown
[![CI](https://github.com/vulgatecnn/afa100/actions/workflows/simple-ci.yml/badge.svg?branch=main)](https://github.com/vulgatecnn/afa100/actions/workflows/simple-ci.yml)
```

## 推荐的 README 徽章布局

```markdown
# AFA 办公系统

[![简化CI测试](https://github.com/vulgatecnn/afa100/actions/workflows/simple-ci.yml/badge.svg)](https://github.com/vulgatecnn/afa100/actions/workflows/simple-ci.yml)
[![TypeScript 类型检查](https://github.com/vulgatecnn/afa100/actions/workflows/typescript-type-check.yml/badge.svg)](https://github.com/vulgatecnn/afa100/actions/workflows/typescript-type-check.yml)
[![前后端集成测试](https://github.com/vulgatecnn/afa100/actions/workflows/integration-tests-fixed.yml/badge.svg)](https://github.com/vulgatecnn/afa100/actions/workflows/integration-tests-fixed.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![pnpm Version](https://img.shields.io/badge/pnpm-%3E%3D8.0.0-orange)](https://pnpm.io/)
```

## 其他有用的徽章

### 代码覆盖率（需要配置 Codecov 或类似服务）
```markdown
[![codecov](https://codecov.io/gh/vulgatecnn/afa100/branch/main/graph/badge.svg)](https://codecov.io/gh/vulgatecnn/afa100)
```

### 依赖状态
```markdown
[![Dependencies](https://img.shields.io/david/vulgatecnn/afa100.svg)](https://david-dm.org/vulgatecnn/afa100)
```

### 代码质量（需要配置 Code Climate 或类似服务）
```markdown
[![Code Climate](https://codeclimate.com/github/vulgatecnn/afa100/badges/gpa.svg)](https://codeclimate.com/github/vulgatecnn/afa100)
```

## 工作流直接链接

- [简化 CI 测试](https://github.com/vulgatecnn/afa100/actions/workflows/simple-ci.yml)
- [TypeScript 类型检查](https://github.com/vulgatecnn/afa100/actions/workflows/typescript-type-check.yml)
- [前后端集成测试流水线](https://github.com/vulgatecnn/afa100/actions/workflows/integration-tests-fixed.yml)
- [所有工作流](https://github.com/vulgatecnn/afa100/actions)

## 徽章更新说明

徽章会自动反映最新的工作流运行状态：
- ✅ **passing** - 工作流成功通过
- ❌ **failing** - 工作流失败
- ⚠️ **no status** - 工作流尚未运行或被禁用

徽章会在每次工作流运行完成后自动更新，无需手动干预。
