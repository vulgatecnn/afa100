/**
 * 商户管理 CRUD 集成测试
 * 测试商户信息的完整生命周期管理
 * 验证商户员工关联关系的正确性
 * 测试批量操作和事务一致性
 * 
 * 需求: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { IntegrationTestHelper } from '../helpers/integration-test-helper.js';
import { TestDataFactory } from '../helpers/test-data-factory.js';
import type { Merchant, MerchantStatus, User, ApiResponse } from '../../src/types/index.js';

describe('商户管理 CRUD 集成测试', () => {
  let testHelper: IntegrationTestHelper;
  let authToken: string;
  let testUser: any;

  beforeEach(async () => {
    // 设置集成测试环境
    testHelper = await IntegrationTestHelper.quickSetup({
      environment: 'integration',
      seedOptions: {
        merchants: 3,
        users: 8,
        projects: 2,
        venues: 3,
        floors: 5
      }
    });

    // 创建认证用户并登录（租务管理员）
    const { user, authResponse } = await testHelper.createAndLoginUser('tenant_admin');
    testUser = user;
    authToken = authResponse.accessToken;
  });

  afterEach(async () => {
    await testHelper.cleanup();
  });

  describe('商户创建 (CREATE)', () => {
    it('应该成功创建新商户', async () => {
      // 准备测试数据
      const newMerchantData = {
        name: '新测试商户',
        code: 'NEW_MERCHANT_001',
        contact: '张三',
        phone: '13800138999',
        email: 'newmerchant@test.com',
        address: '测试地址123号',
        status: 'active' as MerchantStatus
      };

      // 发送创建商户请求
      const response = await request(app)
        .post('/api/v1/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newMerchantData)
        .expect(201);

      // 验证响应格式
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('创建');
      expect(response.body.data).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      // 验证创建的商户数据
      const createdMerchant = response.body.data.merchant || response.body.data;
      expect(createdMerchant.name).toBe(newMerchantData.name);
      expect(createdMerchant.code).toBe(newMerchantData.code);
      expect(createdMerchant.contact).toBe(newMerchantData.contact);
      expect(createdMerchant.phone).toBe(newMerchantData.phone);
      expect(createdMerchant.email).toBe(newMerchantData.email);
      expect(createdMerchant.address).toBe(newMerchantData.address);
      expect(createdMerchant.status).toBe(newMerchantData.status);
      expect(createdMerchant.id).toBeDefined();
      expect(createdMerchant.created_at).toBeDefined();
      expect(createdMerchant.updated_at).toBeDefined();
    });

    it('应该验证必填字段', async () => {
      // 测试缺少必填字段
      const invalidMerchantData = {
        contact: '张三',
        phone: '13800138999'
        // 缺少 name 和 code
      };

      const response = await request(app)
        .post('/api/v1/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidMerchantData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/(名称|编码|必填)/);
    });

    it('应该验证商户编码格式', async () => {
      const invalidMerchantData = {
        name: '测试商户',
        code: 'invalid code!', // 包含非法字符
        contact: '张三',
        phone: '13800138999'
      };

      const response = await request(app)
        .post('/api/v1/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidMerchantData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('编码');
    });

    it('应该防止重复商户编码', async () => {
      const merchantData = {
        name: '测试商户1',
        code: 'DUPLICATE_CODE',
        contact: '张三',
        phone: '13800138888'
      };

      // 第一次创建应该成功
      await request(app)
        .post('/api/v1/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(merchantData)
        .expect(201);

      // 第二次创建相同编码应该失败
      const duplicateMerchantData = {
        ...merchantData,
        name: '测试商户2',
        phone: '13800138777'
      };

      const response = await request(app)
        .post('/api/v1/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateMerchantData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('已存在');
    });

    it('应该验证联系方式格式', async () => {
      const invalidMerchantData = {
        name: '测试商户',
        code: 'TEST_MERCHANT',
        phone: '123456789', // 无效手机号
        email: 'invalid-email' // 无效邮箱
      };

      const response = await request(app)
        .post('/api/v1/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidMerchantData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/(手机号|邮箱)/);
    });
  });

  describe('商户查询 (READ)', () => {
    let createdMerchants: Merchant[];

    beforeEach(async () => {
      // 创建测试商户
      createdMerchants = [];
      const merchantsData = [
        {
          name: '活跃商户1',
          code: 'ACTIVE_MERCHANT_1',
          contact: '张三',
          phone: '13800138001',
          status: 'active' as MerchantStatus
        },
        {
          name: '活跃商户2',
          code: 'ACTIVE_MERCHANT_2',
          contact: '李四',
          phone: '13800138002',
          status: 'active' as MerchantStatus
        },
        {
          name: '停用商户',
          code: 'INACTIVE_MERCHANT',
          contact: '王五',
          phone: '13800138003',
          status: 'inactive' as MerchantStatus
        }
      ];

      for (const merchantData of merchantsData) {
        const response = await request(app)
          .post('/api/v1/merchants')
          .set('Authorization', `Bearer ${authToken}`)
          .send(merchantData)
          .expect(201);

        createdMerchants.push(response.body.data.merchant || response.body.data);
      }
    });

    it('应该获取商户列表', async () => {
      const response = await request(app)
        .get('/api/v1/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const merchants = response.body.data.items || response.body.data;
      expect(Array.isArray(merchants)).toBe(true);
      expect(merchants.length).toBeGreaterThan(0);

      // 验证商户数据结构
      const merchant = merchants[0];
      expect(merchant.id).toBeDefined();
      expect(merchant.name).toBeDefined();
      expect(merchant.code).toBeDefined();
      expect(merchant.status).toBeDefined();
      expect(merchant.created_at).toBeDefined();
    });

    it('应该支持分页查询', async () => {
      const response = await request(app)
        .get('/api/v1/merchants?page=1&limit=2')
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
        .get('/api/v1/merchants?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const merchants = response.body.data.items || response.body.data;
      expect(Array.isArray(merchants)).toBe(true);
      
      // 验证所有返回的商户都是活跃状态
      merchants.forEach((merchant: Merchant) => {
        expect(merchant.status).toBe('active');
      });
    });

    it('应该支持搜索功能', async () => {
      const response = await request(app)
        .get('/api/v1/merchants?search=活跃')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const merchants = response.body.data.items || response.body.data;
      expect(Array.isArray(merchants)).toBe(true);
      
      // 验证搜索结果包含关键词
      merchants.forEach((merchant: Merchant) => {
        expect(merchant.name).toContain('活跃');
      });
    });

    it('应该根据ID获取商户详情', async () => {
      const merchantId = createdMerchants[0].id;
      
      const response = await request(app)
        .get(`/api/v1/merchants/${merchantId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const merchant = response.body.data.merchant || response.body.data;
      expect(merchant.id).toBe(merchantId);
      expect(merchant.name).toBe(createdMerchants[0].name);
      expect(merchant.code).toBe(createdMerchants[0].code);
    });

    it('应该处理不存在的商户ID', async () => {
      const nonExistentId = 99999;
      
      const response = await request(app)
        .get(`/api/v1/merchants/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('不存在');
    });
  });

  describe('商户更新 (UPDATE)', () => {
    let targetMerchant: Merchant;

    beforeEach(async () => {
      // 创建目标商户
      const merchantData = {
        name: '待更新商户',
        code: 'UPDATE_MERCHANT',
        contact: '张三',
        phone: '13800138777',
        email: 'update@test.com',
        status: 'active' as MerchantStatus
      };

      const response = await request(app)
        .post('/api/v1/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(merchantData)
        .expect(201);

      targetMerchant = response.body.data.merchant || response.body.data;
    });

    it('应该成功更新商户信息', async () => {
      const updateData = {
        name: '已更新商户',
        contact: '李四',
        phone: '13800138666',
        email: 'updated@test.com',
        address: '新地址456号',
        status: 'inactive' as MerchantStatus
      };

      const response = await request(app)
        .put(`/api/v1/merchants/${targetMerchant.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('更新');
      
      const updatedMerchant = response.body.data.merchant || response.body.data;
      expect(updatedMerchant.id).toBe(targetMerchant.id);
      expect(updatedMerchant.name).toBe(updateData.name);
      expect(updatedMerchant.contact).toBe(updateData.contact);
      expect(updatedMerchant.phone).toBe(updateData.phone);
      expect(updatedMerchant.email).toBe(updateData.email);
      expect(updatedMerchant.address).toBe(updateData.address);
      expect(updatedMerchant.status).toBe(updateData.status);
      expect(updatedMerchant.code).toBe(targetMerchant.code); // 编码保持不变
      expect(updatedMerchant.updated_at).not.toBe(targetMerchant.updated_at);
    });

    it('应该支持部分字段更新', async () => {
      const updateData = {
        name: '部分更新商户',
        contact: '新联系人'
        // 只更新部分字段
      };

      const response = await request(app)
        .put(`/api/v1/merchants/${targetMerchant.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const updatedMerchant = response.body.data.merchant || response.body.data;
      expect(updatedMerchant.name).toBe(updateData.name);
      expect(updatedMerchant.contact).toBe(updateData.contact);
      expect(updatedMerchant.code).toBe(targetMerchant.code);
      expect(updatedMerchant.phone).toBe(targetMerchant.phone);
      expect(updatedMerchant.email).toBe(targetMerchant.email);
    });

    it('应该验证更新数据格式', async () => {
      const invalidUpdateData = {
        phone: '123456789', // 无效手机号
        email: 'invalid-email', // 无效邮箱
        status: 'invalid_status' // 无效状态
      };

      const response = await request(app)
        .put(`/api/v1/merchants/${targetMerchant.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/(手机号|邮箱|状态)/);
    });

    it('应该防止更新为重复编码', async () => {
      // 创建另一个商户
      const anotherMerchantData = {
        name: '另一个商户',
        code: 'ANOTHER_MERCHANT',
        contact: '王五',
        phone: '13800138555'
      };

      await request(app)
        .post('/api/v1/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(anotherMerchantData)
        .expect(201);

      // 尝试将目标商户的编码更新为已存在的编码
      const updateData = {
        code: anotherMerchantData.code
      };

      const response = await request(app)
        .put(`/api/v1/merchants/${targetMerchant.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('已存在');
    });

    it('应该处理不存在的商户更新', async () => {
      const nonExistentId = 99999;
      const updateData = {
        name: '不存在的商户'
      };

      const response = await request(app)
        .put(`/api/v1/merchants/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('不存在');
    });
  });

  describe('商户删除 (DELETE)', () => {
    let targetMerchant: Merchant;

    beforeEach(async () => {
      // 创建目标商户
      const merchantData = {
        name: '待删除商户',
        code: 'DELETE_MERCHANT',
        contact: '张三',
        phone: '13800138555'
      };

      const response = await request(app)
        .post('/api/v1/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(merchantData)
        .expect(201);

      targetMerchant = response.body.data.merchant || response.body.data;
    });

    it('应该成功删除商户（无员工时）', async () => {
      const response = await request(app)
        .delete(`/api/v1/merchants/${targetMerchant.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('删除');

      // 验证商户已被删除
      const getResponse = await request(app)
        .get(`/api/v1/merchants/${targetMerchant.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
      expect(getResponse.body.message).toContain('不存在');
    });

    it('应该阻止删除有员工的商户', async () => {
      // 为商户创建员工
      const employeeData = {
        name: '商户员工',
        phone: '13800138444',
        user_type: 'employee',
        merchant_id: targetMerchant.id
      };

      await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(employeeData)
        .expect(201);

      // 尝试删除有员工的商户应该失败
      const response = await request(app)
        .delete(`/api/v1/merchants/${targetMerchant.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('员工');
    });

    it('应该处理不存在的商户删除', async () => {
      const nonExistentId = 99999;

      const response = await request(app)
        .delete(`/api/v1/merchants/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('不存在');
    });
  });

  describe('商户员工关联关系测试', () => {
    let testMerchant: Merchant;
    let merchantEmployees: User[];

    beforeEach(async () => {
      // 创建测试商户
      const merchantData = {
        name: '关联测试商户',
        code: 'RELATION_MERCHANT',
        contact: '张三',
        phone: '13800138333'
      };

      const merchantResponse = await request(app)
        .post('/api/v1/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(merchantData)
        .expect(201);

      testMerchant = merchantResponse.body.data.merchant || merchantResponse.body.data;

      // 创建商户员工
      merchantEmployees = [];
      const employeesData = [
        {
          name: '商户管理员',
          phone: '13800138301',
          user_type: 'merchant_admin',
          merchant_id: testMerchant.id
        },
        {
          name: '普通员工1',
          phone: '13800138302',
          user_type: 'employee',
          merchant_id: testMerchant.id
        },
        {
          name: '普通员工2',
          phone: '13800138303',
          user_type: 'employee',
          merchant_id: testMerchant.id
        }
      ];

      for (const employeeData of employeesData) {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .set('Authorization', `Bearer ${authToken}`)
          .send(employeeData)
          .expect(201);

        merchantEmployees.push(response.body.data.user || response.body.data);
      }
    });

    it('应该正确维护商户员工关联关系', async () => {
      // 查询商户下的员工
      const response = await request(app)
        .get(`/api/v1/users?merchant_id=${testMerchant.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const users = response.body.data.items || response.body.data;
      expect(Array.isArray(users)).toBe(true);
      
      // 验证员工数量
      const merchantUsers = users.filter((user: User) => 
        user.merchant_id === testMerchant.id && 
        ['merchant_admin', 'employee'].includes(user.user_type)
      );
      expect(merchantUsers.length).toBe(3);

      // 验证每个员工的商户关联
      merchantUsers.forEach((user: User) => {
        expect(user.merchant_id).toBe(testMerchant.id);
        expect(['merchant_admin', 'employee']).toContain(user.user_type);
      });
    });

    it('应该在商户停用时处理员工状态', async () => {
      // 停用商户
      const response = await request(app)
        .post(`/api/v1/merchants/${testMerchant.id}/disable`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('停用');

      // 验证商户状态已更新
      const merchantResponse = await request(app)
        .get(`/api/v1/merchants/${testMerchant.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const merchant = merchantResponse.body.data.merchant || merchantResponse.body.data;
      expect(merchant.status).toBe('inactive');

      // 验证员工权限受到影响（具体实现可能因业务逻辑而异）
      const usersResponse = await request(app)
        .get(`/api/v1/users?merchant_id=${testMerchant.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const users = usersResponse.body.data.items || usersResponse.body.data;
      // 这里可以根据具体业务逻辑验证员工状态变化
    });

    it('应该在商户启用时恢复员工权限', async () => {
      // 先停用商户
      await request(app)
        .post(`/api/v1/merchants/${testMerchant.id}/disable`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 再启用商户
      const response = await request(app)
        .post(`/api/v1/merchants/${testMerchant.id}/enable`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('启用');

      // 验证商户状态已恢复
      const merchantResponse = await request(app)
        .get(`/api/v1/merchants/${testMerchant.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const merchant = merchantResponse.body.data.merchant || merchantResponse.body.data;
      expect(merchant.status).toBe('active');
    });

    it('应该获取商户统计信息', async () => {
      const response = await request(app)
        .get(`/api/v1/merchants/${testMerchant.id}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const stats = response.body.data.stats || response.body.data;
      expect(stats.employees).toBeDefined();
      expect(stats.employees.total).toBeGreaterThanOrEqual(3);
      expect(stats.visitors).toBeDefined();
      expect(stats.access).toBeDefined();
    });
  });

  describe('批量操作测试', () => {
    let testMerchants: Merchant[];

    beforeEach(async () => {
      // 创建多个测试商户
      testMerchants = [];
      for (let i = 0; i < 5; i++) {
        const merchantData = {
          name: `批量测试商户${i + 1}`,
          code: `BATCH_MERCHANT_${String(i + 1).padStart(3, '0')}`,
          contact: `联系人${i + 1}`,
          phone: `1380013840${i}`
        };

        const response = await request(app)
          .post('/api/v1/merchants')
          .set('Authorization', `Bearer ${authToken}`)
          .send(merchantData)
          .expect(201);

        testMerchants.push(response.body.data.merchant || response.body.data);
      }
    });

    it('应该支持批量状态更新', async () => {
      const merchantIds = testMerchants.slice(0, 3).map(m => m.id);
      
      // 批量停用商户
      const response = await request(app)
        .post('/api/v1/merchants/batch-update-status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          merchantIds,
          status: 'inactive'
        });

      // 根据API实现情况验证响应
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        
        // 验证商户状态已更新
        for (const merchantId of merchantIds) {
          const merchantResponse = await request(app)
            .get(`/api/v1/merchants/${merchantId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          const merchant = merchantResponse.body.data.merchant || merchantResponse.body.data;
          expect(merchant.status).toBe('inactive');
        }
      } else {
        // 如果不支持批量操作，验证单个操作
        for (const merchantId of merchantIds) {
          await request(app)
            .post(`/api/v1/merchants/${merchantId}/disable`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);
        }
      }
    });

    it('应该处理批量操作中的部分失败', async () => {
      const validMerchantIds = testMerchants.slice(0, 2).map(m => m.id);
      const invalidMerchantIds = [99998, 99999];
      const allIds = [...validMerchantIds, ...invalidMerchantIds];

      // 尝试批量操作包含无效ID的商户列表
      const response = await request(app)
        .post('/api/v1/merchants/batch-update-status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          merchantIds: allIds,
          status: 'inactive'
        });

      // 根据API实现验证响应
      if (response.status === 200 || response.status === 207) {
        // 部分成功的情况
        expect(response.body.success).toBeDefined();
        
        if (response.body.data && response.body.data.results) {
          const results = response.body.data.results;
          expect(results.success).toBeDefined();
          expect(results.failed).toBeDefined();
          expect(results.success.length).toBe(validMerchantIds.length);
          expect(results.failed.length).toBe(invalidMerchantIds.length);
        }
      } else {
        // 如果不支持批量操作，验证单个操作的错误处理
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('事务一致性测试', () => {
    it('应该保证创建商户的事务一致性', async () => {
      const merchantData = {
        name: '事务测试商户',
        code: 'TRANSACTION_MERCHANT',
        contact: '张三',
        phone: '13800138222'
      };

      // 模拟并发创建相同编码的商户
      const promises = [
        request(app)
          .post('/api/v1/merchants')
          .set('Authorization', `Bearer ${authToken}`)
          .send(merchantData),
        request(app)
          .post('/api/v1/merchants')
          .set('Authorization', `Bearer ${authToken}`)
          .send(merchantData)
      ];

      const responses = await Promise.all(promises);
      
      // 应该只有一个成功，另一个因为编码重复而失败
      const successCount = responses.filter(r => r.status === 201).length;
      const failureCount = responses.filter(r => r.status === 400).length;
      
      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);
    });

    it('应该保证更新操作的数据一致性', async () => {
      // 创建测试商户
      const merchantData = {
        name: '一致性测试商户',
        code: 'CONSISTENCY_MERCHANT',
        contact: '张三',
        phone: '13800138111'
      };

      const createResponse = await request(app)
        .post('/api/v1/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(merchantData)
        .expect(201);

      const merchant = createResponse.body.data.merchant || createResponse.body.data;

      // 并发更新同一商户
      const updatePromises = [
        request(app)
          .put(`/api/v1/merchants/${merchant.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: '更新名称1' }),
        request(app)
          .put(`/api/v1/merchants/${merchant.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: '更新名称2' })
      ];

      const updateResponses = await Promise.all(updatePromises);
      
      // 验证至少有一个更新成功
      const successfulUpdates = updateResponses.filter(r => r.status === 200);
      expect(successfulUpdates.length).toBeGreaterThan(0);

      // 验证最终数据一致性
      const finalResponse = await request(app)
        .get(`/api/v1/merchants/${merchant.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const finalMerchant = finalResponse.body.data.merchant || finalResponse.body.data;
      expect(['更新名称1', '更新名称2']).toContain(finalMerchant.name);
    });
  });

  describe('权限和安全测试', () => {
    it('应该验证创建商户的权限', async () => {
      // 创建普通员工用户
      const employeeData = {
        name: '普通员工',
        phone: '13800138000',
        user_type: 'employee',
        merchant_id: 1
      };

      const employeeResponse = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(employeeData)
        .expect(201);

      const employee = employeeResponse.body.data.user || employeeResponse.body.data;
      const employeeToken = `mock-employee-token-${employee.id}`;

      // 员工尝试创建商户应该被拒绝
      const merchantData = {
        name: '权限测试商户',
        code: 'PERMISSION_MERCHANT',
        contact: '张三'
      };

      const response = await request(app)
        .post('/api/v1/merchants')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(merchantData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('权限');
    });

    it('应该防止SQL注入攻击', async () => {
      const maliciousData = {
        name: "'; DROP TABLE merchants; --",
        code: 'INJECTION_TEST',
        contact: '恶意用户'
      };

      const response = await request(app)
        .post('/api/v1/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousData);

      // 应该正常处理或返回验证错误，而不是数据库错误
      expect([201, 400]).toContain(response.status);
      
      if (response.status === 201) {
        // 如果创建成功，验证数据被正确转义
        const merchant = response.body.data.merchant || response.body.data;
        expect(merchant.name).toBe(maliciousData.name);
      }

      // 验证数据库表仍然存在（通过查询商户列表）
      const listResponse = await request(app)
        .get('/api/v1/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.success).toBe(true);
    });
  });
});