import database from '../utils/database.js';
import type { Venue, ProjectStatus, DatabaseResult } from '../types/index.js';

/**
 * 场地数据模型
 * 提供场地相关的数据库操作方法
 */
export class VenueModel {
  /**
   * 创建新场地
   */
  static async create(venueData: Omit<Venue, 'id' | 'created_at' | 'updated_at'>): Promise<Venue> {
    const sql = `
      INSERT INTO venues (project_id, code, name, description, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const params = [
      venueData.project_id,
      venueData.code,
      venueData.name,
      venueData.description || null,
      venueData.status || 'active'
    ];

    const result = await database.run(sql, params);
    
    if (!result.lastID) {
      throw new Error('创建场地失败');
    }

    // 等待一小段时间确保数据写入完成
    await new Promise(resolve => setTimeout(resolve, 1));
    
    // 使用一致性查询确保能读取到刚创建的数据
    const sql_select = 'SELECT * FROM venues WHERE id = ?';
    const newVenue = await database.getWithConsistency<Venue>(sql_select, [result.lastID]);
    
    if (!newVenue) {
      throw new Error('创建场地后查询失败');
    }

    return newVenue;
  }

  /**
   * 根据ID查找场地
   */
  static async findById(id: number): Promise<Venue | null> {
    const sql = 'SELECT * FROM venues WHERE id = ?';
    const venue = await database.get<Venue>(sql, [id]);
    return venue || null;
  }

  /**
   * 根据项目ID查找场地列表
   */
  static async findByProjectId(projectId: number): Promise<Venue[]> {
    const sql = 'SELECT * FROM venues WHERE project_id = ? ORDER BY code';
    return await database.all<Venue>(sql, [projectId]);
  }

  /**
   * 根据场地编码查找场地（在指定项目内）
   */
  static async findByCode(projectId: number, code: string): Promise<Venue | null> {
    const sql = 'SELECT * FROM venues WHERE project_id = ? AND code = ?';
    const venue = await database.get<Venue>(sql, [projectId, code]);
    return venue || null;
  }

  /**
   * 根据场地名称查找场地
   */
  static async findByName(name: string, projectId?: number): Promise<Venue[]> {
    let sql = 'SELECT * FROM venues WHERE name LIKE ?';
    const params: any[] = [`%${name}%`];

    if (projectId) {
      sql += ' AND project_id = ?';
      params.push(projectId);
    }

    sql += ' ORDER BY created_at DESC';
    return await database.all<Venue>(sql, params);
  }

  /**
   * 获取所有场地列表（支持分页和筛选）
   */
  static async findAll(options?: {
    page?: number;
    limit?: number;
    status?: ProjectStatus;
    projectId?: number;
    search?: string;
  }): Promise<Venue[]> {
    let sql = 'SELECT * FROM venues WHERE 1=1';
    const params: any[] = [];

    // 添加筛选条件
    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    if (options?.projectId) {
      sql += ' AND project_id = ?';
      params.push(options.projectId);
    }

    if (options?.search) {
      sql += ' AND (name LIKE ? OR code LIKE ? OR description LIKE ?)';
      const searchPattern = `%${options.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // 添加排序
    sql += ' ORDER BY project_id, code';

    // 添加分页
    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);

      if (options?.page && options.page > 1) {
        sql += ' OFFSET ?';
        params.push((options.page - 1) * options.limit);
      }
    }

    return await database.all<Venue>(sql, params);
  }

  /**
   * 更新场地信息
   */
  static async update(id: number, updateData: Partial<Omit<Venue, 'id' | 'created_at'>>): Promise<Venue> {
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

    const sql = `UPDATE venues SET ${fields.join(', ')} WHERE id = ?`;
    const result = await database.run(sql, params);

    if (result.changes === 0) {
      throw new Error('场地不存在或更新失败');
    }

    const updatedVenue = await this.findById(id);
    if (!updatedVenue) {
      throw new Error('更新后查询场地失败');
    }

    return updatedVenue;
  }

  /**
   * 删除场地（软删除，设置状态为inactive）
   */
  static async softDelete(id: number): Promise<boolean> {
    const result = await database.run(
      'UPDATE venues SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['inactive', id]
    );
    return result.changes > 0;
  }

  /**
   * 物理删除场地
   */
  static async delete(id: number): Promise<boolean> {
    const result = await database.run('DELETE FROM venues WHERE id = ?', [id]);
    return result.changes > 0;
  }

  /**
   * 统计场地数量
   */
  static async count(options?: {
    status?: ProjectStatus;
    projectId?: number;
    search?: string;
  }): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM venues WHERE 1=1';
    const params: any[] = [];

    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    if (options?.projectId) {
      sql += ' AND project_id = ?';
      params.push(options.projectId);
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
   * 获取场地下的楼层数量
   */
  static async getFloorCount(venueId: number): Promise<number> {
    const sql = 'SELECT COUNT(*) as count FROM floors WHERE venue_id = ? AND status = "active"';
    const result = await database.get<{ count: number }>(sql, [venueId]);
    return result?.count || 0;
  }

  /**
   * 获取场地相关的权限数量
   */
  static async getPermissionCount(venueId: number): Promise<number> {
    const sql = 'SELECT COUNT(*) as count FROM permissions WHERE resource_type = "venue" AND resource_id = ?';
    const result = await database.get<{ count: number }>(sql, [venueId]);
    return result?.count || 0;
  }

  /**
   * 获取场地统计信息
   */
  static async getStatistics(venueId: number): Promise<{
    floorCount: number;
    permissionCount: number;
  }> {
    const [floorCount, permissionCount] = await Promise.all([
      this.getFloorCount(venueId),
      this.getPermissionCount(venueId)
    ]);

    return {
      floorCount,
      permissionCount
    };
  }

  /**
   * 验证场地数据
   */
  static validateVenueData(venueData: Partial<Venue>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证必填字段
    if (!venueData.name || venueData.name.trim().length === 0) {
      errors.push('场地名称不能为空');
    }

    if (!venueData.code || venueData.code.trim().length === 0) {
      errors.push('场地编码不能为空');
    } else if (!/^[A-Z0-9_]{1,10}$/.test(venueData.code)) {
      errors.push('场地编码格式无效（只能包含大写字母、数字和下划线，长度1-10位）');
    }

    if (!venueData.project_id || venueData.project_id <= 0) {
      errors.push('项目ID无效');
    }

    // 验证状态
    if (venueData.status && !['active', 'inactive'].includes(venueData.status)) {
      errors.push('场地状态无效');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 检查场地是否存在
   */
  static async exists(id: number): Promise<boolean> {
    const sql = 'SELECT 1 FROM venues WHERE id = ?';
    const result = await database.get(sql, [id]);
    return !!result;
  }

  /**
   * 检查场地编码是否已存在（在指定项目内）
   */
  static async codeExists(projectId: number, code: string, excludeId?: number): Promise<boolean> {
    let sql = 'SELECT 1 FROM venues WHERE project_id = ? AND code = ?';
    const params: any[] = [projectId, code];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await database.get(sql, params);
    return !!result;
  }

  /**
   * 获取场地的楼层列表
   */
  static async getFloors(venueId: number): Promise<any[]> {
    const sql = `
      SELECT * FROM floors 
      WHERE venue_id = ? AND status = 'active'
      ORDER BY code
    `;
    return await database.all(sql, [venueId]);
  }

  /**
   * 获取场地的完整信息（包含项目信息和楼层列表）
   */
  static async getFullInfo(venueId: number): Promise<{
    venue: Venue;
    project: any;
    floors: any[];
  } | null> {
    const venue = await this.findById(venueId);
    if (!venue) {
      return null;
    }

    // 获取项目信息
    const projectQuery = 'SELECT * FROM projects WHERE id = ?';
    const project = await database.get(projectQuery, [venue.project_id]);

    // 获取楼层列表
    const floors = await this.getFloors(venueId);

    return {
      venue,
      project,
      floors
    };
  }

  /**
   * 批量更新场地状态
   */
  static async batchUpdateStatus(ids: number[], status: ProjectStatus): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const placeholders = ids.map(() => '?').join(',');
    const sql = `
      UPDATE venues 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id IN (${placeholders})
    `;
    const params = [status, ...ids];

    const result = await database.run(sql, params);
    return result.changes;
  }

  /**
   * 根据项目批量删除场地
   */
  static async deleteByProjectId(projectId: number): Promise<number> {
    const result = await database.run('DELETE FROM venues WHERE project_id = ?', [projectId]);
    return result.changes;
  }
}