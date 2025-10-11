import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock 微信小程序 API
const mockWx = {
  showToast: vi.fn(),
  navigateTo: vi.fn(),
  setData: vi.fn(),
  data: {}
};

global.wx = mockWx as any;
global.Page = vi.fn();

// Mock 员工服务
vi.mock('../../../services/employee', () => ({
  default: {
    getMerchants: vi.fn(),
    submitApplication: vi.fn(),
    getMyApplication: vi.fn()
  }
}));

describe('员工申请页面测试', () => {
  let mockPage: any;
  let EmployeeService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // 导入 EmployeeService
    EmployeeService = (await import('../../../services/employee')).default;
    
    // 模拟页面实例
    mockPage = {
      data: {
        formData: {
          merchantId: 0,
          name: '',
          phone: '',
          department: '',
          position: '',
          idCard: '',
          emergencyContact: '',
          emergencyPhone: ''
        },
        merchants: [],
        merchantNames: [],
        merchantIndex: 0,
        selectedMerchant: null,
        existingApplication: null,
        statusText: {
          pending: '待审批',
          approved: '已通过',
          rejected: '已拒绝'
        },
        loading: false,
        submitting: false
      },
      setData: vi.fn((data) => {
        Object.assign(mockPage.data, data);
      })
    };
  });

  describe('表单验证', () => {
    it('应该验证必填字段', () => {
      // 模拟验证函数
      const validateForm = () => {
        const { formData } = mockPage.data;
        
        if (!formData.name.trim()) {
          mockWx.showToast({ title: '请输入姓名', icon: 'error' });
          return false;
        }
        
        if (!formData.phone.trim()) {
          mockWx.showToast({ title: '请输入手机号', icon: 'error' });
          return false;
        }
        
        if (!formData.merchantId) {
          mockWx.showToast({ title: '请选择申请商户', icon: 'error' });
          return false;
        }
        
        return true;
      };

      // 测试空姓名
      mockPage.data.formData.name = '';
      expect(validateForm()).toBe(false);
      expect(mockWx.showToast).toHaveBeenCalledWith({ title: '请输入姓名', icon: 'error' });

      // 测试空手机号
      mockPage.data.formData.name = '张三';
      mockPage.data.formData.phone = '';
      expect(validateForm()).toBe(false);
      expect(mockWx.showToast).toHaveBeenCalledWith({ title: '请输入手机号', icon: 'error' });

      // 测试未选择商户
      mockPage.data.formData.phone = '13800138000';
      mockPage.data.formData.merchantId = 0;
      expect(validateForm()).toBe(false);
      expect(mockWx.showToast).toHaveBeenCalledWith({ title: '请选择申请商户', icon: 'error' });

      // 测试所有必填字段都填写
      mockPage.data.formData.merchantId = 1;
      expect(validateForm()).toBe(true);
    });

    it('应该验证手机号格式', () => {
      const validatePhoneFormat = (phone: string) => {
        const phoneRegex = /^1[3-9]\d{9}$/;
        return phoneRegex.test(phone);
      };

      expect(validatePhoneFormat('13800138000')).toBe(true);
      expect(validatePhoneFormat('123456789')).toBe(false);
      expect(validatePhoneFormat('1380013800')).toBe(false);
      expect(validatePhoneFormat('12800138000')).toBe(false);
    });

    it('应该验证身份证号格式', () => {
      const validateIdCard = (idCard: string) => {
        if (!idCard || !idCard.trim()) return true; // 可选字段
        const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
        return idCardRegex.test(idCard);
      };

      expect(validateIdCard('')).toBe(true); // 空值允许
      expect(validateIdCard('110101199001011234')).toBe(true); // 18位数字
      expect(validateIdCard('11010119900101123X')).toBe(true); // 17位数字+X
      expect(validateIdCard('110101900101123')).toBe(true); // 15位数字
      expect(validateIdCard('123456789')).toBe(false); // 无效格式
    });
  });

  describe('数据加载', () => {
    it('应该成功加载商户列表', async () => {
      const mockMerchants = [
        { id: 1, name: '商户A', code: 'A001', contact: '联系人A', phone: '13800138001' },
        { id: 2, name: '商户B', code: 'B001', contact: '联系人B', phone: '13800138002' }
      ];

      EmployeeService.getMerchants.mockResolvedValue(mockMerchants);
      EmployeeService.getMyApplication.mockResolvedValue(null);

      // 模拟 loadData 函数
      const loadData = async () => {
        try {
          mockPage.setData({ loading: true });
          
          const [merchants, existingApplication] = await Promise.all([
            EmployeeService.getMerchants(),
            EmployeeService.getMyApplication()
          ]);
          
          const merchantNames = merchants.map((m: any) => m.name);
          
          mockPage.setData({
            merchants,
            merchantNames,
            existingApplication
          });
        } catch (error) {
          mockWx.showToast({
            title: (error as Error).message || '加载数据失败',
            icon: 'error'
          });
        } finally {
          mockPage.setData({ loading: false });
        }
      };

      await loadData();

      expect(EmployeeService.getMerchants).toHaveBeenCalled();
      expect(EmployeeService.getMyApplication).toHaveBeenCalled();
      expect(mockPage.setData).toHaveBeenCalledWith(
        expect.objectContaining({
          merchants: mockMerchants,
          merchantNames: ['商户A', '商户B']
        })
      );
    });

    it('应该处理加载错误', async () => {
      const errorMessage = '网络错误';
      EmployeeService.getMerchants.mockRejectedValue(new Error(errorMessage));

      const loadData = async () => {
        try {
          mockPage.setData({ loading: true });
          await EmployeeService.getMerchants();
        } catch (error) {
          mockWx.showToast({
            title: (error as Error).message || '加载数据失败',
            icon: 'error'
          });
        } finally {
          mockPage.setData({ loading: false });
        }
      };

      await loadData();

      expect(mockWx.showToast).toHaveBeenCalledWith({
        title: errorMessage,
        icon: 'error'
      });
    });
  });

  describe('申请提交', () => {
    it('应该成功提交申请', async () => {
      const mockApplication = {
        id: 1,
        applicantId: 1,
        merchantId: 1,
        name: '张三',
        phone: '13800138000',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      EmployeeService.submitApplication.mockResolvedValue(mockApplication);

      // 设置表单数据
      mockPage.data.formData = {
        merchantId: 1,
        name: '张三',
        phone: '13800138000',
        department: '技术部',
        position: '开发工程师',
        idCard: '',
        emergencyContact: '',
        emergencyPhone: ''
      };

      // 模拟提交函数
      const onSubmit = async () => {
        try {
          mockPage.setData({ submitting: true });
          
          const application = await EmployeeService.submitApplication(mockPage.data.formData);
          
          mockWx.showToast({
            title: '申请提交成功',
            icon: 'success'
          });
          
          return application;
        } catch (error) {
          mockWx.showToast({
            title: (error as Error).message || '提交申请失败',
            icon: 'error'
          });
        } finally {
          mockPage.setData({ submitting: false });
        }
      };

      const result = await onSubmit();

      expect(EmployeeService.submitApplication).toHaveBeenCalledWith(mockPage.data.formData);
      expect(mockWx.showToast).toHaveBeenCalledWith({
        title: '申请提交成功',
        icon: 'success'
      });
      expect(result).toEqual(mockApplication);
    });

    it('应该处理提交错误', async () => {
      const errorMessage = '商户不存在';
      EmployeeService.submitApplication.mockRejectedValue(new Error(errorMessage));

      mockPage.data.formData = {
        merchantId: 999,
        name: '张三',
        phone: '13800138000'
      };

      const onSubmit = async () => {
        try {
          mockPage.setData({ submitting: true });
          await EmployeeService.submitApplication(mockPage.data.formData);
        } catch (error) {
          mockWx.showToast({
            title: (error as Error).message || '提交申请失败',
            icon: 'error'
          });
        } finally {
          mockPage.setData({ submitting: false });
        }
      };

      await onSubmit();

      expect(mockWx.showToast).toHaveBeenCalledWith({
        title: errorMessage,
        icon: 'error'
      });
    });
  });

  describe('商户选择', () => {
    it('应该正确处理商户选择', () => {
      const merchants = [
        { id: 1, name: '商户A', code: 'A001' },
        { id: 2, name: '商户B', code: 'B001' }
      ];

      mockPage.data.merchants = merchants;

      // 模拟商户选择函数
      const onMerchantChange = (index: number) => {
        const selectedMerchant = merchants[index];
        
        mockPage.setData({
          merchantIndex: index,
          selectedMerchant,
          'formData.merchantId': selectedMerchant.id
        });
      };

      onMerchantChange(1);

      expect(mockPage.setData).toHaveBeenCalledWith({
        merchantIndex: 1,
        selectedMerchant: merchants[1],
        'formData.merchantId': 2
      });
    });
  });

  describe('输入处理', () => {
    it('应该正确处理输入变化', () => {
      // 模拟输入变化函数
      const onInputChange = (field: string, value: string) => {
        mockPage.setData({
          [`formData.${field}`]: value
        });
      };

      onInputChange('name', '张三');
      expect(mockPage.setData).toHaveBeenCalledWith({
        'formData.name': '张三'
      });

      onInputChange('phone', '13800138000');
      expect(mockPage.setData).toHaveBeenCalledWith({
        'formData.phone': '13800138000'
      });
    });
  });
});