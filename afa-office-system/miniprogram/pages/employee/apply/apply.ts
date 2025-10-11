// 员工申请页面逻辑
import EmployeeService, { EmployeeApplyData } from '../../../services/employee';
import { MerchantInfo, EmployeeApplication } from '../../../types/api';

interface ApplicationWithText extends EmployeeApplication {
  merchantName: string;
  createdAtText: string;
  approvedAtText?: string;
  reason?: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
  idCard?: string;
  merchantId?: string;
  department?: string;
  position?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

interface EnhancedEmployeeApplyData extends EmployeeApplyData {
  email?: string;
  startDate?: string;
  emergencyRelationship?: string;
}

interface PageData {
  formData: EnhancedEmployeeApplyData;
  formErrors: FormErrors;
  merchants: MerchantInfo[];
  merchantIndex: number;
  selectedMerchant: MerchantInfo | null;
  existingApplication: ApplicationWithText | null;
  statusText: Record<string, string>;
  relationshipOptions: string[];
  relationshipIndex: number;
  showReapplyForm: boolean;
  loading: boolean;
  submitting: boolean;
}

Page<PageData>({
  data: {
    formData: {
      merchantId: 0,
      name: '',
      phone: '',
      department: '',
      position: '',
      idCard: '',
      email: '',
      startDate: '',
      emergencyContact: '',
      emergencyPhone: '',
      emergencyRelationship: ''
    },
    formErrors: {},
    merchants: [],
    merchantIndex: 0,
    selectedMerchant: null,
    existingApplication: null,
    statusText: {
      pending: '待审批',
      approved: '已通过',
      rejected: '已拒绝'
    },
    relationshipOptions: ['父母', '配偶', '子女', '兄弟姐妹', '朋友', '同事', '其他'],
    relationshipIndex: 0,
    showReapplyForm: false,
    loading: false,
    submitting: false
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    // 页面显示时检查申请状态
    this.checkApplicationStatus();
  },

  // 加载页面数据
  async loadData() {
    try {
      this.setData({ loading: true });
      
      // 并行加载商户列表和现有申请
      const [merchants, existingApplication] = await Promise.all([
        EmployeeService.getMerchants(),
        EmployeeService.getMyApplication()
      ]);
      
      let processedApplication = null;
      if (existingApplication) {
        // 查找对应的商户名称
        const merchant = merchants.find(m => m.id === existingApplication.merchantId);
        processedApplication = {
          ...existingApplication,
          merchantName: merchant ? merchant.name : `商户${existingApplication.merchantId}`,
          createdAtText: this.formatDateTime(existingApplication.createdAt),
          approvedAtText: existingApplication.approvedAt ? this.formatDateTime(existingApplication.approvedAt) : undefined
        };
      }
      
      this.setData({
        merchants,
        existingApplication: processedApplication,
        showReapplyForm: false
      });
      
    } catch (error) {
      wx.showToast({
        title: error.message || '加载数据失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 检查申请状态
  async checkApplicationStatus() {
    try {
      const application = await EmployeeService.getMyApplication();
      if (application && application.status !== this.data.existingApplication?.status) {
        // 状态发生变化，重新加载数据
        this.loadData();
      }
    } catch (error) {
      // 静默处理错误
      console.error('检查申请状态失败:', error);
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

  // 输入框变化处理
  onInputChange(e: any) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    // 清除对应字段的错误信息
    const formErrors = { ...this.data.formErrors };
    delete formErrors[field as keyof FormErrors];
    
    this.setData({
      [`formData.${field}`]: value,
      formErrors
    });
  },

  // 商户选择变化
  onMerchantChange(e: any) {
    const index = e.detail.value;
    const selectedMerchant = this.data.merchants[index];
    
    // 清除商户相关错误
    const formErrors = { ...this.data.formErrors };
    delete formErrors.merchantId;
    
    this.setData({
      merchantIndex: index,
      selectedMerchant,
      'formData.merchantId': selectedMerchant.id,
      formErrors
    });
  },

  // 日期选择变化
  onDateChange(e: any) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 关系选择变化
  onRelationshipChange(e: any) {
    const index = e.detail.value;
    const relationship = this.data.relationshipOptions[index];
    
    this.setData({
      relationshipIndex: index,
      'formData.emergencyRelationship': relationship
    });
  },

  // 表单验证
  validateForm(): boolean {
    const { formData } = this.data;
    const errors: FormErrors = {};
    
    // 姓名验证
    if (!formData.name.trim()) {
      errors.name = '请输入姓名';
    } else if (formData.name.trim().length < 2) {
      errors.name = '姓名至少2个字符';
    }
    
    // 手机号验证
    if (!formData.phone.trim()) {
      errors.phone = '请输入手机号';
    } else {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(formData.phone)) {
        errors.phone = '请输入正确的11位手机号';
      }
    }
    
    // 邮箱验证（可选）
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = '请输入正确的邮箱地址';
      }
    }
    
    // 商户验证
    if (!formData.merchantId) {
      errors.merchantId = '请选择申请商户';
    }
    
    // 部门验证
    if (!formData.department.trim()) {
      errors.department = '请输入所属部门';
    }
    
    // 职位验证
    if (!formData.position.trim()) {
      errors.position = '请输入职位名称';
    }
    
    // 身份证号格式验证（可选）
    if (formData.idCard && formData.idCard.trim()) {
      const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
      if (!idCardRegex.test(formData.idCard)) {
        errors.idCard = '请输入正确的18位身份证号';
      }
    }
    
    // 紧急联系人验证（如果填写了联系人，则电话必填）
    if (formData.emergencyContact && formData.emergencyContact.trim()) {
      if (!formData.emergencyPhone || !formData.emergencyPhone.trim()) {
        errors.emergencyPhone = '请输入紧急联系人电话';
      } else {
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(formData.emergencyPhone)) {
          errors.emergencyPhone = '请输入正确的11位手机号';
        }
      }
    }
    
    // 紧急联系人电话验证（如果填写了电话，则联系人必填）
    if (formData.emergencyPhone && formData.emergencyPhone.trim()) {
      if (!formData.emergencyContact || !formData.emergencyContact.trim()) {
        errors.emergencyContact = '请输入紧急联系人姓名';
      }
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(formData.emergencyPhone)) {
        errors.emergencyPhone = '请输入正确的11位手机号';
      }
    }
    
    // 设置错误信息
    this.setData({ formErrors: errors });
    
    // 如果有错误，显示第一个错误信息
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      const firstError = errors[errorKeys[0] as keyof FormErrors];
      wx.showToast({ title: firstError || '请检查表单信息', icon: 'error' });
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
      
      const application = await EmployeeService.submitApplication(this.data.formData);
      
      wx.showToast({
        title: '申请提交成功',
        icon: 'success'
      });
      
      // 重新加载数据显示申请状态
      setTimeout(() => {
        this.loadData();
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
        name: '',
        phone: '',
        department: '',
        position: '',
        idCard: '',
        email: '',
        startDate: '',
        emergencyContact: '',
        emergencyPhone: '',
        emergencyRelationship: ''
      },
      formErrors: {},
      merchantIndex: 0,
      selectedMerchant: null,
      relationshipIndex: 0
    });
  },

  // 重新申请
  onReapply() {
    const { existingApplication } = this.data;
    if (existingApplication) {
      // 预填充之前的申请信息
      const merchant = this.data.merchants.find(m => m.id === existingApplication.merchantId);
      const merchantIndex = merchant ? this.data.merchants.indexOf(merchant) : 0;
      
      this.setData({
        showReapplyForm: true,
        formData: {
          merchantId: existingApplication.merchantId,
          name: existingApplication.name,
          phone: existingApplication.phone,
          department: existingApplication.department || '',
          position: existingApplication.position || '',
          idCard: '',
          email: '',
          startDate: '',
          emergencyContact: '',
          emergencyPhone: '',
          emergencyRelationship: ''
        },
        merchantIndex,
        selectedMerchant: merchant || null,
        formErrors: {}
      });
    }
  },

  // 取消重新申请
  onCancelReapply() {
    this.setData({
      showReapplyForm: false,
      formErrors: {}
    });
    this.onReset();
  },

  // 撤销申请
  async onWithdrawApplication() {
    const { existingApplication } = this.data;
    if (!existingApplication) return;

    try {
      await wx.showModal({
        title: '确认撤销',
        content: '确定要撤销当前申请吗？撤销后可以重新提交申请。',
        confirmText: '确认撤销',
        cancelText: '取消'
      });

      wx.showLoading({ title: '撤销中...' });
      
      await EmployeeService.withdrawApplication(existingApplication.id);
      
      wx.hideLoading();
      wx.showToast({
        title: '申请已撤销',
        icon: 'success'
      });
      
      // 重新加载数据
      setTimeout(() => {
        this.loadData();
      }, 1500);
      
    } catch (error) {
      wx.hideLoading();
      if (error.errMsg !== 'showModal:fail cancel') {
        wx.showToast({
          title: error.message || '撤销失败',
          icon: 'error'
        });
      }
    }
  },

  // 查看员工通行码
  onViewEmployeePasscode() {
    wx.navigateTo({
      url: '/pages/employee/passcode/passcode'
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});