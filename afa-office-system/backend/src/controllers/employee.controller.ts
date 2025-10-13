import { Request, Response } from 'express';
import { EmployeeService } from '../services/employee.service.js';
import { AppError, ErrorCodes, asyncHandler } from '../middleware/error.middleware.js';
import type { ApiResponse, User, PaginatedResult } from '../types/index.js';

/**
 * 员工控制器
 * 处理员工管理相关的HTTP请求
 */
export class EmployeeController {
  private employeeService: EmployeeService;

  constructor() {
    this.employeeService = new EmployeeService();
  }

  /**
   * 创建员工
   */
  createEmployee = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;
      const employeeData = req.body;

      // 验证商户ID
      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      // 验证必填字段
      if (!employeeData.name || employeeData.name.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: '员工姓名不能为空',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const employee = await this.employeeService.createEmployee(merchantId, employeeData);

      res.status(201).json({
        success: true,
        data: employee,
        message: '员工创建成功',
        timestamp: new Date().toISOString()
      } as ApiResponse<User>);
    } catch (error) {
      console.error('创建员工失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '创建员工失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  });

  /**
   * 批量创建员工
   */
  batchCreateEmployees = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;
      const { employees } = req.body;

      // 验证商户ID
      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      // 验证员工数据
      if (!Array.isArray(employees) || employees.length === 0) {
        res.status(400).json({
          success: false,
          message: '员工数据不能为空',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const result = await this.employeeService.batchCreateEmployees(merchantId, employees);

      res.status(200).json({
        success: true,
        data: result,
        message: `批量创建完成，成功：${result.success.length}个，失败：${result.failed.length}个`,
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('批量创建员工失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '批量创建员工失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  });

  /**
   * 获取员工列表
   */
  getEmployees = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;
      const { page, limit, status, search } = req.query;

      // 验证商户ID
      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const options = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as any,
        search: search as string
      };

      // 修复exactOptionalPropertyTypes错误
      const cleanOptions: {
        page?: number;
        limit?: number;
        status?: any;
        search?: string;
      } = {};

      if (options.page !== undefined) cleanOptions.page = options.page;
      if (options.limit !== undefined) cleanOptions.limit = options.limit;
      if (options.status !== undefined) cleanOptions.status = options.status;
      if (options.search !== undefined) cleanOptions.search = options.search;

      const result = await this.employeeService.getEmployees(merchantId, cleanOptions);

      res.status(200).json({
        success: true,
        data: result,
        message: '获取员工列表成功',
        timestamp: new Date().toISOString()
      } as ApiResponse<PaginatedResult<User>>);
    } catch (error) {
      console.error('获取员工列表失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取员工列表失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  });

  /**
   * 获取员工详情
   */
  getEmployeeById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;
      const employeeId = req.params.employeeId ? parseInt(req.params.employeeId) : NaN;

      // 验证参数
      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (isNaN(employeeId) || employeeId <= 0) {
        res.status(400).json({
          success: false,
          message: '员工ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const employee = await this.employeeService.getEmployeeById(merchantId, employeeId);

      res.status(200).json({
        success: true,
        data: employee,
        message: '获取员工详情成功',
        timestamp: new Date().toISOString()
      } as ApiResponse<User>);
    } catch (error) {
      console.error('获取员工详情失败:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '获取员工详情失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  });

  /**
   * 更新员工信息
   */
  updateEmployee = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;
      const employeeId = req.params.employeeId ? parseInt(req.params.employeeId) : NaN;
      const updateData = req.body;

      // 验证参数
      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (isNaN(employeeId) || employeeId <= 0) {
        res.status(400).json({
          success: false,
          message: '员工ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const employee = await this.employeeService.updateEmployee(merchantId, employeeId, updateData);

      res.status(200).json({
        success: true,
        data: employee,
        message: '更新员工信息成功',
        timestamp: new Date().toISOString()
      } as ApiResponse<User>);
    } catch (error) {
      console.error('更新员工信息失败:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '更新员工信息失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  });

  /**
   * 删除员工
   */
  deleteEmployee = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;
      const employeeId = req.params.employeeId ? parseInt(req.params.employeeId) : NaN;

      // 验证参数
      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (isNaN(employeeId) || employeeId <= 0) {
        res.status(400).json({
          success: false,
          message: '员工ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      await this.employeeService.deleteEmployee(merchantId, employeeId);

      res.status(200).json({
        success: true,
        message: '删除员工成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('删除员工失败:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '删除员工失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  });

  /**
   * 批量删除员工
   */
  batchDeleteEmployees = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;
      const { employeeIds } = req.body;

      // 验证商户ID
      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      // 验证员工ID列表
      if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
        res.status(400).json({
          success: false,
          message: '员工ID列表不能为空',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const result = await this.employeeService.batchDeleteEmployees(merchantId, employeeIds);

      res.status(200).json({
        success: true,
        data: result,
        message: `批量删除完成，成功：${result.success.length}个，失败：${result.failed.length}个`,
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('批量删除员工失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '批量删除员工失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  });

  /**
   * 启用/禁用员工
   */
  toggleEmployeeStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;
      const employeeId = req.params.employeeId ? parseInt(req.params.employeeId) : NaN;
      const { status } = req.body;

      // 验证参数
      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (isNaN(employeeId) || employeeId <= 0) {
        res.status(400).json({
          success: false,
          message: '员工ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const employee = await this.employeeService.toggleEmployeeStatus(merchantId, employeeId, status);

      res.status(200).json({
        success: true,
        data: employee,
        message: `${status === 'active' ? '启用' : '禁用'}员工成功`,
        timestamp: new Date().toISOString()
      } as ApiResponse<User>);
    } catch (error) {
      console.error('切换员工状态失败:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '切换员工状态失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  });

  /**
   * Excel批量导入员工
   */
  importEmployeesFromExcel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;

      // 验证商户ID
      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      // TODO: 实现Excel导入逻辑
      res.status(501).json({
        success: false,
        message: 'Excel导入功能暂未实现',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('Excel导入员工失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Excel导入员工失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  });

  /**
   * 获取员工统计信息
   */
  getEmployeeStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;

      // 验证商户ID
      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      // TODO: 实现员工统计逻辑
      const stats = {
        total: 0,
        active: 0,
        inactive: 0,
        pending: 0
      };

      res.status(200).json({
        success: true,
        data: stats,
        message: '获取员工统计成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('获取员工统计失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取员工统计失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  });

  /**
   * 分配员工权限
   */
  assignEmployeePermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;
      const employeeId = req.params.employeeId ? parseInt(req.params.employeeId) : NaN;
      const { permissions } = req.body;

      // 验证参数
      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (isNaN(employeeId) || employeeId <= 0) {
        res.status(400).json({
          success: false,
          message: '员工ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      // TODO: 实现权限分配逻辑
      res.status(501).json({
        success: false,
        message: '权限分配功能暂未实现',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('分配员工权限失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '分配员工权限失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  });

  /**
   * 获取员工权限
   */
  getEmployeePermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;
      const employeeId = req.params.employeeId ? parseInt(req.params.employeeId) : NaN;

      // 验证参数
      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (isNaN(employeeId) || employeeId <= 0) {
        res.status(400).json({
          success: false,
          message: '员工ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      // TODO: 实现获取权限逻辑
      const permissions: string[] = [];

      res.status(200).json({
        success: true,
        data: permissions,
        message: '获取员工权限成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('获取员工权限失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取员工权限失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  });
}