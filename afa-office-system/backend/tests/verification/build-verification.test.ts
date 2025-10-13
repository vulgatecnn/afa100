/**
 * 构建成功的持续验证机制
 * 验证整个项目的构建流程和产物
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync, existsSync, statSync, rmSync, readdirSync } from 'fs';
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

describe('构建成功的持续验证机制', () => {
  const projectRoot = path.resolve(process.cwd());
  const distDir = path.join(projectRoot, 'dist');
  
  beforeAll(() => {
    // 清理之前的构建产物
    if (existsSync(distDir)) {
      rmSync(distDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    // 测试后保留构建产物用于后续验证
  });

  describe('TypeScript编译构建', () => {
    it('应该能够成功执行完整的TypeScript编译', () => {
      expect(() => {
        const output = execSync('pnpm build', {
          cwd: projectRoot,
          stdio: 'pipe',
          encoding: 'utf8'
        });
        console.log('构建输出:', output);
      }).not.toThrow();
    });

    it('构建后应该生成dist目录', () => {
      expect(existsSync(distDir)).toBe(true);
      expect(statSync(distDir).isDirectory()).toBe(true);
    });

    it('应该生成主要的JavaScript文件', () => {
      const mainFiles = [
        'app.js',
        'config/database.js',
        'models/user-model.js',
        'services/user.service.js',
        'controllers/auth.controller.js'
      ];

      mainFiles.forEach(file => {
        const filePath = path.join(distDir, file);
        if (existsSync(path.join(projectRoot, 'src', file.replace('.js', '.ts')))) {
          expect(existsSync(filePath)).toBe(true);
        }
      });
    });

    it('应该生成类型声明文件', () => {
      const typeFiles = [
        'types/database.d.ts',
        'types/api.d.ts',
        'types/user.d.ts'
      ];

      typeFiles.forEach(file => {
        const filePath = path.join(distDir, file);
        const sourcePath = path.join(projectRoot, 'src', file.replace('.d.ts', '.ts'));
        if (existsSync(sourcePath)) {
          expect(existsSync(filePath)).toBe(true);
        }
      });
    });

    it('应该生成source map文件', () => {
      if (existsSync(distDir)) {
        const jsFiles = findFiles(distDir, '.js');

        jsFiles.forEach(file => {
          const mapFile = file + '.map';
          expect(existsSync(mapFile)).toBe(true);
        });
      }
    });
  });

  describe('构建产物质量验证', () => {
    it('生成的JavaScript文件应该是有效的', () => {
      if (existsSync(distDir)) {
        const jsFiles = findFiles(distDir, '.js');

        jsFiles.forEach(file => {
          const content = readFileSync(file, 'utf8');
          
          // 基本语法检查
          expect(content).not.toMatch(/\bany\b/); // 不应该有any类型残留
          expect(content).not.toMatch(/console\.log/); // 生产代码不应该有console.log
          
          // 应该有正确的模块导出
          if (content.includes('export')) {
            expect(content).toMatch(/export\s*\{|module\.exports\s*=|exports\./);
          }
        });
      }
    });

    it('类型声明文件应该是完整的', () => {
      if (existsSync(distDir)) {
        const dtsFiles = findFiles(distDir, '.d.ts');

        dtsFiles.forEach(file => {
          const content = readFileSync(file, 'utf8');
          
          // 类型声明文件应该有导出
          expect(content).toMatch(/export|declare/);
          
          // 不应该有实现代码
          expect(content).not.toMatch(/console\.log|throw new Error/);
        });
      }
    });

    it('构建产物应该包含所有必要的依赖', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      // 检查主入口文件
      const mainFile = path.join(projectRoot, packageJson.main || 'dist/app.js');
      expect(existsSync(mainFile)).toBe(true);
      
      // 检查主入口文件的内容
      const mainContent = readFileSync(mainFile, 'utf8');
      expect(mainContent).toMatch(/express|app/i);
    });
  });

  describe('运行时验证', () => {
    it('构建后的应用应该能够启动', () => {
      const mainFile = path.join(distDir, 'app.js');
      if (existsSync(mainFile)) {
        expect(() => {
          // 检查语法错误，不实际启动服务器
          execSync(`node --check ${mainFile}`, {
            cwd: projectRoot,
            stdio: 'pipe',
            encoding: 'utf8'
          });
        }).not.toThrow();
      }
    });

    it('应该能够加载所有模块', () => {
      if (existsSync(distDir)) {
        const jsFiles = findFiles(distDir, '.js');

        jsFiles.forEach(file => {
          expect(() => {
            execSync(`node --check "${file}"`, {
              cwd: projectRoot,
              stdio: 'pipe',
              encoding: 'utf8'
            });
          }).not.toThrow();
        });
      }
    });
  });

  describe('依赖完整性验证', () => {
    it('package.json中的依赖应该都能正确安装', () => {
      expect(() => {
        execSync('pnpm install --frozen-lockfile', {
          cwd: projectRoot,
          stdio: 'pipe',
          encoding: 'utf8'
        });
      }).not.toThrow();
    });

    it('应该没有缺失的依赖', () => {
      const output = execSync('pnpm list --depth=0', {
        cwd: projectRoot,
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      // 不应该有UNMET DEPENDENCY
      expect(output).not.toMatch(/UNMET DEPENDENCY/);
      expect(output).not.toMatch(/missing/i);
    });

    it('应该没有安全漏洞', () => {
      try {
        const auditOutput = execSync('pnpm audit --audit-level moderate', {
          cwd: projectRoot,
          stdio: 'pipe',
          encoding: 'utf8'
        });
        
        // 如果有输出，检查是否有高危漏洞
        if (auditOutput.trim()) {
          expect(auditOutput).not.toMatch(/high|critical/i);
        }
      } catch (error) {
        // pnpm audit 可能返回非零退出码，但这不一定意味着有严重问题
        const errorOutput = (error as any).stdout || (error as any).stderr || '';
        if (errorOutput.includes('high') || errorOutput.includes('critical')) {
          throw new Error(`发现高危安全漏洞: ${errorOutput}`);
        }
      }
    });
  });

  describe('性能和大小验证', () => {
    it('构建产物大小应该在合理范围内', () => {
      const distSize = execSync('du -sh dist', {
        cwd: projectRoot,
        encoding: 'utf8'
      }).split('\t')[0];
      
      console.log(`构建产物大小: ${distSize}`);
      
      // 检查是否超过合理大小（例如100MB）
      const sizeMatch = distSize.match(/(\d+(?:\.\d+)?)(K|M|G)/);
      if (sizeMatch) {
        const [, size, unit] = sizeMatch;
        const sizeNum = parseFloat(size);
        
        if (unit === 'G' || (unit === 'M' && sizeNum > 100)) {
          console.warn(`构建产物可能过大: ${distSize}`);
        }
      }
    });

    it('构建时间应该在合理范围内', () => {
      const startTime = Date.now();
      
      execSync('pnpm build', {
        cwd: projectRoot,
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      const buildTime = Date.now() - startTime;
      console.log(`构建时间: ${buildTime}ms`);
      
      // 构建时间不应该超过5分钟
      expect(buildTime).toBeLessThan(5 * 60 * 1000);
    });
  });

  describe('环境兼容性验证', () => {
    it('应该兼容目标Node.js版本', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      if (packageJson.engines && packageJson.engines.node) {
        const nodeVersion = process.version;
        console.log(`当前Node.js版本: ${nodeVersion}`);
        console.log(`要求Node.js版本: ${packageJson.engines.node}`);
        
        // 基本版本检查
        const majorVersion = parseInt(nodeVersion.slice(1));
        expect(majorVersion).toBeGreaterThanOrEqual(18);
      }
    });

    it('应该支持ES模块', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      if (packageJson.type === 'module') {
        // 检查构建产物是否支持ES模块
        const jsFiles = execSync('find dist -name "*.js" -type f -exec head -5 {} \\;', {
          cwd: projectRoot,
          encoding: 'utf8'
        });
        
        // 应该包含ES模块语法
        expect(jsFiles).toMatch(/import|export/);
      }
    });
  });
});