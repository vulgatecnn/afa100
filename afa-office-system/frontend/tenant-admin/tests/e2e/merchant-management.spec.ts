import { test, expect } from '@playwright/test'

test.describe('商户管理', () => {
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
            name: '管理员',
            email: 'admin@example.com',
            userType: 'tenant_admin'
          }
        })
      })
    })

    // Mock 商户列表
    await page.route('/api/v1/tenant/merchants*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            merchants: [
              {
                id: 1,
                name: '科技公司A',
                code: 'TECH_A',
                contact: '张三',
                phone: '13800138001',
                email: 'contact@tech-a.com',
                address: '北京市朝阳区xxx路xxx号',
                status: 'active',
                permissions: ['project_1_access', 'venue_1_access'],
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z'
              },
              {
                id: 2,
                name: '科技公司B',
                code: 'TECH_B',
                contact: '李四',
                phone: '13800138002',
                email: 'contact@tech-b.com',
                address: '北京市海淀区xxx路xxx号',
                status: 'inactive',
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

    await page.goto('/merchants')
  })

  test('应该显示商户列表', async ({ page }) => {
    await expect(page.getByText('商户管理')).toBeVisible()
    await expect(page.getByText('科技公司A')).toBeVisible()
    await expect(page.getByText('科技公司B')).toBeVisible()
    await expect(page.getByText('TECH_A')).toBeVisible()
    await expect(page.getByText('张三')).toBeVisible()
  })

  test('应该能够搜索商户', async ({ page }) => {
    await page.getByPlaceholder('搜索商户名称、编码或联系人').fill('科技公司A')
    await page.getByRole('button', { name: /搜索/ }).click()
    
    await expect(page.getByText('科技公司A')).toBeVisible()
  })

  test('应该能够筛选商户状态', async ({ page }) => {
    await page.getByText('状态筛选').click()
    await page.getByText('启用').click()
    
    // 验证筛选结果
    await expect(page.getByText('科技公司A')).toBeVisible()
  })

  test('应该能够新增商户', async ({ page }) => {
    // Mock 创建商户的响应
    await page.route('/api/v1/tenant/merchants', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 3,
              name: '新商户',
              code: 'NEW_MERCHANT',
              contact: '王五',
              phone: '13800138003',
              email: 'contact@new.com',
              address: '新地址',
              status: 'active',
              permissions: [],
              createdAt: '2024-01-15T00:00:00Z',
              updatedAt: '2024-01-15T00:00:00Z'
            }
          })
        })
      }
    })

    await page.getByRole('button', { name: '新增商户' }).click()
    
    // 验证跳转到新增页面
    await expect(page).toHaveURL('/merchants/new')
    await expect(page.getByText('新增商户')).toBeVisible()
    
    // 填写表单
    await page.getByPlaceholder('请输入商户名称').fill('新商户')
    await page.getByPlaceholder('请输入商户编码').fill('NEW_MERCHANT')
    await page.getByPlaceholder('请输入联系人姓名').fill('王五')
    await page.getByPlaceholder('请输入联系电话').fill('13800138003')
    await page.getByPlaceholder('请输入邮箱地址').fill('contact@new.com')
    await page.getByPlaceholder('请输入详细地址').fill('新地址')
    
    // 提交表单
    await page.getByRole('button', { name: '创建' }).click()
    
    // 验证成功消息和跳转
    await expect(page.getByText('创建成功')).toBeVisible()
    await expect(page).toHaveURL('/merchants')
  })

  test('应该能够编辑商户', async ({ page }) => {
    // Mock 获取商户详情
    await page.route('/api/v1/tenant/merchants/1', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 1,
              name: '科技公司A',
              code: 'TECH_A',
              contact: '张三',
              phone: '13800138001',
              email: 'contact@tech-a.com',
              address: '北京市朝阳区xxx路xxx号',
              status: 'active',
              permissions: ['project_1_access', 'venue_1_access'],
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            }
          })
        })
      }
    })

    // Mock 更新商户
    await page.route('/api/v1/tenant/merchants/1', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 1,
              name: '科技公司A（已更新）',
              code: 'TECH_A',
              contact: '张三',
              phone: '13800138001',
              email: 'contact@tech-a.com',
              address: '北京市朝阳区xxx路xxx号',
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
    await expect(page).toHaveURL('/merchants/1/edit')
    await expect(page.getByText('编辑商户')).toBeVisible()
    
    // 修改商户名称
    const nameInput = page.getByPlaceholder('请输入商户名称')
    await nameInput.clear()
    await nameInput.fill('科技公司A（已更新）')
    
    // 提交表单
    await page.getByRole('button', { name: '更新' }).click()
    
    // 验证成功消息和跳转
    await expect(page.getByText('更新成功')).toBeVisible()
    await expect(page).toHaveURL('/merchants')
  })

  test('应该能够删除商户', async ({ page }) => {
    // Mock 删除商户
    await page.route('/api/v1/tenant/merchants/2', async route => {
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

  test('应该能够查看商户详情', async ({ page }) => {
    // 点击查看详情按钮
    await page.getByTitle('查看详情').first().click()
    
    // 验证详情抽屉打开
    await expect(page.getByText('商户详情')).toBeVisible()
    await expect(page.getByText('科技公司A')).toBeVisible()
    await expect(page.getByText('TECH_A')).toBeVisible()
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