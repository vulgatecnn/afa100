/**
 * 端到端测试环境配置
 */

export interface TestEnvironmentConfig {
  backend: {
    baseUrl: string;
    port: number;
    healthEndpoint: string;
  };
  frontend: {
    tenantAdmin: {
      baseUrl: string;
      port: number;
    };
    merchantAdmin: {
      baseUrl: string;
      port: number;
    };
  };
  database: {
    type: 'sqlite' | 'mysql';
    path?: string;
    config?: any;
  };
  timeouts: {
    default: number;
    navigation: number;
    api: number;
  };
  retries: {
    default: number;
    flaky: number;
  };
}

export const testEnvironmentConfig: TestEnvironmentConfig = {
  backend: {
    baseUrl: process.env.E2E_BACKEND_URL || 'http://localhost:5100',
    port: parseInt(process.env.E2E_BACKEND_PORT || '5100'),
    healthEndpoint: '/api/v1/health'
  },
  frontend: {
    tenantAdmin: {
      baseUrl: process.env.E2E_TENANT_ADMIN_URL || 'http://localhost:5000',
      port: parseInt(process.env.E2E_TENANT_ADMIN_PORT || '5000')
    },
    merchantAdmin: {
      baseUrl: process.env.E2E_MERCHANT_ADMIN_URL || 'http://localhost:5050',
      port: parseInt(process.env.E2E_MERCHANT_ADMIN_PORT || '5050')
    }
  },
  database: {
    type: (process.env.E2E_DB_TYPE as 'sqlite' | 'mysql') || 'mysql',
    config: {
      host: process.env.E2E_TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.E2E_TEST_DB_PORT || '3306'),
      database: process.env.E2E_TEST_DB_NAME || 'afa_office_e2e_test',
      user: process.env.E2E_TEST_DB_USER || 'root',
      password: process.env.E2E_TEST_DB_PASSWORD || '',
    }
  },
  timeouts: {
    default: 30000,
    navigation: 10000,
    api: 5000
  },
  retries: {
    default: 2,
    flaky: 3
  }
};

/**
 * 获取测试环境配置
 */
export function getTestEnvironmentConfig(): TestEnvironmentConfig {
  return testEnvironmentConfig;
}

/**
 * 验证测试环境是否就绪
 */
export async function validateTestEnvironment(): Promise<boolean> {
  const config = getTestEnvironmentConfig();
  
  try {
    // 检查后端服务
    const backendResponse = await fetch(`${config.backend.baseUrl}${config.backend.healthEndpoint}`);
    if (!backendResponse.ok) {
      console.error('后端服务不可用');
      return false;
    }

    // 检查前端服务（可选，因为可能在CI环境中不运行）
    if (process.env.E2E_CHECK_FRONTEND !== 'false') {
      try {
        await fetch(config.frontend.tenantAdmin.baseUrl);
        await fetch(config.frontend.merchantAdmin.baseUrl);
      } catch (error) {
        console.warn('前端服务检查失败，但继续执行测试:', error);
      }
    }

    return true;
  } catch (error) {
    console.error('测试环境验证失败:', error);
    return false;
  }
}