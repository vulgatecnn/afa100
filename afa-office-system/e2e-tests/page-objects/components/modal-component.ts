import { Page, Locator, expect } from '@playwright/test';

/**
 * 模态框类型枚举
 */
export enum ModalType {
  FORM = 'form',
  CONFIRM = 'confirm',
  INFO = 'info',
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning'
}

/**
 * 模态框组件页面对象
 * 提供通用的模态框操作和验证功能
 */
export class ModalComponent {
  private readonly page: Page;

  // 模态框容器
  readonly modal: Locator;
  readonly modalMask: Locator;
  readonly modalWrap: Locator;
  readonly modalContent: Locator;

  // 模态框头部
  readonly modalHeader: Locator;
  readonly modalTitle: Locator;
  readonly closeButton: Locator;

  // 模态框主体
  readonly modalBody: Locator;
  readonly modalForm: Locator;

  // 模态框底部
  readonly modalFooter: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;
  readonly okButton: Locator;

  // 不同类型的模态框
  readonly formModal: Locator;
  readonly confirmModal: Locator;
  readonly infoModal: Locator;
  readonly successModal: Locator;
  readonly errorModal: Locator;
  readonly warningModal: Locator;

  // 表单元素
  readonly formInputs: Locator;
  readonly formSelects: Locator;
  readonly formTextareas: Locator;
  readonly formCheckboxes: Locator;
  readonly formRadios: Locator;
  readonly formButtons: Locator;

  // 加载状态
  readonly loadingSpinner: Locator;
  readonly loadingText: Locator;

  constructor(page: Page) {
    this.page = page;

    // 模态框容器
    this.modal = page.locator('[data-testid="modal"], .modal, .ant-modal');
    this.modalMask = page.locator('[data-testid="modal-mask"], .modal-mask, .ant-modal-mask');
    this.modalWrap = page.locator('[data-testid="modal-wrap"], .modal-wrap, .ant-modal-wrap');
    this.modalContent = page.locator('[data-testid="modal-content"], .modal-content, .ant-modal-content');

    // 模态框头部
    this.modalHeader = page.locator('[data-testid="modal-header"], .modal-header, .ant-modal-header');
    this.modalTitle = page.locator('[data-testid="modal-title"], .modal-title, .ant-modal-title');
    this.closeButton = page.locator('[data-testid="modal-close"], .modal-close, .ant-modal-close');

    // 模态框主体
    this.modalBody = page.locator('[data-testid="modal-body"], .modal-body, .ant-modal-body');
    this.modalForm = page.locator('[data-testid="modal-form"], .modal-form, form');

    // 模态框底部
    this.modalFooter = page.locator('[data-testid="modal-footer"], .modal-footer, .ant-modal-footer');
    this.confirmButton = page.locator('[data-testid="confirm-button"], .confirm-button, .ant-btn-primary');
    this.cancelButton = page.locator('[data-testid="cancel-button"], .cancel-button, .ant-btn-default');
    this.okButton = page.locator('[data-testid="ok-button"], .ok-button');

    // 不同类型的模态框
    this.formModal = page.locator('[data-testid="form-modal"], .form-modal');
    this.confirmModal = page.locator('[data-testid="confirm-modal"], .confirm-modal, .ant-modal-confirm');
    this.infoModal = page.locator('[data-testid="info-modal"], .info-modal, .ant-modal-confirm-info');
    this.successModal = page.locator('[data-testid="success-modal"], .success-modal, .ant-modal-confirm-success');
    this.errorModal = page.locator('[data-testid="error-modal"], .error-modal, .ant-modal-confirm-error');
    this.warningModal = page.locator('[data-testid="warning-modal"], .warning-modal, .ant-modal-confirm-warning');

    // 表单元素
    this.formInputs = page.locator('[data-testid*="input"], input, .ant-input');
    this.formSelects = page.locator('[data-testid*="select"], select, .ant-select');
    this.formTextareas = page.locator('[data-testid*="textarea"], textarea, .ant-input');
    this.formCheckboxes = page.locator('[data-testid*="checkbox"], input[type="checkbox"], .ant-checkbox');
    this.formRadios = page.locator('[data-testid*="radio"], input[type="radio"], .ant-radio');
    this.formButtons = page.locator('[data-testid*="button"], button, .ant-btn');

    // 加载状态
    this.loadingSpinner = page.locator('[data-testid="loading"], .loading, .ant-spin');
    this.loadingText = page.locator('[data-testid="loading-text"], .loading-text');
  }

  /**
   * 等待模态框出现
   */
  async waitForModal(timeout = 5000): Promise<void> {
    await this.modal.waitFor({ state: 'visible', timeout });
  }

  /**
   * 等待模态框消失
   */
  async waitForModalToClose(timeout = 5000): Promise<void> {
    await this.modal.waitFor({ state: 'hidden', timeout });
  }

  /**
   * 验证模态框是否可见
   */
  async expectModalVisible(): Promise<void> {
    await expect(this.modal).toBeVisible();
  }

  /**
   * 验证模态框是否隐藏
   */
  async expectModalHidden(): Promise<void> {
    await expect(this.modal).not.toBeVisible();
  }

  /**
   * 验证模态框标题
   */
  async expectModalTitle(expectedTitle: string): Promise<void> {
    await this.waitForModal();
    await expect(this.modalTitle).toContainText(expectedTitle);
  }

  /**
   * 验证模态框内容
   */
  async expectModalContent(expectedContent: string): Promise<void> {
    await this.waitForModal();
    await expect(this.modalBody).toContainText(expectedContent);
  }

  /**
   * 点击确认按钮
   */
  async clickConfirm(): Promise<void> {
    await this.waitForModal();
    await this.confirmButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 点击取消按钮
   */
  async clickCancel(): Promise<void> {
    await this.waitForModal();
    await this.cancelButton.click();
  }

  /**
   * 点击OK按钮
   */
  async clickOk(): Promise<void> {
    await this.waitForModal();
    await this.okButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 点击关闭按钮
   */
  async clickClose(): Promise<void> {
    await this.waitForModal();
    await this.closeButton.click();
  }

  /**
   * 点击遮罩层关闭模态框
   */
  async clickMaskToClose(): Promise<void> {
    await this.waitForModal();
    
    // 点击遮罩层的边缘区域
    const modalBox = await this.modalContent.boundingBox();
    const maskBox = await this.modalMask.boundingBox();
    
    if (modalBox && maskBox) {
      // 点击遮罩层但不在模态框内容区域的位置
      await this.page.mouse.click(maskBox.x + 10, maskBox.y + 10);
    }
  }

  /**
   * 按ESC键关闭模态框
   */
  async pressEscapeToClose(): Promise<void> {
    await this.waitForModal();
    await this.page.keyboard.press('Escape');
  }

  /**
   * 验证特定类型的模态框
   */
  async expectModalType(type: ModalType): Promise<void> {
    const modalMap = {
      [ModalType.FORM]: this.formModal,
      [ModalType.CONFIRM]: this.confirmModal,
      [ModalType.INFO]: this.infoModal,
      [ModalType.SUCCESS]: this.successModal,
      [ModalType.ERROR]: this.errorModal,
      [ModalType.WARNING]: this.warningModal
    };

    const targetModal = modalMap[type];
    if (targetModal) {
      await expect(targetModal).toBeVisible();
    } else {
      await this.expectModalVisible();
    }
  }

  /**
   * 填写表单模态框
   */
  async fillFormModal(formData: Record<string, any>): Promise<void> {
    await this.waitForModal();
    
    for (const [field, value] of Object.entries(formData)) {
      const input = this.modalBody.locator(`[data-testid="${field}"], [name="${field}"]`);
      
      if (await input.isVisible()) {
        const tagName = await input.evaluate(el => el.tagName.toLowerCase());
        const inputType = await input.getAttribute('type');
        
        if (tagName === 'select' || input.locator('.ant-select').isVisible()) {
          // 下拉选择框
          await input.selectOption(value);
        } else if (inputType === 'checkbox') {
          // 复选框
          if (value) {
            await input.check();
          } else {
            await input.uncheck();
          }
        } else if (inputType === 'radio') {
          // 单选框
          await input.check();
        } else if (tagName === 'textarea') {
          // 文本域
          await input.fill(value);
        } else {
          // 普通输入框
          await input.fill(value.toString());
        }
      }
    }
  }

  /**
   * 验证表单验证错误
   */
  async expectFormValidationError(field: string, expectedError: string): Promise<void> {
    await this.waitForModal();
    
    const errorElement = this.modalBody.locator(`[data-testid="error-${field}"], .form-error, .ant-form-item-explain-error`);
    await expect(errorElement).toContainText(expectedError);
  }

  /**
   * 验证表单字段必填
   */
  async expectFieldRequired(field: string): Promise<void> {
    await this.waitForModal();
    
    const fieldElement = this.modalBody.locator(`[data-testid="${field}"], [name="${field}"]`);
    const isRequired = await fieldElement.getAttribute('required');
    const hasRequiredClass = await fieldElement.getAttribute('class');
    
    expect(isRequired !== null || hasRequiredClass?.includes('required')).toBeTruthy();
  }

  /**
   * 验证按钮状态
   */
  async expectButtonState(buttonType: 'confirm' | 'cancel' | 'ok', enabled: boolean): Promise<void> {
    await this.waitForModal();
    
    const buttonMap = {
      confirm: this.confirmButton,
      cancel: this.cancelButton,
      ok: this.okButton
    };
    
    const button = buttonMap[buttonType];
    
    if (enabled) {
      await expect(button).toBeEnabled();
    } else {
      await expect(button).toBeDisabled();
    }
  }

  /**
   * 验证加载状态
   */
  async expectLoadingState(isLoading: boolean): Promise<void> {
    await this.waitForModal();
    
    if (isLoading) {
      await expect(this.loadingSpinner).toBeVisible();
    } else {
      await expect(this.loadingSpinner).not.toBeVisible();
    }
  }

  /**
   * 等待加载完成
   */
  async waitForLoadingComplete(timeout = 10000): Promise<void> {
    await this.waitForModal();
    
    try {
      // 等待加载指示器出现
      await this.loadingSpinner.waitFor({ state: 'visible', timeout: 2000 });
      // 等待加载指示器消失
      await this.loadingSpinner.waitFor({ state: 'hidden', timeout });
    } catch {
      // 如果没有加载指示器，直接继续
    }
  }

  /**
   * 验证模态框尺寸
   */
  async expectModalSize(size: 'small' | 'medium' | 'large' | 'fullscreen'): Promise<void> {
    await this.waitForModal();
    
    const modalClass = await this.modal.getAttribute('class') || '';
    const sizeClass = size === 'medium' ? '' : size; // medium 通常是默认大小
    
    if (sizeClass) {
      expect(modalClass).toContain(sizeClass);
    }
  }

  /**
   * 验证模态框位置
   */
  async expectModalPosition(position: 'center' | 'top' | 'bottom'): Promise<void> {
    await this.waitForModal();
    
    const modalBox = await this.modalContent.boundingBox();
    const viewportSize = this.page.viewportSize();
    
    if (modalBox && viewportSize) {
      const centerY = viewportSize.height / 2;
      const modalCenterY = modalBox.y + modalBox.height / 2;
      
      switch (position) {
        case 'center':
          expect(Math.abs(modalCenterY - centerY)).toBeLessThan(100);
          break;
        case 'top':
          expect(modalBox.y).toBeLessThan(centerY);
          break;
        case 'bottom':
          expect(modalBox.y + modalBox.height).toBeGreaterThan(centerY);
          break;
      }
    }
  }

  /**
   * 验证模态框动画
   */
  async expectModalAnimation(): Promise<void> {
    // 触发模态框打开
    const initialOpacity = await this.modal.evaluate(el => getComputedStyle(el).opacity);
    
    // 等待动画完成
    await this.page.waitForTimeout(300);
    
    const finalOpacity = await this.modal.evaluate(el => getComputedStyle(el).opacity);
    
    // 验证透明度变化（动画效果）
    expect(parseFloat(finalOpacity)).toBeGreaterThan(parseFloat(initialOpacity));
  }

  /**
   * 验证模态框层级
   */
  async expectModalZIndex(expectedZIndex?: number): Promise<void> {
    await this.waitForModal();
    
    const zIndex = await this.modal.evaluate(el => getComputedStyle(el).zIndex);
    
    if (expectedZIndex) {
      expect(parseInt(zIndex)).toBe(expectedZIndex);
    } else {
      // 验证z-index大于1000（通常模态框的z-index都比较高）
      expect(parseInt(zIndex)).toBeGreaterThan(1000);
    }
  }

  /**
   * 验证模态框可拖拽
   */
  async expectModalDraggable(): Promise<void> {
    await this.waitForModal();
    
    const initialBox = await this.modalContent.boundingBox();
    
    if (initialBox) {
      // 尝试拖拽模态框标题栏
      await this.modalHeader.dragTo(this.modalHeader, {
        targetPosition: { x: initialBox.x + 100, y: initialBox.y + 50 }
      });
      
      await this.page.waitForTimeout(300);
      
      const finalBox = await this.modalContent.boundingBox();
      
      if (finalBox) {
        // 验证位置发生了变化
        expect(finalBox.x).not.toBe(initialBox.x);
        expect(finalBox.y).not.toBe(initialBox.y);
      }
    }
  }

  /**
   * 验证模态框可调整大小
   */
  async expectModalResizable(): Promise<void> {
    await this.waitForModal();
    
    const resizeHandle = this.modal.locator('.resize-handle, .ant-modal-resize-handle');
    
    if (await resizeHandle.isVisible()) {
      const initialBox = await this.modalContent.boundingBox();
      
      if (initialBox) {
        // 尝试调整大小
        await resizeHandle.dragTo(resizeHandle, {
          targetPosition: { x: initialBox.width + 100, y: initialBox.height + 50 }
        });
        
        await this.page.waitForTimeout(300);
        
        const finalBox = await this.modalContent.boundingBox();
        
        if (finalBox) {
          // 验证尺寸发生了变化
          expect(finalBox.width).toBeGreaterThan(initialBox.width);
          expect(finalBox.height).toBeGreaterThan(initialBox.height);
        }
      }
    }
  }

  /**
   * 验证嵌套模态框
   */
  async expectNestedModal(): Promise<void> {
    const modals = this.page.locator('[data-testid="modal"], .modal, .ant-modal');
    const count = await modals.count();
    
    expect(count).toBeGreaterThan(1);
    
    // 验证最新的模态框在最上层
    for (let i = 0; i < count; i++) {
      const modal = modals.nth(i);
      const zIndex = await modal.evaluate(el => getComputedStyle(el).zIndex);
      
      if (i > 0) {
        const prevModal = modals.nth(i - 1);
        const prevZIndex = await prevModal.evaluate(el => getComputedStyle(el).zIndex);
        expect(parseInt(zIndex)).toBeGreaterThan(parseInt(prevZIndex));
      }
    }
  }

  /**
   * 关闭所有模态框
   */
  async closeAllModals(): Promise<void> {
    const modals = this.page.locator('[data-testid="modal"], .modal, .ant-modal');
    const count = await modals.count();
    
    // 从最上层的模态框开始关闭
    for (let i = count - 1; i >= 0; i--) {
      const modal = modals.nth(i);
      if (await modal.isVisible()) {
        const closeBtn = modal.locator('[data-testid="modal-close"], .modal-close, .ant-modal-close');
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          await this.page.waitForTimeout(300); // 等待关闭动画
        }
      }
    }
  }

  /**
   * 验证模态框焦点管理
   */
  async expectModalFocusManagement(): Promise<void> {
    await this.waitForModal();
    
    // 验证模态框获得焦点
    const focusedElement = await this.page.evaluate(() => document.activeElement?.tagName);
    const modalElement = await this.modal.evaluate(el => el.tagName);
    
    // 焦点应该在模态框内部
    const isModalFocused = await this.modal.evaluate(el => el.contains(document.activeElement));
    expect(isModalFocused).toBeTruthy();
  }

  /**
   * 验证模态框键盘导航
   */
  async expectModalKeyboardNavigation(): Promise<void> {
    await this.waitForModal();
    
    // 测试Tab键导航
    await this.page.keyboard.press('Tab');
    
    const focusedElement = this.page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // 验证焦点在模态框内部
    const isInModal = await this.modal.evaluate((modal, focused) => {
      return modal.contains(focused);
    }, await focusedElement.elementHandle());
    
    expect(isInModal).toBeTruthy();
  }
}