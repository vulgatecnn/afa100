import { test, expect } from '@playwright/test'

test.describe('租务管理系统登录', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('应该显示登录页面', async ({ page }) => {
    await expect(page).toHaveTitle(/AFA租务管理系统/)
    await expect(page.getByText('AFA租务管理系统')).toBeVisible()
    await expect(page.getByPlaceholder('邮箱地址')).toBeVisible()
    await expect(page.getByPlaceholder('密码')).toBeVisible()
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible()
  })

  test('应该验证必填字段', async ({ page }) => {
    await page.getByRole('button', { name: '登录' }).click()
    
    await expect(page.getByText('请输入邮箱地址')).toBeVisible()
    await expect(page.getByText('请输入密码')).toBeVisible()
  })

  test('应该验证邮箱格式', async ({ page }) => {
    await page.getByPlaceholder('邮箱地址').fill('invalid-email')
    await page.getByPlaceholder('密码').fill('123456')
    await page.getByRole('button', { name: '登录' }).click()
    
    await expect(page.getByText('请输入有效的邮箱地址')).toBeVisible()
  })

  test('应该验证密码长度', async ({ page }) => {
    await page.getByPlaceholder('邮箱地址').fill('test@example.com')
    await page.getByPlaceholder('密码').fill('123')
    await page.getByRole('button', { name: '登录' }).click()
    
    await expect(page.getByText('密码至少6位字符')).toBeVisible()
  })

  test('登录失败应该显示错误信息', async ({ page }) => {
    // Mock API 响应
    await page.route('/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: '邮箱或密码错误'
        })
      })
    })

    await page.getByPlaceholder('邮箱地址').fill('test@example.com')
    await page.getByPlaceholder('密码').fill('wrongpassword')
    await page.getByRole('button', { name: '登录' }).click()
    
    await expect(page.getByText('邮箱或密码错误')).toBeVisible()
  })

  test('登录成功应该跳转到主页', async ({ page }) => {
    // Mock 成功的登录响应
    await page.route('/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            token: 'mock-jwt-token',
            user: {
              id: 1,
              name: '管理员',
              email: 'admin@example.com',
              userType: 'tenant_admin'
            }
          }
        })
      })
    })

    // Mock 获取用户信息的响应
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

    await page.getByPlaceholder('邮箱地址').fill('admin@example.com')
    await page.getByPlaceholder('密码').fill('password123')
    await page.getByRole('button', { name: '登录' }).click()
    
    // 等待跳转到主页
    await expect(page).toHaveURL('/merchants')
    await expect(page.getByText('商户管理')).toBeVisible()
  })
})