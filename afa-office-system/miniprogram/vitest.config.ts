// Vitest 配置文件
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // 测试环境
    environment: 'jsdom',
    
    // 全局设置文件
    setupFiles: ['./tests/setup.ts'],
    
    // 测试文件匹配模式
    include: [
      'tests/**/*.{test,spec}.{js,ts}',
      '**/__tests__/**/*.{js,ts}'
    ],
    
    // 排除文件
    exclude: [
      'node_modules',
      'dist',
      '.git'
    ],
    
    // 全局变量
    globals: true,
    
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'services/**/*.ts',
        'utils/**/*.ts',
        'pages/**/*.ts',
        'components/**/*.ts'
      ],
      exclude: [
        'tests/**',
        'node_modules/**',
        '**/*.d.ts',
        '**/*.config.ts',
        'app.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      },
      // 确保覆盖率检查在测试失败时也会执行
      skipFull: false,
      // 生成详细的覆盖率报告
      all: true
    },
    
    // 测试超时时间
    testTimeout: 10000,
    
    // 并发运行
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false
      }
    }
  },
  
  // 路径别名
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@/services': path.resolve(__dirname, 'services'),
      '@/utils': path.resolve(__dirname, 'utils'),
      '@/types': path.resolve(__dirname, 'types'),
      '@/pages': path.resolve(__dirname, 'pages'),
      '@/components': path.resolve(__dirname, 'components')
    }
  }
});