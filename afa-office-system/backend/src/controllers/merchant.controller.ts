import { Request, Response } from 'express';
import { MerchantService } from '../services/merchant.service.js';
import { AppError, ErrorCodes, asyncHandler } from '../middleware/error.middleware.js';
import type { ApiResponse, CreateMerchantData, UpdateMerchantData } from '../types/index.js';

/**
 * 商户管理控制器
 * 处理商户的增删改查、启用停用、权限分配等操作
 */
export class MerchantController {
  private merchantService: MerchantService;

  constructor() {
    this.merchantService = new MerchantService();
  }

  /**
   * 获取商户列表
   */
  getMerchants = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 10, status, search } = req.query;

    const result = await this.merchantService.getMerchants({
      page: Number(page),
      limit: Number(limit),
      status: status as string,
      search: search as string,
    });

    const response: ApiResponse = {
      success: true,
      message: '获取商户列表成功',
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 获取商户详情
   */
  getMerchantById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('商户ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    const merchant = await this.merchantService.getMerchantById(Number(id));

    if (!merchant) {
      throw new AppError('商户不存在', 404, ErrorCodes.MERCHANT_NOT_FOUND);
    }

    const response: ApiResponse = {
      success: true,
      message: '获取商户详情成功',
      data: { merchant },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 创建商户
   */
  createMerchant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const merchantData: CreateMerchantData = req.body;

    // 验证必填字段
    if (!merchantData.name || !merchantData.code) {
      throw new AppError('商户名称和编码不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    // 检查商户编码是否已存在
    const existingMerchant = await this.merchantService.getMerchantByCode(merchantData.code);
    if (existingMerchant) {
      throw new AppError('商户编码已存在', 400, ErrorCodes.MERCHANT_CODE_EXISTS);
    }

    const merchant = await this.merchantService.createMerchant(merchantData);

    const response: ApiResponse = {
      success: true,
      message: '创建商户成功',
      data: { merchant },
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  });

  /**
   * 更新商户信息
   */
  updateMerchant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updateData: UpdateMerchantData = req.body;

    if (!id) {
      throw new AppError('商户ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    // 检查商户是否存在
    const existingMerchant = await this.merchantService.getMerchantById(Number(id));
    if (!existingMerchant) {
      throw new AppError('商户不存在', 404, ErrorCodes.MERCHANT_NOT_FOUND);
    }

    // 如果更新编码，检查新编码是否已被其他商户使用
    if (updateData.code && updateData.code !== existingMerchant.code) {
      const merchantWithCode = await this.merchantService.getMerchantByCode(updateData.code);
      if (merchantWithCode && merchantWithCode.id !== Number(id)) {
        throw new AppError('商户编码已存在', 400, ErrorCodes.MERCHANT_CODE_EXISTS);
      }
    }

    const merchant = await this.merchantService.updateMerchant(Number(id), updateData);

    const response: ApiResponse = {
      success: true,
      message: '更新商户信息成功',
      data: { merchant },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 删除商户
   */
  deleteMerchant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('商户ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    // 检查商户是否存在
    const existingMerchant = await this.merchantService.getMerchantById(Number(id));
    if (!existingMerchant) {
      throw new AppError('商户不存在', 404, ErrorCodes.MERCHANT_NOT_FOUND);
    }

    // 检查商户下是否有员工
    const hasEmployees = await this.merchantService.hasEmployees(Number(id));
    if (hasEmployees) {
      throw new AppError('商户下存在员工，无法删除', 400, ErrorCodes.MERCHANT_HAS_EMPLOYEES);
    }

    await this.merchantService.deleteMerchant(Number(id));

    const response: ApiResponse = {
      success: true,
      message: '删除商户成功',
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 启用商户
   */
  enableMerchant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('商户ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    const merchant = await this.merchantService.updateMerchantStatus(Number(id), 'active');

    const response: ApiResponse = {
      success: true,
      message: '启用商户成功',
      data: { merchant },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 停用商户
   */
  disableMerchant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('商户ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    // 停用商户时自动处理员工权限
    const merchant = await this.merchantService.updateMerchantStatus(Number(id), 'inactive');

    const response: ApiResponse = {
      success: true,
      message: '停用商户成功，已自动停用该商户下所有员工权限',
      data: { merchant },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 获取商户权限
   */
  getMerchantPermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('商户ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    const permissions = await this.merchantService.getMerchantPermissions(Number(id));

    const response: ApiResponse = {
      success: true,
      message: '获取商户权限成功',
      data: { permissions },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 分配商户权限
   */
  assignMerchantPermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { permissionIds } = req.body;

    if (!id) {
      throw new AppError('商户ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    if (!Array.isArray(permissionIds)) {
      throw new AppError('权限ID列表格式无效', 400, ErrorCodes.VALIDATION_ERROR);
    }

    // 检查商户是否存在
    const existingMerchant = await this.merchantService.getMerchantById(Number(id));
    if (!existingMerchant) {
      throw new AppError('商户不存在', 404, ErrorCodes.MERCHANT_NOT_FOUND);
    }

    await this.merchantService.assignPermissions(Number(id), permissionIds);

    const response: ApiResponse = {
      success: true,
      message: '分配商户权限成功',
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 移除商户权限
   */
  removeMerchantPermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { permissionIds } = req.body;

    if (!id) {
      throw new AppError('商户ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    if (!Array.isArray(permissionIds)) {
      throw new AppError('权限ID列表格式无效', 400, ErrorCodes.VALIDATION_ERROR);
    }

    await this.merchantService.removePermissions(Number(id), permissionIds);

    const response: ApiResponse = {
      success: true,
      message: '移除商户权限成功',
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 获取商户统计信息
   */
  getMerchantStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('商户ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    const stats = await this.merchantService.getMerchantStats(Number(id));

    const response: ApiResponse = {
      success: true,
      message: '获取商户统计信息成功',
      data: { stats },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });
}