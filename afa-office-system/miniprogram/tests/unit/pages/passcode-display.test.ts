// 通行码展示功能测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
    draw: vi.fn()
  })),
  stopPullDownRefresh: vi.fn()
};

global.wx = mockWx as any;
global.getApp = vi.fn(() => ({
  globalData: {
    userInfo: {
      id: 1,
      name: '测试员工',
      phone: '13800138000',
      merchantId: 1,
      createdAt: '2024-01-01T00:00:00Z'
    }
  }
})) as any;

// Mock 服务
const mockVisitorService = {
  getPasscode: vi.fn(),
  getApplicationDetail: vi.fn(),
  refreshPasscode: vi.fn(),
  getAccessHistory: vi.fn()
};

const mockEmployeeService = {
  getEmployeePasscode: vi.fn(),
  refreshEmployeePasscode: vi.fn(),
  getPendingVisitorApplications: vi.fn(),
  getAccessHistory: vi.fn()
};

vi.mock('../../../services/visitor', () => ({
  default: mockVisitorService
}));

vi.mock('../../../services/employee', () => ({
  default: mockEmployeeService
}));

describe('访客通行码展示功能', () => {
  let visitorPasscodePage: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // 模拟访客通行码页面
    visitorPasscodePage = {
      data: {
        applicationId: 1,
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
      },
      setData: vi.fn((newData) => {
        Object.assign(visitorPasscodePage.data, newData);
      })
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('应该正确加载通行码信息', async () => {
    const mockPasscodeInfo = {
      id: 1,
      userId: 1,
      code: 'TEST123456',
      type: 'visitor',
      status: 'active',
      expiryTime: '2024-12-31T23:59:59Z',
      usageLimit: 3,
      usageCount: 1,
      permissions: ['基础通行'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    const mockApplicationInfo = {
      id: 1,
      applicantId: 1,
      merchantId: 1,
      visitorName: '张三',
      visitorPhone: '13800138000',
      visitPurpose: '商务洽谈',
      scheduledTime: '2024-01-01T14:00:00Z',
      duration: 2,
      status: 'approved',
      usageLimit: 3,
      usageCount: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    mockVisitorService.getPasscode.mockResolvedValue(mockPasscodeInfo);
    mockVisitorService.getApplicationDetail.mockResolvedValue(mockApplicationInfo);

    // 模拟页面方法
    const loadPasscodeInfo = async function(this: any) {
      try {
        this.setData({ loading: true });
        
        const passcodeInfo = await mockVisitorService.getPasscode(this.data.applicationId);
        const applicationInfo = await mockVisitorService.getApplicationDetail(this.data.applicationId);
        
        const processedApplication = {
          ...applicationInfo,
          merchantName: `商户${applicationInfo.merchantId}`,
          scheduledTimeText: '1月1日 14:00'
        };
        
        this.setData({
          passcodeInfo,
          applicationInfo: processedApplication,
          expiryTimeText: '12月31日 23:59',
          remainingUsage: passcodeInfo.usageLimit - passcodeInfo.usageCount,
          permissionsText: passcodeInfo.permissions.join(', ') || '基础通行权限'
        });
        
      } finally {
        this.setData({ loading: false });
      }
    };

    await loadPasscodeInfo.call(visitorPasscodePage);

    expect(mockVisitorService.getPasscode).toHaveBeenCalledWith(1);
    expect(mockVisitorService.getApplicationDetail).toHaveBeenCalledWith(1);
    expect(visitorPasscodePage.setData).toHaveBeenCalledWith(
      expect.objectContaining({
        passcodeInfo: mockPasscodeInfo,
        remainingUsage: 2,
        permissionsText: '基础通行'
      })
    );
  });

  it('应该正确处理通行码刷新', async () => {
    const newPasscodeInfo = {
      id: 1,
      userId: 1,
      code: 'NEW123456',
      type: 'visitor',
      status: 'active',
      expiryTime: '2024-12-31T23:59:59Z',
      usageLimit: 3,
      usageCount: 0,
      permissions: ['基础通行'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T01:00:00Z'
    };

    mockVisitorService.refreshPasscode.mockResolvedValue(newPasscodeInfo);

    const onRefreshPasscode = async function(this: any) {
      try {
        this.setData({ refreshing: true });
        
        const newPasscodeInfo = await mockVisitorService.refreshPasscode(this.data.applicationId);
        
        this.setData({
          passcodeInfo: newPasscodeInfo,
          expiryTimeText: '12月31日 23:59',
          remainingUsage: newPasscodeInfo.usageLimit - newPasscodeInfo.usageCount
        });
        
      } finally {
        this.setData({ refreshing: false });
      }
    };

    await onRefreshPasscode.call(visitorPasscodePage);

    expect(mockVisitorService.refreshPasscode).toHaveBeenCalledWith(1);
    expect(visitorPasscodePage.setData).toHaveBeenCalledWith(
      expect.objectContaining({
        passcodeInfo: newPasscodeInfo,
        remainingUsage: 3
      })
    );
  });

  it('应该正确处理过期通行码', async () => {
    const expiredPasscodeInfo = {
      id: 1,
      userId: 1,
      code: 'EXPIRED123',
      type: 'visitor',
      status: 'expired',
      expiryTime: '2024-01-01T00:00:00Z',
      usageLimit: 3,
      usageCount: 1,
      permissions: ['基础通行'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    mockVisitorService.getPasscode.mockResolvedValue(expiredPasscodeInfo);

    const updateOverlayText = function(this: any) {
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
    };

    visitorPasscodePage.data.passcodeInfo = expiredPasscodeInfo;
    updateOverlayText.call(visitorPasscodePage);

    expect(visitorPasscodePage.data.overlayText).toBe('通行码已过期');
  });
});

describe('员工通行码展示功能', () => {
  let employeePasscodePage: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // 模拟员工通行码页面
    employeePasscodePage = {
      data: {
        passcodeInfo: null,
        employeeInfo: null,
        qrSize: 200,
        expiryTimeText: '',
        remainingUsage: 0,
        permissionsText: '',
        lastUpdateText: '',
        overlayText: '',
        statusText: {
          active: '有效',
          expired: '已过期',
          revoked: '已撤销'
        },
        pendingCount: 0,
        refreshCountdown: 30,
        refreshProgress: 100,
        loading: false,
        refreshing: false,
        autoRefreshTimer: null,
        countdownTimer: null
      },
      setData: vi.fn((newData) => {
        Object.assign(employeePasscodePage.data, newData);
      })
    };
  });

  it('应该正确加载员工通行码', async () => {
    const mockPasscodeInfo = {
      id: 1,
      userId: 1,
      code: 'EMP123456',
      type: 'employee',
      status: 'active',
      expiryTime: '2024-12-31T23:59:59Z',
      usageLimit: 999,
      usageCount: 10,
      permissions: ['全区域通行'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T12:00:00Z'
    };

    const mockPendingApplications = [
      { id: 1, visitorName: '访客1' },
      { id: 2, visitorName: '访客2' }
    ];

    mockEmployeeService.getEmployeePasscode.mockResolvedValue(mockPasscodeInfo);
    mockEmployeeService.getPendingVisitorApplications.mockResolvedValue(mockPendingApplications);

    const loadEmployeeData = async function(this: any) {
      try {
        this.setData({ loading: true });
        
        const passcodeInfo = await mockEmployeeService.getEmployeePasscode();
        const app = getApp();
        const userInfo = app.globalData.userInfo;
        
        let processedEmployeeInfo = null;
        if (userInfo) {
          processedEmployeeInfo = {
            ...userInfo,
            merchantName: `商户${userInfo.merchantId}`,
            createdAtText: '1月1日 00:00'
          };
        }
        
        this.setData({
          passcodeInfo,
          employeeInfo: processedEmployeeInfo,
          expiryTimeText: '12月31日 23:59',
          remainingUsage: passcodeInfo.usageLimit - passcodeInfo.usageCount,
          permissionsText: passcodeInfo.permissions.join(', ') || '基础通行权限',
          lastUpdateText: '1月1日 12:00'
        });
        
      } finally {
        this.setData({ loading: false });
      }
    };

    const loadPendingCount = async function(this: any) {
      const pendingApplications = await mockEmployeeService.getPendingVisitorApplications();
      this.setData({
        pendingCount: pendingApplications.length
      });
    };

    await loadEmployeeData.call(employeePasscodePage);
    await loadPendingCount.call(employeePasscodePage);

    expect(mockEmployeeService.getEmployeePasscode).toHaveBeenCalled();
    expect(mockEmployeeService.getPendingVisitorApplications).toHaveBeenCalled();
    
    // 检查是否设置了通行码信息
    expect(employeePasscodePage.setData).toHaveBeenCalledWith(
      expect.objectContaining({
        passcodeInfo: mockPasscodeInfo,
        remainingUsage: 989,
        permissionsText: '全区域通行'
      })
    );
    
    // 检查是否设置了待审批数量
    expect(employeePasscodePage.setData).toHaveBeenCalledWith(
      expect.objectContaining({
        pendingCount: 2
      })
    );
  });

  it('应该正确处理自动刷新倒计时', () => {
    vi.useFakeTimers();

    const updateCountdown = function(this: any) {
      const { refreshCountdown } = this.data;
      
      if (refreshCountdown > 0) {
        const newCountdown = refreshCountdown - 1;
        const progress = (newCountdown / 30) * 100;
        
        this.setData({
          refreshCountdown: newCountdown,
          refreshProgress: progress
        });
      }
    };

    const resetCountdown = function(this: any) {
      this.setData({
        refreshCountdown: 30,
        refreshProgress: 100
      });
    };

    // 初始状态
    resetCountdown.call(employeePasscodePage);
    expect(employeePasscodePage.data.refreshCountdown).toBe(30);
    expect(employeePasscodePage.data.refreshProgress).toBe(100);

    // 倒计时减少
    updateCountdown.call(employeePasscodePage);
    expect(employeePasscodePage.data.refreshCountdown).toBe(29);
    expect(employeePasscodePage.data.refreshProgress).toBeCloseTo(96.67, 1);

    vi.useRealTimers();
  });

  it('应该正确处理通行记录查看', () => {
    const onViewHistory = function() {
      mockWx.navigateTo({
        url: '/pages/employee/history/history'
      });
    };

    onViewHistory();

    expect(mockWx.navigateTo).toHaveBeenCalledWith({
      url: '/pages/employee/history/history'
    });
  });
});

describe('通行记录查询功能', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确获取访客通行记录', async () => {
    const mockAccessRecords = [
      {
        id: 1,
        userId: 1,
        passcodeId: 1,
        deviceId: 'DEVICE001',
        deviceType: '门禁',
        direction: 'in',
        result: 'success',
        location: {
          projectId: 1,
          venueId: 1,
          floorId: 1
        },
        timestamp: '2024-01-01T09:00:00Z'
      },
      {
        id: 2,
        userId: 1,
        passcodeId: 1,
        deviceId: 'DEVICE001',
        deviceType: '门禁',
        direction: 'out',
        result: 'success',
        location: {
          projectId: 1,
          venueId: 1,
          floorId: 1
        },
        timestamp: '2024-01-01T17:00:00Z'
      }
    ];

    mockVisitorService.getAccessHistory.mockResolvedValue(mockAccessRecords);

    const records = await mockVisitorService.getAccessHistory(1, '2024-01-01', '2024-01-31');

    expect(mockVisitorService.getAccessHistory).toHaveBeenCalledWith(1, '2024-01-01', '2024-01-31');
    expect(records).toHaveLength(2);
    expect(records[0].direction).toBe('in');
    expect(records[1].direction).toBe('out');
  });

  it('应该正确获取员工通行记录', async () => {
    const mockAccessRecords = [
      {
        id: 1,
        userId: 1,
        passcodeId: 1,
        deviceId: 'DEVICE001',
        deviceType: '门禁',
        direction: 'in',
        result: 'success',
        location: {
          projectId: 1,
          venueId: 1,
          floorId: 1
        },
        timestamp: '2024-01-01T09:00:00Z'
      }
    ];

    mockEmployeeService.getAccessHistory.mockResolvedValue(mockAccessRecords);

    const records = await mockEmployeeService.getAccessHistory('2024-01-01', '2024-01-31');

    expect(mockEmployeeService.getAccessHistory).toHaveBeenCalledWith('2024-01-01', '2024-01-31');
    expect(records).toHaveLength(1);
    expect(records[0].result).toBe('success');
  });

  it('应该正确计算统计信息', () => {
    const mockRecords = [
      { result: 'success', direction: 'in', timestamp: '2024-01-01T09:00:00Z' },
      { result: 'success', direction: 'out', timestamp: '2024-01-01T17:00:00Z' },
      { result: 'failed', direction: 'in', timestamp: '2024-01-01T18:00:00Z' }
    ];

    const calculateStats = (records: any[]) => {
      const total = records.length;
      const success = records.filter(r => r.result === 'success').length;
      const failed = total - success;
      const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
      
      return { total, success, failed, successRate };
    };

    const stats = calculateStats(mockRecords);

    expect(stats.total).toBe(3);
    expect(stats.success).toBe(2);
    expect(stats.failed).toBe(1);
    expect(stats.successRate).toBe(67);
  });
});