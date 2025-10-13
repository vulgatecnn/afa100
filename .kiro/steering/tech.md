# 技术栈和构建系统

## 包管理器规范

- **包管理器**: pnpm (统一使用pnpm管理依赖)
- **版本要求**: pnpm 8.0+
- **工作空间**: 使用pnpm workspace管理多包项目
- **锁定文件**: 提交pnpm-lock.yaml到版本控制

## 后端技术栈

- **运行时**: Node.js (LTS版本)
- **语言**: TypeScript
- **框架**: Express.js
- **数据库**: SQLite (开发环境)
- **认证**: JWT + 微信OAuth
- **测试**: Vitest + Supertest
- **代码质量**: ESLint + Prettier
- **类型检查**: TypeScript
- **包管理器**: pnpm

## 前端技术栈

- **语言**: TypeScript
- **框架**: React 18+
- **UI库**: Ant Design
- **HTTP客户端**: Axios
- **状态管理**: React Hooks + Context API
- **构建工具**: Vite
- **类型检查**: TypeScript
- **包管理器**: pnpm

## 小程序技术栈

- **开发方式**: 微信原生小程序
- **UI组件**: 微信官方组件 + 自定义组件
- **状态管理**: 小程序原生状态管理

## 常用命令

### 后端开发
```bash
# 安装依赖
pnpm install

# 开发模式启动
pnpm dev

# 运行测试
pnpm test

# 运行测试覆盖率
pnpm test:coverage

# 代码格式化
pnpm format

# 代码检查
pnpm lint
```

### 前端开发
```bash
# 安装依赖
pnpm install

# 开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview

# 运行测试
pnpm test
```

### 数据库操作
```bash
# 初始化数据库
pnpm db:init

# 运行迁移
pnpm db:migrate

# 重置数据库
pnpm db:reset
```

## 环境配置

- **开发环境**: SQLite数据库，热重载
- **测试环境**: 内存数据库，自动化测试
- **生产环境**: PostgreSQL/MySQL，性能优化

## 端口配置

- **租务管理端**: 5000端口 (http://localhost:5000)
- **商户管理端**: 5050端口 (http://localhost:5050)
- **后端API服务器**: 5100端口 (http://localhost:5100)
- **API基础路径**: http://localhost:5100/api/v1

### 环境变量配置

**后端环境变量 (.env):**
- `PORT=5100` - 后端服务器端口
- `CORS_ORIGIN=http://localhost:5000` - 允许的前端域名

**前端环境变量 (.env):**
- `VITE_PORT=5000` (租务管理端) / `VITE_PORT=5050` (商户管理端)
- `VITE_API_BASE_URL=http://localhost:5100/api/v1` - API基础地址

### 端口冲突处理

**推荐方式 - 使用自动化脚本:**
```powershell
# 快速终止所有开发端口进程
.\scripts\kill-dev.cmd

# 或者使用PowerShell脚本
.\scripts\kill-dev-ports.ps1 -All          # 终止所有端口进程
.\scripts\kill-dev-ports.ps1 -Frontend     # 仅终止前端进程
.\scripts\kill-dev-ports.ps1 -Backend      # 仅终止后端进程
.\scripts\kill-dev-ports.ps1 -List         # 查看端口占用情况
```

**手动方式 (Windows系统):**
```cmd
# 查找占用端口的进程
netstat -ano | findstr :5000
netstat -ano | findstr :5100

# 终止进程 (PID为进程ID)
taskkill /PID <进程ID> /F

# 或者直接终止Node.js进程
taskkill /IM node.exe /F
```

**启动顺序建议:**
1. 运行 `.\scripts\kill-dev.cmd` 清理端口
2. 先启动后端服务器 (端口5100)
3. 再启动前端开发服务器 (端口5000)
4. 确保两个服务都正常运行后再进行开发

## pnpm包管理规范

### 安装和配置
```bash
# 全局安装pnpm
npm install -g pnpm

# 检查版本
pnpm --version

# 设置镜像源（可选）
pnpm config set registry https://registry.npmmirror.com/
```

### 依赖管理
```bash
# 安装所有依赖
pnpm install

# 安装生产依赖
pnpm add <package>

# 安装开发依赖
pnpm add -D <package>

# 安装全局依赖
pnpm add -g <package>

# 更新依赖
pnpm update

# 移除依赖
pnpm remove <package>
```

### 工作空间管理
```bash
# 在根目录安装依赖（影响所有子包）
pnpm install

# 为特定包安装依赖
pnpm --filter backend add express
pnpm --filter frontend add react

# 运行特定包的脚本
pnpm --filter backend dev
pnpm --filter frontend build

# 运行所有包的脚本
pnpm -r dev
pnpm -r test
```

### 脚本执行
```bash
# 运行package.json中的脚本
pnpm dev
pnpm build
pnpm test

# 运行多个脚本
pnpm run dev && pnpm run test

# 并行运行脚本
pnpm run --parallel dev
```

### 缓存管理
```bash
# 清理缓存
pnpm store prune

# 查看存储信息
pnpm store status

# 清理node_modules
pnpm clean
```

### 版本管理
```bash
# 查看过时的包
pnpm outdated

# 更新到最新版本
pnpm update --latest

# 检查安全漏洞
pnpm audit

# 修复安全漏洞
pnpm audit --fix
```

### pnpm最佳实践

#### 项目初始化
1. 确保安装了pnpm 8.0+版本
2. 在项目根目录创建`pnpm-workspace.yaml`配置工作空间
3. 配置`.npmrc`文件设置项目特定的pnpm选项
4. 在`package.json`中指定`packageManager`字段

#### 依赖管理原则
- **精确版本**: 使用`save-exact=true`保存精确版本号
- **Peer依赖**: 启用`auto-install-peers=true`自动安装peer依赖
- **安全检查**: 定期运行`pnpm audit`检查安全漏洞
- **清理缓存**: 定期运行`pnpm store prune`清理无用缓存

#### 工作空间协作
- 使用`pnpm --filter`为特定包执行命令
- 使用`pnpm -r`为所有包执行命令
- 共享依赖放在根目录，特定依赖放在对应包中
- 避免在子包中直接运行npm或yarn命令

#### 性能优化
- 利用pnpm的符号链接特性减少磁盘占用
- 使用`--parallel`标志并行执行脚本
- 配置合适的`store-dir`位置优化访问速度
- 启用`strict-peer-dependencies`确保依赖一致性

## 部署要求

- Node.js 18+ 
- pnpm 8.0+
- 支持Docker容器化部署
- 环境变量配置敏感信息
- HTTPS协议支持