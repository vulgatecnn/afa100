import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 构建时排除测试文件
    rollupOptions: {
      external: (id) => {
        // 排除测试文件
        return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(id) ||
               /\/tests\//.test(id) ||
               /\/test\//.test(id)
      }
    }
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        'tests/',
        'dist/',
        'build/',
        '**/*.config.*',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.d.ts',
        '**/types.ts',
        'src/main.tsx',
        'src/vite-env.d.ts'
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
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      // 生成详细的覆盖率报告
      all: true
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})