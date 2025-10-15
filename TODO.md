# 🎯 测试修复 TODO 清单

## 立即执行的任务

### ✅ 任务 1: 修复 qr-code.test.ts (10分钟)

**操作步骤**:
1. 打开文件: `afa-office-system/miniprogram/tests/unit/components/qr-code.test.ts`
2. 使用查找替换功能:
   - 查找: `.methods.`
   - 替换为: `.`
3. 保存文件
4. 运行测试验证: `cd afa-office-system/miniprogram && pnpm test -- qr-code.test.ts`

---

### ✅ 任务 2: 修复 status-badge.test.ts 的 getStatusConfig (5分钟)

**操作步骤**:
1. 打开文件: `afa-office-system/miniprogram/tests/unit/components/status-badge.test.ts`
2. 找到第354-365行
3. 手动修改3处:
   - `statusBadgeComponent.methods.getStatusConfig` → `statusBadgeComponent.getStatusConfig`
4. 保存文件
5. 运行测试验证: `pnpm test -- status-badge.test.ts`

---

### ✅ 任务 3: 修复商户管理端超时 (5分钟)

**操作步骤**:
1. 打开文件: `afa-office-system/frontend/merchant-admin/src/services/__tests__/employeeService.test.ts`
2. 找到第516、536、556行
3. 删除 `, 10000) // 增加超时时间`
4. 改为 `})`
5. 保存文件
6. 运行测试验证: `cd afa-office-system/frontend/merchant-admin && pnpm test -- employeeService.test.ts`

---

### ✅ 任务 4: 修复测试数据结构 (30-45分钟)

**需要修改的文件**:
- `form-field.test.ts`
- `status-badge.test.ts`  
- `qr-code.test.ts`

**修改规则**:
将所有 `properties` 中的对象格式改为简单值

**示例**:
```typescript
// ❌ 错误 - 删除这种格式
properties: {
  status: { type: String, value: 'pending' }
}

// ✅ 正确 - 改为这种格式
properties: {
  status: 'pending'
}
```

---

### ✅ 任务 5: 修复工具函数边界条件 (40分钟)

**5.1 修复 date.test.ts**
- 文件: `afa-office-system/miniprogram/src/utils/date.ts`
- 在 `format` 方法开头添加空值检查

**5.2 修复 storage.test.ts**
- 文件: `afa-office-system/miniprogram/tests/unit/utils/storage.test.ts`
- 更新错误消息断言

**5.3 修复 notification.test.ts**
- 添加文本长度限制为104字符

**5.4 修复 api.test.ts**
- 修复并发请求Mock返回的ID

---

### ✅ 任务 6: 最终验证 (15分钟)

**操作步骤**:
```bash
# 运行完整测试
cd d:\vulgate\code\kiro\afa100
pnpm test

# 生成覆盖率报告
cd afa-office-system/miniprogram
pnpm test:coverage
```

---

## 📊 预期成果

- 当前通过率: 82.9% (500/603)
- 目标通过率: 89.9% (542/603)
- 需要修复: 42个测试

---

## ⏱️ 总预计时间

约2小时10分钟

---

## 🚀 现在开始

**第一步**: 执行任务1 - 修复 qr-code.test.ts

打开文件并使用查找替换功能！
