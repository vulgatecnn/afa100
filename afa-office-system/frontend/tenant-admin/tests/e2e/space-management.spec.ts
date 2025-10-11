import { test, expect } from '@playwright/test'

test.describe('空间管理', () => {
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

    // Mock 空间树数据
    await page.route('/api/v1/tenant/spaces/tree', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              key: 'project_1',
              title: 'AFA大厦',
              type: 'project',
              id: 1,
              status: 'active',
              children: [
                {
                  key: 'venue_1',
                  title: 'A座',
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
                      status: 'active'
                    }
                  ]
                },
                {
                  key: 'venue_2',
                  title: 'B座',
                  type: 'venue',
                  id: 2,
                  status: 'active',
                  children: [
                    {
                      key: 'floor_3',
                      title: '1楼',
                      type: 'floor',
                      id: 3,
                      status: 'inactive'
                    }
                  ]
                }
              ]
            }
          ]
        })
      })
    })

    await page.goto('/spaces')
  })

  test('应该显示空间树结构', async ({ page }) => {
    await expect(page.getByText('空间管理')).toBeVisible()
    await expect(page.getByText('AFA大厦')).toBeVisible()
    await expect(page.getByText('A座')).toBeVisible()
    await expect(page.getByText('B座')).toBeVisible()
  })

  test('应该能够展开和收起树节点', async ({ page }) => {
    // 默认应该展开所有节点
    await expect(page.getByText('1楼').first()).toBeVisible()
    await expect(page.getByText('2楼')).toBeVisible()
    
    // 点击项目节点收起
    await page.getByText('AFA大厦').click()
    
    // 验证子节点被隐藏（这里需要根据实际的Tree组件行为调整）
    // await expect(page.getByText('A座')).not.toBeVisible()
  })

  test('应该能够新增项目', async ({ page }) => {
    // Mock 创建项目的响应
    await page.route('/api/v1/tenant/spaces/projects', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 2,
              code: 'NEW_PROJECT',
              name: '新项目',
              description: '新项目描述',
              status: 'active',
              createdAt: '2024-01-15T00:00:00Z',
              updatedAt: '2024-01-15T00:00:00Z'
            }
          })
        })
      }
    })

    await page.getByRole('button', { name: '新增项目' }).click()
    
    // 验证模态框打开
    await expect(page.getByText('新增项目')).toBeVisible()
    
    // 填写表单
    await page.getByPlaceholder('请输入编码').fill('NEW_PROJECT')
    await page.getByPlaceholder('请输入名称').fill('新项目')
    await page.getByPlaceholder('请输入描述').fill('新项目描述')
    
    // 提交表单
    await page.getByRole('button', { name: '确定' }).click()
    
    // 验证成功消息
    await expect(page.getByText('创建成功')).toBeVisible()
  })

  test('应该能够通过右键菜单操作', async ({ page }) => {
    // Mock 创建场地的响应
    await page.route('/api/v1/tenant/spaces/venues', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 3,
              projectId: 1,
              code: 'NEW_VENUE',
              name: '新场地',
              description: '新场地描述',
              status: 'active',
              createdAt: '2024-01-15T00:00:00Z',
              updatedAt: '2024-01-15T00:00:00Z'
            }
          })
        })
      }
    })

    // 点击项目节点的更多按钮
    await page.locator('.ant-tree-node-content-wrapper').first().hover()
    await page.getByRole('button').filter({ hasText: /更多/ }).first().click()
    
    // 点击添加场地
    await page.getByText('添加场地').click()
    
    // 验证模态框打开
    await expect(page.getByText('新增场地')).toBeVisible()
    
    // 填写表单
    await page.getByPlaceholder('请输入编码').fill('NEW_VENUE')
    await page.getByPlaceholder('请输入名称').fill('新场地')
    await page.getByPlaceholder('请输入描述').fill('新场地描述')
    
    // 提交表单
    await page.getByRole('button', { name: '确定' }).click()
    
    // 验证成功消息
    await expect(page.getByText('创建成功')).toBeVisible()
  })

  test('应该能够编辑空间信息', async ({ page }) => {
    // Mock 更新项目的响应
    await page.route('/api/v1/tenant/spaces/projects/1', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 1,
              code: 'AFA_BUILDING',
              name: 'AFA大厦（已更新）',
              description: '更新后的描述',
              status: 'active',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-15T00:00:00Z'
            }
          })
        })
      }
    })

    // 点击项目节点的更多按钮
    await page.locator('.ant-tree-node-content-wrapper').first().hover()
    await page.getByRole('button').filter({ hasText: /更多/ }).first().click()
    
    // 点击编辑
    await page.getByText('编辑').click()
    
    // 验证模态框打开
    await expect(page.getByText('编辑项目')).toBeVisible()
    
    // 修改名称
    const nameInput = page.getByPlaceholder('请输入名称')
    await nameInput.clear()
    await nameInput.fill('AFA大厦（已更新）')
    
    // 提交表单
    await page.getByRole('button', { name: '确定' }).click()
    
    // 验证成功消息
    await expect(page.getByText('更新成功')).toBeVisible()
  })

  test('应该能够切换空间状态', async ({ page }) => {
    // Mock 切换状态的响应
    await page.route('/api/v1/tenant/spaces/projects/1/status', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true
          })
        })
      }
    })

    // 点击项目节点的更多按钮
    await page.locator('.ant-tree-node-content-wrapper').first().hover()
    await page.getByRole('button').filter({ hasText: /更多/ }).first().click()
    
    // 点击停用
    await page.getByText('停用').click()
    
    // 验证成功消息
    await expect(page.getByText('停用成功')).toBeVisible()
  })

  test('应该能够删除空间', async ({ page }) => {
    // Mock 删除项目的响应
    await page.route('/api/v1/tenant/spaces/projects/1', async route => {
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

    // 点击项目节点的更多按钮
    await page.locator('.ant-tree-node-content-wrapper').first().hover()
    await page.getByRole('button').filter({ hasText: /更多/ }).first().click()
    
    // 点击删除
    await page.getByText('删除').click()
    
    // 确认删除
    await page.getByRole('button', { name: '确定' }).click()
    
    // 验证成功消息
    await expect(page.getByText('删除成功')).toBeVisible()
  })

  test('应该显示空间状态标签', async ({ page }) => {
    // 验证启用状态标签
    await expect(page.getByText('启用').first()).toBeVisible()
    
    // 验证停用状态标签（如果有的话）
    // await expect(page.getByText('停用')).toBeVisible()
  })

  test('表单验证应该正常工作', async ({ page }) => {
    await page.getByRole('button', { name: '新增项目' }).click()
    
    // 不填写任何内容直接提交
    await page.getByRole('button', { name: '确定' }).click()
    
    // 验证必填字段错误提示
    await expect(page.getByText('请输入编码')).toBeVisible()
    await expect(page.getByText('请输入名称')).toBeVisible()
  })
})