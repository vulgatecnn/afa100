// 员工通行码页面逻辑
import EmployeeService from '../../../services/employee';
import { PasscodeInfo, UserInfo } from '../../../types/api';

interface EmployeeInfoWithText extends UserInfo {
  merchantName: string;
  createdAtText: string;
}

interface PageData {
  passcodeInfo: PasscodeInfo | null;
  employeeInfo: EmployeeInfoWithText | null;
  qrSize: number;
  expiryTimeText: string;
  remainingUsage: number;
  permissionsText: string;
  lastUpdateText: string;
  overlayText: string;
  statusText: Record<string, string>;
  pendingCount: number;
  refreshCountdown: number;
  refreshProgress: number;
  loading: boolean;
  refreshing: boolean;
  autoRefreshTimer: number | null;
  countdownTimer: number | null;
}

Page<PageData>({
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

  onLoad() {
    this.loadEmployeeData();
  },

  onShow() {
    // 开始自动刷新和倒计时
    this.startAutoRefresh();
    this.loadPendingCount();
  },

  onHide() {
    // 停止自动刷新和倒计时
    this.stopAutoRefresh();
  },

  onUnload() {
    this.stopAutoRefresh();
  },

  // 加载员工数据
  async loadEmployeeData() {
    try {
      this.setData({ loading: true });
      
      // 获取员工通行码
      const passcodeInfo = await EmployeeService.getEmployeePasscode();
      
      // 获取员工信息（从全局数据或API获取）
      const app = getApp<IAppOption>();
      const userInfo = app.globalData.userInfo;
      
      let processedEmployeeInfo = null;
      if (userInfo) {
        processedEmployeeInfo = {
          ...userInfo,
          merchantName: `商户${userInfo.merchantId}`, // 实际应该从商户信息获取
          createdAtText: this.formatDateTime(userInfo.createdAt)
        };
      }
      
      this.setData({
        passcodeInfo,
        employeeInfo: processedEmployeeInfo,
        expiryTimeText: this.formatDateTime(passcodeInfo.expiryTime),
        remainingUsage: passcodeInfo.usageLimit - passcodeInfo.usageCount,
        permissionsText: passcodeInfo.permissions.join(', ') || '基础通行权限',
        lastUpdateText: this.formatDateTime(passcodeInfo.updatedAt)
      });
      
      // 生成二维码
      this.generateQRCode(passcodeInfo.code);
      
      // 设置覆盖层文本
      this.updateOverlayText();
      
    } catch (error) {
      wx.showToast({
        title: error.message || '加载员工信息失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载待审批数量
  async loadPendingCount() {
    try {
      const pendingApplications = await EmployeeService.getPendingVisitorApplications();
      this.setData({
        pendingCount: pendingApplications.length
      });
    } catch (error) {
      // 静默处理错误
      console.error('加载待审批数量失败:', error);
    }
  },

  // 生成二维码
  generateQRCode(code: string) {
    const ctx = wx.createCanvasContext('qrCanvas', this);
    const size = this.data.qrSize;
    
    // 清空画布
    ctx.clearRect(0, 0, size, size);
    
    // 设置背景
    ctx.setFillStyle('#ffffff');
    ctx.fillRect(0, 0, size, size);
    
    // 这里应该使用二维码生成库，暂时用文本代替
    ctx.setFillStyle('#000000');
    ctx.setFontSize(16);
    ctx.setTextAlign('center');
    ctx.fillText(code, size / 2, size / 2);
    
    ctx.draw();
  },

  // 格式化日期时间
  formatDateTime(dateTimeStr: string): string {
    const date = new Date(dateTimeStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    
    return `${month}月${day}日 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  },

  // 更新覆盖层文本
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

  // 手动刷新通行码
  async onManualRefresh() {
    try {
      this.setData({ refreshing: true });
      
      const newPasscodeInfo = await EmployeeService.refreshEmployeePasscode();
      
      this.setData({
        passcodeInfo: newPasscodeInfo,
        expiryTimeText: this.formatDateTime(newPasscodeInfo.expiryTime),
        remainingUsage: newPasscodeInfo.usageLimit - newPasscodeInfo.usageCount,
        lastUpdateText: this.formatDateTime(newPasscodeInfo.updatedAt)
      });
      
      // 重新生成二维码
      this.generateQRCode(newPasscodeInfo.code);
      this.updateOverlayText();
      
      // 重置倒计时
      this.resetCountdown();
      
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
  },

  // 查看通行记录
  onViewHistory() {
    wx.navigateTo({
      url: '/pages/employee/history/history'
    });
  },

  // 查看访客审批
  onViewApproval() {
    wx.navigateTo({
      url: '/pages/employee/approve/approve'
    });
  },

  // 查看个人设置
  onViewSettings() {
    wx.navigateTo({
      url: '/pages/employee/settings/settings'
    });
  },

  // 开始自动刷新
  startAutoRefresh() {
    // 每30秒自动刷新通行码
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
    
    // 初始化倒计时
    this.resetCountdown();
  },

  // 停止自动刷新
  stopAutoRefresh() {
    if (this.data.autoRefreshTimer) {
      clearInterval(this.data.autoRefreshTimer);
      this.setData({ autoRefreshTimer: null });
    }
    
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
      this.setData({ countdownTimer: null });
    }
  },

  // 自动刷新通行码
  async autoRefreshPasscode() {
    try {
      const newPasscodeInfo = await EmployeeService.refreshEmployeePasscode();
      
      this.setData({
        passcodeInfo: newPasscodeInfo,
        expiryTimeText: this.formatDateTime(newPasscodeInfo.expiryTime),
        remainingUsage: newPasscodeInfo.usageLimit - newPasscodeInfo.usageCount,
        lastUpdateText: this.formatDateTime(newPasscodeInfo.updatedAt)
      });
      
      // 重新生成二维码
      this.generateQRCode(newPasscodeInfo.code);
      this.updateOverlayText();
      
      // 重置倒计时
      this.resetCountdown();
      
      // 重新加载待审批数量
      this.loadPendingCount();
      
    } catch (error) {
      // 静默处理错误，不影响用户体验
      console.error('自动刷新通行码失败:', error);
      
      // 如果刷新失败，仍然重置倒计时，避免界面卡住
      this.resetCountdown();
    }
  },

  // 重置倒计时
  resetCountdown() {
    this.setData({
      refreshCountdown: 30,
      refreshProgress: 100
    });
  },

  // 更新倒计时
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
  }
});