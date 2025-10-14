#!/usr/bin/env node

/**
 * 修复语法错误的脚本
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SyntaxErrorFixer {
  constructor() {
    this.srcDir = path.join(__dirname, '..', 'src');
    this.fixedFiles = [];
    this.errors = [];
  }

  /**
   * 修复文件中的语法错误
   */
  fixFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // 修复错误的属性访问模式
      const fixes = [
        // 修复 ['test']Timeout -> testTimeout
        { pattern: /\['test'\]Timeout/g, replacement: 'testTimeout' },
        { pattern: /\['test'\]Path/g, replacement: 'testPath' },
        { pattern: /\['production'\]Config/g, replacement: 'productionConfig' },
        { pattern: /\['development'\]Config/g, replacement: 'developmentConfig' },
        
        // 修复模板字符串问题
        { pattern: /`([^`]*)\$\{([^}]*)\}([^`]*)`([^;,\s])/g, replacement: '`$1${$2}$3`$4' },
        
        // 修复对象属性访问
        { pattern: /(\w+)\['(\w+)'\](\w+)/g, replacement: '$1.$2$3' },
        
        // 修复环境变量访问中的错误
        { pattern: /process\.env\['(\w+)'\](\w+)/g, replacement: 'process.env[\'$1$2\']' }
      ];

      for (const fix of fixes) {
        if (fix.pattern.test(content)) {
          content = content.replace(fix.pattern, fix.replacement);
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
    console.log('🔧 开始修复语法错误...\n');
    
    // 处理整个 src 目录
    this.processDirectory(this.srcDir);

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
const fixer = new SyntaxErrorFixer();
const hasChanges = fixer.run();

if (hasChanges) {
  console.log('\n🎉 修复完成！请运行类型检查验证修复效果。');
} else {
  console.log('\n📝 没有发现需要修复的文件。');
}

export { SyntaxErrorFixer };