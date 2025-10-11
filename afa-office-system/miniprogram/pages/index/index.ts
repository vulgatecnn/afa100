// 首页逻辑
import EmployeeService from '../../services/employee';
import { UserInfo } from '../../types/api';

interface PageData {
  userInfo: UserInfo | null;
  userTypeText: Record<string, string>;
  statusText: Record<string, string>;
  pendingCount: number;
}

Page<PageData>({
  data: {
    userInfo: null,
    userTypeText: {
      tenant_admin: '租务管理员',
      merchant_admin: '商户管理员',
      employee: '员工',
      visitor: '访客'
    },
    statusText: {
      active: '正常',
      inactive: '停用',
      pending: '待审批'
    },
    pendingCount: 0
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
    this.loadPendingCount();
  },

  // 加载用户信息
  loadUserInfo() {
    const app = getApp<IAppOption>();
    if (app.globalData.isLoggedIn && app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo
      });
    }
  },

  // 加载待审批数量（仅员工）
  async loadPendingCount() {
    const { userInfo } = this.data;
    if (userInfo && userInfo.userType === 'employee') {
      try {
        const pendingApplications = await EmployeeService.getPendingVisitorApplications();
        this.setData({
          pendingCount: pendingApplications.length
        });
      } catch (error) {
        // 静默处理错误
        console.error('加载待审批数量失败:', error);
      }
    }
  },

  // 微信登录
  onLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  // 选择访客身份
  onSelectVisitor() {
    const app = getApp<IAppOption>();
    app.globalData.userType = 'visitor';
    wx.navigateTo({
      url: '/pages/visitor/apply/apply'
    });
  },

  // 选择员工身份
  onSelectEmployee() {
    const app = getApp<IAppOption>();
    app.globalData.userType = 'employee';
    wx.navigateTo({
      url: '/pages/employee/apply/apply'
    });
  },

  // 访客预约
  onVisitorApply() {
    wx.navigateTo({
      url: '/pages/visitor/apply/apply'
    });
  },

  // 访客申请状态
  onVisitorStatus() {
    wx.navigateTo({
      url: '/pages/visitor/status/status'
    });
  },

  // 员工通行码
  onEmployeePasscode() {
    wx.navigateTo({
      url: '/pages/employee/passcode/passcode'
    });
  },

  // 访客审批
  onVisitorApprove() {
    wx.navigateTo({
      url: '/pages/employee/approve/approve'
    });
  },

  // 查看通行记录
  onViewHistory() {
    const { userInfo } = this.data;
    if (userInfo?.userType === 'employee') {
      wx.navigateTo({
        url: '/pages/employee/history/history'
      });
    } else {
      wx.navigateTo({
        url: '/pages/visitor/history/history'
      });
    }
  },

  // 联系客服
  onContactSupport() {
    wx.showModal({
      title: '联系客服',
      content: '如需帮助，请联系客服电话：400-123-4567',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 查看帮助
  onViewHelp() {
    wx.showModal({
      title: '使用帮助',
      content: '1. 访客需要预约申请并等待审批\n2. 员工需要申请加入商户\n3. 通行码需要在有效期内使用\n4. 如遇问题请联系客服',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});