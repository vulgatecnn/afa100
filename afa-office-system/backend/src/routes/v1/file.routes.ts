/**
 * 文件上传下载路由
 */

import express from 'express';
import multer from 'multer';
import { FileController } from '../../controllers/file.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimitMiddleware } from '../../middleware/rate-limit.middleware.js';
import { appConfig } from '../../config/app.config.js';

const router = express.Router();
const fileController = new FileController();

// 配置multer中间件
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseFileSize(appConfig.upload.maxFileSize),
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = appConfig.upload.allowedMimeTypes;
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`));
    }
  },
});

/**
 * 解析文件大小字符串
 */
function parseFileSize(sizeStr: string): number {
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

// 文件上传
router.post('/upload', 
  authMiddleware,
  rateLimitMiddleware.upload,
  upload.single('file'),
  fileController.uploadFile
);

// 文件下载
router.get('/:fileId/download',
  authMiddleware,
  fileController.downloadFile
);

// 获取文件信息
router.get('/:fileId',
  authMiddleware,
  fileController.getFileInfo
);

// 删除文件
router.delete('/:fileId',
  authMiddleware,
  fileController.deleteFile
);

// 获取用户文件列表
router.get('/',
  authMiddleware,
  fileController.getUserFiles
);

export default router;