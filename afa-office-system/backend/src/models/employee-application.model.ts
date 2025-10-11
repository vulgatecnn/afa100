import { Database } from '../utils/database.js';
import type { EmployeeApplication } from '../types/index.js';

/**
 * 员工申请数据模型
 * 处理员工申请相关的数据库操作
 */
export class EmployeeApplicationModel {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * 创建员工申请
   */
  async create(applicationData: {
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
  }): Promise<EmployeeApplication> {
    const sql = `
      INSERT INTO employee_applications (
        applicant_id, merchant_id, name, phone, department, position, 
        id_card, email, start_date, emergency_contact, emergency_phone, emergency_relationship,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    const params = [
      applicationData.applicantId,
      applicationData.merchantId,
      applicationData.name,
      applicationData.phone,
      applicationData.department || null,
      applicationData.position || null,
      applicationData.idCard || null,
      applicationData.email || null,
      applicationData.startDate || null,
      applicationData.emergencyContact || null,
      applicationData.emergencyPhone || null,
      applicationData.emergencyRelationship || null
    ];

    const result = await this.db.run(sql, params);
    
    if (!result.lastID) {
      throw new Error('创建员工申请失败');
    }

    return this.findById(result.lastID);
  }

  /**
   * 根据ID查找员工申请
   */
  async findById(id: number): Promise<EmployeeApplication> {
    const sql = `
      SELECT 
        id,
        applicant_id as applicantId,
        merchant_id as merchantId,
        name,
        phone,
        department,
        position,
        id_card as idCard,
        email,
        start_date as startDate,
        emergency_contact as emergencyContact,
        emergency_phone as emergencyPhone,
        emergency_relationship as emergencyRelationship,
        status,
        approved_by as approvedBy,
        approved_at as approvedAt,
        rejection_reason as rejectionReason,
        created_at as createdAt,
        updated_at as updatedAt
      FROM employee_applications 
      WHERE id = ?
    `;

    const application = await this.db.get<EmployeeApplication>(sql, [id]);
    
    if (!application) {
      throw new Error('员工申请不存在');
    }

    return application;
  }

  /**
   * 根据申请人ID查找申请
   */
  async findByApplicantId(applicantId: number): Promise<EmployeeApplication | null> {
    const sql = `
      SELECT 
        id,
        applicant_id as applicantId,
        merchant_id as merchantId,
        name,
        phone,
        department,
        position,
        id_card as idCard,
        email,
        start_date as startDate,
        emergency_contact as emergencyContact,
        emergency_phone as emergencyPhone,
        emergency_relationship as emergencyRelationship,
        status,
        approved_by as approvedBy,
        approved_at as approvedAt,
        rejection_reason as rejectionReason,
        created_at as createdAt,
        updated_at as updatedAt
      FROM employee_applications 
      WHERE applicant_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.db.get<EmployeeApplication>(sql, [applicantId]);
    return result || null;
  }

  /**
   * 获取商户的员工申请列表
   */
  async findByMerchantId(
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
    const { status, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE merchant_id = ?';
    const params: any[] = [merchantId];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM employee_applications ${whereClause}`;
    const countResult = await this.db.get<{ total: number }>(countSql, params);
    const total = countResult?.total || 0;

    // 获取数据
    const sql = `
      SELECT 
        id,
        applicant_id as applicantId,
        merchant_id as merchantId,
        name,
        phone,
        department,
        position,
        id_card as idCard,
        email,
        start_date as startDate,
        emergency_contact as emergencyContact,
        emergency_phone as emergencyPhone,
        emergency_relationship as emergencyRelationship,
        status,
        approved_by as approvedBy,
        approved_at as approvedAt,
        rejection_reason as rejectionReason,
        created_at as createdAt,
        updated_at as updatedAt
      FROM employee_applications 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const applications = await this.db.all<EmployeeApplication>(sql, [...params, limit, offset]);

    return {
      applications,
      total,
      page,
      limit
    };
  }

  /**
   * 更新申请状态
   */
  async updateStatus(
    id: number, 
    status: 'pending' | 'approved' | 'rejected',
    approvedBy?: number,
    rejectionReason?: string
  ): Promise<EmployeeApplication> {
    const sql = `
      UPDATE employee_applications 
      SET 
        status = ?,
        approved_by = ?,
        approved_at = CASE WHEN ? IN ('approved', 'rejected') THEN CURRENT_TIMESTAMP ELSE NULL END,
        rejection_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const result = await this.db.run(sql, [
      status, 
      approvedBy || null, 
      status, 
      status === 'rejected' ? rejectionReason : null,
      id
    ]);
    
    if (result.changes === 0) {
      throw new Error('员工申请不存在或更新失败');
    }

    return this.findById(id);
  }

  /**
   * 撤销申请（仅限申请人本人且状态为pending）
   */
  async withdraw(id: number, applicantId: number): Promise<boolean> {
    const sql = `
      DELETE FROM employee_applications 
      WHERE id = ? AND applicant_id = ? AND status = 'pending'
    `;
    
    const result = await this.db.run(sql, [id, applicantId]);
    return result.changes > 0;
  }

  /**
   * 检查是否已存在申请
   */
  async existsByApplicantAndMerchant(applicantId: number, merchantId: number): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count 
      FROM employee_applications 
      WHERE applicant_id = ? AND merchant_id = ? AND status IN ('pending', 'approved')
    `;

    const result = await this.db.get<{ count: number }>(sql, [applicantId, merchantId]);
    return (result?.count || 0) > 0;
  }

  /**
   * 删除申请
   */
  async delete(id: number): Promise<boolean> {
    const sql = 'DELETE FROM employee_applications WHERE id = ?';
    const result = await this.db.run(sql, [id]);
    return result.changes > 0;
  }

  /**
   * 获取申请统计信息
   */
  async getStats(merchantId: number): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM employee_applications 
      WHERE merchant_id = ?
    `;

    const result = await this.db.get<{
      total: number;
      pending: number;
      approved: number;
      rejected: number;
    }>(sql, [merchantId]);

    return {
      total: result?.total || 0,
      pending: result?.pending || 0,
      approved: result?.approved || 0,
      rejected: result?.rejected || 0
    };
  }
}