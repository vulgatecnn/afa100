@echo off
REM 启动CI/CD状态监控
REM 该脚本将启动PowerShell监控脚本并显示实时状态

echo 正在启动CI/CD状态监控...
echo.

cd /d "D:\vulgate\code\kiro\afa100"

REM 检查GitHub CLI是否可用
where gh >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到GitHub CLI (gh命令)
    echo 请先安装GitHub CLI: https://cli.github.com/
    echo.
    pause
    exit /b 1
)

echo GitHub CLI版本:
gh --version
echo.

echo 开始监控CI/CD状态...
echo 按 Ctrl+C 可以停止监控
echo.
echo ==================== 监控开始 ====================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0monitor-ci-status.ps1"

echo.
echo ==================== 监控结束 ====================
echo.
pause