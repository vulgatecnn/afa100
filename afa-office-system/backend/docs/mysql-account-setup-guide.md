# MySQL数据库访问账号设置指南

## 概述

本指南介绍如何为AFA办公小程序创建专门的MySQL数据库访问账号，遵循安全最佳实践，实现数据库访问的权限分离和环境隔离。

## 为什么需要专门的数据库访问账号？

### 安全考虑
- **最小权限原则**: 应用程序只获得必要的数据库权限
- **权限隔离**: 避免使用root或管理员账号进行应用程序连接
- **环境隔离**: 不同环境使用不同的账号和权限配置
- **审计追踪**: 便于监控和审计应用程序的数据库访问

### 管理优势
- **配置标准化**: 统一的账号创建和权限配置流程
- **环境变量管理**: 自动生成环境变量配置文件
- **资源控制**: 设置合理的连接数和查询限制
- **维护便利**: 便于账号管理和密码更新

## 快速开始

### 1. 准备工作

确保满足以下条件：
- MySQL服务正在运行
- 拥有MySQL管理员账号（通常是root）
- Node.js和pnpm已安装
- 项目依赖已安装

### 2. 创建开发环境账号

```bash
# 使用快捷命令
npm run setup:mysql-dev

# 或使用完整命令
npm run setup:mysql-account -- create \
  --database afa_office_dev \
  --environment development \
  --admin-password your_mysql_root_password
```

### 3. 创建测试环境账号

```bash
# 使用快捷命令
npm run setup:mysql-test

# 或使用完整命令
npm run setup:mysql-account -- create \
  --database afa_office_test \
  --environment test \
  --admin-password your_mysql_root_password
```

### 4. 创建生产环境账号

```bash
# 使用快捷命令（需要手动指定参数）
npm run setup:mysql-account -- create \
  --database afa_office_prod \
  --environment production \
  --admin-host your-mysql-server.com \
  --admin-password your_mysql_root_password \
  --username afa_prod_user \
  --password very_secure_production_password
```

## 详细使用说明

### 命令行工具

#### 查看帮助信息
```bash
npm run setup:mysql-account -- --help
npm run setup:mysql-account -- guide
```

#### 创建账号
```bash
npm run setup:mysql-account -- create [选项]
```

**必需参数：**
- `--database <name>`: 数据库名称

**可选参数：**
- `--environment <env>`: 环境类型 (development/test/production，默认：development)
- `--admin-host <host>`: MySQL管理员主机 (默认：127.0.0.1)
- `--admin-port <port>`: MySQL管理员端口 (默认：3306)
- `--admin-user <user>`: MySQL管理员用户名 (默认：root)
- `--admin-password <password>`: MySQL管理员密码
- `--username <username>`: 应用程序用户名 (默认：自动生成)
- `--password <password>`: 应用程序密码 (默认：自动生成)
- `--force`: 强制执行，跳过确认

#### 删除账号
```bash
npm run setup:mysql-account -- delete \
  --username afa_dev_user \
  --admin-password your_mysql_root_password
```

### 环境变量配置

创建账号后，工具会自动生成环境变量配置文件：

#### 开发环境 (.env.development)
```env
# MySQL应用数据库配置
APP_DB_TYPE=mysql
APP_DB_HOST=127.0.0.1
APP_DB_PORT=3306
APP_DB_USER=afa_development_user
APP_DB_PASSWORD=generated_secure_password
APP_DB_NAME=afa_office_dev
APP_DB_CONNECTION_LIMIT=10
APP_DB_ACQUIRE_TIMEOUT=60000
APP_DB_TIMEOUT=60000

# MySQL测试数据库配置
TEST_DB_TYPE=mysql
TEST_DB_HOST=127.0.0.1
TEST_DB_PORT=3306
TEST_DB_USER=afa_development_user
TEST_DB_PASSWORD=generated_secure_password
TEST_DB_NAME=afa_office_dev_test
TEST_DB_CONNECTION_LIMIT=5
TEST_DB_ACQUIRE_TIMEOUT=30000
TEST_DB_TIMEOUT=30000
```

#### 在应用程序中使用
```typescript
import { config } from 'dotenv';
config();

const dbConfig = {
  type: process.env.APP_DB_TYPE,
  host: process.env.APP_DB_HOST,
  port: parseInt(process.env.APP_DB_PORT || '3306'),
  user: process.env.APP_DB_USER,
  password: process.env.APP_DB_PASSWORD,
  database: process.env.APP_DB_NAME,
  connectionLimit: parseInt(process.env.APP_DB_CONNECTION_LIMIT || '10'),
  acquireTimeout: parseInt(process.env.APP_DB_ACQUIRE_TIMEOUT || '60000'),
  timeout: parseInt(process.env.APP_DB_TIMEOUT || '60000')
};
```

## 权限配置

### 不同环境的权限设置

| 权限 | 开发环境 | 测试环境 | 生产环境 | 说明 |
|------|----------|----------|----------|------|
| SELECT | ✅ | ✅ | ✅ | 查询数据 |
| INSERT | ✅ | ✅ | ✅ | 插入数据 |
| UPDATE | ✅ | ✅ | ✅ | 更新数据 |
| DELETE | ✅ | ✅ | ✅ | 删除数据 |
| CREATE | ✅ | ❌ | ❌ | 创建表/索引 |
| DROP | ✅ | ❌ | ❌ | 删除表/索引 |
| ALTER | ✅ | ❌ | ❌ | 修改表结构 |
| INDEX | ✅ | ❌ | ❌ | 管理索引 |

### 资源限制配置

| 资源限制 | 开发环境 | 测试环境 | 生产环境 |
|----------|----------|----------|----------|
| 最大连接数 | 20 | 10 | 50 |
| 每小时最大查询数 | 5,000 | 3,000 | 10,000 |
| 每小时最大更新数 | 500 | 300 | 1,000 |
| 每小时最大连接数 | 50 | 30 | 100 |

## 安全最佳实践

### 密码安全
- ✅ 使用强密码（至少16位，包含大小写字母、数字、特殊字符）
- ✅ 定期更换密码（建议每3-6个月）
- ✅ 不要在代码中硬编码密码
- ✅ 使用环境变量存储敏感信息
- ❌ 避免使用简单密码如 "123456", "password"

### 权限管理
- ✅ 遵循最小权限原则
- ✅ 生产环境只授予必要的数据操作权限
- ✅ 开发环境可以有更多权限便于开发
- ✅ 定期审查和清理不必要的权限
- ❌ 避免使用root账号进行应用程序连接

### 网络安全
- ✅ 使用SSL/TLS加密连接
- ✅ 限制连接来源IP地址
- ✅ 使用防火墙保护数据库服务器
- ✅ 定期更新MySQL版本
- ❌ 避免在公网直接暴露数据库端口

### 环境隔离
- ✅ 不同环境使用不同的数据库和账号
- ✅ 测试环境不要使用生产数据
- ✅ 开发环境与生产环境完全隔离
- ✅ 使用不同的密码和权限配置

## 常见问题

### Q: 如何更新数据库密码？
A: 重新运行账号创建命令，工具会自动删除旧账号并创建新账号。

### Q: 如何为现有数据库创建访问账号？
A: 使用 `--database` 参数指定现有数据库名称，工具会检查数据库是否存在。

### Q: 如何自定义用户名和密码？
A: 使用 `--username` 和 `--password` 参数指定自定义值。

### Q: 如何连接到远程MySQL服务器？
A: 使用 `--admin-host` 参数指定远程服务器地址。

### Q: 如何删除不需要的账号？
A: 使用 `delete` 命令删除指定的用户账号。

### Q: 环境变量文件在哪里？
A: 工具会在项目根目录创建 `.env.{environment}` 文件。

## 故障排除

### 连接错误
- 检查MySQL服务是否正在运行
- 验证管理员账号和密码是否正确
- 确认网络连接和防火墙设置

### 权限错误
- 确保管理员账号有创建用户和授权的权限
- 检查MySQL版本兼容性
- 验证数据库是否存在

### 环境变量问题
- 检查生成的环境变量文件路径
- 确认应用程序正确加载环境变量
- 验证环境变量值的格式

## 高级用法

### 编程方式使用

```typescript
import { quickCreateApplicationAccount } from './src/utils/mysql-account-setup';

// 创建开发环境账号
const result = await quickCreateApplicationAccount(
  'afa_office_dev',
  'development',
  {
    adminHost: '127.0.0.1',
    adminPort: 3306,
    adminUser: 'root',
    adminPassword: 'your_password',
    username: 'custom_user',
    password: 'custom_password'
  }
);

if (result.success) {
  console.log('账号创建成功:', result.accountConfig.username);
  console.log('环境变量文件:', result.envFilePath);
} else {
  console.error('账号创建失败:', result.errors);
}
```

### 批量创建账号

```typescript
import { MySQLAccountSetup } from './src/utils/mysql-account-setup';

const accountSetup = new MySQLAccountSetup(adminConfig);

const environments = ['development', 'test', 'production'];
for (const env of environments) {
  await accountSetup.createApplicationAccount(`afa_office_${env}`, {
    environment: env
  });
}
```

## 维护和监控

### 定期维护任务
1. **密码更新**: 每3-6个月更新数据库密码
2. **权限审查**: 定期检查和清理不必要的权限
3. **连接监控**: 监控数据库连接使用情况
4. **日志审计**: 检查数据库访问日志

### 监控指标
- 连接数使用率
- 查询执行时间
- 错误率统计
- 资源使用情况

### 告警设置
- 连接数超过阈值
- 查询执行时间过长
- 认证失败次数过多
- 异常访问模式

## 总结

通过使用MySQL数据库访问账号设置工具，您可以：

1. **提高安全性**: 遵循最小权限原则，避免使用管理员账号
2. **简化管理**: 自动化账号创建和配置过程
3. **环境隔离**: 不同环境使用不同的账号和权限
4. **标准化配置**: 统一的权限和资源限制配置
5. **便于维护**: 简化密码更新和账号管理流程

建议在项目初始化时就设置好专门的数据库访问账号，并定期进行维护和更新。