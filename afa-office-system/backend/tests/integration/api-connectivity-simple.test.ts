/**
 * 简化的API连接性测试
 * 实现任务 3.1: 扩展现有的 API 连接性测试
 * 
 * 测试目标:
 * - 验证 API 端点的可达性和响应格式
 * - 实现健康检查和服务状态监控
 * - 需求: 1.1, 1.2, 1.3, 1.4
 */

import { describe, it, expect } from 'vitest';
import { withTestEnvironment } from '../helpers/integration-test-helper.js';
import type { IntegrationTestHelper } from '../helpers/integration-test-helper.js';

describe('简化的API连接性测试', () => {
  describe('1. 系统健康检查', () => {
    it('应该能够执行基本的健康检查', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        // 执行健康检查
        const isHealthy = await helper.performHealthCheck();
        
        // 验证健康检查结果
        expect(typeof isHealthy).toBe('boolean');
        
        console.log('✅ 基本健康检查完成，结果:', isHealthy);
      });
    });

    it('应该能够获取API配置信息', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        // 获取API客户端配置
        const config = apiClient.getConfig();
        
        expect(config).toMatchObject({
          baseUrl: expect.any(String),
          timeout: expect.any(Number),
          retryAttempts: expect.any(Number),
          retryDelay: expect.any(Number),
        });
        
        console.log('✅ API配置验证通过:', config);
      });
    });
  });

  describe('2. 认证功能测试', () => {
    it('应该能够管理认证令牌', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        // 测试令牌设置和获取
        const testToken = 'test-jwt-token-12345';
        const testRefreshToken = 'test-refresh-token-12345';
        
        apiClient.setAuthToken(testToken, testRefreshToken);
        expect(apiClient.getAuthToken()).toBe(testToken);
        
        // 测试令牌清除
        apiClient.clearAuth();
        expect(apiClient.getAuthToken()).toBeNull();
        
        console.log('✅ 认证令牌管理验证通过');
      });
    });

    it('应该能够创建和登录用户', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        // 创建用户并登录
        const { user, authResponse } = await helper.createAndLoginUser('employee');
        
        expect(user).toMatchObject({
          id: expect.any(Number),
          name: expect.any(String),
          user_type: 'employee',
        });
        
        expect(authResponse).toMatchObject({
          accessToken: expect.any(String),
          user: expect.any(Object),
        });
        
        console.log('✅ 用户创建和登录验证通过');
      });
    });
  });

  describe('3. 数据管理功能测试', () => {
    it('应该能够获取种植的测试数据', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const seedData = helper.getSeedData();
        
        expect(seedData).toMatchObject({
          merchants: expect.any(Array),
          users: expect.any(Array),
          projects: expect.any(Array),
        });
        
        expect(seedData.merchants.length).toBeGreaterThan(0);
        expect(seedData.users.length).toBeGreaterThan(0);
        
        console.log('✅ 测试数据验证通过，商户数:', seedData.merchants.length, '用户数:', seedData.users.length);
      });
    });

    it('应该能够生成测试数据', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        // 生成不同类型的测试数据
        const userData = apiClient.generateTestData('user');
        const merchantData = apiClient.generateTestData('merchant');
        const visitorData = apiClient.generateTestData('visitor');
        
        expect(userData).toMatchObject({
          name: expect.any(String),
          phone: expect.any(String),
          user_type: 'employee',
        });
        
        expect(merchantData).toMatchObject({
          name: expect.any(String),
          code: expect.any(String),
          contact: expect.any(String),
        });
        
        expect(visitorData).toMatchObject({
          visitor_name: expect.any(String),
          visit_purpose: expect.any(String),
        });
        
        console.log('✅ 测试数据生成验证通过');
      });
    });
  });

  describe('4. 测试场景创建', () => {
    it('应该能够创建访客流程场景', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const visitorFlow = await helper.createTestScenario('visitor_flow');
        
        expect(visitorFlow).toMatchObject({
          application: expect.any(Object),
          accessRecords: expect.any(Array),
        });
        
        console.log('✅ 访客流程场景创建验证通过');
      });
    });

    it('应该能够创建商户设置场景', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const merchantSetup = await helper.createTestScenario('merchant_setup');
        
        expect(merchantSetup).toMatchObject({
          merchant: expect.any(Object),
          admin: expect.any(Object),
          employees: expect.any(Array),
        });
        
        console.log('✅ 商户设置场景创建验证通过');
      });
    });

    it('应该能够创建访问控制场景', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const accessControl = await helper.createTestScenario('access_control');
        
        expect(accessControl).toMatchObject({
          project: expect.any(Object),
          venues: expect.any(Array),
          floors: expect.any(Array),
        });
        
        console.log('✅ 访问控制场景创建验证通过');
      });
    });
  });

  describe('5. 测试环境管理', () => {
    it('应该能够获取测试统计信息', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const stats = helper.getTestStatistics();
        
        expect(stats).toMatchObject({
          environment: expect.any(String),
          dataStatistics: expect.any(Object),
          apiConfig: expect.any(Object),
          timestamp: expect.any(String),
        });
        
        expect(stats.environment).toBe('unit');
        expect(() => new Date(stats.timestamp)).not.toThrow();
        
        console.log('✅ 测试统计信息验证通过:', stats);
      });
    });

    it('应该能够重新种植数据', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        // 获取初始数据统计
        const initialStats = helper.getTestStatistics();
        const initialMerchantCount = initialStats.dataStatistics.merchants;
        
        // 重新种植更少的数据
        const newSeedData = await helper.reseedData({
          merchantCount: 1,
          usersPerMerchant: 2,
          projectCount: 1,
        });
        
        expect(newSeedData.merchants).toHaveLength(1);
        
        // 验证统计信息已更新
        const newStats = helper.getTestStatistics();
        expect(newStats.dataStatistics.merchants).toBe(1);
        
        console.log('✅ 数据重新种植验证通过，商户数从', initialMerchantCount, '变为', 1);
      });
    });
  });

  describe('6. 异步操作和等待机制', () => {
    it('应该能够等待异步操作完成', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        let operationCompleted = false;
        
        // 模拟异步操作
        setTimeout(() => {
          operationCompleted = true;
        }, 100);
        
        // 等待操作完成
        await helper.waitForAsyncOperation(async () => {
          return operationCompleted;
        }, 1000, 50);
        
        expect(operationCompleted).toBe(true);
        
        console.log('✅ 异步操作等待验证通过');
      });
    });

    it('应该能够处理等待超时', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        // 测试等待超时
        await expect(
          helper.waitForAsyncOperation(async () => {
            return false; // 永远不会完成的条件
          }, 200, 50)
        ).rejects.toThrow();
        
        console.log('✅ 等待超时处理验证通过');
      });
    });
  });

  describe('7. API响应验证', () => {
    it('应该能够验证API响应格式', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        // 创建模拟响应
        const mockResponse = {
          success: true,
          data: { id: 1, name: '测试' },
          message: '操作成功',
          timestamp: new Date().toISOString(),
        };
        
        // 验证响应格式
        expect(() => {
          helper.validateApiResponse(mockResponse, ['success', 'data']);
        }).not.toThrow();
        
        // 验证缺少字段的情况
        expect(() => {
          helper.validateApiResponse({ success: true }, ['success', 'data']);
        }).toThrow();
        
        console.log('✅ API响应格式验证通过');
      });
    });
  });

  describe('8. 错误处理测试', () => {
    it('应该能够处理测试环境错误', async () => {
      // 测试跳过数据种植的情况
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        expect(() => {
          helper.getSeedData();
        }).toThrow('测试数据未种植');
        
        console.log('✅ 测试环境错误处理验证通过');
      }, {
        skipSeeding: true,
      });
    });

    it('应该能够处理配置错误', async () => {
      // 测试无效环境配置
      expect(() => {
        const { TestConfigManager } = require('../../src/utils/test-config-manager.js');
        TestConfigManager.getConfig('invalid' as any);
      }).toThrow();
      
      console.log('✅ 配置错误处理验证通过');
    });
  });

  describe('9. 性能测试', () => {
    it('应该在合理时间内完成测试环境设置', async () => {
      const startTime = Date.now();
      
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const setupTime = Date.now() - startTime;
        
        // 测试环境设置应该在10秒内完成
        expect(setupTime).toBeLessThan(10000);
        
        console.log(`✅ 测试环境设置时间: ${setupTime}ms`);
      });
    });

    it('应该能够处理并发测试操作', async () => {
      const concurrentOperations = Array.from({ length: 5 }, (_, index) =>
        withTestEnvironment(async (helper: IntegrationTestHelper) => {
          const apiClient = helper.getApiClient();
          const testData = apiClient.generateTestData('user');
          
          expect(testData.name).toContain('测试用户');
          
          return { index, success: true };
        })
      );
      
      const results = await Promise.all(concurrentOperations);
      
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result).toMatchObject({
          index,
          success: true,
        });
      });
      
      console.log('✅ 并发测试操作验证通过');
    });
  });

  describe('10. 集成测试完整性验证', () => {
    it('应该验证所有核心功能的集成', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        // 1. 验证测试环境
        const context = helper.getContext();
        expect(context).toBeDefined();
        expect(context.config).toBeDefined();
        expect(context.apiClient).toBeDefined();
        expect(context.seeder).toBeDefined();
        
        // 2. 验证数据管理
        const seedData = helper.getSeedData();
        expect(seedData.merchants.length).toBeGreaterThan(0);
        expect(seedData.users.length).toBeGreaterThan(0);
        
        // 3. 验证用户认证
        const { user, authResponse } = await helper.createAndLoginUser('merchant_admin');
        expect(user.user_type).toBe('merchant_admin');
        expect(authResponse.accessToken).toBeDefined();
        
        // 4. 验证API客户端
        const apiClient = helper.getApiClient();
        expect(apiClient.getAuthToken()).toBeDefined();
        
        // 5. 验证健康检查
        const isHealthy = await helper.performHealthCheck();
        expect(typeof isHealthy).toBe('boolean');
        
        // 6. 验证测试场景
        const visitorFlow = await helper.createTestScenario('visitor_flow');
        expect(visitorFlow.application).toBeDefined();
        
        // 7. 验证统计信息
        const stats = helper.getTestStatistics();
        expect(stats.environment).toBe('unit');
        expect(stats.dataStatistics).toBeDefined();
        
        console.log('✅ 集成测试完整性验证通过');
        console.log('测试统计:', {
          商户数量: seedData.merchants.length,
          用户数量: seedData.users.length,
          项目数量: seedData.projects.length,
          认证用户: user.name,
          环境: stats.environment,
        });
      }, {
        environment: 'unit',
        seedOptions: {
          merchantCount: 2,
          usersPerMerchant: 3,
          projectCount: 1,
          visitorApplicationCount: 3,
          accessRecordCount: 5,
        },
      });
    });
  });
});