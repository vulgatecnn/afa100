import { defineConfig, devices } from '@playwright/test';
import { testEnvironmentConfig } from './test-environment.js';

/**
 * Playwright端到端测试配置
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: '../specs',
  
  /* 测试文件匹配模式 */
  testMatch: '**/*.e2e.{ts,js}',
  
  /* 并行运行测试 */
  fullyParallel: true,
  
  /* CI环境中禁止test.only */
  forbidOnly: !!process.env.CI,
  
  /* 重试配置 */
  retries: process.env.CI ? testEnvironmentConfig.retries.default : 0,
  
  /* CI环境中使用单个worker */
  workers: process.env.CI ? 1 : undefined,
  
  /* 测试报告器 */
  reporter: [
    ['html', { outputFolder: '../reports/playwright-report' }],
    ['json', { outputFile: '../reports/test-results.json' }],
    ['junit', { outputFile: '../reports/junit-results.xml' }]
  ],
  
  /* 全局测试配置 */
  use: {
    /* 基础URL */
    baseURL: testEnvironmentConfig.backend.baseUrl,
    
    /* 超时配置 */
    actionTimeout: testEnvironmentConfig.timeouts.default,
    navigationTimeout: testEnvironmentConfig.timeouts.navigation,
    
    /* 失败时收集trace */
    trace: 'on-first-retry',
    
    /* 失败时截图 */
    screenshot: 'only-on-failure',
    
    /* 失败时录制视频 */
    video: 'retain-on-failure',
    
    /* 忽略HTTPS错误 */
    ignoreHTTPSErrors: true,
  },

  /* 测试项目配置 */
  projects: [
    {
      name: 'setup',
      testMatch: '**/setup.e2e.ts',
      teardown: 'cleanup'
    },
    {
      name: 'cleanup',
      testMatch: '**/cleanup.e2e.ts'
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup']
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup']
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup']
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup']
    }
  ],

  /* 测试服务器配置 - 由环境管理器统一管理 */
  // webServer 配置已移至 E2ETestRunner，避免重复启动服务

  /* 输出目录 */
  outputDir: '../reports/test-results',
  
  /* 全局设置和清理 */
  globalSetup: '../helpers/global-setup.ts',
  globalTeardown: '../helpers/global-teardown.ts'
});