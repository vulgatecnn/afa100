/**
 * 用户管理 CRUD 集成测试
 * 测试用户创建、查询、更新、删除的完整流程
 * 验证前端界面操作与后端数据同步
 * 测试数据验证和错误处理
 * 
 * 需求: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { IntegrationTestHelper } from '../helpers/integration-test-helper.js';
import { TestDataFactory } from '../helpers/test-data-factory.js';
import type { User, UserType, UserStatus, ApiResponse } from '../../src/types/index.js';

describe('用户管理 CRUD 集成测试', () => {
  let testHelper: IntegrationTestHelper;
  let authToken: string;
  let testUser: any;
  let testMerchant: any;

  beforeEach(async () => {
    // 设置集成测试环境
    testHelper = await IntegrationTestHelper.quickSetup({
      environment: 'integration',
      seedOptions: {
        merchants: 2,
        users: 5,
        projects: 1,
        venues: 2,
        floors: 3
      }
    });

    // 创建认证用户并登录
    const { user, authResponse } = await testHelper.createAndLoginUser('tenant_admin');
    testUser = user;
    authToken = authResponse.accessToken;

    // 获取测试商户
    const seedData = testHelper.getSeedData();
    testMerchant = seedData.merchants[0];
  });

  afterEach(async () => {
    await testHelper.cleanup();
  });

  describe('用户创建 (CREATE)', () => {
    it('应该成功创建新用户', async () => {
      // 准备测试数据
      const newUserData = {
        name: '新用户测试',
        phone: '13800138999',
        user_type: 'employee' as UserType,
        merchant_id: testMerchant.id,
        status: 'active' as UserStatus
      };

      // 发送创建用户请求
      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newUserData)
        .expect(201);

      // 验证响应格式
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('创建');
      expect(response.body.data).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      // 验证创建的用户数据
      const createdUser = response.body.data.user || response.body.data;
      expect(createdUser.name).toBe(newUserData.name);
      expect(createdUser.phone).toBe(newUserData.phone);
      expect(createdUser.user_type).toBe(newUserData.user_type);
      expect(createdUser.merchant_id).toBe(newUserData.merchant_id);
      expect(createdUser.status).toBe(newUserData.status);
      expect(createdUser.id).toBeDefined();
      expect(createdUser.created_at).toBeDefined();
      expect(createdUser.updated_at).toBeDefined();
    });

    it('应该验证必填字段', async () => {
      // 测试缺少必填字段
      const invalidUserData = {
        phone: '13800138999'
        // 缺少 name 和 user_type
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('必填');
    });

    it('应该验证手机号格式', async () => {
      const invalidUserData = {
        name: '测试用户',
        phone: '123456789', // 无效手机号
        user_type: 'employee' as UserType,
        merchant_id: testMerchant.id
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('手机号');
    });

    it('应该防止重复手机号', async () => {
      const userData = {
        name: '测试用户1',
        phone: '13800138888',
        user_type: 'employee' as UserType,
        merchant_id: testMerchant.id
      };

      // 第一次创建应该成功
      await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(201);

      // 第二次创建相同手机号应该失败
      const duplicateUserData = {
        ...userData,
        name: '测试用户2'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('已存在');
    });

    it('应该验证用户类型', async () => {
      const invalidUserData = {
        name: '测试用户',
        phone: '13800138999',
        user_type: 'invalid_type', // 无效用户类型
        merchant_id: testMerchant.id
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('用户类型');
    });
  });

  describe('用户查询 (READ)', () => {
    let createdUsers: User[];

    beforeEach(async () => {
      // 创建测试用户
      createdUsers = [];
      for (let i = 0; i < 3; i++) {
        const userData = {
          name: `测试用户${i + 1}`,
          phone: `1380013800${i}`,
          user_type: 'employee' as UserType,
          merchant_id: testMerchant.id,
          status: i === 2 ? 'inactive' as UserStatus : 'active' as UserStatus
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .set('Authorization', `Bearer ${authToken}`)
          .send(userData)
          .expect(201);

        createdUsers.push(response.body.data.user || response.body.data);
      }
    });

    it('应该获取用户列表', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const users = response.body.data.items || response.body.data;
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);

      // 验证用户数据结构
      const user = users[0];
      expect(user.id).toBeDefined();
      expect(user.name).toBeDefined();
      expect(user.user_type).toBeDefined();
      expect(user.status).toBeDefined();
      expect(user.created_at).toBeDefined();
    });

    it('应该支持分页查询', async () => {
      const response = await request(app)
        .get('/api/v1/users?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.data.items) {
        // 分页响应格式
        expect(response.body.data.items).toBeDefined();
        expect(response.body.data.pagination).toBeDefined();
        expect(response.body.data.pagination.page).toBe(1);
        expect(response.body.data.pagination.limit).toBe(2);
        expect(response.body.data.items.length).toBeLessThanOrEqual(2);
      } else {
        // 简单数组响应格式
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('应该支持按状态筛选', async () => {
      const response = await request(app)
        .get('/api/v1/users?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const users = response.body.data.items || response.body.data;
      expect(Array.isArray(users)).toBe(true);
      
      // 验证所有返回的用户都是活跃状态
      users.forEach((user: User) => {
        expect(user.status).toBe('active');
      });
    });

    it('应该支持按用户类型筛选', async () => {
      const response = await request(app)
        .get('/api/v1/users?user_type=employee')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const users = response.body.data.items || response.body.data;
      expect(Array.isArray(users)).toBe(true);
      
      // 验证所有返回的用户都是员工类型
      users.forEach((user: User) => {
        expect(user.user_type).toBe('employee');
      });
    });

    it('应该根据ID获取用户详情', async () => {
      const userId = createdUsers[0].id;
      
      const response = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const user = response.body.data.user || response.body.data;
      expect(user.id).toBe(userId);
      expect(user.name).toBe(createdUsers[0].name);
      expect(user.phone).toBe(createdUsers[0].phone);
    });

    it('应该处理不存在的用户ID', async () => {
      const nonExistentId = 99999;
      
      const response = await request(app)
        .get(`/api/v1/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('不存在');
    });
  });

  describe('用户更新 (UPDATE)', () => {
    let targetUser: User;

    beforeEach(async () => {
      // 创建目标用户
      const userData = {
        name: '待更新用户',
        phone: '13800138777',
        user_type: 'employee' as UserType,
        merchant_id: testMerchant.id,
        status: 'active' as UserStatus
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(201);

      targetUser = response.body.data.user || response.body.data;
    });

    it('应该成功更新用户信息', async () => {
      const updateData = {
        name: '已更新用户',
        status: 'inactive' as UserStatus
      };

      const response = await request(app)
        .put(`/api/v1/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('更新');
      
      const updatedUser = response.body.data.user || response.body.data;
      expect(updatedUser.id).toBe(targetUser.id);
      expect(updatedUser.name).toBe(updateData.name);
      expect(updatedUser.status).toBe(updateData.status);
      expect(updatedUser.phone).toBe(targetUser.phone); // 未更新的字段保持不变
      expect(updatedUser.updated_at).not.toBe(targetUser.updated_at); // 更新时间应该改变
    });

    it('应该支持部分字段更新', async () => {
      const updateData = {
        name: '部分更新用户'
        // 只更新名称，其他字段保持不变
      };

      const response = await request(app)
        .put(`/api/v1/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const updatedUser = response.body.data.user || response.body.data;
      expect(updatedUser.name).toBe(updateData.name);
      expect(updatedUser.phone).toBe(targetUser.phone);
      expect(updatedUser.user_type).toBe(targetUser.user_type);
      expect(updatedUser.status).toBe(targetUser.status);
    });

    it('应该验证更新数据格式', async () => {
      const invalidUpdateData = {
        phone: '123456789', // 无效手机号格式
        status: 'invalid_status' // 无效状态
      };

      const response = await request(app)
        .put(`/api/v1/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/(手机号|状态)/);
    });

    it('应该防止更新为重复手机号', async () => {
      // 创建另一个用户
      const anotherUserData = {
        name: '另一个用户',
        phone: '13800138666',
        user_type: 'employee' as UserType,
        merchant_id: testMerchant.id
      };

      await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(anotherUserData)
        .expect(201);

      // 尝试将目标用户的手机号更新为已存在的手机号
      const updateData = {
        phone: anotherUserData.phone
      };

      const response = await request(app)
        .put(`/api/v1/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('已存在');
    });

    it('应该处理不存在的用户更新', async () => {
      const nonExistentId = 99999;
      const updateData = {
        name: '不存在的用户'
      };

      const response = await request(app)
        .put(`/api/v1/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('不存在');
    });

    it('应该验证数据同步一致性', async () => {
      const updateData = {
        name: '同步测试用户',
        status: 'inactive' as UserStatus
      };

      // 更新用户
      const updateResponse = await request(app)
        .put(`/api/v1/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      // 立即查询验证数据同步
      const getResponse = await request(app)
        .get(`/api/v1/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const updatedUser = updateResponse.body.data.user || updateResponse.body.data;
      const queriedUser = getResponse.body.data.user || getResponse.body.data;

      expect(queriedUser.name).toBe(updatedUser.name);
      expect(queriedUser.status).toBe(updatedUser.status);
      expect(queriedUser.updated_at).toBe(updatedUser.updated_at);
    });
  });

  describe('用户删除 (DELETE)', () => {
    let targetUser: User;

    beforeEach(async () => {
      // 创建目标用户
      const userData = {
        name: '待删除用户',
        phone: '13800138555',
        user_type: 'employee' as UserType,
        merchant_id: testMerchant.id,
        status: 'active' as UserStatus
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(201);

      targetUser = response.body.data.user || response.body.data;
    });

    it('应该成功删除用户（软删除）', async () => {
      const response = await request(app)
        .delete(`/api/v1/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('删除');

      // 验证用户被软删除（状态变为inactive）
      const getResponse = await request(app)
        .get(`/api/v1/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (getResponse.status === 200) {
        // 如果还能查到用户，应该是软删除（状态为inactive）
        const user = getResponse.body.data.user || getResponse.body.data;
        expect(user.status).toBe('inactive');
      } else {
        // 如果查不到用户，说明是物理删除
        expect(getResponse.status).toBe(404);
      }
    });

    it('应该处理不存在的用户删除', async () => {
      const nonExistentId = 99999;

      const response = await request(app)
        .delete(`/api/v1/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('不存在');
    });

    it('应该验证删除权限', async () => {
      // 创建普通员工用户并登录
      const employeeData = {
        name: '普通员工',
        phone: '13800138444',
        user_type: 'employee' as UserType,
        merchant_id: testMerchant.id
      };

      const employeeResponse = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(employeeData)
        .expect(201);

      const employee = employeeResponse.body.data.user || employeeResponse.body.data;

      // 模拟员工登录（这里简化处理，实际应该通过登录接口获取token）
      const employeeToken = `mock-employee-token-${employee.id}`;

      // 员工尝试删除其他用户应该被拒绝
      const response = await request(app)
        .delete(`/api/v1/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('权限');
    });
  });

  describe('错误处理和边界情况', () => {
    it('应该处理无效的认证token', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('认证');
    });

    it('应该处理缺失的认证token', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('认证');
    });

    it('应该处理无效的用户ID格式', async () => {
      const response = await request(app)
        .get('/api/v1/users/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('ID');
    });

    it('应该处理空的请求体', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('必填');
    });

    it('应该处理超长字段值', async () => {
      const longName = 'a'.repeat(256); // 超长名称
      const userData = {
        name: longName,
        phone: '13800138999',
        user_type: 'employee' as UserType,
        merchant_id: testMerchant.id
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('长度');
    });
  });

  describe('并发操作测试', () => {
    it('应该处理并发创建用户', async () => {
      const promises = [];
      
      // 并发创建多个用户
      for (let i = 0; i < 5; i++) {
        const userData = {
          name: `并发用户${i}`,
          phone: `1380013810${i}`,
          user_type: 'employee' as UserType,
          merchant_id: testMerchant.id
        };

        promises.push(
          request(app)
            .post('/api/v1/auth/register')
            .set('Authorization', `Bearer ${authToken}`)
            .send(userData)
        );
      }

      const responses = await Promise.all(promises);
      
      // 验证所有请求都成功
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        
        const user = response.body.data.user || response.body.data;
        expect(user.name).toBe(`并发用户${index}`);
      });
    });

    it('应该处理并发更新同一用户', async () => {
      // 创建目标用户
      const userData = {
        name: '并发测试用户',
        phone: '13800138333',
        user_type: 'employee' as UserType,
        merchant_id: testMerchant.id
      };

      const createResponse = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(201);

      const user = createResponse.body.data.user || createResponse.body.data;

      // 并发更新同一用户
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          request(app)
            .put(`/api/v1/users/${user.id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ name: `并发更新${i}` })
        );
      }

      const responses = await Promise.all(promises);
      
      // 至少有一个更新应该成功
      const successfulUpdates = responses.filter(r => r.status === 200);
      expect(successfulUpdates.length).toBeGreaterThan(0);
    });
  });

  describe('数据完整性验证', () => {
    it('应该保持数据关联完整性', async () => {
      // 创建用户时验证商户关联
      const userData = {
        name: '关联测试用户',
        phone: '13800138222',
        user_type: 'employee' as UserType,
        merchant_id: testMerchant.id
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(201);

      const user = response.body.data.user || response.body.data;
      
      // 验证用户与商户的关联
      expect(user.merchant_id).toBe(testMerchant.id);

      // 查询商户下的用户列表验证关联
      const merchantUsersResponse = await request(app)
        .get(`/api/v1/users?merchant_id=${testMerchant.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const merchantUsers = merchantUsersResponse.body.data.items || merchantUsersResponse.body.data;
      const foundUser = merchantUsers.find((u: User) => u.id === user.id);
      expect(foundUser).toBeDefined();
    });

    it('应该验证外键约束', async () => {
      // 尝试创建用户时使用不存在的商户ID
      const userData = {
        name: '外键测试用户',
        phone: '13800138111',
        user_type: 'employee' as UserType,
        merchant_id: 99999 // 不存在的商户ID
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('商户');
    });
  });
});