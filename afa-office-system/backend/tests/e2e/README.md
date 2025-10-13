# 端到端测试框架

## 概述

本目录包含AFA办公系统的端到端测试，涵盖完整的用户流程和系统集成测试。

## 测试结构

```
e2e/
├── config/                 # 测试配置
├── fixtures/              # 测试数据
├── helpers/               # 测试辅助工具
├── specs/                 # 测试用例
│   ├── auth/              # 认证流程测试
│   ├── business/          # 业务流程测试
│   └── integration/       # 系统集成测试
└── utils/                 # 测试工具函数
```

## 测试环境

- **后端服务**: http://localhost:3000
- **租务管理端**: http://localhost:3001  
- **商户管理端**: http://localhost:3002
- **数据库**: SQLite (测试专用)

## 运行测试

```bash
# 运行所有端到端测试
pnpm test:e2e

# 运行特定测试套件
pnpm test:e2e:auth
pnpm test:e2e:business
pnpm test:e2e:integration

# 运行测试并生成报告
pnpm test:e2e:report
```

## 测试数据管理

测试使用独立的测试数据库，每次测试前会自动重置数据。测试数据通过fixtures目录中的JSON文件管理。

## 环境要求

- Node.js 18+
- pnpm 8+
- 所有服务正常运行
- 测试数据库已初始化