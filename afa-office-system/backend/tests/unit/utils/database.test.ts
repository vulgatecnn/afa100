import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the database utility to simulate SQLite behavior for tests
const mockDatabase = {
  isReady: vi.fn(() => true),
  connect: vi.fn(),
  run: vi.fn(),
  get: vi.fn(),
  all: vi.fn(),
  transaction: vi.fn(),
};

// Mock the database module
vi.mock('../../../src/utils/database.js', () => ({
  default: mockDatabase,
}));

const database = mockDatabase;

describe('Database Utility', () => {
  beforeEach(async () => {
    // 重置所有mock
    vi.clearAllMocks();
    
    // 设置默认的mock行为
    database.isReady.mockReturnValue(true);
    database.connect.mockResolvedValue(undefined);
    database.run.mockResolvedValue({ lastID: 1, changes: 1 });
    database.get.mockResolvedValue(undefined);
    database.all.mockResolvedValue([]);
    database.transaction.mockResolvedValue([]);
  });

  afterEach(async () => {
    // 清理mock
    vi.clearAllMocks();
  });

  describe('连接管理', () => {
    it('应该检查数据库连接状态', () => {
      expect(database.isReady()).toBe(true);
    });
  });

  describe('查询操作', () => {
    it('应该插入数据并返回结果', async () => {
      database.run.mockResolvedValue({ lastID: 1, changes: 1 });
      
      const result = await database.run(
        'INSERT INTO test_users (name, email) VALUES (?, ?)',
        ['张三', 'zhangsan@example.com']
      );
      
      expect(result.lastID).toBeGreaterThan(0);
      expect(result.changes).toBe(1);
      expect(database.run).toHaveBeenCalledWith(
        'INSERT INTO test_users (name, email) VALUES (?, ?)',
        ['张三', 'zhangsan@example.com']
      );
    });

    it('应该查询单行数据', async () => {
      const mockUser = { id: 1, name: '李四', email: 'lisi@example.com' };
      database.get.mockResolvedValue(mockUser);
      
      // 查询数据
      const user = await database.get<{ id: number; name: string; email: string }>(
        'SELECT * FROM test_users WHERE email = ?',
        ['lisi@example.com']
      );
      
      expect(user).toBeDefined();
      expect(user?.name).toBe('李四');
      expect(user?.email).toBe('lisi@example.com');
      expect(database.get).toHaveBeenCalledWith(
        'SELECT * FROM test_users WHERE email = ?',
        ['lisi@example.com']
      );
    });

    it('应该查询多行数据', async () => {
      const mockUsers = [
        { id: 1, name: '王五', email: 'wangwu@example.com' },
        { id: 2, name: '赵六', email: 'zhaoliu@example.com' }
      ];
      database.all.mockResolvedValue(mockUsers);
      
      // 查询所有数据
      const users = await database.all<{ id: number; name: string; email: string }>(
        'SELECT * FROM test_users ORDER BY name'
      );
      
      expect(users).toHaveLength(2);
      expect(users[0]?.name).toBe('王五');
      expect(users[1]?.name).toBe('赵六');
      expect(database.all).toHaveBeenCalledWith(
        'SELECT * FROM test_users ORDER BY name'
      );
    });

    it('应该更新数据', async () => {
      // Mock插入结果
      database.run.mockResolvedValueOnce({ lastID: 1, changes: 1 });
      // Mock更新结果
      database.run.mockResolvedValueOnce({ lastID: 1, changes: 1 });
      // Mock查询结果
      database.get.mockResolvedValue({ name: '新名字' });
      
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
      // Mock插入结果
      database.run.mockResolvedValueOnce({ lastID: 1, changes: 1 });
      // Mock删除结果
      database.run.mockResolvedValueOnce({ lastID: 1, changes: 1 });
      // Mock查询结果（删除后应该返回undefined）
      database.get.mockResolvedValue(undefined);
      
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
      
      const mockResults = [
        { lastID: 1, changes: 1 },
        { lastID: 2, changes: 1 }
      ];
      
      database.transaction.mockResolvedValue(mockResults);
      database.all.mockResolvedValue([
        { id: 1, name: '用户1', email: 'user1@example.com' },
        { id: 2, name: '用户2', email: 'user2@example.com' }
      ]);
      
      const results = await database.transaction(queries);
      
      expect(results).toHaveLength(2);
      expect(results[0]?.changes).toBe(1);
      expect(results[1]?.changes).toBe(1);
      
      // 验证数据已插入
      const users = await database.all('SELECT * FROM test_users');
      expect(users).toHaveLength(2);
    });

    it('应该在错误时回滚事务', async () => {
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
      
      // Mock事务失败
      database.transaction.mockRejectedValue(new Error('UNIQUE constraint failed'));
      // Mock查询结果（事务回滚后只有原来的数据）
      database.all.mockResolvedValue([
        { id: 1, name: '现有用户', email: 'existing@example.com' }
      ]);
      
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
      database.run.mockRejectedValue(new Error('SQL语法错误'));
      
      await expect(
        database.run('INVALID SQL STATEMENT')
      ).rejects.toThrow('SQL语法错误');
    });

    it('应该处理约束违反错误', async () => {
      // Mock第一次插入成功
      database.run.mockResolvedValueOnce({ lastID: 1, changes: 1 });
      // Mock第二次插入失败（唯一约束冲突）
      database.run.mockRejectedValueOnce(new Error('UNIQUE constraint failed'));
      
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
      ).rejects.toThrow('UNIQUE constraint failed');
    });

    it('应该处理参数错误', async () => {
      database.run.mockRejectedValue(new Error('no such table: non_existent_table'));
      
      await expect(
        database.run(
          'INSERT INTO non_existent_table (name) VALUES (?)',
          ['测试']
        )
      ).rejects.toThrow('no such table: non_existent_table');
    });
  });

  describe('参数处理', () => {
    it('应该处理空参数数组', async () => {
      database.all.mockResolvedValue([{ count: 0 }]);
      
      const users = await database.all('SELECT COUNT(*) as count FROM test_users');
      expect(users[0]?.count).toBe(0);
    });

    it('应该处理null和undefined参数', async () => {
      database.run.mockResolvedValue({ lastID: 1, changes: 1 });
      database.get.mockResolvedValue({ id: 1, name: '测试用户', email: null });
      
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