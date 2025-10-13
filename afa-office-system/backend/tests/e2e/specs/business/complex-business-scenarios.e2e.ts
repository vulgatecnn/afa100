import { test, expect } from '@playwright/test';
import { TestDataManager } from '../../helpers/test-data-manager';
import { testEnvironmentConfig } from '../../config/test-environment';

/**
 * 复杂业务场景集成测试
 * 测试多角色协作的复杂业务场景
 * 验证系统在真实使用场景下的前后端协调
 * 测试异常情况下的系统恢复能力
 * 
 * 需求覆盖: 6.1, 6.2
 */

test.describe('复杂业务场景集成测试', () => {
  let testDataManager: TestDataManager;

  test.beforeAll(async () => {
    testDataManager = new TestDataManager();
    await testDataManager.loadFixtures();
    await testDataManager.seedDatabase();
  });

  test.afterAll(async () => {
    testDataManager.clearFixtures();
  });

  test.describe('多角色协作业务场景', () => {
    test('大型会议访客接待多角色协作场景', async ({ browser }) => {
      console.log('测试大型会议访客接待多角色协作场景');
      
      // 创建多个浏览器上下文模拟不同角色
      const tenantAdminContext = await browser.newContext();
      const merchantAdminContext = await browser.newContext();
      const receptionContext = await browser.newContext();
      const securityContext = await browser.newContext();
      
      const tenantAdminPage = await tenantAdminContext.newPage();
      const merchantAdminPage = await merchantAdminContext.newPage();
      const receptionPage = await receptionContext.newPage();
      const securityPage = await securityContext.newPage();

      try {
        // 场景背景: 某科技公司举办大型产品发布会，预计50名外部访客
        
        // 步骤1: 租务管理员预先配置系统容量
        console.log('步骤1: 租务管理员预先配置系统容量');
        
        await tenantAdminPage.goto(`${testEnvironmentConfig.frontend.tenantAdmin.baseUrl}/login`);
        await tenantAdminPage.fill('[data-testid="username"]', 'tenant_admin');
        await tenantAdminPage.fill('[data-testid="password"]', 'admin123');
        await tenantAdminPage.click('[data-testid="login-button"]');
        
        // 调整系统容量配置
        await tenantAdminPage.click('[data-testid="nav-settings"]');
        await tenantAdminPage.click('[data-testid="capacity-management-tab"]');
        
        await tenantAdminPage.fill('[data-testid="max-concurrent-visitors"]', '100');
        await tenantAdminPage.fill('[data-testid="peak-hour-capacity"]', '80');
        await tenantAdminPage.check('[data-testid="enable-overflow-management"]');
        
        await tenantAdminPage.click('[data-testid="save-capacity-config"]');
        await expect(tenantAdminPage.locator('[data-testid="success-message"]')).toContainText('容量配置已更新');
        
        // 启用特殊事件模式
        await tenantAdminPage.click('[data-testid="special-events-tab"]');
        await tenantAdminPage.click('[data-testid="create-event-button"]');
        
        await tenantAdminPage.fill('[data-testid="event-name"]', '科技产品发布会');
        await tenantAdminPage.fill('[data-testid="event-date"]', new Date().toISOString().split('T')[0]);
        await tenantAdminPage.fill('[data-testid="expected-visitors"]', '50');
        await tenantAdminPage.selectOption('[data-testid="event-type"]', 'conference');
        
        await tenantAdminPage.click('[data-testid="create-event"]');
        await expect(tenantAdminPage.locator('[data-testid="success-message"]')).toContainText('特殊事件已创建');

        // 步骤2: 商户管理员批量预审批访客
        console.log('步骤2: 商户管理员批量预审批访客');
        
        await merchantAdminPage.goto(`${testEnvironmentConfig.frontend.merchantAdmin.baseUrl}/login`);
        await merchantAdminPage.fill('[data-testid="username"]', 'merchant_admin');
        await merchantAdminPage.fill('[data-testid="password"]', 'password123');
        await merchantAdminPage.click('[data-testid="login-button"]');
        
        // 创建批量访客申请
        await merchantAdminPage.click('[data-testid="nav-visitors"]');
        await merchantAdminPage.click('[data-testid="batch-import-tab"]');
        
        // 上传访客名单
        await merchantAdminPage.setInputFiles('[data-testid="visitor-list-file"]', 'tests/e2e/fixtures/files/conference-visitors.csv');
        
        await merchantAdminPage.click('[data-testid="preview-import"]');
        
        // 验证导入预览
        await expect(merchantAdminPage.locator('[data-testid="import-preview-table"]')).toBeVisible();
        await expect(merchantAdminPage.locator('[data-testid="visitor-count"]')).toContainText('50');
        
        // 设置批量审批参数
        await merchantAdminPage.selectOption('[data-testid="batch-access-level"]', 'conference');
        await merchantAdminPage.fill('[data-testid="batch-visit-purpose"]', '参加产品发布会');
        await merchantAdminPage.check('[data-testid="auto-approve-all"]');
        
        await merchantAdminPage.click('[data-testid="confirm-batch-import"]');
        
        // 验证批量导入成功
        await expect(merchantAdminPage.locator('[data-testid="batch-import-progress"]')).toBeVisible();
        await expect(merchantAdminPage.locator('[data-testid="import-completed"]')).toBeVisible({ timeout: 30000 });
        
        // 生成批量通行码
        await merchantAdminPage.click('[data-testid="generate-batch-qrcodes"]');
        await merchantAdminPage.selectOption('[data-testid="qrcode-format"]', 'pdf_booklet');
        await merchantAdminPage.click('[data-testid="confirm-generate"]');
        
        await expect(merchantAdminPage.locator('[data-testid="qrcodes-generated"]')).toBeVisible({ timeout: 60000 });

        // 步骤3: 前台接待员准备接待流程
        console.log('步骤3: 前台接待员准备接待流程');
        
        await receptionPage.goto(`${testEnvironmentConfig.frontend.merchantAdmin.baseUrl}/reception`);
        await receptionPage.fill('[data-testid="username"]', 'reception_staff');
        await receptionPage.fill('[data-testid="password"]', 'reception123');
        await receptionPage.click('[data-testid="login-button"]');
        
        // 切换到会议接待模式
        await receptionPage.click('[data-testid="conference-mode-toggle"]');
        
        // 设置接待台
        await receptionPage.click('[data-testid="setup-reception-desk"]');
        await receptionPage.selectOption('[data-testid="reception-location"]', 'main_lobby');
        await receptionPage.fill('[data-testid="staff-count"]', '3');
        await receptionPage.check('[data-testid="enable-express-checkin"]');
        
        await receptionPage.click('[data-testid="activate-reception-mode"]');
        await expect(receptionPage.locator('[data-testid="reception-active"]')).toContainText('会议接待模式已激活');
        
        // 准备访客签到列表
        await receptionPage.click('[data-testid="load-conference-visitors"]');
        await expect(receptionPage.locator('[data-testid="visitor-checkin-list"]')).toBeVisible();
        await expect(receptionPage.locator('[data-testid="total-expected-visitors"]')).toContainText('50');

        // 步骤4: 安保人员配置安全检查
        console.log('步骤4: 安保人员配置安全检查');
        
        await securityPage.goto(`${testEnvironmentConfig.backend.baseUrl}/security-console`);
        await securityPage.fill('[data-testid="username"]', 'security_officer');
        await securityPage.fill('[data-testid="password"]', 'security123');
        await securityPage.click('[data-testid="login-button"]');
        
        // 启用高级安全模式
        await securityPage.click('[data-testid="enable-enhanced-security"]');
        
        // 配置安全检查流程
        await securityPage.check('[data-testid="require-id-verification"]');
        await securityPage.check('[data-testid="enable-bag-inspection"]');
        await securityPage.check('[data-testid="photo-capture-required"]');
        
        await securityPage.click('[data-testid="apply-security-config"]');
        await expect(securityPage.locator('[data-testid="security-mode-active"]')).toContainText('高级安全模式已启用');
        
        // 部署额外安保人员
        await securityPage.click('[data-testid="deploy-additional-staff"]');
        await securityPage.selectOption('[data-testid="additional-officers"]', '2');
        await securityPage.selectOption('[data-testid="deployment-areas"]', 'main_entrance,conference_floor');
        
        await securityPage.click('[data-testid="confirm-deployment"]');
        await expect(securityPage.locator('[data-testid="deployment-confirmed"]')).toContainText('安保部署已确认');

        // 步骤5: 模拟访客陆续到达和协作处理
        console.log('步骤5: 模拟访客陆续到达和协作处理');
        
        // 模拟第一批访客到达（10人）
        for (let i = 1; i <= 10; i++) {
          // 前台接待签到
          await receptionPage.fill('[data-testid="visitor-search"]', `访客${i.toString().padStart(2, '0')}`);
          await receptionPage.click('[data-testid="search-visitor"]');
          
          const visitorRow = receptionPage.locator('[data-testid="visitor-row"]').first();
          await visitorRow.locator('[data-testid="checkin-button"]').click();
          
          // 身份验证
          await receptionPage.click('[data-testid="verify-id-button"]');
          await receptionPage.fill('[data-testid="id-verification-notes"]', '身份证件验证通过');
          await receptionPage.click('[data-testid="confirm-id-verification"]');
          
          // 安全检查（每5个人触发一次详细检查）
          if (i % 5 === 0) {
            await securityPage.reload();
            const securityAlert = securityPage.locator('[data-testid="security-checkpoint-alert"]');
            if (await securityAlert.isVisible()) {
              await securityAlert.locator('[data-testid="handle-checkpoint"]').click();
              await securityPage.selectOption('[data-testid="inspection-result"]', 'cleared');
              await securityPage.fill('[data-testid="inspection-notes"]', '常规检查，无异常发现');
              await securityPage.click('[data-testid="complete-inspection"]');
            }
          }
          
          // 发放临时通行证
          await receptionPage.click('[data-testid="issue-temp-badge"]');
          await receptionPage.selectOption('[data-testid="badge-type"]', 'conference_visitor');
          await receptionPage.click('[data-testid="print-badge"]');
          
          await expect(receptionPage.locator('[data-testid="checkin-completed"]')).toBeVisible();
          
          // 短暂延迟模拟真实场景
          await receptionPage.waitForTimeout(200);
        }
        
        // 验证协作效果
        await expect(receptionPage.locator('[data-testid="checked-in-count"]')).toContainText('10');

        // 步骤6: 处理突发状况 - 系统负载过高
        console.log('步骤6: 处理突发状况 - 系统负载过高');
        
        // 租务管理员监控系统状态
        await tenantAdminPage.click('[data-testid="nav-monitoring"]');
        await tenantAdminPage.click('[data-testid="real-time-dashboard"]');
        
        // 模拟系统负载警告
        await tenantAdminPage.evaluate(() => {
          // 模拟触发负载警告
          window.dispatchEvent(new CustomEvent('system-load-warning', {
            detail: { cpuUsage: 85, memoryUsage: 90, activeConnections: 150 }
          }));
        });
        
        // 处理负载警告
        const loadWarning = tenantAdminPage.locator('[data-testid="load-warning-alert"]');
        if (await loadWarning.isVisible()) {
          await loadWarning.locator('[data-testid="handle-load-warning"]').click();
          
          // 启用负载均衡
          await tenantAdminPage.check('[data-testid="enable-load-balancing"]');
          await tenantAdminPage.check('[data-testid="enable-request-throttling"]');
          await tenantAdminPage.selectOption('[data-testid="priority-mode"]', 'essential_only');
          
          await tenantAdminPage.click('[data-testid="apply-load-management"]');
          await expect(tenantAdminPage.locator('[data-testid="load-management-active"]')).toContainText('负载管理已启用');
        }

        // 步骤7: 协调处理访客流量高峰
        console.log('步骤7: 协调处理访客流量高峰');
        
        // 商户管理员调整接待策略
        await merchantAdminPage.click('[data-testid="nav-operations"]');
        await merchantAdminPage.click('[data-testid="crowd-management"]');
        
        // 启用分流机制
        await merchantAdminPage.check('[data-testid="enable-visitor-queuing"]');
        await merchantAdminPage.selectOption('[data-testid="queue-strategy"]', 'time_slot_based');
        await merchantAdminPage.fill('[data-testid="max-concurrent-checkins"]', '5');
        
        await merchantAdminPage.click('[data-testid="activate-crowd-control"]');
        await expect(merchantAdminPage.locator('[data-testid="crowd-control-active"]')).toContainText('人流控制已激活');
        
        // 前台接待调整工作模式
        await receptionPage.click('[data-testid="switch-to-express-mode"]');
        
        // 验证快速模式启用
        await expect(receptionPage.locator('[data-testid="express-mode-active"]')).toContainText('快速接待模式');
        
        // 安保调整检查流程
        await securityPage.click('[data-testid="adjust-security-level"]');
        await securityPage.selectOption('[data-testid="security-level"]', 'standard'); // 降低到标准级别
        await securityPage.click('[data-testid="apply-security-adjustment"]');

        // 步骤8: 验证多角色协作效果
        console.log('步骤8: 验证多角色协作效果');
        
        // 继续处理剩余访客（模拟快速处理）
        for (let i = 11; i <= 30; i++) {
          await receptionPage.fill('[data-testid="visitor-search"]', `访客${i.toString().padStart(2, '0')}`);
          await receptionPage.click('[data-testid="express-checkin"]');
          
          // 快速模式下的简化流程
          await receptionPage.click('[data-testid="quick-verify"]');
          await receptionPage.click('[data-testid="issue-badge-express"]');
          
          await expect(receptionPage.locator('[data-testid="express-checkin-completed"]')).toBeVisible();
          
          // 更短的延迟
          await receptionPage.waitForTimeout(100);
        }
        
        // 验证最终协作结果
        await expect(receptionPage.locator('[data-testid="total-checked-in"]')).toContainText('30');
        
        // 租务管理员查看整体统计
        await tenantAdminPage.click('[data-testid="refresh-statistics"]');
        
        await expect(tenantAdminPage.locator('[data-testid="event-progress"]')).toContainText('60%'); // 30/50
        await expect(tenantAdminPage.locator('[data-testid="system-performance"]')).toContainText('稳定');
        await expect(tenantAdminPage.locator('[data-testid="security-status"]')).toContainText('正常');

        console.log('✅ 大型会议访客接待多角色协作场景测试通过');

      } finally {
        // 清理资源
        await tenantAdminContext.close();
        await merchantAdminContext.close();
        await receptionContext.close();
        await securityContext.close();
      }
    });

    test('紧急疏散多部门协调场景', async ({ browser }) => {
      console.log('测试紧急疏散多部门协调场景');
      
      const emergencyContext = await browser.newContext();
      const securityContext = await browser.newContext();
      const adminContext = await browser.newContext();
      
      const emergencyPage = await emergencyContext.newPage();
      const securityPage = await securityContext.newPage();
      const adminPage = await adminContext.newPage();

      try {
        // 场景: 火灾警报触发，需要协调疏散所有人员
        
        // 步骤1: 安保人员触发紧急警报
        await securityPage.goto(`${testEnvironmentConfig.backend.baseUrl}/security-console`);
        await securityPage.fill('[data-testid="username"]', 'security_officer');
        await securityPage.fill('[data-testid="password"]', 'security123');
        await securityPage.click('[data-testid="login-button"]');
        
        // 触发紧急警报
        await securityPage.click('[data-testid="emergency-alert-button"]');
        await securityPage.selectOption('[data-testid="emergency-type"]', 'fire');
        await securityPage.selectOption('[data-testid="affected-areas"]', 'building_a_floors_1_to_5');
        await securityPage.fill('[data-testid="emergency-description"]', '5楼发现火情，需要立即疏散');
        
        await securityPage.click('[data-testid="activate-emergency-protocol"]');
        
        await expect(securityPage.locator('[data-testid="emergency-activated"]')).toContainText('紧急疏散协议已激活');

        // 步骤2: 系统自动通知所有相关人员
        await adminPage.goto(`${testEnvironmentConfig.frontend.tenantAdmin.baseUrl}/emergency-dashboard`);
        await adminPage.fill('[data-testid="username"]', 'tenant_admin');
        await adminPage.fill('[data-testid="password"]', 'admin123');
        await adminPage.click('[data-testid="login-button"]');
        
        // 验证紧急状态激活
        await expect(adminPage.locator('[data-testid="emergency-status"]')).toContainText('紧急疏散进行中');
        await expect(adminPage.locator('[data-testid="affected-areas"]')).toContainText('A座1-5楼');
        
        // 查看实时人员分布
        await expect(adminPage.locator('[data-testid="personnel-count"]')).toBeVisible();
        await expect(adminPage.locator('[data-testid="visitor-count"]')).toBeVisible();

        // 步骤3: 协调疏散行动
        await emergencyPage.goto(`${testEnvironmentConfig.frontend.merchantAdmin.baseUrl}/emergency-response`);
        await emergencyPage.fill('[data-testid="username"]', 'emergency_coordinator');
        await emergencyPage.fill('[data-testid="password"]', 'emergency123');
        await emergencyPage.click('[data-testid="login-button"]');
        
        // 启动疏散程序
        await emergencyPage.click('[data-testid="start-evacuation-procedure"]');
        
        // 分配疏散任务
        await emergencyPage.click('[data-testid="assign-evacuation-tasks"]');
        
        // 为不同楼层分配疏散负责人
        await emergencyPage.selectOption('[data-testid="floor-1-coordinator"]', 'staff_member_1');
        await emergencyPage.selectOption('[data-testid="floor-2-coordinator"]', 'staff_member_2');
        await emergencyPage.selectOption('[data-testid="floor-3-coordinator"]', 'staff_member_3');
        
        await emergencyPage.click('[data-testid="confirm-task-assignment"]');
        
        await expect(emergencyPage.locator('[data-testid="tasks-assigned"]')).toContainText('疏散任务已分配');

        // 步骤4: 实时监控疏散进度
        // 模拟疏散进度更新
        for (let floor = 1; floor <= 5; floor++) {
          await emergencyPage.click(`[data-testid="update-floor-${floor}-status"]`);
          await emergencyPage.selectOption(`[data-testid="floor-${floor}-evacuation-status"]`, 'in_progress');
          await emergencyPage.fill(`[data-testid="floor-${floor}-evacuated-count"]`, '15');
          await emergencyPage.click(`[data-testid="confirm-floor-${floor}-update"]`);
          
          await expect(emergencyPage.locator(`[data-testid="floor-${floor}-status"]`)).toContainText('疏散中');
          
          await emergencyPage.waitForTimeout(1000); // 模拟时间间隔
        }

        // 步骤5: 处理特殊情况
        // 模拟发现被困人员
        await emergencyPage.click('[data-testid="report-trapped-personnel"]');
        await emergencyPage.selectOption('[data-testid="trapped-location"]', 'floor_3_room_301');
        await emergencyPage.fill('[data-testid="trapped-count"]', '2');
        await emergencyPage.fill('[data-testid="rescue-notes"]', '电梯故障，2名访客被困');
        
        await emergencyPage.click('[data-testid="request-rescue-team"]');
        
        await expect(emergencyPage.locator('[data-testid="rescue-team-dispatched"]')).toContainText('救援队已派遣');

        // 步骤6: 完成疏散并验证
        // 标记所有楼层疏散完成
        for (let floor = 1; floor <= 5; floor++) {
          await emergencyPage.click(`[data-testid="complete-floor-${floor}-evacuation"]`);
          await emergencyPage.selectOption(`[data-testid="floor-${floor}-final-status"]`, 'evacuated');
          await emergencyPage.click(`[data-testid="confirm-floor-${floor}-completion"]`);
        }
        
        // 验证疏散完成
        await expect(emergencyPage.locator('[data-testid="evacuation-completed"]')).toContainText('疏散完成');
        
        // 生成疏散报告
        await emergencyPage.click('[data-testid="generate-evacuation-report"]');
        
        await expect(emergencyPage.locator('[data-testid="evacuation-report"]')).toBeVisible();
        await expect(emergencyPage.locator('[data-testid="total-evacuated"]')).toContainText('75');
        await expect(emergencyPage.locator('[data-testid="evacuation-duration"]')).toBeVisible();

        console.log('✅ 紧急疏散多部门协调场景测试通过');

      } finally {
        await emergencyContext.close();
        await securityContext.close();
        await adminContext.close();
      }
    });
  });

  test.describe('真实使用场景下的系统协调', () => {
    test('高峰期系统性能和用户体验协调', async ({ page, context }) => {
      console.log('测试高峰期系统性能和用户体验协调');
      
      // 模拟早高峰时段大量员工同时打卡的场景
      
      // 步骤1: 系统管理员预设高峰期配置
      await page.goto(`${testEnvironmentConfig.frontend.tenantAdmin.baseUrl}/login`);
      await page.fill('[data-testid="username"]', 'tenant_admin');
      await page.fill('[data-testid="password"]', 'admin123');
      await page.click('[data-testid="login-button"]');
      
      // 启用高峰期优化模式
      await page.click('[data-testid="nav-performance"]');
      await page.click('[data-testid="peak-hour-optimization"]');
      
      await page.check('[data-testid="enable-peak-mode"]');
      await page.fill('[data-testid="peak-start-time"]', '08:00');
      await page.fill('[data-testid="peak-end-time"]', '09:30');
      await page.selectOption('[data-testid="optimization-level"]', 'aggressive');
      
      await page.click('[data-testid="apply-peak-optimization"]');
      
      await expect(page.locator('[data-testid="peak-mode-active"]')).toContainText('高峰期优化已启用');

      // 步骤2: 模拟大量并发访问
      const concurrentPages: any[] = [];
      
      // 创建20个并发页面模拟员工同时打卡
      for (let i = 0; i < 20; i++) {
        const newPage = await context.newPage();
        concurrentPages.push(newPage);
        
        // 异步执行打卡操作
        newPage.goto(`${testEnvironmentConfig.backend.baseUrl}/access-control`).then(async () => {
          await newPage.fill('[data-testid="employee-id"]', `EMP${(i + 1).toString().padStart(3, '0')}`);
          await newPage.click('[data-testid="clock-in-button"]');
        }).catch(error => {
          console.log(`员工 ${i + 1} 打卡失败:`, error.message);
        });
      }
      
      // 等待所有操作完成
      await page.waitForTimeout(10000);

      // 步骤3: 监控系统响应和性能
      await page.click('[data-testid="nav-monitoring"]');
      await page.click('[data-testid="real-time-performance"]');
      
      // 验证系统性能指标
      await expect(page.locator('[data-testid="response-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="concurrent-users"]')).toBeVisible();
      
      // 检查是否有性能警告
      const performanceWarning = page.locator('[data-testid="performance-warning"]');
      if (await performanceWarning.isVisible()) {
        await performanceWarning.locator('[data-testid="handle-warning"]').click();
        
        // 启用额外的性能优化
        await page.check('[data-testid="enable-caching"]');
        await page.check('[data-testid="enable-compression"]');
        await page.selectOption('[data-testid="load-balancing"]', 'round_robin');
        
        await page.click('[data-testid="apply-optimizations"]');
      }

      // 步骤4: 验证用户体验质量
      // 检查成功打卡的员工数量
      await page.click('[data-testid="attendance-summary"]');
      
      const successfulClockIns = await page.locator('[data-testid="successful-clock-ins"]').textContent() || '0';
      const failedClockIns = await page.locator('[data-testid="failed-clock-ins"]').textContent() || '0';
      
      console.log(`成功打卡: ${successfulClockIns}, 失败打卡: ${failedClockIns}`);
      
      // 验证成功率应该在可接受范围内
      const successRate = parseInt(successfulClockIns) / (parseInt(successfulClockIns) + parseInt(failedClockIns));
      expect(successRate).toBeGreaterThan(0.8); // 至少80%成功率

      // 清理并发页面
      await Promise.all(concurrentPages.map(p => p.close()));

      console.log('✅ 高峰期系统性能和用户体验协调测试通过');
    });

    test('跨系统数据同步和一致性场景', async ({ page, context }) => {
      console.log('测试跨系统数据同步和一致性场景');
      
      // 模拟前端、后端、数据库之间的数据同步场景
      
      const frontendPage = await context.newPage();
      const adminPage = await context.newPage();
      
      // 步骤1: 在前端创建新员工
      await frontendPage.goto(`${testEnvironmentConfig.frontend.merchantAdmin.baseUrl}/login`);
      await frontendPage.fill('[data-testid="username"]', 'merchant_admin');
      await frontendPage.fill('[data-testid="password"]', 'password123');
      await frontendPage.click('[data-testid="login-button"]');
      
      await frontendPage.click('[data-testid="nav-employees"]');
      await frontendPage.click('[data-testid="add-employee-button"]');
      
      const employeeName = `测试员工_${Date.now()}`;
      await frontendPage.fill('[data-testid="employee-name"]', employeeName);
      await frontendPage.fill('[data-testid="employee-phone"]', '13800138999');
      await frontendPage.fill('[data-testid="employee-email"]', 'test@example.com');
      
      await frontendPage.click('[data-testid="create-employee-button"]');
      
      await expect(frontendPage.locator('[data-testid="success-message"]')).toContainText('员工添加成功');
      
      const employeeId = await frontendPage.locator('[data-testid="employee-id"]').textContent();

      // 步骤2: 验证后端数据同步
      // 通过API验证数据是否正确同步到后端
      const apiResponse = await page.request.get(`${testEnvironmentConfig.backend.baseUrl}/api/v1/employees/${employeeId}`);
      expect(apiResponse.ok()).toBeTruthy();
      
      const employeeData = await apiResponse.json();
      expect(employeeData.data.name).toBe(employeeName);
      expect(employeeData.data.phone).toBe('13800138999');

      // 步骤3: 在管理端验证数据可见性
      await adminPage.goto(`${testEnvironmentConfig.frontend.tenantAdmin.baseUrl}/login`);
      await adminPage.fill('[data-testid="username"]', 'tenant_admin');
      await adminPage.fill('[data-testid="password"]', 'admin123');
      await adminPage.click('[data-testid="login-button"]');
      
      await adminPage.click('[data-testid="nav-employees"]');
      
      // 搜索新创建的员工
      await adminPage.fill('[data-testid="employee-search"]', employeeName);
      await adminPage.click('[data-testid="search-button"]');
      
      // 验证员工在管理端可见
      const employeeRow = adminPage.locator('[data-testid="employee-row"]').filter({ hasText: employeeName });
      await expect(employeeRow).toBeVisible();

      // 步骤4: 测试数据修改同步
      // 在前端修改员工信息
      await frontendPage.click('[data-testid="edit-employee-button"]');
      await frontendPage.fill('[data-testid="employee-department"]', '技术部');
      await frontendPage.selectOption('[data-testid="employee-position"]', 'senior_engineer');
      
      await frontendPage.click('[data-testid="save-employee-changes"]');
      
      await expect(frontendPage.locator('[data-testid="success-message"]')).toContainText('员工信息已更新');

      // 步骤5: 验证修改同步到所有系统
      // 等待数据同步
      await page.waitForTimeout(2000);
      
      // 验证API数据更新
      const updatedApiResponse = await page.request.get(`${testEnvironmentConfig.backend.baseUrl}/api/v1/employees/${employeeId}`);
      const updatedEmployeeData = await updatedApiResponse.json();
      expect(updatedEmployeeData.data.department).toBe('技术部');
      expect(updatedEmployeeData.data.position).toBe('senior_engineer');
      
      // 验证管理端数据更新
      await adminPage.reload();
      await adminPage.fill('[data-testid="employee-search"]', employeeName);
      await adminPage.click('[data-testid="search-button"]');
      
      const updatedEmployeeRow = adminPage.locator('[data-testid="employee-row"]').filter({ hasText: employeeName });
      await expect(updatedEmployeeRow.locator('[data-testid="department"]')).toContainText('技术部');
      await expect(updatedEmployeeRow.locator('[data-testid="position"]')).toContainText('高级工程师');

      // 步骤6: 测试并发修改冲突处理
      // 在两个页面同时修改同一员工
      const conflictPage = await context.newPage();
      await conflictPage.goto(`${testEnvironmentConfig.frontend.merchantAdmin.baseUrl}/employees/${employeeId}/edit`);
      
      // 页面1修改电话
      await frontendPage.fill('[data-testid="employee-phone"]', '13800138111');
      
      // 页面2修改邮箱
      await conflictPage.fill('[data-testid="employee-email"]', 'updated@example.com');
      
      // 先提交页面1
      await frontendPage.click('[data-testid="save-employee-changes"]');
      await expect(frontendPage.locator('[data-testid="success-message"]')).toContainText('员工信息已更新');
      
      // 再提交页面2，应该检测到冲突
      await conflictPage.click('[data-testid="save-employee-changes"]');
      
      // 验证冲突处理
      const conflictDialog = conflictPage.locator('[data-testid="conflict-resolution-dialog"]');
      if (await conflictDialog.isVisible()) {
        await conflictPage.click('[data-testid="resolve-conflict-merge"]');
        await expect(conflictPage.locator('[data-testid="conflict-resolved"]')).toContainText('冲突已解决');
      }

      await conflictPage.close();
      await frontendPage.close();
      await adminPage.close();

      console.log('✅ 跨系统数据同步和一致性场景测试通过');
    });
  });

  test.describe('异常情况下的系统恢复能力', () => {
    test('网络中断和恢复场景', async ({ page, context }) => {
      console.log('测试网络中断和恢复场景');
      
      // 步骤1: 正常操作建立基线
      await page.goto(`${testEnvironmentConfig.frontend.merchantAdmin.baseUrl}/login`);
      await page.fill('[data-testid="username"]', 'merchant_admin');
      await page.fill('[data-testid="password"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await page.click('[data-testid="nav-visitors"]');
      
      // 验证正常网络状态
      await expect(page.locator('[data-testid="network-status"]')).toContainText('在线');

      // 步骤2: 模拟网络中断
      await page.route('**/*', route => {
        // 模拟网络请求失败
        route.abort('failed');
      });
      
      // 尝试执行需要网络的操作
      await page.click('[data-testid="refresh-visitors-button"]');
      
      // 验证网络中断检测
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-mode-indicator"]')).toContainText('离线模式');

      // 步骤3: 验证离线功能
      // 在离线模式下，应该能够查看缓存数据
      await expect(page.locator('[data-testid="cached-visitors-list"]')).toBeVisible();
      
      // 尝试创建新访客申请（应该保存到本地）
      await page.click('[data-testid="add-visitor-offline"]');
      await page.fill('[data-testid="visitor-name"]', '离线测试访客');
      await page.fill('[data-testid="visitor-phone"]', '13800138000');
      
      await page.click('[data-testid="save-offline"]');
      
      // 验证离线保存
      await expect(page.locator('[data-testid="offline-saved"]')).toContainText('已保存到本地，将在网络恢复后同步');

      // 步骤4: 模拟网络恢复
      await page.unroute('**/*');
      
      // 触发网络恢复检测
      await page.click('[data-testid="check-network-button"]');
      
      // 验证网络恢复
      await expect(page.locator('[data-testid="network-status"]')).toContainText('在线');
      await expect(page.locator('[data-testid="sync-in-progress"]')).toBeVisible();

      // 步骤5: 验证数据同步
      // 等待离线数据同步完成
      await expect(page.locator('[data-testid="sync-completed"]')).toBeVisible({ timeout: 10000 });
      
      // 验证离线创建的访客已同步
      await page.fill('[data-testid="visitor-search"]', '离线测试访客');
      await page.click('[data-testid="search-button"]');
      
      const syncedVisitor = page.locator('[data-testid="visitor-row"]').filter({ hasText: '离线测试访客' });
      await expect(syncedVisitor).toBeVisible();

      console.log('✅ 网络中断和恢复场景测试通过');
    });

    test('数据库故障和恢复场景', async ({ page }) => {
      console.log('测试数据库故障和恢复场景');
      
      // 步骤1: 正常数据库操作
      await page.goto(`${testEnvironmentConfig.frontend.tenantAdmin.baseUrl}/login`);
      await page.fill('[data-testid="username"]', 'tenant_admin');
      await page.fill('[data-testid="password"]', 'admin123');
      await page.click('[data-testid="login-button"]');
      
      await page.click('[data-testid="nav-system-health"]');
      
      // 验证数据库连接正常
      await expect(page.locator('[data-testid="database-status"]')).toContainText('正常');

      // 步骤2: 模拟数据库连接问题
      // 通过API模拟数据库故障
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('database-connection-error', {
          detail: { error: 'Connection timeout', timestamp: new Date().toISOString() }
        }));
      });
      
      // 验证数据库故障检测
      await expect(page.locator('[data-testid="database-error-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="database-status"]')).toContainText('连接异常');

      // 步骤3: 启动故障恢复程序
      await page.click('[data-testid="initiate-recovery"]');
      
      // 选择恢复策略
      await page.selectOption('[data-testid="recovery-strategy"]', 'automatic_retry');
      await page.fill('[data-testid="retry-interval"]', '5'); // 5秒间隔
      await page.fill('[data-testid="max-retries"]', '3');
      
      await page.click('[data-testid="start-recovery"]');
      
      // 验证恢复程序启动
      await expect(page.locator('[data-testid="recovery-in-progress"]')).toContainText('数据库恢复中');

      // 步骤4: 模拟恢复成功
      await page.waitForTimeout(3000); // 等待恢复尝试
      
      // 模拟数据库连接恢复
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('database-connection-restored', {
          detail: { timestamp: new Date().toISOString() }
        }));
      });
      
      // 验证恢复成功
      await expect(page.locator('[data-testid="database-status"]')).toContainText('正常');
      await expect(page.locator('[data-testid="recovery-completed"]')).toContainText('数据库连接已恢复');

      // 步骤5: 验证数据完整性
      await page.click('[data-testid="verify-data-integrity"]');
      
      // 等待数据完整性检查完成
      await expect(page.locator('[data-testid="integrity-check-completed"]')).toBeVisible({ timeout: 15000 });
      
      // 验证检查结果
      await expect(page.locator('[data-testid="data-integrity-status"]')).toContainText('完整');
      
      // 检查是否有数据丢失
      const dataLossAlert = page.locator('[data-testid="data-loss-alert"]');
      if (await dataLossAlert.isVisible()) {
        // 如果有数据丢失，启动数据恢复
        await page.click('[data-testid="restore-from-backup"]');
        await page.selectOption('[data-testid="backup-source"]', 'latest_backup');
        await page.click('[data-testid="confirm-restore"]');
        
        await expect(page.locator('[data-testid="restore-completed"]')).toBeVisible({ timeout: 30000 });
      }

      console.log('✅ 数据库故障和恢复场景测试通过');
    });

    test('系统过载和自动降级场景', async ({ page, context }) => {
      console.log('测试系统过载和自动降级场景');
      
      // 步骤1: 监控系统正常状态
      await page.goto(`${testEnvironmentConfig.frontend.tenantAdmin.baseUrl}/login`);
      await page.fill('[data-testid="username"]', 'tenant_admin');
      await page.fill('[data-testid="password"]', 'admin123');
      await page.click('[data-testid="login-button"]');
      
      await page.click('[data-testid="nav-performance"]');
      
      // 验证正常性能指标
      await expect(page.locator('[data-testid="cpu-usage"]')).toBeVisible();
      await expect(page.locator('[data-testid="memory-usage"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-time"]')).toBeVisible();

      // 步骤2: 模拟系统过载
      // 创建大量并发请求模拟系统过载
      const overloadPages: any[] = [];
      
      for (let i = 0; i < 50; i++) {
        const newPage = await context.newPage();
        overloadPages.push(newPage);
        
        // 异步发起大量请求
        newPage.goto(`${testEnvironmentConfig.backend.baseUrl}/api/v1/heavy-operation`).catch(() => {
          // 忽略错误，专注于测试过载处理
        });
      }
      
      // 等待系统检测到过载
      await page.waitForTimeout(5000);

      // 步骤3: 验证过载检测和警报
      await page.reload();
      
      const overloadAlert = page.locator('[data-testid="system-overload-alert"]');
      if (await overloadAlert.isVisible()) {
        await expect(overloadAlert).toContainText('系统负载过高');
        
        // 查看详细的过载信息
        await overloadAlert.locator('[data-testid="view-overload-details"]').click();
        
        await expect(page.locator('[data-testid="overload-metrics"]')).toBeVisible();
        await expect(page.locator('[data-testid="affected-services"]')).toBeVisible();
      }

      // 步骤4: 启动自动降级
      await page.click('[data-testid="enable-auto-degradation"]');
      
      // 配置降级策略
      await page.check('[data-testid="disable-non-essential-features"]');
      await page.check('[data-testid="reduce-data-refresh-rate"]');
      await page.check('[data-testid="enable-request-throttling"]');
      await page.selectOption('[data-testid="priority-level"]', 'critical_only');
      
      await page.click('[data-testid="apply-degradation"]');
      
      // 验证降级模式激活
      await expect(page.locator('[data-testid="degradation-active"]')).toContainText('降级模式已激活');

      // 步骤5: 验证降级效果
      // 验证非关键功能被禁用
      await page.click('[data-testid="nav-reports"]');
      
      const reportsDisabled = page.locator('[data-testid="feature-disabled-notice"]');
      if (await reportsDisabled.isVisible()) {
        await expect(reportsDisabled).toContainText('该功能在降级模式下暂时不可用');
      }
      
      // 验证关键功能仍然可用
      await page.click('[data-testid="nav-access-control"]');
      await expect(page.locator('[data-testid="access-control-panel"]')).toBeVisible();

      // 步骤6: 系统恢复和升级
      // 清理过载请求
      await Promise.all(overloadPages.map(p => p.close()));
      
      // 等待系统负载降低
      await page.waitForTimeout(10000);
      
      // 检查系统状态
      await page.click('[data-testid="check-system-status"]');
      
      // 如果负载恢复正常，自动退出降级模式
      const normalStatus = page.locator('[data-testid="system-status-normal"]');
      if (await normalStatus.isVisible()) {
        await page.click('[data-testid="exit-degradation-mode"]');
        
        await expect(page.locator('[data-testid="normal-mode-restored"]')).toContainText('系统已恢复正常模式');
        
        // 验证所有功能恢复
        await page.click('[data-testid="nav-reports"]');
        await expect(page.locator('[data-testid="reports-panel"]')).toBeVisible();
      }

      console.log('✅ 系统过载和自动降级场景测试通过');
    });
  });
});