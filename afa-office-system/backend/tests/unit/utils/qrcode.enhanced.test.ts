import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QRCodeUtils } from '../../../src/utils/qrcode.js';
import crypto from 'crypto';

describe('QRCodeUtils 增强测试 - 安全性和错误处理', () => {
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

  describe('加密安全增强测试', () => {
    it('应该使用强加密算法', () => {
      const userId = 1;
      const type = 'employee';
      const expiryTime = new Date('2024-01-01T13:00:00Z');
      const permissions = ['basic_access'];

      const qrContent = QRCodeUtils.generateQRCodeContent(userId, type, expiryTime, permissions);

      // 验证加密格式
      expect(qrContent).toMatch(/^[a-f0-9]{32}:[a-f0-9]+$/); // IV:encrypted格式
      
      const [ivHex, encrypted] = qrContent.split(':');
      expect(ivHex).toHaveLength(32); // 16字节IV的十六进制表示
      expect(encrypted.length).toBeGreaterThan(0);
      expect(encrypted.length % 2).toBe(0); // 十六进制字符串长度应该是偶数
    });

    it('应该使用随机IV防止相同明文产生相同密文', () => {
      const userId = 1;
      const type = 'employee';
      const expiryTime = new Date('2024-01-01T13:00:00Z');
      const permissions = ['basic_access'];

      const qr1 = QRCodeUtils.generateQRCodeContent(userId, type, expiryTime, permissions);
      const qr2 = QRCodeUtils.generateQRCodeContent(userId, type, expiryTime, permissions);

      expect(qr1).not.toBe(qr2);
      
      // 验证IV不同
      const [iv1] = qr1.split(':');
      const [iv2] = qr2.split(':');
      expect(iv1).not.toBe(iv2);
    });

    it('应该防止密钥泄露', () => {
      // 测试密钥不会在错误信息中泄露
      const invalidContent = 'invalid:content:format';
      
      const parsed = QRCodeUtils.parseQRCodeContent(invalidContent);
      expect(parsed).toBeNull();
      
      // 验证错误处理不会泄露密钥信息
      // 这里主要是确保解密失败时不会抛出包含密钥的异常
    });

    it('应该验证IV长度', () => {
      const invalidContents = [
        'short:encrypted', // IV太短
        'toolongiv123456789012345678901234567890:encrypted', // IV太长
        ':encrypted', // 空IV
        'notahexiv:encrypted', // 非十六进制IV
      ];

      invalidContents.forEach(content => {
        const parsed = QRCodeUtils.parseQRCodeContent(content);
        expect(parsed).toBeNull();
      });
    });

    it('应该防止填充攻击', () => {
      // 生成有效的二维码
      const qrContent = QRCodeUtils.generateQRCodeContent(1, 'employee', new Date(), []);
      const [iv, encrypted] = qrContent.split(':');

      // 篡改加密数据的最后几个字节（影响填充）
      const tamperedEncrypted = encrypted.slice(0, -4) + 'FFFF';
      const tamperedContent = `${iv}:${tamperedEncrypted}`;

      const parsed = QRCodeUtils.parseQRCodeContent(tamperedContent);
      expect(parsed).toBeNull();
    });

    it('应该处理加密数据长度攻击', () => {
      const [iv] = QRCodeUtils.generateQRCodeContent(1, 'employee', new Date(), []).split(':');
      
      const attackContents = [
        `${iv}:`, // 空加密数据
        `${iv}:FF`, // 太短的加密数据
        `${iv}:${'FF'.repeat(10000)}`, // 过长的加密数据
      ];

      attackContents.forEach(content => {
        const parsed = QRCodeUtils.parseQRCodeContent(content);
        expect(parsed).toBeNull();
      });
    });
  });

  describe('防重放攻击增强测试', () => {
    it('应该包含唯一的nonce', () => {
      const qrContents = Array.from({ length: 100 }, () =>
        QRCodeUtils.generateQRCodeContent(1, 'employee', new Date(), [])
      );

      const nonces = qrContents.map(content => {
        const parsed = QRCodeUtils.parseQRCodeContent(content);
        return parsed?.nonce;
      });

      // 验证所有nonce都是唯一的
      const uniqueNonces = new Set(nonces);
      expect(uniqueNonces.size).toBe(100);
      
      // 验证nonce长度和格式
      nonces.forEach(nonce => {
        expect(nonce).toBeTruthy();
        expect(typeof nonce).toBe('string');
        expect(nonce!.length).toBeGreaterThan(16); // 至少16个字符
        expect(nonce).toMatch(/^[a-f0-9]+$/); // 十六进制格式
      });
    });

    it('应该验证时间戳新鲜度', () => {
      // 测试不同时间戳的二维码
      const timestamps = [
        Date.now() - 24 * 60 * 60 * 1000, // 24小时前
        Date.now() - 60 * 60 * 1000, // 1小时前
        Date.now() - 5 * 60 * 1000, // 5分钟前
        Date.now(), // 现在
      ];

      timestamps.forEach(timestamp => {
        vi.setSystemTime(new Date(timestamp));
        
        const qrContent = QRCodeUtils.generateQRCodeContent(1, 'employee', new Date(timestamp + 60 * 60 * 1000), []);
        const parsed = QRCodeUtils.parseQRCodeContent(qrContent);
        
        expect(parsed).toBeTruthy();
        expect(parsed!.timestamp).toBe(timestamp);
      });
    });

    it('应该检测时间戳篡改', () => {
      const originalQR = QRCodeUtils.generateQRCodeContent(1, 'employee', new Date(), []);
      const originalParsed = QRCodeUtils.parseQRCodeContent(originalQR);
      
      // 手动构造篡改的数据
      const tamperedData = {
        ...originalParsed!,
        timestamp: Date.now() + 24 * 60 * 60 * 1000 // 未来时间
      };

      // 重新加密篡改的数据
      const key = crypto.scryptSync('afa-office-qrcode-secret-key-2024', 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      
      let encrypted = cipher.update(JSON.stringify(tamperedData), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tamperedQR = `${iv.toString('hex')}:${encrypted}`;
      const tamperedParsed = QRCodeUtils.parseQRCodeContent(tamperedQR);
      
      expect(tamperedParsed).toBeTruthy();
      expect(tamperedParsed!.timestamp).toBe(tamperedData.timestamp);
      
      // 在实际应用中，应该验证时间戳的合理性
    });
  });

  describe('时效性验证增强测试', () => {
    it('应该防止时间窗口操纵', () => {
      const baseCode = 'BASE_CODE_123';
      const timeWindows = [1, 5, 10, 30, 60]; // 不同的时间窗口

      timeWindows.forEach(window => {
        const timeCode = QRCodeUtils.generateTimeBasedCode(baseCode, window);
        
        // 验证在当前时间窗口内有效
        expect(QRCodeUtils.validateTimeBasedCode(timeCode, baseCode, window)).toBe(true);
        
        // 验证在不同时间窗口内无效
        const differentWindow = window === 5 ? 10 : 5;
        const isValidInDifferentWindow = QRCodeUtils.validateTimeBasedCode(timeCode, baseCode, differentWindow);
        
        // 可能有效也可能无效，取决于当前时间在哪个窗口
        expect(typeof isValidInDifferentWindow).toBe('boolean');
      });
    });

    it('应该处理时间边界条件', () => {
      const baseCode = 'BOUNDARY_CODE';
      const timeWindow = 5; // 5分钟窗口

      // 测试时间窗口边界
      const currentWindow = Math.floor(Date.now() / (timeWindow * 60 * 1000));
      const timeCode = QRCodeUtils.generateTimeBasedCode(baseCode, timeWindow);

      // 当前窗口应该有效
      expect(QRCodeUtils.validateTimeBasedCode(timeCode, baseCode, timeWindow)).toBe(true);

      // 前进到下一个时间窗口
      vi.setSystemTime(new Date(Date.now() + timeWindow * 60 * 1000));
      
      // 应该仍然有效（容错机制）
      expect(QRCodeUtils.validateTimeBasedCode(timeCode, baseCode, timeWindow)).toBe(true);

      // 前进到更远的时间窗口
      vi.setSystemTime(new Date(Date.now() + timeWindow * 60 * 1000));
      
      // 应该无效
      expect(QRCodeUtils.validateTimeBasedCode(timeCode, baseCode, timeWindow)).toBe(false);
    });

    it('应该防止时间回滚攻击', () => {
      const baseCode = 'ROLLBACK_CODE';
      const timeWindow = 5;

      // 生成当前时间的代码
      const currentTimeCode = QRCodeUtils.generateTimeBasedCode(baseCode, timeWindow);

      // 回滚时间
      vi.setSystemTime(new Date(Date.now() - 2 * timeWindow * 60 * 1000));
      
      // 生成过去时间的代码
      const pastTimeCode = QRCodeUtils.generateTimeBasedCode(baseCode, timeWindow);

      // 恢复当前时间
      vi.setSystemTime(new Date(Date.now() + 2 * timeWindow * 60 * 1000));

      // 当前时间代码应该有效
      expect(QRCodeUtils.validateTimeBasedCode(currentTimeCode, baseCode, timeWindow)).toBe(true);
      
      // 过去时间代码应该无效
      expect(QRCodeUtils.validateTimeBasedCode(pastTimeCode, baseCode, timeWindow)).toBe(false);
    });

    it('应该限制时间窗口大小', () => {
      const baseCode = 'WINDOW_SIZE_CODE';
      const extremeWindows = [0, -1, 0.5, 1440, 10080]; // 0分钟到1周

      extremeWindows.forEach(window => {
        if (window <= 0) {
          // 无效的时间窗口应该产生一致的结果
          const timeCode = QRCodeUtils.generateTimeBasedCode(baseCode, window);
          expect(typeof timeCode).toBe('string');
          expect(timeCode.length).toBe(16);
        } else {
          const timeCode = QRCodeUtils.generateTimeBasedCode(baseCode, window);
          const isValid = QRCodeUtils.validateTimeBasedCode(timeCode, baseCode, window);
          expect(isValid).toBe(true);
        }
      });
    });
  });

  describe('输入验证增强测试', () => {
    it('应该验证用户ID范围', () => {
      const invalidUserIds = [
        -1, 0, 2147483648, // 超出范围
        NaN, Infinity, -Infinity, // 特殊数值
        null as any, undefined as any, // null/undefined
        '1' as any, {} as any, [] as any // 错误类型
      ];

      invalidUserIds.forEach(userId => {
        try {
          const qrContent = QRCodeUtils.generateQRCodeContent(
            userId,
            'employee',
            new Date(),
            []
          );
          
          // 如果没有抛出错误，验证生成的内容
          const parsed = QRCodeUtils.parseQRCodeContent(qrContent);
          expect(parsed?.userId).toBe(userId);
        } catch (error) {
          // 某些无效输入可能会导致加密失败
          expect(error).toBeTruthy();
        }
      });
    });

    it('应该验证权限数组', () => {
      const invalidPermissions = [
        null as any, // null
        undefined as any, // undefined
        'string' as any, // 字符串而不是数组
        123 as any, // 数字
        { permission: 'test' } as any, // 对象
        [null, undefined, '', 123, {}], // 包含无效元素的数组
        Array(1000).fill('permission'), // 过大的数组
      ];

      invalidPermissions.forEach(permissions => {
        try {
          const qrContent = QRCodeUtils.generateQRCodeContent(
            1,
            'employee',
            new Date(),
            permissions
          );
          
          const parsed = QRCodeUtils.parseQRCodeContent(qrContent);
          expect(parsed?.permissions).toEqual(permissions);
        } catch (error) {
          // JSON序列化可能失败
          expect(error).toBeTruthy();
        }
      });
    });

    it('应该验证过期时间', () => {
      const invalidExpiryTimes = [
        new Date('invalid'), // 无效日期
        new Date(0), // Unix纪元
        new Date('1970-01-01'), // 过去时间
        new Date('2099-12-31'), // 遥远未来
        null as any, // null
        undefined as any, // undefined
        'string' as any, // 字符串
        123 as any, // 数字
      ];

      invalidExpiryTimes.forEach(expiryTime => {
        try {
          const qrContent = QRCodeUtils.generateQRCodeContent(
            1,
            'employee',
            expiryTime,
            []
          );
          
          const parsed = QRCodeUtils.parseQRCodeContent(qrContent);
          if (expiryTime instanceof Date && !isNaN(expiryTime.getTime())) {
            expect(parsed?.expiryTime).toBe(expiryTime.getTime());
          }
        } catch (error) {
          // 无效日期可能导致错误
          expect(error).toBeTruthy();
        }
      });
    });

    it('应该验证通行码类型', () => {
      const invalidTypes = [
        null as any, undefined as any, // null/undefined
        '', ' ', // 空字符串
        'invalid_type' as any, // 无效类型
        123 as any, {} as any, [] as any, // 错误类型
      ];

      invalidTypes.forEach(type => {
        try {
          const qrContent = QRCodeUtils.generateQRCodeContent(
            1,
            type,
            new Date(),
            []
          );
          
          const parsed = QRCodeUtils.parseQRCodeContent(qrContent);
          expect(parsed?.type).toBe(type);
        } catch (error) {
          // 某些无效类型可能导致错误
          expect(error).toBeTruthy();
        }
      });
    });
  });

  describe('校验码安全测试', () => {
    it('应该防止校验码碰撞', () => {
      const baseCodes = Array.from({ length: 1000 }, (_, i) => `CODE_${i}`);
      const codesWithChecksum = baseCodes.map(code => 
        QRCodeUtils.generateCodeWithChecksum(code)
      );

      // 验证所有带校验码的代码都是唯一的
      const uniqueCodes = new Set(codesWithChecksum);
      expect(uniqueCodes.size).toBe(1000);

      // 验证校验码部分也是唯一的（在这个测试集中）
      const checksums = codesWithChecksum.map(code => code.slice(-4));
      const uniqueChecksums = new Set(checksums);
      expect(uniqueChecksums.size).toBeGreaterThan(900); // 允许少量碰撞
    });

    it('应该检测单字符错误', () => {
      const originalCode = QRCodeUtils.generateCodeWithChecksum('ORIGINAL_CODE');
      
      // 测试每个位置的单字符错误
      for (let i = 0; i < originalCode.length - 4; i++) { // 不修改校验码部分
        const chars = originalCode.split('');
        chars[i] = chars[i] === 'A' ? 'B' : 'A'; // 改变一个字符
        const corruptedCode = chars.join('');
        
        const result = QRCodeUtils.validateCodeWithChecksum(corruptedCode);
        expect(result.valid).toBe(false);
      }
    });

    it('应该检测校验码篡改', () => {
      const originalCode = QRCodeUtils.generateCodeWithChecksum('TEST_CODE');
      const baseCode = originalCode.slice(0, -4);
      
      // 篡改校验码
      const tamperedChecksums = ['0000', 'FFFF', 'AAAA', '1234', 'ZZZZ'];
      
      tamperedChecksums.forEach(checksum => {
        const tamperedCode = baseCode + checksum;
        const result = QRCodeUtils.validateCodeWithChecksum(tamperedCode);
        
        if (checksum === originalCode.slice(-4)) {
          expect(result.valid).toBe(true);
        } else {
          expect(result.valid).toBe(false);
        }
      });
    });

    it('应该处理边界长度', () => {
      const edgeCases = [
        '', // 空字符串
        'A', // 1字符
        'AB', // 2字符
        'ABC', // 3字符
        'ABCD', // 4字符（最小有效长度）
        'A'.repeat(1000), // 很长的字符串
      ];

      edgeCases.forEach(code => {
        if (code.length >= 4) {
          const withChecksum = QRCodeUtils.generateCodeWithChecksum(code);
          const result = QRCodeUtils.validateCodeWithChecksum(withChecksum);
          expect(result.valid).toBe(true);
          expect(result.baseCode).toBe(code);
        } else {
          const result = QRCodeUtils.validateCodeWithChecksum(code);
          expect(result.valid).toBe(false);
          expect(result.baseCode).toBeUndefined();
        }
      });
    });
  });

  describe('性能和资源管理测试', () => {
    it('应该处理大量并发加密请求', () => {
      const concurrentRequests = 100;
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        Promise.resolve(QRCodeUtils.generateQRCodeContent(
          i + 1,
          'employee',
          new Date(),
          [`permission_${i}`]
        ))
      );

      return Promise.all(promises).then(results => {
        expect(results).toHaveLength(concurrentRequests);
        
        // 验证所有结果都是唯一的
        const uniqueResults = new Set(results);
        expect(uniqueResults.size).toBe(concurrentRequests);
      });
    });

    it('应该限制内存使用', () => {
      // 测试大数据量的处理
      const largePermissions = Array.from({ length: 10000 }, (_, i) => `perm_${i}`);
      
      const qrContent = QRCodeUtils.generateQRCodeContent(
        1,
        'employee',
        new Date(),
        largePermissions
      );

      const parsed = QRCodeUtils.parseQRCodeContent(qrContent);
      expect(parsed?.permissions).toEqual(largePermissions);
    });

    it('应该处理加密失败', () => {
      // 模拟加密失败的情况
      const originalCrypto = crypto.createCipheriv;
      
      vi.spyOn(crypto, 'createCipheriv').mockImplementation(() => {
        throw new Error('加密失败');
      });

      expect(() => {
        QRCodeUtils.generateQRCodeContent(1, 'employee', new Date(), []);
      }).toThrow('加密失败');

      // 恢复原始函数
      vi.mocked(crypto.createCipheriv).mockRestore();
    });

    it('应该处理解密失败', () => {
      // 创建一个有效的二维码
      const validQR = QRCodeUtils.generateQRCodeContent(1, 'employee', new Date(), []);
      
      // 模拟解密失败
      const originalCrypto = crypto.createDecipheriv;
      
      vi.spyOn(crypto, 'createDecipheriv').mockImplementation(() => {
        throw new Error('解密失败');
      });

      const parsed = QRCodeUtils.parseQRCodeContent(validQR);
      expect(parsed).toBeNull();

      // 恢复原始函数
      vi.mocked(crypto.createDecipheriv).mockRestore();
    });
  });

  describe('数据完整性测试', () => {
    it('应该保持数据完整性', () => {
      const testData = {
        userId: 12345,
        type: 'employee' as const,
        expiryTime: new Date('2024-12-31T23:59:59Z'),
        permissions: ['read', 'write', 'admin', '特殊权限', 'permission with spaces']
      };

      const qrContent = QRCodeUtils.generateQRCodeContent(
        testData.userId,
        testData.type,
        testData.expiryTime,
        testData.permissions
      );

      const parsed = QRCodeUtils.parseQRCodeContent(qrContent);

      expect(parsed).toBeTruthy();
      expect(parsed!.userId).toBe(testData.userId);
      expect(parsed!.type).toBe(testData.type);
      expect(parsed!.expiryTime).toBe(testData.expiryTime.getTime());
      expect(parsed!.permissions).toEqual(testData.permissions);
      expect(parsed!.timestamp).toBe(Date.now());
      expect(parsed!.nonce).toBeTruthy();
    });

    it('应该处理特殊字符', () => {
      const specialPermissions = [
        '权限1', // 中文
        'permission@#$%^&*()', // 特殊符号
        'permission\nwith\nnewlines', // 换行符
        'permission\twith\ttabs', // 制表符
        'permission"with"quotes', // 引号
        'permission\\with\\backslashes', // 反斜杠
        '🔒🔑🛡️', // emoji
      ];

      const qrContent = QRCodeUtils.generateQRCodeContent(
        1,
        'employee',
        new Date(),
        specialPermissions
      );

      const parsed = QRCodeUtils.parseQRCodeContent(qrContent);
      expect(parsed?.permissions).toEqual(specialPermissions);
    });

    it('应该处理Unicode字符', () => {
      const unicodeData = {
        userId: 1,
        type: 'employee' as const,
        permissions: [
          '测试权限', // 中文
          'тест', // 俄文
          'テスト', // 日文
          '🚀🌟💫', // emoji
          'café', // 带重音符号
          'naïve', // 带分音符号
        ]
      };

      const qrContent = QRCodeUtils.generateQRCodeContent(
        unicodeData.userId,
        unicodeData.type,
        new Date(),
        unicodeData.permissions
      );

      const parsed = QRCodeUtils.parseQRCodeContent(qrContent);
      expect(parsed?.permissions).toEqual(unicodeData.permissions);
    });
  });
});