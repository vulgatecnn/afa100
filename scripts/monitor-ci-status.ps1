# CI/CD 状态监控脚本
param(
    [int]$IntervalSeconds = 30,
    [int]$MaxChecks = 20
)

Write-Host "开始监控 CI/CD 流水线状态..." -ForegroundColor Green
Write-Host "检查间隔: $IntervalSeconds 秒" -ForegroundColor Yellow
Write-Host "最大检查次数: $MaxChecks 次" -ForegroundColor Yellow
Write-Host ""

$checkCount = 0

while ($checkCount -lt $MaxChecks) {
    $checkCount++
    
    Write-Host "[$checkCount/$MaxChecks] 检查时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
    
    try {
        # 获取最新的工作流运行状态
        $runs = gh run list --limit 5 --json status,conclusion,workflowName,createdAt,id | ConvertFrom-Json
        
        Write-Host "最新工作流状态:" -ForegroundColor White
        Write-Host "=" * 80 -ForegroundColor Gray
        
        foreach ($run in $runs) {
            $status = $run.status
            $conclusion = $run.conclusion
            $workflowName = $run.workflowName
            $runId = $run.id
            
            # 状态图标
            $statusIcon = switch ($status) {
                "in_progress" { "[RUNNING]" }
                "completed" { 
                    switch ($conclusion) {
                        "success" { "[SUCCESS]" }
                        "failure" { "[FAILED]" }
                        "cancelled" { "[CANCELLED]" }
                        default { "[UNKNOWN]" }
                    }
                }
                default { "[UNKNOWN]" }
            }
            
            # 状态颜色
            $statusColor = switch ($status) {
                "in_progress" { "Yellow" }
                "completed" { 
                    switch ($conclusion) {
                        "success" { "Green" }
                        "failure" { "Red" }
                        "cancelled" { "DarkYellow" }
                        default { "Gray" }
                    }
                }
                default { "Gray" }
            }
            
            Write-Host "$statusIcon $workflowName" -ForegroundColor $statusColor
            Write-Host "   状态: $status" -ForegroundColor Gray
            if ($conclusion) {
                Write-Host "   结果: $conclusion" -ForegroundColor Gray
            }
            Write-Host "   ID: $runId" -ForegroundColor Gray
            Write-Host ""
        }
        
        # 检查是否还有运行中的工作流
        $inProgressRuns = $runs | Where-Object { $_.status -eq "in_progress" }
        
        if ($inProgressRuns.Count -eq 0) {
            Write-Host "所有工作流已完成!" -ForegroundColor Green
            
            # 显示最终结果摘要
            Write-Host ""
            Write-Host "最终结果摘要:" -ForegroundColor Cyan
            Write-Host "=" * 50 -ForegroundColor Gray
            
            $completedRuns = $runs | Where-Object { $_.status -eq "completed" }
            $successCount = ($completedRuns | Where-Object { $_.conclusion -eq "success" }).Count
            $failureCount = ($completedRuns | Where-Object { $_.conclusion -eq "failure" }).Count
            $cancelledCount = ($completedRuns | Where-Object { $_.conclusion -eq "cancelled" }).Count
            
            Write-Host "SUCCESS: $successCount" -ForegroundColor Green
            Write-Host "FAILED: $failureCount" -ForegroundColor Red
            Write-Host "CANCELLED: $cancelledCount" -ForegroundColor DarkYellow
            
            if ($failureCount -eq 0) {
                Write-Host ""
                Write-Host "恭喜！所有CI/CD流水线都成功通过了！" -ForegroundColor Green
            } else {
                Write-Host ""
                Write-Host "有 $failureCount 个工作流失败，需要检查。" -ForegroundColor Red
            }
            
            break
        }
        
        Write-Host "还有 $($inProgressRuns.Count) 个工作流正在运行中..." -ForegroundColor Yellow
        Write-Host ""
        
    } catch {
        Write-Host "获取状态时出错: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    if ($checkCount -lt $MaxChecks) {
        Write-Host "等待 $IntervalSeconds 秒后继续检查..." -ForegroundColor Gray
        Start-Sleep -Seconds $IntervalSeconds
        Write-Host ""
    }
}

if ($checkCount -ge $MaxChecks) {
    Write-Host "已达到最大检查次数，停止监控。" -ForegroundColor DarkYellow
    Write-Host "您可以手动检查: https://github.com/vulgatecnn/afa100/actions" -ForegroundColor Blue
}