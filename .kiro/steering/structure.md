# 项目组织结构

## 总体目录结构

```
afa-office-system/
├── backend/                    # 后端API服务
├── frontend/                   # 前端管理后台
├── miniprogram/                # 微信小程序
└── docs/                       # 项目文档
```

## 后端目录结构

```
backend/
├── src/
│   ├── controllers/            # 控制器层 - 处理HTTP请求
│   ├── services/               # 业务逻辑层 - 核心业务逻辑
│   ├── models/                 # 数据模型层 - 数据库操作
│   ├── middleware/             # 中间件 - 认证、权限、验证等
│   ├── routes/                 # 路由定义 - 按版本组织
│   │   └── v1/                 # v1版本路由
│   ├── utils/                  # 工具函数 - 通用工具
│   └── config/                 # 配置文件 - 环境配置
├── tests/                      # 测试文件
│   ├── unit/                   # 单元测试
│   │   ├── controllers/        # 控制器单元测试
│   │   ├── services/           # 服务层单元测试
│   │   ├── models/             # 模型层单元测试
│   │   └── utils/              # 工具函数单元测试
│   ├── integration/            # 集成测试
│   │   ├── api/                # API集成测试
│   │   ├── database/           # 数据库集成测试
│   │   └── auth/               # 认证集成测试
│   ├── e2e/                    # 端到端测试
│   ├── fixtures/               # 测试数据
│   │   ├── users.json          # 用户测试数据
│   │   ├── merchants.json      # 商户测试数据
│   │   └── visitors.json       # 访客测试数据
│   └── helpers/                # 测试辅助工具
│       ├── setup.js            # 测试环境设置
│       ├── teardown.js         # 测试清理
│       └── mock-data.js        # 模拟数据生成
└── database/                   # 数据库相关
    ├── migrations/             # 数据库迁移文件
    └── seeds/                  # 初始数据
```

## 前端目录结构

```
frontend/
├── tenant-admin/               # 租务管理端
│   ├── src/
│   │   ├── components/         # 可复用组件
│   │   ├── pages/              # 页面组件
│   │   ├── services/           # API服务
│   │   ├── hooks/              # 自定义Hooks
│   │   ├── utils/              # 工具函数
│   │   └── styles/             # 样式文件
│   ├── tests/                  # 前端测试
│   │   ├── unit/               # 组件单元测试
│   │   ├── integration/        # 页面集成测试
│   │   ├── e2e/                # 端到端测试
│   │   └── __mocks__/          # 模拟数据
│   └── public/                 # 静态资源
└── merchant-admin/             # 商户管理端
    ├── src/                    # 同租务管理端结构
    └── tests/                  # 测试文件结构同上
```

## 小程序目录结构

```
miniprogram/
├── pages/                      # 页面文件
│   ├── index/                  # 首页
│   ├── login/                  # 登录页
│   ├── visitor/                # 访客相关页面
│   └── employee/               # 员工相关页面
├── components/                 # 自定义组件
├── utils/                      # 工具函数
├── services/                   # API服务
├── tests/                      # 小程序测试
│   ├── unit/                   # 单元测试
│   ├── integration/            # 集成测试
│   └── fixtures/               # 测试数据
└── styles/                     # 全局样式
```

## 文件命名规范

- **文件名**: 使用kebab-case (`user-service.js`, `auth-controller.js`)
- **测试文件**: 后缀 `.test.js` 或 `.spec.js`
- **配置文件**: 后缀 `.config.js`
- **组件文件**: PascalCase (`UserProfile.jsx`)

## 测试目录规范

- **单元测试**: 测试单个函数或组件的功能
- **集成测试**: 测试多个模块间的交互
- **端到端测试**: 测试完整的用户流程
- **测试数据**: 使用fixtures目录存放测试用的静态数据
- **测试辅助**: helpers目录存放测试工具和配置

## 模块组织原则

- **按功能模块组织**: 相关功能的文件放在同一目录
- **分层架构**: 严格按照Controller -> Service -> Model的分层结构
- **单一职责**: 每个文件和模块只负责一个明确的功能
- **依赖管理**: 避免循环依赖，保持清晰的依赖关系

## 配置文件位置

- **环境配置**: `backend/src/config/`
- **数据库配置**: `backend/database/config.js`
- **构建配置**: 各模块根目录的配置文件
- **IDE配置**: `.kiro/` 目录下的项目配置