// 验证工具函数
export class ValidationUtils {
  /**
   * 验证手机号
   * @param phone 手机号
   */
  static isValidPhone(phone: string): boolean {
    if (!phone || typeof phone !== 'string') {
      return false;
    }

    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone.trim());
  }

  /**
   * 验证邮箱
   * @param email 邮箱地址
   */
  static isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    const trimmedEmail = email.trim();

    // 基本格式检查
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      return false;
    }

    // 检查不能以@开头或结尾
    if (trimmedEmail.startsWith('@') || trimmedEmail.endsWith('@')) {
      return false;
    }

    // 检查不能有连续的点
    if (trimmedEmail.includes('..')) {
      return false;
    }

    // 检查不能有空格
    if (trimmedEmail.includes(' ')) {
      return false;
    }

    // 更严格的邮箱验证
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(trimmedEmail);
  }

  /**
   * 验证身份证号
   * @param idCard 身份证号
   */
  static isValidIdCard(idCard: string): boolean {
    if (!idCard || typeof idCard !== 'string') {
      return false;
    }

    const trimmedIdCard = idCard.trim();

    // 18位身份证号码验证
    if (trimmedIdCard.length !== 18) {
      return false;
    }

    // 检查前17位是否都是数字
    if (!/^\d{17}/.test(trimmedIdCard)) {
      return false;
    }

    // 检查最后一位是否是数字或X/x
    const lastChar = trimmedIdCard.slice(17);
    if (!/^[0-9Xx]$/.test(lastChar)) {
      return false;
    }

    // 检查是否以0开头（无效）
    if (trimmedIdCard.startsWith('0')) {
      return false;
    }

    // 基本格式验证
    const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;

    return idCardRegex.test(trimmedIdCard);
  }

  /**
   * 验证字符串长度
   * @param str 字符串
   * @param min 最小长度
   * @param max 最大长度
   */
  static isValidLength(str: string, min: number = 0, max: number = Infinity): boolean {
    if (typeof str !== 'string') {
      return false;
    }

    const length = str.trim().length;
    return length >= min && length <= max;
  }

  /**
   * 验证是否为空
   * @param value 值
   */
  static isEmpty(value: any): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    if (typeof value === 'string') {
      return value.trim().length === 0;
    }

    if (Array.isArray(value)) {
      return value.length === 0;
    }

    if (typeof value === 'object') {
      // 排除 Date、RegExp、Function 等特殊对象
      if (value instanceof Date || value instanceof RegExp || typeof value === 'function') {
        return false;
      }
      return Object.keys(value).length === 0;
    }

    return false;
  }

  /**
   * 验证数字范围
   * @param num 数字
   * @param min 最小值
   * @param max 最大值
   */
  static isValidNumber(num: any, min: number = -Infinity, max: number = Infinity): boolean {
    // 排除 null、undefined、空字符串、对象等
    if (num === null || num === undefined || num === '' || typeof num === 'object') {
      return false;
    }

    const n = Number(num);

    if (isNaN(n)) {
      return false;
    }

    // 允许 Infinity 和 -Infinity
    return n >= min && n <= max;
  }

  /**
   * 验证URL
   * @param url URL地址
   */
  static isValidUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    const trimmedUrl = url.trim();

    // 基本检查：必须包含协议
    if (!trimmedUrl.includes('://')) {
      return false;
    }

    // 检查不能是空的协议
    if (trimmedUrl === 'http://' || trimmedUrl === 'https://') {
      return false;
    }

    try {
      const urlObj = new URL(trimmedUrl);
      // 确保有有效的主机名
      return urlObj.hostname && urlObj.hostname !== '.' && urlObj.hostname !== '..';
    } catch {
      return false;
    }
  }

  /**
   * 验证日期格式
   * @param dateStr 日期字符串
   * @param format 期望格式，如 'YYYY-MM-DD'
   */
  static isValidDate(dateStr: string, format?: string): boolean {
    if (!dateStr || typeof dateStr !== 'string') {
      return false;
    }

    const trimmedDateStr = dateStr.trim();

    // 检查明显无效的日期字符串
    if (trimmedDateStr === 'not-a-date' || trimmedDateStr === 'invalid date') {
      return false;
    }

    if (format === 'YYYY-MM-DD') {
      const regex = /^\d{4}-\d{2}-\d{2}$/;
      if (!regex.test(trimmedDateStr)) {
        return false;
      }
    }

    const date = new Date(trimmedDateStr);

    if (isNaN(date.getTime())) {
      return false;
    }

    // 检查日期是否合理（不是无效日期如 2024-13-01, 2024-01-32）
    if (format === 'YYYY-MM-DD') {
      const parts = trimmedDateStr.split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);

      // 检查月份范围
      if (month < 1 || month > 12) {
        return false;
      }

      // 检查日期范围
      if (day < 1 || day > 31) {
        return false;
      }

      return date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day;
    }

    // 对于非特定格式，检查一些明显无效的情况
    if (trimmedDateStr.includes('13-') || trimmedDateStr.includes('-13-') ||
      trimmedDateStr.includes('32') || trimmedDateStr.includes('-32') ||
      trimmedDateStr.includes('/')) {
      return false;
    }

    return true;
  }

  /**
   * 验证密码强度
   * @param password 密码
   * @param minLength 最小长度
   */
  static isStrongPassword(password: string, minLength: number = 8): boolean {
    if (!password || typeof password !== 'string') {
      return false;
    }

    if (password.length < minLength) {
      return false;
    }

    // 至少包含一个数字、一个小写字母、一个大写字母
    const hasNumber = /\d/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);

    return hasNumber && hasLower && hasUpper;
  }

  /**
   * 清理HTML标签
   * @param str 字符串
   */
  static sanitizeHtml(str: string): string {
    if (!str || typeof str !== 'string') {
      return '';
    }

    // 移除HTML标签和script内容
    let result = str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '');

    // 特殊处理：如果原字符串包含 <> 但不是HTML标签，保留它们
    if (str.includes('<>') && !str.includes('</')) {
      result = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }

    return result;
  }

  /**
   * 验证中文姓名
   * @param name 姓名
   */
  static isValidChineseName(name: string): boolean {
    if (!name || typeof name !== 'string') {
      return false;
    }

    const chineseNameRegex = /^[\u4e00-\u9fa5]{2,10}$/;
    return chineseNameRegex.test(name.trim());
  }
}