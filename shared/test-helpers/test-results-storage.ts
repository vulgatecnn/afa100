/**
 * 测试结果存储和分析系统
 * 用于存储、查询和分析历史测试结果
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

export interface TestResultRecord {
  id: string;
  timestamp: string;
  environment: string;
  branch: string;
  commit: string;
  buildNumber?: string;
  trigger: 'push' | 'pull_request' | 'schedule' | 'manual';
  
  // 测试结果
  summary: TestSummary;
  coverage: CoverageData;
  suites: TestSuiteResult[];
  
  // 性能数据
  performance: PerformanceData;
  
  // 环境信息
  system: SystemInfo;
  
  // 元数据
  metadata: Record<string, any>;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  duration: number;
  status: 'success' | 'failure' | 'warning';
}

export interface CoverageData {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  threshold: number;
  passed: boolean;
}

export interface TestSuiteResult {
  name: string;
  type: 'unit' | 'integration' | 'e2e';
  summary: TestSummary;
  tests: TestCaseResult[];
}

export interface TestCaseResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  retries?: number;
}

export interface PerformanceData {
  buildTime: number;
  testTime: number;
  setupTime: number;
  teardownTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface SystemInfo {
  os: string;
  nodeVersion: string;
  pnpmVersion: string;
  browserVersions: Record<string, string>;
  dependencies: Record<string, string>;
}

export interface TestTrend {
  period: string;
  passRate: number[];
  duration: number[];
  coverage: number[];
  failureCount: number[];
  timestamps: string[];
}

export interface TestAnalytics {
  trends: TestTrend;
  flakiness: FlakinessReport;
  performance: PerformanceAnalytics;
  coverage: CoverageAnalytics;
  failures: FailureAnalytics;
}

export interface FlakinessReport {
  flakyTests: Array<{
    name: string;
    suite: string;
    flakinessRate: number;
    recentFailures: number;
    totalRuns: number;
  }>;
  overallFlakinessRate: number;
}

export interface PerformanceAnalytics {
  averageDuration: number;
  durationTrend: 'improving' | 'degrading' | 'stable';
  slowestTests: Array<{
    name: string;
    suite: string;
    averageDuration: number;
    maxDuration: number;
  }>;
}

export interface CoverageAnalytics {
  trend: 'improving' | 'degrading' | 'stable';
  averageCoverage: number;
  coverageByType: Record<string, number>;
  uncoveredAreas: string[];
}

export interface FailureAnalytics {
  commonFailures: Array<{
    pattern: string;
    count: number;
    tests: string[];
  }>;
  failuresByCategory: Record<string, number>;
  recentFailureTrend: 'improving' | 'degrading' | 'stable';
}

/**
 * 测试结果存储管理器
 */
export class TestResultsStorage {
  private storageDir: string;
  private maxRecords: number;
  private compressionEnabled: boolean;

  constructor(config?: {
    storageDir?: string;
    maxRecords?: number;
    compressionEnabled?: boolean;
  }) {
    this.storageDir = config?.storageDir || process.env.TEST_RESULTS_DIR || './test-results-storage';
    this.maxRecords = config?.maxRecords || parseInt(process.env.TEST_MAX_RECORDS || '100');
    this.compressionEnabled = config?.compressionEnabled ?? (process.env.TEST_COMPRESSION_ENABLED !== 'false');
    
    this.ensureStorageDirectory();
  }

  /**
   * 存储测试结果
   */
  public async storeResult(result: TestResultRecord): Promise<void> {
    console.log(`💾 存储测试结果: ${result.id}`);

    try {
      // 生成文件路径
      const fileName = `${result.timestamp.split('T')[0]}-${result.id}.json`;
      const filePath = join(this.storageDir, fileName);

      // 压缩数据（如果启用）
      const data = this.compressionEnabled ? this.compressResult(result) : result;

      // 写入文件
      writeFileSync(filePath, JSON.stringify(data, null, 2));

      // 更新索引
      await this.updateIndex(result);

      // 清理旧记录
      await this.cleanupOldRecords();

      console.log(`✅ 测试结果存储成功: ${fileName}`);
    } catch (error) {
      console.error(`❌ 存储测试结果失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查询测试结果
   */
  public async queryResults(query: {
    environment?: string;
    branch?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    limit?: number;
  }): Promise<TestResultRecord[]> {
    console.log('🔍 查询测试结果...');

    const results: TestResultRecord[] = [];
    const files = this.getResultFiles();

    for (const file of files) {
      try {
        const result = await this.loadResult(file);
        if (result && this.matchesQuery(result, query)) {
          results.push(result);
        }
      } catch (error) {
        console.error(`读取结果文件失败: ${file}`, error.message);
      }
    }

    // 排序和限制
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (query.limit) {
      return results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * 获取最新测试结果
   */
  public async getLatestResult(environment?: string, branch?: string): Promise<TestResultRecord | null> {
    const results = await this.queryResults({
      environment,
      branch,
      limit: 1,
    });

    return results.length > 0 ? results[0] : null;
  }

  /**
   * 生成测试分析报告
   */
  public async generateAnalytics(period: 'week' | 'month' | 'quarter' = 'month'): Promise<TestAnalytics> {
    console.log(`📊 生成测试分析报告 (${period})...`);

    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
    }

    const results = await this.queryResults({
      dateFrom: startDate.toISOString(),
      dateTo: endDate.toISOString(),
    });

    return {
      trends: this.analyzeTrends(results, period),
      flakiness: this.analyzeFlakiness(results),
      performance: this.analyzePerformance(results),
      coverage: this.analyzeCoverage(results),
      failures: this.analyzeFailures(results),
    };
  }

  /**
   * 比较两个测试结果
   */
  public async compareResults(id1: string, id2: string): Promise<any> {
    const result1 = await this.getResultById(id1);
    const result2 = await this.getResultById(id2);

    if (!result1 || !result2) {
      throw new Error('测试结果不存在');
    }

    return {
      summary: this.compareSummaries(result1.summary, result2.summary),
      coverage: this.compareCoverage(result1.coverage, result2.coverage),
      performance: this.comparePerformance(result1.performance, result2.performance),
      suites: this.compareSuites(result1.suites, result2.suites),
    };
  }

  /**
   * 获取测试结果统计
   */
  public async getStatistics(): Promise<any> {
    const results = await this.queryResults({});
    
    if (results.length === 0) {
      return null;
    }

    const totalTests = results.reduce((sum, r) => sum + r.summary.total, 0);
    const totalPassed = results.reduce((sum, r) => sum + r.summary.passed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.summary.failed, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.summary.duration, 0);

    const averageCoverage = results.reduce((sum, r) => sum + r.coverage.lines, 0) / results.length;
    const averageDuration = totalDuration / results.length;

    const successfulBuilds = results.filter(r => r.summary.status === 'success').length;
    const successRate = (successfulBuilds / results.length) * 100;

    return {
      totalResults: results.length,
      totalTests,
      totalPassed,
      totalFailed,
      overallPassRate: (totalPassed / totalTests) * 100,
      averageCoverage,
      averageDuration,
      successRate,
      environments: [...new Set(results.map(r => r.environment))],
      branches: [...new Set(results.map(r => r.branch))],
      dateRange: {
        from: results[results.length - 1]?.timestamp,
        to: results[0]?.timestamp,
      },
    };
  }

  /**
   * 清理过期数据
   */
  public async cleanup(olderThanDays: number = 90): Promise<void> {
    console.log(`🧹 清理 ${olderThanDays} 天前的测试结果...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const files = this.getResultFiles();
    let deletedCount = 0;

    for (const file of files) {
      try {
        const result = await this.loadResult(file);
        if (result && new Date(result.timestamp) < cutoffDate) {
          const filePath = join(this.storageDir, file);
          require('fs').unlinkSync(filePath);
          deletedCount++;
        }
      } catch (error) {
        console.error(`清理文件失败: ${file}`, error.message);
      }
    }

    // 重建索引
    await this.rebuildIndex();

    console.log(`✅ 清理完成，删除了 ${deletedCount} 个过期结果`);
  }

  /**
   * 确保存储目录存在
   */
  private ensureStorageDirectory(): void {
    if (!existsSync(this.storageDir)) {
      mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * 压缩测试结果
   */
  private compressResult(result: TestResultRecord): any {
    // 简化数据结构以减少存储空间
    return {
      ...result,
      suites: result.suites.map(suite => ({
        ...suite,
        tests: suite.tests.map(test => ({
          name: test.name,
          status: test.status,
          duration: test.duration,
          error: test.error ? test.error.substring(0, 500) : undefined, // 截断错误信息
        })),
      })),
    };
  }

  /**
   * 更新索引
   */
  private async updateIndex(result: TestResultRecord): Promise<void> {
    const indexPath = join(this.storageDir, 'index.json');
    let index: any = {};

    if (existsSync(indexPath)) {
      try {
        index = JSON.parse(readFileSync(indexPath, 'utf8'));
      } catch (error) {
        console.error('读取索引失败:', error.message);
      }
    }

    // 更新索引
    index[result.id] = {
      timestamp: result.timestamp,
      environment: result.environment,
      branch: result.branch,
      status: result.summary.status,
      passRate: result.summary.passRate,
      coverage: result.coverage.lines,
    };

    writeFileSync(indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * 重建索引
   */
  private async rebuildIndex(): Promise<void> {
    console.log('🔄 重建测试结果索引...');

    const index: any = {};
    const files = this.getResultFiles();

    for (const file of files) {
      try {
        const result = await this.loadResult(file);
        if (result) {
          index[result.id] = {
            timestamp: result.timestamp,
            environment: result.environment,
            branch: result.branch,
            status: result.summary.status,
            passRate: result.summary.passRate,
            coverage: result.coverage.lines,
          };
        }
      } catch (error) {
        console.error(`重建索引失败: ${file}`, error.message);
      }
    }

    const indexPath = join(this.storageDir, 'index.json');
    writeFileSync(indexPath, JSON.stringify(index, null, 2));

    console.log(`✅ 索引重建完成，包含 ${Object.keys(index).length} 条记录`);
  }

  /**
   * 获取结果文件列表
   */
  private getResultFiles(): string[] {
    return readdirSync(this.storageDir)
      .filter(file => file.endsWith('.json') && file !== 'index.json')
      .sort((a, b) => b.localeCompare(a)); // 按时间倒序
  }

  /**
   * 加载测试结果
   */
  private async loadResult(fileName: string): Promise<TestResultRecord | null> {
    const filePath = join(this.storageDir, fileName);
    
    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const content = readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`加载测试结果失败: ${fileName}`, error.message);
      return null;
    }
  }

  /**
   * 根据ID获取测试结果
   */
  private async getResultById(id: string): Promise<TestResultRecord | null> {
    const files = this.getResultFiles();
    
    for (const file of files) {
      const result = await this.loadResult(file);
      if (result && result.id === id) {
        return result;
      }
    }

    return null;
  }

  /**
   * 检查结果是否匹配查询条件
   */
  private matchesQuery(result: TestResultRecord, query: any): boolean {
    if (query.environment && result.environment !== query.environment) {
      return false;
    }

    if (query.branch && result.branch !== query.branch) {
      return false;
    }

    if (query.status && result.summary.status !== query.status) {
      return false;
    }

    if (query.dateFrom && new Date(result.timestamp) < new Date(query.dateFrom)) {
      return false;
    }

    if (query.dateTo && new Date(result.timestamp) > new Date(query.dateTo)) {
      return false;
    }

    return true;
  }

  /**
   * 清理旧记录
   */
  private async cleanupOldRecords(): Promise<void> {
    const files = this.getResultFiles();
    
    if (files.length > this.maxRecords) {
      const toDelete = files.slice(this.maxRecords);
      
      for (const file of toDelete) {
        try {
          const filePath = join(this.storageDir, file);
          require('fs').unlinkSync(filePath);
        } catch (error) {
          console.error(`删除旧记录失败: ${file}`, error.message);
        }
      }
      
      console.log(`🧹 清理了 ${toDelete.length} 个旧记录`);
    }
  }

  /**
   * 分析趋势
   */
  private analyzeTrends(results: TestResultRecord[], period: string): TestTrend {
    const passRates = results.map(r => r.summary.passRate);
    const durations = results.map(r => r.summary.duration);
    const coverages = results.map(r => r.coverage.lines);
    const failureCounts = results.map(r => r.summary.failed);
    const timestamps = results.map(r => r.timestamp);

    return {
      period,
      passRate: passRates,
      duration: durations,
      coverage: coverages,
      failureCount: failureCounts,
      timestamps,
    };
  }

  /**
   * 分析不稳定性
   */
  private analyzeFlakiness(results: TestResultRecord[]): FlakinessReport {
    const testRuns: Map<string, { total: number; failures: number }> = new Map();

    // 统计每个测试的运行情况
    for (const result of results) {
      for (const suite of result.suites) {
        for (const test of suite.tests) {
          const testKey = `${suite.name}::${test.name}`;
          const stats = testRuns.get(testKey) || { total: 0, failures: 0 };
          
          stats.total++;
          if (test.status === 'failed') {
            stats.failures++;
          }
          
          testRuns.set(testKey, stats);
        }
      }
    }

    // 计算不稳定的测试
    const flakyTests = Array.from(testRuns.entries())
      .map(([testKey, stats]) => {
        const [suite, name] = testKey.split('::');
        const flakinessRate = stats.failures / stats.total;
        
        return {
          name,
          suite,
          flakinessRate,
          recentFailures: stats.failures,
          totalRuns: stats.total,
        };
      })
      .filter(test => test.flakinessRate > 0 && test.flakinessRate < 1) // 既有成功也有失败
      .sort((a, b) => b.flakinessRate - a.flakinessRate);

    const totalFailures = Array.from(testRuns.values()).reduce((sum, stats) => sum + stats.failures, 0);
    const totalRuns = Array.from(testRuns.values()).reduce((sum, stats) => sum + stats.total, 0);
    const overallFlakinessRate = totalRuns > 0 ? totalFailures / totalRuns : 0;

    return {
      flakyTests: flakyTests.slice(0, 10), // 前10个最不稳定的测试
      overallFlakinessRate,
    };
  }

  /**
   * 分析性能
   */
  private analyzePerformance(results: TestResultRecord[]): PerformanceAnalytics {
    const durations = results.map(r => r.summary.duration);
    const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    // 计算趋势
    const recentDurations = durations.slice(0, Math.min(10, durations.length));
    const olderDurations = durations.slice(10);
    
    let durationTrend: 'improving' | 'degrading' | 'stable' = 'stable';
    
    if (recentDurations.length > 0 && olderDurations.length > 0) {
      const recentAvg = recentDurations.reduce((sum, d) => sum + d, 0) / recentDurations.length;
      const olderAvg = olderDurations.reduce((sum, d) => sum + d, 0) / olderDurations.length;
      
      const change = (recentAvg - olderAvg) / olderAvg;
      
      if (change > 0.1) {
        durationTrend = 'degrading';
      } else if (change < -0.1) {
        durationTrend = 'improving';
      }
    }

    // 找出最慢的测试
    const testDurations: Map<string, number[]> = new Map();
    
    for (const result of results) {
      for (const suite of result.suites) {
        for (const test of suite.tests) {
          const testKey = `${suite.name}::${test.name}`;
          const durations = testDurations.get(testKey) || [];
          durations.push(test.duration);
          testDurations.set(testKey, durations);
        }
      }
    }

    const slowestTests = Array.from(testDurations.entries())
      .map(([testKey, durations]) => {
        const [suite, name] = testKey.split('::');
        const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        const maxDuration = Math.max(...durations);
        
        return {
          name,
          suite,
          averageDuration,
          maxDuration,
        };
      })
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 10);

    return {
      averageDuration,
      durationTrend,
      slowestTests,
    };
  }

  /**
   * 分析覆盖率
   */
  private analyzeCoverage(results: TestResultRecord[]): CoverageAnalytics {
    const coverages = results.map(r => r.coverage.lines);
    const averageCoverage = coverages.reduce((sum, c) => sum + c, 0) / coverages.length;

    // 计算趋势
    const recentCoverages = coverages.slice(0, Math.min(10, coverages.length));
    const olderCoverages = coverages.slice(10);
    
    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    
    if (recentCoverages.length > 0 && olderCoverages.length > 0) {
      const recentAvg = recentCoverages.reduce((sum, c) => sum + c, 0) / recentCoverages.length;
      const olderAvg = olderCoverages.reduce((sum, c) => sum + c, 0) / olderCoverages.length;
      
      const change = (recentAvg - olderAvg) / olderAvg;
      
      if (change > 0.05) {
        trend = 'improving';
      } else if (change < -0.05) {
        trend = 'degrading';
      }
    }

    // 按类型统计覆盖率
    const coverageByType = {
      lines: results.reduce((sum, r) => sum + r.coverage.lines, 0) / results.length,
      functions: results.reduce((sum, r) => sum + r.coverage.functions, 0) / results.length,
      branches: results.reduce((sum, r) => sum + r.coverage.branches, 0) / results.length,
      statements: results.reduce((sum, r) => sum + r.coverage.statements, 0) / results.length,
    };

    return {
      trend,
      averageCoverage,
      coverageByType,
      uncoveredAreas: [], // 这里可以添加具体的未覆盖区域分析
    };
  }

  /**
   * 分析失败情况
   */
  private analyzeFailures(results: TestResultRecord[]): FailureAnalytics {
    const failurePatterns: Map<string, { count: number; tests: Set<string> }> = new Map();
    const failuresByCategory: Record<string, number> = {};

    // 分析失败模式
    for (const result of results) {
      for (const suite of result.suites) {
        for (const test of suite.tests) {
          if (test.status === 'failed' && test.error) {
            // 提取错误模式
            const pattern = this.extractErrorPattern(test.error);
            const stats = failurePatterns.get(pattern) || { count: 0, tests: new Set() };
            
            stats.count++;
            stats.tests.add(`${suite.name}::${test.name}`);
            failurePatterns.set(pattern, stats);

            // 按类别统计
            const category = this.categorizeError(test.error);
            failuresByCategory[category] = (failuresByCategory[category] || 0) + 1;
          }
        }
      }
    }

    // 转换为数组格式
    const commonFailures = Array.from(failurePatterns.entries())
      .map(([pattern, stats]) => ({
        pattern,
        count: stats.count,
        tests: Array.from(stats.tests),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 计算失败趋势
    const recentFailures = results.slice(0, Math.min(10, results.length))
      .reduce((sum, r) => sum + r.summary.failed, 0);
    const olderFailures = results.slice(10)
      .reduce((sum, r) => sum + r.summary.failed, 0);
    
    let recentFailureTrend: 'improving' | 'degrading' | 'stable' = 'stable';
    
    if (olderFailures > 0) {
      const change = (recentFailures - olderFailures) / olderFailures;
      
      if (change > 0.2) {
        recentFailureTrend = 'degrading';
      } else if (change < -0.2) {
        recentFailureTrend = 'improving';
      }
    }

    return {
      commonFailures,
      failuresByCategory,
      recentFailureTrend,
    };
  }

  /**
   * 提取错误模式
   */
  private extractErrorPattern(error: string): string {
    // 简化错误信息，提取关键模式
    const lines = error.split('\n');
    const firstLine = lines[0] || error;
    
    // 移除具体的数值、路径等变化的部分
    return firstLine
      .replace(/\d+/g, 'N')
      .replace(/\/[^\s]+/g, '/PATH')
      .replace(/at .+/g, 'at LOCATION')
      .substring(0, 100);
  }

  /**
   * 错误分类
   */
  private categorizeError(error: string): string {
    const lowerError = error.toLowerCase();
    
    if (lowerError.includes('timeout')) return 'timeout';
    if (lowerError.includes('network') || lowerError.includes('connection')) return 'network';
    if (lowerError.includes('assertion') || lowerError.includes('expect')) return 'assertion';
    if (lowerError.includes('element') || lowerError.includes('selector')) return 'ui';
    if (lowerError.includes('database') || lowerError.includes('sql')) return 'database';
    if (lowerError.includes('permission') || lowerError.includes('auth')) return 'auth';
    
    return 'other';
  }

  /**
   * 比较测试摘要
   */
  private compareSummaries(summary1: TestSummary, summary2: TestSummary): any {
    return {
      total: { before: summary1.total, after: summary2.total, change: summary2.total - summary1.total },
      passed: { before: summary1.passed, after: summary2.passed, change: summary2.passed - summary1.passed },
      failed: { before: summary1.failed, after: summary2.failed, change: summary2.failed - summary1.failed },
      skipped: { before: summary1.skipped, after: summary2.skipped, change: summary2.skipped - summary1.skipped },
      passRate: { before: summary1.passRate, after: summary2.passRate, change: summary2.passRate - summary1.passRate },
      duration: { before: summary1.duration, after: summary2.duration, change: summary2.duration - summary1.duration },
    };
  }

  /**
   * 比较覆盖率
   */
  private compareCoverage(coverage1: CoverageData, coverage2: CoverageData): any {
    return {
      lines: { before: coverage1.lines, after: coverage2.lines, change: coverage2.lines - coverage1.lines },
      functions: { before: coverage1.functions, after: coverage2.functions, change: coverage2.functions - coverage1.functions },
      branches: { before: coverage1.branches, after: coverage2.branches, change: coverage2.branches - coverage1.branches },
      statements: { before: coverage1.statements, after: coverage2.statements, change: coverage2.statements - coverage1.statements },
    };
  }

  /**
   * 比较性能
   */
  private comparePerformance(perf1: PerformanceData, perf2: PerformanceData): any {
    return {
      buildTime: { before: perf1.buildTime, after: perf2.buildTime, change: perf2.buildTime - perf1.buildTime },
      testTime: { before: perf1.testTime, after: perf2.testTime, change: perf2.testTime - perf1.testTime },
      setupTime: { before: perf1.setupTime, after: perf2.setupTime, change: perf2.setupTime - perf1.setupTime },
      teardownTime: { before: perf1.teardownTime, after: perf2.teardownTime, change: perf2.teardownTime - perf1.teardownTime },
    };
  }

  /**
   * 比较测试套件
   */
  private compareSuites(suites1: TestSuiteResult[], suites2: TestSuiteResult[]): any {
    const comparison = [];
    
    for (const suite1 of suites1) {
      const suite2 = suites2.find(s => s.name === suite1.name);
      
      if (suite2) {
        comparison.push({
          name: suite1.name,
          summary: this.compareSummaries(suite1.summary, suite2.summary),
        });
      } else {
        comparison.push({
          name: suite1.name,
          status: 'removed',
        });
      }
    }
    
    for (const suite2 of suites2) {
      if (!suites1.find(s => s.name === suite2.name)) {
        comparison.push({
          name: suite2.name,
          status: 'added',
        });
      }
    }
    
    return comparison;
  }
}