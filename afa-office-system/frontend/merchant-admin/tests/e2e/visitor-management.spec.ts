import { test, expect } from '@playwright/test'

test.describe('访客管理', () => {
  test.beforeEach(async ({ page }) => {
    // Mock 登录状态
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-jwt-token')
    })

    // Mock 用户信息
    await page.route('/api/v1/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 1,
            name: '商户管理员',
            email: 'admin@merchant.com',
            userType: 'merchant_admin',
            merchantId: 1,
            merchantName: '科技公司A'
          }
        })
      })
    })

    // Mock 访客申请列表
    await page.route('/api/v1/merchant/visitors*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            applications: [
              {
                id: 1,
                applicantId: 1,
                applicantName: '申请人A',
                visitorName: '张三',
                visitorPhone: '13800138001',
                visitorCompany: '外部公司A',
                visitPurpose: '商务洽谈',
                visitType: '商务访问',
                scheduledTime: '2024-01-15T14:00:00Z',
                duration: 2,
                status: 'pending',
                usageLimit: 2,
                usageCount: 0,
                createdAt: '2024-01-15T10:00:00Z',
                updatedAt: '2024-01-15T10:00:00Z'
              },
              {
                id: 2,
                applicantId: 2,
                applicantName: '申请人B',
                visitorName: '李四',
                visitorPhone: '13800138002',
                visitorCompany: '外部公司B',
                visitPurpose: '技术交流',
                visitType: '技术访问',
                scheduledTime: '2024-01-15T16:00:00Z',
                duration: 3,
                status: 'approved',
                approvedBy: 1,
                approvedByName: '商户管理员',
                approvedAt: '2024-01-15T11:00:00Z',
                passcode: 'ABC123456',
                passcodeExpiry: '2024-01-15T19:00:00Z',
                usageLimit: 2,
                usageCount: 1,
                createdAt: '2024-01-15T09:00:00Z',
                updatedAt: '2024-01-15T11:00:00Z'
              }
            ],
            total: 2,
            page: 1,
            pageSize: 10
          }
        })
      })
    })

    await page.goto('/visitors')
  })

  test('应该显示访客申请列表', async ({ page }) => {
    await expect(page.getByText('访客管理')).toBeVisible()
    await expect(page.getByText('张三')).toBeVisible()
    await expect(page.getByText('李四')).toBeVisible()
    await expect(page.getByText('商务洽谈')).toBeVisible()
    await expect(page.getByText('技术交流')).toBeVisible()
  })

  test('应该显示正确的状态标签', async ({ page }) => {
    await expect(page.getByText('待审批')).toBeVisible()
    await expect(page.getByText('已通过')).toBeVisible()
  })

  test('应该能够搜索访客申请', async ({ page }) => {
    await page.getByPlaceholder('搜索访客姓名、手机号或公司').fill('张三')
    await page.getByRole('button', { name: /搜索/ }).click()
    
    await expect(page.getByText('张三')).toBeVisible()
  })

  test('应该能够按状态筛选', async ({ page }) => {
    await page.getByText('状态筛选').click()
    await page.getByText('待审批').click()
    
    await expect(page.getByText('张三')).toBeVisible()
  })

  test('应该能够按日期范围筛选', async ({ page }) => {
    // 点击日期范围选择器
    await page.getByPlaceholder('开始日期').click()
    
    // 选择今天的日期（简化处理）
    await page.getByText('今天').click()
    
    // 验证筛选生效
    await expect(page.getByText('张三')).toBeVisible()
  })

  test('应该能够单个审批通过', async ({ page }) => {
    // Mock 审批通过的响应
    await page.route('/api/v1/merchant/visitors/1/approve', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 1,
              applicantId: 1,
              applicantName: '申请人A',
              visitorName: '张三',
              visitorPhone: '13800138001',
              visitorCompany: '外部公司A',
              visitPurpose: '商务洽谈',
              visitType: '商务访问',
              scheduledTime: '2024-01-15T14:00:00Z',
              duration: 2,
              status: 'approved',
              approvedBy: 1,
              approvedByName: '商户管理员',
              approvedAt: '2024-01-15T12:00:00Z',
              passcode: 'DEF789012',
              passcodeExpiry: '2024-01-15T16:00:00Z',
              usageLimit: 2,
              usageCount: 0,
              createdAt: '2024-01-15T10:00:00Z',
              updatedAt: '2024-01-15T12:00:00Z'
            }
          })
        })
      }
    })

    // 点击通过按钮
    await page.getByTitle('通过').first().click()
    
    // 验证审批模态框打开
    await expect(page.getByText('通过访客申请')).toBeVisible()
    
    // 设置使用次数限制
    await page.getByLabel('使用次数限制').fill('2')
    
    // 提交审批
    await page.getByRole('button', { name: '确定' }).click()
    
    // 验证成功消息
    await expect(page.getByText('审批通过')).toBeVisible()
  })

  test('应该能够单个审批拒绝', async ({ page }) => {
    // Mock 审批拒绝的响应
    await page.route('/api/v1/merchant/visitors/1/approve', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 1,
              status: 'rejected',
              approvedBy: 1,
              approvedByName: '商户管理员',
              approvedAt: '2024-01-15T12:00:00Z'
            }
          })
        })
      }
    })

    // 点击拒绝按钮
    await page.getByTitle('拒绝').first().click()
    
    // 验证审批模态框打开
    await expect(page.getByText('拒绝访客申请')).toBeVisible()
    
    // 填写拒绝原因
    await page.getByPlaceholder('请输入审批备注（可选）').fill('时间冲突')
    
    // 提交审批
    await page.getByRole('button', { name: '确定' }).click()
    
    // 验证成功消息
    await expect(page.getByText('审批拒绝')).toBeVisible()
  })

  test('应该能够批量审批', async ({ page }) => {
    // Mock 批量审批的响应
    await page.route('/api/v1/merchant/visitors/batch-approve', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true
          })
        })
      }
    })

    // 选择第一个待审批的申请
    await page.getByRole('checkbox').first().click()
    
    // 验证批量操作按钮出现
    await expect(page.getByText('批量通过 (1)')).toBeVisible()
    
    // 点击批量通过
    await page.getByText('批量通过 (1)').click()
    
    // 确认批量操作
    await page.getByRole('button', { name: '确定' }).click()
    
    // 验证成功消息
    await expect(page.getByText('批量通过成功')).toBeVisible()
  })

  test('应该能够查看访客详情', async ({ page }) => {
    // Mock 访客详情
    await page.route('/api/v1/merchant/visitors/1', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 1,
              applicantId: 1,
              applicantName: '申请人A',
              visitorName: '张三',
              visitorPhone: '13800138001',
              visitorCompany: '外部公司A',
              visitPurpose: '商务洽谈',
              visitType: '商务访问',
              scheduledTime: '2024-01-15T14:00:00Z',
              duration: 2,
              status: 'pending',
              usageLimit: 2,
              usageCount: 0,
              createdAt: '2024-01-15T10:00:00Z',
              updatedAt: '2024-01-15T10:00:00Z'
            }
          })
        })
      }
    })

    // 点击查看详情按钮
    await page.getByTitle('查看详情').first().click()
    
    // 验证跳转到详情页面
    await expect(page).toHaveURL('/visitors/1')
    await expect(page.getByText('访客申请详情')).toBeVisible()
    await expect(page.getByText('张三')).toBeVisible()
    await expect(page.getByText('13800138001')).toBeVisible()
  })

  test('应该能够导出访客记录', async ({ page }) => {
    // Mock 导出响应
    await page.route('/api/v1/merchant/visitors/export*', async route => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="visitor-records.xlsx"'
        },
        body: Buffer.from('mock excel content')
      })
    })

    // 点击导出按钮
    await page.getByRole('button', { name: '导出记录' }).click()
    
    // 验证下载开始（实际测试中可能需要检查下载文件）
    // 这里只验证请求被发送
  })

  test('应该正确显示访客申请时间', async ({ page }) => {
    // 验证时间格式显示
    await expect(page.getByText('01-15 14:00')).toBeVisible()
    await expect(page.getByText('2小时')).toBeVisible()
  })

  test('应该能够处理空数据状态', async ({ page }) => {
    // Mock 空数据响应
    await page.route('/api/v1/merchant/visitors*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            applications: [],
            total: 0,
            page: 1,
            pageSize: 10
          }
        })
      })
    })

    await page.reload()
    
    // 验证空状态显示
    await expect(page.getByText('暂无数据')).toBeVisible()
  })

  test('应该响应式适配移动端', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 })
    
    // 验证表格可以水平滚动
    const table = page.locator('.ant-table-tbody')
    await expect(table).toBeVisible()
    
    // 验证操作按钮在移动端仍然可见
    await expect(page.getByTitle('查看详情').first()).toBeVisible()
  })
})