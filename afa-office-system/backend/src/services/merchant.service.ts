import { Database } from '../utils/database.js';
import type { Merchant, User, Permission } from '../types/index.js';
import { AppError, ErrorCodes } from '../middleware/error.middleware.js';
import type { 
  CreateMerchantData, 
  UpdateMerchantData, 
  MerchantListQuery,
  MerchantStats,
  PaginatedResult
} from '../types/index.js';

/**
 * 商户管理服务
 * 处理商户相关的业务逻辑
 */
export class MerchantService {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * 获取商户列表（分页）
   */
  async getMerchants(query: MerchantListQuery): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 10, status, search } = query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: any[] = [];

    // 构建查询条件
    const conditions: string[] = [];
    
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(name LIKE ? OR code LIKE ? OR contact LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // 获取总数
    const countSql = `
      SELECT COUNT(*) as total 
      FROM merchants 
      ${whereClause}
    `;
    
    const countResult = await this.db.get(countSql, params);
    const total = countResult?.total || 0;

    // 获取数据
    const dataSql = `
      SELECT 
        id,
        name,
        code,
        contact,
        phone,
        email,
        address,
        status,
        created_at,
        updated_at,
        (SELECT COUNT(*) FROM users WHERE merchant_id = merchants.id AND user_type = 'employee') as employee_count
      FROM merchants 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const merchants = await this.db.all(dataSql, [...params, limit, offset]);

    return {
      data: merchants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 根据ID获取商户详情
   */
  async getMerchantById(id: number): Promise<any | null> {
    const sql = `
      SELECT 
        m.*,
        (SELECT COUNT(*) FROM users WHERE merchant_id = m.id AND user_type = 'employee') as employee_count,
        (SELECT COUNT(*) FROM visitor_applications WHERE merchant_id = m.id) as visitor_count
      FROM merchants m 
      WHERE m.id = ?
    `;

    return await this.db.get(sql, [id]);
  }

  /**
   * 根据编码获取商户
   */
  async getMerchantByCode(code: string): Promise<any | null> {
    const sql = 'SELECT * FROM merchants WHERE code = ?';
    return await this.db.get(sql, [code]);
  }

  /**
   * 创建商户
   */
  async createMerchant(data: CreateMerchantData): Promise<any> {
    const {
      name,
      code,
      contact,
      phone,
      email,
      address,
      status = 'active'
    } = data;

    const sql = `
      INSERT INTO merchants (name, code, contact, phone, email, address, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    const result = await this.db.run(sql, [name, code, contact, phone, email, address, status]);
    
    if (!result.lastID) {
      throw new AppError('创建商户失败', 500, ErrorCodes.DATABASE_ERROR);
    }

    return await this.getMerchantById(result.lastID);
  }

  /**
   * 更新商户信息
   */
  async updateMerchant(id: number, data: UpdateMerchantData): Promise<any> {
    const updateFields: string[] = [];
    const params: any[] = [];

    // 动态构建更新字段
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        updateFields.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (updateFields.length === 0) {
      throw new AppError('没有需要更新的字段', 400, ErrorCodes.VALIDATION_ERROR);
    }

    updateFields.push('updated_at = datetime(\'now\')');
    params.push(id);

    const sql = `
      UPDATE merchants 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    const result = await this.db.run(sql, params);

    if (result.changes === 0) {
      throw new AppError('商户不存在或更新失败', 404, ErrorCodes.MERCHANT_NOT_FOUND);
    }

    return await this.getMerchantById(id);
  }

  /**
   * 删除商户
   */
  async deleteMerchant(id: number): Promise<void> {
    const sql = 'DELETE FROM merchants WHERE id = ?';
    const result = await this.db.run(sql, [id]);

    if (result.changes === 0) {
      throw new AppError('商户不存在或删除失败', 404, ErrorCodes.MERCHANT_NOT_FOUND);
    }
  }

  /**
   * 更新商户状态
   */
  async updateMerchantStatus(id: number, status: 'active' | 'inactive'): Promise<any> {
    // 开始事务
    await this.db.run('BEGIN TRANSACTION');

    try {
      // 更新商户状态
      const merchantSql = `
        UPDATE merchants 
        SET status = ?, updated_at = datetime('now')
        WHERE id = ?
      `;
      
      const merchantResult = await this.db.run(merchantSql, [status, id]);

      if (merchantResult.changes === 0) {
        throw new AppError('商户不存在', 404, ErrorCodes.MERCHANT_NOT_FOUND);
      }

      // 如果停用商户，同时停用该商户下所有员工
      if (status === 'inactive') {
        const userSql = `
          UPDATE users 
          SET status = 'inactive', updated_at = datetime('now')
          WHERE merchant_id = ? AND user_type = 'employee'
        `;
        
        await this.db.run(userSql, [id]);
      }

      // 提交事务
      await this.db.run('COMMIT');

      return await this.getMerchantById(id);
    } catch (error) {
      // 回滚事务
      await this.db.run('ROLLBACK');
      throw error;
    }
  }

  /**
   * 检查商户下是否有员工
   */
  async hasEmployees(merchantId: number): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count 
      FROM users 
      WHERE merchant_id = ? AND user_type = 'employee'
    `;
    
    const result = await this.db.get(sql, [merchantId]);
    return (result?.count || 0) > 0;
  }

  /**
   * 获取商户权限
   */
  async getMerchantPermissions(merchantId: number): Promise<any[]> {
    const sql = `
      SELECT p.*, mp.granted_at as assigned_at
      FROM permissions p
      INNER JOIN merchant_permissions mp ON p.code = mp.permission_code
      WHERE mp.merchant_id = ?
      ORDER BY p.resource_type, p.name
    `;

    return await this.db.all(sql, [merchantId]);
  }

  /**
   * 分配权限给商户
   */
  async assignPermissions(merchantId: number, permissionIds: number[]): Promise<void> {
    if (permissionIds.length === 0) {
      return;
    }

    // 开始事务
    await this.db.run('BEGIN TRANSACTION');

    try {
      // 获取权限代码
      const placeholders = permissionIds.map(() => '?').join(',');
      const permissionsSql = `
        SELECT id, code 
        FROM permissions 
        WHERE id IN (${placeholders})
      `;
      
      const permissions = await this.db.all(permissionsSql, permissionIds);
      
      if (permissions.length !== permissionIds.length) {
        throw new AppError('部分权限不存在', 400, ErrorCodes.PERMISSION_NOT_FOUND);
      }

      // 删除现有权限关联
      await this.db.run('DELETE FROM merchant_permissions WHERE merchant_id = ?', [merchantId]);

      // 插入新的权限关联
      const insertSql = `
        INSERT INTO merchant_permissions (merchant_id, permission_code, granted_at)
        VALUES (?, ?, datetime('now'))
      `;

      for (const permission of permissions) {
        await this.db.run(insertSql, [merchantId, permission.code]);
      }

      // 提交事务
      await this.db.run('COMMIT');
    } catch (error) {
      // 回滚事务
      await this.db.run('ROLLBACK');
      throw error;
    }
  }

  /**
   * 移除商户权限
   */
  async removePermissions(merchantId: number, permissionIds: number[]): Promise<void> {
    if (permissionIds.length === 0) {
      return;
    }

    // 获取权限代码
    const placeholders = permissionIds.map(() => '?').join(',');
    const permissionsSql = `
      SELECT code 
      FROM permissions 
      WHERE id IN (${placeholders})
    `;
    
    const permissions = await this.db.all(permissionsSql, permissionIds);
    const permissionCodes = permissions.map(p => p.code);

    if (permissionCodes.length > 0) {
      const codePlaceholders = permissionCodes.map(() => '?').join(',');
      const deleteSql = `
        DELETE FROM merchant_permissions 
        WHERE merchant_id = ? AND permission_code IN (${codePlaceholders})
      `;

      await this.db.run(deleteSql, [merchantId, ...permissionCodes]);
    }
  }

  /**
   * 获取商户统计信息
   */
  async getMerchantStats(merchantId: number): Promise<MerchantStats> {
    // 员工统计
    const employeeSql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive
      FROM users 
      WHERE merchant_id = ? AND user_type = 'employee'
    `;
    
    const employeeStats = await this.db.get(employeeSql, [merchantId]);

    // 访客统计
    const visitorSql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM visitor_applications 
      WHERE merchant_id = ?
    `;
    
    const visitorStats = await this.db.get(visitorSql, [merchantId]);

    // 通行记录统计（最近30天）
    const accessSql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN result = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN result = 'failed' THEN 1 ELSE 0 END) as failed
      FROM access_records ar
      INNER JOIN users u ON ar.user_id = u.id
      WHERE u.merchant_id = ? 
        AND ar.timestamp >= datetime('now', '-30 days')
    `;
    
    const accessStats = await this.db.get(accessSql, [merchantId]);

    return {
      employees: {
        total: employeeStats?.total || 0,
        active: employeeStats?.active || 0,
        inactive: employeeStats?.inactive || 0,
      },
      visitors: {
        total: visitorStats?.total || 0,
        pending: visitorStats?.pending || 0,
        approved: visitorStats?.approved || 0,
        rejected: visitorStats?.rejected || 0,
      },
      access: {
        total: accessStats?.total || 0,
        success: accessStats?.success || 0,
        failed: accessStats?.failed || 0,
      },
    };
  }
}