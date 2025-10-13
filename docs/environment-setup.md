# AFA办公系统环境配置指南

## 端口分配

| 服务 | 端口 | 地址 | 说明 |
|------|------|------|------|
| 后端API服务器 | 5100 | http://localhost:5100 | Express.js后端服务 |
| 租务管理端 | 5000 | http://localhost:5000 | React前端应用 |
| 商户管理端 | 5050 | http://localhost:5050 | React前端应用 |

## 环境变量配置

### 后端配置 (backend/.env)

```bash
# 服务器配置
PORT=5100
NODE_ENV=development

# CORS配置
CORS_ORIGIN=http://localhost:5000

# 数据库配置
DB_TYPE=mysql
APP_DB_HOST=127.0.0.1
APP_DB_PORT=3306
APP_DB_USER=afa_app_user
APP_DB_PASSWORD=afa_app_2024
APP_DB_NAME=afa_office

# JWT配置
JWT_SECRET=test-jwt-secret-key-for-development-only-change-in-production
JWT_EXPIRES_IN=24h

# 微信小程序配置
WECHAT_APP_ID=test-wechat-app-id
WECHAT_APP_SECRET=test-wechat-app-secret
```

### 租务管理端配置 (frontend/tenant-admin/.env)

```bash
# 前端开发服务器配置
VITE_PORT=5000

# API配置
VITE_API_BASE_URL=http://localhost:5100/api/v1
VITE_API_TIMEOUT=10000

# 应用配置
VITE_APP_TITLE=AFA办公系统 - 租务管理端
VITE_APP_VERSION=1.0.0

# 开发环境配置
VITE_NODE_ENV=development
VITE_ENABLE_MOCK=false
VITE_ENABLE_DEBUG=true
```

### 商户管理端配置 (frontend/merchant-admin/.env)

```bash
# 前端开发服务器配置
VITE_PORT=5050

# API配置
VITE_API_BASE_URL=http://localhost:5100/api/v1
VITE_API_TIMEOUT=10000

# 应用配置
VITE_APP_TITLE=AFA办公系统 - 商户管理端
VITE_APP_VERSION=1.0.0

# 开发环境配置
VITE_NODE_ENV=development
VITE_ENABLE_MOCK=false
VITE_ENABLE_DEBUG=true
```

## 启动顺序

1. **清理端口冲突**
   ```cmd
   .\scripts\kill-dev.cmd
   ```

2. **启动后端服务**
   ```bash
   cd afa-office-system/backend
   pnpm dev
   ```

3. **启动租务管理端**
   ```bash
   cd afa-office-system/frontend/tenant-admin
   pnpm dev
   ```

4. **启动商户管理端**
   ```bash
   cd afa-office-system/frontend/merchant-admin
   pnpm dev
   ```

## 端口冲突处理

### 自动化脚本（推荐）

```powershell
# 查看端口占用情况
.\scripts\kill-dev-ports.ps1 -List

# 终止所有开发端口进程
.\scripts\kill-dev-ports.ps1 -All

# 仅终止前端进程
.\scripts\kill-dev-ports.ps1 -Frontend

# 仅终止后端进程
.\scripts\kill-dev-ports.ps1 -Backend
```

### 手动处理

```cmd
# 查找占用端口的进程
netstat -ano | findstr :5000
netstat -ano | findstr :5050
netstat -ano | findstr :5100

# 终止Node.js进程
taskkill /IM node.exe /F

# 或根据PID终止特定进程
taskkill /PID <进程ID> /F
```

## 配置验证

### 检查后端服务

访问健康检查端点：
```
GET http://localhost:5100/health
```

预期响应：
```json
{
  "success": true,
  "message": "AFA办公小程序后端服务运行正常",
  "timestamp": "2024-12-10T10:00:00.000Z",
  "version": "1.0.0"
}
```

### 检查前端服务

- 租务管理端: http://localhost:5000
- 商户管理端: http://localhost:5050

### 检查API代理

前端应用中的API请求会自动代理到后端：
- `/api/*` -> `http://localhost:5100/api/*`

## 生产环境配置

### 后端生产配置

```bash
PORT=80
NODE_ENV=production
CORS_ORIGIN=https://tenant.afa-office.com,https://merchant.afa-office.com
JWT_SECRET=your-super-secure-production-jwt-secret
```

### 前端生产配置

```bash
VITE_API_BASE_URL=https://api.afa-office.com/api/v1
VITE_NODE_ENV=production
VITE_ENABLE_MOCK=false
VITE_ENABLE_DEBUG=false
```

## 故障排除

### 常见问题

1. **端口被占用**
   - 使用 `.\scripts\kill-dev.cmd` 清理端口
   - 检查是否有其他Node.js进程在运行

2. **CORS错误**
   - 确认后端 `CORS_ORIGIN` 配置正确
   - 检查前端请求的域名是否在允许列表中

3. **API请求失败**
   - 确认后端服务正在运行 (http://localhost:5100/health)
   - 检查前端 `VITE_API_BASE_URL` 配置
   - 查看浏览器网络面板的错误信息

4. **环境变量不生效**
   - 重启开发服务器
   - 确认 `.env` 文件位置正确
   - 检查环境变量名称拼写

### 日志查看

- 后端日志: 控制台输出 + `./logs/app.log`
- 前端日志: 浏览器开发者工具控制台
- 网络请求: 浏览器开发者工具网络面板