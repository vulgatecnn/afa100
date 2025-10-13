import { test, expect } from '@playwright/test';
import { testEnvironmentConfig } from '../../config/test-environment.js';

/**
 * API集成端到端测试
 * 测试前后端完整的数据流和API接口稳定性
 */

test.describe('API集成测试', () => {

  test.describe('用户管理API集成', () => {
    test.use({ 
      storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json' 
    });

    test('用户CRUD完整流程API测试', async ({ page }) => {
      // 监听所有API请求
      const apiRequests: any[] = [];
      const apiResponses: any[] = [];
      
      page.on('request', request => {
        if (request.url().includes('/api/v1/')) {
          apiRequests.push({
            method: request.method(),
            url: request.url(),
            headers: request.headers(),
            postData: request.postData()
          });
        }
      });
      
      page.on('response', response => {
        if (response.url().includes('/api/v1/')) {
          apiResponses.push({
            status: response.status(),
            url: response.url(),
            headers: response.headers()
          });
        }
      });

      // 1. 获取用户列表
      await page.goto('http://localhost:5000/users');
      await page.waitForLoadState('networkidle');
      
      // 验证用户列表API调用
      const getUsersRequest = apiRequests.find(req => 
        req.method === 'GET' && req.url.includes('/api/v1/users')
      );
      expect(getUsersRequest).toBeTruthy();
      expect(getUsersRequest.headers.authorization).toMatch(/^Bearer /);
      
      const getUsersResponse = apiResponses.find(res => 
        res.url.includes('/api/v1/users') && res.status === 200
      );
      expect(getUsersResponse).toBeTruthy();

      // 2. 创建新用户
      await page.click('[data-testid="add-user-button"]');
      await page.fill('[data-testid="user-username"]', 'api_test_user');
      await page.fill('[data-testid="user-email"]', 'apitest@test.com');
      await page.fill('[data-testid="user-password"]', 'password123');
      await page.fill('[data-testid="user-confirm-password"]', 'password123');
      await page.selectOption('[data-testid="user-role-select"]', 'merchant_employee');
      
      await page.click('[data-testid="submit-user-button"]');
      await page.waitForLoadState('networkidle');
      
      // 验证创建用户API调用
      const createUserRequest = apiRequests.find(req => 
        req.method === 'POST' && req.url.includes('/api/v1/users')
      );
      expect(createUserRequest).toBeTruthy();
      
      const createUserData = JSON.parse(createUserRequest.postData);
      expect(createUserData.username).toBe('api_test_user');
      expect(createUserData.email).toBe('apitest@test.com');
      expect(createUserData.role).toBe('merchant_employee');
      
      const createUserResponse = apiResponses.find(res => 
        res.url.includes('/api/v1/users') && res.status === 201
      );
      expect(createUserResponse).toBeTruthy();

      // 3. 编辑用户
      const userRow = page.locator('[data-testid="user-row"]').filter({ hasText: 'api_test_user' });
      await userRow.locator('[data-testid="edit-user-button"]').click();
      
      await page.fill('[data-testid="user-email"]', 'updated_apitest@test.com');
      await page.click('[data-testid="update-user-button"]');
      await page.waitForLoadState('networkidle');
      
      // 验证更新用户API调用
      const updateUserRequest = apiRequests.find(req => 
        req.method === 'PUT' && req.url.includes('/api/v1/users/')
      );
      expect(updateUserRequest).toBeTruthy();
      
      const updateUserData = JSON.parse(updateUserRequest.postData);
      expect(updateUserData.email).toBe('updated_apitest@test.com');

      // 4. 删除用户
      await userRow.locator('[data-testid="delete-user-button"]').click();
      await page.fill('[data-testid="delete-confirmation-input"]', '确认删除');
      await page.click('[data-testid="confirm-delete-button"]');
      await page.waitForLoadState('networkidle');
      
      // 验证删除用户API调用
      const deleteUserRequest = apiRequests.find(req => 
        req.method === 'DELETE' && req.url.includes('/api/v1/users/')
      );
      expect(deleteUserRequest).toBeTruthy();
      
      const deleteUserResponse = apiResponses.find(res => 
        res.url.includes('/api/v1/users/') && res.status === 200
      );
      expect(deleteUserResponse).toBeTruthy();
    });

    test('API错误处理测试', async ({ page }) => {
      const apiErrors: any[] = [];
      
      page.on('response', response => {
        if (response.url().includes('/api/v1/') && response.status() >= 400) {
          apiErrors.push({
            status: response.status(),
            url: response.url()
          });
        }
      });

      await page.goto('http://localhost:5000/users');
      
      // 尝试创建重复用户名的用户
      await page.click('[data-testid="add-user-button"]');
      await page.fill('[data-testid="user-username"]', 'tenant_admin'); // 已存在的用户名
      await page.fill('[data-testid="user-email"]', 'duplicate@test.com');
      await page.fill('[data-testid="user-password"]', 'password123');
      await page.fill('[data-testid="user-confirm-password"]', 'password123');
      
      await page.click('[data-testid="submit-user-button"]');
      
      // 验证API返回400错误
      const duplicateUserError = apiErrors.find(err => 
        err.status === 400 && err.url.includes('/api/v1/users')
      );
      expect(duplicateUserError).toBeTruthy();
      
      // 验证前端显示错误信息
      await expect(page.locator('[data-testid="username-error"]')).toContainText('用户名已存在');
    });
  });

  test.describe('商户管理API集成', () => {
    test.use({ 
      storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json' 
    });

    test('商户与空间关联API测试', async ({ page }) => {
      const apiRequests: any[] = [];
      
      page.on('request', request => {
        if (request.url().includes('/api/v1/')) {
          apiRequests.push({
            method: request.method(),
            url: request.url(),
            postData: request.postData()
          });
        }
      });

      await page.goto('http://localhost:5000/merchants');
      
      // 选择商户进行空间管理
      const merchantRow = page.locator('[data-testid="merchant-row"]').first();
      await merchantRow.locator('[data-testid="manage-spaces-button"]').click();
      
      // 验证获取商户空间API调用
      const getSpacesRequest = apiRequests.find(req => 
        req.method === 'GET' && req.url.includes('/api/v1/merchants/') && req.url.includes('/spaces')
      );
      expect(getSpacesRequest).toBeTruthy();
      
      // 添加新空间
      await page.click('[data-testid="add-space-button"]');
      await page.click('[data-testid="available-space-item"]').first();
      await page.fill('[data-testid="space-start-date"]', '2024-01-01');
      await page.fill('[data-testid="space-end-date"]', '2024-12-31');
      await page.click('[data-testid="confirm-space-allocation"]');
      
      // 验证空间分配API调用
      const allocateSpaceRequest = apiRequests.find(req => 
        req.method === 'POST' && req.url.includes('/api/v1/merchants/') && req.url.includes('/spaces')
      );
      expect(allocateSpaceRequest).toBeTruthy();
      
      const spaceData = JSON.parse(allocateSpaceRequest.postData);
      expect(spaceData.startDate).toBe('2024-01-01');
      expect(spaceData.endDate).toBe('2024-12-31');
    });

    test('商户员工管理API集成', async ({ page }) => {
      const apiRequests: any[] = [];
      
      page.on('request', request => {
        if (request.url().includes('/api/v1/')) {
          apiRequests.push({
            method: request.method(),
            url: request.url(),
            postData: request.postData()
          });
        }
      });

      await page.goto('http://localhost:5000/merchants');
      
      // 进入员工管理
      const merchantRow = page.locator('[data-testid="merchant-row"]').first();
      await merchantRow.locator('[data-testid="manage-employees-button"]').click();
      
      // 验证获取员工列表API
      const getEmployeesRequest = apiRequests.find(req => 
        req.method === 'GET' && req.url.includes('/api/v1/merchants/') && req.url.includes('/employees')
      );
      expect(getEmployeesRequest).toBeTruthy();
      
      // 添加新员工
      await page.click('[data-testid="add-employee-button"]');
      await page.fill('[data-testid="employee-name"]', 'API测试员工');
      await page.fill('[data-testid="employee-email"]', 'employee@test.com');
      await page.fill('[data-testid="employee-phone"]', '13700137001');
      await page.fill('[data-testid="employee-department"]', '技术部');
      
      await page.click('[data-testid="submit-employee-button"]');
      
      // 验证创建员工API调用
      const createEmployeeRequest = apiRequests.find(req => 
        req.method === 'POST' && req.url.includes('/api/v1/merchants/') && req.url.includes('/employees')
      );
      expect(createEmployeeRequest).toBeTruthy();
      
      const employeeData = JSON.parse(createEmployeeRequest.postData);
      expect(employeeData.name).toBe('API测试员工');
      expect(employeeData.email).toBe('employee@test.com');
    });
  });

  test.describe('访客管理API集成', () => {
    test.use({ 
      storageState: 'tests/e2e/fixtures/auth-states/merchant-admin.json' 
    });

    test('访客申请审批API流程', async ({ page }) => {
      const apiRequests: any[] = [];
      const apiResponses: any[] = [];
      
      page.on('request', request => {
        if (request.url().includes('/api/v1/')) {
          apiRequests.push({
            method: request.method(),
            url: request.url(),
            postData: request.postData()
          });
        }
      });
      
      page.on('response', response => {
        if (response.url().includes('/api/v1/')) {
          apiResponses.push({
            status: response.status(),
            url: response.url()
          });
        }
      });

      await page.goto('http://localhost:5050/visitors');
      
      // 获取待审批申请
      const getPendingRequest = apiRequests.find(req => 
        req.method === 'GET' && req.url.includes('/api/v1/visitor-applications') && req.url.includes('status=pending')
      );
      expect(getPendingRequest).toBeTruthy();
      
      // 审批申请
      const applicationRow = page.locator('[data-testid="application-row"]').first();
      await applicationRow.locator('[data-testid="approve-application-button"]').click();
      
      await page.fill('[data-testid="approval-notes"]', 'API测试审批');
      await page.click('[data-testid="confirm-approval-button"]');
      
      // 验证审批API调用
      const approveRequest = apiRequests.find(req => 
        req.method === 'PUT' && req.url.includes('/api/v1/visitor-applications/') && req.url.includes('/approve')
      );
      expect(approveRequest).toBeTruthy();
      
      const approvalData = JSON.parse(approveRequest.postData);
      expect(approvalData.notes).toBe('API测试审批');
      
      // 验证二维码生成API调用
      const qrCodeRequest = apiRequests.find(req => 
        req.method === 'POST' && req.url.includes('/api/v1/visitor-applications/') && req.url.includes('/qr-code')
      );
      expect(qrCodeRequest).toBeTruthy();
    });

    test('访客通行记录API集成', async ({ page }) => {
      // 模拟门禁系统API调用
      const response = await page.request.post(`${testEnvironmentConfig.backend.baseUrl}/api/v1/access-records`, {
        data: {
          visitorApplicationId: 1,
          accessType: 'entry',
          accessMethod: 'qr_code',
          spaceId: 1,
          securityNotes: 'API测试通行记录'
        },
        headers: {
          'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('auth_token'))}`
        }
      });
      
      expect(response.status()).toBe(201);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.accessType).toBe('entry');
      expect(responseData.data.accessMethod).toBe('qr_code');
      
      // 验证通行记录在前端显示
      await page.goto('http://localhost:5050/access-records');
      await expect(page.locator('[data-testid="access-record-row"]').filter({ hasText: 'API测试通行记录' })).toBeVisible();
    });
  });

  test.describe('实时数据同步测试', () => {
    test('WebSocket连接和实时更新', async ({ browser }) => {
      // 创建两个浏览器上下文模拟不同用户
      const context1 = await browser.newContext({
        storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json'
      });
      const context2 = await browser.newContext({
        storageState: 'tests/e2e/fixtures/auth-states/merchant-admin.json'
      });
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      // 监听WebSocket连接
      let wsConnected = false;
      page1.on('websocket', ws => {
        wsConnected = true;
        ws.on('framereceived', event => {
          console.log('WebSocket message received:', event.payload);
        });
      });
      
      // 租务管理员页面
      await page1.goto('http://localhost:5000/dashboard');
      
      // 商户管理员页面
      await page2.goto('http://localhost:5050/visitors');
      
      // 等待WebSocket连接建立
      await page1.waitForTimeout(2000);
      
      // 在商户端审批访客申请
      const applicationRow = page2.locator('[data-testid="application-row"]').first();
      if (await applicationRow.count() > 0) {
        await applicationRow.locator('[data-testid="approve-application-button"]').click();
        await page2.fill('[data-testid="approval-notes"]', '实时同步测试');
        await page2.click('[data-testid="confirm-approval-button"]');
        
        // 验证租务管理端实时收到更新
        await page1.goto('http://localhost:5000/visitor-applications');
        await expect(page1.locator('[data-testid="application-row"]').filter({ hasText: '实时同步测试' })).toBeVisible();
      }
      
      await context1.close();
      await context2.close();
    });
  });

  test.describe('API性能和稳定性测试', () => {
    test.use({ 
      storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json' 
    });

    test('API响应时间测试', async ({ page }) => {
      const apiTimes: any[] = [];
      
      page.on('response', response => {
        if (response.url().includes('/api/v1/')) {
          const timing = response.timing();
          apiTimes.push({
            url: response.url(),
            status: response.status(),
            responseTime: timing.responseEnd - timing.requestStart
          });
        }
      });

      // 测试用户列表API响应时间
      await page.goto('http://localhost:5000/users');
      await page.waitForLoadState('networkidle');
      
      const getUsersTime = apiTimes.find(t => t.url.includes('/api/v1/users'));
      expect(getUsersTime).toBeTruthy();
      expect(getUsersTime.responseTime).toBeLessThan(2000); // 2秒内响应
      
      // 测试商户列表API响应时间
      await page.goto('http://localhost:5000/merchants');
      await page.waitForLoadState('networkidle');
      
      const getMerchantsTime = apiTimes.find(t => t.url.includes('/api/v1/merchants'));
      expect(getMerchantsTime).toBeTruthy();
      expect(getMerchantsTime.responseTime).toBeLessThan(2000);
      
      // 测试访客申请API响应时间
      await page.goto('http://localhost:5000/visitor-applications');
      await page.waitForLoadState('networkidle');
      
      const getApplicationsTime = apiTimes.find(t => t.url.includes('/api/v1/visitor-applications'));
      expect(getApplicationsTime).toBeTruthy();
      expect(getApplicationsTime.responseTime).toBeLessThan(3000); // 复杂查询允许3秒
    });

    test('API并发请求测试', async ({ page }) => {
      await page.goto('http://localhost:5000/dashboard');
      
      // 并发发起多个API请求
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          page.request.get(`${testEnvironmentConfig.backend.baseUrl}/api/v1/users?page=${i + 1}`, {
            headers: {
              'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('auth_token'))}`
            }
          })
        );
      }
      
      const responses = await Promise.all(promises);
      
      // 验证所有请求都成功
      responses.forEach((response, index) => {
        expect(response.status()).toBe(200);
      });
      
      // 验证响应时间合理
      const responseTimes = responses.map(r => r.timing().responseEnd - r.timing().requestStart);
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      expect(avgResponseTime).toBeLessThan(3000);
    });

    test('API错误恢复测试', async ({ page }) => {
      await page.goto('http://localhost:5000/users');
      
      // 模拟网络错误
      await page.route('**/api/v1/users', route => {
        route.abort('failed');
      });
      
      // 尝试刷新页面
      await page.reload();
      
      // 验证错误处理
      await expect(page.locator('[data-testid="network-error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      // 恢复网络连接
      await page.unroute('**/api/v1/users');
      
      // 点击重试
      await page.click('[data-testid="retry-button"]');
      
      // 验证数据加载成功
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
    });
  });

  test.describe('跨域和安全性测试', () => {
    test('CORS配置测试', async ({ page }) => {
      // 测试跨域请求
      const response = await page.request.get(`${testEnvironmentConfig.backend.baseUrl}/api/v1/health`, {
        headers: {
          'Origin': 'http://localhost:5000'
        }
      });
      
      expect(response.status()).toBe(200);
      
      const headers = response.headers();
      expect(headers['access-control-allow-origin']).toBeTruthy();
    });

    test('API安全头测试', async ({ page }) => {
      const response = await page.request.get(`${testEnvironmentConfig.backend.baseUrl}/api/v1/health`);
      
      const headers = response.headers();
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBeTruthy();
      expect(headers['x-xss-protection']).toBeTruthy();
    });

    test('JWT令牌验证测试', async ({ page }) => {
      // 测试无令牌访问
      const noTokenResponse = await page.request.get(`${testEnvironmentConfig.backend.baseUrl}/api/v1/users`);
      expect(noTokenResponse.status()).toBe(401);
      
      // 测试无效令牌
      const invalidTokenResponse = await page.request.get(`${testEnvironmentConfig.backend.baseUrl}/api/v1/users`, {
        headers: {
          'Authorization': 'Bearer invalid_token'
        }
      });
      expect(invalidTokenResponse.status()).toBe(401);
      
      // 测试有效令牌
      await page.goto('http://localhost:5000/login');
      await page.fill('[data-testid="username"]', 'tenant_admin');
      await page.fill('[data-testid="password"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      const validToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      
      const validTokenResponse = await page.request.get(`${testEnvironmentConfig.backend.baseUrl}/api/v1/users`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });
      expect(validTokenResponse.status()).toBe(200);
    });
  });
});
