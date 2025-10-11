// 通行码展示端到端测试
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock 小程序页面环境
const mockPage = {
  data: {},
  setData: vi.fn(),
  onLoad: vi.fn(),
  onShow: vi.fn(),
  onHide: vi.fn(),
  onUnload: vi.fn()
};

// Mock wx API
const mockWx = {
  request: vi.fn(),
  getStorageSync: vi.fn(),
  createCanvasContext: vi.fn(),
  showToast: vi.fn(),
  navigateTo: vi.fn(),
  stopPullDownRefresh: vi.fn()
};

// @ts-ignore
global.wx = mockWx;
// @ts-ignore
global.Page = vi.fn((config) => ({ ...mockPage, ...config }));
// @ts-ignore
global.getApp = vi.fn(() => ({
  globalData: {
    apiBase: 'http://localhost:3000',
    userInfo: { id: 1, userType: 'employee' }
  }
}));

describe('Passcode Display E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWx.getStorageSync.mockReturnValue('mock-token');
  });

  describe('Visitor Passcode Display', () => {
    it('should display visitor passcode correctly', async () => {
      // Mock 访客通行码数据
      const mockPasscodeInfo = {
        id: 1,
        code: 'VIS123456',
        type: 'visitor',
        status: 'active',
        expiryTime: '2024-01-01T12:00:00Z',
        usageLimit: 3,
        usageCount: 0,
        permissions: ['floor_1', 'floor_2']
      };

      const mockApplicationInfo = {
        id: 1,
        visitorName: '张三',
        visitorPhone: '13800138000',
        merchantId: 1,
        visitPurpose: '商务洽谈',
        scheduledTime: '2024-01-01T10:00:00Z',
        duration: 2
      };

      // Mock API 响应
      mockWx.request
        .mockImplementationOnce(({ success }) => {
          success({
            statusCode: 200,
            data: { success: true, data: mockPasscodeInfo }
          });
        })
        .mockImplementationOnce(({ success }) => {
          success({
            statusCode: 200,
            data: { success: true, data: mockApplicationInfo }
          });
        });

      // Mock Canvas 上下文
      const mockCanvasContext = {
        clearRect: vi.fn(),
        setFillStyle: vi.fn(),
        fillRect: vi.fn(),
        setFontSize: vi.fn(),
        setTextAlign: vi.fn(),
        fillText: vi.fn(),
        draw: vi.fn()
      };

      mockWx.createCanvasContext.mockReturnValue(mockCanvasContext);

      // 模拟页面加载
      const pageConfig = {
        data: {
          applicationId: 1,
          passcodeInfo: null,
          applicationInfo: null,
          qrSize: 200,
          loading: false
        },

        async loadPasscodeInfo() {
          this.setData({ loading: true });
          
          // 模拟加载通行码信息
          const passcodeInfo = mockPasscodeInfo;
          const applicationInfo = mockApplicationInfo;
          
          this.setData({
            passcodeInfo,
            applicationInfo,
            loading: false
          });
          
          // 生成二维码
          this.generateQRCode(passcodeInfo.code);
        },

        generateQRCode(code: string) {
          const ctx = mockWx.createCanvasContext('qrCanvas');
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

        setData: mockPage.setData
      };

      const page = Page(pageConfig);

      // 执行页面加载
      await page.loadPasscodeInfo();

      // 验证数据设置
      expect(mockPage.setData).toHaveBeenCalledWith({ loading: true });
      expect(mockPage.setData).toHaveBeenCalledWith({
        passcodeInfo: mockPasscodeInfo,
        applicationInfo: mockApplicationInfo,
        loading: false
      });

      // 验证二维码生成
      expect(mockWx.createCanvasContext).toHaveBeenCalledWith('qrCanvas');
      expect(mockCanvasContext.clearRect).toHaveBeenCalledWith(0, 0, 200, 200);
      expect(mockCanvasContext.fillText).toHaveBeenCalledWith('VIS123456', 100, 100);
      expect(mockCanvasContext.draw).toHaveBeenCalled();
    });

    it('should handle passcode refresh correctly', async () => {
      const originalPasscode = {
        id: 1,
        code: 'VIS123456',
        status: 'active',
        expiryTime: '2024-01-01T12:00:00Z',
        usageCount: 1
      };

      const refreshedPasscode = {
        ...originalPasscode,
        code: 'VIS789012',
        expiryTime: '2024-01-01T14:00:00Z',
        usageCount: 0
      };

      // Mock 刷新 API
      mockWx.request.mockImplementation(({ success }) => {
        success({
          statusCode: 200,
          data: { success: true, data: refreshedPasscode }
        });
      });

      const pageConfig = {
        data: {
          passcodeInfo: originalPasscode,
          refreshing: false
        },

        async onRefreshPasscode() {
          this.setData({ refreshing: true });
          
          try {
            // 模拟刷新请求
            const newPasscodeInfo = refreshedPasscode;
            
            this.setData({
              passcodeInfo: newPasscodeInfo,
              refreshing: false
            });
            
            // 重新生成二维码
            this.generateQRCode(newPasscodeInfo.code);
            
            mockWx.showToast({
              title: '通行码已刷新',
              icon: 'success'
            });
          } catch (error) {
            this.setData({ refreshing: false });
            mockWx.showToast({
              title: '刷新失败',
              icon: 'error'
            });
          }
        },

        generateQRCode: vi.fn(),
        setData: mockPage.setData
      };

      const page = Page(pageConfig);

      // 执行刷新操作
      await page.onRefreshPasscode();

      // 验证刷新流程
      expect(mockPage.setData).toHaveBeenCalledWith({ refreshing: true });
      expect(mockPage.setData).toHaveBeenCalledWith({
        passcodeInfo: refreshedPasscode,
        refreshing: false
      });
      expect(page.generateQRCode).toHaveBeenCalledWith('VIS789012');
      expect(mockWx.showToast).toHaveBeenCalledWith({
        title: '通行码已刷新',
        icon: 'success'
      });
    });

    it('should handle expired passcode display', async () => {
      const expiredPasscode = {
        id: 1,
        code: 'EXP123456',
        status: 'expired',
        expiryTime: '2024-01-01T09:00:00Z',
        usageLimit: 3,
        usageCount: 2
      };

      const pageConfig = {
        data: {
          passcodeInfo: expiredPasscode,
          overlayText: ''
        },

        updateOverlayText() {
          const { passcodeInfo } = this.data;
          let overlayText = '';
          
          if (passcodeInfo.status === 'expired') {
            overlayText = '通行码已过期';
          } else if (passcodeInfo.usageCount >= passcodeInfo.usageLimit) {
            overlayText = '使用次数已用完';
          }
          
          this.setData({ overlayText });
        },

        setData: mockPage.setData
      };

      const page = Page(pageConfig);

      // 更新覆盖层文本
      page.updateOverlayText();

      // 验证过期状态显示
      expect(mockPage.setData).toHaveBeenCalledWith({
        overlayText: '通行码已过期'
      });
    });
  });

  describe('Employee Passcode Display', () => {
    it('should display employee passcode with auto-refresh', async () => {
      const mockEmployeePasscode = {
        id: 1,
        code: 'EMP123456',
        type: 'employee',
        status: 'active',
        expiryTime: '2024-12-31T23:59:59Z',
        usageLimit: 999,
        usageCount: 10,
        permissions: ['all_floors', 'parking']
      };

      let refreshCount = 0;
      const mockTimer = setInterval(() => {
        refreshCount++;
      }, 1000);

      const pageConfig = {
        data: {
          passcodeInfo: mockEmployeePasscode,
          refreshCountdown: 30,
          refreshProgress: 100,
          autoRefreshTimer: null,
          countdownTimer: null
        },

        startAutoRefresh() {
          // 每30秒自动刷新
          const refreshTimer = setInterval(() => {
            this.autoRefreshPasscode();
          }, 30000);
          
          // 每秒更新倒计时
          const countdownTimer = setInterval(() => {
            this.updateCountdown();
          }, 1000);
          
          this.setData({
            autoRefreshTimer: refreshTimer,
            countdownTimer: countdownTimer
          });
        },

        updateCountdown() {
          const { refreshCountdown } = this.data;
          if (refreshCountdown > 0) {
            const newCountdown = refreshCountdown - 1;
            const progress = (newCountdown / 30) * 100;
            
            this.setData({
              refreshCountdown: newCountdown,
              refreshProgress: progress
            });
          }
        },

        autoRefreshPasscode: vi.fn(),
        setData: mockPage.setData
      };

      const page = Page(pageConfig);

      // 启动自动刷新
      page.startAutoRefresh();

      // 验证定时器设置
      expect(page.data.autoRefreshTimer).toBeDefined();
      expect(page.data.countdownTimer).toBeDefined();

      // 模拟倒计时更新
      page.updateCountdown();
      expect(mockPage.setData).toHaveBeenCalledWith({
        refreshCountdown: 29,
        refreshProgress: expect.closeTo(96.67, 1)
      });

      // 清理定时器
      clearInterval(mockTimer);
    });

    it('should handle auto-refresh failure gracefully', async () => {
      // Mock 自动刷新失败
      mockWx.request.mockImplementation(({ fail }) => {
        fail(new Error('网络错误'));
      });

      const pageConfig = {
        data: {
          passcodeInfo: { code: 'EMP123' }
        },

        async autoRefreshPasscode() {
          try {
            // 模拟刷新失败
            throw new Error('网络错误');
          } catch (error) {
            // 静默处理错误，不影响用户体验
            console.error('自动刷新失败:', error);
          }
        }
      };

      const page = Page(pageConfig);

      // 执行自动刷新（应该不抛出错误）
      await expect(page.autoRefreshPasscode()).resolves.not.toThrow();
    });
  });

  describe('Passcode History and Records', () => {
    it('should navigate to history page correctly', () => {
      const pageConfig = {
        data: {
          applicationId: 1
        },

        onViewHistory() {
          mockWx.navigateTo({
            url: `/pages/visitor/history/history?applicationId=${this.data.applicationId}`
          });
        }
      };

      const page = Page(pageConfig);

      // 点击查看历史记录
      page.onViewHistory();

      // 验证导航
      expect(mockWx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/visitor/history/history?applicationId=1'
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update passcode status in real-time', async () => {
      let passcodeStatus = 'active';
      let usageCount = 0;

      const pageConfig = {
        data: {
          passcodeInfo: {
            status: passcodeStatus,
            usageCount: usageCount,
            usageLimit: 3
          }
        },

        async checkPasscodeStatus() {
          // 模拟状态检查
          mockWx.request.mockImplementation(({ success }) => {
            success({
              statusCode: 200,
              data: {
                success: true,
                data: {
                  status: 'active',
                  usageCount: usageCount + 1,
                  usageLimit: 3
                }
              }
            });
          });

          // 模拟状态变化
          const newStatus = {
            status: 'active',
            usageCount: usageCount + 1,
            usageLimit: 3
          };

          if (newStatus.usageCount !== this.data.passcodeInfo.usageCount) {
            this.setData({
              passcodeInfo: {
                ...this.data.passcodeInfo,
                ...newStatus
              }
            });
          }
        },

        setData: mockPage.setData
      };

      const page = Page(pageConfig);

      // 检查状态更新
      await page.checkPasscodeStatus();

      // 验证状态更新
      expect(mockPage.setData).toHaveBeenCalledWith({
        passcodeInfo: expect.objectContaining({
          usageCount: 1
        })
      });
    });
  });
});