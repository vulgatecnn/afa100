import { test, expect } from '@playwright/test';
import { TestDataManager } from '../../helpers/test-data-manager';
import { testEnvironmentConfig } from '../../config/test-environment';

/**
 * 用户完整流程集成测试
 * 测试访客申请到通行的完整前后端流程
 * 测试员工入职到日常使用的完整流程
 * 测试管理员操作的完整业务流程
 * 
 * 需求覆盖: 1.1, 2.1, 3.1, 4.1, 5.1
 */

test.describe('用户完整流程集成测试', () => {
  let testDataManager: TestDataManager;

  test.beforeAll(async () => {
    testDataManager = new TestDataManager();
    await testDataManager.loadFixtures();
    await testDataManager.seedDatabase();
  });

  test.afterAll(async () => {
    testDataManager.clearFixtures();
  });

  test.describe('访客申请到通行完整流程', () => {
    test('访客从申请到成功通行的完整业务流程', async ({ page, context }) => {
      // 步骤1: 访客在线申请
      console.log('步骤1: 访客在线申请');
      await page.goto(`${testEnvironmentConfig.frontend.tenantAdmin.baseUrl}/visitor-application`);
      
      // 填写访客基本信息
      await page.fill('[data-testid="visitor-name"]', '李测试访客');
      await page.fill('[data-testid="visitor-phone"]', '13800138001');
      await page.fill('[data-testid="visitor-id-card"]', '110101199001011001');
      await page.fill('[data-testid="visitor-company"]', '测试合作公司');
      
      // 选择要访问的商户
      await page.click('[data-testid="merchant-select"]');
      await page.locator('[data-testid="merchant-option"]').first().click();
      
      // 填写访问信息
      await page.fill('[data-testid="visit-purpose"]', '业务洽谈和技术交流');
      const visitDate = new Date();
      visitDate.setDate(visitDate.getDate() + 1); // 明天
      await page.fill('[data-testid="visit-date"]', visitDate.toISOString().split('T')[0]);
      await page.fill('[data-testid="visit-time-start"]', '09:00');
      await page.fill('[data-testid="visit-time-end"]', '17:00');
      
      // 选择被访问人
      await page.fill('[data-testid="contact-person"]', '张经理');
      await page.fill('[data-testid="contact-phone"]', '13800138002');
      
      // 同意访问协议
      await page.check('[data-testid="agree-terms"]');
      
      // 提交申请
      await page.click('[data-testid="submit-application-button"]');
      
      // 验证申请提交成功
      await expect(page.locator('[data-testid="success-message"]')).toContainText('申请提交成功');
      
      // 获取申请编号
      const applicationNumber = await page.locator('[data-testid="application-number"]').textContent();
      expect(applicationNumber).toBeTruthy();
      console.log(`申请编号: ${applicationNumber || 'N/A'}`);

      // 步骤2: 商户管理员审批申请
      console.log('步骤2: 商户管理员审批申请');
      
      // 打开新标签页作为商户管理员
      const merchantAdminPage = await context.newPage();
      await merchantAdminPage.goto(`${testEnvironmentConfig.frontend.merchantAdmin.baseUrl}/login`);
      
      // 商户管理员登录
      await merchantAdminPage.fill('[data-testid="username"]', 'merchant_admin');
      await merchantAdminPage.fill('[data-testid="password"]', 'password123');
      await merchantAdminPage.click('[data-testid="login-button"]');
      
      // 验证登录成功
      await expect(merchantAdminPage.locator('[data-testid="dashboard"]')).toBeVisible();
      
      // 导航到访客管理页面
      await merchantAdminPage.click('[data-testid="nav-visitors"]');
      await expect(merchantAdminPage).toHaveURL(/.*\/visitors/);
      
      // 查看待审批的访客申请
      await merchantAdminPage.click('[data-testid="pending-applications-tab"]');
      
      // 查找刚提交的申请
      const applicationRow = merchantAdminPage.locator('[data-testid="application-row"]')
        .filter({ hasText: '李测试访客' });
      await expect(applicationRow).toBeVisible();
      
      // 查看申请详情
      await applicationRow.locator('[data-testid="view-details-button"]').click();
      
      // 验证申请详情
      await expect(merchantAdminPage.locator('[data-testid="application-details-modal"]')).toBeVisible();
      await expect(merchantAdminPage.locator('[data-testid="visitor-name"]')).toContainText('李测试访客');
      await expect(merchantAdminPage.locator('[data-testid="visitor-company"]')).toContainText('测试合作公司');
      
      // 批准申请
      await merchantAdminPage.click('[data-testid="approve-application-button"]');
      
      // 填写审批信息
      await merchantAdminPage.fill('[data-testid="approval-notes"]', '申请信息完整，业务需求合理，批准访问');
      await merchantAdminPage.selectOption('[data-testid="access-level"]', 'standard');
      
      // 设置访问限制
      await merchantAdminPage.check('[data-testid="require-escort"]');
      await merchantAdminPage.fill('[data-testid="escort-person"]', '张经理');
      
      // 确认批准
      await merchantAdminPage.click('[data-testid="confirm-approval-button"]');
      
      // 验证批准成功
      await expect(merchantAdminPage.locator('[data-testid="success-message"]')).toContainText('访客申请已批准');
      
      // 验证二维码生成
      await expect(merchantAdminPage.locator('[data-testid="qr-code-generated"]')).toBeVisible();
      
      // 发送通知给访客
      await merchantAdminPage.click('[data-testid="send-notification-button"]');
      await merchantAdminPage.selectOption('[data-testid="notification-method"]', 'sms');
      await merchantAdminPage.click('[data-testid="confirm-send-notification"]');
      
      // 验证通知发送成功
      await expect(merchantAdminPage.locator('[data-testid="success-message"]')).toContainText('通知已发送给访客');

      // 步骤3: 访客查询申请状态并获取通行码
      console.log('步骤3: 访客查询申请状态并获取通行码');
      
      // 回到访客页面
      await page.goto(`${testEnvironmentConfig.frontend.tenantAdmin.baseUrl}/visitor-status`);
      
      // 查询申请状态
      await page.fill('[data-testid="application-number-input"]', applicationNumber || '');
      await page.fill('[data-testid="phone-verification"]', '13800138001');
      await page.click('[data-testid="query-button"]');
      
      // 验证状态更新为已批准
      await expect(page.locator('[data-testid="current-status"]')).toContainText('已批准');
      
      // 下载通行二维码
      await page.click('[data-testid="download-qr-code"]');
      
      // 验证二维码显示
      await expect(page.locator('[data-testid="qr-code-image"]')).toBeVisible();
      
      // 获取二维码数据用于后续验证
      const qrCodeData = await page.locator('[data-testid="qr-code-data"]').getAttribute('data-value');
      expect(qrCodeData).toBeTruthy();
      console.log(`通行码: ${qrCodeData || 'N/A'}`);

      // 步骤4: 门禁系统验证通行
      console.log('步骤4: 门禁系统验证通行');
      
      // 打开门禁验证页面
      const accessControlPage = await context.newPage();
      await accessControlPage.goto(`${testEnvironmentConfig.backend.baseUrl}/access-control`);
      
      // 模拟扫描二维码
      await accessControlPage.fill('[data-testid="qr-code-input"]', qrCodeData || '');
      await accessControlPage.click('[data-testid="verify-qr-code"]');
      
      // 验证通行信息显示
      await expect(accessControlPage.locator('[data-testid="visitor-info-panel"]')).toBeVisible();
      await expect(accessControlPage.locator('[data-testid="visitor-name"]')).toContainText('李测试访客');
      await expect(accessControlPage.locator('[data-testid="visitor-company"]')).toContainText('测试合作公司');
      await expect(accessControlPage.locator('[data-testid="access-level"]')).toContainText('标准访问');
      await expect(accessControlPage.locator('[data-testid="escort-required"]')).toContainText('需要陪同');
      
      // 确认放行
      await accessControlPage.click('[data-testid="grant-access-button"]');
      
      // 记录通行信息
      await accessControlPage.selectOption('[data-testid="access-method"]', 'qr_code');
      await accessControlPage.fill('[data-testid="security-notes"]', '访客身份验证通过，陪同人员确认，正常放行');
      
      // 提交通行记录
      await accessControlPage.click('[data-testid="submit-access-record"]');
      
      // 验证通行成功
      await expect(accessControlPage.locator('[data-testid="access-granted-message"]')).toContainText('通行已授权');
      
      // 获取通行记录ID
      const accessRecordId = await accessControlPage.locator('[data-testid="access-record-id"]').textContent();
      expect(accessRecordId).toBeTruthy();
      console.log(`通行记录ID: ${accessRecordId || 'N/A'}`);

      // 步骤5: 访客离场登记
      console.log('步骤5: 访客离场登记');
      
      // 等待一段时间模拟访问过程
      await page.waitForTimeout(2000);
      
      // 访问离场登记页面
      await accessControlPage.goto(`${testEnvironmentConfig.backend.baseUrl}/access-control/exit`);
      
      // 输入访客信息进行离场登记
      await accessControlPage.fill('[data-testid="visitor-identifier"]', applicationNumber || '');
      await accessControlPage.click('[data-testid="query-visitor-button"]');
      
      // 验证访客信息和入场记录
      await expect(accessControlPage.locator('[data-testid="visitor-info"]')).toBeVisible();
      await expect(accessControlPage.locator('[data-testid="entry-time"]')).toBeVisible();
      
      // 记录离场
      await accessControlPage.click('[data-testid="record-exit-button"]');
      
      // 填写离场信息
      await accessControlPage.selectOption('[data-testid="exit-method"]', 'normal');
      await accessControlPage.fill('[data-testid="exit-notes"]', '访问结束，业务洽谈完成，正常离场');
      
      // 提交离场记录
      await accessControlPage.click('[data-testid="submit-exit-record"]');
      
      // 验证离场成功
      await expect(accessControlPage.locator('[data-testid="exit-recorded-message"]')).toContainText('离场记录已保存');
      
      // 验证访问记录完整性
      await expect(accessControlPage.locator('[data-testid="visit-duration"]')).toBeVisible();

      // 步骤6: 验证完整流程数据一致性
      console.log('步骤6: 验证完整流程数据一致性');
      
      // 商户管理员查看访问记录
      await merchantAdminPage.click('[data-testid="nav-access-records"]');
      
      // 查找今天的访问记录
      const todayRecord = merchantAdminPage.locator('[data-testid="access-record-row"]')
        .filter({ hasText: '李测试访客' });
      await expect(todayRecord).toBeVisible();
      
      // 验证记录完整性
      await expect(todayRecord.locator('[data-testid="entry-time"]')).toBeVisible();
      await expect(todayRecord.locator('[data-testid="exit-time"]')).toBeVisible();
      await expect(todayRecord.locator('[data-testid="visit-status"]')).toContainText('已完成');
      
      console.log('✅ 访客申请到通行完整流程测试通过');
      
      // 清理资源
      await merchantAdminPage.close();
      await accessControlPage.close();
    });

    test('访客申请被拒绝的完整处理流程', async ({ page, context }) => {
      console.log('测试访客申请被拒绝的完整处理流程');
      
      // 步骤1: 访客提交申请
      await page.goto(`${testEnvironmentConfig.frontend.tenantAdmin.baseUrl}/visitor-application`);
      
      // 填写访客信息（故意填写可能被拒绝的信息）
      await page.fill('[data-testid="visitor-name"]', '王可疑访客');
      await page.fill('[data-testid="visitor-phone"]', '13800138999');
      await page.fill('[data-testid="visitor-id-card"]', '110101199001011999');
      await page.fill('[data-testid="visitor-company"]', '未知公司');
      
      // 选择商户
      await page.click('[data-testid="merchant-select"]');
      await page.locator('[data-testid="merchant-option"]').first().click();
      
      // 填写访问信息
      await page.fill('[data-testid="visit-purpose"]', '目的不明确');
      const visitDate = new Date();
      visitDate.setDate(visitDate.getDate() + 1);
      await page.fill('[data-testid="visit-date"]', visitDate.toISOString().split('T')[0]);
      await page.fill('[data-testid="visit-time-start"]', '18:00'); // 非工作时间
      await page.fill('[data-testid="visit-time-end"]', '22:00');
      
      await page.fill('[data-testid="contact-person"]', '不存在的人');
      await page.fill('[data-testid="contact-phone"]', '00000000000');
      
      await page.check('[data-testid="agree-terms"]');
      await page.click('[data-testid="submit-application-button"]');
      
      // 获取申请编号
      const applicationNumber = await page.locator('[data-testid="application-number"]').textContent();
      
      // 步骤2: 商户管理员拒绝申请
      const merchantAdminPage = await context.newPage();
      await merchantAdminPage.goto(`${testEnvironmentConfig.frontend.merchantAdmin.baseUrl}/login`);
      
      await merchantAdminPage.fill('[data-testid="username"]', 'merchant_admin');
      await merchantAdminPage.fill('[data-testid="password"]', 'password123');
      await merchantAdminPage.click('[data-testid="login-button"]');
      
      await merchantAdminPage.click('[data-testid="nav-visitors"]');
      await merchantAdminPage.click('[data-testid="pending-applications-tab"]');
      
      // 找到申请并拒绝
      const applicationRow = merchantAdminPage.locator('[data-testid="application-row"]')
        .filter({ hasText: '王可疑访客' });
      
      await applicationRow.locator('[data-testid="reject-application-button"]').click();
      
      // 填写拒绝信息
      await merchantAdminPage.selectOption('[data-testid="reject-reason"]', 'security_concern');
      await merchantAdminPage.fill('[data-testid="reject-details"]', '访问目的不明确，联系人信息无效，访问时间不合理，存在安全风险');
      
      await merchantAdminPage.click('[data-testid="confirm-reject-button"]');
      
      // 验证拒绝成功
      await expect(merchantAdminPage.locator('[data-testid="success-message"]')).toContainText('访客申请已拒绝');
      
      // 发送拒绝通知
      await merchantAdminPage.click('[data-testid="send-rejection-notification"]');
      await expect(merchantAdminPage.locator('[data-testid="success-message"]')).toContainText('拒绝通知已发送');
      
      // 步骤3: 访客查询被拒绝状态
      await page.goto(`${testEnvironmentConfig.frontend.tenantAdmin.baseUrl}/visitor-status`);
      
      await page.fill('[data-testid="application-number-input"]', applicationNumber || '');
      await page.fill('[data-testid="phone-verification"]', '13800138999');
      await page.click('[data-testid="query-button"]');
      
      // 验证拒绝状态和原因
      await expect(page.locator('[data-testid="current-status"]')).toContainText('已拒绝');
      await expect(page.locator('[data-testid="rejection-reason"]')).toContainText('安全风险');
      await expect(page.locator('[data-testid="rejection-details"]')).toBeVisible();
      
      // 验证无法获取通行码
      await expect(page.locator('[data-testid="qr-code-section"]')).not.toBeVisible();
      
      console.log('✅ 访客申请拒绝流程测试通过');
      
      await merchantAdminPage.close();
    });
  });

  test.describe('员工入职到日常使用完整流程', () => {
    test('新员工从入职到日常通行的完整业务流程', async ({ page, context }) => {
      console.log('测试新员工从入职到日常通行的完整业务流程');
      
      // 步骤1: 租务管理员创建商户
      await page.goto(`${testEnvironmentConfig.frontend.tenantAdmin.baseUrl}/login`);
      
      // 租务管理员登录
      await page.fill('[data-testid="username"]', 'tenant_admin');
      await page.fill('[data-testid="password"]', 'admin123');
      await page.click('[data-testid="login-button"]');
      
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
      
      // 创建新商户
      await page.click('[data-testid="nav-merchants"]');
      await page.click('[data-testid="add-merchant-button"]');
      
      await page.fill('[data-testid="merchant-name"]', '新入驻科技公司');
      await page.fill('[data-testid="merchant-code"]', 'TECH001');
      await page.fill('[data-testid="contact-person"]', '李总经理');
      await page.fill('[data-testid="contact-phone"]', '13800138100');
      await page.fill('[data-testid="contact-email"]', 'admin@tech001.com');
      
      // 设置商户权限
      await page.selectOption('[data-testid="max-employees"]', '50');
      await page.selectOption('[data-testid="max-visitors"]', '20');
      await page.check('[data-testid="allow-weekend-access"]');
      
      await page.click('[data-testid="create-merchant-button"]');
      
      // 验证商户创建成功
      await expect(page.locator('[data-testid="success-message"]')).toContainText('商户创建成功');
      
      const merchantId = await page.locator('[data-testid="merchant-id"]').textContent();
      console.log(`新商户ID: ${merchantId || 'N/A'}`);

      // 步骤2: 商户管理员账号设置
      await page.click('[data-testid="setup-admin-account"]');
      
      await page.fill('[data-testid="admin-username"]', 'tech001_admin');
      await page.fill('[data-testid="admin-password"]', 'TechAdmin123!');
      await page.fill('[data-testid="admin-name"]', '李总经理');
      await page.fill('[data-testid="admin-phone"]', '13800138100');
      
      await page.click('[data-testid="create-admin-button"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('管理员账号创建成功');

      // 步骤3: 商户管理员登录并添加员工
      const merchantAdminPage = await context.newPage();
      await merchantAdminPage.goto(`${testEnvironmentConfig.frontend.merchantAdmin.baseUrl}/login`);
      
      await merchantAdminPage.fill('[data-testid="username"]', 'tech001_admin');
      await merchantAdminPage.fill('[data-testid="password"]', 'TechAdmin123!');
      await merchantAdminPage.click('[data-testid="login-button"]');
      
      await expect(merchantAdminPage.locator('[data-testid="dashboard"]')).toBeVisible();
      
      // 添加新员工
      await merchantAdminPage.click('[data-testid="nav-employees"]');
      await merchantAdminPage.click('[data-testid="add-employee-button"]');
      
      await merchantAdminPage.fill('[data-testid="employee-name"]', '张工程师');
      await merchantAdminPage.fill('[data-testid="employee-phone"]', '13800138101');
      await merchantAdminPage.fill('[data-testid="employee-email"]', 'zhang@tech001.com');
      await merchantAdminPage.fill('[data-testid="employee-id-card"]', '110101199001011101');
      
      // 设置员工信息
      await merchantAdminPage.selectOption('[data-testid="department"]', 'engineering');
      await merchantAdminPage.selectOption('[data-testid="position"]', 'senior_engineer');
      await merchantAdminPage.fill('[data-testid="employee-number"]', 'EMP001');
      
      // 设置通行权限
      await merchantAdminPage.check('[data-testid="access-weekdays"]');
      await merchantAdminPage.check('[data-testid="access-weekends"]');
      await merchantAdminPage.selectOption('[data-testid="access-level"]', 'standard');
      
      await merchantAdminPage.click('[data-testid="create-employee-button"]');
      
      await expect(merchantAdminPage.locator('[data-testid="success-message"]')).toContainText('员工添加成功');
      
      const employeeId = await merchantAdminPage.locator('[data-testid="employee-id"]').textContent();
      console.log(`新员工ID: ${employeeId || 'N/A'}`);

      // 步骤4: 生成员工通行码
      await merchantAdminPage.click('[data-testid="generate-employee-passcode"]');
      
      // 设置通行码参数
      await merchantAdminPage.selectOption('[data-testid="passcode-type"]', 'permanent');
      await merchantAdminPage.selectOption('[data-testid="access-areas"]', 'all_floors');
      
      await merchantAdminPage.click('[data-testid="confirm-generate-passcode"]');
      
      await expect(merchantAdminPage.locator('[data-testid="success-message"]')).toContainText('通行码生成成功');
      
      // 验证通行码信息
      await expect(merchantAdminPage.locator('[data-testid="employee-qr-code"]')).toBeVisible();
      
      const employeePasscode = await merchantAdminPage.locator('[data-testid="passcode-data"]').getAttribute('data-value');
      console.log(`员工通行码: ${employeePasscode || 'N/A'}`);

      // 步骤5: 员工首次通行验证
      const accessControlPage = await context.newPage();
      await accessControlPage.goto(`${testEnvironmentConfig.backend.baseUrl}/access-control`);
      
      // 模拟员工刷卡/扫码进入
      await accessControlPage.fill('[data-testid="qr-code-input"]', employeePasscode || '');
      await accessControlPage.click('[data-testid="verify-qr-code"]');
      
      // 验证员工信息显示
      await expect(accessControlPage.locator('[data-testid="employee-info-panel"]')).toBeVisible();
      await expect(accessControlPage.locator('[data-testid="employee-name"]')).toContainText('张工程师');
      await expect(accessControlPage.locator('[data-testid="employee-number"]')).toContainText('EMP001');
      await expect(accessControlPage.locator('[data-testid="department"]')).toContainText('工程部');
      await expect(accessControlPage.locator('[data-testid="access-level"]')).toContainText('标准访问');
      
      // 确认员工通行
      await accessControlPage.click('[data-testid="grant-access-button"]');
      
      await accessControlPage.selectOption('[data-testid="access-method"]', 'qr_code');
      await accessControlPage.fill('[data-testid="security-notes"]', '新员工首次通行，身份验证通过');
      
      await accessControlPage.click('[data-testid="submit-access-record"]');
      
      await expect(accessControlPage.locator('[data-testid="access-granted-message"]')).toContainText('通行已授权');

      // 步骤6: 模拟日常多次通行
      console.log('步骤6: 模拟员工日常多次通行');
      
      // 模拟一周内的多次进出
      for (let day = 0; day < 5; day++) {
        // 上班打卡
        await accessControlPage.fill('[data-testid="qr-code-input"]', employeePasscode || '');
        await accessControlPage.click('[data-testid="verify-qr-code"]');
        await accessControlPage.click('[data-testid="grant-access-button"]');
        await accessControlPage.selectOption('[data-testid="access-method"]', 'qr_code');
        await accessControlPage.fill('[data-testid="security-notes"]', `第${day + 1}天上班打卡`);
        await accessControlPage.click('[data-testid="submit-access-record"]');
        
        await expect(accessControlPage.locator('[data-testid="access-granted-message"]')).toContainText('通行已授权');
        
        // 等待一小段时间
        await page.waitForTimeout(500);
        
        // 下班打卡
        await accessControlPage.goto(`${testEnvironmentConfig.backend.baseUrl}/access-control/exit`);
        await accessControlPage.fill('[data-testid="employee-identifier"]', employeeId || '');
        await accessControlPage.click('[data-testid="query-employee-button"]');
        await accessControlPage.click('[data-testid="record-exit-button"]');
        await accessControlPage.selectOption('[data-testid="exit-method"]', 'normal');
        await accessControlPage.fill('[data-testid="exit-notes"]', `第${day + 1}天下班`);
        await accessControlPage.click('[data-testid="submit-exit-record"]');
        
        await expect(accessControlPage.locator('[data-testid="exit-recorded-message"]')).toContainText('离场记录已保存');
        
        // 回到入口页面准备下次测试
        await accessControlPage.goto(`${testEnvironmentConfig.backend.baseUrl}/access-control`);
      }

      // 步骤7: 验证员工通行记录统计
      await merchantAdminPage.click('[data-testid="nav-reports"]');
      await merchantAdminPage.click('[data-testid="employee-attendance-tab"]');
      
      // 设置查询时间范围
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      await merchantAdminPage.fill('[data-testid="date-range-start"]', startDate.toISOString().split('T')[0]);
      await merchantAdminPage.fill('[data-testid="date-range-end"]', new Date().toISOString().split('T')[0]);
      
      // 查询员工考勤记录
      await merchantAdminPage.click('[data-testid="query-attendance-button"]');
      
      // 验证考勤统计
      const attendanceRecord = merchantAdminPage.locator('[data-testid="attendance-record"]')
        .filter({ hasText: '张工程师' });
      await expect(attendanceRecord).toBeVisible();
      
      // 验证出勤天数
      await expect(attendanceRecord.locator('[data-testid="attendance-days"]')).toContainText('5');
      
      // 验证通行次数
      await expect(attendanceRecord.locator('[data-testid="access-count"]')).toContainText('10'); // 5天 * 2次(进出)
      
      console.log('✅ 员工入职到日常使用完整流程测试通过');
      
      await merchantAdminPage.close();
      await accessControlPage.close();
    });

    test('员工权限变更和通行码更新流程', async ({ page, context }) => {
      console.log('测试员工权限变更和通行码更新流程');
      
      // 使用现有员工数据
      const testEmployee = testDataManager.getUserByRole('employee');
      
      // 商户管理员登录
      await page.goto(`${testEnvironmentConfig.frontend.merchantAdmin.baseUrl}/login`);
      await page.fill('[data-testid="username"]', 'merchant_admin');
      await page.fill('[data-testid="password"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // 导航到员工管理
      await page.click('[data-testid="nav-employees"]');
      
      // 查找员工
      const employeeRow = page.locator('[data-testid="employee-row"]')
        .filter({ hasText: testEmployee.name });
      
      // 修改员工权限
      await employeeRow.locator('[data-testid="edit-employee-button"]').click();
      
      // 升级访问权限
      await page.selectOption('[data-testid="access-level"]', 'elevated');
      await page.check('[data-testid="access-restricted-areas"]');
      await page.selectOption('[data-testid="position"]', 'team_lead');
      
      await page.click('[data-testid="save-employee-changes"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('员工信息已更新');
      
      // 重新生成通行码
      await page.click('[data-testid="regenerate-passcode-button"]');
      await page.click('[data-testid="confirm-regenerate"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('通行码已更新');
      
      // 验证新通行码
      const newPasscode = await page.locator('[data-testid="passcode-data"]').getAttribute('data-value');
      expect(newPasscode).toBeTruthy();
      
      // 测试新权限通行
      const accessControlPage = await context.newPage();
      await accessControlPage.goto(`${testEnvironmentConfig.backend.baseUrl}/access-control`);
      
      await accessControlPage.fill('[data-testid="qr-code-input"]', newPasscode || '');
      await accessControlPage.click('[data-testid="verify-qr-code"]');
      
      // 验证权限升级
      await expect(accessControlPage.locator('[data-testid="access-level"]')).toContainText('高级访问');
      await expect(accessControlPage.locator('[data-testid="restricted-areas-access"]')).toContainText('允许');
      
      console.log('✅ 员工权限变更流程测试通过');
      
      await accessControlPage.close();
    });
  });

  test.describe('管理员操作完整业务流程', () => {
    test('租务管理员系统管理完整流程', async ({ page, context }) => {
      console.log('测试租务管理员系统管理完整流程');
      
      // 步骤1: 租务管理员登录
      await page.goto(`${testEnvironmentConfig.frontend.tenantAdmin.baseUrl}/login`);
      
      await page.fill('[data-testid="username"]', 'tenant_admin');
      await page.fill('[data-testid="password"]', 'admin123');
      await page.click('[data-testid="login-button"]');
      
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

      // 步骤2: 系统概览和监控
      await page.click('[data-testid="nav-dashboard"]');
      
      // 验证系统概览数据
      await expect(page.locator('[data-testid="total-merchants"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-employees"]')).toBeVisible();
      await expect(page.locator('[data-testid="today-visitors"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-access-records"]')).toBeVisible();
      
      // 查看实时监控
      await page.click('[data-testid="real-time-monitoring-tab"]');
      
      await expect(page.locator('[data-testid="online-devices"]')).toBeVisible();
      await expect(page.locator('[data-testid="current-occupancy"]')).toBeVisible();
      await expect(page.locator('[data-testid="security-alerts"]')).toBeVisible();

      // 步骤3: 商户管理操作
      await page.click('[data-testid="nav-merchants"]');
      
      // 查看商户列表
      await expect(page.locator('[data-testid="merchants-table"]')).toBeVisible();
      
      // 筛选活跃商户
      await page.selectOption('[data-testid="status-filter"]', 'active');
      await page.click('[data-testid="apply-filter-button"]');
      
      // 查看商户详情
      const firstMerchant = page.locator('[data-testid="merchant-row"]').first();
      await firstMerchant.locator('[data-testid="view-details-button"]').click();
      
      // 验证商户详情信息
      await expect(page.locator('[data-testid="merchant-details-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="merchant-employees-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="merchant-visitors-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="merchant-access-stats"]')).toBeVisible();
      
      await page.click('[data-testid="close-modal-button"]');

      // 步骤4: 空间和设备管理
      await page.click('[data-testid="nav-spaces"]');
      
      // 查看空间配置
      await expect(page.locator('[data-testid="spaces-tree"]')).toBeVisible();
      
      // 添加新楼层
      await page.click('[data-testid="add-floor-button"]');
      
      await page.fill('[data-testid="floor-name"]', '测试楼层15F');
      await page.fill('[data-testid="floor-code"]', 'FL15');
      await page.selectOption('[data-testid="building-select"]', '1'); // 选择建筑
      
      await page.click('[data-testid="create-floor-button"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('楼层创建成功');
      
      // 配置门禁设备
      await page.click('[data-testid="nav-devices"]');
      
      await page.click('[data-testid="add-device-button"]');
      
      await page.fill('[data-testid="device-name"]', '15F入口门禁');
      await page.fill('[data-testid="device-code"]', 'DEV15F001');
      await page.selectOption('[data-testid="device-type"]', 'qr_scanner');
      await page.selectOption('[data-testid="device-location"]', '15'); // 选择楼层
      
      await page.click('[data-testid="create-device-button"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('设备添加成功');

      // 步骤5: 安全管理和权限控制
      await page.click('[data-testid="nav-security"]');
      
      // 查看安全日志
      await page.click('[data-testid="security-logs-tab"]');
      
      // 设置日志查询条件
      const today = new Date().toISOString().split('T')[0];
      await page.fill('[data-testid="log-date-start"]', today);
      await page.fill('[data-testid="log-date-end"]', today);
      await page.selectOption('[data-testid="log-level"]', 'warning');
      
      await page.click('[data-testid="query-logs-button"]');
      
      // 验证安全日志显示
      await expect(page.locator('[data-testid="security-logs-table"]')).toBeVisible();
      
      // 查看访问控制规则
      await page.click('[data-testid="access-rules-tab"]');
      
      // 添加新的访问规则
      await page.click('[data-testid="add-rule-button"]');
      
      await page.fill('[data-testid="rule-name"]', '夜间访问限制');
      await page.selectOption('[data-testid="rule-type"]', 'time_restriction');
      await page.fill('[data-testid="start-time"]', '22:00');
      await page.fill('[data-testid="end-time"]', '06:00');
      await page.selectOption('[data-testid="affected-areas"]', 'all');
      
      await page.click('[data-testid="create-rule-button"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('访问规则创建成功');

      // 步骤6: 系统报表和分析
      await page.click('[data-testid="nav-reports"]');
      
      // 生成综合统计报表
      await page.click('[data-testid="comprehensive-report-tab"]');
      
      // 设置报表参数
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // 最近30天
      await page.fill('[data-testid="report-date-start"]', startDate.toISOString().split('T')[0]);
      await page.fill('[data-testid="report-date-end"]', today);
      
      await page.check('[data-testid="include-merchants"]');
      await page.check('[data-testid="include-employees"]');
      await page.check('[data-testid="include-visitors"]');
      await page.check('[data-testid="include-access-records"]');
      
      await page.click('[data-testid="generate-report-button"]');
      
      // 验证报表生成
      await expect(page.locator('[data-testid="report-generating"]')).toBeVisible();
      
      // 等待报表生成完成
      await expect(page.locator('[data-testid="report-completed"]')).toBeVisible({ timeout: 30000 });
      
      // 验证报表内容
      await expect(page.locator('[data-testid="merchants-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="employees-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="visitors-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="access-trends-chart"]')).toBeVisible();
      
      // 导出报表
      await page.click('[data-testid="export-report-button"]');
      await page.selectOption('[data-testid="export-format"]', 'pdf');
      await page.click('[data-testid="confirm-export"]');
      
      await expect(page.locator('[data-testid="export-success-message"]')).toContainText('报表导出成功');

      // 步骤7: 系统配置和维护
      await page.click('[data-testid="nav-settings"]');
      
      // 系统参数配置
      await page.click('[data-testid="system-config-tab"]');
      
      // 更新系统配置
      await page.fill('[data-testid="max-concurrent-visitors"]', '200');
      await page.fill('[data-testid="visitor-code-validity"]', '24'); // 24小时
      await page.check('[data-testid="enable-face-recognition"]');
      await page.check('[data-testid="enable-sms-notifications"]');
      
      await page.click('[data-testid="save-config-button"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('系统配置已更新');
      
      // 数据备份
      await page.click('[data-testid="backup-tab"]');
      
      await page.click('[data-testid="create-backup-button"]');
      await page.fill('[data-testid="backup-description"]', '月度系统备份');
      await page.click('[data-testid="confirm-backup"]');
      
      await expect(page.locator('[data-testid="backup-in-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="backup-completed"]')).toBeVisible({ timeout: 60000 });

      console.log('✅ 租务管理员系统管理完整流程测试通过');
    });

    test('商户管理员日常管理完整流程', async ({ page, context }) => {
      console.log('测试商户管理员日常管理完整流程');
      
      // 商户管理员登录
      await page.goto(`${testEnvironmentConfig.frontend.merchantAdmin.baseUrl}/login`);
      
      await page.fill('[data-testid="username"]', 'merchant_admin');
      await page.fill('[data-testid="password"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

      // 步骤1: 日常仪表板检查
      await page.click('[data-testid="nav-dashboard"]');
      
      // 查看今日概况
      await expect(page.locator('[data-testid="today-employees-present"]')).toBeVisible();
      await expect(page.locator('[data-testid="today-visitors-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="pending-applications"]')).toBeVisible();
      await expect(page.locator('[data-testid="security-alerts"]')).toBeVisible();

      // 步骤2: 处理待审批访客申请
      await page.click('[data-testid="nav-visitors"]');
      await page.click('[data-testid="pending-applications-tab"]');
      
      // 批量处理申请
      const pendingCount = await page.locator('[data-testid="application-row"]').count();
      
      if (pendingCount > 0) {
        // 选择前3个申请进行批量审批
        for (let i = 0; i < Math.min(3, pendingCount); i++) {
          await page.check(`[data-testid="application-checkbox"]:nth-child(${i + 1})`);
        }
        
        await page.click('[data-testid="batch-approve-button"]');
        await page.selectOption('[data-testid="batch-access-level"]', 'standard');
        await page.fill('[data-testid="batch-approval-notes"]', '日常业务访问，批量审批通过');
        await page.click('[data-testid="confirm-batch-approval"]');
        
        await expect(page.locator('[data-testid="success-message"]')).toContainText('批量审批完成');
      }

      // 步骤3: 员工考勤管理
      await page.click('[data-testid="nav-employees"]');
      
      // 查看今日考勤
      await page.click('[data-testid="attendance-today-tab"]');
      
      // 验证考勤数据
      await expect(page.locator('[data-testid="attendance-summary"]')).toBeVisible();
      
      // 处理异常考勤
      const lateEmployees = page.locator('[data-testid="late-employee-row"]');
      const lateCount = await lateEmployees.count();
      
      if (lateCount > 0) {
        // 为迟到员工添加备注
        await lateEmployees.first().locator('[data-testid="add-note-button"]').click();
        await page.fill('[data-testid="attendance-note"]', '交通拥堵导致迟到，已沟通');
        await page.click('[data-testid="save-note-button"]');
        
        await expect(page.locator('[data-testid="success-message"]')).toContainText('考勤备注已保存');
      }

      // 步骤4: 访客接待管理
      await page.click('[data-testid="nav-reception"]');
      
      // 查看当前在场访客
      await page.click('[data-testid="current-visitors-tab"]');
      
      // 验证访客状态
      await expect(page.locator('[data-testid="visitors-list"]')).toBeVisible();
      
      // 为访客安排陪同
      const currentVisitors = page.locator('[data-testid="visitor-row"]');
      const visitorCount = await currentVisitors.count();
      
      if (visitorCount > 0) {
        await currentVisitors.first().locator('[data-testid="assign-escort-button"]').click();
        await page.selectOption('[data-testid="escort-employee"]', '1'); // 选择员工
        await page.fill('[data-testid="escort-notes"]', '安排技术部门对接');
        await page.click('[data-testid="confirm-escort"]');
        
        await expect(page.locator('[data-testid="success-message"]')).toContainText('陪同安排已确认');
      }

      // 步骤5: 安全监控
      await page.click('[data-testid="nav-security"]');
      
      // 查看实时监控
      await page.click('[data-testid="live-monitoring-tab"]');
      
      // 验证监控面板
      await expect(page.locator('[data-testid="access-points-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="current-occupancy"]')).toBeVisible();
      
      // 处理安全警报
      const securityAlerts = page.locator('[data-testid="security-alert"]');
      const alertCount = await securityAlerts.count();
      
      if (alertCount > 0) {
        await securityAlerts.first().locator('[data-testid="handle-alert-button"]').click();
        await page.selectOption('[data-testid="alert-action"]', 'investigated');
        await page.fill('[data-testid="alert-resolution"]', '已核实，为正常业务访问');
        await page.click('[data-testid="resolve-alert-button"]');
        
        await expect(page.locator('[data-testid="success-message"]')).toContainText('警报已处理');
      }

      // 步骤6: 生成日报
      await page.click('[data-testid="nav-reports"]');
      await page.click('[data-testid="daily-report-tab"]');
      
      // 生成今日报表
      const today = new Date().toISOString().split('T')[0];
      await page.fill('[data-testid="report-date"]', today);
      await page.click('[data-testid="generate-daily-report"]');
      
      // 验证报表内容
      await expect(page.locator('[data-testid="daily-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="employee-attendance-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="visitor-activity-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="security-events-summary"]')).toBeVisible();
      
      // 发送日报
      await page.click('[data-testid="send-daily-report"]');
      await page.check('[data-testid="send-to-tenant-admin"]');
      await page.check('[data-testid="send-to-security"]');
      await page.click('[data-testid="confirm-send-report"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('日报已发送');

      console.log('✅ 商户管理员日常管理完整流程测试通过');
    });
  });
});