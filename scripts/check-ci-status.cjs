#!/usr/bin/env node

const { execSync } = require('child_process');

function checkCIStatus(runId) {
  try {
    const output = execSync(`gh run view ${runId}`, { encoding: 'utf-8' });
    console.log(output);
    return output;
  } catch (error) {
    console.error('Error checking CI status:', error.message);
    return null;
  }
}

function checkJobDetails(jobId) {
  try {
    const output = execSync(`gh run view --job=${jobId}`, { encoding: 'utf-8' });
    console.log(output);
    return output;
  } catch (error) {
    console.error('Error checking job details:', error.message);
    return null;
  }
}

// 获取最新的运行ID
function getLatestRunId() {
  try {
    const output = execSync('gh run list --limit 1', { encoding: 'utf-8' });
    const lines = output.trim().split('\n');
    if (lines.length > 1) {
      const columns = lines[1].split(/\s+/);
      return columns[6]; // ID列
    }
    return null;
  } catch (error) {
    console.error('Error getting latest run ID:', error.message);
    return null;
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  let runId = args[0];
  
  if (!runId) {
    console.log('No run ID provided, fetching latest...');
    runId = getLatestRunId();
    if (!runId) {
      console.error('Could not fetch latest run ID');
      process.exit(1);
    }
    console.log(`Using run ID: ${runId}`);
  }
  
  console.log(`Checking CI status for run ${runId}...\n`);
  
  const status = checkCIStatus(runId);
  if (status) {
    // 提取作业ID并检查详细信息
    const jobIdMatch = status.match(/ID (\d+)/);
    if (jobIdMatch) {
      const jobId = jobIdMatch[1];
      console.log(`\nChecking job details for job ${jobId}...\n`);
      checkJobDetails(jobId);
    }
  }
}

main().catch(console.error);