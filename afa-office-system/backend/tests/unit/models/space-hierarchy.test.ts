import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProjectModel } from '../../../src/models/project.model.js';
import { VenueModel } from '../../../src/models/venue.model.js';
import { FloorModel } from '../../../src/models/floor.model.js';
import { PermissionModel } from '../../../src/models/permission.model.js';
import database from '../../../src/utils/database.js';

describe('Space Hierarchy Integration', () => {
  let testProject: any;
  let testVenue: any;
  let testFloor: any;

  beforeEach(async () => {
    console.log('🚀 初始化空间层级测试环境...');
    await database.connect();
    
    // 清理测试数据
    await database.run('DELETE FROM permissions WHERE code LIKE "TEST_%"');
    await database.run('DELETE FROM floors WHERE code LIKE "TEST_%"');
    await database.run('DELETE FROM venues WHERE code LIKE "TEST_%"');
    await database.run('DELETE FROM projects WHERE code LIKE "TEST_%"');
  });

  afterEach(async () => {
    console.log('🧹 清理空间层级测试环境...');
    // 清理测试数据
    await database.run('DELETE FROM permissions WHERE code LIKE "TEST_%"');
    await database.run('DELETE FROM floors WHERE code LIKE "TEST_%"');
    await database.run('DELETE FROM venues WHERE code LIKE "TEST_%"');
    await database.run('DELETE FROM projects WHERE code LIKE "TEST_%"');
    await database.close();
  });

  describe('创建完整的空间层级结构', () => {
    it('应该能够创建项目->场地->楼层的完整层级', async () => {
      // 1. 创建项目
      testProject = await ProjectModel.create({
        code: 'TEST_HIERARCHY_PROJECT',
        name: '测试层级项目',
        description: '用于测试空间层级关系的项目'
      });

      expect(testProject).toBeDefined();
      expect(testProject.id).toBeGreaterThan(0);

      // 2. 在项目下创建场地
      testVenue = await VenueModel.create({
        project_id: testProject.id,
        code: 'TEST_VENUE_A',
        name: '测试场地A',
        description: '测试场地A的描述'
      });

      expect(testVenue).toBeDefined();
      expect(testVenue.project_id).toBe(testProject.id);

      // 3. 在场地下创建楼层
      testFloor = await FloorModel.create({
        venue_id: testVenue.id,
        code: 'TEST_FLOOR_1',
        name: '测试楼层1',
        description: '测试楼层1的描述'
      });

      expect(testFloor).toBeDefined();
      expect(testFloor.venue_id).toBe(testVenue.id);

      // 4. 验证层级关系
      const foundVenues = await VenueModel.findByProjectId(testProject.id);
      expect(foundVenues).toHaveLength(1);
      expect(foundVenues[0].id).toBe(testVenue.id);

      const foundFloors = await FloorModel.findByVenueId(testVenue.id);
      expect(foundFloors).toHaveLength(1);
      expect(foundFloors[0].id).toBe(testFloor.id);
    });

    it('应该能够获取项目的完整层级结构', async () => {
      // 创建测试数据
      testProject = await ProjectModel.create({
        code: 'TEST_HIERARCHY_PROJECT_2',
        name: '测试层级项目2'
      });

      testVenue = await VenueModel.create({
        project_id: testProject.id,
        code: 'TEST_VENUE_B',
        name: '测试场地B'
      });

      testFloor = await FloorModel.create({
        venue_id: testVenue.id,
        code: 'TEST_FLOOR_2',
        name: '测试楼层2'
      });

      // 获取完整层级结构
      const hierarchy = await ProjectModel.getHierarchy(testProject.id);

      expect(hierarchy).toBeDefined();
      expect(hierarchy.project.id).toBe(testProject.id);
      expect(hierarchy.venues).toHaveLength(1);
      expect(hierarchy.venues[0].venue.id).toBe(testVenue.id);
      expect(hierarchy.venues[0].floors).toHaveLength(1);
      expect(hierarchy.venues[0].floors[0].id).toBe(testFloor.id);
    });
  });

  describe('权限管理集成', () => {
    beforeEach(async () => {
      // 创建基础空间结构
      testProject = await ProjectModel.create({
        code: 'TEST_PERMISSION_PROJECT',
        name: '测试权限项目'
      });

      testVenue = await VenueModel.create({
        project_id: testProject.id,
        code: 'TEST_PERMISSION_VENUE',
        name: '测试权限场地'
      });

      testFloor = await FloorModel.create({
        venue_id: testVenue.id,
        code: 'TEST_PERMISSION_FLOOR',
        name: '测试权限楼层'
      });
    });

    it('应该能够为不同层级的空间创建权限', async () => {
      // 为项目创建权限
      const projectPermission = await PermissionModel.create({
        code: 'TEST_PROJECT_ACCESS',
        name: '项目访问权限',
        description: '可以访问整个项目',
        resource_type: 'project',
        resource_id: testProject.id,
        actions: JSON.stringify(['access', 'manage'])
      });

      // 为场地创建权限
      const venuePermission = await PermissionModel.create({
        code: 'TEST_VENUE_ACCESS',
        name: '场地访问权限',
        description: '可以访问指定场地',
        resource_type: 'venue',
        resource_id: testVenue.id,
        actions: JSON.stringify(['access'])
      });

      // 为楼层创建权限
      const floorPermission = await PermissionModel.create({
        code: 'TEST_FLOOR_ACCESS',
        name: '楼层访问权限',
        description: '可以访问指定楼层',
        resource_type: 'floor',
        resource_id: testFloor.id,
        actions: JSON.stringify(['access'])
      });

      // 验证权限创建成功
      expect(projectPermission.resource_type).toBe('project');
      expect(projectPermission.resource_id).toBe(testProject.id);

      expect(venuePermission.resource_type).toBe('venue');
      expect(venuePermission.resource_id).toBe(testVenue.id);

      expect(floorPermission.resource_type).toBe('floor');
      expect(floorPermission.resource_id).toBe(testFloor.id);

      // 验证可以根据资源查找权限
      const projectPermissions = await PermissionModel.findByResource('project', testProject.id);
      expect(projectPermissions).toHaveLength(1);
      expect(projectPermissions[0].code).toBe('TEST_PROJECT_ACCESS');

      const venuePermissions = await PermissionModel.findByResource('venue', testVenue.id);
      expect(venuePermissions).toHaveLength(1);
      expect(venuePermissions[0].code).toBe('TEST_VENUE_ACCESS');

      const floorPermissions = await PermissionModel.findByResource('floor', testFloor.id);
      expect(floorPermissions).toHaveLength(1);
      expect(floorPermissions[0].code).toBe('TEST_FLOOR_ACCESS');
    });
  });

  describe('数据完整性约束', () => {
    it('删除项目时应该级联删除场地和楼层', async () => {
      // 创建完整层级
      testProject = await ProjectModel.create({
        code: 'TEST_CASCADE_PROJECT',
        name: '测试级联删除项目'
      });

      testVenue = await VenueModel.create({
        project_id: testProject.id,
        code: 'TEST_CASCADE_VENUE',
        name: '测试级联删除场地'
      });

      testFloor = await FloorModel.create({
        venue_id: testVenue.id,
        code: 'TEST_CASCADE_FLOOR',
        name: '测试级联删除楼层'
      });

      // 验证数据存在
      expect(await ProjectModel.findById(testProject.id)).toBeDefined();
      expect(await VenueModel.findById(testVenue.id)).toBeDefined();
      expect(await FloorModel.findById(testFloor.id)).toBeDefined();

      // 删除项目（物理删除以测试级联）
      await ProjectModel.delete(testProject.id);

      // 验证级联删除
      expect(await ProjectModel.findById(testProject.id)).toBeNull();
      expect(await VenueModel.findById(testVenue.id)).toBeNull();
      expect(await FloorModel.findById(testFloor.id)).toBeNull();
    });

    it('删除场地时应该级联删除楼层', async () => {
      // 创建测试数据
      testProject = await ProjectModel.create({
        code: 'TEST_CASCADE_PROJECT_2',
        name: '测试级联删除项目2'
      });

      testVenue = await VenueModel.create({
        project_id: testProject.id,
        code: 'TEST_CASCADE_VENUE_2',
        name: '测试级联删除场地2'
      });

      testFloor = await FloorModel.create({
        venue_id: testVenue.id,
        code: 'TEST_CASCADE_FLOOR_2',
        name: '测试级联删除楼层2'
      });

      // 删除场地
      await VenueModel.delete(testVenue.id);

      // 验证项目仍存在，但场地和楼层被删除
      expect(await ProjectModel.findById(testProject.id)).toBeDefined();
      expect(await VenueModel.findById(testVenue.id)).toBeNull();
      expect(await FloorModel.findById(testFloor.id)).toBeNull();
    });
  });

  describe('统计信息', () => {
    it('应该能够获取项目的统计信息', async () => {
      // 创建测试数据
      testProject = await ProjectModel.create({
        code: 'TEST_STATS_PROJECT',
        name: '测试统计项目'
      });

      // 创建多个场地
      const venue1 = await VenueModel.create({
        project_id: testProject.id,
        code: 'TEST_STATS_VENUE_1',
        name: '统计测试场地1'
      });

      const venue2 = await VenueModel.create({
        project_id: testProject.id,
        code: 'TEST_STATS_VENUE_2',
        name: '统计测试场地2'
      });

      // 为每个场地创建楼层
      await FloorModel.create({
        venue_id: venue1.id,
        code: 'TEST_STATS_FLOOR_1_1',
        name: '统计测试楼层1-1'
      });

      await FloorModel.create({
        venue_id: venue1.id,
        code: 'TEST_STATS_FLOOR_1_2',
        name: '统计测试楼层1-2'
      });

      await FloorModel.create({
        venue_id: venue2.id,
        code: 'TEST_STATS_FLOOR_2_1',
        name: '统计测试楼层2-1'
      });

      // 获取统计信息
      const stats = await ProjectModel.getStatistics(testProject.id);

      expect(stats.venueCount).toBe(2);
      expect(stats.floorCount).toBe(3);
    });
  });
});