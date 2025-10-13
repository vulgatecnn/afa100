import { test, expect } from '@playwright/test';

/**
 * 用户管理业务流程端到端测试
 * 测试用户的创建、编辑、删除和权限管理
 */

test.describe('用户管理流程测试', () => {
  
  // 使用租务管理员身份进行测试
  test.use({ 
    storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json' 
  });

  test.beforeEach(async ({ page }) => {
    // 导航到用户管理页面
    await page.goto('http://localhost:5000/dashboard');
    await page.click('[data-testid="nav-users"]');
    await expect(page).toHaveURL(/.*\/users/);
  });

  test('创建新用户完整流程', async ({ page }) => {
    // 点击添加用户按钮
    await page.click('[data-testid="add-user-button"]');
    
    // 验证添加用户对话框打开
    await expect(page.locator('[data-testid="add-user-modal"]')).toBeVisible();
    
    // 填写用户信息
    await page.fill('[data-testid="user-username"]', 'new_test_user');
    await page.fill('[data-testid="user-email"]', 'newuser@test.com');
    await page.fill('[data-testid="user-password"]', 'password123');
    await page.fill('[data-testid="user-confirm-password"]', 'password123');
    
    // 选择用户角色
    await page.click('[data-testid="user-role-select"]');
    await page.click('[data-testid="role-option-merchant-admin"]');
    
    // 填写联系信息
    await page.fill('[data-testid="user-phone"]', '13800138888');
    await page.fill('[data-testid="user-department"]', '测试部门');
    
    // 提交表单
    await page.click('[data-testid="submit-user-button"]');
    
    // 验证成功提示
    await expect(page.locator('[data-testid="success-message"]')).toContainText('用户创建成功');
    
    // 验证用户出现在列表中
    await expect(page.locator('[data-testid="user-row"]').filter({ hasText: 'new_test_user' })).toBeVisible();
    
    // 验证用户详细信息
    const userRow = page.locator('[data-testid="user-row"]').filter({ hasText: 'new_test_user' });
    await expect(userRow.locator('[data-testid="user-email"]')).toContainText('newuser@test.com');
    await expect(userRow.locator('[data-testid="user-role"]')).toContainText('商户管理员');
    await expect(userRow.locator('[data-testid="user-status"]')).toContainText('激活');
  });

  test('编辑用户信息流程', async ({ page }) => {
    // 找到要编辑的用户行
    const userRow = page.locator('[data-testid="user-row"]').first();
    
    // 点击编辑按钮
    await userRow.locator('[data-testid="edit-user-button"]').click();
    
    // 验证编辑对话框打开
    await expect(page.locator('[data-testid="edit-user-modal"]')).toBeVisible();
    
    // 修改用户信息
    await page.fill('[data-testid="user-email"]', 'updated@test.com');
    await page.fill('[data-testid="user-phone"]', '13900139999');
    await page.fill('[data-testid="user-department"]', '更新部门');
    
    // 修改用户状态
    await page.click('[data-testid="user-status-select"]');
    await page.click('[data-testid="status-option-inactive"]');
    
    // 提交修改
    await page.click('[data-testid="update-user-button"]');
    
    // 验证成功提示
    await expect(page.locator('[data-testid="success-message"]')).toContainText('用户信息更新成功');
    
    // 验证信息已更新
    await expect(userRow.locator('[data-testid="user-email"]')).toContainText('updated@test.com');
    await expect(userRow.locator('[data-testid="user-status"]')).toContainText('停用');
  });

  test('用户权限管理流程', async ({ page }) => {
    // 选择一个商户管理员用户
    const merchantAdminRow = page.locator('[data-testid="user-row"]').filter({ hasText: '商户管理员' }).first();
    
    // 点击权限管理按钮
    await merchantAdminRow.locator('[data-testid="manage-permissions-button"]').click();
    
    // 验证权限管理对话框打开
    await expect(page.locator('[data-testid="permissions-modal"]')).toBeVisible();
    
    // 验证当前权限显示
    await expect(page.locator('[data-testid="permission-employees-manage"]')).toBeChecked();
    await expect(page.locator('[data-testid="permission-visitors-approve"]')).toBeChecked();
    
    // 修改权限设置
    await page.uncheck('[data-testid="permission-visitors-approve"]');
    await page.check('[data-testid="permission-reports-view"]');
    
    // 保存权限设置
    await page.click('[data-testid="save-permissions-button"]');
    
    // 验证成功提示
    await expect(page.locator('[data-testid="success-message"]')).toContainText('权限设置已更新');
    
    // 重新打开权限对话框验证更改
    await merchantAdminRow.locator('[data-testid="manage-permissions-button"]').click();
    await expect(page.locator('[data-testid="permission-visitors-approve"]')).not.toBeChecked();
    await expect(page.locator('[data-testid="permission-reports-view"]')).toBeChecked();
  });

  test('批量用户操作流程', async ({ page }) => {
    // 选择多个用户
    await page.check('[data-testid="user-checkbox"]', { nth: 0 });
    await page.check('[data-testid="user-checkbox"]', { nth: 1 });
    await page.check('[data-testid="user-checkbox"]', { nth: 2 });
    
    // 验证批量操作工具栏出现
    await expect(page.locator('[data-testid="batch-operations-toolbar"]')).toBeVisible();
    await expect(page.locator('[data-testid="selected-count"]')).toContainText('已选择 3 个用户');
    
    // 执行批量状态更新
    await page.click('[data-testid="batch-status-button"]');
    await page.click('[data-testid="batch-status-inactive"]');
    
    // 确认批量操作
    await page.click('[data-testid="confirm-batch-operation"]');
    
    // 验证成功提示
    await expect(page.locator('[data-testid="success-message"]')).toContainText('批量操作完成');
    
    // 验证用户状态已更新
    const selectedRows = page.locator('[data-testid="user-row"]').first().locator('[data-testid="user-status"]');
    await expect(selectedRows).toContainText('停用');
  });

  test('用户搜索和筛选流程', async ({ page }) => {
    // 使用用户名搜索
    await page.fill('[data-testid="user-search-input"]', 'admin');
    await page.click('[data-testid="search-button"]');
    
    // 验证搜索结果
    const searchResults = page.locator('[data-testid="user-row"]');
    const count = await searchResults.count();
    
    for (let i = 0; i < count; i++) {
      const username = await searchResults.nth(i).locator('[data-testid="user-username"]').textContent();
      expect(username.toLowerCase()).toContain('admin');
    }
    
    // 清除搜索
    await page.click('[data-testid="clear-search-button"]');
    
    // 使用角色筛选
    await page.click('[data-testid="role-filter-select"]');
    await page.click('[data-testid="filter-merchant-admin"]');
    
    // 验证筛选结果
    const filteredResults = page.locator('[data-testid="user-row"]');
    const filteredCount = await filteredResults.count();
    
    for (let i = 0; i < filteredCount; i++) {
      const role = await filteredResults.nth(i).locator('[data-testid="user-role"]').textContent();
      expect(role).toContain('商户管理员');
    }
    
    // 使用状态筛选
    await page.click('[data-testid="status-filter-select"]');
    await page.click('[data-testid="filter-active"]');
    
    // 验证组合筛选结果
    const combinedResults = page.locator('[data-testid="user-row"]');
    const combinedCount = await combinedResults.count();
    
    for (let i = 0; i < combinedCount; i++) {
      const status = await combinedResults.nth(i).locator('[data-testid="user-status"]').textContent();
      expect(status).toContain('激活');
    }
  });

  test('用户删除流程', async ({ page }) => {
    // 找到要删除的用户（选择测试用户）
    const testUserRow = page.locator('[data-testid="user-row"]').filter({ hasText: 'test_user' }).first();
    
    // 点击删除按钮
    await testUserRow.locator('[data-testid="delete-user-button"]').click();
    
    // 验证删除确认对话框
    await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="delete-warning"]')).toContainText('此操作不可撤销');
    
    // 输入确认文本
    await page.fill('[data-testid="delete-confirmation-input"]', '确认删除');
    
    // 确认删除
    await page.click('[data-testid="confirm-delete-button"]');
    
    // 验证成功提示
    await expect(page.locator('[data-testid="success-message"]')).toContainText('用户删除成功');
    
    // 验证用户从列表中消失
    await expect(page.locator('[data-testid="user-row"]').filter({ hasText: 'test_user' })).not.toBeVisible();
  });

  test('用户密码重置流程', async ({ page }) => {
    // 选择用户
    const userRow = page.locator('[data-testid="user-row"]').first();
    
    // 点击重置密码按钮
    await userRow.locator('[data-testid="reset-password-button"]').click();
    
    // 验证重置密码对话框
    await expect(page.locator('[data-testid="reset-password-modal"]')).toBeVisible();
    
    // 选择重置方式
    await page.check('[data-testid="send-email-reset"]');
    
    // 或者直接设置新密码
    await page.check('[data-testid="set-new-password"]');
    await page.fill('[data-testid="new-password"]', 'newpassword123');
    await page.fill('[data-testid="confirm-new-password"]', 'newpassword123');
    
    // 执行重置
    await page.click('[data-testid="execute-reset-button"]');
    
    // 验证成功提示
    await expect(page.locator('[data-testid="success-message"]')).toContainText('密码重置成功');
  });

  test('用户数据导入导出流程', async ({ page }) => {
    // 测试用户数据导出
    await page.click('[data-testid="export-users-button"]');
    
    // 选择导出格式
    await page.click('[data-testid="export-format-excel"]');
    
    // 选择导出字段
    await page.check('[data-testid="export-field-username"]');
    await page.check('[data-testid="export-field-email"]');
    await page.check('[data-testid="export-field-role"]');
    
    // 执行导出
    await page.click('[data-testid="execute-export-button"]');
    
    // 验证导出成功提示
    await expect(page.locator('[data-testid="success-message"]')).toContainText('用户数据导出成功');
    
    // 测试用户数据导入
    await page.click('[data-testid="import-users-button"]');
    
    // 上传导入文件
    const fileInput = page.locator('[data-testid="import-file-input"]');
    await fileInput.setInputFiles('tests/e2e/fixtures/data/users-import.xlsx');
    
    // 验证文件预览
    await expect(page.locator('[data-testid="import-preview-table"]')).toBeVisible();
    
    // 映射字段
    await page.selectOption('[data-testid="field-mapping-username"]', 'username');
    await page.selectOption('[data-testid="field-mapping-email"]', 'email');
    await page.selectOption('[data-testid="field-mapping-role"]', 'role');
    
    // 执行导入
    await page.click('[data-testid="execute-import-button"]');
    
    // 验证导入结果
    await expect(page.locator('[data-testid="import-result-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="import-success-count"]')).toContainText('成功导入');
  });

  test('用户活动日志查看', async ({ page }) => {
    // 选择用户
    const userRow = page.locator('[data-testid="user-row"]').first();
    
    // 点击查看活动日志
    await userRow.locator('[data-testid="view-activity-log-button"]').click();
    
    // 验证活动日志对话框
    await expect(page.locator('[data-testid="activity-log-modal"]')).toBeVisible();
    
    // 验证日志条目
    const logEntries = page.locator('[data-testid="log-entry"]');
    const entryCount = await logEntries.count();
    expect(entryCount).toBeGreaterThan(0);
    
    // 验证日志内容
    const firstEntry = logEntries.first();
    await expect(firstEntry.locator('[data-testid="log-timestamp"]')).toBeVisible();
    await expect(firstEntry.locator('[data-testid="log-action"]')).toBeVisible();
    await expect(firstEntry.locator('[data-testid="log-details"]')).toBeVisible();
    
    // 筛选日志
    await page.selectOption('[data-testid="log-action-filter"]', 'login');
    
    // 验证筛选结果
    const filteredEntries = page.locator('[data-testid="log-entry"]');
    const filteredCount = await filteredEntries.count();
    
    for (let i = 0; i < filteredCount; i++) {
      const action = await filteredEntries.nth(i).locator('[data-testid="log-action"]').textContent();
      expect(action).toContain('登录');
    }
  });
});
