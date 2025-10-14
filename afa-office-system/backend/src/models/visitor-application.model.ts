import database from '../utils/database.js';
import type { 
  VisitorApplication, 
  ApplicationStatus, 
  ApprovalStatus, 
  VisitPurpose, 
  VisitType,
  VisitorVerification 
} from '../types/index.js';

/**
 * 访客申请数据模型
 * 提供访客申请相关的数据库操作方法
 */
export class VisitorApplicationModel {
  /**
   * 创建新访客申请
   */
  static async create(applicationData: Omit<VisitorApplication, 'id' | 'created_at' | 'updated_at' | 'createdAt' | 'updatedAt' | 'scheduledTime' | 'applicant' | 'merchant' | 'visitee' | 'approver' | 'access_records'>): Promise<VisitorApplication> {
    const sql = `
      INSERT INTO visitor_applications (
        applicant_id, merchant_id, visitee_id, visitor_name, visitor_phone, 
        visitor_company, visit_purpose, visitPurpose, visit_type, scheduled_time, duration, 
        status, approvalStatus, approved_by, approved_at, rejection_reason, passcode, passcode_expiry,
        usage_limit, usage_count, verification, workflow
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const verificationJson = applicationData.verification 
      ? JSON.stringify(applicationData.verification)
      : null;
    
    const workflowJson = applicationData.workflow 
      ? JSON.stringify(applicationData.workflow)
      : null;

    const params = [
      applicationData.applicant_id,
      applicationData.merchant_id,
      applicationData.visitee_id || null,
      applicationData.visitor_name,
      applicationData.visitor_phone,
      applicationData.visitor_company || null,
      applicationData.visit_purpose,
      applicationData.visitPurpose || null,
      applicationData.visit_type || null,
      applicationData.scheduled_time,
      applicationData.duration || 4,
      applicationData.status || 'pending',
      applicationData.approvalStatus || 'pending',
      applicationData.approved_by || null,
      applicationData.approved_at || null,
      applicationData.rejection_reason || null,
      applicationData.passcode || null,
      applicationData.passcode_expiry || null,
      applicationData.usage_limit || 10,
      applicationData.usage_count || 0,
      verificationJson,
      workflowJson
    ];

    const result = await database.run(sql, params);

    if (!result.lastID) {
      throw new Error('创建访客申请失败');
    }

    // 等待一小段时间确保数据写入完成
    await new Promise(resolve => setTimeout(resolve, 1));
    
    // 使用一致性查询确保能读取到刚创建的数据
    const sql_select = 'SELECT * FROM visitor_applications WHERE id = ?';
    const newApplication = await database.getWithConsistency<VisitorApplication>(sql_select, [result.lastID]);
    
    if (!newApplication) {
      throw new Error('创建访客申请后查询失败');
    }

    return newApplication;
  }

  /**
   * 根据ID查找访客申请
   */
  static async findById(id: number): Promise<VisitorApplication | null> {
    const sql = 'SELECT * FROM visitor_applications WHERE id = ?';
    const application = await database.get<VisitorApplication>(sql, [id]);
    return application || null;
  }

  /**
   * 根据申请人ID查找访客申请列表
   */
  static async findByApplicantId(applicantId: number): Promise<VisitorApplication[]> {
    const sql = 'SELECT * FROM visitor_applications WHERE applicant_id = ? ORDER BY created_at DESC';
    return await database.all<VisitorApplication>(sql, [applicantId]);
  }

  /**
   * 根据商户ID查找访客申请列表
   */
  static async findByMerchantId(merchantId: number): Promise<VisitorApplication[]> {
    const sql = 'SELECT * FROM visitor_applications WHERE merchant_id = ? ORDER BY created_at DESC';
    return await database.all<VisitorApplication>(sql, [merchantId]);
  }

  /**
   * 根据被访人ID查找访客申请列表
   */
  static async findByVisiteeId(visiteeId: number): Promise<VisitorApplication[]> {
    const sql = 'SELECT * FROM visitor_applications WHERE visitee_id = ? ORDER BY created_at DESC';
    return await database.all<VisitorApplication>(sql, [visiteeId]);
  }

  /**
   * 根据状态查找访客申请列表
   */
  static async findByStatus(status: ApplicationStatus): Promise<VisitorApplication[]> {
    const sql = 'SELECT * FROM visitor_applications WHERE status = ? ORDER BY created_at DESC';
    return await database.all<VisitorApplication>(sql, [status]);
  }

  /**
   * 获取所有访客申请列表（支持分页和筛选）
   */
  static async findAll(options?: {
    page?: number;
    limit?: number;
    status?: ApplicationStatus;
    merchantId?: number;
    applicantId?: number;
    visiteeId?: number;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }): Promise<VisitorApplication[]> {
    let sql = 'SELECT * FROM visitor_applications WHERE 1=1';
    const params: any[] = [];

    // 添加筛选条件
    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    if (options?.merchantId) {
      sql += ' AND merchant_id = ?';
      params.push(options.merchantId);
    }

    if (options?.applicantId) {
      sql += ' AND applicant_id = ?';
      params.push(options.applicantId);
    }

    if (options?.visiteeId) {
      sql += ' AND visitee_id = ?';
      params.push(options.visiteeId);
    }

    if (options?.dateFrom) {
      sql += ' AND scheduled_time >= ?';
      params.push(options.dateFrom);
    }

    if (options?.dateTo) {
      sql += ' AND scheduled_time <= ?';
      params.push(options.dateTo);
    }

    if (options?.search) {
      sql += ' AND (visitor_name LIKE ? OR visitor_phone LIKE ? OR visitor_company LIKE ? OR visit_purpose LIKE ?)';
      const searchPattern = `%${options.search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // 添加排序
    sql += ' ORDER BY created_at DESC';

    // 添加分页
    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);

      if (options?.page && options.page > 1) {
        sql += ' OFFSET ?';
        params.push((options.page - 1) * options.limit);
      }
    }

    return await database.all<VisitorApplication>(sql, params);
  }

  /**
   * 更新访客申请信息
   */
  static async update(id: number, updateData: Partial<Omit<VisitorApplication, 'id' | 'created_at'>>): Promise<VisitorApplication> {
    const fields: string[] = [];
    const params: any[] = [];

    // 构建动态更新字段
    Object.entries(updateData).forEach(([key, value]) => {
      if (key !== 'updated_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (fields.length === 0) {
      throw new Error('没有需要更新的字段');
    }

    // 添加更新时间
    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const sql = `UPDATE visitor_applications SET ${fields.join(', ')} WHERE id = ?`;
    const result = await database.run(sql, params);

    if (result.changes === 0) {
      throw new Error('访客申请不存在或更新失败');
    }

    const updatedApplication = await this.findById(id);
    if (!updatedApplication) {
      throw new Error('更新后查询访客申请失败');
    }

    return updatedApplication;
  }

  /**
   * 审批访客申请
   */
  static async approve(id: number, approvedBy: number, passcode?: string, passcodeExpiry?: string): Promise<VisitorApplication> {
    const updateData: any = {
      status: 'approved' as ApplicationStatus,
      approved_by: approvedBy,
      approved_at: new Date().toISOString()
    };

    if (passcode) {
      updateData.passcode = passcode;
    }

    if (passcodeExpiry) {
      updateData.passcode_expiry = passcodeExpiry;
    }

    return await this.update(id, updateData);
  }

  /**
   * 拒绝访客申请
   */
  static async reject(id: number, approvedBy: number, rejectionReason: string): Promise<VisitorApplication> {
    return await this.update(id, {
      status: 'rejected' as ApplicationStatus,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      rejection_reason: rejectionReason
    });
  }

  /**
   * 删除访客申请
   */
  static async delete(id: number): Promise<boolean> {
    const result = await database.run('DELETE FROM visitor_applications WHERE id = ?', [id]);
    return result.changes > 0;
  }

  /**
   * 统计访客申请数量
   */
  static async count(options?: {
    status?: ApplicationStatus;
    merchantId?: number;
    applicantId?: number;
    visiteeId?: number;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM visitor_applications WHERE 1=1';
    const params: any[] = [];

    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    if (options?.merchantId) {
      sql += ' AND merchant_id = ?';
      params.push(options.merchantId);
    }

    if (options?.applicantId) {
      sql += ' AND applicant_id = ?';
      params.push(options.applicantId);
    }

    if (options?.visiteeId) {
      sql += ' AND visitee_id = ?';
      params.push(options.visiteeId);
    }

    if (options?.dateFrom) {
      sql += ' AND scheduled_time >= ?';
      params.push(options.dateFrom);
    }

    if (options?.dateTo) {
      sql += ' AND scheduled_time <= ?';
      params.push(options.dateTo);
    }

    if (options?.search) {
      sql += ' AND (visitor_name LIKE ? OR visitor_phone LIKE ? OR visitor_company LIKE ? OR visit_purpose LIKE ?)';
      const searchPattern = `%${options.search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const result = await database.get<{ count: number }>(sql, params);
    return result?.count || 0;
  }

  /**
   * 获取待审批的申请数量
   */
  static async getPendingCount(merchantId?: number): Promise<number> {
    const options: any = { status: 'pending' };
    if (merchantId !== undefined) {
      options.merchantId = merchantId;
    }
    return await this.count(options);
  }

  /**
   * 获取今日访客申请数量
   */
  static async getTodayCount(merchantId?: number): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const options: any = {
      dateFrom: today + ' 00:00:00',
      dateTo: today + ' 23:59:59'
    };
    if (merchantId !== undefined) {
      options.merchantId = merchantId;
    }
    return await this.count(options);
  }

  /**
   * 验证访客申请数据
   */
  static validateApplicationData(applicationData: Partial<VisitorApplication>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证必填字段
    if (!applicationData.applicant_id || applicationData.applicant_id <= 0) {
      errors.push('申请人ID无效');
    }

    if (!applicationData.merchant_id || applicationData.merchant_id <= 0) {
      errors.push('商户ID无效');
    }

    if (!applicationData.visitor_name || applicationData.visitor_name.trim().length === 0) {
      errors.push('访客姓名不能为空');
    }

    if (!applicationData.visitor_phone || applicationData.visitor_phone.trim().length === 0) {
      errors.push('访客电话不能为空');
    } else if (!/^1[3-9]\d{9}$/.test(applicationData.visitor_phone)) {
      errors.push('访客电话格式无效');
    }

    if (!applicationData.visit_purpose || applicationData.visit_purpose.trim().length === 0) {
      errors.push('访问目的不能为空');
    }

    if (!applicationData.scheduled_time) {
      errors.push('预约时间不能为空');
    } else {
      const scheduledTime = new Date(applicationData.scheduled_time);
      const now = new Date();
      if (scheduledTime <= now) {
        errors.push('预约时间必须是未来时间');
      }
    }

    // 验证时长
    if (applicationData.duration !== undefined && (applicationData.duration <= 0 || applicationData.duration > 24)) {
      errors.push('访问时长必须在1-24小时之间');
    }

    // 验证状态
    if (applicationData.status && !['pending', 'approved', 'rejected', 'expired', 'completed'].includes(applicationData.status)) {
      errors.push('申请状态无效');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 检查访客申请是否存在
   */
  static async exists(id: number): Promise<boolean> {
    const sql = 'SELECT 1 FROM visitor_applications WHERE id = ?';
    const result = await database.get(sql, [id]);
    return !!result;
  }

  /**
   * 更新通行码使用次数
   */
  static async incrementUsageCount(id: number): Promise<boolean> {
    const sql = 'UPDATE visitor_applications SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const result = await database.run(sql, [id]);
    return result.changes > 0;
  }

  /**
   * 检查通行码是否可用
   */
  static async isPasscodeValid(id: number): Promise<boolean> {
    const application = await this.findById(id);
    if (!application || application.status !== 'approved') {
      return false;
    }

    // 检查过期时间
    if (application.passcode_expiry) {
      const expiryTime = new Date(application.passcode_expiry);
      if (expiryTime <= new Date()) {
        return false;
      }
    }

    // 检查使用次数
    if (application.usage_count >= application.usage_limit) {
      return false;
    }

    return true;
  }

  /**
   * 获取即将过期的申请
   */
  static async getExpiringApplications(hours: number = 24): Promise<VisitorApplication[]> {
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + hours);

    const sql = `
      SELECT * FROM visitor_applications 
      WHERE status = 'approved' 
      AND passcode_expiry IS NOT NULL 
      AND passcode_expiry <= ? 
      AND passcode_expiry > CURRENT_TIMESTAMP
      ORDER BY passcode_expiry
    `;

    return await database.all<VisitorApplication>(sql, [expiryTime.toISOString()]);
  }

  /**
   * 标记过期的申请
   */
  static async markExpiredApplications(): Promise<number> {
    const sql = `
      UPDATE visitor_applications 
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'approved' 
      AND (
        (passcode_expiry IS NOT NULL AND passcode_expiry <= CURRENT_TIMESTAMP)
        OR 
        (scheduled_time < datetime('now', '-1 day'))
      )
    `;

    const result = await database.run(sql);
    return result.changes;
  }

  /**
   * 获取访客申请的详细信息（包含关联用户信息）
   */
  static async getFullInfo(id: number): Promise<{
    application: VisitorApplication;
    applicant: any;
    merchant: any;
    visitee?: any;
    approver?: any;
  } | null> {
    const application = await this.findById(id);
    if (!application) {
      return null;
    }

    // 获取申请人信息
    const applicantQuery = 'SELECT * FROM users WHERE id = ?';
    const applicant = await database.get(applicantQuery, [application.applicant_id]);

    // 获取商户信息
    const merchantQuery = 'SELECT * FROM merchants WHERE id = ?';
    const merchant = await database.get(merchantQuery, [application.merchant_id]);

    // 获取被访人信息
    let visitee = null;
    if (application.visitee_id) {
      const visiteeQuery = 'SELECT * FROM users WHERE id = ?';
      visitee = await database.get(visiteeQuery, [application.visitee_id]);
    }

    // 获取审批人信息
    let approver = null;
    if (application.approved_by) {
      const approverQuery = 'SELECT * FROM users WHERE id = ?';
      approver = await database.get(approverQuery, [application.approved_by]);
    }

    return {
      application,
      applicant,
      merchant,
      visitee,
      approver
    };
  }

  /**
   * 批量更新申请状态
   */
  static async batchUpdateStatus(ids: number[], status: ApplicationStatus): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const placeholders = ids.map(() => '?').join(',');
    const sql = `
      UPDATE visitor_applications 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id IN (${placeholders})
    `;
    const params = [status, ...ids.map(id => id.toString())];

    const result = await database.run(sql, params);
    return result.changes;
  }

  /**
   * 查找重复申请
   */
  static async findDuplicateApplication(
    visitorPhone: string, 
    merchantId: number, 
    scheduledTime: Date
  ): Promise<VisitorApplication | null> {
    // 检查同一手机号在前后2小时内是否有申请
    const startTime = new Date(scheduledTime.getTime() - 2 * 60 * 60 * 1000);
    const endTime = new Date(scheduledTime.getTime() + 2 * 60 * 60 * 1000);

    const sql = `
      SELECT * FROM visitor_applications 
      WHERE visitor_phone = ? 
      AND merchant_id = ? 
      AND scheduled_time BETWEEN ? AND ?
      AND status IN ('pending', 'approved')
      LIMIT 1
    `;

    const application = await database.get<VisitorApplication>(sql, [
      visitorPhone,
      merchantId,
      startTime.toISOString(),
      endTime.toISOString()
    ]);

    return application || null;
  }

  /**
   * 更新通行码
   */
  static async updatePasscode(id: number, passcode: string, passcodeExpiry: string): Promise<boolean> {
    const sql = `
      UPDATE visitor_applications 
      SET passcode = ?, passcode_expiry = ?, usage_count = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    const result = await database.run(sql, [passcode, passcodeExpiry, id]);
    return result.changes > 0;
  }

  /**
   * 更新访客验证信息
   */
  static async updateVerification(id: number, verification: VisitorVerification): Promise<VisitorApplication> {
    const verificationJson = JSON.stringify(verification);
    return await this.update(id, { verification: verificationJson });
  }

  /**
   * 获取访客验证信息
   */
  static async getVerification(id: number): Promise<VisitorVerification | null> {
    const application = await this.findById(id);
    if (!application || !application.verification) {
      return null;
    }

    try {
      return typeof application.verification === 'string' 
        ? JSON.parse(application.verification) 
        : application.verification;
    } catch (error) {
      console.error('解析访客验证信息失败:', error);
      return null;
    }
  }

  /**
   * 更新审批状态
   */
  static async updateApprovalStatus(id: number, approvalStatus: ApprovalStatus, approvedBy?: number): Promise<VisitorApplication> {
    const updateData: any = {
      approvalStatus,
      approved_at: new Date().toISOString()
    };

    if (approvedBy) {
      updateData.approved_by = approvedBy;
    }

    // 同时更新主状态
    if (approvalStatus === 'approved' || approvalStatus === 'auto_approved') {
      updateData.status = 'approved';
    } else if (approvalStatus === 'rejected') {
      updateData.status = 'rejected';
    }

    return await this.update(id, updateData);
  }

  /**
   * 更新工作流状态
   */
  static async updateWorkflow(id: number, workflow: any): Promise<VisitorApplication> {
    const workflowJson = JSON.stringify(workflow);
    return await this.update(id, { workflow: workflowJson });
  }

  /**
   * 获取工作流状态
   */
  static async getWorkflow(id: number): Promise<any | null> {
    const application = await this.findById(id);
    if (!application || !application.workflow) {
      return null;
    }

    try {
      return typeof application.workflow === 'string' 
        ? JSON.parse(application.workflow) 
        : application.workflow;
    } catch (error) {
      console.error('解析工作流信息失败:', error);
      return null;
    }
  }

  /**
   * 根据访问目的查找申请
   */
  static async findByVisitPurpose(visitPurpose: VisitPurpose): Promise<VisitorApplication[]> {
    const sql = 'SELECT * FROM visitor_applications WHERE visitPurpose = ? ORDER BY created_at DESC';
    return await database.all<VisitorApplication>(sql, [visitPurpose]);
  }

  /**
   * 根据审批状态查找申请
   */
  static async findByApprovalStatus(approvalStatus: ApprovalStatus): Promise<VisitorApplication[]> {
    const sql = 'SELECT * FROM visitor_applications WHERE approvalStatus = ? ORDER BY created_at DESC';
    return await database.all<VisitorApplication>(sql, [approvalStatus]);
  }

  /**
   * 获取申请的完整信息（包含关联数据和camelCase字段）
   */
  static async findWithRelations(id: number): Promise<(VisitorApplication & {
    applicant?: any;
    merchant?: any;
    visitee?: any;
    approver?: any;
  }) | null> {
    const fullInfo = await this.getFullInfo(id);
    if (!fullInfo) {
      return null;
    }

    const application = fullInfo.application;
    
    // 添加camelCase字段
    const result = {
      ...application,
      createdAt: application.created_at,
      updatedAt: application.updated_at,
      scheduledTime: application.scheduled_time,
      applicant: fullInfo.applicant,
      merchant: fullInfo.merchant,
      visitee: fullInfo.visitee,
      approver: fullInfo.approver
    };

    return result;
  }

  /**
   * 批量更新审批状态
   */
  static async batchUpdateApprovalStatus(ids: number[], approvalStatus: ApprovalStatus, approvedBy?: number): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const placeholders = ids.map(() => '?').join(',');
    const params = [approvalStatus, new Date().toISOString()];
    
    let sql = `
      UPDATE visitor_applications 
      SET approvalStatus = ?, approved_at = ?, updated_at = CURRENT_TIMESTAMP
    `;

    if (approvedBy) {
      sql += ', approved_by = ?';
      params.push(approvedBy.toString());
    }

    // 同时更新主状态
    if (approvalStatus === 'approved' || approvalStatus === 'auto_approved') {
      sql += ', status = ?';
      params.push('approved');
    } else if (approvalStatus === 'rejected') {
      sql += ', status = ?';
      params.push('rejected');
    }

    sql += ` WHERE id IN (${placeholders})`;
    params.push(...ids.map(id => id.toString()));

    const result = await database.run(sql, params);
    return result.changes;
  }

  /**
   * 获取需要验证的申请列表
   */
  static async getPendingVerificationApplications(merchantId?: number): Promise<VisitorApplication[]> {
    let sql = `
      SELECT * FROM visitor_applications 
      WHERE status = 'approved' 
      AND (verification IS NULL OR JSON_EXTRACT(verification, '$.verificationStatus') = 'pending')
    `;
    const params: any[] = [];

    if (merchantId) {
      sql += ' AND merchant_id = ?';
      params.push(merchantId);
    }

    sql += ' ORDER BY scheduled_time ASC';

    return await database.all<VisitorApplication>(sql, params);
  }
}