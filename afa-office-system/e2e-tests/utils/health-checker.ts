/**
 * 服务健康检查器
 * 提供服务健康状态监控和自动重启功能
 */

import { TestEnvironmentManager } from './test-environment-manager';
import { getCurrentEnvironment } from '../config/environments';

export interface HealthCheckResult {
  serviceName: string;
  isHealthy: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  timestamp: Date;
}

export interface HealthCheckConfig {
  interval: number; // 检查间隔（毫秒）
  timeout: number; // 超时时间（毫秒）
  retries: number; // 重试次数
  autoRestart: boolean; // 是否自动重启失败的服务
}

export class HealthChecker {
  private environmentManager: TestEnvironmentManager;
  private config: HealthCheckConfig;
  private checkInterval?: NodeJS.Timeout;
  private isRunning = false;
  private healthHistory: Map<string, HealthCheckResult[]> = new Map();

  constructor(
    environmentManager: TestEnvironmentManager,
    config: Partial<HealthCheckConfig> = {}
  ) {
    this.environmentManager = environmentManager;
    this.config = {
      interval: 30000, // 30秒
      timeout: 5000, // 5秒
      retries: 3,
      autoRestart: true,
      ...config,
    };
  }

  /**
   * 开始健康检查监控
   */
  startMonitoring(): void {
    if (this.isRunning) {
      console.log('⚠️ 健康检查监控已在运行');
      return;
    }

    console.log(`🔍 开始服务健康检查监控 (间隔: ${this.config.interval}ms)`);
    this.isRunning = true;

    // 立即执行一次检查
    this.performHealthCheck();

    // 设置定期检查
    this.checkInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.interval);
  }

  /**
   * 停止健康检查监控
   */
  stopMonitoring(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 停止服务健康检查监控');
    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  /**
   * 执行单次健康检查
   */
  async performHealthCheck(): Promise<HealthCheckResult[]> {
    const services = this.environmentManager.getAllServicesStatus();
    const results: HealthCheckResult[] = [];

    for (const [serviceName, serviceInstance] of Object.entries(services)) {
      if (serviceInstance.status !== 'running') {
        continue;
      }

      const result = await this.checkServiceHealth(serviceName, serviceInstance.config.healthCheckUrl);
      results.push(result);

      // 记录健康检查历史
      this.recordHealthHistory(serviceName, result);

      // 处理不健康的服务
      if (!result.isHealthy) {
        await this.handleUnhealthyService(serviceName, result);
      }
    }

    return results;
  }

  /**
   * 检查单个服务健康状态
   */
  async checkServiceHealth(serviceName: string, healthCheckUrl: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const result: HealthCheckResult = {
      serviceName,
      isHealthy: false,
      responseTime: 0,
      timestamp: new Date(),
    };

    try {
      const response = await fetch(healthCheckUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.timeout),
        headers: {
          'User-Agent': 'AFA-E2E-HealthChecker/1.0',
        },
      });

      result.responseTime = Date.now() - startTime;
      result.statusCode = response.status;
      result.isHealthy = response.ok || response.status === 404;

      if (!result.isHealthy) {
        result.error = `HTTP ${response.status}: ${response.statusText}`;
      }

    } catch (error) {
      result.responseTime = Date.now() - startTime;
      result.error = error instanceof Error ? error.message : String(error);
      result.isHealthy = false;
    }

    return result;
  }

  /**
   * 处理不健康的服务
   */
  private async handleUnhealthyService(serviceName: string, result: HealthCheckResult): Promise<void> {
    console.warn(`⚠️ 服务健康检查失败: ${serviceName}`, {
      error: result.error,
      responseTime: result.responseTime,
      statusCode: result.statusCode,
    });

    // 检查是否需要自动重启
    if (this.config.autoRestart && this.shouldRestartService(serviceName)) {
      console.log(`🔄 自动重启不健康的服务: ${serviceName}`);
      
      try {
        await this.environmentManager.restartService(serviceName);
        console.log(`✅ 服务重启成功: ${serviceName}`);
      } catch (error) {
        console.error(`❌ 服务重启失败: ${serviceName}`, error);
      }
    }
  }

  /**
   * 判断是否应该重启服务
   */
  private shouldRestartService(serviceName: string): boolean {
    const history = this.healthHistory.get(serviceName) || [];
    
    // 如果最近的检查都失败了，则重启
    const recentChecks = history.slice(-this.config.retries);
    const allFailed = recentChecks.length >= this.config.retries && 
                     recentChecks.every(check => !check.isHealthy);

    return allFailed;
  }

  /**
   * 记录健康检查历史
   */
  private recordHealthHistory(serviceName: string, result: HealthCheckResult): void {
    if (!this.healthHistory.has(serviceName)) {
      this.healthHistory.set(serviceName, []);
    }

    const history = this.healthHistory.get(serviceName)!;
    history.push(result);

    // 只保留最近的100条记录
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * 获取服务健康历史
   */
  getHealthHistory(serviceName: string): HealthCheckResult[] {
    return this.healthHistory.get(serviceName) || [];
  }

  /**
   * 获取所有服务的健康历史
   */
  getAllHealthHistory(): Record<string, HealthCheckResult[]> {
    const allHistory: Record<string, HealthCheckResult[]> = {};
    
    for (const [serviceName, history] of this.healthHistory.entries()) {
      allHistory[serviceName] = [...history];
    }

    return allHistory;
  }

  /**
   * 获取服务健康统计
   */
  getHealthStatistics(serviceName: string): {
    totalChecks: number;
    successfulChecks: number;
    failedChecks: number;
    successRate: number;
    averageResponseTime: number;
    lastCheckTime?: Date;
    lastSuccessTime?: Date;
  } {
    const history = this.healthHistory.get(serviceName) || [];
    
    const totalChecks = history.length;
    const successfulChecks = history.filter(check => check.isHealthy).length;
    const failedChecks = totalChecks - successfulChecks;
    const successRate = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0;
    
    const responseTimes = history.map(check => check.responseTime);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    const lastCheck = history[history.length - 1];
    const lastSuccessfulCheck = history.slice().reverse().find(check => check.isHealthy);

    return {
      totalChecks,
      successfulChecks,
      failedChecks,
      successRate,
      averageResponseTime,
      lastCheckTime: lastCheck?.timestamp,
      lastSuccessTime: lastSuccessfulCheck?.timestamp,
    };
  }

  /**
   * 生成健康检查报告
   */
  generateHealthReport(): {
    timestamp: Date;
    environment: string;
    services: Record<string, any>;
    summary: {
      totalServices: number;
      healthyServices: number;
      unhealthyServices: number;
      overallHealthRate: number;
    };
  } {
    const envConfig = getCurrentEnvironment();
    const services = this.environmentManager.getAllServicesStatus();
    const serviceReports: Record<string, any> = {};
    
    let healthyCount = 0;
    let totalCount = 0;

    for (const serviceName of Object.keys(services)) {
      const statistics = this.getHealthStatistics(serviceName);
      const recentHistory = this.getHealthHistory(serviceName).slice(-10);
      
      serviceReports[serviceName] = {
        ...statistics,
        recentHistory,
        currentStatus: services[serviceName].status,
      };

      if (services[serviceName].status === 'running') {
        totalCount++;
        if (recentHistory.length > 0 && recentHistory[recentHistory.length - 1].isHealthy) {
          healthyCount++;
        }
      }
    }

    return {
      timestamp: new Date(),
      environment: envConfig.name,
      services: serviceReports,
      summary: {
        totalServices: totalCount,
        healthyServices: healthyCount,
        unhealthyServices: totalCount - healthyCount,
        overallHealthRate: totalCount > 0 ? (healthyCount / totalCount) * 100 : 0,
      },
    };
  }

  /**
   * 等待所有服务健康
   */
  async waitForAllServicesHealthy(timeout = 60000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const results = await this.performHealthCheck();
      const allHealthy = results.every(result => result.isHealthy);
      
      if (allHealthy) {
        console.log('✅ 所有服务都已健康');
        return true;
      }
      
      const unhealthyServices = results
        .filter(result => !result.isHealthy)
        .map(result => result.serviceName);
      
      console.log(`⏳ 等待服务健康: ${unhealthyServices.join(', ')}`);
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.error('❌ 等待服务健康超时');
    return false;
  }
}