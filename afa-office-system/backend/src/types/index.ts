// 基础类型定义
import { Request } from 'express';

// 导入 Express 类型扩展
import './express.js';

// 导入数据库类型扩展
import './database.js';

// 导入认证类型扩展
import './auth.js';

// 导入工具类型扩展
import './utils.js';

// 导入环境变量类型扩展
import './env.js';

// 导入工具函数类型扩展
import './utility-functions.js';

// 导入数据库配置类型扩展
import './database-config.js';

// 导入迁移脚本类型扩展
import './migration.js';

// 导入构建配置类型扩展
import './build-config.js';

// 导入通行记录类型
export * from './access-record.js';

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
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';
export type UserRole = 'admin' | 'manager' | 'employee' | 'visitor' | 'guest';

export interface User {
  id: number;
  open_id?: string | null | undefined;
  union_id?: string | null | undefined;
  phone?: string | null | undefined;
  name: string;
  avatar?: string | null | undefined;
  user_type: UserType;
  role?: UserRole | null | undefined;
  status: UserStatus;
  permissions?: string[] | null | undefined; // 用户权限列表
  merchant_id?: number | null | undefined;
  created_at: string;
  updated_at: string;
  // 添加camelCase版本以支持API层
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  // 关联字段类型
  merchant?: Merchant | null | undefined; // 关联的商户信息
  employee_applications?: EmployeeApplication[] | null | undefined; // 员工申请记录
  visitor_applications?: VisitorApplication[] | null | undefined; // 访客申请记录
  passcodes?: Passcode[] | null | undefined; // 通行码记录
  access_records?: AccessRecord[] | null | undefined; // 通行记录
}

// 商户相关类型
export type MerchantStatus = 'active' | 'inactive';
export type SubscriptionType = 'basic' | 'premium' | 'enterprise';
export type SubscriptionStatus = 'active' | 'expired' | 'suspended' | 'trial';

export interface MerchantSettings {
  maxEmployees?: number;
  maxVisitors?: number;
  allowedAccessHours?: {
    start: string;
    end: string;
  };
  notifications?: {
    email: boolean;
    sms: boolean;
    wechat: boolean;
  };
  security?: {
    requireApproval: boolean;
    autoExpireHours: number;
  };
  customFields?: Record<string, any>;
}

export interface MerchantSubscription {
  type: SubscriptionType;
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string;
  features: string[];
  limits: {
    maxEmployees: number;
    maxVisitors: number;
    maxDevices: number;
  };
}

export interface Merchant {
  id: number;
  name: string;
  code: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: MerchantStatus;
  settings?: string | MerchantSettings; // JSON字符串或解析后的对象
  subscription?: MerchantSubscription; // 订阅信息
  created_at: string;
  updated_at: string;
  // 添加camelCase版本以支持API层
  createdAt?: string;
  updatedAt?: string;
  // 关联字段类型
  employees?: User[]; // 关联的员工列表
  visitor_applications?: VisitorApplication[]; // 访客申请记录
  employee_applications?: EmployeeApplication[]; // 员工申请记录
  statistics?: {
    employeeCount: number;
    pendingApplications: number;
    totalApplications: number;
    activePasscodes: number;
  };
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
export type VenueType = 'office' | 'meeting_room' | 'common_area' | 'parking' | 'storage' | 'other';
export type VenueAccessLevel = 'public' | 'restricted' | 'private' | 'emergency_only';

export interface VenueSettings {
  capacity?: number;
  area?: number; // 面积（平方米）
  accessLevel: VenueAccessLevel;
  allowedHours?: {
    start: string;
    end: string;
  };
  requiresApproval?: boolean;
  allowVisitors?: boolean;
  securityLevel?: 'low' | 'medium' | 'high';
  equipment?: string[]; // 设备列表
  amenities?: string[]; // 设施列表
  // 场地管理相关字段
  manager?: {
    userId: number;
    name: string;
    phone?: string;
    email?: string;
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relationship?: string;
  };
  accessRules?: {
    maxOccupancy?: number;
    minAge?: number;
    maxAge?: number;
    requiredPermissions?: string[];
    restrictedTimes?: Array<{
      start: string;
      end: string;
      reason?: string;
    }>;
  };
  // 设备集成相关字段
  deviceIntegration?: {
    autoUnlock?: boolean;
    faceRecognitionEnabled?: boolean;
    temperatureCheckRequired?: boolean;
    maskDetectionEnabled?: boolean;
    accessLogging?: boolean;
  };
  // 通知设置
  notifications?: {
    onEntry?: boolean;
    onExit?: boolean;
    onUnauthorizedAccess?: boolean;
    recipients?: string[]; // 邮箱或手机号列表
  };
}

export interface VenueDevice {
  id: string;
  name: string;
  type: DeviceType;
  status: 'online' | 'offline' | 'maintenance';
  location?: string;
  lastSeen?: string;
  lastHeartbeat?: string;
  firmware?: string;
  configuration?: Record<string, any>;
  capabilities?: string[]; // 设备能力列表
  ipAddress?: string; // 设备IP地址
  macAddress?: string; // MAC地址
  serialNumber?: string; // 序列号
}

export interface Venue {
  id: number;
  project_id: number;
  code: string;
  name: string;
  description?: string;
  type?: VenueType;
  status: ProjectStatus;
  settings?: string | VenueSettings; // JSON字符串或解析后的对象
  devices?: VenueDevice[]; // 关联的设备列表
  created_at: string;
  updated_at: string;
  // 添加camelCase版本以支持API层
  createdAt?: string;
  updatedAt?: string;
  projectId?: number;
  // 场地管理相关字段
  managerId?: number; // 场地管理员ID
  capacity?: number; // 容量
  area?: number; // 面积
  coordinates?: {
    latitude?: number;
    longitude?: number;
  }; // 地理坐标
  // 设备集成相关字段
  deviceConfiguration?: {
    autoLockEnabled?: boolean;
    accessControlType?: 'card' | 'biometric' | 'mobile' | 'hybrid';
    emergencyOverride?: boolean;
    maintenanceMode?: boolean;
    integrationStatus?: 'active' | 'inactive' | 'error';
  };
  // 关联字段类型
  project?: Project; // 关联的项目信息
  floors?: Floor[]; // 楼层列表
  permissions?: Permission[]; // 权限列表
  access_records?: AccessRecord[]; // 通行记录
  manager?: User; // 场地管理员信息
  statistics?: {
    floorCount: number;
    permissionCount: number;
    deviceCount: number;
    todayAccessCount: number;
    // 扩展的统计字段
    totalAccessCount?: number;
    successRate?: number;
    averageOccupancy?: number;
    peakOccupancyTime?: string;
    maintenanceAlerts?: number;
    securityIncidents?: number;
    deviceUptime?: number; // 设备在线率
    energyConsumption?: number; // 能耗统计
  };
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

// 数据库类型枚举
export enum DatabaseType {
  MYSQL = 'mysql'
}

// 权限相关类型
export type ResourceType = 'project' | 'venue' | 'floor' | 'merchant';

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
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved';
export type VisitPurpose = 'business' | 'interview' | 'meeting' | 'delivery' | 'maintenance' | 'other';
export type VisitType = 'single' | 'recurring' | 'group' | 'business';

export interface VisitorVerification {
  idCard?: string;
  idCardPhoto?: string;
  facePhoto?: string;
  temperature?: number;
  healthCode?: string;
  verificationStatus: 'pending' | 'verified' | 'failed';
  verifiedAt?: string;
  verifiedBy?: number;
}

export interface VisitorApplication {
  id: number;
  applicant_id: number;
  merchant_id: number;
  visitee_id?: number | null | undefined;
  visitor_name: string;
  visitor_phone: string;
  visitor_company?: string | null | undefined;
  visit_purpose: string;
  visitPurpose?: VisitPurpose | null | undefined; // 标准化的访问目的
  visit_type?: VisitType | null | undefined;
  scheduled_time: string;
  duration: number;
  status: ApplicationStatus;
  approvalStatus?: ApprovalStatus | null | undefined; // 审批状态（更细粒度）
  approved_by?: number | null | undefined;
  approved_at?: string | null | undefined;
  rejection_reason?: string | null | undefined;
  passcode?: string | null | undefined;
  passcode_expiry?: string | null | undefined;
  usage_limit: number;
  usage_count: number;
  verification?: VisitorVerification | string | null | undefined; // 访客验证信息，支持JSON字符串
  created_at: string;
  updated_at: string;
  // 添加camelCase版本以支持API层
  createdAt?: string | undefined;
  updatedAt?: string;
  scheduledTime?: string;
  // 关联字段类型
  applicant?: User | null; // 申请人信息
  merchant?: Merchant | null; // 商户信息
  visitee?: User | null; // 被访人信息
  approver?: User | null; // 审批人信息
  access_records?: AccessRecord[] | null; // 通行记录
  // 流程相关字段
  workflow?: {
    currentStep: string;
    steps: Array<{
      name: string;
      status: 'pending' | 'completed' | 'skipped';
      completedAt?: string | null;
      completedBy?: number | null;
    }>;
  } | string | null; // 支持JSON字符串
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
  expiry_time?: string | null | undefined;
  usage_limit?: number | null | undefined;
  usage_count: number;
  permissions?: string | null | undefined; // JSON字符串
  application_id?: number | null | undefined;
  created_at: string;
  updated_at: string;
}

// 通行记录相关类型
export type AccessDirection = 'in' | 'out';
export type AccessResult = 'success' | 'failed';
export type AccessMethod = 'qr_code' | 'face_recognition' | 'card' | 'fingerprint' | 'manual';
export type DeviceType = 'turnstile' | 'door_lock' | 'gate' | 'elevator' | 'barrier' | 'qr_scanner' | 'access_control' | 'camera' | 'sensor' | 'display';

export interface DeviceInfo {
  id: string;
  name?: string;
  type: DeviceType;
  location?: string;
  firmware?: string;
  status: 'online' | 'offline' | 'maintenance';
  lastHeartbeat?: string;
  configuration?: Record<string, any>;
  capabilities?: string[]; // 设备能力列表
  ipAddress?: string; // 设备IP地址
  macAddress?: string; // MAC地址
  serialNumber?: string; // 序列号
  model?: string; // 设备型号
  manufacturer?: string; // 制造商
  installDate?: string; // 安装日期
  maintenanceDate?: string; // 最后维护日期
}

export interface AccessContext {
  temperature?: number; // 体温检测
  maskDetection?: boolean; // 口罩检测
  healthCode?: string; // 健康码
  accompaniedBy?: number[]; // 陪同人员ID列表
  visitPurpose?: string; // 访问目的
  expectedDuration?: number; // 预期停留时间（分钟）
  notes?: string; // 备注信息
  // 扩展的通行上下文字段
  weatherCondition?: string; // 天气状况
  crowdLevel?: 'low' | 'medium' | 'high'; // 人流密度
  securityAlert?: boolean; // 安全警报状态
  emergencyMode?: boolean; // 紧急模式
  biometricData?: {
    faceConfidence?: number; // 人脸识别置信度
    fingerprintQuality?: number; // 指纹质量
    voicePrint?: string; // 声纹数据
  };
  deviceMetrics?: {
    signalStrength?: number; // 信号强度
    batteryLevel?: number; // 设备电量
    networkLatency?: number; // 网络延迟
  };
  locationData?: {
    gpsCoordinates?: {
      latitude: number;
      longitude: number;
    };
    floor?: string;
    zone?: string;
    building?: string;
  };
}

export interface AccessRecord {
  id: number;
  user_id: number;
  passcode_id?: number | null | undefined;
  device_id: string;
  device_type?: DeviceType | string | null | undefined;
  device_info?: DeviceInfo | null | undefined; // 设备详细信息
  direction: AccessDirection;
  result: AccessResult;
  access_method?: AccessMethod | null | undefined; // 通行方式
  fail_reason?: string | null | undefined;
  project_id?: number | null | undefined;
  venue_id?: number | null | undefined;
  floor_id?: number | null | undefined;
  context?: AccessContext | null | undefined; // 通行上下文信息
  timestamp: string;
  // 添加camelCase版本以支持API层
  userId?: number | undefined;
  passcodeId?: number | null | undefined;
  deviceId?: string | undefined;
  deviceType?: DeviceType | string | null | undefined;
  projectId?: number | null | undefined;
  venueId?: number | null | undefined;
  floorId?: number | null | undefined;
  accessMethod?: AccessMethod | null | undefined;
  failReason?: string | null | undefined;
  // 关联字段类型
  user?: User | null; // 用户信息
  passcode?: Passcode | null; // 通行码信息
  project?: Project; // 项目信息
  venue?: Venue; // 场地信息
  floor?: Floor; // 楼层信息
  // 验证和审计字段 (支持JSON字符串和对象)
  verification?: string | {
    isVerified: boolean;
    verifiedBy?: number;
    verifiedAt?: string;
    verificationMethod?: string;
    // 扩展验证字段
    confidence?: number; // 验证置信度
    biometricMatch?: boolean; // 生物识别匹配
    documentVerified?: boolean; // 证件验证
    manualOverride?: boolean; // 人工干预
    riskScore?: number; // 风险评分
    auditTrail?: Array<{
      action: string;
      timestamp: string;
      userId?: number;
      details?: Record<string, any>;
    }>;
  };
  // 通行记录扩展字段
  duration?: number; // 通行耗时（毫秒）
  retryCount?: number; // 重试次数
  queuePosition?: number; // 队列位置
  companionRecords?: number[]; // 同行人员记录ID
  emergencyAccess?: boolean; // 紧急通行
  supervisorApproval?: {
    required: boolean;
    approved?: boolean;
    approvedBy?: number;
    approvedAt?: string;
    reason?: string;
  };
}

export interface CreateAccessRecordData {
  user_id: number;
  passcode_id?: number | null | undefined;
  device_id: string;
  device_type?: DeviceType | string | null | undefined;
  device_info?: DeviceInfo | null | undefined;
  direction: AccessDirection;
  result: AccessResult;
  access_method?: AccessMethod | null | undefined;
  fail_reason?: string | null | undefined;
  project_id?: number | null | undefined;
  venue_id?: number | null | undefined;
  floor_id?: number | null | undefined;
  context?: AccessContext | null | undefined;
  timestamp: string;
  verification?: {
    isVerified: boolean;
    verifiedBy?: number | null | undefined;
    verifiedAt?: string | null | undefined;
    verificationMethod?: string | null | undefined;
    confidence?: number | null | undefined;
    biometricMatch?: boolean | null;
    documentVerified?: boolean | null;
    manualOverride?: boolean | null;
    riskScore?: number | null;
  } | null;
  // 扩展字段
  duration?: number | null;
  retryCount?: number | null;
  queuePosition?: number | null;
  companionRecords?: number[] | null;
  emergencyAccess?: boolean | null;
  supervisorApproval?: {
    required: boolean;
    approved?: boolean | null;
    approvedBy?: number | null;
    approvedAt?: string | null;
    reason?: string | null;
  } | null;
}

// API版本的通行记录创建数据（使用camelCase）
export interface CreateAccessRecordApiData {
  userId: number;
  passcodeId?: number | null | undefined;
  deviceId: string;
  deviceType?: DeviceType | string | null | undefined;
  deviceInfo?: DeviceInfo | null | undefined;
  direction: AccessDirection;
  result: AccessResult;
  accessMethod?: AccessMethod | null | undefined;
  failReason?: string | null | undefined;
  projectId?: number | null | undefined;
  venueId?: number | null | undefined;
  floorId?: number | null | undefined;
  context?: AccessContext | null | undefined;
  timestamp: string;
  verification?: {
    isVerified: boolean;
    verifiedBy?: number | null | undefined;
    verifiedAt?: string | null | undefined;
    verificationMethod?: string | null;
  } | null;
}

// 设备管理相关类型
export interface DeviceManagement {
  id: string;
  venueId: number;
  name: string;
  type: DeviceType;
  status: 'online' | 'offline' | 'maintenance' | 'error';
  configuration: DeviceConfiguration;
  metrics: DeviceMetrics;
  maintenance: DeviceMaintenanceInfo;
  integration: DeviceIntegrationInfo;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceConfiguration {
  ipAddress?: string;
  port?: number;
  protocol?: 'tcp' | 'udp' | 'http' | 'https' | 'mqtt';
  authentication?: {
    type: 'none' | 'basic' | 'token' | 'certificate';
    credentials?: Record<string, any>;
  };
  settings?: Record<string, any>;
  capabilities?: string[];
}

export interface DeviceMetrics {
  uptime?: number; // 运行时间（秒）
  responseTime?: number; // 响应时间（毫秒）
  errorRate?: number; // 错误率（百分比）
  throughput?: number; // 吞吐量（次/小时）
  lastHeartbeat?: string;
  batteryLevel?: number; // 电池电量（百分比）
  signalStrength?: number; // 信号强度
  temperature?: number; // 设备温度
}

export interface DeviceMaintenanceInfo {
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  maintenanceInterval?: number; // 维护间隔（天）
  warrantyExpiry?: string;
  maintenanceNotes?: string[];
  alerts?: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
    resolved?: boolean;
  }>;
}

export interface DeviceIntegrationInfo {
  apiEndpoint?: string;
  webhookUrl?: string;
  dataFormat?: 'json' | 'xml' | 'binary';
  syncInterval?: number; // 同步间隔（秒）
  lastSyncTime?: string;
  integrationStatus: 'connected' | 'disconnected' | 'error' | 'syncing';
  errorLog?: Array<{
    timestamp: string;
    error: string;
    resolved?: boolean;
  }>;
}

// 实时状态类型
export interface RealtimeStatus {
  status: 'active' | 'offline' | 'unknown';
  lastSeen?: string;
  deviceCount?: number;
  activeUsers?: number;
  // 扩展字段用于设备状态
  deviceId?: string;
  isOnline?: boolean;
  lastActivity?: string | null;
  todayCount?: number;
  currentHourCount?: number;
  // 设备集成状态
  integrationHealth?: {
    apiConnectivity: boolean;
    dataSync: boolean;
    alertSystem: boolean;
    lastHealthCheck: string;
  };
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
  type?: VenueType;
  status?: ProjectStatus;
  settings?: VenueSettings;
  managerId?: number;
  capacity?: number;
  area?: number;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  deviceConfiguration?: {
    autoLockEnabled?: boolean;
    accessControlType?: 'card' | 'biometric' | 'mobile' | 'hybrid';
    emergencyOverride?: boolean;
    maintenanceMode?: boolean;
  };
}

export interface UpdateVenueData {
  name?: string;
  code?: string;
  description?: string;
  type?: VenueType;
  status?: ProjectStatus;
  settings?: VenueSettings;
  managerId?: number;
  capacity?: number;
  area?: number;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  deviceConfiguration?: {
    autoLockEnabled?: boolean;
    accessControlType?: 'card' | 'biometric' | 'mobile' | 'hybrid';
    emergencyOverride?: boolean;
    maintenanceMode?: boolean;
    integrationStatus?: 'active' | 'inactive' | 'error';
  };
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

// 类型转换工具函数
export function convertApiToDbAccessRecord(apiData: CreateAccessRecordApiData): CreateAccessRecordData {
  const result = {
    user_id: apiData.userId,
    passcode_id: apiData.passcodeId,
    device_id: apiData.deviceId,
    device_type: apiData.deviceType,
    device_info: apiData.deviceInfo,
    direction: apiData.direction,
    result: apiData.result,
    access_method: apiData.accessMethod,
    fail_reason: apiData.failReason,
    project_id: apiData.projectId,
    venue_id: apiData.venueId,
    floor_id: apiData.floorId,
    context: apiData.context,
    timestamp: apiData.timestamp,
    verification: apiData.verification
  };
  
  return result as CreateAccessRecordData;
}

export function convertDbToApiAccessRecord(dbData: CreateAccessRecordData): CreateAccessRecordApiData {
  const result = {
    userId: dbData.user_id,
    passcodeId: dbData.passcode_id,
    deviceId: dbData.device_id,
    deviceType: dbData.device_type,
    deviceInfo: dbData.device_info,
    direction: dbData.direction,
    result: dbData.result,
    accessMethod: dbData.access_method,
    failReason: dbData.fail_reason,
    projectId: dbData.project_id,
    venueId: dbData.venue_id,
    floorId: dbData.floor_id,
    context: dbData.context,
    timestamp: dbData.timestamp,
    verification: dbData.verification ? {
      isVerified: dbData.verification.isVerified,
      verifiedBy: dbData.verification.verifiedBy,
      verifiedAt: dbData.verification.verifiedAt,
      verificationMethod: dbData.verification.verificationMethod
    } : null
  };
  
  return result as CreateAccessRecordApiData;
}

// Export API types from api.ts
export type {
  ControllerMethod,
  AsyncControllerMethod,
  SyncControllerMethod,
  ApiSuccessResponse,
  ApiErrorResponse,
  AuthMiddleware,
  ValidationMiddleware,
  ErrorMiddleware,
  RequestMiddleware,
  RouteHandler,
  BaseQuery,
  BaseCreateData,
  BaseUpdateData,
  LoginRequest,
  WechatLoginRequest,
  RefreshTokenRequest,
  ChangePasswordRequest,
  ResetPasswordRequest,
  SendVerificationCodeRequest,
  VerifyTokenRequest,
  CreateUserRequest,
  UpdateUserRequest,
  UserListQuery,
  CreateMerchantRequest,
  UpdateMerchantRequest,
  AssignPermissionsRequest,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  BatchCreateEmployeesRequest,
  BatchDeleteEmployeesRequest,
  ToggleEmployeeStatusRequest,
  EmployeeListQuery,
  CreateVisitorApplicationRequest,
  ApproveVisitorApplicationRequest,
  RejectVisitorApplicationRequest,
  BatchApproveApplicationsRequest,
  VisitorApplicationListQuery,
  CreateAccessRecordRequest,
  AccessRecordListQuery,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateVenueRequest,
  UpdateVenueRequest,
  CreateFloorRequest,
  UpdateFloorRequest,
  IdParams,
  MerchantIdParams,
  EmployeeParams,
  ApplicationParams,
  ProjectParams,
  VenueParams,
  FloorParams,
  LoginResponse,
  WechatLoginResponse,
  RefreshTokenResponse,
  VerifyTokenResponse,
  CurrentUserResponse,
  UserResponse,
  UserListResponse,
  MerchantResponse,
  MerchantListResponse,
  MerchantStatsResponse,
  MerchantPermissionsResponse,
  EmployeeResponse,
  EmployeeListResponse,
  BatchEmployeeResponse,
  EmployeeStatsResponse,
  EmployeePermissionsResponse,
  VisitorApplicationResponse,
  VisitorApplicationListResponse,
  BatchApprovalResponse,
  AccessRecordResponse,
  AccessRecordListResponse,
  ProjectResponse,
  ProjectListResponse,
  VenueResponse,
  VenueListResponse,
  FloorResponse,
  FloorListResponse,
  SpaceHierarchyResponse,
  HealthCheckResponse,
  SystemStatsResponse,
  FileUploadResponse,
  BatchFileUploadResponse,
  ValidationErrorResponse,
  BusinessErrorResponse,
  PaginatedApiResponse,
  SuccessApiResponse,
  WarningApiResponse,
  CachedApiResponse
} from './api.js';

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