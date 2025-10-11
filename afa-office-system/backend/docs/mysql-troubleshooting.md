# MySQL测试框架故障排除指南

## 概述

本指南提供MySQL测试框架常见问题的诊断和解决方案，帮助开发者快速解决测试环境中的问题。

## 目录

- [连接问题](#连接问题)
- [权限问题](#权限问题)
- [性能问题](#性能问题)
- [测试环境问题](#测试环境问题)
- [配置问题](#配置问题)
- [诊断工具](#诊断工具)
- [清理工具](#清理工具)
- [最佳实践](#最佳实践)

## 连接问题

### 1. MySQL服务器连接失败

**错误信息**:
```
MySQL服务器连接失败: 127.0.0.1:3306。请确保MySQL服务正在运行。
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**可能原因**:
- MySQL服务未启动
- 端口被占用或防火墙阻止
- 配置文件中的主机地址错误

**解决方案**:

```bash
# Windows
# 检查MySQL服务状态
net start | findstr MySQL
# 启动MySQL服务
net start mysql80

# macOS
# 检查MySQL服务状态
brew services list | grep mysql
# 启动MySQL服务
brew services start mysql

# Linux
# 检查MySQL服务状态
sudo systemctl status mysql
# 启动MySQL服务
sudo systemctl start mysql
```

**验证连接**:
```bash
# 测试连接
mysql -h 127.0.0.1 -P 3306 -u root -p

# 检查端口占用
netstat -an | grep 3306
# 或使用
lsof -i :3306
```

### 2. 连接超时

**错误信息**:
```
Error: Connection timeout
Error: acquire timeout
```

**解决方案**:

1. **增加超时时间**:
```bash
# 在 .env 文件中调整
TEST_DB_ACQUIRE_TIMEOUT=120000
TEST_DB_TIMEOUT=120000
```

2. **检查网络连接**:
```bash
# 测试网络延迟
ping 127.0.0.1

# 测试端口连通性
telnet 127.0.0.1 3306
```

3. **优化MySQL配置**:
```sql
-- 增加连接超时时间
SET GLOBAL connect_timeout = 60;
SET GLOBAL wait_timeout = 600;
SET GLOBAL interactive_timeout = 600;
```

### 3. 连接数过多

**错误信息**:
```
Error: Too many connections
ER_CON_COUNT_ERROR: Too many connections
```

**解决方案**:

1. **检查当前连接数**:
```sql
SHOW STATUS LIKE 'Threads_connected';
SHOW VARIABLES LIKE 'max_connections';
```

2. **增加最大连接数**:
```sql
SET GLOBAL max_connections = 500;
```

3. **优化连接池配置**:
```bash
# 在 .env 文件中调整
TEST_DB_CONNECTION_LIMIT=5
```

4. **清理僵死连接**:
```sql
-- 查看进程列表
SHOW PROCESSLIST;

-- 杀死长时间运行的连接
KILL CONNECTION_ID;
```

## 权限问题

### 1. 认证失败

**错误信息**:
```
MySQL认证失败: 用户名或密码错误 (afa_test_user)
ER_ACCESS_DENIED_ERROR: Access denied for user 'afa_test_user'@'localhost'
```

**解决方案**:

1. **验证用户存在**:
```sql
SELECT User, Host FROM mysql.user WHERE User = 'afa_test_user';
```

2. **重置用户密码**:
```sql
ALTER USER 'afa_test_user'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
```

3. **检查主机访问权限**:
```sql
-- 如果从不同主机连接，可能需要创建对应的用户
CREATE USER 'afa_test_user'@'%' IDENTIFIED BY 'password';
GRANT CREATE, DROP, SELECT, INSERT, UPDATE, DELETE, ALTER, INDEX ON test_*.* TO 'afa_test_user'@'%';
```

### 2. 数据库权限不足

**错误信息**:
```
Access denied for user 'afa_test_user'@'localhost' to database 'test_xxx'
ER_DBACCESS_DENIED_ERROR: Access denied for user to database
```

**解决方案**:

1. **检查用户权限**:
```sql
SHOW GRANTS FOR 'afa_test_user'@'localhost';
```

2. **授予必要权限**:
```sql
-- 授予测试数据库权限
GRANT CREATE, DROP, SELECT, INSERT, UPDATE, DELETE, ALTER, INDEX, CREATE TEMPORARY TABLES ON test_*.* TO 'afa_test_user'@'localhost';

-- 如果需要创建函数或存储过程
GRANT CREATE ROUTINE, ALTER ROUTINE ON test_*.* TO 'afa_test_user'@'localhost';

FLUSH PRIVILEGES;
```

3. **验证权限生效**:
```sql
-- 测试创建数据库
CREATE DATABASE test_permission_check;
DROP DATABASE test_permission_check;
```

### 3. 表操作权限不足

**错误信息**:
```
Table 'test_xxx.users' doesn't exist
ER_NO_SUCH_TABLE: Table 'test_xxx.users' doesn't exist
```

**解决方案**:

1. **检查数据库是否正确初始化**:
```sql
USE test_xxx;
SHOW TABLES;
```

2. **手动初始化表结构**:
```bash
# 运行数据库初始化
pnpm run db:init

# 或者在测试中确保调用了 initializeSchema
```

3. **检查表创建权限**:
```sql
GRANT CREATE, ALTER, DROP ON test_*.* TO 'afa_test_user'@'localhost';
```

## 性能问题

### 1. 查询执行缓慢

**症状**:
- 测试运行时间过长
- 数据库操作超时
- CPU使用率过高

**诊断方法**:

1. **启用慢查询日志**:
```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
SHOW VARIABLES LIKE 'slow_query_log%';
```

2. **分析查询性能**:
```sql
-- 查看正在运行的查询
SHOW PROCESSLIST;

-- 分析具体查询
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';
```

3. **检查索引使用情况**:
```sql
-- 查看表索引
SHOW INDEX FROM users;

-- 查看索引统计
SHOW STATUS LIKE 'Handler_read%';
```

**解决方案**:

1. **添加必要索引**:
```sql
-- 为常用查询字段添加索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_merchant_id ON users(merchant_id);
CREATE INDEX idx_users_status ON users(status);
```

2. **优化MySQL配置**:
```ini
[mysqld]
# 增加缓冲区大小
innodb_buffer_pool_size = 512M
query_cache_size = 128M

# 优化临时表
tmp_table_size = 128M
max_heap_table_size = 128M

# 优化排序缓冲区
sort_buffer_size = 4M
read_buffer_size = 2M
```

3. **优化测试代码**:
```typescript
// 使用事务批量操作
await adapter.beginTransaction();
try {
  for (const user of users) {
    await adapter.run('INSERT INTO users (name, email) VALUES (?, ?)', [user.name, user.email]);
  }
  await adapter.commit();
} catch (error) {
  await adapter.rollback();
  throw error;
}
```

### 2. 内存使用过高

**症状**:
- 系统内存不足
- MySQL进程被杀死
- 测试环境创建失败

**诊断方法**:
```sql
-- 查看内存使用情况
SHOW STATUS LIKE 'Innodb_buffer_pool%';
SHOW VARIABLES LIKE '%buffer%';
```

**解决方案**:

1. **调整内存配置**:
```ini
[mysqld]
# 根据可用内存调整
innodb_buffer_pool_size = 256M  # 减少缓冲池大小
query_cache_size = 32M          # 减少查询缓存
table_open_cache = 400          # 减少表缓存
```

2. **限制连接数**:
```bash
# 在 .env 文件中
TEST_DB_CONNECTION_LIMIT=3
```

3. **及时清理测试环境**:
```typescript
// 确保测试后清理
afterEach(async () => {
  await testEnv.cleanup();
});
```

## 测试环境问题

### 1. 测试数据库创建失败

**错误信息**:
```
Failed to create test database: test_xxx
Database creation timeout
```

**解决方案**:

1. **检查数据库名称冲突**:
```sql
SHOW DATABASES LIKE 'test_%';
```

2. **手动清理残留数据库**:
```sql
-- 查找并删除测试数据库
SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE 'test_%';

-- 删除特定数据库
DROP DATABASE IF EXISTS test_old_database;
```

3. **使用清理工具**:
```bash
# 运行清理脚本
node scripts/cleanup-test-databases.js
```

### 2. 测试环境隔离失败

**症状**:
- 测试之间相互影响
- 数据污染
- 并发测试失败

**解决方案**:

1. **验证环境隔离**:
```typescript
// 在测试中验证数据库隔离
it('should have isolated environments', async () => {
  const env1 = await manager.createIsolatedEnvironment();
  const env2 = await manager.createIsolatedEnvironment();
  
  expect(env1.databaseName).not.toBe(env2.databaseName);
  
  // 验证数据隔离
  await env1.adapter.run('INSERT INTO users (name) VALUES (?)', ['User1']);
  await env2.adapter.run('INSERT INTO users (name) VALUES (?)', ['User2']);
  
  const users1 = await env1.adapter.all('SELECT * FROM users');
  const users2 = await env2.adapter.all('SELECT * FROM users');
  
  expect(users1).toHaveLength(1);
  expect(users2).toHaveLength(1);
  expect(users1[0].name).toBe('User1');
  expect(users2[0].name).toBe('User2');
});
```

2. **确保正确的清理顺序**:
```typescript
describe('Test Suite', () => {
  let manager;
  let testEnv;

  beforeEach(async () => {
    manager = createMySQLTestEnvironmentManager();
    testEnv = await manager.createIsolatedEnvironment();
  });

  afterEach(async () => {
    // 重要：先清理环境，再关闭管理器
    if (testEnv) {
      await testEnv.cleanup();
    }
    if (manager) {
      await manager.shutdown();
    }
  });
});
```

### 3. 测试环境清理不完整

**症状**:
- 残留测试数据库
- 内存泄漏
- 连接池未释放

**解决方案**:

1. **实现强制清理**:
```typescript
// 在测试套件结束后强制清理
afterAll(async () => {
  // 清理所有残留的测试数据库
  const adapter = new MySQLAdapter();
  await adapter.connect(config);
  
  const databases = await adapter.all(`
    SELECT SCHEMA_NAME 
    FROM information_schema.SCHEMATA 
    WHERE SCHEMA_NAME LIKE 'test_%'
  `);
  
  for (const db of databases) {
    await adapter.run(`DROP DATABASE IF EXISTS \`${db.SCHEMA_NAME}\``);
  }
  
  await adapter.disconnect();
});
```

2. **监控资源使用**:
```typescript
// 添加资源监控
const stats = await manager.getEnvironmentStats();
console.log('活跃环境数量:', stats.activeEnvironments);
console.log('总数据库数量:', stats.totalDatabases);

if (stats.activeEnvironments > 10) {
  console.warn('警告：活跃环境数量过多，可能存在内存泄漏');
}
```

## 配置问题

### 1. 环境变量配置错误

**常见错误**:
- 环境变量未设置
- 配置值格式错误
- 配置文件路径错误

**解决方案**:

1. **验证环境变量**:
```typescript
// 添加配置验证
function validateConfig() {
  const requiredVars = [
    'TEST_DB_HOST',
    'TEST_DB_PORT',
    'TEST_DB_USER',
    'TEST_DB_PASSWORD'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`缺少必要的环境变量: ${missing.join(', ')}`);
  }
  
  // 验证端口号格式
  const port = parseInt(process.env.TEST_DB_PORT);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`无效的端口号: ${process.env.TEST_DB_PORT}`);
  }
}
```

2. **提供配置模板**:
```bash
# 创建配置检查脚本
cat > scripts/check-config.js << 'EOF'
const requiredEnvVars = {
  'TEST_DB_TYPE': 'mysql',
  'TEST_DB_HOST': '127.0.0.1',
  'TEST_DB_PORT': '3306',
  'TEST_DB_USER': 'afa_test_user',
  'TEST_DB_PASSWORD': '(required)'
};

console.log('检查MySQL测试配置...\n');

let hasErrors = false;

for (const [key, defaultValue] of Object.entries(requiredEnvVars)) {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ ${key}: 未设置 (建议值: ${defaultValue})`);
    hasErrors = true;
  } else {
    console.log(`✅ ${key}: ${value}`);
  }
}

if (hasErrors) {
  console.error('\n请在 .env 文件中设置缺少的环境变量');
  process.exit(1);
} else {
  console.log('\n✅ 配置检查通过');
}
EOF

node scripts/check-config.js
```

### 2. 数据库配置冲突

**症状**:
- 连接到错误的数据库
- 配置不生效
- 测试和应用数据库混淆

**解决方案**:

1. **分离配置**:
```typescript
// 明确区分不同环境的配置
export class DatabaseConfigManager {
  static getAppConfig(): MySQLConfig {
    return {
      type: 'mysql',
      host: process.env.APP_DB_HOST || '127.0.0.1',
      port: parseInt(process.env.APP_DB_PORT || '3306'),
      user: process.env.APP_DB_USER || 'afa_app_user',
      password: process.env.APP_DB_PASSWORD || '',
      database: process.env.APP_DB_NAME || 'afa_office'
    };
  }
  
  static getTestConfig(): MySQLConfig {
    return {
      type: 'mysql',
      host: process.env.TEST_DB_HOST || '127.0.0.1',
      port: parseInt(process.env.TEST_DB_PORT || '3306'),
      user: process.env.TEST_DB_USER || 'afa_test_user',
      password: process.env.TEST_DB_PASSWORD || '',
      // 测试环境不指定固定数据库名，由测试框架动态创建
    };
  }
}
```

2. **配置验证**:
```typescript
// 添加配置冲突检查
function validateConfigSeparation() {
  const appUser = process.env.APP_DB_USER;
  const testUser = process.env.TEST_DB_USER;
  
  if (appUser === testUser) {
    console.warn('警告：应用数据库和测试数据库使用相同用户，建议分离');
  }
  
  const appDb = process.env.APP_DB_NAME;
  if (appDb && appDb.startsWith('test_')) {
    throw new Error('应用数据库名不应以 test_ 开头');
  }
}
```

## 诊断工具

### 1. 连接诊断工具

创建 `scripts/diagnose-mysql.js`：

```javascript
const mysql = require('mysql2/promise');

async function diagnoseMySQLConnection() {
  console.log('🔍 MySQL连接诊断工具\n');
  
  const config = {
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.TEST_DB_PORT || '3306'),
    user: process.env.TEST_DB_USER || 'root',
    password: process.env.TEST_DB_PASSWORD || ''
  };
  
  console.log('配置信息:');
  console.log(`  主机: ${config.host}`);
  console.log(`  端口: ${config.port}`);
  console.log(`  用户: ${config.user}`);
  console.log(`  密码: ${'*'.repeat(config.password.length)}\n`);
  
  try {
    // 测试基础连接
    console.log('1. 测试基础连接...');
    const connection = await mysql.createConnection(config);
    console.log('   ✅ 连接成功');
    
    // 测试服务器信息
    console.log('2. 获取服务器信息...');
    const [rows] = await connection.execute('SELECT VERSION() as version');
    console.log(`   ✅ MySQL版本: ${rows[0].version}`);
    
    // 测试权限
    console.log('3. 测试权限...');
    try {
      await connection.execute('CREATE DATABASE IF NOT EXISTS test_diagnostic');
      console.log('   ✅ 创建数据库权限正常');
      
      await connection.execute('DROP DATABASE IF EXISTS test_diagnostic');
      console.log('   ✅ 删除数据库权限正常');
    } catch (error) {
      console.log(`   ❌ 权限测试失败: ${error.message}`);
    }
    
    // 测试连接池
    console.log('4. 测试连接池...');
    const pool = mysql.createPool({
      ...config,
      connectionLimit: 5,
      acquireTimeout: 10000
    });
    
    const poolConnection = await pool.getConnection();
    console.log('   ✅ 连接池正常');
    poolConnection.release();
    await pool.end();
    
    await connection.end();
    console.log('\n🎉 诊断完成，所有测试通过！');
    
  } catch (error) {
    console.error(`\n❌ 诊断失败: ${error.message}`);
    console.error('\n可能的解决方案:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('- 检查MySQL服务是否启动');
      console.error('- 验证主机地址和端口号');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('- 检查用户名和密码');
      console.error('- 验证用户权限设置');
    } else {
      console.error('- 查看详细错误信息');
      console.error('- 检查MySQL错误日志');
    }
    
    process.exit(1);
  }
}

diagnoseMySQLConnection();
```

### 2. 性能诊断工具

创建 `scripts/mysql-performance-check.js`：

```javascript
const mysql = require('mysql2/promise');

async function checkMySQLPerformance() {
  console.log('📊 MySQL性能诊断工具\n');
  
  const config = {
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.TEST_DB_PORT || '3306'),
    user: process.env.TEST_DB_USER || 'root',
    password: process.env.TEST_DB_PASSWORD || ''
  };
  
  try {
    const connection = await mysql.createConnection(config);
    
    // 检查服务器状态
    console.log('1. 服务器状态:');
    const [status] = await connection.execute(`
      SHOW STATUS WHERE Variable_name IN (
        'Threads_connected', 'Threads_running', 'Uptime',
        'Questions', 'Slow_queries', 'Aborted_connects'
      )
    `);
    
    status.forEach(row => {
      console.log(`   ${row.Variable_name}: ${row.Value}`);
    });
    
    // 检查配置变量
    console.log('\n2. 关键配置:');
    const [variables] = await connection.execute(`
      SHOW VARIABLES WHERE Variable_name IN (
        'max_connections', 'innodb_buffer_pool_size',
        'query_cache_size', 'tmp_table_size'
      )
    `);
    
    variables.forEach(row => {
      console.log(`   ${row.Variable_name}: ${row.Value}`);
    });
    
    // 检查InnoDB状态
    console.log('\n3. InnoDB状态:');
    const [innodb] = await connection.execute(`
      SHOW STATUS WHERE Variable_name LIKE 'Innodb_%' 
      AND Variable_name IN (
        'Innodb_buffer_pool_pages_total',
        'Innodb_buffer_pool_pages_free',
        'Innodb_buffer_pool_read_requests',
        'Innodb_buffer_pool_reads'
      )
    `);
    
    innodb.forEach(row => {
      console.log(`   ${row.Variable_name}: ${row.Value}`);
    });
    
    await connection.end();
    console.log('\n✅ 性能检查完成');
    
  } catch (error) {
    console.error(`❌ 性能检查失败: ${error.message}`);
    process.exit(1);
  }
}

checkMySQLPerformance();
```

## 清理工具

### 1. 测试数据库清理工具

创建 `scripts/cleanup-test-databases.js`：

```javascript
const mysql = require('mysql2/promise');

async function cleanupTestDatabases() {
  console.log('🧹 清理测试数据库工具\n');
  
  const config = {
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.TEST_DB_PORT || '3306'),
    user: process.env.TEST_DB_USER || 'root',
    password: process.env.TEST_DB_PASSWORD || ''
  };
  
  try {
    const connection = await mysql.createConnection(config);
    
    // 查找所有测试数据库
    console.log('1. 查找测试数据库...');
    const [databases] = await connection.execute(`
      SELECT SCHEMA_NAME 
      FROM information_schema.SCHEMATA 
      WHERE SCHEMA_NAME LIKE 'test_%'
      ORDER BY SCHEMA_NAME
    `);
    
    if (databases.length === 0) {
      console.log('   ✅ 没有找到测试数据库');
      await connection.end();
      return;
    }
    
    console.log(`   找到 ${databases.length} 个测试数据库:`);
    databases.forEach(db => {
      console.log(`   - ${db.SCHEMA_NAME}`);
    });
    
    // 询问是否删除
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('\n是否删除这些数据库？(y/N): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('取消清理操作');
      await connection.end();
      return;
    }
    
    // 删除数据库
    console.log('\n2. 删除测试数据库...');
    let deletedCount = 0;
    
    for (const db of databases) {
      try {
        await connection.execute(`DROP DATABASE \`${db.SCHEMA_NAME}\``);
        console.log(`   ✅ 已删除: ${db.SCHEMA_NAME}`);
        deletedCount++;
      } catch (error) {
        console.log(`   ❌ 删除失败: ${db.SCHEMA_NAME} - ${error.message}`);
      }
    }
    
    await connection.end();
    console.log(`\n🎉 清理完成，共删除 ${deletedCount} 个数据库`);
    
  } catch (error) {
    console.error(`❌ 清理失败: ${error.message}`);
    process.exit(1);
  }
}

cleanupTestDatabases();
```

### 2. 自动清理脚本

创建 `scripts/auto-cleanup.js`：

```javascript
const mysql = require('mysql2/promise');

async function autoCleanup() {
  console.log('🔄 自动清理工具\n');
  
  const config = {
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.TEST_DB_PORT || '3306'),
    user: process.env.TEST_DB_USER || 'root',
    password: process.env.TEST_DB_PASSWORD || ''
  };
  
  try {
    const connection = await mysql.createConnection(config);
    
    // 清理超过1小时的测试数据库
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    console.log('1. 查找过期的测试数据库...');
    const [databases] = await connection.execute(`
      SELECT 
        SCHEMA_NAME,
        SUBSTRING(SCHEMA_NAME, 6) as timestamp_part
      FROM information_schema.SCHEMATA 
      WHERE SCHEMA_NAME LIKE 'test_%'
      AND SCHEMA_NAME REGEXP '^test_[0-9]{13}_'
    `);
    
    const expiredDatabases = databases.filter(db => {
      const timestamp = parseInt(db.timestamp_part);
      if (isNaN(timestamp)) return false;
      
      const dbCreatedAt = new Date(timestamp);
      return dbCreatedAt < oneHourAgo;
    });
    
    if (expiredDatabases.length === 0) {
      console.log('   ✅ 没有找到过期的测试数据库');
    } else {
      console.log(`   找到 ${expiredDatabases.length} 个过期数据库`);
      
      for (const db of expiredDatabases) {
        try {
          await connection.execute(`DROP DATABASE \`${db.SCHEMA_NAME}\``);
          console.log(`   ✅ 已清理: ${db.SCHEMA_NAME}`);
        } catch (error) {
          console.log(`   ❌ 清理失败: ${db.SCHEMA_NAME} - ${error.message}`);
        }
      }
    }
    
    // 清理长时间运行的连接
    console.log('\n2. 检查长时间运行的连接...');
    const [processes] = await connection.execute(`
      SELECT ID, USER, HOST, DB, COMMAND, TIME, STATE
      FROM information_schema.PROCESSLIST
      WHERE TIME > 300 AND COMMAND != 'Sleep'
      AND USER = ?
    `, [config.user]);
    
    if (processes.length === 0) {
      console.log('   ✅ 没有找到长时间运行的连接');
    } else {
      console.log(`   找到 ${processes.length} 个长时间运行的连接`);
      processes.forEach(proc => {
        console.log(`   - ID: ${proc.ID}, 时间: ${proc.TIME}s, 状态: ${proc.STATE}`);
      });
    }
    
    await connection.end();
    console.log('\n✅ 自动清理完成');
    
  } catch (error) {
    console.error(`❌ 自动清理失败: ${error.message}`);
    process.exit(1);
  }
}

autoCleanup();
```

## 最佳实践

### 1. 预防性措施

```typescript
// 1. 始终使用try-catch处理数据库操作
async function safeDbOperation() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    // 数据库操作
  } catch (error) {
    console.error('数据库操作失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 2. 实现重试机制
async function retryDbOperation(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      console.warn(`操作失败，${1000 * (i + 1)}ms后重试...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// 3. 监控资源使用
class ResourceMonitor {
  private activeConnections = 0;
  private activeDatabases = new Set<string>();
  
  trackConnection() {
    this.activeConnections++;
    if (this.activeConnections > 10) {
      console.warn('警告：活跃连接数过多');
    }
  }
  
  releaseConnection() {
    this.activeConnections--;
  }
  
  trackDatabase(name: string) {
    this.activeDatabases.add(name);
    if (this.activeDatabases.size > 20) {
      console.warn('警告：活跃数据库数量过多');
    }
  }
  
  releaseDatabase(name: string) {
    this.activeDatabases.delete(name);
  }
}
```

### 2. 监控和告警

```typescript
// 实现健康检查
export class MySQLHealthChecker {
  async checkHealth(): Promise<HealthStatus> {
    const checks = [
      this.checkConnection(),
      this.checkPermissions(),
      this.checkPerformance(),
      this.checkDiskSpace()
    ];
    
    const results = await Promise.allSettled(checks);
    
    return {
      healthy: results.every(r => r.status === 'fulfilled'),
      checks: results.map((r, i) => ({
        name: ['connection', 'permissions', 'performance', 'disk'][i],
        status: r.status,
        message: r.status === 'rejected' ? r.reason.message : 'OK'
      }))
    };
  }
  
  private async checkConnection(): Promise<void> {
    const connection = await mysql.createConnection(config);
    await connection.ping();
    await connection.end();
  }
  
  private async checkPermissions(): Promise<void> {
    const connection = await mysql.createConnection(config);
    await connection.execute('CREATE DATABASE IF NOT EXISTS test_health_check');
    await connection.execute('DROP DATABASE IF EXISTS test_health_check');
    await connection.end();
  }
  
  private async checkPerformance(): Promise<void> {
    const connection = await mysql.createConnection(config);
    const start = Date.now();
    await connection.execute('SELECT 1');
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      throw new Error(`查询响应时间过长: ${duration}ms`);
    }
    
    await connection.end();
  }
  
  private async checkDiskSpace(): Promise<void> {
    // 检查磁盘空间逻辑
    // 这里可以添加具体的磁盘空间检查
  }
}
```

### 3. 日志和调试

```typescript
// 配置详细日志
export class MySQLLogger {
  static logQuery(sql: string, params: any[], duration: number) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 SQL: ${sql}`);
      if (params.length > 0) {
        console.log(`📝 参数: ${JSON.stringify(params)}`);
      }
      console.log(`⏱️  耗时: ${duration}ms`);
    }
  }
  
  static logError(error: Error, context: string) {
    console.error(`❌ MySQL错误 [${context}]:`, error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
  }
  
  static logConnection(action: 'connect' | 'disconnect', config: any) {
    console.log(`🔌 ${action === 'connect' ? '连接' : '断开'} MySQL: ${config.host}:${config.port}`);
  }
}
```

## 总结

本故障排除指南涵盖了MySQL测试框架的常见问题和解决方案。遇到问题时，建议按以下步骤进行：

1. **确认问题类型**：连接、权限、性能或配置问题
2. **使用诊断工具**：运行相应的诊断脚本
3. **查看日志**：检查MySQL错误日志和应用日志
4. **应用解决方案**：根据错误类型应用相应的解决方案
5. **验证修复**：运行测试确认问题已解决
6. **预防措施**：实施最佳实践避免问题再次发生

如果问题仍然存在，请联系开发团队并提供详细的错误信息和环境配置。