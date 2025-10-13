/**
 * 文件服务
 * 处理文件上传、存储、访问权限等业务逻辑
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FileModel } from '../models/file.model.js';
import { AppError, ErrorCodes } from '../middleware/error.middleware.js';
import { appConfig } from '../config/app.config.js';
import type { UploadedFile } from '../types/index.js';
import type { Express } from 'express';

export interface FileMetadata {
  userId: number;
  category?: string;
  description?: string;
  isPublic?: boolean;
}

export interface FileInfo {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  userId: number;
  category?: string;
  description?: string;
  isPublic: boolean;
}

export interface FileListOptions {
  page: number;
  limit: number;
  type?: string;
}

export interface FileListResult {
  files: FileInfo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class FileService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = appConfig.upload.uploadDir;
  }

  /**
   * 上传文件
   */
  async uploadFile(file: Express.Multer.File, metadata: FileMetadata): Promise<FileInfo> {
    // 验证文件类型
    this.validateFileType(file.mimetype);
    
    // 验证文件大小
    this.validateFileSize(file.size);

    // 生成唯一文件名
    const fileId = this.generateFileId();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${fileId}${fileExtension}`;
    const filePath = path.join(this.uploadDir, fileName);

    try {
      // 确保上传目录存在
      await this.ensureUploadDir();

      // 保存文件到磁盘
      await fs.writeFile(filePath, file.buffer);

      // 保存文件信息到数据库
      const fileInfo = await FileModel.create({
        id: fileId,
        originalName: file.originalname,
        fileName,
        mimeType: file.mimetype,
        size: file.size,
        userId: metadata.userId,
        category: metadata.category,
        description: metadata.description,
        isPublic: metadata.isPublic || false,
        filePath
      });

      return {
        id: fileInfo.id,
        originalName: fileInfo.original_name,
        fileName: fileInfo.file_name,
        mimeType: fileInfo.mime_type,
        size: fileInfo.size,
        uploadedAt: fileInfo.created_at,
        userId: fileInfo.user_id,
        category: fileInfo.category,
        description: fileInfo.description,
        isPublic: fileInfo.is_public
      };
    } catch (error) {
      // 如果数据库操作失败，删除已上传的文件
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error('删除文件失败:', unlinkError);
      }
      throw error;
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(fileId: string): Promise<FileInfo | null> {
    const fileRecord = await FileModel.findById(fileId);
    if (!fileRecord) {
      return null;
    }

    return {
      id: fileRecord.id,
      originalName: fileRecord.original_name,
      fileName: fileRecord.file_name,
      mimeType: fileRecord.mime_type,
      size: fileRecord.size,
      uploadedAt: fileRecord.created_at,
      userId: fileRecord.user_id,
      category: fileRecord.category,
      description: fileRecord.description,
      isPublic: fileRecord.is_public
    };
  }

  /**
   * 获取文件路径
   */
  async getFilePath(fileId: string): Promise<string> {
    const fileRecord = await FileModel.findById(fileId);
    if (!fileRecord) {
      throw new AppError('文件不存在', 404, ErrorCodes.NOT_FOUND);
    }

    const filePath = path.resolve(fileRecord.file_path);
    
    // 检查文件是否存在
    try {
      await fs.access(filePath);
      return filePath;
    } catch (error) {
      throw new AppError('文件已损坏或不存在', 404, ErrorCodes.NOT_FOUND);
    }
  }

  /**
   * 检查文件访问权限
   */
  async checkFileAccess(fileId: string, userId: number): Promise<boolean> {
    const fileRecord = await FileModel.findById(fileId);
    if (!fileRecord) {
      return false;
    }

    // 公开文件任何人都可以访问
    if (fileRecord.is_public) {
      return true;
    }

    // 文件所有者可以访问
    if (fileRecord.user_id === userId) {
      return true;
    }

    // TODO: 实现更复杂的权限逻辑，如商户管理员可以访问商户员工的文件
    return false;
  }

  /**
   * 检查文件删除权限
   */
  async checkFileDeletePermission(fileId: string, userId: number): Promise<boolean> {
    const fileRecord = await FileModel.findById(fileId);
    if (!fileRecord) {
      return false;
    }

    // 只有文件所有者可以删除
    return fileRecord.user_id === userId;
  }

  /**
   * 删除文件
   */
  async deleteFile(fileId: string): Promise<void> {
    const fileRecord = await FileModel.findById(fileId);
    if (!fileRecord) {
      throw new AppError('文件不存在', 404, ErrorCodes.NOT_FOUND);
    }

    try {
      // 删除物理文件
      await fs.unlink(fileRecord.file_path);
    } catch (error) {
      console.error('删除物理文件失败:', error);
      // 继续删除数据库记录，即使物理文件删除失败
    }

    // 删除数据库记录
    await FileModel.delete(fileId);
  }

  /**
   * 获取用户文件列表
   */
  async getUserFiles(userId: number, options: FileListOptions): Promise<FileListResult> {
    const { page, limit, type } = options;
    const offset = (page - 1) * limit;

    const result = await FileModel.findByUserId(userId, {
      limit,
      offset,
      mimeType: type
    });

    const files = result.files.map(file => ({
      id: file.id,
      originalName: file.original_name,
      fileName: file.file_name,
      mimeType: file.mime_type,
      size: file.size,
      uploadedAt: file.created_at,
      userId: file.user_id,
      category: file.category,
      description: file.description,
      isPublic: file.is_public
    }));

    return {
      files,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    };
  }

  /**
   * 验证文件类型
   */
  private validateFileType(mimeType: string): void {
    const allowedTypes = appConfig.upload.allowedMimeTypes;
    if (!allowedTypes.includes(mimeType)) {
      throw new AppError(
        `不支持的文件类型: ${mimeType}`,
        400,
        ErrorCodes.INVALID_FILE_TYPE
      );
    }
  }

  /**
   * 验证文件大小
   */
  private validateFileSize(size: number): void {
    const maxSize = this.parseFileSize(appConfig.upload.maxFileSize);
    if (size > maxSize) {
      throw new AppError(
        `文件大小超出限制: ${this.formatFileSize(size)} > ${appConfig.upload.maxFileSize}`,
        400,
        ErrorCodes.FILE_TOO_LARGE
      );
    }
  }

  /**
   * 生成文件ID
   */
  private generateFileId(): string {
    return crypto.randomUUID();
  }

  /**
   * 确保上传目录存在
   */
  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch (error) {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * 解析文件大小字符串
   */
  private parseFileSize(sizeStr: string): number {
    const units: { [key: string]: number } = {
      'b': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024
    };

    const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([kmg]?b)$/);
    if (!match) {
      throw new Error(`无效的文件大小格式: ${sizeStr}`);
    }

    const [, size, unit] = match;
    return parseFloat(size) * units[unit];
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}