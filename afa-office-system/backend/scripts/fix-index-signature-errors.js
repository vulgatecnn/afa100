#!/usr/bin/env node

/**
 * 修复索引签名错误 (TS4111) 的脚本
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class IndexSignatureFixer {
  constructor() {
    this.srcDir = path.join(__dirname, '..', 'src');
    this.fixedFiles = [];
    this.errors = [];
  }

  /**
   * 修复文件中的索引签名错误
   */
  fixFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // 需要修复的环境变量列表
      const envVars = [
        'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
        'TEST_DB_HOST', 'TEST_DB_PORT', 'TEST_DB_USER', 'TEST_DB_PASSWORD', 'TEST_DB_NAME',
        'TEST_DB_CONNECTION_LIMIT', 'TEST_DB_ACQUIRE_TIMEOUT', 'TEST_DB_TIMEOUT',
        'TEST_DB_QUEUE_LIMIT', 'TEST_DB_IDLE_TIMEOUT', 'TEST_DB_CHARSET',
        'TEST_DB_TIMEZONE', 'TEST_DB_SSL', 'API_BASE_URL', 'DATABASE_URL',
        'TEST_TIMEOUT', 'RETRY_ATTEMPTS'
      ];

      // 修复 process.env.VARIABLE 为 process.env['VARIABLE']
      for (const envVar of envVars) {
        const pattern = new RegExp(`process\\.env\\.${envVar}`, 'g');
        if (pattern.test(content)) {
          content = content.replace(pattern, `process.env['${envVar}']`);
          modified = true;
        }
      }

      // 修复配置对象的属性访问
      const configProps = ['development', 'test', 'production'];
      for (const prop of configProps) {
        // 修复 config.development 为 config['development']
        const pattern = new RegExp(`([a-zA-Z_$][a-zA-Z0-9_$]*)\\.${prop}`, 'g');
        if (pattern.test(content)) {
          content = content.replace(pattern, `$1['${prop}']`);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, content);
        this.fixedFiles.push(filePath);
        console.log(`✅ 修复文件: ${path.relative(this.srcDir, filePath)}`);
      }

      return modified;
    } catch (error) {
      this.errors.push({ file: filePath, error: error.message });
      console.error(`❌ 修复文件失败: ${filePath} - ${error.message}`);
      return false;
    }
  }

  /**
   * 递归处理目录
   */
  processDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        this.processDirectory(itemPath);
      } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
        this.fixFile(itemPath);
      }
    }
  }

  /**
   * 运行修复
   */
  run() {
    console.log('🔧 开始修复索引签名错误 (TS4111)...\n');
    
    // 处理 config 目录
    const configDir = path.join(this.srcDir, 'config');
    if (fs.existsSync(configDir)) {
      console.log('📁 处理 config 目录...');
      this.processDirectory(configDir);
    }

    // 处理其他可能有环境变量访问的目录
    const otherDirs = ['utils', 'services', 'middleware'];
    for (const dir of otherDirs) {
      const dirPath = path.join(this.srcDir, dir);
      if (fs.existsSync(dirPath)) {
        console.log(`📁 处理 ${dir} 目录...`);
        this.processDirectory(dirPath);
      }
    }

    // 显示结果
    console.log('\n📊 修复结果:');
    console.log(`✅ 成功修复 ${this.fixedFiles.length} 个文件`);
    
    if (this.errors.length > 0) {
      console.log(`❌ 修复失败 ${this.errors.length} 个文件:`);
      this.errors.forEach(({ file, error }) => {
        console.log(`  - ${path.relative(this.srcDir, file)}: ${error}`);
      });
    }

    return this.fixedFiles.length > 0;
  }
}

// 运行修复
const fixer = new IndexSignatureFixer();
const hasChanges = fixer.run();

if (hasChanges) {
  console.log('\n🎉 修复完成！请运行类型检查验证修复效果。');
} else {
  console.log('\n📝 没有发现需要修复的文件。');
}

export { IndexSignatureFixer };