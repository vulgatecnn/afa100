import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { employeeService } from '../employeeService'
import type { CreateEmployeeData, UpdateEmployeeData, EmployeeListParams, BatchImportResult } from '../employeeService'

describe('employeeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getEmployees', () => {
    it('应该成功获取员工列表', async () => {
      const mockResponse = {
        employees: [
          {
            id: 1,
            name: '张三',
            phone: '13800138001',
            email: 'zhangsan@example.com',
            department: '技术部',
            position: '前端工程师',
            status: 'active' as const,
            permissions: ['read', 'write'],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 2,
            name: '李四',
            phone: '13800138002',
            email: 'lisi@example.com',
            department: '市场部',
            position: '市场专员',
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
        http.get('/api/v1/merchant/employees', () => {
          return HttpResponse.json({
            success: true,
            data: mockResponse,
            message: '获取员工列表成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const params: EmployeeListParams = { page: 1, pageSize: 10 }
      const result = await employeeService.getEmployees(params)

      expect(result).toEqual(mockResponse)
      expect(result.employees).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(10)
    })

    it('应该支持搜索和筛选参数', async () => {
      const searchParams: EmployeeListParams = {
        page: 1,
        pageSize: 20,
        search: '张三',
        department: '技术部',
        status: 'active'
      }

      server.use(
        http.get('/api/v1/merchant/employees', ({ request }) => {
          const url = new URL(request.url)
          expect(url.searchParams.get('search')).toBe('张三')
          expect(url.searchParams.get('department')).toBe('技术部')
          expect(url.searchParams.get('status')).toBe('active')
          
          return HttpResponse.json({
            success: true,
            data: {
              employees: [],
              total: 0,
              page: 1,
              pageSize: 20
            },
            message: '获取员工列表成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await employeeService.getEmployees(searchParams)
      expect(result.employees).toHaveLength(0)
      expect(result.pageSize).toBe(20)
    })

    it('应该处理空参数', async () => {
      server.use(
        http.get('/api/v1/merchant/employees', ({ request }) => {
          const url = new URL(request.url)
          expect(url.searchParams.toString()).toBe('')
          
          return HttpResponse.json({
            success: true,
            data: {
              employees: [],
              total: 0,
              page: 1,
              pageSize: 10
            },
            message: '获取员工列表成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await employeeService.getEmployees()
      expect(result.employees).toHaveLength(0)
    })

    it('应该处理API错误', async () => {
      server.use(
        http.get('/api/v1/merchant/employees', () => {
          return HttpResponse.json({
            success: false,
            code: 500,
            message: '获取员工列表失败',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        })
      )

      await expect(employeeService.getEmployees()).rejects.toThrow('获取员工列表失败')
    })
  })

  describe('getEmployee', () => {
    it('应该成功获取员工详情', async () => {
      const employeeId = 1
      const mockEmployee = {
        id: 1,
        name: '张三',
        phone: '13800138001',
        email: 'zhangsan@example.com',
        department: '技术部',
        position: '前端工程师',
        status: 'active' as const,
        permissions: ['read', 'write'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }

      server.use(
        http.get('/api/v1/merchant/employees/:id', ({ params }) => {
          if (params.id === '1') {
            return HttpResponse.json({
              success: true,
              data: mockEmployee,
              message: '获取员工详情成功',
              timestamp: new Date().toISOString()
            })
          }
          return HttpResponse.json({
            success: false,
            code: 404,
            message: '员工不存在',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 404 })
        })
      )

      const result = await employeeService.getEmployee(employeeId)
      expect(result).toEqual(mockEmployee)
    })

    it('应该处理员工不存在', async () => {
      server.use(
        http.get('/api/v1/merchant/employees/:id', ({ params }) => {
          if (params.id === '999') {
            return HttpResponse.json({
              success: false,
              code: 404,
              message: '员工不存在',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 404 })
          }
          return HttpResponse.json({
            success: true,
            data: {},
            message: '获取员工详情成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(employeeService.getEmployee(999)).rejects.toThrow('员工不存在')
    })
  })

  describe('createEmployee', () => {
    it('应该成功创建员工', async () => {
      const employeeData: CreateEmployeeData = {
        name: '新员工',
        phone: '13800138999',
        email: 'new@example.com',
        department: '技术部',
        position: '后端工程师',
        permissions: ['read', 'write']
      }

      const mockResponse = {
        id: 3,
        ...employeeData,
        status: 'active' as const,
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z'
      }

      server.use(
        http.post('/api/v1/merchant/employees', async ({ request }) => {
          const body = await request.json() as CreateEmployeeData
          expect(body).toEqual(employeeData)
          
          return HttpResponse.json({
            success: true,
            data: mockResponse,
            message: '创建员工成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await employeeService.createEmployee(employeeData)
      expect(result).toEqual(mockResponse)
      expect(result.id).toBe(3)
      expect(result.name).toBe(employeeData.name)
      expect(result.status).toBe('active')
    })

    it('应该处理邮箱重复', async () => {
      const employeeData: CreateEmployeeData = {
        name: '重复邮箱员工',
        phone: '13800138000',
        email: 'existing@example.com',
        department: '技术部',
        position: '工程师',
        permissions: ['read']
      }

      server.use(
        http.post('/api/v1/merchant/employees', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '邮箱已被使用',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(employeeService.createEmployee(employeeData)).rejects.toThrow('邮箱已被使用')
    })

    it('应该处理手机号重复', async () => {
      const employeeData: CreateEmployeeData = {
        name: '重复手机号员工',
        phone: '13800138001',
        email: 'unique@example.com',
        department: '技术部',
        position: '工程师',
        permissions: ['read']
      }

      server.use(
        http.post('/api/v1/merchant/employees', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '手机号已被使用',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(employeeService.createEmployee(employeeData)).rejects.toThrow('手机号已被使用')
    })

    it('应该处理必填字段验证', async () => {
      const incompleteData = {
        name: '',
        phone: '',
        email: '',
        department: '',
        position: '',
        permissions: []
      } as CreateEmployeeData

      server.use(
        http.post('/api/v1/merchant/employees', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '姓名、手机号和邮箱不能为空',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(employeeService.createEmployee(incompleteData)).rejects.toThrow('姓名、手机号和邮箱不能为空')
    })
  })

  describe('updateEmployee', () => {
    it('应该成功更新员工', async () => {
      const employeeId = 1
      const updateData: UpdateEmployeeData = {
        name: '更新后的姓名',
        department: '更新后的部门',
        position: '更新后的职位',
        status: 'inactive'
      }

      const mockResponse = {
        id: employeeId,
        name: '更新后的姓名',
        phone: '13800138001',
        email: 'zhangsan@example.com',
        department: '更新后的部门',
        position: '更新后的职位',
        status: 'inactive' as const,
        permissions: ['read', 'write'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z'
      }

      server.use(
        http.put('/api/v1/merchant/employees/:id', async ({ params, request }) => {
          expect(params.id).toBe('1')
          const body = await request.json() as UpdateEmployeeData
          expect(body).toEqual(updateData)
          
          return HttpResponse.json({
            success: true,
            data: mockResponse,
            message: '更新员工成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await employeeService.updateEmployee(employeeId, updateData)
      expect(result).toEqual(mockResponse)
      expect(result.name).toBe(updateData.name)
      expect(result.status).toBe(updateData.status)
    })

    it('应该支持部分字段更新', async () => {
      const employeeId = 1
      const partialUpdate: UpdateEmployeeData = {
        name: '仅更新姓名'
      }

      server.use(
        http.put('/api/v1/merchant/employees/:id', async ({ request }) => {
          const body = await request.json() as UpdateEmployeeData
          expect(body).toEqual(partialUpdate)
          expect(Object.keys(body)).toHaveLength(1)
          
          return HttpResponse.json({
            success: true,
            data: {
              id: employeeId,
              name: partialUpdate.name,
              updatedAt: new Date().toISOString()
            },
            message: '更新员工成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await employeeService.updateEmployee(employeeId, partialUpdate)
      expect(result.name).toBe(partialUpdate.name)
    })

    it('应该处理员工不存在', async () => {
      server.use(
        http.put('/api/v1/merchant/employees/:id', ({ params }) => {
          if (params.id === '999') {
            return HttpResponse.json({
              success: false,
              code: 404,
              message: '员工不存在',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 404 })
          }
          return HttpResponse.json({
            success: true,
            data: {},
            message: '更新员工成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(employeeService.updateEmployee(999, { name: '测试' })).rejects.toThrow('员工不存在')
    })
  })

  describe('deleteEmployee', () => {
    it('应该成功删除员工', async () => {
      const employeeId = 1

      server.use(
        http.delete('/api/v1/merchant/employees/:id', ({ params }) => {
          expect(params.id).toBe('1')
          
          return HttpResponse.json({
            success: true,
            data: null,
            message: '删除员工成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(employeeService.deleteEmployee(employeeId)).resolves.toBeUndefined()
    })

    it('应该处理员工不存在', async () => {
      server.use(
        http.delete('/api/v1/merchant/employees/:id', ({ params }) => {
          if (params.id === '999') {
            return HttpResponse.json({
              success: false,
              code: 404,
              message: '员工不存在',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 404 })
          }
          return HttpResponse.json({
            success: true,
            data: null,
            message: '删除员工成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(employeeService.deleteEmployee(999)).rejects.toThrow('员工不存在')
    })

    it('应该处理有关联数据的员工删除', async () => {
      const employeeId = 1

      server.use(
        http.delete('/api/v1/merchant/employees/:id', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '员工存在未完成的访客申请，无法删除',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(employeeService.deleteEmployee(employeeId)).rejects.toThrow('员工存在未完成的访客申请，无法删除')
    })
  })

  describe('batchImportEmployees', () => {
    it('应该成功批量导入员工', async () => {
      const file = new File(['name,phone,email,department,position,permissions\n张三,13800138001,zhangsan@example.com,技术部,工程师,read;write'], 'employees.csv', {
        type: 'text/csv'
      })

      const mockResult: BatchImportResult = {
        success: 8,
        failed: 2,
        errors: [
          { row: 3, message: '邮箱格式不正确' },
          { row: 5, message: '手机号已存在' }
        ]
      }

      server.use(
        http.post('/api/v1/merchant/employees/batch', async () => {
          // 模拟文件处理延迟
          await new Promise(resolve => setTimeout(resolve, 100))
          return HttpResponse.json({
            success: true,
            data: mockResult,
            message: '批量导入完成',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await employeeService.batchImportEmployees(file)
      expect(result).toEqual(mockResult)
      expect(result.success).toBe(8)
      expect(result.failed).toBe(2)
      expect(result.errors).toHaveLength(2)
    }, 10000) // 增加超时时间到10秒

    it('应该处理文件格式错误', async () => {
      const invalidFile = new File(['invalid content'], 'invalid.txt', {
        type: 'text/plain'
      })

      server.use(
        http.post('/api/v1/merchant/employees/batch', async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '文件格式不正确，请上传CSV文件',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(employeeService.batchImportEmployees(invalidFile)).rejects.toThrow('文件格式不正确，请上传CSV文件')
    }, 10000) // 增加超时时间到10秒

    it('应该处理文件过大', async () => {
      const largeFile = new File(['x'.repeat(1024)], 'large.csv', {
        type: 'text/csv'
      })

      server.use(
        http.post('/api/v1/merchant/employees/batch', async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return HttpResponse.json({
            success: false,
            code: 413,
            message: '文件大小超出限制',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 413 })
        })
      )

      await expect(employeeService.batchImportEmployees(largeFile)).rejects.toThrow('文件大小超出限制')
    }, 10000) // 增加超时时间到10秒
  })

  describe('downloadTemplate', () => {
    it('应该成功下载员工导入模板', async () => {
      server.use(
        http.get('/api/v1/merchant/employees/template', () => {
          const csvContent = '姓名,手机号,邮箱,部门,职位,权限\n张三,13800138001,zhangsan@example.com,技术部,工程师,read;write'
          return new HttpResponse(csvContent, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="employee-template.csv"'
            }
          })
        })
      )

      const result = await employeeService.downloadTemplate()
      expect(result).toBeInstanceOf(Blob)
    })

    it('应该处理模板下载失败', async () => {
      server.use(
        http.get('/api/v1/merchant/employees/template', () => {
          return HttpResponse.json({
            success: false,
            code: 500,
            message: '模板下载失败',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        })
      )

      await expect(employeeService.downloadTemplate()).rejects.toThrow('请求失败 (500)')
    })
  })

  describe('assignPermissions', () => {
    it('应该成功分配权限', async () => {
      const employeeId = 1
      const permissions = ['read', 'write', 'delete']

      server.use(
        http.post('/api/v1/merchant/employees/:id/permissions', async ({ params, request }) => {
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

      await expect(employeeService.assignPermissions(employeeId, permissions)).resolves.toBeUndefined()
    })

    it('应该处理无效权限', async () => {
      const employeeId = 1
      const invalidPermissions = ['invalid_permission']

      server.use(
        http.post('/api/v1/merchant/employees/:id/permissions', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '包含无效的权限',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(employeeService.assignPermissions(employeeId, invalidPermissions)).rejects.toThrow('包含无效的权限')
    })
  })

  describe('toggleEmployeeStatus', () => {
    it('应该成功切换员工状态', async () => {
      const employeeId = 1
      const newStatus = 'inactive'

      const mockResponse = {
        id: employeeId,
        name: '张三',
        phone: '13800138001',
        email: 'zhangsan@example.com',
        department: '技术部',
        position: '前端工程师',
        status: newStatus,
        permissions: ['read', 'write'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z'
      }

      server.use(
        http.patch('/api/v1/merchant/employees/:id/status', async ({ params, request }) => {
          expect(params.id).toBe('1')
          const body = await request.json() as { status: string }
          expect(body.status).toBe(newStatus)
          
          return HttpResponse.json({
            success: true,
            data: mockResponse,
            message: '员工状态更新成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await employeeService.toggleEmployeeStatus(employeeId, newStatus)
      expect(result).toEqual(mockResponse)
      expect(result.status).toBe(newStatus)
    })

    it('应该处理员工不存在', async () => {
      server.use(
        http.patch('/api/v1/merchant/employees/:id/status', ({ params }) => {
          if (params.id === '999') {
            return HttpResponse.json({
              success: false,
              code: 404,
              message: '员工不存在',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 404 })
          }
          return HttpResponse.json({
            success: true,
            data: {},
            message: '员工状态更新成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(employeeService.toggleEmployeeStatus(999, 'active')).rejects.toThrow('员工不存在')
    })
  })

  describe('getDepartments', () => {
    it('应该成功获取部门列表', async () => {
      const mockDepartments = ['技术部', '市场部', '销售部', '人事部', '财务部']

      server.use(
        http.get('/api/v1/merchant/departments', () => {
          return HttpResponse.json({
            success: true,
            data: mockDepartments,
            message: '获取部门列表成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await employeeService.getDepartments()
      expect(result).toEqual(mockDepartments)
      expect(result).toHaveLength(5)
    })

    it('应该处理空部门列表', async () => {
      server.use(
        http.get('/api/v1/merchant/departments', () => {
          return HttpResponse.json({
            success: true,
            data: [],
            message: '获取部门列表成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await employeeService.getDepartments()
      expect(result).toEqual([])
    })

    it('应该处理获取部门列表失败', async () => {
      server.use(
        http.get('/api/v1/merchant/departments', () => {
          return HttpResponse.json({
            success: false,
            code: 500,
            message: '获取部门列表失败',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        })
      )

      await expect(employeeService.getDepartments()).rejects.toThrow('获取部门列表失败')
    })
  })

  describe('exportEmployees', () => {
    it('应该成功导出员工列表', async () => {
      const exportParams: EmployeeListParams = {
        department: '技术部',
        status: 'active'
      }

      server.use(
        http.get('/api/v1/merchant/employees/export', ({ request }) => {
          const url = new URL(request.url)
          expect(url.searchParams.get('department')).toBe('技术部')
          expect(url.searchParams.get('status')).toBe('active')
          
          const buffer = new ArrayBuffer(8)
          return new HttpResponse(buffer, {
            headers: {
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'Content-Disposition': 'attachment; filename="employees.xlsx"'
            }
          })
        })
      )

      const result = await employeeService.exportEmployees(exportParams)
      expect(result).toBeInstanceOf(Blob)
    })

    it('应该处理导出失败', async () => {
      server.use(
        http.get('/api/v1/merchant/employees/export', () => {
          return HttpResponse.json({
            success: false,
            code: 500,
            message: '导出失败',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        })
      )

      await expect(employeeService.exportEmployees()).rejects.toThrow('请求失败 (500)')
    })
  })

  describe('边界条件和异常场景测试', () => {
    it('应该处理特殊字符的员工数据', async () => {
      const specialData: CreateEmployeeData = {
        name: '张三<script>alert("test")</script>',
        phone: '138-0013-8001',
        email: 'test+special@example.com',
        department: '技术部&开发',
        position: '高级工程师 < > " \'',
        permissions: ['read', 'write']
      }

      server.use(
        http.post('/api/v1/merchant/employees', async ({ request }) => {
          const body = await request.json() as CreateEmployeeData
          expect(body).toEqual(specialData)
          
          return HttpResponse.json({
            success: true,
            data: { id: 1, ...specialData, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            message: '创建员工成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await employeeService.createEmployee(specialData)
      expect(result.name).toBe(specialData.name)
      expect(result.department).toBe(specialData.department)
    })

    it('应该处理超长字符串', async () => {
      const longData: CreateEmployeeData = {
        name: 'A'.repeat(1000),
        phone: '13800138001',
        email: 'test@example.com',
        department: 'B'.repeat(100),
        position: 'C'.repeat(100),
        permissions: ['read']
      }

      server.use(
        http.post('/api/v1/merchant/employees', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '字段长度超出限制',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(employeeService.createEmployee(longData)).rejects.toThrow('字段长度超出限制')
    })

    it('应该处理负数ID', async () => {
      server.use(
        http.get('/api/v1/merchant/employees/:id', ({ params }) => {
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
            message: '获取员工详情成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(employeeService.getEmployee(-1)).rejects.toThrow('ID必须为正整数')
    })
  })

  describe('并发请求测试', () => {
    it('应该能够处理并发的获取请求', async () => {
      server.use(
        http.get('/api/v1/merchant/employees', () => {
          return HttpResponse.json({
            success: true,
            data: {
              employees: [],
              total: 0,
              page: 1,
              pageSize: 10
            },
            message: '获取员工列表成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const promises = Array(5).fill(null).map(() => employeeService.getEmployees())
      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result.employees).toEqual([])
        expect(result.total).toBe(0)
      })
    })

    it('应该能够处理并发的创建请求', async () => {
      const employeeData1: CreateEmployeeData = {
        name: '员工1',
        phone: '13800138001',
        email: 'employee1@example.com',
        department: '技术部',
        position: '工程师',
        permissions: ['read']
      }

      const employeeData2: CreateEmployeeData = {
        name: '员工2',
        phone: '13800138002',
        email: 'employee2@example.com',
        department: '市场部',
        position: '专员',
        permissions: ['read']
      }

      server.use(
        http.post('/api/v1/merchant/employees', async ({ request }) => {
          const body = await request.json() as CreateEmployeeData
          
          return HttpResponse.json({
            success: true,
            data: {
              id: body.email === 'employee1@example.com' ? 1 : 2,
              ...body,
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            message: '创建员工成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const [result1, result2] = await Promise.all([
        employeeService.createEmployee(employeeData1),
        employeeService.createEmployee(employeeData2)
      ])

      expect(result1.name).toBe('员工1')
      expect(result2.name).toBe('员工2')
      expect(result1.id).toBe(1)
      expect(result2.id).toBe(2)
    })
  })
})