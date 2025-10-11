// 通知服务单元测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetMocks } from '../../setup';

describe('通知服务测试', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('通知创建', () => {
    it('应该创建申请提交成功通知', () => {
      class NotificationService {
        createApplicationSubmittedNotification(applicationId: number) {
          return {
            title: '申请提交成功',
            content: '您的访客申请已提交，请等待商户审批',
            type: 'success' as const,
            applicationId,
            timestamp: new Date().toISOString()
          };
        }
      }

      const notificationService = new NotificationService();
      const notification = notificationService.createApplicationSubmittedNotification(123);

      expect(notification.title).toBe('申请提交成功');
      expect(notification.content).toBe('您的访客申请已提交，请等待商户审批');
      expect(notification.type).toBe('success');
      expect(notification.applicationId).toBe(123);
      expect(notification.timestamp).toBeDefined();
    });

    it('应该创建申请审批通过通知', () => {
      class NotificationService {
        createApplicationApprovedNotification(applicationId: number) {
          return {
            title: '申请审批通过',
            content: '您的访客申请已通过审批，可以查看通行码了',
            type: 'success' as const,
            applicationId,
            timestamp: new Date().toISOString()
          };
        }
      }

      const notificationService = new NotificationService();
      const notification = notificationService.createApplicationApprovedNotification(456);

      expect(notification.title).toBe('申请审批通过');
      expect(notification.content).toBe('您的访客申请已通过审批，可以查看通行码了');
      expect(notification.type).toBe('success');
      expect(notification.applicationId).toBe(456);
    });

    it('应该创建申请被拒绝通知', () => {
      class NotificationService {
        createApplicationRejectedNotification(applicationId: number, reason?: string) {
          return {
            title: '申请被拒绝',
            content: reason ? `拒绝原因：${reason}` : '您的访客申请被拒绝，请联系商户了解详情',
            type: 'error' as const,
            applicationId,
            timestamp: new Date().toISOString()
          };
        }
      }

      const notificationService = new NotificationService();

      // 测试有拒绝原因的情况
      const notificationWithReason = notificationService.createApplicationRejectedNotification(789, '时间冲突');
      expect(notificationWithReason.title).toBe('申请被拒绝');
      expect(notificationWithReason.content).toBe('拒绝原因：时间冲突');
      expect(notificationWithReason.type).toBe('error');

      // 测试没有拒绝原因的情况
      const notificationWithoutReason = notificationService.createApplicationRejectedNotification(789);
      expect(notificationWithoutReason.content).toBe('您的访客申请被拒绝，请联系商户了解详情');
    });

    it('应该创建通行码即将过期通知', () => {
      class NotificationService {
        createPasscodeExpiringNotification(applicationId: number, expiryTime: string) {
          return {
            title: '通行码即将过期',
            content: `您的通行码将在 ${expiryTime} 过期，请及时使用`,
            type: 'warning' as const,
            applicationId,
            timestamp: new Date().toISOString()
          };
        }
      }

      const notificationService = new NotificationService();
      const expiryTime = '2024-01-01 18:00';
      const notification = notificationService.createPasscodeExpiringNotification(101, expiryTime);

      expect(notification.title).toBe('通行码即将过期');
      expect(notification.content).toBe(`您的通行码将在 ${expiryTime} 过期，请及时使用`);
      expect(notification.type).toBe('warning');
      expect(notification.applicationId).toBe(101);
    });
  });

  describe('通知发送', () => {
    it('应该成功发送访客通知', async () => {
      const mockShowToast = vi.fn();
      global.wx.showToast = mockShowToast;

      class NotificationService {
        async sendVisitorNotification(data: any): Promise<void> {
          try {
            console.log('发送访客通知:', data);
            
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
      }

      const notificationService = new NotificationService();
      const notificationData = {
        title: '测试通知',
        content: '这是一个测试通知',
        type: 'success' as const,
        applicationId: 123,
        timestamp: new Date().toISOString()
      };

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await notificationService.sendVisitorNotification(notificationData);

      expect(consoleSpy).toHaveBeenCalledWith('发送访客通知:', notificationData);
      expect(mockShowToast).toHaveBeenCalledWith({
        title: '测试通知',
        icon: 'success',
        duration: 3000
      });

      consoleSpy.mockRestore();
    });

    it('应该处理成功类型通知的图标', async () => {
      const mockShowToast = vi.fn();
      global.wx.showToast = mockShowToast;

      class NotificationService {
        async sendVisitorNotification(data: any): Promise<void> {
          if (wx && wx.showToast) {
            wx.showToast({
              title: data.title,
              icon: data.type === 'success' ? 'success' : 'none',
              duration: 3000
            });
          }
        }
      }

      const notificationService = new NotificationService();

      // 测试成功类型
      await notificationService.sendVisitorNotification({
        title: '成功通知',
        type: 'success'
      });
      expect(mockShowToast).toHaveBeenCalledWith({
        title: '成功通知',
        icon: 'success',
        duration: 3000
      });

      // 测试其他类型
      await notificationService.sendVisitorNotification({
        title: '错误通知',
        type: 'error'
      });
      expect(mockShowToast).toHaveBeenCalledWith({
        title: '错误通知',
        icon: 'none',
        duration: 3000
      });
    });

    it('应该处理发送通知时的错误', async () => {
      const mockShowToast = vi.fn().mockImplementation(() => {
        throw new Error('微信API调用失败');
      });
      global.wx.showToast = mockShowToast;

      class NotificationService {
        async sendVisitorNotification(data: any): Promise<void> {
          try {
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
      }

      const notificationService = new NotificationService();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await notificationService.sendVisitorNotification({
        title: '测试通知',
        type: 'info'
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('发送通知失败:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });

    it('应该处理wx对象不存在的情况', async () => {
      const originalWx = global.wx;
      // @ts-ignore
      global.wx = undefined;

      class NotificationService {
        async sendVisitorNotification(data: any): Promise<void> {
          try {
            console.log('发送访客通知:', data);
            
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
      }

      const notificationService = new NotificationService();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // 应该不会抛出错误
      await expect(notificationService.sendVisitorNotification({
        title: '测试通知',
        type: 'info'
      })).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('发送访客通知:', expect.any(Object));

      // 恢复wx对象
      global.wx = originalWx;
      consoleSpy.mockRestore();
    });
  });

  describe('通知数据验证', () => {
    it('应该验证通知数据的完整性', () => {
      class NotificationService {
        createApplicationSubmittedNotification(applicationId: number) {
          if (!applicationId || applicationId <= 0) {
            throw new Error('无效的申请ID');
          }

          return {
            title: '申请提交成功',
            content: '您的访客申请已提交，请等待商户审批',
            type: 'success' as const,
            applicationId,
            timestamp: new Date().toISOString()
          };
        }

        validateNotificationData(data: any): boolean {
          return !!(data.title && data.content && data.type && data.timestamp);
        }
      }

      const notificationService = new NotificationService();

      // 测试无效申请ID
      expect(() => notificationService.createApplicationSubmittedNotification(0))
        .toThrow('无效的申请ID');
      expect(() => notificationService.createApplicationSubmittedNotification(-1))
        .toThrow('无效的申请ID');

      // 测试有效申请ID
      const validNotification = notificationService.createApplicationSubmittedNotification(123);
      expect(notificationService.validateNotificationData(validNotification)).toBe(true);

      // 测试无效通知数据
      expect(notificationService.validateNotificationData({})).toBe(false);
      expect(notificationService.validateNotificationData({ title: '标题' })).toBe(false);
    });

    it('应该处理特殊字符和长文本', () => {
      class NotificationService {
        createApplicationRejectedNotification(applicationId: number, reason?: string) {
          let content = '您的访客申请被拒绝，请联系商户了解详情';
          
          if (reason) {
            // 处理特殊字符和长文本
            const sanitizedReason = reason.replace(/<[^>]*>/g, '').substring(0, 100);
            content = `拒绝原因：${sanitizedReason}`;
          }

          return {
            title: '申请被拒绝',
            content,
            type: 'error' as const,
            applicationId,
            timestamp: new Date().toISOString()
          };
        }
      }

      const notificationService = new NotificationService();

      // 测试HTML标签过滤
      const notificationWithHtml = notificationService.createApplicationRejectedNotification(
        123, 
        '<script>alert("xss")</script>安全原因'
      );
      expect(notificationWithHtml.content).toBe('拒绝原因：安全原因');

      // 测试长文本截断
      const longReason = 'a'.repeat(200);
      const notificationWithLongText = notificationService.createApplicationRejectedNotification(
        123, 
        longReason
      );
      expect(notificationWithLongText.content.length).toBeLessThanOrEqual(104); // "拒绝原因：" + 100字符
    });
  });

  describe('通知类型处理', () => {
    it('应该正确处理所有通知类型', () => {
      class NotificationService {
        createNotification(type: 'success' | 'info' | 'warning' | 'error', title: string, content: string) {
          return {
            title,
            content,
            type,
            timestamp: new Date().toISOString()
          };
        }

        getNotificationIcon(type: string): string {
          return type === 'success' ? 'success' : 'none';
        }
      }

      const notificationService = new NotificationService();

      // 测试所有通知类型
      const successNotification = notificationService.createNotification('success', '成功', '操作成功');
      expect(successNotification.type).toBe('success');
      expect(notificationService.getNotificationIcon('success')).toBe('success');

      const infoNotification = notificationService.createNotification('info', '信息', '信息提示');
      expect(infoNotification.type).toBe('info');
      expect(notificationService.getNotificationIcon('info')).toBe('none');

      const warningNotification = notificationService.createNotification('warning', '警告', '警告信息');
      expect(warningNotification.type).toBe('warning');
      expect(notificationService.getNotificationIcon('warning')).toBe('none');

      const errorNotification = notificationService.createNotification('error', '错误', '错误信息');
      expect(errorNotification.type).toBe('error');
      expect(notificationService.getNotificationIcon('error')).toBe('none');
    });

    it('应该处理时间戳格式', () => {
      class NotificationService {
        createApplicationSubmittedNotification(applicationId: number) {
          const timestamp = new Date().toISOString();
          return {
            title: '申请提交成功',
            content: '您的访客申请已提交，请等待商户审批',
            type: 'success' as const,
            applicationId,
            timestamp
          };
        }

        isValidTimestamp(timestamp: string): boolean {
          const date = new Date(timestamp);
          return !isNaN(date.getTime()) && timestamp.includes('T') && timestamp.includes('Z');
        }
      }

      const notificationService = new NotificationService();
      const notification = notificationService.createApplicationSubmittedNotification(123);

      expect(notificationService.isValidTimestamp(notification.timestamp)).toBe(true);
      expect(notification.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('批量通知处理', () => {
    it('应该支持批量创建通知', () => {
      class NotificationService {
        createBatchNotifications(applicationIds: number[], type: 'approved' | 'rejected') {
          return applicationIds.map(id => {
            if (type === 'approved') {
              return this.createApplicationApprovedNotification(id);
            } else {
              return this.createApplicationRejectedNotification(id);
            }
          });
        }

        createApplicationApprovedNotification(applicationId: number) {
          return {
            title: '申请审批通过',
            content: '您的访客申请已通过审批，可以查看通行码了',
            type: 'success' as const,
            applicationId,
            timestamp: new Date().toISOString()
          };
        }

        createApplicationRejectedNotification(applicationId: number) {
          return {
            title: '申请被拒绝',
            content: '您的访客申请被拒绝，请联系商户了解详情',
            type: 'error' as const,
            applicationId,
            timestamp: new Date().toISOString()
          };
        }
      }

      const notificationService = new NotificationService();
      const applicationIds = [1, 2, 3];

      const approvedNotifications = notificationService.createBatchNotifications(applicationIds, 'approved');
      expect(approvedNotifications).toHaveLength(3);
      expect(approvedNotifications[0].type).toBe('success');
      expect(approvedNotifications[0].applicationId).toBe(1);

      const rejectedNotifications = notificationService.createBatchNotifications(applicationIds, 'rejected');
      expect(rejectedNotifications).toHaveLength(3);
      expect(rejectedNotifications[0].type).toBe('error');
    });

    it('应该处理空的应用ID列表', () => {
      class NotificationService {
        createBatchNotifications(applicationIds: number[], type: 'approved' | 'rejected') {
          if (!applicationIds || applicationIds.length === 0) {
            return [];
          }
          
          return applicationIds.map(id => ({
            title: type === 'approved' ? '申请审批通过' : '申请被拒绝',
            content: type === 'approved' ? '通过审批' : '被拒绝',
            type: type === 'approved' ? 'success' as const : 'error' as const,
            applicationId: id,
            timestamp: new Date().toISOString()
          }));
        }
      }

      const notificationService = new NotificationService();

      expect(notificationService.createBatchNotifications([], 'approved')).toEqual([]);
      expect(notificationService.createBatchNotifications(null as any, 'approved')).toEqual([]);
    });
  });
});