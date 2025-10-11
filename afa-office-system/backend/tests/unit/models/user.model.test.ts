import { describe, it, expect, beforeEach } from 'vitest';
import { UserModel } from '../../../src/models/user.model.js';
import { DatabaseHelper } from '../../helpers/database-helper.js';
import type { User, UserType, UserStatus } from '../../../src/types/index.js';

describe('UserModel', () => {
  let testMerchantId: number;

  beforeEach(async () => {
    // 创建测试商户
    const merchant = await DatabaseHelper.createMerchant({
      name: '测试商户',
      code: 'TEST_MERCHANT',
      contact: '张三',
      phone: '13800138000',
      email: 'test@example.com',
      status: 'active'
    });
    testMerchantId = merchant.id;
  });

  describe('create', () => {
    it('应该成功创建用户', async () => {
      const userData = {
        open_id: 'test_open_id_001',
        union_id: 'test_union_id_001',
        phone: '13800138001',
        name: '测试用户1',
        avatar: 'https://example.com/avatar1.jpg',
        user_type: 'employee' as UserType,
        status: 'active' as UserStatus,
        merchant_id: testMerchantId
      };

      const user = await UserModel.create(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeGreaterThan(0);
      expect(user.name).toBe(userData.name);
      expect(user.open_id).toBe(userData.open_id);
      expect(user.user_type).toBe(userData.user_type);
      expect(user.merchant_id).toBe(testMerchantId);
      expect(user.created_at).toBeDefined();
      expect(user.updated_at).toBeDefined();
    });

    it('应该使用默认状态创建用户', async () => {
      const userData = {
        name: '测试用户2',
        user_type: 'visitor' as UserType
      };

      const user = await UserModel.create(userData);

      expect(user.status).toBe('active');
    });

    it('创建用户时缺少必填字段应该失败', async () => {
      const userData = {
        open_id: 'test_open_id_002'
        // 缺少 name 和 user_type
      };

      await expect(UserModel.create(userData as any)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('应该根据ID查找用户', async () => {
      const userData = {
        name: '测试用户3',
        user_type: 'employee' as UserType,
        merchant_id: testMerchantId
      };

      const createdUser = await UserModel.create(userData);
      const foundUser = await UserModel.findById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.name).toBe(userData.name);
    });

    it('查找不存在的用户应该返回null', async () => {
      const user = await UserModel.findById(99999);
      expect(user).toBeNull();
    });
  });

  describe('findByOpenId', () => {
    it('应该根据openId查找用户', async () => {
      const userData = {
        open_id: 'test_open_id_003',
        name: '测试用户4',
        user_type: 'visitor' as UserType
      };

      await UserModel.create(userData);
      const foundUser = await UserModel.findByOpenId(userData.open_id);

      expect(foundUser).toBeDefined();
      expect(foundUser!.open_id).toBe(userData.open_id);
      expect(foundUser!.name).toBe(userData.name);
    });

    it('查找不存在的openId应该返回null', async () => {
      const user = await UserModel.findByOpenId('non_existent_open_id');
      expect(user).toBeNull();
    });
  });

  describe('findByPhone', () => {
    it('应该根据手机号查找用户', async () => {
      const userData = {
        phone: '13800138002',
        name: '测试用户5',
        user_type: 'employee' as UserType
      };

      await UserModel.create(userData);
      const foundUser = await UserModel.findByPhone(userData.phone);

      expect(foundUser).toBeDefined();
      expect(foundUser!.phone).toBe(userData.phone);
      expect(foundUser!.name).toBe(userData.name);
    });
  });

  describe('findByMerchantId', () => {
    it('应该根据商户ID查找用户列表', async () => {
      const userData1 = {
        name: '测试用户6',
        user_type: 'employee' as UserType,
        merchant_id: testMerchantId
      };

      const userData2 = {
        name: '测试用户7',
        user_type: 'merchant_admin' as UserType,
        merchant_id: testMerchantId
      };

      await UserModel.create(userData1);
      await UserModel.create(userData2);

      const users = await UserModel.findByMerchantId(testMerchantId);

      expect(users).toHaveLength(2);
      expect(users.every(user => user.merchant_id === testMerchantId)).toBe(true);
    });
  });

  describe('findByUserType', () => {
    it('应该根据用户类型查找用户列表', async () => {
      const userData1 = {
        name: '测试用户8',
        user_type: 'employee' as UserType
      };

      const userData2 = {
        name: '测试用户9',
        user_type: 'employee' as UserType
      };

      await UserModel.create(userData1);
      await UserModel.create(userData2);

      const users = await UserModel.findByUserType('employee');

      expect(users.length).toBeGreaterThanOrEqual(2);
      expect(users.every(user => user.user_type === 'employee')).toBe(true);
    });
  });

  describe('update', () => {
    it('应该成功更新用户信息', async () => {
      const userData = {
        name: '测试用户10',
        user_type: 'employee' as UserType,
        phone: '13800138003'
      };

      const user = await UserModel.create(userData);
      const updateData = {
        name: '更新后的用户名',
        phone: '13800138004'
      };

      const updatedUser = await UserModel.update(user.id, updateData);

      expect(updatedUser.name).toBe(updateData.name);
      expect(updatedUser.phone).toBe(updateData.phone);
      expect(updatedUser.user_type).toBe(userData.user_type); // 未更新的字段保持不变
    });

    it('更新不存在的用户应该失败', async () => {
      await expect(UserModel.update(99999, { name: '新名称' })).rejects.toThrow('用户不存在或更新失败');
    });

    it('没有更新字段应该失败', async () => {
      const userData = {
        name: '测试用户11',
        user_type: 'employee' as UserType
      };

      const user = await UserModel.create(userData);
      await expect(UserModel.update(user.id, {})).rejects.toThrow('没有需要更新的字段');
    });
  });

  describe('softDelete', () => {
    it('应该软删除用户（设置状态为inactive）', async () => {
      const userData = {
        name: '测试用户12',
        user_type: 'employee' as UserType
      };

      const user = await UserModel.create(userData);
      const result = await UserModel.softDelete(user.id);

      expect(result).toBe(true);

      const updatedUser = await UserModel.findById(user.id);
      expect(updatedUser!.status).toBe('inactive');
    });
  });

  describe('delete', () => {
    it('应该物理删除用户', async () => {
      const userData = {
        name: '测试用户13',
        user_type: 'employee' as UserType
      };

      const user = await UserModel.create(userData);
      const result = await UserModel.delete(user.id);

      expect(result).toBe(true);

      const deletedUser = await UserModel.findById(user.id);
      expect(deletedUser).toBeNull();
    });
  });

  describe('batchCreate', () => {
    it('应该批量创建用户', async () => {
      const usersData = [
        {
          name: '测试用户14',
          user_type: 'employee' as UserType,
          merchant_id: testMerchantId
        },
        {
          name: '测试用户15',
          user_type: 'visitor' as UserType
        }
      ];

      const users = await UserModel.batchCreate(usersData);

      expect(users).toHaveLength(2);
      expect(users[0].name).toBe(usersData[0].name);
      expect(users[1].name).toBe(usersData[1].name);
    });
  });

  describe('count', () => {
    it('应该统计用户数量', async () => {
      const initialCount = await UserModel.count();

      await UserModel.create({
        name: '测试用户16',
        user_type: 'employee' as UserType
      });

      const newCount = await UserModel.count();
      expect(newCount).toBe(initialCount + 1);
    });

    it('应该根据条件统计用户数量', async () => {
      await UserModel.create({
        name: '测试用户17',
        user_type: 'employee' as UserType,
        status: 'active' as UserStatus,
        merchant_id: testMerchantId
      });

      const count = await UserModel.count({
        status: 'active',
        userType: 'employee',
        merchantId: testMerchantId
      });

      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('validateUserData', () => {
    it('应该验证有效的用户数据', () => {
      const userData = {
        name: '测试用户',
        user_type: 'employee' as UserType,
        phone: '13800138000',
        status: 'active' as UserStatus
      };

      const validation = UserModel.validateUserData(userData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('应该检测无效的用户数据', () => {
      const userData = {
        name: '', // 空名称
        user_type: 'invalid_type' as UserType, // 无效类型
        phone: '123', // 无效手机号
        status: 'invalid_status' as UserStatus // 无效状态
      };

      const validation = UserModel.validateUserData(userData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('用户姓名不能为空');
      expect(validation.errors).toContain('用户类型无效');
      expect(validation.errors).toContain('手机号格式无效');
      expect(validation.errors).toContain('用户状态无效');
    });
  });

  describe('exists', () => {
    it('应该检查用户是否存在', async () => {
      const userData = {
        name: '测试用户18',
        user_type: 'employee' as UserType
      };

      const user = await UserModel.create(userData);
      const exists = await UserModel.exists(user.id);

      expect(exists).toBe(true);

      const notExists = await UserModel.exists(99999);
      expect(notExists).toBe(false);
    });
  });

  describe('openIdExists', () => {
    it('应该检查openId是否已存在', async () => {
      const userData = {
        open_id: 'test_open_id_004',
        name: '测试用户19',
        user_type: 'employee' as UserType
      };

      await UserModel.create(userData);

      const exists = await UserModel.openIdExists(userData.open_id);
      expect(exists).toBe(true);

      const notExists = await UserModel.openIdExists('non_existent_open_id');
      expect(notExists).toBe(false);
    });

    it('应该排除指定ID检查openId是否存在', async () => {
      const userData = {
        open_id: 'test_open_id_005',
        name: '测试用户20',
        user_type: 'employee' as UserType
      };

      const user = await UserModel.create(userData);

      // 排除自己的ID，应该返回false
      const exists = await UserModel.openIdExists(userData.open_id, user.id);
      expect(exists).toBe(false);
    });
  });

  describe('phoneExists', () => {
    it('应该检查手机号是否已存在', async () => {
      const userData = {
        phone: '13800138005',
        name: '测试用户21',
        user_type: 'employee' as UserType
      };

      await UserModel.create(userData);

      const exists = await UserModel.phoneExists(userData.phone);
      expect(exists).toBe(true);

      const notExists = await UserModel.phoneExists('13999999999');
      expect(notExists).toBe(false);
    });
  });

  describe('findAll with pagination', () => {
    it('应该支持分页查询', async () => {
      // 创建多个测试用户
      for (let i = 0; i < 5; i++) {
        await UserModel.create({
          name: `测试用户分页${i}`,
          user_type: 'employee' as UserType
        });
      }

      const page1 = await UserModel.findAll({ page: 1, limit: 2 });
      const page2 = await UserModel.findAll({ page: 2, limit: 2 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });
});