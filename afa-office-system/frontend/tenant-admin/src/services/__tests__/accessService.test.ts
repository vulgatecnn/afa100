import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { accessService } from '../accessService'
import type { AccessRecordsParams, ExportParams } from '../accessService'

describe('accessService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAccessRecords', () => {
    it('应该成功获取通行记录列表', async () => {
      const mockResponse = {
        records: [
          {
            id: 1,
            userId: 1,
            userName: '张三',
            userType: 'employee' as const,
            merchantName: '科技公司A',
            deviceId: 'DEVICE_001',
            deviceType: '人脸识别门禁',
            direction: 'in' as const,
            result: 'success' as const,
            location: {
              projectName: 'AFA大厦',
              venueName: 'A座',
              floorName: '10楼'
            },
            timestamp: '2024-01-15T09:30:00Z'
          },
          {
            id: 2,
            userId: 2,
            userName: '李四',
            userType: 'visitor' as const,
            merchantName: '科技公司B',
            deviceId: 'DEVICE_002',
            deviceType: '二维码扫描器',
            direction: 'in' as const,
            result: 'failed' as const,
            failReason: '通行码已过期',
            location: {
              projectName: 'AFA大厦',
              venueName: 'B座',
              floorName: '5楼'
            },
            timestamp: '2024-01-15T10:15:00Z'
          }
        ],
        total: 2,
        page: 1,
        pageSize: 10
      }

      server.use(
        http.get('/api/v1/tenant/access-records', ({ request }) => {
          const url = new URL(request.url)
          expect(url.searchParams.get('page')).toBe('1')
          expect(url.searchParams.get('pageSize')).toBe('10')
          
          return HttpResponse.json({
            success: true,
            data: mockResponse,
            message: '获取通行记录成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const params: AccessRecordsParams = { page: 1, pageSize: 10 }
      const result = await accessService.getAccessRecords(params)

      expect(result).toEqual(mockResponse)
      expect(result.records).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(10)
    })

    it('应该支持搜索和筛选参数', async () => {
      const searchParams: AccessRecordsParams = {
        page: 1,
        pageSize: 20,
        search: '张三',
        userType: 'employee',
        result: 'success',
        direction: 'in',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        sortBy: 'timestamp',
        sortOrder: 'desc'
      }

      server.use(
        http.get('/api/v1/tenant/access-records', ({ request }) => {
          const url = new URL(request.url)
          expect(url.searchParams.get('search')).toBe('张三')
          expect(url.searchParams.get('userType')).toBe('employee')
          expect(url.searchParams.get('result')).toBe('success')
          expect(url.searchParams.get('direction')).toBe('in')
          expect(url.searchParams.get('startDate')).toBe('2024-01-01')
          expect(url.searchParams.get('endDate')).toBe('2024-01-31')
          expect(url.searchParams.get('sortBy')).toBe('timestamp')
          expect(url.searchParams.get('sortOrder')).toBe('desc')
          
          return HttpResponse.json({
            success: true,
            data: {
              records: [],
              total: 0,
              page: 1,
              pageSize: 20
            },
            message: '获取通行记录成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await accessService.getAccessRecords(searchParams)
      expect(result.records).toHaveLength(0)
      expect(result.pageSize).toBe(20)
    })

    it('应该处理空参数', async () => {
      server.use(
        http.get('/api/v1/tenant/access-records', ({ request }) => {
          const url = new URL(request.url)
          expect(url.searchParams.toString()).toBe('')
          
          return HttpResponse.json({
            success: true,
            data: {
              records: [],
              total: 0,
              page: 1,
              pageSize: 10
            },
            message: '获取通行记录成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await accessService.getAccessRecords()
      expect(result.records).toHaveLength(0)
    })

    it('应该处理API错误', async () => {
      server.use(
        http.get('/api/v1/tenant/access-records', () => {
          return HttpResponse.json({
            success: false,
            code: 500,
            message: '获取通行记录失败',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        })
      )

      await expect(accessService.getAccessRecords()).rejects.toThrow('获取通行记录失败')
    })

    it('应该处理网络错误', async () => {
      server.use(
        http.get('/api/v1/tenant/access-records', () => {
          return HttpResponse.error()
        })
      )

      await expect(accessService.getAccessRecords()).rejects.toThrow()
    })
  })

  describe('getAccessRecord', () => {
    it('应该成功获取通行记录详情', async () => {
      const recordId = 1
      const mockRecord = {
        id: 1,
        userId: 1,
        userName: '张三',
        userType: 'employee' as const,
        merchantName: '科技公司A',
        deviceId: 'DEVICE_001',
        deviceType: '人脸识别门禁',
        direction: 'in' as const,
        result: 'success' as const,
        location: {
          projectName: 'AFA大厦',
          venueName: 'A座',
          floorName: '10楼'
        },
        timestamp: '2024-01-15T09:30:00Z'
      }

      server.use(
        http.get('/api/v1/tenant/access-records/:id', ({ params }) => {
          expect(params.id).toBe('1')
          
          return HttpResponse.json({
            success: true,
            data: mockRecord,
            message: '获取通行记录详情成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await accessService.getAccessRecord(recordId)
      expect(result).toEqual(mockRecord)
      expect(result.id).toBe(1)
      expect(result.userName).toBe('张三')
      expect(result.result).toBe('success')
    })

    it('应该处理记录不存在', async () => {
      server.use(
        http.get('/api/v1/tenant/access-records/:id', ({ params }) => {
          if (params.id === '999') {
            return HttpResponse.json({
              success: false,
              code: 404,
              message: '通行记录不存在',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 404 })
          }
          return HttpResponse.json({
            success: true,
            data: {},
            message: '获取通行记录详情成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(accessService.getAccessRecord(999)).rejects.toThrow('通行记录不存在')
    })

    it('应该处理无效的记录ID', async () => {
      server.use(
        http.get('/api/v1/tenant/access-records/:id', ({ params }) => {
          if (params.id === '0' || params.id === '-1') {
            return HttpResponse.json({
              success: false,
              code: 400,
              message: '无效的记录ID',
              data: null,
              timestamp: new Date().toISOString()
            }, { status: 400 })
          }
          return HttpResponse.json({
            success: true,
            data: {},
            message: '获取通行记录详情成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(accessService.getAccessRecord(0)).rejects.toThrow('无效的记录ID')
      await expect(accessService.getAccessRecord(-1)).rejects.toThrow('无效的记录ID')
    })
  })

  describe('exportAccessRecords', () => {
    it('应该成功导出CSV格式的通行记录', async () => {
      const exportParams: ExportParams = {
        format: 'csv',
        filters: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      }

      server.use(
        http.post('/api/v1/tenant/access-records/export', async ({ request }) => {
          const body = await request.json() as ExportParams
          expect(body).toEqual(exportParams)
          
          const csvContent = 'ID,用户名,用户类型,商户名称,设备ID,方向,结果,时间\n1,张三,员工,科技公司A,DEVICE_001,进入,成功,2024-01-15T09:30:00Z'
          return new HttpResponse(csvContent, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="access-records.csv"'
            }
          })
        })
      )

      const result = await accessService.exportAccessRecords(exportParams)
      expect(result).toBeInstanceOf(Blob)
    })

    it('应该成功导出Excel格式的通行记录', async () => {
      const exportParams: ExportParams = {
        format: 'excel',
        filters: {
          userType: 'employee'
        }
      }

      server.use(
        http.post('/api/v1/tenant/access-records/export', async ({ request }) => {
          const body = await request.json() as ExportParams
          expect(body.format).toBe('excel')
          
          const buffer = new ArrayBuffer(8)
          return new HttpResponse(buffer, {
            headers: {
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'Content-Disposition': 'attachment; filename="access-records.xlsx"'
            }
          })
        })
      )

      const result = await accessService.exportAccessRecords(exportParams)
      expect(result).toBeInstanceOf(Blob)
    })

    it('应该成功导出PDF格式的通行记录', async () => {
      const exportParams: ExportParams = {
        format: 'pdf'
      }

      server.use(
        http.post('/api/v1/tenant/access-records/export', async ({ request }) => {
          const body = await request.json() as ExportParams
          expect(body.format).toBe('pdf')
          
          const buffer = new ArrayBuffer(8)
          return new HttpResponse(buffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': 'attachment; filename="access-records.pdf"'
            }
          })
        })
      )

      const result = await accessService.exportAccessRecords(exportParams)
      expect(result).toBeInstanceOf(Blob)
    })

    it('应该处理导出参数错误', async () => {
      const invalidParams: ExportParams = {
        format: 'invalid' as any
      }

      server.use(
        http.post('/api/v1/tenant/access-records/export', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '导出格式不支持',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(accessService.exportAccessRecords(invalidParams)).rejects.toThrow('导出格式不支持')
    })

    it('应该处理导出失败', async () => {
      const exportParams: ExportParams = {
        format: 'csv'
      }

      server.use(
        http.post('/api/v1/tenant/access-records/export', () => {
          return HttpResponse.json({
            success: false,
            code: 500,
            message: '导出失败',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        })
      )

      await expect(accessService.exportAccessRecords(exportParams)).rejects.toThrow('导出失败')
    })

    it('应该处理大数据量导出超时', async () => {
      const exportParams: ExportParams = {
        format: 'excel',
        filters: {
          startDate: '2023-01-01',
          endDate: '2024-12-31'
        }
      }

      server.use(
        http.post('/api/v1/tenant/access-records/export', () => {
          return HttpResponse.json({
            success: false,
            code: 408,
            message: '导出超时，请缩小数据范围',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 408 })
        })
      )

      await expect(accessService.exportAccessRecords(exportParams)).rejects.toThrow('导出超时，请缩小数据范围')
    })
  })

  describe('getAccessStatistics', () => {
    it('应该成功获取通行统计数据', async () => {
      const mockStats = {
        totalRecords: 150,
        successRate: 85.5,
        dailyStats: [
          { date: '2024-01-15', total: 45, success: 40, failed: 5 },
          { date: '2024-01-14', total: 52, success: 48, failed: 4 },
          { date: '2024-01-13', total: 38, success: 35, failed: 3 }
        ]
      }

      server.use(
        http.get('/api/v1/tenant/access-records/statistics', ({ request }) => {
          const url = new URL(request.url)
          expect(url.searchParams.get('startDate')).toBe('2024-01-01')
          expect(url.searchParams.get('endDate')).toBe('2024-01-31')
          expect(url.searchParams.get('groupBy')).toBe('day')
          
          return HttpResponse.json({
            success: true,
            data: mockStats,
            message: '获取通行统计成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const params = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        groupBy: 'day' as const
      }

      const result = await accessService.getAccessStatistics(params)
      expect(result).toEqual(mockStats)
      expect(result.totalRecords).toBe(150)
      expect(result.successRate).toBe(85.5)
      expect(result.dailyStats).toHaveLength(3)
    })

    it('应该支持按周统计', async () => {
      const mockWeeklyStats = {
        totalRecords: 300,
        successRate: 90.0,
        dailyStats: [
          { date: '2024-W03', total: 150, success: 135, failed: 15 },
          { date: '2024-W02', total: 150, success: 135, failed: 15 }
        ]
      }

      server.use(
        http.get('/api/v1/tenant/access-records/statistics', ({ request }) => {
          const url = new URL(request.url)
          expect(url.searchParams.get('groupBy')).toBe('week')
          
          return HttpResponse.json({
            success: true,
            data: mockWeeklyStats,
            message: '获取通行统计成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await accessService.getAccessStatistics({ groupBy: 'week' })
      expect(result.totalRecords).toBe(300)
      expect(result.dailyStats).toHaveLength(2)
    })

    it('应该支持按月统计', async () => {
      const mockMonthlyStats = {
        totalRecords: 1200,
        successRate: 88.0,
        dailyStats: [
          { date: '2024-01', total: 600, success: 528, failed: 72 },
          { date: '2023-12', total: 600, success: 528, failed: 72 }
        ]
      }

      server.use(
        http.get('/api/v1/tenant/access-records/statistics', ({ request }) => {
          const url = new URL(request.url)
          expect(url.searchParams.get('groupBy')).toBe('month')
          
          return HttpResponse.json({
            success: true,
            data: mockMonthlyStats,
            message: '获取通行统计成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await accessService.getAccessStatistics({ groupBy: 'month' })
      expect(result.totalRecords).toBe(1200)
      expect(result.dailyStats).toHaveLength(2)
    })

    it('应该处理空参数', async () => {
      server.use(
        http.get('/api/v1/tenant/access-records/statistics', ({ request }) => {
          const url = new URL(request.url)
          expect(url.searchParams.toString()).toBe('')
          
          return HttpResponse.json({
            success: true,
            data: {
              totalRecords: 0,
              successRate: 0,
              dailyStats: []
            },
            message: '获取通行统计成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await accessService.getAccessStatistics()
      expect(result.totalRecords).toBe(0)
      expect(result.dailyStats).toHaveLength(0)
    })

    it('应该处理统计数据获取失败', async () => {
      server.use(
        http.get('/api/v1/tenant/access-records/statistics', () => {
          return HttpResponse.json({
            success: false,
            code: 500,
            message: '获取统计数据失败',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        })
      )

      await expect(accessService.getAccessStatistics()).rejects.toThrow('获取统计数据失败')
    })
  })

  describe('getRealtimeStatus', () => {
    it('应该成功获取实时通行状态', async () => {
      const mockStatus = {
        onlineDevices: 8,
        totalDevices: 10,
        currentVisitors: 25,
        todayRecords: 156
      }

      server.use(
        http.get('/api/v1/tenant/access-records/realtime', () => {
          return HttpResponse.json({
            success: true,
            data: mockStatus,
            message: '获取实时状态成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await accessService.getRealtimeStatus()
      expect(result).toEqual(mockStatus)
      expect(result.onlineDevices).toBe(8)
      expect(result.totalDevices).toBe(10)
      expect(result.currentVisitors).toBe(25)
      expect(result.todayRecords).toBe(156)
    })

    it('应该处理设备离线情况', async () => {
      const offlineStatus = {
        onlineDevices: 0,
        totalDevices: 10,
        currentVisitors: 0,
        todayRecords: 0
      }

      server.use(
        http.get('/api/v1/tenant/access-records/realtime', () => {
          return HttpResponse.json({
            success: true,
            data: offlineStatus,
            message: '获取实时状态成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await accessService.getRealtimeStatus()
      expect(result.onlineDevices).toBe(0)
      expect(result.currentVisitors).toBe(0)
    })

    it('应该处理实时状态获取失败', async () => {
      server.use(
        http.get('/api/v1/tenant/access-records/realtime', () => {
          return HttpResponse.json({
            success: false,
            code: 500,
            message: '获取实时状态失败',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        })
      )

      await expect(accessService.getRealtimeStatus()).rejects.toThrow('获取实时状态失败')
    })

    it('应该处理网络错误', async () => {
      server.use(
        http.get('/api/v1/tenant/access-records/realtime', () => {
          return HttpResponse.error()
        })
      )

      await expect(accessService.getRealtimeStatus()).rejects.toThrow()
    })
  })

  describe('边界条件和异常场景测试', () => {
    it('应该处理特殊字符的搜索参数', async () => {
      const specialParams: AccessRecordsParams = {
        search: '张三<script>alert("test")</script>',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z'
      }

      server.use(
        http.get('/api/v1/tenant/access-records', ({ request }) => {
          const url = new URL(request.url)
          expect(url.searchParams.get('search')).toBe('张三<script>alert("test")</script>')
          
          return HttpResponse.json({
            success: true,
            data: {
              records: [],
              total: 0,
              page: 1,
              pageSize: 10
            },
            message: '获取通行记录成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await accessService.getAccessRecords(specialParams)
      expect(result.records).toHaveLength(0)
    })

    it('应该处理无效的日期范围', async () => {
      const invalidDateParams: AccessRecordsParams = {
        startDate: '2024-01-31',
        endDate: '2024-01-01' // 结束日期早于开始日期
      }

      server.use(
        http.get('/api/v1/tenant/access-records', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '日期范围无效',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(accessService.getAccessRecords(invalidDateParams)).rejects.toThrow('日期范围无效')
    })

    it('应该处理超大页面大小', async () => {
      const largePageParams: AccessRecordsParams = {
        page: 1,
        pageSize: 10000
      }

      server.use(
        http.get('/api/v1/tenant/access-records', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '页面大小超出限制',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(accessService.getAccessRecords(largePageParams)).rejects.toThrow('页面大小超出限制')
    })

    it('应该处理负数页码', async () => {
      const negativePageParams: AccessRecordsParams = {
        page: -1,
        pageSize: 10
      }

      server.use(
        http.get('/api/v1/tenant/access-records', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '页码必须为正整数',
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 400 })
        })
      )

      await expect(accessService.getAccessRecords(negativePageParams)).rejects.toThrow('页码必须为正整数')
    })

    it('应该处理空的导出筛选条件', async () => {
      const emptyFilterParams: ExportParams = {
        format: 'csv',
        filters: {}
      }

      server.use(
        http.post('/api/v1/tenant/access-records/export', async ({ request }) => {
          const body = await request.json() as ExportParams
          expect(body.filters).toEqual({})
          
          const csvContent = 'ID,用户名,用户类型,商户名称,设备ID,方向,结果,时间\n'
          return new HttpResponse(csvContent, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="access-records.csv"'
            }
          })
        })
      )

      const result = await accessService.exportAccessRecords(emptyFilterParams)
      expect(result).toBeInstanceOf(Blob)
    })

    it('应该处理统计数据中的异常值', async () => {
      const abnormalStats = {
        totalRecords: -1, // 异常的负数
        successRate: 150.0, // 异常的超过100%的成功率
        dailyStats: [
          { date: 'invalid-date', total: 0, success: 0, failed: 0 }
        ]
      }

      server.use(
        http.get('/api/v1/tenant/access-records/statistics', () => {
          return HttpResponse.json({
            success: true,
            data: abnormalStats,
            message: '获取通行统计成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const result = await accessService.getAccessStatistics()
      expect(result.totalRecords).toBe(-1)
      expect(result.successRate).toBe(150.0)
      expect(result.dailyStats[0].date).toBe('invalid-date')
    })
  })

  describe('并发请求测试', () => {
    it('应该能够处理并发的获取请求', async () => {
      server.use(
        http.get('/api/v1/tenant/access-records', () => {
          return HttpResponse.json({
            success: true,
            data: {
              records: [],
              total: 0,
              page: 1,
              pageSize: 10
            },
            message: '获取通行记录成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const promises = [
        accessService.getAccessRecords({ page: 1 }),
        accessService.getAccessRecords({ page: 2 }),
        accessService.getAccessRecords({ userType: 'employee' }),
        accessService.getAccessRecords({ result: 'success' })
      ]

      const results = await Promise.all(promises)
      expect(results).toHaveLength(4)
      results.forEach(result => {
        expect(result.records).toEqual([])
        expect(result.total).toBe(0)
      })
    })

    it('应该能够处理并发的统计和实时状态请求', async () => {
      server.use(
        http.get('/api/v1/tenant/access-records/statistics', () => {
          return HttpResponse.json({
            success: true,
            data: {
              totalRecords: 100,
              successRate: 85.0,
              dailyStats: []
            },
            message: '获取通行统计成功',
            timestamp: new Date().toISOString()
          })
        }),
        http.get('/api/v1/tenant/access-records/realtime', () => {
          return HttpResponse.json({
            success: true,
            data: {
              onlineDevices: 5,
              totalDevices: 10,
              currentVisitors: 15,
              todayRecords: 50
            },
            message: '获取实时状态成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const [statsResult, realtimeResult] = await Promise.all([
        accessService.getAccessStatistics(),
        accessService.getRealtimeStatus()
      ])

      expect(statsResult.totalRecords).toBe(100)
      expect(realtimeResult.onlineDevices).toBe(5)
    })
  })

  describe('性能测试', () => {
    it('应该在合理时间内完成请求', async () => {
      server.use(
        http.get('/api/v1/tenant/access-records', async () => {
          // 模拟一定的延迟
          await new Promise(resolve => setTimeout(resolve, 100))
          
          return HttpResponse.json({
            success: true,
            data: {
              records: [],
              total: 0,
              page: 1,
              pageSize: 10
            },
            message: '获取通行记录成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const startTime = Date.now()
      const result = await accessService.getAccessRecords()
      const endTime = Date.now()

      expect(result.records).toEqual([])
      expect(endTime - startTime).toBeLessThan(1000) // 应该在1秒内完成
    })

    it('应该能够处理大量数据的导出请求', async () => {
      const largeExportParams: ExportParams = {
        format: 'excel',
        filters: {
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }
      }

      server.use(
        http.post('/api/v1/tenant/access-records/export', async () => {
          // 模拟大数据量导出的延迟
          await new Promise(resolve => setTimeout(resolve, 200))
          
          const buffer = new ArrayBuffer(1024 * 1024) // 1MB的模拟数据
          return new HttpResponse(buffer, {
            headers: {
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'Content-Disposition': 'attachment; filename="large-access-records.xlsx"'
            }
          })
        })
      )

      const startTime = Date.now()
      const result = await accessService.exportAccessRecords(largeExportParams)
      const endTime = Date.now()

      expect(result).toBeInstanceOf(Blob)
      expect(endTime - startTime).toBeLessThan(2000) // 应该在2秒内完成
    })
  })
})