/**
 * 测试环境管理器
 * 统一管理测试环境中的服务启动、停止、健康检查等操作
 */

import { spawn, ChildProcess, exec } from 'child_process';
import { promisify } from 'util';
import { getCurrentEnvironment, EnvironmentConfig } from '../config/environments';

const execAsync = promisify(exec);

export interface ServiceConfig {
  name: string;
  command: string;
  args?: string[];
  cwd?: string;
  port: number;
  healthCheckUrl: string;
  env?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface ServiceInstance {
  config: ServiceConfig;
  process?: ChildProcess;
  status: 'stopped' | 'starting' | 'running' | 'failed';
  pid?: number;
  startTime?: Date;
  lastHealthCheck?: Date;
}

export class TestEnvironmentManager {
  private services: Map<string, ServiceInstance> = new Map();
  private envConfig: EnvironmentConfig;
  private isShuttingDown = false;

  constructor() {
    this.envConfig = getCurrentEnvironment();
    this.setupSignalHandlers();
  }

  /**
   * 启动所有服务
   */
  async startAllServices(): Promise<void> {
    console.log('🚀 启动测试环境服务...');
    
    const services = this.getServiceConfigs();
    
    // 按依赖顺序启动服务
    for (const serviceConfig of services) {
      await this.startService(serviceConfig);
    }
    
    console.log('✅ 所有服务启动完成');
  }

  /**
   * 停止所有服务
   */
  async stopAllServices(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    
    console.log('🛑 停止测试环境服务...');
    
    const stopPromises = Array.from(this.services.values()).map(service => 
      this.stopService(service.config.name)
    );
    
    await Promise.allSettled(stopPromises);
    console.log('✅ 所有服务已停止');
  }

  /**
   * 启动单个服务
   */
  async startService(config: ServiceConfig): Promise<void> {
    const serviceName = config.name;
    console.log(`🔄 启动服务: ${serviceName}`);
    
    // 检查端口是否被占用
    if (await this.isPortInUse(config.port)) {
      console.log(`⚠️ 端口 ${config.port} 已被占用，尝试清理...`);
      await this.killProcessOnPort(config.port);
    }
    
    const serviceInstance: ServiceInstance = {
      config,
      status: 'starting',
      startTime: new Date(),
    };
    
    this.services.set(serviceName, serviceInstance);
    
    try {
      // 启动进程
      const childProcess = spawn(config.command, config.args || [], {
        cwd: config.cwd,
        env: { ...process.env, ...config.env },
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      });
      
      serviceInstance.process = childProcess;
      serviceInstance.pid = childProcess.pid;
      
      // 设置进程事件监听
      this.setupProcessHandlers(serviceInstance);
      
      // 等待服务启动
      await this.waitForServiceReady(serviceInstance);
      
      serviceInstance.status = 'running';
      console.log(`✅ 服务启动成功: ${serviceName} (PID: ${childProcess.pid})`);
      
    } catch (error) {
      serviceInstance.status = 'failed';
      console.error(`❌ 服务启动失败: ${serviceName}`, error);
      throw error;
    }
  }

  /**
   * 停止单个服务
   */
  async stopService(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service || service.status === 'stopped') {
      return;
    }
    
    console.log(`🛑 停止服务: ${serviceName}`);
    
    try {
      if (service.process && service.pid) {
        // 优雅关闭
        service.process.kill('SIGTERM');
        
        // 等待进程结束
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            // 强制关闭
            if (service.process && !service.process.killed) {
              service.process.kill('SIGKILL');
            }
            resolve();
          }, 5000);
          
          service.process!.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }
      
      service.status = 'stopped';
      console.log(`✅ 服务已停止: ${serviceName}`);
      
    } catch (error) {
      console.error(`❌ 停止服务失败: ${serviceName}`, error);
    }
  }

  /**
   * 重启服务
   */
  async restartService(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }
    
    await this.stopService(serviceName);
    await this.startService(service.config);
  }

  /**
   * 检查服务健康状态
   */
  async checkServiceHealth(serviceName: string): Promise<boolean> {
    const service = this.services.get(serviceName);
    if (!service || service.status !== 'running') {
      return false;
    }
    
    try {
      const response = await fetch(service.config.healthCheckUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      
      const isHealthy = response.ok || response.status === 404;
      service.lastHealthCheck = new Date();
      
      return isHealthy;
    } catch (error) {
      console.warn(`⚠️ 服务健康检查失败: ${serviceName}`, error);
      return false;
    }
  }

  /**
   * 检查所有服务健康状态
   */
  async checkAllServicesHealth(): Promise<Record<string, boolean>> {
    const healthStatus: Record<string, boolean> = {};
    
    for (const serviceName of this.services.keys()) {
      healthStatus[serviceName] = await this.checkServiceHealth(serviceName);
    }
    
    return healthStatus;
  }

  /**
   * 获取服务状态
   */
  getServiceStatus(serviceName: string): ServiceInstance | undefined {
    return this.services.get(serviceName);
  }

  /**
   * 获取所有服务状态
   */
  getAllServicesStatus(): Record<string, ServiceInstance> {
    const status: Record<string, ServiceInstance> = {};
    
    for (const [name, service] of this.services.entries()) {
      status[name] = { ...service };
    }
    
    return status;
  }

  /**
   * 等待服务准备就绪
   */
  private async waitForServiceReady(service: ServiceInstance): Promise<void> {
    const maxRetries = service.config.retries || 30;
    const timeout = service.config.timeout || 2000;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(service.config.healthCheckUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        
        if (response.ok || response.status === 404) {
          return;
        }
      } catch (error) {
        // 继续重试
      }
      
      await new Promise(resolve => setTimeout(resolve, timeout));
    }
    
    throw new Error(`Service ${service.config.name} failed to start within timeout`);
  }

  /**
   * 检查端口是否被占用
   */
  private async isPortInUse(port: number): Promise<boolean> {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        return stdout.trim().length > 0;
      } else {
        const { stdout } = await execAsync(`lsof -i :${port}`);
        return stdout.trim().length > 0;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * 终止占用端口的进程
   */
  private async killProcessOnPort(port: number): Promise<void> {
    try {
      if (process.platform === 'win32') {
        // Windows
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        const lines = stdout.trim().split('\n');
        
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          
          if (pid && !isNaN(Number(pid))) {
            await execAsync(`taskkill /PID ${pid} /F`);
            console.log(`🔪 终止进程 PID ${pid} (端口 ${port})`);
          }
        }
      } else {
        // Unix/Linux/macOS
        await execAsync(`lsof -ti :${port} | xargs kill -9`);
        console.log(`🔪 终止占用端口 ${port} 的进程`);
      }
    } catch (error) {
      console.warn(`⚠️ 终止端口 ${port} 进程失败:`, error);
    }
  }

  /**
   * 设置进程事件处理
   */
  private setupProcessHandlers(service: ServiceInstance): void {
    if (!service.process) return;
    
    service.process.stdout?.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        console.log(`[${service.config.name}] ${message}`);
      }
    });
    
    service.process.stderr?.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        console.error(`[${service.config.name}] ${message}`);
      }
    });
    
    service.process.on('exit', (code, signal) => {
      console.log(`[${service.config.name}] 进程退出 (code: ${code}, signal: ${signal})`);
      service.status = 'stopped';
    });
    
    service.process.on('error', (error) => {
      console.error(`[${service.config.name}] 进程错误:`, error);
      service.status = 'failed';
    });
  }

  /**
   * 设置信号处理器
   */
  private setupSignalHandlers(): void {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`\n收到信号 ${signal}，正在关闭服务...`);
        await this.stopAllServices();
        process.exit(0);
      });
    });
    
    process.on('uncaughtException', async (error) => {
      console.error('未捕获的异常:', error);
      await this.stopAllServices();
      process.exit(1);
    });
    
    process.on('unhandledRejection', async (reason) => {
      console.error('未处理的Promise拒绝:', reason);
      await this.stopAllServices();
      process.exit(1);
    });
  }

  /**
   * 获取服务配置
   */
  private getServiceConfigs(): ServiceConfig[] {
    const configs: ServiceConfig[] = [];
    
    // 仅在本地环境启动服务
    if (this.envConfig.name === 'Local Development') {
      configs.push(
        {
          name: 'backend-api',
          command: 'pnpm',
          args: ['dev'],
          cwd: '../backend',
          port: 5100,
          healthCheckUrl: 'http://localhost:5100/api/v1/health',
          env: {
            NODE_ENV: 'test',
            PORT: '5100',
          },
          timeout: 2000,
          retries: 30,
        },
        {
          name: 'tenant-admin',
          command: 'pnpm',
          args: ['dev'],
          cwd: '../frontend/tenant-admin',
          port: 5000,
          healthCheckUrl: 'http://localhost:5000',
          env: {
            NODE_ENV: 'test',
            VITE_PORT: '5000',
            VITE_API_BASE_URL: 'http://localhost:5100/api/v1',
          },
          timeout: 2000,
          retries: 30,
        },
        {
          name: 'merchant-admin',
          command: 'pnpm',
          args: ['dev'],
          cwd: '../frontend/merchant-admin',
          port: 5050,
          healthCheckUrl: 'http://localhost:5050',
          env: {
            NODE_ENV: 'test',
            VITE_PORT: '5050',
            VITE_API_BASE_URL: 'http://localhost:5100/api/v1',
          },
          timeout: 2000,
          retries: 30,
        }
      );
    }
    
    return configs;
  }
}