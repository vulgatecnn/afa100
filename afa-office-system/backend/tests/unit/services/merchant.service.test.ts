import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MerchantService } from '../../../src/services/merchant.service.js';
import { Database } from '../../../src/utils/database.js';
import { AppError, ErrorCodes } from '../../../src/middleware/error.middleware.js';

// Mock 依赖
vi.mock('../../../src/utils/database.js', () => ({
  Database: {
    getInstance: vi.fn(() => ({
      prepare: vi.fn(() => ({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn()
      }))
    }))
  }
}));

vi.mock('../../../src/models/merchant.model.js', () => ({
  Merchant: {
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn()
  }
}));

vi.mock('../../../src/models/user.model.js', () => ({
  User: {
    findAll: vi.fn(),
    count: vi.fn()
  }
}));

describe('MerchantService 单元测试', () => {
  let merchantService: MerchantService;
  let mockDb: any;

  beforeEach(() => {
    // 重置所有mock
    vi.clearAllMocks();
    
    // 创建 mockDb 对象
    mockDb = {
      prepare: vi.fn(() => ({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn()
      })),
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn()
    };
    
    // Mock Database.getInstance 返回 mockDb
    vi.mocked(Database.getInstance).mockReturnValue(mockDb);
    
    merchantService = new MerchantService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMerchants', () => {
    it('应该返回分页的商户列表', async () => {
      const mockMerchants = [
        { id: 1, name: '商户A', code: 'MERCHANT_A', status: 'active', employee_count: 5 },
        { id: 2, name: '商户B', code: 'MERCHANT_B', status: 'active', employee_count: 3 },
      ];

      mockDb.get.mockResolvedValueOnce({ total: 2 });
      mockDb.all.mockResolvedValueOnce(mockMerchants);

      const result = await merchantService.getMerchants({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        data: mockMerchants,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      });

      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as total'),
        []
      );
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([10, 0])
      );
    });

    it('应该支持状态筛选', async () => {
      mockDb.get.mockResolvedValueOnce({ total: 1 });
      mockDb.all.mockResolvedValueOnce([]);

      await merchantService.getMerchants({
        page: 1,
        limit: 10,
        status: 'active',
      });

      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = ?'),
        ['active']
      );
    });

    it('应该支持搜索功能', async () => {
      mockDb.get.mockResolvedValueOnce({ total: 0 });
      mockDb.all.mockResolvedValueOnce([]);

      await merchantService.getMerchants({
        page: 1,
        limit: 10,
        search: '测试商户',
      });

      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('(name LIKE ? OR code LIKE ? OR contact LIKE ?)'),
        ['%测试商户%', '%测试商户%', '%测试商户%']
      );
    });
  });

  describe('getMerchantById', () => {
    it('应该返回商户详情', async () => {
      const mockMerchant = {
        id: 1,
        name: '测试商户',
        code: 'TEST_MERCHANT',
        status: 'active',
        employee_count: 5,
        visitor_count: 10,
      };

      mockDb.get.mockResolvedValueOnce(mockMerchant);

      const result = await merchantService.getMerchantById(1);

      expect(result).toEqual(mockMerchant);
      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1]
      );
    });

    it('应该在商户不存在时返回null', async () => {
      mockDb.get.mockResolvedValueOnce(undefined);

      const result = await merchantService.getMerchantById(999);

      expect(result).toBeUndefined();
    });
  });

  describe('createMerchant', () => {
    it('应该成功创建商户', async () => {
      const merchantData = {
        name: '新商户',
        code: 'NEW_MERCHANT',
        contact: '张三',
        phone: '13800138000',
        email: 'test@example.com',
        address: '测试地址',
      };

      const mockCreatedMerchant = {
        id: 1,
        ...merchantData,
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockDb.run.mockResolvedValueOnce({ lastID: 1, changes: 1 });
      mockDb.get.mockResolvedValueOnce(mockCreatedMerchant);

      const result = await merchantService.createMerchant(merchantData);

      expect(result).toEqual(mockCreatedMerchant);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO merchants'),
        expect.arrayContaining([
          merchantData.name,
          merchantData.code,
          merchantData.contact,
          merchantData.phone,
          merchantData.email,
          merchantData.address,
          'active',
        ])
      );
    });

    it('应该在数据库插入失败时抛出错误', async () => {
      const merchantData = {
        name: '新商户',
        code: 'NEW_MERCHANT',
      };

      mockDb.run.mockResolvedValueOnce({ lastID: null, changes: 0 });

      await expect(merchantService.createMerchant(merchantData)).rejects.toThrow(
        new AppError('创建商户失败', 500, ErrorCodes.DATABASE_ERROR)
      );
    });
  });

  describe('updateMerchant', () => {
    it('应该成功更新商户信息', async () => {
      const updateData = {
        name: '更新后的商户名',
        contact: '李四',
      };

      const mockUpdatedMerchant = {
        id: 1,
        name: '更新后的商户名',
        code: 'TEST_MERCHANT',
        contact: '李四',
        status: 'active',
      };

      mockDb.run.mockResolvedValueOnce({ changes: 1 });
      mockDb.get.mockResolvedValueOnce(mockUpdatedMerchant);

      const result = await merchantService.updateMerchant(1, updateData);

      expect(result).toEqual(mockUpdatedMerchant);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE merchants'),
        expect.arrayContaining(['更新后的商户名', '李四', 1])
      );
    });

    it('应该在没有更新字段时抛出错误', async () => {
      await expect(merchantService.updateMerchant(1, {})).rejects.toThrow(
        new AppError('没有需要更新的字段', 400, ErrorCodes.VALIDATION_ERROR)
      );
    });

    it('应该在商户不存在时抛出错误', async () => {
      const updateData = { name: '新名称' };
      mockDb.run.mockResolvedValueOnce({ changes: 0 });

      await expect(merchantService.updateMerchant(999, updateData)).rejects.toThrow(
        new AppError('商户不存在或更新失败', 404, ErrorCodes.MERCHANT_NOT_FOUND)
      );
    });
  });

  describe('deleteMerchant', () => {
    it('应该成功删除商户', async () => {
      mockDb.run.mockResolvedValueOnce({ changes: 1 });

      await expect(merchantService.deleteMerchant(1)).resolves.toBeUndefined();

      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM merchants WHERE id = ?',
        [1]
      );
    });

    it('应该在商户不存在时抛出错误', async () => {
      mockDb.run.mockResolvedValueOnce({ changes: 0 });

      await expect(merchantService.deleteMerchant(999)).rejects.toThrow(
        new AppError('商户不存在或删除失败', 404, ErrorCodes.MERCHANT_NOT_FOUND)
      );
    });
  });

  describe('updateMerchantStatus', () => {
    it('应该成功启用商户', async () => {
      const mockMerchant = {
        id: 1,
        name: '测试商户',
        status: 'active',
      };

      mockDb.run
        .mockResolvedValueOnce(undefined) // BEGIN TRANSACTION
        .mockResolvedValueOnce({ changes: 1 }) // UPDATE merchants
        .mockResolvedValueOnce(undefined); // COMMIT

      mockDb.get.mockResolvedValueOnce(mockMerchant);

      const result = await merchantService.updateMerchantStatus(1, 'active');

      expect(result).toEqual(mockMerchant);
      expect(mockDb.run).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockDb.run).toHaveBeenCalledWith('COMMIT');
    });

    it('应该在停用商户时同时停用员工', async () => {
      const mockMerchant = {
        id: 1,
        name: '测试商户',
        status: 'inactive',
      };

      mockDb.run
        .mockResolvedValueOnce(undefined) // BEGIN TRANSACTION
        .mockResolvedValueOnce({ changes: 1 }) // UPDATE merchants
        .mockResolvedValueOnce({ changes: 2 }) // UPDATE users (employees)
        .mockResolvedValueOnce(undefined); // COMMIT

      mockDb.get.mockResolvedValueOnce(mockMerchant);

      const result = await merchantService.updateMerchantStatus(1, 'inactive');

      expect(result).toEqual(mockMerchant);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [1]
      );
    });

    it('应该在商户不存在时回滚事务并抛出错误', async () => {
      mockDb.run
        .mockResolvedValueOnce(undefined) // BEGIN TRANSACTION
        .mockResolvedValueOnce({ changes: 0 }) // UPDATE merchants (no changes)
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(merchantService.updateMerchantStatus(999, 'active')).rejects.toThrow(
        new AppError('商户不存在', 404, ErrorCodes.MERCHANT_NOT_FOUND)
      );

      expect(mockDb.run).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('hasEmployees', () => {
    it('应该在有员工时返回true', async () => {
      mockDb.get.mockResolvedValueOnce({ count: 3 });

      const result = await merchantService.hasEmployees(1);

      expect(result).toBe(true);
      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count'),
        [1]
      );
    });

    it('应该在没有员工时返回false', async () => {
      mockDb.get.mockResolvedValueOnce({ count: 0 });

      const result = await merchantService.hasEmployees(1);

      expect(result).toBe(false);
    });

    it('应该在查询结果为空时返回false', async () => {
      mockDb.get.mockResolvedValueOnce(undefined);

      const result = await merchantService.hasEmployees(1);

      expect(result).toBe(false);
    });
  });

  describe('assignPermissions', () => {
    it('应该成功分配权限给商户', async () => {
      const permissionIds = [1, 2, 3];
      const mockPermissions = [
        { id: 1, code: 'perm1' },
        { id: 2, code: 'perm2' },
        { id: 3, code: 'perm3' },
      ];

      mockDb.run
        .mockResolvedValueOnce(undefined) // BEGIN TRANSACTION
        .mockResolvedValueOnce(undefined) // DELETE existing permissions
        .mockResolvedValueOnce(undefined) // INSERT permission 1
        .mockResolvedValueOnce(undefined) // INSERT permission 2
        .mockResolvedValueOnce(undefined) // INSERT permission 3
        .mockResolvedValueOnce(undefined); // COMMIT

      mockDb.all.mockResolvedValueOnce(mockPermissions);
      mockDb.get.mockResolvedValueOnce({ count: 3 });

      await expect(merchantService.assignPermissions(1, permissionIds)).resolves.toBeUndefined();

      expect(mockDb.run).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockDb.run).toHaveBeenCalledWith('COMMIT');
      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM merchant_permissions WHERE merchant_id = ?',
        [1]
      );
    });

    it('应该在权限不存在时回滚事务并抛出错误', async () => {
      const permissionIds = [1, 2, 999]; // 999 不存在
      const mockPermissions = [
        { id: 1, code: 'perm1' },
        { id: 2, code: 'perm2' },
      ];

      mockDb.run
        .mockResolvedValueOnce(undefined) // BEGIN TRANSACTION
        .mockResolvedValueOnce(undefined); // ROLLBACK

      mockDb.all.mockResolvedValueOnce(mockPermissions); // 只返回2个权限

      await expect(merchantService.assignPermissions(1, permissionIds)).rejects.toThrow(
        new AppError('部分权限不存在', 400, ErrorCodes.PERMISSION_NOT_FOUND)
      );

      expect(mockDb.run).toHaveBeenCalledWith('ROLLBACK');
    });

    it('应该在权限ID列表为空时直接返回', async () => {
      await expect(merchantService.assignPermissions(1, [])).resolves.toBeUndefined();

      expect(mockDb.run).not.toHaveBeenCalled();
    });
  });

  describe('getMerchantStats', () => {
    it('应该返回商户统计信息', async () => {
      const mockEmployeeStats = { total: 10, active: 8, inactive: 2 };
      const mockVisitorStats = { total: 20, pending: 5, approved: 12, rejected: 3 };
      const mockAccessStats = { total: 100, success: 95, failed: 5 };

      mockDb.get
        .mockResolvedValueOnce(mockEmployeeStats)
        .mockResolvedValueOnce(mockVisitorStats)
        .mockResolvedValueOnce(mockAccessStats);

      const result = await merchantService.getMerchantStats(1);

      expect(result).toEqual({
        employees: mockEmployeeStats,
        visitors: mockVisitorStats,
        access: mockAccessStats,
      });

      expect(mockDb.get).toHaveBeenCalledTimes(3);
    });

    it('应该处理空的统计结果', async () => {
      mockDb.get
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      const result = await merchantService.getMerchantStats(1);

      expect(result).toEqual({
        employees: { total: 0, active: 0, inactive: 0 },
        visitors: { total: 0, pending: 0, approved: 0, rejected: 0 },
        access: { total: 0, success: 0, failed: 0 },
      });
    });
  });
});