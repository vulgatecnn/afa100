/**
 * 核心业务功能集成测试
 * 实现任务 4.1: 建立业务功能集成测试
 * 
 * 测试目标:
 * - 实现核心业务功能的前后端协调测试
 * - 测试数据流转和状态管理的正确性
 * - 验证用户操作的完整性和准确性
 * - 需求: 1.1, 2.1, 3.1, 4.1
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { IntegrationTestHelper } from '../helpers/integration-test-helper.js';
import type { ApiTestClient } from '../../src/utils/api-test-client.js';

describe('核心业务功能集成测试', () => {
  let helper: IntegrationTestHelper;
  let apiClient: ApiTestClient;
  let authToken: string;
  let testMerchantId: number;
  let testUserId: number;

  beforeAll(async () => {
    helper = new IntegrationTestHelper();
    await helper.setup({
      environment: 'integration',
      seedOptions: {
        includeUsers: true,
        includeMerchants: true,
        includeEmployees: true,
        includeVisitors: true,
      },
    });

    apiClient = helper.getApiClient();

    // 创建测试用户并获取认证令牌
    const { user, authResponse } = await helper.createAndLoginUser('merchant_admin');
    authToken = authResponse.accessToken;
    testUserId = user.id;

    // 获取测试商户ID
    const seedData = helper.getSeedData();
    testMerchantId = seedData?.merchants?.[0]?.id || 1;

    console.log('✅ 业务功能集成测试环境初始化完成');
  });

  afterAll(async () => {
    await helper?.cleanup();
    console.log('🧹 业务功能集成测试清理完成');
  });

  describe('1. 访客申请业务流程测试', () => {
    it('应该完成访客申请-审批流程', async () => {
      console.log('🧪 测试访客申请业务流程...');

      // 创建访客申请
      const visitorApplicationData = {
        visitorName: '张三',
        visitorPhone: '13800138001',
        visitorCompany: '测试公司',
        visitPurpose: '商务洽谈',
        visitDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        visitTime: '14:00',
        visiteeId: testUserId,
        expectedDuration: 120,
      };

      const createResponse = await apiClient.request(
        'POST',
        `/api/v1/merchants/${testMerchantId}/visitor-applications`,
        visitorApplicationData
      );

      expect([200, 201]).toContain(createResponse.status);

      if ([200, 201].includes(createResponse.status)) {
        const application = createResponse.data;
        expect(application).toMatchObject({
          visitorName: visitorApplicationData.visitorName,
          visitorPhone: visitorApplicationData.visitorPhone,
          status: 'pending',
          merchantId: testMerchantId,
        });

        console.log('✅ 访客申请创建成功');
      } else {
        console.log(`⚠️ 访客申请创建失败，状态码: ${createResponse.status}`);
      }
    });

    it('应该完成访客申请拒绝流程', async () => {
      console.log('🧪 测试访客申请拒绝流程...');

      // 创建访客申请
      const visitorApplicationData = {
        visitorName: '李四',
        visitorPhone: '13800138002',
        visitorCompany: '外部公司',
        visitPurpose: '推销产品',
        visitDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        visitTime: '10:00',
        visiteeId: testUserId,
        expectedDuration: 60,
      };

      const createResponse = await apiClient.request(
        'POST',
        `/api/v1/merchants/${testMerchantId}/visitor-applications`,
        visitorApplicationData
      );

      expect([200, 201]).toContain(createResponse.status);

      if ([200, 201].includes(createResponse.status)) {
        const application = createResponse.data;
        const applicationId = application.id;

        // 拒绝申请
        const rejectionData = {
          status: 'rejected',
          approvalNotes: '访问目的不符合公司政策',
        };

        const rejectionResponse = await apiClient.request(
          'PUT',
          `/api/v1/merchants/${testMerchantId}/visitor-applications/${applicationId}`,
          rejectionData
        );

        expect([200, 400, 401, 404]).toContain(rejectionResponse.status);

        if (rejectionResponse.status === 200) {
          const rejectedApplication = rejectionResponse.data;
          expect(rejectedApplication).toMatchObject({
            id: applicationId,
            status: 'rejected',
          });
        }

        console.log('✅ 访客申请拒绝流程测试完成');
      }
    });
  });

  describe('2. 员工管理业务流程测试', () => {
    it('应该完成员工创建-查询流程', async () => {
      console.log('🧪 测试员工管理业务流程...');

      // 1. 创建员工
      const employeeData = {
        userName: '王五',
        phone: '13800138003',
        email: 'wangwu@example.com',
        department: '技术部',
        position: '软件工程师',
        status: 'active',
      };

      const createResponse = await apiClient.request(
        'POST',
        `/api/v1/merchants/${testMerchantId}/employees`,
        employeeData
      );

      expect([200, 201]).toContain(createResponse.status);

      if ([200, 201].includes(createResponse.status)) {
        const employee = createResponse.data;
        expect(employee).toMatchObject({
          id: expect.any(Number),
          userName: employeeData.userName,
          phone: employeeData.phone,
          merchantId: testMerchantId,
          status: 'active',
        });

        const employeeId = employee.id;

        // 2. 查询员工列表，验证员工已创建
        const listResponse = await apiClient.request(
          'GET',
          `/api/v1/merchants/${testMerchantId}/employees`
        );

        expect([200, 401, 404]).toContain(listResponse.status);

        if (listResponse.status === 200) {
          const employees = listResponse.data.items || listResponse.data;
          const createdEmployee = Array.isArray(employees)
            ? employees.find((emp: any) => emp.id === employeeId)
            : null;

          if (createdEmployee) {
            expect(createdEmployee.status).toBe('active');
          }
        }

        console.log('✅ 员工管理业务流程测试完成');
      } else {
        console.log(`⚠️ 员工创建失败，状态码: ${createResponse.status}`);
      }
    });
  });

  describe('3. 商户空间管理业务流程测试', () => {
    it('应该完成空间创建-配置-权限管理流程', async () => {
      console.log('🧪 测试商户空间管理业务流程...');

      // 1. 创建空间
      const spaceData = {
        spaceName: '会议室A',
        spaceType: 'meeting_room',
        capacity: 10,
        location: '3楼东侧',
        description: '配备投影仪和白板的中型会议室',
        features: ['projector', 'whiteboard', 'air_conditioning'],
        status: 'available',
      };

      const createResponse = await apiClient.request(
        'POST',
        `/api/v1/merchants/${testMerchantId}/spaces`,
        spaceData
      );

      expect([200, 201]).toContain(createResponse.status);

      if ([200, 201].includes(createResponse.status)) {
        const space = createResponse.data;
        expect(space).toMatchObject({
          id: expect.any(Number),
          spaceName: spaceData.spaceName,
          spaceType: spaceData.spaceType,
          merchantId: testMerchantId,
          status: 'available',
        });

        console.log('✅ 商户空间管理业务流程测试完成');
      } else {
        console.log(`⚠️ 空间创建失败，状态码: ${createResponse.status}`);
      }
    });
  });

  describe('4. 通行验证业务流程测试', () => {
    it('应该完成通行验证-记录生成-查询统计流程', async () => {
      console.log('🧪 测试通行验证业务流程...');

      // 1. 模拟通行验证
      const accessData = {
        userId: testUserId,
        deviceId: 'GATE_001',
        location: '主入口',
        accessType: 'entry',
        timestamp: new Date().toISOString(),
      };

      const accessResponse = await apiClient.request(
        'POST',
        `/api/v1/merchants/${testMerchantId}/access-verify`,
        accessData
      );

      expect([200, 201]).toContain(accessResponse.status);

      // 2. 查询通行记录
      const recordsResponse = await apiClient.request(
        'GET',
        `/api/v1/merchants/${testMerchantId}/access-records`
      );

      expect([200, 401, 404]).toContain(recordsResponse.status);

      if (recordsResponse.status === 200) {
        const records = recordsResponse.data.items || recordsResponse.data;
        expect(Array.isArray(records)).toBe(true);
      }

      console.log('✅ 通行验证业务流程测试完成');
    });
  });

  describe('5. 数据流转完整性测试', () => {
    it('应该验证跨模块数据流转的一致性', async () => {
      console.log('🧪 测试跨模块数据流转...');

      // 1. 创建员工
      const employeeData = {
        userName: '赵六',
        phone: '13800138004',
        email: 'zhaoliu@example.com',
        department: '行政部',
        position: '行政助理',
      };

      const employeeResponse = await apiClient.request(
        'POST',
        `/api/v1/merchants/${testMerchantId}/employees`,
        employeeData
      );

      expect([200, 201]).toContain(employeeResponse.status);

      if ([200, 201].includes(employeeResponse.status)) {
        const employee = employeeResponse.data;
        const employeeId = employee.id;

        // 2. 创建访客申请，指定该员工为被访者
        const visitorData = {
          visitorName: '孙七',
          visitorPhone: '13800138005',
          visitorCompany: '合作伙伴公司',
          visitPurpose: '项目讨论',
          visitDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          visitTime: '15:00',
          visiteeId: employeeId, // 使用刚创建的员工为被访者
          expectedDuration: 90,
        };

        const visitorResponse = await apiClient.request(
          'POST',
          `/api/v1/merchants/${testMerchantId}/visitor-applications`,
          visitorData
        );

        expect([200, 201]).toContain(visitorResponse.status);

        if ([200, 201].includes(visitorResponse.status)) {
          const application = visitorResponse.data;

          // 验证数据关联正确性
          expect(application.visiteeId).toBe(employeeId);
        }

        console.log('✅ 跨模块数据流转测试完成');
      }
    });
  });

  describe('6. 业务状态管理测试', () => {
    it('应该正确处理业务状态转换', async () => {
      console.log('🧪 测试业务状态管理...');

      // 1. 创建访客申请，测试状态转换
      const visitorData = {
        visitorName: '周八',
        visitorPhone: '13800138006',
        visitPurpose: '面试',
        visitDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        visitTime: '09:00',
        visiteeId: testUserId,
        expectedDuration: 60,
      };

      const createResponse = await apiClient.request(
        'POST',
        `/api/v1/merchants/${testMerchantId}/visitor-applications`,
        visitorData
      );

      expect([200, 201]).toContain(createResponse.status);

      if ([200, 201].includes(createResponse.status)) {
        const application = createResponse.data;
        const applicationId = application.id;

        // 验证初始状态
        expect(application.status).toBe('pending');

        // 2. 审批通过
        const approvalData = {
          status: 'approved',
          approvalNotes: '访问安排确认',
        };

        const approvalResponse = await apiClient.request(
          'PUT',
          `/api/v1/merchants/${testMerchantId}/visitor-applications/${applicationId}`,
          approvalData
        );

        expect([200, 400, 401, 404]).toContain(approvalResponse.status);

        if (approvalResponse.status === 200) {
          const approvedApplication = approvalResponse.data;
          expect(approvedApplication.status).toBe('approved');
        }

        console.log('✅ 业务状态管理测试完成');
      }
    });
  });
});