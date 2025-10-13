import { test, expect } from '@playwright/test';

/**
 * 完整系统集成E2E测试
 * 验证前端、后端、数据库的完整集成
 */

test.describe('AFA办公小程序完整系统集成测试', () => {
  
  test.beforeEach(async ({ page }) => {
    // 设置测试环境
    await page.goto('/');
  });

  test('系统服务可用性检查', async ({ page, request }) => {
    // 检查后端API服务
    const apiResponse = await request.get('http://localhost:5100/api/v1/health');
    expect(apiResponse.ok()).toBeTruthy();
    
    // 检查租务管理端
    await page.goto('http://localhost:5000');
    await expect(page).toHaveTitle(/租务管理/);
    
    // 检查商户管理端  
    await page.goto('http://localhost:5050');
    await expect(page).toHaveTitle(/商户管理/);
  });

  test('租务管理员完整业务流程', async ({ page }) => {
    // 1. 访问租务管理端
    await page.goto('http://localhost:5000');
    
    // 2. 登录系统
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // 验证登录成功
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // 3. 创建商户
    await page.click('[data-testid="merchants-menu"]');
    await page.click('[data-testid="add-merchant-button"]');
    
    await page.fill('[data-testid="merchant-name"]', '测试商户公司');
    await page.fill('[data-testid="merchant-contact"]', '张三');
    await page.fill('[data-testid="merchant-phone"]', '13800138000');
    await page.click('[data-testid="save-merchant-button"]');
    
    // 验证商户创建成功
    await expect(page.locator('text=测试商户公司')).toBeVisible();
    
    // 4. 分配空间
    await page.click('[data-testid="assign-space-button"]');
    await page.selectOption('[data-testid="space-select"]', '1001');
    await page.click('[data-testid="confirm-assign-button"]');
    
    // 验证空间分配成功
    await expect(page.locator('text=空间分配成功')).toBeVisible();
  });

  test('商户管理员完整业务流程', async ({ page }) => {
    // 1. 访问商户管理端
    await page.goto('http://localhost:5050');
    
    // 2. 登录系统
    await page.fill('[data-testid="username"]', 'merchant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // 验证登录成功
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // 3. 添加员工
    await page.click('[data-testid="employees-menu"]');
    await page.click('[data-testid="add-employee-button"]');
    
    await page.fill('[data-testid="employee-name"]', '李四');
    await page.fill('[data-testid="employee-phone"]', '13900139000');
    await page.fill('[data-testid="employee-email"]', 'lisi@test.com');
    await page.selectOption('[data-testid="employee-role"]', 'employee');
    await page.click('[data-testid="save-employee-button"]');
    
    // 验证员工添加成功
    await expect(page.locator('text=李四')).toBeVisible();
    
    // 4. 审批访客
    await page.click('[data-testid="visitors-menu"]');
    await page.click('[data-testid="pending-visitors-tab"]');
    
    // 假设有待审批的访客
    const firstVisitor = page.locator('[data-testid="visitor-item"]').first();
    await firstVisitor.locator('[data-testid="approve-button"]').click();
    
    await page.fill('[data-testid="approval-note"]', '审批通过');
    await page.click('[data-testid="confirm-approval-button"]');
    
    // 验证审批成功
    await expect(page.locator('text=审批成功')).toBeVisible();
  });

  test('前后端数据同步验证', async ({ page, context }) => {
    // 创建两个页面模拟多用户操作
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // 用户1登录租务管理端
    await page1.goto('http://localhost:5000');
    await page1.fill('[data-testid="username"]', 'tenant_admin');
    await page1.fill('[data-testid="password"]', 'password123');
    await page1.click('[data-testid="login-button"]');
    
    // 用户2登录商户管理端
    await page2.goto('http://localhost:5050');
    await page2.fill('[data-testid="username"]', 'merchant_admin');
    await page2.fill('[data-testid="password"]', 'password123');
    await page2.click('[data-testid="login-button"]');
    
    // 用户1创建商户
    await page1.click('[data-testid="merchants-menu"]');
    await page1.click('[data-testid="add-merchant-button"]');
    await page1.fill('[data-testid="merchant-name"]', '同步测试商户');
    await page1.click('[data-testid="save-merchant-button"]');
    
    // 用户2刷新页面验证数据同步
    await page2.reload();
    await page2.click('[data-testid="merchants-menu"]');
    
    // 验证新商户在用户2的界面中可见
    await expect(page2.locator('text=同步测试商户')).toBeVisible();
  });

  test('API接口集成测试', async ({ request }) => {
    // 测试认证接口
    const loginResponse = await request.post('http://localhost:5100/api/v1/auth/login', {
      data: {
        username: 'tenant_admin',
        password: 'password123'
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    expect(loginData.success).toBeTruthy();
    expect(loginData.data.token).toBeDefined();
    
    const token = loginData.data.token;
    
    // 测试商户管理接口
    const merchantsResponse = await request.get('http://localhost:5100/api/v1/merchants', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    expect(merchantsResponse.ok()).toBeTruthy();
    const merchantsData = await merchantsResponse.json();
    expect(merchantsData.success).toBeTruthy();
    expect(Array.isArray(merchantsData.data)).toBeTruthy();
    
    // 测试创建商户接口
    const createMerchantResponse = await request.post('http://localhost:5100/api/v1/merchants', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'API测试商户',
        contactPerson: '王五',
        contactPhone: '13700137000',
        email: 'wangwu@test.com'
      }
    });
    
    expect(createMerchantResponse.ok()).toBeTruthy();
    const createData = await createMerchantResponse.json();
    expect(createData.success).toBeTruthy();
    expect(createData.data.id).toBeDefined();
  });

  test('文件上传集成测试', async ({ page, request }) => {
    // 登录系统
    await page.goto('http://localhost:5000');
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // 进入用户设置页面
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="profile-settings"]');
    
    // 上传头像文件
    const fileInput = page.locator('[data-testid="avatar-upload"]');
    await fileInput.setInputFiles({
      name: 'test-avatar.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data')
    });
    
    // 验证上传成功
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    
    // 验证文件在后端存储
    const avatarImg = page.locator('[data-testid="user-avatar"]');
    const avatarSrc = await avatarImg.getAttribute('src');
    expect(avatarSrc).toContain('/uploads/');
    
    // 验证文件可以访问
    const fileResponse = await request.get(`http://localhost:5100${avatarSrc}`);
    expect(fileResponse.ok()).toBeTruthy();
  });

  test('系统性能基准测试', async ({ page }) => {
    // 测试页面加载时间
    const startTime = Date.now();
    await page.goto('http://localhost:5000');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(2000); // 页面加载应在2秒内
    
    // 测试登录响应时间
    const loginStartTime = Date.now();
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    const loginTime = Date.now() - loginStartTime;
    
    expect(loginTime).toBeLessThan(3000); // 登录应在3秒内完成
  });

  test('错误处理和恢复测试', async ({ page }) => {
    // 测试网络错误处理
    await page.goto('http://localhost:5000');
    
    // 模拟网络中断
    await page.route('**/api/v1/**', route => {
      route.abort('failed');
    });
    
    await page.fill('[data-testid="username"]', 'tenant_admin');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // 验证错误提示显示
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=网络连接失败')).toBeVisible();
    
    // 恢复网络连接
    await page.unroute('**/api/v1/**');
    
    // 重试登录
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('权限控制验证测试', async ({ page }) => {
    // 使用普通员工账号登录
    await page.goto('http://localhost:5050');
    await page.fill('[data-testid="username"]', 'employee_user');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // 验证员工无法访问管理员功能
    await expect(page.locator('[data-testid="admin-menu"]')).not.toBeVisible();
    
    // 尝试直接访问管理员页面
    await page.goto('http://localhost:5050/admin/settings');
    
    // 验证被重定向或显示权限错误
    await expect(page.locator('text=权限不足')).toBeVisible();
  });

});