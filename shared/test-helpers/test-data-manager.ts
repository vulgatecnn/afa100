/**
 * 测试数据管理器
 * 用于管理测试数据的版本控制、回滚和清理
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

export interface TestDataSnapshot {
  id: string;
  name: string;
  description: string;
  timestamp: string;
  version: string;
  environment: string;
  tables: TestTableSnapshot[];
  files: TestFileSnapshot[];
  metadata: Record<string, any>;
}

export interface TestTableSnapshot {
  tableName: string;
  rowCount: number;
  checksum: string;
  data: any[];
}

export interface TestFileSnapshot {
  path: string;
  size: number;
  checksum: string;
  content?: string;
}

export interface TestDataConfig {
  snapshotDir: string;
  maxSnapshots: number;
  autoCleanup: boolean;
  compressionEnabled: boolean;
  excludeTables: string[];
  excludeFiles: string[];
}

/**
 * 测试数据管理器
 */
export class TestDataManager {
  private config: TestDataConfig;
  private dbConfig: any;

  constructor(config?: Partial<TestDataConfig>) {
    this.config = {
      snapshotDir: process.env.TEST_SNAPSHOT_DIR || './test-snapshots',
      maxSnapshots: parseInt(process.env.TEST_MAX_SNAPSHOTS || '10'),
      autoCleanup: process.env.TEST_AUTO_CLEANUP !== 'false',
      compressionEnabled: process.env.TEST_COMPRESSION_ENABLED !== 'false',
      excludeTables: (process.env.TEST_EXCLUDE_TABLES || '').split(',').filter(Boolean),
      excludeFiles: (process.env.TEST_EXCLUDE_FILES || '').split(',').filter(Boolean),
      ...config,
    };

    this.dbConfig = this.loadDatabaseConfig();
    this.ensureSnapshotDirectory();
  }

  /**
   * 创建测试数据快照
   */
  public async createSnapshot(name: string, description?: string): Promise<string> {
    console.log(`📸 创建测试数据快照: ${name}`);

    const snapshotId = this.generateSnapshotId();
    const snapshot: TestDataSnapshot = {
      id: snapshotId,
      name,
      description: description || `测试数据快照 - ${name}`,
      timestamp: new Date().toISOString(),
      version: this.getVersion(),
      environment: process.env.NODE_ENV || 'test',
      tables: [],
      files: [],
      metadata: {
        creator: process.env.USER || 'system',
        branch: this.getCurrentBranch(),
        commit: this.getCurrentCommit(),
      },
    };

    try {
      // 快照数据库表
      snapshot.tables = await this.snapshotDatabaseTables();
      
      // 快照测试文件
      snapshot.files = await this.snapshotTestFiles();
      
      // 保存快照
      await this.saveSnapshot(snapshot);
      
      // 自动清理旧快照
      if (this.config.autoCleanup) {
        await this.cleanupOldSnapshots();
      }
      
      console.log(`✅ 快照创建成功: ${snapshotId}`);
      return snapshotId;
    } catch (error) {
      console.error(`❌ 快照创建失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 恢复测试数据快照
   */
  public async restoreSnapshot(snapshotId: string): Promise<void> {
    console.log(`🔄 恢复测试数据快照: ${snapshotId}`);

    const snapshot = await this.loadSnapshot(snapshotId);
    if (!snapshot) {
      throw new Error(`快照不存在: ${snapshotId}`);
    }

    try {
      // 恢复数据库表
      await this.restoreDatabaseTables(snapshot.tables);
      
      // 恢复测试文件
      await this.restoreTestFiles(snapshot.files);
      
      console.log(`✅ 快照恢复成功: ${snapshotId}`);
    } catch (error) {
      console.error(`❌ 快照恢复失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 列出所有快照
   */
  public async listSnapshots(): Promise<TestDataSnapshot[]> {
    const snapshotFiles = readdirSync(this.config.snapshotDir)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => b.localeCompare(a)); // 按时间倒序

    const snapshots: TestDataSnapshot[] = [];
    
    for (const file of snapshotFiles) {
      try {
        const snapshot = await this.loadSnapshot(file.replace('.json', ''));
        if (snapshot) {
          snapshots.push(snapshot);
        }
      } catch (error) {
        console.error(`读取快照失败: ${file}`, error.message);
      }
    }

    return snapshots;
  }

  /**
   * 删除快照
   */
  public async deleteSnapshot(snapshotId: string): Promise<void> {
    console.log(`🗑️ 删除测试数据快照: ${snapshotId}`);

    const snapshotFile = join(this.config.snapshotDir, `${snapshotId}.json`);
    const dataDir = join(this.config.snapshotDir, snapshotId);

    if (existsSync(snapshotFile)) {
      unlinkSync(snapshotFile);
    }

    if (existsSync(dataDir)) {
      this.removeDirectory(dataDir);
    }

    console.log(`✅ 快照删除成功: ${snapshotId}`);
  }

  /**
   * 比较两个快照的差异
   */
  public async compareSnapshots(snapshotId1: string, snapshotId2: string): Promise<any> {
    const snapshot1 = await this.loadSnapshot(snapshotId1);
    const snapshot2 = await this.loadSnapshot(snapshotId2);

    if (!snapshot1 || !snapshot2) {
      throw new Error('快照不存在');
    }

    const differences = {
      tables: this.compareTableSnapshots(snapshot1.tables, snapshot2.tables),
      files: this.compareFileSnapshots(snapshot1.files, snapshot2.files),
      metadata: this.compareMetadata(snapshot1.metadata, snapshot2.metadata),
    };

    return differences;
  }

  /**
   * 清理测试数据
   */
  public async cleanupTestData(): Promise<void> {
    console.log('🧹 清理测试数据...');

    try {
      // 清理数据库
      await this.cleanupDatabase();
      
      // 清理测试文件
      await this.cleanupTestFiles();
      
      console.log('✅ 测试数据清理完成');
    } catch (error) {
      console.error('❌ 测试数据清理失败:', error.message);
      throw error;
    }
  }

  /**
   * 初始化测试数据
   */
  public async initializeTestData(): Promise<void> {
    console.log('🚀 初始化测试数据...');

    try {
      // 创建测试数据库结构
      await this.createDatabaseSchema();
      
      // 插入基础测试数据
      await this.insertBaseTestData();
      
      console.log('✅ 测试数据初始化完成');
    } catch (error) {
      console.error('❌ 测试数据初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 快照数据库表
   */
  private async snapshotDatabaseTables(): Promise<TestTableSnapshot[]> {
    const tables: TestTableSnapshot[] = [];
    const tableNames = await this.getDatabaseTables();

    for (const tableName of tableNames) {
      if (this.config.excludeTables.includes(tableName)) {
        continue;
      }

      try {
        const data = await this.getTableData(tableName);
        const checksum = this.calculateChecksum(JSON.stringify(data));

        tables.push({
          tableName,
          rowCount: data.length,
          checksum,
          data,
        });
      } catch (error) {
        console.error(`快照表失败: ${tableName}`, error.message);
      }
    }

    return tables;
  }

  /**
   * 快照测试文件
   */
  private async snapshotTestFiles(): Promise<TestFileSnapshot[]> {
    const files: TestFileSnapshot[] = [];
    const testFilePaths = this.getTestFilePaths();

    for (const filePath of testFilePaths) {
      if (this.config.excludeFiles.some(pattern => filePath.includes(pattern))) {
        continue;
      }

      try {
        if (existsSync(filePath)) {
          const stat = statSync(filePath);
          const content = readFileSync(filePath, 'utf8');
          const checksum = this.calculateChecksum(content);

          files.push({
            path: filePath,
            size: stat.size,
            checksum,
            content: this.config.compressionEnabled ? this.compress(content) : content,
          });
        }
      } catch (error) {
        console.error(`快照文件失败: ${filePath}`, error.message);
      }
    }

    return files;
  }

  /**
   * 恢复数据库表
   */
  private async restoreDatabaseTables(tables: TestTableSnapshot[]): Promise<void> {
    for (const table of tables) {
      try {
        // 清空表
        await this.truncateTable(table.tableName);
        
        // 插入数据
        if (table.data.length > 0) {
          await this.insertTableData(table.tableName, table.data);
        }
        
        console.log(`✅ 恢复表: ${table.tableName} (${table.rowCount} 行)`);
      } catch (error) {
        console.error(`❌ 恢复表失败: ${table.tableName}`, error.message);
      }
    }
  }

  /**
   * 恢复测试文件
   */
  private async restoreTestFiles(files: TestFileSnapshot[]): Promise<void> {
    for (const file of files) {
      try {
        const dir = dirname(file.path);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }

        const content = this.config.compressionEnabled ? 
          this.decompress(file.content!) : file.content!;
        
        writeFileSync(file.path, content);
        console.log(`✅ 恢复文件: ${file.path}`);
      } catch (error) {
        console.error(`❌ 恢复文件失败: ${file.path}`, error.message);
      }
    }
  }

  /**
   * 保存快照
   */
  private async saveSnapshot(snapshot: TestDataSnapshot): Promise<void> {
    const snapshotFile = join(this.config.snapshotDir, `${snapshot.id}.json`);
    const dataDir = join(this.config.snapshotDir, snapshot.id);

    // 保存快照元数据
    writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2));

    // 保存大文件数据（如果需要）
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * 加载快照
   */
  private async loadSnapshot(snapshotId: string): Promise<TestDataSnapshot | null> {
    const snapshotFile = join(this.config.snapshotDir, `${snapshotId}.json`);
    
    if (!existsSync(snapshotFile)) {
      return null;
    }

    try {
      const content = readFileSync(snapshotFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`加载快照失败: ${snapshotId}`, error.message);
      return null;
    }
  }

  /**
   * 清理旧快照
   */
  private async cleanupOldSnapshots(): Promise<void> {
    const snapshots = await this.listSnapshots();
    
    if (snapshots.length > this.config.maxSnapshots) {
      const toDelete = snapshots.slice(this.config.maxSnapshots);
      
      for (const snapshot of toDelete) {
        await this.deleteSnapshot(snapshot.id);
      }
      
      console.log(`🧹 清理了 ${toDelete.length} 个旧快照`);
    }
  }

  /**
   * 加载数据库配置
   */
  private loadDatabaseConfig(): any {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME || 'afa_office_test',
      username: process.env.DB_USER || 'afa_test',
      password: process.env.DB_PASSWORD || 'test_password',
    };
  }

  /**
   * 确保快照目录存在
   */
  private ensureSnapshotDirectory(): void {
    if (!existsSync(this.config.snapshotDir)) {
      mkdirSync(this.config.snapshotDir, { recursive: true });
    }
  }

  /**
   * 生成快照ID
   */
  private generateSnapshotId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `snapshot-${timestamp}-${random}`;
  }

  /**
   * 获取版本信息
   */
  private getVersion(): string {
    try {
      const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  /**
   * 获取当前分支
   */
  private getCurrentBranch(): string {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * 获取当前提交
   */
  private getCurrentCommit(): string {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * 获取数据库表列表
   */
  private async getDatabaseTables(): Promise<string[]> {
    // 这里需要根据实际数据库实现
    // 示例返回常见的表名
    return [
      'users',
      'merchants',
      'merchant_employees',
      'visitors',
      'access_logs',
      'permissions',
      'roles',
    ];
  }

  /**
   * 获取表数据
   */
  private async getTableData(tableName: string): Promise<any[]> {
    // 这里需要根据实际数据库实现
    // 示例实现
    console.log(`获取表数据: ${tableName}`);
    return [];
  }

  /**
   * 清空表
   */
  private async truncateTable(tableName: string): Promise<void> {
    // 这里需要根据实际数据库实现
    console.log(`清空表: ${tableName}`);
  }

  /**
   * 插入表数据
   */
  private async insertTableData(tableName: string, data: any[]): Promise<void> {
    // 这里需要根据实际数据库实现
    console.log(`插入表数据: ${tableName}, ${data.length} 行`);
  }

  /**
   * 获取测试文件路径
   */
  private getTestFilePaths(): string[] {
    const paths: string[] = [];
    
    // 添加常见的测试文件路径
    const testDirs = [
      './tests/fixtures',
      './tests/data',
      './test-data',
      './.env.test',
      './.env.integration',
    ];

    for (const dir of testDirs) {
      if (existsSync(dir)) {
        if (statSync(dir).isDirectory()) {
          paths.push(...this.getFilesRecursively(dir));
        } else {
          paths.push(dir);
        }
      }
    }

    return paths;
  }

  /**
   * 递归获取文件
   */
  private getFilesRecursively(dir: string): string[] {
    const files: string[] = [];
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.getFilesRecursively(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * 计算校验和
   */
  private calculateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * 压缩内容
   */
  private compress(content: string): string {
    // 简单的压缩实现，实际可以使用zlib
    return Buffer.from(content).toString('base64');
  }

  /**
   * 解压缩内容
   */
  private decompress(content: string): string {
    // 简单的解压缩实现
    return Buffer.from(content, 'base64').toString('utf8');
  }

  /**
   * 比较表快照
   */
  private compareTableSnapshots(tables1: TestTableSnapshot[], tables2: TestTableSnapshot[]): any {
    const differences = [];
    
    for (const table1 of tables1) {
      const table2 = tables2.find(t => t.tableName === table1.tableName);
      
      if (!table2) {
        differences.push({
          table: table1.tableName,
          type: 'deleted',
          details: `表在快照2中不存在`,
        });
      } else if (table1.checksum !== table2.checksum) {
        differences.push({
          table: table1.tableName,
          type: 'modified',
          details: `行数: ${table1.rowCount} -> ${table2.rowCount}`,
        });
      }
    }

    for (const table2 of tables2) {
      if (!tables1.find(t => t.tableName === table2.tableName)) {
        differences.push({
          table: table2.tableName,
          type: 'added',
          details: `表在快照1中不存在`,
        });
      }
    }

    return differences;
  }

  /**
   * 比较文件快照
   */
  private compareFileSnapshots(files1: TestFileSnapshot[], files2: TestFileSnapshot[]): any {
    const differences = [];
    
    for (const file1 of files1) {
      const file2 = files2.find(f => f.path === file1.path);
      
      if (!file2) {
        differences.push({
          file: file1.path,
          type: 'deleted',
          details: `文件在快照2中不存在`,
        });
      } else if (file1.checksum !== file2.checksum) {
        differences.push({
          file: file1.path,
          type: 'modified',
          details: `大小: ${file1.size} -> ${file2.size}`,
        });
      }
    }

    for (const file2 of files2) {
      if (!files1.find(f => f.path === file2.path)) {
        differences.push({
          file: file2.path,
          type: 'added',
          details: `文件在快照1中不存在`,
        });
      }
    }

    return differences;
  }

  /**
   * 比较元数据
   */
  private compareMetadata(metadata1: Record<string, any>, metadata2: Record<string, any>): any {
    const differences = [];
    
    for (const [key, value1] of Object.entries(metadata1)) {
      const value2 = metadata2[key];
      
      if (value2 === undefined) {
        differences.push({
          key,
          type: 'deleted',
          details: `键在快照2中不存在`,
        });
      } else if (value1 !== value2) {
        differences.push({
          key,
          type: 'modified',
          details: `${value1} -> ${value2}`,
        });
      }
    }

    for (const [key, value2] of Object.entries(metadata2)) {
      if (metadata1[key] === undefined) {
        differences.push({
          key,
          type: 'added',
          details: `键在快照1中不存在`,
        });
      }
    }

    return differences;
  }

  /**
   * 清理数据库
   */
  private async cleanupDatabase(): Promise<void> {
    const tables = await this.getDatabaseTables();
    
    for (const table of tables) {
      await this.truncateTable(table);
    }
  }

  /**
   * 清理测试文件
   */
  private async cleanupTestFiles(): Promise<void> {
    const testDirs = ['./test-uploads', './test-temp', './test-cache'];
    
    for (const dir of testDirs) {
      if (existsSync(dir)) {
        this.removeDirectory(dir);
      }
    }
  }

  /**
   * 创建数据库结构
   */
  private async createDatabaseSchema(): Promise<void> {
    // 这里需要根据实际数据库实现
    console.log('创建数据库结构...');
  }

  /**
   * 插入基础测试数据
   */
  private async insertBaseTestData(): Promise<void> {
    // 这里需要根据实际需求实现
    console.log('插入基础测试数据...');
  }

  /**
   * 删除目录
   */
  private removeDirectory(dir: string): void {
    if (existsSync(dir)) {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          this.removeDirectory(fullPath);
        } else {
          unlinkSync(fullPath);
        }
      }
      
      // 删除空目录
      try {
        require('fs').rmdirSync(dir);
      } catch (error) {
        // 忽略删除失败
      }
    }
  }
}