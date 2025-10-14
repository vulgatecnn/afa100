# AFA 办公小程序文档中心

## 概述

欢迎来到 AFA 办公小程序项目文档中心。本文档提供了项目开发、部署和维护的完整指南。

## 文档目录

### 🚀 快速开始
- [环境设置指南](./environment-setup.md) - 开发环境配置和依赖安装
- [项目结构说明](./project-structure.md) - 项目组织和目录结构
- [开发工作流程](./development-workflow.md) - 日常开发流程和规范

### 📋 TypeScript 类型系统
- [TypeScript 使用规范](./typescript-usage-standards.md) - 类型定义和使用规范
- [TypeScript 最佳实践](./typescript-best-practices.md) - 开发最佳实践指南
- [TypeScript 错误排查手册](./typescript-error-troubleshooting.md) - 常见错误诊断和解决方案
- [TypeScript CI/CD 集成](./typescript-ci-integration.md) - 持续集成中的类型检查

### 🧪 测试和质量保证
- [E2E 环境设置](./e2e-environment-setup.md) - 端到端测试环境配置
- [CI/CD 集成测试](./ci-cd-integration-testing.md) - 持续集成测试配置

### 🏗️ 架构和设计
- [系统架构设计](./system-architecture.md) - 整体系统架构说明
- [数据库设计](./database-design.md) - 数据模型和关系设计
- [API 设计规范](./api-design-standards.md) - RESTful API 设计规范

### 🔧 开发指南
- [后端开发指南](./backend-development.md) - Node.js + TypeScript 后端开发
- [前端开发指南](./frontend-development.md) - React + TypeScript 前端开发
- [小程序开发指南](./miniprogram-development.md) - 微信小程序开发

### 📦 部署和运维
- [部署指南](./deployment-guide.md) - 生产环境部署流程
- [监控和日志](./monitoring-logging.md) - 系统监控和日志管理
- [性能优化](./performance-optimization.md) - 性能调优指南

### 🔒 安全和权限
- [安全规范](./security-standards.md) - 安全开发规范
- [权限管理](./permission-management.md) - 用户权限和访问控制

## 项目概览

### 技术栈
- **后端**: Node.js + TypeScript + Express.js + MySQL
- **前端**: React 18+ + TypeScript + Ant Design + Vite
- **小程序**: 微信原生小程序
- **包管理**: pnpm
- **测试**: Vitest + Playwright
- **CI/CD**: GitHub Actions

### 核心功能
- 租务管理端：商户管理、空间管理、通行权限控制
- 商户管理端：员工管理、访客审批、权限分配
- 访客小程序：访客预约、员工申请、通行码展示
- 通行验证：二维码/人脸/刷卡多种通行方式

### 项目结构
```
afa-office-system/
├── backend/                    # 后端 API 服务
├── frontend/                   # 前端管理后台
│   ├── tenant-admin/          # 租务管理端
│   └── merchant-admin/        # 商户管理端
├── miniprogram/               # 微信小程序
├── shared/                    # 共享代码和类型
├── docs/                      # 项目文档
└── scripts/                   # 构建和部署脚本
```

## 开发规范

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 ESLint 和 Prettier 配置
- 采用分层架构：Controller → Service → Model
- 使用统一的错误处理和日志记录

### Git 工作流
- 主分支：`main` (生产环境)
- 开发分支：`develop` (开发环境)
- 功能分支：`feature/功能名称`
- 修复分支：`fix/问题描述`

### 提交规范
```
type(scope): description

类型:
- feat: 新功能
- fix: 修复问题
- docs: 文档更新
- style: 代码格式调整
- refactor: 代码重构
- test: 测试相关
- chore: 构建工具或辅助工具的变动
```

## 快速开始

### 1. 环境准备
```bash
# 安装 Node.js 18+
# 安装 pnpm
npm install -g pnpm

# 克隆项目
git clone <repository-url>
cd afa-office-system

# 安装依赖
pnpm install
```

### 2. 开发环境启动
```bash
# 启动后端服务 (端口 5100)
cd afa-office-system/backend
pnpm dev

# 启动前端服务 (端口 5000, 5050)
cd afa-office-system/frontend/tenant-admin
pnpm dev

cd afa-office-system/frontend/merchant-admin
pnpm dev
```

### 3. 数据库初始化
```bash
cd afa-office-system/backend
pnpm db:init
```

### 4. 运行测试
```bash
# 后端测试
cd afa-office-system/backend
pnpm test

# 前端测试
cd afa-office-system/frontend/tenant-admin
pnpm test
```

## TypeScript 类型系统

### 类型检查
```bash
# 运行类型检查
pnpm type-check

# 运行类型检查验证
pnpm type-check:validate

# 运行类型回归测试
pnpm type-check:regression
```

### 类型质量监控
- 类型覆盖率目标：>95%
- `any` 类型使用率：<1%
- 类型错误数量：0 (目标)
- CI/CD 自动类型检查

## 常用命令

### 开发命令
```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建项目
pnpm build

# 运行测试
pnpm test

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

### 数据库命令
```bash
# 初始化数据库
pnpm db:init

# 运行迁移
pnpm db:migrate

# 重置数据库
pnpm db:reset
```

### 测试命令
```bash
# 单元测试
pnpm test

# 集成测试
pnpm test:integration

# E2E 测试
pnpm test:e2e

# 测试覆盖率
pnpm test:coverage
```

## 故障排除

### 常见问题

#### 端口冲突
```bash
# 终止占用端口的进程
.\scripts\kill-dev.cmd

# 或使用 PowerShell 脚本
.\scripts\kill-dev-ports.ps1 -All
```

#### 依赖问题
```bash
# 清理缓存重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### TypeScript 错误
```bash
# 运行类型检查诊断
pnpm type-check:validate

# 查看详细错误报告
cat type-check-report.json
```

### 获取帮助
- 查看相关文档章节
- 检查 GitHub Issues
- 联系项目维护者
- 参考 [TypeScript 错误排查手册](./typescript-error-troubleshooting.md)

## 贡献指南

### 参与开发
1. Fork 项目仓库
2. 创建功能分支
3. 提交代码变更
4. 创建 Pull Request
5. 代码审查和合并

### 文档贡献
1. 发现文档问题或改进建议
2. 编辑相应的 Markdown 文件
3. 提交 Pull Request
4. 文档审查和更新

### 问题反馈
1. 搜索现有 Issues
2. 创建新的 Issue
3. 提供详细的问题描述
4. 包含复现步骤和环境信息

## 版本历史

### v1.0.0 (当前版本)
- 基础功能实现
- TypeScript 类型系统建立
- CI/CD 流水线配置
- 文档体系完善

### 计划更新
- 性能优化和监控
- 更多测试覆盖
- 国际化支持
- 移动端适配

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](../LICENSE) 文件。

## 联系方式

- 项目维护者：AFA Team
- 邮箱：[项目邮箱]
- 文档更新：定期更新，版本同步

---

**注意**: 本文档会随着项目发展持续更新。建议定期查看最新版本。