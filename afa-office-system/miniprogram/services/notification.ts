// 通知服务
export interface NotificationData {
  title: string;
  content: string;
  type: 'success' | 'info' | 'warning' | 'error';
  applicationId?: number;
  timestamp: string;
}

class NotificationService {
  // 发送通知给访客
  async sendVisitorNotification(data: NotificationData): Promise<void> {
    try {
      // 在实际应用中，这里会调用微信小程序的模板消息或订阅消息
      console.log('发送访客通知:', data);
      
      // 模拟发送通知
      if (wx && wx.showToast) {
        wx.showToast({
          title: data.title,
          icon: data.type === 'success' ? 'success' : 'none',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('发送通知失败:', error);
    }
  }

  // 创建申请提交成功通知
  createApplicationSubmittedNotification(applicationId: number): NotificationData {
    return {
      title: '申请提交成功',
      content: '您的访客申请已提交，请等待商户审批',
      type: 'success',
      applicationId,
      timestamp: new Date().toISOString()
    };
  }

  // 创建申请审批通过通知
  createApplicationApprovedNotification(applicationId: number): NotificationData {
    return {
      title: '申请审批通过',
      content: '您的访客申请已通过审批，可以查看通行码了',
      type: 'success',
      applicationId,
      timestamp: new Date().toISOString()
    };
  }

  // 创建申请被拒绝通知
  createApplicationRejectedNotification(applicationId: number, reason?: string): NotificationData {
    let content = '您的访客申请被拒绝，请联系商户了解详情';
    
    if (reason) {
      // 清理HTML标签和脚本
      const sanitizedReason = this.sanitizeContent(reason);
      // 限制长度 - 确保总长度不超过104字符
      // "拒绝原因：" 占5个字符，所以reason部分最多99个字符
      const maxReasonLength = 99;
      const truncatedReason = sanitizedReason.length > maxReasonLength 
        ? sanitizedReason.substring(0, maxReasonLength - 3) + '...' 
        : sanitizedReason;
      content = `拒绝原因：${truncatedReason}`;
    }
    
    return {
      title: '申请被拒绝',
      content,
      type: 'error',
      applicationId,
      timestamp: new Date().toISOString()
    };
  }

  // 清理内容中的HTML标签和脚本
  private sanitizeContent(content: string): string {
    if (!content || typeof content !== 'string') {
      return '';
    }
    
    // 移除HTML标签和script内容
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '');
  }

  // 创建通行码即将过期通知
  createPasscodeExpiringNotification(applicationId: number, expiryTime: string): NotificationData {
    return {
      title: '通行码即将过期',
      content: `您的通行码将在 ${expiryTime} 过期，请及时使用`,
      type: 'warning',
      applicationId,
      timestamp: new Date().toISOString()
    };
  }
}

export default new NotificationService();
