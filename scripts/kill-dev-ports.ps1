# AFA办公系统开发端口管理脚本
# 用于快速终止占用开发端口的进程

param(
    [switch]$All,
    [switch]$Frontend,
    [switch]$Backend,
    [switch]$List
)

# 定义端口配置
$FRONTEND_PORT = 5000
$FRONTEND_MERCHANT_PORT = 5050
$BACKEND_PORT = 5100

# 颜色输出函数
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

# 获取占用指定端口的进程
function Get-PortProcess($Port) {
    try {
        $connections = netstat -ano | Select-String ":$Port "
        $processes = @()
        
        foreach ($connection in $connections) {
            $parts = $connection.ToString().Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
            if ($parts.Length -ge 5) {
                $pid = $parts[4]
                if ($pid -match '^\d+$') {
                    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($process) {
                        $processes += [PSCustomObject]@{
                            PID = $pid
                            Name = $process.ProcessName
                            Port = $Port
                        }
                    }
                }
            }
        }
        return $processes
    }
    catch {
        return @()
    }
}

# 终止进程
function Stop-PortProcess($Port, $ProcessName) {
    $processes = Get-PortProcess $Port
    
    if ($processes.Count -eq 0) {
        Write-ColorOutput Green "端口 $Port 未被占用"
        return
    }
    
    Write-ColorOutput Yellow "发现占用端口 $Port 的进程:"
    $processes | ForEach-Object {
        Write-Output "  PID: $($_.PID) - $($_.Name)"
    }
    
    foreach ($process in $processes) {
        try {
            Stop-Process -Id $process.PID -Force
            Write-ColorOutput Green "已终止进程 $($process.Name) (PID: $($process.PID))"
        }
        catch {
            Write-ColorOutput Red "无法终止进程 $($process.Name) (PID: $($process.PID)): $($_.Exception.Message)"
        }
    }
}

# 列出占用端口的进程
function Show-PortProcesses {
    Write-ColorOutput Cyan "=== AFA开发端口占用情况 ==="
    
    Write-Output "`n前端端口:"
    Write-Output "  租务管理端 ($FRONTEND_PORT):"
    $frontendProcesses = Get-PortProcess $FRONTEND_PORT
    if ($frontendProcesses.Count -eq 0) {
        Write-ColorOutput Green "    未被占用"
    } else {
        $frontendProcesses | ForEach-Object {
            Write-ColorOutput Yellow "    PID: $($_.PID) - $($_.Name)"
        }
    }
    
    Write-Output "  商户管理端 ($FRONTEND_MERCHANT_PORT):"
    $frontendMerchantProcesses = Get-PortProcess $FRONTEND_MERCHANT_PORT
    if ($frontendMerchantProcesses.Count -eq 0) {
        Write-ColorOutput Green "    未被占用"
    } else {
        $frontendMerchantProcesses | ForEach-Object {
            Write-ColorOutput Yellow "    PID: $($_.PID) - $($_.Name)"
        }
    }
    
    Write-Output "`n后端端口 ($BACKEND_PORT):"
    $backendProcesses = Get-PortProcess $BACKEND_PORT
    if ($backendProcesses.Count -eq 0) {
        Write-ColorOutput Green "  未被占用"
    } else {
        $backendProcesses | ForEach-Object {
            Write-ColorOutput Yellow "  PID: $($_.PID) - $($_.Name)"
        }
    }
    
    Write-Output ""
}

# 显示帮助信息
function Show-Help {
    Write-ColorOutput Cyan "AFA办公系统开发端口管理脚本"
    Write-Output ""
    Write-Output "用法:"
    Write-Output "  .\kill-dev-ports.ps1 [选项]"
    Write-Output ""
    Write-Output "选项:"
    Write-Output "  -All        终止所有开发端口的进程"
    Write-Output "  -Frontend   仅终止前端端口($FRONTEND_PORT, $FRONTEND_MERCHANT_PORT)的进程"
    Write-Output "  -Backend    仅终止后端端口($BACKEND_PORT)的进程"
    Write-Output "  -List       列出当前端口占用情况"
    Write-Output ""
    Write-Output "示例:"
    Write-Output "  .\kill-dev-ports.ps1 -All       # 终止所有开发端口进程"
    Write-Output "  .\kill-dev-ports.ps1 -Frontend  # 仅终止前端进程"
    Write-Output "  .\kill-dev-ports.ps1 -List      # 查看端口占用情况"
}

# 主逻辑
if ($List) {
    Show-PortProcesses
}
elseif ($All) {
    Write-ColorOutput Cyan "正在终止所有AFA开发端口进程..."
    Stop-PortProcess $FRONTEND_PORT "租务管理端"
    Stop-PortProcess $FRONTEND_MERCHANT_PORT "商户管理端"
    Stop-PortProcess $BACKEND_PORT "后端"
    Write-ColorOutput Green "`n所有端口进程处理完成！"
}
elseif ($Frontend) {
    Write-ColorOutput Cyan "正在终止前端端口进程..."
    Stop-PortProcess $FRONTEND_PORT "租务管理端"
    Stop-PortProcess $FRONTEND_MERCHANT_PORT "商户管理端"
}
elseif ($Backend) {
    Write-ColorOutput Cyan "正在终止后端端口进程..."
    Stop-PortProcess $BACKEND_PORT "后端"
}
else {
    Show-Help
}