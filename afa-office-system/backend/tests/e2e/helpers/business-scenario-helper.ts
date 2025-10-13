import { Page, BrowserContext } from '@playwright/test';
import { testEnvironmentConfig } from '../config/test-environment';

/**
 * 业务场景测试辅助工具
 * 为复杂的端到端业务场景测试提供通用功能
 */
export class BusinessScenarioHelper {
  
  /**
   * 用户角色登录辅助方法
   */
  static async loginAsRole(page: Page, role: 'tenant_admin' | 'merchant_admin' | 'employee' | 'security' | 'reception'): Promise<void> {
    const credentials = {
      tenant_admin: { username: 'tenant_admin', password: 'admin123', url: testEnvironmentConfig.frontend.tenantAdmin.baseUrl },
      merchant_admin: { username: 'merchant_admin', password: 'password123', url: testEnvironmentConfig.frontend.merchantAdmin.baseUrl },
      employee: { username: 'employee_user', password: 'employee123', url: testEnvironmentConfig.frontend.merchantAdmin.baseUrl },
      security: { username: 'security_officer', password: 'security123', url: testEnvironmentConfig.backend.baseUrl + '/security-console' },
      reception: { username: 'reception_staff', password: 'reception123', url: testEnvironmentConfig.frontend.merchantAdmin.baseUrl + '/reception' }
    };

    const cred = credentials[role];
    await page.goto(`${cred.url}/login`);
    await page.fill('[data-testid="username"]', cred.username);
    await page.fill('[data-testid="password"]', cred.password);
    await page.click('[data-testid="login-button"]');
    
    // 验证登录成功
    await page.waitForSelector('[data-testid="dashboard"], [data-testid="main-panel"]', { timeout: 10000 });
  }

  /**
   * 创建多角色浏览器上下文
   */
  static async createMultiRoleContexts(browser: any): Promise<{
    tenantAdmin: { context: BrowserContext; page: Page };
    merchantAdmin: { context: BrowserContext; page: Page };
    security: { context: BrowserContext; page: Page };
    reception: { context: BrowserContext; page: Page };
  }> {
    const tenantAdminContext = await browser.newContext();
    const merchantAdminContext = await browser.newContext();
    const securityContext = await browser.newContext();
    const receptionContext = await browser.newContext();

    const tenantAdminPage = await tenantAdminContext.newPage();
    const merchantAdminPage = await merchantAdminContext.newPage();
    const securityPage = await securityContext.newPage();
    const receptionPage = await receptionContext.newPage();

    // 自动登录所有角色
    await Promise.all([
      this.loginAsRole(tenantAdminPage, 'tenant_admin'),
      this.loginAsRole(merchantAdminPage, 'merchant_admin'),
      this.loginAsRole(securityPage, 'security'),
      this.loginAsRole(receptionPage, 'reception')
    ]);

    return {
      tenantAdmin: { context: tenantAdminContext, page: tenantAdminPage },
      merchantAdmin: { context: merchantAdminContext, page: merchantAdminPage },
      security: { context: securityContext, page: securityPage },
      reception: { context: receptionContext, page: receptionPage }
    };
  }

  /**
   * 清理多角色上下文
   */
  static async cleanupMultiRoleContexts(contexts: {
    tenantAdmin: { context: BrowserContext; page: Page };
    merchantAdmin: { context: BrowserContext; page: Page };
    security: { context: BrowserContext; page: Page };
    reception: { context: BrowserContext; page: Page };
  }): Promise<void> {
    await Promise.all([
      contexts.tenantAdmin.context.close(),
      contexts.merchantAdmin.context.close(),
      contexts.security.context.close(),
      contexts.reception.context.close()
    ]);
  }

  /**
   * 模拟访客申请流程
   */
  static async simulateVisitorApplication(page: Page, visitorData: {
    name: string;
    phone: string;
    company: string;
    purpose: string;
    visitDate?: string;
  }): Promise<string> {
    await page.goto(`${testEnvironmentConfig.frontend.tenantAdmin.baseUrl}/visitor-application`);
    
    await page.fill('[data-testid="visitor-name"]', visitorData.name);
    await page.fill('[data-testid="visitor-phone"]', visitorData.phone);
    await page.fill('[data-testid="visitor-company"]', visitorData.company);
    await page.fill('[data-testid="visit-purpose"]', visitorData.purpose);
    
    if (visitorData.visitDate) {
      await page.fill('[data-testid="visit-date"]', visitorData.visitDate);
    }
    
    // 选择商户
    await page.click('[data-testid="merchant-select"]');
    await page.locator('[data-testid="merchant-option"]').first().click();
    
    // 填写时间
    await page.fill('[data-testid="visit-time-start"]', '09:00');
    await page.fill('[data-testid="visit-time-end"]', '17:00');
    
    // 联系人信息
    await page.fill('[data-testid="contact-person"]', '张经理');
    await page.fill('[data-testid="contact-phone"]', '13800138002');
    
    await page.check('[data-testid="agree-terms"]');
    await page.click('[data-testid="submit-application-button"]');
    
    // 获取申请编号
    const applicationNumber = await page.locator('[data-testid="application-number"]').textContent();
    return applicationNumber || '';
  }

  /**
   * 批量创建访客申请
   */
  static async createBatchVisitorApplications(page: Page, count: number, baseData: {
    company: string;
    purpose: string;
    visitDate?: string;
  }): Promise<string[]> {
    const applicationNumbers: string[] = [];
    
    for (let i = 1; i <= count; i++) {
      const visitorData = {
        name: `批量访客${i.toString().padStart(2, '0')}`,
        phone: `1380013${(8000 + i).toString()}`,
        company: baseData.company,
        purpose: baseData.purpose,
        visitDate: baseData.visitDate
      };
      
      const applicationNumber = await this.simulateVisitorApplication(page, visitorData);
      applicationNumbers.push(applicationNumber);
      
      // 短暂延迟避免过快提交
      await page.waitForTimeout(500);
    }
    
    return applicationNumbers;
  }

  /**
   * 批量审批访客申请
   */
  static async batchApproveVisitorApplications(page: Page, applicationNumbers: string[]): Promise<void> {
    await page.click('[data-testid="nav-visitors"]');
    await page.click('[data-testid="pending-applications-tab"]');
    
    // 选择所有待审批申请
    for (let i = 0; i < applicationNumbers.length && i < 10; i++) { // 限制批量数量
      await page.check(`[data-testid="application-checkbox"]:nth-child(${i + 1})`);
    }
    
    // 批量审批
    await page.click('[data-testid="batch-approve-button"]');
    await page.selectOption('[data-testid="batch-access-level"]', 'standard');
    await page.fill('[data-testid="batch-approval-notes"]', '批量审批通过');
    await page.click('[data-testid="confirm-batch-approval"]');
    
    await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
  }

  /**
   * 模拟员工通行
   */
  static async simulateEmployeeAccess(page: Page, employeeData: {
    id: string;
    passcode: string;
    accessType: 'entry' | 'exit';
  }): Promise<string> {
    await page.goto(`${testEnvironmentConfig.backend.baseUrl}/access-control`);
    
    if (employeeData.accessType === 'exit') {
      await page.goto(`${testEnvironmentConfig.backend.baseUrl}/access-control/exit`);
      await page.fill('[data-testid="employee-identifier"]', employeeData.id);
      await page.click('[data-testid="query-employee-button"]');
      await page.click('[data-testid="record-exit-button"]');
      await page.selectOption('[data-testid="exit-method"]', 'normal');
      await page.click('[data-testid="submit-exit-record"]');
    } else {
      await page.fill('[data-testid="qr-code-input"]', employeeData.passcode);
      await page.click('[data-testid="verify-qr-code"]');
      await page.click('[data-testid="grant-access-button"]');
      await page.selectOption('[data-testid="access-method"]', 'qr_code');
      await page.click('[data-testid="submit-access-record"]');
    }
    
    const recordId = await page.locator('[data-testid="access-record-id"], [data-testid="exit-record-id"]').textContent();
    return recordId || '';
  }

  /**
   * 模拟系统负载
   */
  static async simulateSystemLoad(context: BrowserContext, concurrentUsers: number = 20): Promise<Page[]> {
    const loadPages: Page[] = [];
    
    for (let i = 0; i < concurrentUsers; i++) {
      const loadPage = await context.newPage();
      loadPages.push(loadPage);
      
      // 异步执行负载操作
      loadPage.goto(`${testEnvironmentConfig.backend.baseUrl}/api/v1/load-test`).catch(() => {
        // 忽略错误，专注于负载测试
      });
    }
    
    return loadPages;
  }

  /**
   * 清理负载测试页面
   */
  static async cleanupLoadPages(loadPages: Page[]): Promise<void> {
    await Promise.all(loadPages.map(page => page.close()));
  }

  /**
   * 等待系统状态稳定
   */
  static async waitForSystemStable(page: Page, timeout: number = 30000): Promise<void> {
    await page.waitForFunction(() => {
      const statusElement = document.querySelector('[data-testid="system-status"]');
      return statusElement && statusElement.textContent?.includes('正常');
    }, { timeout });
  }

  /**
   * 验证数据同步
   */
  static async verifyDataSync(page: Page, dataType: string, expectedCount: number): Promise<boolean> {
    await page.click(`[data-testid="refresh-${dataType}"]`);
    await page.waitForTimeout(2000); // 等待数据加载
    
    const actualCount = await page.locator(`[data-testid="${dataType}-count"]`).textContent();
    return parseInt(actualCount || '0') === expectedCount;
  }

  /**
   * 生成测试报告数据
   */
  static async generateTestReport(page: Page, reportType: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    await page.click('[data-testid="nav-reports"]');
    await page.click(`[data-testid="${reportType}-report-tab"]`);
    
    const today = new Date().toISOString().split('T')[0];
    await page.fill('[data-testid="report-date"]', today);
    await page.click('[data-testid="generate-report"]');
    
    await page.waitForSelector('[data-testid="report-completed"]', { timeout: 30000 });
  }

  /**
   * 模拟紧急情况
   */
  static async triggerEmergencyScenario(page: Page, emergencyType: 'fire' | 'security' | 'medical'): Promise<void> {
    await page.click('[data-testid="emergency-alert-button"]');
    await page.selectOption('[data-testid="emergency-type"]', emergencyType);
    
    const descriptions = {
      fire: '发现火情，需要立即疏散',
      security: '发现安全威胁，需要加强警戒',
      medical: '发生医疗紧急情况，需要救护支援'
    };
    
    await page.fill('[data-testid="emergency-description"]', descriptions[emergencyType]);
    await page.click('[data-testid="activate-emergency-protocol"]');
    
    await page.waitForSelector('[data-testid="emergency-activated"]', { timeout: 10000 });
  }

  /**
   * 验证系统恢复
   */
  static async verifySystemRecovery(page: Page): Promise<boolean> {
    try {
      // 检查关键系统状态
      await page.click('[data-testid="nav-system-health"]');
      
      const dbStatus = await page.locator('[data-testid="database-status"]').textContent();
      const networkStatus = await page.locator('[data-testid="network-status"]').textContent();
      const serviceStatus = await page.locator('[data-testid="service-status"]').textContent();
      
      return (dbStatus?.includes('正常') ?? false) && 
             (networkStatus?.includes('在线') ?? false) && 
             (serviceStatus?.includes('运行中') ?? false);
    } catch (error) {
      console.error('系统恢复验证失败:', error);
      return false;
    }
  }

  /**
   * 性能监控辅助方法
   */
  static async monitorPerformance(page: Page): Promise<{
    responseTime: number;
    cpuUsage: number;
    memoryUsage: number;
  }> {
    await page.click('[data-testid="nav-performance"]');
    
    const responseTimeText = await page.locator('[data-testid="avg-response-time"]').textContent();
    const cpuUsageText = await page.locator('[data-testid="cpu-usage"]').textContent();
    const memoryUsageText = await page.locator('[data-testid="memory-usage"]').textContent();
    
    return {
      responseTime: parseFloat(responseTimeText?.replace('ms', '') || '0'),
      cpuUsage: parseFloat(cpuUsageText?.replace('%', '') || '0'),
      memoryUsage: parseFloat(memoryUsageText?.replace('%', '') || '0')
    };
  }

  /**
   * 数据完整性检查
   */
  static async checkDataIntegrity(page: Page): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    await page.click('[data-testid="nav-maintenance"]');
    await page.click('[data-testid="data-integrity-check"]');
    
    await page.waitForSelector('[data-testid="integrity-check-completed"]', { timeout: 60000 });
    
    const isValid = await page.locator('[data-testid="integrity-status"]').textContent();
    const errorElements = await page.locator('[data-testid="integrity-error"]').all();
    
    const errors: string[] = [];
    for (const errorElement of errorElements) {
      const errorText = await errorElement.textContent();
      if (errorText) errors.push(errorText);
    }
    
    return {
      isValid: isValid?.includes('完整') || false,
      errors
    };
  }

  /**
   * 清理测试数据
   */
  static async cleanupTestData(page: Page): Promise<void> {
    await page.click('[data-testid="nav-maintenance"]');
    await page.click('[data-testid="cleanup-test-data"]');
    await page.click('[data-testid="confirm-cleanup"]');
    
    await page.waitForSelector('[data-testid="cleanup-completed"]', { timeout: 30000 });
  }
}

/**
 * 测试场景配置
 */
export interface TestScenarioConfig {
  name: string;
  description: string;
  roles: string[];
  expectedDuration: number; // 预期执行时间（秒）
  criticalPath: boolean; // 是否为关键路径测试
}

/**
 * 预定义测试场景
 */
export const TEST_SCENARIOS: Record<string, TestScenarioConfig> = {
  VISITOR_FULL_WORKFLOW: {
    name: '访客完整流程',
    description: '从申请到通行的完整访客流程',
    roles: ['visitor', 'merchant_admin', 'security'],
    expectedDuration: 300,
    criticalPath: true
  },
  
  EMPLOYEE_ONBOARDING: {
    name: '员工入职流程',
    description: '新员工从入职到日常使用的完整流程',
    roles: ['tenant_admin', 'merchant_admin', 'employee'],
    expectedDuration: 240,
    criticalPath: true
  },
  
  EMERGENCY_EVACUATION: {
    name: '紧急疏散',
    description: '紧急情况下的多部门协调疏散',
    roles: ['security', 'tenant_admin', 'merchant_admin', 'emergency_coordinator'],
    expectedDuration: 180,
    criticalPath: false
  },
  
  SYSTEM_RECOVERY: {
    name: '系统恢复',
    description: '系统故障后的恢复和数据完整性验证',
    roles: ['tenant_admin', 'system_admin'],
    expectedDuration: 120,
    criticalPath: true
  },
  
  PEAK_LOAD_HANDLING: {
    name: '高峰负载处理',
    description: '高峰期系统负载和性能管理',
    roles: ['tenant_admin', 'performance_admin'],
    expectedDuration: 150,
    criticalPath: false
  }
};