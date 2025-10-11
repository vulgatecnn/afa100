import database from '../utils/database.js';
import type { Floor, ProjectStatus, DatabaseResult } from '../types/index.js';

/**
 * 楼层数据模型
 * 提供楼层相关的数据库操作方法
 */
export class FloorModel {
  /**
   * 创建新楼层
   */
  static async create(floorData: Omit<Floor, 'id' | 'created_at' | 'updated_at'>): Promise<Floor> {
    const sql = `
      INSERT INTO floors (venue_id, code, name, description, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const params = [
      floorData.venue_id,
      floorData.code,
      floorData.name,
      floorData.description || null,
      floorData.status || 'active'
    ];

    const result = await database.run(sql, params);
    
    if (!result.lastID) {
      throw new Error('创建楼层失败');
    }

    // 等待一小段时间确保数据写入完成
    await new Promise(resolve => setTimeout(resolve, 1));
    
    // 使用一致性查询确保能读取到刚创建的数据
    const sql_select = 'SELECT * FROM floors WHERE id = ?';
    const newFloor = await database.getWithConsistency<Floor>(sql_select, [result.lastID]);
    
    if (!newFloor) {
      throw new Error('创建楼层后查询失败');
    }

    return newFloor;
  }

  /**
   * 根据ID查找楼层
   */
  static async findById(id: number): Promise<Floor | null> {
    const sql = 'SELECT * FROM floors WHERE id = ?';
    const floor = await database.get<Floor>(sql, [id]);
    return floor || null;
  }

  /**
   * 根据场地ID查找楼层列表
   */
  static async findByVenueId(venueId: number): Promise<Floor[]> {
    const sql = 'SELECT * FROM floors WHERE venue_id = ? ORDER BY code';
    return await database.all<Floor>(sql, [venueId]);
  }

  /**
   * 根据楼层编码查找楼层（在指定场地内）
   */
  static async findByCode(venueId: number, code: string): Promise<Floor | null> {
    const sql = 'SELECT * FROM floors WHERE venue_id = ? AND code = ?';
    const floor = await database.get<Floor>(sql, [venueId, code]);
    return floor || null;
  }

  /**
   * 根据楼层名称查找楼层
   */
  static async findByName(name: string, venueId?: number): Promise<Floor[]> {
    let sql = 'SELECT * FROM floors WHERE name LIKE ?';
    const params: any[] = [`%${name}%`];

    if (venueId) {
      sql += ' AND venue_id = ?';
      params.push(venueId);
    }

    sql += ' ORDER BY created_at DESC';
    return await database.all<Floor>(sql, params);
  }

  /**
   * 根据项目ID查找所有楼层
   */
  static async findByProjectId(projectId: number): Promise<Floor[]> {
    const sql = `
      SELECT f.* FROM floors f
      JOIN venues v ON f.venue_id = v.id
      WHERE v.project_id = ? AND f.status = 'active' AND v.status = 'active'
      ORDER BY v.code, f.code
    `;
    return await database.all<Floor>(sql, [projectId]);
  }

  /**
   * 获取所有楼层列表（支持分页和筛选）
   */
  static async findAll(options?: {
    page?: number;
    limit?: number;
    status?: ProjectStatus;
    venueId?: number;
    projectId?: number;
    search?: string;
  }): Promise<Floor[]> {
    let sql = 'SELECT f.* FROM floors f';
    const params: any[] = [];
    const conditions: string[] = [];

    // 如果需要按项目筛选，需要JOIN venues表
    if (options?.projectId) {
      sql += ' JOIN venues v ON f.venue_id = v.id';
      conditions.push('v.project_id = ?');
      params.push(options.projectId);
    }

    // 添加筛选条件
    if (options?.status) {
      conditions.push('f.status = ?');
      params.push(options.status);
    }

    if (options?.venueId) {
      conditions.push('f.venue_id = ?');
      params.push(options.venueId);
    }

    if (options?.search) {
      conditions.push('(f.name LIKE ? OR f.code LIKE ? OR f.description LIKE ?)');
      const searchPattern = `%${options.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // 添加WHERE子句
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // 添加排序
    if (options?.projectId) {
      sql += ' ORDER BY v.code, f.code';
    } else {
      sql += ' ORDER BY f.venue_id, f.code';
    }

    // 添加分页
    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);

      if (options?.page && options.page > 1) {
        sql += ' OFFSET ?';
        params.push((options.page - 1) * options.limit);
      }
    }

    return await database.all<Floor>(sql, params);
  }

  /**
   * 更新楼层信息
   */
  static async update(id: number, updateData: Partial<Omit<Floor, 'id' | 'created_at'>>): Promise<Floor> {
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

    const sql = `UPDATE floors SET ${fields.join(', ')} WHERE id = ?`;
    const result = await database.run(sql, params);

    if (result.changes === 0) {
      throw new Error('楼层不存在或更新失败');
    }

    const updatedFloor = await this.findById(id);
    if (!updatedFloor) {
      throw new Error('更新后查询楼层失败');
    }

    return updatedFloor;
  }

  /**
   * 删除楼层（软删除，设置状态为inactive）
   */
  static async softDelete(id: number): Promise<boolean> {
    const result = await database.run(
      'UPDATE floors SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['inactive', id]
    );
    return result.changes > 0;
  }

  /**
   * 物理删除楼层
   */
  static async delete(id: number): Promise<boolean> {
    const result = await database.run('DELETE FROM floors WHERE id = ?', [id]);
    return result.changes > 0;
  }

  /**
   * 统计楼层数量
   */
  static async count(options?: {
    status?: ProjectStatus;
    venueId?: number;
    projectId?: number;
    search?: string;
  }): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM floors f';
    const params: any[] = [];
    const conditions: string[] = [];

    // 如果需要按项目筛选，需要JOIN venues表
    if (options?.projectId) {
      sql += ' JOIN venues v ON f.venue_id = v.id';
      conditions.push('v.project_id = ?');
      params.push(options.projectId);
    }

    if (options?.status) {
      conditions.push('f.status = ?');
      params.push(options.status);
    }

    if (options?.venueId) {
      conditions.push('f.venue_id = ?');
      params.push(options.venueId);
    }

    if (options?.search) {
      conditions.push('(f.name LIKE ? OR f.code LIKE ? OR f.description LIKE ?)');
      const searchPattern = `%${options.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // 添加WHERE子句
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await database.get<{ count: number }>(sql, params);
    return result?.count || 0;
  }

  /**
   * 获取楼层相关的权限数量
   */
  static async getPermissionCount(floorId: number): Promise<number> {
    const sql = 'SELECT COUNT(*) as count FROM permissions WHERE resource_type = "floor" AND resource_id = ?';
    const result = await database.get<{ count: number }>(sql, [floorId]);
    return result?.count || 0;
  }

  /**
   * 验证楼层数据
   */
  static validateFloorData(floorData: Partial<Floor>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证必填字段
    if (!floorData.name || floorData.name.trim().length === 0) {
      errors.push('楼层名称不能为空');
    }

    if (!floorData.code || floorData.code.trim().length === 0) {
      errors.push('楼层编码不能为空');
    } else if (!/^[A-Z0-9_-]{1,10}$/.test(floorData.code)) {
      errors.push('楼层编码格式无效（只能包含大写字母、数字、下划线和连字符，长度1-10位）');
    }

    if (!floorData.venue_id || floorData.venue_id <= 0) {
      errors.push('场地ID无效');
    }

    // 验证状态
    if (floorData.status && !['active', 'inactive'].includes(floorData.status)) {
      errors.push('楼层状态无效');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 检查楼层是否存在
   */
  static async exists(id: number): Promise<boolean> {
    const sql = 'SELECT 1 FROM floors WHERE id = ?';
    const result = await database.get(sql, [id]);
    return !!result;
  }

  /**
   * 检查楼层编码是否已存在（在指定场地内）
   */
  static async codeExists(venueId: number, code: string, excludeId?: number): Promise<boolean> {
    let sql = 'SELECT 1 FROM floors WHERE venue_id = ? AND code = ?';
    const params: any[] = [venueId, code];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await database.get(sql, params);
    return !!result;
  }

  /**
   * 获取楼层的完整信息（包含场地和项目信息）
   */
  static async getFullInfo(floorId: number): Promise<{
    floor: Floor;
    venue: any;
    project: any;
  } | null> {
    const floor = await this.findById(floorId);
    if (!floor) {
      return null;
    }

    // 获取场地信息
    const venueQuery = 'SELECT * FROM venues WHERE id = ?';
    const venue = await database.get(venueQuery, [floor.venue_id]);

    if (!venue) {
      return null;
    }

    // 获取项目信息
    const projectQuery = 'SELECT * FROM projects WHERE id = ?';
    const project = await database.get(projectQuery, [venue.project_id]);

    return {
      floor,
      venue,
      project
    };
  }

  /**
   * 批量更新楼层状态
   */
  static async batchUpdateStatus(ids: number[], status: ProjectStatus): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const placeholders = ids.map(() => '?').join(',');
    const sql = `
      UPDATE floors 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id IN (${placeholders})
    `;
    const params = [status, ...ids];

    const result = await database.run(sql, params);
    return result.changes;
  }

  /**
   * 根据场地批量删除楼层
   */
  static async deleteByVenueId(venueId: number): Promise<number> {
    const result = await database.run('DELETE FROM floors WHERE venue_id = ?', [venueId]);
    return result.changes;
  }

  /**
   * 根据项目批量删除楼层
   */
  static async deleteByProjectId(projectId: number): Promise<number> {
    const sql = `
      DELETE FROM floors 
      WHERE venue_id IN (
        SELECT id FROM venues WHERE project_id = ?
      )
    `;
    const result = await database.run(sql, [projectId]);
    return result.changes;
  }
}