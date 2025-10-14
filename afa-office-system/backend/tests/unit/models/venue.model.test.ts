import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import database from '../../../src/utils/database.js';
import { VenueModel } from '../../../src/models/venue.model.js';
import { ProjectModel } from '../../../src/models/project.model.js';
import type { ProjectStatus } from '../../../src/types/index.js';

describe('VenueModel', () => {
  let testProjectId: number;

  beforeEach(async () => {
    await database.connect();
    
    const project = await ProjectModel.create({
      code: 'TEST_PROJECT',
      name: '测试项目',
      description: '用于测试的项目',
      status: 'active'
    });
    testProjectId = project.id;
  });

  afterEach(async () => {
    await database.run('DELETE FROM venues WHERE code LIKE "TEST_%"');
    await database.run('DELETE FROM projects WHERE code LIKE "TEST_%"');
    await database.close();
  });

  describe('create', () => {
    it('应该成功创建场地', async () => {
      const venueData = {
        project_id: testProjectId,
        code: 'TEST_VENUE_001',
        name: '测试场地1',
        description: '测试项目的场地1',
        status: 'active' as ProjectStatus
      };

      const venue = await VenueModel.create(venueData);

      expect(venue).toBeDefined();
      expect(venue.id).toBeGreaterThan(0);
      expect(venue.project_id).toBe(venueData.project_id);
      expect(venue.code).toBe(venueData.code);
      expect(venue.name).toBe(venueData.name);
      expect(venue.description).toBe(venueData.description);
      expect(venue.status).toBe(venueData.status);
      expect(venue.created_at).toBeDefined();
      expect(venue.updated_at).toBeDefined();
    });

    it('应该使用默认状态创建场地', async () => {
      const venueData = {
        project_id: testProjectId,
        code: 'TEST_VENUE_002',
        name: '测试场地2'
      };

      const venue = await VenueModel.create(venueData);
      expect(venue.status).toBe('active');
    });

    it('创建场地时缺少必填字段应该失败', async () => {
      const venueData = {
        project_id: testProjectId
        // 缺少 code 和 name
      };

      await expect(VenueModel.create(venueData as any)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('应该根据ID查找场地', async () => {
      const venueData = {
        project_id: testProjectId,
        code: 'TEST_VENUE_003',
        name: '测试场地3'
      };

      const createdVenue = await VenueModel.create(venueData);
      const foundVenue = await VenueModel.findById(createdVenue.id);

      expect(foundVenue).toBeDefined();
      expect(foundVenue!.id).toBe(createdVenue.id);
      expect(foundVenue!.name).toBe(venueData.name);
    });

    it('查找不存在的场地应该返回null', async () => {
      const venue = await VenueModel.findById(99999);
      expect(venue).toBeNull();
    });
  });

  describe('findByProjectId', () => {
    it('应该根据项目ID查找场地列表', async () => {
      const venueData1 = {
        project_id: testProjectId,
        code: 'TEST_VENUE_004',
        name: '测试场地4'
      };

      const venueData2 = {
        project_id: testProjectId,
        code: 'TEST_VENUE_005',
        name: '测试场地5'
      };

      await VenueModel.create(venueData1);
      await VenueModel.create(venueData2);

      const venues = await VenueModel.findByProjectId(testProjectId);

      expect(venues.length).toBeGreaterThanOrEqual(2);
      expect(venues.every(venue => venue.project_id === testProjectId)).toBe(true);
    });
  });

  describe('findByCode', () => {
    it('应该根据场地编码查找场地（在指定项目内）', async () => {
      const venueData = {
        project_id: testProjectId,
        code: 'TEST_VENUE_006',
        name: '测试场地6'
      };

      await VenueModel.create(venueData);
      const foundVenue = await VenueModel.findByCode(testProjectId, venueData.code);

      expect(foundVenue).toBeDefined();
      expect(foundVenue!.code).toBe(venueData.code);
      expect(foundVenue!.project_id).toBe(testProjectId);
    });

    it('查找不存在的场地编码应该返回null', async () => {
      const venue = await VenueModel.findByCode(testProjectId, 'NON_EXISTENT_CODE');
      expect(venue).toBeNull();
    });
  });

  describe('findByName', () => {
    it('应该根据场地名称模糊查找场地', async () => {
      const venueData = {
        project_id: testProjectId,
        code: 'TEST_VENUE_007',
        name: '测试搜索场地'
      };

      await VenueModel.create(venueData);

      const venues = await VenueModel.findByName('搜索', testProjectId);

      expect(venues.length).toBeGreaterThanOrEqual(1);
      expect(venues.every(venue => venue.name.includes('搜索'))).toBe(true);
    });
  });

  describe('update', () => {
    it('应该成功更新场地信息', async () => {
      const venueData = {
        project_id: testProjectId,
        code: 'TEST_VENUE_008',
        name: '测试场地8',
        description: '原始描述'
      };

      const venue = await VenueModel.create(venueData);
      const updateData = {
        name: '更新后的场地名',
        description: '更新后的描述',
        status: 'inactive' as ProjectStatus
      };

      const updatedVenue = await VenueModel.update(venue.id, updateData);

      expect(updatedVenue.name).toBe(updateData.name);
      expect(updatedVenue.description).toBe(updateData.description);
      expect(updatedVenue.status).toBe(updateData.status);
      expect(updatedVenue.code).toBe(venueData.code); // 未更新的字段保持不变
    });

    it('更新不存在的场地应该失败', async () => {
      await expect(VenueModel.update(99999, { name: '新名称' })).rejects.toThrow('场地不存在或更新失败');
    });
  });

  describe('softDelete', () => {
    it('应该软删除场地（设置状态为inactive）', async () => {
      const venueData = {
        project_id: testProjectId,
        code: 'TEST_VENUE_009',
        name: '测试场地9'
      };

      const venue = await VenueModel.create(venueData);
      const result = await VenueModel.softDelete(venue.id);

      expect(result).toBe(true);

      const updatedVenue = await VenueModel.findById(venue.id);
      expect(updatedVenue!.status).toBe('inactive');
    });
  });

  describe('delete', () => {
    it('应该物理删除场地', async () => {
      const venueData = {
        project_id: testProjectId,
        code: 'TEST_VENUE_010',
        name: '测试场地10'
      };

      const venue = await VenueModel.create(venueData);
      const result = await VenueModel.delete(venue.id);

      expect(result).toBe(true);

      const deletedVenue = await VenueModel.findById(venue.id);
      expect(deletedVenue).toBeNull();
    });
  });

  describe('count', () => {
    it('应该统计场地数量', async () => {
      const initialCount = await VenueModel.count();

      await VenueModel.create({
        project_id: testProjectId,
        code: 'TEST_VENUE_011',
        name: '测试场地11'
      });

      const newCount = await VenueModel.count();
      expect(newCount).toBe(initialCount + 1);
    });

    it('应该根据条件统计场地数量', async () => {
      await VenueModel.create({
        project_id: testProjectId,
        code: 'TEST_VENUE_012',
        name: '测试场地12',
        status: 'active' as ProjectStatus
      });

      const count = await VenueModel.count({
        status: 'active',
        projectId: testProjectId
      });

      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('validateVenueData', () => {
    it('应该验证有效的场地数据', () => {
      const venueData = {
        project_id: testProjectId,
        code: 'VENUE_A',
        name: '场地A',
        description: '测试场地',
        status: 'active' as ProjectStatus
      };

      const validation = VenueModel.validateVenueData(venueData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('应该检测无效的场地数据', () => {
      const venueData = {
        project_id: 0, // 无效项目ID
        code: 'invalid-code', // 无效编码格式
        name: '', // 空名称
        status: 'invalid_status' as ProjectStatus // 无效状态
      };

      const validation = VenueModel.validateVenueData(venueData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('项目ID无效');
      expect(validation.errors).toContain('场地编码格式无效（只能包含大写字母、数字和下划线，长度1-10位）');
      expect(validation.errors).toContain('场地名称不能为空');
      expect(validation.errors).toContain('场地状态无效');
    });
  });

  describe('exists', () => {
    it('应该检查场地是否存在', async () => {
      const venueData = {
        project_id: testProjectId,
        code: 'TEST_VENUE_013',
        name: '测试场地13',
        status: 'active' as ProjectStatus
      };

      const venue = await VenueModel.create(venueData);
      const exists = await VenueModel.exists(venue.id);

      expect(exists).toBe(true);

      const notExists = await VenueModel.exists(99999);
      expect(notExists).toBe(false);
    });
  });

  describe('codeExists', () => {
    it('应该检查场地编码是否已存在（在指定项目内）', async () => {
      const venueData = {
        project_id: testProjectId,
        code: 'TEST_VENUE_014',
        name: '测试场地14',
        status: 'active' as ProjectStatus
      };

      await VenueModel.create(venueData);

      const exists = await VenueModel.codeExists(testProjectId, venueData.code);
      expect(exists).toBe(true);

      const notExists = await VenueModel.codeExists(testProjectId, 'NON_EXISTENT_CODE');
      expect(notExists).toBe(false);
    });

    it('应该排除指定ID检查编码是否存在', async () => {
      const venueData = {
        project_id: testProjectId,
        code: 'TEST_VENUE_015',
        name: '测试场地15',
        status: 'active' as ProjectStatus
      };

      const venue = await VenueModel.create(venueData);

      // 排除自己的ID，应该返回false
      const exists = await VenueModel.codeExists(testProjectId, venueData.code, venue.id);
      expect(exists).toBe(false);
    });
  });

  describe('batchUpdateStatus', () => {
    it('应该批量更新场地状态', async () => {
      const venue1 = await VenueModel.create({
        project_id: testProjectId,
        code: 'TEST_VENUE_016',
        name: '测试场地16',
        status: 'active' as ProjectStatus
      });

      const venue2 = await VenueModel.create({
        project_id: testProjectId,
        code: 'TEST_VENUE_017',
        name: '测试场地17',
        status: 'active' as ProjectStatus
      });

      const updatedCount = await VenueModel.batchUpdateStatus(
        [venue1.id, venue2.id],
        'inactive'
      );

      expect(updatedCount).toBe(2);

      const updatedVenue1 = await VenueModel.findById(venue1.id);
      const updatedVenue2 = await VenueModel.findById(venue2.id);

      expect(updatedVenue1!.status).toBe('inactive');
      expect(updatedVenue2!.status).toBe('inactive');
    });

    it('空ID数组应该返回0', async () => {
      const updatedCount = await VenueModel.batchUpdateStatus([], 'inactive');
      expect(updatedCount).toBe(0);
    });
  });

  describe('findAll with filters', () => {
    it('应该支持复杂筛选查询', async () => {
      await VenueModel.create({
        project_id: testProjectId,
        code: 'TEST_VENUE_018',
        name: '测试筛选场地',
        description: '筛选测试',
        status: 'active' as ProjectStatus
      });

      const venues = await VenueModel.findAll({
        status: 'active',
        projectId: testProjectId,
        search: '筛选'
      });

      expect(venues.length).toBeGreaterThanOrEqual(1);
      expect(venues.every(venue => 
        venue.status === 'active' &&
        venue.project_id === testProjectId &&
        (venue.name.includes('筛选') || venue.description?.includes('筛选'))
      )).toBe(true);
    });

    it('应该支持分页查询', async () => {
      // 创建多个场地
      for (let i = 0; i < 5; i++) {
        await VenueModel.create({
          project_id: testProjectId,
          code: `TEST_VENUE_PAGE_${i}`,
          name: `测试分页场地${i}`,
          status: 'active' as ProjectStatus
        });
      }

      const page1 = await VenueModel.findAll({ 
        projectId: testProjectId,
        page: 1, 
        limit: 2 
      });
      const page2 = await VenueModel.findAll({ 
        projectId: testProjectId,
        page: 2, 
        limit: 2 
      });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });
});