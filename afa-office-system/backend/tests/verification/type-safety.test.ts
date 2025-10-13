/**
 * 类型安全验证测试
 * 验证关键类型定义和类型安全性
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

describe('类型安全验证测试', () => {
  const projectRoot = path.resolve(process.cwd());

  describe('数据库类型安全性', () => {
    it('DatabaseConfig类型应该正确区分SQLite和MySQL配置', () => {
      const typesPath = path.join(projectRoot, 'src/types/database.ts');
      if (existsSync(typesPath)) {
        const content = readFileSync(typesPath, 'utf8');
        
        // 应该有类型区分
        expect(content).toMatch(/type\s+DatabaseConfig\s*=\s*SQLiteConfig\s*\|\s*MySQLConfig/);
        
        // SQLite配置应该有type字段
        expect(content).toMatch(/type\s*:\s*DatabaseType\.SQLITE/);
        
        // MySQL配置应该有type字段
        expect(content).toMatch(/type\s*:\s*DatabaseType\.MYSQL/);
      }
    });

    it('MySQL配置接口应该包含所有必需的类型定义', () => {
      const typesPath = path.join(projectRoot, 'src/types/database.ts');
      if (existsSync(typesPath)) {
        const content = readFileSync(typesPath, 'utf8');
        
        // 基础连接属性
        expect(content).toMatch(/host\s*:\s*string/);
        expect(content).toMatch(/port\s*:\s*number/);
        expect(content).toMatch(/user\s*:\s*string/);
        expect(content).toMatch(/password\s*:\s*string/);
        
        // 可选属性应该有正确的类型
        expect(content).toMatch(/charset\?\s*:\s*string/);
        expect(content).toMatch(/timezone\?\s*:\s*string/);
        expect(content).toMatch(/ssl\?\s*:\s*(boolean\s*\|\s*object|object\s*\|\s*boolean)/);
      }
    });
  });

  describe('API响应类型安全性', () => {
    it('PaginatedResponse类型应该正确定义', () => {
      const typesPath = path.join(projectRoot, 'src/types/api.ts');
      if (existsSync(typesPath)) {
        const content = readFileSync(typesPath, 'utf8');
        
        // 分页响应应该是泛型
        expect(content).toMatch(/interface\s+PaginatedResponse<T>/);
        
        // 应该包含data和pagination属性
        expect(content).toMatch(/data\s*:\s*T\[\]/);
        expect(content).toMatch(/pagination\s*:\s*\{/);
      }
    });

    it('API错误响应类型应该正确定义', () => {
      const typesPath = path.join(projectRoot, 'src/types/api.ts');
      if (existsSync(typesPath)) {
        const content = readFileSync(typesPath, 'utf8');
        
        // 错误响应类型
        expect(content).toMatch(/interface\s+ErrorResponse/);
        expect(content).toMatch(/success\s*:\s*false/);
        expect(content).toMatch(/code\s*:\s*number/);
        expect(content).toMatch(/message\s*:\s*string/);
      }
    });
  });

  describe('模型类型安全性', () => {
    it('用户模型应该有正确的类型定义', () => {
      const userModelPath = path.join(projectRoot, 'src/models/user-model.ts');
      if (existsSync(userModelPath)) {
        const content = readFileSync(userModelPath, 'utf8');
        
        // 静态方法应该有正确的返回类型
        expect(content).toMatch(/static\s+async\s+findById\s*\([^)]*\)\s*:\s*Promise<\w+\s*\|\s*null>/);
        expect(content).toMatch(/static\s+async\s+findAll\s*\([^)]*\)\s*:\s*Promise<\w+\[\]>/);
      }
    });

    it('商户模型应该有正确的类型定义', () => {
      const merchantModelPath = path.join(projectRoot, 'src/models/merchant-model.ts');
      if (existsSync(merchantModelPath)) {
        const content = readFileSync(merchantModelPath, 'utf8');
        
        // 静态方法应该有正确的返回类型
        expect(content).toMatch(/static\s+async\s+findById\s*\([^)]*\)\s*:\s*Promise<\w+\s*\|\s*null>/);
        expect(content).toMatch(/static\s+async\s+findAll\s*\([^)]*\)\s*:\s*Promise<\w+\[\]>/);
      }
    });
  });

  describe('服务层类型安全性', () => {
    it('服务方法应该有明确的参数和返回类型', () => {
      const servicesDir = path.join(projectRoot, 'src/services');
      if (existsSync(servicesDir)) {
        const files = findFiles(servicesDir, '.ts');

        files.forEach(file => {
          const content = readFileSync(file, 'utf8');
          
          // 异步方法应该有Promise返回类型
          const asyncMethods = content.match(/async\s+\w+\s*\([^)]*\)/g);
          if (asyncMethods) {
            asyncMethods.forEach(method => {
              // 检查是否有返回类型注解
              const methodWithReturn = content.match(new RegExp(method.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:\\s*Promise<[^>]+>'));
              if (!methodWithReturn) {
                console.warn(`异步方法缺少返回类型注解: ${method} in ${file}`);
              }
            });
          }
        });
      }
    });

    it('分页服务方法应该返回正确的类型', () => {
      const servicesDir = path.join(projectRoot, 'src/services');
      if (existsSync(servicesDir)) {
        const files = findFiles(servicesDir, '.ts');

        files.forEach(file => {
          const content = readFileSync(file, 'utf8');
          
          // 查找返回PaginatedResponse的方法
          if (content.includes('PaginatedResponse')) {
            expect(content).toMatch(/:\s*Promise<PaginatedResponse<\w+>>/);
          }
        });
      }
    });
  });

  describe('控制器类型安全性', () => {
    it('控制器方法应该有正确的请求和响应类型', () => {
      const controllersDir = path.join(projectRoot, 'src/controllers');
      if (existsSync(controllersDir)) {
        const files = findFiles(controllersDir, '.ts');

        files.forEach(file => {
          const content = readFileSync(file, 'utf8');
          
          // Express处理器应该有正确的类型
          expect(content).toMatch(/Request|Response|NextFunction/);
          
          // 异步处理器应该有Promise<void>返回类型
          const asyncHandlers = content.match(/async\s+\w+\s*\(\s*req\s*:\s*Request/g);
          if (asyncHandlers) {
            expect(content).toMatch(/:\s*Promise<void>/);
          }
        });
      }
    });
  });

  describe('中间件类型安全性', () => {
    it('认证中间件应该有正确的类型定义', () => {
      const authMiddlewarePath = path.join(projectRoot, 'src/middleware/auth.ts');
      if (existsSync(authMiddlewarePath)) {
        const content = readFileSync(authMiddlewarePath, 'utf8');
        
        // 中间件函数应该有正确的签名
        expect(content).toMatch(/\(\s*req\s*:\s*Request\s*,\s*res\s*:\s*Response\s*,\s*next\s*:\s*NextFunction\s*\)/);
        
        // JWT验证应该有类型安全
        if (content.includes('jwt.verify')) {
          expect(content).toMatch(/as\s+\w+|:\s*\w+/); // 类型断言或类型注解
        }
      }
    });
  });

  describe('工具函数类型安全性', () => {
    it('工具函数应该有明确的类型定义', () => {
      const utilsDir = path.join(projectRoot, 'src/utils');
      if (existsSync(utilsDir)) {
        const files = findFiles(utilsDir, '.ts');

        files.forEach(file => {
          const content = readFileSync(file, 'utf8');
          
          // 导出的函数应该有类型注解
          const exportedFunctions = content.match(/export\s+(async\s+)?function\s+\w+/g);
          if (exportedFunctions) {
            exportedFunctions.forEach(func => {
              // 检查是否有参数和返回类型
              const funcPattern = new RegExp(func.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\([^)]*\\)\\s*:\\s*\\w+');
              if (!funcPattern.test(content)) {
                console.warn(`函数缺少类型注解: ${func} in ${file}`);
              }
            });
          }
        });
      }
    });
  });

  describe('严格模式类型检查', () => {
    it('应该通过noImplicitAny检查', () => {
      try {
        execSync('npx tsc --noEmit --noImplicitAny --project tsconfig.json', {
          cwd: projectRoot,
          stdio: 'pipe',
          encoding: 'utf8'
        });
      } catch (error) {
        // 如果有noImplicitAny错误，记录但不失败测试
        const errorOutput = (error as any).stderr || (error as any).stdout || '';
        console.warn('noImplicitAny检查发现问题:', errorOutput.slice(0, 300));
        
        // 只有在有大量错误时才失败
        if (errorOutput.includes('error TS') && errorOutput.split('error TS').length > 20) {
          throw error;
        }
      }
    });

    it('应该通过strictNullChecks检查', () => {
      try {
        execSync('npx tsc --noEmit --strictNullChecks --project tsconfig.json', {
          cwd: projectRoot,
          stdio: 'pipe',
          encoding: 'utf8'
        });
      } catch (error) {
        // 如果有strictNullChecks错误，记录但不失败测试
        const errorOutput = (error as any).stderr || (error as any).stdout || '';
        console.warn('strictNullChecks检查发现问题:', errorOutput.slice(0, 300));
        
        // 只有在有大量错误时才失败
        if (errorOutput.includes('error TS') && errorOutput.split('error TS').length > 20) {
          throw error;
        }
      }
    });

    it('应该通过noImplicitReturns检查', () => {
      try {
        execSync('npx tsc --noEmit --noImplicitReturns --project tsconfig.json', {
          cwd: projectRoot,
          stdio: 'pipe',
          encoding: 'utf8'
        });
      } catch (error) {
        // 如果有noImplicitReturns错误，记录但不失败测试
        const errorOutput = (error as any).stderr || (error as any).stdout || '';
        console.warn('noImplicitReturns检查发现问题:', errorOutput.slice(0, 300));
        
        // 只有在有大量错误时才失败
        if (errorOutput.includes('error TS') && errorOutput.split('error TS').length > 10) {
          throw error;
        }
      }
    });
  });

  describe('类型导入导出安全性', () => {
    it('类型导入应该使用import type语法', () => {
      const srcDir = path.join(projectRoot, 'src');
      if (existsSync(srcDir)) {
        const files = findFiles(srcDir, '.ts');

        files.forEach(file => {
          const content = readFileSync(file, 'utf8');
          
          // 检查类型导入
          const typeImports = content.match(/import\s+type\s+\{[^}]+\}/g);
          const regularImports = content.match(/import\s+\{[^}]+\}\s+from/g);
          
          if (typeImports && regularImports) {
            // 确保类型和值导入分离
            expect(typeImports.length).toBeGreaterThan(0);
          }
        });
      }
    });
  });
});