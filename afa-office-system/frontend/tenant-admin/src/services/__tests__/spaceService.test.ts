import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { spaceService } from '../spaceService'
import type { CreateProjectData, CreateVenueData, CreateFloorData } from '../spaceService'

describe('spaceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSpaceTree', () => {
    it('应该成功获取空间树形结构', async () => {
      const result = await spaceService.getSpaceTree()

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      
      // 验证树形结构的基本属性
      const firstNode = result[0]
      expect(firstNode).toHaveProperty('key')
      expect(firstNode).toHaveProperty('title')
      expect(firstNode).toHaveProperty('type')
      expect(firstNode).toHaveProperty('id')
      expect(firstNode).toHaveProperty('status')
    })

    it('应该处理空的树形结构', async () => {
      // Mock空数据响应
      server.use(
        http.get('/api/v1/tenant/spaces/tree', () => {
          return HttpResponse.json({
            success: true,
            data: [],
            message: '获取空间树成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await spaceService.getSpaceTree()
      expect(result).toEqual([])
    })

    it('应该处理API错误', async () => {
      // Mock API错误
      server.use(
        http.get('/api/v1/tenant/spaces/tree', () => {
          return HttpResponse.json({
            success: false,
            code: 500,
            message: '服务器错误',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        })
      )

      await expect(spaceService.getSpaceTree()).rejects.toThrow()
    })

    it('应该处理网络错误', async () => {
      // Mock网络错误
      server.use(
        http.get('/api/v1/tenant/spaces/tree', () => {
          return HttpResponse.error()
        })
      )

      await expect(spaceService.getSpaceTree()).rejects.toThrow()
    })
  })

  describe('getProjects', () => {
    it('应该成功获取项目列表', async () => {
      const result = await spaceService.getProjects()

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      
      if (result.length > 0) {
        const project = result[0]
        expect(project).toHaveProperty('id')
        expect(project).toHaveProperty('code')
        expect(project).toHaveProperty('name')
        expect(project).toHaveProperty('description')
        expect(project).toHaveProperty('status')
        expect(project).toHaveProperty('createdAt')
        expect(project).toHaveProperty('updatedAt')
      }
    })

    it('应该处理空的项目列表', async () => {
      server.use(
        http.get('/api/v1/tenant/spaces/projects', () => {
          return HttpResponse.json({
            success: true,
            data: [],
            message: '获取项目列表成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await spaceService.getProjects()
      expect(result).toEqual([])
    })
  })

  describe('getVenues', () => {
    it('应该成功获取场地列表', async () => {
      const projectId = 1
      const result = await spaceService.getVenues(projectId)

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      
      if (result.length > 0) {
        const venue = result[0]
        expect(venue).toHaveProperty('id')
        expect(venue).toHaveProperty('projectId')
        expect(venue).toHaveProperty('code')
        expect(venue).toHaveProperty('name')
        expect(venue).toHaveProperty('description')
        expect(venue).toHaveProperty('status')
        expect(venue).toHaveProperty('createdAt')
        expect(venue).toHaveProperty('updatedAt')
      }
    })

    it('应该处理无效的项目ID', async () => {
      server.use(
        http.get('/api/v1/tenant/spaces/projects/:projectId/venues', ({ params }) => {
          if (params.projectId === '999') {
            return HttpResponse.json({
              success: false,
              code: 404,
              message: '项目不存在',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 404 })
          }
          return HttpResponse.json({
            success: true,
            data: [],
            message: '获取场地列表成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(spaceService.getVenues(999)).rejects.toThrow()
    })
  })

  describe('getFloors', () => {
    it('应该成功获取楼层列表', async () => {
      const venueId = 1
      const result = await spaceService.getFloors(venueId)

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      
      if (result.length > 0) {
        const floor = result[0]
        expect(floor).toHaveProperty('id')
        expect(floor).toHaveProperty('venueId')
        expect(floor).toHaveProperty('code')
        expect(floor).toHaveProperty('name')
        expect(floor).toHaveProperty('description')
        expect(floor).toHaveProperty('status')
        expect(floor).toHaveProperty('createdAt')
        expect(floor).toHaveProperty('updatedAt')
      }
    })

    it('应该处理无效的场地ID', async () => {
      server.use(
        http.get('/api/v1/tenant/spaces/venues/:venueId/floors', ({ params }) => {
          if (params.venueId === '999') {
            return HttpResponse.json({
              success: false,
              code: 404,
              message: '场地不存在',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 404 })
          }
          return HttpResponse.json({
            success: true,
            data: [],
            message: '获取楼层列表成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(spaceService.getFloors(999)).rejects.toThrow()
    })
  })

  describe('createProject', () => {
    it('应该成功创建项目', async () => {
      const projectData: CreateProjectData = {
        code: 'PROJECT_TEST',
        name: '测试项目',
        description: '测试项目描述'
      }

      const result = await spaceService.createProject(projectData)

      expect(result).toBeDefined()
      expect(result).toHaveProperty('id')
      expect(result.code).toBe(projectData.code)
      expect(result.name).toBe(projectData.name)
      expect(result.description).toBe(projectData.description)
      expect(result.status).toBe('active')
    })

    it('应该处理创建项目时的验证错误', async () => {
      server.use(
        http.post('/api/v1/tenant/spaces/projects', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '项目编码已存在',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      const projectData: CreateProjectData = {
        code: 'EXISTING_CODE',
        name: '重复编码项目',
        description: '测试重复编码'
      }

      await expect(spaceService.createProject(projectData)).rejects.toThrow()
    })

    it('应该验证必填字段', async () => {
      const invalidData = {
        code: '',
        name: '',
        description: ''
      } as CreateProjectData

      server.use(
        http.post('/api/v1/tenant/spaces/projects', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '编码和名称不能为空',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(spaceService.createProject(invalidData)).rejects.toThrow()
    })
  })

  describe('createVenue', () => {
    it('应该成功创建场地', async () => {
      const venueData: CreateVenueData = {
        projectId: 1,
        code: 'VENUE_TEST',
        name: '测试场地',
        description: '测试场地描述'
      }

      const result = await spaceService.createVenue(venueData)

      expect(result).toBeDefined()
      expect(result).toHaveProperty('id')
      expect(result.projectId).toBe(venueData.projectId)
      expect(result.code).toBe(venueData.code)
      expect(result.name).toBe(venueData.name)
      expect(result.description).toBe(venueData.description)
      expect(result.status).toBe('active')
    })

    it('应该处理无效的项目ID', async () => {
      server.use(
        http.post('/api/v1/tenant/spaces/venues', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '项目不存在',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      const venueData: CreateVenueData = {
        projectId: 999,
        code: 'VENUE_TEST',
        name: '测试场地',
        description: '测试场地描述'
      }

      await expect(spaceService.createVenue(venueData)).rejects.toThrow()
    })
  })

  describe('createFloor', () => {
    it('应该成功创建楼层', async () => {
      const floorData: CreateFloorData = {
        venueId: 1,
        code: 'FLOOR_TEST',
        name: '测试楼层',
        description: '测试楼层描述'
      }

      const result = await spaceService.createFloor(floorData)

      expect(result).toBeDefined()
      expect(result).toHaveProperty('id')
      expect(result.venueId).toBe(floorData.venueId)
      expect(result.code).toBe(floorData.code)
      expect(result.name).toBe(floorData.name)
      expect(result.description).toBe(floorData.description)
      expect(result.status).toBe('active')
    })

    it('应该处理无效的场地ID', async () => {
      server.use(
        http.post('/api/v1/tenant/spaces/floors', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '场地不存在',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      const floorData: CreateFloorData = {
        venueId: 999,
        code: 'FLOOR_TEST',
        name: '测试楼层',
        description: '测试楼层描述'
      }

      await expect(spaceService.createFloor(floorData)).rejects.toThrow()
    })
  })

  describe('updateProject', () => {
    it('应该成功更新项目', async () => {
      const projectId = 1
      const updateData = {
        name: '更新后的项目名称',
        description: '更新后的项目描述'
      }

      const result = await spaceService.updateProject(projectId, updateData)

      expect(result).toBeDefined()
      expect(result.id).toBe(projectId)
      expect(result.name).toBe(updateData.name)
      expect(result.description).toBe(updateData.description)
    })

    it('应该处理不存在的项目', async () => {
      server.use(
        http.put('/api/v1/tenant/spaces/projects/:id', ({ params }) => {
          if (params.id === '999') {
            return HttpResponse.json({
              success: false,
              code: 404,
              message: '项目不存在',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 404 })
          }
          return HttpResponse.json({
            success: true,
            data: { id: Number(params.id) },
            message: '更新项目成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(spaceService.updateProject(999, { name: '测试' })).rejects.toThrow()
    })
  })

  describe('updateVenue', () => {
    it('应该成功更新场地', async () => {
      const venueId = 1
      const updateData = {
        name: '更新后的场地名称',
        description: '更新后的场地描述'
      }

      const result = await spaceService.updateVenue(venueId, updateData)

      expect(result).toBeDefined()
      expect(result.id).toBe(venueId)
      expect(result.name).toBe(updateData.name)
      expect(result.description).toBe(updateData.description)
    })

    it('应该处理不存在的场地', async () => {
      server.use(
        http.put('/api/v1/tenant/spaces/venues/:id', ({ params }) => {
          if (params.id === '999') {
            return HttpResponse.json({
              success: false,
              code: 404,
              message: '场地不存在',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 404 })
          }
          return HttpResponse.json({
            success: true,
            data: { id: Number(params.id) },
            message: '更新场地成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(spaceService.updateVenue(999, { name: '测试' })).rejects.toThrow()
    })
  })

  describe('updateFloor', () => {
    it('应该成功更新楼层', async () => {
      const floorId = 1
      const updateData = {
        name: '更新后的楼层名称',
        description: '更新后的楼层描述'
      }

      const result = await spaceService.updateFloor(floorId, updateData)

      expect(result).toBeDefined()
      expect(result.id).toBe(floorId)
      expect(result.name).toBe(updateData.name)
      expect(result.description).toBe(updateData.description)
    })

    it('应该处理不存在的楼层', async () => {
      server.use(
        http.put('/api/v1/tenant/spaces/floors/:id', ({ params }) => {
          if (params.id === '999') {
            return HttpResponse.json({
              success: false,
              code: 404,
              message: '楼层不存在',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 404 })
          }
          return HttpResponse.json({
            success: true,
            data: { id: Number(params.id) },
            message: '更新楼层成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(spaceService.updateFloor(999, { name: '测试' })).rejects.toThrow()
    })
  })

  describe('deleteProject', () => {
    it('应该成功删除项目', async () => {
      const projectId = 1
      
      await expect(spaceService.deleteProject(projectId)).resolves.toBeUndefined()
    })

    it('应该处理不存在的项目', async () => {
      server.use(
        http.delete('/api/v1/tenant/spaces/projects/:id', ({ params }) => {
          if (params.id === '999') {
            return HttpResponse.json({
              success: false,
              code: 404,
              message: '项目不存在',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 404 })
          }
          return HttpResponse.json({
            success: true,
            data: null,
            message: '删除项目成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(spaceService.deleteProject(999)).rejects.toThrow()
    })

    it('应该处理有关联数据的项目删除', async () => {
      server.use(
        http.delete('/api/v1/tenant/spaces/projects/:id', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '项目下存在场地，无法删除',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(spaceService.deleteProject(1)).rejects.toThrow()
    })
  })

  describe('deleteVenue', () => {
    it('应该成功删除场地', async () => {
      const venueId = 1
      
      await expect(spaceService.deleteVenue(venueId)).resolves.toBeUndefined()
    })

    it('应该处理不存在的场地', async () => {
      server.use(
        http.delete('/api/v1/tenant/spaces/venues/:id', ({ params }) => {
          if (params.id === '999') {
            return HttpResponse.json({
              success: false,
              code: 404,
              message: '场地不存在',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 404 })
          }
          return HttpResponse.json({
            success: true,
            data: null,
            message: '删除场地成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(spaceService.deleteVenue(999)).rejects.toThrow()
    })
  })

  describe('deleteFloor', () => {
    it('应该成功删除楼层', async () => {
      const floorId = 1
      
      await expect(spaceService.deleteFloor(floorId)).resolves.toBeUndefined()
    })

    it('应该处理不存在的楼层', async () => {
      server.use(
        http.delete('/api/v1/tenant/spaces/floors/:id', ({ params }) => {
          if (params.id === '999') {
            return HttpResponse.json({
              success: false,
              code: 404,
              message: '楼层不存在',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 404 })
          }
          return HttpResponse.json({
            success: true,
            data: null,
            message: '删除楼层成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(spaceService.deleteFloor(999)).rejects.toThrow()
    })
  })

  describe('toggleSpaceStatus', () => {
    it('应该成功切换项目状态', async () => {
      const projectId = 1
      const newStatus = 'inactive'
      
      await expect(spaceService.toggleSpaceStatus('project', projectId, newStatus)).resolves.toBeUndefined()
    })

    it('应该成功切换场地状态', async () => {
      const venueId = 1
      const newStatus = 'active'
      
      await expect(spaceService.toggleSpaceStatus('venue', venueId, newStatus)).resolves.toBeUndefined()
    })

    it('应该成功切换楼层状态', async () => {
      const floorId = 1
      const newStatus = 'inactive'
      
      await expect(spaceService.toggleSpaceStatus('floor', floorId, newStatus)).resolves.toBeUndefined()
    })

    it('应该处理无效的空间类型', async () => {
      server.use(
        http.patch('/api/v1/tenant/spaces/:type/:id/status', ({ params }) => {
          if (!['projects', 'venues', 'floors'].includes(params.type as string)) {
            return HttpResponse.json({
              success: false,
              code: 400,
              message: '无效的空间类型',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 400 })
          }
          return HttpResponse.json({
            success: true,
            data: null,
            message: '状态更新成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      // @ts-ignore - 故意传入无效类型进行测试
      await expect(spaceService.toggleSpaceStatus('invalid', 1, 'active')).rejects.toThrow()
    })

    it('应该处理状态切换失败', async () => {
      server.use(
        http.patch('/api/v1/tenant/spaces/projects/:id/status', () => {
          return HttpResponse.json({
            success: false,
            code: 500,
            message: '状态切换失败',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        })
      )

      await expect(spaceService.toggleSpaceStatus('project', 1, 'inactive')).rejects.toThrow()
    })

    it('应该处理不存在的空间', async () => {
      server.use(
        http.patch('/api/v1/tenant/spaces/projects/:id/status', ({ params }) => {
          if (params.id === '999') {
            return HttpResponse.json({
              success: false,
              code: 404,
              message: '项目不存在',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 404 })
          }
          return HttpResponse.json({
            success: true,
            data: null,
            message: '状态更新成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(spaceService.toggleSpaceStatus('project', 999, 'active')).rejects.toThrow()
    })
  })

  describe('边界条件测试', () => {
    it('应该处理空字符串参数', async () => {
      server.use(
        http.post('/api/v1/tenant/spaces/projects', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '参数不能为空',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      const emptyData = {
        code: '',
        name: '',
        description: ''
      } as CreateProjectData

      await expect(spaceService.createProject(emptyData)).rejects.toThrow()
    })

    it('应该处理超长字符串参数', async () => {
      server.use(
        http.post('/api/v1/tenant/spaces/projects', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '参数长度超出限制',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      const longData = {
        code: 'A'.repeat(1000),
        name: 'B'.repeat(1000),
        description: 'C'.repeat(1000)
      } as CreateProjectData

      await expect(spaceService.createProject(longData)).rejects.toThrow()
    })

    it('应该处理特殊字符参数', async () => {
      const specialData = {
        code: 'PROJECT_测试_123',
        name: '项目<script>alert("test")</script>',
        description: '描述 & 特殊字符 < > " \''
      } as CreateProjectData

      const result = await spaceService.createProject(specialData)
      expect(result).toBeDefined()
      expect(result.code).toBe(specialData.code)
      expect(result.name).toBe(specialData.name)
      expect(result.description).toBe(specialData.description)
    })

    it('应该处理负数ID', async () => {
      server.use(
        http.get('/api/v1/tenant/spaces/projects/:projectId/venues', ({ params }) => {
          const id = Number(params.projectId)
          if (id < 0) {
            return HttpResponse.json({
              success: false,
              code: 400,
              message: 'ID必须为正整数',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 400 })
          }
          return HttpResponse.json({
            success: true,
            data: [],
            message: '获取场地列表成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(spaceService.getVenues(-1)).rejects.toThrow()
    })

    it('应该处理零ID', async () => {
      server.use(
        http.get('/api/v1/tenant/spaces/projects/:projectId/venues', ({ params }) => {
          const id = Number(params.projectId)
          if (id === 0) {
            return HttpResponse.json({
              success: false,
              code: 400,
              message: 'ID不能为0',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 400 })
          }
          return HttpResponse.json({
            success: true,
            data: [],
            message: '获取场地列表成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(spaceService.getVenues(0)).rejects.toThrow()
    })
  })

  describe('并发请求测试', () => {
    it('应该能够处理并发的获取请求', async () => {
      const promises = [
        spaceService.getSpaceTree(),
        spaceService.getProjects(),
        spaceService.getVenues(1),
        spaceService.getFloors(1)
      ]

      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(4)
      results.forEach(result => {
        expect(result).toBeDefined()
      })
    })

    it('应该能够处理并发的创建请求', async () => {
      const projectData1: CreateProjectData = {
        code: 'PROJECT_001',
        name: '项目1',
        description: '项目1描述'
      }

      const projectData2: CreateProjectData = {
        code: 'PROJECT_002',
        name: '项目2',
        description: '项目2描述'
      }

      const promises = [
        spaceService.createProject(projectData1),
        spaceService.createProject(projectData2)
      ]

      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(2)
      expect(results[0].code).toBe(projectData1.code)
      expect(results[1].code).toBe(projectData2.code)
    })
  })
})