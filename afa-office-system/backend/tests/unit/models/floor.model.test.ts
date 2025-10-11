import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import database from '../../../src/utils/database.js';
import { FloorModel } from '../../../src/models/floor.model.js';
import { VenueModel } from '../../../src/models/venue.model.js';
import { ProjectModel } from '../../../src/models/project.model.js';
import type { ProjectStatus } from '../../../src/types/index.js';

describe('FloorModel', () => {
  let testProjectId: number;
  let testVenueId: number;

  beforeEach(async () => {
    await database.connect();
    
    const project = await ProjectModel.create({
      code: 'TEST_PROJECT',
      name: '测试项目',
      description: '用于测试的项目',
      status: 'active'
    });
    testProjectId = project.id;

    const venue = await VenueModel.create({
      project_id: testProjectId,
      code: 'TEST_VENUE',
      name: '测试场地',
      description: '用于测试的场地',
      status: 'active'
    });
    testVenueId = venue.id;
  });

  afterEach(async () => {
    await database.run('DELETE FROM floors WHERE code LIKE "TEST_%"');
    await database.run('DELETE FROM venues WHERE code LIKE "TEST_%"');
    await database.run('DELETE FROM projects WHERE code LIKE "TEST_%"');
    await database.close();
  });

  describe('create', () => {
    it('应该成功创建楼层', async () => {
      const floorData = {
        venue_id: testVenueId,
        code: 'TEST_F1',
        name: '测试1楼',
        description: '测试场地的1楼',
        status: 'active' as ProjectStatus
      };

      const floor = await FloorModel.create(floorData);

      expect(floor).toBeDefined();
      expect(floor.id).toBeGreaterThan(0);
      expect(floor.venue_id).toBe(floorData.venue_id);
      expect(floor.code).toBe(floorData.code);
      expect(floor.name).toBe(floorData.name);
      expect(floor.description).toBe(floorData.description);
      expect(floor.status).toBe(floorData.status);
      expect(floor.created_at).toBeDefined();
      expect(floor.updated_at).toBeDefined();
    });

    it('应该使用默认状态创建楼层', async () => {
      const floorData = {
        venue_id: testVenueId,
        code: 'TEST_F2',
        name: '测试2楼'
      };

      const floor = await FloorModel.create(floorData);
      expect(floor.status).toBe('active');
    });
  });

  describe('findById', () => {
    it('应该根据ID查找楼层', async () => {
      const floorData = {
        venue_id: testVenueId,
        code: 'TEST_F3',
        name: '测试3楼'
      };

      const createdFloor = await FloorModel.create(floorData);
      const foundFloor = await FloorModel.findById(createdFloor.id);

      expect(foundFloor).toBeDefined();
      expect(foundFloor!.id).toBe(createdFloor.id);
      expect(foundFloor!.name).toBe(floorData.name);
    });

    it('查找不存在的楼层应该返回null', async () => {
      const floor = await FloorModel.findById(99999);
      expect(floor).toBeNull();
    });
  });

  describe('findByVenueId', () => {
    it('应该根据场地ID查找楼层列表', async () => {
      const floorData1 = {
        venue_id: testVenueId,
        code: 'TEST_F4',
        name: '测试4楼'
      };

      const floorData2 = {
        venue_id: testVenueId,
        code: 'TEST_F5',
        name: '测试5楼'
      };

      await FloorModel.create(floorData1);
      await FloorModel.create(floorData2);

      const floors = await FloorModel.findByVenueId(testVenueId);

      expect(floors.length).toBeGreaterThanOrEqual(2);
      expect(floors.every(floor => floor.venue_id === testVenueId)).toBe(true);
    });
  });

  describe('validateFloorData', () => {
    it('应该验证有效的楼层数据', () => {
      const floorData = {
        venue_id: testVenueId,
        code: 'F1',
        name: '1楼',
        description: '第一层',
        status: 'active' as ProjectStatus
      };

      const validation = FloorModel.validateFloorData(floorData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('应该检测无效的楼层数据', () => {
      const floorData = {
        venue_id: 0,
        code: 'invalid-code',
        name: '',
        status: 'invalid_status' as ProjectStatus
      };

      const validation = FloorModel.validateFloorData(floorData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('场地ID无效');
      expect(validation.errors).toContain('楼层编码格式无效（只能包含大写字母、数字、下划线和连字符，长度1-10位）');
      expect(validation.errors).toContain('楼层名称不能为空');
      expect(validation.errors).toContain('楼层状态无效');
    });
  });

  describe('exists', () => {
    it('应该检查楼层是否存在', async () => {
      const floorData = {
        venue_id: testVenueId,
        code: 'TEST_F15',
        name: '测试15楼'
      };

      const floor = await FloorModel.create(floorData);
      const exists = await FloorModel.exists(floor.id);

      expect(exists).toBe(true);

      const notExists = await FloorModel.exists(99999);
      expect(notExists).toBe(false);
    });
  });

  describe('count', () => {
    it('应该统计楼层数量', async () => {
      const initialCount = await FloorModel.count();

      await FloorModel.create({
        venue_id: testVenueId,
        code: 'TEST_F13',
        name: '测试13楼'
      });

      const newCount = await FloorModel.count();
      expect(newCount).toBe(initialCount + 1);
    });
  });
});