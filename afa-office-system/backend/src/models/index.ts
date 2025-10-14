// 统一模型导出文件
// 导出所有数据模型类

export { AccessRecordModel } from './access-record.model.js';
export { EmployeeApplicationModel } from './employee-application.model.js';
export { FileModel } from './file.model.js';
export { FloorModel } from './floor.model.js';
export { MerchantModel } from './merchant.model.js';
export { PasscodeModel } from './passcode.model.js';
export { PermissionModel } from './permission.model.js';
export { ProjectModel } from './project.model.js';
export { UserModel } from './user.model.js';
export { VenueModel } from './venue.model.js';
export { VisitorApplicationModel } from './visitor-application.model.js';

// 导出模型相关的类型定义
export type {
  // 基础数据模型类型
  User,
  UserType,
  UserStatus,
  UserRole,
  Merchant,
  MerchantStatus,
  MerchantSettings,
  MerchantSubscription,
  SubscriptionType,
  SubscriptionStatus,
  VisitorApplication,
  ApplicationStatus,
  ApprovalStatus,
  VisitPurpose,
  VisitType,
  VisitorVerification,
  Project,
  ProjectStatus,
  Venue,
  VenueType,
  VenueSettings,
  VenueDevice,
  VenueAccessLevel,
  Floor,
  Permission,
  ResourceType,
  Passcode,
  PasscodeType,
  PasscodeStatus,
  AccessRecord,
  AccessDirection,
  AccessResult,
  AccessMethod,
  DeviceType,
  DeviceInfo,
  AccessContext,
  EmployeeApplication,
  EmployeeApplicationStatus,
  
  // 数据库相关类型
  DatabaseResult,
  DatabaseType,
  
  // API相关类型
  ApiResponse,
  ErrorResponse,
  AuthenticatedRequest,
  UserContext,
  JwtPayload,
  
  // 创建和更新数据类型
  CreateAccessRecordData,
  CreateAccessRecordApiData,
  CreateMerchantData,
  UpdateMerchantData,
  CreateProjectData,
  UpdateProjectData,
  CreateVenueData,
  UpdateVenueData,
  CreateFloorData,
  UpdateFloorData,
  
  // 分页和查询类型
  PaginationQuery,
  PaginatedResponse,
  PaginatedResult,
  
  // 实时状态类型
  RealtimeStatus,
  
  // 微信相关类型
  WechatLoginCode,
  WechatUserInfo,
  WechatLoginData,
  LoginData,
  
  // 文件相关类型
  UploadedFile,
  
  // 环境配置类型
  EnvConfig
} from '../types/index.js';

// 导出模型特定的接口和类型
export type {
  AccessRecordQuery
} from './access-record.model.js';

export type {
  CreatePasscodeData,
  UpdatePasscodeData
} from './passcode.model.js';

export type {
  FileRecord,
  CreateFileData,
  FileQueryOptions,
  FileQueryResult
} from './file.model.js';