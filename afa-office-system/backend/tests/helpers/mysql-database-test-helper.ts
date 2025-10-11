/**
 * MySQL数据库测试辅助工具
 * 提供MySQL特有的性能监控、诊断和测试辅助功能
 */

import { MySQLAdapter } from '../../src/adapters/mysql-adapter';
import { MySQLTestDataFactory } from './mysql-test-data-factory';

/**
 * MySQL性能监控指标
 */
interface MySQLPerformanceMetrics {
  connectionCount: number;
  activeConnections: number;
  queryCount: number;
  slowQueryCount: number;
  avgQueryTime: number;
  memoryUsage: number;
  cacheHitRatio: number;
  timestamp: string;
}

/**
 * MySQL诊断报告
 */
interface MySQLDiagnosticReport {
  connectionStatus: 'healthy' | 'warning' | 'critical';
  performanceMetrics: MySQLPerformanceMetrics;
  tableStats: any[];
  indexStats: any[];
  slowQueries: any[];
  recommendations: string[];
  timestamp: string;
}

/**
 * MySQL测试环境信息
 */
interface MySQLTestEnvironmentInfo {
  version: string;
  charset: string;
  collation: string;
  timezone: string;
  maxConnections: number;
  currentConnections: number;
  uptime: number;
}

/**
 * MySQL数据库测试辅助类
 */
export class MySQLDatabaseTestHelper {
  private adapter: MySQLAdapter;
  private dataFactory: MySQLTestDataFactory;
  private performanceHistory: MySQLPerformanceMetrics[] = [];
  private queryStartTimes: Map<string, number> = new Map();

  constructor(adapter: MySQLAdapter) {
    this.adapter = adapter;
    this.dataFactory = new MySQLTestDataFactory(adapter);
  }

  /**
   * 验证MySQL连接状态
   */
  async verifyMySQLConnection(): Promise<boolean> {
    try {
      const result = await this.adapter.get('SELECT 1 as test, NOW() as server_time');
      return result?.test === 1;
    } catch (error) {
      console.error('MySQL连接验证失败:', error);
      return false;
    }
  }

  /**
   * 获取MySQL服务器信息
   */
  async getMySQLServerInfo(): Promise<MySQLTestEnvironmentInfo> {
    try {
      const versionResult = await this.adapter.get('SELECT VERSION() as version');
      const charsetResult = await this.adapter.get('SELECT @@character_set_database as charset, @@collation_database as collation');
      const timezoneResult = await this.adapter.get('SELECT @@time_zone as timezone');
      const connectionResult = await this.adapter.get('SELECT @@max_connections as max_connections');
      const statusResult = await this.adapter.get("SHOW STATUS LIKE 'Threads_connected'");
      const uptimeResult = await this.adapter.get("SHOW STATUS LIKE 'Uptime'");

      return {
        version: versionResult?.version || 'Unknown',
        charset: charsetResult?.charset || 'Unknown',
        collation: charsetResult?.collation || 'Unknown',
        timezone: timezoneResult?.timezone || 'Unknown',
        maxConnections: connectionResult?.max_connections || 0,
        currentConnections: statusResult?.Value || 0,
        uptime: uptimeResult?.Value || 0
      };
    } catch (error) {
      console.error('获取MySQL服务器信息失败:', error);
      throw error;
    }
  }

  /**
   * 监控MySQL性能指标
   */
  async collectMySQLPerformanceMetrics(): Promise<MySQLPerformanceMetrics> {
    try {
      // 获取连接统计
      const connectionStats = await this.adapter.all(`
        SHOW STATUS WHERE Variable_name IN (
          'Threads_connected', 
          'Threads_running',
          'Connections',
          'Slow_queries',
          'Questions'
        )
      `);

      // 获取查询缓存统计
      const cacheStats = await this.adapter.all(`
        SHOW STATUS WHERE Variable_name IN (
          'Qcache_hits',
          'Qcache_inserts',
          'Qcache_queries_in_cache'
        )
      `);

      // 获取内存使用统计
      const memoryStats = await this.adapter.all(`
        SHOW STATUS WHERE Variable_name IN (
          'Innodb_buffer_pool_bytes_data',
          'Innodb_buffer_pool_bytes_dirty'
        )
      `);

      // 解析统计数据
      const stats: any = {};
      [...connectionStats, ...cacheStats, ...memoryStats].forEach((row: any) => {
        stats[row.Variable_name] = parseInt(row.Value) || 0;
      });

      // 计算缓存命中率
      const cacheHitRatio = stats.Qcache_hits > 0 
        ? (stats.Qcache_hits / (stats.Qcache_hits + stats.Qcache_inserts)) * 100 
        : 0;

      const metrics: MySQLPerformanceMetrics = {
        connectionCount: stats.Connections || 0,
        activeConnections: stats.Threads_connected || 0,
        queryCount: stats.Questions || 0,
        slowQueryCount: stats.Slow_queries || 0,
        avgQueryTime: 0, // 需要通过性能模式计算
        memoryUsage: stats.Innodb_buffer_pool_bytes_data || 0,
        cacheHitRatio: Math.round(cacheHitRatio * 100) / 100,
        timestamp: new Date().toISOString()
      };

      // 保存到历史记录
      this.performanceHistory.push(metrics);
      
      // 只保留最近100条记录
      if (this.performanceHistory.length > 100) {
        this.performanceHistory = this.performanceHistory.slice(-100);
      }

      return metrics;
    } catch (error) {
      console.error('收集MySQL性能指标失败:', error);
      throw error;
    }
  }

  /**
   * 获取MySQL表统计信息
   */
  async getMySQLTableStats(): Promise<any[]> {
    try {
      const stats = await this.adapter.all(`
        SELECT 
          table_name,
          table_rows,
          data_length,
          index_length,
          (data_length + index_length) as total_size,
          avg_row_length,
          auto_increment,
          create_time,
          update_time,
          table_collation
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        ORDER BY total_size DESC
      `);

      return stats.map((table: any) => ({
        ...table,
        total_size_mb: Math.round((table.total_size / 1024 / 1024) * 100) / 100,
        data_size_mb: Math.round((table.data_length / 1024 / 1024) * 100) / 100,
        index_size_mb: Math.round((table.index_length / 1024 / 1024) * 100) / 100
      }));
    } catch (error) {
      console.error('获取MySQL表统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取MySQL索引使用统计
   */
  async getMySQLIndexStats(): Promise<any[]> {
    try {
      const indexStats = await this.adapter.all(`
        SELECT 
          table_name,
          index_name,
          column_name,
          cardinality,
          nullable,
          index_type
        FROM information_schema.statistics 
        WHERE table_schema = DATABASE()
        ORDER BY table_name, index_name
      `);

      return indexStats;
    } catch (error) {
      console.error('获取MySQL索引统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取慢查询日志
   */
  async getMySQLSlowQueries(limit: number = 10): Promise<any[]> {
    try {
      // 检查慢查询日志是否启用
      const slowLogStatus = await this.adapter.get("SHOW VARIABLES LIKE 'slow_query_log'");
      
      if (slowLogStatus?.Value !== 'ON') {
        console.warn('慢查询日志未启用');
        return [];
      }

      // 如果启用了performance_schema，可以查询慢查询
      const perfSchemaEnabled = await this.adapter.get("SHOW VARIABLES LIKE 'performance_schema'");
      
      if (perfSchemaEnabled?.Value === 'ON') {
        const slowQueries = await this.adapter.all(`
          SELECT 
            sql_text,
            exec_count,
            total_latency,
            avg_latency,
            lock_latency,
            rows_sent,
            rows_examined,
            first_seen,
            last_seen
          FROM performance_schema.events_statements_summary_by_digest 
          WHERE avg_latency > 1000000  -- 大于1秒的查询
          ORDER BY avg_latency DESC 
          LIMIT ?
        `, [limit]);

        return slowQueries;
      }

      return [];
    } catch (error) {
      console.error('获取MySQL慢查询失败:', error);
      return [];
    }
  }

  /**
   * 生成MySQL诊断报告
   */
  async generateMySQLDiagnosticReport(): Promise<MySQLDiagnosticReport> {
    try {
      console.log('🔍 开始生成MySQL诊断报告...');

      const performanceMetrics = await this.collectMySQLPerformanceMetrics();
      const tableStats = await this.getMySQLTableStats();
      const indexStats = await this.getMySQLIndexStats();
      const slowQueries = await this.getMySQLSlowQueries();

      // 分析连接状态
      let connectionStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      const recommendations: string[] = [];

      if (performanceMetrics.activeConnections > 80) {
        connectionStatus = 'critical';
        recommendations.push('活跃连接数过高，建议检查连接池配置');
      } else if (performanceMetrics.activeConnections > 50) {
        connectionStatus = 'warning';
        recommendations.push('活跃连接数较高，建议监控连接使用情况');
      }

      // 分析缓存命中率
      if (performanceMetrics.cacheHitRatio < 80) {
        recommendations.push('查询缓存命中率较低，建议优化查询或增加缓存大小');
      }

      // 分析慢查询
      if (performanceMetrics.slowQueryCount > 10) {
        recommendations.push('存在较多慢查询，建议优化SQL语句和索引');
      }

      // 分析表大小
      const largeTables = tableStats.filter(table => table.total_size_mb > 100);
      if (largeTables.length > 0) {
        recommendations.push(`发现大表: ${largeTables.map(t => t.table_name).join(', ')}，建议考虑分区或归档`);
      }

      const report: MySQLDiagnosticReport = {
        connectionStatus,
        performanceMetrics,
        tableStats,
        indexStats,
        slowQueries,
        recommendations,
        timestamp: new Date().toISOString()
      };

      console.log('✅ MySQL诊断报告生成完成');
      return report;

    } catch (error) {
      console.error('生成MySQL诊断报告失败:', error);
      throw error;
    }
  }

  /**
   * 执行MySQL性能测试
   */
  async runMySQLPerformanceTest(options: {
    insertCount?: number;
    selectCount?: number;
    updateCount?: number;
    deleteCount?: number;
  } = {}): Promise<any> {
    const {
      insertCount = 1000,
      selectCount = 1000,
      updateCount = 500,
      deleteCount = 500
    } = options;

    console.log('🚀 开始MySQL性能测试...');

    const results: any = {
      insert: { count: 0, totalTime: 0, avgTime: 0 },
      select: { count: 0, totalTime: 0, avgTime: 0 },
      update: { count: 0, totalTime: 0, avgTime: 0 },
      delete: { count: 0, totalTime: 0, avgTime: 0 },
      overall: { totalTime: 0, timestamp: new Date().toISOString() }
    };

    const overallStartTime = Date.now();

    try {
      // 插入性能测试
      console.log(`📝 测试插入性能 (${insertCount} 条记录)...`);
      const insertStartTime = Date.now();
      await this.dataFactory.seedMySQLUsers(insertCount, { status: 'active' });
      const insertEndTime = Date.now();
      
      results.insert = {
        count: insertCount,
        totalTime: insertEndTime - insertStartTime,
        avgTime: (insertEndTime - insertStartTime) / insertCount
      };

      // 查询性能测试
      console.log(`🔍 测试查询性能 (${selectCount} 次查询)...`);
      const selectStartTime = Date.now();
      for (let i = 0; i < selectCount; i++) {
        await this.adapter.get('SELECT * FROM users WHERE status = ? LIMIT 1', ['active']);
      }
      const selectEndTime = Date.now();
      
      results.select = {
        count: selectCount,
        totalTime: selectEndTime - selectStartTime,
        avgTime: (selectEndTime - selectStartTime) / selectCount
      };

      // 更新性能测试
      console.log(`✏️ 测试更新性能 (${updateCount} 次更新)...`);
      const updateStartTime = Date.now();
      for (let i = 0; i < updateCount; i++) {
        await this.adapter.run('UPDATE users SET updated_at = NOW() WHERE id = ?', [i + 1]);
      }
      const updateEndTime = Date.now();
      
      results.update = {
        count: updateCount,
        totalTime: updateEndTime - updateStartTime,
        avgTime: (updateEndTime - updateStartTime) / updateCount
      };

      // 删除性能测试
      console.log(`🗑️ 测试删除性能 (${deleteCount} 次删除)...`);
      const deleteStartTime = Date.now();
      for (let i = 0; i < deleteCount; i++) {
        await this.adapter.run('DELETE FROM users WHERE id = ?', [i + 1]);
      }
      const deleteEndTime = Date.now();
      
      results.delete = {
        count: deleteCount,
        totalTime: deleteEndTime - deleteStartTime,
        avgTime: (deleteEndTime - deleteStartTime) / deleteCount
      };

      const overallEndTime = Date.now();
      results.overall.totalTime = overallEndTime - overallStartTime;

      console.log('✅ MySQL性能测试完成');
      console.log('📊 性能测试结果:');
      console.log(`   插入: ${results.insert.avgTime.toFixed(2)}ms/条`);
      console.log(`   查询: ${results.select.avgTime.toFixed(2)}ms/次`);
      console.log(`   更新: ${results.update.avgTime.toFixed(2)}ms/次`);
      console.log(`   删除: ${results.delete.avgTime.toFixed(2)}ms/次`);
      console.log(`   总耗时: ${results.overall.totalTime}ms`);

      return results;

    } catch (error) {
      console.error('MySQL性能测试失败:', error);
      throw error;
    }
  }

  /**
   * 监控MySQL查询执行时间
   */
  startQueryTimer(queryId: string): void {
    this.queryStartTimes.set(queryId, Date.now());
  }

  /**
   * 结束查询计时并记录
   */
  endQueryTimer(queryId: string, sql: string): number {
    const startTime = this.queryStartTimes.get(queryId);
    if (!startTime) {
      console.warn(`查询计时器未找到: ${queryId}`);
      return 0;
    }

    const executionTime = Date.now() - startTime;
    this.queryStartTimes.delete(queryId);

    // 记录慢查询
    if (executionTime > 1000) {
      console.warn(`🐌 慢查询检测 (${executionTime}ms): ${sql.substring(0, 100)}...`);
    }

    return executionTime;
  }

  /**
   * 检查MySQL表结构完整性
   */
  async validateMySQLTableStructure(expectedTables: string[]): Promise<{ valid: boolean; missing: string[]; extra: string[] }> {
    try {
      const existingTables = await this.adapter.all(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
      `);

      const existingTableNames = existingTables.map((table: any) => table.table_name);
      const missing = expectedTables.filter(table => !existingTableNames.includes(table));
      const extra = existingTableNames.filter(table => !expectedTables.includes(table));

      return {
        valid: missing.length === 0,
        missing,
        extra
      };
    } catch (error) {
      console.error('验证MySQL表结构失败:', error);
      throw error;
    }
  }

  /**
   * 获取MySQL连接池状态
   */
  async getMySQLConnectionPoolStatus(): Promise<any> {
    try {
      const poolStatus = this.adapter.getPoolStatus();
      const connectionStats = await this.adapter.all(`
        SHOW STATUS WHERE Variable_name IN (
          'Threads_connected',
          'Threads_running',
          'Max_used_connections',
          'Connection_errors_max_connections'
        )
      `);

      const stats: any = {};
      connectionStats.forEach((row: any) => {
        stats[row.Variable_name] = row.Value;
      });

      return {
        poolConfig: poolStatus?.config,
        currentConnections: stats.Threads_connected,
        runningThreads: stats.Threads_running,
        maxUsedConnections: stats.Max_used_connections,
        connectionErrors: stats.Connection_errors_max_connections,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('获取MySQL连接池状态失败:', error);
      throw error;
    }
  }

  /**
   * 清理MySQL测试环境
   */
  async cleanupMySQLTestEnvironment(): Promise<void> {
    try {
      console.log('🧹 开始清理MySQL测试环境...');
      
      await this.dataFactory.cleanupMySQLTestData();
      
      // 清理性能历史记录
      this.performanceHistory = [];
      this.queryStartTimes.clear();
      
      console.log('✅ MySQL测试环境清理完成');
    } catch (error) {
      console.error('清理MySQL测试环境失败:', error);
      throw error;
    }
  }

  /**
   * 获取性能历史记录
   */
  getPerformanceHistory(): MySQLPerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  /**
   * 导出诊断报告为JSON
   */
  async exportDiagnosticReport(): Promise<string> {
    try {
      const report = await this.generateMySQLDiagnosticReport();
      return JSON.stringify(report, null, 2);
    } catch (error) {
      console.error('导出诊断报告失败:', error);
      throw error;
    }
  }

  /**
   * 执行MySQL健康检查
   */
  async performMySQLHealthCheck(): Promise<{ healthy: boolean; issues: string[]; recommendations: string[] }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // 检查连接
      const connectionOk = await this.verifyMySQLConnection();
      if (!connectionOk) {
        issues.push('MySQL连接失败');
        recommendations.push('检查MySQL服务状态和连接配置');
      }

      // 检查性能指标
      const metrics = await this.collectMySQLPerformanceMetrics();
      
      if (metrics.activeConnections > 80) {
        issues.push('活跃连接数过高');
        recommendations.push('优化连接池配置或检查连接泄漏');
      }

      if (metrics.cacheHitRatio < 80) {
        issues.push('缓存命中率低');
        recommendations.push('优化查询缓存配置');
      }

      if (metrics.slowQueryCount > 10) {
        issues.push('慢查询数量较多');
        recommendations.push('优化SQL查询和索引');
      }

      return {
        healthy: issues.length === 0,
        issues,
        recommendations
      };

    } catch (error) {
      console.error('MySQL健康检查失败:', error);
      return {
        healthy: false,
        issues: ['健康检查执行失败'],
        recommendations: ['检查MySQL服务状态']
      };
    }
  }
}

/**
 * 便捷的工厂函数
 */
export function createMySQLDatabaseTestHelper(adapter: MySQLAdapter): MySQLDatabaseTestHelper {
  return new MySQLDatabaseTestHelper(adapter);
}

export default MySQLDatabaseTestHelper;