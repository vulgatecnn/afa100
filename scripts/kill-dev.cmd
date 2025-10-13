@echo off
chcp 65001 >nul
echo AFA办公系统 - 快速终止开发端口进程
echo =====================================

powershell -ExecutionPolicy Bypass -File "%~dp0kill-dev-ports.ps1" -All

pause