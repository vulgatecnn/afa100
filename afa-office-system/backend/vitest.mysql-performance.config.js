import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // 不使用enhanced-setup，使用简单的setup
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 60000, // 性能测试需要更长时间
    hookTimeout: 30000,
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 1, // MySQL测试使用单线程避免连接冲突
        minThreads: 1
      }
    },
    // 只运行MySQL性能测试
    include: ['tests/performance/mysql-*.test.ts'],
    // 测试完成后直接退出，不进入watch模式
    watch: false,
    run: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
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
        '**/*.d.ts'
      ]
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});