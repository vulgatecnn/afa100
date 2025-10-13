#!/usr/bin/env node

/**
 * CI/CD 测试环境管理脚本
 * 用于自动化创建、管理和销毁测试环境
 */

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * 测试环境管理器
 */
class CITestEnvironmentManager {
  constructor() {
    this.config = this.loadConfig();
    this.processes = new Map();
    this.cleanup = [];
  }

  /**
   * 加载配置
   */
  loadConfig() {
    const isCI = process.env.CI === 'true';
    const environment = process.env.NODE_ENV || 'test';
    
    return {
      isCI,
      environment,
      ports: {
        backend: parseInt(process.env.BACKEND_PORT || '5100'),
        frontend: parseInt(process.env.FRONTEND_PORT || '5000'),
        mysql: parseInt(process.env.MYSQL_PORT || '3306'),
      },
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        name: process.env.DB_NAME || 'afa_office_test',
        user: process.env.DB_USER || 'afa_test',
        password: process.env.DB_PASSWORD || 'test_password',
      },
      timeouts: {
        service: 30000, // 30秒
        database: 60000, // 60秒
        build: 300000, // 5分钟
      },
    };
  }

  /**
   * 创建测试环境
   */
  async createEnvironment() {
    console.log('🚀 开始创建CI测试环境...');
    
    try {
      // 1. 验证环境
      await this.validateEnvironment();
      
      // 2. 准备数据库
      await this.setupDatabase();
      
      // 3. 构建应用
      await this.buildApplications();
      
      // 4. 启动服务
      await this.startServices();
      
      // 5. 验证服务
      await this.verifyServices();
      
      console.log('✅ CI测试环境创建成功');
      return true;
    } catch (error) {
      console.error('❌ CI测试环境创建失败:', error.message);
      await this.destroyEnvironment();
      throw error;
    }
  }

  /**
   * 销毁测试环境
   */
  async destroyEnvironment() {
    console.log('🧹 开始清理CI测试环境...');
    
    try {
      // 停止所有服务
      await this.stopServices();
      
      // 清理数据库
      await this.cleanupDatabase();
      
      // 执行清理任务
      await this.executeCleanupTasks();
      
      console.log('✅ CI测试环境清理完成');
    } catch (error) {
      console.error('⚠️ 清理过程中出现错误:', error.message);
    }
  }

  /**
   * 验证环境
   */
  async validateEnvironment() {
    console.log('🔍 验证环境依赖...');
    
    // 检查Node.js版本
    const nodeVersion = process.version;
    console.log(`Node.js版本: ${nodeVersion}`);
    
    // 检查pnpm
    try {
      const pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
      console.log(`pnpm版本: ${pnpmVersion}`);
    } catch (error) {
      throw new Error('pnpm未安装或不可用');
    }
    
    // 检查端口可用性
    await this.checkPortAvailability();
    
    console.log('✅ 环境验证通过');
  }

  /**
   * 检查端口可用性
   */
  async checkPortAvailability() {
    const ports = Object.values(this.config.ports);
    
    for (const port of ports) {
      const isAvailable = await this.isPortAvailable(port);
      if (!isAvailable) {
        console.log(`⚠️ 端口 ${port} 被占用，尝试释放...`);
        await this.killProcessOnPort(port);
      }
    }
  }

  /**
   * 检查端口是否可用
   */
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const net = require('net');
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      
      server.on('error', () => resolve(false));
    });
  }

  /**
   * 终止占用端口的进程
   */
  async killProcessOnPort(port) {
    try {
      if (process.platform === 'win32') {
        execSync(`netstat -ano | findstr :${port} | for /f "tokens=5" %a in ('more') do taskkill /PID %a /F`, { stdio: 'ignore' });
      } else {
        execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
      }
      console.log(`✅ 端口 ${port} 已释放`);
    } catch (error) {
      console.log(`⚠️ 无法释放端口 ${port}: ${error.message}`);
    }
  }

  /**
   * 设置数据库
   */
  async setupDatabase() {
    console.log('🗄️ 设置测试数据库...');
    
    if (this.config.isCI) {
      // CI环境中，MySQL服务由Docker容器提供
      await this.waitForMySQLService();
    }
    
    // 初始化数据库
    await this.initializeDatabase();
    
    console.log('✅ 数据库设置完成');
  }

  /**
   * 等待MySQL服务就绪
   */
  async waitForMySQLService() {
    console.log('⏳ 等待MySQL服务就绪...');
    
    const maxAttempts = 30;
    const delay = 2000;
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        execSync(`mysqladmin ping -h ${this.config.database.host} -P ${this.config.database.port} -u root -p${this.config.database.password}`, { stdio: 'ignore' });
        console.log('✅ MySQL服务就绪');
        return;
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error('MySQL服务启动超时');
        }
        console.log(`等待MySQL服务 (${i + 1}/${maxAttempts})`);
        await this.sleep(delay);
      }
    }
  }

  /**
   * 初始化数据库
   */
  async initializeDatabase() {
    const backendDir = join(rootDir, 'afa-office-system/backend');
    
    try {
      // 复制测试环境配置
      const envFile = this.config.isCI ? '.env.integration' : '.env.test';
      const envPath = join(backendDir, envFile);
      const targetEnvPath = join(backendDir, '.env');
      
      if (existsSync(envPath)) {
        const envContent = readFileSync(envPath, 'utf8');
        writeFileSync(targetEnvPath, envContent);
        console.log(`✅ 复制环境配置: ${envFile} -> .env`);
      }
      
      // 初始化数据库
      execSync('pnpm db:integration:init', { 
        cwd: backendDir, 
        stdio: 'inherit',
        timeout: this.config.timeouts.database 
      });
      
      console.log('✅ 数据库初始化完成');
    } catch (error) {
      throw new Error(`数据库初始化失败: ${error.message}`);
    }
  }

  /**
   * 构建应用
   */
  async buildApplications() {
    console.log('🔨 构建应用...');
    
    // 构建后端
    await this.buildBackend();
    
    // 构建前端（如果存在）
    await this.buildFrontend();
    
    console.log('✅ 应用构建完成');
  }

  /**
   * 构建后端
   */
  async buildBackend() {
    const backendDir = join(rootDir, 'afa-office-system/backend');
    
    try {
      console.log('📦 构建后端应用...');
      execSync('pnpm build', { 
        cwd: backendDir, 
        stdio: 'inherit',
        timeout: this.config.timeouts.build 
      });
      console.log('✅ 后端构建完成');
    } catch (error) {
      throw new Error(`后端构建失败: ${error.message}`);
    }
  }

  /**
   * 构建前端
   */
  async buildFrontend() {
    const frontendDirs = [
      'afa-office-system/frontend/tenant-admin',
      'afa-office-system/frontend/merchant-admin'
    ];
    
    for (const dir of frontendDirs) {
      const frontendDir = join(rootDir, dir);
      
      if (existsSync(frontendDir)) {
        try {
          console.log(`📦 构建前端应用: ${dir}...`);
          execSync('pnpm build', { 
            cwd: frontendDir, 
            stdio: 'inherit',
            timeout: this.config.timeouts.build 
          });
          console.log(`✅ ${dir} 构建完成`);
        } catch (error) {
          console.log(`⚠️ ${dir} 构建失败: ${error.message}`);
        }
      }
    }
  }

  /**
   * 启动服务
   */
  async startServices() {
    console.log('🚀 启动服务...');
    
    // 启动后端服务
    await this.startBackendService();
    
    console.log('✅ 服务启动完成');
  }

  /**
   * 启动后端服务
   */
  async startBackendService() {
    const backendDir = join(rootDir, 'afa-office-system/backend');
    
    return new Promise((resolve, reject) => {
      console.log('🚀 启动后端服务...');
      
      const process = spawn('pnpm', ['start'], {
        cwd: backendDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });
      
      this.processes.set('backend', process);
      
      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Server running on port') || output.includes('服务器运行在端口')) {
          console.log('✅ 后端服务启动成功');
          resolve();
        }
      });
      
      process.stderr.on('data', (data) => {
        console.error('后端服务错误:', data.toString());
      });
      
      process.on('error', (error) => {
        reject(new Error(`后端服务启动失败: ${error.message}`));
      });
      
      // 超时处理
      setTimeout(() => {
        if (!this.processes.has('backend')) {
          reject(new Error('后端服务启动超时'));
        }
      }, this.config.timeouts.service);
    });
  }

  /**
   * 验证服务
   */
  async verifyServices() {
    console.log('🔍 验证服务状态...');
    
    // 验证后端API
    await this.verifyBackendAPI();
    
    console.log('✅ 服务验证通过');
  }

  /**
   * 验证后端API
   */
  async verifyBackendAPI() {
    const apiUrl = `http://localhost:${this.config.ports.backend}/api/v1/health`;
    const maxAttempts = 15;
    const delay = 2000;
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(apiUrl);
        if (response.ok) {
          console.log('✅ 后端API验证通过');
          return;
        }
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error('后端API验证失败');
        }
        console.log(`等待后端API就绪 (${i + 1}/${maxAttempts})`);
        await this.sleep(delay);
      }
    }
  }

  /**
   * 停止服务
   */
  async stopServices() {
    console.log('🛑 停止服务...');
    
    for (const [name, process] of this.processes) {
      try {
        console.log(`停止 ${name} 服务...`);
        process.kill('SIGTERM');
        
        // 等待进程结束
        await new Promise((resolve) => {
          process.on('exit', resolve);
          setTimeout(() => {
            process.kill('SIGKILL');
            resolve();
          }, 5000);
        });
        
        console.log(`✅ ${name} 服务已停止`);
      } catch (error) {
        console.error(`停止 ${name} 服务失败:`, error.message);
      }
    }
    
    this.processes.clear();
  }

  /**
   * 清理数据库
   */
  async cleanupDatabase() {
    const backendDir = join(rootDir, 'afa-office-system/backend');
    
    try {
      console.log('🧹 清理测试数据库...');
      execSync('pnpm db:integration:clean', { 
        cwd: backendDir, 
        stdio: 'inherit' 
      });
      console.log('✅ 数据库清理完成');
    } catch (error) {
      console.error('数据库清理失败:', error.message);
    }
  }

  /**
   * 执行清理任务
   */
  async executeCleanupTasks() {
    for (const task of this.cleanup) {
      try {
        await task();
      } catch (error) {
        console.error('清理任务执行失败:', error.message);
      }
    }
    this.cleanup = [];
  }

  /**
   * 添加清理任务
   */
  addCleanupTask(task) {
    this.cleanup.push(task);
  }

  /**
   * 延时工具
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 主函数
 */
async function main() {
  const command = process.argv[2];
  const manager = new CITestEnvironmentManager();
  
  // 注册清理处理器
  process.on('SIGINT', async () => {
    console.log('\n收到中断信号，开始清理...');
    await manager.destroyEnvironment();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n收到终止信号，开始清理...');
    await manager.destroyEnvironment();
    process.exit(0);
  });
  
  try {
    switch (command) {
      case 'create':
        await manager.createEnvironment();
        break;
        
      case 'destroy':
        await manager.destroyEnvironment();
        break;
        
      case 'recreate':
        await manager.destroyEnvironment();
        await manager.createEnvironment();
        break;
        
      default:
        console.log('用法: node ci-test-environment.js <create|destroy|recreate>');
        console.log('');
        console.log('命令:');
        console.log('  create    创建测试环境');
        console.log('  destroy   销毁测试环境');
        console.log('  recreate  重新创建测试环境');
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

export { CITestEnvironmentManager };