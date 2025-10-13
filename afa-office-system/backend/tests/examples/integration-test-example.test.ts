/**
 * 集成测试基础设施使用示例
 * 演示如何使用TestConfigManager、DatabaseSeeder、ApiTestClient和IntegrationTestHelper
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { IntegrationTestHelper, withTestEnvironment } from '../helpers/integration-test-helper.js';
import { TestConfigManager } from '../../src/utils/test-config-manager.js';
import { DatabaseSeeder } from '../helpers/database-seeder.js';
import { ApiTestClient } from '../../src/utils/api-test-client.js';

describe('集成测试基础设施示例', () => {
  describe('TestConfigManager 使用示例', () => {
    it('应该能够获取不同环境的配置', () => {
      // 获取单元测试环境配置
      const unitConfig = TestConfigManager.getConfig('unit');
      expect(unitConfig).toBeDefined();
      expect(unitConfig.database).toBeDefined();
      expect(unitConfig.api).toBeDefined();
      expect(unitConfig.jwt).toBeDefined();

      // 获取集成测试环境配置
      const integrationConfig = TestConfigManager.getConfig('integration');
      expect(integrationConfig).toBeDefined();
      expect(integrationConfig.database.database).toBe('afa_office_integration_test');
      expect(integrationConfig.api.port).toBe(3003);

      // 获取端到端测试环境配置
      const e2eConfig = TestConfigManager.getConfig('e2e');
      expect(e2eConfig).toBeDefined();
      expect(e2eConfig.database.database).toBe('afa_office_e2e_test');
      expect(e2eConfig.api.port).toBe(3005);
    });

    it('应该能够合并配置', () => {
      const baseConfig = TestConfigManager.getConfig('unit');
      const customConfig = TestConfigManager.mergeConfig(baseConfig, {
        api: { timeout: 20000 },
        test: { parallel: false },
      });

      expect(customConfig.api.timeout).toBe(20000);
      expect(customConfig.test.parallel).toBe(false);
      expect(customConfig.database.host).toBe(baseConfig.database.host); // 其他配置保持不变
    });
  });

  describe('ApiTestClient 使用示例', () => {
    let apiClient: ApiTestClient;

    beforeAll(() => {
      const config = TestConfigManager.getConfig('unit');
      apiClient = new ApiTestClient({
        baseUrl: config.api.baseUrl,
        timeout: config.api.timeout,
        retryAttempts: config.api.retryAttempts,
        retryDelay: config.api.retryDelay,
      });
    });

    it('应该能够创建API客户端并配置重试机制', () => {
      expect(apiClient).toBeDefined();
      expect(apiClient.getConfig().baseUrl).toBe('http://localhost:3001');
      expect(apiClient.getConfig().retryAttempts).toBe(2);
    });

    it('应该能够生成测试数据', () => {
      const userData = apiClient.generateTestData('user');
      expect(userData).toHaveProperty('name');
      expect(userData).toHaveProperty('phone');
      expect(userData).toHaveProperty('user_type');

      const merchantData = apiClient.generateTestData('merchant');
      expect(merchantData).toHaveProperty('name');
      expect(merchantData).toHaveProperty('code');
      expect(merchantData).toHaveProperty('contact');

      const visitorData = apiClient.generateTestData('visitor');
      expect(visitorData).toHaveProperty('visitor_name');
      expect(visitorData).toHaveProperty('visit_purpose');
    });

    it('应该能够设置和获取认证令牌', () => {
      const testToken = 'test-jwt-token-123';
      apiClient.setAuthToken(testToken);
      expect(apiClient.getAuthToken()).toBe(testToken);

      apiClient.clearAuth();
      expect(apiClient.getAuthToken()).toBeNull();
    });
  });

  describe('IntegrationTestHelper 使用示例', () => {
    it('应该能够使用便捷的测试环境包装器', async () => {
      await withTestEnvironment(async (helper) => {
        // 获取测试上下文
        const context = helper.getContext();
        expect(context).toBeDefined();
        expect(context.config).toBeDefined();
        expect(context.apiClient).toBeDefined();
        expect(context.seeder).toBeDefined();

        // 获取种植的测试数据
        const seedData = helper.getSeedData();
        expect(seedData.merchants.length).toBeGreaterThan(0);
        expect(seedData.users.length).toBeGreaterThan(0);
        expect(seedData.projects.length).toBeGreaterThan(0);

        // 获取测试统计信息
        const stats = helper.getTestStatistics();
        expect(stats.environment).toBe('unit');
        expect(stats.dataStatistics).toBeDefined();
        expect(stats.apiConfig).toBeDefined();
      }, {
        environment: 'unit',
        seedOptions: {
          merchantCount: 2,
          usersPerMerchant: 3,
          projectCount: 1,
        },
      });
    });

    it('应该能够创建测试场景数据', async () => {
      await withTestEnvironment(async (helper) => {
        // 创建访客流程场景
        const visitorFlow = await helper.createTestScenario('visitor_flow');
        expect(visitorFlow).toHaveProperty('application');
        expect(visitorFlow).toHaveProperty('accessRecords');

        // 创建商户设置场景
        const merchantSetup = await helper.createTestScenario('merchant_setup');
        expect(merchantSetup).toHaveProperty('merchant');
        expect(merchantSetup).toHaveProperty('admin');
        expect(merchantSetup).toHaveProperty('employees');

        // 创建访问控制场景
        const accessControl = await helper.createTestScenario('access_control');
        expect(accessControl).toHaveProperty('project');
        expect(accessControl).toHaveProperty('venues');
        expect(accessControl).toHaveProperty('floors');
      }, {
        environment: 'unit',
        seedOptions: { merchantCount: 1, projectCount: 1 },
      });
    });
  });

  describe('完整的集成测试流程示例', () => {
    let helper: IntegrationTestHelper;

    beforeAll(async () => {
      helper = await IntegrationTestHelper.quickSetup({
        environment: 'unit',
        seedOptions: {
          merchantCount: 2,
          usersPerMerchant: 4,
          projectCount: 1,
          venuesPerProject: 2,
          floorsPerVenue: 2,
          visitorApplicationCount: 5,
          accessRecordCount: 10,
        },
      });
    });

    afterAll(async () => {
      await helper.cleanup();
    });

    it('应该能够执行完整的测试流程', async () => {
      // 1. 验证测试环境设置
      const context = helper.getContext();
      expect(context).toBeDefined();

      // 2. 获取种植的数据
      const seedData = helper.getSeedData();
      expect(seedData.merchants).toHaveLength(2);
      expect(seedData.users.length).toBeGreaterThan(8); // 2个商户 * 4个用户 + 1个管理员
      expect(seedData.projects).toHaveLength(1);
      expect(seedData.venues).toHaveLength(2);
      expect(seedData.floors).toHaveLength(4);
      expect(seedData.visitorApplications).toHaveLength(5);
      expect(seedData.accessRecords).toHaveLength(10);

      // 3. 测试API客户端功能
      const apiClient = helper.getApiClient();
      expect(apiClient).toBeDefined();

      // 4. 验证数据关联关系
      const firstMerchant = seedData.merchants[0];
      const merchantUsers = seedData.users.filter(u => u.merchant_id === firstMerchant.id);
      expect(merchantUsers.length).toBeGreaterThan(0);

      const firstProject = seedData.projects[0];
      const projectVenues = seedData.venues.filter(v => v.project_id === firstProject.id);
      expect(projectVenues).toHaveLength(2);

      const firstVenue = projectVenues[0];
      const venueFloors = seedData.floors.filter(f => f.venue_id === firstVenue.id);
      expect(venueFloors).toHaveLength(2);

      // 5. 验证访客申请数据
      const approvedApplications = seedData.visitorApplications.filter(app => app.status === 'approved');
      expect(approvedApplications.length).toBeGreaterThan(0);

      // 6. 验证通行记录数据
      const successRecords = seedData.accessRecords.filter(record => record.result === 'success');
      expect(successRecords.length).toBeGreaterThan(0);

      // 7. 获取测试统计信息
      const stats = helper.getTestStatistics();
      expect(stats.environment).toBe('unit');
      expect(stats.dataStatistics.merchants).toBe(2);
      expect(stats.dataStatistics.projects).toBe(1);
      expect(stats.dataStatistics.venues).toBe(2);
      expect(stats.dataStatistics.floors).toBe(4);
    });

    it('应该能够重新种植数据', async () => {
      // 重新种植更少的数据
      const newSeedData = await helper.reseedData({
        merchantCount: 1,
        usersPerMerchant: 2,
        projectCount: 1,
        visitorApplicationCount: 2,
        accessRecordCount: 3,
      });

      expect(newSeedData.merchants).toHaveLength(1);
      expect(newSeedData.visitorApplications).toHaveLength(2);
      expect(newSeedData.accessRecords).toHaveLength(3);

      // 验证新数据已更新到上下文中
      const currentSeedData = helper.getSeedData();
      expect(currentSeedData.merchants).toHaveLength(1);
    });
  });

  describe('错误处理和边界情况', () => {
    it('应该能够处理配置验证错误', () => {
      expect(() => {
        TestConfigManager.getConfig('invalid' as any);
      }).toThrow('未找到环境');
    });

    it('应该能够处理未初始化的测试上下文', () => {
      const helper = new IntegrationTestHelper();
      
      expect(() => {
        helper.getContext();
      }).toThrow('测试环境未初始化');

      expect(() => {
        helper.getSeedData();
      }).toThrow('测试环境未初始化');
    });

    it('应该能够处理跳过种植数据的情况', async () => {
      await withTestEnvironment(async (helper) => {
        expect(() => {
          helper.getSeedData();
        }).toThrow('测试数据未种植');
      }, {
        skipSeeding: true,
      });
    });
  });
});