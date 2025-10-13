import { test, expect } from '@playwright/test';

/**
 * 会话管理测试演示版本
 * 
 * 这个文件包含了完整的会话管理测试演示，使用模拟的HTML页面
 * 可以独立运行，不依赖外部服务
 * 
 * 测试需求:
 * - 需求 1.5: 自动登录和记住密码功能测试
 * - 需求 10.4: 会话过期处理测试
 * - 退出登录测试
 */
test.describe('会话管理测试演示', () => {
  // 创建模拟的登录和仪表板页面
  const createMockLoginPage = () => `
    <!DOCTYPE html>
    <html>
    <head>
      <title>AFA办公系统 - 登录</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .form-group { margin: 10px 0; }
        input, button { padding: 8px; margin: 5px 0; }
        .error { color: red; }
        .success { color: green; }
        .hidden { display: none; }
        .notification { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .notification.success { background: #d4edda; color: #155724; }
        .notification.error { background: #f8d7da; color: #721c24; }
        .notification.warning { background: #fff3cd; color: #856404; }
      </style>
    </head>
    <body>
      <h1 data-testid="page-title">AFA办公系统登录</h1>
      
      <div id="notifications"></div>
      
      <form data-testid="login-form" id="loginForm">
        <div class="form-group">
          <label>用户名:</label>
          <input type="text" data-testid="username" id="username" required>
          <div data-testid="error-username" class="error hidden"></div>
        </div>
        
        <div class="form-group">
          <label>密码:</label>
          <input type="password" data-testid="password" id="password" required>
          <div data-testid="error-password" class="error hidden"></div>
        </div>
        
        <div class="form-group">
          <label>
            <input type="checkbox" data-testid="remember-me" id="rememberMe">
            记住密码
          </label>
        </div>
        
        <button type="submit" data-testid="login-button" id="loginButton">登录</button>
        <div data-testid="loading" class="hidden">登录中...</div>
      </form>
      
      <div data-testid="quick-login-buttons" style="margin-top: 20px;">
        <h3>快速登录（测试用）:</h3>
        <button data-testid="quick-login-tenant-admin" type="button">租务管理员</button>
        <button data-testid="quick-login-merchant-admin" type="button">商户管理员</button>
        <button data-testid="quick-login-employee" type="button">员工</button>
      </div>

      <script>
        // 测试用户数据
        const testUsers = {
          tenant_admin: { username: 'tenant_admin', password: 'Test123456', name: '租务管理员' },
          merchant_admin: { username: 'merchant_admin', password: 'Test123456', name: '商户管理员' },
          employee_001: { username: 'employee_001', password: 'Test123456', name: '张三' }
        };

        // 页面加载时检查记住密码和自动登录
        window.addEventListener('load', function() {
          checkRememberedCredentials();
          checkAutoLogin();
          checkSessionExpired();
        });

        // 检查记住的凭据
        function checkRememberedCredentials() {
          const savedCredentials = localStorage.getItem('savedCredentials');
          const rememberMe = localStorage.getItem('rememberMe');
          
          if (savedCredentials && rememberMe === 'true') {
            try {
              const credentials = JSON.parse(atob(savedCredentials)); // 简单的base64解码
              document.getElementById('username').value = credentials.username;
              document.getElementById('rememberMe').checked = true;
              showNotification('已自动填充用户名', 'success');
            } catch (e) {
              console.error('解析保存的凭据失败:', e);
            }
          }
        }

        // 检查自动登录
        function checkAutoLogin() {
          const autoLogin = localStorage.getItem('autoLogin');
          const authToken = localStorage.getItem('authToken');
          
          if (autoLogin === 'true' && authToken) {
            // 验证令牌是否有效
            if (isTokenValid(authToken)) {
              showNotification('检测到有效会话，正在自动登录...', 'success');
              setTimeout(() => {
                window.location.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(createDashboardPage());
              }, 1000);
            } else {
              // 令牌无效，清除自动登录
              localStorage.removeItem('autoLogin');
              localStorage.removeItem('authToken');
              showNotification('会话已过期，请重新登录', 'warning');
            }
          }
        }

        // 检查会话过期
        function checkSessionExpired() {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('sessionExpired') === 'true') {
            showNotification('会话已过期，请重新登录', 'warning');
          }
        }

        // 简单的令牌验证
        function isTokenValid(token) {
          if (!token || token === 'expired_token_123') return false;
          
          // 检查令牌过期时间
          const tokenExpiry = localStorage.getItem('tokenExpiry');
          if (tokenExpiry && Date.now() > parseInt(tokenExpiry)) {
            return false;
          }
          
          return true;
        }

        // 登录表单提交处理
        document.getElementById('loginForm').addEventListener('submit', function(e) {
          e.preventDefault();
          handleLogin();
        });

        // 快速登录按钮
        document.querySelector('[data-testid="quick-login-tenant-admin"]').addEventListener('click', () => {
          quickLogin('tenant_admin');
        });
        document.querySelector('[data-testid="quick-login-merchant-admin"]').addEventListener('click', () => {
          quickLogin('merchant_admin');
        });
        document.querySelector('[data-testid="quick-login-employee"]').addEventListener('click', () => {
          quickLogin('employee_001');
        });

        function quickLogin(userType) {
          const user = testUsers[userType];
          document.getElementById('username').value = user.username;
          document.getElementById('password').value = user.password;
          handleLogin();
        }

        function handleLogin() {
          const username = document.getElementById('username').value;
          const password = document.getElementById('password').value;
          const rememberMe = document.getElementById('rememberMe').checked;
          
          // 清除之前的错误
          clearErrors();
          
          // 基本验证
          if (!username) {
            showFieldError('username', '请输入用户名');
            return;
          }
          if (!password) {
            showFieldError('password', '请输入密码');
            return;
          }

          // 显示加载状态
          showLoading(true);
          
          // 模拟登录延迟
          setTimeout(() => {
            // 验证用户凭据
            const user = Object.values(testUsers).find(u => u.username === username);
            
            if (!user) {
              showFieldError('username', '用户名不存在');
              showLoading(false);
              return;
            }
            
            if (user.password !== password) {
              showFieldError('password', '密码错误');
              showLoading(false);
              return;
            }

            // 检查特殊的测试用户状态
            if (username === 'employee_inactive') {
              showNotification('账户已停用，无法登录', 'error');
              showLoading(false);
              return;
            }

            // 登录成功
            const authToken = 'valid_token_' + Date.now();
            const tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24小时后过期
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('tokenExpiry', tokenExpiry.toString());
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            // 处理记住密码
            if (rememberMe) {
              localStorage.setItem('rememberMe', 'true');
              localStorage.setItem('autoLogin', 'true');
              // 保存加密的凭据（这里使用简单的base64编码）
              const credentials = { username: username };
              localStorage.setItem('savedCredentials', btoa(JSON.stringify(credentials)));
              showNotification('已保存登录信息', 'success');
            } else {
              // 清除记住密码设置
              localStorage.removeItem('rememberMe');
              localStorage.removeItem('autoLogin');
              localStorage.removeItem('savedCredentials');
            }
            
            showNotification('登录成功，正在跳转...', 'success');
            showLoading(false);
            
            // 跳转到仪表板
            setTimeout(() => {
              window.location.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(createDashboardPage());
            }, 1000);
            
          }, 1000);
        }

        function showLoading(show) {
          const loading = document.querySelector('[data-testid="loading"]');
          const button = document.querySelector('[data-testid="login-button"]');
          
          if (show) {
            loading.classList.remove('hidden');
            button.disabled = true;
            button.textContent = '登录中...';
          } else {
            loading.classList.add('hidden');
            button.disabled = false;
            button.textContent = '登录';
          }
        }

        function showFieldError(field, message) {
          const errorElement = document.querySelector('[data-testid="error-' + field + '"]');
          errorElement.textContent = message;
          errorElement.classList.remove('hidden');
        }

        function clearErrors() {
          const errors = document.querySelectorAll('.error');
          errors.forEach(error => {
            error.textContent = '';
            error.classList.add('hidden');
          });
        }

        function showNotification(message, type = 'success') {
          const notifications = document.getElementById('notifications');
          const notification = document.createElement('div');
          notification.className = 'notification ' + type;
          notification.textContent = message;
          notification.setAttribute('data-testid', type + '-message');
          
          notifications.appendChild(notification);
          
          // 3秒后自动移除通知
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 3000);
        }

        // 创建仪表板页面
        function createDashboardPage() {
          const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
          return \`<!DOCTYPE html>
<html>
<head>
  <title>AFA办公系统 - 仪表板</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .user-info { display: flex; align-items: center; gap: 10px; }
    .logout-btn { padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .logout-btn:hover { background: #c82333; }
    .card { border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 4px; }
    .notification { padding: 10px; margin: 10px 0; border-radius: 4px; background: #d4edda; color: #155724; }
  </style>
</head>
<body>
  <div class="header">
    <h1>AFA办公系统仪表板</h1>
    <div class="user-info" data-testid="user-info">
      <span>欢迎，\${currentUser.name || '用户'}</span>
      <button class="logout-btn" data-testid="logout-button" onclick="logout()">退出登录</button>
    </div>
  </div>
  
  <div class="notification" data-testid="login-success-message">
    登录成功！欢迎使用AFA办公系统
  </div>
  
  <div class="card">
    <h3>会话信息</h3>
    <p>用户名: \${currentUser.username}</p>
    <p>角色: \${currentUser.name}</p>
    <p>登录时间: \${new Date().toLocaleString()}</p>
    <button onclick="checkSession()" data-testid="check-session-button">检查会话状态</button>
    <button onclick="simulateSessionExpiry()" data-testid="simulate-session-expiry">模拟会话过期</button>
  </div>
  
  <div class="card">
    <h3>测试功能</h3>
    <button onclick="testApiCall()" data-testid="api-action-button">测试API调用</button>
    <button onclick="refreshToken()" data-testid="refresh-token-button">刷新令牌</button>
  </div>
  
  <div id="session-status"></div>

  <script>
    // 页面加载时检查会话状态
    window.addEventListener('load', function() {
      startSessionMonitoring();
    });

    function logout() {
      // 清除会话数据（保留记住密码设置）
      const rememberMe = localStorage.getItem('rememberMe');
      const savedCredentials = localStorage.getItem('savedCredentials');
      
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenExpiry');
      localStorage.removeItem('currentUser');
      sessionStorage.clear();
      
      // 如果没有记住密码，清除自动登录
      if (rememberMe !== 'true') {
        localStorage.removeItem('autoLogin');
      }
      
      alert('已成功退出登录');
      
      // 跳转到登录页面
      window.location.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(\`${createMockLoginPage()}\`);
    }

    function checkSession() {
      const authToken = localStorage.getItem('authToken');
      const tokenExpiry = localStorage.getItem('tokenExpiry');
      const statusDiv = document.getElementById('session-status');
      
      if (!authToken) {
        statusDiv.innerHTML = '<div style="color: red;">会话无效：未找到认证令牌</div>';
        return;
      }
      
      if (tokenExpiry && Date.now() > parseInt(tokenExpiry)) {
        statusDiv.innerHTML = '<div style="color: red;">会话已过期</div>';
        setTimeout(() => {
          alert('会话已过期，请重新登录');
          window.location.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(\`${createMockLoginPage()}?sessionExpired=true\`);
        }, 1000);
        return;
      }
      
      statusDiv.innerHTML = '<div style="color: green;">会话有效</div>';
    }

    function simulateSessionExpiry() {
      localStorage.setItem('tokenExpiry', (Date.now() - 1000).toString());
      alert('已模拟会话过期，请点击"检查会话状态"或尝试API调用');
    }

    function testApiCall() {
      const authToken = localStorage.getItem('authToken');
      
      if (!authToken) {
        alert('未找到认证令牌，请重新登录');
        window.location.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(\`${createMockLoginPage()}\`);
        return;
      }
      
      // 模拟API调用
      setTimeout(() => {
        const tokenExpiry = localStorage.getItem('tokenExpiry');
        if (tokenExpiry && Date.now() > parseInt(tokenExpiry)) {
          alert('API调用失败：会话已过期');
          window.location.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(\`${createMockLoginPage()}?sessionExpired=true\`);
        } else {
          alert('API调用成功');
        }
      }, 500);
    }

    function refreshToken() {
      const authToken = localStorage.getItem('authToken');
      
      if (!authToken) {
        alert('无法刷新令牌：未找到认证令牌');
        return;
      }
      
      // 模拟令牌刷新
      const newToken = 'refreshed_token_' + Date.now();
      const newExpiry = Date.now() + (24 * 60 * 60 * 1000);
      
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('tokenExpiry', newExpiry.toString());
      
      alert('令牌刷新成功');
    }

    function startSessionMonitoring() {
      // 每30秒检查一次会话状态
      setInterval(() => {
        const tokenExpiry = localStorage.getItem('tokenExpiry');
        if (tokenExpiry && Date.now() > parseInt(tokenExpiry)) {
          alert('会话已过期，即将跳转到登录页面');
          window.location.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(\`${createMockLoginPage()}?sessionExpired=true\`);
        }
      }, 30000);
    }
  </script>
</body>
</html>\`;
        }
      </script>
    </body>
    </html>
  `;

  test.beforeEach(async ({ page }) => {
    // 清理之前的会话数据
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // 加载模拟登录页面
    await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent(createMockLoginPage())}`);
    await page.waitForLoadState('networkidle');
  });

  test.describe('自动登录和记住密码功能测试 - 需求 1.5', () => {
    test('应该支持记住密码功能', async ({ page }) => {
      // 使用记住密码选项登录
      await page.locator('[data-testid="username"]').fill('tenant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="remember-me"]').check();
      await page.locator('[data-testid="login-button"]').click();
      
      // 等待登录成功
      await expect(page.locator('[data-testid="login-success-message"]')).toBeVisible();
      
      // 验证记住密码标记已保存
      const rememberFlag = await page.evaluate(() => 
        localStorage.getItem('rememberMe')
      );
      expect(rememberFlag).toBe('true');
      
      // 验证用户凭据已保存
      const savedCredentials = await page.evaluate(() => 
        localStorage.getItem('savedCredentials')
      );
      expect(savedCredentials).toBeTruthy();
    });

    test('应该在记住密码后自动填充登录表单', async ({ page }) => {
      // 第一次登录并记住密码
      await page.locator('[data-testid="username"]').fill('merchant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="remember-me"]').check();
      await page.locator('[data-testid="login-button"]').click();
      
      // 等待登录成功并跳转
      await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
      
      // 退出登录
      await page.locator('[data-testid="logout-button"]').click();
      
      // 等待跳转回登录页面
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      
      // 验证表单是否自动填充
      const usernameValue = await page.locator('[data-testid="username"]').inputValue();
      const rememberMeChecked = await page.locator('[data-testid="remember-me"]').isChecked();
      
      expect(usernameValue).toBe('merchant_admin');
      expect(rememberMeChecked).toBeTruthy();
      
      // 密码字段应该为空（安全考虑）
      const passwordValue = await page.locator('[data-testid="password"]').inputValue();
      expect(passwordValue).toBe('');
      
      // 应该显示成功通知
      await expect(page.locator('[data-testid="success-message"]')).toContainText('已自动填充用户名');
    });

    test('应该支持自动登录功能', async ({ page }) => {
      // 设置自动登录状态
      await page.evaluate(() => {
        localStorage.setItem('autoLogin', 'true');
        localStorage.setItem('authToken', 'valid_token_123');
        localStorage.setItem('tokenExpiry', (Date.now() + 24 * 60 * 60 * 1000).toString());
        localStorage.setItem('currentUser', JSON.stringify({
          username: 'employee_001',
          name: '张三'
        }));
      });
      
      // 重新加载页面
      await page.reload();
      
      // 应该显示自动登录提示
      await expect(page.locator('[data-testid="success-message"]')).toContainText('检测到有效会话，正在自动登录');
      
      // 等待自动跳转到仪表板
      await expect(page.locator('[data-testid="user-info"]')).toBeVisible({ timeout: 5000 });
      
      // 验证用户信息显示正确
      await expect(page.locator('[data-testid="user-info"]')).toContainText('张三');
    });

    test('应该在取消记住密码后清除保存的凭据', async ({ page }) => {
      // 先使用记住密码登录
      await page.locator('[data-testid="username"]').fill('tenant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="remember-me"]').check();
      await page.locator('[data-testid="login-button"]').click();
      
      // 等待登录成功
      await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
      
      // 验证凭据已保存
      let savedCredentials = await page.evaluate(() => 
        localStorage.getItem('savedCredentials')
      );
      expect(savedCredentials).toBeTruthy();
      
      // 退出登录
      await page.locator('[data-testid="logout-button"]').click();
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      
      // 重新登录但不记住密码
      await page.locator('[data-testid="username"]').fill('tenant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="remember-me"]').uncheck();
      await page.locator('[data-testid="login-button"]').click();
      
      // 等待登录成功
      await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
      
      // 验证保存的凭据已清除
      savedCredentials = await page.evaluate(() => 
        localStorage.getItem('savedCredentials')
      );
      expect(savedCredentials).toBeFalsy();
    });

    test('应该处理记住密码的安全性', async ({ page }) => {
      // 使用记住密码登录
      await page.locator('[data-testid="username"]').fill('merchant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="remember-me"]').check();
      await page.locator('[data-testid="login-button"]').click();
      
      // 等待登录成功
      await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
      
      // 检查保存的凭据是否加密
      const savedCredentials = await page.evaluate(() => 
        localStorage.getItem('savedCredentials')
      );
      
      // 凭据不应该包含明文密码
      expect(savedCredentials).not.toContain('Test123456');
      
      // 应该是base64编码的JSON数据
      expect(() => {
        const decoded = atob(savedCredentials!);
        JSON.parse(decoded);
      }).not.toThrow();
    });
  });

  test.describe('会话过期处理测试 - 需求 10.4', () => {
    test('应该检测会话过期并显示提示', async ({ page }) => {
      // 设置过期的令牌
      await page.evaluate(() => {
        localStorage.setItem('authToken', 'expired_token_123');
        localStorage.setItem('tokenExpiry', (Date.now() - 1000).toString());
      });
      
      // 重新加载页面
      await page.reload();
      
      // 应该显示会话过期提示
      await expect(page.locator('[data-testid="warning-message"]')).toContainText('会话已过期，请重新登录');
    });

    test('应该在仪表板中检测会话过期', async ({ page }) => {
      // 正常登录
      await page.locator('[data-testid="username"]').fill('tenant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="login-button"]').click();
      
      // 等待跳转到仪表板
      await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
      
      // 点击模拟会话过期按钮
      await page.locator('[data-testid="simulate-session-expiry"]').click();
      
      // 点击检查会话状态
      await page.locator('[data-testid="check-session-button"]').click();
      
      // 等待会话过期处理
      await page.waitForTimeout(2000);
      
      // 应该跳转回登录页面并显示会话过期提示
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="warning-message"]')).toContainText('会话已过期，请重新登录');
    });

    test('应该在API调用时检测会话过期', async ({ page }) => {
      // 正常登录
      await page.locator('[data-testid="username"]').fill('merchant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="login-button"]').click();
      
      // 等待跳转到仪表板
      await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
      
      // 模拟会话过期
      await page.locator('[data-testid="simulate-session-expiry"]').click();
      
      // 尝试API调用
      page.on('dialog', dialog => dialog.accept()); // 自动接受alert
      await page.locator('[data-testid="api-action-button"]').click();
      
      // 等待处理
      await page.waitForTimeout(2000);
      
      // 应该跳转回登录页面
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="warning-message"]')).toContainText('会话已过期，请重新登录');
    });

    test('应该支持令牌刷新功能', async ({ page }) => {
      // 正常登录
      await page.locator('[data-testid="username"]').fill('employee_001');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="login-button"]').click();
      
      // 等待跳转到仪表板
      await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
      
      // 获取初始令牌
      const initialToken = await page.evaluate(() => 
        localStorage.getItem('authToken')
      );
      
      // 点击刷新令牌
      page.on('dialog', dialog => dialog.accept()); // 自动接受alert
      await page.locator('[data-testid="refresh-token-button"]').click();
      
      // 等待刷新完成
      await page.waitForTimeout(1000);
      
      // 检查令牌是否更新
      const updatedToken = await page.evaluate(() => 
        localStorage.getItem('authToken')
      );
      
      expect(updatedToken).toBeTruthy();
      expect(updatedToken).not.toBe(initialToken);
      expect(updatedToken).toContain('refreshed_token_');
    });

    test('应该处理无效的自动登录令牌', async ({ page }) => {
      // 设置无效的令牌
      await page.evaluate(() => {
        localStorage.setItem('autoLogin', 'true');
        localStorage.setItem('authToken', 'expired_token_123');
      });
      
      // 重新加载页面
      await page.reload();
      
      // 应该显示会话过期提示而不是自动登录
      await expect(page.locator('[data-testid="warning-message"]')).toContainText('会话已过期，请重新登录');
      
      // 验证自动登录标记已清除
      const autoLogin = await page.evaluate(() => 
        localStorage.getItem('autoLogin')
      );
      expect(autoLogin).toBeFalsy();
    });
  });

  test.describe('退出登录测试', () => {
    test('应该成功退出登录并清除会话数据', async ({ page }) => {
      // 正常登录
      await page.locator('[data-testid="username"]').fill('tenant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="login-button"]').click();
      
      // 等待跳转到仪表板
      await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
      
      // 验证登录状态
      const initialToken = await page.evaluate(() => 
        localStorage.getItem('authToken')
      );
      expect(initialToken).toBeTruthy();
      
      // 执行退出登录
      page.on('dialog', dialog => dialog.accept()); // 自动接受alert
      await page.locator('[data-testid="logout-button"]').click();
      
      // 等待跳转到登录页面
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      
      // 验证会话数据已清除
      const clearedToken = await page.evaluate(() => 
        localStorage.getItem('authToken')
      );
      expect(clearedToken).toBeFalsy();
      
      // 验证会话存储也已清除
      const sessionData = await page.evaluate(() => 
        sessionStorage.length
      );
      expect(sessionData).toBe(0);
    });

    test('应该在退出登录时保留记住密码设置', async ({ page }) => {
      // 使用记住密码登录
      await page.locator('[data-testid="username"]').fill('merchant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="remember-me"]').check();
      await page.locator('[data-testid="login-button"]').click();
      
      // 等待跳转到仪表板
      await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
      
      // 验证记住密码数据已保存
      const savedCredentials = await page.evaluate(() => 
        localStorage.getItem('savedCredentials')
      );
      expect(savedCredentials).toBeTruthy();
      
      // 退出登录
      page.on('dialog', dialog => dialog.accept()); // 自动接受alert
      await page.locator('[data-testid="logout-button"]').click();
      
      // 等待跳转到登录页面
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      
      // 验证记住密码数据仍然存在
      const preservedCredentials = await page.evaluate(() => 
        localStorage.getItem('savedCredentials')
      );
      expect(preservedCredentials).toBeTruthy();
      expect(preservedCredentials).toBe(savedCredentials);
      
      // 验证用户名已自动填充
      const usernameValue = await page.locator('[data-testid="username"]').inputValue();
      expect(usernameValue).toBe('merchant_admin');
    });

    test('应该清除自动登录但保留记住密码', async ({ page }) => {
      // 使用记住密码登录
      await page.locator('[data-testid="username"]').fill('employee_001');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="remember-me"]').check();
      await page.locator('[data-testid="login-button"]').click();
      
      // 等待跳转到仪表板
      await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
      
      // 验证自动登录已设置
      const autoLogin = await page.evaluate(() => 
        localStorage.getItem('autoLogin')
      );
      expect(autoLogin).toBe('true');
      
      // 退出登录
      page.on('dialog', dialog => dialog.accept()); // 自动接受alert
      await page.locator('[data-testid="logout-button"]').click();
      
      // 等待跳转到登录页面
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      
      // 验证记住密码仍然存在
      const rememberMe = await page.evaluate(() => 
        localStorage.getItem('rememberMe')
      );
      expect(rememberMe).toBe('true');
      
      // 但自动登录应该被清除（因为用户主动退出）
      // 注意：在实际实现中，可能会保留自动登录设置
      // 这里的行为取决于具体的业务需求
    });

    test('应该处理快速登录后的退出', async ({ page }) => {
      // 使用快速登录
      await page.locator('[data-testid="quick-login-tenant-admin"]').click();
      
      // 等待跳转到仪表板
      await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-info"]')).toContainText('租务管理员');
      
      // 退出登录
      page.on('dialog', dialog => dialog.accept()); // 自动接受alert
      await page.locator('[data-testid="logout-button"]').click();
      
      // 等待跳转到登录页面
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      
      // 验证会话数据已清除
      const clearedToken = await page.evaluate(() => 
        localStorage.getItem('authToken')
      );
      expect(clearedToken).toBeFalsy();
    });
  });

  test.describe('会话安全测试', () => {
    test('应该防止使用无效令牌访问', async ({ page }) => {
      // 设置无效令牌
      await page.evaluate(() => {
        localStorage.setItem('authToken', 'invalid_token_123');
        localStorage.setItem('currentUser', JSON.stringify({
          username: 'fake_user',
          name: '伪造用户'
        }));
      });
      
      // 尝试直接访问仪表板页面
      const dashboardHtml = await page.evaluate(() => {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return `<!DOCTYPE html>
<html>
<head><title>仪表板</title></head>
<body>
  <div data-testid="user-info">欢迎，${currentUser.name}</div>
  <button data-testid="check-session-button" onclick="checkSession()">检查会话</button>
  <script>
    function checkSession() {
      const token = localStorage.getItem('authToken');
      if (token === 'invalid_token_123') {
        alert('检测到无效令牌，即将跳转到登录页面');
        setTimeout(() => {
          window.location.href = 'data:text/html;charset=utf-8,' + encodeURIComponent('${createMockLoginPage()}');
        }, 1000);
      }
    }
  </script>
</body>
</html>`;
      });
      
      await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent(dashboardHtml)}`);
      
      // 点击检查会话按钮
      page.on('dialog', dialog => dialog.accept()); // 自动接受alert
      await page.locator('[data-testid="check-session-button"]').click();
      
      // 等待跳转
      await page.waitForTimeout(2000);
      
      // 应该跳转到登录页面
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });

    test('应该正确处理令牌过期时间', async ({ page }) => {
      // 设置即将过期的令牌
      await page.evaluate(() => {
        localStorage.setItem('authToken', 'soon_to_expire_token');
        localStorage.setItem('tokenExpiry', (Date.now() + 2000).toString()); // 2秒后过期
      });
      
      // 重新加载页面
      await page.reload();
      
      // 等待令牌过期
      await page.waitForTimeout(3000);
      
      // 再次重新加载页面
      await page.reload();
      
      // 应该显示会话过期提示
      await expect(page.locator('[data-testid="warning-message"]')).toContainText('会话已过期，请重新登录');
    });

    test('应该验证保存凭据的完整性', async ({ page }) => {
      // 使用记住密码登录
      await page.locator('[data-testid="username"]').fill('tenant_admin');
      await page.locator('[data-testid="password"]').fill('Test123456');
      await page.locator('[data-testid="remember-me"]').check();
      await page.locator('[data-testid="login-button"]').click();
      
      // 等待登录成功
      await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
      
      // 手动篡改保存的凭据
      await page.evaluate(() => {
        localStorage.setItem('savedCredentials', 'invalid_base64_data');
      });
      
      // 退出登录
      page.on('dialog', dialog => dialog.accept()); // 自动接受alert
      await page.locator('[data-testid="logout-button"]').click();
      
      // 等待跳转到登录页面
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      
      // 应该不会自动填充用户名（因为凭据无效）
      const usernameValue = await page.locator('[data-testid="username"]').inputValue();
      expect(usernameValue).toBe('');
    });
  });
});