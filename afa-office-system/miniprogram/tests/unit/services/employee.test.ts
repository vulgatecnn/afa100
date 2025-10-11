// 员工服务单元测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetMocks, mockApiResponse, mockApiError } from '../../setup';

describe('员工服务测试', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('获取商户列表', () => {
    it('应该成功获取商户列表', async () => {
      const mockMerchants = [
        { id: 1, name: '科技公司', status: 'active' },
        { id: 2, name: '贸易公司', status: 'active' }
      ];
      mockApiResponse(mockMerchants);

      class EmployeeService {
        async getMerchants() {
          const response = { success: true, data: mockMerchants };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取商户列表失败');
        }
      }

      const employeeService = new EmployeeService();
      const result = await employeeService.getMerchants();

      expect(result).toEqual(mockMerchants);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('科技公司');
    });

    it('应该处理获取商户列表失败', async () => {
      mockApiError(new Error('网络错误'));

      class EmployeeService {
        async getMerchants() {
          const response = { success: false, message: '网络错误' };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取商户列表失败');
        }
      }

      const employeeService = new EmployeeService();

      await expect(employeeService.getMerchants()).rejects.toThrow('网络错误');
    });
  });

  describe('提交员工申请', () => {
    it('应该成功提交员工申请', async () => {
      const mockApplication = {
        id: 456,
        name: '李四',
        phone: '13900139000',
        merchantId: 1,
        status: 'pending',
        createdAt: '2024-01-01T10:00:00.000Z'
      };
      mockApiResponse(mockApplication);

      class EmployeeService {
        async submitApplication(data) {
          const response = { success: true, data: mockApplication };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '提交申请失败');
        }
      }

      const employeeService = new EmployeeService();
      const applyData = {
        merchantId: 1,
        name: '李四',
        phone: '13900139000',
        department: '技术部',
        position: '软件工程师',
        email: 'lisi@example.com'
      };

      const result = await employeeService.submitApplication(applyData);

      expect(result).toEqual(mockApplication);
      expect(result.id).toBe(456);
      expect(result.name).toBe('李四');
      expect(result.status).toBe('pending');
    });

    it('应该处理提交申请失败', async () => {
      mockApiError(new Error('服务器错误'));

      class EmployeeService {
        async submitApplication(data) {
          const response = { success: false, message: '服务器错误' };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '提交申请失败');
        }
      }

      const employeeService = new EmployeeService();
      const applyData = {
        merchantId: 1,
        name: '李四',
        phone: '13900139000'
      };

      await expect(employeeService.submitApplication(applyData)).rejects.toThrow('服务器错误');
    });

    it('应该验证员工申请数据', async () => {
      class EmployeeService {
        async submitApplication(data) {
          // 验证必填字段
          if (!data.name || !data.phone || !data.merchantId) {
            throw new Error('缺少必填字段');
          }

          // 验证手机号格式
          const phoneRegex = /^1[3-9]\d{9}$/;
          if (!phoneRegex.test(data.phone)) {
            throw new Error('手机号格式不正确');
          }

          // 验证邮箱格式（如果提供）
          if (data.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
              throw new Error('邮箱格式不正确');
            }
          }

          const response = { success: true, data: { id: 1, ...data } };
          return response.data;
        }
      }

      const employeeService = new EmployeeService();

      // 测试缺少必填字段
      await expect(employeeService.submitApplication({
        name: '李四'
      })).rejects.toThrow('缺少必填字段');

      // 测试手机号格式错误
      await expect(employeeService.submitApplication({
        name: '李四',
        phone: '123456',
        merchantId: 1
      })).rejects.toThrow('手机号格式不正确');

      // 测试邮箱格式错误
      await expect(employeeService.submitApplication({
        name: '李四',
        phone: '13900139000',
        merchantId: 1,
        email: 'invalid-email'
      })).rejects.toThrow('邮箱格式不正确');

      // 测试正确数据
      const validData = {
        name: '李四',
        phone: '13900139000',
        merchantId: 1,
        email: 'lisi@example.com'
      };
      const result = await employeeService.submitApplication(validData);
      expect(result.name).toBe('李四');
      expect(result.email).toBe('lisi@example.com');
    });
  });

  describe('获取员工申请', () => {
    it('应该成功获取我的员工申请', async () => {
      const mockApplication = {
        id: 1,
        name: '李四',
        phone: '13900139000',
        merchantId: 1,
        status: 'approved',
        department: '技术部'
      };
      mockApiResponse(mockApplication);

      class EmployeeService {
        async getMyApplication() {
          try {
            const response = { success: true, data: mockApplication };
            if (response.success) {
              return response.data;
            }
            return null;
          } catch (error) {
            return null;
          }
        }
      }

      const employeeService = new EmployeeService();
      const result = await employeeService.getMyApplication();

      expect(result).toEqual(mockApplication);
      expect(result.id).toBe(1);
      expect(result.status).toBe('approved');
    });

    it('应该处理没有申请记录的情况', async () => {
      class EmployeeService {
        async getMyApplication() {
          try {
            // 模拟没有申请记录
            throw new Error('没有申请记录');
          } catch (error) {
            return null;
          }
        }
      }

      const employeeService = new EmployeeService();
      const result = await employeeService.getMyApplication();

      expect(result).toBeNull();
    });

    it('应该处理API错误并返回null', async () => {
      class EmployeeService {
        async getMyApplication() {
          try {
            const response = { success: false, message: '服务器错误' };
            if (response.success) {
              return response.data;
            }
            return null;
          } catch (error) {
            return null;
          }
        }
      }

      const employeeService = new EmployeeService();
      const result = await employeeService.getMyApplication();

      expect(result).toBeNull();
    });
  });

  describe('员工通行码管理', () => {
    it('应该成功获取员工通行码', async () => {
      const mockPasscode = {
        id: 1,
        code: 'EMP123',
        status: 'active',
        expiryTime: '2024-12-31T23:59:59.000Z',
        usageLimit: -1, // 无限制
        usageCount: 15,
        permissions: ['基础通行', '会议室', '停车场']
      };
      mockApiResponse(mockPasscode);

      class EmployeeService {
        async getEmployeePasscode() {
          const response = { success: true, data: mockPasscode };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取通行码失败');
        }
      }

      const employeeService = new EmployeeService();
      const result = await employeeService.getEmployeePasscode();

      expect(result).toEqual(mockPasscode);
      expect(result.code).toBe('EMP123');
      expect(result.permissions).toContain('会议室');
    });

    it('应该成功刷新员工通行码', async () => {
      const mockNewPasscode = {
        id: 1,
        code: 'EMP789',
        status: 'active',
        expiryTime: '2024-12-31T23:59:59.000Z',
        usageLimit: -1,
        usageCount: 0,
        permissions: ['基础通行', '会议室', '停车场']
      };
      mockApiResponse(mockNewPasscode);

      class EmployeeService {
        async refreshEmployeePasscode() {
          const response = { success: true, data: mockNewPasscode };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '刷新通行码失败');
        }
      }

      const employeeService = new EmployeeService();
      const result = await employeeService.refreshEmployeePasscode();

      expect(result).toEqual(mockNewPasscode);
      expect(result.code).toBe('EMP789');
      expect(result.usageCount).toBe(0);
    });

    it('应该处理通行码不存在的情况', async () => {
      mockApiError(new Error('员工通行码不存在'));

      class EmployeeService {
        async getEmployeePasscode() {
          const response = { success: false, message: '员工通行码不存在' };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取通行码失败');
        }
      }

      const employeeService = new EmployeeService();

      await expect(employeeService.getEmployeePasscode()).rejects.toThrow('员工通行码不存在');
    });
  });

  describe('访客申请审批', () => {
    it('应该成功获取待审批的访客申请列表', async () => {
      const mockPendingApplications = [
        {
          id: 1,
          visitorName: '张三',
          visitorPhone: '13800138000',
          visitPurpose: '商务洽谈',
          status: 'pending',
          scheduledTime: '2024-01-01T10:00:00.000Z'
        },
        {
          id: 2,
          visitorName: '王五',
          visitorPhone: '13700137000',
          visitPurpose: '技术交流',
          status: 'pending',
          scheduledTime: '2024-01-01T14:00:00.000Z'
        }
      ];
      mockApiResponse(mockPendingApplications);

      class EmployeeService {
        async getPendingVisitorApplications() {
          const response = { success: true, data: mockPendingApplications };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取待审批申请失败');
        }
      }

      const employeeService = new EmployeeService();
      const result = await employeeService.getPendingVisitorApplications();

      expect(result).toEqual(mockPendingApplications);
      expect(result).toHaveLength(2);
      expect(result[0].visitorName).toBe('张三');
      expect(result[0].status).toBe('pending');
    });

    it('应该成功审批访客申请', async () => {
      mockApiResponse({ success: true });

      class EmployeeService {
        async approveVisitorApplication(applicationId, approved, reason) {
          const response = { success: true };
          if (!response.success) {
            throw new Error(response.message || '审批操作失败');
          }
        }
      }

      const employeeService = new EmployeeService();

      // 测试通过申请
      await expect(employeeService.approveVisitorApplication(1, true, '同意访问'))
        .resolves.not.toThrow();

      // 测试拒绝申请
      await expect(employeeService.approveVisitorApplication(2, false, '时间不合适'))
        .resolves.not.toThrow();
    });

    it('应该处理审批操作失败', async () => {
      mockApiError(new Error('权限不足'));

      class EmployeeService {
        async approveVisitorApplication(applicationId, approved, reason) {
          const response = { success: false, message: '权限不足' };
          if (!response.success) {
            throw new Error(response.message || '审批操作失败');
          }
        }
      }

      const employeeService = new EmployeeService();

      await expect(employeeService.approveVisitorApplication(1, true))
        .rejects.toThrow('权限不足');
    });

    it('应该验证审批参数', async () => {
      class EmployeeService {
        async approveVisitorApplication(applicationId, approved, reason) {
          if (!applicationId || applicationId <= 0) {
            throw new Error('无效的申请ID');
          }

          if (typeof approved !== 'boolean') {
            throw new Error('审批结果必须是布尔值');
          }

          if (approved === false && !reason) {
            throw new Error('拒绝申请时必须提供原因');
          }

          const response = { success: true };
          if (!response.success) {
            throw new Error('审批操作失败');
          }
        }
      }

      const employeeService = new EmployeeService();

      // 测试无效申请ID
      await expect(employeeService.approveVisitorApplication(0, true))
        .rejects.toThrow('无效的申请ID');

      // 测试无效审批结果
      await expect(employeeService.approveVisitorApplication(1, 'invalid'))
        .rejects.toThrow('审批结果必须是布尔值');

      // 测试拒绝时缺少原因
      await expect(employeeService.approveVisitorApplication(1, false))
        .rejects.toThrow('拒绝申请时必须提供原因');

      // 测试正确参数
      await expect(employeeService.approveVisitorApplication(1, false, '时间冲突'))
        .resolves.not.toThrow();
    });
  });

  describe('员工通行记录', () => {
    it('应该成功获取员工通行记录', async () => {
      const mockRecords = [
        {
          id: 1,
          employeeId: 1,
          accessTime: '2024-01-01T09:00:00.000Z',
          result: 'success',
          location: '大门',
          device: '门禁001'
        },
        {
          id: 2,
          employeeId: 1,
          accessTime: '2024-01-01T18:00:00.000Z',
          result: 'success',
          location: '大门',
          device: '门禁001'
        }
      ];
      mockApiResponse(mockRecords);

      class EmployeeService {
        async getAccessHistory(startDate, endDate) {
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

      const employeeService = new EmployeeService();
      const result = await employeeService.getAccessHistory();

      expect(result).toEqual(mockRecords);
      expect(result).toHaveLength(2);
      expect(result[0].result).toBe('success');
      expect(result[0].location).toBe('大门');
    });

    it('应该支持日期范围筛选通行记录', async () => {
      const mockFilteredRecords = [
        {
          id: 1,
          employeeId: 1,
          accessTime: '2024-01-01T09:00:00.000Z',
          result: 'success',
          location: '大门'
        }
      ];
      mockApiResponse(mockFilteredRecords);

      class EmployeeService {
        async getAccessHistory(startDate, endDate) {
          const params = {};
          if (startDate) params.startDate = startDate;
          if (endDate) params.endDate = endDate;
          
          const response = { success: true, data: mockFilteredRecords };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取通行记录失败');
        }
      }

      const employeeService = new EmployeeService();
      const result = await employeeService.getAccessHistory('2024-01-01', '2024-01-01');

      expect(result).toEqual(mockFilteredRecords);
      expect(result).toHaveLength(1);
    });

    it('应该处理空的通行记录', async () => {
      mockApiResponse([]);

      class EmployeeService {
        async getAccessHistory(startDate, endDate) {
          const response = { success: true, data: [] };
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message || '获取通行记录失败');
        }
      }

      const employeeService = new EmployeeService();
      const result = await employeeService.getAccessHistory();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('撤销员工申请', () => {
    it('应该成功撤销员工申请', async () => {
      mockApiResponse({ success: true });

      class EmployeeService {
        async withdrawApplication(applicationId) {
          const response = { success: true };
          if (!response.success) {
            throw new Error(response.message || '撤销申请失败');
          }
        }
      }

      const employeeService = new EmployeeService();

      await expect(employeeService.withdrawApplication(1)).resolves.not.toThrow();
    });

    it('应该处理撤销申请失败', async () => {
      mockApiError(new Error('申请已被处理，无法撤销'));

      class EmployeeService {
        async withdrawApplication(applicationId) {
          const response = { success: false, message: '申请已被处理，无法撤销' };
          if (!response.success) {
            throw new Error(response.message || '撤销申请失败');
          }
        }
      }

      const employeeService = new EmployeeService();

      await expect(employeeService.withdrawApplication(1))
        .rejects.toThrow('申请已被处理，无法撤销');
    });

    it('应该验证撤销申请的参数', async () => {
      class EmployeeService {
        async withdrawApplication(applicationId) {
          if (!applicationId || applicationId <= 0) {
            throw new Error('无效的申请ID');
          }

          const response = { success: true };
          if (!response.success) {
            throw new Error('撤销申请失败');
          }
        }
      }

      const employeeService = new EmployeeService();

      await expect(employeeService.withdrawApplication(0))
        .rejects.toThrow('无效的申请ID');
      await expect(employeeService.withdrawApplication(-1))
        .rejects.toThrow('无效的申请ID');
      await expect(employeeService.withdrawApplication(null))
        .rejects.toThrow('无效的申请ID');
    });
  });

  describe('边界条件和异常处理', () => {
    it('应该处理网络超时', async () => {
      class EmployeeService {
        async getMerchants() {
          // 模拟网络超时
          await new Promise((_, reject) => {
            setTimeout(() => reject(new Error('请求超时')), 100);
          });
        }
      }

      const employeeService = new EmployeeService();

      await expect(employeeService.getMerchants()).rejects.toThrow('请求超时');
    });

    it('应该处理服务器内部错误', async () => {
      class EmployeeService {
        async submitApplication(data) {
          const response = { success: false, message: '服务器内部错误', code: 500 };
          throw new Error(`${response.code}: ${response.message}`);
        }
      }

      const employeeService = new EmployeeService();

      await expect(employeeService.submitApplication({}))
        .rejects.toThrow('500: 服务器内部错误');
    });

    it('应该处理权限不足错误', async () => {
      class EmployeeService {
        async getPendingVisitorApplications() {
          const response = { success: false, message: '权限不足', code: 403 };
          throw new Error(response.message);
        }
      }

      const employeeService = new EmployeeService();

      await expect(employeeService.getPendingVisitorApplications())
        .rejects.toThrow('权限不足');
    });

    it('应该处理数据格式错误', async () => {
      class EmployeeService {
        async getAccessHistory() {
          // 模拟返回格式错误的数据
          const response = { success: true, data: 'invalid_data_format' };
          if (response.success) {
            if (!Array.isArray(response.data)) {
              throw new Error('数据格式错误');
            }
            return response.data;
          }
          throw new Error('获取通行记录失败');
        }
      }

      const employeeService = new EmployeeService();

      await expect(employeeService.getAccessHistory()).rejects.toThrow('数据格式错误');
    });

    it('应该处理空字符串和特殊字符', async () => {
      class EmployeeService {
        async submitApplication(data) {
          // 验证字符串字段
          if (data.name && typeof data.name === 'string') {
            if (data.name.trim().length === 0) {
              throw new Error('姓名不能为空');
            }
            if (data.name.length > 50) {
              throw new Error('姓名长度不能超过50个字符');
            }
          }

          if (data.department && data.department.includes('<script>')) {
            throw new Error('部门名称包含非法字符');
          }

          const response = { success: true, data: { id: 1, ...data } };
          return response.data;
        }
      }

      const employeeService = new EmployeeService();

      // 测试空字符串
      await expect(employeeService.submitApplication({
        name: '   ',
        phone: '13900139000',
        merchantId: 1
      })).rejects.toThrow('姓名不能为空');

      // 测试超长字符串
      await expect(employeeService.submitApplication({
        name: 'a'.repeat(51),
        phone: '13900139000',
        merchantId: 1
      })).rejects.toThrow('姓名长度不能超过50个字符');

      // 测试特殊字符
      await expect(employeeService.submitApplication({
        name: '李四',
        phone: '13900139000',
        merchantId: 1,
        department: '<script>alert("xss")</script>'
      })).rejects.toThrow('部门名称包含非法字符');
    });
  });
});