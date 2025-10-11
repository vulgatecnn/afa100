// API相关类型定义

// 通用API响应格式
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  code?: number;
  timestamp: string;
}

// 用户信息
export interface UserInfo {
  id: number;
  openId: string;
  unionId?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  userType: 'tenant_admin' | 'merchant_admin' | 'employee' | 'visitor';
  status: 'active' | 'inactive' | 'pending';
  merchantId?: number;
  createdAt: string;
  updatedAt: string;
}

// 商户信息
export interface MerchantInfo {
  id: number;
  name: string;
  code: string;
  contact: string;
  phone: string;
  email?: string;
  address?: string;
  status: 'active' | 'inactive';
}

// 访客申请
export interface VisitorApplication {
  id: number;
  applicantId: number;
  merchantId: number;
  visiteeId?: number;
  visitorName: string;
  visitorPhone: string;
  visitorCompany?: string;
  visitPurpose: string;
  visitType: string;
  scheduledTime: string;
  duration: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approvedBy?: number;
  approvedAt?: string;
  passcode?: string;
  passcodeExpiry?: string;
  usageLimit: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// 员工申请
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
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: number;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// 通行码信息
export interface PasscodeInfo {
  id: number;
  userId: number;
  code: string;
  type: 'employee' | 'visitor';
  status: 'active' | 'expired' | 'revoked';
  expiryTime: string;
  usageLimit: number;
  usageCount: number;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

// 通行记录
export interface AccessRecord {
  id: number;
  userId: number;
  passcodeId: number;
  deviceId: string;
  deviceType: string;
  direction: 'in' | 'out';
  result: 'success' | 'failed';
  failReason?: string;
  location: {
    projectId: number;
    venueId: number;
    floorId: number;
  };
  timestamp: string;
}