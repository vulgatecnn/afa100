# AFA 办公系统开发脚本

## 端口管理脚本

### kill-dev-ports.ps1

PowerShell 脚本，用于管理 AFA 开发环境的端口占用问题。

**功能特性：**

- 自动检测端口 5000（租务管理端）、5050（商户管理端）和 5100（后端）的占用情况
- 智能终止占用进程
- 彩色输出，清晰显示操作结果
- 支持选择性操作（前端/后端/全部）

**使用方法：**

```powershell
# 查看端口占用情况
.\kill-dev-ports.ps1 -List

# 终止所有开发端口进程
.\kill-dev-ports.ps1 -All

# 仅终止前端进程
.\kill-dev-ports.ps1 -Frontend

# 仅终止后端进程
.\kill-dev-ports.ps1 -Backend

# 显示帮助信息
.\kill-dev-ports.ps1
```

### kill-dev.cmd

批处理文件，提供一键清理所有开发端口的快捷方式。

**使用方法：**

```cmd
# 双击运行或在命令行执行
.\kill-dev.cmd
```

## CI/CD 状态监控脚本

### monitor-ci-status.cjs / monitor-ci-status.ps1

Node.js 和 PowerShell 脚本，用于监控 GitHub Actions CI/CD 流水线状态。

**功能特性：**

- 实时监控最新的 GitHub Actions 工作流运行状态
- 显示详细的工作流作业和步骤执行情况
- 自动检测新的工作流运行
- 支持定时检查和手动触发检查
- 生成详细的日志文件

**使用方法：**

```bash
# 使用 Node.js 脚本
node .\scripts\monitor-ci-status.cjs

# 使用 PowerShell 脚本
.\scripts\monitor-ci-status.ps1

# 使用批处理文件（Windows）
.\scripts\start-ci-monitor.bat
```

### start-ci-monitor.bat

Windows 批处理文件，提供一键启动 CI/CD 监控的快捷方式。

**使用方法：**

```cmd
# 双击运行或在命令行执行
.\scripts\start-ci-monitor.bat
```

### setup-ci-monitor-task.ps1

PowerShell 脚本，用于在 Windows 任务计划程序中创建定时监控任务。

**使用方法：**

```powershell
# 以管理员身份运行
.\scripts\setup-ci-monitor-task.ps1
```

## 开发工作流建议

1. **启动开发环境前：**

   ```cmd
   .\scripts\kill-dev.cmd
   ```

2. **启动后端：**

   ```bash
   cd backend
   pnpm dev
   ```

3. **启动前端：**
   ```bash
   # 启动租务管理端 (端口5000)
   cd frontend/tenant-admin
   pnpm dev
   
   # 启动商户管理端 (端口5050)
   cd frontend/merchant-admin
   pnpm dev
   ```

## 注意事项

- 脚本需要管理员权限来终止某些系统进程
- 建议在开发开始前运行清理脚本
- 如果遇到权限问题，请以管理员身份运行 PowerShell
- 脚本会自动处理中文字符编码问题
- CI/CD 监控脚本需要已安装 GitHub CLI (gh)

## 故障排除

**如果 PowerShell 执行策略限制：**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**如果需要临时绕过执行策略：**

```powershell
powershell -ExecutionPolicy Bypass -File .\kill-dev-ports.ps1 -All
```

**如果 GitHub CLI 未安装：**

请访问 https://cli.github.com/ 下载并安装 GitHub CLI，然后进行身份验证：

```bash
gh auth login
```