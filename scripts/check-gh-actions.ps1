# 使用 GitHub CLI 轮询检查 GitHub Actions 状态
# 作者: Kiro
# 日期: 2025-10-14

Write-Host "=== GitHub Actions CI 状态检查器 (使用 GitHub CLI) ===" -ForegroundColor Green
Write-Host "检查仓库: vulgatecnn/afa100" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Green

# 检查是否安装了 GitHub CLI
try {
    $ghVersion = gh --version 2>$null
    Write-Host "GitHub CLI 版本: $ghVersion" -ForegroundColor Yellow
} catch {
    Write-Host "错误: 未找到 GitHub CLI (gh 命令)" -ForegroundColor Red
    Write-Host "请先安装 GitHub CLI: https://cli.github.com/" -ForegroundColor Yellow
    exit 1
}

# 检查是否已进行身份验证
try {
    $authStatus = gh auth status 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "GitHub CLI 已通过身份验证" -ForegroundColor Green
    } else {
        Write-Host "GitHub CLI 未通过身份验证" -ForegroundColor Yellow
        Write-Host "建议运行 'gh auth login' 进行身份验证以获取更详细的信息" -ForegroundColor Yellow
    }
} catch {
    Write-Host "无法检查身份验证状态" -ForegroundColor Yellow
}

# 定义检查函数
function Check-ActionsStatus {
    Write-Host "`n[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 正在检查工作流状态..." -ForegroundColor Cyan
    
    try {
        # 获取最新的已完成工作流运行
        Write-Host "`n--- 最新的已完成工作流 ---" -ForegroundColor Yellow
        $completedRuns = gh run list --repo vulgatecnn/afa100 --limit 3 --status completed 2>$null | Out-String
        if ($completedRuns.Trim()) {
            $completedRuns.Split("`n") | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
                Write-Host "  $_" -ForegroundColor White
            }
        } else {
            Write-Host "  没有已完成的工作流" -ForegroundColor Gray
        }
        
        # 获取进行中的工作流运行
        Write-Host "`n--- 进行中的工作流 ---" -ForegroundColor Yellow
        $inProgressRuns = gh run list --repo vulgatecnn/afa100 --limit 3 --status in_progress 2>$null | Out-String
        if ($inProgressRuns.Trim()) {
            $inProgressRuns.Split("`n") | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
                Write-Host "  $_" -ForegroundColor White
            }
        } else {
            Write-Host "  没有进行中的工作流" -ForegroundColor Gray
        }
        
        # 获取失败的工作流运行
        Write-Host "`n--- 最近失败的工作流 ---" -ForegroundColor Yellow
        $failedRuns = gh run list --repo vulgatecnn/afa100 --limit 3 --status failure 2>$null | Out-String
        if ($failedRuns.Trim()) {
            $failedRuns.Split("`n") | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
                Write-Host "  $_" -ForegroundColor White
            }
        } else {
            Write-Host "  没有最近失败的工作流" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "检查过程中出错: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 立即运行一次检查
Check-ActionsStatus

# 设置轮询检查
Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "开始轮询检查 CI 状态 (每30秒一次)..." -ForegroundColor Cyan
Write-Host "按 Ctrl+C 停止轮询" -ForegroundColor Yellow

# 轮询检查 (每30秒一次)
$counter = 0
while ($true) {
    $counter++
    Write-Host "`n--- 轮询 #$counter ---" -ForegroundColor DarkGray
    Start-Sleep -Seconds 30
    Check-ActionsStatus
}