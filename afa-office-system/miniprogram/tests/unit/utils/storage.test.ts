// 本地存储工具函数单元测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetMocks } from '../../setup';
import { StorageUtils } from '../../../utils/storage';

describe('本地存储工具函数测试', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('set 方法', () => {
    it('应该成功设置存储数据', () => {
      const result = StorageUtils.set('test-key', { name: '测试' });
      
      expect(result).toBe(true);
      expect(wx.setStorageSync).toHaveBeenCalledWith('test-key', '{"name":"测试"}');
    });

    it('应该处理不同类型的数据', () => {
      const testCases = [
        { key: 'string', value: 'hello' },
        { key: 'number', value: 123 },
        { key: 'boolean', value: true },
        { key: 'array', value: [1, 2, 3] },
        { key: 'object', value: { a: 1, b: 2 } },
        { key: 'null', value: null }
      ];

      testCases.forEach(({ key, value }) => {
        const result = StorageUtils.set(key, value);
        expect(result).toBe(true);
        expect(wx.setStorageSync).toHaveBeenCalledWith(key, JSON.stringify(value));
      });
    });

    it('应该处理无效的键', () => {
      expect(StorageUtils.set('', 'value')).toBe(false);
      expect(StorageUtils.set(null as any, 'value')).toBe(false);
      expect(StorageUtils.set(undefined as any, 'value')).toBe(false);
      expect(StorageUtils.set(123 as any, 'value')).toBe(false);
    });

    it('应该处理存储异常', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      global.wx.setStorageSync = vi.fn().mockImplementation(() => {
        throw new Error('存储失败');
      });

      const result = StorageUtils.set('test-key', 'value');
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('存储数据失败:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    it('应该处理循环引用对象', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = StorageUtils.set('circular', obj);
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('get 方法', () => {
    it('应该成功获取存储数据', () => {
      global.wx.getStorageSync = vi.fn().mockReturnValue('{"name":"测试"}');
      
      const result = StorageUtils.get('test-key');
      
      expect(result).toEqual({ name: '测试' });
      expect(wx.getStorageSync).toHaveBeenCalledWith('test-key');
    });

    it('应该返回默认值当数据不存在时', () => {
      global.wx.getStorageSync = vi.fn().mockReturnValue('');
      
      const result = StorageUtils.get('non-existent', 'default');
      
      expect(result).toBe('default');
    });

    it('应该处理不同类型的数据', () => {
      const testCases = [
        { stored: '"hello"', expected: 'hello' },
        { stored: '123', expected: 123 },
        { stored: 'true', expected: true },
        { stored: '[1,2,3]', expected: [1, 2, 3] },
        { stored: '{"a":1,"b":2}', expected: { a: 1, b: 2 } },
        { stored: 'null', expected: null }
      ];

      testCases.forEach(({ stored, expected }) => {
        global.wx.getStorageSync = vi.fn().mockReturnValue(stored);
        const result = StorageUtils.get('test-key');
        expect(result).toEqual(expected);
      });
    });

    it('应该处理无效的键', () => {
      expect(StorageUtils.get('')).toBeNull();
      expect(StorageUtils.get(null as any)).toBeNull();
      expect(StorageUtils.get(undefined as any)).toBeNull();
      expect(StorageUtils.get(123 as any)).toBeNull();
    });

    it('应该处理JSON解析异常', () => {
      global.wx.getStorageSync = vi.fn().mockReturnValue('invalid-json');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = StorageUtils.get('test-key', 'default');
      
      expect(result).toBe('default');
      expect(consoleErrorSpy).toHaveBeenCalledWith('获取存储数据失败:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    it('应该处理微信API异常', () => {
      global.wx.getStorageSync = vi.fn().mockImplementation(() => {
        throw new Error('获取失败');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = StorageUtils.get('test-key', 'default');
      
      expect(result).toBe('default');
      expect(consoleErrorSpy).toHaveBeenCalledWith('获取存储数据失败:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('remove 方法', () => {
    it('应该成功删除存储数据', () => {
      const result = StorageUtils.remove('test-key');
      
      expect(result).toBe(true);
      expect(wx.removeStorageSync).toHaveBeenCalledWith('test-key');
    });

    it('应该处理无效的键', () => {
      expect(StorageUtils.remove('')).toBe(false);
      expect(StorageUtils.remove(null as any)).toBe(false);
      expect(StorageUtils.remove(undefined as any)).toBe(false);
      expect(StorageUtils.remove(123 as any)).toBe(false);
    });

    it('应该处理删除异常', () => {
      global.wx.removeStorageSync = vi.fn().mockImplementation(() => {
        throw new Error('删除失败');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = StorageUtils.remove('test-key');
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('删除存储数据失败:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('clear 方法', () => {
    it('应该成功清空所有存储数据', () => {
      const result = StorageUtils.clear();
      
      expect(result).toBe(true);
      expect(wx.clearStorageSync).toHaveBeenCalled();
    });

    it('应该处理清空异常', () => {
      global.wx.clearStorageSync = vi.fn().mockImplementation(() => {
        throw new Error('清空失败');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = StorageUtils.clear();
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('清空存储数据失败:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('has 方法', () => {
    it('应该正确检查键是否存在', () => {
      global.wx.getStorageSync = vi.fn().mockReturnValue('some-value');
      
      const result = StorageUtils.has('test-key');
      
      expect(result).toBe(true);
      expect(wx.getStorageSync).toHaveBeenCalledWith('test-key');
    });

    it('应该正确处理不存在的键', () => {
      const testCases = ['', null, undefined];
      
      testCases.forEach(value => {
        global.wx.getStorageSync = vi.fn().mockReturnValue(value);
        const result = StorageUtils.has('test-key');
        expect(result).toBe(false);
      });
    });

    it('应该处理无效的键', () => {
      expect(StorageUtils.has('')).toBe(false);
      expect(StorageUtils.has(null as any)).toBe(false);
      expect(StorageUtils.has(undefined as any)).toBe(false);
      expect(StorageUtils.has(123 as any)).toBe(false);
    });

    it('应该处理检查异常', () => {
      global.wx.getStorageSync = vi.fn().mockImplementation(() => {
        throw new Error('检查失败');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = StorageUtils.has('test-key');
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('检查存储键失败:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getInfo 方法', () => {
    it('应该成功获取存储信息', () => {
      const mockInfo = {
        keys: ['key1', 'key2'],
        currentSize: 100,
        limitSize: 10240
      };
      global.wx.getStorageInfoSync = vi.fn().mockReturnValue(mockInfo);
      
      const result = StorageUtils.getInfo();
      
      expect(result).toEqual(mockInfo);
      expect(wx.getStorageInfoSync).toHaveBeenCalled();
    });

    it('应该处理获取信息异常', () => {
      global.wx.getStorageInfoSync = vi.fn().mockImplementation(() => {
        throw new Error('获取信息失败');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = StorageUtils.getInfo();
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('获取存储信息失败:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('setWithExpire 方法', () => {
    it('应该成功设置带过期时间的数据', () => {
      const mockDate = new Date('2024-01-01T10:00:00.000Z');
      vi.setSystemTime(mockDate);
      
      // 确保 setStorageSync 不抛出异常
      global.wx.setStorageSync = vi.fn().mockImplementation(() => {});
      
      const result = StorageUtils.setWithExpire('test-key', 'value', 3600000); // 1小时
      
      expect(result).toBe(true);
      expect(wx.setStorageSync).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({
          value: 'value',
          expireTime: mockDate.getTime() + 3600000
        })
      );
      
      vi.useRealTimers();
    });

    it('应该处理设置异常', () => {
      global.wx.setStorageSync = vi.fn().mockImplementation(() => {
        throw new Error('设置失败');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = StorageUtils.setWithExpire('test-key', 'value', 3600000);
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('设置带过期时间的数据失败:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getWithExpire 方法', () => {
    it('应该成功获取未过期的数据', () => {
      const mockDate = new Date('2024-01-01T10:00:00.000Z');
      vi.setSystemTime(mockDate);
      
      const expireTime = mockDate.getTime() + 3600000; // 1小时后过期
      global.wx.getStorageSync = vi.fn().mockReturnValue(JSON.stringify({
        value: 'test-value',
        expireTime
      }));
      
      const result = StorageUtils.getWithExpire('test-key');
      
      expect(result).toBe('test-value');
      
      vi.useRealTimers();
    });

    it('应该删除并返回默认值当数据过期时', () => {
      const mockDate = new Date('2024-01-01T12:00:00.000Z'); // 2小时后
      vi.setSystemTime(mockDate);
      
      const expireTime = new Date('2024-01-01T10:00:00.000Z').getTime() + 3600000; // 1小时后过期
      global.wx.getStorageSync = vi.fn().mockReturnValue(JSON.stringify({
        value: 'test-value',
        expireTime
      }));
      
      const result = StorageUtils.getWithExpire('test-key', 'default');
      
      expect(result).toBe('default');
      expect(wx.removeStorageSync).toHaveBeenCalledWith('test-key');
      
      vi.useRealTimers();
    });

    it('应该处理无效数据格式', () => {
      global.wx.getStorageSync = vi.fn().mockReturnValue('invalid-data');
      
      const result = StorageUtils.getWithExpire('test-key', 'default');
      
      expect(result).toBe('default');
    });

    it('应该处理缺少过期时间的数据', () => {
      global.wx.getStorageSync = vi.fn().mockReturnValue(JSON.stringify({
        value: 'test-value'
        // 缺少 expireTime
      }));
      
      const result = StorageUtils.getWithExpire('test-key', 'default');
      
      expect(result).toBe('default');
    });

    it('应该处理获取异常', () => {
      global.wx.getStorageSync = vi.fn().mockImplementation(() => {
        throw new Error('获取失败');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = StorageUtils.getWithExpire('test-key', 'default');
      
      expect(result).toBe('default');
      expect(consoleErrorSpy).toHaveBeenCalledWith('获取带过期时间的数据失败:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('setBatch 方法', () => {
    it('应该成功批量设置数据', () => {
      // 确保 setStorageSync 不抛出异常
      global.wx.setStorageSync = vi.fn().mockImplementation(() => {});
      
      const data = {
        key1: 'value1',
        key2: 'value2',
        key3: { nested: 'value3' }
      };
      
      const result = StorageUtils.setBatch(data);
      
      expect(result).toBe(true);
      expect(wx.setStorageSync).toHaveBeenCalledTimes(3);
      expect(wx.setStorageSync).toHaveBeenCalledWith('key1', '"value1"');
      expect(wx.setStorageSync).toHaveBeenCalledWith('key2', '"value2"');
      expect(wx.setStorageSync).toHaveBeenCalledWith('key3', '{"nested":"value3"}');
    });

    it('应该处理部分设置失败', () => {
      global.wx.setStorageSync = vi.fn()
        .mockImplementationOnce(() => {}) // key1 成功
        .mockImplementationOnce(() => { throw new Error('失败'); }) // key2 失败
        .mockImplementationOnce(() => {}); // key3 成功
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const data = { key1: 'value1', key2: 'value2', key3: 'value3' };
      const result = StorageUtils.setBatch(data);
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('应该处理空对象', () => {
      const result = StorageUtils.setBatch({});
      
      expect(result).toBe(true);
      expect(wx.setStorageSync).not.toHaveBeenCalled();
    });

    it('应该处理批量设置异常', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = StorageUtils.setBatch(null as any);
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('批量设置数据失败:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getBatch 方法', () => {
    it('应该成功批量获取数据', () => {
      global.wx.getStorageSync = vi.fn()
        .mockReturnValueOnce('"value1"')
        .mockReturnValueOnce('"value2"')
        .mockReturnValueOnce('{"nested":"value3"}');
      
      const keys = ['key1', 'key2', 'key3'];
      const result = StorageUtils.getBatch(keys);
      
      expect(result).toEqual({
        key1: 'value1',
        key2: 'value2',
        key3: { nested: 'value3' }
      });
      expect(wx.getStorageSync).toHaveBeenCalledTimes(3);
    });

    it('应该处理空键数组', () => {
      const result = StorageUtils.getBatch([]);
      
      expect(result).toEqual({});
      expect(wx.getStorageSync).not.toHaveBeenCalled();
    });

    it('应该处理获取异常', () => {
      global.wx.getStorageSync = vi.fn().mockImplementation(() => {
        throw new Error('获取失败');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = StorageUtils.getBatch(['key1']);
      
      expect(result).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalledWith('获取存储数据失败:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getUsageRate 方法', () => {
    it('应该正确计算存储使用率', () => {
      global.wx.getStorageInfoSync = vi.fn().mockReturnValue({
        keys: ['key1', 'key2'],
        currentSize: 2048,
        limitSize: 10240
      });
      
      const result = StorageUtils.getUsageRate();
      
      expect(result).toBe(20); // (2048 / 10240) * 100
    });

    it('应该处理限制大小为0的情况', () => {
      global.wx.getStorageInfoSync = vi.fn().mockReturnValue({
        keys: [],
        currentSize: 0,
        limitSize: 0
      });
      
      const result = StorageUtils.getUsageRate();
      
      expect(result).toBe(0);
    });

    it('应该处理获取信息失败', () => {
      global.wx.getStorageInfoSync = vi.fn().mockImplementation(() => {
        throw new Error('获取信息失败');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = StorageUtils.getUsageRate();
      
      expect(result).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith('获取存储使用率失败:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    it('应该处理信息为null的情况', () => {
      // 模拟 getInfo 返回 null
      const originalGetInfo = StorageUtils.getInfo;
      StorageUtils.getInfo = vi.fn().mockReturnValue(null);
      
      const result = StorageUtils.getUsageRate();
      
      expect(result).toBe(0);
      
      // 恢复原方法
      StorageUtils.getInfo = originalGetInfo;
    });
  });

  describe('边界条件和异常处理', () => {
    it('应该处理极大的数据', () => {
      const largeData = 'x'.repeat(100000);
      const result = StorageUtils.set('large-key', largeData);
      
      expect(result).toBe(true);
      expect(wx.setStorageSync).toHaveBeenCalledWith('large-key', JSON.stringify(largeData));
    });

    it('应该处理特殊字符键名', () => {
      const specialKeys = ['key with spaces', 'key-with-dashes', 'key_with_underscores', '中文键名'];
      
      specialKeys.forEach(key => {
        const result = StorageUtils.set(key, 'value');
        expect(result).toBe(true);
      });
    });

    it('应该处理复杂嵌套对象', () => {
      const complexData = {
        level1: {
          level2: {
            level3: {
              array: [1, 2, { nested: true }],
              date: new Date().toISOString(),
              boolean: false,
              null: null
            }
          }
        }
      };
      
      const result = StorageUtils.set('complex', complexData);
      expect(result).toBe(true);
    });

    it('应该处理并发操作', () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve().then(() => StorageUtils.set(`key${i}`, `value${i}`))
        );
      }
      
      return Promise.all(promises).then(results => {
        expect(results.every(result => result === true)).toBe(true);
      });
    });

    it('应该处理存储容量限制', () => {
      // 模拟存储容量已满的情况
      global.wx.setStorageSync = vi.fn().mockImplementation(() => {
        throw new Error('exceed max storage size limit');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = StorageUtils.set('test-key', 'value');
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('存储数据失败:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });
});