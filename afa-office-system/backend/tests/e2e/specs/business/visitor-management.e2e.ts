import { test, expect } from '@playwright/test';

/**
 * 访客管理业务流程端到端测试
 * 测试访客申请、审批、通行码生成和访问记录
 */

test.describe('访客管理流程测试', () => {

  test.describe('商户管理员访客管理', () => {
    // 使用商户管理员身份进行测试
    test.use({ 
      storageState: 'tests/e2e/fixtures/auth-states/merchant-admin.json' 
    });

    test.beforeEach(async ({ page }) => {
      // 导航到访客管理页面
      await page.goto('http://localhost:3002/dashboard');
      await page.click('[data-testid="nav-visitors"]');
      await expect(page).toHaveURL(/.*\/visitors/);
    });

    test('访客申请审批流程', async ({ page }) => {
      // 查看待审批的访客申请
      await page.click('[data-testid="pending-applications-tab"]');
      
      // 验证待审批列表
      await expect(page.locator('[data-testid="pending-applications-table"]')).toBeVisible();
      
      // 选择第一个待审批申请
      const firstApplication = page.locator('[data-testid="application-row"]').first();
      
      // 查看申请详情
      await firstApplication.locator('[data-testid="view-details-button"]').click();
      
      // 验证申请详情对话框
      await expect(page.locator('[data-testid="application-details-modal"]')).toBeVisible();
      
      // 验证访客信息
      await expect(page.locator('[data-testid="visitor-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="visitor-phone"]')).toBeVisible();
      await expect(page.locator('[data-testid="visitor-company"]')).toBeVisible();
      await expect(page.locator('[data-testid="visit-purpose"]')).toBeVisible();
      await expect(page.locator('[data-testid="visit-date"]')).toBeVisible();
      await expect(page.locator('[data-testid="visit-time"]')).toBeVisible();
      
      // 批准申请
      await page.click('[data-testid="approve-application-button"]');
      
      // 填写审批信息
      await page.fill('[data-testid="approval-notes"]', '申请信息完整，批准访问');
      await page.selectOption('[data-testid="access-level"]', 'standard');
      
      // 设置访问限制
      await page.check('[data-testid="require-escort"]');
      await page.fill('[data-testid="escort-person"]', '张经理');
      
      // 确认批准
      await page.click('[data-testid="confirm-approval-button"]');
      
      // 验证批准成功
      await expect(page.locator('[data-testid="success-message"]')).toContainText('访客申请已批准');
      
      // 验证二维码生成
      await expect(page.locator('[data-testid="qr-code-generated"]')).toBeVisible();
      
      // 发送通知给访客
      await page.click('[data-testid="send-notification-button"]');
      await page.selectOption('[data-testid="notification-method"]', 'sms');
      await page.click('[data-testid="confirm-send-notification"]');
      
      // 验证通知发送成功
      await expect(page.locator('[data-testid="success-message"]')).toContainText('通知已发送给访客');
    });

    test('访客申请拒绝流程', async ({ page }) => {
      // 选择待审批申请
      const applicationRow = page.locator('[data-testid="application-row"]').first();
      
      // 点击拒绝按钮
      await applicationRow.locator('[data-testid="reject-application-button"]').click();
      
      // 验证拒绝确认对话框
      await expect(page.locator('[data-testid="reject-confirmation-modal"]')).toBeVisible();
      
      // 选择拒绝原因
      await page.selectOption('[data-testid="reject-reason"]', 'security_concern');
      
      // 填写详细说明
      await page.fill('[data-testid="reject-details"]', '访问时间与公司安排冲突，建议重新申请');
      
      // 确认拒绝
      await page.click('[data-testid="confirm-reject-button"]');
      
      // 验证拒绝成功
      await expect(page.locator('[data-testid="success-message"]')).toContainText('访客申请已拒绝');
      
      // 发送拒绝通知
      await page.click('[data-testid="send-rejection-notification"]');
      
      // 验证通知发送
      await expect(page.locator('[data-testid="success-message"]')).toContainText('拒绝通知已发送');
    });

    test('批量审批流程', async ({ page }) => {
      // 选择多个待审批申请
      await page.check('[data-testid="application-checkbox"]', { nth: 0 });
      await page.check('[data-testid="application-checkbox"]', { nth: 1 });
      await page.check('[data-testid="application-checkbox"]', { nth: 2 });
      
      // 验证批量操作工具栏
      await expect(page.locator('[data-testid="batch-operations-toolbar"]')).toBeVisible();
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('已选择 3 个申请');
      
      // 批量批准
      await page.click('[data-testid="batch-approve-button"]');
      
      // 设置批量审批参数
      await page.selectOption('[data-testid="batch-access-level"]', 'standard');
      await page.fill('[data-testid="batch-approval-notes"]', '批量审批通过');
      
      // 确认批量操作
      await page.click('[data-testid="confirm-batch-approval"]');
      
      // 验证批量操作成功
      await expect(page.locator('[data-testid="success-message"]')).toContainText('批量审批完成');
      
      // 验证申请状态更新
      const approvedApplications = page.locator('[data-testid="application-row"][data-status="approved"]');
      const approvedCount = await approvedApplications.count();
      expect(approvedCount).toBeGreaterThanOrEqual(3);
    });

    test('访客信息修改流程', async ({ page }) => {
      // 切换到已批准申请标签
      await page.click('[data-testid="approved-applications-tab"]');
      
      // 选择已批准的申请
      const approvedApplication = page.locator('[data-testid="application-row"]').first();
      
      // 点击修改按钮
      await approvedApplication.locator('[data-testid="edit-application-button"]').click();
      
      // 验证修改对话框
      await expect(page.locator('[data-testid="edit-application-modal"]')).toBeVisible();
      
      // 修改访问时间
      await page.fill('[data-testid="visit-time-start"]', '10:00');
      await page.fill('[data-testid="visit-time-end"]', '16:00');
      
      // 修改访问目的
      await page.fill('[data-testid="visit-purpose"]', '技术交流和产品演示');
      
      // 更新陪同人员
      await page.fill('[data-testid="escort-person"]', '李工程师');
      
      // 保存修改
      await page.click('[data-testid="save-changes-button"]');
      
      // 验证修改成功
      await expect(page.locator('[data-testid="success-message"]')).toContainText('访客信息已更新');
      
      // 重新生成二维码
      await page.click('[data-testid="regenerate-qr-code"]');
      
      // 验证新二维码生成
      await expect(page.locator('[data-testid="new-qr-code"]')).toBeVisible();
      
      // 发送更新通知
      await page.click('[data-testid="send-update-notification"]');
      
      // 验证通知发送
      await expect(page.locator('[data-testid="success-message"]')).toContainText('更新通知已发送');
    });

    test('访客黑名单管理', async ({ page }) => {
      // 切换到黑名单管理标签
      await page.click('[data-testid="blacklist-management-tab"]');
      
      // 添加访客到黑名单
      await page.click('[data-testid="add-to-blacklist-button"]');
      
      // 填写黑名单信息
      await page.fill('[data-testid="blacklist-name"]', '张某某');
      await page.fill('[data-testid="blacklist-phone"]', '13800138999');
      await page.fill('[data-testid="blacklist-id-card"]', '110101199001011234');
      
      // 选择黑名单原因
      await page.selectOption('[data-testid="blacklist-reason"]', 'security_violation');
      
      // 填写详细说明
      await page.fill('[data-testid="blacklist-details"]', '违反安全规定，禁止再次访问');
      
      // 设置黑名单期限
      await page.selectOption('[data-testid="blacklist-duration"]', 'permanent');
      
      // 确认添加
      await page.click('[data-testid="confirm-add-blacklist"]');
      
      // 验证添加成功
      await expect(page.locator('[data-testid="success-message"]')).toContainText('已添加到黑名单');
      
      // 验证黑名单列表更新
      await expect(page.locator('[data-testid="blacklist-row"]').filter({ hasText: '张某某' })).toBeVisible();
      
      // 移除黑名单
      const blacklistRow = page.locator('[data-testid="blacklist-row"]').filter({ hasText: '张某某' });
      await blacklistRow.locator('[data-testid="remove-blacklist-button"]').click();
      
      // 填写移除原因
      await page.fill('[data-testid="remove-reason"]', '误加入黑名单，现已核实');
      
      // 确认移除
      await page.click('[data-testid="confirm-remove-blacklist"]');
      
      // 验证移除成功
      await expect(page.locator('[data-testid="success-message"]')).toContainText('已从黑名单移除');
    });
  });

  test.describe('访客自助申请流程', () => {
    test('访客在线申请流程', async ({ page }) => {
      // 访问访客申请页面（小程序或Web端）
      await page.goto('http://localhost:3000/visitor-application');
      
      // 填写访客基本信息
      await page.fill('[data-testid="visitor-name"]', '李访客');
      await page.fill('[data-testid="visitor-phone"]', '13700137001');
      await page.fill('[data-testid="visitor-id-card"]', '110101199001011001');
      await page.fill('[data-testid="visitor-company"]', '合作伙伴公司');
      
      // 选择要访问的商户
      await page.click('[data-testid="merchant-select"]');
      await page.click('[data-testid="merchant-option"]').first();
      
      // 填写访问信息
      await page.fill('[data-testid="visit-purpose"]', '商务洽谈');
      await page.fill('[data-testid="visit-date"]', '2024-12-15');
      await page.fill('[data-testid="visit-time-start"]', '09:00');
      await page.fill('[data-testid="visit-time-end"]', '17:00');
      
      // 选择被访问人
      await page.fill('[data-testid="contact-person"]', '张经理');
      await page.fill('[data-testid="contact-phone"]', '13800138001');
      
      // 上传身份证照片
      await page.setInputFiles('[data-testid="id-card-photo"]', 'tests/e2e/fixtures/files/id-card.jpg');
      
      // 同意访问协议
      await page.check('[data-testid="agree-terms"]');
      
      // 提交申请
      await page.click('[data-testid="submit-application-button"]');
      
      // 验证提交成功
      await expect(page.locator('[data-testid="success-message"]')).toContainText('申请提交成功');
      
      // 获取申请编号
      const applicationNumber = await page.locator('[data-testid="application-number"]').textContent();
      expect(applicationNumber).toBeTruthy();
      
      // 验证可以查询申请状态
      await page.fill('[data-testid="query-application-number"]', applicationNumber);
      await page.click('[data-testid="query-status-button"]');
      
      // 验证申请状态显示
      await expect(page.locator('[data-testid="application-status"]')).toContainText('待审批');
    });

    test('访客申请状态查询', async ({ page }) => {
      // 访问状态查询页面
      await page.goto('http://localhost:3000/visitor-status');
      
      // 输入申请编号
      await page.fill('[data-testid="application-number-input"]', 'VA202412150001');
      
      // 输入手机号验证
      await page.fill('[data-testid="phone-verification"]', '13700137001');
      
      // 查询状态
      await page.click('[data-testid="query-button"]');
      
      // 验证状态信息显示
      await expect(page.locator('[data-testid="application-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="visitor-name"]')).toContainText('李访客');
      await expect(page.locator('[data-testid="visit-date"]')).toContainText('2024-12-15');
      await expect(page.locator('[data-testid="current-status"]')).toContainText('已批准');
      
      // 下载通行二维码
      await page.click('[data-testid="download-qr-code"]');
      
      // 验证二维码下载
      await expect(page.locator('[data-testid="qr-code-image"]')).toBeVisible();
      
      // 查看访问须知
      await page.click('[data-testid="view-visit-guidelines"]');
      
      // 验证须知内容
      await expect(page.locator('[data-testid="visit-guidelines-modal"]')).toBeVisible();
    });
  });

  test.describe('访客通行验证', () => {
    test('二维码扫描验证流程', async ({ page }) => {
      // 模拟门禁系统扫码页面
      await page.goto('http://localhost:3000/access-control');
      
      // 模拟扫描二维码（实际中会通过摄像头扫描）
      const qrCodeData = 'VA202412150001_APPROVED_20241215';
      await page.fill('[data-testid="qr-code-input"]', qrCodeData);
      
      // 验证二维码
      await page.click('[data-testid="verify-qr-code"]');
      
      // 验证通行信息显示
      await expect(page.locator('[data-testid="visitor-info-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="visitor-name"]')).toContainText('李访客');
      await expect(page.locator('[data-testid="visitor-company"]')).toContainText('合作伙伴公司');
      await expect(page.locator('[data-testid="visit-purpose"]')).toContainText('商务洽谈');
      
      // 验证访问权限
      await expect(page.locator('[data-testid="access-level"]')).toContainText('标准访问');
      await expect(page.locator('[data-testid="escort-required"]')).toContainText('需要陪同');
      
      // 确认放行
      await page.click('[data-testid="grant-access-button"]');
      
      // 记录通行信息
      await page.selectOption('[data-testid="access-method"]', 'qr_code');
      await page.fill('[data-testid="security-notes"]', '访客身份验证通过，正常放行');
      
      // 提交通行记录
      await page.click('[data-testid="submit-access-record"]');
      
      // 验证通行成功
      await expect(page.locator('[data-testid="access-granted-message"]')).toContainText('通行已授权');
      
      // 验证通行记录生成
      await expect(page.locator('[data-testid="access-record-id"]')).toBeVisible();
    });

    test('访客离场登记', async ({ page }) => {
      // 访问离场登记页面
      await page.goto('http://localhost:3000/access-control/exit');
      
      // 扫描访客二维码或输入信息
      await page.fill('[data-testid="visitor-identifier"]', 'VA202412150001');
      
      // 查询访客信息
      await page.click('[data-testid="query-visitor-button"]');
      
      // 验证访客信息
      await expect(page.locator('[data-testid="visitor-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="entry-time"]')).toBeVisible();
      
      // 记录离场时间
      await page.click('[data-testid="record-exit-button"]');
      
      // 填写离场信息
      await page.selectOption('[data-testid="exit-method"]', 'normal');
      await page.fill('[data-testid="exit-notes"]', '访问结束，正常离场');
      
      // 提交离场记录
      await page.click('[data-testid="submit-exit-record"]');
      
      // 验证离场成功
      await expect(page.locator('[data-testid="exit-recorded-message"]')).toContainText('离场记录已保存');
      
      // 验证访问记录完整
      await expect(page.locator('[data-testid="visit-duration"]')).toBeVisible();
    });
  });

  test.describe('访客数据统计', () => {
    test('访客统计报表查看', async ({ page }) => {
      // 使用商户管理员身份
      await page.goto('http://localhost:3002/login');
      await page.fill('[data-testid="username"]', 'merchant_admin');
      await page.fill('[data-testid="password"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // 导航到统计报表
      await page.click('[data-testid="nav-reports"]');
      await page.click('[data-testid="visitor-statistics-tab"]');
      
      // 设置统计时间范围
      await page.fill('[data-testid="date-range-start"]', '2024-01-01');
      await page.fill('[data-testid="date-range-end"]', '2024-12-31');
      
      // 生成统计报表
      await page.click('[data-testid="generate-report-button"]');
      
      // 验证统计数据
      await expect(page.locator('[data-testid="total-applications"]')).toBeVisible();
      await expect(page.locator('[data-testid="approved-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="rejected-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="pending-count"]')).toBeVisible();
      
      // 查看详细图表
      await expect(page.locator('[data-testid="applications-trend-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="approval-rate-chart"]')).toBeVisible();
      
      // 导出统计报表
      await page.click('[data-testid="export-report-button"]');
      await page.selectOption('[data-testid="export-format"]', 'excel');
      await page.click('[data-testid="confirm-export"]');
      
      // 验证导出成功
      await expect(page.locator('[data-testid="export-success-message"]')).toContainText('报表导出成功');
    });
  });
});