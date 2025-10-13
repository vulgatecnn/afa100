import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 15000,
    teardownTimeout: 5000,
    // 不使用任何 setup 文件
    setupFiles: [],
    // 只运行指定的测试文件
    include: ['tests/integration/api-connectivity-verification.test.ts']
  },
  esbuild: {
    target: 'node18'
  }
})