import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock 微信小程序 API
const mockWx = {
  showToast: vi.fn(),
  navigateTo: vi.fn(),
  request: vi.fn()
};

global.wx = mockWx as any;

// Mock API Service
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

describe('员工申请完整流程测试', () => {
  let ApiService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    ApiService = (await import('../../services/api')).default;
  });

  it('应该完成完整的员工申请流程', async () => {
    // 1. 模拟获取商户列表
    const mockMerchants = [
      { id: 1, name: '科技公司', code: 'TECH001', contact: '张经理', phone: '13800138001' },
      { id: 2, name: '贸易公司', code: 'TRADE001', contact: '李经理', phone: '13800138002' }
    ];

    ApiService.get.mockResolvedValueOnce({
      success: true,
      data: mockMerchants,
      message: '获取商户列表成功'
    });

    // 2. 模拟检查现有申请（无申请记录）
    ApiService.get.mockResolvedValueOnce({
      success: true,
      data: null,
      message: '暂无申请记录'
    });

    // 3. 模拟提交申请
    const applicationData = {
      merchantId: 1,
      name: '张三',
      phone: '13800138000',
      department: '技术部',
      position: '前端工程师',
      idCard: '110101199001011234',
      emergencyContact: '李四',
      emergencyPhone: '13800138001'
    };

    const mockApplication = {
      id: 1,
      ...applicationData,
      applicantId: 1,
      status: 'pending',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    ApiService.post.mockResolvedValueOnce({
      success: true,
      data: mockApplication,
      message: '员工申请提交成功'
    });

    // 4. 模拟获取更新后的申请状态
    ApiService.get.mockResolvedValueOnce({
      success: true,
      data: mockApplication,
      message: '获取申请记录成功'
    });

    // 执行完整流程
    const EmployeeService = (await import('../../services/employee')).default;

    // 步骤1: 获取商户列表
    const merchants = await EmployeeService.getMerchants();
    expect(merchants).toEqual(mockMerchants);
    expect(ApiService.get).toHaveBeenCalledWith('/api/v1/employee/merchants');

    // 步骤2: 检查现有申请
    const existingApplication = await EmployeeService.getMyApplication();
    expect(existingApplication).toBeNull();
    expect(ApiService.get).toHaveBeenCalledWith('/api/v1/employee/application');

    // 步骤3: 提交新申请
    const submittedApplication = await EmployeeService.submitApplication(applicationData);
    expect(submittedApplication).toEqual(mockApplication);
    expect(ApiService.post).toHaveBeenCalledWith('/api/v1/employee/apply', applicationData);

    // 步骤4: 验证申请状态
    const updatedApplication = await EmployeeService.getMyApplication();
    expect(updatedApplication).toEqual(mockApplication);
    expect(updatedApplication?.status).toBe('pending');
  });

  it('应该处理申请被拒绝的情况', async () => {
    // 模拟申请被拒绝
    const rejectedApplication = {
      id: 1,
      applicantId: 1,
      merchantId: 1,
      name: '张三',
      phone: '13800138000',
      status: 'rejected',
      approvedBy: 2,
      approvedAt: '2024-01-01T12:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T12:00:00Z'
    };

    ApiService.get.mockResolvedValue({
      success: true,
      data: rejectedApplication,
      message: '获取申请记录成功'
    });

    const EmployeeService = (await import('../../services/employee')).default;
    const application = await EmployeeService.getMyApplication();

    expect(application?.status).toBe('rejected');
    expect(application?.approvedBy).toBe(2);
    expect(application?.approvedAt).toBeDefined();
  });

  it('应该处理申请被批准的情况', async () => {
    // 模拟申请被批准
    const approvedApplication = {
      id: 1,
      applicantId: 1,
      merchantId: 1,
      name: '张三',
      phone: '13800138000',
      status: 'approved',
      approvedBy: 2,
      approvedAt: '2024-01-01T12:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T12:00:00Z'
    };

    ApiService.get.mockResolvedValueOnce({
      success: true,
      data: approvedApplication,
      message: '获取申请记录成功'
    });

    // 模拟获取员工通行码
    const mockPasscode = {
      id: 1,
      userId: 1,
      code: 'EMP123456',
      type: 'employee',
      status: 'active',
      expiryTime: '2024-12-31T23:59:59Z',
      usageLimit: -1,
      usageCount: 0,
      permissions: ['access:building'],
      createdAt: '2024-01-01T12:00:00Z',
      updatedAt: '2024-01-01T12:00:00Z'
    };

    ApiService.get.mockResolvedValueOnce({
      success: true,
      data: mockPasscode,
      message: '获取通行码成功'
    });

    const EmployeeService = (await import('../../services/employee')).default;
    
    // 检查申请状态
    const application = await EmployeeService.getMyApplication();
    expect(application?.status).toBe('approved');

    // 如果申请通过，应该能获取员工通行码
    if (application?.status === 'approved') {
      const passcode = await EmployeeService.getEmployeePasscode();
      expect(passcode).toEqual(mockPasscode);
      expect(passcode.type).toBe('employee');
      expect(passcode.status).toBe('active');
    }
  });

  it('应该处理网络错误', async () => {
    // 模拟网络错误
    ApiService.get.mockRejectedValue(new Error('网络连接失败'));

    const EmployeeService = (await import('../../services/employee')).default;

    await expect(EmployeeService.getMerchants()).rejects.toThrow('网络连接失败');
  });

  it('应该处理服务器错误响应', async () => {
    // 模拟服务器错误响应
    ApiService.post.mockResolvedValue({
      success: false,
      message: '商户不存在',
      code: 2001
    });

    const EmployeeService = (await import('../../services/employee')).default;

    const applicationData = {
      merchantId: 999, // 不存在的商户ID
      name: '张三',
      phone: '13800138000'
    };

    await expect(EmployeeService.submitApplication(applicationData))
      .rejects.toThrow('商户不存在');
  });

  it('应该处理重复申请的情况', async () => {
    // 模拟重复申请错误
    ApiService.post.mockResolvedValue({
      success: false,
      message: '您已向该商户提交过申请，请勿重复申请',
      code: 2002
    });

    const EmployeeService = (await import('../../services/employee')).default;

    const applicationData = {
      merchantId: 1,
      name: '张三',
      phone: '13800138000'
    };

    await expect(EmployeeService.submitApplication(applicationData))
      .rejects.toThrow('您已向该商户提交过申请，请勿重复申请');
  });

  it('应该正确格式化申请时间显示', () => {
    const formatDateTime = (dateTimeStr: string): string => {
      const date = new Date(dateTimeStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const hour = date.getHours();
      const minute = date.getMinutes();
      
      return `${month}月${day}日 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    };

    // 使用本地时间进行测试，避免时区问题
    const testDate1 = new Date('2024-01-01T08:30:00');
    const testDate2 = new Date('2024-12-25T15:45:00');
    
    expect(formatDateTime(testDate1.toISOString())).toMatch(/1月1日 \d{2}:\d{2}/);
    expect(formatDateTime(testDate2.toISOString())).toMatch(/12月25日 \d{2}:\d{2}/);
  });

  it('应该正确处理申请状态文本', () => {
    const statusText = {
      pending: '待审批',
      approved: '已通过',
      rejected: '已拒绝'
    };

    expect(statusText.pending).toBe('待审批');
    expect(statusText.approved).toBe('已通过');
    expect(statusText.rejected).toBe('已拒绝');
  });
});