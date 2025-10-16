import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
    port: process.env.VITE_PORT ? parseInt(process.env.VITE_PORT) : 5050,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:5100',
        changeOrigin: true
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 60000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    maxConcurrency: 1,
    isolate: true,
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
      skipFull: false,
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      all: true
    },
  }
})
