/**
 * 统计数据控制器
 */

import { Request, Response } from 'express';
import { AppError, ErrorCodes } from '../middleware/error.middleware.js';
import { Database } from '../utils/database.js';

export class StatisticsController {
  private database: Database;

  constructor() {
    this.database = Database.getInstance();
  }

  /**
   * 获取访客统计数据
   */
  async getVisitorStatistics(req: Request, res: Response): Promise<void> {
    const { simulateHighLoad } = req.query;

    // 模拟高负载情况
    if (simulateHighLoad === 'true') {
      throw new AppError('系统负载过高，统计功能暂时不可用', 503, ErrorCodes.SERVICE_UNAVAILABLE, {
        retryAfter: 60,
      });
    }

    try {
      // 模拟统计数据
      const statistics = {
        totalVisitors: 1250,
        todayVisitors: 45,
        pendingApplications: 12,
        approvedApplications: 38,
        rejectedApplications: 5,
        averageProcessingTime: 2.5, // 小时
        topVisitPurposes: [
          { purpose: '商务洽谈', count: 520 },
          { purpose: '技术交流', count: 380 },
          { purpose: '参观访问', count: 250 },
          { purpose: '其他', count: 100 },
        ],
      };

      res.json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new AppError('获取访客统计失败', 500, ErrorCodes.DATABASE_ERROR, error);
    }
  }

  /**
   * 获取通行统计数据
   */
  async getAccessStatistics(req: Request, res: Response): Promise<void> {
    const { simulateHighLoad } = req.query;

    // 模拟高负载情况
    if (simulateHighLoad === 'true') {
      throw new AppError('系统负载过高，统计功能暂时不可用', 503, ErrorCodes.SERVICE_UNAVAILABLE, {
        retryAfter: 60,
      });
    }

    try {
      // 模拟统计数据
      const statistics = {
        totalAccess: 5680,
        todayAccess: 234,
        successfulAccess: 5456,
        failedAccess: 224,
        averageAccessTime: 1.2, // 秒
        peakHours: [
          { hour: 9, count: 145 },
          { hour: 14, count: 132 },
          { hour: 18, count: 98 },
        ],
      };

      res.json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new AppError('获取通行统计失败', 500, ErrorCodes.DATABASE_ERROR, error);
    }
  }
}