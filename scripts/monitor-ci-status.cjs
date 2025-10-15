#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置参数
const CHECK_INTERVAL = 30000; // 30秒检查一次
const MAX_CHECKS = 60; // 最多检查60次（30分钟）
const LOG_FILE = path.join(__dirname, 'ci-monitor.log');

// 日志函数
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  
  // 写入日志文件
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

// 检查CI状态
function checkCIStatus() {
  try {
    // 获取最新的运行ID
    const runListOutput = execSync('gh run list --limit 1 --json databaseId,status,conclusion,event,workflowName,displayTitle,startedAt,updatedAt', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    
    const runs = JSON.parse(runListOutput);
    if (runs.length === 0) {
      log('没有找到任何工作流运行');
      return null;
    }
    
    const latestRun = runs[0];
    log(`最新工作流: ${latestRun.workflowName} (${latestRun.displayTitle})`);
    log(`状态: ${latestRun.status}, 结论: ${latestRun.conclusion || 'N/A'}`);
    log(`事件: ${latestRun.event}, 开始时间: ${new Date(latestRun.startedAt).toLocaleString()}`);
    
    return latestRun;
  } catch (error) {
    log(`检查CI状态时出错: ${error.message}`);
    return null;
  }
}

// 获取工作流详情
function getWorkflowDetails(runId) {
  try {
    const output = execSync(`gh run view ${runId} --json jobs`, { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    
    const runDetails = JSON.parse(output);
    return runDetails.jobs || [];
  } catch (error) {
    log(`获取工作流详情时出错: ${error.message}`);
    return [];
  }
}

// 显示工作流详情
function displayWorkflowDetails(jobs) {
  log('\n工作流作业详情:');
  jobs.forEach(job => {
    const statusIcon = job.status === 'completed' ? 
      (job.conclusion === 'success' ? '✓' : '✗') : 
      (job.status === 'in_progress' ? '●' : '○');
    
    log(`  ${statusIcon} ${job.name} (${job.conclusion || job.status})`);
    
    if (job.steps) {
      job.steps.forEach(step => {
        const stepStatusIcon = step.status === 'completed' ? 
          (step.conclusion === 'success' ? '  ✓' : '  ✗') : 
          (step.status === 'in_progress' ? '  ●' : '  ○');
        
        log(`    ${stepStatusIcon} ${step.name}`);
      });
    }
  });
}

// 主监控函数
async function monitorCI() {
  log('开始监控CI/CD状态...');
  log(`检查间隔: ${CHECK_INTERVAL / 1000}秒, 最大检查次数: ${MAX_CHECKS}`);
  
  let checkCount = 0;
  let lastRunId = null;
  let completed = false;
  
  while (checkCount < MAX_CHECKS && !completed) {
    checkCount++;
    log(`\n--- 第 ${checkCount} 次检查 ---`);
    
    const run = checkCIStatus();
    if (!run) {
      log('无法获取工作流状态，等待下次检查...');
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
      continue;
    }
    
    // 如果是新的运行，记录ID
    if (run.databaseId !== lastRunId) {
      log(`检测到新的工作流运行: ${run.databaseId}`);
      lastRunId = run.databaseId;
    }
    
    // 显示详细状态
    if (run.status === 'completed') {
      log(`工作流已完成，结论: ${run.conclusion}`);
      const jobs = getWorkflowDetails(run.databaseId);
      displayWorkflowDetails(jobs);
      
      if (run.conclusion === 'success') {
        log('✅ CI/CD流水线执行成功!');
        completed = true;
      } else {
        log('❌ CI/CD流水线执行失败!');
        completed = true;
      }
    } else if (run.status === 'in_progress') {
      log('工作流正在进行中...');
      const jobs = getWorkflowDetails(run.databaseId);
      displayWorkflowDetails(jobs);
    } else if (run.status === 'queued') {
      log('工作流正在排队中...');
    } else {
      log(`工作流状态: ${run.status}`);
    }
    
    // 如果还没完成，等待下次检查
    if (!completed) {
      log(`等待 ${CHECK_INTERVAL / 1000} 秒后进行下次检查...`);
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    }
  }
  
  if (!completed) {
    log(`达到最大检查次数 (${MAX_CHECKS})，停止监控`);
  }
  
  log('CI/CD状态监控结束');
}

// 运行监控
monitorCI().catch(error => {
  log(`监控过程中发生错误: ${error.message}`);
  process.exit(1);
});