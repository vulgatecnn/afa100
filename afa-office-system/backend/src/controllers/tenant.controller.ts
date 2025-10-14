import { Request, Response, NextFunction } from 'express';
import { MerchantService } from '../services/merchant.service.js';
import { SpaceService } from '../services/space.service.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import type { ApiResponse, MerchantListQuery, CreateMerchantData, UpdateMerchantData } from '../types/index.js';

/**
 * 租务管理控制器
 * 处理租务管理相关的HTTP请求
 */
export class TenantController {
  private merchantService: MerchantService;
  private spaceService: SpaceService;

  constructor() {
    this.merchantService = new MerchantService();
    this.spaceService = new SpaceService();
  }

  /**
   * 获取商户列表
   */
  getMerchants = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query: MerchantListQuery = {
      page: parseInt(req.query['page'] as string) || 1,
      limit: parseInt(req.query['limit'] as string) || 10,
      status: req.query['status'] as string,
      search: req.query['search'] as string,
      sortBy: req.query['sortBy'] as string,
      sortOrder: req.query['sortOrder'] as 'asc' | 'desc',
    };

    const result = await this.merchantService.getMerchants(query);

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
    const merchantId = req.params['id'] ? parseInt(req.params['id']) : NaN;
    const merchant = await this.merchantService.getMerchantById(merchantId);

    const response: ApiResponse = {
      success: true,
      message: '获取商户详情成功',
      data: merchant,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 创建商户
   */
  createMerchant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const merchantData: CreateMerchantData = req.body;
    const merchant = await this.merchantService.createMerchant(merchantData);

    const response: ApiResponse = {
      success: true,
      message: '创建商户成功',
      data: merchant,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  });

  /**
   * 更新商户信息
   */
  updateMerchant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const merchantId = req.params['id'] ? parseInt(req.params['id']) : NaN;
    const updateData: UpdateMerchantData = req.body;
    
    const merchant = await this.merchantService.updateMerchant(merchantId, updateData);

    const response: ApiResponse = {
      success: true,
      message: '更新商户信息成功',
      data: merchant,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 删除商户
   */
  deleteMerchant = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const merchantId = req.params['id'] ? parseInt(req.params['id']) : NaN;
    await this.merchantService.deleteMerchant(merchantId);

    const response: ApiResponse = {
      success: true,
      message: '删除商户成功',
      data: null,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 更新商户状态
   */
  updateMerchantStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const merchantId = req.params['id'] ? parseInt(req.params['id']) : NaN;
    const { status } = req.body;
    
    await this.merchantService.updateMerchantStatus(merchantId, status);

    const response: ApiResponse = {
      success: true,
      message: `${status === 'active' ? '启用' : '停用'}商户成功`,
      data: null,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 为商户分配权限
   */
  assignPermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const merchantId = req.params['id'] ? parseInt(req.params['id']) : NaN;
    const { permissionIds } = req.body;
    
    await this.merchantService.assignPermissions(merchantId, permissionIds);

    const response: ApiResponse = {
      success: true,
      message: '分配权限成功',
      data: null,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 获取商户统计信息
   */
  getMerchantStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const merchantId = req.params['id'] ? parseInt(req.params['id']) : NaN;
    const stats = await this.merchantService.getMerchantStats(merchantId);

    const response: ApiResponse = {
      success: true,
      message: '获取商户统计信息成功',
      data: stats,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 获取空间层级结构
   */
  getSpaceHierarchy = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const projectId = req.query['projectId'] ? parseInt(req.query['projectId'] as string) : undefined;
    const hierarchy = await this.spaceService.getSpaceHierarchy(projectId);

    const response: ApiResponse = {
      success: true,
      message: '获取空间层级结构成功',
      data: hierarchy,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 获取项目列表
   */
  getProjects = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = {
      page: parseInt(req.query['page'] as string) || 1,
      limit: parseInt(req.query['limit'] as string) || 10,
      status: req.query['status'] as string,
      search: req.query['search'] as string,
      sortBy: req.query['sortBy'] as string,
      sortOrder: req.query['sortOrder'] as 'asc' | 'desc',
    };

    const result = await this.spaceService.getProjects(query);

    const response: ApiResponse = {
      success: true,
      message: '获取项目列表成功',
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 创建项目
   */
  createProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const projectData = req.body;
    const project = await this.spaceService.createProject(projectData);

    const response: ApiResponse = {
      success: true,
      message: '创建项目成功',
      data: project,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  });

  /**
   * 更新项目信息
   */
  updateProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const projectId = req.params['id'] ? parseInt(req.params['id']) : NaN;
    const updateData = req.body;
    
    const project = await this.spaceService.updateProject(projectId, updateData);

    const response: ApiResponse = {
      success: true,
      message: '更新项目信息成功',
      data: project,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });
}