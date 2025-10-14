/**
 * MySQL测试环境管理器
 * 负责创建、管理和清理MySQL测试环境
 */

import { randomUUID } from 'crypto';
import { MySQLAdapter } from '../../src/utils/mysql-adapter.js';
import { MySQLConfig } from '../../src/utils/database-adapter.js';
import { 
  TestEnvironment, 
  TestEnvironmentOptions, 
  TestEnvironmentManager,
  EnvironmentCreationError,
  EnvironmentCleanupError,
  EnvironmentIsolationError
} from './test-environment-manager.js';

export class MySQLTestEnvironmentManager implements TestEnvironmentManager {
  private environments = new Map<string, TestEnvironment>();
  private config: MySQLConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private errorStats = {
    creationErrors: 0,
    cleanupErrors: 0,
    connectionErrors: 0,
    isolationErrors: 0,
    recoveryAttempts: 0,
    successfulRecoveries: 0
  };

  constructor(config: MySQLConfig) {
    this.config = config;
    
    // 启动定期清理和监控
    this.startPeriodicCleanup();
    this.startEnvironmentMonitoring();
    
    // 进程退出时清理所有环境
    process.on('exit', () => this.cleanupAllEnvironments());
    process.on('SIGINT', () => this.cleanupAllEnvironments());
    process.on('SIGTERM', () => this.cleanupAllEnvironments());
    process.on('uncaughtException', (error: Error) => this.handleUncaughtException(error));
    process.on('unhandledRejection', (reason: any) => this.handleUnhandledRejection(reason));
  }

  /**
   * 创建隔离的测试环境
   */
  async createIsolatedEnvironment(options: TestEnvironmentOptions = {}): Promise<TestEnvironment> {
    const envId = randomUUID();
    const prefix = options.databasePrefix || 'test';
    
    try {
      // 创建MySQL适配器
      const adapter = new MySQLAdapter();
      await adapter.connect(this.config);
      
      // 创建独立的测试数据库
      const testDbName = await adapter.createTestDatabase(
        MySQLAdapter.generateTestDatabaseName(prefix)
      );
      
      // 初始化数据库结构
      await adapter.initializeSchema(testDbName);
      
      // 优化表性能
      try {
        await adapter.optimizeTables(testDbName);
      } catch (error) {
        console.warn('⚠️ 表优化失败，继续执行:', error);
      }

      const environment: TestEnvironment = {
        id: envId,
        databaseName: testDbName,
        adapter,
        isolationLevel: options.isolationLevel || 'test',
        isActive: true,
        createdAt: new Date(),
        resources: new Set([`database:${testDbName}`]),
        cleanup: async () => {
          await this.cleanupEnvironment(environment);
        }
      };

      this.environments.set(envId, environment);
      
      console.log(`🏗️ 创建MySQL测试环境: ${envId} (数据库: ${testDbName})`);
      
      return environment;
    } catch (error) {
      throw new EnvironmentCreationError(
        `创建MySQL测试环境失败: ${(error as Error).message}`,
        envId
      );
    }
  }

  /**
   * 获取测试环境
   */
  getEnvironment(envId: string): TestEnvironment | undefined {
    return this.environments.get(envId);
  }

  /**
   * 获取所有活跃的测试环境
   */
  getActiveEnvironments(): TestEnvironment[] {
    return Array.from(this.environments.values()).filter(env => env.isActive);
  }

  /**
   * 清理指定的测试环境
   */
  async cleanupEnvironment(env: TestEnvironment): Promise<void> {
    if (!env.isActive) {
      return;
    }

    try {
      env.isActive = false;

      // 删除测试数据库
      if (env.databaseName && env.adapter.dropTestDatabase) {
        await env.adapter.dropTestDatabase(env.databaseName);
      }

      // 断开数据库连接
      await env.adapter.disconnect();

      // 清理资源记录
      env.resources.clear();
      this.environments.delete(env.id);

      console.log(`🧹 清理MySQL测试环境: ${env.id} (数据库: ${env.databaseName})`);
    } catch (error) {
      throw new EnvironmentCleanupError(
        `清理MySQL测试环境失败: ${(error as Error).message}`,
        env.id
      );
    }
  }

  /**
   * 清理所有测试环境
   */
  async cleanupAllEnvironments(): Promise<void> {
    const environments = Array.from(this.environments.values());
    
    if (environments.length === 0) {
      return;
    }

    console.log(`🧹 开始清理 ${environments.length} 个MySQL测试环境...`);

    let successCount = 0;
    let errorCount = 0;

    const cleanupPromises = environments.map(async (env) => {
      try {
        await this.cleanupEnvironment(env);
        successCount++;
      } catch (error) {
        console.error(`清理环境失败: ${env.id}`, error);
        errorCount++;
        this.errorStats.cleanupErrors++;
        
        // 尝试强制清理
        try {
          await this.forceCleanupEnvironment(env);
          console.log(`🔧 强制清理成功: ${env.id}`);
          successCount++;
          errorCount--;
        } catch (forceError) {
          console.error(`强制清理也失败: ${env.id}`, forceError);
        }
      }
    });

    await Promise.allSettled(cleanupPromises);
    
    // 停止定期任务
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log(`✅ MySQL测试环境清理完成: 成功 ${successCount}, 失败 ${errorCount}`);
  }

  /**
   * 清理过期的测试环境
   */
  async cleanupExpiredEnvironments(maxAge: number = 3600000): Promise<string[]> {
    const currentTime = Date.now();
    const expiredEnvironments: TestEnvironment[] = [];

    for (const env of this.environments.values()) {
      const age = currentTime - env.createdAt.getTime();
      if (age > maxAge) {
        expiredEnvironments.push(env);
      }
    }

    if (expiredEnvironments.length === 0) {
      return [];
    }

    console.log(`🕒 发现 ${expiredEnvironments.length} 个过期的测试环境`);

    const cleanedIds: string[] = [];
    for (const env of expiredEnvironments) {
      try {
        await this.cleanupEnvironment(env);
        cleanedIds.push(env.id);
      } catch (error) {
        console.error(`清理过期环境失败: ${env.id}`, error);
      }
    }

    return cleanedIds;
  }

  /**
   * 验证环境隔离
   */
  async validateEnvironmentIsolation(env1: TestEnvironment, env2: TestEnvironment): Promise<boolean> {
    try {
      // 检查数据库名称是否不同
      if (env1.databaseName === env2.databaseName) {
        throw new EnvironmentIsolationError('数据库名称相同', env1.id);
      }

      // 在env1中创建测试数据
      await env1.adapter.run(`
        INSERT INTO merchants (name, code, status) 
        VALUES ('测试商户1', 'TEST001', 'active')
      `);

      // 检查env2中是否能看到这些数据
      const result = await env2.adapter.get(`
        SELECT COUNT(*) as count 
        FROM merchants 
        WHERE code = 'TEST001'
      `);

      if (result && (result as any).count > 0) {
        throw new EnvironmentIsolationError('数据泄露到其他环境', env1.id);
      }

      console.log('✅ 环境隔离验证通过');
      return true;
    } catch (error) {
      if (error instanceof EnvironmentIsolationError) {
        console.error('❌ 环境隔离验证失败:', error.message);
        throw error;
      }
      console.error('❌ 环境隔离验证失败:', error);
      return false;
    }
  }

  /**
   * 获取环境统计信息
   */
  async getEnvironmentStats(env: TestEnvironment): Promise<{
    databaseStats: any;
    serverStatus: any;
    age: number;
    resourceCount: number;
  }> {
    try {
      const [databaseStats, serverStatus] = await Promise.all([
        env.adapter.getDatabaseStats?.(env.databaseName) || Promise.resolve({}),
        env.adapter.getServerStatus?.() || Promise.resolve({})
      ]);

      return {
        databaseStats,
        serverStatus,
        age: Date.now() - env.createdAt.getTime(),
        resourceCount: env.resources.size
      };
    } catch (error) {
      console.error(`获取环境统计信息失败: ${env.id}`, error);
      throw error;
    }
  }

  /**
   * 启动定期清理
   */
  private startPeriodicCleanup(): void {
    // 每30分钟检查一次过期环境
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredEnvironments();
        await this.cleanupOrphanedDatabases();
      } catch (error) {
        console.error('定期清理失败:', error);
        this.errorStats.cleanupErrors++;
      }
    }, 30 * 60 * 1000);
  }

  /**
   * 启动环境监控
   */
  private startEnvironmentMonitoring(): void {
    // 每5分钟检查一次环境健康状态
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.monitorEnvironmentHealth();
      } catch (error) {
        console.error('环境监控失败:', error);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * 监控环境健康状态
   */
  private async monitorEnvironmentHealth(): Promise<void> {
    const environments = Array.from(this.environments.values());
    const unhealthyEnvironments: TestEnvironment[] = [];

    for (const env of environments) {
      if (!env.isActive) continue;

      try {
        // 检查数据库连接
        if (!env.adapter.isReady()) {
          console.warn(`⚠️ 环境连接异常: ${env.id}`);
          unhealthyEnvironments.push(env);
          continue;
        }

        // 检查数据库是否存在
        if (env.databaseName && env.adapter.databaseExists) {
          const exists = await env.adapter.databaseExists(env.databaseName);
          if (!exists) {
            console.warn(`⚠️ 环境数据库丢失: ${env.id} (${env.databaseName})`);
            unhealthyEnvironments.push(env);
            continue;
          }
        }

        // 执行简单的健康检查查询
        await env.adapter.get('SELECT 1 as health_check');
      } catch (error) {
        console.warn(`⚠️ 环境健康检查失败: ${env.id}`, error);
        unhealthyEnvironments.push(env);
      }
    }

    // 尝试恢复不健康的环境
    for (const env of unhealthyEnvironments) {
      try {
        await this.recoverEnvironment(env);
      } catch (error) {
        console.error(`环境恢复失败: ${env.id}`, error);
        // 如果恢复失败，标记为需要清理
        await this.cleanupEnvironment(env);
      }
    }
  }

  /**
   * 恢复环境
   */
  private async recoverEnvironment(env: TestEnvironment): Promise<void> {
    console.log(`🔧 尝试恢复环境: ${env.id}`);
    this.errorStats.recoveryAttempts++;

    try {
      // 尝试重新连接数据库
      if (!env.adapter.isReady()) {
        await env.adapter.connect(this.config);
      }

      // 如果数据库不存在，重新创建
      if (env.databaseName && env.adapter.databaseExists) {
        const exists = await env.adapter.databaseExists(env.databaseName);
        if (!exists) {
          if (env.adapter.createTestDatabase) {
            await env.adapter.createTestDatabase(env.databaseName);
            await env.adapter.initializeSchema(env.databaseName);
          }
        }
      }

      // 验证恢复是否成功
      await env.adapter.get('SELECT 1 as recovery_check');
      
      console.log(`✅ 环境恢复成功: ${env.id}`);
      this.errorStats.successfulRecoveries++;
    } catch (error) {
      console.error(`❌ 环境恢复失败: ${env.id}`, error);
      throw error;
    }
  }

  /**
   * 清理孤立的数据库
   */
  private async cleanupOrphanedDatabases(): Promise<void> {
    try {
      // 创建临时适配器来清理孤立数据库
      const tempAdapter = new MySQLAdapter();
      await tempAdapter.connect(this.config);

      // 获取所有测试数据库
      const orphanedDatabases = await tempAdapter.cleanupTestDatabases();
      
      if (orphanedDatabases.length > 0) {
        console.log(`🧹 清理了 ${orphanedDatabases.length} 个孤立的测试数据库`);
      }

      await tempAdapter.disconnect();
    } catch (error) {
      console.error('清理孤立数据库失败:', error);
    }
  }

  /**
   * 处理环境错误
   */
  async handleEnvironmentError(env: TestEnvironment, error: Error): Promise<void> {
    console.error(`❌ MySQL测试环境错误 [${env.id}]:`, error);

    // 尝试清理损坏的环境
    try {
      await this.forceCleanupEnvironment(env);
    } catch (cleanupError) {
      console.error(`强制清理环境失败:`, cleanupError);
    }

    // 根据错误类型决定是否重试
    if (this.isRetryableError(error)) {
      throw new RetryableTestError(error.message);
    } else {
      throw new FatalTestError(error.message);
    }
  }

  /**
   * 强制清理环境
   */
  private async forceCleanupEnvironment(env: TestEnvironment): Promise<void> {
    try {
      env.isActive = false;

      // 强制删除数据库
      if (env.databaseName) {
        const tempAdapter = new MySQLAdapter();
        await tempAdapter.connect(this.config);
        await tempAdapter.dropTestDatabase(env.databaseName);
        await tempAdapter.disconnect();
      }

      // 清理记录
      env.resources.clear();
      this.environments.delete(env.id);

      console.log(`🔧 强制清理环境完成: ${env.id}`);
    } catch (error) {
      console.error(`强制清理环境失败: ${env.id}`, error);
      throw error;
    }
  }

  /**
   * 判断是否为可重试的错误
   */
  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ER_LOCK_WAIT_TIMEOUT',
      'ER_LOCK_DEADLOCK'
    ];

    return retryableErrors.some(code => 
      error.message.includes(code) || (error as any).code === code
    );
  }

  /**
   * 获取管理器状态
   */
  getManagerStatus(): {
    totalEnvironments: number;
    activeEnvironments: number;
    oldestEnvironment?: Date;
    newestEnvironment?: Date;
    errorStats: any;
  } {
    const environments = Array.from(this.environments.values());
    const activeEnvironments = environments.filter(env => env.isActive);

    let oldestDate: Date | undefined;
    let newestDate: Date | undefined;

    if (environments.length > 0) {
      const dates = environments.map(env => env.createdAt);
      oldestDate = new Date(Math.min(...dates.map(d => d.getTime())));
      newestDate = new Date(Math.max(...dates.map(d => d.getTime())));
    }

    return {
      totalEnvironments: environments.length,
      activeEnvironments: activeEnvironments.length,
      oldestEnvironment: oldestDate,
      newestEnvironment: newestDate,
      errorStats: { ...this.errorStats }
    } as any;
  }

  /**
   * 处理未捕获的异常
   */
  private handleUncaughtException(error: Error): void {
    console.error('❌ 未捕获的异常:', error);
    
    // 尝试清理所有环境
    this.cleanupAllEnvironments().catch(cleanupError => {
      console.error('清理环境时发生错误:', cleanupError);
    });
  }

  /**
   * 处理未处理的Promise拒绝
   */
  private handleUnhandledRejection(reason: any): void {
    console.error('❌ 未处理的Promise拒绝:', reason);
    
    // 记录错误统计
    this.errorStats.connectionErrors++;
  }

  /**
   * 批量创建环境（带错误处理）
   */
  async createMultipleEnvironments(count: number, options: TestEnvironmentOptions = {}): Promise<TestEnvironment[]> {
    const environments: TestEnvironment[] = [];
    const errors: Error[] = [];

    const createPromises = Array.from({ length: count }, async (_, index) => {
      try {
        const env = await this.createIsolatedEnvironment({
          ...options,
          databasePrefix: `${options.databasePrefix || 'test'}_${index}`
        });
        environments.push(env);
      } catch (error) {
        errors.push(error as Error);
        console.error(`创建环境 ${index} 失败:`, error);
      }
    });

    await Promise.allSettled(createPromises);

    if (errors.length > 0) {
      console.warn(`⚠️ ${errors.length}/${count} 个环境创建失败`);
    }

    console.log(`✅ 成功创建 ${environments.length}/${count} 个测试环境`);
    return environments;
  }

  /**
   * 安全关闭管理器
   */
  async shutdown(): Promise<void> {
    console.log('🔄 开始关闭MySQL测试环境管理器...');

    // 停止定期任务
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // 清理所有环境
    await this.cleanupAllEnvironments();

    // 输出最终统计信息
    console.log('📊 最终错误统计:', this.errorStats);
    console.log('✅ MySQL测试环境管理器已关闭');
  }

  /**
   * 重置错误统计
   */
  resetErrorStats(): void {
    this.errorStats = {
      creationErrors: 0,
      cleanupErrors: 0,
      connectionErrors: 0,
      isolationErrors: 0,
      recoveryAttempts: 0,
      successfulRecoveries: 0
    };
  }

  /**
   * 获取详细的环境报告
   */
  async generateEnvironmentReport(): Promise<{
    summary: any;
    environments: Array<{
      id: string;
      databaseName?: string;
      status: string;
      age: number;
      stats?: any;
      health: 'healthy' | 'unhealthy' | 'unknown';
    }>;
    recommendations: string[];
  }> {
    const summary = this.getManagerStatus();
    const environments = [];
    const recommendations: string[] = [];

    for (const env of this.environments.values()) {
      let health: 'healthy' | 'unhealthy' | 'unknown' = 'unknown';
      let stats;

      try {
        if (env.isActive && env.adapter.isReady()) {
          await env.adapter.get('SELECT 1');
          health = 'healthy';
          stats = await this.getEnvironmentStats(env);
        } else {
          health = 'unhealthy';
        }
      } catch (error) {
        health = 'unhealthy';
      }

      environments.push({
        id: env.id,
        databaseName: env.databaseName,
        status: env.isActive ? 'active' : 'inactive',
        age: Date.now() - env.createdAt.getTime(),
        stats,
        health
      } as any);
    }

    // 生成建议
    if (summary.errorStats.creationErrors > 5) {
      recommendations.push('环境创建错误较多，建议检查MySQL服务器状态');
    }

    if (summary.errorStats.cleanupErrors > 3) {
      recommendations.push('环境清理错误较多，建议检查数据库权限');
    }

    const unhealthyCount = environments.filter(e => e.health === 'unhealthy').length;
    if (unhealthyCount > 0) {
      recommendations.push(`发现 ${unhealthyCount} 个不健康的环境，建议进行恢复或清理`);
    }

    const oldEnvironments = environments.filter(e => e.age > 3600000); // 1小时
    if (oldEnvironments.length > 0) {
      recommendations.push(`发现 ${oldEnvironments.length} 个超过1小时的环境，建议清理`);
    }

    return {
      summary,
      environments,
      recommendations
    };
  }
}

/**
 * 可重试的测试错误
 */
export class RetryableTestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableTestError';
  }
}

/**
 * 致命的测试错误
 */
export class FatalTestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalTestError';
  }
}

/**
 * 创建MySQL测试环境管理器的工厂函数
 */
export function createMySQLTestEnvironmentManager(config?: Partial<MySQLConfig>): MySQLTestEnvironmentManager {
  const defaultConfig: MySQLConfig = {
    type: 'mysql',
    host: process.env['TEST_DB_HOST'] || '127.0.0.1',
    port: parseInt(process.env['TEST_DB_PORT'] || '3306'),
    user: process.env['TEST_DB_USER'] || 'root',
    password: process.env['TEST_DB_PASSWORD'] || '111111',
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
    charset: 'utf8mb4',
    timezone: '+00:00'
  };

  const finalConfig = { ...defaultConfig, ...config };
  return new MySQLTestEnvironmentManager(finalConfig);
}