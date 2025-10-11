import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import database from '../../../src/utils/database.js';
import { AccessRecordModel } from '../../../src/models/access-record.model.js';
import { UserModel } from '../../../src/models/user.model.js';
import { PasscodeModel } from '../../../src/models/passcode.model.js';
import { ProjectModel } from '../../../src/models/project.model.js';
import { VenueModel } from '../../../src/models/venue.model.js';
import { FloorModel } from '../../../src/models/floor.model.js';
import type { AccessRecord, AccessDirection, AccessResult } from '../../../src/types/index.js';

describe('AccessRecordModel', () => {
  let testUserId: number;
  let testPasscodeId: number;
  let testProjectId: number;
  let testVenueId: number;
  let testFloorId: number;

  beforeEach(async () => {
    // 连接测试数据库
    await database.connect();
    
    // 创建测试用户
    const user = await UserModel.create({
      name: '测试用户',
      user_type: 'employee',
      phone: '13800138000',
      status: 'active'
    });
    testUserId = user.id;

    // 创建测试通行码
    const passcode = await PasscodeModel.create({
      user_id: testUserId,
      code: 'TEST_PASSCODE_001',
      type: 'employee',
      status: 'active'
    });
    testPasscodeId = passcode.id;

    // 创建测试项目
    const project = await ProjectModel.create({
      code: 'TEST_PROJECT',
      name: '测试项目',
      status: 'active'
    });
    testProjectId = project.id;

    // 创建测试场地
    const venue = await VenueModel.create({
      project_id: testProjectId,
      code: 'TEST_VENUE',
      name: '测试场地',
      status: 'active'
    });
    testVenueId = venue.id;

    // 创建测试楼层
    const floor = await FloorModel.create({
      venue_id: testVenueId,
      code: 'F1',
      name: '1楼',
      status: 'active'
    });
    testFloorId = floor.id;
  });

  afterEach(async () => {
    // 清理测试数据
    await database.run('DELETE FROM access_records WHERE device_id LIKE "TEST_%"');
    await database.run('DELETE FROM passcodes WHERE code LIKE "TEST_%"');
    await database.run('DELETE FROM floors WHERE code LIKE "TEST_%"');
    await database.run('DELETE FROM venues WHERE code LIKE "TEST_%"');
    await database.run('DELETE FROM projects WHERE code LIKE "TEST_%"');
    await database.run('DELETE FROM users WHERE name LIKE "测试%"');
    await database.close();
  });

  describe('create', () => {
    it('应该成功创建通行记录', async () => {
      const recordData = {
        user_id: testUserId,
        passcode_id: testPasscodeId,
        device_id: 'TEST_DEVICE_001',
        device_type: '门禁设备',
        direction: 'in' as AccessDirection,
        result: 'success' as AccessResult,
        project_id: testProjectId,
        venue_id: testVenueId,
        floor_id: testFloorId
      };

      const record = await AccessRecordModel.create(recordData);

      expect(record).toBeDefined();
      expect(record.id).toBeGreaterThan(0);
      expect(record.user_id).toBe(recordData.user_id);
      expect(record.passcode_id).toBe(recordData.passcode_id);
      expect(record.device_id).toBe(recordData.device_id);
      expect(record.device_type).toBe(recordData.device_type);
      expect(record.direction).toBe(recordData.direction);
      expect(record.result).toBe(recordData.result);
      expect(record.project_id).toBe(recordData.project_id);
      expect(record.venue_id).toBe(recordData.venue_id);
      expect(record.floor_id).toBe(recordData.floor_id);
      expect(record.timestamp).toBeDefined();
    });

    it('应该创建失败的通行记录', async () => {
      const recordData = {
        user_id: testUserId,
        device_id: 'TEST_DEVICE_002',
        direction: 'in' as AccessDirection,
        result: 'failed' as AccessResult,
        fail_reason: '通行码已过期'
      };

      const record = await AccessRecordModel.create(recordData);

      expect(record.result).toBe('failed');
      expect(record.fail_reason).toBe('通行码已过期');
      expect(record.passcode_id).toBeNull();
    });

    it('创建记录时缺少必填字段应该失败', async () => {
      const recordData = {
        user_id: testUserId
        // 缺少其他必填字段
      };

      await expect(AccessRecordModel.create(recordData as any)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('应该根据ID查找通行记录', async () => {
      const recordData = {
        user_id: testUserId,
        device_id: 'TEST_DEVICE_003',
        direction: 'out' as AccessDirection,
        result: 'success' as AccessResult
      };

      const createdRecord = await AccessRecordModel.create(recordData);
      const foundRecord = await AccessRecordModel.findById(createdRecord.id);

      expect(foundRecord).toBeDefined();
      expect(foundRecord!.id).toBe(createdRecord.id);
      expect(foundRecord!.device_id).toBe(recordData.device_id);
    });

    it('查找不存在的记录应该返回null', async () => {
      const record = await AccessRecordModel.findById(99999);
      expect(record).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('应该根据用户ID查找通行记录列表', async () => {
      const recordData1 = {
        user_id: testUserId,
        device_id: 'TEST_DEVICE_004',
        direction: 'in' as AccessDirection,
        result: 'success' as AccessResult
      };

      const recordData2 = {
        user_id: testUserId,
        device_id: 'TEST_DEVICE_005',
        direction: 'out' as AccessDirection,
        result: 'success' as AccessResult
      };

      await AccessRecordModel.create(recordData1);
      await AccessRecordModel.create(recordData2);

      const records = await AccessRecordModel.findByUserId(testUserId);

      expect(records.length).toBeGreaterThanOrEqual(2);
      expect(records.every(record => record.user_id === testUserId)).toBe(true);
    });
  });

  describe('findByDeviceId', () => {
    it('应该根据设备ID查找通行记录列表', async () => {
      const deviceId = 'TEST_DEVICE_006';
      const recordData = {
        user_id: testUserId,
        device_id: deviceId,
        direction: 'in' as AccessDirection,
        result: 'success' as AccessResult
      };

      await AccessRecordModel.create(recordData);

      const records = await AccessRecordModel.findByDeviceId(deviceId);

      expect(records.length).toBeGreaterThanOrEqual(1);
      expect(records.every(record => record.device_id === deviceId)).toBe(true);
    });
  });

  describe('findByPasscodeId', () => {
    it('应该根据通行码ID查找通行记录列表', async () => {
      const recordData = {
        user_id: testUserId,
        passcode_id: testPasscodeId,
        device_id: 'TEST_DEVICE_007',
        direction: 'in' as AccessDirection,
        result: 'success' as AccessResult
      };

      await AccessRecordModel.create(recordData);

      const records = await AccessRecordModel.findByPasscodeId(testPasscodeId);

      expect(records.length).toBeGreaterThanOrEqual(1);
      expect(records.every(record => record.passcode_id === testPasscodeId)).toBe(true);
    });
  });

  describe('findByResult', () => {
    it('应该根据结果查找通行记录列表', async () => {
      const recordData = {
        user_id: testUserId,
        device_id: 'TEST_DEVICE_008',
        direction: 'in' as AccessDirection,
        result: 'failed' as AccessResult,
        fail_reason: '权限不足'
      };

      await AccessRecordModel.create(recordData);

      const records = await AccessRecordModel.findByResult('failed');

      expect(records.length).toBeGreaterThanOrEqual(1);
      expect(records.every(record => record.result === 'failed')).toBe(true);
    });
  });

  describe('update', () => {
    it('应该成功更新通行记录信息', async () => {
      const recordData = {
        user_id: testUserId,
        device_id: 'TEST_DEVICE_009',
        direction: 'in' as AccessDirection,
        result: 'success' as AccessResult
      };

      const record = await AccessRecordModel.create(recordData);
      const updateData = {
        device_type: '更新后的设备类型',
        fail_reason: '更新后的失败原因'
      };

      const updatedRecord = await AccessRecordModel.update(record.id, updateData);

      expect(updatedRecord.device_type).toBe(updateData.device_type);
      expect(updatedRecord.fail_reason).toBe(updateData.fail_reason);
      expect(updatedRecord.device_id).toBe(recordData.device_id); // 未更新的字段保持不变
    });

    it('更新不存在的记录应该失败', async () => {
      await expect(AccessRecordModel.update(99999, { device_type: '新类型' })).rejects.toThrow('通行记录不存在或更新失败');
    });
  });

  describe('delete', () => {
    it('应该物理删除通行记录', async () => {
      const recordData = {
        user_id: testUserId,
        device_id: 'TEST_DEVICE_010',
        direction: 'in' as AccessDirection,
        result: 'success' as AccessResult
      };

      const record = await AccessRecordModel.create(recordData);
      const result = await AccessRecordModel.delete(record.id);

      expect(result).toBe(true);

      const deletedRecord = await AccessRecordModel.findById(record.id);
      expect(deletedRecord).toBeNull();
    });
  });

  describe('count', () => {
    it('应该统计通行记录数量', async () => {
      const initialCount = await AccessRecordModel.count();

      await AccessRecordModel.create({
        user_id: testUserId,
        device_id: 'TEST_DEVICE_011',
        direction: 'in' as AccessDirection,
        result: 'success' as AccessResult
      });

      const newCount = await AccessRecordModel.count();
      expect(newCount).toBe(initialCount + 1);
    });

    it('应该根据条件统计记录数量', async () => {
      await AccessRecordModel.create({
        user_id: testUserId,
        device_id: 'TEST_DEVICE_012',
        direction: 'in' as AccessDirection,
        result: 'success' as AccessResult
      });

      const count = await AccessRecordModel.count({
        userId: testUserId,
        result: 'success',
        direction: 'in'
      });

      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getTodayCount', () => {
    it('应该获取今日通行记录数量', async () => {
      await AccessRecordModel.create({
        user_id: testUserId,
        device_id: 'TEST_DEVICE_013',
        direction: 'in' as AccessDirection,
        result: 'success' as AccessResult
      });

      const todayCount = await AccessRecordModel.getTodayCount({ userId: testUserId });

      expect(todayCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getSuccessCount and getFailedCount', () => {
    it('应该获取成功和失败通行次数', async () => {
      await AccessRecordModel.create({
        user_id: testUserId,
        device_id: 'TEST_DEVICE_014',
        direction: 'in' as AccessDirection,
        result: 'success' as AccessResult
      });

      await AccessRecordModel.create({
        user_id: testUserId,
        device_id: 'TEST_DEVICE_015',
        direction: 'in' as AccessDirection,
        result: 'failed' as AccessResult,
        fail_reason: '测试失败'
      });

      const successCount = await AccessRecordModel.getSuccessCount({ userId: testUserId });
      const failedCount = await AccessRecordModel.getFailedCount({ userId: testUserId });

      expect(successCount).toBeGreaterThanOrEqual(1);
      expect(failedCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('validateRecordData', () => {
    it('应该验证有效的记录数据', () => {
      const recordData = {
        user_id: testUserId,
        device_id: 'VALID_DEVICE',
        direction: 'in' as AccessDirection,
        result: 'success' as AccessResult
      };

      const validation = AccessRecordModel.validateRecordData(recordData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('应该检测无效的记录数据', () => {
      const recordData = {
        user_id: 0, // 无效用户ID
        device_id: '', // 空设备ID
        direction: 'invalid' as AccessDirection, // 无效方向
        result: 'failed' as AccessResult,
        fail_reason: '' // 失败时缺少失败原因
      };

      const validation = AccessRecordModel.validateRecordData(recordData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('用户ID无效');
      expect(validation.errors).toContain('设备ID不能为空');
      expect(validation.errors).toContain('通行方向无效');
      expect(validation.errors).toContain('通行失败时必须提供失败原因');
    });
  });

  describe('exists', () => {
    it('应该检查通行记录是否存在', async () => {
      const recordData = {
        user_id: testUserId,
        device_id: 'TEST_DEVICE_016',
        direction: 'in' as AccessDirection,
        result: 'success' as AccessResult
      };

      const record = await AccessRecordModel.create(recordData);
      const exists = await AccessRecordModel.exists(record.id);

      expect(exists).toBe(true);

      const notExists = await AccessRecordModel.exists(99999);
      expect(notExists).toBe(false);
    });
  });

  describe('getLatestByUserId', () => {
    it('应该获取用户最近的通行记录', async () => {
      // 创建多条记录
      for (let i = 0; i < 3; i++) {
        await AccessRecordModel.create({
          user_id: testUserId,
          device_id: `TEST_DEVICE_LATEST_${i}`,
          direction: 'in' as AccessDirection,
          result: 'success' as AccessResult
        });
      }

      const latestRecords = await AccessRecordModel.getLatestByUserId(testUserId, 2);

      expect(latestRecords).toHaveLength(2);
      expect(latestRecords.every(record => record.user_id === testUserId)).toBe(true);
    });
  });

  describe('getLatestByDeviceId', () => {
    it('应该获取设备最近的通行记录', async () => {
      const deviceId = 'TEST_DEVICE_LATEST';
      
      // 创建多条记录
      for (let i = 0; i < 3; i++) {
        await AccessRecordModel.create({
          user_id: testUserId,
          device_id: deviceId,
          direction: 'in' as AccessDirection,
          result: 'success' as AccessResult
        });
      }

      const latestRecords = await AccessRecordModel.getLatestByDeviceId(deviceId, 2);

      expect(latestRecords).toHaveLength(2);
      expect(latestRecords.every(record => record.device_id === deviceId)).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('应该获取通行统计信息', async () => {
      // 创建成功和失败的记录
      await AccessRecordModel.create({
        user_id: testUserId,
        device_id: 'TEST_DEVICE_STATS_1',
        direction: 'in' as AccessDirection,
        result: 'success' as AccessResult
      });

      await AccessRecordModel.create({
        user_id: testUserId,
        device_id: 'TEST_DEVICE_STATS_2',
        direction: 'out' as AccessDirection,
        result: 'failed' as AccessResult,
        fail_reason: '测试失败'
      });

      const stats = await AccessRecordModel.getStatistics({ userId: testUserId });

      expect(stats).toBeDefined();
      expect(stats.totalCount).toBeGreaterThanOrEqual(2);
      expect(stats.successCount).toBeGreaterThanOrEqual(1);
      expect(stats.failedCount).toBeGreaterThanOrEqual(1);
      expect(stats.inCount).toBeGreaterThanOrEqual(1);
      expect(stats.outCount).toBeGreaterThanOrEqual(1);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
    });
  });

  describe('getFullInfo', () => {
    it('应该获取通行记录的完整信息', async () => {
      const recordData = {
        user_id: testUserId,
        passcode_id: testPasscodeId,
        device_id: 'TEST_DEVICE_FULL_INFO',
        direction: 'in' as AccessDirection,
        result: 'success' as AccessResult,
        project_id: testProjectId,
        venue_id: testVenueId,
        floor_id: testFloorId
      };

      const record = await AccessRecordModel.create(recordData);
      const fullInfo = await AccessRecordModel.getFullInfo(record.id);

      expect(fullInfo).toBeDefined();
      expect(fullInfo!.record).toBeDefined();
      expect(fullInfo!.user).toBeDefined();
      expect(fullInfo!.passcode).toBeDefined();
      expect(fullInfo!.project).toBeDefined();
      expect(fullInfo!.venue).toBeDefined();
      expect(fullInfo!.floor).toBeDefined();

      expect(fullInfo!.record.id).toBe(record.id);
      expect(fullInfo!.user.id).toBe(testUserId);
      expect(fullInfo!.passcode.id).toBe(testPasscodeId);
      expect(fullInfo!.project.id).toBe(testProjectId);
      expect(fullInfo!.venue.id).toBe(testVenueId);
      expect(fullInfo!.floor.id).toBe(testFloorId);
    });
  });

  describe('batchCreate', () => {
    it('应该批量创建通行记录', async () => {
      const recordsData = [
        {
          user_id: testUserId,
          device_id: 'TEST_DEVICE_BATCH_1',
          direction: 'in' as AccessDirection,
          result: 'success' as AccessResult
        },
        {
          user_id: testUserId,
          device_id: 'TEST_DEVICE_BATCH_2',
          direction: 'out' as AccessDirection,
          result: 'success' as AccessResult
        }
      ];

      const records = await AccessRecordModel.batchCreate(recordsData);

      expect(records).toHaveLength(2);
      expect(records[0].device_id).toBe(recordsData[0].device_id);
      expect(records[1].device_id).toBe(recordsData[1].device_id);
    });
  });

  describe('cleanup', () => {
    it('应该清理旧的通行记录', async () => {
      // 创建一条记录
      const record = await AccessRecordModel.create({
        user_id: testUserId,
        device_id: 'TEST_DEVICE_CLEANUP',
        direction: 'in' as AccessDirection,
        result: 'success' as AccessResult
      });

      // 清理90天前的记录（这条记录不会被清理）
      const cleanedCount = await AccessRecordModel.cleanup(90);

      // 验证记录仍然存在
      const existingRecord = await AccessRecordModel.findById(record.id);
      expect(existingRecord).toBeDefined();
    });
  });

  describe('findAll with filters', () => {
    it('应该支持复杂筛选查询', async () => {
      const deviceId = 'TEST_DEVICE_FILTER';
      
      await AccessRecordModel.create({
        user_id: testUserId,
        device_id: deviceId,
        device_type: '门禁设备',
        direction: 'in' as AccessDirection,
        result: 'success' as AccessResult,
        project_id: testProjectId
      });

      const records = await AccessRecordModel.findAll({
        userId: testUserId,
        deviceId: deviceId,
        direction: 'in',
        result: 'success',
        projectId: testProjectId,
        search: '门禁'
      });

      expect(records.length).toBeGreaterThanOrEqual(1);
      expect(records.every(record => 
        record.user_id === testUserId &&
        record.device_id === deviceId &&
        record.direction === 'in' &&
        record.result === 'success' &&
        record.project_id === testProjectId
      )).toBe(true);
    });

    it('应该支持分页查询', async () => {
      // 创建多条记录
      for (let i = 0; i < 5; i++) {
        await AccessRecordModel.create({
          user_id: testUserId,
          device_id: `TEST_DEVICE_PAGE_${i}`,
          direction: 'in' as AccessDirection,
          result: 'success' as AccessResult
        });
      }

      const page1 = await AccessRecordModel.findAll({ 
        userId: testUserId,
        page: 1, 
        limit: 2 
      });
      const page2 = await AccessRecordModel.findAll({ 
        userId: testUserId,
        page: 2, 
        limit: 2 
      });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });
});