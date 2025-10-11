# AFA办公小程序后端服务

AFA办公小程序的后端API服务，使用TypeScript + Express.js + SQLite构建。

## 技术栈

- **运行时**: Node.js 18+
- **框架**: Express.js
- **语言**: TypeScript
- **数据库**: SQLite (开发环境) / MySQL (测试环境)
- **认证**: JWT + 微信OAuth
- **测试**: Vitest + Supertest + MySQL测试框架
- **代码质量**: ESLint + Prettier

## 项目结构

```
backend/
├── src/                        # 源代码
│   ├── app.ts                  # 应用入口文件
│   ├── types/                  # TypeScript类型定义
│   ├── config/                 # 配置文件
│   ├── middleware/             # 中间件
│   ├── routes/                 # 路由定义
│   ├── controllers/            # 控制器层
│   ├── services/               # 业务逻辑层
│   ├── models/                 # 数据模型层
│   └── utils/                  # 工具函数
├── database/                   # 数据库相关
│   ├── schema.sql              # 数据库架构
│   ├── init.ts                 # 数据库初始化
│   ├── migrate.ts              # 数据库迁移
│   ├── reset.ts                # 数据库重置
│   └── seeds/                  # 种子数据
├── tests/                      # 测试文件
│   ├── setup.ts                # 测试环境设置
│   ├── unit/                   # 单元测试
│   └── integration/            # 集成测试
└── dist/                       # 编译输出目录
```

## 快速开始

### 环境要求

- Node.js 18.0.0 或更高版本
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 环境配置

复制环境变量模板文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要的环境变量。

#### MySQL测试环境配置（可选）

如需使用MySQL作为测试数据库，请在 `.env` 文件中添加以下配置：

```bash
# MySQL测试数据库配置
TEST_DB_TYPE=mysql
TEST_DB_HOST=127.0.0.1
TEST_DB_PORT=3306
TEST_DB_USER=root
TEST_DB_PASSWORD=your-password
TEST_DB_CONNECTION_LIMIT=10
TEST_DB_ACQUIRE_TIMEOUT=60000
TEST_DB_TIMEOUT=60000
```

**注意**: 如未配置MySQL，系统将自动使用SQLite作为测试数据库。

### 数据库初始化

```bash
npm run db:init
```

### 开发模式启动

```bash
npm run dev
```

服务将在 http://localhost:3000 启动。

## 可用脚本

### 开发相关

- `npm run dev` - 开发模式启动（热重载）
- `npm run build` - 编译TypeScript代码
- `npm start` - 生产模式启动

### 测试相关

- `npm test` - 运行所有测试
- `npm run test:watch` - 监听模式运行测试
- `npm run test:coverage` - 运行测试并生成覆盖率报告
- `npm run test:mysql` - 运行MySQL适配器测试
- `npm run test:mysql-config` - 运行MySQL配置管理测试
- `npm run test:mysql-tools` - 运行MySQL测试工具测试

### 代码质量

- `npm run lint` - 运行ESLint检查
- `npm run lint:fix` - 自动修复ESLint问题
- `npm run format` - 格式化代码
- `npm run type-check` - TypeScript类型检查

### 数据库操作

- `npm run db:init` - 初始化数据库
- `npm run db:migrate` - 运行数据库迁移
- `npm run db:reset` - 重置数据库

## API文档

### 健康检查

```
GET /health
```

返回服务状态信息。

### API版本

```
GET /api
GET /api/v1
```

返回API版本信息和可用端点。

## 数据库架构

系统使用SQLite数据库，包含以下主要表：

- `users` - 用户表
- `merchants` - 商户表
- `projects` - 项目表
- `venues` - 场地表
- `floors` - 楼层表
- `permissions` - 权限表
- `visitor_applications` - 访客申请表
- `passcodes` - 通行码表
- `access_records` - 通行记录表

详细的数据库架构请参考 `database/schema.sql` 文件。

## 中间件

### 错误处理中间件

- 统一的错误响应格式
- 错误代码分类管理
- 开发环境堆栈跟踪
- 敏感信息过滤

### 日志中间件

- 请求/响应日志记录
- 敏感数据自动脱敏
- 响应时间统计
- 开发环境详细日志

### 安全中间件

- Helmet安全头设置
- CORS跨域配置
- 请求体大小限制

## 测试

项目使用Vitest作为测试框架，支持SQLite和MySQL双数据库测试环境：

- **单元测试**：测试独立的函数和类
- **集成测试**：测试API端点和数据库交互
- **MySQL测试框架**：支持MySQL数据库的隔离测试环境
- **测试覆盖率**：要求80%以上的代码覆盖率

### 基础测试命令

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### MySQL测试环境

项目提供了完整的MySQL测试框架，解决SQLite在Windows环境下的文件锁定问题：

```bash
# 运行MySQL适配器测试
npm run test:mysql

# 运行MySQL配置管理测试
npm run test:mysql-config

# 运行MySQL测试工具测试
npm run test:mysql-tools
```

#### 快速开始MySQL测试

1. **配置环境变量**：
   ```bash
   # 在 .env 文件中添加
   TEST_DB_TYPE=mysql
   TEST_DB_HOST=127.0.0.1
   TEST_DB_PORT=3306
   TEST_DB_USER=root
   TEST_DB_PASSWORD=your-password
   ```

2. **运行测试**：
   ```bash
   npm test
   ```

系统会自动检测配置并使用MySQL作为测试数据库。如果MySQL不可用，会自动回退到SQLite。

详细的MySQL测试框架使用指南请参考：[docs/mysql-test-framework.md](docs/mysql-test-framework.md)

## 部署

### 构建生产版本

```bash
npm run build
```

### 环境变量

#### 基础环境变量

生产环境需要配置以下环境变量：

- `NODE_ENV=production`
- `PORT` - 服务端口
- `DB_PATH` - 数据库文件路径
- `JWT_SECRET` - JWT密钥
- `WECHAT_APP_ID` - 微信小程序AppID
- `WECHAT_APP_SECRET` - 微信小程序AppSecret

#### MySQL测试环境变量

如需使用MySQL测试环境，请配置：

- `TEST_DB_TYPE=mysql` - 启用MySQL测试环境
- `TEST_DB_HOST` - MySQL服务器地址（默认：127.0.0.1）
- `TEST_DB_PORT` - MySQL服务器端口（默认：3306）
- `TEST_DB_USER` - MySQL用户名（默认：root）
- `TEST_DB_PASSWORD` - MySQL密码
- `TEST_DB_CONNECTION_LIMIT` - 连接池大小（默认：10）
- `TEST_DB_ACQUIRE_TIMEOUT` - 获取连接超时时间（默认：60000ms）
- `TEST_DB_TIMEOUT` - 查询超时时间（默认：60000ms）

### Docker部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
COPY database ./database
EXPOSE 3000
CMD ["npm", "start"]
```

## 开发规范

### 代码风格

- 使用TypeScript严格模式
- 遵循ESLint规则
- 使用Prettier格式化代码
- 中文注释说明业务逻辑

### 提交规范

- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 代码重构
- test: 测试相关
- chore: 构建工具或辅助工具的变动

### 分支管理

- `main` - 主分支，用于生产环境
- `develop` - 开发分支
- `feature/*` - 功能分支
- `fix/*` - 修复分支

## 许可证

MIT License

## 联系方式

如有问题，请联系开发团队。