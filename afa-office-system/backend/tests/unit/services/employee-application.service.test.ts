import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmployeeApplicationService } from '../../../src/services/employee-application.service.js';
import { EmployeeApplicationModel } from '../../../src/models/employee-application.model.js';
import { UserModel } from '../../../src/models/user.model.js';
import { MerchantModel } from '../../../src/models/merchant.model.js';
import { EmployeeService } from '../../../src/services/employee.service.js';

// Mock 依赖
vi.mock('../../../src/models/employee-application.model.js');
vi.mock('../../../src/models/user.model.js');
vi.mock('../../../src/models/merchant.model.js');
vi.mock('../../../src/services/employee.service.js');

describe('EmployeeApplicationService', () => {
  let employeeApplicationService: EmployeeApplicationService;
  let mockEmployeeApplicationModel: any;
  let mockUserModel: any;
  let mockMerchantModel: any;
  let mockEmployeeService: any;

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();

    // 创建 mock 实例
    mockEmployeeApplicationModel = {
      create: vi.fn(),
      findById: vi.fn(),
      findByApplicantId: vi.fn(),
      findByMerchantId: vi.fn(),
      updateStatus: vi.fn(),
      existsByApplicantAndMerchant: vi.fn(),
      getStats: vi.fn(),
      delete: vi.fn()
    };

    mockUserModel = {
      findById: vi.fn(),
      update: vi.fn()
    };

    mockMerchantModel = {
      findById: vi.fn()
    };

    mockEmployeeService = {
      createEmployee: vi.fn()
    };

    // Mock 构造函数
    vi.mocked(EmployeeApplicationModel).mockImplementation(() => mockEmployeeApplicationModel);
    vi.mocked(UserModel).mockImplementation(() => mockUserModel);
    vi.mocked(MerchantModel).mockImplementation(() => mockMerchantModel);
    vi.mocked(EmployeeService).mockImplementation(() => mockEmployeeService);

    employeeApplicationService = new EmployeeApplicationService();
  });

  describe('submitApplication', () => {
    it('应该成功提交员工申请', async () => {
      const applicantId = 1;
      const applicationData = {
        merchantId: 1,
        name: '张三',
        phone: '13800138000',
        department: '技术部',
        position: '开发工程师'
      };

      const mockApplicant = {
        id: 1,
        name: '张三',
        user_type: 'visitor'
      };

      const mockMerchant = {
        id: 1,
        name: '测试商户',
        status: 'active'
      };

      const mockApplication = {
        id: 1,
        applicantId: 1,
        merchantId: 1,
        name: '张三',
        phone: '13800138000',
        department: '技术部',
        position: '开发工程师',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockUserModel.findById.mockResolvedValue(mockApplicant);
      mockMerchantModel.findById.mockResolvedValue(mockMerchant);
      mockEmployeeApplicationModel.existsByApplicantAndMerchant.mockResolvedValue(false);
      mockEmployeeApplicationModel.create.mockResolvedValue(mockApplication);

      const result = await employeeApplicationService.submitApplication(applicantId, applicationData);

      expect(mockUserModel.findById).toHaveBeenCalledWith(applicantId);
      expect(mockMerchantModel.findById).toHaveBeenCalledWith(applicationData.merchantId);
      expect(mockEmployeeApplicationModel.existsByApplicantAndMerchant).toHaveBeenCalledWith(applicantId, applicationData.merchantId);
      expect(mockEmployeeApplicationModel.create).toHaveBeenCalledWith({
        applicantId,
        ...applicationData
      });
      expect(result).toEqual(mockApplication);
    });

    it('应该在申请人不存在时抛出错误', async () => {
      const applicantId = 999;
      const applicationData = {
        merchantId: 1,
        name: '张三',
        phone: '13800138000'
      };

      mockUserModel.findById.mockResolvedValue(null);

      await expect(employeeApplicationService.submitApplication(applicantId, applicationData))
        .rejects.toThrow('申请人不存在');
    });

    it('应该在商户不存在时抛出错误', async () => {
      const applicantId = 1;
      const applicationData = {
        merchantId: 999,
        name: '张三',
        phone: '13800138000'
      };

      const mockApplicant = { id: 1, name: '张三' };
      mockUserModel.findById.mockResolvedValue(mockApplicant);
      mockMerchantModel.findById.mockResolvedValue(null);

      await expect(employeeApplicationService.submitApplication(applicantId, applicationData))
        .rejects.toThrow('目标商户不存在');
    });

    it('应该在商户状态异常时抛出错误', async () => {
      const applicantId = 1;
      const applicationData = {
        merchantId: 1,
        name: '张三',
        phone: '13800138000'
      };

      const mockApplicant = { id: 1, name: '张三' };
      const mockMerchant = { id: 1, name: '测试商户', status: 'inactive' };

      mockUserModel.findById.mockResolvedValue(mockApplicant);
      mockMerchantModel.findById.mockResolvedValue(mockMerchant);

      await expect(employeeApplicationService.submitApplication(applicantId, applicationData))
        .rejects.toThrow('目标商户状态异常，无法申请');
    });

    it('应该在已存在申请时抛出错误', async () => {
      const applicantId = 1;
      const applicationData = {
        merchantId: 1,
        name: '张三',
        phone: '13800138000'
      };

      const mockApplicant = { id: 1, name: '张三' };
      const mockMerchant = { id: 1, name: '测试商户', status: 'active' };

      mockUserModel.findById.mockResolvedValue(mockApplicant);
      mockMerchantModel.findById.mockResolvedValue(mockMerchant);
      mockEmployeeApplicationModel.existsByApplicantAndMerchant.mockResolvedValue(true);

      await expect(employeeApplicationService.submitApplication(applicantId, applicationData))
        .rejects.toThrow('您已向该商户提交过申请，请勿重复申请');
    });

    it('应该在手机号格式不正确时抛出错误', async () => {
      const applicantId = 1;
      const applicationData = {
        merchantId: 1,
        name: '张三',
        phone: '123456789', // 无效手机号
        department: '技术部',
        position: '开发工程师'
      };

      const mockApplicant = { id: 1, name: '张三' };
      const mockMerchant = { id: 1, name: '测试商户', status: 'active' };

      mockUserModel.findById.mockResolvedValue(mockApplicant);
      mockMerchantModel.findById.mockResolvedValue(mockMerchant);
      mockEmployeeApplicationModel.existsByApplicantAndMerchant.mockResolvedValue(false);

      await expect(employeeApplicationService.submitApplication(applicantId, applicationData))
        .rejects.toThrow('手机号格式不正确');
    });
  });

  describe('approveApplication', () => {
    it('应该成功审批通过申请', async () => {
      const applicationId = 1;
      const approvedBy = 2;
      const approved = true;

      const mockApplication = {
        id: 1,
        applicantId: 1,
        merchantId: 1,
        name: '张三',
        phone: '13800138000',
        status: 'pending'
      };

      const mockApprover = {
        id: 2,
        userType: 'merchant_admin',
        merchantId: 1
      };

      const mockUpdatedApplication = {
        ...mockApplication,
        status: 'approved',
        approvedBy: 2,
        approvedAt: '2024-01-01T00:00:00Z'
      };

      const mockApplicant = {
        id: 1,
        name: '张三',
        userType: 'visitor'
      };

      mockEmployeeApplicationModel.findById.mockResolvedValue(mockApplication);
      mockUserModel.findById.mockResolvedValue(mockApprover);
      mockEmployeeApplicationModel.updateStatus.mockResolvedValue(mockUpdatedApplication);
      mockUserModel.findById.mockResolvedValueOnce(mockApprover).mockResolvedValueOnce(mockApplicant);
      mockUserModel.update.mockResolvedValue(true);
      mockEmployeeService.createEmployee.mockResolvedValue(true);

      const result = await employeeApplicationService.approveApplication(applicationId, approvedBy, approved);

      expect(mockEmployeeApplicationModel.findById).toHaveBeenCalledWith(applicationId);
      expect(mockUserModel.findById).toHaveBeenCalledWith(approvedBy);
      expect(mockEmployeeApplicationModel.updateStatus).toHaveBeenCalledWith(applicationId, 'approved', approvedBy, undefined);
      expect(result).toEqual(mockUpdatedApplication);
    });

    it('应该在申请已被处理时抛出错误', async () => {
      const applicationId = 1;
      const approvedBy = 2;
      const approved = true;

      const mockApplication = {
        id: 1,
        status: 'approved' // 已被处理
      };

      mockEmployeeApplicationModel.findById.mockResolvedValue(mockApplication);

      await expect(employeeApplicationService.approveApplication(applicationId, approvedBy, approved))
        .rejects.toThrow('申请已被处理，无法重复操作');
    });

    it('应该在审批人权限不足时抛出错误', async () => {
      const applicationId = 1;
      const approvedBy = 2;
      const approved = true;

      const mockApplication = {
        id: 1,
        merchantId: 1,
        status: 'pending'
      };

      const mockApprover = {
        id: 2,
        userType: 'employee', // 权限不足
        merchantId: 2 // 不同商户
      };

      mockEmployeeApplicationModel.findById.mockResolvedValue(mockApplication);
      mockUserModel.findById.mockResolvedValue(mockApprover);

      await expect(employeeApplicationService.approveApplication(applicationId, approvedBy, approved))
        .rejects.toThrow('您没有权限审批此申请');
    });
  });

  describe('getMyApplication', () => {
    it('应该成功获取用户的申请记录', async () => {
      const applicantId = 1;
      const mockApplication = {
        id: 1,
        applicantId: 1,
        merchantId: 1,
        name: '张三',
        status: 'pending'
      };

      mockEmployeeApplicationModel.findByApplicantId.mockResolvedValue(mockApplication);

      const result = await employeeApplicationService.getMyApplication(applicantId);

      expect(mockEmployeeApplicationModel.findByApplicantId).toHaveBeenCalledWith(applicantId);
      expect(result).toEqual(mockApplication);
    });

    it('应该在没有申请记录时返回null', async () => {
      const applicantId = 1;

      mockEmployeeApplicationModel.findByApplicantId.mockResolvedValue(null);

      const result = await employeeApplicationService.getMyApplication(applicantId);

      expect(result).toBeNull();
    });
  });

  describe('getMerchantApplications', () => {
    it('应该成功获取商户的申请列表', async () => {
      const merchantId = 1;
      const options = { status: 'pending' as const, page: 1, limit: 10 };

      const mockMerchant = { id: 1, name: '测试商户' };
      const mockResult = {
        applications: [
          { id: 1, name: '张三', status: 'pending' },
          { id: 2, name: '李四', status: 'pending' }
        ],
        total: 2,
        page: 1,
        limit: 10
      };

      mockMerchantModel.findById.mockResolvedValue(mockMerchant);
      mockEmployeeApplicationModel.findByMerchantId.mockResolvedValue(mockResult);

      const result = await employeeApplicationService.getMerchantApplications(merchantId, options);

      expect(mockMerchantModel.findById).toHaveBeenCalledWith(merchantId);
      expect(mockEmployeeApplicationModel.findByMerchantId).toHaveBeenCalledWith(merchantId, options);
      expect(result).toEqual(mockResult);
    });

    it('应该在商户不存在时抛出错误', async () => {
      const merchantId = 999;

      mockMerchantModel.findById.mockResolvedValue(null);

      await expect(employeeApplicationService.getMerchantApplications(merchantId))
        .rejects.toThrow('商户不存在');
    });
  });
});