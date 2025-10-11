# MySQL环境配置指南

## 概述

本指南详细介绍如何在不同环境下配置MySQL数据库，以支持AFA办公小程序的测试框架。

## 目录

- [本地开发环境](#本地开发环境)
- [Docker环境](#docker环境)
- [CI/CD环境](#cicd环境)
- [生产环境](#生产环境)
- [安全配置](#安全配置)
- [性能优化](#性能优化)

## 本地开发环境

### Windows环境

#### 1. 安装MySQL

**方法1: 使用MySQL Installer（推荐）**

1. 下载MySQL Installer：https://dev.mysql.com/downloads/installer/
2. 选择"mysql-installer-community-8.0.xx.x.msi"
3. 运行安装程序，选择"Developer Default"
4. 设置root密码（建议使用强密码）
5. 完成安装

**方法2: 使用Chocolatey**

```powershell
# 安装Chocolatey（如果未安装）
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 安装MySQL
choco install mysql
```

#### 2. 配置MySQL服务

```powershell
# 启动MySQL服务
net start mysql80

# 设置开机自启动
sc config mysql80 start= auto
```

#### 3. 创建测试用户

```powershell
# 连接到MySQL
mysql -u root -p

# 或使用MySQL Workbench图形界面
```

```sql
-- 创建测试用户
CREATE USER 'afa_test_user'@'localhost' IDENTIFIED BY 'AFA_Test_2024!';

-- 授予权限
GRANT CREATE, DROP, SELECT, INSERT, UPDATE, DELETE, ALTER, INDEX, CREATE TEMPORARY TABLES ON test_*.* TO 'afa_test_user'@'localhost';

-- 创建应用用户（可选）
CREATE USER 'afa_app_user'@'localhost' IDENTIFIED BY 'AFA_App_2024!';
GRANT SELECT, INSERT, UPDATE, DELETE ON afa_office.* TO 'afa_app_user'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;
```

### macOS环境

#### 1. 安装MySQL

**方法1: 使用Homebrew（推荐）**

```bash
# 安装Homebrew（如果未安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装MySQL
brew install mysql

# 启动MySQL服务
brew services start mysql

# 设置开机自启动
brew services enable mysql
```

**方法2: 使用官方安装包**

1. 下载MySQL Community Server：https://dev.mysql.com/downloads/mysql/
2. 选择macOS版本的DMG文件
3. 运行安装程序
4. 记住安装过程中显示的临时密码

#### 2. 初始配置

```bash
# 安全配置（设置root密码等）
mysql_secure_installation

# 连接到MySQL
mysql -u root -p
```

### Linux环境（Ubuntu/Debian）

#### 1. 安装MySQL

```bash
# 更新包列表
sudo apt update

# 安装MySQL服务器
sudo apt install mysql-server

# 启动MySQL服务
sudo systemctl start mysql

# 设置开机自启动
sudo systemctl enable mysql
```

#### 2. 安全配置

```bash
# 运行安全配置脚本
sudo mysql_secure_installation
```

#### 3. 创建用户

```bash
# 连接到MySQL
sudo mysql -u root -p
```

### CentOS/RHEL环境

#### 1. 安装MySQL

```bash
# 添加MySQL官方仓库
sudo yum install https://dev.mysql.com/get/mysql80-community-release-el7-3.noarch.rpm

# 安装MySQL服务器
sudo yum install mysql-community-server

# 启动MySQL服务
sudo systemctl start mysqld

# 设置开机自启动
sudo systemctl enable mysqld

# 获取临时密码
sudo grep 'temporary password' /var/log/mysqld.log
```

## Docker环境

### 基础Docker配置

#### 1. 创建Docker Compose文件

创建 `docker-compose.mysql.yml`：

```yaml
version: '3.8'

services:
  mysql-test:
    image: mysql:8.0
    container_name: afa-mysql-test
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: AFA_Root_2024!
      MYSQL_DATABASE: afa_office_test
      MYSQL_USER: afa_test_user
      MYSQL_PASSWORD: AFA_Test_2024!
    ports:
      - "3306:3306"
    volumes:
      - mysql_test_data:/var/lib/mysql
      - ./docker/mysql/init:/docker-entrypoint-initdb.d
      - ./docker/mysql/conf:/etc/mysql/conf.d
    command: --default-authentication-plugin=mysql_native_password
    networks:
      - afa-network

  mysql-app:
    image: mysql:8.0
    container_name: afa-mysql-app
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: AFA_Root_2024!
      MYSQL_DATABASE: afa_office
      MYSQL_USER: afa_app_user
      MYSQL_PASSWORD: AFA_App_2024!
    ports:
      - "3307:3306"
    volumes:
      - mysql_app_data:/var/lib/mysql
      - ./docker/mysql/init:/docker-entrypoint-initdb.d
      - ./docker/mysql/conf:/etc/mysql/conf.d
    command: --default-authentication-plugin=mysql_native_password
    networks:
      - afa-network

volumes:
  mysql_test_data:
  mysql_app_data:

networks:
  afa-network:
    driver: bridge
```

#### 2. 创建初始化脚本

创建 `docker/mysql/init/01-init-users.sql`：

```sql
-- 创建测试用户权限
GRANT CREATE, DROP, SELECT, INSERT, UPDATE, DELETE, ALTER, INDEX, CREATE TEMPORARY TABLES ON test_*.* TO 'afa_test_user'@'%';

-- 创建应用用户权限
GRANT SELECT, INSERT, UPDATE, DELETE ON afa_office.* TO 'afa_app_user'@'%';

-- 刷新权限
FLUSH PRIVILEGES;

-- 创建测试数据库模板
CREATE DATABASE IF NOT EXISTS test_template;
USE test_template;

-- 这里可以添加基础表结构
-- 实际的表结构会由应用程序动态创建
```

#### 3. 创建MySQL配置文件

创建 `docker/mysql/conf/mysql.cnf`：

```ini
[mysqld]
# 基础配置
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
default-time-zone = '+08:00'

# 性能优化
max_connections = 200
innodb_buffer_pool_size = 256M
query_cache_size = 64M
tmp_table_size = 128M
max_heap_table_size = 128M

# 测试环境优化
innodb_flush_log_at_trx_commit = 2
innodb_fast_shutdown = 2
sync_binlog = 0

# 日志配置
general_log = 0
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2

# 安全配置
local_infile = 0
skip_show_database

[mysql]
default-character-set = utf8mb4

[client]
default-character-set = utf8mb4
```

#### 4. 启动Docker环境

```bash
# 启动MySQL服务
docker-compose -f docker-compose.mysql.yml up -d

# 查看服务状态
docker-compose -f docker-compose.mysql.yml ps

# 查看日志
docker-compose -f docker-compose.mysql.yml logs mysql-test

# 连接到测试数据库
docker exec -it afa-mysql-test mysql -u afa_test_user -p

# 停止服务
docker-compose -f docker-compose.mysql.yml down
```

### 开发环境Docker配置

创建 `docker-compose.dev.yml`：

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: afa-mysql-dev
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: dev_password
      MYSQL_DATABASE: afa_office_dev
      MYSQL_USER: dev_user
      MYSQL_PASSWORD: dev_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_dev_data:/var/lib/mysql
      - ./docker/mysql/dev-init:/docker-entrypoint-initdb.d
    command: --default-authentication-plugin=mysql_native_password

  adminer:
    image: adminer
    container_name: afa-adminer
    restart: unless-stopped
    ports:
      - "8080:8080"
    depends_on:
      - mysql

volumes:
  mysql_dev_data:
```

## CI/CD环境

### GitHub Actions配置

创建 `.github/workflows/test.yml`：

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test_password
          MYSQL_DATABASE: test_db
          MYSQL_USER: test_user
          MYSQL_PASSWORD: test_password
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'pnpm'

    - name: Install pnpm
      run: npm install -g pnpm

    - name: Install dependencies
      run: pnpm install

    - name: Setup test database
      run: |
        mysql -h 127.0.0.1 -u root -ptest_password -e "
          CREATE USER 'afa_test_user'@'%' IDENTIFIED BY 'test_password';
          GRANT CREATE, DROP, SELECT, INSERT, UPDATE, DELETE, ALTER, INDEX ON test_*.* TO 'afa_test_user'@'%';
          FLUSH PRIVILEGES;
        "

    - name: Run tests
      env:
        TEST_DB_TYPE: mysql
        TEST_DB_HOST: 127.0.0.1
        TEST_DB_PORT: 3306
        TEST_DB_USER: afa_test_user
        TEST_DB_PASSWORD: test_password
      run: pnpm test
```

### GitLab CI配置

创建 `.gitlab-ci.yml`：

```yaml
stages:
  - test

variables:
  MYSQL_ROOT_PASSWORD: test_password
  MYSQL_DATABASE: test_db
  MYSQL_USER: test_user
  MYSQL_PASSWORD: test_password

test:
  stage: test
  image: node:18
  services:
    - mysql:8.0
  variables:
    TEST_DB_TYPE: mysql
    TEST_DB_HOST: mysql
    TEST_DB_PORT: 3306
    TEST_DB_USER: test_user
    TEST_DB_PASSWORD: test_password
  before_script:
    - apt-get update -qq && apt-get install -y -qq mysql-client
    - npm install -g pnpm
    - pnpm install
    - |
      mysql -h mysql -u root -p$MYSQL_ROOT_PASSWORD -e "
        CREATE USER 'afa_test_user'@'%' IDENTIFIED BY 'test_password';
        GRANT CREATE, DROP, SELECT, INSERT, UPDATE, DELETE, ALTER, INDEX ON test_*.* TO 'afa_test_user'@'%';
        FLUSH PRIVILEGES;
      "
  script:
    - pnpm test
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
```

## 生产环境

### 基础配置

#### 1. 安装和配置

```bash
# 安装MySQL 8.0
sudo apt update
sudo apt install mysql-server-8.0

# 安全配置
sudo mysql_secure_installation
```

#### 2. 创建生产用户

```sql
-- 创建应用用户
CREATE USER 'afa_prod_user'@'localhost' IDENTIFIED BY 'STRONG_PRODUCTION_PASSWORD';

-- 授予最小权限
GRANT SELECT, INSERT, UPDATE, DELETE ON afa_office.* TO 'afa_prod_user'@'localhost';

-- 创建只读用户（用于报表等）
CREATE USER 'afa_readonly_user'@'localhost' IDENTIFIED BY 'READONLY_PASSWORD';
GRANT SELECT ON afa_office.* TO 'afa_readonly_user'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;
```

#### 3. 生产环境配置文件

编辑 `/etc/mysql/mysql.conf.d/mysqld.cnf`：

```ini
[mysqld]
# 基础配置
bind-address = 127.0.0.1
port = 3306
datadir = /var/lib/mysql
socket = /var/run/mysqld/mysqld.sock

# 字符集配置
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# 性能配置
max_connections = 500
innodb_buffer_pool_size = 2G
query_cache_size = 256M
tmp_table_size = 256M
max_heap_table_size = 256M

# 日志配置
log_error = /var/log/mysql/error.log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1

# 安全配置
local_infile = 0
skip_show_database
sql_mode = STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO

# 备份配置
log_bin = /var/log/mysql/mysql-bin.log
binlog_expire_logs_seconds = 604800
max_binlog_size = 100M
```

## 安全配置

### 1. 用户权限管理

```sql
-- 查看所有用户
SELECT User, Host, authentication_string FROM mysql.user;

-- 查看用户权限
SHOW GRANTS FOR 'afa_test_user'@'localhost';

-- 撤销权限
REVOKE ALL PRIVILEGES ON *.* FROM 'old_user'@'localhost';

-- 删除用户
DROP USER 'old_user'@'localhost';
```

### 2. 网络安全

```bash
# 配置防火墙（Ubuntu/Debian）
sudo ufw allow from 192.168.1.0/24 to any port 3306
sudo ufw deny 3306

# 配置防火墙（CentOS/RHEL）
sudo firewall-cmd --permanent --add-rich-rule="rule family='ipv4' source address='192.168.1.0/24' port protocol='tcp' port='3306' accept"
sudo firewall-cmd --reload
```

### 3. SSL配置

```sql
-- 检查SSL状态
SHOW VARIABLES LIKE 'have_ssl';

-- 创建SSL用户
CREATE USER 'ssl_user'@'localhost' IDENTIFIED BY 'password' REQUIRE SSL;
```

### 4. 密码策略

```sql
-- 查看密码策略
SHOW VARIABLES LIKE 'validate_password%';

-- 设置密码策略
SET GLOBAL validate_password.policy = STRONG;
SET GLOBAL validate_password.length = 12;
SET GLOBAL validate_password.mixed_case_count = 1;
SET GLOBAL validate_password.number_count = 1;
SET GLOBAL validate_password.special_char_count = 1;
```

## 性能优化

### 1. 内存配置

```ini
[mysqld]
# 根据服务器内存调整
innodb_buffer_pool_size = 70%_of_total_memory
query_cache_size = 256M
sort_buffer_size = 2M
read_buffer_size = 2M
read_rnd_buffer_size = 8M
myisam_sort_buffer_size = 64M
```

### 2. 连接优化

```ini
[mysqld]
max_connections = 500
max_connect_errors = 100
connect_timeout = 10
wait_timeout = 600
interactive_timeout = 600
```

### 3. 查询优化

```sql
-- 启用慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;

-- 分析慢查询
-- 使用 mysqldumpslow 工具分析日志文件
```

### 4. 索引优化

```sql
-- 查看表状态
SHOW TABLE STATUS;

-- 分析表
ANALYZE TABLE table_name;

-- 优化表
OPTIMIZE TABLE table_name;

-- 检查索引使用情况
SHOW INDEX FROM table_name;
```

## 监控和维护

### 1. 性能监控

```sql
-- 查看服务器状态
SHOW STATUS;

-- 查看进程列表
SHOW PROCESSLIST;

-- 查看InnoDB状态
SHOW ENGINE INNODB STATUS;
```

### 2. 备份策略

```bash
# 逻辑备份
mysqldump -u root -p --single-transaction --routines --triggers afa_office > backup.sql

# 物理备份（使用xtrabackup）
xtrabackup --backup --target-dir=/backup/mysql/
```

### 3. 日志轮转

创建 `/etc/logrotate.d/mysql`：

```
/var/log/mysql/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 640 mysql mysql
    postrotate
        /usr/bin/mysqladmin flush-logs
    endscript
}
```

## 故障排除

### 常见问题

1. **连接数过多**
   ```sql
   SHOW VARIABLES LIKE 'max_connections';
   SET GLOBAL max_connections = 1000;
   ```

2. **磁盘空间不足**
   ```bash
   # 清理二进制日志
   PURGE BINARY LOGS BEFORE '2024-01-01';
   
   # 清理慢查询日志
   > /var/log/mysql/slow.log
   ```

3. **内存不足**
   ```ini
   # 减少缓冲区大小
   innodb_buffer_pool_size = 512M
   query_cache_size = 64M
   ```

### 诊断工具

```bash
# 检查MySQL状态
systemctl status mysql

# 查看错误日志
tail -f /var/log/mysql/error.log

# 检查配置文件语法
mysqld --help --verbose

# 性能分析
mysqltuner
```

## 总结

本指南涵盖了MySQL在各种环境下的配置方法。根据您的具体需求选择合适的配置方案：

- **开发环境**: 使用Docker或本地安装，注重便利性
- **测试环境**: 使用CI/CD集成，注重自动化
- **生产环境**: 注重安全性、性能和稳定性

记住始终遵循安全最佳实践，定期备份数据，监控系统性能。