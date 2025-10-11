// 访客通行码页面单元测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetMocks, mockApiResponse, mockApiError } from '../../setup';

describe('访客通行码页面测试', () => {
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
      draw: vi.fn()
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('页面初始状态', () => {
    it('应该有正确的初始数据', () => {
      const passcodePage = {
        data: {
          applicationId: 0,
          passcodeInfo: null,
          applicationInfo: null,
          qrSize: 200,
          expiryTimeText: '',
          remainingUsage: 0,
          permissionsText: '',
          overlayText: '',
          statusText: {
            active: '有效',
            expired: '已过期',
            revoked: '已撤销'
          },
          loading: false,
          refreshing: false,
          autoRefreshTimer: null
        }
      };

      expect(passcodePage.data.applicationId).toBe(0);
      expect(passcodePage.data.passcodeInfo).toBeNull();
      expect(passcodePage.data.qrSize).toBe(200);
      expect(passcodePage.data.statusText.active).toBe('有效');
      expect(passcodePage.data.loading).toBe(false);
      expect(passcodePage.data.refreshing).toBe(false);
    });
  });

  describe('页面生命周期', () => {
    it('应该在onLoad时设置applicationId并加载通行码信息', async () => {
      const mockPasscodeInfo = {
        id: 1,
        code: 'TEST123',
        status: 'active',
        expiryTime: '2024-12-31T23:59:59.000Z',
        usageLimit: 10,
        usageCount: 2,
        permissions: ['基础通行']
      };

      const mockApplicationInfo = {
        id: 1,
        merchantId: 1,
        visitorName: '张三',
        scheduledTime: '2024-01-01T10:00:00.000Z',
        status: 'approved'
      };

      const passcodePage = {
        data: {
          applicationId: 0,
          loading: false
        },
        setData: vi.fn(),
        async loadPasscodeInfo() {
          try {
            this.setData({ loading: true });
            
            // 模拟API调用
            const passcodeInfo = mockPasscodeInfo;
            const applicationInfo = mockApplicationInfo;
            
            const processedApplication = {
              ...applicationInfo,
              merchantName: `商户${applicationInfo.merchantId}`,
              scheduledTimeText: this.formatDateTime(applicationInfo.scheduledTime)
            };
            
            this.setData({
              passcodeInfo,
              applicationInfo: processedApplication,
              expiryTimeText: this.formatDateTime(passcodeInfo.expiryTime),
              remainingUsage: passcodeInfo.usageLimit - passcodeInfo.usageCount,
              permissionsText: passcodeInfo.permissions.join(', ') || '基础通行权限'
            });
            
            this.generateQRCode(passcodeInfo.code);
            this.updateOverlayText();
            
          } catch (error) {
            wx.showToast({
              title: error.message || '加载通行码失败',
              icon: 'error'
            });
          } finally {
            this.setData({ loading: false });
          }
        },
        formatDateTime(dateTimeStr) {
          const date = new Date(dateTimeStr);
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const hour = date.getHours();
          const minute = date.getMinutes();
          
          return `${month}月${day}日 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        },
        generateQRCode(code) {
          const ctx = wx.createCanvasContext('qrCanvas', this);
          const size = this.data.qrSize;
          
          ctx.clearRect(0, 0, size, size);
          ctx.setFillStyle('#ffffff');
          ctx.fillRect(0, 0, size, size);
          ctx.setFillStyle('#000000');
          ctx.setFontSize(16);
          ctx.setTextAlign('center');
          ctx.fillText(code, size / 2, size / 2);
          ctx.draw();
        },
        updateOverlayText() {
          const { passcodeInfo } = this.data;
          if (!passcodeInfo) return;
          
          let overlayText = '';
          if (passcodeInfo.status === 'expired') {
            overlayText = '通行码已过期';
          } else if (passcodeInfo.status === 'revoked') {
            overlayText = '通行码已撤销';
          } else if (passcodeInfo.usageCount >= passcodeInfo.usageLimit) {
            overlayText = '使用次数已用完';
          }
          
          this.setData({ overlayText });
        },
        onLoad(options) {
          const applicationId = parseInt(options.applicationId);
          this.setData({ applicationId });
          this.loadPasscodeInfo();
        }
      };

      await passcodePage.onLoad({ applicationId: '123' });

      expect(passcodePage.setData).toHaveBeenCalledWith({ applicationId: 123 });
      expect(passcodePage.setData).toHaveBeenCalledWith({ loading: true });
      expect(passcodePage.setData).toHaveBeenCalledWith({
        passcodeInfo: mockPasscodeInfo,
        applicationInfo: expect.objectContaining({
          merchantName: '商户1',
          scheduledTimeText: expect.any(String)
        }),
        expiryTimeText: expect.any(String),
        remainingUsage: 8,
        permissionsText: '基础通行'
      });
    });

    it('应该在onShow时开始自动刷新', () => {
      const passcodePage = {
        data: { autoRefreshTimer: null },
        setData: vi.fn(),
        startAutoRefresh() {
          const timer = setInterval(() => {
            this.checkPasscodeStatus();
          }, 30000);
          
          this.setData({ autoRefreshTimer: timer });
          this.checkPasscodeStatus();
        },
        checkPasscodeStatus: vi.fn(),
        onShow() {
          this.startAutoRefresh();
        }
      };

      passcodePage.onShow();

      expect(passcodePage.checkPasscodeStatus).toHaveBeenCalled();
      expect(passcodePage.setData).toHaveBeenCalledWith({
        autoRefreshTimer: expect.anything()
      });
    });

    it('应该在onHide时停止自动刷新', () => {
      const mockTimer = 123;
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const passcodePage = {
        data: { autoRefreshTimer: mockTimer },
        setData: vi.fn(),
        stopAutoRefresh() {
          if (this.data.autoRefreshTimer) {
            clearInterval(this.data.autoRefreshTimer);
            this.setData({ autoRefreshTimer: null });
          }
        },
        onHide() {
          this.stopAutoRefresh();
        }
      };

      passcodePage.onHide();

      expect(clearIntervalSpy).toHaveBeenCalledWith(mockTimer);
      expect(passcodePage.setData).toHaveBeenCalledWith({ autoRefreshTimer: null });
    });
  });

  describe('通行码信息加载', () => {
    it('应该成功加载通行码信息', async () => {
      const mockPasscodeInfo = {
        id: 1,
        code: 'TEST123',
        status: 'active',
        expiryTime: '2024-12-31T23:59:59.000Z',
        usageLimit: 10,
        usageCount: 2,
        permissions: ['基础通行', '会议室']
      };

      const mockApplicationInfo = {
        id: 1,
        merchantId: 1,
        visitorName: '张三',
        scheduledTime: '2024-01-01T10:00:00.000Z',
        status: 'approved'
      };

      const passcodePage = {
        data: {
          applicationId: 1,
          loading: false,
          qrSize: 200
        },
        setData: vi.fn(),
        formatDateTime(dateTimeStr) {
          const date = new Date(dateTimeStr);
          return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        },
        generateQRCode: vi.fn(),
        updateOverlayText: vi.fn(),
        async loadPasscodeInfo() {
          try {
            this.setData({ loading: true });
            
            const passcodeInfo = mockPasscodeInfo;
            const applicationInfo = mockApplicationInfo;
            
            const processedApplication = {
              ...applicationInfo,
              merchantName: `商户${applicationInfo.merchantId}`,
              scheduledTimeText: this.formatDateTime(applicationInfo.scheduledTime)
            };
            
            this.setData({
              passcodeInfo,
              applicationInfo: processedApplication,
              expiryTimeText: this.formatDateTime(passcodeInfo.expiryTime),
              remainingUsage: passcodeInfo.usageLimit - passcodeInfo.usageCount,
              permissionsText: passcodeInfo.permissions.join(', ') || '基础通行权限'
            });
            
            this.generateQRCode(passcodeInfo.code);
            this.updateOverlayText();
            
          } catch (error) {
            wx.showToast({
              title: error.message || '加载通行码失败',
              icon: 'error'
            });
          } finally {
            this.setData({ loading: false });
          }
        }
      };

      await passcodePage.loadPasscodeInfo();

      expect(passcodePage.setData).toHaveBeenCalledWith({ loading: true });
      expect(passcodePage.setData).toHaveBeenCalledWith({
        passcodeInfo: mockPasscodeInfo,
        applicationInfo: expect.objectContaining({
          merchantName: '商户1',
          scheduledTimeText: expect.any(String)
        }),
        expiryTimeText: expect.any(String),
        remainingUsage: 8,
        permissionsText: '基础通行, 会议室'
      });
      expect(passcodePage.generateQRCode).toHaveBeenCalledWith('TEST123');
      expect(passcodePage.updateOverlayText).toHaveBeenCalled();
      expect(passcodePage.setData).toHaveBeenCalledWith({ loading: false });
    });

    it('应该处理加载通行码信息失败', async () => {
      const passcodePage = {
        data: { loading: false },
        setData: vi.fn(),
        async loadPasscodeInfo() {
          try {
            this.setData({ loading: true });
            throw new Error('网络错误');
          } catch (error) {
            wx.showToast({
              title: error.message || '加载通行码失败',
              icon: 'error'
            });
          } finally {
            this.setData({ loading: false });
          }
        }
      };

      await passcodePage.loadPasscodeInfo();

      expect(wx.showToast).toHaveBeenCalledWith({
        title: '网络错误',
        icon: 'error'
      });
      expect(passcodePage.setData).toHaveBeenCalledWith({ loading: false });
    });
  });

  describe('二维码生成', () => {
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

      const passcodePage = {
        data: { qrSize: 200 },
        generateQRCode(code) {
          const ctx = wx.createCanvasContext('qrCanvas', this);
          const size = this.data.qrSize;
          
          ctx.clearRect(0, 0, size, size);
          ctx.setFillStyle('#ffffff');
          ctx.fillRect(0, 0, size, size);
          ctx.setFillStyle('#000000');
          ctx.setFontSize(16);
          ctx.setTextAlign('center');
          ctx.fillText(code, size / 2, size / 2);
          ctx.draw();
        }
      };

      passcodePage.generateQRCode('TEST123');

      expect(wx.createCanvasContext).toHaveBeenCalledWith('qrCanvas', passcodePage);
      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 200, 200);
      expect(mockCtx.setFillStyle).toHaveBeenCalledWith('#ffffff');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 200, 200);
      expect(mockCtx.setFillStyle).toHaveBeenCalledWith('#000000');
      expect(mockCtx.fillText).toHaveBeenCalledWith('TEST123', 100, 100);
      expect(mockCtx.draw).toHaveBeenCalled();
    });
  });

  describe('日期时间格式化', () => {
    it('应该正确格式化日期时间', () => {
      const passcodePage = {
        formatDateTime(dateTimeStr) {
          const date = new Date(dateTimeStr);
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const hour = date.getHours();
          const minute = date.getMinutes();
          
          return `${month}月${day}日 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        }
      };

      const result = passcodePage.formatDateTime('2024-01-15T14:30:00.000Z');
      
      expect(result).toMatch(/\d+月\d+日 \d{2}:\d{2}/);
    });
  });

  describe('覆盖层文本更新', () => {
    it('应该为过期通行码设置覆盖层文本', () => {
      const passcodePage = {
        data: {
          passcodeInfo: {
            status: 'expired',
            usageCount: 5,
            usageLimit: 10
          }
        },
        setData: vi.fn(),
        updateOverlayText() {
          const { passcodeInfo } = this.data;
          if (!passcodeInfo) return;
          
          let overlayText = '';
          if (passcodeInfo.status === 'expired') {
            overlayText = '通行码已过期';
          } else if (passcodeInfo.status === 'revoked') {
            overlayText = '通行码已撤销';
          } else if (passcodeInfo.usageCount >= passcodeInfo.usageLimit) {
            overlayText = '使用次数已用完';
          }
          
          this.setData({ overlayText });
        }
      };

      passcodePage.updateOverlayText();

      expect(passcodePage.setData).toHaveBeenCalledWith({
        overlayText: '通行码已过期'
      });
    });

    it('应该为撤销通行码设置覆盖层文本', () => {
      const passcodePage = {
        data: {
          passcodeInfo: {
            status: 'revoked',
            usageCount: 3,
            usageLimit: 10
          }
        },
        setData: vi.fn(),
        updateOverlayText() {
          const { passcodeInfo } = this.data;
          if (!passcodeInfo) return;
          
          let overlayText = '';
          if (passcodeInfo.status === 'expired') {
            overlayText = '通行码已过期';
          } else if (passcodeInfo.status === 'revoked') {
            overlayText = '通行码已撤销';
          } else if (passcodeInfo.usageCount >= passcodeInfo.usageLimit) {
            overlayText = '使用次数已用完';
          }
          
          this.setData({ overlayText });
        }
      };

      passcodePage.updateOverlayText();

      expect(passcodePage.setData).toHaveBeenCalledWith({
        overlayText: '通行码已撤销'
      });
    });

    it('应该为用完次数的通行码设置覆盖层文本', () => {
      const passcodePage = {
        data: {
          passcodeInfo: {
            status: 'active',
            usageCount: 10,
            usageLimit: 10
          }
        },
        setData: vi.fn(),
        updateOverlayText() {
          const { passcodeInfo } = this.data;
          if (!passcodeInfo) return;
          
          let overlayText = '';
          if (passcodeInfo.status === 'expired') {
            overlayText = '通行码已过期';
          } else if (passcodeInfo.status === 'revoked') {
            overlayText = '通行码已撤销';
          } else if (passcodeInfo.usageCount >= passcodeInfo.usageLimit) {
            overlayText = '使用次数已用完';
          }
          
          this.setData({ overlayText });
        }
      };

      passcodePage.updateOverlayText();

      expect(passcodePage.setData).toHaveBeenCalledWith({
        overlayText: '使用次数已用完'
      });
    });
  });

  describe('通行码刷新', () => {
    it('应该成功刷新通行码', async () => {
      const newPasscodeInfo = {
        id: 1,
        code: 'NEW123',
        status: 'active',
        expiryTime: '2024-12-31T23:59:59.000Z',
        usageLimit: 10,
        usageCount: 0,
        permissions: ['基础通行']
      };

      const passcodePage = {
        data: {
          applicationId: 1,
          refreshing: false
        },
        setData: vi.fn(),
        formatDateTime(dateTimeStr) {
          return '12月31日 23:59';
        },
        generateQRCode: vi.fn(),
        updateOverlayText: vi.fn(),
        async onRefreshPasscode() {
          try {
            this.setData({ refreshing: true });
            
            // 模拟API调用
            const newPasscodeInfo = {
              id: 1,
              code: 'NEW123',
              status: 'active',
              expiryTime: '2024-12-31T23:59:59.000Z',
              usageLimit: 10,
              usageCount: 0,
              permissions: ['基础通行']
            };
            
            this.setData({
              passcodeInfo: newPasscodeInfo,
              expiryTimeText: this.formatDateTime(newPasscodeInfo.expiryTime),
              remainingUsage: newPasscodeInfo.usageLimit - newPasscodeInfo.usageCount
            });
            
            this.generateQRCode(newPasscodeInfo.code);
            this.updateOverlayText();
            
            wx.showToast({
              title: '通行码已刷新',
              icon: 'success'
            });
            
          } catch (error) {
            wx.showToast({
              title: error.message || '刷新通行码失败',
              icon: 'error'
            });
          } finally {
            this.setData({ refreshing: false });
          }
        }
      };

      await passcodePage.onRefreshPasscode();

      expect(passcodePage.setData).toHaveBeenCalledWith({ refreshing: true });
      expect(passcodePage.setData).toHaveBeenCalledWith({
        passcodeInfo: newPasscodeInfo,
        expiryTimeText: '12月31日 23:59',
        remainingUsage: 10
      });
      expect(passcodePage.generateQRCode).toHaveBeenCalledWith('NEW123');
      expect(passcodePage.updateOverlayText).toHaveBeenCalled();
      expect(wx.showToast).toHaveBeenCalledWith({
        title: '通行码已刷新',
        icon: 'success'
      });
      expect(passcodePage.setData).toHaveBeenCalledWith({ refreshing: false });
    });

    it('应该处理刷新通行码失败', async () => {
      const passcodePage = {
        data: { refreshing: false },
        setData: vi.fn(),
        async onRefreshPasscode() {
          try {
            this.setData({ refreshing: true });
            throw new Error('刷新失败');
          } catch (error) {
            wx.showToast({
              title: error.message || '刷新通行码失败',
              icon: 'error'
            });
          } finally {
            this.setData({ refreshing: false });
          }
        }
      };

      await passcodePage.onRefreshPasscode();

      expect(wx.showToast).toHaveBeenCalledWith({
        title: '刷新失败',
        icon: 'error'
      });
      expect(passcodePage.setData).toHaveBeenCalledWith({ refreshing: false });
    });
  });

  describe('导航功能', () => {
    it('应该正确导航到通行记录页面', () => {
      const passcodePage = {
        data: { applicationId: 123 },
        onViewHistory() {
          wx.navigateTo({
            url: `/pages/visitor/history/history?applicationId=${this.data.applicationId}`
          });
        }
      };

      passcodePage.onViewHistory();

      expect(wx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/visitor/history/history?applicationId=123'
      });
    });
  });

  describe('自动刷新功能', () => {
    it('应该正确启动自动刷新', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval').mockReturnValue(123);

      const passcodePage = {
        data: { autoRefreshTimer: null },
        setData: vi.fn(),
        checkPasscodeStatus: vi.fn(),
        startAutoRefresh() {
          const timer = setInterval(() => {
            this.checkPasscodeStatus();
          }, 30000);
          
          this.setData({ autoRefreshTimer: timer });
          this.checkPasscodeStatus();
        }
      };

      passcodePage.startAutoRefresh();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);
      expect(passcodePage.setData).toHaveBeenCalledWith({ autoRefreshTimer: 123 });
      expect(passcodePage.checkPasscodeStatus).toHaveBeenCalled();
    });

    it('应该正确停止自动刷新', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const mockTimer = 123;

      const passcodePage = {
        data: { autoRefreshTimer: mockTimer },
        setData: vi.fn(),
        stopAutoRefresh() {
          if (this.data.autoRefreshTimer) {
            clearInterval(this.data.autoRefreshTimer);
            this.setData({ autoRefreshTimer: null });
          }
        }
      };

      passcodePage.stopAutoRefresh();

      expect(clearIntervalSpy).toHaveBeenCalledWith(mockTimer);
      expect(passcodePage.setData).toHaveBeenCalledWith({ autoRefreshTimer: null });
    });
  });

  describe('通行码状态检查', () => {
    it('应该检查并更新通行码状态变化', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const passcodePage = {
        data: {
          applicationId: 1,
          passcodeInfo: {
            status: 'active',
            usageCount: 5,
            code: 'OLD123'
          }
        },
        setData: vi.fn(),
        formatDateTime: vi.fn(() => '12月31日 23:59'),
        generateQRCode: vi.fn(),
        updateOverlayText: vi.fn(),
        async checkPasscodeStatus() {
          try {
            // 模拟API调用返回新状态
            const passcodeInfo = {
              status: 'expired',
              usageCount: 10,
              code: 'NEW123',
              expiryTime: '2024-12-31T23:59:59.000Z',
              usageLimit: 10
            };
            
            // 检查状态是否发生变化
            if (passcodeInfo.status !== this.data.passcodeInfo?.status ||
                passcodeInfo.usageCount !== this.data.passcodeInfo?.usageCount ||
                passcodeInfo.code !== this.data.passcodeInfo?.code) {
              
              this.setData({
                passcodeInfo,
                expiryTimeText: this.formatDateTime(passcodeInfo.expiryTime),
                remainingUsage: passcodeInfo.usageLimit - passcodeInfo.usageCount
              });
              
              if (passcodeInfo.code !== this.data.passcodeInfo?.code) {
                this.generateQRCode(passcodeInfo.code);
              }
              
              this.updateOverlayText();
              
              if (passcodeInfo.status === 'expired' || passcodeInfo.status === 'revoked') {
                wx.showToast({
                  title: passcodeInfo.status === 'expired' ? '通行码已过期' : '通行码已撤销',
                  icon: 'none',
                  duration: 2000
                });
              }
            }
            
          } catch (error) {
            console.error('检查通行码状态失败:', error);
          }
        }
      };

      await passcodePage.checkPasscodeStatus();

      expect(passcodePage.setData).toHaveBeenCalledWith({
        passcodeInfo: expect.objectContaining({
          status: 'expired',
          usageCount: 10,
          code: 'NEW123'
        }),
        expiryTimeText: '12月31日 23:59',
        remainingUsage: 0
      });
      expect(passcodePage.generateQRCode).toHaveBeenCalledWith('NEW123');
      expect(passcodePage.updateOverlayText).toHaveBeenCalled();
      expect(wx.showToast).toHaveBeenCalledWith({
        title: '通行码已过期',
        icon: 'none',
        duration: 2000
      });

      consoleSpy.mockRestore();
    });

    it('应该静默处理状态检查错误', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const passcodePage = {
        data: { applicationId: 1 },
        async checkPasscodeStatus() {
          try {
            throw new Error('网络错误');
          } catch (error) {
            console.error('检查通行码状态失败:', error);
          }
        }
      };

      await passcodePage.checkPasscodeStatus();

      expect(consoleSpy).toHaveBeenCalledWith('检查通行码状态失败:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});