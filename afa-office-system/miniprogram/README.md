# AFA办公小程序

智能办公空间通行管理系统的微信小程序端。

## 功能特性

### 访客功能
- 📝 **访客预约申请** - 便捷的访客预约申请流程
- 📱 **通行码展示** - 实时更新的访客通行二维码
- 📊 **申请状态查询** - 查看申请进度和审批结果
- 📋 **访问记录** - 查看历史访问记录

### 员工功能
- 👤 **员工申请** - 新员工申请加入商户流程
- 🎫 **员工通行码** - 长期有效的员工通行凭证
- ✅ **访客审批** - 审批访问本商户的访客申请
- 🔄 **自动刷新** - 通行码每30秒自动刷新

### 通用功能
- 🔐 **微信授权登录** - 安全便捷的微信登录
- 🏢 **商户选择** - 支持多商户环境
- 📱 **响应式设计** - 适配不同屏幕尺寸
- 🔔 **实时通知** - 申请状态变更通知

## 技术栈

- **开发语言**: TypeScript
- **小程序框架**: 微信原生小程序
- **UI组件**: 微信官方组件 + 自定义组件
- **状态管理**: 小程序原生状态管理
- **网络请求**: wx.request API
- **测试框架**: Vitest + jsdom

## 项目结构

```
miniprogram/
├── pages/                      # 页面文件
│   ├── index/                  # 首页
│   ├── login/                  # 登录页
│   ├── visitor/                # 访客相关页面
│   │   ├── apply/              # 访客申请
│   │   ├── passcode/           # 访客通行码
│   │   └── status/             # 申请状态
│   └── employee/               # 员工相关页面
│       ├── apply/              # 员工申请
│       ├── passcode/           # 员工通行码
│       └── approve/            # 访客审批
├── services/                   # API服务层
│   ├── api.ts                  # 基础API服务
│   ├── visitor.ts              # 访客服务
│   └── employee.ts             # 员工服务
├── types/                      # TypeScript类型定义
│   └── api.ts                  # API相关类型
├── utils/                      # 工具函数
├── components/                 # 自定义组件
├── tests/                      # 测试文件
│   ├── unit/                   # 单元测试
│   ├── integration/            # 集成测试
│   └── e2e/                    # 端到端测试
├── app.ts                      # 小程序入口
├── app.json                    # 小程序配置
└── tsconfig.json               # TypeScript配置
```

## 开发指南

### 环境要求

- Node.js >= 16.0.0
- 微信开发者工具
- 小程序开发权限

### 开发流程

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd afa-office-system/miniprogram
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **开发调试**
   - 使用微信开发者工具打开 `miniprogram` 目录
   - 配置小程序 AppID
   - 启动调试模式

4. **代码检查**
   ```bash
   # 类型检查
   pnpm type-check
   
   # 代码规范检查
   pnpm lint
   
   # 自动修复代码规范问题
   pnpm lint:fix
   ```

### 测试

```bash
# 运行所有测试
pnpm test

# 监听模式运行测试
pnpm test:watch

# 生成测试覆盖率报告
pnpm test:coverage

# 启动测试UI界面
pnpm test:ui
```

### API配置

在 `app.ts` 中配置后端API地址：

```typescript
globalData: {
  apiBase: 'http://localhost:3000', // 开发环境
  // apiBase: 'https://api.afa-office.com', // 生产环境
}
```

## 页面说明

### 首页 (pages/index)
- 显示用户信息和身份状态
- 提供功能入口导航
- 支持访客和员工身份切换

### 登录页 (pages/login)
- 微信授权登录
- 新用户身份类型选择
- 隐私政策和服务条款

### 访客申请 (pages/visitor/apply)
- 访客信息填写表单
- 商户选择和预约时间
- 表单验证和提交

### 访客通行码 (pages/visitor/passcode)
- 实时通行码展示
- 二维码生成和刷新
- 使用说明和状态显示

### 员工申请 (pages/employee/apply)
- 员工基本信息填写
- 商户选择和职位信息
- 申请状态跟踪

### 员工通行码 (pages/employee/passcode)
- 长期有效通行码
- 自动刷新机制
- 快捷功能入口

### 访客审批 (pages/employee/approve)
- 待审批申请列表
- 审批操作和理由填写
- 申请状态筛选

## API接口

### 认证相关
- `POST /api/v1/auth/wechat-login` - 微信登录
- `POST /api/v1/auth/validate` - 验证token

### 访客相关
- `GET /api/v1/visitor/merchants` - 获取商户列表
- `POST /api/v1/visitor/apply` - 提交访客申请
- `GET /api/v1/visitor/applications` - 获取我的申请
- `GET /api/v1/visitor/passcode/:id` - 获取通行码

### 员工相关
- `POST /api/v1/employee/apply` - 提交员工申请
- `GET /api/v1/employee/application` - 获取我的申请
- `GET /api/v1/employee/passcode` - 获取员工通行码
- `GET /api/v1/employee/visitor-applications/pending` - 获取待审批申请
- `PUT /api/v1/employee/visitor-applications/:id/approve` - 审批访客申请

## 测试策略

### 单元测试
- 服务层函数测试
- 工具函数测试
- 数据验证测试

### 集成测试
- 完整业务流程测试
- API接口集成测试
- 错误处理测试

### 端到端测试
- 用户操作流程测试
- 页面交互测试
- 通行码展示测试

## 部署说明

### 开发环境
1. 配置开发环境API地址
2. 使用微信开发者工具预览
3. 真机调试测试

### 生产环境
1. 更新生产环境API地址
2. 代码审核和测试
3. 提交微信审核
4. 发布上线

## 注意事项

### 权限配置
- 需要配置网络请求域名
- 需要用户授权获取微信信息
- 需要配置业务域名

### 性能优化
- 图片资源压缩
- 代码分包加载
- 接口请求优化
- 缓存策略

### 安全考虑
- Token安全存储
- 敏感信息加密
- 接口权限验证
- 用户数据保护

## 常见问题

### Q: 如何调试网络请求？
A: 在微信开发者工具中开启"不校验合法域名"选项，查看Network面板。

### Q: 如何处理登录失效？
A: 监听401状态码，自动清除本地token并跳转到登录页。

### Q: 如何优化小程序性能？
A: 使用分包加载、图片懒加载、合理使用setData等。

### Q: 如何测试真机效果？
A: 使用微信开发者工具的真机调试功能或生成体验版二维码。

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交代码变更
4. 创建 Pull Request
5. 代码审查和合并

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。