import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { merchantService } from '../merchantService'
import type { CreateMerchantData, UpdateMerchantData, MerchantListParams } from '../merchantService'

describe('merchantService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getMerchants', () => {
    it('应该成功获取商户列表', async () => {
      const mockResponse = {
        merchants: [
          {
            id: 1,
            name: '测试商户1',
            code: 'MERCHANT_001',
            contact: '张三',
            phone: '13800138001',
            email: 'merchant1@example.com',
            address: '测试地址1',
            status: 'active' as const,
            permissions: ['read', 'write'],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 2,
            name: '测试商户2',
            code: 'MERCHANT_002',
            contact: '李四',
            phone: '13800138002',
            email: 'merchant2@example.com',
            address: '测试地址2',
            status: 'inactive' as const,
            permissions: ['read'],
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z'
          }
        ],
        total: 2,
        page: 1,
        pageSize: 10
      }

      server.use(
        http.get('/api/v1/tenant/merchants', ({ request }) => {
          const url = new URL(request.url)
          expect(url.searchParams.get('page')).toBe('1')
          expect(url.searchParams.get('pageSize')).toBe('10')
          
          return HttpResponse.json({
            success: true,
            data: mockResponse,
            message: '获取商户列表成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const params: MerchantListParams = { page: 1, pageSize: 10 }
      const result = await merchantService.getMerchants(params)

      expect(result).toEqual(mockResponse)
      expect(result.merchants).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(10)
    })

    it('应该支持搜索参数', async () => {
      const searchParams: MerchantListParams = {
        page: 1,
        pageSize: 10,
        search: '测试商户',
        status: 'active'
      }

      server.use(
        http.get('/api/v1/tenant/merchants', ({ request }) => {
          const url = new URL(request.url)
          expect(url.searchParams.get('search')).toBe('测试商户')
          expect(url.searchParams.get('status')).toBe('active')
          
          return HttpResponse.json({
            success: true,
            data: {
              merchants: [],
              total: 0,
              page: 1,
              pageSize: 10
            },
            message: '获取商户列表成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await merchantService.getMerchants(searchParams)
      expect(result.merchants).toHaveLength(0)
    })

    it('应该处理空参数', async () => {
      server.use(
        http.get('/api/v1/tenant/merchants', ({ request }) => {
          const url = new URL(request.url)
          // 验证没有传递参数时的默认行为
          expect(url.searchParams.toString()).toBe('')
          
          return HttpResponse.json({
            success: true,
            data: {
              merchants: [],
              total: 0,
              page: 1,
              pageSize: 10
            },
            message: '获取商户列表成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await merchantService.getMerchants()
      expect(result.merchants).toHaveLength(0)
    })

    it('应该处理API错误', async () => {
      server.use(
        http.get('/api/v1/tenant/merchants', () => {
          return HttpResponse.json({
            success: false,
            code: 500,
            message: '获取商户列表失败',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        })
      )

      await expect(merchantService.getMerchants()).rejects.toThrow('获取商户列表失败')
    })

    it('应该处理网络错误', async () => {
      server.use(
        http.get('/api/v1/tenant/merchants', () => {
          return HttpResponse.error()
        })
      )

      await expect(merchantService.getMerchants()).rejects.toThrow()
    })
  })

  describe('getMerchant', () => {
    it('应该成功获取商户详情', async () => {
      const merchantId = 1
      const mockMerchant = {
        id: 1,
        name: '测试商户',
        code: 'MERCHANT_001',
        contact: '张三',
        phone: '13800138001',
        email: 'merchant@example.com',
        address: '测试地址',
        status: 'active' as const,
        permissions: ['read', 'write'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }

      server.use(
        http.get('/api/v1/tenant/merchants/:id', ({ params }) => {
          expect(params.id).toBe('1')
          
          return HttpResponse.json({
            success: true,
            data: mockMerchant,
            message: '获取商户详情成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await merchantService.getMerchant(merchantId)
      expect(result).toEqual(mockMerchant)
    })

    it('应该处理商户不存在', async () => {
      server.use(
        http.get('/api/v1/tenant/merchants/:id', ({ params }) => {
          if (params.id === '999') {
            return HttpResponse.json({
              success: false,
              code: 404,
              message: '商户不存在',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 404 })
          }
          return HttpResponse.json({
            success: true,
            data: {},
            message: '获取商户详情成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(merchantService.getMerchant(999)).rejects.toThrow('商户不存在')
    })

    it('应该处理无效的商户ID', async () => {
      server.use(
        http.get('/api/v1/tenant/merchants/:id', ({ params }) => {
          if (params.id === '0' || params.id === '-1') {
            return HttpResponse.json({
              success: false,
              code: 400,
              message: '无效的商户ID',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 400 })
          }
          return HttpResponse.json({
            success: true,
            data: {},
            message: '获取商户详情成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(merchantService.getMerchant(0)).rejects.toThrow('无效的商户ID')
      await expect(merchantService.getMerchant(-1)).rejects.toThrow('无效的商户ID')
    })
  })

  describe('createMerchant', () => {
    it('应该成功创建商户', async () => {
      const merchantData: CreateMerchantData = {
        name: '新商户',
        code: 'NEW_MERCHANT',
        contact: '王五',
        phone: '13800138005',
        email: 'new@example.com',
        address: '新地址',
        permissions: ['read', 'write']
      }

      const mockResponse = {
        id: 3,
        ...merchantData,
        status: 'active' as const,
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z'
      }

      server.use(
        http.post('/api/v1/tenant/merchants', async ({ request }) => {
          const body = await request.json() as CreateMerchantData
          expect(body).toEqual(merchantData)
          
          return HttpResponse.json({
            success: true,
            data: mockResponse,
            message: '创建商户成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await merchantService.createMerchant(merchantData)
      expect(result).toEqual(mockResponse)
      expect(result.id).toBe(3)
      expect(result.name).toBe(merchantData.name)
      expect(result.status).toBe('active')
    })

    it('应该处理商户编码重复', async () => {
      const merchantData: CreateMerchantData = {
        name: '重复编码商户',
        code: 'EXISTING_CODE',
        contact: '测试',
        phone: '13800138000',
        email: 'test@example.com',
        address: '测试地址',
        permissions: ['read']
      }

      server.use(
        http.post('/api/v1/tenant/merchants', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '商户编码已存在',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(merchantService.createMerchant(merchantData)).rejects.toThrow('商户编码已存在')
    })

    it('应该处理邮箱重复', async () => {
      const merchantData: CreateMerchantData = {
        name: '重复邮箱商户',
        code: 'UNIQUE_CODE',
        contact: '测试',
        phone: '13800138000',
        email: 'existing@example.com',
        address: '测试地址',
        permissions: ['read']
      }

      server.use(
        http.post('/api/v1/tenant/merchants', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '邮箱已被使用',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(merchantService.createMerchant(merchantData)).rejects.toThrow('邮箱已被使用')
    })

    it('应该处理必填字段验证', async () => {
      const incompleteData = {
        name: '',
        code: '',
        contact: '',
        phone: '',
        email: '',
        address: '',
        permissions: []
      } as CreateMerchantData

      server.use(
        http.post('/api/v1/tenant/merchants', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '商户名称和编码不能为空',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(merchantService.createMerchant(incompleteData)).rejects.toThrow('商户名称和编码不能为空')
    })

    it('应该处理邮箱格式验证', async () => {
      const invalidEmailData: CreateMerchantData = {
        name: '测试商户',
        code: 'TEST_CODE',
        contact: '测试',
        phone: '13800138000',
        email: 'invalid-email',
        address: '测试地址',
        permissions: ['read']
      }

      server.use(
        http.post('/api/v1/tenant/merchants', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '邮箱格式不正确',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(merchantService.createMerchant(invalidEmailData)).rejects.toThrow('邮箱格式不正确')
    })

    it('应该处理手机号格式验证', async () => {
      const invalidPhoneData: CreateMerchantData = {
        name: '测试商户',
        code: 'TEST_CODE',
        contact: '测试',
        phone: '123',
        email: 'test@example.com',
        address: '测试地址',
        permissions: ['read']
      }

      server.use(
        http.post('/api/v1/tenant/merchants', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '手机号格式不正确',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(merchantService.createMerchant(invalidPhoneData)).rejects.toThrow('手机号格式不正确')
    })
  })

  describe('updateMerchant', () => {
    it('应该成功更新商户', async () => {
      const merchantId = 1
      const updateData: UpdateMerchantData = {
        name: '更新后的商户名称',
        contact: '更新后的联系人',
        phone: '13800138999',
        status: 'inactive'
      }

      const mockResponse = {
        id: merchantId,
        name: '更新后的商户名称',
        code: 'MERCHANT_001',
        contact: '更新后的联系人',
        phone: '13800138999',
        email: 'merchant@example.com',
        address: '测试地址',
        status: 'inactive' as const,
        permissions: ['read', 'write'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z'
      }

      server.use(
        http.put('/api/v1/tenant/merchants/:id', async ({ params, request }) => {
          expect(params.id).toBe('1')
          const body = await request.json() as UpdateMerchantData
          expect(body).toEqual(updateData)
          
          return HttpResponse.json({
            success: true,
            data: mockResponse,
            message: '更新商户成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await merchantService.updateMerchant(merchantId, updateData)
      expect(result).toEqual(mockResponse)
      expect(result.name).toBe(updateData.name)
      expect(result.status).toBe(updateData.status)
    })

    it('应该支持部分字段更新', async () => {
      const merchantId = 1
      const partialUpdate: UpdateMerchantData = {
        name: '仅更新名称'
      }

      server.use(
        http.put('/api/v1/tenant/merchants/:id', async ({ request }) => {
          const body = await request.json() as UpdateMerchantData
          expect(body).toEqual(partialUpdate)
          expect(Object.keys(body)).toHaveLength(1)
          
          return HttpResponse.json({
            success: true,
            data: {
              id: merchantId,
              name: partialUpdate.name,
              updatedAt: new Date().toISOString()
            },
            message: '更新商户成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await merchantService.updateMerchant(merchantId, partialUpdate)
      expect(result.name).toBe(partialUpdate.name)
    })

    it('应该处理商户不存在', async () => {
      server.use(
        http.put('/api/v1/tenant/merchants/:id', ({ params }) => {
          if (params.id === '999') {
            return HttpResponse.json({
              success: false,
              code: 404,
              message: '商户不存在',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 404 })
          }
          return HttpResponse.json({
            success: true,
            data: {},
            message: '更新商户成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(merchantService.updateMerchant(999, { name: '测试' })).rejects.toThrow('商户不存在')
    })

    it('应该处理更新验证错误', async () => {
      const merchantId = 1
      const invalidUpdate: UpdateMerchantData = {
        email: 'invalid-email'
      }

      server.use(
        http.put('/api/v1/tenant/merchants/:id', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '邮箱格式不正确',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(merchantService.updateMerchant(merchantId, invalidUpdate)).rejects.toThrow('邮箱格式不正确')
    })
  })

  describe('deleteMerchant', () => {
    it('应该成功删除商户', async () => {
      const merchantId = 1

      server.use(
        http.delete('/api/v1/tenant/merchants/:id', ({ params }) => {
          expect(params.id).toBe('1')
          
          return HttpResponse.json({
            success: true,
            data: null,
            message: '删除商户成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(merchantService.deleteMerchant(merchantId)).resolves.toBeUndefined()
    })

    it('应该处理商户不存在', async () => {
      server.use(
        http.delete('/api/v1/tenant/merchants/:id', ({ params }) => {
          if (params.id === '999') {
            return HttpResponse.json({
              success: false,
              code: 404,
              message: '商户不存在',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 404 })
          }
          return HttpResponse.json({
            success: true,
            data: null,
            message: '删除商户成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(merchantService.deleteMerchant(999)).rejects.toThrow('商户不存在')
    })

    it('应该处理有关联数据的商户删除', async () => {
      const merchantId = 1

      server.use(
        http.delete('/api/v1/tenant/merchants/:id', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '商户下存在员工，无法删除',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(merchantService.deleteMerchant(merchantId)).rejects.toThrow('商户下存在员工，无法删除')
    })
  })

  describe('assignPermissions', () => {
    it('应该成功分配权限', async () => {
      const merchantId = 1
      const permissions = ['read', 'write', 'delete']

      server.use(
        http.post('/api/v1/tenant/merchants/:id/permissions', async ({ params, request }) => {
          expect(params.id).toBe('1')
          const body = await request.json() as { permissions: string[] }
          expect(body.permissions).toEqual(permissions)
          
          return HttpResponse.json({
            success: true,
            data: null,
            message: '权限分配成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(merchantService.assignPermissions(merchantId, permissions)).resolves.toBeUndefined()
    })

    it('应该处理无效权限', async () => {
      const merchantId = 1
      const invalidPermissions = ['invalid_permission']

      server.use(
        http.post('/api/v1/tenant/merchants/:id/permissions', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '包含无效的权限',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(merchantService.assignPermissions(merchantId, invalidPermissions)).rejects.toThrow('包含无效的权限')
    })

    it('应该处理空权限数组', async () => {
      const merchantId = 1
      const emptyPermissions: string[] = []

      server.use(
        http.post('/api/v1/tenant/merchants/:id/permissions', async ({ request }) => {
          const body = await request.json() as { permissions: string[] }
          expect(body.permissions).toEqual([])
          
          return HttpResponse.json({
            success: true,
            data: null,
            message: '权限清空成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(merchantService.assignPermissions(merchantId, emptyPermissions)).resolves.toBeUndefined()
    })
  })

  describe('toggleMerchantStatus', () => {
    it('应该成功切换商户状态为启用', async () => {
      const merchantId = 1
      const newStatus = 'active'

      const mockResponse = {
        id: merchantId,
        name: '测试商户',
        code: 'MERCHANT_001',
        contact: '张三',
        phone: '13800138001',
        email: 'merchant@example.com',
        address: '测试地址',
        status: newStatus,
        permissions: ['read', 'write'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z'
      }

      server.use(
        http.patch('/api/v1/tenant/merchants/:id/status', async ({ params, request }) => {
          expect(params.id).toBe('1')
          const body = await request.json() as { status: string }
          expect(body.status).toBe(newStatus)
          
          return HttpResponse.json({
            success: true,
            data: mockResponse,
            message: '商户状态更新成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await merchantService.toggleMerchantStatus(merchantId, newStatus)
      expect(result).toEqual(mockResponse)
      expect(result.status).toBe(newStatus)
    })

    it('应该成功切换商户状态为停用', async () => {
      const merchantId = 1
      const newStatus = 'inactive'

      server.use(
        http.patch('/api/v1/tenant/merchants/:id/status', async ({ request }) => {
          const body = await request.json() as { status: string }
          expect(body.status).toBe(newStatus)
          
          return HttpResponse.json({
            success: true,
            data: { id: merchantId, status: newStatus },
            message: '商户状态更新成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await merchantService.toggleMerchantStatus(merchantId, newStatus)
      expect(result.status).toBe(newStatus)
    })

    it('应该处理商户不存在', async () => {
      server.use(
        http.patch('/api/v1/tenant/merchants/:id/status', ({ params }) => {
          if (params.id === '999') {
            return HttpResponse.json({
              success: false,
              code: 404,
              message: '商户不存在',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 404 })
          }
          return HttpResponse.json({
            success: true,
            data: {},
            message: '商户状态更新成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(merchantService.toggleMerchantStatus(999, 'active')).rejects.toThrow('商户不存在')
    })

    it('应该处理状态切换失败', async () => {
      const merchantId = 1

      server.use(
        http.patch('/api/v1/tenant/merchants/:id/status', () => {
          return HttpResponse.json({
            success: false,
            code: 500,
            message: '状态切换失败',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        })
      )

      await expect(merchantService.toggleMerchantStatus(merchantId, 'active')).rejects.toThrow('状态切换失败')
    })
  })

  describe('边界条件和异常场景测试', () => {
    it('应该处理特殊字符的商户数据', async () => {
      const specialData: CreateMerchantData = {
        name: '测试商户<script>alert("test")</script>',
        code: 'MERCHANT_测试_001',
        contact: '张三&李四',
        phone: '138-0013-8001',
        email: 'test+special@example.com',
        address: '地址 & 特殊字符 < > " \'',
        permissions: ['read', 'write']
      }

      server.use(
        http.post('/api/v1/tenant/merchants', async ({ request }) => {
          const body = await request.json() as CreateMerchantData
          expect(body).toEqual(specialData)
          
          return HttpResponse.json({
            success: true,
            data: { id: 1, ...specialData, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            message: '创建商户成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await merchantService.createMerchant(specialData)
      expect(result.name).toBe(specialData.name)
      expect(result.code).toBe(specialData.code)
    })

    it('应该处理超长字符串', async () => {
      const longData: CreateMerchantData = {
        name: 'A'.repeat(1000),
        code: 'B'.repeat(100),
        contact: 'C'.repeat(100),
        phone: '13800138001',
        email: 'test@example.com',
        address: 'D'.repeat(1000),
        permissions: ['read']
      }

      server.use(
        http.post('/api/v1/tenant/merchants', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '字段长度超出限制',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(merchantService.createMerchant(longData)).rejects.toThrow('字段长度超出限制')
    })

    it('应该处理空字符串字段', async () => {
      const emptyData: CreateMerchantData = {
        name: '',
        code: '',
        contact: '',
        phone: '',
        email: '',
        address: '',
        permissions: []
      }

      server.use(
        http.post('/api/v1/tenant/merchants', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '必填字段不能为空',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(merchantService.createMerchant(emptyData)).rejects.toThrow('必填字段不能为空')
    })

    it('应该处理负数ID', async () => {
      server.use(
        http.get('/api/v1/tenant/merchants/:id', ({ params }) => {
          const id = Number(params.id)
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
            data: {},
            message: '获取商户详情成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(merchantService.getMerchant(-1)).rejects.toThrow('ID必须为正整数')
    })

    it('应该处理零ID', async () => {
      server.use(
        http.get('/api/v1/tenant/merchants/:id', ({ params }) => {
          const id = Number(params.id)
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
            data: {},
            message: '获取商户详情成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(merchantService.getMerchant(0)).rejects.toThrow('ID不能为0')
    })
  })

  describe('并发请求测试', () => {
    it('应该能够处理并发的获取请求', async () => {
      server.use(
        http.get('/api/v1/tenant/merchants', () => {
          return HttpResponse.json({
            success: true,
            data: {
              merchants: [],
              total: 0,
              page: 1,
              pageSize: 10
            },
            message: '获取商户列表成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const promises = Array(5).fill(null).map(() => merchantService.getMerchants())
      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result.merchants).toEqual([])
        expect(result.total).toBe(0)
      })
    })

    it('应该能够处理并发的创建请求', async () => {
      const merchantData1: CreateMerchantData = {
        name: '商户1',
        code: 'MERCHANT_001',
        contact: '联系人1',
        phone: '13800138001',
        email: 'merchant1@example.com',
        address: '地址1',
        permissions: ['read']
      }

      const merchantData2: CreateMerchantData = {
        name: '商户2',
        code: 'MERCHANT_002',
        contact: '联系人2',
        phone: '13800138002',
        email: 'merchant2@example.com',
        address: '地址2',
        permissions: ['read']
      }

      server.use(
        http.post('/api/v1/tenant/merchants', async ({ request }) => {
          const body = await request.json() as CreateMerchantData
          
          return HttpResponse.json({
            success: true,
            data: {
              id: body.code === 'MERCHANT_001' ? 1 : 2,
              ...body,
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            message: '创建商户成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const [result1, result2] = await Promise.all([
        merchantService.createMerchant(merchantData1),
        merchantService.createMerchant(merchantData2)
      ])

      expect(result1.name).toBe('商户1')
      expect(result2.name).toBe('商户2')
      expect(result1.id).toBe(1)
      expect(result2.id).toBe(2)
    })
  })

  describe('性能测试', () => {
    it('应该在合理时间内完成请求', async () => {
      server.use(
        http.get('/api/v1/tenant/merchants', async () => {
          // 模拟一定的延迟
          await new Promise(resolve => setTimeout(resolve, 100))
          
          return HttpResponse.json({
            success: true,
            data: {
              merchants: [],
              total: 0,
              page: 1,
              pageSize: 10
            },
            message: '获取商户列表成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const startTime = Date.now()
      const result = await merchantService.getMerchants()
      const endTime = Date.now()

      expect(result.merchants).toEqual([])
      expect(endTime - startTime).toBeLessThan(1000) // 应该在1秒内完成
    })
  })
})