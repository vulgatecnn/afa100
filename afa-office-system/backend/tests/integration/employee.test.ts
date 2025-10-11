import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import database from '../../src/utils/database.js';

describe('Employee Management Integration Tests', () => {
  let authToken: string;
  let merchantId: number;
  let employeeId: number;

  beforeEach(async () => {
    // 清理测试数据库
    await database.run('DELETE FROM users');
    await database.run('DELETE FROM merchants');
    await database.run('DELETE FROM visitor_applications');
    await database.run('DELETE FROM passcodes');

    // 创建测试商户
    const merchantResult = await database.run(
      `INSERT INTO merchants (name, code, contact, phone, status) 
       VALUES (?, ?, ?, ?, ?)`,
      ['测试商户', 'TEST001', '张经理', '13800138000', 'active']
    );
    merchantId = merchantResult.lastID!;

    // 创建测试管理员用户
    const adminResult = await database.run(
      `INSERT INTO users (name, phone, user_type, status, merchant_id) 
       VALUES (?, ?, ?, ?, ?)`,
      ['管理员', '13800138001', 'merchant_admin', 'active', merchantId]
    );

    // 模拟登录获取token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        phone: '13800138001',
        password: 'test123'
      });

    if (loginResponse.body.success) {
      authToken = loginResponse.body.data.token;
    } else {
      // 如果登录失败，使用模拟token
      authToken = 'mock-jwt-token';
    }
  });

  afterEach(async () => {
    // 清理测试数据
    await database.run('DELETE FROM users');
    await database.run('DELETE FROM merchants');
    await database.run('DELETE FROM visitor_applications');
    await database.run('DELETE FROM passcodes');
  });

  describe('POST /api/v1/merchants/:merchantId/employees', () => {
    it('应该成功创建员工', async () => {
      const employeeData = {
        name: '张三',
        phone: '13800138002',
        user_type: 'employee'
      };

      const response = await request(app)
        .post(`/api/v1/merchants/${merchantId}/employees`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(employeeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('张三');
      expect(response.body.data.phone).toBe('13800138002');
      expect(response.body.data.user_type).toBe('employee');
      expect(response.body.data.merchant_id).toBe(merchantId);

      employeeId = response.body.data.id;
    });

    it('应该在缺少必填字段时返回400错误', async () => {
      const response = await request(app)
        .post(`/api/v1/merchants/${merchantId}/employees`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: '13800138003'
          // 缺少name字段
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('姓名不能为空');
    });

    it('应该在商户ID无效时返回400错误', async () => {
      const response = await request(app)
        .post('/api/v1/merchants/invalid/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '张三',
          phone: '13800138004'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('商户ID无效');
    });
  });

  describe('GET /api/v1/merchants/:merchantId/employees', () => {
    beforeEach(async () => {
      // 创建测试员工
      await database.run(
        `INSERT INTO users (name, phone, user_type, status, merchant_id) 
         VALUES (?, ?, ?, ?, ?)`,
        ['员工1', '13800138010', 'employee', 'active', merchantId]
      );
      await database.run(
        `INSERT INTO users (name, phone, user_type, status, merchant_id) 
         VALUES (?, ?, ?, ?, ?)`,
        ['员工2', '13800138011', 'employee', 'inactive', merchantId]
      );
    });

    it('应该成功获取员工列表', async () => {
      const response = await request(app)
        .get(`/api/v1/merchants/${merchantId}/employees`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('应该支持分页查询', async () => {
      const response = await request(app)
        .get(`/api/v1/merchants/${merchantId}/employees?page=1&limit=1`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });

    it('应该支持状态筛选', async () => {
      const response = await request(app)
        .get(`/api/v1/merchants/${merchantId}/employees?status=active`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].status).toBe('active');
    });
  });

  describe('PUT /api/v1/merchants/:merchantId/employees/:employeeId', () => {
    beforeEach(async () => {
      // 创建测试员工
      const result = await database.run(
        `INSERT INTO users (name, phone, user_type, status, merchant_id) 
         VALUES (?, ?, ?, ?, ?)`,
        ['测试员工', '13800138020', 'employee', 'active', merchantId]
      );
      employeeId = result.lastID!;
    });

    it('应该成功更新员工信息', async () => {
      const updateData = {
        name: '更新后的姓名',
        phone: '13800138021'
      };

      const response = await request(app)
        .put(`/api/v1/merchants/${merchantId}/employees/${employeeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('更新后的姓名');
      expect(response.body.data.phone).toBe('13800138021');
    });

    it('应该在员工不存在时返回404错误', async () => {
      const response = await request(app)
        .put(`/api/v1/merchants/${merchantId}/employees/99999`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '新姓名' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('不存在');
    });
  });

  describe('DELETE /api/v1/merchants/:merchantId/employees/:employeeId', () => {
    beforeEach(async () => {
      // 创建测试员工
      const result = await database.run(
        `INSERT INTO users (name, phone, user_type, status, merchant_id) 
         VALUES (?, ?, ?, ?, ?)`,
        ['待删除员工', '13800138030', 'employee', 'active', merchantId]
      );
      employeeId = result.lastID!;
    });

    it('应该成功删除员工', async () => {
      const response = await request(app)
        .delete(`/api/v1/merchants/${merchantId}/employees/${employeeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('员工删除成功');

      // 验证员工状态已更改为inactive
      const employee = await database.get(
        'SELECT * FROM users WHERE id = ?',
        [employeeId]
      );
      expect(employee.status).toBe('inactive');
    });
  });

  describe('POST /api/v1/merchants/:merchantId/employees/batch', () => {
    it('应该成功批量创建员工', async () => {
      const employeesData = {
        employees: [
          { name: '批量员工1', phone: '13800138040' },
          { name: '批量员工2', phone: '13800138041' },
          { name: '批量员工3', phone: '13800138042' }
        ]
      };

      const response = await request(app)
        .post(`/api/v1/merchants/${merchantId}/employees/batch`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(employeesData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toHaveLength(3);
      expect(response.body.data.failed).toHaveLength(0);
    });

    it('应该处理部分失败的批量创建', async () => {
      // 先创建一个员工，使其中一个手机号重复
      await database.run(
        `INSERT INTO users (name, phone, user_type, status, merchant_id) 
         VALUES (?, ?, ?, ?, ?)`,
        ['已存在员工', '13800138050', 'employee', 'active', merchantId]
      );

      const employeesData = {
        employees: [
          { name: '新员工1', phone: '13800138051' },
          { name: '重复员工', phone: '13800138050' }, // 重复手机号
          { name: '新员工2', phone: '13800138052' }
        ]
      };

      const response = await request(app)
        .post(`/api/v1/merchants/${merchantId}/employees/batch`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(employeesData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toHaveLength(2);
      expect(response.body.data.failed).toHaveLength(1);
      expect(response.body.data.failed[0].error).toContain('手机号已被使用');
    });
  });

  describe('GET /api/v1/merchants/:merchantId/employees/stats', () => {
    beforeEach(async () => {
      // 创建不同状态的员工
      await database.run(
        `INSERT INTO users (name, phone, user_type, status, merchant_id) 
         VALUES (?, ?, ?, ?, ?)`,
        ['活跃员工1', '13800138060', 'employee', 'active', merchantId]
      );
      await database.run(
        `INSERT INTO users (name, phone, user_type, status, merchant_id) 
         VALUES (?, ?, ?, ?, ?)`,
        ['活跃员工2', '13800138061', 'employee', 'active', merchantId]
      );
      await database.run(
        `INSERT INTO users (name, phone, user_type, status, merchant_id) 
         VALUES (?, ?, ?, ?, ?)`,
        ['非活跃员工', '13800138062', 'employee', 'inactive', merchantId]
      );
      await database.run(
        `INSERT INTO users (name, phone, user_type, status, merchant_id) 
         VALUES (?, ?, ?, ?, ?)`,
        ['待审核员工', '13800138063', 'employee', 'pending', merchantId]
      );
    });

    it('应该成功获取员工统计信息', async () => {
      const response = await request(app)
        .get(`/api/v1/merchants/${merchantId}/employees/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(4);
      expect(response.body.data.active).toBe(2);
      expect(response.body.data.inactive).toBe(1);
      expect(response.body.data.pending).toBe(1);
    });
  });

  describe('POST /api/v1/merchants/:merchantId/employees/import', () => {
    it('应该成功处理Excel导入数据', async () => {
      const importData = {
        data: [
          { name: '导入员工1', phone: '13800138070', user_type: 'employee' },
          { name: '导入员工2', phone: '13800138071', user_type: 'employee' },
          { name: '', phone: '13800138072' }, // 无效数据：姓名为空
          { name: '导入员工3', phone: '123' } // 无效数据：手机号格式错误
        ]
      };

      const response = await request(app)
        .post(`/api/v1/merchants/${merchantId}/employees/import`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(importData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.successCount).toBe(2);
      expect(response.body.data.summary.failedCount).toBe(2);
      expect(response.body.data.failed).toHaveLength(2);
    });

    it('应该在导入数据为空时返回400错误', async () => {
      const response = await request(app)
        .post(`/api/v1/merchants/${merchantId}/employees/import`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('导入数据不能为空');
    });
  });
});