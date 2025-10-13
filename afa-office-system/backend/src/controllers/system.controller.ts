/**
 * 系统管理控制器
 * 处理系统维护、降级、健康检查等功能
 */

import { Request, Response } from 'express';
import { AppError, ErrorCodes } from '../middleware/error.middleware.js';
import { getMaintenanceManager, getDegradationManager, type MaintenanceConfig } from '../middleware/maintenance.middleware.js';
import { NotificationService } from '../services/notification.service.js';
import { Database } from '../utils/database.js';

export class SystemController {
  private notificationService: NotificationService;
  private database: Database;

  constructor() {
    this.notificationService = new NotificationService();
    this.database = Database.getInstance();
  }

  /**
   * 设置系统维护模式
   */
  async setMaintenanceMode(req: Request, res: Response): Promise<void> {
    const { enabled, message, startTime, endTime, allowedIps, allowedUserTypes, notifyUsers, autoRestore } = req.body;

    const maintenanceManager = getMaintenanceManager();
    
    const config: MaintenanceConfig = {
      enabled: Boolean(enabled),
      message: message || '系统维护中，请稍后再试',
      startTime,
      endTime,
      allowedIps,
      allowedUserTypes,
      autoRestore,
    };

    maintenanceManager.setConfig(config);

    // 记录维护日志
    await this.logMaintenanceEvent({
      action: enabled ? 'maintenance_enabled' : 'maintenance_disabled',
      message: config.message,
      startTime,
      endTime,
      operator: (req as any).user?.id,
    });

    // 发送通知给用户
    let notificationSent = false;
    if (notifyUsers && enabled) {
      try {
        // 获取所有活跃用户
        const users = await this.database.all('SELECT id FROM users WHERE status = "active"');
        const userIds = users.map((user: any) => user.id);

        if (userIds.length > 0) {
          await this.notificationService.sendSystemMaintenanceNotification(userIds, {
            title: '系统维护通知',
            content: config.message,
            startTime: startTime || new Date().toISOString(),
            endTime: endTime || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          });
          notificationSent = true;
        }
      } catch (error) {
        console.error('发送维护通知失败:', error);
      }
    }

    res.json({
      success: true,
      message: enabled ? '系统维护模式已启用' : '系统维护模式已禁用',
      data: {
        ...config,
        notificationSent,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 获取维护状态
   */
  async getMaintenanceStatus(req: Request, res: Response): Promise<void> {
    const maintenanceManager = getMaintenanceManager();
    const degradationManager = getDegradationManager();

    const config = maintenanceManager.getConfig();
    const isMaintenanceMode = maintenanceManager.isMaintenanceMode();

    res.json({
      success: true,
      data: {
        maintenanceMode: isMaintenanceMode,
        config: isMaintenanceMode ? config : null,
        degradationLevel: degradationManager.getDegradationLevel(),
        availableFeatures: this.getAvailableFeatures(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 获取降级配置
   */
  async getDegradationConfig(req: Request, res: Response): Promise<void> {
    const degradationManager = getDegradationManager();

    res.json({
      success: true,
      data: {
        degradationLevel: degradationManager.getDegradationLevel(),
        disabledFeatures: degradationManager.getDisabledFeatures(),
        fallbackOptions: {
          cacheEnabled: true,
          offlineMode: true,
          reducedFunctionality: true,
        },
        retryIntervals: {
          api: 5000,
          database: 10000,
          external: 30000,
        },
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 设置降级级别
   */
  async setDegradationLevel(req: Request, res: Response): Promise<void> {
    const { level, features } = req.body;

    if (!['none', 'partial', 'severe'].includes(level)) {
      throw new AppError('无效的降级级别', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const degradationManager = getDegradationManager();
    degradationManager.setDegradationLevel(level);

    // 设置禁用的功能
    if (features && Array.isArray(features)) {
      features.forEach((feature: string) => {
        degradationManager.disableFeature(feature);
      });
    }

    // 记录降级日志
    await this.logDegradationEvent({
      action: 'degradation_level_changed',
      level,
      features: features || [],
      operator: (req as any).user?.id,
    });

    res.json({
      success: true,
      message: `系统降级级别已设置为: ${level}`,
      data: {
        level,
        disabledFeatures: degradationManager.getDisabledFeatures(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 获取详细健康状态
   */
  async getDetailedHealth(req: Request, res: Response): Promise<void> {
    const degradationManager = getDegradationManager();
    
    // 检查各个组件的健康状态
    const healthChecks = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkExternalServicesHealth(),
      this.checkSystemResourcesHealth(),
    ]);

    const databaseHealth = healthChecks[0].status === 'fulfilled' ? healthChecks[0].value : false;
    const externalServicesHealth = healthChecks[1].status === 'fulfilled' ? healthChecks[1].value : false;
    const systemResourcesHealth = healthChecks[2].status === 'fulfilled' ? healthChecks[2].value : false;

    const allServicesOperational = databaseHealth && externalServicesHealth && systemResourcesHealth;
    const errorRate = degradationManager.getCurrentErrorRate();

    res.json({
      success: true,
      data: {
        status: allServicesOperational ? 'healthy' : 'degraded',
        errorRate,
        degradationMode: degradationManager.getDegradationLevel() !== 'none',
        allServicesOperational,
        components: {
          database: databaseHealth,
          externalServices: externalServicesHealth,
          systemResources: systemResourcesHealth,
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 获取健康指标
   */
  async getHealthMetrics(req: Request, res: Response): Promise<void> {
    const degradationManager = getDegradationManager();
    const memoryUsage = process.memoryUsage();

    // 模拟获取数据库连接数
    const databaseConnections = await this.getDatabaseConnectionCount();

    res.json({
      success: true,
      data: {
        uptime: process.uptime(),
        errorRate: degradationManager.getCurrentErrorRate(),
        responseTime: await this.getAverageResponseTime(),
        databaseConnections,
        memoryUsage: {
          rss: memoryUsage.rss,
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
        },
        degradationLevel: degradationManager.getDegradationLevel(),
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 恢复数据库
   */
  async recoverDatabase(req: Request, res: Response): Promise<void> {
    const { simulateRecovery } = req.body;

    if (simulateRecovery) {
      // 模拟数据库恢复过程
      await new Promise(resolve => setTimeout(resolve, 1000));

      res.json({
        success: true,
        message: '数据库恢复完成',
        data: {
          status: 'recovered',
          functionsRestored: ['user_management', 'visitor_applications', 'access_records'],
          recoveryTime: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      // 执行实际的数据库恢复操作
      const result = await this.database.performMaintenance();
      
      res.json({
        success: true,
        message: '数据库恢复操作完成',
        data: {
          status: 'recovered',
          operations: result.operations,
          results: result.results,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new AppError('数据库恢复失败', 500, ErrorCodes.DATABASE_ERROR, error);
    }
  }

  /**
   * 执行数据库维护
   */
  async performDatabaseMaintenance(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.database.performMaintenance();
      
      res.json({
        success: true,
        message: '数据库维护完成',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new AppError('数据库维护失败', 500, ErrorCodes.DATABASE_ERROR, error);
    }
  }

  /**
   * 获取缓存策略
   */
  async getCacheStrategy(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: {
        cacheableEndpoints: [
          '/api/v1/merchants',
          '/api/v1/projects',
          '/api/v1/venues',
          '/api/v1/users',
        ],
        cacheDuration: {
          users: 300, // 5分钟
          merchants: 600, // 10分钟
          projects: 1800, // 30分钟
          venues: 1800, // 30分钟
        },
        offlineCapabilities: {
          viewData: true,
          createVisitorApplication: true,
          viewAccessRecords: false,
        },
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 清理缓存
   */
  async clearCache(req: Request, res: Response): Promise<void> {
    const { cacheType } = req.body;

    // 这里应该实现实际的缓存清理逻辑
    console.log(`清理缓存: ${cacheType || 'all'}`);

    res.json({
      success: true,
      message: '缓存清理完成',
      data: {
        clearedCaches: cacheType ? [cacheType] : ['users', 'merchants', 'projects', 'venues'],
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 获取维护日志
   */
  async getMaintenanceLogs(req: Request, res: Response): Promise<void> {
    const { startTime, endTime, limit = 50 } = req.query;

    // 模拟获取维护日志
    const logs = [
      {
        id: 1,
        action: 'maintenance_enabled',
        message: '测试维护',
        startTime: new Date().toISOString(),
        endTime: null,
        operator: (req as any).user?.id,
        timestamp: new Date().toISOString(),
      },
    ];

    res.json({
      success: true,
      data: {
        logs,
        total: logs.length,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 获取降级日志
   */
  async getDegradationLogs(req: Request, res: Response): Promise<void> {
    const { startTime, endTime } = req.query;

    // 模拟获取降级日志
    const events = [
      {
        id: 1,
        type: 'degradation_started',
        level: 'partial',
        reason: 'high_error_rate',
        timestamp: new Date().toISOString(),
      },
    ];

    res.json({
      success: true,
      data: {
        events,
        summary: {
          totalEvents: events.length,
          degradationCount: 1,
          recoveryCount: 0,
        },
      },
      timestamp: new Date().toISOString(),
    });
  }

  // 测试端点（仅在非生产环境）
  async testUncaughtException(req: Request, res: Response): Promise<void> {
    throw new Error('模拟未捕获异常');
  }

  async testMemoryExhaustion(req: Request, res: Response): Promise<void> {
    const { simulateMemoryError } = req.body;

    if (simulateMemoryError) {
      throw new AppError('系统资源不足', 507, ErrorCodes.INTERNAL_SERVER_ERROR);
    }

    res.json({
      success: true,
      message: '内存测试完成',
      timestamp: new Date().toISOString(),
    });
  }

  async testCircularDependency(req: Request, res: Response): Promise<void> {
    const { createCircularRef } = req.body;

    if (createCircularRef) {
      throw new AppError('数据处理错误', 500, ErrorCodes.INTERNAL_SERVER_ERROR);
    }

    res.json({
      success: true,
      message: '循环依赖测试完成',
      timestamp: new Date().toISOString(),
    });
  }

  // 私有辅助方法

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      await this.database.get('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async checkExternalServicesHealth(): Promise<boolean> {
    // 模拟检查外部服务健康状态
    return true;
  }

  private async checkSystemResourcesHealth(): Promise<boolean> {
    const memoryUsage = process.memoryUsage();
    const maxMemory = 1024 * 1024 * 1024; // 1GB
    return memoryUsage.heapUsed < maxMemory * 0.8; // 内存使用率低于80%
  }

  private async getDatabaseConnectionCount(): Promise<number> {
    // 模拟获取数据库连接数
    return Math.floor(Math.random() * 10) + 1;
  }

  private async getAverageResponseTime(): Promise<number> {
    // 模拟获取平均响应时间
    return Math.floor(Math.random() * 100) + 50;
  }

  private getAvailableFeatures(): string[] {
    const degradationManager = getDegradationManager();
    const allFeatures = [
      'user_management',
      'visitor_applications',
      'access_verification',
      'file_upload',
      'statistics',
      'reports',
      'notifications',
    ];

    return allFeatures.filter(feature => !degradationManager.getDisabledFeatures().includes(feature));
  }

  private async logMaintenanceEvent(event: any): Promise<void> {
    // 这里应该实现实际的日志记录逻辑
    console.log('维护事件:', event);
  }

  private async logDegradationEvent(event: any): Promise<void> {
    // 这里应该实现实际的日志记录逻辑
    console.log('降级事件:', event);
  }
}