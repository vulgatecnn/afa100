import database from '../utils/database.js';
import type { User, UserType, UserStatus, UserRole, DatabaseResult } from '../types/index.js';

/**
 * 用户数据模型
 * 提供用户相关的数据库操作方法
 */
export class UserModel {
  /**
   * 创建新用户
   */
  static async create(userData: Omit<User, 'id' | 'created_at' | 'updated_at' | 'createdAt' | 'updatedAt' | 'merchant' | 'employee_applications' | 'visitor_applications' | 'passcodes' | 'access_records'>): Promise<User> {
    const sql = `
      INSERT INTO users (open_id, union_id, phone, name, avatar, user_type, role, status, permissions, merchant_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      userData.open_id || null,
      userData.union_id || null,
      userData.phone || null,
      userData.name,
      userData.avatar || null,
      userData.user_type,
      userData.role || null,
      userData.status || 'active',
      userData.permissions ? JSON.stringify(userData.permissions) : null,
      userData.merchant_id || null
    ];

    const result = await database.run(sql, params);
    
    if (!result.lastID) {
      throw new Error('创建用户失败');
    }

    // 使用一致性查询确保能读取到刚创建的数据
    const sql_select = 'SELECT * FROM users WHERE id = ?';
    const newUser = await database.getWithConsistency<User>(sql_select, [result.lastID]);
    
    if (!newUser) {
      throw new Error('创建用户后查询失败');
    }

    return newUser;
  }

  /**
   * 根据ID查找用户
   */
  static async findById(id: number): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const user = await database.get<User>(sql, [id]);
    return user || null;
  }

  /**
   * 根据微信openId查找用户
   */
  static async findByOpenId(openId: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE open_id = ?';
    const user = await database.get<User>(sql, [openId]);
    return user || null;
  }

  /**
   * 根据手机号查找用户
   */
  static async findByPhone(phone: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE phone = ?';
    const user = await database.get<User>(sql, [phone]);
    return user || null;
  }

  /**
   * 根据商户ID查找用户列表
   */
  static async findByMerchantId(merchantId: number): Promise<User[]> {
    const sql = 'SELECT * FROM users WHERE merchant_id = ? ORDER BY created_at DESC';
    return await database.all<User>(sql, [merchantId]);
  }

  /**
   * 根据用户类型查找用户列表
   */
  static async findByUserType(userType: UserType): Promise<User[]> {
    const sql = 'SELECT * FROM users WHERE user_type = ? ORDER BY created_at DESC';
    return await database.all<User>(sql, [userType]);
  }

  /**
   * 获取所有用户列表（支持分页）
   */
  static async findAll(options?: {
    page?: number;
    limit?: number;
    status?: UserStatus;
    userType?: UserType;
    merchantId?: number;
  }): Promise<User[]> {
    let sql = 'SELECT * FROM users WHERE 1=1';
    const params: any[] = [];

    // 添加筛选条件
    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    if (options?.userType) {
      sql += ' AND user_type = ?';
      params.push(options.userType);
    }

    if (options?.merchantId) {
      sql += ' AND merchant_id = ?';
      params.push(options.merchantId);
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

    return await database.all<User>(sql, params);
  }

  /**
   * 更新用户信息
   */
  static async update(id: number, updateData: Partial<Omit<User, 'id' | 'created_at'>>): Promise<User> {
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

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    const result = await database.run(sql, params);

    if (result.changes === 0) {
      throw new Error('用户不存在或更新失败');
    }

    const updatedUser = await this.findById(id);
    if (!updatedUser) {
      throw new Error('更新后查询用户失败');
    }

    return updatedUser;
  }

  /**
   * 删除用户（软删除，设置状态为inactive）
   */
  static async softDelete(id: number): Promise<boolean> {
    const result = await database.run(
      'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['inactive', id]
    );
    return result.changes > 0;
  }

  /**
   * 物理删除用户
   */
  static async delete(id: number): Promise<boolean> {
    const result = await database.run('DELETE FROM users WHERE id = ?', [id]);
    return result.changes > 0;
  }

  /**
   * 批量创建用户
   */
  static async batchCreate(usersData: Omit<User, 'id' | 'created_at' | 'updated_at' | 'createdAt' | 'updatedAt' | 'merchant' | 'employee_applications' | 'visitor_applications' | 'passcodes' | 'access_records'>[]): Promise<User[]> {
    const queries = usersData.map(userData => ({
      sql: `
        INSERT INTO users (open_id, union_id, phone, name, avatar, user_type, role, status, permissions, merchant_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      params: [
        userData.open_id || null,
        userData.union_id || null,
        userData.phone || null,
        userData.name,
        userData.avatar || null,
        userData.user_type,
        userData.role || null,
        userData.status || 'active',
        userData.permissions ? JSON.stringify(userData.permissions) : null,
        userData.merchant_id || null
      ]
    }));

    const results = await database.transaction(queries);
    
    // 查询创建的用户
    const createdUsers: User[] = [];
    for (const result of results) {
      if (result.lastID) {
        const user = await this.findById(result.lastID);
        if (user) {
          createdUsers.push(user);
        }
      }
    }

    return createdUsers;
  }

  /**
   * 统计用户数量
   */
  static async count(options?: {
    status?: UserStatus;
    userType?: UserType;
    merchantId?: number;
  }): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM users WHERE 1=1';
    const params: any[] = [];

    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    if (options?.userType) {
      sql += ' AND user_type = ?';
      params.push(options.userType);
    }

    if (options?.merchantId) {
      sql += ' AND merchant_id = ?';
      params.push(options.merchantId);
    }

    const result = await database.get<{ count: number }>(sql, params);
    return result?.count || 0;
  }

  /**
   * 验证用户数据
   */
  static validateUserData(userData: Partial<User>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证必填字段
    if (!userData.name || userData.name.trim().length === 0) {
      errors.push('用户姓名不能为空');
    }

    if (!userData.user_type) {
      errors.push('用户类型不能为空');
    } else if (!['tenant_admin', 'merchant_admin', 'employee', 'visitor'].includes(userData.user_type)) {
      errors.push('用户类型无效');
    }

    // 验证用户角色
    if (userData.role && !['admin', 'manager', 'employee', 'visitor', 'guest'].includes(userData.role)) {
      errors.push('用户角色无效');
    }

    // 验证手机号格式
    if (userData.phone && !/^1[3-9]\d{9}$/.test(userData.phone)) {
      errors.push('手机号格式无效');
    }

    // 验证状态
    if (userData.status && !['active', 'inactive', 'pending'].includes(userData.status)) {
      errors.push('用户状态无效');
    }

    // 验证权限数组
    if (userData.permissions && !Array.isArray(userData.permissions)) {
      errors.push('用户权限必须是数组格式');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 检查用户是否存在
   */
  static async exists(id: number): Promise<boolean> {
    const sql = 'SELECT 1 FROM users WHERE id = ?';
    const result = await database.get(sql, [id]);
    return !!result;
  }

  /**
   * 检查openId是否已存在
   */
  static async openIdExists(openId: string, excludeId?: number): Promise<boolean> {
    let sql = 'SELECT 1 FROM users WHERE open_id = ?';
    const params: any[] = [openId];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await database.get(sql, params);
    return !!result;
  }

  /**
   * 检查手机号是否已存在
   */
  static async phoneExists(phone: string, excludeId?: number): Promise<boolean> {
    let sql = 'SELECT 1 FROM users WHERE phone = ?';
    const params: any[] = [phone];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await database.get(sql, params);
    return !!result;
  }

  /**
   * 更新用户最后登录时间
   */
  static async updateLastLogin(userId: number): Promise<void> {
    const sql = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await database.run(sql, [userId]);
  }

  /**
   * 更新用户最后登出时间
   */
  static async updateLastLogout(userId: number): Promise<void> {
    const sql = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await database.run(sql, [userId]);
  }

  /**
   * 更新用户权限
   */
  static async updatePermissions(userId: number, permissions: string[]): Promise<User> {
    const sql = 'UPDATE users SET permissions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const result = await database.run(sql, [JSON.stringify(permissions), userId]);

    if (result.changes === 0) {
      throw new Error('用户不存在或更新权限失败');
    }

    const updatedUser = await this.findById(userId);
    if (!updatedUser) {
      throw new Error('更新权限后查询用户失败');
    }

    return updatedUser;
  }

  /**
   * 获取用户权限
   */
  static async getUserPermissions(userId: number): Promise<string[]> {
    const user = await this.findById(userId);
    if (!user || !user.permissions) {
      return [];
    }

    try {
      return Array.isArray(user.permissions) ? user.permissions : JSON.parse(user.permissions as string);
    } catch (error) {
      return [];
    }
  }

  /**
   * 检查用户是否有特定权限
   */
  static async hasPermission(userId: number, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }

  /**
   * 根据角色查找用户
   */
  static async findByRole(role: UserRole): Promise<User[]> {
    const sql = 'SELECT * FROM users WHERE role = ? ORDER BY created_at DESC';
    return await database.all<User>(sql, [role]);
  }

  /**
   * 获取用户关联的商户信息
   */
  static async findWithMerchant(userId: number): Promise<User & { merchant?: any } | null> {
    const sql = `
      SELECT u.*, m.name as merchant_name, m.code as merchant_code, m.status as merchant_status
      FROM users u
      LEFT JOIN merchants m ON u.merchant_id = m.id
      WHERE u.id = ?
    `;
    
    const result = await database.get<any>(sql, [userId]);
    if (!result) {
      return null;
    }

    // 构造返回对象
    const user: User & { merchant?: any } = {
      id: result.id,
      open_id: result.open_id,
      union_id: result.union_id,
      phone: result.phone,
      name: result.name,
      avatar: result.avatar,
      user_type: result.user_type,
      role: result.role,
      status: result.status,
      permissions: result.permissions ? JSON.parse(result.permissions) : [],
      merchant_id: result.merchant_id,
      created_at: result.created_at,
      updated_at: result.updated_at,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };

    if (result.merchant_name) {
      user.merchant = {
        id: result.merchant_id,
        name: result.merchant_name,
        code: result.merchant_code,
        status: result.merchant_status
      };
    }

    return user;
  }
}