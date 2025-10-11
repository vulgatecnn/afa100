// import database from '../src/utils/database.js';
import { unlinkSync, existsSync } from 'fs';
import { getCurrentDbConfig } from '../src/config/database.config.js';
import { initDatabase } from './init.js';

/**
 * 通过删除所有表并重新创建架构来重置数据库
 */
async function resetDatabase(): Promise<void> {
  try {
    console.log('🔄 开始重置数据库...');
    
    const config = getCurrentDbConfig();
    
    // 对于基于文件的数据库，删除文件
    if (config.path !== ':memory:' && existsSync(config.path)) {
      unlinkSync(config.path);
      console.log('🗑️  删除现有数据库文件');
    }
    
    // 重新初始化数据库
    await initDatabase();
    
    console.log('✅ 数据库重置完成');
    
  } catch (error) {
    console.error('❌ 数据库重置失败:', (error as Error).message);
    process.exit(1);
  }
}

// 如果直接调用则运行重置
import { fileURLToPath } from 'url';

const currentFile = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === currentFile;

if (isMainModule) {
  resetDatabase().catch(console.error);
}

export { resetDatabase };