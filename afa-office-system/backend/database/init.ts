import database from '../src/utils/database.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 使用架构初始化数据库
 */
async function initDatabase(): Promise<void> {
  try {
    console.log('🔄 开始初始化数据库...');
    
    // 连接数据库
    await database.connect();
    
    // 读取并执行架构
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    
    // 将架构分割为单独的语句
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // 执行每个语句
    for (const statement of statements) {
      await database.run(statement);
    }
    
    console.log('✅ 数据库初始化完成');
    
    // 如果可用，加载种子数据
    try {
      const { seedData } = await import('./seeds/initial-data.js');
      await seedData();
      console.log('✅ 初始数据加载完成');
    } catch (err) {
      console.log('ℹ️  未找到初始数据文件，跳过数据加载');
      console.log('错误详情:', (err as Error).message);
    }
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', (error as Error).message);
    process.exit(1);
  } finally {
    await database.close();
  }
}

// 如果直接调用则运行初始化
const currentFile = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === currentFile;

if (isMainModule) {
  console.log('Running database initialization...');
  initDatabase().catch(console.error);
}

export { initDatabase };