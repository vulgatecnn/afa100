import { http, HttpResponse } from 'msw'

// 定义API Mock处理器
export const handlers = [
  // 认证相关Mock
  http.post('/api/v1/auth/login', () => {
    return HttpResponse.json({
      success: true,
      data: {
        accessToken: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: 1,
          name: '测试用户',
          email: 'test@example.com',
          userType: 'tenant_admin',
          status: 'active'
        }
      },
      message: '登录成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.post('/api/v1/auth/logout', () => {
    return HttpResponse.json({
      success: true,
      data: null,
      message: '登出成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.get('/api/v1/auth/me', () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 1,
        name: '测试用户',
        email: 'test@example.com',
        userType: 'tenant_admin',
        status: 'active'
      },
      message: '获取用户信息成功',
      timestamp: new Date().toISOString()
    })
  }),

  // 商户管理Mock
  http.get('/api/v1/tenant/merchants', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 1,
          name: '测试商户1',
          code: 'MERCHANT_001',
          contactPerson: '张三',
          phone: '13800138001',
          email: 'merchant1@example.com',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          name: '测试商户2',
          code: 'MERCHANT_002',
          contactPerson: '李四',
          phone: '13800138002',
          email: 'merchant2@example.com',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ],
      message: '获取商户列表成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.post('/api/v1/tenant/merchants', async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      success: true,
      data: {
        id: 3,
        ...body,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      message: '创建商户成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.put('/api/v1/tenant/merchants/:id', async ({ params, request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      success: true,
      data: {
        id: Number(params.id),
        ...body,
        updatedAt: new Date().toISOString()
      },
      message: '更新商户成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.delete('/api/v1/tenant/merchants/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: null,
      message: '删除商户成功',
      timestamp: new Date().toISOString()
    })
  }),

  // 空间管理Mock - 树形结构
  http.get('/api/v1/tenant/spaces/tree', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          key: 'project_1',
          title: '测试项目1',
          type: 'project',
          id: 1,
          status: 'active',
          children: [
            {
              key: 'venue_1',
              title: '测试场地1',
              type: 'venue',
              id: 1,
              status: 'active',
              children: [
                {
                  key: 'floor_1',
                  title: '1楼',
                  type: 'floor',
                  id: 1,
                  status: 'active'
                },
                {
                  key: 'floor_2',
                  title: '2楼',
                  type: 'floor',
                  id: 2,
                  status: 'inactive'
                }
              ]
            },
            {
              key: 'venue_2',
              title: '测试场地2',
              type: 'venue',
              id: 2,
              status: 'active',
              children: []
            }
          ]
        },
        {
          key: 'project_2',
          title: '测试项目2',
          type: 'project',
          id: 2,
          status: 'inactive',
          children: []
        }
      ],
      message: '获取空间树成功',
      timestamp: new Date().toISOString()
    })
  }),

  // 项目管理Mock
  http.get('/api/v1/tenant/spaces/projects', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 1,
          code: 'PROJECT_001',
          name: '测试项目1',
          description: '测试项目描述1',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ],
      message: '获取项目列表成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.post('/api/v1/tenant/spaces/projects', async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      success: true,
      data: {
        id: 3,
        ...body,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      message: '创建项目成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.put('/api/v1/tenant/spaces/projects/:id', async ({ params, request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      success: true,
      data: {
        id: Number(params.id),
        ...body,
        updatedAt: new Date().toISOString()
      },
      message: '更新项目成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.delete('/api/v1/tenant/spaces/projects/:id', () => {
    return HttpResponse.json({
      success: true,
      data: null,
      message: '删除项目成功',
      timestamp: new Date().toISOString()
    })
  }),

  // 场地管理Mock
  http.get('/api/v1/tenant/spaces/projects/:projectId/venues', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 1,
          projectId: 1,
          code: 'VENUE_001',
          name: '测试场地1',
          description: '测试场地描述1',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ],
      message: '获取场地列表成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.post('/api/v1/tenant/spaces/venues', async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      success: true,
      data: {
        id: 3,
        ...body,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      message: '创建场地成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.put('/api/v1/tenant/spaces/venues/:id', async ({ params, request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      success: true,
      data: {
        id: Number(params.id),
        ...body,
        updatedAt: new Date().toISOString()
      },
      message: '更新场地成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.delete('/api/v1/tenant/spaces/venues/:id', () => {
    return HttpResponse.json({
      success: true,
      data: null,
      message: '删除场地成功',
      timestamp: new Date().toISOString()
    })
  }),

  // 楼层管理Mock
  http.get('/api/v1/tenant/spaces/venues/:venueId/floors', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 1,
          venueId: 1,
          code: 'FLOOR_001',
          name: '1楼',
          description: '1楼描述',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ],
      message: '获取楼层列表成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.post('/api/v1/tenant/spaces/floors', async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      success: true,
      data: {
        id: 3,
        ...body,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      message: '创建楼层成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.put('/api/v1/tenant/spaces/floors/:id', async ({ params, request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      success: true,
      data: {
        id: Number(params.id),
        ...body,
        updatedAt: new Date().toISOString()
      },
      message: '更新楼层成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.delete('/api/v1/tenant/spaces/floors/:id', () => {
    return HttpResponse.json({
      success: true,
      data: null,
      message: '删除楼层成功',
      timestamp: new Date().toISOString()
    })
  }),

  // 空间状态切换Mock
  http.patch('/api/v1/tenant/spaces/projects/:id/status', async ({ params, request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      success: true,
      data: null,
      message: `项目状态已更新为${body.status === 'active' ? '启用' : '停用'}`,
      timestamp: new Date().toISOString()
    })
  }),

  http.patch('/api/v1/tenant/spaces/venues/:id/status', async ({ params, request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      success: true,
      data: null,
      message: `场地状态已更新为${body.status === 'active' ? '启用' : '停用'}`,
      timestamp: new Date().toISOString()
    })
  }),

  http.patch('/api/v1/tenant/spaces/floors/:id/status', async ({ params, request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      success: true,
      data: null,
      message: `楼层状态已更新为${body.status === 'active' ? '启用' : '停用'}`,
      timestamp: new Date().toISOString()
    })
  }),

  // 空间管理错误场景Mock
  http.get('/api/v1/tenant/spaces/tree-error', () => {
    return HttpResponse.json({
      success: false,
      code: 500,
      message: '获取空间树失败',
      data: null,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }),

  http.post('/api/v1/tenant/spaces/projects-error', () => {
    return HttpResponse.json({
      success: false,
      code: 400,
      message: '项目编码已存在',
      data: null,
      timestamp: new Date().toISOString()
    }, { status: 400 })
  }),

  http.delete('/api/v1/tenant/spaces/projects/999', () => {
    return HttpResponse.json({
      success: false,
      code: 404,
      message: '项目不存在',
      data: null,
      timestamp: new Date().toISOString()
    }, { status: 404 })
  }),

  // 访客管理Mock
  http.get('/api/v1/tenant/visitors', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 1,
          visitorName: '访客1',
          phone: '13800138001',
          company: '测试公司',
          purpose: '商务洽谈',
          visitDate: '2024-01-15T10:00:00Z',
          status: 'approved',
          qrCode: 'QR123456',
          merchantId: 1,
          createdAt: '2024-01-01T00:00:00Z'
        }
      ],
      message: '获取访客列表成功',
      timestamp: new Date().toISOString()
    })
  }),

  // 通行记录Mock
  http.get('/api/v1/tenant/access-records', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10')
    const search = url.searchParams.get('search')
    const userType = url.searchParams.get('userType')
    const result = url.searchParams.get('result')
    const direction = url.searchParams.get('direction')

    // 模拟通行记录数据
    const mockRecords = [
      {
        id: 1,
        userId: 1,
        userName: '张三',
        userType: 'employee',
        merchantName: '科技公司A',
        deviceId: 'DEVICE_001',
        deviceType: '人脸识别门禁',
        direction: 'in',
        result: 'success',
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
        userType: 'visitor',
        merchantName: '科技公司B',
        deviceId: 'DEVICE_002',
        deviceType: '二维码扫描器',
        direction: 'in',
        result: 'failed',
        failReason: '通行码已过期',
        location: {
          projectName: 'AFA大厦',
          venueName: 'B座',
          floorName: '5楼'
        },
        timestamp: '2024-01-15T10:15:00Z'
      },
      {
        id: 3,
        userId: 3,
        userName: '王五',
        userType: 'employee',
        merchantName: '科技公司A',
        deviceId: 'DEVICE_003',
        deviceType: '刷卡门禁',
        direction: 'out',
        result: 'success',
        location: {
          projectName: 'AFA大厦',
          venueName: 'A座',
          floorName: '10楼'
        },
        timestamp: '2024-01-15T18:30:00Z'
      },
      {
        id: 4,
        userId: 4,
        userName: '赵六',
        userType: 'visitor',
        merchantName: '科技公司C',
        deviceId: 'DEVICE_001',
        deviceType: '人脸识别门禁',
        direction: 'in',
        result: 'failed',
        failReason: '人脸识别失败',
        location: {
          projectName: 'AFA大厦',
          venueName: 'A座',
          floorName: '8楼'
        },
        timestamp: '2024-01-15T14:20:00Z'
      },
      {
        id: 5,
        userId: 5,
        userName: '孙七',
        userType: 'employee',
        merchantName: '科技公司D',
        deviceId: 'DEVICE_004',
        deviceType: '指纹识别器',
        direction: 'in',
        result: 'success',
        location: {
          projectName: 'AFA大厦',
          venueName: 'C座',
          floorName: '3楼'
        },
        timestamp: '2024-01-15T08:45:00Z'
      }
    ]

    // 应用筛选条件
    let filteredRecords = mockRecords
    
    if (search) {
      filteredRecords = filteredRecords.filter(record => 
        record.userName.includes(search) || 
        record.merchantName.includes(search)
      )
    }
    
    if (userType) {
      filteredRecords = filteredRecords.filter(record => record.userType === userType)
    }
    
    if (result) {
      filteredRecords = filteredRecords.filter(record => record.result === result)
    }
    
    if (direction) {
      filteredRecords = filteredRecords.filter(record => record.direction === direction)
    }

    // 分页处理
    const total = filteredRecords.length
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex)

    return HttpResponse.json({
      success: true,
      data: {
        records: paginatedRecords,
        total,
        page,
        pageSize
      },
      message: '获取通行记录成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.get('/api/v1/tenant/access-records/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        id: Number(params.id),
        userId: 1,
        userName: '张三',
        userType: 'employee',
        merchantName: '科技公司A',
        deviceId: 'DEVICE_001',
        deviceType: '人脸识别门禁',
        direction: 'in',
        result: 'success',
        location: {
          projectName: 'AFA大厦',
          venueName: 'A座',
          floorName: '10楼'
        },
        timestamp: '2024-01-15T09:30:00Z'
      },
      message: '获取通行记录详情成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.post('/api/v1/tenant/access-records/export', async ({ request }) => {
    const body = await request.json() as any
    
    // 模拟导出处理延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 根据格式返回不同的响应
    if (body.format === 'csv') {
      const csvContent = 'ID,用户名,用户类型,商户名称,设备ID,方向,结果,时间\n1,张三,员工,科技公司A,DEVICE_001,进入,成功,2024-01-15T09:30:00Z'
      return new HttpResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="access-records.csv"'
        }
      })
    } else if (body.format === 'excel') {
      // 模拟Excel文件
      const buffer = new ArrayBuffer(8)
      return new HttpResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="access-records.xlsx"'
        }
      })
    } else {
      // PDF格式
      const buffer = new ArrayBuffer(8)
      return new HttpResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="access-records.pdf"'
        }
      })
    }
  }),

  http.get('/api/v1/tenant/access-records/statistics', ({ request }) => {
    const url = new URL(request.url)
    const groupBy = url.searchParams.get('groupBy') || 'day'
    
    return HttpResponse.json({
      success: true,
      data: {
        totalRecords: 150,
        successRate: 85.5,
        dailyStats: [
          { date: '2024-01-15', total: 45, success: 40, failed: 5 },
          { date: '2024-01-14', total: 52, success: 48, failed: 4 },
          { date: '2024-01-13', total: 38, success: 35, failed: 3 }
        ]
      },
      message: '获取通行统计成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.get('/api/v1/tenant/access-records/realtime', () => {
    return HttpResponse.json({
      success: true,
      data: {
        onlineDevices: 8,
        totalDevices: 10,
        currentVisitors: 25,
        todayRecords: 156
      },
      message: '获取实时状态成功',
      timestamp: new Date().toISOString()
    })
  }),

  // 通行记录错误场景Mock
  http.get('/api/v1/tenant/access-records-error', () => {
    return HttpResponse.json({
      success: false,
      code: 500,
      message: '获取通行记录失败',
      data: null,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }),

  http.post('/api/v1/tenant/access-records/export-error', () => {
    return HttpResponse.json({
      success: false,
      code: 400,
      message: '导出参数错误',
      data: null,
      timestamp: new Date().toISOString()
    }, { status: 400 })
  }),

  // 错误处理Mock
  http.get('/api/v1/error-test', () => {
    return HttpResponse.json({
      success: false,
      code: 500,
      message: '服务器内部错误',
      data: null,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }),

  // 网络错误Mock
  http.get('/api/v1/network-error', () => {
    return HttpResponse.error()
  }),

  // 通用处理器 - 处理所有未匹配的API请求
  http.all('/api/v1/*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`)
    return HttpResponse.json({
      success: false,
      code: 404,
      message: `API endpoint not found: ${request.method} ${new URL(request.url).pathname}`,
      data: null,
      timestamp: new Date().toISOString()
    }, { status: 404 })
  })
]