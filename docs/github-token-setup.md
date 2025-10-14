# GitHub Personal Access Token 设置指南

为了能够通过 API 检查 GitHub Actions 的状态，我们需要设置一个 Personal Access Token。

## 创建 Personal Access Token 的步骤

1. 登录到您的 GitHub 账户
2. 点击右上角的头像，选择 "Settings"
3. 在左侧菜单中，滚动到底部并点击 "Developer settings"
4. 点击 "Personal access tokens" → "Tokens (classic)"
5. 点击 "Generate new token" → "Generate new token (classic)"
6. 在 "Note" 字段中输入一个描述性的名称，例如 "CI Status Checker"
7. 设置过期时间（建议设置为 90 天或根据需要设置）
8. 选择以下权限：
   - [x] **repo** - Full control of private repositories
   - [x] **workflow** - Update GitHub Action workflows
9. 点击 "Generate token"
10. 复制生成的 token 并妥善保存（这是唯一能看到 token 的机会）

## 使用 Token

创建好 token 后，您可以通过以下方式使用它：

### Windows PowerShell:
```powershell
$env:GITHUB_TOKEN="your_token_here"
node scripts/check-ci-status.js
```

### Windows CMD:
```cmd
set GITHUB_TOKEN=your_token_here
node scripts/check-ci-status.js
```

### Git Bash:
```bash
export GITHUB_TOKEN=your_token_here
node scripts/check-ci-status.js
```

## 安全注意事项

1. 不要将 token 提交到代码仓库中
2. 不要在日志或输出中显示 token
3. 定期轮换 token
4. 遵循最小权限原则，只授予必要的权限

## 验证 Token 权限

您可以通过以下命令验证 token 是否具有正确的权限：

```bash
curl -H "Authorization: token YOUR_TOKEN" \
     -H "Accept: application/vnd.github.v3+json" \
     https://api.github.com/repos/vulgatecnn/afa100/actions/runs
```

如果返回正确的 JSON 数据而不是 404 或 403 错误，则表示 token 设置正确。