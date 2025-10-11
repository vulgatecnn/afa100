# MySQL测试框架快速开始指南

## 概述

本指南帮助您快速配置和使用MySQL测试框架，解决SQLite在Windows环境下的文件锁定问题。

## 前置要求

- Node.js 18+
- MySQL 5.7+ 或 8.0+
- pnpm 包管理器

## 快速配置

### 1. 环境变量配置

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件，更新MySQL测试配置：

```bash
# MySQL测试数据库配置
TEST_DB_TYPE=mysql
TEST_DB_HOST=127.0.0.1
TEST_DB_PORT=3306
TEST_DB_USER=afa_test_user
TEST_DB_PASSWORD=your-secure-password
TEST_DB_CONNECTION_LIMIT=5
TEST_DB_ACQUIRE_TIMEOUT=30000
TEST_DB_TIMEOUT=30000

# MySQL管理员配置（用于创建测试用户）
MYSQL_ADMIN_HOST=127.0.0.1
MYSQL_ADMIN_PORT=3306
MYSQL_ADMIN_USER=root
MYSQL_ADMIN_PASSWORD=your-mysql-root-password
```

### 2. 创建测试用户

使用MySQL管理员账号创建专用测试用户：

```sql
-- 连接到MySQL
mysql -u root -p

-- 创建测试用户
CREATE USER 'afa_test_user'@'localhost' IDENTIFIED BY 'your-secure-password';

-- 授予测试数据库权限（允许创建和删除test_*数据库）
GRANT CREATE, DROP, SELECT, INSERT, UPDATE, DELETE, ALTER, INDEX ON test_*.* TO 'afa_test_user'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;

-- 验证用户创建成功
SELECT User, Host FROM mysql.user WHERE User = 'afa_test_user';
```

### 3. 验证配置

运行测试验证配置：

```bash
# 安装依赖
pnpm install

# 运行MySQL适配器测试
pnpm run test:mysql

# 运行所有测试
pnpm test
```

如果看到以下输出，说明配置成功：

```
✅ 使用MySQL测试环境
✅ MySQL连接测试通过
✅ 测试数据库创建成功
```

## 常用命令

```bash
# 运行所有测试（自动使用MySQL）
pnpm test

# 运行特定的MySQL测试
pnpm run test:mysql
pnpm run test:mysql-config
pnpm run test:mysql-tools

# 运行测试覆盖率
pnpm run test:coverage

# 监听模式运行测试
pnpm run test:watch
```

## 故障排除

### 连接失败

**错误**: `MySQL服务器连接失败: 127.0.0.1:3306`

**解决方案**:
1. 确保MySQL服务正在运行
2. 检查端口是否正确
3. 验证防火墙设置

```bash
# 检查MySQL服务状态
# Windows
net start mysql

# macOS/Linux
sudo systemctl status mysql
```

### 认证失败

**错误**: `MySQL认证失败: 用户名或密码错误`

**解决方案**:
1. 检查用户名和密码
2. 确保用户存在且有正确权限
3. 验证主机访问权限

```sql
-- 检查用户权限
SHOW GRANTS FOR 'afa_test_user'@'localhost';

-- 重新设置密码
ALTER USER 'afa_test_user'@'localhost' IDENTIFIED BY 'new-password';
```

### 权限不足

**错误**: `Access denied for user 'afa_test_user'@'localhost' to database 'test_xxx'`

**解决方案**:
```sql
-- 授予完整的测试数据库权限
GRANT ALL PRIVILEGES ON test_*.* TO 'afa_test_user'@'localhost';
FLUSH PRIVILEGES;
```

### 自动回退到SQLite

如果MySQL配置有问题，系统会自动回退到SQLite：

```
⚠️ MySQL连接失败，回退到SQLite: Connection refused
✅ 回退到SQLite测试环境
```

这是正常行为，确保测试能够继续运行。

## 性能优化建议

### MySQL配置优化

在MySQL配置文件（my.cnf 或 my.ini）中添加：

```ini
[mysqld]
# 测试环境优化配置
max_connections = 100
innodb_buffer_pool_size = 128M
query_cache_size = 32M
tmp_table_size = 64M
max_heap_table_size = 64M

# 测试数据库快速删除
innodb_fast_shutdown = 2
innodb_flush_log_at_trx_commit = 2
```

### 测试环境优化

```bash
# 设置环境变量优化测试性能
export TEST_DB_CONNECTION_LIMIT=5
export TEST_DB_ACQUIRE_TIMEOUT=30000
export TEST_DB_TIMEOUT=30000
```

## 下一步

- 阅读完整的 [MySQL测试框架文档](mysql-test-framework.md)
- 查看 [MySQL环境配置指南](mysql-environment-setup.md)
- 了解 [故障排除指南](mysql-troubleshooting.md)

## 支持

如遇到问题，请：

1. 检查 [故障排除文档](mysql-troubleshooting.md)
2. 查看测试日志输出
3. 联系开发团队获取支持