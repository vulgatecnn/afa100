import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { Database } from '../../src/utils/database.js';
import { UserModel } from '../../src/models/user.model.js';
import { MerchantModel } from '../../src/models/merchant.model.js';
import { PasscodeModel } from '../../src/models/passcode.model.js';
import { AccessRecordModel } from '../../src/models/access-record.model.js';
import { JWTUtils } from '../../src/utils/jwt.js';
import type { User, Merchant, Passcode } from '../../src/types/index.js';

describe('Access Integration Tests', () => {
  let testUser: User;
  let testMerchant: Merchant;
  let testPasscode: Passcode;
  let authToken: string;

  beforeAll(async () => {
    // 初始化测试数据库
    await Database.getInstance().init();
  });

  afterAll(async () => {
    // 清理测试数据库
    await Database.getInstance().close();
  });

  beforeEach(async () => {
    // 创建测试商户
    testMerchant = await MerchantModel.create({
      name: '测试商户',
      code: 'TEST_MERCHANT',
      contact: '测试联系人',
      phone: '13800138000',
      status: 'active'
    });

    // 创建测试用户
    testUser = await UserModel.create({
      name: '测试员工',
      phone: '13800138001',
      user_type: 'employee',
      status: 'active',
      merchant_id: testMerchant.id
    });

    // 生成认证token
    authToken = JWTUtils.generateToken({
      userId: testUser.id,
      userType: testUser.user_type,
      merchantId: testUser.merchant_id
    });

    // 创建测试通行码
    testPasscode = await PasscodeModel.create({
      user_id: testUser.id,
      code: 'TEST_PASSCODE_123',
      type: 'employee',
      status: 'active',
      expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      usage_limit: 10,
      usage_count: 0,
      permissions: JSON.stringify(['basic_access'])
    });
  });

  afterEach(async () => {
    // 清理测试数据
    await Database.getInstance().run('DELETE FROM access_records');
    await Database.getInstance().run('DELETE FROM passcodes');
    await Database.getInstance().run('DELETE FROM users');
    await Database.getInstance().run('DELETE FROM merchants');
  });

  describe('POST /api/v1/access/validate', () => {
    it('应该成功验证有效的通行码', async () => {
      const response = await request(app)
        .post('/api/v1/access/validate')
        .send({
          code: 'TEST_PASSCODE_123',
          deviceId: 'device_001',
          direction: 'in',
          deviceType: 'door_scanner',
          projectId: 1,
          venueId: 1,
          floorId: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('通行验证成功');
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.userId).toBe(testUser.id);
      expect(response.body.data.userName).toBe(testUser.name);
      expect(response.body.data.userType).toBe(testUser.user_type);

      // 验证通行记录是否被创建
      const records = await AccessRecordModel.findByUserId(testUser.id);
      expect(records).toHaveLength(1);
      expect(records[0].result).toBe('success');
      expect(records[0].device_id).toBe('device_001');
      expect(records[0].direction).toBe('in');
    });

    it('应该拒绝无效的通行码', async () => {
      const response = await request(app)
        .post('/api/v1/access/validate')
        .send({
          code: 'INVALID_CODE',
          deviceId: 'device_001',
          direction: 'in'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('通行码不存在');
      expect(response.body.data.valid).toBe(false);

      // 验证失败记录是否被创建
      const records = await AccessRecordModel.findByDeviceId('device_001');
      expect(records).toHaveLength(1);
      expect(records[0].result).toBe('failed');
      expect(records[0].fail_reason).toBe('通行码不存在');
    });

    it('应该拒绝已过期的通行码', async () => {
      // 创建已过期的通行码
      const expiredPasscode = await PasscodeModel.create({
        user_id: testUser.id,
        code: 'EXPIRED_CODE',
        type: 'employee',
        status: 'active',
        expiry_time: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1小时前过期
        usage_limit: 10,
        usage_count: 0,
        permissions: JSON.stringify(['basic_access'])
      });

      const response = await request(app)
        .post('/api/v1/access/validate')
        .send({
          code: 'EXPIRED_CODE',
          deviceId: 'device_001',
          direction: 'in'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('通行码已过期');
      expect(response.body.data.valid).toBe(false);

      // 验证通行码状态被更新为过期
      const updatedPasscode = await PasscodeModel.findById(expiredPasscode.id);
      expect(updatedPasscode?.status).toBe('expired');
    });

    it('应该在缺少必需参数时返回400错误', async () => {
      const response = await request(app)
        .post('/api/v1/access/validate')
        .send({
          code: 'TEST_PASSCODE_123'
          // 缺少 deviceId
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('通行码和设备ID不能为空');
    });

    it('应该正确更新通行码使用次数', async () => {
      // 第一次验证
      await request(app)
        .post('/api/v1/access/validate')
        .send({
          code: 'TEST_PASSCODE_123',
          deviceId: 'device_001',
          direction: 'in'
        });

      // 检查使用次数
      let updatedPasscode = await PasscodeModel.findById(testPasscode.id);
      expect(updatedPasscode?.usage_count).toBe(1);

      // 第二次验证
      await request(app)
        .post('/api/v1/access/validate')
        .send({
          code: 'TEST_PASSCODE_123',
          deviceId: 'device_001',
          direction: 'out'
        });

      // 检查使用次数
      updatedPasscode = await PasscodeModel.findById(testPasscode.id);
      expect(updatedPasscode?.usage_count).toBe(2);
    });

    it('应该在使用次数达到上限时拒绝通行', async () => {
      // 创建使用次数已达上限的通行码
      const limitedPasscode = await PasscodeModel.create({
        user_id: testUser.id,
        code: 'LIMITED_CODE',
        type: 'employee',
        status: 'active',
        expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        usage_limit: 1,
        usage_count: 1, // 已达上限
        permissions: JSON.stringify(['basic_access'])
      });

      const response = await request(app)
        .post('/api/v1/access/validate')
        .send({
          code: 'LIMITED_CODE',
          deviceId: 'device_001',
          direction: 'in'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('通行码使用次数已达上限');

      // 验证通行码状态被更新为过期
      const updatedPasscode = await PasscodeModel.findById(limitedPasscode.id);
      expect(updatedPasscode?.status).toBe('expired');
    });
  });

  describe('GET /api/v1/access/passcode/:code/info', () => {
    it('应该返回通行码信息', async () => {
      const response = await request(app)
        .get(`/api/v1/access/passcode/${testPasscode.code}/info`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testPasscode.id);
      expect(response.body.data.type).toBe('employee');
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.user.name).toBe(testUser.name);
    });

    it('应该在通行码不存在时抛出错误', async () => {
      const response = await request(app)
        .get('/api/v1/access/passcode/NONEXISTENT/info');

      expect(response.status).toBe(500); // 服务内部错误
    });
  });

  describe('GET /api/v1/access/status/realtime', () => {
    it('应该返回实时通行状态', async () => {
      // 先创建一些通行记录
      await AccessRecordModel.create({
        user_id: testUser.id,
        passcode_id: testPasscode.id,
        device_id: 'device_001',
        direction: 'in',
        result: 'success',
        timestamp: new Date().toISOString()
      });

      const response = await request(app)
        .get('/api/v1/access/status/realtime')
        .query({ deviceId: 'device_001' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deviceId).toBe('device_001');
      expect(response.body.data.todayCount).toBeGreaterThan(0);
      expect(response.body.data.isOnline).toBe(true);
    });
  });

  describe('认证相关接口', () => {
    describe('GET /api/v1/access/passcode/current', () => {
      it('应该返回当前用户的通行码', async () => {
        const response = await request(app)
          .get('/api/v1/access/passcode/current')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(testPasscode.id);
        expect(response.body.data.user_id).toBe(testUser.id);
      });

      it('应该在未认证时返回401错误', async () => {
        const response = await request(app)
          .get('/api/v1/access/passcode/current');

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/v1/access/passcode/refresh', () => {
      it('应该成功刷新用户通行码', async () => {
        const response = await request(app)
          .post('/api/v1/access/passcode/refresh')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user_id).toBe(testUser.id);
        expect(response.body.data.code).not.toBe(testPasscode.code); // 应该是新的通行码

        // 验证旧通行码被撤销
        const oldPasscode = await PasscodeModel.findById(testPasscode.id);
        expect(oldPasscode?.status).toBe('revoked');
      });

      it('应该在未认证时返回401错误', async () => {
        const response = await request(app)
          .post('/api/v1/access/passcode/refresh');

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v1/access/records', () => {
      it('应该返回通行记录列表', async () => {
        // 创建测试记录
        await AccessRecordModel.create({
          user_id: testUser.id,
          passcode_id: testPasscode.id,
          device_id: 'device_001',
          direction: 'in',
          result: 'success',
          timestamp: new Date().toISOString()
        });

        const response = await request(app)
          .get('/api/v1/access/records')
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            page: 1,
            limit: 10,
            userId: testUser.id
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.data).toHaveLength(1);
        expect(response.body.data.pagination.total).toBe(1);
      });

      it('应该支持分页查询', async () => {
        // 创建多条记录
        for (let i = 0; i < 15; i++) {
          await AccessRecordModel.create({
            user_id: testUser.id,
            passcode_id: testPasscode.id,
            device_id: 'device_001',
            direction: i % 2 === 0 ? 'in' : 'out',
            result: 'success',
            timestamp: new Date(Date.now() + i * 1000).toISOString()
          });
        }

        // 第一页
        const page1Response = await request(app)
          .get('/api/v1/access/records')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ page: 1, limit: 10 });

        expect(page1Response.body.data.data).toHaveLength(10);
        expect(page1Response.body.data.pagination.page).toBe(1);
        expect(page1Response.body.data.pagination.totalPages).toBe(2);

        // 第二页
        const page2Response = await request(app)
          .get('/api/v1/access/records')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ page: 2, limit: 10 });

        expect(page2Response.body.data.data).toHaveLength(5);
        expect(page2Response.body.data.pagination.page).toBe(2);
      });

      it('应该支持按结果筛选', async () => {
        // 创建成功和失败的记录
        await AccessRecordModel.create({
          user_id: testUser.id,
          device_id: 'device_001',
          direction: 'in',
          result: 'success',
          timestamp: new Date().toISOString()
        });

        await AccessRecordModel.create({
          user_id: testUser.id,
          device_id: 'device_001',
          direction: 'in',
          result: 'failed',
          fail_reason: '测试失败',
          timestamp: new Date().toISOString()
        });

        // 查询成功记录
        const successResponse = await request(app)
          .get('/api/v1/access/records')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ result: 'success' });

        expect(successResponse.body.data.data).toHaveLength(1);
        expect(successResponse.body.data.data[0].result).toBe('success');

        // 查询失败记录
        const failedResponse = await request(app)
          .get('/api/v1/access/records')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ result: 'failed' });

        expect(failedResponse.body.data.data).toHaveLength(1);
        expect(failedResponse.body.data.data[0].result).toBe('failed');
      });
    });

    describe('GET /api/v1/access/records/user/:userId', () => {
      it('应该返回指定用户的通行记录', async () => {
        await AccessRecordModel.create({
          user_id: testUser.id,
          device_id: 'device_001',
          direction: 'in',
          result: 'success',
          timestamp: new Date().toISOString()
        });

        const response = await request(app)
          .get(`/api/v1/access/records/user/${testUser.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.data).toHaveLength(1);
        expect(response.body.data.data[0].user_id).toBe(testUser.id);
      });
    });

    describe('GET /api/v1/access/records/device/:deviceId', () => {
      it('应该返回指定设备的通行记录', async () => {
        await AccessRecordModel.create({
          user_id: testUser.id,
          device_id: 'device_001',
          direction: 'in',
          result: 'success',
          timestamp: new Date().toISOString()
        });

        const response = await request(app)
          .get('/api/v1/access/records/device/device_001')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.data).toHaveLength(1);
        expect(response.body.data.data[0].device_id).toBe('device_001');
      });
    });
  });

  describe('性能和并发测试', () => {
    it('应该能处理并发的通行码验证请求', async () => {
      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/api/v1/access/validate')
            .send({
              code: 'TEST_PASSCODE_123',
              deviceId: `device_${i}`,
              direction: 'in'
            })
        );
      }

      const responses = await Promise.all(promises);

      // 所有请求都应该成功
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // 验证使用次数正确更新
      const updatedPasscode = await PasscodeModel.findById(testPasscode.id);
      expect(updatedPasscode?.usage_count).toBe(concurrentRequests);

      // 验证所有通行记录都被创建
      const records = await AccessRecordModel.findByUserId(testUser.id);
      expect(records).toHaveLength(concurrentRequests);
    });

    it('应该在高频验证下保持数据一致性', async () => {
      // 创建使用次数限制较低的通行码
      const limitedPasscode = await PasscodeModel.create({
        user_id: testUser.id,
        code: 'LIMITED_CONCURRENT',
        type: 'employee',
        status: 'active',
        expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        usage_limit: 5,
        usage_count: 0,
        permissions: JSON.stringify(['basic_access'])
      });

      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/api/v1/access/validate')
            .send({
              code: 'LIMITED_CONCURRENT',
              deviceId: `device_${i}`,
              direction: 'in'
            })
        );
      }

      const responses = await Promise.all(promises);

      // 统计成功和失败的请求
      const successCount = responses.filter(r => r.body.success).length;
      const failCount = responses.filter(r => !r.body.success).length;

      // 应该有5个成功，5个失败（由于使用次数限制）
      expect(successCount).toBe(5);
      expect(failCount).toBe(5);

      // 验证通行码状态
      const finalPasscode = await PasscodeModel.findById(limitedPasscode.id);
      expect(finalPasscode?.usage_count).toBe(5);
      expect(finalPasscode?.status).toBe('expired');
    });
  });
});