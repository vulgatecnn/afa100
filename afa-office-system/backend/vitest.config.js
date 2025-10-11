import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/enhanced-setup.ts'],
    testTimeout: 15000, // 增加超时时间以适应增强功能
    hookTimeout: 15000,
    // 支持并发测试但限制并发数以避免资源竞争
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        'database/',
        'dist/',
        'scripts/',
        '**/*.config.js',
        '**/*.config.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.d.ts',
        '**/types.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
      // 确保覆盖率检查在测试失败时也会执行
      skipFull: false,
      // 包含所有源代码文件
      include: ['src/**/*.ts', 'src/**/*.js'],
      // 生成详细的覆盖率报告
      all: true
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});