/**
 * 系统维护模式中间件
 * 处理系统维护状态检查和访问控制
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from './error.middleware.js';

export interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  startTime?: string;
  endTime?: string;
  allowedIps?: string[];
  allowedUserTypes?: string[];
  autoRestore?: boolean;
}

/**
 * 系统维护状态管理器
 */
class MaintenanceManager {
  private static instance: MaintenanceManager;
  private config: MaintenanceConfig = {
    enabled: false,
    message: '系统维护中，请稍后再试',
  };
  private autoRestoreTimer: NodeJS.Timeout | null = null;

  static getInstance(): MaintenanceManager {
    if (!MaintenanceManager.instance) {
      MaintenanceManager.instance = new MaintenanceManager();
    }
    return MaintenanceManager.instance;
  }

  /**
   * 设置维护配置
   */
  setConfig(config: Partial<MaintenanceConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 设置自动恢复定时器
    if (config.endTime && config.autoRestore) {
      this.setupAutoRestore(config.endTime);
    }
    
    console.log(`🔧 系统维护模式${config.enabled ? '启用' : '禁用'}:`, this.config.message);
  }

  /**
   * 获取当前维护配置
   */
  getConfig(): MaintenanceConfig {
    return { ...this.config };
  }

  /**
   * 检查是否处于维护模式
   */
  isMaintenanceMode(): boolean {
    // 检查是否启用
    if (!this.config.enabled) {
      return false;
    }

    // 检查时间范围
    const now = new Date();
    if (this.config.startTime && new Date(this.config.startTime) > now) {
      return false;
    }
    if (this.config.endTime && new Date(this.config.endTime) < now) {
      // 自动禁用过期的维护模式
      this.config.enabled = false;
      return false;
    }

    return true;
  }

  /**
   * 检查用户是否被允许访问
   */
  isUserAllowed(req: Request): boolean {
    if (!this.isMaintenanceMode()) {
      return true;
    }

    // 检查IP白名单
    if (this.config.allowedIps && this.config.allowedIps.length > 0) {
      const clientIp = req.ip || req.connection.remoteAddress || '';
      if (this.config.allowedIps.includes(clientIp)) {
        return true;
      }
    }

    // 检查用户类型白名单
    if (this.config.allowedUserTypes && this.config.allowedUserTypes.length > 0) {
      const user = (req as any).user;
      if (user && this.config.allowedUserTypes.includes(user.user_type)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 设置自动恢复定时器
   */
  private setupAutoRestore(endTime: string): void {
    if (this.autoRestoreTimer) {
      clearTimeout(this.autoRestoreTimer);
    }

    const endDate = new Date(endTime);
    const delay = endDate.getTime() - Date.now();

    if (delay > 0) {
      this.autoRestoreTimer = setTimeout(() => {
        this.config.enabled = false;
        console.log('🔧 系统维护模式自动结束');
      }, delay);
    }
  }

  /**
   * 清理定时器
   */
  cleanup(): void {
    if (this.autoRestoreTimer) {
      clearTimeout(this.autoRestoreTimer);
      this.autoRestoreTimer = null;
    }
  }
}

/**
 * 维护模式检查中间件
 */
export const maintenanceCheck = (req: Request, res: Response, next: NextFunction): void => {
  const manager = MaintenanceManager.getInstance();

  // 跳过健康检查和维护管理接口
  if (req.path === '/health' || req.path.startsWith('/api/v1/system/maintenance')) {
    return next();
  }

  if (!manager.isUserAllowed(req)) {
    const config = manager.getConfig();
    throw new AppError(
      config.message,
      503,
      ErrorCodes.SERVICE_UNAVAILABLE,
      {
        maintenanceMode: true,
        startTime: config.startTime,
        endTime: config.endTime,
      }
    );
  }

  next();
};

/**
 * 获取维护管理器实例
 */
export const getMaintenanceManager = (): MaintenanceManager => {
  return MaintenanceManager.getInstance();
};

/**
 * 系统降级状态管理器
 */
class DegradationManager {
  private static instance: DegradationManager;
  private degradationLevel: 'none' | 'partial' | 'severe' = 'none';
  private disabledFeatures: Set<string> = new Set();
  private errorRateThreshold = 0.05; // 5%错误率阈值
  private currentErrorRate = 0;

  static getInstance(): DegradationManager {
    if (!DegradationManager.instance) {
      DegradationManager.instance = new DegradationManager();
    }
    return DegradationManager.instance;
  }

  /**
   * 设置降级级别
   */
  setDegradationLevel(level: 'none' | 'partial' | 'severe'): void {
    this.degradationLevel = level;
    console.log(`📉 系统降级级别设置为: ${level}`);
  }

  /**
   * 获取当前降级级别
   */
  getDegradationLevel(): string {
    return this.degradationLevel;
  }

  /**
   * 禁用功能
   */
  disableFeature(feature: string): void {
    this.disabledFeatures.add(feature);
    console.log(`🚫 功能已禁用: ${feature}`);
  }

  /**
   * 启用功能
   */
  enableFeature(feature: string): void {
    this.disabledFeatures.delete(feature);
    console.log(`✅ 功能已启用: ${feature}`);
  }

  /**
   * 检查功能是否可用
   */
  isFeatureEnabled(feature: string): boolean {
    return !this.disabledFeatures.has(feature);
  }

  /**
   * 获取禁用的功能列表
   */
  getDisabledFeatures(): string[] {
    return Array.from(this.disabledFeatures);
  }

  /**
   * 更新错误率
   */
  updateErrorRate(rate: number): void {
    this.currentErrorRate = rate;
    
    // 根据错误率自动调整降级级别
    if (rate > this.errorRateThreshold * 2) {
      this.setDegradationLevel('severe');
    } else if (rate > this.errorRateThreshold) {
      this.setDegradationLevel('partial');
    } else {
      this.setDegradationLevel('none');
    }
  }

  /**
   * 获取当前错误率
   */
  getCurrentErrorRate(): number {
    return this.currentErrorRate;
  }

  /**
   * 检查是否应该降级服务
   */
  shouldDegrade(feature: string): boolean {
    if (this.degradationLevel === 'none') {
      return false;
    }

    // 严重降级时禁用非关键功能
    if (this.degradationLevel === 'severe') {
      const criticalFeatures = ['authentication', 'access_verification'];
      return !criticalFeatures.includes(feature);
    }

    // 部分降级时禁用统计和报表功能
    if (this.degradationLevel === 'partial') {
      const nonCriticalFeatures = ['statistics', 'reports', 'file_upload'];
      return nonCriticalFeatures.includes(feature);
    }

    return false;
  }
}

/**
 * 服务降级检查中间件
 */
export const degradationCheck = (feature: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const manager = DegradationManager.getInstance();

    if (manager.shouldDegrade(feature)) {
      throw new AppError(
        '服务暂时不可用，系统正在降级运行',
        503,
        ErrorCodes.SERVICE_UNAVAILABLE,
        {
          degraded: true,
          feature,
          degradationLevel: manager.getDegradationLevel(),
          retryAfter: 60, // 建议60秒后重试
        }
      );
    }

    next();
  };
};

/**
 * 获取降级管理器实例
 */
export const getDegradationManager = (): DegradationManager => {
  return DegradationManager.getInstance();
};