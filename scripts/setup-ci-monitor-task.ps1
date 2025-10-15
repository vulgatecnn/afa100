# 设置CI/CD状态监控任务计划程序
# 用于在Windows系统中创建定时任务来监控GitHub Actions状态

# 获取当前脚本目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$monitorScript = Join-Path $scriptDir "monitor-ci-status.ps1"
$logFile = Join-Path $scriptDir "ci-monitor-scheduled.log"

Write-Host "设置CI/CD状态监控任务..." -ForegroundColor Green
Write-Host "监控脚本路径: $monitorScript" -ForegroundColor White

# 检查监控脚本是否存在
if (-not (Test-Path $monitorScript)) {
    Write-Host "错误: 监控脚本不存在: $monitorScript" -ForegroundColor Red
    exit 1
}

# 创建任务计划程序任务
$taskName = "AFA100-CI-Monitor"
$taskDescription = "监控AFA100项目的GitHub Actions CI/CD状态"

try {
    # 检查是否已存在同名任务
    $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "发现已存在的任务，正在删除..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }
    
    # 创建新的任务
    $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$monitorScript`""
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 1)
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive
    
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description $taskDescription -Principal $principal
    
    Write-Host "✅ 成功创建任务计划程序任务: $taskName" -ForegroundColor Green
    Write-Host "任务将每5分钟运行一次，持续24小时" -ForegroundColor Yellow
    
    # 启动任务
    Write-Host "正在启动任务..." -ForegroundColor Yellow
    Start-ScheduledTask -TaskName $taskName
    
    Write-Host "✅ 任务已启动，开始监控CI/CD状态" -ForegroundColor Green
    Write-Host "日志文件位置: $logFile" -ForegroundColor White
    
} catch {
    Write-Host "❌ 创建任务计划程序任务时出错: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n任务管理命令:" -ForegroundColor Cyan
Write-Host "  查看任务状态: Get-ScheduledTask -TaskName $taskName" -ForegroundColor White
Write-Host "  停止任务: Stop-ScheduledTask -TaskName $taskName" -ForegroundColor White
Write-Host "  启动任务: Start-ScheduledTask -TaskName $taskName" -ForegroundColor White
Write-Host "  删除任务: Unregister-ScheduledTask -TaskName $taskName -Confirm:`$false" -ForegroundColor White