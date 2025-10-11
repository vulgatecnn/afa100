import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { Database } from '../../src/utils/database.js';

describe('空间管理接口测试', () => {
  let db: Database;
  let authToken: string;
  let testProjectId: number;
  let testVenueId: number;
  let testFloorId: number;

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
    await db.run('DELETE FROM floors WHERE code LIKE "TEST_%"');
    await db.run('DELETE FROM venues WHERE code LIKE "TEST_%"');
    await db.run('DELETE FROM projects WHERE code LIKE "TEST_%"');
    await db.run('DELETE FROM users WHERE phone = "13800138000"');
    await db.close();
  });

  beforeEach(async () => {
    // 清理之前的测试数据
    await db.run('DELETE FROM floors WHERE code LIKE "TEST_%"');
    await db.run('DELETE FROM venues WHERE code LIKE "TEST_%"');
    await db.run('DELETE FROM projects WHERE code LIKE "TEST_%"');
  });

  describe('项目管理测试', () => {
    describe('POST /api/v1/space/projects - 创建项目', () => {
      it('应该成功创建项目', async () => {
        const projectData = {
          name: '测试项目',
          code: 'TEST_PROJECT_001',
          description: '这是一个测试项目'
        };

        const response = await request(app)
          .post('/api/v1/space/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send(projectData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.project).toMatchObject({
          name: projectData.name,
          code: projectData.code,
          description: projectData.description,
          status: 'active'
        });

        testProjectId = response.body.data.project.id;
      });

      it('应该拒绝重复的项目编码', async () => {
        // 先创建一个项目
        await request(app)
          .post('/api/v1/space/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: '测试项目1',
            code: 'TEST_DUPLICATE_PROJECT'
          });

        // 尝试创建相同编码的项目
        const response = await request(app)
          .post('/api/v1/space/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: '测试项目2',
            code: 'TEST_DUPLICATE_PROJECT'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('项目编码已存在');
      });

      it('应该验证必填字段', async () => {
        const response = await request(app)
          .post('/api/v1/space/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: '测试项目'
            // 缺少 code 字段
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/v1/space/projects - 获取项目列表', () => {
      beforeEach(async () => {
        // 创建测试项目数据
        await db.run(`
          INSERT INTO projects (name, code, description, status, created_at, updated_at)
          VALUES 
          ('测试项目A', 'TEST_PROJECT_A', '项目A描述', 'active', datetime('now'), datetime('now')),
          ('测试项目B', 'TEST_PROJECT_B', '项目B描述', 'inactive', datetime('now'), datetime('now')),
          ('测试项目C', 'TEST_PROJECT_C', '项目C描述', 'active', datetime('now'), datetime('now'))
        `);
      });

      it('应该返回项目列表', async () => {
        const response = await request(app)
          .get('/api/v1/space/projects')
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

      it('应该支持状态筛选', async () => {
        const response = await request(app)
          .get('/api/v1/space/projects?status=active')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        response.body.data.data.forEach((project: any) => {
          expect(project.status).toBe('active');
        });
      });

      it('应该支持搜索功能', async () => {
        const response = await request(app)
          .get('/api/v1/space/projects?search=测试项目A')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.data.length).toBeGreaterThan(0);
        expect(response.body.data.data[0].name).toContain('测试项目A');
      });
    });

    describe('PUT /api/v1/space/projects/:id - 更新项目', () => {
      beforeEach(async () => {
        const result = await db.run(`
          INSERT INTO projects (name, code, description, status, created_at, updated_at)
          VALUES ('原始项目名', 'TEST_UPDATE_PROJECT', '原始描述', 'active', datetime('now'), datetime('now'))
        `);
        testProjectId = result.lastID!;
      });

      it('应该成功更新项目信息', async () => {
        const updateData = {
          name: '更新后的项目名',
          description: '更新后的描述'
        };

        const response = await request(app)
          .put(`/api/v1/space/projects/${testProjectId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.project).toMatchObject({
          id: testProjectId,
          name: updateData.name,
          description: updateData.description
        });
      });
    });

    describe('DELETE /api/v1/space/projects/:id - 删除项目', () => {
      it('应该成功删除没有场地的项目', async () => {
        const result = await db.run(`
          INSERT INTO projects (name, code, description, status, created_at, updated_at)
          VALUES ('待删除项目', 'TEST_DELETE_PROJECT', '描述', 'active', datetime('now'), datetime('now'))
        `);
        const projectId = result.lastID!;

        const response = await request(app)
          .delete(`/api/v1/space/projects/${projectId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // 验证项目已被删除
        const project = await db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
        expect(project).toBeUndefined();
      });

      it('应该拒绝删除有场地的项目', async () => {
        const projectResult = await db.run(`
          INSERT INTO projects (name, code, description, status, created_at, updated_at)
          VALUES ('有场地的项目', 'TEST_DELETE_WITH_VENUE', '描述', 'active', datetime('now'), datetime('now'))
        `);
        const projectId = projectResult.lastID!;

        // 创建场地
        await db.run(`
          INSERT INTO venues (project_id, name, code, status, created_at, updated_at)
          VALUES (?, '测试场地', 'TEST_VENUE', 'active', datetime('now'), datetime('now'))
        `, [projectId]);

        const response = await request(app)
          .delete(`/api/v1/space/projects/${projectId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('项目下存在场地');
      });
    });
  });

  describe('场地管理测试', () => {
    beforeEach(async () => {
      // 创建测试项目
      const result = await db.run(`
        INSERT INTO projects (name, code, description, status, created_at, updated_at)
        VALUES ('测试项目', 'TEST_PROJECT_FOR_VENUE', '项目描述', 'active', datetime('now'), datetime('now'))
      `);
      testProjectId = result.lastID!;
    });

    describe('POST /api/v1/space/venues - 创建场地', () => {
      it('应该成功创建场地', async () => {
        const venueData = {
          project_id: testProjectId,
          name: '测试场地',
          code: 'TEST_VENUE_001',
          description: '这是一个测试场地'
        };

        const response = await request(app)
          .post('/api/v1/space/venues')
          .set('Authorization', `Bearer ${authToken}`)
          .send(venueData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.venue).toMatchObject({
          project_id: venueData.project_id,
          name: venueData.name,
          code: venueData.code,
          description: venueData.description,
          status: 'active'
        });

        testVenueId = response.body.data.venue.id;
      });

      it('应该拒绝在同一项目内重复的场地编码', async () => {
        // 先创建一个场地
        await request(app)
          .post('/api/v1/space/venues')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            project_id: testProjectId,
            name: '测试场地1',
            code: 'TEST_DUPLICATE_VENUE'
          });

        // 尝试在同一项目内创建相同编码的场地
        const response = await request(app)
          .post('/api/v1/space/venues')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            project_id: testProjectId,
            name: '测试场地2',
            code: 'TEST_DUPLICATE_VENUE'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('场地编码在该项目内已存在');
      });

      it('应该验证项目是否存在', async () => {
        const response = await request(app)
          .post('/api/v1/space/venues')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            project_id: 99999, // 不存在的项目ID
            name: '测试场地',
            code: 'TEST_VENUE'
          });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('项目不存在');
      });
    });

    describe('GET /api/v1/space/venues - 获取场地列表', () => {
      beforeEach(async () => {
        // 创建测试场地数据
        await db.run(`
          INSERT INTO venues (project_id, name, code, description, status, created_at, updated_at)
          VALUES 
          (?, '测试场地A', 'TEST_VENUE_A', '场地A描述', 'active', datetime('now'), datetime('now')),
          (?, '测试场地B', 'TEST_VENUE_B', '场地B描述', 'inactive', datetime('now'), datetime('now'))
        `, [testProjectId, testProjectId]);
      });

      it('应该返回场地列表', async () => {
        const response = await request(app)
          .get('/api/v1/space/venues')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.data).toBeInstanceOf(Array);
      });

      it('应该支持按项目筛选', async () => {
        const response = await request(app)
          .get(`/api/v1/space/venues?projectId=${testProjectId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        response.body.data.data.forEach((venue: any) => {
          expect(venue.project_id).toBe(testProjectId);
        });
      });
    });
  });

  describe('楼层管理测试', () => {
    beforeEach(async () => {
      // 创建测试项目和场地
      const projectResult = await db.run(`
        INSERT INTO projects (name, code, description, status, created_at, updated_at)
        VALUES ('测试项目', 'TEST_PROJECT_FOR_FLOOR', '项目描述', 'active', datetime('now'), datetime('now'))
      `);
      testProjectId = projectResult.lastID!;

      const venueResult = await db.run(`
        INSERT INTO venues (project_id, name, code, description, status, created_at, updated_at)
        VALUES (?, '测试场地', 'TEST_VENUE_FOR_FLOOR', '场地描述', 'active', datetime('now'), datetime('now'))
      `, [testProjectId]);
      testVenueId = venueResult.lastID!;
    });

    describe('POST /api/v1/space/floors - 创建楼层', () => {
      it('应该成功创建楼层', async () => {
        const floorData = {
          venue_id: testVenueId,
          name: '1楼',
          code: 'F1',
          description: '一楼大厅'
        };

        const response = await request(app)
          .post('/api/v1/space/floors')
          .set('Authorization', `Bearer ${authToken}`)
          .send(floorData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.floor).toMatchObject({
          venue_id: floorData.venue_id,
          name: floorData.name,
          code: floorData.code,
          description: floorData.description,
          status: 'active'
        });

        testFloorId = response.body.data.floor.id;
      });

      it('应该拒绝在同一场地内重复的楼层编码', async () => {
        // 先创建一个楼层
        await request(app)
          .post('/api/v1/space/floors')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            venue_id: testVenueId,
            name: '1楼',
            code: 'F1'
          });

        // 尝试在同一场地内创建相同编码的楼层
        const response = await request(app)
          .post('/api/v1/space/floors')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            venue_id: testVenueId,
            name: '一楼',
            code: 'F1'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('楼层编码在该场地内已存在');
      });

      it('应该验证场地是否存在', async () => {
        const response = await request(app)
          .post('/api/v1/space/floors')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            venue_id: 99999, // 不存在的场地ID
            name: '1楼',
            code: 'F1'
          });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('场地不存在');
      });
    });

    describe('GET /api/v1/space/floors - 获取楼层列表', () => {
      beforeEach(async () => {
        // 创建测试楼层数据
        await db.run(`
          INSERT INTO floors (venue_id, name, code, description, status, created_at, updated_at)
          VALUES 
          (?, '1楼', 'F1', '一楼大厅', 'active', datetime('now'), datetime('now')),
          (?, '2楼', 'F2', '二楼办公区', 'active', datetime('now'), datetime('now'))
        `, [testVenueId, testVenueId]);
      });

      it('应该返回楼层列表', async () => {
        const response = await request(app)
          .get('/api/v1/space/floors')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.data).toBeInstanceOf(Array);
      });

      it('应该支持按场地筛选', async () => {
        const response = await request(app)
          .get(`/api/v1/space/floors?venueId=${testVenueId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        response.body.data.data.forEach((floor: any) => {
          expect(floor.venue_id).toBe(testVenueId);
        });
      });
    });
  });

  describe('层级结构查询测试', () => {
    beforeEach(async () => {
      // 创建完整的层级结构
      const projectResult = await db.run(`
        INSERT INTO projects (name, code, description, status, created_at, updated_at)
        VALUES ('测试项目', 'TEST_HIERARCHY_PROJECT', '项目描述', 'active', datetime('now'), datetime('now'))
      `);
      testProjectId = projectResult.lastID!;

      const venueResult = await db.run(`
        INSERT INTO venues (project_id, name, code, description, status, created_at, updated_at)
        VALUES (?, '测试场地', 'TEST_HIERARCHY_VENUE', '场地描述', 'active', datetime('now'), datetime('now'))
      `, [testProjectId]);
      testVenueId = venueResult.lastID!;

      await db.run(`
        INSERT INTO floors (venue_id, name, code, description, status, created_at, updated_at)
        VALUES 
        (?, '1楼', 'F1', '一楼', 'active', datetime('now'), datetime('now')),
        (?, '2楼', 'F2', '二楼', 'active', datetime('now'), datetime('now'))
      `, [testVenueId, testVenueId]);
    });

    describe('GET /api/v1/space/hierarchy - 获取空间层级结构', () => {
      it('应该返回完整的层级结构', async () => {
        const response = await request(app)
          .get('/api/v1/space/hierarchy')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.hierarchy).toBeInstanceOf(Array);

        // 验证层级结构
        const hierarchy = response.body.data.hierarchy;
        const testProject = hierarchy.find((p: any) => p.id === testProjectId);
        expect(testProject).toBeDefined();
        expect(testProject.venues).toBeInstanceOf(Array);
        expect(testProject.venues.length).toBeGreaterThan(0);
        expect(testProject.venues[0].floors).toBeInstanceOf(Array);
        expect(testProject.venues[0].floors.length).toBeGreaterThan(0);
      });

      it('应该支持按项目筛选层级结构', async () => {
        const response = await request(app)
          .get(`/api/v1/space/hierarchy?projectId=${testProjectId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.hierarchy).toBeInstanceOf(Array);
        expect(response.body.data.hierarchy.length).toBe(1);
        expect(response.body.data.hierarchy[0].id).toBe(testProjectId);
      });
    });
  });

  describe('商户空间权限测试', () => {
    let testMerchantId: number;

    beforeEach(async () => {
      // 创建测试商户
      const merchantResult = await db.run(`
        INSERT INTO merchants (name, code, contact, status, created_at, updated_at)
        VALUES ('测试商户', 'TEST_MERCHANT_SPACE', '张三', 'active', datetime('now'), datetime('now'))
      `);
      testMerchantId = merchantResult.lastID!;

      // 创建测试项目
      const projectResult = await db.run(`
        INSERT INTO projects (name, code, description, status, created_at, updated_at)
        VALUES ('测试项目', 'TEST_MERCHANT_PROJECT', '项目描述', 'active', datetime('now'), datetime('now'))
      `);
      testProjectId = projectResult.lastID!;

      // 创建权限
      await db.run(`
        INSERT INTO permissions (code, name, description, resource_type, resource_id, actions, created_at)
        VALUES ('project:${testProjectId}:access', '项目通行权限', '允许通行项目', 'project', ?, '["read", "access"]', datetime('now'))
      `, [testProjectId]);

      // 分配权限给商户
      await db.run(`
        INSERT INTO merchant_permissions (merchant_id, permission_code, granted_at)
        VALUES (?, 'project:${testProjectId}:access', datetime('now'))
      `, [testMerchantId]);
    });

    describe('GET /api/v1/space/merchants/:merchantId/spaces - 获取商户关联空间', () => {
      it('应该返回商户有权限的空间', async () => {
        const response = await request(app)
          .get(`/api/v1/space/merchants/${testMerchantId}/spaces`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.spaces).toBeInstanceOf(Array);
        expect(response.body.data.spaces.length).toBeGreaterThan(0);
        expect(response.body.data.spaces[0]).toMatchObject({
          resource_id: testProjectId,
          resource_type: 'project',
          permission_code: `project:${testProjectId}:access`
        });
      });
    });
  });

  describe('认证和授权测试', () => {
    it('应该拒绝未认证的请求', async () => {
      const response = await request(app)
        .get('/api/v1/space/projects');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('应该拒绝无效的token', async () => {
      const response = await request(app)
        .get('/api/v1/space/projects')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});