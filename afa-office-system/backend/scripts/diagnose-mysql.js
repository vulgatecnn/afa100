#!/usr/bin/env node

/**
 * MySQL连接诊断工具
 * 
 * 用于诊断MySQL连接问题，验证配置和权限
 * 
 * 使用方法:
 *   node scripts/diagnose-mysql.js
 *   node scripts/diagnose-mysql.js --config=test  # 使用测试配置
 *   node scripts/diagnose-mysql.js --config=app   # 使用应用配置
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

class MySQLDiagnostic {
  constructor(configType = 'test') {
    this.configType = configType;
    this.config = this.getConfig(configType);
  }

  getConfig(type) {
    if (type === 'app') {
      return {
        host: process.env.APP_DB_HOST || '127.0.0.1',
        port: parseInt(process.env.APP_DB_PORT || '3306'),
        user: process.env.APP_DB_USER || 'afa_app_user',
        password: process.env.APP_DB_PASSWORD || '',
        database: process.env.APP_DB_NAME || 'afa_office'
      };
    } else {
      return {
        host: process.env.TEST_DB_HOST || '127.0.0.1',
        port: parseInt(process.env.TEST_DB_PORT || '3306'),
        user: process.env.TEST_DB_USER || 'afa_test_user',
        password: process.env.TEST_DB_PASSWORD || ''
      };
    }
  }

  async diagnose() {
    console.log('🔍 MySQL连接诊断工具\n');
    console.log(`📋 诊断配置类型: ${this.configType.toUpperCase()}\n`);
    
    this.showConfig();
    
    const tests = [
      { name: '基础连接测试', test: () => this.testConnection() },
      { name: '服务器信息获取', test: () => this.testServerInfo() },
      { name: '权限测试', test: () => this.testPermissions() },
      { name: '连接池测试', test: () => this.testConnectionPool() },
      { name: '性能测试', test: () => this.testPerformance() },
      { name: '字符集测试', test: () => this.testCharset() }
    ];

    let passedTests = 0;
    const results = [];

    for (const { name, test } of tests) {
      console.log(`\n${passedTests + 1}. ${name}...`);
      
      try {
        const result = await test();
        console.log(`   ✅ 通过: ${result || '正常'}`);
        results.push({ name, status: 'passed', message: result });
        passedTests++;
      } catch (error) {
        console.log(`   ❌ 失败: ${error.message}`);
        results.push({ name, status: 'failed', message: error.message });
        
        // 提供解决建议
        this.provideSolution(name, error);
      }
    }

    this.showSummary(passedTests, tests.length, results);
  }

  showConfig() {
    console.log('📝 配置信息:');
    console.log(`   主机: ${this.config.host}`);
    console.log(`   端口: ${this.config.port}`);
    console.log(`   用户: ${this.config.user}`);
    console.log(`   密码: ${'*'.repeat(this.config.password.length)}`);
    if (this.config.database) {
      console.log(`   数据库: ${this.config.database}`);
    }
  }

  async testConnection() {
    const connection = await mysql.createConnection({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      connectTimeout: 10000
    });
    
    await connection.ping();
    await connection.end();
    
    return '连接成功';
  }

  async testServerInfo() {
    const connection = await mysql.createConnection(this.config);
    
    const [versionRows] = await connection.execute('SELECT VERSION() as version');
    const [uptimeRows] = await connection.execute('SHOW STATUS LIKE "Uptime"');
    
    await connection.end();
    
    const version = versionRows[0].version;
    const uptime = Math.floor(uptimeRows[0].Value / 3600); // 转换为小时
    
    return `MySQL ${version}, 运行时间: ${uptime} 小时`;
  }

  async testPermissions() {
    const connection = await mysql.createConnection(this.config);
    
    const testDbName = `test_diagnostic_${Date.now()}`;
    const results = [];
    
    try {
      // 测试创建数据库权限
      await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${testDbName}\``);
      results.push('CREATE DATABASE');
      
      // 测试使用数据库权限
      await connection.execute(`USE \`${testDbName}\``);
      results.push('USE DATABASE');
      
      // 测试创建表权限
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS test_table (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100)
        )
      `);
      results.push('CREATE TABLE');
      
      // 测试插入权限
      await connection.execute('INSERT INTO test_table (name) VALUES (?)', ['test']);
      results.push('INSERT');
      
      // 测试查询权限
      await connection.execute('SELECT * FROM test_table');
      results.push('SELECT');
      
      // 测试更新权限
      await connection.execute('UPDATE test_table SET name = ? WHERE name = ?', ['updated', 'test']);
      results.push('UPDATE');
      
      // 测试删除权限
      await connection.execute('DELETE FROM test_table WHERE name = ?', ['updated']);
      results.push('DELETE');
      
      // 测试删除表权限
      await connection.execute('DROP TABLE test_table');
      results.push('DROP TABLE');
      
    } finally {
      // 清理测试数据库
      try {
        await connection.execute(`DROP DATABASE IF EXISTS \`${testDbName}\``);
        results.push('DROP DATABASE');
      } catch (error) {
        console.log(`   ⚠️  清理测试数据库失败: ${error.message}`);
      }
      
      await connection.end();
    }
    
    return `权限正常: ${results.join(', ')}`;
  }

  async testConnectionPool() {
    const pool = mysql.createPool({
      ...this.config,
      connectionLimit: 5,
      acquireTimeout: 10000,
      timeout: 10000
    });
    
    try {
      // 测试获取连接
      const connection = await pool.getConnection();
      await connection.execute('SELECT 1');
      connection.release();
      
      // 测试并发连接
      const promises = Array(3).fill(0).map(async () => {
        const conn = await pool.getConnection();
        await conn.execute('SELECT SLEEP(0.1)');
        conn.release();
      });
      
      await Promise.all(promises);
      
      return '连接池正常，支持并发连接';
    } finally {
      await pool.end();
    }
  }

  async testPerformance() {
    const connection = await mysql.createConnection(this.config);
    
    try {
      // 测试简单查询性能
      const start = Date.now();
      await connection.execute('SELECT 1');
      const simpleQueryTime = Date.now() - start;
      
      // 测试复杂查询性能
      const complexStart = Date.now();
      await connection.execute(`
        SELECT 
          COUNT(*) as table_count,
          SUM(CASE WHEN TABLE_TYPE = 'BASE TABLE' THEN 1 ELSE 0 END) as base_tables
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = 'information_schema'
      `);
      const complexQueryTime = Date.now() - complexStart;
      
      if (simpleQueryTime > 1000) {
        throw new Error(`简单查询响应时间过长: ${simpleQueryTime}ms`);
      }
      
      return `简单查询: ${simpleQueryTime}ms, 复杂查询: ${complexQueryTime}ms`;
    } finally {
      await connection.end();
    }
  }

  async testCharset() {
    const connection = await mysql.createConnection(this.config);
    
    try {
      const [charsetRows] = await connection.execute(`
        SHOW VARIABLES WHERE Variable_name IN (
          'character_set_server',
          'collation_server',
          'character_set_database',
          'collation_database'
        )
      `);
      
      const charset = {};
      charsetRows.forEach(row => {
        charset[row.Variable_name] = row.Value;
      });
      
      // 测试中文字符
      const testDbName = `test_charset_${Date.now()}`;
      await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${testDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await connection.execute(`USE \`${testDbName}\``);
      
      await connection.execute(`
        CREATE TABLE test_charset (
          id INT AUTO_INCREMENT PRIMARY KEY,
          chinese_text VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        )
      `);
      
      const testText = '测试中文字符 🎉';
      await connection.execute('INSERT INTO test_charset (chinese_text) VALUES (?)', [testText]);
      
      const [rows] = await connection.execute('SELECT chinese_text FROM test_charset');
      
      if (rows[0].chinese_text !== testText) {
        throw new Error('中文字符编码测试失败');
      }
      
      // 清理
      await connection.execute(`DROP DATABASE IF EXISTS \`${testDbName}\``);
      
      return `字符集正常: ${charset.character_set_server}/${charset.collation_server}`;
    } finally {
      await connection.end();
    }
  }

  provideSolution(testName, error) {
    console.log('   💡 解决建议:');
    
    switch (testName) {
      case '基础连接测试':
        if (error.code === 'ECONNREFUSED') {
          console.log('      - 检查MySQL服务是否启动');
          console.log('      - 验证主机地址和端口号');
          console.log('      - 检查防火墙设置');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
          console.log('      - 检查用户名和密码');
          console.log('      - 验证用户是否存在');
          console.log('      - 检查用户主机访问权限');
        }
        break;
        
      case '权限测试':
        console.log('      - 检查用户权限设置');
        console.log('      - 运行: SHOW GRANTS FOR \'用户名\'@\'主机\';');
        console.log('      - 授予必要权限: GRANT CREATE, DROP, SELECT, INSERT, UPDATE, DELETE ON test_*.* TO \'用户名\'@\'主机\';');
        break;
        
      case '性能测试':
        console.log('      - 检查MySQL服务器负载');
        console.log('      - 优化MySQL配置');
        console.log('      - 检查网络延迟');
        break;
        
      case '字符集测试':
        console.log('      - 确保MySQL配置使用utf8mb4字符集');
        console.log('      - 检查数据库和表的字符集设置');
        break;
        
      default:
        console.log('      - 查看MySQL错误日志');
        console.log('      - 检查相关配置');
    }
  }

  showSummary(passed, total, results) {
    console.log('\n' + '='.repeat(50));
    console.log('📊 诊断结果汇总');
    console.log('='.repeat(50));
    
    console.log(`\n✅ 通过测试: ${passed}/${total}`);
    console.log(`❌ 失败测试: ${total - passed}/${total}`);
    
    if (passed === total) {
      console.log('\n🎉 所有测试通过！MySQL配置正常。');
    } else {
      console.log('\n⚠️  存在问题，请根据上述建议进行修复。');
      
      console.log('\n失败的测试:');
      results.filter(r => r.status === 'failed').forEach(r => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
    }
    
    console.log('\n📋 详细配置检查:');
    this.showDetailedConfig();
  }

  async showDetailedConfig() {
    try {
      const connection = await mysql.createConnection(this.config);
      
      const [variables] = await connection.execute(`
        SHOW VARIABLES WHERE Variable_name IN (
          'version', 'max_connections', 'innodb_buffer_pool_size',
          'query_cache_size', 'character_set_server', 'collation_server'
        )
      `);
      
      variables.forEach(row => {
        console.log(`   ${row.Variable_name}: ${row.Value}`);
      });
      
      await connection.end();
    } catch (error) {
      console.log('   无法获取详细配置信息');
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
MySQL连接诊断工具

使用方法:
  node scripts/diagnose-mysql.js                # 使用测试数据库配置
  node scripts/diagnose-mysql.js --config=test  # 使用测试数据库配置
  node scripts/diagnose-mysql.js --config=app   # 使用应用数据库配置

环境变量 (测试配置):
  TEST_DB_HOST      MySQL主机地址
  TEST_DB_PORT      MySQL端口
  TEST_DB_USER      MySQL用户名
  TEST_DB_PASSWORD  MySQL密码

环境变量 (应用配置):
  APP_DB_HOST       MySQL主机地址
  APP_DB_PORT       MySQL端口
  APP_DB_USER       MySQL用户名
  APP_DB_PASSWORD   MySQL密码
  APP_DB_NAME       MySQL数据库名
    `);
    return;
  }
  
  const configArg = args.find(arg => arg.startsWith('--config='));
  const configType = configArg ? configArg.split('=')[1] : 'test';
  
  if (!['test', 'app'].includes(configType)) {
    console.error('❌ 无效的配置类型，支持: test, app');
    process.exit(1);
  }
  
  const diagnostic = new MySQLDiagnostic(configType);
  
  try {
    await diagnostic.diagnose();
  } catch (error) {
    console.error(`❌ 诊断工具执行失败: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = MySQLDiagnostic;