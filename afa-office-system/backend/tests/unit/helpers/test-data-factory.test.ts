/**
 * TestDataFactory 单元测试
 * 测试测试数据生成逻辑、数据关联关系创建和数据清理机制
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  TestDataFactory,
  createTestMerchant,
  createTestUser,
  createTestProject,
  createTestVenue,
  createTestFloor,
  createTestVisitorApplication,
  createTestAccessRecord
} from '../../helpers/test-data-factory';
import type { User, Merchant, Project, Venue, Floor, VisitorApplication, AccessRecord } from '../../../src/types/index.js';

describe('TestDataFactory', () => {
  beforeEach(() => {
    // 重置ID计数器
    TestDataFactory.resetIdCounter();
  });

  afterEach(() => {
    // 清理
    TestDataFactory.resetIdCounter();
  });

  describe('测试数据生成逻辑', () => {
    it('应该生成有效的商户数据', () => {
      const merchant = TestDataFactory.createMerchant();

      expect(merchant).toMatchObject({
        id: 1,
        name: '测试商户1',
        code: 'MERCHANT_1',
        contact: '联系人1',
        phone: '13800138001',
        email: 'merchant1@test.com',
        address: '测试地址1',
        status: 'active',
        settings: null
      });

      expect(merchant.created_at).toBeDefined();
      expect(merchant.updated_at).toBeDefined();
      expect(new Date(merchant.created_at)).toBeInstanceOf(Date);
      expect(new Date(merchant.updated_at)).toBeInstanceOf(Date);
    });

    it('应该生成有效的用户数据', () => {
      const user = TestDataFactory.createUser();

      expect(user).toMatchObject({
        id: 1,
        name: '测试用户1',
        phone: '13800138001',
        user_type: 'employee',
        status: 'active',
        merchant_id: 1,
        open_id: 'openid_1',
        union_id: 'unionid_1',
        avatar: null,
        password: null
      });

      expect(user.created_at).toBeDefined();
      expect(user.updated_at).toBeDefined();
    });

    it('应该生成有效的项目数据', () => {
      const project = TestDataFactory.createProject();

      expect(project).toMatchObject({
        id: 1,
        code: 'PROJECT_1',
        name: '测试项目1',
        description: '项目描述1',
        status: 'active'
      });

      expect(project.created_at).toBeDefined();
      expect(project.updated_at).toBeDefined();
    });

    it('应该生成有效的场地数据', () => {
      const venue = TestDataFactory.createVenue();

      expect(venue).toMatchObject({
        id: 1,
        project_id: 1,
        code: 'VENUE_1',
        name: '测试场地1',
        description: '场地描述1',
        status: 'active'
      });

      expect(venue.created_at).toBeDefined();
      expect(venue.updated_at).toBeDefined();
    });

    it('应该生成有效的楼层数据', () => {
      const floor = TestDataFactory.createFloor();

      expect(floor).toMatchObject({
        id: 1,
        venue_id: 1,
        code: 'FLOOR_1',
        name: '测试楼层1',
        description: '楼层描述1',
        status: 'active'
      });

      expect(floor.created_at).toBeDefined();
      expect(floor.updated_at).toBeDefined();
    });

    it('应该生成有效的访客申请数据', () => {
      const application = TestDataFactory.createVisitorApplication();

      expect(application).toMatchObject({
        id: 1,
        applicant_id: 1,
        merchant_id: 1,
        visitee_id: 2,
        visitor_name: '访客1',
        visitor_phone: '13800138001',
        visitor_company: '访客公司1',
        visit_purpose: '访问目的1',
        visit_type: 'business',
        duration: 2,
        status: 'pending',
        approved_by: null,
        approved_at: null,
        passcode: null,
        passcode_expiry: null,
        usage_limit: 2,
        usage_count: 0
      });

      expect(application.created_at).toBeDefined();
      expect(application.updated_at).toBeDefined();
      expect(application.scheduled_time).toBeDefined();
      
      // 验证scheduled_time是明天的时间
      const scheduledDate = new Date(application.scheduled_time);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(scheduledDate.getDate()).toBe(tomorrow.getDate());
    });

    it('应该生成有效的通行记录数据', () => {
      const record = TestDataFactory.createAccessRecord();

      expect(record).toMatchObject({
        id: 1,
        user_id: 1,
        passcode_id: 1,
        device_id: 'device_1',
        device_type: 'qr_scanner',
        direction: 'in',
        result: 'success',
        fail_reason: null,
        project_id: 1,
        venue_id: 1,
        floor_id: 1
      });

      expect(record.timestamp).toBeDefined();
      expect(new Date(record.timestamp)).toBeInstanceOf(Date);
    });

    it('应该支持数据覆盖', () => {
      const customMerchant = TestDataFactory.createMerchant({
        name: '自定义商户',
        status: 'inactive'
      });

      expect(customMerchant.name).toBe('自定义商户');
      expect(customMerchant.status).toBe('inactive');
      expect(customMerchant.id).toBe(1); // 其他字段保持默认
    });

    it('应该生成唯一的ID', () => {
      const merchant1 = TestDataFactory.createMerchant();
      const merchant2 = TestDataFactory.createMerchant();
      const user1 = TestDataFactory.createUser();

      expect(merchant1.id).toBe(1);
      expect(merchant2.id).toBe(2);
      expect(user1.id).toBe(3); // ID计数器是全局的
    });
  });

  describe('数据关联关系创建', () => {
    it('应该创建具有正确关联关系的数据', () => {
      const project = TestDataFactory.createProject();
      const venue = TestDataFactory.createVenue({ project_id: project.id });
      const floor = TestDataFactory.createFloor({ venue_id: venue.id });

      expect(venue.project_id).toBe(project.id);
      expect(floor.venue_id).toBe(venue.id);
    });

    it('应该创建具有用户关联的访客申请', () => {
      const applicant = TestDataFactory.createUser();
      const visitee = TestDataFactory.createUser();
      const merchant = TestDataFactory.createMerchant();

      const application = TestDataFactory.createVisitorApplication({
        applicant_id: applicant.id,
        visitee_id: visitee.id,
        merchant_id: merchant.id
      });

      expect(application.applicant_id).toBe(applicant.id);
      expect(application.visitee_id).toBe(visitee.id);
      expect(application.merchant_id).toBe(merchant.id);
    });

    it('应该创建具有完整关联的通行记录', () => {
      const user = TestDataFactory.createUser();
      const project = TestDataFactory.createProject();
      const venue = TestDataFactory.createVenue({ project_id: project.id });
      const floor = TestDataFactory.createFloor({ venue_id: venue.id });

      const record = TestDataFactory.createAccessRecord({
        user_id: user.id,
        project_id: project.id,
        venue_id: venue.id,
        floor_id: floor.id
      });

      expect(record.user_id).toBe(user.id);
      expect(record.project_id).toBe(project.id);
      expect(record.venue_id).toBe(venue.id);
      expect(record.floor_id).toBe(floor.id);
    });
  });

  describe('数据清理机制', () => {
    it('应该正确重置ID计数器', () => {
      const merchant1 = TestDataFactory.createMerchant();
      expect(merchant1.id).toBe(1);

      const merchant2 = TestDataFactory.createMerchant();
      expect(merchant2.id).toBe(2);

      TestDataFactory.resetIdCounter();

      const merchant3 = TestDataFactory.createMerchant();
      expect(merchant3.id).toBe(1); // ID重置为1
    });

    it('应该在重置后生成新的时间戳', async () => {
      const merchant1 = TestDataFactory.createMerchant();
      
      // 等待一小段时间确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 10));
      
      TestDataFactory.resetIdCounter();
      const merchant2 = TestDataFactory.createMerchant();

      expect(merchant1.created_at).not.toBe(merchant2.created_at);
    });
  });

  describe('批量数据创建', () => {
    it('应该创建指定数量的批量数据', () => {
      const merchants = TestDataFactory.createBatch(
        () => TestDataFactory.createMerchant(),
        5
      );

      expect(merchants).toHaveLength(5);
      expect(merchants[0].id).toBe(1);
      expect(merchants[4].id).toBe(5);
    });

    it('应该创建具有唯一约束的数据', () => {
      const users = TestDataFactory.createUniqueData(
        (index) => TestDataFactory.createUser({ 
          name: `用户${index}`,
          phone: `1380013800${index}` 
        }),
        3
      );

      expect(users).toHaveLength(3);
      expect(users[0].name).toBe('用户1');
      expect(users[1].name).toBe('用户2');
      expect(users[2].name).toBe('用户3');
      expect(users[0].phone).toBe('13800138001'); // 注意ID计数器的影响
      expect(users[1].phone).toBe('13800138002');
      expect(users[2].phone).toBe('13800138003');
    });

    it('应该为批量数据生成唯一ID', () => {
      const projects = TestDataFactory.createBatch(
        () => TestDataFactory.createProject(),
        3
      );

      const ids = projects.map(p => p.id);
      const uniqueIds = [...new Set(ids)];
      
      expect(uniqueIds).toHaveLength(3); // 所有ID都是唯一的
      expect(ids).toEqual([1, 2, 3]);
    });
  });

  describe('便捷工厂方法', () => {
    it('应该通过便捷方法创建商户', () => {
      const merchant = createTestMerchant({ name: '便捷商户' });
      
      expect(merchant.name).toBe('便捷商户');
      expect(merchant.id).toBe(1);
    });

    it('应该通过便捷方法创建用户', () => {
      const user = createTestUser({ user_type: 'admin' });
      
      expect(user.user_type).toBe('admin');
      expect(user.id).toBe(1);
    });

    it('应该通过便捷方法创建项目', () => {
      const project = createTestProject({ status: 'inactive' });
      
      expect(project.status).toBe('inactive');
      expect(project.id).toBe(1);
    });

    it('应该通过便捷方法创建场地', () => {
      const venue = createTestVenue({ project_id: 999 });
      
      expect(venue.project_id).toBe(999);
      expect(venue.id).toBe(1);
    });

    it('应该通过便捷方法创建楼层', () => {
      const floor = createTestFloor({ venue_id: 888 });
      
      expect(floor.venue_id).toBe(888);
      expect(floor.id).toBe(1);
    });

    it('应该通过便捷方法创建访客申请', () => {
      const application = createTestVisitorApplication({ status: 'approved' });
      
      expect(application.status).toBe('approved');
      expect(application.id).toBe(1);
    });

    it('应该通过便捷方法创建通行记录', () => {
      const record = createTestAccessRecord({ result: 'failed' });
      
      expect(record.result).toBe('failed');
      expect(record.id).toBe(1);
    });
  });

  describe('数据类型验证', () => {
    it('应该生成正确类型的商户数据', () => {
      const merchant = TestDataFactory.createMerchant();
      
      expect(typeof merchant.id).toBe('number');
      expect(typeof merchant.name).toBe('string');
      expect(typeof merchant.code).toBe('string');
      expect(typeof merchant.status).toBe('string');
      expect(['active', 'inactive']).toContain(merchant.status);
    });

    it('应该生成正确类型的用户数据', () => {
      const user = TestDataFactory.createUser();
      
      expect(typeof user.id).toBe('number');
      expect(typeof user.name).toBe('string');
      expect(typeof user.user_type).toBe('string');
      expect(typeof user.merchant_id).toBe('number');
      expect(['active', 'inactive', 'pending']).toContain(user.status);
    });

    it('应该生成正确类型的访客申请数据', () => {
      const application = TestDataFactory.createVisitorApplication();
      
      expect(typeof application.id).toBe('number');
      expect(typeof application.duration).toBe('number');
      expect(typeof application.usage_limit).toBe('number');
      expect(typeof application.usage_count).toBe('number');
      expect(['business', 'personal', 'interview', 'meeting']).toContain(application.visit_type);
      expect(['pending', 'approved', 'rejected', 'expired', 'completed']).toContain(application.status);
    });

    it('应该生成正确类型的通行记录数据', () => {
      const record = TestDataFactory.createAccessRecord();
      
      expect(typeof record.id).toBe('number');
      expect(typeof record.user_id).toBe('number');
      expect(['in', 'out']).toContain(record.direction);
      expect(['success', 'failed']).toContain(record.result);
    });
  });

  describe('边界情况处理', () => {
    it('应该处理空的覆盖对象', () => {
      const merchant = TestDataFactory.createMerchant({});
      
      expect(merchant.id).toBe(1);
      expect(merchant.name).toBe('测试商户1');
    });

    it('应该处理null值覆盖', () => {
      const user = TestDataFactory.createUser({
        avatar: null,
        password: null
      });
      
      expect(user.avatar).toBeNull();
      expect(user.password).toBeNull();
    });

    it('应该处理undefined值覆盖', () => {
      const merchant = TestDataFactory.createMerchant({
        settings: undefined
      });
      
      expect(merchant.settings).toBeUndefined();
    });

    it('应该处理批量创建零个数据', () => {
      const merchants = TestDataFactory.createBatch(
        () => TestDataFactory.createMerchant(),
        0
      );
      
      expect(merchants).toHaveLength(0);
      expect(merchants).toEqual([]);
    });

    it('应该处理大量批量数据创建', () => {
      const users = TestDataFactory.createBatch(
        () => TestDataFactory.createUser(),
        1000
      );
      
      expect(users).toHaveLength(1000);
      expect(users[0].id).toBe(1);
      expect(users[999].id).toBe(1000);
    });
  });
});