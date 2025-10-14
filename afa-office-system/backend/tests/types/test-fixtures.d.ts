/**
 * 测试数据 Fixture 类型定义
 * 为测试数据提供完整的类型支持
 */

import type {
  User,
  Merchant,
  Project,
  Venue,
  Floor,
  VisitorApplication,
  AccessRecord,
  UserType,
  UserStatus,
  MerchantStatus,
  ProjectStatus,
  VenueStatus,
  FloorStatus,
  VisitorApplicationStatus,
  AccessRecordResult,
  DeviceType,
  AccessDirection
} from '../../src/types/index.js';

// 测试数据工厂接口
export interface TestDataFactory {
  // 用户相关
  createUser(overrides?: Partial<User>): User;
  createAdminUser(overrides?: Partial<User>): User;
  createMerchantAdmin(merchantId: number, overrides?: Partial<User>): User;
  createEmployee(merchantId: number, overrides?: Partial<User>): User;
  createVisitor(overrides?: Partial<User>): User;

  // 商户相关
  createMerchant(overrides?: Partial<Merchant>): Merchant;
  createMerchantWithUsers(employeeCount?: number): {
    merchant: Merchant;
    admin: User;
    employees: User[];
  };

  // 项目和场地相关
  createProject(overrides?: Partial<Project>): Project;
  createVenue(overrides?: Partial<Venue>): Venue;
  createFloor(overrides?: Partial<Floor>): Floor;
  createProjectWithVenuesAndFloors(venueCount?: number, floorsPerVenue?: number): {
    project: Project;
    venues: Venue[];
    floors: Floor[];
  };

  // 访客相关
  createVisitorApplication(overrides?: Partial<VisitorApplication>): VisitorApplication;
  createApprovedVisitorApplication(overrides?: Partial<VisitorApplication>): VisitorApplication;
  createRejectedVisitorApplication(overrides?: Partial<VisitorApplication>): VisitorApplication;

  // 通行记录相关
  createAccessRecord(overrides?: Partial<AccessRecord>): AccessRecord;
  createSuccessAccessRecord(overrides?: Partial<AccessRecord>): AccessRecord;
  createFailedAccessRecord(overrides?: Partial<AccessRecord>): AccessRecord;

  // 业务流程相关
  createVisitorFlow(): {
    application: VisitorApplication;
    accessRecords: AccessRecord[];
  };

  // 批量创建
  createBatch<T>(factory: () => T, count: number): T[];
  createUniqueData<T extends { id?: number }>(
    factory: (index: number) => T,
    count: number
  ): T[];

  // 工具方法
  generateChineseName(): string;
  generateCompanyName(): string;
  generatePhoneNumber(): string;
  resetAllCounters(): void;
}

// 测试数据模板
export interface UserTemplate {
  id?: number;
  name: string;
  phone: string;
  user_type: UserType;
  status: UserStatus;
  merchant_id?: number | null;
  open_id?: string | null;
  union_id?: string | null;
  avatar?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MerchantTemplate {
  id?: number;
  name: string;
  code: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  status: MerchantStatus;
  settings: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectTemplate {
  id?: number;
  code: string;
  name: string;
  description: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface VenueTemplate {
  id?: number;
  project_id: number;
  code: string;
  name: string;
  description: string;
  status: VenueStatus;
  created_at: string;
  updated_at: string;
}

export interface FloorTemplate {
  id?: number;
  venue_id: number;
  code: string;
  name: string;
  description: string;
  status: FloorStatus;
  created_at: string;
  updated_at: string;
}

export interface VisitorApplicationTemplate {
  id?: number;
  applicant_id: number;
  merchant_id: number;
  visitee_id: number;
  visitor_name: string;
  visitor_phone: string;
  visitor_company: string;
  visit_purpose: string;
  visit_type: string;
  scheduled_time: string;
  duration: number;
  status: VisitorApplicationStatus;
  approved_by?: number | null;
  approved_at?: string | null;
  passcode?: string | null;
  passcode_expiry?: string | null;
  usage_limit: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface AccessRecordTemplate {
  id?: number;
  user_id: number;
  passcode_id?: number | null;
  device_id: string;
  device_type: DeviceType;
  direction: AccessDirection;
  result: AccessRecordResult;
  fail_reason?: string | null;
  project_id: number;
  venue_id: number;
  floor_id: number;
  timestamp: string;
}

// 测试数据集合类型
export interface TestDataSet {
  users: User[];
  merchants: Merchant[];
  projects: Project[];
  venues: Venue[];
  floors: Floor[];
  visitorApplications: VisitorApplication[];
  accessRecords: AccessRecord[];
}

// 测试场景数据类型
export interface TestScenario {
  name: string;
  description: string;
  data: TestDataSet;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

// 数据生成器配置
export interface DataGeneratorConfig {
  userCount?: number;
  merchantCount?: number;
  projectCount?: number;
  venueCount?: number;
  floorCount?: number;
  visitorApplicationCount?: number;
  accessRecordCount?: number;
  seed?: number;
}

// 测试数据验证器
export interface TestDataValidator {
  validateUser(user: User): boolean;
  validateMerchant(merchant: Merchant): boolean;
  validateProject(project: Project): boolean;
  validateVenue(venue: Venue): boolean;
  validateFloor(floor: Floor): boolean;
  validateVisitorApplication(application: VisitorApplication): boolean;
  validateAccessRecord(record: AccessRecord): boolean;
}

// 测试数据清理器
export interface TestDataCleaner {
  clearUsers(): Promise<void>;
  clearMerchants(): Promise<void>;
  clearProjects(): Promise<void>;
  clearVenues(): Promise<void>;
  clearFloors(): Promise<void>;
  clearVisitorApplications(): Promise<void>;
  clearAccessRecords(): Promise<void>;
  clearAll(): Promise<void>;
}

// 测试数据种子器
export interface TestDataSeeder {
  seedUsers(count: number): Promise<User[]>;
  seedMerchants(count: number): Promise<Merchant[]>;
  seedProjects(count: number): Promise<Project[]>;
  seedVenues(count: number): Promise<Venue[]>;
  seedFloors(count: number): Promise<Floor[]>;
  seedVisitorApplications(count: number): Promise<VisitorApplication[]>;
  seedAccessRecords(count: number): Promise<AccessRecord[]>;
  seedAll(config: DataGeneratorConfig): Promise<TestDataSet>;
}

// 便捷的工厂函数类型
export type CreateTestUser = (overrides?: Partial<User>) => User;
export type CreateTestMerchant = (overrides?: Partial<Merchant>) => Merchant;
export type CreateTestProject = (overrides?: Partial<Project>) => Project;
export type CreateTestVenue = (overrides?: Partial<Venue>) => Venue;
export type CreateTestFloor = (overrides?: Partial<Floor>) => Floor;
export type CreateTestVisitorApplication = (overrides?: Partial<VisitorApplication>) => VisitorApplication;
export type CreateTestAccessRecord = (overrides?: Partial<AccessRecord>) => AccessRecord;

export {};