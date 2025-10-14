/**
 * 测试类型配置文件
 * 统一配置测试环境的类型定义和全局设置
 */

/// <reference types="vitest/globals" />
/// <reference types="@types/supertest" />
/// <reference types="@types/node" />

import type { MockedFunction, MockedObject } from 'vitest';

// 测试配置类型
export interface TestConfig {
  database: {
    type: 'sqlite' | 'mysql' | 'postgresql';
    path?: string;
    url?: string;
    resetBetweenTests: boolean;
  };
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  auth: {
    jwtSecret: string;
    tokenExpiry: number;
  };
  wechat: {
    appId: string;
    appSecret: string;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enabled: boolean;
  };
}

// 测试套件配置
export interface TestSuiteConfig {
  name: string;
  description: string;
  timeout: number;
  retries: number;
  parallel: boolean;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

// 测试用例配置
export interface TestCaseConfig {
  name: string;
  description?: string;
  timeout?: number;
  retries?: number;
  skip?: boolean;
  only?: boolean;
  tags?: string[];
}

// Mock 配置类型
export interface MockConfig {
  resetBetweenTests: boolean;
  clearBetweenTests: boolean;
  restoreBetweenTests: boolean;
  globalMocks: {
    database: boolean;
    jwt: boolean;
    bcrypt: boolean;
    axios: boolean;
    wechat: boolean;
  };
}

// 数据库测试配置
export interface DatabaseTestConfig {
  migrations: {
    run: boolean;
    path: string;
  };
  seeds: {
    run: boolean;
    path: string;
  };
  cleanup: {
    strategy: 'truncate' | 'delete' | 'drop';
    tables?: string[];
  };
}

// API 测试配置
export interface ApiTestConfig {
  authentication: {
    enabled: boolean;
    defaultUser?: {
      id: number;
      userType: string;
      merchantId?: number;
    };
  };
  validation: {
    strict: boolean;
    checkResponseFormat: boolean;
    checkStatusCodes: boolean;
  };
  performance: {
    enabled: boolean;
    thresholds: {
      responseTime: number;
      throughput: number;
    };
  };
}

// 测试数据配置
export interface TestDataConfig {
  generation: {
    seed: number;
    locale: string;
    dateFormat: string;
  };
  validation: {
    strict: boolean;
    checkConstraints: boolean;
    checkRelations: boolean;
  };
  cleanup: {
    auto: boolean;
    strategy: 'cascade' | 'manual';
  };
}

// 测试报告配置
export interface TestReportConfig {
  coverage: {
    enabled: boolean;
    threshold: {
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    };
    exclude: string[];
  };
  output: {
    format: 'json' | 'html' | 'text' | 'xml';
    directory: string;
    filename?: string;
  };
  notifications: {
    enabled: boolean;
    channels: ('console' | 'file' | 'webhook')[];
  };
}

// 性能测试配置
export interface PerformanceTestConfig {
  load: {
    users: number;
    duration: number;
    rampUp: number;
  };
  stress: {
    maxUsers: number;
    increment: number;
    duration: number;
  };
  spike: {
    baseUsers: number;
    spikeUsers: number;
    spikeDuration: number;
  };
  thresholds: {
    responseTime: {
      p95: number;
      p99: number;
    };
    errorRate: number;
    throughput: number;
  };
}

// 集成测试配置
export interface IntegrationTestConfig {
  services: {
    database: boolean;
    redis: boolean;
    wechat: boolean;
    external: boolean;
  };
  network: {
    timeout: number;
    retries: number;
    delay: number;
  };
  isolation: {
    level: 'none' | 'process' | 'container';
    cleanup: boolean;
  };
}

// E2E 测试配置
export interface E2ETestConfig {
  browser: {
    type: 'chromium' | 'firefox' | 'webkit';
    headless: boolean;
    viewport: {
      width: number;
      height: number;
    };
  };
  server: {
    autoStart: boolean;
    port: number;
    timeout: number;
  };
  screenshots: {
    enabled: boolean;
    onFailure: boolean;
    directory: string;
  };
}

// 全局测试配置
export interface GlobalTestConfig {
  test: TestConfig;
  suites: Record<string, TestSuiteConfig>;
  mocks: MockConfig;
  database: DatabaseTestConfig;
  api: ApiTestConfig;
  data: TestDataConfig;
  reports: TestReportConfig;
  performance: PerformanceTestConfig;
  integration: IntegrationTestConfig;
  e2e: E2ETestConfig;
}

// 测试环境类型
export type TestEnvironment = 'unit' | 'integration' | 'e2e' | 'performance';

// 测试阶段类型
export type TestPhase = 'setup' | 'execute' | 'verify' | 'cleanup';

// 测试状态类型
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

// 测试优先级类型
export type TestPriority = 'low' | 'medium' | 'high' | 'critical';

// 测试类别类型
export type TestCategory = 'smoke' | 'regression' | 'acceptance' | 'security' | 'performance';

// 默认配置
export const DEFAULT_TEST_CONFIG: TestConfig = {
  database: {
    type: 'sqlite',
    path: ':memory:',
    resetBetweenTests: true,
  },
  api: {
    baseUrl: 'http://localhost:5100',
    timeout: 5000,
    retries: 3,
  },
  auth: {
    jwtSecret: 'test-jwt-secret',
    tokenExpiry: 3600,
  },
  wechat: {
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
  },
  logging: {
    level: 'error',
    enabled: false,
  },
};

export const DEFAULT_MOCK_CONFIG: MockConfig = {
  resetBetweenTests: true,
  clearBetweenTests: true,
  restoreBetweenTests: true,
  globalMocks: {
    database: true,
    jwt: true,
    bcrypt: true,
    axios: true,
    wechat: true,
  },
};

export const DEFAULT_API_TEST_CONFIG: ApiTestConfig = {
  authentication: {
    enabled: true,
    defaultUser: {
      id: 1,
      userType: 'tenant_admin',
    },
  },
  validation: {
    strict: true,
    checkResponseFormat: true,
    checkStatusCodes: true,
  },
  performance: {
    enabled: false,
    thresholds: {
      responseTime: 1000,
      throughput: 100,
    },
  },
};

// 测试标签类型
export interface TestTags {
  environment: TestEnvironment[];
  category: TestCategory[];
  priority: TestPriority;
  components: string[];
  features: string[];
}

// 测试元数据类型
export interface TestMetadata {
  id: string;
  name: string;
  description: string;
  tags: TestTags;
  author: string;
  created: string;
  updated: string;
  version: string;
}

// 测试结果类型
export interface TestResult {
  id: string;
  name: string;
  status: TestStatus;
  duration: number;
  error?: Error;
  logs: string[];
  metrics?: {
    memory: number;
    cpu: number;
    network: number;
  };
}

// 测试套件结果类型
export interface TestSuiteResult {
  name: string;
  status: TestStatus;
  duration: number;
  tests: TestResult[];
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}