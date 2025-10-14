import { UserModel } from '../models/index.js';
import type { User } from '../types/index.js';

/**
 * 通知服务
 * 提供各种通知发送功能
 */
export class NotificationService {
  constructor() {
    // 不需要创建UserModel实例，直接使用静态方法
  }

  /**
   * 发送访客审批通过通知
   */
  async sendVisitorApprovalNotification(
    userId: number,
    data: {
      applicationId: number;
      visitorName: string;
      merchantName: string;
      scheduledTime: string;
      passcode: string;
      passcodeExpiry: string;
      usageLimit: number;
      note?: string;
    }
  ): Promise<boolean> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 构建通知消息
      const message = this.buildApprovalMessage(data);

      // 发送微信模板消息
      if (user.open_id) {
        await this.sendWechatTemplateMessage(user.open_id, {
          template_id: 'visitor_approval_template',
          data: {
            visitor_name: { value: data.visitorName },
            merchant_name: { value: data.merchantName },
            scheduled_time: { value: this.formatDateTime(data.scheduledTime) },
            passcode: { value: data.passcode },
            expiry_time: { value: this.formatDateTime(data.passcodeExpiry) },
            usage_limit: { value: data.usageLimit.toString() },
            note: { value: data.note || '无' }
          }
        });
      }

      // 发送短信通知（如果有手机号）
      if (user.phone) {
        await this.sendSMSNotification(user.phone, message);
      }

      return true;
    } catch (error) {
      console.error('发送访客审批通知失败:', error);
      return false;
    }
  }

  /**
   * 发送访客申请被拒绝通知
   */
  async sendVisitorRejectionNotification(
    userId: number,
    data: {
      applicationId: number;
      visitorName: string;
      merchantName: string;
      scheduledTime: string;
      rejectionReason: string;
    }
  ): Promise<boolean> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 构建通知消息
      const message = this.buildRejectionMessage(data);

      // 发送微信模板消息
      if (user.open_id) {
        await this.sendWechatTemplateMessage(user.open_id, {
          template_id: 'visitor_rejection_template',
          data: {
            visitor_name: { value: data.visitorName },
            merchant_name: { value: data.merchantName },
            scheduled_time: { value: this.formatDateTime(data.scheduledTime) },
            rejection_reason: { value: data.rejectionReason }
          }
        });
      }

      // 发送短信通知（如果有手机号）
      if (user.phone) {
        await this.sendSMSNotification(user.phone, message);
      }

      return true;
    } catch (error) {
      console.error('发送访客拒绝通知失败:', error);
      return false;
    }
  }

  /**
   * 发送员工申请审批通知
   */
  async sendEmployeeApprovalNotification(
    userId: number,
    data: {
      employeeName: string;
      merchantName: string;
      status: 'approved' | 'rejected';
      reason?: string;
    }
  ): Promise<boolean> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      const message = data.status === 'approved' 
        ? `恭喜！您的员工申请已通过审批。商户：${data.merchantName}，您现在可以使用员工通行码进入办公区域。`
        : `很抱歉，您的员工申请被拒绝。商户：${data.merchantName}，拒绝原因：${data.reason || '未提供'}`;

      // 发送微信模板消息
      if (user.open_id) {
        await this.sendWechatTemplateMessage(user.open_id, {
          template_id: 'employee_approval_template',
          data: {
            employee_name: { value: data.employeeName },
            merchant_name: { value: data.merchantName },
            status: { value: data.status === 'approved' ? '通过' : '拒绝' },
            reason: { value: data.reason || '无' }
          }
        });
      }

      // 发送短信通知（如果有手机号）
      if (user.phone) {
        await this.sendSMSNotification(user.phone, message);
      }

      return true;
    } catch (error) {
      console.error('发送员工审批通知失败:', error);
      return false;
    }
  }

  /**
   * 发送通行码即将过期通知
   */
  async sendPasscodeExpiryNotification(
    userId: number,
    data: {
      passcode: string;
      expiryTime: string;
      type: 'employee' | 'visitor';
    }
  ): Promise<boolean> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      const typeText = data.type === 'employee' ? '员工' : '访客';
      const message = `您的${typeText}通行码即将过期，过期时间：${this.formatDateTime(data.expiryTime)}，请及时使用或申请新的通行码。`;

      // 发送微信模板消息
      if (user.open_id) {
        await this.sendWechatTemplateMessage(user.open_id, {
          template_id: 'passcode_expiry_template',
          data: {
            type: { value: typeText },
            passcode: { value: data.passcode },
            expiry_time: { value: this.formatDateTime(data.expiryTime) }
          }
        });
      }

      // 发送短信通知（如果有手机号）
      if (user.phone) {
        await this.sendSMSNotification(user.phone, message);
      }

      return true;
    } catch (error) {
      console.error('发送通行码过期通知失败:', error);
      return false;
    }
  }

  /**
   * 发送新访客申请通知给商户管理员
   */
  async sendNewVisitorApplicationNotification(
    merchantId: number,
    data: {
      applicationId: number;
      visitorName: string;
      visitorPhone: string;
      visitPurpose: string;
      scheduledTime: string;
      applicantName: string;
    }
  ): Promise<boolean> {
    try {
      // 获取商户的管理员用户
      const admins = await UserModel.findByMerchantId(merchantId);
      const merchantAdmins = admins.filter(user => 
        user.user_type === 'merchant_admin' && user.status === 'active'
      );

      if (merchantAdmins.length === 0) {
        console.warn(`商户 ${merchantId} 没有有效的管理员用户`);
        return false;
      }

      const message = `新的访客申请待审批：访客 ${data.visitorName}（${data.visitorPhone}）申请访问，目的：${data.visitPurpose}，预约时间：${this.formatDateTime(data.scheduledTime)}，申请人：${data.applicantName}`;

      // 向所有管理员发送通知
      const notifications = merchantAdmins.map(async (admin) => {
        try {
          // 发送微信模板消息
          if (admin.open_id) {
            await this.sendWechatTemplateMessage(admin.open_id, {
              template_id: 'new_visitor_application_template',
              data: {
                visitor_name: { value: data.visitorName },
                visitor_phone: { value: data.visitorPhone },
                visit_purpose: { value: data.visitPurpose },
                scheduled_time: { value: this.formatDateTime(data.scheduledTime) },
                applicant_name: { value: data.applicantName }
              }
            });
          }

          // 发送短信通知（如果有手机号）
          if (admin.phone) {
            await this.sendSMSNotification(admin.phone, message);
          }

          return true;
        } catch (error) {
          console.error(`向管理员 ${admin.id} 发送通知失败:`, error);
          return false;
        }
      });

      const results = await Promise.all(notifications);
      return results.some(result => result); // 只要有一个成功就返回true
    } catch (error) {
      console.error('发送新访客申请通知失败:', error);
      return false;
    }
  }

  /**
   * 发送微信模板消息
   */
  private async sendWechatTemplateMessage(
    openId: string,
    templateData: {
      template_id: string;
      data: Record<string, { value: string; color?: string }>;
    }
  ): Promise<boolean> {
    try {
      // 这里应该调用微信API发送模板消息
      // 由于是MVP版本，暂时只记录日志
      console.log('发送微信模板消息:', {
        openId,
        templateData
      });

      // TODO: 实现真实的微信模板消息发送
      // const wechatService = new WechatService();
      // await wechatService.sendTemplateMessage(openId, templateData);

      return true;
    } catch (error) {
      console.error('发送微信模板消息失败:', error);
      return false;
    }
  }

  /**
   * 发送短信通知
   */
  private async sendSMSNotification(phone: string, message: string): Promise<boolean> {
    try {
      // 这里应该调用短信服务API
      // 由于是MVP版本，暂时只记录日志
      console.log('发送短信通知:', {
        phone,
        message
      });

      // TODO: 实现真实的短信发送
      // const smsService = new SMSService();
      // await smsService.sendMessage(phone, message);

      return true;
    } catch (error) {
      console.error('发送短信通知失败:', error);
      return false;
    }
  }

  /**
   * 构建访客审批通过消息
   */
  private buildApprovalMessage(data: {
    visitorName: string;
    merchantName: string;
    scheduledTime: string;
    passcode: string;
    passcodeExpiry: string;
    usageLimit: number;
    note?: string;
  }): string {
    let message = `访客申请已通过审批！\n`;
    message += `访客：${data.visitorName}\n`;
    message += `商户：${data.merchantName}\n`;
    message += `预约时间：${this.formatDateTime(data.scheduledTime)}\n`;
    message += `通行码：${data.passcode}\n`;
    message += `有效期至：${this.formatDateTime(data.passcodeExpiry)}\n`;
    message += `使用次数：${data.usageLimit}次\n`;
    
    if (data.note) {
      message += `备注：${data.note}\n`;
    }
    
    message += `请按时到达并出示通行码。`;
    
    return message;
  }

  /**
   * 构建访客申请被拒绝消息
   */
  private buildRejectionMessage(data: {
    visitorName: string;
    merchantName: string;
    scheduledTime: string;
    rejectionReason: string;
  }): string {
    let message = `很抱歉，访客申请被拒绝。\n`;
    message += `访客：${data.visitorName}\n`;
    message += `商户：${data.merchantName}\n`;
    message += `预约时间：${this.formatDateTime(data.scheduledTime)}\n`;
    message += `拒绝原因：${data.rejectionReason}\n`;
    message += `如有疑问，请联系相关商户。`;
    
    return message;
  }

  /**
   * 格式化日期时间
   */
  private formatDateTime(dateTimeString: string): string {
    const date = new Date(dateTimeString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Shanghai'
    });
  }

  /**
   * 批量发送通知
   */
  async sendBatchNotifications(
    notifications: Array<{
      userId: number;
      type: 'visitor_approval' | 'visitor_rejection' | 'employee_approval' | 'passcode_expiry';
      data: any;
    }>
  ): Promise<{
    success: number;
    failed: number;
    results: Array<{ userId: number; success: boolean; error?: string }>;
  }> {
    const results: Array<{ userId: number; success: boolean; error?: string }> = [];
    let successCount = 0;
    let failedCount = 0;

    for (const notification of notifications) {
      try {
        let success = false;

        switch (notification.type) {
          case 'visitor_approval':
            success = await this.sendVisitorApprovalNotification(notification.userId, notification.data);
            break;
          case 'visitor_rejection':
            success = await this.sendVisitorRejectionNotification(notification.userId, notification.data);
            break;
          case 'employee_approval':
            success = await this.sendEmployeeApprovalNotification(notification.userId, notification.data);
            break;
          case 'passcode_expiry':
            success = await this.sendPasscodeExpiryNotification(notification.userId, notification.data);
            break;
          default:
            throw new Error(`不支持的通知类型: ${notification.type}`);
        }

        if (success) {
          successCount++;
        } else {
          failedCount++;
        }

        results.push({
          userId: notification.userId,
          success
        });
      } catch (error) {
        failedCount++;
        results.push({
          userId: notification.userId,
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return {
      success: successCount,
      failed: failedCount,
      results
    };
  }

  /**
   * 发送系统维护通知
   */
  async sendSystemMaintenanceNotification(
    userIds: number[],
    data: {
      title: string;
      content: string;
      startTime: string;
      endTime: string;
    }
  ): Promise<boolean> {
    try {
      const message = `系统维护通知：${data.title}\n${data.content}\n维护时间：${this.formatDateTime(data.startTime)} 至 ${this.formatDateTime(data.endTime)}`;

      const notifications = userIds.map(async (userId) => {
        try {
          const user = await UserModel.findById(userId);
          if (!user) return false;

          // 发送微信模板消息
          if (user.open_id) {
            await this.sendWechatTemplateMessage(user.open_id, {
              template_id: 'system_maintenance_template',
              data: {
                title: { value: data.title },
                content: { value: data.content },
                start_time: { value: this.formatDateTime(data.startTime) },
                end_time: { value: this.formatDateTime(data.endTime) }
              }
            });
          }

          // 发送短信通知（如果有手机号）
          if (user.phone) {
            await this.sendSMSNotification(user.phone, message);
          }

          return true;
        } catch (error) {
          console.error(`向用户 ${userId} 发送维护通知失败:`, error);
          return false;
        }
      });

      const results = await Promise.all(notifications);
      return results.some(result => result);
    } catch (error) {
      console.error('发送系统维护通知失败:', error);
      return false;
    }
  }
}