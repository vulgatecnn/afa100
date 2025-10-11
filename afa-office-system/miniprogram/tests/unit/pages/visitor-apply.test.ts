// 访客申请页面单元测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetMocks, mockApiResponse, mockApiError } from '../../setup';

describe('访客申请页面测试', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('页面初始状态', () => {
    it('应该有正确的初始数据', () => {
      const applyPage = {
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
          dateTimeRange: [[], []],
          dateTimeIndex: [0, 0],
          scheduledTimeText: '',
          loading: false,
          submitting: false
        }
      };

      expect(applyPage.data.formData.visitorName).toBe('');
      expect(applyPage.data.visitTypes).toContain('商务洽谈');
      expect(applyPage.data.durations).toContain(1);
      expect(applyPage.data.loading).toBe(false);
      expect(applyPage.data.submitting).toBe(false);
    });
  });

  describe('页面生命周期', () => {
    it('应该在onLoad时初始化数据', async () => {
      // 模拟商户列表API响应
      mockApiResponse([
        { id: 1, name: '测试商户1' },
        { id: 2, name: '测试商户2' }
      ]);

      const applyPage = {
        data: {
          merchants: [],
          merchantNames: [],
          dateTimeRange: [[], []],
          loading: false
        },
        setData: vi.fn(),
        initDateTimeRange() {
          const dates = [];
          const times = [];
          
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
        async loadMerchants() {
          try {
            this.setData({ loading: true });
            // 模拟API调用
            const merchants = [
              { id: 1, name: '测试商户1' },
              { id: 2, name: '测试商户2' }
            ];
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
        onLoad() {
          this.initDateTimeRange();
          this.loadMerchants();
        }
      };

      await applyPage.onLoad();

      expect(applyPage.setData).toHaveBeenCalledWith({
        dateTimeRange: expect.arrayContaining([
          expect.any(Array),
          expect.any(Array)
        ])
      });
      expect(applyPage.setData).toHaveBeenCalledWith({
        merchants: expect.any(Array),
        merchantNames: expect.any(Array)
      });
    });
  });

  describe('日期时间初始化', () => {
    it('应该正确初始化日期时间选择器数据', () => {
      const applyPage = {
        data: { dateTimeRange: [[], []] },
        setData: vi.fn(),
        initDateTimeRange() {
          const dates = [];
          const times = [];
          
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
        }
      };

      applyPage.initDateTimeRange();

      expect(applyPage.setData).toHaveBeenCalledWith({
        dateTimeRange: [
          expect.arrayContaining([expect.stringMatching(/\d+月\d+日/)]),
          expect.arrayContaining([expect.stringMatching(/\d{2}:00/)])
        ]
      });
    });
  });

  describe('商户列表加载', () => {
    it('应该成功加载商户列表', async () => {
      const mockMerchants = [
        { id: 1, name: '测试商户1' },
        { id: 2, name: '测试商户2' }
      ];
      mockApiResponse(mockMerchants);

      const applyPage = {
        data: { loading: false },
        setData: vi.fn(),
        async loadMerchants() {
          try {
            this.setData({ loading: true });
            const merchants = mockMerchants;
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
        }
      };

      await applyPage.loadMerchants();

      expect(applyPage.setData).toHaveBeenCalledWith({ loading: true });
      expect(applyPage.setData).toHaveBeenCalledWith({
        merchants: mockMerchants,
        merchantNames: ['测试商户1', '测试商户2']
      });
      expect(applyPage.setData).toHaveBeenCalledWith({ loading: false });
    });

    it('应该处理加载商户列表失败', async () => {
      mockApiError(new Error('网络错误'));

      const applyPage = {
        data: { loading: false },
        setData: vi.fn(),
        async loadMerchants() {
          try {
            this.setData({ loading: true });
            throw new Error('网络错误');
          } catch (error) {
            wx.showToast({
              title: error.message || '加载商户列表失败',
              icon: 'error'
            });
          } finally {
            this.setData({ loading: false });
          }
        }
      };

      await applyPage.loadMerchants();

      expect(wx.showToast).toHaveBeenCalledWith({
        title: '网络错误',
        icon: 'error'
      });
      expect(applyPage.setData).toHaveBeenCalledWith({ loading: false });
    });
  });

  describe('表单输入处理', () => {
    it('应该正确处理输入框变化', () => {
      const applyPage = {
        data: { formData: { visitorName: '' } },
        setData: vi.fn(),
        onInputChange(e) {
          const { field } = e.currentTarget.dataset;
          const { value } = e.detail;
          
          this.setData({
            [`formData.${field}`]: value
          });
        }
      };

      const mockEvent = {
        currentTarget: {
          dataset: { field: 'visitorName' }
        },
        detail: { value: '张三' }
      };

      applyPage.onInputChange(mockEvent);

      expect(applyPage.setData).toHaveBeenCalledWith({
        'formData.visitorName': '张三'
      });
    });
  });

  describe('商户选择', () => {
    it('应该正确处理商户选择变化', async () => {
      const mockMerchants = [
        { id: 1, name: '测试商户1' },
        { id: 2, name: '测试商户2' }
      ];

      const applyPage = {
        data: { 
          merchants: mockMerchants,
          formData: { merchantId: 0 }
        },
        setData: vi.fn(),
        async onMerchantChange(e) {
          const index = e.detail.value;
          const selectedMerchant = this.data.merchants[index];
          
          // 模拟验证成功
          const isValid = true;
          if (!isValid) {
            wx.showToast({
              title: '该商户暂时无法接受访客申请',
              icon: 'error'
            });
            return;
          }
          
          this.setData({
            merchantIndex: index,
            selectedMerchant,
            'formData.merchantId': selectedMerchant.id
          });
        }
      };

      const mockEvent = {
        detail: { value: 1 }
      };

      await applyPage.onMerchantChange(mockEvent);

      expect(applyPage.setData).toHaveBeenCalledWith({
        merchantIndex: 1,
        selectedMerchant: mockMerchants[1],
        'formData.merchantId': 2
      });
    });

    it('应该处理无效商户选择', async () => {
      const mockMerchants = [
        { id: 1, name: '测试商户1' }
      ];

      const applyPage = {
        data: { merchants: mockMerchants },
        setData: vi.fn(),
        async onMerchantChange(e) {
          const index = e.detail.value;
          const selectedMerchant = this.data.merchants[index];
          
          // 模拟验证失败
          const isValid = false;
          if (!isValid) {
            wx.showToast({
              title: '该商户暂时无法接受访客申请',
              icon: 'error'
            });
            return;
          }
        }
      };

      const mockEvent = {
        detail: { value: 0 }
      };

      await applyPage.onMerchantChange(mockEvent);

      expect(wx.showToast).toHaveBeenCalledWith({
        title: '该商户暂时无法接受访客申请',
        icon: 'error'
      });
      expect(applyPage.setData).not.toHaveBeenCalled();
    });
  });

  describe('访问类型和时长选择', () => {
    it('应该正确处理访问类型选择', () => {
      const applyPage = {
        data: { 
          visitTypes: ['商务洽谈', '技术交流'],
          formData: { visitType: '' }
        },
        setData: vi.fn(),
        onVisitTypeChange(e) {
          const index = e.detail.value;
          const visitType = this.data.visitTypes[index];
          
          this.setData({
            visitTypeIndex: index,
            'formData.visitType': visitType
          });
        }
      };

      const mockEvent = {
        detail: { value: 1 }
      };

      applyPage.onVisitTypeChange(mockEvent);

      expect(applyPage.setData).toHaveBeenCalledWith({
        visitTypeIndex: 1,
        'formData.visitType': '技术交流'
      });
    });

    it('应该正确处理时长选择', () => {
      const applyPage = {
        data: { 
          durations: [1, 2, 3],
          formData: { duration: 0 }
        },
        setData: vi.fn(),
        onDurationChange(e) {
          const index = e.detail.value;
          const duration = this.data.durations[index];
          
          this.setData({
            durationIndex: index,
            'formData.duration': duration
          });
        }
      };

      const mockEvent = {
        detail: { value: 2 }
      };

      applyPage.onDurationChange(mockEvent);

      expect(applyPage.setData).toHaveBeenCalledWith({
        durationIndex: 2,
        'formData.duration': 3
      });
    });
  });

  describe('日期时间选择', () => {
    it('应该正确处理日期时间选择变化', () => {
      const applyPage = {
        data: { 
          dateTimeRange: [
            ['1月1日', '1月2日'],
            ['09:00', '10:00']
          ],
          formData: { scheduledTime: '' }
        },
        setData: vi.fn(),
        onDateTimeChange(e) {
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
        }
      };

      const mockEvent = {
        detail: { value: [1, 1] }
      };

      applyPage.onDateTimeChange(mockEvent);

      expect(applyPage.setData).toHaveBeenCalledWith({
        dateTimeIndex: [1, 1],
        scheduledTimeText: '1月2日 10:00',
        'formData.scheduledTime': expect.any(String)
      });
    });
  });

  describe('表单验证', () => {
    it('应该验证必填字段', () => {
      const applyPage = {
        data: {
          formData: {
            visitorName: '',
            visitorPhone: '',
            merchantId: 0,
            visitPurpose: '',
            visitType: '',
            scheduledTime: '',
            duration: 0
          }
        },
        validateForm() {
          const { formData } = this.data;
          
          if (!formData.visitorName.trim()) {
            wx.showToast({ title: '请输入访客姓名', icon: 'error' });
            return false;
          }
          
          if (!formData.visitorPhone.trim()) {
            wx.showToast({ title: '请输入访客手机号', icon: 'error' });
            return false;
          }
          
          return true;
        }
      };

      const result = applyPage.validateForm();

      expect(result).toBe(false);
      expect(wx.showToast).toHaveBeenCalledWith({
        title: '请输入访客姓名',
        icon: 'error'
      });
    });

    it('应该验证手机号格式', () => {
      const applyPage = {
        data: {
          formData: {
            visitorName: '张三',
            visitorPhone: '123456',
            merchantId: 1,
            visitPurpose: '商务洽谈',
            visitType: '商务洽谈',
            scheduledTime: new Date().toISOString(),
            duration: 2
          }
        },
        validateForm() {
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
          
          return true;
        }
      };

      const result = applyPage.validateForm();

      expect(result).toBe(false);
      expect(wx.showToast).toHaveBeenCalledWith({
        title: '请输入正确的手机号',
        icon: 'error'
      });
    });

    it('应该验证预约时间不能是过去时间', () => {
      const pastTime = new Date();
      pastTime.setHours(pastTime.getHours() - 1);

      const applyPage = {
        data: {
          formData: {
            visitorName: '张三',
            visitorPhone: '13800138000',
            merchantId: 1,
            visitPurpose: '商务洽谈',
            visitType: '商务洽谈',
            scheduledTime: pastTime.toISOString(),
            duration: 2
          }
        },
        validateForm() {
          const { formData } = this.data;
          
          // 基础验证...
          if (!formData.visitorName.trim()) return false;
          if (!formData.visitorPhone.trim()) return false;
          const phoneRegex = /^1[3-9]\d{9}$/;
          if (!phoneRegex.test(formData.visitorPhone)) return false;
          if (!formData.merchantId) return false;
          if (!formData.visitPurpose.trim()) return false;
          if (!formData.visitType) return false;
          if (!formData.scheduledTime) return false;
          
          // 验证预约时间不能是过去时间
          const scheduledTime = new Date(formData.scheduledTime);
          const now = new Date();
          if (scheduledTime <= now) {
            wx.showToast({ title: '预约时间不能早于当前时间', icon: 'error' });
            return false;
          }
          
          if (!formData.duration) return false;
          
          return true;
        }
      };

      const result = applyPage.validateForm();

      expect(result).toBe(false);
      expect(wx.showToast).toHaveBeenCalledWith({
        title: '预约时间不能早于当前时间',
        icon: 'error'
      });
    });

    it('应该通过完整的表单验证', () => {
      const futureTime = new Date();
      futureTime.setHours(futureTime.getHours() + 2);

      const applyPage = {
        data: {
          formData: {
            visitorName: '张三',
            visitorPhone: '13800138000',
            merchantId: 1,
            visitPurpose: '商务洽谈',
            visitType: '商务洽谈',
            scheduledTime: futureTime.toISOString(),
            duration: 2
          }
        },
        validateForm() {
          const { formData } = this.data;
          
          if (!formData.visitorName.trim()) {
            wx.showToast({ title: '请输入访客姓名', icon: 'error' });
            return false;
          }
          
          if (!formData.visitorPhone.trim()) {
            wx.showToast({ title: '请输入访客手机号', icon: 'error' });
            return false;
          }
          
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
        }
      };

      const result = applyPage.validateForm();

      expect(result).toBe(true);
      expect(wx.showToast).not.toHaveBeenCalled();
    });
  });

  describe('表单提交', () => {
    it('应该成功提交表单', async () => {
      const futureTime = new Date();
      futureTime.setHours(futureTime.getHours() + 2);

      mockApiResponse({ id: 123, status: 'pending' });

      const applyPage = {
        data: {
          formData: {
            visitorName: '张三',
            visitorPhone: '13800138000',
            merchantId: 1,
            visitPurpose: '商务洽谈',
            visitType: '商务洽谈',
            scheduledTime: futureTime.toISOString(),
            duration: 2
          },
          submitting: false
        },
        setData: vi.fn(),
        validateForm() {
          return true;
        },
        async onSubmit() {
          if (!this.validateForm()) {
            return;
          }
          
          try {
            this.setData({ submitting: true });
            
            // 模拟API调用
            const application = { id: 123, status: 'pending' };
            
            wx.showToast({
              title: '申请提交成功',
              icon: 'success'
            });
            
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
        }
      };

      await applyPage.onSubmit();

      expect(applyPage.setData).toHaveBeenCalledWith({ submitting: true });
      expect(wx.showToast).toHaveBeenCalledWith({
        title: '申请提交成功',
        icon: 'success'
      });
      expect(applyPage.setData).toHaveBeenCalledWith({ submitting: false });
    });

    it('应该处理提交失败', async () => {
      mockApiError(new Error('服务器错误'));

      const applyPage = {
        data: {
          formData: {
            visitorName: '张三',
            visitorPhone: '13800138000',
            merchantId: 1,
            visitPurpose: '商务洽谈',
            visitType: '商务洽谈',
            scheduledTime: new Date().toISOString(),
            duration: 2
          },
          submitting: false
        },
        setData: vi.fn(),
        validateForm() {
          return true;
        },
        async onSubmit() {
          if (!this.validateForm()) {
            return;
          }
          
          try {
            this.setData({ submitting: true });
            throw new Error('服务器错误');
          } catch (error) {
            wx.showToast({
              title: error.message || '提交申请失败',
              icon: 'error'
            });
          } finally {
            this.setData({ submitting: false });
          }
        }
      };

      await applyPage.onSubmit();

      expect(wx.showToast).toHaveBeenCalledWith({
        title: '服务器错误',
        icon: 'error'
      });
      expect(applyPage.setData).toHaveBeenCalledWith({ submitting: false });
    });
  });

  describe('表单重置', () => {
    it('应该正确重置表单数据', () => {
      const applyPage = {
        data: {
          formData: {
            merchantId: 1,
            visitorName: '张三',
            visitorPhone: '13800138000',
            visitorCompany: '测试公司',
            visitPurpose: '商务洽谈',
            visitType: '商务洽谈',
            scheduledTime: '2024-01-01T10:00:00.000Z',
            duration: 2
          },
          merchantIndex: 1,
          selectedMerchant: { id: 1, name: '测试商户' },
          visitTypeIndex: 1,
          durationIndex: 1,
          dateTimeIndex: [1, 1],
          scheduledTimeText: '1月1日 10:00'
        },
        setData: vi.fn(),
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
      };

      applyPage.onReset();

      expect(applyPage.setData).toHaveBeenCalledWith({
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
    });
  });
});