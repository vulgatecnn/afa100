import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { Database } from '../../src/utils/database.js';

describe('商户管理接口测试', () => {
  let db: Database;
  let authToken: string;
  let testMerchantId: number;

  beforeAll(async () => {
    // 初始化测试数据库
    db = Database.getInstance();
    await db.init();

    // 创建测试用户并获取认证token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        phone: '13800138000',
        password: 'test123456',
        userType: 'tenant_admin'
      });

    if (loginResponse.status === 200) {
      authToken = loginResponse.body.data.accessToken;
    } else {
      // 如果登录失败，创建测试用户
      await db.run(`
        INSERT INTO users (name, phone, user_type, status, created_at, updated_at)
        VALUES ('测试租务管理员', '13800138000', 'tenant_admin', 'active', datetime('now'), datetime('now'))
      `);
      
      const loginRetry = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '13800138000',
          password: 'test123456',
          userType: 'tenant_admin'
        });
      
      authToken = loginRetry.body.data.accessToken;
    }
  });

  afterAll(async () => {
    // 清理测试数据
    await db.run('DELETE FROM merchants WHERE code LIKE "TEST_%"');
    await db.run('DELETE FROM users WHERE phone = "13800138000"');
    await db.close();
  });

  beforeEach(async () => {
    // 清理之前的测试商户数据
    await db.run('DELETE FROM merchants WHERE code LIKE "TEST_%"');
  });

  describe('POST /api/v1/merchant - 创建商户', () => {
    it('应该成功创建商户', async () => {
      const merchantData = {
        name: '测试商户',
        code: 'TEST_MERCHANT_001',
        contact: '张三',
        phone: '13800138001',
        email: 'test@example.com',
        address: '测试地址'
      };

      const response = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${authToken}`)
        .send(merchantData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.merchant).toMatchObject({
        name: merchantData.name,
        code: merchantData.code,
        contact: merchantData.contact,
        phone: merchantData.phone,
        email: merchantData.email,
        address: merchantData.address,
        status: 'active'
      });

      testMerchantId = response.body.data.merchant.id;
    });

    it('应该拒绝重复的商户编码', async () => {
      // 先创建一个商户
      await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '测试商户1',
          code: 'TEST_DUPLICATE',
          contact: '张三'
        });

      // 尝试创建相同编码的商户
      const response = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '测试商户2',
          code: 'TEST_DUPLICATE',
          contact: '李四'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('商户编码已存在');
    });

    it('应该验证必填字段', async () => {
      const response = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '测试商户'
          // 缺少 code 字段
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('应该验证字段格式', async () => {
      const response = await request(app)
        .post('/api/v1/merchant')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'A', // 名称太短
          code: 'TEST_INVALID',
          phone: '123', // 手机号格式错误
          email: 'invalid-email' // 邮箱格式错误
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/merchant - 获取商户列表', () => {
    beforeEach(async () => {
      // 创建测试商户数据
      await db.run(`
        INSERT INTO merchants (name, code, contact, phone, status, created_at, updated_at)
        VALUES 
        ('测试商户A', 'TEST_A', '张三', '13800138001', 'active', datetime('now'), datetime('now')),
        ('测试商户B', 'TEST_B', '李四', '13800138002', 'inactive', datetime('now'), datetime('now')),
        ('测试商户C', 'TEST_C', '王五', '13800138003', 'active', datetime('now'), datetime('now'))
      `);
    });

    it('应该返回商户列表', async () => {
      const response = await request(app)
        .get('/api/v1/merchant')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number),
        totalPages: expect.any(Number)
      });
    });

    it('应该支持分页查询', async () => {
      const response = await request(app)
        .get('/api/v1/merchant?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.data.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('应该支持状态筛选', async () => {
      const response = await request(app)
        .get('/api/v1/merchant?status=active')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.data.forEach((merchant: any) => {
        expect(merchant.status).toBe('active');
      });
    });

    it('应该支持搜索功能', async () => {
      const response = await request(app)
        .get('/api/v1/merchant?search=测试商户A')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.data.length).toBeGreaterThan(0);
      expect(response.body.data.data[0].name).toContain('测试商户A');
    });
  });

  describe('GET /api/v1/merchant/:id - 获取商户详情', () => {
    beforeEach(async () => {
      const result = await db.run(`
        INSERT INTO merchants (name, code, contact, phone, status, created_at, updated_at)
        VALUES ('测试商户详情', 'TEST_DETAIL', '张三', '13800138001', 'active', datetime('now'), datetime('now'))
      `);
      testMerchantId = result.lastID!;
    });

    it('应该返回商户详情', async () => {
      const response = await request(app)
        .get(`/api/v1/merchant/${testMerchantId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.merchant).toMatchObject({
        id: testMerchantId,
        name: '测试商户详情',
        code: 'TEST_DETAIL',
        contact: '张三',
        phone: '13800138001',
        status: 'active'
      });
    });

    it('应该处理不存在的商户ID', async () => {
      const response = await request(app)
        .get('/api/v1/merchant/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('商户不存在');
    });
  });

  describe('PUT /api/v1/merchant/:id - 更新商户信息', () => {
    beforeEach(async () => {
      const result = await db.run(`
        INSERT INTO merchants (name, code, contact, phone, status, created_at, updated_at)
        VALUES ('原始商户名', 'TEST_UPDATE', '张三', '13800138001', 'active', datetime('now'), datetime('now'))
      `);
      testMerchantId = result.lastID!;
    });

    it('应该成功更新商户信息', async () => {
      const updateData = {
        name: '更新后的商户名',
        contact: '李四',
        phone: '13800138002',
        email: 'updated@example.com'
      };

      const response = await request(app)
        .put(`/api/v1/merchant/${testMerchantId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.merchant).toMatchObject({
        id: testMerchantId,
        name: updateData.name,
        contact: updateData.contact,
        phone: updateData.phone,
        email: updateData.email
      });
    });

    it('应该支持部分字段更新', async () => {
      const response = await request(app)
        .put(`/api/v1/merchant/${testMerchantId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '仅更新名称'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.merchant.name).toBe('仅更新名称');
      expect(response.body.data.merchant.code).toBe('TEST_UPDATE'); // 其他字段保持不变
    });

    it('应该处理不存在的商户ID', async () => {
      const response = await request(app)
        .put('/api/v1/merchant/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '更新名称'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/merchant/:id/disable - 停用商户', () => {
    beforeEach(async () => {
      const result = await db.run(`
        INSERT INTO merchants (name, code, contact, phone, status, created_at, updated_at)
        VALUES ('待停用商户', 'TEST_DISABLE', '张三', '13800138001', 'active', datetime('now'), datetime('now'))
      `);
      testMerchantId = result.lastID!;

      // 创建该商户下的员工
      await db.run(`
        INSERT INTO users (name, phone, user_type, status, merchant_id, created_at, updated_at)
        VALUES ('测试员工', '13800138010', 'employee', 'active', ?, datetime('now'), datetime('now'))
      `, [testMerchantId]);
    });

    it('应该成功停用商户并自动停用员工', async () => {
      const response = await request(app)
        .post(`/api/v1/merchant/${testMerchantId}/disable`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.merchant.status).toBe('inactive');

      // 验证员工也被停用
      const employee = await db.get(
        'SELECT status FROM users WHERE merchant_id = ? AND user_type = "employee"',
        [testMerchantId]
      );
      expect(employee?.status).toBe('inactive');
    });
  });

  describe('POST /api/v1/merchant/:id/enable - 启用商户', () => {
    beforeEach(async () => {
      const result = await db.run(`
        INSERT INTO merchants (name, code, contact, phone, status, created_at, updated_at)
        VALUES ('待启用商户', 'TEST_ENABLE', '张三', '13800138001', 'inactive', datetime('now'), datetime('now'))
      `);
      testMerchantId = result.lastID!;
    });

    it('应该成功启用商户', async () => {
      const response = await request(app)
        .post(`/api/v1/merchant/${testMerchantId}/enable`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.merchant.status).toBe('active');
    });
  });

  describe('DELETE /api/v1/merchant/:id - 删除商户', () => {
    it('应该成功删除没有员工的商户', async () => {
      const result = await db.run(`
        INSERT INTO merchants (name, code, contact, phone, status, created_at, updated_at)
        VALUES ('待删除商户', 'TEST_DELETE', '张三', '13800138001', 'active', datetime('now'), datetime('now'))
      `);
      const merchantId = result.lastID!;

      const response = await request(app)
        .delete(`/api/v1/merchant/${merchantId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // 验证商户已被删除
      const merchant = await db.get('SELECT * FROM merchants WHERE id = ?', [merchantId]);
      expect(merchant).toBeUndefined();
    });

    it('应该拒绝删除有员工的商户', async () => {
      const result = await db.run(`
        INSERT INTO merchants (name, code, contact, phone, status, created_at, updated_at)
        VALUES ('有员工的商户', 'TEST_DELETE_WITH_EMP', '张三', '13800138001', 'active', datetime('now'), datetime('now'))
      `);
      const merchantId = result.lastID!;

      // 创建员工
      await db.run(`
        INSERT INTO users (name, phone, user_type, status, merchant_id, created_at, updated_at)
        VALUES ('测试员工', '13800138010', 'employee', 'active', ?, datetime('now'), datetime('now'))
      `, [merchantId]);

      const response = await request(app)
        .delete(`/api/v1/merchant/${merchantId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('商户下存在员工');
    });
  });

  describe('GET /api/v1/merchant/:id/stats - 获取商户统计信息', () => {
    beforeEach(async () => {
      const result = await db.run(`
        INSERT INTO merchants (name, code, contact, phone, status, created_at, updated_at)
        VALUES ('统计测试商户', 'TEST_STATS', '张三', '13800138001', 'active', datetime('now'), datetime('now'))
      `);
      testMerchantId = result.lastID!;

      // 创建测试数据
      await db.run(`
        INSERT INTO users (name, phone, user_type, status, merchant_id, created_at, updated_at)
        VALUES 
        ('员工1', '13800138011', 'employee', 'active', ?, datetime('now'), datetime('now')),
        ('员工2', '13800138012', 'employee', 'inactive', ?, datetime('now'), datetime('now'))
      `, [testMerchantId, testMerchantId]);

      await db.run(`
        INSERT INTO visitor_applications (applicant_id, merchant_id, visitor_name, visitor_phone, visit_purpose, scheduled_time, status, created_at, updated_at)
        VALUES 
        (1, ?, '访客1', '13800138021', '商务洽谈', datetime('now', '+1 day'), 'pending', datetime('now'), datetime('now')),
        (1, ?, '访客2', '13800138022', '技术交流', datetime('now', '+2 day'), 'approved', datetime('now'), datetime('now'))
      `, [testMerchantId, testMerchantId]);
    });

    it('应该返回商户统计信息', async () => {
      const response = await request(app)
        .get(`/api/v1/merchant/${testMerchantId}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toMatchObject({
        employees: {
          total: 2,
          active: 1,
          inactive: 1
        },
        visitors: {
          total: 2,
          pending: 1,
          approved: 1,
          rejected: 0
        },
        access: {
          total: expect.any(Number),
          success: expect.any(Number),
          failed: expect.any(Number)
        }
      });
    });
  });

  describe('权限管理测试', () => {
    beforeEach(async () => {
      const result = await db.run(`
        INSERT INTO merchants (name, code, contact, phone, status, created_at, updated_at)
        VALUES ('权限测试商户', 'TEST_PERM', '张三', '13800138001', 'active', datetime('now'), datetime('now'))
      `);
      testMerchantId = result.lastID!;

      // 创建测试权限
      await db.run(`
        INSERT INTO permissions (code, name, description, resource_type, resource_id, actions, created_at)
        VALUES 
        ('project:1:access', '项目1通行权限', '允许通行项目1', 'project', 1, '["read", "access"]', datetime('now')),
        ('venue:1:access', '场地1通行权限', '允许通行场地1', 'venue', 1, '["read", "access"]', datetime('now'))
      `);
    });

    it('应该成功分配权限给商户', async () => {
      const response = await request(app)
        .post(`/api/v1/merchant/${testMerchantId}/permissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          permissionIds: [1, 2]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // 验证权限已分配
      const permissions = await db.all(
        'SELECT * FROM merchant_permissions WHERE merchant_id = ?',
        [testMerchantId]
      );
      expect(permissions.length).toBe(2);
    });

    it('应该成功获取商户权限', async () => {
      // 先分配权限
      await db.run(`
        INSERT INTO merchant_permissions (merchant_id, permission_code, granted_at)
        VALUES (?, 'project:1:access', datetime('now'))
      `, [testMerchantId]);

      const response = await request(app)
        .get(`/api/v1/merchant/${testMerchantId}/permissions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.permissions).toBeInstanceOf(Array);
      expect(response.body.data.permissions.length).toBeGreaterThan(0);
    });

    it('应该成功移除商户权限', async () => {
      // 先分配权限
      await db.run(`
        INSERT INTO merchant_permissions (merchant_id, permission_code, granted_at)
        VALUES 
        (?, 'project:1:access', datetime('now')),
        (?, 'venue:1:access', datetime('now'))
      `, [testMerchantId, testMerchantId]);

      const response = await request(app)
        .delete(`/api/v1/merchant/${testMerchantId}/permissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          permissionIds: [1]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // 验证权限已移除
      const permissions = await db.all(
        'SELECT * FROM merchant_permissions WHERE merchant_id = ?',
        [testMerchantId]
      );
      expect(permissions.length).toBe(1);
    });
  });

  describe('认证和授权测试', () => {
    it('应该拒绝未认证的请求', async () => {
      const response = await request(app)
        .get('/api/v1/merchant');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('应该拒绝无效的token', async () => {
      const response = await request(app)
        .get('/api/v1/merchant')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});