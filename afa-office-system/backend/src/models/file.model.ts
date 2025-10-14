/**
 * 文件数据模型
 * 处理文件相关的数据库操作
 */

import database from '../utils/database.js';
import type { DatabaseResult } from '../types/index.js';

export interface FileRecord {
  id: string;
  original_name: string;
  file_name: string;
  mime_type: string;
  size: number;
  user_id: number;
  category?: string;
  description?: string;
  is_public: boolean;
  file_path: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFileData {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  userId: number;
  category?: string;
  description?: string;
  isPublic: boolean;
  filePath: string;
}

export interface FileQueryOptions {
  limit: number;
  offset: number;
  mimeType?: string;
}

export interface FileQueryResult {
  files: FileRecord[];
  total: number;
}

export class FileModel {

  /**
   * 创建文件记录
   */
  static async create(data: CreateFileData): Promise<FileRecord> {
    const sql = `
      INSERT INTO files (
        id, original_name, file_name, mime_type, size, user_id,
        category, description, is_public, file_path, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    const params = [
      data.id,
      data.originalName,
      data.fileName,
      data.mimeType,
      data.size,
      data.userId,
      data.category || null,
      data.description || null,
      data.isPublic ? 1 : 0,
      data.filePath
    ];

    await database.run(sql, params);
    
    const createdFile = await FileModel.findById(data.id);
    if (!createdFile) {
      throw new Error('文件创建失败');
    }

    return createdFile;
  }

  /**
   * 根据ID查找文件
   */
  static async findById(id: string): Promise<FileRecord | null> {
    const sql = `
      SELECT id, original_name, file_name, mime_type, size, user_id,
             category, description, is_public, file_path, created_at, updated_at
      FROM files 
      WHERE id = ?
    `;

    const rows = await database.all<FileRecord>(sql, [id]);
    return rows.length > 0 ? rows[0] as FileRecord : null;
  }

  /**
   * 根据用户ID查找文件
   */
  static async findByUserId(userId: number, options: FileQueryOptions): Promise<FileQueryResult> {
    let whereClause = 'WHERE user_id = ?';
    const params: any[] = [userId];

    if (options.mimeType) {
      whereClause += ' AND mime_type LIKE ?';
      params.push(`${options.mimeType}%`);
    }

    // 查询总数
    const countSql = `SELECT COUNT(*) as total FROM files ${whereClause}`;
    const countResult = await database.all<{ total: number }>(countSql, params);
    const total = countResult && countResult.length > 0 && countResult[0] ? countResult[0].total : 0;

    // 查询文件列表
    const sql = `
      SELECT id, original_name, file_name, mime_type, size, user_id,
             category, description, is_public, file_path, created_at, updated_at
      FROM files 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(options.limit, options.offset);
    const files = await database.all<FileRecord>(sql, params);

    return { files, total };
  }

  /**
   * 根据文件名查找文件
   */
  static async findByFileName(fileName: string): Promise<FileRecord | null> {
    const sql = `
      SELECT id, original_name, file_name, mime_type, size, user_id,
             category, description, is_public, file_path, created_at, updated_at
      FROM files 
      WHERE file_name = ?
    `;

    const rows = await database.all<FileRecord>(sql, [fileName]);
    return rows.length > 0 ? rows[0] as FileRecord : null;
  }

  /**
   * 获取用户文件统计
   */
  static async getUserFileStats(userId: number): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: { [mimeType: string]: number };
  }> {
    // 总文件数和大小
    const totalSql = `
      SELECT COUNT(*) as totalFiles, COALESCE(SUM(size), 0) as totalSize
      FROM files 
      WHERE user_id = ?
    `;
    const totalResult = await database.all<{ totalFiles: number; totalSize: number }>(totalSql, [userId]);
    const totalFiles = totalResult && totalResult.length > 0 && totalResult[0] ? totalResult[0].totalFiles : 0;
    const totalSize = totalResult && totalResult.length > 0 && totalResult[0] ? totalResult[0].totalSize : 0;

    // 按类型统计
    const typeSql = `
      SELECT mime_type, COUNT(*) as count
      FROM files 
      WHERE user_id = ?
      GROUP BY mime_type
    `;
    const typeResult = await database.all<{ mime_type: string; count: number }>(typeSql, [userId]);

    const filesByType: { [mimeType: string]: number } = {};
    if (typeResult) {
      typeResult.forEach(row => {
        if (row) {
          filesByType[row.mime_type] = row.count;
        }
      });
    }

    return {
      totalFiles,
      totalSize,
      filesByType
    };
  }

  /**
   * 清理过期的临时文件
   */
  static async cleanupExpiredFiles(daysOld: number = 30): Promise<number> {
    const sql = `
      DELETE FROM files 
      WHERE category = 'temp' 
      AND created_at < datetime('now', '-${daysOld} days')
    `;

    const result = await database.run(sql);
    return result.changes || 0;
  }

  /**
   * 删除文件记录
   */
  static async delete(id: string): Promise<void> {
    const sql = 'DELETE FROM files WHERE id = ?';
    await database.run(sql, [id]);
  }

  /**
   * 更新文件信息
   */
  static async update(id: string, data: Partial<CreateFileData>): Promise<FileRecord> {
    const sql = `
      UPDATE files
      SET original_name = ?, file_name = ?, mime_type = ?, size = ?, user_id = ?,
          category = ?, description = ?, is_public = ?, file_path = ?, updated_at = datetime('now')
      WHERE id = ?
    `;

    const params = [
      data.originalName || null,
      data.fileName || null,
      data.mimeType || null,
      data.size || null,
      data.userId || null,
      data.category || null,
      data.description || null,
      data.isPublic !== undefined ? (data.isPublic ? 1 : 0) : null,
      data.filePath || null,
      id
    ];

    await database.run(sql, params);

    const updatedFile = await FileModel.findById(id);
    if (!updatedFile) {
      throw new Error('文件更新失败');
    }

    return updatedFile;
  }
}