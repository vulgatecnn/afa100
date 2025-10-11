import { Request, Response } from 'express';
import { VisitorService } from '../services/visitor.service.js';
import type { ApiResponse, VisitorApplication } from '../types/index.js';

/**
 * 访客管理控制器
 * 处理访客申请审批相关的HTTP请求
 */
export class VisitorController {
  private visitorService: VisitorService;

  constructor() {
    this.visitorService = new VisitorService();
  }

  /**
   * 获取访客申请列表
   */
  async getVisitorApplications(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;
      const { page, limit, status, search, dateFrom, dateTo, visiteeId } = req.query;

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
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        status: status as any,
        search: search ? (search as string) : undefined,
        dateFrom: dateFrom ? (dateFrom as string) : undefined,
        dateTo: dateTo ? (dateTo as string) : undefined,
        visiteeId: visiteeId ? parseInt(visiteeId as string) : undefined
      };

      // 修复exactOptionalPropertyTypes错误
      const cleanOptions: {
        page?: number;
        limit?: number;
        status?: any;
        search?: string;
        dateFrom?: string;
        dateTo?: string;
        visiteeId?: number;
      } = {};

      if (options.page !== undefined) cleanOptions.page = options.page;
      if (options.limit !== undefined) cleanOptions.limit = options.limit;
      if (options.status !== undefined) cleanOptions.status = options.status;
      if (options.search !== undefined) cleanOptions.search = options.search;
      if (options.dateFrom !== undefined) cleanOptions.dateFrom = options.dateFrom;
      if (options.dateTo !== undefined) cleanOptions.dateTo = options.dateTo;
      if (options.visiteeId !== undefined) cleanOptions.visiteeId = options.visiteeId;

      const result = await this.visitorService.getVisitorApplications(merchantId, cleanOptions);

      res.status(200).json({
        success: true,
        data: result,
        message: '获取访客申请列表成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('获取访客申请列表失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取访客申请列表失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 获取访客申请详情
   */
  async getVisitorApplicationById(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;
      const applicationId = req.params.applicationId ? parseInt(req.params.applicationId) : NaN;

      // 验证参数
      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (isNaN(applicationId) || applicationId <= 0) {
        res.status(400).json({
          success: false,
          message: '申请ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const result = await this.visitorService.getVisitorApplicationById(merchantId, applicationId);

      res.status(200).json({
        success: true,
        data: result,
        message: '获取访客申请详情成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('获取访客申请详情失败:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '获取访客申请详情失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 审批访客申请
   */
  async approveVisitorApplication(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;
      const applicationId = req.params.applicationId ? parseInt(req.params.applicationId) : NaN;
      const { approvedBy, duration, usageLimit, note } = req.body;

      // 验证参数
      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (isNaN(applicationId) || applicationId <= 0) {
        res.status(400).json({
          success: false,
          message: '申请ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (!approvedBy || isNaN(parseInt(approvedBy))) {
        res.status(400).json({
          success: false,
          message: '审批人ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const options = {
        duration: duration ? parseInt(duration) : undefined,
        usageLimit: usageLimit ? parseInt(usageLimit) : undefined,
        note: note ? (note as string) : undefined
      };

      // 修复exactOptionalPropertyTypes错误
      const cleanOptions: {
        duration?: number;
        usageLimit?: number;
        note?: string;
      } = {};

      if (options.duration !== undefined) cleanOptions.duration = options.duration;
      if (options.usageLimit !== undefined) cleanOptions.usageLimit = options.usageLimit;
      if (options.note !== undefined) cleanOptions.note = options.note;

      const approvedApplication = await this.visitorService.approveVisitorApplication(
        merchantId,
        applicationId,
        parseInt(approvedBy),
        cleanOptions
      );

      res.status(200).json({
        success: true,
        data: approvedApplication,
        message: '访客申请审批成功',
        timestamp: new Date().toISOString()
      } as ApiResponse<VisitorApplication>);
    } catch (error) {
      console.error('审批访客申请失败:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '审批访客申请失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 拒绝访客申请
   */
  async rejectVisitorApplication(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;
      const applicationId = req.params.applicationId ? parseInt(req.params.applicationId) : NaN;
      const { approvedBy, rejectionReason } = req.body;

      // 验证参数
      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (isNaN(applicationId) || applicationId <= 0) {
        res.status(400).json({
          success: false,
          message: '申请ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (!approvedBy || isNaN(parseInt(approvedBy))) {
        res.status(400).json({
          success: false,
          message: '审批人ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (!rejectionReason || rejectionReason.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: '拒绝原因不能为空',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const rejectedApplication = await this.visitorService.rejectVisitorApplication(
        merchantId,
        applicationId,
        parseInt(approvedBy),
        rejectionReason.trim()
      );

      res.status(200).json({
        success: true,
        data: rejectedApplication,
        message: '访客申请已拒绝',
        timestamp: new Date().toISOString()
      } as ApiResponse<VisitorApplication>);
    } catch (error) {
      console.error('拒绝访客申请失败:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '拒绝访客申请失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 批量审批访客申请
   */
  async batchApproveApplications(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;
      const { applicationIds, approvedBy, duration, usageLimit, note } = req.body;

      // 验证商户ID
      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      // 验证申请ID列表
      if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
        res.status(400).json({
          success: false,
          message: '申请ID列表不能为空',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (!approvedBy || isNaN(parseInt(approvedBy))) {
        res.status(400).json({
          success: false,
          message: '审批人ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const options = {
        duration: duration ? parseInt(duration) : undefined,
        usageLimit: usageLimit ? parseInt(usageLimit) : undefined,
        note: note ? (note as string) : undefined
      };

      // 修复exactOptionalPropertyTypes错误
      const cleanOptions: {
        duration?: number;
        usageLimit?: number;
        note?: string;
      } = {};

      if (options.duration !== undefined) cleanOptions.duration = options.duration;
      if (options.usageLimit !== undefined) cleanOptions.usageLimit = options.usageLimit;
      if (options.note !== undefined) cleanOptions.note = options.note;

      const result = await this.visitorService.batchApproveApplications(
        merchantId,
        applicationIds,
        parseInt(approvedBy),
        cleanOptions
      );

      res.status(200).json({
        success: true,
        data: result,
        message: `批量审批完成，成功：${result.success.length}个，失败：${result.failed.length}个`,
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('批量审批访客申请失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '批量审批访客申请失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 批量拒绝访客申请
   */
  async batchRejectApplications(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;
      const { applicationIds, approvedBy, rejectionReason } = req.body;

      // 验证商户ID
      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      // 验证申请ID列表
      if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
        res.status(400).json({
          success: false,
          message: '申请ID列表不能为空',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (!approvedBy || isNaN(parseInt(approvedBy))) {
        res.status(400).json({
          success: false,
          message: '审批人ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (!rejectionReason || rejectionReason.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: '拒绝原因不能为空',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const result = await this.visitorService.batchRejectApplications(
        merchantId,
        applicationIds,
        parseInt(approvedBy),
        rejectionReason.trim()
      );

      res.status(200).json({
        success: true,
        data: result,
        message: `批量拒绝完成，成功：${result.success.length}个，失败：${result.failed.length}个`,
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('批量拒绝访客申请失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '批量拒绝访客申请失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 获取访客申请统计信息
   */
  async getVisitorStats(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;
      const { dateFrom, dateTo } = req.query;

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
        dateFrom: dateFrom ? (dateFrom as string) : undefined,
        dateTo: dateTo ? (dateTo as string) : undefined
      };

      // 修复exactOptionalPropertyTypes错误
      const cleanOptions: {
        dateFrom?: string;
        dateTo?: string;
      } = {};

      if (options.dateFrom !== undefined) cleanOptions.dateFrom = options.dateFrom;
      if (options.dateTo !== undefined) cleanOptions.dateTo = options.dateTo;

      const stats = await this.visitorService.getVisitorStats(merchantId, cleanOptions);

      res.status(200).json({
        success: true,
        data: stats,
        message: '获取访客统计信息成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('获取访客统计信息失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取访客统计信息失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 获取待审批申请数量
   */
  async getPendingApplicationsCount(req: Request, res: Response): Promise<void> {
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

      const count = await this.visitorService.getPendingApplicationsCount(merchantId);

      res.status(200).json({
        success: true,
        data: { count },
        message: '获取待审批申请数量成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('获取待审批申请数量失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取待审批申请数量失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 获取即将过期的申请
   */
  async getExpiringApplications(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = req.params.merchantId ? parseInt(req.params.merchantId) : NaN;
      const { hours } = req.query;

      // 验证商户ID
      if (isNaN(merchantId) || merchantId <= 0) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const hoursNumber = hours ? parseInt(hours as string) : 24;
      const applications = await this.visitorService.getExpiringApplications(merchantId, hoursNumber);

      res.status(200).json({
        success: true,
        data: applications,
        message: '获取即将过期的申请成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('获取即将过期的申请失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取即将过期的申请失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 获取商户列表（供访客选择）
   */
  async getMerchants(req: Request, res: Response): Promise<void> {
    try {
      const merchants = await this.visitorService.getMerchants();

      res.status(200).json({
        success: true,
        data: merchants,
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
   * 提交访客申请
   */
  async submitApplication(req: Request, res: Response): Promise<void> {
    try {
      const {
        merchantId,
        visiteeId,
        visitorName,
        visitorPhone,
        visitorCompany,
        visitPurpose,
        visitType,
        scheduledTime,
        duration
      } = req.body;

      // 验证必填字段
      if (!merchantId || isNaN(parseInt(merchantId))) {
        res.status(400).json({
          success: false,
          message: '商户ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (!visitorName || visitorName.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: '访客姓名不能为空',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (!visitorPhone || !/^1[3-9]\d{9}$/.test(visitorPhone)) {
        res.status(400).json({
          success: false,
          message: '请输入正确的手机号',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (!visitPurpose || visitPurpose.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: '访问目的不能为空',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (!visitType || visitType.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: '访问类型不能为空',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (!scheduledTime) {
        res.status(400).json({
          success: false,
          message: '预约时间不能为空',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (!duration || isNaN(parseInt(duration)) || parseInt(duration) <= 0) {
        res.status(400).json({
          success: false,
          message: '访问时长无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const applicationData = {
        merchantId: parseInt(merchantId),
        visiteeId: visiteeId ? parseInt(visiteeId) : undefined,
        visitorName: visitorName.trim(),
        visitorPhone: visitorPhone.trim(),
        visitorCompany: visitorCompany ? visitorCompany.trim() : undefined,
        visitPurpose: visitPurpose.trim(),
        visitType: visitType.trim(),
        scheduledTime: new Date(scheduledTime),
        duration: parseInt(duration)
      };

      // 修复exactOptionalPropertyTypes错误
      const cleanApplicationData: {
        merchantId: number;
        visiteeId?: number;
        visitorName: string;
        visitorPhone: string;
        visitorCompany?: string;
        visitPurpose: string;
        visitType: string;
        scheduledTime: Date;
        duration: number;
      } = {
        merchantId: applicationData.merchantId,
        visitorName: applicationData.visitorName,
        visitorPhone: applicationData.visitorPhone,
        visitPurpose: applicationData.visitPurpose,
        visitType: applicationData.visitType,
        scheduledTime: applicationData.scheduledTime,
        duration: applicationData.duration
      };

      if (applicationData.visiteeId !== undefined) cleanApplicationData.visiteeId = applicationData.visiteeId;
      if (applicationData.visitorCompany !== undefined) cleanApplicationData.visitorCompany = applicationData.visitorCompany;

      const application = await this.visitorService.submitApplication(cleanApplicationData);

      res.status(201).json({
        success: true,
        data: application,
        message: '访客申请提交成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('提交访客申请失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '提交访客申请失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 获取我的申请列表
   */
  async getMyApplications(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { status } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未登录',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const applications = await this.visitorService.getMyApplications(userId, status ? (status as string) : undefined);

      res.status(200).json({
        success: true,
        data: applications,
        message: '获取申请列表成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('获取申请列表失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取申请列表失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 获取申请详情
   */
  async getApplicationDetail(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const applicationId = req.params.applicationId ? parseInt(req.params.applicationId) : NaN;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未登录',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (isNaN(applicationId) || applicationId <= 0) {
        res.status(400).json({
          success: false,
          message: '申请ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const application = await this.visitorService.getApplicationDetail(userId, applicationId);

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
   * 获取通行码
   */
  async getPasscode(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const applicationId = req.params.applicationId ? parseInt(req.params.applicationId) : NaN;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未登录',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (isNaN(applicationId) || applicationId <= 0) {
        res.status(400).json({
          success: false,
          message: '申请ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const passcode = await this.visitorService.getPasscode(userId, applicationId);

      res.status(200).json({
        success: true,
        data: passcode,
        message: '获取通行码成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('获取通行码失败:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '获取通行码失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 刷新通行码
   */
  async refreshPasscode(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const applicationId = req.params.applicationId ? parseInt(req.params.applicationId) : NaN;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未登录',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (isNaN(applicationId) || applicationId <= 0) {
        res.status(400).json({
          success: false,
          message: '申请ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const passcode = await this.visitorService.refreshPasscode(userId, applicationId);

      res.status(200).json({
        success: true,
        data: passcode,
        message: '刷新通行码成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('刷新通行码失败:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '刷新通行码失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }

  /**
   * 获取访客通行码信息（供访客小程序使用）
   */
  async getVisitorPasscode(req: Request, res: Response): Promise<void> {
    try {
      const applicationId = req.params.applicationId ? parseInt(req.params.applicationId) : NaN;
      const applicantId = req.params.applicantId ? parseInt(req.params.applicantId) : NaN;

      // 验证参数
      if (isNaN(applicationId) || applicationId <= 0) {
        res.status(400).json({
          success: false,
          message: '申请ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      if (isNaN(applicantId) || applicantId <= 0) {
        res.status(400).json({
          success: false,
          message: '申请人ID无效',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const passcodeInfo = await this.visitorService.getVisitorPasscode(applicationId, applicantId);

      res.status(200).json({
        success: true,
        data: passcodeInfo,
        message: '获取访客通行码成功',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } catch (error) {
      console.error('获取访客通行码失败:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '获取访客通行码失败',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }
}