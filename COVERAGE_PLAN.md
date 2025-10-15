# 测试覆盖率提升计划

## 📅 创建时间
**2025-10-15 11:05**

---

## 🎯 目标

**将测试覆盖率提升到80%**

当前配置的覆盖率阈值：
```typescript
thresholds: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

---

## 📊 当前状态分析

### 测试通过情况

| 指标 | 数量 |
|------|------|
| **总测试** | 458个 |
| **通过** | 420个 (91.7%) |
| **失败** | 38个 (8.3%) |

### 失败的测试分类

#### 组件测试 (16个失败)
1. **form-field.test.ts** - 8个失败
2. **status-badge.test.ts** - 6个失败
3. **qr-code.test.ts** - 2个失败

#### 工具函数测试 (3个失败)
4. **date.test.ts** - 1个失败
5. **storage.test.ts** - 2个失败

#### 服务测试 (2个失败)
6. **api.test.ts** - 1个失败
7. **notification.test.ts** - 1个失败

---

## 🔧 修复计划

### 阶段1: 修复剩余的测试失败 (预计30分钟)

#### 1.1 修复组件测试 (16个)

**form-field.test.ts** (8个失败)
- 问题: 嵌套的 Array 和 Object 格式未完全修复
- 解决方案: 手动修复剩余的复杂格式

**status-badge.test.ts** (6个失败)
- 问题: 类似的嵌套对象格式
- 解决方案: 修复 customConfig 等复杂属性

**qr-code.test.ts** (2个失败)
- 问题: 边界情况
- 解决方案: 修复特定的测试用例

#### 1.2 修复工具函数测试 (3个)

**date.test.ts** (1个失败)
```typescript
// 问题: DateUtils.format(null) 抛出错误
// 解决方案: 在 date.ts 中添加空值检查
static format(date: Date | string | null | undefined, format?: string): string {
  if (!date || date === null || date === undefined) {
    return '';
  }
  // ... 原有逻辑
}
```

**storage.test.ts** (2个失败)
```typescript
// 问题: 错误消息不匹配
// 解决方案: 更新测试断言或修改实现的错误消息

// 期望: '批量获取数据失败:'
// 实际: '获取存储数据失败:'

// 期望: '获取存储使用率失败:'
// 实际: '获取存储信息失败:'
```

#### 1.3 修复服务测试 (2个)

**notification.test.ts** (1个失败)
```typescript
// 问题: 长文本没有被正确截断（105 > 104）
// 解决方案: 修复文本截断逻辑
const maxLength = 104;
if (content.length > maxLength) {
  content = content.substring(0, maxLength);
}
```

**api.test.ts** (1个失败)
```typescript
// 问题: 并发请求返回的ID不正确
// 期望: results[0].data.id = 1
// 实际: results[0].data.id = 3
// 解决方案: 修复Mock实现，确保每个请求返回正确的ID
```

---

### 阶段2: 分析覆盖率缺口 (预计15分钟)

运行覆盖率报告并识别未覆盖的代码：

```bash
cd afa-office-system/miniprogram
pnpm test:coverage
```

查看覆盖率报告：
- 打开 `coverage/index.html`
- 识别覆盖率低于80%的文件
- 列出未覆盖的代码行

---

### 阶段3: 添加缺失的测试用例 (预计45分钟)

根据覆盖率报告，针对性地添加测试用例：

#### 优先级1: 核心服务 (目标90%+)
- API服务
- 认证服务
- 通知服务

#### 优先级2: 工具函数 (目标85%+)
- 日期工具
- 存储工具
- 验证工具

#### 优先级3: 组件 (目标80%+)
- 表单组件
- 状态徽章
- 二维码组件

---

## 📝 执行步骤

### Step 1: 修复 date.test.ts

**文件**: `afa-office-system/miniprogram/src/utils/date.ts`

```typescript
// 在 DateUtils.format 方法开头添加
static format(date: Date | string | null | undefined, format?: string): string {
  // 添加空值检查
  if (!date || date === null || date === undefined) {
    return '';
  }
  
  // ... 原有逻辑
}
```

### Step 2: 修复 storage.test.ts

**选项A**: 更新测试断言
```typescript
// 修改测试期望
expect(consoleErrorSpy).toHaveBeenCalledWith('获取存储数据失败:', expect.any(Error));
expect(consoleErrorSpy).toHaveBeenCalledWith('获取存储信息失败:', expect.any(Error));
```

**选项B**: 修改实现的错误消息（推荐）
```typescript
// 在 storage.ts 中统一错误消息
console.error('批量获取数据失败:', error);
console.error('获取存储使用率失败:', error);
```

### Step 3: 修复 notification.test.ts

**文件**: `afa-office-system/miniprogram/src/services/notification.ts`

```typescript
// 在生成通知内容时添加长度限制
const maxLength = 104;
let content = `拒绝原因：${reason}`;
if (content.length > maxLength) {
  content = content.substring(0, maxLength);
}
```

### Step 4: 修复 api.test.ts

**文件**: `afa-office-system/miniprogram/tests/unit/services/api.test.ts`

```typescript
// 修复Mock实现，确保每个请求返回正确的ID
let requestCount = 0;
global.wx.request = vi.fn((options) => {
  requestCount++;
  const currentId = requestCount;
  setTimeout(() => {
    options.success({
      data: { id: currentId, message: 'success' },
      statusCode: 200,
      header: {},
      cookies: []
    });
  }, 100);
  return { abort: vi.fn() };
});
```

### Step 5: 修复组件测试的嵌套格式

需要手动修复剩余的复杂 properties 格式，特别是：
- Array类型的 rules
- Object类型的 customConfig

---

## 📊 预期成果

### 修复后的测试通过率

| 指标 | 当前 | 目标 | 提升 |
|------|------|------|------|
| **通过测试** | 420/458 | 450/458+ | +30+ |
| **通过率** | 91.7% | 98%+ | +6.3%+ |

### 覆盖率目标

| 类型 | 目标 |
|------|------|
| **Branches** | ≥ 80% |
| **Functions** | ≥ 80% |
| **Lines** | ≥ 80% |
| **Statements** | ≥ 80% |

---

## ⏱️ 时间估算

| 阶段 | 预计时间 |
|------|---------|
| **修复测试失败** | 30分钟 |
| **分析覆盖率** | 15分钟 |
| **添加测试用例** | 45分钟 |
| **验证和报告** | 15分钟 |
| **总计** | **105分钟** |

---

## 🚀 立即开始

**第一步**: 修复 date.test.ts

```bash
# 编辑文件
# afa-office-system/miniprogram/src/utils/date.ts

# 运行测试验证
cd afa-office-system/miniprogram
pnpm test -- date.test.ts
```

---

## 📞 参考资料

- Vitest 覆盖率文档: https://vitest.dev/guide/coverage.html
- 当前配置: `vitest.config.ts`
- 覆盖率报告: `coverage/index.html`

---

**创建时间**: 2025-10-15 11:05  
**预计完成**: 2025-10-15 12:50  
**状态**: 🟡 进行中
