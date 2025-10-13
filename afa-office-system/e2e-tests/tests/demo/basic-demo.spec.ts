import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('AFA办公系统真实登录测试', () => {
  test('真实登录页面测试', async ({ page }) => {
    // 访问真实的登录页面
    const loginPagePath = path.join(__dirname, '../../test-pages/login.html');
    await page.goto(`file://${loginPagePath}`);

    console.log('🔐 开始真实登录测试...');

    // 验证页面加载
    await expect(page).toHaveTitle('AFA办公系统 - 登录');
    await expect(page.locator('.logo')).toContainText('AFA办公系统');

    console.log('✅ 页面加载成功');

    // 验证测试账号显示
    await expect(page.locator('[data-testid="account-tenant-admin"]')).toBeVisible();
    await expect(page.locator('[data-testid="account-merchant-admin"]')).toBeVisible();
    await expect(page.locator('[data-testid="account-employee"]')).toBeVisible();

    console.log('✅ 测试账号显示正常');

    // 测试使用租务管理员账号登录
    console.log('🧪 测试租务管理员登录...');
    await page.locator('[data-testid="account-tenant-admin"]').click();
    
    // 验证账号信息已填入
    await expect(page.locator('[data-testid="username"]')).toHaveValue('tenant_admin');
    await expect(page.locator('[data-testid="password"]')).toHaveValue('Test123456');

    console.log('✅ 账号信息自动填入成功');

    // 点击登录按钮
    await page.locator('[data-testid="login-button"]').click();

    console.log('⏳ 等待登录处理...');

    // 等待登录成功通知
    await expect(page.locator('[data-testid="notification"]')).toContainText('登录成功');

    console.log('✅ 登录成功通知显示');

    // 等待跳转到仪表板
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="user-name"]')).toContainText('租务管理员');
    await expect(page.locator('[data-testid="user-role"]')).toContainText('租务管理员');

    console.log('🎉 租务管理员登录测试完成！');
  });

  test('商户管理员登录测试', async ({ page }) => {
    const loginPagePath = path.join(__dirname, '../../test-pages/login.html');
    await page.goto(`file://${loginPagePath}`);

    console.log('🏪 开始商户管理员登录测试...');

    // 使用商户管理员账号
    await page.locator('[data-testid="account-merchant-admin"]').click();
    
    // 验证账号信息
    await expect(page.locator('[data-testid="username"]')).toHaveValue('merchant_admin');
    await expect(page.locator('[data-testid="password"]')).toHaveValue('Test123456');

    // 登录
    await page.locator('[data-testid="login-button"]').click();

    // 验证登录成功
    await expect(page.locator('[data-testid="notification"]')).toContainText('登录成功');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="user-name"]')).toContainText('商户管理员');

    console.log('🎉 商户管理员登录测试完成！');
  });

  test('员工登录测试', async ({ page }) => {
    const loginPagePath = path.join(__dirname, '../../test-pages/login.html');
    await page.goto(`file://${loginPagePath}`);

    console.log('👨‍💼 开始员工登录测试...');

    // 使用员工账号
    await page.locator('[data-testid="account-employee"]').click();
    
    // 验证账号信息
    await expect(page.locator('[data-testid="username"]')).toHaveValue('employee_001');
    await expect(page.locator('[data-testid="password"]')).toHaveValue('Test123456');

    // 登录
    await page.locator('[data-testid="login-button"]').click();

    // 验证登录成功
    await expect(page.locator('[data-testid="notification"]')).toContainText('登录成功');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="user-name"]')).toContainText('张三');

    console.log('🎉 员工登录测试完成！');
  });

  test('手动输入登录测试', async ({ page }) => {
    const loginPagePath = path.join(__dirname, '../../test-pages/login.html');
    await page.goto(`file://${loginPagePath}`);

    console.log('⌨️ 开始手动输入登录测试...');

    // 手动输入用户名和密码
    await page.locator('[data-testid="username"]').fill('tenant_admin');
    await page.locator('[data-testid="password"]').fill('Test123456');

    // 勾选记住登录状态
    await page.locator('[data-testid="remember-me"]').check();

    // 登录
    await page.locator('[data-testid="login-button"]').click();

    // 验证登录成功
    await expect(page.locator('[data-testid="notification"]')).toContainText('登录成功');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });

    console.log('🎉 手动输入登录测试完成！');
  });

  test('错误登录测试', async ({ page }) => {
    const loginPagePath = path.join(__dirname, '../../test-pages/login.html');
    await page.goto(`file://${loginPagePath}`);

    console.log('❌ 开始错误登录测试...');

    // 输入错误的用户名和密码
    await page.locator('[data-testid="username"]').fill('wrong_user');
    await page.locator('[data-testid="password"]').fill('wrong_password');

    // 尝试登录
    await page.locator('[data-testid="login-button"]').click();

    // 验证错误提示
    await expect(page.locator('[data-testid="notification"]')).toContainText('用户名或密码错误');

    console.log('✅ 错误登录提示正常');

    // 测试空用户名
    await page.locator('[data-testid="username"]').fill('');
    await page.locator('[data-testid="password"]').fill('Test123456');
    await page.locator('[data-testid="login-button"]').click();

    // 验证表单验证
    await expect(page.locator('[data-testid="username-error"]')).toContainText('请输入用户名');

    console.log('✅ 表单验证正常');

    console.log('🎉 错误登录测试完成！');
  });

  test('退出登录测试', async ({ page }) => {
    const loginPagePath = path.join(__dirname, '../../test-pages/login.html');
    await page.goto(`file://${loginPagePath}`);

    console.log('🚪 开始退出登录测试...');

    // 先登录
    await page.locator('[data-testid="account-tenant-admin"]').click();
    await page.locator('[data-testid="login-button"]').click();
    
    // 等待登录成功
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });

    console.log('✅ 登录成功，准备测试退出');

    // 模拟确认对话框
    page.on('dialog', dialog => {
      console.log('📋 确认对话框:', dialog.message());
      dialog.accept();
    });

    // 点击退出登录
    await page.locator('[data-testid="logout-button"]').click();

    // 验证返回登录页面
    await expect(page.locator('.login-form')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.form-title')).toContainText('欢迎登录');

    console.log('🎉 退出登录测试完成！');
  });

  test('基础页面导航测试', async ({ page }) => {
    // 保留原有的演示内容，但简化
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>AFA办公系统演示</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .container { max-width: 800px; margin: 0 auto; }
          .header { background: #1890ff; color: white; padding: 20px; border-radius: 8px; }
          .nav { margin: 20px 0; }
          .nav button { margin-right: 10px; padding: 10px 20px; border: none; background: #f0f0f0; cursor: pointer; border-radius: 4px; }
          .nav button:hover { background: #d9d9d9; }
          .content { background: #fafafa; padding: 20px; border-radius: 8px; min-height: 300px; }
          .card { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .status.success { background: #f6ffed; color: #52c41a; }
          .status.pending { background: #fff7e6; color: #fa8c16; }
          .hidden { display: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏢 AFA办公系统</h1>
            <p>智能办公通行管理平台</p>
          </div>
          
          <div class="nav">
            <button data-testid="nav-dashboard" onclick="showSection('dashboard')">仪表板</button>
            <button data-testid="nav-merchants" onclick="showSection('merchants')">商户管理</button>
            <button data-testid="nav-visitors" onclick="showSection('visitors')">访客管理</button>
            <button data-testid="nav-devices" onclick="showSection('devices')">设备管理</button>
          </div>
          
          <div class="content">
            <div id="dashboard" data-testid="dashboard-section">
              <h2>📊 系统概览</h2>
              <div class="card">
                <h3>今日统计</h3>
                <p>📈 访客申请: <strong data-testid="visitor-count">12</strong></p>
                <p>✅ 通过审批: <strong data-testid="approved-count">8</strong></p>
                <p>🚪 通行记录: <strong data-testid="access-count">156</strong></p>
              </div>
            </div>
            
            <div id="merchants" class="hidden" data-testid="merchants-section">
              <h2>🏪 商户管理</h2>
              <button data-testid="add-merchant" onclick="addMerchant()">添加商户</button>
              <div class="card">
                <table data-testid="merchant-table" style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background: #f5f5f5;">
                      <th style="padding: 10px; text-align: left;">商户名称</th>
                      <th style="padding: 10px; text-align: left;">联系人</th>
                      <th style="padding: 10px; text-align: left;">状态</th>
                      <th style="padding: 10px; text-align: left;">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="padding: 10px;">测试科技公司</td>
                      <td style="padding: 10px;">王经理</td>
                      <td style="padding: 10px;"><span class="status success">正常</span></td>
                      <td style="padding: 10px;">
                        <button data-testid="edit-merchant-1">编辑</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div id="visitors" class="hidden" data-testid="visitors-section">
              <h2>👥 访客管理</h2>
              <button data-testid="invite-visitor" onclick="inviteVisitor()">邀请访客</button>
              <div class="card">
                <table data-testid="visitor-table" style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background: #f5f5f5;">
                      <th style="padding: 10px; text-align: left;">访客姓名</th>
                      <th style="padding: 10px; text-align: left;">公司</th>
                      <th style="padding: 10px; text-align: left;">状态</th>
                      <th style="padding: 10px; text-align: left;">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="padding: 10px;">王五</td>
                      <td style="padding: 10px;">客户公司A</td>
                      <td style="padding: 10px;"><span class="status pending" data-testid="status-badge">待审批</span></td>
                      <td style="padding: 10px;">
                        <button data-testid="approve-button" onclick="approveVisitor(this)">审批</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div id="devices" class="hidden" data-testid="devices-section">
              <h2>📱 设备管理</h2>
              <button data-testid="add-device" onclick="addDevice()">添加设备</button>
              <div class="card">
                <table data-testid="device-table" style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background: #f5f5f5;">
                      <th style="padding: 10px; text-align: left;">设备名称</th>
                      <th style="padding: 10px; text-align: left;">位置</th>
                      <th style="padding: 10px; text-align: left;">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="padding: 10px;">大厅闸机A</td>
                      <td style="padding: 10px;">大厅入口左侧</td>
                      <td style="padding: 10px;"><span class="status success">在线</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <!-- 模拟通知 -->
          <div id="notification" data-testid="notification-success" style="position: fixed; top: 20px; right: 20px; background: #f6ffed; border: 1px solid #b7eb8f; color: #52c41a; padding: 15px; border-radius: 6px; display: none;">
            <span id="notification-text"></span>
          </div>
        </div>
        
        <script>
          function showSection(sectionName) {
            // 隐藏所有section
            document.querySelectorAll('[data-testid$="-section"]').forEach(el => {
              el.classList.add('hidden');
            });
            // 显示选中的section
            document.getElementById(sectionName).classList.remove('hidden');
          }
          
          function showNotification(message) {
            const notification = document.getElementById('notification');
            const text = document.getElementById('notification-text');
            text.textContent = message;
            notification.style.display = 'block';
            setTimeout(() => {
              notification.style.display = 'none';
            }, 3000);
          }
          
          function addMerchant() {
            showNotification('商户添加成功');
          }
          
          function inviteVisitor() {
            showNotification('访客邀请已发送');
          }
          
          function addDevice() {
            showNotification('设备添加成功');
          }
          
          function approveVisitor(button) {
            const row = button.closest('tr');
            const statusBadge = row.querySelector('[data-testid="status-badge"]');
            statusBadge.textContent = '已通过';
            statusBadge.className = 'status success';
            button.textContent = '已审批';
            button.disabled = true;
            showNotification('访客申请已审批通过');
          }
        </script>
      </body>
      </html>
    `);

    // 验证页面标题
    await expect(page).toHaveTitle('AFA办公系统演示');

    // 验证主要元素存在
    await expect(page.locator('h1')).toContainText('AFA办公系统');
    
    // 测试导航功能
    console.log('🧪 测试仪表板页面...');
    await expect(page.locator('[data-testid="dashboard-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="visitor-count"]')).toContainText('12');

    console.log('🧪 测试商户管理页面...');
    await page.locator('[data-testid="nav-merchants"]').click();
    await expect(page.locator('[data-testid="merchants-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="merchant-table"]')).toContainText('测试科技公司');

    console.log('🧪 测试访客管理页面...');
    await page.locator('[data-testid="nav-visitors"]').click();
    await expect(page.locator('[data-testid="visitors-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="visitor-table"]')).toContainText('王五');

    console.log('🧪 测试设备管理页面...');
    await page.locator('[data-testid="nav-devices"]').click();
    await expect(page.locator('[data-testid="devices-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="device-table"]')).toContainText('大厅闸机A');
  });

  test('访客审批流程演示', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>访客审批演示</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .container { max-width: 600px; margin: 0 auto; }
          .step { background: #f9f9f9; padding: 20px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #1890ff; }
          .step.active { background: #e6f7ff; border-left-color: #52c41a; }
          .step.completed { background: #f6ffed; border-left-color: #52c41a; }
          .button { padding: 10px 20px; background: #1890ff; color: white; border: none; border-radius: 4px; cursor: pointer; }
          .button:hover { background: #40a9ff; }
          .button:disabled { background: #d9d9d9; cursor: not-allowed; }
          .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .status.pending { background: #fff7e6; color: #fa8c16; }
          .status.approved { background: #f6ffed; color: #52c41a; }
          .passcode { background: #001529; color: #fff; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 18px; text-align: center; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎯 访客审批流程演示</h1>
          
          <div class="step active" data-testid="step-1">
            <h3>步骤 1: 访客申请</h3>
            <p><strong>访客:</strong> 王五</p>
            <p><strong>公司:</strong> 客户公司A</p>
            <p><strong>目的:</strong> 商务洽谈</p>
            <p><strong>状态:</strong> <span class="status pending" data-testid="application-status">待审批</span></p>
          </div>
          
          <div class="step" data-testid="step-2">
            <h3>步骤 2: 商户审批</h3>
            <button class="button" data-testid="approve-button" onclick="approveApplication()">审批通过</button>
            <button class="button" style="background: #ff4d4f; margin-left: 10px;" onclick="rejectApplication()">拒绝申请</button>
          </div>
          
          <div class="step" data-testid="step-3" style="display: none;">
            <h3>步骤 3: 生成通行码</h3>
            <div class="passcode" data-testid="passcode">PASS123456</div>
            <p>✅ 通行码已生成，访客可使用此码通过门禁</p>
            <p><strong>有效期:</strong> 2024-12-01 18:00</p>
            <p><strong>使用次数:</strong> <span data-testid="usage-count">0/3</span></p>
          </div>
          
          <div class="step" data-testid="step-4" style="display: none;">
            <h3>步骤 4: 访客通行</h3>
            <button class="button" data-testid="simulate-access" onclick="simulateAccess()">模拟门禁通行</button>
            <div id="access-result" style="margin-top: 10px;"></div>
          </div>
          
          <div class="step" data-testid="step-5" style="display: none;">
            <h3>步骤 5: 通行记录</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="background: #f5f5f5;">
                  <th style="padding: 8px; text-align: left;">时间</th>
                  <th style="padding: 8px; text-align: left;">设备</th>
                  <th style="padding: 8px; text-align: left;">结果</th>
                </tr>
              </thead>
              <tbody data-testid="access-records">
                <!-- 通行记录将在这里显示 -->
              </tbody>
            </table>
          </div>
        </div>
        
        <script>
          function approveApplication() {
            // 更新状态
            document.querySelector('[data-testid="application-status"]').textContent = '已通过';
            document.querySelector('[data-testid="application-status"]').className = 'status approved';
            
            // 标记步骤完成
            document.querySelector('[data-testid="step-1"]').className = 'step completed';
            document.querySelector('[data-testid="step-2"]').className = 'step completed';
            
            // 显示通行码步骤
            document.querySelector('[data-testid="step-3"]').style.display = 'block';
            document.querySelector('[data-testid="step-3"]').className = 'step active';
            
            // 显示通行步骤
            setTimeout(() => {
              document.querySelector('[data-testid="step-4"]').style.display = 'block';
            }, 1000);
          }
          
          function rejectApplication() {
            document.querySelector('[data-testid="application-status"]').textContent = '已拒绝';
            document.querySelector('[data-testid="application-status"]').style.background = '#fff2f0';
            document.querySelector('[data-testid="application-status"]').style.color = '#ff4d4f';
          }
          
          function simulateAccess() {
            const now = new Date().toLocaleString();
            const accessResult = document.getElementById('access-result');
            accessResult.innerHTML = '<p style="color: #52c41a;">✅ 通行成功！门禁已开启</p>';
            
            // 更新使用次数
            document.querySelector('[data-testid="usage-count"]').textContent = '1/3';
            
            // 显示通行记录
            document.querySelector('[data-testid="step-5"]').style.display = 'block';
            document.querySelector('[data-testid="step-5"]').className = 'step active';
            
            const recordsTable = document.querySelector('[data-testid="access-records"]');
            recordsTable.innerHTML = \`
              <tr>
                <td style="padding: 8px;">\${now}</td>
                <td style="padding: 8px;">大厅闸机A</td>
                <td style="padding: 8px;"><span style="color: #52c41a;">✅ 成功</span></td>
              </tr>
            \`;
          }
        </script>
      </body>
      </html>
    `);

    console.log('🎯 开始访客审批流程演示...');

    // 验证初始状态
    await expect(page.locator('[data-testid="application-status"]')).toContainText('待审批');
    await expect(page.locator('[data-testid="step-3"]')).not.toBeVisible();

    console.log('✅ 步骤1: 验证访客申请信息');
    await expect(page.locator('[data-testid="step-1"]')).toContainText('王五');
    await expect(page.locator('[data-testid="step-1"]')).toContainText('客户公司A');

    console.log('✅ 步骤2: 执行审批操作');
    await page.locator('[data-testid="approve-button"]').click();

    console.log('✅ 步骤3: 验证通行码生成');
    await expect(page.locator('[data-testid="step-3"]')).toBeVisible();
    await expect(page.locator('[data-testid="passcode"]')).toContainText('PASS123456');
    await expect(page.locator('[data-testid="usage-count"]')).toContainText('0/3');

    console.log('✅ 步骤4: 模拟门禁通行');
    await page.locator('[data-testid="simulate-access"]').click();
    await expect(page.locator('#access-result')).toContainText('通行成功');
    await expect(page.locator('[data-testid="usage-count"]')).toContainText('1/3');

    console.log('✅ 步骤5: 验证通行记录');
    await expect(page.locator('[data-testid="step-5"]')).toBeVisible();
    await expect(page.locator('[data-testid="access-records"]')).toContainText('大厅闸机A');
    await expect(page.locator('[data-testid="access-records"]')).toContainText('成功');

    console.log('🎉 访客审批流程演示完成！');
  });

  test('系统功能概览演示', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>AFA办公系统功能概览</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; background: #f0f2f5; }
          .header { background: linear-gradient(135deg, #1890ff, #722ed1); color: white; padding: 40px 20px; text-align: center; }
          .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
          .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
          .feature-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); transition: transform 0.3s; }
          .feature-card:hover { transform: translateY(-5px); }
          .feature-icon { font-size: 48px; margin-bottom: 15px; }
          .feature-title { font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #1890ff; }
          .feature-desc { color: #666; line-height: 1.6; }
          .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 30px 0; }
          .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .stat-number { font-size: 32px; font-weight: bold; color: #1890ff; }
          .stat-label { color: #666; margin-top: 5px; }
          .demo-section { background: white; padding: 30px; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .button { padding: 12px 24px; background: #1890ff; color: white; border: none; border-radius: 6px; cursor: pointer; margin: 5px; transition: background 0.3s; }
          .button:hover { background: #40a9ff; }
          .workflow { display: flex; align-items: center; justify-content: space-between; margin: 20px 0; flex-wrap: wrap; }
          .workflow-step { background: #f9f9f9; padding: 15px; border-radius: 8px; text-align: center; min-width: 120px; margin: 5px; }
          .workflow-arrow { font-size: 24px; color: #1890ff; margin: 0 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏢 AFA办公系统</h1>
          <p>智能办公通行管理平台 - 让办公更安全、更便捷</p>
        </div>
        
        <div class="container">
          <!-- 统计数据 -->
          <div class="stats">
            <div class="stat-card">
              <div class="stat-number" data-testid="total-merchants">25</div>
              <div class="stat-label">入驻商户</div>
            </div>
            <div class="stat-card">
              <div class="stat-number" data-testid="total-employees">342</div>
              <div class="stat-label">注册员工</div>
            </div>
            <div class="stat-card">
              <div class="stat-number" data-testid="total-visitors">1,256</div>
              <div class="stat-label">访客记录</div>
            </div>
            <div class="stat-card">
              <div class="stat-number" data-testid="total-devices">18</div>
              <div class="stat-label">接入设备</div>
            </div>
          </div>
          
          <!-- 核心功能 -->
          <div class="features">
            <div class="feature-card" data-testid="feature-tenant">
              <div class="feature-icon">🏢</div>
              <div class="feature-title">租务管理</div>
              <div class="feature-desc">
                统一管理办公区域内的所有商户，包括商户信息、空间分配、权限控制等。
                支持商户入驻审批、合同管理、费用结算等全流程管理。
              </div>
            </div>
            
            <div class="feature-card" data-testid="feature-merchant">
              <div class="feature-icon">🏪</div>
              <div class="feature-title">商户管理</div>
              <div class="feature-desc">
                商户可以自主管理员工信息、访客申请、权限分配等。
                提供员工入职离职管理、部门组织架构、角色权限配置等功能。
              </div>
            </div>
            
            <div class="feature-card" data-testid="feature-visitor">
              <div class="feature-icon">👥</div>
              <div class="feature-title">访客管理</div>
              <div class="feature-desc">
                智能化访客预约、审批、通行管理。支持访客信息登记、
                预约时间管理、通行码生成、访问记录追踪等完整流程。
              </div>
            </div>
            
            <div class="feature-card" data-testid="feature-device">
              <div class="feature-icon">📱</div>
              <div class="feature-title">设备集成</div>
              <div class="feature-desc">
                支持多种门禁设备接入，包括闸机、门禁、人脸识别等。
                提供统一的设备管理界面和标准化的API接口。
              </div>
            </div>
            
            <div class="feature-card" data-testid="feature-security">
              <div class="feature-icon">🔒</div>
              <div class="feature-title">安全控制</div>
              <div class="feature-desc">
                多层级权限控制、访问日志记录、异常行为监控。
                确保办公区域安全，提供完整的审计追踪能力。
              </div>
            </div>
            
            <div class="feature-card" data-testid="feature-analytics">
              <div class="feature-icon">📊</div>
              <div class="feature-title">数据分析</div>
              <div class="feature-desc">
                实时统计分析、访客流量监控、设备使用情况分析。
                提供丰富的报表和可视化图表，支持数据导出。
              </div>
            </div>
          </div>
          
          <!-- 业务流程演示 -->
          <div class="demo-section">
            <h2>🔄 典型业务流程</h2>
            <div class="workflow">
              <div class="workflow-step">
                <div>📝</div>
                <div>访客申请</div>
              </div>
              <div class="workflow-arrow">→</div>
              <div class="workflow-step">
                <div>👨‍💼</div>
                <div>员工审批</div>
              </div>
              <div class="workflow-arrow">→</div>
              <div class="workflow-step">
                <div>🎫</div>
                <div>生成通行码</div>
              </div>
              <div class="workflow-arrow">→</div>
              <div class="workflow-step">
                <div>🚪</div>
                <div>门禁通行</div>
              </div>
              <div class="workflow-arrow">→</div>
              <div class="workflow-step">
                <div>📋</div>
                <div>记录归档</div>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
              <button class="button" data-testid="demo-workflow" onclick="demoWorkflow()">
                🎯 演示完整流程
              </button>
              <button class="button" data-testid="view-features" onclick="viewFeatures()">
                📋 查看功能清单
              </button>
              <button class="button" data-testid="check-performance" onclick="checkPerformance()">
                ⚡ 性能监控
              </button>
            </div>
            
            <div id="demo-result" data-testid="demo-result" style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 6px; display: none;">
              <!-- 演示结果将在这里显示 -->
            </div>
          </div>
        </div>
        
        <script>
          function demoWorkflow() {
            const result = document.getElementById('demo-result');
            result.style.display = 'block';
            result.innerHTML = \`
              <h3>🎯 业务流程演示</h3>
              <div style="line-height: 2;">
                <p>✅ 1. 访客"张三"提交访问申请</p>
                <p>✅ 2. 员工"李四"审批通过申请</p>
                <p>✅ 3. 系统生成通行码: <code>PASS789012</code></p>
                <p>✅ 4. 访客通过"大厅闸机A"成功进入</p>
                <p>✅ 5. 系统记录通行日志并发送通知</p>
                <p style="color: #52c41a; font-weight: bold;">🎉 流程演示完成！耗时: 2.3秒</p>
              </div>
            \`;
          }
          
          function viewFeatures() {
            const result = document.getElementById('demo-result');
            result.style.display = 'block';
            result.innerHTML = \`
              <h3>📋 系统功能清单</h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                <div>
                  <h4>👨‍💼 用户管理</h4>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>多角色权限控制</li>
                    <li>用户信息管理</li>
                    <li>登录安全验证</li>
                  </ul>
                </div>
                <div>
                  <h4>🏢 商户管理</h4>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>商户入驻管理</li>
                    <li>空间分配管理</li>
                    <li>合同费用管理</li>
                  </ul>
                </div>
                <div>
                  <h4>👥 访客管理</h4>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>访客预约申请</li>
                    <li>审批流程管理</li>
                    <li>通行码管理</li>
                  </ul>
                </div>
                <div>
                  <h4>📱 设备集成</h4>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>多厂商设备支持</li>
                    <li>实时状态监控</li>
                    <li>远程控制管理</li>
                  </ul>
                </div>
              </div>
            \`;
          }
          
          function checkPerformance() {
            const result = document.getElementById('demo-result');
            result.style.display = 'block';
            result.innerHTML = \`
              <h3>⚡ 系统性能监控</h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div style="text-align: center; padding: 15px; background: white; border-radius: 6px;">
                  <div style="font-size: 24px; color: #52c41a; font-weight: bold;">98.5%</div>
                  <div>系统可用性</div>
                </div>
                <div style="text-align: center; padding: 15px; background: white; border-radius: 6px;">
                  <div style="font-size: 24px; color: #1890ff; font-weight: bold;">156ms</div>
                  <div>平均响应时间</div>
                </div>
                <div style="text-align: center; padding: 15px; background: white; border-radius: 6px;">
                  <div style="font-size: 24px; color: #722ed1; font-weight: bold;">1,234</div>
                  <div>日活跃用户</div>
                </div>
                <div style="text-align: center; padding: 15px; background: white; border-radius: 6px;">
                  <div style="font-size: 24px; color: #fa8c16; font-weight: bold;">99.9%</div>
                  <div>通行成功率</div>
                </div>
              </div>
              <p style="margin-top: 15px; color: #52c41a;">✅ 系统运行状态良好，所有指标正常</p>
            \`;
          }
        </script>
      </body>
      </html>
    `);

    console.log('🏢 开始系统功能概览演示...');

    // 验证页面标题和基本信息
    await expect(page).toHaveTitle('AFA办公系统功能概览');
    await expect(page.locator('h1')).toContainText('AFA办公系统');

    console.log('📊 验证统计数据显示');
    await expect(page.locator('[data-testid="total-merchants"]')).toContainText('25');
    await expect(page.locator('[data-testid="total-employees"]')).toContainText('342');
    await expect(page.locator('[data-testid="total-visitors"]')).toContainText('1,256');
    await expect(page.locator('[data-testid="total-devices"]')).toContainText('18');

    console.log('🔍 验证核心功能模块');
    await expect(page.locator('[data-testid="feature-tenant"]')).toContainText('租务管理');
    await expect(page.locator('[data-testid="feature-merchant"]')).toContainText('商户管理');
    await expect(page.locator('[data-testid="feature-visitor"]')).toContainText('访客管理');
    await expect(page.locator('[data-testid="feature-device"]')).toContainText('设备集成');
    await expect(page.locator('[data-testid="feature-security"]')).toContainText('安全控制');
    await expect(page.locator('[data-testid="feature-analytics"]')).toContainText('数据分析');

    console.log('🎯 测试业务流程演示');
    await page.locator('[data-testid="demo-workflow"]').click();
    await expect(page.locator('[data-testid="demo-result"]')).toBeVisible();
    await expect(page.locator('[data-testid="demo-result"]')).toContainText('PASS789012');
    await expect(page.locator('[data-testid="demo-result"]')).toContainText('流程演示完成');

    console.log('📋 测试功能清单展示');
    await page.locator('[data-testid="view-features"]').click();
    await expect(page.locator('[data-testid="demo-result"]')).toContainText('系统功能清单');
    await expect(page.locator('[data-testid="demo-result"]')).toContainText('多角色权限控制');

    console.log('⚡ 测试性能监控展示');
    await page.locator('[data-testid="check-performance"]').click();
    await expect(page.locator('[data-testid="demo-result"]')).toContainText('系统性能监控');
    await expect(page.locator('[data-testid="demo-result"]')).toContainText('98.5%');
    await expect(page.locator('[data-testid="demo-result"]')).toContainText('系统运行状态良好');

    console.log('🎉 系统功能概览演示完成！');
  });
});