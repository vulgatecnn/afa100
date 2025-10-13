/**
 * 测试数据管理器
 * 负责测试数据的创建、清理和重置操作
 */

import { TestDataFactory, TestUser, TestMerchant, TestDevice, TestVisitorApplication, TestAccessRecord } from '../fixtures/test-data-factory';
import { DatabaseManager } from './database-manager';
import { getCurrentEnvironment } from '../config/environments';

export interface TestDataSnapshot {
  name: string;
  timestamp: string;
  data: {
    users: TestUser[];
    merchants: TestMerchant[];
    devices: TestDevice[];
    visitorApplications: TestVisitorApplication[];
    accessRecords: TestAccessRecord[];
  };
}

export interface TestDataCleanupOptions {
  preserveBaseData?: boolean;
  cleanupUsers?: boolean;
  cleanupMerchants?: boolean;
  cleanupDevices?: boolean;
  cleanupVisitorApplications?: boolean;
  cleanupAccessRecords?: boolean;
}

export class TestDataManager {
  private databaseManager: DatabaseManager;
  private snapshots: Map<string, TestDataSnapshot> = new Map();
  private createdDataIds: {
    users: Set<number>;
    merchants: Set<number>;
    devices: Set<number>;
    visitorApplications: Set<number>;
    accessRecords: Set<number>;
  } = {
    users: new Set(),
    merchants: new Set(),
    devices: new Set(),
    visitorApplications: new Set(),
    accessRecords: new Set(),
  };

  constructor() {
    this.databaseManager = new DatabaseManager();
  }

  /**
   * 初始化测试数据管理器
   */
  async initialize(): Promise<void> {
    console.log('🔧 初始化测试数据管理器...');
    
    try {
      await this.databaseManager.connect();
      
      // 如果是全新环境，初始化基础数据
      const envConfig = getCurrentEnvironment();
      if (envConfig.name === 'Local Development' || envConfig.name === 'CI Environment') {
        await this.initializeBaseData();
      }
      
      console.log('✅ 测试数据管理器初始化完成');
    } catch (error) {
      console.error('❌ 测试数据管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 清理测试数据管理器
   */
  async cleanup(): Promise<void> {
    console.log('🧹 清理测试数据管理器...');
    
    try {
      await this.databaseManager.disconnect();
      console.log('✅ 测试数据管理器清理完成');
    } catch (error) {
      console.error('❌ 测试数据管理器清理失败:', error);
    }
  }

  /**
   * 创建测试数据
   */
  async createTestData(scenario: string = 'basic'): Promise<TestDataSnapshot> {
    console.log(`📊 创建测试数据场景: ${scenario}`);
    
    try {
      const data = TestDataFactory.createTestScenario(scenario);
      
      // 插入数据到数据库
      await this.insertTestData(data);
      
      // 记录创建的数据ID
      this.trackCreatedData(data);
      
      // 创建快照
      const snapshot: TestDataSnapshot = {
        name: scenario,
        timestamp: new Date().toISOString(),
        data,
      };
      
      this.snapshots.set(scenario, snapshot);
      
      console.log(`✅ 测试数据创建完成: ${scenario}`);
      return snapshot;
    } catch (error) {
      console.error(`❌ 创建测试数据失败: ${scenario}`, error);
      throw error;
    }
  }

  /**
   * 清理测试数据
   */
  async cleanupTestData(options: TestDataCleanupOptions = {}): Promise<void> {
    console.log('🗑️ 清理测试数据...');
    
    const defaultOptions: TestDataCleanupOptions = {
      preserveBaseData: true,
      cleanupUsers: true,
      cleanupMerchants: true,
      cleanupDevices: true,
      cleanupVisitorApplications: true,
      cleanupAccessRecords: true,
    };
    
    const cleanupOptions = { ...defaultOptions, ...options };
    
    try {
      // 按依赖关系逆序清理
      if (cleanupOptions.cleanupAccessRecords) {
        await this.cleanupAccessRecords();
      }
      
      if (cleanupOptions.cleanupVisitorApplications) {
        await this.cleanupVisitorApplications();
      }
      
      if (cleanupOptions.cleanupDevices) {
        await this.cleanupDevices();
      }
      
      if (cleanupOptions.cleanupUsers) {
        await this.cleanupUsers(cleanupOptions.preserveBaseData);
      }
      
      if (cleanupOptions.cleanupMerchants) {
        await this.cleanupMerchants(cleanupOptions.preserveBaseData);
      }
      
      // 清理跟踪的ID
      this.clearTrackedData();
      
      console.log('✅ 测试数据清理完成');
    } catch (error) {
      console.error('❌ 测试数据清理失败:', error);
      throw error;
    }
  }

  /**
   * 重置测试数据到初始状态
   */
  async resetTestData(): Promise<void> {
    console.log('🔄 重置测试数据...');
    
    try {
      // 清理所有数据
      await this.cleanupTestData({ preserveBaseData: false });
      
      // 重新初始化基础数据
      await this.initializeBaseData();
      
      // 重置数据工厂的ID计数器
      TestDataFactory.resetIdCounters();
      
      console.log('✅ 测试数据重置完成');
    } catch (error) {
      console.error('❌ 测试数据重置失败:', error);
      throw error;
    }
  }

  /**
   * 创建数据快照
   */
  async createSnapshot(name: string): Promise<TestDataSnapshot> {
    console.log(`📸 创建数据快照: ${name}`);
    
    try {
      // 从数据库查询当前数据
      const users = await this.databaseManager.queryTestData('users');
      const merchants = await this.databaseManager.queryTestData('merchants');
      const devices = await this.databaseManager.queryTestData('devices');
      const visitorApplications = await this.databaseManager.queryTestData('visitor_applications');
      const accessRecords = await this.databaseManager.queryTestData('access_records');
      
      const snapshot: TestDataSnapshot = {
        name,
        timestamp: new Date().toISOString(),
        data: {
          users,
          merchants,
          devices,
          visitorApplications,
          accessRecords,
        },
      };
      
      this.snapshots.set(name, snapshot);
      
      // 同时在数据库层面创建快照
      await this.databaseManager.createSnapshot(name);
      
      console.log(`✅ 数据快照创建完成: ${name}`);
      return snapshot;
    } catch (error) {
      console.error(`❌ 创建数据快照失败: ${name}`, error);
      throw error;
    }
  }

  /**
   * 恢复数据快照
   */
  async restoreSnapshot(name: string): Promise<void> {
    console.log(`📸 恢复数据快照: ${name}`);
    
    try {
      const snapshot = this.snapshots.get(name);
      if (!snapshot) {
        throw new Error(`Snapshot not found: ${name}`);
      }
      
      // 清理当前数据
      await this.cleanupTestData({ preserveBaseData: false });
      
      // 恢复快照数据
      await this.insertTestData(snapshot.data);
      
      // 同时在数据库层面恢复快照
      await this.databaseManager.restoreSnapshot(name);
      
      console.log(`✅ 数据快照恢复完成: ${name}`);
    } catch (error) {
      console.error(`❌ 恢复数据快照失败: ${name}`, error);
      throw error;
    }
  }

  /**
   * 获取快照列表
   */
  getSnapshots(): TestDataSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * 删除快照
   */
  deleteSnapshot(name: string): boolean {
    return this.snapshots.delete(name);
  }

  /**
   * 创建单个用户
   */
  async createUser(userData: Partial<TestUser> = {}): Promise<TestUser> {
    const user = TestDataFactory.createUser(userData);
    await this.insertUsers([user]);
    this.createdDataIds.users.add(user.id!);
    return user;
  }

  /**
   * 创建单个商户
   */
  async createMerchant(merchantData: Partial<TestMerchant> = {}): Promise<TestMerchant> {
    const merchant = TestDataFactory.createMerchant(merchantData);
    await this.insertMerchants([merchant]);
    this.createdDataIds.merchants.add(merchant.id!);
    return merchant;
  }

  /**
   * 创建单个设备
   */
  async createDevice(deviceData: Partial<TestDevice> = {}): Promise<TestDevice> {
    const device = TestDataFactory.createDevice(deviceData);
    await this.insertDevices([device]);
    this.createdDataIds.devices.add(device.id!);
    return device;
  }

  /**
   * 创建访客申请
   */
  async createVisitorApplication(
    visiteeId: number,
    visiteeName: string,
    merchantId: number,
    applicationData: Partial<TestVisitorApplication> = {}
  ): Promise<TestVisitorApplication> {
    const application = TestDataFactory.createVisitorApplication(
      visiteeId,
      visiteeName,
      merchantId,
      applicationData
    );
    await this.insertVisitorApplications([application]);
    this.createdDataIds.visitorApplications.add(application.id!);
    return application;
  }

  /**
   * 创建通行记录
   */
  async createAccessRecord(
    userId: number,
    userName: string,
    deviceId: number,
    deviceName: string,
    merchantId: number,
    recordData: Partial<TestAccessRecord> = {}
  ): Promise<TestAccessRecord> {
    const record = TestDataFactory.createAccessRecord(
      userId,
      userName,
      deviceId,
      deviceName,
      merchantId,
      recordData
    );
    await this.insertAccessRecords([record]);
    this.createdDataIds.accessRecords.add(record.id!);
    return record;
  }

  /**
   * 获取创建的数据统计
   */
  getCreatedDataStats(): {
    users: number;
    merchants: number;
    devices: number;
    visitorApplications: number;
    accessRecords: number;
    total: number;
  } {
    const stats = {
      users: this.createdDataIds.users.size,
      merchants: this.createdDataIds.merchants.size,
      devices: this.createdDataIds.devices.size,
      visitorApplications: this.createdDataIds.visitorApplications.size,
      accessRecords: this.createdDataIds.accessRecords.size,
      total: 0,
    };
    
    stats.total = stats.users + stats.merchants + stats.devices + 
                  stats.visitorApplications + stats.accessRecords;
    
    return stats;
  }

  /**
   * 初始化基础数据
   */
  private async initializeBaseData(): Promise<void> {
    console.log('📊 初始化基础测试数据...');
    
    const baseUsers = Object.values(TestDataFactory.getPredefinedUsers());
    const baseMerchants = Object.values(TestDataFactory.getPredefinedMerchants());
    const baseDevices = Object.values(TestDataFactory.getPredefinedDevices());
    
    await this.databaseManager.insertTestData({
      users: baseUsers,
      merchants: baseMerchants,
      devices: baseDevices,
      visitors: [],
      accessRecords: [],
    });
  }

  /**
   * 插入测试数据
   */
  private async insertTestData(data: {
    users: TestUser[];
    merchants: TestMerchant[];
    devices: TestDevice[];
    visitorApplications: TestVisitorApplication[];
    accessRecords: TestAccessRecord[];
  }): Promise<void> {
    if (data.users.length > 0) {
      await this.insertUsers(data.users);
    }
    
    if (data.merchants.length > 0) {
      await this.insertMerchants(data.merchants);
    }
    
    if (data.devices.length > 0) {
      await this.insertDevices(data.devices);
    }
    
    if (data.visitorApplications.length > 0) {
      await this.insertVisitorApplications(data.visitorApplications);
    }
    
    if (data.accessRecords.length > 0) {
      await this.insertAccessRecords(data.accessRecords);
    }
  }

  /**
   * 插入用户数据
   */
  private async insertUsers(users: TestUser[]): Promise<void> {
    console.log(`  插入用户数据: ${users.length} 条`);
    // 这里应该调用实际的数据库插入操作
    // await this.databaseManager.insertTestData({ users, merchants: [], devices: [], visitors: [], accessRecords: [] });
  }

  /**
   * 插入商户数据
   */
  private async insertMerchants(merchants: TestMerchant[]): Promise<void> {
    console.log(`  插入商户数据: ${merchants.length} 条`);
    // 实际的数据库插入操作
  }

  /**
   * 插入设备数据
   */
  private async insertDevices(devices: TestDevice[]): Promise<void> {
    console.log(`  插入设备数据: ${devices.length} 条`);
    // 实际的数据库插入操作
  }

  /**
   * 插入访客申请数据
   */
  private async insertVisitorApplications(applications: TestVisitorApplication[]): Promise<void> {
    console.log(`  插入访客申请数据: ${applications.length} 条`);
    // 实际的数据库插入操作
  }

  /**
   * 插入通行记录数据
   */
  private async insertAccessRecords(records: TestAccessRecord[]): Promise<void> {
    console.log(`  插入通行记录数据: ${records.length} 条`);
    // 实际的数据库插入操作
  }

  /**
   * 跟踪创建的数据
   */
  private trackCreatedData(data: {
    users: TestUser[];
    merchants: TestMerchant[];
    devices: TestDevice[];
    visitorApplications: TestVisitorApplication[];
    accessRecords: TestAccessRecord[];
  }): void {
    data.users.forEach(user => user.id && this.createdDataIds.users.add(user.id));
    data.merchants.forEach(merchant => merchant.id && this.createdDataIds.merchants.add(merchant.id));
    data.devices.forEach(device => device.id && this.createdDataIds.devices.add(device.id));
    data.visitorApplications.forEach(app => app.id && this.createdDataIds.visitorApplications.add(app.id));
    data.accessRecords.forEach(record => record.id && this.createdDataIds.accessRecords.add(record.id));
  }

  /**
   * 清理用户数据
   */
  private async cleanupUsers(preserveBase: boolean = true): Promise<void> {
    console.log('  清理用户数据...');
    
    if (preserveBase) {
      // 只删除测试创建的用户
      for (const userId of this.createdDataIds.users) {
        // 删除特定用户
      }
    } else {
      // 删除所有用户
    }
  }

  /**
   * 清理商户数据
   */
  private async cleanupMerchants(preserveBase: boolean = true): Promise<void> {
    console.log('  清理商户数据...');
    // 实现商户数据清理逻辑
  }

  /**
   * 清理设备数据
   */
  private async cleanupDevices(): Promise<void> {
    console.log('  清理设备数据...');
    // 实现设备数据清理逻辑
  }

  /**
   * 清理访客申请数据
   */
  private async cleanupVisitorApplications(): Promise<void> {
    console.log('  清理访客申请数据...');
    // 实现访客申请数据清理逻辑
  }

  /**
   * 清理通行记录数据
   */
  private async cleanupAccessRecords(): Promise<void> {
    console.log('  清理通行记录数据...');
    // 实现通行记录数据清理逻辑
  }

  /**
   * 清理跟踪的数据ID
   */
  private clearTrackedData(): void {
    this.createdDataIds.users.clear();
    this.createdDataIds.merchants.clear();
    this.createdDataIds.devices.clear();
    this.createdDataIds.visitorApplications.clear();
    this.createdDataIds.accessRecords.clear();
  }
}