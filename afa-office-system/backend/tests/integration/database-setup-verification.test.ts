/**
 * 集成测试数据库环境验证测试
 * 验证数据库环境是否正确设置和可用
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// 加载集成测试环境变量
dotenv.config({ path: '.env.integration' });

describe('集成测试数据库环境验证', () => {
  let connection: mysql.Connection;

  const integrationTestConfig = {
    host: process.env.INTEGRATION_TEST_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.INTEGRATION_TEST_DB_PORT || '3306'),
    user: process.env.INTEGRATION_TEST_DB_USER || 'afa_integration_user',
    password: process.env.INTEGRATION_TEST_DB_PASSWORD || 'afa_integration_2024',
    database: process.env.INTEGRATION_TEST_DB_NAME || 'afa_office_integration_test'
  };

  beforeAll(async () => {
    try {
      connection = await mysql.createConnection(integrationTestConfig);
    } catch (error) {
      console.error('❌ 无法连接到集成测试数据库:', error);
      console.error('💡 请先运行: pnpm db:integration:init');
      throw error;
    }
  });

  afterAll(async () => {
    if (connection) {
      await connection.end();
    }
  });

  describe('数据库连接验证', () => {
    it('应该能够连接到集成测试数据库', async () => {
      const [result] = await connection.execute('SELECT 1 as test');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect((result as any)[0].test).toBe(1);
    });

    it('应该能够查询数据库信息', async () => {
      const [result] = await connection.execute('SELECT DATABASE() as db_name');
      expect(result).toBeDefined();
      expect((result as any)[0].db_name).toBe(integrationTestConfig.database);
    });

    it('应该具有正确的字符集', async () => {
      const [result] = await connection.execute(`
        SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME 
        FROM INFORMATION_SCHEMA.SCHEMATA 
        WHERE SCHEMA_NAME = ?
      `, [integrationTestConfig.database]);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect((result as any)[0].DEFAULT_CHARACTER_SET_NAME).toBe('utf8mb4');
      expect((result as any)[0].DEFAULT_COLLATION_NAME).toBe('utf8mb4_unicode_ci');
    });
  });

  describe('表结构验证', () => {
    const expectedTables = [
      'users',
      'merchants', 
      'projects',
      'venues',
      'floors',
      'visitor_applications',
      'passcodes',
      'access_records',
      'permissions',
      'user_permissions',
      'merchant_permissions'
    ];

    it('应该包含所有必需的表', async () => {
      const [tables] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME
      `, [integrationTestConfig.database]);

      const existingTables = (tables as any[]).map(t => t.TABLE_NAME);
      
      for (const expectedTable of expectedTables) {
        expect(existingTables).toContain(expectedTable);
      }
    });

    it('用户表应该有正确的结构', async () => {
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
        ORDER BY ORDINAL_POSITION
      `, [integrationTestConfig.database]);

      const columnNames = (columns as any[]).map(c => c.COLUMN_NAME);
      
      const expectedColumns = [
        'id', 'name', 'phone', 'open_id', 'union_id', 'avatar',
        'user_type', 'status', 'merchant_id', 'password', 'created_at', 'updated_at'
      ];

      for (const expectedColumn of expectedColumns) {
        expect(columnNames).toContain(expectedColumn);
      }

      // 验证主键
      const idColumn = (columns as any[]).find(c => c.COLUMN_NAME === 'id');
      expect(idColumn.COLUMN_KEY).toBe('PRI');
    });

    it('商户表应该有正确的结构', async () => {
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'merchants'
        ORDER BY ORDINAL_POSITION
      `, [integrationTestConfig.database]);

      const columnNames = (columns as any[]).map(c => c.COLUMN_NAME);
      
      const expectedColumns = [
        'id', 'name', 'code', 'contact', 'phone', 'email', 'address',
        'status', 'settings', 'created_at', 'updated_at'
      ];

      for (const expectedColumn of expectedColumns) {
        expect(columnNames).toContain(expectedColumn);
      }

      // 验证唯一约束
      const codeColumn = (columns as any[]).find(c => c.COLUMN_NAME === 'code');
      expect(codeColumn.COLUMN_KEY).toBe('UNI');
    });

    it('访客申请表应该有正确的结构', async () => {
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'visitor_applications'
        ORDER BY ORDINAL_POSITION
      `, [integrationTestConfig.database]);

      const columnNames = (columns as any[]).map(c => c.COLUMN_NAME);
      
      const expectedColumns = [
        'id', 'applicant_id', 'merchant_id', 'visitee_id', 'visitor_name',
        'visitor_phone', 'visitor_company', 'visit_purpose', 'visit_type',
        'scheduled_time', 'duration', 'status', 'approved_by', 'approved_at',
        'rejection_reason', 'passcode', 'passcode_expiry', 'usage_limit',
        'usage_count', 'created_at', 'updated_at'
      ];

      for (const expectedColumn of expectedColumns) {
        expect(columnNames).toContain(expectedColumn);
      }
    });
  });

  describe('外键约束验证', () => {
    it('应该有正确的外键约束', async () => {
      const [constraints] = await connection.execute(`
        SELECT 
          TABLE_NAME,
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME,
          CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = ? 
        AND REFERENCED_TABLE_NAME IS NOT NULL
        ORDER BY TABLE_NAME, COLUMN_NAME
      `, [integrationTestConfig.database]);

      expect(Array.isArray(constraints)).toBe(true);
      expect((constraints as any[]).length).toBeGreaterThan(0);

      // 验证用户表的商户外键
      const userMerchantFK = (constraints as any[]).find(c => 
        c.TABLE_NAME === 'users' && c.COLUMN_NAME === 'merchant_id'
      );
      expect(userMerchantFK).toBeDefined();
      expect(userMerchantFK.REFERENCED_TABLE_NAME).toBe('merchants');
      expect(userMerchantFK.REFERENCED_COLUMN_NAME).toBe('id');

      // 验证场地表的项目外键
      const venueProjectFK = (constraints as any[]).find(c => 
        c.TABLE_NAME === 'venues' && c.COLUMN_NAME === 'project_id'
      );
      expect(venueProjectFK).toBeDefined();
      expect(venueProjectFK.REFERENCED_TABLE_NAME).toBe('projects');

      // 验证楼层表的场地外键
      const floorVenueFK = (constraints as any[]).find(c => 
        c.TABLE_NAME === 'floors' && c.COLUMN_NAME === 'venue_id'
      );
      expect(floorVenueFK).toBeDefined();
      expect(floorVenueFK.REFERENCED_TABLE_NAME).toBe('venues');
    });
  });

  describe('索引验证', () => {
    it('应该有必要的索引', async () => {
      const [indexes] = await connection.execute(`
        SELECT 
          TABLE_NAME,
          INDEX_NAME,
          COLUMN_NAME,
          NON_UNIQUE
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = ?
        AND INDEX_NAME != 'PRIMARY'
        ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
      `, [integrationTestConfig.database]);

      expect(Array.isArray(indexes)).toBe(true);
      expect((indexes as any[]).length).toBeGreaterThan(0);

      const indexNames = (indexes as any[]).map(i => `${i.TABLE_NAME}.${i.INDEX_NAME}`);
      
      // 验证重要的索引存在
      expect(indexNames.some(name => name.includes('users') && name.includes('phone'))).toBe(true);
      expect(indexNames.some(name => name.includes('users') && name.includes('open_id'))).toBe(true);
      expect(indexNames.some(name => name.includes('merchants') && name.includes('code'))).toBe(true);
      expect(indexNames.some(name => name.includes('visitor_applications') && name.includes('status'))).toBe(true);
    });
  });

  describe('基础数据验证', () => {
    it('权限表应该包含基础权限数据', async () => {
      const [permissions] = await connection.execute('SELECT COUNT(*) as count FROM permissions');
      expect((permissions as any)[0].count).toBeGreaterThan(0);
    });

    it('应该能够插入和查询测试数据', async () => {
      // 插入测试商户
      const [merchantResult] = await connection.execute(`
        INSERT INTO merchants (name, code, contact, phone, status) 
        VALUES ('测试商户', 'TEST_MERCHANT_001', '测试联系人', '13800138000', 'active')
      `);
      
      expect((merchantResult as any).insertId).toBeGreaterThan(0);
      const merchantId = (merchantResult as any).insertId;

      // 插入测试用户
      const [userResult] = await connection.execute(`
        INSERT INTO users (name, phone, user_type, status, merchant_id) 
        VALUES ('测试用户', '13800138001', 'employee', 'active', ?)
      `, [merchantId]);
      
      expect((userResult as any).insertId).toBeGreaterThan(0);
      const userId = (userResult as any).insertId;

      // 查询插入的数据
      const [users] = await connection.execute('SELECT * FROM users WHERE id = ?', [userId]);
      expect(Array.isArray(users)).toBe(true);
      expect((users as any).length).toBe(1);
      expect((users as any)[0].name).toBe('测试用户');
      expect((users as any)[0].merchant_id).toBe(merchantId);

      // 清理测试数据
      await connection.execute('DELETE FROM users WHERE id = ?', [userId]);
      await connection.execute('DELETE FROM merchants WHERE id = ?', [merchantId]);
    });
  });

  describe('事务支持验证', () => {
    it('应该支持事务操作', async () => {
      await connection.beginTransaction();

      try {
        // 插入测试数据
        const [merchantResult] = await connection.execute(`
          INSERT INTO merchants (name, code, contact, phone, status) 
          VALUES ('事务测试商户', 'TRANSACTION_TEST', '测试', '13800138002', 'active')
        `);
        
        const merchantId = (merchantResult as any).insertId;
        expect(merchantId).toBeGreaterThan(0);

        // 回滚事务
        await connection.rollback();

        // 验证数据已回滚
        const [merchants] = await connection.execute('SELECT * FROM merchants WHERE id = ?', [merchantId]);
        expect((merchants as any).length).toBe(0);

      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });

    it('应该支持事务提交', async () => {
      await connection.beginTransaction();

      try {
        // 插入测试数据
        const [merchantResult] = await connection.execute(`
          INSERT INTO merchants (name, code, contact, phone, status) 
          VALUES ('提交测试商户', 'COMMIT_TEST', '测试', '13800138003', 'active')
        `);
        
        const merchantId = (merchantResult as any).insertId;
        expect(merchantId).toBeGreaterThan(0);

        // 提交事务
        await connection.commit();

        // 验证数据已提交
        const [merchants] = await connection.execute('SELECT * FROM merchants WHERE id = ?', [merchantId]);
        expect((merchants as any).length).toBe(1);
        expect((merchants as any)[0].name).toBe('提交测试商户');

        // 清理数据
        await connection.execute('DELETE FROM merchants WHERE id = ?', [merchantId]);

      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });
  });

  describe('性能验证', () => {
    it('基本查询性能应该可接受', async () => {
      const startTime = Date.now();
      
      // 执行一些基本查询
      await connection.execute('SELECT COUNT(*) FROM users');
      await connection.execute('SELECT COUNT(*) FROM merchants');
      await connection.execute('SELECT COUNT(*) FROM permissions');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 基本查询应该在1秒内完成
      expect(duration).toBeLessThan(1000);
    });

    it('复杂查询性能应该可接受', async () => {
      const startTime = Date.now();
      
      // 执行复杂查询
      await connection.execute(`
        SELECT u.*, m.name as merchant_name 
        FROM users u 
        LEFT JOIN merchants m ON u.merchant_id = m.id 
        WHERE u.status = 'active'
        LIMIT 100
      `);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 复杂查询应该在2秒内完成
      expect(duration).toBeLessThan(2000);
    });
  });
});