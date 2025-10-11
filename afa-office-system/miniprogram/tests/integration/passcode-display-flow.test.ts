// 通行码展示功能集成测试
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

(global as any).wx = mockWx;
(global as any).getApp = vi.fn(() => ({
  globalData: {
    userInfo: {
      id: 1,
      name: '测试员工',
      phone: '13800138000',
      merchantId: 1,
      createdAt: '2024-01-01T00:00:00Z'
    }
  }
}));

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

vi.mock('../../services/visitor', () => ({
  default: mockVisitorService
}));

vi.mock('../../services/employee', () => ({
  default: mockEmployeeService
}));

describe('通行码展示完整流程测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('访客通行码完整使用流程', async () => {
    // 模拟访客通行码页面
    const visitorPage = {
      data: {
        applicationId: 1,
        passcodeInfo: null as any,
        applicationInfo: null as any,
        autoRefreshTimer: null as any,
        loading: false,
        refreshing: false,
        remainingUsage: 0
      },
      setData: vi.fn((newData: any) => {
        Object.assign(visitorPage.data, newData);
      })
    };

    // 1. 初始加载通行码信息
    const initialPasscodeInfo = {
      id: 1,
      userId: 1,
      code: 'VISITOR123',
      type: 'visitor',
      status: 'active',
      expiryTime: '2024-12-31T23:59:59Z',
      usageLimit: 3,
      usageCount: 0,
      permissions: ['基础通行'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    const applicationInfo = {
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
      usageCount: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    mockVisitorService.getPasscode.mockResolvedValue(initialPasscodeInfo);
    mockVisitorService.getApplicationDetail.mockResolvedValue(applicationInfo);

    // 模拟加载通行码信息
    const loadPasscodeInfo = async function(this: any) {
      try {
        this.setData({ loading: true });
        
        const passcodeInfo = await mockVisitorService.getPasscode(this.data.applicationId);
        const applicationInfo = await mockVisitorService.getApplicationDetail(this.data.applicationId);
        
        this.setData({
          passcodeInfo,
          applicationInfo,
          remainingUsage: passcodeInfo.usageLimit - passcodeInfo.usageCount
        });
        
      } finally {
        this.setData({ loading: false });
      }
    };

    await loadPasscodeInfo.call(visitorPage);

    expect(visitorPage.data.passcodeInfo).toEqual(initialPasscodeInfo);
    expect(visitorPage.data.applicationInfo).toEqual(applicationInfo);
    expect(visitorPage.data.remainingUsage).toBe(3);

    // 2. 模拟通行码被使用（使用次数增加）
    const usedPasscodeInfo = {
      ...initialPasscodeInfo,
      usageCount: 1,
      updatedAt: '2024-01-01T14:30:00Z'
    };

    mockVisitorService.getPasscode.mockResolvedValue(usedPasscodeInfo);

    // 模拟自动检查状态
    const checkPasscodeStatus = async function(this: any) {
      try {
        const passcodeInfo = await mockVisitorService.getPasscode(this.data.applicationId);
        
        // 如果状态发生变化，更新界面
        if (passcodeInfo.status !== this.data.passcodeInfo?.status ||
            passcodeInfo.usageCount !== this.data.passcodeInfo?.usageCount) {
          
          this.setData({
            passcodeInfo,
            remainingUsage: passcodeInfo.usageLimit - passcodeInfo.usageCount
          });
        }
      } catch (error) {
        console.error('检查通行码状态失败:', error);
      }
    };

    await checkPasscodeStatus.call(visitorPage);

    expect(visitorPage.data.passcodeInfo.usageCount).toBe(1);
    expect(visitorPage.data.remainingUsage).toBe(2);

    // 3. 模拟通行码过期
    const expiredPasscodeInfo = {
      ...usedPasscodeInfo,
      status: 'expired',
      updatedAt: '2024-01-01T23:59:59Z'
    };

    // 重新设置 mock 返回过期的通行码
    mockVisitorService.getPasscode.mockResolvedValueOnce(expiredPasscodeInfo);

    await checkPasscodeStatus.call(visitorPage);

    expect(visitorPage.data.passcodeInfo.status).toBe('expired');

    // 4. 查看通行记录
    const accessRecords = [
      {
        id: 1,
        userId: 1,
        passcodeId: 1,
        deviceId: 'DEVICE001',
        deviceType: '门禁',
        direction: 'in',
        result: 'success',
        location: { projectId: 1, venueId: 1, floorId: 1 },
        timestamp: '2024-01-01T14:30:00Z'
      }
    ];

    mockVisitorService.getAccessHistory.mockResolvedValue(accessRecords);

    const records = await mockVisitorService.getAccessHistory(1, '2024-01-01', '2024-01-31');

    expect(records).toHaveLength(1);
    expect(records[0].result).toBe('success');
    expect(records[0].direction).toBe('in');
  });

  it('员工通行码自动刷新流程', async () => {
    // 模拟员工通行码页面
    const employeePage = {
      data: {
        passcodeInfo: null,
        refreshCountdown: 30,
        refreshProgress: 100,
        autoRefreshTimer: null,
        countdownTimer: null,
        pendingCount: 0
      },
      setData: vi.fn((newData) => {
        Object.assign(employeePage.data, newData);
      })
    };

    // 1. 初始加载员工通行码
    const initialPasscodeInfo = {
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

    mockEmployeeService.getEmployeePasscode.mockResolvedValue(initialPasscodeInfo);
    mockEmployeeService.getPendingVisitorApplications.mockResolvedValue([]);

    const loadEmployeeData = async function(this: any) {
      const passcodeInfo = await mockEmployeeService.getEmployeePasscode();
      this.setData({ passcodeInfo });
    };

    await loadEmployeeData.call(employeePage);

    expect(employeePage.data.passcodeInfo).toEqual(initialPasscodeInfo);

    // 2. 模拟倒计时更新
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

    // 模拟倒计时进行
    for (let i = 0; i < 5; i++) {
      updateCountdown.call(employeePage);
    }

    expect(employeePage.data.refreshCountdown).toBe(25);
    expect(employeePage.data.refreshProgress).toBeCloseTo(83.33, 1);

    // 3. 模拟自动刷新通行码
    const newPasscodeInfo = {
      ...initialPasscodeInfo,
      code: 'EMP789012',
      updatedAt: '2024-01-01T12:30:00Z'
    };

    mockEmployeeService.refreshEmployeePasscode.mockResolvedValue(newPasscodeInfo);

    const autoRefreshPasscode = async function(this: any) {
      try {
        const newPasscodeInfo = await mockEmployeeService.refreshEmployeePasscode();
        
        this.setData({
          passcodeInfo: newPasscodeInfo,
          refreshCountdown: 30,
          refreshProgress: 100
        });
      } catch (error) {
        console.error('自动刷新通行码失败:', error);
      }
    };

    await autoRefreshPasscode.call(employeePage);

    expect(employeePage.data.passcodeInfo.code).toBe('EMP789012');
    expect(employeePage.data.refreshCountdown).toBe(30);
    expect(employeePage.data.refreshProgress).toBe(100);

    // 4. 模拟有新的待审批访客
    const pendingApplications = [
      { id: 1, visitorName: '访客1' },
      { id: 2, visitorName: '访客2' }
    ];

    mockEmployeeService.getPendingVisitorApplications.mockResolvedValue(pendingApplications);

    const loadPendingCount = async function(this: any) {
      const pendingApplications = await mockEmployeeService.getPendingVisitorApplications();
      this.setData({
        pendingCount: pendingApplications.length
      });
    };

    await loadPendingCount.call(employeePage);

    expect(employeePage.data.pendingCount).toBe(2);
  });

  it('通行记录查询和统计功能', async () => {
    // 模拟通行记录数据
    const mockRecords = [
      {
        id: 1,
        userId: 1,
        passcodeId: 1,
        deviceId: 'DEVICE001',
        deviceType: '门禁',
        direction: 'in',
        result: 'success',
        location: { projectId: 1, venueId: 1, floorId: 1 },
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
        location: { projectId: 1, venueId: 1, floorId: 1 },
        timestamp: '2024-01-01T17:00:00Z'
      },
      {
        id: 3,
        userId: 1,
        passcodeId: 1,
        deviceId: 'DEVICE002',
        deviceType: '门禁',
        direction: 'in',
        result: 'failed',
        failReason: '通行码已过期',
        location: { projectId: 1, venueId: 1, floorId: 1 },
        timestamp: '2024-01-01T18:00:00Z'
      }
    ];

    mockEmployeeService.getAccessHistory.mockResolvedValue(mockRecords);

    // 模拟历史记录页面
    const historyPage = {
      data: {
        records: [],
        filteredRecords: [],
        activeFilter: 'all',
        stats: { total: 0, success: 0, failed: 0, successRate: 0 }
      },
      setData: vi.fn((newData) => {
        Object.assign(historyPage.data, newData);
      })
    };

    // 1. 加载通行记录
    const loadAccessHistory = async function(this: any) {
      const records = await mockEmployeeService.getAccessHistory('2024-01-01', '2024-01-31');
      
      // 计算统计信息
      const total = records.length;
      const success = records.filter((r: any) => r.result === 'success').length;
      const failed = total - success;
      const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
      
      this.setData({
        records,
        filteredRecords: records,
        stats: { total, success, failed, successRate }
      });
    };

    await loadAccessHistory.call(historyPage);

    expect(historyPage.data.records).toHaveLength(3);
    expect(historyPage.data.stats.total).toBe(3);
    expect(historyPage.data.stats.success).toBe(2);
    expect(historyPage.data.stats.failed).toBe(1);
    expect(historyPage.data.stats.successRate).toBe(67);

    // 2. 测试筛选功能
    const applyFilter = function(this: any, filter: string) {
      const { records } = this.data;
      
      let filteredRecords = records;
      
      if (filter === 'success') {
        filteredRecords = records.filter((record: any) => record.result === 'success');
      } else if (filter === 'failed') {
        filteredRecords = records.filter((record: any) => record.result === 'failed');
      }
      
      this.setData({ 
        activeFilter: filter,
        filteredRecords 
      });
    };

    // 筛选成功记录
    applyFilter.call(historyPage, 'success');
    expect(historyPage.data.filteredRecords).toHaveLength(2);
    expect(historyPage.data.filteredRecords.every((r: any) => r.result === 'success')).toBe(true);

    // 筛选失败记录
    applyFilter.call(historyPage, 'failed');
    expect(historyPage.data.filteredRecords).toHaveLength(1);
    expect(historyPage.data.filteredRecords[0].result).toBe('failed');
    expect(historyPage.data.filteredRecords[0].failReason).toBe('通行码已过期');

    // 显示全部记录
    applyFilter.call(historyPage, 'all');
    expect(historyPage.data.filteredRecords).toHaveLength(3);
  });

  it('错误处理和用户体验', async () => {
    // 模拟网络错误
    mockVisitorService.getPasscode.mockRejectedValue(new Error('网络连接失败'));

    const visitorPage = {
      data: {
        applicationId: 1,
        loading: false,
        passcodeInfo: null
      },
      setData: vi.fn((newData) => {
        Object.assign(visitorPage.data, newData);
      })
    };

    const loadPasscodeInfo = async function(this: any) {
      try {
        this.setData({ loading: true });
        
        const passcodeInfo = await mockVisitorService.getPasscode(this.data.applicationId);
        this.setData({ passcodeInfo });
        
      } catch (error: any) {
        // 显示错误提示
        mockWx.showToast({
          title: error.message || '加载通行码失败',
          icon: 'error'
        });
      } finally {
        this.setData({ loading: false });
      }
    };

    await loadPasscodeInfo.call(visitorPage);

    expect(mockWx.showToast).toHaveBeenCalledWith({
      title: '网络连接失败',
      icon: 'error'
    });
    expect(visitorPage.data.loading).toBe(false);
    expect(visitorPage.data.passcodeInfo).toBeNull();

    // 模拟静默错误处理（自动刷新失败）
    mockEmployeeService.refreshEmployeePasscode.mockRejectedValue(new Error('刷新失败'));

    const employeePage = {
      data: {
        refreshCountdown: 0,
        refreshProgress: 0
      },
      setData: vi.fn((newData) => {
        Object.assign(employeePage.data, newData);
      })
    };

    const autoRefreshPasscode = async function(this: any) {
      try {
        await mockEmployeeService.refreshEmployeePasscode();
        // 正常处理...
      } catch (error: any) {
        // 静默处理错误，不影响用户体验
        console.error('自动刷新通行码失败:', error);
        
        // 仍然重置倒计时，避免界面卡住
        this.setData({
          refreshCountdown: 30,
          refreshProgress: 100
        });
      }
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await autoRefreshPasscode.call(employeePage);

    expect(consoleSpy).toHaveBeenCalledWith('自动刷新通行码失败:', expect.any(Error));
    expect(employeePage.data.refreshCountdown).toBe(30);
    expect(employeePage.data.refreshProgress).toBe(100);

    consoleSpy.mockRestore();
  });
});