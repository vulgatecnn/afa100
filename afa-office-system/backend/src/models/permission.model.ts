import database from '../utils/database.js';
import type { Permission, ResourceType, DatabaseResult } from '../types/index.js';

/**
 * 权限数据模型
 * 提供权限相关的数据库操作方法
 */
export class PermissionModel {
  /**
   * 创建新权限
   */
  static async create(permissionData: Omit<Permission, 'id' | 'created_at'>): Promise<Permission> {
    const sql = `
      INSERT INTO permissions (code, name, description, resource_type, resource_id, actions)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      permissionData.code,
      permissionData.name,
      permissionData.description || null,
      permissionData.resource_type,
      permissionData.resource_id,
      permissionData.actions
    ];

    const result = await database.run(sql, params);
    
    if (!result.lastID) {
      throw new Error('创建权限失败');
    }

    // 等待一小段时间确保数据写入完成
    await new Promise(resolve => setTimeout(resolve, 1));
    
    // 使用一致性查询确保能读取到刚创建的数据
    const sql_select = 'SELECT * FROM permissions WHERE id = ?';
    const newPermission = await database.getWithConsistency<Permission>(sql_select, [result.lastID]);
    
    if (!newPermission) {
      throw new Error('创建权限后查询失败');
    }

    return newPermission;
  }

  /**
   * 根据ID查找权限
   */
  static async findById(id: number): Promise<Permission | null> {
    const sql = 'SELECT * FROM permissions WHERE id = ?';
    const permission = await database.get<Permission>(sql, [id]);
    return permission || null;
  }

  /**
   * 根据权限代码查找权限
   */
  static async findByCode(code: string): Promise<Permission | null> {
    const sql = 'SELECT * FROM permissions WHERE code = ?';
    const permission = await database.get<Permission>(sql, [code]);
    return permission || null;
  }

  /**
   * 根据资源类型和资源ID查找权限列表
   */
  static async findByResource(resourceType: ResourceType, resourceId: number): Promise<Permission[]> {
    const sql = 'SELECT * FROM permissions WHERE resource_type = ? AND resource_id = ? ORDER BY code';
    return await database.all<Permission>(sql, [resourceType, resourceId]);
  }

  /**
   * 根据资源类型查找权限列表
   */
  static async findByResourceType(resourceType: ResourceType): Promise<Permission[]> {
    const sql = 'SELECT * FROM permissions WHERE resource_type = ? ORDER BY code';
    return await database.all<Permission>(sql, [resourceType]);
  }

  /**
   * 获取所有权限列表（支持分页和筛选）
   */
  static async findAll(options?: {
    page?: number;
    limit?: number;
    resourceType?: ResourceType;
    resourceId?: number;
    search?: string;
  }): Promise<Permission[]> {
    let sql = 'SELECT * FROM permissions WHERE 1=1';
    const params: any[] = [];

    // 添加筛选条件
    if (options?.resourceType) {
      sql += ' AND resource_type = ?';
      params.push(options.resourceType);
    }

    if (options?.resourceId) {
      sql += ' AND resource_id = ?';
      params.push(options.resourceId);
    }

    if (options?.search) {
      sql += ' AND (name LIKE ? OR code LIKE ? OR description LIKE ?)';
      const searchPattern = `%${options.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // 添加排序
    sql += ' ORDER BY resource_type, resource_id, code';

    // 添加分页
    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);

      if (options?.page && options.page > 1) {
        sql += ' OFFSET ?';
        params.push((options.page - 1) * options.limit);
      }
    }

    return await database.all<Permission>(sql, params);
  }

  /**
   * 更新权限信息
   */
  static async update(id: number, updateData: Partial<Omit<Permission, 'id' | 'created_at'>>): Promise<Permission> {
    const fields: string[] = [];
    const params: any[] = [];

    // 构建动态更新字段
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (fields.length === 0) {
      throw new Error('没有需要更新的字段');
    }

    params.push(id);

    const sql = `UPDATE permissions SET ${fields.join(', ')} WHERE id = ?`;
    const result = await database.run(sql, params);

    if (result.changes === 0) {
      throw new Error('权限不存在或更新失败');
    }

    const updatedPermission = await this.findById(id);
    if (!updatedPermission) {
      throw new Error('更新后查询权限失败');
    }

    return updatedPermission;
  }

  /**
   * 删除权限
   */
  static async delete(id: number): Promise<boolean> {
    const result = await database.run('DELETE FROM permissions WHERE id = ?', [id]);
    return result.changes > 0;
  }

  /**
   * 根据权限代码删除权限
   */
  static async deleteByCode(code: string): Promise<boolean> {
    const result = await database.run('DELETE FROM permissions WHERE code = ?', [code]);
    return result.changes > 0;
  }

  /**
   * 统计权限数量
   */
  static async count(options?: {
    resourceType?: ResourceType;
    resourceId?: number;
    search?: string;
  }): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM permissions WHERE 1=1';
    const params: any[] = [];

    if (options?.resourceType) {
      sql += ' AND resource_type = ?';
      params.push(options.resourceType);
    }

    if (options?.resourceId) {
      sql += ' AND resource_id = ?';
      params.push(options.resourceId);
    }

    if (options?.search) {
      sql += ' AND (name LIKE ? OR code LIKE ? OR description LIKE ?)';
      const searchPattern = `%${options.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const result = await database.get<{ count: number }>(sql, params);
    return result?.count || 0;
  }

  /**
   * 获取权限的操作列表
   */
  static getActions(permission: Permission): string[] {
    try {
      return JSON.parse(permission.actions);
    } catch (error) {
      console.error('解析权限操作失败:', error);
      return [];
    }
  }

  /**
   * 设置权限的操作列表
   */
  static async setActions(id: number, actions: string[]): Promise<Permission> {
    const actionsJson = JSON.stringify(actions);
    return await this.update(id, { actions: actionsJson });
  }

  /**
   * 验证权限数据
   */
  static validatePermissionData(permissionData: Partial<Permission>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证必填字段
    if (!permissionData.code || permissionData.code.trim().length === 0) {
      errors.push('权限代码不能为空');
    } else if (!/^[A-Z0-9_:]{3,50}$/.test(permissionData.code)) {
      errors.push('权限代码格式无效（只能包含大写字母、数字、下划线和冒号，长度3-50位）');
    }

    if (!permissionData.name || permissionData.name.trim().length === 0) {
      errors.push('权限名称不能为空');
    }

    if (!permissionData.resource_type) {
      errors.push('资源类型不能为空');
    } else if (!['project', 'venue', 'floor'].includes(permissionData.resource_type)) {
      errors.push('资源类型无效');
    }

    if (!permissionData.resource_id || permissionData.resource_id <= 0) {
      errors.push('资源ID无效');
    }

    if (!permissionData.actions) {
      errors.push('操作列表不能为空');
    } else {
      try {
        const actions = JSON.parse(permissionData.actions);
        if (!Array.isArray(actions) || actions.length === 0) {
          errors.push('操作列表必须是非空数组');
        }
      } catch (error) {
        errors.push('操作列表格式无效');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 检查权限是否存在
   */
  static async exists(id: number): Promise<boolean> {
    const sql = 'SELECT 1 FROM permissions WHERE id = ?';
    const result = await database.get(sql, [id]);
    return !!result;
  }

  /**
   * 检查权限代码是否已存在
   */
  static async codeExists(code: string, excludeId?: number): Promise<boolean> {
    let sql = 'SELECT 1 FROM permissions WHERE code = ?';
    const params: any[] = [code];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await database.get(sql, params);
    return !!result;
  }

  /**
   * 批量创建权限
   */
  static async batchCreate(permissionsData: Omit<Permission, 'id' | 'created_at'>[]): Promise<Permission[]> {
    const queries = permissionsData.map(permissionData => ({
      sql: `
        INSERT INTO permissions (code, name, description, resource_type, resource_id, actions)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      params: [
        permissionData.code,
        permissionData.name,
        permissionData.description || null,
        permissionData.resource_type,
        permissionData.resource_id,
        permissionData.actions
      ]
    }));

    const results = await database.transaction(queries);
    
    // 查询创建的权限
    const createdPermissions: Permission[] = [];
    for (const result of results) {
      if (result.lastID) {
        const permission = await this.findById(result.lastID);
        if (permission) {
          createdPermissions.push(permission);
        }
      }
    }

    return createdPermissions;
  }

  /**
   * 根据资源删除权限
   */
  static async deleteByResource(resourceType: ResourceType, resourceId: number): Promise<number> {
    const result = await database.run(
      'DELETE FROM permissions WHERE resource_type = ? AND resource_id = ?',
      [resourceType, resourceId]
    );
    return result.changes;
  }

  /**
   * 根据商户ID查找权限
   */
  static async findByMerchantId(merchantId: number): Promise<Permission[]> {
    const sql = `
      SELECT p.* FROM permissions p
      JOIN merchant_permissions mp ON p.code = mp.permission_code
      WHERE mp.merchant_id = ?
      ORDER BY p.resource_type, p.resource_id, p.code
    `;
    return await database.all<Permission>(sql, [merchantId]);
  }

  /**
   * 获取商户权限关联
   */
  static async getMerchantPermissions(merchantId: number): Promise<Permission[]> {
    return await this.findByMerchantId(merchantId);
  }

  /**
   * 为商户分配权限
   */
  static async assignToMerchant(merchantId: number, permissionCode: string, grantedBy?: number): Promise<boolean> {
    const sql = `
      INSERT OR IGNORE INTO merchant_permissions (merchant_id, permission_code, granted_by)
      VALUES (?, ?, ?)
    `;
    const result = await database.run(sql, [merchantId, permissionCode, grantedBy || null]);
    return result.changes > 0;
  }

  /**
   * 撤销商户权限
   */
  static async revokeFromMerchant(merchantId: number, permissionCode: string): Promise<boolean> {
    const sql = 'DELETE FROM merchant_permissions WHERE merchant_id = ? AND permission_code = ?';
    const result = await database.run(sql, [merchantId, permissionCode]);
    return result.changes > 0;
  }

  /**
   * 批量为商户分配权限
   */
  static async batchAssignToMerchant(merchantId: number, permissionCodes: string[], grantedBy?: number): Promise<number> {
    if (permissionCodes.length === 0) {
      return 0;
    }

    const queries = permissionCodes.map(code => ({
      sql: `
        INSERT OR IGNORE INTO merchant_permissions (merchant_id, permission_code, granted_by)
        VALUES (?, ?, ?)
      `,
      params: [merchantId, code, grantedBy || null]
    }));

    const results = await database.transaction(queries);
    return results.reduce((total, result) => total + result.changes, 0);
  }

  /**
   * 检查商户是否拥有指定权限
   */
  static async merchantHasPermission(merchantId: number, permissionCode: string): Promise<boolean> {
    const sql = 'SELECT 1 FROM merchant_permissions WHERE merchant_id = ? AND permission_code = ?';
    const result = await database.get(sql, [merchantId, permissionCode]);
    return !!result;
  }
}