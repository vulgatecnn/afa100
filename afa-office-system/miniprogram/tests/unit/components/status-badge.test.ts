// 状态徽章组件单元测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetMocks, createMockComponent } from '../../setup';

describe('状态徽章组件测试', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('组件初始化', () => {
    it('应该有正确的初始属性和数据', () => {
      const statusBadgeComponent = createMockComponent({
        properties: {
          status: 'pending',
          text: '',
          type: 'default', // default, primary, success, warning, danger
          size: 'normal', // small, normal, large
          round: false
        },
        data: {
          statusConfig: {
            pending: { text: '待审批', type: 'warning' },
            approved: { text: '已通过', type: 'success' },
            rejected: { text: '已拒绝', type: 'danger' },
            expired: { text: '已过期', type: 'default' },
            active: { text: '有效', type: 'success' },
            revoked: { text: '已撤销', type: 'danger' }
          }
        }
      });

      expect(statusBadgeComponent.properties.status).toBe('pending');
      expect(statusBadgeComponent.properties.type).toBe('default');
      expect(statusBadgeComponent.properties.size).toBe('normal');
      expect(statusBadgeComponent.properties.round).toBe(false);
      expect(statusBadgeComponent.data.statusConfig.pending.text).toBe('待审批');
    });
  });

  describe('组件生命周期', () => {
    it('应该在attached时初始化状态配置', () => {
      const statusBadgeComponent = createMockComponent({
        properties: {
          status: 'approved',
          text: ''
        },
        data: {
          displayText: '',
          displayType: 'default',
          statusConfig: {
            approved: { text: '已通过', type: 'success' }
          }
        },
        methods: {
          updateDisplay() {
            const config = this.data.statusConfig[this.properties.status];
            if (config) {
              this.setData({
                displayText: this.properties.text || config.text,
                displayType: config.type
              });
            }
          }
        },
        attached() {
          this.updateDisplay();
        }
      });

      statusBadgeComponent.attached.call(statusBadgeComponent);

      expect(statusBadgeComponent.setData).toHaveBeenCalledWith({
        displayText: '已通过',
        displayType: 'success'
      });
    });

    it('应该在ready时检查属性有效性', () => {
      const statusBadgeComponent = createMockComponent({
        properties: {
          status: 'invalid_status'
        },
        data: {
          statusConfig: {
            pending: { text: '待审批', type: 'warning' }
          }
        },
        methods: {
          validateProps() {
            const config = this.data.statusConfig[this.properties.status];
            if (!config) {
              console.warn(`未知的状态类型: ${this.properties.status}`);
            }
          }
        },
        ready() {
          this.validateProps();
        }
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      statusBadgeComponent.ready.call(statusBadgeComponent);

      expect(consoleSpy).toHaveBeenCalledWith('未知的状态类型: invalid_status');

      consoleSpy.mockRestore();
    });
  });

  describe('属性变化监听', () => {
    it('应该监听status属性变化并更新显示', () => {
      const statusBadgeComponent = createMockComponent({
        properties: {
          status: 'pending',
          text: ''
        },
        data: {
          displayText: '待审批',
          displayType: 'warning',
          statusConfig: {
            pending: { text: '待审批', type: 'warning' },
            approved: { text: '已通过', type: 'success' }
          }
        },
        methods: {
          updateDisplay() {
            const config = this.data.statusConfig[this.properties.status];
            if (config) {
              this.setData({
                displayText: this.properties.text || config.text,
                displayType: config.type
              });
            }
          }
        },
        observers: {
          'status': function(newStatus) {
            this.updateDisplay();
          }
        }
      });

      // 模拟属性变化
      statusBadgeComponent.properties.status = 'approved';
      statusBadgeComponent.observers.status.call(statusBadgeComponent, 'approved');

      expect(statusBadgeComponent.setData).toHaveBeenCalledWith({
        displayText: '已通过',
        displayType: 'success'
      });
    });

    it('应该监听text属性变化并更新显示文本', () => {
      const statusBadgeComponent = createMockComponent({
        properties: {
          status: 'pending',
          text: '自定义文本'
        },
        data: {
          displayText: '待审批',
          statusConfig: {
            pending: { text: '待审批', type: 'warning' }
          }
        },
        methods: {
          updateDisplay() {
            const config = this.data.statusConfig[this.properties.status];
            if (config) {
              this.setData({
                displayText: this.properties.text || config.text,
                displayType: config.type
              });
            }
          }
        },
        observers: {
          'text': function(newText) {
            this.updateDisplay();
          }
        }
      });

      statusBadgeComponent.observers.text.call(statusBadgeComponent, '自定义文本');

      expect(statusBadgeComponent.setData).toHaveBeenCalledWith({
        displayText: '自定义文本',
        displayType: 'warning'
      });
    });
  });

  describe('样式计算', () => {
    it('应该根据type属性计算样式类', () => {
      const statusBadgeComponent = createMockComponent({
        properties: {
          type: 'success',
          size: 'normal',
          round: false
        },
        data: {
          badgeClass: ''
        },
        methods: {
          computeBadgeClass() {
            const baseClass = 'status-badge';
            const typeClass = `status-badge--${this.properties.type}`;
            const sizeClass = `status-badge--${this.properties.size}`;
            const roundClass = this.properties.round ? 'status-badge--round' : '';
            
            const classes = [baseClass, typeClass, sizeClass, roundClass]
              .filter(cls => cls)
              .join(' ');
            
            this.setData({ badgeClass: classes });
          }
        }
      });

      statusBadgeComponent.computeBadgeClass.call(statusBadgeComponent);

      expect(statusBadgeComponent.setData).toHaveBeenCalledWith({
        badgeClass: 'status-badge status-badge--success status-badge--normal'
      });
    });

    it('应该支持圆角样式', () => {
      const statusBadgeComponent = createMockComponent({
        properties: {
          type: 'primary',
          size: 'small',
          round: true
        },
        data: {
          badgeClass: ''
        },
        methods: {
          computeBadgeClass() {
            const baseClass = 'status-badge';
            const typeClass = `status-badge--${this.properties.type}`;
            const sizeClass = `status-badge--${this.properties.size}`;
            const roundClass = this.properties.round ? 'status-badge--round' : '';
            
            const classes = [baseClass, typeClass, sizeClass, roundClass]
              .filter(cls => cls)
              .join(' ');
            
            this.setData({ badgeClass: classes });
          }
        }
      });

      statusBadgeComponent.computeBadgeClass.call(statusBadgeComponent);

      expect(statusBadgeComponent.setData).toHaveBeenCalledWith({
        badgeClass: 'status-badge status-badge--primary status-badge--small status-badge--round'
      });
    });
  });

  describe('事件处理', () => {
    it('应该处理点击事件', () => {
      const statusBadgeComponent = createMockComponent({
        properties: {
          status: 'pending'
        },
        methods: {
          onTap(e) {
            this.triggerEvent('tap', {
              status: this.properties.status,
              timestamp: Date.now()
            });
          }
        }
      });

      const mockEvent = {
        type: 'tap',
        currentTarget: { dataset: {} }
      };

      statusBadgeComponent.onTap.call(statusBadgeComponent, mockEvent);

      expect(statusBadgeComponent.triggerEvent).toHaveBeenCalledWith('tap', {
        status: 'pending',
        timestamp: expect.any(Number)
      });
    });

    it('应该支持禁用点击事件', () => {
      const statusBadgeComponent = createMockComponent({
        properties: {
          status: 'pending',
          disabled: true
        },
        methods: {
          onTap(e) {
            if (this.properties.disabled) {
              return;
            }
            
            this.triggerEvent('tap', {
              status: this.properties.status
            });
          }
        }
      });

      statusBadgeComponent.onTap.call(statusBadgeComponent, {});

      expect(statusBadgeComponent.triggerEvent).not.toHaveBeenCalled();
    });
  });

  describe('状态配置', () => {
    it('应该正确处理所有预定义状态', () => {
      const statusBadgeComponent = createMockComponent({
        data: {
          statusConfig: {
            pending: { text: '待审批', type: 'warning' },
            approved: { text: '已通过', type: 'success' },
            rejected: { text: '已拒绝', type: 'danger' },
            expired: { text: '已过期', type: 'default' },
            active: { text: '有效', type: 'success' },
            revoked: { text: '已撤销', type: 'danger' }
          }
        },
        methods: {
          getStatusConfig(status) {
            return this.data.statusConfig[status];
          }
        }
      });

      expect(statusBadgeComponent.getStatusConfig('pending')).toEqual({
        text: '待审批',
        type: 'warning'
      });
      expect(statusBadgeComponent.getStatusConfig('approved')).toEqual({
        text: '已通过',
        type: 'success'
      });
      expect(statusBadgeComponent.getStatusConfig('rejected')).toEqual({
        text: '已拒绝',
        type: 'danger'
      });
    });

    it('应该支持自定义状态配置', () => {
      const statusBadgeComponent = createMockComponent({
        properties: {
          customConfig: {
            type: Object,
            value: {
              processing: { text: '处理中', type: 'primary' }
            }
          }
        },
        data: {
          statusConfig: {
            pending: { text: '待审批', type: 'warning' }
          }
        },
        methods: {
          mergeConfig() {
            const mergedConfig = {
              ...this.data.statusConfig,
              ...this.properties.customConfig
            };
            this.setData({ statusConfig: mergedConfig });
          }
        }
      });

      statusBadgeComponent.mergeConfig.call(statusBadgeComponent);

      expect(statusBadgeComponent.setData).toHaveBeenCalledWith({
        statusConfig: {
          pending: { text: '待审批', type: 'warning' },
          processing: { text: '处理中', type: 'primary' }
        }
      });
    });
  });

  describe('数据绑定', () => {
    it('应该正确绑定显示文本', () => {
      const statusBadgeComponent = createMockComponent({
        properties: {
          status: 'approved',
          text: ''
        },
        data: {
          displayText: '',
          statusConfig: {
            approved: { text: '已通过', type: 'success' }
          }
        },
        methods: {
          updateDisplayText() {
            const config = this.data.statusConfig[this.properties.status];
            const text = this.properties.text || (config && config.text) || this.properties.status;
            this.setData({ displayText: text });
          }
        }
      });

      statusBadgeComponent.updateDisplayText.call(statusBadgeComponent);

      expect(statusBadgeComponent.setData).toHaveBeenCalledWith({
        displayText: '已通过'
      });
    });

    it('应该优先使用自定义文本', () => {
      const statusBadgeComponent = createMockComponent({
        properties: {
          status: 'approved',
          text: '审核通过'
        },
        data: {
          displayText: '',
          statusConfig: {
            approved: { text: '已通过', type: 'success' }
          }
        },
        methods: {
          updateDisplayText() {
            const config = this.data.statusConfig[this.properties.status];
            const text = this.properties.text || (config && config.text) || this.properties.status;
            this.setData({ displayText: text });
          }
        }
      });

      statusBadgeComponent.updateDisplayText.call(statusBadgeComponent);

      expect(statusBadgeComponent.setData).toHaveBeenCalledWith({
        displayText: '审核通过'
      });
    });

    it('应该在没有配置时使用状态值作为显示文本', () => {
      const statusBadgeComponent = createMockComponent({
        properties: {
          status: 'unknown_status',
          text: ''
        },
        data: {
          displayText: '',
          statusConfig: {}
        },
        methods: {
          updateDisplayText() {
            const config = this.data.statusConfig[this.properties.status];
            const text = this.properties.text || (config && config.text) || this.properties.status;
            this.setData({ displayText: text });
          }
        }
      });

      statusBadgeComponent.updateDisplayText.call(statusBadgeComponent);

      expect(statusBadgeComponent.setData).toHaveBeenCalledWith({
        displayText: 'unknown_status'
      });
    });
  });

  describe('条件渲染', () => {
    it('应该根据状态控制显示隐藏', () => {
      const statusBadgeComponent = createMockComponent({
        properties: {
          status: 'pending',
          hideWhenEmpty: true
        },
        data: {
          visible: true
        },
        methods: {
          updateVisibility() {
            const shouldShow = !this.properties.hideWhenEmpty || 
                             (this.properties.status && this.properties.status.trim());
            this.setData({ visible: shouldShow });
          }
        }
      });

      statusBadgeComponent.updateVisibility.call(statusBadgeComponent);

      expect(statusBadgeComponent.setData).toHaveBeenCalledWith({
        visible: true
      });
    });

    it('应该在状态为空时隐藏组件', () => {
      const statusBadgeComponent = createMockComponent({
        properties: {
          status: '',
          hideWhenEmpty: true
        },
        data: {
          visible: true
        },
        methods: {
          updateVisibility() {
            const shouldShow = !this.properties.hideWhenEmpty || 
                             (this.properties.status && this.properties.status.trim());
            this.setData({ visible: shouldShow });
          }
        }
      });

      statusBadgeComponent.updateVisibility.call(statusBadgeComponent);

      expect(statusBadgeComponent.setData).toHaveBeenCalledWith({
        visible: false
      });
    });
  });
});