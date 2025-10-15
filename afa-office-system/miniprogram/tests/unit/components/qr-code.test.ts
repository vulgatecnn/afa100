// 二维码组件单元测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetMocks, createMockComponent } from '../../setup';

describe('二维码组件测试', () => {
  beforeEach(() => {
    resetMocks();
    // Mock canvas context
    global.wx.createCanvasContext = vi.fn(() => ({
      clearRect: vi.fn(),
      setFillStyle: vi.fn(),
      fillRect: vi.fn(),
      setFontSize: vi.fn(),
      setTextAlign: vi.fn(),
      fillText: vi.fn(),
      draw: vi.fn(),
      drawImage: vi.fn()
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('组件初始化', () => {
    it('应该有正确的初始属性和数据', () => {
      const qrCodeComponent = createMockComponent({
        properties: {
          code: '',
          size: 200,
          backgroundColor: '#ffffff',
          foregroundColor: '#000000',
          showText: true
        },
        data: {
          canvasId: 'qr-canvas',
          generated: false
        }
      });

      expect(qrCodeComponent.properties.code).toBe('');
      expect(qrCodeComponent.properties.size).toBe(200);
      expect(qrCodeComponent.properties.backgroundColor).toBe('#ffffff');
      expect(qrCodeComponent.properties.foregroundColor).toBe('#000000');
      expect(qrCodeComponent.properties.showText).toBe(true);
      expect(qrCodeComponent.data.generated).toBe(false);
    });
  });

  describe('组件生命周期', () => {
    it('应该在attached时生成二维码', () => {
      const qrCodeComponent = createMockComponent({
        properties: {
          code: 'TEST123',
          size: 200
        },
        data: {
          canvasId: 'qr-canvas',
          generated: false
        },
        methods: {
          generateQRCode() {
            const ctx = wx.createCanvasContext(this.data.canvasId, this);
            const size = this.properties.size;
            const code = this.properties.code;
            
            // 清空画布
            ctx.clearRect(0, 0, size, size);
            
            // 设置背景
            ctx.setFillStyle(this.properties.backgroundColor);
            ctx.fillRect(0, 0, size, size);
            
            // 绘制二维码内容（简化版本）
            ctx.setFillStyle(this.properties.foregroundColor);
            ctx.setFontSize(16);
            ctx.setTextAlign('center');
            ctx.fillText(code, size / 2, size / 2);
            
            ctx.draw();
            
            this.setData({ generated: true });
          }
        },
        attached() {
          if (this.properties.code) {
            this.generateQRCode();
          }
        }
      });

      qrCodeComponent.attached();

      expect(wx.createCanvasContext).toHaveBeenCalledWith('qr-canvas', qrCodeComponent);
      expect(qrCodeComponent.setData).toHaveBeenCalledWith({ generated: true });
    });

    it('应该在ready时检查二维码状态', () => {
      const qrCodeComponent = createMockComponent({
        properties: {
          code: ''
        },
        data: {
          generated: false
        },
        methods: {
          checkQRCodeStatus() {
            if (!this.properties.code) {
              console.warn('二维码内容为空');
            }
          }
        },
        ready() {
          this.checkQRCodeStatus();
        }
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      qrCodeComponent.ready();

      expect(consoleSpy).toHaveBeenCalledWith('二维码内容为空');

      consoleSpy.mockRestore();
    });

    it('应该在detached时清理资源', () => {
      const qrCodeComponent = createMockComponent({
        data: {
          timer: 123
        },
        detached() {
          if (this.data.timer) {
            clearInterval(this.data.timer);
          }
        }
      });

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      qrCodeComponent.detached();

      expect(clearIntervalSpy).toHaveBeenCalledWith(123);
    });
  });

  describe('属性变化监听', () => {
    it('应该监听code属性变化并重新生成二维码', () => {
      const qrCodeComponent = createMockComponent({
        properties: {
          code: 'OLD123'
        },
        data: {
          generated: false
        },
        methods: {
          generateQRCode: vi.fn()
        },
        observers: {
          'code': function(newCode) {
            if (newCode && newCode !== this.data.lastCode) {
              this.generateQRCode();
              this.setData({ lastCode: newCode });
            }
          }
        }
      });

      // 模拟属性变化
      qrCodeComponent.observers.code.call(qrCodeComponent, 'NEW123');

      expect(qrCodeComponent.generateQRCode).toHaveBeenCalled();
      expect(qrCodeComponent.setData).toHaveBeenCalledWith({ lastCode: 'NEW123' });
    });

    it('应该监听size属性变化并重新生成二维码', () => {
      const qrCodeComponent = createMockComponent({
        properties: {
          size: 200
        },
        methods: {
          generateQRCode: vi.fn()
        },
        observers: {
          'size': function(newSize) {
            if (newSize && newSize > 0) {
              this.generateQRCode();
            }
          }
        }
      });

      qrCodeComponent.observers.size.call(qrCodeComponent, 300);

      expect(qrCodeComponent.generateQRCode).toHaveBeenCalled();
    });
  });

  describe('二维码生成方法', () => {
    it('应该正确生成二维码', () => {
      const mockCtx = {
        clearRect: vi.fn(),
        setFillStyle: vi.fn(),
        fillRect: vi.fn(),
        setFontSize: vi.fn(),
        setTextAlign: vi.fn(),
        fillText: vi.fn(),
        draw: vi.fn()
      };

      global.wx.createCanvasContext = vi.fn(() => mockCtx);

      const qrCodeComponent = createMockComponent({
        properties: {
          code: 'TEST123',
          size: 200,
          backgroundColor: '#ffffff',
          foregroundColor: '#000000'
        },
        data: {
          canvasId: 'qr-canvas',
          generated: false
        },
        methods: {
          generateQRCode() {
            const ctx = wx.createCanvasContext(this.data.canvasId, this);
            const size = this.properties.size;
            const code = this.properties.code;
            
            ctx.clearRect(0, 0, size, size);
            ctx.setFillStyle(this.properties.backgroundColor);
            ctx.fillRect(0, 0, size, size);
            ctx.setFillStyle(this.properties.foregroundColor);
            ctx.setFontSize(16);
            ctx.setTextAlign('center');
            ctx.fillText(code, size / 2, size / 2);
            ctx.draw();
            
            this.setData({ generated: true });
            
            // 触发生成完成事件
            this.triggerEvent('generated', { code, size });
          }
        }
      });

      qrCodeComponent.generateQRCode();

      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 200, 200);
      expect(mockCtx.setFillStyle).toHaveBeenCalledWith('#ffffff');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 200, 200);
      expect(mockCtx.setFillStyle).toHaveBeenCalledWith('#000000');
      expect(mockCtx.fillText).toHaveBeenCalledWith('TEST123', 100, 100);
      expect(mockCtx.draw).toHaveBeenCalled();
      expect(qrCodeComponent.setData).toHaveBeenCalledWith({ generated: true });
      expect(qrCodeComponent.triggerEvent).toHaveBeenCalledWith('generated', {
        code: 'TEST123',
        size: 200
      });
    });

    it('应该处理空的二维码内容', () => {
      const qrCodeComponent = createMockComponent({
        properties: {
          code: '',
          size: 200
        },
        methods: {
          generateQRCode() {
            if (!this.properties.code) {
              this.triggerEvent('error', { message: '二维码内容不能为空' });
              return;
            }
            
            // 正常生成逻辑...
          }
        }
      });

      qrCodeComponent.generateQRCode();

      expect(qrCodeComponent.triggerEvent).toHaveBeenCalledWith('error', {
        message: '二维码内容不能为空'
      });
    });
  });

  describe('事件处理', () => {
    it('应该处理点击事件', () => {
      const qrCodeComponent = createMockComponent({
        properties: {
          code: 'TEST123'
        },
        methods: {
          onTap(e) {
            this.triggerEvent('tap', {
              code: this.properties.code,
              timestamp: Date.now()
            });
          }
        }
      });

      const mockEvent = {
        type: 'tap',
        currentTarget: { dataset: {} }
      };

      qrCodeComponent.onTap(mockEvent);

      expect(qrCodeComponent.triggerEvent).toHaveBeenCalledWith('tap', {
        code: 'TEST123',
        timestamp: expect.any(Number)
      });
    });

    it('应该处理长按事件', () => {
      const qrCodeComponent = createMockComponent({
        properties: {
          code: 'TEST123'
        },
        methods: {
          onLongPress(e) {
            // 长按保存二维码到相册
            wx.showActionSheet({
              itemList: ['保存到相册', '分享'],
              success: (res) => {
                if (res.tapIndex === 0) {
                  this.saveToAlbum();
                } else if (res.tapIndex === 1) {
                  this.shareQRCode();
                }
              }
            });
          },
          saveToAlbum() {
            this.triggerEvent('save', { code: this.properties.code });
          },
          shareQRCode() {
            this.triggerEvent('share', { code: this.properties.code });
          }
        }
      });

      qrCodeComponent.onLongPress({});

      expect(wx.showActionSheet).toHaveBeenCalledWith({
        itemList: ['保存到相册', '分享'],
        success: expect.any(Function)
      });
    });
  });

  describe('数据绑定', () => {
    it('应该正确绑定属性到视图', () => {
      const qrCodeComponent = createMockComponent({
        properties: {
          code: 'TEST123',
          size: 200,
          showText: true
        },
        data: {
          displayText: ''
        },
        methods: {
          updateDisplayText() {
            if (this.properties.showText) {
              this.setData({
                displayText: `通行码: ${this.properties.code}`
              });
            } else {
              this.setData({
                displayText: ''
              });
            }
          }
        }
      });

      qrCodeComponent.updateDisplayText();

      expect(qrCodeComponent.setData).toHaveBeenCalledWith({
        displayText: '通行码: TEST123'
      });
    });

    it('应该根据showText属性控制文本显示', () => {
      const qrCodeComponent = createMockComponent({
        properties: {
          code: 'TEST123',
          showText: false
        },
        data: {
          displayText: '通行码: TEST123'
        },
        methods: {
          updateDisplayText() {
            if (this.properties.showText) {
              this.setData({
                displayText: `通行码: ${this.properties.code}`
              });
            } else {
              this.setData({
                displayText: ''
              });
            }
          }
        }
      });

      qrCodeComponent.updateDisplayText();

      expect(qrCodeComponent.setData).toHaveBeenCalledWith({
        displayText: ''
      });
    });
  });

  describe('样式渲染', () => {
    it('应该根据size属性设置画布尺寸', () => {
      const qrCodeComponent = createMockComponent({
        properties: {
          size: 300
        },
        data: {
          canvasStyle: ''
        },
        methods: {
          updateCanvasStyle() {
            const size = this.properties.size;
            this.setData({
              canvasStyle: `width: ${size}px; height: ${size}px;`
            });
          }
        }
      });

      qrCodeComponent.updateCanvasStyle();

      expect(qrCodeComponent.setData).toHaveBeenCalledWith({
        canvasStyle: 'width: 300px; height: 300px;'
      });
    });

    it('应该支持自定义样式类', () => {
      const qrCodeComponent = createMockComponent({
        properties: {
          customClass: 'custom-qr-code'
        },
        data: {
          containerClass: ''
        },
        methods: {
          updateContainerClass() {
            const baseClass = 'qr-code-container';
            const customClass = this.properties.customClass;
            this.setData({
              containerClass: customClass ? `${baseClass} ${customClass}` : baseClass
            });
          }
        }
      });

      qrCodeComponent.updateContainerClass();

      expect(qrCodeComponent.setData).toHaveBeenCalledWith({
        containerClass: 'qr-code-container custom-qr-code'
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理画布创建失败', () => {
      global.wx.createCanvasContext = vi.fn(() => null);

      const qrCodeComponent = createMockComponent({
        properties: {
          code: 'TEST123'
        },
        methods: {
          generateQRCode() {
            const ctx = wx.createCanvasContext(this.data.canvasId, this);
            if (!ctx) {
              this.triggerEvent('error', { message: '画布创建失败' });
              return;
            }
            
            // 正常生成逻辑...
          }
        }
      });

      qrCodeComponent.generateQRCode();

      expect(qrCodeComponent.triggerEvent).toHaveBeenCalledWith('error', {
        message: '画布创建失败'
      });
    });

    it('应该处理绘制异常', () => {
      const mockCtx = {
        clearRect: vi.fn(),
        setFillStyle: vi.fn(),
        fillRect: vi.fn(),
        setFontSize: vi.fn(),
        setTextAlign: vi.fn(),
        fillText: vi.fn(),
        draw: vi.fn(() => {
          throw new Error('绘制失败');
        })
      };

      global.wx.createCanvasContext = vi.fn(() => mockCtx);

      const qrCodeComponent = createMockComponent({
        properties: {
          code: 'TEST123',
          size: 200
        },
        methods: {
          generateQRCode() {
            try {
              const ctx = wx.createCanvasContext(this.data.canvasId, this);
              const size = this.properties.size;
              
              ctx.clearRect(0, 0, size, size);
              ctx.setFillStyle('#ffffff');
              ctx.fillRect(0, 0, size, size);
              ctx.draw();
              
            } catch (error) {
              this.triggerEvent('error', { message: error.message });
            }
          }
        }
      });

      qrCodeComponent.generateQRCode();

      expect(qrCodeComponent.triggerEvent).toHaveBeenCalledWith('error', {
        message: '绘制失败'
      });
    });
  });
});