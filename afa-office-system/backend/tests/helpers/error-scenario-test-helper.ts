/**
 * 错误场景测试辅助工具
 * 用于模拟各种错误场景和网络问题
 */

import { IntegrationTestHelper } from './integration-test-helper.js';

export interface NetworkTimeoutOptions {
  endpoint: string;
  timeout: number;
}

export interface ServerErrorOptions {
  endpoint: string;
  errorType: string;
}

export interface DatabaseErrorOptions {
  errorType: string;
  duration: number;
}

export interface HighLoadOptions {
  concurrentRequests: number;
  duration: number;
}

export interface TemporaryErrorOptions {
  endpoint: string;
  duration: number;
  errorType: string;
}

export interface ErrorLog {
  errorType: string;
  endpoint: string;
  timestamp: string;
  details?: any;
}

export class ErrorScenarioTestHelper {
  private testHelper: IntegrationTestHelper;
  private errorLogs: ErrorLog[] = [];
  private activeScenarios: Map<string, any> = new Map();

  constructor(testHelper: IntegrationTestHelper) {
    this.testHelper = testHelper;
  }

  /**
   * 模拟网络超时
   */
  async simulateNetworkTimeout(options: NetworkTimeoutOptions): Promise<{ restore: () => Promise<void> }> {
    const scenarioId = `timeout_${Date.now()}`;
    
    // 记录错误日志
    this.errorLogs.push({
      errorType: 'network_timeout',
      endpoint: options.endpoint,
      timestamp: new Date().toISOString(),
      details: { timeout: options.timeout }
    });

    // 模拟超时场景
    const scenario = {
      type: 'timeout',
      endpoint: options.endpoint,
      timeout: options.timeout
    };

    this.activeScenarios.set(scenarioId, scenario);

    return {
      restore: async () => {
        this.activeScenarios.delete(scenarioId);
      }
    };
  }

  /**
   * 模拟服务器错误
   */
  async simulateServerError(options: ServerErrorOptions): Promise<{ restore: () => Promise<void> }> {
    const scenarioId = `server_error_${Date.now()}`;
    
    // 记录错误日志
    this.errorLogs.push({
      errorType: options.errorType,
      endpoint: options.endpoint,
      timestamp: new Date().toISOString()
    });

    // 模拟服务器错误场景
    const scenario = {
      type: 'server_error',
      endpoint: options.endpoint,
      errorType: options.errorType
    };

    this.activeScenarios.set(scenarioId, scenario);

    return {
      restore: async () => {
        this.activeScenarios.delete(scenarioId);
      }
    };
  }

  /**
   * 模拟数据库错误
   */
  async simulateDatabaseError(options: DatabaseErrorOptions): Promise<{ restore: () => Promise<void> }> {
    const scenarioId = `db_error_${Date.now()}`;
    
    // 记录错误日志
    this.errorLogs.push({
      errorType: options.errorType,
      endpoint: 'database',
      timestamp: new Date().toISOString(),
      details: { duration: options.duration }
    });

    // 模拟数据库错误场景
    const scenario = {
      type: 'database_error',
      errorType: options.errorType,
      duration: options.duration
    };

    this.activeScenarios.set(scenarioId, scenario);

    return {
      restore: async () => {
        this.activeScenarios.delete(scenarioId);
      }
    };
  }

  /**
   * 模拟高负载场景
   */
  async simulateHighLoad(options: HighLoadOptions): Promise<{ restore: () => Promise<void> }> {
    const scenarioId = `high_load_${Date.now()}`;
    
    // 记录错误日志
    this.errorLogs.push({
      errorType: 'high_load',
      endpoint: 'system',
      timestamp: new Date().toISOString(),
      details: { 
        concurrentRequests: options.concurrentRequests,
        duration: options.duration 
      }
    });

    // 模拟高负载场景
    const scenario = {
      type: 'high_load',
      concurrentRequests: options.concurrentRequests,
      duration: options.duration
    };

    this.activeScenarios.set(scenarioId, scenario);

    return {
      restore: async () => {
        this.activeScenarios.delete(scenarioId);
      }
    };
  }

  /**
   * 模拟临时错误
   */
  async simulateTemporaryError(options: TemporaryErrorOptions): Promise<{ restore: () => Promise<void> }> {
    const scenarioId = `temp_error_${Date.now()}`;
    
    // 记录错误日志
    this.errorLogs.push({
      errorType: options.errorType,
      endpoint: options.endpoint,
      timestamp: new Date().toISOString(),
      details: { duration: options.duration }
    });

    // 模拟临时错误场景
    const scenario = {
      type: 'temporary_error',
      endpoint: options.endpoint,
      errorType: options.errorType,
      duration: options.duration
    };

    this.activeScenarios.set(scenarioId, scenario);

    // 自动恢复
    setTimeout(() => {
      this.activeScenarios.delete(scenarioId);
    }, options.duration);

    return {
      restore: async () => {
        this.activeScenarios.delete(scenarioId);
      }
    };
  }

  /**
   * 获取错误日志
   */
  getErrorLogs(): ErrorLog[] {
    return [...this.errorLogs];
  }

  /**
   * 清除错误日志
   */
  clearErrorLogs(): void {
    this.errorLogs = [];
  }

  /**
   * 获取活动场景
   */
  getActiveScenarios(): Map<string, any> {
    return new Map(this.activeScenarios);
  }

  /**
   * 检查是否有活动场景
   */
  hasActiveScenarios(): boolean {
    return this.activeScenarios.size > 0;
  }

  /**
   * 清理所有场景
   */
  async cleanup(): Promise<void> {
    // 清理所有活动场景
    this.activeScenarios.clear();
    
    // 清理错误日志
    this.errorLogs = [];
  }

  /**
   * 等待指定时间
   */
  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 模拟网络延迟
   */
  async simulateNetworkDelay(delayMs: number): Promise<void> {
    await this.wait(delayMs);
  }

  /**
   * 模拟间歇性错误
   */
  async simulateIntermittentError(
    errorProbability: number = 0.3,
    errorType: string = 'network_error'
  ): Promise<{ restore: () => void }> {
    const scenarioId = `intermittent_${Date.now()}`;
    
    const scenario = {
      type: 'intermittent_error',
      probability: errorProbability,
      errorType: errorType
    };

    this.activeScenarios.set(scenarioId, scenario);

    return {
      restore: () => {
        this.activeScenarios.delete(scenarioId);
      }
    };
  }

  /**
   * 检查错误场景是否应该触发
   */
  shouldTriggerError(endpoint: string): boolean {
    for (const [, scenario] of this.activeScenarios) {
      if (scenario.endpoint === endpoint || scenario.type === 'high_load') {
        return true;
      }
      
      if (scenario.type === 'intermittent_error') {
        return Math.random() < scenario.probability;
      }
    }
    
    return false;
  }

  /**
   * 获取错误响应
   */
  getErrorResponse(endpoint: string): any {
    for (const [, scenario] of this.activeScenarios) {
      if (scenario.endpoint === endpoint) {
        switch (scenario.type) {
          case 'timeout':
            return {
              status: 408,
              body: {
                success: false,
                message: '请求超时',
                code: 1008,
                data: { retryAfter: 5000 }
              }
            };
          
          case 'server_error':
            return {
              status: 500,
              body: {
                success: false,
                message: '服务器内部错误',
                code: 1001
              }
            };
          
          case 'database_error':
            return {
              status: 503,
              body: {
                success: false,
                message: '数据库连接失败',
                code: 1002
              }
            };
          
          default:
            return {
              status: 500,
              body: {
                success: false,
                message: '未知错误',
                code: 1000
              }
            };
        }
      }
    }

    // 高负载场景
    for (const [, scenario] of this.activeScenarios) {
      if (scenario.type === 'high_load') {
        return {
          status: 503,
          body: {
            success: false,
            message: '服务降级',
            code: 1009,
            data: { degradationLevel: 'high' }
          }
        };
      }
    }

    return null;
  }

  /**
   * 生成错误统计报告
   */
  generateErrorReport(): any {
    const errorTypes = new Map<string, number>();
    const endpoints = new Map<string, number>();
    
    for (const log of this.errorLogs) {
      errorTypes.set(log.errorType, (errorTypes.get(log.errorType) || 0) + 1);
      endpoints.set(log.endpoint, (endpoints.get(log.endpoint) || 0) + 1);
    }

    return {
      totalErrors: this.errorLogs.length,
      errorsByType: Object.fromEntries(errorTypes),
      errorsByEndpoint: Object.fromEntries(endpoints),
      activeScenarios: this.activeScenarios.size,
      logs: this.errorLogs
    };
  }
}