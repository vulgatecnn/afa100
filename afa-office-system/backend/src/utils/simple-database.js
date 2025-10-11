/**
 * 简化的数据库工具类
 * 专门用于测试环境，避免复杂的连接池初始化问题
 */

import mysql from 'mysql2/promise';

class SimpleDatabase {
  constructor() {
    this.connection = null;
    this.isInitialized = false;
  }

  /**
   * 连接数据库
   */
  async connect() {
    if (this.isInitialized && this.connection) {
      return;
    }

    try {
      // 在测试环境中使用简单连接
      if (process.env.NODE_ENV === 'test') {
        this.connection = await mysql.createConnection({
          host: process.env.TEST_DB_HOST || '127.0.0.1',
          port: parseInt(process.env.TEST_DB_PORT || '3306'),
          user: process.env.TEST_DB_USER || 'afa_test_user',
          password: process.env.TEST_DB_PASSWORD || 'afa_test_2024',
          database: process.env.TEST_DB_NAME || 'afa_office_test',
          multipleStatements: true
        });
      } else {
        // 生产环境使用应用数据库配置
        this.connection = await mysql.createConnection({
          host: process.env.APP_DB_HOST || '127.0.0.1',
          port: parseInt(process.env.APP_DB_PORT || '3306'),
          user: process.env.APP_DB_USER || 'afa_app_user',
          password: process.env.APP_DB_PASSWORD || 'afa_app_2024',
          database: process.env.APP_DB_NAME || 'afa_office',
          multipleStatements: true
        });
      }

      await this.connection.ping();
      this.isInitialized = true;
      console.log('✅ 简化数据库连接成功');
    } catch (error) {
      console.error('❌ 简化数据库连接失败:', error);
      throw error;
    }
  }

  /**
   * 关闭数据库连接
   */
  async close() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      this.isInitialized = false;
      console.log('📴 简化数据库连接已关闭');
    }
  }

  /**
   * 检查连接是否就绪
   */
  isReady() {
    return this.isInitialized && this.connection !== null;
  }

  /**
   * 执行返回多行的查询
   */
  async all(sql, params = []) {
    if (!this.isReady()) {
      await this.connect();
    }

    try {
      const [rows] = await this.connection.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('MySQL查询执行失败:', {
        sql: sql.substring(0, 100),
        params,
        error: error.message
      });
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * 执行返回单行的查询
   */
  async get(sql, params = []) {
    if (!this.isReady()) {
      await this.connect();
    }

    try {
      const [rows] = await this.connection.execute(sql, params);
      return rows.length > 0 ? rows[0] : undefined;
    } catch (error) {
      console.error('MySQL查询执行失败:', {
        sql: sql.substring(0, 100),
        params,
        error: error.message
      });
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * 执行修改数据的查询 (INSERT, UPDATE, DELETE)
   */
  async run(sql, params = []) {
    if (!this.isReady()) {
      await this.connect();
    }

    try {
      const [result] = await this.connection.execute(sql, params);
      return {
        lastID: result.insertId || 0,
        changes: result.affectedRows || 0,
      };
    } catch (error) {
      console.error('MySQL执行失败:', {
        sql: sql.substring(0, 100),
        params,
        error: error.message
      });
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * 在事务中执行多个查询
   */
  async transaction(queries) {
    if (!this.isReady()) {
      await this.connect();
    }

    try {
      await this.connection.beginTransaction();
      
      const results = [];
      
      for (let i = 0; i < queries.length; i++) {
        const { sql, params = [] } = queries[i];
        
        try {
          const [result] = await this.connection.execute(sql, params);
          results[i] = {
            lastID: result.insertId || 0,
            changes: result.affectedRows || 0,
          };
        } catch (error) {
          await this.connection.rollback();
          throw this.handleDatabaseError(error);
        }
      }
      
      await this.connection.commit();
      return results;
    } catch (error) {
      try {
        await this.connection.rollback();
      } catch (rollbackError) {
        console.error('MySQL事务回滚失败:', rollbackError);
      }
      throw error;
    }
  }

  /**
   * 处理MySQL数据库错误
   */
  handleDatabaseError(err) {
    const errorCode = err.code || 'UNKNOWN';
    const errorMessage = err.message || '';
    
    // MySQL特定错误处理
    switch (errorCode) {
      case 'ER_DUP_ENTRY':
        return new Error('数据已存在，违反唯一性约束');
      case 'ER_NO_REFERENCED_ROW_2':
      case 'ER_ROW_IS_REFERENCED_2':
        return new Error('外键约束违反');
      case 'ER_BAD_NULL_ERROR':
        return new Error('必填字段不能为空');
      case 'ER_LOCK_WAIT_TIMEOUT':
        return new Error(`MySQL锁等待超时，请稍后重试 (${errorCode})`);
      case 'ECONNRESET':
        return new Error('MySQL连接被重置');
      case 'ECONNREFUSED':
        return new Error('MySQL连接被拒绝，请检查服务器状态');
      case 'ETIMEDOUT':
        return new Error('MySQL连接超时');
      default:
        return new Error(`${errorMessage} (${errorCode})`);
    }
  }

  /**
   * 获取数据库统计信息
   */
  async getDatabaseStats() {
    if (!this.isReady()) {
      await this.connect();
    }

    try {
      const stats = await Promise.all([
        this.get('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = DATABASE()'),
        this.get('SELECT SUM(data_length + index_length) as total_size FROM information_schema.tables WHERE table_schema = DATABASE()'),
      ]);

      return {
        tableCount: stats[0]?.table_count || 0,
        totalSize: stats[1]?.total_size || 0,
        estimatedSize: stats[1]?.total_size || 0,
      };
    } catch (error) {
      console.error('获取MySQL数据库统计信息失败:', error);
      return {
        tableCount: 0,
        totalSize: 0,
        estimatedSize: 0,
      };
    }
  }

  /**
   * 数据库健康检查
   */
  async healthCheck() {
    try {
      if (!this.isReady()) {
        return {
          status: 'unhealthy',
          details: {
            error: '数据库连接未初始化',
            timestamp: new Date().toISOString(),
          },
        };
      }

      // 执行简单查询测试
      const startTime = Date.now();
      await this.get('SELECT 1 as test');
      const queryTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        details: {
          queryTest: {
            success: true,
            responseTime: queryTime,
          },
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          queryTest: {
            success: false,
            error: error.message,
          },
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}

// 创建单例实例
let instance = null;

export function getSimpleDatabase() {
  if (!instance) {
    instance = new SimpleDatabase();
  }
  return instance;
}

export default SimpleDatabase;