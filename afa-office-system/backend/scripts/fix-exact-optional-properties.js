#!/usr/bin/env node

/**
 * 修复 exactOptionalPropertyTypes 相关错误的脚本
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ExactOptionalPropertiesFixer {
  constructor() {
    this.srcDir = path.join(__dirname, '..', 'src');
    this.fixedFiles = [];
    this.errors = [];
  }

  /**
   * 修复文件中的 exactOptionalProperties 错误
   */
  fixFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // 修复模式 1: result.passcodeId -> result.passcodeId ?? null
      const passcodeIdPattern = /(\s+passcodeId:\s+)result\.passcodeId([,\s])/g;
      if (passcodeIdPattern.test(content)) {
        content = content.replace(passcodeIdPattern, '$1result.passcodeId ?? null$2');
        modified = true;
      }

      // 修复模式 2: deviceType -> deviceType ?? null
      const deviceTypePattern = /(\s+deviceType:\s+)deviceType([,\s])/g;
      if (deviceTypePattern.test(content)) {
        content = content.replace(deviceTypePattern, '$1deviceType ?? null$2');
        modified = true;
      }

      // 修复模式 3: projectId -> projectId ?? null
      const projectIdPattern = /(\s+projectId:\s+)projectId([,\s])/g;
      if (projectIdPattern.test(content)) {
        content = content.replace(projectIdPattern, '$1projectId ?? null$2');
        modified = true;
      }

      // 修复模式 4: venueId -> venueId ?? null
      const venueIdPattern = /(\s+venueId:\s+)venueId([,\s])/g;
      if (venueIdPattern.test(content)) {
        content = content.replace(venueIdPattern, '$1venueId ?? null$2');
        modified = true;
      }

      // 修复模式 5: floorId -> floorId ?? null
      const floorIdPattern = /(\s+floorId:\s+)floorId([,\s])/g;
      if (floorIdPattern.test(content)) {
        content = content.replace(floorIdPattern, '$1floorId ?? null$2');
        modified = true;
      }

      // 修复模式 6: failReason -> failReason ?? null
      const failReasonPattern = /(\s+failReason:\s+)result\.reason([,\s])/g;
      if (failReasonPattern.test(content)) {
        content = content.replace(failReasonPattern, '$1result.reason ?? null$2');
        modified = true;
      }

      // 修复模式 7: userId 的 undefined 处理
      const userIdPattern = /(\s+userId:\s+)(\w+\.userId\s*\|\|\s*0)([,\s])/g;
      if (userIdPattern.test(content)) {
        content = content.replace(userIdPattern, '$1$2 ?? 0$3');
        modified = true;
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
    console.log('🔧 开始修复 exactOptionalProperties 错误...\n');
    
    // 处理 controllers 目录
    const controllersDir = path.join(this.srcDir, 'controllers');
    if (fs.existsSync(controllersDir)) {
      console.log('📁 处理 controllers 目录...');
      this.processDirectory(controllersDir);
    }

    // 处理 services 目录
    const servicesDir = path.join(this.srcDir, 'services');
    if (fs.existsSync(servicesDir)) {
      console.log('📁 处理 services 目录...');
      this.processDirectory(servicesDir);
    }

    // 处理 models 目录
    const modelsDir = path.join(this.srcDir, 'models');
    if (fs.existsSync(modelsDir)) {
      console.log('📁 处理 models 目录...');
      this.processDirectory(modelsDir);
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
const fixer = new ExactOptionalPropertiesFixer();
const hasChanges = fixer.run();

if (hasChanges) {
  console.log('\n🎉 修复完成！请运行类型检查验证修复效果。');
} else {
  console.log('\n📝 没有发现需要修复的文件。');
}

export { ExactOptionalPropertiesFixer };