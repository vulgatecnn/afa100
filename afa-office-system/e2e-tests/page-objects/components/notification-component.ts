import { Page, Locator, expect } from '@playwright/test';

/**
 * 通知类型枚举
 */
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * 通知组件页面对象
 * 提供通用的通知消息操作和验证功能
 */
export class NotificationComponent {
  private readonly page: Page;

  // 通知容器
  readonly notificationContainer: Locator;
  readonly notificationList: Locator;

  // 不同类型的通知
  readonly successNotification: Locator;
  readonly errorNotification: Locator;
  readonly warningNotification: Locator;
  readonly infoNotification: Locator;

  // 通知元素
  readonly notificationTitle: Locator;
  readonly notificationMessage: Locator;
  readonly notificationIcon: Locator;
  readonly closeButton: Locator;
  readonly actionButton: Locator;

  // Toast 消息
  readonly toastContainer: Locator;
  readonly toastMessage: Locator;
  readonly toastCloseButton: Locator;

  // 消息提示
  readonly messageContainer: Locator;
  readonly messageContent: Locator;

  // 弹窗通知
  readonly alertModal: Locator;
  readonly alertTitle: Locator;
  readonly alertContent: Locator;
  readonly alertConfirmButton: Locator;
  readonly alertCancelButton: Locator;

  // 系统通知
  readonly systemNotificationBell: Locator;
  readonly systemNotificationBadge: Locator;
  readonly systemNotificationDropdown: Locator;
  readonly systemNotificationList: Locator;

  constructor(page: Page) {
    this.page = page;

    // 通知容器
    this.notificationContainer = page.locator('[data-testid="notification-container"], .notification-container, .ant-notification');
    this.notificationList = page.locator('[data-testid="notification-list"], .notification-list');

    // 不同类型的通知
    this.successNotification = page.locator('[data-testid="notification-success"], .notification-success, .ant-notification-notice-success');
    this.errorNotification = page.locator('[data-testid="notification-error"], .notification-error, .ant-notification-notice-error');
    this.warningNotification = page.locator('[data-testid="notification-warning"], .notification-warning, .ant-notification-notice-warning');
    this.infoNotification = page.locator('[data-testid="notification-info"], .notification-info, .ant-notification-notice-info');

    // 通知元素
    this.notificationTitle = page.locator('[data-testid="notification-title"], .notification-title, .ant-notification-notice-message');
    this.notificationMessage = page.locator('[data-testid="notification-message"], .notification-message, .ant-notification-notice-description');
    this.notificationIcon = page.locator('[data-testid="notification-icon"], .notification-icon, .ant-notification-notice-icon');
    this.closeButton = page.locator('[data-testid="notification-close"], .notification-close, .ant-notification-notice-close');
    this.actionButton = page.locator('[data-testid="notification-action"], .notification-action');

    // Toast 消息
    this.toastContainer = page.locator('[data-testid="toast-container"], .toast-container');
    this.toastMessage = page.locator('[data-testid="toast-message"], .toast-message');
    this.toastCloseButton = page.locator('[data-testid="toast-close"], .toast-close');

    // 消息提示
    this.messageContainer = page.locator('[data-testid="message-container"], .message-container, .ant-message');
    this.messageContent = page.locator('[data-testid="message-content"], .message-content, .ant-message-notice-content');

    // 弹窗通知
    this.alertModal = page.locator('[data-testid="alert-modal"], .alert-modal, .ant-modal-confirm');
    this.alertTitle = page.locator('[data-testid="alert-title"], .alert-title, .ant-modal-confirm-title');
    this.alertContent = page.locator('[data-testid="alert-content"], .alert-content, .ant-modal-confirm-content');
    this.alertConfirmButton = page.locator('[data-testid="alert-confirm"], .alert-confirm, .ant-btn-primary');
    this.alertCancelButton = page.locator('[data-testid="alert-cancel"], .alert-cancel, .ant-btn-default');

    // 系统通知
    this.systemNotificationBell = page.locator('[data-testid="notification-bell"], .notification-bell');
    this.systemNotificationBadge = page.locator('[data-testid="notification-badge"], .notification-badge, .ant-badge-count');
    this.systemNotificationDropdown = page.locator('[data-testid="notification-dropdown"], .notification-dropdown');
    this.systemNotificationList = page.locator('[data-testid="system-notification-list"], .system-notification-list');
  }

  /**
   * 等待通知出现
   */
  async waitForNotification(type: NotificationType, timeout = 5000): Promise<void> {
    const notificationMap = {
      [NotificationType.SUCCESS]: this.successNotification,
      [NotificationType.ERROR]: this.errorNotification,
      [NotificationType.WARNING]: this.warningNotification,
      [NotificationType.INFO]: this.infoNotification
    };

    const notification = notificationMap[type];
    await notification.waitFor({ state: 'visible', timeout });
  }

  /**
   * 验证通知消息内容
   */
  async expectNotificationMessage(message: string, type: NotificationType = NotificationType.SUCCESS): Promise<void> {
    await this.waitForNotification(type);
    
    const notificationMap = {
      [NotificationType.SUCCESS]: this.successNotification,
      [NotificationType.ERROR]: this.errorNotification,
      [NotificationType.WARNING]: this.warningNotification,
      [NotificationType.INFO]: this.infoNotification
    };

    const notification = notificationMap[type];
    await expect(notification).toContainText(message);
  }

  /**
   * 验证通知标题
   */
  async expectNotificationTitle(title: string, type: NotificationType = NotificationType.SUCCESS): Promise<void> {
    await this.waitForNotification(type);
    
    const titleElement = this.notificationTitle.first();
    await expect(titleElement).toContainText(title);
  }

  /**
   * 验证成功通知
   */
  async expectSuccessNotification(message: string): Promise<void> {
    await this.expectNotificationMessage(message, NotificationType.SUCCESS);
  }

  /**
   * 验证错误通知
   */
  async expectErrorNotification(message: string): Promise<void> {
    await this.expectNotificationMessage(message, NotificationType.ERROR);
  }

  /**
   * 验证警告通知
   */
  async expectWarningNotification(message: string): Promise<void> {
    await this.expectNotificationMessage(message, NotificationType.WARNING);
  }

  /**
   * 验证信息通知
   */
  async expectInfoNotification(message: string): Promise<void> {
    await this.expectNotificationMessage(message, NotificationType.INFO);
  }

  /**
   * 关闭通知
   */
  async closeNotification(type?: NotificationType): Promise<void> {
    if (type) {
      const notificationMap = {
        [NotificationType.SUCCESS]: this.successNotification,
        [NotificationType.ERROR]: this.errorNotification,
        [NotificationType.WARNING]: this.warningNotification,
        [NotificationType.INFO]: this.infoNotification
      };

      const notification = notificationMap[type];
      const closeBtn = notification.locator('[data-testid="notification-close"], .ant-notification-notice-close').first();
      
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    } else {
      // 关闭第一个可见的通知
      const closeBtn = this.closeButton.first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  }

  /**
   * 关闭所有通知
   */
  async closeAllNotifications(): Promise<void> {
    const closeButtons = this.closeButton;
    const count = await closeButtons.count();
    
    for (let i = 0; i < count; i++) {
      const button = closeButtons.nth(i);
      if (await button.isVisible()) {
        await button.click();
        await this.page.waitForTimeout(200); // 等待关闭动画
      }
    }
  }

  /**
   * 验证通知自动消失
   */
  async expectNotificationAutoClose(type: NotificationType, timeout = 5000): Promise<void> {
    const notificationMap = {
      [NotificationType.SUCCESS]: this.successNotification,
      [NotificationType.ERROR]: this.errorNotification,
      [NotificationType.WARNING]: this.warningNotification,
      [NotificationType.INFO]: this.infoNotification
    };

    const notification = notificationMap[type];
    
    // 先等待通知出现
    await notification.waitFor({ state: 'visible', timeout: 2000 });
    
    // 然后等待通知消失
    await notification.waitFor({ state: 'hidden', timeout });
  }

  /**
   * 验证通知图标
   */
  async expectNotificationIcon(type: NotificationType): Promise<void> {
    await this.waitForNotification(type);
    
    const icon = this.notificationIcon.first();
    await expect(icon).toBeVisible();
    
    // 验证图标类型
    const iconClasses = {
      [NotificationType.SUCCESS]: /success|check|tick/,
      [NotificationType.ERROR]: /error|close|times/,
      [NotificationType.WARNING]: /warning|exclamation/,
      [NotificationType.INFO]: /info|information/
    };
    
    const expectedClass = iconClasses[type];
    const iconClass = await icon.getAttribute('class') || '';
    expect(iconClass).toMatch(expectedClass);
  }

  /**
   * 点击通知操作按钮
   */
  async clickNotificationAction(actionText?: string): Promise<void> {
    if (actionText) {
      const actionBtn = this.actionButton.locator(`text=${actionText}`).first();
      await actionBtn.click();
    } else {
      const actionBtn = this.actionButton.first();
      await actionBtn.click();
    }
    
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 验证Toast消息
   */
  async expectToastMessage(message: string): Promise<void> {
    await expect(this.toastMessage).toBeVisible();
    await expect(this.toastMessage).toContainText(message);
  }

  /**
   * 关闭Toast消息
   */
  async closeToast(): Promise<void> {
    if (await this.toastCloseButton.isVisible()) {
      await this.toastCloseButton.click();
    }
  }

  /**
   * 验证消息提示
   */
  async expectMessage(message: string): Promise<void> {
    await expect(this.messageContent).toBeVisible();
    await expect(this.messageContent).toContainText(message);
  }

  /**
   * 验证确认对话框
   */
  async expectConfirmDialog(title: string, content?: string): Promise<void> {
    await expect(this.alertModal).toBeVisible();
    await expect(this.alertTitle).toContainText(title);
    
    if (content) {
      await expect(this.alertContent).toContainText(content);
    }
  }

  /**
   * 确认对话框
   */
  async confirmDialog(): Promise<void> {
    await expect(this.alertModal).toBeVisible();
    await this.alertConfirmButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 取消对话框
   */
  async cancelDialog(): Promise<void> {
    await expect(this.alertModal).toBeVisible();
    await this.alertCancelButton.click();
  }

  /**
   * 验证系统通知铃铛
   */
  async expectNotificationBellVisible(): Promise<void> {
    await expect(this.systemNotificationBell).toBeVisible();
  }

  /**
   * 获取系统通知数量
   */
  async getSystemNotificationCount(): Promise<number> {
    if (await this.systemNotificationBadge.isVisible()) {
      const countText = await this.systemNotificationBadge.textContent();
      return parseInt(countText || '0');
    }
    return 0;
  }

  /**
   * 点击系统通知铃铛
   */
  async clickNotificationBell(): Promise<void> {
    await this.systemNotificationBell.click();
    await expect(this.systemNotificationDropdown).toBeVisible();
  }

  /**
   * 验证系统通知列表
   */
  async expectSystemNotificationList(): Promise<void> {
    await this.clickNotificationBell();
    await expect(this.systemNotificationList).toBeVisible();
  }

  /**
   * 点击系统通知项
   */
  async clickSystemNotificationItem(index: number): Promise<void> {
    await this.clickNotificationBell();
    
    const notificationItems = this.systemNotificationList.locator('[data-testid="notification-item"], .notification-item');
    const item = notificationItems.nth(index);
    await item.click();
    
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 标记系统通知为已读
   */
  async markNotificationAsRead(index: number): Promise<void> {
    await this.clickNotificationBell();
    
    const notificationItems = this.systemNotificationList.locator('[data-testid="notification-item"], .notification-item');
    const item = notificationItems.nth(index);
    const markReadButton = item.locator('[data-testid="mark-read"], .mark-read');
    
    if (await markReadButton.isVisible()) {
      await markReadButton.click();
    }
  }

  /**
   * 清空所有系统通知
   */
  async clearAllSystemNotifications(): Promise<void> {
    await this.clickNotificationBell();
    
    const clearAllButton = this.systemNotificationDropdown.locator('[data-testid="clear-all"], .clear-all');
    if (await clearAllButton.isVisible()) {
      await clearAllButton.click();
      
      // 可能需要确认
      const confirmButton = this.page.locator('[data-testid="confirm-clear"], .confirm-clear');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
    }
  }

  /**
   * 验证通知持续时间
   */
  async expectNotificationDuration(type: NotificationType, expectedDuration: number): Promise<void> {
    const startTime = Date.now();
    
    await this.waitForNotification(type);
    
    const notificationMap = {
      [NotificationType.SUCCESS]: this.successNotification,
      [NotificationType.ERROR]: this.errorNotification,
      [NotificationType.WARNING]: this.warningNotification,
      [NotificationType.INFO]: this.infoNotification
    };

    const notification = notificationMap[type];
    
    // 等待通知消失
    await notification.waitFor({ state: 'hidden', timeout: expectedDuration + 1000 });
    
    const actualDuration = Date.now() - startTime;
    const tolerance = 500; // 允许500ms的误差
    
    expect(actualDuration).toBeGreaterThanOrEqual(expectedDuration - tolerance);
    expect(actualDuration).toBeLessThanOrEqual(expectedDuration + tolerance);
  }

  /**
   * 验证通知位置
   */
  async expectNotificationPosition(position: 'top' | 'bottom' | 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft'): Promise<void> {
    const container = this.notificationContainer;
    await expect(container).toBeVisible();
    
    const containerClass = await container.getAttribute('class') || '';
    const positionClass = position.toLowerCase();
    
    expect(containerClass).toContain(positionClass);
  }

  /**
   * 验证通知数量限制
   */
  async expectNotificationLimit(maxCount: number): Promise<void> {
    const notifications = this.notificationContainer.locator('.ant-notification-notice, .notification-item');
    const count = await notifications.count();
    
    expect(count).toBeLessThanOrEqual(maxCount);
  }

  /**
   * 验证通知堆叠
   */
  async expectNotificationStacking(): Promise<void> {
    const notifications = this.notificationContainer.locator('.ant-notification-notice, .notification-item');
    const count = await notifications.count();
    
    if (count > 1) {
      // 验证通知是否正确堆叠（后来的通知在上面）
      for (let i = 0; i < count - 1; i++) {
        const current = notifications.nth(i);
        const next = notifications.nth(i + 1);
        
        const currentBox = await current.boundingBox();
        const nextBox = await next.boundingBox();
        
        if (currentBox && nextBox) {
          expect(currentBox.y).toBeLessThan(nextBox.y);
        }
      }
    }
  }

  /**
   * 等待所有通知消失
   */
  async waitForAllNotificationsToDisappear(timeout = 10000): Promise<void> {
    await this.notificationContainer.waitFor({ state: 'hidden', timeout }).catch(() => {
      // 如果容器没有完全隐藏，检查是否还有通知项
      return this.page.waitForFunction(
        () => {
          const notifications = document.querySelectorAll('.ant-notification-notice, .notification-item');
          return notifications.length === 0;
        },
        undefined,
        { timeout }
      );
    });
  }

  /**
   * 模拟通知触发
   */
  async triggerNotification(type: NotificationType, message: string, title?: string): Promise<void> {
    // 这个方法用于测试环境中手动触发通知
    await this.page.evaluate(
      ({ type, message, title }) => {
        // 假设页面有全局的通知方法
        if (window.notification) {
          window.notification[type](message, title);
        }
      },
      { type, message, title }
    );
  }
}