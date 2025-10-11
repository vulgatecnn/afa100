import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SpaceService } from '../../../src/services/space.service.js';
import { Database } from '../../../src/utils/database.js';
import { AppError, ErrorCodes } from '../../../src/middleware/error.middleware.js';

// Mock 依赖
vi.mock('../../../src/utils/database.js', () => ({
  Database: {
    getInstance: vi.fn(() => ({
      prepare: vi.fn(() => ({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn()
      }))
    }))
  }
}));

vi.mock('../../../src/models/project.model.js', () => ({
  Project: {
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../../../src/models/venue.model.js', () => ({
  Venue: {
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../../../src/models/floor.model.js', () => ({
  Floor: {
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

describe('SpaceService 单元测试', () => {
  let spaceService: SpaceService;
  let mockDb: any;

  beforeEach(() => {
    // 重置所有mock
    vi.clearAllMocks();
    
    // 创建 mockDb 对象
    mockDb = {
      prepare: vi.fn(() => ({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn()
      })),
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn()
    };
    
    // Mock Database.getInstance 返回 mockDb
    vi.mocked(Database.getInstance).mockReturnValue(mockDb);
    
    spaceService = new SpaceService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('项目管理', () => {
    describe('getProjects', () => {
      it('应该返回分页的项目列表', async () => {
        const mockProjects = [
          { id: 1, name: '项目A', code: 'PROJECT_A', status: 'active', venue_count: 3 },
          { id: 2, name: '项目B', code: 'PROJECT_B', status: 'active', venue_count: 2 },
        ];

        mockDb.get.mockResolvedValueOnce({ total: 2 });
        mockDb.all.mockResolvedValueOnce(mockProjects);

        const result = await spaceService.getProjects({
          page: 1,
          limit: 10,
        });

        expect(result).toEqual({
          data: mockProjects,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
          },
        });

        expect(mockDb.get).toHaveBeenCalledWith(
          expect.stringContaining('SELECT COUNT(*) as total'),
          []
        );
        expect(mockDb.all).toHaveBeenCalledWith(
          expect.stringContaining('SELECT'),
          expect.arrayContaining([10, 0])
        );
      });

      it('应该支持状态筛选', async () => {
        mockDb.get.mockResolvedValueOnce({ total: 1 });
        mockDb.all.mockResolvedValueOnce([]);

        await spaceService.getProjects({
          page: 1,
          limit: 10,
          status: 'active',
        });

        expect(mockDb.get).toHaveBeenCalledWith(
          expect.stringContaining('WHERE status = ?'),
          ['active']
        );
      });

      it('应该支持搜索功能', async () => {
        mockDb.get.mockResolvedValueOnce({ total: 0 });
        mockDb.all.mockResolvedValueOnce([]);

        await spaceService.getProjects({
          page: 1,
          limit: 10,
          search: '测试项目',
        });

        expect(mockDb.get).toHaveBeenCalledWith(
          expect.stringContaining('(name LIKE ? OR code LIKE ? OR description LIKE ?)'),
          ['%测试项目%', '%测试项目%', '%测试项目%']
        );
      });
    });

    describe('createProject', () => {
      it('应该成功创建项目', async () => {
        const projectData = {
          name: '新项目',
          code: 'NEW_PROJECT',
          description: '项目描述',
        };

        const mockCreatedProject = {
          id: 1,
          ...projectData,
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        mockDb.run.mockResolvedValueOnce({ lastID: 1, changes: 1 });
        mockDb.get.mockResolvedValueOnce(mockCreatedProject);

        const result = await spaceService.createProject(projectData);

        expect(result).toEqual(mockCreatedProject);
        expect(mockDb.run).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO projects'),
          expect.arrayContaining([
            projectData.name,
            projectData.code,
            projectData.description,
            'active',
          ])
        );
      });

      it('应该在数据库插入失败时抛出错误', async () => {
        const projectData = {
          name: '新项目',
          code: 'NEW_PROJECT',
        };

        mockDb.run.mockResolvedValueOnce({ lastID: null, changes: 0 });

        await expect(spaceService.createProject(projectData)).rejects.toThrow(
          new AppError('创建项目失败', 500, ErrorCodes.DATABASE_ERROR)
        );
      });
    });

    describe('updateProject', () => {
      it('应该成功更新项目信息', async () => {
        const updateData = {
          name: '更新后的项目名',
          description: '更新后的描述',
        };

        const mockUpdatedProject = {
          id: 1,
          name: '更新后的项目名',
          code: 'TEST_PROJECT',
          description: '更新后的描述',
          status: 'active',
        };

        mockDb.run.mockResolvedValueOnce({ changes: 1 });
        mockDb.get.mockResolvedValueOnce(mockUpdatedProject);

        const result = await spaceService.updateProject(1, updateData);

        expect(result).toEqual(mockUpdatedProject);
        expect(mockDb.run).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE projects'),
          expect.arrayContaining(['更新后的项目名', '更新后的描述', 1])
        );
      });

      it('应该在没有更新字段时抛出错误', async () => {
        await expect(spaceService.updateProject(1, {})).rejects.toThrow(
          new AppError('没有需要更新的字段', 400, ErrorCodes.VALIDATION_ERROR)
        );
      });

      it('应该在项目不存在时抛出错误', async () => {
        const updateData = { name: '新名称' };
        mockDb.run.mockResolvedValueOnce({ changes: 0 });

        await expect(spaceService.updateProject(999, updateData)).rejects.toThrow(
          new AppError('项目不存在或更新失败', 404, ErrorCodes.PROJECT_NOT_FOUND)
        );
      });
    });

    describe('projectHasVenues', () => {
      it('应该在有场地时返回true', async () => {
        mockDb.get.mockResolvedValueOnce({ count: 2 });

        const result = await spaceService.projectHasVenues(1);

        expect(result).toBe(true);
        expect(mockDb.get).toHaveBeenCalledWith(
          'SELECT COUNT(*) as count FROM venues WHERE project_id = ?',
          [1]
        );
      });

      it('应该在没有场地时返回false', async () => {
        mockDb.get.mockResolvedValueOnce({ count: 0 });

        const result = await spaceService.projectHasVenues(1);

        expect(result).toBe(false);
      });
    });
  });

  describe('场地管理', () => {
    describe('getVenues', () => {
      it('应该返回分页的场地列表', async () => {
        const mockVenues = [
          {
            id: 1,
            name: '场地A',
            code: 'VENUE_A',
            project_id: 1,
            project_name: '项目A',
            floor_count: 3,
          },
        ];

        mockDb.get.mockResolvedValueOnce({ total: 1 });
        mockDb.all.mockResolvedValueOnce(mockVenues);

        const result = await spaceService.getVenues({
          page: 1,
          limit: 10,
        });

        expect(result).toEqual({
          data: mockVenues,
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
          },
        });
      });

      it('应该支持按项目筛选', async () => {
        mockDb.get.mockResolvedValueOnce({ total: 0 });
        mockDb.all.mockResolvedValueOnce([]);

        await spaceService.getVenues({
          page: 1,
          limit: 10,
          projectId: 1,
        });

        expect(mockDb.get).toHaveBeenCalledWith(
          expect.stringContaining('WHERE v.project_id = ?'),
          [1]
        );
      });
    });

    describe('createVenue', () => {
      it('应该成功创建场地', async () => {
        const venueData = {
          project_id: 1,
          name: '新场地',
          code: 'NEW_VENUE',
          description: '场地描述',
        };

        const mockCreatedVenue = {
          id: 1,
          ...venueData,
          status: 'active',
          project_name: '测试项目',
        };

        mockDb.run.mockResolvedValueOnce({ lastID: 1, changes: 1 });
        mockDb.get.mockResolvedValueOnce(mockCreatedVenue);

        const result = await spaceService.createVenue(venueData);

        expect(result).toEqual(mockCreatedVenue);
        expect(mockDb.run).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO venues'),
          expect.arrayContaining([
            venueData.project_id,
            venueData.name,
            venueData.code,
            venueData.description,
            'active',
          ])
        );
      });
    });

    describe('venueHasFloors', () => {
      it('应该在有楼层时返回true', async () => {
        mockDb.get.mockResolvedValueOnce({ count: 3 });

        const result = await spaceService.venueHasFloors(1);

        expect(result).toBe(true);
        expect(mockDb.get).toHaveBeenCalledWith(
          'SELECT COUNT(*) as count FROM floors WHERE venue_id = ?',
          [1]
        );
      });

      it('应该在没有楼层时返回false', async () => {
        mockDb.get.mockResolvedValueOnce({ count: 0 });

        const result = await spaceService.venueHasFloors(1);

        expect(result).toBe(false);
      });
    });
  });

  describe('楼层管理', () => {
    describe('getFloors', () => {
      it('应该返回分页的楼层列表', async () => {
        const mockFloors = [
          {
            id: 1,
            name: '1楼',
            code: 'F1',
            venue_id: 1,
            venue_name: '场地A',
            project_name: '项目A',
          },
        ];

        mockDb.get.mockResolvedValueOnce({ total: 1 });
        mockDb.all.mockResolvedValueOnce(mockFloors);

        const result = await spaceService.getFloors({
          page: 1,
          limit: 10,
        });

        expect(result).toEqual({
          data: mockFloors,
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
          },
        });
      });

      it('应该支持按场地筛选', async () => {
        mockDb.get.mockResolvedValueOnce({ total: 0 });
        mockDb.all.mockResolvedValueOnce([]);

        await spaceService.getFloors({
          page: 1,
          limit: 10,
          venueId: 1,
        });

        expect(mockDb.get).toHaveBeenCalledWith(
          expect.stringContaining('WHERE f.venue_id = ?'),
          [1]
        );
      });
    });

    describe('createFloor', () => {
      it('应该成功创建楼层', async () => {
        const floorData = {
          venue_id: 1,
          name: '1楼',
          code: 'F1',
          description: '一楼大厅',
        };

        const mockCreatedFloor = {
          id: 1,
          ...floorData,
          status: 'active',
          venue_name: '测试场地',
          project_name: '测试项目',
        };

        mockDb.run.mockResolvedValueOnce({ lastID: 1, changes: 1 });
        mockDb.get.mockResolvedValueOnce(mockCreatedFloor);

        const result = await spaceService.createFloor(floorData);

        expect(result).toEqual(mockCreatedFloor);
        expect(mockDb.run).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO floors'),
          expect.arrayContaining([
            floorData.venue_id,
            floorData.name,
            floorData.code,
            floorData.description,
            'active',
          ])
        );
      });
    });
  });

  describe('层级结构查询', () => {
    describe('getSpaceHierarchy', () => {
      it('应该返回完整的层级结构', async () => {
        const mockRows = [
          {
            project_id: 1,
            project_code: 'P1',
            project_name: '项目1',
            project_status: 'active',
            venue_id: 1,
            venue_code: 'V1',
            venue_name: '场地1',
            venue_status: 'active',
            floor_id: 1,
            floor_code: 'F1',
            floor_name: '1楼',
            floor_status: 'active',
          },
          {
            project_id: 1,
            project_code: 'P1',
            project_name: '项目1',
            project_status: 'active',
            venue_id: 1,
            venue_code: 'V1',
            venue_name: '场地1',
            venue_status: 'active',
            floor_id: 2,
            floor_code: 'F2',
            floor_name: '2楼',
            floor_status: 'active',
          },
        ];

        mockDb.all.mockResolvedValueOnce(mockRows);

        const result = await spaceService.getSpaceHierarchy();

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          id: 1,
          code: 'P1',
          name: '项目1',
          type: 'project',
          venues: expect.arrayContaining([
            expect.objectContaining({
              id: 1,
              code: 'V1',
              name: '场地1',
              type: 'venue',
              floors: expect.arrayContaining([
                expect.objectContaining({
                  id: 1,
                  code: 'F1',
                  name: '1楼',
                  type: 'floor',
                }),
                expect.objectContaining({
                  id: 2,
                  code: 'F2',
                  name: '2楼',
                  type: 'floor',
                }),
              ]),
            }),
          ]),
        });
      });

      it('应该支持按项目筛选', async () => {
        mockDb.all.mockResolvedValueOnce([]);

        await spaceService.getSpaceHierarchy(1);

        expect(mockDb.all).toHaveBeenCalledWith(
          expect.stringContaining('WHERE p.id = ?'),
          [1]
        );
      });

      it('应该处理没有场地和楼层的项目', async () => {
        const mockRows = [
          {
            project_id: 1,
            project_code: 'P1',
            project_name: '项目1',
            project_status: 'active',
            venue_id: null,
            venue_code: null,
            venue_name: null,
            venue_status: null,
            floor_id: null,
            floor_code: null,
            floor_name: null,
            floor_status: null,
          },
        ];

        mockDb.all.mockResolvedValueOnce(mockRows);

        const result = await spaceService.getSpaceHierarchy();

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          id: 1,
          code: 'P1',
          name: '项目1',
          type: 'project',
          venues: [],
        });
      });
    });

    describe('getMerchantSpaces', () => {
      it('应该返回商户有权限的空间', async () => {
        const mockSpaces = [
          {
            resource_id: 1,
            resource_code: 'P1',
            resource_name: '项目1',
            resource_type: 'project',
            permission_code: 'project:1:access',
            permission_name: '项目1通行权限',
            actions: '["read", "access"]',
          },
          {
            resource_id: 1,
            resource_code: 'V1',
            resource_name: '场地1',
            resource_type: 'venue',
            permission_code: 'venue:1:access',
            permission_name: '场地1通行权限',
            actions: '["read", "access"]',
          },
        ];

        mockDb.all.mockResolvedValueOnce(mockSpaces);

        const result = await spaceService.getMerchantSpaces(1);

        expect(result).toEqual(mockSpaces);
        expect(mockDb.all).toHaveBeenCalledWith(
          expect.stringContaining('UNION ALL'),
          [1, 1, 1]
        );
      });

      it('应该在商户没有权限时返回空数组', async () => {
        mockDb.all.mockResolvedValueOnce([]);

        const result = await spaceService.getMerchantSpaces(999);

        expect(result).toEqual([]);
      });
    });
  });
});