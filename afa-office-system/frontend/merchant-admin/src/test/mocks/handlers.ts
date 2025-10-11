import { http, HttpResponse } from 'msw'

// 定义商户管理端API Mock处理器
export const handlers = [
  // 认证相关Mock
  http.post('/api/v1/auth/login', () => {
    return HttpResponse.json({
      success: true,
      data: {
        token: 'merchant-jwt-token',
        user: {
          id: 1,
          name: '商户管理员',
          email: 'merchant@example.com',
          userType: 'merchant_admin',
          merchantId: 1,
          merchantName: '测试商户'
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
        name: '商户管理员',
        email: 'merchant@example.com',
        userType: 'merchant_admin',
        merchantId: 1,
        merchantName: '测试商户'
      },
      message: '获取用户信息成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.post('/api/v1/auth/refresh', () => {
    return HttpResponse.json({
      success: true,
      data: {
        token: 'new-merchant-jwt-token'
      },
      message: 'Token刷新成功',
      timestamp: new Date().toISOString()
    })
  }),

  // 员工管理Mock
  http.get('/api/v1/merchant/employees', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10')
    const search = url.searchParams.get('search')
    const department = url.searchParams.get('department')
    const status = url.searchParams.get('status')

    let employees = [
      {
        id: 1,
        name: '张三',
        phone: '13800138001',
        email: 'zhangsan@example.com',
        department: '技术部',
        position: '前端工程师',
        status: 'active',
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
        status: 'inactive',
        permissions: ['read'],
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z'
      }
    ]

    // 应用筛选条件
    if (search) {
      employees = employees.filter(emp => 
        emp.name.includes(search) || 
        emp.email.includes(search) ||
        emp.phone.includes(search)
      )
    }

    if (department) {
      employees = employees.filter(emp => emp.department === department)
    }

    if (status) {
      employees = employees.filter(emp => emp.status === status)
    }

    // 分页处理
    const total = employees.length
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedEmployees = employees.slice(startIndex, endIndex)

    return HttpResponse.json({
      success: true,
      data: {
        employees: paginatedEmployees,
        total,
        page,
        pageSize
      },
      message: '获取员工列表成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.get('/api/v1/merchant/employees/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        id: Number(params.id),
        name: '张三',
        phone: '13800138001',
        email: 'zhangsan@example.com',
        department: '技术部',
        position: '前端工程师',
        status: 'active',
        permissions: ['read', 'write'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      message: '获取员工详情成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.post('/api/v1/merchant/employees', async ({ request }) => {
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
      message: '创建员工成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.put('/api/v1/merchant/employees/:id', async ({ params, request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      success: true,
      data: {
        id: Number(params.id),
        ...body,
        updatedAt: new Date().toISOString()
      },
      message: '更新员工成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.delete('/api/v1/merchant/employees/:id', () => {
    return HttpResponse.json({
      success: true,
      data: null,
      message: '删除员工成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.post('/api/v1/merchant/employees/batch', () => {
    return HttpResponse.json({
      success: true,
      data: {
        success: 8,
        failed: 2,
        errors: [
          { row: 3, message: '邮箱格式不正确' },
          { row: 7, message: '手机号已存在' }
        ]
      },
      message: '批量导入完成',
      timestamp: new Date().toISOString()
    })
  }),

  http.get('/api/v1/merchant/employees/template', () => {
    const csvContent = '姓名,手机号,邮箱,部门,职位,权限\n张三,13800138001,zhangsan@example.com,技术部,工程师,read;write'
    return new HttpResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="employee-template.csv"'
      }
    })
  }),

  http.post('/api/v1/merchant/employees/:id/permissions', () => {
    return HttpResponse.json({
      success: true,
      data: null,
      message: '权限分配成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.patch('/api/v1/merchant/employees/:id/status', async ({ params, request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      success: true,
      data: {
        id: Number(params.id),
        status: body.status,
        updatedAt: new Date().toISOString()
      },
      message: '员工状态更新成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.get('/api/v1/merchant/departments', () => {
    return HttpResponse.json({
      success: true,
      data: ['技术部', '市场部', '销售部', '人事部', '财务部'],
      message: '获取部门列表成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.get('/api/v1/merchant/employees/export', () => {
    const buffer = new ArrayBuffer(8)
    return new HttpResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="employees.xlsx"'
      }
    })
  }),

  // 访客管理Mock
  http.get('/api/v1/merchant/visitors', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10')
    const search = url.searchParams.get('search')
    const status = url.searchParams.get('status')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')

    let applications = [
      {
        id: 1,
        applicantId: 1,
        applicantName: '张三',
        visitorName: '王五',
        visitorPhone: '13800138005',
        visitorCompany: '合作公司A',
        visitPurpose: '商务洽谈',
        visitType: 'business',
        scheduledTime: '2024-01-15T10:00:00Z',
        duration: 120,
        status: 'pending',
        usageLimit: 1,
        usageCount: 0,
        createdAt: '2024-01-14T00:00:00Z',
        updatedAt: '2024-01-14T00:00:00Z'
      },
      {
        id: 2,
        applicantId: 2,
        applicantName: '李四',
        visitorName: '赵六',
        visitorPhone: '13800138006',
        visitorCompany: '合作公司B',
        visitPurpose: '技术交流',
        visitType: 'technical',
        scheduledTime: '2024-01-16T14:00:00Z',
        duration: 180,
        status: 'approved',
        approvedBy: 1,
        approvedByName: '管理员',
        approvedAt: '2024-01-15T09:00:00Z',
        passcode: 'PASS123456',
        passcodeExpiry: '2024-01-16T17:00:00Z',
        usageLimit: 2,
        usageCount: 0,
        createdAt: '2024-01-14T00:00:00Z',
        updatedAt: '2024-01-15T09:00:00Z'
      }
    ]

    // 应用筛选条件
    if (search) {
      applications = applications.filter(app => 
        app.visitorName.includes(search) || 
        app.visitorCompany.includes(search) ||
        app.applicantName.includes(search)
      )
    }

    if (status) {
      applications = applications.filter(app => app.status === status)
    }

    // 分页处理
    const total = applications.length
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedApplications = applications.slice(startIndex, endIndex)

    return HttpResponse.json({
      success: true,
      data: {
        applications: paginatedApplications,
        total,
        page,
        pageSize
      },
      message: '获取访客申请列表成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.get('/api/v1/merchant/visitors/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        id: Number(params.id),
        applicantId: 1,
        applicantName: '张三',
        visitorName: '王五',
        visitorPhone: '13800138005',
        visitorCompany: '合作公司A',
        visitPurpose: '商务洽谈',
        visitType: 'business',
        scheduledTime: '2024-01-15T10:00:00Z',
        duration: 120,
        status: 'pending',
        usageLimit: 1,
        usageCount: 0,
        createdAt: '2024-01-14T00:00:00Z',
        updatedAt: '2024-01-14T00:00:00Z'
      },
      message: '获取访客申请详情成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.put('/api/v1/merchant/visitors/:id/approve', async ({ params, request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      success: true,
      data: {
        id: Number(params.id),
        status: body.status,
        approvedBy: 1,
        approvedByName: '管理员',
        approvedAt: new Date().toISOString(),
        passcode: body.status === 'approved' ? 'PASS123456' : undefined,
        passcodeExpiry: body.status === 'approved' ? new Date(Date.now() + body.duration * 60 * 1000).toISOString() : undefined,
        usageLimit: body.usageLimit || 1,
        updatedAt: new Date().toISOString()
      },
      message: `访客申请${body.status === 'approved' ? '审批通过' : '已拒绝'}`,
      timestamp: new Date().toISOString()
    })
  }),

  http.post('/api/v1/merchant/visitors/batch-approve', () => {
    return HttpResponse.json({
      success: true,
      data: null,
      message: '批量审批完成',
      timestamp: new Date().toISOString()
    })
  }),

  http.get('/api/v1/merchant/visitors/stats', () => {
    return HttpResponse.json({
      success: true,
      data: {
        total: 50,
        pending: 8,
        approved: 35,
        rejected: 5,
        todayVisits: 12
      },
      message: '获取访客统计成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.get('/api/v1/merchant/visitor-types', () => {
    return HttpResponse.json({
      success: true,
      data: ['business', 'technical', 'interview', 'maintenance', 'other'],
      message: '获取访客类型成功',
      timestamp: new Date().toISOString()
    })
  }),

  http.get('/api/v1/merchant/visitors/export', () => {
    const buffer = new ArrayBuffer(8)
    return new HttpResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="visitor-records.xlsx"'
      }
    })
  }),

  http.post('/api/v1/merchant/visitors/:id/revoke', () => {
    return HttpResponse.json({
      success: true,
      data: null,
      message: '访客申请已撤销',
      timestamp: new Date().toISOString()
    })
  }),

  http.post('/api/v1/merchant/visitors/:id/extend', async ({ params, request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      success: true,
      data: {
        id: Number(params.id),
        passcodeExpiry: new Date(Date.now() + body.duration * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      message: '通行码有效期已延长',
      timestamp: new Date().toISOString()
    })
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
  })
]