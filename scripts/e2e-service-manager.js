#!/usr/bin/env node

/**
 * E2E 测试服务启动管理器
 * 自动化管理测试环境中的所有服务启动、健康检查和优雅关闭
 */

import { spawn, execSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * E2E 服务管理器
 */
class E2EServiceManager {
  constructor(options = {}) {
    this.config = {
      // 服务端口配置
      ports: {
        backend: 5100,
        tenantAdmin: 5000,
        merchantAdmin: 5050,
      },
      
      // 服务启动超时时间 (毫秒)
      timeouts: {
        startup: 60000,    // 60秒
        healthCheck: 30000, // 30秒
        shutdown: 10000,   // 10秒
      },
      
      // 健康检查配置
      healthCheck: {
        interval: 2000,    // 2秒检查一次
        maxRetries: 15,    // 最多重试15次
      },
      
      // 日志配置
      logging: {
        enabled: options.verbose !== false,
        logFile: join(rootDir, 'logs', 'e2e-services.log'),
      },
      
      // 环境配置
      environment: options.environment || 'test',
      
      ...options,
    };
    
    this.services = new Map();
    this.isShuttingDown = false;
    this.startupPromises = new Map();
    
    // 确保日志目录存在
    this.ensureLogDirectory();
    
    // 注册清理处理器
    this.registerCleanupHandlers();
  }  /**

   * 启动所有服务
   */
  async startAllServices() {
    this.log('🚀 开始启动E2E测试环境服务...');
    
    try {
      // 1. 检查和清理端口
      await this.checkAndCleanPorts();
      
      // 2. 按顺序启动服务
      await this.startBackendService();
      await this.startFrontendServices();
      
      // 3. 验证所有服务健康状态
      await this.verifyAllServices();
      
      this.log('✅ 所有E2E测试服务启动成功');
      return true;
      
    } catch (error) {
      this.log(`❌ 服务启动失败: ${error.message}`, 'error');
      await this.stopAllServices();
      throw error;
    }
  }

  /**
   * 停止所有服务
   */
  async stopAllServices() {
    if (this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    this.log('🛑 开始停止所有服务...');
    
    const stopPromises = [];
    
    for (const [serviceName, serviceInfo] of this.services) {
      stopPromises.push(this.stopService(serviceName, serviceInfo));
    }
    
    await Promise.allSettled(stopPromises);
    
    this.services.clear();
    this.log('✅ 所有服务已停止');
  }

  /**
   * 检查和清理端口
   */
  async checkAndCleanPorts() {
    this.log('🔍 检查端口占用情况...');
    
    const ports = Object.values(this.config.ports);
    const cleanupPromises = [];
    
    for (const port of ports) {
      const isOccupied = await this.isPortOccupied(port);
      if (isOccupied) {
        this.log(`⚠️ 端口 ${port} 被占用，尝试清理...`);
        cleanupPromises.push(this.killProcessOnPort(port));
      }
    }
    
    if (cleanupPromises.length > 0) {
      await Promise.allSettled(cleanupPromises);
      // 等待端口释放
      await this.sleep(2000);
    }
    
    this.log('✅ 端口检查完成');
  }

  /**
   * 启动后端服务
   */
  async startBackendService() {
    const serviceName = 'backend';
    const port = this.config.ports.backend;
    const workingDir = join(rootDir, 'afa-office-system/backend');
    
    this.log(`🚀 启动后端服务 (端口 ${port})...`);
    
    // 检查工作目录
    if (!existsSync(workingDir)) {
      throw new Error(`后端目录不存在: ${workingDir}`);
    }
    
    // 启动服务进程
    const process = spawn('pnpm', ['dev'], {
      cwd: workingDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      env: {
        ...process.env,
        NODE_ENV: this.config.environment,
        PORT: port.toString(),
      },
    });
    
    const serviceInfo = {
      name: serviceName,
      port,
      process,
      workingDir,
      startTime: Date.now(),
      status: 'starting',
    };
    
    this.services.set(serviceName, serviceInfo);
    
    // 监听进程输出
    this.setupProcessLogging(serviceName, process);
    
    // 等待服务启动
    await this.waitForServiceStartup(serviceName, serviceInfo);
    
    this.log(`✅ 后端服务启动成功 (PID: ${process.pid})`);
  }  /**
   *
 启动前端服务
   */
  async startFrontendServices() {
    const frontendServices = [
      {
        name: 'tenant-admin',
        port: this.config.ports.tenantAdmin,
        dir: 'afa-office-system/frontend/tenant-admin',
      },
      {
        name: 'merchant-admin', 
        port: this.config.ports.merchantAdmin,
        dir: 'afa-office-system/frontend/merchant-admin',
      },
    ];
    
    // 并行启动前端服务
    const startupPromises = frontendServices.map(service => 
      this.startFrontendService(service)
    );
    
    await Promise.all(startupPromises);
  }

  /**
   * 启动单个前端服务
   */
  async startFrontendService(serviceConfig) {
    const { name, port, dir } = serviceConfig;
    const workingDir = join(rootDir, dir);
    
    this.log(`🚀 启动${name}服务 (端口 ${port})...`);
    
    // 检查工作目录
    if (!existsSync(workingDir)) {
      this.log(`⚠️ 前端目录不存在，跳过: ${workingDir}`);
      return;
    }
    
    // 启动服务进程
    const process = spawn('pnpm', ['dev'], {
      cwd: workingDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      env: {
        ...process.env,
        NODE_ENV: this.config.environment,
        VITE_PORT: port.toString(),
        PORT: port.toString(),
      },
    });
    
    const serviceInfo = {
      name,
      port,
      process,
      workingDir,
      startTime: Date.now(),
      status: 'starting',
    };
    
    this.services.set(name, serviceInfo);
    
    // 监听进程输出
    this.setupProcessLogging(name, process);
    
    // 等待服务启动
    await this.waitForServiceStartup(name, serviceInfo);
    
    this.log(`✅ ${name}服务启动成功 (PID: ${process.pid})`);
  }

  /**
   * 等待服务启动
   */
  async waitForServiceStartup(serviceName, serviceInfo) {
    const { port } = serviceInfo;
    const startTime = Date.now();
    const timeout = this.config.timeouts.startup;
    
    return new Promise((resolve, reject) => {
      const checkStartup = async () => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed > timeout) {
          serviceInfo.status = 'failed';
          reject(new Error(`${serviceName} 服务启动超时 (${timeout}ms)`));
          return;
        }
        
        try {
          // 检查进程是否还在运行
          if (serviceInfo.process.killed || serviceInfo.process.exitCode !== null) {
            serviceInfo.status = 'failed';
            reject(new Error(`${serviceName} 进程意外退出`));
            return;
          }
          
          // 检查端口是否可访问
          const isReady = await this.checkServiceHealth(serviceName, port);
          
          if (isReady) {
            serviceInfo.status = 'running';
            resolve();
          } else {
            setTimeout(checkStartup, this.config.healthCheck.interval);
          }
        } catch (error) {
          setTimeout(checkStartup, this.config.healthCheck.interval);
        }
      };
      
      checkStartup();
    });
  }  /**
  
 * 检查服务健康状态
   */
  async checkServiceHealth(serviceName, port) {
    try {
      // 对于后端服务，检查健康检查端点
      if (serviceName === 'backend') {
        const response = await fetch(`http://localhost:${port}/api/v1/health`, {
          timeout: 5000,
        });
        return response.ok;
      }
      
      // 对于前端服务，检查端口是否响应
      const response = await fetch(`http://localhost:${port}`, {
        timeout: 5000,
      });
      return response.status < 500; // 允许404等状态，只要服务在响应
      
    } catch (error) {
      return false;
    }
  }

  /**
   * 验证所有服务
   */
  async verifyAllServices() {
    this.log('🔍 验证所有服务健康状态...');
    
    const verificationPromises = [];
    
    for (const [serviceName, serviceInfo] of this.services) {
      verificationPromises.push(
        this.verifyService(serviceName, serviceInfo)
      );
    }
    
    const results = await Promise.allSettled(verificationPromises);
    
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      const errorMessages = failures.map(failure => failure.reason.message);
      throw new Error(`服务验证失败: ${errorMessages.join(', ')}`);
    }
    
    this.log('✅ 所有服务验证通过');
  }

  /**
   * 验证单个服务
   */
  async verifyService(serviceName, serviceInfo) {
    const { port } = serviceInfo;
    const maxRetries = this.config.healthCheck.maxRetries;
    
    for (let i = 0; i < maxRetries; i++) {
      const isHealthy = await this.checkServiceHealth(serviceName, port);
      
      if (isHealthy) {
        this.log(`✅ ${serviceName} 服务验证通过`);
        return;
      }
      
      if (i < maxRetries - 1) {
        await this.sleep(this.config.healthCheck.interval);
      }
    }
    
    throw new Error(`${serviceName} 服务健康检查失败`);
  }

  /**
   * 停止单个服务
   */
  async stopService(serviceName, serviceInfo) {
    this.log(`🛑 停止 ${serviceName} 服务...`);
    
    try {
      const { process } = serviceInfo;
      
      if (process && !process.killed) {
        // 发送 SIGTERM 信号
        process.kill('SIGTERM');
        
        // 等待进程优雅退出
        const exitPromise = new Promise((resolve) => {
          process.on('exit', resolve);
        });
        
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            if (!process.killed) {
              this.log(`⚠️ ${serviceName} 优雅关闭超时，强制终止`);
              process.kill('SIGKILL');
            }
            resolve();
          }, this.config.timeouts.shutdown);
        });
        
        await Promise.race([exitPromise, timeoutPromise]);
      }
      
      this.log(`✅ ${serviceName} 服务已停止`);
      
    } catch (error) {
      this.log(`⚠️ 停止 ${serviceName} 服务时出错: ${error.message}`, 'error');
    }
  }  /**

   * 设置进程日志监听
   */
  setupProcessLogging(serviceName, process) {
    if (!this.config.logging.enabled) {
      return;
    }
    
    process.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        this.log(`[${serviceName}] ${output}`);
      }
    });
    
    process.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        this.log(`[${serviceName}] ERROR: ${output}`, 'error');
      }
    });
    
    process.on('error', (error) => {
      this.log(`[${serviceName}] 进程错误: ${error.message}`, 'error');
    });
    
    process.on('exit', (code, signal) => {
      this.log(`[${serviceName}] 进程退出: code=${code}, signal=${signal}`);
    });
  }

  /**
   * 检查端口是否被占用
   */
  async isPortOccupied(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => resolve(false));
        server.close();
      });
      
      server.on('error', () => resolve(true));
    });
  }

  /**
   * 终止占用端口的进程
   */
  async killProcessOnPort(port) {
    try {
      if (process.platform === 'win32') {
        // Windows 系统
        const output = execSync(`netstat -ano | findstr :${port}`, { 
          encoding: 'utf8',
          stdio: 'pipe' 
        });
        
        const lines = output.split('\n').filter(line => line.trim());
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(pid)) {
            execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
          }
        }
      } else {
        // Unix 系统
        execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
      }
      
      this.log(`✅ 端口 ${port} 已清理`);
    } catch (error) {
      this.log(`⚠️ 清理端口 ${port} 失败: ${error.message}`);
    }
  }

  /**
   * 获取服务状态
   */
  getServiceStatus() {
    const status = {};
    
    for (const [serviceName, serviceInfo] of this.services) {
      status[serviceName] = {
        name: serviceInfo.name,
        port: serviceInfo.port,
        status: serviceInfo.status,
        pid: serviceInfo.process?.pid,
        uptime: serviceInfo.startTime ? Date.now() - serviceInfo.startTime : 0,
      };
    }
    
    return status;
  }

  /**
   * 等待指定时间
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }  /**
 
  * 日志记录
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (this.config.logging.enabled) {
      console.log(logMessage);
    }
    
    // 写入日志文件
    try {
      const logEntry = `${logMessage}\n`;
      writeFileSync(this.config.logging.logFile, logEntry, { flag: 'a' });
    } catch (error) {
      // 忽略日志写入错误
    }
  }

  /**
   * 确保日志目录存在
   */
  ensureLogDirectory() {
    const logDir = dirname(this.config.logging.logFile);
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * 注册清理处理器
   */
  registerCleanupHandlers() {
    const cleanup = async () => {
      if (!this.isShuttingDown) {
        await this.stopAllServices();
      }
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('beforeExit', cleanup);
    
    // 处理未捕获的异常
    process.on('uncaughtException', async (error) => {
      this.log(`未捕获的异常: ${error.message}`, 'error');
      await this.stopAllServices();
      process.exit(1);
    });
    
    process.on('unhandledRejection', async (reason) => {
      this.log(`未处理的Promise拒绝: ${reason}`, 'error');
      await this.stopAllServices();
      process.exit(1);
    });
  }
}

/**
 * 主函数
 */
async function main() {
  const command = process.argv[2] || 'start';
  const options = {
    verbose: !process.argv.includes('--quiet'),
    environment: process.env.NODE_ENV || 'test',
  };
  
  const manager = new E2EServiceManager(options);
  
  try {
    switch (command) {
      case 'start':
        await manager.startAllServices();
        
        // 保持进程运行，直到收到停止信号
        console.log('\n按 Ctrl+C 停止所有服务\n');
        
        // 定期输出服务状态
        const statusInterval = setInterval(() => {
          const status = manager.getServiceStatus();
          console.log('\n📊 服务状态:');
          for (const [name, info] of Object.entries(status)) {
            const uptime = Math.floor(info.uptime / 1000);
            console.log(`  ${name}: ${info.status} (端口 ${info.port}, 运行时间 ${uptime}s)`);
          }
        }, 30000); // 每30秒输出一次
        
        // 等待停止信号
        await new Promise(() => {}); // 永远等待
        
        clearInterval(statusInterval);
        break;
        
      case 'stop':
        await manager.stopAllServices();
        break;
        
      case 'status':
        const status = manager.getServiceStatus();
        console.log('📊 服务状态:');
        console.log(JSON.stringify(status, null, 2));
        break;
        
      case 'health':
        await manager.verifyAllServices();
        console.log('✅ 所有服务健康检查通过');
        break;
        
      default:
        console.log('用法: node e2e-service-manager.js <start|stop|status|health>');
        console.log('');
        console.log('命令:');
        console.log('  start   启动所有E2E测试服务');
        console.log('  stop    停止所有服务');
        console.log('  status  查看服务状态');
        console.log('  health  检查服务健康状态');
        console.log('');
        console.log('选项:');
        console.log('  --quiet 静默模式，减少日志输出');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { E2EServiceManager };