/**
 * MySQL测试工具集合
 * 统一导出所有MySQL测试相关的工具和辅助类
 */

// 导出MySQL测试数据工厂
export { 
  MySQLTestDataFactory, 
  createMySQLTestDataFactory 
} from './mysql-test-data-factory';

// 导出MySQL数据库测试辅助工具
export { 
  MySQLDatabaseTestHelper, 
  createMySQLDatabaseTestHelper 
} from './mysql-database-test-helper';

// 导出MySQL超时管理器
export { 
  MySQLTimeoutManager, 
  createMySQLTimeoutManager,
  TimeoutOperationType
} from './mysql-timeout-manager';

// 导入类型定义
import type { MySQLTimeoutConfig, TimeoutStats, OperationResult } from './mysql-timeout-manager';
import { MySQLAdapter } from '../../src/adapters/mysql-adapter';
import { MySQLTestDataFactory } from './mysql-test-data-factory';
import { MySQLDatabaseTestHelper } from './mysql-database-test-helper';
import { MySQLTimeoutManager } from './mysql-timeout-manager';

/**
 * MySQL测试工具套件
 * 提供一站式的MySQL测试工具初始化和管理
 */
export class MySQLTestToolkit {
  public adapter: MySQLAdapter;
  public dataFactory: MySQLTestDataFactory;
  public testHelper: MySQLDatabaseTestHelper;
  public timeoutManager: MySQLTimeoutManager;

  constructor(adapter: MySQLAdapter, options?: {
    dataFactoryOptions?: { batchSize?: number; useTransactions?: boolean };
    timeoutConfig?: Partial<MySQLTimeoutConfig>;
  }) {
    this.adapter = adapter;
    this.dataFactory = new MySQLTestDataFactory(adapter, options?.dataFactoryOptions);
    this.testHelper = new MySQLDatabaseTestHelper(adapter);
    this.timeoutManager = new MySQLTimeoutManager(adapter, options?.timeoutConfig);
  }

  /**
   * 初始化MySQL测试环境
   */
  async initializeTestEnvironment(dbName: string): Promise<void> {
    console.log('🚀 初始化MySQL测试环境...');
    
    try {
      // 创建测试数据库
      await this.adapter.createTestDatabase(dbName);
      
      // 初始化数据库结构
      await this.adapter.initializeSchema(dbName);
      
      // 验证连接
      const connectionOk = await this.testHelper.verifyMySQLConnection();
      if (!connectionOk) {
        throw new Error('MySQL连接验证失败');
      }
      
      console.log('✅ MySQL测试环境初始化完成');
    } catch (error) {
      console.error('❌ MySQL测试环境初始化失败:', error);
      throw error;
    }
  }

  /**
   * 清理MySQL测试环境
   */
  async cleanupTestEnvironment(dbName: string): Promise<void> {
    console.log('🧹 清理MySQL测试环境...');
    
    try {
      // 清理测试数据
      await this.testHelper.cleanupMySQLTestEnvironment();
      
      // 删除测试数据库
      await this.adapter.dropTestDatabase(dbName);
      
      // 清理超时管理器
      this.timeoutManager.cleanup();
      
      console.log('✅ MySQL测试环境清理完成');
    } catch (error) {
      console.error('❌ MySQL测试环境清理失败:', error);
      throw error;
    }
  }

  /**
   * 执行完整的MySQL健康检查
   */
  async performCompleteHealthCheck(): Promise<{
    overall: boolean;
    connection: boolean;
    performance: { healthy: boolean; issues: string[]; recommendations: string[] } | null;
    timeout: { healthy: boolean; issues: string[]; recommendations: string[] } | null;
    recommendations: string[];
  }> {
    console.log('🔍 执行MySQL完整健康检查...');
    
    const results = {
      overall: true,
      connection: false,
      performance: null as { healthy: boolean; issues: string[]; recommendations: string[] } | null,
      timeout: null as { healthy: boolean; issues: string[]; recommendations: string[] } | null,
      recommendations: [] as string[]
    };

    try {
      // 连接健康检查
      results.connection = await this.testHelper.verifyMySQLConnection();
      if (!results.connection) {
        results.overall = false;
        results.recommendations.push('MySQL连接异常，请检查服务状态');
      }

      // 性能健康检查
      results.performance = await this.testHelper.performMySQLHealthCheck();
      if (results.performance && !results.performance.healthy) {
        results.overall = false;
        results.recommendations.push(...results.performance.recommendations);
      }

      // 超时管理器健康检查
      results.timeout = await this.timeoutManager.performHealthCheck();
      if (results.timeout && !results.timeout.healthy) {
        results.overall = false;
        results.recommendations.push(...results.timeout.recommendations);
      }

      console.log(results.overall ? '✅ MySQL健康检查通过' : '⚠️ MySQL健康检查发现问题');
      return results;

    } catch (error) {
      console.error('❌ MySQL健康检查失败:', error);
      results.overall = false;
      results.recommendations.push('健康检查执行失败，请检查MySQL配置');
      return results;
    }
  }

  /**
   * 生成综合测试报告
   */
  async generateComprehensiveReport(): Promise<string> {
    try {
      const serverInfo = await this.testHelper.getMySQLServerInfo();
      const diagnosticReport = await this.testHelper.generateMySQLDiagnosticReport();
      const timeoutReport = this.timeoutManager.generateTimeoutReport();
      const healthCheck = await this.performCompleteHealthCheck();

      const report = {
        title: 'MySQL测试工具综合报告',
        generatedAt: new Date().toISOString(),
        serverInfo,
        healthCheck,
        diagnosticReport,
        timeoutReport: JSON.parse(timeoutReport),
        summary: {
          connectionStatus: healthCheck.connection ? '正常' : '异常',
          overallHealth: healthCheck.overall ? '健康' : '需要关注',
          recommendationsCount: healthCheck.recommendations.length
        }
      };

      return JSON.stringify(report, null, 2);
    } catch (error) {
      console.error('生成综合报告失败:', error);
      throw error;
    }
  }

  /**
   * 快速创建测试场景数据
   */
  async createQuickTestScenario(): Promise<any> {
    console.log('🏗️ 创建快速测试场景...');
    
    try {
      const scenario = await this.dataFactory.seedMySQLCompleteScenario();
      console.log('✅ 快速测试场景创建完成');
      return scenario;
    } catch (error) {
      console.error('❌ 快速测试场景创建失败:', error);
      throw error;
    }
  }

  /**
   * 执行性能基准测试
   */
  async runPerformanceBenchmark(options?: {
    insertCount?: number;
    selectCount?: number;
    updateCount?: number;
    deleteCount?: number;
  }): Promise<any> {
    console.log('📊 执行MySQL性能基准测试...');
    
    try {
      const results = await this.testHelper.runMySQLPerformanceTest(options);
      console.log('✅ 性能基准测试完成');
      return results;
    } catch (error) {
      console.error('❌ 性能基准测试失败:', error);
      throw error;
    }
  }

  /**
   * 获取工具套件状态
   */
  getToolkitStatus(): {
    adapterReady: boolean;
    activeOperations: number;
    performanceHistory: number;
    lastHealthCheck?: string;
  } {
    return {
      adapterReady: this.adapter.isReady(),
      activeOperations: this.timeoutManager.getActiveOperations().length,
      performanceHistory: this.testHelper.getPerformanceHistory().length,
      lastHealthCheck: new Date().toISOString()
    };
  }
}

/**
 * 便捷的工厂函数
 */
export function createMySQLTestToolkit(adapter: MySQLAdapter, options?: {
  dataFactoryOptions?: { batchSize?: number; useTransactions?: boolean };
  timeoutConfig?: Partial<MySQLTimeoutConfig>;
}): MySQLTestToolkit {
  return new MySQLTestToolkit(adapter, options);
}

// 重新导出类型定义
export type { MySQLTimeoutConfig, TimeoutStats, OperationResult };

export default MySQLTestToolkit;