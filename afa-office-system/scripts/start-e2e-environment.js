#!/usr/bin/env node

/**
 * E2E测试环境启动脚本
 * 自动启动后端API、前端管理后台，并运行E2E测试
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const config = {
  services: {
    backend: {
      name: '后端API服务',
      port: 5100,
      url: 'http://localhost:5100',
      command: 'pnpm',
      args: ['dev'],
      cwd: path.join(__dirname, '../backend'),
      healthCheck: '/api/v1/health'
    },
    tenantAdmin: {
      name: '租务管理端',
      port: 5000,
      url: 'http://localhost:5000',
      command: 'pnpm',
      args: ['dev'],
      cwd: path.join(__dirname, '../frontend/tenant-admin'),
      healthCheck: '/'
    },
    merchantAdmin: {
      name: '商户管理端',
      port: 5050,
      url: 'http://localhost:5050',
      command: 'pnpm',
      args: ['dev'],
      cwd: path.join(__dirname, '../frontend/merchant-admin'),
      healthCheck: '/'
    }
  },
  timeouts: {
    startup: 120000, // 2分钟启动超时
    healthCheck: 30000, // 30秒健康检查超时
    shutdown: 10000 // 10秒关闭超时
  }
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 检查端口占用
function checkPort(port) {
  try {
    const result = execSync(`netstat -ano | findstr :${port}`, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return result.trim().length > 0;
  } catch (error) {
    return false;
  }
}

// 终止端口占用进程
function killPort(port) {
  try {
    const result = execSync(`netstat -ano | findstr :${port}`, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    if (result.trim()) {
      const lines = result.trim().split('\n');
      const pids = new Set();
      
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0') {
            pids.add(pid);
          }
        }
      });
      
      pids.forEach(pid => {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
          log(`终止进程 PID: ${pid}`);
        } catch (error) {
          // 忽略终止失败的情况
        }
      });
      
      return true;
    }
  } catch (error) {
    return false;
  }
  return false;
}

// 清理所有端口
function cleanupPorts() {
  logInfo('清理端口占用...');
  
  const ports = Object.values(config.services).map(service => service.port);
  let cleaned = false;
  
  ports.forEach(port => {
    if (checkPort(port)) {
      log(`端口 ${port} 被占用，正在清理...`);
      if (killPort(port)) {
        cleaned = true;
        logSuccess(`端口 ${port} 清理完成`);
      } else {
        logWarning(`端口 ${port} 清理失败`);
      }
    }
  });
  
  if (cleaned) {
    // 等待端口释放
    log('等待端口释放...');
    setTimeout(() => {}, 2000);
  }
}

// 健康检查
async function healthCheck(service) {
  const maxAttempts = 30;
  const interval = 2000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(service.url + service.healthCheck);
      if (response.ok || response.status < 500) {
        return true;
      }
    } catch (error) {
      // 继续尝试
    }
    
    if (attempt < maxAttempts) {
      log(`${service.name} 健康检查 ${attempt}/${maxAttempts}...`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  return false;
}

// 启动服务
function startService(serviceKey, service) {
  return new Promise((resolve, reject) => {
    log(`启动 ${service.name}...`, 'cyan');
    
    // 检查工作目录
    if (!fs.existsSync(service.cwd)) {
      reject(new Error(`工作目录不存在: ${service.cwd}`));
      return;
    }
    
    // 启动进程
    const child = spawn(service.command, service.args, {
      cwd: service.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });
    
    let startupOutput = '';
    
    // 监听输出
    child.stdout.on('data', (data) => {
      const output = data.toString();
      startupOutput += output;
      
      // 检查启动成功的标志
      if (output.includes('Local:') || 
          output.includes('Server running') || 
          output.includes('ready') ||
          output.includes('listening')) {
        log(`${service.name} 启动成功`, 'green');
        resolve({ process: child, service });
      }
    });
    
    child.stderr.on('data', (data) => {
      const output = data.toString();
      if (!output.includes('Warning') && !output.includes('deprecated')) {
        log(`${service.name} 错误: ${output}`, 'red');
      }
    });
    
    child.on('error', (error) => {
      reject(new Error(`${service.name} 启动失败: ${error.message}`));
    });
    
    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`${service.name} 异常退出，代码: ${code}`));
      }
    });
    
    // 启动超时
    setTimeout(() => {
      if (!child.killed) {
        reject(new Error(`${service.name} 启动超时`));
      }
    }, config.timeouts.startup);
  });
}

// 启动所有服务
async function startAllServices() {
  const processes = [];
  
  try {
    // 按顺序启动服务
    for (const [key, service] of Object.entries(config.services)) {
      const result = await startService(key, service);
      processes.push(result);
      
      // 等待服务就绪
      log(`等待 ${service.name} 就绪...`);
      const isHealthy = await healthCheck(service);
      
      if (isHealthy) {
        logSuccess(`${service.name} 就绪 (${service.url})`);
      } else {
        throw new Error(`${service.name} 健康检查失败`);
      }
    }
    
    return processes;
  } catch (error) {
    // 清理已启动的进程
    processes.forEach(({ process }) => {
      if (process && !process.killed) {
        process.kill('SIGTERM');
      }
    });
    throw error;
  }
}

// 运行E2E测试
async function runE2ETests() {
  logInfo('运行E2E测试...');
  
  try {
    const testCommand = process.argv.includes('--headed') 
      ? 'pnpm test:e2e:headed'
      : 'pnpm test:e2e';
    
    execSync(testCommand, {
      cwd: path.join(__dirname, '../backend'),
      stdio: 'inherit'
    });
    
    logSuccess('E2E测试完成');
    return true;
  } catch (error) {
    logError(`E2E测试失败: ${error.message}`);
    return false;
  }
}

// 关闭所有服务
function shutdownServices(processes) {
  logInfo('关闭服务...');
  
  processes.forEach(({ process, service }) => {
    if (process && !process.killed) {
      log(`关闭 ${service.name}...`);
      process.kill('SIGTERM');
      
      // 强制关闭超时
      setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGKILL');
        }
      }, config.timeouts.shutdown);
    }
  });
}

// 主函数
async function main() {
  log('🚀 启动AFA办公小程序E2E测试环境', 'bright');
  
  let processes = [];
  let success = false;
  
  try {
    // 1. 清理端口
    cleanupPorts();
    
    // 2. 启动所有服务
    logInfo('启动服务...');
    processes = await startAllServices();
    
    logSuccess('所有服务启动完成！');
    log('服务地址:', 'bright');
    Object.values(config.services).forEach(service => {
      log(`  - ${service.name}: ${service.url}`, 'cyan');
    });
    
    // 3. 运行E2E测试
    if (process.argv.includes('--test')) {
      success = await runE2ETests();
    } else {
      logInfo('服务已启动，按 Ctrl+C 停止');
      logInfo('运行测试请使用: node start-e2e-environment.js --test');
      
      // 保持运行
      process.stdin.resume();
      success = true;
    }
    
  } catch (error) {
    logError(`启动失败: ${error.message}`);
  } finally {
    // 4. 清理
    if (processes.length > 0) {
      shutdownServices(processes);
    }
  }
  
  if (success) {
    logSuccess('E2E环境运行完成');
    process.exit(0);
  } else {
    logError('E2E环境运行失败');
    process.exit(1);
  }
}

// 处理中断信号
process.on('SIGINT', () => {
  log('\n收到中断信号，正在关闭...', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n收到终止信号，正在关闭...', 'yellow');
  process.exit(0);
});

// 显示帮助
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
AFA办公小程序E2E测试环境启动器

用法:
  node start-e2e-environment.js [选项]

选项:
  --test          启动服务后自动运行E2E测试
  --headed        运行测试时显示浏览器界面
  --help, -h      显示帮助信息

示例:
  # 只启动服务
  node start-e2e-environment.js

  # 启动服务并运行测试
  node start-e2e-environment.js --test

  # 启动服务并运行有头测试
  node start-e2e-environment.js --test --headed

服务地址:
  - 后端API: http://localhost:5100
  - 租务管理端: http://localhost:5000
  - 商户管理端: http://localhost:5050
  `);
  process.exit(0);
}

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    logError(`未处理的错误: ${error.message}`);
    process.exit(1);
  });
}

export { startAllServices, runE2ETests, shutdownServices };