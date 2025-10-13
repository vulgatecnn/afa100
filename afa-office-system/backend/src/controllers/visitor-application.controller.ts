/**
 * 访客申请控制器
 */

import { Request, Response } from 'express';
import { AppError, ErrorCodes } from '../middleware/error.middleware.js';
import { Database } from '../utils/database.js';
import { NotificationService } from '../services/notification.service.js';

export class VisitorApplicationController {
  private database: Database;
  private notificationService: NotificationService;

  constructor() {
    this.database = Database.getInstance();
    this.notificationService = new NotificationService();
  }

  /**
   * 获取访客申请列表
   */
  async getVisitorApplications(req: Request, res: Response): Promise<void> {
    const { simulateHighLoad } = req.query;

    // 模拟高负载情况
    if (simulateHighLoad === 'true') {
      throw new AppError('系统负载过高，统计功能暂时不可用', 503, ErrorCodes.SERVICE_UNAVAILABLE, {
        retryAfter: 60,
      });
    }

    try {
      const applications = await this.database.all(
        'SELECT * FROM visitor_applications ORDER BY created_at DESC'
      );
      
      res.json({
        success: true,
        data: {
          items: applications,
          total: applications.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new AppError('获取访客申请列表失败', 500, ErrorCodes.DATABASE_ERROR, error);
    }
  }

  /**
   * 获取单个访客申请
   */
  async getVisitorApplication(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const application = await this.database.get(
        'SELECT * FROM visitor_applications WHERE id = ?',
        [id]
      );
      
      if (!application) {
        throw new AppError('访客申请不存在', 404, ErrorCodes.VISITOR_APPLICATION_NOT_FOUND);
      }

      res.json({
        success: true,
        data: application,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('获取访客申请失败', 500, ErrorCodes.DATABASE_ERROR, error);
    }
  }

  /**
   * 创建访客申请
   */
  async createVisitorApplication(req: Request, res: Response): Promise<void> {
    const { simulateWechatFailure, simulateTimeout } = req.body;
    const applicationData = req.body;

    try {
      const result = await this.database.run(
        `INSERT INTO visitor_applications 
         (visitor_name, visitor_phone, visitor_company, visit_purpose, visit_type, 
          scheduled_time, duration, status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          applicationData.visitor_name,
          applicationData.visitor_phone,
          applicationData.visitor_company,
          applicationData.visit_purpose,
          applicationData.visit_type,
          applicationData.scheduled_time,
          applicationData.duration,
          'pending',
          new Date().toISOString()
        ]
      );

      const newApplication = await this.database.get(
        'SELECT * FROM visitor_applications WHERE id = ?',
        [result.lastID]
      );

      const warnings: string[] = [];

      // 模拟微信服务失败
      if (simulateWechatFailure === 'true') {
        warnings.push('微信通知发送失败，已使用短信通知');
      }

      // 模拟第三方服务超时
      if (simulateTimeout === 'true') {
        warnings.push('第三方服务响应超时');
      }

      const response: any = {
        success: true,
        data: newApplication,
        message: '访客申请创建成功',
        timestamp: new Date().toISOString(),
      };

      if (warnings.length > 0) {
        response.warnings = warnings;
      }

      res.status(201).json(response);
    } catch (error) {
      throw new AppError('创建访客申请失败', 500, ErrorCodes.DATABASE_ERROR, error);
    }
  }

  /**
   * 审批访客申请
   */
  async approveVisitorApplication(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const approvalData = req.body;

    try {
      const application = await this.database.get(
        'SELECT * FROM visitor_applications WHERE id = ?',
        [id]
      );
      
      if (!application) {
        throw new AppError('访客申请不存在', 404, ErrorCodes.VISITOR_APPLICATION_NOT_FOUND);
      }

      await this.database.run(
        'UPDATE visitor_applications SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?',
        ['approved', (req as any).user?.id, new Date().toISOString(), id]
      );

      const updatedApplication = await this.database.get(
        'SELECT * FROM visitor_applications WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        data: updatedApplication,
        message: '访客申请审批成功',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('审批访客申请失败', 500, ErrorCodes.DATABASE_ERROR, error);
    }
  }

  /**
   * 拒绝访客申请
   */
  async rejectVisitorApplication(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const rejectionData = req.body;

    try {
      const application = await this.database.get(
        'SELECT * FROM visitor_applications WHERE id = ?',
        [id]
      );
      
      if (!application) {
        throw new AppError('访客申请不存在', 404, ErrorCodes.VISITOR_APPLICATION_NOT_FOUND);
      }

      await this.database.run(
        'UPDATE visitor_applications SET status = ?, rejected_by = ?, rejected_at = ?, rejection_reason = ? WHERE id = ?',
        ['rejected', (req as any).user?.id, new Date().toISOString(), rejectionData.reason, id]
      );

      const updatedApplication = await this.database.get(
        'SELECT * FROM visitor_applications WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        data: updatedApplication,
        message: '访客申请已拒绝',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('拒绝访客申请失败', 500, ErrorCodes.DATABASE_ERROR, error);
    }
  }

  /**
   * 批量审批访客申请
   */
  async batchApproveVisitorApplications(req: Request, res: Response): Promise<void> {
    const { ids, ...approvalData } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('请提供有效的申请ID列表', 400, ErrorCodes.VALIDATION_ERROR);
    }

    try {
      const results = [];
      
      for (const id of ids) {
        const application = await this.database.get(
          'SELECT * FROM visitor_applications WHERE id = ?',
          [id]
        );
        
        if (application) {
          await this.database.run(
            'UPDATE visitor_applications SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?',
            ['approved', (req as any).user?.id, new Date().toISOString(), id]
          );

          const updatedApplication = await this.database.get(
            'SELECT * FROM visitor_applications WHERE id = ?',
            [id]
          );

          results.push(updatedApplication);
        }
      }

      res.json({
        success: true,
        data: results,
        message: `成功审批 ${results.length} 个访客申请`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new AppError('批量审批失败', 500, ErrorCodes.DATABASE_ERROR, error);
    }
  }
}