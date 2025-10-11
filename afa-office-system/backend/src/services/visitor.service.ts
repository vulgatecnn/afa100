import { VisitorApplicationModel } from '../models/visitor-application.model.js';
import { UserModel } from '../models/user.model.js';
import { MerchantModel } from '../models/merchant.model.js';
import type { 
  VisitorApplication, 
  ApplicationStatus, 
  PaginatedResult,
  User 
} from '../types/index.js';

/**
 * 访客管理服务
 * 提供访客申请审批相关的业务逻辑处理
 */
export class VisitorService {
  constructor() {
    // UserModel is a static class, no need to instantiate
  }

  /**
   * 获取商户的访客申请列表
   */
  async getVisitorApplications(merchantId: number, options?: {
    page?: number;
    limit?: number;
    status?: ApplicationStatus;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    visiteeId?: number;
  }): Promise<PaginatedResult<VisitorApplication & { 
    applicant?: User; 
    visitee?: User; 
    approver?: User 
  }>> {
    // 验证商户是否存在
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;

    // 构建查询条件
    const queryOptions: any = {
      page,
      limit,
      merchantId,
      status: options?.status,
      search: options?.search,
      dateFrom: options?.dateFrom,
      dateTo: options?.dateTo,
      visiteeId: options?.visiteeId
    };

    // 获取访客申请列表
    const applications = await VisitorApplicationModel.findAll(queryOptions);

    // 获取关联的用户信息
    const enrichedApplications = await Promise.all(
      applications.map(async (app) => {
        const [applicant, visitee, approver] = await Promise.all([
          UserModel.findById(app.applicant_id),
          app.visitee_id ? UserModel.findById(app.visitee_id) : null,
          app.approved_by ? UserModel.findById(app.approved_by) : null
        ]);

        return {
          ...app,
          applicant: applicant || undefined,
          visitee: visitee || undefined,
          approver: approver || undefined
        };
      })
    );

    // 获取总数
    const total = await VisitorApplicationModel.count(queryOptions);

    return {
      data: enrichedApplications as any,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 获取访客申请详情
   */
  async getVisitorApplicationById(merchantId: number, applicationId: number): Promise<{
    application: VisitorApplication;
    applicant: User;
    merchant: any;
    visitee?: User;
    approver?: User;
  }> {
    // 验证商户是否存在
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }

    // 获取申请详情
    const fullInfo = await VisitorApplicationModel.getFullInfo(applicationId);
    if (!fullInfo) {
      throw new Error('访客申请不存在');
    }

    // 验证申请是否属于该商户
    if (fullInfo.application.merchant_id !== merchantId) {
      throw new Error('访客申请不属于该商户');
    }

    return fullInfo;
  }

  /**
   * 审批访客申请
   */
  async approveVisitorApplication(
    merchantId: number, 
    applicationId: number, 
    approvedBy: number,
    options?: {
      duration?: number; // 通行码有效时长（小时）
      usageLimit?: number; // 使用次数限制
      note?: string; // 审批备注
    }
  ): Promise<VisitorApplication> {
    // 验证商户是否存在
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }

    // 验证审批人是否存在且属于该商户
    const approver = await UserModel.findById(approvedBy);
    if (!approver) {
      throw new Error('审批人不存在');
    }
    if (approver.merchant_id !== merchantId) {
      throw new Error('审批人不属于该商户');
    }

    // 获取申请详情
    const application = await VisitorApplicationModel.findById(applicationId);
    if (!application) {
      throw new Error('访客申请不存在');
    }

    // 验证申请是否属于该商户
    if (application.merchant_id !== merchantId) {
      throw new Error('访客申请不属于该商户');
    }

    // 验证申请状态
    if (application.status !== 'pending') {
      throw new Error('只能审批待审核状态的申请');
    }

    // 检查预约时间是否已过期
    const scheduledTime = new Date(application.scheduled_time);
    const now = new Date();
    if (scheduledTime <= now) {
      throw new Error('预约时间已过期，无法审批');
    }

    // 生成通行码 - 简化实现
    const duration = options?.duration || application.duration || 4; // 默认4小时
    const passcode = this.generateSimplePasscode();

    // 计算通行码过期时间
    const passcodeExpiry = new Date(scheduledTime.getTime() + duration * 60 * 60 * 1000);

    // 更新申请状态
    const approvedApplication = await VisitorApplicationModel.approve(
      applicationId,
      approvedBy,
      passcode,
      passcodeExpiry.toISOString()
    );

    // 发送通知 - 简化实现，实际应该调用通知服务
    console.log('发送访客审批通知:', {
      applicationId,
      visitorName: application.visitor_name,
      merchantName: merchant.name,
      passcode
    });

    return approvedApplication;
  }

  /**
   * 拒绝访客申请
   */
  async rejectVisitorApplication(
    merchantId: number, 
    applicationId: number, 
    approvedBy: number,
    rejectionReason: string
  ): Promise<VisitorApplication> {
    // 验证商户是否存在
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }

    // 验证审批人是否存在且属于该商户
    const approver = await UserModel.findById(approvedBy);
    if (!approver) {
      throw new Error('审批人不存在');
    }
    if (approver.merchant_id !== merchantId) {
      throw new Error('审批人不属于该商户');
    }

    // 获取申请详情
    const application = await VisitorApplicationModel.findById(applicationId);
    if (!application) {
      throw new Error('访客申请不存在');
    }

    // 验证申请是否属于该商户
    if (application.merchant_id !== merchantId) {
      throw new Error('访客申请不属于该商户');
    }

    // 验证申请状态
    if (application.status !== 'pending') {
      throw new Error('只能拒绝待审核状态的申请');
    }

    // 验证拒绝原因
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new Error('拒绝原因不能为空');
    }

    // 更新申请状态
    const rejectedApplication = await VisitorApplicationModel.reject(
      applicationId,
      approvedBy,
      rejectionReason.trim()
    );

    // 发送通知 - 简化实现
    console.log('发送访客拒绝通知:', {
      applicationId,
      visitorName: application.visitor_name,
      rejectionReason
    });

    return rejectedApplication;
  }

  /**
   * 批量审批访客申请
   */
  async batchApproveApplications(
    merchantId: number,
    applicationIds: number[],
    approvedBy: number,
    options?: {
      duration?: number;
      usageLimit?: number;
      note?: string;
    }
  ): Promise<{
    success: VisitorApplication[];
    failed: Array<{ id: number; error: string }>;
  }> {
    const success: VisitorApplication[] = [];
    const failed: Array<{ id: number; error: string }> = [];

    for (const applicationId of applicationIds) {
      try {
        const approvedApplication = await this.approveVisitorApplication(
          merchantId,
          applicationId,
          approvedBy,
          options
        );
        success.push(approvedApplication);
      } catch (error) {
        failed.push({
          id: applicationId,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return { success, failed };
  }

  /**
   * 批量拒绝访客申请
   */
  async batchRejectApplications(
    merchantId: number,
    applicationIds: number[],
    approvedBy: number,
    rejectionReason: string
  ): Promise<{
    success: VisitorApplication[];
    failed: Array<{ id: number; error: string }>;
  }> {
    const success: VisitorApplication[] = [];
    const failed: Array<{ id: number; error: string }> = [];

    for (const applicationId of applicationIds) {
      try {
        const rejectedApplication = await this.rejectVisitorApplication(
          merchantId,
          applicationId,
          approvedBy,
          rejectionReason
        );
        success.push(rejectedApplication);
      } catch (error) {
        failed.push({
          id: applicationId,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return { success, failed };
  }

  /**
   * 获取访客申请统计信息
   */
  async getVisitorStats(merchantId: number, options?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    expired: number;
    completed: number;
    todayTotal: number;
    todayPending: number;
  }> {
    // 验证商户是否存在
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }

    const queryOptions: any = { merchantId };
    if (options?.dateFrom) {
      queryOptions.dateFrom = options.dateFrom;
    }
    if (options?.dateTo) {
      queryOptions.dateTo = options.dateTo;
    }

    // 获取各种状态的申请数量
    const [
      total,
      pending,
      approved,
      rejected,
      expired,
      completed,
      todayTotal,
      todayPending
    ] = await Promise.all([
      VisitorApplicationModel.count({ ...queryOptions }),
      VisitorApplicationModel.count({ ...queryOptions, status: 'pending' }),
      VisitorApplicationModel.count({ ...queryOptions, status: 'approved' }),
      VisitorApplicationModel.count({ ...queryOptions, status: 'rejected' }),
      VisitorApplicationModel.count({ ...queryOptions, status: 'expired' }),
      VisitorApplicationModel.count({ ...queryOptions, status: 'completed' }),
      VisitorApplicationModel.getTodayCount(merchantId),
      VisitorApplicationModel.getPendingCount(merchantId)
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      expired,
      completed,
      todayTotal,
      todayPending
    };
  }

  /**
   * 获取待审批申请数量
   */
  async getPendingApplicationsCount(merchantId: number): Promise<number> {
    // 验证商户是否存在
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }

    return await VisitorApplicationModel.getPendingCount(merchantId);
  }

  /**
   * 获取即将过期的申请
   */
  async getExpiringApplications(merchantId: number, hours: number = 24): Promise<VisitorApplication[]> {
    // 验证商户是否存在
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }

    const expiringApplications = await VisitorApplicationModel.getExpiringApplications(hours);
    
    // 过滤出属于该商户的申请
    return expiringApplications.filter(app => app.merchant_id === merchantId);
  }

  /**
   * 获取访客通行码信息
   */
  async getVisitorPasscode(applicationId: number, applicantId: number): Promise<{
    application: VisitorApplication;
    passcode: string;
    isValid: boolean;
    expiryTime: string;
    usageCount: number;
    usageLimit: number;
  }> {
    // 获取申请详情
    const application = await VisitorApplicationModel.findById(applicationId);
    if (!application) {
      throw new Error('访客申请不存在');
    }

    // 验证申请人
    if (application.applicant_id !== applicantId) {
      throw new Error('只能查看自己的通行码');
    }

    // 验证申请状态
    if (application.status !== 'approved') {
      throw new Error('申请未通过审批，无法获取通行码');
    }

    if (!application.passcode) {
      throw new Error('通行码尚未生成');
    }

    // 检查通行码是否有效
    const isValid = await VisitorApplicationModel.isPasscodeValid(applicationId);

    return {
      application,
      passcode: application.passcode,
      isValid,
      expiryTime: application.passcode_expiry || '',
      usageCount: application.usage_count,
      usageLimit: application.usage_limit
    };
  }

  /**
   * 获取商户列表（供访客选择）
   */
  async getMerchants(): Promise<Array<{ id: number; name: string; code: string; contact: string; phone: string }>> {
    const merchants = await MerchantModel.findAll({ status: 'active' });
    return merchants.map(merchant => ({
      id: merchant.id,
      name: merchant.name,
      code: merchant.code,
      contact: merchant.contact || '',
      phone: merchant.phone || ''
    }));
  }

  /**
   * 提交访客申请
   */
  async submitApplication(data: {
    merchantId: number;
    visiteeId?: number;
    visitorName: string;
    visitorPhone: string;
    visitorCompany?: string;
    visitPurpose: string;
    visitType: string;
    scheduledTime: Date;
    duration: number;
  }): Promise<VisitorApplication> {
    // 验证商户是否存在
    const merchant = await MerchantModel.findById(data.merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }

    // 验证商户状态
    if (merchant.status !== 'active') {
      throw new Error('商户已停用，无法提交申请');
    }

    // 验证预约时间
    const now = new Date();
    if (data.scheduledTime <= now) {
      throw new Error('预约时间不能早于当前时间');
    }

    // 检查是否有重复申请（同一手机号在同一时间段的申请）
    const existingApplication = await VisitorApplicationModel.findDuplicateApplication(
      data.visitorPhone,
      data.merchantId,
      data.scheduledTime
    );

    if (existingApplication) {
      throw new Error('您已在该时间段提交过申请，请勿重复提交');
    }

    // 创建申请记录
    const applicationData = {
      applicant_id: 0, // 临时设为0，实际应该从认证中获取用户ID
      merchant_id: data.merchantId,
      visitee_id: data.visiteeId || undefined,
      visitor_name: data.visitorName,
      visitor_phone: data.visitorPhone,
      visitor_company: data.visitorCompany || undefined,
      visit_purpose: data.visitPurpose,
      visit_type: data.visitType,
      scheduled_time: data.scheduledTime.toISOString(),
      duration: data.duration,
      status: 'pending' as const,
      usage_limit: 1, // 默认使用次数限制
      usage_count: 0
    };

    const application = await VisitorApplicationModel.create(applicationData);

    // 发送通知给商户管理员 - 简化实现
    console.log('发送新访客申请通知:', {
      merchantId: data.merchantId,
      visitorName: data.visitorName,
      applicationId: application.id
    });

    return application;
  }

  /**
   * 获取我的申请列表
   */
  async getMyApplications(userId: number, status?: string): Promise<VisitorApplication[]> {
    const queryOptions: any = { applicant_id: userId };
    if (status) {
      queryOptions.status = status;
    }

    return await VisitorApplicationModel.findAll(queryOptions);
  }

  /**
   * 获取申请详情
   */
  async getApplicationDetail(userId: number, applicationId: number): Promise<VisitorApplication> {
    const application = await VisitorApplicationModel.findById(applicationId);
    if (!application) {
      throw new Error('申请不存在');
    }

    // 验证申请是否属于该用户
    if (application.applicant_id !== userId) {
      throw new Error('只能查看自己的申请');
    }

    return application;
  }

  /**
   * 获取通行码
   */
  async getPasscode(userId: number, applicationId: number): Promise<{
    code: string;
    type: string;
    status: string;
    expiryTime: string;
    usageLimit: number;
    usageCount: number;
  }> {
    const application = await VisitorApplicationModel.findById(applicationId);
    if (!application) {
      throw new Error('申请不存在');
    }

    // 验证申请是否属于该用户
    if (application.applicant_id !== userId) {
      throw new Error('只能查看自己的通行码');
    }

    // 验证申请状态
    if (application.status !== 'approved') {
      throw new Error('申请未通过审批，无法获取通行码');
    }

    if (!application.passcode) {
      throw new Error('通行码尚未生成');
    }

    // 检查通行码是否有效
    const isValid = await VisitorApplicationModel.isPasscodeValid(applicationId);

    return {
      code: application.passcode,
      type: 'visitor',
      status: isValid ? 'active' : 'expired',
      expiryTime: application.passcode_expiry || '',
      usageLimit: application.usage_limit,
      usageCount: application.usage_count
    };
  }

  /**
   * 刷新通行码
   */
  async refreshPasscode(userId: number, applicationId: number): Promise<{
    code: string;
    type: string;
    status: string;
    expiryTime: string;
    usageLimit: number;
    usageCount: number;
  }> {
    const application = await VisitorApplicationModel.findById(applicationId);
    if (!application) {
      throw new Error('申请不存在');
    }

    // 验证申请是否属于该用户
    if (application.applicant_id !== userId) {
      throw new Error('只能刷新自己的通行码');
    }

    // 验证申请状态
    if (application.status !== 'approved') {
      throw new Error('申请未通过审批，无法刷新通行码');
    }

    // 检查是否在有效时间内
    const scheduledTime = new Date(application.scheduled_time);
    const now = new Date();
    const endTime = new Date(scheduledTime.getTime() + application.duration * 60 * 60 * 1000);

    if (now > endTime) {
      throw new Error('访问时间已过期，无法刷新通行码');
    }

    // 生成新的通行码
    const newPasscode = this.generateSimplePasscode();
    const passcodeExpiry = new Date(endTime.getTime());

    // 更新通行码
    await VisitorApplicationModel.updatePasscode(applicationId, newPasscode, passcodeExpiry.toISOString());

    return {
      code: newPasscode,
      type: 'visitor',
      status: 'active',
      expiryTime: passcodeExpiry.toISOString(),
      usageLimit: application.usage_limit,
      usageCount: 0 // 刷新后重置使用次数
    };
  }

  /**
   * 生成简单的通行码
   */
  private generateSimplePasscode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}${random}`.toUpperCase().substring(0, 16);
  }
}