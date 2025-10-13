/**
 * AFA办公系统测试数据
 * 包含各种角色的测试账号和测试数据
 */

export const testUsers = {
  // 租务管理员
  tenantAdmin: {
    username: 'tenant_admin',
    password: 'Test123456',
    email: 'tenant@afa-office.com',
    name: '租务管理员',
    role: 'tenant_admin'
  },
  
  // 商户管理员
  merchantAdmin: {
    username: 'merchant_admin',
    password: 'Test123456',
    email: 'merchant@afa-office.com',
    name: '商户管理员',
    role: 'merchant_admin',
    merchantId: 1,
    merchantName: '测试科技公司'
  },
  
  // 商户员工
  merchantEmployee: {
    username: 'employee_001',
    password: 'Test123456',
    email: 'employee@afa-office.com',
    name: '张三',
    role: 'merchant_employee',
    merchantId: 1,
    department: '技术部',
    position: '前端工程师'
  },
  
  // 访客
  visitor: {
    name: '李四',
    phone: '13800138001',
    company: '合作伙伴公司',
    idCard: '110101199001011234'
  }
};

export const testMerchants = {
  merchant1: {
    id: 1,
    name: '测试科技公司',
    contactPerson: '王经理',
    contactPhone: '13800138002',
    email: 'contact@test-tech.com',
    address: '北京市朝阳区测试大厦10层',
    status: 'active'
  },
  
  merchant2: {
    id: 2,
    name: '创新设计工作室',
    contactPerson: '刘总监',
    contactPhone: '13800138003',
    email: 'contact@design-studio.com',
    address: '北京市朝阳区测试大厦12层',
    status: 'active'
  }
};

export const testDevices = {
  device1: {
    id: 1,
    name: '大厅闸机A',
    deviceType: 'turnstile',
    location: '大厅入口左侧',
    ipAddress: '192.168.1.100',
    status: 'online',
    vendorId: 1
  },
  
  device2: {
    id: 2,
    name: '电梯口门禁',
    deviceType: 'door_access',
    location: '10层电梯口',
    ipAddress: '192.168.1.101',
    status: 'online',
    vendorId: 1
  }
};

export const testVendors = {
  vendor1: {
    id: 1,
    name: '海康威视',
    contactPerson: '技术支持',
    contactPhone: '400-123-4567',
    apiEndpoint: 'https://api.hikvision.com',
    apiKey: 'test_api_key_123',
    status: 'active'
  }
};

export const testVisitorApplications = {
  pendingApplication: {
    visitorName: '王五',
    visitorPhone: '13800138004',
    visitorCompany: '客户公司A',
    visitPurpose: '商务洽谈',
    visitType: 'business',
    scheduledTime: '2024-12-01T10:00:00Z',
    duration: 120, // 分钟
    applicantId: 1,
    merchantId: 1,
    status: 'pending'
  },
  
  approvedApplication: {
    visitorName: '赵六',
    visitorPhone: '13800138005',
    visitorCompany: '客户公司B',
    visitPurpose: '技术交流',
    visitType: 'technical',
    scheduledTime: '2024-12-01T14:00:00Z',
    duration: 180,
    applicantId: 1,
    merchantId: 1,
    status: 'approved',
    passcode: 'PASS123456'
  }
};

export const testPermissions = {
  tenantAdminPermissions: [
    'merchant_management',
    'device_management',
    'vendor_management',
    'system_settings',
    'user_management',
    'access_records',
    'blacklist_management'
  ],
  
  merchantAdminPermissions: [
    'employee_management',
    'visitor_management',
    'access_records_view',
    'merchant_settings'
  ],
  
  merchantEmployeePermissions: [
    'visitor_invite',
    'visitor_approve',
    'profile_management'
  ]
};

export const apiEndpoints = {
  auth: {
    login: '/api/v1/auth/login',
    logout: '/api/v1/auth/logout',
    refresh: '/api/v1/auth/refresh',
    me: '/api/v1/auth/me'
  },
  
  tenant: {
    merchants: '/api/v1/tenant/merchants',
    devices: '/api/v1/tenant/devices',
    vendors: '/api/v1/tenant/vendors',
    blacklist: '/api/v1/tenant/blacklist',
    accessRecords: '/api/v1/tenant/access-records'
  },
  
  merchant: {
    employees: '/api/v1/merchant/employees',
    visitors: '/api/v1/merchant/visitors',
    accessRecords: '/api/v1/merchant/access-records'
  },
  
  device: {
    faceData: '/api/v1/device/face-data',
    userValidation: '/api/v1/device/user-validation',
    accessLog: '/api/v1/device/access-log'
  }
};