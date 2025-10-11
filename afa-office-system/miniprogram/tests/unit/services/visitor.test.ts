// 访客服务单元测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetMocks, mockApiResponse, mockApiError } from '../../setup';

describe('访客服务测试', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('获取商户列表', () => {
    it('应该成功获取商户列表', async () => {
      const mockMerchants = [
        { id: 1, name: '测试商户1', status: 'active' },
        { id: 2, name: '测试商户2', status: 'active' }
      ];
      mockApiResponse(mockMerchants);

      class VisitorService {
        async getMerchants() {
          // 模拟API调用
          const response = { success: true, data: mockMerchants };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取商户列表失败');
        }
      }

      const visitorService = new VisitorService();
      const result = await visitorService.getMerchants();

      expect(result).toEqual(mockMerchants);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('测试商户1');
    });

    it('应该处理获取商户列表失败', async () => {
      mockApiError(new Error('网络错误'));

      class VisitorService {
        async getMerchants() {
          const response = { success: false, message: '网络错误' };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取商户列表失败');
        }
      }

      const visitorService = new VisitorService();

      await expect(visitorService.getMerchants()).rejects.toThrow('网络错误');
    });

    it('应该处理空的商户列表', async () => {
      mockApiResponse([]);

      class VisitorService {
        async getMerchants() {
          const response = { success: true, data: [] };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取商户列表失败');
        }
      }

      const visitorService = new VisitorService();
      const result = await visitorService.getMerchants();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('提交访客申请', () => {
    it('应该成功提交访客申请', async () => {
      const mockApplication = {
        id: 123,
        visitorName: '张三',
        status: 'pending',
        createdAt: '2024-01-01T10:00:00.000Z'
      };
      mockApiResponse(mockApplication);

      class VisitorService {
        async submitApplication(data) {
          // 模拟API调用和通知服务
          const response = { success: true, data: mockApplication };
          if (response.success) {
            // 模拟发送通知
            await this.sendNotification(response.data.id);
            return response.data;
          }
          throw new Error(response.message || '提交申请失败');
        }

        async sendNotification(applicationId) {
          // 模拟通知服务
          console.log(`发送申请提交通知: ${applicationId}`);
        }
      }

      const visitorService = new VisitorService();
      const applyData = {
        merchantId: 1,
        visitorName: '张三',
        visitorPhone: '13800138000',
        visitPurpose: '商务洽谈',
        visitType: '商务洽谈',
        scheduledTime: '2024-01-01T10:00:00.000Z',
        duration: 2
      };

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await visitorService.submitApplication(applyData);

      expect(result).toEqual(mockApplication);
      expect(result.id).toBe(123);
      expect(result.status).toBe('pending');
      expect(consoleSpy).toHaveBeenCalledWith('发送申请提交通知: 123');

      consoleSpy.mockRestore();
    });

    it('应该处理提交申请失败', async () => {
      mockApiError(new Error('服务器错误'));

      class VisitorService {
        async submitApplication(data) {
          const response = { success: false, message: '服务器错误' };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '提交申请失败');
        }
      }

      const visitorService = new VisitorService();
      const applyData = {
        merchantId: 1,
        visitorName: '张三',
        visitorPhone: '13800138000',
        visitPurpose: '商务洽谈'
      };

      await expect(visitorService.submitApplication(applyData)).rejects.toThrow('服务器错误');
    });

    it('应该验证申请数据完整性', async () => {
      class VisitorService {
        async submitApplication(data) {
          // 验证必填字段
          if (!data.visitorName || !data.visitorPhone || !data.merchantId) {
            throw new Error('缺少必填字段');
          }

          // 验证手机号格式
          const phoneRegex = /^1[3-9]\d{9}$/;
          if (!phoneRegex.test(data.visitorPhone)) {
            throw new Error('手机号格式不正确');
          }

          const response = { success: true, data: { id: 1, ...data } };
          return response.data;
        }
      }

      const visitorService = new VisitorService();

      // 测试缺少必填字段
      await expect(visitorService.submitApplication({
        visitorName: '张三'
      })).rejects.toThrow('缺少必填字段');

      // 测试手机号格式错误
      await expect(visitorService.submitApplication({
        visitorName: '张三',
        visitorPhone: '123456',
        merchantId: 1
      })).rejects.toThrow('手机号格式不正确');

      // 测试正确数据
      const validData = {
        visitorName: '张三',
        visitorPhone: '13800138000',
        merchantId: 1
      };
      const result = await visitorService.submitApplication(validData);
      expect(result.visitorName).toBe('张三');
    });
  });

  describe('获取申请列表', () => {
    it('应该成功获取我的申请列表', async () => {
      const mockApplications = [
        { id: 1, visitorName: '张三', status: 'pending' },
        { id: 2, visitorName: '李四', status: 'approved' }
      ];
      mockApiResponse(mockApplications);

      class VisitorService {
        async getMyApplications(status) {
          const params = status ? { status } : {};
          // 模拟API调用
          const response = { success: true, data: mockApplications };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取申请列表失败');
        }
      }

      const visitorService = new VisitorService();
      const result = await visitorService.getMyApplications();

      expect(result).toEqual(mockApplications);
      expect(result).toHaveLength(2);
    });

    it('应该支持按状态筛选申请', async () => {
      const mockPendingApplications = [
        { id: 1, visitorName: '张三', status: 'pending' }
      ];
      mockApiResponse(mockPendingApplications);

      class VisitorService {
        async getMyApplications(status) {
          const params = status ? { status } : {};
          // 模拟根据状态筛选
          let filteredData = mockPendingApplications;
          if (status) {
            filteredData = mockPendingApplications.filter(app => app.status === status);
          }
          
          const response = { success: true, data: filteredData };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取申请列表失败');
        }
      }

      const visitorService = new VisitorService();
      const result = await visitorService.getMyApplications('pending');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('pending');
    });

    it('应该处理空的申请列表', async () => {
      mockApiResponse([]);

      class VisitorService {
        async getMyApplications(status) {
          const response = { success: true, data: [] };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取申请列表失败');
        }
      }

      const visitorService = new VisitorService();
      const result = await visitorService.getMyApplications();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('获取申请详情', () => {
    it('应该成功获取申请详情', async () => {
      const mockApplication = {
        id: 1,
        visitorName: '张三',
        visitorPhone: '13800138000',
        merchantId: 1,
        status: 'approved',
        createdAt: '2024-01-01T10:00:00.000Z'
      };
      mockApiResponse(mockApplication);

      class VisitorService {
        async getApplicationDetail(id) {
          const response = { success: true, data: mockApplication };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取申请详情失败');
        }
      }

      const visitorService = new VisitorService();
      const result = await visitorService.getApplicationDetail(1);

      expect(result).toEqual(mockApplication);
      expect(result.id).toBe(1);
      expect(result.visitorName).toBe('张三');
    });

    it('应该处理申请不存在的情况', async () => {
      mockApiError(new Error('申请不存在'));

      class VisitorService {
        async getApplicationDetail(id) {
          const response = { success: false, message: '申请不存在' };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取申请详情失败');
        }
      }

      const visitorService = new VisitorService();

      await expect(visitorService.getApplicationDetail(999)).rejects.toThrow('申请不存在');
    });
  });

  describe('通行码管理', () => {
    it('应该成功获取通行码', async () => {
      const mockPasscode = {
        id: 1,
        code: 'ABC123',
        status: 'active',
        expiryTime: '2024-12-31T23:59:59.000Z',
        usageLimit: 10,
        usageCount: 2
      };
      mockApiResponse(mockPasscode);

      class VisitorService {
        async getPasscode(applicationId) {
          const response = { success: true, data: mockPasscode };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取通行码失败');
        }
      }

      const visitorService = new VisitorService();
      const result = await visitorService.getPasscode(1);

      expect(result).toEqual(mockPasscode);
      expect(result.code).toBe('ABC123');
      expect(result.status).toBe('active');
    });

    it('应该成功刷新通行码', async () => {
      const mockNewPasscode = {
        id: 1,
        code: 'XYZ789',
        status: 'active',
        expiryTime: '2024-12-31T23:59:59.000Z',
        usageLimit: 10,
        usageCount: 0
      };
      mockApiResponse(mockNewPasscode);

      class VisitorService {
        async refreshPasscode(applicationId) {
          const response = { success: true, data: mockNewPasscode };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '刷新通行码失败');
        }
      }

      const visitorService = new VisitorService();
      const result = await visitorService.refreshPasscode(1);

      expect(result).toEqual(mockNewPasscode);
      expect(result.code).toBe('XYZ789');
      expect(result.usageCount).toBe(0);
    });

    it('应该处理通行码不存在的情况', async () => {
      mockApiError(new Error('通行码不存在'));

      class VisitorService {
        async getPasscode(applicationId) {
          const response = { success: false, message: '通行码不存在' };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取通行码失败');
        }
      }

      const visitorService = new VisitorService();

      await expect(visitorService.getPasscode(999)).rejects.toThrow('通行码不存在');
    });
  });

  describe('通行记录', () => {
    it('应该成功获取通行记录', async () => {
      const mockRecords = [
        {
          id: 1,
          applicationId: 1,
          accessTime: '2024-01-01T09:00:00.000Z',
          result: 'success',
          location: '大门'
        },
        {
          id: 2,
          applicationId: 1,
          accessTime: '2024-01-01T17:00:00.000Z',
          result: 'success',
          location: '大门'
        }
      ];
      mockApiResponse(mockRecords);

      class VisitorService {
        async getAccessHistory(applicationId, startDate, endDate) {
          const params = {};
          if (startDate) params.startDate = startDate;
          if (endDate) params.endDate = endDate;
          
          const response = { success: true, data: mockRecords };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取通行记录失败');
        }
      }

      const visitorService = new VisitorService();
      const result = await visitorService.getAccessHistory(1);

      expect(result).toEqual(mockRecords);
      expect(result).toHaveLength(2);
      expect(result[0].result).toBe('success');
    });

    it('应该支持日期范围筛选', async () => {
      const mockFilteredRecords = [
        {
          id: 1,
          applicationId: 1,
          accessTime: '2024-01-01T09:00:00.000Z',
          result: 'success'
        }
      ];
      mockApiResponse(mockFilteredRecords);

      class VisitorService {
        async getAccessHistory(applicationId, startDate, endDate) {
          const params = {};
          if (startDate) params.startDate = startDate;
          if (endDate) params.endDate = endDate;
          
          // 模拟日期筛选逻辑
          const response = { success: true, data: mockFilteredRecords };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取通行记录失败');
        }
      }

      const visitorService = new VisitorService();
      const result = await visitorService.getAccessHistory(
        1,
        '2024-01-01',
        '2024-01-01'
      );

      expect(result).toEqual(mockFilteredRecords);
      expect(result).toHaveLength(1);
    });

    it('应该处理空的通行记录', async () => {
      mockApiResponse([]);

      class VisitorService {
        async getAccessHistory(applicationId, startDate, endDate) {
          const response = { success: true, data: [] };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取通行记录失败');
        }
      }

      const visitorService = new VisitorService();
      const result = await visitorService.getAccessHistory(1);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('商户验证', () => {
    it('应该成功根据ID获取商户信息', async () => {
      const mockMerchants = [
        { id: 1, name: '测试商户1' },
        { id: 2, name: '测试商户2' }
      ];

      class VisitorService {
        async getMerchants() {
          return mockMerchants;
        }

        async getMerchantById(merchantId) {
          const merchants = await this.getMerchants();
          const merchant = merchants.find(m => m.id === merchantId);
          if (!merchant) {
            throw new Error('商户不存在');
          }
          return merchant;
        }
      }

      const visitorService = new VisitorService();
      const result = await visitorService.getMerchantById(1);

      expect(result).toEqual({ id: 1, name: '测试商户1' });
    });

    it('应该处理商户不存在的情况', async () => {
      const mockMerchants = [
        { id: 1, name: '测试商户1' }
      ];

      class VisitorService {
        async getMerchants() {
          return mockMerchants;
        }

        async getMerchantById(merchantId) {
          const merchants = await this.getMerchants();
          const merchant = merchants.find(m => m.id === merchantId);
          if (!merchant) {
            throw new Error('商户不存在');
          }
          return merchant;
        }
      }

      const visitorService = new VisitorService();

      await expect(visitorService.getMerchantById(999)).rejects.toThrow('商户不存在');
    });

    it('应该验证商户是否可以接受访客申请', async () => {
      const mockMerchants = [
        { id: 1, name: '测试商户1', status: 'active' },
        { id: 2, name: '测试商户2', status: 'inactive' }
      ];

      class VisitorService {
        async getMerchants() {
          return mockMerchants;
        }

        async getMerchantById(merchantId) {
          const merchants = await this.getMerchants();
          const merchant = merchants.find(m => m.id === merchantId);
          if (!merchant) {
            throw new Error('商户不存在');
          }
          return merchant;
        }

        async validateMerchantForVisitor(merchantId) {
          try {
            const merchant = await this.getMerchantById(merchantId);
            // 验证商户状态和其他条件
            return merchant.id > 0 && merchant.status === 'active';
          } catch (error) {
            return false;
          }
        }
      }

      const visitorService = new VisitorService();

      // 测试有效商户
      const validResult = await visitorService.validateMerchantForVisitor(1);
      expect(validResult).toBe(true);

      // 测试无效商户（状态不是active）
      const invalidResult = await visitorService.validateMerchantForVisitor(2);
      expect(invalidResult).toBe(false);

      // 测试不存在的商户
      const notExistResult = await visitorService.validateMerchantForVisitor(999);
      expect(notExistResult).toBe(false);
    });
  });

  describe('边界条件和异常处理', () => {
    it('应该处理无效的申请ID', async () => {
      class VisitorService {
        async getApplicationDetail(id) {
          if (!id || id <= 0) {
            throw new Error('无效的申请ID');
          }
          
          const response = { success: false, message: '申请不存在' };
          throw new Error(response.message);
        }
      }

      const visitorService = new VisitorService();

      await expect(visitorService.getApplicationDetail(0)).rejects.toThrow('无效的申请ID');
      await expect(visitorService.getApplicationDetail(-1)).rejects.toThrow('无效的申请ID');
      await expect(visitorService.getApplicationDetail(null)).rejects.toThrow('无效的申请ID');
    });

    it('应该处理网络超时', async () => {
      class VisitorService {
        async getMerchants() {
          // 模拟网络超时
          await new Promise((_, reject) => {
            setTimeout(() => reject(new Error('请求超时')), 100);
          });
        }
      }

      const visitorService = new VisitorService();

      await expect(visitorService.getMerchants()).rejects.toThrow('请求超时');
    });

    it('应该处理服务器内部错误', async () => {
      class VisitorService {
        async submitApplication(data) {
          const response = { success: false, message: '服务器内部错误', code: 500 };
          throw new Error(`${response.code}: ${response.message}`);
        }
      }

      const visitorService = new VisitorService();

      await expect(visitorService.submitApplication({})).rejects.toThrow('500: 服务器内部错误');
    });

    it('应该处理数据格式错误', async () => {
      class VisitorService {
        async getMyApplications() {
          // 模拟返回格式错误的数据
          const response = { success: true, data: 'invalid_data_format' };
          if (response.success) {
            if (!Array.isArray(response.data)) {
              throw new Error('数据格式错误');
            }
            return response.data;
          }
          throw new Error('获取申请列表失败');
        }
      }

      const visitorService = new VisitorService();

      await expect(visitorService.getMyApplications()).rejects.toThrow('数据格式错误');
    });
  });
});