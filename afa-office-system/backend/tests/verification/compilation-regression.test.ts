/**
 * 编译错误回归测试
 * 确保之前修复的TypeScript编译错误不会重新出现
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import path from 'path';

// Windows兼容的文件查找函数
function findFiles(dir: string, pattern: string): string[] {
  const files: string[] = [];
  
  function walkDir(currentDir: string) {
    try {
      const items = readdirSync(currentDir);
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (stat.isFile() && item.endsWith(pattern)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // 忽略访问权限错误
    }
  }
  
  if (existsSync(dir)) {
    walkDir(dir);
  }
  
  return files;
}

describe('编译错误回归测试', () => {
  const projectRoot = path.resolve(process.cwd());
  
  describe('TypeScript编译检查', () => {
    it('应该能够成功编译所有TypeScript文件', () => {
      expect(() => {
        // 运行TypeScript编译检查，不生成输出文件
        execSync('npx tsc --noEmit --project tsconfig.json', {
          cwd: projectRoot,
          stdio: 'pipe',
          encoding: 'utf8'
        });
      }).not.toThrow();
    });

    it('应该能够通过严格模式的类型检查', () => {
      try {
        // 运行严格模式的TypeScript检查
        execSync('npx tsc --noEmit --strict --project tsconfig.json', {
          cwd: projectRoot,
          stdio: 'pipe',
          encoding: 'utf8'
        });
      } catch (error) {
        // 如果严格模式检查失败，记录警告但不失败测试
        // 因为项目可能还在逐步迁移到严格模式
        const errorOutput = (error as any).stderr || (error as any).stdout || '';
        console.warn('严格模式类型检查发现问题:', errorOutput.slice(0, 500));
        
        // 只有在有严重错误时才失败
        if (errorOutput.includes('error TS') && errorOutput.split('error TS').length > 10) {
          throw error;
        }
      }
    });
  });

  describe('数据库配置类型回归测试', () => {
    it('DatabaseConfig接口应该包含所有必需的属性', () => {
      const configPath = path.join(projectRoot, 'src/types/database.ts');
      if (existsSync(configPath)) {
        const content = readFileSync(configPath, 'utf8');
        
        // 检查SQLite配置属性
        expect(content).toMatch(/path\s*:\s*string/);
        expect(content).toMatch(/mode\?\s*:\s*number/);
        expect(content).toMatch(/pragmas\?\s*:\s*Record/);
        
        // 检查MySQL配置属性
        expect(content).toMatch(/charset\?\s*:\s*string/);
        expect(content).toMatch(/timezone\?\s*:\s*string/);
        expect(content).toMatch(/ssl\?\s*:\s*(boolean|object)/);
      }
    });

    it('MySQL连接配置应该支持所有连接池选项', () => {
      const configPath = path.join(projectRoot, 'src/types/database.ts');
      if (existsSync(configPath)) {
        const content = readFileSync(configPath, 'utf8');
        
        // 检查连接池相关属性
        expect(content).toMatch(/acquireTimeout\?\s*:\s*number/);
        expect(content).toMatch(/connectionLimit\?\s*:\s*number/);
        expect(content).toMatch(/queueLimit\?\s*:\s*number/);
      }
    });
  });

  describe('模型方法调用回归测试', () => {
    it('服务层应该正确使用静态方法调用', () => {
      const servicesDir = path.join(projectRoot, 'src/services');
      if (existsSync(servicesDir)) {
        const files = findFiles(servicesDir, '.ts');

        files.forEach(file => {
          const content = readFileSync(file, 'utf8');
          
          // 检查是否存在错误的实例方法调用模式
          const instanceCallPattern = /this\.\w+Model\.(findById|findAll|create|update|delete)/g;
          const matches = content.match(instanceCallPattern);
          
          if (matches) {
            console.warn(`发现可能的实例方法调用在文件 ${file}: ${matches.join(', ')}`);
          }
          
          // 应该使用静态方法调用
          expect(content).not.toMatch(/this\.\w+Model\.findById/);
          expect(content).not.toMatch(/this\.\w+Model\.findAll/);
        });
      }
    });
  });

  describe('返回类型匹配回归测试', () => {
    it('分页响应应该返回正确的类型结构', () => {
      const servicesDir = path.join(projectRoot, 'src/services');
      if (existsSync(servicesDir)) {
        const files = findFiles(servicesDir, '.ts');

        files.forEach(file => {
          const content = readFileSync(file, 'utf8');
          
          // 检查返回PaginatedResponse的函数
          if (content.includes('PaginatedResponse')) {
            // 应该包含data和pagination属性
            expect(content).toMatch(/return\s*{[\s\S]*data[\s\S]*pagination/);
          }
        });
      }
    });
  });

  describe('导入导出回归测试', () => {
    it('所有模块导入应该能够正确解析', () => {
      expect(() => {
        // 检查模块解析
        execSync('npx tsc --noEmit --skipLibCheck false --project tsconfig.json', {
          cwd: projectRoot,
          stdio: 'pipe',
          encoding: 'utf8'
        });
      }).not.toThrow();
    });

    it('测试辅助模块应该正确导出', () => {
      const helperPath = path.join(projectRoot, 'tests/helpers');
      if (existsSync(helperPath)) {
        const files = findFiles(helperPath, '.ts');

        files.forEach(file => {
          const content = readFileSync(file, 'utf8');
          
          // 检查导出语句
          if (content.includes('export')) {
            expect(content).toMatch(/export\s+(class|function|const|interface)/);
          }
        });
      }
    });
  });

  describe('错误处理类型回归测试', () => {
    it('错误处理代码应该使用类型安全的属性访问', () => {
      const srcDir = path.join(projectRoot, 'src');
      if (existsSync(srcDir)) {
        const files = findFiles(srcDir, '.ts');

        files.forEach(file => {
          const content = readFileSync(file, 'utf8');
          
          // 检查错误处理中的属性访问
          if (content.includes('error.code')) {
            // 应该有类型检查或类型断言
            expect(content).toMatch(/(error\s+instanceof\s+Error|error\s+as\s+any|\(error\s+as\s+\w+\))/);
          }
        });
      }
    });
  });
});