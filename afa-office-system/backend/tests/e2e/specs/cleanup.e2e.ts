import { test as cleanup } from '@playwright/test';
import { DatabaseManager } from '../helpers/database-manager.js';
import fs from 'fs/promises';

/**
 * 测试环境清理
 * 在所有测试结束后执行
 */
cleanup('清理测试环境', async () => {
  console.log('🧹 开始清理端到端测试环境...');

  try {
    // 1. 清理测试数据库
    console.log('🗄️ 清理测试数据库...');
    const dbManager = new DatabaseManager();
    await dbManager.cleanup();

    // 2. 清理认证状态文件
    console.log('🔐 清理认证状态文件...');
    await cleanupAuthStates();

    // 3. 清理临时文件
    console.log('📁 清理临时文件...');
    await cleanupTempFiles();

    console.log('✅ 测试环境清理完成');
  } catch (error) {
    console.error('❌ 测试环境清理失败:', error);
    // 不抛出错误，避免影响测试结果
  }
});

/**
 * 清理认证状态文件
 */
async function cleanupAuthStates() {
  const authStatesDir = 'tests/e2e/fixtures/auth-states';
  
  try {
    const files = await fs.readdir(authStatesDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        await fs.unlink(`${authStatesDir}/${file}`);
        console.log(`删除认证状态文件: ${file}`);
      }
    }
  } catch (error) {
    console.warn('清理认证状态文件时出错:', error);
  }
}

/**
 * 清理临时文件
 */
async function cleanupTempFiles() {
  const tempDirs = [
    'tests/e2e/reports/screenshots',
    'tests/e2e/reports/videos', 
    'tests/e2e/reports/traces'
  ];

  for (const dir of tempDirs) {
    try {
      const stat = await fs.stat(dir);
      if (stat.isDirectory()) {
        const files = await fs.readdir(dir);
        for (const file of files) {
          await fs.unlink(`${dir}/${file}`);
        }
        console.log(`清理临时目录: ${dir}`);
      }
    } catch (error) {
      // 目录不存在或其他错误，忽略
    }
  }
}