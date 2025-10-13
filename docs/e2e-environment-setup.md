# E2E 测试环境管理

本文档介绍如何使用 AFA 办公小程序的 E2E 测试环境管理系统。

## 概述

E2E 测试环境管理系统提供了完整的自动化测试环境，包括：

- **服务启动管理**: 自动启动后端API、租务管理端、商户管理端
- **数据库管理**: E2E测试专用数据库的创建、初始化、清理和数据隔离
- **健康检查**: 服务和数据库的健康状态监控
- **优雅关闭**: 自动清理和资源释放

## 快速开始

### 1. 启动完整的E2E测试环境

```bash
# 启动所有服务和数据库
pnpm e2e:env:start

# 或者使用原始命令
node scripts/e2e-environment-manager.js start
```

这将会：
- 创建并初始化E2E测试数据库
- 启动后端服务 (端口 5100)
- 启动租务管理端 (端口 5000)
- 启动商户管理端 (端口 5050)
- 验证所有服务的健康状态

### 2. 查看环境状态

```bash
pnpm e2e:env:status
```

### 3. 停止环境

```bash
pnpm e2e:env:stop
```

## 详细使用说明

### 环境管理命令

```bash
# 启动环境
pnpm e2e:env:start

# 停止环境
pnpm e2e:env:stop

# 重启环境
pnpm e2e:env:restart

# 重置环境（清除所有数据并重新初始化）
pnpm e2e:env:reset

# 查看状态
pnpm e2e:env:status

# 验证环境
pnpm e2e:env:verify
```

### 服务管理命令

```bash
# 仅启动服务（不包括数据库管理）
pnpm e2e:services:start

# 停止服务
pnpm e2e:services:stop

# 查看服务状态
pnpm e2e:services:status
```

### 数据库管理命令

```bash
# 初始化E2E测试数据库
pnpm e2e:db:init

# 重置数据库
pnpm e2e:db:reset

# 清理数据库数据
pnpm e2e:db:clean

# 验证数据库环境
pnpm e2e:db:verify
```

## 环境配置

### 数据库配置

通过环境变量配置E2E测试数据库：

```bash
# .env 文件
E2E_TEST_DB_HOST=127.0.0.1
E2E_TEST_DB_PORT=3306
E2E_TEST_DB_NAME=afa_office_e2e_test
E2E_TEST_DB_USER=afa_e2e_user
E2E_TEST_DB_PASSWORD=afa_e2e_2024

# MySQL管理员配置（用于创建数据库和用户）
MYSQL_ADMIN_HOST=127.0.0.1
MYSQL_ADMIN_PORT=3306
MYSQL_ADMIN_USER=root
MYSQL_ADMIN_PASSWORD=111111
```

### 服务端口配置

- **后端API**: 5100端口 (http://localhost:5100)
- **租务管理端**: 5000端口 (http://localhost:5000)
- **商户管理端**: 5050端口 (http://localhost:5050)

## 数据隔离和快照

### 创建数据快照

```bash
# 创建快照
node scripts/e2e-environment-manager.js snapshot my-snapshot "测试前的数据状态"
```

### 恢复数据快照

```bash
# 恢复快照
node scripts/e2e-environment-manager.js restore my-snapshot
```

### 测试会话管理

E2E环境管理器会自动为每次启动创建测试会话，并在会话开始前创建数据快照，在会话结束时自动清理数据。

## 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # Windows系统清理端口
   netstat -ano | findstr :5000
   taskkill /PID <进程ID> /F
   
   # 或使用项目提供的清理脚本
   .\scripts\kill-dev.cmd
   ```

2. **数据库连接失败**
   - 检查MySQL服务是否运行
   - 验证数据库配置和权限
   - 确认网络连接

3. **服务启动超时**
   - 检查依赖是否正确安装 (`pnpm install`)
   - 确认工作目录存在
   - 查看服务日志输出

### 日志文件

- **环境管理日志**: `logs/e2e-environment.log`
- **服务管理日志**: `logs/e2e-services.log`
- **数据库管理日志**: `logs/e2e-database.log`
- **数据快照**: `logs/snapshots/`

### 命令选项

```bash
# 静默模式（减少日志输出）
node scripts/e2e-environment-manager.js start --quiet

# 禁用自动清理
node scripts/e2e-environment-manager.js start --no-cleanup

# 禁用数据库清理
node scripts/e2e-environment-manager.js start --no-db-cleanup

# 禁用服务清理
node scripts/e2e-environment-manager.js start --no-service-cleanup
```

## 集成到CI/CD

### GitHub Actions 示例

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: 111111
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install pnpm
        run: npm install -g pnpm
        
      - name: Install dependencies
        run: pnpm install
        
      - name: Start E2E environment
        run: pnpm e2e:env:start
        env:
          NODE_ENV: test
          MYSQL_ADMIN_PASSWORD: 111111
          
      - name: Run E2E tests
        run: pnpm test:e2e
        
      - name: Stop E2E environment
        if: always()
        run: pnpm e2e:env:stop
```

## 最佳实践

1. **测试隔离**: 每个测试用例应该独立，不依赖其他测试的数据状态
2. **数据清理**: 使用数据快照功能确保测试之间的数据隔离
3. **资源管理**: 测试完成后及时清理环境，释放系统资源
4. **监控日志**: 定期检查日志文件，及时发现和解决问题
5. **环境一致性**: 确保开发、测试、CI环境的配置一致性

## 架构说明

E2E测试环境管理系统采用模块化设计：

- **E2EEnvironmentManager**: 统一的环境管理器，协调服务和数据库管理
- **E2EServiceManager**: 服务启动和健康检查管理
- **E2EDatabaseManager**: 数据库创建、初始化、快照和清理管理

这种设计确保了各个组件的职责分离，便于维护和扩展。