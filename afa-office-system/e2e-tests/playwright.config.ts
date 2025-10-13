import { defineConfig, devices } from '@playwright/test';

/**
 * AFA办公系统端到端测试配置
 * 
 * 测试环境说明：
 * - 租务管理端: http://localhost:5000
 * - 商户管理端: http://localhost:5050  
 * - 后端API: http://localhost:5100
 * - 微信小程序: 通过开发者工具测试
 */

// 环境变量配置
const TEST_ENV = process.env.TEST_ENV || 'local';
const CI = !!process.env.CI;
const DEBUG = !!process.env.DEBUG;

// 环境配置映射
const envConfig = {
  local: {
    tenantAdminUrl: 'http://localhost:5000',
    merchantAdminUrl: 'http://localhost:5050',
    apiUrl: 'http://localhost:5100',
  },
  staging: {
    tenantAdminUrl: process.env.STAGING_TENANT_URL || 'https://tenant-staging.afa-office.com',
    merchantAdminUrl: process.env.STAGING_MERCHANT_URL || 'https://merchant-staging.afa-office.com',
    apiUrl: process.env.STAGING_API_URL || 'https://api-staging.afa-office.com',
  },
  production: {
    tenantAdminUrl: process.env.PROD_TENANT_URL || 'https://tenant.afa-office.com',
    merchantAdminUrl: process.env.PROD_MERCHANT_URL || 'https://merchant.afa-office.com',
    apiUrl: process.env.PROD_API_URL || 'https://api.afa-office.com',
  }
};

const currentEnvConfig = envConfig[TEST_ENV as keyof typeof envConfig] || envConfig.local;

export default defineConfig({
  testDir: './tests',
  
  /* 测试文件匹配模式 */
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  
  /* 并行运行测试 */
  fullyParallel: !DEBUG,
  
  /* 在CI环境中失败时不重试 */
  forbidOnly: CI,
  
  /* 重试配置 */
  retries: CI ? 2 : (DEBUG ? 0 : 1),
  
  /* 并行工作进程数 */
  workers: CI ? 1 : (DEBUG ? 1 : undefined),
  
  /* 超时配置 */
  timeout: 30 * 1000, // 30秒测试超时
  expect: {
    timeout: 10 * 1000, // 10秒断言超时
  },
  
  /* 测试报告配置 */
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report',
      open: DEBUG ? 'always' : 'never'
    }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line'],
    ...(CI ? [['github'] as const] : []),
    ...(process.env.ALLURE_RESULTS_DIR ? [['allure-playwright'] as const] : []),
  ],
  
  /* 全局测试配置 */
  use: {
    /* 基础URL - 默认使用租务管理端 */
    baseURL: currentEnvConfig.tenantAdminUrl,
    
    /* 测试追踪配置 */
    trace: DEBUG ? 'on' : 'on-first-retry',
    
    /* 截图配置 */
    screenshot: DEBUG ? 'on' : 'only-on-failure',
    
    /* 视频录制配置 */
    video: DEBUG ? 'on' : 'retain-on-failure',
    
    /* 浏览器上下文配置 */
    viewport: { width: 1280, height: 720 },
    
    /* 忽略HTTPS错误 */
    ignoreHTTPSErrors: true,
    
    /* 用户代理 */
    userAgent: 'AFA-E2E-Test-Agent/1.0',
    
    /* 额外的HTTP头 */
    extraHTTPHeaders: {
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
    
    /* 导航超时 */
    navigationTimeout: 15 * 1000,
    
    /* 操作超时 */
    actionTimeout: 10 * 1000,
    
    /* 禁用动画以提高测试稳定性 */
    ...(CI && {
      reducedMotion: 'reduce',
    }),
  },

  /* 测试项目配置 - 不同的浏览器和设备 */
  projects: [
    // 桌面浏览器测试
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: ['**/!(mobile)*.test.ts', '**/!(mobile)*.spec.ts'],
    },
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: ['**/!(mobile)*.test.ts', '**/!(mobile)*.spec.ts'],
    },
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: ['**/!(mobile)*.test.ts', '**/!(mobile)*.spec.ts'],
    },
    {
      name: 'edge-desktop',
      use: { 
        ...devices['Desktop Edge'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: ['**/!(mobile)*.test.ts', '**/!(mobile)*.spec.ts'],
    },
    
    // 移动端测试
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        isMobile: true,
      },
      testMatch: ['**/mobile*.test.ts', '**/mobile*.spec.ts', '**/responsive*.test.ts'],
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        isMobile: true,
      },
      testMatch: ['**/mobile*.test.ts', '**/mobile*.spec.ts', '**/responsive*.test.ts'],
    },
    
    // 平板测试
    {
      name: 'tablet-chrome',
      use: { 
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 },
      },
      testMatch: ['**/tablet*.test.ts', '**/responsive*.test.ts'],
    },
    
    // 高分辨率显示器测试
    {
      name: 'chromium-4k',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 3840, height: 2160 },
        deviceScaleFactor: 2,
      },
      testMatch: ['**/high-res*.test.ts'],
    },
    
    // 性能测试专用配置
    {
      name: 'performance-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // 启用性能监控
        launchOptions: {
          args: ['--enable-precise-memory-info'],
        },
      },
      testMatch: ['**/performance*.test.ts'],
    },
  ],

  /* 本地开发服务器配置 - 暂时禁用自动启动 */
  // webServer配置暂时注释，需要手动启动服务
  // ...(TEST_ENV === 'local' && {
  //   webServer: [
  //     {
  //       command: 'cd ../backend && pnpm dev',
  //       port: 5100,
  //       url: 'http://localhost:5100/api/v1/health',
  //       reuseExistingServer: !CI,
  //       timeout: 120 * 1000,
  //       env: {
  //         NODE_ENV: 'test',
  //         PORT: '5100',
  //       },
  //     },
  //     {
  //       command: 'cd ../frontend/tenant-admin && pnpm dev',
  //       port: 5000,
  //       url: 'http://localhost:5000',
  //       reuseExistingServer: !CI,
  //       timeout: 120 * 1000,
  //       env: {
  //         NODE_ENV: 'test',
  //         VITE_PORT: '5000',
  //         VITE_API_BASE_URL: 'http://localhost:5100/api/v1',
  //       },
  //     },
  //     {
  //       command: 'cd ../frontend/merchant-admin && pnpm dev',
  //       port: 5050,
  //       url: 'http://localhost:5050',
  //       reuseExistingServer: !CI,
  //       timeout: 120 * 1000,
  //       env: {
  //         NODE_ENV: 'test',
  //         VITE_PORT: '5050',
  //         VITE_API_BASE_URL: 'http://localhost:5100/api/v1',
  //       },
  //     }
  //   ],
  // }),
  
  /* 全局设置和清理 */
  globalSetup: './utils/global-setup.ts',
  globalTeardown: './utils/global-teardown.ts',
  
  /* 测试输出目录 */
  outputDir: 'test-results/',
  
  /* 元数据 */
  metadata: {
    testEnvironment: TEST_ENV,
    baseUrls: currentEnvConfig,
    timestamp: new Date().toISOString(),
  },
});