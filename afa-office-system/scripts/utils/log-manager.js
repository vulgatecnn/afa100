/**
 * 日志管理工具
 * 提供统一的日志目录管理和文件操作功能
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * 日志管理器类
 */
export class LogManager {
  constructor(baseLogDir) {
    this.baseLogDir = baseLogDir;
    this.moduleLogDirs = new Map();
  }

  /**
   * 生成带时间戳和进程号的文件名
   */
  static generateLogFileName(baseName, extension = 'log') {
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0');
    const processId = process.pid;
    return `${dateStr}-${processId}-${baseName}.${extension}`;
  }

  /**
   * 初始化日志目录结构
   */
  async initializeLogDirectories(modules) {
    try {
      // 创建基础日志目录
      await fs.mkdir(this.baseLogDir, { recursive: true });
      
      // 为每个模块创建子目录
      for (const moduleKey of Object.keys(modules)) {
        const moduleLogDir = path.join(this.baseLogDir, moduleKey);
        await fs.mkdir(moduleLogDir, { recursive: true });
        this.moduleLogDirs.set(moduleKey, moduleLogDir);
      }
      
      // 创建摘要目录
      const summaryDir = path.join(this.baseLogDir, 'summary');
      await fs.mkdir(summaryDir, { recursive: true });
      this.moduleLogDirs.set('summary', summaryDir);
      
      return true;
    } catch (error) {
      throw new Error(`初始化日志目录失败: ${error.message}`);
    }
  }

  /**
   * 获取模块日志目录
   */
  getModuleLogDir(moduleKey) {
    return this.moduleLogDirs.get(moduleKey) || path.join(this.baseLogDir, moduleKey);
  }

  /**
   * 获取日志文件路径
   */
  getLogFilePath(moduleKey, fileName) {
    const moduleDir = this.getModuleLogDir(moduleKey);
    return path.join(moduleDir, fileName);
  }

  /**
   * 清理指定模块的日志文件
   */
  async cleanupModuleLogs(moduleKey, fileNames) {
    try {
      const moduleDir = this.getModuleLogDir(moduleKey);
      
      for (const fileName of fileNames) {
        const filePath = path.join(moduleDir, fileName);
        try {
          await fs.unlink(filePath);
        } catch (error) {
          // 文件不存在时忽略错误
          if (error.code !== 'ENOENT') {
            console.warn(`⚠️  清理日志文件失败: ${moduleKey}/${fileName}`);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  清理模块日志时出现问题: ${error.message}`);
    }
  }

  /**
   * 清理所有模块的日志文件
   */
  async cleanupAllLogs(fileNames) {
    const cleanupPromises = [];
    
    for (const moduleKey of this.moduleLogDirs.keys()) {
      cleanupPromises.push(this.cleanupModuleLogs(moduleKey, fileNames));
    }
    
    await Promise.all(cleanupPromises);
  }

  /**
   * 写入日志文件
   */
  async writeLogFile(moduleKey, fileName, content) {
    try {
      const filePath = this.getLogFilePath(moduleKey, fileName);
      await fs.writeFile(filePath, content, 'utf8');
      return filePath;
    } catch (error) {
      throw new Error(`写入日志文件失败 ${moduleKey}/${fileName}: ${error.message}`);
    }
  }

  /**
   * 追加日志内容
   */
  async appendLogFile(moduleKey, fileName, content) {
    try {
      const filePath = this.getLogFilePath(moduleKey, fileName);
      await fs.appendFile(filePath, content, 'utf8');
      return filePath;
    } catch (error) {
      throw new Error(`追加日志文件失败 ${moduleKey}/${fileName}: ${error.message}`);
    }
  }

  /**
   * 读取日志文件
   */
  async readLogFile(moduleKey, fileName) {
    try {
      const filePath = this.getLogFilePath(moduleKey, fileName);
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // 文件不存在
      }
      throw new Error(`读取日志文件失败 ${moduleKey}/${fileName}: ${error.message}`);
    }
  }

  /**
   * 检查日志文件是否存在
   */
  async logFileExists(moduleKey, fileName) {
    try {
      const filePath = this.getLogFilePath(moduleKey, fileName);
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取日志文件大小
   */
  async getLogFileSize(moduleKey, fileName) {
    try {
      const filePath = this.getLogFilePath(moduleKey, fileName);
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 列出模块的所有日志文件
   */
  async listModuleLogFiles(moduleKey) {
    try {
      const moduleDir = this.getModuleLogDir(moduleKey);
      const files = await fs.readdir(moduleDir);
      
      const logFiles = [];
      for (const file of files) {
        const filePath = path.join(moduleDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          logFiles.push({
            name: file,
            path: filePath,
            size: stats.size,
            modified: stats.mtime
          });
        }
      }
      
      return logFiles;
    } catch (error) {
      return [];
    }
  }

  /**
   * 获取日志目录摘要信息
   */
  async getLogDirectorySummary() {
    const summary = {
      baseDir: this.baseLogDir,
      modules: {},
      totalFiles: 0,
      totalSize: 0
    };

    for (const [moduleKey, moduleDir] of this.moduleLogDirs.entries()) {
      try {
        const files = await this.listModuleLogFiles(moduleKey);
        const moduleSize = files.reduce((sum, file) => sum + file.size, 0);
        
        summary.modules[moduleKey] = {
          dir: moduleDir,
          fileCount: files.length,
          totalSize: moduleSize,
          files: files.map(f => ({ name: f.name, size: f.size }))
        };
        
        summary.totalFiles += files.length;
        summary.totalSize += moduleSize;
      } catch (error) {
        summary.modules[moduleKey] = {
          dir: moduleDir,
          fileCount: 0,
          totalSize: 0,
          error: error.message
        };
      }
    }

    return summary;
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 生成日志目录报告
   */
  async generateDirectoryReport() {
    const summary = await this.getLogDirectorySummary();
    const timestamp = new Date().toLocaleString('zh-CN');
    
    let report = `日志目录报告 (${timestamp})\n`;
    report += '='.repeat(50) + '\n\n';
    report += `基础目录: ${summary.baseDir}\n`;
    report += `总文件数: ${summary.totalFiles}\n`;
    report += `总大小: ${LogManager.formatFileSize(summary.totalSize)}\n\n`;
    
    report += '模块详情:\n';
    report += '-'.repeat(30) + '\n';
    
    for (const [moduleKey, moduleInfo] of Object.entries(summary.modules)) {
      if (moduleInfo.error) {
        report += `❌ ${moduleKey}: 错误 - ${moduleInfo.error}\n`;
      } else {
        report += `📁 ${moduleKey}: ${moduleInfo.fileCount} 文件, ${LogManager.formatFileSize(moduleInfo.totalSize)}\n`;
        
        if (moduleInfo.files.length > 0) {
          moduleInfo.files.forEach(file => {
            report += `   - ${file.name} (${LogManager.formatFileSize(file.size)})\n`;
          });
        }
      }
      report += '\n';
    }
    
    return report;
  }
}