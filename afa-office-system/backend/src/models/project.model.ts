import database from '../utils/database.js';
import type { Project, ProjectStatus, DatabaseResult } from '../types/index.js';

/**
 * 项目数据模型
 * 提供项目相关的数据库操作方法
 */
export class ProjectModel {
  /**
   * 创建新项目
   */
  static async create(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const sql = `
      INSERT INTO projects (code, name, description, status)
      VALUES (?, ?, ?, ?)
    `;
    
    const params = [
      projectData.code,
      projectData.name,
      projectData.description || null,
      projectData.status || 'active'
    ];

    const result = await database.run(sql, params);
    
    if (!result.lastID) {
      throw new Error('创建项目失败');
    }

    // 等待一小段时间确保数据写入完成
    await new Promise(resolve => setTimeout(resolve, 1));
    
    // 使用一致性查询确保能读取到刚创建的数据
    const sql_select = 'SELECT * FROM projects WHERE id = ?';
    const newProject = await database.getWithConsistency<Project>(sql_select, [result.lastID]);
    
    if (!newProject) {
      throw new Error('创建项目后查询失败');
    }

    return newProject;
  }

  /**
   * 根据ID查找项目
   */
  static async findById(id: number): Promise<Project | null> {
    const sql = 'SELECT * FROM projects WHERE id = ?';
    const project = await database.get<Project>(sql, [id]);
    return project || null;
  }

  /**
   * 根据项目编码查找项目
   */
  static async findByCode(code: string): Promise<Project | null> {
    const sql = 'SELECT * FROM projects WHERE code = ?';
    const project = await database.get<Project>(sql, [code]);
    return project || null;
  }

  /**
   * 根据项目名称查找项目
   */
  static async findByName(name: string): Promise<Project[]> {
    const sql = 'SELECT * FROM projects WHERE name LIKE ? ORDER BY created_at DESC';
    return await database.all<Project>(sql, [`%${name}%`]);
  }

  /**
   * 获取所有项目列表（支持分页和筛选）
   */
  static async findAll(options?: {
    page?: number;
    limit?: number;
    status?: ProjectStatus;
    search?: string;
  }): Promise<Project[]> {
    let sql = 'SELECT * FROM projects WHERE 1=1';
    const params: any[] = [];

    // 添加筛选条件
    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    if (options?.search) {
      sql += ' AND (name LIKE ? OR code LIKE ? OR description LIKE ?)';
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

    return await database.all<Project>(sql, params);
  }

  /**
   * 更新项目信息
   */
  static async update(id: number, updateData: Partial<Omit<Project, 'id' | 'created_at'>>): Promise<Project> {
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

    const sql = `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`;
    const result = await database.run(sql, params);

    if (result.changes === 0) {
      throw new Error('项目不存在或更新失败');
    }

    const updatedProject = await this.findById(id);
    if (!updatedProject) {
      throw new Error('更新后查询项目失败');
    }

    return updatedProject;
  }

  /**
   * 删除项目（软删除，设置状态为inactive）
   */
  static async softDelete(id: number): Promise<boolean> {
    const result = await database.run(
      'UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['inactive', id]
    );
    return result.changes > 0;
  }

  /**
   * 物理删除项目
   */
  static async delete(id: number): Promise<boolean> {
    const result = await database.run('DELETE FROM projects WHERE id = ?', [id]);
    return result.changes > 0;
  }

  /**
   * 统计项目数量
   */
  static async count(options?: {
    status?: ProjectStatus;
    search?: string;
  }): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM projects WHERE 1=1';
    const params: any[] = [];

    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
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
   * 获取项目下的场地数量
   */
  static async getVenueCount(projectId: number): Promise<number> {
    const sql = 'SELECT COUNT(*) as count FROM venues WHERE project_id = ? AND status = "active"';
    const result = await database.get<{ count: number }>(sql, [projectId]);
    return result?.count || 0;
  }

  /**
   * 获取项目下的楼层总数
   */
  static async getFloorCount(projectId: number): Promise<number> {
    const sql = `
      SELECT COUNT(*) as count 
      FROM floors f
      JOIN venues v ON f.venue_id = v.id
      WHERE v.project_id = ? AND f.status = 'active' AND v.status = 'active'
    `;
    const result = await database.get<{ count: number }>(sql, [projectId]);
    return result?.count || 0;
  }

  /**
   * 获取项目统计信息
   */
  static async getStatistics(projectId: number): Promise<{
    venueCount: number;
    floorCount: number;
    permissionCount: number;
  }> {
    const [venueCount, floorCount, permissionCount] = await Promise.all([
      this.getVenueCount(projectId),
      this.getFloorCount(projectId),
      this.getPermissionCount(projectId)
    ]);

    return {
      venueCount,
      floorCount,
      permissionCount
    };
  }

  /**
   * 获取项目相关的权限数量
   */
  static async getPermissionCount(projectId: number): Promise<number> {
    const sql = 'SELECT COUNT(*) as count FROM permissions WHERE resource_type = "project" AND resource_id = ?';
    const result = await database.get<{ count: number }>(sql, [projectId]);
    return result?.count || 0;
  }

  /**
   * 验证项目数据
   */
  static validateProjectData(projectData: Partial<Project>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证必填字段
    if (!projectData.name || projectData.name.trim().length === 0) {
      errors.push('项目名称不能为空');
    }

    if (!projectData.code || projectData.code.trim().length === 0) {
      errors.push('项目编码不能为空');
    } else if (!/^[A-Z0-9_]{2,20}$/.test(projectData.code)) {
      errors.push('项目编码格式无效（只能包含大写字母、数字和下划线，长度2-20位）');
    }

    // 验证状态
    if (projectData.status && !['active', 'inactive'].includes(projectData.status)) {
      errors.push('项目状态无效');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 检查项目是否存在
   */
  static async exists(id: number): Promise<boolean> {
    const sql = 'SELECT 1 FROM projects WHERE id = ?';
    const result = await database.get(sql, [id]);
    return !!result;
  }

  /**
   * 检查项目编码是否已存在
   */
  static async codeExists(code: string, excludeId?: number): Promise<boolean> {
    let sql = 'SELECT 1 FROM projects WHERE code = ?';
    const params: any[] = [code];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await database.get(sql, params);
    return !!result;
  }

  /**
   * 获取项目的完整层级结构
   */
  static async getHierarchy(projectId: number): Promise<{
    project: Project;
    venues: Array<{
      venue: any;
      floors: any[];
    }>;
  }> {
    const project = await this.findById(projectId);
    if (!project) {
      throw new Error('项目不存在');
    }

    // 获取项目下的所有场地
    const venuesQuery = `
      SELECT * FROM venues 
      WHERE project_id = ? AND status = 'active'
      ORDER BY code
    `;
    const venues = await database.all(venuesQuery, [projectId]);

    // 获取每个场地下的楼层
    const venuesWithFloors = await Promise.all(
      venues.map(async (venue) => {
        const floorsQuery = `
          SELECT * FROM floors 
          WHERE venue_id = ? AND status = 'active'
          ORDER BY code
        `;
        const floors = await database.all(floorsQuery, [venue.id]);
        return {
          venue,
          floors
        };
      })
    );

    return {
      project,
      venues: venuesWithFloors
    };
  }

  /**
   * 批量更新项目状态
   */
  static async batchUpdateStatus(ids: number[], status: ProjectStatus): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const placeholders = ids.map(() => '?').join(',');
    const sql = `
      UPDATE projects 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id IN (${placeholders})
    `;
    const params = [status, ...ids];

    const result = await database.run(sql, params);
    return result.changes;
  }
}