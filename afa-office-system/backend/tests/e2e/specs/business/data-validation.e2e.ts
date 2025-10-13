import { test, expect } from '@playwright/test';

/**
 * 数据验证和业务规则端到端测试
 * 测试系统的数据完整性、业务规则验证和错误处理
 */

test.describe('数据验证和业务规则测试', () => {

  test.describe('用户数据验证', () => {
    test.use({ 
      storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json' 
    });

    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:3001/dashboard');
      await page.click('[data-testid="nav-users"]');
    });

    test('用户创建数据验证', async ({ page }) => {
      await page.click('[data-testid="add-user-button"]');
      
      // 测试必填字段验证
      await page.click('[data-testid="submit-user-button"]');
      
      // 验证必填字段错误提示
      await expect(page.locator('[data-testid="username-error"]')).toContainText('用户名不能为空');
      await expect(page.locator('[data-testid="email-error"]')).toContainText('邮箱不能为空');
      await expect(page.locator('[data-testid="password-error"]')).toContainText('密码不能为空');
      
      // 测试用户名格式验证
      await page.fill('[data-testid="user-username"]', 'a');
      await expect(page.locator('[data-testid="username-error"]')).toContainText('用户名长度至少3个字符');
      
      await page.fill('[data-testid="user-username"]', 'user@name');
      await expect(page.locator('[data-testid="username-error"]')).toContainText('用户名只能包含字母、数字和下划线');
      
      // 测试邮箱格式验证
      await page.fill('[data-testid="user-email"]', 'invalid-email');
      await expect(page.locator('[data-testid="email-error"]')).toContainText('请输入有效的邮箱地址');
      
      // 测试密码强度验证
      await page.fill('[data-testid="user-password"]', '123');
      await expect(page.locator('[data-testid="password-error"]')).toContainText('密码长度至少8个字符');
      
      await page.fill('[data-testid="user-password"]', '12345678');
      await expect(page.locator('[data-testid="password-error"]')).toContainText('密码必须包含字母和数字');
      
      // 测试密码确认验证
      await page.fill('[data-testid="user-password"]', 'password123');
      await page.fill('[data-testid="user-confirm-password"]', 'password456');
      await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText('两次输入的密码不一致');
      
      // 测试手机号格式验证
      await page.fill('[data-testid="user-phone"]', '123456');
      await expect(page.locator('[data-testid="phone-error"]')).toContainText('请输入有效的手机号码');
    });

    test('用户名和邮箱唯一性验证', async ({ page }) => {
      await page.click('[data-testid="add-user-button"]');
      
      // 填写已存在的用户名
      await page.fill('[data-testid="user-username"]', 'tenant_admin');
      await page.fill('[data-testid="user-email"]', 'new@test.com');
      await page.fill('[data-testid="user-password"]', 'password123');
      await page.fill('[data-testid="user-confirm-password"]', 'password123');
      
      await page.click('[data-testid="submit-user-button"]');
      
      // 验证用户名重复错误
      await expect(page.locator('[data-testid="username-error"]')).toContainText('用户名已存在');
      
      // 修改用户名，使用已存在的邮箱
      await page.fill('[data-testid="user-username"]', 'new_user');
      await page.fill('[data-testid="user-email"]', 'tenant@afa.com');
      
      await page.click('[data-testid="submit-user-button"]');
      
      // 验证邮箱重复错误
      await expect(page.locator('[data-testid="email-error"]')).toContainText('邮箱已存在');
    });
  });

  test.describe('商户数据验证', () => {
    test.use({ 
      storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json' 
    });

    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:3001/dashboard');
      await page.click('[data-testid="nav-merchants"]');
    });

    test('商户创建数据验证', async ({ page }) => {
      await page.click('[data-testid="add-merchant-button"]');
      
      // 测试必填字段验证
      await page.click('[data-testid="submit-merchant-button"]');
      
      await expect(page.locator('[data-testid="merchant-name-error"]')).toContainText('商户名称不能为空');
      await expect(page.locator('[data-testid="contact-person-error"]')).toContainText('联系人不能为空');
      await expect(page.locator('[data-testid="contact-phone-error"]')).toContainText('联系电话不能为空');
      
      // 测试商户代码格式验证
      await page.fill('[data-testid="merchant-code"]', 'abc');
      await expect(page.locator('[data-testid="merchant-code-error"]')).toContainText('商户代码长度至少6个字符');
      
      await page.fill('[data-testid="merchant-code"]', 'merchant code');
      await expect(page.locator('[data-testid="merchant-code-error"]')).toContainText('商户代码只能包含字母、数字和下划线');
      
      // 测试营业执照号验证
      await page.fill('[data-testid="business-license"]', '123456');
      await expect(page.locator('[data-testid="business-license-error"]')).toContainText('请输入有效的营业执照号');
      
      // 测试注册资本验证
      await page.fill('[data-testid="registration-capital"]', '-100');
      await expect(page.locator('[data-testid="registration-capital-error"]')).toContainText('注册资本必须大于0');
      
      // 测试合同日期验证
      await page.fill('[data-testid="contract-start-date"]', '2024-12-31');
      await page.fill('[data-testid="contract-end-date"]', '2024-01-01');
      await expect(page.locator('[data-testid="contract-date-error"]')).toContainText('合同结束日期不能早于开始日期');
      
      // 测试租金验证
      await page.fill('[data-testid="monthly-rent"]', 'abc');
      await expect(page.locator('[data-testid="monthly-rent-error"]')).toContainText('请输入有效的金额');
    });

    test('商户代码唯一性验证', async ({ page }) => {
      await page.click('[data-testid="add-merchant-button"]');
      
      // 使用已存在的商户代码
      await page.fill('[data-testid="merchant-name"]', '新商户');
      await page.fill('[data-testid="merchant-code"]', 'EXISTING_CODE');
      await page.fill('[data-testid="contact-person"]', '张经理');
      await page.fill('[data-testid="contact-phone"]', '13800138001');
      
      await page.click('[data-testid="submit-merchant-button"]');
      
      // 验证代码重复错误
      await expect(page.locator('[data-testid="merchant-code-error"]')).toContainText('商户代码已存在');
    });
  });

  test.describe('访客申请数据验证', () => {
    test('访客申请表单验证', async ({ page }) => {
      await page.goto('http://localhost:3000/visitor-application');
      
      // 测试必填字段验证
      await page.click('[data-testid="submit-application-button"]');
      
      await expect(page.locator('[data-testid="visitor-name-error"]')).toContainText('访客姓名不能为空');
      await expect(page.locator('[data-testid="visitor-phone-error"]')).toContainText('联系电话不能为空');
      await expect(page.locator('[data-testid="visit-purpose-error"]')).toContainText('访问目的不能为空');
      
      // 测试身份证号验证
      await page.fill('[data-testid="visitor-id-card"]', '123456');
      await expect(page.locator('[data-testid="id-card-error"]')).toContainText('请输入有效的身份证号');
      
      // 测试访问日期验证
      await page.fill('[data-testid="visit-date"]', '2023-01-01');
      await expect(page.locator('[data-testid="visit-date-error"]')).toContainText('访问日期不能早于今天');
      
      // 测试访问时间验证
      await page.fill('[data-testid="visit-time-start"]', '18:00');
      await page.fill('[data-testid="visit-time-end"]', '09:00');
      await expect(page.locator('[data-testid="visit-time-error"]')).toContainText('结束时间不能早于开始时间');
      
      // 测试访问时长限制
      await page.fill('[data-testid="visit-time-start"]', '09:00');
      await page.fill('[data-testid="visit-time-end"]', '23:00');
      await expect(page.locator('[data-testid="visit-time-error"]')).toContainText('单次访问时长不能超过12小时');
    });

    test('访客黑名单验证', async ({ page }) => {
      await page.goto('http://localhost:3000/visitor-application');
      
      // 填写黑名单访客信息
      await page.fill('[data-testid="visitor-name"]', '黑名单访客');
      await page.fill('[data-testid="visitor-phone"]', '13800138999');
      await page.fill('[data-testid="visitor-id-card"]', '110101199001011234');
      
      // 其他必填信息
      await page.fill('[data-testid="visit-purpose"]', '商务洽谈');
      await page.fill('[data-testid="visit-date"]', '2024-12-20');
      await page.fill('[data-testid="visit-time-start"]', '09:00');
      await page.fill('[data-testid="visit-time-end"]', '17:00');
      
      await page.click('[data-testid="submit-application-button"]');
      
      // 验证黑名单拦截
      await expect(page.locator('[data-testid="blacklist-error"]')).toContainText('该访客在黑名单中，无法申请访问');
    });

    test('重复申请验证', async ({ page }) => {
      await page.goto('http://localhost:3000/visitor-application');
      
      // 填写已有申请的访客信息
      await page.fill('[data-testid="visitor-name"]', '李访客');
      await page.fill('[data-testid="visitor-phone"]', '13700137001');
      await page.fill('[data-testid="visit-date"]', '2024-12-15');
      await page.fill('[data-testid="visit-time-start"]', '09:00');
      await page.fill('[data-testid="visit-time-end"]', '17:00');
      
      // 其他信息
      await page.fill('[data-testid="visit-purpose"]', '商务洽谈');
      
      await page.click('[data-testid="submit-application-button"]');
      
      // 验证重复申请提示
      await expect(page.locator('[data-testid="duplicate-application-warning"]')).toContainText('您在该时间段已有申请');
    });
  });

  test.describe('业务规则验证', () => {
    test.use({ 
      storageState: 'tests/e2e/fixtures/auth-states/merchant-admin.json' 
    });

    test('访客申请审批规则', async ({ page }) => {
      await page.goto('http://localhost:3002/dashboard');
      await page.click('[data-testid="nav-visitors"]');
      
      // 尝试审批过期申请
      const expiredApplication = page.locator('[data-testid="application-row"][data-status="expired"]').first();
      
      if (await expiredApplication.count() > 0) {
        await expiredApplication.locator('[data-testid="approve-application-button"]').click();
        
        // 验证过期申请不能审批
        await expect(page.locator('[data-testid="expired-application-error"]')).toContainText('申请已过期，无法审批');
      }
      
      // 测试工作时间外申请审批
      const afterHoursApplication = page.locator('[data-testid="application-row"][data-visit-time="after-hours"]').first();
      
      if (await afterHoursApplication.count() > 0) {
        await afterHoursApplication.locator('[data-testid="approve-application-button"]').click();
        
        // 验证需要特殊审批
        await expect(page.locator('[data-testid="special-approval-required"]')).toContainText('非工作时间访问需要特殊审批');
      }
    });

    test('空间容量限制验证', async ({ page }) => {
      await page.goto('http://localhost:3001/dashboard');
      await page.click('[data-testid="nav-spaces"]');
      
      // 选择已满容量的空间
      const fullCapacitySpace = page.locator('[data-testid="space-row"][data-status="full"]').first();
      
      if (await fullCapacitySpace.count() > 0) {
        await fullCapacitySpace.locator('[data-testid="assign-visitor-button"]').click();
        
        // 验证容量限制提示
        await expect(page.locator('[data-testid="capacity-limit-error"]')).toContainText('空间已达到最大容量');
      }
    });

    test('权限级联验证', async ({ page }) => {
      // 测试商户员工权限限制
      await page.goto('http://localhost:3002/login');
      await page.fill('[data-testid="username"]', 'employee_user');
      await page.fill('[data-testid="password"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // 尝试访问管理员功能
      await page.goto('http://localhost:3002/employees');
      
      // 验证权限不足提示
      await expect(page.locator('[data-testid="access-denied"]')).toContainText('权限不足');
      
      // 尝试审批高级别访客
      await page.goto('http://localhost:3002/visitors');
      
      const highLevelApplication = page.locator('[data-testid="application-row"][data-level="high"]').first();
      
      if (await highLevelApplication.count() > 0) {
        await highLevelApplication.locator('[data-testid="approve-application-button"]').click();
        
        // 验证需要更高权限
        await expect(page.locator('[data-testid="higher-permission-required"]')).toContainText('该申请需要管理员权限审批');
      }
    });
  });

  test.describe('数据完整性验证', () => {
    test.use({ 
      storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json' 
    });

    test('关联数据删除验证', async ({ page }) => {
      await page.goto('http://localhost:3001/dashboard');
      await page.click('[data-testid="nav-merchants"]');
      
      // 尝试删除有关联数据的商户
      const merchantWithData = page.locator('[data-testid="merchant-row"][data-has-employees="true"]').first();
      
      await merchantWithData.locator('[data-testid="delete-merchant-button"]').click();
      
      // 验证关联数据警告
      await expect(page.locator('[data-testid="dependency-warning"]')).toContainText('该商户下还有员工数据');
      await expect(page.locator('[data-testid="cascade-delete-options"]')).toBeVisible();
      
      // 选择级联删除
      await page.check('[data-testid="cascade-delete-employees"]');
      await page.check('[data-testid="cascade-delete-visitors"]');
      
      // 确认删除
      await page.fill('[data-testid="delete-confirmation-input"]', '确认删除');
      await page.click('[data-testid="confirm-delete-button"]');
      
      // 验证删除成功
      await expect(page.locator('[data-testid="success-message"]')).toContainText('商户及关联数据删除成功');
    });

    test('数据导入完整性验证', async ({ page }) => {
      await page.goto('http://localhost:3001/dashboard');
      await page.click('[data-testid="nav-users"]');
      await page.click('[data-testid="import-users-button"]');
      
      // 上传包含错误数据的文件
      await page.setInputFiles('[data-testid="import-file-input"]', 'tests/e2e/fixtures/data/users-with-errors.xlsx');
      
      // 验证数据预览显示错误
      await expect(page.locator('[data-testid="import-errors-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-row"]')).toContainText('邮箱格式错误');
      await expect(page.locator('[data-testid="error-row"]')).toContainText('用户名重复');
      
      // 修复错误后重新导入
      await page.click('[data-testid="fix-errors-button"]');
      
      // 修正错误数据
      await page.fill('[data-testid="fix-email-0"]', 'corrected@test.com');
      await page.fill('[data-testid="fix-username-1"]', 'unique_username');
      
      // 执行导入
      await page.click('[data-testid="execute-import-button"]');
      
      // 验证导入结果
      await expect(page.locator('[data-testid="import-success-count"]')).toContainText('成功导入');
      await expect(page.locator('[data-testid="import-error-count"]')).toContainText('错误: 0');
    });
  });

  test.describe('并发操作验证', () => {
    test('并发编辑冲突检测', async ({ browser }) => {
      // 创建两个浏览器上下文模拟不同用户
      const context1 = await browser.newContext({
        storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json'
      });
      const context2 = await browser.newContext({
        storageState: 'tests/e2e/fixtures/auth-states/merchant-admin.json'
      });
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      // 两个用户同时编辑同一个商户
      await page1.goto('http://localhost:3001/merchants');
      await page2.goto('http://localhost:3002/dashboard');
      
      // 用户1开始编辑
      const merchantRow1 = page1.locator('[data-testid="merchant-row"]').first();
      await merchantRow1.locator('[data-testid="edit-merchant-button"]').click();
      await page1.fill('[data-testid="contact-person"]', '用户1修改');
      
      // 用户2也开始编辑同一商户
      await page2.goto('http://localhost:3002/merchant-profile');
      await page2.click('[data-testid="edit-profile-button"]');
      await page2.fill('[data-testid="contact-person"]', '用户2修改');
      
      // 用户1先提交
      await page1.click('[data-testid="update-merchant-button"]');
      await expect(page1.locator('[data-testid="success-message"]')).toContainText('更新成功');
      
      // 用户2后提交，应该检测到冲突
      await page2.click('[data-testid="update-profile-button"]');
      await expect(page2.locator('[data-testid="conflict-warning"]')).toContainText('数据已被其他用户修改');
      
      await context1.close();
      await context2.close();
    });
  });
});