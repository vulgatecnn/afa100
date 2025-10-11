import { beforeAll, afterAll, beforeEach } from 'vitest';
import database from '../src/utils/database.js';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * 测试环境全局设置
 * 在所有测试开始前初始化数据库，在所有测试结束后清理
 */

// 测试数据库文件路径
const testDbPath = join(process.cwd(), 'database', 'test.db');

// 初始化数据库结构的函数
async function initializeDatabase() {
  try {
    const schemaPath = join(process.cwd(), 'database', 'test-schema.sql');
    const schema = await readFile(schemaPath, 'utf-8');

    // 将SQL脚本按分号分割并执行每个语句
    const allStatements = schema.split(';').map(stmt => stmt.trim());

    const statements = allStatements
      .map(stmt => {
        // 移除注释行，保留SQL语句
        const lines = stmt.split('\n');
        const sqlLines = lines.filter(line => {
          const trimmed = line.trim();
          return trimmed.length > 0 && !trimmed.startsWith('--');
        });
        return sqlLines.join('\n').trim();
      })
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await database.run(statement);
        } catch (error) {
          const err = error as Error;
          // 忽略表已存在的错误
          if (!err.message.includes('already exists')) {
            console.error(`❌ SQL执行失败:`, statement.substring(0, 100) + '...', err.message);
            throw error;
          }
        }
      }
    }

    console.log('✅ 数据库结构初始化完成');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error as Error);
    throw error;
  }
}

beforeAll(async () => {
  console.log('🚀 初始化测试环境...');

  // 设置测试环境变量，使用临时测试数据库文件
  process.env.NODE_ENV = 'test';
  process.env.DB_TEST_PATH = testDbPath;

  console.log('📁 测试数据库路径:', testDbPath);

  // 删除旧的测试数据库文件（如果存在）
  if (existsSync(testDbPath)) {
    try {
      await unlink(testDbPath);
      console.log('🗑️ 删除旧测试数据库文件');
    } catch (error) {
      console.warn('删除旧测试数据库文件失败:', error);
    }
  }

  // 连接测试数据库
  if (!database.isReady()) {
    await database.connect();
  }

  // 初始化数据库结构
  await initializeDatabase();
});

// 在每个测试前清理数据，避免测试间相互影响
beforeEach(async () => {
  // 确保数据库连接正常，但不要重复连接
  if (!database.isReady()) {
    await database.connect();
    // 重新初始化数据库结构
    await initializeDatabase();
  }

  // 禁用外键约束以便清理数据
  try {
    await database.run('PRAGMA foreign_keys = OFF');

    // 清理所有表的数据，但保留结构（按依赖关系倒序删除）
    const tables = [
      'access_records',
      'passcodes',
      'visitor_applications',
      'user_roles',
      'merchant_permissions',
      'permissions',
      'users',
      'roles',
      'floors',
      'venues',
      'merchants',
      'projects'
    ];

    // 为每个表添加重试机制
    for (const table of tables) {
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          await database.run(`DELETE FROM ${table}`);
          // 重置自增ID
          await database.run(`DELETE FROM sqlite_sequence WHERE name = '${table}'`);
          break; // 成功则退出重试循环
        } catch (error) {
          retryCount++;
          const err = error as Error;

          // 如果是数据库锁定错误且还有重试次数，则等待后重试
          if ((err.message.includes('SQLITE_BUSY') || err.message.includes('SQLITE_LOCKED')) && retryCount < maxRetries) {
            console.warn(`清理表 ${table} 时遇到数据库锁定，第${retryCount}次重试...`);
            await new Promise(resolve => setTimeout(resolve, 100 * retryCount)); // 指数退避
            continue;
          }

          // 忽略表不存在的错误
          if (!err.message.includes('no such table')) {
            console.warn(`清理表 ${table} 时出错:`, err.message);
          }
          break; // 退出重试循环
        }
      }
    }

    // 重新启用外键约束并确保设置生效
    await database.run('PRAGMA foreign_keys = ON');

    // 验证外键约束是否已启用
    const fkCheck = await database.get('PRAGMA foreign_keys');
    if (!fkCheck || fkCheck.foreign_keys !== 1) {
      console.warn('⚠️ 外键约束未正确启用');
    }

    // 确保数据库状态一致
    await database.run('PRAGMA synchronous = FULL');

    // 短暂等待确保清理完成
    await new Promise(resolve => setTimeout(resolve, 10));

  } catch (error) {
    console.warn('数据库清理过程中出错:', error);
    // 如果清理失败，尝试重新连接数据库
    if (database.isReady()) {
      await database.close();
    }
    await database.connect();
    await initializeDatabase();
  }
});

afterAll(async () => {
  console.log('🧹 清理测试环境...');
  if (database.isReady()) {
    await database.close();
  }

  // 删除测试数据库文件
  if (existsSync(testDbPath)) {
    try {
      await unlink(testDbPath);
      console.log('🗑️ 测试数据库文件已删除');
    } catch (error) {
      console.warn('删除测试数据库文件失败:', error);
    }
  }
});