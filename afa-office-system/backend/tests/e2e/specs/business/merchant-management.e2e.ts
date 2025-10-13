import { test, expect } from '@playwright/test';

/**
 * 商户管理业务流程端到端测试
 * 测试商户的创建、编辑、删除和空间分配
 */

test.describe('商户管理流程测试', () => {
  
  // 使用租务管理员身份进行测试
  test.use({ 
    storageState: 'tests/e2e/fixtures/auth-states/tenant-admin.json' 
  });

  test.beforeEach(async ({ page }) => {
    // 导航到商户管理页面
    await page.goto('http://localhost:5000/dashboard');
    await page.click('[data-testid="nav-merchants"]');
    await expect(page).toHaveURL(/.*\/merchants/);
  });

  test('创建新商户完整流程', async ({ page }) => {
    // 点击添加商户按钮
    await page.click('[data-testid="add-merchant-button"]');
    
    // 验证添加商户对话框打开
    await expect(page.locator('[data-testid="add-merchant-modal"]')).toBeVisible();
    
    // 填写商户基本信息
    await page.fill('[data-testid="merchant-name"]', '新测试科技公司');
    await page.fill('[data-testid="merchant-code"]', 'NEW_TECH_001');
    await page.selectOption('[data-testid="merchant-type"]', 'technology');
    
    // 填写联系信息
    await page.fill('[data-testid="contact-person"]', '张总经理');
    await page.fill('[data-testid="contact-phone"]', '13800138001');
    await page.fill('[data-testid="contact-email"]', 'zhang@newtech.com');
    
    // 填写公司信息
    await page.fill('[data-testid="company-address"]', '北京市朝阳区科技园区1号楼');
    await page.fill('[data-testid="business-license"]', '91110000123456789X');
    await page.fill('[data-testid="registration-capital"]', '1000');
    
    // 设置合同信息
    await page.fill('[data-testid="contract-start-date"]', '2024-01-01');
    await page.fill('[data-testid="contract-end-date"]', '2025-12-31');
    await page.fill('[data-testid="monthly-rent"]', '50000');
    
    // 上传相关文件
    await page.setInputFiles('[data-testid="business-license-file"]', 'tests/e2e/fixtures/files/business-license.pdf');
    await page.setInputFiles('[data-testid="contract-file"]', 'tests/e2e/fixtures/files/contract.pdf');
    
    // 提交表单
    await page.click('[data-testid="submit-merchant-button"]');
    
    // 验证成功提示
    await expect(page.locator('[data-testid="success-message"]')).toContainText('商户创建成功');
    
    // 验证商户出现在列表中
    await expect(page.locator('[data-testid="merchant-row"]').filter({ hasText: '新测试科技公司' })).toBeVisible();
    
    // 验证商户详细信息
    const merchantRow = page.locator('[data-testid="merchant-row"]').filter({ hasText: '新测试科技公司' });
    await expect(merchantRow.locator('[data-testid="merchant-code"]')).toContainText('NEW_TECH_001');
    await expect(merchantRow.locator('[data-testid="contact-person"]')).toContainText('张总经理');
    await expect(merchantRow.locator('[data-testid="merchant-status"]')).toContainText('激活');
  });

  test('编辑商户信息流程', async ({ page }) => {
    // 找到要编辑的商户行
    const merchantRow = page.locator('[data-testid="merchant-row"]').first();
    
    // 点击编辑按钮
    await merchantRow.locator('[data-testid="edit-merchant-button"]').click();
    
    // 验证编辑对话框打开
    await expect(page.locator('[data-testid="edit-merchant-modal"]')).toBeVisible();
    
    // 修改商户信息
    await page.fill('[data-testid="contact-person"]', '李新经理');
    await page.fill('[data-testid="contact-phone"]', '13900139001');
    await page.fill('[data-testid="contact-email"]', 'li@newtech.com');
    
    // 修改合同信息
    await page.fill('[data-testid="monthly-rent"]', '55000');
    
    // 添加备注
    await page.fill('[data-testid="merchant-notes"]', '联系人已更换，租金已调整');
    
    // 提交修改
    await page.click('[data-testid="update-merchant-button"]');
    
    // 验证成功提示
    await expect(page.locator('[data-testid="success-message"]')).toContainText('商户信息更新成功');
    
    // 验证信息已更新
    await expect(merchantRow.locator('[data-testid="contact-person"]')).toContainText('李新经理');
  });

  test('商户空间分配流程', async ({ page }) => {
    // 选择商户
    const merchantRow = page.locator('[data-testid="merchant-row"]').first();
    
    // 点击空间管理按钮
    await merchantRow.locator('[data-testid="manage-spaces-button"]').click();
    
    // 验证空间管理对话框打开
    await expect(page.locator('[data-testid="spaces-management-modal"]')).toBeVisible();
    
    // 查看当前分配的空间
    const currentSpaces = page.locator('[data-testid="current-space-item"]');
    const currentCount = await currentSpaces.count();
    
    // 添加新空间
    await page.click('[data-testid="add-space-button"]');
    
    // 选择可用空间
    await page.click('[data-testid="available-space-item"]').first();
    
    // 设置空间使用信息
    await page.fill('[data-testid="space-start-date"]', '2024-01-01');
    await page.fill('[data-testid="space-end-date"]', '2024-12-31');
    await page.fill('[data-testid="space-capacity"]', '20');
    
    // 确认分配
    await page.click('[data-testid="confirm-space-allocation"]');
    
    // 验证空间已添加
    const updatedSpaces = page.locator('[data-testid="current-space-item"]');
    const updatedCount = await updatedSpaces.count();
    expect(updatedCount).toBe(currentCount + 1);
    
    // 修改空间配置
    await updatedSpaces.last().locator('[data-testid="edit-space-config"]').click();
    await page.fill('[data-testid="space-capacity"]', '25');
    await page.click('[data-testid="save-space-config"]');
    
    // 保存空间分配
    await page.click('[data-testid="save-spaces-button"]');
    
    // 验证成功提示
    await expect(page.locator('[data-testid="success-message"]')).toContainText('空间分配已更新');
  });

  test('商户员工管理流程', async ({ page }) => {
    // 选择商户
    const merchantRow = page.locator('[data-testid="merchant-row"]').first();
    
    // 点击员工管理按钮
    await merchantRow.locator('[data-testid="manage-employees-button"]').click();
    
    // 验证员工管理页面
    await expect(page).toHaveURL(/.*\/merchants\/\d+\/employees/);
    
    // 添加新员工
    await page.click('[data-testid="add-employee-button"]');
    
    // 填写员工信息
    await page.fill('[data-testid="employee-name"]', '王工程师');
    await page.fill('[data-testid="employee-email"]', 'wang@company.com');
    await page.fill('[data-testid="employee-phone"]', '13700137001');
    await page.fill('[data-testid="employee-department"]', '技术部');
    await page.fill('[data-testid="employee-position"]', '高级工程师');
    
    // 设置员工权限
    await page.check('[data-testid="permission-visitor-approve"]');
    await page.check('[data-testid="permission-access-records-view"]');
    
    // 提交员工信息
    await page.click('[data-testid="submit-employee-button"]');
    
    // 验证员工添加成功
    await expect(page.locator('[data-testid="success-message"]')).toContainText('员工添加成功');
    await expect(page.locator('[data-testid="employee-row"]').filter({ hasText: '王工程师' })).toBeVisible();
    
    // 编辑员工信息
    const employeeRow = page.locator('[data-testid="employee-row"]').filter({ hasText: '王工程师' });
    await employeeRow.locator('[data-testid="edit-employee-button"]').click();
    
    // 修改职位
    await page.fill('[data-testid="employee-position"]', '技术主管');
    
    // 更新权限
    await page.check('[data-testid="permission-employee-manage"]');
    
    // 保存修改
    await page.click('[data-testid="update-employee-button"]');
    
    // 验证修改成功
    await expect(page.locator('[data-testid="success-message"]')).toContainText('员工信息更新成功');
  });

  test('商户财务管理流程', async ({ page }) => {
    // 选择商户
    const merchantRow = page.locator('[data-testid="merchant-row"]').first();
    
    // 点击财务管理按钮
    await merchantRow.locator('[data-testid="financial-management-button"]').click();
    
    // 验证财务管理对话框
    await expect(page.locator('[data-testid="financial-management-modal"]')).toBeVisible();
    
    // 查看账单历史
    await page.click('[data-testid="billing-history-tab"]');
    
    // 验证账单列表
    await expect(page.locator('[data-testid="billing-table"]')).toBeVisible();
    
    // 生成新账单
    await page.click('[data-testid="generate-bill-button"]');
    
    // 选择账单期间
    await page.fill('[data-testid="bill-start-date"]', '2024-01-01');
    await page.fill('[data-testid="bill-end-date"]', '2024-01-31');
    
    // 添加费用项目
    await page.click('[data-testid="add-charge-item"]');
    await page.selectOption('[data-testid="charge-type"]', 'rent');
    await page.fill('[data-testid="charge-amount"]', '50000');
    await page.fill('[data-testid="charge-description"]', '2024年1月租金');
    
    // 添加其他费用
    await page.click('[data-testid="add-charge-item"]');
    await page.selectOption('[data-testid="charge-type"]', 'utilities');
    await page.fill('[data-testid="charge-amount"]', '5000');
    await page.fill('[data-testid="charge-description"]', '水电费');
    
    // 生成账单
    await page.click('[data-testid="generate-bill-confirm"]');
    
    // 验证账单生成成功
    await expect(page.locator('[data-testid="success-message"]')).toContainText('账单生成成功');
    
    // 发送账单
    await page.click('[data-testid="send-bill-button"]');
    await page.selectOption('[data-testid="send-method"]', 'email');
    await page.click('[data-testid="confirm-send-bill"]');
    
    // 验证发送成功
    await expect(page.locator('[data-testid="success-message"]')).toContainText('账单已发送');
  });

  test('商户状态管理流程', async ({ page }) => {
    // 选择商户
    const merchantRow = page.locator('[data-testid="merchant-row"]').first();
    
    // 暂停商户服务
    await merchantRow.locator('[data-testid="merchant-actions-menu"]').click();
    await page.click('[data-testid="suspend-merchant-action"]');
    
    // 填写暂停原因
    await page.fill('[data-testid="suspend-reason"]', '合同到期，暂停服务');
    await page.fill('[data-testid="suspend-notes"]', '等待合同续签');
    
    // 确认暂停
    await page.click('[data-testid="confirm-suspend"]');
    
    // 验证状态更新
    await expect(page.locator('[data-testid="success-message"]')).toContainText('商户已暂停');
    await expect(merchantRow.locator('[data-testid="merchant-status"]')).toContainText('暂停');
    
    // 恢复商户服务
    await merchantRow.locator('[data-testid="merchant-actions-menu"]').click();
    await page.click('[data-testid="resume-merchant-action"]');
    
    // 填写恢复原因
    await page.fill('[data-testid="resume-reason"]', '合同已续签');
    
    // 确认恢复
    await page.click('[data-testid="confirm-resume"]');
    
    // 验证状态更新
    await expect(page.locator('[data-testid="success-message"]')).toContainText('商户已恢复');
    await expect(merchantRow.locator('[data-testid="merchant-status"]')).toContainText('激活');
  });

  test('商户搜索和筛选流程', async ({ page }) => {
    // 使用商户名称搜索
    await page.fill('[data-testid="merchant-search-input"]', '科技');
    await page.click('[data-testid="search-button"]');
    
    // 验证搜索结果
    const searchResults = page.locator('[data-testid="merchant-row"]');
    const count = await searchResults.count();
    
    for (let i = 0; i < count; i++) {
      const merchantName = await searchResults.nth(i).locator('[data-testid="merchant-name"]').textContent();
      expect(merchantName).toContain('科技');
    }
    
    // 清除搜索
    await page.click('[data-testid="clear-search-button"]');
    
    // 使用状态筛选
    await page.click('[data-testid="status-filter-select"]');
    await page.click('[data-testid="filter-active"]');
    
    // 验证筛选结果
    const filteredResults = page.locator('[data-testid="merchant-row"]');
    const filteredCount = await filteredResults.count();
    
    for (let i = 0; i < filteredCount; i++) {
      const status = await filteredResults.nth(i).locator('[data-testid="merchant-status"]').textContent();
      expect(status).toContain('激活');
    }
    
    // 使用类型筛选
    await page.click('[data-testid="type-filter-select"]');
    await page.click('[data-testid="filter-technology"]');
    
    // 验证组合筛选结果
    const combinedResults = page.locator('[data-testid="merchant-row"]');
    const combinedCount = await combinedResults.count();
    
    for (let i = 0; i < combinedCount; i++) {
      const type = await combinedResults.nth(i).locator('[data-testid="merchant-type"]').textContent();
      expect(type).toContain('科技');
    }
  });

  test('商户数据导出流程', async ({ page }) => {
    // 点击导出按钮
    await page.click('[data-testid="export-merchants-button"]');
    
    // 选择导出格式
    await page.click('[data-testid="export-format-excel"]');
    
    // 选择导出字段
    await page.check('[data-testid="export-field-name"]');
    await page.check('[data-testid="export-field-contact"]');
    await page.check('[data-testid="export-field-spaces"]');
    await page.check('[data-testid="export-field-financial"]');
    
    // 设置筛选条件
    await page.selectOption('[data-testid="export-status-filter"]', 'active');
    await page.fill('[data-testid="export-date-from"]', '2024-01-01');
    await page.fill('[data-testid="export-date-to"]', '2024-12-31');
    
    // 执行导出
    await page.click('[data-testid="execute-export-button"]');
    
    // 验证导出成功
    await expect(page.locator('[data-testid="success-message"]')).toContainText('商户数据导出成功');
    
    // 验证下载链接
    await expect(page.locator('[data-testid="download-link"]')).toBeVisible();
  });

  test('商户删除流程', async ({ page }) => {
    // 找到要删除的商户（选择测试商户）
    const testMerchantRow = page.locator('[data-testid="merchant-row"]').filter({ hasText: '测试商户' }).first();
    
    // 点击删除按钮
    await testMerchantRow.locator('[data-testid="delete-merchant-button"]').click();
    
    // 验证删除确认对话框
    await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="delete-warning"]')).toContainText('删除商户将同时删除相关的员工、访客记录等数据');
    
    // 验证依赖关系检查
    await expect(page.locator('[data-testid="dependency-check"]')).toBeVisible();
    
    // 输入确认文本
    await page.fill('[data-testid="delete-confirmation-input"]', '确认删除');
    
    // 确认删除
    await page.click('[data-testid="confirm-delete-button"]');
    
    // 验证成功提示
    await expect(page.locator('[data-testid="success-message"]')).toContainText('商户删除成功');
    
    // 验证商户从列表中消失
    await expect(page.locator('[data-testid="merchant-row"]').filter({ hasText: '测试商户' })).not.toBeVisible();
  });
});
