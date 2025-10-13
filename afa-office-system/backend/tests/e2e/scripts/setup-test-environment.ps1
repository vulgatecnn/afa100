# 端到端测试环境自动化部署脚本 (Windows PowerShell)
# 用于Windows环境下的CI/CD或本地测试环境快速搭建

param(
    [switch]$SkipBuild,
    [switch]$Verbose
)

# 错误处理
$ErrorActionPreference = "Stop"

# 日志函数
function Write-Info {
    param($Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param($Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# 检查必要工具
function Test-Prerequisites {
    Write-Info "检查必要工具..."
    
    # 检查Node.js
    try {
        $nodeVersion = node --version
        Write-Info "Node.js版本: $nodeVersion"
    }
    catch {
        Write-Error "Node.js 未安装，请先安装 Node.js 18+"
        exit 1
    }
    
    # 检查pnpm
    try {
        $pnpmVersion = pnpm --version
        Write-Info "pnpm版本: $pnpmVersion"
    }
    catch {
        Write-Error "pnpm 未安装，请先安装 pnpm 8+"
        exit 1
    }
    
    Write-Info "✅ 必要工具检查通过"
}

# 安装依赖
function Install-Dependencies {
    Write-Info "安装项目依赖..."
    
    # 回到项目根目录
    Set-Location (Join-Path $PSScriptRoot "../../../../..")
    
    # 安装依赖
    pnpm install
    
    # 安装Playwright浏览器
    pnpm --filter tenant-admin exec playwright install
    
    Write-Info "✅ 依赖安装完成"
}

# 构建项目
function Build-Project {
    if ($SkipBuild) {
        Write-Info "跳过项目构建"
        return
    }
    
    Write-Info "构建项目..."
    
    # 构建后端
    pnpm --filter backend build
    
    # 构建前端
    pnpm --filter tenant-admin build
    pnpm --filter merchant-admin build
    
    Write-Info "✅ 项目构建完成"
}

# 初始化测试数据库
function Initialize-TestDatabase {
    Write-Info "初始化测试数据库..."
    
    # 设置测试环境变量
    $env:NODE_ENV = "test"
    $env:E2E_DB_TYPE = "sqlite"
    $env:E2E_DB_PATH = "./tests/e2e/fixtures/test.db"
    
    # 初始化数据库
    pnpm --filter backend db:init
    
    Write-Info "✅ 测试数据库初始化完成"
}

# 启动服务
function Start-Services {
    Write-Info "启动测试服务..."
    
    # 创建日志目录
    if (!(Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs"
    }
    
    # 启动后端服务
    Write-Info "启动后端服务..."
    $backendProcess = Start-Process -FilePath "pnpm" -ArgumentList "--filter", "backend", "dev" -RedirectStandardOutput "logs/backend.log" -RedirectStandardError "logs/backend-error.log" -PassThru
    $backendProcess.Id | Out-File "logs/backend.pid"
    
    # 等待后端服务启动
    Start-Sleep -Seconds 5
    
    # 检查后端服务
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Info "✅ 后端服务启动成功"
        }
    }
    catch {
        Write-Error "后端服务启动失败"
        Get-Content "logs/backend.log" | Write-Host
        exit 1
    }
    
    # 启动前端服务
    Write-Info "启动租务管理端..."
    $tenantProcess = Start-Process -FilePath "pnpm" -ArgumentList "--filter", "tenant-admin", "dev" -RedirectStandardOutput "logs/tenant-admin.log" -RedirectStandardError "logs/tenant-admin-error.log" -PassThru
    $tenantProcess.Id | Out-File "logs/tenant-admin.pid"
    
    Write-Info "启动商户管理端..."
    $merchantProcess = Start-Process -FilePath "pnpm" -ArgumentList "--filter", "merchant-admin", "dev" -RedirectStandardOutput "logs/merchant-admin.log" -RedirectStandardError "logs/merchant-admin-error.log" -PassThru
    $merchantProcess.Id | Out-File "logs/merchant-admin.pid"
    
    # 等待前端服务启动
    Start-Sleep -Seconds 10
    
    Write-Info "✅ 所有服务启动完成"
    Write-Info "后端服务: http://localhost:3000"
    Write-Info "租务管理端: http://localhost:3001"
    Write-Info "商户管理端: http://localhost:3002"
}

# 验证服务状态
function Test-Services {
    Write-Info "验证服务状态..."
    
    # 检查后端API
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Info "✅ 后端API正常"
        }
    }
    catch {
        Write-Error "❌ 后端API异常"
        return $false
    }
    
    # 检查前端服务（可选）
    try {
        Invoke-WebRequest -Uri "http://localhost:3001" -UseBasicParsing -TimeoutSec 5 | Out-Null
        Write-Info "✅ 租务管理端正常"
    }
    catch {
        Write-Warn "⚠️ 租务管理端可能未完全启动"
    }
    
    try {
        Invoke-WebRequest -Uri "http://localhost:3002" -UseBasicParsing -TimeoutSec 5 | Out-Null
        Write-Info "✅ 商户管理端正常"
    }
    catch {
        Write-Warn "⚠️ 商户管理端可能未完全启动"
    }
    
    Write-Info "✅ 服务状态验证完成"
    return $true
}

# 创建停止脚本
function New-StopScript {
    $stopScript = @'
# 停止端到端测试环境脚本

Write-Host "🛑 停止端到端测试环境..." -ForegroundColor Yellow

# 停止服务
if (Test-Path "logs/backend.pid") {
    $backendPid = Get-Content "logs/backend.pid"
    try {
        Stop-Process -Id $backendPid -Force
        Write-Host "✅ 后端服务已停止" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️ 后端服务可能已经停止" -ForegroundColor Yellow
    }
    Remove-Item "logs/backend.pid"
}

if (Test-Path "logs/tenant-admin.pid") {
    $tenantPid = Get-Content "logs/tenant-admin.pid"
    try {
        Stop-Process -Id $tenantPid -Force
        Write-Host "✅ 租务管理端已停止" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️ 租务管理端可能已经停止" -ForegroundColor Yellow
    }
    Remove-Item "logs/tenant-admin.pid"
}

if (Test-Path "logs/merchant-admin.pid") {
    $merchantPid = Get-Content "logs/merchant-admin.pid"
    try {
        Stop-Process -Id $merchantPid -Force
        Write-Host "✅ 商户管理端已停止" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️ 商户管理端可能已经停止" -ForegroundColor Yellow
    }
    Remove-Item "logs/merchant-admin.pid"
}

# 清理日志文件
Remove-Item "logs/*.log" -ErrorAction SilentlyContinue

Write-Host "🎉 测试环境已完全停止" -ForegroundColor Green
'@

    $stopScript | Out-File "stop-test-environment.ps1" -Encoding UTF8
    Write-Info "✅ 停止脚本已创建: ./stop-test-environment.ps1"
}

# 主函数
function Main {
    Write-Info "端到端测试环境自动化部署开始"
    
    try {
        Test-Prerequisites
        Install-Dependencies
        Build-Project
        Initialize-TestDatabase
        Start-Services
        
        if (Test-Services) {
            New-StopScript
            
            Write-Info "🎉 端到端测试环境设置完成！"
            Write-Info ""
            Write-Info "现在可以运行端到端测试:"
            Write-Info "  pnpm test:e2e"
            Write-Info ""
            Write-Info "停止测试环境:"
            Write-Info "  .\stop-test-environment.ps1"
        }
        else {
            Write-Error "服务验证失败，请检查日志"
            exit 1
        }
    }
    catch {
        Write-Error "部署过程中发生错误: $_"
        exit 1
    }
}

# 执行主函数
Main