/**
 * CI/CD 测试配置管理器
 * 用于管理持续集成环境中的测试配置和环境设置
 */

export interface CITestConfig {
  // 环境配置
  environment: 'ci' | 'local' | 'staging' | 'production';
  
  // 数据库配置
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
  };
  
  // API配置
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  
  // 测试配置
  test: {
    timeout: number;
    parallel: boolean;
    maxWorkers: number;
    coverage: {
      enabled: boolean;
      threshold: number;
      reporters: string[];
    };
  };
  
  // 浏览器配置
  browser: {
    headless: boolean;
    slowMo: number;
    video: boolean;
    screenshot: boolean;
  };
  
  // 通知配置
  notification: {
    enabled: boolean;
    webhookUrl?: string;
    channels: string[];
  };
}

/**
 * CI测试配置管理器
 */
export class CITestConfigManager {
  private static instance: CITestConfigManager;
  private config: CITestConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): CITestConfigManager {
    if (!CITestConfigManager.instance) {
      CITestConfigManager.instance = new CITestConfigManager();
    }
    return CITestConfigManager.instance;
  }

  /**
   * 加载CI测试配置
   */
  private loadConfig(): CITestConfig {
    const isCI = process.env.CI === 'true';
    const environment = process.env.NODE_ENV || 'test';
    
    return {
      environment: isCI ? 'ci' : 'local',
      
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        database: process.env.DB_NAME || 'afa_office_test',
        username: process.env.DB_USER || 'afa_test',
        password: process.env.DB_PASSWORD || 'test_password',
        ssl: process.env.DB_SSL === 'true',
      },
      
      api: {
        baseUrl: process.env.API_BASE_URL || 'http://localhost:5100/api/v1',
        timeout: parseInt(process.env.API_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.API_RETRY_ATTEMPTS || '3'),
        retryDelay: parseInt(process.env.API_RETRY_DELAY || '1000'),
      },
      
      test: {
        timeout: parseInt(process.env.TEST_TIMEOUT || '60000'),
        parallel: process.env.TEST_PARALLEL !== 'false',
        maxWorkers: parseInt(process.env.TEST_MAX_WORKERS || '4'),
        coverage: {
          enabled: process.env.COVERAGE_ENABLED !== 'false',
          threshold: parseInt(process.env.COVERAGE_THRESHOLD || '80'),
          reporters: (process.env.COVERAGE_REPORTERS || 'text,html,json').split(','),
        },
      },
      
      browser: {
        headless: process.env.HEADLESS !== 'false',
        slowMo: parseInt(process.env.SLOW_MO || '0'),
        video: process.env.VIDEO_ENABLED === 'true',
        screenshot: process.env.SCREENSHOT_ENABLED !== 'false',
      },
      
      notification: {
        enabled: process.env.NOTIFICATION_ENABLED === 'true',
        webhookUrl: process.env.NOTIFICATION_WEBHOOK_URL,
        channels: (process.env.NOTIFICATION_CHANNELS || '').split(',').filter(Boolean),
      },
    };
  }

  /**
   * 获取配置
   */
  public getConfig(): CITestConfig {
    return { ...this.config };
  }

  /**
   * 获取数据库配置
   */
  public getDatabaseConfig() {
    return { ...this.config.database };
  }

  /**
   * 获取API配置
   */
  public getApiConfig() {
    return { ...this.config.api };
  }

  /**
   * 获取测试配置
   */
  public getTestConfig() {
    return { ...this.config.test };
  }

  /**
   * 获取浏览器配置
   */
  public getBrowserConfig() {
    return { ...this.config.browser };
  }

  /**
   * 是否为CI环境
   */
  public isCI(): boolean {
    return this.config.environment === 'ci';
  }

  /**
   * 是否启用覆盖率
   */
  public isCoverageEnabled(): boolean {
    return this.config.test.coverage.enabled;
  }

  /**
   * 获取覆盖率阈值
   */
  public getCoverageThreshold(): number {
    return this.config.test.coverage.threshold;
  }

  /**
   * 验证配置
   */
  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证数据库配置
    if (!this.config.database.host) {
      errors.push('数据库主机地址不能为空');
    }
    if (!this.config.database.database) {
      errors.push('数据库名称不能为空');
    }

    // 验证API配置
    if (!this.config.api.baseUrl) {
      errors.push('API基础URL不能为空');
    }

    // 验证测试配置
    if (this.config.test.timeout < 1000) {
      errors.push('测试超时时间不能少于1秒');
    }
    if (this.config.test.coverage.threshold < 0 || this.config.test.coverage.threshold > 100) {
      errors.push('覆盖率阈值必须在0-100之间');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 打印配置信息
   */
  public printConfig(): void {
    console.log('=== CI测试配置信息 ===');
    console.log(`环境: ${this.config.environment}`);
    console.log(`数据库: ${this.config.database.host}:${this.config.database.port}/${this.config.database.database}`);
    console.log(`API: ${this.config.api.baseUrl}`);
    console.log(`测试超时: ${this.config.test.timeout}ms`);
    console.log(`并行测试: ${this.config.test.parallel ? '启用' : '禁用'}`);
    console.log(`覆盖率: ${this.config.test.coverage.enabled ? '启用' : '禁用'} (阈值: ${this.config.test.coverage.threshold}%)`);
    console.log(`浏览器: ${this.config.browser.headless ? '无头模式' : '有头模式'}`);
    console.log('====================');
  }
}

/**
 * 测试环境设置工具
 */
export class CITestEnvironment {
  private config: CITestConfig;

  constructor(config?: CITestConfig) {
    this.config = config || CITestConfigManager.getInstance().getConfig();
  }

  /**
   * 设置测试环境
   */
  public async setup(): Promise<void> {
    console.log('设置CI测试环境...');
    
    // 验证配置
    const validation = CITestConfigManager.getInstance().validateConfig();
    if (!validation.valid) {
      throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
    }

    // 设置环境变量
    this.setEnvironmentVariables();
    
    // 等待服务就绪
    await this.waitForServices();
    
    console.log('CI测试环境设置完成');
  }

  /**
   * 清理测试环境
   */
  public async teardown(): Promise<void> {
    console.log('清理CI测试环境...');
    
    // 这里可以添加清理逻辑
    // 比如清理临时文件、关闭连接等
    
    console.log('CI测试环境清理完成');
  }

  /**
   * 设置环境变量
   */
  private setEnvironmentVariables(): void {
    // 设置数据库环境变量
    process.env.DB_HOST = this.config.database.host;
    process.env.DB_PORT = this.config.database.port.toString();
    process.env.DB_NAME = this.config.database.database;
    process.env.DB_USER = this.config.database.username;
    process.env.DB_PASSWORD = this.config.database.password;

    // 设置API环境变量
    process.env.API_BASE_URL = this.config.api.baseUrl;
    process.env.API_TIMEOUT = this.config.api.timeout.toString();

    // 设置测试环境变量
    process.env.TEST_TIMEOUT = this.config.test.timeout.toString();
    process.env.COVERAGE_THRESHOLD = this.config.test.coverage.threshold.toString();
  }

  /**
   * 等待服务就绪
   */
  private async waitForServices(): Promise<void> {
    const maxAttempts = 30;
    const delay = 2000;

    // 等待数据库就绪
    console.log('等待数据库服务就绪...');
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // 这里可以添加数据库连接测试
        console.log(`数据库连接测试 (${i + 1}/${maxAttempts})`);
        break;
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error('数据库服务启动超时');
        }
        await this.sleep(delay);
      }
    }

    // 等待API服务就绪
    console.log('等待API服务就绪...');
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${this.config.api.baseUrl}/health`);
        if (response.ok) {
          console.log('API服务就绪');
          break;
        }
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error('API服务启动超时');
        }
        console.log(`等待API服务 (${i + 1}/${maxAttempts})`);
        await this.sleep(delay);
      }
    }
  }

  /**
   * 延时工具
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 测试报告生成器
 */
export class CITestReporter {
  private config: CITestConfig;

  constructor(config?: CITestConfig) {
    this.config = config || CITestConfigManager.getInstance().getConfig();
  }

  /**
   * 生成测试报告
   */
  public async generateReport(results: TestResults): Promise<TestReport> {
    const report: TestReport = {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      summary: this.generateSummary(results),
      coverage: results.coverage,
      details: results.details,
      artifacts: results.artifacts,
    };

    // 保存报告
    await this.saveReport(report);
    
    // 发送通知
    if (this.config.notification.enabled) {
      await this.sendNotification(report);
    }

    return report;
  }

  /**
   * 生成测试摘要
   */
  private generateSummary(results: TestResults): TestSummary {
    const total = results.details.length;
    const passed = results.details.filter(test => test.status === 'passed').length;
    const failed = results.details.filter(test => test.status === 'failed').length;
    const skipped = results.details.filter(test => test.status === 'skipped').length;

    return {
      total,
      passed,
      failed,
      skipped,
      passRate: total > 0 ? (passed / total) * 100 : 0,
      duration: results.details.reduce((sum, test) => sum + test.duration, 0),
    };
  }

  /**
   * 保存测试报告
   */
  private async saveReport(report: TestReport): Promise<void> {
    // 这里可以实现报告保存逻辑
    // 比如保存到文件系统、数据库或云存储
    console.log('保存测试报告:', report.timestamp);
  }

  /**
   * 发送通知
   */
  private async sendNotification(report: TestReport): Promise<void> {
    if (!this.config.notification.webhookUrl) {
      return;
    }

    const message = this.formatNotificationMessage(report);
    
    try {
      await fetch(this.config.notification.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      console.log('测试结果通知发送成功');
    } catch (error) {
      console.error('发送测试结果通知失败:', error);
    }
  }

  /**
   * 格式化通知消息
   */
  private formatNotificationMessage(report: TestReport): any {
    const { summary } = report;
    const status = summary.failed > 0 ? '失败' : '成功';
    const emoji = summary.failed > 0 ? '❌' : '✅';

    return {
      text: `${emoji} 前后端集成测试${status}`,
      attachments: [
        {
          color: summary.failed > 0 ? 'danger' : 'good',
          fields: [
            {
              title: '测试结果',
              value: `总计: ${summary.total}, 通过: ${summary.passed}, 失败: ${summary.failed}, 跳过: ${summary.skipped}`,
              short: false,
            },
            {
              title: '通过率',
              value: `${summary.passRate.toFixed(1)}%`,
              short: true,
            },
            {
              title: '执行时间',
              value: `${(summary.duration / 1000).toFixed(1)}秒`,
              short: true,
            },
          ],
        },
      ],
    };
  }
}

// 类型定义
export interface TestResults {
  coverage?: CoverageReport;
  details: TestDetail[];
  artifacts: string[];
}

export interface TestDetail {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

export interface TestReport {
  timestamp: string;
  environment: string;
  summary: TestSummary;
  coverage?: CoverageReport;
  details: TestDetail[];
  artifacts: string[];
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  duration: number;
}

export interface CoverageReport {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}