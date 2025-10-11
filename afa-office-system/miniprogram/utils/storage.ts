// 本地存储工具函数
export class StorageUtils {
  /**
   * 设置存储数据
   * @param key 键
   * @param value 值
   */
  static set(key: string, value: any): boolean {
    try {
      if (!key || typeof key !== 'string') {
        throw new Error('无效的存储键');
      }

      const serializedValue = JSON.stringify(value);
      wx.setStorageSync(key, serializedValue);
      return true;
    } catch (error) {
      console.error('存储数据失败:', error);
      return false;
    }
  }

  /**
   * 获取存储数据
   * @param key 键
   * @param defaultValue 默认值
   */
  static get<T = any>(key: string, defaultValue?: T): T | null {
    try {
      if (!key || typeof key !== 'string') {
        return defaultValue || null;
      }

      const serializedValue = wx.getStorageSync(key);
      
      if (!serializedValue) {
        return defaultValue || null;
      }

      return JSON.parse(serializedValue);
    } catch (error) {
      console.error('获取存储数据失败:', error);
      return defaultValue || null;
    }
  }

  /**
   * 删除存储数据
   * @param key 键
   */
  static remove(key: string): boolean {
    try {
      if (!key || typeof key !== 'string') {
        return false;
      }

      wx.removeStorageSync(key);
      return true;
    } catch (error) {
      console.error('删除存储数据失败:', error);
      return false;
    }
  }

  /**
   * 清空所有存储数据
   */
  static clear(): boolean {
    try {
      wx.clearStorageSync();
      return true;
    } catch (error) {
      console.error('清空存储数据失败:', error);
      return false;
    }
  }

  /**
   * 检查键是否存在
   * @param key 键
   */
  static has(key: string): boolean {
    try {
      if (!key || typeof key !== 'string') {
        return false;
      }

      const value = wx.getStorageSync(key);
      return value !== '' && value !== null && value !== undefined;
    } catch (error) {
      console.error('检查存储键失败:', error);
      return false;
    }
  }

  /**
   * 获取存储信息
   */
  static getInfo(): { keys: string[]; currentSize: number; limitSize: number } | null {
    try {
      const info = wx.getStorageInfoSync();
      return {
        keys: info.keys,
        currentSize: info.currentSize,
        limitSize: info.limitSize
      };
    } catch (error) {
      console.error('获取存储信息失败:', error);
      return null;
    }
  }

  /**
   * 设置带过期时间的数据
   * @param key 键
   * @param value 值
   * @param expireTime 过期时间（毫秒）
   */
  static setWithExpire(key: string, value: any, expireTime: number): boolean {
    try {
      const data = {
        value,
        expireTime: Date.now() + expireTime
      };
      
      const serializedValue = JSON.stringify(data);
      wx.setStorageSync(key, serializedValue);
      return true;
    } catch (error) {
      console.error('设置带过期时间的数据失败:', error);
      return false;
    }
  }

  /**
   * 获取带过期时间的数据
   * @param key 键
   * @param defaultValue 默认值
   */
  static getWithExpire<T = any>(key: string, defaultValue?: T): T | null {
    try {
      const serializedValue = wx.getStorageSync(key);
      
      if (!serializedValue) {
        return defaultValue || null;
      }

      const data = JSON.parse(serializedValue);
      
      if (!data || typeof data !== 'object' || !data.expireTime) {
        return defaultValue || null;
      }

      if (Date.now() > data.expireTime) {
        this.remove(key);
        return defaultValue || null;
      }

      return data.value;
    } catch (error) {
      console.error('获取带过期时间的数据失败:', error);
      return defaultValue || null;
    }
  }

  /**
   * 批量设置数据
   * @param data 数据对象
   */
  static setBatch(data: Record<string, any>): boolean {
    try {
      Object.entries(data).forEach(([key, value]) => {
        const serializedValue = JSON.stringify(value);
        wx.setStorageSync(key, serializedValue);
      });
      
      return true;
    } catch (error) {
      console.error('批量设置数据失败:', error);
      return false;
    }
  }

  /**
   * 批量获取数据
   * @param keys 键数组
   */
  static getBatch(keys: string[]): Record<string, any> {
    try {
      const result: Record<string, any> = {};
      
      keys.forEach(key => {
        const value = this.get(key);
        if (value !== null) {
          result[key] = value;
        }
      });
      
      return result;
    } catch (error) {
      console.error('批量获取数据失败:', error);
      return {};
    }
  }

  /**
   * 获取存储使用率
   */
  static getUsageRate(): number {
    try {
      const info = this.getInfo();
      
      if (!info || info.limitSize === 0) {
        return 0;
      }
      
      return (info.currentSize / info.limitSize) * 100;
    } catch (error) {
      console.error('获取存储使用率失败:', error);
      return 0;
    }
  }
}