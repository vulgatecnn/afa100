import { test, expect } from '@playwright/test';

/**
 * 多角色登录测试演示
 * 
 * 这是一个演示性的测试文件，展示了多角色登录测试的结构和实现方式
 * 使用模拟的登录页面和仪表板页面来验证测试逻辑
 * 
 * 测试需求:
 * - 需求 1.1: 用户认证流程自动化测试
 * - 需求 1.4: 员工管理功能自动化测试
 * - 需求 1.5: 设备管理功能自动化测试
 * 
 * 测试内容:
 * - 测试租务管理员登录和权限验证
 * - 测试商户管理员登录和权限验证
 * - 测试商户员工登录和权限验证
 */
test.describe('多角色登录测试演示', () => {
  
  test.beforeEach(async ({ page }) => {
    // 创建一个模拟的登录页面用于测试
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <title>AFA办公系统 - 多角色登录</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .login-form { max-width: 400px; margin: 0 auto; }
          .form-group { margin: 15px 0; }
          .form-input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
          .form-input.error { border-color: #ff4d4f; }
          .login-button { width: 100%; padding: 12px; background: #1890ff; color: white; border: none; border-radius: 4px; cursor: pointer; }
          .login-button:disabled { opacity: 0.6; cursor: not-allowed; }
          .error-message { color: #ff4d4f; font-size: 14px; margin-top: 5px; display: none; }
          .error-message.show { display: block; }
          .success-message { color: #52c41a; font-size: 14px; margin-top: 10px; display: none; }
          .success-message.show { display: block; }
          .loading { display: none; }
          .loading.show { display: inline-block; }
          .dashboard { display: none; padding: 20px; border: 1px solid #ddd; margin-top: 20px; }
          .dashboard.show { display: block; }
          .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .user-profile { display: flex; align-items: center; gap: 10px; }
          .logout-btn { padding: 5px 10px; background: #ff4d4f; color: white; border: none; border-radius: 4px; cursor: pointer; }
          .stats-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
          .stat-card { padding: 15px; border: 1px solid #ddd; border-radius: 4px; text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; color: #1890ff; }
          .navigation-menu { margin: 20px 0; }
          .menu-item { display: inline-block; margin: 5px; padding: 8px 15px; background: #f0f0f0; border-radius: 4px; cursor: pointer; }
          .menu-item:hover { background: #e0e0e0; }
          .quick-actions { margin: 20px 0; }
          .action-button { margin: 5px; padding: 8px 15px; background: #52c41a; color: white; border: none; border-radius: 4px; cursor: pointer; }
          .hidden { display: none; }
        </style>
      </head>
      <body>
        <div class="login-container">
          <h1 data-testid="page-title">AFA办公系统多角色登录</h1>
          
          <form data-testid="login-form" class="login-form">
            <div class="form-group">
              <label>用户名:</label>
              <input type="text" data-testid="username" class="form-input" placeholder="请输入用户名">
              <div data-testid="error-username" class="error-message">请输入用户名</div>
            </div>
            
            <div class="form-group">
              <label>密码:</label>
              <input type="password" data-testid="password" class="form-input" placeholder="请输入密码">
              <div data-testid="error-password" class="error-message">请输入密码</div>
            </div>
            
            <div class="form-group">
              <label>
                <input type="checkbox" data-testid="remember-me"> 记住登录状态
              </label>
            </div>
            
            <button type="submit" data-testid="login-button" class="login-button">
              <span class="loading" data-testid="loading">登录中...</span>
              <span class="button-text">登录</span>
            </button>
            
            <div data-testid="success-message" class="success-message">登录成功！</div>
            <div data-testid="error-message" class="error-message">登录失败</div>
          </form>
          
          <!-- 快速登录按钮 -->
          <div data-testid="quick-login-buttons" style="margin-top: 20px;">
            <h3>快速登录</h3>
            <button data-testid="quick-login-tenant-admin" type="button" style="margin: 5px;">租务管理员</button>
            <button data-testid="quick-login-merchant-admin" type="button" style="margin: 5px;">商户管理员</button>
            <button data-testid="quick-login-employee" type="button" style="margin: 5px;">商户员工</button>
          </div>
        </div>
        
        <!-- 租务管理端仪表板 -->
        <div data-testid="tenant-dashboard" class="dashboard">
          <div data-testid="page-header" class="dashboard-header">
            <h2>租务管理端</h2>
            <div data-testid="user-profile" class="user-profile">
              <span data-testid="user-name">租务管理员</span>
              <button data-testid="logout-button" class="logout-btn">退出</button>
            </div>
          </div>
          
          <div data-testid="navigation-menu" class="navigation-menu">
            <div data-testid="merchant-management-menu" class="menu-item">商户管理</div>
            <div data-testid="device-management-menu" class="menu-item">设备管理</div>
            <div data-testid="access-records-menu" class="menu-item">通行记录</div>
            <div data-testid="system-settings-menu" class="menu-item">系统设置</div>
            <div data-testid="reports-menu" class="menu-item">报表统计</div>
          </div>
          
          <div class="stats-cards">
            <div data-testid="total-merchants-card" class="stat-card">
              <div>总商户数</div>
              <div data-testid="card-value" class="stat-value">25</div>
            </div>
            <div data-testid="active-merchants-card" class="stat-card">
              <div>活跃商户</div>
              <div data-testid="card-value" class="stat-value">23</div>
            </div>
            <div data-testid="total-devices-card" class="stat-card">
              <div>设备总数</div>
              <div data-testid="card-value" class="stat-value">48</div>
            </div>
            <div data-testid="online-devices-card" class="stat-card">
              <div>在线设备</div>
              <div data-testid="card-value" class="stat-value">45</div>
            </div>
            <div data-testid="today-access-card" class="stat-card">
              <div>今日通行</div>
              <div data-testid="card-value" class="stat-value">1,234</div>
            </div>
            <div data-testid="monthly-access-card" class="stat-card">
              <div>本月通行</div>
              <div data-testid="card-value" class="stat-value">35,678</div>
            </div>
          </div>
          
          <div class="quick-actions">
            <button data-testid="add-merchant-button" class="action-button">添加商户</button>
            <button data-testid="add-device-button" class="action-button">添加设备</button>
            <button data-testid="view-reports-button" class="action-button">查看报表</button>
            <button data-testid="system-settings-button" class="action-button">系统设置</button>
          </div>
        </div>
        
        <!-- 商户管理端仪表板 -->
        <div data-testid="merchant-dashboard" class="dashboard">
          <div data-testid="page-header" class="dashboard-header">
            <h2>商户管理端</h2>
            <div data-testid="user-profile" class="user-profile">
              <span data-testid="user-name">商户管理员</span>
              <button data-testid="logout-button" class="logout-btn">退出</button>
            </div>
          </div>
          
          <div data-testid="navigation-menu" class="navigation-menu">
            <div data-testid="employee-management-menu" class="menu-item">员工管理</div>
            <div data-testid="visitor-management-menu" class="menu-item">访客管理</div>
            <div data-testid="access-records-menu" class="menu-item">通行记录</div>
            <div data-testid="permission-settings-menu" class="menu-item">权限设置</div>
          </div>
          
          <div class="stats-cards">
            <div data-testid="total-employees-card" class="stat-card">
              <div>员工总数</div>
              <div data-testid="card-value" class="stat-value">15</div>
            </div>
            <div data-testid="active-employees-card" class="stat-card">
              <div>活跃员工</div>
              <div data-testid="card-value" class="stat-value">14</div>
            </div>
            <div data-testid="pending-visitors-card" class="stat-card">
              <div>待审批访客</div>
              <div data-testid="card-value" class="stat-value">3</div>
            </div>
            <div data-testid="approved-visitors-card" class="stat-card">
              <div>已批准访客</div>
              <div data-testid="card-value" class="stat-value">8</div>
            </div>
            <div data-testid="today-access-card" class="stat-card">
              <div>今日通行</div>
              <div data-testid="card-value" class="stat-value">156</div>
            </div>
            <div data-testid="monthly-access-card" class="stat-card">
              <div>本月通行</div>
              <div data-testid="card-value" class="stat-value">4,567</div>
            </div>
          </div>
          
          <div class="quick-actions">
            <button data-testid="add-employee-button" class="action-button">添加员工</button>
            <button data-testid="approve-visitors-button" class="action-button">审批访客</button>
            <button data-testid="view-access-records-button" class="action-button">查看通行记录</button>
            <button data-testid="manage-permissions-button" class="action-button">管理权限</button>
          </div>
          
          <div data-testid="pending-approvals-table" style="margin-top: 20px;">
            <h3>待审批访客</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f0f0f0;">
                  <th style="padding: 8px; border: 1px solid #ddd;">访客姓名</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">访问目的</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">预约时间</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">张三</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">商务洽谈</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">2024-01-15 14:00</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">
                    <button data-testid="quick-approve-button" style="margin: 2px; padding: 4px 8px; background: #52c41a; color: white; border: none; border-radius: 2px;">批准</button>
                    <button data-testid="quick-reject-button" style="margin: 2px; padding: 4px 8px; background: #ff4d4f; color: white; border: none; border-radius: 2px;">拒绝</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div data-testid="pending-approvals-alert" style="margin-top: 10px; padding: 10px; background: #fff7e6; border: 1px solid #ffd591; border-radius: 4px;">
            <strong>提醒:</strong> 您有 3 个访客申请待审批
          </div>
        </div>
        
        <!-- 员工仪表板 -->
        <div data-testid="employee-dashboard" class="dashboard">
          <div data-testid="page-header" class="dashboard-header">
            <h2>员工工作台</h2>
            <div data-testid="user-profile" class="user-profile">
              <span data-testid="user-name">商户员工</span>
              <button data-testid="logout-button" class="logout-btn">退出</button>
            </div>
          </div>
          
          <div data-testid="navigation-menu" class="navigation-menu">
            <div data-testid="visitor-management-menu" class="menu-item">访客管理</div>
            <div data-testid="access-records-menu" class="menu-item">通行记录</div>
          </div>
          
          <div class="stats-cards">
            <div data-testid="my-visitors-card" class="stat-card">
              <div>我的访客</div>
              <div data-testid="card-value" class="stat-value">5</div>
            </div>
            <div data-testid="pending-approvals-card" class="stat-card">
              <div>待我审批</div>
              <div data-testid="card-value" class="stat-value">2</div>
            </div>
            <div data-testid="today-access-card" class="stat-card">
              <div>今日通行</div>
              <div data-testid="card-value" class="stat-value">8</div>
            </div>
          </div>
          
          <div class="quick-actions">
            <button data-testid="invite-visitor-button" class="action-button">邀请访客</button>
            <button data-testid="approve-visitors-button" class="action-button">审批访客</button>
            <button data-testid="view-access-records-button" class="action-button">查看记录</button>
          </div>
        </div>
        
        <script>
          // 模拟用户数据
          const testUsers = {
            'tenant_admin': { 
              password: 'Test123456', 
              role: '租务管理员',
              dashboard: 'tenant-dashboard',
              permissions: ['all']
            },
            'merchant_admin': { 
              password: 'Test123456', 
              role: '商户管理员',
              dashboard: 'merchant-dashboard',
              permissions: ['merchant_management', 'employee_management', 'visitor_management']
            },
            'employee_001': { 
              password: 'Test123456', 
              role: '商户员工',
              dashboard: 'employee-dashboard',
              permissions: ['visitor_approval', 'access_records_view']
            },
            'inactive_user': { 
              password: 'Test123456', 
              role: '已停用用户', 
              status: 'inactive' 
            }
          };
          
          let currentUser = null;
          
          const form = document.querySelector('[data-testid="login-form"]');
          const usernameInput = document.querySelector('[data-testid="username"]');
          const passwordInput = document.querySelector('[data-testid="password"]');
          const loginButton = document.querySelector('[data-testid="login-button"]');
          const rememberMeCheckbox = document.querySelector('[data-testid="remember-me"]');
          const errorMessage = document.querySelector('[data-testid="error-message"]');
          const successMessage = document.querySelector('[data-testid="success-message"]');
          const loading = document.querySelector('[data-testid="loading"]');
          const loginContainer = document.querySelector('.login-container');
          
          // 快速登录功能
          document.querySelector('[data-testid="quick-login-tenant-admin"]').onclick = () => {
            usernameInput.value = 'tenant_admin';
            passwordInput.value = 'Test123456';
          };
          
          document.querySelector('[data-testid="quick-login-merchant-admin"]').onclick = () => {
            usernameInput.value = 'merchant_admin';
            passwordInput.value = 'Test123456';
          };
          
          document.querySelector('[data-testid="quick-login-employee"]').onclick = () => {
            usernameInput.value = 'employee_001';
            passwordInput.value = 'Test123456';
          };
          
          // 表单验证
          function validateForm() {
            let isValid = true;
            
            // 清除之前的错误
            document.querySelectorAll('.error-message').forEach(el => el.classList.remove('show'));
            document.querySelectorAll('.form-input').forEach(el => el.classList.remove('error'));
            
            // 验证用户名
            if (!usernameInput.value.trim()) {
              showError('username', '请输入用户名');
              isValid = false;
            } else if (usernameInput.value.length < 3) {
              showError('username', '用户名长度至少3位');
              isValid = false;
            }
            
            // 验证密码
            if (!passwordInput.value.trim()) {
              showError('password', '请输入密码');
              isValid = false;
            } else if (passwordInput.value.length < 6) {
              showError('password', '密码长度至少6位');
              isValid = false;
            }
            
            return isValid;
          }
          
          function showError(field, message) {
            const input = document.querySelector(\`[data-testid="\${field}"]\`);
            const errorElement = document.querySelector(\`[data-testid="error-\${field}"]\`);
            
            input.classList.add('error');
            errorElement.textContent = message;
            errorElement.classList.add('show');
          }
          
          // 显示仪表板
          function showDashboard(dashboardType) {
            // 隐藏登录表单
            loginContainer.style.display = 'none';
            
            // 隐藏所有仪表板
            document.querySelectorAll('.dashboard').forEach(d => d.classList.remove('show'));
            
            // 显示对应的仪表板
            const dashboard = document.querySelector(\`[data-testid="\${dashboardType}"]\`);
            if (dashboard) {
              dashboard.classList.add('show');
              
              // 设置URL hash
              window.location.hash = \`#\${dashboardType}\`;
            }
          }
          
          // 退出登录
          function logout() {
            currentUser = null;
            
            // 隐藏所有仪表板
            document.querySelectorAll('.dashboard').forEach(d => d.classList.remove('show'));
            
            // 显示登录表单
            loginContainer.style.display = 'block';
            
            // 清除表单
            usernameInput.value = '';
            passwordInput.value = '';
            rememberMeCheckbox.checked = false;
            
            // 清除消息
            errorMessage.classList.remove('show');
            successMessage.classList.remove('show');
            
            // 清除URL hash
            window.location.hash = '#login';
          }
          
          // 绑定退出登录事件
          document.querySelectorAll('[data-testid="logout-button"]').forEach(btn => {
            btn.onclick = logout;
          });
          
          // 模拟登录处理
          async function performLogin(username, password) {
            // 显示加载状态
            loginButton.disabled = true;
            loading.classList.add('show');
            
            // 模拟网络延迟
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 验证用户
            const user = testUsers[username];
            if (!user) {
              throw new Error('用户名不存在');
            }
            
            if (user.status === 'inactive') {
              throw new Error('账户已停用');
            }
            
            if (user.password !== password) {
              throw new Error('密码错误');
            }
            
            // 登录成功
            currentUser = { ...user, username };
            return { success: true, user: currentUser };
          }
          
          // 表单提交处理
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 隐藏之前的消息
            errorMessage.classList.remove('show');
            successMessage.classList.remove('show');
            
            if (!validateForm()) {
              return;
            }
            
            try {
              const result = await performLogin(usernameInput.value, passwordInput.value);
              
              // 显示成功消息
              successMessage.textContent = \`登录成功！欢迎 \${result.user.role}\`;
              successMessage.classList.add('show');
              
              // 保存记住密码状态
              if (rememberMeCheckbox.checked) {
                try {
                  localStorage.setItem('rememberMe', 'true');
                  localStorage.setItem('authToken', 'mock_token_' + Date.now());
                } catch (e) {
                  console.log('localStorage not available');
                }
              }
              
              // 跳转到对应的仪表板
              setTimeout(() => {
                showDashboard(result.user.dashboard);
              }, 1500);
              
            } catch (error) {
              errorMessage.textContent = error.message;
              errorMessage.classList.add('show');
            } finally {
              loginButton.disabled = false;
              loading.classList.remove('show');
            }
          });
          
          // 输入时清除错误状态
          usernameInput.addEventListener('input', () => {
            if (usernameInput.classList.contains('error')) {
              usernameInput.classList.remove('error');
              document.querySelector('[data-testid="error-username"]').classList.remove('show');
            }
          });
          
          passwordInput.addEventListener('input', () => {
            if (passwordInput.classList.contains('error')) {
              passwordInput.classList.remove('error');
              document.querySelector('[data-testid="error-password"]').classList.remove('show');
            }
          });
          
          // 菜单点击事件
          document.querySelectorAll('.menu-item').forEach(item => {
            item.onclick = () => {
              const menuType = item.getAttribute('data-testid');
              console.log('Navigating to:', menuType);
              // 这里可以添加页面跳转逻辑
            };
          });
          
          // 快速操作按钮事件
          document.querySelectorAll('.action-button').forEach(btn => {
            btn.onclick = () => {
              const actionType = btn.getAttribute('data-testid');
              console.log('Performing action:', actionType);
              // 这里可以添加具体的操作逻辑
            };
          });
          
          // 访客审批按钮事件
          document.querySelectorAll('[data-testid="quick-approve-button"]').forEach(btn => {
            btn.onclick = () => {
              alert('访客申请已批准');
              btn.textContent = '已批准';
              btn.disabled = true;
              btn.style.background = '#52c41a';
            };
          });
          
          document.querySelectorAll('[data-testid="quick-reject-button"]').forEach(btn => {
            btn.onclick = () => {
              const reason = prompt('请输入拒绝原因:');
              if (reason) {
                alert('访客申请已拒绝');
                btn.textContent = '已拒绝';
                btn.disabled = true;
                btn.style.background = '#ff4d4f';
              }
            };
          });
          
          // 模拟API调用
          window.mockAPI = {
            checkSession: () => {
              try {
                return !!localStorage.getItem('authToken');
              } catch (e) {
                return !!currentUser;
              }
            },
            getUserInfo: () => {
              return currentUser ? {
                success: true,
                data: {
                  username: currentUser.username,
                  role: currentUser.role === '租务管理员' ? 'tenant_admin' : 
                      currentUser.role === '商户管理员' ? 'merchant_admin' : 
                      currentUser.role === '商户员工' ? 'merchant_employee' : currentUser.role,
                  permissions: currentUser.permissions || []
                }
              } : { success: false, message: 'Not authenticated' };
            }
          };
        </script>
      </body>
      </html>
    `);
  });

  test.describe('租务管理员登录和权限验证', () => {
    test('应该成功登录租务管理员并验证权限', async ({ page }) => {
      // 验证页面加载
      await expect(page.locator('[data-testid="page-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      
      // 执行登录
      await page.locator('[data-testid="username"]').fill('tenant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="login-button"]').click();
      
      // 验证登录成功
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('租务管理员');
      
      // 验证跳转到租务管理端仪表板
      await expect(page.locator('[data-testid="tenant-dashboard"]')).toBeVisible();
      
      // 验证租务管理员特有权限
      await expect(page.locator('[data-testid="merchant-management-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="device-management-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="system-settings-menu"]')).toBeVisible();
      
      // 验证统计卡片显示
      await expect(page.locator('[data-testid="total-merchants-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-merchants-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-devices-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="online-devices-card"]')).toBeVisible();
      
      // 验证快速操作按钮
      await expect(page.locator('[data-testid="add-merchant-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="add-device-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="system-settings-button"]')).toBeVisible();
      
      // 验证用户信息显示正确
      await expect(page.locator('[data-testid="tenant-dashboard"] [data-testid="user-name"]')).toContainText('租务管理员');
    });

    test('应该能够查看租务管理员统计数据', async ({ page }) => {
      // 登录
      await page.locator('[data-testid="username"]').fill('tenant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page.locator('[data-testid="tenant-dashboard"]')).toBeVisible();
      
      // 验证统计数据显示
      const totalMerchants = await page.locator('[data-testid="total-merchants-card"] [data-testid="card-value"]').textContent();
      const activeMerchants = await page.locator('[data-testid="active-merchants-card"] [data-testid="card-value"]').textContent();
      const totalDevices = await page.locator('[data-testid="total-devices-card"] [data-testid="card-value"]').textContent();
      const onlineDevices = await page.locator('[data-testid="online-devices-card"] [data-testid="card-value"]').textContent();
      
      expect(parseInt(totalMerchants)).toBeGreaterThan(0);
      expect(parseInt(activeMerchants)).toBeGreaterThan(0);
      expect(parseInt(totalDevices)).toBeGreaterThan(0);
      expect(parseInt(onlineDevices)).toBeGreaterThan(0);
    });

    test('应该能够执行租务管理员快速操作', async ({ page }) => {
      // 登录
      await page.locator('[data-testid="username"]').fill('tenant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page.locator('[data-testid="tenant-dashboard"]')).toBeVisible();
      
      // 测试快速操作按钮可点击
      await expect(page.locator('[data-testid="add-merchant-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="add-device-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="view-reports-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="system-settings-button"]')).toBeVisible();
      
      // 点击添加商户按钮
      await page.locator('[data-testid="add-merchant-button"]').click();
      
      // 点击添加设备按钮
      await page.locator('[data-testid="add-device-button"]').click();
    });
  });

  test.describe('商户管理员登录和权限验证', () => {
    test('应该成功登录商户管理员并验证权限', async ({ page }) => {
      // 执行登录
      await page.locator('[data-testid="username"]').fill('merchant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="login-button"]').click();
      
      // 验证登录成功
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('商户管理员');
      
      // 验证跳转到商户管理端仪表板
      await expect(page.locator('[data-testid="merchant-dashboard"]')).toBeVisible();
      
      // 验证商户管理员特有权限
      await expect(page.locator('[data-testid="merchant-dashboard"] [data-testid="employee-management-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="merchant-dashboard"] [data-testid="visitor-management-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="merchant-dashboard"] [data-testid="permission-settings-menu"]')).toBeVisible();
      
      // 验证统计卡片显示
      await expect(page.locator('[data-testid="total-employees-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-employees-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="pending-visitors-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="approved-visitors-card"]')).toBeVisible();
      
      // 验证快速操作按钮
      await expect(page.locator('[data-testid="add-employee-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="approve-visitors-button"]')).toBeVisible();
      
      // 验证用户信息显示正确
      await expect(page.locator('[data-testid="merchant-dashboard"] [data-testid="user-name"]')).toContainText('商户管理员');
    });

    test('应该能够查看商户管理员统计数据', async ({ page }) => {
      // 登录
      await page.locator('[data-testid="username"]').fill('merchant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page.locator('[data-testid="merchant-dashboard"]')).toBeVisible();
      
      // 验证统计数据显示
      const totalEmployees = await page.locator('[data-testid="total-employees-card"] [data-testid="card-value"]').textContent();
      const activeEmployees = await page.locator('[data-testid="active-employees-card"] [data-testid="card-value"]').textContent();
      const pendingVisitors = await page.locator('[data-testid="pending-visitors-card"] [data-testid="card-value"]').textContent();
      const approvedVisitors = await page.locator('[data-testid="approved-visitors-card"] [data-testid="card-value"]').textContent();
      
      expect(parseInt(totalEmployees)).toBeGreaterThan(0);
      expect(parseInt(activeEmployees)).toBeGreaterThan(0);
      expect(parseInt(pendingVisitors)).toBeGreaterThanOrEqual(0);
      expect(parseInt(approvedVisitors)).toBeGreaterThanOrEqual(0);
    });

    test('应该能够处理访客审批功能', async ({ page }) => {
      // 登录
      await page.locator('[data-testid="username"]').fill('merchant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page.locator('[data-testid="merchant-dashboard"]')).toBeVisible();
      
      // 验证待审批表格显示
      await expect(page.locator('[data-testid="pending-approvals-table"]')).toBeVisible();
      
      // 验证待审批提醒
      await expect(page.locator('[data-testid="pending-approvals-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="pending-approvals-alert"]')).toContainText('3 个访客申请待审批');
      
      // 测试快速审批功能
      await page.locator('[data-testid="quick-approve-button"]').first().click();
      
      // 验证审批成功
      await expect(page.locator('[data-testid="quick-approve-button"]').first()).toContainText('已批准');
    });

    test('应该能够执行商户管理员快速操作', async ({ page }) => {
      // 登录
      await page.locator('[data-testid="username"]').fill('merchant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page.locator('[data-testid="merchant-dashboard"]')).toBeVisible();
      
      // 测试快速操作按钮
      await expect(page.locator('[data-testid="merchant-dashboard"] [data-testid="add-employee-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="merchant-dashboard"] [data-testid="approve-visitors-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="merchant-dashboard"] [data-testid="view-access-records-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="merchant-dashboard"] [data-testid="manage-permissions-button"]')).toBeVisible();
      
      // 点击添加员工按钮
      await page.locator('[data-testid="add-employee-button"]').click();
      
      // 点击审批访客按钮
      await page.locator('[data-testid="approve-visitors-button"]').click();
    });
  });

  test.describe('商户员工登录和权限验证', () => {
    test('应该成功登录商户员工并验证基础权限', async ({ page }) => {
      // 执行登录
      await page.locator('[data-testid="username"]').fill('employee_001');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="login-button"]').click();
      
      // 验证登录成功
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('商户员工');
      
      // 验证跳转到员工仪表板
      await expect(page.locator('[data-testid="employee-dashboard"]')).toBeVisible();
      
      // 验证用户信息显示正确
      await expect(page.locator('[data-testid="employee-dashboard"] [data-testid="user-name"]')).toContainText('商户员工');
    });

    test('应该验证商户员工的有限权限', async ({ page }) => {
      // 登录
      await page.locator('[data-testid="username"]').fill('employee_001');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page.locator('[data-testid="employee-dashboard"]')).toBeVisible();
      
      // 验证员工只能看到有限的功能
      await expect(page.locator('[data-testid="employee-dashboard"] [data-testid="visitor-management-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="employee-dashboard"] [data-testid="access-records-menu"]')).toBeVisible();
      
      // 验证员工没有员工管理权限（不应该出现在员工仪表板中）
      await expect(page.locator('[data-testid="employee-dashboard"] [data-testid="employee-management-menu"]')).not.toBeVisible();
      
      // 验证员工统计卡片
      await expect(page.locator('[data-testid="my-visitors-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="pending-approvals-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="today-access-card"]')).toBeVisible();
    });

    test('应该能够访问员工允许的功能', async ({ page }) => {
      // 登录
      await page.locator('[data-testid="username"]').fill('employee_001');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page.locator('[data-testid="employee-dashboard"]')).toBeVisible();
      
      // 验证员工可以使用的快速操作
      await expect(page.locator('[data-testid="employee-dashboard"] [data-testid="invite-visitor-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="employee-dashboard"] [data-testid="approve-visitors-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="employee-dashboard"] [data-testid="view-access-records-button"]')).toBeVisible();
      
      // 点击邀请访客按钮
      await page.locator('[data-testid="invite-visitor-button"]').click();
      
      // 点击审批访客按钮
      await page.locator('[data-testid="approve-visitors-button"]').click();
    });

    test('应该验证已停用员工无法登录', async ({ page }) => {
      // 尝试登录已停用的员工账户
      await page.locator('[data-testid="username"]').fill('inactive_user');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="login-button"]').click();
      
      // 应该显示账户已停用的错误信息
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('账户已停用');
      
      // 验证仍在登录页面
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });
  });

  test.describe('角色权限边界测试', () => {
    test('应该验证会话权限一致性', async ({ page }) => {
      // 登录商户管理员
      await page.locator('[data-testid="username"]').fill('merchant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page.locator('[data-testid="merchant-dashboard"]')).toBeVisible();
      
      // 验证用户信息API返回正确的角色
      const userInfo = await page.evaluate(() => window.mockAPI.getUserInfo());
      expect(userInfo.success).toBeTruthy();
      expect(userInfo.data.role).toBe('merchant_admin');
      expect(userInfo.data.permissions).toContain('merchant_management');
    });

    test('应该验证会话状态检查', async ({ page }) => {
      // 登录前检查会话状态
      let sessionValid = await page.evaluate(() => window.mockAPI.checkSession());
      expect(sessionValid).toBeFalsy();
      
      // 登录
      await page.locator('[data-testid="username"]').fill('tenant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="remember-me"]').check();
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page.locator('[data-testid="tenant-dashboard"]')).toBeVisible();
      
      // 登录后检查会话状态
      sessionValid = await page.evaluate(() => window.mockAPI.checkSession());
      expect(sessionValid).toBeTruthy();
    });
  });

  test.describe('角色切换和会话管理', () => {
    test('应该支持不同角色间的登录切换', async ({ page }) => {
      // 先登录租务管理员
      await page.locator('[data-testid="username"]').fill('tenant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page.locator('[data-testid="tenant-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-name"]')).toContainText('租务管理员');
      
      // 退出登录
      await page.locator('[data-testid="tenant-dashboard"] [data-testid="logout-button"]').click();
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      
      // 登录商户管理员
      await page.locator('[data-testid="username"]').fill('merchant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page.locator('[data-testid="merchant-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-name"]')).toContainText('商户管理员');
    });

    test('应该清除前一个用户的会话数据', async ({ page }) => {
      // 登录第一个用户
      await page.locator('[data-testid="username"]').fill('tenant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="remember-me"]').check();
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page.locator('[data-testid="tenant-dashboard"]')).toBeVisible();
      
      // 检查第一个用户的信息
      let userInfo = await page.evaluate(() => window.mockAPI.getUserInfo());
      expect(userInfo.data.username).toBe('tenant_admin');
      
      // 退出并登录第二个用户
      await page.locator('[data-testid="tenant-dashboard"] [data-testid="logout-button"]').click();
      
      await page.locator('[data-testid="username"]').fill('merchant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page.locator('[data-testid="merchant-dashboard"]')).toBeVisible();
      
      // 检查用户信息已更换
      userInfo = await page.evaluate(() => window.mockAPI.getUserInfo());
      expect(userInfo.data.username).toBe('merchant_admin');
      expect(userInfo.data.role).toBe('merchant_admin');
    });
  });

  test.describe('快速登录功能测试', () => {
    test('应该支持租务管理员快速登录', async ({ page }) => {
      // 检查快速登录按钮是否可用
      await expect(page.locator('[data-testid="quick-login-buttons"]')).toBeVisible();
      
      // 点击快速登录按钮
      await page.locator('[data-testid="quick-login-tenant-admin"]').click();
      
      // 验证表单自动填充
      await expect(page.locator('[data-testid="username"]')).toHaveValue('tenant_admin');
      await expect(page.locator('[data-testid="password"]')).toHaveValue('Test123456');
      
      // 执行登录
      await page.locator('[data-testid="login-button"]').click();
      
      // 验证跳转到正确的仪表板
      await expect(page.locator('[data-testid="tenant-dashboard"]')).toBeVisible();
    });

    test('应该支持商户管理员快速登录', async ({ page }) => {
      // 点击快速登录按钮
      await page.locator('[data-testid="quick-login-merchant-admin"]').click();
      
      // 验证表单自动填充
      await expect(page.locator('[data-testid="username"]')).toHaveValue('merchant_admin');
      await expect(page.locator('[data-testid="password"]')).toHaveValue('Test123456');
      
      // 执行登录
      await page.locator('[data-testid="login-button"]').click();
      
      // 验证跳转到正确的仪表板
      await expect(page.locator('[data-testid="merchant-dashboard"]')).toBeVisible();
    });

    test('应该支持员工快速登录', async ({ page }) => {
      // 点击快速登录按钮
      await page.locator('[data-testid="quick-login-employee"]').click();
      
      // 验证表单自动填充
      await expect(page.locator('[data-testid="username"]')).toHaveValue('employee_001');
      await expect(page.locator('[data-testid="password"]')).toHaveValue('Test123456');
      
      // 执行登录
      await page.locator('[data-testid="login-button"]').click();
      
      // 验证跳转到正确的页面
      await expect(page.locator('[data-testid="employee-dashboard"]')).toBeVisible();
    });
  });

  test.describe('权限验证和功能访问', () => {
    test('应该验证不同角色的功能权限', async ({ page }) => {
      // 测试租务管理员权限
      await page.locator('[data-testid="quick-login-tenant-admin"]').click();
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page.locator('[data-testid="tenant-dashboard"]')).toBeVisible();
      
      // 租务管理员应该有所有管理功能
      await expect(page.locator('[data-testid="merchant-management-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="device-management-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="system-settings-menu"]')).toBeVisible();
      
      // 退出并测试商户管理员权限
      await page.locator('[data-testid="tenant-dashboard"] [data-testid="logout-button"]').click();
      
      await page.locator('[data-testid="quick-login-merchant-admin"]').click();
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page.locator('[data-testid="merchant-dashboard"]')).toBeVisible();
      
      // 商户管理员应该有员工和访客管理功能
      await expect(page.locator('[data-testid="employee-management-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="visitor-management-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="permission-settings-menu"]')).toBeVisible();
      
      // 退出并测试员工权限
      await page.locator('[data-testid="merchant-dashboard"] [data-testid="logout-button"]').click();
      
      await page.locator('[data-testid="quick-login-employee"]').click();
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page.locator('[data-testid="employee-dashboard"]')).toBeVisible();
      
      // 员工应该只有有限的功能
      await expect(page.locator('[data-testid="visitor-management-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="access-records-menu"]')).toBeVisible();
      
      // 员工不应该有员工管理权限
      await expect(page.locator('[data-testid="employee-management-menu"]')).not.toBeVisible();
    });

    test('应该验证统计数据的角色差异', async ({ page }) => {
      // 租务管理员统计数据
      await page.locator('[data-testid="quick-login-tenant-admin"]').click();
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page.locator('[data-testid="tenant-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-merchants-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-devices-card"]')).toBeVisible();
      
      // 退出并检查商户管理员统计数据
      await page.locator('[data-testid="tenant-dashboard"] [data-testid="logout-button"]').click();
      
      await page.locator('[data-testid="quick-login-merchant-admin"]').click();
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page.locator('[data-testid="merchant-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-employees-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="pending-visitors-card"]')).toBeVisible();
      
      // 退出并检查员工统计数据
      await page.locator('[data-testid="merchant-dashboard"] [data-testid="logout-button"]').click();
      
      await page.locator('[data-testid="quick-login-employee"]').click();
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page.locator('[data-testid="employee-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="my-visitors-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="pending-approvals-card"]')).toBeVisible();
    });
  });
});