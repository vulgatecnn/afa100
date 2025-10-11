import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response } from 'express';
import type { CreateMerchantData, UpdateMerchantData } from '../../../src/types/index.js';

// Mock dependencies
const mockMerchantService = {
  getMerchants: vi.fn(),
  getMerchantById: vi.fn(),
  getMerchantByCode: vi.fn(),
  createMerchant: vi.fn(),
  updateMerchant: vi.fn(),
  deleteMerchant: vi.fn(),
  updateMerchantStatus: vi.fn(),
  hasEmployees: vi.fn(),
  getMerchantPermissions: vi.fn(),
  assignPermissions: vi.fn(),
  removePermissions: vi.fn(),
  getMerchantStats: vi.fn(),
};

// Mock the service
vi.mock('../../../src/services/merchant.service.js', () => ({
  MerchantService: class MockMerchantService {
    getMerchants = mockMerchantService.getMerchants;
    getMerchantById = mockMerchantService.getMerchantById;
    getMerchantByCode = mockMerchantService.getMerchantByCode;
    createMerchant = mockMerchantService.createMerchant;
    updateMerchant = mockMerchantService.updateMerchant;
    deleteMerchant = mockMerchantService.deleteMerchant;
    updateMerchantStatus = mockMerchantService.updateMerchantStatus;
    hasEmployees = mockMerchantService.hasEmployees;
    getMerchantPermissions = mockMerchantService.getMerchantPermissions;
    assignPermissions = mockMerchantService.assignPermissions;
    removePermissions = mockMerchantService.removePermissions;
    getMerchantStats = mockMerchantService.getMerchantStats;
  }
}));

// Import after mocking
const { MerchantController } = await import('../../../src/controllers/merchant.controller.js');

describe('MerchantController', () => {
  let merchantController: MerchantController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  const mockMerchant = {
    id: 1,
    name: '测试商户',
    code: 'TEST_MERCHANT',
    contact: '张三',
    phone: '13800138000',
    email: 'test@example.com',
    address: '测试地址',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    merchantController = new MerchantController();
    
    mockReq = {
      params: {},
      query: {},
      body: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMerchants', () => {
    it('应该成功获取商户列表', async () => {
      const mockResult = {
        data: [mockMerchant],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockReq.query = { page: '1', limit: '10' };
      mockMerchantService.getMerchants.mockResolvedValue(mockResult);

      await merchantController.getMerchants(mockReq as Request, mockRes as Response);

      expect(mockMerchantService.getMerchants).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: undefined,
        search: undefined,
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '获取商户列表成功',
        data: mockResult,
        timestamp: expect.any(String),
      });
    });

    it('应该支持筛选和搜索参数', async () => {
      const mockResult = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };

      mockReq.query = {
        page: '1',
        limit: '10',
        status: 'active',
        search: '测试',
      };

      mockMerchantService.getMerchants.mockResolvedValue(mockResult);

      await merchantController.getMerchants(mockReq as Request, mockRes as Response);

      expect(mockMerchantService.getMerchants).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: 'active',
        search: '测试',
      });
    });
  });

  describe('getMerchantById', () => {
    it('应该成功获取商户详情', async () => {
      mockReq.params = { id: '1' };
      mockMerchantService.getMerchantById.mockResolvedValue(mockMerchant);

      await merchantController.getMerchantById(mockReq as Request, mockRes as Response);

      expect(mockMerchantService.getMerchantById).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '获取商户详情成功',
        data: { merchant: mockMerchant },
        timestamp: expect.any(String),
      });
    });

    it('应该在缺少ID时抛出错误', async () => {
      mockReq.params = {};

      await expect(
        merchantController.getMerchantById(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('商户ID不能为空');
    });

    it('应该在商户不存在时抛出错误', async () => {
      mockReq.params = { id: '999' };
      mockMerchantService.getMerchantById.mockResolvedValue(null);

      await expect(
        merchantController.getMerchantById(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('商户不存在');
    });
  });

  describe('createMerchant', () => {
    it('应该成功创建商户', async () => {
      const merchantData: CreateMerchantData = {
        name: '新商户',
        code: 'NEW_MERCHANT',
        contact: '李四',
        phone: '13800138001',
        email: 'new@example.com',
        address: '新地址',
      };

      mockReq.body = merchantData;
      mockMerchantService.getMerchantByCode.mockResolvedValue(null);
      mockMerchantService.createMerchant.mockResolvedValue(mockMerchant);

      await merchantController.createMerchant(mockReq as Request, mockRes as Response);

      expect(mockMerchantService.getMerchantByCode).toHaveBeenCalledWith(merchantData.code);
      expect(mockMerchantService.createMerchant).toHaveBeenCalledWith(merchantData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '创建商户成功',
        data: { merchant: mockMerchant },
        timestamp: expect.any(String),
      });
    });

    it('应该在缺少必填字段时抛出错误', async () => {
      mockReq.body = { name: '商户名' }; // 缺少 code

      await expect(
        merchantController.createMerchant(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('商户名称和编码不能为空');
    });

    it('应该在商户编码已存在时抛出错误', async () => {
      const merchantData = {
        name: '新商户',
        code: 'EXISTING_CODE',
      };

      mockReq.body = merchantData;
      mockMerchantService.getMerchantByCode.mockResolvedValue(mockMerchant);

      await expect(
        merchantController.createMerchant(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('商户编码已存在');
    });
  });

  describe('updateMerchant', () => {
    it('应该成功更新商户信息', async () => {
      const updateData: UpdateMerchantData = {
        name: '更新后的商户名',
        contact: '王五',
      };

      mockReq.params = { id: '1' };
      mockReq.body = updateData;
      mockMerchantService.getMerchantById.mockResolvedValue(mockMerchant);
      mockMerchantService.updateMerchant.mockResolvedValue({
        ...mockMerchant,
        ...updateData,
      });

      await merchantController.updateMerchant(mockReq as Request, mockRes as Response);

      expect(mockMerchantService.getMerchantById).toHaveBeenCalledWith(1);
      expect(mockMerchantService.updateMerchant).toHaveBeenCalledWith(1, updateData);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '更新商户信息成功',
        data: { merchant: { ...mockMerchant, ...updateData } },
        timestamp: expect.any(String),
      });
    });

    it('应该在缺少ID时抛出错误', async () => {
      mockReq.params = {};
      mockReq.body = { name: '新名称' };

      await expect(
        merchantController.updateMerchant(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('商户ID不能为空');
    });

    it('应该在商户不存在时抛出错误', async () => {
      mockReq.params = { id: '999' };
      mockReq.body = { name: '新名称' };
      mockMerchantService.getMerchantById.mockResolvedValue(null);

      await expect(
        merchantController.updateMerchant(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('商户不存在');
    });

    it('应该检查更新的编码是否已被其他商户使用', async () => {
      const updateData = { code: 'NEW_CODE' };
      const existingMerchantWithCode = { ...mockMerchant, id: 2 };

      mockReq.params = { id: '1' };
      mockReq.body = updateData;
      mockMerchantService.getMerchantById.mockResolvedValue(mockMerchant);
      mockMerchantService.getMerchantByCode.mockResolvedValue(existingMerchantWithCode);

      await expect(
        merchantController.updateMerchant(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('商户编码已存在');
    });
  });

  describe('deleteMerchant', () => {
    it('应该成功删除商户', async () => {
      mockReq.params = { id: '1' };
      mockMerchantService.getMerchantById.mockResolvedValue(mockMerchant);
      mockMerchantService.hasEmployees.mockResolvedValue(false);
      mockMerchantService.deleteMerchant.mockResolvedValue(undefined);

      await merchantController.deleteMerchant(mockReq as Request, mockRes as Response);

      expect(mockMerchantService.getMerchantById).toHaveBeenCalledWith(1);
      expect(mockMerchantService.hasEmployees).toHaveBeenCalledWith(1);
      expect(mockMerchantService.deleteMerchant).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '删除商户成功',
        timestamp: expect.any(String),
      });
    });

    it('应该在缺少ID时抛出错误', async () => {
      mockReq.params = {};

      await expect(
        merchantController.deleteMerchant(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('商户ID不能为空');
    });

    it('应该在商户不存在时抛出错误', async () => {
      mockReq.params = { id: '999' };
      mockMerchantService.getMerchantById.mockResolvedValue(null);

      await expect(
        merchantController.deleteMerchant(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('商户不存在');
    });

    it('应该在商户有员工时拒绝删除', async () => {
      mockReq.params = { id: '1' };
      mockMerchantService.getMerchantById.mockResolvedValue(mockMerchant);
      mockMerchantService.hasEmployees.mockResolvedValue(true);

      await expect(
        merchantController.deleteMerchant(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('商户下存在员工，无法删除');
    });
  });

  describe('enableMerchant', () => {
    it('应该成功启用商户', async () => {
      const enabledMerchant = { ...mockMerchant, status: 'active' };

      mockReq.params = { id: '1' };
      mockMerchantService.updateMerchantStatus.mockResolvedValue(enabledMerchant);

      await merchantController.enableMerchant(mockReq as Request, mockRes as Response);

      expect(mockMerchantService.updateMerchantStatus).toHaveBeenCalledWith(1, 'active');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '启用商户成功',
        data: { merchant: enabledMerchant },
        timestamp: expect.any(String),
      });
    });

    it('应该在缺少ID时抛出错误', async () => {
      mockReq.params = {};

      await expect(
        merchantController.enableMerchant(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('商户ID不能为空');
    });
  });

  describe('disableMerchant', () => {
    it('应该成功停用商户', async () => {
      const disabledMerchant = { ...mockMerchant, status: 'inactive' };

      mockReq.params = { id: '1' };
      mockMerchantService.updateMerchantStatus.mockResolvedValue(disabledMerchant);

      await merchantController.disableMerchant(mockReq as Request, mockRes as Response);

      expect(mockMerchantService.updateMerchantStatus).toHaveBeenCalledWith(1, 'inactive');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '停用商户成功，已自动停用该商户下所有员工权限',
        data: { merchant: disabledMerchant },
        timestamp: expect.any(String),
      });
    });
  });

  describe('getMerchantPermissions', () => {
    it('应该成功获取商户权限', async () => {
      const mockPermissions = [
        { id: 1, code: 'perm1', name: '权限1', assigned_at: '2024-01-01T00:00:00Z' },
        { id: 2, code: 'perm2', name: '权限2', assigned_at: '2024-01-01T00:00:00Z' },
      ];

      mockReq.params = { id: '1' };
      mockMerchantService.getMerchantPermissions.mockResolvedValue(mockPermissions);

      await merchantController.getMerchantPermissions(mockReq as Request, mockRes as Response);

      expect(mockMerchantService.getMerchantPermissions).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '获取商户权限成功',
        data: { permissions: mockPermissions },
        timestamp: expect.any(String),
      });
    });

    it('应该在缺少ID时抛出错误', async () => {
      mockReq.params = {};

      await expect(
        merchantController.getMerchantPermissions(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('商户ID不能为空');
    });
  });

  describe('assignMerchantPermissions', () => {
    it('应该成功分配商户权限', async () => {
      const permissionIds = [1, 2, 3];

      mockReq.params = { id: '1' };
      mockReq.body = { permissionIds };
      mockMerchantService.getMerchantById.mockResolvedValue(mockMerchant);
      mockMerchantService.assignPermissions.mockResolvedValue(undefined);

      await merchantController.assignMerchantPermissions(mockReq as Request, mockRes as Response);

      expect(mockMerchantService.getMerchantById).toHaveBeenCalledWith(1);
      expect(mockMerchantService.assignPermissions).toHaveBeenCalledWith(1, permissionIds);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '分配商户权限成功',
        timestamp: expect.any(String),
      });
    });

    it('应该在缺少ID时抛出错误', async () => {
      mockReq.params = {};
      mockReq.body = { permissionIds: [1, 2] };

      await expect(
        merchantController.assignMerchantPermissions(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('商户ID不能为空');
    });

    it('应该在权限ID列表格式无效时抛出错误', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { permissionIds: 'invalid' };

      await expect(
        merchantController.assignMerchantPermissions(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('权限ID列表格式无效');
    });

    it('应该在商户不存在时抛出错误', async () => {
      mockReq.params = { id: '999' };
      mockReq.body = { permissionIds: [1, 2] };
      mockMerchantService.getMerchantById.mockResolvedValue(null);

      await expect(
        merchantController.assignMerchantPermissions(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('商户不存在');
    });
  });

  describe('removeMerchantPermissions', () => {
    it('应该成功移除商户权限', async () => {
      const permissionIds = [1, 2];

      mockReq.params = { id: '1' };
      mockReq.body = { permissionIds };
      mockMerchantService.removePermissions.mockResolvedValue(undefined);

      await merchantController.removeMerchantPermissions(mockReq as Request, mockRes as Response);

      expect(mockMerchantService.removePermissions).toHaveBeenCalledWith(1, permissionIds);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '移除商户权限成功',
        timestamp: expect.any(String),
      });
    });

    it('应该在权限ID列表格式无效时抛出错误', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { permissionIds: 'invalid' };

      await expect(
        merchantController.removeMerchantPermissions(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('权限ID列表格式无效');
    });
  });

  describe('getMerchantStats', () => {
    it('应该成功获取商户统计信息', async () => {
      const mockStats = {
        employees: { total: 10, active: 8, inactive: 2 },
        visitors: { total: 20, pending: 5, approved: 12, rejected: 3 },
        access: { total: 100, success: 95, failed: 5 },
      };

      mockReq.params = { id: '1' };
      mockMerchantService.getMerchantStats.mockResolvedValue(mockStats);

      await merchantController.getMerchantStats(mockReq as Request, mockRes as Response);

      expect(mockMerchantService.getMerchantStats).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '获取商户统计信息成功',
        data: { stats: mockStats },
        timestamp: expect.any(String),
      });
    });

    it('应该在缺少ID时抛出错误', async () => {
      mockReq.params = {};

      await expect(
        merchantController.getMerchantStats(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('商户ID不能为空');
    });
  });

  describe('边界条件和错误处理', () => {
    it('应该处理空的权限ID数组', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { permissionIds: [] };
      mockMerchantService.getMerchantById.mockResolvedValue(mockMerchant);
      mockMerchantService.assignPermissions.mockResolvedValue(undefined);

      await merchantController.assignMerchantPermissions(mockReq as Request, mockRes as Response);

      expect(mockMerchantService.assignPermissions).toHaveBeenCalledWith(1, []);
    });

    it('应该处理字符串形式的ID参数', async () => {
      mockReq.params = { id: '123' };
      mockMerchantService.getMerchantById.mockResolvedValue(mockMerchant);

      await merchantController.getMerchantById(mockReq as Request, mockRes as Response);

      expect(mockMerchantService.getMerchantById).toHaveBeenCalledWith(123);
    });

    it('应该处理更新相同编码的情况', async () => {
      const updateData = { code: 'TEST_MERCHANT' }; // 相同的编码

      mockReq.params = { id: '1' };
      mockReq.body = updateData;
      mockMerchantService.getMerchantById.mockResolvedValue(mockMerchant);
      mockMerchantService.updateMerchant.mockResolvedValue(mockMerchant);

      await merchantController.updateMerchant(mockReq as Request, mockRes as Response);

      // 不应该调用 getMerchantByCode，因为编码没有变化
      expect(mockMerchantService.getMerchantByCode).not.toHaveBeenCalled();
      expect(mockMerchantService.updateMerchant).toHaveBeenCalledWith(1, updateData);
    });
  });
});