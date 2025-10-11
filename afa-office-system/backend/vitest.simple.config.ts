import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // 不使用复杂的setup文件
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/utils/mysql-*',
        'src/utils/enhanced-*',
        'src/utils/database.ts',
        'src/utils/connection-pool.ts',
        'src/utils/transaction-manager.ts',
        'src/utils/retry-manager.ts',
        'src/utils/timeout-manager.ts',
        'src/utils/test-environment-manager.ts',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    testTimeout: 10000,
    // 只运行增强测试文件
    include: [
      'tests/unit/middleware/*.enhanced.test.ts',
      'tests/unit/utils/*.enhanced.test.ts'
    ],
    // 排除有数据库依赖的测试
    exclude: [
      'tests/unit/middleware/auth.middleware.test.ts',
      'tests/unit/middleware/permission.middleware.test.ts',
      'tests/unit/middleware/logger.middleware.test.ts',
      'tests/unit/utils/jwt.test.ts',
      'tests/unit/utils/qrcode.test.ts',
      'tests/unit/utils/database.test.ts',
      'tests/**/*mysql*',
      'tests/**/*enhanced-setup*',
    ]
  }
});