import database from '../utils/database.js';
import type { 
  AccessRecord, 
  AccessDirection, 
  AccessResult, 
  AccessMethod,
  DeviceType,
  DeviceInfo,
  AccessContext,
  PaginatedResult,
  CreateAccessRecordData
} from '../types/index.js';

/**
 * 通行记录查询接口
 */
export interface AccessRecordQuery {
  page?: number;
  limit?: number;
  userId?: number;
  deviceId?: string;
  direction?: AccessDirection;
  result?: AccessResult;
  projectId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 通行记录查询参数接口
 */
export interface AccessRecordQuery {
  page?: number;
  limit?: number;
  userId?: number;
  deviceId?: string;
  result?: AccessResult;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 通行记录模型类
 * 处理通行记录相关的数据库操作
 */
export class AccessRecordModel {
  /**
   * 创建通行记录
   */
  static async create(data: CreateAccessRecordData): Promise<AccessRecord> {
    const sql = `
      INSERT INTO access_records (
        user_id, passcode_id, device_id, device_type, device_info, direction, 
        result, access_method, fail_reason, project_id, venue_id, floor_id, 
        context, timestamp, verification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const deviceInfoJson = data.device_info ? JSON.stringify(data.device_info) : null;
    const contextJson = data.context ? JSON.stringify(data.context) : null;
    const verificationJson = data.verification ? JSON.stringify(data.verification) : null;

    const result = await database.run(sql, [
      data.user_id,
      data.passcode_id || null,
      data.device_id,
      data.device_type || null,
      deviceInfoJson,
      data.direction,
      data.result,
      data.access_method || null,
      data.fail_reason || null,
      data.project_id || null,
      data.venue_id || null,
      data.floor_id || null,
      contextJson,
      data.timestamp,
      verificationJson
    ]);

    if (!result.lastID) {
      throw new Error('创建通行记录失败');
    }

    // 等待一小段时间确保数据写入完成
    await new Promise(resolve => setTimeout(resolve, 1));
    
    // 使用一致性查询确保能读取到刚创建的数据
    const sql_select = 'SELECT * FROM access_records WHERE id = ?';
    const newRecord = await database.getWithConsistency<AccessRecord>(sql_select, [result.lastID]);
    
    if (!newRecord) {
      throw new Error('创建通行记录后查询失败');
    }

    return newRecord;
  }

  /**
   * 根据ID查找通行记录
   */
  static async findById(id: number): Promise<AccessRecord | null> {
    const sql = 'SELECT * FROM access_records WHERE id = ?';
    const record = await database.get<AccessRecord>(sql, [id]);
    return record || null;
  }

  /**
   * 查找所有通行记录（支持分页和筛选）
   */
  static async findAll(query: AccessRecordQuery): Promise<AccessRecord[]> {
    const { 
      page, 
      limit = 10, 
      userId, 
      deviceId, 
      direction,
      result, 
      projectId,
      startDate, 
      endDate, 
      search,
      sortBy = 'timestamp', 
      sortOrder = 'desc' 
    } = query;

    let sql = 'SELECT * FROM access_records WHERE 1=1';
    const params: any[] = [];

    if (userId) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }
    if (deviceId) {
      sql += ' AND device_id = ?';
      params.push(deviceId);
    }
    if (direction) {
      sql += ' AND direction = ?';
      params.push(direction);
    }
    if (result) {
      sql += ' AND result = ?';
      params.push(result);
    }
    if (projectId) {
      sql += ' AND project_id = ?';
      params.push(projectId);
    }
    if (startDate) {
      sql += ' AND timestamp >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND timestamp <= ?';
      params.push(endDate);
    }
    if (search) {
      sql += ' AND (device_id LIKE ? OR fail_reason LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // 添加排序
    sql += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

    // 添加分页
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);

      if (page && page > 1) {
        sql += ' OFFSET ?';
        params.push((page - 1) * limit);
      }
    }

    return await database.all<AccessRecord>(sql, params);
  }

  /**
   * 按日期范围统计数量
   */
  static async countByDateRange(
    startDate: Date, 
    endDate: Date, 
    conditions?: { userId?: number; deviceId?: string; result?: AccessResult; merchantId?: number }
  ): Promise<number> {
    let sql = `
      SELECT COUNT(*) as count 
      FROM access_records ar
      LEFT JOIN users u ON ar.user_id = u.id
      WHERE ar.timestamp >= ? AND ar.timestamp <= ?
    `;
    const params: any[] = [startDate.toISOString(), endDate.toISOString()];

    if (conditions?.userId) {
      sql += ' AND ar.user_id = ?';
      params.push(conditions.userId);
    }
    if (conditions?.deviceId) {
      sql += ' AND ar.device_id = ?';
      params.push(conditions.deviceId);
    }
    if (conditions?.result) {
      sql += ' AND ar.result = ?';
      params.push(conditions.result);
    }
    if (conditions?.merchantId) {
      sql += ' AND u.merchant_id = ?';
      params.push(conditions.merchantId);
    }

    const result = await database.get<{ count: number }>(sql, params);
    return result?.count || 0;
  }

  /**
   * 根据用户ID查找通行记录
   */
  static async findByUserId(userId: number, limit?: number): Promise<AccessRecord[]> {
    let sql = 'SELECT * FROM access_records WHERE user_id = ? ORDER BY timestamp DESC';
    const params: any[] = [userId];
    
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    
    return await database.all<AccessRecord>(sql, params);
  }

  /**
   * 根据设备ID查找通行记录
   */
  static async findByDeviceId(deviceId: string, limit?: number): Promise<AccessRecord[]> {
    let sql = 'SELECT * FROM access_records WHERE device_id = ? ORDER BY timestamp DESC';
    const params: any[] = [deviceId];
    
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    
    return await database.all<AccessRecord>(sql, params);
  }

  /**
   * 根据通行码ID查找通行记录
   */
  static async findByPasscodeId(passcodeId: number, limit?: number): Promise<AccessRecord[]> {
    let sql = 'SELECT * FROM access_records WHERE passcode_id = ? ORDER BY timestamp DESC';
    const params: any[] = [passcodeId];
    
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    
    return await database.all<AccessRecord>(sql, params);
  }

  /**
   * 根据结果查找通行记录
   */
  static async findByResult(result: AccessResult, limit?: number): Promise<AccessRecord[]> {
    let sql = 'SELECT * FROM access_records WHERE result = ? ORDER BY timestamp DESC';
    const params: any[] = [result];
    
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    
    return await database.all<AccessRecord>(sql, params);
  }

  /**
   * 更新通行记录
   */
  static async update(id: number, updateData: Partial<AccessRecord>): Promise<AccessRecord> {
    const fields: string[] = [];
    const params: any[] = [];

    // 构建动态更新字段
    Object.entries(updateData).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (fields.length === 0) {
      throw new Error('没有需要更新的字段');
    }

    params.push(id);
    const sql = `UPDATE access_records SET ${fields.join(', ')} WHERE id = ?`;
    const result = await database.run(sql, params);

    if (result.changes === 0) {
      throw new Error('通行记录不存在或更新失败');
    }

    const updatedRecord = await this.findById(id);
    if (!updatedRecord) {
      throw new Error('更新后查询通行记录失败');
    }

    return updatedRecord;
  }

  /**
   * 删除通行记录
   */
  static async delete(id: number): Promise<boolean> {
    const result = await database.run('DELETE FROM access_records WHERE id = ?', [id]);
    return result.changes > 0;
  }

  /**
   * 统计通行记录数量
   */
  static async count(options?: {
    userId?: number;
    deviceId?: string;
    result?: AccessResult;
    direction?: AccessDirection;
    startDate?: string;
    endDate?: string;
  }): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM access_records WHERE 1=1';
    const params: any[] = [];

    if (options?.userId) {
      sql += ' AND user_id = ?';
      params.push(options.userId);
    }

    if (options?.deviceId) {
      sql += ' AND device_id = ?';
      params.push(options.deviceId);
    }

    if (options?.result) {
      sql += ' AND result = ?';
      params.push(options.result);
    }

    if (options?.direction) {
      sql += ' AND direction = ?';
      params.push(options.direction);
    }

    if (options?.startDate) {
      sql += ' AND timestamp >= ?';
      params.push(options.startDate);
    }

    if (options?.endDate) {
      sql += ' AND timestamp <= ?';
      params.push(options.endDate);
    }

    const result = await database.get<{ count: number }>(sql, params);
    return result?.count || 0;
  }

  /**
   * 获取今日通行记录数量
   */
  static async getTodayCount(options?: {
    userId?: number;
    deviceId?: string;
    result?: AccessResult;
  }): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.count({
      ...options,
      startDate: today.toISOString(),
      endDate: tomorrow.toISOString(),
    });
  }

  /**
   * 获取成功通行次数
   */
  static async getSuccessCount(options?: {
    userId?: number;
    deviceId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<number> {
    return await this.count({
      ...options,
      result: 'success',
    });
  }

  /**
   * 获取失败通行次数
   */
  static async getFailedCount(options?: {
    userId?: number;
    deviceId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<number> {
    return await this.count({
      ...options,
      result: 'failed',
    });
  }

  /**
   * 验证通行记录数据
   */
  static validateRecordData(recordData: Partial<CreateAccessRecordData>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证必填字段
    if (!recordData.user_id || recordData.user_id <= 0) {
      if (!recordData.user_id) {
        errors.push('用户ID不能为空');
      } else {
        errors.push('用户ID无效');
      }
    }

    if (!recordData.device_id || recordData.device_id.trim().length === 0) {
      errors.push('设备ID不能为空');
    }

    if (!recordData.direction) {
      errors.push('通行方向不能为空');
    } else if (!['in', 'out'].includes(recordData.direction)) {
      errors.push('通行方向无效');
    }

    if (!recordData.result) {
      errors.push('通行结果不能为空');
    } else if (!['success', 'failed'].includes(recordData.result)) {
      errors.push('通行结果无效');
    }

    // 如果通行失败，必须提供失败原因
    if (recordData.result === 'failed' && (!recordData.fail_reason || recordData.fail_reason.trim().length === 0)) {
      errors.push('通行失败时必须提供失败原因');
    }

    // 时间戳是可选的，如果没有提供则使用当前时间
    // if (!recordData.timestamp) {
    //   errors.push('时间戳不能为空');
    // }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取用户最近的通行记录
   */
  static async getLatestByUserId(userId: number, limit: number = 10): Promise<AccessRecord[]> {
    return await this.findByUserId(userId, limit);
  }

  /**
   * 获取设备最近的通行记录
   */
  static async getLatestByDeviceId(deviceId: string, limit: number = 10): Promise<AccessRecord[]> {
    return await this.findByDeviceId(deviceId, limit);
  }

  /**
   * 获取通行统计信息
   */
  static async getStatistics(options?: {
    userId?: number;
    deviceId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalCount: number;
    successCount: number;
    failedCount: number;
    inCount: number;
    outCount: number;
    successRate: number;
  }> {
    const totalCount = await this.count(options);
    const successCount = await this.getSuccessCount(options);
    const failedCount = await this.getFailedCount(options);
    const inCount = await this.count({ ...options, direction: 'in' });
    const outCount = await this.count({ ...options, direction: 'out' });
    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

    return {
      totalCount,
      successCount,
      failedCount,
      inCount,
      outCount,
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  /**
   * 获取通行记录的完整信息（包含用户和通行码信息）
   */
  static async getFullInfo(id: number): Promise<{
    record: AccessRecord;
    user: any;
    passcode: any;
    project: any;
    venue: any;
    floor: any;
  } | undefined> {
    const record = await this.findById(id);
    if (!record) {
      return undefined;
    }

    // 获取用户信息
    const userSql = 'SELECT * FROM users WHERE id = ?';
    const user = await database.get(userSql, [record.user_id]);

    // 获取通行码信息（如果有）
    let passcode = null;
    if (record.passcode_id) {
      const passcodeSql = 'SELECT * FROM passcodes WHERE id = ?';
      passcode = await database.get(passcodeSql, [record.passcode_id]);
    }

    // 获取项目信息（如果有）
    let project = null;
    if (record.project_id) {
      const projectSql = 'SELECT * FROM projects WHERE id = ?';
      project = await database.get(projectSql, [record.project_id]);
    }

    // 获取场地信息（如果有）
    let venue = null;
    if (record.venue_id) {
      const venueSql = 'SELECT * FROM venues WHERE id = ?';
      venue = await database.get(venueSql, [record.venue_id]);
    }

    // 获取楼层信息（如果有）
    let floor = null;
    if (record.floor_id) {
      const floorSql = 'SELECT * FROM floors WHERE id = ?';
      floor = await database.get(floorSql, [record.floor_id]);
    }

    return {
      record,
      user,
      passcode,
      project,
      venue,
      floor,
    };
  }

  /**
   * 批量创建通行记录
   */
  static async batchCreate(recordsData: CreateAccessRecordData[]): Promise<AccessRecord[]> {
    const queries = recordsData.map(data => ({
      sql: `
        INSERT INTO access_records (
          user_id, passcode_id, device_id, device_type, direction, 
          result, fail_reason, project_id, venue_id, floor_id, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      params: [
        data.user_id,
        data.passcode_id || null,
        data.device_id,
        data.device_type || null,
        data.direction,
        data.result,
        data.fail_reason || null,
        data.project_id || null,
        data.venue_id || null,
        data.floor_id || null,
        data.timestamp,
      ]
    }));

    const results = await database.transaction(queries);
    
    // 查询创建的记录
    const createdRecords: AccessRecord[] = [];
    for (const result of results) {
      if (result.lastID) {
        const record = await this.findById(result.lastID);
        if (record) {
          createdRecords.push(record);
        }
      }
    }

    return createdRecords;
  }

  /**
   * 清理旧的通行记录
   */
  static async cleanup(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await database.run(
      'DELETE FROM access_records WHERE timestamp < ?',
      [cutoffDate.toISOString()]
    );
    
    return result.changes;
  }

  /**
   * 检查记录是否存在
   */
  static async exists(id: number): Promise<boolean> {
    const sql = 'SELECT 1 FROM access_records WHERE id = ?';
    const result = await database.get(sql, [id]);
    return !!result;
  }

  /**
   * 根据通行方式查找记录
   */
  static async findByAccessMethod(accessMethod: AccessMethod, limit?: number): Promise<AccessRecord[]> {
    let sql = 'SELECT * FROM access_records WHERE access_method = ? ORDER BY timestamp DESC';
    const params: any[] = [accessMethod];
    
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    
    return await database.all<AccessRecord>(sql, params);
  }

  /**
   * 根据设备类型查找记录
   */
  static async findByDeviceType(deviceType: DeviceType, limit?: number): Promise<AccessRecord[]> {
    let sql = 'SELECT * FROM access_records WHERE device_type = ? ORDER BY timestamp DESC';
    const params: any[] = [deviceType];
    
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    
    return await database.all<AccessRecord>(sql, params);
  }

  /**
   * 获取设备信息
   */
  static async getDeviceInfo(recordId: number): Promise<DeviceInfo | null> {
    const record = await this.findById(recordId);
    if (!record || !record.device_info) {
      return null;
    }

    try {
      return typeof record.device_info === 'string' 
        ? JSON.parse(record.device_info) 
        : record.device_info;
    } catch (error) {
      console.error('解析设备信息失败:', error);
      return null;
    }
  }

  /**
   * 获取通行上下文信息
   */
  static async getContext(recordId: number): Promise<AccessContext | null> {
    const record = await this.findById(recordId);
    if (!record || !record.context) {
      return null;
    }

    try {
      return typeof record.context === 'string' 
        ? JSON.parse(record.context) 
        : record.context;
    } catch (error) {
      console.error('解析通行上下文失败:', error);
      return null;
    }
  }

  /**
   * 更新验证状态
   */
  static async updateVerification(recordId: number, verification: {
    isVerified: boolean;
    verifiedBy?: number;
    verifiedAt?: string;
    verificationMethod?: string;
  }): Promise<AccessRecord> {
    const verificationJson = JSON.stringify(verification);
    // Use string type for verification field in update
    const updateData: Partial<AccessRecord> = { 
      verification: verificationJson as any 
    };
    return await this.update(recordId, updateData);
  }

  /**
   * 获取需要验证的记录
   */
  static async getPendingVerificationRecords(limit?: number): Promise<AccessRecord[]> {
    let sql = `
      SELECT * FROM access_records 
      WHERE verification IS NULL 
      OR JSON_EXTRACT(verification, '$.isVerified') = false
      ORDER BY timestamp DESC
    `;
    
    if (limit) {
      sql += ' LIMIT ?';
    }
    
    const params = limit ? [limit] : [];
    return await database.all<AccessRecord>(sql, params);
  }

  /**
   * 获取设备统计信息
   */
  static async getDeviceStatistics(deviceId: string, options?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalCount: number;
    successCount: number;
    failedCount: number;
    methodStats: Record<AccessMethod, number>;
    hourlyStats: Record<string, number>;
  }> {
    const baseConditions = 'device_id = ?';
    const baseParams = [deviceId];
    
    let dateCondition = '';
    if (options?.startDate) {
      dateCondition += ' AND timestamp >= ?';
      baseParams.push(options.startDate);
    }
    if (options?.endDate) {
      dateCondition += ' AND timestamp <= ?';
      baseParams.push(options.endDate);
    }

    // 总数和成功/失败统计
    const totalSql = `SELECT COUNT(*) as count FROM access_records WHERE ${baseConditions}${dateCondition}`;
    const successSql = `SELECT COUNT(*) as count FROM access_records WHERE ${baseConditions}${dateCondition} AND result = 'success'`;
    const failedSql = `SELECT COUNT(*) as count FROM access_records WHERE ${baseConditions}${dateCondition} AND result = 'failed'`;

    const [totalResult, successResult, failedResult] = await Promise.all([
      database.get<{ count: number }>(totalSql, baseParams),
      database.get<{ count: number }>(successSql, baseParams),
      database.get<{ count: number }>(failedSql, baseParams)
    ]);

    // 按通行方式统计
    const methodSql = `
      SELECT access_method, COUNT(*) as count 
      FROM access_records 
      WHERE ${baseConditions}${dateCondition} AND access_method IS NOT NULL
      GROUP BY access_method
    `;
    const methodResults = await database.all<{ access_method: AccessMethod; count: number }>(methodSql, baseParams);
    
    const methodStats: Record<AccessMethod, number> = {} as any;
    methodResults.forEach(row => {
      methodStats[row.access_method] = row.count;
    });

    // 按小时统计
    const hourlySql = `
      SELECT strftime('%H', timestamp) as hour, COUNT(*) as count 
      FROM access_records 
      WHERE ${baseConditions}${dateCondition}
      GROUP BY strftime('%H', timestamp)
      ORDER BY hour
    `;
    const hourlyResults = await database.all<{ hour: string; count: number }>(hourlySql, baseParams);
    
    const hourlyStats: Record<string, number> = {};
    hourlyResults.forEach(row => {
      hourlyStats[row.hour] = row.count;
    });

    return {
      totalCount: totalResult?.count || 0,
      successCount: successResult?.count || 0,
      failedCount: failedResult?.count || 0,
      methodStats,
      hourlyStats
    };
  }

  /**
   * 获取记录的完整信息（包含camelCase字段）
   */
  static async findWithDetails(recordId: number): Promise<(AccessRecord & {
    user?: any;
    passcode?: any;
    project?: any;
    venue?: any;
    floor?: any;
  }) | null> {
    const fullInfo = await this.getFullInfo(recordId);
    if (!fullInfo) {
      return null;
    }

    const record = fullInfo.record;
    
    return {
      ...record,
      userId: record.user_id,
      passcodeId: record.passcode_id,
      deviceId: record.device_id,
      deviceType: record.device_type,
      projectId: record.project_id,
      venueId: record.venue_id,
      floorId: record.floor_id,
      accessMethod: record.access_method,
      failReason: record.fail_reason,
      user: fullInfo.user,
      passcode: fullInfo.passcode,
      project: fullInfo.project,
      venue: fullInfo.venue,
      floor: fullInfo.floor
    };
  }
}