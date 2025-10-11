// 访客申请页面逻辑
import VisitorService, { VisitorApplyData } from '../../../services/visitor';
import { MerchantInfo } from '../../../types/api';

interface PageData {
  formData: VisitorApplyData;
  merchants: MerchantInfo[];
  merchantNames: string[];
  merchantIndex: number;
  selectedMerchant: MerchantInfo | null;
  visitTypes: string[];
  visitTypeIndex: number;
  durations: number[];
  durationIndex: number;
  dateTimeRange: string[][];
  dateTimeIndex: number[];
  scheduledTimeText: string;
  loading: boolean;
  submitting: boolean;
}

Page<PageData>({
  data: {
    formData: {
      merchantId: 0,
      visitorName: '',
      visitorPhone: '',
      visitorCompany: '',
      visitPurpose: '',
      visitType: '',
      scheduledTime: '',
      duration: 0
    },
    merchants: [],
    merchantNames: [],
    merchantIndex: 0,
    selectedMerchant: null,
    visitTypes: ['商务洽谈', '技术交流', '参观访问', '面试', '培训', '其他'],
    visitTypeIndex: 0,
    durations: [1, 2, 3, 4, 6, 8],
    durationIndex: 0,
    dateTimeRange: [[], []], // [日期数组, 时间数组]
    dateTimeIndex: [0, 0],
    scheduledTimeText: '',
    loading: false,
    submitting: false
  },

  onLoad() {
    this.initDateTimeRange();
    this.loadMerchants();
  },

  // 初始化日期时间选择器数据
  initDateTimeRange() {
    const dates: string[] = [];
    const times: string[] = [];
    
    // 生成未来7天的日期
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;
      dates.push(dateStr);
    }
    
    // 生成时间选项 (9:00-18:00)
    for (let hour = 9; hour <= 18; hour++) {
      times.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    
    this.setData({
      dateTimeRange: [dates, times]
    });
  },

  // 加载商户列表
  async loadMerchants() {
    try {
      this.setData({ loading: true });
      const merchants = await VisitorService.getMerchants();
      const merchantNames = merchants.map(m => m.name);
      
      this.setData({
        merchants,
        merchantNames
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载商户列表失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 输入框变化处理
  onInputChange(e: any) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 商户选择变化
  async onMerchantChange(e: any) {
    const index = e.detail.value;
    const selectedMerchant = this.data.merchants[index];
    
    // 验证商户是否可以接受访客申请
    try {
      const isValid = await VisitorService.validateMerchantForVisitor(selectedMerchant.id);
      if (!isValid) {
        wx.showToast({
          title: '该商户暂时无法接受访客申请',
          icon: 'error'
        });
        return;
      }
    } catch (error) {
      wx.showToast({
        title: '验证商户信息失败',
        icon: 'error'
      });
      return;
    }
    
    this.setData({
      merchantIndex: index,
      selectedMerchant,
      'formData.merchantId': selectedMerchant.id
    });
  },

  // 访问类型选择变化
  onVisitTypeChange(e: any) {
    const index = e.detail.value;
    const visitType = this.data.visitTypes[index];
    
    this.setData({
      visitTypeIndex: index,
      'formData.visitType': visitType
    });
  },

  // 时长选择变化
  onDurationChange(e: any) {
    const index = e.detail.value;
    const duration = this.data.durations[index];
    
    this.setData({
      durationIndex: index,
      'formData.duration': duration
    });
  },

  // 日期时间选择变化
  onDateTimeChange(e: any) {
    const [dateIndex, timeIndex] = e.detail.value;
    const dateStr = this.data.dateTimeRange[0][dateIndex];
    const timeStr = this.data.dateTimeRange[1][timeIndex];
    
    // 构建完整的日期时间字符串
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + dateIndex);
    
    const [hour] = timeStr.split(':');
    targetDate.setHours(parseInt(hour), 0, 0, 0);
    
    const scheduledTime = targetDate.toISOString();
    const scheduledTimeText = `${dateStr} ${timeStr}`;
    
    this.setData({
      dateTimeIndex: [dateIndex, timeIndex],
      scheduledTimeText,
      'formData.scheduledTime': scheduledTime
    });
  },

  // 表单验证
  validateForm(): boolean {
    const { formData } = this.data;
    
    if (!formData.visitorName.trim()) {
      wx.showToast({ title: '请输入访客姓名', icon: 'error' });
      return false;
    }
    
    if (!formData.visitorPhone.trim()) {
      wx.showToast({ title: '请输入访客手机号', icon: 'error' });
      return false;
    }
    
    // 手机号格式验证
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(formData.visitorPhone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'error' });
      return false;
    }
    
    if (!formData.merchantId) {
      wx.showToast({ title: '请选择被访商户', icon: 'error' });
      return false;
    }
    
    if (!formData.visitPurpose.trim()) {
      wx.showToast({ title: '请输入访问目的', icon: 'error' });
      return false;
    }
    
    if (!formData.visitType) {
      wx.showToast({ title: '请选择访问类型', icon: 'error' });
      return false;
    }
    
    if (!formData.scheduledTime) {
      wx.showToast({ title: '请选择预约时间', icon: 'error' });
      return false;
    }
    
    // 验证预约时间不能是过去时间
    const scheduledTime = new Date(formData.scheduledTime);
    const now = new Date();
    if (scheduledTime <= now) {
      wx.showToast({ title: '预约时间不能早于当前时间', icon: 'error' });
      return false;
    }
    
    if (!formData.duration) {
      wx.showToast({ title: '请选择访问时长', icon: 'error' });
      return false;
    }
    
    return true;
  },

  // 提交表单
  async onSubmit() {
    if (!this.validateForm()) {
      return;
    }
    
    try {
      this.setData({ submitting: true });
      
      const application = await VisitorService.submitApplication(this.data.formData);
      
      wx.showToast({
        title: '申请提交成功',
        icon: 'success'
      });
      
      // 跳转到申请状态页面
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/visitor/status/status?id=${application.id}`
        });
      }, 1500);
      
    } catch (error) {
      wx.showToast({
        title: error.message || '提交申请失败',
        icon: 'error'
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  // 重置表单
  onReset() {
    this.setData({
      formData: {
        merchantId: 0,
        visitorName: '',
        visitorPhone: '',
        visitorCompany: '',
        visitPurpose: '',
        visitType: '',
        scheduledTime: '',
        duration: 0
      },
      merchantIndex: 0,
      selectedMerchant: null,
      visitTypeIndex: 0,
      durationIndex: 0,
      dateTimeIndex: [0, 0],
      scheduledTimeText: ''
    });
  }
});