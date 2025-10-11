// 基础类型定义
import { Request } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  code?: number;
  timestamp: string;
}

export interface ErrorResponse extends ApiResponse {
  success: false;
  path?: string;
  method?: string;
  stack?: string;
  details?: any;
}

// 用户相关类型
export type UserType = 'tenant_admin' | 'merchant_admin' | 'employee' | 'visitor';
export type UserStatus = 'active' | 'inactive' | 'pending';

export interface User {
  id: number;
  open_id?: string;
  union_id?: string;
  phone?: string;
  name: string;
  avatar?: string;
  user_type: UserType;
  status: UserStatus;
  merchant_id?: number;
  password?: string;
  created_at: string;
  updated_at: string;
}

// 商户相关类型
export type MerchantStatus = 'active' | 'inactive';

export interface Merchant {
  id: number;
  name: string;
  code: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: MerchantStatus;
  settings?: string; // JSON字符串
  created_at: string;
  updated_at: string;
}

// 项目相关类型
export type ProjectStatus = 'active' | 'inactive';

export interface Project {
  id: number;
  code: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

// 场地相关类型
export interface Venue {
  id: number;
  project_id: number;
  code: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

// 楼层相关类型
export interface Floor {
  id: number;
  venue_id: number;
  code: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

// 权限相关类型
export type ResourceType = 'project' | 'venue' | 'floor';

export interface Permission {
  id: number;
  code: string;
  name: string;
  description?: string;
  resource_type: ResourceType;
  resource_id: number;
  actions: string; // JSON字符串
  created_at: string;
}

// 访客申请相关类型
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'completed';

export interface VisitorApplication {
  id: number;
  applicant_id: number;
  merchant_id: number;
  visitee_id?: number;
  visitor_name: string;
  visitor_phone: string;
  visitor_company?: string;
  visit_purpose: string;
  visit_type?: string;
  scheduled_time: string;
  duration: number;
  status: ApplicationStatus;
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  passcode?: string;
  passcode_expiry?: string;
  usage_limit: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// 员工申请相关类型
export type EmployeeApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface EmployeeApplication {
  id: number;
  applicantId: number;
  merchantId: number;
  name: string;
  phone: string;
  department?: string;
  position?: string;
  idCard?: string;
  email?: string;
  startDate?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  emergencyRelationship?: string;
  status: EmployeeApplicationStatus;
  approvedBy?: number;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// 通行码相关类型
export type PasscodeType = 'employee' | 'visitor';
export type PasscodeStatus = 'active' | 'expired' | 'revoked';

export interface Passcode {
  id: number;
  user_id: number;
  code: string;
  type: PasscodeType;
  status: PasscodeStatus;
  expiry_time?: string;
  usage_limit?: number;
  usage_count: number;
  permissions?: string; // JSON字符串
  application_id?: number;
  created_at: string;
  updated_at: string;
}

// 通行记录相关类型
export type AccessDirection = 'in' | 'out';
export type AccessResult = 'success' | 'failed';

export interface AccessRecord {
  id: number;
  user_id: number;
  passcode_id?: number;
  device_id: string;
  device_type?: string;
  direction: AccessDirection;
  result: AccessResult;
  fail_reason?: string;
  project_id?: number;
  venue_id?: number;
  floor_id?: number;
  timestamp: string;
}

// 数据库查询结果类型
export interface DatabaseResult {
  lastID: number;
  changes: number;
}

// JWT载荷类型
export interface JwtPayload {
  userId: number;
  userType: UserType;
  merchantId?: number;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  permissions?: string[];
  roleDescription?: string;
}

// 用户上下文类型（用于请求中的用户信息）
export interface UserContext {
  id: number; // 用户ID（向后兼容）
  userId: number; // JWT载荷中的用户ID
  userType: UserType;
  merchantId?: number;
  permissions?: string[];
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  roleDescription?: string;
}

// 认证请求类型
export interface AuthenticatedRequest extends Request {
  user?: UserContext;
}

// 微信登录相关类型
export interface WechatLoginCode {
  code: string;
}

export interface WechatUserInfo {
  openid: string;
  unionid?: string;
  session_key: string;
}

// 分页查询类型
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 文件上传类型
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

// 商户管理相关类型
export interface CreateMerchantData {
  name: string;
  code: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: MerchantStatus;
}

export interface UpdateMerchantData {
  name?: string;
  code?: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: MerchantStatus;
}

export interface MerchantListQuery extends PaginationQuery {
  status?: string;
  search?: string;
}

export interface MerchantStats {
  employees: {
    total: number;
    active: number;
    inactive: number;
  };
  visitors: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  access: {
    total: number;
    success: number;
    failed: number;
  };
}

// 通用分页结果类型
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 空间管理相关类型
export interface CreateProjectData {
  name: string;
  code: string;
  description?: string;
  status?: ProjectStatus;
}

export interface UpdateProjectData {
  name?: string;
  code?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface CreateVenueData {
  project_id: number;
  name: string;
  code: string;
  description?: string;
  status?: ProjectStatus;
}

export interface UpdateVenueData {
  name?: string;
  code?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface CreateFloorData {
  venue_id: number;
  name: string;
  code: string;
  description?: string;
  status?: ProjectStatus;
}

export interface UpdateFloorData {
  name?: string;
  code?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface SpaceListQuery extends PaginationQuery {
  status?: string;
  search?: string;
}

export interface SpaceHierarchy {
  id: number;
  code: string;
  name: string;
  status: string;
  type: 'project' | 'venue' | 'floor';
  venues?: SpaceHierarchy[];
  floors?: SpaceHierarchy[];
}

// 微信登录数据类型
export interface WechatLoginData {
  openId: string;
  unionId?: string;
  userInfo?: any;
  userType: UserType;
}

// 登录数据类型
export interface LoginData {
  phone?: string;
  password?: string;
  openId?: string;
  userType?: UserType;
}

// 环境变量类型
export interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  DB_PATH: string;
  DB_TEST_PATH: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  WECHAT_APP_ID: string;
  WECHAT_APP_SECRET: string;
  LOG_LEVEL: string;
  LOG_FILE: string;
  CORS_ORIGIN: string;
  PASSCODE_DEFAULT_DURATION: number;
  PASSCODE_DEFAULT_USAGE_LIMIT: number;
  PASSCODE_REFRESH_INTERVAL: number;
}