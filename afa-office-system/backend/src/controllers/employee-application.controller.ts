import { Request, Response } from 'express';
import { EmployeeApplicationService } from '../services/employee-application.service.js';
import { MerchantModel } from '../models/merchant.model.js';
import type { ApiResponse, AuthenticatedRequest } from '../types/index.js';

/**
 * 员工申请控制器
 * 处理员工申请相关的HTTP请求
 */
export class EmployeeApplicationController {
  private employeeApplicationService: EmployeeApplicationService;
  private merchantModel: MerchantModel;

  constructor() {
    this.employeeApplicationService = new EmployeeApplicationService();
    this.merchantModel = new MerchantModel();
  }

  /**
   * 获取商户列表（供申请时选择）
   */
  async getMerchants(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // 获取所有活跃的商户
      const merchants = await this.merchantModel.findAll({
        status: 'active',
        page: 1,
        limit: 1000 // 获取所有商户
      });

      res.status(200).json({
        success: true,
        data: merchants.merchants.map(merchant => ({
          id: merchant.id,
          name: merchant.name,
          code: merchant.code,
          contact: merchant.contact,
          phone: merchant.phone
        })),
        message: '获取商户列表成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('获取商户列表失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取商户列表失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 提交员工申请
   */
  async submitApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未登录',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const {
        merchantId,
        name,
        phone,
        department,
        position,
        idCard,
        email,
        startDate,
        emergencyContact,
        emergencyPhone,
        emergencyRelationship
      } = req.body;

      // 验证必填字段
      if (!merchantId || !name || !phone || !department || !position) {
        res.status(400).json({
          success: false,
          message: '商户、姓名、手机号、部门和职位为必填项',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const application = await this.employeeApplicationService.submitApplication(userId, {
        merchantId: parseInt(merchantId),
        name: name.trim(),
        phone: phone.trim(),
        department: department.trim(),
        position: position.trim(),
        idCard: idCard?.trim(),
        email: email?.trim(),
        startDate: startDate?.trim(),
        emergencyContact: emergencyContact?.trim(),
        emergencyPhone: emergencyPhone?.trim(),
        emergencyRelationship: emergencyRelationship?.trim()
      });

      res.status(201).json({
        success: true,
        data: application,
        message: '员工申请提交成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('提交员工申请失败:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '提交员工申请失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 获取我的申请记录
   */
  async getMyApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未登录',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const application = await this.employeeApplicationService.getMyApplication(userId);

      res.status(200).json({
        success: true,
        data: application,
        message: application ? '获取申请记录成功' : '暂无申请记录',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('获取申请记录失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取申请记录失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 获取商户的员工申请列表（商户管理员使用）
   */
  async getMerchantApplications(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = parseInt(req.params.merchantId);
      const { status, page, limit } = req.query;

      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const options = {
        status: status as any,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      };

      const result = await this.employeeApplicationService.getMerchantApplications(merchantId, options);

      res.status(200).json({
        success: true,
        data: result,
        message: '获取员工申请列表成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('获取员工申请列表失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取员工申请列表失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 获取申请详情
   */
  async getApplicationById(req: Request, res: Response): Promise<void> {
    try {
      const applicationId = parseInt(req.params.applicationId);

      if (isNaN(applicationId) || applicationId <= 0) {
        res.status(400).json({
          success: false,
          message: '申请ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const application = await this.employeeApplicationService.getApplicationById(applicationId);

      res.status(200).json({
        success: true,
        data: application,
        message: '获取申请详情成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('获取申请详情失败:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '获取申请详情失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 审批员工申请
   */
  async approveApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const applicationId = parseInt(req.params.applicationId);
      const { approved, reason } = req.body;
      const approvedBy = req.user?.id;

      if (isNaN(applicationId) || applicationId <= 0) {
        res.status(400).json({
          success: false,
          message: '申请ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (!approvedBy) {
        res.status(401).json({
          success: false,
          message: '用户未登录',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (typeof approved !== 'boolean') {
        res.status(400).json({
          success: false,
          message: '审批结果参数无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const application = await this.employeeApplicationService.approveApplication(
        applicationId,
        approvedBy,
        approved,
        reason
      );

      res.status(200).json({
        success: true,
        data: application,
        message: approved ? '申请审批通过' : '申请已拒绝',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('审批员工申请失败:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '审批员工申请失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 获取申请统计信息
   */
  async getApplicationStats(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = parseInt(req.params.merchantId);

      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const stats = await this.employeeApplicationService.getApplicationStats(merchantId);

      res.status(200).json({
        success: true,
        data: stats,
        message: '获取申请统计信息成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('获取申请统计信息失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取申请统计信息失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 撤销申请
   */
  async withdrawApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const applicationId = parseInt(req.params.applicationId);
      const userId = req.user?.id;

      if (isNaN(applicationId) || applicationId <= 0) {
        res.status(400).json({
          success: false,
          message: '申请ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未登录',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      await this.employeeApplicationService.withdrawApplication(applicationId, userId);

      res.status(200).json({
        success: true,
        message: '申请撤销成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('撤销申请失败:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '撤销申请失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 身份验证
   */
  async verifyIdentity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未登录',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const { realName, idCard, phone } = req.body;

      const result = await this.employeeApplicationService.verifyIdentity(userId, {
        realName: realName?.trim(),
        idCard: idCard?.trim(),
        phone: phone?.trim()
      });

      res.status(200).json({
        success: true,
        data: result,
        message: result.verified ? '身份验证通过' : '身份验证失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('身份验证失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '身份验证失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }
}