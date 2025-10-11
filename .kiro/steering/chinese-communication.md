---
inclusion: always
---

# 中文沟通规范

## 沟通语言

- **主要沟通语言**: 中文
- **代码注释**: 使用中文注释解释业务逻辑
- **变量命名**: 使用英文，但可以在注释中提供中文说明
- **文档编写**: 优先使用中文编写项目文档
- **错误信息**: 面向用户的错误信息使用中文

## 代码注释规范

```javascript
// 验证用户登录状态
function validateUserLogin(token) {
  // 检查token是否有效
  if (!token) {
    throw new Error("登录令牌不能为空");
  }

  // 解析JWT令牌
  const decoded = jwt.verify(token, JWT_SECRET);
  return decoded;
}
```

## 文档语言

- **README 文件**: 使用中文编写
- **API 文档**: 接口描述使用中文
- **业务需求文档**: 使用中文
- **技术设计文档**: 使用中文

## 用户界面

- **前端界面**: 所有文本使用中文
- **小程序界面**: 所有文本使用中文
- **错误提示**: 使用用户友好的中文提示
- **成功消息**: 使用中文确认信息

## 数据库设计

- **表注释**: 使用中文描述表的用途
- **字段注释**: 使用中文说明字段含义
- **枚举值**: 可以使用中文作为显示值

示例：

```sql
-- 用户表
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username VARCHAR(50) NOT NULL COMMENT '用户名',
  email VARCHAR(100) COMMENT '邮箱地址',
  created_at DATETIME COMMENT '创建时间'
);
```
