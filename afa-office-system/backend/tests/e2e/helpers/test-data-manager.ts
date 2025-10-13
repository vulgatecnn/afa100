import fs from 'fs/promises';
import path from 'path';

/**
 * 测试数据管理器
 * 负责加载测试数据fixtures并填充到数据库
 */
export class TestDataManager {
  private fixturesDir = 'tests/e2e/fixtures/data';
  private loadedFixtures: Map<string, any[]> = new Map();

  /**
   * 加载所有测试数据fixtures
   */
  async loadFixtures(): Promise<void> {
    console.log('加载测试数据fixtures...');

    const fixtureFiles = [
      'users.json',
      'merchants.json', 
      'spaces.json',
      'visitor-applications.json',
      'access-records.json'
    ];

    for (const file of fixtureFiles) {
      try {
        const filePath = path.join(this.fixturesDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        const tableName = file.replace('.json', '').replace('-', '_');
        this.loadedFixtures.set(tableName, data);
        
        console.log(`✅ 加载 ${file}: ${data.length} 条记录`);
      } catch (error) {
        console.warn(`⚠️ 加载 ${file} 失败:`, error);
      }
    }
  }

  /**
   * 将测试数据填充到数据库
   */
  async seedDatabase(): Promise<void> {
    console.log('填充测试数据到数据库...');

    // 按依赖顺序插入数据
    const insertOrder = [
      'users',
      'merchants', 
      'spaces',
      'visitor_applications',
      'access_records'
    ];

    for (const tableName of insertOrder) {
      const data = this.loadedFixtures.get(tableName);
      if (data && data.length > 0) {
        await this.insertTableData(tableName, data);
        console.log(`✅ 插入 ${tableName}: ${data.length} 条记录`);
      }
    }
  }

  /**
   * 插入表数据
   */
  private async insertTableData(tableName: string, data: any[]): Promise<void> {
    // 这里需要实际的数据库插入逻辑
    // 暂时用日志表示
    console.log(`插入数据到表 ${tableName}:`, data.length, '条记录');
    
    // 实际实现应该类似:
    // const db = await getDatabase();
    // for (const record of data) {
    //   await db.insert(tableName, record);
    // }
  }

  /**
   * 获取特定表的测试数据
   */
  getFixtureData(tableName: string): any[] {
    return this.loadedFixtures.get(tableName) || [];
  }

  /**
   * 获取特定用户的测试数据
   */
  getUserByRole(role: string): any | null {
    const users = this.getFixtureData('users');
    return users.find(user => user.role === role) || null;
  }

  /**
   * 获取测试商户数据
   */
  getTestMerchant(): any | null {
    const merchants = this.getFixtureData('merchants');
    return merchants[0] || null;
  }

  /**
   * 获取测试空间数据
   */
  getTestSpace(): any | null {
    const spaces = this.getFixtureData('spaces');
    return spaces[0] || null;
  }

  /**
   * 创建测试访客申请数据
   */
  createTestVisitorApplication(overrides: Partial<any> = {}): any {
    const defaultApplication = {
      visitor_name: '测试访客',
      visitor_phone: '13800138000',
      visitor_company: '测试公司',
      visit_purpose: '业务洽谈',
      visit_date: new Date().toISOString().split('T')[0],
      visit_time_start: '09:00',
      visit_time_end: '17:00',
      merchant_id: 1,
      space_id: 1,
      status: 'pending'
    };

    return { ...defaultApplication, ...overrides };
  }

  /**
   * 创建测试通行记录数据
   */
  createTestAccessRecord(overrides: Partial<any> = {}): any {
    const defaultRecord = {
      user_id: 1,
      access_type: 'entry',
      access_method: 'qr_code',
      space_id: 1,
      status: 'success'
    };

    return { ...defaultRecord, ...overrides };
  }

  /**
   * 清理加载的fixtures
   */
  clearFixtures(): void {
    this.loadedFixtures.clear();
  }
}