import { Request, Response, NextFunction } from 'express';
import { FileService } from '../services/file.service.js';
import { AppError, ErrorCodes } from '../middleware/error.middleware.js';
import type { ApiResponse, AuthenticatedRequest } from '../types/index.js';

/**
 * 文件控制器
 * 处理文件上传、下载、管理等HTTP请求
 */
export class FileController {
  private fileService: FileService;

  constructor() {
    this.fileService = new FileService();
  }

  /**
   * 上传文件
   */
  uploadFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const files = req.files as Express.Multer.File[] | undefined;

      if (!userId) {
        throw new AppError('用户未认证', 401, ErrorCodes.UNAUTHORIZED);
      }

      if (!files || files.length === 0) {
        throw new AppError('请提供要上传的文件', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
      }

      // 处理单个文件上传
      const file = files[0];
      if (!file) {
        throw new AppError('文件数据不完整', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
      }

      const metadata = {
        userId,
        category: req.body.category,
        description: req.body.description,
        isPublic: req.body.isPublic === 'true'
      };

      const result = await this.fileService.uploadFile(file, metadata);

      res.status(201).json({
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
  downloadFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fileIdParam = req.params['fileId'];
      const userId = req.user?.id;

      if (!fileIdParam) {
        throw new AppError('文件ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
      }

      if (!userId) {
        throw new AppError('用户未认证', 401, ErrorCodes.UNAUTHORIZED);
      }

      const fileInfo = await this.fileService.getFileInfo(fileIdParam);
      if (!fileInfo) {
        throw new AppError('文件不存在', 404, ErrorCodes.NOT_FOUND);
      }

      // 检查文件访问权限
      const hasAccess = await this.fileService.checkFileAccess(fileIdParam, userId);
      if (!hasAccess) {
        throw new AppError('无权访问此文件', 403, ErrorCodes.FORBIDDEN);
      }

      const filePath = await this.fileService.getFilePath(fileIdParam);
      
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
  getFileInfo = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fileIdParam = req.params['fileId'];
      const userId = req.user?.id;

      if (!fileIdParam) {
        throw new AppError('文件ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
      }

      if (!userId) {
        throw new AppError('用户未认证', 401, ErrorCodes.UNAUTHORIZED);
      }

      const fileInfo = await this.fileService.getFileInfo(fileIdParam);
      if (!fileInfo) {
        throw new AppError('文件不存在', 404, ErrorCodes.NOT_FOUND);
      }

      // 检查文件访问权限
      const hasAccess = await this.fileService.checkFileAccess(fileIdParam, userId);
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
  deleteFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fileIdParam = req.params['fileId'];
      const userId = req.user?.id;

      if (!fileIdParam) {
        throw new AppError('文件ID不能为空', 400, ErrorCodes.MISSING_REQUIRED_FIELD);
      }

      if (!userId) {
        throw new AppError('用户未认证', 401, ErrorCodes.UNAUTHORIZED);
      }

      const fileInfo = await this.fileService.getFileInfo(fileIdParam);
      if (!fileInfo) {
        throw new AppError('文件不存在', 404, ErrorCodes.NOT_FOUND);
      }

      // 检查文件删除权限
      const canDelete = await this.fileService.checkFileDeletePermission(fileIdParam, userId);
      if (!canDelete) {
        throw new AppError('无权删除此文件', 403, ErrorCodes.FORBIDDEN);
      }

      await this.fileService.deleteFile(fileIdParam);

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
  getUserFiles = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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