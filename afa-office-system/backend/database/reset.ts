import { getCurrentDbConfig } from '../src/config/database.config.js';
import { initDatabase } from './init.js';

/**
 * 通过删除所有表并重新创建架构来重置MySQL数据库
 */
async function resetDatabase(): Promise<void> {
  try {
    console.log('🔄 开始重置MySQL数据库...');
    
    const config = getCurrentDbConfig();
    console.log(`📊 使用数据库配置: ${config.host}:${config.port}/${config.database}`);
    
    // 重新初始化数据库（MySQL数据库通过删除表和重新创建来重置）
    await initDatabase();
    
    console.log('✅ MySQL数据库重置完成');
    
  } catch (error) {
    console.error('❌ MySQL数据库重置失败:', (error as Error).message);
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