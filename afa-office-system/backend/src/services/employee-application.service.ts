import { EmployeeApplicationModel, UserModel, MerchantModel } from '../models/index.js';
import { EmployeeService } from './employee.service.js';
import type { EmployeeApplication } from '../types/index.js';

/**
 * 员工申请服务
 * 处理员工申请相关的业务逻辑
 */
export class EmployeeApplicationService {
  private employeeApplicationModel: EmployeeApplicationModel;
  private employeeService: EmployeeService;

  constructor() {
    this.employeeApplicationModel = new EmployeeApplicationModel();
    this.employeeService = new EmployeeService();
  }

  /**
   * 提交员工申请
   */
  async submitApplication(
    applicantId: number,
    applicationData: {
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
    }
  ): Promise<EmployeeApplication> {
    // 验证申请人是否存在
    const applicant = await UserModel.findById(applicantId);
    if (!applicant) {
      throw new Error('申请人不存在');
    }

    // 验证商户是否存在且状态正常
    const merchant = await MerchantModel.findById(applicationData.merchantId);
    if (!merchant) {
      throw new Error('目标商户不存在');
    }
    if (merchant.status !== 'active') {
      throw new Error('目标商户状态异常，无法申请');
    }

    // 检查是否已存在申请
    const existingApplication = await this.employeeApplicationModel.existsByApplicantAndMerchant(
      applicantId,
      applicationData.merchantId
    );
    if (existingApplication) {
      throw new Error('您已向该商户提交过申请，请勿重复申请');
    }

    // 验证必填字段
    if (!applicationData.name.trim()) {
      throw new Error('姓名不能为空');
    }
    if (!applicationData.phone.trim()) {
      throw new Error('手机号不能为空');
    }
    if (!applicationData.department?.trim()) {
      throw new Error('部门不能为空');
    }
    if (!applicationData.position?.trim()) {
      throw new Error('职位不能为空');
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex['test'](applicationData.phone)) {
      throw new Error('手机号格式不正确');
    }

    // 验证邮箱格式（如果提供）
    if (applicationData.email && applicationData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex['test'](applicationData.email)) {
        throw new Error('邮箱格式不正确');
      }
    }

    // 验证身份证号格式（如果提供）
    if (applicationData.idCard && applicationData.idCard.trim()) {
      const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
      if (!idCardRegex['test'](applicationData.idCard)) {
        throw new Error('身份证号格式不正确');
      }
    }

    // 验证入职日期（如果提供）
    if (applicationData.startDate && applicationData.startDate.trim()) {
      const startDate = new Date(applicationData.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (isNaN(startDate.getTime())) {
        throw new Error('入职日期格式不正确');
      }
      if (startDate < today) {
        throw new Error('入职日期不能早于今天');
      }
    }

    // 验证紧急联系人信息（如果提供了其中一个，另一个也必须提供）
    const hasEmergencyContact = applicationData.emergencyContact && applicationData.emergencyContact.trim();
    const hasEmergencyPhone = applicationData.emergencyPhone && applicationData.emergencyPhone.trim();
    
    if (hasEmergencyContact && !hasEmergencyPhone) {
      throw new Error('请提供紧急联系人电话');
    }
    if (hasEmergencyPhone && !hasEmergencyContact) {
      throw new Error('请提供紧急联系人姓名');
    }
    
    // 验证紧急联系人电话格式（如果提供）
    if (hasEmergencyPhone && !phoneRegex['test'](applicationData.emergencyPhone!)) {
      throw new Error('紧急联系人电话格式不正确');
    }

    // 创建申请
    const application = await this.employeeApplicationModel.create({
      applicantId,
      ...applicationData
    });

    // TODO: 发送通知给商户管理员
    // await this.notificationService.notifyMerchantAdmins(applicationData.merchantId, {
    //   type: 'employee_application',
    //   title: '新员工申请',
    //   message: `${applicationData.name} 申请加入您的商户`,
    //   data: { applicationId: application.id }
    // });

    return application;
  }

  /**
   * 获取用户的申请记录
   */
  async getMyApplication(applicantId: number): Promise<EmployeeApplication | null> {
    return await this.employeeApplicationModel.findByApplicantId(applicantId);
  }

  /**
   * 获取商户的员工申请列表
   */
  async getMerchantApplications(
    merchantId: number,
    options: {
      status?: 'pending' | 'approved' | 'rejected';
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    applications: EmployeeApplication[];
    total: number;
    page: number;
    limit: number;
  }> {
    // 验证商户是否存在
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }

    return await this.employeeApplicationModel.findByMerchantId(merchantId, options);
  }

  /**
   * 获取申请详情
   */
  async getApplicationById(applicationId: number): Promise<EmployeeApplication> {
    return await this.employeeApplicationModel.findById(applicationId);
  }

  /**
   * 审批员工申请
   */
  async approveApplication(
    applicationId: number,
    approvedBy: number,
    approved: boolean,
    reason?: string
  ): Promise<EmployeeApplication> {
    // 获取申请信息
    const application = await this.employeeApplicationModel.findById(applicationId);
    if (application.status !== 'pending') {
      throw new Error('申请已被处理，无法重复操作');
    }

    // 验证审批人权限
    const approver = await UserModel.findById(approvedBy);
    if (!approver) {
      throw new Error('审批人不存在');
    }

    // 检查审批人是否有权限审批该商户的申请
    if (approver.user_type !== 'tenant_admin' && 
        (approver.user_type !== 'merchant_admin' || approver.merchant_id !== application.merchantId)) {
      throw new Error('您没有权限审批此申请');
    }

    const newStatus = approved ? 'approved' : 'rejected';
    
    // 更新申请状态
    const updatedApplication = await this.employeeApplicationModel.updateStatus(
      applicationId,
      newStatus,
      approvedBy,
      reason
    );

    // 如果申请通过，自动创建员工账号
    if (approved) {
      try {
        await this.createEmployeeFromApplication(application);
      } catch (error) {
        console.error('自动创建员工账号失败:', error);
        // 如果创建员工失败，回滚申请状态
        await this.employeeApplicationModel.updateStatus(applicationId, 'pending');
        throw new Error('创建员工账号失败，请联系管理员');
      }
    }

    // TODO: 发送通知给申请人
    // await this.notificationService.notifyUser(application.applicantId, {
    //   type: 'application_result',
    //   title: approved ? '申请通过' : '申请被拒绝',
    //   message: approved 
    //     ? `恭喜！您的员工申请已通过审批` 
    //     : `很抱歉，您的员工申请被拒绝${reason ? `：${reason}` : ''}`,
    //   data: { applicationId }
    // });

    return updatedApplication;
  }

  /**
   * 从申请信息创建员工账号
   */
  private async createEmployeeFromApplication(application: EmployeeApplication): Promise<void> {
    // 获取申请人信息
    const applicant = await UserModel.findById(application.applicantId);
    if (!applicant) {
      throw new Error('申请人不存在');
    }

    // 更新用户类型为员工，并关联到商户
    await UserModel.update(application.applicantId, {
      user_type: 'employee',
      merchant_id: application.merchantId,
      name: application.name,
      phone: application.phone,
      status: 'active'
    });

    // 创建员工记录
    await this.employeeService.createEmployee(application.merchantId, {
      name: application.name,
      phone: application.phone,
      user_type: 'employee',
      status: 'active'
    });
  }

  /**
   * 获取申请统计信息
   */
  async getApplicationStats(merchantId: number): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    return await this.employeeApplicationModel.getStats(merchantId);
  }

  /**
   * 撤销申请
   */
  async withdrawApplication(applicationId: number, applicantId: number): Promise<void> {
    const application = await this.employeeApplicationModel.findById(applicationId);
    
    if (application.applicantId !== applicantId) {
      throw new Error('您只能撤销自己的申请');
    }

    if (application.status !== 'pending') {
      throw new Error('只能撤销待审批的申请');
    }

    const success = await this.employeeApplicationModel.withdraw(applicationId, applicantId);
    if (!success) {
      throw new Error('撤销申请失败');
    }
  }

  /**
   * 身份验证 - 验证申请人身份信息
   */
  async verifyIdentity(
    applicantId: number,
    verificationData: {
      realName?: string;
      idCard?: string;
      phone?: string;
    }
  ): Promise<{ verified: boolean; message?: string }> {
    try {
      // 获取申请人的微信信息
      const applicant = await UserModel.findById(applicantId);
      if (!applicant) {
        return { verified: false, message: '用户不存在' };
      }

      // 这里可以集成第三方实名认证服务
      // 目前简单验证手机号是否匹配
      if (verificationData.phone && applicant.phone && verificationData.phone !== applicant.phone) {
        return { verified: false, message: '手机号与微信绑定手机号不匹配' };
      }

      // TODO: 集成实名认证API
      // const realNameVerification = await this.realNameService.verify({
      //   name: verificationData.realName,
      //   idCard: verificationData.idCard,
      //   phone: verificationData.phone
      // });

      return { verified: true, message: '身份验证通过' };
    } catch (error) {
      console.error('身份验证失败:', error);
      return { verified: false, message: '身份验证服务异常' };
    }
  }
}