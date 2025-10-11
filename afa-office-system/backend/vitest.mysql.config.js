import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/mysql-setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    // 限制并发以避免数据库连接问题
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 2,
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
      skipFull: false,
      include: ['src/**/*.ts', 'src/**/*.js'],
      all: true
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});