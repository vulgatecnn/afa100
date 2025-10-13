import { defineConfig, devices } from '@playwright/test';
import { testEnvironmentConfig } from './test-environment.js';

/**
 * 跨浏览器兼容性集成测试配置
 * 支持 Chrome, Firefox, Safari, Edge 的前后端API兼容性测试
 */
export default defineConfig({
  testDir: '../specs/cross-browser',
  
  /* 测试文件匹配模式 */
  testMatch: [
    '**/browser-compatibility.e2e.ts',
    '**/api-compatibility.e2e.ts',
    '**/responsive-design.e2e.ts'
  ],
  
  /* 并行运行测试 */
  fullyParallel: true,
  
  /* CI环境中禁止test.only */
  forbidOnly: !!process.env.CI,
  
  /* 重试配置 - 跨浏览器测试可能需要更多重试 */
  retries: process.env.CI ? 3 : 1,
  
  /* 工作进程配置 */
  workers: process.env.CI ? 2 : 4,
  
  /* 测试报告器 */
  reporter: [
    ['html', { 
      outputFolder: '../reports/cross-browser-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: '../reports/cross-browser-results.json' 
    }],
    ['junit', { 
      outputFile: '../reports/cross-browser-junit.xml' 
    }],
    ['line']
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
    
    /* 额外的浏览器上下文选项 */
    contextOptions: {
      permissions: ['downloads', 'notifications', 'geolocation'],
    }
  },

  /* 跨浏览器测试项目配置 */
  projects: [
    {
      name: 'setup-cross-browser',
      testMatch: '**/setup.e2e.ts',
      teardown: 'cleanup-cross-browser'
    },
    {
      name: 'cleanup-cross-browser',
      testMatch: '**/cleanup.e2e.ts'
    },
    
    /* 桌面浏览器测试 */
    {
      name: 'chrome-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup-cross-browser']
    },
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup-cross-browser']
    },
    {
      name: 'safari-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup-cross-browser']
    },
    {
      name: 'edge-desktop',
      use: { 
        ...devices['Desktop Edge'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup-cross-browser']
    },
    
    /* 平板设备测试 */
    {
      name: 'chrome-tablet',
      use: { 
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 768 }
      },
      dependencies: ['setup-cross-browser']
    },
    {
      name: 'safari-tablet',
      use: { 
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 768 }
      },
      dependencies: ['setup-cross-browser']
    },
    
    /* 移动设备测试 */
    {
      name: 'chrome-mobile',
      use: { 
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 }
      },
      dependencies: ['setup-cross-browser']
    },
    {
      name: 'safari-mobile',
      use: { 
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 }
      },
      dependencies: ['setup-cross-browser']
    },
    
    /* 特定分辨率测试 */
    {
      name: 'chrome-1366x768',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 }
      },
      dependencies: ['setup-cross-browser']
    },
    {
      name: 'firefox-1366x768',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1366, height: 768 }
      },
      dependencies: ['setup-cross-browser']
    }
  ],

  /* 测试服务器配置 */
  webServer: [
    {
      command: 'pnpm --filter backend dev',
      url: testEnvironmentConfig.backend.baseUrl + '/api/v1/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    },
    {
      command: 'pnpm --filter tenant-admin dev',
      url: testEnvironmentConfig.frontend.tenantAdmin.baseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    },
    {
      command: 'pnpm --filter merchant-admin dev',
      url: testEnvironmentConfig.frontend.merchantAdmin.baseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    }
  ],

  /* 输出目录 */
  outputDir: '../reports/cross-browser-artifacts',
  
  /* 全局设置和清理 */
  globalSetup: '../helpers/global-setup.ts',
  globalTeardown: '../helpers/global-teardown.ts'
});

/**
 * 跨浏览器测试环境配置
 */
export const crossBrowserTestConfig = {
  // 支持的浏览器列表
  supportedBrowsers: [
    'chrome-desktop',
    'firefox-desktop', 
    'safari-desktop',
    'edge-desktop'
  ],
  
  // 支持的设备类型
  supportedDevices: [
    'desktop',
    'tablet', 
    'mobile'
  ],
  
  // 支持的分辨率
  supportedResolutions: [
    { width: 1920, height: 1080, name: 'Full HD' },
    { width: 1366, height: 768, name: 'HD' },
    { width: 1024, height: 768, name: 'Tablet' },
    { width: 393, height: 851, name: 'Mobile' }
  ],
  
  // 浏览器特性检测
  browserFeatures: {
    webgl: true,
    webrtc: true,
    websockets: true,
    localStorage: true,
    sessionStorage: true,
    indexedDB: true,
    serviceWorker: true,
    pushNotifications: true,
    geolocation: true,
    camera: true,
    microphone: true
  },
  
  // API兼容性测试配置
  apiCompatibility: {
    testEndpoints: [
      '/api/v1/health',
      '/api/v1/auth/login',
      '/api/v1/users',
      '/api/v1/merchants',
      '/api/v1/visitors'
    ],
    testMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    testHeaders: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Cross-Browser-Test'
    }
  }
};

/**
 * 获取跨浏览器测试配置
 */
export function getCrossBrowserTestConfig() {
  return crossBrowserTestConfig;
}