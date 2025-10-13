/**
 * 文件上传下载控制器
 * 处理文件上传、下载、删除等操作
 */

import { Request, Response, NextFunction } from 'express';
import { FileService } from '../services/file.service.js';
import { AppError, ErrorCodes } from '../middleware/error.middleware.js';
import type { UploadedFile } from '../types/index.js';
import type { Express } from 'express';

export class FileController {
  private fileService: FileService;

  constructor() {
    this.fileService = new FileService();
  }

  /**
   * 上传文件
   */
  uploadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 模拟存储空间不足
      if (req.body.simulateStorageFull === 'true') {
        throw new AppError('存储空间不足，无法上传文件', 507, ErrorCodes.SERVICE_UNAVAILABLE);
      }

      const file = req.file as Express.Multer.File;
      if (!file) {
        throw new AppError('未选择文件', 400, ErrorCodes.VALIDATION_ERROR);
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('用户未认证', 401, ErrorCodes.UNAUTHORIZED);
      }

      const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};
      
      const result = await this.fileService.uploadFile(file, {
        userId,
        ...metadata
      });

      res.json({
        success: true,
        data: result,
        message: '文件上传成功',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 下载文件
   */
  downloadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('用户未认证', 401, ErrorCodes.UNAUTHORIZED);
      }

      const fileInfo = await this.fileService.getFileInfo(fileId);
      if (!fileInfo) {
        throw new AppError('文件不存在', 404, ErrorCodes.NOT_FOUND);
      }

      // 检查文件访问权限
      const hasAccess = await this.fileService.checkFileAccess(fileId, userId);
      if (!hasAccess) {
        throw new AppError('无权访问此文件', 403, ErrorCodes.FORBIDDEN);
      }

      const filePath = await this.fileService.getFilePath(fileId);
      
      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.originalName}"`);
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取文件信息
   */
  getFileInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('用户未认证', 401, ErrorCodes.UNAUTHORIZED);
      }

      const fileInfo = await this.fileService.getFileInfo(fileId);
      if (!fileInfo) {
        throw new AppError('文件不存在', 404, ErrorCodes.NOT_FOUND);
      }

      // 检查文件访问权限
      const hasAccess = await this.fileService.checkFileAccess(fileId, userId);
      if (!hasAccess) {
        throw new AppError('无权访问此文件', 403, ErrorCodes.FORBIDDEN);
      }

      res.json({
        success: true,
        data: fileInfo,
        message: '获取文件信息成功',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 删除文件
   */
  deleteFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('用户未认证', 401, ErrorCodes.UNAUTHORIZED);
      }

      const fileInfo = await this.fileService.getFileInfo(fileId);
      if (!fileInfo) {
        throw new AppError('文件不存在', 404, ErrorCodes.NOT_FOUND);
      }

      // 检查文件删除权限
      const canDelete = await this.fileService.checkFileDeletePermission(fileId, userId);
      if (!canDelete) {
        throw new AppError('无权删除此文件', 403, ErrorCodes.FORBIDDEN);
      }

      await this.fileService.deleteFile(fileId);

      res.json({
        success: true,
        data: null,
        message: '文件删除成功',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取用户文件列表
   */
  getUserFiles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('用户未认证', 401, ErrorCodes.UNAUTHORIZED);
      }

      const { page = 1, limit = 20, type } = req.query;
      
      const result = await this.fileService.getUserFiles(userId, {
        page: Number(page),
        limit: Number(limit),
        type: type as string
      });

      res.json({
        success: true,
        data: result,
        message: '获取文件列表成功',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  };
}