/**
 * 错误场景集成测试
 * 
 * 需求: 6.1, 6.2, 6.3, 6.4
 * 
 * 测试网络错误、服务器错误、超时等场景
 * 验证错误处理、重试机制、降级策略
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { ApiTestHelper } from '../helpers/api-test-helper.js';
import { ErrorScenarioTestHelper } from '../helpers/error-scenario-test-helper.js';
import { IntegrationTestHelper } from '../helpers/integration-test-helper.js';

describe('错误场景集成测试', () => {
  let testHelper: IntegrationTestHelper;
  let errorHelper: ErrorScenarioTestHelper;
  let authenticatedRequest: any;

  beforeEach(async () => {
    // 初始化集成测试环境
    testHelper = await IntegrationTestHelper.quickSetup({
      environment: 'integration',
      seedOptions: {
        includeUsers: true,
        includeMerchants: true,
        includeVisitors: true,
      }
    });

    // 初始化错误场景测试辅助工具
    errorHelper = new ErrorScenarioTestHelper(testHelper);

    // 创建认证用户
    authenticatedRequest = await ApiTestHelper.createAuthenticatedRequest({
      userType: 'tenant_admin'
    });
  });

  afterEach(async () => {
    await errorHelper?.cleanup();
    await testHelper?.cleanup();
  });

  describe('网络错误场景测试', () => {
    it('应该正确处理网络连接中断', async () => {
      // 模拟网络中断
      const timeoutScenario = await errorHelper.simulateNetworkTimeout({
        endpoint: '/api/v1/users',
        timeout: 100 // 100ms超时
      });

      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${authenticatedRequest.token}`)
        .timeout(150);

      // 验证超时错误响应
      expect(response.status).toBe(408);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('请求超时');
      expect(response.body.data).toHaveProperty('retryAfter');

      await timeoutScenario.restore();
    });

    it('应该正确处理服务器内部错误', async () => {
      // 模拟服务器错误
      const serverErrorScenario = await errorHelper.simulateServerError({
        endpoint: '/api/v1/merchants',
        errorType: 'database_connection_failed'
      });

      const response = await request(app)
        .get('/api/v1/merchants')
        .set('Authorization', `Bearer ${authenticatedRequest.token}`);

      // 验证服务器错误响应
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('服务器内部错误');
      expect(response.body.code).toBe(1001);

      await serverErrorScenario.restore();
    });

    it('应该正确处理数据库连接失败', async () => {
      // 模拟数据库连接失败
      const dbErrorScenario = await errorHelper.simulateDatabaseError({
        errorType: 'connection_timeout',
        duration: 2000
      });

      const response = await request(app)
        .post('/api/v1/visitors')
        .set('Authorization', `Bearer ${authenticatedRequest.token}`)
        .send({
          name: '测试访客',
          phone: '13800138000',
          visitDate: new Date().toISOString()
        });

      // 验证数据库错误响应
      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('数据库连接失败');

      await dbErrorScenario.restore();
    });
  });

  describe('业务错误场景测试', () => {
    it('应该正确处理权限不足错误', async () => {
      // 创建普通用户请求
      const normalUserRequest = await ApiTestHelper.createAuthenticatedRequest({
        userType: 'visitor'
      });

      const response = await request(app)
        .get('/api/v1/system/health')
        .set('Authorization', `Bearer ${normalUserRequest.token}`);

      // 验证权限错误响应
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('权限不足');
      expect(response.body.code).toBe(3001);
    });

    it('应该正确处理资源不存在错误', async () => {
      const response = await request(app)
        .get('/api/v1/users/99999')
        .set('Authorization', `Bearer ${authenticatedRequest.token}`);

      // 验证资源不存在错误响应
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('用户不存在');
      expect(response.body.code).toBe(2001);
    });

    it('应该正确处理参数验证错误', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${authenticatedRequest.token}`)
        .send({
          // 缺少必需字段
          email: 'invalid-email'
        });

      // 验证参数错误响应
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('参数验证失败');
      expect(response.body.code).toBe(4001);
      expect(response.body.data).toHaveProperty('validationErrors');
    });
  });

  describe('系统降级场景测试', () => {
    it('应该在高负载时启用降级策略', async () => {
      // 模拟高负载场景
      const loadScenario = await errorHelper.simulateHighLoad({
        concurrentRequests: 100,
        duration: 5000
      });

      const response = await request(app)
        .get('/api/v1/statistics/visitors')
        .set('Authorization', `Bearer ${authenticatedRequest.token}`);

      // 验证降级响应
      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('服务降级');
      expect(response.body.data).toHaveProperty('degradationLevel');

      await loadScenario.restore();
    });

    it('应该在数据库异常时返回缓存数据', async () => {
      // 预先缓存一些数据
      await request(app)
        .get('/api/v1/merchants')
        .set('Authorization', `Bearer ${authenticatedRequest.token}`);

      // 模拟数据库异常
      const dbErrorScenario = await errorHelper.simulateDatabaseError({
        errorType: 'connection_lost',
        duration: 3000
      });

      const response = await request(app)
        .get('/api/v1/merchants')
        .set('Authorization', `Bearer ${authenticatedRequest.token}`);

      // 验证缓存数据响应
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.headers).toHaveProperty('x-data-source', 'cache');

      await dbErrorScenario.restore();
    });
  });

  describe('恢复机制测试', () => {
    it('应该在错误恢复后正常工作', async () => {
      // 模拟临时错误
      const tempErrorScenario = await errorHelper.simulateTemporaryError({
        endpoint: '/api/v1/users',
        duration: 1000,
        errorType: 'service_unavailable'
      });

      // 等待错误恢复
      await new Promise(resolve => setTimeout(resolve, 1500));

      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${authenticatedRequest.token}`);

      // 验证恢复后正常响应
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      await tempErrorScenario.restore();
    });

    it('应该正确记录错误和恢复日志', async () => {
      // 模拟错误场景
      const errorScenario = await errorHelper.simulateServerError({
        endpoint: '/api/v1/visitors',
        errorType: 'internal_server_error'
      });

      await request(app)
        .get('/api/v1/visitors')
        .set('Authorization', `Bearer ${authenticatedRequest.token}`);

      await errorScenario.restore();

      // 检查错误日志
      const errorLogs = await errorHelper.getErrorLogs();
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0]).toHaveProperty('errorType', 'internal_server_error');
      expect(errorLogs[0]).toHaveProperty('endpoint', '/api/v1/visitors');
      expect(errorLogs[0]).toHaveProperty('timestamp');
    });
  });
});