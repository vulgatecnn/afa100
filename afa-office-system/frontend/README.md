# AFA办公小程序前端管理后台

本项目包含两个前端管理后台应用：

- **tenant-admin**: 租务管理系统
- **merchant-admin**: 商户管理系统

## 技术栈

- **框架**: React 18 + TypeScript
- **UI库**: Ant Design 5.x
- **路由**: React Router v6
- **HTTP客户端**: Axios
- **构建工具**: Vite
- **测试框架**: Vitest + Playwright
- **代码质量**: ESLint + Prettier

## 项目结构

```
frontend/
├── tenant-admin/           # 租务管理端
│   ├── src/
│   │   ├── components/     # 通用组件
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API服务
│   │   ├── contexts/       # React Context
│   │   ├── hooks/          # 自定义Hooks
│   │   └── test/           # 测试配置
│   ├── tests/
│   │   └── e2e/            # E2E测试
│   └── playwright.config.ts
├── merchant-admin/         # 商户管理端
│   ├── src/                # 同租务管理端结构
│   ├── tests/
│   │   └── e2e/            # E2E测试
│   └── playwright.config.ts
└── README.md
```

## 开发环境设置

### 前置要求

- Node.js 18+
- pnpm 8.0+

### 安装依赖

```bash
# 在项目根目录
pnpm install

# 或者分别在各个子项目中安装
cd frontend/tenant-admin && pnpm install
cd frontend/merchant-admin && pnpm install
```

### 启动开发服务器

```bash
# 租务管理端 (端口 3001)
cd frontend/tenant-admin
pnpm dev

# 商户管理端 (端口 3002)
cd frontend/merchant-admin
pnpm dev
```

## 测试

### 单元测试

使用 Vitest 进行单元测试：

```bash
# 运行单元测试
pnpm test

# 监听模式
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage
```

### E2E测试

使用 Playwright 进行端到端测试：

```bash
# 安装 Playwright 浏览器
npx playwright install

# 运行 E2E 测试
pnpm test:e2e

# 使用 UI 模式运行测试
pnpm test:e2e:ui

# 有头模式运行测试（可见浏览器）
pnpm test:e2e:headed
```

### 测试覆盖范围

#### 租务管理端测试

- **登录功能**
  - 表单验证
  - 登录成功/失败处理
  - 页面跳转

- **商户管理**
  - 商户列表展示
  - 搜索和筛选
  - 新增/编辑/删除商户
  - 权限分配
  - 响应式设计

- **空间管理**
  - 树形结构展示
  - 新增/编辑/删除空间
  - 状态切换
  - 右键菜单操作

#### 商户管理端测试

- **员工管理**
  - 员工列表展示
  - 搜索和筛选
  - 新增/编辑/删除员工
  - 批量导入
  - 权限设置

- **访客管理**
  - 访客申请列表
  - 审批流程
  - 批量操作
  - 详情查看
  - 数据导出

## 构建和部署

### 构建生产版本

```bash
# 构建租务管理端
cd frontend/tenant-admin
pnpm build

# 构建商户管理端
cd frontend/merchant-admin
pnpm build
```

### 预览构建结果

```bash
pnpm preview
```

## API集成

### 环境配置

两个前端应用都配置了代理，将 `/api` 请求转发到后端服务：

- 租务管理端: `http://localhost:3001` → `http://localhost:3000/api`
- 商户管理端: `http://localhost:3002` → `http://localhost:3000/api`

### 认证机制

- 使用 JWT Token 进行身份验证
- Token 存储在 localStorage 中
- 请求拦截器自动添加 Authorization 头
- 响应拦截器处理 401 错误并自动跳转登录

### 错误处理

- 统一的错误响应格式
- 自动显示错误消息
- 网络错误处理
- 业务错误处理

## 响应式设计

两个应用都实现了响应式设计：

- **桌面端**: 完整功能展示
- **平板端**: 适配中等屏幕
- **移动端**: 
  - 侧边栏自动收起
  - 表格支持水平滚动
  - 操作按钮优化布局

### 断点设置

- `xs`: < 576px (手机)
- `sm`: ≥ 576px (大手机)
- `md`: ≥ 768px (平板)
- `lg`: ≥ 992px (小桌面)
- `xl`: ≥ 1200px (大桌面)

## 性能优化

### 代码分割

- 路由级别的代码分割
- 组件懒加载
- 第三方库按需引入

### 缓存策略

- HTTP 缓存配置
- 静态资源版本控制
- API 响应缓存

### 打包优化

- Tree shaking
- 代码压缩
- 资源优化

## 开发规范

### 代码风格

- 使用 TypeScript 严格模式
- ESLint + Prettier 代码格式化
- 统一的命名规范
- 组件和函数注释

### 组件规范

- 函数式组件 + Hooks
- Props 类型定义
- 默认值设置
- 错误边界处理

### 状态管理

- React Context 用于全局状态
- useState/useReducer 用于局部状态
- 自定义 Hooks 封装逻辑

## 故障排除

### 常见问题

1. **端口冲突**
   - 修改 vite.config.ts 中的端口配置

2. **API 请求失败**
   - 检查后端服务是否启动
   - 验证代理配置是否正确

3. **测试失败**
   - 确保测试数据 Mock 正确
   - 检查异步操作的等待时间

4. **构建失败**
   - 检查 TypeScript 类型错误
   - 验证依赖版本兼容性

### 调试技巧

- 使用 React Developer Tools
- 利用 Vite 的 HMR 功能
- 使用 Playwright 的调试模式
- 查看 Network 面板的 API 请求

## 贡献指南

1. 遵循现有的代码风格
2. 编写相应的测试用例
3. 更新相关文档
4. 提交前运行所有测试

## 许可证

本项目采用 MIT 许可证。