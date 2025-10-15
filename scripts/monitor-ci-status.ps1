# CI/CD状态监控脚本
# 用于定期检查GitHub Actions工作流状态

param(
    [int]$Interval = 30,  # 检查间隔（秒）
    [int]$MaxChecks = 60  # 最大检查次数
)

Write-Host "开始监控CI/CD状态..." -ForegroundColor Green
Write-Host "检查间隔: $Interval 秒, 最大检查次数: $MaxChecks" -ForegroundColor Yellow

$checkCount = 0
$lastRunId = $null
$completed = $false

while ($checkCount -lt $MaxChecks -and -not $completed) {
    $checkCount++
    Write-Host "`n--- 第 $checkCount 次检查 ---" -ForegroundColor Cyan
    
    try {
        # 获取最新的工作流运行
        $runOutput = gh run list --limit 1 --json databaseId,status,conclusion,event,workflowName,displayTitle,startedAt,updatedAt | ConvertFrom-Json
        
        if ($runOutput.Count -eq 0) {
            Write-Host "没有找到任何工作流运行" -ForegroundColor Yellow
            Start-Sleep -Seconds $Interval
            continue
        }
        
        $latestRun = $runOutput[0]
        Write-Host "最新工作流: $($latestRun.workflowName) ($($latestRun.displayTitle))" -ForegroundColor White
        Write-Host "状态: $($latestRun.status), 结论: $(if ($latestRun.conclusion) { $latestRun.conclusion } else { 'N/A' })" -ForegroundColor White
        Write-Host "事件: $($latestRun.event), 开始时间: $((Get-Date $latestRun.startedAt).ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor White
        
        # 如果是新的运行，记录ID
        if ($latestRun.databaseId -ne $lastRunId) {
            Write-Host "检测到新的工作流运行: $($latestRun.databaseId)" -ForegroundColor Magenta
            $lastRunId = $latestRun.databaseId
        }
        
        # 根据状态采取不同操作
        if ($latestRun.status -eq 'completed') {
            Write-Host "工作流已完成，结论: $($latestRun.conclusion)" -ForegroundColor White
            
            # 获取详细信息
            try {
                $detailsOutput = gh run view $latestRun.databaseId --json jobs | ConvertFrom-Json
                Write-Host "`n工作流作业详情:" -ForegroundColor Yellow
                
                foreach ($job in $detailsOutput.jobs) {
                    $statusIcon = switch ($job.status) {
                        'completed' { 
                            if ($job.conclusion -eq 'success') { '✓' } else { '✗' }
                        }
                        'in_progress' { '●' }
                        default { '○' }
                    }
                    
                    Write-Host "  $statusIcon $($job.name) ($($job.conclusion ?? $job.status))" -ForegroundColor White
                    
                    # 显示步骤详情
                    if ($job.steps) {
                        foreach ($step in $job.steps) {
                            $stepStatusIcon = switch ($step.status) {
                                'completed' { 
                                    if ($step.conclusion -eq 'success') { '  ✓' } else { '  ✗' }
                                }
                                'in_progress' { '  ●' }
                                default { '  ○' }
                            }
                            
                            Write-Host "    $stepStatusIcon $($step.name)" -ForegroundColor Gray
                        }
                    }
                }
            } catch {
                Write-Host "获取工作流详情时出错: $($_.Exception.Message)" -ForegroundColor Red
            }
            
            if ($latestRun.conclusion -eq 'success') {
                Write-Host "✅ CI/CD流水线执行成功!" -ForegroundColor Green
                $completed = $true
            } else {
                Write-Host "❌ CI/CD流水线执行失败!" -ForegroundColor Red
                $completed = $true
            }
        } elseif ($latestRun.status -eq 'in_progress') {
            Write-Host "工作流正在进行中..." -ForegroundColor Yellow
            
            # 获取详细信息
            try {
                $detailsOutput = gh run view $latestRun.databaseId --json jobs | ConvertFrom-Json
                Write-Host "`n工作流作业详情:" -ForegroundColor Yellow
                
                foreach ($job in $detailsOutput.jobs) {
                    $statusIcon = switch ($job.status) {
                        'completed' { 
                            if ($job.conclusion -eq 'success') { '✓' } else { '✗' }
                        }
                        'in_progress' { '●' }
                        default { '○' }
                    }
                    
                    Write-Host "  $statusIcon $($job.name) ($($job.conclusion ?? $job.status))" -ForegroundColor White
                }
            } catch {
                Write-Host "获取工作流详情时出错: $($_.Exception.Message)" -ForegroundColor Red
            }
        } elseif ($latestRun.status -eq 'queued') {
            Write-Host "工作流正在排队中..." -ForegroundColor Yellow
        } else {
            Write-Host "工作流状态: $($latestRun.status)" -ForegroundColor White
        }
        
    } catch {
        Write-Host "检查CI状态时出错: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # 如果还没完成，等待下次检查
    if (-not $completed) {
        Write-Host "等待 $Interval 秒后进行下次检查..." -ForegroundColor Gray
        Start-Sleep -Seconds $Interval
    }
}

if (-not $completed) {
    Write-Host "达到最大检查次数 ($MaxChecks)，停止监控" -ForegroundColor Yellow
}

Write-Host "CI/CD状态监控结束" -ForegroundColor Green