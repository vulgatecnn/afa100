# GitHub Actions CI 状态检查脚本
# 作者: Kiro
# 日期: 2025-10-14

# GitHub 仓库信息
$Owner = "vulgatecnn"
$Repo = "afa100"

# 获取 GitHub Personal Access Token (如果已设置)
$Token = $env:GITHUB_TOKEN

# 显示初始信息
Write-Host "=== GitHub Actions CI 状态检查器 ===" -ForegroundColor Green
Write-Host "检查仓库: $Owner/$Repo" -ForegroundColor Cyan

if ($Token) {
    Write-Host "已提供 GitHub Personal Access Token" -ForegroundColor Yellow
} else {
    Write-Host "警告: 未提供 GitHub Personal Access Token" -ForegroundColor Red
    Write-Host "某些信息可能无法访问，特别是对于私有仓库。" -ForegroundColor Red
}

Write-Host "=====================================" -ForegroundColor Green

# 检查GitHub Actions CI/CD状态的PowerShell脚本

Write-Host "🔍 检查GitHub Actions CI/CD状态..." -ForegroundColor Yellow

try {
    # 检查是否安装了GitHub CLI
    $ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
    if (-not $ghInstalled) {
        Write-Host "❌ 未找到GitHub CLI (gh)" -ForegroundColor Red
        Write-Host "💡 请先安装GitHub CLI: https://cli.github.com/" -ForegroundColor Yellow
        exit 1
    }

    # 获取最近的工作流运行状态
    Write-Host "📋 获取最近的CI/CD运行状态..." -ForegroundColor Yellow
    $runs = gh run list --limit 5 --json status,conclusion,event,workflowName,createdAt | ConvertFrom-Json
    
    if ($runs) {
        Write-Host "📋 最近的CI/CD运行状态:" -ForegroundColor Yellow
        $runs | Where-Object { $_.event -eq "push" } | ForEach-Object {
            $status = if ($_.conclusion) { "$($_.status) $($_.conclusion)" } else { $_.status }
            Write-Host "工作流: $($_.workflowName) | 状态: $status | 时间: $($_.createdAt)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "⚠️  没有找到最近的CI/CD运行记录" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ 检查CI/CD状态时出错: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 提示: 确保已安装GitHub CLI (gh) 并已登录" -ForegroundColor Yellow
}

# 定义检查函数
function Check-WorkflowRuns {
    Write-Host "`n正在检查工作流状态..." -ForegroundColor Cyan
    
    # 构建 API URL
    $ApiUrl = "https://api.github.com/repos/$Owner/$Repo/actions/runs?per_page=10"
    
    # 设置请求头
    $Headers = @{
        "User-Agent" = "PowerShell CI Status Checker"
        "Accept" = "application/vnd.github.v3+json"
    }
    
    # 如果有 token，则添加认证头
    if ($Token) {
        $Headers["Authorization"] = "token $Token"
    }
    
    try {
        # 发送请求
        $Response = Invoke-RestMethod -Uri $ApiUrl -Headers $Headers -Method GET
        
        if ($Response.workflow_runs.Count -gt 0) {
            Write-Host "`n找到 $($Response.workflow_runs.Count) 个工作流运行记录:" -ForegroundColor Green
            
            # 显示最新的 3 个工作流运行
            $Response.workflow_runs | Select-Object -First 3 | ForEach-Object {
                Write-Host "`n--- 工作流运行 ---" -ForegroundColor Yellow
                Write-Host "工作流名称: $($_.name)" -ForegroundColor White
                Write-Host "状态: $($_.status)" -ForegroundColor White
                Write-Host "结论: $($_.conclusion)" -ForegroundColor White
                Write-Host "创建时间: $($_.created_at)" -ForegroundColor White
                Write-Host "更新时间: $($_.updated_at)" -ForegroundColor White
                Write-Host "运行链接: $($_.html_url)" -ForegroundColor Blue
            }
            
            Write-Host "`n=====================================" -ForegroundColor Green
        } else {
            Write-Host "没有找到工作流运行记录" -ForegroundColor Yellow
            Write-Host "这可能是因为:" -ForegroundColor Yellow
            Write-Host "1. 还没有触发任何工作流" -ForegroundColor Yellow
            Write-Host "2. 工作流已完成并且被清理" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "请求出错: $($_.Exception.Message)" -ForegroundColor Red
        
        if ($_.Exception.Response) {
            $StatusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "响应状态码: $StatusCode" -ForegroundColor Red
            
            switch ($StatusCode) {
                404 {
                    Write-Host "错误: 仓库未找到或无访问权限" -ForegroundColor Red
                    Write-Host "这通常是因为仓库是私有的，需要身份验证才能访问。" -ForegroundColor Red
                    Write-Host "`n请创建一个 GitHub Personal Access Token 并设置 GITHUB_TOKEN 环境变量。" -ForegroundColor Yellow
                    Write-Host "需要的权限: repo, workflow" -ForegroundColor Yellow
                }
                403 {
                    Write-Host "错误: API 访问被拒绝" -ForegroundColor Red
                    Write-Host "可能的原因:" -ForegroundColor Red
                    Write-Host "1. GitHub Personal Access Token 不正确或已过期" -ForegroundColor Red
                    Write-Host "2. Token 缺少必要的权限" -ForegroundColor Red
                    Write-Host "3. API 速率限制已达到" -ForegroundColor Red
                    
                    if (-not $Token) {
                        Write-Host "`n请设置 GITHUB_TOKEN 环境变量以提供身份验证。" -ForegroundColor Yellow
                    }
                }
                default {
                    Write-Host "未处理的错误状态码: $StatusCode" -ForegroundColor Red
                }
            }
        }
    }
}

# 立即运行一次检查
Check-WorkflowRuns

# 设置轮询检查
Write-Host "`n开始轮询检查 CI 状态 (每30秒一次)..." -ForegroundColor Cyan
Write-Host "按 Ctrl+C 停止轮询" -ForegroundColor Yellow

# 轮询检查 (每30秒一次)
while ($true) {
    Start-Sleep -Seconds 30
    Check-WorkflowRuns
}