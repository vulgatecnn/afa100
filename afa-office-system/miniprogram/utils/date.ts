// 日期工具函数
export class DateUtils {
  /**
   * 格式化日期
   * @param date 日期对象或时间戳
   * @param format 格式字符串，如 'YYYY-MM-DD HH:mm:ss'
   */
  static format(date: Date | number | string, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
    // 处理空值
    if (date === null || date === undefined || date === '') {
      return '';
    }
    
    const d = new Date(date);
    
    if (isNaN(d.getTime())) {
      throw new Error('无效的日期');
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * 计算两个日期之间的差值
   * @param date1 开始日期
   * @param date2 结束日期
   * @param unit 单位：'days', 'hours', 'minutes', 'seconds'
   */
  static diff(date1: Date | string, date2: Date | string, unit: 'days' | 'hours' | 'minutes' | 'seconds' = 'days'): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      throw new Error('无效的日期');
    }

    const diffMs = Math.abs(d2.getTime() - d1.getTime());
    
    switch (unit) {
      case 'days':
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
      case 'hours':
        return Math.floor(diffMs / (1000 * 60 * 60));
      case 'minutes':
        return Math.floor(diffMs / (1000 * 60));
      case 'seconds':
        return Math.floor(diffMs / 1000);
      default:
        return diffMs;
    }
  }

  /**
   * 检查日期是否过期
   * @param date 要检查的日期
   * @param now 当前时间，默认为现在
   */
  static isExpired(date: Date | string, now: Date = new Date()): boolean {
    const targetDate = new Date(date);
    
    if (isNaN(targetDate.getTime())) {
      throw new Error('无效的日期');
    }

    return targetDate.getTime() < now.getTime();
  }

  /**
   * 获取相对时间描述
   * @param date 目标日期
   * @param now 当前时间，默认为现在
   */
  static getRelativeTime(date: Date | string, now: Date = new Date()): string {
    const targetDate = new Date(date);
    
    if (isNaN(targetDate.getTime())) {
      throw new Error('无效的日期');
    }

    const diffMs = now.getTime() - targetDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return '刚刚';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else if (diffDays < 30) {
      return `${diffDays}天前`;
    } else {
      return this.format(targetDate, 'YYYY-MM-DD');
    }
  }

  /**
   * 添加时间
   * @param date 基础日期
   * @param amount 数量
   * @param unit 单位
   */
  static add(date: Date | string, amount: number, unit: 'days' | 'hours' | 'minutes' | 'seconds'): Date {
    const d = new Date(date);
    
    if (isNaN(d.getTime())) {
      throw new Error('无效的日期');
    }

    switch (unit) {
      case 'days':
        d.setDate(d.getDate() + amount);
        break;
      case 'hours':
        d.setHours(d.getHours() + amount);
        break;
      case 'minutes':
        d.setMinutes(d.getMinutes() + amount);
        break;
      case 'seconds':
        d.setSeconds(d.getSeconds() + amount);
        break;
    }

    return d;
  }
}
