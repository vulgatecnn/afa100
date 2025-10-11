import { Request, Response } from 'express';
import { SpaceService } from '../services/space.service.js';
import { AppError, ErrorCodes, asyncHandler } from '../middleware/error.middleware.js';
import type { ApiResponse, CreateProjectData, CreateVenueData, CreateFloorData } from '../types/index.js';

/**
 * 空间管理控制器
 * 处理项目、场地、楼层的层级管理和权限关联
 */
export class SpaceController {
  private spaceService: SpaceService;

  constructor() {
    this.spaceService = new SpaceService();
  }

  // ==================== 项目管理 ====================

  /**
   * 获取项目列表
   */
  getProjects = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 10, status, search } = req.query;

    const result = await this.spaceService.getProjects({
      page: Number(page),
      limit: Number(limit),
      status: status as string,
      search: search as string,
    });

    const response: ApiResponse = {
      success: true,
      message: '获取项目列表成功',
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 获取项目详情
   */
  getProjectById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('项目ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    const project = await this.spaceService.getProjectById(Number(id));

    if (!project) {
      throw new AppError('项目不存在', 404, ErrorCodes.PROJECT_NOT_FOUND);
    }

    const response: ApiResponse = {
      success: true,
      message: '获取项目详情成功',
      data: { project },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 创建项目
   */
  createProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const projectData: CreateProjectData = req.body;

    // 验证必填字段
    if (!projectData.name || !projectData.code) {
      throw new AppError('项目名称和编码不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    // 检查项目编码是否已存在
    const existingProject = await this.spaceService.getProjectByCode(projectData.code);
    if (existingProject) {
      throw new AppError('项目编码已存在', 400, ErrorCodes.PROJECT_CODE_EXISTS);
    }

    const project = await this.spaceService.createProject(projectData);

    const response: ApiResponse = {
      success: true,
      message: '创建项目成功',
      data: { project },
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  });

  /**
   * 更新项目信息
   */
  updateProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      throw new AppError('项目ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    // 检查项目是否存在
    const existingProject = await this.spaceService.getProjectById(Number(id));
    if (!existingProject) {
      throw new AppError('项目不存在', 404, ErrorCodes.PROJECT_NOT_FOUND);
    }

    // 如果更新编码，检查新编码是否已被其他项目使用
    if (updateData.code && updateData.code !== existingProject.code) {
      const projectWithCode = await this.spaceService.getProjectByCode(updateData.code);
      if (projectWithCode && projectWithCode.id !== Number(id)) {
        throw new AppError('项目编码已存在', 400, ErrorCodes.PROJECT_CODE_EXISTS);
      }
    }

    const project = await this.spaceService.updateProject(Number(id), updateData);

    const response: ApiResponse = {
      success: true,
      message: '更新项目信息成功',
      data: { project },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 删除项目
   */
  deleteProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('项目ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    // 检查项目下是否有场地
    const hasVenues = await this.spaceService.projectHasVenues(Number(id));
    if (hasVenues) {
      throw new AppError('项目下存在场地，无法删除', 400, ErrorCodes.PROJECT_HAS_VENUES);
    }

    await this.spaceService.deleteProject(Number(id));

    const response: ApiResponse = {
      success: true,
      message: '删除项目成功',
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  // ==================== 场地管理 ====================

  /**
   * 获取场地列表
   */
  getVenues = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 10, projectId, status, search } = req.query;

    // 构建查询选项，避免undefined值
    const options: any = {
      page: Number(page),
      limit: Number(limit),
      status: status as string,
      search: search as string,
    };

    // 只有当projectId存在时才添加到选项中
    if (projectId) {
      options.projectId = Number(projectId);
    }

    const result = await this.spaceService.getVenues(options);

    const response: ApiResponse = {
      success: true,
      message: '获取场地列表成功',
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 获取场地详情
   */
  getVenueById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('场地ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    const venue = await this.spaceService.getVenueById(Number(id));

    if (!venue) {
      throw new AppError('场地不存在', 404, ErrorCodes.VENUE_NOT_FOUND);
    }

    const response: ApiResponse = {
      success: true,
      message: '获取场地详情成功',
      data: { venue },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 创建场地
   */
  createVenue = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const venueData: CreateVenueData = req.body;

    // 验证必填字段
    if (!venueData.name || !venueData.code || !venueData.project_id) {
      throw new AppError('场地名称、编码和项目ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    // 检查项目是否存在
    const project = await this.spaceService.getProjectById(venueData.project_id);
    if (!project) {
      throw new AppError('项目不存在', 404, ErrorCodes.PROJECT_NOT_FOUND);
    }

    // 检查场地编码在项目内是否已存在
    const existingVenue = await this.spaceService.getVenueByCode(venueData.project_id, venueData.code);
    if (existingVenue) {
      throw new AppError('场地编码在该项目内已存在', 400, ErrorCodes.VENUE_CODE_EXISTS);
    }

    const venue = await this.spaceService.createVenue(venueData);

    const response: ApiResponse = {
      success: true,
      message: '创建场地成功',
      data: { venue },
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  });

  /**
   * 更新场地信息
   */
  updateVenue = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      throw new AppError('场地ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    // 检查场地是否存在
    const existingVenue = await this.spaceService.getVenueById(Number(id));
    if (!existingVenue) {
      throw new AppError('场地不存在', 404, ErrorCodes.VENUE_NOT_FOUND);
    }

    // 如果更新编码，检查新编码在项目内是否已被其他场地使用
    if (updateData.code && updateData.code !== existingVenue.code) {
      const venueWithCode = await this.spaceService.getVenueByCode(existingVenue.project_id, updateData.code);
      if (venueWithCode && venueWithCode.id !== Number(id)) {
        throw new AppError('场地编码在该项目内已存在', 400, ErrorCodes.VENUE_CODE_EXISTS);
      }
    }

    const venue = await this.spaceService.updateVenue(Number(id), updateData);

    const response: ApiResponse = {
      success: true,
      message: '更新场地信息成功',
      data: { venue },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 删除场地
   */
  deleteVenue = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('场地ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    // 检查场地下是否有楼层
    const hasFloors = await this.spaceService.venueHasFloors(Number(id));
    if (hasFloors) {
      throw new AppError('场地下存在楼层，无法删除', 400, ErrorCodes.VENUE_HAS_FLOORS);
    }

    await this.spaceService.deleteVenue(Number(id));

    const response: ApiResponse = {
      success: true,
      message: '删除场地成功',
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  // ==================== 楼层管理 ====================

  /**
   * 获取楼层列表
   */
  getFloors = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 10, venueId, status, search } = req.query;

    // 构建查询选项，避免undefined值
    const options: any = {
      page: Number(page),
      limit: Number(limit),
      status: status as string,
      search: search as string,
    };

    // 只有当venueId存在时才添加到选项中
    if (venueId) {
      options.venueId = Number(venueId);
    }

    const result = await this.spaceService.getFloors(options);

    const response: ApiResponse = {
      success: true,
      message: '获取楼层列表成功',
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 获取楼层详情
   */
  getFloorById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('楼层ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    const floor = await this.spaceService.getFloorById(Number(id));

    if (!floor) {
      throw new AppError('楼层不存在', 404, ErrorCodes.FLOOR_NOT_FOUND);
    }

    const response: ApiResponse = {
      success: true,
      message: '获取楼层详情成功',
      data: { floor },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 创建楼层
   */
  createFloor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const floorData: CreateFloorData = req.body;

    // 验证必填字段
    if (!floorData.name || !floorData.code || !floorData.venue_id) {
      throw new AppError('楼层名称、编码和场地ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    // 检查场地是否存在
    const venue = await this.spaceService.getVenueById(floorData.venue_id);
    if (!venue) {
      throw new AppError('场地不存在', 404, ErrorCodes.VENUE_NOT_FOUND);
    }

    // 检查楼层编码在场地内是否已存在
    const existingFloor = await this.spaceService.getFloorByCode(floorData.venue_id, floorData.code);
    if (existingFloor) {
      throw new AppError('楼层编码在该场地内已存在', 400, ErrorCodes.FLOOR_CODE_EXISTS);
    }

    const floor = await this.spaceService.createFloor(floorData);

    const response: ApiResponse = {
      success: true,
      message: '创建楼层成功',
      data: { floor },
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  });

  /**
   * 更新楼层信息
   */
  updateFloor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      throw new AppError('楼层ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    // 检查楼层是否存在
    const existingFloor = await this.spaceService.getFloorById(Number(id));
    if (!existingFloor) {
      throw new AppError('楼层不存在', 404, ErrorCodes.FLOOR_NOT_FOUND);
    }

    // 如果更新编码，检查新编码在场地内是否已被其他楼层使用
    if (updateData.code && updateData.code !== existingFloor.code) {
      const floorWithCode = await this.spaceService.getFloorByCode(existingFloor.venue_id, updateData.code);
      if (floorWithCode && floorWithCode.id !== Number(id)) {
        throw new AppError('楼层编码在该场地内已存在', 400, ErrorCodes.FLOOR_CODE_EXISTS);
      }
    }

    const floor = await this.spaceService.updateFloor(Number(id), updateData);

    const response: ApiResponse = {
      success: true,
      message: '更新楼层信息成功',
      data: { floor },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 删除楼层
   */
  deleteFloor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('楼层ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    await this.spaceService.deleteFloor(Number(id));

    const response: ApiResponse = {
      success: true,
      message: '删除楼层成功',
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  // ==================== 层级结构查询 ====================

  /**
   * 获取完整的空间层级结构
   */
  getSpaceHierarchy = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { projectId } = req.query;

    const hierarchy = await this.spaceService.getSpaceHierarchy(
      projectId ? Number(projectId) : undefined
    );

    const response: ApiResponse = {
      success: true,
      message: '获取空间层级结构成功',
      data: { hierarchy },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 获取商户权限关联的空间
   */
  getMerchantSpaces = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { merchantId } = req.params;

    if (!merchantId) {
      throw new AppError('商户ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    const spaces = await this.spaceService.getMerchantSpaces(Number(merchantId));

    const response: ApiResponse = {
      success: true,
      message: '获取商户关联空间成功',
      data: { spaces },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });
}