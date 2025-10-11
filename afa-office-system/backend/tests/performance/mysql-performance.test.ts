/**
 * MySQL性能测试和优化
 * 创建MySQL性能基准测试、测试并发场景下的性能表现、识别和优化MySQL性能瓶颈
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { MySQLAdapter } from '../../src/adapters/mysql-adapter';
import { DatabaseConfigManager, DatabaseType, MySQLConfig } from '../../src/config/database-config-manager';
import { createMySQLTestToolkit, MySQLTestToolkit } from '../../tests/helpers/mysql-test-tools';

interface PerformanceMetrics {
  operationType: string;
  operationCount: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  throughput: number; // 操作/秒
}

interface BenchmarkResult {
  testName: string;
  metrics: PerformanceMetrics[];
  summary: {
    totalOperations: number;
    totalTime: number;
    overallThroughput: number;
  };
}

describe('MySQL性能测试和优化', () => {
  let isMySQL: boolean = false;
  let config: MySQLConfig;

  beforeAll(async () => {
    // 检查是否配置为使用MySQL
    process.env.TEST_DB_TYPE = 'mysql';
    const configManager = DatabaseConfigManager.getInstance();
    configManager.resetConfig();
    const testConfig = configManager.getConfig();
    
    if (testConfig.type !== DatabaseType.MYSQL) {
      console.log('⚠️ 未配置MySQL，跳过性能测试');
      return;
    }

    config = testConfig as MySQLConfig;
    
    try {
      // 测试MySQL连接
      const testAdapter = new MySQLAdapter();
      await testAdapter.connect(config);
      await testAdapter.disconnect();
      isMySQL = true;
      console.log('✅ MySQL服务可用，开始性能测试');
    } catch (error) {
      console.log('⚠️ MySQL服务不可用，跳过性能测试:', (error as Error).message);
      isMySQL = false;
    }
  });

  describe('1. MySQL性能基准测试', () => {
    let adapter: MySQLAdapter;
    let toolkit: MySQLTestToolkit;
    let testDbName: string;

    beforeEach(async () => {
      if (!isMySQL) return;
      
      testDbName = `test_perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      adapter = new MySQLAdapter();
      await adapter.connect(config);
      toolkit = createMySQLTestToolkit(adapter);
      
      // 初始化测试环境
      await adapter.createTestDatabase(testDbName);
      await adapter.initializeSchema(testDbName);
    });

    afterEach(async () => {
      if (!isMySQL || !adapter) return;
      
      try {
        await adapter.dropTestDatabase(testDbName);
        await adapter.disconnect();
      } catch (error) {
        console.warn('清理性能测试环境时出现警告:', error);
      }
    });

    async function measureOperation<T>(
      operationName: string,
      operation: () => Promise<T>,
      iterations: number = 1
    ): Promise<PerformanceMetrics> {
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await operation();
        const endTime = performance.now();
        times.push(endTime - startTime);
      }
      
      const totalTime = times.reduce((sum, time) => sum + time, 0);
      const averageTime = totalTime / iterations;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const throughput = (iterations / totalTime) * 1000; // 操作/秒
      
      return {
        operationType: operationName,
        operationCount: iterations,
        totalTime,
        averageTime,
        minTime,
        maxTime,
        throughput
      };
    }

    it('应该能够测量INSERT操作性能', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过INSERT性能测试 - MySQL不可用');
        return;
      }

      const insertMetrics = await measureOperation(
        'INSERT',
        async () => {
          const randomId = Math.random().toString(36).substr(2, 9);
          return await adapter.run(
            'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
            [`性能测试商户_${randomId}`, `PERF_${randomId}`, 'active']
          );
        },
        50
      );

      expect(insertMetrics.operationCount).toBe(50);
      expect(insertMetrics.totalTime).toBeGreaterThan(0);
      expect(insertMetrics.averageTime).toBeGreaterThan(0);
      expect(insertMetrics.throughput).toBeGreaterThan(0);
      
      console.log(`INSERT性能: 平均${insertMetrics.averageTime.toFixed(2)}ms, 吞吐量${insertMetrics.throughput.toFixed(2)}ops/s`);
      
      // 性能基准：INSERT操作应该在合理时间内完成
      expect(insertMetrics.averageTime).toBeLessThan(100); // 平均不超过100ms
      expect(insertMetrics.throughput).toBeGreaterThan(10); // 至少10ops/s
    });

    it('应该能够测量SELECT操作性能', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过SELECT性能测试 - MySQL不可用');
        return;
      }

      // 先插入测试数据
      for (let i = 0; i < 100; i++) {
        await adapter.run(
          'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
          [`查询测试商户${i}`, `SELECT_PERF_${i}`, i % 2 === 0 ? 'active' : 'inactive']
        );
      }

      const selectMetrics = await measureOperation(
        'SELECT',
        async () => {
          const randomIndex = Math.floor(Math.random() * 100);
          return await adapter.get(
            'SELECT * FROM merchants WHERE code = ?',
            [`SELECT_PERF_${randomIndex}`]
          );
        },
        100
      );

      expect(selectMetrics.operationCount).toBe(100);
      expect(selectMetrics.totalTime).toBeGreaterThan(0);
      expect(selectMetrics.averageTime).toBeGreaterThan(0);
      expect(selectMetrics.throughput).toBeGreaterThan(0);
      
      console.log(`SELECT性能: 平均${selectMetrics.averageTime.toFixed(2)}ms, 吞吐量${selectMetrics.throughput.toFixed(2)}ops/s`);
      
      // 性能基准：SELECT操作应该很快
      expect(selectMetrics.averageTime).toBeLessThan(50); // 平均不超过50ms
      expect(selectMetrics.throughput).toBeGreaterThan(20); // 至少20ops/s
    });

    it('应该能够测量UPDATE操作性能', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过UPDATE性能测试 - MySQL不可用');
        return;
      }

      // 先插入测试数据
      const insertedIds = [];
      for (let i = 0; i < 50; i++) {
        const result = await adapter.run(
          'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
          [`更新测试商户${i}`, `UPDATE_PERF_${i}`, 'active']
        );
        insertedIds.push(result.lastID);
      }

      const updateMetrics = await measureOperation(
        'UPDATE',
        async () => {
          const randomIndex = Math.floor(Math.random() * 50);
          return await adapter.run(
            'UPDATE merchants SET status = ? WHERE code = ?',
            ['updated', `UPDATE_PERF_${randomIndex}`]
          );
        },
        50
      );

      expect(updateMetrics.operationCount).toBe(50);
      expect(updateMetrics.totalTime).toBeGreaterThan(0);
      expect(updateMetrics.averageTime).toBeGreaterThan(0);
      expect(updateMetrics.throughput).toBeGreaterThan(0);
      
      console.log(`UPDATE性能: 平均${updateMetrics.averageTime.toFixed(2)}ms, 吞吐量${updateMetrics.throughput.toFixed(2)}ops/s`);
      
      // 性能基准：UPDATE操作应该在合理时间内完成
      expect(updateMetrics.averageTime).toBeLessThan(80); // 平均不超过80ms
      expect(updateMetrics.throughput).toBeGreaterThan(12); // 至少12ops/s
    });

    it('应该能够测量DELETE操作性能', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过DELETE性能测试 - MySQL不可用');
        return;
      }

      // 先插入测试数据
      for (let i = 0; i < 30; i++) {
        await adapter.run(
          'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
          [`删除测试商户${i}`, `DELETE_PERF_${i}`, 'active']
        );
      }

      const deleteMetrics = await measureOperation(
        'DELETE',
        async () => {
          const randomIndex = Math.floor(Math.random() * 30);
          return await adapter.run(
            'DELETE FROM merchants WHERE code = ?',
            [`DELETE_PERF_${randomIndex}`]
          );
        },
        30
      );

      expect(deleteMetrics.operationCount).toBe(30);
      expect(deleteMetrics.totalTime).toBeGreaterThan(0);
      expect(deleteMetrics.averageTime).toBeGreaterThan(0);
      expect(deleteMetrics.throughput).toBeGreaterThan(0);
      
      console.log(`DELETE性能: 平均${deleteMetrics.averageTime.toFixed(2)}ms, 吞吐量${deleteMetrics.throughput.toFixed(2)}ops/s`);
      
      // 性能基准：DELETE操作应该在合理时间内完成
      expect(deleteMetrics.averageTime).toBeLessThan(80); // 平均不超过80ms
      expect(deleteMetrics.throughput).toBeGreaterThan(12); // 至少12ops/s
    });

    it('应该能够生成综合性能基准报告', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过综合性能基准测试 - MySQL不可用');
        return;
      }

      const benchmarkResult = await toolkit.runPerformanceBenchmark({
        insertCount: 20,
        selectCount: 40,
        updateCount: 15,
        deleteCount: 10
      });

      expect(benchmarkResult).toBeDefined();
      expect(benchmarkResult.insertOperations).toBeDefined();
      expect(benchmarkResult.selectOperations).toBeDefined();
      expect(benchmarkResult.updateOperations).toBeDefined();
      expect(benchmarkResult.deleteOperations).toBeDefined();

      // 验证性能指标
      const operations = [
        benchmarkResult.insertOperations,
        benchmarkResult.selectOperations,
        benchmarkResult.updateOperations,
        benchmarkResult.deleteOperations
      ];

      operations.forEach(op => {
        expect(op.count).toBeGreaterThan(0);
        expect(op.totalTime).toBeGreaterThan(0);
        expect(op.averageTime).toBeGreaterThan(0);
        expect(op.throughput).toBeGreaterThan(0);
      });

      console.log('综合性能基准测试结果:');
      console.log(`- INSERT: ${benchmarkResult.insertOperations.count}次, 平均${benchmarkResult.insertOperations.averageTime.toFixed(2)}ms`);
      console.log(`- SELECT: ${benchmarkResult.selectOperations.count}次, 平均${benchmarkResult.selectOperations.averageTime.toFixed(2)}ms`);
      console.log(`- UPDATE: ${benchmarkResult.updateOperations.count}次, 平均${benchmarkResult.updateOperations.averageTime.toFixed(2)}ms`);
      console.log(`- DELETE: ${benchmarkResult.deleteOperations.count}次, 平均${benchmarkResult.deleteOperations.averageTime.toFixed(2)}ms`);
    });
  });

  describe('2. 并发场景下的性能表现', () => {
    const concurrentCount = 3;
    let adapters: MySQLAdapter[] = [];
    let toolkits: MySQLTestToolkit[] = [];
    let testDbNames: string[] = [];

    beforeEach(async () => {
      if (!isMySQL) return;
      
      adapters = [];
      toolkits = [];
      testDbNames = [];
      
      // 创建多个并发适配器和工具套件
      for (let i = 0; i < concurrentCount; i++) {
        const adapter = new MySQLAdapter();
        await adapter.connect(config);
        const toolkit = createMySQLTestToolkit(adapter);
        const testDbName = `test_concurrent_perf_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        adapters.push(adapter);
        toolkits.push(toolkit);
        testDbNames.push(testDbName);
        
        await adapter.createTestDatabase(testDbName);
        await adapter.initializeSchema(testDbName);
      }
    });

    afterEach(async () => {
      if (!isMySQL) return;
      
      // 清理所有并发环境
      for (let i = 0; i < adapters.length; i++) {
        try {
          await adapters[i].dropTestDatabase(testDbNames[i]);
          await adapters[i].disconnect();
        } catch (error) {
          console.warn(`清理并发性能测试环境${i}时出现警告:`, error);
        }
      }
    });

    it('应该能够测量并发INSERT性能', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过并发INSERT性能测试 - MySQL不可用');
        return;
      }

      const concurrentInsertCount = 20;
      const startTime = performance.now();
      
      // 并发执行INSERT操作
      const insertPromises = adapters.map((adapter, adapterIndex) => 
        Promise.all(
          Array.from({ length: concurrentInsertCount }, (_, i) => 
            adapter.run(
              'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
              [`并发商户${adapterIndex}_${i}`, `CONCURRENT_INSERT_${adapterIndex}_${i}`, 'active']
            )
          )
        )
      );
      
      const results = await Promise.all(insertPromises);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const totalOperations = concurrentCount * concurrentInsertCount;
      const throughput = (totalOperations / totalTime) * 1000;
      
      // 验证所有操作都成功
      results.forEach(adapterResults => {
        adapterResults.forEach(result => {
          expect(result.lastID).toBeDefined();
          expect(result.changes).toBe(1);
        });
      });
      
      console.log(`并发INSERT性能: ${totalOperations}次操作, 总时间${totalTime.toFixed(2)}ms, 吞吐量${throughput.toFixed(2)}ops/s`);
      
      // 性能基准：并发INSERT应该保持合理的吞吐量
      expect(throughput).toBeGreaterThan(50); // 至少50ops/s
    });

    it('应该能够测量并发SELECT性能', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过并发SELECT性能测试 - MySQL不可用');
        return;
      }

      // 先在每个环境中插入测试数据
      for (let i = 0; i < adapters.length; i++) {
        for (let j = 0; j < 50; j++) {
          await adapters[i].run(
            'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
            [`查询数据${i}_${j}`, `SELECT_DATA_${i}_${j}`, 'active']
          );
        }
      }

      const concurrentSelectCount = 30;
      const startTime = performance.now();
      
      // 并发执行SELECT操作
      const selectPromises = adapters.map((adapter, adapterIndex) => 
        Promise.all(
          Array.from({ length: concurrentSelectCount }, (_, i) => {
            const randomIndex = Math.floor(Math.random() * 50);
            return adapter.get(
              'SELECT * FROM merchants WHERE code = ?',
              [`SELECT_DATA_${adapterIndex}_${randomIndex}`]
            );
          })
        )
      );
      
      const results = await Promise.all(selectPromises);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const totalOperations = concurrentCount * concurrentSelectCount;
      const throughput = (totalOperations / totalTime) * 1000;
      
      // 验证所有查询都返回了结果
      results.forEach(adapterResults => {
        adapterResults.forEach(result => {
          expect(result).toBeDefined();
          expect(result.status).toBe('active');
        });
      });
      
      console.log(`并发SELECT性能: ${totalOperations}次操作, 总时间${totalTime.toFixed(2)}ms, 吞吐量${throughput.toFixed(2)}ops/s`);
      
      // 性能基准：并发SELECT应该有很高的吞吐量
      expect(throughput).toBeGreaterThan(100); // 至少100ops/s
    });

    it('应该能够测量混合操作并发性能', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过混合并发性能测试 - MySQL不可用');
        return;
      }

      const operationsPerAdapter = 15;
      const startTime = performance.now();
      
      // 并发执行混合操作
      const mixedPromises = adapters.map((adapter, adapterIndex) => 
        Promise.all([
          // INSERT操作
          ...Array.from({ length: 5 }, (_, i) => 
            adapter.run(
              'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
              [`混合商户${adapterIndex}_${i}`, `MIXED_${adapterIndex}_${i}`, 'active']
            )
          ),
          // SELECT操作
          ...Array.from({ length: 5 }, (_, i) => 
            adapter.get('SELECT COUNT(*) as count FROM merchants')
          ),
          // UPDATE操作
          ...Array.from({ length: 3 }, (_, i) => 
            adapter.run(
              'UPDATE merchants SET status = ? WHERE code = ?',
              ['updated', `MIXED_${adapterIndex}_${i}`]
            )
          ),
          // DELETE操作
          ...Array.from({ length: 2 }, (_, i) => 
            adapter.run(
              'DELETE FROM merchants WHERE code = ?',
              [`MIXED_${adapterIndex}_${i}`]
            )
          )
        ])
      );
      
      const results = await Promise.all(mixedPromises);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const totalOperations = concurrentCount * operationsPerAdapter;
      const throughput = (totalOperations / totalTime) * 1000;
      
      // 验证操作结果
      results.forEach(adapterResults => {
        expect(adapterResults.length).toBe(operationsPerAdapter);
      });
      
      console.log(`混合并发性能: ${totalOperations}次操作, 总时间${totalTime.toFixed(2)}ms, 吞吐量${throughput.toFixed(2)}ops/s`);
      
      // 性能基准：混合操作应该保持合理的吞吐量
      expect(throughput).toBeGreaterThan(30); // 至少30ops/s
    });
  });

  describe('3. 识别和优化MySQL性能瓶颈', () => {
    let adapter: MySQLAdapter;
    let toolkit: MySQLTestToolkit;
    let testDbName: string;

    beforeEach(async () => {
      if (!isMySQL) return;
      
      testDbName = `test_bottleneck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      adapter = new MySQLAdapter();
      await adapter.connect(config);
      toolkit = createMySQLTestToolkit(adapter);
      
      await adapter.createTestDatabase(testDbName);
      await adapter.initializeSchema(testDbName);
    });

    afterEach(async () => {
      if (!isMySQL || !adapter) return;
      
      try {
        await adapter.dropTestDatabase(testDbName);
        await adapter.disconnect();
      } catch (error) {
        console.warn('清理瓶颈测试环境时出现警告:', error);
      }
    });

    it('应该能够识别慢查询', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过慢查询识别测试 - MySQL不可用');
        return;
      }

      // 插入大量测试数据
      for (let i = 0; i < 200; i++) {
        await adapter.run(
          'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
          [`慢查询商户${i}`, `SLOW_QUERY_${i}`, i % 3 === 0 ? 'active' : 'inactive']
        );
      }

      // 执行可能较慢的查询（没有索引的LIKE查询）
      const slowQueryStart = performance.now();
      const slowResults = await adapter.all(
        "SELECT * FROM merchants WHERE name LIKE '%慢查询%' ORDER BY name"
      );
      const slowQueryTime = performance.now() - slowQueryStart;

      // 执行优化的查询（使用索引）
      const fastQueryStart = performance.now();
      const fastResults = await adapter.all(
        'SELECT * FROM merchants WHERE status = ? ORDER BY id',
        ['active']
      );
      const fastQueryTime = performance.now() - fastQueryStart;

      expect(slowResults.length).toBe(200);
      expect(fastResults.length).toBeGreaterThan(0);
      
      console.log(`慢查询时间: ${slowQueryTime.toFixed(2)}ms, 快查询时间: ${fastQueryTime.toFixed(2)}ms`);
      
      // 验证索引查询确实更快（允许一定的误差）
      if (slowQueryTime > 10 && fastQueryTime > 0) {
        expect(fastQueryTime).toBeLessThan(slowQueryTime * 0.8);
      }
    });

    it('应该能够测量连接池性能影响', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过连接池性能测试 - MySQL不可用');
        return;
      }

      // 测试连接池状态
      const poolStatus = adapter.getPoolStatus();
      expect(poolStatus).toBeDefined();
      expect(poolStatus.ready).toBe(true);

      // 执行大量并发操作来测试连接池
      const connectionPoolOperations = [];
      for (let i = 0; i < 20; i++) {
        connectionPoolOperations.push(
          adapter.run(
            'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
            [`连接池测试${i}`, `POOL_TEST_${i}`, 'active']
          )
        );
      }

      const startTime = performance.now();
      const results = await Promise.all(connectionPoolOperations);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const throughput = (results.length / totalTime) * 1000;

      // 验证所有操作都成功
      results.forEach(result => {
        expect(result.lastID).toBeDefined();
        expect(result.changes).toBe(1);
      });

      console.log(`连接池性能: ${results.length}次并发操作, 总时间${totalTime.toFixed(2)}ms, 吞吐量${throughput.toFixed(2)}ops/s`);
      
      // 连接池应该能够有效处理并发操作
      expect(throughput).toBeGreaterThan(20); // 至少20ops/s
    });

    it('应该能够识别内存使用模式', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过内存使用测试 - MySQL不可用');
        return;
      }

      const initialMemory = process.memoryUsage();
      
      // 执行大量操作
      for (let batch = 0; batch < 5; batch++) {
        const batchOperations = [];
        
        for (let i = 0; i < 50; i++) {
          batchOperations.push(
            adapter.run(
              'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
              [`内存测试${batch}_${i}`, `MEMORY_TEST_${batch}_${i}`, 'active']
            )
          );
        }
        
        await Promise.all(batchOperations);
        
        // 执行一些查询操作
        await adapter.all('SELECT COUNT(*) as count FROM merchants');
        await adapter.all('SELECT * FROM merchants LIMIT 10');
      }

      const finalMemory = process.memoryUsage();
      
      const memoryIncrease = {
        rss: finalMemory.rss - initialMemory.rss,
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
        external: finalMemory.external - initialMemory.external
      };

      console.log('内存使用变化:');
      console.log(`- RSS: ${(memoryIncrease.rss / 1024 / 1024).toFixed(2)}MB`);
      console.log(`- Heap Used: ${(memoryIncrease.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`- Heap Total: ${(memoryIncrease.heapTotal / 1024 / 1024).toFixed(2)}MB`);
      console.log(`- External: ${(memoryIncrease.external / 1024 / 1024).toFixed(2)}MB`);

      // 内存增长应该在合理范围内（不超过50MB）
      expect(memoryIncrease.heapUsed).toBeLessThan(50 * 1024 * 1024);
    });

    it('应该能够进行性能对比分析', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过性能对比测试 - MySQL不可用');
        return;
      }

      // 测试单连接性能
      const singleConnectionResults = [];
      const singleAdapter = adapters[0];
      
      const singleStartTime = performance.now();
      for (let i = 0; i < 30; i++) {
        const result = await singleAdapter.run(
          'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
          [`单连接商户${i}`, `SINGLE_${i}`, 'active']
        );
        singleConnectionResults.push(result);
      }
      const singleEndTime = performance.now();
      const singleTime = singleEndTime - singleStartTime;

      // 测试多连接并发性能
      const multiConnectionPromises = adapters.map((adapter, index) => 
        Promise.all(
          Array.from({ length: 10 }, (_, i) => 
            adapter.run(
              'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
              [`多连接商户${index}_${i}`, `MULTI_${index}_${i}`, 'active']
            )
          )
        )
      );
      
      const multiStartTime = performance.now();
      const multiConnectionResults = await Promise.all(multiConnectionPromises);
      const multiEndTime = performance.now();
      const multiTime = multiEndTime - multiStartTime;

      const singleThroughput = (30 / singleTime) * 1000;
      const multiThroughput = (30 / multiTime) * 1000; // 总共30次操作

      console.log(`性能对比:`);
      console.log(`- 单连接: 30次操作, ${singleTime.toFixed(2)}ms, ${singleThroughput.toFixed(2)}ops/s`);
      console.log(`- 多连接: 30次操作, ${multiTime.toFixed(2)}ms, ${multiThroughput.toFixed(2)}ops/s`);

      // 验证操作都成功
      expect(singleConnectionResults.length).toBe(30);
      expect(multiConnectionResults.flat().length).toBe(30);

      // 多连接并发通常应该更快
      if (multiTime > 0 && singleTime > 0) {
        expect(multiThroughput).toBeGreaterThanOrEqual(singleThroughput * 0.8); // 允许20%的误差
      }
    });
  });
});