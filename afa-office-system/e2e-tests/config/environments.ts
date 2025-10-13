/**
 * 测试环境配置
 * 支持多环境测试配置管理
 */

export interface EnvironmentConfig {
  name: string;
  tenantAdminUrl: string;
  merchantAdminUrl: string;
  apiUrl: string;
  database?: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  features?: {
    enableMockApi: boolean;
    enablePerformanceMonitoring: boolean;
    enableVisualTesting: boolean;
  };
}

export const environments: Record<string, EnvironmentConfig> = {
  local: {
    name: 'Local Development',
    tenantAdminUrl: 'http://localhost:5000',
    merchantAdminUrl: 'http://localhost:5050',
    apiUrl: 'http://localhost:5100',
    database: {
      host: 'localhost',
      port: 3306,
      database: 'afa_office_test',
      username: 'test_user',
      password: 'test_password',
    },
    features: {
      enableMockApi: true,
      enablePerformanceMonitoring: true,
      enableVisualTesting: false,
    },
  },
  
  staging: {
    name: 'Staging Environment',
    tenantAdminUrl: process.env.STAGING_TENANT_URL || 'https://tenant-staging.afa-office.com',
    merchantAdminUrl: process.env.STAGING_MERCHANT_URL || 'https://merchant-staging.afa-office.com',
    apiUrl: process.env.STAGING_API_URL || 'https://api-staging.afa-office.com',
    features: {
      enableMockApi: false,
      enablePerformanceMonitoring: true,
      enableVisualTesting: true,
    },
  },
  
  production: {
    name: 'Production Environment',
    tenantAdminUrl: process.env.PROD_TENANT_URL || 'https://tenant.afa-office.com',
    merchantAdminUrl: process.env.PROD_MERCHANT_URL || 'https://merchant.afa-office.com',
    apiUrl: process.env.PROD_API_URL || 'https://api.afa-office.com',
    features: {
      enableMockApi: false,
      enablePerformanceMonitoring: false,
      enableVisualTesting: false,
    },
  },
  
  ci: {
    name: 'CI Environment',
    tenantAdminUrl: 'http://localhost:5000',
    merchantAdminUrl: 'http://localhost:5050',
    apiUrl: 'http://localhost:5100',
    database: {
      host: 'localhost',
      port: 3306,
      database: 'afa_office_ci_test',
      username: 'ci_user',
      password: 'ci_password',
    },
    features: {
      enableMockApi: true,
      enablePerformanceMonitoring: false,
      enableVisualTesting: false,
    },
  },
};

/**
 * 获取当前环境配置
 */
export function getCurrentEnvironment(): EnvironmentConfig {
  const envName = process.env.TEST_ENV || 'local';
  const config = environments[envName];
  
  if (!config) {
    throw new Error(`Unknown test environment: ${envName}. Available environments: ${Object.keys(environments).join(', ')}`);
  }
  
  return config;
}

/**
 * 验证环境配置
 */
export function validateEnvironmentConfig(config: EnvironmentConfig): void {
  const requiredFields = ['name', 'tenantAdminUrl', 'merchantAdminUrl', 'apiUrl'];
  
  for (const field of requiredFields) {
    if (!config[field as keyof EnvironmentConfig]) {
      throw new Error(`Missing required environment config field: ${field}`);
    }
  }
  
  // 验证URL格式
  const urls = [config.tenantAdminUrl, config.merchantAdminUrl, config.apiUrl];
  for (const url of urls) {
    try {
      new URL(url);
    } catch (error) {
      throw new Error(`Invalid URL format: ${url}`);
    }
  }
}

/**
 * 获取环境特定的超时配置
 */
export function getTimeoutConfig(envName: string) {
  const timeouts = {
    local: {
      test: 30000,
      expect: 10000,
      navigation: 15000,
      action: 10000,
    },
    staging: {
      test: 60000,
      expect: 15000,
      navigation: 30000,
      action: 15000,
    },
    production: {
      test: 90000,
      expect: 20000,
      navigation: 45000,
      action: 20000,
    },
    ci: {
      test: 45000,
      expect: 12000,
      navigation: 20000,
      action: 12000,
    },
  };
  
  return timeouts[envName as keyof typeof timeouts] || timeouts.local;
}