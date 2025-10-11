import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import database from '../../../src/utils/database.js';
import { MerchantModel } from '../../../src/models/merchant.model.js';
import type { Merchant, MerchantStatus } from '../../../src/types/index.js';

describe('MerchantModel', () => {
  beforeEach(async () => {
    // 连接测试数据库
    await database.connect();
  });

  afterEach(async () => {
    // 清理测试数据
    await database.run('DELETE FROM merchants WHERE name LIKE "测试%"');
    await database.close();
  });

  describe('create', () => {
    it('应该成功创建商户', async () => {
      const merchantData = {
        name: '测试商户1',
        code: 'TEST_MERCHANT_001',
        contact: '张三',
        phone: '13800138000',
        email: 'test1@example.com',
        address: '测试地址1',
        status: 'active' as MerchantStatus,
        settings: JSON.stringify({ theme: 'light' })
      };

      const merchant = await MerchantModel.create(merchantData);

      expect(merchant).toBeDefined();
      expect(merchant.id).toBeGreaterThan(0);
      expect(merchant.name).toBe(merchantData.name);
      expect(merchant.code).toBe(merchantData.code);
      expect(merchant.contact).toBe(merchantData.contact);
      expect(merchant.phone).toBe(merchantData.phone);
      expect(merchant.email).toBe(merchantData.email);
      expect(merchant.address).toBe(merchantData.address);
      expect(merchant.status).toBe(merchantData.status);
      expect(merchant.settings).toBe(merchantData.settings);
      expect(merchant.created_at).toBeDefined();
      expect(merchant.updated_at).toBeDefined();
    });

    it('应该使用默认状态创建商户', async () => {
      const merchantData = {
        name: '测试商户2',
        code: 'TEST_MERCHANT_002'
      };

      const merchant = await MerchantModel.create(merchantData);

      expect(merchant.status).toBe('active');
    });

    it('创建商户时缺少必填字段应该失败', async () => {
      const merchantData = {
        name: '测试商户3'
        // 缺少 code
      };

      await expect(MerchantModel.create(merchantData as any)).rejects.toThrow();
    });

    it('创建重复编码的商户应该失败', async () => {
      const merchantData = {
        name: '测试商户4',
        code: 'DUPLICATE_CODE'
      };

      await MerchantModel.create(merchantData);

      // 尝试创建相同编码的商户
      const duplicateData = {
        name: '测试商户5',
        code: 'DUPLICATE_CODE'
      };

      await expect(MerchantModel.create(duplicateData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('应该根据ID查找商户', async () => {
      const merchantData = {
        name: '测试商户6',
        code: 'TEST_MERCHANT_006'
      };

      const createdMerchant = await MerchantModel.create(merchantData);
      const foundMerchant = await MerchantModel.findById(createdMerchant.id);

      expect(foundMerchant).toBeDefined();
      expect(foundMerchant!.id).toBe(createdMerchant.id);
      expect(foundMerchant!.name).toBe(merchantData.name);
      expect(foundMerchant!.code).toBe(merchantData.code);
    });

    it('查找不存在的商户应该返回null', async () => {
      const merchant = await MerchantModel.findById(99999);
      expect(merchant).toBeNull();
    });
  });

  describe('findByCode', () => {
    it('应该根据编码查找商户', async () => {
      const merchantData = {
        name: '测试商户7',
        code: 'TEST_MERCHANT_007'
      };

      await MerchantModel.create(merchantData);
      const foundMerchant = await MerchantModel.findByCode(merchantData.code);

      expect(foundMerchant).toBeDefined();
      expect(foundMerchant!.code).toBe(merchantData.code);
      expect(foundMerchant!.name).toBe(merchantData.name);
    });

    it('查找不存在的编码应该返回null', async () => {
      const merchant = await MerchantModel.findByCode('NON_EXISTENT_CODE');
      expect(merchant).toBeNull();
    });
  });

  describe('findByName', () => {
    it('应该根据名称模糊查找商户', async () => {
      const merchantData1 = {
        name: '测试商户搜索1',
        code: 'SEARCH_TEST_001'
      };

      const merchantData2 = {
        name: '测试商户搜索2',
        code: 'SEARCH_TEST_002'
      };

      await MerchantModel.create(merchantData1);
      await MerchantModel.create(merchantData2);

      const merchants = await MerchantModel.findByName('搜索');

      expect(merchants.length).toBeGreaterThanOrEqual(2);
      expect(merchants.every(m => m.name.includes('搜索'))).toBe(true);
    });
  });

  describe('update', () => {
    it('应该成功更新商户信息', async () => {
      const merchantData = {
        name: '测试商户8',
        code: 'TEST_MERCHANT_008',
        contact: '原联系人'
      };

      const merchant = await MerchantModel.create(merchantData);
      const updateData = {
        name: '更新后的商户名',
        contact: '新联系人',
        phone: '13800138001'
      };

      const updatedMerchant = await MerchantModel.update(merchant.id, updateData);

      expect(updatedMerchant.name).toBe(updateData.name);
      expect(updatedMerchant.contact).toBe(updateData.contact);
      expect(updatedMerchant.phone).toBe(updateData.phone);
      expect(updatedMerchant.code).toBe(merchantData.code); // 未更新的字段保持不变
    });

    it('更新不存在的商户应该失败', async () => {
      await expect(MerchantModel.update(99999, { name: '新名称' })).rejects.toThrow('商户不存在或更新失败');
    });
  });

  describe('softDelete', () => {
    it('应该软删除商户（设置状态为inactive）', async () => {
      const merchantData = {
        name: '测试商户9',
        code: 'TEST_MERCHANT_009'
      };

      const merchant = await MerchantModel.create(merchantData);
      const result = await MerchantModel.softDelete(merchant.id);

      expect(result).toBe(true);

      const updatedMerchant = await MerchantModel.findById(merchant.id);
      expect(updatedMerchant!.status).toBe('inactive');
    });
  });

  describe('delete', () => {
    it('应该物理删除商户', async () => {
      const merchantData = {
        name: '测试商户10',
        code: 'TEST_MERCHANT_010'
      };

      const merchant = await MerchantModel.create(merchantData);
      const result = await MerchantModel.delete(merchant.id);

      expect(result).toBe(true);

      const deletedMerchant = await MerchantModel.findById(merchant.id);
      expect(deletedMerchant).toBeNull();
    });
  });

  describe('count', () => {
    it('应该统计商户数量', async () => {
      const initialCount = await MerchantModel.count();

      await MerchantModel.create({
        name: '测试商户11',
        code: 'TEST_MERCHANT_011'
      });

      const newCount = await MerchantModel.count();
      expect(newCount).toBe(initialCount + 1);
    });

    it('应该根据条件统计商户数量', async () => {
      await MerchantModel.create({
        name: '测试商户12',
        code: 'TEST_MERCHANT_012',
        status: 'active' as MerchantStatus
      });

      const count = await MerchantModel.count({
        status: 'active',
        search: '测试商户12'
      });

      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getSettings and updateSettings', () => {
    it('应该获取和更新商户设置', async () => {
      const merchantData = {
        name: '测试商户13',
        code: 'TEST_MERCHANT_013'
      };

      const merchant = await MerchantModel.create(merchantData);

      // 初始设置应该为空对象
      const initialSettings = await MerchantModel.getSettings(merchant.id);
      expect(initialSettings).toEqual({});

      // 更新设置
      const newSettings = {
        theme: 'dark',
        notifications: true,
        passcodeUpdateFreq: 30
      };

      const updatedMerchant = await MerchantModel.updateSettings(merchant.id, newSettings);
      expect(updatedMerchant.settings).toBe(JSON.stringify(newSettings));

      // 获取更新后的设置
      const retrievedSettings = await MerchantModel.getSettings(merchant.id);
      expect(retrievedSettings).toEqual(newSettings);
    });
  });

  describe('validateMerchantData', () => {
    it('应该验证有效的商户数据', () => {
      const merchantData = {
        name: '测试商户',
        code: 'TEST_MERCHANT',
        phone: '13800138000',
        email: 'test@example.com',
        status: 'active' as MerchantStatus
      };

      const validation = MerchantModel.validateMerchantData(merchantData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('应该检测无效的商户数据', () => {
      const merchantData = {
        name: '', // 空名称
        code: 'invalid-code', // 无效编码格式
        phone: '123', // 无效手机号
        email: 'invalid-email', // 无效邮箱
        status: 'invalid_status' as MerchantStatus // 无效状态
      };

      const validation = MerchantModel.validateMerchantData(merchantData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('商户名称不能为空');
      expect(validation.errors).toContain('商户编码格式无效（只能包含大写字母、数字和下划线，长度2-20位）');
      expect(validation.errors).toContain('手机号格式无效');
      expect(validation.errors).toContain('邮箱格式无效');
      expect(validation.errors).toContain('商户状态无效');
    });
  });

  describe('exists', () => {
    it('应该检查商户是否存在', async () => {
      const merchantData = {
        name: '测试商户14',
        code: 'TEST_MERCHANT_014'
      };

      const merchant = await MerchantModel.create(merchantData);
      const exists = await MerchantModel.exists(merchant.id);

      expect(exists).toBe(true);

      const notExists = await MerchantModel.exists(99999);
      expect(notExists).toBe(false);
    });
  });

  describe('codeExists', () => {
    it('应该检查商户编码是否已存在', async () => {
      const merchantData = {
        name: '测试商户15',
        code: 'TEST_MERCHANT_015'
      };

      await MerchantModel.create(merchantData);

      const exists = await MerchantModel.codeExists(merchantData.code);
      expect(exists).toBe(true);

      const notExists = await MerchantModel.codeExists('NON_EXISTENT_CODE');
      expect(notExists).toBe(false);
    });

    it('应该排除指定ID检查编码是否存在', async () => {
      const merchantData = {
        name: '测试商户16',
        code: 'TEST_MERCHANT_016'
      };

      const merchant = await MerchantModel.create(merchantData);

      // 排除自己的ID，应该返回false
      const exists = await MerchantModel.codeExists(merchantData.code, merchant.id);
      expect(exists).toBe(false);
    });
  });

  describe('batchUpdateStatus', () => {
    it('应该批量更新商户状态', async () => {
      const merchant1 = await MerchantModel.create({
        name: '测试商户17',
        code: 'TEST_MERCHANT_017'
      });

      const merchant2 = await MerchantModel.create({
        name: '测试商户18',
        code: 'TEST_MERCHANT_018'
      });

      const updatedCount = await MerchantModel.batchUpdateStatus(
        [merchant1.id, merchant2.id],
        'inactive'
      );

      expect(updatedCount).toBe(2);

      const updatedMerchant1 = await MerchantModel.findById(merchant1.id);
      const updatedMerchant2 = await MerchantModel.findById(merchant2.id);

      expect(updatedMerchant1!.status).toBe('inactive');
      expect(updatedMerchant2!.status).toBe('inactive');
    });

    it('空ID数组应该返回0', async () => {
      const updatedCount = await MerchantModel.batchUpdateStatus([], 'inactive');
      expect(updatedCount).toBe(0);
    });
  });

  describe('findAll with pagination and search', () => {
    it('应该支持分页查询', async () => {
      // 创建多个测试商户
      for (let i = 0; i < 5; i++) {
        await MerchantModel.create({
          name: `测试商户分页${i}`,
          code: `PAGE_TEST_${i.toString().padStart(3, '0')}`
        });
      }

      const page1 = await MerchantModel.findAll({ page: 1, limit: 2 });
      const page2 = await MerchantModel.findAll({ page: 2, limit: 2 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it('应该支持搜索查询', async () => {
      await MerchantModel.create({
        name: '特殊搜索商户',
        code: 'SPECIAL_SEARCH'
      });

      const merchants = await MerchantModel.findAll({ search: '特殊搜索' });

      expect(merchants.length).toBeGreaterThanOrEqual(1);
      expect(merchants.some(m => m.name.includes('特殊搜索'))).toBe(true);
    });
  });
});