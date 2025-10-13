import { defineConfig } from '@playwright/test';
import { testEnvironmentConfig } from './test-environment';

/**
 * 业务场景端到端测试配置
 * 专门为复杂业务流程测试优化的Playwright配置
 */
export default defineConfig({
  testDir: '../specs/business',
  
  /* 测试文件匹配模式 - 只运行业务场景测试 */
  testMatch: [
    '**/complete-user-workflows.e2e.ts',
    '**/complex-business-scenarios.e2e.ts'
  ],
  
  /* 并行配置 - 业务场景测试通常需要更多资源 */
  fullyParallel: false, // 禁用完全并行，避免资源冲突
  workers: process.env.CI ? 1 : 2, // CI环境使用单worker，本地使用2个
  
  /* 重试配置 - 业务场景测试更容易受环境影响 */
  retries: process.env.CI ? 3 : 1,
  
  /* 超时配置 - 业务场景测试通常需要更长时间 */
  timeout: 5 * 60 * 1000, // 5分钟超时
  expect: {
    timeout: 30 * 1000 // 30秒断言超时
  },
  
  /* 测试报告器 */
  reporter: [
    ['html', { 
      outputFolder: '../reports/business-scenarios-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: '../reports/business-scenarios-results.json' 
    }],
    ['junit', { 
      outputFile: '../reports/business-scenarios-junit.xml' 
    }],
    ['line'] // 控制台输出
  ],
  
  /* 全局测试配置 */
  use: {
    /* 基础URL */
    baseURL: testEnvironmentConfig.backend.baseUrl,
    
    /* 超时配置 */
    actionTimeout: 15 * 1000, // 15秒操作超时
    navigationTimeout: 30 * 1000, // 30秒导航超时
    
    /* 失败时收集更多信息 */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    /* 浏览器配置 */
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    
    /* 存储状态 - 用于保持登录状态 */
    storageState: undefined, // 每个测试独立登录
    
    /* 额外的浏览器上下文选项 */
    contextOptions: {
      // 增加权限以支持文件下载等操作
      permissions: ['downloads', 'notifications'],
      // 禁用图片加载以提高性能
      // bypassCSP: true
    }
  },

  /* 测试项目配置 - 针对不同场景的配置 */
  projects: [
    {
      name: 'setup-business-scenarios',
      testMatch: '**/setup.e2e.ts',
      teardown: 'cleanup-business-scenarios'
    },
    {
      name: 'cleanup-business-scenarios', 
      testMatch: '**/cleanup.e2e.ts'
    },
    {
      name: 'user-workflows-chrome',
      testMatch: '**/complete-user-workflows.e2e.ts',
      use: {
        ...require('@playwright/test').devices['Desktop Chrome'],
        // 用户流程测试的特定配置
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox'
          ]
        }
      },
      dependencies: ['setup-business-scenarios']
    },
    {
      name: 'business-scenarios-chrome',
      testMatch: '**/complex-business-scenarios.e2e.ts',
      use: {
        ...require('@playwright/test').devices['Desktop Chrome'],
        // 复杂场景测试的特定配置
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
            '--max_old_space_size=4096' // 增加内存限制
          ]
        }
      },
      dependencies: ['setup-business-scenarios']
    },
    {
      name: 'cross-browser-validation',
      testMatch: '**/complete-user-workflows.e2e.ts',
      use: {
        ...require('@playwright/test').devices['Desktop Firefox']
      },
      dependencies: ['user-workflows-chrome']
    }
  ],

  /* 测试服务器配置 */
  webServer: [
    {
      command: 'pnpm --filter backend dev',
      url: testEnvironmentConfig.backend.baseUrl + '/api/v1/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      stdout: 'pipe',
      stderr: 'pipe'
    },
    {
      command: 'pnpm --filter tenant-admin dev',
      url: testEnvironmentConfig.frontend.tenantAdmin.baseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      stdout: 'pipe',
      stderr: 'pipe'
    },
    {
      command: 'pnpm --filter merchant-admin dev',
      url: testEnvironmentConfig.frontend.merchantAdmin.baseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      stdout: 'pipe',
      stderr: 'pipe'
    }
  ],

  /* 输出目录 */
  outputDir: '../reports/business-scenarios-artifacts',
  
  /* 全局设置和清理 */
  globalSetup: '../helpers/global-setup.ts',
  globalTeardown: '../helpers/global-teardown.ts',
  
  /* 元数据 */
  metadata: {
    testType: 'business-scenarios',
    environment: process.env.NODE_ENV || 'test',
    version: process.env.npm_package_version || '1.0.0'
  }
});

/**
 * 业务场景测试的环境变量配置
 */
export const businessScenariosEnv = {
  // 测试数据配置
  TEST_DATA_SEED: process.env.TEST_DATA_SEED || '12345',
  RESET_DB_BEFORE_TESTS: process.env.RESET_DB_BEFORE_TESTS || 'true',
  
  // 性能测试配置
  LOAD_TEST_CONCURRENT_USERS: process.env.LOAD_TEST_CONCURRENT_USERS || '20',
  LOAD_TEST_DURATION: process.env.LOAD_TEST_DURATION || '30000', // 30秒
  
  // 超时配置
  BUSINESS_SCENARIO_TIMEOUT: process.env.BUSINESS_SCENARIO_TIMEOUT || '300000', // 5分钟
  
  // 调试配置
  DEBUG_MODE: process.env.DEBUG_MODE || 'false',
  HEADLESS: process.env.HEADLESS !== 'false', // 默认无头模式
  
  // 报告配置
  GENERATE_DETAILED_REPORT: process.env.GENERATE_DETAILED_REPORT || 'true',
  REPORT_INCLUDE_SCREENSHOTS: process.env.REPORT_INCLUDE_SCREENSHOTS || 'true',
  
  // 清理配置
  CLEANUP_AFTER_TESTS: process.env.CLEANUP_AFTER_TESTS || 'true'
};

/**
 * 获取业务场景测试配置
 */
export function getBusinessScenariosConfig() {
  return {
    ...businessScenariosEnv,
    testEnvironment: testEnvironmentConfig
  };
}