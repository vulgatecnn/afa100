import https from 'https';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// GitHub repository information
const owner = 'vulgatecnn';
const repo = 'afa100';

// GitHub token (if available)
const token = process.env.GITHUB_TOKEN;

// Function to check GitHub Actions status
function checkWorkflowRuns() {
  const options = {
    hostname: 'api.github.com',
    path: `/repos/${owner}/${repo}/actions/runs?per_page=10`,
    method: 'GET',
    headers: {
      'User-Agent': 'Node.js CI Status Checker',
      'Accept': 'application/vnd.github.v3+json'
    }
  };

  // Add authentication if token is available
  if (token) {
    options.headers['Authorization'] = `token ${token}`;
  }

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log(`响应状态码: ${res.statusCode}`);
      
      try {
        const response = JSON.parse(data);
        
        if (res.statusCode === 404) {
          console.log('错误: 仓库未找到或无访问权限');
          console.log('这通常是因为仓库是私有的，需要身份验证才能访问。');
          
          // 提供设置指南
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = dirname(__filename);
          const setupGuide = join(__dirname, '..', 'docs', 'github-token-setup.md');
          
          if (existsSync(setupGuide)) {
            console.log(`\n请查看设置指南获取如何创建 GitHub Personal Access Token:\n  ${setupGuide}`);
          } else {
            console.log('\n请创建一个 GitHub Personal Access Token 并设置 GITHUB_TOKEN 环境变量。');
            console.log('需要的权限: repo, workflow');
          }
          
          return;
        }
        
        if (res.statusCode === 403) {
          console.log('错误: API 访问被拒绝');
          console.log('可能的原因:');
          console.log('1. GitHub Personal Access Token 不正确或已过期');
          console.log('2. Token 缺少必要的权限');
          console.log('3. API 速率限制已达到');
          
          if (!token) {
            console.log('\n请设置 GITHUB_TOKEN 环境变量以提供身份验证。');
          }
          
          console.log('响应内容:', data);
          return;
        }
        
        if (response.message) {
          console.log('API 错误信息:', response.message);
          
          if (response.message.includes('API rate limit exceeded')) {
            console.log('\nGitHub API 速率限制已达到。设置 GITHUB_TOKEN 可以提高速率限制。');
          }
          
          return;
        }
        
        if (response.workflow_runs && response.workflow_runs.length > 0) {
          console.log(`\n找到 ${response.workflow_runs.length} 个工作流运行记录:`);
          
          response.workflow_runs.slice(0, 3).forEach((run, index) => {
            console.log(`\n--- 工作流运行 #${index + 1} ---`);
            console.log(`工作流名称: ${run.name}`);
            console.log(`状态: ${run.status}`);
            console.log(`结论: ${run.conclusion || 'N/A'}`);
            console.log(`创建时间: ${run.created_at}`);
            console.log(`更新时间: ${run.updated_at}`);
            console.log(`运行链接: ${run.html_url}`);
          });
          
          console.log('\n=====================================');
        } else {
          console.log('没有找到工作流运行记录');
          console.log('这可能是因为:');
          console.log('1. 还没有触发任何工作流');
          console.log('2. 工作流已完成并且被清理');
          console.log('3. API 查询参数需要调整');
        }
      } catch (error) {
        console.error('解析响应数据时出错:', error.message);
        console.log('原始响应数据:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('请求出错:', error.message);
  });

  req.end();
}

// Show initial information
console.log('=== GitHub Actions CI 状态检查器 ===');
console.log(`检查仓库: ${owner}/${repo}`);

if (token) {
  console.log('已提供 GitHub Personal Access Token');
} else {
  console.log('警告: 未提供 GitHub Personal Access Token');
  console.log('某些信息可能无法访问，特别是对于私有仓库。');
}

console.log('\n=====================================');

// Run the check immediately
checkWorkflowRuns();

// Set up polling every 30 seconds
console.log('\n开始轮询检查 CI 状态 (每30秒一次)...');
console.log('按 Ctrl+C 停止轮询');
const interval = setInterval(checkWorkflowRuns, 30000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n停止轮询...');
  clearInterval(interval);
  process.exit(0);
});