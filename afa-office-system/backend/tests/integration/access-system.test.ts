import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { Database } from '../../src/utils/database.js';
import { UserModel } from '../../src/models/user.model.js';
import { MerchantModel } from '../../src/models/merchant.model.js';
import { PasscodeModel } from '../../src/models/passcode.model.js';
import { AccessRecordModel } from '../../src/models/access-record.model.js';
import { VisitorApplicationModel } from '../../src/models/visitor-application.model.js';
import { JWTUtils } from '../../src/utils/jwt.js';
import { PasscodeService } from '../../src/services/passcode.service.js';
import { QRCodeUtils } from '../../src/utils/qrcode.js';
import type { User, Merchant, Passcode, VisitorApplication } from '../../src/types/index.js';

describe('通行系统集成测试', () => {
  let testMerchant: Merchant;
  let testEmployee: User;
  let testVisitor: User;
  let testVisitorApplication: VisitorApplication;
  let employeeToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await Database.getInstance().connect();
  });

  afterAll(async () => {
    await Database.getInstance().close();
  });

  beforeEach(async () => {
    // 创建测试商户
    testMerchant = await MerchantModel.create({
      name: '测试科技公司',
      code: 'TEST_TECH',
      contact: '张经理',
      phone: '13800138000',
      email: 'test@company.com',
      status: 'active'
    });

    // 创建测试员工
    testEmployee = await UserModel.create({
      name: '测试员工',
      phone: '13800138001',
      user_type: 'employee',
      status: 'active',
      merchant_id: testMerchant.id,
      open_id: 'employee_openid'
    });

    // 创建测试访客
    testVisitor = await UserModel.create({
      name: '测试访客',
      phone: '13800138002',
      user_type: 'visitor',
      status: 'active',
      open_id: 'visitor_openid'
    });

    // 创建测试管理员
    const testAdmin = await UserModel.create({
      name: '测试管理员',
      phone: '13800138003',
      user_type: 'tenant_admin',
      status: 'active',
      open_id: 'admin_openid'
    });

    // 生成认证token
    employeeToken = JWTUtils.generateToken({
      userId: testEmployee.id,
      userType: testEmployee.user_type,
      merchantId: testEmployee.merchant_id
    });

    adminToken = JWTUtils.generateToken({
      userId: testAdmin.id,
      userType: testAdmin.user_type,
      merchantId: null
    });

    // 创建测试访客申请
    testVisitorApplication = await VisitorApplicationModel.create({
      applicant_id: testVisitor.id,
      merchant_id: testMerchant.id,
      visitee_id: testEmployee.id,
      visitor_name: '测试访客',
      visitor_phone: '13800138002',
      visitor_company: '访客公司',
      visit_purpose: '商务洽谈',
      visit_type: 'business',
      scheduled_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1小时后
      duration: 2,
      status: 'approved',
      approved_by: testEmployee.id,
      approved_at: new Date().toISOString(),
      usage_limit: 3,
      usage_count: 0
    });
  });

  afterEach(async () => {
    // 清理测试数据
    await Database.getInstance().run('DELETE FROM access_records');
    await Database.getInstance().run('DELETE FROM passcodes');
    await Database.getInstance().run('DELETE FROM visitor_applications');
    await Database.getInstance().run('DELETE FROM users');
    await Database.getInstance().run('DELETE FROM merchants');
  });

  describe('通行码生成和验证完整流程', () => {
    it('应该完成员工通行码的完整生命周期', async () => {
      // 1. 生成员工通行码
      const passcodeResult = await PasscodeService.generateEmployeePasscode(testEmployee.id);
      
      expect(passcodeResult.passcode).toBeTruthy();
      expect(passcodeResult.qrContent).toBeTruthy();
      expect(passcodeResult.passcode.user_id).toBe(testEmployee.id);
      expect(passcodeResult.passcode.type).toBe('employee');
      expect(passcodeResult.passcode.status).toBe('active');

      // 2. 验证通行码
      const validateResponse = await request(app)
        .post('/api/v1/access/validate')
        .send({
          code: passcodeResult.passcode.code,
          deviceId: 'door_001',
          direction: 'in',
          deviceType: 'qr_scanner',
          projectId: 1,
          venueId: 1,
          floorId: 1
        });

      expect(validateResponse.status).toBe(200);
      expect(validateResponse.body.success).toBe(true);
      expect(validateResponse.body.data.valid).toBe(true);
      expect(validateResponse.body.data.userId).toBe(testEmployee.id);
      expect(validateResponse.body.data.userName).toBe(testEmployee.name);

      // 3. 验证通行记录被创建
      const accessRecords = await AccessRecordModel.findByUserId(testEmployee.id);
      expect(accessRecords).toHaveLength(1);
      expect(accessRecords[0].result).toBe('success');
      expect(accessRecords[0].device_id).toBe('door_001');
      expect(accessRecords[0].direction).toBe('in');

      // 4. 验证使用次数被更新
      const updatedPasscode = await PasscodeModel.findById(passcodeResult.passcode.id);
      expect(updatedPasscode?.usage_count).toBe(1);
    });

    it('应该完成访客通行码的完整流程', async () => {
      // 1. 为访客申请生成通行码
      const passcodeResult = await PasscodeService.generateVisitorPasscodeFromApplication(
        testVisitorApplication.id
      );

      expect(passcodeResult.passcode.user_id).toBe(testVisitor.id);
      expect(passcodeResult.passcode.type).toBe('visitor');
      expect(passcodeResult.passcode.application_id).toBe(testVisitorApplication.id);

      // 2. 验证访客通行码
      const validateResponse = await request(app)
        .post('/api/v1/access/validate')
        .send({
          code: passcodeResult.passcode.code,
          deviceId: 'visitor_gate_001',
          direction: 'in',
          deviceType: 'face_scanner'
        });

      expect(validateResponse.status).toBe(200);
      expect(validateResponse.body.success).toBe(true);
      expect(validateResponse.body.data.userId).toBe(testVisitor.id);

      // 3. 验证访客通行记录
      const accessRecords = await AccessRecordModel.findByUserId(testVisitor.id);
      expect(accessRecords).toHaveLength(1);
      expect(accessRecords[0].result).toBe('success');
    });

    it('应该正确处理二维码通行验证', async () => {
      // 1. 生成动态二维码通行码
      const qrResult = await PasscodeService.generateDynamicQRPasscode(testEmployee.id, 'employee');

      // 2. 验证二维码通行码
      const validateResponse = await request(app)
        .post('/api/v1/access/validate/qr')
        .send({
          qrContent: qrResult.qrContent,
          deviceId: 'qr_gate_001',
          direction: 'in',
          deviceType: 'qr_scanner'
        });

      expect(validateResponse.status).toBe(200);
      expect(validateResponse.body.success).toBe(true);
      expect(validateResponse.body.data.userId).toBe(testEmployee.id);

      // 3. 验证通行记录
      const accessRecords = await AccessRecordModel.findByUserId(testEmployee.id);
      expect(accessRecords).toHaveLength(1);
    });

    it('应该正确处理时效性通行码验证', async () => {
      // 1. 生成带时效性的通行码
      const qrResult = await PasscodeService.generateDynamicQRPasscode(testEmployee.id, 'employee');
      
      expect(qrResult.timeBasedCode).toBeTruthy();

      // 2. 验证时效性通行码
      const validateResponse = await request(app)
        .post('/api/v1/access/validate/time-based')
        .send({
          timeBasedCode: qrResult.timeBasedCode,
          baseCode: qrResult.passcode.code,
          deviceId: 'time_gate_001',
          direction: 'in'
        });

      expect(validateResponse.status).toBe(200);
      expect(validateResponse.body.success).toBe(true);
      expect(validateResponse.body.data.userId).toBe(testEmployee.id);
    });
  });

  describe('通行权限和安全测试', () => {
    it('应该拒绝已禁用用户的通行', async () => {
      // 1. 生成通行码
      const passcode = await PasscodeService.generatePasscode(testEmployee.id, 'employee');

      // 2. 禁用用户
      await UserModel.update(testEmployee.id, { status: 'inactive' });

      // 3. 尝试验证通行码
      const validateResponse = await request(app)
        .post('/api/v1/access/validate')
        .send({
          code: passcode.code,
          deviceId: 'door_001',
          direction: 'in'
        });

      expect(validateResponse.status).toBe(200);
      expect(validateResponse.body.success).toBe(false);
      expect(validateResponse.body.message).toContain('用户账户已被禁用');

      // 4. 验证失败记录被创建
      const accessRecords = await AccessRecordModel.findByUserId(testEmployee.id);
      expect(accessRecords).toHaveLength(1);
      expect(accessRecords[0].result).toBe('failed');
      expect(accessRecords[0].fail_reason).toBe('用户账户已被禁用');
    });

    it('应该拒绝过期的通行码', async () => {
      // 1. 创建已过期的通行码
      const expiredPasscode = await PasscodeModel.create({
        user_id: testEmployee.id,
        code: 'EXPIRED_CODE_123',
        type: 'employee',
        status: 'active',
        expiry_time: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1小时前过期
        usage_limit: 10,
        usage_count: 0,
        permissions: JSON.stringify(['basic_access'])
      });

      // 2. 尝试验证过期通行码
      const validateResponse = await request(app)
        .post('/api/v1/access/validate')
        .send({
          code: expiredPasscode.code,
          deviceId: 'door_001',
          direction: 'in'
        });

      expect(validateResponse.status).toBe(200);
      expect(validateResponse.body.success).toBe(false);
      expect(validateResponse.body.message).toBe('通行码已过期');

      // 3. 验证通行码状态被更新
      const updatedPasscode = await PasscodeModel.findById(expiredPasscode.id);
      expect(updatedPasscode?.status).toBe('expired');
    });

    it('应该拒绝使用次数已达上限的通行码', async () => {
      // 1. 创建使用次数已达上限的通行码
      const limitedPasscode = await PasscodeModel.create({
        user_id: testEmployee.id,
        code: 'LIMITED_CODE_123',
        type: 'employee',
        status: 'active',
        expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        usage_limit: 1,
        usage_count: 1, // 已达上限
        permissions: JSON.stringify(['basic_access'])
      });

      // 2. 尝试验证
      const validateResponse = await request(app)
        .post('/api/v1/access/validate')
        .send({
          code: limitedPasscode.code,
          deviceId: 'door_001',
          direction: 'in'
        });

      expect(validateResponse.status).toBe(200);
      expect(validateResponse.body.success).toBe(false);
      expect(validateResponse.body.message).toBe('通行码使用次数已达上限');

      // 3. 验证通行码被标记为过期
      const updatedPasscode = await PasscodeModel.findById(limitedPasscode.id);
      expect(updatedPasscode?.status).toBe('expired');
    });

    it('应该处理并发通行验证请求', async () => {
      // 1. 生成通行码
      const passcode = await PasscodeService.generatePasscode(testEmployee.id, 'employee', {
        usageLimit: 10
      });

      // 2. 并发发送验证请求
      const concurrentRequests = 5;
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        request(app)
          .post('/api/v1/access/validate')
          .send({
            code: passcode.code,
            deviceId: `device_${i}`,
            direction: 'in'
          })
      );

      const responses = await Promise.all(promises);

      // 3. 验证所有请求都成功
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // 4. 验证使用次数正确更新
      const updatedPasscode = await PasscodeModel.findById(passcode.id);
      expect(updatedPasscode?.usage_count).toBe(concurrentRequests);

      // 5. 验证所有通行记录都被创建
      const accessRecords = await AccessRecordModel.findByUserId(testEmployee.id);
      expect(accessRecords).toHaveLength(concurrentRequests);
    });
  });

  describe('通行记录查询和统计', () => {
    beforeEach(async () => {
      // 创建测试通行记录
      const records = [
        {
          user_id: testEmployee.id,
          device_id: 'door_001',
          direction: 'in' as const,
          result: 'success' as const,
          timestamp: new Date('2024-01-01T09:00:00Z').toISOString()
        },
        {
          user_id: testEmployee.id,
          device_id: 'door_001',
          direction: 'out' as const,
          result: 'success' as const,
          timestamp: new Date('2024-01-01T18:00:00Z').toISOString()
        },
        {
          user_id: testVisitor.id,
          device_id: 'visitor_gate_001',
          direction: 'in' as const,
          result: 'failed' as const,
          fail_reason: '通行码无效',
          timestamp: new Date('2024-01-01T10:00:00Z').toISOString()
        }
      ];

      for (const record of records) {
        await AccessRecordModel.create(record);
      }
    });

    it('应该正确查询通行记录', async () => {
      const response = await request(app)
        .get('/api/v1/access/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          page: 1,
          limit: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(3);
      expect(response.body.data.pagination.total).toBe(3);
    });

    it('应该支持按用户筛选通行记录', async () => {
      const response = await request(app)
        .get('/api/v1/access/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          userId: testEmployee.id
        });

      expect(response.status).toBe(200);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.data.every((record: any) => record.user_id === testEmployee.id)).toBe(true);
    });

    it('应该支持按结果筛选通行记录', async () => {
      const successResponse = await request(app)
        .get('/api/v1/access/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          result: 'success'
        });

      expect(successResponse.status).toBe(200);
      expect(successResponse.body.data.data).toHaveLength(2);

      const failedResponse = await request(app)
        .get('/api/v1/access/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          result: 'failed'
        });

      expect(failedResponse.status).toBe(200);
      expect(failedResponse.body.data.data).toHaveLength(1);
    });

    it('应该支持日期范围查询', async () => {
      const response = await request(app)
        .get('/api/v1/access/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: '2024-01-01T08:00:00Z',
          endDate: '2024-01-01T12:00:00Z'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.data).toHaveLength(2); // 09:00 和 10:00 的记录
    });

    it('应该返回用户通行记录', async () => {
      const response = await request(app)
        .get(`/api/v1/access/records/user/${testEmployee.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.data.every((record: any) => record.user_id === testEmployee.id)).toBe(true);
    });

    it('应该返回设备通行记录', async () => {
      const response = await request(app)
        .get('/api/v1/access/records/device/door_001')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.data.every((record: any) => record.device_id === 'door_001')).toBe(true);
    });

    it('应该返回通行统计信息', async () => {
      const response = await request(app)
        .get('/api/v1/access/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-02T00:00:00Z'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.success).toBe(2);
      expect(response.body.data.failed).toBe(1);
      expect(response.body.data.successRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('实时状态和监控', () => {
    it('应该返回设备实时状态', async () => {
      // 创建最近的通行记录
      await AccessRecordModel.create({
        user_id: testEmployee.id,
        device_id: 'monitor_device_001',
        direction: 'in',
        result: 'success',
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString() // 2分钟前
      });

      const response = await request(app)
        .get('/api/v1/access/status/realtime')
        .query({
          deviceId: 'monitor_device_001'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deviceId).toBe('monitor_device_001');
      expect(response.body.data.isOnline).toBe(true);
      expect(response.body.data.status).toBe('active');
    });

    it('应该检测离线设备', async () => {
      // 创建较早的通行记录
      await AccessRecordModel.create({
        user_id: testEmployee.id,
        device_id: 'offline_device_001',
        direction: 'in',
        result: 'success',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2小时前
      });

      const response = await request(app)
        .get('/api/v1/access/status/realtime')
        .query({
          deviceId: 'offline_device_001'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.isOnline).toBe(false);
      expect(response.body.data.status).toBe('offline');
    });
  });

  describe('用户通行码管理', () => {
    it('应该允许用户获取当前通行码', async () => {
      // 先生成通行码
      const passcode = await PasscodeService.generatePasscode(testEmployee.id, 'employee');

      const response = await request(app)
        .get('/api/v1/access/passcode/current')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(passcode.id);
      expect(response.body.data.user_id).toBe(testEmployee.id);
    });

    it('应该允许用户刷新通行码', async () => {
      // 先生成通行码
      const oldPasscode = await PasscodeService.generatePasscode(testEmployee.id, 'employee');

      const response = await request(app)
        .post('/api/v1/access/passcode/refresh')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user_id).toBe(testEmployee.id);
      expect(response.body.data.code).not.toBe(oldPasscode.code); // 应该是新的通行码

      // 验证旧通行码被撤销
      const updatedOldPasscode = await PasscodeModel.findById(oldPasscode.id);
      expect(updatedOldPasscode?.status).toBe('revoked');
    });

    it('应该拒绝未认证用户的请求', async () => {
      const response = await request(app)
        .get('/api/v1/access/passcode/current');

      expect(response.status).toBe(401);
    });
  });

  describe('通行码信息查询', () => {
    it('应该返回通行码详细信息', async () => {
      const passcode = await PasscodeService.generatePasscode(testEmployee.id, 'employee');

      const response = await request(app)
        .get(`/api/v1/access/passcode/${passcode.code}/info`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(passcode.id);
      expect(response.body.data.type).toBe('employee');
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.user.id).toBe(testEmployee.id);
      expect(response.body.data.user.name).toBe(testEmployee.name);
    });

    it('应该处理不存在的通行码', async () => {
      const response = await request(app)
        .get('/api/v1/access/passcode/NONEXISTENT_CODE/info');

      expect(response.status).toBe(500); // 服务内部错误
    });
  });

  describe('错误处理和边界条件', () => {
    it('应该处理缺少必需参数的验证请求', async () => {
      const response = await request(app)
        .post('/api/v1/access/validate')
        .send({
          code: 'TEST_CODE'
          // 缺少 deviceId
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('通行码和设备ID不能为空');
    });

    it('应该处理无效的二维码内容', async () => {
      const response = await request(app)
        .post('/api/v1/access/validate/qr')
        .send({
          qrContent: 'invalid_qr_content',
          deviceId: 'device_001'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('二维码');
    });

    it('应该处理无效的时效性通行码', async () => {
      const response = await request(app)
        .post('/api/v1/access/validate/time-based')
        .send({
          timeBasedCode: 'INVALID_TIME_CODE',
          baseCode: 'BASE_CODE',
          deviceId: 'device_001'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('时效性通行码');
    });

    it('应该处理系统异常', async () => {
      // 使用一个会导致数据库错误的无效用户ID
      const response = await request(app)
        .post('/api/v1/access/validate')
        .send({
          code: 'SYSTEM_ERROR_TEST',
          deviceId: 'device_001'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      // 应该有合适的错误消息
    });
  });

  describe('性能测试', () => {
    it('应该在高并发下保持性能', async () => {
      // 生成多个通行码
      const passcodes = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          PasscodeService.generatePasscode(testEmployee.id, 'employee', {
            usageLimit: 100
          })
        )
      );

      // 并发验证请求
      const concurrentRequests = 50;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        request(app)
          .post('/api/v1/access/validate')
          .send({
            code: passcodes[i % passcodes.length].code,
            deviceId: `perf_device_${i}`,
            direction: 'in'
          })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证所有请求都成功
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // 验证性能（应该在合理时间内完成）
      expect(duration).toBeLessThan(5000); // 5秒内完成

      console.log(`并发测试完成: ${concurrentRequests} 个请求在 ${duration}ms 内完成`);
    });

    it('应该正确处理大量通行记录查询', async () => {
      // 创建大量测试记录
      const recordCount = 100;
      const records = Array.from({ length: recordCount }, (_, i) => ({
        user_id: testEmployee.id,
        device_id: `device_${i % 10}`,
        direction: i % 2 === 0 ? 'in' as const : 'out' as const,
        result: 'success' as const,
        timestamp: new Date(Date.now() - i * 60 * 1000).toISOString()
      }));

      await AccessRecordModel.batchCreate(records);

      // 查询记录
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/v1/access/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          page: 1,
          limit: 50,
          userId: testEmployee.id
        });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(50);
      expect(response.body.data.pagination.total).toBe(recordCount);

      // 验证查询性能
      expect(duration).toBeLessThan(1000); // 1秒内完成

      console.log(`大量数据查询完成: ${recordCount} 条记录查询在 ${duration}ms 内完成`);
    });
  });
});