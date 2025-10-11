import database from '../utils/database.js';
import type { Passcode, PasscodeType, PasscodeStatus } from '../types/index.js';

/**
 * 通行码创建数据接口
 */
export interface CreatePasscodeData {
  user_id: number;
  code: string;
  type: PasscodeType;
  status: PasscodeStatus;
  expiry_time?: string;
  usage_limit?: number;
  usage_count: number;
  permissions?: string;
  application_id?: number;
}

/**
 * 通行码更新数据接口
 */
export interface UpdatePasscodeData {
  status?: PasscodeStatus;
  expiry_time?: string;
  usage_limit?: number;
  usage_count?: number;
  permissions?: string;
}

/**
 * 通行码模型类
 * 处理通行码相关的数据库操作
 */
export class PasscodeModel {
  /**
   * 创建通行码
   */
  static async create(data: CreatePasscodeData): Promise<Passcode> {
    const sql = `
      INSERT INTO passcodes (
        user_id, code, type, status, expiry_time, usage_limit, 
        usage_count, permissions, application_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    const result = await database.run(sql, [
      data.user_id,
      data.code,
      data.type,
      data.status || 'active',
      data.expiry_time || null,
      data.usage_limit || null,
      data.usage_count || 0,
      data.permissions || null,
      data.application_id || null,
    ]);

    if (!result.lastID) {
      throw new Error('创建通行码失败');
    }

    // 等待一小段时间确保数据写入完成
    await new Promise(resolve => setTimeout(resolve, 1));
    
    // 使用一致性查询确保能读取到刚创建的数据
    const sql_select = 'SELECT * FROM passcodes WHERE id = ?';
    const newPasscode = await database.getWithConsistency<Passcode>(sql_select, [result.lastID]);
    
    if (!newPasscode) {
      throw new Error('创建通行码后查询失败');
    }

    return newPasscode;
  }

  /**
   * 根据ID查找通行码
   */
  static async findById(id: number): Promise<Passcode | null> {
    const sql = 'SELECT * FROM passcodes WHERE id = ?';
    const passcode = await database.get<Passcode>(sql, [id]);
    return passcode || null;
  }

  /**
   * 根据通行码查找
   */
  static async findByCode(code: string): Promise<Passcode | null> {
    const sql = 'SELECT * FROM passcodes WHERE code = ?';
    const passcode = await database.get<Passcode>(sql, [code]);
    return passcode || null;
  }

  /**
   * 查找用户的活跃通行码
   */
  static async findActiveByUserId(userId: number): Promise<Passcode | null> {
    const sql = `
      SELECT * FROM passcodes 
      WHERE user_id = ? AND status = 'active' 
      AND (expiry_time IS NULL OR expiry_time > datetime('now'))
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const passcode = await database.get<Passcode>(sql, [userId]);
    return passcode || null;
  }

  /**
   * 更新通行码
   */
  static async update(id: number, data: UpdatePasscodeData): Promise<Passcode> {
    const fields = [];
    const values = [];

    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.expiry_time !== undefined) {
      fields.push('expiry_time = ?');
      values.push(data.expiry_time);
    }
    if (data.usage_limit !== undefined) {
      fields.push('usage_limit = ?');
      values.push(data.usage_limit);
    }
    if (data.usage_count !== undefined) {
      fields.push('usage_count = ?');
      values.push(data.usage_count);
    }
    if (data.permissions !== undefined) {
      fields.push('permissions = ?');
      values.push(data.permissions);
    }

    if (fields.length === 0) {
      throw new Error('没有需要更新的字段');
    }

    fields.push('updated_at = datetime(\'now\')');
    values.push(id);

    const sql = `UPDATE passcodes SET ${fields.join(', ')} WHERE id = ?`;
    await database.run(sql, values);

    const updatedPasscode = await this.findById(id);
    if (!updatedPasscode) {
      throw new Error('通行码不存在');
    }

    return updatedPasscode;
  }

  /**
   * 增加使用次数
   */
  static async incrementUsageCount(id: number): Promise<void> {
    const sql = `
      UPDATE passcodes 
      SET usage_count = usage_count + 1, updated_at = datetime('now')
      WHERE id = ?
    `;
    await database.run(sql, [id]);
  }

  /**
   * 撤销用户的所有活跃通行码
   */
  static async revokeUserPasscodes(userId: number): Promise<void> {
    const sql = `
      UPDATE passcodes 
      SET status = 'revoked', updated_at = datetime('now')
      WHERE user_id = ? AND status = 'active'
    `;
    await database.run(sql, [userId]);
  }

  /**
   * 删除通行码
   */
  static async delete(id: number): Promise<void> {
    const sql = 'DELETE FROM passcodes WHERE id = ?';
    await database.run(sql, [id]);
  }

  /**
   * 获取用户的通行码列表
   */
  static async findByUserId(userId: number, limit: number = 10): Promise<Passcode[]> {
    const sql = `
      SELECT * FROM passcodes 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `;
    return await database.all<Passcode>(sql, [userId, limit]);
  }

  /**
   * 清理过期的通行码
   */
  static async cleanupExpired(): Promise<number> {
    const sql = `
      UPDATE passcodes 
      SET status = 'expired', updated_at = datetime('now')
      WHERE status = 'active' 
      AND expiry_time IS NOT NULL 
      AND expiry_time < datetime('now')
    `;
    const result = await database.run(sql);
    return result.changes;
  }

  /**
   * 统计通行码数量
   */
  static async count(conditions?: { userId?: number; status?: PasscodeStatus; type?: PasscodeType }): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM passcodes WHERE 1=1';
    const params: any[] = [];

    if (conditions?.userId) {
      sql += ' AND user_id = ?';
      params.push(conditions.userId);
    }
    if (conditions?.status) {
      sql += ' AND status = ?';
      params.push(conditions.status);
    }
    if (conditions?.type) {
      sql += ' AND type = ?';
      params.push(conditions.type);
    }

    const result = await database.get<{ count: number }>(sql, params);
    return result?.count || 0;
  }

  /**
   * 检查通行码是否存在
   */
  static async exists(id: number): Promise<boolean> {
    const sql = 'SELECT 1 FROM passcodes WHERE id = ?';
    const result = await database.get(sql, [id]);
    return !!result;
  }

  /**
   * 检查通行码代码是否存在
   */
  static async codeExists(code: string, excludeId?: number): Promise<boolean> {
    let sql = 'SELECT 1 FROM passcodes WHERE code = ?';
    const params: any[] = [code];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await database.get(sql, params);
    return !!result;
  }

  /**
   * 验证通行码是否有效
   */
  static async isValid(code: string): Promise<{ isValid: boolean; reason?: string; passcode?: Passcode }> {
    const passcode = await this.findByCode(code);
    
    if (!passcode) {
      return { isValid: false, reason: '通行码不存在' };
    }

    if (passcode.status !== 'active') {
      return { isValid: false, reason: '通行码已失效', passcode };
    }

    // 检查过期时间
    if (passcode.expiry_time) {
      const expiryTime = new Date(passcode.expiry_time);
      if (expiryTime <= new Date()) {
        return { isValid: false, reason: '通行码已过期', passcode };
      }
    }

    // 检查使用次数
    if (passcode.usage_limit && passcode.usage_count >= passcode.usage_limit) {
      return { isValid: false, reason: '通行码使用次数已达上限', passcode };
    }

    return { isValid: true, passcode };
  }

  /**
   * 验证通行码数据
   */
  static validatePasscodeData(passcodeData: Partial<CreatePasscodeData>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证必填字段
    if (!passcodeData.user_id || passcodeData.user_id <= 0) {
      errors.push('用户ID无效');
    }

    if (!passcodeData.code || passcodeData.code.trim().length === 0) {
      errors.push('通行码内容不能为空');
    }

    if (!passcodeData.type) {
      errors.push('通行码类型不能为空');
    } else if (!['employee', 'visitor'].includes(passcodeData.type)) {
      errors.push('通行码类型无效');
    }

    // 验证状态
    if (passcodeData.status && !['active', 'expired', 'revoked'].includes(passcodeData.status)) {
      errors.push('通行码状态无效');
    }

    // 验证使用次数
    if (passcodeData.usage_count !== undefined && passcodeData.usage_count < 0) {
      errors.push('已使用次数不能为负数');
    }

    if (passcodeData.usage_limit !== undefined && passcodeData.usage_limit <= 0) {
      errors.push('使用次数限制必须大于0');
    }

    // 验证过期时间
    if (passcodeData.expiry_time) {
      const expiryTime = new Date(passcodeData.expiry_time);
      if (isNaN(expiryTime.getTime())) {
        errors.push('过期时间格式无效');
      } else if (expiryTime <= new Date()) {
        errors.push('过期时间必须是未来时间');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}