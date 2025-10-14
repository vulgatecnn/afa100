import database from '../utils/database.js';
import type {
  Merchant,
  MerchantStatus,
  MerchantSettings,
  MerchantSubscription,
  SubscriptionType,
  SubscriptionStatus,
  DatabaseResult
} from '../types/index.js';

/**
 * 商户数据模型
 * 提供商户相关的数据库操作方法
 */
export class MerchantModel {
  /**
   * 创建新商户
   */
  static async create(merchantData: Omit<Merchant, 'id' | 'created_at' | 'updated_at' | 'createdAt' | 'updatedAt' | 'employees' | 'visitor_applications' | 'employee_applications' | 'statistics'>): Promise<Merchant> {
    const sql = `
      INSERT INTO merchants (name, code, contact, phone, email, address, status, settings, subscription)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const settingsJson = merchantData.settings
      ? (typeof merchantData.settings === 'string' ? merchantData.settings : JSON.stringify(merchantData.settings))
      : null;

    const subscriptionJson = merchantData.subscription
      ? JSON.stringify(merchantData.subscription)
      : null;

    const params = [
      merchantData.name,
      merchantData.code,
      merchantData.contact || null,
      merchantData.phone || null,
      merchantData.email || null,
      merchantData.address || null,
      merchantData.status || 'active',
      settingsJson,
      subscriptionJson
    ];

    const result = await database.run(sql, params);

    if (!result.lastID) {
      throw new Error('创建商户失败');
    }

    // 使用一致性查询确保能读取到刚创建的数据
    const sql_select = 'SELECT * FROM merchants WHERE id = ?';
    const newMerchant = await database.getWithConsistency<Merchant>(sql_select, [result.lastID]);

    if (!newMerchant) {
      throw new Error('创建商户后查询失败');
    }

    return newMerchant;
  }

  /**
   * 根据ID查找商户
   */
  static async findById(id: number): Promise<Merchant | null> {
    const sql = 'SELECT * FROM merchants WHERE id = ?';
    const merchant = await database.get<Merchant>(sql, [id]);
    return merchant || null;
  }

  /**
   * 根据商户编码查找商户
   */
  static async findByCode(code: string): Promise<Merchant | null> {
    const sql = 'SELECT * FROM merchants WHERE code = ?';
    const merchant = await database.get<Merchant>(sql, [code]);
    return merchant || null;
  }

  /**
   * 根据商户名称查找商户
   */
  static async findByName(name: string): Promise<Merchant[]> {
    const sql = 'SELECT * FROM merchants WHERE name LIKE ? ORDER BY created_at DESC';
    return await database.all<Merchant>(sql, [`%${name}%`]);
  }

  /**
   * 获取所有商户列表（支持分页和筛选）
   */
  static async findAll(options?: {
    page?: number;
    limit?: number;
    status?: MerchantStatus;
    search?: string;
  }): Promise<Merchant[]> {
    let sql = 'SELECT * FROM merchants WHERE 1=1';
    const params: any[] = [];

    // 添加筛选条件
    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    if (options?.search) {
      sql += ' AND (name LIKE ? OR code LIKE ? OR contact LIKE ?)';
      const searchPattern = `%${options.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
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

    return await database.all<Merchant>(sql, params);
  }

  /**
   * 更新商户信息
   */
  static async update(id: number, updateData: Partial<Omit<Merchant, 'id' | 'created_at'>>): Promise<Merchant> {
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

    const sql = `UPDATE merchants SET ${fields.join(', ')} WHERE id = ?`;
    const result = await database.run(sql, params);

    if (result.changes === 0) {
      throw new Error('商户不存在或更新失败');
    }

    const updatedMerchant = await this.findById(id);
    if (!updatedMerchant) {
      throw new Error('更新后查询商户失败');
    }

    return updatedMerchant;
  }

  /**
   * 删除商户（软删除，设置状态为inactive）
   */
  static async softDelete(id: number): Promise<boolean> {
    const result = await database.run(
      'UPDATE merchants SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['inactive', id]
    );
    return result.changes > 0;
  }

  /**
   * 物理删除商户
   */
  static async delete(id: number): Promise<boolean> {
    const result = await database.run('DELETE FROM merchants WHERE id = ?', [id]);
    return result.changes > 0;
  }

  /**
   * 统计商户数量
   */
  static async count(options?: {
    status?: MerchantStatus;
    search?: string;
  }): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM merchants WHERE 1=1';
    const params: any[] = [];

    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    if (options?.search) {
      sql += ' AND (name LIKE ? OR code LIKE ? OR contact LIKE ?)';
      const searchPattern = `%${options.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const result = await database.get<{ count: number }>(sql, params);
    return result?.count || 0;
  }

  /**
   * 获取商户的设置信息
   */
  static async getSettings(id: number): Promise<MerchantSettings> {
    const merchant = await this.findById(id);
    if (!merchant || !merchant.settings) {
      return {};
    }

    try {
      return typeof merchant.settings === 'string'
        ? JSON.parse(merchant.settings)
        : merchant.settings as MerchantSettings;
    } catch (error) {
      console.error('解析商户设置失败:', error);
      return {};
    }
  }

  /**
   * 更新商户设置
   */
  static async updateSettings(id: number, settings: MerchantSettings): Promise<Merchant> {
    const settingsJson = JSON.stringify(settings);
    return await this.update(id, { settings: settingsJson as any });
  }

  /**
   * 获取商户订阅信息
   */
  static async getSubscription(id: number): Promise<MerchantSubscription | null> {
    const merchant = await this.findById(id);
    if (!merchant || !merchant.subscription) {
      return null;
    }

    try {
      return typeof merchant.subscription === 'string'
        ? JSON.parse(merchant.subscription as string)
        : merchant.subscription;
    } catch (error) {
      console.error('解析商户订阅信息失败:', error);
      return null;
    }
  }

  /**
   * 更新商户订阅信息
   */
  static async updateSubscription(id: number, subscription: MerchantSubscription): Promise<Merchant> {
    const subscriptionJson = JSON.stringify(subscription);
    return await this.update(id, { subscription: subscriptionJson as any });
  }

  /**
   * 检查商户订阅状态
   */
  static async checkSubscriptionStatus(id: number): Promise<{
    isActive: boolean;
    isExpired: boolean;
    daysRemaining?: number;
  }> {
    const subscription = await this.getSubscription(id);

    if (!subscription) {
      return { isActive: false, isExpired: true };
    }

    const now = new Date();
    const endDate = subscription.endDate ? new Date(subscription.endDate) : null;

    const isActive = subscription.status === 'active';
    const isExpired = endDate ? now > endDate : false;

    let daysRemaining: number | undefined;
    if (endDate && !isExpired) {
      daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      isActive: isActive && !isExpired,
      isExpired,
      daysRemaining
    } as { isActive: boolean; isExpired: boolean; daysRemaining?: number };
  }

  /**
   * 验证商户数据
   */
  static validateMerchantData(merchantData: Partial<Merchant>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证必填字段
    if (!merchantData.name || merchantData.name.trim().length === 0) {
      errors.push('商户名称不能为空');
    }

    if (!merchantData.code || merchantData.code.trim().length === 0) {
      errors.push('商户编码不能为空');
    } else if (!/^[A-Z0-9_]{2,20}$/.test(merchantData.code)) {
      errors.push('商户编码格式无效（只能包含大写字母、数字和下划线，长度2-20位）');
    }

    // 验证手机号格式
    if (merchantData.phone && !/^1[3-9]\d{9}$/.test(merchantData.phone)) {
      errors.push('手机号格式无效');
    }

    // 验证邮箱格式
    if (merchantData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(merchantData.email)) {
      errors.push('邮箱格式无效');
    }

    // 验证状态
    if (merchantData.status && !['active', 'inactive'].includes(merchantData.status)) {
      errors.push('商户状态无效');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 检查商户是否存在
   */
  static async exists(id: number): Promise<boolean> {
    const sql = 'SELECT 1 FROM merchants WHERE id = ?';
    const result = await database.get(sql, [id]);
    return !!result;
  }

  /**
   * 检查商户编码是否已存在
   */
  static async codeExists(code: string, excludeId?: number): Promise<boolean> {
    let sql = 'SELECT 1 FROM merchants WHERE code = ?';
    const params: any[] = [code];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await database.get(sql, params);
    return !!result;
  }

  /**
   * 获取商户的员工数量
   */
  static async getEmployeeCount(merchantId: number): Promise<number> {
    const sql = `
      SELECT COUNT(*) as count 
      FROM users 
      WHERE merchant_id = ? AND user_type IN ('merchant_admin', 'employee') AND status = 'active'
    `;
    const result = await database.get<{ count: number }>(sql, [merchantId]);
    return result?.count || 0;
  }

  /**
   * 获取商户的访客申请数量
   */
  static async getVisitorApplicationCount(merchantId: number, status?: string): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM visitor_applications WHERE merchant_id = ?';
    const params: any[] = [merchantId];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    const result = await database.get<{ count: number }>(sql, params);
    return result?.count || 0;
  }

  /**
   * 获取商户统计信息
   */
  static async getStatistics(merchantId: number): Promise<{
    employeeCount: number;
    pendingApplications: number;
    totalApplications: number;
    activePasscodes: number;
  }> {
    const [employeeCount, pendingApplications, totalApplications, activePasscodes] = await Promise.all([
      this.getEmployeeCount(merchantId),
      this.getVisitorApplicationCount(merchantId, 'pending'),
      this.getVisitorApplicationCount(merchantId),
      this.getActivePasscodeCount(merchantId)
    ]);

    return {
      employeeCount,
      pendingApplications,
      totalApplications,
      activePasscodes
    };
  }

  /**
   * 获取商户的活跃通行码数量
   */
  static async getActivePasscodeCount(merchantId: number): Promise<number> {
    const sql = `
      SELECT COUNT(*) as count 
      FROM passcodes p
      JOIN users u ON p.user_id = u.id
      WHERE u.merchant_id = ? AND p.status = 'active'
    `;
    const result = await database.get<{ count: number }>(sql, [merchantId]);
    return result?.count || 0;
  }

  /**
   * 批量更新商户状态
   */
  static async batchUpdateStatus(ids: number[], status: MerchantStatus): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const placeholders = ids.map(() => '?').join(',');
    const sql = `
      UPDATE merchants 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id IN (${placeholders})
    `;
    const params = [status, ...ids];

    const result = await database.run(sql, params);
    return result.changes;
  }

  /**
   * 获取商户及其员工信息
   */
  static async findWithEmployees(id: number): Promise<(Merchant & { employees?: any[] }) | null> {
    const merchant = await this.findById(id);
    if (!merchant) {
      return null;
    }

    // 获取员工列表
    const employeeSql = `
      SELECT id, name, phone, user_type, status, created_at
      FROM users 
      WHERE merchant_id = ? AND user_type IN ('merchant_admin', 'employee') 
      ORDER BY created_at DESC
    `;

    const employees = await database.all<any>(employeeSql, [id]);

    return {
      ...merchant,
      employees,
      createdAt: merchant.created_at,
      updatedAt: merchant.updated_at
    };
  }

  /**
   * 获取商户的详细统计信息
   */
  static async getDetailedStatistics(merchantId: number): Promise<{
    employees: {
      total: number;
      active: number;
      inactive: number;
      byType: Record<string, number>;
    };
    visitors: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      thisMonth: number;
    };
    access: {
      total: number;
      success: number;
      failed: number;
      today: number;
    };
  }> {
    const [employeeStats, visitorStats, accessStats] = await Promise.all([
      this.getEmployeeStatistics(merchantId),
      this.getVisitorStatistics(merchantId),
      this.getAccessStatistics(merchantId)
    ]);

    return {
      employees: employeeStats,
      visitors: visitorStats,
      access: accessStats
    };
  }

  /**
   * 获取员工统计信息
   */
  private static async getEmployeeStatistics(merchantId: number): Promise<{
    total: number;
    active: number;
    inactive: number;
    byType: Record<string, number>;
  }> {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
        user_type,
        COUNT(*) as type_count
      FROM users 
      WHERE merchant_id = ? AND user_type IN ('merchant_admin', 'employee')
      GROUP BY user_type
    `;

    const results = await database.all<any>(sql, [merchantId]);

    let total = 0;
    let active = 0;
    let inactive = 0;
    const byType: Record<string, number> = {};

    results.forEach(row => {
      total += row.total;
      active += row.active;
      inactive += row.inactive;
      byType[row.user_type] = row.type_count;
    });

    return { total, active, inactive, byType };
  }

  /**
   * 获取访客统计信息
   */
  private static async getVisitorStatistics(merchantId: number): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    thisMonth: number;
  }> {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN created_at >= date('now', 'start of month') THEN 1 ELSE 0 END) as this_month
      FROM visitor_applications 
      WHERE merchant_id = ?
    `;

    const result = await database.get<any>(sql, [merchantId]);

    return {
      total: result?.total || 0,
      pending: result?.pending || 0,
      approved: result?.approved || 0,
      rejected: result?.rejected || 0,
      thisMonth: result?.this_month || 0
    };
  }

  /**
   * 获取通行统计信息
   */
  private static async getAccessStatistics(merchantId: number): Promise<{
    total: number;
    success: number;
    failed: number;
    today: number;
  }> {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN ar.result = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN ar.result = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN date(ar.timestamp) = date('now') THEN 1 ELSE 0 END) as today
      FROM access_records ar
      JOIN users u ON ar.user_id = u.id
      WHERE u.merchant_id = ?
    `;

    const result = await database.get<any>(sql, [merchantId]);

    return {
      total: result?.total || 0,
      success: result?.success || 0,
      failed: result?.failed || 0,
      today: result?.today || 0
    };
  }
}