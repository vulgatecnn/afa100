import database from '../utils/database.js';
import type { Merchant, MerchantStatus, DatabaseResult } from '../types/index.js';

/**
 * 商户数据模型
 * 提供商户相关的数据库操作方法
 */
export class MerchantModel {
  /**
   * 创建新商户
   */
  static async create(merchantData: Omit<Merchant, 'id' | 'created_at' | 'updated_at'>): Promise<Merchant> {
    const sql = `
      INSERT INTO merchants (name, code, contact, phone, email, address, status, settings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      merchantData.name,
      merchantData.code,
      merchantData.contact || null,
      merchantData.phone || null,
      merchantData.email || null,
      merchantData.address || null,
      merchantData.status || 'active',
      merchantData.settings || null
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
  static async getSettings(id: number): Promise<any> {
    const merchant = await this.findById(id);
    if (!merchant || !merchant.settings) {
      return {};
    }

    try {
      return JSON.parse(merchant.settings);
    } catch (error) {
      console.error('解析商户设置失败:', error);
      return {};
    }
  }

  /**
   * 更新商户设置
   */
  static async updateSettings(id: number, settings: any): Promise<Merchant> {
    const settingsJson = JSON.stringify(settings);
    return await this.update(id, { settings: settingsJson });
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
}