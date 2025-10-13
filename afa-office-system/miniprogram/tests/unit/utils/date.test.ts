// 日期工具函数单元测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DateUtils } from '../../../utils/date';

describe('日期工具函数测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('format 方法', () => {
    it('应该正确格式化日期对象', () => {
      const date = new Date('2024-01-15 10:30:45');
      const result = DateUtils.format(date, 'YYYY-MM-DD HH:mm:ss');
      
      expect(result).toBe('2024-01-15 10:30:45');
    });

    it('应该正确格式化时间戳', () => {
      const timestamp = new Date('2024-01-15 10:30:45').getTime();
      const result = DateUtils.format(timestamp, 'YYYY-MM-DD');
      
      expect(result).toBe('2024-01-15');
    });

    it('应该正确格式化日期字符串', () => {
      const dateStr = '2024-01-15T10:30:45.000Z';
      const result = DateUtils.format(dateStr, 'MM/DD/YYYY');
      
      expect(result).toBe('01/15/2024');
    });

    it('应该使用默认格式', () => {
      const date = new Date('2024-01-15 10:30:45');
      const result = DateUtils.format(date);
      
      expect(result).toBe('2024-01-15 10:30:45');
    });

    it('应该处理无效日期', () => {
      expect(() => DateUtils.format('invalid-date')).toThrow('无效的日期');
      expect(() => DateUtils.format(NaN)).toThrow('无效的日期');
    });

    it('应该正确处理单位数的月份和日期', () => {
      const date = new Date('2024-01-05 09:05:05');
      const result = DateUtils.format(date, 'YYYY-MM-DD HH:mm:ss');
      
      expect(result).toBe('2024-01-05 09:05:05');
    });
  });

  describe('diff 方法', () => {
    it('应该正确计算天数差', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-05');
      const result = DateUtils.diff(date1, date2, 'days');
      
      expect(result).toBe(4);
    });

    it('应该正确计算小时差', () => {
      const date1 = new Date('2024-01-01 10:00:00');
      const date2 = new Date('2024-01-01 15:00:00');
      const result = DateUtils.diff(date1, date2, 'hours');
      
      expect(result).toBe(5);
    });

    it('应该正确计算分钟差', () => {
      const date1 = new Date('2024-01-01 10:00:00');
      const date2 = new Date('2024-01-01 10:30:00');
      const result = DateUtils.diff(date1, date2, 'minutes');
      
      expect(result).toBe(30);
    });

    it('应该正确计算秒数差', () => {
      const date1 = new Date('2024-01-01 10:00:00');
      const date2 = new Date('2024-01-01 10:00:45');
      const result = DateUtils.diff(date1, date2, 'seconds');
      
      expect(result).toBe(45);
    });

    it('应该使用默认单位（天）', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-03');
      const result = DateUtils.diff(date1, date2);
      
      expect(result).toBe(2);
    });

    it('应该处理日期顺序', () => {
      const date1 = new Date('2024-01-05');
      const date2 = new Date('2024-01-01');
      const result = DateUtils.diff(date1, date2, 'days');
      
      expect(result).toBe(4);
    });

    it('应该处理无效日期', () => {
      expect(() => DateUtils.diff('invalid-date', '2024-01-01')).toThrow('无效的日期');
      expect(() => DateUtils.diff('2024-01-01', 'invalid-date')).toThrow('无效的日期');
    });

    it('应该处理字符串日期', () => {
      const result = DateUtils.diff('2024-01-01', '2024-01-03', 'days');
      expect(result).toBe(2);
    });
  });

  describe('isExpired 方法', () => {
    it('应该正确判断过期日期', () => {
      const pastDate = new Date('2020-01-01');
      const now = new Date('2024-01-01');
      const result = DateUtils.isExpired(pastDate, now);
      
      expect(result).toBe(true);
    });

    it('应该正确判断未过期日期', () => {
      const futureDate = new Date('2025-01-01');
      const now = new Date('2024-01-01');
      const result = DateUtils.isExpired(futureDate, now);
      
      expect(result).toBe(false);
    });

    it('应该使用当前时间作为默认值', () => {
      const pastDate = new Date('2020-01-01');
      const result = DateUtils.isExpired(pastDate);
      
      expect(result).toBe(true);
    });

    it('应该处理字符串日期', () => {
      const result = DateUtils.isExpired('2020-01-01', new Date('2024-01-01'));
      expect(result).toBe(true);
    });

    it('应该处理无效日期', () => {
      expect(() => DateUtils.isExpired('invalid-date')).toThrow('无效的日期');
    });

    it('应该处理相同时间', () => {
      const date = new Date('2024-01-01 10:00:00');
      const result = DateUtils.isExpired(date, date);
      
      expect(result).toBe(false);
    });
  });

  describe('getRelativeTime 方法', () => {
    it('应该返回"刚刚"对于30秒内', () => {
      const now = new Date('2024-01-01 10:00:30');
      const date = new Date('2024-01-01 10:00:00');
      const result = DateUtils.getRelativeTime(date, now);
      
      expect(result).toBe('刚刚');
    });

    it('应该返回分钟数对于1小时内', () => {
      const now = new Date('2024-01-01 10:30:00');
      const date = new Date('2024-01-01 10:00:00');
      const result = DateUtils.getRelativeTime(date, now);
      
      expect(result).toBe('30分钟前');
    });

    it('应该返回小时数对于24小时内', () => {
      const now = new Date('2024-01-01 15:00:00');
      const date = new Date('2024-01-01 10:00:00');
      const result = DateUtils.getRelativeTime(date, now);
      
      expect(result).toBe('5小时前');
    });

    it('应该返回天数对于30天内', () => {
      const now = new Date('2024-01-05 10:00:00');
      const date = new Date('2024-01-01 10:00:00');
      const result = DateUtils.getRelativeTime(date, now);
      
      expect(result).toBe('4天前');
    });

    it('应该返回格式化日期对于30天以上', () => {
      const now = new Date('2024-02-15 10:00:00');
      const date = new Date('2024-01-01 10:00:00');
      const result = DateUtils.getRelativeTime(date, now);
      
      expect(result).toBe('2024-01-01');
    });

    it('应该使用当前时间作为默认值', () => {
      const pastDate = new Date(Date.now() - 5 * 60 * 1000); // 5分钟前
      const result = DateUtils.getRelativeTime(pastDate);
      
      expect(result).toBe('5分钟前');
    });

    it('应该处理字符串日期', () => {
      const now = new Date('2024-01-01 10:30:00');
      const result = DateUtils.getRelativeTime('2024-01-01 10:00:00', now);
      
      expect(result).toBe('30分钟前');
    });

    it('应该处理无效日期', () => {
      expect(() => DateUtils.getRelativeTime('invalid-date')).toThrow('无效的日期');
    });
  });

  describe('add 方法', () => {
    it('应该正确添加天数', () => {
      const date = new Date('2024-01-01');
      const result = DateUtils.add(date, 5, 'days');
      
      expect(result.getDate()).toBe(6);
      expect(result.getMonth()).toBe(0); // 0-based
      expect(result.getFullYear()).toBe(2024);
    });

    it('应该正确添加小时', () => {
      const date = new Date('2024-01-01 10:00:00');
      const result = DateUtils.add(date, 5, 'hours');
      
      expect(result.getHours()).toBe(15);
    });

    it('应该正确添加分钟', () => {
      const date = new Date('2024-01-01 10:00:00');
      const result = DateUtils.add(date, 30, 'minutes');
      
      expect(result.getMinutes()).toBe(30);
    });

    it('应该正确添加秒数', () => {
      const date = new Date('2024-01-01 10:00:00');
      const result = DateUtils.add(date, 45, 'seconds');
      
      expect(result.getSeconds()).toBe(45);
    });

    it('应该处理负数（减法）', () => {
      const date = new Date('2024-01-05');
      const result = DateUtils.add(date, -2, 'days');
      
      expect(result.getDate()).toBe(3);
    });

    it('应该处理跨月份', () => {
      const date = new Date('2024-01-30');
      const result = DateUtils.add(date, 5, 'days');
      
      expect(result.getMonth()).toBe(1); // February (0-based)
      expect(result.getDate()).toBe(4);
    });

    it('应该处理字符串日期', () => {
      const result = DateUtils.add('2024-01-01', 1, 'days');
      
      expect(result.getDate()).toBe(2);
    });

    it('应该处理无效日期', () => {
      expect(() => DateUtils.add('invalid-date', 1, 'days')).toThrow('无效的日期');
    });

    it('应该不修改原始日期对象', () => {
      const originalDate = new Date('2024-01-01');
      const originalTime = originalDate.getTime();
      
      DateUtils.add(originalDate, 1, 'days');
      
      expect(originalDate.getTime()).toBe(originalTime);
    });
  });

  describe('边界条件和异常处理', () => {
    it('应该处理闰年', () => {
      const date = new Date('2024-02-28'); // 2024是闰年
      const result = DateUtils.add(date, 1, 'days');
      
      expect(result.getDate()).toBe(29);
      expect(result.getMonth()).toBe(1); // February
    });

    it('应该处理时区变化', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const formatted = DateUtils.format(date, 'YYYY-MM-DD');
      
      // 结果应该是一致的，不受时区影响
      expect(formatted).toMatch(/2024-01-01|2023-12-31/);
    });

    it('应该处理极值日期', () => {
      const minDate = new Date(0); // 1970-01-01
      const maxDate = new Date(8640000000000000); // 最大日期
      
      expect(() => DateUtils.format(minDate)).not.toThrow();
      expect(() => DateUtils.format(maxDate)).not.toThrow();
    });

    it('应该处理不同的日期格式', () => {
      const formats = [
        'YYYY-MM-DD',
        'MM/DD/YYYY',
        'DD-MM-YYYY',
        'HH:mm:ss',
        'YYYY年MM月DD日'
      ];
      
      const date = new Date('2024-01-15 10:30:45');
      
      formats.forEach(format => {
        expect(() => DateUtils.format(date, format)).not.toThrow();
      });
    });

    it('应该处理空值和undefined', () => {
      expect(() => DateUtils.format(null as any)).not.toThrow();
      expect(() => DateUtils.format(undefined as any)).not.toThrow();
      expect(DateUtils.format(null as any)).toBe('');
      expect(DateUtils.format(undefined as any)).toBe('');
    });
  });
});