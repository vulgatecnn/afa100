/**
 * MySQL连接测试
 * 验证MySQL测试环境是否正常工作
 */

import { describe, it, expect } from 'vitest';
import { getTestConnection, executeTestSQL } from './mysql-setup.js';

describe('MySQL连接测试', () => {
  it('应该能够连接到MySQL测试数据库', async () => {
    const connection = getTestConnection();
    expect(connection).toBeDefined();
    
    // 测试基本查询
    const result = await executeTestSQL('SELECT 1 as test');
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].test).toBe(1);
  });

  it('应该能够查询数据库信息', async () => {
    const result = await executeTestSQL('SELECT DATABASE() as db_name');
    expect(result[0].db_name).toBe('afa_office_test');
  });

  it('应该能够查询表结构', async () => {
    const result = await executeTestSQL('SHOW TABLES');
    expect(Array.isArray(result)).toBe(true);
    // 至少应该有一些表存在
    expect(result.length).toBeGreaterThan(0);
  });
});