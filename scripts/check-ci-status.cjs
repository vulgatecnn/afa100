#!/usr/bin/env node

/**
 * 检查GitHub Actions CI/CD状态的脚本
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function checkCIStatus() {
  try {
    console.log('🔍 检查GitHub Actions CI/CD状态...');
    
    // 获取最近的工作流运行状态
    const { stdout } = await execPromise('gh run list --limit 5 --json status,conclusion,event,workflowName,createdAt --jq \'.[] | select(.event=="push") | "工作流: \\(.workflowName) | 状态: \\(.status) \\(.conclusion//empty) | 时间: \\(.createdAt)"\'');
    
    if (stdout) {
      console.log('📋 最近的CI/CD运行状态:');
      console.log(stdout);
    } else {
      console.log('⚠️  没有找到最近的CI/CD运行记录');
    }
  } catch (error) {
    console.error('❌ 检查CI/CD状态时出错:', error.message);
    console.log('💡 提示: 确保已安装GitHub CLI (gh) 并已登录');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  checkCIStatus();
}

module.exports = { checkCIStatus };
