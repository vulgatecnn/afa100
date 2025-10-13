// 验证工具函数单元测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValidationUtils } from '../../../utils/validation';

describe('验证工具函数测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isValidPhone 方法', () => {
    it('应该验证有效的手机号', () => {
      const validPhones = [
        '13800138000',
        '15912345678',
        '18888888888',
        '19999999999'
      ];

      validPhones.forEach(phone => {
        expect(ValidationUtils.isValidPhone(phone)).toBe(true);
      });
    });

    it('应该拒绝无效的手机号', () => {
      const invalidPhones = [
        '12800138000', // 不是1[3-9]开头
        '1380013800',  // 少一位
        '138001380000', // 多一位
        '1380013800a',  // 包含字母
        '138-0013-8000', // 包含连字符
        '+8613800138000' // 包含国际区号
      ];

      invalidPhones.forEach(phone => {
        expect(ValidationUtils.isValidPhone(phone)).toBe(false);
      });
    });

    it('应该处理空值和非字符串', () => {
      expect(ValidationUtils.isValidPhone('')).toBe(false);
      expect(ValidationUtils.isValidPhone(null as any)).toBe(false);
      expect(ValidationUtils.isValidPhone(undefined as any)).toBe(false);
      expect(ValidationUtils.isValidPhone(123 as any)).toBe(false);
    });

    it('应该处理包含空格的手机号', () => {
      expect(ValidationUtils.isValidPhone(' 13800138000 ')).toBe(true);
      expect(ValidationUtils.isValidPhone('138 0013 8000')).toBe(false);
    });
  });

  describe('isValidEmail 方法', () => {
    it('应该验证有效的邮箱', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com',
        'a@b.co'
      ];

      validEmails.forEach(email => {
        expect(ValidationUtils.isValidEmail(email)).toBe(true);
      });
    });

    it('应该拒绝无效的邮箱', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com',
        'user@example',
        'user name@example.com'
      ];

      invalidEmails.forEach(email => {
        expect(ValidationUtils.isValidEmail(email)).toBe(false);
      });
    });

    it('应该处理空值和非字符串', () => {
      expect(ValidationUtils.isValidEmail('')).toBe(false);
      expect(ValidationUtils.isValidEmail(null as any)).toBe(false);
      expect(ValidationUtils.isValidEmail(undefined as any)).toBe(false);
      expect(ValidationUtils.isValidEmail(123 as any)).toBe(false);
    });

    it('应该处理包含空格的邮箱', () => {
      expect(ValidationUtils.isValidEmail(' test@example.com ')).toBe(true);
    });
  });

  describe('isValidIdCard 方法', () => {
    it('应该验证有效的身份证号', () => {
      const validIdCards = [
        '110101199003077777',
        '320311198506201234',
        '44030119851201001X',
        '51010219900307123x'
      ];

      validIdCards.forEach(idCard => {
        expect(ValidationUtils.isValidIdCard(idCard)).toBe(true);
      });
    });

    it('应该拒绝无效的身份证号', () => {
      const invalidIdCards = [
        '11010119900307777',  // 少一位
        '1101011990030777777', // 多一位
        '010101199003077777',  // 以0开头
        '110101199013077777',  // 无效月份
        '110101199002327777',  // 无效日期 (2月32日)
        '110101199003077abc'   // 包含字母（除了X/x）
      ];

      // 测试每个身份证号，找出哪个通过了验证
      const validResults = invalidIdCards.map(idCard => ({
        idCard,
        isValid: ValidationUtils.isValidIdCard(idCard)
      }));

      // 找出被错误认为有效的身份证号
      const wronglyValid = validResults.filter(r => r.isValid);
      if (wronglyValid.length > 0) {
        console.log('被错误认为有效的身份证号:', wronglyValid);
      }

      invalidIdCards.forEach(idCard => {
        expect(ValidationUtils.isValidIdCard(idCard)).toBe(false);
      });
    });

    it('应该处理空值和非字符串', () => {
      expect(ValidationUtils.isValidIdCard('')).toBe(false);
      expect(ValidationUtils.isValidIdCard(null as any)).toBe(false);
      expect(ValidationUtils.isValidIdCard(undefined as any)).toBe(false);
      expect(ValidationUtils.isValidIdCard(123 as any)).toBe(false);
    });

    it('应该处理包含空格的身份证号', () => {
      expect(ValidationUtils.isValidIdCard(' 110101199003077777 ')).toBe(true);
    });
  });

  describe('isValidLength 方法', () => {
    it('应该验证字符串长度', () => {
      expect(ValidationUtils.isValidLength('hello', 1, 10)).toBe(true);
      expect(ValidationUtils.isValidLength('hello', 5, 5)).toBe(true);
      expect(ValidationUtils.isValidLength('hello', 6, 10)).toBe(false);
      expect(ValidationUtils.isValidLength('hello', 1, 4)).toBe(false);
    });

    it('应该使用默认参数', () => {
      expect(ValidationUtils.isValidLength('hello')).toBe(true);
      expect(ValidationUtils.isValidLength('')).toBe(true); // 默认min=0
    });

    it('应该处理空格', () => {
      expect(ValidationUtils.isValidLength('  hello  ', 5, 5)).toBe(true);
      expect(ValidationUtils.isValidLength('   ', 0, 0)).toBe(true);
    });

    it('应该处理非字符串', () => {
      expect(ValidationUtils.isValidLength(123 as any)).toBe(false);
      expect(ValidationUtils.isValidLength(null as any)).toBe(false);
      expect(ValidationUtils.isValidLength(undefined as any)).toBe(false);
    });

    it('应该处理边界值', () => {
      expect(ValidationUtils.isValidLength('hello', 5, 5)).toBe(true);
      expect(ValidationUtils.isValidLength('hello', 0, Infinity)).toBe(true);
    });
  });

  describe('isEmpty 方法', () => {
    it('应该正确判断空值', () => {
      expect(ValidationUtils.isEmpty(null)).toBe(true);
      expect(ValidationUtils.isEmpty(undefined)).toBe(true);
      expect(ValidationUtils.isEmpty('')).toBe(true);
      expect(ValidationUtils.isEmpty('   ')).toBe(true);
      expect(ValidationUtils.isEmpty([])).toBe(true);
      expect(ValidationUtils.isEmpty({})).toBe(true);
    });

    it('应该正确判断非空值', () => {
      expect(ValidationUtils.isEmpty('hello')).toBe(false);
      expect(ValidationUtils.isEmpty('0')).toBe(false);
      expect(ValidationUtils.isEmpty([1, 2, 3])).toBe(false);
      expect(ValidationUtils.isEmpty({ key: 'value' })).toBe(false);
      expect(ValidationUtils.isEmpty(0)).toBe(false);
      expect(ValidationUtils.isEmpty(false)).toBe(false);
    });

    it('应该处理不同类型的值', () => {
      expect(ValidationUtils.isEmpty(new Date())).toBe(false);
      expect(ValidationUtils.isEmpty(/regex/)).toBe(false);
      expect(ValidationUtils.isEmpty(() => {})).toBe(false);
    });
  });

  describe('isValidNumber 方法', () => {
    it('应该验证有效数字', () => {
      expect(ValidationUtils.isValidNumber(5, 1, 10)).toBe(true);
      expect(ValidationUtils.isValidNumber('5', 1, 10)).toBe(true);
      expect(ValidationUtils.isValidNumber(0, 0, 0)).toBe(true);
      expect(ValidationUtils.isValidNumber(-5, -10, 0)).toBe(true);
    });

    it('应该拒绝超出范围的数字', () => {
      expect(ValidationUtils.isValidNumber(15, 1, 10)).toBe(false);
      expect(ValidationUtils.isValidNumber(-5, 1, 10)).toBe(false);
    });

    it('应该使用默认范围', () => {
      expect(ValidationUtils.isValidNumber(1000000)).toBe(true);
      expect(ValidationUtils.isValidNumber(-1000000)).toBe(true);
    });

    it('应该处理非数字值', () => {
      expect(ValidationUtils.isValidNumber('abc')).toBe(false);
      expect(ValidationUtils.isValidNumber(null)).toBe(false);
      expect(ValidationUtils.isValidNumber(undefined)).toBe(false);
      expect(ValidationUtils.isValidNumber({})).toBe(false);
    });

    it('应该处理特殊数字值', () => {
      expect(ValidationUtils.isValidNumber(NaN)).toBe(false);
      expect(ValidationUtils.isValidNumber(Infinity)).toBe(true);
      expect(ValidationUtils.isValidNumber(-Infinity)).toBe(true);
    });

    it('应该处理边界值', () => {
      expect(ValidationUtils.isValidNumber(5, 5, 5)).toBe(true);
      expect(ValidationUtils.isValidNumber(5, 5, 10)).toBe(true);
      expect(ValidationUtils.isValidNumber(5, 1, 5)).toBe(true);
    });
  });

  describe('isValidUrl 方法', () => {
    it('应该验证有效的URL', () => {
      const validUrls = [
        'https://www.example.com',
        'http://example.com',
        'https://example.com/path?query=value',
        'ftp://files.example.com',
        'https://subdomain.example.co.uk'
      ];

      validUrls.forEach(url => {
        expect(ValidationUtils.isValidUrl(url)).toBe(true);
      });
    });

    it('应该拒绝无效的URL', () => {
      const invalidUrls = [
        'not-a-url',
        'http://',
        'https://',
        'example.com', // 缺少协议
        'http://.',
        'http://..'
      ];

      invalidUrls.forEach(url => {
        expect(ValidationUtils.isValidUrl(url)).toBe(false);
      });
    });

    it('应该处理空值和非字符串', () => {
      expect(ValidationUtils.isValidUrl('')).toBe(false);
      expect(ValidationUtils.isValidUrl(null as any)).toBe(false);
      expect(ValidationUtils.isValidUrl(undefined as any)).toBe(false);
      expect(ValidationUtils.isValidUrl(123 as any)).toBe(false);
    });
  });

  describe('isValidDate 方法', () => {
    it('应该验证有效的日期', () => {
      const validDates = [
        '2024-01-15',
        '2024-12-31',
        '2024-01-15T10:30:00',
        '2024-01-15T10:30:00.000Z'
      ];

      validDates.forEach(date => {
        expect(ValidationUtils.isValidDate(date)).toBe(true);
      });
    });

    it('应该验证特定格式的日期', () => {
      expect(ValidationUtils.isValidDate('2024-01-15', 'YYYY-MM-DD')).toBe(true);
      expect(ValidationUtils.isValidDate('2024-1-15', 'YYYY-MM-DD')).toBe(false);
      expect(ValidationUtils.isValidDate('24-01-15', 'YYYY-MM-DD')).toBe(false);
    });

    it('应该拒绝无效的日期', () => {
      const invalidDates = [
        'not-a-date',
        '2024-13-01', // 无效月份
        '2024-01-32', // 无效日期
        '2024/01/15'  // 错误格式（当指定YYYY-MM-DD时）
      ];

      invalidDates.forEach(date => {
        expect(ValidationUtils.isValidDate(date)).toBe(false);
      });
    });

    it('应该处理空值和非字符串', () => {
      expect(ValidationUtils.isValidDate('')).toBe(false);
      expect(ValidationUtils.isValidDate(null as any)).toBe(false);
      expect(ValidationUtils.isValidDate(undefined as any)).toBe(false);
      expect(ValidationUtils.isValidDate(123 as any)).toBe(false);
    });
  });

  describe('isStrongPassword 方法', () => {
    it('应该验证强密码', () => {
      const strongPasswords = [
        'Password123',
        'MyStr0ngP@ss',
        'Abcdefg1',
        'Test123Password'
      ];

      strongPasswords.forEach(password => {
        expect(ValidationUtils.isStrongPassword(password)).toBe(true);
      });
    });

    it('应该拒绝弱密码', () => {
      const weakPasswords = [
        'password', // 缺少大写字母和数字
        'PASSWORD', // 缺少小写字母和数字
        '12345678', // 缺少字母
        'Pass1',    // 太短
        'password123', // 缺少大写字母
        'PASSWORD123'  // 缺少小写字母
      ];

      weakPasswords.forEach(password => {
        expect(ValidationUtils.isStrongPassword(password)).toBe(false);
      });
    });

    it('应该支持自定义最小长度', () => {
      expect(ValidationUtils.isStrongPassword('Pass1', 5)).toBe(true);
      expect(ValidationUtils.isStrongPassword('Pass1', 6)).toBe(false);
    });

    it('应该处理空值和非字符串', () => {
      expect(ValidationUtils.isStrongPassword('')).toBe(false);
      expect(ValidationUtils.isStrongPassword(null as any)).toBe(false);
      expect(ValidationUtils.isStrongPassword(undefined as any)).toBe(false);
      expect(ValidationUtils.isStrongPassword(123 as any)).toBe(false);
    });
  });

  describe('sanitizeHtml 方法', () => {
    it('应该移除HTML标签', () => {
      expect(ValidationUtils.sanitizeHtml('<p>Hello</p>')).toBe('Hello');
      expect(ValidationUtils.sanitizeHtml('<div><span>Test</span></div>')).toBe('Test');
      expect(ValidationUtils.sanitizeHtml('<script>alert("xss")</script>Safe')).toBe('Safe');
    });

    it('应该处理复杂的HTML', () => {
      const html = '<div class="test"><p>Paragraph</p><a href="#">Link</a></div>';
      const result = ValidationUtils.sanitizeHtml(html);
      expect(result).toBe('ParagraphLink');
    });

    it('应该处理自闭合标签', () => {
      expect(ValidationUtils.sanitizeHtml('Text<br/>More text')).toBe('TextMore text');
      expect(ValidationUtils.sanitizeHtml('Image<img src="test.jpg"/>End')).toBe('ImageEnd');
    });

    it('应该处理空值和非字符串', () => {
      expect(ValidationUtils.sanitizeHtml('')).toBe('');
      expect(ValidationUtils.sanitizeHtml(null as any)).toBe('');
      expect(ValidationUtils.sanitizeHtml(undefined as any)).toBe('');
      expect(ValidationUtils.sanitizeHtml(123 as any)).toBe('');
    });

    it('应该保留普通文本', () => {
      expect(ValidationUtils.sanitizeHtml('Plain text')).toBe('Plain text');
      expect(ValidationUtils.sanitizeHtml('Text with & symbols')).toBe('Text with & symbols');
    });
  });

  describe('isValidChineseName 方法', () => {
    it('应该验证有效的中文姓名', () => {
      const validNames = [
        '张三',
        '李小明',
        '王大华',
        '欧阳修',
        '司马懿',
        '上官婉儿'
      ];

      validNames.forEach(name => {
        expect(ValidationUtils.isValidChineseName(name)).toBe(true);
      });
    });

    it('应该拒绝无效的中文姓名', () => {
      const invalidNames = [
        '张',        // 太短
        '张三李四王五赵六钱七孙八', // 太长
        'Zhang San', // 包含英文
        '张3',       // 包含数字
        '张-三',     // 包含特殊字符
        '张 三'      // 包含空格
      ];

      invalidNames.forEach(name => {
        expect(ValidationUtils.isValidChineseName(name)).toBe(false);
      });
    });

    it('应该处理空值和非字符串', () => {
      expect(ValidationUtils.isValidChineseName('')).toBe(false);
      expect(ValidationUtils.isValidChineseName(null as any)).toBe(false);
      expect(ValidationUtils.isValidChineseName(undefined as any)).toBe(false);
      expect(ValidationUtils.isValidChineseName(123 as any)).toBe(false);
    });

    it('应该处理包含空格的姓名', () => {
      expect(ValidationUtils.isValidChineseName(' 张三 ')).toBe(true);
    });
  });

  describe('边界条件和异常处理', () => {
    it('应该处理极长的字符串', () => {
      const longString = 'a'.repeat(10000);
      expect(() => ValidationUtils.isValidLength(longString, 0, 20000)).not.toThrow();
      expect(ValidationUtils.isValidLength(longString, 0, 5000)).toBe(false);
    });

    it('应该处理特殊字符', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      expect(() => ValidationUtils.sanitizeHtml(specialChars)).not.toThrow();
      expect(ValidationUtils.sanitizeHtml(specialChars)).toBe(specialChars);
    });

    it('应该处理Unicode字符', () => {
      expect(ValidationUtils.isValidChineseName('张三🙂')).toBe(false);
      expect(ValidationUtils.sanitizeHtml('Text with emoji 😀')).toBe('Text with emoji 😀');
    });

    it('应该处理空白字符', () => {
      expect(ValidationUtils.isEmpty('\t\n\r ')).toBe(true);
      expect(ValidationUtils.isValidLength('\t\n\r ', 0, 0)).toBe(true);
    });

    it('应该处理循环引用对象', () => {
      const obj: any = {};
      obj.self = obj;
      expect(ValidationUtils.isEmpty(obj)).toBe(false);
    });
  });
});