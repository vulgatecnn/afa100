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

## 故障排除

**如果 PowerShell 执行策略限制：**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**如果需要临时绕过执行策略：**

```powershell
powershell -ExecutionPolicy Bypass -File .\kill-dev-ports.ps1 -All
```
