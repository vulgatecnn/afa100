// 访客申请状态页面逻辑
import VisitorService from '../../../services/visitor';
import { VisitorApplication } from '../../../types/api';

interface ApplicationWithText extends VisitorApplication {
  merchantName: string;
  scheduledTimeText: string;
  createdAtText: string;
}

interface PageData {
  applications: ApplicationWithText[];
  currentTab: number;
  tabs: Array<{ label: string; value: string }>;
  statusText: Record<string, string>;
  loading: boolean;
}

Page<PageData>({
  data: {
    applications: [],
    currentTab: 0,
    tabs: [
      { label: '全部', value: '' },
      { label: '待审批', value: 'pending' },
      { label: '已通过', value: 'approved' },
      { label: '已拒绝', value: 'rejected' }
    ],
    statusText: {
      pending: '待审批',
      approved: '已通过',
      rejected: '已拒绝',
      expired: '已过期'
    },
    loading: false
  },

  onLoad(options: any) {
    // 如果有传入特定申请ID，则高亮显示
    if (options.id) {
      this.highlightApplication = parseInt(options.id);
    }
    this.loadApplications();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadApplications();
  },

  onPullDownRefresh() {
    this.loadApplications().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载申请列表
  async loadApplications() {
    try {
      this.setData({ loading: true });
      
      const currentTab = this.data.tabs[this.data.currentTab];
      const applications = await VisitorService.getMyApplications(currentTab.value);
      
      // 处理显示文本
      const processedApplications = applications.map(app => ({
        ...app,
        merchantName: app.merchantId ? `商户${app.merchantId}` : '未知商户', // 实际应该从商户信息获取
        scheduledTimeText: this.formatDateTime(app.scheduledTime),
        createdAtText: this.formatDateTime(app.createdAt)
      }));
      
      this.setData({
        applications: processedApplications
      });
      
    } catch (error) {
      wx.showToast({
        title: error.message || '加载申请列表失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
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

  // 标签切换
  onTabChange(e: any) {
    const index = e.currentTarget.dataset.index;
    this.setData({ currentTab: index });
    this.loadApplications();
  },

  // 点击申请项
  onApplicationTap(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/visitor/detail/detail?id=${id}`
    });
  },

  // 查看通行码
  onViewPasscode(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/visitor/passcode/passcode?applicationId=${id}`
    });
  },

  // 新建申请
  onNewApplication() {
    wx.navigateTo({
      url: '/pages/visitor/apply/apply'
    });
  }
});