/**
 * 动态超时管理器
 * 提供测试执行监控、超时预警和优雅处理功能
 */

import { EventEmitter } from 'events';

export interface TimeoutConfig {
  testName: string;
  timeout: number;
  warningThreshold?: number; // 预警阈值（百分比，如0.8表示80%）
  retryCount?: number;
  retryDelay?: number;
}

export interface ExecutionMetrics {
  testName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'running' | 'completed' | 'timeout' | 'failed';
  memoryUsage?: NodeJS.MemoryUsage;
  warnings: string[];
  retryCount: number;
}

export interface TimeoutWarning {
  testName: string;
  elapsed: number;
  timeout: number;
  percentage: number;
  timestamp: Date;
}

/**
 * 超时管理器类
 */
export class TimeoutManager extends EventEmitter {
  private static instance: TimeoutManager;
  private testTimeouts = new Map<string, TimeoutConfig>();
  private executionMetrics = new Map<string, ExecutionMetrics>();
  private activeTimers = new Map<string, NodeJS.Timeout>();
  private warningTimers = new Map<string, NodeJS.Timeout>();

  private constructor() {
    super();
    this.setupDefaultTimeouts();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): TimeoutManager {
    if (!TimeoutManager.instance) {
      TimeoutManager.instance = new TimeoutManager();
    }
    return TimeoutManager.instance;
  }

  /**
   * 设置测试超时配置
   */
  setTestTimeout(testName: string, timeout: number, options: Partial<TimeoutConfig> = {}): void {
    const config: TimeoutConfig = {
      testName,
      timeout,
      warningThreshold: options.warningThreshold || 0.8,
      retryCount: options.retryCount || 0,
      retryDelay: options.retryDelay || 1000,
      ...options
    };

    this.testTimeouts.set(testName, config);
    console.log(`⏰ 设置测试超时: ${testName} = ${timeout}ms`);
  }

  /**
   * 获取测试超时配置
   */
  getTestTimeout(testName: string): TimeoutConfig | undefined {
    return this.testTimeouts.get(testName);
  }

  /**
   * 开始监控测试执行
   */
  async monitorTestExecution(testName: string): Promise<ExecutionMetrics> {
    const config = this.testTimeouts.get(testName) || this.getDefaultTimeout(testName);
    
    // 初始化执行指标
    const metrics: ExecutionMetrics = {
      testName,
      startTime: new Date(),
      status: 'running',
      warnings: [],
      retryCount: 0,
      memoryUsage: process.memoryUsage()
    };

    this.executionMetrics.set(testName, metrics);

    // 设置预警定时器
    this.setupWarningTimer(testName, config);

    // 设置超时定时器
    this.setupTimeoutTimer(testName, config);

    console.log(`🔍 开始监控测试执行: ${testName} (超时: ${config.timeout}ms)`);

    return metrics;
  }

  /**
   * 完成测试执行监控
   */
  completeTestExecution(testName: string, status: 'completed' | 'failed' = 'completed'): ExecutionMetrics | undefined {
    const metrics = this.executionMetrics.get(testName);
    if (!metrics) {
      return undefined;
    }

    // 更新执行指标
    metrics.endTime = new Date();
    metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();
    metrics.status = status;
    metrics.memoryUsage = process.memoryUsage();

    // 清理定时器
    this.clearTimers(testName);

    console.log(`✅ 完成测试执行监控: ${testName} (耗时: ${metrics.duration}ms, 状态: ${status})`);

    // 触发完成事件
    this.emit('testCompleted', metrics);

    return metrics;
  }

  /**
   * 处理测试超时
   */
  handleTestTimeout(testName: string): ExecutionMetrics | undefined {
    const metrics = this.executionMetrics.get(testName);
    if (!metrics) {
      return undefined;
    }

    // 更新执行指标
    metrics.endTime = new Date();
    metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();
    metrics.status = 'timeout';
    metrics.memoryUsage = process.memoryUsage();

    console.error(`⏰ 测试超时: ${testName} (耗时: ${metrics.duration}ms)`);

    // 清理定时器
    this.clearTimers(testName);

    // 触发超时事件
    this.emit('testTimeout', metrics);

    return metrics;
  }

  /**
   * 添加超时预警回调
   */
  onTimeoutWarning(callback: (warning: TimeoutWarning) => void): void {
    this.on('timeoutWarning', callback);
  }

  /**
   * 添加测试完成回调
   */
  onTestCompleted(callback: (metrics: ExecutionMetrics) => void): void {
    this.on('testCompleted', callback);
  }

  /**
   * 添加测试超时回调
   */
  onTestTimeout(callback: (metrics: ExecutionMetrics) => void): void {
    this.on('testTimeout', callback);
  }

  /**
   * 获取所有执行指标
   */
  getAllMetrics(): ExecutionMetrics[] {
    return Array.from(this.executionMetrics.values());
  }

  /**
   * 获取特定测试的执行指标
   */
  getTestMetrics(testName: string): ExecutionMetrics | undefined {
    return this.executionMetrics.get(testName);
  }

  /**
   * 获取运行中的测试
   */
  getRunningTests(): ExecutionMetrics[] {
    return Array.from(this.executionMetrics.values()).filter(m => m.status === 'running');
  }

  /**
   * 获取超时的测试
   */
  getTimeoutTests(): ExecutionMetrics[] {
    return Array.from(this.executionMetrics.values()).filter(m => m.status === 'timeout');
  }

  /**
   * 清理指定测试的监控数据
   */
  cleanupTestMonitoring(testName: string): void {
    this.clearTimers(testName);
    this.executionMetrics.delete(testName);
    console.log(`🧹 清理测试监控数据: ${testName}`);
  }

  /**
   * 清理所有监控数据
   */
  cleanupAll(): void {
    // 清理所有定时器
    for (const testName of this.activeTimers.keys()) {
      this.clearTimers(testName);
    }

    // 清理所有指标
    this.executionMetrics.clear();

    console.log('🧹 清理所有超时监控数据');
  }

  /**
   * 动态调整超时时间
   */
  adjustTimeout(testName: string, newTimeout: number, reason?: string): void {
    const config = this.testTimeouts.get(testName);
    if (config) {
      const oldTimeout = config.timeout;
      config.timeout = newTimeout;
      
      // 如果测试正在运行，重新设置定时器
      if (this.executionMetrics.has(testName)) {
        this.clearTimers(testName);
        this.setupWarningTimer(testName, config);
        this.setupTimeoutTimer(testName, config);
      }

      console.log(`⏰ 动态调整超时: ${testName} ${oldTimeout}ms -> ${newTimeout}ms ${reason ? `(${reason})` : ''}`);
    }
  }

  /**
   * 获取超时统计信息
   */
  getTimeoutStatistics(): {
    totalTests: number;
    completedTests: number;
    timeoutTests: number;
    failedTests: number;
    averageDuration: number;
    timeoutRate: number;
  } {
    const allMetrics = this.getAllMetrics();
    const completedMetrics = allMetrics.filter(m => m.status === 'completed');
    const timeoutMetrics = allMetrics.filter(m => m.status === 'timeout');
    const failedMetrics = allMetrics.filter(m => m.status === 'failed');

    const totalDuration = completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const averageDuration = completedMetrics.length > 0 ? totalDuration / completedMetrics.length : 0;
    const timeoutRate = allMetrics.length > 0 ? timeoutMetrics.length / allMetrics.length : 0;

    return {
      totalTests: allMetrics.length,
      completedTests: completedMetrics.length,
      timeoutTests: timeoutMetrics.length,
      failedTests: failedMetrics.length,
      averageDuration,
      timeoutRate
    };
  }

  /**
   * 设置默认超时配置
   */
  private setupDefaultTimeouts(): void {
    // 根据测试类型设置不同的默认超时
    const defaultTimeouts = [
      { pattern: /unit/, timeout: 5000 },
      { pattern: /integration/, timeout: 10000 },
      { pattern: /e2e/, timeout: 30000 },
      { pattern: /performance/, timeout: 60000 },
      { pattern: /database/, timeout: 15000 },
      { pattern: /api/, timeout: 10000 }
    ];

    // 注册默认超时配置
    for (const config of defaultTimeouts) {
      this.setTestTimeout(`default-${config.pattern.source}`, config.timeout);
    }
  }

  /**
   * 获取默认超时配置
   */
  private getDefaultTimeout(testName: string): TimeoutConfig {
    // 根据测试名称匹配默认超时
    if (testName.includes('unit')) {
      return { testName, timeout: 5000, warningThreshold: 0.8 };
    } else if (testName.includes('integration')) {
      return { testName, timeout: 10000, warningThreshold: 0.8 };
    } else if (testName.includes('e2e')) {
      return { testName, timeout: 30000, warningThreshold: 0.8 };
    } else if (testName.includes('performance')) {
      return { testName, timeout: 60000, warningThreshold: 0.9 };
    } else if (testName.includes('database')) {
      return { testName, timeout: 15000, warningThreshold: 0.8 };
    } else {
      return { testName, timeout: 10000, warningThreshold: 0.8 };
    }
  }

  /**
   * 设置预警定时器
   */
  private setupWarningTimer(testName: string, config: TimeoutConfig): void {
    if (!config.warningThreshold) return;

    const warningTime = config.timeout * config.warningThreshold;
    
    const warningTimer = setTimeout(() => {
      const metrics = this.executionMetrics.get(testName);
      if (metrics && metrics.status === 'running') {
        const elapsed = Date.now() - metrics.startTime.getTime();
        const warning: TimeoutWarning = {
          testName,
          elapsed,
          timeout: config.timeout,
          percentage: elapsed / config.timeout,
          timestamp: new Date()
        };

        metrics.warnings.push(`超时预警: ${elapsed}ms / ${config.timeout}ms (${(warning.percentage * 100).toFixed(1)}%)`);
        
        console.warn(`⚠️ 测试超时预警: ${testName} (${elapsed}ms / ${config.timeout}ms)`);
        
        // 触发预警事件
        this.emit('timeoutWarning', warning);
      }
    }, warningTime);

    this.warningTimers.set(testName, warningTimer);
  }

  /**
   * 设置超时定时器
   */
  private setupTimeoutTimer(testName: string, config: TimeoutConfig): void {
    const timeoutTimer = setTimeout(() => {
      this.handleTestTimeout(testName);
    }, config.timeout);

    this.activeTimers.set(testName, timeoutTimer);
  }

  /**
   * 清理定时器
   */
  private clearTimers(testName: string): void {
    // 清理超时定时器
    const timeoutTimer = this.activeTimers.get(testName);
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      this.activeTimers.delete(testName);
    }

    // 清理预警定时器
    const warningTimer = this.warningTimers.get(testName);
    if (warningTimer) {
      clearTimeout(warningTimer);
      this.warningTimers.delete(testName);
    }
  }
}

// 导出单例实例
export const timeoutManager = TimeoutManager.getInstance();

export default timeoutManager;