import { test, expect } from '@playwright/test'

test.describe('员工管理', () => {
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

    // Mock 员工列表
    await page.route('/api/v1/merchant/employees*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            employees: [
              {
                id: 1,
                name: '张三',
                phone: '13800138001',
                email: 'zhangsan@tech-a.com',
                department: '技术部',
                position: '高级工程师',
                status: 'active',
                permissions: ['project_1_access', 'venue_1_access'],
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z'
              },
              {
                id: 2,
                name: '李四',
                phone: '13800138002',
                email: 'lisi@tech-a.com',
                department: '产品部',
                position: '产品经理',
                status: 'active',
                permissions: ['project_1_access'],
                createdAt: '2024-01-02T00:00:00Z',
                updatedAt: '2024-01-02T00:00:00Z'
              }
            ],
            total: 2,
            page: 1,
            pageSize: 10
          }
        })
      })
    })

    // Mock 部门列表
    await page.route('/api/v1/merchant/departments', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: ['技术部', '产品部', '市场部', '人事部']
        })
      })
    })

    await page.goto('/employees')
  })

  test('应该显示员工列表', async ({ page }) => {
    await expect(page.getByText('员工管理')).toBeVisible()
    await expect(page.getByText('张三')).toBeVisible()
    await expect(page.getByText('李四')).toBeVisible()
    await expect(page.getByText('技术部')).toBeVisible()
    await expect(page.getByText('高级工程师')).toBeVisible()
  })

  test('应该能够搜索员工', async ({ page }) => {
    await page.getByPlaceholder('搜索员工姓名、手机号或邮箱').fill('张三')
    await page.getByRole('button', { name: /搜索/ }).click()
    
    await expect(page.getByText('张三')).toBeVisible()
  })

  test('应该能够按部门筛选', async ({ page }) => {
    await page.getByText('部门筛选').click()
    await page.getByText('技术部').click()
    
    await expect(page.getByText('张三')).toBeVisible()
  })

  test('应该能够按状态筛选', async ({ page }) => {
    await page.getByText('状态筛选').click()
    await page.getByText('在职').click()
    
    await expect(page.getByText('张三')).toBeVisible()
    await expect(page.getByText('李四')).toBeVisible()
  })

  test('应该能够新增员工', async ({ page }) => {
    // Mock 创建员工的响应
    await page.route('/api/v1/merchant/employees', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 3,
              name: '王五',
              phone: '13800138003',
              email: 'wangwu@tech-a.com',
              department: '技术部',
              position: '初级工程师',
              status: 'active',
              permissions: ['project_1_access'],
              createdAt: '2024-01-15T00:00:00Z',
              updatedAt: '2024-01-15T00:00:00Z'
            }
          })
        })
      }
    })

    await page.getByRole('button', { name: '新增员工' }).click()
    
    // 验证跳转到新增页面
    await expect(page).toHaveURL('/employees/new')
    await expect(page.getByText('新增员工')).toBeVisible()
    
    // 填写表单
    await page.getByPlaceholder('请输入员工姓名').fill('王五')
    await page.getByPlaceholder('请输入手机号').fill('13800138003')
    await page.getByPlaceholder('请输入邮箱地址').fill('wangwu@tech-a.com')
    await page.getByText('请选择部门').click()
    await page.getByText('技术部').click()
    await page.getByPlaceholder('请输入职位').fill('初级工程师')
    
    // 选择权限
    await page.getByText('AFA大厦访问权限').click()
    
    // 提交表单
    await page.getByRole('button', { name: '创建' }).click()
    
    // 验证成功消息和跳转
    await expect(page.getByText('创建成功')).toBeVisible()
    await expect(page).toHaveURL('/employees')
  })

  test('应该能够编辑员工', async ({ page }) => {
    // Mock 获取员工详情
    await page.route('/api/v1/merchant/employees/1', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 1,
              name: '张三',
              phone: '13800138001',
              email: 'zhangsan@tech-a.com',
              department: '技术部',
              position: '高级工程师',
              status: 'active',
              permissions: ['project_1_access', 'venue_1_access'],
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            }
          })
        })
      }
    })

    // Mock 更新员工
    await page.route('/api/v1/merchant/employees/1', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 1,
              name: '张三',
              phone: '13800138001',
              email: 'zhangsan@tech-a.com',
              department: '技术部',
              position: '资深工程师',
              status: 'active',
              permissions: ['project_1_access', 'venue_1_access'],
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-15T00:00:00Z'
            }
          })
        })
      }
    })

    // 点击编辑按钮
    await page.getByTitle('编辑').first().click()
    
    // 验证跳转到编辑页面
    await expect(page).toHaveURL('/employees/1/edit')
    await expect(page.getByText('编辑员工')).toBeVisible()
    
    // 修改职位
    const positionInput = page.getByPlaceholder('请输入职位')
    await positionInput.clear()
    await positionInput.fill('资深工程师')
    
    // 提交表单
    await page.getByRole('button', { name: '更新' }).click()
    
    // 验证成功消息和跳转
    await expect(page.getByText('更新成功')).toBeVisible()
    await expect(page).toHaveURL('/employees')
  })

  test('应该能够批量导入员工', async ({ page }) => {
    // Mock 下载模板
    await page.route('/api/v1/merchant/employees/template', async route => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="employee-template.xlsx"'
        },
        body: Buffer.from('mock excel content')
      })
    })

    // Mock 批量导入
    await page.route('/api/v1/merchant/employees/batch', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              success: 2,
              failed: 0,
              errors: []
            }
          })
        })
      }
    })

    // 下载模板
    await page.getByRole('button', { name: '下载模板' }).click()
    
    // 模拟文件上传（实际测试中可能需要使用真实文件）
    const fileInput = page.locator('input[type="file"]')
    
    // 创建一个模拟的Excel文件
    const buffer = Buffer.from('mock excel content')
    await fileInput.setInputFiles({
      name: 'employees.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: buffer
    })
    
    // 验证导入进度模态框
    await expect(page.getByText('批量导入员工')).toBeVisible()
    await expect(page.getByText('正在导入员工数据...')).toBeVisible()
    
    // 等待导入完成
    await expect(page.getByText('成功导入 2 条员工记录')).toBeVisible()
  })

  test('应该能够删除员工', async ({ page }) => {
    // Mock 删除员工
    await page.route('/api/v1/merchant/employees/2', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true
          })
        })
      }
    })

    // 点击删除按钮
    await page.getByTitle('删除').first().click()
    
    // 确认删除
    await page.getByRole('button', { name: '确定' }).click()
    
    // 验证成功消息
    await expect(page.getByText('删除成功')).toBeVisible()
  })

  test('应该能够切换员工状态', async ({ page }) => {
    // Mock 切换状态
    await page.route('/api/v1/merchant/employees/1/status', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 1,
              name: '张三',
              phone: '13800138001',
              email: 'zhangsan@tech-a.com',
              department: '技术部',
              position: '高级工程师',
              status: 'inactive',
              permissions: ['project_1_access', 'venue_1_access'],
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-15T00:00:00Z'
            }
          })
        })
      }
    })

    // 点击停用按钮
    await page.getByText('停用').first().click()
    
    // 验证成功消息
    await expect(page.getByText('停用成功')).toBeVisible()
  })

  test('表单验证应该正常工作', async ({ page }) => {
    await page.getByRole('button', { name: '新增员工' }).click()
    
    // 不填写任何内容直接提交
    await page.getByRole('button', { name: '创建' }).click()
    
    // 验证必填字段错误提示
    await expect(page.getByText('请输入员工姓名')).toBeVisible()
    await expect(page.getByText('请输入手机号')).toBeVisible()
    await expect(page.getByText('请输入邮箱地址')).toBeVisible()
    await expect(page.getByText('请选择部门')).toBeVisible()
    await expect(page.getByText('请输入职位')).toBeVisible()
  })

  test('应该响应式适配移动端', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 })
    
    // 验证表格可以水平滚动
    const table = page.locator('.ant-table-tbody')
    await expect(table).toBeVisible()
    
    // 验证操作按钮在移动端仍然可见
    await expect(page.getByTitle('编辑').first()).toBeVisible()
  })
})