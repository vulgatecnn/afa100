/**
 * 用户管理控制器
 */

import { Request, Response } from 'express';
import { AppError, ErrorCodes } from '../middleware/error.middleware.js';
import { Database } from '../utils/database.js';

export class UserController {
  private database: Database;

  constructor() {
    this.database = Database.getInstance();
  }

  /**
   * 获取用户列表
   */
  async getUsers(req: Request, res: Response): Promise<void> {
    const { simulateDbFailure, simulateNetworkError, simulateSlowQuery } = req.query;

    // 模拟数据库连接失败
    if (simulateDbFailure === 'true') {
      throw new AppError('服务暂时不可用', 503, ErrorCodes.SERVICE_UNAVAILABLE, {
        degraded: true,
        feature: 'user_management',
      });
    }

    // 模拟网络错误，返回缓存数据
    if (simulateNetworkError === 'true') {
      const cachedUsers = [
        { id: 1, name: '缓存用户1', user_type: 'employee' },
        { id: 2, name: '缓存用户2', user_type: 'merchant_admin' },
      ];

      res.json({
        success: true,
        data: {
          items: cachedUsers,
          total: cachedUsers.length,
        },
        cached: true,
        message: '返回缓存数据',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 模拟慢查询
    if (simulateSlowQuery === 'true') {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    try {
      const users = await this.database.all('SELECT * FROM users ORDER BY created_at DESC');
      
      res.json({
        success: true,
        data: {
          items: users,
          total: users.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new AppError('获取用户列表失败', 500, ErrorCodes.DATABASE_ERROR, error);
    }
  }

  /**
   * 获取单个用户
   */
  async getUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const user = await this.database.get('SELECT * FROM users WHERE id = ?', [id]);
      
      if (!user) {
        throw new AppError('用户不存在', 404, ErrorCodes.USER_NOT_FOUND);
      }

      res.json({
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('获取用户信息失败', 500, ErrorCodes.DATABASE_ERROR, error);
    }
  }

  /**
   * 创建用户
   */
  async createUser(req: Request, res: Response): Promise<void> {
    const userData = req.body;

    try {
      const result = await this.database.run(
        'INSERT INTO users (name, phone, user_type, merchant_id, created_at) VALUES (?, ?, ?, ?, ?)',
        [userData.name, userData.phone, userData.user_type, userData.merchant_id, new Date().toISOString()]
      );

      const newUser = await this.database.get('SELECT * FROM users WHERE id = ?', [result.lastID]);

      res.status(201).json({
        success: true,
        data: newUser,
        message: '用户创建成功',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new AppError('创建用户失败', 500, ErrorCodes.DATABASE_ERROR, error);
    }
  }

  /**
   * 更新用户
   */
  async updateUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userData = req.body;

    try {
      const existingUser = await this.database.get('SELECT * FROM users WHERE id = ?', [id]);
      
      if (!existingUser) {
        throw new AppError('用户不存在', 404, ErrorCodes.USER_NOT_FOUND);
      }

      await this.database.run(
        'UPDATE users SET name = ?, phone = ?, user_type = ?, updated_at = ? WHERE id = ?',
        [userData.name, userData.phone, userData.user_type, new Date().toISOString(), id]
      );

      const updatedUser = await this.database.get('SELECT * FROM users WHERE id = ?', [id]);

      res.json({
        success: true,
        data: updatedUser,
        message: '用户更新成功',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('更新用户失败', 500, ErrorCodes.DATABASE_ERROR, error);
    }
  }

  /**
   * 删除用户
   */
  async deleteUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const existingUser = await this.database.get('SELECT * FROM users WHERE id = ?', [id]);
      
      if (!existingUser) {
        throw new AppError('用户不存在', 404, ErrorCodes.USER_NOT_FOUND);
      }

      await this.database.run('DELETE FROM users WHERE id = ?', [id]);

      res.json({
        success: true,
        message: '用户删除成功',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('删除用户失败', 500, ErrorCodes.DATABASE_ERROR, error);
    }
  }
}