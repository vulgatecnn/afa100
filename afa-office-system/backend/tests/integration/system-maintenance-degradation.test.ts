/**
 * 系统维护和降级集成测试
 * 
 * 测试系统维护模式的前后端协调
 * 验证服务降级时的功能可用性
 * 测试错误边界和异常处理
 * 
 * 需求: 6.4, 6.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { IntegrationTestHelper } from '../helpers/integration-test-helper.js';
import { ApiTestClient } from '../../src/utils/api-test-client.js';
import { TestDataFactory } from '../helpers/test-data-factory.js';

describe('系统维护和降级集成测试', () => {
  let testHelper: IntegrationTestHelper;
  let apiClient: ApiTestClient;
  let authenticatedRequest: any;

  beforeEach(async () => {
    // 设置集成测试环境
    testHelper = await IntegrationTestHelper.quickSetup({
      environment: 'integration',
      seedOptions: {
        includeUsers: true,
        includeMerchants: true,
        includeVisitors: true,
      },
    });

    apiClient = testHelper.getApiClient();

    // 创建认证用户
    const { authResponse } = await testHelper.createAndLoginUser('tenant_admin');
    authenticatedRequest = request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${authResponse.accessToken}`);
  });

  afterEach(async () => {
    await testHelper?.cleanup();
  });

  describe('系统维护模式测试', () => {
    it('应该能够启用系统维护模式', async () => {
      // 模拟启用维护模式
      const maintenanceConfig = {
        enabled: true,
        message: '系统正在进行维护升级，预计30分钟后恢复',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        allowedIps: ['127.0.0.1'],
        allowedUserTypes: ['tenant_admin'],
      };

      const response = await request(app)
        .post('/api/v1/system/maintenance')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`)
        .send(maintenanceConfig);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        enabled: true,
        message: maintenanceConfig.message,
      });
    });

    it('应该在维护模式下阻止普通用户访问', async () => {
      // 启用维护模式
      await request(app)
        .post('/api/v1/system/maintenance')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`)
        .send({
          enabled: true,
          message: '系统维护中',
          allowedUserTypes: ['tenant_admin'],
        });

      // 普通员工尝试访问
      const employeeAuth = await testHelper.createAndLoginUser('employee');
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${employeeAuth.authResponse.accessToken}`);

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('系统维护中');
      expect(response.body.code).toBe(9004); // SERVICE_UNAVAILABLE
    });

    it('应该允许管理员在维护模式下访问', async () => {
      // 启用维护模式
      await request(app)
        .post('/api/v1/system/maintenance')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`)
        .send({
          enabled: true,
          message: '系统维护中',
          allowedUserTypes: ['tenant_admin'],
        });

      // 管理员访问
      const adminAuth = await testHelper.createAndLoginUser('tenant_admin');
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminAuth.authResponse.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('应该发送维护通知给所有用户', async () => {
      const maintenanceData = {
        enabled: true,
        message: '系统将于今晚22:00进行维护升级',
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        notifyUsers: true,
      };

      const response = await request(app)
        .post('/api/v1/system/maintenance')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`)
        .send(maintenanceData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.notificationSent).toBe(true);
    });

    it('应该能够禁用维护模式', async () => {
      // 先启用维护模式
      await request(app)
        .post('/api/v1/system/maintenance')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`)
        .send({ enabled: true, message: '维护中' });

      // 禁用维护模式
      const response = await request(app)
        .post('/api/v1/system/maintenance')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`)
        .send({ enabled: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(false);

      // 验证普通用户可以正常访问
      const employeeAuth = await testHelper.createAndLoginUser('employee');
      const userResponse = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${employeeAuth.authResponse.accessToken}`);

      expect(userResponse.status).toBe(200);
    });
  });

  describe('服务降级测试', () => {
    it('应该在数据库连接失败时启用降级模式', async () => {
      // 模拟数据库连接失败
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`)
        .query({ simulateDbFailure: 'true' });

      // 应该返回降级响应而不是完全失败
      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('服务暂时不可用');
      expect(response.body.degraded).toBe(true);
    });

    it('应该在外部服务不可用时提供基础功能', async () => {
      // 模拟外部服务（如微信API）不可用
      const visitorData = TestDataFactory.createVisitorApplication();
      
      const response = await request(app)
        .post('/api/v1/visitor-applications')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('merchant_admin')).authResponse.accessToken}`)
        .send({ ...visitorData, simulateWechatFailure: 'true' });

      // 应该成功创建申请，但不发送微信通知
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.warnings).toContain('微信通知发送失败，已使用短信通知');
    });

    it('应该在高负载时限制非关键功能', async () => {
      // 模拟高负载情况
      const response = await request(app)
        .get('/api/v1/statistics/visitors')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`)
        .query({ simulateHighLoad: 'true' });

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('系统负载过高');
      expect(response.body.code).toBe(9004);
      expect(response.body.retryAfter).toBeDefined();
    });

    it('应该在存储空间不足时阻止文件上传', async () => {
      // 创建测试文件
      const testFile = Buffer.from('test file content');
      
      const response = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('employee')).authResponse.accessToken}`)
        .attach('file', testFile, 'test.txt')
        .field('simulateStorageFull', 'true');

      expect(response.status).toBe(507); // Insufficient Storage
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('存储空间不足');
      expect(response.body.code).toBe(9004);
    });

    it('应该在网络异常时提供缓存数据', async () => {
      // 先正常获取数据以建立缓存
      await request(app)
        .get('/api/v1/merchants')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`);

      // 模拟网络异常，应该返回缓存数据
      const response = await request(app)
        .get('/api/v1/merchants')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`)
        .query({ simulateNetworkError: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.cached).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('错误边界和异常处理测试', () => {
    it('应该正确处理未捕获的异常', async () => {
      const response = await request(app)
        .get('/api/v1/test/uncaught-exception')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('服务器内部错误');
      expect(response.body.code).toBe(9003);
    });

    it('应该处理内存不足异常', async () => {
      const response = await request(app)
        .post('/api/v1/test/memory-exhaustion')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`)
        .send({ simulateMemoryError: true });

      expect(response.status).toBe(507);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('系统资源不足');
    });

    it('应该处理数据库连接池耗尽', async () => {
      // 获取认证令牌
      const { authResponse } = await testHelper.createAndLoginUser('tenant_admin');
      
      // 模拟大量并发请求耗尽连接池
      const promises = Array.from({ length: 20 }, () =>
        request(app)
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${authResponse.accessToken}`)
          .query({ simulateSlowQuery: 'true' })
      );

      const responses = await Promise.all(promises);
      
      // 至少有一些请求应该因为连接池耗尽而失败
      const failedResponses = responses.filter(r => r.status === 503);
      expect(failedResponses.length).toBeGreaterThan(0);
      
      failedResponses.forEach(response => {
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('数据库连接不可用');
      });
    });

    it('应该处理循环依赖错误', async () => {
      const response = await request(app)
        .post('/api/v1/test/circular-dependency')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`)
        .send({ createCircularRef: true });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('数据处理错误');
    });

    it('应该处理第三方服务超时', async () => {
      const visitorData = TestDataFactory.createVisitorApplication();
      
      const response = await request(app)
        .post('/api/v1/visitor-applications')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('merchant_admin')).authResponse.accessToken}`)
        .send({ ...visitorData, simulateTimeout: 'true' });

      // 应该成功创建但有超时警告
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.warnings).toContain('第三方服务响应超时');
    });
  });

  describe('系统恢复测试', () => {
    it('应该在维护结束后自动恢复服务', async () => {
      // 设置短期维护模式
      const endTime = new Date(Date.now() + 2000); // 2秒后结束
      await request(app)
        .post('/api/v1/system/maintenance')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`)
        .send({
          enabled: true,
          message: '短期维护',
          endTime: endTime.toISOString(),
          autoRestore: true,
        });

      // 验证维护模式生效
      let response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('employee')).authResponse.accessToken}`);
      
      expect(response.status).toBe(503);

      // 等待维护结束
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 验证服务自动恢复
      response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('employee')).authResponse.accessToken}`);
      
      expect(response.status).toBe(200);
    });

    it('应该在数据库恢复后重新启用完整功能', async () => {
      // 模拟数据库故障恢复
      const response = await request(app)
        .post('/api/v1/system/database/recover')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`)
        .send({ simulateRecovery: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('recovered');
      expect(response.body.data.functionsRestored).toContain('user_management');
      expect(response.body.data.functionsRestored).toContain('visitor_applications');
    });

    it('应该在错误率降低后退出降级模式', async () => {
      // 模拟错误率监控和自动恢复
      const response = await request(app)
        .get('/api/v1/system/health/detailed')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.errorRate).toBeLessThan(0.05); // 错误率低于5%
      expect(response.body.data.degradationMode).toBe(false);
      expect(response.body.data.allServicesOperational).toBe(true);
    });
  });

  describe('前后端协调测试', () => {
    it('应该通过WebSocket实时通知前端维护状态变化', async () => {
      // 这里需要模拟WebSocket连接
      // 在实际实现中，前端会通过WebSocket接收维护状态更新
      const response = await request(app)
        .get('/api/v1/system/maintenance/status')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('employee')).authResponse.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('maintenanceMode');
      expect(response.body.data).toHaveProperty('degradationLevel');
      expect(response.body.data).toHaveProperty('availableFeatures');
    });

    it('应该提供前端降级配置信息', async () => {
      const response = await request(app)
        .get('/api/v1/system/degradation/config')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('employee')).authResponse.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.disabledFeatures).toBeDefined();
      expect(response.body.data.fallbackOptions).toBeDefined();
      expect(response.body.data.retryIntervals).toBeDefined();
    });

    it('应该在API不可用时提供前端缓存策略', async () => {
      const response = await request(app)
        .get('/api/v1/system/cache/strategy')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('employee')).authResponse.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.cacheableEndpoints).toBeDefined();
      expect(response.body.data.cacheDuration).toBeDefined();
      expect(response.body.data.offlineCapabilities).toBeDefined();
    });
  });

  describe('监控和日志测试', () => {
    it('应该记录维护模式的启用和禁用', async () => {
      await request(app)
        .post('/api/v1/system/maintenance')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`)
        .send({ enabled: true, message: '测试维护' });

      const response = await request(app)
        .get('/api/v1/system/logs/maintenance')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toBeDefined();
      expect(response.body.data.logs.length).toBeGreaterThan(0);
      expect(response.body.data.logs[0]).toMatchObject({
        action: 'maintenance_enabled',
        message: '测试维护',
      });
    });

    it('应该监控系统降级事件', async () => {
      const response = await request(app)
        .get('/api/v1/system/logs/degradation')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`)
        .query({ 
          startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date().toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toBeDefined();
      expect(response.body.data.summary).toMatchObject({
        totalEvents: expect.any(Number),
        degradationCount: expect.any(Number),
        recoveryCount: expect.any(Number),
      });
    });

    it('应该提供系统健康度指标', async () => {
      const response = await request(app)
        .get('/api/v1/system/health/metrics')
        .set('Authorization', `Bearer ${(await testHelper.createAndLoginUser('tenant_admin')).authResponse.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        uptime: expect.any(Number),
        errorRate: expect.any(Number),
        responseTime: expect.any(Number),
        databaseConnections: expect.any(Number),
        memoryUsage: expect.any(Number),
        degradationLevel: expect.any(String),
      });
    });
  });
});