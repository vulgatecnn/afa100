/**
 * 系统性能基准测试
 * 测试 API 响应时间和吞吐量、数据库查询性能、前端页面加载和渲染性能
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { performance } from 'perf_hooks';
import app from '../../src/app.js';
import database from '../../src/utils/database.js';
import { UserModel } from '../../src/models/user.model.js';
import { MerchantModel } from '../../src/models/merchant.model.js';
import { AccessRecordModel } from '../../src/models/access-record.model.js';
import { PasscodeModel } from '../../src/models/passcode.model.js';
import { JWTUtils } from '../../src/utils/jwt.js';
import type { User, Merchant } from '../../src/types/index.js';

interface PerformanceMetrics {
  operation: string;
  totalRequests: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  throughput: number; // requests/second
  successRate: number;
  p95Time: number; // 95th percentile
  p99Time: number; // 99th percentile
}

interface DatabaseMetrics {
  queryType: string;
  executionCount: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  recordsProcessed: number;
  throughput: number; // records/second
}

describe('系统性能基准测试', () => {
  let testUsers: User[] = [];
  let testMerchant: Merchant;
  let authToken: string;

  beforeAll(async () => {
    await database.connect();
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    // 创建测试商户
    testMerchant = await MerchantModel.create({
      name: '性能测试商户',
      code: 'PERF_MERCHANT',
      contact: '性能测试联系人',
      phone: '13800138000',
      status: 'active'
    });

    // 创建测试用户
    const adminUser = await UserModel.create({
      name: '性能测试管理员',
      phone: '13800138001',
      user_type: 'merchant_admin',
      status: 'active',
      merchant_id: testMerchant.id,
      open_id: 'perf_admin_openid'
    });

    // 生成认证令牌
    authToken = JWTUtils.generateToken({
      userId: adminUser.id,
      userType: 'merchant_admin',
      merchantId: testMerchant.id
    });

    // 创建多个测试用户用于性能测试
    const userPromises = Array.from({ length: 50 }, (_, i) =>
      UserModel.create({
        name: `性能测试用户${i + 1}`,
        phone: `1380013${String(i + 1).padStart(4, '0')}`,
        user_type: 'employee',
        status: 'active',
        merchant_id: testMerchant.id,
        open_id: `perf_user_${i + 1}`
      })
    );

    testUsers = await Promise.all(userPromises);
  });

  afterEach(async () => {
    // 清理测试数据
    await database.run('DELETE FROM access_records');
    await database.run('DELETE FROM passcodes');
    await database.run('DELETE FROM users');
    await database.run('DELETE FROM merchants');
    testUsers = [];
  });

  /**
   * 测量API性能指标
   */
  async function measureApiPerformance(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    requestData?: any,
    iterations: number = 50
  ): Promise<PerformanceMetrics> {
    const times: number[] = [];
    const responses: any[] = [];
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      let response;
      try {
        switch (method) {
          case 'GET':
            response = await request(app)
              .get(endpoint)
              .set('Authorization', `Bearer ${authToken}`);
            break;
          case 'POST':
            response = await request(app)
              .post(endpoint)
              .set('Authorization', `Bearer ${authToken}`)
              .send(requestData);
            break;
          case 'PUT':
            response = await request(app)
              .put(endpoint)
              .set('Authorization', `Bearer ${authToken}`)
              .send(requestData);
            break;
          case 'DELETE':
            response = await request(app)
              .delete(endpoint)
              .set('Authorization', `Bearer ${authToken}`);
            break;
        }

        const endTime = performance.now();
        const duration = endTime - startTime;
        
        times.push(duration);
        responses.push(response);
        
        if (response.status >= 200 && response.status < 300) {
          successCount++;
        }
      } catch (error) {
        const endTime = performance.now();
        times.push(endTime - startTime);
        responses.push({ status: 500, error });
      }
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const throughput = (iterations / totalTime) * 1000;
    const successRate = (successCount / iterations) * 100;

    // 计算百分位数
    const sortedTimes = [...times].sort((a, b) => a - b);
    const p95Index = Math.floor(iterations * 0.95);
    const p99Index = Math.floor(iterations * 0.99);
    const p95Time = sortedTimes[p95Index] || maxTime;
    const p99Time = sortedTimes[p99Index] || maxTime;

    return {
      operation: `${method} ${endpoint}`,
      totalRequests: iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      throughput,
      successRate,
      p95Time,
      p99Time
    };
  }

  /**
   * 测量数据库查询性能
   */
  async function measureDatabasePerformance(
    queryType: string,
    queryFunction: () => Promise<any>,
    iterations: number = 100
  ): Promise<DatabaseMetrics> {
    const times: number[] = [];
    let totalRecords = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const result = await queryFunction();
      const endTime = performance.now();
      
      times.push(endTime - startTime);
      
      // 计算处理的记录数
      if (Array.isArray(result)) {
        totalRecords += result.length;
      } else if (result && typeof result === 'object') {
        totalRecords += 1;
      }
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const throughput = totalRecords > 0 ? (totalRecords / totalTime) * 1000 : 0;

    return {
      queryType,
      executionCount: iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      recordsProcessed: totalRecords,
      throughput
    };
  }

  describe('1. API 响应时间和吞吐量测试', () => {
    it('应该测量用户管理API性能', async () => {
      // 测试用户列表查询性能
      const getUsersMetrics = await measureApiPerformance('/api/v1/users', 'GET');
      
      expect(getUsersMetrics.successRate).toBeGreaterThan(95);
      expect(getUsersMetrics.averageTime).toBeLessThan(200); // 平均响应时间小于200ms
      expect(getUsersMetrics.throughput).toBeGreaterThan(10); // 吞吐量大于10 req/s
      expect(getUsersMetrics.p95Time).toBeLessThan(500); // 95%请求在500ms内完成

      console.log('用户列表API性能指标:');
      console.log(`- 平均响应时间: ${getUsersMetrics.averageTime.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${getUsersMetrics.throughput.toFixed(2)} req/s`);
      console.log(`- 成功率: ${getUsersMetrics.successRate.toFixed(2)}%`);
      console.log(`- P95响应时间: ${getUsersMetrics.p95Time.toFixed(2)}ms`);
      console.log(`- P99响应时间: ${getUsersMetrics.p99Time.toFixed(2)}ms`);

      // 测试用户创建性能
      const createUserData = {
        name: '性能测试新用户',
        phone: '13900139000',
        user_type: 'employee',
        merchant_id: testMerchant.id
      };

      const createUserMetrics = await measureApiPerformance(
        '/api/v1/users', 
        'POST', 
        createUserData, 
        20
      );

      expect(createUserMetrics.successRate).toBeGreaterThan(90);
      expect(createUserMetrics.averageTime).toBeLessThan(300);
      expect(createUserMetrics.throughput).toBeGreaterThan(5);

      console.log('\n用户创建API性能指标:');
      console.log(`- 平均响应时间: ${createUserMetrics.averageTime.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${createUserMetrics.throughput.toFixed(2)} req/s`);
      console.log(`- 成功率: ${createUserMetrics.successRate.toFixed(2)}%`);
    });

    it('应该测量通行码管理API性能', async () => {
      const user = testUsers[0];
      
      // 测试通行码生成性能
      const generatePasscodeData = {
        userId: user.id,
        userType: 'employee'
      };

      const generateMetrics = await measureApiPerformance(
        '/api/v1/passcodes/generate',
        'POST',
        generatePasscodeData,
        30
      );

      expect(generateMetrics.successRate).toBeGreaterThan(95);
      expect(generateMetrics.averageTime).toBeLessThan(400);
      expect(generateMetrics.throughput).toBeGreaterThan(8);

      console.log('\n通行码生成API性能指标:');
      console.log(`- 平均响应时间: ${generateMetrics.averageTime.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${generateMetrics.throughput.toFixed(2)} req/s`);
      console.log(`- 成功率: ${generateMetrics.successRate.toFixed(2)}%`);

      // 测试通行码验证性能
      const passcode = await PasscodeModel.create({
        user_id: user.id,
        code: 'PERF_TEST_CODE',
        user_type: 'employee',
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        status: 'active'
      });

      const validatePasscodeData = {
        code: passcode.code,
        deviceId: 'perf_test_device'
      };

      const validateMetrics = await measureApiPerformance(
        '/api/v1/passcodes/validate',
        'POST',
        validatePasscodeData,
        25
      );

      expect(validateMetrics.successRate).toBeGreaterThan(90);
      expect(validateMetrics.averageTime).toBeLessThan(250);
      expect(validateMetrics.throughput).toBeGreaterThan(10);

      console.log('\n通行码验证API性能指标:');
      console.log(`- 平均响应时间: ${validateMetrics.averageTime.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${validateMetrics.throughput.toFixed(2)} req/s`);
      console.log(`- 成功率: ${validateMetrics.successRate.toFixed(2)}%`);
    });

    it('应该测量通行记录API性能', async () => {
      // 先创建一些测试记录
      const recordPromises = testUsers.slice(0, 20).map((user, i) =>
        AccessRecordModel.create({
          user_id: user.id,
          device_id: `perf_device_${i % 5}`,
          direction: i % 2 === 0 ? 'in' : 'out',
          result: 'success',
          timestamp: new Date(Date.now() - i * 60 * 1000).toISOString()
        })
      );
      await Promise.all(recordPromises);

      // 测试通行记录查询性能
      const getRecordsMetrics = await measureApiPerformance(
        '/api/v1/access-records?page=1&limit=20',
        'GET'
      );

      expect(getRecordsMetrics.successRate).toBeGreaterThan(95);
      expect(getRecordsMetrics.averageTime).toBeLessThan(300);
      expect(getRecordsMetrics.throughput).toBeGreaterThan(8);

      console.log('\n通行记录查询API性能指标:');
      console.log(`- 平均响应时间: ${getRecordsMetrics.averageTime.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${getRecordsMetrics.throughput.toFixed(2)} req/s`);
      console.log(`- 成功率: ${getRecordsMetrics.successRate.toFixed(2)}%`);

      // 测试通行记录创建性能
      const createRecordData = {
        userId: testUsers[0].id,
        deviceId: 'perf_create_device',
        direction: 'in',
        result: 'success'
      };

      const createRecordMetrics = await measureApiPerformance(
        '/api/v1/access-records',
        'POST',
        createRecordData,
        25
      );

      expect(createRecordMetrics.successRate).toBeGreaterThan(90);
      expect(createRecordMetrics.averageTime).toBeLessThan(350);
      expect(createRecordMetrics.throughput).toBeGreaterThan(7);

      console.log('\n通行记录创建API性能指标:');
      console.log(`- 平均响应时间: ${createRecordMetrics.averageTime.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${createRecordMetrics.throughput.toFixed(2)} req/s`);
      console.log(`- 成功率: ${createRecordMetrics.successRate.toFixed(2)}%`);
    });

    it('应该测量认证API性能', async () => {
      // 测试JWT令牌验证性能
      const verifyTokenMetrics = await measureApiPerformance(
        '/api/v1/auth/verify',
        'GET'
      );

      expect(verifyTokenMetrics.successRate).toBeGreaterThan(98);
      expect(verifyTokenMetrics.averageTime).toBeLessThan(100);
      expect(verifyTokenMetrics.throughput).toBeGreaterThan(20);

      console.log('\nJWT验证API性能指标:');
      console.log(`- 平均响应时间: ${verifyTokenMetrics.averageTime.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${verifyTokenMetrics.throughput.toFixed(2)} req/s`);
      console.log(`- 成功率: ${verifyTokenMetrics.successRate.toFixed(2)}%`);

      // 测试用户信息获取性能
      const getUserInfoMetrics = await measureApiPerformance(
        '/api/v1/auth/me',
        'GET'
      );

      expect(getUserInfoMetrics.successRate).toBeGreaterThan(95);
      expect(getUserInfoMetrics.averageTime).toBeLessThan(150);
      expect(getUserInfoMetrics.throughput).toBeGreaterThan(15);

      console.log('\n用户信息API性能指标:');
      console.log(`- 平均响应时间: ${getUserInfoMetrics.averageTime.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${getUserInfoMetrics.throughput.toFixed(2)} req/s`);
      console.log(`- 成功率: ${getUserInfoMetrics.successRate.toFixed(2)}%`);
    });
  });

  describe('2. 数据库查询性能测试', () => {
    beforeEach(async () => {
      // 创建更多测试数据用于数据库性能测试
      const additionalUsers = Array.from({ length: 100 }, (_, i) =>
        UserModel.create({
          name: `数据库测试用户${i + 51}`,
          phone: `1390013${String(i + 51).padStart(4, '0')}`,
          user_type: i % 3 === 0 ? 'merchant_admin' : 'employee',
          status: i % 10 === 0 ? 'inactive' : 'active',
          merchant_id: testMerchant.id,
          open_id: `db_test_user_${i + 51}`
        })
      );
      
      const moreUsers = await Promise.all(additionalUsers);
      testUsers.push(...moreUsers);

      // 创建通行记录
      const recordPromises = testUsers.slice(0, 80).map((user, i) =>
        AccessRecordModel.create({
          user_id: user.id,
          device_id: `db_device_${i % 10}`,
          direction: i % 2 === 0 ? 'in' : 'out',
          result: i % 15 === 0 ? 'failed' : 'success',
          timestamp: new Date(Date.now() - i * 30 * 1000).toISOString()
        })
      );
      await Promise.all(recordPromises);
    });

    it('应该测量用户查询性能', async () => {
      // 测试用户列表查询
      const userListMetrics = await measureDatabasePerformance(
        '用户列表查询',
        () => UserModel.findAll({ merchant_id: testMerchant.id }),
        50
      );

      expect(userListMetrics.averageTime).toBeLessThan(50);
      expect(userListMetrics.throughput).toBeGreaterThan(100);

      console.log('\n用户列表查询性能:');
      console.log(`- 平均执行时间: ${userListMetrics.averageTime.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${userListMetrics.throughput.toFixed(2)} records/s`);
      console.log(`- 处理记录数: ${userListMetrics.recordsProcessed}`);

      // 测试用户ID查询
      const userByIdMetrics = await measureDatabasePerformance(
        '用户ID查询',
        () => {
          const randomUser = testUsers[Math.floor(Math.random() * testUsers.length)];
          return UserModel.findById(randomUser.id);
        },
        100
      );

      expect(userByIdMetrics.averageTime).toBeLessThan(20);
      expect(userByIdMetrics.throughput).toBeGreaterThan(200);

      console.log('\n用户ID查询性能:');
      console.log(`- 平均执行时间: ${userByIdMetrics.averageTime.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${userByIdMetrics.throughput.toFixed(2)} records/s`);

      // 测试用户条件查询
      const userFilterMetrics = await measureDatabasePerformance(
        '用户条件查询',
        () => UserModel.findAll({ 
          merchant_id: testMerchant.id, 
          user_type: 'employee',
          status: 'active'
        }),
        30
      );

      expect(userFilterMetrics.averageTime).toBeLessThan(80);
      expect(userFilterMetrics.throughput).toBeGreaterThan(50);

      console.log('\n用户条件查询性能:');
      console.log(`- 平均执行时间: ${userFilterMetrics.averageTime.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${userFilterMetrics.throughput.toFixed(2)} records/s`);
    });

    it('应该测量通行记录查询性能', async () => {
      // 测试通行记录分页查询
      const recordPaginationMetrics = await measureDatabasePerformance(
        '通行记录分页查询',
        () => AccessRecordModel.findWithPagination({
          page: Math.floor(Math.random() * 3) + 1,
          limit: 20
        }),
        40
      );

      expect(recordPaginationMetrics.averageTime).toBeLessThan(100);
      expect(recordPaginationMetrics.throughput).toBeGreaterThan(30);

      console.log('\n通行记录分页查询性能:');
      console.log(`- 平均执行时间: ${recordPaginationMetrics.averageTime.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${recordPaginationMetrics.throughput.toFixed(2)} records/s`);

      // 测试通行记录用户查询
      const recordByUserMetrics = await measureDatabasePerformance(
        '通行记录用户查询',
        () => {
          const randomUser = testUsers[Math.floor(Math.random() * Math.min(testUsers.length, 80))];
          return AccessRecordModel.findByUserId(randomUser.id);
        },
        50
      );

      expect(recordByUserMetrics.averageTime).toBeLessThan(60);
      expect(recordByUserMetrics.throughput).toBeGreaterThan(50);

      console.log('\n通行记录用户查询性能:');
      console.log(`- 平均执行时间: ${recordByUserMetrics.averageTime.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${recordByUserMetrics.throughput.toFixed(2)} records/s`);

      // 测试通行记录时间范围查询
      const recordTimeRangeMetrics = await measureDatabasePerformance(
        '通行记录时间范围查询',
        () => AccessRecordModel.findByTimeRange(
          new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          new Date().toISOString()
        ),
        25
      );

      expect(recordTimeRangeMetrics.averageTime).toBeLessThan(120);
      expect(recordTimeRangeMetrics.throughput).toBeGreaterThan(20);

      console.log('\n通行记录时间范围查询性能:');
      console.log(`- 平均执行时间: ${recordTimeRangeMetrics.averageTime.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${recordTimeRangeMetrics.throughput.toFixed(2)} records/s`);
    });

    it('应该测量数据库写入性能', async () => {
      // 测试用户创建性能
      const userCreateMetrics = await measureDatabasePerformance(
        '用户创建',
        async () => {
          const randomId = Math.random().toString(36).substring(2, 11);
          return await UserModel.create({
            name: `写入测试用户_${randomId}`,
            phone: `139${randomId.substring(0, 8)}`,
            user_type: 'employee',
            status: 'active',
            merchant_id: testMerchant.id,
            open_id: `write_test_${randomId}`
          });
        },
        30
      );

      expect(userCreateMetrics.averageTime).toBeLessThan(100);
      expect(userCreateMetrics.throughput).toBeGreaterThan(20);

      console.log('\n用户创建性能:');
      console.log(`- 平均执行时间: ${userCreateMetrics.averageTime.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${userCreateMetrics.throughput.toFixed(2)} records/s`);

      // 测试通行记录创建性能
      const recordCreateMetrics = await measureDatabasePerformance(
        '通行记录创建',
        async () => {
          const randomUser = testUsers[Math.floor(Math.random() * testUsers.length)];
          return await AccessRecordModel.create({
            user_id: randomUser.id,
            device_id: `write_test_device_${Math.floor(Math.random() * 5)}`,
            direction: Math.random() > 0.5 ? 'in' : 'out',
            result: 'success',
            timestamp: new Date().toISOString()
          });
        },
        50
      );

      expect(recordCreateMetrics.averageTime).toBeLessThan(80);
      expect(recordCreateMetrics.throughput).toBeGreaterThan(25);

      console.log('\n通行记录创建性能:');
      console.log(`- 平均执行时间: ${recordCreateMetrics.averageTime.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${recordCreateMetrics.throughput.toFixed(2)} records/s`);

      // 测试批量写入性能
      const batchCreateMetrics = await measureDatabasePerformance(
        '批量通行记录创建',
        async () => {
          const batchData = Array.from({ length: 10 }, (_, i) => ({
            user_id: testUsers[i % testUsers.length].id,
            device_id: `batch_device_${i % 3}`,
            direction: i % 2 === 0 ? 'in' : 'out',
            result: 'success',
            timestamp: new Date(Date.now() - i * 1000).toISOString()
          }));
          
          const promises = batchData.map(data => AccessRecordModel.create(data));
          return await Promise.all(promises);
        },
        10
      );

      expect(batchCreateMetrics.averageTime).toBeLessThan(500);
      expect(batchCreateMetrics.throughput).toBeGreaterThan(20);

      console.log('\n批量通行记录创建性能:');
      console.log(`- 平均执行时间: ${batchCreateMetrics.averageTime.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${batchCreateMetrics.throughput.toFixed(2)} records/s`);
    });

    it('应该测量复杂查询性能', async () => {
      // 测试联表查询性能
      const joinQueryMetrics = await measureDatabasePerformance(
        '用户通行记录联表查询',
        async () => {
          const query = `
            SELECT u.name, u.phone, ar.direction, ar.result, ar.timestamp
            FROM users u
            JOIN access_records ar ON u.id = ar.user_id
            WHERE u.merchant_id = ? AND ar.timestamp > ?
            ORDER BY ar.timestamp DESC
            LIMIT 20
          `;
          const params = [
            testMerchant.id,
            new Date(Date.now() - 30 * 60 * 1000).toISOString()
          ];
          return await database.all(query, params);
        },
        25
      );

      expect(joinQueryMetrics.averageTime).toBeLessThan(150);
      expect(joinQueryMetrics.throughput).toBeGreaterThan(10);

      console.log('\n联表查询性能:');
      console.log(`- 平均执行时间: ${joinQueryMetrics.averageTime.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${joinQueryMetrics.throughput.toFixed(2)} records/s`);

      // 测试聚合查询性能
      const aggregateQueryMetrics = await measureDatabasePerformance(
        '通行记录统计查询',
        async () => {
          const query = `
            SELECT 
              DATE(timestamp) as date,
              direction,
              result,
              COUNT(*) as count
            FROM access_records
            WHERE timestamp > ?
            GROUP BY DATE(timestamp), direction, result
            ORDER BY date DESC
          `;
          const params = [new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()];
          return await database.all(query, params);
        },
        20
      );

      expect(aggregateQueryMetrics.averageTime).toBeLessThan(200);
      expect(aggregateQueryMetrics.throughput).toBeGreaterThan(5);

      console.log('\n聚合查询性能:');
      console.log(`- 平均执行时间: ${aggregateQueryMetrics.averageTime.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${aggregateQueryMetrics.throughput.toFixed(2)} records/s`);
    });
  });

  describe('3. 系统资源使用性能测试', () => {
    it('应该测量内存使用效率', async () => {
      const initialMemory = process.memoryUsage();
      
      // 执行大量操作
      const operationCount = 200;
      const operations = [];

      for (let i = 0; i < operationCount; i++) {
        if (i % 4 === 0) {
          // 用户查询
          operations.push(UserModel.findAll({ merchant_id: testMerchant.id }));
        } else if (i % 4 === 1) {
          // 通行记录查询
          operations.push(AccessRecordModel.findWithPagination({ page: 1, limit: 10 }));
        } else if (i % 4 === 2) {
          // 用户创建
          const randomId = Math.random().toString(36).substring(2, 11);
          operations.push(UserModel.create({
            name: `内存测试用户_${randomId}`,
            phone: `138${randomId.substring(0, 8)}`,
            user_type: 'employee',
            status: 'active',
            merchant_id: testMerchant.id,
            open_id: `memory_test_${randomId}`
          }));
        } else {
          // 通行记录创建
          const randomUser = testUsers[Math.floor(Math.random() * testUsers.length)];
          operations.push(AccessRecordModel.create({
            user_id: randomUser.id,
            device_id: `memory_device_${i % 5}`,
            direction: i % 2 === 0 ? 'in' : 'out',
            result: 'success',
            timestamp: new Date().toISOString()
          }));
        }
      }

      const startTime = performance.now();
      await Promise.all(operations);
      const endTime = performance.now();

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const duration = endTime - startTime;

      const memoryIncrease = {
        rss: finalMemory.rss - initialMemory.rss,
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
        external: finalMemory.external - initialMemory.external
      };

      console.log(`\n内存使用效率测试 (${operationCount}个操作):`);
      console.log(`- 执行时间: ${duration.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${(operationCount / duration * 1000).toFixed(2)} ops/s`);
      console.log(`- RSS增长: ${(memoryIncrease.rss / 1024 / 1024).toFixed(2)}MB`);
      console.log(`- Heap Used增长: ${(memoryIncrease.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`- Heap Total增长: ${(memoryIncrease.heapTotal / 1024 / 1024).toFixed(2)}MB`);
      console.log(`- External增长: ${(memoryIncrease.external / 1024 / 1024).toFixed(2)}MB`);

      // 性能基准
      expect(duration).toBeLessThan(10000); // 10秒内完成
      expect(Math.abs(memoryIncrease.heapUsed)).toBeLessThan(200 * 1024 * 1024); // 内存增长不超过200MB
    });

    it('应该测量数据库连接池效率', async () => {
      const connectionPoolOperations = [];
      const concurrentCount = 20;

      // 创建并发数据库操作
      for (let i = 0; i < concurrentCount; i++) {
        connectionPoolOperations.push(
          (async () => {
            const operations = [];
            
            // 每个连接执行多个操作
            for (let j = 0; j < 5; j++) {
              if (j % 2 === 0) {
                operations.push(UserModel.findAll({ merchant_id: testMerchant.id }));
              } else {
                operations.push(AccessRecordModel.findWithPagination({ page: 1, limit: 5 }));
              }
            }
            
            return await Promise.all(operations);
          })()
        );
      }

      const startTime = performance.now();
      const results = await Promise.all(connectionPoolOperations);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const totalOperations = concurrentCount * 5;
      const throughput = (totalOperations / duration) * 1000;

      console.log(`\n数据库连接池效率测试:`);
      console.log(`- 并发连接数: ${concurrentCount}`);
      console.log(`- 总操作数: ${totalOperations}`);
      console.log(`- 执行时间: ${duration.toFixed(2)}ms`);
      console.log(`- 吞吐量: ${throughput.toFixed(2)} ops/s`);

      // 验证所有操作都成功
      expect(results).toHaveLength(concurrentCount);
      results.forEach(result => {
        expect(result).toHaveLength(5);
      });

      // 性能基准
      expect(duration).toBeLessThan(5000); // 5秒内完成
      expect(throughput).toBeGreaterThan(20); // 至少20 ops/s
    });
  });

  describe('4. 性能基准报告', () => {
    it('应该生成性能基准报告', async () => {
      const performanceReport = {
        testDate: new Date().toISOString(),
        systemInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          memory: process.memoryUsage()
        },
        benchmarks: {
          api: {
            userManagement: {
              averageResponseTime: '< 200ms',
              throughput: '> 10 req/s',
              successRate: '> 95%'
            },
            passcodeManagement: {
              averageResponseTime: '< 400ms',
              throughput: '> 8 req/s',
              successRate: '> 95%'
            },
            accessRecords: {
              averageResponseTime: '< 300ms',
              throughput: '> 8 req/s',
              successRate: '> 95%'
            },
            authentication: {
              averageResponseTime: '< 100ms',
              throughput: '> 20 req/s',
              successRate: '> 98%'
            }
          },
          database: {
            userQueries: {
              listQuery: '< 50ms',
              idQuery: '< 20ms',
              filterQuery: '< 80ms'
            },
            accessRecordQueries: {
              pagination: '< 100ms',
              userRecords: '< 60ms',
              timeRange: '< 120ms'
            },
            writeOperations: {
              userCreate: '< 100ms',
              recordCreate: '< 80ms',
              batchCreate: '< 500ms'
            },
            complexQueries: {
              joinQuery: '< 150ms',
              aggregateQuery: '< 200ms'
            }
          },
          system: {
            memoryEfficiency: '< 200MB increase for 200 operations',
            connectionPool: '> 20 ops/s with 20 concurrent conne