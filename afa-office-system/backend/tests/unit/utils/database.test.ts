import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import database from '../../../src/utils/database.js';

describe('Database Utility', () => {
  beforeEach(async () => {
    // 确保数据库已连接
    if (!database.isReady()) {
      await database.connect();
    }
    
    // 创建测试表
    await database.run(`
      CREATE TABLE IF NOT EXISTS test_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  afterEach(async () => {
    // 清理测试表
    await database.run('DROP TABLE IF EXISTS test_users');
  });

  describe('连接管理', () => {
    it('应该检查数据库连接状态', () => {
      expect(database.isReady()).toBe(true);
    });
  });

  describe('查询操作', () => {
    it('应该插入数据并返回结果', async () => {
      const result = await database.run(
        'INSERT INTO test_users (name, email) VALUES (?, ?)',
        ['张三', 'zhangsan@example.com']
      );
      
      expect(result.lastID).toBeGreaterThan(0);
      expect(result.changes).toBe(1);
    });

    it('应该查询单行数据', async () => {
      // 先插入数据
      await database.run(
        'INSERT INTO test_users (name, email) VALUES (?, ?)',
        ['李四', 'lisi@example.com']
      );
      
      // 查询数据
      const user = await database.get<{ id: number; name: string; email: string }>(
        'SELECT * FROM test_users WHERE email = ?',
        ['lisi@example.com']
      );
      
      expect(user).toBeDefined();
      expect(user?.name).toBe('李四');
      expect(user?.email).toBe('lisi@example.com');
    });

    it('应该查询多行数据', async () => {
      // 插入多条数据
      await database.run(
        'INSERT INTO test_users (name, email) VALUES (?, ?)',
        ['王五', 'wangwu@example.com']
      );
      await database.run(
        'INSERT INTO test_users (name, email) VALUES (?, ?)',
        ['赵六', 'zhaoliu@example.com']
      );
      
      // 查询所有数据
      const users = await database.all<{ id: number; name: string; email: string }>(
        'SELECT * FROM test_users ORDER BY name'
      );
      
      expect(users).toHaveLength(2);
      expect(users[0]?.name).toBe('王五');
      expect(users[1]?.name).toBe('赵六');
    });

    it('应该更新数据', async () => {
      // 先插入数据
      const insertResult = await database.run(
        'INSERT INTO test_users (name, email) VALUES (?, ?)',
        ['原名', 'original@example.com']
      );
      
      // 更新数据
      const updateResult = await database.run(
        'UPDATE test_users SET name = ? WHERE id = ?',
        ['新名字', insertResult.lastID]
      );
      
      expect(updateResult.changes).toBe(1);
      
      // 验证更新
      const user = await database.get<{ name: string }>(
        'SELECT name FROM test_users WHERE id = ?',
        [insertResult.lastID]
      );
      
      expect(user?.name).toBe('新名字');
    });

    it('应该删除数据', async () => {
      // 先插入数据
      const insertResult = await database.run(
        'INSERT INTO test_users (name, email) VALUES (?, ?)',
        ['待删除', 'delete@example.com']
      );
      
      // 删除数据
      const deleteResult = await database.run(
        'DELETE FROM test_users WHERE id = ?',
        [insertResult.lastID]
      );
      
      expect(deleteResult.changes).toBe(1);
      
      // 验证删除
      const user = await database.get(
        'SELECT * FROM test_users WHERE id = ?',
        [insertResult.lastID]
      );
      
      expect(user).toBeUndefined();
    });
  });

  describe('事务操作', () => {
    it('应该成功执行事务', async () => {
      const queries = [
        {
          sql: 'INSERT INTO test_users (name, email) VALUES (?, ?)',
          params: ['用户1', 'user1@example.com']
        },
        {
          sql: 'INSERT INTO test_users (name, email) VALUES (?, ?)',
          params: ['用户2', 'user2@example.com']
        }
      ];
      
      const results = await database.transaction(queries);
      
      expect(results).toHaveLength(2);
      expect(results[0]?.changes).toBe(1);
      expect(results[1]?.changes).toBe(1);
      
      // 验证数据已插入
      const users = await database.all('SELECT * FROM test_users');
      expect(users).toHaveLength(2);
    });

    it('应该在错误时回滚事务', async () => {
      // 先插入一条数据以创建唯一约束冲突
      await database.run(
        'INSERT INTO test_users (name, email) VALUES (?, ?)',
        ['现有用户', 'existing@example.com']
      );
      
      const queries = [
        {
          sql: 'INSERT INTO test_users (name, email) VALUES (?, ?)',
          params: ['新用户1', 'new1@example.com']
        },
        {
          sql: 'INSERT INTO test_users (name, email) VALUES (?, ?)',
          params: ['新用户2', 'existing@example.com'] // 这会导致唯一约束冲突
        }
      ];
      
      // 事务应该失败
      await expect(database.transaction(queries)).rejects.toThrow();
      
      // 验证没有新数据被插入（事务已回滚）
      const users = await database.all('SELECT * FROM test_users');
      expect(users).toHaveLength(1); // 只有原来的数据
      expect(users[0]?.email).toBe('existing@example.com');
    });
  });

  describe('错误处理', () => {
    it('应该处理SQL语法错误', async () => {
      await expect(
        database.run('INVALID SQL STATEMENT')
      ).rejects.toThrow();
    });

    it('应该处理约束违反错误', async () => {
      // 插入第一条数据
      await database.run(
        'INSERT INTO test_users (name, email) VALUES (?, ?)',
        ['用户1', 'duplicate@example.com']
      );
      
      // 尝试插入重复邮箱（违反唯一约束）
      await expect(
        database.run(
          'INSERT INTO test_users (name, email) VALUES (?, ?)',
          ['用户2', 'duplicate@example.com']
        )
      ).rejects.toThrow();
    });

    it('应该处理参数错误', async () => {
      // SQLite会将缺少的参数设为null，所以这个测试需要调整
      // 我们测试一个真正会导致错误的情况：错误的表名
      await expect(
        database.run(
          'INSERT INTO non_existent_table (name) VALUES (?)',
          ['测试']
        )
      ).rejects.toThrow();
    });
  });

  describe('参数处理', () => {
    it('应该处理空参数数组', async () => {
      const users = await database.all('SELECT COUNT(*) as count FROM test_users');
      expect(users[0]?.count).toBe(0);
    });

    it('应该处理null和undefined参数', async () => {
      const result = await database.run(
        'INSERT INTO test_users (name, email) VALUES (?, ?)',
        ['测试用户', null]
      );
      
      expect(result.changes).toBe(1);
      
      const user = await database.get(
        'SELECT * FROM test_users WHERE id = ?',
        [result.lastID]
      );
      
      expect(user?.email).toBeNull();
    });
  });
});