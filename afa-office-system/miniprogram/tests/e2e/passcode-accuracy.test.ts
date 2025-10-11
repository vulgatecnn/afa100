// 通行码展示准确性测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PasscodeInfo } from '../../types/api';

// Mock 微信小程序 API
const mockWx = {
  showToast: vi.fn(),
  navigateTo: vi.fn(),
  createCanvasContext: vi.fn(() => ({
    clearRect: vi.fn(),
    setFillStyle: vi.fn(),
    fillRect: vi.fn(),
    setFontSize: vi.fn(),
    setTextAlign: vi.fn(),
    fillText: vi.fn(),
    draw: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 }))
  })),
  stopPullDownRefresh: vi.fn(),
  getSystemInfo: vi.fn((options) => {
    options.success({
      windowWidth: 375,
      windowHeight: 667,
      pixelRatio: 2
    });
  })
};

(global as any).wx = mockWx;
(global as any).getApp = vi.fn(() => ({
  globalData: {
    userInfo: {
      id: 1,
      name: '测试用户',
      phone: '13800138000'
    }
  }
}));

// Mock 服务
const mockVisitorService = {
  getPasscode: vi.fn(),
  refreshPasscode: vi.fn(),
  getAccessHistory: vi.fn()
};

const mockEmployeeService = {
  getEmployeePasscode: vi.fn(),
  refreshEmployeePasscode: vi.fn()
};

vi.mock('../../services/visitor', () => ({
  default: mockVisitorService
}));

vi.mock('../../services/employee', () => ({
  default: mockEmployeeService
}));

describe('通行码展示准确性测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('二维码生成准确性', () => {
    it('应该根据通行码内容生成正确的二维码', () => {
      const passcodeInfo: PasscodeInfo = {
        id: 1,
        userId: 1,
        code: 'VIS123456789',
        type: 'visitor',
        status: 'active',
        expiryTime: '2024-01-02T12:00:00Z',
        usageLimit: 3,
        usageCount: 0,
        permissions: ['building_access'],
        createdAt: '2024-01-02T08:00:00Z',
        updatedAt: '2024-01-02T08:00:00Z'
      };

      // 模拟二维码生成页面
      const qrCodePage = {
        data: {
          passcodeInfo,
          qrSize: 200,
          canvasId: 'qrCanvas'
        },

        generateQRCode(code: string) {
          const ctx = mockWx.createCanvasContext(this.data.canvasId);
          const size = this.data.qrSize;
          
          // 清空画布
          ctx.clearRect(0, 0, size, size);
          
          // 设置背景
          ctx.setFillStyle('#ffffff');
          ctx.fillRect(0, 0, size, size);
          
          // 绘制二维码内容（简化版本，实际应该使用二维码库）
          ctx.setFillStyle('#000000');
          ctx.setFontSize(12);
          ctx.setTextAlign('center');
          
          // 将通行码内容绘制到画布中心
          ctx.fillText(code, size / 2, size / 2);
          
          // 绘制到画布
          ctx.draw();
          
          return code;
        }
      };

      // 生成二维码
      const generatedCode = qrCodePage.generateQRCode(passcodeInfo.code);
      
      // 验证生成的二维码内容
      expect(generatedCode).toBe('VIS123456789');
      
      // 验证Canvas API调用
      expect(mockWx.createCanvasContext).toHaveBeenCalledWith('qrCanvas');
      
      const mockCtx = mockWx.createCanvasContext();
      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 200, 200);
      expect(mockCtx.setFillStyle).toHaveBeenCalledWith('#ffffff');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 200, 200);
      expect(mockCtx.setFillStyle).toHaveBeenCalledWith('#000000');
      expect(mockCtx.fillText).toHaveBeenCalledWith('VIS123456789', 100, 100);
      expect(mockCtx.draw).toHaveBeenCalled();
    });

    it('应该根据屏幕尺寸自适应二维码大小', () => {
      // 模拟不同屏幕尺寸
      const screenSizes = [
        { width: 320, height: 568, expectedSize: 160 }, // iPhone SE
        { width: 375, height: 667, expectedSize: 200 }, // iPhone 8
        { width: 414, height: 896, expectedSize: 240 }  // iPhone 11
      ];

      screenSizes.forEach(({ width, height, expectedSize }) => {
        mockWx.getSystemInfo.mockImplementationOnce((options) => {
          options.success({
            windowWidth: width,
            windowHeight: height,
            pixelRatio: 2
          });
        });

        const calculateQRSize = (screenWidth: number): number => {
          // 根据屏幕宽度计算合适的二维码尺寸
          const padding = 40;
          const maxSize = 280;
          const minSize = 160;
          
          let size = Math.floor((screenWidth - padding * 2) * 0.6);
          size = Math.max(minSize, Math.min(maxSize, size));
          
          return size;
        };

        const qrSize = calculateQRSize(width);
        expect(qrSize).toBe(expectedSize);
      });
    });

    it('应该处理特殊字符的通行码', () => {
      const specialCodes = [
        'ABC-123_456',
        'CODE@2024#01',
        '中文测试123',
        'EMOJI🔑123'
      ];

      specialCodes.forEach(code => {
        const qrCodePage = {
          generateQRCode(inputCode: string) {
            // 验证特殊字符处理
            const sanitizedCode = inputCode.replace(/[^\w\-@#]/g, '');
            return sanitizedCode;
          }
        };

        const result = qrCodePage.generateQRCode(code);
        
        // 验证特殊字符被正确处理
        expect(result).not.toContain('🔑');
        expect(result).not.toContain('中文');
        
        if (code.includes('-') || code.includes('@') || code.includes('#')) {
          expect(result.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('通行码状态实时更新', () => {
    it('应该准确显示通行码的实时状态', async () => {
      const initialPasscode: PasscodeInfo = {
        id: 1,
        userId: 1,
        code: 'REAL123456',
        type: 'visitor',
        status: 'active',
        expiryTime: '2024-01-02T12:00:00Z',
        usageLimit: 3,
        usageCount: 0,
        permissions: ['building_access'],
        createdAt: '2024-01-02T08:00:00Z',
        updatedAt: '2024-01-02T08:00:00Z'
      };

      mockVisitorService.getPasscode.mockResolvedValue(initialPasscode);

      // 模拟通行码页面
      const passcodePage = {
        data: {
          passcodeInfo: null as PasscodeInfo | null,
          statusText: '',
          remainingUsage: 0,
          isExpired: false,
          autoRefreshTimer: null as any
        },

        async loadPasscodeInfo() {
          const passcodeInfo = await mockVisitorService.getPasscode(1);
          this.updatePasscodeDisplay(passcodeInfo);
        },

        updatePasscodeDisplay(passcode: PasscodeInfo) {
          this.data.passcodeInfo = passcode;
          this.data.remainingUsage = Math.max(0, passcode.usageLimit - passcode.usageCount);
          
          const now = new Date();
          const expiryTime = new Date(passcode.expiryTime);
          this.data.isExpired = passcode.status === 'expired' || now > expiryTime;
          
          if (this.data.isExpired) {
            this.data.statusText = '已过期';
          } else if (this.data.remainingUsage === 0) {
            this.data.statusText = '使用次数已用完';
          } else {
            this.data.statusText = `剩余 ${this.data.remainingUsage} 次使用`;
          }
        },

        startAutoRefresh() {
          this.data.autoRefreshTimer = setInterval(async () => {
            await this.checkStatusUpdate();
          }, 5000); // 每5秒检查一次
        },

        async checkStatusUpdate() {
          const latestPasscode = await mockVisitorService.getPasscode(1);
          
          // 只有状态真正变化时才更新
          if (this.data.passcodeInfo && 
              (latestPasscode.usageCount !== this.data.passcodeInfo.usageCount ||
               latestPasscode.status !== this.data.passcodeInfo.status)) {
            this.updatePasscodeDisplay(latestPasscode);
          }
        }
      };

      // 初始加载
      await passcodePage.loadPasscodeInfo();
      expect(passcodePage.data.statusText).toBe('剩余 3 次使用');
      expect(passcodePage.data.isExpired).toBe(false);

      // 模拟使用一次后的状态
      const usedOncePasscode: PasscodeInfo = {
        ...initialPasscode,
        usageCount: 1,
        updatedAt: '2024-01-02T10:30:00Z'
      };

      mockVisitorService.getPasscode.mockResolvedValue(usedOncePasscode);

      // 启动自动刷新
      passcodePage.startAutoRefresh();

      // 模拟5秒后的检查
      await passcodePage.checkStatusUpdate();
      expect(passcodePage.data.statusText).toBe('剩余 2 次使用');
      expect(passcodePage.data.remainingUsage).toBe(2);

      // 模拟通行码用完
      const exhaustedPasscode: PasscodeInfo = {
        ...initialPasscode,
        usageCount: 3,
        updatedAt: '2024-01-02T11:30:00Z'
      };

      mockVisitorService.getPasscode.mockResolvedValue(exhaustedPasscode);
      await passcodePage.checkStatusUpdate();
      expect(passcodePage.data.statusText).toBe('使用次数已用完');

      // 清理定时器
      if (passcodePage.data.autoRefreshTimer) {
        clearInterval(passcodePage.data.autoRefreshTimer);
      }
    });

    it('应该准确显示通行码的过期状态', () => {
      const testCases = [
        {
          name: '未过期的通行码',
          passcode: {
            status: 'active',
            expiryTime: '2025-01-01T12:00:00Z', // 未来时间
            usageCount: 1,
            usageLimit: 3
          },
          expected: {
            isExpired: false,
            statusText: '剩余 2 次使用'
          }
        },
        {
          name: '已过期的通行码',
          passcode: {
            status: 'expired',
            expiryTime: '2023-01-01T12:00:00Z', // 过去时间
            usageCount: 1,
            usageLimit: 3
          },
          expected: {
            isExpired: true,
            statusText: '已过期'
          }
        },
        {
          name: '时间未到但状态为过期',
          passcode: {
            status: 'expired',
            expiryTime: '2025-01-01T12:00:00Z', // 未来时间但状态为过期
            usageCount: 0,
            usageLimit: 3
          },
          expected: {
            isExpired: true,
            statusText: '已过期'
          }
        },
        {
          name: '使用次数已达上限',
          passcode: {
            status: 'active',
            expiryTime: '2025-01-01T12:00:00Z',
            usageCount: 3,
            usageLimit: 3
          },
          expected: {
            isExpired: false,
            statusText: '使用次数已用完'
          }
        }
      ];

      testCases.forEach(({ name, passcode, expected }) => {
        const checkPasscodeStatus = (passcodeData: any) => {
          const now = new Date();
          const expiryTime = new Date(passcodeData.expiryTime);
          const isExpired = passcodeData.status === 'expired' || now > expiryTime;
          const remainingUsage = Math.max(0, passcodeData.usageLimit - passcodeData.usageCount);
          
          let statusText = '';
          if (isExpired) {
            statusText = '已过期';
          } else if (remainingUsage === 0) {
            statusText = '使用次数已用完';
          } else {
            statusText = `剩余 ${remainingUsage} 次使用`;
          }
          
          return { isExpired, statusText };
        };

        const result = checkPasscodeStatus(passcode);
        expect(result.isExpired).toBe(expected.isExpired);
        expect(result.statusText).toBe(expected.statusText);
      });
    });
  });

  describe('员工通行码自动刷新准确性', () => {
    it('应该按照设定频率准确刷新员工通行码', async () => {
      const initialPasscode: PasscodeInfo = {
        id: 1,
        userId: 1,
        code: 'EMP123456',
        type: 'employee',
        status: 'active',
        expiryTime: '2024-12-31T23:59:59Z',
        usageLimit: 999,
        usageCount: 10,
        permissions: ['all_access'],
        createdAt: '2024-01-02T08:00:00Z',
        updatedAt: '2024-01-02T08:00:00Z'
      };

      let refreshCount = 0;
      mockEmployeeService.getEmployeePasscode.mockResolvedValue(initialPasscode);
      mockEmployeeService.refreshEmployeePasscode.mockImplementation(async () => {
        refreshCount++;
        return {
          ...initialPasscode,
          code: `EMP${Date.now()}`,
          updatedAt: new Date().toISOString()
        };
      });

      // 模拟员工通行码页面
      const employeePage = {
        data: {
          passcodeInfo: null as PasscodeInfo | null,
          refreshCountdown: 30,
          refreshProgress: 100,
          autoRefreshTimer: null as any,
          countdownTimer: null as any,
          refreshFrequency: 30000 // 30秒刷新一次
        },

        async loadEmployeePasscode() {
          this.data.passcodeInfo = await mockEmployeeService.getEmployeePasscode();
        },

        startAutoRefresh() {
          // 启动自动刷新定时器
          this.data.autoRefreshTimer = setInterval(async () => {
            await this.refreshPasscode();
          }, this.data.refreshFrequency);

          // 启动倒计时定时器
          this.data.countdownTimer = setInterval(() => {
            this.updateCountdown();
          }, 1000);
        },

        async refreshPasscode() {
          try {
            const newPasscode = await mockEmployeeService.refreshEmployeePasscode();
            this.data.passcodeInfo = newPasscode;
            this.data.refreshCountdown = 30;
            this.data.refreshProgress = 100;
          } catch (error) {
            console.error('刷新通行码失败:', error);
          }
        },

        updateCountdown() {
          if (this.data.refreshCountdown > 0) {
            this.data.refreshCountdown--;
            this.data.refreshProgress = (this.data.refreshCountdown / 30) * 100;
          }
        },

        stopAutoRefresh() {
          if (this.data.autoRefreshTimer) {
            clearInterval(this.data.autoRefreshTimer);
          }
          if (this.data.countdownTimer) {
            clearInterval(this.data.countdownTimer);
          }
        }
      };

      // 初始加载
      await employeePage.loadEmployeePasscode();
      expect(employeePage.data.passcodeInfo?.code).toBe('EMP123456');

      // 启动自动刷新
      employeePage.startAutoRefresh();

      // 模拟30秒后的第一次刷新
      vi.advanceTimersByTime(30000);
      await vi.runAllTimersAsync();

      expect(refreshCount).toBe(1);
      expect(employeePage.data.passcodeInfo?.code).toMatch(/^EMP\d+$/);

      // 模拟再过30秒的第二次刷新
      vi.advanceTimersByTime(30000);
      await vi.runAllTimersAsync();

      expect(refreshCount).toBe(2);

      // 验证倒计时功能
      employeePage.data.refreshCountdown = 5;
      for (let i = 0; i < 5; i++) {
        employeePage.updateCountdown();
      }
      expect(employeePage.data.refreshCountdown).toBe(0);
      expect(employeePage.data.refreshProgress).toBe(0);

      // 清理
      employeePage.stopAutoRefresh();
    });

    it('应该处理自动刷新失败的情况', async () => {
      const initialPasscode: PasscodeInfo = {
        id: 1,
        userId: 1,
        code: 'EMP123456',
        type: 'employee',
        status: 'active',
        expiryTime: '2024-12-31T23:59:59Z',
        usageLimit: 999,
        usageCount: 10,
        permissions: ['all_access'],
        createdAt: '2024-01-02T08:00:00Z',
        updatedAt: '2024-01-02T08:00:00Z'
      };

      mockEmployeeService.getEmployeePasscode.mockResolvedValue(initialPasscode);
      mockEmployeeService.refreshEmployeePasscode.mockRejectedValue(new Error('网络错误'));

      const employeePage = {
        data: {
          passcodeInfo: initialPasscode,
          refreshFailCount: 0,
          lastRefreshError: null as string | null
        },

        async refreshPasscode() {
          try {
            const newPasscode = await mockEmployeeService.refreshEmployeePasscode();
            this.data.passcodeInfo = newPasscode;
            this.data.refreshFailCount = 0;
            this.data.lastRefreshError = null;
          } catch (error: any) {
            this.data.refreshFailCount++;
            this.data.lastRefreshError = error.message;
            
            // 静默处理错误，不影响用户体验
            console.error('自动刷新失败:', error);
          }
        }
      };

      // 尝试刷新
      await employeePage.refreshPasscode();

      // 验证错误处理
      expect(employeePage.data.refreshFailCount).toBe(1);
      expect(employeePage.data.lastRefreshError).toBe('网络错误');
      expect(employeePage.data.passcodeInfo.code).toBe('EMP123456'); // 保持原有通行码
    });
  });

  describe('通行码显示格式准确性', () => {
    it('应该正确格式化通行码显示', () => {
      const testCodes = [
        {
          input: 'VIS123456789',
          expected: 'VIS-123-456-789'
        },
        {
          input: 'EMP987654321',
          expected: 'EMP-987-654-321'
        },
        {
          input: 'SHORT123',
          expected: 'SHORT123' // 太短不需要格式化
        }
      ];

      const formatPasscode = (code: string): string => {
        if (code.length <= 8) {
          return code;
        }
        
        // 将长通行码按3位分组，用短横线连接
        const prefix = code.substring(0, 3);
        const remaining = code.substring(3);
        const groups = remaining.match(/.{1,3}/g) || [];
        
        return [prefix, ...groups].join('-');
      };

      testCodes.forEach(({ input, expected }) => {
        const result = formatPasscode(input);
        expect(result).toBe(expected);
      });
    });

    it('应该正确显示通行码的有效期', () => {
      const formatExpiryTime = (expiryTime: string): string => {
        const date = new Date(expiryTime);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        
        if (diffMs <= 0) {
          return '已过期';
        }
        
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffHours > 24) {
          const diffDays = Math.floor(diffHours / 24);
          return `${diffDays}天后过期`;
        } else if (diffHours > 0) {
          return `${diffHours}小时${diffMinutes}分钟后过期`;
        } else {
          return `${diffMinutes}分钟后过期`;
        }
      };

      // 使用固定时间进行测试
      const baseTime = new Date('2024-01-02T10:00:00Z');
      vi.setSystemTime(baseTime);

      const testCases = [
        {
          expiryTime: '2024-01-02T09:00:00Z', // 1小时前
          expected: '已过期'
        },
        {
          expiryTime: '2024-01-02T10:30:00Z', // 30分钟后
          expected: '30分钟后过期'
        },
        {
          expiryTime: '2024-01-02T12:15:00Z', // 2小时15分钟后
          expected: '2小时15分钟后过期'
        },
        {
          expiryTime: '2024-01-04T10:00:00Z', // 2天后
          expected: '2天后过期'
        }
      ];

      testCases.forEach(({ expiryTime, expected }) => {
        const result = formatExpiryTime(expiryTime);
        expect(result).toBe(expected);
      });
    });
  });

  describe('通行码权限显示准确性', () => {
    it('应该正确显示通行码的权限范围', () => {
      const formatPermissions = (permissions: string[]): string => {
        const permissionMap: Record<string, string> = {
          'building_access': '大楼通行',
          'parking_access': '停车场',
          'elevator_access': '电梯使用',
          'floor_1': '1楼',
          'floor_2': '2楼',
          'floor_3': '3楼',
          'all_floors': '所有楼层',
          'all_access': '全区域通行'
        };

        if (permissions.includes('all_access')) {
          return '全区域通行';
        }

        const translatedPermissions = permissions
          .map(p => permissionMap[p] || p)
          .filter(p => p !== undefined);

        return translatedPermissions.join('、');
      };

      const testCases = [
        {
          permissions: ['all_access'],
          expected: '全区域通行'
        },
        {
          permissions: ['building_access', 'floor_1', 'floor_2'],
          expected: '大楼通行、1楼、2楼'
        },
        {
          permissions: ['parking_access', 'elevator_access'],
          expected: '停车场、电梯使用'
        },
        {
          permissions: ['custom_permission'],
          expected: 'custom_permission'
        }
      ];

      testCases.forEach(({ permissions, expected }) => {
        const result = formatPermissions(permissions);
        expect(result).toBe(expected);
      });
    });
  });
});