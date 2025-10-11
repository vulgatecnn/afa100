/**
 * MySQL测试工具单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// 禁用增强测试环境
vi.mock('../../enhanced-setup', () => ({}));
import { MySQLAdapter } from '../../../src/adapters/mysql-adapter';
import { 
  MySQLTestDataFactory, 
  MySQLDatabaseTestHelper, 
  MySQLTimeoutManager,
  MySQLTestToolkit
} from '../../helpers/mysql-test-tools';

// 模拟MySQL适配器
class MockMySQLAdapter extends MySQLAdapter {
  private mockReady = true;
  private mockData: any[] = [];

  constructor() {
    super();
  }

  async connect(): Promise<void> {
    this.mockReady = true;
  }

  async disconnect(): Promise<void> {
    this.mockReady = false;
  }

  isReady(): boolean {
    return this.mockReady;
  }

  async run(sql: string, params: any[] = []): Promise<any> {
    return { lastID: Math.floor(Math.random() * 1000), changes: 1 };
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (sql.includes('SELECT 1')) {
      return { test: 1, current_time: new Date() } as T;
    }
    if (sql.includes('VERSION()')) {
      return { version: '8.0.0' } as T;
    }
    return undefined;
  }

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return [] as T[];
  }

  async beginTransaction(): Promise<any> {
    return {
      commit: async () => {},
      rollback: async () => {}
    };
  }

  async createTestDatabase(dbName: string): Promise<void> {
    // Mock implementation
  }

  async dropTestDatabase(dbName: string): Promise<void> {
    // Mock implementation
  }

  async initializeSchema(dbName: string): Promise<void> {
    // Mock implementation
  }

  async ping(): Promise<boolean> {
    return true;
  }

  getPoolStatus(): any {
    return { ready: true };
  }
}

describe('MySQL测试工具', () => {
  let mockAdapter: MockMySQLAdapter;
  let dataFactory: MySQLTestDataFactory;
  let testHelper: MySQLDatabaseTestHelper;
  let timeoutManager: MySQLTimeoutManager;
  let toolkit: MySQLTestToolkit;

  beforeEach(() => {
    mockAdapter = new MockMySQLAdapter();
    dataFactory = new MySQLTestDataFactory(mockAdapter);
    testHelper = new MySQLDatabaseTestHelper(mockAdapter);
    timeoutManager = new MySQLTimeoutManager(mockAdapter);
    toolkit = new MySQLTestToolkit(mockAdapter);
  });

  afterEach(() => {
    timeoutManager.cleanup();
  });

  describe('MySQLTestDataFactory', () => {
    it('应该能够创建MySQL兼容的用户数据', () => {
      const user = dataFactory.createMySQLUser({
        name: '测试用户',
        user_type: 'merchant_admin'
      });

      expect(user).toHaveProperty('name', '测试用户');
      expect(user).toHaveProperty('user_type', 'merchant_admin');
      expect(user).toHaveProperty('created_at');
      expect(user).toHaveProperty('updated_at');
      expect(typeof user.created_at).toBe('string');
      expect(user.name.length).toBeLessThanOrEqual(100);
    });

    it('应该能够创建MySQL兼容的商户数据', () => {
      const merchant = dataFactory.createMySQLMerchant({
        name: '测试商户',
        status: 'active'
      });

      expect(merchant).toHaveProperty('name', '测试商户');
      expect(merchant).toHaveProperty('status', 'active');
      expect(merchant).toHaveProperty('contact_person');
      expect(merchant).toHaveProperty('created_at');
      expect(merchant.name.length).toBeLessThanOrEqual(200);
    });

    it('应该能够创建MySQL兼容的访客申请数据', () => {
      const application = dataFactory.createMySQLVisitorApplication({
        visitor_name: '测试访客',
        merchant_id: 1
      });

      expect(application).toHaveProperty('visitor_name', '测试访客');
      expect(application).toHaveProperty('merchant_id', 1);
      expect(application).toHaveProperty('status');
      expect(application.visitor_name.length).toBeLessThanOrEqual(100);
    });

    it('应该能够创建MySQL兼容的通行码数据', () => {
      const passcode = dataFactory.createMySQLPasscode({
        user_id: 1,
        type: 'employee'
      });

      expect(passcode).toHaveProperty('user_id', 1);
      expect(passcode).toHaveProperty('type', 'employee');
      expect(passcode).toHaveProperty('code');
      expect(passcode).toHaveProperty('valid_from');
      expect(passcode).toHaveProperty('valid_until');
    });

    it('应该能够创建MySQL兼容的通行记录数据', () => {
      const record = dataFactory.createMySQLAccessRecord({
        user_id: 1,
        result: 'success'
      });

      expect(record).toHaveProperty('user_id', 1);
      expect(record).toHaveProperty('result', 'success');
      expect(record).toHaveProperty('device_id');
      expect(record).toHaveProperty('location');
      expect(record.device_id.length).toBeLessThanOrEqual(100);
    });
  });

  describe('MySQLDatabaseTestHelper', () => {
    it('应该能够验证MySQL连接', async () => {
      const isConnected = await testHelper.verifyMySQLConnection();
      expect(isConnected).toBe(true);
    });

    it('应该能够获取MySQL服务器信息', async () => {
      const serverInfo = await testHelper.getMySQLServerInfo();
      expect(serverInfo).toHaveProperty('version');
      expect(serverInfo.version).toBe('8.0.0');
    });

    it('应该能够收集MySQL性能指标', async () => {
      const metrics = await testHelper.collectMySQLPerformanceMetrics();
      expect(metrics).toHaveProperty('connectionCount');
      expect(metrics).toHaveProperty('activeConnections');
      expect(metrics).toHaveProperty('timestamp');
      expect(typeof metrics.timestamp).toBe('string');
    });

    it('应该能够执行MySQL健康检查', async () => {
      const healthCheck = await testHelper.performMySQLHealthCheck();
      expect(healthCheck).toHaveProperty('healthy');
      expect(healthCheck).toHaveProperty('issues');
      expect(healthCheck).toHaveProperty('recommendations');
      expect(Array.isArray(healthCheck.issues)).toBe(true);
      expect(Array.isArray(healthCheck.recommendations)).toBe(true);
    });
  });

  describe('MySQLTimeoutManager', () => {
    it('应该能够执行带超时的查询', async () => {
      const result = await timeoutManager.executeQuery('SELECT 1', []);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('executionTime');
      expect(result).toHaveProperty('timedOut');
      expect(result).toHaveProperty('retryCount');
    });

    it('应该能够获取超时统计信息', () => {
      const stats = timeoutManager.getTimeoutStats();
      expect(stats).toHaveProperty('totalOperations');
      expect(stats).toHaveProperty('timeoutCount');
      expect(stats).toHaveProperty('averageExecutionTime');
      expect(stats).toHaveProperty('timeoutsByType');
    });

    it('应该能够获取活跃操作信息', () => {
      const activeOps = timeoutManager.getActiveOperations();
      expect(Array.isArray(activeOps)).toBe(true);
    });

    it('应该能够执行健康检查', async () => {
      const healthCheck = await timeoutManager.performHealthCheck();
      expect(healthCheck).toHaveProperty('healthy');
      expect(healthCheck).toHaveProperty('issues');
      expect(healthCheck).toHaveProperty('recommendations');
      expect(typeof healthCheck.healthy).toBe('boolean');
    });

    it('应该能够生成超时报告', () => {
      const report = timeoutManager.generateTimeoutReport();
      expect(typeof report).toBe('string');
      
      const parsedReport = JSON.parse(report);
      expect(parsedReport).toHaveProperty('summary');
      expect(parsedReport).toHaveProperty('config');
      expect(parsedReport).toHaveProperty('generatedAt');
    });
  });

  describe('MySQLTestToolkit', () => {
    it('应该能够获取工具套件状态', () => {
      const status = toolkit.getToolkitStatus();
      expect(status).toHaveProperty('adapterReady');
      expect(status).toHaveProperty('activeOperations');
      expect(status).toHaveProperty('performanceHistory');
      expect(status).toHaveProperty('lastHealthCheck');
      expect(typeof status.adapterReady).toBe('boolean');
    });

    it('应该能够执行完整健康检查', async () => {
      const healthCheck = await toolkit.performCompleteHealthCheck();
      expect(healthCheck).toHaveProperty('overall');
      expect(healthCheck).toHaveProperty('connection');
      expect(healthCheck).toHaveProperty('performance');
      expect(healthCheck).toHaveProperty('timeout');
      expect(healthCheck).toHaveProperty('recommendations');
      expect(typeof healthCheck.overall).toBe('boolean');
      expect(typeof healthCheck.connection).toBe('boolean');
    });

    it('应该能够生成综合报告', async () => {
      const report = await toolkit.generateComprehensiveReport();
      expect(typeof report).toBe('string');
      
      const parsedReport = JSON.parse(report);
      expect(parsedReport).toHaveProperty('title');
      expect(parsedReport).toHaveProperty('generatedAt');
      expect(parsedReport).toHaveProperty('serverInfo');
      expect(parsedReport).toHaveProperty('healthCheck');
      expect(parsedReport).toHaveProperty('summary');
    });
  });

  describe('数据验证', () => {
    it('应该正确验证字符串长度', () => {
      const longName = 'a'.repeat(300);
      const user = dataFactory.createMySQLUser({ name: longName });
      expect(user.name.length).toBeLessThanOrEqual(100);
    });

    it('应该正确格式化MySQL日期时间', () => {
      const user = dataFactory.createMySQLUser();
      expect(user.created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      expect(user.updated_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('应该处理可选字段', () => {
      const user = dataFactory.createMySQLUser({ 
        password: undefined,
        open_id: undefined,
        union_id: undefined,
        avatar: undefined
      });
      expect(user.password).toBeNull();
      expect(user.open_id).toBeNull();
      expect(user.union_id).toBeNull();
      expect(user.avatar).toBeNull();
    });
  });
});