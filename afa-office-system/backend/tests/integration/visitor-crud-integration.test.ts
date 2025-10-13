/**
 * 访客管理 CRUD 集成测试
 * 测试访客申请、审批、通行的完整流程
 * 验证访客状态变更的实时同步
 * 测试访客权限和时效性控制
 * 
 * 需求: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { IntegrationTestHelper } from '../helpers/integration-test-helper.js';
import { TestDataFactory } from '../helpers/test-data-factory.js';
import type { 
  VisitorApplication, 
  ApplicationStatus, 
  User, 
  Merchant, 
  Passcode,
  ApiResponse 
} from '../../src/types/index.js';

describe('访客管理 CRUD 集成测试', () => {
  let testHelper: IntegrationTestHelper;
  let adminToken: string;
  let merchantAdminToken: string;
  let employeeToken: string;
  let visitorToken: string;
  let testMerchant: Merchant;
  let testUsers: {
    admin: User;
    merchantAdmin: User;
    employee: User;
    visitor: User;
  };

  beforeEach(async () => {
    // 设置集成测试环境
    testHelper = await IntegrationTestHelper.quickSetup({
      environment: 'integration',
      seedOptions: {
        merchants: 2,
        users: 10,
        projects: 1,
        venues: 2,
        floors: 3,
        visitorApplications: 5
      }
    });

    // 获取测试数据
    const seedData = testHelper.getSeedData();
    testMerchant = seedData.merchants[0];

    // 创建不同角色的用户并登录
    const { user: admin, authResponse: adminAuth } = await testHelper.createAndLoginUser('tenant_admin');
    testUsers.admin = admin;
    adminToken = adminAuth.accessToken;

    // 创建商户管理员
    const merchantAdminData = {
      name: '商户管理员',
      phone: '13800138901',
      user_type: 'merchant_admin',
      merchant_id: testMerchant.id
    };

    const merchantAdminResponse = await request(app)
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(merchantAdminData)
      .expect(201);

    testUsers.merchantAdmin = merchantAdminResponse.body.data.user || merchantAdminResponse.body.data;
    merchantAdminToken = `mock-merchant-admin-token-${testUsers.merchantAdmin.id}`;

    // 创建普通员工
    const employeeData = {
      name: '普通员工',
      phone: '13800138902',
      user_type: 'employee',
      merchant_id: testMerchant.id
    };

    const employeeResponse = await request(app)
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(employeeData)
      .expect(201);

    testUsers.employee = employeeResponse.body.data.user || employeeResponse.body.data;
    employeeToken = `mock-employee-token-${testUsers.employee.id}`;

    // 创建访客用户
    const visitorData = {
      name: '测试访客',
      phone: '13800138903',
      user_type: 'visitor'
    };

    const visitorResponse = await request(app)
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(visitorData)
      .expect(201);

    testUsers.visitor = visitorResponse.body.data.user || visitorResponse.body.data;
    visitorToken = `mock-visitor-token-${testUsers.visitor.id}`;
  });

  afterEach(async () => {
    await testHelper.cleanup();
  });

  describe('访客申请创建 (CREATE)', () => {
    it('应该成功提交访客申请', async () => {
      const applicationData = {
        merchantId: testMerchant.id,
        visiteeId: testUsers.employee.id,
        visitorName: '张三',
        visitorPhone: '13800138999',
        visitorCompany: '测试公司',
        visitPurpose: '商务洽谈',
        visitType: 'business',
        scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 明天
        duration: 2 // 2小时
      };

      const response = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send(applicationData)
        .expect(201);

      // 验证响应格式
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('申请');
      expect(response.body.data).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      // 验证创建的申请数据
      const application = response.body.data.application || response.body.data;
      expect(application.merchant_id).toBe(applicationData.merchantId);
      expect(application.visitee_id).toBe(applicationData.visiteeId);
      expect(application.visitor_name).toBe(applicationData.visitorName);
      expect(application.visitor_phone).toBe(applicationData.visitorPhone);
      expect(application.visitor_company).toBe(applicationData.visitorCompany);
      expect(application.visit_purpose).toBe(applicationData.visitPurpose);
      expect(application.visit_type).toBe(applicationData.visitType);
      expect(application.duration).toBe(applicationData.duration);
      expect(application.status).toBe('pending');
      expect(application.id).toBeDefined();
      expect(application.created_at).toBeDefined();
    });

    it('应该验证必填字段', async () => {
      const invalidApplicationData = {
        merchantId: testMerchant.id,
        visitorPhone: '13800138999'
        // 缺少必填字段
      };

      const response = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send(invalidApplicationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/(姓名|目的|类型|时间|时长)/);
    });

    it('应该验证手机号格式', async () => {
      const applicationData = {
        merchantId: testMerchant.id,
        visitorName: '张三',
        visitorPhone: '123456789', // 无效手机号
        visitPurpose: '商务洽谈',
        visitType: 'business',
        scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration: 2
      };

      const response = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send(applicationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('手机号');
    });

    it('应该验证预约时间不能是过去时间', async () => {
      const applicationData = {
        merchantId: testMerchant.id,
        visitorName: '张三',
        visitorPhone: '13800138999',
        visitPurpose: '商务洽谈',
        visitType: 'business',
        scheduledTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 昨天
        duration: 2
      };

      const response = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send(applicationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('时间');
    });

    it('应该验证访问时长范围', async () => {
      const applicationData = {
        merchantId: testMerchant.id,
        visitorName: '张三',
        visitorPhone: '13800138999',
        visitPurpose: '商务洽谈',
        visitType: 'business',
        scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration: 25 // 超过合理范围
      };

      const response = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send(applicationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('时长');
    });
  });

  describe('访客申请查询 (READ)', () => {
    let testApplications: VisitorApplication[];

    beforeEach(async () => {
      // 创建测试申请
      testApplications = [];
      const applicationsData = [
        {
          merchantId: testMerchant.id,
          visiteeId: testUsers.employee.id,
          visitorName: '张三',
          visitorPhone: '13800138801',
          visitPurpose: '商务洽谈',
          visitType: 'business',
          scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 2
        },
        {
          merchantId: testMerchant.id,
          visiteeId: testUsers.employee.id,
          visitorName: '李四',
          visitorPhone: '13800138802',
          visitPurpose: '面试',
          visitType: 'interview',
          scheduledTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          duration: 1
        },
        {
          merchantId: testMerchant.id,
          visiteeId: testUsers.employee.id,
          visitorName: '王五',
          visitorPhone: '13800138803',
          visitPurpose: '送货',
          visitType: 'delivery',
          scheduledTime: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          duration: 1
        }
      ];

      for (const appData of applicationsData) {
        const response = await request(app)
          .post('/api/v1/visitor/apply')
          .set('Authorization', `Bearer ${visitorToken}`)
          .send(appData)
          .expect(201);

        testApplications.push(response.body.data.application || response.body.data);
      }
    });

    it('商户管理员应该能获取申请列表', async () => {
      const response = await request(app)
        .get(`/api/v1/${testMerchant.id}/visitors/applications`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const applications = response.body.data.items || response.body.data;
      expect(Array.isArray(applications)).toBe(true);
      expect(applications.length).toBeGreaterThan(0);

      // 验证申请数据结构
      const application = applications[0];
      expect(application.id).toBeDefined();
      expect(application.visitor_name).toBeDefined();
      expect(application.visit_purpose).toBeDefined();
      expect(application.status).toBeDefined();
      expect(application.scheduled_time).toBeDefined();
    });

    it('应该支持按状态筛选申请', async () => {
      const response = await request(app)
        .get(`/api/v1/${testMerchant.id}/visitors/applications?status=pending`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const applications = response.body.data.items || response.body.data;
      expect(Array.isArray(applications)).toBe(true);
      
      // 验证所有返回的申请都是待审批状态
      applications.forEach((app: VisitorApplication) => {
        expect(app.status).toBe('pending');
      });
    });

    it('应该支持分页查询', async () => {
      const response = await request(app)
        .get(`/api/v1/${testMerchant.id}/visitors/applications?page=1&limit=2`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.data.items) {
        // 分页响应格式
        expect(response.body.data.items).toBeDefined();
        expect(response.body.data.pagination).toBeDefined();
        expect(response.body.data.items.length).toBeLessThanOrEqual(2);
      } else {
        // 简单数组响应格式
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('应该根据ID获取申请详情', async () => {
      const applicationId = testApplications[0].id;
      
      const response = await request(app)
        .get(`/api/v1/${testMerchant.id}/visitors/applications/${applicationId}`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const application = response.body.data.application || response.body.data;
      expect(application.id).toBe(applicationId);
      expect(application.visitor_name).toBe(testApplications[0].visitor_name);
    });

    it('访客应该能查看自己的申请列表', async () => {
      const response = await request(app)
        .get('/api/v1/visitor/applications')
        .set('Authorization', `Bearer ${visitorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const applications = response.body.data.items || response.body.data;
      expect(Array.isArray(applications)).toBe(true);
      
      // 验证返回的都是当前访客的申请
      applications.forEach((app: VisitorApplication) => {
        expect(app.applicant_id).toBe(testUsers.visitor.id);
      });
    });

    it('应该处理不存在的申请ID', async () => {
      const nonExistentId = 99999;
      
      const response = await request(app)
        .get(`/api/v1/${testMerchant.id}/visitors/applications/${nonExistentId}`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('不存在');
    });
  });

  describe('访客申请审批 (UPDATE)', () => {
    let pendingApplication: VisitorApplication;

    beforeEach(async () => {
      // 创建待审批申请
      const applicationData = {
        merchantId: testMerchant.id,
        visiteeId: testUsers.employee.id,
        visitorName: '待审批访客',
        visitorPhone: '13800138777',
        visitPurpose: '商务洽谈',
        visitType: 'business',
        scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration: 2
      };

      const response = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send(applicationData)
        .expect(201);

      pendingApplication = response.body.data.application || response.body.data;
    });

    it('商户管理员应该能审批通过申请', async () => {
      const approvalData = {
        approvedBy: testUsers.merchantAdmin.id,
        duration: 3, // 调整访问时长
        usageLimit: 2, // 设置使用次数
        note: '审批通过'
      };

      const response = await request(app)
        .post(`/api/v1/${testMerchant.id}/visitors/applications/${pendingApplication.id}/approve`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send(approvalData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('审批');
      
      const approvedApplication = response.body.data.application || response.body.data;
      expect(approvedApplication.id).toBe(pendingApplication.id);
      expect(approvedApplication.status).toBe('approved');
      expect(approvedApplication.approved_by).toBe(testUsers.merchantAdmin.id);
      expect(approvedApplication.approved_at).toBeDefined();
      expect(approvedApplication.passcode).toBeDefined();
      expect(approvedApplication.passcode_expiry).toBeDefined();
      expect(approvedApplication.usage_limit).toBe(approvalData.usageLimit);
    });

    it('商户管理员应该能拒绝申请', async () => {
      const rejectionData = {
        approvedBy: testUsers.merchantAdmin.id,
        rejectionReason: '时间冲突，无法安排'
      };

      const response = await request(app)
        .post(`/api/v1/${testMerchant.id}/visitors/applications/${pendingApplication.id}/reject`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send(rejectionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('拒绝');
      
      const rejectedApplication = response.body.data.application || response.body.data;
      expect(rejectedApplication.id).toBe(pendingApplication.id);
      expect(rejectedApplication.status).toBe('rejected');
      expect(rejectedApplication.approved_by).toBe(testUsers.merchantAdmin.id);
      expect(rejectedApplication.rejection_reason).toBe(rejectionData.rejectionReason);
    });

    it('普通员工应该能审批申请', async () => {
      const approvalData = {
        approvedBy: testUsers.employee.id,
        note: '员工审批通过'
      };

      const response = await request(app)
        .post(`/api/v1/${testMerchant.id}/visitors/applications/${pendingApplication.id}/approve`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(approvalData)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const approvedApplication = response.body.data.application || response.body.data;
      expect(approvedApplication.status).toBe('approved');
      expect(approvedApplication.approved_by).toBe(testUsers.employee.id);
    });

    it('应该验证审批权限', async () => {
      const approvalData = {
        approvedBy: testUsers.visitor.id
      };

      // 访客不应该能审批申请
      const response = await request(app)
        .post(`/api/v1/${testMerchant.id}/visitors/applications/${pendingApplication.id}/approve`)
        .set('Authorization', `Bearer ${visitorToken}`)
        .send(approvalData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('权限');
    });

    it('应该防止重复审批', async () => {
      // 先审批通过
      const approvalData = {
        approvedBy: testUsers.merchantAdmin.id
      };

      await request(app)
        .post(`/api/v1/${testMerchant.id}/visitors/applications/${pendingApplication.id}/approve`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send(approvalData)
        .expect(200);

      // 再次尝试审批应该失败
      const response = await request(app)
        .post(`/api/v1/${testMerchant.id}/visitors/applications/${pendingApplication.id}/approve`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send(approvalData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('已');
    });

    it('应该验证拒绝原因必填', async () => {
      const rejectionData = {
        approvedBy: testUsers.merchantAdmin.id
        // 缺少拒绝原因
      };

      const response = await request(app)
        .post(`/api/v1/${testMerchant.id}/visitors/applications/${pendingApplication.id}/reject`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send(rejectionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('原因');
    });
  });

  describe('批量审批操作', () => {
    let pendingApplications: VisitorApplication[];

    beforeEach(async () => {
      // 创建多个待审批申请
      pendingApplications = [];
      for (let i = 0; i < 5; i++) {
        const applicationData = {
          merchantId: testMerchant.id,
          visiteeId: testUsers.employee.id,
          visitorName: `批量访客${i + 1}`,
          visitorPhone: `1380013880${i}`,
          visitPurpose: '商务洽谈',
          visitType: 'business',
          scheduledTime: new Date(Date.now() + (24 + i) * 60 * 60 * 1000).toISOString(),
          duration: 2
        };

        const response = await request(app)
          .post('/api/v1/visitor/apply')
          .set('Authorization', `Bearer ${visitorToken}`)
          .send(applicationData)
          .expect(201);

        pendingApplications.push(response.body.data.application || response.body.data);
      }
    });

    it('应该支持批量审批通过', async () => {
      const applicationIds = pendingApplications.slice(0, 3).map(app => app.id);
      const batchApprovalData = {
        applicationIds,
        approvedBy: testUsers.merchantAdmin.id,
        duration: 3,
        usageLimit: 1,
        note: '批量审批通过'
      };

      const response = await request(app)
        .post(`/api/v1/${testMerchant.id}/visitors/applications/batch-approve`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send(batchApprovalData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const result = response.body.data.result || response.body.data;
      expect(result.success).toBeDefined();
      expect(result.failed).toBeDefined();
      expect(result.success.length).toBe(3);
      expect(result.failed.length).toBe(0);

      // 验证申请状态已更新
      for (const applicationId of applicationIds) {
        const detailResponse = await request(app)
          .get(`/api/v1/${testMerchant.id}/visitors/applications/${applicationId}`)
          .set('Authorization', `Bearer ${merchantAdminToken}`)
          .expect(200);

        const application = detailResponse.body.data.application || detailResponse.body.data;
        expect(application.status).toBe('approved');
      }
    });

    it('应该支持批量拒绝', async () => {
      const applicationIds = pendingApplications.slice(0, 2).map(app => app.id);
      const batchRejectionData = {
        applicationIds,
        approvedBy: testUsers.merchantAdmin.id,
        rejectionReason: '批量拒绝测试'
      };

      const response = await request(app)
        .post(`/api/v1/${testMerchant.id}/visitors/applications/batch-reject`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send(batchRejectionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const result = response.body.data.result || response.body.data;
      expect(result.success).toBeDefined();
      expect(result.failed).toBeDefined();
      expect(result.success.length).toBe(2);

      // 验证申请状态已更新
      for (const applicationId of applicationIds) {
        const detailResponse = await request(app)
          .get(`/api/v1/${testMerchant.id}/visitors/applications/${applicationId}`)
          .set('Authorization', `Bearer ${merchantAdminToken}`)
          .expect(200);

        const application = detailResponse.body.data.application || detailResponse.body.data;
        expect(application.status).toBe('rejected');
        expect(application.rejection_reason).toBe(batchRejectionData.rejectionReason);
      }
    });

    it('应该处理批量操作中的部分失败', async () => {
      const validIds = pendingApplications.slice(0, 2).map(app => app.id);
      const invalidIds = [99998, 99999];
      const allIds = [...validIds, ...invalidIds];

      const batchApprovalData = {
        applicationIds: allIds,
        approvedBy: testUsers.merchantAdmin.id
      };

      const response = await request(app)
        .post(`/api/v1/${testMerchant.id}/visitors/applications/batch-approve`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send(batchApprovalData);

      // 根据API实现验证响应
      if (response.status === 200 || response.status === 207) {
        const result = response.body.data.result || response.body.data;
        expect(result.success.length).toBe(validIds.length);
        expect(result.failed.length).toBe(invalidIds.length);
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('通行码管理', () => {
    let approvedApplication: VisitorApplication;

    beforeEach(async () => {
      // 创建并审批申请
      const applicationData = {
        merchantId: testMerchant.id,
        visiteeId: testUsers.employee.id,
        visitorName: '通行码测试访客',
        visitorPhone: '13800138666',
        visitPurpose: '商务洽谈',
        visitType: 'business',
        scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration: 2
      };

      const createResponse = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send(applicationData)
        .expect(201);

      const application = createResponse.body.data.application || createResponse.body.data;

      // 审批通过
      const approvalData = {
        approvedBy: testUsers.merchantAdmin.id,
        usageLimit: 3
      };

      const approveResponse = await request(app)
        .post(`/api/v1/${testMerchant.id}/visitors/applications/${application.id}/approve`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send(approvalData)
        .expect(200);

      approvedApplication = approveResponse.body.data.application || approveResponse.body.data;
    });

    it('访客应该能获取通行码', async () => {
      const response = await request(app)
        .get(`/api/v1/visitor/passcode/${approvedApplication.id}`)
        .set('Authorization', `Bearer ${visitorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const passcode = response.body.data.passcode || response.body.data;
      expect(passcode.code).toBeDefined();
      expect(passcode.expiry_time).toBeDefined();
      expect(passcode.usage_limit).toBeDefined();
      expect(passcode.usage_count).toBeDefined();
      expect(passcode.status).toBe('active');
    });

    it('访客应该能刷新通行码', async () => {
      // 先获取原通行码
      const originalResponse = await request(app)
        .get(`/api/v1/visitor/passcode/${approvedApplication.id}`)
        .set('Authorization', `Bearer ${visitorToken}`)
        .expect(200);

      const originalPasscode = originalResponse.body.data.passcode || originalResponse.body.data;

      // 刷新通行码
      const refreshResponse = await request(app)
        .post(`/api/v1/visitor/passcode/${approvedApplication.id}/refresh`)
        .set('Authorization', `Bearer ${visitorToken}`)
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      
      const newPasscode = refreshResponse.body.data.passcode || refreshResponse.body.data;
      expect(newPasscode.code).toBeDefined();
      expect(newPasscode.code).not.toBe(originalPasscode.code); // 通行码应该改变
      expect(newPasscode.expiry_time).toBeDefined();
    });

    it('应该验证通行码访问权限', async () => {
      // 其他访客不应该能获取通行码
      const otherVisitorData = {
        name: '其他访客',
        phone: '13800138555',
        user_type: 'visitor'
      };

      const otherVisitorResponse = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(otherVisitorData)
        .expect(201);

      const otherVisitor = otherVisitorResponse.body.data.user || otherVisitorResponse.body.data;
      const otherVisitorToken = `mock-visitor-token-${otherVisitor.id}`;

      const response = await request(app)
        .get(`/api/v1/visitor/passcode/${approvedApplication.id}`)
        .set('Authorization', `Bearer ${otherVisitorToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('权限');
    });

    it('应该处理过期申请的通行码', async () => {
      // 创建过期申请
      const expiredApplicationData = {
        merchantId: testMerchant.id,
        visiteeId: testUsers.employee.id,
        visitorName: '过期测试访客',
        visitorPhone: '13800138444',
        visitPurpose: '商务洽谈',
        visitType: 'business',
        scheduledTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 昨天
        duration: 2
      };

      // 这个请求可能会失败，因为时间验证
      const createResponse = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send(expiredApplicationData);

      if (createResponse.status === 201) {
        const expiredApp = createResponse.body.data.application || createResponse.body.data;
        
        // 尝试获取过期申请的通行码
        const passcodeResponse = await request(app)
          .get(`/api/v1/visitor/passcode/${expiredApp.id}`)
          .set('Authorization', `Bearer ${visitorToken}`)
          .expect(400);

        expect(passcodeResponse.body.success).toBe(false);
        expect(passcodeResponse.body.message).toContain('过期');
      }
    });
  });

  describe('访客状态变更和实时同步', () => {
    let testApplication: VisitorApplication;

    beforeEach(async () => {
      // 创建测试申请
      const applicationData = {
        merchantId: testMerchant.id,
        visiteeId: testUsers.employee.id,
        visitorName: '状态测试访客',
        visitorPhone: '13800138333',
        visitPurpose: '商务洽谈',
        visitType: 'business',
        scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration: 2
      };

      const response = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send(applicationData)
        .expect(201);

      testApplication = response.body.data.application || response.body.data;
    });

    it('应该实时同步申请状态变更', async () => {
      // 审批申请
      const approvalData = {
        approvedBy: testUsers.merchantAdmin.id
      };

      const approveResponse = await request(app)
        .post(`/api/v1/${testMerchant.id}/visitors/applications/${testApplication.id}/approve`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send(approvalData)
        .expect(200);

      // 立即查询验证状态同步
      const detailResponse = await request(app)
        .get(`/api/v1/${testMerchant.id}/visitors/applications/${testApplication.id}`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .expect(200);

      const updatedApplication = detailResponse.body.data.application || detailResponse.body.data;
      expect(updatedApplication.status).toBe('approved');
      expect(updatedApplication.approved_by).toBe(testUsers.merchantAdmin.id);
      expect(updatedApplication.approved_at).toBeDefined();

      // 访客端也应该能看到状态变更
      const visitorDetailResponse = await request(app)
        .get(`/api/v1/visitor/applications/${testApplication.id}`)
        .set('Authorization', `Bearer ${visitorToken}`)
        .expect(200);

      const visitorViewApplication = visitorDetailResponse.body.data.application || visitorDetailResponse.body.data;
      expect(visitorViewApplication.status).toBe('approved');
    });

    it('应该正确处理申请状态流转', async () => {
      // 验证初始状态
      expect(testApplication.status).toBe('pending');

      // 审批通过
      await request(app)
        .post(`/api/v1/${testMerchant.id}/visitors/applications/${testApplication.id}/approve`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send({ approvedBy: testUsers.merchantAdmin.id })
        .expect(200);

      // 验证状态变为已审批
      let detailResponse = await request(app)
        .get(`/api/v1/${testMerchant.id}/visitors/applications/${testApplication.id}`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .expect(200);

      let application = detailResponse.body.data.application || detailResponse.body.data;
      expect(application.status).toBe('approved');

      // 模拟访客使用通行码（这里简化处理，实际需要通过通行记录API）
      // 在实际系统中，这会通过访问控制系统更新申请状态为 'completed'
    });

    it('应该验证状态变更的时效性', async () => {
      // 创建即将过期的申请
      const soonExpireData = {
        merchantId: testMerchant.id,
        visiteeId: testUsers.employee.id,
        visitorName: '即将过期访客',
        visitorPhone: '13800138222',
        visitPurpose: '商务洽谈',
        visitType: 'business',
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2小时后
        duration: 1
      };

      const createResponse = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send(soonExpireData)
        .expect(201);

      const soonExpireApp = createResponse.body.data.application || createResponse.body.data;

      // 审批通过
      await request(app)
        .post(`/api/v1/${testMerchant.id}/visitors/applications/${soonExpireApp.id}/approve`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send({ approvedBy: testUsers.merchantAdmin.id })
        .expect(200);

      // 获取即将过期的申请列表
      const expiringResponse = await request(app)
        .get(`/api/v1/${testMerchant.id}/visitors/expiring?hours=3`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .expect(200);

      const expiringApps = expiringResponse.body.data.applications || expiringResponse.body.data;
      expect(Array.isArray(expiringApps)).toBe(true);
      
      const foundApp = expiringApps.find((app: VisitorApplication) => app.id === soonExpireApp.id);
      expect(foundApp).toBeDefined();
    });
  });

  describe('访客权限和时效性控制', () => {
    it('应该验证访客申请的商户权限', async () => {
      // 获取另一个商户
      const seedData = testHelper.getSeedData();
      const otherMerchant = seedData.merchants[1];

      // 访客尝试申请访问没有权限的商户
      const applicationData = {
        merchantId: otherMerchant.id,
        visiteeId: testUsers.employee.id, // 这个员工属于第一个商户
        visitorName: '权限测试访客',
        visitorPhone: '13800138111',
        visitPurpose: '商务洽谈',
        visitType: 'business',
        scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration: 2
      };

      const response = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send(applicationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('权限');
    });

    it('应该控制通行码的使用次数', async () => {
      // 创建并审批申请，设置使用次数限制
      const applicationData = {
        merchantId: testMerchant.id,
        visiteeId: testUsers.employee.id,
        visitorName: '次数限制测试访客',
        visitorPhone: '13800138000',
        visitPurpose: '商务洽谈',
        visitType: 'business',
        scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration: 2
      };

      const createResponse = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send(applicationData)
        .expect(201);

      const application = createResponse.body.data.application || createResponse.body.data;

      // 审批通过，设置使用次数为1
      const approvalData = {
        approvedBy: testUsers.merchantAdmin.id,
        usageLimit: 1
      };

      await request(app)
        .post(`/api/v1/${testMerchant.id}/visitors/applications/${application.id}/approve`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send(approvalData)
        .expect(200);

      // 获取通行码
      const passcodeResponse = await request(app)
        .get(`/api/v1/visitor/passcode/${application.id}`)
        .set('Authorization', `Bearer ${visitorToken}`)
        .expect(200);

      const passcode = passcodeResponse.body.data.passcode || passcodeResponse.body.data;
      expect(passcode.usage_limit).toBe(1);
      expect(passcode.usage_count).toBe(0);
    });

    it('应该验证通行码的时效性', async () => {
      // 创建短时效申请
      const applicationData = {
        merchantId: testMerchant.id,
        visiteeId: testUsers.employee.id,
        visitorName: '时效测试访客',
        visitorPhone: '13800138001',
        visitPurpose: '商务洽谈',
        visitType: 'business',
        scheduledTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1小时后
        duration: 1
      };

      const createResponse = await request(app)
        .post('/api/v1/visitor/apply')
        .set('Authorization', `Bearer ${visitorToken}`)
        .send(applicationData)
        .expect(201);

      const application = createResponse.body.data.application || createResponse.body.data;

      // 审批通过
      await request(app)
        .post(`/api/v1/${testMerchant.id}/visitors/applications/${application.id}/approve`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .send({ approvedBy: testUsers.merchantAdmin.id })
        .expect(200);

      // 获取通行码并验证过期时间
      const passcodeResponse = await request(app)
        .get(`/api/v1/visitor/passcode/${application.id}`)
        .set('Authorization', `Bearer ${visitorToken}`)
        .expect(200);

      const passcode = passcodeResponse.body.data.passcode || passcodeResponse.body.data;
      expect(passcode.expiry_time).toBeDefined();
      
      const expiryTime = new Date(passcode.expiry_time);
      const scheduledTime = new Date(application.scheduled_time);
      const expectedExpiryTime = new Date(scheduledTime.getTime() + application.duration * 60 * 60 * 1000);
      
      // 验证过期时间是否合理（允许一定误差）
      const timeDiff = Math.abs(expiryTime.getTime() - expectedExpiryTime.getTime());
      expect(timeDiff).toBeLessThan(60 * 1000); // 误差小于1分钟
    });
  });

  describe('统计和监控功能', () => {
    beforeEach(async () => {
      // 创建多个不同状态的申请用于统计
      const applicationsData = [
        { status: 'pending', count: 3 },
        { status: 'approved', count: 2 },
        { status: 'rejected', count: 1 }
      ];

      for (const { status, count } of applicationsData) {
        for (let i = 0; i < count; i++) {
          const applicationData = {
            merchantId: testMerchant.id,
            visiteeId: testUsers.employee.id,
            visitorName: `${status}访客${i + 1}`,
            visitorPhone: `138001388${status.charAt(0)}${i}`,
            visitPurpose: '商务洽谈',
            visitType: 'business',
            scheduledTime: new Date(Date.now() + (24 + i) * 60 * 60 * 1000).toISOString(),
            duration: 2
          };

          const createResponse = await request(app)
            .post('/api/v1/visitor/apply')
            .set('Authorization', `Bearer ${visitorToken}`)
            .send(applicationData)
            .expect(201);

          const application = createResponse.body.data.application || createResponse.body.data;

          // 根据需要的状态进行相应操作
          if (status === 'approved') {
            await request(app)
              .post(`/api/v1/${testMerchant.id}/visitors/applications/${application.id}/approve`)
              .set('Authorization', `Bearer ${merchantAdminToken}`)
              .send({ approvedBy: testUsers.merchantAdmin.id })
              .expect(200);
          } else if (status === 'rejected') {
            await request(app)
              .post(`/api/v1/${testMerchant.id}/visitors/applications/${application.id}/reject`)
              .set('Authorization', `Bearer ${merchantAdminToken}`)
              .send({ 
                approvedBy: testUsers.merchantAdmin.id,
                rejectionReason: '测试拒绝'
              })
              .expect(200);
          }
        }
      }
    });

    it('应该获取访客申请统计信息', async () => {
      const response = await request(app)
        .get(`/api/v1/${testMerchant.id}/visitors/stats`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const stats = response.body.data.stats || response.body.data;
      expect(stats.total).toBeGreaterThanOrEqual(6);
      expect(stats.pending).toBeGreaterThanOrEqual(3);
      expect(stats.approved).toBeGreaterThanOrEqual(2);
      expect(stats.rejected).toBeGreaterThanOrEqual(1);
    });

    it('应该获取待审批申请数量', async () => {
      const response = await request(app)
        .get(`/api/v1/${testMerchant.id}/visitors/pending-count`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const data = response.body.data;
      expect(data.count).toBeGreaterThanOrEqual(3);
    });

    it('应该支持按时间范围统计', async () => {
      const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .get(`/api/v1/${testMerchant.id}/visitors/stats?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .set('Authorization', `Bearer ${merchantAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const stats = response.body.data.stats || response.body.data;
      expect(stats.total).toBeDefined();
      expect(stats.pending).toBeDefined();
      expect(stats.approved).toBeDefined();
      expect(stats.rejected).toBeDefined();
    });
  });
});