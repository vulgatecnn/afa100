# 集成测试数据库环境设置指南

本文档介绍如何设置和管理AFA办公小程序系统的集成测试数据库环境。

## 概述

集成测试数据库是专门用于运行集成测试的独立MySQL数据库环境，与开发和生产数据库完全隔离。它包含完整的表结构和基础数据，支持自动化的数据清理和重置。

## 前置要求

1. **MySQL服务器** (版本 8.0+)
   - 确保MySQL服务正在运行
   - 具有管理员权限的账户（通常是root）

2. **Node.js环境** (版本 18+)
   - 已安装pnpm包管理器

3. **网络连接**
   - 能够连接到MySQL服务器

## 快速开始

### 1. 配置环境变量

复制环境变量配置文件：

```bash
cp .env.integration.example .env.integration
```

编辑 `.env.integration` 文件，根据你的MySQL配置修改以下参数：

```env
# MySQL管理员配置
MYSQL_ADMIN_HOST=127.0.0.1
MYSQL_ADMIN_PORT=3306
MYSQL_ADMIN_USER=root
MYSQL_ADMIN_PASSWORD=your_mysql_root_password

# 集成测试数据库配置
INTEGRATION_TEST_DB_HOST=127.0.0.1
INTEGRATION_TEST_DB_PORT=3306
INTEGRATION_TEST_DB_USER=afa_integration_user
INTEGRATION_TEST_DB_PASSWORD=afa_integration_2024
INTEGRATION_TEST_DB_NAME=afa_office_integration_test
```

### 2. 初始化数据库环境

运行初始化命令：

```bash
pnpm db:integration:init
```

这个命令会：
- 创建集成测试数据库
- 创建专用的数据库用户
- 创建所有必需的表结构
- 插入基础权限数据
- 验证环境设置

### 3. 验证环境

运行验证测试：

```bash
pnpm db:integration:verify
```

或者运行完整的数据库验证测试：

```bash
pnpm test tests/integration/database-setup-verification.test.ts
```

## 可用命令

### 数据库管理命令

```bash
# 初始化集成测试数据库环境
pnpm db:integration:init

# 重置集成测试数据库（删除并重新创建）
pnpm db:integration:reset

# 清理数据库数据（保留表结构）
pnpm db:integration:clean

# 删除集成测试数据库
pnpm db:integration:drop

# 验证数据库环境
pnpm db:integration:verify
```

### 测试命令

```bash
# 运行数据库验证测试
pnpm test tests/integration/database-setup-verification.test.ts

# 运行用户CRUD集成测试
pnpm test tests/integration/user-crud-integration.test.ts

# 运行商户CRUD集成测试
pnpm test tests/integration/merchant-crud-integration.test.ts

# 运行访客CRUD集成测试
pnpm test tests/integration/visitor-crud-integration.test.ts
```

## 数据库结构

### 核心表

1. **users** - 用户表
   - 支持多种用户类型：租务管理员、商户管理员、员工、访客
   - 支持微信登录（open_id, union_id）
   - 包含用户状态管理

2. **merchants** - 商户表
   - 商户基本信息和联系方式
   - 商户状态管理
   - JSON格式的配置信息

3. **projects** - 项目表
   - 项目基本信息
   - 支持层级结构的空间管理

4. **venues** - 场地表
   - 属于项目的场地信息
   - 支持多个场地管理

5. **floors** - 楼层表
   - 属于场地的楼层信息
   - 详细的空间划分

6. **visitor_applications** - 访客申请表
   - 完整的访客申请流程
   - 审批状态管理
   - 通行码生成和管理

7. **passcodes** - 通行码表
   - 员工和访客通行码
   - 使用次数和时效控制
   - 权限配置

8. **access_records** - 通行记录表
   - 详细的通行记录
   - 设备信息和位置记录
   - 成功/失败状态跟踪

### 权限管理表

9. **permissions** - 权限表
   - 基于资源的权限定义
   - 支持项目、场地、楼层级别的权限

10. **user_permissions** - 用户权限关联表
    - 用户级别的权限分配
    - 权限授权记录

11. **merchant_permissions** - 商户权限关联表
    - 商户级别的权限分配
    - 批量权限管理

## 故障排除

### 常见问题

1. **连接失败**
   ```
   Error: Unknown database 'afa_office_integration_test'
   ```
   **解决方案**: 运行 `pnpm db:integration:init` 初始化数据库

2. **权限错误**
   ```
   Error: Access denied for user 'afa_integration_user'@'localhost'
   ```
   **解决方案**: 检查MySQL管理员账户配置，确保有创建用户的权限

3. **表不存在**
   ```
   Error: Table 'afa_office_integration_test.users' doesn't exist
   ```
   **解决方案**: 运行 `pnpm db:integration:reset` 重新创建表结构

4. **外键约束错误**
   ```
   Error: Cannot add or update a child row: a foreign key constraint fails
   ```
   **解决方案**: 检查数据插入顺序，确保先插入父表数据

### 调试步骤

1. **检查MySQL服务状态**
   ```bash
   # Windows
   net start mysql
   
   # Linux/macOS
   sudo systemctl status mysql
   ```

2. **验证MySQL连接**
   ```bash
   mysql -h 127.0.0.1 -P 3306 -u root -p
   ```

3. **检查数据库和用户**
   ```sql
   SHOW DATABASES LIKE 'afa_office_integration_test';
   SELECT User, Host FROM mysql.user WHERE User = 'afa_integration_user';
   ```

4. **查看表结构**
   ```sql
   USE afa_office_integration_test;
   SHOW TABLES;
   DESCRIBE users;
   ```

5. **检查外键约束**
   ```sql
   SELECT 
     TABLE_NAME,
     COLUMN_NAME,
     REFERENCED_TABLE_NAME,
     REFERENCED_COLUMN_NAME
   FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
   WHERE TABLE_SCHEMA = 'afa_office_integration_test' 
   AND REFERENCED_TABLE_NAME IS NOT NULL;
   ```

## 最佳实践

### 测试数据管理

1. **使用事务**
   - 在测试中使用数据库事务
   - 测试结束后回滚事务，保持数据库清洁

2. **数据隔离**
   - 每个测试用例使用独立的测试数据
   - 避免测试之间的数据依赖

3. **定期清理**
   - 定期运行 `pnpm db:integration:clean` 清理测试数据
   - 在CI/CD流水线中自动清理

### 性能优化

1. **索引优化**
   - 确保查询字段有适当的索引
   - 定期检查查询性能

2. **连接池管理**
   - 合理配置数据库连接池
   - 及时关闭数据库连接

3. **批量操作**
   - 使用批量插入减少数据库交互
   - 合理使用事务提高性能

### 安全考虑

1. **权限最小化**
   - 集成测试用户只有必要的权限
   - 不要在生产环境使用测试配置

2. **数据隔离**
   - 测试数据库与生产数据库完全隔离
   - 使用不同的用户和密码

3. **敏感信息保护**
   - 不要在代码中硬编码密码
   - 使用环境变量管理敏感配置

## 持续集成

### GitHub Actions配置示例

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test_password
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
          
      - name: Install pnpm
        run: npm install -g pnpm
        
      - name: Install dependencies
        run: pnpm install
        
      - name: Setup integration test database
        run: pnpm db:integration:init
        env:
          MYSQL_ADMIN_PASSWORD: test_password
          
      - name: Run integration tests
        run: pnpm test tests/integration/
```

## 支持

如果遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查MySQL服务器日志
3. 运行 `pnpm db:integration:verify` 诊断环境
4. 提交Issue并附上详细的错误信息和环境配置