import { PasscodeModel } from '../models/passcode.model.js';
import { UserModel } from '../models/user.model.js';
import { VisitorApplicationModel } from '../models/visitor-application.model.js';
import { PermissionModel } from '../models/permission.model.js';
import { QRCodeUtils } from '../utils/qrcode.js';
import { appConfig } from '../config/app.config.js';
import type { Passcode, PasscodeType, PasscodeStatus } from '../types/index.js';

/**
 * 通行码验证结果接口
 */
export interface PasscodeValidationResult {
  valid: boolean;
  userId?: number;
  userName?: string;
  userType?: string;
  passcodeId?: number;
  permissions?: string[];
  reason?: string;
}

/**
 * 通行码生成选项接口
 */
export interface PasscodeGenerationOptions {
  duration?: number; // 有效期（分钟）
  usageLimit?: number; // 使用次数限制
  permissions?: string[]; // 权限列表
  applicationId?: number; // 关联的访客申请ID
  autoRefresh?: boolean; // 是否自动刷新
  deviceRestriction?: string[]; // 设备限制
}

/**
 * 动态通行码配置接口
 */
export interface DynamicPasscodeConfig {
  refreshInterval: number; // 刷新间隔（分钟）
  timeWindow: number; // 时间窗口（分钟）
  enableTimeBasedCode: boolean; // 是否启用时效性编码
  enableQREncryption: boolean; // 是否启用二维码加密
}

/**
 * 通行码服务类
 * 处理通行码生成、验证和管理
 */
export class PasscodeService {
  private static readonly DEFAULT_CONFIG: DynamicPasscodeConfig = {
    refreshInterval: 5, // 5分钟刷新一次
    timeWindow: 5, // 5分钟时间窗口
    enableTimeBasedCode: true,
    enableQREncryption: true,
  };

  constructor() {
    // 使用静态方法，不需要实例化模型
  }

  /**
   * 生成通行码
   */
  static async generatePasscode(
    userId: number,
    type: PasscodeType,
    options: PasscodeGenerationOptions = {}
  ): Promise<Passcode> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 撤销用户现有的活跃通行码（避免重复）
    await PasscodeModel.revokeUserPasscodes(userId);

    // 获取用户权限
    const userPermissions = await this.getUserPermissions(userId, user.user_type);
    
    // 生成唯一的通行码
    const code = await this.generateUniqueCode();
    
    // 设置过期时间
    const duration = options.duration || appConfig.passcode.defaultDuration;
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + duration);

    // 合并权限
    const permissions = [...userPermissions, ...(options.permissions || [])];

    // 创建通行码记录
    const passcodeData: any = {
      user_id: userId,
      code,
      type,
      status: 'active' as const,
      expiry_time: expiryTime.toISOString(),
      usage_limit: options.usageLimit || appConfig.passcode.defaultUsageLimit,
      usage_count: 0,
      permissions: JSON.stringify(permissions),
    };

    if (options.applicationId) {
      passcodeData.application_id = options.applicationId;
    }

    return await PasscodeModel.create(passcodeData);
  }

  /**
   * 生成动态二维码通行码
   */
  static async generateDynamicQRPasscode(
    userId: number,
    type: PasscodeType,
    options: PasscodeGenerationOptions = {}
  ): Promise<{
    passcode: Passcode;
    qrContent: string;
    timeBasedCode?: string;
  }> {
    const passcode = await this.generatePasscode(userId, type, options);
    
    // 获取用户权限
    const permissions = passcode.permissions ? JSON.parse(passcode.permissions) : [];
    
    // 生成加密的二维码内容
    const qrContent = QRCodeUtils.generateQRCodeContent(
      userId,
      type,
      new Date(passcode.expiry_time!),
      permissions
    );

    // 生成时效性通行码（可选）
    let timeBasedCode: string | undefined;
    if (this.DEFAULT_CONFIG.enableTimeBasedCode) {
      timeBasedCode = QRCodeUtils.generateTimeBasedCode(
        passcode.code,
        this.DEFAULT_CONFIG.timeWindow
      );
    }

    const result: {
      passcode: Passcode;
      qrContent: string;
      timeBasedCode?: string;
    } = {
      passcode,
      qrContent,
    };

    if (timeBasedCode) {
      result.timeBasedCode = timeBasedCode;
    }

    return result;
  }

  /**
   * 验证通行码
   */
  static async validatePasscode(code: string, _deviceId?: string): Promise<PasscodeValidationResult> {
    try {
      // 查找通行码
      const passcode = await PasscodeModel.findByCode(code);
      if (!passcode) {
        return {
          valid: false,
          reason: '通行码不存在',
        };
      }

      // 检查通行码状态
      if (passcode.status !== 'active') {
        return {
          valid: false,
          passcodeId: passcode.id,
          reason: '通行码已失效',
        };
      }

      // 检查过期时间
      if (passcode.expiry_time && new Date(passcode.expiry_time) < new Date()) {
        await PasscodeModel.update(passcode.id, { status: 'expired' });
        return {
          valid: false,
          passcodeId: passcode.id,
          reason: '通行码已过期',
        };
      }

      // 检查使用次数
      if (passcode.usage_limit !== null && passcode.usage_limit !== undefined && passcode.usage_count >= passcode.usage_limit) {
        await PasscodeModel.update(passcode.id, { status: 'expired' });
        return {
          valid: false,
          passcodeId: passcode.id,
          reason: '通行码使用次数已达上限',
        };
      }

      // 获取用户信息
      const user = await UserModel.findById(passcode.user_id);
      if (!user) {
        return {
          valid: false,
          passcodeId: passcode.id,
          reason: '用户不存在',
        };
      }

      // 检查用户状态
      if (user.status !== 'active') {
        return {
          valid: false,
          userId: user.id,
          passcodeId: passcode.id,
          reason: '用户账户已被禁用',
        };
      }

      // 更新使用次数
      await PasscodeModel.incrementUsageCount(passcode.id);

      // 解析权限
      const permissions = passcode.permissions ? JSON.parse(passcode.permissions) : [];

      return {
        valid: true,
        userId: user.id,
        userName: user.name,
        userType: user.user_type,
        passcodeId: passcode.id,
        permissions,
      };
    } catch (error) {
      console.error('通行码验证失败:', error);
      return {
        valid: false,
        reason: '系统错误',
      };
    }
  }

  /**
   * 验证时效性通行码
   */
  static async validateTimeBasedPasscode(
    timeBasedCode: string,
    baseCode: string,
    deviceId: string
  ): Promise<PasscodeValidationResult> {
    try {
      // 验证时效性编码
      const isValidTimeCode = QRCodeUtils.validateTimeBasedCode(
        timeBasedCode,
        baseCode,
        this.DEFAULT_CONFIG.timeWindow
      );

      if (!isValidTimeCode) {
        return {
          valid: false,
          reason: '时效性通行码已过期',
        };
      }

      // 验证基础通行码
      return await this.validatePasscode(baseCode, deviceId);
    } catch (error) {
      console.error('时效性通行码验证失败:', error);
      return {
        valid: false,
        reason: '系统错误',
      };
    }
  }

  /**
   * 验证二维码通行码
   */
  static async validateQRPasscode(
    qrContent: string,
    _deviceId?: string
  ): Promise<PasscodeValidationResult> {
    try {
      // 解析二维码内容
      const qrData = QRCodeUtils.parseQRCodeContent(qrContent);
      if (!qrData) {
        return {
          valid: false,
          reason: '二维码格式无效',
        };
      }

      // 检查二维码是否过期
      if (!QRCodeUtils.isQRCodeValid(qrData.expiryTime)) {
        return {
          valid: false,
          reason: '二维码已过期',
        };
      }

      // 验证用户信息
      const user = await UserModel.findById(qrData.userId);
      if (!user) {
        return {
          valid: false,
          reason: '用户不存在',
        };
      }

      if (user.status !== 'active') {
        return {
          valid: false,
          userId: user.id,
          reason: '用户账户已被禁用',
        };
      }

      return {
        valid: true,
        userId: user.id,
        userName: user.name,
        userType: user.user_type,
        permissions: qrData.permissions,
      };
    } catch (error) {
      console.error('二维码通行码验证失败:', error);
      return {
        valid: false,
        reason: '系统错误',
      };
    }
  }

  /**
   * 刷新用户通行码
   */
  static async refreshPasscode(userId: number): Promise<Passcode> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 撤销现有的活跃通行码
    await PasscodeModel.revokeUserPasscodes(userId);

    // 生成新的通行码
    return await this.generatePasscode(userId, user.user_type === 'visitor' ? 'visitor' : 'employee');
  }

  /**
   * 获取用户当前通行码
   */
  static async getCurrentPasscode(userId: number): Promise<Passcode | null> {
    return await PasscodeModel.findActiveByUserId(userId);
  }

  /**
   * 获取通行码信息
   */
  static async getPasscodeInfo(code: string): Promise<any> {
    const passcode = await PasscodeModel.findByCode(code);
    if (!passcode) {
      throw new Error('通行码不存在');
    }

    const user = await UserModel.findById(passcode.user_id);
    
    return {
      id: passcode.id,
      type: passcode.type,
      status: passcode.status,
      expiryTime: passcode.expiry_time,
      usageLimit: passcode.usage_limit,
      usageCount: passcode.usage_count,
      permissions: passcode.permissions ? JSON.parse(passcode.permissions) : [],
      user: user ? {
        id: user.id,
        name: user.name,
        userType: user.user_type,
      } : null,
    };
  }

  /**
   * 获取用户权限
   */
  private static async getUserPermissions(userId: number, userType: string): Promise<string[]> {
    try {
      // 根据用户类型获取权限
      if (userType === 'employee' || userType === 'merchant_admin') {
        const user = await UserModel.findById(userId);
        if (user?.merchant_id) {
          // 获取商户相关权限
          const permissions = await PermissionModel.findByMerchantId(user.merchant_id);
          return permissions.map(p => p.code);
        }
      }
      
      // 访客或其他类型用户的基础权限
      return ['basic_access'];
    } catch (error) {
      console.error('获取用户权限失败:', error);
      return ['basic_access'];
    }
  }

  /**
   * 生成唯一的通行码
   */
  private static async generateUniqueCode(): Promise<string> {
    let code: string;
    let exists: boolean;

    do {
      // 生成随机码
      code = this.generateRandomCode();
      
      // 检查是否已存在
      const existingPasscode = await PasscodeModel.findByCode(code);
      exists = !!existingPasscode;
    } while (exists);

    return code;
  }

  /**
   * 生成随机通行码
   */
  private static generateRandomCode(): string {
    return QRCodeUtils.generateUniqueId();
  }

  /**
   * 生成员工通行码
   */
  static async generateEmployeePasscode(
    userId: number,
    options: PasscodeGenerationOptions = {}
  ): Promise<{
    passcode: Passcode;
    qrContent: string;
    timeBasedCode?: string;
  }> {
    // 员工通行码通常有更长的有效期
    const employeeOptions = {
      duration: 480, // 8小时
      usageLimit: 50, // 更多使用次数
      ...options,
    };

    return await this.generateDynamicQRPasscode(userId, 'employee', employeeOptions);
  }

  /**
   * 生成访客通行码
   */
  static async generateVisitorPasscode(
    userId: number,
    applicationId: number,
    options: PasscodeGenerationOptions = {}
  ): Promise<{
    passcode: Passcode;
    qrContent: string;
    timeBasedCode?: string;
  }> {
    // 访客通行码通常有限制
    const visitorOptions = {
      duration: 120, // 2小时
      usageLimit: 5, // 限制使用次数
      applicationId,
      ...options,
    };

    return await this.generateDynamicQRPasscode(userId, 'visitor', visitorOptions);
  }

  /**
   * 为访客申请生成通行码
   */
  static async generateVisitorPasscodeFromApplication(applicationId: number): Promise<{
    passcode: Passcode;
    qrContent: string;
    timeBasedCode?: string;
  }> {
    const application = await VisitorApplicationModel.findById(applicationId);
    if (!application) {
      throw new Error('访客申请不存在');
    }

    if (application.status !== 'approved') {
      throw new Error('访客申请未通过审批');
    }

    // 计算通行码有效期（从预约时间开始，持续访问时长）
    const scheduledTime = new Date(application.scheduled_time);
    const expiryTime = new Date(scheduledTime.getTime() + application.duration * 60 * 60 * 1000);
    const duration = Math.ceil((expiryTime.getTime() - Date.now()) / (1000 * 60));

    return await this.generateVisitorPasscode(
      application.applicant_id,
      applicationId,
      {
        duration: Math.max(duration, 30), // 至少30分钟
        usageLimit: application.usage_limit,
      }
    );
  }

  /**
   * 批量生成通行码
   */
  static async batchGeneratePasscodes(
    userIds: number[],
    type: PasscodeType,
    options: PasscodeGenerationOptions = {}
  ): Promise<Passcode[]> {
    const passcodes: Passcode[] = [];
    
    for (const userId of userIds) {
      try {
        const passcode = await this.generatePasscode(userId, type, options);
        passcodes.push(passcode);
      } catch (error) {
        console.error(`为用户 ${userId} 生成通行码失败:`, error);
        // 继续处理其他用户
      }
    }
    
    return passcodes;
  }

  /**
   * 清理过期通行码
   */
  static async cleanupExpiredPasscodes(): Promise<number> {
    return await PasscodeModel.cleanupExpired();
  }

  /**
   * 获取通行码统计信息
   */
  static async getPasscodeStatistics(conditions?: {
    userId?: number;
    type?: PasscodeType;
    status?: PasscodeStatus;
  }): Promise<{
    total: number;
    active: number;
    expired: number;
    revoked: number;
  }> {
    const total = await PasscodeModel.count(conditions);
    const active = await PasscodeModel.count({ ...conditions, status: 'active' });
    const expired = await PasscodeModel.count({ ...conditions, status: 'expired' });
    const revoked = await PasscodeModel.count({ ...conditions, status: 'revoked' });

    return { total, active, expired, revoked };
  }
}