// 访客通行码页面逻辑
import VisitorService from '../../../services/visitor';
import { PasscodeInfo, VisitorApplication } from '../../../types/api';

interface ApplicationWithText extends VisitorApplication {
  merchantName: string;
  scheduledTimeText: string;
}

interface PageData {
  applicationId: number;
  passcodeInfo: PasscodeInfo | null;
  applicationInfo: ApplicationWithText | null;
  qrSize: number;
  expiryTimeText: string;
  remainingUsage: number;
  permissionsText: string;
  overlayText: string;
  statusText: Record<string, string>;
  loading: boolean;
  refreshing: boolean;
  autoRefreshTimer: number | null;
}

Page<PageData>({
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
  },

  onLoad(options: any) {
    const applicationId = parseInt(options.applicationId);
    this.setData({ applicationId });
    this.loadPasscodeInfo();
  },

  onShow() {
    // 开始自动刷新
    this.startAutoRefresh();
  },

  onHide() {
    // 停止自动刷新
    this.stopAutoRefresh();
  },

  onUnload() {
    this.stopAutoRefresh();
  },

  // 加载通行码信息
  async loadPasscodeInfo() {
    try {
      this.setData({ loading: true });
      
      // 获取通行码信息
      const passcodeInfo = await VisitorService.getPasscode(this.data.applicationId);
      
      // 获取申请详情
      const applicationInfo = await VisitorService.getApplicationDetail(this.data.applicationId);
      
      // 处理显示数据
      const processedApplication = {
        ...applicationInfo,
        merchantName: `商户${applicationInfo.merchantId}`, // 实际应该从商户信息获取
        scheduledTimeText: this.formatDateTime(applicationInfo.scheduledTime)
      };
      
      this.setData({
        passcodeInfo,
        applicationInfo: processedApplication,
        expiryTimeText: this.formatDateTime(passcodeInfo.expiryTime),
        remainingUsage: passcodeInfo.usageLimit - passcodeInfo.usageCount,
        permissionsText: passcodeInfo.permissions.join(', ') || '基础通行权限'
      });
      
      // 生成二维码
      this.generateQRCode(passcodeInfo.code);
      
      // 设置覆盖层文本
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

  // 刷新通行码
  async onRefreshPasscode() {
    try {
      this.setData({ refreshing: true });
      
      const newPasscodeInfo = await VisitorService.refreshPasscode(this.data.applicationId);
      
      this.setData({
        passcodeInfo: newPasscodeInfo,
        expiryTimeText: this.formatDateTime(newPasscodeInfo.expiryTime),
        remainingUsage: newPasscodeInfo.usageLimit - newPasscodeInfo.usageCount
      });
      
      // 重新生成二维码
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
  },

  // 查看通行记录
  onViewHistory() {
    wx.navigateTo({
      url: `/pages/visitor/history/history?applicationId=${this.data.applicationId}`
    });
  },

  // 开始自动刷新
  startAutoRefresh() {
    // 每30秒检查一次通行码状态
    const timer = setInterval(() => {
      this.checkPasscodeStatus();
    }, 30000);
    
    this.setData({ autoRefreshTimer: timer });
    
    // 立即检查一次状态
    this.checkPasscodeStatus();
  },

  // 停止自动刷新
  stopAutoRefresh() {
    if (this.data.autoRefreshTimer) {
      clearInterval(this.data.autoRefreshTimer);
      this.setData({ autoRefreshTimer: null });
    }
  },

  // 检查通行码状态
  async checkPasscodeStatus() {
    try {
      const passcodeInfo = await VisitorService.getPasscode(this.data.applicationId);
      
      // 如果状态发生变化，更新界面
      if (passcodeInfo.status !== this.data.passcodeInfo?.status ||
          passcodeInfo.usageCount !== this.data.passcodeInfo?.usageCount ||
          passcodeInfo.code !== this.data.passcodeInfo?.code) {
        
        this.setData({
          passcodeInfo,
          expiryTimeText: this.formatDateTime(passcodeInfo.expiryTime),
          remainingUsage: passcodeInfo.usageLimit - passcodeInfo.usageCount
        });
        
        // 如果通行码内容发生变化，重新生成二维码
        if (passcodeInfo.code !== this.data.passcodeInfo?.code) {
          this.generateQRCode(passcodeInfo.code);
        }
        
        this.updateOverlayText();
        
        // 如果状态变为过期或撤销，显示提示
        if (passcodeInfo.status === 'expired' || passcodeInfo.status === 'revoked') {
          wx.showToast({
            title: passcodeInfo.status === 'expired' ? '通行码已过期' : '通行码已撤销',
            icon: 'none',
            duration: 2000
          });
        }
      }
      
    } catch (error) {
      // 静默处理错误，不影响用户体验
      console.error('检查通行码状态失败:', error);
    }
  }
});