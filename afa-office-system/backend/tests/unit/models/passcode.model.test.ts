import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import database from '../../../src/utils/database.js';
import { PasscodeModel } from '../../../src/models/passcode.model.js';
import { UserModel } from '../../../src/models/user.model.js';
import { VisitorApplicationModel } from '../../../src/models/visitor-application.model.js';
import { MerchantModel } from '../../../src/models/merchant.model.js';
import type { PasscodeType, PasscodeStatus } from '../../../src/types/index.js';

describe('PasscodeModel', () => {
  let testUserId: number;
  let testApplicationId: number;

  beforeEach(async () => {
    // 连接测试数据库
    await database.connect();
    
    // 创建测试商户
    const merchant = await MerchantModel.create({
      name: '测试商户',
      code: 'TEST_MERCHANT',
      status: 'active'
    });

    // 创建测试用户
    const user = await UserModel.create({
      name: '测试用户',
      user_type: 'employee',
      phone: '13800138000',
      status: 'active',
      merchant_id: merchant.id
    });
    testUserId = user.id;

    // 创建测试访客申请
    const application = await VisitorApplicationModel.create({
      applicant_id: testUserId,
      merchant_id: merchant.id,
      visitor_name: '测试访客',
      visitor_phone: '13900139000',
      visit_purpose: '测试访问',
      scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      duration: 2,
      status: 'pending',
      usage_limit: 5,
      usage_count: 0
    });
    testApplicationId = application.id;
  });

  afterEach(async () => {
    // 清理测试数据
    await database.run('DELETE FROM passcodes WHERE code LIKE "TEST_%"');
    await database.run('DELETE FROM visitor_applications WHERE visitor_name LIKE "测试%"');
    await database.run('DELETE FROM users WHERE name LIKE "测试%"');
    await database.run('DELETE FROM merchants WHERE code = "TEST_MERCHANT"');
    await database.close();
  });

  describe('create', () => {
    it('应该成功创建通行码', async () => {
      const passcodeData = {
        user_id: testUserId,
        code: 'TEST_PASSCODE_001',
        type: 'employee' as PasscodeType,
        status: 'active' as PasscodeStatus,
        expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        usage_limit: 10,
        usage_count: 0,
        permissions: JSON.stringify(['floor:1', 'floor:2']),
        application_id: testApplicationId
      };

      const passcode = await PasscodeModel.create(passcodeData);

      expect(passcode).toBeDefined();
      expect(passcode.id).toBeGreaterThan(0);
      expect(passcode.user_id).toBe(passcodeData.user_id);
      expect(passcode.code).toBe(passcodeData.code);
      expect(passcode.type).toBe(passcodeData.type);
      expect(passcode.status).toBe(passcodeData.status);
      expect(passcode.expiry_time).toBe(passcodeData.expiry_time);
      expect(passcode.usage_limit).toBe(passcodeData.usage_limit);
      expect(passcode.usage_count).toBe(passcodeData.usage_count);
      expect(passcode.permissions).toBe(passcodeData.permissions);
      expect(passcode.application_id).toBe(passcodeData.application_id);
      expect(passcode.created_at).toBeDefined();
      expect(passcode.updated_at).toBeDefined();
    });

    it('应该使用默认值创建通行码', async () => {
      const passcodeData = {
        user_id: testUserId,
        code: 'TEST_PASSCODE_002',
        type: 'visitor' as PasscodeType
      };

      const passcode = await PasscodeModel.create(passcodeData);

      expect(passcode.status).toBe('active');
      expect(passcode.usage_count).toBe(0);
    });

    it('创建通行码时缺少必填字段应该失败', async () => {
      const passcodeData = {
        user_id: testUserId
        // 缺少 code 和 type
      };

      await expect(PasscodeModel.create(passcodeData as any)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('应该根据ID查找通行码', async () => {
      const passcodeData = {
        user_id: testUserId,
        code: 'TEST_PASSCODE_003',
        type: 'employee' as PasscodeType
      };

      const createdPasscode = await PasscodeModel.create(passcodeData);
      const foundPasscode = await PasscodeModel.findById(createdPasscode.id);

      expect(foundPasscode).toBeDefined();
      expect(foundPasscode!.id).toBe(createdPasscode.id);
      expect(foundPasscode!.code).toBe(passcodeData.code);
    });

    it('查找不存在的通行码应该返回null', async () => {
      const passcode = await PasscodeModel.findById(99999);
      expect(passcode).toBeNull();
    });
  });

  describe('findByCode', () => {
    it('应该根据通行码内容查找通行码', async () => {
      const passcodeData = {
        user_id: testUserId,
        code: 'TEST_PASSCODE_004',
        type: 'employee' as PasscodeType
      };

      await PasscodeModel.create(passcodeData);
      const foundPasscode = await PasscodeModel.findByCode(passcodeData.code);

      expect(foundPasscode).toBeDefined();
      expect(foundPasscode!.code).toBe(passcodeData.code);
      expect(foundPasscode!.user_id).toBe(passcodeData.user_id);
    });

    it('查找不存在的通行码内容应该返回null', async () => {
      const passcode = await PasscodeModel.findByCode('NON_EXISTENT_CODE');
      expect(passcode).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('应该根据用户ID查找通行码列表', async () => {
      const passcodeData1 = {
        user_id: testUserId,
        code: 'TEST_PASSCODE_005',
        type: 'employee' as PasscodeType
      };

      const passcodeData2 = {
        user_id: testUserId,
        code: 'TEST_PASSCODE_006',
        type: 'visitor' as PasscodeType
      };

      await PasscodeModel.create(passcodeData1);
      await PasscodeModel.create(passcodeData2);

      const passcodes = await PasscodeModel.findByUserId(testUserId);

      expect(passcodes.length).toBeGreaterThanOrEqual(2);
      expect(passcodes.every(passcode => passcode.user_id === testUserId)).toBe(true);
    });
  });

  describe('isValid', () => {
    it('应该验证有效的通行码', async () => {
      const passcodeData = {
        user_id: testUserId,
        code: 'TEST_PASSCODE_019',
        type: 'employee' as PasscodeType,
        status: 'active' as PasscodeStatus,
        expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        usage_limit: 10,
        usage_count: 5
      };

      await PasscodeModel.create(passcodeData);
      
      const validation = await PasscodeModel.isValid(passcodeData.code);

      expect(validation.isValid).toBe(true);
      expect(validation.passcode).toBeDefined();
      expect(validation.passcode!.code).toBe(passcodeData.code);
    });

    it('应该检测不存在的通行码', async () => {
      const validation = await PasscodeModel.isValid('NON_EXISTENT_CODE');

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('通行码不存在');
    });

    it('应该检测已失效的通行码', async () => {
      const passcodeData = {
        user_id: testUserId,
        code: 'TEST_PASSCODE_020',
        type: 'employee' as PasscodeType,
        status: 'revoked' as PasscodeStatus
      };

      await PasscodeModel.create(passcodeData);
      
      const validation = await PasscodeModel.isValid(passcodeData.code);

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('通行码已失效');
    });
  });

  describe('validatePasscodeData', () => {
    it('应该验证有效的通行码数据', () => {
      const passcodeData = {
        user_id: testUserId,
        code: 'VALID_CODE',
        type: 'employee' as PasscodeType,
        status: 'active' as PasscodeStatus,
        expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        usage_limit: 10,
        usage_count: 0
      };

      const validation = PasscodeModel.validatePasscodeData(passcodeData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('应该检测无效的通行码数据', () => {
      const passcodeData = {
        user_id: 0, // 无效用户ID
        code: '', // 空通行码
        type: 'invalid_type' as PasscodeType, // 无效类型
        status: 'invalid_status' as PasscodeStatus, // 无效状态
        expiry_time: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 过去时间
        usage_limit: -1, // 无效使用限制
        usage_count: -1 // 负数使用次数
      };

      const validation = PasscodeModel.validatePasscodeData(passcodeData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('用户ID无效');
      expect(validation.errors).toContain('通行码内容不能为空');
      expect(validation.errors).toContain('通行码类型无效');
      expect(validation.errors).toContain('通行码状态无效');
      expect(validation.errors).toContain('过期时间必须是未来时间');
      expect(validation.errors).toContain('使用次数限制必须大于0');
      expect(validation.errors).toContain('已使用次数不能为负数');
    });
  });

  describe('count', () => {
    it('应该统计通行码数量', async () => {
      const initialCount = await PasscodeModel.count();

      await PasscodeModel.create({
        user_id: testUserId,
        code: 'TEST_PASSCODE_015',
        type: 'employee' as PasscodeType
      });

      const newCount = await PasscodeModel.count();
      expect(newCount).toBe(initialCount + 1);
    });
  });

  describe('exists', () => {
    it('应该检查通行码是否存在', async () => {
      const passcodeData = {
        user_id: testUserId,
        code: 'TEST_PASSCODE_025',
        type: 'employee' as PasscodeType
      };

      const passcode = await PasscodeModel.create(passcodeData);
      const exists = await PasscodeModel.exists(passcode.id);

      expect(exists).toBe(true);

      const notExists = await PasscodeModel.exists(99999);
      expect(notExists).toBe(false);
    });
  });
});