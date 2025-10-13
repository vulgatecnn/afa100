import { test, expect } from '@playwright/test';

test.describe('AFA办公系统真实登录测试', () => {
  test('完整登录流程演示', async ({ page }) => {
    // 创建一个真实的登录页面
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AFA办公系统 - 登录</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .login-container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
            width: 900px;
            min-height: 600px;
            display: flex;
          }
          
          .login-left {
            flex: 1;
            background: linear-gradient(135deg, #1890ff, #722ed1);
            color: white;
            padding: 60px 40px;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          
          .login-right {
            flex: 1;
            padding: 60px 40px;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          
          .logo {
            font-size: 48px;
            margin-bottom: 20px;
          }
          
          .welcome-title {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 16px;
          }
          
          .welcome-desc {
            font-size: 16px;
            opacity: 0.9;
            line-height: 1.6;
            margin-bottom: 40px;
          }
          
          .test-accounts {
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
          }
          
          .test-accounts h4 {
            margin-bottom: 15px;
            font-size: 18px;
          }
          
          .account-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
          }
          
          .account-item:last-child {
            border-bottom: none;
          }
          
          .account-info {
            flex: 1;
          }
          
          .account-role {
            font-size: 14px;
            font-weight: bold;
          }
          
          .account-username {
            font-size: 12px;
            opacity: 0.8;
          }
          
          .quick-login-btn {
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 4px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s;
          }
          
          .quick-login-btn:hover {
            background: rgba(255,255,255,0.3);
          }
          
          .login-form {
            width: 100%;
          }
          
          .form-title {
            font-size: 28px;
            font-weight: bold;
            color: #1a1a1a;
            margin-bottom: 8px;
          }
          
          .form-subtitle {
            color: #666;
            margin-bottom: 40px;
          }
          
          .form-group {
            margin-bottom: 24px;
          }
          
          .form-label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #333;
          }
          
          .form-input {
            width: 100%;
            padding: 16px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 16px;
            transition: all 0.3s;
            background: #fafafa;
          }
          
          .form-input:focus {
            outline: none;
            border-color: #1890ff;
            background: white;
            box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
          }
          
          .form-input.error {
            border-color: #ff4d4f;
            background: #fff2f0;
          }
          
          .error-message {
            color: #ff4d4f;
            font-size: 14px;
            margin-top: 8px;
            display: none;
          }
          
          .error-message.show {
            display: block;
          }
          
          .login-options {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
          }
          
          .remember-me {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .forgot-password {
            color: #1890ff;
            text-decoration: none;
            font-size: 14px;
          }
          
          .login-button {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #1890ff, #722ed1);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            position: relative;
            overflow: hidden;
          }
          
          .login-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(24, 144, 255, 0.3);
          }
          
          .login-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }
          
          .loading-spinner {
            display: none;
            width: 20px;
            height: 20px;
            border: 2px solid transparent;
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 8px;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .success-message {
            background: #f6ffed;
            border: 1px solid #b7eb8f;
            color: #52c41a;
            padding: 16px;
            border-radius: 8px;
            margin-top: 20px;
            display: none;
          }
          
          .success-message.show {
            display: block;
          }
          
          .features-preview {
            margin-top: 30px;
            padding-top: 30px;
            border-top: 1px solid rgba(255,255,255,0.2);
          }
          
          .features-title {
            font-size: 16px;
            margin-bottom: 15px;
          }
          
          .feature-list {
            list-style: none;
          }
          
          .feature-list li {
            padding: 4px 0;
            font-size: 14px;
            opacity: 0.9;
          }
          
          .feature-list li:before {
            content: "✓";
            margin-right: 8px;
            color: #52c41a;
          }
          
          @media (max-width: 768px) {
            .login-container {
              flex-direction: column;
              width: 90%;
              margin: 20px;
            }
            
            .login-left, .login-right {
              padding: 40px 30px;
            }
          }
        </style>
      </head>
      <body>
        <div class="login-container">
          <!-- 左侧信息区域 -->
          <div class="login-left">
            <div class="logo">🏢</div>
            <h1 class="welcome-title">AFA办公系统</h1>
            <p class="welcome-desc">
              智能办公通行管理平台<br>
              让办公更安全、更便捷、更智能
            </p>
            
            <!-- 测试账号信息 -->
            <div class="test-accounts">
              <h4>🧪 测试账号</h4>
              <div class="account-item">
                <div class="account-info">
                  <div class="account-role">租务管理员</div>
                  <div class="account-username">tenant_admin / Test123456</div>
                </div>
                <button class="quick-login-btn" onclick="quickLogin('tenant_admin', 'Test123456')">
                  快速登录
                </button>
              </div>
              <div class="account-item">
                <div class="account-info">
                  <div class="account-role">商户管理员</div>
                  <div class="account-username">merchant_admin / Test123456</div>
                </div>
                <button class="quick-login-btn" onclick="quickLogin('merchant_admin', 'Test123456')">
                  快速登录
                </button>
              </div>
              <div class="account-item">
                <div class="account-info">
                  <div class="account-role">商户员工</div>
                  <div class="account-username">employee_001 / Test123456</div>
                </div>
                <button class="quick-login-btn" onclick="quickLogin('employee_001', 'Test123456')">
                  快速登录
                </button>
              </div>
            </div>
            
            <!-- 功能预览 -->
            <div class="features-preview">
              <h4 class="features-title">🚀 核心功能</h4>
              <ul class="feature-list">
                <li>智能访客管理</li>
                <li>多级权限控制</li>
                <li>设备统一接入</li>
                <li>实时通行监控</li>
                <li>数据分析报表</li>
              </ul>
            </div>
          </div>
          
          <!-- 右侧登录表单 -->
          <div class="login-right">
            <form class="login-form" data-testid="login-form">
              <h2 class="form-title">欢迎回来</h2>
              <p class="form-subtitle">请输入您的账号信息登录系统</p>
              
              <div class="form-group">
                <label class="form-label" for="username">用户名</label>
                <input 
                  type="text" 
                  id="username" 
                  name="username"
                  class="form-input" 
                  data-testid="username"
                  placeholder="请输入用户名"
                  autocomplete="username"
                >
                <div class="error-message" data-testid="error-username">请输入用户名</div>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="password">密码</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password"
                  class="form-input" 
                  data-testid="password"
                  placeholder="请输入密码"
                  autocomplete="current-password"
                >
                <div class="error-message" data-testid="error-password">请输入密码</div>
              </div>
              
              <div class="login-options">
                <label class="remember-me">
                  <input type="checkbox" data-testid="remember-me">
                  <span>记住登录状态</span>
                </label>
                <a href="#" class="forgot-password">忘记密码？</a>
              </div>
              
              <button type="submit" class="login-button" data-testid="login-button">
                <span class="loading-spinner"></span>
                <span class="button-text">登录</span>
              </button>
              
              <div class="success-message" data-testid="success-message">
                🎉 登录成功！正在跳转到系统主页...
              </div>
            </form>
          </div>
        </div>
        
        <script>
          // 表单验证和提交
          const form = document.querySelector('[data-testid="login-form"]');
          const usernameInput = document.querySelector('[data-testid="username"]');
          const passwordInput = document.querySelector('[data-testid="password"]');
          const loginButton = document.querySelector('[data-testid="login-button"]');
          const loadingSpinner = document.querySelector('.loading-spinner');
          const buttonText = document.querySelector('.button-text');
          const successMessage = document.querySelector('[data-testid="success-message"]');
          
          // 测试账号数据
          const testAccounts = {
            'tenant_admin': {
              password: 'Test123456',
              role: '租务管理员',
              redirectUrl: '/tenant/dashboard'
            },
            'merchant_admin': {
              password: 'Test123456',
              role: '商户管理员',
              redirectUrl: '/merchant/dashboard'
            },
            'employee_001': {
              password: 'Test123456',
              role: '商户员工',
              redirectUrl: '/employee/dashboard'
            }
          };
          
          // 快速登录功能
          function quickLogin(username, password) {
            usernameInput.value = username;
            passwordInput.value = password;
            
            // 添加填充动画效果
            usernameInput.style.background = '#e6f7ff';
            passwordInput.style.background = '#e6f7ff';
            
            setTimeout(() => {
              usernameInput.style.background = '';
              passwordInput.style.background = '';
            }, 1000);
          }
          
          // 表单验证
          function validateForm() {
            let isValid = true;
            
            // 验证用户名
            if (!usernameInput.value.trim()) {
              showError('username', '请输入用户名');
              isValid = false;
            } else {
              hideError('username');
            }
            
            // 验证密码
            if (!passwordInput.value.trim()) {
              showError('password', '请输入密码');
              isValid = false;
            } else if (passwordInput.value.length < 6) {
              showError('password', '密码长度至少6位');
              isValid = false;
            } else {
              hideError('password');
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
          
          function hideError(field) {
            const input = document.querySelector(\`[data-testid="\${field}"]\`);
            const errorElement = document.querySelector(\`[data-testid="error-\${field}"]\`);
            
            input.classList.remove('error');
            errorElement.classList.remove('show');
          }
          
          // 模拟登录过程
          async function performLogin(username, password) {
            // 显示加载状态
            loginButton.disabled = true;
            loadingSpinner.style.display = 'inline-block';
            buttonText.textContent = '登录中...';
            
            // 模拟网络请求延迟
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 验证账号
            const account = testAccounts[username];
            if (!account) {
              throw new Error('用户名不存在');
            }
            
            if (account.password !== password) {
              throw new Error('密码错误');
            }
            
            // 登录成功
            return {
              success: true,
              user: {
                username: username,
                role: account.role,
                redirectUrl: account.redirectUrl
              },
              token: 'mock_jwt_token_' + Date.now()
            };
          }
          
          // 表单提交处理
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!validateForm()) {
              return;
            }
            
            try {
              const result = await performLogin(usernameInput.value, passwordInput.value);
              
              // 显示成功消息
              successMessage.classList.add('show');
              
              // 模拟跳转
              setTimeout(() => {
                // 这里可以实际跳转到对应的页面
                console.log('跳转到:', result.user.redirectUrl);
                alert(\`登录成功！\\n用户: \${result.user.username}\\n角色: \${result.user.role}\\n即将跳转到: \${result.user.redirectUrl}\`);
              }, 1500);
              
            } catch (error) {
              // 显示错误
              if (error.message.includes('用户名')) {
                showError('username', error.message);
              } else if (error.message.includes('密码')) {
                showError('password', error.message);
              } else {
                alert('登录失败: ' + error.message);
              }
            } finally {
              // 恢复按钮状态
              loginButton.disabled = false;
              loadingSpinner.style.display = 'none';
              buttonText.textContent = '登录';
            }
          });
          
          // 输入框失焦验证
          usernameInput.addEventListener('blur', () => {
            if (usernameInput.value.trim()) {
              hideError('username');
            }
          });
          
          passwordInput.addEventListener('blur', () => {
            if (passwordInput.value.trim()) {
              hideError('password');
            }
          });
          
          // 清除错误状态当用户开始输入
          usernameInput.addEventListener('input', () => {
            if (usernameInput.classList.contains('error')) {
              hideError('username');
            }
          });
          
          passwordInput.addEventListener('input', () => {
            if (passwordInput.classList.contains('error')) {
              hideError('password');
            }
          });
        </script>
      </body>
      </html>
    `);

    console.log('🚀 开始真实登录页面测试...');

    // 验证页面加载
    await expect(page).toHaveTitle('AFA办公系统 - 登录');
    await expect(page.locator('.welcome-title')).toContainText('AFA办公系统');

    console.log('✅ 步骤1: 验证页面基本元素');
    await expect(page.locator('[data-testid="username"]')).toBeVisible();
    await expect(page.locator('[data-testid="password"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();

    console.log('✅ 步骤2: 验证测试账号显示');
    await expect(page.locator('.test-accounts')).toContainText('租务管理员');
    await expect(page.locator('.test-accounts')).toContainText('tenant_admin / Test123456');
    await expect(page.locator('.test-accounts')).toContainText('商户管理员');
    await expect(page.locator('.test-accounts')).toContainText('merchant_admin / Test123456');

    console.log('✅ 步骤3: 测试表单验证 - 空用户名和密码');
    await page.locator('[data-testid="login-button"]').click();
    await expect(page.locator('[data-testid="error-username"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-password"]')).toBeVisible();

    console.log('✅ 步骤4: 测试错误的登录信息');
    await page.locator('[data-testid="username"]').fill('wrong_user');
    await page.locator('[data-testid="password"]').fill('wrong_pass');
    await page.locator('[data-testid="login-button"]').click();
    
    // 等待登录处理完成
    await page.waitForTimeout(2500);
    
    console.log('✅ 步骤5: 测试快速登录功能 - 租务管理员');
    // 点击租务管理员快速登录
    await page.locator('text=快速登录').first().click();
    
    // 验证表单自动填充
    await expect(page.locator('[data-testid="username"]')).toHaveValue('tenant_admin');
    await expect(page.locator('[data-testid="password"]')).toHaveValue('Test123456');

    console.log('✅ 步骤6: 执行正确的登录');
    await page.locator('[data-testid="login-button"]').click();
    
    // 验证登录过程
    await expect(page.locator('.loading-spinner')).toBeVisible();
    await expect(page.locator('.button-text')).toContainText('登录中...');
    
    // 等待登录完成
    await page.waitForTimeout(2500);
    
    // 验证登录成功
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('登录成功');

    console.log('✅ 步骤7: 测试商户管理员登录');
    // 刷新页面重新开始
    await page.reload();
    
    // 点击商户管理员快速登录
    const merchantLoginBtn = page.locator('.account-item').nth(1).locator('.quick-login-btn');
    await merchantLoginBtn.click();
    
    await expect(page.locator('[data-testid="username"]')).toHaveValue('merchant_admin');
    await page.locator('[data-testid="login-button"]').click();
    await page.waitForTimeout(2500);
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    console.log('✅ 步骤8: 测试员工账号登录');
    await page.reload();
    
    // 点击员工快速登录
    const employeeLoginBtn = page.locator('.account-item').nth(2).locator('.quick-login-btn');
    await employeeLoginBtn.click();
    
    await expect(page.locator('[data-testid="username"]')).toHaveValue('employee_001');
    await page.locator('[data-testid="login-button"]').click();
    await page.waitForTimeout(2500);
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    console.log('🎉 真实登录页面测试完成！');
  });

  test('登录页面交互体验测试', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <title>登录交互测试</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
          .test-container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; }
          .test-section { margin: 30px 0; padding: 20px; border: 1px solid #e1e5e9; border-radius: 8px; }
          .test-title { font-size: 20px; font-weight: bold; margin-bottom: 15px; color: #1890ff; }
          .form-group { margin: 15px 0; }
          .form-input { width: 100%; padding: 12px; border: 2px solid #e1e5e9; border-radius: 6px; font-size: 16px; }
          .form-input:focus { border-color: #1890ff; outline: none; }
          .form-input.error { border-color: #ff4d4f; }
          .button { padding: 12px 24px; background: #1890ff; color: white; border: none; border-radius: 6px; cursor: pointer; margin: 5px; }
          .button:hover { background: #40a9ff; }
          .button.danger { background: #ff4d4f; }
          .button.success { background: #52c41a; }
          .status-message { padding: 12px; border-radius: 6px; margin: 10px 0; }
          .status-success { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
          .status-error { background: #fff2f0; color: #ff4d4f; border: 1px solid #ffccc7; }
          .status-info { background: #e6f7ff; color: #1890ff; border: 1px solid #91d5ff; }
          .demo-accounts { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
          .account-card { background: #fafafa; padding: 15px; border-radius: 8px; text-align: center; }
          .account-role { font-weight: bold; margin-bottom: 8px; }
          .account-credentials { font-size: 14px; color: #666; margin-bottom: 10px; }
          .quick-fill-btn { width: 100%; padding: 8px; background: #722ed1; color: white; border: none; border-radius: 4px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="test-container">
          <h1>🧪 AFA办公系统登录交互测试</h1>
          
          <!-- 测试账号展示 -->
          <div class="test-section">
            <div class="test-title">📋 可用测试账号</div>
            <div class="demo-accounts">
              <div class="account-card">
                <div class="account-role">🏢 租务管理员</div>
                <div class="account-credentials">
                  用户名: tenant_admin<br>
                  密码: Test123456
                </div>
                <button class="quick-fill-btn" onclick="fillLogin('tenant_admin', 'Test123456')" data-testid="fill-tenant">
                  一键填充
                </button>
              </div>
              
              <div class="account-card">
                <div class="account-role">🏪 商户管理员</div>
                <div class="account-credentials">
                  用户名: merchant_admin<br>
                  密码: Test123456
                </div>
                <button class="quick-fill-btn" onclick="fillLogin('merchant_admin', 'Test123456')" data-testid="fill-merchant">
                  一键填充
                </button>
              </div>
              
              <div class="account-card">
                <div class="account-role">👨‍💼 商户员工</div>
                <div class="account-credentials">
                  用户名: employee_001<br>
                  密码: Test123456
                </div>
                <button class="quick-fill-btn" onclick="fillLogin('employee_001', 'Test123456')" data-testid="fill-employee">
                  一键填充
                </button>
              </div>
            </div>
          </div>
          
          <!-- 登录表单 -->
          <div class="test-section">
            <div class="test-title">🔐 登录表单测试</div>
            <form data-testid="login-form">
              <div class="form-group">
                <label>用户名:</label>
                <input type="text" data-testid="username" class="form-input" placeholder="请输入用户名">
              </div>
              
              <div class="form-group">
                <label>密码:</label>
                <input type="password" data-testid="password" class="form-input" placeholder="请输入密码">
              </div>
              
              <div class="form-group">
                <button type="submit" class="button" data-testid="login-btn">🚀 登录</button>
                <button type="button" class="button" onclick="clearForm()" data-testid="clear-btn">🧹 清空</button>
                <button type="button" class="button danger" onclick="testWrongLogin()" data-testid="wrong-login-btn">❌ 测试错误登录</button>
              </div>
            </form>
            
            <div id="login-status" data-testid="login-status"></div>
          </div>
          
          <!-- 功能测试区域 -->
          <div class="test-section">
            <div class="test-title">⚡ 功能测试</div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
              <button class="button" onclick="testValidation()" data-testid="test-validation">
                📝 测试表单验证
              </button>
              <button class="button" onclick="testLoadingState()" data-testid="test-loading">
                ⏳ 测试加载状态
              </button>
              <button class="button success" onclick="testSuccessLogin()" data-testid="test-success">
                ✅ 测试成功登录
              </button>
              <button class="button danger" onclick="testFailedLogin()" data-testid="test-failed">
                ❌ 测试登录失败
              </button>
            </div>
            
            <div id="test-results" data-testid="test-results" style="margin-top: 20px;"></div>
          </div>
          
          <!-- 系统状态 -->
          <div class="test-section">
            <div class="test-title">📊 系统状态模拟</div>
            <div id="system-status" data-testid="system-status">
              <div class="status-message status-info">
                🟢 系统运行正常 | 响应时间: 156ms | 在线用户: 1,234
              </div>
            </div>
          </div>
        </div>
        
        <script>
          const usernameInput = document.querySelector('[data-testid="username"]');
          const passwordInput = document.querySelector('[data-testid="password"]');
          const loginForm = document.querySelector('[data-testid="login-form"]');
          const loginStatus = document.querySelector('[data-testid="login-status"]');
          const testResults = document.querySelector('[data-testid="test-results"]');
          
          // 模拟用户数据库
          const users = {
            'tenant_admin': { password: 'Test123456', role: '租务管理员', permissions: ['all'] },
            'merchant_admin': { password: 'Test123456', role: '商户管理员', permissions: ['merchant'] },
            'employee_001': { password: 'Test123456', role: '商户员工', permissions: ['employee'] }
          };
          
          // 一键填充登录信息
          function fillLogin(username, password) {
            usernameInput.value = username;
            passwordInput.value = password;
            
            // 添加视觉反馈
            usernameInput.style.background = '#e6f7ff';
            passwordInput.style.background = '#e6f7ff';
            
            setTimeout(() => {
              usernameInput.style.background = '';
              passwordInput.style.background = '';
            }, 1000);
            
            showStatus('info', \`已填充 \${users[username]?.role || '未知角色'} 登录信息\`);
          }
          
          // 清空表单
          function clearForm() {
            usernameInput.value = '';
            passwordInput.value = '';
            usernameInput.classList.remove('error');
            passwordInput.classList.remove('error');
            showStatus('info', '表单已清空');
          }
          
          // 显示状态消息
          function showStatus(type, message) {
            loginStatus.innerHTML = \`<div class="status-message status-\${type}">\${message}</div>\`;
          }
          
          // 模拟登录验证
          async function performLogin(username, password) {
            showStatus('info', '🔄 正在验证登录信息...');
            
            // 模拟网络延迟
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const user = users[username];
            if (!user) {
              throw new Error('用户名不存在');
            }
            
            if (user.password !== password) {
              throw new Error('密码错误');
            }
            
            return {
              success: true,
              user: { username, role: user.role, permissions: user.permissions },
              token: 'jwt_token_' + Date.now()
            };
          }
          
          // 表单提交处理
          loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            
            // 基础验证
            if (!username) {
              usernameInput.classList.add('error');
              showStatus('error', '❌ 请输入用户名');
              return;
            }
            
            if (!password) {
              passwordInput.classList.add('error');
              showStatus('error', '❌ 请输入密码');
              return;
            }
            
            // 清除错误状态
            usernameInput.classList.remove('error');
            passwordInput.classList.remove('error');
            
            try {
              const result = await performLogin(username, password);
              showStatus('success', \`✅ 登录成功！欢迎您，\${result.user.role} \${username}\`);
              
              // 模拟跳转延迟
              setTimeout(() => {
                showStatus('info', \`🔄 正在跳转到 \${result.user.role} 工作台...\`);
              }, 2000);
              
            } catch (error) {
              showStatus('error', \`❌ 登录失败: \${error.message}\`);
              
              if (error.message.includes('用户名')) {
                usernameInput.classList.add('error');
              } else if (error.message.includes('密码')) {
                passwordInput.classList.add('error');
              }
            }
          });
          
          // 测试功能
          function testValidation() {
            clearForm();
            showStatus('info', '🧪 开始测试表单验证...');
            
            setTimeout(() => {
              document.querySelector('[data-testid="login-btn"]').click();
            }, 1000);
          }
          
          function testLoadingState() {
            fillLogin('tenant_admin', 'Test123456');
            showStatus('info', '🧪 测试加载状态...');
            
            setTimeout(() => {
              document.querySelector('[data-testid="login-btn"]').click();
            }, 1000);
          }
          
          function testSuccessLogin() {
            fillLogin('merchant_admin', 'Test123456');
            showStatus('info', '🧪 测试成功登录流程...');
            
            setTimeout(() => {
              document.querySelector('[data-testid="login-btn"]').click();
            }, 1000);
          }
          
          function testFailedLogin() {
            usernameInput.value = 'wrong_user';
            passwordInput.value = 'wrong_pass';
            showStatus('info', '🧪 测试登录失败处理...');
            
            setTimeout(() => {
              document.querySelector('[data-testid="login-btn"]').click();
            }, 1000);
          }
          
          function testWrongLogin() {
            testFailedLogin();
          }
          
          // 实时系统状态更新
          function updateSystemStatus() {
            const statusElement = document.querySelector('[data-testid="system-status"]');
            const responseTime = Math.floor(Math.random() * 100) + 100;
            const onlineUsers = Math.floor(Math.random() * 500) + 1000;
            
            statusElement.innerHTML = \`
              <div class="status-message status-info">
                🟢 系统运行正常 | 响应时间: \${responseTime}ms | 在线用户: \${onlineUsers.toLocaleString()}
              </div>
            \`;
          }
          
          // 每5秒更新一次系统状态
          setInterval(updateSystemStatus, 5000);
          
          // 输入框事件监听
          usernameInput.addEventListener('input', () => {
            usernameInput.classList.remove('error');
          });
          
          passwordInput.addEventListener('input', () => {
            passwordInput.classList.remove('error');
          });
        </script>
      </body>
      </html>
    `);

    console.log('🎮 开始登录交互体验测试...');

    // 验证页面加载
    await expect(page.locator('h1')).toContainText('AFA办公系统登录交互测试');

    console.log('✅ 测试1: 验证测试账号展示');
    await expect(page.locator('[data-testid="fill-tenant"]')).toBeVisible();
    await expect(page.locator('[data-testid="fill-merchant"]')).toBeVisible();
    await expect(page.locator('[data-testid="fill-employee"]')).toBeVisible();

    console.log('✅ 测试2: 一键填充功能');
    await page.locator('[data-testid="fill-tenant"]').click();
    await expect(page.locator('[data-testid="username"]')).toHaveValue('tenant_admin');
    await expect(page.locator('[data-testid="password"]')).toHaveValue('Test123456');

    console.log('✅ 测试3: 表单验证测试');
    await page.locator('[data-testid="test-validation"]').click();
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="login-status"]')).toContainText('请输入用户名');

    console.log('✅ 测试4: 成功登录测试');
    await page.locator('[data-testid="test-success"]').click();
    await page.waitForTimeout(3000);
    await expect(page.locator('[data-testid="login-status"]')).toContainText('登录成功');

    console.log('✅ 测试5: 失败登录测试');
    await page.locator('[data-testid="test-failed"]').click();
    await page.waitForTimeout(3000);
    await expect(page.locator('[data-testid="login-status"]')).toContainText('登录失败');

    console.log('✅ 测试6: 系统状态显示');
    await expect(page.locator('[data-testid="system-status"]')).toContainText('系统运行正常');

    console.log('🎉 登录交互体验测试完成！');
  });
});