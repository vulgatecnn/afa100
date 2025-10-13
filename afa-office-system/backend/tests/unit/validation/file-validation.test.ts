import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Buffer } from 'buffer';

// 文件验证工具类
class FileValidator {
  private static readonly ALLOWED_MIME_TYPES = {
    image: [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
    ],
    archive: [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/gzip',
    ],
  };

  private static readonly MAX_FILE_SIZES = {
    image: 5 * 1024 * 1024, // 5MB
    document: 10 * 1024 * 1024, // 10MB
    archive: 50 * 1024 * 1024, // 50MB
    default: 2 * 1024 * 1024, // 2MB
  };

  private static readonly DANGEROUS_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
    '.app', '.deb', '.pkg', '.dmg', '.rpm', '.msi', '.run', '.bin',
    '.sh', '.ps1', '.php', '.asp', '.jsp', '.py', '.rb', '.pl',
  ];

  /**
   * 验证文件类型
   */
  static validateFileType(mimeType: string, allowedCategories: string[] = ['image', 'document']): {
    isValid: boolean;
    category?: string;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!mimeType) {
      errors.push('文件类型不能为空');
      return { isValid: false, errors };
    }

    // 检查是否在允许的类别中
    let matchedCategory: string | undefined;
    for (const category of allowedCategories) {
      const allowedTypes = this.ALLOWED_MIME_TYPES[category as keyof typeof this.ALLOWED_MIME_TYPES];
      if (allowedTypes && allowedTypes.includes(mimeType)) {
        matchedCategory = category;
        break;
      }
    }

    if (!matchedCategory) {
      errors.push(`不支持的文件类型: ${mimeType}`);
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      category: matchedCategory,
      errors: [],
    };
  }

  /**
   * 验证文件大小
   */
  static validateFileSize(size