import { Request, Response, NextFunction } from 'express';
import { PasscodeService } from '../services/passcode.service.js';
import { AccessRecordService } from '../services/access-record.service.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import type { ApiResponse, AccessRecordQuery, AccessStatsQuery } from '../types/index.js';

/**
 * 通行控制器
 * 处理通行码验证和通行记录相关的HTTP请求
 */
export class AccessController {
  constructor() {
    // 使用静态方法，不需要实例化服务
  }

  /**
   * 验证通行码
   */
  validatePasscode = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { code, deviceId, direction, deviceType, projectId, venueId, floorId } = req.body;
    
    if (!code || !deviceId) {
      const response: ApiResponse = {
        success: false,
        message: '通行码和设备ID不能为空',
        data: null,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }
    
    const result = await PasscodeService.validatePasscode(code, deviceId);

    if (result.valid) {
      // 记录通行日志
      await AccessRecordService.recordAccess({
        user_id: result.userId!,
        passcode_id: result.passcodeId,
        device_id: deviceId,
        device_type: deviceType,
        direction: direction || 'in',
        result: 'success',
        project_id: projectId,
        venue_id: venueId,
        floor_id: floorId,
        timestamp: new Date().toISOString(),
      });
    } else {
      // 记录失败日志
      await AccessRecordService.recordAccess({
        user_id: result.userId || 0,
        passcode_id: result.passcodeId,
        device_id: deviceId,
        device_type: deviceType,
        direction: direction || 'in',
        result: 'failed',
        fail_reason: result.reason,
        project_id: projectId,
        venue_id: venueId,
        floor_id: floorId,
        timestamp: new Date().toISOString(),
      });
    }

    const response: ApiResponse = {
      success: result.valid,
      message: result.valid ? '通行验证成功' : result.reason || '通行验证失败',
      data: {
        valid: result.valid,
        user_id: result.userId,
        userName: result.userName,
        userType: result.userType,
        permissions: result.permissions,
        reason: result.reason,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 获取通行记录
   */
  getAccessRecords = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // 构建查询参数，处理可选字段
    const query: AccessRecordQuery = {
      page: parseInt(req.query['page'] as string) || 1,
      limit: parseInt(req.query['limit'] as string) || 10,
      result: req.query['result'] as 'success' | 'failed',
      startDate: req.query['startDate'] as string,
      endDate: req.query['endDate'] as string,
      sortBy: req.query['sortBy'] as string,
      sortOrder: req.query['sortOrder'] as 'asc' | 'desc',
    };

    // 处理可选的 userId 字段
    if (req.query['userId'] !== undefined) {
      query.userId = parseInt(req.query['userId'] as string);
    }

    // 处理可选的 deviceId 字段
    if (req.query['deviceId'] !== undefined) {
      query.deviceId = req.query['deviceId'] as string;
    }

    const result = await AccessRecordService.getAccessRecords(query);

    const response: ApiResponse = {
      success: true,
      message: '获取通行记录成功',
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 获取用户通行记录
   */
  getUserAccessRecords = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userIdParam = req.params['userId'];
    if (!userIdParam) {
      const response: ApiResponse = {
        success: false,
        message: '用户ID不能为空',
        data: null,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    const userId = parseInt(userIdParam);
    const query = {
      page: parseInt(req.query['page'] as string) || 1,
      limit: parseInt(req.query['limit'] as string) || 10,
      startDate: req.query['startDate'] as string,
      endDate: req.query['endDate'] as string,
      sortBy: req.query['sortBy'] as string,
      sortOrder: req.query['sortOrder'] as 'asc' | 'desc',
    };

    const result = await AccessRecordService.getUserAccessRecords(userId, query);

    const response: ApiResponse = {
      success: true,
      message: '获取用户通行记录成功',
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 获取设备通行记录
   */
  getDeviceAccessRecords = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const deviceId = req.params['deviceId'];
    if (!deviceId) {
      const response: ApiResponse = {
        success: false,
        message: '设备ID不能为空',
        data: null,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    const query = {
      page: parseInt(req.query['page'] as string) || 1,
      limit: parseInt(req.query['limit'] as string) || 10,
      startDate: req.query['startDate'] as string,
      endDate: req.query['endDate'] as string,
      sortBy: req.query['sortBy'] as string,
      sortOrder: req.query['sortOrder'] as 'asc' | 'desc',
    };

    const result = await AccessRecordService.getDeviceAccessRecords(deviceId, query);

    const response: ApiResponse = {
      success: true,
      message: '获取设备通行记录成功',
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 获取通行统计信息
   */
  getAccessStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // 构建查询参数，处理可选字段
    const query: AccessStatsQuery = {
      startDate: req.query['startDate'] as string,
      endDate: req.query['endDate'] as string,
    };

    // 处理可选的 merchantId 字段
    if (req.query['merchantId'] !== undefined) {
      query.merchantId = parseInt(req.query['merchantId'] as string);
    }

    // 处理可选的 deviceId 字段
    if (req.query['deviceId'] !== undefined) {
      query.deviceId = req.query['deviceId'] as string;
    }

    const stats = await AccessRecordService.getAccessStats(query);

    const response: ApiResponse = {
      success: true,
      message: '获取通行统计信息成功',
      data: stats,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 获取实时通行状态
   */
  getRealtimeStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const deviceId = req.query['deviceId'] as string;
    const status = await AccessRecordService.getRealtimeStatus(deviceId);

    const response: ApiResponse = {
      success: true,
      message: '获取实时通行状态成功',
      data: status,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 获取通行码信息（用于硬件设备）
   */
  getPasscodeInfo = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const code = req.params['code'];
    if (!code) {
      const response: ApiResponse = {
        success: false,
        message: '通行码不能为空',
        data: null,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    const info = await PasscodeService.getPasscodeInfo(code);

    const response: ApiResponse = {
      success: true,
      message: '获取通行码信息成功',
      data: info,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 刷新通行码（用于员工）
   */
  refreshPasscode = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      const response: ApiResponse = {
        success: false,
        message: '用户未认证',
        data: null,
        timestamp: new Date().toISOString(),
      };
      res.status(401).json(response);
      return;
    }

    const passcode = await PasscodeService.refreshPasscode(userId);

    const response: ApiResponse = {
      success: true,
      message: '刷新通行码成功',
      data: passcode,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 获取用户当前通行码
   */
  getCurrentPasscode = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      const response: ApiResponse = {
        success: false,
        message: '用户未认证',
        data: null,
        timestamp: new Date().toISOString(),
      };
      res.status(401).json(response);
      return;
    }

    const passcode = await PasscodeService.getCurrentPasscode(userId);

    const response: ApiResponse = {
      success: true,
      message: '获取当前通行码成功',
      data: passcode,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 验证二维码通行码（用于硬件设备）
   */
  validateQRPasscode = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { qrContent, deviceId, direction, deviceType, projectId, venueId, floorId } = req.body;
    
    if (!qrContent || !deviceId) {
      const response: ApiResponse = {
        success: false,
        message: '二维码内容和设备ID不能为空',
        data: null,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }
    
    const result = await PasscodeService.validateQRPasscode(qrContent, deviceId);

    if (result.valid) {
      // 记录通行日志
      await AccessRecordService.recordAccess({
        user_id: result.userId!,
        passcode_id: result.passcodeId,
        device_id: deviceId,
        device_type: deviceType,
        direction: direction || 'in',
        result: 'success',
        project_id: projectId,
        venue_id: venueId,
        floor_id: floorId,
        timestamp: new Date().toISOString(),
      });
    } else {
      // 记录失败日志
      await AccessRecordService.recordAccess({
        user_id: result.userId || 0,
        passcode_id: result.passcodeId,
        device_id: deviceId,
        device_type: deviceType,
        direction: direction || 'in',
        result: 'failed',
        fail_reason: result.reason,
        project_id: projectId,
        venue_id: venueId,
        floor_id: floorId,
        timestamp: new Date().toISOString(),
      });
    }

    const response: ApiResponse = {
      success: result.valid,
      message: result.valid ? '二维码验证成功' : result.reason || '二维码验证失败',
      data: {
        valid: result.valid,
        user_id: result.userId,
        userName: result.userName,
        userType: result.userType,
        permissions: result.permissions,
        reason: result.reason,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  /**
   * 验证时效性通行码（用于硬件设备）
   */
  validateTimeBasedPasscode = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { timeBasedCode, baseCode, deviceId, direction, deviceType, projectId, venueId, floorId } = req.body;
    
    if (!timeBasedCode || !baseCode || !deviceId) {
      const response: ApiResponse = {
        success: false,
        message: '时效性通行码、基础码和设备ID不能为空',
        data: null,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }
    
    const result = await PasscodeService.validateTimeBasedPasscode(timeBasedCode, baseCode, deviceId);

    if (result.valid) {
      // 记录通行日志
      await AccessRecordService.recordAccess({
        user_id: result.userId!,
        passcode_id: result.passcodeId,
        device_id: deviceId,
        device_type: deviceType,
        direction: direction || 'in',
        result: 'success',
        project_id: projectId,
        venue_id: venueId,
        floor_id: floorId,
        timestamp: new Date().toISOString(),
      });
    } else {
      // 记录失败日志
      await AccessRecordService.recordAccess({
        user_id: result.userId || 0,
        passcode_id: result.passcodeId,
        device_id: deviceId,
        device_type: deviceType,
        direction: direction || 'in',
        result: 'failed',
        fail_reason: result.reason,
        project_id: projectId,
        venue_id: venueId,
        floor_id: floorId,
        timestamp: new Date().toISOString(),
      });
    }

    const response: ApiResponse = {
      success: result.valid,
      message: result.valid ? '时效性通行码验证成功' : result.reason || '时效性通行码验证失败',
      data: {
        valid: result.valid,
        user_id: result.userId,
        userName: result.userName,
        userType: result.userType,
        permissions: result.permissions,
        reason: result.reason,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });
}