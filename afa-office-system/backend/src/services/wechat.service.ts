import { WechatUtils } from '../utils/wechat.js';
import { UserModel } from '../models/index.js';
import type { User, UserType } from '../types/index.js';

/**
 * 微信用户注册数据接口
 */
export interface WechatUserRegistration {
  openId: string;
  unionId?: string;
  userType: UserType;
  userInfo?: {
    nickName?: string;
    avatarUrl?: string;
    gender?: number;
    country?: string;
    province?: string;
    city?: string;
    language?: string;
  };
  merchantId?: number; // 员工注册时需要指定商户ID
}

/**
 * 微信登录结果接口
 */
export interface WechatLoginResult {
  user: User;
  isNewUser: boolean;
  sessionKey: string;
}

/**
 * 微信服务类
 * 处理微信小程序相关的业务逻辑
 */
export class WechatService {
  constructor() {
  }

  /**
   * 处理微信登录流程
   */
  async handleWechatLogin(code: string, userType: UserType): Promise<WechatLoginResult> {
    // 验证微信配置
    const configValidation = WechatUtils.validateConfig();
    if (!configValidation.isValid) {
      throw new Error(`微信配置错误: ${configValidation.errors.join(', ')}`);
    }

    // 通过code获取微信用户信息
    const wechatUserInfo = await WechatUtils.getSessionByCode(code);

    // 查找现有用户
    let user = await UserModel.findByOpenId(wechatUserInfo.openid);
    let isNewUser = false;

    if (!user) {
      // 新用户注册
      const userData: Omit<User, 'id' | 'created_at' | 'updated_at'> = {
        open_id: wechatUserInfo.openid,
        name: '微信用户',
        user_type: userType,
        status: 'active' as const,
      };

      // 只添加有值的可选字段
      if (wechatUserInfo.unionid) {
        userData.union_id = wechatUserInfo.unionid;
      }

      user = await UserModel.create(userData);
      
      if (!user) {
        throw new Error('用户创建失败');
      }
      
      isNewUser = true;
    } else {
      // 检查用户类型是否匹配
      if (user.user_type !== userType) {
        throw new Error(`用户类型不匹配，当前用户是${this.getUserTypeDisplayName(user.user_type)}`);
      }

      // 检查用户状态
      if (user.status !== 'active') {
        throw new Error('账户已被禁用，请联系管理员');
      }
    }

    return {
      user,
      isNewUser,
      sessionKey: wechatUserInfo.session_key,
    };
  }

  /**
   * 注册新的微信用户
   */
  async registerWechatUser(registrationData: WechatUserRegistration): Promise<User> {
    const { openId, unionId, userType, userInfo, merchantId } = registrationData;

    // 检查用户是否已存在
    const existingUser = await UserModel.findByOpenId(openId);
    if (existingUser) {
      throw new Error('用户已存在');
    }

    // 验证员工注册时必须提供商户ID
    if (userType === 'employee' && !merchantId) {
      throw new Error('员工注册必须指定所属商户');
    }

    // 构建用户数据
    const userData: Omit<User, 'id' | 'created_at' | 'updated_at'> = {
      open_id: openId,
      name: userInfo?.nickName || '微信用户',
      user_type: userType,
      status: userType === 'employee' ? 'pending' as const : 'active' as const, // 员工需要审批
    };

    // 只添加有值的可选字段
    if (unionId) {
      userData.union_id = unionId;
    }
    if (userInfo?.avatarUrl) {
      userData.avatar = userInfo.avatarUrl;
    }
    if (merchantId) {
      userData.merchant_id = merchantId;
    }

    const user = await UserModel.create(userData);
    
    if (!user) {
      throw new Error('用户创建失败');
    }

    return user;
  }

  /**
   * 更新用户微信信息
   */
  async updateWechatUserInfo(
    userId: number,
    userInfo: {
      nickName?: string;
      avatarUrl?: string;
      gender?: number;
      country?: string;
      province?: string;
      city?: string;
      language?: string;
    }
  ): Promise<User> {
    const updateData: Partial<User> = {};

    if (userInfo.nickName) {
      updateData.name = userInfo.nickName;
    }

    if (userInfo.avatarUrl) {
      updateData.avatar = userInfo.avatarUrl;
    }

    if (Object.keys(updateData).length === 0) {
      // 没有需要更新的数据，直接返回当前用户
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }
      return user;
    }

    return await UserModel.update(userId, updateData);
  }

  /**
   * 验证用户数据签名
   */
  validateUserDataSignature(
    rawData: string,
    signature: string,
    sessionKey: string
  ): boolean {
    return WechatUtils.verifySignature(rawData, signature, sessionKey);
  }

  /**
   * 解密用户敏感数据
   */
  decryptUserData(
    encryptedData: string,
    iv: string,
    sessionKey: string
  ): any {
    return WechatUtils.decryptData(encryptedData, iv, sessionKey);
  }

  /**
   * 发送模板消息
   */
  async sendTemplateMessage(
    openId: string,
    templateId: string,
    data: Record<string, { value: string; color?: string }>,
    page?: string
  ): Promise<void> {
    try {
      const accessToken = await WechatUtils.getAccessToken();
      await WechatUtils.sendTemplateMessage(accessToken, openId, templateId, data, page);
    } catch (error) {
      console.error('发送模板消息失败:', error);
      throw new Error('发送通知失败');
    }
  }

  /**
   * 生成小程序码
   */
  async generateMiniProgramCode(
    scene: string,
    page?: string,
    width: number = 430
  ): Promise<Buffer> {
    try {
      const accessToken = await WechatUtils.getAccessToken();
      return await WechatUtils.generateQRCode(accessToken, scene, page, width);
    } catch (error) {
      console.error('生成小程序码失败:', error);
      throw new Error('生成小程序码失败');
    }
  }

  /**
   * 检查内容安全
   */
  async checkContentSecurity(content: string): Promise<boolean> {
    try {
      const accessToken = await WechatUtils.getAccessToken();
      const result = await WechatUtils.checkContent(accessToken, content);
      
      // suggest: 'pass' 表示内容安全，'review' 表示需要人工审核，'risky' 表示有风险
      return result.suggest === 'pass';
    } catch (error) {
      console.error('内容安全检查失败:', error);
      // 检查失败时默认通过，避免影响正常业务
      return true;
    }
  }

  /**
   * 获取用户类型显示名称
   */
  private getUserTypeDisplayName(userType: UserType): string {
    const displayNames: Record<UserType, string> = {
      tenant_admin: '租务管理员',
      merchant_admin: '商户管理员',
      employee: '员工',
      visitor: '访客',
    };

    return displayNames[userType] || userType;
  }

  /**
   * 验证用户类型权限
   */
  validateUserTypePermission(userType: UserType, targetUserType: UserType): boolean {
    // 租务管理员可以管理所有类型用户
    if (userType === 'tenant_admin') {
      return true;
    }

    // 商户管理员可以管理员工和访客
    if (userType === 'merchant_admin') {
      return ['employee', 'visitor'].includes(targetUserType);
    }

    // 员工只能管理访客
    if (userType === 'employee') {
      return targetUserType === 'visitor';
    }

    // 访客不能管理其他用户
    return false;
  }

  /**
   * 获取微信服务状态
   */
  async getServiceStatus(): Promise<{
    status: 'healthy' | 'error';
    config: { isValid: boolean; errors: string[] };
    connectivity?: boolean;
    timestamp: string;
  }> {
    const config = WechatUtils.validateConfig();
    let connectivity = false;

    if (config.isValid) {
      try {
        // 尝试获取访问令牌来测试连通性
        await WechatUtils.getAccessToken();
        connectivity = true;
      } catch (error) {
        console.warn('微信API连通性测试失败:', error);
      }
    }

    return {
      status: config.isValid && connectivity ? 'healthy' : 'error',
      config,
      connectivity,
      timestamp: new Date().toISOString(),
    };
  }
}