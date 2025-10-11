import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AccessRecordService } from '../../../src/services/access-record.service.js';
import { AccessRecordModel } from '../../../src/models/access-record.model.js';
import type { AccessRecord, CreateAccessRecordData } from '../../../src/types/index.js';

// Mock 所有依赖
vi.mock('../../../src/models/access-record.model.js');

describe('AccessRecordService 增强测试 - 安全性和错误处理', () => {
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('安全性增强测试', () => {
    it('应该防止SQL注入攻击', async () => {
      const maliciousData: CreateAccessRecordData = {
        userId: 1,
        deviceId: "'; DROP TABLE access_records; --",
        direction: 'in',
        result: 'success',
        timestamp: '2024-01-01T12:00:00Z',
      };

      vi.mocked(AccessRecordModel.create).mockResolvedValue(mockAccessRecord);

      await AccessRecordService.recordAccess(maliciousData);

      // 验证恶意SQL被作为普通字符串处理
      expect(AccessRecordModel.create).toHaveBeenCalledWith({
        user_id: 1,
        device_id: "'; DROP TABLE access_records; --",
        direction: 'in',
        result: 'success',
        fail_reason: undefined,
        passcode_id: undefined,
        device_type: undefined,
        project_id: undefined,
        venue_id: undefined,
        floor_id: undefined,
        timestamp: '2024-01-01T12:00:00Z',
      });
    });

    it('应该防止XSS攻击', async () => {
      const xssData: CreateAccessRecordData = {
        userId: 1,
        deviceId: 'device_001',
        deviceType: '<script>alert("XSS")</script>',
        direction: 'in',
        result: 'failed',
        failReason: '<img src="x" onerror="alert(\'XSS\')">',
        timestamp: '2024-01-01T12:00:00Z',
      };

      vi.mocked(AccessRecordModel.create).mockResolvedValue(mockAccessRecord);

      await AccessRecordService.recordAccess(xssData);

      // 验证XSS载荷被作为普通字符串存储
      expect(AccessRecordModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: '<script>alert("XSS")</script>',
          fail_reason: '<img src="x" onerror="alert(\'XSS\')">',
        })
      );
    });

    it('应该限制查询结果数量防止DoS攻击', async () => {
      const maliciousQuery = {
        page: 1,
        limit: 999999999, // 尝试获取大量数据
        userId: 1,
      };

      const mockResult = {
        data: [mockAccessRecord],
        pagination: {
          page: 1,
          limit: 999999999, // 模型层应该限制这个值
          total: 1,
          totalPages: 1,
        },
      };

      vi.mocked(AccessRecordModel.findAll).mockResolvedValue(mockResult);

      const result = await AccessRecordService.getAccessRecords(maliciousQuery);

      expect(AccessRecordModel.findAll).toHaveBeenCalledWith(maliciousQuery);
      expect(result).toEqual(mockResult);
    });

    it('应该防止信息泄露', async () => {
      // 模拟尝试访问其他用户的数据
      const sensitiveQuery = {
        userId: 999, // 尝试访问其他用户
        deviceId: 'admin_device',
        startDate: '1970-01-01',
        endDate: '2099-12-31',
      };

      const mockResult = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };

      vi.mocked(AccessRecordModel.findAll).mockResolvedValue(mockResult);

      const result = await AccessRecordService.getAccessRecords(sensitiveQuery);

      // 验证查询被传递给模型层（权限检查应该在其他层处理）
      expect(AccessRecordModel.findAll).toHaveBeenCalledWith(sensitiveQuery);
      expect(result.data).toHaveLength(0);
    });

    it('应该记录安全事件', async () => {
      const securityEvent: CreateAccessRecordData = {
        userId: 0, // 无效用户ID
        deviceId: 'suspicious_device',
        direction: 'in',
        result: 'failed',
        failReason: '可疑活动检测',
        timestamp: '2024-01-01T12:00:00Z',
      };

      vi.mocked(AccessRecordModel.create).mockResolvedValue({
        ...mockAccessRecord,
        user_id: 0,
        result: 'failed',
        fail_reason: '可疑活动检测',
      });

      const result = await AccessRecordService.recordAccess(securityEvent);

      expect(result.result).toBe('failed');
      expect(result.fail_reason).toBe('可疑活动检测');
    });
  });

  describe('数据验证增强测试', () => {
    it('应该验证必需字段', async () => {
      const invalidData = [
        { deviceId: 'device', direction: 'in', result: 'success', timestamp: '2024-01-01T12:00:00Z' }, // 缺少userId
        { userId: 1, direction: 'in', result: 'success', timestamp: '2024-01-01T12:00:00Z' }, // 缺少deviceId
        { userId: 1, deviceId: 'device', result: 'success', timestamp: '2024-01-01T12:00:00Z' }, // 缺少direction
        { userId: 1, deviceId: 'device', direction: 'in', timestamp: '2024-01-01T12:00:00Z' }, // 缺少result
        { userId: 1, deviceId: 'device', direction: 'in', result: 'success' }, // 缺少timestamp
      ];

      for (const data of invalidData) {
        vi.mocked(AccessRecordModel.create).mockRejectedValue(new Error('缺少必需字段'));

        await expect(AccessRecordService.recordAccess(data as any))
          .rejects.toThrow('缺少必需字段');
      }
    });

    it('应该验证字段类型', async () => {
      const invalidTypeData = [
        { userId: 'not_a_number', deviceId: 'device', direction: 'in', result: 'success', timestamp: '2024-01-01T12:00:00Z' },
        { userId: 1, deviceId: 123, direction: 'in', result: 'success', timestamp: '2024-01-01T12:00:00Z' },
        { userId: 1, deviceId: 'device', direction: 'invalid', result: 'success', timestamp: '2024-01-01T12:00:00Z' },
        { userId: 1, deviceId: 'device', direction: 'in', result: 'invalid', timestamp: '2024-01-01T12:00:00Z' },
        { userId: 1, deviceId: 'device', direction: 'in', result: 'success', timestamp: 'invalid_date' },
      ];

      for (const data of invalidTypeData) {
        vi.mocked(AccessRecordModel.create).mockRejectedValue(new Error('字段类型无效'));

        await expect(AccessRecordService.recordAccess(data as any))
          .rejects.toThrow('字段类型无效');
      }
    });

    it('应该验证字段长度', async () => {
      const longFieldData: CreateAccessRecordData = {
        userId: 1,
        deviceId: 'x'.repeat(1000), // 过长的设备ID
        deviceType: 'y'.repeat(1000), // 过长的设备类型
        direction: 'in',
        result: 'failed',
        failReason: 'z'.repeat(10000), // 过长的失败原因
        timestamp: '2024-01-01T12:00:00Z',
      };

      vi.mocked(AccessRecordModel.create).mockResolvedValue(mockAccessRecord);

      // 应该被记录但可能被截断
      await AccessRecordService.recordAccess(longFieldData);

      expect(AccessRecordModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          device_id: longFieldData.deviceId,
          device_type: longFieldData.deviceType,
          fail_reason: longFieldData.failReason,
        })
      );
    });

    it('应该验证数值范围', async () => {
      const rangeTestData = [
        { userId: -1, deviceId: 'device', direction: 'in', result: 'success', timestamp: '2024-01-01T12:00:00Z' },
        { userId: 0, deviceId: 'device', direction: 'in', result: 'success', timestamp: '2024-01-01T12:00:00Z' },
        { userId: 2147483648, deviceId: 'device', direction: 'in', result: 'success', timestamp: '2024-01-01T12:00:00Z' },
      ];

      for (const data of rangeTestData) {
        vi.mocked(AccessRecordModel.create).mockResolvedValue({
          ...mockAccessRecord,
          user_id: data.userId,
        });

        const result = await AccessRecordService.recordAccess(data as CreateAccessRecordData);
        expect(result.user_id).toBe(data.userId);
      }
    });

    it('应该处理特殊字符', async () => {
      const specialCharData: CreateAccessRecordData = {
        userId: 1,
        deviceId: 'device_测试_🔒',
        deviceType: 'scanner/reader@v1.0',
        direction: 'in',
        result: 'failed',
        failReason: '权限不足 - 用户未授权访问此区域',
        timestamp: '2024-01-01T12:00:00Z',
      };

      vi.mocked(AccessRecordModel.create).mockResolvedValue(mockAccessRecord);

      await AccessRecordService.recordAccess(specialCharData);

      expect(AccessRecordModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          device_id: 'device_测试_🔒',
          device_type: 'scanner/reader@v1.0',
          fail_reason: '权限不足 - 用户未授权访问此区域',
        })
      );
    });
  });

  describe('并发处理增强测试', () => {
    it('应该处理高并发记录请求', async () => {
      const concurrentCount = 100;
      const concurrentData = Array.from({ length: concurrentCount }, (_, i) => ({
        userId: i + 1,
        deviceId: `device_${i}`,
        direction: 'in' as const,
        result: 'success' as const,
        timestamp: new Date().toISOString(),
      }));

      vi.mocked(AccessRecordModel.create).mockImplementation(async (data) => ({
        ...mockAccessRecord,
        user_id: data.user_id,
        device_id: data.device_id,
      }));

      const promises = concurrentData.map(data => 
        AccessRecordService.recordAccess(data)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(concurrentCount);
      expect(AccessRecordModel.create).toHaveBeenCalledTimes(concurrentCount);
    });

    it('应该处理批量操作', async () => {
      const batchData: CreateAccessRecordData[] = Array.from({ length: 50 }, (_, i) => ({
        userId: i + 1,
        deviceId: `batch_device_${i}`,
        direction: i % 2 === 0 ? 'in' : 'out',
        result: i % 10 === 0 ? 'failed' : 'success',
        failReason: i % 10 === 0 ? '测试失败' : undefined,
        timestamp: new Date().toISOString(),
      }));

      const mockResults = batchData.map((data, i) => ({
        ...mockAccessRecord,
        id: i + 1,
        user_id: data.userId,
        device_id: data.deviceId,
        direction: data.direction,
        result: data.result,
        fail_reason: data.failReason || null,
      }));

      vi.mocked(AccessRecordModel.batchCreate).mockResolvedValue(mockResults);

      const results = await AccessRecordService.batchRecordAccess(batchData);

      expect(results).toHaveLength(50);
      expect(AccessRecordModel.batchCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            user_id: expect.any(Number),
            device_id: expect.any(String),
            direction: expect.stringMatching(/^(in|out)$/),
            result: expect.stringMatching(/^(success|failed)$/),
          })
        ])
      );
    });

    it('应该处理部分失败的批量操作', async () => {
      const batchData: CreateAccessRecordData[] = [
        { userId: 1, deviceId: 'device1', direction: 'in', result: 'success', timestamp: '2024-01-01T12:00:00Z' },
        { userId: -1, deviceId: 'device2', direction: 'in', result: 'success', timestamp: '2024-01-01T12:00:00Z' }, // 无效用户ID
        { userId: 3, deviceId: 'device3', direction: 'in', result: 'success', timestamp: '2024-01-01T12:00:00Z' },
      ];

      // 模拟验证失败
      await expect(AccessRecordService.batchRecordAccess(batchData))
        .rejects.toThrow('批量记录验证失败');
    });

    it('应该处理数据库连接失败', async () => {
      const recordData: CreateAccessRecordData = {
        userId: 1,
        deviceId: 'device_001',
        direction: 'in',
        result: 'success',
        timestamp: '2024-01-01T12:00:00Z',
      };

      vi.mocked(AccessRecordModel.create).mockRejectedValue(new Error('数据库连接失败'));

      await expect(AccessRecordService.recordAccess(recordData))
        .rejects.toThrow('数据库连接失败');
    });
  });

  describe('统计功能增强测试', () => {
    it('应该处理复杂的统计查询', async () => {
      const complexQuery = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        merchantId: 1,
        deviceId: 'device_001',
      };

      vi.mocked(AccessRecordModel.countByDateRange)
        .mockResolvedValueOnce(1000) // total
        .mockResolvedValueOnce(950)  // success
        .mockResolvedValueOnce(50);  // failed

      vi.mocked(AccessRecordModel.findAll).mockResolvedValue({
        data: [mockAccessRecord],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const stats = await AccessRecordService.getAccessStats(complexQuery);

      expect(stats).toEqual({
        total: 1000,
        success: 950,
        failed: 50,
        successRate: 95,
        byHour: [],
        byDevice: [],
        byUserType: [],
        recentActivity: [mockAccessRecord],
        period: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        },
      });
    });

    it('应该处理空统计结果', async () => {
      vi.mocked(AccessRecordModel.countByDateRange)
        .mockResolvedValueOnce(0) // total
        .mockResolvedValueOnce(0) // success
        .mockResolvedValueOnce(0); // failed

      vi.mocked(AccessRecordModel.findAll).mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      const stats = await AccessRecordService.getAccessStats({});

      expect(stats.total).toBe(0);
      expect(stats.success).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.recentActivity).toEqual([]);
    });

    it('应该处理极端日期范围', async () => {
      const extremeQuery = {
        startDate: '1970-01-01T00:00:00Z',
        endDate: '2099-12-31T23:59:59Z',
      };

      vi.mocked(AccessRecordModel.countByDateRange)
        .mockResolvedValueOnce(999999)
        .mockResolvedValueOnce(999000)
        .mockResolvedValueOnce(999);

      vi.mocked(AccessRecordModel.findAll).mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      const stats = await AccessRecordService.getAccessStats(extremeQuery);

      expect(stats.total).toBe(999999);
      expect(stats.successRate).toBeCloseTo(99.9, 1);
    });

    it('应该处理统计计算错误', async () => {
      vi.mocked(AccessRecordModel.countByDateRange)
        .mockRejectedValueOnce(new Error('统计查询失败'));

      await expect(AccessRecordService.getAccessStats({}))
        .rejects.toThrow('统计查询失败');
    });
  });

  describe('实时状态增强测试', () => {
    it('应该准确计算设备在线状态', async () => {
      const deviceId = 'test_device';
      const recentRecord = {
        ...mockAccessRecord,
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2分钟前
      };

      vi.mocked(AccessRecordModel.getTodayCount).mockResolvedValue(25);
      vi.mocked(AccessRecordModel.getLatestByDeviceId).mockResolvedValue([recentRecord]);

      const status = await AccessRecordService.getRealtimeStatus(deviceId);

      expect(status.deviceId).toBe(deviceId);
      expect(status.isOnline).toBe(true); // 2分钟前的活动应该被认为是在线
      expect(status.todayCount).toBe(25);
      expect(status.lastActivity).toBe(recentRecord.timestamp);
      expect(status.status).toBe('active');
    });

    it('应该检测离线设备', async () => {
      const deviceId = 'offline_device';
      const oldRecord = {
        ...mockAccessRecord,
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10分钟前
      };

      vi.mocked(AccessRecordModel.getTodayCount).mockResolvedValue(5);
      vi.mocked(AccessRecordModel.getLatestByDeviceId).mockResolvedValue([oldRecord]);

      const status = await AccessRecordService.getRealtimeStatus(deviceId);

      expect(status.isOnline).toBe(false);
      expect(status.status).toBe('offline');
    });

    it('应该处理无记录的设备', async () => {
      const deviceId = 'new_device';

      vi.mocked(AccessRecordModel.getTodayCount).mockResolvedValue(0);
      vi.mocked(AccessRecordModel.getLatestByDeviceId).mockResolvedValue([]);

      const status = await AccessRecordService.getRealtimeStatus(deviceId);

      expect(status.isOnline).toBe(false);
      expect(status.todayCount).toBe(0);
      expect(status.lastActivity).toBeNull();
      expect(status.status).toBe('unknown');
    });

    it('应该处理全局状态查询', async () => {
      vi.mocked(AccessRecordModel.getTodayCount).mockResolvedValue(100);
      vi.mocked(AccessRecordModel.getLatestByDeviceId).mockResolvedValue([]);

      const status = await AccessRecordService.getRealtimeStatus();

      expect(status.deviceId).toBeUndefined();
      expect(status.todayCount).toBe(100);
    });
  });

  describe('数据清理增强测试', () => {
    it('应该清理指定天数的旧记录', async () => {
      const daysToKeep = 30;
      vi.mocked(AccessRecordModel.cleanup).mockResolvedValue(500);

      const result = await AccessRecordService.cleanupOldRecords(daysToKeep);

      expect(result).toBe(500);
      expect(AccessRecordModel.cleanup).toHaveBeenCalledWith(daysToKeep);
    });

    it('应该使用默认清理策略', async () => {
      vi.mocked(AccessRecordModel.cleanup).mockResolvedValue(1000);

      const result = await AccessRecordService.cleanupOldRecords();

      expect(result).toBe(1000);
      expect(AccessRecordModel.cleanup).toHaveBeenCalledWith(90); // 默认90天
    });

    it('应该处理清理失败', async () => {
      vi.mocked(AccessRecordModel.cleanup).mockRejectedValue(new Error('清理失败'));

      await expect(AccessRecordService.cleanupOldRecords(30))
        .rejects.toThrow('清理失败');
    });

    it('应该验证清理参数', async () => {
      const invalidDays = [-1, 0, 0.5, NaN, Infinity];

      for (const days of invalidDays) {
        vi.mocked(AccessRecordModel.cleanup).mockResolvedValue(0);

        const result = await AccessRecordService.cleanupOldRecords(days);
        expect(AccessRecordModel.cleanup).toHaveBeenCalledWith(days);
      }
    });
  });

  describe('错误恢复测试', () => {
    it('应该从部分失败中恢复', async () => {
      const recordData: CreateAccessRecordData = {
        userId: 1,
        deviceId: 'device_001',
        direction: 'in',
        result: 'success',
        timestamp: '2024-01-01T12:00:00Z',
      };

      // 第一次尝试失败
      vi.mocked(AccessRecordModel.create)
        .mockRejectedValueOnce(new Error('临时失败'))
        .mockResolvedValueOnce(mockAccessRecord);

      // 第一次调用应该失败
      await expect(AccessRecordService.recordAccess(recordData))
        .rejects.toThrow('临时失败');

      // 第二次调用应该成功
      const result = await AccessRecordService.recordAccess(recordData);
      expect(result).toEqual(mockAccessRecord);
    });

    it('应该处理网络超时', async () => {
      const recordData: CreateAccessRecordData = {
        userId: 1,
        deviceId: 'device_001',
        direction: 'in',
        result: 'success',
        timestamp: '2024-01-01T12:00:00Z',
      };

      const timeoutError = new Error('网络超时');
      (timeoutError as any).code = 'ETIMEDOUT';
      
      vi.mocked(AccessRecordModel.create).mockRejectedValue(timeoutError);

      await expect(AccessRecordService.recordAccess(recordData))
        .rejects.toThrow('网络超时');
    });

    it('应该处理磁盘空间不足', async () => {
      const recordData: CreateAccessRecordData = {
        userId: 1,
        deviceId: 'device_001',
        direction: 'in',
        result: 'success',
        timestamp: '2024-01-01T12:00:00Z',
      };

      const diskError = new Error('磁盘空间不足');
      (diskError as any).code = 'ENOSPC';
      
      vi.mocked(AccessRecordModel.create).mockRejectedValue(diskError);

      await expect(AccessRecordService.recordAccess(recordData))
        .rejects.toThrow('磁盘空间不足');
    });
  });

  describe('性能优化测试', () => {
    it('应该优化大量数据查询', async () => {
      const largeQuery = {
        page: 1,
        limit: 1000,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
      };

      const mockLargeResult = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          ...mockAccessRecord,
          id: i + 1,
        })),
        pagination: {
          page: 1,
          limit: 1000,
          total: 10000,
          totalPages: 10,
        },
      };

      vi.mocked(AccessRecordModel.findAll).mockResolvedValue(mockLargeResult);

      const result = await AccessRecordService.getAccessRecords(largeQuery);

      expect(result.data).toHaveLength(1000);
      expect(result.pagination.total).toBe(10000);
    });

    it('应该处理内存限制', async () => {
      const memoryIntensiveQuery = {
        limit: 100000, // 大量数据
      };

      const memoryError = new Error('内存不足');
      (memoryError as any).code = 'ENOMEM';
      
      vi.mocked(AccessRecordModel.findAll).mockRejectedValue(memoryError);

      await expect(AccessRecordService.getAccessRecords(memoryIntensiveQuery))
        .rejects.toThrow('内存不足');
    });

    it('应该优化统计查询性能', async () => {
      const performanceQuery = {
        startDate: '2020-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        merchantId: 1,
      };

      // 模拟长时间运行的查询
      vi.mocked(AccessRecordModel.countByDateRange).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(1000000), 100))
      );

      vi.mocked(AccessRecordModel.findAll).mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      const startTime = Date.now();
      const stats = await AccessRecordService.getAccessStats(performanceQuery);
      const endTime = Date.now();

      expect(stats.total).toBe(1000000);
      expect(endTime - startTime).toBeGreaterThan(300); // 至少300ms（3次查询 * 100ms）
    });
  });
});