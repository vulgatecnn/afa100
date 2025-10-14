// API相关类型定义
// 统一API接口类型导出

import type { Request, Response, NextFunction } from 'express';
import type { 
  UserContext, 
  ApiResponse, 
  ErrorResponse,
  PaginationQuery,
  PaginatedResponse,
  User,
  UserType,
  UserStatus,
  MerchantStatus,
  ApplicationStatus,
  ApprovalStatus,
  VisitPurpose,
  VisitType,
  AccessDirection,
  AccessResult,
  AccessMethod,
  DeviceType
} from './index.js';

// 扩展Express Request类型以包含用户信息和详细信息
export interface AuthenticatedRequest extends Request {
  user?: UserContext;
  userDetails?: User;
}

// 标准控制器方法类型签名
export type ControllerMethod<TReq = AuthenticatedRequest, TRes = Response> = (
  req: TReq,
  res: TRes,
  next: NextFunction
) => Promise<void> | void;

// 异步控制器方法类型
export type AsyncControllerMethod<TReq = AuthenticatedRequest, TRes = Response> = (
  req: TReq,
  res: TRes
) => Promise<void>;

// 同步控制器方法类型
export type SyncControllerMethod<TReq = AuthenticatedRequest, TRes = Response> = (
  req: TReq,
  res: TRes,
  next: NextFunction
) => void;

// API响应辅助类型
export type ApiSuccessResponse<T = any> = ApiResponse<T> & {
  success: true;
  data: T;
};

export type ApiErrorResponse = ErrorResponse & {
  success: false;
};

// 中间件类型定义
export type AuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export type ValidationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export type ErrorMiddleware = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export type RequestMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

// 路由处理器类型
export interface RouteHandler {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: ControllerMethod;
  middleware?: (AuthMiddleware | ValidationMiddleware | RequestMiddleware)[];
}

// API查询参数基础类型
export interface BaseQuery extends PaginationQuery {
  search?: string;
  status?: string;
}

// API创建数据基础类型
export interface BaseCreateData {
  [key: string]: any;
}

// API更新数据基础类型
export interface BaseUpdateData {
  [key: string]: any;
}

// === API 请求参数类型定义 ===

// 认证相关请求参数
export interface LoginRequest {
  phone?: string;
  password?: string;
  openId?: string;
  userType?: UserType;
}

export interface WechatLoginRequest {
  code: string;
  userType: UserType;
  userInfo?: any;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  phone: string;
  code: string;
}

export interface SendVerificationCodeRequest {
  phone: string;
  type?: string;
}

export interface VerifyTokenRequest {
  token: string;
}

// 用户管理请求参数
export interface CreateUserRequest {
  name: string;
  phone?: string;
  user_type: UserType;
  merchant_id?: number;
  role?: string;
  status?: UserStatus;
}

export interface UpdateUserRequest {
  name?: string;
  phone?: string;
  user_type?: UserType;
  role?: string;
  status?: UserStatus;
}

export interface UserListQuery extends BaseQuery {
  user_type?: UserType;
  merchant_id?: number;
  role?: string;
}

// 商户管理请求参数
export interface CreateMerchantRequest {
  name: string;
  code: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: MerchantStatus;
}

export interface UpdateMerchantRequest {
  name?: string;
  code?: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: MerchantStatus;
}

export interface MerchantListQuery extends BaseQuery {
  status?: MerchantStatus;
}

export interface AssignPermissionsRequest {
  permissionIds: number[];
}

// 员工管理请求参数
export interface CreateEmployeeRequest {
  name: string;
  phone?: string;
  department?: string;
  position?: string;
  idCard?: string;
  email?: string;
  startDate?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  emergencyRelationship?: string;
}

export interface UpdateEmployeeRequest {
  name?: string;
  phone?: string;
  department?: string;
  position?: string;
  status?: UserStatus;
}

export interface BatchCreateEmployeesRequest {
  employees: CreateEmployeeRequest[];
}

export interface BatchDeleteEmployeesRequest {
  employeeIds: number[];
}

export interface ToggleEmployeeStatusRequest {
  status: UserStatus;
}

export interface EmployeeListQuery extends BaseQuery {
  status?: UserStatus;
  department?: string;
}

// 访客申请请求参数
export interface CreateVisitorApplicationRequest {
  visitor_name: string;
  visitor_phone: string;
  visitor_company?: string;
  visit_purpose: string;
  visitPurpose?: VisitPurpose;
  visit_type?: VisitType;
  scheduled_time: string;
  duration: number;
  visitee_id?: number;
}

export interface ApproveVisitorApplicationRequest {
  approved_by?: number;
  notes?: string;
}

export interface RejectVisitorApplicationRequest {
  reason: string;
  rejected_by?: number;
}

export interface BatchApproveApplicationsRequest {
  ids: number[];
  notes?: string;
}

export interface VisitorApplicationListQuery extends BaseQuery {
  status?: ApplicationStatus;
  approval_status?: ApprovalStatus;
  visit_purpose?: VisitPurpose;
  merchant_id?: number;
  visitee_id?: number;
  date_from?: string;
  date_to?: string;
}

// 通行记录请求参数
export interface CreateAccessRecordRequest {
  userId: number;
  passcodeId?: number;
  deviceId: string;
  deviceType?: DeviceType;
  direction: AccessDirection;
  result: AccessResult;
  accessMethod?: AccessMethod;
  failReason?: string;
  projectId?: number;
  venueId?: number;
  floorId?: number;
  context?: any;
}

export interface AccessRecordListQuery extends BaseQuery {
  user_id?: number;
  device_id?: string;
  direction?: AccessDirection;
  result?: AccessResult;
  access_method?: AccessMethod;
  date_from?: string;
  date_to?: string;
}

// 空间管理请求参数
export interface CreateProjectRequest {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  code?: string;
  description?: string;
  status?: string;
}

export interface CreateVenueRequest {
  project_id: number;
  name: string;
  code: string;
  description?: string;
  type?: string;
}

export interface UpdateVenueRequest {
  name?: string;
  code?: string;
  description?: string;
  type?: string;
  status?: string;
}

export interface CreateFloorRequest {
  venue_id: number;
  name: string;
  code: string;
  description?: string;
}

export interface UpdateFloorRequest {
  name?: string;
  code?: string;
  description?: string;
  status?: string;
}

// 路径参数类型
export interface IdParams {
  id: string;
}

export interface MerchantIdParams {
  merchantId: string;
}

export interface EmployeeParams {
  merchantId: string;
  employeeId: string;
}

export interface ApplicationParams {
  id: string;
}

export interface ProjectParams {
  id: string;
}

export interface VenueParams {
  projectId: string;
  id: string;
}

export interface FloorParams {
  venueId: string;
  id: string;
}

// === API 响应数据类型定义 ===

// 认证相关响应
export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface WechatLoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  isNewUser?: boolean;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export interface VerifyTokenResponse {
  valid: boolean;
  user?: UserContext;
}

export interface CurrentUserResponse {
  user: User;
}

// 用户管理响应
export interface UserResponse {
  user: User;
}

export interface UserListResponse {
  items: User[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

// 商户管理响应
export interface MerchantResponse {
  merchant: any; // 使用 Merchant 类型
}

export interface MerchantListResponse {
  items: any[]; // 使用 Merchant[] 类型
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface MerchantStatsResponse {
  stats: {
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
  };
}

export interface MerchantPermissionsResponse {
  permissions: any[]; // 使用 Permission[] 类型
}

// 员工管理响应
export interface EmployeeResponse {
  employee?: User;
}

export interface EmployeeListResponse {
  items: User[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface BatchEmployeeResponse {
  success: User[];
  failed: Array<{
    data: CreateEmployeeRequest;
    error: string;
  }>;
}

export interface EmployeeStatsResponse {
  stats: {
    total: number;
    active: number;
    inactive: number;
    pending: number;
  };
}

export interface EmployeePermissionsResponse {
  permissions: string[];
}

// 访客申请响应
export interface VisitorApplicationResponse {
  application?: any; // 使用 VisitorApplication 类型
}

export interface VisitorApplicationListResponse {
  items: any[]; // 使用 VisitorApplication[] 类型
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface BatchApprovalResponse {
  success: any[]; // 使用 VisitorApplication[] 类型
  failed: Array<{
    id: number;
    error: string;
  }>;
}

// 通行记录响应
export interface AccessRecordResponse {
  record: any; // 使用 AccessRecord 类型
}

export interface AccessRecordListResponse {
  items: any[]; // 使用 AccessRecord[] 类型
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

// 空间管理响应
export interface ProjectResponse {
  project: any; // 使用 Project 类型
}

export interface ProjectListResponse {
  items: any[]; // 使用 Project[] 类型
  total: number;
}

export interface VenueResponse {
  venue: any; // 使用 Venue 类型
}

export interface VenueListResponse {
  items: any[]; // 使用 Venue[] 类型
  total: number;
}

export interface FloorResponse {
  floor: any; // 使用 Floor 类型
}

export interface FloorListResponse {
  items: any[]; // 使用 Floor[] 类型
  total: number;
}

export interface SpaceHierarchyResponse {
  hierarchy: any[]; // 使用 SpaceHierarchy[] 类型
}

// 统计和健康检查响应
export interface HealthCheckResponse {
  service: string;
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  wechatConfig?: 'valid' | 'invalid';
  wechatErrors?: string[];
}

export interface SystemStatsResponse {
  users: {
    total: number;
    byType: Record<UserType, number>;
  };
  merchants: {
    total: number;
    active: number;
    inactive: number;
  };
  applications: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  access: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

// 文件上传响应
export interface FileUploadResponse {
  file: {
    filename: string;
    originalname: string;
    size: number;
    mimetype: string;
    path: string;
    url: string;
  };
}

export interface BatchFileUploadResponse {
  files: Array<{
    filename: string;
    originalname: string;
    size: number;
    mimetype: string;
    path: string;
    url: string;
  }>;
}

// 错误响应详细类型
export interface ValidationErrorResponse extends ApiErrorResponse {
  details: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

export interface BusinessErrorResponse extends ApiErrorResponse {
  code: number;
  path?: string;
  method?: string;
}

// 分页响应泛型类型
export interface PaginatedApiResponse<T> extends ApiResponse<{
  items: T[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}> {}

// 成功响应泛型类型
export interface SuccessApiResponse<T> extends ApiResponse<T> {
  success: true;
  data: T;
  message: string;
  timestamp: string;
}

// 带警告的响应类型
export interface WarningApiResponse<T> extends SuccessApiResponse<T> {
  warnings?: string[];
}

// 缓存响应类型
export interface CachedApiResponse<T> extends SuccessApiResponse<T> {
  cached: boolean;
}

// 重新导出常用类型
export type {
  ApiResponse,
  ErrorResponse,
  PaginationQuery,
  PaginatedResponse,
  UserContext,
  User,
  UserType,
  UserStatus,
  MerchantStatus,
  ApplicationStatus,
  ApprovalStatus,
  VisitPurpose,
  VisitType,
  AccessDirection,
  AccessResult,
  AccessMethod,
  DeviceType
} from './index.js';