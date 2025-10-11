import axios from 'axios';
import { appConfig } from '../config/app.config.js';

/**
 * 微信用户信息接口
 */
export interface WechatUserInfo {
  openid: string;
  unionid?: string;
  session_key: string;
  errcode?: number;
  errmsg?: string;
}

/**
 * 微信小程序登录响应接口
 */
export interface WechatLoginResponse {
  openid: string;
  session_key: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

/**
 * 微信API错误接口
 */
export interface WechatApiError {
  errcode: number;
  errmsg: string;
}

/**
 * 微信工具类
 * 提供微信小程序相关的API调用功能
 */
export class WechatUtils {
  private static readonly API_BASE_URL = 'https://api.weixin.qq.com';

  /**
   * 通过code获取用户openId和session_key
   */
  static async getSessionByCode(code: string): Promise<WechatUserInfo> {
    try {
      const url = `${this.API_BASE_URL}/sns/jscode2session`;
      const params = {
        appid: appConfig.wechat.appId,
        secret: appConfig.wechat.appSecret,
        js_code: code,
        grant_type: 'authorization_code',
      };

      const response = await axios.get<WechatLoginResponse>(url, { params });
      const data = response.data;

      // 检查微信API错误
      if (data.errcode) {
        throw new Error(this.getErrorMessage(data.errcode, data.errmsg));
      }

      if (!data.openid || !data.session_key) {
        throw new Error('微信登录失败：未获取到有效的用户信息');
      }

      return {
        openid: data.openid,
        session_key: data.session_key,
        ...(data.unionid && { unionid: data.unionid }),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`微信API调用失败: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 验证用户数据签名
   */
  static verifySignature(
    rawData: string,
    signature: string,
    sessionKey: string
  ): boolean {
    const crypto = require('crypto');
    const sha1 = crypto.createHash('sha1');
    sha1.update(rawData + sessionKey);
    const calculatedSignature = sha1.digest('hex');
    
    return calculatedSignature === signature;
  }

  /**
   * 解密用户敏感数据
   */
  static decryptData(
    encryptedData: string,
    iv: string,
    sessionKey: string
  ): any {
    const crypto = require('crypto');
    
    try {
      const sessionKeyBuffer = Buffer.from(sessionKey, 'base64');
      const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
      const ivBuffer = Buffer.from(iv, 'base64');
      
      const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuffer, ivBuffer);
      decipher.setAutoPadding(true);
      
      let decrypted = decipher.update(encryptedDataBuffer, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error('解密用户数据失败');
    }
  }

  /**
   * 获取微信访问令牌
   */
  static async getAccessToken(): Promise<string> {
    try {
      const url = `${this.API_BASE_URL}/cgi-bin/token`;
      const params = {
        grant_type: 'client_credential',
        appid: appConfig.wechat.appId,
        secret: appConfig.wechat.appSecret,
      };

      const response = await axios.get(url, { params });
      const data = response.data;

      if (data.errcode) {
        throw new Error(this.getErrorMessage(data.errcode, data.errmsg));
      }

      return data.access_token;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`获取微信访问令牌失败: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 发送模板消息
   */
  static async sendTemplateMessage(
    accessToken: string,
    openId: string,
    templateId: string,
    data: Record<string, { value: string; color?: string }>,
    page?: string
  ): Promise<void> {
    try {
      const url = `${this.API_BASE_URL}/cgi-bin/message/wxopen/template/send?access_token=${accessToken}`;
      
      const payload = {
        touser: openId,
        template_id: templateId,
        page: page || '',
        data,
      };

      const response = await axios.post(url, payload);
      const result = response.data;

      if (result.errcode && result.errcode !== 0) {
        throw new Error(this.getErrorMessage(result.errcode, result.errmsg));
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`发送模板消息失败: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 生成小程序码
   */
  static async generateQRCode(
    accessToken: string,
    scene: string,
    page?: string,
    width: number = 430
  ): Promise<Buffer> {
    try {
      const url = `${this.API_BASE_URL}/wxa/getwxacodeunlimit?access_token=${accessToken}`;
      
      const payload = {
        scene,
        page: page || 'pages/index/index',
        width,
        auto_color: false,
        line_color: { r: 0, g: 0, b: 0 },
      };

      const response = await axios.post(url, payload, {
        responseType: 'arraybuffer',
      });

      // 检查是否返回错误信息
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        const errorData = JSON.parse(response.data.toString());
        throw new Error(this.getErrorMessage(errorData.errcode, errorData.errmsg));
      }

      return Buffer.from(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`生成小程序码失败: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 检查文本内容是否合规
   */
  static async checkContent(
    accessToken: string,
    content: string
  ): Promise<{ suggest: string; label: number }> {
    try {
      const url = `${this.API_BASE_URL}/wxa/msg_sec_check?access_token=${accessToken}`;
      
      const payload = {
        content,
      };

      const response = await axios.post(url, payload);
      const data = response.data;

      if (data.errcode && data.errcode !== 0) {
        throw new Error(this.getErrorMessage(data.errcode, data.errmsg));
      }

      return {
        suggest: data.result?.suggest || 'pass',
        label: data.result?.label || 100,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`内容安全检查失败: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 获取微信错误信息
   */
  private static getErrorMessage(errcode: number, errmsg?: string): string {
    const errorMessages: Record<number, string> = {
      40013: 'AppID无效',
      40014: 'AppSecret无效',
      40029: 'code无效',
      45011: 'API调用太频繁，请稍候再试',
      40226: '高风险等级用户，小程序登录拦截',
      [-1]: '系统繁忙，此时请开发者稍候再试',
    };

    return errorMessages[errcode] || errmsg || `微信API错误: ${errcode}`;
  }

  /**
   * 验证微信配置
   */
  static validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!appConfig.wechat.appId) {
      errors.push('微信AppID未配置');
    }

    if (!appConfig.wechat.appSecret) {
      errors.push('微信AppSecret未配置');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 格式化微信用户信息
   */
  static formatUserInfo(userInfo: any): {
    nickName?: string;
    avatarUrl?: string;
    gender?: number;
    country?: string;
    province?: string;
    city?: string;
    language?: string;
  } {
    return {
      nickName: userInfo.nickName,
      avatarUrl: userInfo.avatarUrl,
      gender: userInfo.gender,
      country: userInfo.country,
      province: userInfo.province,
      city: userInfo.city,
      language: userInfo.language,
    };
  }
}