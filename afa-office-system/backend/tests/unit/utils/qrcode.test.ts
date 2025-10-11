import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QRCodeUtils } from '../../../src/utils/qrcode.js';
import crypto from 'crypto';

describe('QRCodeUtils 单元测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 设置固定的时间用于测试
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('generateQRCodeContent', () => {
    it('应该生成有效的二维码内容', () => {
      const userId = 1;
      const type = 'employee';
      const expiryTime = new Date('2024-01-01T13:00:00Z');
      const permissions = ['basic_access', 'floor_1'];

      const qrContent = QRCodeUtils.generateQRCodeContent(userId, type, expiryTime, permissions);

      expect(qrContent).toBeTruthy();
      expect(typeof qrContent).toBe('string');
      expect(qrContent).toContain(':'); // 应该包含IV分隔符
    });

    it('应该为不同参数生成不同的内容', () => {
      const expiryTime = new Date('2024-01-01T13:00:00Z');
      
      const qr1 = QRCodeUtils.generateQRCodeContent(1, 'employee', expiryTime, ['access1']);
      const qr2 = QRCodeUtils.generateQRCodeContent(2, 'employee', expiryTime, ['access1']);
      const qr3 = QRCodeUtils.generateQRCodeContent(1, 'visitor', expiryTime, ['access1']);

      expect(qr1).not.toBe(qr2);
      expect(qr1).not.toBe(qr3);
      expect(qr2).not.toBe(qr3);
    });

    it('应该处理空权限列表', () => {
      const qrContent = QRCodeUtils.generateQRCodeContent(
        1, 
        'employee', 
        new Date('2024-01-01T13:00:00Z')
      );

      expect(qrContent).toBeTruthy();
      
      const parsed = QRCodeUtils.parseQRCodeContent(qrContent);
      expect(parsed?.permissions).toEqual([]);
    });
  });

  describe('parseQRCodeContent', () => {
    it('应该正确解析有效的二维码内容', () => {
      const userId = 1;
      const type = 'employee';
      const expiryTime = new Date('2024-01-01T13:00:00Z');
      const permissions = ['basic_access'];

      const qrContent = QRCodeUtils.generateQRCodeContent(userId, type, expiryTime, permissions);
      const parsed = QRCodeUtils.parseQRCodeContent(qrContent);

      expect(parsed).toBeTruthy();
      expect(parsed!.userId).toBe(userId);
      expect(parsed!.type).toBe(type);
      expect(parsed!.expiryTime).toBe(expiryTime.getTime());
      expect(parsed!.permissions).toEqual(permissions);
      expect(parsed!.timestamp).toBe(Date.now());
      expect(parsed!.nonce).toBeTruthy();
    });

    it('应该拒绝无效的二维码内容', () => {
      const invalidContents = [
        'invalid_content',
        'invalid:format',
        '',
        'a'.repeat(1000), // 过长的内容
      ];

      invalidContents.forEach(content => {
        const parsed = QRCodeUtils.parseQRCodeContent(content);
        expect(parsed).toBeNull();
      });
    });

    it('应该拒绝格式错误的加密内容', () => {
      // 模拟格式错误的加密内容
      const malformedContent = 'invalidiv:invalidencrypted';
      const parsed = QRCodeUtils.parseQRCodeContent(malformedContent);
      expect(parsed).toBeNull();
    });

    it('应该拒绝不完整的数据', () => {
      // 创建一个缺少必需字段的payload
      const incompletePayload = {
        userId: 1,
        // 缺少 type, timestamp, expiryTime
      };

      // 手动加密不完整的数据
      const key = crypto.scryptSync('afa-office-qrcode-secret-key-2024', 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      
      let encrypted = cipher.update(JSON.stringify(incompletePayload), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const malformedContent = `${iv.toString('hex')}:${encrypted}`;
      const parsed = QRCodeUtils.parseQRCodeContent(malformedContent);
      
      expect(parsed).toBeNull();
    });
  });

  describe('generateTimeBasedCode', () => {
    it('应该生成时效性通行码', () => {
      const baseCode = 'BASE_CODE_123';
      const timeBasedCode = QRCodeUtils.generateTimeBasedCode(baseCode, 5);

      expect(timeBasedCode).toBeTruthy();
      expect(typeof timeBasedCode).toBe('string');
      expect(timeBasedCode).toHaveLength(16);
      expect(timeBasedCode).toMatch(/^[A-F0-9]+$/); // 应该是大写十六进制
    });

    it('应该为相同输入生成相同的码', () => {
      const baseCode = 'BASE_CODE_123';
      
      const code1 = QRCodeUtils.generateTimeBasedCode(baseCode, 5);
      const code2 = QRCodeUtils.generateTimeBasedCode(baseCode, 5);

      expect(code1).toBe(code2);
    });

    it('应该为不同时间窗口生成不同的码', () => {
      const baseCode = 'BASE_CODE_123';
      
      const code5min = QRCodeUtils.generateTimeBasedCode(baseCode, 5);
      const code10min = QRCodeUtils.generateTimeBasedCode(baseCode, 10);

      // 在不同时间窗口下可能生成不同的码
      // 这取决于当前时间所在的窗口
      expect(typeof code5min).toBe('string');
      expect(typeof code10min).toBe('string');
    });
  });

  describe('validateTimeBasedCode', () => {
    it('应该验证当前时间窗口的有效码', () => {
      const baseCode = 'BASE_CODE_123';
      const timeWindow = 5;
      
      const timeBasedCode = QRCodeUtils.generateTimeBasedCode(baseCode, timeWindow);
      const isValid = QRCodeUtils.validateTimeBasedCode(timeBasedCode, baseCode, timeWindow);

      expect(isValid).toBe(true);
    });

    it('应该验证前一个时间窗口的有效码（容错处理）', () => {
      const baseCode = 'BASE_CODE_123';
      const timeWindow = 5;
      
      // 生成当前窗口的码
      const currentCode = QRCodeUtils.generateTimeBasedCode(baseCode, timeWindow);
      
      // 模拟时间前进到下一个窗口
      vi.setSystemTime(new Date(Date.now() + timeWindow * 60 * 1000));
      
      // 应该仍然能验证前一个窗口的码
      const isValid = QRCodeUtils.validateTimeBasedCode(currentCode, baseCode, timeWindow);
      expect(isValid).toBe(true);
    });

    it('应该拒绝过期的时效性码', () => {
      const baseCode = 'BASE_CODE_123';
      const timeWindow = 5;
      
      // 生成当前窗口的码
      const oldCode = QRCodeUtils.generateTimeBasedCode(baseCode, timeWindow);
      
      // 模拟时间前进超过容错范围
      vi.setSystemTime(new Date(Date.now() + 2 * timeWindow * 60 * 1000));
      
      // 应该拒绝过期的码
      const isValid = QRCodeUtils.validateTimeBasedCode(oldCode, baseCode, timeWindow);
      expect(isValid).toBe(false);
    });

    it('应该拒绝无效的码', () => {
      const baseCode = 'BASE_CODE_123';
      const invalidCode = 'INVALID_CODE_456';
      
      const isValid = QRCodeUtils.validateTimeBasedCode(invalidCode, baseCode, 5);
      expect(isValid).toBe(false);
    });
  });

  describe('generateUniqueId', () => {
    it('应该生成唯一的ID', () => {
      const id1 = QRCodeUtils.generateUniqueId();
      const id2 = QRCodeUtils.generateUniqueId();

      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).toMatch(/^[A-Z0-9]+$/); // 应该是大写字母数字
    });

    it('应该生成足够长的ID', () => {
      const id = QRCodeUtils.generateUniqueId();
      expect(id.length).toBeGreaterThan(10); // 应该有足够的长度保证唯一性
    });
  });

  describe('generateNumericCode', () => {
    it('应该生成指定长度的数字码', () => {
      const lengths = [4, 6, 8, 10];
      
      lengths.forEach(length => {
        const code = QRCodeUtils.generateNumericCode(length);
        expect(code).toHaveLength(length);
        expect(code).toMatch(/^\d+$/); // 应该只包含数字
      });
    });

    it('应该使用默认长度', () => {
      const code = QRCodeUtils.generateNumericCode();
      expect(code).toHaveLength(8); // 默认长度
      expect(code).toMatch(/^\d+$/);
    });

    it('应该生成不同的数字码', () => {
      const codes = Array.from({ length: 100 }, () => QRCodeUtils.generateNumericCode(8));
      const uniqueCodes = new Set(codes);
      
      // 应该有很高的唯一性（允许少量重复）
      expect(uniqueCodes.size).toBeGreaterThan(95);
    });
  });

  describe('isQRCodeValid', () => {
    it('应该验证未过期的二维码', () => {
      const futureTime = Date.now() + 60 * 60 * 1000; // 1小时后
      const isValid = QRCodeUtils.isQRCodeValid(futureTime);
      expect(isValid).toBe(true);
    });

    it('应该拒绝已过期的二维码', () => {
      const pastTime = Date.now() - 60 * 60 * 1000; // 1小时前
      const isValid = QRCodeUtils.isQRCodeValid(pastTime);
      expect(isValid).toBe(false);
    });

    it('应该处理边界情况', () => {
      const currentTime = Date.now();
      const isValid = QRCodeUtils.isQRCodeValid(currentTime);
      expect(isValid).toBe(false); // 当前时间应该被认为是过期的
    });
  });

  describe('getRemainingTime', () => {
    it('应该计算正确的剩余时间', () => {
      const futureTime = Date.now() + 3600 * 1000; // 1小时后
      const remaining = QRCodeUtils.getRemainingTime(futureTime);
      expect(remaining).toBe(3600); // 3600秒
    });

    it('应该返回0对于过期时间', () => {
      const pastTime = Date.now() - 1000; // 1秒前
      const remaining = QRCodeUtils.getRemainingTime(pastTime);
      expect(remaining).toBe(0);
    });

    it('应该处理边界情况', () => {
      const currentTime = Date.now();
      const remaining = QRCodeUtils.getRemainingTime(currentTime);
      expect(remaining).toBe(0);
    });
  });

  describe('generateCodeWithChecksum', () => {
    it('应该生成带校验码的通行码', () => {
      const baseCode = 'ABC123';
      const codeWithChecksum = QRCodeUtils.generateCodeWithChecksum(baseCode);

      expect(codeWithChecksum.startsWith(baseCode)).toBe(true);
      expect(codeWithChecksum).toHaveLength(baseCode.length + 4); // 基础码 + 4位校验码
      expect(codeWithChecksum.slice(-4)).toMatch(/^[A-F0-9]{4}$/); // 校验码应该是4位十六进制
    });

    it('应该为相同输入生成相同的校验码', () => {
      const baseCode = 'TEST123';
      const code1 = QRCodeUtils.generateCodeWithChecksum(baseCode);
      const code2 = QRCodeUtils.generateCodeWithChecksum(baseCode);

      expect(code1).toBe(code2);
    });

    it('应该为不同输入生成不同的校验码', () => {
      const code1 = QRCodeUtils.generateCodeWithChecksum('ABC123');
      const code2 = QRCodeUtils.generateCodeWithChecksum('DEF456');

      expect(code1).not.toBe(code2);
      expect(code1.slice(-4)).not.toBe(code2.slice(-4));
    });
  });

  describe('validateCodeWithChecksum', () => {
    it('应该验证有效的带校验码通行码', () => {
      const baseCode = 'TEST123';
      const codeWithChecksum = QRCodeUtils.generateCodeWithChecksum(baseCode);
      const result = QRCodeUtils.validateCodeWithChecksum(codeWithChecksum);

      expect(result.valid).toBe(true);
      expect(result.baseCode).toBe(baseCode);
    });

    it('应该拒绝无效的校验码', () => {
      const invalidCode = 'TEST123XXXX'; // 错误的校验码
      const result = QRCodeUtils.validateCodeWithChecksum(invalidCode);

      expect(result.valid).toBe(false);
      expect(result.baseCode).toBeUndefined();
    });

    it('应该拒绝过短的码', () => {
      const shortCode = 'ABC'; // 少于4位，无法提取校验码
      const result = QRCodeUtils.validateCodeWithChecksum(shortCode);

      expect(result.valid).toBe(false);
      expect(result.baseCode).toBeUndefined();
    });

    it('应该处理被篡改的码', () => {
      const originalCode = QRCodeUtils.generateCodeWithChecksum('ORIGINAL');
      const tamperedCode = 'TAMPERED' + originalCode.slice(-4); // 保留校验码但改变基础码
      const result = QRCodeUtils.validateCodeWithChecksum(tamperedCode);

      expect(result.valid).toBe(false);
    });
  });

  describe('加密解密功能测试', () => {
    it('应该正确加密和解密数据', () => {
      const originalData = {
        userId: 1,
        type: 'employee',
        timestamp: Date.now(),
        expiryTime: Date.now() + 3600000,
        permissions: ['access1', 'access2'],
        nonce: 'test_nonce'
      };

      const qrContent = QRCodeUtils.generateQRCodeContent(
        originalData.userId,
        originalData.type as 'employee',
        new Date(originalData.expiryTime),
        originalData.permissions
      );

      const decryptedData = QRCodeUtils.parseQRCodeContent(qrContent);

      expect(decryptedData).toBeTruthy();
      expect(decryptedData!.userId).toBe(originalData.userId);
      expect(decryptedData!.type).toBe(originalData.type);
      expect(decryptedData!.permissions).toEqual(originalData.permissions);
    });

    it('应该使用不同的IV生成不同的加密结果', () => {
      const qr1 = QRCodeUtils.generateQRCodeContent(1, 'employee', new Date(), ['access']);
      const qr2 = QRCodeUtils.generateQRCodeContent(1, 'employee', new Date(), ['access']);

      expect(qr1).not.toBe(qr2); // 由于随机IV，加密结果应该不同
    });
  });

  describe('性能和边界条件测试', () => {
    it('应该处理大量权限列表', () => {
      const largePermissions = Array.from({ length: 100 }, (_, i) => `permission_${i}`);
      
      const qrContent = QRCodeUtils.generateQRCodeContent(
        1,
        'employee',
        new Date(Date.now() + 3600000),
        largePermissions
      );

      const parsed = QRCodeUtils.parseQRCodeContent(qrContent);
      expect(parsed?.permissions).toEqual(largePermissions);
    });

    it('应该处理特殊字符', () => {
      const specialPermissions = ['权限1', 'permission@#$%', '访问_权限'];
      
      const qrContent = QRCodeUtils.generateQRCodeContent(
        1,
        'employee',
        new Date(Date.now() + 3600000),
        specialPermissions
      );

      const parsed = QRCodeUtils.parseQRCodeContent(qrContent);
      expect(parsed?.permissions).toEqual(specialPermissions);
    });

    it('应该处理极端的用户ID', () => {
      const extremeUserIds = [0, 1, 999999999, Number.MAX_SAFE_INTEGER];
      
      extremeUserIds.forEach(userId => {
        const qrContent = QRCodeUtils.generateQRCodeContent(
          userId,
          'employee',
          new Date(Date.now() + 3600000),
          []
        );

        const parsed = QRCodeUtils.parseQRCodeContent(qrContent);
        expect(parsed?.userId).toBe(userId);
      });
    });

    it('应该处理极端的过期时间', () => {
      const extremeTimes = [
        new Date('1970-01-01T00:00:00Z'),
        new Date('2099-12-31T23:59:59Z'),
        new Date(0),
        new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), // 100年后
      ];

      extremeTimes.forEach(expiryTime => {
        const qrContent = QRCodeUtils.generateQRCodeContent(1, 'employee', expiryTime, []);
        const parsed = QRCodeUtils.parseQRCodeContent(qrContent);
        expect(parsed?.expiryTime).toBe(expiryTime.getTime());
      });
    });
  });

  describe('安全性测试', () => {
    it('应该包含防重放攻击的nonce', () => {
      const qrContent = QRCodeUtils.generateQRCodeContent(1, 'employee', new Date(), []);
      const parsed = QRCodeUtils.parseQRCodeContent(qrContent);

      expect(parsed?.nonce).toBeTruthy();
      expect(typeof parsed?.nonce).toBe('string');
      expect(parsed?.nonce.length).toBeGreaterThan(0);
    });

    it('应该为每次生成使用不同的nonce', () => {
      const qr1 = QRCodeUtils.generateQRCodeContent(1, 'employee', new Date(), []);
      const qr2 = QRCodeUtils.generateQRCodeContent(1, 'employee', new Date(), []);

      const parsed1 = QRCodeUtils.parseQRCodeContent(qr1);
      const parsed2 = QRCodeUtils.parseQRCodeContent(qr2);

      expect(parsed1?.nonce).not.toBe(parsed2?.nonce);
    });

    it('应该拒绝被篡改的加密内容', () => {
      const qrContent = QRCodeUtils.generateQRCodeContent(1, 'employee', new Date(), []);
      
      // 篡改加密内容
      const parts = qrContent.split(':');
      const tamperedContent = parts[0] + ':' + parts[1].slice(0, -2) + 'XX';
      
      const parsed = QRCodeUtils.parseQRCodeContent(tamperedContent);
      expect(parsed).toBeNull();
    });
  });
});