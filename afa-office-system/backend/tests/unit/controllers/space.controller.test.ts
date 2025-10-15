import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { SpaceController } from '../../../src/controllers/space.controller';
import { SpaceService } from '../../../src/services/space.service';

// Mock SpaceService
vi.mock('../../../src/services/space.service');

describe('SpaceController', () => {
    let spaceController: SpaceController;
    let mockSpaceService: any;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        mockSpaceService = vi.mocked(new SpaceService());
        spaceController = new SpaceController();
        (spaceController as any).spaceService = mockSpaceService;

        mockRequest = {
            params: {},
            query: {},
            body: {},
            user: { id: 1, userId: 1, userType: 'tenant_admin' }
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
    });

    describe('getSpaceHierarchy', () => {
        it('应该成功获取空间层级结构', async () => {
            // Arrange
            const mockHierarchy = {
                projects: [
                    {
                        id: 1,
                        name: '项目A',
                        venues: [
                            {
                                id: 1,
                                name: '测试场地',
                                floors: [
                                    { id: 1, name: '1楼' }
                                ]
                            }
                        ]
                    }
                ]
            };
            mockSpaceService.getSpaceHierarchy.mockResolvedValue(mockHierarchy);

            // Act
            await spaceController.getSpaceHierarchy(mockRequest as any, mockResponse as any, (() => {}) as any);

            // Assert
            expect(mockSpaceService.getSpaceHierarchy).toHaveBeenCalledWith(undefined);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: { hierarchy: mockHierarchy },
                message: '获取空间层级结构成功',
                timestamp: expect.any(String)
            });
        });

        it('应该支持按项目ID筛选空间层级结构', async () => {
            // Arrange
            const projectId = '1';
            const mockHierarchy = { projects: [] };
            mockRequest.query = { projectId };
            mockSpaceService.getSpaceHierarchy.mockResolvedValue(mockHierarchy);

            // Act
            await spaceController.getSpaceHierarchy(mockRequest as any, mockResponse as any, (() => {}) as any);

            // Assert
            expect(mockSpaceService.getSpaceHierarchy).toHaveBeenCalledWith(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: { hierarchy: mockHierarchy },
                message: '获取空间层级结构成功',
                timestamp: expect.any(String)
            });
        });
    });

    describe('getVenues', () => {
        it('应该成功获取场地列表', async () => {
            // Arrange
            const mockResult = {
                venues: [
                    { id: 1, name: '场地A', code: 'VA', project_id: 1 },
                    { id: 2, name: '场地B', code: 'VB', project_id: 1 }
                ],
                total: 2,
                page: 1,
                limit: 10
            };
            mockSpaceService.getVenues.mockResolvedValue(mockResult);

            // Act
            await spaceController.getVenues(mockRequest as any, mockResponse as any, (() => {}) as any);

            // Assert
            expect(mockSpaceService.getVenues).toHaveBeenCalledWith({
                page: 1,
                limit: 10,
                projectId: undefined,
                status: undefined,
                search: undefined
            });
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockResult,
                message: '获取场地列表成功',
                timestamp: expect.any(String)
            });
        });

        it('应该支持查询参数筛选场地列表', async () => {
            // Arrange
            const mockResult = { venues: [], total: 0, page: 1, limit: 5 };
            mockRequest.query = {
                page: '2',
                limit: '5',
                projectId: '1',
                status: 'active',
                search: '测试'
            };
            mockSpaceService.getVenues.mockResolvedValue(mockResult);

            // Act
            await spaceController.getVenues(mockRequest as any, mockResponse as any, (() => {}) as any);

            // Assert
            expect(mockSpaceService.getVenues).toHaveBeenCalledWith({
                page: 2,
                limit: 5,
                projectId: 1,
                status: 'active',
                search: '测试'
            });
        });
    });

    describe('createVenue', () => {
        it('应该成功创建场地', async () => {
            // Arrange
            const venueData = {
                name: '新场地',
                code: 'VN001',
                project_id: 1,
                address: '新地址',
                description: '场地描述'
            };
            const createdVenue = { id: 1, ...venueData };

            mockRequest.body = venueData;
            mockSpaceService.getProjectById.mockResolvedValue({ id: 1, name: '项目A' });
            mockSpaceService.getVenueByCode.mockResolvedValue(null);
            mockSpaceService.createVenue.mockResolvedValue(createdVenue);

            // Act
            await spaceController.createVenue(mockRequest as any, mockResponse as any, (() => {}) as any);

            // Assert
            expect(mockSpaceService.getProjectById).toHaveBeenCalledWith(1);
            expect(mockSpaceService.getVenueByCode).toHaveBeenCalledWith(1, 'VN001');
            expect(mockSpaceService.createVenue).toHaveBeenCalledWith(venueData);
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: { venue: createdVenue },
                message: '创建场地成功',
                timestamp: expect.any(String)
            });
        });

        it('应该处理缺少必填字段的情况', async () => {
            // Arrange
            const invalidData = { name: '场地名' }; // 缺少code和project_id
            mockRequest.body = invalidData;

            // Act & Assert - 这里会抛出异常，由asyncHandler处理
            try {
                await spaceController.createVenue(mockRequest as any, mockResponse as any, (() => {}) as any);
                expect.fail('应该抛出错误');
            } catch (error: any) {
                expect(error.message).toBe('场地名称、编码和项目ID不能为空');
                expect(error.statusCode).toBe(400);
            }
        });

        it('应该处理项目不存在的情况', async () => {
            // Arrange
            const venueData = {
                name: '新场地',
                code: 'VN001',
                project_id: 999
            };
            mockRequest.body = venueData;
            mockSpaceService.getProjectById.mockResolvedValue(null);

            // Act & Assert
            try {
                await spaceController.createVenue(mockRequest as any, mockResponse as any, (() => {}) as any);
                expect.fail('应该抛出错误');
            } catch (error: any) {
                expect(error.message).toBe('项目不存在');
                expect(error.statusCode).toBe(404);
            }
        });

        it('应该处理场地编码已存在的情况', async () => {
            // Arrange
            const venueData = {
                name: '新场地',
                code: 'VN001',
                project_id: 1
            };
            mockRequest.body = venueData;
            mockSpaceService.getProjectById.mockResolvedValue({ id: 1, name: '项目A' });
            mockSpaceService.getVenueByCode.mockResolvedValue({ id: 2, code: 'VN001' });

            // Act & Assert
            try {
                await spaceController.createVenue(mockRequest as any, mockResponse as any, (() => {}) as any);
                expect.fail('应该抛出错误');
            } catch (error: any) {
                expect(error.message).toBe('场地编码在该项目内已存在');
                expect(error.statusCode).toBe(400);
            }
        });
    });

    describe('getVenueById', () => {
        it('应该成功获取场地详情', async () => {
            // Arrange
            const venueId = '1';
            const mockVenue = { id: 1, name: '测试场地' };

            mockRequest.params = { id: venueId };
            mockSpaceService.getVenueById.mockResolvedValue(mockVenue);

            // Act
            await spaceController.getVenueById(mockRequest as any, mockResponse as any, (() => {}) as any);

            // Assert
            expect(mockSpaceService.getVenueById).toHaveBeenCalledWith(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: { venue: mockVenue },
                message: '获取场地详情成功',
                timestamp: expect.any(String)
            });
        });

        it('应该处理场地不存在的情况', async () => {
            // Arrange
            const venueId = '999';

            mockRequest.params = { id: venueId };
            mockSpaceService.getVenueById.mockResolvedValue(null);

            // Act & Assert
            try {
                await spaceController.getVenueById(mockRequest as any, mockResponse as any, (() => {}) as any);
                expect.fail('应该抛出错误');
            } catch (error: any) {
                expect(error.message).toBe('场地不存在');
                expect(error.statusCode).toBe(404);
            }
        });
    });

    describe('updateVenue', () => {
        it('应该成功更新场地', async () => {
            // Arrange
            const venueId = '1';
            const updateData = { name: '更新场地名', description: '更新描述' };
            const updatedVenue = { id: 1, ...updateData };

            mockRequest.params = { id: venueId };
            mockRequest.body = updateData;
            mockSpaceService.getVenueById.mockResolvedValue({ id: 1, name: '原场地名' });
            mockSpaceService.updateVenue.mockResolvedValue(updatedVenue);

            // Act
            await spaceController.updateVenue(mockRequest as any, mockResponse as any, (() => {}) as any);

            // Assert
            expect(mockSpaceService.getVenueById).toHaveBeenCalledWith(1);
            expect(mockSpaceService.updateVenue).toHaveBeenCalledWith(1, updateData);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: { venue: updatedVenue },
                message: '更新场地信息成功',
                timestamp: expect.any(String)
            });
        });

        it('应该处理场地不存在的情况', async () => {
            // Arrange
            const venueId = '999';
            const updateData = { name: '更新场地名' };

            mockRequest.params = { id: venueId };
            mockRequest.body = updateData;
            mockSpaceService.getVenueById.mockResolvedValue(null);

            // Act & Assert
            try {
                await spaceController.updateVenue(mockRequest as any, mockResponse as any, (() => {}) as any);
                expect.fail('应该抛出错误');
            } catch (error: any) {
                expect(error.message).toBe('场地不存在');
                expect(error.statusCode).toBe(404);
            }
        });

        it('应该处理场地编码已存在的情况', async () => {
            // Arrange
            const venueId = '1';
            const updateData = { code: 'VN002' };

            mockRequest.params = { id: venueId };
            mockRequest.body = updateData;
            mockSpaceService.getVenueById.mockResolvedValue({ id: 1, code: 'VN001', project_id: 1 });
            mockSpaceService.getVenueByCode.mockResolvedValue({ id: 2, code: 'VN002' });

            // Act & Assert
            try {
                await spaceController.updateVenue(mockRequest as any, mockResponse as any, (() => {}) as any);
                expect.fail('应该抛出错误');
            } catch (error: any) {
                expect(error.message).toBe('场地编码在该项目内已存在');
                expect(error.statusCode).toBe(400);
            }
        });
    });

    describe('deleteVenue', () => {
        it('应该成功删除场地', async () => {
            // Arrange
            const venueId = '1';
            mockRequest.params = { id: venueId };
            mockSpaceService.deleteVenue.mockResolvedValue(undefined);

            // Act
            await spaceController.deleteVenue(mockRequest as any, mockResponse as any, (() => {}) as any);

            // Assert
            expect(mockSpaceService.deleteVenue).toHaveBeenCalledWith(parseInt(venueId));
        });

        it('应该处理删除不存在场地的情况', async () => {
            // Arrange
            const venueId = '999';
            const error = new Error('场地不存在');

            mockRequest.params = { id: venueId };
            mockSpaceService.deleteVenue.mockRejectedValue(error);

            // Act
            await spaceController.deleteVenue(mockRequest as any, mockResponse as any, (() => {}) as any);
        });
    });

    describe('getFloors', () => {
        it('应该成功获取楼层列表', async () => {
            // Arrange
            const venueId = '1';
            const mockFloors = [
                { id: 1, name: '1楼', venueId: 1 },
                { id: 2, name: '2楼', venueId: 1 }
            ];
            const mockResult = {
                data: mockFloors,
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 2,
                    totalPages: 1
                }
            };

            mockRequest.query = { venueId };
            mockSpaceService.getFloors.mockResolvedValue(mockResult);

            // Act
            await spaceController.getFloors(mockRequest as any, mockResponse as any, (() => {}) as any);

            // Assert
            expect(mockSpaceService.getFloors).toHaveBeenCalledWith({
                page: 1,
                limit: 10,
                venueId: 1,
                status: undefined,
                search: undefined
            });
        });
    });

    describe('createFloor', () => {
        it('应该成功创建楼层', async () => {
            // Arrange
            const venueId = '1';
            const floorData = {
                name: '3楼',
                code: 'F3',
                description: '三楼描述'
            };
            const createdFloor = { id: 3, venueId: 1, ...floorData };

            mockRequest.params = { venueId };
            mockRequest.body = floorData;
            mockSpaceService.createFloor.mockResolvedValue(createdFloor);

            // Act
            await spaceController.createFloor(mockRequest as any, mockResponse as any, (() => {}) as any);

            // Assert
            expect(mockSpaceService.createFloor).toHaveBeenCalledWith(parseInt(venueId), floorData);
        });

        it('应该处理缺少必填字段的情况', async () => {
            // Arrange
            const venueId = '1';
            const invalidData = { name: '楼层名' }; // 缺少code和venue_id
            mockRequest.params = { venueId };
            mockRequest.body = invalidData;

            // Act & Assert - 这里会抛出异常，由asyncHandler处理
            try {
                await spaceController.createFloor(mockRequest as any, mockResponse as any, (() => {}) as any);
            } catch (error: any) {
                expect(error.message).toBe('楼层名称、编码和场地ID不能为空');
                expect(error.statusCode).toBe(400);
                return;
            }
            expect.fail('应该抛出错误');
        });
    });

    describe('getProjects', () => {
        it('应该成功获取项目列表', async () => {
            // Arrange
            const mockProjects = [
                { id: 1, name: '项目A' },
                { id: 2, name: '项目B' }
            ];
            const mockResult = {
                data: mockProjects,
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 2,
                    totalPages: 1
                }
            };

            mockRequest.query = {};
            mockSpaceService.getProjects.mockResolvedValue(mockResult);

            // Act
            await spaceController.getProjects(mockRequest as any, mockResponse as any, (() => {}) as any);

            // Assert
            expect(mockSpaceService.getProjects).toHaveBeenCalledWith({
                page: 1,
                limit: 10,
                status: undefined,
                search: undefined
            });
        });
    });

    describe('createProject', () => {
        it('应该成功创建项目', async () => {
            // Arrange
            const projectData = {
                name: '新项目',
                code: 'PROJ001',
                description: '项目描述',
                area: 100
            };
            const createdProject = { id: 1, ...projectData };

            mockRequest.body = projectData;
            mockSpaceService.createProject.mockResolvedValue(createdProject);

            // Act
            await spaceController.createProject(mockRequest as any, mockResponse as any, (() => {}) as any);

            // Assert
            expect(mockSpaceService.createProject).toHaveBeenCalledWith(projectData);
        });

        it('应该处理缺少必填字段的情况', async () => {
            // Arrange
            const invalidData = { name: '项目名' }; // 缺少code
            mockRequest.body = invalidData;

            // Act & Assert - 这里会抛出异常，由asyncHandler处理
            try {
                await spaceController.createProject(mockRequest as any, mockResponse as any, (() => {}) as any);
            } catch (error: any) {
                expect(error.message).toBe('项目名称和编码不能为空');
                expect(error.statusCode).toBe(400);
                return;
            }
            expect.fail('应该抛出错误');
        });
    });
});