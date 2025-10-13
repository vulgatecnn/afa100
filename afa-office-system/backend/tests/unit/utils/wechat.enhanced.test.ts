import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import { WechatUtils } from '../../../src/utils/wechat.js';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock配置
vi.mock('../../../src/config/app.config.js', () => ({
  appConfig: {
    wechat: {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
    },
  },
}));

describe('WechatUtils Enhanced Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSessionByCode - 增强测试', () => {
    it('应该成功获取用户session信息', async () => {
      const mockResponse = {
        data: {
          openid: 'test-openid',
          session_key: 'test-session-key',
          unionid: 'test-unionid',
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await WechatUtils.getSessionByCode('test-code');

      expect(result).toEqual({
        openid: 'test-openid',
        session_key: 'test-session-key',
        unionid: 'test-unionid',
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.weixin.qq.com/sns/jscode2session',
        {
          params: {
            appid: 'test-app-id',
            secret: 'test-app-secret',
            js_code: 'test-code',
            grant_type: 'authorization_code',
          },
        }
      );
    });

    it('应该处理没有unionid的响应', async () => {
      const mockResponse = {
        data: {
          openid: 'test-openid',
          session_key: 'test-session-key',
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await WechatUtils.getSessionByCode('test-code');

      expect(result).toEqual({
        openid: 'test-openid',
        session_key: 'test-session-key',
      });
      expect(result.unionid).toBeUndefined();
    });

    it('应该处理微信API错误响应', async () => {
      const errorCases = [
        { errcode: 40013, errmsg: 'invalid appid', expectedMessage: 'AppID无效' },
        { errcode: 40014, errmsg: 'invalid secret', expectedMessage: 'AppSecret无效' },
        { errcode: 40029, errmsg: 'invalid code', expectedMessage: 'code无效' },
        { errcode: 45011, errmsg: 'api minute-quota reach limit', expectedMessage: 'API调用太频繁，请稍候再试' },
        { errcode: 40226, errmsg: 'high risk user', expectedMessage: '高风险等级用户，小程序登录拦截' },
        { errcode: -1, errmsg: 'system error', expectedMessage: '系统繁忙，此时请开发者稍候再试' },
        { errcode: 99999, errmsg: 'unknown error', expectedMessage: 'unknown error' },
      ];

      for (const { errcode, errmsg, expectedMessage } of errorCases) {
        mockedAxios.get.mockResolvedValue({
          data: { errcode, errmsg },
        });

        await expect(WechatUtils.getSessionByCode('test-code')).rejects.toThrow(expectedMessage);
      }
    });

    it('应该处理网络错误', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.get.mockRejectedValue(networkError);
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(WechatUtils.getSessionByCode('test-code')).rejects.toThrow(
        'Network Error'
      );
    });

    it('应该处理axios错误', async () => {
      const axiosError = {
        isAxiosError: true,
        message: 'Request timeout',
        response: { status: 500 },
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValue(axiosError);

      await expect(WechatUtils.getSessionByCode('test-code')).rejects.toThrow(
        '微信API调用失败: Request timeout'
      );
    });

    it('应该处理缺少必要字段的响应', async () => {
      const invalidResponses = [
        { data: { session_key: 'test-session-key' } }, // 缺少openid
        { data: { openid: 'test-openid' } }, // 缺少session_key
        { data: {} }, // 都缺少
        { data: { openid: '', session_key: 'test-session-key' } }, // openid为空
        { data: { openid: 'test-openid', session_key: '' } }, // session_key为空
      ];

      for (const response of invalidResponses) {
        mockedAxios.get.mockResolvedValue(response);

        await expect(WechatUtils.getSessionByCode('test-code')).rejects.toThrow(
          '微信登录失败：未获取到有效的用户信息'
        );
      }
    });

    it('应该处理特殊字符的code', async () => {
      const specialCodes = [
        'code-with-special-chars!@#$%',
        '中文code',
        'code with spaces',
        'very-long-code-' + 'a'.repeat(100),
      ];

      const mockResponse = {
        data: {
          openid: 'test-openid',
          session_key: 'test-session-key',
        },
      };

      for (const code of specialCodes) {
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await WechatUtils.getSessionByCode(code);

        expect(result.openid).toBe('test-openid');
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            params: expect.objectContaining({
              js_code: code,
            }),
          })
        );
      }
    });
  });

  describe('verifySignature - 签名验证测试', () => {
    it('应该验证正确的签名', () => {
      const rawData = '{"nickName":"test","gender":1,"language":"zh_CN"}';
      const sessionKey = 'test-session-key';
      
      // 使用crypto模块计算正确的签名
      const crypto = require('crypto');
      const sha1 = crypto.createHash('sha1');
      sha1.update(rawData + sessionKey);
      const correctSignature = sha1.digest('hex');

      const isValid = WechatUtils.verifySignature(rawData, correctSignature, sessionKey);
      expect(isValid).toBe(true);
    });

    it('应该拒绝错误的签名', () => {
      const rawData = '{"nickName":"test","gender":1,"language":"zh_CN"}';
      const sessionKey = 'test-session-key';
      const wrongSignature = 'wrong-signature';

      const isValid = WechatUtils.verifySignature(rawData, wrongSignature, sessionKey);
      expect(isValid).toBe(false);
    });

    it('应该处理空字符串和特殊字符', () => {
      const testCases = [
        { rawData: '', sessionKey: 'key', signature: 'da39a3ee5e6b4b0d3255bfef95601890afd80709' },
        { rawData: 'data', sessionKey: '', signature: '5b41362bc82b7f3d56edc5a306db22105707d01d' },
        { rawData: '中文数据', sessionKey: 'key', signature: '' },
      ];

      testCases.forEach(({ rawData, sessionKey, signature }) => {
        expect(() => {
          WechatUtils.verifySignature(rawData, signature, sessionKey);
        }).not.toThrow();
      });
    });

    it('应该处理大量数据的签名验证', () => {
      const largeRawData = JSON.stringify({
        nickName: 'test',
        data: 'a'.repeat(10000),
      });
      const sessionKey = 'test-session-key';
      
      const crypto = require('crypto');
      const sha1 = crypto.createHash('sha1');
      sha1.update(largeRawData + sessionKey);
      const signature = sha1.digest('hex');

      const isValid = WechatUtils.verifySignature(largeRawData, signature, sessionKey);
      expect(isValid).toBe(true);
    });
  });

  describe('decryptData - 数据解密测试', () => {
    it('应该成功解密用户数据', () => {
      // 这里需要使用真实的加密数据进行测试
      // 由于AES加密的复杂性，我们模拟解密过程
      const mockDecrypt = vi.fn().mockReturnValue('{"nickName":"test","gender":1}');
      
      // Mock crypto模块
      const crypto = require('crypto');
      const originalCreateDecipheriv = crypto.createDecipheriv;
      crypto.createDecipheriv = vi.fn().mockReturnValue({
        setAutoPadding: vi.fn(),
        update: vi.fn().mockReturnValue('{"nickName":"test",'),
        final: vi.fn().mockReturnValue('"gender":1}'),
      });

      const encryptedData = 'encrypted-data';
      const iv = 'initialization-vector';
      const sessionKey = 'session-key-base64';

      const result = WechatUtils.decryptData(encryptedData, iv, sessionKey);

      expect(result).toEqual({ nickName: 'test', gender: 1 });

      // 恢复原始方法
      crypto.createDecipheriv = originalCreateDecipheriv;
    });

    it('应该处理解密失败的情况', () => {
      const crypto = require('crypto');
      const originalCreateDecipheriv = crypto.createDecipheriv;
      
      crypto.createDecipheriv = vi.fn().mockReturnValue({
        setAutoPadding: vi.fn(),
        update: vi.fn().mockImplementation(() => {
          throw new Error('Decryption failed');
        }),
        final: vi.fn(),
      });

      expect(() => {
        WechatUtils.decryptData('invalid-data', 'invalid-iv', 'invalid-key');
      }).toThrow('解密用户数据失败');

      crypto.createDecipheriv = originalCreateDecipheriv;
    });

    it('应该处理无效的base64数据', () => {
      const invalidBase64Cases = [
        { encryptedData: 'invalid-base64!', iv: 'valid-iv', sessionKey: 'valid-key' },
        { encryptedData: 'valid-data', iv: 'invalid-iv!', sessionKey: 'valid-key' },
        { encryptedData: 'valid-data', iv: 'valid-iv', sessionKey: 'invalid-key!' },
      ];

      invalidBase64Cases.forEach(({ encryptedData, iv, sessionKey }) => {
        expect(() => {
          WechatUtils.decryptData(encryptedData, iv, sessionKey);
        }).toThrow('解密用户数据失败');
      });
    });

    it('应该处理无效的JSON数据', () => {
      const crypto = require('crypto');
      const originalCreateDecipheriv = crypto.createDecipheriv;
      
      crypto.createDecipheriv = vi.fn().mockReturnValue({
        setAutoPadding: vi.fn(),
        update: vi.fn().mockReturnValue('invalid json'),
        final: vi.fn().mockReturnValue(' data'),
      });

      expect(() => {
        WechatUtils.decryptData('encrypted-data', 'iv', 'session-key');
      }).toThrow('解密用户数据失败');

      crypto.createDecipheriv = originalCreateDecipheriv;
    });
  });

  describe('getAccessToken - 访问令牌测试', () => {
    it('应该成功获取访问令牌', async () => {
      const mockResponse = {
        data: {
          access_token: 'test-access-token',
          expires_in: 7200,
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const token = await WechatUtils.getAccessToken();

      expect(token).toBe('test-access-token');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.weixin.qq.com/cgi-bin/token',
        {
          params: {
            grant_type: 'client_credential',
            appid: 'test-app-id',
            secret: 'test-app-secret',
          },
        }
      );
    });

    it('应该处理获取访问令牌的错误', async () => {
      const mockResponse = {
        data: {
          errcode: 40013,
          errmsg: 'invalid appid',
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      await expect(WechatUtils.getAccessToken()).rejects.toThrow('AppID无效');
    });

    it('应该处理网络错误', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network timeout'));
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(WechatUtils.getAccessToken()).rejects.toThrow(
        '获取微信访问令牌失败: Network timeout'
      );
    });
  });

  describe('sendTemplateMessage - 模板消息测试', () => {
    it('应该成功发送模板消息', async () => {
      const mockResponse = {
        data: {
          errcode: 0,
          errmsg: 'ok',
          msgid: 'test-msg-id',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const templateData = {
        first: { value: '您好', color: '#173177' },
        keyword1: { value: '测试内容' },
        keyword2: { value: '2024-01-01' },
        remark: { value: '谢谢使用' },
      };

      await WechatUtils.sendTemplateMessage(
        'test-access-token',
        'test-openid',
        'test-template-id',
        templateData,
        'pages/index/index'
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=test-access-token',
        {
          touser: 'test-openid',
          template_id: 'test-template-id',
          page: 'pages/index/index',
          data: templateData,
        }
      );
    });

    it('应该处理可选的page参数', async () => {
      const mockResponse = {
        data: { errcode: 0, errmsg: 'ok' },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await WechatUtils.sendTemplateMessage(
        'test-access-token',
        'test-openid',
        'test-template-id',
        { keyword1: { value: 'test' } }
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          page: '',
        })
      );
    });

    it('应该处理发送失败的情况', async () => {
      const mockResponse = {
        data: {
          errcode: 40037,
          errmsg: 'invalid template_id',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await expect(
        WechatUtils.sendTemplateMessage(
          'test-access-token',
          'test-openid',
          'invalid-template-id',
          {}
        )
      ).rejects.toThrow('invalid template_id');
    });

    it('应该处理复杂的模板数据', async () => {
      const mockResponse = {
        data: { errcode: 0, errmsg: 'ok' },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const complexTemplateData = {
        first: { value: '您好，用户！', color: '#173177' },
        keyword1: { value: '订单号：12345' },
        keyword2: { value: '金额：￥99.99' },
        keyword3: { value: '时间：2024-01-01 12:00:00' },
        remark: { value: '感谢您的使用！如有问题请联系客服。', color: '#FF0000' },
      };

      await WechatUtils.sendTemplateMessage(
        'test-access-token',
        'test-openid',
        'test-template-id',
        complexTemplateData,
        'pages/order/detail?id=12345'
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: complexTemplateData,
          page: 'pages/order/detail?id=12345',
        })
      );
    });
  });

  describe('generateQRCode - 小程序码生成测试', () => {
    it('应该成功生成小程序码', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data');
      const mockResponse = {
        data: mockImageBuffer,
        headers: { 'content-type': 'image/jpeg' },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await WechatUtils.generateQRCode(
        'test-access-token',
        'scene-data',
        'pages/index/index',
        430
      );

      expect(result).toEqual(mockImageBuffer);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=test-access-token',
        {
          scene: 'scene-data',
          page: 'pages/index/index',
          width: 430,
          auto_color: false,
          line_color: { r: 0, g: 0, b: 0 },
        },
        { responseType: 'arraybuffer' }
      );
    });

    it('应该使用默认参数', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data');
      const mockResponse = {
        data: mockImageBuffer,
        headers: { 'content-type': 'image/jpeg' },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await WechatUtils.generateQRCode('test-access-token', 'scene-data');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          page: 'pages/index/index',
          width: 430,
        }),
        expect.any(Object)
      );
    });

    it('应该处理API错误响应', async () => {
      const errorResponse = {
        data: Buffer.from(JSON.stringify({
          errcode: 45009,
          errmsg: 'reach max api daily quota limit',
        })),
        headers: { 'content-type': 'application/json' },
      };

      mockedAxios.post.mockResolvedValue(errorResponse);

      await expect(
        WechatUtils.generateQRCode('test-access-token', 'scene-data')
      ).rejects.toThrow('reach max api daily quota limit');
    });

    it('应该处理不同的scene数据格式', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data');
      const mockResponse = {
        data: mockImageBuffer,
        headers: { 'content-type': 'image/jpeg' },
      };

      const sceneFormats = [
        'simple-scene',
        'scene-with-special-chars!@#$%',
        '中文场景数据',
        'very-long-scene-data-' + 'a'.repeat(100),
        'scene=value&param=123',
      ];

      for (const scene of sceneFormats) {
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await WechatUtils.generateQRCode('test-access-token', scene);

        expect(result).toEqual(mockImageBuffer);
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ scene }),
          expect.any(Object)
        );
      }
    });

    it('应该处理不同的宽度设置', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data');
      const mockResponse = {
        data: mockImageBuffer,
        headers: { 'content-type': 'image/jpeg' },
      };

      const widths = [280, 430, 1280];

      for (const width of widths) {
        mockedAxios.post.mockResolvedValue(mockResponse);

        await WechatUtils.generateQRCode('test-access-token', 'scene', undefined, width);

        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ width }),
          expect.any(Object)
        );
      }
    });
  });

  describe('checkContent - 内容安全检查测试', () => {
    it('应该通过安全内容检查', async () => {
      const mockResponse = {
        data: {
          errcode: 0,
          errmsg: 'ok',
          result: {
            suggest: 'pass',
            label: 100,
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await WechatUtils.checkContent('test-access-token', '这是安全的内容');

      expect(result).toEqual({
        suggest: 'pass',
        label: 100,
      });
    });

    it('应该检测不安全内容', async () => {
      const mockResponse = {
        data: {
          errcode: 0,
          errmsg: 'ok',
          result: {
            suggest: 'risky',
            label: 20001,
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await WechatUtils.checkContent('test-access-token', '可疑内容');

      expect(result).toEqual({
        suggest: 'risky',
        label: 20001,
      });
    });

    it('应该处理内容检查API错误', async () => {
      const mockResponse = {
        data: {
          errcode: 87014,
          errmsg: 'invalid access_token',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await expect(
        WechatUtils.checkContent('invalid-token', '测试内容')
      ).rejects.toThrow('invalid access_token');
    });

    it('应该处理没有result字段的响应', async () => {
      const mockResponse = {
        data: {
          errcode: 0,
          errmsg: 'ok',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await WechatUtils.checkContent('test-access-token', '测试内容');

      expect(result).toEqual({
        suggest: 'pass',
        label: 100,
      });
    });

    it('应该处理各种类型的内容', async () => {
      const mockResponse = {
        data: {
          errcode: 0,
          errmsg: 'ok',
          result: { suggest: 'pass', label: 100 },
        },
      };

      const contentTypes = [
        '普通文本内容',
        '包含emoji的内容😀🎉',
        '包含特殊字符的内容!@#$%^&*()',
        '很长的内容' + 'a'.repeat(1000),
        '',
        '   ', // 只有空格
      ];

      for (const content of contentTypes) {
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await WechatUtils.checkContent('test-access-token', content);

        expect(result.suggest).toBe('pass');
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          { content }
        );
      }
    });
  });

  describe('validateConfig - 配置验证测试', () => {
    it('应该验证有效的配置', () => {
      const result = WechatUtils.validateConfig();

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('应该检测缺少的配置', async () => {
      // 动态导入并修改配置
      const configModule = await import('../../../src/config/app.config.js');
      const originalWechatConfig = { ...configModule.appConfig.wechat };
      
      // 临时修改配置
      configModule.appConfig.wechat.appId = '';
      configModule.appConfig.wechat.appSecret = '';

      const result = WechatUtils.validateConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('微信AppID未配置');
      expect(result.errors).toContain('微信AppSecret未配置');
      
      // 恢复原始配置
      configModule.appConfig.wechat = originalWechatConfig;
    });
  });

  describe('formatUserInfo - 用户信息格式化测试', () => {
    it('应该格式化完整的用户信息', () => {
      const userInfo = {
        nickName: '测试用户',
        avatarUrl: 'https://example.com/avatar.jpg',
        gender: 1,
        country: '中国',
        province: '广东',
        city: '深圳',
        language: 'zh_CN',
        extraField: 'should be ignored',
      };

      const formatted = WechatUtils.formatUserInfo(userInfo);

      expect(formatted).toEqual({
        nickName: '测试用户',
        avatarUrl: 'https://example.com/avatar.jpg',
        gender: 1,
        country: '中国',
        province: '广东',
        city: '深圳',
        language: 'zh_CN',
      });
    });

    it('应该处理部分用户信息', () => {
      const partialUserInfo = {
        nickName: '测试用户',
        gender: 2,
      };

      const formatted = WechatUtils.formatUserInfo(partialUserInfo);

      expect(formatted).toEqual({
        nickName: '测试用户',
        gender: 2,
        avatarUrl: undefined,
        country: undefined,
        province: undefined,
        city: undefined,
        language: undefined,
      });
    });

    it('应该处理空的用户信息', () => {
      const emptyUserInfo = {};

      const formatted = WechatUtils.formatUserInfo(emptyUserInfo);

      expect(formatted).toEqual({
        nickName: undefined,
        avatarUrl: undefined,
        gender: undefined,
        country: undefined,
        province: undefined,
        city: undefined,
        language: undefined,
      });
    });

    it('应该处理特殊字符和emoji', () => {
      const userInfoWithSpecialChars = {
        nickName: '测试用户😀🎉',
        country: '中国🇨🇳',
        province: '广东省',
        city: '深圳市',
      };

      const formatted = WechatUtils.formatUserInfo(userInfoWithSpecialChars);

      expect(formatted.nickName).toBe('测试用户😀🎉');
      expect(formatted.country).toBe('中国🇨🇳');
    });
  });

  describe('错误处理和边界条件', () => {
    it('应该处理网络超时', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded');
      timeoutError.name = 'TimeoutError';
      
      mockedAxios.get.mockRejectedValue(timeoutError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(WechatUtils.getSessionByCode('test-code')).rejects.toThrow(
        '微信API调用失败: timeout of 5000ms exceeded'
      );
    });

    it('应该处理服务器错误', async () => {
      const serverError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: 'Internal Server Error',
        },
        message: 'Request failed with status code 500',
      };

      mockedAxios.get.mockRejectedValue(serverError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(WechatUtils.getSessionByCode('test-code')).rejects.toThrow(
        '微信API调用失败: Request failed with status code 500'
      );
    });

    it('应该处理非axios错误', async () => {
      const genericError = new Error('Generic error');

      mockedAxios.get.mockRejectedValue(genericError);
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(WechatUtils.getSessionByCode('test-code')).rejects.toThrow(
        'Generic error'
      );
    });
  });

  describe('性能测试', () => {
    it('应该能处理并发请求', async () => {
      const mockResponse = {
        data: {
          openid: 'test-openid',
          session_key: 'test-session-key',
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const promises = Array.from({ length: 10 }, (_, i) =>
        WechatUtils.getSessionByCode(`test-code-${i}`)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.openid).toBe('test-openid');
      });
    });

    it('应该正确处理大量数据', async () => {
      const largeData = 'a'.repeat(10000);
      const mockResponse = {
        data: {
          access_token: 'test-token',
          expires_in: 7200,
        },
      };

      mockedAxios.post.mockResolvedValue({ data: { errcode: 0 } });

      await WechatUtils.sendTemplateMessage(
        'test-token',
        'test-openid',
        'test-template',
        { keyword1: { value: largeData } }
      );

      expect(mockedAxios.post).toHaveBeenCalled();
    });
  });
});