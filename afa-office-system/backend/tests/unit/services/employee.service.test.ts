import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EmployeeService } from '../../../src/services/employee.service.js';

// Mock 依赖 - 使用工厂函数避免hoisting问题
vi.mock('../../../src/models/user.model.js', () => ({
  UserModel: {
    create: vi.fn(),
    findById: vi.fn(),
    findByPhone: vi.fn(),
    findByOpenId: vi.fn(),
    update: vi.fn(),
    validateUserData: vi.fn(),
    phoneExists: vi.fn(),
    openIdExists: vi.fn(),
    softDelete: vi.fn(),
    count: vi.fn(),
    findAll: vi.fn(),
  }
}));

vi.mock('../../../src/models/merchant.model.js', () => ({
  MerchantModel: {
    findById: vi.fn()
  }
}));

vi.mock('../../../src/services/permission.service.js', () => ({
  PermissionService: vi.fn().mockImplementation(() => ({
    validatePermission: vi.fn(),
    assignPermissions: vi.fn(),
    getUserPermissions: vi.fn()
  }))
}));

// Import the mocked modules
import { UserModel } from '../../../src/models/user.model.js';
import { MerchantModel } from '../../../src/models/merchant.model.js';

describe('EmployeeService', () => {
  let employeeService: EmployeeService;

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();
    employeeService = new EmployeeService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createEmployee', () => {
    const mockMerchant = {
      id: 1,
      name: '测试商户',
      status: 'active'
    };

    const mockEmployeeData = {
      name: '张三',
      phone: '13800138000',
      user_type: 'employee' as const
    };

    it('应该成功创建员工', async () => {
      // 准备 mock 数据
      vi.mocked(MerchantModel.findById).mockResolvedValue(mockMerchant);
      vi.mocked(UserModel.validateUserData).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(UserModel.findByPhone).mockResolvedValue(null);
      vi.mocked(UserModel.create).mockResolvedValue(1);
      vi.mocked(UserModel.findById).mockResolvedValue({
        id: 1,
        name: '张三',
        phone: '13800138000',
        user_type: 'employee',
        merchant_id: 1
      });

      // 执行测试
      const result = await employeeService.createEmployee(1, mockEmployeeData);

      // 验证结果
      expect(result).toEqual({
        id: 1,
        name: '张三',
        phone: '13800138000',
        user_type: 'employee',
        merchant_id: 1
      });

      // 验证调用
      expect(MerchantModel.findById).toHaveBeenCalledWith(1);
      expect(UserModel.validateUserData).toHaveBeenCalled();
      expect(UserModel.findByPhone).toHaveBeenCalledWith('13800138000');
      expect(UserModel.create).toHaveBeenCalled();
    });

    it('应该在商户不存在时抛出错误', async () => {
      vi.mocked(MerchantModel.findById).mockResolvedValue(null);

      await expect(
        employeeService.createEmployee(1, mockEmployeeData)
      ).rejects.toThrow('商户不存在');
    });

    it('应该在商户状态异常时抛出错误', async () => {
      vi.mocked(MerchantModel.findById).mockResolvedValue({
        ...mockMerchant,
        status: 'inactive'
      });

      await expect(
        employeeService.createEmployee(1, mockEmployeeData)
      ).rejects.toThrow('商户状态异常，无法添加员工');
    });

    it('应该在数据验证失败时抛出错误', async () => {
      vi.mocked(MerchantModel.findById).mockResolvedValue(mockMerchant);
      vi.mocked(UserModel.validateUserData).mockReturnValue({
        isValid: false,
        errors: ['姓名不能为空']
      });

      await expect(
        employeeService.createEmployee(1, mockEmployeeData)
      ).rejects.toThrow('数据验证失败: 姓名不能为空');
    });

    it('应该在手机号已存在时抛出错误', async () => {
      vi.mocked(MerchantModel.findById).mockResolvedValue(mockMerchant);
      vi.mocked(UserModel.validateUserData).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(UserModel.findByPhone).mockResolvedValue({ id: 2 });

      await expect(
        employeeService.createEmployee(1, mockEmployeeData)
      ).rejects.toThrow('手机号已被使用');
    });
  });

  describe('getEmployees', () => {
    const mockMerchant = {
      id: 1,
      name: '测试商户',
      status: 'active'
    };

    it('应该成功获取员工列表', async () => {
      const mockEmployees = [
        { id: 1, name: '张三', user_type: 'employee', merchant_id: 1 },
        { id: 2, name: '李四', user_type: 'employee', merchant_id: 1 }
      ];

      vi.mocked(MerchantModel.findById).mockResolvedValue(mockMerchant);
      vi.mocked(UserModel.findAll).mockResolvedValue(mockEmployees);
      vi.mocked(UserModel.count).mockResolvedValue(2);

      const result = await employeeService.getEmployees(1, {
        page: 1,
        limit: 10
      });

      expect(result).toEqual({
        data: mockEmployees,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        }
      });

      expect(MerchantModel.findById).toHaveBeenCalledWith(1);
      expect(UserModel.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        merchantId: 1,
        userType: 'employee'
      });
    });

    it('应该在商户不存在时抛出错误', async () => {
      vi.mocked(MerchantModel.findById).mockResolvedValue(null);

      await expect(
        employeeService.getEmployees(1)
      ).rejects.toThrow('商户不存在');
    });
  });

  describe('updateEmployee', () => {
    const mockMerchant = {
      id: 1,
      name: '测试商户',
      status: 'active'
    };

    const mockEmployee = {
      id: 1,
      name: '张三',
      phone: '13800138000',
      user_type: 'employee',
      merchant_id: 1
    };

    it('应该成功更新员工信息', async () => {
      const updateData = { name: '张三三' };
      const updatedEmployee = { ...mockEmployee, name: '张三三' };

      vi.mocked(MerchantModel.findById).mockResolvedValue(mockMerchant);
      vi.mocked(UserModel.findById).mockResolvedValue(mockEmployee);
      vi.mocked(UserModel.phoneExists).mockResolvedValue(false);
      vi.mocked(UserModel.validateUserData).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(UserModel.update).mockResolvedValue(updatedEmployee);

      const result = await employeeService.updateEmployee(1, 1, updateData);

      expect(result).toEqual(updatedEmployee);
      expect(UserModel.update).toHaveBeenCalledWith(1, updateData);
    });

    it('应该在员工不属于该商户时抛出错误', async () => {
      vi.mocked(MerchantModel.findById).mockResolvedValue(mockMerchant);
      vi.mocked(UserModel.findById).mockResolvedValue({
        ...mockEmployee,
        merchant_id: 2 // 不同的商户ID
      });

      await expect(
        employeeService.updateEmployee(1, 1, { name: '新名字' })
      ).rejects.toThrow('员工不属于该商户');
    });
  });

  describe('deleteEmployee', () => {
    const mockMerchant = {
      id: 1,
      name: '测试商户',
      status: 'active'
    };

    const mockEmployee = {
      id: 1,
      name: '张三',
      merchant_id: 1
    };

    it('应该成功删除员工', async () => {
      vi.mocked(MerchantModel.findById).mockResolvedValue(mockMerchant);
      vi.mocked(UserModel.findById).mockResolvedValue(mockEmployee);
      vi.mocked(UserModel.softDelete).mockResolvedValue(true);

      const result = await employeeService.deleteEmployee(1, 1);

      expect(result).toBe(true);
      expect(UserModel.softDelete).toHaveBeenCalledWith(1);
    });
  });

  describe('batchCreateEmployees', () => {
    const mockMerchant = {
      id: 1,
      name: '测试商户',
      status: 'active'
    };

    it('应该成功批量创建员工', async () => {
      const employeesData = [
        { name: '张三', phone: '13800138001' },
        { name: '李四', phone: '13800138002' }
      ];

      vi.mocked(MerchantModel.findById).mockResolvedValue(mockMerchant);
      
      // Mock 第一个员工创建成功
      vi.mocked(UserModel.validateUserData).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(UserModel.findByPhone)
        .mockResolvedValueOnce(null) // 第一个手机号不存在
        .mockResolvedValueOnce(null); // 第二个手机号不存在
      vi.mocked(UserModel.create)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2);
      vi.mocked(UserModel.findById)
        .mockResolvedValueOnce({ id: 1, name: '张三', phone: '13800138001' })
        .mockResolvedValueOnce({ id: 2, name: '李四', phone: '13800138002' });

      const result = await employeeService.batchCreateEmployees(1, employeesData);

      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });
  });

  describe('validateImportData', () => {
    it('应该正确验证导入数据', () => {
      const validData = [
        { name: '张三', phone: '13800138001', user_type: 'employee' },
        { name: '李四', phone: '13800138002' }
      ];

      const invalidData = [
        { name: '', phone: '13800138003' }, // 姓名为空
        { name: '王五', phone: '123' } // 手机号格式错误
      ];

      const allData = [...validData, ...invalidData];

      const result = employeeService.validateImportData(allData);

      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(2);
      expect(result.invalid[0].errors).toContain('姓名不能为空');
      expect(result.invalid[1].errors).toContain('手机号格式无效');
    });
  });

  describe('getEmployeeStats', () => {
    const mockMerchant = {
      id: 1,
      name: '测试商户',
      status: 'active'
    };

    it('应该成功获取员工统计信息', async () => {
      vi.mocked(MerchantModel.findById).mockResolvedValue(mockMerchant);
      vi.mocked(UserModel.count)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8)  // active
        .mockResolvedValueOnce(1)  // inactive
        .mockResolvedValueOnce(1)  // pending
        .mockResolvedValueOnce(9)  // employees
        .mockResolvedValueOnce(1); // admins

      const result = await employeeService.getEmployeeStats(1);

      expect(result).toEqual({
        total: 10,
        active: 8,
        inactive: 1,
        pending: 1,
        byType: {
          employee: 9,
          merchant_admin: 1
        }
      });
    });
  });
});