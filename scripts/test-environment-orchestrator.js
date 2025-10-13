#!/usr/bin/env node

/**
 * 测试环境编排器
 * 统一管理测试环境的创建、配置、监控和销毁
 */

import { CITestEnvironmentManager } from './ci-test-environment.js';
import { TestDataManager } from '../shared/test-helpers/test-data-manager.js';
import { TestResultsStorage } from '../shared/test-helpers/test-results-storage.js';
import { CITestNotificationManager } from '../shared/test-helpers/ci-notification.js';
import { execSync, spawn } from 'child_process';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * 测试环境编排器
 */
class TestEnvironmentOrchestrator {
  constructor() {
    this.config = this.loadConfig();
    this.environmentManager = new CITestEnvironmentManager();
    this.dataManager = new TestDataManager();
    this.resultsStorage = new TestResultsStorage();
    this.notificationManager = new CITestNotificationManager();
    
    this.activeEnvironments = new Map();
    this.testSessions = new Map();
    this.cleanup = [];
  }

  /**
   * 加载配置
   */
  loadConfig() {
    const isCI = process.env.CI === 'true';
    
    return {
      isCI,
      environment: process.env.NODE_ENV || 'test',
      parallel: process.env.TEST_PARALLEL !== 'false',
      maxConcurrency: parseInt(process.env.TEST_MAX_CONCURRENCY || '4'),
      timeout: parseInt(process.env.TEST_TIMEOUT || '300000'), // 5分钟
      retryAttempts: parseInt(process.env.TEST_RETRY_ATTEMPTS || '2'),
      
      // 环境配置
      environments: {
        unit: {
          database: false,
          services: [],
          ports: [],
        },
        integration: {
          database: true,
          services: ['backend'],
          ports: [5100],
        },
        e2e: {
          database: true,
          services: ['backend', 'frontend'],
          ports: [5100, 5000, 5050],
        },
      },
      
      // 数据管理
      dataManagement: {
        snapshotBeforeTests: process.env.SNAPSHOT_BEFORE_TESTS === 'true',
        restoreAfterTests: process.env.RESTORE_AFTER_TESTS === 'true',
        cleanupAfterTests: process.env.CLEANUP_AFTER_TESTS !== 'false',
      },
      
      // 通知配置
      notifications: {
        onStart: process.env.NOTIFY_ON_START === 'true',
        onComplete: process.env.NOTIFY_ON_COMPLETE !== 'false',
        onFailure: process.env.NOTIFY_ON_FAILURE !== 'false',
      },
    };
  }

  /**
   * 执行完整的测试流程
   */
  async executeTestPipeline(options = {}) {
    const sessionId = this.generateSessionId();
    const startTime = Date.now();
    
    console.log(`🚀 开始测试流程: ${sessionId}`);
    
    try {
      // 1. 初始化测试会话
      await this.initializeTestSession(sessionId, options);
      
      // 2. 准备测试环境
      await this.prepareTestEnvironment(sessionId);
      
      // 3. 执行测试
      const results = await this.executeTests(sessionId, options);
      
      // 4. 收集和分析结果
      await this.collectAndAnalyzeResults(sessionId, results);
      
      // 5. 发送通知
      if (this.config.notifications.onComplete) {
        await this.sendCompletionNotification(sessionId, results);
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ 测试流程完成: ${sessionId} (${(duration / 1000).toFixed(1)}秒)`);
      
      return results;
      
    } catch (error) {
      console.error(`❌ 测试流程失败: ${sessionId}`, error.message);
      
      // 发送失败通知
      if (this.config.notifications.onFailure) {
        await this.sendFailureNotification(sessionId, error);
      }
      
      throw error;
      
    } finally {
      // 清理测试环境
      await this.cleanupTestSession(sessionId);
    }
  }

  /**
   * 初始化测试会话
   */
  async initializeTestSession(sessionId, options) {
    console.log(`📋 初始化测试会话: ${sessionId}`);
    
    const session = {
      id: sessionId,
      startTime: new Date().toISOString(),
      options,
      status: 'initializing',
      environments: [],
      snapshots: [],
      results: null,
    };
    
    this.testSessions.set(sessionId, session);
    
    // 发送开始通知
    if (this.config.notifications.onStart) {
      await this.sendStartNotification(sessionId);
    }
    
    // 创建会话目录
    const sessionDir = join(rootDir, 'test-sessions', sessionId);
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }
    
    // 保存会话信息
    writeFileSync(
      join(sessionDir, 'session.json'),
      JSON.stringify(session, null, 2)
    );
    
    console.log(`✅ 测试会话初始化完成: ${sessionId}`);
  }

  /**
   * 准备测试环境
   */
  async prepareTestEnvironment(sessionId) {
    console.log(`🔧 准备测试环境: ${sessionId}`);
    
    const session = this.testSessions.get(sessionId);
    const testTypes = session.options.testTypes || ['unit', 'integration', 'e2e'];
    
    for (const testType of testTypes) {
      const envConfig = this.config.environments[testType];
      if (!envConfig) {
        console.log(`⚠️ 未知的测试类型: ${testType}`);
        continue;
      }
      
      console.log(`🏗️ 准备 ${testType} 测试环境...`);
      
      // 创建数据快照（如果需要）
      let snapshotId = null;
      if (envConfig.database && this.config.dataManagement.snapshotBeforeTests) {
        snapshotId = await this.dataManager.createSnapshot(
          `${sessionId}-${testType}-before`,
          `测试前数据快照 - ${testType}`
        );
        session.snapshots.push(snapshotId);
      }
      
      // 创建环境
      const environmentId = await this.createEnvironment(testType, envConfig);
      session.environments.push({
        id: environmentId,
        type: testType,
        config: envConfig,
        snapshotId,
      });
    }
    
    // 更新会话状态
    session.status = 'ready';
    this.updateSession(sessionId, session);
    
    console.log(`✅ 测试环境准备完成: ${sessionId}`);
  }

  /**
   * 创建测试环境
   */
  async createEnvironment(type, config) {
    const environmentId = `env-${type}-${Date.now()}`;
    
    console.log(`🌍 创建测试环境: ${environmentId}`);
    
    try {
      // 初始化数据库（如果需要）
      if (config.database) {
        await this.dataManager.initializeTestData();
      }
      
      // 启动服务（如果需要）
      const services = [];
      for (const serviceName of config.services) {
        const service = await this.startService(serviceName);
        services.push(service);
      }
      
      // 验证端口可用性
      for (const port of config.ports) {
        await this.waitForPort(port);
      }
      
      const environment = {
        id: environmentId,
        type,
        config,
        services,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      
      this.activeEnvironments.set(environmentId, environment);
      
      console.log(`✅ 测试环境创建成功: ${environmentId}`);
      return environmentId;
      
    } catch (error) {
      console.error(`❌ 测试环境创建失败: ${environmentId}`, error.message);
      throw error;
    }
  }

  /**
   * 执行测试
   */
  async executeTests(sessionId, options) {
    console.log(`🧪 执行测试: ${sessionId}`);
    
    const session = this.testSessions.get(sessionId);
    session.status = 'testing';
    this.updateSession(sessionId, session);
    
    const testResults = {
      sessionId,
      startTime: new Date().toISOString(),
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        passRate: 0,
        status: 'success',
      },
      suites: [],
      coverage: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
        threshold: 80,
        passed: false,
      },
      performance: {
        buildTime: 0,
        testTime: 0,
        setupTime: 0,
        teardownTime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      },
      errors: [],
    };
    
    try {
      const testTypes = options.testTypes || ['unit', 'integration', 'e2e'];
      
      for (const testType of testTypes) {
        console.log(`🔬 执行 ${testType} 测试...`);
        
        const suiteResult = await this.executeTestSuite(testType, options);
        testResults.suites.push(suiteResult);
        
        // 更新汇总数据
        testResults.summary.total += suiteResult.summary.total;
        testResults.summary.passed += suiteResult.summary.passed;
        testResults.summary.failed += suiteResult.summary.failed;
        testResults.summary.skipped += suiteResult.summary.skipped;
        testResults.summary.duration += suiteResult.summary.duration;
      }
      
      // 计算通过率
      if (testResults.summary.total > 0) {
        testResults.summary.passRate = (testResults.summary.passed / testResults.summary.total) * 100;
      }
      
      // 确定整体状态
      if (testResults.summary.failed > 0) {
        testResults.summary.status = 'failure';
      } else if (testResults.summary.skipped > 0) {
        testResults.summary.status = 'warning';
      }
      
      // 收集覆盖率数据
      await this.collectCoverageData(testResults);
      
      testResults.endTime = new Date().toISOString();
      session.results = testResults;
      session.status = 'completed';
      
      console.log(`✅ 测试执行完成: ${sessionId}`);
      console.log(`📊 结果: ${testResults.summary.passed}/${testResults.summary.total} 通过 (${testResults.summary.passRate.toFixed(1)}%)`);
      
      return testResults;
      
    } catch (error) {
      testResults.summary.status = 'failure';
      testResults.errors.push({
        type: 'execution_error',
        message: error.message,
        stack: error.stack,
      });
      
      session.results = testResults;
      session.status = 'failed';
      
      throw error;
    } finally {
      this.updateSession(sessionId, session);
    }
  }

  /**
   * 执行测试套件
   */
  async executeTestSuite(testType, options) {
    const startTime = Date.now();
    
    const suiteResult = {
      name: testType,
      type: testType,
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        passRate: 0,
        status: 'success',
      },
      tests: [],
    };
    
    try {
      let command;
      let cwd;
      
      switch (testType) {
        case 'unit':
          command = 'pnpm test --run --reporter=json';
          cwd = join(rootDir, 'afa-office-system/backend');
          break;
          
        case 'integration':
          command = 'pnpm test:verification --run --reporter=json';
          cwd = join(rootDir, 'afa-office-system/backend');
          break;
          
        case 'e2e':
          command = 'pnpm test:e2e --reporter=json';
          cwd = join(rootDir, 'afa-office-system/backend');
          break;
          
        default:
          throw new Error(`不支持的测试类型: ${testType}`);
      }
      
      console.log(`执行命令: ${command}`);
      console.log(`工作目录: ${cwd}`);
      
      // 执行测试命令
      const result = await this.executeCommand(command, cwd, {
        timeout: this.config.timeout,
        retries: this.config.retryAttempts,
      });
      
      // 解析测试结果
      if (result.stdout) {
        try {
          const testOutput = JSON.parse(result.stdout);
          this.parseTestOutput(testOutput, suiteResult);
        } catch (parseError) {
          console.error('解析测试输出失败:', parseError.message);
          // 如果无法解析JSON，尝试从文本输出中提取信息
          this.parseTextOutput(result.stdout, suiteResult);
        }
      }
      
      suiteResult.summary.duration = Date.now() - startTime;
      
      // 计算通过率
      if (suiteResult.summary.total > 0) {
        suiteResult.summary.passRate = (suiteResult.summary.passed / suiteResult.summary.total) * 100;
      }
      
      // 确定状态
      if (suiteResult.summary.failed > 0) {
        suiteResult.summary.status = 'failure';
      } else if (suiteResult.summary.skipped > 0) {
        suiteResult.summary.status = 'warning';
      }
      
      console.log(`✅ ${testType} 测试完成: ${suiteResult.summary.passed}/${suiteResult.summary.total} 通过`);
      
    } catch (error) {
      console.error(`❌ ${testType} 测试失败:`, error.message);
      
      suiteResult.summary.status = 'failure';
      suiteResult.tests.push({
        name: `${testType}-execution-error`,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
      });
      suiteResult.summary.total = 1;
      suiteResult.summary.failed = 1;
    }
    
    return suiteResult;
  }

  /**
   * 收集和分析结果
   */
  async collectAndAnalyzeResults(sessionId, results) {
    console.log(`📊 收集和分析测试结果: ${sessionId}`);
    
    try {
      // 创建测试结果记录
      const resultRecord = {
        id: this.generateResultId(),
        timestamp: new Date().toISOString(),
        environment: this.config.environment,
        branch: this.getCurrentBranch(),
        commit: this.getCurrentCommit(),
        buildNumber: process.env.BUILD_NUMBER,
        trigger: this.getTriggerType(),
        
        summary: results.summary,
        coverage: results.coverage,
        suites: results.suites,
        performance: results.performance,
        
        system: {
          os: process.platform,
          nodeVersion: process.version,
          pnpmVersion: this.getPnpmVersion(),
          browserVersions: {},
          dependencies: this.getDependencies(),
        },
        
        metadata: {
          sessionId,
          ci: this.config.isCI,
          parallel: this.config.parallel,
          maxConcurrency: this.config.maxConcurrency,
        },
      };
      
      // 存储结果
      await this.resultsStorage.storeResult(resultRecord);
      
      // 生成分析报告
      const analytics = await this.resultsStorage.generateAnalytics();
      
      console.log(`✅ 测试结果收集完成: ${resultRecord.id}`);
      
      return {
        record: resultRecord,
        analytics,
      };
      
    } catch (error) {
      console.error('收集测试结果失败:', error.message);
      throw error;
    }
  }

  /**
   * 清理测试会话
   */
  async cleanupTestSession(sessionId) {
    console.log(`🧹 清理测试会话: ${sessionId}`);
    
    try {
      const session = this.testSessions.get(sessionId);
      
      if (session) {
        // 清理环境
        for (const env of session.environments) {
          await this.destroyEnvironment(env.id);
        }
        
        // 恢复数据快照（如果需要）
        if (this.config.dataManagement.restoreAfterTests && session.snapshots.length > 0) {
          const latestSnapshot = session.snapshots[session.snapshots.length - 1];
          await this.dataManager.restoreSnapshot(latestSnapshot);
        }
        
        // 清理测试数据（如果需要）
        if (this.config.dataManagement.cleanupAfterTests) {
          await this.dataManager.cleanupTestData();
        }
        
        // 更新会话状态
        session.status = 'cleaned';
        session.endTime = new Date().toISOString();
        this.updateSession(sessionId, session);
      }
      
      // 从内存中移除
      this.testSessions.delete(sessionId);
      
      console.log(`✅ 测试会话清理完成: ${sessionId}`);
      
    } catch (error) {
      console.error(`清理测试会话失败: ${sessionId}`, error.message);
    }
  }

  /**
   * 启动服务
   */
  async startService(serviceName) {
    console.log(`🚀 启动服务: ${serviceName}`);
    
    let command, cwd;
    
    switch (serviceName) {
      case 'backend':
        command = 'pnpm start';
        cwd = join(rootDir, 'afa-office-system/backend');
        break;
        
      case 'frontend':
        command = 'pnpm preview';
        cwd = join(rootDir, 'afa-office-system/frontend/tenant-admin');
        break;
        
      default:
        throw new Error(`未知的服务: ${serviceName}`);
    }
    
    const process = spawn('pnpm', command.split(' ').slice(1), {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });
    
    const service = {
      name: serviceName,
      process,
      pid: process.pid,
      startTime: new Date().toISOString(),
    };
    
    // 等待服务启动
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`服务启动超时: ${serviceName}`));
      }, 30000);
      
      process.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Server running') || output.includes('Local:')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      
      process.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    console.log(`✅ 服务启动成功: ${serviceName} (PID: ${process.pid})`);
    return service;
  }

  /**
   * 销毁环境
   */
  async destroyEnvironment(environmentId) {
    console.log(`🗑️ 销毁测试环境: ${environmentId}`);
    
    const environment = this.activeEnvironments.get(environmentId);
    if (!environment) {
      return;
    }
    
    try {
      // 停止服务
      for (const service of environment.services) {
        if (service.process && !service.process.killed) {
          service.process.kill('SIGTERM');
          
          // 等待进程结束
          await new Promise((resolve) => {
            service.process.on('exit', resolve);
            setTimeout(() => {
              if (!service.process.killed) {
                service.process.kill('SIGKILL');
              }
              resolve();
            }, 5000);
          });
        }
      }
      
      // 清理数据库（如果需要）
      if (environment.config.database) {
        await this.dataManager.cleanupTestData();
      }
      
      this.activeEnvironments.delete(environmentId);
      
      console.log(`✅ 测试环境销毁成功: ${environmentId}`);
      
    } catch (error) {
      console.error(`销毁测试环境失败: ${environmentId}`, error.message);
    }
  }

  /**
   * 等待端口可用
   */
  async waitForPort(port, timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`http://localhost:${port}/health`);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // 继续等待
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`端口 ${port} 在 ${timeout}ms 内未响应`);
  }

  /**
   * 执行命令
   */
  async executeCommand(command, cwd, options = {}) {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 60000;
      const retries = options.retries || 0;
      
      const attempt = (attemptNumber) => {
        console.log(`执行命令 (尝试 ${attemptNumber + 1}/${retries + 1}): ${command}`);
        
        const child = execSync(command, {
          cwd,
          encoding: 'utf8',
          timeout,
          stdio: 'pipe',
        });
        
        try {
          const result = {
            stdout: child.toString(),
            stderr: '',
            code: 0,
          };
          resolve(result);
        } catch (error) {
          if (attemptNumber < retries) {
            console.log(`命令执行失败，重试中... (${attemptNumber + 1}/${retries})`);
            setTimeout(() => attempt(attemptNumber + 1), 2000);
          } else {
            reject(error);
          }
        }
      };
      
      attempt(0);
    });
  }

  /**
   * 解析测试输出
   */
  parseTestOutput(testOutput, suiteResult) {
    // 根据不同的测试框架输出格式解析
    if (testOutput.testResults) {
      // Vitest/Jest 格式
      for (const testFile of testOutput.testResults) {
        for (const test of testFile.assertionResults || []) {
          suiteResult.tests.push({
            name: test.fullName || test.title,
            status: test.status,
            duration: test.duration || 0,
            error: test.failureMessages ? test.failureMessages.join('\n') : null,
          });
          
          suiteResult.summary.total++;
          switch (test.status) {
            case 'passed':
              suiteResult.summary.passed++;
              break;
            case 'failed':
              suiteResult.summary.failed++;
              break;
            case 'skipped':
            case 'pending':
              suiteResult.summary.skipped++;
              break;
          }
        }
      }
    } else if (testOutput.suites) {
      // Playwright 格式
      this.parsePlaywrightOutput(testOutput, suiteResult);
    }
  }

  /**
   * 解析文本输出
   */
  parseTextOutput(textOutput, suiteResult) {
    const lines = textOutput.split('\n');
    
    for (const line of lines) {
      // 尝试从文本中提取测试结果信息
      if (line.includes('✓') || line.includes('PASS')) {
        suiteResult.summary.total++;
        suiteResult.summary.passed++;
      } else if (line.includes('✗') || line.includes('FAIL')) {
        suiteResult.summary.total++;
        suiteResult.summary.failed++;
      } else if (line.includes('SKIP')) {
        suiteResult.summary.total++;
        suiteResult.summary.skipped++;
      }
    }
  }

  /**
   * 收集覆盖率数据
   */
  async collectCoverageData(testResults) {
    const coverageFile = join(rootDir, 'afa-office-system/backend/coverage/coverage-summary.json');
    
    if (existsSync(coverageFile)) {
      try {
        const coverage = JSON.parse(readFileSync(coverageFile, 'utf8'));
        
        if (coverage.total) {
          testResults.coverage = {
            lines: coverage.total.lines.pct,
            functions: coverage.total.functions.pct,
            branches: coverage.total.branches.pct,
            statements: coverage.total.statements.pct,
            threshold: testResults.coverage.threshold,
            passed: coverage.total.lines.pct >= testResults.coverage.threshold,
          };
        }
      } catch (error) {
        console.error('读取覆盖率数据失败:', error.message);
      }
    }
  }

  /**
   * 发送开始通知
   */
  async sendStartNotification(sessionId) {
    // 实现开始通知逻辑
    console.log(`📢 发送开始通知: ${sessionId}`);
  }

  /**
   * 发送完成通知
   */
  async sendCompletionNotification(sessionId, results) {
    const notificationData = {
      status: results.summary.status,
      summary: results.summary,
      coverage: results.coverage,
      environment: this.config.environment,
      branch: this.getCurrentBranch(),
      commit: this.getCurrentCommit(),
      timestamp: new Date().toISOString(),
    };
    
    await this.notificationManager.sendTestNotification(notificationData);
  }

  /**
   * 发送失败通知
   */
  async sendFailureNotification(sessionId, error) {
    const notificationData = {
      status: 'failure',
      summary: {
        total: 0,
        passed: 0,
        failed: 1,
        skipped: 0,
        passRate: 0,
        duration: 0,
      },
      environment: this.config.environment,
      branch: this.getCurrentBranch(),
      commit: this.getCurrentCommit(),
      timestamp: new Date().toISOString(),
      error: error.message,
    };
    
    await this.notificationManager.sendTestNotification(notificationData);
  }

  /**
   * 更新会话信息
   */
  updateSession(sessionId, session) {
    this.testSessions.set(sessionId, session);
    
    const sessionDir = join(rootDir, 'test-sessions', sessionId);
    if (existsSync(sessionDir)) {
      writeFileSync(
        join(sessionDir, 'session.json'),
        JSON.stringify(session, null, 2)
      );
    }
  }

  /**
   * 生成会话ID
   */
  generateSessionId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `session-${timestamp}-${random}`;
  }

  /**
   * 生成结果ID
   */
  generateResultId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `result-${timestamp}-${random}`;
  }

  /**
   * 获取当前分支
   */
  getCurrentBranch() {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return process.env.GITHUB_REF_NAME || 'unknown';
    }
  }

  /**
   * 获取当前提交
   */
  getCurrentCommit() {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return process.env.GITHUB_SHA || 'unknown';
    }
  }

  /**
   * 获取触发类型
   */
  getTriggerType() {
    if (process.env.GITHUB_EVENT_NAME) {
      return process.env.GITHUB_EVENT_NAME;
    }
    
    return this.config.isCI ? 'ci' : 'manual';
  }

  /**
   * 获取pnpm版本
   */
  getPnpmVersion() {
    try {
      return execSync('pnpm --version', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * 获取依赖信息
   */
  getDependencies() {
    try {
      const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
      return {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
    } catch {
      return {};
    }
  }
}

/**
 * 主函数
 */
async function main() {
  const command = process.argv[2] || 'run';
  const orchestrator = new TestEnvironmentOrchestrator();
  
  // 注册清理处理器
  process.on('SIGINT', async () => {
    console.log('\n收到中断信号，开始清理...');
    process.exit(0);
  });
  
  try {
    switch (command) {
      case 'run':
        const options = {
          testTypes: process.argv.slice(3),
        };
        await orchestrator.executeTestPipeline(options);
        break;
        
      case 'unit':
        await orchestrator.executeTestPipeline({ testTypes: ['unit'] });
        break;
        
      case 'integration':
        await orchestrator.executeTestPipeline({ testTypes: ['integration'] });
        break;
        
      case 'e2e':
        await orchestrator.executeTestPipeline({ testTypes: ['e2e'] });
        break;
        
      case 'all':
        await orchestrator.executeTestPipeline({ testTypes: ['unit', 'integration', 'e2e'] });
        break;
        
      default:
        console.log('用法: node test-environment-orchestrator.js <run|unit|integration|e2e|all> [options]');
        console.log('');
        console.log('命令:');
        console.log('  run         运行指定的测试类型');
        console.log('  unit        运行单元测试');
        console.log('  integration 运行集成测试');
        console.log('  e2e         运行端到端测试');
        console.log('  all         运行所有测试');
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

export { TestEnvironmentOrchestrator };