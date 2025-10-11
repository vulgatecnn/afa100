import { Database } from '../utils/database.js';
import { Project } from '../models/project.model.js';
import { Venue } from '../models/venue.model.js';
import { Floor } from '../models/floor.model.js';
import { AppError, ErrorCodes } from '../middleware/error.middleware.js';
import type { 
  CreateProjectData, 
  CreateVenueData, 
  CreateFloorData,
  UpdateProjectData,
  UpdateVenueData,
  UpdateFloorData,
  SpaceListQuery,
  PaginatedResult,
  SpaceHierarchy
} from '../types/index.js';

/**
 * 空间管理服务
 * 处理项目、场地、楼层的层级管理和权限关联
 */
export class SpaceService {
  private db: Database;
  constructor() {
    this.db = Database.getInstance();
  }

  // ==================== 项目管理 ====================

  /**
   * 获取项目列表（分页）
   */
  async getProjects(query: SpaceListQuery): Promise<PaginatedResult<any>> {
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
      conditions.push('(name LIKE ? OR code LIKE ? OR description LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // 获取总数
    const countSql = `
      SELECT COUNT(*) as total 
      FROM projects 
      ${whereClause}
    `;
    
    const countResult = await this.db.get(countSql, params);
    const total = countResult?.total || 0;

    // 获取数据
    const dataSql = `
      SELECT 
        p.*,
        (SELECT COUNT(*) FROM venues WHERE project_id = p.id) as venue_count
      FROM projects p
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const projects = await this.db.all(dataSql, [...params, limit, offset]);

    return {
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 根据ID获取项目详情
   */
  async getProjectById(id: number): Promise<any | null> {
    const sql = `
      SELECT 
        p.*,
        (SELECT COUNT(*) FROM venues WHERE project_id = p.id) as venue_count,
        (SELECT COUNT(*) FROM floors f 
         INNER JOIN venues v ON f.venue_id = v.id 
         WHERE v.project_id = p.id) as floor_count
      FROM projects p 
      WHERE p.id = ?
    `;

    return await this.db.get(sql, [id]);
  }

  /**
   * 根据编码获取项目
   */
  async getProjectByCode(code: string): Promise<any | null> {
    const sql = 'SELECT * FROM projects WHERE code = ?';
    return await this.db.get(sql, [code]);
  }

  /**
   * 创建项目
   */
  async createProject(data: CreateProjectData): Promise<any> {
    const {
      name,
      code,
      description,
      status = 'active'
    } = data;

    const sql = `
      INSERT INTO projects (name, code, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    const result = await this.db.run(sql, [name, code, description, status]);
    
    if (!result.lastID) {
      throw new AppError('创建项目失败', 500, ErrorCodes.DATABASE_ERROR);
    }

    return await this.getProjectById(result.lastID);
  }

  /**
   * 更新项目信息
   */
  async updateProject(id: number, data: UpdateProjectData): Promise<any> {
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
      UPDATE projects 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    const result = await this.db.run(sql, params);

    if (result.changes === 0) {
      throw new AppError('项目不存在或更新失败', 404, ErrorCodes.PROJECT_NOT_FOUND);
    }

    return await this.getProjectById(id);
  }

  /**
   * 删除项目
   */
  async deleteProject(id: number): Promise<void> {
    const sql = 'DELETE FROM projects WHERE id = ?';
    const result = await this.db.run(sql, [id]);

    if (result.changes === 0) {
      throw new AppError('项目不存在或删除失败', 404, ErrorCodes.PROJECT_NOT_FOUND);
    }
  }

  /**
   * 检查项目下是否有场地
   */
  async projectHasVenues(projectId: number): Promise<boolean> {
    const sql = 'SELECT COUNT(*) as count FROM venues WHERE project_id = ?';
    const result = await this.db.get(sql, [projectId]);
    return (result?.count || 0) > 0;
  }

  // ==================== 场地管理 ====================

  /**
   * 获取场地列表（分页）
   */
  async getVenues(query: SpaceListQuery & { projectId?: number }): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 10, projectId, status, search } = query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: any[] = [];

    // 构建查询条件
    const conditions: string[] = [];
    
    if (projectId) {
      conditions.push('v.project_id = ?');
      params.push(projectId);
    }

    if (status) {
      conditions.push('v.status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(v.name LIKE ? OR v.code LIKE ? OR v.description LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // 获取总数
    const countSql = `
      SELECT COUNT(*) as total 
      FROM venues v
      ${whereClause}
    `;
    
    const countResult = await this.db.get(countSql, params);
    const total = countResult?.total || 0;

    // 获取数据
    const dataSql = `
      SELECT 
        v.*,
        p.name as project_name,
        p.code as project_code,
        (SELECT COUNT(*) FROM floors WHERE venue_id = v.id) as floor_count
      FROM venues v
      INNER JOIN projects p ON v.project_id = p.id
      ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const venues = await this.db.all(dataSql, [...params, limit, offset]);

    return {
      data: venues,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 根据ID获取场地详情
   */
  async getVenueById(id: number): Promise<any | null> {
    const sql = `
      SELECT 
        v.*,
        p.name as project_name,
        p.code as project_code,
        (SELECT COUNT(*) FROM floors WHERE venue_id = v.id) as floor_count
      FROM venues v
      INNER JOIN projects p ON v.project_id = p.id
      WHERE v.id = ?
    `;

    return await this.db.get(sql, [id]);
  }

  /**
   * 根据编码获取场地（在项目内）
   */
  async getVenueByCode(projectId: number, code: string): Promise<any | null> {
    const sql = 'SELECT * FROM venues WHERE project_id = ? AND code = ?';
    return await this.db.get(sql, [projectId, code]);
  }

  /**
   * 创建场地
   */
  async createVenue(data: CreateVenueData): Promise<any> {
    const {
      project_id,
      name,
      code,
      description,
      status = 'active'
    } = data;

    const sql = `
      INSERT INTO venues (project_id, name, code, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    const result = await this.db.run(sql, [project_id, name, code, description, status]);
    
    if (!result.lastID) {
      throw new AppError('创建场地失败', 500, ErrorCodes.DATABASE_ERROR);
    }

    return await this.getVenueById(result.lastID);
  }

  /**
   * 更新场地信息
   */
  async updateVenue(id: number, data: UpdateVenueData): Promise<any> {
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
      UPDATE venues 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    const result = await this.db.run(sql, params);

    if (result.changes === 0) {
      throw new AppError('场地不存在或更新失败', 404, ErrorCodes.VENUE_NOT_FOUND);
    }

    return await this.getVenueById(id);
  }

  /**
   * 删除场地
   */
  async deleteVenue(id: number): Promise<void> {
    const sql = 'DELETE FROM venues WHERE id = ?';
    const result = await this.db.run(sql, [id]);

    if (result.changes === 0) {
      throw new AppError('场地不存在或删除失败', 404, ErrorCodes.VENUE_NOT_FOUND);
    }
  }

  /**
   * 检查场地下是否有楼层
   */
  async venueHasFloors(venueId: number): Promise<boolean> {
    const sql = 'SELECT COUNT(*) as count FROM floors WHERE venue_id = ?';
    const result = await this.db.get(sql, [venueId]);
    return (result?.count || 0) > 0;
  }

  // ==================== 楼层管理 ====================

  /**
   * 获取楼层列表（分页）
   */
  async getFloors(query: SpaceListQuery & { venueId?: number }): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 10, venueId, status, search } = query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: any[] = [];

    // 构建查询条件
    const conditions: string[] = [];
    
    if (venueId) {
      conditions.push('f.venue_id = ?');
      params.push(venueId);
    }

    if (status) {
      conditions.push('f.status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(f.name LIKE ? OR f.code LIKE ? OR f.description LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // 获取总数
    const countSql = `
      SELECT COUNT(*) as total 
      FROM floors f
      ${whereClause}
    `;
    
    const countResult = await this.db.get(countSql, params);
    const total = countResult?.total || 0;

    // 获取数据
    const dataSql = `
      SELECT 
        f.*,
        v.name as venue_name,
        v.code as venue_code,
        p.name as project_name,
        p.code as project_code
      FROM floors f
      INNER JOIN venues v ON f.venue_id = v.id
      INNER JOIN projects p ON v.project_id = p.id
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const floors = await this.db.all(dataSql, [...params, limit, offset]);

    return {
      data: floors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 根据ID获取楼层详情
   */
  async getFloorById(id: number): Promise<any | null> {
    const sql = `
      SELECT 
        f.*,
        v.name as venue_name,
        v.code as venue_code,
        p.name as project_name,
        p.code as project_code
      FROM floors f
      INNER JOIN venues v ON f.venue_id = v.id
      INNER JOIN projects p ON v.project_id = p.id
      WHERE f.id = ?
    `;

    return await this.db.get(sql, [id]);
  }

  /**
   * 根据编码获取楼层（在场地内）
   */
  async getFloorByCode(venueId: number, code: string): Promise<any | null> {
    const sql = 'SELECT * FROM floors WHERE venue_id = ? AND code = ?';
    return await this.db.get(sql, [venueId, code]);
  }

  /**
   * 创建楼层
   */
  async createFloor(data: CreateFloorData): Promise<any> {
    const {
      venue_id,
      name,
      code,
      description,
      status = 'active'
    } = data;

    const sql = `
      INSERT INTO floors (venue_id, name, code, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    const result = await this.db.run(sql, [venue_id, name, code, description, status]);
    
    if (!result.lastID) {
      throw new AppError('创建楼层失败', 500, ErrorCodes.DATABASE_ERROR);
    }

    return await this.getFloorById(result.lastID);
  }

  /**
   * 更新楼层信息
   */
  async updateFloor(id: number, data: UpdateFloorData): Promise<any> {
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
      UPDATE floors 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    const result = await this.db.run(sql, params);

    if (result.changes === 0) {
      throw new AppError('楼层不存在或更新失败', 404, ErrorCodes.FLOOR_NOT_FOUND);
    }

    return await this.getFloorById(id);
  }

  /**
   * 删除楼层
   */
  async deleteFloor(id: number): Promise<void> {
    const sql = 'DELETE FROM floors WHERE id = ?';
    const result = await this.db.run(sql, [id]);

    if (result.changes === 0) {
      throw new AppError('楼层不存在或删除失败', 404, ErrorCodes.FLOOR_NOT_FOUND);
    }
  }

  // ==================== 层级结构查询 ====================

  /**
   * 获取完整的空间层级结构
   */
  async getSpaceHierarchy(projectId?: number): Promise<SpaceHierarchy[]> {
    let whereClause = '';
    const params: any[] = [];

    if (projectId) {
      whereClause = 'WHERE p.id = ?';
      params.push(projectId);
    }

    const sql = `
      SELECT 
        p.id as project_id,
        p.code as project_code,
        p.name as project_name,
        p.status as project_status,
        v.id as venue_id,
        v.code as venue_code,
        v.name as venue_name,
        v.status as venue_status,
        f.id as floor_id,
        f.code as floor_code,
        f.name as floor_name,
        f.status as floor_status
      FROM projects p
      LEFT JOIN venues v ON p.id = v.project_id
      LEFT JOIN floors f ON v.id = f.venue_id
      ${whereClause}
      ORDER BY p.name, v.name, f.name
    `;

    const rows = await this.db.all(sql, params);

    // 构建层级结构
    const projectMap = new Map<number, SpaceHierarchy>();

    rows.forEach(row => {
      // 处理项目
      if (!projectMap.has(row.project_id)) {
        projectMap.set(row.project_id, {
          id: row.project_id,
          code: row.project_code,
          name: row.project_name,
          status: row.project_status,
          type: 'project',
          venues: [],
        });
      }

      const project = projectMap.get(row.project_id)!;

      // 处理场地
      if (row.venue_id) {
        let venue = project.venues?.find(v => v.id === row.venue_id);
        if (!venue) {
          venue = {
            id: row.venue_id,
            code: row.venue_code,
            name: row.venue_name,
            status: row.venue_status,
            type: 'venue',
            floors: [],
          };
          project.venues?.push(venue);
        }

        // 处理楼层
        if (row.floor_id) {
          const floor = {
            id: row.floor_id,
            code: row.floor_code,
            name: row.floor_name,
            status: row.floor_status,
            type: 'floor' as const,
          };
          venue.floors?.push(floor);
        }
      }
    });

    return Array.from(projectMap.values());
  }

  /**
   * 获取商户权限关联的空间
   */
  async getMerchantSpaces(merchantId: number): Promise<any[]> {
    const sql = `
      SELECT DISTINCT
        p.id as resource_id,
        p.code as resource_code,
        p.name as resource_name,
        'project' as resource_type,
        perm.code as permission_code,
        perm.name as permission_name,
        perm.actions
      FROM merchant_permissions mp
      INNER JOIN permissions perm ON mp.permission_code = perm.code
      INNER JOIN projects p ON perm.resource_id = p.id AND perm.resource_type = 'project'
      WHERE mp.merchant_id = ?
      
      UNION ALL
      
      SELECT DISTINCT
        v.id as resource_id,
        v.code as resource_code,
        v.name as resource_name,
        'venue' as resource_type,
        perm.code as permission_code,
        perm.name as permission_name,
        perm.actions
      FROM merchant_permissions mp
      INNER JOIN permissions perm ON mp.permission_code = perm.code
      INNER JOIN venues v ON perm.resource_id = v.id AND perm.resource_type = 'venue'
      WHERE mp.merchant_id = ?
      
      UNION ALL
      
      SELECT DISTINCT
        f.id as resource_id,
        f.code as resource_code,
        f.name as resource_name,
        'floor' as resource_type,
        perm.code as permission_code,
        perm.name as permission_name,
        perm.actions
      FROM merchant_permissions mp
      INNER JOIN permissions perm ON mp.permission_code = perm.code
      INNER JOIN floors f ON perm.resource_id = f.id AND perm.resource_type = 'floor'
      WHERE mp.merchant_id = ?
      
      ORDER BY resource_type, resource_name
    `;

    return await this.db.all(sql, [merchantId, merchantId, merchantId]);
  }
}