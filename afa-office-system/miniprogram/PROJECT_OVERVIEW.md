# AFA办公小程序 - 项目介绍文档

## 📋 项目概述

**AFA办公小程序**是一个基于微信小程序的智能办公空间通行管理系统，旨在为现代办公场所提供高效、安全的访客管理和员工通行解决方案。系统通过微信小程序实现访客预约、员工申请、通行码管理和访客审批等核心功能。

### 核心价值

- **🚀 提升效率** - 简化访客预约流程，减少前台接待压力
- **🔒 安全可靠** - 基于微信授权的安全登录，实时更新的动态通行码
- **📱 便捷易用** - 无需安装APP，微信扫码即可使用
- **👥 多角色支持** - 同时满足访客、员工、管理员的不同需求
- **📊 数据追踪** - 完整的访问记录和审批流程追溯

---

## 🎯 功能模块

### 1. 访客管理模块

#### 1.1 访客预约申请
- **功能描述**: 访客可以提前预约访问，填写个人信息和访问目的
- **业务流程**:
  1. 访客填写基本信息（姓名、手机号、身份证号）
  2. 选择要访问的商户和预约时间
  3. 填写访问事由
  4. 提交申请等待审批
- **技术实现**: 表单验证 + API提交 + 状态管理
- **相关页面**: `pages/visitor/apply/`

#### 1.2 访客通行码
- **功能描述**: 审批通过后生成动态二维码通行凭证
- **核心特性**:
  - 实时生成二维码
  - 每30秒自动刷新
  - 显示有效期和使用说明
  - 支持截图保存
- **技术实现**: Canvas绘制二维码 + 定时器刷新
- **相关页面**: `pages/visitor/passcode/`

#### 1.3 申请状态查询
- **功能描述**: 查看所有申请的状态和历史记录
- **状态类型**:
  - 待审批 (pending)
  - 已通过 (approved)
  - 已拒绝 (rejected)
  - 已过期 (expired)
- **相关页面**: `pages/visitor/status/`

### 2. 员工管理模块

#### 2.1 员工申请
- **功能描述**: 新员工申请加入商户
- **申请流程**:
  1. 填写个人基本信息
  2. 选择所属商户
  3. 填写职位和部门信息
  4. 提交申请等待管理员审核
- **相关页面**: `pages/employee/apply/`

#### 2.2 员工通行码
- **功能描述**: 员工长期有效的通行凭证
- **特点**:
  - 长期有效（与员工身份绑定）
  - 自动刷新机制
  - 快捷功能入口（审批、记录查询）
- **相关页面**: `pages/employee/passcode/`

#### 2.3 访客审批
- **功能描述**: 员工审批访问本商户的访客申请
- **审批功能**:
  - 查看待审批申请列表
  - 查看申请详细信息
  - 通过/拒绝操作
  - 填写审批意见
- **相关页面**: `pages/employee/approve/`

### 3. 通用功能模块

#### 3.1 用户认证
- 微信授权登录
- Token管理和自动刷新
- 登录状态持久化

#### 3.2 首页导航
- 用户信息展示
- 身份状态显示
- 功能入口导航
- 快捷操作

---

## 🏗️ 技术架构

### 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| TypeScript | 5.0+ | 开发语言 |
| 微信小程序 | 原生 | 小程序框架 |
| Vitest | 1.0+ | 测试框架 |
| ESLint | 8.0+ | 代码规范 |
| Prettier | 3.0+ | 代码格式化 |

### 项目结构

```
miniprogram/
├── pages/                          # 页面目录
│   ├── index/                      # 首页
│   │   ├── index.ts               # 页面逻辑
│   │   ├── index.wxml             # 页面结构
│   │   ├── index.wxss             # 页面样式
│   │   └── index.json             # 页面配置
│   ├── login/                      # 登录页
│   ├── visitor/                    # 访客功能
│   │   ├── apply/                 # 访客申请
│   │   ├── passcode/              # 访客通行码
│   │   └── status/                # 申请状态
│   └── employee/                   # 员工功能
│       ├── apply/                 # 员工申请
│       ├── passcode/              # 员工通行码
│       └── approve/               # 访客审批
│
├── services/                       # 服务层
│   ├── api.ts                     # 基础API服务
│   ├── visitor.ts                 # 访客服务
│   ├── employee.ts                # 员工服务
│   └── notification.ts            # 通知服务
│
├── utils/                          # 工具函数
│   ├── request.ts                 # 网络请求封装
│   ├── storage.ts                 # 本地存储封装
│   └── validator.ts               # 表单验证
│
├── types/                          # 类型定义
│   └── api.ts                     # API类型定义
│
├── tests/                          # 测试文件
│   ├── unit/                      # 单元测试
│   │   ├── services/              # 服务层测试
│   │   ├── utils/                 # 工具函数测试
│   │   └── components/            # 组件测试
│   ├── integration/               # 集成测试
│   └── e2e/                       # 端到端测试
│
├── app.ts                          # 小程序入口
├── app.json                        # 小程序配置
├── app.wxss                        # 全局样式
├── tsconfig.json                   # TypeScript配置
├── vitest.config.ts                # Vitest配置
└── package.json                    # 项目配置
```

### 架构设计

#### 分层架构

```
┌─────────────────────────────────────┐
│         Presentation Layer          │  页面层
│    (Pages + Components + WXML)      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│         Business Logic Layer        │  业务逻辑层
│         (Services + Utils)          │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│         Data Access Layer           │  数据访问层
│      (API + Storage + Cache)        │
└─────────────────────────────────────┘
```

#### 数据流

```
User Action → Page Event Handler → Service Layer → API Request
                                         ↓
                                    Response
                                         ↓
                                   Data Processing
                                         ↓
                                    setData()
                                         ↓
                                   View Update
```

---

## 📊 测试体系

### 测试覆盖

项目采用完整的测试策略，确保代码质量和功能稳定性：

#### 单元测试 (Unit Tests)
- **覆盖范围**: 服务层、工具函数、组件逻辑
- **测试框架**: Vitest
- **测试文件**: `tests/unit/**/*.test.ts`
- **当前状态**: 424个测试用例通过

#### 集成测试 (Integration Tests)
- **覆盖范围**: API集成、业务流程、错误处理
- **测试重点**: 
  - 完整的用户操作流程
  - 多模块协作场景
  - 异常情况处理

#### 端到端测试 (E2E Tests)
- **覆盖范围**: 完整用户场景
- **测试场景**:
  - 访客预约到通行全流程
  - 员工审批流程
  - 通行码生成和刷新

### 测试命令

```bash
# 运行所有测试
npm test

# 监听模式（开发时使用）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 启动测试UI界面
npm run test:ui
```

---

## 🔌 API接口文档

### 基础配置

- **Base URL**: `http://localhost:3000/api/v1` (开发环境)
- **认证方式**: Bearer Token (Header: `Authorization: Bearer <token>`)
- **数据格式**: JSON

### 接口列表

#### 认证相关

##### 1. 微信登录
```
POST /auth/wechat-login
Content-Type: application/json

Request:
{
  "code": "微信登录code",
  "userInfo": {
    "nickName": "用户昵称",
    "avatarUrl": "头像URL"
  }
}

Response:
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "userType": "visitor|employee",
    "userId": "user-id"
  }
}
```

##### 2. Token验证
```
POST /auth/validate
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "valid": true,
    "userType": "visitor|employee"
  }
}
```

#### 访客相关

##### 3. 获取商户列表
```
GET /visitor/merchants

Response:
{
  "success": true,
  "data": [
    {
      "id": "merchant-id",
      "name": "商户名称",
      "address": "商户地址"
    }
  ]
}
```

##### 4. 提交访客申请
```
POST /visitor/apply
Content-Type: application/json

Request:
{
  "name": "访客姓名",
  "phone": "手机号",
  "idCard": "身份证号",
  "merchantId": "商户ID",
  "visitDate": "2024-01-01",
  "visitTime": "14:00",
  "purpose": "访问事由"
}

Response:
{
  "success": true,
  "data": {
    "applicationId": "application-id",
    "status": "pending"
  }
}
```

##### 5. 获取我的申请
```
GET /visitor/applications

Response:
{
  "success": true,
  "data": [
    {
      "id": "application-id",
      "merchantName": "商户名称",
      "visitDate": "2024-01-01",
      "status": "pending|approved|rejected",
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ]
}
```

##### 6. 获取通行码
```
GET /visitor/passcode/:applicationId

Response:
{
  "success": true,
  "data": {
    "passcode": "qrcode-data",
    "validUntil": "2024-01-01T18:00:00Z",
    "refreshToken": "refresh-token"
  }
}
```

#### 员工相关

##### 7. 提交员工申请
```
POST /employee/apply
Content-Type: application/json

Request:
{
  "name": "员工姓名",
  "phone": "手机号",
  "idCard": "身份证号",
  "merchantId": "商户ID",
  "position": "职位",
  "department": "部门"
}

Response:
{
  "success": true,
  "data": {
    "applicationId": "application-id",
    "status": "pending"
  }
}
```

##### 8. 获取员工通行码
```
GET /employee/passcode

Response:
{
  "success": true,
  "data": {
    "passcode": "qrcode-data",
    "employeeId": "employee-id",
    "merchantName": "商户名称"
  }
}
```

##### 9. 获取待审批申请
```
GET /employee/visitor-applications/pending

Response:
{
  "success": true,
  "data": [
    {
      "id": "application-id",
      "visitorName": "访客姓名",
      "visitDate": "2024-01-01",
      "purpose": "访问事由",
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ]
}
```

##### 10. 审批访客申请
```
PUT /employee/visitor-applications/:id/approve
Content-Type: application/json

Request:
{
  "approved": true,
  "comment": "审批意见"
}

Response:
{
  "success": true,
  "data": {
    "status": "approved|rejected"
  }
}
```

---

## 🚀 开发指南

### 环境准备

#### 必需工具
- **Node.js**: >= 16.0.0
- **微信开发者工具**: 最新稳定版
- **包管理器**: npm/pnpm/yarn

#### 开发环境配置

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd afa-office-system/miniprogram
   ```

2. **安装依赖**
   ```bash
   npm install
   # 或
   pnpm install
   ```

3. **配置API地址**
   
   编辑 `app.ts` 文件：
   ```typescript
   App({
     globalData: {
       apiBase: 'http://localhost:3000',  // 开发环境
       userInfo: null,
       isLoggedIn: false,
       userType: null
     }
   })
   ```

4. **启动开发**
   - 打开微信开发者工具
   - 导入项目（选择 `miniprogram` 目录）
   - 配置小程序 AppID
   - 开始开发调试

### 开发规范

#### 代码规范

1. **TypeScript规范**
   - 使用严格模式
   - 明确定义类型
   - 避免使用 `any`

2. **命名规范**
   - 文件名：kebab-case（如：`visitor-apply.ts`）
   - 变量名：camelCase（如：`userName`）
   - 常量名：UPPER_SNAKE_CASE（如：`API_BASE_URL`）
   - 类型名：PascalCase（如：`UserInfo`）

3. **注释规范**
   ```typescript
   /**
    * 提交访客申请
    * @param data 申请数据
    * @returns Promise<ApplicationResult>
    */
   async function submitApplication(data: ApplicationData) {
     // 实现代码
   }
   ```

#### Git提交规范

使用语义化提交信息：

```
feat: 添加访客审批功能
fix: 修复通行码刷新问题
docs: 更新API文档
style: 优化页面样式
refactor: 重构服务层代码
test: 添加单元测试
chore: 更新依赖包
```

### 调试技巧

#### 1. 网络请求调试
```typescript
// 在 services/api.ts 中启用调试日志
const DEBUG = true;

if (DEBUG) {
  console.log('Request:', url, options);
  console.log('Response:', response);
}
```

#### 2. 真机调试
- 使用微信开发者工具的"真机调试"功能
- 或生成体验版二维码进行测试

#### 3. 性能监控
```typescript
// 监控页面性能
Page({
  onLoad() {
    const startTime = Date.now();
    // 页面逻辑
    console.log('Page load time:', Date.now() - startTime);
  }
})
```

---

## 📦 部署流程

### 开发环境部署

1. **配置开发环境API**
   ```typescript
   apiBase: 'http://localhost:3000'
   ```

2. **微信开发者工具预览**
   - 点击"预览"按钮
   - 扫码在手机上查看

### 测试环境部署

1. **配置测试环境API**
   ```typescript
   apiBase: 'https://test-api.afa-office.com'
   ```

2. **生成体验版**
   - 点击"上传"按钮
   - 在微信公众平台生成体验版二维码

### 生产环境部署

1. **代码审查**
   - 运行所有测试
   - 代码质量检查
   - 性能优化确认

2. **配置生产环境**
   ```typescript
   apiBase: 'https://api.afa-office.com'
   ```

3. **提交审核**
   - 在微信公众平台提交审核
   - 填写审核说明
   - 等待审核通过

4. **发布上线**
   - 审核通过后点击"发布"
   - 设置版本号和更新说明
   - 监控线上运行状态

---

## 🔒 安全考虑

### 数据安全

1. **敏感信息加密**
   - Token使用加密存储
   - 身份证号等敏感信息脱敏显示

2. **HTTPS通信**
   - 所有API请求使用HTTPS
   - 配置SSL证书

3. **Token管理**
   ```typescript
   // Token自动刷新
   if (isTokenExpired()) {
     await refreshToken();
   }
   ```

### 权限控制

1. **页面访问控制**
   ```typescript
   // 检查登录状态
   if (!app.globalData.isLoggedIn) {
     wx.redirectTo({ url: '/pages/login/login' });
   }
   ```

2. **API权限验证**
   - 每个请求携带Token
   - 后端验证用户权限

### 隐私保护

1. **用户授权**
   - 明确告知用户数据用途
   - 获取必要的授权

2. **数据最小化**
   - 只收集必要的用户信息
   - 定期清理过期数据

---

## 🎨 UI/UX设计

### 设计原则

1. **简洁明了** - 界面简洁，操作直观
2. **一致性** - 保持视觉和交互的一致性
3. **反馈及时** - 操作后立即给予反馈
4. **容错性** - 提供清晰的错误提示和恢复方式

### 色彩规范

```css
/* 主色调 */
--primary-color: #1890ff;      /* 品牌蓝 */
--success-color: #52c41a;      /* 成功绿 */
--warning-color: #faad14;      /* 警告橙 */
--error-color: #f5222d;        /* 错误红 */

/* 中性色 */
--text-primary: #262626;       /* 主要文字 */
--text-secondary: #8c8c8c;     /* 次要文字 */
--border-color: #d9d9d9;       /* 边框色 */
--background-color: #f5f5f5;   /* 背景色 */
```

### 组件规范

- **按钮**: 主按钮使用品牌色，次要按钮使用灰色
- **表单**: 统一的输入框样式和验证提示
- **卡片**: 使用阴影和圆角提升层次感
- **状态徽章**: 不同状态使用不同颜色标识

---

## 📈 性能优化

### 优化策略

1. **代码优化**
   - 使用分包加载减少首屏加载时间
   - 按需加载组件和页面

2. **图片优化**
   - 压缩图片资源
   - 使用WebP格式
   - 实现图片懒加载

3. **网络优化**
   - 接口请求合并
   - 数据缓存策略
   - 请求失败重试机制

4. **渲染优化**
   - 减少setData调用频率
   - 避免频繁的DOM操作
   - 使用虚拟列表处理长列表

### 性能监控

```typescript
// 页面性能监控
Page({
  onLoad() {
    wx.reportAnalytics('page_load', {
      page: 'visitor-apply',
      loadTime: Date.now() - startTime
    });
  }
})
```

---

## 🐛 常见问题

### Q1: 如何调试网络请求？
**A**: 在微信开发者工具中：
1. 打开"详情" → "本地设置"
2. 勾选"不校验合法域名、web-view（业务域名）、TLS版本以及HTTPS证书"
3. 在Network面板查看请求详情

### Q2: 登录失效如何处理？
**A**: 系统会自动处理：
```typescript
// 401状态码自动跳转登录
if (statusCode === 401) {
  wx.removeStorageSync('token');
  wx.redirectTo({ url: '/pages/login/login' });
}
```

### Q3: 如何优化小程序性能？
**A**: 
- 使用分包加载
- 图片懒加载
- 合理使用setData
- 避免频繁的网络请求

### Q4: 真机调试注意事项？
**A**:
- 确保手机和电脑在同一网络
- 检查API地址是否可访问
- 注意iOS和Android的兼容性差异

---

## 👥 团队协作

### 角色分工

- **产品经理**: 需求分析、功能设计
- **UI设计师**: 界面设计、交互设计
- **前端开发**: 小程序开发、测试
- **后端开发**: API开发、数据库设计
- **测试工程师**: 功能测试、性能测试

### 协作流程

1. **需求评审** → 2. **技术方案设计** → 3. **开发实现** → 4. **代码审查** → 5. **测试验证** → 6. **上线发布**

---

## 📝 更新日志

### v1.0.0 (2024-01-15)
- ✨ 初始版本发布
- ✅ 完成访客管理功能
- ✅ 完成员工管理功能
- ✅ 完成通行码生成功能
- ✅ 完成单元测试覆盖

---

## 📄 许可证

MIT License

Copyright (c) 2024 AFA Team

---

## 📞 联系方式

- **项目地址**: https://github.com/afa-team/office-miniprogram
- **问题反馈**: https://github.com/afa-team/office-miniprogram/issues
- **技术支持**: support@afa-office.com

---

**文档最后更新**: 2024-01-15
