import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AccessRecordService } from '../../../src/services/access-record.service.js';
import { AccessRecordModel } from '../../../src/models/access-record.model.js';
import { UserModel } from '../../../src/models/user.model.js';
import type { AccessRecord, User, CreateAccessRecordData } from '../../../src/types/index.js';

// Mock 所有依赖
vi.mock('../../../src/models/access-record.model.js');
vi.mock('../../../src/models/user.model.js');

describe('AccessRecordService 单元测试', () => {
  const mockUser: User = {
    id: 1,
    name: '测试用户',
    phone: '13800138000',
    user_type: 'employee',
    status: 'active',
    merchant_id: 1,
    open_id: 'test_openid',
    union_id: null,
    avatar: null,
    password: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockAccessRecord: AccessRecord = {
    id: 1,
    user_id: 1,
    passcode_id: 1,
    device_id: 'device_001',
    device_type: 'qr_scanner',
    direction: 'in',
    result: 'success',
    fail_reason: null,
    project_id: 1,
    venue_id: 1,
    floor_id: 1,
    timestamp: '2024-01-01T12:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('recordAccess', () => {
    it('应该成功记录通行日志', async () => {
      const recordData: CreateAccessRecordData = {
        userId: 1,
        passcodeId: 1,
        deviceId: 'device_001',
        deviceType: 'qr_scanner',
        direction: 'in',
        result: 'success',
        projectId: 1,
        venueId: 1,
        floorId: 1,
        timestamp: '2024-01-01T12:00:00Z',
      };

      vi.mocked(AccessRecordModel.create).mockResolvedValue(mockAccessRecord);

      const result = await AccessRecordService.recordAccess(recordData);

      expect(AccessRecordModel.create).toHaveBeenCalledWith({
        user_id: 1,
        passcode_id: 1,
        device_id: 'device_001',
        device_type: 'qr_scanner',
        direction: 'in',
        result: 'success',
        fail_reason: undefined,
        project_id: 1,
        venue_id: 1,
        floor_id: 1,
        timestamp: '2024-01-01T12:00:00Z',
      });
      expect(result).toEqual(mockAccessRecord);
    });

    it('应该记录失败的通行尝试', async () => {
      const failedRecordData: CreateAccessRecordData = {
        userId: 0,
        deviceId: 'device_001',
        direction: 'in',
        result: 'failed',
        failReason: '通行码无效',
        timestamp: '2024-01-01T12:00:00Z',
      };

      const failedRecord = {
        ...mockAccessRecord,
        user_id: 0,
        result: 'failed' as const,
        fail_reason: '通行码无效',
      };

      vi.mocked(AccessRecordModel.create).mockResolvedValue(failedRecord);

      const result = await AccessRecordService.recordAccess(failedRecordData);

      expect(AccessRecordModel.create).toHaveBeenCalledWith({
        user_id: 0,
        passcode_id: undefined,
        device_id: 'device_001',
        device_type: undefined,
        direction: 'in',
        result: 'failed',
        fail_reason: '通行码无效',
        project_id: undefined,
        venue_id: undefined,
        floor_id: undefined,
        timestamp: '2024-01-01T12:00:00Z',
      });
      expect(result).toEqual(failedRecord);
    });

    it('应该处理数据验证错误', async () => {
      const invalidData = {
        userId: 0,
        deviceId: '',
        direction: 'invalid' as any,
        result: 'success' as const,
        timestamp: '2024-01-01T12:00:00Z',
      };

      vi.mocked(AccessRecordModel.create).mockRejectedValue(new Error('数据验证失败'));

      await expect(AccessRecordService.recordAccess(invalidData))
        .rejects.toThrow('数据验证失败');
    });
  });

  describe('getAccessRecords', () => {
    it('应该返回分页的通行记录', async () => {
      const mockPaginatedResult = {
        data: [mockAccessRecord],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      vi.mocked(AccessRecordModel.findAll).mockResolvedValue(mockPaginatedResult);

      const query = {
        page: 1,
        limit: 10,
        userId: 1,
      };

      const result = await AccessRecordService.getAccessRecords(query);

      expect(AccessRecordModel.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('应该支持复杂的查询条件', async () => {
      const complexQuery = {
        page: 2,
        limit: 20,
        userId: 1,
        deviceId: 'device_001',
        result: 'success' as const,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        sortBy: 'timestamp',
        sortOrder: 'desc' as const,
      };

      const mockResult = {
        data: [mockAccessRecord],
        pagination: {
          page: 2,
          limit: 20,
          total: 25,
          totalPages: 2,
        },
      };

      vi.mocked(AccessRecordModel.findAll).mockResolvedValue(mockResult);

      const result = await AccessRecordService.getAccessRecords(complexQuery);

      expect(AccessRecordModel.findAll).toHaveBeenCalledWith(complexQuery);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getUserAccessRecords', () => {
    it('应该返回指定用户的通行记录', async () => {
      const mockResult = {
        data: [mockAccessRecord],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      vi.mocked(AccessRecordModel.findAll).mockResolvedValue(mockResult);

      const result = await AccessRecordService.getUserAccessRecords(1, { page: 1, limit: 10 });

      expect(AccessRecordModel.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        userId: 1,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('getDeviceAccessRecords', () => {
    it('应该返回指定设备的通行记录', async () => {
      const mockResult = {
        data: [mockAccessRecord],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      vi.mocked(AccessRecordModel.findAll).mockResolvedValue(mockResult);

      const result = await AccessRecordService.getDeviceAccessRecords('device_001', { page: 1, limit: 10 });

      expect(AccessRecordModel.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        deviceId: 'device_001',
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('getAccessStats', () => {
    it('应该返回通行统计信息', async () => {
      vi.mocked(AccessRecordModel.countByDateRange)
        .mockResolvedValueOnce(100) // 总数
        .mockResolvedValueOnce(85)  // 成功数
        .mockResolvedValueOnce(15); // 失败数

      const query = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        merchantId: 1,
      };

      const result = await AccessRecordService.getAccessStats(query);

      expect(result).toEqual({
        total: 100,
        success: 85,
        failed: 15,
        successRate: 85,
        byHour: [],
        byDevice: [],
        byUserType: [],
        recentActivity: [],
        period: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        },
      });

      // 验证调用参数
      expect(AccessRecordModel.countByDateRange).toHaveBeenCalledTimes(3);
    });

    it('应该处理默认日期范围', async () => {
      vi.mocked(AccessRecordModel.countByDateRange)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(45)
        .mockResolvedValueOnce(5);

      const result = await AccessRecordService.getAccessStats({});

      expect(result.total).toBe(50);
      expect(result.success).toBe(45);
      expect(result.failed).toBe(5);
      expect(result.successRate).toBe(90);
    });

    it('应该处理零除法情况', async () => {
      vi.mocked(AccessRecordModel.countByDateRange)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await AccessRecordService.getAccessStats({});

      expect(result.successRate).toBe(0);
    });
  });

  describe('getRealtimeStatus', () => {
    it('应该返回设备实时状态', async () => {
      vi.mocked(AccessRecordModel.getTodayCount).mockResolvedValue(25);
      vi.mocked(AccessRecordModel.getLatestByDeviceId).mockResolvedValue([
        { ...mockAccessRecord, timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString() }
      ]);

      const result = await AccessRecordService.getRealtimeStatus('device_001');

      expect(result).toEqual({
        deviceId: 'device_001',
        isOnline: true,
        todayCount: 25,
        currentHourCount: expect.any(Number),
        lastActivity: expect.any(String),
        status: 'active',
      });
    });

    it('应该检测离线设备', async () => {
      vi.mocked(AccessRecordModel.getTodayCount).mockResolvedValue(0);
      vi.mocked(AccessRecordModel.getLatestByDeviceId).mockResolvedValue([
        { ...mockAccessRecord, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() }
      ]);

      const result = await AccessRecordService.getRealtimeStatus('device_002');

      expect(result.isOnline).toBe(false);
      expect(result.status).toBe('offline');
    });

    it('应该处理无记录的设备', async () => {
      vi.mocked(AccessRecordModel.getTodayCount).mockResolvedValue(0);
      vi.mocked(AccessRecordModel.getLatestByDeviceId).mockResolvedValue([]);

      const result = await AccessRecordService.getRealtimeStatus('new_device');

      expect(result.isOnline).toBe(false);
      expect(result.lastActivity).toBeNull();
      expect(result.status).toBe('unknown');
    });
  });

  describe('批量操作测试', () => {
    it('应该支持批量记录通行日志', async () => {
      const batchData: CreateAccessRecordData[] = [
        {
          userId: 1,
          deviceId: 'device_001',
          direction: 'in',
          result: 'success',
          timestamp: '2024-01-01T12:00:00Z',
        },
        {
          userId: 2,
          deviceId: 'device_001',
          direction: 'in',
          result: 'success',
          timestamp: '2024-01-01T12:01:00Z',
        },
      ];

      const mockResults = [
        { ...mockAccessRecord, id: 1, user_id: 1 },
        { ...mockAccessRecord, id: 2, user_id: 2 },
      ];

      vi.mocked(AccessRecordModel.batchCreate).mockResolvedValue(mockResults);

      const result = await AccessRecordService.batchRecordAccess(batchData);

      expect(AccessRecordModel.batchCreate).toHaveBeenCalledWith([
        {
          user_id: 1,
          passcode_id: undefined,
          device_id: 'device_001',
          device_type: undefined,
          direction: 'in',
          result: 'success',
          fail_reason: undefined,
          project_id: undefined,
          venue_id: undefined,
          floor_id: undefined,
          timestamp: '2024-01-01T12:00:00Z',
        },
        {
          user_id: 2,
          passcode_id: undefined,
          device_id: 'device_001',
          device_type: undefined,
          direction: 'in',
          result: 'success',
          fail_reason: undefined,
          project_id: undefined,
          venue_id: undefined,
          floor_id: undefined,
          timestamp: '2024-01-01T12:01:00Z',
        },
      ]);
      expect(result).toEqual(mockResults);
    });
  });

  describe('性能和边界条件测试', () => {
    it('应该处理大量并发记录请求', async () => {
      const concurrentCount = 100;
      const promises = Array.from({ length: concurrentCount }, (_, i) => ({
        userId: i + 1,
        deviceId: 'device_001',
        direction: 'in' as const,
        result: 'success' as const,
        timestamp: new Date().toISOString(),
      }));

      vi.mocked(AccessRecordModel.create).mockResolvedValue(mockAccessRecord);

      const results = await Promise.all(
        promises.map(data => AccessRecordService.recordAccess(data))
      );

      expect(results).toHaveLength(concurrentCount);
      expect(AccessRecordModel.create).toHaveBeenCalledTimes(concurrentCount);
    });

    it('应该处理极端的日期范围查询', async () => {
      const extremeQuery = {
        startDate: '1970-01-01T00:00:00Z',
        endDate: '2099-12-31T23:59:59Z',
      };

      vi.mocked(AccessRecordModel.countByDateRange)
        .mockResolvedValueOnce(1000000)
        .mockResolvedValueOnce(999000)
        .mockResolvedValueOnce(1000);

      const result = await AccessRecordService.getAccessStats(extremeQuery);

      expect(result.total).toBe(1000000);
      expect(result.successRate).toBe(99.9);
    });

    it('应该处理空的查询结果', async () => {
      const emptyResult = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };

      vi.mocked(AccessRecordModel.findAll).mockResolvedValue(emptyResult);

      const result = await AccessRecordService.getAccessRecords({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('数据完整性测试', () => {
    it('应该验证必需字段', async () => {
      const incompleteData = {
        // 缺少 userId
        deviceId: 'device_001',
        direction: 'in' as const,
        result: 'success' as const,
        timestamp: '2024-01-01T12:00:00Z',
      };

      vi.mocked(AccessRecordModel.create).mockRejectedValue(new Error('用户ID不能为空'));

      await expect(AccessRecordService.recordAccess(incompleteData as any))
        .rejects.toThrow('用户ID不能为空');
    });

    it('应该验证枚举值', async () => {
      const invalidData = {
        userId: 1,
        deviceId: 'device_001',
        direction: 'invalid_direction' as any,
        result: 'success' as const,
        timestamp: '2024-01-01T12:00:00Z',
      };

      vi.mocked(AccessRecordModel.create).mockRejectedValue(new Error('通行方向无效'));

      await expect(AccessRecordService.recordAccess(invalidData))
        .rejects.toThrow('通行方向无效');
    });

    it('应该处理时间戳格式错误', async () => {
      const invalidTimeData = {
        userId: 1,
        deviceId: 'device_001',
        direction: 'in' as const,
        result: 'success' as const,
        timestamp: 'invalid_timestamp',
      };

      vi.mocked(AccessRecordModel.create).mockRejectedValue(new Error('时间戳格式无效'));

      await expect(AccessRecordService.recordAccess(invalidTimeData))
        .rejects.toThrow('时间戳格式无效');
    });
  });

  describe('清理和维护功能', () => {
    it('应该支持清理旧记录', async () => {
      vi.mocked(AccessRecordModel.cleanup).mockResolvedValue(1000);

      const result = await AccessRecordService.cleanupOldRecords(90);

      expect(AccessRecordModel.cleanup).toHaveBeenCalledWith(90);
      expect(result).toBe(1000);
    });

    it('应该使用默认清理天数', async () => {
      vi.mocked(AccessRecordModel.cleanup).mockResolvedValue(500);

      const result = await AccessRecordService.cleanupOldRecords();

      expect(AccessRecordModel.cleanup).toHaveBeenCalledWith(90); // 默认90天
      expect(result).toBe(500);
    });
  });

  describe('错误处理测试', () => {
    it('应该处理数据库连接错误', async () => {
      vi.mocked(AccessRecordModel.create).mockRejectedValue(new Error('数据库连接失败'));

      await expect(AccessRecordService.recordAccess({
        userId: 1,
        deviceId: 'device_001',
        direction: 'in',
        result: 'success',
        timestamp: '2024-01-01T12:00:00Z',
      })).rejects.toThrow('数据库连接失败');
    });

    it('应该处理查询超时', async () => {
      vi.mocked(AccessRecordModel.findAll).mockRejectedValue(new Error('查询超时'));

      await expect(AccessRecordService.getAccessRecords({ page: 1, limit: 10 }))
        .rejects.toThrow('查询超时');
    });
  });
});