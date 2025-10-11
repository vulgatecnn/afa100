// 员工审批访客申请页面逻辑
import EmployeeService from '../../../services/employee';

interface ApplicationWithText {
  id: number;
  visitorName: string;
  visitorPhone: string;
  visitorCompany?: string;
  visitPurpose: string;
  visitType: string;
  duration: number;
  status: 'pending' | 'approved' | 'rejected';
  scheduledTimeText: string;
  createdAtText: string;
  approvedAtText?: string;
  approverName?: string;
}

interface PageData {
  applications: ApplicationWithText[];
  currentTab: number;
  tabs: Array<{ label: string; value: string }>;
  statusText: Record<string, string>;
  emptyText: string;
  showApprovalModal: boolean;
  approvalType: 'approve' | 'reject';
  currentApplicationId: number;
  rejectReason: string;
  loading: boolean;
  approving: boolean;
}

Page<PageData>({
  data: {
    applications: [],
    currentTab: 0,
    tabs: [
      { label: '待审批', value: 'pending' },
      { label: '已通过', value: 'approved' },
      { label: '已拒绝', value: 'rejected' },
      { label: '全部', value: '' }
    ],
    statusText: {
      pending: '待审批',
      approved: '已通过',
      rejected: '已拒绝'
    },
    emptyText: '暂无待审批申请',
    showApprovalModal: false,
    approvalType: 'approve',
    currentApplicationId: 0,
    rejectReason: '',
    loading: false,
    approving: false
  },

  onLoad() {
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
      let applications: any[] = [];
      
      if (currentTab.value === 'pending') {
        applications = await EmployeeService.getPendingVisitorApplications();
      } else {
        // 这里应该调用获取所有申请的接口，根据状态筛选
        applications = await EmployeeService.getPendingVisitorApplications();
        if (currentTab.value) {
          applications = applications.filter(app => app.status === currentTab.value);
        }
      }
      
      // 处理显示文本
      const processedApplications = applications.map(app => ({
        ...app,
        scheduledTimeText: this.formatDateTime(app.scheduledTime),
        createdAtText: this.formatDateTime(app.createdAt),
        approvedAtText: app.approvedAt ? this.formatDateTime(app.approvedAt) : undefined,
        approverName: app.approvedBy ? `员工${app.approvedBy}` : undefined // 实际应该从用户信息获取
      }));
      
      const emptyText = currentTab.value === 'pending' ? '暂无待审批申请' : 
                       currentTab.value === 'approved' ? '暂无已通过申请' :
                       currentTab.value === 'rejected' ? '暂无已拒绝申请' : '暂无申请记录';
      
      this.setData({
        applications: processedApplications,
        emptyText
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

  // 通过申请
  onApproveApplication(e: any) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      showApprovalModal: true,
      approvalType: 'approve',
      currentApplicationId: id,
      rejectReason: ''
    });
  },

  // 拒绝申请
  onRejectApplication(e: any) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      showApprovalModal: true,
      approvalType: 'reject',
      currentApplicationId: id,
      rejectReason: ''
    });
  },

  // 拒绝原因输入
  onRejectReasonChange(e: any) {
    this.setData({
      rejectReason: e.detail.value
    });
  },

  // 关闭审批弹窗
  onCloseModal() {
    this.setData({
      showApprovalModal: false,
      currentApplicationId: 0,
      rejectReason: ''
    });
  },

  // 确认审批
  async onConfirmApproval() {
    const { approvalType, currentApplicationId, rejectReason } = this.data;
    
    if (approvalType === 'reject' && !rejectReason.trim()) {
      wx.showToast({
        title: '请输入拒绝原因',
        icon: 'error'
      });
      return;
    }
    
    try {
      this.setData({ approving: true });
      
      const approved = approvalType === 'approve';
      await EmployeeService.approveVisitorApplication(
        currentApplicationId, 
        approved, 
        approved ? undefined : rejectReason
      );
      
      wx.showToast({
        title: approved ? '申请已通过' : '申请已拒绝',
        icon: 'success'
      });
      
      // 关闭弹窗并刷新列表
      this.onCloseModal();
      setTimeout(() => {
        this.loadApplications();
      }, 1500);
      
    } catch (error) {
      wx.showToast({
        title: error.message || '审批操作失败',
        icon: 'error'
      });
    } finally {
      this.setData({ approving: false });
    }
  }
});