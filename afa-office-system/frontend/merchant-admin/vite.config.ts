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
    port: 3002,
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
    setupFiles: './src/test/setup.ts',
    testTimeout: 15000 // 增加测试超时时间
  }
})