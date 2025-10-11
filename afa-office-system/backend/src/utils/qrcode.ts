import crypto from 'crypto';

/**
 * 二维码生成工具类
 * 提供动态二维码生成和验证功能
 */
export class QRCodeUtils {
  private static readonly SECRET_KEY = process.env.QRCODE_SECRET || 'afa-office-qrcode-secret-key-2024';
  
  /**
   * 生成动态二维码内容
   * @param userId 用户ID
   * @param type 通行码类型
   * @param expiryTime 过期时间
   * @param permissions 权限列表
   * @returns 加密的二维码内容
   */
  static generateQRCodeContent(
    userId: number,
    type: 'employee' | 'visitor',
    expiryTime: Date,
    permissions: string[] = []
  ): string {
    const timestamp = Date.now();
    const payload = {
      userId,
      type,
      timestamp,
      expiryTime: expiryTime.getTime(),
      permissions,
      nonce: crypto.randomBytes(16).toString('hex'), // 防重放攻击
    };

    return this.encrypt(JSON.stringify(payload));
  }

  /**
   * 验证并解析二维码内容
   * @param qrContent 二维码内容
   * @returns 解析后的数据或null
   */
  static parseQRCodeContent(qrContent: string): {
    userId: number;
    type: 'employee' | 'visitor';
    timestamp: number;
    expiryTime: number;
    permissions: string[];
    nonce: string;
  } | null {
    try {
      const decrypted = this.decrypt(qrContent);
      const payload = JSON.parse(decrypted);
      
      // 验证数据完整性
      if (payload.userId === undefined || payload.userId === null || !payload.type || !payload.timestamp || payload.expiryTime === undefined || payload.expiryTime === null) {
        return null;
      }

      return payload;
    } catch (error) {
      console.error('二维码解析失败:', error);
      return null;
    }
  }

  /**
   * 生成时效性通行码
   * @param baseCode 基础通行码
   * @param timeWindow 时间窗口（分钟）
   * @returns 时效性通行码
   */
  static generateTimeBasedCode(baseCode: string, timeWindow: number = 5): string {
    const currentWindow = Math.floor(Date.now() / (timeWindow * 60 * 1000));
    const hash = crypto.createHash('sha256');
    hash.update(`${baseCode}-${currentWindow}`);
    return hash.digest('hex').substring(0, 16).toUpperCase();
  }

  /**
   * 验证时效性通行码
   * @param code 待验证的通行码
   * @param baseCode 基础通行码
   * @param timeWindow 时间窗口（分钟）
   * @returns 是否有效
   */
  static validateTimeBasedCode(code: string, baseCode: string, timeWindow: number = 5): boolean {
    const currentWindow = Math.floor(Date.now() / (timeWindow * 60 * 1000));
    
    // 检查当前时间窗口和前一个时间窗口（容错处理）
    for (let i = 0; i <= 1; i++) {
      const window = currentWindow - i;
      const hash = crypto.createHash('sha256');
      hash.update(`${baseCode}-${window}`);
      const expectedCode = hash.digest('hex').substring(0, 16).toUpperCase();
      
      if (code === expectedCode) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 生成唯一的通行码ID
   * @returns 唯一ID
   */
  static generateUniqueId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    return `${timestamp}${random}`.toUpperCase();
  }

  /**
   * 生成数字通行码（用于硬件设备）
   * @param length 长度
   * @returns 数字通行码
   */
  static generateNumericCode(length: number = 8): string {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  }

  /**
   * 加密数据
   * @param text 待加密文本
   * @returns 加密后的字符串
   */
  private static encrypt(text: string): string {
    const key = crypto.scryptSync(this.SECRET_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * 解密数据
   * @param encryptedText 加密的文本
   * @returns 解密后的字符串
   */
  private static decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }

    const [ivHex, encrypted] = parts;
    if (!ivHex || !encrypted) {
      throw new Error('Invalid encrypted text format');
    }

    const key = crypto.scryptSync(this.SECRET_KEY, 'salt', 32);
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * 验证二维码是否在有效期内
   * @param expiryTime 过期时间戳
   * @returns 是否有效
   */
  static isQRCodeValid(expiryTime: number): boolean {
    return Date.now() < expiryTime;
  }

  /**
   * 计算二维码剩余有效时间（秒）
   * @param expiryTime 过期时间戳
   * @returns 剩余秒数
   */
  static getRemainingTime(expiryTime: number): number {
    const remaining = Math.floor((expiryTime - Date.now()) / 1000);
    return Math.max(0, remaining);
  }

  /**
   * 生成带校验码的通行码
   * @param baseCode 基础码
   * @returns 带校验码的通行码
   */
  static generateCodeWithChecksum(baseCode: string): string {
    const hash = crypto.createHash('md5');
    hash.update(baseCode);
    const checksum = hash.digest('hex').substring(0, 4).toUpperCase();
    return `${baseCode}${checksum}`;
  }

  /**
   * 验证带校验码的通行码
   * @param codeWithChecksum 带校验码的通行码
   * @returns 验证结果和基础码
   */
  static validateCodeWithChecksum(codeWithChecksum: string): { valid: boolean; baseCode?: string } {
    if (codeWithChecksum.length < 4) {
      return { valid: false };
    }

    const baseCode = codeWithChecksum.slice(0, -4);
    const providedChecksum = codeWithChecksum.slice(-4);
    
    const hash = crypto.createHash('md5');
    hash.update(baseCode);
    const expectedChecksum = hash.digest('hex').substring(0, 4).toUpperCase();
    
    const isValid = providedChecksum === expectedChecksum;
    
    if (isValid) {
      return { valid: true, baseCode };
    } else {
      return { valid: false };
    }
  }
}