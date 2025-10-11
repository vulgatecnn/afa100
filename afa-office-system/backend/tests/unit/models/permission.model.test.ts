import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import database from '../../../src/utils/database.js';
import { PermissionModel } from '../../../src/models/permission.model.js';
import { ProjectModel } from '../../../src/models/project.model.js';
import { MerchantModel } from '../../../src/models/merchant.model.js';
import type { Permission, ResourceType } from '../../../src/types/index.js';

describe('PermissionModel', () => {
  let testProjectId: number;
  let testMerchantId: number;

  beforeEach(async () => {
    // 连接测试数据库
    await database.connect();
    
    // 创建测试项目
    const project = await ProjectModel.create({
      code: 'TEST_PROJECT',
      name: '测试项目',
      description: '用于测试的项目',
      status: 'active'
    });
    testProjectId = project.id;

    // 创建测试商户
    const merchant = await MerchantModel.create({
      name: '测试商户',
      code: 'TEST_MERCHANT',
      status: 'active'
    });
    testMerchantId = merchant.id;
  });

  afterEach(async () => {
    // 清理测试数据
    await database.run('DELETE FROM merchant_permissions WHERE merchant_id = ?', [testMerchantId]);
    await database.run('DELETE FROM permissions WHERE code LIKE "TEST_%"');
    await database.run('DELETE FROM projects WHERE code = "TEST_PROJECT"');
    await database.run('DELETE FROM merchants WHERE code = "TEST_MERCHANT"');
    await database.close();
  });

  describe('create', () => {
    it('应该成功创建权限', async () => {
      const permissionData = {
        code: 'TEST_PROJECT_ACCESS',
        name: '测试项目访问权限',
        description: '允许访问测试项目',
        resource_type: 'project' as ResourceType,
        resource_id: testProjectId,
        actions: JSON.stringify(['read', 'access'])
      };

      const permission = await PermissionModel.create(permissionData);

      expect(permission).toBeDefined();
      expect(permission.id).toBeGreaterThan(0);
      expect(permission.code).toBe(permissionData.code);
      expect(permission.name).toBe(permissionData.name);
      expect(permission.resource_type).toBe(permissionData.resource_type);
      expect(permission.resource_id).toBe(permissionData.resource_id);
      expect(permission.actions).toBe(permissionData.actions);
      expect(permission.created_at).toBeDefined();
    });

    it('创建权限时缺少必填字段应该失败', async () => {
      const permissionData = {
        code: 'TEST_INCOMPLETE'
        // 缺少其他必填字段
      };

      await expect(PermissionModel.create(permissionData as any)).rejects.toThrow();
    });

    it('创建重复代码的权限应该失败', async () => {
      const permissionData = {
        code: 'TEST_DUPLICATE',
        name: '重复权限测试',
        resource_type: 'project' as ResourceType,
        resource_id: testProjectId,
        actions: JSON.stringify(['read'])
      };

      await PermissionModel.create(permissionData);

      // 尝试创建相同代码的权限
      await expect(PermissionModel.create(permissionData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('应该根据ID查找权限', async () => {
      const permissionData = {
        code: 'TEST_FIND_BY_ID',
        name: '测试查找权限',
        resource_type: 'project' as ResourceType,
        resource_id: testProjectId,
        actions: JSON.stringify(['read'])
      };

      const createdPermission = await PermissionModel.create(permissionData);
      const foundPermission = await PermissionModel.findById(createdPermission.id);

      expect(foundPermission).toBeDefined();
      expect(foundPermission!.id).toBe(createdPermission.id);
      expect(foundPermission!.code).toBe(permissionData.code);
    });

    it('查找不存在的权限应该返回null', async () => {
      const permission = await PermissionModel.findById(99999);
      expect(permission).toBeNull();
    });
  });

  describe('findByCode', () => {
    it('应该根据代码查找权限', async () => {
      const permissionData = {
        code: 'TEST_FIND_BY_CODE',
        name: '测试代码查找',
        resource_type: 'project' as ResourceType,
        resource_id: testProjectId,
        actions: JSON.stringify(['read'])
      };

      await PermissionModel.create(permissionData);
      const foundPermission = await PermissionModel.findByCode(permissionData.code);

      expect(foundPermission).toBeDefined();
      expect(foundPermission!.code).toBe(permissionData.code);
    });
  });

  describe('findByResource', () => {
    it('应该根据资源类型和ID查找权限列表', async () => {
      const permission1Data = {
        code: 'TEST_RESOURCE_1',
        name: '资源权限1',
        resource_type: 'project' as ResourceType,
        resource_id: testProjectId,
        actions: JSON.stringify(['read'])
      };

      const permission2Data = {
        code: 'TEST_RESOURCE_2',
        name: '资源权限2',
        resource_type: 'project' as ResourceType,
        resource_id: testProjectId,
        actions: JSON.stringify(['write'])
      };

      await PermissionModel.create(permission1Data);
      await PermissionModel.create(permission2Data);

      const permissions = await PermissionModel.findByResource('project', testProjectId);

      expect(permissions.length).toBeGreaterThanOrEqual(2);
      expect(permissions.every(p => p.resource_type === 'project' && p.resource_id === testProjectId)).toBe(true);
    });
  });

  describe('update', () => {
    it('应该成功更新权限信息', async () => {
      const permissionData = {
        code: 'TEST_UPDATE',
        name: '更新测试权限',
        resource_type: 'project' as ResourceType,
        resource_id: testProjectId,
        actions: JSON.stringify(['read'])
      };

      const permission = await PermissionModel.create(permissionData);
      const updateData = {
        name: '更新后的权限名称',
        description: '新的描述',
        actions: JSON.stringify(['read', 'write'])
      };

      const updatedPermission = await PermissionModel.update(permission.id, updateData);

      expect(updatedPermission.name).toBe(updateData.name);
      expect(updatedPermission.description).toBe(updateData.description);
      expect(updatedPermission.actions).toBe(updateData.actions);
      expect(updatedPermission.code).toBe(permissionData.code); // 未更新的字段保持不变
    });
  });

  describe('delete', () => {
    it('应该删除权限', async () => {
      const permissionData = {
        code: 'TEST_DELETE',
        name: '删除测试权限',
        resource_type: 'project' as ResourceType,
        resource_id: testProjectId,
        actions: JSON.stringify(['read'])
      };

      const permission = await PermissionModel.create(permissionData);
      const result = await PermissionModel.delete(permission.id);

      expect(result).toBe(true);

      const deletedPermission = await PermissionModel.findById(permission.id);
      expect(deletedPermission).toBeNull();
    });
  });

  describe('getActions and setActions', () => {
    it('应该获取和设置权限操作', async () => {
      const permissionData = {
        code: 'TEST_ACTIONS',
        name: '操作测试权限',
        resource_type: 'project' as ResourceType,
        resource_id: testProjectId,
        actions: JSON.stringify(['read'])
      };

      const permission = await PermissionModel.create(permissionData);

      // 获取操作列表
      const actions = PermissionModel.getActions(permission);
      expect(actions).toEqual(['read']);

      // 设置新的操作列表
      const newActions = ['read', 'write', 'access'];
      const updatedPermission = await PermissionModel.setActions(permission.id, newActions);

      const retrievedActions = PermissionModel.getActions(updatedPermission);
      expect(retrievedActions).toEqual(newActions);
    });
  });

  describe('validatePermissionData', () => {
    it('应该验证有效的权限数据', () => {
      const permissionData = {
        code: 'VALID_PERMISSION',
        name: '有效权限',
        resource_type: 'project' as ResourceType,
        resource_id: 1,
        actions: JSON.stringify(['read', 'write'])
      };

      const validation = PermissionModel.validatePermissionData(permissionData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('应该检测无效的权限数据', () => {
      const permissionData = {
        code: 'ab', // 太短
        name: '', // 空名称
        resource_type: 'invalid' as ResourceType, // 无效资源类型
        resource_id: 0, // 无效资源ID
        actions: 'invalid json' // 无效JSON
      };

      const validation = PermissionModel.validatePermissionData(permissionData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('权限代码格式无效（只能包含大写字母、数字、下划线和冒号，长度3-50位）');
      expect(validation.errors).toContain('权限名称不能为空');
      expect(validation.errors).toContain('资源类型无效');
      expect(validation.errors).toContain('资源ID无效');
      expect(validation.errors).toContain('操作列表格式无效');
    });
  });

  describe('batchCreate', () => {
    it('应该批量创建权限', async () => {
      const permissionsData = [
        {
          code: 'TEST_BATCH_1',
          name: '批量权限1',
          resource_type: 'project' as ResourceType,
          resource_id: testProjectId,
          actions: JSON.stringify(['read'])
        },
        {
          code: 'TEST_BATCH_2',
          name: '批量权限2',
          resource_type: 'project' as ResourceType,
          resource_id: testProjectId,
          actions: JSON.stringify(['write'])
        }
      ];

      const permissions = await PermissionModel.batchCreate(permissionsData);

      expect(permissions).toHaveLength(2);
      expect(permissions[0].code).toBe(permissionsData[0].code);
      expect(permissions[1].code).toBe(permissionsData[1].code);
    });
  });

  describe('merchant permissions', () => {
    it('应该为商户分配权限', async () => {
      const permissionData = {
        code: 'TEST_MERCHANT_PERM',
        name: '商户权限测试',
        resource_type: 'project' as ResourceType,
        resource_id: testProjectId,
        actions: JSON.stringify(['read'])
      };

      const permission = await PermissionModel.create(permissionData);
      const result = await PermissionModel.assignToMerchant(testMerchantId, permission.code);

      expect(result).toBe(true);

      // 验证权限已分配
      const hasPermission = await PermissionModel.merchantHasPermission(testMerchantId, permission.code);
      expect(hasPermission).toBe(true);
    });

    it('应该获取商户的权限列表', async () => {
      const permission1Data = {
        code: 'TEST_MERCHANT_PERM_1',
        name: '商户权限1',
        resource_type: 'project' as ResourceType,
        resource_id: testProjectId,
        actions: JSON.stringify(['read'])
      };

      const permission2Data = {
        code: 'TEST_MERCHANT_PERM_2',
        name: '商户权限2',
        resource_type: 'project' as ResourceType,
        resource_id: testProjectId,
        actions: JSON.stringify(['write'])
      };

      const permission1 = await PermissionModel.create(permission1Data);
      const permission2 = await PermissionModel.create(permission2Data);

      await PermissionModel.assignToMerchant(testMerchantId, permission1.code);
      await PermissionModel.assignToMerchant(testMerchantId, permission2.code);

      const merchantPermissions = await PermissionModel.getMerchantPermissions(testMerchantId);

      expect(merchantPermissions.length).toBeGreaterThanOrEqual(2);
      expect(merchantPermissions.some(p => p.code === permission1.code)).toBe(true);
      expect(merchantPermissions.some(p => p.code === permission2.code)).toBe(true);
    });

    it('应该撤销商户权限', async () => {
      const permissionData = {
        code: 'TEST_REVOKE_PERM',
        name: '撤销权限测试',
        resource_type: 'project' as ResourceType,
        resource_id: testProjectId,
        actions: JSON.stringify(['read'])
      };

      const permission = await PermissionModel.create(permissionData);
      await PermissionModel.assignToMerchant(testMerchantId, permission.code);

      // 验证权限已分配
      let hasPermission = await PermissionModel.merchantHasPermission(testMerchantId, permission.code);
      expect(hasPermission).toBe(true);

      // 撤销权限
      const result = await PermissionModel.revokeFromMerchant(testMerchantId, permission.code);
      expect(result).toBe(true);

      // 验证权限已撤销
      hasPermission = await PermissionModel.merchantHasPermission(testMerchantId, permission.code);
      expect(hasPermission).toBe(false);
    });

    it('应该批量为商户分配权限', async () => {
      const permission1Data = {
        code: 'TEST_BATCH_ASSIGN_1',
        name: '批量分配权限1',
        resource_type: 'project' as ResourceType,
        resource_id: testProjectId,
        actions: JSON.stringify(['read'])
      };

      const permission2Data = {
        code: 'TEST_BATCH_ASSIGN_2',
        name: '批量分配权限2',
        resource_type: 'project' as ResourceType,
        resource_id: testProjectId,
        actions: JSON.stringify(['write'])
      };

      const permission1 = await PermissionModel.create(permission1Data);
      const permission2 = await PermissionModel.create(permission2Data);

      const assignedCount = await PermissionModel.batchAssignToMerchant(
        testMerchantId,
        [permission1.code, permission2.code]
      );

      expect(assignedCount).toBe(2);

      // 验证权限已分配
      const hasPermission1 = await PermissionModel.merchantHasPermission(testMerchantId, permission1.code);
      const hasPermission2 = await PermissionModel.merchantHasPermission(testMerchantId, permission2.code);

      expect(hasPermission1).toBe(true);
      expect(hasPermission2).toBe(true);
    });
  });

  describe('count', () => {
    it('应该统计权限数量', async () => {
      const initialCount = await PermissionModel.count();

      await PermissionModel.create({
        code: 'TEST_COUNT',
        name: '计数测试权限',
        resource_type: 'project' as ResourceType,
        resource_id: testProjectId,
        actions: JSON.stringify(['read'])
      });

      const newCount = await PermissionModel.count();
      expect(newCount).toBe(initialCount + 1);
    });

    it('应该根据条件统计权限数量', async () => {
      await PermissionModel.create({
        code: 'TEST_COUNT_FILTER',
        name: '筛选计数测试',
        resource_type: 'project' as ResourceType,
        resource_id: testProjectId,
        actions: JSON.stringify(['read'])
      });

      const count = await PermissionModel.count({
        resourceType: 'project',
        resourceId: testProjectId
      });

      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('exists and codeExists', () => {
    it('应该检查权限是否存在', async () => {
      const permissionData = {
        code: 'TEST_EXISTS',
        name: '存在性测试权限',
        resource_type: 'project' as ResourceType,
        resource_id: testProjectId,
        actions: JSON.stringify(['read'])
      };

      const permission = await PermissionModel.create(permissionData);

      const exists = await PermissionModel.exists(permission.id);
      expect(exists).toBe(true);

      const codeExists = await PermissionModel.codeExists(permission.code);
      expect(codeExists).toBe(true);

      const notExists = await PermissionModel.exists(99999);
      expect(notExists).toBe(false);

      const codeNotExists = await PermissionModel.codeExists('NON_EXISTENT_CODE');
      expect(codeNotExists).toBe(false);
    });
  });
});