/**
 * 测试类型定义入口文件
 * 统一导出所有测试相关的类型定义
 */

/// <reference path="./global-test-types.d.ts" />
/// <reference path="./vitest-mocks.d.ts" />
/// <reference path="./third-party-mocks.d.ts" />
/// <reference path="./api-test-types.d.ts" />
/// <reference path="./test-fixtures.d.ts" />
/// <reference path="./supertest-extensions.d.ts" />
/// <reference path="./test-type-config.ts" />

// 重新导出主要的类型
export type {
  MockRequest,
  MockResponse,
  MockNextFunction,
  MockAxiosInstance,
  MockDatabase,
  MockModel,
  MockService,
  MockJWT,
  MockBcrypt,
  MockFactory as MockFactoryType,
  MockFunctionFactory
} from './vitest-mocks.js';

export type {
  ApiTestClient,
  LoginCredentials,
  WechatLoginData,
  LoginResponse,
  TokenResponse,
  CreateUserData,
  UpdateUserData,
  CreateMerchantData,
  UpdateMerchantData,
  CreateVisitorApplicationData,
  RecordAccessData,
  AccessRecordQuery,
  ApiResponse,
  PaginatedResponse,
  ErrorResponse,
  ApiTestAssertions as ApiTestAssertionsInterface,
  MockApiClient,
  TestEnvironmentConfig,
  ApiTestUtils as ApiTestUtilsInterface,
  ApiTestDataGenerator,
  ApiTestScenario,
  PerformanceTestConfig,
  PerformanceTestResult,
  IntegrationTestSuite
} from './api-test-types.js';

export type {
  TestDataFactory as TestDataFactoryInterface,
  UserTemplate,
  MerchantTemplate,
  ProjectTemplate,
  VenueTemplate,
  FloorTemplate,
  VisitorApplicationTemplate,
  AccessRecordTemplate,
  TestDataSet,
  TestScenario,
  DataGeneratorConfig,
  TestDataValidator as TestDataValidatorInterface,
  TestDataCleaner,
  TestDataSeeder,
  CreateTestUser,
  CreateTestMerchant,
  CreateTestProject,
  CreateTestVenue,
  CreateTestFloor,
  CreateTestVisitorApplication,
  CreateTestAccessRecord
} from './test-fixtures.js';

export type {
  TestConfig,
  MockConfig,
  DatabaseTestConfig,
  ApiTestConfig,
  TestDataConfig,
  TestReportConfig,
  PerformanceTestConfig as PerformanceTestConfigType,
  IntegrationTestConfig,
  E2ETestConfig,
  GlobalTestConfig,
  TestEnvironment,
  TestPhase,
  TestStatus,
  TestPriority,
  TestCategory,
  TestSuiteConfig,
  TestCaseConfig,
  TestTags,
  TestMetadata,
  TestResult,
  TestSuiteResult
} from './test-type-config.js';

// 导出配置常量
export {
  DEFAULT_TEST_CONFIG,
  DEFAULT_MOCK_CONFIG,
  DEFAULT_API_TEST_CONFIG
} from './test-type-config.js';

// 导出工具类
export {
  EnhancedApiTestClient,
  ApiTestAssertions,
  ApiTestUtils,
  createApiTestClient
} from '../utils/api-test-client.js';

export {
  createMockRequest,
  createMockResponse,
  createMockNext,
  createMockAxios,
  createMockDatabase,
  createMockModel,
  createMockJWT,
  createMockBcrypt,
  createMockService,
  resetAllMocks,
  MockFactory,
  createTypedMock,
  createTypedMockFunction,
  setupGlobalMocks,
  cleanupGlobalMocks
} from '../utils/mock-utils.js';

export {
  TestDataFactory,
  createTestMerchant,
  createTestUser,
  createTestProject,
  createTestVenue,
  createTestFloor,
  createTestVisitorApplication,
  createTestAccessRecord
} from '../helpers/test-data-factory.js';

// 导出新的测试类型工具
export {
  TypedMockGenerator,
  TestDataValidator,
  TestTypeAssertions,
  TestEnvironmentUtils,
  TestTimeUtils,
  TestErrorUtils,
  AsyncTestUtils,
  createTypedMock as createTypedMockNew,
  createMockFunction,
  validateInterface,
  assertType,
  createTestError,
  waitFor
} from '../utils/test-type-utils.js';

export {
  TestSetupManager,
  DatabaseTestSetup,
  ApiTestSetup,
  MockSetupManager,
  TestLifecycleHooks,
  setupTestEnvironment,
  setupTestSuite,
  setupTestCase
} from '../utils/test-setup-utils.js';

export {
  setupCustomMatchers,
  apiMatchers,
  modelMatchers,
  databaseMatchers,
  authMatchers,
  performanceMatchers
} from '../utils/test-matchers.js';

export {};