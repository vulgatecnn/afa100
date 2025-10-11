import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import database from '../../src/utils/database.js';

describe('Visitor Management Integration Tests', () => {
  let authToken: string;
  let merchantId: number;
  let applicationId: number;
  let applicantId: number;
  let approverId: number;

  beforeEach(async () => {
    // 清理测试数据库
    await database.run('DELETE FROM users');
    await database.run('DELETE FROM merchants');
    await database.run('DELETE FROM visitor_applications');
    await database.run('DELETE FROM passcodes');

    // 创建测试商户
    const merchantResult = await database.run(
      `INSERT INTO merchants (name, code, contact, phone, status) 
       VALUES (?, ?, ?, ?, ?)`,
      ['测试商户', 'TEST001', '张经理', '13800138000', 'active']
    );
    merchantId = merchantResult.lastID!;

    // 创建测试管理员用户
    const adminResult = await database.run(
      `INSERT INTO users (name, phone, user_type, status, merchant_id) 
       VALUES (?, ?, ?, ?, ?)`,
      ['管理员', '13800138001', 'merchant_admin', 'active', merchantId]
    );
    approverId = adminResult.lastID!;

    // 创建测试申请人
    const applicantResult = await database.run(
      `INSERT INTO users (name, phone, user_type, status) 
       VALUES (?, ?, ?, ?)`,
      ['申请人', '13800138002', 'visitor', 'active']
    );
    applicantId = applicantResult.lastID!;

    // 模拟登录获取token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        phone: '13800138001',
        password: 'test123'
      });

    if (loginResponse.body.success) {
      authToken = loginResponse.body.data.token;
    } else {
      // 如果登录失败，使用模拟token
      authToken = 'mock-jwt-token';
    }
  });

  afterEach(async () => {
    // 清理测试数据
    await database.run('DELETE FROM users');
    await database.run('DELETE FROM merchants');
    await database.run('DELETE FROM visitor_applications');
    await database.run('DELETE FROM passcodes');
  });

  describe('GET /api/v1/merchants/:merchantId/visitors/applications', () => {
    beforeEach(async () => {
      // 创建测试访客申请
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      await database.run(
        `INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitor_name, visitor_phone, 
          visit_purpose, scheduled_time, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [applicantId, merchantId, '张三', '13800138010', '商务洽谈', futureTime, 'pending']
      );

      await database.run(
        `INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitor_name, visitor_phone, 
          visit_purpose, scheduled_time, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [applicantId, merchantId, '李四', '13800138011', '技术交流', futureTime, 'approved']
      );
    });

    it('应该成功获取访客申请列表', async () => {
      const response = await request(app)
        .get(`/api/v1/merchants/${merchantId}/visitors/applications`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('应该支持状态筛选', async () => {
      const response = await request(app)
        .get(`/api/v1/merchants/${merchantId}/visitors/applications?status=pending`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].status).toBe('pending');
    });

    it('应该支持分页查询', async () => {
      const response = await request(app)
        .get(`/api/v1/merchants/${merchantId}/visitors/applications?page=1&limit=1`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });

    it('应该在商户ID无效时返回400错误', async () => {
      const response = await request(app)
        .get('/api/v1/merchants/invalid/visitors/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('商户ID无效');
    });
  });

  describe('GET /api/v1/merchants/:merchantId/visitors/applications/:applicationId', () => {
    beforeEach(async () => {
      // 创建测试访客申请
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      const result = await database.run(
        `INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitor_name, visitor_phone, 
          visit_purpose, scheduled_time, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [applicantId, merchantId, '张三', '13800138020', '商务洽谈', futureTime, 'pending']
      );
      applicationId = result.lastID!;
    });

    it('应该成功获取访客申请详情', async () => {
      const response = await request(app)
        .get(`/api/v1/merchants/${merchantId}/visitors/applications/${applicationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.application.id).toBe(applicationId);
      expect(response.body.data.application.visitor_name).toBe('张三');
      expect(response.body.data.applicant).toBeDefined();
      expect(response.body.data.merchant).toBeDefined();
    });

    it('应该在申请不存在时返回404错误', async () => {
      const response = await request(app)
        .get(`/api/v1/merchants/${merchantId}/visitors/applications/99999`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('不存在');
    });
  });

  describe('POST /api/v1/merchants/:merchantId/visitors/applications/:applicationId/approve', () => {
    beforeEach(async () => {
      // 创建测试访客申请
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      const result = await database.run(
        `INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitor_name, visitor_phone, 
          visit_purpose, scheduled_time, status, duration, usage_limit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [applicantId, merchantId, '张三', '13800138030', '商务洽谈', futureTime, 'pending', 4, 10]
      );
      applicationId = result.lastID!;
    });

    it('应该成功审批访客申请', async () => {
      const approvalData = {
        approvedBy: approverId,
        duration: 6,
        usageLimit: 15,
        note: '审批通过'
      };

      const response = await request(app)
        .post(`/api/v1/merchants/${merchantId}/visitors/applications/${applicationId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(approvalData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');
      expect(response.body.data.approved_by).toBe(approverId);
      expect(response.body.data.passcode).toBeDefined();

      // 验证数据库中的状态已更新
      const application = await database.get(
        'SELECT * FROM visitor_applications WHERE id = ?',
        [applicationId]
      );
      expect(application.status).toBe('approved');
      expect(application.passcode).toBeDefined();
    });

    it('应该在审批人ID无效时返回400错误', async () => {
      const response = await request(app)
        .post(`/api/v1/merchants/${merchantId}/visitors/applications/${applicationId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          approvedBy: 'invalid'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('审批人ID无效');
    });

    it('应该在申请已被处理时返回错误', async () => {
      // 先审批一次
      await database.run(
        'UPDATE visitor_applications SET status = ? WHERE id = ?',
        ['approved', applicationId]
      );

      const response = await request(app)
        .post(`/api/v1/merchants/${merchantId}/visitors/applications/${applicationId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          approvedBy: approverId
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('只能审批待审核状态的申请');
    });
  });

  describe('POST /api/v1/merchants/:merchantId/visitors/applications/:applicationId/reject', () => {
    beforeEach(async () => {
      // 创建测试访客申请
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      const result = await database.run(
        `INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitor_name, visitor_phone, 
          visit_purpose, scheduled_time, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [applicantId, merchantId, '张三', '13800138040', '商务洽谈', futureTime, 'pending']
      );
      applicationId = result.lastID!;
    });

    it('应该成功拒绝访客申请', async () => {
      const rejectionData = {
        approvedBy: approverId,
        rejectionReason: '访问目的不明确'
      };

      const response = await request(app)
        .post(`/api/v1/merchants/${merchantId}/visitors/applications/${applicationId}/reject`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(rejectionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
      expect(response.body.data.approved_by).toBe(approverId);
      expect(response.body.data.rejection_reason).toBe('访问目的不明确');

      // 验证数据库中的状态已更新
      const application = await database.get(
        'SELECT * FROM visitor_applications WHERE id = ?',
        [applicationId]
      );
      expect(application.status).toBe('rejected');
      expect(application.rejection_reason).toBe('访问目的不明确');
    });

    it('应该在拒绝原因为空时返回400错误', async () => {
      const response = await request(app)
        .post(`/api/v1/merchants/${merchantId}/visitors/applications/${applicationId}/reject`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          approvedBy: approverId,
          rejectionReason: ''
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('拒绝原因不能为空');
    });
  });

  describe('POST /api/v1/merchants/:merchantId/visitors/applications/batch-approve', () => {
    let applicationIds: number[];

    beforeEach(async () => {
      // 创建多个测试访客申请
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      applicationIds = [];

      for (let i = 0; i < 3; i++) {
        const result = await database.run(
          `INSERT INTO visitor_applications (
            applicant_id, merchant_id, visitor_name, visitor_phone, 
            visit_purpose, scheduled_time, status, duration, usage_limit
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [applicantId, merchantId, `访客${i + 1}`, `1380013805${i}`, '商务洽谈', futureTime, 'pending', 4, 10]
        );
        applicationIds.push(result.lastID!);
      }
    });

    it('应该成功批量审批访客申请', async () => {
      const batchApprovalData = {
        applicationIds,
        approvedBy: approverId,
        duration: 6,
        usageLimit: 15,
        note: '批量审批通过'
      };

      const response = await request(app)
        .post(`/api/v1/merchants/${merchantId}/visitors/applications/batch-approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(batchApprovalData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toHaveLength(3);
      expect(response.body.data.failed).toHaveLength(0);

      // 验证数据库中的状态已更新
      for (const id of applicationIds) {
        const application = await database.get(
          'SELECT * FROM visitor_applications WHERE id = ?',
          [id]
        );
        expect(application.status).toBe('approved');
        expect(application.passcode).toBeDefined();
      }
    });

    it('应该在申请ID列表为空时返回400错误', async () => {
      const response = await request(app)
        .post(`/api/v1/merchants/${merchantId}/visitors/applications/batch-approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          applicationIds: [],
          approvedBy: approverId
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('申请ID列表不能为空');
    });
  });

  describe('GET /api/v1/merchants/:merchantId/visitors/stats', () => {
    beforeEach(async () => {
      // 创建不同状态的访客申请
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      const statuses = ['pending', 'approved', 'rejected', 'expired'];
      for (let i = 0; i < statuses.length; i++) {
        await database.run(
          `INSERT INTO visitor_applications (
            applicant_id, merchant_id, visitor_name, visitor_phone, 
            visit_purpose, scheduled_time, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [applicantId, merchantId, `访客${i + 1}`, `1380013806${i}`, '商务洽谈', futureTime, statuses[i]]
        );
      }
    });

    it('应该成功获取访客统计信息', async () => {
      const response = await request(app)
        .get(`/api/v1/merchants/${merchantId}/visitors/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(4);
      expect(response.body.data.pending).toBe(1);
      expect(response.body.data.approved).toBe(1);
      expect(response.body.data.rejected).toBe(1);
      expect(response.body.data.expired).toBe(1);
    });
  });

  describe('GET /api/v1/merchants/:merchantId/visitors/pending-count', () => {
    beforeEach(async () => {
      // 创建待审批的访客申请
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      for (let i = 0; i < 3; i++) {
        await database.run(
          `INSERT INTO visitor_applications (
            applicant_id, merchant_id, visitor_name, visitor_phone, 
            visit_purpose, scheduled_time, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [applicantId, merchantId, `待审批访客${i + 1}`, `1380013807${i}`, '商务洽谈', futureTime, 'pending']
        );
      }
    });

    it('应该成功获取待审批申请数量', async () => {
      const response = await request(app)
        .get(`/api/v1/merchants/${merchantId}/visitors/pending-count`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(3);
    });
  });

  describe('GET /api/v1/visitor/applications/:applicationId/passcode/:applicantId', () => {
    beforeEach(async () => {
      // 创建已审批的访客申请
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      const result = await database.run(
        `INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitor_name, visitor_phone, 
          visit_purpose, scheduled_time, status, passcode, passcode_expiry, usage_limit, usage_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [applicantId, merchantId, '张三', '13800138080', '商务洽谈', futureTime, 'approved', 'TEST123456789012', futureTime, 10, 0]
      );
      applicationId = result.lastID!;
    });

    it('应该成功获取访客通行码', async () => {
      const response = await request(app)
        .get(`/api/v1/visitor/applications/${applicationId}/passcode/${applicantId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.passcode).toBe('TEST123456789012');
      expect(response.body.data.application.id).toBe(applicationId);
      expect(response.body.data.usageCount).toBe(0);
      expect(response.body.data.usageLimit).toBe(10);
    });

    it('应该在申请人不匹配时返回错误', async () => {
      const wrongApplicantId = applicantId + 1;
      
      const response = await request(app)
        .get(`/api/v1/visitor/applications/${applicationId}/passcode/${wrongApplicantId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('只能查看自己的通行码');
    });
  });
});