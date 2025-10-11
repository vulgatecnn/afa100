/**
 * MySQL性能测试和优化 - 简化版本
 * 创建MySQL性能基准测试、测试并发场景下的性能表现、识别和优化MySQL性能瓶颈
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { MySQLAdapter } from '../../src/adapters/mysql-adapter';
import { DatabaseConfigManager, DatabaseType, MySQLConfig } from '../../src/config/database-config-manager';

interface PerformanceMetrics {
  operationType: string;
  operationCount: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  throughput: number; // 操作/秒
}

describe('MySQL性能测试和优化 - 简化版', () => {
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
    let testDbName: string;

    beforeEach(async () => {
      if (!isMySQL) return;
      
      testDbName = `test_perf_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      adapter = new MySQLAdapter();
      await adapter.connect(config);
      
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
          const randomId = Math.random().toString(36).substring(2, 11);
          return await adapter.run(
            'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
            [`性能测试商户_${randomId}`, `PERF_${randomId}`, 'active']
          );
        },
        20
      );

      expect(insertMetrics.operationCount).toBe(20);
      expect(insertMetrics.totalTime).toBeGreaterThan(0);
      expect(insertMetrics.averageTime).toBeGreaterThan(0);
      expect(insertMetrics.throughput).toBeGreaterThan(0);
      
      console.log(`INSERT性能: 平均${insertMetrics.averageTime.toFixed(2)}ms, 吞吐量${insertMetrics.throughput.toFixed(2)}ops/s`);
      
      // 性能基准：INSERT操作应该在合理时间内完成
      expect(insertMetrics.averageTime).toBeLessThan(200); // 平均不超过200ms
      expect(insertMetrics.throughput).toBeGreaterThan(5); // 至少5ops/s
    });

    it('应该能够测量SELECT操作性能', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过SELECT性能测试 - MySQL不可用');
        return;
      }

      // 先插入测试数据
      for (let i = 0; i < 50; i++) {
        await adapter.run(
          'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
          [`查询测试商户${i}`, `SELECT_PERF_${i}`, i % 2 === 0 ? 'active' : 'inactive']
        );
      }

      const selectMetrics = await measureOperation(
        'SELECT',
        async () => {
          const randomIndex = Math.floor(Math.random() * 50);
          return await adapter.get(
            'SELECT * FROM merchants WHERE code = ?',
            [`SELECT_PERF_${randomIndex}`]
          );
        },
        30
      );

      expect(selectMetrics.operationCount).toBe(30);
      expect(selectMetrics.totalTime).toBeGreaterThan(0);
      expect(selectMetrics.averageTime).toBeGreaterThan(0);
      expect(selectMetrics.throughput).toBeGreaterThan(0);
      
      console.log(`SELECT性能: 平均${selectMetrics.averageTime.toFixed(2)}ms, 吞吐量${selectMetrics.throughput.toFixed(2)}ops/s`);
      
      // 性能基准：SELECT操作应该很快
      expect(selectMetrics.averageTime).toBeLessThan(100); // 平均不超过100ms
      expect(selectMetrics.throughput).toBeGreaterThan(10); // 至少10ops/s
    });

    it('应该能够测量UPDATE操作性能', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过UPDATE性能测试 - MySQL不可用');
        return;
      }

      // 先插入测试数据
      for (let i = 0; i < 20; i++) {
        await adapter.run(
          'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
          [`更新测试商户${i}`, `UPDATE_PERF_${i}`, 'active']
        );
      }

      const updateMetrics = await measureOperation(
        'UPDATE',
        async () => {
          const randomIndex = Math.floor(Math.random() * 20);
          return await adapter.run(
            'UPDATE merchants SET status = ? WHERE code = ?',
            ['inactive', `UPDATE_PERF_${randomIndex}`]
          );
        },
        20
      );

      expect(updateMetrics.operationCount).toBe(20);
      expect(updateMetrics.totalTime).toBeGreaterThan(0);
      expect(updateMetrics.averageTime).toBeGreaterThan(0);
      expect(updateMetrics.throughput).toBeGreaterThan(0);
      
      console.log(`UPDATE性能: 平均${updateMetrics.averageTime.toFixed(2)}ms, 吞吐量${updateMetrics.throughput.toFixed(2)}ops/s`);
      
      // 性能基准：UPDATE操作应该在合理时间内完成
      expect(updateMetrics.averageTime).toBeLessThan(150); // 平均不超过150ms
      expect(updateMetrics.throughput).toBeGreaterThan(7); // 至少7ops/s
    });
  });

  describe('2. 并发场景下的性能表现', () => {
    const concurrentCount = 2;
    let adapters: MySQLAdapter[] = [];
    let testDbNames: string[] = [];

    beforeEach(async () => {
      if (!isMySQL) return;
      
      adapters = [];
      testDbNames = [];
      
      // 创建多个并发适配器
      for (let i = 0; i < concurrentCount; i++) {
        const adapter = new MySQLAdapter();
        await adapter.connect(config);
        const testDbName = `test_concurrent_perf_${i}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        
        adapters.push(adapter);
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
          const adapter = adapters[i];
          const dbName = testDbNames[i];
          if (adapter && dbName) {
            await adapter.dropTestDatabase(dbName);
            await adapter.disconnect();
          }
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

      const concurrentInsertCount = 10;
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
      expect(throughput).toBeGreaterThan(20); // 至少20ops/s
    });

    it('应该能够测量并发SELECT性能', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过并发SELECT性能测试 - MySQL不可用');
        return;
      }

      // 先在每个环境中插入测试数据
      for (let i = 0; i < adapters.length; i++) {
        const adapter = adapters[i];
        if (adapter) {
          for (let j = 0; j < 20; j++) {
            await adapter.run(
              'INSERT INTO merchants (name, code, status) VALUES (?, ?, ?)',
              [`查询数据${i}_${j}`, `SELECT_DATA_${i}_${j}`, 'active']
            );
          }
        }
      }

      const concurrentSelectCount = 15;
      const startTime = performance.now();
      
      // 并发执行SELECT操作
      const selectPromises = adapters.map((adapter, adapterIndex) => 
        Promise.all(
          Array.from({ length: concurrentSelectCount }, (_, i) => {
            const randomIndex = Math.floor(Math.random() * 20);
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
      expect(throughput).toBeGreaterThan(50); // 至少50ops/s
    });
  });

  describe('3. 识别和优化MySQL性能瓶颈', () => {
    let adapter: MySQLAdapter;
    let testDbName: string;

    beforeEach(async () => {
      if (!isMySQL) return;
      
      testDbName = `test_bottleneck_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      adapter = new MySQLAdapter();
      await adapter.connect(config);
      
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

      // 插入测试数据
      for (let i = 0; i < 100; i++) {
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

      expect(slowResults.length).toBe(100);
      expect(fastResults.length).toBeGreaterThan(0);
      
      console.log(`慢查询时间: ${slowQueryTime.toFixed(2)}ms, 快查询时间: ${fastQueryTime.toFixed(2)}ms`);
      
      // 验证查询都能正常执行
      expect(slowQueryTime).toBeGreaterThan(0);
      expect(fastQueryTime).toBeGreaterThan(0);
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

      // 执行并发操作来测试连接池
      const connectionPoolOperations = [];
      for (let i = 0; i < 10; i++) {
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
      expect(throughput).toBeGreaterThan(10); // 至少10ops/s
    });

    it('应该能够识别内存使用模式', async () => {
      if (!isMySQL) {
        console.log('⚠️ 跳过内存使用测试 - MySQL不可用');
        return;
      }

      const initialMemory = process.memoryUsage();
      
      // 执行大量操作
      for (let batch = 0; batch < 3; batch++) {
        const batchOperations = [];
        
        for (let i = 0; i < 20; i++) {
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
        await adapter.all('SELECT * FROM merchants LIMIT 5');
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

      // 内存增长应该在合理范围内（不超过100MB）
      expect(Math.abs(memoryIncrease.heapUsed)).toBeLessThan(100 * 1024 * 1024);
    });
  });
});