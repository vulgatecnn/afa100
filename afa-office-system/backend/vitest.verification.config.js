/**
 * Vitest配置 - 专门用于修复验证测试
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // 测试环境
    environment: 'node',
    
    // 只运行verification目录下的测试
    include: ['tests/verification/**/*.test.{js,ts}'],
    
    // 排除其他测试
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'tests/unit/**',
      'tests/integration/**',
      'tests/performance/**',
      'tests/security/**'
    ],
    
    // 全局设置
    globals: true,
    
    // 测试超时时间（验证测试可能需要更长时间）
    testTimeout: 60000,
    
    // 钩子超时时间
    hookTimeout: 30000,
    
    // 并发设置
    threads: true,
    maxThreads: 2,
    minThreads: 1,
    
    // 报告器
    reporter: ['verbose', 'json'],
    
    // 输出配置
    outputFile: {
      json: './coverage/verification-results.json'
    },
    
    // 覆盖率配置（验证测试不需要覆盖率）
    coverage: {
      enabled: false
    },
    
    // 监听模式配置
    watch: false,
    
    // 失败时停止
    bail: 1,
    
    // 重试配置
    retry: 0,
    
    // 静默模式
    silent: false,
    
    // 设置工作目录
    root: process.cwd(),
    
    // 环境变量
    env: {
      NODE_ENV: 'test',
      VERIFICATION_MODE: 'true'
    },
    
    // 不使用setup文件，避免数据库依赖
    setupFiles: []
  },
  
  // 解析配置
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
      '@/types': path.resolve(process.cwd(), 'src/types'),
      '@/utils': path.resolve(process.cwd(), 'src/utils'),
      '@/config': path.resolve(process.cwd(), 'src/config'),
      '@/models': path.resolve(process.cwd(), 'src/models'),
      '@/services': path.resolve(process.cwd(), 'src/services'),
      '@/controllers': path.resolve(process.cwd(), 'src/controllers'),
      '@/middleware': path.resolve(process.cwd(), 'src/middleware')
    }
  },
  
  // 定义全局变量
  define: {
    __VERIFICATION_TEST__: true
  }
});