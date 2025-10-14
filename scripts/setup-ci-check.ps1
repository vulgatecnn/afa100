# GitHub Actions CI 检查设置脚本
Write-Host "=== GitHub Actions CI 检查设置 ===" -ForegroundColor Green

# 检查是否已经设置了 GITHUB_TOKEN
if ($env:GITHUB_TOKEN) {
    Write-Host "GitHub Personal Access Token 已设置" -ForegroundColor Green
    Write-Host "Token 前缀: $($env:GITHUB_TOKEN.Substring(0, 10))..." -ForegroundColor Yellow
} else {
    Write-Host "未找到 GitHub Personal Access Token" -ForegroundColor Red
    Write-Host "请按照以下步骤设置:" -ForegroundColor Yellow
    Write-Host "1. 访问 https://github.com/settings/tokens" -ForegroundColor Cyan
    Write-Host "2. 点击 'Generate new token'" -ForegroundColor Cyan
    Write-Host "3. 选择 'repo' 和 'workflow' 权限" -ForegroundColor Cyan
    Write-Host "4. 生成 token 并复制" -ForegroundColor Cyan
    Write-Host "5. 运行以下命令设置环境变量:" -ForegroundColor Cyan
    Write-Host "   `$env:GITHUB_TOKEN = 'your_token_here'" -ForegroundColor White
    Write-Host ""
    Write-Host "或者，您可以直接访问 GitHub 网站查看 Actions 状态:" -ForegroundColor Yellow
    Write-Host "https://github.com/vulgatecnn/afa100/actions" -ForegroundColor Blue
}

Write-Host "`n=== 检查完成 ===" -ForegroundColor Green